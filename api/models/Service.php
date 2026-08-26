<?php
declare(strict_types=1);

const SERVICE_STATUSES = ['draft', 'published', 'scheduled', 'archived'];

function list_services(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(name LIKE :search1 OR slug LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], SERVICE_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }
    if ($params['category'] !== '') {
        $where[] = 'category = :category';
        $bind['category'] = $params['category'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM services $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, name, slug, category, status, display_order, menu_visibility, featured_image, published_at, updated_at
         FROM services $whereSql
         ORDER BY display_order ASC, id ASC
         LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_service(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM services WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? decode_service_row($row) : null;
}

function find_service_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT * FROM services WHERE slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ? decode_service_row($row) : null;
}

function decode_service_row(array $row): array
{
    $row['hero_notes'] = $row['hero_notes_json'] ? json_decode($row['hero_notes_json'], true) : [];
    $row['blocks'] = $row['blocks_json'] ? json_decode($row['blocks_json'], true) : [];
    $row['related'] = $row['related_json'] ? json_decode($row['related_json'], true) : [];
    $row['menu_visibility'] = (bool) $row['menu_visibility'];
    unset($row['hero_notes_json'], $row['blocks_json'], $row['related_json']);
    return $row;
}

function service_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM services WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

/** Sanitizes and JSON-encodes the block/related/notes arrays from request data. */
function encode_service_json_fields(array $data): array
{
    return [
        'hero_notes_json' => isset($data['hero_notes']) ? json_encode(sanitize_json_strings($data['hero_notes'])) : null,
        'blocks_json'     => isset($data['blocks']) ? json_encode(sanitize_json_strings($data['blocks'])) : null,
        'related_json'    => isset($data['related']) ? json_encode(sanitize_json_strings($data['related'])) : null,
    ];
}

function create_service(PDO $pdo, array $data, int $adminUserId): int
{
    $json = encode_service_json_fields($data);
    $status = in_array($data['status'] ?? 'draft', SERVICE_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'INSERT INTO services
            (name, slug, category, hero_label, h1, hero_description, hero_cta_label, hero_notes_json, blocks_json,
             related_json, cta_heading, cta_body, featured_image, icon, display_order, menu_visibility, status,
             published_at, created_by, updated_by, created_at, updated_at)
         VALUES
            (:name, :slug, :category, :hero_label, :h1, :hero_description, :hero_cta_label, :hero_notes_json, :blocks_json,
             :related_json, :cta_heading, :cta_body, :featured_image, :icon, :display_order, :menu_visibility, :status,
             :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute([
        'name'             => sanitize_html((string) $data['name']),
        'slug'             => $data['slug'],
        'category'         => $data['category'] ?? null,
        'hero_label'       => $data['hero_label'] ?? null,
        'h1'               => sanitize_html((string) $data['h1']),
        'hero_description' => isset($data['hero_description']) ? sanitize_html($data['hero_description']) : null,
        'hero_cta_label'   => $data['hero_cta_label'] ?? null,
        'hero_notes_json'  => $json['hero_notes_json'],
        'blocks_json'      => $json['blocks_json'],
        'related_json'     => $json['related_json'],
        'cta_heading'      => $data['cta_heading'] ?? null,
        'cta_body'         => isset($data['cta_body']) ? sanitize_html($data['cta_body']) : null,
        'featured_image'   => $data['featured_image'] ?? null,
        'icon'             => $data['icon'] ?? null,
        'display_order'    => (int) ($data['display_order'] ?? 0),
        'menu_visibility'  => array_key_exists('menu_visibility', $data) ? (empty($data['menu_visibility']) ? 0 : 1) : 1,
        'status'           => $status,
        'published_at'     => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'created_by'       => $adminUserId,
        'updated_by'       => $adminUserId,
    ]);

    return (int) $pdo->lastInsertId();
}

function update_service(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $json = encode_service_json_fields($data);
    $status = in_array($data['status'] ?? 'draft', SERVICE_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'UPDATE services SET
            name = :name, slug = :slug, category = :category, hero_label = :hero_label, h1 = :h1,
            hero_description = :hero_description, hero_cta_label = :hero_cta_label, hero_notes_json = :hero_notes_json,
            blocks_json = :blocks_json, related_json = :related_json, cta_heading = :cta_heading, cta_body = :cta_body,
            featured_image = :featured_image, icon = :icon, display_order = :display_order,
            menu_visibility = :menu_visibility, status = :status, published_at = :published_at,
            updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'name'             => sanitize_html((string) $data['name']),
        'slug'             => $data['slug'],
        'category'         => $data['category'] ?? null,
        'hero_label'       => $data['hero_label'] ?? null,
        'h1'               => sanitize_html((string) $data['h1']),
        'hero_description' => isset($data['hero_description']) ? sanitize_html($data['hero_description']) : null,
        'hero_cta_label'   => $data['hero_cta_label'] ?? null,
        'hero_notes_json'  => $json['hero_notes_json'],
        'blocks_json'      => $json['blocks_json'],
        'related_json'     => $json['related_json'],
        'cta_heading'      => $data['cta_heading'] ?? null,
        'cta_body'         => isset($data['cta_body']) ? sanitize_html($data['cta_body']) : null,
        'featured_image'   => $data['featured_image'] ?? null,
        'icon'             => $data['icon'] ?? null,
        'display_order'    => (int) ($data['display_order'] ?? 0),
        'menu_visibility'  => array_key_exists('menu_visibility', $data) ? (empty($data['menu_visibility']) ? 0 : 1) : 1,
        'status'           => $status,
        'published_at'     => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'updated_by'       => $adminUserId,
        'id'               => $id,
    ]);
}

function delete_service(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM services WHERE id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'service', $id);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "service" AND entity_id = :id')->execute(['id' => $id]);
}
