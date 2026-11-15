import { attachAuthCookie, assertSupportedAppVersion } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { assertRateLimit } from '@/lib/rate-limit';
import { loginUser } from '@/services/auth.service';

export async function POST(request: Request) {
  try {
    assertSupportedAppVersion(request.headers);
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    assertRateLimit(`login:${clientIp}`, 15, 60_000);

    const body: unknown = await request.json();
    const result = await loginUser(body);
    const response = okResponse(result, undefined, 200);
    return attachAuthCookie(response, result.token);
  } catch (err) {
    return handleApiError(err);
  }
}
