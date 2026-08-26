<?php
declare(strict_types=1);

function social_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    json_success(['links' => list_social_links($pdo)]);
}

function social_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['platform', 'url']);
    if ($missing) {
        json_error('Platform and URL are required.', 422);
    }

    $id = create_social_link($pdo, $body);
    audit_log($pdo, $ctx['user']['id'], 'social_link_created', 'social_link', (string) $id);

    json_success(['id' => $id], 201);
}

function social_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['platform', 'url']);
    if ($missing) {
        json_error('Platform and URL are required.', 422);
    }

    update_social_link($pdo, (int) $params['id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'social_link_updated', 'social_link', $params['id']);

    json_success();
}

function social_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    delete_social_link($pdo, (int) $params['id']);
    audit_log($pdo, $ctx['user']['id'], 'social_link_deleted', 'social_link', $params['id']);

    json_success();
}
