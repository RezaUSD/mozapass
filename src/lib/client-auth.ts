const BEARER_STORAGE_KEY = 'mozapass_bearer_token';

declare global {
  interface Window {
    __mozapassFetchPatched?: boolean;
  }
}

export function saveClientBearerToken(token: string | undefined | null): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    window.localStorage.setItem(BEARER_STORAGE_KEY, token);
  } catch {
    // Abaikan jika storage diblokir
  }
}

export function getClientBearerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(BEARER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearClientBearerToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(BEARER_STORAGE_KEY);
  } catch {
    // Abaikan
  }
}

/**
 * Mengaktifkan header Authorization Bearer otomatis untuk semua request /api/v1/*
 * agar autentikasi tetap berjalan mulus di dalam iframe Mobile Preview maupun APK WebView
 * saat cookie SameSite=Lax diblokir oleh browser.
 */
export function installClientBearerFetch(): void {
  if (typeof window === 'undefined' || window.__mozapassFetchPatched) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.__mozapassFetchPatched = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const isApiCall = urlStr.startsWith('/api/v1/') || urlStr.includes('/api/v1/');
    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const token = getClientBearerToken();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await originalFetch(input, { ...init, headers });

    if (urlStr.includes('/api/v1/auth/logout') && response.ok) {
      clearClientBearerToken();
    }

    return response;
  };
}
