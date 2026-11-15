import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { resendBuyerTicketEmail } from '@/services/ticket.service';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const result = await resendBuyerTicketEmail(context.params.id, buyer.id);
    return okResponse(result, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
