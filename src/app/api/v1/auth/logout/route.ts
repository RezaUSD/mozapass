import { clearAuthCookie } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';

export async function POST() {
  try {
    const response = okResponse({ message: 'Berhasil keluar dari sesi.' }, undefined, 200);
    return clearAuthCookie(response);
  } catch (err) {
    return handleApiError(err);
  }
}
