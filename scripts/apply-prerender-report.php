<?php
// Closes the prerender lifecycle loop (SEO_STUDIO_ARCHITECTURE.md Part 3 §7): run this
// AFTER a real `npm run build:prerender` has completed and the built dist/ has been deployed
// — never automatically from the Node build itself (no database credentials are ever given to
// the build environment; this script runs server-side, where api/config/config.php already
// exists).
//
// Usage: php scripts/apply-prerender-report.php [path/to/prerender-report.json]
// Defaults to prerender-report.json in the project root (scripts/prerender.mjs's output).

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/seo/rules.php';
require __DIR__ . '/../api/lib/seo/keyphrase.php';
require __DIR__ . '/../api/lib/seo/extract.php';
require __DIR__ . '/../api/lib/route_manifest.php';
require __DIR__ . '/../api/lib/seo/input.php';
require __DIR__ . '/../api/lib/seo/checks.php';
require __DIR__ . '/../api/lib/seo/scorer.php';
require __DIR__ . '/../api/lib/seo/link_index.php';
require __DIR__ . '/../api/lib/seo/dashboard.php';
require __DIR__ . '/../api/lib/seo/documents.php';
require __DIR__ . '/../api/lib/seo/analyze.php';

$reportPath = $argv[1] ?? (__DIR__ . '/../prerender-report.json');
if (!is_file($reportPath)) {
    fwrite(STDERR, "Report file not found: $reportPath\n");
    fwrite(STDERR, "Run \"npm run build:prerender\" first — it writes this file automatically.\n");
    exit(1);
}

$report = json_decode((string) file_get_contents($reportPath), true);
if (!is_array($report) || !isset($report['prerendered']) || !is_array($report['prerendered'])) {
    fwrite(STDERR, "Malformed report file: $reportPath\n");
    exit(1);
}

$FAILURE_REASON_LABELS = [
    'render_error' => 'Route returned an error during prerendering',
    'render_exception' => 'Prerendering threw an exception for this route',
];

$pdo = get_db_connection();

$prerenderedRoutes = array_map('strval', $report['prerendered']);
$failedRequired = $report['failedRequired'] ?? [];
$skippedError = $report['skippedError'] ?? [];
$buildId = (string) ($report['buildId'] ?? ('build-' . ($report['generatedAt'] ?? 'unknown')));

// 'building' brackets this evaluation pass (see seo_begin_prerender_build's doc comment for why
// there's no earlier, independently-timed "build started" signal) — every route this build
// attempt touched, successful or not, is included so nothing is left showing a stale prior
// status while this script decides its real outcome below.
$allRoutes = array_merge(
    $prerenderedRoutes,
    array_map(fn($f) => (string) $f['path'], $failedRequired),
    array_map(fn($f) => (string) $f['path'], $skippedError),
);
$beganCount = seo_begin_prerender_build($pdo, $allRoutes, $buildId);
echo "Build $buildId: marked $beganCount document(s) building.\n\n";

$current = 0;
$stale = 0;
$noDocument = 0;
$contentMissing = 0;
$failed = 0;

foreach ($prerenderedRoutes as $route) {
    $result = seo_mark_document_current_if_matching($pdo, $route);
    switch ($result['result']) {
        case 'current':
            $current++;
            echo "CURRENT  {$result['route']}\n";
            break;
        case 'stale':
            $stale++;
            echo "STALE    {$result['route']}  ({$result['reason']})\n";
            break;
        case 'no_document':
            $noDocument++;
            echo "SKIP     {$result['route']}  (not in registry — run a registry sync first)\n";
            break;
        case 'content_missing':
            $contentMissing++;
            echo "SKIP     {$result['route']}  (underlying content no longer found)\n";
            break;
    }
}

foreach (array_merge($failedRequired, $skippedError) as $f) {
    $reason = $FAILURE_REASON_LABELS[$f['reason'] ?? ''] ?? 'Prerendering did not complete for this route';
    $result = seo_mark_document_failed($pdo, (string) $f['path'], $reason);
    if ($result['result'] === 'failed') {
        $failed++;
        echo "FAILED   {$result['route']}  ($reason)\n";
    }
}

echo "\n--- Summary ---\n";
echo "Marked current: $current\n";
echo "Still stale (changed since build started): $stale\n";
echo "Marked failed: $failed\n";
echo "Not in registry: $noDocument\n";
echo "Content missing: $contentMissing\n";
