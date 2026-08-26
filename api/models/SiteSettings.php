<?php
declare(strict_types=1);

function get_all_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT setting_key, setting_value FROM site_settings')->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $out[$row['setting_key']] = $row['setting_value'];
    }
    return $out;
}

/** Upserts each key/value pair. Keys not present in $values are left untouched. */
function update_settings(PDO $pdo, array $values): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO site_settings (setting_key, setting_value, created_at, updated_at)
         VALUES (:k, :v, NOW(), NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()'
    );
    foreach ($values as $key => $value) {
        if (!is_string($key) || $key === '') {
            continue;
        }
        $stmt->execute(['k' => $key, 'v' => is_scalar($value) || $value === null ? $value : json_encode($value)]);
    }
}
