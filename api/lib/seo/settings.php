<?php
// Global SEO Studio settings — simple key/value store, matching the shape of other simple
// settings tables in this project (site_settings). Known keys are validated by the caller
// (SeoStudioController), this file is intentionally generic key/value storage.

declare(strict_types=1);

function seo_get_settings(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM seo_global_settings');
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $decoded = json_decode($row['setting_value'] ?? 'null', true);
        $out[$row['setting_key']] = $decoded;
    }
    return $out;
}

function seo_save_settings(PDO $pdo, array $settings, int $adminUserId): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO seo_global_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES (:k, :v, :u, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW()'
    );
    foreach ($settings as $key => $value) {
        $stmt->execute(['k' => (string) $key, 'v' => json_encode($value), 'u' => $adminUserId]);
    }
}
