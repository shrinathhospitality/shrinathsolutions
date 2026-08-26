<?php

declare(strict_types=1);

use App\Bootstrap;
use App\Controllers\AuditController;
use App\Controllers\CompetitorController;
use App\Controllers\HealthController;
use App\Router;
use App\Support\ErrorHandler;
use App\Support\Logger;

require dirname(__DIR__) . '/vendor/autoload.php';

$config = require dirname(__DIR__) . '/config/config.php';

Logger::init($config['storage']['root'] . '/logs');
$requestId = ErrorHandler::register($config['appEnv'] === 'production');
header('X-Request-Id: ' . $requestId);

Bootstrap::init($config);

// ── CORS ──────────────────────────────────────────────────────────────────
// Same-origin deployments (the intended Hostinger production setup) need no
// CORS headers at all. In development, only the explicitly configured
// origins are ever echoed back — never a wildcard, and never with credentials.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $config['cors']['allowedOrigins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Routes ────────────────────────────────────────────────────────────────
$router = new Router();

$router->get('/health', [HealthController::class, 'show']);

$router->post('/audits', [AuditController::class, 'create']);
$router->get('/audits/{id}', [AuditController::class, 'show']);
$router->get('/audits/{id}/status', [AuditController::class, 'status']);
$router->get('/audits/{id}/report', [AuditController::class, 'report']);

$router->post('/competitors', [CompetitorController::class, 'create']);
$router->get('/competitors/{id}', [CompetitorController::class, 'show']);
$router->get('/competitors/{id}/status', [CompetitorController::class, 'status']);
$router->get('/competitors/{id}/report', [CompetitorController::class, 'report']);

// The front controller is mounted at /api/seo-toolkit (see the root .htaccess
// and api/dev-router.php), so PATH_INFO here is already relative to that mount point.
$path = $_SERVER['PATH_INFO'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = preg_replace('#^/api/seo-toolkit#', '', $path) ?? $path;

try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $path);
} catch (\Throwable $e) {
    ErrorHandler::handle($e);
}
