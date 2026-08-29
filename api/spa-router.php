<?php
// True-404 front controller for the SPA fallback (see .htaccess's "SPA fallback" block,
// which now routes here instead of straight to index.html for any request that isn't a
// real file or directory).
//
// Known routes (static pages + published CMS/content rows, via api/lib/route_manifest.php)
// still get 200 + the React app shell, same as before. Genuinely unknown paths now get a
// real HTTP 404 status (with the same app shell as the body, so NotFound.tsx still renders
// the visual 404 page) instead of the previous soft-200.

declare(strict_types=1);

require __DIR__ . '/config/db.php';
require __DIR__ . '/lib/route_manifest.php';

$indexFile = __DIR__ . '/../index.html';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = $path === null || $path === '' ? '/' : $path;
if ($path !== '/') {
    $path = '/' . trim($path, '/');
}

// Defensive bound: avoid feeding pathological input into the DB lookup below.
if (str_contains($path, '..') || strlen($path) > 300) {
    http_response_code(404);
    readfile($indexFile);
    exit;
}

$known = true;
try {
    $pdo = get_db_connection();
    $known = is_known_public_route_cached($pdo, $path);
} catch (Throwable $e) {
    error_log('[spa-router] ' . $e->getMessage());
    // DB unreachable: fail open (serve 200) rather than 404 every route during an outage.
    $known = true;
}

if (!$known) {
    http_response_code(404);
}
readfile($indexFile);
