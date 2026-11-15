import { NextResponse, type NextRequest } from 'next/server';
import type { TicketStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import {
  buildAttendeesCsv,
  getOrganizerEventAttendees,
} from '@/services/report.service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(req, ['ORGANIZER']);
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const statusParam = searchParams.get('status');
    const format = searchParams.get('format') ?? 'json';

    const validStatuses: TicketStatus[] = ['VALID', 'USED', 'VOID'];
    const status =
      statusParam && validStatuses.includes(statusParam as TicketStatus)
        ? (statusParam as TicketStatus)
        : undefined;

    const data = await getOrganizerEventAttendees(id, user.id, { q, status });

    if (format === 'csv') {
      const csvContent = buildAttendeesCsv(data.attendees);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendees-${data.event.slug}.csv"`,
        },
      });
    }

    return okResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
