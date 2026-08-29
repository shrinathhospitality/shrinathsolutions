<?php
// Recovery for seo_documents stuck in 'building' because a build process terminated
// unexpectedly (crash, kill, host OOM) without ever reaching current/failed — see
// docs/SEO_STUDIO_ARCHITECTURE.md Part 4 "Recovery". Requires explicit admin/CLI action; never
// runs automatically, never marks anything 'current'. Idempotent — safe to run repeatedly.
//
// Usage: php scripts/recover-abandoned-prerender-builds.php [timeoutMinutes=60]

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

$timeoutMinutes = isset($argv[1]) ? max(1, (int) $argv[1]) : 60;

$pdo = get_db_connection();
$recovered = seo_recover_abandoned_building_documents($pdo, $timeoutMinutes);

if (!$recovered) {
    echo "No documents abandoned in 'building' past {$timeoutMinutes} minute(s).\n";
    exit(0);
}

echo "Recovered " . count($recovered) . " document(s) stuck 'building' past {$timeoutMinutes} minute(s) — marked failed:\n";
foreach ($recovered as $route) {
    echo "  $route\n";
}
