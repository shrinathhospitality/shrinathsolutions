<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/seo/analyze.php';
require_once __DIR__ . '/../lib/seo/dashboard.php';
require_once __DIR__ . '/../lib/seo/settings.php';
require_once __DIR__ . '/../lib/seo/permissions.php';
require_once __DIR__ . '/../lib/seo/public_resolve.php';

const SEO_BULK_DEFAULT_BATCH = 15;
const SEO_BULK_MAX_BATCH = 30;
const SEO_STALE_CORNERSTONE_DAYS = 90;

function seo_require_valid_content_type(string $type): void
{
    if (!in_array($type, SEO_CONTENT_TYPES, true) && !in_array($type, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        json_error('Unknown content type.', 400);
    }
}

// ---------------------------------------------------------------------------
function seo_studio_dashboard(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    json_success(['summary' => seo_dashboard_summary($pdo)]);
}

// ---------------------------------------------------------------------------
function seo_studio_content_list(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $filters = [
        'search' => trim((string) ($_GET['search'] ?? '')),
        'content_type' => trim((string) ($_GET['content_type'] ?? '')),
        'status' => trim((string) ($_GET['status'] ?? '')),
        'score_status' => trim((string) ($_GET['score_status'] ?? '')),
        'cornerstone' => !empty($_GET['cornerstone']),
        'missing_keyphrase' => !empty($_GET['missing_keyphrase']),
        'missing_metadata' => !empty($_GET['missing_metadata']),
        'orphan' => !empty($_GET['orphan']),
    ];
    if (isset($_GET['indexable']) && $_GET['indexable'] !== '') {
        $filters['indexable'] = $_GET['indexable'] === '1';
    }
    if ($filters['content_type'] !== '') {
        seo_require_valid_content_type($filters['content_type']);
    }

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($_GET['per_page'] ?? 25)));

    $result = seo_content_inventory($pdo, $filters, ['page' => $page, 'per_page' => $perPage]);
    json_success(['items' => $result['items'], 'meta' => pagination_meta($result['total'], $page, $perPage)]);
}

// ---------------------------------------------------------------------------
function seo_studio_content_detail(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    $type = $params['type'];
    $id = (int) $params['id'];
    seo_require_valid_content_type($type);

    $row = seo_load_content_row($pdo, $type, $id);
    if (!$row) {
        json_error('Content not found.', 404);
    }

    $seoMeta = get_seo_meta($pdo, seo_meta_entity_type_for($type), $id);
    $analysis = seo_find_analysis($pdo, $type, $id);
    $incoming = seo_count_incoming_links($pdo, $type, $id);

    json_success([
        'content' => ['type' => $type, 'id' => $id, 'title' => $row['title'] ?? $row['name'] ?? '', 'slug' => $row['slug'] ?? '', 'status' => $row['status'] ?? ''],
        'seo' => $seoMeta,
        'analysis' => $analysis,
        'incomingLinks' => $incoming,
        'engineVersion' => seo_engine_version(),
    ]);
}

// ---------------------------------------------------------------------------
/** Save flow (spec §22): validates, saves SEO fields via the existing save_seo_meta(),
 *  computes the authoritative server analysis, skips re-persisting if content_hash + engine
 *  version are unchanged (spec §9's staleness rule), rebuilds this item's outgoing link index,
 *  and returns the normalized result. Never re-runs the public route/schema/sitemap pipeline
 *  itself — those already regenerate from the same underlying tables on their own schedule
 *  (api/sitemap.php's cache, Phase 3's build-time prerender) — this endpoint only marks
 *  prerender-staleness (see seo_studio_content_detail's response `prerenderStale` field). */
function seo_studio_content_save(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $type = $params['type'];
    $id = (int) $params['id'];
    seo_require_valid_content_type($type);

    // read_json_body() is only safely readable once (php://input) — read it here, once, and
    // reuse $body for both the permission check below and the save logic further down.
    $body = read_json_body();

    // Every save at minimum touches title/description/social fields (seo.edit_metadata).
    // Changing canonical or the robots directives is a higher-stakes, indexability-affecting
    // change and requires seo.edit_advanced in addition; changing the schema payload requires
    // seo.manage_schema in addition. Both checks happen before the content-existence lookup
    // below, so an unauthorized request never learns whether the target document even exists.
    require_permission($pdo, $ctx, 'seo.edit_metadata', $type, (string) $id);
    $seoInput = is_array($body['seo'] ?? null) ? $body['seo'] : [];

    // Compares against the *currently stored* value, not merely whether the key is present in
    // the request body — the admin UI always round-trips the full seo object it loaded
    // (including robots_index/robots_follow/canonical_url, which are populated on every load
    // once any save has happened), so a presence-only check would require seo.edit_advanced on
    // every single save regardless of what actually changed, permanently locking out a
    // metadata-only editor. Read here (not exposed to the client — used only for this
    // server-side comparison) is safe before the content-existence check below, since the
    // caller already holds the baseline seo.edit_metadata permission at this point.
    $currentSeo = get_seo_meta($pdo, seo_meta_entity_type_for($type), $id) ?? [];

    $advancedFieldChanged =
        (array_key_exists('canonical_url', $seoInput) && (string) ($seoInput['canonical_url'] ?? '') !== (string) ($currentSeo['canonical_url'] ?? ''))
        || (array_key_exists('robots_index', $seoInput) && (bool) $seoInput['robots_index'] !== (bool) ($currentSeo['robots_index'] ?? true))
        || (array_key_exists('robots_follow', $seoInput) && (bool) $seoInput['robots_follow'] !== (bool) ($currentSeo['robots_follow'] ?? true));
    if ($advancedFieldChanged) {
        require_permission($pdo, $ctx, 'seo.edit_advanced', $type, (string) $id);
    }

    $schemaChanged = array_key_exists('schema', $seoInput)
        && json_encode($seoInput['schema']) !== json_encode($currentSeo['schema'] ?? null);
    if ($schemaChanged) {
        require_permission($pdo, $ctx, 'seo.manage_schema', $type, (string) $id);
    }

    $row = seo_load_content_row($pdo, $type, $id);
    if (!$row) {
        json_error('Content not found.', 404);
    }

    $keyphraseInput = [
        'primary_keyphrase' => isset($body['primary_keyphrase']) ? trim((string) $body['primary_keyphrase']) : null,
        'related_keyphrases' => is_array($body['related_keyphrases'] ?? null) ? array_values(array_filter(array_map('trim', $body['related_keyphrases']))) : [],
        'synonyms' => is_array($body['synonyms'] ?? null) ? array_values(array_filter(array_map('trim', $body['synonyms']))) : [],
        'language' => in_array($body['language'] ?? 'en', ['en', 'hi'], true) ? $body['language'] : 'en',
        'is_cornerstone' => !empty($body['is_cornerstone']),
    ];
    if (count($keyphraseInput['related_keyphrases']) > 5) {
        json_error('A maximum of 5 related keyphrases is supported.', 422);
    }

    $pdo->beginTransaction();
    try {
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, seo_meta_entity_type_for($type), $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }

        // Persist keyphrase/cornerstone fields even before the first full analysis exists, by
        // upserting a placeholder analysis row the scorer call below immediately overwrites.
        $existing = seo_find_analysis($pdo, $type, $id);
        $result = seo_analyze($pdo, $type, $id);
        if (!$result) {
            throw new RuntimeException('Could not analyze this content.');
        }

        $forceReanalyze = !empty($body['force_reanalyze']);
        if ($forceReanalyze || seo_analysis_is_stale($existing, $result['contentHash'])) {
            seo_save_analysis($pdo, $result, $ctx['user']['id'], $keyphraseInput);
            $newRow = seo_load_content_row($pdo, $type, $id); // re-read post-save.json-decoded shape for link extraction below
            $publicUrl = seo_public_url($type, $newRow ?? $row);
            $extractedLinks = match ($type) {
                'blog_post' => seo_extract_html($newRow['content'] ?? '')['links'],
                'portfolio_project' => seo_extract_html($newRow['detailed_description'] ?? '')['links'],
                'service' => seo_extract_blocks($newRow['blocks'] ?? [])['links'],
                'seo_page' => seo_extract_blocks($newRow['content_sections'] ?? [])['links'],
                'page' => seo_extract_blocks(seo_flatten_page_sections($newRow['sections'] ?? []))['links'],
                'static_page', 'venture' => $newRow['__extracted']['links'] ?? [],
                default => [],
            };
            seo_rebuild_link_index_for_content($pdo, $type, $id, $publicUrl, $extractedLinks);
        } else {
            // Hash unchanged — still persist any keyphrase/cornerstone-only edits without a
            // full re-score, but without inserting a new history row (nothing scoreable changed).
            seo_save_analysis($pdo, $result, null, $keyphraseInput);
        }

        seo_mark_document_stale($pdo, $type, $id, $result['contentHash'], 'SEO metadata or content saved in SEO Studio');

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'seo_metadata_changed', $type, (string) $id, $keyphraseInput['primary_keyphrase'] ?? null);
    json_success(['analysis' => seo_find_analysis($pdo, $type, $id)]);
}

// ---------------------------------------------------------------------------
function seo_studio_analyze(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.analyze');

    $body = read_json_body();
    $type = (string) ($body['content_type'] ?? '');
    $id = (int) ($body['content_id'] ?? 0);
    seo_require_valid_content_type($type);

    $result = seo_analyze($pdo, $type, $id);
    if (!$result) {
        json_error('Content not found.', 404);
    }

    $existing = seo_find_analysis($pdo, $type, $id);
    seo_save_analysis($pdo, $result, $ctx['user']['id'], [
        'primary_keyphrase' => $existing['primary_keyphrase'] ?? null,
        'related_keyphrases' => $existing['related_keyphrases'] ?? [],
        'synonyms' => $existing['synonyms'] ?? [],
        'language' => $existing['language'] ?? 'en',
        'is_cornerstone' => $existing['is_cornerstone'] ?? false,
    ]);

    audit_log($pdo, $ctx['user']['id'], 'seo_analyzed', $type, (string) $id);
    json_success(['analysis' => seo_find_analysis($pdo, $type, $id)]);
}

// ---------------------------------------------------------------------------
/** Chunked, synchronous bulk analysis (spec §25): processes up to `batch_size` items per
 *  request and returns how many remain — the *client* drives the loop by calling again with
 *  the same filter and an incrementing `offset`, showing real progress between calls. This
 *  avoids both an unbounded single request (impractical PHP time limits on shared hosting)
 *  and pretending a persistent background worker exists when none does. */
function seo_studio_analyze_bulk(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.run_bulk');

    $body = read_json_body();
    $contentType = $body['content_type'] ?? null;
    if ($contentType !== null) {
        seo_require_valid_content_type($contentType);
    }
    $onlyStale = !empty($body['only_stale']);
    $offset = max(0, (int) ($body['offset'] ?? 0));
    $batchSize = min(SEO_BULK_MAX_BATCH, max(1, (int) ($body['batch_size'] ?? SEO_BULK_DEFAULT_BATCH)));

    $union = seo_inventory_union_sql_with_virtual();
    $where = [];
    $bind = [];
    if ($contentType) {
        $where[] = 'c.content_type = :content_type';
        $bind['content_type'] = $contentType;
    }
    if ($onlyStale) {
        $where[] = "(a.id IS NULL OR a.engine_version <> :engine_version)";
        $bind['engine_version'] = seo_engine_version();
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM ($union) c LEFT JOIN seo_content_analysis a ON a.content_type = c.content_type AND a.content_id = c.content_id $whereSql");
    $totalStmt->execute($bind);
    $total = (int) $totalStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT c.content_type, c.content_id FROM ($union) c LEFT JOIN seo_content_analysis a ON a.content_type = c.content_type AND a.content_id = c.content_id $whereSql ORDER BY c.content_type, c.content_id LIMIT $batchSize OFFSET $offset");
    $stmt->execute($bind);
    $batch = $stmt->fetchAll();

    $succeeded = 0;
    $failed = 0;
    $errors = [];
    foreach ($batch as $row) {
        try {
            $result = seo_analyze($pdo, $row['content_type'], (int) $row['content_id']);
            if (!$result) {
                $failed++;
                continue;
            }
            $existing = seo_find_analysis($pdo, $row['content_type'], (int) $row['content_id']);
            seo_save_analysis($pdo, $result, $ctx['user']['id'], [
                'primary_keyphrase' => $existing['primary_keyphrase'] ?? null,
                'related_keyphrases' => $existing['related_keyphrases'] ?? [],
                'synonyms' => $existing['synonyms'] ?? [],
                'language' => $existing['language'] ?? 'en',
                'is_cornerstone' => $existing['is_cornerstone'] ?? false,
            ]);
            $succeeded++;
        } catch (Throwable $e) {
            $failed++;
            $errors[] = ['content_type' => $row['content_type'], 'content_id' => $row['content_id']];
        }
    }

    $processedSoFar = $offset + count($batch);
    audit_log($pdo, $ctx['user']['id'], 'bulk_analysis_batch', $contentType, null, "offset=$offset succeeded=$succeeded failed=$failed");

    json_success([
        'batch' => ['succeeded' => $succeeded, 'failed' => $failed, 'errors' => $errors],
        'progress' => [
            'total' => $total,
            'processed' => min($processedSoFar, $total),
            'remaining' => max(0, $total - $processedSoFar),
            'nextOffset' => $processedSoFar,
            'status' => $processedSoFar >= $total ? 'completed' : 'processing',
        ],
    ]);
}

// ---------------------------------------------------------------------------
function seo_studio_history(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    $type = $params['type'];
    $id = (int) $params['id'];
    seo_require_valid_content_type($type);

    $stmt = $pdo->prepare(
        'SELECT h.id, h.seo_score, h.readability_score, h.overall_score, h.content_hash, h.engine_version, h.created_at,
                u.name AS analyzed_by_name
         FROM seo_analysis_history h
         LEFT JOIN admin_users u ON u.id = h.analyzed_by
         WHERE h.content_type = :t AND h.content_id = :id
         ORDER BY h.created_at DESC
         LIMIT ' . SEO_ANALYSIS_HISTORY_LIMIT
    );
    $stmt->execute(['t' => $type, 'id' => $id]);
    json_success(['history' => $stmt->fetchAll()]);
}

// ---------------------------------------------------------------------------
function seo_studio_link_suggestions(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    $type = $params['type'];
    $id = (int) $params['id'];
    seo_require_valid_content_type($type);

    $analysis = seo_find_analysis($pdo, $type, $id);
    $row = seo_load_content_row($pdo, $type, $id);
    if (!$row) {
        json_error('Content not found.', 404);
    }
    $title = $row['title'] ?? $row['name'] ?? '';
    $keyphrase = $analysis['primary_keyphrase'] ?? '';

    json_success(['suggestions' => seo_link_suggestions($pdo, $type, $id, $keyphrase, $title)]);
}

// ---------------------------------------------------------------------------
/** Full link-index rebuild across every published item — safe on this project's current
 *  content volume (a few hundred items, see SEO_STUDIO_ARCHITECTURE.md) as one synchronous
 *  request; documented as a scale limitation if the content set grows substantially. */
function seo_studio_link_index_rebuild(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.run_bulk');

    // _with_virtual() so static/Venture documents' outgoing links are included too — an
    // earlier pass used the database-only union here, silently excluding them from the
    // rebuild (found and fixed in this pass; see docs/SEO_STUDIO_ARCHITECTURE.md Part 3).
    $union = seo_inventory_union_sql_with_virtual();
    $stmt = $pdo->query("SELECT content_type, content_id FROM ($union) c WHERE status = 'published'");
    $rows = $stmt->fetchAll();

    $rebuilt = 0;
    foreach ($rows as $r) {
        $type = $r['content_type'];
        $id = (int) $r['content_id'];
        $contentRow = seo_load_content_row($pdo, $type, $id);
        if (!$contentRow) {
            continue;
        }
        $links = match ($type) {
            'blog_post' => seo_extract_html($contentRow['content'] ?? '')['links'],
            'portfolio_project' => seo_extract_html($contentRow['detailed_description'] ?? '')['links'],
            'service' => seo_extract_blocks($contentRow['blocks'] ?? [])['links'],
            'seo_page' => seo_extract_blocks($contentRow['content_sections'] ?? [])['links'],
            'page' => seo_extract_blocks(seo_flatten_page_sections($contentRow['sections'] ?? []))['links'],
            'static_page', 'venture' => $contentRow['__extracted']['links'] ?? [],
            default => [],
        };
        seo_rebuild_link_index_for_content($pdo, $type, $id, seo_public_url($type, $contentRow), $links);
        $rebuilt++;
    }

    audit_log($pdo, $ctx['user']['id'], 'link_index_rebuilt', null, null, "$rebuilt item(s)");
    json_success(['rebuilt' => $rebuilt]);
}

// ---------------------------------------------------------------------------
function seo_studio_orphans(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    json_success(['orphans' => seo_find_orphans($pdo)]);
}

// ---------------------------------------------------------------------------
function seo_studio_duplicates(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    json_success([
        'duplicateTitles' => seo_find_duplicate_metadata($pdo, 'meta_title'),
        'duplicateDescriptions' => seo_find_duplicate_metadata($pdo, 'meta_description'),
        'duplicateKeyphrases' => seo_find_duplicate_keyphrases($pdo),
    ]);
}

// ---------------------------------------------------------------------------
function seo_studio_settings_get(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    json_success(['settings' => seo_get_settings($pdo)]);
}

function seo_studio_settings_update(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_settings');

    $body = read_json_body();
    if (!is_array($body)) {
        json_error('Invalid settings payload.', 400);
    }
    seo_save_settings($pdo, $body, $ctx['user']['id']);
    audit_log($pdo, $ctx['user']['id'], 'seo_global_settings_changed', null, null, implode(',', array_keys($body)));
    json_success();
}

// ---------------------------------------------------------------------------
function seo_studio_reports_export(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $result = seo_content_inventory($pdo, [], ['page' => 1, 'per_page' => 100000]);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="seo-studio-report.csv"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ['Content Type', 'Title', 'Slug', 'Status', 'Primary Keyphrase', 'SEO Score', 'Readability Score', 'Overall Score', 'Score Status', 'Indexable', 'Incoming Links', 'Outgoing Links', 'Cornerstone', 'Last Analyzed']);
    foreach ($result['items'] as $item) {
        fputcsv($out, array_map('csv_safe', [
            $item['content_type'], $item['title'], $item['slug'], $item['status'], $item['primary_keyphrase'],
            $item['seo_score'], $item['readability_score'], $item['overall_score'], $item['score_status'],
            $item['robots_index'] ? 'yes' : 'no', $item['incoming_links'], $item['outgoing_links'],
            $item['is_cornerstone'] ? 'yes' : 'no', $item['last_analyzed_at'],
        ]));
    }
    fclose($out);
    exit;
}

// ---------------------------------------------------------------------------
// SEO Document Registry
// ---------------------------------------------------------------------------

function seo_studio_registry_sync(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.run_bulk');

    $body = read_json_body();
    $dryRun = !empty($body['dry_run']);

    $report = seo_sync_registry($pdo, $dryRun);
    if (!$dryRun) {
        $report['backfilled'] = seo_backfill_seo_meta_associations($pdo);
        audit_log($pdo, $ctx['user']['id'], 'registry_synchronized', null, null,
            "created={$report['created']} updated={$report['updated']} orphans=" . count($report['orphans']));
    }

    json_success(['report' => $report]);
}

function seo_studio_registry_diagnostics(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    json_success(['diagnostics' => seo_registry_diagnostics($pdo)]);
}

/** Document-based generic endpoints (spec §12): resolve a single seo_documents.id to its
 *  underlying content_type/content_id, then delegate to the exact same logic the
 *  {type}/{id} endpoints above use — one implementation, two addressing schemes. */
function seo_studio_document_detail(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    $doc = seo_find_document($pdo, (int) $params['id']);
    if (!$doc) {
        json_error('Document not found.', 404);
    }

    $contentType = $doc['content_type'];
    $contentId = in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true) ? $doc['id'] : (int) $doc['content_id'];

    $row = seo_load_content_row($pdo, $contentType, $contentId);
    $seoMeta = get_seo_meta($pdo, seo_meta_entity_type_for($contentType), $contentId);
    $analysis = seo_find_analysis($pdo, $contentType, $contentId);
    $incoming = seo_count_incoming_links($pdo, $contentType, $contentId);

    json_success([
        'document' => $doc,
        'content' => $row ? ['type' => $contentType, 'id' => $contentId, 'title' => $row['title'] ?? $row['name'] ?? $doc['display_name'], 'slug' => $row['slug'] ?? '', 'status' => $row['status'] ?? ''] : null,
        'seo' => $seoMeta,
        'analysis' => $analysis,
        'incomingLinks' => $incoming,
        'engineVersion' => seo_engine_version(),
    ]);
}

function seo_studio_document_save(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $doc = seo_find_document($pdo, (int) $params['id']);
    if (!$doc) {
        json_error('Document not found.', 404);
    }
    if (!$doc['seo_editable']) {
        json_error('This document is not editable.', 403);
    }
    // Delegates to the exact same {type}/{id} save logic — its own require_admin/require_csrf
    // calls are redundant-but-harmless here (this request already passed both above).
    seo_studio_content_save($pdo, [
        'type' => $doc['content_type'],
        'id' => (string) (in_array($doc['content_type'], SEO_VIRTUAL_CONTENT_TYPES, true) ? $doc['id'] : $doc['content_id']),
    ]);
}

// ---------------------------------------------------------------------------
// Public metadata resolution (unauthenticated, read-only) — closes the
// "saved static-page metadata isn't live" gap. See api/lib/seo/public_resolve.php.
// ---------------------------------------------------------------------------
function seo_document_public_resolve(PDO $pdo): void
{
    $route = trim((string) ($_GET['route'] ?? ''));
    if ($route === '' || strlen($route) > 300 || str_contains($route, '..')) {
        json_success(['override' => null]);
    }
    $override = seo_resolve_public_override($pdo, $route);
    json_success(['override' => $override]);
}

// ---------------------------------------------------------------------------
/** Closes the prerender lifecycle loop (spec §7): called by
 *  scripts/apply-prerender-report.php after a real, successful build — never by the build
 *  itself directly (no admin credentials are ever embedded in the Node build environment).
 *  Marks a document 'current' ONLY if the hash the caller supplies matches what's currently
 *  stored as this document's content_hash — a prerender of stale data can never mark itself
 *  current just by claiming success. */
function seo_studio_mark_prerendered(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.run_bulk');

    $doc = seo_find_document($pdo, (int) $params['id']);
    if (!$doc) {
        json_error('Document not found.', 404);
    }

    $body = read_json_body();
    $hash = (string) ($body['content_hash'] ?? '');
    $success = !empty($body['success']);
    $failureReason = isset($body['failure_reason']) ? mb_substr((string) $body['failure_reason'], 0, 500) : null;

    if (!$success) {
        $safeReason = $failureReason !== null ? mb_substr($failureReason, 0, 255) : 'Marked failed via admin API';
        $pdo->prepare("UPDATE seo_documents SET prerender_status = 'failed', prerender_failure_reason = :reason, prerender_completed_at = NOW(), updated_at = NOW() WHERE id = :id")
            ->execute(['reason' => $safeReason, 'id' => $doc['id']]);
        audit_log($pdo, $ctx['user']['id'], 'prerender_status_changed', $doc['content_type'], (string) $doc['id'], "failed: $safeReason");
        json_success(['status' => 'failed']);
    }

    if ($hash === '' || $hash !== $doc['content_hash']) {
        json_error('Supplied content hash does not match the currently saved document — refusing to mark current for stale data.', 409);
    }

    $pdo->prepare(
        "UPDATE seo_documents SET prerender_status = 'current', prerender_hash = :hash, prerender_completed_at = NOW(),
         last_successful_prerender_at = NOW(), prerender_failure_reason = NULL, stale_reason = NULL, updated_at = NOW() WHERE id = :id"
    )->execute(['hash' => $hash, 'id' => $doc['id']]);
    audit_log($pdo, $ctx['user']['id'], 'prerender_completed', $doc['content_type'], (string) $doc['id'], "hash=$hash");
    json_success(['status' => 'current']);
}

/** Admin-triggered alternative to scripts/recover-abandoned-prerender-builds.php for hosts
 *  where CLI access isn't convenient — same conservative, evidence-based recovery, same
 *  never-marks-current guarantee (see seo_recover_abandoned_building_documents's doc comment). */
function seo_studio_recover_abandoned_builds(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.run_bulk');

    $body = read_json_body();
    $timeoutMinutes = isset($body['timeout_minutes']) ? max(1, (int) $body['timeout_minutes']) : 60;

    $recovered = seo_recover_abandoned_building_documents($pdo, $timeoutMinutes);
    foreach ($recovered as $route) {
        audit_log($pdo, $ctx['user']['id'], 'prerender_build_recovered', 'seo_document', $route, "timeout={$timeoutMinutes}m");
    }
    json_success(['recovered' => $recovered, 'count' => count($recovered)]);
}

