import { beforeEach, describe, expect, it } from 'vitest';
import type { UserRole } from '@prisma/client';
import { GET as getMeRoute } from '@/app/api/v1/auth/me/route';
import { POST as logoutRoute } from '@/app/api/v1/auth/logout/route';
import { AppError } from '@/lib/errors';
import {
  type AuthUserRecord,
  type AuthUserRepository,
  loginUser,
  registerUser,
} from '@/services/auth.service';

class InMemoryAuthRepo implements AuthUserRepository {
  private users: AuthUserRecord[] = [];

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<AuthUserRecord> {
    const record: AuthUserRecord = {
      id: `00000000-0000-4000-8000-${String(this.users.length + 1).padStart(12, '0')}`,
      ...data,
    };
    this.users.push(record);
    return record;
  }
}

describe('T-202: Auth Service & Endpoints Integration Tests (EP-001..EP-004)', () => {
  let repo: InMemoryAuthRepo;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-mozapass-jwt-secret-key-minimum-32-chars!';
    repo = new InMemoryAuthRepo();
  });

  it('registers BUYER account, rejects ORGANIZER on public register, and rejects duplicate email (EP-001)', async () => {
    const buyerRes = await registerUser(
      {
        name: 'Budi Santoso',
        email: 'Budi@Example.com',
        password: 'Password123!',
        role: 'BUYER',
      },
      repo
    );

    expect(buyerRes.user.email).toBe('budi@example.com');
    expect(buyerRes.user.role).toBe('BUYER');
    expect(buyerRes.token).toBeTruthy();

    await expect(
      registerUser(
        {
          name: 'Raka Event',
          email: 'raka@example.com',
          password: 'Password123!',
          role: 'ORGANIZER',
        },
        repo
      )
    ).rejects.toThrow();

    await expect(
      registerUser(
        {
          name: 'Budi Duplikat',
          email: 'budi@example.com',
          password: 'Password123!',
          role: 'BUYER',
        },
        repo
      )
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('rejects public registration with ADMIN or STAFF role', async () => {
    await expect(
      registerUser(
        {
          name: 'Admin Palsu',
          email: 'admin@example.com',
          password: 'Password123!',
          role: 'ADMIN',
        },
        repo
      )
    ).rejects.toThrow();
  });

  it('logs in registered user and rejects wrong password with 401 UNAUTHORIZED (EP-002)', async () => {
    await registerUser(
      {
        name: 'Budi Santoso',
        email: 'budi@example.com',
        password: 'Password123!',
        role: 'BUYER',
      },
      repo
    );

    const loginRes = await loginUser(
      {
        email: 'BUDI@example.com',
        password: 'Password123!',
      },
      repo
    );
    expect(loginRes.user.email).toBe('budi@example.com');

    await expect(
      loginUser(
        {
          email: 'budi@example.com',
          password: 'WrongPassword!',
        },
        repo
      )
    ).rejects.toBeInstanceOf(AppError);
  });

  it('protects GET /api/v1/auth/me and clears cookie on POST /api/v1/auth/logout (EP-003, EP-004)', async () => {
    const reg = await registerUser(
      {
        name: 'Budi Santoso',
        email: 'budi@example.com',
        password: 'Password123!',
        role: 'BUYER',
      },
      repo
    );

    const unauthReq = new Request('http://localhost:3000/api/v1/auth/me');
    const unauthRes = await getMeRoute(unauthReq);
    expect(unauthRes.status).toBe(401);

    const authReq = new Request('http://localhost:3000/api/v1/auth/me', {
      headers: {
        authorization: `Bearer ${reg.token}`,
      },
    });
    const authRes = await getMeRoute(authReq);
    expect(authRes.status).toBe(200);
    const body = (await authRes.json()) as {
      success: boolean;
      data: { user: { email: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('budi@example.com');

    const outRes = await logoutRoute();
    expect(outRes.status).toBe(200);
    expect(outRes.headers.get('set-cookie')).toContain('mozapass_token=;');
  });
});
