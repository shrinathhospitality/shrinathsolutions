import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';

/** Matches the safe subset api/lib/seo/public_resolve.php returns — null fields mean "no
 *  override saved for this field, use the page's own hardcoded default" (never rendered as a
 *  literal "null" — every consumer treats null as "fall through"). */
export type SeoOverride = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  schema: unknown;
} | null;

type ApiResponse = { success: boolean; override: SeoOverride };

/** Loads the saved SEO Studio override for a static/Venture route, if any. `override: null` in
 *  a successful response is the normal, expected case (no override saved) — never treated as
 *  not-found; this always resolves 'success' with `data: null` rather than 'not-found' or
 *  'error' for that case, since "no override" is not a failure. Only a real network/HTTP
 *  failure produces 'error'. Used identically by the live public page (browser fetch) and the
 *  build-time prerender script (see src/entry-server.tsx). */
export async function loadSeoOverride(routePath: string, opts: LoaderOptions = {}): Promise<LoaderResult<SeoOverride>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/seo-document?route=${encodeURIComponent(routePath)}`, opts);
    if (httpStatus !== 200 || !json?.success) {
      return { status: 'error', data: null, message: 'Request failed' };
    }
    return { status: 'success', data: json.override };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
