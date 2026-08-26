<?php
// Admin session handling: DB-backed opaque tokens delivered via an HttpOnly cookie.
// Never a JWT, never localStorage-readable.

declare(strict_types=1);

const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

function generate_token(): string
{
    return bin2hex(random_bytes(32));
}

function hash_token(string $token): string
{
    return hash('sha256', $token);
}

function request_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    if (($_SERVER['SERVER_PORT'] ?? null) == 443) {
        return true;
    }
    return ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function set_session_cookie(string $token, int $expiresAt): void
{
    setcookie(ADMIN_SESSION_COOKIE, $token, [
        'expires'  => $expiresAt,
        'path'     => '/',
        'httponly' => true,
        'secure'   => request_is_https(),
        'samesite' => 'Strict',
    ]);
}

function clear_session_cookie(): void
{
    setcookie(ADMIN_SESSION_COOKIE, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => request_is_https(),
        'samesite' => 'Strict',
    ]);
}

/** Creates a session row for the given admin user and sets the session cookie. Returns the CSRF token. */
function create_admin_session(PDO $pdo, int $adminUserId): string
{
    $token     = generate_token();
    $csrfToken = generate_token();
    $expiresAt = time() + ADMIN_SESSION_TTL_SECONDS;

    $stmt = $pdo->prepare(
        'INSERT INTO admin_sessions (admin_user_id, token_hash, csrf_token, ip_address, user_agent, expires_at, created_at, last_used_at)
         VALUES (:admin_user_id, :token_hash, :csrf_token, :ip_address, :user_agent, :expires_at, NOW(), NOW())'
    );
    $stmt->execute([
        'admin_user_id' => $adminUserId,
        'token_hash'    => hash_token($token),
        'csrf_token'    => $csrfToken,
        'ip_address'    => client_ip(),
        'user_agent'    => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        'expires_at'    => date('Y-m-d H:i:s', $expiresAt),
    ]);

    set_session_cookie($token, $expiresAt);

    return $csrfToken;
}

/** Resolves the current request's session cookie to a user + session row, or null. */
function resolve_admin_session(PDO $pdo): ?array
{
    $token = $_COOKIE[ADMIN_SESSION_COOKIE] ?? '';
    if ($token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT s.id AS session_id, s.csrf_token, s.expires_at,
                u.id, u.name, u.username, u.email, u.role, u.status, u.must_change_password
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_user_id
         WHERE s.token_hash = :token_hash
         LIMIT 1'
    );
    $stmt->execute(['token_hash' => hash_token($token)]);
    $row = $stmt->fetch();

    if (!$row || $row['status'] !== 'active' || strtotime($row['expires_at']) < time()) {
        return null;
    }

    $pdo->prepare('UPDATE admin_sessions SET last_used_at = NOW() WHERE id = :id')
        ->execute(['id' => $row['session_id']]);

    return [
        'user' => [
            'id'                   => (int) $row['id'],
            'name'                 => $row['name'],
            'username'             => $row['username'],
            'email'                => $row['email'],
            'role'                 => $row['role'],
            'must_change_password' => (bool) $row['must_change_password'],
        ],
        'session' => [
            'id'         => (int) $row['session_id'],
            'csrf_token' => $row['csrf_token'],
        ],
        'token' => $token,
    ];
}

/** Ends the current session (if any) and clears the cookie. */
function destroy_current_session(PDO $pdo): void
{
    $token = $_COOKIE[ADMIN_SESSION_COOKIE] ?? '';
    if ($token !== '') {
        $pdo->prepare('DELETE FROM admin_sessions WHERE token_hash = :token_hash')
            ->execute(['token_hash' => hash_token($token)]);
    }
    clear_session_cookie();
}

/** Requires a valid session or halts the request with 401. Returns the session context. */
function require_admin(PDO $pdo): array
{
    $ctx = resolve_admin_session($pdo);
    if ($ctx === null) {
        json_error('Unauthorized', 401);
    }
    return $ctx;
}

/** Requires the X-CSRF-Token header to match the session's token, or halts with 403. */
function require_csrf(array $ctx): void
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($header === '' || !hash_equals($ctx['session']['csrf_token'], $header)) {
        json_error('Invalid CSRF token', 403);
    }
}
