import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyQrPayload } from '@/lib/qr-crypto';
import { simulateBuyerOrderPayment } from '@/services/order.service';
import type { PaymentSettlementStore } from '@/services/payment.service';
import { computeQrSignature, generateQrPayload } from '@/lib/qr-crypto';

describe('Payment Simulator & Ticket Issuance (T-403: EP-012, F-005, F-006, ST-007, ST-011)', () => {
  const originalSimulatorFlag = process.env.ENABLE_PAYMENT_SIMULATOR;
  const originalQrSecret = process.env.QR_SECRET_KEY;

  beforeEach(() => {
    process.env.QR_SECRET_KEY = 'test-secret-minimum-32-chars-for-hmac-256!!';
  });

  afterEach(() => {
    process.env.ENABLE_PAYMENT_SIMULATOR = originalSimulatorFlag;
    process.env.QR_SECRET_KEY = originalQrSecret;
  });

  it('mengembalikan 404 NOT_FOUND jika ENABLE_PAYMENT_SIMULATOR !== "true" (EP-012)', async () => {
    process.env.ENABLE_PAYMENT_SIMULATOR = 'false';

    await expect(
      simulateBuyerOrderPayment('order-1', 'buyer-1')
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('menolak BUYER lain yang bukan pemilik order dengan 403 FORBIDDEN_OWNERSHIP', async () => {
    process.env.ENABLE_PAYMENT_SIMULATOR = 'true';

    await expect(
      simulateBuyerOrderPayment('order-1', 'hacker-buyer-id', {
        async findOrder() {
          return {
            id: 'order-1',
            orderCode: 'ORD-20261114-SIM001',
            buyerId: 'owner-buyer-id',
            status: 'PENDING',
            expiresAt: new Date('2026-12-31T23:59:59.000Z'),
          };
        },
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_OWNERSHIP',
      statusCode: 403,
    });
  });

  it('mengubah order menjadi PAID, mencatat log SIMULATOR, dan menerbitkan N tiket VALID ber-HMAC saat aktif', async () => {
    process.env.ENABLE_PAYMENT_SIMULATOR = 'true';
    const webhookLogs: Array<{ provider: string; externalId: string }> = [];

    const mockSettlementStore: PaymentSettlementStore = {
      async processSettlementTransaction(input) {
        webhookLogs.push({ provider: input.provider, externalId: input.externalId });
        const eventId = '33333333-3333-4333-8333-333333333333';
        const tickets = [1, 2].map((idx) => {
          const code = `MOZA-SIM0-000${idx}`;
          return {
            id: `ticket-${idx}`,
            ticketCode: code,
            orderId: 'order-1',
            eventId,
            ticketCategoryId: 'cat-1',
            attendeeName: 'Ayu Pembeli',
            attendeeEmail: 'buyer@mozapass.local',
            qrSignature: computeQrSignature(code, eventId),
            status: 'VALID' as const,
          };
        });

        return {
          result: {
            orderId: 'order-1',
            orderCode: input.orderCode,
            status: 'PAID',
            idempotentDuplicate: false,
            isLatePaymentRecovery: false,
            overbookAlertLogged: false,
            tickets,
          },
        };
      },
      async recordInvalidWebhookSignature() {},
      async processWebhookCancelOrExpire() {},
    };

    const result = await simulateBuyerOrderPayment('order-1', 'owner-buyer-id', {
      now: new Date('2026-06-01T10:00:00.000Z'),
      async findOrder() {
        return {
          id: 'order-1',
          orderCode: 'ORD-20261114-SIM001',
          buyerId: 'owner-buyer-id',
          status: 'PENDING',
          expiresAt: new Date('2026-06-01T10:15:00.000Z'),
        };
      },
      settlementStore: mockSettlementStore,
    });

    expect(result.status).toBe('PAID');
    expect(result.tickets).toHaveLength(2);
    expect(webhookLogs).toEqual([
      { provider: 'SIMULATOR', externalId: 'SIM-ORD-20261114-SIM001' },
    ]);

    // Verifikasi QR payload tiket yang diterbitkan sah secara kriptografis
    const qrPayload = generateQrPayload(
      result.tickets[0].ticketCode,
      result.tickets[0].eventId
    );
    const verified = verifyQrPayload(qrPayload, result.tickets[0].eventId);
    expect(verified.ticketCode).toBe('MOZA-SIM0-0001');
  });
});
