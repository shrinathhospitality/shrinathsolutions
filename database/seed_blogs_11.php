<?php
// CLI-only. Idempotent: imports the 11 real SEO blog articles from
// database/data/blogs_11.json into blog_posts (categories created on demand via
// find_or_create_blog_category), following the same pattern as the seo_pages seed scripts —
// h1 rendered separately by the page component, so it's excluded from the stored HTML body.
// Safe to re-run — skips any slug that already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/Blog.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

$posts = json_decode(file_get_contents(__DIR__ . '/data/blogs_11.json'), true);

foreach ($posts as $p) {
    $slug = $p['slug'];
    if (blog_slug_taken($pdo, $slug, null)) {
        echo "Skipping $slug — already exists.\n";
        continue;
    }

    $pdo->beginTransaction();
    try {
        $id = create_blog_post($pdo, [
            'title' => $p['title'],
            'slug' => $slug,
            'excerpt' => $p['excerpt'] ?? null,
            'content' => trim($p['contentHtml']),
            'featured_image' => null,
            'author_name' => 'Shrinath Solutions Team',
            'category' => $p['category'] ?? null,
            'reading_time_minutes' => $p['readingTimeMinutes'] ?? null,
            'status' => $p['status'] ?? 'published',
            'published_at' => $p['publishedAt'] ?? null,
        ], $adminId);

        $seoError = save_seo_meta($pdo, 'blog_post', $id, [
            'meta_title' => $p['metaTitle'] ?? null,
            'meta_description' => $p['metaDescription'] ?? null,
            'robots_index' => true,
            'robots_follow' => true,
        ]);
        if ($seoError) {
            throw new RuntimeException($seoError);
        }

        if (!empty($p['faqs'])) {
            save_faqs($pdo, 'blog_post', $id, $p['faqs']);
        }

        $pdo->commit();
        echo "Created blog_posts id=$id at slug=$slug\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed on $slug: " . $e->getMessage() . "\n");
    }
}
