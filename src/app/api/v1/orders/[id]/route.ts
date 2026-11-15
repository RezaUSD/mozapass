import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { getBuyerOrderById } from '@/services/order.service';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const order = await getBuyerOrderById(context.params.id, buyer.id);
    return okResponse(order, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
