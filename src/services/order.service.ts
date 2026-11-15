import { randomBytes } from 'crypto';
import type { EventStatus, OrderStatus } from '@prisma/client';
import type { AuthUserPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { assertIntegerRupiah } from '@/lib/format';
import { logger } from '@/lib/logger';
import { createMidtransSnapTransaction } from '@/lib/midtrans';
import { createOrderSchema } from '@/schemas/order.schema';
import { releaseExpiredOrders } from '@/services/expiration.service';
import {
  markOrderAsPaid,
  type PaymentSettlementStore,
} from '@/services/payment.service';

export function generateOrderCode(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${yyyy}${mm}${dd}-${suffix}`;
}

export interface CreatedOrderResult {
  id: string;
  orderCode: string;
  eventId: string;
  ticketCategoryId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  expiresAt: string;
  snapToken: string | null;
  paymentRedirectUrl: string | null;
  simulatorEnabled: boolean;
}

export interface CheckoutTransactionContext {
  buyer: AuthUserPayload;
  eventId: string;
  ticketCategoryId: string;
  quantity: number;
  now: Date;
  holdMinutes: number;
}

export interface CheckoutStore {
  runCheckoutTransaction(ctx: CheckoutTransactionContext): Promise<{
    id: string;
    orderCode: string;
    eventId: string;
    ticketCategoryId: string;
    categoryName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    status: OrderStatus;
    expiresAt: Date;
  }>;
  updateOrderPaymentTokens(
    orderId: string,
    snapToken: string,
    paymentRedirectUrl: string
  ): Promise<void>;
}

const defaultCheckoutStore: CheckoutStore = {
  async runCheckoutTransaction(ctx) {
    return prisma.$transaction(async (tx) => {
      // 1. Cek BR-011: Maksimal 1 reservasi PENDING aktif per pembeli per acara
      const existingPending = await tx.order.findFirst({
        where: {
          buyerId: ctx.buyer.id,
          eventId: ctx.eventId,
          status: 'PENDING',
          expiresAt: { gt: ctx.now },
        },
        select: { id: true, orderCode: true },
      });

      if (existingPending) {
        throw new AppError(
          'ACTIVE_ORDER_EXISTS',
          'Anda masih memiliki pesanan yang menunggu pembayaran pada acara ini. Selesaikan atau batalkan pesanan tersebut terlebih dahulu (BR-011).',
          { existingOrderId: existingPending.id, orderCode: existingPending.orderCode }
        );
      }

      // 2. Kunci baris kategori tiket dengan SELECT ... FOR UPDATE (BR-002, E-001)
      const lockedCategories = await tx.$queryRaw<
        Array<{
          id: string;
          event_id: string;
          name: string;
          price: number;
          total_quota: number;
          sold_count: number;
          reserved_count: number;
          max_per_order: number;
          sale_start_at: Date;
          sale_end_at: Date;
        }>
      >`
        SELECT id, event_id, name, price, total_quota, sold_count, reserved_count, max_per_order, sale_start_at, sale_end_at
        FROM ticket_categories
        WHERE id = ${ctx.ticketCategoryId}::uuid
        FOR UPDATE
      `;

      const cat = lockedCategories[0];
      if (!cat || cat.event_id !== ctx.eventId) {
        throw new AppError('NOT_FOUND', 'Kategori tiket tidak ditemukan pada acara ini.');
      }

      const event = await tx.event.findUnique({
        where: { id: ctx.eventId },
        select: { id: true, status: true },
      });

      if (!event) {
        throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
      }

      // 3. Validasi status acara PUBLISHED & jendela penjualan (BR-004)
      if (event.status !== ('PUBLISHED' as EventStatus)) {
        throw new AppError(
          'SALE_WINDOW_CLOSED',
          'Acara ini sedang tidak membuka penjualan tiket (BR-004).'
        );
      }

      const nowMs = ctx.now.getTime();
      if (
        nowMs < new Date(cat.sale_start_at).getTime() ||
        nowMs > new Date(cat.sale_end_at).getTime()
      ) {
        throw new AppError(
          'SALE_WINDOW_CLOSED',
          'Penjualan untuk kategori tiket ini belum dimulai atau sudah berakhir (BR-004).'
        );
      }

      // 4. Validasi batas beli per transaksi (BR-004)
      if (ctx.quantity > cat.max_per_order) {
        throw new AppError(
          'MAX_ORDER_LIMIT_EXCEEDED',
          `Jumlah pembelian melebihi batas maksimal ${cat.max_per_order} tiket per transaksi (BR-004).`
        );
      }

      // 5. Validasi Invarian Anti-Oversell (BR-002, E-001): sold_count + reserved_count + qty <= total_quota
      if (cat.sold_count + cat.reserved_count + ctx.quantity > cat.total_quota) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          'Maaf, sisa kuota kategori tiket ini baru saja habis atau sedang ditahan pembeli lain (E-001).'
        );
      }

      const unitPrice = assertIntegerRupiah(cat.price);
      const totalAmount = assertIntegerRupiah(unitPrice * ctx.quantity);
      const expiresAt = new Date(nowMs + ctx.holdMinutes * 60 * 1000);
      const orderCode = generateOrderCode(ctx.now);

      // 6. Tambah reserved_count secara atomik dengan guard tambahan
      const updatedRows = await tx.$executeRaw`
        UPDATE ticket_categories
        SET reserved_count = reserved_count + ${ctx.quantity},
            updated_at = NOW()
        WHERE id = ${cat.id}::uuid
          AND (sold_count + reserved_count + ${ctx.quantity} <= total_quota)
      `;

      if (updatedRows !== 1) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          'Maaf, sisa kuota kategori tiket ini tidak mencukupi.'
        );
      }

      const createdOrder = await tx.order.create({
        data: {
          orderCode,
          buyerId: ctx.buyer.id,
          eventId: ctx.eventId,
          ticketCategoryId: cat.id,
          quantity: ctx.quantity,
          unitPrice,
          totalAmount,
          status: 'PENDING',
          expiresAt,
          version: 1,
        },
      });

      return {
        id: createdOrder.id,
        orderCode: createdOrder.orderCode,
        eventId: createdOrder.eventId,
        ticketCategoryId: createdOrder.ticketCategoryId,
        categoryName: cat.name,
        quantity: createdOrder.quantity,
        unitPrice: createdOrder.unitPrice,
        totalAmount: createdOrder.totalAmount,
        status: createdOrder.status,
        expiresAt: createdOrder.expiresAt,
      };
    });
  },

  async updateOrderPaymentTokens(orderId, snapToken, paymentRedirectUrl) {
    await prisma.order.update({
      where: { id: orderId },
      data: { snapToken, paymentRedirectUrl },
    });
  },
};

export async function createCheckoutOrder(
  buyer: AuthUserPayload,
  rawInput: unknown,
  options?: {
    now?: Date;
    store?: CheckoutStore;
    settlementStore?: PaymentSettlementStore;
    skipLazyExpire?: boolean;
  }
): Promise<CreatedOrderResult> {
  const input = createOrderSchema.parse(rawInput);
  const now = options?.now ?? new Date();
  const holdMinutes = Number(process.env.RESERVATION_HOLD_MINUTES ?? '15');
  const store = options?.store ?? defaultCheckoutStore;

  if (!options?.skipLazyExpire) {
    await releaseExpiredOrders(input.eventId, now);
  }

  const order = await store.runCheckoutTransaction({
    buyer,
    eventId: input.eventId,
    ticketCategoryId: input.ticketCategoryId,
    quantity: input.quantity,
    now,
    holdMinutes,
  });

  logger.info('ORDER_CREATED', 'Order reservation created', {
    orderId: order.id,
    orderCode: order.orderCode,
    buyerId: buyer.id,
    eventId: order.eventId,
    quantity: order.quantity,
    totalAmount: order.totalAmount,
  });

  const simulatorEnabled = process.env.ENABLE_PAYMENT_SIMULATOR === 'true';

  // F-011: Jika tiket gratis (Rp 0), langsung terbitkan tiket tanpa Payment Gateway
  if (order.totalAmount === 0) {
    await markOrderAsPaid(
      {
        orderCode: order.orderCode,
        provider: 'FREE_TICKET',
        externalId: `FREE-${order.orderCode}`,
        transactionStatus: 'settlement',
        rawPayload: { freeTicket: true },
      },
      options?.settlementStore
    );

    return {
      id: order.id,
      orderCode: order.orderCode,
      eventId: order.eventId,
      ticketCategoryId: order.ticketCategoryId,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: 0,
      status: 'PAID',
      expiresAt: order.expiresAt.toISOString(),
      snapToken: null,
      paymentRedirectUrl: null,
      simulatorEnabled,
    };
  }

  const snap = await createMidtransSnapTransaction({
    orderCode: order.orderCode,
    grossAmount: order.totalAmount,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    categoryName: order.categoryName,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
  });

  await store.updateOrderPaymentTokens(order.id, snap.snapToken, snap.redirectUrl);

  return {
    id: order.id,
    orderCode: order.orderCode,
    eventId: order.eventId,
    ticketCategoryId: order.ticketCategoryId,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalAmount: order.totalAmount,
    status: 'PENDING',
    expiresAt: order.expiresAt.toISOString(),
    snapToken: snap.snapToken,
    paymentRedirectUrl: snap.redirectUrl,
    simulatorEnabled,
  };
}

export async function listBuyerOrders(buyerId: string) {
  await releaseExpiredOrders();

  const orders = await prisma.order.findMany({
    where: { buyerId },
    include: {
      event: { select: { id: true, title: true, slug: true, location: true, startTime: true } },
      ticketCategory: { select: { id: true, name: true, price: true } },
      tickets: { select: { id: true, ticketCode: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    status: o.status,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalAmount: o.totalAmount,
    expiresAt: o.expiresAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    event: {
      ...o.event,
      startTime: o.event.startTime.toISOString(),
    },
    category: o.ticketCategory,
    tickets: o.tickets,
  }));
}

export async function getBuyerOrderById(orderId: string, buyerId: string) {
  await releaseExpiredOrders();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, title: true, slug: true, location: true, startTime: true } },
      ticketCategory: { select: { id: true, name: true, price: true } },
      tickets: { select: { id: true, ticketCode: true, status: true } },
    },
  });

  if (!order) {
    throw new AppError('NOT_FOUND', 'Pesanan tidak ditemukan.');
  }

  if (order.buyerId !== buyerId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda tidak memiliki izin untuk mengakses pesanan milik pengguna lain.'
    );
  }

  return {
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalAmount: order.totalAmount,
    snapToken: order.snapToken,
    paymentRedirectUrl: order.paymentRedirectUrl,
    expiresAt: order.expiresAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    buyer: order.buyer,
    event: {
      ...order.event,
      startTime: order.event.startTime.toISOString(),
    },
    category: order.ticketCategory,
    tickets: order.tickets,
    simulatorEnabled: process.env.ENABLE_PAYMENT_SIMULATOR === 'true',
  };
}

export async function cancelBuyerOrder(orderId: string, buyerId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new AppError('NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (order.buyerId !== buyerId) {
      throw new AppError(
        'FORBIDDEN_OWNERSHIP',
        'Anda tidak berhak membatalkan pesanan milik pembeli lain.'
      );
    }

    if (order.status !== 'PENDING') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Pesanan berstatus ${order.status} tidak dapat dibatalkan (ST-009).`
      );
    }

    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        status: 'PENDING',
        version: order.version,
      },
      data: {
        status: 'CANCELLED',
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'Status pesanan telah berubah secara bersamaan. Silakan muat ulang halaman.'
      );
    }

    await tx.$executeRaw`
      UPDATE ticket_categories
      SET reserved_count = GREATEST(0, reserved_count - ${order.quantity}),
          updated_at = NOW()
      WHERE id = ${order.ticketCategoryId}::uuid
    `;

    logger.info('ORDER_CANCELLED', 'Order cancelled by buyer and quota restored', {
      orderId: order.id,
      orderCode: order.orderCode,
      buyerId,
      quantityRestored: order.quantity,
    });

    return {
      id: order.id,
      orderCode: order.orderCode,
      status: 'CANCELLED' as const,
    };
  });
}

/**
 * Simulator Pembayaran Terkendali (EP-012):
 * Wajib mengembalikan 404 jika ENABLE_PAYMENT_SIMULATOR !== 'true',
 * memeriksa kepemilikan order, dan memanggil markOrderAsPaid yang sama dengan webhook Midtrans.
 */
export async function simulateBuyerOrderPayment(
  orderId: string,
  buyerId: string,
  options?: {
    findOrder?: (id: string) => Promise<{
      id: string;
      orderCode: string;
      buyerId: string;
      status: OrderStatus;
      expiresAt: Date;
    } | null>;
    settlementStore?: PaymentSettlementStore;
    now?: Date;
  }
) {
  if (process.env.ENABLE_PAYMENT_SIMULATOR !== 'true') {
    throw new AppError('NOT_FOUND', 'Endpoint tidak ditemukan.');
  }

  const findOrderFn =
    options?.findOrder ??
    ((id: string) =>
      prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderCode: true,
          buyerId: true,
          status: true,
          expiresAt: true,
        },
      }));

  const order = await findOrderFn(orderId);
  if (!order) {
    throw new AppError('NOT_FOUND', 'Pesanan tidak ditemukan.');
  }

  if (order.buyerId !== buyerId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Hanya pemilik pesanan yang dapat menjalankan simulasi pembayaran (EP-012).'
    );
  }

  const now = options?.now ?? new Date();
  if (order.status === 'PENDING' && now.getTime() > order.expiresAt.getTime()) {
    throw new AppError(
      'ORDER_EXPIRED',
      'Masa berlaku reservasi pesanan ini telah habis (15 menit).'
    );
  }

  return markOrderAsPaid(
    {
      orderCode: order.orderCode,
      provider: 'SIMULATOR',
      externalId: `SIM-${order.orderCode}`,
      transactionStatus: 'settlement',
      rawPayload: { simulatedByBuyerId: buyerId, timestamp: now.toISOString() },
    },
    options?.settlementStore
  );
}
