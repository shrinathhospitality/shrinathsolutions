<?php
declare(strict_types=1);

function services_public_list(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT id, name, slug, category, hero_label, icon, featured_image, display_order
         FROM services WHERE status = 'published' AND menu_visibility = 1
         ORDER BY display_order ASC, id ASC"
    );
    json_success(['services' => $stmt->fetchAll()]);
}

function services_public_detail(PDO $pdo, array $params): void
{
    $service = find_service_by_slug($pdo, $params['slug'], true);
    if (!$service) {
        json_error('Service not found.', 404);
    }

    json_success([
        'service' => $service,
        'seo'     => get_seo_meta($pdo, 'service', (int) $service['id']),
        'faqs'    => get_faqs($pdo, 'service', (int) $service['id']),
    ]);
}

function services_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_services($pdo, $params);
    json_success(['services' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function services_admin_detail(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $service = find_service($pdo, (int) $params['id']);
    if (!$service) {
        json_error('Service not found.', 404);
    }
    json_success([
        'service' => $service,
        'seo'     => get_seo_meta($pdo, 'service', (int) $service['id']),
        'faqs'    => get_faqs($pdo, 'service', (int) $service['id']),
    ]);
}

function validate_service_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['name', 'slug', 'h1']);
    if ($missing) {
        return 'Name, slug and H1 are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (service_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another service.';
    }
    return null;
}

function services_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_service_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        $id = create_service($pdo, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'service', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'service', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save service.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'service', (string) $id, $body['name']);
    json_success(['id' => $id], 201);
}

function services_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_service($pdo, $id)) {
        json_error('Service not found.', 404);
    }

    $body = read_json_body();
    $error = validate_service_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        update_service($pdo, $id, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'service', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'service', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save service.', 422);
    }

    $action = ($body['status'] ?? 'draft') === 'published' ? 'content_published' : 'content_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'service', (string) $id, $body['name'] ?? null);
    json_success();
}

function services_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_service($pdo, $id)) {
        json_error('Service not found.', 404);
    }

    delete_service($pdo, $id);
    seo_cleanup_deleted_content($pdo, 'service', $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'service', (string) $id);
    json_success();
}

function services_admin_duplicate(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $service = find_service($pdo, (int) $params['id']);
    if (!$service) {
        json_error('Service not found.', 404);
    }

    $base = $service['slug'] . '-copy';
    $slug = $base;
    $n = 2;
    while (service_slug_taken($pdo, $slug, null)) {
        $slug = $base . '-' . $n++;
    }

    $service['slug'] = $slug;
    $service['name'] = $service['name'] . ' (Copy)';
    $service['status'] = 'draft';
    $service['published_at'] = null;

    $pdo->beginTransaction();
    try {
        $id = create_service($pdo, $service, $ctx['user']['id']);
        $seo = get_seo_meta($pdo, 'service', (int) $service['id']);
        if ($seo) {
            save_seo_meta($pdo, 'service', $id, $seo);
        }
        $faqs = get_faqs($pdo, 'service', (int) $service['id']);
        if ($faqs) {
            save_faqs($pdo, 'service', $id, $faqs);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to duplicate service.', 500);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'service', (string) $id, 'Duplicated from #' . $params['id']);
    json_success(['id' => $id], 201);
}
