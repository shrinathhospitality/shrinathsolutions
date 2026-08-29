<?php
// Safe content extraction. HTML is parsed with DOMDocument (never eval'd, never executes
// scripts — DOMDocument is a pure parser) with libxml error suppression so malformed
// author-authored HTML degrades gracefully instead of throwing. Block-JSON content (services,
// SEO pages) is walked directly — no HTML parsing needed since it's already structured.

declare(strict_types=1);

/** Parses one HTML fragment into a normalized shape every check function reads. */
function seo_extract_html(?string $html): array
{
    $html = trim((string) $html);
    if ($html === '') {
        return ['plainText' => '', 'headings' => [], 'images' => [], 'links' => [], 'paragraphs' => [], 'wordCount' => 0];
    }

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    // Wrap in a UTF-8 meta + body so DOMDocument doesn't mis-decode multibyte content.
    $doc->loadHTML('<?xml encoding="utf-8"?><body>' . $html . '</body>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();

    $body = $doc->getElementsByTagName('body')->item(0);
    if (!$body) {
        return ['plainText' => '', 'headings' => [], 'images' => [], 'links' => [], 'paragraphs' => [], 'wordCount' => 0];
    }

    // Strip content that should never be analyzed as page copy, even though none of these are
    // expected inside a stored content field — defensive, matches the spec's exclusion list.
    foreach (['script', 'style', 'nav', 'header', 'footer'] as $tag) {
        $nodes = $body->getElementsByTagName($tag);
        for ($i = $nodes->length - 1; $i >= 0; $i--) {
            $node = $nodes->item($i);
            $node->parentNode?->removeChild($node);
        }
    }

    $headings = [];
    foreach (['h1', 'h2', 'h3', 'h4'] as $level) {
        $nodes = $body->getElementsByTagName($level);
        foreach ($nodes as $node) {
            $headings[] = ['level' => (int) substr($level, 1), 'text' => trim($node->textContent), 'domOrder' => true];
        }
    }
    // Re-order headings by document position (getElementsByTagName groups by tag, not position).
    $ordered = [];
    $walker = function (DOMNode $node) use (&$walker, &$ordered) {
        if ($node->nodeType === XML_ELEMENT_NODE && in_array($node->nodeName, ['h1', 'h2', 'h3', 'h4'], true)) {
            $ordered[] = ['level' => (int) substr($node->nodeName, 1), 'text' => trim($node->textContent)];
        }
        foreach ($node->childNodes as $child) {
            $walker($child);
        }
    };
    $walker($body);
    $headings = $ordered;

    $images = [];
    foreach ($body->getElementsByTagName('img') as $img) {
        $images[] = [
            'alt' => trim($img->getAttribute('alt')),
            'src' => trim($img->getAttribute('src')),
            'hasDimensions' => $img->hasAttribute('width') && $img->hasAttribute('height'),
            'loading' => $img->getAttribute('loading') ?: null,
        ];
    }

    $links = [];
    foreach ($body->getElementsByTagName('a') as $a) {
        $href = trim($a->getAttribute('href'));
        if ($href === '') {
            continue;
        }
        $links[] = [
            'href' => $href,
            'text' => trim($a->textContent),
            'target' => $a->getAttribute('target') ?: null,
            'rel' => $a->getAttribute('rel') ?: null,
            'isInternal' => seo_is_internal_url($href),
        ];
    }

    $paragraphs = [];
    foreach ($body->getElementsByTagName('p') as $p) {
        $text = trim($p->textContent);
        if ($text !== '') {
            $paragraphs[] = $text;
        }
    }

    $plainText = trim(preg_replace('/\s+/u', ' ', $body->textContent) ?? '');

    return [
        'plainText' => $plainText,
        'headings' => $headings,
        'images' => $images,
        'links' => $links,
        'paragraphs' => $paragraphs,
        'wordCount' => seo_word_count($plainText),
    ];
}

function seo_is_internal_url(string $href): bool
{
    if ($href === '' || str_starts_with($href, '#')) {
        return true;
    }
    if (str_starts_with($href, '/') && !str_starts_with($href, '//')) {
        return true;
    }
    if (str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:') || str_starts_with($href, 'javascript:')) {
        return false;
    }
    return str_contains($href, 'shrinathsolutions.com');
}

/** Normalizes a URL for link-index matching: strips protocol/host if internal, strips the
 *  fragment (kept separately for accessibility reporting elsewhere), strips a trailing slash. */
function seo_normalize_url_for_matching(string $href): string
{
    $noFragment = strtok($href, '#');
    $noFragment = $noFragment === false ? $href : $noFragment;
    $path = preg_replace('#^https?://[^/]*shrinathsolutions\.com#i', '', $noFragment) ?? $noFragment;
    if ($path === '') {
        $path = '/';
    }
    if (strlen($path) > 1 && str_ends_with($path, '/')) {
        $path = rtrim($path, '/');
    }
    return $path;
}

/** Walks an arbitrary decoded-JSON block structure (services.blocks_json, seo_pages'
 *  content_sections_json, pages' page_sections content_json) and concatenates every
 *  string-ish "heading"/"body"/"text"/"question"/"answer" value it finds, plus any nested
 *  'html' kind block's HTML run through seo_extract_html. Best-effort, not a bespoke parser
 *  per block kind — real headings (from block 'heading' fields) are collected separately at
 *  H2 level (blocks never carry their own H1; the page's h1 field is the source of truth).
 */
function seo_extract_blocks(array $blocks): array
{
    $headings = [];
    $paragraphs = [];
    $images = [];
    $links = [];
    $plainParts = [];

    $walk = function ($node) use (&$walk, &$headings, &$paragraphs, &$images, &$links, &$plainParts) {
        if (is_array($node)) {
            if (isset($node['kind']) && $node['kind'] === 'html' && !empty($node['body'])) {
                $extracted = seo_extract_html((string) $node['body']);
                foreach ($extracted['headings'] as $h) {
                    $headings[] = ['level' => max(2, $h['level']), 'text' => $h['text']];
                }
                $paragraphs = array_merge($paragraphs, $extracted['paragraphs']);
                $images = array_merge($images, $extracted['images']);
                $links = array_merge($links, $extracted['links']);
                $plainParts[] = $extracted['plainText'];
                return;
            }
            if (!empty($node['heading']) && is_string($node['heading'])) {
                $headings[] = ['level' => 2, 'text' => $node['heading']];
                $plainParts[] = $node['heading'];
            }
            foreach (['body', 'text'] as $key) {
                if (!empty($node[$key]) && is_string($node[$key])) {
                    $paragraphs[] = $node[$key];
                    $plainParts[] = $node[$key];
                }
            }
            foreach (['question', 'answer'] as $key) {
                if (!empty($node[$key]) && is_string($node[$key])) {
                    $plainParts[] = $node[$key];
                }
            }
            foreach ($node as $v) {
                if (is_array($v)) {
                    $walk($v);
                }
            }
        }
    };
    $walk($blocks);

    $plainText = trim(preg_replace('/\s+/u', ' ', implode(' ', $plainParts)) ?? '');

    return [
        'plainText' => $plainText,
        'headings' => $headings,
        'images' => $images,
        'links' => $links,
        'paragraphs' => $paragraphs,
        'wordCount' => seo_word_count($plainText),
    ];
}
