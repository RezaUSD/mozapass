import { requireRole } from '@/lib/auth';
import { AppError, handleApiError, okResponse } from '@/lib/errors';
import { simulateBuyerOrderPayment } from '@/services/order.service';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    if (process.env.ENABLE_PAYMENT_SIMULATOR !== 'true') {
      throw new AppError('NOT_FOUND', 'Endpoint tidak ditemukan.');
    }

    const buyer = await requireRole(request, ['BUYER']);
    const result = await simulateBuyerOrderPayment(context.params.id, buyer.id);
    return okResponse(result, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
