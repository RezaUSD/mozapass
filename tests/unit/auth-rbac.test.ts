import { describe, expect, it, beforeEach } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  assertSupportedAppVersion,
  hashPassword,
  requireAuth,
  requireRole,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
} from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { assertRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';

const TEST_JWT_SECRET = 'test-mozapass-jwt-secret-key-minimum-32-chars!';

describe('T-104: Dual-Mode JWT Auth, RBAC Guard, APK Version Check & Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  describe('Password Hashing (bcryptjs)', () => {
    it('hashes and verifies password properly', async () => {
      const hash = await hashPassword('MozaPass2026!');
      expect(hash).not.toBe('MozaPass2026!');
      expect(await verifyPassword('MozaPass2026!', hash)).toBe(true);
      expect(await verifyPassword('WrongPassword', hash)).toBe(false);
    });
  });

  describe('JWT Sign & Verify (jose - A-007)', () => {
    it('signs and verifies valid JWT token', async () => {
      const token = await signAuthToken(
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Budi Pembeli',
          email: 'buyer@mozapass.local',
          role: 'BUYER',
        },
        3600,
        TEST_JWT_SECRET
      );

      const verified = await verifyAuthToken(token, TEST_JWT_SECRET);
      expect(verified.id).toBe('11111111-1111-1111-1111-111111111111');
      expect(verified.email).toBe('buyer@mozapass.local');
      expect(verified.role).toBe('BUYER');
    });

    it('rejects expired or tampered token with 401 UNAUTHORIZED', async () => {
      const expiredToken = await signAuthToken(
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Budi Pembeli',
          email: 'buyer@mozapass.local',
          role: 'BUYER',
        },
        -10,
        TEST_JWT_SECRET
      );

      await expect(verifyAuthToken(expiredToken, TEST_JWT_SECRET)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });

      await expect(
        verifyAuthToken(`${expiredToken}tampered`, TEST_JWT_SECRET)
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });
  });

  describe('Dual-Mode Token Extraction (Cookie & Bearer) & RBAC Guard (F-001, A-007)', () => {
    it('authenticates via HTTP-Only Cookie as well as Authorization Bearer header', async () => {
      const token = await signAuthToken(
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Raka Organizer',
          email: 'organizer@mozapass.local',
          role: 'ORGANIZER',
        },
        3600,
        TEST_JWT_SECRET
      );

      const webRequest = new Request('http://localhost:3000/api/v1/organizer/events', {
        headers: {
          cookie: `other_cookie=1; ${AUTH_COOKIE_NAME}=${token}`,
        },
      });
      const userFromCookie = await requireAuth(webRequest, TEST_JWT_SECRET);
      expect(userFromCookie.role).toBe('ORGANIZER');

      const apkRequest = new Request('http://localhost:3000/api/v1/organizer/events', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const userFromBearer = await requireRole(
        apkRequest,
        ['ORGANIZER', 'ADMIN'],
        TEST_JWT_SECRET
      );
      expect(userFromBearer.id).toBe('22222222-2222-2222-2222-222222222222');
    });

    it('rejects unauthorized role with 403 FORBIDDEN_ROLE', async () => {
      const buyerToken = await signAuthToken(
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Budi Pembeli',
          email: 'buyer@mozapass.local',
          role: 'BUYER',
        },
        3600,
        TEST_JWT_SECRET
      );

      const req = new Request('http://localhost:3000/api/v1/scanner/check-in', {
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      await expect(
        requireRole(req, ['STAFF', 'ORGANIZER'], TEST_JWT_SECRET)
      ).rejects.toMatchObject({
        code: 'FORBIDDEN_ROLE',
        statusCode: 403,
      });
    });
  });

  describe('APK Version Gate (X-App-Version -> 426 APP_UPDATE_REQUIRED, NFR-003)', () => {
    it('allows requests without X-App-Version or with version >= minVersion', () => {
      const webHeaders = new Headers();
      expect(() => assertSupportedAppVersion(webHeaders, '1.0.0')).not.toThrow();

      const validApkHeaders = new Headers({ 'x-app-version': '1.2.0' });
      expect(() => assertSupportedAppVersion(validApkHeaders, '1.0.0')).not.toThrow();
    });

    it('throws 426 APP_UPDATE_REQUIRED when client APK version is outdated', () => {
      const oldApkHeaders = new Headers({ 'x-app-version': '0.9.5' });
      expect(() => assertSupportedAppVersion(oldApkHeaders, '1.0.0')).toThrowError(
        AppError
      );
      try {
        assertSupportedAppVersion(oldApkHeaders, '1.0.0');
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe('APP_UPDATE_REQUIRED');
        expect(appErr.statusCode).toBe(426);
      }
    });
  });

  describe('Sliding-Window Rate Limiter (RATE_LIMITED 429, E-005)', () => {
    it('allows requests within limit and blocks with 429 RATE_LIMITED when exceeded', () => {
      const key = 'manual-checkin:staff-1';
      assertRateLimit(key, 3, 60_000, 1000);
      assertRateLimit(key, 3, 60_000, 2000);
      assertRateLimit(key, 3, 60_000, 3000);

      expect(() => assertRateLimit(key, 3, 60_000, 4000)).toThrowError(AppError);
      try {
        assertRateLimit(key, 3, 60_000, 4000);
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe('RATE_LIMITED');
        expect(appErr.statusCode).toBe(429);
      }

      // Setelah jendela waktu 60 detik berlalu, kuota rate-limit pulih kembali
      expect(() => assertRateLimit(key, 3, 60_000, 62_000)).not.toThrow();
    });
  });

  describe('Auth Zod Schemas (EP-001, EP-002)', () => {
    it('normalizes email to lowercase and blocks registering as ORGANIZER, ADMIN or STAFF publicly', () => {
      const valid = registerSchema.parse({
        name: 'Siti Pembeli',
        email: '  SITI@Example.COM ',
        password: 'Password123!',
        role: 'BUYER',
      });
      expect(valid.email).toBe('siti@example.com');
      expect(valid.role).toBe('BUYER');

      const invalidOrg = registerSchema.safeParse({
        name: 'Calon Org',
        email: 'org@example.com',
        password: 'Password123!',
        role: 'ORGANIZER',
      });
      expect(invalidOrg.success).toBe(false);

      const invalidAdmin = registerSchema.safeParse({
        name: 'Hacker',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });
      expect(invalidAdmin.success).toBe(false);

      const loginParsed = loginSchema.parse({
        email: 'USER@Mozapass.Local',
        password: 'secret',
      });
      expect(loginParsed.email).toBe('user@mozapass.local');
    });
  });
});
