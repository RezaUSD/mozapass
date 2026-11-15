import { attachAuthCookie, requireRole, signAuthToken } from '@/lib/auth';
import { handleApiError, okResponse } from '@/lib/errors';
import {
  getMyOrganizerApplication,
  submitOrganizerApplication,
} from '@/services/organizer-application.service';

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, ['BUYER', 'ORGANIZER']);
    const data = await getMyOrganizerApplication(user.id);
    const response = okResponse(data, undefined, 200);

    // Jika Admin baru saja menyetujui upgrade menjadi ORGANIZER, segarkan cookie JWT otomatis
    if (data.currentRole !== user.role) {
      const refreshedToken = await signAuthToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: data.currentRole,
      });
      return attachAuthCookie(response, refreshedToken);
    }

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ['BUYER']);
    const body: unknown = await request.json();
    const application = await submitOrganizerApplication(user.id, body);
    return okResponse(application, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
