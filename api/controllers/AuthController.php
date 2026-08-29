<?php
declare(strict_types=1);

function auth_login(PDO $pdo): void
{
    $body = read_json_body();
    $missing = missing_fields($body, ['username', 'password']);
    if ($missing) {
        json_error('Username and password are required.', 422);
    }

    $username = trim((string) $body['username']);
    $password = (string) $body['password'];
    $ip = client_ip();

    if (login_rate_limited($pdo, $username, $ip)) {
        json_error('Too many failed attempts. Please try again later.', 429);
    }

    $user = find_admin_user_by_login($pdo, $username);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        record_login_attempt($pdo, $username, $ip, false);
        if ($user) {
            audit_log($pdo, (int) $user['id'], 'login_failed', 'admin_user', (string) $user['id']);
        }
        json_error('Invalid username or password.', 401);
    }

    record_login_attempt($pdo, $username, $ip, true);
    clear_login_attempts($pdo, $username);
    touch_admin_last_login($pdo, (int) $user['id']);

    $csrfToken = create_admin_session($pdo, (int) $user['id']);
    audit_log($pdo, (int) $user['id'], 'login', 'admin_user', (string) $user['id']);

    json_success([
        'user' => [
            'id'                   => (int) $user['id'],
            'name'                 => $user['name'],
            'username'             => $user['username'],
            'email'                => $user['email'],
            'role'                 => $user['role'],
            'must_change_password' => (bool) $user['must_change_password'],
        ],
        'seo_capabilities' => seo_role_permissions((string) $user['role']),
        'venture_capabilities' => venture_role_permissions((string) $user['role']),
        'csrf_token' => $csrfToken,
    ]);
}

function auth_logout(PDO $pdo): void
{
    $ctx = resolve_admin_session($pdo);
    if ($ctx !== null) {
        audit_log($pdo, $ctx['user']['id'], 'logout', 'admin_user', (string) $ctx['user']['id']);
    }
    destroy_current_session($pdo);
    json_success();
}

function auth_session(PDO $pdo): void
{
    $ctx = resolve_admin_session($pdo);
    if ($ctx === null) {
        json_error('Unauthorized', 401, ['authenticated' => false]);
    }

    json_success([
        'authenticated'    => true,
        'user'             => $ctx['user'],
        'seo_capabilities' => seo_role_permissions((string) ($ctx['user']['role'] ?? '')),
        'venture_capabilities' => venture_role_permissions((string) ($ctx['user']['role'] ?? '')),
        'csrf_token'       => $ctx['session']['csrf_token'],
    ]);
}

function auth_update_profile(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['name', 'email']);
    if ($missing) {
        json_error('Name and email are required.', 422);
    }

    $name = trim((string) $body['name']);
    $email = trim((string) $body['email']);

    if (!is_valid_email($email)) {
        json_error('Enter a valid email address.', 422);
    }
    if (email_taken_by_other_admin($pdo, $email, $ctx['user']['id'])) {
        json_error('That email is already in use by another admin.', 422);
    }

    update_admin_profile($pdo, $ctx['user']['id'], $name, $email);
    audit_log($pdo, $ctx['user']['id'], 'profile_update', 'admin_user', (string) $ctx['user']['id']);

    $user = find_admin_user_by_id($pdo, $ctx['user']['id']);
    json_success([
        'user' => [
            'id'                   => (int) $user['id'],
            'name'                 => $user['name'],
            'username'             => $user['username'],
            'email'                => $user['email'],
            'role'                 => $user['role'],
            'must_change_password' => (bool) $user['must_change_password'],
        ],
    ]);
}

function auth_change_password(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['current_password', 'new_password']);
    if ($missing) {
        json_error('Current and new password are required.', 422);
    }

    $currentPassword = (string) $body['current_password'];
    $newPassword = (string) $body['new_password'];

    if (strlen($newPassword) < 10) {
        json_error('New password must be at least 10 characters.', 422);
    }
    if ($newPassword === $currentPassword) {
        json_error('New password must be different from the current password.', 422);
    }

    $user = find_admin_user_by_id($pdo, $ctx['user']['id']);
    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
        json_error('Current password is incorrect.', 401);
    }

    update_admin_password($pdo, $ctx['user']['id'], hash_admin_password($newPassword));
    audit_log($pdo, $ctx['user']['id'], 'password_change', 'admin_user', (string) $ctx['user']['id']);

    json_success();
}
