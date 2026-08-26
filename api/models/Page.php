<?php
declare(strict_types=1);

const PAGE_STATUSES = ['draft', 'published', 'scheduled', 'archived'];
const PAGE_SECTION_TYPES = [
    'hero', 'text', 'image_text', 'features', 'services', 'statistics', 'process',
    'testimonials', 'faq', 'portfolio', 'blog_preview', 'cta', 'gallery', 'pricing', 'contact', 'custom_content',
];

function list_pages(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(title LIKE :search1 OR slug LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], PAGE_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM pages $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, title, slug, status, template, featured_image, published_at, updated_at
         FROM pages $whereSql
         ORDER BY updated_at DESC
         LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_page(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM pages WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function find_page_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT * FROM pages WHERE slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function page_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM pages WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

function get_page_sections(PDO $pdo, int $pageId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, section_type, content_json, display_order, is_visible
         FROM page_sections WHERE page_id = :id ORDER BY display_order ASC, id ASC'
    );
    $stmt->execute(['id' => $pageId]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['content'] = $row['content_json'] ? json_decode($row['content_json'], true) : [];
        $row['is_visible'] = (bool) $row['is_visible'];
        unset($row['content_json']);
    }
    return $rows;
}

/** Replaces all of a page's sections with the given ordered list. Skips unknown section types. */
function save_page_sections(PDO $pdo, int $pageId, array $sections): void
{
    $pdo->prepare('DELETE FROM page_sections WHERE page_id = :id')->execute(['id' => $pageId]);

    if (!$sections) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO page_sections (page_id, section_type, content_json, display_order, is_visible, created_at, updated_at)
         VALUES (:page_id, :type, :content, :order, :visible, NOW(), NOW())'
    );
    foreach (array_values($sections) as $i => $section) {
        $type = $section['section_type'] ?? '';
        if (!in_array($type, PAGE_SECTION_TYPES, true)) {
            continue;
        }
        $stmt->execute([
            'page_id' => $pageId,
            'type'    => $type,
            'content' => isset($section['content']) ? json_encode(sanitize_json_strings($section['content'])) : null,
            'order'   => $i,
            'visible' => array_key_exists('is_visible', $section) ? (empty($section['is_visible']) ? 0 : 1) : 1,
        ]);
    }
}

function create_page(PDO $pdo, array $data, int $adminUserId): int
{
    $status = in_array($data['status'] ?? 'draft', PAGE_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'INSERT INTO pages (title, slug, status, template, featured_image, published_at, created_by, updated_by, created_at, updated_at)
         VALUES (:title, :slug, :status, :template, :featured_image, :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute([
        'title'          => sanitize_html((string) $data['title']),
        'slug'           => $data['slug'],
        'status'         => $status,
        'template'       => $data['template'] ?? null,
        'featured_image' => $data['featured_image'] ?? null,
        'published_at'   => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'created_by'     => $adminUserId,
        'updated_by'     => $adminUserId,
    ]);

    return (int) $pdo->lastInsertId();
}

function update_page(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $status = in_array($data['status'] ?? 'draft', PAGE_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'UPDATE pages SET title = :title, slug = :slug, status = :status, template = :template,
            featured_image = :featured_image, published_at = :published_at, updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'title'          => sanitize_html((string) $data['title']),
        'slug'           => $data['slug'],
        'status'         => $status,
        'template'       => $data['template'] ?? null,
        'featured_image' => $data['featured_image'] ?? null,
        'published_at'   => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'updated_by'     => $adminUserId,
        'id'             => $id,
    ]);
}

function delete_page(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM pages WHERE id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'page', $id);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "page" AND entity_id = :id')->execute(['id' => $id]);
}

function save_page_revision(PDO $pdo, int $pageId, array $snapshot, int $adminUserId): void
{
    $pdo->prepare('INSERT INTO page_revisions (page_id, snapshot_json, created_by, created_at) VALUES (:page_id, :snapshot, :user, NOW())')
        ->execute(['page_id' => $pageId, 'snapshot' => json_encode($snapshot), 'user' => $adminUserId]);
}

function list_page_revisions(PDO $pdo, int $pageId): array
{
    $stmt = $pdo->prepare(
        'SELECT r.id, r.created_at, u.name AS created_by_name
         FROM page_revisions r LEFT JOIN admin_users u ON u.id = r.created_by
         WHERE r.page_id = :page_id ORDER BY r.created_at DESC LIMIT 50'
    );
    $stmt->execute(['page_id' => $pageId]);
    return $stmt->fetchAll();
}

function find_page_revision(PDO $pdo, int $pageId, int $revisionId): ?array
{
    $stmt = $pdo->prepare('SELECT snapshot_json FROM page_revisions WHERE id = :id AND page_id = :page_id LIMIT 1');
    $stmt->execute(['id' => $revisionId, 'page_id' => $pageId]);
    $row = $stmt->fetch();
    return $row ? json_decode($row['snapshot_json'], true) : null;
}
