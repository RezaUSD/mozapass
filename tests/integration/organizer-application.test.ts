import { beforeEach, describe, expect, it } from 'vitest';
import type { OrganizerApplicationStatus, UserRole } from '@prisma/client';
import {
  getMyOrganizerApplication,
  listOrganizerApplicationsForAdmin,
  type OrganizerApplicationRecord,
  type OrganizerApplicationRepository,
  reviewOrganizerApplication,
  submitOrganizerApplication,
} from '@/services/organizer-application.service';

interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

class InMemoryOrganizerApplicationRepo implements OrganizerApplicationRepository {
  public users: InMemoryUser[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Budi Pembeli',
      email: 'buyer@mozapass.local',
      role: 'BUYER',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Admin Mozapass',
      email: 'admin@mozapass.local',
      role: 'ADMIN',
    },
  ];
  public applications: OrganizerApplicationRecord[] = [];

  async findUserById(userId: string) {
    return this.users.find((u) => u.id === userId) ?? null;
  }

  async findByUserId(userId: string) {
    return this.applications.find((a) => a.userId === userId) ?? null;
  }

  async findById(id: string) {
    const app = this.applications.find((a) => a.id === id);
    if (!app) return null;
    const user = this.users.find((u) => u.id === app.userId);
    return { ...app, user };
  }

  async upsertApplication(data: {
    userId: string;
    organizationName: string;
    reason: string;
  }) {
    const now = new Date();
    const existing = this.applications.find((a) => a.userId === data.userId);
    if (existing) {
      existing.organizationName = data.organizationName;
      existing.reason = data.reason;
      existing.status = 'PENDING';
      existing.reviewNote = null;
      existing.reviewedById = null;
      existing.reviewedAt = null;
      existing.updatedAt = now;
      return existing;
    }

    const created: OrganizerApplicationRecord = {
      id: `10000000-0000-4000-8000-${String(this.applications.length + 1).padStart(12, '0')}`,
      userId: data.userId,
      organizationName: data.organizationName,
      reason: data.reason,
      status: 'PENDING',
      reviewNote: null,
      reviewedById: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.applications.push(created);
    return created;
  }

  async listAll(status?: OrganizerApplicationStatus) {
    return this.applications
      .filter((a) => (status ? a.status === status : true))
      .map((a) => ({
        ...a,
        user: this.users.find((u) => u.id === a.userId),
      }));
  }

  async approveAndPromoteUser(params: {
    applicationId: string;
    userId: string;
    adminId: string;
    reviewNote: string | null;
  }) {
    const app = this.applications.find((a) => a.id === params.applicationId);
    const user = this.users.find((u) => u.id === params.userId);
    if (!app || !user) throw new Error('Not found');

    app.status = 'APPROVED';
    app.reviewNote = params.reviewNote;
    app.reviewedById = params.adminId;
    app.reviewedAt = new Date();
    user.role = 'ORGANIZER';

    return { ...app, user };
  }

  async rejectApplication(params: {
    applicationId: string;
    adminId: string;
    reviewNote: string | null;
  }) {
    const app = this.applications.find((a) => a.id === params.applicationId);
    if (!app) throw new Error('Not found');

    app.status = 'REJECTED';
    app.reviewNote = params.reviewNote;
    app.reviewedById = params.adminId;
    app.reviewedAt = new Date();
    const user = this.users.find((u) => u.id === app.userId);

    return { ...app, user };
  }
}

describe('Organizer Application & Admin Approval Flow', () => {
  let repo: InMemoryOrganizerApplicationRepo;
  const buyerId = '00000000-0000-4000-8000-000000000001';
  const adminId = '00000000-0000-4000-8000-000000000002';

  beforeEach(() => {
    repo = new InMemoryOrganizerApplicationRepo();
  });

  it('allows BUYER to submit application, prevents duplicate PENDING, and promotes to ORGANIZER on Admin APPROVE', async () => {
    const submitted = await submitOrganizerApplication(
      buyerId,
      {
        organizationName: 'Komunitas Indie Jakarta',
        reason: 'Ingin menyelenggarakan konser musik tahunan berkapasitas 500 orang.',
      },
      repo
    );

    expect(submitted.status).toBe('PENDING');

    await expect(
      submitOrganizerApplication(
        buyerId,
        {
          organizationName: 'Duplikat Org',
          reason: 'Mencoba kirim ulang saat masih pending.',
        },
        repo
      )
    ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION', statusCode: 422 });

    const pendingList = await listOrganizerApplicationsForAdmin('PENDING', repo);
    expect(pendingList).toHaveLength(1);

    const approved = await reviewOrganizerApplication(
      adminId,
      submitted.id,
      { decision: 'APPROVE', reviewNote: 'Dokumen lengkap dan valid.' },
      repo
    );

    expect(approved.status).toBe('APPROVED');

    const statusAfter = await getMyOrganizerApplication(buyerId, repo);
    expect(statusAfter.currentRole).toBe('ORGANIZER');
    expect(statusAfter.application?.status).toBe('APPROVED');
  });

  it('keeps user as BUYER when Admin rejects and allows re-applying', async () => {
    const submitted = await submitOrganizerApplication(
      buyerId,
      {
        organizationName: 'Event Uji Coba',
        reason: 'Alasan masih kurang lengkap untuk verifikasi awal.',
      },
      repo
    );

    const rejected = await reviewOrganizerApplication(
      adminId,
      submitted.id,
      { decision: 'REJECT', reviewNote: 'Mohon lengkapi deskripsi acara.' },
      repo
    );
    expect(rejected.status).toBe('REJECTED');

    const statusAfterReject = await getMyOrganizerApplication(buyerId, repo);
    expect(statusAfterReject.currentRole).toBe('BUYER');

    const reapplied = await submitOrganizerApplication(
      buyerId,
      {
        organizationName: 'Komunitas Musik Nusantara',
        reason: 'Menyelenggarakan festival musik independen skala regional dengan 800 peserta.',
      },
      repo
    );
    expect(reapplied.status).toBe('PENDING');
  });
});
