import type { LoaderResult } from './types';

// Build-time-prerendered pages embed a single <script type="application/json" id="__ROUTE_DATA__">
// tag containing { path, result } — the exact LoaderResult already computed during the build,
// for the exact route the page was prerendered as. Reading it on first client render avoids
// duplicate fetching (see useRouteData.ts): the browser reuses the build-time result instead of
// re-requesting the same data it can already see in the page.
//
// Deliberately framework-agnostic (no React) and DOM-read-only — this file has no write path
// into the DOM other than removing the tag once consumed.

type Envelope = { path: string; result: LoaderResult<unknown> };

let cache: Envelope | null | undefined;

function readEmbedded(): Envelope | null {
  if (cache !== undefined) return cache;

  if (typeof document !== 'undefined') {
    const el = document.getElementById('__ROUTE_DATA__');
    if (el?.textContent) {
      try {
        cache = JSON.parse(el.textContent) as Envelope;
        return cache;
      } catch {
        cache = null;
        return cache;
      }
    }
    cache = null;
    return cache;
  }

  // No `document` means this is running under Node (the build-time prerender script, via
  // src/entry-server.tsx) rather than a browser — read the equivalent value set directly on
  // `globalThis` instead of a DOM script tag. Never present in the shipped browser bundle.
  const globalData = (globalThis as Record<string, unknown>).__PRERENDER_ROUTE_DATA__;
  cache = (globalData as Envelope | undefined) ?? null;
  return cache;
}

/** Build-time only: call before rendering a new route in the same Node process, so a
 *  previous route's already-consumed (or unconsumed) data can never leak into the next one. */
export function resetInitialDataCache(): void {
  cache = undefined;
}

/** Returns the embedded result for `path` exactly once — a second call (e.g. the user
 *  navigates away and back to the same path) returns null, so the page correctly re-fetches
 *  live data instead of reusing a build-time snapshot indefinitely. */
export function consumeInitialData<T>(path: string): LoaderResult<T> | null {
  const embedded = readEmbedded();
  if (!embedded || embedded.path !== path) return null;
  cache = null;
  if (typeof document !== 'undefined') document.getElementById('__ROUTE_DATA__')?.remove();
  return embedded.result as LoaderResult<T>;
}

/** Build-time only (called from scripts/prerender.mjs, plain Node — never imported by app
 *  code that ships to the browser). Escapes '<', '>' and '&' so the JSON payload can never
 *  prematurely close the surrounding <script> tag or be misinterpreted as markup, regardless
 *  of what characters appear in CMS-authored content. */
export function serializeInitialData(path: string, result: LoaderResult<unknown>): string {
  const json = JSON.stringify({ path, result });
  const escaped = json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/json" id="__ROUTE_DATA__">${escaped}</script>`;
}
