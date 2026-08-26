<?php
// CLI-only. Idempotent: imports the 22 "SEO Company in {City}" landing pages from
// database/data/seo_services_by_city_22.json into seo_pages, following the same pattern as
// seed_seo_pages_india_16.php and seed_seo_pages_batch1.php — one 'html' content_sections
// block per page, h1 and the FAQ section excluded from that HTML since the page component
// renders page.h1 and the faqs list separately. Target location is the page's city, taken
// directly from the source data. Safe to re-run — skips any slug that already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/SeoPage.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

$pages = json_decode(file_get_contents(__DIR__ . '/data/seo_services_by_city_22.json'), true);

foreach ($pages as $p) {
    $slug = $p['slug'];
    if (seo_page_slug_taken($pdo, $slug, null)) {
        echo "Skipping $slug — already exists.\n";
        continue;
    }

    $pdo->beginTransaction();
    try {
        $id = create_seo_page($pdo, [
            'title' => $p['title'],
            'slug' => $slug,
            'primary_keyword' => $p['primaryKeyword'] ?? null,
            'secondary_keywords' => !empty($p['secondaryKeyword']) ? [$p['secondaryKeyword']] : [],
            'target_location' => $p['city'] ?? null,
            'h1' => $p['title'],
            'hero_content' => $p['excerpt'] ?? null,
            'content_sections' => [
                ['kind' => 'html', 'heading' => '', 'body' => trim($p['contentHtml']), 'items' => []],
            ],
            'cta_heading' => $p['ctaHeading'] ?? null,
            'cta_body' => $p['ctaBody'] ?? null,
            'status' => $p['status'] ?? 'draft',
        ], $adminId);

        $seoError = save_seo_meta($pdo, 'seo_page', $id, [
            'meta_title' => $p['metaTitle'] ?? null,
            'meta_description' => $p['metaDescription'] ?? null,
            'canonical_url' => $p['canonicalUrl'] ?? null,
            'robots_index' => true,
            'robots_follow' => true,
        ]);
        if ($seoError) {
            throw new RuntimeException($seoError);
        }

        if (!empty($p['faqs'])) {
            save_faqs($pdo, 'seo_page', $id, $p['faqs']);
        }

        $pdo->commit();
        echo "Created seo_pages id=$id at slug=$slug\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed on $slug: " . $e->getMessage() . "\n");
    }
}
