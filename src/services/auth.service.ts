import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  type AuthUserPayload,
  hashPassword,
  signAuthToken,
  verifyPassword,
} from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<AuthUserRecord>;
}

const defaultAuthRepository: AuthUserRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  async create(data) {
    return prisma.user.create({ data });
  },
};

export interface AuthResult {
  user: AuthUserPayload;
  token: string;
}

export async function registerUser(
  rawInput: unknown,
  repo: AuthUserRepository = defaultAuthRepository
): Promise<AuthResult> {
  const input = registerSchema.parse(rawInput);

  const existing = await repo.findByEmail(input.email);
  if (existing) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.',
      { fields: { email: ['Email sudah terdaftar.'] } }
    );
  }

  const passwordHash = await hashPassword(input.password);
  const created = await repo.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  const userPayload: AuthUserPayload = {
    id: created.id,
    name: created.name,
    email: created.email,
    role: created.role,
  };

  const token = await signAuthToken(userPayload);
  logger.info('AUTH_EVENT', 'User registered', {
    userId: created.id,
    email: created.email,
    role: created.role,
  });

  return { user: userPayload, token };
}

export async function loginUser(
  rawInput: unknown,
  repo: AuthUserRepository = defaultAuthRepository
): Promise<AuthResult> {
  const input = loginSchema.parse(rawInput);

  const userRecord = await repo.findByEmail(input.email);
  if (!userRecord) {
    throw new AppError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah.');
  }

  const validPassword = await verifyPassword(input.password, userRecord.passwordHash);
  if (!validPassword) {
    throw new AppError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah.');
  }

  const userPayload: AuthUserPayload = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
  };

  const token = await signAuthToken(userPayload);
  logger.info('AUTH_EVENT', 'User logged in', {
    userId: userRecord.id,
    email: userRecord.email,
    role: userRecord.role,
  });

  return { user: userPayload, token };
}
