import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { getOrganizerDashboardMetrics } from '@/services/report.service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ORGANIZER']);
    const metrics = await getOrganizerDashboardMetrics(user.id);
    return okResponse(metrics);
  } catch (err) {
    return handleApiError(err);
  }
}
