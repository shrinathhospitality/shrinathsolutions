<?php
// Data access for admin_users. Only ever selects columns the caller needs;
// password_hash is never returned to controllers that respond to the client directly.

declare(strict_types=1);

function find_admin_user_by_login(PDO $pdo, string $usernameOrEmail): ?array
{
    $stmt = $pdo->prepare(
        "SELECT id, name, username, email, password_hash, role, status, must_change_password
         FROM admin_users
         WHERE (username = :login1 OR email = :login2) AND status = 'active'
         LIMIT 1"
    );
    $stmt->execute(['login1' => $usernameOrEmail, 'login2' => $usernameOrEmail]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function find_admin_user_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, username, email, password_hash, role, status, must_change_password
         FROM admin_users WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function touch_admin_last_login(PDO $pdo, int $id): void
{
    $pdo->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $id]);
}

function update_admin_password(PDO $pdo, int $id, string $passwordHash): void
{
    $pdo->prepare(
        'UPDATE admin_users SET password_hash = :hash, must_change_password = 0, updated_at = NOW() WHERE id = :id'
    )->execute(['hash' => $passwordHash, 'id' => $id]);
}

function email_taken_by_other_admin(PDO $pdo, string $email, int $excludeId): bool
{
    $stmt = $pdo->prepare('SELECT id FROM admin_users WHERE email = :email AND id != :id LIMIT 1');
    $stmt->execute(['email' => $email, 'id' => $excludeId]);
    return (bool) $stmt->fetch();
}

function update_admin_profile(PDO $pdo, int $id, string $name, string $email): void
{
    $pdo->prepare('UPDATE admin_users SET name = :name, email = :email, updated_at = NOW() WHERE id = :id')
        ->execute(['name' => $name, 'email' => $email, 'id' => $id]);
}

function hash_admin_password(string $plain): string
{
    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    return password_hash($plain, $algo);
}
