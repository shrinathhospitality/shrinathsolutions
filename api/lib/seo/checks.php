<?php
// The 49 check implementations — see docs/SEO_SCORING_SPECIFICATION.md §6 for the full list,
// weights and what "not yet implemented" means. Each check function returns
// ['id'=>string, 'outcome'=>'passed'|'improvement'|'warning'|'failed'|'unavailable'|'informational', 'detail'=>string].
// Outcome logic here must match src/features/seo-studio/engine/checks.ts exactly — see
// scripts/seo-parity-test.mjs.

declare(strict_types=1);

require_once __DIR__ . '/keyphrase.php';
require_once __DIR__ . '/extract.php';
require_once __DIR__ . '/rules.php';

function seo_check(string $id, string $outcome, string $detail = ''): array
{
    return ['id' => $id, 'outcome' => $outcome, 'detail' => $detail];
}

// ---------------------------------------------------------------------------
// Keyword (10 checks)
// ---------------------------------------------------------------------------
function seo_check_keyword(array $in): array
{
    $rules = seo_rules()['thresholds'];
    $kp = trim($in['primaryKeyphrase']);
    $out = [];

    if ($kp === '') {
        $out[] = seo_check('keyword.primary_exists', 'failed', 'No focus keyphrase set.');
        foreach (['keyword.in_title', 'keyword.title_position', 'keyword.in_description', 'keyword.in_slug',
                  'keyword.in_h1', 'keyword.in_introduction', 'keyword.in_subheadings', 'keyword.density', 'keyword.related_usage'] as $id) {
            $out[] = seo_check($id, 'unavailable', 'Set a focus keyphrase first.');
        }
        return $out;
    }
    $out[] = seo_check('keyword.primary_exists', 'passed', "Focus keyphrase: \"$kp\".");

    $out[] = seo_check('keyword.in_title', seo_phrase_exists($in['title'], $kp) ? 'passed' : 'improvement',
        seo_phrase_exists($in['title'], $kp) ? 'Keyphrase appears in the SEO title.' : 'Keyphrase does not appear in the SEO title.');

    $pos = seo_phrase_first_position($in['title'], $kp);
    $out[] = seo_check('keyword.title_position',
        $pos === null ? 'unavailable' : ($pos <= $rules['keyphrase_in_title_max_position_chars'] ? 'passed' : 'improvement'),
        $pos === null ? 'Keyphrase not in title.' : "Keyphrase starts at character $pos of the title.");

    $out[] = seo_check('keyword.in_description', seo_phrase_exists($in['description'], $kp) ? 'passed' : 'improvement',
        seo_phrase_exists($in['description'], $kp) ? 'Keyphrase appears in the meta description.' : 'Keyphrase does not appear in the meta description.');

    $out[] = seo_check('keyword.in_slug', seo_phrase_exists(str_replace('-', ' ', $in['slug']), $kp) ? 'passed' : 'improvement',
        'Checks the URL slug for the keyphrase (as separate words).');

    $out[] = seo_check('keyword.in_h1', seo_phrase_exists($in['h1'], $kp) ? 'passed' : 'improvement',
        seo_phrase_exists($in['h1'], $kp) ? 'Keyphrase appears in the H1.' : 'Keyphrase does not appear in the H1.');

    $out[] = seo_check('keyword.in_introduction', seo_phrase_exists($in['introText'], $kp) ? 'passed' : 'improvement',
        $in['introText'] === '' ? 'No introduction text found.' : (seo_phrase_exists($in['introText'], $kp) ? 'Keyphrase appears in the introduction.' : 'Keyphrase does not appear in the introduction.'));

    $subheadingText = implode(' ', array_map(fn($h) => $h['text'], array_filter($in['headings'], fn($h) => $h['level'] >= 2)));
    $out[] = seo_check('keyword.in_subheadings', $subheadingText === '' ? 'unavailable' : (seo_phrase_exists($subheadingText, $kp) ? 'passed' : 'informational'),
        'Not required in every subheading — natural placement only.');

    $density = seo_keyphrase_density($in['bodyText'], $kp);
    $densityOutcome = 'passed';
    if ($density < $rules['keyphrase_density_min_pct']) {
        $densityOutcome = 'improvement';
    } elseif ($density > $rules['keyphrase_density_max_pct']) {
        $densityOutcome = 'warning'; // stuffing risk, not an automatic failure
    }
    $out[] = seo_check('keyword.density', $in['wordCount'] < 30 ? 'unavailable' : $densityOutcome, sprintf('Density: %.2f%%.', $density));

    $related = array_filter($in['relatedKeyphrases'], fn($r) => trim((string) $r) !== '');
    if (!$related) {
        $out[] = seo_check('keyword.related_usage', 'informational', 'No related keyphrases set.');
    } else {
        $used = 0;
        foreach ($related as $r) {
            if (seo_phrase_exists($in['bodyText'], (string) $r)) {
                $used++;
            }
        }
        $out[] = seo_check('keyword.related_usage', $used > 0 ? 'passed' : 'improvement', "$used of " . count($related) . ' related keyphrases used.');
    }

    return $out;
}

// ---------------------------------------------------------------------------
// Metadata (12 checks)
// ---------------------------------------------------------------------------
function seo_check_metadata(PDO $pdo, array $in): array
{
    $rules = seo_rules()['thresholds'];
    $out = [];
    $titleLen = mb_strlen($in['title']);
    $descLen = mb_strlen($in['description']);

    $out[] = seo_check('metadata.title_exists', $in['title'] !== '' ? 'passed' : 'failed', $in['title'] !== '' ? '' : 'No SEO title set.');
    $out[] = seo_check('metadata.title_length',
        $in['title'] === '' ? 'unavailable' : (($titleLen >= $rules['title_min_chars'] && $titleLen <= $rules['title_max_chars']) ? 'passed' : ($titleLen > 0 ? 'improvement' : 'failed')),
        "Title is $titleLen characters (recommended {$rules['title_min_chars']}-{$rules['title_max_chars']}).");

    $titleDupe = seo_find_duplicate($pdo, 'meta_title', $in['title'], $in['contentType'], $in['contentId']);
    $out[] = seo_check('metadata.title_unique', $in['title'] === '' ? 'unavailable' : ($titleDupe ? 'warning' : 'passed'),
        $titleDupe ? 'Another published page uses this exact SEO title.' : '');

    $out[] = seo_check('metadata.description_exists', $in['description'] !== '' ? 'passed' : 'failed', $in['description'] !== '' ? '' : 'No meta description set.');
    $out[] = seo_check('metadata.description_length',
        $in['description'] === '' ? 'unavailable' : (($descLen >= $rules['description_min_chars'] && $descLen <= $rules['description_max_chars']) ? 'passed' : 'improvement'),
        "Description is $descLen characters (recommended {$rules['description_min_chars']}-{$rules['description_max_chars']}).");

    $descDupe = seo_find_duplicate($pdo, 'meta_description', $in['description'], $in['contentType'], $in['contentId']);
    $out[] = seo_check('metadata.description_unique', $in['description'] === '' ? 'unavailable' : ($descDupe ? 'warning' : 'passed'),
        $descDupe ? 'Another published page uses this exact meta description.' : '');

    $out[] = seo_check('metadata.canonical_exists', $in['canonical'] !== '' ? 'passed' : 'improvement', $in['canonical'] !== '' ? '' : 'No canonical URL set — the app supplies a default one at render time.');
    $httpsAbsolute = $in['canonical'] !== '' && str_starts_with($in['canonical'], 'https://');
    $out[] = seo_check('metadata.canonical_https_absolute', $in['canonical'] === '' ? 'unavailable' : ($httpsAbsolute ? 'passed' : 'failed'), '');

    $out[] = seo_check('metadata.robots_directive', 'informational', ($in['robotsIndex'] ? 'index' : 'noindex') . ', ' . ($in['robotsFollow'] ? 'follow' : 'nofollow'));

    $out[] = seo_check('metadata.og_title', $in['ogTitle'] !== '' || $in['title'] !== '' ? 'passed' : 'improvement', $in['ogTitle'] === '' ? 'Falls back to the SEO title.' : '');
    $out[] = seo_check('metadata.og_description', $in['ogDescription'] !== '' || $in['description'] !== '' ? 'passed' : 'improvement', $in['ogDescription'] === '' ? 'Falls back to the meta description.' : '');
    $out[] = seo_check('metadata.og_image', $in['ogImage'] !== '' ? 'passed' : 'informational', $in['ogImage'] === '' ? 'Falls back to the branded default OG image.' : '');

    return $out;
}

function seo_find_duplicate(PDO $pdo, string $column, string $value, string $contentType, int $contentId): bool
{
    if (trim($value) === '') {
        return false;
    }
    $stmt = $pdo->prepare("SELECT 1 FROM seo_meta WHERE $column = :value AND NOT (entity_type = :type AND entity_id = :id) LIMIT 1");
    $stmt->execute(['value' => $value, 'type' => $contentType, 'id' => $contentId]);
    return (bool) $stmt->fetchColumn();
}

// ---------------------------------------------------------------------------
// Content (8 checks)
// ---------------------------------------------------------------------------
function seo_check_content(array $in): array
{
    $rules = seo_rules();
    $out = [];
    $h1Count = count(array_filter($in['headings'], fn($h) => $h['level'] === 1)) + ($in['h1'] !== '' ? 1 : 0);

    $out[] = seo_check('content.single_h1', $in['h1'] !== '' ? 'passed' : 'failed', $in['h1'] !== '' ? 'One H1 found.' : 'No H1 found.');

    $levels = array_map(fn($h) => $h['level'], $in['headings']);
    $order_ok = true;
    $prev = 1;
    foreach ($levels as $l) {
        if ($l > $prev + 1) {
            $order_ok = false;
        }
        $prev = $l;
    }
    $out[] = seo_check('content.heading_structure', !$levels ? 'informational' : ($order_ok ? 'passed' : 'improvement'),
        $order_ok ? '' : 'A heading level is skipped (e.g. H2 straight to H4).');

    $profile = $rules['page_type_profiles'][$in['pageType']] ?? [];
    $minWords = $rules['thin_content_words'][$in['pageType']] ?? $rules['thin_content_words']['default'];
    $skipThin = !empty($profile['skip_thin_content']);
    $out[] = seo_check('content.word_count',
        $skipThin ? 'informational' : ($in['wordCount'] >= $minWords ? 'passed' : ($in['wordCount'] >= $minWords * 0.6 ? 'improvement' : 'failed')),
        "{$in['wordCount']} words (guideline for this page type: {$minWords}+).");

    $out[] = seo_check('content.introduction_present', $in['introText'] !== '' ? 'passed' : 'improvement', '');

    $headingTexts = array_map(fn($h) => seo_normalize_text($h['text']), $in['headings']);
    $dupes = count($headingTexts) !== count(array_unique($headingTexts));
    $out[] = seo_check('content.duplicate_headings', !$headingTexts ? 'informational' : ($dupes ? 'warning' : 'passed'), '');

    $empty = count(array_filter($in['headings'], fn($h) => trim($h['text']) === ''));
    $out[] = seo_check('content.empty_headings', $empty > 0 ? 'failed' : 'passed', $empty > 0 ? "$empty empty heading(s) found." : '');

    $requiresFaq = !empty($profile['requires_faq']);
    $out[] = seo_check('content.faq_presence', !$requiresFaq ? 'informational' : ($in['hasFaq'] ?? false ? 'passed' : 'improvement'), '');

    $requiresCta = !empty($profile['requires_cta']);
    $hasCta = preg_match('/\b(contact|get a quote|book|enquire|call|whatsapp|get started|request)\b/iu', $in['bodyText']) === 1;
    $out[] = seo_check('content.cta_presence', !$requiresCta ? 'informational' : ($hasCta ? 'passed' : 'improvement'), '');

    return $out;
}

// ---------------------------------------------------------------------------
// Readability (6 checks, English only)
// ---------------------------------------------------------------------------
function seo_split_sentences(string $text): array
{
    $parts = preg_split('/(?<=[.!?])\s+(?=[A-Z\p{Lu}])/u', $text) ?: [];
    return array_values(array_filter(array_map('trim', $parts), fn($s) => $s !== ''));
}

function seo_check_readability(array $in): array
{
    $ids = ['readability.sentence_length', 'readability.paragraph_length', 'readability.passive_voice',
            'readability.transition_words', 'readability.subheading_distribution', 'readability.consecutive_sentence_starts'];

    if ($in['language'] !== 'en') {
        return array_map(fn($id) => seo_check($id, 'unavailable', 'Language-specific readability checks are English-only.'), $ids);
    }
    if ($in['wordCount'] < 30) {
        return array_map(fn($id) => seo_check($id, 'unavailable', 'Not enough content to analyze readability.'), $ids);
    }

    $rules = seo_rules()['thresholds'];
    $out = [];
    $sentences = seo_split_sentences($in['bodyText']);
    $sentenceWordCounts = array_map('seo_word_count', $sentences);
    $longSentences = count(array_filter($sentenceWordCounts, fn($c) => $c > $rules['sentence_words_hard']));
    $longPct = $sentences ? $longSentences / count($sentences) * 100 : 0;
    $out[] = seo_check('readability.sentence_length', $longPct <= 10 ? 'passed' : ($longPct <= 25 ? 'improvement' : 'warning'),
        sprintf('%.0f%% of sentences exceed %d words.', $longPct, $rules['sentence_words_hard']));

    $paraWordCounts = array_map('seo_word_count', $in['paragraphs']);
    $longParas = count(array_filter($paraWordCounts, fn($c) => $c > $rules['paragraph_words_hard']));
    $out[] = seo_check('readability.paragraph_length', !$in['paragraphs'] ? 'unavailable' : ($longParas === 0 ? 'passed' : 'improvement'),
        $longParas > 0 ? "$longParas paragraph(s) exceed {$rules['paragraph_words_hard']} words." : '');

    $passiveHits = preg_match_all('/\b(?:is|are|was|were|be|been|being)\s+\w+ed\b/iu', $in['bodyText']);
    $passivePct = $sentences ? ($passiveHits ?: 0) / count($sentences) * 100 : 0;
    $out[] = seo_check('readability.passive_voice', $passivePct <= 10 ? 'passed' : ($passivePct <= 20 ? 'improvement' : 'warning'),
        sprintf('Approx. %.0f%% of sentences use a passive construction.', $passivePct));

    $transitionWords = ['however', 'therefore', 'moreover', 'additionally', 'furthermore', 'because', 'meanwhile', 'in addition', 'as a result', 'for example', 'in fact', 'consequently', 'similarly', 'next', 'finally', 'also', 'but', 'so'];
    $withTransition = 0;
    foreach ($sentences as $s) {
        foreach ($transitionWords as $t) {
            if (seo_phrase_exists($s, $t)) {
                $withTransition++;
                break;
            }
        }
    }
    $transitionPct = $sentences ? $withTransition / count($sentences) * 100 : 0;
    $out[] = seo_check('readability.transition_words', $transitionPct >= $rules['transition_word_target_pct'] ? 'passed' : 'improvement',
        sprintf('%.0f%% of sentences use a transition word (target %d%%+).', $transitionPct, $rules['transition_word_target_pct']));

    $subheadings = array_filter($in['headings'], fn($h) => $h['level'] >= 2);
    $expectedHeadings = max(1, (int) floor($in['wordCount'] / $rules['heading_distribution_words']));
    $out[] = seo_check('readability.subheading_distribution', $in['wordCount'] < $rules['heading_distribution_words'] ? 'informational' : (count($subheadings) >= $expectedHeadings ? 'passed' : 'improvement'),
        sprintf('%d subheading(s) for %d words (guideline: ~1 per %d words).', count($subheadings), $in['wordCount'], $rules['heading_distribution_words']));

    $starts = array_map(function ($s) {
        $words = preg_split('/\s+/u', trim($s));
        return seo_normalize_text($words[0] ?? '');
    }, $sentences);
    $maxRun = 1;
    $run = 1;
    for ($i = 1; $i < count($starts); $i++) {
        if ($starts[$i] !== '' && $starts[$i] === $starts[$i - 1]) {
            $run++;
            $maxRun = max($maxRun, $run);
        } else {
            $run = 1;
        }
    }
    $out[] = seo_check('readability.consecutive_sentence_starts', $maxRun < $rules['consecutive_same_start_limit'] ? 'passed' : 'improvement',
        $maxRun >= $rules['consecutive_same_start_limit'] ? "$maxRun consecutive sentences start with the same word." : '');

    return $out;
}

// ---------------------------------------------------------------------------
// Links (5 checks)
// ---------------------------------------------------------------------------
function seo_check_links(array $in, int $incomingCount): array
{
    $rules = seo_rules()['thresholds'];
    $out = [];
    $internal = array_filter($in['links'], fn($l) => $l['isInternal']);
    $external = array_filter($in['links'], fn($l) => !$l['isInternal']);

    $out[] = seo_check('links.internal_count', count($internal) > 0 ? 'passed' : 'improvement', count($internal) . ' internal link(s).');
    $out[] = seo_check('links.outgoing_present', count($in['links']) > 0 ? 'passed' : 'informational', '');

    $generic = 0;
    foreach ($in['links'] as $l) {
        $t = seo_normalize_text($l['text']);
        if (in_array($t, $rules['generic_anchor_terms'], true)) {
            $generic++;
        }
    }
    $out[] = seo_check('links.generic_anchor_text', empty($in['links']) ? 'informational' : ($generic === 0 ? 'passed' : 'improvement'),
        $generic > 0 ? "$generic link(s) use generic anchor text (e.g. \"click here\")." : '');

    $out[] = seo_check('links.incoming_count', $incomingCount > 0 ? 'passed' : 'warning',
        $incomingCount === 0 ? 'No other page links to this one (orphan risk).' : "$incomingCount incoming internal link(s).");

    $insecure = 0;
    foreach ($external as $l) {
        if ($l['target'] === '_blank' && (!$l['rel'] || !str_contains($l['rel'], 'noopener'))) {
            $insecure++;
        }
    }
    $out[] = seo_check('links.external_security', empty($external) ? 'informational' : ($insecure === 0 ? 'passed' : 'failed'),
        $insecure > 0 ? "$insecure external link(s) open a new tab without rel=\"noopener\"." : '');

    return $out;
}

// ---------------------------------------------------------------------------
// Images (4 checks)
// ---------------------------------------------------------------------------
function seo_check_images(array $in): array
{
    $out = [];
    $images = $in['images'];

    $missingAlt = count(array_filter($images, fn($i) => trim($i['alt']) === ''));
    $out[] = seo_check('images.missing_alt', !$images ? 'informational' : ($missingAlt === 0 ? 'passed' : 'failed'),
        $missingAlt > 0 ? "$missingAlt of " . count($images) . ' image(s) missing alt text.' : '');

    $generic = ['image', 'photo', 'picture', 'img', 'untitled'];
    $poorAlt = count(array_filter($images, fn($i) => trim($i['alt']) !== '' && in_array(seo_normalize_text($i['alt']), $generic, true)));
    $out[] = seo_check('images.alt_quality', !$images ? 'informational' : ($poorAlt === 0 ? 'passed' : 'improvement'),
        $poorAlt > 0 ? "$poorAlt image(s) use a generic alt value like \"image\"." : '');

    $missingDims = count(array_filter($images, fn($i) => !$i['hasDimensions']));
    $out[] = seo_check('images.missing_dimensions', !$images ? 'informational' : ($missingDims === 0 ? 'passed' : 'improvement'),
        $missingDims > 0 ? "$missingDims image(s) missing width/height attributes (CLS risk)." : '');

    $out[] = seo_check('images.count', 'informational', count($images) . ' image(s) found in this content.');

    return $out;
}

// ---------------------------------------------------------------------------
// Technical (4 checks)
// ---------------------------------------------------------------------------
function seo_check_technical(PDO $pdo, array $in): array
{
    $rules = seo_rules()['page_type_profiles'][$in['pageType']] ?? [];
    $out = [];

    $defaultIndexable = $rules['default_indexable'] ?? true;
    $isIndexable = $in['robotsIndex'];
    if ($isIndexable === $defaultIndexable) {
        $out[] = seo_check('technical.indexable', 'passed', $isIndexable ? 'Indexable, as expected for this page type.' : 'Intentionally noindex, as expected for this page type.');
    } else {
        $out[] = seo_check('technical.indexable', $defaultIndexable && !$isIndexable ? 'failed' : 'warning',
            $defaultIndexable && !$isIndexable ? 'This page type should normally be indexable, but robots is set to noindex.' : 'This page is indexable but its page type usually defaults to noindex — confirm this is intentional.');
    }

    if ($in['canonical'] === '') {
        $out[] = seo_check('technical.canonical_matches_page', 'improvement', 'No canonical set — defaults to this page\'s own URL at render time.');
    } else {
        $canonicalPath = seo_normalize_url_for_matching($in['canonical']);
        $ownPath = seo_normalize_url_for_matching($in['publicUrl']);
        $out[] = seo_check('technical.canonical_matches_page', $canonicalPath === $ownPath ? 'passed' : 'failed',
            $canonicalPath === $ownPath ? '' : "Canonical points to \"$canonicalPath\", not this page's own URL (\"$ownPath\").");
    }

    $out[] = seo_check('technical.structured_data_present', empty($in['schemaTypes']) ? 'improvement' : 'passed',
        empty($in['schemaTypes']) ? 'No page-specific schema selected.' : 'Schema: ' . implode(', ', $in['schemaTypes']) . '.');

    $slugStmt = null;
    $dupSlug = false;
    foreach (SEO_CONTENT_TYPES as $otherType) {
        if ($otherType === $in['contentType']) {
            continue;
        }
        $table = match ($otherType) {
            'page' => 'pages', 'service' => 'services', 'seo_page' => 'seo_pages',
            'blog_post' => 'blog_posts', 'portfolio_project' => 'portfolio_projects',
        };
        // blog/portfolio live under their own URL prefix, so a same-slug row there never
        // collides with a root-level page/service/seo_page slug — only compare within the
        // same URL-prefix space.
        if (in_array($otherType, ['page', 'seo_page'], true) && in_array($in['contentType'], ['page', 'seo_page'], true)) {
            $stmt = $pdo->prepare("SELECT 1 FROM $table WHERE slug = :slug LIMIT 1");
            $stmt->execute(['slug' => $in['slug']]);
            if ($stmt->fetchColumn()) {
                $dupSlug = true;
                break;
            }
        }
    }
    $out[] = seo_check('technical.unique_slug', $dupSlug ? 'failed' : 'passed', $dupSlug ? 'This slug is also used by another root-level page.' : '');

    return $out;
}
