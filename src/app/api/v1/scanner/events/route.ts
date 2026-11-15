import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { listScannerAssignedEvents } from '@/services/ticket.service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['STAFF', 'ORGANIZER']);
    const events = await listScannerAssignedEvents({
      id: user.id,
      role: user.role,
    });
    return okResponse(events);
  } catch (err) {
    return handleApiError(err);
  }
}
