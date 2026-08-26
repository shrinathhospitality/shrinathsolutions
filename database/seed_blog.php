<?php
// CLI-only. Idempotent: migrates the 6 existing blog list entries (src/data/blog.ts) into
// blog_posts. The current BlogDetail.tsx renders identical placeholder body copy for every
// post (there is no per-post article body on the live site today) — that same generic body
// is copied verbatim into each post's `content` here, exactly matching what's live now.
// It's a starting point meant to be replaced per-post via the admin's TipTap editor.
//
// Safe to re-run: skips any post whose slug already exists.

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

$genericContent = '<h2>Why this matters</h2>'
    . '<p>Placeholder body copy. Replace with the article opening — the argument, and who it is for.</p>'
    . '<p>Placeholder body copy. A second paragraph continuing the point with a concrete example from a property of similar size.</p>'
    . '<h2>The checks to run</h2>'
    . '<ol>'
    . '<li><strong>Rate parity</strong> — What guests see when they compare your site to an OTA.</li>'
    . '<li><strong>Booking engine</strong> — Whether a booking can be completed in under a minute on a phone.</li>'
    . '<li><strong>Hotel Ads</strong> — Whether your rates appear beside the OTAs at all.</li>'
    . '<li><strong>Profile</strong> — Whether your Google listing answers the questions guests ask.</li>'
    . '<li><strong>Follow-up</strong> — Whether enquiries get a reply the same day.</li>'
    . '</ol>'
    . '<h2>What to do first</h2>'
    . '<p>Placeholder body copy. Replace with the recommended first action and how to measure whether it worked.</p>';

$genericFaqs = [
    ['question' => 'Does this apply to desert camps?', 'answer' => 'Yes, with a shorter booking window and a heavier seasonal pattern.'],
    ['question' => 'How do I measure my current OTA share?', 'answer' => 'Compare confirmed bookings by source over the last twelve months, not by revenue alone.'],
];

function slug_from_title(string $title): string
{
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    return trim($slug, '-');
}

$posts = [
    ['tag' => 'Hotel marketing', 'title' => 'How Jaisalmer hotels can cut OTA commission without losing bookings', 'excerpt' => 'Rate parity, booking engine, Hotel Ads and the pages guests read before booking.', 'minutes' => 8],
    ['tag' => 'Local SEO', 'title' => 'Google Business Profile settings most Rajasthan businesses get wrong', 'excerpt' => 'Categories, services, photos and review replies — the fields that move local rankings.', 'minutes' => 6],
    ['tag' => 'Websites', 'title' => 'What a slow hotel website actually costs you', 'excerpt' => 'Load time, mobile layout and enquiry friction measured against booking behaviour.', 'minutes' => 5],
    ['tag' => 'Channel manager', 'title' => 'Overbooking is a sync problem, not a staffing problem', 'excerpt' => 'How centralised inventory removes the daily reconciliation scramble.', 'minutes' => 7],
    ['tag' => 'Google Ads', 'title' => 'Setting a cost-per-enquiry target before you spend a rupee', 'excerpt' => 'Working backwards from ADR and conversion rate to a sensible daily budget.', 'minutes' => 6],
    ['tag' => 'Content', 'title' => 'Destination pages that bring bookings, not just traffic', 'excerpt' => 'What to write about Jaisalmer when everyone has already written about Jaisalmer.', 'minutes' => 9],
];

foreach ($posts as $i => $p) {
    $slug = slug_from_title($p['title']);
    if (blog_slug_taken($pdo, $slug, null)) {
        echo "Skipping {$slug} — already exists.\n";
        continue;
    }

    $pdo->beginTransaction();
    try {
        $id = create_blog_post($pdo, [
            'title' => $p['title'], 'slug' => $slug, 'excerpt' => $p['excerpt'], 'content' => $genericContent,
            'author_name' => 'Shrinath Solutions', 'category' => $p['tag'], 'reading_time_minutes' => $p['minutes'],
            'status' => 'published', 'tags' => [$p['tag']],
        ], $adminId);

        save_seo_meta($pdo, 'blog_post', $id, [
            'meta_title' => $p['title'] . ' — Shrinath Solutions',
            'meta_description' => $p['excerpt'],
            'canonical_url' => 'https://shrinathsolutions.com/blog/' . $slug,
        ]);
        save_faqs($pdo, 'blog_post', $id, $genericFaqs);

        $pdo->commit();
        echo "Seeded blog post: {$slug} (id $id)\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed to seed {$slug}: " . $e->getMessage() . "\n");
    }
}
