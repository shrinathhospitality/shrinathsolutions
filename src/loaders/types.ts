// Shared types for the route-data loaders (src/loaders/*Loader.ts). These loaders are used
// from three places: a page component's client-side fetch, React's server-side render during
// the build-time prerender script (scripts/prerender.mjs), and — implicitly — the initial-data
// hydration path (src/loaders/initialData.ts) which skips calling a loader entirely when
// pre-fetched data is already embedded in the page.
//
// Loaders must stay framework- and environment-agnostic: no React imports, no `window`/
// `document` access, so the exact same function works unmodified in the browser and under
// plain Node during the build.

export type LoaderResult<T> =
  | { status: 'success'; data: T }
  | { status: 'not-found'; data: null }
  | { status: 'error'; data: null; message: string };

export type LoaderOptions = {
  /** Aborts the underlying fetch — wire to an AbortController in browser callers. Prerendering
   *  never needs this (each build-time fetch already runs to completion sequentially). */
  signal?: AbortSignal;
  /** Overrides the API base URL. Browser callers never need this — it's for the prerender
   *  script, which has no same-origin relative-URL context to fetch against. */
  baseUrl?: string;
};
