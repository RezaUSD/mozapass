import type { EventStatus, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface DailySalesBar {
  date: string;
  revenue: number;
  ticketsSold: number;
}

export interface OrganizerDashboardMetrics {
  totalRevenue: number;
  totalTicketsSold: number;
  totalQuota: number;
  totalCheckedIn: number;
  dailySalesChart: DailySalesBar[];
  activeEvents: Array<{
    id: string;
    title: string;
    slug: string;
    status: EventStatus;
    startTime: string;
    location: string;
    totalQuota: number;
    soldCount: number;
    reservedCount: number;
    checkedInCount: number;
    revenue: number;
  }>;
}

export interface AttendeeReportRow {
  ticketId: string;
  ticketCode: string;
  orderCode: string;
  attendeeName: string;
  attendeeEmail: string;
  categoryName: string;
  price: number;
  status: TicketStatus;
  checkedInAt: string | null;
  checkInMethod: string | null;
  checkedInByName: string | null;
}

export interface ReportStore {
  getOrganizerEventsForDashboard(organizerId: string): Promise<
    Array<{
      id: string;
      title: string;
      slug: string;
      status: EventStatus;
      startTime: Date;
      location: string;
      categories: Array<{
        totalQuota: number;
        soldCount: number;
        reservedCount: number;
      }>;
      orders: Array<{
        totalAmount: number;
        quantity: number;
        status: string;
        paidAt: Date | null;
      }>;
      tickets: Array<{
        status: TicketStatus;
      }>;
    }>
  >;
  getEventOwnerAndAttendees(
    eventId: string,
    query?: { q?: string; status?: TicketStatus }
  ): Promise<{
    event: {
      id: string;
      title: string;
      slug: string;
      organizerId: string;
    } | null;
    attendees: AttendeeReportRow[];
  }>;
  listAllEventsForAdmin(): Promise<
    Array<{
      id: string;
      title: string;
      slug: string;
      status: EventStatus;
      location: string;
      startTime: Date;
      moderationNote: string | null;
      organizer: { id: string; name: string; email: string };
    }>
  >;
  getEventForModeration(
    eventId: string
  ): Promise<{ id: string; title: string; status: EventStatus } | null>;
  updateEventModerationStatus(
    eventId: string,
    newStatus: EventStatus,
    moderationNote: string | null
  ): Promise<{ id: string; title: string; status: EventStatus; moderationNote: string | null }>;
}

const defaultReportStore: ReportStore = {
  async getOrganizerEventsForDashboard(organizerId) {
    return prisma.event.findMany({
      where: { organizerId },
      include: {
        categories: {
          select: {
            totalQuota: true,
            soldCount: true,
            reservedCount: true,
          },
        },
        orders: {
          where: { status: 'PAID' },
          select: {
            totalAmount: true,
            quantity: true,
            status: true,
            paidAt: true,
          },
        },
        tickets: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getEventOwnerAndAttendees(eventId, query) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, slug: true, organizerId: true },
    });
    if (!event) {
      return { event: null, attendees: [] };
    }

    const search = query?.q?.trim();
    const tickets = await prisma.ticket.findMany({
      where: {
        eventId,
        ...(query?.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { ticketCode: { contains: search, mode: 'insensitive' } },
                { attendeeName: { contains: search, mode: 'insensitive' } },
                { attendeeEmail: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        order: { select: { orderCode: true, unitPrice: true } },
        ticketCategory: { select: { name: true, price: true } },
        checkedInBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      event,
      attendees: tickets.map((t) => ({
        ticketId: t.id,
        ticketCode: t.ticketCode,
        orderCode: t.order.orderCode,
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        categoryName: t.ticketCategory.name,
        price: t.order.unitPrice,
        status: t.status,
        checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
        checkInMethod: t.checkInMethod,
        checkedInByName: t.checkedInBy?.name ?? null,
      })),
    };
  },

  async listAllEventsForAdmin() {
    return prisma.event.findMany({
      include: {
        organizer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getEventForModeration(eventId) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, status: true },
    });
  },

  async updateEventModerationStatus(eventId, newStatus, moderationNote) {
    return prisma.event.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        moderationNote,
      },
      select: {
        id: true,
        title: true,
        status: true,
        moderationNote: true,
      },
    });
  },
};

export async function getOrganizerDashboardMetrics(
  organizerId: string,
  store: ReportStore = defaultReportStore
): Promise<OrganizerDashboardMetrics> {
  const events = await store.getOrganizerEventsForDashboard(organizerId);

  let totalRevenue = 0;
  let totalTicketsSold = 0;
  let totalQuota = 0;
  let totalCheckedIn = 0;

  const dailyMap = new Map<string, { revenue: number; ticketsSold: number }>();

  // Inisialisasi 7 hari terakhir agar grafik pillar selalu memiliki 7 bar
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { revenue: 0, ticketsSold: 0 });
  }

  const activeEvents = events.map((ev) => {
    const evQuota = ev.categories.reduce((acc, c) => acc + c.totalQuota, 0);
    const evSold = ev.categories.reduce((acc, c) => acc + c.soldCount, 0);
    const evReserved = ev.categories.reduce((acc, c) => acc + c.reservedCount, 0);
    const evCheckedIn = ev.tickets.filter((t) => t.status === 'USED').length;
    const evRevenue = ev.orders.reduce((acc, o) => acc + o.totalAmount, 0);

    totalQuota += evQuota;
    totalTicketsSold += evSold;
    totalCheckedIn += evCheckedIn;
    totalRevenue += evRevenue;

    for (const ord of ev.orders) {
      if (ord.paidAt) {
        const dayKey = ord.paidAt.toISOString().slice(0, 10);
        const current = dailyMap.get(dayKey) ?? { revenue: 0, ticketsSold: 0 };
        current.revenue += ord.totalAmount;
        current.ticketsSold += ord.quantity;
        dailyMap.set(dayKey, current);
      }
    }

    return {
      id: ev.id,
      title: ev.title,
      slug: ev.slug,
      status: ev.status,
      startTime: ev.startTime.toISOString(),
      location: ev.location,
      totalQuota: evQuota,
      soldCount: evSold,
      reservedCount: evReserved,
      checkedInCount: evCheckedIn,
      revenue: evRevenue,
    };
  });

  const dailySalesChart: DailySalesBar[] = Array.from(dailyMap.entries()).map(
    ([date, val]) => ({
      date,
      revenue: val.revenue,
      ticketsSold: val.ticketsSold,
    })
  );

  return {
    totalRevenue,
    totalTicketsSold,
    totalQuota,
    totalCheckedIn,
    dailySalesChart,
    activeEvents,
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAttendeesCsv(rows: AttendeeReportRow[]): string {
  const headers = [
    'Ticket Code',
    'Order Code',
    'Attendee Name',
    'Attendee Email',
    'Category',
    'Price (IDR)',
    'Status',
    'Checked In At (UTC)',
    'Check-in Method',
    'Checked In By',
  ];

  const lines = ['sep=,', headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCsvCell(r.ticketCode),
        escapeCsvCell(r.orderCode),
        escapeCsvCell(r.attendeeName),
        escapeCsvCell(r.attendeeEmail),
        escapeCsvCell(r.categoryName),
        escapeCsvCell(r.price),
        escapeCsvCell(r.status),
        escapeCsvCell(r.checkedInAt),
        escapeCsvCell(r.checkInMethod),
        escapeCsvCell(r.checkedInByName),
      ].join(',')
    );
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export async function getOrganizerEventAttendees(
  eventId: string,
  organizerId: string,
  query?: { q?: string; status?: TicketStatus },
  store: ReportStore = defaultReportStore
) {
  const { event, attendees } = await store.getEventOwnerAndAttendees(
    eventId,
    query
  );

  if (!event) {
    throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
  }

  if (event.organizerId !== organizerId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda hanya diizinkan melihat atau mengekspor laporan peserta dari acara milik Anda sendiri.'
    );
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
    },
    attendees,
  };
}

export const adminModerateEventSchema = z.object({
  eventId: z.string().uuid('ID acara tidak valid.'),
  action: z.enum(['SUSPEND', 'RESTORE']),
  moderationNote: z.string().trim().max(500).optional().nullable(),
});

export async function listEventsForAdminModeration(
  store: ReportStore = defaultReportStore
) {
  const events = await store.listAllEventsForAdmin();
  return events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    status: ev.status,
    location: ev.location,
    startTime: ev.startTime.toISOString(),
    moderationNote: ev.moderationNote,
    organizer: ev.organizer,
  }));
}

/**
 * Moderasi Acara oleh ADMIN (EP-024, F-010, ST-004 PUBLISHED -> SUSPENDED, ST-005 SUSPENDED -> PUBLISHED).
 */
export async function moderateEventByAdmin(
  adminId: string,
  rawInput: unknown,
  store: ReportStore = defaultReportStore
) {
  const input = adminModerateEventSchema.parse(rawInput);
  const event = await store.getEventForModeration(input.eventId);

  if (!event) {
    throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
  }

  if (input.action === 'SUSPEND') {
    if (event.status !== 'PUBLISHED') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Hanya acara berstatus PUBLISHED yang dapat di-suspend (status saat ini: ${event.status}, ST-004).`
      );
    }
    const updated = await store.updateEventModerationStatus(
      event.id,
      'SUSPENDED',
      input.moderationNote ?? 'Ditangguhkan oleh moderator Admin.'
    );
    logger.warn('EVENT_MODERATION_CHANGED', 'Event suspended by ADMIN (ST-004)', {
      eventId: event.id,
      adminId,
      newStatus: 'SUSPENDED',
    });
    return updated;
  }

  // RESTORE (ST-005)
  if (event.status !== 'SUSPENDED') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Hanya acara berstatus SUSPENDED yang dapat dipulihkan ke PUBLISHED (status saat ini: ${event.status}, ST-005).`
    );
  }

  const updated = await store.updateEventModerationStatus(
    event.id,
    'PUBLISHED',
    input.moderationNote ?? null
  );
  logger.info('EVENT_MODERATION_CHANGED', 'Event restored to PUBLISHED by ADMIN (ST-005)', {
    eventId: event.id,
    adminId,
    newStatus: 'PUBLISHED',
  });
  return updated;
}
