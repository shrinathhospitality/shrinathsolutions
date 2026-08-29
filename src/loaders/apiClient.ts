import type { LoaderOptions } from './types';

/**
 * Isomorphic fetch wrapper shared by every loader in this folder. In the browser, callers
 * leave `baseUrl` unset and `fetch('/api/...')` resolves relative to the current origin as
 * normal. During the build-time prerender script (scripts/prerender.mjs, plain Node — no
 * same-origin context to resolve a relative URL against), `baseUrl` is required and set to
 * PRERENDER_API_BASE_URL. Never touches `window`/`document`.
 */
export async function fetchJson<T>(
  path: string,
  opts: LoaderOptions = {},
): Promise<{ httpStatus: number; json: T | null }> {
  const url = (opts.baseUrl ?? '') + path;
  const res = await fetch(url, { signal: opts.signal });
  const json = (await res.json().catch(() => null)) as T | null;
  return { httpStatus: res.status, json };
}
