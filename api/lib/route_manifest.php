<?php
// Single source of truth for the app's public route shape. Reused by api/sitemap.php (URL
// list) and api/spa-router.php (true-404 membership check) so the two never drift apart.
// The static list below must mirror src/App.tsx's static <Route> paths exactly.

declare(strict_types=1);

const ROUTE_MANIFEST_CACHE_TTL = 3600;

function static_public_routes(): array
{
    return [
        '/', '/about', '/services', '/website-designing', '/online-marketing', '/seo-services',
        '/seo-company-jaisalmer',
        '/hotel-digital-marketing', '/channel-manager-hotel-software', '/channel-manager-pricing',
        '/portfolio', '/case-studies', '/blog', '/seo-audit-tool', '/our-ventures',
        '/contact', '/privacy-policy', '/terms-conditions', '/sitemap',
    ];
}

// Reserved slugs under /services/:slug that are actually static routes above, not rows in
// the `services` table lookup — mirrors the NOT IN(...) clause in api/sitemap.php.
function reserved_service_slugs(): array
{
    return ['website-designing', 'online-marketing', 'seo-services', 'hotel-digital-marketing', 'channel-manager-hotel-software'];
}

// Dynamic single-segment-slug route families: [urlPrefix, table, statusColumn, statusValue].
function dynamic_route_sources(): array
{
    return [
        ['/blog/', 'blog_posts', 'status', 'published'],
        ['/portfolio/', 'portfolio_projects', 'status', 'published'],
        ['/services/', 'services', 'status', 'published'],
        ['/our-ventures/', 'ventures', 'status', 'published'],
    ];
}

// Root-level catch-all tables (single path segment, e.g. /some-slug) checked in this order.
function root_catchall_sources(): array
{
    return [
        ['pages', 'status', 'published'],
        ['seo_pages', 'status', 'published'],
    ];
}

function slug_exists(PDO $pdo, string $table, string $statusCol, string $statusVal, string $slug): bool
{
    $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE slug = ? AND {$statusCol} = ? LIMIT 1");
    $stmt->execute([$slug, $statusVal]);
    return (bool) $stmt->fetchColumn();
}

// True if $path (normalized, leading slash, no trailing slash except root) is a route the
// app can genuinely serve — either a fixed static route or a published CMS/content row.
function is_known_public_route(PDO $pdo, string $path): bool
{
    if (in_array($path, static_public_routes(), true)) {
        return true;
    }

    foreach (dynamic_route_sources() as [$prefix, $table, $statusCol, $statusVal]) {
        if (str_starts_with($path, $prefix)) {
            $slug = substr($path, strlen($prefix));
            if ($slug === '' || str_contains($slug, '/')) {
                return false;
            }
            if ($table === 'services' && in_array($slug, reserved_service_slugs(), true)) {
                // These live at the static /services/... route list above, not the DB row.
                return true;
            }
            return slug_exists($pdo, $table, $statusCol, $statusVal, $slug);
        }
    }

    $segments = explode('/', trim($path, '/'));
    if (count($segments) === 1 && $segments[0] !== '') {
        foreach (root_catchall_sources() as [$table, $statusCol, $statusVal]) {
            if (slug_exists($pdo, $table, $statusCol, $statusVal, $segments[0])) {
                return true;
            }
        }
    }

    return false;
}

// File-cached wrapper around is_known_public_route(): known-route results are cheap to
// recompute (bounded query set) but this avoids a DB round trip on every single request,
// mirroring the caching pattern already used by api/sitemap.php. Cache is a JSON map of
// path => bool, written atomically (tmp file + rename) and TTL-expired as a whole.
function is_known_public_route_cached(PDO $pdo, string $path): bool
{
    $cacheFile = __DIR__ . '/../uploads/.cache-route-manifest.json';
    $map = [];

    if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < ROUTE_MANIFEST_CACHE_TTL) {
        $raw = @file_get_contents($cacheFile);
        $decoded = $raw !== false ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $map = $decoded;
        }
    }

    if (array_key_exists($path, $map)) {
        return (bool) $map[$path];
    }

    $result = is_known_public_route($pdo, $path);
    $map[$path] = $result;

    $tmp = $cacheFile . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($map), LOCK_EX) !== false) {
        @rename($tmp, $cacheFile);
    }

    return $result;
}
