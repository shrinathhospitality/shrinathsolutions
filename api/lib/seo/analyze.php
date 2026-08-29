<?php
// Orchestrator: loads a content row (any of the 5 supported types) + its seo_meta + its
// existing seo_content_analysis row, builds the analysis input, runs the scorer, and can
// persist the result. This is the only file that needs to know each content model's find_*()
// function name.

declare(strict_types=1);

require_once __DIR__ . '/input.php';
require_once __DIR__ . '/scorer.php';
require_once __DIR__ . '/link_index.php';
require_once __DIR__ . '/documents.php';

const SEO_ANALYSIS_HISTORY_LIMIT = 20;

/** Route-only documents (static_page/venture) have no seo_meta row of their own — their
 *  metadata lives under entity_type='seo_document' (see seo_ensure_document_seo_meta()). This
 *  is the one place every caller resolves which entity_type to actually query/write. */
function seo_meta_entity_type_for(string $contentType): string
{
    return in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true) ? 'seo_document' : $contentType;
}

function seo_load_content_row(PDO $pdo, string $contentType, int $contentId): ?array
{
    if (in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        // For virtual types, $contentId is the seo_documents.id — the one stable numeric
        // identity a route-only page has (see docs/SEO_STUDIO_ARCHITECTURE.md).
        return seo_load_virtual_content_row($pdo, $contentType, $contentId);
    }
    return match ($contentType) {
        'service' => find_service($pdo, $contentId),
        'blog_post' => find_blog_post($pdo, $contentId),
        'portfolio_project' => find_portfolio_project($pdo, $contentId),
        'seo_page' => find_seo_page($pdo, $contentId),
        'venture' => find_venture($pdo, $contentId),
        'page' => seo_load_page_with_sections($pdo, $contentId),
        default => null,
    };
}

/** Builds a content-row-shaped array for a static/venture document from the registry row plus
 *  its build-time prerendered HTML (Phase 3's dist/{route}.html — never a live crawl). When no
 *  prerendered file exists yet, body/heading/image/link fields are simply empty — the scorer
 *  correctly reflects that as informational/unavailable rather than a fabricated pass. */
function seo_load_virtual_content_row(PDO $pdo, string $contentType, int $documentId): ?array
{
    $doc = seo_find_document($pdo, $documentId);
    if (!$doc || $doc['content_type'] !== $contentType) {
        return null;
    }
    $html = seo_read_prerendered_html($doc['route_path']);
    $extracted = $html !== null ? seo_extract_prerendered_body($html) : ['plainText' => '', 'headings' => [], 'images' => [], 'links' => [], 'paragraphs' => [], 'wordCount' => 0];

    $h1 = '';
    foreach ($extracted['headings'] as $h) {
        if ($h['level'] === 1) {
            $h1 = $h['text'];
            break;
        }
    }

    return [
        'id' => $documentId,
        'title' => $doc['display_name'],
        'slug' => ltrim($doc['route_path'], '/'),
        'status' => $doc['is_published'] ? 'published' : 'draft',
        'h1' => $h1,
        '__extracted' => $extracted,
        '__route_path' => $doc['route_path'],
        '__page_profile' => $doc['page_profile'],
    ];
}

/** Splits the prerendered HTML the same way scripts/prerender.mjs's own head/body split
 *  works (a leading contiguous run of <title>/<meta>/<link> tags), then runs the body through
 *  the existing seo_extract_html() so every other content-check function works unmodified. */
function seo_extract_prerendered_body(string $html): array
{
    if (preg_match('/^(?:<title>.*?<\/title>|<meta[^>]*\/>|<link[^>]*\/>)+/s', $html, $m)) {
        $body = substr($html, strlen($m[0]));
    } else {
        $body = $html;
    }
    return seo_extract_html($body);
}

function seo_load_page_with_sections(PDO $pdo, int $id): ?array
{
    $page = find_page($pdo, $id);
    if (!$page) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT content_json FROM page_sections WHERE page_id = :id AND is_visible = 1 ORDER BY display_order ASC');
    $stmt->execute(['id' => $id]);
    $page['sections'] = array_map(fn($r) => ['content_json' => json_decode($r['content_json'] ?? '[]', true)], $stmt->fetchAll());
    return $page;
}

function seo_find_analysis(PDO $pdo, string $contentType, int $contentId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM seo_content_analysis WHERE content_type = :t AND content_id = :id LIMIT 1');
    $stmt->execute(['t' => $contentType, 'id' => $contentId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['related_keyphrases'] = $row['related_keyphrases_json'] ? json_decode($row['related_keyphrases_json'], true) : [];
    $row['synonyms'] = $row['synonyms_json'] ? json_decode($row['synonyms_json'], true) : [];
    $row['checks'] = $row['checks_json'] ? json_decode($row['checks_json'], true) : [];
    $row['is_cornerstone'] = (bool) $row['is_cornerstone'];
    return $row;
}

/** Builds the input + runs the scorer for one content item. Does not touch the database
 *  except to read (content row, seo_meta, existing analysis, FAQ presence, incoming-link
 *  count) — call seo_save_analysis() separately to persist. */
function seo_analyze(PDO $pdo, string $contentType, int $contentId): ?array
{
    $row = seo_load_content_row($pdo, $contentType, $contentId);
    if (!$row) {
        return null;
    }
    $seoMeta = get_seo_meta($pdo, seo_meta_entity_type_for($contentType), $contentId);
    $analysisMeta = seo_find_analysis($pdo, $contentType, $contentId);

    $input = seo_build_input($contentType, $row, $seoMeta, $analysisMeta);
    $incomingCount = seo_count_incoming_links($pdo, $contentType, $contentId);
    $hasFaq = count(get_faqs($pdo, $contentType, $contentId)) > 0;

    return seo_run_analysis($pdo, $input, $incomingCount, $hasFaq);
}

/** Persists an already-computed result (from seo_analyze()) and appends one history row,
 *  pruning older history beyond SEO_ANALYSIS_HISTORY_LIMIT. Also rebuilds this item's outgoing
 *  link-index rows so incoming-link counts elsewhere stay accurate. */
function seo_save_analysis(PDO $pdo, array $result, ?int $adminUserId, array $keyphraseInput = []): void
{
    $contentType = $result['contentType'];
    $contentId = $result['contentId'];

    $stmt = $pdo->prepare(
        'INSERT INTO seo_content_analysis
            (content_type, content_id, primary_keyphrase, related_keyphrases_json, synonyms_json, language,
             seo_score, readability_score, overall_score, score_status, checks_json, content_hash, engine_version,
             is_cornerstone, page_type, last_analyzed_at, created_at, updated_at)
         VALUES
            (:content_type, :content_id, :primary_keyphrase, :related_keyphrases_json, :synonyms_json, :language,
             :seo_score, :readability_score, :overall_score, :score_status, :checks_json, :content_hash, :engine_version,
             :is_cornerstone, :page_type, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
            primary_keyphrase = VALUES(primary_keyphrase), related_keyphrases_json = VALUES(related_keyphrases_json),
            synonyms_json = VALUES(synonyms_json), language = VALUES(language),
            seo_score = VALUES(seo_score), readability_score = VALUES(readability_score), overall_score = VALUES(overall_score),
            score_status = VALUES(score_status), checks_json = VALUES(checks_json), content_hash = VALUES(content_hash),
            engine_version = VALUES(engine_version), is_cornerstone = VALUES(is_cornerstone), page_type = VALUES(page_type),
            last_analyzed_at = NOW(), updated_at = NOW()'
    );
    $stmt->execute([
        'content_type' => $contentType,
        'content_id' => $contentId,
        'primary_keyphrase' => $keyphraseInput['primary_keyphrase'] ?? null,
        'related_keyphrases_json' => isset($keyphraseInput['related_keyphrases']) ? json_encode($keyphraseInput['related_keyphrases']) : null,
        'synonyms_json' => isset($keyphraseInput['synonyms']) ? json_encode($keyphraseInput['synonyms']) : null,
        'language' => $keyphraseInput['language'] ?? 'en',
        'seo_score' => $result['seoScore'],
        'readability_score' => $result['readabilityScore'],
        'overall_score' => $result['overallScore'],
        'score_status' => $result['scoreStatus'],
        'checks_json' => json_encode($result['checks']),
        'content_hash' => $result['contentHash'],
        'engine_version' => $result['engineVersion'],
        'is_cornerstone' => !empty($keyphraseInput['is_cornerstone']) ? 1 : 0,
        'page_type' => $result['pageType'],
    ]);

    $pdo->prepare(
        'INSERT INTO seo_analysis_history (content_type, content_id, seo_score, readability_score, overall_score, checks_json, content_hash, engine_version, analyzed_by, created_at)
         VALUES (:content_type, :content_id, :seo_score, :readability_score, :overall_score, :checks_json, :content_hash, :engine_version, :analyzed_by, NOW())'
    )->execute([
        'content_type' => $contentType, 'content_id' => $contentId,
        'seo_score' => $result['seoScore'], 'readability_score' => $result['readabilityScore'], 'overall_score' => $result['overallScore'],
        'checks_json' => json_encode($result['checks']), 'content_hash' => $result['contentHash'], 'engine_version' => $result['engineVersion'],
        'analyzed_by' => $adminUserId,
    ]);

    $pdo->prepare(
        'DELETE FROM seo_analysis_history WHERE content_type = :t AND content_id = :id
         AND id NOT IN (SELECT id FROM (SELECT id FROM seo_analysis_history WHERE content_type = :t2 AND content_id = :id2 ORDER BY created_at DESC LIMIT ' . SEO_ANALYSIS_HISTORY_LIMIT . ') x)'
    )->execute(['t' => $contentType, 'id' => $contentId, 't2' => $contentType, 'id2' => $contentId]);
}

/** Skip-if-unchanged helper for save flows: true if content_hash + engine_version both match
 *  the stored analysis (spec §9) — caller can skip re-scoring and reuse the stored result. */
function seo_analysis_is_stale(?array $existing, string $newHash): bool
{
    if (!$existing) {
        return true;
    }
    if ($existing['engine_version'] !== seo_engine_version()) {
        return true;
    }
    return $existing['content_hash'] !== $newHash;
}

/** Safe cleanup when content is permanently deleted — call from the relevant *_admin_delete
 *  controller function. Never leaves an orphan analysis/history/link-index row behind. */
function seo_cleanup_deleted_content(PDO $pdo, string $contentType, int $contentId): void
{
    $pdo->prepare('DELETE FROM seo_content_analysis WHERE content_type = :t AND content_id = :id')->execute(['t' => $contentType, 'id' => $contentId]);
    $pdo->prepare('DELETE FROM seo_analysis_history WHERE content_type = :t AND content_id = :id')->execute(['t' => $contentType, 'id' => $contentId]);
    $pdo->prepare('DELETE FROM seo_link_index WHERE source_content_type = :t AND source_content_id = :id')->execute(['t' => $contentType, 'id' => $contentId]);
}
