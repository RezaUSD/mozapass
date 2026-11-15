import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { scannerCheckInSchema } from '@/schemas/scanner.schema';
import { checkInTicketAtVenue } from '@/services/ticket.service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['STAFF', 'ORGANIZER']);
    const body: unknown = await req.json();
    const parsed = scannerCheckInSchema.parse(body);

    const result = await checkInTicketAtVenue(
      {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      parsed
    );

    return okResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}
