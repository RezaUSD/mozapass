import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { createOrganizerEvent, listOrganizerEvents } from '@/services/event.service';

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, ['ORGANIZER']);
    const events = await listOrganizerEvents(user.id);
    return okResponse(events, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ['ORGANIZER']);
    const body: unknown = await request.json();
    const created = await createOrganizerEvent(user.id, body);
    return okResponse(created, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
