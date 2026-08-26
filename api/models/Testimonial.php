<?php
declare(strict_types=1);

function list_testimonials_public(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT id, client_name, business_name, client_image, quote, service_used, rating, is_featured
         FROM testimonials WHERE is_active = 1 ORDER BY is_featured DESC, display_order ASC, id ASC"
    );
    return $stmt->fetchAll();
}

function list_testimonials_admin(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];
    if ($params['search'] !== '') {
        $where[] = '(client_name LIKE :search1 OR business_name LIKE :search2 OR quote LIKE :search3)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = '%' . $params['search'] . '%';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM testimonials $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM testimonials $whereSql ORDER BY display_order ASC, id DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}");
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_testimonial(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM testimonials WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function create_testimonial(PDO $pdo, array $data, int $adminUserId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO testimonials
            (client_name, business_name, client_image, quote, service_used, rating, is_featured, is_active, display_order, created_by, updated_by, created_at, updated_at)
         VALUES
            (:client_name, :business_name, :client_image, :quote, :service_used, :rating, :is_featured, :is_active, :display_order, :uid, :uid, NOW(), NOW())'
    );
    $stmt->execute(testimonial_params($data, $adminUserId));
    return (int) $pdo->lastInsertId();
}

function update_testimonial(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $stmt = $pdo->prepare(
        'UPDATE testimonials SET client_name = :client_name, business_name = :business_name, client_image = :client_image,
            quote = :quote, service_used = :service_used, rating = :rating, is_featured = :is_featured, is_active = :is_active,
            display_order = :display_order, updated_by = :uid, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([...testimonial_params($data, $adminUserId), 'id' => $id]);
}

function delete_testimonial(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM testimonials WHERE id = :id')->execute(['id' => $id]);
}

function testimonial_params(array $data, int $adminUserId): array
{
    $rating = isset($data['rating']) && $data['rating'] !== '' ? (int) $data['rating'] : null;
    if ($rating !== null) {
        $rating = max(1, min(5, $rating));
    }

    return [
        'client_name'   => sanitize_html((string) $data['client_name']),
        'business_name' => isset($data['business_name']) && $data['business_name'] !== '' ? sanitize_html((string) $data['business_name']) : null,
        'client_image'  => $data['client_image'] ?? null,
        'quote'         => sanitize_html((string) $data['quote']),
        'service_used'  => isset($data['service_used']) && $data['service_used'] !== '' ? sanitize_html((string) $data['service_used']) : null,
        'rating'        => $rating,
        'is_featured'   => !empty($data['is_featured']) ? 1 : 0,
        'is_active'     => array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1,
        'display_order' => isset($data['display_order']) ? (int) $data['display_order'] : 0,
        'uid'           => $adminUserId,
    ];
}
