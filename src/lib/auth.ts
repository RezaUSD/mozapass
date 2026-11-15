import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { AppError } from '@/lib/errors';

export const AUTH_COOKIE_NAME = 'mozapass_token';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function getJwtSecretBytes(secretOverride?: string): Uint8Array {
  const secret = secretOverride ?? process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Konfigurasi JWT_SECRET belum diatur dengan benar di server.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Menandatangani JWT stateless untuk sesi pengguna (A-007).
 */
export async function signAuthToken(
  user: AuthUserPayload,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS,
  secretOverride?: string
): Promise<string> {
  const secretBytes = getJwtSecretBytes(secretOverride);
  const nowSeconds = Math.floor(Date.now() / 1000);

  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + expiresInSeconds)
    .sign(secretBytes);
}

/**
 * Memverifikasi JWT dan mengembalikan payload AuthUserPayload atau melempar 401 UNAUTHORIZED.
 */
export async function verifyAuthToken(
  token: string,
  secretOverride?: string
): Promise<AuthUserPayload> {
  const secretBytes = getJwtSecretBytes(secretOverride);
  try {
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    });

    const id = payload.sub;
    const name = typeof payload.name === 'string' ? payload.name : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const role = payload.role as UserRole | undefined;

    if (
      !id ||
      !email ||
      !role ||
      !['BUYER', 'ORGANIZER', 'STAFF', 'ADMIN'].includes(role)
    ) {
      throw new AppError('UNAUTHORIZED', 'Payload sesi autentikasi tidak valid.');
    }

    return { id, name, email, role };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      'UNAUTHORIZED',
      'Sesi Anda telah berakhir atau token tidak valid. Silakan masuk kembali.'
    );
  }
}

function parseSemverTuple(versionStr: string): [number, number, number] | null {
  const cleaned = versionStr.trim().replace(/^v/i, '');
  const parts = cleaned.split('.');
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = parts[2] !== undefined ? Number(parts[2]) : 0;
  if (
    !Number.isInteger(major) ||
    !Number.isInteger(minor) ||
    !Number.isInteger(patch) ||
    major < 0 ||
    minor < 0 ||
    patch < 0
  ) {
    return null;
  }
  return [major, minor, patch];
}

/**
 * Memeriksa header `X-App-Version` dari klien APK terhadap `MIN_SUPPORTED_APP_VERSION` (NFR-003).
 * Melempar 426 APP_UPDATE_REQUIRED jika versi aplikasi di bawah versi minimum.
 */
export function assertSupportedAppVersion(
  headers: Headers,
  minVersionOverride?: string
): void {
  const clientVersionHeader = headers.get('x-app-version');
  if (!clientVersionHeader) {
    return;
  }

  const minVersionStr =
    minVersionOverride ?? process.env.MIN_SUPPORTED_APP_VERSION ?? '1.0.0';
  const clientTuple = parseSemverTuple(clientVersionHeader);
  const minTuple = parseSemverTuple(minVersionStr);

  if (!clientTuple || !minTuple) {
    throw new AppError(
      'APP_UPDATE_REQUIRED',
      `Versi aplikasi (${clientVersionHeader}) tidak didukung. Harap perbarui ke versi terbaru (${minVersionStr}).`,
      { minSupportedVersion: minVersionStr }
    );
  }

  for (let i = 0; i < 3; i++) {
    if (clientTuple[i] > minTuple[i]) {
      return;
    }
    if (clientTuple[i] < minTuple[i]) {
      throw new AppError(
        'APP_UPDATE_REQUIRED',
        `Versi aplikasi Anda (${clientVersionHeader}) sudah usang. Harap perbarui ke versi minimal ${minVersionStr}.`,
        { minSupportedVersion: minVersionStr, currentVersion: clientVersionHeader }
      );
    }
  }
}

/**
 * Mengekstrak token JWT secara Dual-Mode (A-007):
 * 1. Header `Authorization: Bearer <token>` (Klien Mobile/APK)
 * 2. Cookie `mozapass_token` (Klien Web Browser)
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken.length > 0) {
      return bearerToken;
    }
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const part of cookies) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      const value = rest.join('=').trim();
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}

/**
 * Memastikan request terautentikasi dan versi aplikasi didukung.
 */
export async function requireAuth(
  request: Request,
  secretOverride?: string
): Promise<AuthUserPayload> {
  assertSupportedAppVersion(request.headers);

  const token = extractTokenFromRequest(request);
  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Autentikasi diperlukan untuk mengakses fitur ini.');
  }

  return verifyAuthToken(token, secretOverride);
}

/**
 * Memastikan request terautentikasi dan memiliki salah satu role yang diizinkan (RBAC Server Guard).
 */
export async function requireRole(
  request: Request,
  allowedRoles: readonly UserRole[],
  secretOverride?: string
): Promise<AuthUserPayload> {
  const user = await requireAuth(request, secretOverride);

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      'FORBIDDEN_ROLE',
      `Akses ditolak. Peran (${user.role}) tidak memiliki izin untuk operasi ini.`
    );
  }

  return user;
}

export function attachAuthCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds = DEFAULT_TOKEN_TTL_SECONDS
): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
