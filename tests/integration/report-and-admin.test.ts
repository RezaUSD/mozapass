import type { EventStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildAttendeesCsv,
  getOrganizerDashboardMetrics,
  getOrganizerEventAttendees,
  moderateEventByAdmin,
  type ReportStore,
} from '@/services/report.service';

function createInMemoryReportStore() {
  const eventState = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Nusantara Indie Soundscape 2026',
    slug: 'nusantara-indie-soundscape-2026',
    status: 'PUBLISHED' as EventStatus,
    startTime: new Date('2026-12-12T12:00:00.000Z'),
    location: 'Tennis Indoor Senayan, Jakarta',
    organizerId: 'org-owner-1',
    moderationNote: null as string | null,
  };

  const store: ReportStore = {
    async getOrganizerEventsForDashboard(organizerId) {
      if (organizerId !== eventState.organizerId) return [];
      return [
        {
          id: eventState.id,
          title: eventState.title,
          slug: eventState.slug,
          status: eventState.status,
          startTime: eventState.startTime,
          location: eventState.location,
          categories: [{ totalQuota: 100, soldCount: 2, reservedCount: 1 }],
          orders: [
            {
              totalAmount: 300000,
              quantity: 2,
              status: 'PAID',
              paidAt: new Date(),
            },
          ],
          tickets: [{ status: 'USED' }, { status: 'VALID' }],
        },
      ];
    },
    async getEventOwnerAndAttendees(eventId) {
      if (eventId !== eventState.id) return { event: null, attendees: [] };
      return {
        event: {
          id: eventState.id,
          title: eventState.title,
          slug: eventState.slug,
          organizerId: eventState.organizerId,
        },
        attendees: [
          {
            ticketId: 't-1',
            ticketCode: 'MOZA-DEMO-0001',
            orderCode: 'ORD-20261114-DEMO01',
            attendeeName: 'Ayu Pembeli, S.Kom',
            attendeeEmail: 'buyer@mozapass.local',
            categoryName: 'Presale Regular',
            price: 150000,
            status: 'USED',
            checkedInAt: '2026-12-12T11:30:00.000Z',
            checkInMethod: 'QR_SCAN',
            checkedInByName: 'Dimas Panitia Pintu A',
          },
        ],
      };
    },
    async listAllEventsForAdmin() {
      return [
        {
          ...eventState,
          organizer: {
            id: eventState.organizerId,
            name: 'Raka Penyelenggara',
            email: 'organizer@mozapass.local',
          },
        },
      ];
    },
    async getEventForModeration(eventId) {
      if (eventId !== eventState.id) return null;
      return {
        id: eventState.id,
        title: eventState.title,
        status: eventState.status,
      };
    },
    async updateEventModerationStatus(eventId, newStatus, moderationNote) {
      eventState.status = newStatus;
      eventState.moderationNote = moderationNote;
      return {
        id: eventId,
        title: eventState.title,
        status: eventState.status,
        moderationNote: eventState.moderationNote,
      };
    },
  };

  return { store, eventState };
}

describe('Organizer Bento Report, CSV Export & Admin Moderation (T-504: F-009, F-010, ST-004, ST-005)', () => {
  it('mengagregasi metrik Bento Dashboard dan mengekspor CSV peserta secara terisolasi per ORGANIZER', async () => {
    const { store, eventState } = createInMemoryReportStore();

    const metrics = await getOrganizerDashboardMetrics('org-owner-1', store);
    expect(metrics.totalRevenue).toBe(300000);
    expect(metrics.totalTicketsSold).toBe(2);
    expect(metrics.totalQuota).toBe(100);
    expect(metrics.totalCheckedIn).toBe(1);
    expect(metrics.dailySalesChart).toHaveLength(7);

    // Organizer lain tidak boleh mengakses daftar peserta acara ini
    await expect(
      getOrganizerEventAttendees(eventState.id, 'other-org-99', undefined, store)
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_OWNERSHIP',
      statusCode: 403,
    });

    const report = await getOrganizerEventAttendees(
      eventState.id,
      'org-owner-1',
      undefined,
      store
    );
    const csv = buildAttendeesCsv(report.attendees);
    expect(csv).toContain('Ticket Code,Order Code,Attendee Name');
    expect(csv).toContain('MOZA-DEMO-0001');
    expect(csv).toContain('"Ayu Pembeli, S.Kom"');
  });

  it('mengizinkan ADMIN men-suspend acara PUBLISHED (ST-004) dan memulihkannya kembali ke PUBLISHED (ST-005)', async () => {
    const { store, eventState } = createInMemoryReportStore();

    const suspended = await moderateEventByAdmin(
      'admin-1',
      {
        eventId: eventState.id,
        action: 'SUSPEND',
        moderationNote: 'Investigasi laporan duplikasi acara.',
      },
      store
    );
    expect(suspended.status).toBe('SUSPENDED');

    const restored = await moderateEventByAdmin(
      'admin-1',
      {
        eventId: eventState.id,
        action: 'RESTORE',
      },
      store
    );
    expect(restored.status).toBe('PUBLISHED');
  });
});
