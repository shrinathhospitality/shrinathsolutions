<?php
// Markdown handling specific to the master-import source documents (docs/shrinath-solutions-
// seo-studio-master-import.json). Every `service`/`blog` record's `content` field is a full
// authoring document — it starts with an internal "## SEO Setup" scaffold (duplicating fields
// already available elsewhere in the record) and ends with an "## Internal Linking Instructions
// for Claude" section, neither of which is real page content. `seo_page` records ship
// contentFormat "html" instead and are already clean — nothing here applies to them.
//
// This is import-specific document parsing, not a general-purpose Markdown engine, so it lives
// next to the importer rather than in api/lib/ — it has no relationship to the SEO scoring
// engine or any other reusable content pipeline.

declare(strict_types=1);

/** Plain-text output (no HTML) for fields the frontend renders as literal text — strips
 *  markdown syntax rather than converting it to tags. */
function import_md_strip_inline(string $text): string
{
    $text = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text) ?? $text;
    $text = preg_replace('/`([^`]+)`/', '$1', $text) ?? $text;
    $text = preg_replace('/\[([^\]]+)\]\([^)]+\)/', '$1', $text) ?? $text;
    return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
}

/** HTML output for fields the frontend renders as sanitized HTML — escapes first, then
 *  re-introduces only a small safe set of tags from markdown syntax. Callers still run the
 *  result through sanitize_html() before storage; this never trusts its own output. */
function import_md_inline_to_html(string $text): string
{
    $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    return preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $escaped) ?? $escaped;
}

/** Splits a master-import markdown document into ordered [heading, body] sections on "## "
 *  boundaries. The leading "# Title" line (if any) is discarded — it only duplicates
 *  record.title/record.h1. */
function import_md_split_sections(string $md): array
{
    $md = preg_replace('/^#[^\n]*\n+/', '', ltrim($md)) ?? $md;
    $parts = preg_split('/^##\s+(.+)$/m', $md, -1, PREG_SPLIT_DELIM_CAPTURE);
    $sections = [];
    for ($i = 1; $i < count($parts); $i += 2) {
        $sections[] = ['heading' => trim($parts[$i]), 'body' => trim($parts[$i + 1] ?? '')];
    }
    return $sections;
}

/** Section headings that are authoring metadata / instructions, never real page content. */
const IMPORT_MD_SKIP_SECTION_PATTERN = '/seo setup|internal linking instructions|frequently asked questions|get a free consultation/i';

function import_md_first_paragraph(string $body): string
{
    foreach (preg_split('/\r?\n\r?\n/', trim($body)) as $para) {
        $para = trim($para);
        // A "### Sub-heading" line is often glued directly above the paragraph text with no
        // blank line between them — strip just that leading heading line, not the whole chunk.
        $para = trim(preg_replace('/^#{1,6}\s*[^\n]*\n/', '', $para) ?? $para);
        if ($para === '' || str_starts_with($para, '#') || preg_match('/^\*\*[^*]+:\*\*/', $para)) {
            continue; // skip a bare heading-only chunk or a **Primary CTA:**-style line
        }
        return import_md_strip_inline($para);
    }
    return '';
}

/** Extracts a short, clean hero paragraph from the "## Hero Section" of a markdown service
 *  record. Returns null when no usable paragraph exists — callers must NOT fall back to
 *  dumping raw markdown in that case. */
function import_md_extract_hero_description(string $markdownContent): ?string
{
    foreach (import_md_split_sections($markdownContent) as $section) {
        if (stripos($section['heading'], 'hero section') !== false) {
            $p = import_md_first_paragraph($section['body']);
            return $p !== '' ? $p : null;
        }
    }
    return null;
}

function import_md_section_body_to_html(string $body): string
{
    $lines = preg_split('/\r?\n/', trim($body));
    $html = [];
    $paragraph = [];
    $listItems = [];
    $flushParagraph = function () use (&$paragraph, &$html) {
        if ($paragraph) {
            $html[] = '<p>' . import_md_inline_to_html(trim(implode(' ', $paragraph))) . '</p>';
            $paragraph = [];
        }
    };
    $flushList = function () use (&$listItems, &$html) {
        if ($listItems) {
            $html[] = '<ul>' . implode('', array_map(fn($i) => '<li>' . import_md_inline_to_html($i) . '</li>', $listItems)) . '</ul>';
            $listItems = [];
        }
    };
    foreach ($lines as $line) {
        $line = rtrim($line);
        if ($line === '') {
            $flushParagraph();
            $flushList();
            continue;
        }
        if (preg_match('/^###\s+(.+)$/', $line, $m)) {
            $flushParagraph();
            $flushList();
            $html[] = '<h3>' . import_md_inline_to_html($m[1]) . '</h3>';
            continue;
        }
        if (preg_match('/^-\s+(.+)$/', $line, $m)) {
            $flushParagraph();
            $listItems[] = $m[1];
            continue;
        }
        if (preg_match('/^\*\*(Call or WhatsApp|Primary CTA|Secondary CTA|Email|Website|Location):\*\*/i', $line)) {
            continue; // residual contact/CTA line — the site already renders CTA separately
        }
        $paragraph[] = $line;
    }
    $flushParagraph();
    $flushList();
    return implode("\n", $html);
}

/** Converts a full markdown service/blog document into clean, sanitized article HTML —
 *  dropping the SEO-setup scaffold, the FAQ section (already imported separately via
 *  save_faqs()), the "Get a Free Consultation" CTA restatement, and the "Internal Linking
 *  Instructions for Claude" section. None of those are real visitor-facing content. */
function import_md_to_article_html(string $markdownContent): string
{
    $htmlParts = [];
    foreach (import_md_split_sections($markdownContent) as $section) {
        if (preg_match(IMPORT_MD_SKIP_SECTION_PATTERN, $section['heading'])) {
            continue;
        }
        if (stripos($section['heading'], 'hero section') !== false) {
            continue; // already surfaced separately as hero_description/excerpt
        }
        $htmlParts[] = '<h2>' . import_md_inline_to_html($section['heading']) . '</h2>';
        $htmlParts[] = import_md_section_body_to_html($section['body']);
    }
    return sanitize_html(implode("\n", $htmlParts));
}

/** Single entry point for the service hero_description field. Non-markdown content (seo_page's
 *  contentFormat is "html" and already publish-ready) passes through unchanged. */
function import_extract_service_hero_description(array $record): ?string
{
    $content = $record['content'] ?? null;
    if (!is_string($content) || $content === '') {
        return null;
    }
    if (($record['contentFormat'] ?? null) === 'markdown') {
        return import_md_extract_hero_description($content);
    }
    return mb_substr($content, 0, 500);
}

/** Single entry point for blog_posts.content. */
function import_extract_blog_content(array $record): ?string
{
    $content = $record['content'] ?? null;
    if (!is_string($content) || $content === '') {
        return null;
    }
    if (($record['contentFormat'] ?? null) === 'markdown') {
        return import_md_to_article_html($content);
    }
    return $content;
}
