<?php
// CLI-only. Idempotent per-key: adds the remaining Global SEO / site settings keys
// (Phase 15) that weren't part of the Stage 2 header/footer seed. Only inserts keys that
// don't already exist — never overwrites a value you've since changed in the admin.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';

$pdo = get_db_connection();

$defaults = [
    'favicon'                    => '',
    'default_seo_title'          => 'Shrinath Solutions — Websites, Marketing & Hotel Technology',
    'default_meta_description'   => 'Website development, digital marketing, SEO and hotel technology for hotels, camps and businesses in Jaisalmer and across Rajasthan.',
    'default_og_image'           => '',
    'business_hours'             => 'Monday to Saturday: 10:00 - 19:00; Sunday: On call',
    'google_maps_embed'          => '',
    'analytics_id'                => '',
    'search_console_verification' => '',
    'facebook_pixel_id'           => '',
    'maintenance_mode'            => '0',
    'contact_form_recipient'      => 'shrinathsolutions@gmail.com',
    'date_time_format'            => 'DD MMM YYYY, h:mm A',
];

$stmt = $pdo->prepare('INSERT INTO site_settings (setting_key, setting_value, created_at, updated_at) VALUES (:k, :v, NOW(), NOW())');
$checkStmt = $pdo->prepare('SELECT 1 FROM site_settings WHERE setting_key = :k');

$added = 0;
foreach ($defaults as $key => $value) {
    $checkStmt->execute(['k' => $key]);
    if ($checkStmt->fetch()) {
        continue;
    }
    $stmt->execute(['k' => $key, 'v' => $value]);
    $added++;
}

echo "Added $added new setting key(s).\n";
