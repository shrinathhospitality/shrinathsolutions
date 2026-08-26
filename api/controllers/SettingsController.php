<?php
declare(strict_types=1);

function settings_public(PDO $pdo): void
{
    json_success(['settings' => get_all_settings($pdo)]);
}

function settings_admin_get(PDO $pdo): void
{
    require_admin($pdo);
    json_success(['settings' => get_all_settings($pdo)]);
}

function settings_admin_update(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    if (!isset($body['settings']) || !is_array($body['settings'])) {
        json_error('A "settings" object is required.', 422);
    }

    update_settings($pdo, $body['settings']);
    audit_log($pdo, $ctx['user']['id'], 'settings_changed', 'site_settings', null, implode(', ', array_keys($body['settings'])));

    json_success(['settings' => get_all_settings($pdo)]);
}
