import { describe, expect, it } from 'vitest';
import { generateQrPayload } from '@/lib/qr-crypto';
import {
  checkInTicketAtVenue,
  type ScannerCheckInRecord,
  type ScannerStore,
} from '@/services/ticket.service';

function createInMemoryScannerStore() {
  const secret = 'test-secret-minimum-32-chars-for-hmac-256!!';
  const assignedEventId = '550e8400-e29b-41d4-a716-446655440000';
  const otherEventId = '660e8400-e29b-41d4-a716-446655440999';
  const assignedStaffId = 'staff-assigned-1';

  const tickets = new Map<string, ScannerCheckInRecord>([
    [
      'MOZA-DEMO-0001',
      {
        id: 'ticket-demo-1',
        ticketCode: 'MOZA-DEMO-0001',
        eventId: assignedEventId,
        eventTitle: 'Nusantara Indie Soundscape 2026',
        categoryName: 'Presale Regular',
        attendeeName: 'Ayu Pembeli',
        attendeeEmail: 'buyer@mozapass.local',
        status: 'VALID',
        checkedInAt: null,
        checkedInByName: null,
        checkInMethod: null,
      },
    ],
    [
      'MOZA-OTHR-0002',
      {
        id: 'ticket-other-2',
        ticketCode: 'MOZA-OTHR-0002',
        eventId: otherEventId,
        eventTitle: 'Konferensi Arsitektur Sistem Terdistribusi 2026',
        categoryName: 'General Admission',
        attendeeName: 'Budi Peserta',
        attendeeEmail: 'budi@mozapass.local',
        status: 'VALID',
        checkedInAt: null,
        checkedInByName: null,
        checkInMethod: null,
      },
    ],
  ]);

  const store: ScannerStore = {
    async isStaffAuthorizedForEvent(userId, userRole, eventId) {
      if (userRole === 'STAFF' && userId === assignedStaffId && eventId === assignedEventId) {
        return true;
      }
      return false;
    },
    async findTicketByCode(ticketCode) {
      const found = tickets.get(ticketCode.toUpperCase());
      return found ? { ...found } : null;
    },
    async atomicMarkTicketUsed(ticketId, eventId, _staffUserId, method, now) {
      for (const record of tickets.values()) {
        if (
          record.id === ticketId &&
          record.eventId === eventId &&
          record.status === 'VALID'
        ) {
          record.status = 'USED';
          record.checkedInAt = now;
          record.checkedInByName = 'Dimas Panitia Pintu A';
          record.checkInMethod = method;
          return true;
        }
      }
      return false;
    },
  };

  return { store, secret, assignedEventId, otherEventId, assignedStaffId };
}

describe('Scanner Check-in Atomic & Event Isolation (T-502: BR-006, BR-007, BR-009, ST-012, E-005)', () => {
  it('1) menerima scan pertama VALID -> USED (200 OK) dan 2) menolak scan kedua dengan 409 TICKET_ALREADY_USED beserta detail waktu & petugas', async () => {
    const { store, secret, assignedEventId, assignedStaffId } =
      createInMemoryScannerStore();

    const validQr = generateQrPayload('MOZA-DEMO-0001', assignedEventId, secret);
    const firstScanTime = new Date('2026-12-12T11:30:00.000Z');

    const firstScan = await checkInTicketAtVenue(
      { id: assignedStaffId, name: 'Dimas Panitia Pintu A', role: 'STAFF' },
      { eventId: assignedEventId, qrPayload: validQr },
      { store, qrSecretOverride: secret, now: firstScanTime }
    );

    expect(firstScan.result).toBe('VALID');
    expect(firstScan.ticketCode).toBe('MOZA-DEMO-0001');
    expect(firstScan.checkInMethod).toBe('QR_SCAN');

    // Scan kedua dengan QR yang sama wajib ditolak 409 TICKET_ALREADY_USED
    await expect(
      checkInTicketAtVenue(
        { id: assignedStaffId, name: 'Dimas Panitia Pintu A', role: 'STAFF' },
        { eventId: assignedEventId, qrPayload: validQr },
        {
          store,
          qrSecretOverride: secret,
          now: new Date('2026-12-12T11:35:00.000Z'),
        }
      )
    ).rejects.toMatchObject({
      code: 'TICKET_ALREADY_USED',
      statusCode: 409,
      details: {
        ticketCode: 'MOZA-DEMO-0001',
        checkedInAt: '2026-12-12T11:30:00.000Z',
        checkedInByName: 'Dimas Panitia Pintu A',
      },
    });
  });

  it('3) menolak tiket dari acara lain dengan 422 TICKET_WRONG_EVENT (BR-009)', async () => {
    const { store, secret, assignedEventId, otherEventId, assignedStaffId } =
      createInMemoryScannerStore();

    const wrongEventQr = generateQrPayload('MOZA-OTHR-0002', otherEventId, secret);

    await expect(
      checkInTicketAtVenue(
        { id: assignedStaffId, name: 'Dimas Panitia Pintu A', role: 'STAFF' },
        { eventId: assignedEventId, qrPayload: wrongEventQr },
        { store, qrSecretOverride: secret }
      )
    ).rejects.toMatchObject({
      code: 'TICKET_WRONG_EVENT',
      statusCode: 422,
    });
  });

  it('4) menolak panitia yang tidak ditugaskan di acara tersebut dengan 403 FORBIDDEN_OWNERSHIP (BR-009)', async () => {
    const { store, secret, assignedEventId } = createInMemoryScannerStore();
    const validQr = generateQrPayload('MOZA-DEMO-0001', assignedEventId, secret);

    await expect(
      checkInTicketAtVenue(
        { id: 'unassigned-staff-99', name: 'Panitia Acara Lain', role: 'STAFF' },
        { eventId: assignedEventId, qrPayload: validQr },
        { store, qrSecretOverride: secret }
      )
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_OWNERSHIP',
      statusCode: 403,
    });
  });

  it('5) menolak QR dengan signature HMAC palsu dengan 422 QR_SIGNATURE_INVALID (BR-006)', async () => {
    const { store, secret, assignedEventId, assignedStaffId } =
      createInMemoryScannerStore();

    const forgedQr = 'MOZA.MOZA-DEMO-0001.DEADBEEFCAFEBABE';

    await expect(
      checkInTicketAtVenue(
        { id: assignedStaffId, name: 'Dimas Panitia Pintu A', role: 'STAFF' },
        { eventId: assignedEventId, qrPayload: forgedQr },
        { store, qrSecretOverride: secret }
      )
    ).rejects.toMatchObject({
      code: 'QR_SIGNATURE_INVALID',
      statusCode: 422,
    });
  });

  it('6) mendukung fallback input kode manual (E-005) dan mencatat checkInMethod = "MANUAL"', async () => {
    const { store, secret, assignedEventId, assignedStaffId } =
      createInMemoryScannerStore();

    const manualResult = await checkInTicketAtVenue(
      { id: assignedStaffId, name: 'Dimas Panitia Pintu A', role: 'STAFF' },
      { eventId: assignedEventId, ticketCode: 'moza-demo-0001' },
      { store, qrSecretOverride: secret }
    );

    expect(manualResult.result).toBe('VALID');
    expect(manualResult.checkInMethod).toBe('MANUAL');
  });
});
