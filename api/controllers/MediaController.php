<?php
declare(strict_types=1);

function media_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $params['type'] = $_GET['type'] ?? '';
    $result = list_media($pdo, $params);
    json_success(['media' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function media_admin_upload(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    if (empty($_FILES['file'])) {
        json_error('No file uploaded.', 422);
    }

    try {
        $meta = handle_upload($_FILES['file']);
    } catch (RuntimeException $e) {
        json_error($e->getMessage(), 422);
    }

    $id = create_media($pdo, $meta, $ctx['user']['id']);
    audit_log($pdo, $ctx['user']['id'], 'media_uploaded', 'media_file', (string) $id, $meta['original_filename']);

    $media = find_media($pdo, $id);
    json_success(['media' => $media], 201);
}

function media_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_media($pdo, $id)) {
        json_error('File not found.', 404);
    }

    $body = read_json_body();
    update_media_meta($pdo, $id, $body);
    audit_log($pdo, $ctx['user']['id'], 'media_updated', 'media_file', (string) $id);

    json_success();
}

function media_admin_usage(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $media = find_media($pdo, (int) $params['id']);
    if (!$media) {
        json_error('File not found.', 404);
    }
    json_success(['usage' => find_media_usage($pdo, $media['relative_path'])]);
}

function media_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    $media = find_media($pdo, $id);
    if (!$media) {
        json_error('File not found.', 404);
    }

    $force = ($_GET['force'] ?? '') === '1';
    $usage = find_media_usage($pdo, $media['relative_path']);
    if ($usage && !$force) {
        json_error('This file is used by published content. Delete again with force to remove it anyway.', 409, ['usage' => $usage]);
    }

    delete_media($pdo, $id);
    delete_upload_file($media['relative_path']);
    audit_log($pdo, $ctx['user']['id'], 'media_deleted', 'media_file', (string) $id, $media['original_filename']);

    json_success();
}
