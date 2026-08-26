<?php
// CLI-only. Idempotent: appends the "At a Glance", "Client Results" and "Case Study" stat
// sections to the existing seo-company-jaisalmer page's content_sections so the numbers and
// testimonial that were previously hardcoded in the React page become admin-editable.
// Safe to re-run — skips any section whose heading is already present.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/SeoPage.php';

$pdo = get_db_connection();
$slug = 'seo-company-jaisalmer';

$page = find_seo_page_by_slug($pdo, $slug, false);
if (!$page) {
    fwrite(STDERR, "Page not found: $slug\n");
    exit(1);
}

$sections = $page['content_sections'];
$headings = array_column($sections, 'heading');

$toAdd = [
    [
        'kind' => 'kv',
        'heading' => 'At a Glance',
        'items' => [
            ['value' => '98%', 'label' => 'Client Retention'],
            ['value' => '120+', 'label' => 'Successful Projects'],
            ['value' => '250K+', 'label' => 'Organic Visits Generated'],
            ['value' => '35+', 'label' => 'Industries Served'],
        ],
    ],
    [
        'kind' => 'kv',
        'heading' => 'Client Results',
        'items' => [
            ['value' => '150%', 'label' => 'Avg Organic Traffic Increase'],
            ['value' => '85%', 'label' => 'Top 3 Keyword Rankings'],
            ['value' => '4.9/5', 'label' => 'Client Satisfaction'],
            ['value' => '120+', 'label' => 'Projects Completed'],
        ],
    ],
    [
        'kind' => 'testimonial',
        'heading' => 'Case Study',
        'body' => 'Shrinath transformed our online presence. Our rankings improved and bookings increased significantly.',
        'meta' => ['company' => 'Desert Heritage Resort', 'name' => 'Rahul Singh', 'role' => 'Owner, Desert Heritage Resort'],
        'items' => [
            ['value' => '+172%', 'label' => 'Organic Traffic'],
            ['value' => '+126%', 'label' => 'Direct Bookings'],
            ['value' => '+68', 'label' => 'Keywords in Top 3'],
        ],
    ],
];

$added = [];
foreach ($toAdd as $section) {
    if (in_array($section['heading'], $headings, true)) {
        continue;
    }
    $sections[] = $section;
    $added[] = $section['heading'];
}

if (!$added) {
    echo "Nothing to add — sections already present.\n";
    exit(0);
}

$stmt = $pdo->prepare('UPDATE seo_pages SET content_sections_json = :json, updated_at = NOW() WHERE id = :id');
$stmt->execute(['json' => json_encode(sanitize_json_strings($sections)), 'id' => $page['id']]);

echo 'Added: ' . implode(', ', $added) . "\n";
