import { describe, expect, it } from 'vitest';
import { sendTicketsEmailSafely, type MailTransportAdapter } from '@/lib/mailer';

describe('Mailer Safe Isolation Fallback (T-406: E-006)', () => {
  it('menangkap kegagalan koneksi SMTP tanpa melempar unhandled exception agar transaksi PAID tetap aman (E-006)', async () => {
    const failingTransport: MailTransportAdapter = {
      async sendMail() {
        throw new Error('SMTP Connection Refused: ECONNREFUSED 127.0.0.1:2525');
      },
    };

    const result = await sendTicketsEmailSafely(
      [
        {
          ticketCode: 'MOZA-TEST-0001',
          qrPayload: 'MOZA.MOZA-TEST-0001.A1B2C3D4E5F60718',
          attendeeName: 'Ayu Pembeli',
          attendeeEmail: 'buyer@mozapass.local',
          eventTitle: 'Nusantara Indie Soundscape 2026',
          eventLocation: 'Tennis Indoor Senayan, Jakarta',
          eventStartTime: '2026-12-12T12:00:00.000Z',
          categoryName: 'Presale Regular',
          unitPrice: 150000,
        },
      ],
      failingTransport
    );

    expect(result.sent).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('mengembalikan sent: true saat SMTP transport berhasil mengirim email tiket', async () => {
    let sentSubject = '';
    const okTransport: MailTransportAdapter = {
      async sendMail(opts: { from: string; to: string; subject: string; html: string }) {
        sentSubject = opts.subject;
      },
    };

    const result = await sendTicketsEmailSafely(
      [
        {
          ticketCode: 'MOZA-TEST-0002',
          qrPayload: 'MOZA.MOZA-TEST-0002.A1B2C3D4E5F60718',
          attendeeName: 'Ayu Pembeli',
          attendeeEmail: 'buyer@mozapass.local',
          eventTitle: 'Konferensi Arsitektur Sistem Terdistribusi 2026',
          eventLocation: 'Auditorium Kampus Merdeka, Bandung',
          eventStartTime: '2026-11-28T02:00:00.000Z',
          categoryName: 'General Admission (Mahasiswa)',
          unitPrice: 0,
        },
      ],
      okTransport
    );

    expect(result.sent).toBe(true);
    expect(sentSubject).toContain('[Mozapass] E-Ticket Anda');
  });
});
