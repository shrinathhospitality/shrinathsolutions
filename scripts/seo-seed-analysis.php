<?php
// Seeds seo_content_analysis (the table the 49-check scoring engine actually reads keyphrases
// from) using the primaryKeyphrase/relatedKeyphrases already written into the CMS by
// scripts/import-seo-master.php. That importer deliberately never touches the scoring engine —
// this script is the separate, explicit step that does, and it does so by calling the real,
// unmodified engine (seo_analyze() / seo_save_analysis()) exactly as the admin Save button does.
// It writes no content, no metadata — only primary_keyphrase/related_keyphrases/language and the
// score the real engine computes from what's already live.
//
// Usage:
//   php scripts/seo-seed-analysis.php --dry-run [--file=...]
//   php scripts/seo-seed-analysis.php --apply --confirmed-backup [--file=...]
//
// Safe to re-run: seo_save_analysis() is an upsert keyed on (content_type, content_id).

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

$opts = getopt('', ['dry-run', 'apply', 'confirmed-backup', 'file::']);
$apply = isset($opts['apply']);
if ($apply && !isset($opts['confirmed-backup'])) {
    fwrite(STDERR, "ERROR: --apply requires --confirmed-backup. Refusing to run.\n");
    exit(1);
}
$file = $opts['file'] ?? __DIR__ . '/../docs/shrinath-solutions-seo-studio-master-import.json';

$json = json_decode(file_get_contents($file), true);
if (!$json || !isset($json['records'])) {
    fwrite(STDERR, "ERROR: could not parse $file\n");
    exit(2);
}

const SEO_SEED_TYPE_MAP = ['seo_page' => 'seo_page', 'service' => 'service', 'blog' => 'blog_post'];

$pdo = get_db_connection();

$candidates = [];
foreach ($json['records'] as $rec) {
    $engineType = SEO_SEED_TYPE_MAP[$rec['contentType']] ?? null;
    if ($engineType === null) {
        continue; // static_page / venture — out of scope for this pass (see report notes)
    }
    if (empty($rec['primaryKeyphrase'])) {
        continue;
    }
    // Registry route_path carries a per-type URL prefix the master dataset's own routePath
    // field does not (e.g. services live at /services/{slug} in the registry but the dataset
    // records them as bare /{slug}) — apply the same prefixing the site itself uses.
    $registryRoute = $engineType === 'service' ? '/services' . $rec['routePath'] : $rec['routePath'];
    $doc = $pdo->prepare('SELECT id, content_id, is_published, is_indexable FROM seo_documents WHERE route_path = :r AND content_type = :t LIMIT 1');
    $doc->execute(['r' => $registryRoute, 't' => $engineType]);
    $docRow = $doc->fetch();
    if (!$docRow || !$docRow['content_id']) {
        $candidates[] = ['route' => $rec['routePath'], 'skip' => 'no matching seo_documents row with a real content_id'];
        continue;
    }
    $candidates[] = [
        'route' => $rec['routePath'],
        'contentType' => $engineType,
        'contentId' => (int) $docRow['content_id'],
        'isIndexable' => (bool) $docRow['is_indexable'],
        'isPublished' => (bool) $docRow['is_published'],
        'primaryKeyphrase' => (string) $rec['primaryKeyphrase'],
        'relatedKeyphrases' => array_slice(array_values($rec['relatedKeyphrases'] ?? []), 0, 5),
    ];
}

// Cannibalization check across this batch (spec 3.5) — the master dataset was already reviewed
// for this, but verify against live data rather than assume.
$byKeyphrase = [];
foreach ($candidates as $c) {
    if (isset($c['skip'])) {
        continue;
    }
    $norm = seo_normalize_text($c['primaryKeyphrase']);
    $byKeyphrase[$norm][] = $c['route'];
}
$cannibalized = array_filter($byKeyphrase, fn($routes) => count($routes) > 1);

// Also check against the one real CMS-owned page intentionally excluded from the master
// dataset (/seo-company-jaisalmer) so we never silently duplicate its keyphrase either.
$excludedRow = $pdo->query("SELECT primary_keyword FROM seo_pages WHERE slug = 'seo-company-jaisalmer'")->fetch();
$excludedKeyphrase = $excludedRow ? seo_normalize_text((string) $excludedRow['primary_keyword']) : null;

$results = [];
$batchesFailed = 0;
$batch = [];
$applied = 0;
$skippedCannibal = 0;
$errors = 0;

foreach ($candidates as $c) {
    if (isset($c['skip'])) {
        $results[] = $c + ['classification' => 'SKIP'];
        continue;
    }
    $norm = seo_normalize_text($c['primaryKeyphrase']);
    if (isset($cannibalized[$norm]) || $norm === $excludedKeyphrase) {
        $results[] = $c + [
            'classification' => 'CONFLICT',
            'reason' => 'Keyphrase "' . $c['primaryKeyphrase'] . '" collides with: ' . implode(', ', $cannibalized[$norm] ?? ['/seo-company-jaisalmer (excluded, real CMS ownership)']),
        ];
        $skippedCannibal++;
        continue;
    }

    try {
        $before = seo_analyze($pdo, $c['contentType'], $c['contentId']);
    } catch (Throwable $e) {
        $results[] = $c + ['classification' => 'CONFLICT', 'reason' => 'seo_analyze() failed: ' . $e->getMessage()];
        $errors++;
        continue;
    }
    if (!$before) {
        $results[] = $c + ['classification' => 'CONFLICT', 'reason' => 'content row not found for this contentId'];
        $errors++;
        continue;
    }

    $row = seo_load_content_row($pdo, $c['contentType'], $c['contentId']);
    $seoMeta = get_seo_meta($pdo, seo_meta_entity_type_for($c['contentType']), $c['contentId']);
    $existingAnalysis = seo_find_analysis($pdo, $c['contentType'], $c['contentId']);
    $keyphraseInput = [
        'primary_keyphrase' => $c['primaryKeyphrase'],
        'related_keyphrases' => $c['relatedKeyphrases'],
        'language' => $existingAnalysis['language'] ?? 'en',
        'is_cornerstone' => $existingAnalysis['is_cornerstone'] ?? false,
    ];
    $proposedMeta = array_merge($existingAnalysis ?? [], $keyphraseInput);
    $input = seo_build_input($c['contentType'], $row, $seoMeta, $proposedMeta);
    $incomingCount = seo_count_incoming_links($pdo, $c['contentType'], $c['contentId']);
    $hasFaq = count(get_faqs($pdo, $c['contentType'], $c['contentId'])) > 0;
    $after = seo_run_analysis($pdo, $input, $incomingCount, $hasFaq);

    $entry = $c + [
        'classification' => 'SAFE_FILL_MISSING',
        'before' => ['seo' => $before['seoScore'], 'read' => $before['readabilityScore'], 'overall' => $before['overallScore']],
        'after' => ['seo' => $after['seoScore'], 'read' => $after['readabilityScore'], 'overall' => $after['overallScore']],
    ];
    $results[] = $entry;

    if ($apply) {
        $batch[] = ['result' => $after, 'keyphraseInput' => $keyphraseInput, 'route' => $c['route']];
        if (count($batch) >= 20) {
            [$ok, $fail] = seo_seed_apply_batch($pdo, $batch);
            $applied += $ok;
            $errors += $fail;
            $batch = [];
        }
    }
}
if ($apply && $batch) {
    [$ok, $fail] = seo_seed_apply_batch($pdo, $batch);
    $applied += $ok;
    $errors += $fail;
}

function seo_seed_apply_batch(PDO $pdo, array $batch): array
{
    $ok = 0;
    $fail = 0;
    $pdo->beginTransaction();
    try {
        foreach ($batch as $item) {
            seo_save_analysis($pdo, $item['result'], null, $item['keyphraseInput']);
            $ok++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "BATCH FAILED, rolled back: " . $e->getMessage() . "\n");
        $fail = count($batch);
        $ok = 0;
    }
    return [$ok, $fail];
}

$outDir = __DIR__ . '/../docs';
$byClass = [];
foreach ($results as $r) {
    $byClass[$r['classification']] = ($byClass[$r['classification']] ?? 0) + 1;
}

$md = "# SEO Keyphrase/Analysis Seeding — " . ($apply ? "APPLY run" : "Dry run") . "\n\n";
$md .= "Generated: " . date('c') . "\n\n";
$md .= "Source: `$file`. Every score is computed by the real, unmodified engine (`seo_run_analysis`).\n\n";
$md .= "## Totals\n\n| Classification | Count |\n|---|---|\n";
foreach ($byClass as $k => $v) {
    $md .= "| $k | $v |\n";
}
if ($apply) {
    $md .= "\nApplied (written to seo_content_analysis): **$applied**. Errors: **$errors**.\n";
}
$md .= "\n## Cannibalization conflicts (not applied — need manual review)\n\n";
$md .= "| Route | Keyphrase | Collides with |\n|---|---|---|\n";
foreach ($results as $r) {
    if ($r['classification'] === 'CONFLICT' && isset($r['reason']) && str_starts_with($r['reason'], 'Keyphrase')) {
        $md .= "| {$r['route']} | {$r['primaryKeyphrase']} | " . $r['reason'] . " |\n";
    }
}
$md .= "\n## Per-document detail\n\n| Route | Type | Before SEO/Read/Overall | After SEO/Read/Overall | Classification |\n|---|---|---|---|---|\n";
foreach ($results as $r) {
    $before = isset($r['before']) ? "{$r['before']['seo']}/{$r['before']['read']}/{$r['before']['overall']}" : '-';
    $after = isset($r['after']) ? "{$r['after']['seo']}/{$r['after']['read']}/{$r['after']['overall']}" : '-';
    $md .= "| {$r['route']} | " . ($r['contentType'] ?? '-') . " | $before | $after | {$r['classification']} |\n";
}
file_put_contents($outDir . '/SEO_ANALYSIS_SEED_REPORT.md', $md);
file_put_contents($outDir . '/seo-analysis-seed-result.json', json_encode(['generatedAt' => date('c'), 'apply' => $apply, 'totals' => $byClass, 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

fwrite(STDERR, ($apply ? "APPLY" : "DRY RUN") . " complete. Candidates: " . count($candidates) . ". By classification: " . json_encode($byClass) . "\n");
if ($apply) {
    fwrite(STDERR, "Applied: $applied, errors: $errors\n");
}
fwrite(STDERR, "Reports: docs/SEO_ANALYSIS_SEED_REPORT.md, docs/seo-analysis-seed-result.json\n");
