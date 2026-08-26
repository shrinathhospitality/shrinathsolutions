<?php
// CLI-only. Idempotent: creates the seo_pages record backing the /seo-audit-tool page's
// static copy (H1, intro, CTA panel) so it becomes admin-editable. Safe to re-run — skips
// if the slug already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/SeoPage.php';
require __DIR__ . '/../api/models/SeoMeta.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

$slug = 'seo-audit-tool';

if (seo_page_slug_taken($pdo, $slug, null)) {
    echo "Skipping $slug — already exists.\n";
    exit(0);
}

$pdo->beginTransaction();
try {
    $id = create_seo_page($pdo, [
        'title' => 'Free SEO Audit Tool',
        'slug' => $slug,
        'primary_keyword' => 'free SEO audit tool',
        'search_intent' => 'Tool / informational',
        'h1' => 'Free SEO Audit Tool',
        'hero_content' => 'Enter any website URL to get an instant SEO score across technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility — with a prioritised list of what to fix first.',
        'cta_heading' => 'Want help fixing these?',
        'cta_body' => 'Our SEO team can turn this report into a prioritised action plan for your business.',
        'status' => 'published',
    ], $adminId);

    $seoError = save_seo_meta($pdo, 'seo_page', $id, [
        'meta_title' => 'Free SEO Audit Tool | Shrinath Solutions',
        'meta_description' => 'Run a free, instant SEO audit on any website. Check technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility in seconds.',
        'robots_index' => true,
        'robots_follow' => true,
    ]);
    if ($seoError) {
        throw new RuntimeException($seoError);
    }

    $pdo->commit();
    echo "Created seo_pages id=$id at slug=$slug\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Failed: ' . $e->getMessage() . "\n");
    exit(1);
}
