import { useEffect, useRef, useState } from 'react';
import { consumeInitialData } from './initialData';
import type { LoaderResult } from './types';

/**
 * Shared client-side data hook for every dynamic-slug page (blog/portfolio/service/seo-page
 * detail). On first mount it synchronously checks for build-time-embedded initial data for the
 * current `path` (see initialData.ts) — if present, that's used immediately with no fetch at
 * all, which is what makes hydration flicker-free on a prerendered route. Otherwise (no
 * embedded data — a route that wasn't prerendered, or a client-side navigation to a new slug)
 * it fetches via `loader` exactly as the old per-page useEffect blocks did.
 */
export function useRouteData<T>(
  path: string,
  loader: (signal: AbortSignal) => Promise<LoaderResult<T>>,
): LoaderResult<T> | 'loading' {
  const [result, setResult] = useState<LoaderResult<T> | 'loading'>(() => consumeInitialData<T>(path) ?? 'loading');
  // Set exactly once, from the lazy useState initializer's own result, and never reassigned
  // afterward — records only "did embedded prerender data already satisfy this exact path at
  // mount," so the effect can skip fetching in that one case. Previously this ref was also
  // *written* inside the effect to mean "already fetched for this path," which broke under
  // React 18 StrictMode's dev-only double-invoke of effects: the first invocation's fetch gets
  // aborted by the synchronous cleanup, that write then made the second (real) invocation skip
  // fetching entirely, and the page was stuck on 'loading' forever. The effect's own `[path]`
  // dependency array already prevents redundant re-fetching when `path` hasn't changed, so
  // nothing inside the effect needs to track that itself.
  const satisfiedByInitialDataFor = useRef<string | null>(result !== 'loading' ? path : null);

  useEffect(() => {
    if (satisfiedByInitialDataFor.current === path) return;

    setResult('loading');
    const controller = new AbortController();
    loader(controller.signal)
      .then((r) => setResult(r))
      .catch((err: unknown) => {
        if (!(err instanceof Error) || err.name !== 'AbortError') {
          setResult({ status: 'error', data: null, message: 'Request failed' });
        }
      });

    return () => controller.abort();
    // `loader` is expected to be a stable per-page function of `path` only (each page passes a
    // fresh closure, but always equivalent for a given path) — re-running on `path` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return result;
}
