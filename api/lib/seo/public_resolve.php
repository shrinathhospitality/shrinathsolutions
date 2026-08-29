<?php
// Public, unauthenticated, read-only metadata resolution for route-only (static/Venture)
// documents — the one piece that makes SEO Studio's saved static-page metadata actually
// affect the live site and the prerendered build output, closing the gap documented in
// SEO_STUDIO_ARCHITECTURE.md Part 2 §11.
//
// Resolution priority (spec): 1) seo_meta associated with the route's seo_documents row,
// 2) [not applicable here — that IS the same seo_meta record for database content, so
// dynamic pages never need this endpoint at all, see below], 3) route-defined defaults
// (the hardcoded <Seo title=... /> props already in each page component — untouched, kept
// as the fallback), 4) nothing further needed — the page component's own hardcoded copy is
// itself the safe global fallback.
//
// Only ever reads. Never creates a seo_documents/seo_meta row (that's the registry sync's
// job, admin-only). Never exposes anything beyond the same fields already public via a
// normal page's rendered <head> — no internal IDs, no content_hash, no timestamps.

declare(strict_types=1);

require_once __DIR__ . '/documents.php';

/** Returns the safe, public subset of a route-only document's saved SEO fields, or null if
 *  the route isn't a known registry document, isn't a static/Venture (route-only) document,
 *  or has no saved override worth applying (every field empty). Dynamic content
 *  (service/blog/seo_page/portfolio/page) is deliberately excluded — those already resolve
 *  their real seo_meta row through their own existing public endpoints; querying this one for
 *  them would just be a second, redundant read of the identical underlying row. */
function seo_resolve_public_override(PDO $pdo, string $routePath): ?array
{
    $normalized = seo_normalize_route($routePath);

    $stmt = $pdo->prepare('SELECT id, content_type, is_published FROM seo_documents WHERE route_path = :route LIMIT 1');
    $stmt->execute(['route' => $normalized]);
    $doc = $stmt->fetch();

    if (!$doc || !in_array($doc['content_type'], SEO_VIRTUAL_CONTENT_TYPES, true) || !$doc['is_published']) {
        return null;
    }

    $meta = get_seo_meta($pdo, 'seo_document', (int) $doc['id']);
    if (!$meta) {
        return null;
    }

    $hasAnyValue = array_filter([
        $meta['meta_title'], $meta['meta_description'], $meta['canonical_url'],
        $meta['og_title'], $meta['og_description'], $meta['og_image'],
        $meta['twitter_title'], $meta['twitter_description'], $meta['twitter_image'],
    ], fn($v) => $v !== null && $v !== '');
    // robots_index/robots_follow default to true in the DB, so a route with no other saved
    // field and default robots has genuinely nothing to override — skip the round trip's
    // worth of value on the client (it would just re-apply the page's own hardcoded default).
    $robotsIsDefault = $meta['robots_index'] && $meta['robots_follow'];
    if (!$hasAnyValue && $robotsIsDefault) {
        return null;
    }

    return [
        'title' => $meta['meta_title'],
        'description' => $meta['meta_description'],
        'canonical' => $meta['canonical_url'],
        'robotsIndex' => (bool) $meta['robots_index'],
        'robotsFollow' => (bool) $meta['robots_follow'],
        'ogTitle' => $meta['og_title'],
        'ogDescription' => $meta['og_description'],
        'ogImage' => $meta['og_image'],
        'twitterTitle' => $meta['twitter_title'],
        'twitterDescription' => $meta['twitter_description'],
        'twitterImage' => $meta['twitter_image'],
        'schema' => $meta['schema'],
    ];
}
