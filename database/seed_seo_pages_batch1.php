<?php
// CLI-only. Idempotent: imports the client-supplied SEO landing pages in
// database/data/seo_pages_batch1.json into seo_pages. Each page's long-form article HTML is
// stored as a single 'html' content_sections block (rendered via RichContent on the public
// DynamicSeoPage catch-all route) rather than being split into paras/ticks/steps blocks, since
// it arrived as one flowing article rather than discrete structured content.
//
// The supplied HTML's own <h1> and "Frequently Asked Questions" section are stripped before
// storing: the page component renders page.h1 and the faqs list separately, so keeping them in
// the HTML body would duplicate both. Safe to re-run — skips any slug that already exists.

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

$pages = json_decode(file_get_contents(__DIR__ . '/data/seo_pages_batch1.json'), true);

function clean_body(string $html): string
{
    // Strip the leading <h1>...</h1> (duplicates page.h1, rendered separately).
    $html = preg_replace('#^\s*<h1>.*?</h1>\s*#is', '', $html, 1);
    // Strip any trailing "Frequently Asked Questions" section (faqs render separately).
    $html = preg_replace('#<h2>\s*Frequently Asked Questions\s*</h2>.*?(?=<h2>Start Growing)#is', '', $html);
    return trim($html);
}

function target_location_from_title(string $title): ?string
{
    if (stripos($title, 'jaisalmer') !== false) return 'Jaisalmer';
    if (stripos($title, 'rajasthan') !== false) return 'Rajasthan';
    return null;
}

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
            'target_location' => target_location_from_title($p['title']),
            'h1' => $p['title'],
            'hero_content' => $p['excerpt'] ?? null,
            'content_sections' => [
                ['kind' => 'html', 'heading' => '', 'body' => clean_body($p['contentHtml']), 'items' => []],
            ],
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
