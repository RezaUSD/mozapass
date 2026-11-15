import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import {
  assignStaffToEvent,
  listEventStaffForOrganizer,
  removeStaffFromEvent,
} from '@/services/staff.service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(req, ['ORGANIZER']);
    const { id } = await context.params;
    const data = await listEventStaffForOrganizer(id, user.id);
    return okResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(req, ['ORGANIZER']);
    const { id } = await context.params;
    const body: unknown = await req.json();
    const assigned = await assignStaffToEvent(id, user.id, body);
    return okResponse(assigned, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(req, ['ORGANIZER']);
    const { id } = await context.params;
    const body: unknown = await req.json();
    const removed = await removeStaffFromEvent(id, user.id, body);
    return okResponse(removed);
  } catch (err) {
    return handleApiError(err);
  }
}
