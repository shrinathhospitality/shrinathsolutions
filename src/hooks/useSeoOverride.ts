import { useRouteData } from '../loaders/useRouteData';
import { loadSeoOverride, type SeoOverride } from '../loaders/seoOverrideLoader';

/** Resolves a static/Venture route's saved SEO Studio override — reuses the exact same
 *  embedded-initial-data mechanism dynamic pages use (Phase 3's `useRouteData`/
 *  `consumeInitialData`): synchronous on first render when the prerender script embedded a
 *  result for this route, a real fetch otherwise. No override saved is the normal case and
 *  resolves immediately to `null`, not a loading/error state — callers merge it with a
 *  fallback with a single `override?.field ?? fallback` per field, never blocking render. */
export function useSeoOverride(path: string): SeoOverride {
  const result = useRouteData<SeoOverride>(path, (signal) => loadSeoOverride(path, { signal }));
  if (result === 'loading' || result.status === 'error' || result.status === 'not-found') return null;
  return result.data;
}
