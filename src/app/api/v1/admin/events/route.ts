import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import {
  listEventsForAdminModeration,
  moderateEventByAdmin,
} from '@/services/report.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['ADMIN']);
    const events = await listEventsForAdminModeration();
    return okResponse(events);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole(req, ['ADMIN']);
    const body: unknown = await req.json();
    const updated = await moderateEventByAdmin(admin.id, body);
    return okResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
