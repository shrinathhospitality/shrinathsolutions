<?php
// Focused regression test for the database/migrate.php glob-ordering bug fixed in the "Final
// Gap Closure" phase (see docs/SEO_STUDIO_ARCHITECTURE.md Part 4 §33): glob('*.sql') also
// matches '*.down.sql', and '.down.sql' sorts alphabetically *before* the matching forward
// file's plain '.sql' — before the fix, a fresh install would attempt a down-migration before
// its own forward migration ever ran. This test needs no database connection: it exercises
// exactly the file-selection logic migrate.php runs, against the real migrations directory.
//
// Usage: php scripts/test-migrate-glob.php

declare(strict_types=1);

$dir = __DIR__ . '/../database/migrations';

// Mirrors database/migrate.php's actual filtering line exactly — if that line changes without
// this test being updated, the assertions below would drift from the real behavior being
// tested, so keep them in sync deliberately (not by re-`require`-ing migrate.php, which isn't
// designed to be included as a library — it's a CLI entrypoint that connects to a database on
// require).
$files = array_values(array_filter(glob($dir . '/*.sql'), fn($f) => !str_ends_with($f, '.down.sql')));
sort($files);
$names = array_map('basename', $files);

$failures = [];

// 1. No .down.sql file anywhere in the forward list.
foreach ($names as $n) {
    if (str_ends_with($n, '.down.sql')) {
        $failures[] = "down-migration file present in forward list: $n";
    }
}

// 2. The known .down.sql files exist on disk (so this test is actually exercising the bug
//    condition, not passing vacuously because no down files exist).
$expectedDownFiles = ['0015_seo_studio.down.sql', '0016_seo_documents.down.sql', '0017_prerender_lifecycle.down.sql'];
foreach ($expectedDownFiles as $f) {
    if (!is_file($dir . '/' . $f)) {
        $failures[] = "expected fixture missing: $f (test cannot verify the exclusion without it)";
    }
}

// 3. Deterministic order, and every one of 0015/0016/0017's forward files present in that
//    exact relative order (the real sequence this project's clean-install test depends on).
$requiredOrder = ['0015_seo_studio.sql', '0016_seo_documents.sql', '0017_prerender_lifecycle.sql'];
$positions = [];
foreach ($requiredOrder as $r) {
    $pos = array_search($r, $names, true);
    if ($pos === false) {
        $failures[] = "required forward migration missing from list: $r";
    }
    $positions[] = $pos;
}
for ($i = 1; $i < count($positions); $i++) {
    if ($positions[$i] === false || $positions[$i - 1] === false) continue;
    if ($positions[$i] < $positions[$i - 1]) {
        $failures[] = "forward order violated: {$requiredOrder[$i]} sorts before {$requiredOrder[$i - 1]}";
    }
}

// 4. Running the filter twice is stable (idempotent selection, not order-randomized).
$files2 = array_values(array_filter(glob($dir . '/*.sql'), fn($f) => !str_ends_with($f, '.down.sql')));
sort($files2);
if (array_map('basename', $files2) !== $names) {
    $failures[] = 'glob+filter result is not stable across repeated runs';
}

if ($failures) {
    fwrite(STDERR, "FAIL\n");
    foreach ($failures as $f) {
        fwrite(STDERR, "  - $f\n");
    }
    exit(1);
}

echo "PASS — " . count($names) . " forward migration(s) selected, 0 down-migrations included, required order intact:\n";
foreach ($names as $n) {
    echo "  $n\n";
}
