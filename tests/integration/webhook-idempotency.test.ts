import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { computeMidtransSignature } from '@/lib/midtrans';
import { computeQrSignature } from '@/lib/qr-crypto';
import {
  type IssuedTicketRecord,
  type PaymentSettlementStore,
  processMidtransWebhook,
} from '@/services/payment.service';

describe('Midtrans Webhook Signature & Parallel Idempotency (T-404: BR-008, E-003, EP-011)', () => {
  const serverKey = 'SB-Mid-server-TestKeyMozapass2026';

  function createLockedWebhookStore(quantity: number = 3) {
    let lock = Promise.resolve();
    let orderStatus: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' = 'PENDING';
    let reservedCount = quantity;
    let soldCount = 0;
    const issuedTickets: IssuedTicketRecord[] = [];
    const logs = new Map<string, { signatureValid: boolean }>();

    async function withLock<T>(fn: () => Promise<T>): Promise<T> {
      const prev = lock;
      let release!: () => void;
      lock = new Promise<void>((r) => {
        release = r;
      });
      await prev;
      try {
        await new Promise((r) => setTimeout(r, 2));
        return await fn();
      } finally {
        release();
      }
    }

    const store: PaymentSettlementStore = {
      async recordInvalidWebhookSignature(provider, externalId) {
        logs.set(`${provider}:${externalId}`, { signatureValid: false });
      },
      async processWebhookCancelOrExpire() {},
      async processSettlementTransaction(input) {
        return withLock(async () => {
          const logKey = `${input.provider}:${input.externalId}`;
          if (orderStatus === 'PAID' || logs.has(logKey)) {
            return {
              result: {
                orderId: 'order-webhook-1',
                orderCode: input.orderCode,
                status: orderStatus,
                idempotentDuplicate: true,
                isLatePaymentRecovery: false,
                overbookAlertLogged: false,
                tickets: [...issuedTickets],
              },
            };
          }

          logs.set(logKey, { signatureValid: true });
          orderStatus = 'PAID';
          reservedCount -= quantity;
          soldCount += quantity;

          for (let i = 1; i <= quantity; i++) {
            const ticketCode = `MOZA-WBHK-000${i}`;
            issuedTickets.push({
              id: `ticket-${i}`,
              ticketCode,
              orderId: 'order-webhook-1',
              eventId: 'ev-webhook-1',
              ticketCategoryId: 'cat-webhook-1',
              attendeeName: 'Ayu Pembeli',
              attendeeEmail: 'buyer@mozapass.local',
              qrSignature: computeQrSignature(
                ticketCode,
                'ev-webhook-1',
                'test-secret-minimum-32-chars-for-hmac-256!!'
              ),
              status: 'VALID',
            });
          }

          return {
            result: {
              orderId: 'order-webhook-1',
              orderCode: input.orderCode,
              status: 'PAID',
              idempotentDuplicate: false,
              isLatePaymentRecovery: false,
              overbookAlertLogged: false,
              tickets: [...issuedTickets],
            },
          };
        });
      },
    };

    return {
      store,
      getState: () => ({
        orderStatus,
        reservedCount,
        soldCount,
        issuedTickets,
        logs,
      }),
    };
  }

  it('memproses 5 webhook settlement identik secara paralel secara idempotent dan hanya menerbitkan N tiket tepat 1 kali (E-003)', async () => {
    const { store, getState } = createLockedWebhookStore(3);
    const orderId = 'ORD-20261114-IDEMP1';
    const statusCode = '200';
    const grossAmount = '450000.00';
    const signatureKey = computeMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      serverKey
    );

    const payload = {
      transaction_id: 'midtrans-tx-999',
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      transaction_status: 'settlement',
      fraud_status: 'accept',
      signature_key: signatureKey,
    };

    // Kirim 5 webhook identik secara paralel
    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map(() => processMidtransWebhook(payload, store, serverKey))
    );

    expect(responses).toHaveLength(5);
    const state = getState();
    expect(state.orderStatus).toBe('PAID');
    // Jumlah tiket tetap 3 (tidak terduplikasi menjadi 15!)
    expect(state.issuedTickets).toHaveLength(3);
    expect(state.soldCount).toBe(3);
    expect(state.reservedCount).toBe(0);
  });

  it('menolak webhook dengan signature SHA512 palsu menggunakan 401 WEBHOOK_SIGNATURE_INVALID dan mencatatnya ke log', async () => {
    const { store, getState } = createLockedWebhookStore(2);

    const forgedPayload = {
      transaction_id: 'midtrans-tx-forged',
      order_id: 'ORD-20261114-FORGED',
      status_code: '200',
      gross_amount: '150000.00',
      transaction_status: 'settlement',
      signature_key: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    await expect(
      processMidtransWebhook(forgedPayload, store, serverKey)
    ).rejects.toMatchObject({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      statusCode: 401,
    });

    const state = getState();
    expect(state.orderStatus).toBe('PENDING');
    expect(state.issuedTickets).toHaveLength(0);
    expect(
      state.logs.get('MIDTRANS:midtrans-tx-forged:settlement')?.signatureValid
    ).toBe(false);
  });
});
