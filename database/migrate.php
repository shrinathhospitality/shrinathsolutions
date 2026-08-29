<?php
// CLI migration runner. Usage: php database/migrate.php
// Applies any database/migrations/*.sql file not yet recorded in schema_migrations, in filename order.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';

$pdo = get_db_connection();

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_schema_migrations_migration (migration)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);

$applied = $pdo->query('SELECT migration FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
$appliedSet = array_flip($applied);

// Excludes *.down.sql on purpose: glob('*.sql') matches them too, and '.down.sql' sorts
// alphabetically *before* the matching forward file's plain '.sql' (e.g.
// "0016_seo_documents.down.sql" < "0016_seo_documents.sql"), which — before this filter — meant
// a fresh install would attempt to run a down-migration (dropping columns that don't exist yet)
// before its own forward migration ever ran. Found and fixed during the MySQL validation pass;
// see docs/SEO_STUDIO_ARCHITECTURE.md Part 4.
$files = array_values(array_filter(glob(__DIR__ . '/migrations/*.sql'), fn($f) => !str_ends_with($f, '.down.sql')));
sort($files);

$ran = 0;
foreach ($files as $file) {
    $name = basename($file);
    if (isset($appliedSet[$name])) {
        continue;
    }

    echo "Applying $name ... ";
    $sql = file_get_contents($file);

    try {
        $pdo->exec($sql);
        $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (:m)')->execute(['m' => $name]);
        echo "OK\n";
        $ran++;
    } catch (Throwable $e) {
        echo "FAILED\n";
        fwrite(STDERR, $e->getMessage() . "\n");
        exit(1);
    }
}

echo $ran === 0 ? "Nothing to apply. Database is up to date.\n" : "Applied $ran migration(s).\n";
