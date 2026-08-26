<?php
// GET /api/health.php — verifies the database connection without exposing any details.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/config/db.php';

try {
    $pdo = get_db_connection();
    $pdo->query('SELECT 1');

    http_response_code(200);
    echo json_encode([
        'success'  => true,
        'database' => 'connected',
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'success'  => false,
        'database' => 'unavailable',
    ]);
}
