<?php

/**
 * Router script for PHP's built-in dev server only:
 *   php -S localhost:8080 -t api/public api/public/router.php
 * Production (Apache/Hostinger) uses .htaccess instead — this file is never
 * invoked there. Serves real files as-is; everything else goes to index.php
 * with PATH_INFO populated so the app can route on it, same as the Apache
 * PATH_INFO behaviour configured in .htaccess.
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

if ($uri !== '/' && is_file($file)) {
    return false;
}

$_SERVER['PATH_INFO'] = $uri;
require __DIR__ . '/index.php';
