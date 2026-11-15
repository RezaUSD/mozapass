import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { reviewOrganizerApplication } from '@/services/organizer-application.service';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(request, ['ADMIN']);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const updated = await reviewOrganizerApplication(admin.id, id, body);
    return okResponse(updated, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
