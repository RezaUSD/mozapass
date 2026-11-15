import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import {
  type CheckoutStore,
  type CheckoutTransactionContext,
  createCheckoutOrder,
  generateOrderCode,
} from '@/services/order.service';

/**
 * Simulasi transaksi PostgreSQL dengan Row-Level Lock (SELECT ... FOR UPDATE)
 * untuk menguji konkurensi 5 pembeli memperebutkan sisa 1 tiket terakhir (E-001, BR-002, BR-011).
 */
function createLockedInMemoryCheckoutStore(initialConfig?: {
  totalQuota?: number;
  soldCount?: number;
  reservedCount?: number;
  maxPerOrder?: number;
  price?: number;
  eventStatus?: 'PUBLISHED' | 'DRAFT' | 'ENDED' | 'SUSPENDED';
}) {
  let lockChain = Promise.resolve();

  const state = {
    eventId: '11111111-1111-4111-8111-111111111111',
    eventStatus: initialConfig?.eventStatus ?? 'PUBLISHED',
    categoryId: '22222222-2222-4222-8222-222222222222',
    categoryName: 'Presale Regular',
    price: initialConfig?.price ?? 150000,
    totalQuota: initialConfig?.totalQuota ?? 10,
    soldCount: initialConfig?.soldCount ?? 9,
    reservedCount: initialConfig?.reservedCount ?? 0,
    maxPerOrder: initialConfig?.maxPerOrder ?? 4,
    saleStartAt: new Date('2026-01-01T00:00:00.000Z'),
    saleEndAt: new Date('2026-12-31T23:59:59.000Z'),
    orders: [] as Array<{
      id: string;
      orderCode: string;
      buyerId: string;
      eventId: string;
      ticketCategoryId: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
      expiresAt: Date;
    }>,
  };

  async function withRowLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = lockChain;
    let release!: () => void;
    lockChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      // Simulasi context switch I/O di dalam transaksi DB yang dikunci FOR UPDATE
      await new Promise((r) => setTimeout(r, 2));
      return await fn();
    } finally {
      release();
    }
  }

  const store: CheckoutStore = {
    async runCheckoutTransaction(ctx: CheckoutTransactionContext) {
      return withRowLock(async () => {
        // 1. BR-011: Cek 1 order PENDING aktif per pembeli per acara
        const existingPending = state.orders.find(
          (o) =>
            o.buyerId === ctx.buyer.id &&
            o.eventId === ctx.eventId &&
            o.status === 'PENDING' &&
            o.expiresAt.getTime() > ctx.now.getTime()
        );
        if (existingPending) {
          throw new AppError(
            'ACTIVE_ORDER_EXISTS',
            'Masih ada order PENDING aktif (BR-011).',
            { existingOrderId: existingPending.id }
          );
        }

        // 2. BR-004: Status acara & jendela penjualan
        if (state.eventStatus !== 'PUBLISHED') {
          throw new AppError('SALE_WINDOW_CLOSED', 'Acara tidak berstatus PUBLISHED.');
        }

        const nowMs = ctx.now.getTime();
        if (nowMs < state.saleStartAt.getTime() || nowMs > state.saleEndAt.getTime()) {
          throw new AppError('SALE_WINDOW_CLOSED', 'Di luar jendela waktu penjualan.');
        }

        if (ctx.quantity > state.maxPerOrder) {
          throw new AppError('MAX_ORDER_LIMIT_EXCEEDED', 'Melebihi batas maxPerOrder.');
        }

        // 3. BR-002 & E-001: Anti-oversell check di bawah FOR UPDATE lock
        if (state.soldCount + state.reservedCount + ctx.quantity > state.totalQuota) {
          throw new AppError('QUOTA_EXCEEDED', 'Kuota tiket habis (E-001).');
        }

        state.reservedCount += ctx.quantity;
        const orderCode = generateOrderCode(ctx.now);
        const expiresAt = new Date(nowMs + ctx.holdMinutes * 60 * 1000);
        const created = {
          id: `order-${state.orders.length + 1}`,
          orderCode,
          buyerId: ctx.buyer.id,
          eventId: ctx.eventId,
          ticketCategoryId: ctx.ticketCategoryId,
          categoryName: state.categoryName,
          quantity: ctx.quantity,
          unitPrice: state.price,
          totalAmount: state.price * ctx.quantity,
          status: 'PENDING' as const,
          expiresAt,
        };
        state.orders.push(created);
        return created;
      });
    },

    async updateOrderPaymentTokens() {
      // No-op in memory
    },
  };

  return { state, store };
}

describe('Order Anti-Oversell & Reservation Rules (T-401: BR-002, BR-004, BR-011, E-001)', () => {
  const now = new Date('2026-06-15T10:00:00.000Z');

  it('menjamin 0 oversell saat 5 pembeli memperebutkan sisa 1 tiket terakhir secara konkuren (E-001)', async () => {
    const { state, store } = createLockedInMemoryCheckoutStore({
      totalQuota: 50,
      soldCount: 49,
      reservedCount: 0,
    });

    const buyers = [1, 2, 3, 4, 5].map((i) => ({
      id: `00000000-0000-4000-8000-00000000000${i}`,
      name: `Buyer ${i}`,
      email: `buyer${i}@mozapass.local`,
      role: 'BUYER' as const,
    }));

    const results = await Promise.allSettled(
      buyers.map((buyer) =>
        createCheckoutOrder(
          buyer,
          {
            eventId: state.eventId,
            ticketCategoryId: state.categoryId,
            quantity: 1,
          },
          { now, store, skipLazyExpire: true }
        )
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    for (const rej of rejected) {
      expect(rej.reason).toBeInstanceOf(AppError);
      expect((rej.reason as AppError).code).toBe('QUOTA_EXCEEDED');
    }

    // Invarian mutlak database (BR-002): soldCount + reservedCount <= totalQuota
    expect(state.soldCount + state.reservedCount).toBe(50);
    expect(state.soldCount + state.reservedCount).toBeLessThanOrEqual(state.totalQuota);
  });

  it('menolak pembuatan order kedua jika pembeli masih memiliki reservasi PENDING aktif di acara yang sama (BR-011)', async () => {
    const { state, store } = createLockedInMemoryCheckoutStore({
      totalQuota: 20,
      soldCount: 0,
      reservedCount: 0,
    });

    const buyer = {
      id: '00000000-0000-4000-8000-000000000099',
      name: 'Budi Buyer',
      email: 'budi@mozapass.local',
      role: 'BUYER' as const,
    };

    const firstOrder = await createCheckoutOrder(
      buyer,
      {
        eventId: state.eventId,
        ticketCategoryId: state.categoryId,
        quantity: 2,
      },
      { now, store, skipLazyExpire: true }
    );
    expect(firstOrder.status).toBe('PENDING');

    await expect(
      createCheckoutOrder(
        buyer,
        {
          eventId: state.eventId,
          ticketCategoryId: state.categoryId,
          quantity: 1,
        },
        { now, store, skipLazyExpire: true }
      )
    ).rejects.toMatchObject({
      code: 'ACTIVE_ORDER_EXISTS',
    });
  });

  it('menolak pembelian yang melebihi maxPerOrder (BR-004)', async () => {
    const { state, store } = createLockedInMemoryCheckoutStore({
      totalQuota: 100,
      soldCount: 0,
      maxPerOrder: 3,
    });

    const buyer = {
      id: '00000000-0000-4000-8000-000000000088',
      name: 'Siti Buyer',
      email: 'siti@mozapass.local',
      role: 'BUYER' as const,
    };

    await expect(
      createCheckoutOrder(
        buyer,
        {
          eventId: state.eventId,
          ticketCategoryId: state.categoryId,
          quantity: 4,
        },
        { now, store, skipLazyExpire: true }
      )
    ).rejects.toMatchObject({
      code: 'MAX_ORDER_LIMIT_EXCEEDED',
    });
  });
});
