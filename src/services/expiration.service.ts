import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ExpireOrderRecord {
  id: string;
  orderCode: string;
  eventId: string;
  ticketCategoryId: string;
  quantity: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  expiresAt: Date;
  version: number;
}

export interface ExpirationStore {
  findExpiredPendingOrders(now: Date, eventId?: string): Promise<ExpireOrderRecord[]>;
  expireSingleOrderAtomically(order: ExpireOrderRecord): Promise<boolean>;
}

const defaultExpirationStore: ExpirationStore = {
  async findExpiredPendingOrders(now: Date, eventId?: string) {
    return prisma.order.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
        ...(eventId ? { eventId } : {}),
      },
      select: {
        id: true,
        orderCode: true,
        eventId: true,
        ticketCategoryId: true,
        quantity: true,
        status: true,
        expiresAt: true,
        version: true,
      },
    });
  },

  async expireSingleOrderAtomically(order: ExpireOrderRecord): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      // Guard Optimistic Concurrency (version): mencegah race condition dengan webhook ST-007
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          status: 'PENDING',
          version: order.version,
        },
        data: {
          status: 'EXPIRED',
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.$executeRaw`
        UPDATE ticket_categories
        SET reserved_count = GREATEST(0, reserved_count - ${order.quantity}),
            updated_at = NOW()
        WHERE id = ${order.ticketCategoryId}::uuid
      `;

      return true;
    });
  },
};

/**
 * Membebaskan seluruh order PENDING yang telah melewati expiresAt (BR-003, ST-008, E-007).
 * Mengembalikan jumlah order yang berhasil diubah menjadi EXPIRED.
 */
export async function releaseExpiredOrders(
  eventId?: string,
  now: Date = new Date(),
  store: ExpirationStore = defaultExpirationStore
): Promise<number> {
  const candidates = await store.findExpiredPendingOrders(now, eventId);
  let expiredCount = 0;

  for (const order of candidates) {
    const transitioned = await store.expireSingleOrderAtomically(order);
    if (transitioned) {
      expiredCount += 1;
      logger.info('ORDER_EXPIRED', 'Reservation expired and quota released', {
        orderId: order.id,
        orderCode: order.orderCode,
        eventId: order.eventId,
        quantityReleased: order.quantity,
      });
    }
  }

  return expiredCount;
}
