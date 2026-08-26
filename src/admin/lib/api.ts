export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Fetch wrapper for the admin API: sends the session cookie, attaches CSRF on mutations,
 *  and throws ApiError with a safe message on any non-2xx response. */
export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (MUTATING.has(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(path, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Something went wrong.', response.status);
  }

  return data as T;
}
