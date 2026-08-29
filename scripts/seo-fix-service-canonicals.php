<?php
// Repairs a data bug from the master-import dataset: every `service` record's canonicalUrl was
// authored as https://shrinathsolutions.com/{slug} (matching its routePath), but the site's real
// service pages live at /services/{slug} (see seo_public_url() in api/lib/seo/input.php). The
// importer faithfully wrote that mismatched value — it was correct behavior given wrong input.
// The mismatch trips the engine's `canonical_mismatch` cap, capping every affected service's
// SEO/Overall score to a fixed low value regardless of content or keyphrase quality.
//
// This script only rewrites seo_meta.canonical_url for `service` rows whose current canonical is
// exactly "https://shrinathsolutions.com/{slug}" (the buggy single-segment form) to the correct
// "https://shrinathsolutions.com/services/{slug}", preserving every other seo_meta field
// untouched, then re-runs the real, unmodified scorer and persists the corrected score.
//
// Usage:
//   php scripts/seo-fix-service-canonicals.php --dry-run
//   php scripts/seo-fix-service-canonicals.php --apply --confirmed-backup

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit(1);
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';
require __DIR__ . '/../api/models/Service.php';
require __DIR__ . '/../api/lib/seo/rules.php';
require __DIR__ . '/../api/lib/seo/keyphrase.php';
require __DIR__ . '/../api/lib/seo/extract.php';
require __DIR__ . '/../api/lib/seo/input.php';
require __DIR__ . '/../api/lib/seo/checks.php';
require __DIR__ . '/../api/lib/seo/scorer.php';
require __DIR__ . '/../api/lib/seo/link_index.php';
require __DIR__ . '/../api/lib/seo/documents.php';
require __DIR__ . '/../api/lib/seo/analyze.php';

$opts = getopt('', ['dry-run', 'apply', 'confirmed-backup']);
$apply = isset($opts['apply']);
if ($apply && !isset($opts['confirmed-backup'])) {
    fwrite(STDERR, "ERROR: --apply requires --confirmed-backup. Refusing to run.\n");
    exit(1);
}

$pdo = get_db_connection();

$rows = $pdo->query(
    "SELECT m.id AS meta_id, m.entity_id, m.canonical_url, s.slug
     FROM seo_meta m
     JOIN services s ON s.id = m.entity_id
     WHERE m.entity_type = 'service'
       AND m.canonical_url REGEXP '^https://shrinathsolutions\\\\.com/[^/]+$'"
)->fetchAll();

$fixed = 0;
$errors = 0;
foreach ($rows as $row) {
    $correct = 'https://shrinathsolutions.com/services/' . $row['slug'];
    if ($row['canonical_url'] === $correct) {
        continue; // already correct (single-segment slug happens to equal "services"? never, but safe)
    }

    $before = null;
    try {
        $before = seo_analyze($pdo, 'service', (int) $row['entity_id']);
    } catch (Throwable $e) {
        // fall through — still fix the canonical even if scoring the "before" state fails
    }

    fwrite(STDERR, sprintf(
        "%s /services/%s : %s -> %s%s\n",
        $apply ? 'FIX' : 'WOULD FIX',
        $row['slug'],
        $row['canonical_url'],
        $correct,
        $before ? " (seo {$before['seoScore']} -> ...)" : ''
    ));

    if (!$apply) {
        $fixed++;
        continue;
    }

    $pdo->beginTransaction();
    try {
        $current = get_seo_meta($pdo, 'service', (int) $row['entity_id']);
        $data = $current ?? [];
        $data['canonical_url'] = $correct;
        $err = save_seo_meta($pdo, 'service', (int) $row['entity_id'], $data);
        if ($err) {
            throw new RuntimeException($err);
        }

        // Recompute and persist the now-uncapped score with the engine, keeping whatever
        // keyphrase is already stored (this script changes canonical only, never keyphrases).
        $existingAnalysis = seo_find_analysis($pdo, 'service', (int) $row['entity_id']);
        $after = seo_analyze($pdo, 'service', (int) $row['entity_id']);
        if ($after) {
            seo_save_analysis($pdo, $after, null, [
                'primary_keyphrase' => $existingAnalysis['primary_keyphrase'] ?? '',
                'related_keyphrases' => $existingAnalysis['related_keyphrases'] ?? [],
                'language' => $existingAnalysis['language'] ?? 'en',
                'is_cornerstone' => $existingAnalysis['is_cornerstone'] ?? false,
            ]);
            fwrite(STDERR, "  -> new score: seo={$after['seoScore']} overall={$after['overallScore']}\n");
        }
        $pdo->commit();
        $fixed++;
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "  ERROR, rolled back: " . $e->getMessage() . "\n");
        $errors++;
    }
}

fwrite(STDERR, sprintf("\n%s complete. %d canonical(s) %s, %d error(s).\n", $apply ? 'APPLY' : 'DRY RUN', $fixed, $apply ? 'fixed' : 'would be fixed', $errors));
