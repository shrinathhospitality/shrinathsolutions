<?php
declare(strict_types=1);

function seo_pages_public_detail(PDO $pdo, array $params): void
{
    $page = find_seo_page_by_slug($pdo, $params['slug'], true);
    if (!$page) {
        json_error('Page not found.', 404);
    }

    json_success([
        'page' => $page,
        'seo'  => get_seo_meta($pdo, 'seo_page', (int) $page['id']),
        'faqs' => get_faqs($pdo, 'seo_page', (int) $page['id']),
    ]);
}

function seo_pages_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_seo_pages($pdo, $params);
    json_success(['seo_pages' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function seo_pages_admin_detail(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $page = find_seo_page($pdo, (int) $params['id']);
    if (!$page) {
        json_error('Page not found.', 404);
    }
    json_success([
        'page' => $page,
        'seo'  => get_seo_meta($pdo, 'seo_page', (int) $page['id']),
        'faqs' => get_faqs($pdo, 'seo_page', (int) $page['id']),
    ]);
}

function validate_seo_page_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['title', 'slug', 'h1']);
    if ($missing) {
        return 'Title, slug and H1 are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (seo_page_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another SEO page.';
    }
    return null;
}

function seo_pages_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_seo_page_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        $id = create_seo_page($pdo, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'seo_page', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'seo_page', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save page.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'seo_page', (string) $id, $body['title']);
    json_success(['id' => $id], 201);
}

function seo_pages_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_seo_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }

    $body = read_json_body();
    $error = validate_seo_page_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        update_seo_page($pdo, $id, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'seo_page', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'seo_page', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save page.', 422);
    }

    $action = ($body['status'] ?? 'draft') === 'published' ? 'content_published' : 'content_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'seo_page', (string) $id, $body['title'] ?? null);
    json_success();
}

function seo_pages_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_seo_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }

    delete_seo_page($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'seo_page', (string) $id);
    json_success();
}
