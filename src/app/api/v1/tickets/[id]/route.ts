import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { getBuyerTicketById } from '@/services/ticket.service';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const ticket = await getBuyerTicketById(context.params.id, buyer.id);
    return okResponse(ticket, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
