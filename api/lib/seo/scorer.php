<?php
// Aggregates check results into category scores, the three headline scores, status and caps.
// This is the one place score math happens — checks.php never computes a score, only outcomes.

declare(strict_types=1);

require_once __DIR__ . '/rules.php';
require_once __DIR__ . '/checks.php';

/** Weighted average of a category's checks, excluding unavailable/informational. Returns
 *  null (not a number) if every check in the category was excluded. */
function seo_category_score(array $checks): ?float
{
    $values = seo_rules()['outcome_values'];
    $sum = 0.0;
    $count = 0;
    foreach ($checks as $c) {
        if (!array_key_exists($c['outcome'], $values)) {
            continue; // unavailable / informational
        }
        $sum += $values[$c['outcome']];
        $count++;
    }
    return $count === 0 ? null : ($sum / $count) * 100;
}

function seo_status_for_score(?float $score): string
{
    if ($score === null) {
        return 'not_analyzed';
    }
    $t = seo_rules()['status_thresholds'];
    if ($score >= $t['good']) {
        return 'good';
    }
    if ($score >= $t['needs_improvement']) {
        return 'needs_improvement';
    }
    return 'poor';
}

/** Runs every category's checks and returns the full analysis result — does not persist
 *  anything. $incomingCount and $hasFaq are DB-derived facts the checks can't compute alone. */
function seo_run_analysis(PDO $pdo, array $in, int $incomingCount, bool $hasFaq): array
{
    $in['hasFaq'] = $hasFaq;

    $byCategory = [
        'keyword' => seo_check_keyword($in),
        'metadata' => seo_check_metadata($pdo, $in),
        'content' => seo_check_content($in),
        'readability' => seo_check_readability($in),
        'links' => seo_check_links($in, $incomingCount),
        'images' => seo_check_images($in),
        'technical' => seo_check_technical($pdo, $in),
    ];

    $categoryScores = [];
    foreach ($byCategory as $cat => $checks) {
        $categoryScores[$cat] = seo_category_score($checks);
    }

    $weights = seo_rules()['category_weights'];

    // Overall: sum(category * weight), skipping categories with no scoreable checks and
    // renormalizing the denominator so an unscored category never drags the average down.
    $overallNum = 0.0;
    $overallDen = 0.0;
    foreach ($weights as $cat => $w) {
        if ($categoryScores[$cat] !== null) {
            $overallNum += $categoryScores[$cat] * $w;
            $overallDen += $w;
        }
    }
    $overall = $overallDen > 0 ? $overallNum / $overallDen : null; // category scores are already 0-100

    // SEO score: same categories minus readability, renormalized to its own 85%-of-100 slice.
    $seoNum = 0.0;
    $seoDen = 0.0;
    foreach ($weights as $cat => $w) {
        if ($cat === 'readability') {
            continue;
        }
        if ($categoryScores[$cat] !== null) {
            $seoNum += $categoryScores[$cat] * $w;
            $seoDen += $w;
        }
    }
    $seoScore = $seoDen > 0 ? $seoNum / $seoDen : null;
    $readabilityScore = $categoryScores['readability'];

    // Critical-issue caps (SEO + Overall only, never Readability).
    $capReason = null;
    $profile = seo_rules()['page_type_profiles'][$in['pageType']] ?? [];
    $defaultIndexable = $profile['default_indexable'] ?? true;
    if ($defaultIndexable && !$in['robotsIndex']) {
        $capReason = 'unintentional_noindex';
    } elseif ($in['h1'] === '' && $in['title'] === '') {
        $capReason = 'missing_title_and_h1';
    } else {
        $technicalChecks = $byCategory['technical'];
        foreach ($technicalChecks as $c) {
            if ($c['id'] === 'technical.canonical_matches_page' && $c['outcome'] === 'failed') {
                $capReason = 'canonical_mismatch';
                break;
            }
        }
    }
    if ($capReason) {
        $cap = seo_rules()['caps'][$capReason];
        if ($seoScore !== null) {
            $seoScore = min($seoScore, $cap);
        }
        if ($overall !== null) {
            $overall = min($overall, $cap);
        }
    }

    $allChecks = [];
    foreach ($byCategory as $cat => $checks) {
        foreach ($checks as $c) {
            $c['category'] = $cat;
            $allChecks[] = $c;
        }
    }

    return [
        'contentType' => $in['contentType'],
        'contentId' => $in['contentId'],
        'seoScore' => $seoScore === null ? null : (int) round($seoScore),
        'readabilityScore' => $readabilityScore === null ? null : (int) round($readabilityScore),
        'overallScore' => $overall === null ? null : (int) round($overall),
        'scoreStatus' => seo_status_for_score($overall),
        'categoryScores' => array_map(fn($s) => $s === null ? null : (int) round($s), $categoryScores),
        'checks' => $allChecks,
        'capReason' => $capReason,
        'engineVersion' => seo_engine_version(),
        'contentHash' => seo_content_hash($in),
        'pageType' => $in['pageType'],
        'language' => $in['language'],
    ];
}

/** sha256 of only the fields analysis actually reads — see spec §9. Changing formatting-only
 *  aspects of stored content (e.g. re-saving unchanged blocks_json) never changes this hash. */
function seo_content_hash(array $in): string
{
    $parts = [
        $in['title'], $in['description'], $in['canonical'], $in['robotsIndex'] ? '1' : '0', $in['robotsFollow'] ? '1' : '0',
        $in['h1'], $in['bodyText'], $in['primaryKeyphrase'], implode(',', $in['relatedKeyphrases']),
        implode('|', array_map(fn($i) => $i['alt'] . ':' . $i['src'], $in['images'])),
        implode('|', array_map(fn($l) => $l['href'], $in['links'])),
    ];
    return hash('sha256', implode("\x1f", $parts));
}
