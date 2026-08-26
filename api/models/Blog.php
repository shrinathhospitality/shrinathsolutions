<?php
declare(strict_types=1);

const BLOG_STATUSES = ['draft', 'published', 'scheduled', 'archived'];

function list_blog_categories(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, slug FROM blog_categories ORDER BY name ASC')->fetchAll();
}

function find_or_create_blog_category(PDO $pdo, string $name): int
{
    $slug = slugify($name);
    $stmt = $pdo->prepare('SELECT id FROM blog_categories WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $id = $stmt->fetchColumn();
    if ($id) {
        return (int) $id;
    }
    $pdo->prepare('INSERT INTO blog_categories (name, slug, created_at, updated_at) VALUES (:name, :slug, NOW(), NOW())')
        ->execute(['name' => $name, 'slug' => $slug]);
    return (int) $pdo->lastInsertId();
}

function slugify(string $text): string
{
    $slug = strtolower(trim($text));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    return trim($slug, '-');
}

function list_blog_tags(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, slug FROM blog_tags ORDER BY name ASC')->fetchAll();
}

function sync_blog_post_tags(PDO $pdo, int $postId, array $tagNames): void
{
    $pdo->prepare('DELETE FROM blog_post_tags WHERE blog_post_id = :id')->execute(['id' => $postId]);
    if (!$tagNames) {
        return;
    }
    $findOrCreate = $pdo->prepare('SELECT id FROM blog_tags WHERE slug = :slug LIMIT 1');
    $insertTag = $pdo->prepare('INSERT INTO blog_tags (name, slug, created_at) VALUES (:name, :slug, NOW())');
    $link = $pdo->prepare('INSERT IGNORE INTO blog_post_tags (blog_post_id, blog_tag_id) VALUES (:post_id, :tag_id)');

    foreach ($tagNames as $name) {
        $name = trim((string) $name);
        if ($name === '') {
            continue;
        }
        $slug = slugify($name);
        $findOrCreate->execute(['slug' => $slug]);
        $tagId = $findOrCreate->fetchColumn();
        if (!$tagId) {
            $insertTag->execute(['name' => $name, 'slug' => $slug]);
            $tagId = $pdo->lastInsertId();
        }
        $link->execute(['post_id' => $postId, 'tag_id' => $tagId]);
    }
}

function get_blog_post_tags(PDO $pdo, int $postId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.name, t.slug FROM blog_tags t
         JOIN blog_post_tags pt ON pt.blog_tag_id = t.id WHERE pt.blog_post_id = :id ORDER BY t.name ASC'
    );
    $stmt->execute(['id' => $postId]);
    return $stmt->fetchAll();
}

function list_blog_posts(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(p.title LIKE :search1 OR p.slug LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], BLOG_STATUSES, true)) {
        $where[] = 'p.status = :status';
        $bind['status'] = $params['status'];
    }
    if ($params['category'] !== '') {
        $where[] = 'c.slug = :category';
        $bind['category'] = $params['category'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, p.status, p.reading_time_minutes,
                p.published_at, p.updated_at, c.name AS category_name, c.slug AS category_slug
         FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
         $whereSql ORDER BY p.updated_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_blog_post(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id WHERE p.id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['tags'] = get_blog_post_tags($pdo, $id);
    return $row;
}

function find_blog_post_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT p.*, c.name AS category_name, c.slug AS category_slug
            FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id WHERE p.slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND p.status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['tags'] = get_blog_post_tags($pdo, (int) $row['id']);
    return $row;
}

function blog_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM blog_posts WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

function create_blog_post(PDO $pdo, array $data, int $adminUserId): int
{
    $status = in_array($data['status'] ?? 'draft', BLOG_STATUSES, true) ? $data['status'] : 'draft';
    $categoryId = !empty($data['category']) ? find_or_create_blog_category($pdo, $data['category']) : null;

    $stmt = $pdo->prepare(
        'INSERT INTO blog_posts
            (title, slug, excerpt, content, featured_image, author_name, category_id, reading_time_minutes,
             status, published_at, created_by, updated_by, created_at, updated_at)
         VALUES
            (:title, :slug, :excerpt, :content, :featured_image, :author_name, :category_id, :reading_time,
             :status, :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute([
        'title'          => sanitize_html((string) $data['title']),
        'slug'           => $data['slug'],
        'excerpt'        => $data['excerpt'] ?? null,
        'content'        => isset($data['content']) ? sanitize_html($data['content']) : null,
        'featured_image' => $data['featured_image'] ?? null,
        'author_name'    => $data['author_name'] ?? null,
        'category_id'    => $categoryId,
        'reading_time'   => $data['reading_time_minutes'] ?? null,
        'status'         => $status,
        'published_at'   => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'created_by'     => $adminUserId,
        'updated_by'     => $adminUserId,
    ]);

    $id = (int) $pdo->lastInsertId();
    sync_blog_post_tags($pdo, $id, $data['tags'] ?? []);
    return $id;
}

function update_blog_post(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    $status = in_array($data['status'] ?? 'draft', BLOG_STATUSES, true) ? $data['status'] : 'draft';
    $categoryId = !empty($data['category']) ? find_or_create_blog_category($pdo, $data['category']) : null;

    $stmt = $pdo->prepare(
        'UPDATE blog_posts SET title = :title, slug = :slug, excerpt = :excerpt, content = :content,
            featured_image = :featured_image, author_name = :author_name, category_id = :category_id,
            reading_time_minutes = :reading_time, status = :status, published_at = :published_at,
            updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'title'          => sanitize_html((string) $data['title']),
        'slug'           => $data['slug'],
        'excerpt'        => $data['excerpt'] ?? null,
        'content'        => isset($data['content']) ? sanitize_html($data['content']) : null,
        'featured_image' => $data['featured_image'] ?? null,
        'author_name'    => $data['author_name'] ?? null,
        'category_id'    => $categoryId,
        'reading_time'   => $data['reading_time_minutes'] ?? null,
        'status'         => $status,
        'published_at'   => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
        'updated_by'     => $adminUserId,
        'id'             => $id,
    ]);

    sync_blog_post_tags($pdo, $id, $data['tags'] ?? []);
}

function delete_blog_post(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM blog_posts WHERE id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'blog_post', $id);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "blog_post" AND entity_id = :id')->execute(['id' => $id]);
}

function bulk_update_blog_status(PDO $pdo, array $ids, string $status): void
{
    if (!$ids || !in_array($status, BLOG_STATUSES, true)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("UPDATE blog_posts SET status = ?, updated_at = NOW() WHERE id IN ($placeholders)");
    $stmt->execute(array_merge([$status], array_map('intval', $ids)));
}

function bulk_delete_blog_posts(PDO $pdo, array $ids): void
{
    foreach ($ids as $id) {
        delete_blog_post($pdo, (int) $id);
    }
}
