<?php
declare(strict_types=1);

const SEO_PAGE_STATUSES = ['draft', 'published', 'scheduled', 'archived'];

function list_seo_pages(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(title LIKE :search1 OR slug LIKE :search2 OR primary_keyword LIKE :search3)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], SEO_PAGE_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM seo_pages $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, title, slug, primary_keyword, target_location, status, published_at, updated_at
         FROM seo_pages $whereSql ORDER BY updated_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_seo_page(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM seo_pages WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? decode_seo_page_row($row) : null;
}

function find_seo_page_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT * FROM seo_pages WHERE slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ? decode_seo_page_row($row) : null;
}

function decode_seo_page_row(array $row): array
{
    foreach (['secondary_keywords', 'content_sections', 'internal_links', 'related_services', 'breadcrumb'] as $field) {
        $col = $field . '_json';
        $row[$field] = $row[$col] ? json_decode($row[$col], true) : [];
        unset($row[$col]);
    }
    return $row;
}

function seo_page_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM seo_pages WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

function encode_seo_page_json_fields(array $data): array
{
    $out = [];
    foreach (['secondary_keywords', 'content_sections', 'internal_links', 'related_services', 'breadcrumb'] as $field) {
        $out[$field . '_json'] = isset($data[$field]) ? json_encode(sanitize_json_strings($data[$field])) : null;
    }
    return $out;
}

function create_seo_page(PDO $pdo, array $data, int $adminUserId): int
{
    $json = encode_seo_page_json_fields($data);
    $status = in_array($data['status'] ?? 'draft', SEO_PAGE_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'INSERT INTO seo_pages
            (title, slug, parent_page_slug, primary_keyword, secondary_keywords_json, search_intent, target_location,
             h1, hero_content, content_sections_json, internal_links_json, related_services_json, cta_heading, cta_body,
             featured_image, breadcrumb_json, status, published_at, created_by, updated_by, created_at, updated_at)
         VALUES
            (:title, :slug, :parent_page_slug, :primary_keyword, :secondary_keywords_json, :search_intent, :target_location,
             :h1, :hero_content, :content_sections_json, :internal_links_json, :related_services_json, :cta_heading, :cta_body,
             :featured_image, :breadcrumb_json, :status, :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute(seo_page_bind_params($data, $json) + ['created_by' => $adminUserId, 'updated_by' => $adminUserId]);

    return (int) $pdo->lastInsertId();
}

function update_seo_page(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $json = encode_seo_page_json_fields($data);

    $stmt = $pdo->prepare(
        'UPDATE seo_pages SET
            title = :title, slug = :slug, parent_page_slug = :parent_page_slug, primary_keyword = :primary_keyword,
            secondary_keywords_json = :secondary_keywords_json, search_intent = :search_intent, target_location = :target_location,
            h1 = :h1, hero_content = :hero_content, content_sections_json = :content_sections_json,
            internal_links_json = :internal_links_json, related_services_json = :related_services_json,
            cta_heading = :cta_heading, cta_body = :cta_body, featured_image = :featured_image, breadcrumb_json = :breadcrumb_json,
            status = :status, published_at = :published_at, updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute(seo_page_bind_params($data, $json) + ['updated_by' => $adminUserId, 'id' => $id]);
}

function seo_page_bind_params(array $data, array $json): array
{
    $status = in_array($data['status'] ?? 'draft', SEO_PAGE_STATUSES, true) ? $data['status'] : 'draft';
    return [
        'title'                    => sanitize_html((string) $data['title']),
        'slug'                     => $data['slug'],
        'parent_page_slug'         => $data['parent_page_slug'] ?? null,
        'primary_keyword'          => $data['primary_keyword'] ?? null,
        'secondary_keywords_json'  => $json['secondary_keywords_json'],
        'search_intent'            => $data['search_intent'] ?? null,
        'target_location'          => $data['target_location'] ?? null,
        'h1'                       => sanitize_html((string) $data['h1']),
        'hero_content'             => isset($data['hero_content']) ? sanitize_html($data['hero_content']) : null,
        'content_sections_json'    => $json['content_sections_json'],
        'internal_links_json'      => $json['internal_links_json'],
        'related_services_json'    => $json['related_services_json'],
        'cta_heading'              => $data['cta_heading'] ?? null,
        'cta_body'                 => isset($data['cta_body']) ? sanitize_html($data['cta_body']) : null,
        'featured_image'           => $data['featured_image'] ?? null,
        'breadcrumb_json'          => $json['breadcrumb_json'],
        'status'                   => $status,
        'published_at'             => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
    ];
}

function delete_seo_page(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM seo_pages WHERE id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'seo_page', $id);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "seo_page" AND entity_id = :id')->execute(['id' => $id]);
}
