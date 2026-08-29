# Ventures CMS — Architecture

Promotes Venture pages (`/our-ventures/*`) from static React data (`src/data/ventures.ts`) plus a
route-only "virtual" SEO registry entry, to a real, admin-editable content type — the same tier
as `services`/`blog_posts`/`seo_pages`/`portfolio_projects`. This is not a new application, not a
second SEO system, and not a second route/sitemap engine: it plugs into everything that already
exists.

## Database

Migration `database/migrations/0018_ventures.sql` (rollback: `0018_ventures.down.sql`).

- `ventures` — the core row (name, slug, tagline, category, summary, status, sort_order, theme
  colors, layout_variant, contact fields, timestamps). `venture_key` is a stable, immutable
  identity (see below); `slug` is the editable public-facing part.
- `venture_services`, `venture_highlights`, `venture_sections`, `venture_media` — child tables,
  one row per item, `ON DELETE CASCADE` from `ventures`. Replace-all-on-save, same convention as
  `save_faqs()`.
- FAQs deliberately reuse the existing shared `faqs` table (`entity_type = 'venture'`) rather
  than a new `venture_faqs` table — every other content type's FAQs already live there, and the
  SEO engine's `hasFaq` check (`get_faqs()`) needed zero new wiring as a result.
- `venture_media.media_url` is a plain path/URL string, matching the `featured_image VARCHAR(500)`
  convention every other content table already uses — this project has no media-table
  foreign-key pattern anywhere else, so one wasn't introduced here either.

## Stable identity (`venture_key`)

`venture_key` is always derived from the **route/slug**, never from the numeric database id —
see `seo_document_key()`'s venture branch in `api/lib/seo/documents.php`, checked *before* the
generic `content_id`-based branch every other content type uses. This is what let the 9 existing
keys (`venture:shrinath-rubber-stamp`, etc.) survive the migration from route-only virtual
documents to real database rows completely unchanged, and is why a future slug edit never changes
the key either. New Ventures get a key the same way, computed once at creation and never exposed
as an editable admin field afterward.

## Migration from `ventures.ts`

`database/seed_ventures.php` (idempotent — re-running skips any slug that already exists)
transcribed all 9 existing Ventures verbatim from `src/data/ventures.ts` into the new tables, and
additionally:

1. Located each Venture's existing `seo_documents` row by its (unchanged) `document_key`.
2. Updated that row's `content_id` to point at the new `ventures.id`, and `source_type` to
   `'database'`.
3. Migrated the matching `seo_meta` row from its old association (`entity_type='seo_document'`)
   to the real one (`entity_type='venture'`) — preserving the *same row*, so all existing
   scores/keyphrase history stayed attached rather than resetting to empty.
4. Only wrote a fresh SEO title/description from `ventures.ts`'s `seo.title/description` fields
   when nothing already existed — verified live: all 9 already had a (generic, auto-derived)
   `meta_title`, so nothing was overwritten. The richer, hand-authored titles from `ventures.ts`
   are available in the seed script's source data if an admin wants to apply them via SEO Studio.

Result (verified against production): 9/9 created, 9/9 `seo_meta` rows migrated, 0 failures, all
9 `document_key` values byte-identical to before.

### Fallback behavior

- Database has the Venture (published) → serve it. This is the normal, expected path.
- API unavailable at request time (build outage, runtime error) → `VentureDetail.tsx` and
  `OurVentures.tsx` fall back to the matching entry in `src/data/ventures.ts`, which is
  **deliberately not deleted** — it remains the documented fallback snapshot.
- Neither available → real 404 (`NotFound`), never a silent blend of stale + fresh fields.

`src/data/ventures.ts` should be treated as a frozen snapshot from this migration onward — new
Ventures created through the admin exist **only** in the database and are not reflected there;
keep that in mind if it's ever consulted for "what ventures exist."

## SEO Studio integration

`venture` moved out of `SEO_VIRTUAL_CONTENT_TYPES` (now just `['static_page']`) and into the
normal real-content path:

- `seo_inventory_union_sql()` (`api/lib/seo/dashboard.php`) unions `ventures` alongside
  services/blog/seo_pages/portfolio.
- `seo_public_url()`, `seo_default_page_type()` (`api/lib/seo/input.php`) have `venture` cases.
- `seo_load_content_row()` (`api/lib/seo/analyze.php`) calls `find_venture()`.
- `seo_build_input()` extracts real content: H1 from `name`, intro from `summary`, and body text/
  headings/images/links from `venture_sections`/`venture_highlights`/`venture_services` via a new
  `seo_venture_blocks()` helper feeding the **existing**, unmodified `seo_extract_blocks()` — no
  new extraction logic, no engine change.

The 49-check engine (`checks.php`/`scorer.php`/`rules.php` and their TS mirrors) was not touched.
`npm run test:seo-parity` passes (13/13 fixtures, including the pre-existing `venture-page.json`
fixture).

**One real, permanent behavior change worth knowing:** Venture section body text is stored as
`body_html`, but every existing bespoke Venture layout component
(`src/components/ventures/layouts/*.tsx`) renders `section.body` as **plain JSX text** — none of
them use `dangerouslySetInnerHTML`. The public loader (`src/loaders/ventureLoader.ts`) strips
HTML tags back down to plain text before handing sections to those components. Section content
authored through the admin should be treated as **plain paragraph text**, not rich HTML, until/
unless those layout components are changed to render real HTML.

## Public API

```
GET /api/public/ventures            list (published, not archived, public-safe fields only)
GET /api/public/ventures/{slug}     detail (published + not archived only; 404 otherwise)
```

## Admin API

```
GET    /api/admin/ventures
POST   /api/admin/ventures
GET    /api/admin/ventures/{id}
PUT    /api/admin/ventures/{id}
POST   /api/admin/ventures/{id}/publish
POST   /api/admin/ventures/{id}/unpublish
POST   /api/admin/ventures/{id}/archive
POST   /api/admin/ventures/{id}/restore
POST   /api/admin/ventures/reorder
GET    /api/admin/ventures/{id}/history
```

Every mutating endpoint: `require_admin()`, `require_csrf()`, server-side validation
(`validate_venture_input()`), parameterized SQL throughout, `audit_log()` on every write. `PUT`
additionally enforces optimistic concurrency (`expected_updated_at` → `409` on mismatch) and
per-field capability checks (see below). A hard-delete function exists in
`VentureController.php` but is **intentionally not registered as a route** — archive/restore is
the only removal path in this version, per spec.

## Permissions

`api/lib/ventures_permissions.php` — same static capability-map design as the existing
`api/lib/seo/permissions.php` (this project has exactly one role, `admin`, in real use; a full
RBAC table would be premature). Capabilities: `ventures.view/create/edit/edit_contact/
edit_theme/publish/archive/reorder`. `require_venture_field_permissions()` compares the incoming
request body's changed fields against `VENTURE_CONTACT_FIELDS`/`VENTURE_THEME_FIELDS` and status
transitions, so a role granted only `ventures.edit` cannot smuggle a contact or theme change (or
a publish/archive) through the same request. Session responses (`/api/admin/login`,
`/api/admin/session`) now also return `venture_capabilities`, surfaced in the frontend via
`useAuth().ventureCapabilities` — backend enforcement remains authoritative regardless of what
the frontend hides.

## Dynamic routing (no more hardcoded per-Venture routes)

- `api/lib/route_manifest.php`: the 9 hardcoded `/our-ventures/{slug}` entries were removed from
  `static_public_routes()`; `dynamic_route_sources()` gained `['/our-ventures/', 'ventures',
  'status', 'published']`, so `is_known_public_route()` resolves any published Venture slug via a
  DB lookup, exactly like `/services/{slug}` already did.
- `api/sitemap.php`: gained a `ventures` dynamic set (published, not archived).
- `scripts/prerender.mjs`: its sitemap-derived dynamic-route filter now also matches
  `/our-ventures/{slug}`.
- `src/App.tsx`'s single `<Route path="our-ventures/:slug" element={<VentureDetail />} />` already
  covered this — no route change was needed there, only what backs it.
- `VentureDetail.tsx`'s layout lookup is now keyed by **`layout_variant`**, not by slug — this is
  what lets a brand-new Venture reuse one of the 9 existing bespoke designs (`heritage-craft`,
  `technical-grid`, `cinematic-desert`, `route-planner`, `b2b-trade`, `portfolio-management`,
  `offbeat-expedition`, `directory-portal`, `editorial-guide`) instead of needing its own
  hand-built component. No new layout components were created.

Verified live: all 9 existing routes still resolve; the sitemap (cache cleared) lists all 9 from
the database dynamic set; an unknown slug returns 404; a freshly created draft Venture is correctly
absent from both the public list and detail endpoints.

## Slug changes

`ventures_admin_update()` detects a slug change on a **published** Venture and returns
`slug_changed: true` with the old/new slug in the response — the admin UI surfaces this as a
toast telling the user no redirect was created automatically. Creating the actual 301 is left to
the existing Redirect Manager, by design (spec: never auto-create a redirect).

## Known limitations (see the completion report for the full list)

- No drag-and-drop reordering UI — up/down buttons only (keyboard-accessible, functionally
  equivalent, less polished).
- No dedicated media picker — logo/hero/gallery fields are plain path inputs with a link to the
  Media Library, matching how every other existing editor (Service/SeoPage/Portfolio) already
  handles `featured_image`.
- Section body is plain text only (see the HTML-stripping note above) — no rich-text editor on
  that field in this version.
- Concurrency conflict handling is a `409` + toast, not a diff/merge UI.
- Accessibility/responsive testing was done by design review and the existing shared admin
  components' own patterns, not a dedicated pass across all 8 breakpoints listed in the spec.
