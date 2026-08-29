#!/usr/bin/env node
// Build-time static HTML generator — Node-only, never runs in production (see
// package.json's build:prerender script and SEO_IMPLEMENTATION.md Phase 3). Produces
// dist/{route}/index.html for every route this covers; api/spa-router.php + Apache's default
// static-file handling serve these ahead of the SPA fallback (see .htaccess) with zero
// server-side change needed beyond what Phase 2 already shipped.
//
// Route source: static routes come from the real static_public_routes() PHP function (via
// scripts/print-static-routes.php — no second hand-maintained list). Dynamic slugs (blog,
// portfolio, services, seo-pages) come from the live sitemap.xml, which is itself generated
// from the same published-content DB tables — see api/sitemap.php.
//
// Env vars (see .env.example):
//   PRERENDER_SITE_URL      Origin used both to fetch the route source (sitemap.xml) and as
//                            the base for canonical/OG URLs already baked into Seo.tsx.
//                            Defaults to the real production origin — never localhost.
//   PRERENDER_API_BASE_URL  Origin the dynamic-page loaders fetch against during the build.
//                            Defaults to PRERENDER_SITE_URL (the same public, read-only,
//                            published-content-only API every visitor's browser already
//                            calls — no database connection or credentials needed).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const SSR_ENTRY = path.join(ROOT, 'dist-ssr', 'entry-server.js');

const SITE_URL = (process.env.PRERENDER_SITE_URL || 'https://shrinathsolutions.com').replace(/\/$/, '');
const API_BASE_URL = (process.env.PRERENDER_API_BASE_URL || SITE_URL).replace(/\/$/, '');

const EXCLUDED_PREFIXES = ['/admin', '/api', '/seo-preview'];

function excluded(p) {
  return EXCLUDED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

async function getStaticRoutes() {
  const { execFileSync } = await import('node:child_process');
  const json = execFileSync('php', [path.join(ROOT, 'scripts', 'print-static-routes.php')], { encoding: 'utf8' });
  return JSON.parse(json);
}

async function getDynamicRoutesFromSitemap(staticRoutes) {
  const res = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!res.ok) throw new Error(`Could not fetch ${SITE_URL}/sitemap.xml (HTTP ${res.status})`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = locs.map((u) => u.replace(SITE_URL, '') || '/');
  const staticSet = new Set(staticRoutes);

  return paths.filter((p) => {
    if (p.startsWith('/blog/') || p.startsWith('/portfolio/') || p.startsWith('/services/') || p.startsWith('/our-ventures/')) return true;
    // Root-level single-segment paths not already covered by a fixed static route are the
    // seo_pages catch-all (keyword/location landing pages) — see api/lib/route_manifest.php's
    // root_catchall_sources() for the matching server-side rule.
    if (p === '/' || staticSet.has(p)) return false;
    return p.split('/').filter(Boolean).length === 1;
  });
}

const HEAD_TAG_RUN = /^(?:<title>.*?<\/title>|<meta[^>]*\/>|<link[^>]*\/>)+/;

function splitHeadAndBody(html) {
  const m = html.match(HEAD_TAG_RUN);
  if (!m) return { head: '', body: html };
  return { head: m[0], body: html.slice(m[0].length) };
}

function buildFinalHtml(template, { head, body }, initialDataScript) {
  let html = template.replace(/<title>.*?<\/title>/s, '');
  html = html.replace('</head>', `${head}</head>`);
  html = html.replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${body}</div>${initialDataScript ?? ''}`);
  return html;
}

// Flat `{route}.html` files (not `{route}/index.html` directories) on purpose: a real
// directory would make Apache's default mod_dir DirectorySlash redirect `/about` -> `/about/`
// before serving it, adding an avoidable hop and surfacing a URL that conflicts with this
// site's no-trailing-slash canonical convention (enforced elsewhere in .htaccess). A flat file
// served via the dedicated "prerendered static HTML" rewrite rule keeps the exact URL as-is.
function outputPathFor(routePath) {
  if (routePath === '/') return path.join(DIST, 'index.html');
  return path.join(DIST, `${routePath.replace(/^\//, '')}.html`);
}

async function main() {
  if (!existsSync(SSR_ENTRY)) {
    console.error(`Missing ${SSR_ENTRY} — run "vite build --ssr src/entry-server.tsx --outDir dist-ssr" first (see package.json's build:prerender script).`);
    process.exit(1);
  }
  if (!existsSync(DIST)) {
    console.error(`Missing ${DIST} — run "vite build" first.`);
    process.exit(1);
  }

  const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
  if (!template.includes('<div id="root"></div>')) {
    console.error('dist/index.html is not a pristine Vite build output (already prerendered, or modified) — run "npm run build" again before prerendering. Prerendering twice in a row without a fresh build corrupts the template.');
    process.exit(1);
  }
  const { renderRoute } = await import(`file://${SSR_ENTRY.replace(/\\/g, '/')}`);

  const staticRoutes = (await getStaticRoutes()).filter((p) => !excluded(p));
  let dynamicRoutes = [];
  try {
    dynamicRoutes = (await getDynamicRoutesFromSitemap(staticRoutes)).filter((p) => !excluded(p));
  } catch (err) {
    console.warn(`WARN: could not load dynamic routes from ${SITE_URL}/sitemap.xml (${err.message}). Continuing with static routes only — see SEO_IMPLEMENTATION.md Phase 3 for this fallback.`);
  }

  const routes = [...new Set([...staticRoutes, ...dynamicRoutes])];
  const results = { prerendered: [], skippedNotFound: [], skippedError: [], failedRequired: [] };

  for (const routePath of routes) {
    const isRequiredStatic = staticRoutes.includes(routePath);
    try {
      const r = await renderRoute(routePath, API_BASE_URL);

      if (r.dataStatus === 'not-found') {
        results.skippedNotFound.push(routePath);
        console.log(`SKIP  (not found)  ${routePath}`);
        continue;
      }
      if (r.dataStatus === 'error') {
        console.log(`SKIP  (error)      ${routePath}  ${r.errorMessage ?? ''}`);
        // `reason` is a short, pre-classified label only — never the raw error message, which
        // can contain filesystem paths. The full message stays in this console log (developer-
        // visible build output) but is never written to prerender-report.json or, from there,
        // into the database (apply-prerender-report.php stores exactly this string as the
        // document's safe failure reason — see SEO_STUDIO_ARCHITECTURE.md Part 4).
        if (isRequiredStatic) results.failedRequired.push({ path: routePath, reason: 'render_error' });
        else results.skippedError.push({ path: routePath, reason: 'render_error' });
        continue;
      }

      const out = outputPathFor(routePath);
      await mkdir(path.dirname(out), { recursive: true });
      const html = buildFinalHtml(template, splitHeadAndBody(r.html), r.initialDataScript);
      await writeFile(out, html, 'utf8');
      results.prerendered.push(routePath);
      console.log(`OK    ${routePath}`);
    } catch (err) {
      console.log(`SKIP  (exception)  ${routePath}  ${err.message}`);
      if (isRequiredStatic) results.failedRequired.push({ path: routePath, reason: 'render_exception' });
      else results.skippedError.push({ path: routePath, reason: 'render_exception' });
    }
  }

  console.log('\n--- Prerender summary ---');
  console.log(`Prerendered:        ${results.prerendered.length}`);
  console.log(`Skipped (404):      ${results.skippedNotFound.length}`);
  console.log(`Skipped (error):    ${results.skippedError.length}`);
  console.log(`Failed (required):  ${results.failedRequired.length}`);

  // Closes the prerender lifecycle loop (SEO_STUDIO_ARCHITECTURE.md Part 3 §7): this report
  // lists exactly which routes got real, successfully-rendered HTML this run. It carries no
  // hashes and no database values — `scripts/apply-prerender-report.php` (run server-side,
  // after deploying, never from this Node process) re-derives the current hash itself and
  // only marks a route 'current' if nothing has changed since it was last saved. Written to
  // the project root, deliberately NOT inside dist/ — deploy.yml ships dist/ wholesale, and
  // this file (while not sensitive — it only lists already-public route paths) has no reason
  // to be served publicly.
  // buildId: identifies this one build attempt in the admin's saved-vs-prerendered display and
  // in seo_documents.prerender_build_id — a timestamp-derived value is enough (no coordination
  // between concurrent builds is needed on this project's single-server deploy model).
  const buildId = `build-${Date.now()}`;
  await writeFile(
    path.join(ROOT, 'prerender-report.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      buildId,
      prerendered: results.prerendered,
      failedRequired: results.failedRequired,
      skippedError: results.skippedError,
    }, null, 2),
    'utf8',
  );

  if (results.failedRequired.length > 0) {
    console.error('\nFAILED — one or more required static routes could not be prerendered:');
    for (const f of results.failedRequired) console.error(`  ${f.path}: ${f.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
