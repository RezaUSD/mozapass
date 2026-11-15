import type { TicketStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { sendTicketsEmailSafely } from '@/lib/mailer';
import { generateQrPayload, verifyQrPayload } from '@/lib/qr-crypto';
import { assertRateLimit } from '@/lib/rate-limit';

export async function listBuyerTickets(buyerId: string) {
  const tickets = await prisma.ticket.findMany({
    where: {
      order: { buyerId },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          location: true,
          startTime: true,
          endTime: true,
        },
      },
      ticketCategory: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
      order: {
        select: {
          id: true,
          orderCode: true,
          paidAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tickets.map((t) => ({
    id: t.id,
    ticketCode: t.ticketCode,
    qrPayload: generateQrPayload(t.ticketCode, t.eventId),
    status: t.status,
    attendeeName: t.attendeeName,
    attendeeEmail: t.attendeeEmail,
    checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
    checkInMethod: t.checkInMethod,
    event: {
      ...t.event,
      startTime: t.event.startTime.toISOString(),
      endTime: t.event.endTime.toISOString(),
    },
    category: t.ticketCategory,
    orderCode: t.order.orderCode,
  }));
}

export async function getBuyerTicketById(ticketId: string, buyerId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: { select: { id: true, orderCode: true, buyerId: true } },
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          location: true,
          startTime: true,
          endTime: true,
        },
      },
      ticketCategory: { select: { id: true, name: true, price: true } },
    },
  });

  if (!ticket) {
    throw new AppError('NOT_FOUND', 'Tiket tidak ditemukan.');
  }

  if (ticket.order.buyerId !== buyerId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda tidak memiliki izin untuk melihat E-Ticket milik pembeli lain.'
    );
  }

  return {
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    qrPayload: generateQrPayload(ticket.ticketCode, ticket.eventId),
    status: ticket.status,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
    checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null,
    checkInMethod: ticket.checkInMethod,
    orderCode: ticket.order.orderCode,
    event: {
      ...ticket.event,
      startTime: ticket.event.startTime.toISOString(),
      endTime: ticket.event.endTime.toISOString(),
    },
    category: ticket.ticketCategory,
  };
}

export async function resendBuyerTicketEmail(ticketId: string, buyerId: string) {
  assertRateLimit(`resend-email:${buyerId}`, 3, 10 * 60 * 1000);

  const detail = await getBuyerTicketById(ticketId, buyerId);
  const result = await sendTicketsEmailSafely([
    {
      ticketCode: detail.ticketCode,
      qrPayload: detail.qrPayload,
      attendeeName: detail.attendeeName,
      attendeeEmail: detail.attendeeEmail,
      eventTitle: detail.event.title,
      eventLocation: detail.event.location,
      eventStartTime: detail.event.startTime,
      categoryName: detail.category.name,
      unitPrice: detail.category.price,
    },
  ]);

  return {
    ticketId: detail.id,
    sent: result.sent,
    recipient: detail.attendeeEmail,
  };
}

export interface ScannerCheckInRecord {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  categoryName: string;
  attendeeName: string;
  attendeeEmail: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  checkedInByName: string | null;
  checkInMethod: string | null;
}

export async function listScannerAssignedEvents(user: {
  id: string;
  role: UserRole;
}) {
  const events = await prisma.event.findMany({
    where:
      user.role === 'ORGANIZER'
        ? { organizerId: user.id }
        : {
            staffAssignments: {
              some: { userId: user.id },
            },
          },
    include: {
      tickets: {
        select: { status: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  return events.map((ev) => {
    const validOrUsed = ev.tickets.filter(
      (t) => t.status === 'VALID' || t.status === 'USED'
    ).length;
    const checkedInCount = ev.tickets.filter((t) => t.status === 'USED').length;

    return {
      id: ev.id,
      title: ev.title,
      slug: ev.slug,
      location: ev.location,
      startTime: ev.startTime.toISOString(),
      endTime: ev.endTime.toISOString(),
      status: ev.status,
      totalValidOrUsed: validOrUsed,
      checkedInCount,
    };
  });
}

export interface ScannerStore {
  isStaffAuthorizedForEvent(
    userId: string,
    userRole: UserRole,
    eventId: string
  ): Promise<boolean>;
  findTicketByCode(ticketCode: string): Promise<ScannerCheckInRecord | null>;
  atomicMarkTicketUsed(
    ticketId: string,
    eventId: string,
    staffUserId: string,
    method: 'QR_SCAN' | 'MANUAL',
    now: Date
  ): Promise<boolean>;
}

const defaultScannerStore: ScannerStore = {
  async isStaffAuthorizedForEvent(userId, userRole, eventId) {
    if (userRole === 'ORGANIZER') {
      const ev = await prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true },
      });
      return ev?.organizerId === userId;
    }

    if (userRole === 'STAFF') {
      const assignment = await prisma.eventStaff.findUnique({
        where: {
          eventId_userId: { eventId, userId },
        },
      });
      return Boolean(assignment);
    }

    return false;
  },

  async findTicketByCode(ticketCode) {
    const t = await prisma.ticket.findUnique({
      where: { ticketCode: ticketCode.toUpperCase() },
      include: {
        event: { select: { id: true, title: true } },
        ticketCategory: { select: { name: true } },
        checkedInBy: { select: { name: true } },
      },
    });
    if (!t) return null;

    return {
      id: t.id,
      ticketCode: t.ticketCode,
      eventId: t.eventId,
      eventTitle: t.event.title,
      categoryName: t.ticketCategory.name,
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      status: t.status,
      checkedInAt: t.checkedInAt,
      checkedInByName: t.checkedInBy?.name ?? null,
      checkInMethod: t.checkInMethod,
    };
  },

  async atomicMarkTicketUsed(ticketId, eventId, staffUserId, method, now) {
    // Update atomik (BR-007, ST-012, E-004): WHERE id = :id AND event_id = :eventId AND status = 'VALID'
    const updated = await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        eventId,
        status: 'VALID',
      },
      data: {
        status: 'USED',
        checkedInAt: now,
        checkedInById: staffUserId,
        checkInMethod: method,
      },
    });

    return updated.count === 1;
  },
};

export interface CheckInTicketInput {
  eventId: string;
  qrPayload?: string | null;
  ticketCode?: string | null;
}

/**
 * Validasi & Check-in Tiket Atomik (EP-017, BR-006, BR-007, BR-009, ST-012, E-004, E-005).
 */
export async function checkInTicketAtVenue(
  actor: { id: string; name: string; role: UserRole },
  input: CheckInTicketInput,
  options?: {
    store?: ScannerStore;
    qrSecretOverride?: string;
    now?: Date;
  }
) {
  const store = options?.store ?? defaultScannerStore;
  const now = options?.now ?? new Date();

  // 1. Otorisasi Penugasan Panitia / Kepemilikan Acara (BR-009)
  const isAuthorized = await store.isStaffAuthorizedForEvent(
    actor.id,
    actor.role,
    input.eventId
  );
  if (!isAuthorized) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda tidak ditugaskan sebagai panitia scanner pada acara ini (BR-009).'
    );
  }

  const hasQr = Boolean(input.qrPayload && input.qrPayload.trim().length > 0);
  const hasManualCode = Boolean(input.ticketCode && input.ticketCode.trim().length > 0);

  if (!hasQr && !hasManualCode) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Wajib menyertakan qrPayload (scan kamera) atau ticketCode (input manual).'
    );
  }

  let targetTicketCode: string;
  let method: 'QR_SCAN' | 'MANUAL';

  if (hasQr && input.qrPayload) {
    method = 'QR_SCAN';
    // Verifikasi format & ekstrak kode dulu untuk mencari tiket
    const rawParts = input.qrPayload.trim().split('.');
    if (rawParts.length !== 3 || rawParts[0] !== 'MOZA') {
      throw new AppError(
        'QR_SIGNATURE_INVALID',
        'Format QR code tidak valid atau bukan tiket resmi Mozapass (BR-006).'
      );
    }
    targetTicketCode = rawParts[1].toUpperCase();
  } else {
    // Jalur B: Input Manual (E-005) — wajib dilindungi Rate Limit ketat + audit log
    method = 'MANUAL';
    assertRateLimit(`manual-checkin:${actor.id}`, 10, 60_000, now.getTime());
    targetTicketCode = (input.ticketCode ?? '').trim().toUpperCase();
  }

  const ticket = await store.findTicketByCode(targetTicketCode);

  // Jika jalur QR_SCAN tetapi tiket tidak ada ATAU signature HMAC tidak cocok dengan eventId tiket
  if (method === 'QR_SCAN' && input.qrPayload) {
    if (!ticket) {
      // Tetap jalankan verifikasi terhadap input.eventId agar waktu eksekusi konstan
      verifyQrPayload(input.qrPayload, input.eventId, options?.qrSecretOverride);
      throw new AppError('NOT_FOUND', 'Tiket tidak ditemukan di dalam sistem.');
    }
    // Verifikasi HMAC terhadap eventId asli tiket terlebih dahulu (BR-006)
    verifyQrPayload(input.qrPayload, ticket.eventId, options?.qrSecretOverride);
  }

  if (!ticket) {
    throw new AppError(
      'NOT_FOUND',
      `Tiket dengan kode "${targetTicketCode}" tidak ditemukan.`
    );
  }

  // 2. Pastikan tiket milik acara yang sedang dibuka scanner (BR-009 -> TICKET_WRONG_EVENT)
  if (ticket.eventId !== input.eventId) {
    logger.warn('TICKET_CHECKIN_REJECTED', 'Ticket scanned at wrong event entrance', {
      ticketCode: ticket.ticketCode,
      ticketEventId: ticket.eventId,
      scannerEventId: input.eventId,
      staffId: actor.id,
      method,
    });
    throw new AppError(
      'TICKET_WRONG_EVENT',
      `Tiket ini milik acara lain ("${ticket.eventTitle}"), bukan untuk acara yang sedang Anda scan (BR-009).`,
      {
        ticketCode: ticket.ticketCode,
        actualEventTitle: ticket.eventTitle,
      }
    );
  }

  if (ticket.status === 'VOID') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      'Tiket ini berstatus VOID (dibatalkan) dan tidak dapat digunakan untuk masuk.'
    );
  }

  // 3. Eksekusi Update Atomik WHERE status = 'VALID' (BR-007, ST-012, E-004)
  const updated = await store.atomicMarkTicketUsed(
    ticket.id,
    input.eventId,
    actor.id,
    method,
    now
  );

  if (!updated) {
    // Jika affected_rows === 0, ambil data terbaru tiket untuk menampilkan jam & petugas check-in sebelumnya
    const latest = (await store.findTicketByCode(targetTicketCode)) ?? ticket;
    logger.warn('TICKET_CHECKIN_REJECTED', 'Duplicate check-in attempt blocked (BR-007)', {
      ticketCode: latest.ticketCode,
      eventId: input.eventId,
      staffId: actor.id,
      method,
      previousCheckedInAt: latest.checkedInAt?.toISOString(),
    });

    throw new AppError(
      'TICKET_ALREADY_USED',
      'Tiket ini SUDAH PERNAH digunakan untuk check-in sebelumnya.',
      {
        ticketCode: latest.ticketCode,
        attendeeName: latest.attendeeName,
        categoryName: latest.categoryName,
        checkedInAt: latest.checkedInAt ? latest.checkedInAt.toISOString() : now.toISOString(),
        checkedInByName: latest.checkedInByName ?? 'Petugas Pintu Masuk',
        checkInMethod: latest.checkInMethod ?? 'QR_SCAN',
      }
    );
  }

  logger.info('TICKET_CHECKED_IN', `Ticket checked in via ${method}`, {
    ticketId: ticket.id,
    ticketCode: ticket.ticketCode,
    eventId: input.eventId,
    staffId: actor.id,
    checkInMethod: method,
  });

  return {
    result: 'VALID' as const,
    ticketCode: ticket.ticketCode,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
    categoryName: ticket.categoryName,
    checkInMethod: method,
    checkedInAt: now.toISOString(),
  };
}
