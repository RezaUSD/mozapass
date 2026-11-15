import type { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const assignStaffSchema = z.object({
  email: z.string().trim().email('Format email panitia tidak valid.').toLowerCase(),
});

export const removeStaffSchema = z.object({
  userId: z.string().uuid('ID user panitia tidak valid.'),
});

export interface StaffAssignmentRecord {
  id: string;
  eventId: string;
  userId: string;
  assignedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface StaffAssignmentStore {
  getEventOwner(eventId: string): Promise<{ id: string; title: string; organizerId: string } | null>;
  listAssignedStaff(eventId: string): Promise<StaffAssignmentRecord[]>;
  findUserByEmail(email: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null>;
  findExistingAssignment(eventId: string, userId: string): Promise<{ id: string } | null>;
  createAssignmentAndPromoteRoleIfNeeded(params: {
    eventId: string;
    userId: string;
    assignedById: string;
    currentRole: UserRole;
  }): Promise<StaffAssignmentRecord>;
  deleteAssignment(eventId: string, userId: string): Promise<boolean>;
}

const defaultStaffStore: StaffAssignmentStore = {
  async getEventOwner(eventId) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, organizerId: true },
    });
  },

  async listAssignedStaff(eventId) {
    return prisma.eventStaff.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  },

  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, role: true },
    });
  },

  async findExistingAssignment(eventId, userId) {
    return prisma.eventStaff.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
      select: { id: true },
    });
  },

  async createAssignmentAndPromoteRoleIfNeeded({
    eventId,
    userId,
    currentRole,
  }) {
    return prisma.$transaction(async (tx) => {
      if (currentRole === 'BUYER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'STAFF' },
        });
      }

      return tx.eventStaff.create({
        data: {
          eventId,
          userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });
  },

  async deleteAssignment(eventId, userId) {
    const deleted = await prisma.eventStaff.deleteMany({
      where: { eventId, userId },
    });
    return deleted.count > 0;
  },
};

async function verifyOrganizerEventOwnership(
  eventId: string,
  organizerId: string,
  store: StaffAssignmentStore
) {
  const event = await store.getEventOwner(eventId);
  if (!event) {
    throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
  }
  if (event.organizerId !== organizerId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda hanya dapat mengelola panitia untuk acara milik Anda sendiri (BR-009).'
    );
  }
  return event;
}

export async function listEventStaffForOrganizer(
  eventId: string,
  organizerId: string,
  store: StaffAssignmentStore = defaultStaffStore
) {
  const event = await verifyOrganizerEventOwnership(eventId, organizerId, store);
  const staffList = await store.listAssignedStaff(eventId);

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    staff: staffList.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      role: s.user.role,
      assignedAt: s.assignedAt.toISOString(),
    })),
  };
}

export async function assignStaffToEvent(
  eventId: string,
  organizerId: string,
  rawInput: unknown,
  store: StaffAssignmentStore = defaultStaffStore
) {
  const input = assignStaffSchema.parse(rawInput);
  await verifyOrganizerEventOwnership(eventId, organizerId, store);

  const user = await store.findUserByEmail(input.email);
  if (!user) {
    throw new AppError(
      'NOT_FOUND',
      `Pengguna dengan email "${input.email}" belum terdaftar di Mozapass.`
    );
  }

  const existing = await store.findExistingAssignment(eventId, user.id);
  if (existing) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Pengguna "${user.email}" sudah terdaftar sebagai panitia di acara ini.`
    );
  }

  const created = await store.createAssignmentAndPromoteRoleIfNeeded({
    eventId,
    userId: user.id,
    assignedById: organizerId,
    currentRole: user.role,
  });

  logger.info('STAFF_ASSIGNED', 'Staff assigned to event scanner', {
    eventId,
    staffUserId: user.id,
    assignedById: organizerId,
  });

  return {
    id: created.id,
    userId: created.userId,
    name: created.user.name,
    email: created.user.email,
    role: created.user.role,
    assignedAt: created.assignedAt.toISOString(),
  };
}

export async function removeStaffFromEvent(
  eventId: string,
  organizerId: string,
  rawInput: unknown,
  store: StaffAssignmentStore = defaultStaffStore
) {
  const input = removeStaffSchema.parse(rawInput);
  await verifyOrganizerEventOwnership(eventId, organizerId, store);

  const removed = await store.deleteAssignment(eventId, input.userId);
  if (!removed) {
    throw new AppError(
      'NOT_FOUND',
      'Penugasan panitia tidak ditemukan pada acara ini.'
    );
  }

  logger.info('STAFF_REMOVED', 'Staff removed from event scanner', {
    eventId,
    staffUserId: input.userId,
    removedById: organizerId,
  });

  return {
    eventId,
    userId: input.userId,
    removed: true,
  };
}
