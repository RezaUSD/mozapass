import { createHmac, timingSafeEqual } from 'crypto';
import { AppError } from '@/lib/errors';

const QR_PREFIX = 'MOZA';
const SIGNATURE_LENGTH = 16;

function resolveQrSecret(secretOverride?: string): string {
  const secret = secretOverride ?? process.env.QR_SECRET_KEY;
  if (!secret || secret.trim().length < 8) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Konfigurasi QR_SECRET_KEY belum diatur dengan benar di server.'
    );
  }
  return secret;
}

/**
 * Menghitung 16-karakter uppercase hex HMAC-SHA256 dari `${ticketCode}:${eventId}` (BR-006, A-005).
 */
export function computeQrSignature(
  ticketCode: string,
  eventId: string,
  secretOverride?: string
): string {
  const secret = resolveQrSecret(secretOverride);
  return createHmac('sha256', secret)
    .update(`${ticketCode}:${eventId}`)
    .digest('hex')
    .slice(0, SIGNATURE_LENGTH)
    .toUpperCase();
}

/**
 * Menghasilkan payload QR kompak bertanda tangan: `MOZA.<ticketCode>.<hmac16>` (A-005).
 */
export function generateQrPayload(
  ticketCode: string,
  eventId: string,
  secretOverride?: string
): string {
  const cleanCode = ticketCode.trim().toUpperCase();
  const signature = computeQrSignature(cleanCode, eventId, secretOverride);
  return `${QR_PREFIX}.${cleanCode}.${signature}`;
}

export interface ParsedQrPayload {
  ticketCode: string;
  signature: string;
}

/**
 * Mem-parsing string QR `MOZA.<ticketCode>.<hmac16>`. Melempar QR_SIGNATURE_INVALID jika format rusak.
 */
export function parseQrPayload(qrPayload: string): ParsedQrPayload {
  const trimmed = qrPayload.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) {
    throw new AppError(
      'QR_SIGNATURE_INVALID',
      'Format QR code tidak dikenali atau bukan tiket resmi Mozapass.'
    );
  }

  const [, ticketCode, signature] = parts;
  if (!ticketCode || !/^[0-9A-F]{16}$/i.test(signature)) {
    throw new AppError(
      'QR_SIGNATURE_INVALID',
      'Tanda tangan kriptografis QR code tidak valid atau rusak.'
    );
  }

  return {
    ticketCode: ticketCode.toUpperCase(),
    signature: signature.toUpperCase(),
  };
}

/**
 * Memverifikasi tanda tangan QR secara timing-safe terhadap ticketCode dan eventId (BR-006).
 * Mengembalikan objek `{ ticketCode, signature }` jika valid, atau melempar AppError('QR_SIGNATURE_INVALID').
 */
export function verifyQrPayload(
  qrPayload: string,
  eventId: string,
  secretOverride?: string
): ParsedQrPayload {
  const parsed = parseQrPayload(qrPayload);
  const expectedSignature = computeQrSignature(parsed.ticketCode, eventId, secretOverride);

  const providedBuffer = Buffer.from(parsed.signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new AppError(
      'QR_SIGNATURE_INVALID',
      'Tanda tangan kriptografis QR code tidak cocok atau terindikasi palsu.'
    );
  }

  return parsed;
}
