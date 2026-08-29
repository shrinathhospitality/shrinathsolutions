# Shrinath SEO Studio — Deployment

## ⚠ Deployment safety warning — local development must not default to production MySQL

**Found during this project's "MySQL Validation" phase**: `api/config/config.php` (gitignored,
real credentials, not shown here) points `dbname` at a Hostinger-style production database
(`u369539812_shrinathsol`), and its own comment instructs local development to reach it via
Hostinger's **Remote MySQL** feature (`DB_HOST` set to the Remote MySQL hostname). In practice
this means **there is no isolated local/staging MySQL instance for this project** — running
the local dev server, `php database/migrate.php`, a registry sync, or any other DB-touching
command against a checkout with this config reaches the **live production database directly**.

This was discovered when a PHP built-in server already running locally on port 8080 (not
started by this pass) responded to routine API calls with real, DB-backed results — confirming
the local dev backend is, right now, wired straight to production data.

**Until a genuinely isolated MySQL/MariaDB instance exists for this project** (a local install,
Docker container, or a *dedicated* Hostinger staging database — not Remote MySQL to the
production account), the following must be treated as unsafe to run against a plain checkout:

- `php database/migrate.php` / `php database/rollback.php` (schema changes — production has no
  separate schema to test against safely)
- Any registry sync, backfill, bulk-analyze, or link-index rebuild (writes real rows)
- `php scripts/apply-prerender-report.php` / the recovery script (writes real `prerender_status`)
- Logging into `/admin` locally (writes `admin_sessions`/`login_attempts` rows)

**Recommended fix** (not implemented in this pass — a configuration/infrastructure change, out
of this project's application-code scope): provision a real isolated MySQL/MariaDB database for
local development and validation (a local install, a Docker container, or a second, genuinely
separate Hostinger database/subscription used only for testing), and point local `DB_HOST` /
`config.php` at that instead of Remote MySQL to the production account. Until then, anyone
working on this codebase locally should assume every DB-touching command is live.

## 1. Apply the database migration

```
php database/migrate.php
```

Applies `database/migrations/0015_seo_studio.sql` (creates `seo_content_analysis`,
`seo_analysis_history`, `seo_link_index`, `seo_global_settings`) the same way every previous
migration was applied — safe to run repeatedly (already-applied migrations are skipped via the
`schema_migrations` table).

To roll back specifically this migration (no rollback tooling existed for earlier migrations —
see `docs/SEO_STUDIO_ARCHITECTURE.md` §7):

```
php database/rollback.php 0015_seo_studio.sql
```

## 1a. Migration 0019 (`seo_audits`) — application checklist

`database/migrations/0019_seo_audits.sql` creates the `seo_audits` table the Free SEO Audit
Tool's admin visibility feature depends on (see `docs/SEO_STUDIO_ARCHITECTURE.md` §38 for the
full schema/lifecycle/privacy design). As of this writing **it has not been applied to any
database** — confirm all of the following before running it:

- [ ] `SELECT * FROM schema_migrations WHERE migration = '0019_seo_audits.sql'` returns no row
      (i.e. it genuinely hasn't been applied yet — `database/migrate.php` already skips
      already-applied migrations via this table, but confirm directly before a production run).
- [ ] A full database backup exists and its restore path has been tested.
- [ ] The current production application files (`api/`, `dist/`, `.htaccess`) are backed up.
- [ ] The forward SQL has been reviewed: no `ip_address`, `user_agent`, or full-URL column
      exists — only `normalized_url` (redacted, no query/fragment), `url_hash`, `domain`, `path`.
- [ ] `database/migrations/0019_seo_audits.down.sql` has been reviewed (`DROP TABLE IF EXISTS
      seo_audits;` — irreversible, drops all audit history including leads; confirm this is
      acceptable before ever running a rollback against real data).
- [ ] `npm run test:migrate-glob` and `npm run test:seo-audit-privacy` both currently pass.

Apply with the same command as any other migration (`php database/migrate.php`) — it will run
`0019_seo_audits.sql` (and only that file; `.down.sql` files are never picked up by the runner —
see `database/migrate.php`'s `glob('*.sql')` filter that explicitly excludes them). Rollback
testing should only ever be run against an isolated/staging database, never production — see the
deployment safety warning at the top of this document for why this project's local development
in particular has no isolated database of its own today.

Do not apply this migration as a side effect of any other deployment step — it should be a
deliberate, checked-off action with its own backup checkpoint, per this project's standing
production-safety practice.

## 1b. SEO audit retention cleanup (optional, not scheduled by default)

`scripts/seo-audits-cleanup.php` removes expired `seo_audits` rows per the retention policy
documented in `docs/SEO_STUDIO_ARCHITECTURE.md` §38 (30 days for anonymous failed runs, 90 days
for anonymous completed runs, 365 days for runs with a contact lead). It is dry-run by default:

```
php scripts/seo-audits-cleanup.php                    # prints counts, deletes nothing
php scripts/seo-audits-cleanup.php --apply --confirmed-backup   # actually deletes
```

**No cron job or scheduled task for this script exists in this deployment.** If ongoing
automatic cleanup is wanted, that's a separate, explicit decision — add a cron entry (or
Hostinger scheduled task) calling the `--apply --confirmed-backup` form on whatever cadence is
appropriate (e.g. weekly), only after confirming a backup policy is in place. This phase
deliberately stops short of wiring that up automatically.

## 2. Deploy the code

No new deployment step beyond the project's existing one — `SeoStudioController.php` and every
`api/lib/seo/*.php` file deploy the same way every other PHP file does (plain file copy, no
build step). The React admin code (`src/admin/pages/seo-studio/*`, `src/features/seo-studio/*`)
builds via the existing `npm run build` — confirmed it produces separate lazy chunks
(`SeoStudioPanel-*.js`, `ContentInventory-*.js`, `ContentAnalyzer-*.js`, none referenced from
`dist/index.html`'s initial script tag), so it never loads on any public route.

## 3. Environment / configuration

No new environment variables. `config/seo-scoring-rules.json` is a static, versioned file — no
env-specific values in it. If a threshold or weight ever needs adjusting, edit that one file;
both engines pick up the change on their next build/request without any other code change.

## 4. First-run checklist

1. Run the migration (§1).
2. Deploy code as usual.
3. Log into `/admin`, open **SEO Studio → All Content** — every existing service, blog post, SEO
   page, portfolio project and page should appear with "Not analyzed" scores (grey).
4. Open one page's editor (a Service or Blog post), set a focus keyphrase, save — confirm the
   score updates and the checklist populates.
5. From the Dashboard, click **"Rebuild link index"** once, so incoming/outgoing link counts and
   orphan detection are populated from the start rather than starting empty.
6. Optionally run **"Analyze all stale"** from All Content to get an initial score on every piece
   of content at once (processes in batches of 15 by default — safe to leave running).

## 5. Troubleshooting

- **A content type shows 400 "Unknown content type"** — the `{type}` URL segment must be exactly
  one of `page`, `service`, `seo_page`, `blog_post`, `portfolio_project` (see
  `SEO_CONTENT_TYPES` in `api/lib/seo/rules.php`). Any other value is rejected before touching
  the database.
- **Scores look wrong / stuck** — check `content_hash` and `engine_version` on the item's stored
  analysis (visible via `GET /api/admin/seo/content/{type}/{id}`). If `engine_version` doesn't
  match `config/seo-scoring-rules.json`'s `engine_version`, it will re-score automatically on the
  next save or explicit analyze — this is expected staleness detection, not a bug.
- **Bulk analysis seems to stop partway** — it's chunked by design (see architecture doc §6); the
  UI's "Analyze all stale" button loops automatically as long as the tab stays open. If it was
  closed mid-run, just click it again — already-analyzed (non-stale) items are skipped
  automatically via the content-hash check, so re-running is cheap.
- **`php scripts/print-static-routes.php` or the scoring parity test fails locally** — both need
  a working PHP CLI on `PATH`; neither needs a database connection (the parity test's PHP fixture
  runner uses a stub PDO — see `scripts/seo-run-php-engine.php`).
- **A migration fails partway** — `database/migrate.php` exits non-zero on the first failing
  statement and does not mark it as applied; fix the underlying issue (e.g. a table that already
  exists from a manual test) and re-run — already-succeeded earlier migrations are not re-run.

## 5a. All-Page Integration — additional deployment steps

Apply the next migration the same way as §1:

```
php database/migrate.php
```

Applies `0016_seo_documents.sql` (`seo_documents` table, `seo_meta.document_id`, and the
`redirects` table widening for 307/308 + hit tracking). Rollback (same caveat as always — see
`0016_seo_documents.down.sql` for the 307/308 narrowing caveat specifically):

```
php database/rollback.php 0016_seo_documents.sql
```

After migrating and deploying:

1. Log into `/admin/seo-studio`, click **"Synchronize registry"** once — this discovers every
   static route, Venture page, and existing CMS content item and creates one `seo_documents` row
   each (idempotent — safe to click again later, e.g. after adding new content types).
2. The sync response reports `backfilled` — the number of existing `seo_meta` rows that just
   got a `document_id` association for the first time. This should roughly match your total
   published content count; a much lower number may mean some content types weren't discovered
   (check the dashboard's manifest-vs-registry diagnostic).
3. Run `npm run build:prerender` (already the standard deploy build command from Phase 3) at
   least once before analyzing static/Venture pages — their analysis reads the build-time
   prerendered HTML (`dist/{route}.html`); without it, those pages will show 0 words / no
   headings until the first build runs.
4. Optionally run **"Analyze all stale"** from All Content again — static/Venture documents are
   newly eligible for analysis after step 1 and won't have a score yet.

## 6. Verification commands run for the All-Page Integration release

```
npx tsc --noEmit                     # clean
npm run build                        # clean, SEO Studio chunks confirmed separate from public bundle
npm run build:ssr && npm run prerender   # 159/159 routes still prerender correctly (Phase 3 unaffected)
npm run test:seo-parity              # 11/11 fixtures pass, PHP/TS engines match exactly
php -l on every new/changed .php file    # clean
```

Not run as part of that pass (requires a live database connection unavailable in this
environment): a real end-to-end save-and-analyze against production data, and the redirect test
script (`npm run test:redirects`, unrelated to this feature, already documented as
deploy-only in `SEO_IMPLEMENTATION.md`).

## 7. Live Metadata Resolution & Production Readiness — additional deployment steps

No new migration this pass (see `SEO_STUDIO_ARCHITECTURE.md` Part 3 §29) — `0016_seo_documents.sql`
already had every column this pass needed. Steps 1–6 above are unchanged and still required for a
fresh deployment; this section adds what closes the metadata-override loop and turns on
permission enforcement.

### 7a. Deploy and build as usual, then close the prerender loop

```
npm run build:prerender          # unchanged command; now also writes prerender-report.json
                                  #   to the project root (gitignored, not inside dist/)
# ... deploy dist/ as usual ...
php scripts/apply-prerender-report.php
```

Run `apply-prerender-report.php` **after** the build's `dist/` has actually been deployed —
it re-derives each prerendered route's real content hash from the live database and only marks
a document `prerender_status = 'current'` when that hash matches what's stored; anything that
changed again after the build started correctly stays `stale`. It needs real DB access
(`api/config/config.php`), so it must run server-side — never from the Node/CI build environment,
which is deliberately never given database credentials.

If CLI access to the server isn't convenient for a given deploy, `POST
/admin/seo/documents/{id}/mark-prerendered` (requires `seo.run_bulk`) does the same thing for one
document at a time from the admin UI/API instead.

### 7b. Permission model — no action required, but worth knowing

`api/lib/seo/permissions.php` grants every one of the 8 SEO capabilities to the existing
`'admin'` role and zero capabilities to any other/unknown role (secure default). Since every
admin account in this project already uses the `'admin'` role, **no account changes are needed**
for this deployment — enforcement is simply now active where it previously didn't check anything.
If a new, more limited role is introduced later, add it to `SEO_ROLE_PERMISSIONS` in that file
explicitly; it starts with zero access otherwise.

### 7c. New public endpoint

`GET /api/public/seo-document?route=<path>` is now live — unauthenticated, read-only, returns
`{"override": null}` for any route with no saved static/Venture override, or the safe public
metadata subset otherwise. No new environment variable is needed; `scripts/prerender.mjs` and the
browser both already know the site's own API base URL.

### 7d. Migration testing — explicitly not performed in this environment

No MySQL server is available in this development environment (`which mysql mysqld mariadb` all
return not found). Per `SEO_STUDIO_ARCHITECTURE.md` Part 3 §29, migration testing against a
representative database was **not performed** and is not claimed to have been. Whoever deploys
this to a real environment with database access should run:

```bash
mysql -u root -p -e "CREATE DATABASE shrinath_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php database/migrate.php
# seed representative data, then:
php database/rollback.php 0016_seo_documents.sql
php database/migrate.php
```

and manually confirm: existing `seo_meta` rows survive the round trip, a registry sync backfills
`document_id` correctly with no duplicates on a second run, and deleting a content row flags its
document unpublished (not deleted) rather than orphaning it.

### 7e. Verification commands run for this release

```
npx tsc --noEmit                                  # clean
php -l across the entire api/ tree                # clean
npm run build                                     # clean, dist/index.html references no SEO Studio chunk
npm run build:ssr && npm run prerender             # 159/159 routes, unchanged count, re-verified not hardcoded
npm run test:seo-parity                            # 13/13, unchanged — scoring engine untouched this pass
```

Also run, not as a `package.json` script (temporary, one-off verification scripts, deleted after
use — see `SEO_STUDIO_ARCHITECTURE.md` Part 3 §26 for what each proved): a mock-API round-trip
test proving a saved static/Venture override appears in real prerendered `<title>` output; a
graceful-degradation prerender run against the real (undeployed) production site, confirming
every static route still renders correctly when the new endpoint 404s; direct tests of
`sanitizeCanonicalOverride()` and `redirect_destination_is_safe()` against real attack-vector
inputs; and direct tests of `seo_user_has_permission()` confirming the admin/unknown-role split.

Not run (requires a live database connection unavailable in this environment): migration testing
against representative data (§7d above) and any end-to-end save-and-analyze against production
data.

## 8. Final Gap Closure, MySQL Validation & Deployment Readiness — additional steps

### 8a. New migration

```
php database/migrate.php
```

Applies `0017_prerender_lifecycle.sql` (adds `prerender_build_id`, `prerender_started_at`,
`prerender_completed_at`, `prerender_failure_reason`, `stale_reason`,
`last_successful_prerender_at` to `seo_documents` — no changes to any existing column). Rollback:

```
php database/rollback.php 0017_prerender_lifecycle.sql
```

**A real bug in `database/migrate.php` was found and fixed this pass** — its forward glob
previously also matched `*.down.sql` files, and on a genuinely fresh database the alphabetical
sort would have run a down-migration before its matching forward migration ever applied,
failing the very first clean install. Already fixed in the committed `migrate.php`; nothing
extra to do here, just worth knowing why a clean install works now where it may not have
before.

### 8b. Recommended: re-sync the registry after upgrading

```
POST /admin/seo/registry/sync   (or click "Synchronize registry" in the dashboard)
```

This pass fixed a real registry-sync bug: `/seo-company-jaisalmer` (a real seo_pages row that's
also in the static route list) was previously losing to a synthetic placeholder document on
every sync. Re-running sync after this upgrade corrects that route's registry document without
needing any manual database change — the sync is idempotent and safe to run any time.

### 8c. Closing the prerender loop — same command, extra recovery option

Unchanged from §7a — `npm run build:prerender` then `php scripts/apply-prerender-report.php`.
New this pass: if a build is killed mid-run and leaves documents stuck "Building", run

```
php scripts/recover-abandoned-prerender-builds.php [timeoutMinutes=60]
```

(or use the dashboard's "Recover abandoned builds" button, `seo.run_bulk`-gated). This only
moves genuinely abandoned builds (older than the timeout) to "Failed" — it never marks anything
"Current" and never touches a build that's still actually running.

### 8d. No new environment variables, no new account changes

`seo_capabilities` (frontend permission gating) is computed server-side from the existing
`admin_users.role` column via `api/lib/seo/permissions.php` — nothing to configure.

### 8e. Real MySQL-compatible testing — still not performed

No MySQL/MariaDB server and no Docker are available in this environment (`which mysql mysqld
mariadb docker` all report not found). Per this phase's explicit instruction, this is stated
plainly rather than claimed — see `docs/SEO_STUDIO_ARCHITECTURE.md` Part 4 §36 for the exact
commands (including a Docker-based ephemeral MySQL container) to run this before a real
production deployment. SQLite was not used as a substitute anywhere in this project.

### 8f. Verification commands run for this release

```
npx tsc --noEmit                          # clean
php -l across the entire api/ tree        # clean
npm run build                             # clean, main bundle 296.61 KB / 92.39 KB gzip (was 296.43/92.35 — negligible)
npm run build:ssr && npm run prerender    # 159/159 routes, unchanged count
npm run test:seo-parity                   # 13/13, unchanged — scoring engine untouched
```

Also run (temporary scratch scripts, deleted after use — see
`SEO_STUDIO_ARCHITECTURE.md` Part 4 §32): a mock-API round-trip test proving `/sitemap`,
`/privacy-policy`, and `/terms-conditions` each show their own saved override in raw
prerendered HTML (never each other's), with exactly one `<title>` and one canonical tag per
route.

Not run (no MySQL/MariaDB/Docker available in this environment): real migration forward/
rollback/reapply testing, the representative-upgrade data test, the full temporary-database
initialization workflow, and a multi-role live permission test — see §36–37 of the
architecture doc for the exact commands to run each of these before production deployment.

## 9. MySQL Validation, Browser QA & Deployment Go/No-Go — results

### 9a. Real MySQL/MariaDB test environment — BLOCKED, and why

No isolated MySQL/MariaDB test environment could be provisioned. `which mysql mysqld mariadb
docker` all still report not found, and no XAMPP/WAMP/Laragon installation exists on this
machine — consistent with every prior phase. What's different this pass: while setting up
browser QA, a PHP built-in server already running locally on port 8080 turned out to have a
**working connection to the real production database** (see the deployment-safety warning at
the top of this file). That is not a usable test environment either — it's production, and per
this phase's explicit instructions, it was not used for any database-validation work.

**Two read-only requests were made through it before this was recognized**, both harmless
reads, neither a write:

1. `GET /api/public/redirects/lookup?path=/nonexistent` → `{"success":true,"found":false}` — a
   *not-found* lookup does not trigger this endpoint's hit-count write (that only fires when a
   matching redirect is found), so no row was modified.
2. `GET /api/public/seo-pages/seo-company-jaisalmer` → 200, real content — used to confirm the
   `SeoCompanyJaisalmer.tsx` SSR fix (§9h below) actually resolves data correctly; a plain read,
   no admin session, no mutation.

No migration, rollback, registry sync, backfill, bulk analysis, login, or write of any kind was
run against it. The local dev server that was proxying to it was stopped immediately and not
restarted. All of §3–8 and §10 from this phase's brief (migration-runner live test, clean
install, representative upgrade, rollback/reapply, full initialization workflow, live redirect
regression) are **BLOCKED** — not failed, not skipped by choice, genuinely untestable without
an isolated database that does not currently exist for this project.

### 9b. Migration-runner regression test — PASSED (no database needed)

`scripts/test-migrate-glob.php` (new, `npm run test:migrate-glob`) exercises
`database/migrate.php`'s actual file-selection logic directly against the real
`database/migrations/` directory — no DB connection required. Confirms: 17 forward migrations
selected, zero `.down.sql` files included, and `0015_seo_studio.sql` → `0016_seo_documents.sql`
→ `0017_prerender_lifecycle.sql` in that exact order. This is a real regression test for the
glob-ordering bug fixed in the prior phase, not a re-assertion of it.

### 9c. Per-field backend permission enforcement — implemented and reviewed

`seo_studio_content_save` (`api/controllers/SeoStudioController.php`) now compares each
advanced field (`canonical_url`, `robots_index`, `robots_follow`, `schema`) against its
**currently stored** value before requiring `seo.edit_advanced`/`seo.manage_schema` — not
merely whether the key is present in the request body. This also fixes a real usability bug:
because the admin UI always round-trips the full `seo` object it loaded (robots fields always
present once any save has happened), the old presence-only check would have required
`seo.edit_advanced` on *every* save, permanently locking out a metadata-only editor. Verified
by code review and `php -l` (clean); not exercised against a live multi-role session (needs a
real database with more than one role in use — none currently exists, even in production).

### 9d. Per-field frontend gating — implemented

`ContentAnalyzer.tsx`'s Canonical URL field and Index/Follow checkboxes are now disabled when
the session lacks `seo.edit_advanced` (via `useSeoCapability`), with an accessible explanation
(`title` attribute plus a visible note, not color alone) and no schema editor exists in this
UI to gate (unchanged from prior phase — not a new feature). Basic fields (title, description,
keyphrases) remain usable with just `seo.edit_metadata`. Not visually verified in a live
authenticated session (blocked — see §9a); verified by `npx tsc --noEmit` and code reading.

### 9e. Privilege-escalation test — code review only

A crafted request containing both allowed and forbidden fields (e.g. `seo.edit_metadata` token
with `canonical_url` also present but unchanged) was reasoned through against the §9c logic:
since the check now compares to the stored value, an *unchanged* advanced field never triggers
the elevated check (correct — no escalation risk, since no advanced field is actually being
changed), while a *changed* one still correctly 403s. Not exercised as a live request (no safe
database to hold a second, lower-privileged test account).

### 9f. Redirect live-database regression — BLOCKED

Same reason as §9a. `RedirectController.php` itself was not modified this pass beyond the
`prerender_failure_reason`/timestamp columns touched in `SeoStudioController.php`'s
mark-prerendered endpoint (unrelated file) — no regression is expected, but this is a
code-reading conclusion, not an executed test.

### 9g. Raw HTML end-to-end verification — PASSED (mock API, no production data)

Extended mock-server round-trip test (`scripts/prerender.mjs`'s SSR entry, temporary scratch
scripts, deleted after use) covering 10 routes: `/`, `/about`, `/contact`,
`/seo-company-jaisalmer`, `/sitemap`, `/privacy-policy`, `/terms-conditions`, an intentional
noindex Venture page, plus `/services` and `/blog` as no-override controls. All 10 passed:
exactly one title/description/canonical/robots/og:title/og:description/og:url/twitter:card tag,
canonical equals og:url, saved override appears when configured, hardcoded fallback holds when
absent, noindex renders correctly (never silently dropped to index).

### 9h. A real, deeper bug found and fixed during raw-HTML verification

`/seo-company-jaisalmer`'s override did **not** appear during the first run of the test above.
Investigating found `SeoCompanyJaisalmer.tsx` fetched its content via a plain `useEffect` +
`fetch` — which never runs during `renderToString`/prerendering — so its prerendered HTML had
**always** shown only the hardcoded fallback title/description/content, independent of anything
saved anywhere, since long before this or any SEO Studio phase. A second, compounding bug: even
after switching the component to the established `useRouteData`/loader pattern, `entry-server.tsx`'s
route classifier had this path hardcoded into its static-route set, which would have embedded
the *wrong* data shape (a virtual-route override instead of real seo_page content) under this
route's key. Both fixed: `SeoCompanyJaisalmer.tsx` now uses `loadSeoPage()` (the same loader
`DynamicSeoPage.tsx` already used for every other seo_pages row) via `useRouteData`, and
`entry-server.tsx`'s classifier no longer special-cases this route, letting it fall through to
the existing seo_pages catch-all classification. Re-ran the test after the fix: all 10 routes
pass, `/seo-company-jaisalmer` included (`dataStatus: 'success'`, override title/description
present). `DynamicSeoPage.tsx` also gained the same canonical/robots/image pass-through
(`seoPageLoader.ts`'s `SeoPageSeo` type widened) while this was open, so every seo_pages route
gets the fix, not just this one named case.

### 9i. Browser QA — public pages PASSED (safe/offline), admin SEO Studio BLOCKED

Public pages (`/`, `/about`, `/sitemap`, `/privacy-policy`, `/seo-company-jaisalmer`) were
checked with Playwright (already cached locally — nothing new installed) served from the
already-built `dist/` output via a plain static file server with **no backend, no proxy, no
path to production** — the safest possible way to do visual/responsive QA this pass. 7
breakpoints × 5 pages (35 checks): zero horizontal overflow, zero console errors, zero network
requests attempted (confirms hydration reuses embedded prerendered data rather than
re-fetching). Full 1280×800 breakpoint was not included (1440×900 and 1024×768 bracket it);
otherwise matches the requested set.

**Authenticated admin SEO Studio pages (Dashboard, ContentAnalyzer, Redirects, Settings) could
not be QA'd this pass** — every one of them requires a logged-in admin session, and logging in
locally would write to the production `admin_sessions`/`login_attempts` tables (§9a). **BLOCKED**,
not tested, not assumed passing.

### 9j. Security review — code review only, no live exploitation testing

Reviewed (unchanged from prior phase, re-confirmed): parameterized SQL throughout the new
lifecycle functions (`seo_begin_prerender_build`, `seo_mark_document_failed`,
`seo_recover_abandoned_building_documents` — all `?`/named placeholders, no string
concatenation of request input into SQL); `read_json_body()` degrades malformed JSON to `[]`
safely (no crash, no leaked parser error); failure reasons stored in the database are always
either a fixed pre-classified label or a length-truncated admin-supplied string, never a raw
exception message or filesystem path; the two new endpoints
(`seo_studio_recover_abandoned_builds`, the updated `seo_studio_mark_prerendered`) both call
`require_admin` → `require_csrf` → `require_permission` in that order before touching anything,
and audit-log on denial. Request-size limits rely on PHP's own `post_max_size` ini default
(shared-hosting standard, unchanged) — no application-level limit was added or needed this
pass. **Not tested**: live SQLi/XSS/IDOR/CSRF fuzzing against a running instance (needs a safe
database — none available); external link checking remains unimplemented, no new SSRF surface
was introduced.

### 9k. Verification suite re-run this pass

```
npx tsc --noEmit                    # clean
php -l across api/, scripts/, database/   # clean
npm run build                       # clean, main bundle 296.65 KB / 92.41 KB gzip (was 296.61/92.39 — negligible, from the widened SeoPageSeo type)
npm run build:ssr                   # clean
npm run test:seo-parity             # 13/13, unchanged
npm run test:migrate-glob           # new — PASSED
```

`npm run prerender` was **not re-run this pass** after the `entry-server.tsx`/
`SeoCompanyJaisalmer.tsx` fix, to avoid any further contact with the production site while this
phase's safety review was still active — it was run once earlier in this same session
(immediately after making the fix, before the port-8080 discovery), returning 159/159 with
`/seo-company-jaisalmer`'s prerendered HTML confirmed showing real CMS content (not the
hardcoded fallback). That result stands as evidence of the fix working, but should be re-run
fresh once normal verification resumes.

### 9l. Deployment decision

# NO-GO

No isolated MySQL/MariaDB test environment exists for this project — every database-dependent
requirement in the acceptance criteria (clean migration, representative upgrade, rollback,
reapply, data preservation, registry initialization, live redirect regression, authenticated
admin browser QA) is **BLOCKED**, not passed. Per this phase's own rule, an untested required
item makes the decision NO-GO regardless of how much non-database work has passed. See the
deployment-safety warning at the top of this file for what needs to change before this can be
revisited: a genuinely isolated staging/test database, separate from the production Remote
MySQL connection local development currently defaults to.

**What passed** (does not change the decision, listed for completeness): TypeScript, PHP
syntax, SEO parity (13/13), production build, SSR build, migration-glob regression test, mock-
API raw-HTML verification, public-page browser QA, public-bundle size check.

**What to re-run once an isolated staging database is available** — in order:
1. `php database/migrate.php` against an empty database — clean-install test.
2. Seed representative synthetic data (per this phase's brief §5) and re-run migrate.php —
   representative-upgrade test.
3. `php database/rollback.php 0017_prerender_lifecycle.sql` then re-`migrate.php` — rollback/
   reapply test.
4. Registry sync (dry run, then apply, then repeat) — idempotency/initialization test.
5. Log in as an admin and exercise the full Dashboard/ContentAnalyzer/Redirects/Settings UI at
   the 8 breakpoints — authenticated browser QA.
6. `npm run test:redirects` against that database — live redirect regression.
7. A second, lower-privileged synthetic admin role — live per-field permission test.
8. `npm run prerender` fresh, then `php scripts/apply-prerender-report.php` — full lifecycle
   database test (stale → building → current/failed transitions, verified against real rows).
