<?php
// GET /sitemap.xml (rewritten here by .htaccess). Generates the sitemap from the fixed
// static routes plus every published database record, cached to a file for
// SITEMAP_CACHE_TTL seconds so this never runs the full query set on every crawler hit —
// no cron/Node process needed on shared hosting.

declare(strict_types=1);

require __DIR__ . '/config/db.php';
require __DIR__ . '/lib/route_manifest.php';

const SITEMAP_CACHE_TTL = 3600;
const SITE_URL = 'https://shrinathsolutions.com';

$cacheFile = __DIR__ . '/uploads/.cache-sitemap.xml';

header('Content-Type: application/xml; charset=utf-8');

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < SITEMAP_CACHE_TTL) {
    readfile($cacheFile);
    exit;
}

// Priority overrides for specific static routes; anything not listed here defaults to 0.5.
// The route list itself comes from static_public_routes() in route_manifest.php — the same
// single source of truth used by the true-404 router — so the two can never drift apart.
$priorityOverrides = [
    '/' => '1.0',
    '/about' => '0.8', '/services' => '0.8', '/website-designing' => '0.8',
    '/online-marketing' => '0.8', '/seo-services' => '0.8', '/seo-company-jaisalmer' => '0.8', '/hotel-digital-marketing' => '0.8',
    '/channel-manager-hotel-software' => '0.8', '/channel-manager-pricing' => '0.8',
    '/portfolio' => '0.8', '/case-studies' => '0.8', '/blog' => '0.8', '/contact' => '0.8',
    '/seo-audit-tool' => '0.7', '/our-ventures' => '0.7',
];

$urls = [];
foreach (static_public_routes() as $path) {
    $urls[] = ['loc' => SITE_URL . $path, 'priority' => $priorityOverrides[$path] ?? '0.5'];
}

try {
    $pdo = get_db_connection();

    $dynamicSets = [
        ['sql' => "SELECT slug, updated_at FROM services WHERE status = 'published' AND slug NOT IN ('website-designing','online-marketing','seo-services','hotel-digital-marketing','channel-manager-hotel-software')", 'prefix' => '/services/'],
        ['sql' => "SELECT slug, updated_at FROM pages WHERE status = 'published'", 'prefix' => '/'],
        ['sql' => "SELECT slug, updated_at FROM seo_pages WHERE status = 'published'", 'prefix' => '/'],
        ['sql' => "SELECT slug, updated_at FROM blog_posts WHERE status = 'published'", 'prefix' => '/blog/'],
        ['sql' => "SELECT slug, updated_at FROM portfolio_projects WHERE status = 'published'", 'prefix' => '/portfolio/'],
        ['sql' => "SELECT slug, updated_at FROM ventures WHERE status = 'published' AND archived_at IS NULL", 'prefix' => '/our-ventures/'],
    ];

    foreach ($dynamicSets as $set) {
        $stmt = $pdo->query($set['sql']);
        foreach ($stmt->fetchAll() as $row) {
            $urls[] = [
                'loc'     => SITE_URL . $set['prefix'] . $row['slug'],
                'priority' => '0.6',
                'lastmod' => date('Y-m-d', strtotime($row['updated_at'])),
            ];
        }
    }
} catch (Throwable $e) {
    error_log('[sitemap] ' . $e->getMessage());
    // Fall through and still emit the static routes rather than a 500.
}

$xml = new XMLWriter();
$xml->openMemory();
$xml->startDocument('1.0', 'UTF-8');
$xml->startElement('urlset');
$xml->writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

foreach ($urls as $u) {
    $xml->startElement('url');
    $xml->writeElement('loc', $u['loc']);
    if (isset($u['lastmod'])) {
        $xml->writeElement('lastmod', $u['lastmod']);
    }
    $xml->writeElement('changefreq', 'monthly');
    $xml->writeElement('priority', $u['priority']);
    $xml->endElement();
}

$xml->endElement();
$xml->endDocument();

$output = $xml->outputMemory();

@file_put_contents($cacheFile, $output);
echo $output;
