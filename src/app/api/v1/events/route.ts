import { assertSupportedAppVersion } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { listPublicEvents } from '@/services/event.service';
import { releaseExpiredOrders } from '@/services/expiration.service';

export async function GET(request: Request) {
  try {
    assertSupportedAppVersion(request.headers);
    await releaseExpiredOrders();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? undefined;
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '12');

    const result = await listPublicEvents({ q, page, limit });
    return okResponse(result.items, result.meta, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
