<?php
declare(strict_types=1);

function estimate_reading_time(string $content): int
{
    $words = str_word_count(strip_tags($content));
    return max(1, (int) ceil($words / 200));
}

function blog_public_list(PDO $pdo): void
{
    $params = pagination_params();
    $params['category'] = $_GET['category'] ?? '';
    $result = list_blog_posts_public($pdo, $params);
    json_success(['posts' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function list_blog_posts_public(PDO $pdo, array $params): array
{
    $where = ["p.status = 'published'"];
    $bind = [];
    if ($params['search'] !== '') {
        $where[] = '(p.title LIKE :search1 OR p.excerpt LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    if (!empty($params['category'])) {
        $where[] = 'c.slug = :category';
        $bind['category'] = $params['category'];
    }
    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT p.title, p.slug, p.excerpt, p.featured_image, p.reading_time_minutes, p.published_at, c.name AS category_name
         FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
         $whereSql ORDER BY p.published_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function blog_public_detail(PDO $pdo, array $params): void
{
    $post = find_blog_post_by_slug($pdo, $params['slug'], true);
    if (!$post) {
        json_error('Post not found.', 404);
    }

    json_success([
        'post' => $post,
        'seo'  => get_seo_meta($pdo, 'blog_post', (int) $post['id']),
        'faqs' => get_faqs($pdo, 'blog_post', (int) $post['id']),
    ]);
}

function blog_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_blog_posts($pdo, $params);
    json_success(['posts' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function blog_admin_categories(PDO $pdo): void
{
    require_admin($pdo);
    json_success(['categories' => list_blog_categories($pdo)]);
}

function blog_admin_tags(PDO $pdo): void
{
    require_admin($pdo);
    json_success(['tags' => list_blog_tags($pdo)]);
}

function blog_admin_detail(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $post = find_blog_post($pdo, (int) $params['id']);
    if (!$post) {
        json_error('Post not found.', 404);
    }
    json_success([
        'post' => $post,
        'seo'  => get_seo_meta($pdo, 'blog_post', (int) $post['id']),
        'faqs' => get_faqs($pdo, 'blog_post', (int) $post['id']),
    ]);
}

function validate_blog_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['title', 'slug']);
    if ($missing) {
        return 'Title and slug are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (blog_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another post.';
    }
    return null;
}

function blog_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_blog_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }
    if (empty($body['reading_time_minutes']) && !empty($body['content'])) {
        $body['reading_time_minutes'] = estimate_reading_time($body['content']);
    }

    $pdo->beginTransaction();
    try {
        $id = create_blog_post($pdo, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'blog_post', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'blog_post', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save post.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'blog_post', (string) $id, $body['title']);
    json_success(['id' => $id], 201);
}

function blog_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_blog_post($pdo, $id)) {
        json_error('Post not found.', 404);
    }

    $body = read_json_body();
    $error = validate_blog_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }
    if (empty($body['reading_time_minutes']) && !empty($body['content'])) {
        $body['reading_time_minutes'] = estimate_reading_time($body['content']);
    }

    $pdo->beginTransaction();
    try {
        update_blog_post($pdo, $id, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'blog_post', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'blog_post', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save post.', 422);
    }

    $action = ($body['status'] ?? 'draft') === 'published' ? 'content_published' : 'content_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'blog_post', (string) $id, $body['title'] ?? null);
    json_success();
}

function blog_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_blog_post($pdo, $id)) {
        json_error('Post not found.', 404);
    }

    delete_blog_post($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'blog_post', (string) $id);
    json_success();
}

function blog_admin_bulk(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $ids = array_map('intval', $body['ids'] ?? []);
    $action = $body['action'] ?? '';

    if (!$ids || !in_array($action, ['publish', 'archive', 'delete'], true)) {
        json_error('A valid action and at least one id are required.', 422);
    }

    if ($action === 'delete') {
        bulk_delete_blog_posts($pdo, $ids);
    } else {
        bulk_update_blog_status($pdo, $ids, $action === 'publish' ? 'published' : 'archived');
    }

    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'blog_post', implode(',', $ids), "Bulk $action");
    json_success();
}
