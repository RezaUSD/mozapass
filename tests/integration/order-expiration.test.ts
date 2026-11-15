import { describe, expect, it } from 'vitest';
import {
  type ExpirationStore,
  type ExpireOrderRecord,
  releaseExpiredOrders,
} from '@/services/expiration.service';

describe('Order Expiration & Optimistic Concurrency Guard (T-402: BR-003, ST-008, E-007)', () => {
  it('membebaskan kuota reservedCount untuk order PENDING yang melewati expiresAt (ST-008)', async () => {
    let reservedCount = 5;
    const orders: ExpireOrderRecord[] = [
      {
        id: 'order-expired-1',
        orderCode: 'ORD-20261114-EXP001',
        eventId: 'ev-1',
        ticketCategoryId: 'cat-1',
        quantity: 2,
        status: 'PENDING',
        expiresAt: new Date('2026-11-14T10:00:00.000Z'),
        version: 1,
      },
      {
        id: 'order-active-2',
        orderCode: 'ORD-20261114-ACT002',
        eventId: 'ev-1',
        ticketCategoryId: 'cat-1',
        quantity: 3,
        status: 'PENDING',
        expiresAt: new Date('2026-11-14T10:30:00.000Z'),
        version: 1,
      },
    ];

    const store: ExpirationStore = {
      async findExpiredPendingOrders(now) {
        return orders.filter(
          (o) => o.status === 'PENDING' && o.expiresAt.getTime() < now.getTime()
        );
      },
      async expireSingleOrderAtomically(candidate) {
        const target = orders.find((o) => o.id === candidate.id);
        if (!target || target.status !== 'PENDING' || target.version !== candidate.version) {
          return false;
        }
        target.status = 'EXPIRED';
        target.version += 1;
        reservedCount = Math.max(0, reservedCount - target.quantity);
        return true;
      },
    };

    const expiredCount = await releaseExpiredOrders(
      'ev-1',
      new Date('2026-11-14T10:15:00.000Z'),
      store
    );

    expect(expiredCount).toBe(1);
    expect(orders[0].status).toBe('EXPIRED');
    expect(orders[0].version).toBe(2);
    expect(orders[1].status).toBe('PENDING');
    expect(reservedCount).toBe(3);
  });

  it('mencegah pengurangan ganda reservedCount jika order baru saja berubah menjadi PAID dengan kenaikan version', async () => {
    let reservedCount = 2;
    const orderInDb: ExpireOrderRecord = {
      id: 'order-race-1',
      orderCode: 'ORD-20261114-RACE01',
      eventId: 'ev-1',
      ticketCategoryId: 'cat-1',
      quantity: 2,
      status: 'PENDING',
      expiresAt: new Date('2026-11-14T10:00:00.000Z'),
      version: 1,
    };

    const store: ExpirationStore = {
      async findExpiredPendingOrders() {
        // Snapshot awal saat pembacaan kandidat masih version = 1
        return [{ ...orderInDb }];
      },
      async expireSingleOrderAtomically(snapshotCandidate) {
        // Sebelum update dieksekusi, webhook pembayaran selesai lebih dulu dan menaikkan version ke 2 (PAID)
        orderInDb.status = 'PAID';
        orderInDb.version = 2;
        reservedCount = 0; // sudah dipindahkan ke soldCount oleh webhook

        // Guard Optimistic Concurrency: WHERE status = 'PENDING' AND version = snapshotCandidate.version
        const currentStatus = orderInDb.status as string;
        if (
          currentStatus !== 'PENDING' ||
          orderInDb.version !== snapshotCandidate.version
        ) {
          return false;
        }

        reservedCount = Math.max(0, reservedCount - snapshotCandidate.quantity);
        return true;
      },
    };

    const expiredCount = await releaseExpiredOrders(
      'ev-1',
      new Date('2026-11-14T10:01:00.000Z'),
      store
    );

    expect(expiredCount).toBe(0);
    expect(orderInDb.status).toBe('PAID');
    expect(reservedCount).toBe(0);
  });
});
