import { handleApiError, okResponse } from '@/lib/errors';
import { processMidtransWebhook } from '@/services/payment.service';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = await processMidtransWebhook(body);
    return okResponse(result, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
