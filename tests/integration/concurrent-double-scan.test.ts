import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { generateQrPayload } from '@/lib/qr-crypto';
import {
  checkInTicketAtVenue,
  type ScannerCheckInRecord,
  type ScannerStore,
} from '@/services/ticket.service';

describe('Concurrent Double Scan Stress Test at 2 Gates (T-601: BR-007, ST-012, E-004)', () => {
  it('menjamin tepat 1 Gate menerima 200 OK (VALID -> USED) dan Gate lainnya ditolak 409 TICKET_ALREADY_USED saat 2 scanner memindai QR yang sama secara serentak', async () => {
    const secret = 'test-secret-minimum-32-chars-for-hmac-256!!';
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    let lock = Promise.resolve();

    const sharedTicket: ScannerCheckInRecord = {
      id: 'ticket-double-scan-1',
      ticketCode: 'MOZA-GATE-0001',
      eventId,
      eventTitle: 'Nusantara Indie Soundscape 2026',
      categoryName: 'VIP Standing',
      attendeeName: 'Ayu Pembeli',
      attendeeEmail: 'buyer@mozapass.local',
      status: 'VALID',
      checkedInAt: null,
      checkedInByName: null,
      checkInMethod: null,
    };

    async function withAtomicRowUpdateLock<T>(fn: () => Promise<T>): Promise<T> {
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

    const store: ScannerStore = {
      async isStaffAuthorizedForEvent() {
        return true;
      },
      async findTicketByCode(code) {
        if (code.toUpperCase() !== sharedTicket.ticketCode) return null;
        return { ...sharedTicket };
      },
      async atomicMarkTicketUsed(ticketId, evId, staffUserId, method, now) {
        return withAtomicRowUpdateLock(async () => {
          // Setara dengan: UPDATE tickets SET status = 'USED' WHERE id = :id AND event_id = :evId AND status = 'VALID'
          if (
            sharedTicket.id === ticketId &&
            sharedTicket.eventId === evId &&
            sharedTicket.status === 'VALID'
          ) {
            sharedTicket.status = 'USED';
            sharedTicket.checkedInAt = now;
            sharedTicket.checkedInByName =
              staffUserId === 'staff-gate-a' ? 'Petugas Pintu A' : 'Petugas Pintu B';
            sharedTicket.checkInMethod = method;
            return true;
          }
          return false;
        });
      },
    };

    const qrPayload = generateQrPayload('MOZA-GATE-0001', eventId, secret);
    const scanTime = new Date('2026-12-12T12:00:05.000Z');

    // Eksekusi paralel dari Gate A dan Gate B pada milidetik yang sama
    const outcomes = await Promise.allSettled([
      checkInTicketAtVenue(
        { id: 'staff-gate-a', name: 'Petugas Pintu A', role: 'STAFF' },
        { eventId, qrPayload },
        { store, qrSecretOverride: secret, now: scanTime }
      ),
      checkInTicketAtVenue(
        { id: 'staff-gate-b', name: 'Petugas Pintu B', role: 'STAFF' },
        { eventId, qrPayload },
        { store, qrSecretOverride: secret, now: scanTime }
      ),
    ]);

    const succeeded = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter(
      (o): o is PromiseRejectedResult => o.status === 'rejected'
    );

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const err = rejected[0].reason as AppError;
    expect(err.code).toBe('TICKET_ALREADY_USED');
    expect(err.statusCode).toBe(409);
    expect(sharedTicket.status).toBe('USED');
  });
});
