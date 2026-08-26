<?php
// CLI-only. Creates the first admin account if none exists yet. Idempotent — safe to re-run.
//
// Usage:
//   php database/seed_admin.php
//   ADMIN_SEED_PASSWORD="something-stronger" php database/seed_admin.php
//
// Never reachable over HTTP, never referenced from any frontend file.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/models/AdminUser.php';

$pdo = get_db_connection();

$existing = $pdo->prepare('SELECT id FROM admin_users WHERE username = :u LIMIT 1');
$existing->execute(['u' => 'admin']);
if ($existing->fetch()) {
    echo "Admin user 'admin' already exists. Nothing to do.\n";
    exit(0);
}

$tempPassword = getenv('ADMIN_SEED_PASSWORD') ?: 'admin123';

$stmt = $pdo->prepare(
    'INSERT INTO admin_users (name, username, email, password_hash, role, status, must_change_password, created_at, updated_at)
     VALUES (:name, :username, :email, :password_hash, :role, :status, 1, NOW(), NOW())'
);
$stmt->execute([
    'name'          => 'Administrator',
    'username'      => 'admin',
    'email'         => 'shrinathsolutions@gmail.com',
    'password_hash' => hash_admin_password($tempPassword),
    'role'          => 'admin',
    'status'        => 'active',
]);

echo "Created admin user 'admin' with a temporary password. must_change_password is set — the admin will be forced to change it on first login.\n";
