<?php
// Consistent JSON response helpers. Never include exception messages, SQL errors,
// or stack traces in anything sent to the client.

declare(strict_types=1);

function json_success(array $data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => true] + $data);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message] + $extra);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
