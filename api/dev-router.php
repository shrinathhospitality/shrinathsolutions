<?php
// Local development only: `php -S localhost:8080 api/dev-router.php`
// Replicates the .htaccess rewrite rules for PHP's built-in server, which doesn't
// read .htaccess. Production (Hostinger/Apache) uses the real .htaccess instead.

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('#^/api/(admin|public)/(.*)$#', $path, $m)) {
    $_GET['__route'] = $m[1] . '/' . $m[2];
    require __DIR__ . '/index.php';
    return true;
}

if (preg_match('#^/api/seo-toolkit/#', $path)) {
    require __DIR__ . '/seo-toolkit/public/index.php';
    return true;
}

if ($path === '/sitemap.xml') {
    require __DIR__ . '/sitemap.php';
    return true;
}

return false; // let the built-in server serve the requested file as-is (e.g. /api/health.php)
