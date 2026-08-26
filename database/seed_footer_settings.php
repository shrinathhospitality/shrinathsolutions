<?php
// CLI-only. Idempotent: adds the new footer-panel settings keys introduced for the premium
// footer redesign, but only where the key does not already exist — never overwrites a value
// an admin may already have edited via the Site Settings screen.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';

$pdo = get_db_connection();

$defaults = [
    'footer_statement' => "Digital Growth,\nBuilt for Hospitality.",
    'footer_cta_heading' => 'Have a Project in Mind?',
    'footer_cta_description' => "Tell us what you want to improve.\nWe'll help you find the clearest next step.",
    'footer_cta_proposal_label' => 'Get a Free Proposal',
    'footer_cta_whatsapp_label' => 'Chat on WhatsApp',
    'footer_trust_points' => 'Hospitality-focused|Based in Jaisalmer|Transparent support',
];

$existing = $pdo->query('SELECT setting_key FROM site_settings')->fetchAll(PDO::FETCH_COLUMN);
$existingSet = array_flip($existing);

$stmt = $pdo->prepare('INSERT INTO site_settings (setting_key, setting_value, created_at, updated_at) VALUES (:k, :v, NOW(), NOW())');
$added = 0;
foreach ($defaults as $key => $value) {
    if (isset($existingSet[$key])) {
        echo "Skipping $key — already set.\n";
        continue;
    }
    $stmt->execute(['k' => $key, 'v' => $value]);
    echo "Added $key\n";
    $added++;
}

echo $added === 0 ? "Nothing to add.\n" : "Added $added setting(s).\n";
