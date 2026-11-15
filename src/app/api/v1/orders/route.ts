import { requireRole } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { createCheckoutOrder, listBuyerOrders } from '@/services/order.service';

export async function GET(request: Request) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const orders = await listBuyerOrders(buyer.id);
    return okResponse(orders, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const buyer = await requireRole(request, ['BUYER']);
    const body: unknown = await request.json();
    const order = await createCheckoutOrder(buyer, body);
    return okResponse(order, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
