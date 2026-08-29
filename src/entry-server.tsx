// Build-time-only SSR entry point — never shipped to the browser. Built separately via
// `vite build --ssr src/entry-server.tsx --outDir dist-ssr` (see scripts/prerender.mjs), which
// produces a plain-Node-importable bundle. dist-ssr/ is a scratch build artifact: only dist/
// (the normal client build) is ever deployed — see .github/workflows/deploy.yml.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { resetInitialDataCache, serializeInitialData } from './loaders/initialData';
import { loadBlogPost } from './loaders/blogLoader';
import { loadPortfolioProject } from './loaders/portfolioLoader';
import { loadService } from './loaders/serviceLoader';
import { loadSeoPage } from './loaders/seoPageLoader';
import { loadSeoOverride } from './loaders/seoOverrideLoader';
import type { LoaderResult } from './loaders/types';

export type RenderRouteResult = {
  html: string;
  dataStatus: 'static' | 'success' | 'not-found' | 'error';
  errorMessage?: string;
  /** Ready-to-embed <script id="__ROUTE_DATA__"> tag for dynamic routes; null for static ones. */
  initialDataScript: string | null;
};

const RESERVED_SERVICE_SLUGS = new Set([
  'website-designing', 'online-marketing', 'seo-services', 'hotel-digital-marketing', 'channel-manager-hotel-software',
]);

// Mirrors api/lib/route_manifest.php's dynamic_route_sources()/root_catchall_sources() prefix
// shape (not its route *list* — that still comes from the sitemap, see scripts/prerender.mjs)
// just enough to know which loader, if any, a given path needs.
function classify(path: string): { kind: 'static' } | { kind: 'blog' | 'portfolio' | 'service' | 'seo-page'; slug: string } {
  if (path.startsWith('/blog/')) return { kind: 'blog', slug: path.slice('/blog/'.length) };
  if (path.startsWith('/portfolio/')) return { kind: 'portfolio', slug: path.slice('/portfolio/'.length) };
  if (path.startsWith('/services/')) {
    const slug = path.slice('/services/'.length);
    if (RESERVED_SERVICE_SLUGS.has(slug)) return { kind: 'static' };
    return { kind: 'service', slug };
  }
  if (path.startsWith('/our-ventures')) return { kind: 'static' };
  const KNOWN_STATIC = new Set([
    '/', '/about', '/services', '/website-designing', '/online-marketing', '/seo-services',
    '/hotel-digital-marketing', '/channel-manager-hotel-software',
    '/channel-manager-pricing', '/portfolio', '/case-studies', '/blog', '/seo-audit-tool',
    '/contact', '/privacy-policy', '/terms-conditions', '/sitemap',
  ]);
  if (KNOWN_STATIC.has(path)) return { kind: 'static' };
  // '/seo-company-jaisalmer' deliberately falls through to here rather than being in
  // KNOWN_STATIC above: it's real seo_pages content (see SeoCompanyJaisalmer.tsx's own header
  // comment), not a route-only static/venture page — it needs the real 'seo-page' loader
  // (loadSeoPage), not the virtual-content override resolver, exactly like every other
  // seo_pages row reached through the catch-all below. Putting it in KNOWN_STATIC would embed
  // the wrong data shape under this route's __ROUTE_DATA__ key (a SeoOverride object instead of
  // {page, seo, faqs}) — found and fixed during this phase's raw-HTML verification (§11 in
  // docs/SEO_STUDIO_ARCHITECTURE.md Part 5).
  //
  // Anything else is the root-level seo_pages catch-all (single-segment slug).
  return { kind: 'seo-page', slug: path.replace(/^\//, '') };
}

async function renderTwice(path: string): Promise<string> {
  const tree = () => <StaticRouter location={path}><App /></StaticRouter>;
  // Pass 1: renderToString can't await Suspense, so any not-yet-loaded lazy route chunk
  // renders its fallback and (as a side effect) kicks off the dynamic import(). We discard
  // this output entirely. Note: once a given page's chunk has already been warmed by an
  // earlier route in this same process (e.g. two seo-page routes both use DynamicSeoPage),
  // pass 1 mounts the real component too — which would consume consumeInitialData()'s
  // one-time-use global data on this throwaway pass. Reset the cache again right before pass
  // 2 so it always re-reads fresh, regardless of what pass 1 did.
  renderToString(tree());
  await new Promise((resolve) => setTimeout(resolve, 20));
  resetInitialDataCache();
  // Pass 2: every lazy() component reached on pass 1 is now resolved and cached by React
  // internally, so this pass renders the real, final, deterministic markup.
  return renderToString(tree());
}

/** Renders one route to a complete HTML string for its <div id="root"> contents, having
 *  already resolved any dynamic-page data via the same loaders the browser uses. `apiBaseUrl`
 *  is required for dynamic routes (PRERENDER_API_BASE_URL) — see scripts/prerender.mjs. */
export async function renderRoute(path: string, apiBaseUrl: string): Promise<RenderRouteResult> {
  const classified = classify(path);

  if (classified.kind === 'static') {
    // Static/Venture routes have no dedicated content loader (no CMS row), but may have a
    // saved SEO Studio metadata override (api/lib/seo/public_resolve.php) — resolved here the
    // exact same way a dynamic route's content is: fetched once at build time, embedded via
    // the same __ROUTE_DATA__ mechanism, consumed synchronously by useSeoOverride() with zero
    // extra client-side requests on a prerendered page. A fetch failure or "no override saved"
    // (the common case) both degrade to the page's own hardcoded defaults, never a broken page.
    let overrideResult: LoaderResult<unknown> | null = null;
    try {
      const r = await loadSeoOverride(path, { baseUrl: apiBaseUrl });
      if (r.status === 'success') overrideResult = r;
    } catch {
      // Swallow — a static page must never fail to prerender just because the optional
      // metadata-override lookup failed.
    }

    resetInitialDataCache();
    let initialDataScript: string | null = null;
    if (overrideResult) {
      (globalThis as Record<string, unknown>).__PRERENDER_ROUTE_DATA__ = { path, result: overrideResult };
      initialDataScript = serializeInitialData(path, overrideResult);
    }
    try {
      const html = await renderTwice(path);
      return { html, dataStatus: 'static', initialDataScript };
    } finally {
      delete (globalThis as Record<string, unknown>).__PRERENDER_ROUTE_DATA__;
    }
  }

  let result: LoaderResult<unknown>;
  try {
    if (classified.kind === 'blog') result = await loadBlogPost(classified.slug, { baseUrl: apiBaseUrl });
    else if (classified.kind === 'portfolio') result = await loadPortfolioProject(classified.slug, { baseUrl: apiBaseUrl });
    else if (classified.kind === 'service') result = await loadService(classified.slug, { baseUrl: apiBaseUrl });
    else result = await loadSeoPage(classified.slug, { baseUrl: apiBaseUrl });
  } catch (err) {
    return { html: '', dataStatus: 'error', errorMessage: err instanceof Error ? err.message : String(err), initialDataScript: null };
  }

  if (result.status === 'not-found') return { html: '', dataStatus: 'not-found', initialDataScript: null };
  if (result.status === 'error') return { html: '', dataStatus: 'error', errorMessage: result.message, initialDataScript: null };

  resetInitialDataCache();
  (globalThis as Record<string, unknown>).__PRERENDER_ROUTE_DATA__ = { path, result };
  try {
    const html = await renderTwice(path);
    return { html, dataStatus: 'success', initialDataScript: serializeInitialData(path, result) };
  } finally {
    delete (globalThis as Record<string, unknown>).__PRERENDER_ROUTE_DATA__;
  }
}
