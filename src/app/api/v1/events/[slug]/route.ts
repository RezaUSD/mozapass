import { assertSupportedAppVersion } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { getPublicEventBySlug } from '@/services/event.service';
import { releaseExpiredOrders } from '@/services/expiration.service';

export async function GET(
  request: Request,
  context: { params: { slug: string } }
) {
  try {
    assertSupportedAppVersion(request.headers);
    await releaseExpiredOrders();

    const event = await getPublicEventBySlug(context.params.slug);
    return okResponse(event, undefined, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
