import { attachAuthCookie, assertSupportedAppVersion } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import { registerUser } from '@/services/auth.service';

export async function POST(request: Request) {
  try {
    assertSupportedAppVersion(request.headers);
    const body: unknown = await request.json();
    const result = await registerUser(body);
    const response = okResponse(result, undefined, 201);
    return attachAuthCookie(response, result.token);
  } catch (err) {
    return handleApiError(err);
  }
}
