<?php
// CLI-only. Idempotent: seeds the current hardcoded site.ts / megaMenu.ts content into
// site_settings, social_links, menus/menu_items, and footer_sections/footer_links —
// exactly mirroring what's on the live site today so switching Header/Footer to the
// database causes zero visual change. Safe to re-run; skips any table that already has rows.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';

$pdo = get_db_connection();

// --- site_settings ---
$settingsCount = (int) $pdo->query('SELECT COUNT(*) FROM site_settings')->fetchColumn();
if ($settingsCount === 0) {
    $settings = [
        'site_name'                    => 'Shrinath Solutions',
        'site_url'                     => 'https://shrinathsolutions.com',
        'phone'                        => '+91 94615 31536',
        'whatsapp_number'               => '919461531536',
        'email'                        => 'shrinathsolutions@gmail.com',
        'location'                     => 'Jaisalmer, Rajasthan, India',
        'copyright_text'               => '© 2026 Shrinath Solutions. All Rights Reserved.',
        'header_topbar_message'        => 'Grow your hotel or business with result-driven digital solutions.',
        'header_cta_text'              => 'Get Free Proposal',
        'header_cta_url'               => '/contact',
        'header_topbar_cta_text'       => 'Get Free Consultation',
        'header_topbar_cta_url'        => '/contact',
        'footer_about_text'            => 'Website development, digital marketing, SEO and hotel technology for hotels, camps and businesses in Jaisalmer and across Rajasthan.',
        'footer_newsletter_heading'    => 'Newsletter',
        'footer_newsletter_description' => 'Hotel marketing notes, once a month.',
    ];
    $stmt = $pdo->prepare('INSERT INTO site_settings (setting_key, setting_value, created_at, updated_at) VALUES (:k, :v, NOW(), NOW())');
    foreach ($settings as $key => $value) {
        $stmt->execute(['k' => $key, 'v' => $value]);
    }
    echo "Seeded " . count($settings) . " site_settings rows.\n";
} else {
    echo "site_settings already has rows, skipped.\n";
}

// --- social_links ---
$socialCount = (int) $pdo->query('SELECT COUNT(*) FROM social_links')->fetchColumn();
if ($socialCount === 0) {
    $socials = [
        ['platform' => 'Facebook', 'icon' => 'facebook', 'url' => '#'],
        ['platform' => 'Instagram', 'icon' => 'instagram', 'url' => '#'],
        ['platform' => 'LinkedIn', 'icon' => 'linkedin', 'url' => '#'],
        ['platform' => 'YouTube', 'icon' => 'youtube', 'url' => '#'],
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO social_links (platform, url, icon, display_order, is_visible, created_at, updated_at)
         VALUES (:platform, :url, :icon, :order, 1, NOW(), NOW())'
    );
    foreach ($socials as $i => $s) {
        $stmt->execute(['platform' => $s['platform'], 'url' => $s['url'], 'icon' => $s['icon'], 'order' => $i]);
    }
    echo "Seeded " . count($socials) . " social_links rows.\n";
} else {
    echo "social_links already has rows, skipped.\n";
}

// --- menus + menu_items ---
$menuCount = (int) $pdo->query('SELECT COUNT(*) FROM menus')->fetchColumn();
if ($menuCount === 0) {
    $pdo->prepare('INSERT INTO menus (slug, name, created_at, updated_at) VALUES (:slug, :name, NOW(), NOW())')
        ->execute(['slug' => 'primary', 'name' => 'Primary Navigation']);
    $primaryMenuId = (int) $pdo->lastInsertId();

    $pdo->prepare('INSERT INTO menus (slug, name, created_at, updated_at) VALUES (:slug, :name, NOW(), NOW())')
        ->execute(['slug' => 'services_mega', 'name' => 'Services Mega Menu']);
    $megaMenuId = (int) $pdo->lastInsertId();

    $insertItem = $pdo->prepare(
        'INSERT INTO menu_items
            (menu_id, parent_id, label, url_type, internal_path, icon, mega_menu_slug, display_order, mega_column, created_at, updated_at)
         VALUES (:menu_id, :parent_id, :label, "internal", :path, :icon, :mega_slug, :order, :mega_column, NOW(), NOW())'
    );

    $primaryNav = [
        ['label' => 'Home', 'path' => '/', 'mega' => null],
        ['label' => 'About', 'path' => '/about', 'mega' => null],
        ['label' => 'Services', 'path' => '/services', 'mega' => 'services_mega'],
        ['label' => 'Hotel Technology', 'path' => '/channel-manager-hotel-software', 'mega' => 'services_mega'],
        ['label' => 'Portfolio', 'path' => '/portfolio', 'mega' => null],
        ['label' => 'Pricing', 'path' => '/channel-manager-pricing', 'mega' => null],
        ['label' => 'Blog', 'path' => '/blog', 'mega' => null],
        ['label' => 'Contact', 'path' => '/contact', 'mega' => null],
    ];
    foreach ($primaryNav as $i => $item) {
        $insertItem->execute([
            'menu_id' => $primaryMenuId, 'parent_id' => null, 'label' => $item['label'],
            'path' => $item['path'], 'icon' => null, 'mega_slug' => $item['mega'], 'order' => $i, 'mega_column' => null,
        ]);
    }

    $columns = [
        ['title' => 'Website Design & Development', 'glyph' => '◍', 'links' => ['Business Website Design', 'Hotel Website Design', 'Tour & Travel Website Design', 'WordPress Development', 'React Website Development', 'E-commerce Development', 'Landing Page Design', 'Website Redesign', 'Website Maintenance', 'UI/UX Design']],
        ['title' => 'Digital Marketing', 'glyph' => '◎', 'links' => ['Digital Marketing Services', 'Social Media Marketing', 'Google Ads Management', 'Meta Ads Management', 'Content Marketing', 'Email Marketing', 'Online Reputation Management', 'Google Business Profile', 'Lead Generation', 'Conversion Rate Optimisation']],
        ['title' => 'SEO Services', 'glyph' => '◈', 'links' => ['Search Engine Optimisation', 'Local SEO', 'Hotel SEO', 'Travel Website SEO', 'Technical SEO', 'On-Page SEO', 'Off-Page SEO', 'E-commerce SEO', 'Google Business Profile SEO', 'SEO Audit', 'Content Writing']],
        ['title' => 'Hotel Technology', 'glyph' => '◆', 'links' => ['Hotel Channel Manager', 'Cloud PMS', 'Hotel Booking Engine', 'Hotel Website', 'OTA Listing', 'OTA Management', 'Revenue Management', 'Google Hotel Ads', 'Payment Gateway Integration', 'Hotel Digital Marketing']],
    ];
    foreach ($columns as $ci => $col) {
        $insertItem->execute([
            'menu_id' => $megaMenuId, 'parent_id' => null, 'label' => $col['title'],
            'path' => null, 'icon' => $col['glyph'], 'mega_slug' => null, 'order' => $ci, 'mega_column' => $col['title'],
        ]);
        $parentId = (int) $pdo->lastInsertId();
        foreach ($col['links'] as $li => $link) {
            $insertItem->execute([
                'menu_id' => $megaMenuId, 'parent_id' => $parentId, 'label' => $link,
                'path' => '/services', 'icon' => null, 'mega_slug' => null, 'order' => $li, 'mega_column' => null,
            ]);
        }
    }

    echo "Seeded primary + services_mega menus.\n";
} else {
    echo "menus already has rows, skipped.\n";
}

// --- footer_sections + footer_links ---
$footerCount = (int) $pdo->query('SELECT COUNT(*) FROM footer_sections')->fetchColumn();
if ($footerCount === 0) {
    $footerColumns = [
        ['title' => 'Website services', 'links' => [
            ['Business Website Design', '/website-designing'], ['Hotel Website Design', '/website-designing'],
            ['WordPress Development', '/website-designing'], ['E-commerce Development', '/website-designing'],
            ['Website Redesign', '/website-designing'],
        ]],
        ['title' => 'Marketing', 'links' => [
            ['Digital Marketing', '/online-marketing'], ['Google Ads', '/online-marketing'],
            ['Meta Ads', '/online-marketing'], ['Social Media Marketing', '/online-marketing'],
            ['Lead Generation', '/online-marketing'],
        ]],
        ['title' => 'SEO', 'links' => [
            ['SEO Services', '/seo-services'], ['Local SEO', '/seo-services'],
            ['Hotel SEO', '/seo-services'], ['Technical SEO', '/seo-services'],
            ['SEO Audit', '/seo-services'],
        ]],
        ['title' => 'Hotel technology', 'links' => [
            ['Channel Manager', '/channel-manager-hotel-software'], ['Cloud PMS', '/channel-manager-hotel-software'],
            ['Booking Engine', '/channel-manager-hotel-software'], ['Pricing', '/channel-manager-pricing'],
            ['Hotel Digital Marketing', '/hotel-digital-marketing'],
        ]],
    ];

    $insertSection = $pdo->prepare('INSERT INTO footer_sections (title, display_order, created_at, updated_at) VALUES (:title, :order, NOW(), NOW())');
    $insertLink = $pdo->prepare('INSERT INTO footer_links (footer_section_id, label, url, display_order, created_at, updated_at) VALUES (:section_id, :label, :url, :order, NOW(), NOW())');

    foreach ($footerColumns as $si => $section) {
        $insertSection->execute(['title' => $section['title'], 'order' => $si]);
        $sectionId = (int) $pdo->lastInsertId();
        foreach ($section['links'] as $li => [$label, $url]) {
            $insertLink->execute(['section_id' => $sectionId, 'label' => $label, 'url' => $url, 'order' => $li]);
        }
    }

    echo "Seeded " . count($footerColumns) . " footer sections.\n";
} else {
    echo "footer_sections already has rows, skipped.\n";
}
