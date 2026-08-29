<?php
// Unicode-aware keyphrase normalization and matching. Never uses naive substring matching —
// every match is bounded so "seo" cannot match inside "seoul" — and normalizes case, multiple
// spaces, punctuation and common apostrophe variants before comparing.

declare(strict_types=1);

function seo_normalize_text(string $text): string
{
    $text = str_replace(["\xE2\x80\x99", "\xE2\x80\x98", '`'], "'", $text); // ' ' ` -> '
    $text = mb_strtolower($text, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return trim($text);
}

/** Word count using a Unicode letter/number boundary, not just whitespace-splitting, so
 *  punctuation-glued words are still counted sanely for CJK-free, space-delimited languages. */
function seo_word_count(string $text): int
{
    $normalized = seo_normalize_text($text);
    if ($normalized === '') {
        return 0;
    }
    preg_match_all('/[\p{L}\p{N}]+(?:[\'’-][\p{L}\p{N}]+)*/u', $normalized, $m);
    return count($m[0]);
}

/** Builds a Unicode-boundary-safe regex for one phrase — matches only when the phrase is not
 *  immediately preceded/followed by another letter or number, so it can never match inside a
 *  longer unrelated word. */
function seo_phrase_regex(string $phrase): ?string
{
    $normalized = seo_normalize_text($phrase);
    if ($normalized === '') {
        return null;
    }
    $escaped = preg_quote($normalized, '/');
    $escaped = preg_replace('/\\\\ /', '\\s+', $escaped) ?? $escaped;
    return '/(?<![\p{L}\p{N}])' . $escaped . '(?![\p{L}\p{N}])/u';
}

function seo_count_phrase_occurrences(string $haystack, string $phrase): int
{
    $regex = seo_phrase_regex($phrase);
    if ($regex === null) {
        return 0;
    }
    $normalizedHaystack = seo_normalize_text($haystack);
    $count = preg_match_all($regex, $normalizedHaystack);
    return $count === false ? 0 : $count;
}

function seo_phrase_exists(string $haystack, string $phrase): bool
{
    return seo_count_phrase_occurrences($haystack, $phrase) > 0;
}

/** Keyphrase density as a percentage of total words, weighted by the phrase's own word count
 *  (a 3-word phrase appearing twice "uses up" 6 word-slots worth of density, not 2). */
function seo_keyphrase_density(string $bodyText, string $phrase): float
{
    $totalWords = seo_word_count($bodyText);
    if ($totalWords === 0) {
        return 0.0;
    }
    $occurrences = seo_count_phrase_occurrences($bodyText, $phrase);
    $phraseWords = max(1, seo_word_count($phrase));
    return ($occurrences * $phraseWords) / $totalWords * 100;
}

/** Position (0-based char offset into normalized text) of the first occurrence, or null. */
function seo_phrase_first_position(string $haystack, string $phrase): ?int
{
    $regex = seo_phrase_regex($phrase);
    if ($regex === null) {
        return null;
    }
    $normalizedHaystack = seo_normalize_text($haystack);
    if (preg_match($regex, $normalizedHaystack, $m, PREG_OFFSET_CAPTURE)) {
        return $m[0][1];
    }
    return null;
}
