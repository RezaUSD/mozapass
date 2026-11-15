import { describe, expect, it } from 'vitest';
import { computeMidtransSignature } from '@/lib/midtrans';
import { computeQrSignature } from '@/lib/qr-crypto';
import {
  type IssuedTicketRecord,
  type PaymentSettlementStore,
  processMidtransWebhook,
} from '@/services/payment.service';

describe('Late Payment Webhook after Order Expiration (T-601: E-002, BR-002, BR-008)', () => {
  const serverKey = 'SB-Mid-server-TestKeyMozapass2026';

  function createExpiredOrderWebhookSimulation(params: {
    totalQuota: number;
    soldCount: number;
    reservedCount: number;
    orderQuantity: number;
  }) {
    const state = {
      orderStatus: 'EXPIRED' as 'EXPIRED' | 'PAID',
      totalQuota: params.totalQuota,
      soldCount: params.soldCount,
      reservedCount: params.reservedCount,
      orderQuantity: params.orderQuantity,
      isLatePaymentLogged: false,
      overbookAlertLogged: false,
      tickets: [] as IssuedTicketRecord[],
    };

    const store: PaymentSettlementStore = {
      async recordInvalidWebhookSignature() {},
      async processWebhookCancelOrExpire() {},
      async processSettlementTransaction(input) {
        state.isLatePaymentLogged = state.orderStatus === 'EXPIRED';

        const canRecover =
          state.soldCount + state.reservedCount + state.orderQuantity <=
          state.totalQuota;

        if (!canRecover) {
          state.overbookAlertLogged = true;
          return {
            result: {
              orderId: 'order-late-1',
              orderCode: input.orderCode,
              status: 'EXPIRED',
              idempotentDuplicate: false,
              isLatePaymentRecovery: false,
              overbookAlertLogged: true,
              tickets: [],
            },
          };
        }

        state.soldCount += state.orderQuantity;
        state.orderStatus = 'PAID';

        for (let i = 1; i <= state.orderQuantity; i++) {
          const code = `MOZA-LATE-000${i}`;
          state.tickets.push({
            id: `t-late-${i}`,
            ticketCode: code,
            orderId: 'order-late-1',
            eventId: 'ev-late-1',
            ticketCategoryId: 'cat-late-1',
            attendeeName: 'Ayu Pembeli',
            attendeeEmail: 'buyer@mozapass.local',
            qrSignature: computeQrSignature(
              code,
              'ev-late-1',
              'test-secret-minimum-32-chars-for-hmac-256!!'
            ),
            status: 'VALID',
          });
        }

        return {
          result: {
            orderId: 'order-late-1',
            orderCode: input.orderCode,
            status: 'PAID',
            idempotentDuplicate: false,
            isLatePaymentRecovery: true,
            overbookAlertLogged: false,
            tickets: [...state.tickets],
          },
        };
      },
    };

    return { state, store };
  }

  it('Skenario A (Kuota Masih Cukup): memulihkan order EXPIRED -> PAID dan menerbitkan tiket dengan isLatePaymentRecovery = true (E-002)', async () => {
    const { state, store } = createExpiredOrderWebhookSimulation({
      totalQuota: 50,
      soldCount: 45,
      reservedCount: 0,
      orderQuantity: 2,
    });

    const orderId = 'ORD-20261114-LATEOK';
    const payload = {
      transaction_id: 'tx-late-ok-1',
      order_id: orderId,
      status_code: '200',
      gross_amount: '300000.00',
      transaction_status: 'settlement',
      fraud_status: 'accept',
      signature_key: computeMidtransSignature(
        orderId,
        '200',
        '300000.00',
        serverKey
      ),
    };

    const res = await processMidtransWebhook(payload, store, serverKey);
    expect('isLatePaymentRecovery' in res && res.isLatePaymentRecovery).toBe(true);
    expect(state.orderStatus).toBe('PAID');
    expect(state.tickets).toHaveLength(2);
    expect(state.soldCount).toBe(47);
    expect(state.soldCount + state.reservedCount).toBeLessThanOrEqual(state.totalQuota);
  });

  it('Skenario B (Kuota Sudah Habis Dibeli User Lain): menjaga invarian anti-oversell dan mencatat OVERBOOK_PAYMENT_ALERT tanpa menerbitkan tiket berlebih (E-002)', async () => {
    const { state, store } = createExpiredOrderWebhookSimulation({
      totalQuota: 50,
      soldCount: 50,
      reservedCount: 0,
      orderQuantity: 1,
    });

    const orderId = 'ORD-20261114-LATEFULL';
    const payload = {
      transaction_id: 'tx-late-full-1',
      order_id: orderId,
      status_code: '200',
      gross_amount: '150000.00',
      transaction_status: 'settlement',
      fraud_status: 'accept',
      signature_key: computeMidtransSignature(
        orderId,
        '200',
        '150000.00',
        serverKey
      ),
    };

    const res = await processMidtransWebhook(payload, store, serverKey);
    expect('overbookAlertLogged' in res && res.overbookAlertLogged).toBe(true);
    expect(state.orderStatus).toBe('EXPIRED');
    expect(state.tickets).toHaveLength(0);
    // Invarian Anti-Oversell tetap terjaga 100%
    expect(state.soldCount + state.reservedCount).toBe(50);
  });
});
