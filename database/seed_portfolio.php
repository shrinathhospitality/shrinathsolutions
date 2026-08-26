<?php
// CLI-only. Idempotent: migrates the 6 existing portfolio entries (src/data/portfolio.ts) and
// the 6 category filters into portfolio_projects / portfolio_categories. Every project on the
// live site today links to the same single generic /case-studies template (CaseStudy.tsx) —
// that identical generic detailed content is copied verbatim into each project's
// `detailed_description` here, exactly matching what's live now, as a starting point for
// per-project editing via the admin.
//
// Safe to re-run: skips any project/category whose slug already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/Portfolio.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

function slug_from_name(string $name): string
{
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    return trim($slug, '-');
}

$categories = ['Hotels', 'Desert Camps', 'Travel', 'Taxi', 'Local Business', 'E-commerce'];
$categoryCount = (int) $pdo->query('SELECT COUNT(*) FROM portfolio_categories')->fetchColumn();
if ($categoryCount === 0) {
    $stmt = $pdo->prepare('INSERT INTO portfolio_categories (name, slug, display_order, created_at, updated_at) VALUES (:name, :slug, :order, NOW(), NOW())');
    foreach ($categories as $i => $c) {
        $stmt->execute(['name' => $c, 'slug' => slug_from_name($c), 'order' => $i]);
    }
    echo 'Seeded ' . count($categories) . " portfolio categories.\n";
} else {
    echo "portfolio_categories already has rows, skipped.\n";
}

$genericDetail = '<h2>Client overview</h2>'
    . '<p>Placeholder: property type, room count, location and the channels they relied on before the project.</p>'
    . '<p>Placeholder: who we worked with on the client side and over what period.</p>'
    . '<h2>The challenge</h2>'
    . '<p>Placeholder: the measurable problem — for example a slow mobile site, no direct booking path, or heavy OTA dependence.</p>'
    . '<h2>Strategy</h2>'
    . '<ol>'
    . '<li><strong>Audit</strong> — What we measured first and what it told us.</li>'
    . '<li><strong>Priorities</strong> — What we fixed before anything else, and why.</li>'
    . '<li><strong>Build</strong> — What was designed and developed.</li>'
    . '<li><strong>Growth</strong> — What continued after launch.</li>'
    . '</ol>'
    . '<h2>Website work</h2>'
    . '<p>Placeholder: pages built, booking flow changes, performance improvements.</p>'
    . '<h2>SEO work</h2>'
    . '<p>Placeholder: technical fixes, pages published, local profile work and the terms targeted.</p>'
    . '<h2>Marketing work</h2>'
    . '<p>Placeholder: campaigns run, budget, targeting and creative approach.</p>'
    . '<h2>Client testimonial</h2>'
    . '<p>Placeholder quote from the client, with name, role and property.</p>';

$genericResults = [
    ['title' => 'Organic traffic', 'body' => 'Add verified figure and period.'],
    ['title' => 'Direct bookings', 'body' => 'Add verified figure and period.'],
    ['title' => 'Enquiries', 'body' => 'Add verified figure and period.'],
];

$projects = [
    ['name' => 'Heritage hotel, Jaisalmer', 'category' => 'Hotels', 'summary' => 'Website rebuild with booking engine integration and room-level pages.'],
    ['name' => 'Desert camp, Sam Dunes', 'category' => 'Desert Camps', 'summary' => 'Seasonal campaign site with enquiry funnel and package pages.'],
    ['name' => 'Tour operator, Rajasthan', 'category' => 'Travel', 'summary' => 'Itinerary and package structure built for destination search terms.'],
    ['name' => 'Taxi and transfer service', 'category' => 'Taxi', 'summary' => 'Route pages, local SEO and call tracking for airport transfers.'],
    ['name' => 'Restaurant, Jaisalmer fort area', 'category' => 'Local Business', 'summary' => 'Menu, reservations and Google Business Profile work.'],
    ['name' => 'Handicraft store', 'category' => 'E-commerce', 'summary' => 'Catalogue, checkout and product-level SEO for a local retailer.'],
];

foreach ($projects as $i => $p) {
    $slug = slug_from_name($p['name']);
    if (portfolio_slug_taken($pdo, $slug, null)) {
        echo "Skipping {$slug} — already exists.\n";
        continue;
    }

    $pdo->beginTransaction();
    try {
        $id = create_portfolio_project($pdo, [
            'title' => $p['name'], 'slug' => $slug, 'category' => $p['category'], 'short_description' => $p['summary'],
            'detailed_description' => $genericDetail, 'results' => $genericResults, 'display_order' => $i,
            'status' => 'published', 'cta_heading' => 'Want this kind of write-up for your property?',
        ], $adminId);

        save_seo_meta($pdo, 'portfolio_project', $id, [
            'meta_title' => $p['name'] . ' — Shrinath Solutions Portfolio',
            'meta_description' => $p['summary'],
            'canonical_url' => 'https://shrinathsolutions.com/portfolio/' . $slug,
        ]);

        $pdo->commit();
        echo "Seeded portfolio project: {$slug} (id $id)\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed to seed {$slug}: " . $e->getMessage() . "\n");
    }
}
