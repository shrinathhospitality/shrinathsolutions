<?php
declare(strict_types=1);

function pages_public_detail(PDO $pdo, array $params): void
{
    $page = find_page_by_slug($pdo, $params['slug'], true);
    if (!$page) {
        json_error('Page not found.', 404);
    }

    json_success([
        'page'     => $page,
        'sections' => array_values(array_filter(get_page_sections($pdo, (int) $page['id']), fn($s) => $s['is_visible'])),
        'seo'      => get_seo_meta($pdo, 'page', (int) $page['id']),
        'faqs'     => get_faqs($pdo, 'page', (int) $page['id']),
    ]);
}

function pages_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_pages($pdo, $params);
    json_success(['pages' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function pages_admin_detail(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $page = find_page($pdo, (int) $params['id']);
    if (!$page) {
        json_error('Page not found.', 404);
    }
    json_success([
        'page'     => $page,
        'sections' => get_page_sections($pdo, (int) $page['id']),
        'seo'      => get_seo_meta($pdo, 'page', (int) $page['id']),
        'faqs'     => get_faqs($pdo, 'page', (int) $page['id']),
    ]);
}

function validate_page_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['title', 'slug']);
    if ($missing) {
        return 'Title and slug are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (page_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another page.';
    }
    return null;
}

function save_page_snapshot(PDO $pdo, int $id, int $adminUserId): void
{
    $page = find_page($pdo, $id);
    save_page_revision($pdo, $id, [
        'page'     => $page,
        'sections' => get_page_sections($pdo, $id),
        'seo'      => get_seo_meta($pdo, 'page', $id),
        'faqs'     => get_faqs($pdo, 'page', $id),
    ], $adminUserId);
}

function pages_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_page_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        $id = create_page($pdo, $body, $ctx['user']['id']);
        if (isset($body['sections']) && is_array($body['sections'])) {
            save_page_sections($pdo, $id, $body['sections']);
        }
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'page', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'page', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save page.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'page', (string) $id, $body['title']);
    json_success(['id' => $id], 201);
}

function pages_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }

    $body = read_json_body();
    $error = validate_page_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    save_page_snapshot($pdo, $id, $ctx['user']['id']);

    $pdo->beginTransaction();
    try {
        update_page($pdo, $id, $body, $ctx['user']['id']);
        if (isset($body['sections']) && is_array($body['sections'])) {
            save_page_sections($pdo, $id, $body['sections']);
        }
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'page', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'page', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save page.', 422);
    }

    $action = ($body['status'] ?? 'draft') === 'published' ? 'content_published' : 'content_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'page', (string) $id, $body['title'] ?? null);
    json_success();
}

function pages_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }

    delete_page($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'page', (string) $id);
    json_success();
}

function pages_admin_duplicate(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    $page = find_page($pdo, $id);
    if (!$page) {
        json_error('Page not found.', 404);
    }

    $base = $page['slug'] . '-copy';
    $slug = $base;
    $n = 2;
    while (page_slug_taken($pdo, $slug, null)) {
        $slug = $base . '-' . $n++;
    }

    $page['slug'] = $slug;
    $page['title'] = $page['title'] . ' (Copy)';
    $page['status'] = 'draft';
    $page['published_at'] = null;

    $pdo->beginTransaction();
    try {
        $newId = create_page($pdo, $page, $ctx['user']['id']);
        save_page_sections($pdo, $newId, get_page_sections($pdo, $id));
        $seo = get_seo_meta($pdo, 'page', $id);
        if ($seo) {
            save_seo_meta($pdo, 'page', $newId, $seo);
        }
        $faqs = get_faqs($pdo, 'page', $id);
        if ($faqs) {
            save_faqs($pdo, 'page', $newId, $faqs);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to duplicate page.', 500);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'page', (string) $newId, 'Duplicated from #' . $id);
    json_success(['id' => $newId], 201);
}

function pages_admin_revisions(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $id = (int) $params['id'];
    if (!find_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }
    json_success(['revisions' => list_page_revisions($pdo, $id)]);
}

function pages_admin_restore_revision(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_page($pdo, $id)) {
        json_error('Page not found.', 404);
    }

    $snapshot = find_page_revision($pdo, $id, (int) $params['revision_id']);
    if (!$snapshot) {
        json_error('Revision not found.', 404);
    }

    save_page_snapshot($pdo, $id, $ctx['user']['id']);

    $pdo->beginTransaction();
    try {
        update_page($pdo, $id, $snapshot['page'], $ctx['user']['id']);
        save_page_sections($pdo, $id, $snapshot['sections'] ?? []);
        if (!empty($snapshot['seo'])) {
            save_seo_meta($pdo, 'page', $id, $snapshot['seo']);
        }
        if (!empty($snapshot['faqs'])) {
            save_faqs($pdo, 'page', $id, $snapshot['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to restore revision.', 500);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'page', (string) $id, 'Restored revision #' . $params['revision_id']);
    json_success();
}
