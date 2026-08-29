<?php
// SEO Document Registry: discovers every legitimate public route (database-backed and
// route-only) and keeps one seo_documents row per route in sync. This is an admin-side
// aggregation/analysis layer only — it never becomes a second route-validity source (that
// stays api/lib/route_manifest.php) or a second metadata store (that stays seo_meta). See
// docs/SEO_STUDIO_ARCHITECTURE.md for full ownership boundaries.

declare(strict_types=1);

require_once __DIR__ . '/../route_manifest.php';
require_once __DIR__ . '/rules.php';
require_once __DIR__ . '/extract.php';
require_once __DIR__ . '/input.php';
require_once __DIR__ . '/dashboard.php';

// Virtual content types for route-only documents — real content types stay SEO_CONTENT_TYPES.
// 'venture' moved out of this list once Ventures got a real `ventures` table (Ventures CMS
// phase) — it's now discovered through seo_discover_database_documents() like every other real
// content type, not through the route-only static-page path below.
const SEO_VIRTUAL_CONTENT_TYPES = ['static_page'];

function seo_normalize_route(string $path): string
{
    $path = strtolower(trim($path));
    if ($path === '' ) {
        return '/';
    }
    $path = '/' . ltrim($path, '/');
    if (strlen($path) > 1) {
        $path = rtrim($path, '/');
    }
    return $path === '' ? '/' : $path;
}

/** Stable, content-identity-based keys — never regenerated from a slug alone once a real DB id
 *  exists, so a slug change can never silently create a second, unrelated document (spec §3). */
function seo_document_key(string $contentType, ?int $contentId, string $routePath): string
{
    // Venture keys are always slug-derived from the route, never from the numeric id — even
    // now that Ventures have a real database id — so a Venture's key (and every existing
    // "venture:{slug}" key from before Ventures had their own table) never changes across a
    // slug edit, a re-seed, or the id a fresh install happens to assign (spec §3).
    if ($contentType === 'venture') {
        $slug = trim($routePath, '/');
        $slug = str_starts_with($slug, 'our-ventures/') ? substr($slug, strlen('our-ventures/')) : $slug;
        return "venture:{$slug}";
    }

    $prefix = match ($contentType) {
        'service' => 'service',
        'blog_post' => 'blog',
        'seo_page' => 'seo-page',
        'portfolio_project' => 'portfolio',
        'page' => 'page',
        default => 'static',
    };

    if ($contentId !== null) {
        return "{$prefix}:{$contentId}";
    }

    $norm = seo_normalize_route($routePath);
    if (in_array($norm, ['/blog', '/portfolio', '/our-ventures'], true)) {
        return 'collection:' . ltrim(str_replace('our-ventures', 'ventures', $norm), '/');
    }
    if ($norm === '/') {
        return 'static:home';
    }
    return 'static:' . trim(str_replace('/', '-', $norm), '-');
}

function seo_page_type_for_route(string $routePath): string
{
    $norm = seo_normalize_route($routePath);
    return match (true) {
        $norm === '/' => 'homepage',
        $norm === '/about' => 'about',
        $norm === '/contact' => 'contact',
        $norm === '/channel-manager-pricing' => 'pricing',
        $norm === '/seo-audit-tool' => 'tool_landing',
        str_starts_with($norm, '/our-ventures/') => 'venture',
        $norm === '/our-ventures' => 'venture',
        default => 'utility_noindex',
    };
}

/** One row describing a discovered document, before it's written to the database. Ventures are
 *  no longer discovered here — they have a real `ventures` table now and flow through
 *  seo_discover_database_documents() like every other real content type. */
function seo_discover_static_and_venture_documents(): array
{
    $docs = [];
    foreach (static_public_routes() as $route) {
        $docs[] = [
            'document_key' => seo_document_key('static_page', null, $route),
            'route_path' => seo_normalize_route($route),
            'content_type' => 'static_page',
            'content_id' => null,
            'source_type' => 'static_route',
            'source_id' => null,
            'page_profile' => seo_page_type_for_route($route),
            'is_dynamic' => false,
            'is_published' => true,
            'seo_editable' => true,
            'content_editable' => false,
        ];
    }
    return $docs;
}

// Routes where a real database content row exists at the same path as a static React route,
// but the static route's own resolver (useSeoOverride) is what actually controls the rendered
// metadata — the database row is only ever consumed as a secondary fallback beneath it (see
// SeoAuditTool.tsx: `seoOverride?.title || pageSeo?.meta_title || hardcoded`). Registering the
// database row as this route's registry owner would let an admin edit through SEO Studio
// without it ever visibly changing the live page, since the static override still wins. This
// is the opposite of /seo-company-jaisalmer (SeoCompanyJaisalmer.tsx has no static override at
// all — the database row IS the only real source there), so it isn't safe to resolve with one
// blanket rule; each route needs to be listed explicitly once its real priority is confirmed by
// reading the component. Excluding these routes here doesn't remove or hide the underlying
// content row — it stays fully visible and editable via its own admin section (e.g. SEO Pages),
// just never claims registry ownership of a route a static page already controls.
const SEO_ROUTES_WHERE_STATIC_OVERRIDE_WINS = ['/seo-audit-tool'];

function seo_discover_database_documents(PDO $pdo): array
{
    $union = seo_inventory_union_sql();
    $stmt = $pdo->query("SELECT content_type, content_id, title, slug, status FROM ($union) c");
    $docs = [];
    foreach ($stmt->fetchAll() as $row) {
        $routePath = seo_public_url($row['content_type'], $row);
        if (in_array(seo_normalize_route($routePath), SEO_ROUTES_WHERE_STATIC_OVERRIDE_WINS, true)) {
            continue;
        }
        $docs[] = [
            'document_key' => seo_document_key($row['content_type'], (int) $row['content_id'], $routePath),
            'route_path' => seo_normalize_route($routePath),
            'content_type' => $row['content_type'],
            'content_id' => (int) $row['content_id'],
            'source_type' => 'database',
            'source_id' => null,
            'page_profile' => seo_default_page_type($row['content_type'], $row),
            'is_dynamic' => true,
            'is_published' => $row['status'] === 'published',
            'seo_editable' => true,
            'content_editable' => true,
            'display_name' => $row['title'],
        ];
    }
    return $docs;
}

/** Fetches a document's display name from its real source, safely and cheaply — a prerendered
 *  H1/title for route-only documents (never a fresh HTTP crawl of the live site; spec §15),
 *  or the DB row's own title for database documents. */
function seo_display_name_for_route(string $routePath, string $fallback): string
{
    $html = seo_read_prerendered_html($routePath);
    if ($html === null) {
        return $fallback;
    }
    if (preg_match('/<title>(.*?)<\/title>/s', $html, $m)) {
        return html_entity_decode(strip_tags(trim($m[1])), ENT_QUOTES);
    }
    return $fallback;
}

/** Reads the build-time prerendered HTML file for a route, if one exists (Phase 3's
 *  scripts/prerender.mjs output, dist/{route}.html — see SEO_STUDIO_ARCHITECTURE.md). Never
 *  makes a network request; returns null (not an error) when no prerendered file exists yet,
 *  so callers fall back to metadata-only analysis rather than fabricating content. */
function seo_read_prerendered_html(string $routePath): ?string
{
    $norm = seo_normalize_route($routePath);
    $distDir = __DIR__ . '/../../../dist';
    $file = $norm === '/' ? $distDir . '/index.html' : $distDir . rtrim($norm, '/') . '.html';
    $real = realpath($file);
    // Defensive: the resolved path must stay inside dist/ — a malformed route_path could
    // otherwise attempt path traversal via a crafted slug.
    $distReal = realpath($distDir);
    if ($real === false || $distReal === false || !str_starts_with($real, $distReal)) {
        return null;
    }
    $content = @file_get_contents($real);
    return $content === false ? null : $content;
}

/** Idempotent full registry sync. Safe to run repeatedly — every write is an upsert keyed on
 *  the stable document_key, never a delete (unclear-ownership content is only ever flagged via
 *  is_published=0/orphan reporting, never removed automatically — spec §4). */
function seo_sync_registry(PDO $pdo, bool $dryRun = false): array
{
    // Database documents are merged FIRST on purpose: a route can only collide when a static
    // React route (App.tsx) and a real CMS content row (e.g. a seo_pages row) both resolve to
    // the exact same path — this project has exactly one such case, /seo-company-jaisalmer,
    // which is simultaneously in static_public_routes() (it needs its own dedicated <Route>,
    // not the seo_pages :slug catch-all) and a real seeded seo_pages row. On a collision below
    // (same route, different keys), whichever array element was seen first wins the route and
    // the other is reported via routeConflicts — real content should always win over a
    // synthetic static_page placeholder, never the reverse, so database documents go first.
    // (Found and fixed during the MySQL/gap-closure audit — the previous static-first order
    // meant that route's real seo_page document was silently dropped every sync; see
    // docs/SEO_STUDIO_ARCHITECTURE.md Part 4.)
    $discovered = array_merge(seo_discover_database_documents($pdo), seo_discover_static_and_venture_documents());

    $report = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'duplicateKeys' => [], 'routeConflicts' => [], 'dryRun' => $dryRun];

    $seenKeys = [];
    $seenRoutes = [];

    $existingStmt = $pdo->query('SELECT id, document_key, route_path, content_hash FROM seo_documents');
    $existingByKey = [];
    foreach ($existingStmt->fetchAll() as $row) {
        $existingByKey[$row['document_key']] = $row;
    }

    if (!$dryRun) {
        $pdo->beginTransaction();
    }

    try {
        $upsert = $pdo->prepare(
            'INSERT INTO seo_documents
                (document_key, route_path, content_type, content_id, source_type, source_id, page_profile,
                 display_name, is_dynamic, is_indexable, is_published, seo_editable, content_editable,
                 canonical_route, prerender_status, last_synced_at, created_at, updated_at)
             VALUES
                (:document_key, :route_path, :content_type, :content_id, :source_type, :source_id, :page_profile,
                 :display_name, :is_dynamic, :is_indexable, :is_published, :seo_editable, :content_editable,
                 :canonical_route, :prerender_status, NOW(), NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                route_path = VALUES(route_path), content_type = VALUES(content_type), content_id = VALUES(content_id),
                source_type = VALUES(source_type), source_id = VALUES(source_id), page_profile = VALUES(page_profile),
                display_name = VALUES(display_name), is_dynamic = VALUES(is_dynamic), is_published = VALUES(is_published),
                seo_editable = VALUES(seo_editable), content_editable = VALUES(content_editable),
                canonical_route = VALUES(canonical_route), last_synced_at = NOW(), updated_at = NOW()'
        );

        foreach ($discovered as $doc) {
            $key = $doc['document_key'];
            $route = $doc['route_path'];

            if (isset($seenKeys[$key])) {
                $report['duplicateKeys'][] = $key;
                continue;
            }
            $seenKeys[$key] = true;

            if (isset($seenRoutes[$route]) && $seenRoutes[$route] !== $key) {
                $report['routeConflicts'][] = ['route' => $route, 'keys' => [$seenRoutes[$route], $key]];
                continue;
            }
            $seenRoutes[$route] = $key;

            $displayName = $doc['display_name'] ?? seo_display_name_for_route($route, $key);
            $existing = $existingByKey[$key] ?? null;

            if (!$dryRun) {
                $upsert->execute([
                    'document_key' => $key,
                    'route_path' => $route,
                    'content_type' => $doc['content_type'],
                    'content_id' => $doc['content_id'],
                    'source_type' => $doc['source_type'],
                    'source_id' => $doc['source_id'],
                    'page_profile' => $doc['page_profile'],
                    'display_name' => $displayName,
                    'is_dynamic' => $doc['is_dynamic'] ? 1 : 0,
                    'is_indexable' => 1,
                    'is_published' => $doc['is_published'] ? 1 : 0,
                    'seo_editable' => $doc['seo_editable'] ? 1 : 0,
                    'content_editable' => $doc['content_editable'] ? 1 : 0,
                    'canonical_route' => $route,
                    'prerender_status' => 'not_applicable',
                ]);
                $documentId = $existing ? (int) $existing['id'] : (int) $pdo->lastInsertId();
                seo_ensure_document_seo_meta($pdo, $documentId, $doc['content_type']);
            }

            $report[$existing ? 'updated' : 'created']++;
        }

        // Orphan detection: registry rows whose document_key was NOT rediscovered this run.
        $orphans = [];
        foreach ($existingByKey as $key => $row) {
            if (!isset($seenKeys[$key])) {
                $orphans[] = ['id' => (int) $row['id'], 'document_key' => $key, 'route_path' => $row['route_path']];
            }
        }
        $report['orphans'] = $orphans;
        if (!$dryRun && $orphans) {
            $ids = array_column($orphans, 'id');
            $in = implode(',', array_fill(0, count($ids), '?'));
            $pdo->prepare("UPDATE seo_documents SET is_published = 0, updated_at = NOW() WHERE id IN ($in)")->execute($ids);
        }

        if (!$dryRun) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if (!$dryRun && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return $report;
}

/** Ensures exactly one seo_meta row exists for a route-only document (entity_type =
 *  'seo_document', entity_id = the document's own id — matches the existing UNIQUE KEY
 *  uq_seo_meta_entity, so this can never produce two conflicting metadata rows for one
 *  document). No-op for database documents, which already have their own seo_meta row via
 *  content_type/content_id. */
function seo_ensure_document_seo_meta(PDO $pdo, int $documentId, string $contentType): void
{
    if (!in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        return;
    }
    $stmt = $pdo->prepare("SELECT 1 FROM seo_meta WHERE entity_type = 'seo_document' AND entity_id = :id LIMIT 1");
    $stmt->execute(['id' => $documentId]);
    if ($stmt->fetchColumn()) {
        $pdo->prepare('UPDATE seo_meta SET document_id = :doc WHERE entity_type = \'seo_document\' AND entity_id = :id')
            ->execute(['doc' => $documentId, 'id' => $documentId]);
        return;
    }
    $pdo->prepare(
        "INSERT INTO seo_meta (entity_type, entity_id, document_id, robots_index, robots_follow, created_at, updated_at)
         VALUES ('seo_document', :id, :doc, 1, 1, NOW(), NOW())"
    )->execute(['id' => $documentId, 'doc' => $documentId]);
}

/** Backfills seo_meta.document_id for every existing database-backed content row, matching
 *  content_type/content_id against the now-synced registry. Safe to run repeatedly (only ever
 *  sets document_id where it's currently NULL and a match exists). */
function seo_backfill_seo_meta_associations(PDO $pdo): int
{
    $stmt = $pdo->exec(
        'UPDATE seo_meta m
         JOIN seo_documents d ON d.content_type = m.entity_type AND d.content_id = m.entity_id
         SET m.document_id = d.id
         WHERE m.document_id IS NULL'
    );
    return (int) $stmt;
}

function seo_find_document(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM seo_documents WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if ($row) {
        foreach (['is_dynamic', 'is_indexable', 'is_published', 'seo_editable', 'content_editable'] as $bool) {
            $row[$bool] = (bool) $row[$bool];
        }
    }
    return $row ?: null;
}

function seo_find_document_by_content(PDO $pdo, string $contentType, int $contentId): ?array
{
    if (in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        return seo_find_document($pdo, $contentId);
    }
    $stmt = $pdo->prepare('SELECT id FROM seo_documents WHERE content_type = :t AND content_id = :id LIMIT 1');
    $stmt->execute(['t' => $contentType, 'id' => $contentId]);
    $id = $stmt->fetchColumn();
    return $id ? seo_find_document($pdo, (int) $id) : null;
}

/** Called after a document's SEO fields or content are saved (spec §16): marks its prerender
 *  status stale and records the new content hash — never marks it 'current' here, since only a
 *  real successful prerender build (outside this request — see
 *  docs/SEO_STUDIO_ARCHITECTURE.md's prerender-lifecycle section) can honestly claim that.
 *
 *  Static/venture documents are always 'not_applicable' rather than 'stale': their prerendered
 *  HTML is generated from the React source component, which does not currently read the
 *  seo_meta row this save just updated (a real, documented limitation — see
 *  SEO_STUDIO_ARCHITECTURE.md's "static-page metadata is not yet live" note) — so a rebuild
 *  would not actually pick up this change, and marking it 'stale' would be misleading. */
/** Called on every save (spec §7). Both real content and static/Venture documents go 'stale'
 *  now — Part 3 wired static/Venture metadata into live rendering and prerendering, so a save
 *  to either genuinely requires a rebuild before the public prerendered HTML reflects it;
 *  there is no longer a class of document where a save has no prerender impact. (Earlier code
 *  still marked static/Venture documents 'not_applicable' here — a leftover from before Part 3
 *  closed that loop; fixed as part of this pass's code audit.) Never marks 'current' — only a
 *  real, hash-verified successful prerender (seo_mark_document_current_if_matching) may do that. */
function seo_mark_document_stale(PDO $pdo, string $contentType, int $contentId, string $contentHash, string $reason = 'content changed'): void
{
    $doc = seo_find_document_by_content($pdo, $contentType, $contentId);
    if (!$doc) {
        return; // registry hasn't been synced yet for this item — nothing to mark
    }
    $pdo->prepare(
        'UPDATE seo_documents SET content_hash = :hash, prerender_status = \'stale\', stale_reason = :reason, updated_at = NOW() WHERE id = :id'
    )->execute(['hash' => $contentHash, 'reason' => $reason, 'id' => $doc['id']]);
}

function seo_find_document_by_key(PDO $pdo, string $key): ?array
{
    $stmt = $pdo->prepare('SELECT id FROM seo_documents WHERE document_key = :k LIMIT 1');
    $stmt->execute(['k' => $key]);
    $id = $stmt->fetchColumn();
    return $id ? seo_find_document($pdo, (int) $id) : null;
}

/** Cross-checks the registry against the live route manifest and sitemap — spec §27's
 *  diagnostic report. Read-only. */
/** Same shape as seo_inventory_union_sql() (content_type, content_id, title, slug, status,
 *  updated_at) but also includes registry-only static/venture documents, sourced from
 *  seo_documents itself rather than a content table (they have none) — content_id is the
 *  document's own id, consistent with seo_meta_entity_type_for()'s scheme throughout this
 *  module. Used wherever bulk operations need to reach route-only documents too. */
function seo_inventory_union_sql_with_virtual(): string
{
    $base = seo_inventory_union_sql();
    return "
        $base
        UNION ALL
        SELECT content_type, id AS content_id, display_name AS title, TRIM(LEADING '/' FROM route_path) AS slug,
               CASE WHEN is_published = 1 THEN 'published' ELSE 'draft' END AS status, updated_at
        FROM seo_documents WHERE source_type IN ('static_route', 'venture_data')
    ";
}

/** Marks every registry document whose route is part of this build attempt 'building', with a
 *  build identifier and start time — called by scripts/apply-prerender-report.php right before
 *  it starts evaluating a completed `npm run build:prerender` run's report. There is no true
 *  real-time "prerender started" signal available (the Node build process has no database
 *  credentials — see the file header note), so 'building' here represents "this script is now
 *  applying build attempt $buildId's results," bracketing the same evaluation pass that decides
 *  current/failed immediately below it — not a second, independently-timed lifecycle. Only
 *  touches documents whose route is actually in `$routes` (never a route this build attempt
 *  didn't touch), and idempotent: calling it again for the same routes just re-stamps
 *  started_at/build_id, which is fine since a document only stays 'building' for the duration
 *  of this one script run. */
function seo_begin_prerender_build(PDO $pdo, array $routes, string $buildId): int
{
    if (!$routes) {
        return 0;
    }
    $normalized = array_map('seo_normalize_route', $routes);
    $placeholders = implode(',', array_fill(0, count($normalized), '?'));
    $stmt = $pdo->prepare(
        "UPDATE seo_documents SET prerender_status = 'building', prerender_build_id = ?, prerender_started_at = NOW(), prerender_completed_at = NULL, updated_at = NOW()
         WHERE route_path IN ($placeholders)"
    );
    $stmt->execute([$buildId, ...$normalized]);
    return $stmt->rowCount();
}

/** Closes the prerender lifecycle loop (spec §7) for one route, called only by
 *  scripts/apply-prerender-report.php after a real, successful `npm run build:prerender` run
 *  — never by the Node build itself (no DB credentials are ever given to the build
 *  environment). Re-runs the exact same analysis the save flow uses to compute the document's
 *  *current* content hash, and marks it 'current' only if that matches what's already stored
 *  as `content_hash` — i.e. only if nothing has changed since the last save. If the document
 *  has since changed (someone edited it again after the build started), this correctly leaves
 *  it 'stale' rather than lying about it being up to date. */
function seo_mark_document_current_if_matching(PDO $pdo, string $routePath): array
{
    $normalized = seo_normalize_route($routePath);
    $stmt = $pdo->prepare('SELECT * FROM seo_documents WHERE route_path = :route LIMIT 1');
    $stmt->execute(['route' => $normalized]);
    $doc = $stmt->fetch();
    if (!$doc) {
        return ['route' => $routePath, 'result' => 'no_document'];
    }

    $contentType = $doc['content_type'];
    $contentId = in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true) ? (int) $doc['id'] : (int) $doc['content_id'];
    $result = seo_analyze($pdo, $contentType, $contentId);
    if (!$result) {
        return ['route' => $routePath, 'result' => 'content_missing'];
    }

    if ($doc['content_hash'] !== null && $doc['content_hash'] !== $result['contentHash']) {
        $pdo->prepare(
            "UPDATE seo_documents SET prerender_status = 'stale', stale_reason = 'content changed since this prerender build started', prerender_completed_at = NOW(), updated_at = NOW() WHERE id = :id"
        )->execute(['id' => $doc['id']]);
        return ['route' => $routePath, 'result' => 'stale', 'reason' => 'content changed since prerender started'];
    }

    $pdo->prepare(
        "UPDATE seo_documents SET prerender_status = 'current', prerender_hash = :hash, content_hash = :hash,
         prerender_completed_at = NOW(), last_successful_prerender_at = NOW(), prerender_failure_reason = NULL, stale_reason = NULL, updated_at = NOW()
         WHERE id = :id"
    )->execute(['hash' => $result['contentHash'], 'id' => $doc['id']]);
    return ['route' => $routePath, 'result' => 'current'];
}

/** Marks one route's document 'failed' after an incomplete/errored build (spec §7). Never
 *  touches `prerender_hash` or `last_successful_prerender_at` — the last real successful
 *  prerender stays exactly as it was, so the public site keeps serving that known-good HTML
 *  until the next successful build. `$safeReason` must never contain a filesystem path,
 *  exception message, or anything else from the raw build output — callers pass a short,
 *  pre-classified reason string (see scripts/apply-prerender-report.php). */
function seo_mark_document_failed(PDO $pdo, string $routePath, string $safeReason): array
{
    $normalized = seo_normalize_route($routePath);
    $stmt = $pdo->prepare(
        "UPDATE seo_documents SET prerender_status = 'failed', prerender_failure_reason = :reason, prerender_completed_at = NOW(), updated_at = NOW()
         WHERE route_path = :route"
    );
    $stmt->execute(['reason' => $safeReason, 'route' => $normalized]);
    return ['route' => $routePath, 'result' => $stmt->rowCount() > 0 ? 'failed' : 'no_document'];
}

/** Recovery for documents stuck 'building' because a build process terminated unexpectedly
 *  (crashed, killed, host ran out of memory) without ever reaching a current/failed outcome
 *  (spec §7 "Recovery"). Requires explicit admin/CLI action — never runs automatically — and
 *  only moves a document out of 'building' when its own `prerender_started_at` is older than
 *  `$timeoutMinutes`, so it can never affect a build attempt that's still genuinely in
 *  progress. Idempotent: documents already outside 'building' are untouched by the WHERE
 *  clause, so calling this repeatedly is always safe. Never marks anything 'current' — only
 *  seo_mark_document_current_if_matching (a real hash-verified success) may do that. */
function seo_recover_abandoned_building_documents(PDO $pdo, int $timeoutMinutes = 60): array
{
    $stmt = $pdo->prepare(
        "SELECT id, route_path FROM seo_documents
         WHERE prerender_status = 'building' AND prerender_started_at IS NOT NULL
           AND prerender_started_at < (NOW() - INTERVAL :minutes MINUTE)"
    );
    $stmt->execute(['minutes' => $timeoutMinutes]);
    $abandoned = $stmt->fetchAll();
    if (!$abandoned) {
        return [];
    }

    $ids = array_column($abandoned, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $update = $pdo->prepare(
        "UPDATE seo_documents SET prerender_status = 'failed',
         prerender_failure_reason = 'Build did not complete within the timeout window — recovered by admin/CLI action', prerender_completed_at = NOW(), updated_at = NOW()
         WHERE id IN ($placeholders)"
    );
    $update->execute($ids);

    return array_map(fn($row) => $row['route_path'], $abandoned);
}

function seo_registry_diagnostics(PDO $pdo): array
{
    $manifestRoutes = array_map('seo_normalize_route', static_public_routes());
    $registryRoutes = $pdo->query('SELECT route_path, is_published, is_indexable FROM seo_documents')->fetchAll();
    $registryStaticRoutes = [];
    foreach ($registryRoutes as $r) {
        $registryStaticRoutes[$r['route_path']] = $r;
    }

    $manifestMissingFromRegistry = array_values(array_diff($manifestRoutes, array_keys($registryStaticRoutes)));

    $dynamicCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM seo_documents WHERE is_dynamic = 1"
    )->fetchColumn();

    // Duplicate normalized routes: route_path is UNIQUE at the DB level already, but that
    // constraint is on the raw stored string — two rows could still normalize to the same
    // route if one was inserted before normalization rules changed. Cheap to check directly.
    $routeCounts = [];
    foreach (array_keys($registryStaticRoutes) as $r) {
        $norm = seo_normalize_route($r);
        $routeCounts[$norm] = ($routeCounts[$norm] ?? 0) + 1;
    }
    $duplicateNormalizedRoutes = array_keys(array_filter($routeCounts, fn($c) => $c > 1));

    $noindexRegisteredCount = count(array_filter(
        $registryRoutes,
        fn($r) => (bool) $r['is_published'] && !$r['is_indexable']
    ));

    // A published, indexable document whose own route is also an active redirect source is a
    // real contradiction (the redirect will fire before the page is ever seen) — never possible
    // to create through the admin UI's own conflict check (see RedirectController), but worth
    // surfacing if data was seeded/migrated directly.
    $redirectSources = $pdo->query(
        "SELECT source_url FROM redirects WHERE status = 'active'"
    )->fetchAll(PDO::FETCH_COLUMN);
    $activeRedirectSourceSet = array_flip(array_map('seo_normalize_route', $redirectSources));
    $redirectSourceOverlap = [];
    foreach ($registryStaticRoutes as $route => $r) {
        if ($r['is_published'] && isset($activeRedirectSourceSet[$route])) {
            $redirectSourceOverlap[] = $route;
        }
    }

    $publishedMissingCanonical = (int) $pdo->query(
        "SELECT COUNT(*) FROM seo_documents d
         LEFT JOIN seo_meta m ON m.entity_type = 'seo_document' AND m.entity_id = d.id
         WHERE d.is_published = 1 AND (m.canonical_url IS NULL OR m.canonical_url = '')"
    )->fetchColumn();

    // Canonical conflicts are structurally prevented, not just checked — seo_meta.canonical_url
    // carries a UNIQUE constraint (0005_content_shared.sql), so two rows can never share a
    // non-null canonical value. No diagnostic query needed for something the schema already
    // guarantees; noted here so this isn't mistaken for an unimplemented check.

    return [
        'manifestStaticRouteCount' => count($manifestRoutes),
        'registryDocumentCount' => count($registryRoutes),
        'registryDynamicDocumentCount' => $dynamicCount,
        'manifestRoutesMissingFromRegistry' => $manifestMissingFromRegistry,
        'unpublishedInRegistry' => count(array_filter($registryRoutes, fn($r) => !$r['is_published'])),
        'duplicateNormalizedRoutes' => $duplicateNormalizedRoutes,
        'noindexRegisteredCount' => $noindexRegisteredCount,
        'redirectSourceOverlap' => $redirectSourceOverlap,
        'publishedMissingCanonical' => $publishedMissingCanonical,
    ];
}
