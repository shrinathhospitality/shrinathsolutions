<?php

declare(strict_types=1);

/**
 * Loads api/.env (simple KEY=VALUE parser, no external dependency needed for
 * this) and returns a plain config array consumed throughout the app.
 */

$envPath = dirname(__DIR__) . '/.env';
$env = [];

if (is_readable($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }
        [$key, $value] = $parts;
        $env[trim($key)] = trim($value);
    }
}

$get = static function (string $key, string $default = ''): string {
    global $env;
    return $env[$key] ?? (getenv($key) !== false ? (string) getenv($key) : $default);
};

return [
    'appEnv' => $get('APP_ENV', 'production'),

    'cors' => [
        'allowedOrigins' => array_values(array_filter(array_map(
            'trim',
            explode(',', $get('CORS_ALLOWED_ORIGINS', ''))
        ))),
    ],

    'pageSpeedApiKey' => $get('PAGESPEED_API_KEY', ''),

    'trustedProxies' => array_values(array_filter(array_map(
        'trim',
        explode(',', $get('TRUSTED_PROXIES', ''))
    ))),

    'rateLimits' => [
        'audits' => ['limit' => (int) $get('RATE_LIMIT_AUDITS_PER_HOUR', '5'), 'windowSeconds' => 3600],
        'competitors' => ['limit' => (int) $get('RATE_LIMIT_COMPETITORS_PER_HOUR', '3'), 'windowSeconds' => 3600],
        'status' => ['limit' => (int) $get('RATE_LIMIT_STATUS_PER_MINUTE', '60'), 'windowSeconds' => 60],
        'pdf' => ['limit' => (int) $get('RATE_LIMIT_PDF_PER_HOUR', '5'), 'windowSeconds' => 3600],
    ],

    'storage' => [
        'root' => dirname(__DIR__) . '/storage',
        'auditRetentionHours' => (int) $get('AUDIT_RETENTION_HOURS', '24'),
        'reportRetentionHours' => (int) $get('REPORT_RETENTION_HOURS', '24'),
    ],

    'fetcher' => [
        'connectTimeoutSeconds' => 5,
        'requestTimeoutSeconds' => 15,
        'maxRedirects' => 5,
        'maxResponseBytes' => 5 * 1024 * 1024, // 5MB
        'userAgent' => 'Mozilla/5.0 (compatible; SEOToolkit/1.0; +https://shrinathsolutions.com/seo-audit-tool)',
        // Local/dev-only CA bundle override (see CURL_CA_BUNDLE_PATH in .env.example).
        'caBundlePath' => $get('CURL_CA_BUNDLE_PATH', ''),
    ],

    'crawler' => [
        // No multi-page crawling exists in this product (matches the ported Node
        // behaviour — single-page synchronous analysis only). Kept here for
        // forward-compatibility / documentation, not currently used.
        'maxPagesPerAudit' => 1,
        'maxDepth' => 0,
    ],

    'competitors' => [
        'maxCompetitors' => 3,
    ],
];
