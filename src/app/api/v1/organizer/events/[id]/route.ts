import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AppError, handleApiError, okResponse } from '@/lib/errors';
import { assertEventOwnership, updateOrganizerEvent } from '@/services/event.service';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await requireRole(request, ['ORGANIZER']);
    const event = await prisma.event.findUnique({
      where: { id: context.params.id },
      include: {
        categories: { orderBy: { price: 'asc' } },
        staffAssignments: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    if (!event) {
      throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
    }

    assertEventOwnership(event.organizerId, user.id);
    return okResponse(event, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await requireRole(request, ['ORGANIZER']);
    const body: unknown = await request.json();
    const updated = await updateOrganizerEvent(context.params.id, user.id, body);
    return okResponse(updated, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
