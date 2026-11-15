import type { OrganizerApplicationStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { listOrganizerApplicationsForAdmin } from '@/services/organizer-application.service';

export async function GET(request: Request) {
  try {
    await requireRole(request, ['ADMIN']);
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const validStatus: OrganizerApplicationStatus | undefined =
      rawStatus === 'PENDING' ||
      rawStatus === 'APPROVED' ||
      rawStatus === 'REJECTED'
        ? rawStatus
        : undefined;

    const data = await listOrganizerApplicationsForAdmin(validStatus);
    return okResponse(data, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
