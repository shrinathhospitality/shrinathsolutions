<?php
declare(strict_types=1);

function enquiry_public_create(PDO $pdo): void
{
    $body = read_json_body();

    // Honeypot: a hidden field real users never fill in. Bots that fill every field trip it.
    if (!empty($body['website'])) {
        json_success(); // pretend success, do nothing
    }

    $missing = missing_fields($body, ['name']);
    if ($missing || (empty($body['phone']) && empty($body['email']))) {
        json_error('Name and at least one contact method (phone or email) are required.', 422);
    }
    if (!empty($body['email']) && !is_valid_email((string) $body['email'])) {
        json_error('Enter a valid email address.', 422);
    }

    $ip = client_ip();
    if (enquiry_rate_limited($pdo, $ip)) {
        json_error('Too many submissions. Please try again later.', 429);
    }

    $id = create_enquiry($pdo, $body);
    json_success(['id' => $id], 201);
}

function newsletter_public_subscribe(PDO $pdo): void
{
    $body = read_json_body();
    if (empty($body['email']) || !is_valid_email((string) $body['email'])) {
        json_error('Enter a valid email address.', 422);
    }

    subscribe_newsletter($pdo, (string) $body['email'], $body['source'] ?? 'footer');
    json_success();
}

function enquiries_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $params['source'] = $_GET['source'] ?? '';
    $result = list_enquiries($pdo, $params);
    json_success(['enquiries' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function enquiries_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_enquiry($pdo, $id)) {
        json_error('Enquiry not found.', 404);
    }

    $body = read_json_body();
    update_enquiry($pdo, $id, $body);
    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'contact_enquiry', (string) $id, $body['status'] ?? null);

    json_success();
}

function enquiries_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_enquiry($pdo, $id)) {
        json_error('Enquiry not found.', 404);
    }

    delete_enquiry($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'contact_enquiry', (string) $id);

    json_success();
}

function enquiries_admin_export(PDO $pdo): void
{
    require_admin($pdo);
    $rows = list_all_enquiries_for_export($pdo);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="enquiries.csv"');

    $out = fopen('php://output', 'w');
    if ($rows) {
        fputcsv($out, array_keys($rows[0]));
        foreach ($rows as $row) {
            fputcsv($out, $row);
        }
    }
    fclose($out);
    exit;
}

function newsletter_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_newsletter_subscribers($pdo, $params);
    json_success(['subscribers' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function proposals_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_proposal_requests($pdo, $params);
    json_success(['proposals' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}
