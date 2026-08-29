<?php
// CLI rollback runner: applies the matching {name}.down.sql for one already-applied migration
// and removes its row from schema_migrations. Usage: php database/rollback.php 0015_seo_studio.sql
//
// This project's migration history (0001-0014) predates any rollback tooling and has no .down.sql
// files — this runner only works for migrations that ship one (0015 onward). Rolling back an
// earlier migration is still a manual DBA task, unchanged by this addition.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

$migration = $argv[1] ?? null;
if (!$migration) {
    fwrite(STDERR, "Usage: php database/rollback.php <migration_filename.sql>\n");
    exit(1);
}

$downFile = __DIR__ . '/migrations/' . preg_replace('/\.sql$/', '', $migration) . '.down.sql';
if (!is_file($downFile)) {
    fwrite(STDERR, "No rollback file found: $downFile\n");
    exit(1);
}

require __DIR__ . '/../api/config/db.php';
$pdo = get_db_connection();

$applied = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE migration = :m');
$applied->execute(['m' => $migration]);
if (!$applied->fetch()) {
    fwrite(STDERR, "Migration $migration is not recorded as applied — nothing to roll back.\n");
    exit(1);
}

echo "Rolling back $migration ... ";
try {
    $pdo->exec(file_get_contents($downFile));
    $pdo->prepare('DELETE FROM schema_migrations WHERE migration = :m')->execute(['m' => $migration]);
    echo "OK\n";
} catch (Throwable $e) {
    echo "FAILED\n";
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
