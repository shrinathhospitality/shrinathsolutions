<?php
// Brute-force protection for admin login, backed by the login_attempts table.

declare(strict_types=1);

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

/** True if the username or IP has too many recent failed attempts. */
function login_rate_limited(PDO $pdo, string $username, string $ip): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE (username = :username OR ip_address = :ip)
           AND success = 0
           AND created_at > (NOW() - INTERVAL :minutes MINUTE)'
    );
    $stmt->bindValue('username', $username);
    $stmt->bindValue('ip', $ip);
    $stmt->bindValue('minutes', LOGIN_WINDOW_MINUTES, PDO::PARAM_INT);
    $stmt->execute();

    return (int) $stmt->fetchColumn() >= LOGIN_MAX_ATTEMPTS;
}

function record_login_attempt(PDO $pdo, string $username, string $ip, bool $success): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO login_attempts (username, ip_address, success, created_at) VALUES (:username, :ip, :success, NOW())'
    );
    $stmt->execute([
        'username' => $username,
        'ip'       => $ip,
        'success'  => $success ? 1 : 0,
    ]);
}

/** Clears failed attempts for a username after a successful login. */
function clear_login_attempts(PDO $pdo, string $username): void
{
    $stmt = $pdo->prepare('DELETE FROM login_attempts WHERE username = :username AND success = 0');
    $stmt->execute(['username' => $username]);
}

const FORM_MAX_SUBMISSIONS = 5;
const FORM_WINDOW_MINUTES = 15;

/** True if this IP has submitted too many public enquiries recently. */
function enquiry_rate_limited(PDO $pdo, string $ip): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM contact_enquiries WHERE ip_address = :ip AND created_at > (NOW() - INTERVAL :minutes MINUTE)'
    );
    $stmt->bindValue('ip', $ip);
    $stmt->bindValue('minutes', FORM_WINDOW_MINUTES, PDO::PARAM_INT);
    $stmt->execute();

    return (int) $stmt->fetchColumn() >= FORM_MAX_SUBMISSIONS;
}
