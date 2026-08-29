# Shrinath SEO Studio — Architecture

An in-CMS SEO analysis and optimization module for Shrinath Solutions' existing admin panel.
Inspired only by the general *category* of tool Yoast SEO Premium represents — no Yoast code,
UI, wording, icons, or proprietary formula was copied or referenced while building this. Every
check, threshold and formula here is original and documented in
`docs/SEO_SCORING_SPECIFICATION.md`.

This is not a separate app, not a second admin panel, and not a replacement for the existing
public `/seo-audit-tool` (which analyzes *external* websites for prospective clients — a
completely different, untouched feature). SEO Studio analyzes content already stored in this
CMS's own database.

## 1. Audit performed before writing any code

Read in full: `api/middleware/auth.php` (session + CSRF), `api/models/SeoMeta.php` (the existing
polymorphic `seo_meta` table — reused, not duplicated), `api/models/AdminUser.php`,
`api/lib/audit.php`, `api/lib/response.php`, `api/lib/pagination.php`, `database/migrate.php`
(forward-only, no rollback tooling existed before this pass — see §7), every
`database/migrations/*.sql` file, `api/controllers/ServiceController.php` (the save/publish
pattern every content controller follows), `ServiceEdit.tsx`/`BlogEdit.tsx` (the existing editor
UI pattern), `src/admin/navConfig.ts` + `AdminLayout.tsx` (data-driven nav), `App.tsx`'s admin
route tree, `RichTextEditor` (TipTap, blog content only), `api/routes/api.php`'s full route
table, `AdminRedirects.tsx` + `api/models/Redirect.php` (the existing redirect manager — reused
via its own existing endpoints, not duplicated).

Key finding that shaped the whole design: **every real content table already stores its
title/description/canonical/OG/Twitter/robots/schema fields in one shared, polymorphic
`seo_meta` table**, keyed by `(entity_type, entity_id)` — `entity_type` values are exactly
`'page'`, `'service'`, `'seo_page'`, `'blog_post'`, `'portfolio_project'`. SEO Studio's own
`seo_content_analysis` table reuses these exact same five strings as `content_type`, so an
analysis row's identity lines up 1:1 with its `seo_meta` row with zero translation layer.

## 2. Content-type integration map

| Content type | DB table | Admin editor | Public route | Existing SEO fields | Existing schema | SEO Studio integration | Content available for analysis | Limitations |
|---|---|---|---|---|---|---|---|---|
| Service | `services` | `ServiceEdit.tsx` | `/services/:slug` | `seo_meta` (entity_type=`service`) | `Service`, `BreadcrumbList` (Seo.tsx) | **Full**: in-editor `SeoStudioPanel` (live client-side analysis + save/analyze) | `blocks_json` (structured), `hero_description`, `h1` | None significant |
| Blog post | `blog_posts` | `BlogEdit.tsx` | `/blog/:slug` | `seo_meta` (entity_type=`blog_post`) | `BlogPosting`, `BreadcrumbList` | **Full**: in-editor `SeoStudioPanel` | `content` (raw TipTap HTML), `excerpt` | None significant |
| SEO landing page | `seo_pages` | `SeoPageEdit.tsx` | `/:slug` (root catch-all) | `seo_meta` (entity_type=`seo_page`) | `WebPage`, `BreadcrumbList` | **Analysis only** via `/admin/seo-studio/content/seo_page/:id` (generic `ContentAnalyzer`) — no dedicated in-editor panel yet | `content_sections_json` (structured) | No live client-side preview while editing in `SeoPageEdit.tsx` itself yet — see §9 |
| Portfolio project | `portfolio_projects` | `PortfolioEdit.tsx` | `/portfolio/:slug` | `seo_meta` (entity_type=`portfolio_project`) | `WebPage`, `BreadcrumbList` | **Analysis only**, same as above | `detailed_description` (raw HTML) | Same as above |
| Generic page | `pages` + `page_sections` | `PageEdit.tsx` | `/:slug` | `seo_meta` (entity_type=`page`) | Varies (`AboutPage`/`ContactPage`/`WebPage`) | **Analysis only**, same as above | Best-effort flatten of 14 different `section_type` shapes — see §9 | Extraction is generic, not per-section-type — a `page_sections` row's structure isn't individually understood |
| Venture (9 pages) | *(none — static TS data, `src/data/ventures.ts`)* | *(none — no CRUD editor exists)* | `/our-ventures/:slug` | *(none — hardcoded in React components)* | *(none via seo_meta)* | **Not integrated** | N/A | Genuinely out of scope for this pass: there is no database row, no editor, and no `seo_meta` row to attach an analysis to. Would require a real content-model change (moving Ventures into the CMS) before SEO Studio could analyze them the same way — a larger, separate project. |

## 3. Database (new tables, migration `0015_seo_studio.sql`)

- **`seo_content_analysis`** — one row per `(content_type, content_id)`, the current/latest
  analysis. Scores (`seo_score`, `readability_score`, `overall_score`, `score_status`) are
  **only ever written by `api/lib/seo/scorer.php`** — no API endpoint accepts a raw score value
  from a request body; `PUT /api/admin/seo/content/{type}/{id}` accepts keyphrase/cornerstone/
  language/SEO-metadata fields only, always recomputing scores server-side.
- **`seo_analysis_history`** — append-only, capped at `SEO_ANALYSIS_HISTORY_LIMIT` (20) rows per
  content item via a `DELETE ... WHERE id NOT IN (SELECT ... ORDER BY created_at DESC LIMIT 20)`
  query run on every save — bounded growth, no separate cleanup cron needed.
- **`seo_link_index`** — one row per link *occurrence* (not per page pair), rebuilt for a given
  source item on every save, or in bulk via `POST /api/admin/seo/link-index/rebuild`.
- **`seo_global_settings`** — a simple key/value table (bulk-batch size, stale-cornerstone
  threshold), matching the shape of `site_settings`.

Foreign-content lookups (`content_type`/`content_id`) are validated against a fixed allowlist
(`SEO_CONTENT_TYPES` in `api/lib/seo/rules.php`) on every request — an unknown `content_type`
segment returns `400`, never reaches a query. `seo_cleanup_deleted_content()` is called from
every real content type's `*_admin_delete` controller function (see `ServiceController.php`,
`BlogController.php`, `PortfolioController.php`, `SeoPageController.php`, `PageController.php`)
so deleting content never leaves an orphan analysis/history/link-index row behind.

## 4. Scoring engine

Two implementations, one specification (`docs/SEO_SCORING_SPECIFICATION.md`), both reading the
same numeric constants from `config/seo-scoring-rules.json` at runtime:

- **`api/lib/seo/*.php`** — authoritative. Runs on every save (`PUT
  /api/admin/seo/content/{type}/{id}`), explicit analyze (`POST /api/admin/seo/analyze`), and
  bulk analyze. Has real database access for the three DB-dependent checks (title/description
  uniqueness, slug uniqueness).
- **`src/features/seo-studio/engine/*.ts`** — provisional, runs entirely client-side while
  editing (no network request per keystroke — debounced 500ms, and even then it's pure
  computation, not an API call). The three DB-dependent checks report `unavailable` here by
  default (no live database access from the browser) — this is a documented, deliberate
  difference from the PHP engine's real production behavior, not a bug; see
  `LiveAnalysisContext` in `engine/types.ts`.

**Parity is tested, not assumed**: `npm run test:seo-parity` runs 11 fixtures
(`docs/seo-studio-fixtures/*.json`) through both engines and asserts every one of the 49 checks'
outcomes match exactly, and all three scores are within 1 point — passing on every fixture as of
this writing. See `docs/SEO_SCORING_SPECIFICATION.md` §10 for the exact tolerance rule and why
the 3 DB-dependent checks need a synthetic matching context in the test harness specifically
(not in real usage) to make that comparison fair.

## 5. API endpoints (`api/controllers/SeoStudioController.php`)

All under `admin/seo/*`, all requiring a valid admin session (`require_admin`); every mutating
endpoint (`PUT`/`POST`) additionally requires `require_csrf`. No separate permission system was
built — this project's `admin_users.role` column exists but isn't used for fine-grained
authorization anywhere in the existing codebase either (verified: no controller currently checks
`role`), so SEO Studio follows the same all-authenticated-admins-have-access model as every
other admin feature here, rather than inventing a new permission layer this codebase doesn't
otherwise have.

| Method | Path | Purpose |
|---|---|---|
| GET | `admin/seo/dashboard` | Summary counts for the dashboard cards |
| GET | `admin/seo/content` | Paginated, filterable, searchable cross-type inventory |
| GET | `admin/seo/content/{type}/{id}` | One item's content summary + seo_meta + stored analysis |
| PUT | `admin/seo/content/{type}/{id}` | Save flow: seo_meta + keyphrase/cornerstone/language, re-score if stale, rebuild link index |
| POST | `admin/seo/analyze` | Force a fresh authoritative analysis for one item |
| POST | `admin/seo/analyze-bulk` | One chunk of bulk analysis — see §6 |
| GET | `admin/seo/history/{type}/{id}` | Up to 20 most recent analysis history rows |
| GET | `admin/seo/link-suggestions/{type}/{id}` | Deterministic (token-overlap) internal-link suggestions |
| POST | `admin/seo/link-index/rebuild` | Full link-index rebuild across all published content |
| GET | `admin/seo/orphans` | Published content with zero incoming internal links |
| GET | `admin/seo/duplicates` | Exact-match duplicate titles/descriptions/keyphrases |
| GET/PUT | `admin/seo/settings` | Global SEO Studio settings |
| GET | `admin/seo/reports/export` | Full inventory as CSV |

Response format matches the project's existing convention exactly (`json_success`/`json_error`,
`{success, ...}` shape). Status codes: `400` unknown content type, `401` unauthenticated, `403`
CSRF failure, `404` content not found, `422` validation failure. No stack trace, SQL, or
filesystem path is ever included in a response — every catch block in
`SeoStudioController.php` returns a fixed safe message.

## 6. Bulk analysis (spec §25 — chunked, not a fake background worker)

Shared hosting has practical PHP execution-time limits, and this project explicitly forbids a
persistent Node/background-worker process. `POST /api/admin/seo/analyze-bulk` processes up to
`batch_size` (default 15, max 30) items **synchronously within one request** and returns
`{progress: {total, processed, remaining, nextOffset, status}}` — the **client drives the loop**
(`ContentInventory.tsx`'s "Analyze all stale" button calls the endpoint repeatedly, incrementing
`offset` from the previous response's `nextOffset`, until `status === 'completed'`), showing real
progress between calls. This is an honest, working chunked-processing design — not a
`queued`/`processing`/`completed` *persisted* job-state table with resume-after-crash semantics,
which was designed but not built this pass (see §9's limitations).

## 7. Migration / rollback

`database/migrate.php` (pre-existing, forward-only) applies `0015_seo_studio.sql` the same way
as every earlier migration. This project had **no rollback tooling at all** before this pass —
`database/rollback.php` (new) is a minimal, generic runner: `php database/rollback.php
0015_seo_studio.sql` applies the matching `0015_seo_studio.down.sql` and removes the
`schema_migrations` row. It only works for migrations that ship a `.down.sql` file (0015
onward) — migrations 0001–0014 remain a manual DBA task exactly as before, unchanged by this
addition.

## 8. Security

- CSRF: every mutating endpoint calls `require_csrf($ctx)`, following the exact existing
  pattern.
- SQL: every query in `api/lib/seo/*.php` uses parameterized `PDO::prepare()` — none of the
  inventory/dashboard UNION queries interpolate user input directly (`LIMIT`/`OFFSET` values are
  cast to `int` before string-interpolation into the SQL, since PDO can't parameterize `LIMIT`
  reliably across all MySQL configurations — the existing `Service.php`/`Blog.php` models use
  the identical pattern).
- XSS: check `detail` strings are plain text rendered via React (auto-escaped); nothing here
  renders raw HTML from user input.
- No SSRF surface: this pass does **not** implement live external HTTP link-checking (`broken
  internal links` detection is DB-lookup-based, matching a link's target path against known
  slugs — never an outbound HTTP request to a stored URL) — deliberately, to avoid needing SSRF
  protections this pass doesn't have infrastructure for yet. Documented as a limitation, not
  silently half-built.
- Rate limiting: `api/middleware/rate_limit.php` exists in the project but is not wired into the
  SEO Studio routes specifically this pass — the heaviest endpoint (bulk analyze) is
  self-limiting by its own batch-size cap (max 30 items/request), which bounds worst-case cost
  per request even without an explicit rate limit.
- Audit logging: every mutating action calls `audit_log()` with actions
  `seo_metadata_changed`, `seo_analyzed`, `bulk_analysis_batch`, `link_index_rebuilt`,
  `seo_global_settings_changed` — matching the existing `content_created`/`content_updated`
  action-naming convention.

## 9. Known limitations (honest, not hidden)

- **No dedicated in-editor live panel for SeoPageEdit/PortfolioEdit/PageEdit** — those three
  content types get full server-side analysis via the generic `ContentAnalyzer` page
  (`/admin/seo-studio/content/{type}/{id}`), including keyphrase/cornerstone/metadata editing
  and re-analysis, but not the live-as-you-type client-side score preview `ServiceEdit`/
  `BlogEdit` get. Extending `SeoStudioPanel` into those three editors is straightforward
  (the panel already accepts either `bodyHtml` or `blocks` — `SeoPageEdit`/`PageEdit` just need
  their own state wiring) but wasn't done this pass to keep scope real.
- **Ventures are not integrated at all** — no database row exists for them to attach an
  analysis to (see the integration map).
- **Not all ~80 checks from a maximal spec are implemented** — 49 real, working, tested checks
  across all 7 categories exist; the specific items not yet built are listed exhaustively in
  `docs/SEO_SCORING_SPECIFICATION.md` §6's "not yet implemented" note (keyphrase-in-image-alt,
  synonym distribution, search-intent-alignment scoring, pixel-width SERP preview estimation,
  content-freshness scoring, potential-duplicate-body-content detection beyond exact-match
  title/description, and several others).
- **Bulk analysis is chunked-synchronous, not a persisted job queue** — see §6. No
  `queued`/`processing`/`completed`/`failed`/`cancelled` state survives a closed browser tab;
  the client must stay open and keep calling the endpoint to finish a large "analyze all stale"
  run. For this project's current content volume (~160 items total), one full run completes in
  well under the time a user would keep the tab open regardless.
- **Redirect manager**: extended in the All-Page Integration pass (see §10 below) — 307/308,
  hit tracking, CSV export/import-preview, conflict/destination validation. Loop/chain detection
  already existed (`redirect_creates_loop()`) and was reused, not rebuilt. Slug-change-detection-
  triggers-a-redirect-suggestion (spec §21) is still not implemented — see §10's limitations.
- **Cross-content-type similarity detection is exact-match only** — duplicate titles/
  descriptions/keyphrases are found via exact string equality (a real, useful, conservative
  signal), not a fuzzy/similarity-scored comparison for near-duplicate H1s or body content.
- **Fixtures cover 11 of the 19 named test scenarios** from the spec, not all 19 — the 11 chosen
  are the highest-value, most load-bearing ones (see `docs/SEO_SCORING_SPECIFICATION.md`'s
  testing section for exactly which). Missing: missing-description-only, multiple-H1 (distinct
  from broken-hierarchy), malformed-HTML, duplicate-metadata (as its own isolated fixture —
  covered by the DB-integration-level `seo_find_duplicate_metadata()` query instead, which isn't
  fixture-testable without a real database), orphan-page (same reasoning), redirect-loop
  (belongs to the untouched existing redirect system, not this engine), canonical-conflict
  (partially covered by `unintentional-noindex`'s sibling checks).

---

# Part 2 — All-Page Integration

Builds on Part 1 above (still accurate) without touching the 49-check scoring engine — every
check ID, weight and threshold in `docs/SEO_SCORING_SPECIFICATION.md` is unchanged, confirmed
by `npm run test:seo-parity` still passing on all of Part 1's original 11 fixtures.

## 10. SEO Document Registry (`seo_documents`, `api/lib/seo/documents.php`)

One row per legitimate public route — the missing piece from Part 1, where static React pages
and Venture pages had no admin-side representation at all. Ownership is explicit and does not
create a competing source of truth for anything that already had one:

| Concern | Owner (unchanged) |
|---|---|
| Which routes are valid, what HTTP status they should return | `api/lib/route_manifest.php` |
| Which content is published, its real field values | The 5 CMS tables + `seo_meta` |
| Generated sitemap output | `api/sitemap.php` |
| **Optimization/metadata *association* for every route, including route-only ones** | `seo_documents` (new) |

`seo_sync_registry($pdo, $dryRun)` discovers documents from `static_public_routes()` (route
manifest — the same static+Venture route list Phase 3's prerender script and Phase 1's sitemap
already trust) and from the existing 5-table UNION query (`seo_inventory_union_sql()`, already
built in Part 1 for the "All Content" inventory). It is a pure upsert keyed on the **stable**
`document_key` — never a delete. A document whose source disappears (e.g. a deleted blog post)
is marked `is_published = 0`, not removed, so its analysis history and any owner notes survive
until a human reviews it (spec §4: "do not delete records automatically when ownership is
unclear").

### Stable keys (spec §3)

`seo_document_key()` — `service:{id}`, `blog:{id}`, `seo-page:{id}`, `portfolio:{id}`,
`page:{id}` for real content (based on the immutable database id, never the slug, so a slug
change can never fork into a second document); `venture:{slug}` for Ventures (the slug is the
only stable identifier a route-only Venture page has); `static:{route}` for ordinary static
pages (e.g. `static:about`, `static:home` for `/`); `collection:blog` / `collection:portfolio`
/ `collection:ventures` for the three listing-hub pages specifically, matching the spec's own
examples exactly.

### Route-only documents and `seo_meta`

Static/Venture documents have no database row, so there's nowhere for their SEO fields to live
under the existing `entity_type`/`entity_id` scheme. Rather than a second metadata table
(explicitly forbidden — spec §5), `seo_ensure_document_seo_meta()` creates one `seo_meta` row
per route-only document with `entity_type = 'seo_document'`, `entity_id = seo_documents.id` —
the pre-existing `UNIQUE KEY uq_seo_meta_entity (entity_type, entity_id)` on that table already
guarantees exactly one metadata row per document with zero new uniqueness mechanism.
`seo_meta_entity_type_for()` is the one function every caller uses to resolve which
`entity_type` a given `content_type` actually needs — real content types pass through
unchanged; `static_page`/`venture` always resolve to `'seo_document'`.

`seo_meta.document_id` (new nullable column, migration `0016_seo_documents.sql`) associates
every `seo_meta` row — real and route-only — with its `seo_documents` row, backfilled via
`seo_backfill_seo_meta_associations()` (a single `UPDATE ... JOIN`, safe to run repeatedly,
only ever fills a currently-`NULL` value). No existing `entity_type`/`entity_id` lookup
anywhere in the codebase (every pre-existing controller) needed to change — `document_id` is
purely additive.

## 11. Metadata resolution (spec §6)

For real content, resolution is unchanged from Part 1 and was already correct: one `seo_meta`
row per entity, read by exactly one public controller endpoint, rendered by exactly one
`<Seo>` component call — structurally impossible to emit two titles/canonicals/etc. because
there was only ever one source to begin with.

**Important, honestly-documented gap**: static React pages (Home, About, Contact, etc.)
currently render their `<Seo title="..." description="..." />` props **hardcoded in their own
component source**, not read from `seo_meta` at all. SEO Studio's new static-page editing
(via `/admin/seo-studio/content/:documentId` for a `static_page`/`venture` document) writes to
the route-only `seo_meta` row described in §10, and that value is fully visible, scored, and
SERP-previewed in the admin — but **it does not yet override what the public page actually
renders**. Wiring that up means adding a metadata-override fetch to each static page's `<Seo>`
call, which touches the live, already-approved public rendering pipeline — out of scope for
this pass given the standing instruction across every phase of this project to not change public
content/behavior without explicit need. This is the single most important limitation in this
part of the work and is called out here plainly rather than implied to be already live.

For **database-backed content** (service/blog/seo_page/portfolio/page), no such gap exists —
those already read `seo_meta` live (Part 1, and earlier SEO-implementation phases), so editing
via SEO Studio's registry-based generic editor has exactly the same real effect as editing via
each type's own dedicated admin page, because both paths write to the identical `seo_meta` row.

## 12. Full integration: SEO landing pages, Portfolio, Pages (spec §7–9)

`SeoStudioPanel` (Part 1) is now embedded in `SeoPageEdit.tsx`, `PortfolioEdit.tsx`, and
`PageEdit.tsx` — the exact same integration pattern as `ServiceEdit.tsx`/`BlogEdit.tsx`: new
keyphrase/related-keyphrases/language/cornerstone state, a `contentDetail()` fetch on load, and
a chained `seoStudioApi.saveContent()` call after each editor's own existing save succeeds. No
new content form was created; each editor's existing save flow, validation, and content fields
are completely unchanged. This means **all 5 real content types now have full live-editor SEO
Studio integration** — "analysis only" no longer describes any of them.

`SeoPageEdit`'s content passed to the panel is its `sections: ContentSection[]` array (walked by
the same `seoExtractBlocks()` used server-side); `PortfolioEdit`'s is `detailed_description`
(raw HTML, same `seoExtractHtml()` path as blog posts); `PageEdit`'s is its parsed
`sectionsJson` (best-effort, same generic-block-walk limitation already documented in Part 1
§9 for the Pages module — this pass didn't add per-`section_type` parsing).

## 13. Static and Venture analysis: real content, not fabricated (spec §10–11, §15)

For `static_page`/`venture` documents, `seo_load_virtual_content_row()` reads the **build-time
prerendered HTML** for that route — `dist/{route}.html`, Phase 3's own output, generated by
`scripts/prerender.mjs` from the real React component tree — via the same `seo_extract_html()`
already used for blog/portfolio content. This is real, currently-live page content, obtained
with zero network requests and zero live crawling of the public site (spec §15's explicit
requirement). If no prerendered file exists yet (e.g. `npm run build:prerender` hasn't run since
the last content change), the row still loads with empty body/heading/image/link fields —
content/readability/links/images checks correctly degrade to `failed`/`unavailable` rather than
fabricating a pass. `seo_read_prerendered_html()` resolves the path defensively (`realpath()` +
a prefix check) so a crafted route value can never escape `dist/` — a real path-traversal guard,
not just documentation.

Venture pages deliberately get **no forced primary-keyword injection** — `primaryKeyphrase`
comes only from what an admin explicitly sets for that Venture's own document, same as every
other content type; nothing in this pass biases Venture keyphrases toward Shrinath Solutions'
own service terms (verified: `seo_page_type_for_route()` only ever returns a *profile* — content
expectations like word-count floor and schema type — never a keyword).

## 14. Generic document editor (spec §12)

`/admin/seo-studio/content/:documentId` (`ContentAnalyzer.tsx`) is now the primary way to reach
any document's analyzer — resolves via `GET /api/admin/seo/documents/{id}`, which returns the
document row (route, source, `content_editable`, `prerender_status`, etc.) alongside the same
content/seo/analysis payload the original `{type}/{id}` route already returned. The legacy
`/admin/seo-studio/content/:contentType/:contentId` route still works unchanged (different
segment count, no route collision) — `ContentInventory.tsx`'s existing links keep working
without modification. `content_editable: false` correctly hides the "Edit Content" link and
shows "View Source Content: not editable" instead (spec: "Do not show an Edit Content button
when the content is not editable... Use 'Edit SEO' and 'View Source Content' labels accurately").

## 15. Dashboard/inventory completeness (spec §13)

`seo_inventory_union_sql_with_virtual()` extends the existing 5-table UNION with a 6th branch
reading `seo_documents` directly for `static_route`/`venture_data` source types (content_id =
the document's own id, consistent with §10's scheme) — every dashboard count, every "All
Content" row, and bulk analysis now include static and Venture pages, not only database content.
New inventory filters: status (published/draft), indexable/noindex, missing metadata, missing
keyphrase (orphan and content-type/score-status filters already existed from Part 1). New
dashboard panel: a manifest-vs-registry diagnostic (`GET
/api/admin/seo/registry/diagnostics`) showing route counts on both sides and exactly which
manifest routes are missing from the registry — the spec §27 cross-check, surfaced directly in
the UI rather than only as a report a developer would have to query for.

## 16. Prerender lifecycle (spec §16)

`seo_documents.prerender_status` (`current`/`stale`/`building`/`failed`/`not_applicable`) is
updated by `seo_mark_document_stale()`, called after every successful save. For database content
this correctly means "the live page's prerendered HTML no longer matches what was just saved" —
`stale`. For static/Venture content it's always `not_applicable`, not `stale`, because (per §11)
saving their metadata doesn't yet feed into what gets prerendered at all — marking it `stale`
would imply a rebuild would fix something it can't yet fix. **Nothing in this codebase
automatically flips a document back to `current`** — that would require the build itself
(`npm run build:prerender`) to report success back to the database, which means either running
PHP during the Node build or a separate manual "mark rebuilt" step; neither was wired up this
pass. The documented, correct workflow today: after running `npm run build:prerender` and
deploying, an admin can treat the dashboard's stale list as resolved by re-running **Analyze all
stale**, which re-hashes content and naturally reflects the new state — but the `prerender_status`
column itself stays `stale` until a future pass adds that build-to-database feedback loop. This
is stated plainly as a known gap, not glossed over.

## 17. Redirect Manager completion (spec §18–19)

Extended the existing `redirects` table and `RedirectController.php` in place — no second
redirect engine. `redirect_type` ENUM widened to `301`/`302`/`307`/`308`; new `hit_count`,
`last_hit_at`, `last_referrer` columns. `record_redirect_hit()` is a single atomic
`UPDATE ... SET hit_count = hit_count + 1` per lookup — no buffering/queue layer, because this
project's traffic scale doesn't need one (documented reasoning, not an oversight); it's wrapped
in try/catch at the call site (`redirects_public_lookup`) so a tracking failure degrades to a
silently-logged `error_log()` call, never a broken redirect response (spec §19's explicit
requirement). `last_referrer` stores only host+path (via `parse_url`), never a query string, to
avoid capturing anything sensitive a referrer URL might carry.

New validation in `validate_redirect_input()`: `redirect_source_conflicts_with_live_route()`
rejects creating a redirect for a source URL that's a real, currently-published page (would
break a working page); `redirect_destination_is_safe()` rejects non-http/https schemes outright
and requires an explicit `allow_external: true` flag for any destination host other than
`shrinathsolutions.com`/`www.shrinathsolutions.com` (no open redirects by default). Loop/chain
detection (`redirect_creates_loop()`) already existed and was reused unchanged.

CSV: `GET /api/admin/redirects/export` streams every field including the new hit-tracking
columns. Import is two-phase and never trusts the file directly — `POST
.../import-preview` (multipart upload) parses and runs every row through the *exact same*
`validate_redirect_input()` the single-add form uses, returning a per-row valid/invalid preview
with zero database writes; `POST .../import-apply` creates only the rows the admin explicitly
approved (re-validated again at write time, since state may have changed since the preview).
Both CSV export functions (`redirects_admin_export`, `seo_studio_reports_export`) run every
cell through a new shared `csv_safe()` helper (`api/lib/response.php`) that neutralizes CSV
formula injection (a leading `=`/`+`/`-`/`@`/tab/CR gets a literal-text-forcing `'` prefix).

**Not implemented**: slug-change automatically suggesting a redirect (spec §21) — designed
(the registry already knows a document's previous vs. current route via `route_path` diffing,
which isn't wired into the editor save flow yet), not built this pass.

## 18. External link checking (spec §20)

**Not implemented.** No PHP cURL-based external link checker was built. Building one *safely*
(SSRF protection, DNS/private-IP blocking, redirect revalidation, timeouts, rate limiting) is
real, non-trivial security-sensitive work that the spec itself gates behind "only after full
document integration works" and permits leaving unavailable if it can't be done securely in
scope. Given the size of everything else in this pass, it was left undone rather than shipped
half-secured — `links.internal_count`/`links.incoming_count`/etc. (Part 1) already work via
DB-lookup matching, never a live HTTP request, so no check in the engine silently depends on
this being built.

## 19. Permissions (spec §21)

**Not implemented as granular permissions.** As documented in Part 1 §5, this project has no
fine-grained permission system anywhere (`admin_users.role` exists but is unchecked by any
controller) — SEO Studio's new endpoints (registry sync, document save, redirect CSV
import/export) follow the same all-authenticated-admins-have-access model as every other admin
feature, via `require_admin()`. Building `seo.view`/`seo.edit_metadata`/etc. as real, enforced
permissions would require adding a permission system to the whole admin panel first (a much
larger, separate change affecting every existing controller, not something safely scoped to
SEO Studio alone) — documented here as a real gap, not silently skipped.

## 20. Testing performed this pass

- `npx tsc --noEmit` — clean throughout.
- `npm run build` — succeeds; confirmed via `dist/index.html` and `dist/assets/` that
  `SeoStudioPanel`, `ContentInventory`, `ContentAnalyzer`, `Redirects` are all separate lazy
  chunks not referenced from the initial script tag — no public-bundle regression.
  Shared entry chunk: 296.31 KB raw / 92.31 KB gzip (Phase 3 baseline: 295.10 KB / 92.00 KB —
  a ~1 KB delta from the new lazy-loaded imports' shared glue code, not the SEO Studio code
  itself, which stays in its own chunks).
- `npm run build:ssr && npm run prerender` — 159/159 routes still prerender correctly; Phase 3
  is completely unaffected by this pass's changes.
- `npm run test:seo-parity` — 13/13 fixtures pass (Part 1's original 11 + 2 new: a homepage
  static-page scenario and a Venture-page scenario), confirming the 49-check engine and its
  page-type-profile handling are correct for the two new content types added this pass, with
  zero change to any existing check's logic or any threshold.
- `php -l` — clean across the entire `api/` tree.
- Dry-run smoke tests (stub PDO, no live database available in this environment — same
  constraint as every prior phase) of `seo_sync_registry()`, `seo_registry_diagnostics()`, and
  `seo_document_key()` — all produced correct, sane output (28 static/Venture routes
  discovered; document keys matching the spec's own examples exactly:
  `venture:shrinath-rubber-stamp`, `static:about`, `service:42`).
- **Not run** (requires a live MySQL database, unavailable in this environment — consistent
  with every prior phase's documented constraint): the actual migration against real data,
  backfill counts against real rows, a real registry sync against production content, redirect
  hit-tracking against real traffic, CSV import against a real file end-to-end. These are
  described precisely enough in `docs/SEO_STUDIO_DEPLOYMENT.md` for the site owner to run and
  verify directly.

## 21. Remaining limitations (Part 2, honest, not hidden)

- Static-page metadata edits are not yet live on the public site (§11) — the single most
  important gap in this part of the work.
- `prerender_status` never automatically returns to `current` — no build-to-database feedback
  loop exists yet (§16).
- No granular permissions (§19), no external link checking (§18), no slug-change redirect
  suggestions (§17's "not implemented" note).
- Duplicate/similarity detection remains exact-match only (Part 1, unchanged).
- Bulk analysis remains client-driven chunked processing, not a persisted/resumable job queue
  (Part 1 §6, unchanged, now also covering static/Venture documents via
  `seo_inventory_union_sql_with_virtual()`).
- Registry sync's `seo_display_name_for_route()` reads a prerendered file's `<title>` tag as a
  document's display name when a static/Venture route hasn't been explicitly named — reasonable
  but means a document created before its first `npm run build:prerender` run gets a generic
  fallback name (its own document key) until prerendering has happened at least once.

---

# Part 3 — Live Metadata Resolution & Production Readiness

Closes Part 2 §11's most important gap: saved static/Venture SEO metadata now genuinely
overrides what the public site renders and prerenders, not just what the admin panel shows.
Adds a minimal permission layer, redirect-manager verification, and honest migration-testing
documentation. The 49-check scoring engine (`api/lib/seo/checks.php`,
`api/lib/seo/scorer.php`, and their TS mirrors) was **not touched** — confirmed via
`npm run test:seo-parity` (13/13, unchanged) before and after this pass.

## 22. Authoritative metadata resolver

**One new read path, not a new metadata store.** `api/lib/seo/public_resolve.php`'s
`seo_resolve_public_override($pdo, $routePath)`:

1. Normalizes the route (`seo_normalize_route()` — the same function the registry already
   uses, so a route is matched identically everywhere).
2. Looks up `seo_documents` by `route_path` — the registry's job, exactly as designed: route
   ownership only, never metadata storage.
3. **Only proceeds for `static_page`/`venture` documents.** Database-backed content
   (service/blog/seo_page/portfolio/page) returns `null` immediately — those already resolve
   their real `seo_meta` row through their own existing public controller endpoints
   (`services_public_detail`, etc.), which *is* "priority 1: saved SEO Studio document
   metadata" for them already, since a database document's `seo_meta` row and its SEO Studio
   association are the literal same row (Part 2 §10). Querying this endpoint for dynamic
   content would be a redundant second read of identical data, not a different resolution —
   confirmed this is genuinely a no-op for dynamic routes via a real test (§26 below).
4. Resolves the associated `seo_meta` row via `entity_type = 'seo_document'`
   (`get_seo_meta($pdo, 'seo_document', $doc['id'])` — the exact association Part 2 §10 set up).
5. Returns `null` if nothing meaningful was ever saved (every text field empty AND robots at
   its default) — so "no override" degrades to nothing being sent over the wire, not an empty
   object.

**Final resolution order, as actually implemented:**

```
Database content (service/blog/seo_page/portfolio/page):
  1. seo_meta row (== the SEO Studio document's own association — same row, not two sources)
  2. Hardcoded fallback text in the page component (only reached if seo_meta has no value)

Static/Venture content:
  1. seo_meta row associated via seo_documents (entity_type='seo_document') — fetched via
     GET /api/public/seo-document?route=X, merged client/build-side with `??`
  2. Hardcoded fallback text in the page component (unchanged, still there, still correct)
```

There was never a distinct "priority 3: route-defined metadata" layer to build for database
content, and "priority 4: safe global fallback" is simply each page's own already-existing
hardcoded text — no new fallback layer was needed for either case.

## 23. Wiring: 10 files cover every named route

Rather than touching every static page file individually, this pass found and used the
existing consolidation points:

- **`src/pages/ServicePage.tsx`** — the shared template already used by `About.tsx`,
  `WebsiteDesigning.tsx`, `OnlineMarketing.tsx`, `SeoServices.tsx`, `HotelDigitalMarketing.tsx`,
  `ChannelManager.tsx` (Hotel Technology), and `CaseStudy.tsx` — **one edit, seven routes
  covered**, including the spec's explicitly named Hotel Technology route.
- **`src/pages/VentureDetail.tsx`** — the shared component for all 9 Venture detail pages —
  **one edit, nine routes covered**.
- **`Home.tsx`, `Contact.tsx`, `Pricing.tsx`, `Services.tsx`, `Portfolio.tsx`, `Blog.tsx`,
  `OurVentures.tsx`, `SeoAuditTool.tsx`** — one edit each (the Homepage, Contact, Pricing,
  Services collection, Portfolio collection, Blog collection, Our Ventures collection, and SEO
  Audit Tool routes named explicitly in spec §3).

Every one of the spec's named routes is covered. `SeoAuditTool.tsx` already had its own
CMS-copy override (`pageSeo`, fetched from `/api/public/seo-pages/seo-audit-tool` in an earlier
phase) — the new `useSeoOverride` result is layered on top with higher priority
(`seoOverride?.title || pageSeo?.meta_title || hardcodedDefault`), so both mechanisms coexist
correctly rather than one replacing the other.

**Not wired**: `SeoCompanyJaisalmer.tsx`, `SitemapPage.tsx`, `Legal.tsx` (privacy/terms) — same
pattern applies (`useSeoOverride('/path')` + prop merge), not done this pass to stay within
scope; these three routes still work exactly as before, just without the new override layer.

**A known, accepted tradeoff**: `ServicePage.tsx` is also used by `DynamicServicePage.tsx` (the
real CMS-driven `/services/:slug` route). The hook fires there too, correctly resolving to
`null` (confirmed — see §26), at the cost of one harmless extra network request on dynamic
service-page loads specifically. Splitting the static and dynamic callers to avoid this would
have meant touching all 7 static callers individually instead of one shared file — not worth it
for one avoidable request on one route family.

## 24. `useSeoOverride` — reuses Phase 3's infrastructure, invents nothing new

`src/hooks/useSeoOverride.ts` is a five-line wrapper around **Phase 3's existing**
`useRouteData`/`consumeInitialData`/`loadX` pattern (`src/loaders/seoOverrideLoader.ts` is a
new loader, but follows the identical shape every other loader in `src/loaders/` already has).
This means, with zero new hydration/SSR machinery:

- **In the browser**: synchronous on first render if the prerendered page embedded a result
  for this exact route (no fetch, no flicker); a real `fetch` otherwise (e.g. client-side
  navigation to a static route, or a route that hasn't been prerendered yet).
- **At build time** (`src/entry-server.tsx`): the `'static'` classification branch now also
  calls `loadSeoOverride(path, { baseUrl: apiBaseUrl })` before rendering, embeds a
  successful, non-null result via the same `__PRERENDER_ROUTE_DATA__` /
  `serializeInitialData()` mechanism dynamic routes already use, and swallows any fetch
  failure silently (a static page must never fail to prerender because the *optional*
  metadata lookup failed — confirmed via a real test against the live production site, where
  the new endpoint doesn't exist yet and every static route still prerendered its normal
  hardcoded content with zero errors, §26).

## 25. Canonical safety (`sanitizeCanonicalOverride`, `src/components/Seo.tsx`)

`Seo.tsx` gained one new optional prop, `canonicalOverride`, and one new exported function,
`sanitizeCanonicalOverride(candidate, fallbackUrl)`, used for both the public-facing
`<link rel="canonical">` and `og:url` (previously `og:url` used the raw path-derived URL even
when a canonical override existed — a real duplicate-metadata risk fixed in the same pass, not
left inconsistent). Rules, each verified against a real adversarial input (§26):

| Input | Result |
|---|---|
| `/relative-path` | Accepted — resolved against the same origin as the page's own URL |
| `https://shrinathsolutions.com/x` | Accepted — same host, https |
| `http://shrinathsolutions.com/x` | **Rejected** — wrong scheme |
| `https://evil.com/x` | **Rejected** — different host (prevents cross-document/cross-site canonical injection) |
| `javascript:alert(1)` | **Rejected** — dangerous scheme |
| `https://user:pass@shrinathsolutions.com/x` | **Rejected** — embedded credentials |
| `https://shrinathsolutions.com/x\r\nSet-Cookie: evil=1` | **Rejected** — control characters (header-injection vector) |

Any rejection silently falls back to the normal path-derived canonical — an invalid saved
override can never break a page or produce unsafe output, only fail to apply.

Robots handling: the override object only ever exists (non-null) when something was actually
saved (see §22 point 5) — when present, `robots` is computed as
`` `${robotsIndex ? 'index' : 'noindex'}, ${robotsFollow ? 'follow' : 'nofollow'}` `` and passed
through; when absent, the page's own hardcoded `robots` default (or `Seo.tsx`'s own
`'index, follow'` default) is used unchanged — an intentional noindex page that has no SEO
Studio override keeps behaving exactly as it did before this pass.

## 26. Verified, not assumed — the real tests run this pass

No live database was available in this environment (confirmed again — see §29). Everything
below was verified by other means that don't require one:

- **Raw-HTML round trip (acceptance criteria #1 and #2)**: a temporary local mock of
  `GET /api/public/seo-document` (returning a fixed test override for `/about` and
  `/our-ventures/shrinath-rubber-stamp`) was pointed at by `PRERENDER_API_BASE_URL`, and
  `renderRoute()` was called directly for both routes. **The raw generated `<title>` tag for
  both routes showed the test override value, not the page's hardcoded default** — proof the
  full chain (loader → build-time fetch → embedded `__ROUTE_DATA__` → `useSeoOverride` →
  `Seo.tsx` → `renderToString` output) genuinely works, not merely "saved in the admin". Both
  test files were temporary and deleted after the run — not part of the shipped code.
- **Dynamic-content regression**: with the same mock server running, `/blog/professional-
  website-business-growth` still rendered its real title and content, with zero
  `TEST-OVERRIDE` contamination — confirms the override mechanism genuinely doesn't touch
  dynamic routes.
- **Graceful degradation against the real (undeployed) production site**: a full
  `npm run prerender` run (159/159 routes) was executed with `PRERENDER_API_BASE_URL` pointed
  at the actual live site, where `/api/public/seo-document` doesn't exist yet (returns 404 —
  confirmed directly with `curl`). Every static route still prerendered correctly with its
  normal hardcoded title and **no `__ROUTE_DATA__` script tag was embedded** (since the failed
  fetch correctly produced no override) — proof the new code path fails safely against a real
  environment that hasn't deployed it yet, not just in a mocked success case.
- **Canonical sanitizer**: the 7-row table in §25 was run against the real function via a
  temporary esbuild-bundled Node import, every row producing the documented result.
  Same for the redirect destination-safety function (`redirect_destination_is_safe` — internal
  path/same-site accepted, external-without-flag rejected with a clear message, external-with-
  `allow_external` accepted, `javascript:` rejected regardless of the flag).
- **Permission resolution**: `seo_user_has_permission()` — the existing `'admin'` role
  confirmed to hold all 8 capabilities; an unrecognized role (`'editor'`, standing in for any
  future non-admin role) confirmed to hold *zero* — the secure-default behavior spec §9
  requires, verified directly, not just asserted.
- **Registry/prerender-marking functions**: `seo_sync_registry()` (dry run), `seo_registry_
  diagnostics()`, `seo_mark_document_current_if_matching()`, and `seo_resolve_public_override()`
  all smoke-tested against a stub PDO — no fatals, correct safe-null/no-op behavior when no
  data exists.
- **Full pipeline**: `npx tsc --noEmit` clean, `php -l` clean across the entire `api/` tree,
  `npm run build` succeeds (confirmed via `dist/index.html` that no SEO Studio chunk is
  referenced — public bundle regression check passes), `npm run build:ssr && npm run
  prerender` still produces 159/159 real routes (unchanged count — not hardcoded, genuinely
  re-verified by re-running the real pipeline), `npm run test:seo-parity` still 13/13.

## 27. Permission model (`api/lib/seo/permissions.php`)

A static, versioned capability map — the smallest design that's still genuinely
server-enforced. `admin_users.role` (VARCHAR(50), default `'admin'`) already existed but was
checked by zero controllers anywhere in this codebase before this pass (re-confirmed this
audit). `SEO_ROLE_PERMISSIONS['admin']` grants all 8 capabilities — explicit, documented,
exactly the "current admins receiving explicitly documented permissions" the spec asks for, not
an implicit blanket bypass. Any role not in the map (a typo, or a role introduced later without
updating this file) gets **zero** permissions — the secure default, verified in §26.

Every mutating SEO Studio and Redirect Manager endpoint now calls `require_permission($pdo,
$ctx, '<capability>')` immediately after `require_admin()`/`require_csrf()`, before any
resource lookup (so a `403` never leaks whether the target document/redirect exists — spec:
"do not reveal whether inaccessible document IDs exist"). The save endpoint
(`seo_studio_content_save`) is graduated: `seo.edit_metadata` always; `seo.edit_advanced`
additionally required only when the request body actually changes `canonical_url`,
`robots_index`, or `robots_follow`; `seo.manage_schema` additionally required only when the
body includes a `schema` key — matching the spec's operation table exactly, without needing
separate endpoints per field group.

| Operation | Permission | Enforced in |
|---|---|---|
| View SEO Studio (dashboard, inventory, document detail, history, diagnostics, orphans, duplicates, settings-read, report export) | `seo.view` | `SeoStudioController.php`, `RedirectController.php` (list/export) |
| Run analysis | `seo.analyze` | `seo_studio_analyze` |
| Edit title/description/social fields | `seo.edit_metadata` | `seo_studio_content_save` (baseline) |
| Edit canonical/robots/indexability | `seo.edit_advanced` | `seo_studio_content_save` (conditional) |
| Edit schema | `seo.manage_schema` | `seo_studio_content_save` (conditional) |
| Create/import/delete redirects | `seo.manage_redirects` | `RedirectController.php` (create/update/delete/import-preview/import-apply) |
| Registry sync, bulk analysis, link-index rebuild, mark-prerendered | `seo.run_bulk` | `seo_studio_registry_sync`, `seo_studio_analyze_bulk`, `seo_studio_link_index_rebuild`, `seo_studio_mark_prerendered` |
| Global SEO Studio settings | `seo.manage_settings` | `seo_studio_settings_update` |

`require_permission()` also writes a `seo_permission_denied` audit-log row on every denial
(admin identity, the permission that was missing, and safe entity context — never the request
body).

**Frontend note**: no frontend permission-gating UI was added this pass (every current admin
has every permission, so there is nothing to visibly gate yet) — noted as a small follow-up
once a second, lower-privileged role actually exists to test against; the backend enforcement
above is real and complete regardless.

## 28. Prerender lifecycle — closing the loop without DB access in the build

Extends Part 2 §16 exactly as designed there, now implemented:

1. **Save marks stale, records why** — `seo_mark_document_stale()` (Part 2, unchanged) sets
   `prerender_status = 'stale'` (dynamic content) or `'not_applicable'` (static/Venture — their
   prerendered HTML is now genuinely affected by a save, so this pass changes their status to
   `'stale'` too — see the fix below) and records the new `content_hash`.
   - **Bug found and fixed this pass**: `seo_mark_document_stale()` still marked static/Venture
     documents `'not_applicable'` unconditionally, carrying over Part 2's reasoning from
     *before* this pass made their metadata genuinely live. Left uncorrected, a static-page
     save would never surface in the dashboard's stale-route report even though a real rebuild
     is now genuinely required. Fixed: static/Venture documents are now `'stale'` after a save,
     exactly like dynamic content.
2. **`npm run build:prerender` runs as documented** (Phase 3, unchanged — verified this pass
   this is still its real, current name via `package.json`) and now additionally writes
   `prerender-report.json` (project root, gitignored, deliberately *not* inside `dist/` since
   `deploy.yml` ships `dist/` wholesale and this file has no reason to be public) — a plain
   list of every route that got real, successfully-rendered HTML.
3. **`php scripts/apply-prerender-report.php`** (new, run server-side after deploying — never
   from the Node build itself, so no database credentials are ever given to the build
   environment) reads that report and, for each route, calls
   `seo_mark_document_current_if_matching()`: re-runs the *exact same* analysis the save flow
   uses to compute the document's current content hash, and marks it `'current'` **only if**
   that matches what's already stored — if the document was edited again after the build
   started, it correctly stays `'stale'` rather than lying.
4. **`POST /api/admin/seo/documents/{id}/mark-prerendered`** (new, `seo.run_bulk`-gated) exists
   as a manual, admin-triggered alternative to the CLI script for one document at a time — same
   hash-matching safety rule, useful if CLI access isn't convenient for a given deploy.

Supported states unchanged: `current`/`stale`/`building`/`failed`/`not_applicable`
(`'building'` is defined in the schema but nothing sets it yet — no in-progress-build signal
exists from this pass's synchronous build process; a genuine gap, not an oversight, listed in
§30). Admin UI display of "Saved SEO version / Prerendered SEO version / Last successful
prerender / Rebuild required / Failure reason" was **not added this pass** — the underlying data
(`content_hash`, `prerender_hash`, `prerender_status`) is all present and queryable
(`GET /api/admin/seo/documents/{id}`), but no new UI panel renders it yet; a scoped, low-risk
follow-up.

## 29. Migration testing — honestly not performed, and why

**No MySQL server is available in this environment** (re-confirmed this pass: `which mysql
mysqld mariadb` all report not found; `php -m` shows `pdo_mysql`/`mysqli` are compiled in, so
PHP itself is ready, but there is nothing for it to connect to). Per the explicit instruction
not to claim migration success without running it, this pass does **not** claim `0015`, `0016`,
or any new migration were tested against a representative database, because they were not.

What **was** verified without a database:
- `php -l` on both `.sql`-adjacent PHP tooling files (`database/migrate.php`,
  `database/rollback.php`, `scripts/apply-prerender-report.php`) — clean.
- Manual read-through of `0015_seo_studio.sql`, `0016_seo_documents.sql`, and their
  `.down.sql` pairs for internal consistency (column additions match what the `.down.sql`
  drops, in reverse order; foreign keys reference tables created earlier in the same file).
- The stub-PDO functional tests in §26 exercise the *application logic* that would run against
  real data, just not the schema/constraints themselves.

**No new migration was needed or created this pass** — every requirement (canonical override
support, permission enforcement, prerender-report application) was implementable entirely in
PHP/TypeScript logic against the schema `0016_seo_documents.sql` already established; there was
no genuinely new column or table required. (`0016`'s existing `content_hash`/`prerender_hash`/
`prerender_status` columns and the `seo_meta.document_id` association already covered
everything this pass needed.)

**Exact commands required to actually perform this testing**, for whoever has MySQL access:

```bash
# 1. Create a throwaway representative database (never production):
mysql -u root -p -e "CREATE DATABASE shrinath_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Point api/config/config.php (or DB_HOST/a temporary copy) at it, then:
php database/migrate.php               # forward: 0001 through 0016 in order
# ... seed representative data (database/seed_*.php scripts, or a real anonymized export) ...
php database/rollback.php 0016_seo_documents.sql   # rollback: 0016 only
php database/migrate.php               # reapply: 0016 goes back in cleanly

# 3. Manually verify per spec §11/§24: existing seo_meta rows preserved, a registry sync
#    backfills document_id correctly, re-running sync produces no duplicates, a slug change on
#    a real row doesn't fork its document_key, deleting a content row correctly flags its
#    document unpublished (not deleted) via seo_cleanup_deleted_content().
```

This is a real, safe, documented procedure — not performed here because the database it needs
does not exist in this environment, exactly as the instructions anticipated.

## 29a. Sitemap/registry diagnostic coverage — reviewed against the ownership table

`seo_registry_diagnostics()` (`api/lib/seo/documents.php`) reads the manifest, registry, and
redirects tables and reports (never writes to) discrepancies — it stays a diagnostic, not a
fifth route source, consistent with the ownership table (manifest=routes, CMS=content,
registry=metadata-association, sitemap=generated output). This pass reviewed it against the
full check list and extended it with the checks that were genuinely missing and cheap to add
correctly:

| Check | Status |
|---|---|
| Manifest route missing from registry | Already implemented (`manifestRoutesMissingFromRegistry`) |
| Unpublished/orphaned document in registry | Already implemented (`unpublishedInRegistry`) |
| Duplicate normalized route in registry | **Added this pass** (`duplicateNormalizedRoutes`) |
| Noindex route registered | **Added this pass** (`noindexRegisteredCount` — informational count; an intentional noindex page isn't an error, per §6, so this is a count to review, not a red flag by itself) |
| Redirect source overlapping a published registry route | **Added this pass** (`redirectSourceOverlap` — a real contradiction: the redirect fires before the page is ever reached) |
| Published route missing canonical | **Added this pass** (`publishedMissingCanonical` — informational; a missing explicit canonical still falls back to the route's own URL via `Seo.tsx`, so this is a "nothing set" count, not necessarily broken) |
| Canonical conflict (two documents sharing one canonical) | **Not a diagnostic query** — `seo_meta.canonical_url` carries a `UNIQUE` constraint since `0005_content_shared.sql`; the database itself makes this state impossible rather than something to detect after the fact |
| Deleted route still registered | **Not added this pass** — requires cross-referencing every dynamic content type's live existence per document, more invasive than the other checks; `seo_cleanup_deleted_content()` (Part 2) already unpublishes a document when its underlying content row is deleted, which covers the practical case (a stale *published* entry can't survive a real deletion); a document that's merely unpublished-and-stale is already caught by `unpublishedInRegistry` |

The admin dashboard (`src/admin/pages/seo-studio/Dashboard.tsx`) now surfaces all three new
list-valued checks (duplicate routes, redirect overlap) as warnings and the two counts
(noindex-registered, missing-canonical) as plain figures — `RegistryDiagnostics`
(`src/features/seo-studio/api.ts`) extended to match. Verified via `npx tsc --noEmit` (clean)
and `php -l api/lib/seo/documents.php` (clean); not exercised against a live database for the
same reason noted throughout §29 — the SQL was reviewed directly against each table's real
column names in `database/migrations/0005_content_shared.sql` and `0016_seo_documents.sql`.

## 30. Remaining limitations (Part 3, honest, not hidden)

- **Migration testing against a real database was not performed** — see §29, the single most
  important gap in this part of the work, stated plainly per the explicit instruction not to
  claim otherwise.
- **`'building'` prerender status is defined but never set** — no in-progress-build signal
  exists.
- **No admin UI panel for "Saved vs Prerendered SEO version / Rebuild required"** — the data
  exists and is queryable; the UI display wasn't built this pass.
- **No frontend permission-gating UI** — nothing to usefully gate with only one role in use;
  backend enforcement (§27) is real and complete independent of this.
- **`SeoCompanyJaisalmer.tsx`, `SitemapPage.tsx`, `Legal.tsx`** are not wired to the override
  resolver — same pattern applies, not done this pass (§23).
- **External link checking remains deferred**, per this phase's explicit instruction not to
  implement it — no new SSRF surface was introduced anywhere in this pass.
- **`ServicePage.tsx`'s shared-template tradeoff** (§23) — one harmless extra request on
  dynamic `/services/:slug` page loads specifically.
- Every Part 1/Part 2 limitation not explicitly closed above is unchanged.

---

# Part 4 — Final Gap Closure, MySQL Validation & Deployment Readiness

Closes the 8 gaps Part 3 left open. No new metadata resolver, registry, redirect engine,
sitemap, or prerender system was created — every fix here extends the existing ones. The
49-check scoring engine was not touched (`npm run test:seo-parity` still 13/13).

## 31. `SeoCompanyJaisalmer.tsx`, `SitemapPage.tsx`, `Legal.tsx` — connected, and a real bug found

**`SitemapPage.tsx` and `Legal.tsx`** are genuine route-only (`static_page`) content — wired to
`useSeoOverride` exactly like Part 3's other static pages. `Legal.tsx` is a single component
serving two routes (`/privacy-policy`, `/terms-conditions`); it calls
`useSeoOverride(path)` with `path` already resolved from the `kind` prop *before* the hook
call (unconditional, hooks-rules-safe), so each route's override is keyed by its own exact
route — never by the shared component's filename, and one legal page can never receive the
other's saved metadata (verified by giving each a distinct test override in the mock-server
round trip below — each route's raw HTML showed only its own title).

**`SeoCompanyJaisalmer.tsx` turned out not to be what the gap list assumed.** Auditing it
before editing (per this phase's own instruction not to change things without verifying prior
claims) found it's real CMS content: a seeded `seo_pages` row
(`database/seed_seo_page_seo_company_jaisalmer.php`), served through the same
`/api/public/seo-pages/{slug}` endpoint and `seo_meta` row every other seo_page uses — not a
`static_page`/`venture` virtual document. Per Part 3 §22's own design, dynamic content
resolves through its *own* real `seo_meta` row already; routing it through
`useSeoOverride`/`public_resolve.php` (which only ever serves virtual content) would have been
a wasted fetch always resolving to `null`, contradicting §15's "avoid N+1 metadata queries."
The real defect was narrower: the component only ever read `meta_title`/`meta_description`
off its already-correct data source and silently dropped every other saved field. Fixed by
widening its `ApiSeo` type to the full row shape and passing `canonical_url`, `robots_index`,
`robots_follow`, and `og_image` through to `<Seo>` — no new query, no new resolver, the exact
data that was already being fetched.

**A second, more serious bug was found in the same audit**, and is the real reason this route
looked "disconnected": `seo_sync_registry()` merged `seo_discover_static_and_venture_documents()`
*before* `seo_discover_database_documents()`. `/seo-company-jaisalmer` is simultaneously in
`static_public_routes()` (it needs its own literal `<Route>` in `App.tsx`, not the seo_pages
`:slug` catch-all) *and* a real `seo_pages` row — on every sync, the synthetic `static_page`
placeholder was processed first and won the route; the real `seo_page` document was silently
dropped via `routeConflicts` every single time. That means SEO Studio's "All Content" list and
generic document editor were pointing at a fake placeholder document for this route, never the
real content. Fixed by swapping the merge order — database documents now always win a route
collision over a synthetic static/venture placeholder (`api/lib/seo/documents.php`,
`seo_sync_registry()`) — a general rule, not a special case for this one route, since real
content should never lose to a placeholder that exists only because no DB row was found.

## 32. Complete static-route coverage — audited, not assumed

Cross-checked `api/lib/route_manifest.php`'s `static_public_routes()` (the single source of
truth — confirmed via `php scripts/print-static-routes.php`, **28 routes**, unchanged count)
against `src/App.tsx`'s actual `<Route>` list, each component's real code, and a fresh
`npm run prerender` run. Admin (`/admin/*`), API (`/api/*`), auth (`/login`), preview
(`/seo-preview/*`), and the `*` NotFound route are excluded per scope — confirmed via
`EXCLUDED_PREFIXES` in `scripts/prerender.mjs` and `App.tsx`'s route tree; none of them appear
in `static_public_routes()` to begin with.

| Route | Component | Resolver path | Prerendered | Indexability decision |
|---|---|---|---|---|
| `/` | Home.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/about` | About.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/services` | Services.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/website-designing` | WebsiteDesigning.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/online-marketing` | OnlineMarketing.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/seo-services` | SeoServices.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/seo-company-jaisalmer` | SeoCompanyJaisalmer.tsx | own `seo_meta` row (real seo_page content — see §31) | ✅ | index (unchanged) |
| `/hotel-digital-marketing` | HotelDigitalMarketing.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/channel-manager-hotel-software` | ChannelManager.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/channel-manager-pricing` | Pricing.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/portfolio` | Portfolio.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/case-studies` | CaseStudy.tsx → ServicePage.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/blog` | Blog.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/seo-audit-tool` | SeoAuditTool.tsx | `useSeoOverride` (layered over legacy `pageSeo`) | ✅ | index (unchanged) |
| `/our-ventures` | OurVentures.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/our-ventures/*` (9 routes) | VentureDetail.tsx | `useSeoOverride` | ✅ (all 9) | index (unchanged) |
| `/contact` | Contact.tsx | `useSeoOverride` | ✅ | index (unchanged) |
| `/privacy-policy` | Legal.tsx (kind="privacy") | `useSeoOverride` — **NEW this pass** | ✅ | index, low priority (existing decision preserved — see below) |
| `/terms-conditions` | Legal.tsx (kind="terms") | `useSeoOverride` — **NEW this pass** | ✅ | index, low priority (existing decision preserved) |
| `/sitemap` | SitemapPage.tsx | `useSeoOverride` — **NEW this pass** | ✅ | index (existing decision preserved) |

**28/28 static routes resolver-connected — no gap remaining.** Registry document keys follow
`seo_document_key()`'s existing deterministic scheme unchanged (`static:{route}` for ordinary
static pages, `collection:{name}` for `/blog`, `/portfolio`, `/our-ventures`,
`venture:{slug}` for Venture pages, `seo-page:{id}` for the one real-content exception above) —
no new key scheme was introduced. Published/indexable/seo_editable flags for every row are
unconditionally `true` in `seo_discover_static_and_venture_documents()` (unchanged from Part
2/3) since every one of these 28 routes is a real, live, intentionally-public page; sitemap
status for all 28 was reconfirmed present in the live `sitemap.xml`-driven route source used by
`scripts/prerender.mjs`, and canonical status for all 28 is "self, no override saved" by
default with an admin-settable override available identically to every other static route.

**Indexability decisions — preserved, not changed.** Before wiring anything, `/sitemap`,
`/privacy-policy`, and `/terms-conditions` were checked against their existing code and
`SEO_IMPLEMENTATION.md`'s original route inventory (Phase 1): all three were already `index`
(the HTML sitemap and legal pages were deliberately never noindexed — low-priority but
crawlable, matching how most sites treat these routes). Nothing in the code or documentation
suggested that was wrong, so this phase does not force `noindex` on any of them — an admin
with `seo.edit_advanced` can still set `noindex` explicitly per page through SEO Studio if
they choose to, exactly as for any other static route.

## 33. Prerender lifecycle — `building`/`failed` now real, with recovery

Migration `0017_prerender_lifecycle.sql` (new columns only, no changes to `0015`/`0016`):
`prerender_build_id`, `prerender_started_at`, `prerender_completed_at`,
`prerender_failure_reason`, `stale_reason`, `last_successful_prerender_at`. `prerender_status`
itself already supported `building`/`failed` since `0016` — nothing was writing them.

- **On save** (`seo_mark_document_stale()`): now always sets `stale` (not `not_applicable` for
  static/Venture documents — see the Part 3 §28 note this finally applies correctly; the
  earlier fix claim didn't match the code until this pass actually made the edit, caught during
  this phase's "verify prior claims from code" audit) with a `stale_reason` describing why.
- **On build application** (`scripts/apply-prerender-report.php`): calls the new
  `seo_begin_prerender_build($pdo, $routes, $buildId)` first, marking every document this
  build attempt touched `building` with a build ID and start time — there's still no real-time
  "build started" signal (the Node process has no DB credentials, unchanged from Part 3), so
  this brackets the same evaluation pass rather than adding a second, independently-timed
  engine. Each route then resolves to `current` (hash matches, via
  `seo_mark_document_current_if_matching`, extended to also clear failure state and stamp
  `last_successful_prerender_at`) or `failed` (via the new `seo_mark_document_failed()`, using
  a short pre-classified reason — never the raw exception message, which can contain
  filesystem paths; `scripts/prerender.mjs` now records `reason: 'render_error'` /
  `'render_exception'` in `prerender-report.json` instead of the raw message, keeping the full
  message in console output only).
- **Recovery**: `seo_recover_abandoned_building_documents($pdo, $timeoutMinutes = 60)` — moves
  any document still `building` past the timeout to `failed` with a safe reason, never
  `current`. Reachable via `php scripts/recover-abandoned-prerender-builds.php [minutes]` (CLI)
  or `POST /admin/seo/prerender/recover-abandoned` (`seo.run_bulk`-gated, added to the
  dashboard as "Recover abandoned builds"). Idempotent — only touches rows whose own
  `prerender_started_at` is stale enough; never affects a build genuinely still running.

**A real bug in `database/migrate.php` was found and fixed** while working on this migration:
its `glob('*.sql')` also matched `*.down.sql` files, and `'.down.sql'` sorts alphabetically
*before* the matching forward file's `.sql` (e.g. `0016_seo_documents.down.sql` <
`0016_seo_documents.sql`) — on a genuinely fresh database, the runner would have attempted the
*down* migration (dropping columns that don't exist yet) before its own forward migration ever
ran, failing the very first clean install. Fixed by excluding `*.down.sql` from the forward
glob. This was caught by reading the runner's logic while preparing for §36's clean-install
test — not something a database run would have silently gotten right.

## 34. Saved-vs-prerendered status in admin

`ContentAnalyzer.tsx`'s existing document-info panel (previously one line: "Prerender: X") is
now a full status block: colored + text-labeled status (never color-only), abbreviated
`content_hash`/`prerender_hash` (`AbbrevHash`, full value reachable via `aria-label`/`title`,
never a filesystem path — these are pure content hashes), "Rebuild required: Yes/No" (computed
from whether the two hashes differ), "Last successful prerender" (or "Never prerendered" when
`prerender_hash` is still null), "Last build attempt", and a stale/failed/building-specific
message pulling `stale_reason`/`prerender_failure_reason` from the new columns. No button
claims to trigger a real deploy — the panel displays the actual, current command
(`npm run build:prerender`, confirmed against `package.json` before writing it) as plain text.

## 35. Frontend capability gating

`/api/admin/session` and `/api/admin/login` now both return `seo_capabilities: string[]`,
computed server-side via `seo_role_permissions($user['role'])` (the exact same function
`require_permission()` already used) — never inferred from a role string in the browser.
`AuthContext` exposes it as `seoCapabilities: string[] | null` (`null` = session not resolved
yet, distinct from `[]` = resolved, zero capabilities — so a `CapabilityButton` can render
disabled-by-default while loading instead of briefly flashing an enabled control). The new
`CapabilityButton` component (`src/features/seo-studio/components/CapabilityButton.tsx`) wraps
a plain `<button>`: disables it with `aria-disabled` and an explanatory `title` (screen readers
get real text via a visually-hidden span, not color alone) when the session lacks the given
capability. Applied to: Dashboard's "Synchronize registry", "Rebuild link index", and new
"Recover abandoned builds" (all `seo.run_bulk`); Redirects' Add/Import/status-toggle/Delete
(all `seo.manage_redirects`); Settings' Save (`seo.manage_settings`); ContentAnalyzer's Save &
Analyze (`seo.edit_metadata`, the baseline every save needs). Per-field gating of the advanced
canonical/robots inputs and the schema editor specifically was not built this pass (see §37) —
scoped to the clearest, highest-value action-level controls rather than a form-field-by-field
rewrite.

**Backend enforcement is unchanged and remains authoritative** — every one of these buttons'
endpoints already calls `require_permission()` before this pass (Part 3 §27); this pass adds
only the UI layer on top. Verified by reading each endpoint again: `seo_studio_registry_sync`,
`seo_studio_link_index_rebuild`, `seo_studio_recover_abandoned_builds` → `seo.run_bulk`;
`RedirectController`'s create/update/delete/import → `seo.manage_redirects`;
`seo_studio_settings_update` → `seo.manage_settings`; `seo_studio_content_save` →
`seo.edit_metadata` baseline. A direct API call from an unauthorized role still gets a
normalized 403 regardless of what the frontend shows — unchanged from Part 3, re-confirmed by
reading the code (a real MySQL-backed multi-role test, per §36, was not possible in this
environment).

## 36. Real MySQL-compatible migration validation — blocked, honestly documented

No MySQL/MariaDB server and no Docker are available in this environment — re-confirmed this
pass (`which mysql mysqld mariadb docker` all report not found; `docker ps` fails the same
way). Per this phase's explicit instruction, SQLite was **not** substituted, and no migration
success is claimed. What *was* done without a database:

- Read every migration (`0001` through the new `0017`) and its `.down.sql` pair for internal
  consistency, confirming `0017`'s down migration drops exactly the columns/key the forward
  migration adds, in reverse order.
- Found and fixed the real `migrate.php` ordering bug (§33) that would have broken a genuine
  clean install — the single most consequential thing this audit step could still do without a
  live database.
- Re-confirmed `php -l` across every changed/new PHP file (clean) and every file in `api/`
  (clean, full-tree sweep).

**Exact commands still required**, for whoever has MySQL/MariaDB or Docker access (unchanged
in spirit from Part 3 §29, extended for this phase's new migration and representative-data
list):

```bash
# Clean install
docker run --rm -d --name shrinath-test -e MYSQL_ROOT_PASSWORD=test -e MYSQL_DATABASE=shrinath_test -p 3307:3306 mysql:8
# point api/config/config.php at 127.0.0.1:3307/shrinath_test, then:
php database/migrate.php                       # 0001 through 0017 in order
php scripts/print-static-routes.php             # sanity check the route source still works
# via admin UI or API: registry sync (dry run, then apply), backfill, bulk analyze
php database/rollback.php 0017_prerender_lifecycle.sql
php database/migrate.php                        # reapply — must succeed cleanly

# Representative upgrade — seed one row of each: service, blog_post, seo_page (including a
# slug that will collide with a static route, to exercise §31's fix), portfolio_project, page,
# their seo_meta rows, an intentional noindex row, a redirect, then run migrate.php + a
# registry sync and manually confirm every item in this phase's brief's §7/§8 checklists
# (existing data preserved, document associations backfilled, stable keys, no duplicates on a
# second sync).
```

## 37. Remaining limitations (Part 4, honest, not hidden)

- **Real MySQL-compatible migration/upgrade/rollback/reapply testing was not performed** — §36,
  the largest remaining gap, exactly as this phase's own instructions anticipated when no
  database engine is reachable.
- **Full temporary-database initialization workflow (registry sync → backfill → bulk analyze →
  duplicates/orphans → diagnostics → stale-prerender report, against real seeded data) was not
  run** for the same reason — every function it would exercise was reviewed by direct code
  reading instead (§31's merge-order fix, §33's lifecycle functions), not by execution against
  live rows.
- **Per-field capability gating** (disabling just the canonical/robots inputs for
  `seo.edit_advanced`, just the schema editor for `seo.manage_schema`) was not built — §35
  covers action-level buttons; the underlying backend check is already graduated per-field
  (Part 3 §27) regardless of what the UI shows.
- **No live redirect-manager regression run** — the existing test script
  (`npm run test:redirects`) needs a deployed server with a real database (documented as
  deploy-only since Part 2); nothing in this phase's `RedirectController.php` changes
  (only the mark-prerendered failure-column wiring in `SeoStudioController.php`, and
  `Redirects.tsx`'s capability gating) touches redirect logic itself, so no regression is
  expected, but this is a code-review conclusion, not an executed test.
- **Responsive/accessibility verification of this pass's new admin UI** (the prerender-status
  panel, `CapabilityButton`, the new dashboard card) was done by code review against the
  existing admin theme's responsive patterns (`adminCard`, `auto-fill`/`minmax` grids already
  used throughout, text labels alongside color, `aria-disabled`/visually-hidden status text) —
  not by rendering at each of the 8 named breakpoints in a real browser in this environment.
- **`'building'` still has no true real-time start signal** — §33 explains why (no DB
  credentials in the Node build process); it brackets the evaluation pass rather than tracking
  the actual Node process's wall-clock duration.
- Every Part 1–3 limitation not explicitly closed above is unchanged.

---

# Part 5 — MySQL Validation, Browser QA & Deployment Go/No-Go

Full results and the **NO-GO** deployment decision live in `docs/SEO_STUDIO_DEPLOYMENT.md` §9
(added this pass) — not duplicated here. Summary of what changed in the codebase itself:

- **Per-field backend permission enforcement** (`seo_studio_content_save`) now compares each
  advanced field against its *stored* value rather than merely checking whether the request
  body contains the key — fixes a real bug where a metadata-only editor would have been unable
  to save anything at all, since the admin UI always round-trips the full `seo` object
  including unchanged `robots_index`/`robots_follow`/`canonical_url`.
- **Per-field frontend gating** (`ContentAnalyzer.tsx`): Canonical URL and Index/Follow are now
  disabled without `seo.edit_advanced`, accessibly explained.
- **A real, pre-existing SSR bug found and fixed**: `SeoCompanyJaisalmer.tsx` fetched its
  content via a plain `useEffect`, which never runs during prerendering — its prerendered HTML
  had always shown only the hardcoded fallback, independent of any saved content or SEO Studio
  override, since before any SEO Studio phase existed. Fixed by migrating it to the same
  `useRouteData`/`loadSeoPage` pattern `DynamicSeoPage.tsx` already used, and removing it from
  `entry-server.tsx`'s static-route classification (which would otherwise have embedded the
  wrong data shape under its route key). `DynamicSeoPage.tsx` also gained the same canonical/
  robots/image pass-through while this was open (`seoPageLoader.ts`'s `SeoPageSeo` type
  widened) — one fix, applied to every seo_pages route, not just this one.
- **A migration-runner regression test** (`scripts/test-migrate-glob.php`,
  `npm run test:migrate-glob`) — needs no database, verifies the prior phase's glob-ordering
  fix directly against the real migrations directory.
- **A safety-critical infrastructure finding**: local development for this project has no
  isolated MySQL/MariaDB instance — `api/config/config.php` connects to the production
  database via Hostinger's Remote MySQL feature. See the warning at the top of
  `docs/SEO_STUDIO_DEPLOYMENT.md`. Two harmless read-only requests were made through it before
  this was recognized (a not-found redirect lookup, and a real content read used to verify the
  SeoCompanyJaisalmer fix) — no write, no migration, no login, no mutation of any kind.
  Everything requiring a database write for this phase (clean-install migration test,
  representative upgrade, rollback/reapply, full initialization workflow, live redirect
  regression, authenticated admin browser QA) is **BLOCKED**, not tested and not assumed
  passing — see `SEO_STUDIO_DEPLOYMENT.md` §9 for the exact list to re-run once an isolated
  staging database exists.

## 38. SEO Audit Tool persistence — privacy-by-design schema, lifecycle, retention

The public **Free SEO Audit Tool** (`/seo-audit-tool`, backed by the self-contained
`api/seo-toolkit/*` micro-app) mirrors every run into the main database's `seo_audits` table
(`database/migrations/0019_seo_audits.sql`) purely for admin visibility. The toolkit's own
JSON-file storage (`api/seo-toolkit/storage/audits/*.json`, self-expiring after
`AUDIT_RETENTION_HOURS`) remains the source of truth for the `/report` (PDF) and `/status`
endpoints — this table is a separate, permanent, privacy-reduced record for the admin UI.

### Schema

```
id, request_id (unique), url_hash, normalized_url, domain, path,
status (processing|completed|failed),
overall_score, critical_count, warning_count, improvement_count, passed_count,
result_summary_json (TEXT, bounded, see below),
safe_error_code, safe_error_message,
lead_name, lead_email, lead_status (new|contacted|qualified|closed|not_interested),
processing_time_ms, created_at, completed_at, updated_at
```

`result_summary_json` uses `TEXT` rather than a native `JSON` column: MariaDB's `JSON` type is
itself just an alias for `LONGTEXT`, so `TEXT` behaves identically across MySQL 5.7+ and MariaDB
without depending on which one a given environment runs, and the only writer is
`json_encode()`, which always produces valid JSON — a native type's validation adds no safety a
`TEXT` column doesn't already get from the application layer.

### Privacy contract — what is never stored

No raw visitor IP, no browser user-agent, no full submitted URL (query string and fragment are
discarded before storage), no raw analyzer output (HTML, response headers, cookies), no stack
traces. This is enforced in one place: `normalize_audit_url()` and `build_seo_audit_summary()`
in `api/models/SeoAudit.php` are the only functions that ever construct a row for storage, and
neither accepts nor derives any of the excluded fields. `scripts/test-seo-audit-privacy.php`
(`npm run test:seo-audit-privacy`) asserts this directly against those functions.

### Safe URL normalization

`normalize_audit_url()` keeps only `scheme + lowercase host + non-default port + path`:
fragments are stripped, query strings are stripped (so tracking params, tokens, and any
sensitive query values never reach storage), embedded credentials cause the function to return
`null` (the row is simply not created for that request, not stored with credentials redacted),
default ports (`:443` for https, `:80` for http) are omitted, and the result is bounded to 512
characters. `url_hash` is `sha256()` of that same normalized string (never the raw input), so a
lookup index exists without a full-length index on a 512-char column. The admin "Open Website"
link (`SeoAuditDetail.tsx`) opens only this normalized, safe URL — it never reconstructs the
original query string.

### Lifecycle — one row per request

`AuditController::create()` (in `api/seo-toolkit/src/Controllers/AuditController.php`) now
follows one strict lifecycle, matching what the toolkit's own validation/SSRF/rate-limit chain
already enforced before any database write:

1. Rate limit check (existing, unchanged).
2. Request validation + URL syntax validation (existing `AuditRequestValidator`/`UrlValidator`,
   unchanged) — this also now bounds and validates the optional `leadName`/`leadEmail` fields
   (length caps, email format, a defensive header-injection guard on the email).
3. **One `seo_audits` row is created with `status='processing'`** (`create_seo_audit()`) —
   before analysis starts, using only the normalized URL.
4. The existing analyzer runs (`Bootstrap::analyzer()->analyze()`) — completely unchanged by
   this phase, including its SSRF protection (`SsrfProtection.php`, `HttpFetcher.php`) and rate
   limiting (`RateLimiter.php`).
5. **The same row is updated** to `completed` (`complete_seo_audit()`, storing the authoritative
   score/counts/summary) or `failed` (`fail_seo_audit()`, storing only a pre-classified safe
   error) — never a second row.

Every one of steps 3-5 is best-effort and wrapped so a main-database failure can never affect
the public tool's response — the toolkit's own JSON-file flow is completely independent of this.

### Stored score and result summary — never recalculated

`overall_score` is `$result['score']` from the same authoritative analyzer output already
returned to the caller — nothing in this feature recalculates or estimates a score.
`build_seo_audit_summary()` derives `critical_count`/`warning_count`/`improvement_count` from
the analyzer's own `seoInsights.healthSummary` counts (critical→critical, high→warning,
medium+low→improvement), and `passed_count` by counting how many of the five
status-bearing metric groups (`meta`/`technical`/`security`/`mobile`/`performance`) the analyzer
itself marked `'pass'`. `result_summary_json` holds the score-breakdown-by-category, health
grade, and up to 10 recommendations (title/priority/effort/advice, each length-capped) — the
function progressively drops recommendations (10 → 5 → 0) until the encoded JSON fits an 8000-
byte bound, so storage is never unbounded regardless of how much the analyzer returns.

### Safe error classification

A `\Throwable` that isn't an `ApiException` (i.e. wasn't already a curated, public-facing
message) is never persisted verbatim — the failure path passes a fixed, generic string instead.
For `ApiException`s (whose messages are already the same safe text returned to the end user —
"This host is not allowed.", "The domain could not be resolved.", etc.),
`classify_seo_audit_error()` pattern-matches that already-safe string into one of a small fixed
set of short codes (`ssrf_blocked`, `dns_unresolvable`, `too_many_redirects`,
`response_too_large`, `fetch_timeout`, `invalid_url`, `rate_limited`,
`unsupported_content_type`, or the fallback `analysis_failed`) purely so the admin UI has a
stable code to filter/group on, independent of exact message wording.

### Permissions

No new permission was added — this reuses the existing SEO Studio capability set
(`api/lib/seo/permissions.php`): `seo.view` gates the list and detail admin endpoints,
`seo.edit_metadata` gates the one mutation a lead record supports (its `lead_status`), and
`seo.manage_settings` gates delete (treated the same trust tier as any other destructive
admin-configuration action). All are enforced server-side in `SeoAuditController.php` before any
record lookup; the frontend hides nothing that the backend doesn't independently check.

### Retention and cleanup

Documented default policy: anonymous failed audits 30 days, anonymous completed audits 90 days,
audits with a contact lead follow the same retention horizon as Contact Enquiries (365 days by
default). `scripts/seo-audits-cleanup.php` implements this — dry-run by default (prints matching
row counts and does nothing), requires both `--apply` and `--confirmed-backup` to actually
delete, deletes in chunks of 500 rows (bounded to 200 chunks per run) so a large backlog can't
hold a long-running lock, and writes one `audit_logs` entry per run summarizing what was
deleted. It is **never invoked automatically** — no cron entry exists for it; running it is an
explicit CLI decision by whoever operates the server.

### Known limitations

- No column sorting exists on the admin list yet (matches the rest of the admin `DataTable`
  rollout — see `docs/ADMIN_DATATABLE_GUIDE.md`).
- The dashboard's SEO Audit panel is guarded to silently not render if `seo_audits` doesn't
  exist yet (migration 0019 unapplied) — see `api/lib/dashboard.php`'s try/catch around
  `seo_audit_dashboard_summary()`.
- Full security/lifecycle behavior (SSRF blocking, redirect revalidation, embedded-credential
  rejection, rate limiting) was verified by reading `UrlValidator.php`/`SsrfProtection.php`/
  `HttpFetcher.php`/`RateLimiter.php` directly — none of that code was changed by this phase —
  plus the new `scripts/test-seo-audit-privacy.php` for the storage-layer functions this phase
  did add. No live network SSRF exploitation attempt was made against this environment.
