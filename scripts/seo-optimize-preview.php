<?php
// Read-only preview generator for the "optimize every page" initiative (spec sections 1, 5, 18).
// Never writes to the database — every score shown here comes from calling the real, unmodified
// analysis pipeline (seo_build_input + seo_run_analysis, the same functions the admin Save button
// uses) against either the live stored keyphrase or an in-memory proposed one. No engine code is
// duplicated or reimplemented.
//
// Usage:
//   php scripts/seo-optimize-preview.php [--content-type=seo_page] [--limit=20] [--route=/slug]
//
// Output:
//   docs/seo-all-pages-optimization-preview.json
//   docs/SEO_ALL_PAGES_OPTIMIZATION_REPORT.md

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit(1);
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';
require __DIR__ . '/../api/models/Page.php';
require __DIR__ . '/../api/models/Service.php';
require __DIR__ . '/../api/models/Venture.php';
require __DIR__ . '/../api/models/SeoPage.php';
require __DIR__ . '/../api/models/Blog.php';
require __DIR__ . '/../api/models/Portfolio.php';
require __DIR__ . '/../api/lib/seo/rules.php';
require __DIR__ . '/../api/lib/seo/keyphrase.php';
require __DIR__ . '/../api/lib/seo/extract.php';
require __DIR__ . '/../api/lib/seo/input.php';
require __DIR__ . '/../api/lib/seo/checks.php';
require __DIR__ . '/../api/lib/seo/scorer.php';
require __DIR__ . '/../api/lib/seo/link_index.php';
require __DIR__ . '/../api/lib/seo/documents.php';
require __DIR__ . '/../api/lib/seo/analyze.php';

$opts = getopt('', ['content-type::', 'limit::', 'route::']);
$filterType = $opts['content-type'] ?? null;
$filterRoute = $opts['route'] ?? null;
$limit = isset($opts['limit']) ? (int) $opts['limit'] : null;

$pdo = get_db_connection();

$sql = 'SELECT * FROM seo_documents';
$where = [];
$params = [];
if ($filterType) {
    $where[] = 'content_type = :ct';
    $params['ct'] = $filterType;
}
if ($filterRoute) {
    $where[] = 'route_path = :rp';
    $params['rp'] = $filterRoute;
}
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY content_type, id';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$docs = $stmt->fetchAll();
if ($limit) {
    $docs = array_slice($docs, 0, $limit);
}

// A short list of generic English stopwords/brand tokens to strip from candidate keyphrases.
// This never invents words — it only trims filler so the *existing* H1/title text (real content
// already written for the page) becomes a usable focus phrase.
const SEO_PREVIEW_STOPWORDS = [
    'a', 'an', 'the', 'and', 'or', 'for', 'with', 'to', 'of', 'in', 'on', 'at', 'by', 'is', 'are',
    'your', 'our', 'we', 'you', 'best', 'top', 'no.1', 'no1', '#1', 'guaranteed', 'shrinath', 'solutions',
];

function seo_preview_strip_brand(string $text): string
{
    $text = preg_replace('/\|\s*shrinath\s+solutions/iu', '', $text) ?? $text;
    $text = preg_replace('/-\s*shrinath\s+solutions/iu', '', $text) ?? $text;
    $text = preg_replace('/shrinath\s+solutions/iu', '', $text) ?? $text;
    return trim($text);
}

/** Derives a focus keyphrase candidate from real, already-authored page text (H1 first, then
 *  meta title, then display name) — never fabricates new words. Returns null when there is no
 *  usable source text at all. */
function seo_preview_derive_primary(array $in, string $displayName): ?string
{
    $source = $in['h1'] !== '' ? $in['h1'] : ($in['title'] !== '' ? $in['title'] : $displayName);
    $source = seo_preview_strip_brand($source);
    $source = seo_normalize_text($source);
    $source = preg_replace('/[^\p{L}\p{N}\s-]/u', ' ', $source) ?? $source;
    $source = preg_replace('/\s+/u', ' ', $source) ?? $source;
    $words = array_values(array_filter(explode(' ', trim($source)), fn($w) => $w !== ''));

    // Trim leading/trailing stopwords only — keep the meaningful middle of the phrase intact.
    while ($words && in_array($words[0], SEO_PREVIEW_STOPWORDS, true)) {
        array_shift($words);
    }
    while ($words && in_array(end($words), SEO_PREVIEW_STOPWORDS, true)) {
        array_pop($words);
    }
    if (!$words) {
        return null;
    }
    // Focus keyphrases read best short; cap at 6 words of the real heading text.
    $words = array_slice($words, 0, 6);
    return implode(' ', $words);
}

/** Up to 5 related keyphrases pulled from the page's own body text via 2-3 word n-gram
 *  frequency, excluding the primary phrase and stopword-only n-grams. Real words only. */
function seo_preview_derive_related(array $in, string $primary): array
{
    $text = seo_normalize_text($in['bodyText']);
    $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text) ?? $text;
    $words = array_values(array_filter(explode(' ', $text), fn($w) => $w !== '' && !in_array($w, SEO_PREVIEW_STOPWORDS, true) && mb_strlen($w) > 2));

    $ngrams = [];
    for ($n = 3; $n >= 2; $n--) {
        for ($i = 0; $i + $n <= count($words); $i++) {
            $phrase = implode(' ', array_slice($words, $i, $n));
            if ($phrase === $primary) {
                continue;
            }
            $ngrams[$phrase] = ($ngrams[$phrase] ?? 0) + 1;
        }
    }
    arsort($ngrams);
    $related = [];
    foreach (array_keys($ngrams) as $phrase) {
        if (($ngrams[$phrase] ?? 0) < 2) {
            break; // require at least 2 occurrences to count as a genuine recurring theme
        }
        $related[] = $phrase;
        if (count($related) >= 5) {
            break;
        }
    }
    return $related;
}

function seo_preview_failed_checks(array $result): array
{
    $failed = [];
    foreach ($result['checks'] as $c) {
        if (in_array($c['outcome'], ['failed', 'warning'], true)) {
            $failed[] = ['id' => $c['id'], 'outcome' => $c['outcome']];
        }
    }
    return $failed;
}

$usedKeyphrases = []; // normalized primary keyphrase => [route_path, ...]
$rows = [];
$conflicts = [];
$errors = 0;

foreach ($docs as $doc) {
    $contentType = $doc['content_type'];
    // 'venture' moved out of SEO_VIRTUAL_CONTENT_TYPES once Ventures got a real table (see
    // api/lib/seo/documents.php) — only 'static_page' still uses the registry's own id.
    $isVirtual = in_array($contentType, SEO_VIRTUAL_CONTENT_TYPES, true);
    $contentId = $isVirtual ? (int) $doc['id'] : (int) $doc['content_id'];

    try {
        $row = seo_load_content_row($pdo, $contentType, $contentId);
    } catch (Throwable $e) {
        $row = null;
    }

    if (!$row) {
        $rows[] = [
            'document_id' => (int) $doc['id'],
            'route' => $doc['route_path'],
            'content_type' => $contentType,
            'classification' => 'CONFLICT',
            'reason' => 'Registry row has no matching content row (orphan document or missing prerendered file for a virtual route). Requires manual review before any change.',
        ];
        $errors++;
        continue;
    }

    $seoMetaEntityType = seo_meta_entity_type_for($contentType);
    $seoMeta = get_seo_meta($pdo, $seoMetaEntityType, $contentId);
    $analysisMeta = seo_find_analysis($pdo, $contentType, $contentId);
    $incomingCount = seo_count_incoming_links($pdo, $contentType, $contentId);
    $hasFaq = count(get_faqs($pdo, $contentType, $contentId)) > 0;

    $inputCurrent = seo_build_input($contentType, $row, $seoMeta, $analysisMeta);
    $currentResult = seo_run_analysis($pdo, $inputCurrent, $incomingCount, $hasFaq);

    $pageType = $inputCurrent['pageType'];
    $isUtility = $pageType === 'utility_noindex';
    $hasKeyphrase = trim($inputCurrent['primaryKeyphrase']) !== '';

    $entry = [
        'document_id' => (int) $doc['id'],
        'route' => $doc['route_path'],
        'content_type' => $contentType,
        'content_id' => $contentId,
        'page_profile' => $pageType,
        'is_published' => (bool) $doc['is_published'],
        'is_indexable' => (bool) $doc['is_indexable'],
        'display_name' => $doc['display_name'],
        'search_intent' => $isUtility ? 'utility/navigational (no commercial keyphrase applicable)' : null,
        'before' => [
            'primary_keyphrase' => $inputCurrent['primaryKeyphrase'],
            'related_keyphrases' => $inputCurrent['relatedKeyphrases'],
            'seo_score' => $currentResult['seoScore'],
            'readability_score' => $currentResult['readabilityScore'],
            'overall_score' => $currentResult['overallScore'],
            'score_status' => $currentResult['scoreStatus'],
            'failed_or_warning_checks' => seo_preview_failed_checks($currentResult),
        ],
        'proposed' => null,
        'after' => null,
        'classification' => null,
        'reason' => null,
    ];

    if ($isUtility) {
        $entry['classification'] = 'SKIP';
        $entry['reason'] = 'utility_noindex page profile — no commercial focus keyphrase should be forced onto this page per spec section 3.';
    } elseif ($hasKeyphrase) {
        $normalized = seo_normalize_text($inputCurrent['primaryKeyphrase']);
        $usedKeyphrases[$normalized][] = $doc['route_path'];
        $entry['classification'] = 'UNCHANGED';
        $entry['reason'] = 'Primary keyphrase already set — no metadata change proposed in this pass.';
    } else {
        $primary = seo_preview_derive_primary($inputCurrent, $doc['display_name']);
        if ($primary === null) {
            $entry['classification'] = 'SKIP';
            $entry['reason'] = 'No H1/title/body text exists yet to derive a genuine keyphrase from (empty content) — needs manual authoring, not an auto-assigned phrase.';
        } else {
            $normalized = seo_normalize_text($primary);
            $isCannibalized = isset($usedKeyphrases[$normalized]) && $doc['is_indexable'] && $doc['is_published'];

            if ($isCannibalized) {
                $entry['classification'] = 'CONFLICT';
                $entry['reason'] = 'Candidate keyphrase "' . $primary . '" derived from this page\'s own H1/title already used by: '
                    . implode(', ', $usedKeyphrases[$normalized]) . '. Flagged for manual review rather than auto-assigning a duplicate (spec section 3.5).';
                $conflicts[] = ['route' => $doc['route_path'], 'keyphrase' => $primary, 'collides_with' => $usedKeyphrases[$normalized]];
            } else {
                $related = seo_preview_derive_related($inputCurrent, $normalized);
                $analysisMetaProposed = $analysisMeta ?? [];
                $analysisMetaProposed['primary_keyphrase'] = $primary;
                $analysisMetaProposed['related_keyphrases'] = $related;
                $analysisMetaProposed['language'] = $analysisMeta['language'] ?? 'en';
                $analysisMetaProposed['is_cornerstone'] = $analysisMeta['is_cornerstone'] ?? false;
                $analysisMetaProposed['page_type'] = $pageType;

                $inputProposed = seo_build_input($contentType, $row, $seoMeta, $analysisMetaProposed);
                $afterResult = seo_run_analysis($pdo, $inputProposed, $incomingCount, $hasFaq);

                $entry['proposed'] = ['primary_keyphrase' => $primary, 'related_keyphrases' => $related];
                $entry['after'] = [
                    'seo_score' => $afterResult['seoScore'],
                    'readability_score' => $afterResult['readabilityScore'],
                    'overall_score' => $afterResult['overallScore'],
                    'score_status' => $afterResult['scoreStatus'],
                    'failed_or_warning_checks' => seo_preview_failed_checks($afterResult),
                ];
                $entry['classification'] = 'SAFE_FILL_MISSING';
                $entry['reason'] = 'Derived from this page\'s own existing H1/title/body text (no invented content). Only fills a currently-empty field.';

                $usedKeyphrases[$normalized][] = $doc['route_path'];
            }
        }
    }

    $rows[] = $entry;
}

$outDir = __DIR__ . '/../docs';
if (!is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

$jsonPath = $outDir . '/seo-all-pages-optimization-preview.json';
file_put_contents($jsonPath, json_encode([
    'generated_at' => date('c'),
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'total_documents' => count($docs),
    'errors' => $errors,
    'conflicts' => $conflicts,
    'documents' => $rows,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

// --- Markdown summary report ---
$byClass = [];
foreach ($rows as $r) {
    $byClass[$r['classification'] ?? 'UNKNOWN'] = ($byClass[$r['classification'] ?? 'UNKNOWN'] ?? 0) + 1;
}

$avgBefore = ['seo' => [], 'read' => [], 'overall' => []];
$avgAfter = ['seo' => [], 'read' => [], 'overall' => []];
foreach ($rows as $r) {
    if (!isset($r['before'])) continue;
    if ($r['before']['seo_score'] !== null) $avgBefore['seo'][] = $r['before']['seo_score'];
    if ($r['before']['readability_score'] !== null) $avgBefore['read'][] = $r['before']['readability_score'];
    if ($r['before']['overall_score'] !== null) $avgBefore['overall'][] = $r['before']['overall_score'];
    $after = $r['after'] ?? $r['before'];
    if ($after['seo_score'] !== null) $avgAfter['seo'][] = $after['seo_score'];
    if ($after['readability_score'] !== null) $avgAfter['read'][] = $after['readability_score'];
    if ($after['overall_score'] !== null) $avgAfter['overall'][] = $after['overall_score'];
}
function seo_preview_avg(array $vals): string
{
    return $vals ? number_format(array_sum($vals) / count($vals), 1) : 'n/a';
}

$md = "# SEO All-Pages Optimization — Preview Report (read-only, no writes)\n\n";
$md .= "Generated: " . date('c') . "\n\n";
$md .= "Every score below was computed by the real, unchanged PHP scoring engine (`seo_run_analysis`) — the same function the admin Save button calls — either against the currently stored keyphrase, or in-memory against a candidate keyphrase derived from the page's own existing H1/title/body text. **Nothing was written to the database.**\n\n";
$md .= "## Totals\n\n";
$md .= "- Documents in registry scanned: **" . count($docs) . "**\n";
$md .= "- Errors / orphan registry rows: **{$errors}**\n";
$md .= "- Keyphrase cannibalization conflicts detected: **" . count($conflicts) . "**\n\n";

$md .= "## By classification\n\n| Classification | Count |\n|---|---|\n";
foreach ($byClass as $k => $v) {
    $md .= "| {$k} | {$v} |\n";
}

$md .= "\n## Average scores (before -> after proposed keyphrase fill only)\n\n";
$md .= "| Metric | Before | After |\n|---|---|---|\n";
$md .= "| SEO score | " . seo_preview_avg($avgBefore['seo']) . " | " . seo_preview_avg($avgAfter['seo']) . " |\n";
$md .= "| Readability score | " . seo_preview_avg($avgBefore['read']) . " | " . seo_preview_avg($avgAfter['read']) . " |\n";
$md .= "| Overall score | " . seo_preview_avg($avgBefore['overall']) . " | " . seo_preview_avg($avgAfter['overall']) . " |\n";

if ($conflicts) {
    $md .= "\n## Keyphrase cannibalization conflicts (require manual review — not auto-resolved)\n\n";
    $md .= "| Route | Candidate keyphrase | Already used by |\n|---|---|---|\n";
    foreach ($conflicts as $c) {
        $md .= "| {$c['route']} | {$c['keyphrase']} | " . implode(', ', $c['collides_with']) . " |\n";
    }
}

$md .= "\n## Per-document detail\n\n";
$md .= "| Route | Type | Profile | Classification | Before SEO/Read/Overall | Proposed keyphrase | After SEO/Read/Overall | Remaining failed/warning checks |\n";
$md .= "|---|---|---|---|---|---|---|---|\n";
foreach ($rows as $r) {
    $before = $r['before'] ?? null;
    $beforeStr = $before ? "{$before['seo_score']}/{$before['readability_score']}/{$before['overall_score']}" : 'n/a';
    $afterStr = $r['after'] ? "{$r['after']['seo_score']}/{$r['after']['readability_score']}/{$r['after']['overall_score']}" : '-';
    $proposedStr = $r['proposed'] ? $r['proposed']['primary_keyphrase'] : '-';
    $remaining = $r['after'] ? $r['after']['failed_or_warning_checks'] : ($before['failed_or_warning_checks'] ?? []);
    $remainingStr = implode(', ', array_map(fn($c) => $c['id'] . ':' . $c['outcome'], array_slice($remaining, 0, 6))) . (count($remaining) > 6 ? ' …' : '');
    $md .= "| {$r['route']} | {$r['content_type']} | {$r['page_profile']} | {$r['classification']} | {$beforeStr} | {$proposedStr} | {$afterStr} | {$remainingStr} |\n";
}

file_put_contents($outDir . '/SEO_ALL_PAGES_OPTIMIZATION_REPORT.md', $md);

fwrite(STDERR, "Done. {$jsonPath} and docs/SEO_ALL_PAGES_OPTIMIZATION_REPORT.md written.\n");
fwrite(STDERR, "Documents: " . count($docs) . ", errors: {$errors}, conflicts: " . count($conflicts) . "\n");
