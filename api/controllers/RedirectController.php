<?php
declare(strict_types=1);

function redirects_public_lookup(PDO $pdo): void
{
    $path = $_GET['path'] ?? '';
    if ($path === '') {
        json_error('A path is required.', 422);
    }

    $redirect = find_active_redirect_by_source($pdo, $path);
    if (!$redirect) {
        json_success(['found' => false]);
    }

    json_success([
        'found'       => true,
        'destination' => $redirect['destination_url'],
        'type'        => $redirect['redirect_type'],
    ]);
}

function redirects_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_redirects($pdo, $params);
    json_success(['redirects' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function validate_redirect_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['source_url', 'destination_url']);
    if ($missing) {
        return 'Source and destination URLs are required.';
    }

    $source = normalize_path($body['source_url']);
    $destPath = normalize_path($body['destination_url']);

    if ($source === $destPath) {
        return 'Source and destination cannot be the same URL.';
    }
    if (redirect_source_taken($pdo, $source, $excludeId)) {
        return 'A redirect for that source URL already exists.';
    }
    if (redirect_creates_loop($pdo, $source, $body['destination_url'], $excludeId)) {
        return 'That destination would create a redirect loop.';
    }

    return null;
}

function redirects_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_redirect_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $id = create_redirect($pdo, $body);
    audit_log($pdo, $ctx['user']['id'], 'content_created', 'redirect', (string) $id, $body['source_url'] . ' -> ' . $body['destination_url']);

    json_success(['id' => $id], 201);
}

function redirects_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_redirect($pdo, $id)) {
        json_error('Redirect not found.', 404);
    }

    $body = read_json_body();
    $error = validate_redirect_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    update_redirect($pdo, $id, $body);
    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'redirect', (string) $id);

    json_success();
}

function redirects_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_redirect($pdo, $id)) {
        json_error('Redirect not found.', 404);
    }

    delete_redirect($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'redirect', (string) $id);

    json_success();
}
