<?php
declare(strict_types=1);

const PORTFOLIO_STATUSES = ['draft', 'published', 'scheduled', 'archived'];

function list_portfolio_categories(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, slug FROM portfolio_categories ORDER BY display_order ASC, name ASC')->fetchAll();
}

function list_portfolio_projects(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(title LIKE :search1 OR slug LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], PORTFOLIO_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }
    if ($params['category'] !== '') {
        $where[] = 'category = :category';
        $bind['category'] = $params['category'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM portfolio_projects $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, title, slug, category, short_description, featured_image, status, is_featured, display_order, updated_at
         FROM portfolio_projects $whereSql ORDER BY display_order ASC, id ASC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function get_portfolio_images(PDO $pdo, int $projectId): array
{
    $stmt = $pdo->prepare('SELECT id, image_url, alt_text, display_order FROM portfolio_images WHERE portfolio_project_id = :id ORDER BY display_order ASC');
    $stmt->execute(['id' => $projectId]);
    return $stmt->fetchAll();
}

function decode_portfolio_row(array $row): array
{
    $row['services_provided'] = $row['services_provided_json'] ? json_decode($row['services_provided_json'], true) : [];
    $row['technologies_used'] = $row['technologies_used_json'] ? json_decode($row['technologies_used_json'], true) : [];
    $row['results'] = $row['results_json'] ? json_decode($row['results_json'], true) : [];
    $row['is_featured'] = (bool) $row['is_featured'];
    unset($row['services_provided_json'], $row['technologies_used_json'], $row['results_json']);
    return $row;
}

function find_portfolio_project(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM portfolio_projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? decode_portfolio_row($row) : null;
}

function find_portfolio_project_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT * FROM portfolio_projects WHERE slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ? decode_portfolio_row($row) : null;
}

function portfolio_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM portfolio_projects WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

function encode_portfolio_json_fields(array $data): array
{
    return [
        'services_provided_json' => isset($data['services_provided']) ? json_encode(sanitize_json_strings($data['services_provided'])) : null,
        'technologies_used_json' => isset($data['technologies_used']) ? json_encode(sanitize_json_strings($data['technologies_used'])) : null,
        'results_json'           => isset($data['results']) ? json_encode(sanitize_json_strings($data['results'])) : null,
    ];
}

function create_portfolio_project(PDO $pdo, array $data, int $adminUserId): int
{
    $json = encode_portfolio_json_fields($data);
    $status = in_array($data['status'] ?? 'draft', PORTFOLIO_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'INSERT INTO portfolio_projects
            (title, slug, category, client_name, short_description, detailed_description, services_provided_json,
             technologies_used_json, project_url, featured_image, completion_date, display_order, is_featured,
             results_json, cta_heading, cta_body, status, published_at, created_by, updated_by, created_at, updated_at)
         VALUES
            (:title, :slug, :category, :client_name, :short_description, :detailed_description, :services_provided_json,
             :technologies_used_json, :project_url, :featured_image, :completion_date, :display_order, :is_featured,
             :results_json, :cta_heading, :cta_body, :status, :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute(portfolio_bind_params($data, $json, $status) + ['created_by' => $adminUserId, 'updated_by' => $adminUserId]);

    return (int) $pdo->lastInsertId();
}

function update_portfolio_project(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $json = encode_portfolio_json_fields($data);
    $status = in_array($data['status'] ?? 'draft', PORTFOLIO_STATUSES, true) ? $data['status'] : 'draft';

    $stmt = $pdo->prepare(
        'UPDATE portfolio_projects SET
            title = :title, slug = :slug, category = :category, client_name = :client_name,
            short_description = :short_description, detailed_description = :detailed_description,
            services_provided_json = :services_provided_json, technologies_used_json = :technologies_used_json,
            project_url = :project_url, featured_image = :featured_image, completion_date = :completion_date,
            display_order = :display_order, is_featured = :is_featured, results_json = :results_json,
            cta_heading = :cta_heading, cta_body = :cta_body, status = :status, published_at = :published_at,
            updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute(portfolio_bind_params($data, $json, $status) + ['updated_by' => $adminUserId, 'id' => $id]);
}

function portfolio_bind_params(array $data, array $json, string $status): array
{
    return [
        'title'                   => sanitize_html((string) $data['title']),
        'slug'                    => $data['slug'],
        'category'                => $data['category'] ?? null,
        'client_name'             => $data['client_name'] ?? null,
        'short_description'       => $data['short_description'] ?? null,
        'detailed_description'    => isset($data['detailed_description']) ? sanitize_html($data['detailed_description']) : null,
        'services_provided_json'  => $json['services_provided_json'],
        'technologies_used_json'  => $json['technologies_used_json'],
        'project_url'             => $data['project_url'] ?? null,
        'featured_image'          => $data['featured_image'] ?? null,
        'completion_date'         => $data['completion_date'] ?? null,
        'display_order'           => (int) ($data['display_order'] ?? 0),
        'is_featured'             => !empty($data['is_featured']) ? 1 : 0,
        'results_json'            => $json['results_json'],
        'cta_heading'             => $data['cta_heading'] ?? null,
        'cta_body'                => isset($data['cta_body']) ? sanitize_html($data['cta_body']) : null,
        'status'                  => $status,
        'published_at'            => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
    ];
}

function delete_portfolio_project(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM portfolio_projects WHERE id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'portfolio_project', $id);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "portfolio_project" AND entity_id = :id')->execute(['id' => $id]);
}
