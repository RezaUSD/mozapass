import { randomBytes } from 'crypto';
import type { OrderStatus, TicketStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { sendTicketsEmailSafely } from '@/lib/mailer';
import {
  type MidtransWebhookPayload,
  verifyMidtransWebhookSignature,
} from '@/lib/midtrans';
import { computeQrSignature, generateQrPayload } from '@/lib/qr-crypto';

export function generateUniqueTicketCode(): string {
  const part1 = randomBytes(2).toString('hex').toUpperCase();
  const part2 = randomBytes(2).toString('hex').toUpperCase();
  return `MOZA-${part1}-${part2}`;
}

export interface IssuedTicketRecord {
  id: string;
  ticketCode: string;
  orderId: string;
  eventId: string;
  ticketCategoryId: string;
  attendeeName: string;
  attendeeEmail: string;
  qrSignature: string;
  status: TicketStatus;
}

export interface SettlementResult {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  idempotentDuplicate: boolean;
  isLatePaymentRecovery: boolean;
  overbookAlertLogged: boolean;
  tickets: IssuedTicketRecord[];
}

export interface MarkOrderPaidInput {
  orderCode: string;
  provider: 'MIDTRANS' | 'SIMULATOR' | 'FREE_TICKET';
  externalId: string;
  transactionStatus: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentSettlementStore {
  processSettlementTransaction(input: MarkOrderPaidInput): Promise<{
    result: SettlementResult;
    emailContext?: {
      eventTitle: string;
      eventLocation: string;
      eventStartTime: string;
      categoryName: string;
      unitPrice: number;
    };
  }>;
  recordInvalidWebhookSignature(
    provider: string,
    externalId: string,
    orderCode: string | undefined,
    transactionStatus: string,
    rawPayload: Record<string, unknown>
  ): Promise<void>;
  processWebhookCancelOrExpire(
    orderCode: string,
    provider: string,
    externalId: string,
    transactionStatus: 'EXPIRED' | 'FAILED',
    rawPayload: Record<string, unknown>
  ): Promise<void>;
}

const defaultPaymentSettlementStore: PaymentSettlementStore = {
  async recordInvalidWebhookSignature(
    provider,
    externalId,
    orderCode,
    transactionStatus,
    rawPayload
  ) {
    const order = orderCode
      ? await prisma.order.findUnique({ where: { orderCode } })
      : null;
    await prisma.paymentWebhookLog.upsert({
      where: {
        provider_externalId: { provider, externalId },
      },
      update: {},
      create: {
        provider,
        externalId,
        orderId: order?.id ?? null,
        transactionStatus,
        signatureValid: false,
        isLatePayment: false,
        payload: JSON.parse(JSON.stringify(rawPayload)),
      },
    });
  },

  async processWebhookCancelOrExpire(
    orderCode,
    provider,
    externalId,
    targetStatus,
    rawPayload
  ) {
    await prisma.$transaction(async (tx) => {
      const existingLog = await tx.paymentWebhookLog.findUnique({
        where: { provider_externalId: { provider, externalId } },
      });
      if (existingLog) {
        return;
      }

      const order = await tx.order.findUnique({ where: { orderCode } });
      if (!order) {
        return;
      }

      await tx.paymentWebhookLog.create({
        data: {
          provider,
          externalId,
          orderId: order.id,
          transactionStatus: targetStatus,
          signatureValid: true,
          isLatePayment: false,
          payload: JSON.parse(JSON.stringify(rawPayload)),
        },
      });

      if (order.status === 'PENDING') {
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING', version: order.version },
          data: { status: targetStatus, version: { increment: 1 } },
        });
        if (updated.count === 1) {
          await tx.$executeRaw`
            UPDATE ticket_categories
            SET reserved_count = GREATEST(0, reserved_count - ${order.quantity}),
                updated_at = NOW()
            WHERE id = ${order.ticketCategoryId}::uuid
          `;
        }
      }
    });
  },

  async processSettlementTransaction(input: MarkOrderPaidInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Kunci baris order dengan SELECT ... FOR UPDATE untuk mencegah race condition (E-003)
      const lockedOrders = await tx.$queryRaw<
        Array<{
          id: string;
          order_code: string;
          buyer_id: string;
          event_id: string;
          ticket_category_id: string;
          quantity: number;
          unit_price: number;
          status: OrderStatus;
          version: number;
        }>
      >`
        SELECT id, order_code, buyer_id, event_id, ticket_category_id, quantity, unit_price, status, version
        FROM orders
        WHERE order_code = ${input.orderCode}
        FOR UPDATE
      `;

      const orderRow = lockedOrders[0];
      if (!orderRow) {
        throw new AppError('NOT_FOUND', `Pesanan (${input.orderCode}) tidak ditemukan.`);
      }

      const [buyer, event, existingTickets, existingLog] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: orderRow.buyer_id } }),
        tx.event.findUniqueOrThrow({ where: { id: orderRow.event_id } }),
        tx.ticket.findMany({ where: { orderId: orderRow.id } }),
        tx.paymentWebhookLog.findUnique({
          where: {
            provider_externalId: {
              provider: input.provider,
              externalId: input.externalId,
            },
          },
        }),
      ]);

      // 2. Idempotensi (BR-008, E-003): Jika sudah PAID atau log sudah ada, langsung return 200 OK
      if (orderRow.status === 'PAID' || existingLog) {
        logger.info('WEBHOOK_DUPLICATE_IGNORED', 'Duplicate settlement ignored idempotently', {
          orderCode: orderRow.order_code,
          provider: input.provider,
          externalId: input.externalId,
        });
        return {
          result: {
            orderId: orderRow.id,
            orderCode: orderRow.order_code,
            status: orderRow.status,
            idempotentDuplicate: true,
            isLatePaymentRecovery: false,
            overbookAlertLogged: false,
            tickets: existingTickets,
          },
        };
      }

      // 3. Kunci baris kategori tiket dengan SELECT ... FOR UPDATE (BR-002)
      const lockedCats = await tx.$queryRaw<
        Array<{
          id: string;
          name: string;
          price: number;
          total_quota: number;
          sold_count: number;
          reserved_count: number;
        }>
      >`
        SELECT id, name, price, total_quota, sold_count, reserved_count
        FROM ticket_categories
        WHERE id = ${orderRow.ticket_category_id}::uuid
        FOR UPDATE
      `;
      const catRow = lockedCats[0];
      if (!catRow) {
        throw new AppError('NOT_FOUND', 'Kategori tiket tidak ditemukan.');
      }

      const isLatePayment = orderRow.status === 'EXPIRED';

      // Catat ke payment_webhook_logs (UNIQUE provider + externalId)
      await tx.paymentWebhookLog.create({
        data: {
          provider: input.provider,
          externalId: input.externalId,
          orderId: orderRow.id,
          transactionStatus: input.transactionStatus,
          signatureValid: true,
          isLatePayment,
          payload: JSON.parse(JSON.stringify(input.rawPayload)),
        },
      });

      // 4. Penanganan Late Webhook pada Order EXPIRED (E-002)
      if (isLatePayment) {
        const canRecoverQuota =
          catRow.sold_count + catRow.reserved_count + orderRow.quantity <=
          catRow.total_quota;

        if (!canRecoverQuota) {
          logger.error(
            'OVERBOOK_PAYMENT_ALERT',
            'Late payment received after expiration and quota is already full (E-002)',
            {
              orderId: orderRow.id,
              orderCode: orderRow.order_code,
              ticketCategoryId: catRow.id,
            }
          );
          return {
            result: {
              orderId: orderRow.id,
              orderCode: orderRow.order_code,
              status: 'EXPIRED',
              idempotentDuplicate: false,
              isLatePaymentRecovery: false,
              overbookAlertLogged: true,
              tickets: [],
            },
          };
        }

        // Pulihkan order EXPIRED -> PAID karena kuota masih mencukupi (E-002)
        await tx.$executeRaw`
          UPDATE ticket_categories
          SET sold_count = sold_count + ${orderRow.quantity},
              updated_at = NOW()
          WHERE id = ${catRow.id}::uuid
        `;
      } else if (orderRow.status === 'PENDING') {
        // Transisi normal PENDING -> PAID (ST-007): pindahkan reserved_count ke sold_count
        await tx.$executeRaw`
          UPDATE ticket_categories
          SET reserved_count = GREATEST(0, reserved_count - ${orderRow.quantity}),
              sold_count = sold_count + ${orderRow.quantity},
              updated_at = NOW()
          WHERE id = ${catRow.id}::uuid
        `;
      } else {
        throw new AppError(
          'INVALID_STATE_TRANSITION',
          `Order berstatus ${orderRow.status} tidak dapat ditandai sebagai PAID.`
        );
      }

      await tx.order.update({
        where: { id: orderRow.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          version: { increment: 1 },
        },
      });

      // 5. Terbitkan N tiket individual berstatus VALID dengan HMAC-SHA256 (BR-005, BR-006, ST-011)
      const createdTickets: IssuedTicketRecord[] = [];
      for (let i = 0; i < orderRow.quantity; i++) {
        const ticketCode = generateUniqueTicketCode();
        const qrSignature = computeQrSignature(ticketCode, orderRow.event_id);
        const ticket = await tx.ticket.create({
          data: {
            ticketCode,
            orderId: orderRow.id,
            eventId: orderRow.event_id,
            ticketCategoryId: orderRow.ticket_category_id,
            attendeeName: buyer.name,
            attendeeEmail: buyer.email,
            qrSignature,
            status: 'VALID',
          },
        });
        createdTickets.push(ticket);
      }

      return {
        result: {
          orderId: orderRow.id,
          orderCode: orderRow.order_code,
          status: 'PAID',
          idempotentDuplicate: false,
          isLatePaymentRecovery: isLatePayment,
          overbookAlertLogged: false,
          tickets: createdTickets,
        },
        emailContext: {
          eventTitle: event.title,
          eventLocation: event.location,
          eventStartTime: event.startTime.toISOString(),
          categoryName: catRow.name,
          unitPrice: orderRow.unit_price,
        },
      };
    });
  },
};

/**
 * Service domain utama untuk menandai order PAID, memindahkan kuota, menerbitkan N tiket QR,
 * dan mengirim email tiket secara aman (dipakai bersama oleh Simulator EP-012, Webhook EP-011, & Rp 0 F-011).
 */
export async function markOrderAsPaid(
  input: MarkOrderPaidInput,
  store: PaymentSettlementStore = defaultPaymentSettlementStore
): Promise<SettlementResult> {
  const { result, emailContext } = await store.processSettlementTransaction(input);

  // Kirim email tiket di luar transaksi DB agar kegagalan SMTP tidak membatalkan status PAID (E-006)
  if (!result.idempotentDuplicate && result.tickets.length > 0 && emailContext) {
    const emailItems = result.tickets.map((t) => ({
      ticketCode: t.ticketCode,
      qrPayload: generateQrPayload(t.ticketCode, t.eventId),
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      eventTitle: emailContext.eventTitle,
      eventLocation: emailContext.eventLocation,
      eventStartTime: emailContext.eventStartTime,
      categoryName: emailContext.categoryName,
      unitPrice: emailContext.unitPrice,
    }));
    void sendTicketsEmailSafely(emailItems);
  }

  return result;
}

/**
 * Memproses notifikasi webhook Midtrans (EP-011, BR-008, E-002, E-003).
 */
export async function processMidtransWebhook(
  rawBody: unknown,
  store: PaymentSettlementStore = defaultPaymentSettlementStore,
  serverKeyOverride?: string
): Promise<SettlementResult | { status: string }> {
  const payload = rawBody as MidtransWebhookPayload;
  const externalId = `${payload.transaction_id || payload.order_id}:${payload.transaction_status || 'unknown'}`;

  const isSignatureValid = verifyMidtransWebhookSignature(payload, serverKeyOverride);
  if (!isSignatureValid) {
    await store.recordInvalidWebhookSignature(
      'MIDTRANS',
      externalId,
      payload.order_id,
      payload.transaction_status || 'invalid',
      (payload as Record<string, unknown>) ?? {}
    );
    logger.warn('WEBHOOK_SIGNATURE_INVALID', 'Invalid Midtrans webhook signature rejected', {
      orderId: payload.order_id,
      externalId,
    });
    throw new AppError(
      'WEBHOOK_SIGNATURE_INVALID',
      'Signature notifikasi webhook Midtrans tidak valid (BR-008).'
    );
  }

  const txStatus = payload.transaction_status;
  if (
    txStatus === 'settlement' ||
    (txStatus === 'capture' && (!payload.fraud_status || payload.fraud_status === 'accept'))
  ) {
    return markOrderAsPaid(
      {
        orderCode: payload.order_id,
        provider: 'MIDTRANS',
        externalId,
        transactionStatus: txStatus,
        rawPayload: payload as Record<string, unknown>,
      },
      store
    );
  }

  if (txStatus === 'expire') {
    await store.processWebhookCancelOrExpire(
      payload.order_id,
      'MIDTRANS',
      externalId,
      'EXPIRED',
      payload as Record<string, unknown>
    );
    return { status: 'EXPIRED' };
  }

  if (txStatus === 'cancel' || txStatus === 'deny' || txStatus === 'failure') {
    await store.processWebhookCancelOrExpire(
      payload.order_id,
      'MIDTRANS',
      externalId,
      'FAILED',
      payload as Record<string, unknown>
    );
    return { status: 'FAILED' };
  }

  return { status: 'IGNORED_PENDING' };
}
