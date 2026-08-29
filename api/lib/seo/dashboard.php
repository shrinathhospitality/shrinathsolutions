<?php
// Cross-content-type inventory, dashboard summary counts, and duplicate-metadata detection.
// One UNION ALL query pulls the same shape from all 5 supported tables — filtering/sorting/
// pagination happen in the outer query so this stays a single round trip, no N+1.

declare(strict_types=1);

require_once __DIR__ . '/rules.php';
require_once __DIR__ . '/link_index.php';

function seo_inventory_union_sql(): string
{
    return "
        SELECT 'page' AS content_type, id AS content_id, title, slug, status, updated_at FROM pages
        UNION ALL
        SELECT 'service', id, name, slug, status, updated_at FROM services
        UNION ALL
        SELECT 'seo_page', id, title, slug, status, updated_at FROM seo_pages
        UNION ALL
        SELECT 'blog_post', id, title, slug, status, updated_at FROM blog_posts
        UNION ALL
        SELECT 'portfolio_project', id, title, slug, status, updated_at FROM portfolio_projects
        UNION ALL
        SELECT 'venture', id, name, slug, status, updated_at FROM ventures
    ";
}

/** @param array $filters optional: search, content_type, score_status, indexable (bool),
 *  cornerstone (bool), stale (bool), missing_keyphrase (bool), missing_metadata (bool),
 *  orphan (bool), status (draft/published/...). @param array $pagination page, per_page. */
function seo_content_inventory(PDO $pdo, array $filters, array $pagination): array
{
    $union = seo_inventory_union_sql_with_virtual();
    $where = [];
    $bind = [];

    if (!empty($filters['search'])) {
        $where[] = '(c.title LIKE :search OR c.slug LIKE :search)';
        $bind['search'] = '%' . $filters['search'] . '%';
    }
    if (!empty($filters['content_type'])) {
        $where[] = 'c.content_type = :content_type';
        $bind['content_type'] = $filters['content_type'];
    }
    if (!empty($filters['status'])) {
        $where[] = 'c.status = :status';
        $bind['status'] = $filters['status'];
    }
    if (!empty($filters['score_status'])) {
        $where[] = 'COALESCE(a.score_status, "not_analyzed") = :score_status';
        $bind['score_status'] = $filters['score_status'];
    }
    if (array_key_exists('indexable', $filters)) {
        $where[] = 'COALESCE(m.robots_index, 1) = :indexable';
        $bind['indexable'] = $filters['indexable'] ? 1 : 0;
    }
    if (!empty($filters['cornerstone'])) {
        $where[] = 'a.is_cornerstone = 1';
    }
    if (!empty($filters['missing_keyphrase'])) {
        $where[] = "(a.primary_keyphrase IS NULL OR a.primary_keyphrase = '')";
    }
    if (!empty($filters['missing_metadata'])) {
        $where[] = "(m.meta_title IS NULL OR m.meta_title = '' OR m.meta_description IS NULL OR m.meta_description = '')";
    }
    if (!empty($filters['orphan'])) {
        $where[] = 'NOT EXISTS (SELECT 1 FROM seo_link_index l WHERE l.target_content_type = c.content_type AND l.target_content_id = c.content_id)';
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $page = max(1, (int) ($pagination['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($pagination['per_page'] ?? 25)));
    $offset = ($page - 1) * $perPage;

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM ($union) c
        LEFT JOIN seo_content_analysis a ON a.content_type = c.content_type AND a.content_id = c.content_id
        LEFT JOIN seo_meta m ON m.entity_id = c.content_id AND m.entity_type = (CASE WHEN c.content_type IN ('static_page','venture') THEN 'seo_document' ELSE c.content_type END)
        $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT c.content_type, c.content_id, c.title, c.slug, c.status, c.updated_at,
               a.primary_keyphrase, a.seo_score, a.readability_score, a.overall_score, a.score_status,
               a.is_cornerstone, a.last_analyzed_at,
               COALESCE(m.robots_index, 1) AS robots_index,
               (SELECT COUNT(DISTINCT source_content_type, source_content_id) FROM seo_link_index l WHERE l.target_content_type = c.content_type AND l.target_content_id = c.content_id) AS incoming_links,
               (SELECT COUNT(*) FROM seo_link_index l WHERE l.source_content_type = c.content_type AND l.source_content_id = c.content_id AND l.is_internal = 1) AS outgoing_links
        FROM ($union) c
        LEFT JOIN seo_content_analysis a ON a.content_type = c.content_type AND a.content_id = c.content_id
        LEFT JOIN seo_meta m ON m.entity_id = c.content_id AND m.entity_type = (CASE WHEN c.content_type IN ('static_page','venture') THEN 'seo_document' ELSE c.content_type END)
        $whereSql
        ORDER BY c.updated_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($bind);
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['is_cornerstone'] = (bool) $item['is_cornerstone'];
        $item['robots_index'] = (bool) $item['robots_index'];
        $item['score_status'] = $item['score_status'] ?? 'not_analyzed';
    }

    return ['items' => $items, 'total' => $total];
}

function seo_dashboard_summary(PDO $pdo): array
{
    $union = seo_inventory_union_sql_with_virtual();

    $counts = $pdo->query("
        SELECT
            SUM(CASE WHEN COALESCE(m.robots_index, 1) = 1 THEN 1 ELSE 0 END) AS indexable,
            SUM(CASE WHEN a.score_status = 'good' THEN 1 ELSE 0 END) AS good,
            SUM(CASE WHEN a.score_status = 'needs_improvement' THEN 1 ELSE 0 END) AS needs_improvement,
            SUM(CASE WHEN a.score_status = 'poor' THEN 1 ELSE 0 END) AS poor,
            SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) AS not_analyzed,
            SUM(CASE WHEN m.meta_title IS NULL OR m.meta_title = '' OR m.meta_description IS NULL OR m.meta_description = '' THEN 1 ELSE 0 END) AS missing_metadata
        FROM ($union) c
        LEFT JOIN seo_content_analysis a ON a.content_type = c.content_type AND a.content_id = c.content_id
        LEFT JOIN seo_meta m ON m.entity_id = c.content_id AND m.entity_type = (CASE WHEN c.content_type IN ('static_page','venture') THEN 'seo_document' ELSE c.content_type END)
        WHERE c.status = 'published'
    ")->fetch();

    $orphanCount = count(seo_find_orphans($pdo));
    $duplicateTitles = seo_find_duplicate_metadata($pdo, 'meta_title');
    $duplicateDescriptions = seo_find_duplicate_metadata($pdo, 'meta_description');

    $staleStmt = $pdo->query(
        "SELECT COUNT(*) FROM seo_content_analysis WHERE engine_version <> '" . seo_engine_version() . "'"
    );

    $brokenLinks = (int) $pdo->query("SELECT COUNT(*) FROM seo_link_index WHERE target_status = 'broken'")->fetchColumn();
    $staleCornerstone = (int) $pdo->query(
        "SELECT COUNT(*) FROM seo_content_analysis WHERE is_cornerstone = 1 AND (last_analyzed_at IS NULL OR last_analyzed_at < DATE_SUB(NOW(), INTERVAL 90 DAY))"
    )->fetchColumn();

    return [
        'totalIndexable' => (int) ($counts['indexable'] ?? 0),
        'good' => (int) ($counts['good'] ?? 0),
        'needsImprovement' => (int) ($counts['needs_improvement'] ?? 0),
        'poor' => (int) ($counts['poor'] ?? 0),
        'notAnalyzed' => (int) ($counts['not_analyzed'] ?? 0),
        'orphanPages' => $orphanCount,
        'duplicateTitles' => count($duplicateTitles),
        'missingDescriptions' => (int) ($counts['missing_metadata'] ?? 0),
        'brokenLinks' => $brokenLinks,
        'staleCornerstone' => $staleCornerstone,
        'staleEngineVersion' => (int) $staleStmt->fetchColumn(),
    ];
}

/** Groups published content by exact (case-sensitive) meta_title/meta_description value,
 *  returning only groups with 2+ members — a conservative, exact-match duplicate signal, not
 *  a similarity heuristic (see seo_find_similar_content() for the softer H1-similarity check). */
function seo_find_duplicate_metadata(PDO $pdo, string $column): array
{
    $stmt = $pdo->query("
        SELECT $column AS value, GROUP_CONCAT(CONCAT(entity_type, ':', entity_id) SEPARATOR ',') AS members
        FROM seo_meta
        WHERE $column IS NOT NULL AND $column <> ''
        GROUP BY $column
        HAVING COUNT(*) > 1
    ");
    return $stmt->fetchAll();
}

/** Multiple content items sharing the exact same primary keyphrase — a real cannibalization
 *  risk signal, surfaced as a review warning (not proof of a problem — two genuinely different
 *  pages can reasonably share a broad keyphrase). */
function seo_find_duplicate_keyphrases(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT primary_keyphrase AS value, GROUP_CONCAT(CONCAT(content_type, ':', content_id) SEPARATOR ',') AS members
        FROM seo_content_analysis
        WHERE primary_keyphrase IS NOT NULL AND primary_keyphrase <> ''
        GROUP BY primary_keyphrase
        HAVING COUNT(*) > 1
    ");
    return $stmt->fetchAll();
}
