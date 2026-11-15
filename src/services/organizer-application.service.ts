import type { OrganizerApplicationStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  applyOrganizerSchema,
  reviewOrganizerApplicationSchema,
} from '@/schemas/organizer-application.schema';

export interface OrganizerApplicationRecord {
  id: string;
  userId: string;
  organizationName: string;
  reason: string;
  status: OrganizerApplicationStatus;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface OrganizerApplicationRepository {
  findUserById(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null>;
  findByUserId(userId: string): Promise<OrganizerApplicationRecord | null>;
  findById(id: string): Promise<OrganizerApplicationRecord | null>;
  upsertApplication(data: {
    userId: string;
    organizationName: string;
    reason: string;
  }): Promise<OrganizerApplicationRecord>;
  listAll(
    status?: OrganizerApplicationStatus
  ): Promise<OrganizerApplicationRecord[]>;
  approveAndPromoteUser(params: {
    applicationId: string;
    userId: string;
    adminId: string;
    reviewNote: string | null;
  }): Promise<OrganizerApplicationRecord>;
  rejectApplication(params: {
    applicationId: string;
    adminId: string;
    reviewNote: string | null;
  }): Promise<OrganizerApplicationRecord>;
}

const defaultRepo: OrganizerApplicationRepository = {
  async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
  },
  async findByUserId(userId) {
    return prisma.organizerApplication.findUnique({
      where: { userId },
    });
  },
  async findById(id) {
    return prisma.organizerApplication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  },
  async upsertApplication(data) {
    return prisma.organizerApplication.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        organizationName: data.organizationName,
        reason: data.reason,
        status: 'PENDING',
      },
      update: {
        organizationName: data.organizationName,
        reason: data.reason,
        status: 'PENDING',
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
  },
  async listAll(status) {
    return prisma.organizerApplication.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  },
  async approveAndPromoteUser({ applicationId, userId, adminId, reviewNote }) {
    return prisma.$transaction(async (tx) => {
      const updatedApp = await tx.organizerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewNote,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { role: 'ORGANIZER' },
      });

      return updatedApp;
    });
  },
  async rejectApplication({ applicationId, adminId, reviewNote }) {
    return prisma.organizerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewNote,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  },
};

export async function getMyOrganizerApplication(
  userId: string,
  repo: OrganizerApplicationRepository = defaultRepo
) {
  const [user, application] = await Promise.all([
    repo.findUserById(userId),
    repo.findByUserId(userId),
  ]);

  if (!user) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  }

  return {
    currentRole: user.role,
    application,
  };
}

export async function submitOrganizerApplication(
  userId: string,
  rawInput: unknown,
  repo: OrganizerApplicationRepository = defaultRepo
) {
  const input = applyOrganizerSchema.parse(rawInput);
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  }

  if (user.role !== 'BUYER') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Akun Anda sudah memiliki role ${user.role} dan tidak perlu mengajukan upgrade Organizer.`
    );
  }

  const existing = await repo.findByUserId(userId);
  if (existing && existing.status === 'PENDING') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      'Pengajuan Anda masih dalam antrean peninjauan Admin.'
    );
  }
  if (existing && existing.status === 'APPROVED') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      'Pengajuan Anda sudah disetujui Admin.'
    );
  }

  const saved = await repo.upsertApplication({
    userId,
    organizationName: input.organizationName,
    reason: input.reason,
  });

  logger.info('ORGANIZER_APPLICATION_SUBMITTED', 'Buyer submitted organizer application', {
    userId,
    applicationId: saved.id,
  });

  return saved;
}

export async function listOrganizerApplicationsForAdmin(
  status?: OrganizerApplicationStatus,
  repo: OrganizerApplicationRepository = defaultRepo
) {
  return repo.listAll(status);
}

export async function reviewOrganizerApplication(
  adminId: string,
  applicationId: string,
  rawInput: unknown,
  repo: OrganizerApplicationRepository = defaultRepo
) {
  const input = reviewOrganizerApplicationSchema.parse(rawInput);
  const existing = await repo.findById(applicationId);

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Pengajuan Organizer tidak ditemukan.');
  }

  if (existing.status !== 'PENDING') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Pengajuan ini sudah diproses dengan status ${existing.status}.`
    );
  }

  const note = input.reviewNote?.trim() || null;

  if (input.decision === 'APPROVE') {
    const updated = await repo.approveAndPromoteUser({
      applicationId: existing.id,
      userId: existing.userId,
      adminId,
      reviewNote: note,
    });
    logger.info('ORGANIZER_APPLICATION_APPROVED', 'Admin approved organizer application', {
      adminId,
      applicationId: existing.id,
      applicantUserId: existing.userId,
    });
    return updated;
  }

  const rejected = await repo.rejectApplication({
    applicationId: existing.id,
    adminId,
    reviewNote: note ?? 'Pengajuan belum memenuhi syarat penyelenggara.',
  });
  logger.info('ORGANIZER_APPLICATION_REJECTED', 'Admin rejected organizer application', {
    adminId,
    applicationId: existing.id,
    applicantUserId: existing.userId,
  });
  return rejected;
}
