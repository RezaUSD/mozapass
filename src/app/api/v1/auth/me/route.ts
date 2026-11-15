import { requireAuth } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return okResponse({ user }, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
