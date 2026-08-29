<?php
// Builds one normalized "analysis input" array from a content row + its seo_meta +
// its seo_content_analysis row (for keyphrase/cornerstone/page-type), per content_type.
// This is the only place that needs to know each content type's actual column/field shapes —
// every check function in checks.php only ever reads this normalized shape.

declare(strict_types=1);

require_once __DIR__ . '/extract.php';
require_once __DIR__ . '/rules.php';

function seo_default_page_type(string $contentType, array $row): string
{
    return match ($contentType) {
        'blog_post' => 'blog_post',
        'portfolio_project' => 'portfolio',
        'service' => 'service',
        'seo_page' => 'location_seo_page',
        'venture' => 'venture',
        'page' => match ($row['slug'] ?? '') {
            'about' => 'about',
            'contact' => 'contact',
            default => 'utility_noindex',
        },
        'static_page' => $row['__page_profile'] ?? 'utility_noindex',
        default => 'utility_noindex',
    };
}

function seo_public_url(string $contentType, array $row): string
{
    if ($contentType === 'static_page') {
        return $row['__route_path'] ?? '/';
    }
    $slug = $row['slug'] ?? '';
    return match ($contentType) {
        'service' => '/services/' . $slug,
        'seo_page' => '/' . $slug,
        'blog_post' => '/blog/' . $slug,
        'portfolio_project' => '/portfolio/' . $slug,
        'venture' => '/our-ventures/' . $slug,
        'page' => '/' . $slug,
        default => '/' . $slug,
    };
}

/** @param array|null $seoMeta from get_seo_meta(). @param array|null $analysisMeta from
 *  seo_find_analysis() — only its keyphrase/cornerstone/page_type/language fields are read. */
function seo_build_input(string $contentType, array $row, ?array $seoMeta, ?array $analysisMeta): array
{
    $extracted = match ($contentType) {
        'blog_post' => seo_extract_html($row['content'] ?? ''),
        'portfolio_project' => seo_extract_html($row['detailed_description'] ?? ''),
        'service' => seo_extract_blocks($row['blocks'] ?? []),
        'seo_page' => seo_extract_blocks($row['content_sections'] ?? []),
        'venture' => seo_extract_blocks(seo_venture_blocks($row)),
        'page' => seo_extract_blocks(seo_flatten_page_sections($row['sections'] ?? [])),
        'static_page', 'venture' => $row['__extracted'] ?? ['plainText' => '', 'headings' => [], 'images' => [], 'links' => [], 'paragraphs' => [], 'wordCount' => 0],
        default => ['plainText' => '', 'headings' => [], 'images' => [], 'links' => [], 'paragraphs' => [], 'wordCount' => 0],
    };

    $h1 = match ($contentType) {
        'blog_post', 'portfolio_project' => (string) ($row['title'] ?? ''),
        'service', 'seo_page' => (string) ($row['h1'] ?? ''),
        'venture' => (string) ($row['name'] ?? ''),
        'page', 'static_page' => (string) ($row['h1'] ?? $row['title'] ?? ''),
        default => '',
    };

    $introText = match ($contentType) {
        'blog_post' => (string) ($row['excerpt'] ?? ''),
        'portfolio_project' => (string) ($row['short_description'] ?? ''),
        'service' => (string) ($row['hero_description'] ?? ''),
        'seo_page' => (string) ($row['hero_content'] ?? ''),
        'venture' => (string) ($row['summary'] ?? ''),
        default => '',
    };

    $schemaTypes = [];
    if ($seoMeta && !empty($seoMeta['schema'])) {
        $schemaTypes = seo_extract_schema_types($seoMeta['schema']);
    }

    $bodyText = trim(($introText !== '' ? $introText . ' ' : '') . $extracted['plainText']);

    return [
        'contentType' => $contentType,
        'contentId' => (int) ($row['id'] ?? 0),
        'slug' => (string) ($row['slug'] ?? ''),
        'status' => (string) ($row['status'] ?? 'draft'),
        'title' => (string) ($seoMeta['meta_title'] ?? ''),
        'description' => (string) ($seoMeta['meta_description'] ?? ''),
        'canonical' => (string) ($seoMeta['canonical_url'] ?? ''),
        'robotsIndex' => $seoMeta ? (bool) $seoMeta['robots_index'] : true,
        'robotsFollow' => $seoMeta ? (bool) $seoMeta['robots_follow'] : true,
        'ogTitle' => (string) ($seoMeta['og_title'] ?? ''),
        'ogDescription' => (string) ($seoMeta['og_description'] ?? ''),
        'ogImage' => (string) ($seoMeta['og_image'] ?? ''),
        'h1' => $h1,
        'introText' => $introText,
        'bodyText' => $bodyText,
        'paragraphs' => $extracted['paragraphs'],
        'headings' => $extracted['headings'],
        'images' => $extracted['images'],
        'links' => $extracted['links'],
        'wordCount' => seo_word_count($bodyText),
        'schemaTypes' => $schemaTypes,
        'publicUrl' => seo_public_url($contentType, $row),
        'pageType' => $analysisMeta['page_type'] ?? seo_default_page_type($contentType, $row),
        'language' => $analysisMeta['language'] ?? 'en',
        'primaryKeyphrase' => $analysisMeta['primary_keyphrase'] ?? '',
        'relatedKeyphrases' => $analysisMeta['related_keyphrases'] ?? [],
        'isCornerstone' => (bool) ($analysisMeta['is_cornerstone'] ?? false),
    ];
}

/** Shapes a decoded Venture row (api/models/Venture.php's decode_venture_row() shape — sections/
 *  highlights/services already loaded) into the generic block array seo_extract_blocks() walks,
 *  the same way service/seo_page content is fed to it. Sections use body_html as real HTML (kind
 *  'html', extracted via seo_extract_html for accurate headings/images/links); highlights and
 *  service descriptions are included as plain text for word-count/keyword coverage only. */
function seo_venture_blocks(array $row): array
{
    $blocks = [];
    foreach ($row['sections'] ?? [] as $section) {
        if (empty($section['is_visible'])) {
            continue;
        }
        $blocks[] = ['kind' => 'html', 'heading' => $section['heading'] ?? '', 'body' => $section['body_html'] ?? ''];
    }
    foreach ($row['highlights'] ?? [] as $h) {
        $blocks[] = ['text' => $h['highlight_text'] ?? ''];
    }
    foreach ($row['services'] ?? [] as $s) {
        if (empty($s['is_active'])) {
            continue;
        }
        $blocks[] = ['heading' => $s['title'] ?? '', 'body' => $s['description'] ?? ''];
    }
    return $blocks;
}

function seo_extract_schema_types($schema): array
{
    $types = [];
    $items = isset($schema['@graph']) ? $schema['@graph'] : (isset($schema[0]) ? $schema : [$schema]);
    foreach ($items as $item) {
        if (is_array($item) && !empty($item['@type'])) {
            $types[] = is_array($item['@type']) ? implode(',', $item['@type']) : $item['@type'];
        }
    }
    return $types;
}

/** Best-effort flatten of the generic Pages module's page_sections rows (14 different
 *  section_types, each with its own content_json shape) into something seo_extract_blocks()
 *  can walk. Documented limitation: this does not understand any section_type's schema
 *  specifically, it just recursively collects string values — real per-section-type parsing
 *  is not implemented (see docs/SEO_STUDIO_ARCHITECTURE.md's limitations section). */
function seo_flatten_page_sections(array $sections): array
{
    $out = [];
    foreach ($sections as $section) {
        if (!empty($section['content_json']) && is_array($section['content_json'])) {
            $out[] = $section['content_json'];
        } elseif (!empty($section['content']) && is_array($section['content'])) {
            $out[] = $section['content'];
        }
    }
    return $out;
}
