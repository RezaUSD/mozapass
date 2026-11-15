import { describe, expect, it } from 'vitest';
import {
  assignStaffToEvent,
  listEventStaffForOrganizer,
  removeStaffFromEvent,
  type StaffAssignmentRecord,
  type StaffAssignmentStore,
} from '@/services/staff.service';

function createInMemoryStaffStore() {
  const event = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Nusantara Indie Soundscape 2026',
    organizerId: 'org-owner-1',
  };

  const users = new Map<
    string,
    { id: string; name: string; email: string; role: 'BUYER' | 'STAFF' | 'ORGANIZER' | 'ADMIN' }
  >([
    [
      'staff@mozapass.local',
      {
        id: '11111111-2222-4333-8444-555555555555',
        name: 'Dimas Panitia Pintu A',
        email: 'staff@mozapass.local',
        role: 'STAFF',
      },
    ],
    [
      'buyer@mozapass.local',
      {
        id: '22222222-3333-4444-8555-666666666666',
        name: 'Ayu Pembeli',
        email: 'buyer@mozapass.local',
        role: 'BUYER',
      },
    ],
  ]);

  const assignments: StaffAssignmentRecord[] = [];

  const store: StaffAssignmentStore = {
    async getEventOwner(eventId) {
      return eventId === event.id ? event : null;
    },
    async listAssignedStaff(eventId) {
      return assignments.filter((a) => a.eventId === eventId);
    },
    async findUserByEmail(email) {
      return users.get(email.toLowerCase()) ?? null;
    },
    async findExistingAssignment(eventId, userId) {
      const found = assignments.find(
        (a) => a.eventId === eventId && a.userId === userId
      );
      return found ? { id: found.id } : null;
    },
    async createAssignmentAndPromoteRoleIfNeeded({
      eventId,
      userId,
      assignedById,
      currentRole,
    }) {
      const targetUser = Array.from(users.values()).find((u) => u.id === userId)!;
      if (currentRole === 'BUYER') {
        targetUser.role = 'STAFF';
      }
      const record: StaffAssignmentRecord = {
        id: `assign-${assignments.length + 1}`,
        eventId,
        userId,
        assignedAt: new Date('2026-11-14T12:00:00.000Z'),
        user: { ...targetUser },
      };
      assignments.push(record);
      return record;
    },
    async deleteAssignment(eventId, userId) {
      const idx = assignments.findIndex(
        (a) => a.eventId === eventId && a.userId === userId
      );
      if (idx === -1) return false;
      assignments.splice(idx, 1);
      return true;
    },
  };

  return { store, event, assignments };
}

describe('Staff Assignment Service (T-501: F-007, BR-009, EP-023)', () => {
  it('mengizinkan ORGANIZER pemilik acara menugaskan panitia, mencegah duplikat, dan mencabut aksesnya', async () => {
    const { store, event } = createInMemoryStaffStore();

    const assigned = await assignStaffToEvent(
      event.id,
      'org-owner-1',
      { email: 'staff@mozapass.local' },
      store
    );
    expect(assigned.email).toBe('staff@mozapass.local');

    // Penugasan duplikat wajib ditolak
    await expect(
      assignStaffToEvent(
        event.id,
        'org-owner-1',
        { email: 'staff@mozapass.local' },
        store
      )
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });

    const listBefore = await listEventStaffForOrganizer(event.id, 'org-owner-1', store);
    expect(listBefore.staff).toHaveLength(1);

    // Cabut akses
    const removed = await removeStaffFromEvent(
      event.id,
      'org-owner-1',
      { userId: assigned.userId },
      store
    );
    expect(removed.removed).toBe(true);

    const listAfter = await listEventStaffForOrganizer(event.id, 'org-owner-1', store);
    expect(listAfter.staff).toHaveLength(0);
  });

  it('menolak ORGANIZER lain yang bukan pemilik acara dengan 403 FORBIDDEN_OWNERSHIP', async () => {
    const { store, event } = createInMemoryStaffStore();

    await expect(
      assignStaffToEvent(
        event.id,
        'other-organizer-id',
        { email: 'staff@mozapass.local' },
        store
      )
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_OWNERSHIP',
      statusCode: 403,
    });
  });
});
