import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { listBuyerTickets } from '@/services/ticket.service';

export async function GET(request: Request) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const tickets = await listBuyerTickets(buyer.id);
    return okResponse(tickets, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
