import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AppError,
  buildErrorEnvelope,
  buildSuccessEnvelope,
  ERROR_STATUS_MAP,
  handleApiError,
} from '@/lib/errors';
import { formatStructuredLog, redactSensitiveData } from '@/lib/logger';
import {
  computeQrSignature,
  generateQrPayload,
  parseQrPayload,
  verifyQrPayload,
} from '@/lib/qr-crypto';

const TEST_SECRET = 'test-mozapass-qr-hmac-secret-key-32chars!';
const EVENT_A = '550e8400-e29b-41d4-a716-446655440000';
const EVENT_B = '660e8400-e29b-41d4-a716-446655440001';

describe('T-103: Core Error Envelope, Structured Logger & QR HMAC-SHA256 Crypto', () => {
  describe('QR Payload Generation & Timing-Safe Verification (BR-006, A-005)', () => {
    it('generates compact MOZA.<ticketCode>.<hmac16> payload and verifies successfully', () => {
      const payload = generateQrPayload('MOZA-8F92-K10A', EVENT_A, TEST_SECRET);
      expect(payload).toMatch(/^MOZA\.MOZA-8F92-K10A\.[0-9A-F]{16}$/);

      const verified = verifyQrPayload(payload, EVENT_A, TEST_SECRET);
      expect(verified.ticketCode).toBe('MOZA-8F92-K10A');
      expect(verified.signature).toBe(
        computeQrSignature('MOZA-8F92-K10A', EVENT_A, TEST_SECRET)
      );
    });

    it('rejects payload if 1 character in the HMAC signature is tampered', () => {
      const payload = generateQrPayload('MOZA-8F92-K10A', EVENT_A, TEST_SECRET);
      const lastChar = payload.slice(-1);
      const tamperedLastChar = lastChar === 'A' ? 'B' : 'A';
      const tamperedPayload = payload.slice(0, -1) + tamperedLastChar;

      expect(() => verifyQrPayload(tamperedPayload, EVENT_A, TEST_SECRET)).toThrowError(
        AppError
      );
      try {
        verifyQrPayload(tamperedPayload, EVENT_A, TEST_SECRET);
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe('QR_SIGNATURE_INVALID');
        expect(appErr.statusCode).toBe(422);
      }
    });

    it('rejects payload if ticketCode is modified while keeping old signature', () => {
      const payload = generateQrPayload('MOZA-8F92-K10A', EVENT_A, TEST_SECRET);
      const [, , sig] = payload.split('.');
      const forgedPayload = `MOZA.MOZA-9999-XXXX.${sig}`;

      expect(() => verifyQrPayload(forgedPayload, EVENT_A, TEST_SECRET)).toThrowError(
        AppError
      );
    });

    it('rejects valid QR payload when verified against a different eventId (BR-006)', () => {
      const payload = generateQrPayload('MOZA-8F92-K10A', EVENT_A, TEST_SECRET);
      expect(() => verifyQrPayload(payload, EVENT_B, TEST_SECRET)).toThrowError(AppError);
    });

    it('rejects malformed QR strings', () => {
      expect(() => parseQrPayload('INVALID-STRING')).toThrowError(AppError);
      expect(() => parseQrPayload('FAKE.MOZA-1234.1234567890ABCDEF')).toThrowError(AppError);
      expect(() => parseQrPayload('MOZA.MOZA-1234.SHORT')).toThrowError(AppError);
    });
  });

  describe('Standard Error Dictionary & Envelope Helpers (tech-stack.md 3.2-3.4)', () => {
    it('defines all 19 standard error codes with exact HTTP status codes', () => {
      expect(Object.keys(ERROR_STATUS_MAP)).toHaveLength(19);
      expect(ERROR_STATUS_MAP.QUOTA_EXCEEDED).toBe(409);
      expect(ERROR_STATUS_MAP.TICKET_ALREADY_USED).toBe(409);
      expect(ERROR_STATUS_MAP.QR_SIGNATURE_INVALID).toBe(422);
      expect(ERROR_STATUS_MAP.RATE_LIMITED).toBe(429);
      expect(ERROR_STATUS_MAP.APP_UPDATE_REQUIRED).toBe(426);
    });

    it('builds standard success and error envelopes and handles ZodError', async () => {
      const ok = buildSuccessEnvelope({ id: '123' }, { page: 1, limit: 10, total: 1 });
      expect(ok.success).toBe(true);
      expect(ok.meta?.total).toBe(1);

      const errEnv = buildErrorEnvelope('QUOTA_EXCEEDED', 'Habis');
      expect(errEnv.success).toBe(false);
      expect(errEnv.error.code).toBe('QUOTA_EXCEEDED');

      const schema = z.object({ quantity: z.number().int().positive() });
      const parsed = schema.safeParse({ quantity: -2 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const res = handleApiError(parsed.error);
        expect(res.status).toBe(400);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Structured Logger Sensitive Data Redaction (NFR-006)', () => {
    it('redacts passwords, tokens, and secrets recursively', () => {
      const raw = {
        email: 'buyer@mozapass.local',
        password: 'PlainPassword123!',
        passwordHash: '$2a$10$abcdef',
        nested: {
          token: 'eyJhbGciOiJIUzI1NiJ9',
          qrSecretKey: 'super-secret',
          signature_key: 'sha512-sig',
          orderCode: 'ORD-001',
        },
      };

      const redacted = redactSensitiveData(raw) as Record<string, unknown>;
      expect(redacted.email).toBe('buyer@mozapass.local');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.passwordHash).toBe('[REDACTED]');

      const nested = redacted.nested as Record<string, unknown>;
      expect(nested.token).toBe('[REDACTED]');
      expect(nested.qrSecretKey).toBe('[REDACTED]');
      expect(nested.signature_key).toBe('[REDACTED]');
      expect(nested.orderCode).toBe('ORD-001');

      const logLine = formatStructuredLog('INFO', 'AUTH_EVENT', 'Login attempt', raw);
      expect(logLine).not.toContain('PlainPassword123!');
      expect(logLine).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(logLine).toContain('[REDACTED]');
    });
  });
});
