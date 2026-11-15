import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { formatRupiah } from '@/lib/format';
import { logger } from '@/lib/logger';

export interface TicketEmailItem {
  ticketCode: string;
  qrPayload: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventLocation: string;
  eventStartTime: string;
  categoryName: string;
  unitPrice: number;
}

export interface MailTransportAdapter {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<unknown>;
}

function createDefaultTransporter(): MailTransportAdapter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-smtp-user') {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? '587'),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });
}

/**
 * Mengirim email E-Ticket ber-QR ke pembeli (F-006).
 * Sesuai E-006: kegagalan SMTP wajib diisolasi (try/catch) dan TIDAK BOLEH menggagalkan
 * transaksi pembayaran atau penerbitan tiket di database.
 */
export async function sendTicketsEmailSafely(
  tickets: TicketEmailItem[],
  customTransport?: MailTransportAdapter
): Promise<{ sent: boolean; error?: string }> {
  if (tickets.length === 0) {
    return { sent: false, error: 'Tidak ada tiket untuk dikirim.' };
  }

  try {
    const first = tickets[0];
    const qrDataUrls = await Promise.all(
      tickets.map((t) =>
        QRCode.toDataURL(t.qrPayload, {
          margin: 1,
          width: 220,
          color: { dark: '#181824', light: '#FFFFFF' },
        })
      )
    );

    const ticketCardsHtml = tickets
      .map(
        (t, idx) => `
        <div style="border:1px solid #ECECF2;border-radius:16px;padding:16px;margin-bottom:16px;background:#FFFFFF;">
          <div style="background:#181824;color:#FFFFFF;padding:12px 16px;border-radius:12px;">
            <strong style="color:#D2F865;">${t.categoryName}</strong> • ${formatRupiah(t.unitPrice, true)}
            <div style="font-size:14px;margin-top:4px;">${t.eventTitle}</div>
            <div style="font-size:12px;color:#9E9EB0;">📍 ${t.eventLocation}</div>
          </div>
          <div style="text-align:center;padding:16px 0;">
            <img src="${qrDataUrls[idx]}" alt="QR Ticket ${t.ticketCode}" width="180" height="180" />
            <div style="font-family:monospace;font-weight:bold;font-size:16px;margin-top:8px;color:#181824;">
              ${t.ticketCode}
            </div>
          </div>
        </div>
      `
      )
      .join('');

    const html = `
      <div style="font-family:sans-serif;background:#F7F7FA;padding:24px;color:#181824;">
        <h2 style="margin-top:0;">E-Ticket Resmi Mozapass Anda</h2>
        <p>Halo <strong>${first.attendeeName}</strong>, berikut adalah ${tickets.length} tiket resmi Anda untuk <strong>${first.eventTitle}</strong>:</p>
        ${ticketCardsHtml}
        <p style="font-size:12px;color:#6E6E82;">Tunjukkan QR code di atas kepada panitia di pintu masuk acara.</p>
      </div>
    `;

    const transporter = customTransport ?? createDefaultTransporter();
    if (!transporter) {
      logger.info('ORDER_PAID', 'SMTP not configured; ticket email logged in dev fallback', {
        recipient: first.attendeeEmail,
        ticketCount: tickets.length,
        ticketCodes: tickets.map((t) => t.ticketCode),
      });
      return { sent: true };
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Mozapass <noreply@mozapass.local>',
      to: first.attendeeEmail,
      subject: `[Mozapass] E-Ticket Anda: ${first.eventTitle}`,
      html,
    });

    return { sent: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'SMTP unknown error';
    logger.warn('SYSTEM_ERROR', 'Failed to send ticket email (isolated per E-006)', {
      error: errMsg,
      recipient: tickets[0]?.attendeeEmail,
    });
    return { sent: false, error: errMsg };
  }
}
