<?php
// HTML sanitization for anything saved from rich-text/section content. Allowlist-based:
// only a small set of formatting tags survive, no scripts/styles/event handlers/javascript: URLs.

declare(strict_types=1);

const SANITIZE_ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'blockquote', 'span'];
const SANITIZE_ALLOWED_ATTRS = ['a' => ['href', 'target', 'rel']];

function sanitize_html(string $html): string
{
    if (trim($html) === '') {
        return $html;
    }

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><div id="__root__">' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();

    $root = $doc->getElementById('__root__');
    if (!$root) {
        return strip_tags($html, '<' . implode('><', SANITIZE_ALLOWED_TAGS) . '>');
    }

    sanitize_node($doc, $root);

    $out = '';
    foreach (iterator_to_array($root->childNodes) as $child) {
        $out .= $doc->saveHTML($child);
    }
    return trim($out);
}

function sanitize_node(DOMDocument $doc, DOMNode $node): void
{
    $children = iterator_to_array($node->childNodes);
    foreach ($children as $child) {
        if ($child->nodeType === XML_TEXT_NODE) {
            continue;
        }

        if ($child->nodeType !== XML_ELEMENT_NODE) {
            $node->removeChild($child);
            continue;
        }

        /** @var DOMElement $child */
        $tag = strtolower($child->nodeName);

        if (!in_array($tag, SANITIZE_ALLOWED_TAGS, true)) {
            // Unwrap: keep the text content, drop the tag itself.
            while ($child->firstChild) {
                $node->insertBefore($child->firstChild, $child);
            }
            $node->removeChild($child);
            continue;
        }

        foreach (iterator_to_array($child->attributes ?? []) as $attr) {
            $allowed = SANITIZE_ALLOWED_ATTRS[$tag] ?? [];
            $name = strtolower($attr->nodeName);
            $isSafeHref = $name === 'href' && !preg_match('/^\s*javascript:/i', $attr->nodeValue);
            if (!in_array($name, $allowed, true) || ($name === 'href' && !$isSafeHref)) {
                $child->removeAttribute($attr->nodeName);
            }
        }

        sanitize_node($doc, $child);
    }
}

/** Recursively sanitizes every string leaf in a decoded JSON value (array/object/scalar). */
function sanitize_json_strings($value)
{
    if (is_array($value)) {
        $out = [];
        foreach ($value as $k => $v) {
            $out[$k] = sanitize_json_strings($v);
        }
        return $out;
    }
    if (is_string($value)) {
        return sanitize_html($value);
    }
    return $value;
}
