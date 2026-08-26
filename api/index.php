<?php
// Front controller for /api/admin/* and /api/public/*, rewritten here by .htaccess.
// api/health.php is intentionally NOT routed through this file — it stays a standalone check.

declare(strict_types=1);

require __DIR__ . '/config/db.php';
require __DIR__ . '/lib/response.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/audit.php';
require __DIR__ . '/lib/sanitize.php';
require __DIR__ . '/lib/pagination.php';
require __DIR__ . '/middleware/auth.php';
require __DIR__ . '/middleware/rate_limit.php';
require __DIR__ . '/models/AdminUser.php';
require __DIR__ . '/models/SiteSettings.php';
require __DIR__ . '/models/SocialLink.php';
require __DIR__ . '/models/Menu.php';
require __DIR__ . '/models/Footer.php';
require __DIR__ . '/models/SeoMeta.php';
require __DIR__ . '/models/Faq.php';
require __DIR__ . '/models/Page.php';
require __DIR__ . '/models/Service.php';
require __DIR__ . '/models/SeoPage.php';
require __DIR__ . '/models/Blog.php';
require __DIR__ . '/models/Portfolio.php';
require __DIR__ . '/models/Media.php';
require __DIR__ . '/models/Enquiry.php';
require __DIR__ . '/models/Redirect.php';
require __DIR__ . '/models/Testimonial.php';
require __DIR__ . '/lib/upload.php';
require __DIR__ . '/controllers/AuthController.php';
require __DIR__ . '/controllers/SettingsController.php';
require __DIR__ . '/controllers/SocialLinkController.php';
require __DIR__ . '/controllers/MenuController.php';
require __DIR__ . '/controllers/FooterController.php';
require __DIR__ . '/controllers/PageController.php';
require __DIR__ . '/controllers/ServiceController.php';
require __DIR__ . '/controllers/SeoPageController.php';
require __DIR__ . '/controllers/BlogController.php';
require __DIR__ . '/controllers/PortfolioController.php';
require __DIR__ . '/controllers/MediaController.php';
require __DIR__ . '/controllers/LeadController.php';
require __DIR__ . '/controllers/RedirectController.php';
require __DIR__ . '/controllers/AuditLogController.php';
require __DIR__ . '/controllers/TestimonialController.php';

header('Content-Type: application/json; charset=utf-8');

// --- CORS: same-origin allowlist only, credentials enabled ---
$allowedOrigins = [
    'https://shrinathsolutions.com',
    'https://www.shrinathsolutions.com',
    'http://localhost:5173', // local Vite dev server
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$routes = require __DIR__ . '/routes/api.php';
$method = $_SERVER['REQUEST_METHOD'];
$path = trim((string) ($_GET['__route'] ?? ''), '/');

try {
    $pdo = get_db_connection();

    foreach ($routes as [$routeMethod, $pattern, $handler]) {
        if ($routeMethod !== $method) {
            continue;
        }

        $params = match_route($pattern, $path);
        if ($params === null) {
            continue;
        }

        $handler($pdo, $params);
        exit;
    }

    json_error('Not found', 404);
} catch (Throwable $e) {
    error_log('[api] ' . $e->getMessage());
    json_error('Server error', 500);
}

/** Matches "admin/pages/{id}" style patterns against the request path. Returns params or null. */
function match_route(string $pattern, string $path): ?array
{
    $patternParts = explode('/', $pattern);
    $pathParts = explode('/', $path);

    if (count($patternParts) !== count($pathParts)) {
        return null;
    }

    $params = [];
    foreach ($patternParts as $i => $part) {
        if (preg_match('/^\{(\w+)\}$/', $part, $m)) {
            $params[$m[1]] = $pathParts[$i];
        } elseif ($part !== $pathParts[$i]) {
            return null;
        }
    }

    return $params;
}
