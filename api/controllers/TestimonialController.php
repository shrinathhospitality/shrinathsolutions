<?php
declare(strict_types=1);

function testimonials_public_list(PDO $pdo): void
{
    json_success(['testimonials' => list_testimonials_public($pdo)]);
}

function testimonials_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_testimonials_admin($pdo, $params);
    json_success(['testimonials' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function validate_testimonial_input(array $body): ?string
{
    $missing = missing_fields($body, ['client_name', 'quote']);
    if ($missing) {
        return 'Client name and testimonial quote are required.';
    }
    return null;
}

function testimonials_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_testimonial_input($body);
    if ($error) {
        json_error($error, 422);
    }

    $id = create_testimonial($pdo, $body, $ctx['user']['id']);
    audit_log($pdo, $ctx['user']['id'], 'content_created', 'testimonial', (string) $id, $body['client_name']);

    json_success(['id' => $id], 201);
}

function testimonials_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_testimonial($pdo, $id)) {
        json_error('Testimonial not found.', 404);
    }

    $body = read_json_body();
    $error = validate_testimonial_input($body);
    if ($error) {
        json_error($error, 422);
    }

    update_testimonial($pdo, $id, $body, $ctx['user']['id']);
    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'testimonial', (string) $id);

    json_success();
}

function testimonials_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_testimonial($pdo, $id)) {
        json_error('Testimonial not found.', 404);
    }

    delete_testimonial($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'testimonial', (string) $id);

    json_success();
}
