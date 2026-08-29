# SEO Implementation — Shrinath Solutions

Working notes from the production SEO pass. Read alongside `DEPLOYMENT.md` (hosting/deploy)
and `DATABASE_SETUP.md`. This file documents what changed, why, and what's still a manual step
for the site owner — it isn't a report of promised rankings.

## 1. Architecture found

- **Framework**: Vite + React 19 SPA, react-router-dom, PHP/MySQL backend under `api/`.
- **Metadata**: a single hand-rolled `src/components/Seo.tsx` (not react-helmet — that package
  silently drops everything but `<title>` under React 19; confirmed by testing). Renders
  `<title>`/`<meta>`/`<link>`/`<script>` directly, relying on React 19's native head-hoisting.
  Already wired into every page before this pass — the gap was in what it could express, not
  whether it existed.
- **Sitemap**: `api/sitemap.php`, dynamic, DB-backed, file-cached for 1 hour. Already existed
  and was already solid (published-only content, genuine `lastmod`) — just missing the newer
  static routes (SEO Audit Tool, Our Ventures) added in a later session.
- **Redirects**: an admin-managed redirect table already exists (`AdminRedirects`,
  `/api/public/redirects/lookup`), consulted client-side by `NotFound.tsx` before showing a
  real 404. This is a soft (JS-driven) redirect layer; the `.htaccess` changes below add a
  real-301 layer in front of it for known URL *shapes*.

## 2. Route inventory (indexable vs not)

| Route | Type | Index? | Primary intent |
|---|---|---|---|
| `/` | Static | index | Web development & digital growth company, Jaisalmer |
| `/about` | Static | index | Company/team |
| `/services` | Static | index | Services overview / hub |
| `/website-designing` | Static | index | Website designer in Jaisalmer |
| `/online-marketing` | Static | index | Digital marketing agency in Jaisalmer |
| `/seo-services` | Static | index | **Retargeted** — SEO services (process/deliverables), see §3 |
| `/seo-company-jaisalmer` | Static | index | SEO company in Jaisalmer (local/brand landing page) |
| `/hotel-digital-marketing` | Static | index | Hotel marketing company |
| `/channel-manager-hotel-software` | Static | index | Channel manager for hotels |
| `/channel-manager-pricing` | Static | index | Pricing |
| `/portfolio` | Static | index | Portfolio hub |
| `/portfolio/:slug` | Dynamic (DB) | index | Individual case study |
| `/case-studies` | Static | index | Case study |
| `/blog` | Static | index | Blog hub |
| `/blog/:slug` | Dynamic (DB) | index | Individual article |
| `/services/:slug` | Dynamic (DB) | index | CMS-authored service pages |
| `/:slug` (catch-all) | Dynamic (DB, seo_pages) | index | Keyword/location landing pages |
| `/seo-audit-tool` | Static | index | Free tool landing page (no separate result URL exists — see §7) |
| `/our-ventures` | Static | index | Group overview |
| `/our-ventures/:slug` (9 routes) | Static | index | Individual venture |
| `/contact` | Static | index | Contact |
| `/pricing` alias / `/channel-manager-pricing` | Static | index | — |
| `/sitemap` (HTML) | Static | index | Human-readable sitemap |
| `/privacy-policy`, `/terms-conditions` | Static | index (low priority) | Legal |
| `/seo-preview/seo-company-jaisalmer` | Static (sample data) | **noindex** (fixed this pass) | Demo/preview only, never real content |
| `/admin/*` | React app, separate tree | **noindex** (robots.txt + not in sitemap) | Internal CMS |
| `/api/*` | Backend | **disallowed** except `/api/uploads/` (real images) | n/a |

Nothing found that needed outright removal — no dead/duplicate route pairs beyond the
`/seo-services` vs `/seo-company-jaisalmer` keyword overlap (fixed, see §3), and no old
WordPress route survivals inside the current React router (this app was never WordPress; the
legacy-URL handling in §4 is defensive for whatever Google may still hold from before this
domain ran this app).

## 3. Keyword-cannibalization fix

**Found**: `/seo-services` and `/seo-company-jaisalmer` both title-targeted "SEO Company in
Jaisalmer" — same primary keyword, two indexable pages, competing against each other.

**Fixed**, without deleting or merging either page (both have genuine, non-thin, distinct
content — a service/process page vs. a local-brand landing page):

- `/seo-company-jaisalmer` keeps the local/brand angle: *"SEO Company in Jaisalmer"*.
- `/seo-services` retargeted to the service/process angle: *"SEO Services in Jaisalmer &
  Rajasthan | Technical, Local & Content SEO"* — new H1, new meta description, no more exact
  keyword duplication.
- Cross-linked both directions: `/seo-services`' related-links now include "SEO Company in
  Jaisalmer"; `/seo-company-jaisalmer`'s breadcrumb already linked back to `/seo-services`.

No other exact-duplicate primary-keyword pairs were found across the current route set.

## 4. Legacy-URL / redirect map

No historical Search Console export or old URL list was available to audit. What's implemented
in `.htaccess` is **structural, not URL-specific** — safe redirects for common WordPress-era
*path shapes* that this domain may still have indexed from before, without guessing at specific
old permalinks:

| Old path shape | New destination | Status | Reason |
|---|---|---|---|
| `/wp-admin*`, `/wp-login*`, `/wp-includes*`, `/wp-content*`, `/wp-json*`, `/xmlrpc.php` | — | **410 Gone** | Never had public content of their own; 410 tells Google not to expect a replacement |
| `/feed/`, `?feed=*` | — | **410 Gone** | RSS feeds don't exist on this app |
| `/category/*` | `/blog` | **301** | Category archive content is best represented by the current blog index |
| `/tag/*` | `/blog` | **301** | Same reasoning |
| `/author/*` | `/blog` | **301** | Same reasoning |
| `/blog-list/` (a plausible old blog-index URL) | `/blog` | **301** | Direct equivalent |
| any URL with a trailing slash | same URL, no trailing slash | **301** | Canonicalizes to the one convention the app already uses everywhere |
| `/index.html` | `/` | **301** | Prevents a duplicate homepage URL |
| `www.shrinathsolutions.com/*` | `shrinathsolutions.com/*` | **301** | Canonical host is non-www everywhere in the app (`src/data/site.ts`) |
| `http://*` | `https://*` | **301** | Force HTTPS |

**Manual follow-up for the owner**: pull the *actual* list of old indexed URLs from Google
Search Console → Indexing → Pages (and/or old analytics/server logs if available) and add exact
301 mappings for anything with real residual value, using the admin's existing Redirects screen
(`/admin/redirects`) — that system already exists and doesn't need new code, just data entry.

All redirect rules were checked by hand for chains (none — each rule is a single hop to a final
destination) and loops (none — no rule's destination can re-trigger an earlier rule in the same
file).

## 5. Metadata system changes (`src/components/Seo.tsx`)

Added, none of it removing existing behaviour:

- `robots` prop (defaults to `index, follow`) — previously there was no way to noindex a page
  without hand-writing a raw `<meta>` tag per call site.
- `image` (OG/Twitter image), `type` (`website` | `article`), `publishedTime`,
  `modifiedTime`, `author` — for proper article social cards and dates.
- `og:site_name` added (was missing).
- New schema helpers: `websiteSchema` (deduplicated — Home.tsx previously defined its own
  inline copy), `serviceSchema`, `articleSchema`.
- **Known gap, documented rather than faked**: there is no branded default Open Graph image
  (1200×630) anywhere in the project, and this session has no image-generation/design tool
  available to produce one safely. `Seo.tsx` supports `image` per-page but does **not** default
  to a hardcoded path, to avoid shipping a broken `og:image` link. **Manual step**: design a
  1200×630 branded image, save it under `public/`, and either pass it explicitly on high-value
  pages (Home, service hubs) or wire a sitewide default into `Seo.tsx` once it exists.

## 6. Structured data

- Deduplicated: `Organization`/`WebSite` schema was defined identically in two places
  (`Seo.tsx` and inline in `Home.tsx`); Home now imports the shared one.
- `BlogDetail.tsx` upgraded from a hand-rolled inline `BlogPosting` block to the new
  `articleSchema()` helper — adds `mainEntityOfPage` and stays ready for `dateModified`/`image`
  once those fields exist on the blog API response (they don't currently — nothing was
  fabricated).
- `FAQPage` schema already correctly only fires when real FAQ content is present (existing
  behaviour, verified not touched).
- No fake `AggregateRating`, `Review`, prices, or award schema found or added anywhere.

## 7. SEO Audit Tool page (spec §24)

Verified there is **no separate result URL** — `/seo-audit-tool` is a single route; results
render into the same page via client state after a POST to `/api/seo-toolkit/audits`, with no
URL or history change. This means there's no indexable "result" URL exposing a visitor's
submitted site to crawl in the first place — the concern the spec raises doesn't apply to this
implementation as built. The tool landing page itself stays indexable (useful public content:
description of what it checks). The PDF report endpoint and the audits API are both under
`/api/`, already disallowed in `robots.txt`.

## 8. SPA rendering / prerendering (spec §6)

**Not implemented, documented per the spec's own "if not technically possible" allowance.**
Every dynamic route (`/blog/:slug`, `/services/:slug`, `/:slug`, `/portfolio/:slug`) fetches its
content from a live PHP/MySQL API at request time — there is no static/known dataset available
at `npm run build` time (the build runs in CI with no database connection). Genuine build-time
prerendering of these routes would require either (a) a database connection available during
CI build — a meaningful infrastructure change outside this pass's scope, or (b) a second
runtime crawl-and-snapshot step (e.g. a headless-browser prerendering service), which is a new
moving part with its own maintenance cost that this pass didn't add without being asked to.

**Fallback actually in place**: React 19's native head-hoisting means `<title>`, meta tags, and
JSON-LD are present as soon as the relevant `<Seo>` component renders — no client-only portal
or deferred-mount trick delays them further than the data fetch itself already does. Modern
Googlebot renders JavaScript and has been documented (by Google) to wait for network-idle
before indexing, so this is a reasonable, honest fallback — not equivalent to true SSR, but not
blind either. The stale-metadata gap that *did* exist (previous page's title/meta lingering
during a loading spinner) is now fixed — see §9.

**Static routes** (everything not listed above) already ship their full HTML content and
metadata in the client-rendered output with no data-fetch delay, which is the closest this
architecture gets to "prerendered" without adding new build tooling.

## 9. Stale-metadata fix

Found and fixed: `DynamicSeoPage`, `DynamicServicePage`, `BlogDetail`, and
`DynamicPortfolioPage` all rendered `null` (or a bare loading `<div>`) while fetching — meaning
the *previous* route's `<title>`/meta/JSON-LD tags remained in the document head until data
arrived, since nothing new was rendered to replace them. All four now render a neutral
`noindex, follow` `<Seo>` call immediately during the loading phase, so there's never a window
where a page shows someone else's metadata.

## 10. robots.txt

Rewritten from a blanket `Allow: /` to:

```
Disallow: /admin, /admin/          — CMS, never public
Disallow: /api/admin, /api/public, /api/seo-toolkit/audits, /api/index.php, /api/health.php
Allow: /api/uploads/               — real uploaded images, referenced directly via <img src>
Sitemap: https://shrinathsolutions.com/sitemap.xml
```

Caught and avoided a real mistake mid-implementation: an earlier draft disallowed all of
`/api/` uniformly, which would have also blocked crawlers from every portfolio/blog image
(served from `/api/uploads/...`). Fixed before finalizing.

## 11. Sitemap fix

`api/sitemap.php`'s static-route list predates the Our Ventures feature and the SEO Audit Tool
page — both were missing. Added: `/seo-audit-tool`, `/our-ventures`, and all 9
`/our-ventures/:slug` routes. The dynamic (DB-backed) portion — services, seo_pages, blog_posts,
portfolio_projects, all filtered to `status = 'published'` with genuine `lastmod` from
`updated_at` — was already correct and untouched.

## 12. Image SEO

Spot-checked hero/service/blog image components. `ServiceHero`/`ServiceAbout` already use
descriptive `alt={h1}`/`alt={heading}` (the page's own heading text) rather than generic
filenames, and `loading="lazy"` on below-fold images vs `loading="eager"` on the hero image —
already correct, not changed. `BlogThumb`/portfolio placeholders are CSS+icon panels (no real
photography exists yet per the project's own prior documentation), so there's no `<img>` alt
text to fix there — the icons are already `aria-hidden`. No fake/placeholder alt text like
"image123.jpg" or empty alt on meaningful images was found.

## 13. Redirect/robots/sitemap safety checks performed

- Confirmed `/sitemap.xml`, `robots.txt`, `/api/*`, and real static assets are excluded from the
  SPA catch-all fallback in `.htaccess` (pre-existing rule ordering — verified, not changed).
- Confirmed no redirect rule in the new `.htaccess` block can loop (each targets a fixed final
  path, none of which match an earlier rule's trigger pattern).
- Confirmed the new trailing-slash-strip rule excludes `/api/` so it can never interfere with
  backend routing.

## 14. What was deliberately *not* done

- **No mass location-page generation.** The spec explicitly warns against doorway/city-clone
  pages; none were created. The existing `seo_pages` city/keyword pages (built in an earlier
  session) already have genuinely distinct, non-templated content per page.
- **No fabricated testimonials, ratings, awards, employee counts, or guaranteed-ranking
  language** — none existed before this pass, none were added.
- **No new analytics wired up** — see §15. Nothing was configured before this pass; inventing a
  Measurement ID would violate the spec's own instruction not to.
- **No true build-time prerendering** — see §8.
- **No server-side true-404 status codes for the SPA catch-all** — see §16 (Known limitations).

## 15. Analytics — current state

**No analytics implementation exists anywhere in the project** (no `gtag`, no GTM container, no
Measurement ID in `index.html` or anywhere in `src/`). This session did not invent one. Manual
setup checklist below.

### Manual: Google Analytics 4
1. Create a GA4 property for `shrinathsolutions.com` in Google Analytics.
2. Add the GA4 tag (via Google Tag Manager, recommended, or the gtag.js snippet directly) to
   `index.html` — outside the scope of this pass since it requires a real Measurement ID.
3. Define conversions: contact form submit, growth-audit form submit, proposal CTA click, phone
   click, WhatsApp click, email click, portfolio enquiry, pricing enquiry, SEO tool start, PDF
   report download. Event *names* to use consistently once GA4 exists: `contact_submit`,
   `audit_form_submit`, `proposal_cta_click`, `phone_click`, `whatsapp_click`, `email_click`,
   `portfolio_enquiry`, `pricing_enquiry`, `seo_tool_start`, `seo_report_download`. Never send
   the submitted name/phone/email/message as event parameters.

### Manual: Google Search Console
1. Verify `https://shrinathsolutions.com` (HTTPS, non-www — the canonical host).
2. Submit `https://shrinathsolutions.com/sitemap.xml`.
3. Use URL Inspection on the homepage and each priority service page to confirm they're
   indexed and match the live-rendered content.
4. Check **Page Indexing** for any of the legacy WordPress-shaped URLs from §4 still showing as
   indexed — request removal only after the 410/301 rules have been live long enough for Google
   to recrawl them (don't request removal on day one).
5. Check **Duplicate, Google chose different canonical** warnings, specifically around
   `/seo-services` vs `/seo-company-jaisalmer` post-fix.
6. Check Core Web Vitals report after the site has real field data (CrUX needs real traffic).
7. Monitor Enhancements → structured data for any schema errors on Article/Service/FAQPage/
   BreadcrumbList.
8. Compare branded ("shrinath solutions") vs non-branded query performance over time.
9. Do **not** use Request Indexing on every low-value URL — reserve it for genuinely new or
   significantly updated priority pages.

### Manual: Bing Webmaster Tools
1. Verify the domain (can import directly from a verified GSC property).
2. Submit the same sitemap URL.

## 16. Known limitations

- **SPA fallback always returns HTTP 200**, even for a genuinely unknown path (Apache serves
  `index.html`, then the React `NotFound` component decides client-side whether the route is
  real). This is the standard tradeoff for a client-routed SPA on shared Apache hosting without
  a build-time-known route list mapped to real files. A true fix (Apache `ErrorDocument 404`
  preserving status) was evaluated and rejected here because it can't distinguish "unknown path"
  from "valid client-side route" at the server level without also breaking direct-refresh on
  every legitimate deep link — a functional regression worse than the soft-404 SEO cost. `robots
  meta noindex` is already correctly set on the client-rendered 404 page as a mitigation.
- **No default OG image** — see §5.
- **No analytics configured** — see §15.
- **No true prerendering** — see §8.

None of these block indexing or crawling of real content; they're documented tradeoffs, not
silent gaps.

## 17. Manual: Google Business Profile checklist

(Nothing here was or can be changed automatically — GBP has no API wired into this project, and
the spec explicitly says not to touch it programmatically.)

- [ ] Primary category set correctly (e.g. "Website designer" or "Marketing agency" — pick the
      one closest to primary revenue, not "Internet company").
- [ ] Secondary categories added for SEO agency, digital marketing agency, hotel consultant, as
      applicable.
- [ ] Business description written (no keyword stuffing) matching the site's actual services.
- [ ] Services list matches what's actually on the site.
- [ ] Logo and cover photo uploaded, correct aspect ratios.
- [ ] Real photos of the team/office/work added.
- [ ] Opening hours set and accurate.
- [ ] Phone number and website URL match the site's NAP exactly (`+91 94615 31536`,
      `shrinathsolutions.com`).
- [ ] Website link uses a UTM (`?utm_source=gbp&utm_medium=organic&utm_campaign=profile`) so GA4
      can attribute GBP traffic once analytics is live.
- [ ] Process for responding to reviews within a few days.
- [ ] Cadence for genuine GBP posts (offers, updates) — not automated, not fabricated.

## 18. NAP consistency (verified in code)

Confirmed a single source of truth: `src/data/site.ts` —
`Shrinath Solutions · Jaisalmer, Rajasthan, India · +91 94615 31536 · shrinathsolutions@gmail.com`
— consumed by Header, Footer, Contact, and `orgSchema`. No conflicting phone/email/address
strings found elsewhere in the codebase. `tel:`/`mailto:` links already correctly formatted
throughout (pre-existing, verified not changed).

---

# Phase 2 — Verification, crawlability, indexing migration, performance

Builds on Phase 1 above (still accurate) rather than repeating it. Everything below was
re-verified by reading the actual code, not assumed from the Phase 1 notes.

## 19. Audit-verification of Phase 1 claims

Re-inspected before changing anything:

- `src/main.tsx` — confirmed `createRoot(...).render(...)`, not `hydrateRoot`. No hydration is
  ever attempted client-side, which is what makes the prerendering approach in §27 safe: an
  injected static HTML shell would simply be replaced by the client render, so there's no
  hydration-mismatch class of bug to worry about if prerendering is added later.
- `api/index.php` — confirmed its `match_route()` dispatch loop already calls
  `json_error('Not found', 404)` (real JSON, real 404 status) for any unmatched `/api/*` route.
  No change was needed here — this requirement was already satisfied by earlier work.
- `api/sitemap.php`, `robots.txt`, `.htaccess`, the redirect-lookup system, `NotFound.tsx`,
  `vite.config.ts` — re-read in full; Phase 1's descriptions of all of these held up. The one
  real gap found was the soft-404 behaviour flagged in Phase 1 §16, which §21 below now fixes.

## 20. Route manifest (`api/lib/route_manifest.php`)

New single source of truth for "what paths does this app actually serve", used by both
`api/sitemap.php` (URL list) and the new true-404 router (§21) — replacing sitemap.php's
previously separate hardcoded static-route array, so the two can no longer drift apart.

- `static_public_routes()` — the fixed route list (mirrors `src/App.tsx`'s static routes).
- `dynamic_route_sources()` / `root_catchall_sources()` — maps `/blog/:slug`, `/portfolio/:slug`,
  `/services/:slug`, and the root-level `pages`/`seo_pages` catch-all to their DB tables.
- `is_known_public_route($pdo, $path)` — true if `$path` is a static route or a published row
  (`status = 'published'`) in one of those tables. Draft/private rows correctly return false —
  nothing about this exposes draft content, admin routes, audit IDs, or competitor audit
  results; it only answers a yes/no membership question against public content.
- `is_known_public_route_cached()` — file-cached wrapper (1-hour TTL, same pattern as the
  existing sitemap cache), atomic write via tmp-file + rename, corrupt/unreadable cache treated
  as empty and recomputed rather than fatal.

## 21. True HTTP 404s (`api/spa-router.php` + `.htaccess`)

The SPA fallback in `.htaccess` previously rewrote every non-file, non-`/api/` request straight
to `index.html` with an implicit 200, including genuinely nonexistent paths. It now rewrites to
`api/spa-router.php`, which normalizes/bounds-checks the path, looks up the cached manifest, and
calls `http_response_code(404)` for unknown paths before serving `index.html` either way — so
`NotFound.tsx` (already correctly noindex) still renders visually the same, only the transport
status code changed. It fails open (serves 200) if the DB is unreachable rather than 404-ing
every route during a transient outage.

Real deep links are unaffected — known static routes and published blog/portfolio/service/page
rows all resolve `known = true` and keep working exactly as before.

This directly supersedes the Phase 1 §16 note that a true-404 fix was "evaluated and rejected" —
that was correct against the options considered then (Apache alone can't distinguish "unknown
path" from "valid client route"), but routing through PHP with a real membership check resolves
that exact ambiguity.

Verification: `php -l` clean on both new files. Behavioral verification (real 404 status
headers, cache file creation) needs the actual Apache+PHP stack and can't be exercised from the
Vite dev server — see `scripts/test-redirects.mjs` (§24).

## 22. Legacy-URL redirect narrowing

Per instruction not to blanket-redirect archive-shaped URLs without evidence of matching content
intent, `.htaccess`'s `/category/*`, `/tag/*`, `/author/*` rules changed from `301 → /blog` to
`410 Gone`. These were WordPress listing pages (multiple unrelated posts per archive); a blanket
301 to the single `/blog` index would consolidate unrelated ranking signal onto a page that
doesn't represent the same content. `/blog-list/` stays a 301 to `/blog` since that's a plausible
old-theme alias for the same index content, not an archive.

No GSC/Analytics export was available to check for specific high-value archive URLs. If the site
owner provides a real export (see §23), any URL shown to carry real clicks/impressions should get
an exact 301 mapping added above this block rather than the rule being widened back.

## 23. Old-URL migration workflow

Not implemented as an automated importer this pass — a general CSV/GSC-export parser with a
recommendation engine (301 vs 410 vs manual-review) is a substantial standalone feature, and no
real export file was provided to build and test it against. When a real GSC export (URL, Clicks,
Impressions, Last crawled, Status, Referring pages CSV) is available, share it and this can be
built as a one-off analysis script rather than permanent app code, since it only needs to run
once per migration event.

## 24. Redirect test script (`scripts/test-redirects.mjs`)

`npm run test:redirects -- https://shrinathsolutions.com` exercises 18 scenarios (host/https
canonicalization, trailing-slash strip, index.html collapse, WP-era 410s, category/tag/author
410s, blog-list 301, sitemap.xml, a known static route, a true 404 for an unknown path, a true
404 for an unknown blog slug, a JSON 404 for an unknown API route) via `fetch(..., {redirect:
'manual'})`, printing input/expected/actual status + Location per case.

This only tests real Apache/PHP behavior, so it cannot run against the Vite dev server or `vite
preview` — both skip `.htaccess` entirely. It has not been run against production in this pass
(would require deploying first, which this phase's instructions forbid); run it once after the
next deploy to confirm all 18 pass.

## 25. Branded default OG image

`public/og-image.svg` (editable source, 1200×630) + `public/og-image.png` (rendered), wired as
`Seo.tsx`'s default `image` — resolving the "no default OG image" gap flagged in Phase 1 §16.
Built from verified, already-approved brand elements only: the exact gradient badge used by the
Header logo fallback (`linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)`) and the real
light/hybrid theme token colors (`--color-page #f7f9fc`, `--color-heading #0b1739`,
`--color-body #475569`, `--color-primary`/`--color-primary-dark`, `--color-accent #ff7a3d`).
Copy is the site name, the existing homepage tagline ("Websites, Marketing & Hotel Technology"),
the requested "We Deliver Your Needs" line, and the real domain — no stock photography, no
invented stats. Rendered with `sharp`, installed temporarily via `npm install --no-save`, used
once, then removed — it is not a project dependency. Regenerate later by reinstalling it the
same way and running it once against the SVG. Text uses a generic Arial/Helvetica stack rather
than the site's Sora/Manrope webfonts, since those aren't guaranteed available to whatever
renders the SVG server-side — a deliberate, documented tradeoff for reliability over exact
brand-font match.

## 26. GA4-ready analytics (`src/lib/analytics.ts`)

- `VITE_GA4_MEASUREMENT_ID` — new build-time env var, documented in `.env.example`. Unset by
  default; completely unset in this codebase and not configured with any real GA4 property — no
  analytics is live.
- With no ID set, `initAnalytics()` never injects the gtag.js script and every tracking call is
  a no-op, verified by reading the guard clauses directly — zero network requests when unset.
- `AnalyticsRouteTracker` (mounted once in `main.tsx`, inside `BrowserRouter`, alongside `App`)
  sends a `page_view` event on every client-side route change — `send_page_view` is explicitly
  disabled in the initial `gtag('config', ...)` call since the default snippet behavior only
  fires on hard page loads, which an SPA rarely does after the first one.
- Typed helpers wired into real call sites, not left unused: `trackFormSubmit(source)` in
  `EnquiryForm.tsx` (fires after a successful enquiry POST; `source` is a static page-label
  string, never form field values), `trackWhatsappClick` on the header topbar WhatsApp link,
  `trackAuditToolSubmit()`/`trackAuditToolResult(scoreBand)` in `SeoAuditTool.tsx` (`scoreBand`
  is a derived low/medium/high bucket, not the audited URL or a raw score tied to a submission).
  `trackCtaClick`/`trackOutboundLink`/`trackPhoneClick` are defined and exported for future call
  sites but not yet wired everywhere.
- No PII is ever sent — none of the helpers accept name, phone, email, message text, or a
  submitted URL/audit id as a parameter; every call site above intentionally passes only a
  label/category/score-band instead.

## 27. Prerendering — scoped down, documented rather than partially faked

Investigated in depth (render strategy confirmed safe in §19) but not implemented this pass, for
a concrete code-level reason found during the investigation: every dynamic content page
(`BlogDetail.tsx`, `DynamicServicePage.tsx`, `DynamicPortfolioPage.tsx`, `DynamicSeoPage.tsx`)
fetches its content inside a `useEffect` and has an explicit `if (state === 'loading') return
(...)` early return. `useEffect` never runs during `react-dom/server`'s `renderToString`, so a
naive prerender of any of these routes would freeze the exact "Loading…" placeholder into the
static HTML — worse for SEO than today's client-rendered-but-eventually-correct page, not
better. Doing this properly means refactoring each of those page components to accept optional
pre-fetched initial data they can render synchronously on first pass — a real, multi-file change
with regression risk that didn't fit safely in the same pass as everything else above.

Pages that are genuinely static (no `useEffect` fetch at all) — the 10 Our Ventures pages,
`Contact.tsx`, `About.tsx`, `Services.tsx`, `Pricing.tsx`, and the static-content service pages
(`WebsiteDesigning`, `OnlineMarketing`, `SeoServices`, `HotelDigitalMarketing`,
`ChannelManager`) — are safe to prerender as-is and are the correct next scope for this work.
`SeoAuditTool.tsx` and `SeoCompanyJaisalmer.tsx` also fetch via `useEffect` but render complete
real fallback copy immediately (`copy?.h1 || 'Free SEO Audit Tool'`-style fallbacks, no loading
gate), so they're prerender-safe too, just with fallback rather than live CMS copy on a cold
build.

Do not treat this as done. All dynamic-slug routes (blog posts, portfolio items, services, seo
pages) remain fully client-rendered — a crawler that doesn't execute JavaScript still won't see
their content in the initial HTML today. The true-404 layer in §21 and the already-correct
dynamic metadata handling (Phase 1 §9) reduce the damage, but don't replace real prerendering
for those routes.

## 28. Lighthouse — real runs, mobile, against `vite preview` (`dist/`)

Lighthouse 13.4.1 and a local Chrome install were both available in this environment, so real
audits were run (not fabricated) — `npx lighthouse <url> --form-factor=mobile
--screenEmulation.mobile` against `vite preview` on port 4173. Caveat: this is the built SPA
shell served locally with no production CDN/caching/HTTP-2 and no PHP API backend running
(dynamic-page fetches fail locally, so those routes' below-the-fold content didn't load during
the audit) — treat these as lab-only directional numbers, not production field data.

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 88 | 99 | 96 | 100 |
| `/about` | 65 | 93 | 96 | 100 |
| `/seo-audit-tool` | 76 | 98 | 96 | 100 |
| `/our-ventures` | 63 | 93 | 96 | 100 |
| `/blog` | 68 | 93 | 96 | 100 |
| `/contact` | 66 | 94 | 96 | 100 |

SEO and Accessibility are strong across the board. Performance is notably lower on interior
pages than home (63–68 vs 88) under Lighthouse's mobile throttling (4× CPU slowdown + slow 4G) —
the shared `index-*.js` bundle is 462 KB (144 KB gzip) and every route pays for it up front; the
render-blocking Google Fonts link in `index.html` and Framer Motion's per-page mount cost are the
other likely contributors, based on what's actually in the bundle and `index.html`. Addressing
bundle size/route-level code splitting is a reasonable next-phase target but wasn't attempted
here to avoid touching working UI code under this phase's "don't redesign the approved UI"
constraint.

## 29. Testing performed this phase

- `npx tsc --noEmit` — clean, no errors.
- `npm run build` (`tsc -b && vite build`) — succeeds, all routes bundle correctly.
- `php -l` on `api/lib/route_manifest.php`, `api/spa-router.php`, `api/sitemap.php`,
  `api/index.php` — all clean.
- Manual render check of `public/og-image.png` — renders correctly, matches the light/hybrid
  palette and the real logo-fallback gradient.
- Real Lighthouse runs on 6 routes (§28) — not fabricated, caveated above.
- `scripts/test-redirects.mjs` written and ready but not run against production — requires a
  deploy first, which this phase's instructions forbid doing here.
- Not run: hydration-mismatch check (no hydration is attempted — see §19, doesn't apply),
  sitemap XML / robots.txt parse tests (both unchanged in output shape from Phase 1, which did
  verify them; only the sitemap's route *source* changed, not its XML-building logic).

## 30. Explicit regression check

- Existing SEO metadata, sitemap, schema, redirects, forms, CMS admin, animations: unchanged in
  behavior. The only `.htaccess` changes with a behavioral effect are the SPA-fallback target
  (now via PHP) and the category/tag/author redirect type (301→410) — both scoped exactly to the
  paths described above.
- `api/index.php`, its routing table, all `api/controllers/*`, all `api/models/*`: untouched.
- No commit, push, or deploy was performed in this phase.

## 31. Completion report

**Done (code-level, verified):**
1. Re-audited Phase 1 claims by reading code directly (§19) — all held up; one gap (soft-404) is
   now fixed.
2. Confirmed `api/index.php` already returns JSON 404 for unknown API routes — no change needed.
3. Built a single authoritative route manifest, `api/lib/route_manifest.php`, consumed by both
   the sitemap and the new true-404 router (§20).
4. Refactored `api/sitemap.php` to source its static routes from the manifest (§20).
5. Implemented true HTTP 404s via `api/spa-router.php` + an `.htaccess` change, with file-cached
   route lookups — atomic write, stale/corrupt-safe, fail-open on DB error (§21).
6. Narrowed the Phase 1 broad category/tag/author → /blog redirects to 410s, leaving /blog-list
   as the one genuine 301 (§22).
7. Built and wired a branded default OG image into `Seo.tsx` (§25).
8. Built a GA4-ready analytics module, env var, `.env.example` entry, and wired real call sites
   with no PII (§26).
9. Wrote `scripts/test-redirects.mjs` (18 scenarios) and an npm script to run it (§24).
10. Ran real Lighthouse mobile audits on 6 routes and recorded honest results, with caveats
    (§28).
11. Verified everything via `tsc`, `npm run build`, and `php -l` (§29).

**Not done, with reasons:**
12. Old-WordPress-URL migration CSV importer — no real GSC export available to build/test
    against; scoped to "build once a real export is provided" (§23).
13. Build-time prerendering — investigated and designed, but the dynamic-slug page components
    all early-return a loading placeholder inside a `useEffect`-gated fetch, so a correct
    implementation needs a component refactor deferred as its own scoped follow-up (§27).
14. `scripts/test-redirects.mjs` has not been run against production — requires a deploy, which
    this phase forbids performing.

**Not claimed:** Search Console, Bing Webmaster Tools, and GA4 are not live or configured with
any real credentials/property in this codebase — the manual checklists in §17 and §239–267 above
are still exactly that, manual, unchanged from Phase 1. Lighthouse scores in §28 are real
local-lab numbers, not production field data, and are explicitly caveated as such.

---

# Phase 3 — True prerendering and performance

Builds on Phases 1–2 above. Phase 2 §27 identified exactly why prerendering wasn't attempted
then: every dynamic-slug page early-returns a loading placeholder inside a `useEffect`-gated
fetch, and `useEffect` never runs during `renderToString`. Phase 3 fixes that at the root by
giving every dynamic page a way to receive its data *before* first render, both in the browser
and at build time, then uses that to actually prerender real HTML — not a redesign of the
approved UI, and no working route/API contract/CMS field changed.

## 32. Architecture audited before editing

Read in full before writing anything: `package.json`, `vite.config.ts`, `src/main.tsx`,
`src/App.tsx` (router config), all four dynamic-slug pages (`BlogDetail`, `DynamicServicePage`,
`DynamicPortfolioPage`, `DynamicSeoPage`), `Layout.tsx`/`SiteDataContext.tsx` (the always-mounted
shell), `api/lib/route_manifest.php`, `api/sitemap.php`, `api/spa-router.php`, `.htaccess`.

Key findings that shaped everything below:

- **Every public route was already `React.lazy()`-split** except `Home` (App.tsx's own inline
  comment even said so: "Route-based code splitting: the homepage ships eagerly, everything
  else on demand"). Task 12's "add route-level code splitting" was therefore already done for
  every route but one — confirmed by reading the file, not assumed.
- **No GSAP, no Recharts** anywhere in the dependency graph (`package.json` + a full `grep` for
  both names across `src/`) — two full sections of the audit checklist (§13/§15's GSAP items,
  §16's Recharts item) don't apply to this codebase at all.
- **`Layout.tsx` (mounted on every single route, never lazy) rendered `<ScrollProgress/>`**,
  which imported all of `framer-motion` for a one-line linear scroll-progress bar — this was the
  actual reason framer-motion (a large package) sat in the *shared* entry chunk regardless of
  which route a visitor landed on, not anything to do with the already-correct route splitting.
- **`SiteDataContext.tsx` already had an SSR-safe design**: `header`/`footer` start `null` and
  every consumer already falls back to static defaults — this predates Phase 3 and needed no
  change for prerendering to work.
- **`api/index.php` already correctly returns JSON 404s** (Phase 2 §19) — unaffected by this
  phase.
- A genuine bug found while cross-checking `api/lib/route_manifest.php`'s static route list
  against `App.tsx`'s real routes: **`/seo-company-jaisalmer` was missing** from
  `static_public_routes()` (a Phase 2 omission — it copied `api/sitemap.php`'s pre-existing
  list, which had the same gap). Left uncorrected, this real static page would have gotten a
  false HTTP 404 from `api/spa-router.php` the next time Phase 2 deploys, and would have stayed
  out of the sitemap. Fixed in this phase — see §33.

### Route audit table

| Route family | Static/Dynamic | Data source | Prerenderable | Refactor needed |
|---|---|---|---|---|
| `/`, `/about`, `/services`, `/website-designing`, `/online-marketing`, `/seo-services`, `/seo-company-jaisalmer`, `/hotel-digital-marketing`, `/channel-manager-hotel-software`, `/channel-manager-pricing`, `/case-studies`, `/contact`, `/privacy-policy`, `/terms-conditions`, `/sitemap` | Static, zero fetch | Hardcoded in-component | Yes — trivially | None |
| `/our-ventures`, `/our-ventures/:slug` (9) | Static, zero fetch | `src/data/ventures.ts` | Yes — trivially | None |
| `/seo-audit-tool` | Static, `useEffect` fetch but with a real `||` fallback (no loading gate) | CMS copy override, optional | Yes — as-is | None |
| `/blog`, `/portfolio` | Static shell, `useEffect`-fetched list | `/api/public/blog`, `/api/public/portfolio` | Partial only — hero/intro prerenders, list stays client-fetched | Same class of refactor as the 4 below; not done this phase, see §41 |
| `/blog/:slug` | Dynamic, hard loading gate | `/api/public/blog/:slug` | Yes — after refactor | Done (§34–36) |
| `/portfolio/:slug` | Dynamic, hard loading gate | `/api/public/portfolio/:slug` | Yes — after refactor | Done |
| `/services/:slug` | Dynamic, hard loading gate | `/api/public/services/:slug` | Yes — after refactor | Done |
| `/:slug` (seo_pages catch-all, ~93 published rows) | Dynamic, hard loading gate | `/api/public/seo-pages/:slug` | Yes — after refactor | Done |
| `/admin/*` | Admin app, separate tree | N/A | No — excluded on purpose | N/A |

## 33. Static route manifest fix

`api/lib/route_manifest.php`'s `static_public_routes()` was missing `/seo-company-jaisalmer`.
Added it (and its sitemap priority override in `api/sitemap.php`, matching `/seo-services`'s
0.8). `php -l` clean on both. This is a correctness fix carried by this phase's cross-checking,
not a new feature — see §32.

## 34. Shared data-loader architecture (`src/loaders/`)

- `types.ts` — `LoaderResult<T> = success | not-found | error`, distinguishing "confirmed gone"
  from "network/API failure" exactly as required. No React import anywhere in this folder.
- `apiClient.ts` — one `fetchJson()` used by every loader; takes an optional `baseUrl` so the
  exact same function works with a browser's relative `/api/...` fetch and with an absolute
  URL during the Node-side prerender build.
- `blogLoader.ts` / `portfolioLoader.ts` / `serviceLoader.ts` / `seoPageLoader.ts` — one
  per dynamic-slug family, each normalizing its endpoint's response shape once. `blogLoader`
  also fetches the related-posts list, exactly matching what `BlogDetail.tsx` used to do inline.
  No new endpoints were added — every loader calls the same `/api/public/...` routes the pages
  already called.
- `initialData.ts` — the embedded-initial-data read/write mechanism (§35).
- `useRouteData.ts` — the shared client-side hook every dynamic page now calls instead of its
  own `useEffect` block (§36).

Never accesses `window`/`document` at the loader level (only `initialData.ts`, and only behind
an explicit `typeof document !== 'undefined'` guard, since it's the one file that legitimately
needs both a browser and a Node code path — see §35). Never sends credentials — every loader
hits the exact same public, unauthenticated, already-existing `/api/public/*` endpoints real
visitors already call.

## 35. Initial-data mechanism

A prerendered dynamic page embeds one tag: `<script type="application/json"
id="__ROUTE_DATA__">{"path":"/blog/...", "result": {...}}</script>`, placed right after the
`<div id="root">`. `initialData.ts`:

- `serializeInitialData()` (build-time only) — `JSON.stringify`s `{path, result}` then escapes
  `<`, `>`, `&` to their `\uXXXX` forms, so the payload can never prematurely close the
  surrounding `<script>` tag or be misread as markup, regardless of what characters a CMS author
  puts in a title/body. Verified: none of `<`, `>`, `&` survive un-escaped in any generated file
  (spot-checked; see §11-style validation in §39).
- `consumeInitialData(path)` (browser) — reads the tag once, checks its embedded `path` matches
  the *current* route exactly (so a stale tag can never apply to the wrong page), removes the
  tag from the DOM once read, and returns `null` on any mismatch or second call — guaranteeing a
  client-side navigation to a different slug (or back to the same one later) always re-fetches
  live data rather than reusing a build-time snapshot indefinitely.
- Only ever contains the exact same `LoaderResult` shape a live fetch would produce for that
  route — never an admin field, never draft/unpublished content (the loaders only ever call
  the public, published-only endpoints), never a competitor-audit or audit-ID result (the SEO
  Audit Tool's report data was never part of this mechanism at all — see §16/§27 unaffected).
- Nothing is ever written to `localStorage` — the tag lives in the served HTML only, consumed
  once per page load.

## 36. `useRouteData` — one hook, three call sites in one

```
Build-time prerender  →  loader called directly (Node) → embedded as __ROUTE_DATA__
Browser first paint    →  useState(() => consumeInitialData(path) ?? 'loading')  — no fetch
Browser client nav      →  useEffect re-fetches via the same loader — real request, as before
```

`BlogDetail.tsx`, `DynamicPortfolioPage.tsx`, `DynamicServicePage.tsx`, `DynamicSeoPage.tsx`
were all refactored the same way: the old inline `useState`/`useEffect`/`fetch` block is gone,
replaced with one `useRouteData(path, (signal) => loadX(slug, { signal }))` call. Their loading/
not-found/error/success branches are unchanged in shape and copy — this is a data-plumbing
refactor, not a UI change. `BlogDetail`'s two-effect (post + related posts) design collapsed
into `blogLoader.loadBlogPost()` doing both, sequentially, with the related-posts fetch
wrapped in its own try/catch so a related-posts failure never fails the whole page (matching
the old behavior, where a rejected related-posts promise just left `related` empty).

Verified via `npx tsc --noEmit` (clean) after each file and a full `npm run build`.

## 37. Rendering strategy — chosen and why

**Chosen: build-time `react-dom/server` `renderToString` via a separate SSR-targeted Vite
build (`src/entry-server.tsx`, `vite build --ssr ... --outDir dist-ssr`), not browser
snapshotting.** Reasons, in the order they were actually checked:

1. `src/main.tsx` uses `createRoot`, never `hydrateRoot`, confirmed in Phase 2 §19 — so there
   was never a real hydration-reuse contract to preserve; adding one deliberately (via
   `hydrateRoot`, see §38) was a new, additive capability, not a risk to something existing.
2. `SiteDataContext` and every dynamic page's data now come from a plain async function
   (`loadX()`/`fetch`) with **no dependency on a browser DOM** — confirmed by writing loaders
   with zero `window`/`document` references and testing them directly under plain Node before
   ever touching React.
3. React 19's `renderToString` **hoists `<title>`/`<meta>`/`<link>` tags exactly the same way
   the browser does** — verified empirically (not assumed from docs) by rendering `/about` and
   inspecting the raw output string: a clean, contiguous run of exactly those tag types at the
   very start of the string, everything else (real body markup, including inline JSON-LD
   `<script>` tags, which are *not* hoisted and stay wherever they're rendered) immediately
   after. This is what `scripts/prerender.mjs` splits on (§39) — no guessing, no fragile HTML
   parsing library needed.
4. `React.lazy()` is used for route-level splitting (§32), and `renderToString` can't await
   Suspense — a naive single-pass render would freeze the fallback text for any not-yet-loaded
   chunk. Fixed with a discard-then-real two-pass render per route (§37a) rather than removing
   `lazy()` from the app (which would have undone the code-splitting this same phase relies on).
5. No headless-Chrome snapshotting was used anywhere — no Chrome dependency at all in the
   prerender path, satisfying "does not require Chrome in production" trivially (it doesn't
   require Chrome in the *build* either). Chrome is only used separately, for Lighthouse testing
   (§43), never for generating shipped HTML.

### 37a. The two-pass render (and the bug it initially had)

```js
renderToString(tree());              // pass 1: warms not-yet-loaded lazy chunks, discarded
await new Promise(r => setTimeout(r, 20));
resetInitialDataCache();             // <-- required; see below
return renderToString(tree());       // pass 2: the real, saved output
```

First implementation reset the initial-data cache only once, before pass 1. That worked for the
*first* route of any given page type in a run, but broke for every subsequent route sharing the
same lazy chunk: once `DynamicSeoPage`'s chunk was warm from an earlier `/technical-seo-services`
render, pass 1 of the *next* seo-page route (e.g. `/seo-company-in-jaipur`) no longer suspended
— it mounted the real component immediately and consumed the one-time-use embedded data on the
throwaway pass, leaving pass 2 (the one actually saved) with nothing but the loading state.
Caught by writing a verification script that scanned every generated file for stray "Loading"
text (§39) rather than only spot-checking the first few routes — it initially found this exact
failure on later routes in the batch, not the earlier ones. Fixed by resetting the cache a
second time between pass 1 and pass 2, so pass 2 always re-reads fresh regardless of what pass 1
did. Re-verified clean across all 159 generated files after the fix.

## 38. Hydration

`src/main.tsx` now branches on a DOM marker:

```js
if (rootEl.hasAttribute('data-prerendered')) hydrateRoot(rootEl, app);
else createRoot(rootEl).render(app);
```

`data-prerendered="true"` is written onto the root `<div>` only by `scripts/prerender.mjs`'s
output — every other route (never prerendered, or served from the plain `dist/index.html`
template via `api/spa-router.php`'s SPA fallback) keeps the exact `createRoot` behavior it had
before this phase, unchanged. `StrictMode` and `AnalyticsRouteTracker` are both still present
in the exact same tree shape for both paths.

Why no hydration mismatch: the SSR render tree (`<StaticRouter location={path}><App/></StaticRouter>`)
and the client render tree (`<BrowserRouter><AnalyticsRouteTracker/><App/></BrowserRouter>`)
produce identical DOM for a matching route, because (a) `AnalyticsRouteTracker` renders `null`,
(b) `SiteDataContext` starts `header=null`/`footer=null` on *both* the server render and the
client's pre-effect first render (identical, since neither has run its fetch effect yet), and
(c) every dynamic page's `useState(() => consumeInitialData(path) ?? 'loading')` initializer
reads the *same* embedded data server and client both used, so the first client render before
hydration reconciles reproduces the exact server markup. Verified directly: served a prerendered
`/about` and `/blog/professional-website-business-growth` from a local static server and loaded
them in headless Chrome via Lighthouse (§43) — no console errors were surfaced by any of those
runs (Lighthouse's Best Practices score, which penalizes console errors, came back 100 on every
tested route post-fix, up from 96 before this phase).

Direct prerendered-route refresh and client-side navigation to the same route were both
exercised: refresh serves the static file + hydrates; navigating there via a `<Link>` from
another page never touches the static file at all (client-side routing, `useRouteData`'s
`useEffect` branch fetches fresh) — both paths produce the same visible page.

## 39. Prerender implementation

`scripts/prerender.mjs` (Node, build-time only):

1. **Route source** — static routes from `scripts/print-static-routes.php`, a one-line script
   that `require`s `api/lib/route_manifest.php` and prints `static_public_routes()` as JSON —
   the *real* function, not a hand-copied list. Dynamic slugs (blog/portfolio/services/seo-pages)
   parsed from `${PRERENDER_SITE_URL}/sitemap.xml`'s `<loc>` entries — itself generated from the
   same published-content DB tables (`api/sitemap.php`, unchanged query logic). No admin, login,
   preview, or audit-result path is ever in either source — `EXCLUDED_PREFIXES` additionally
   defensively strips anything starting `/admin`, `/api`, `/seo-preview` even though neither
   source could produce them.
2. For each route, calls `entry-server.js`'s `renderRoute(path, apiBaseUrl)` (built separately
   via `vite build --ssr src/entry-server.tsx --outDir dist-ssr` — a Node-targeted bundle,
   never deployed; only `dist/` is).
3. On success, splits the render output into head-tags/body (§37 point 3), rebuilds the real
   `dist/index.html` template with the static `<title>` placeholder removed, the real hoisted
   tags spliced before `</head>`, and the body spliced into `<div id="root"
   data-prerendered="true">...</div>`, followed by the `__ROUTE_DATA__` script tag for dynamic
   routes. Writes to `dist/{route}.html` (flat file — see §40 for why not a directory).
4. On `not-found` or `error`, **no file is written** — the route falls through to
   `api/spa-router.php`'s existing DB-checked true-404 logic (Phase 2), so a route that stops
   existing between builds degrades to a real 404 rather than serving stale prerendered content.
5. Logs one line per route (`OK`/`SKIP (not found)`/`SKIP (error)`/`SKIP (exception)`) and a
   final summary count — never the full API response body, only the path and a short reason.
   Required static routes that fail hard-fail the whole script (`process.exit(1)`) so a build
   can never silently ship without its core pages; dynamic-route failures are logged and skipped
   without failing the build (a single unpublished/broken CMS row shouldn't block every other
   page from prerendering).

## 40. Why flat `{route}.html` files, not `{route}/index.html` directories

Tried directories first. Apache's default `mod_dir` module 301-redirects a bare `/about` to
`/about/` before serving a real directory's `index.html` — which conflicts with this site's own
no-trailing-slash canonical convention (enforced by an earlier `.htaccess` rule, and by every
`canonical`/internal `<Link>` in the app) and adds an avoidable redirect hop on every cold visit
to a prerendered route. Switched the generator to flat `dist/{route}.html` files and added one
targeted `.htaccess` rule (below the API rules, above the SPA fallback) that serves
`{route}.html` in place — exact URL stays as requested, no redirect, no conflict:

```
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI}.html -f
RewriteRule ^(.*)$ $1.html [L]
```

This was caught and fixed *before* shipping, not left as a known bug — the directory-based
version was never the one tested against Lighthouse or committed to the file layout described
elsewhere in this document.

## 41. Static and dynamic routes prerendered

**159 of 159 attempted routes succeeded, 0 skipped, 0 failed**, from a real run against the live
production API (`PRERENDER_API_BASE_URL` defaulted to `https://shrinathsolutions.com`):

- All 27 static routes from `static_public_routes()` (home, about, every static service/landing
  page, all 9 Our Ventures pages + the hub, legal pages, sitemap page, contact).
- 53 CMS-authored `/services/:slug` pages.
- 11 published `/blog/:slug` posts.
- 6 published `/portfolio/:slug` projects.
- 61 published `/:slug` SEO landing pages (city/keyword pages — the largest single group, and
  arguably the highest-value one for this phase, since they're exactly the pages meant to rank
  for local search terms).

**Not prerendered, on purpose:** `/admin/*`, `/admin/login`, `/seo-preview/*` (sample/demo data,
already `noindex` — Phase 1 §16), any SEO-Audit-Tool result (no persistent result URL exists at
all — Phase 1 §7), `/blog` and `/portfolio` themselves prerender their static shell only, not
their post/project list (§32's route table; same `useEffect`-list-fetch limitation as the
now-fixed detail pages, not fixed this phase — see §46).

## 42. Bundle analysis and code-splitting result

Analyzed with `rollup-plugin-visualizer` (installed temporarily via `npm install --no-save`,
used to generate a per-module gzip-size breakdown of the shared entry chunk, then fully
uninstalled — not a project dependency).

**Before (start of this phase):** shared entry chunk `index-*.js` — 462.31 KB raw / 143.64 KB
gzip. Breakdown of what was in it: framer-motion (~113 KB gzip-equivalent share, by far the
largest single item), react-dom (~96 KB share), react-router (~20.5 KB share), lucide-react
(~11 KB share), plus `Home.tsx` and its data (~10 KB share) — framer-motion and Home were both
in the *shared* chunk because `Home` was imported eagerly at the top of `App.tsx`, and
`ScrollProgress` (mounted on every route via `Layout.tsx`) pulled in framer-motion regardless.

**Two changes, in order of what each one fixed:**

1. **`Home` made lazy** (`const Home = lazy(() => import('./pages/Home'))`, wrapped in its own
   `<Suspense>` at its route), matching how every other page already loaded. Alone, this only
   dropped the shared chunk by ~50 KB raw (~12 KB gzip) — framer-motion was still being pulled
   in from elsewhere.
2. **`ScrollProgress.tsx` rewritten without framer-motion** — the exact same visual (a linear
   scroll-progress bar, `scaleX` transform, same gradient/shadow) implemented with a
   `requestAnimationFrame`-throttled native scroll listener instead of
   `motion.div`/`useScroll`, and now also respects `prefers-reduced-motion` (an accessibility
   improvement that didn't exist before). This was the change that actually mattered: with
   `Layout.tsx` no longer importing framer-motion at all, Rollup's default chunking (no
   `manualChunks` config added or needed) automatically extracted framer-motion into its own
   chunk, shared across only the routes that still use it (Hero, Sections, Faq, service pages,
   Ventures, Home, Blog, SeoAuditTool, SeoCompanyJaisalmer) — never downloaded by a visitor
   landing on a route that doesn't use it, and downloaded once (not duplicated per-chunk) by one
   that does.

**After:** shared entry chunk `index-*.js` — 295.10 KB raw / **92.00 KB gzip** (a 36% gzip
reduction). Confirmed via `grep` on the built `dist/index.html` that only this one script tag is
referenced from the initial HTML — the extracted framer-motion chunk (`proxy-*.js`, 111.43 KB
raw / 36.65 KB gzip) is not. What's left in the shared chunk, by proportional share: react-dom
(~96 KB), react-router (~20.5 KB), lucide-react (~8.4 KB, already tree-shaken via named imports
— checked, no `import * as Icons`), Header/Footer (~9.5 KB combined), App/Layout/admin-auth
wiring (~4 KB) — essentially the practical floor for a React 19 + react-router-dom client-routed
SPA with persistent header/footer chrome. `RichTextEditor-*.js` (403.70 KB raw / 128.89 KB gzip,
Tiptap) was already its own separate admin-only chunk before this phase and remains so —
confirmed not referenced from `dist/index.html`.

No `manualChunks` configuration was added — Rollup's default per-dynamic-import chunk splitting
already produced a reasonable result once the eager-import problems were removed; adding manual
rules on top would have been solving a problem that no longer existed, so none were added (per
this phase's own "do not add manualChunks rules without verifying output" instruction).

### Admin/SEO-Audit-Tool/chart isolation (verified, not just assumed)

- Every `admin/*` page component was already lazy-imported (confirmed reading `App.tsx` — this
  predates this phase). `AuthProvider`/`ProtectedRoute` (small, ~1.4 KB combined gzip share)
  remain eagerly imported at the top of `App.tsx`; left as-is — the saving from lazifying them
  further is small relative to the risk of restructuring the admin/public route boundary, and
  wasn't attempted this phase.
- SEO Audit Tool (`SeoAuditTool.tsx`) was already its own lazy chunk (14.95 KB raw / 4.81 KB
  gzip) — confirmed it is not referenced from `dist/index.html` and does not appear in Home's
  chunk.
- No Recharts/GSAP anywhere (§32) — nothing to isolate.

## 43. Lighthouse — before/after, real runs, mobile, 6 routes

**Before** numbers are Phase 2 §28's (measured via `vite preview`, no compression headers
configurable there beyond Vite's defaults). **After** numbers were measured against a small
purpose-built local static server (`http.createServer`, gzip-on-`Accept-Encoding`, serving the
real `dist/{route}.html` prerendered files exactly the way the new `.htaccess` rule will in
production) — chosen because `vite preview`'s static file server (`sirv`) does not serve
`dist/{route}.html` for a bare `/{route}` request the same way the new Apache rule does, so it
would have silently served the *unprerendered* `dist/index.html` SPA shell for every route and
produced a misleading "after" number. (First attempt at this comparison, without gzip on the
scratch server, produced obviously-wrong worse-than-before numbers — caught by noticing LCP
above 7s was implausible for a mostly-static page, fixed by adding compression before treating
any number below as real — see the deliberately-left "artifact caught" note in this section
rather than silently discarding the bad run.)

| Route | Perf (before → after) | A11y | Best Practices | SEO | LCP (before → after) | CLS | TBT | FCP | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 88 → 81 | 99 → 99 | 96 → 100 | 100 → 100 | — → 4.1s | 0 | 0ms | — → 3.1s | — → 3.5s |
| `/about` | 65 → **83** | 93 → 93 | 96 → 100 | 100 → 100 | — → 3.8s | 0 | 20ms | — → 2.9s | — → 3.4s |
| `/seo-audit-tool` | 76 → **86** | 98 → 98 | 96 → 100 | 100 → 100 | — → 3.5s | 0 | 0ms | — → 2.7s | — → 3.1s |
| `/our-ventures` | 63 → **86** | 93 → 93 | 96 → 100 | 100 → 100 | — → 3.5s | 0 | 0ms | — → 2.8s | — → 3.1s |
| `/blog` | 68 → **86** | 93 → 98 | 96 → 100 | 100 → 100 | — → 3.5s | 0 → 0.028 | 0ms | — → 2.7s | — → 3.1s |
| `/contact` | 66 → **81** | 94 → 94 | 96 → 100 | 100 → 100 | — → 3.7s | 0 | 180ms | — → 3.0s | — → 3.4s |

Every interior route improved 15–23 performance points; Best Practices moved to a clean 100 on
every route (was 96 — consistent with fewer/no console warnings post-hydration-fix). SEO was
already 100 everywhere and stayed there. Home's performance score moved from 88 to 81 — the one
route that went down, most likely because the comparison's "after" test server lacks the
HTTP/2 and connection-reuse tuning `vite preview`'s `sirv` has (a test-harness difference, not
a shipped regression — Home's actual JS payload only got smaller this phase, never larger).

**LCP is 3.5–4.1s on every route — above the 2.5s target.** Root cause, checked directly rather
than guessed: neither the prerendered HTML (12–16 KB gzip per page — not the bottleneck) nor the
shared JS bundle (92 KB gzip — already reduced 36% this phase) is obviously oversized in
isolation; the remaining gap is most likely the combination of (a) this test environment's
throttled-mobile Lighthouse profile (4× CPU slowdown, simulated slow 4G — deliberately strict)
against (b) a bare Node test server with no HTTP/2, no CDN edge, and no real-world warm
connection reuse, neither of which reflects Hostinger's actual production Apache + whatever
caching is configured there. This is reported honestly as unresolved rather than claimed fixed —
re-measuring against the real production origin after this phase's changes are deployed would
give a materially more accurate number, and is recommended as the next verification step rather
than something this phase can honestly certify from a local test server alone.

## 44. Required technical checks — this phase

- `npx tsc --noEmit` — clean throughout (checked after every batch of file changes, not just
  once at the end).
- `npm run build` (`tsc -b && vite build`) — succeeds, 295.10 KB / 92.00 KB gzip shared chunk.
- `npm run build:ssr` (`vite build --ssr src/entry-server.tsx --outDir dist-ssr`) — succeeds.
- `npm run prerender` (`node scripts/prerender.mjs`) — 159/159 routes succeeded, 0 failures.
- `php -l` on `api/lib/route_manifest.php`, `api/spa-router.php`, `api/sitemap.php`,
  `scripts/print-static-routes.php` — all clean.
- Full-corpus HTML validation script (ad hoc, not committed) scanning all 159 generated files
  for stray "Loading" text, a missing `<h1>`, a missing canonical tag, or a missing
  `data-prerendered` marker — 0 issues found after the two-pass-render fix (§37a); it's what
  caught that bug in the first place, on the first full run before the fix.
- Real Lighthouse mobile runs, before and after, on 6 routes (§43) — not fabricated.
- `scripts/test-redirects.mjs` (Phase 2) still exists and is unaffected by this phase's changes;
  still not run against production, since this phase also doesn't deploy.
- Hydration console-error check: Lighthouse's Best Practices audit (which flags console errors)
  came back 100 on every tested route post-fix — the closest available signal to a dedicated
  hydration-warning check without a full browser automation harness in this environment.

## 45. Deployment build command and Hostinger output structure

**Recommended production build command** (not yet wired into `.github/workflows/deploy.yml` —
left as a documented next step rather than silently changing the CI pipeline in the same pass as
everything else, since it would need `PRERENDER_SITE_URL`/`PRERENDER_API_BASE_URL` reasoned
about for the CI environment specifically, and a `setup-php` step added for
`scripts/print-static-routes.php` to run in GitHub Actions):

```
npm run build:prerender
# = npm run build && npm run build:ssr && npm run prerender
```

Output structure that ends up in `dist/` (the only directory `deploy.yml` ships):

```
dist/
  index.html                          ← prerendered home
  about.html                          ← prerendered static route
  blog.html                           ← prerendered shell (list stays client-fetched, §41)
  blog/
    some-post-slug.html               ← prerendered blog post
  services/
    some-service-slug.html            ← prerendered CMS service page
  portfolio/
    some-project-slug.html            ← prerendered portfolio project
  our-ventures.html, our-ventures/*.html
  some-seo-landing-page-slug.html     ← prerendered root-level SEO page
  assets/                             ← unchanged: hashed JS/CSS from the normal Vite build
```

`dist-ssr/` (the Node-only SSR bundle) and the temporary `rollup-plugin-visualizer` dependency
used for §42's analysis are **not** part of this output — `dist-ssr` is gitignored (added this
phase) and never referenced by `deploy.yml`'s `deploy/` assembly step; the visualizer package
was installed with `--no-save` and fully `npm uninstall`ed after use, confirmed not present in
`package.json`/`package-lock.json`.

## 46. Remaining limitations (honest, not hidden)

- **`/blog` and `/portfolio` prerender their shell only**, not their post/project list — same
  `useEffect`-driven list fetch as before, not addressed this phase (§32's audit table). A
  crawler sees the real hero/H1/intro immediately but an empty grid until JS runs.
- **Home's Lighthouse performance score moved from 88 to 81** in this phase's specific test
  harness — read as a test-environment artifact (§43), not a verified regression, but not
  independently re-confirmed against a production-equivalent server either. Worth re-measuring
  once actually deployed.
- **LCP (3.5–4.1s) is still above the 2.5s target** on every tested route — root-caused to the
  test environment's throttling + bare test server, not a specific oversized asset (§43), but
  not resolved. Re-test against the real Hostinger origin post-deploy before concluding further
  optimization is or isn't needed.
- **The recommended `npm run build:prerender` command is not wired into `deploy.yml`** — see
  §45. Running it manually and inspecting `dist/` before deciding whether/how to wire it into CI
  is the safer next step given this phase's "do not deploy" constraint.
- **`PRERENDER_API_BASE_URL` defaults to hitting the live production API during every local
  prerender run** — intentional (§39: it's the same public data every visitor's browser already
  calls, no credentials, no separate database), but worth knowing: running `npm run prerender`
  locally makes ~160 real HTTP requests to `shrinathsolutions.com`. Not a concern at this
  frequency (a manual build step, not a hot loop), but not free either.
- **Everything else in Phase 2 §16/§27's limitations list is unchanged** except the specific
  items this phase addressed (true prerendering for detail pages, the bundle-size gap).

## 47. Final completion report

1. **Architecture audited**: `package.json`, `vite.config.ts`, `main.tsx`, `App.tsx`, all 4
   dynamic-slug pages, `Layout.tsx`/`SiteDataContext.tsx`, `api/lib/route_manifest.php`,
   `api/sitemap.php`, `api/spa-router.php`, `.htaccess` — see §32.
2. **Dynamic pages refactored**: `BlogDetail.tsx`, `DynamicPortfolioPage.tsx`,
   `DynamicServicePage.tsx`, `DynamicSeoPage.tsx` — all four now use `useRouteData` + a shared
   loader instead of an inline `useEffect`/`fetch` block. `Blog.tsx`/`Portfolio.tsx` (list pages)
   were *not* refactored this phase — see §46.
3. **Loader files created**: `src/loaders/types.ts`, `apiClient.ts`, `blogLoader.ts`,
   `portfolioLoader.ts`, `serviceLoader.ts`, `seoPageLoader.ts`, `initialData.ts`,
   `useRouteData.ts`.
4. **Initial-data architecture**: build-time-embedded, escaped `<script type="application/json"
   id="__ROUTE_DATA__">`, consumed exactly once client-side, no `localStorage` use — §35.
5. **Prerender implementation**: `src/entry-server.tsx` + `scripts/prerender.mjs` +
   `scripts/print-static-routes.php`, using real `react-dom/server` `renderToString` (two-pass,
   to resolve `React.lazy`), not browser snapshotting — §37, §39.
6. **Static routes prerendered**: 27/27 — §41.
7. **Dynamic routes prerendered**: 132/132 attempted (53 services + 11 blog + 6 portfolio + 61
   seo-pages, plus the 12 zero-fetch Our Ventures routes counted under "static" in §41's
   breakdown) — §41.
8. **Routes skipped and reasons**: 0 skipped this run (every published route had valid API data
   at build time); `/admin/*`, `/seo-preview/*`, SEO-Audit-Tool results excluded by design, not
   by failure — §41.
9. **Hydration result**: `hydrateRoot` wired behind a `data-prerendered` marker, verified
   matching server/client trees, 0 console errors surfaced by Lighthouse on tested routes,
   Strict Mode and analytics tracking both preserved — §38.
10. **Raw HTML SEO result**: verified programmatically across all 159 generated files — real
    `<title>`, meta description, canonical, robots, OG/Twitter tags (incl. the branded OG image
    from Phase 2), `<h1>`, and (for content-bearing routes) JSON-LD — 0 files contain a stray
    "Loading" placeholder or a missing `<h1>`/canonical — §39, §41.
11. **Route-level splitting result**: confirmed already-complete pre-phase for every route but
    `Home`; `Home` made lazy this phase — §32, §42.
12. **Admin bundle result**: unchanged, already fully separated pre-phase — confirmed, not
    touched — §42.
13. **SEO Audit Tool bundle result**: unchanged, already its own lazy chunk pre-phase — confirmed
    — §42.
14. **Bundle size before/after**: shared entry chunk 462.31 KB → 295.10 KB raw — §42.
15. **Gzip size before/after**: 143.64 KB → **92.00 KB** (−36%) — §42.
16. **Heavy dependencies found**: framer-motion (now correctly lazy-chunked, was the actual
    cause of the oversized shared chunk); no GSAP, no Recharts anywhere in the app — §32, §42.
17. **CSS result**: not modified this phase — Tailwind output and the approved light/hybrid theme
    were out of scope for this pass's actual bottleneck (JS, not CSS).
18. **Font result**: not modified this phase — the existing Google Fonts `<link>` setup was
    audited but left as-is; flagged as a plausible remaining LCP contributor in §43, not fixed.
19. **Image/LCP result**: no image assets found to be the LCP element on any tested route (text
    headings are); the render-blocking font `<link>` and JS payload were investigated instead —
    §43.
20. **Caching/compression result**: not modified in `.htaccess` this phase beyond the new
    prerendered-file rewrite rule (§40) — no new `Cache-Control`/compression directives added;
    the local Lighthouse comparison used a scratch test server with gzip enabled specifically to
    approximate what production compression should look like (§43), not to configure production.
21. **TypeScript result**: clean throughout — §44.
22. **PHP syntax result**: clean on all 4 touched/new PHP files — §44.
23. **Production build result**: succeeds (`npm run build`, `npm run build:ssr`, `npm run
    prerender` all verified in sequence) — §44.
24. **Lighthouse before/after**: real, measured, 6 routes, with an honest note about the test
    harness limitations of the comparison itself — §43.
25. **Regression-test result**: direct refresh, client navigation, unknown routes (still 404 via
    the unaffected Phase 2 router), form submission/WhatsApp/GA4-no-ID paths unmodified this
    phase, sitemap/robots/structured-data unmodified this phase and reused as prerendering's own
    route/data source — spot-checked, not independently re-run in full since none of those
    systems were touched by this phase's changes.
26. **Remaining manual GSC work**: unchanged from Phase 1/2 — still fully manual, still nothing
    claimed live.
27. **Remaining limitations**: §46, stated plainly rather than omitted.

No commit, push, or deploy was performed in this phase.

---

# Phase 4 — Shrinath SEO Studio (separate CMS-integrated SEO module)

Two follow-on passes built a full in-CMS SEO analysis/optimization module on top of everything
above — a distinct feature, not a revision of Phases 1–3. Full documentation lives in its own
files rather than this one:

- `docs/SEO_SCORING_SPECIFICATION.md` — the 49-check dual-engine (TypeScript + PHP) scoring
  formula, with cross-engine parity verified via `npm run test:seo-parity`.
- `docs/SEO_STUDIO_ARCHITECTURE.md` — Part 1 (core module: dashboard, content inventory,
  editor integration for Services/Blog, link index, redirects-as-existing) and Part 2 ("All-Page
  Integration": the SEO Document Registry covering every route including static React pages and
  Venture pages, full editor integration for SEO landing pages/Portfolio/Pages, and the
  extended Redirect Manager with 307/308 and hit tracking).
- `docs/SEO_STUDIO_ADMIN_GUIDE.md` — plain-language usage guide for content editors.
- `docs/SEO_STUDIO_DEPLOYMENT.md` — migrations (`0015_seo_studio.sql`, `0016_seo_documents.sql`),
  first-run registry sync steps, troubleshooting.

Phases 1–3's own systems (route manifest, sitemap, prerendering, redirects-as-a-concept,
`Seo.tsx`) were reused throughout, never duplicated — SEO Studio explicitly does not become a
second route/metadata/sitemap source; see `SEO_STUDIO_ARCHITECTURE.md`'s ownership table.

# Phase 5 — Live Metadata Resolution & Production Readiness

Closes Phase 4's most important documented gap: SEO metadata saved for static React pages and
Venture pages in SEO Studio now genuinely overrides what's rendered in both live public HTML and
build-time prerendered HTML — verified via real `renderRoute()` output, not just admin-panel
display (`docs/SEO_STUDIO_ARCHITECTURE.md` Part 3 §26). Also adds a server-authoritative
permission layer for every SEO Studio/Redirect Manager mutation, and closes the prerender
lifecycle loop (`scripts/apply-prerender-report.php`) so a document's status genuinely reflects
whether its live prerendered file matches what's saved.

The 49-check scoring engine was not touched this phase (`npm run test:seo-parity` 13/13,
unchanged). No new migration was needed — `0016_seo_documents.sql` already had every column this
phase used. Migration testing against a representative MySQL database was **not performed**
(no MySQL server available in this environment) and is documented, not claimed, as such —
see `docs/SEO_STUDIO_ARCHITECTURE.md` Part 3 §29 for the exact commands to run it later.

Full documentation: `docs/SEO_STUDIO_ARCHITECTURE.md` Part 3 (§22–30), an updated
`docs/SEO_STUDIO_ADMIN_GUIDE.md` (live-override behavior, rebuild-required status, permissions),
and `docs/SEO_STUDIO_DEPLOYMENT.md` §7 (prerender-report workflow, permission model, migration
testing gap).

# Phase 6 — Final Gap Closure, MySQL Validation & Deployment Readiness

Closes the 8 gaps Phase 5 left open: wires `SeoCompanyJaisalmer.tsx`, `SitemapPage.tsx`, and
`Legal.tsx` into the metadata resolver (and finds two real bugs while auditing them — a
registry-sync merge-order bug that was silently dropping `/seo-company-jaisalmer`'s real
document on every sync, and a `database/migrate.php` glob-ordering bug that would have broken
a genuinely fresh install by running a down-migration before its forward migration); makes
`building`/`failed` real prerender states with abandoned-build recovery
(`0017_prerender_lifecycle.sql`); adds a saved-vs-prerendered status panel to the admin document
editor; adds frontend SEO-capability gating sourced from an authenticated backend response
(`seo_capabilities` on `/api/admin/session` and `/login`); and completes the static-route
coverage audit (28/28 routes resolver-connected, deterministic table in the architecture doc).

The 49-check scoring engine was not touched (`npm run test:seo-parity` still 13/13). No
MySQL/MariaDB server or Docker was available in this environment — real migration forward/
rollback/reapply testing, the representative-upgrade data test, and the full temporary-database
initialization workflow were **not performed** and are not claimed to have been; SQLite was not
substituted. Exact commands for each are documented, not invented, in
`docs/SEO_STUDIO_ARCHITECTURE.md` Part 4 §36.

Full documentation: `docs/SEO_STUDIO_ARCHITECTURE.md` Part 4 (§31–37), updated
`docs/SEO_STUDIO_ADMIN_GUIDE.md` (prerender-status panel, newly-live static pages) and
`docs/SEO_STUDIO_DEPLOYMENT.md` §8 (new migration, registry re-sync recommendation, abandoned-
build recovery, MySQL-testing gap).

# Phase 7 — MySQL Validation, Browser QA & Deployment Go/No-Go — NO-GO

Attempted real MySQL/MariaDB validation of Phase 6's work. Found that local development for
this project has **no isolated test database** — `api/config/config.php` connects to the
production database directly via Hostinger's Remote MySQL feature (documented as a deployment-
safety warning at the top of `docs/SEO_STUDIO_DEPLOYMENT.md`). Two harmless read-only requests
were made through it before this was recognized (a not-found redirect lookup and a real-content
read used to verify a genuine bug fix, described below); no write, migration, login, or
mutation of any kind occurred, and the local server was stopped immediately.

**Deployment decision: NO-GO.** Every database-dependent requirement (clean-install migration,
representative upgrade, rollback/reapply, full initialization workflow, live redirect
regression, authenticated admin browser QA) is genuinely blocked, not tested and not assumed
passing. Full results, what passed, and the exact re-run list once an isolated staging database
exists: `docs/SEO_STUDIO_DEPLOYMENT.md` §9.

**Real work completed without a database**: fixed a genuine per-field permission bug (the
backend was checking field *presence* instead of field *change*, which would have locked
metadata-only editors out of saving entirely); added matching frontend gating; found and fixed
a real, pre-existing SSR bug where `SeoCompanyJaisalmer.tsx`'s plain `useEffect` data-fetch
never ran during prerendering, meaning its prerendered HTML had shown only hardcoded fallback
content since before any SEO Studio phase existed (fixed by migrating it to the established
`useRouteData`/loader pattern, with the same fix applied to `DynamicSeoPage.tsx` for every
other seo_pages route); added a real regression test for the prior phase's migration-glob fix
that needs no database (`scripts/test-migrate-glob.php`); verified public-page rendering with
Playwright across 7 breakpoints served from a plain static file server with no path to any
backend. TypeScript, PHP syntax, SEO parity (13/13), production build, and SSR build all remain
clean.

Full documentation: `docs/SEO_STUDIO_ARCHITECTURE.md` Part 5, `docs/SEO_STUDIO_DEPLOYMENT.md`
§9 (full NO-GO report) and its deployment-safety warning (top of file).

## 48. Free SEO Audit Tool — privacy-corrected persistence (migration 0019 not yet applied)

The public Free SEO Audit Tool's admin-visibility feature (added in an earlier pass) was
re-audited for privacy and corrected before its migration was ever applied: the original
`seo_audits` schema stored a raw visitor IP, a full browser user-agent, and the complete
submitted URL including query string — none of that reached a live database (migration
`0019_seo_audits.sql` had never been run), so this was a schema/code correction, not a data
remediation.

Corrected: the schema now stores only a normalized, query/fragment-stripped URL plus its SHA-256
hash, no IP, no user-agent; the persistence lifecycle is one row per request
(`processing → completed/failed`, never a duplicate insert); the stored score and issue counts
are the exact authoritative values from the existing analyzer, never recalculated; a bounded,
safe summary (categories, grade, up to 10 length-capped recommendations) replaces raw analyzer
output; failure records store only a pre-classified safe error code, never a raw exception
message; the misleading "Email me a copy of my results" wording (no email-sending system exists)
was replaced with an honest "Get help fixing these SEO issues" consultation CTA that never gates
the free result; a lead-status workflow (new/contacted/qualified/closed/not_interested) and a
documented, dry-run-by-default retention cleanup script were added; and the admin list/detail
pages, dashboard panel, and API endpoints were built or corrected to match.

Full technical detail: `docs/SEO_STUDIO_ARCHITECTURE.md` §38. Migration application checklist
and retention-cleanup scheduling: `docs/SEO_STUDIO_DEPLOYMENT.md` §§1a-1b. Automated privacy
assertions: `scripts/test-seo-audit-privacy.php` (`npm run test:seo-audit-privacy`).
