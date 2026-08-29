<?php
// Ventures CMS permission layer — same minimal, static capability-map design as
// api/lib/seo/permissions.php (see that file's header for the full rationale: this project's
// admin_users.role has exactly one role in real use today, so a full RBAC table would be
// premature; this stays trivially extensible to a second role later without a schema change).

declare(strict_types=1);

const VENTURE_PERMISSIONS = [
    'ventures.view', 'ventures.create', 'ventures.edit', 'ventures.edit_contact',
    'ventures.edit_theme', 'ventures.publish', 'ventures.archive', 'ventures.reorder',
];

const VENTURE_ROLE_PERMISSIONS = [
    'admin' => VENTURE_PERMISSIONS,
];

function venture_role_permissions(string $role): array
{
    return VENTURE_ROLE_PERMISSIONS[$role] ?? [];
}

function venture_user_has_permission(array $ctx, string $permission): bool
{
    $role = $ctx['user']['role'] ?? '';
    return in_array($permission, venture_role_permissions($role), true);
}

/** Halts with a normalized 403 and audit-logs the denial — call before any resource lookup. */
function require_venture_permission(PDO $pdo, array $ctx, string $permission, ?string $entityId = null): void
{
    if (venture_user_has_permission($ctx, $permission)) {
        return;
    }
    audit_log($pdo, $ctx['user']['id'], 'venture_permission_denied', 'venture', $entityId, $permission);
    json_error('Forbidden', 403);
}

/** Per-field capability enforcement (spec §8): compares the incoming body's fields against
 *  what actually changed and requires the matching capability, so a user granted only
 *  ventures.edit (not edit_contact/edit_theme) can save basic fields but not silently
 *  smuggle a contact or theme change through the same request. */
const VENTURE_CONTACT_FIELDS = ['phone_numbers', 'email', 'website_url', 'google_business_url', 'cta_label', 'cta_url'];
const VENTURE_THEME_FIELDS = ['layout_variant', 'primary_color', 'secondary_color', 'accent_color', 'background_color', 'surface_color', 'text_color', 'muted_color', 'on_primary_color'];

function require_venture_field_permissions(PDO $pdo, array $ctx, array $body, ?array $existing): void
{
    require_venture_permission($pdo, $ctx, $existing ? 'ventures.edit' : 'ventures.create');

    foreach (VENTURE_CONTACT_FIELDS as $field) {
        if (array_key_exists($field, $body) && (!$existing || ($existing[$field] ?? null) != $body[$field])) {
            require_venture_permission($pdo, $ctx, 'ventures.edit_contact');
            break;
        }
    }
    foreach (VENTURE_THEME_FIELDS as $field) {
        if (array_key_exists($field, $body) && (!$existing || ($existing[$field] ?? null) != $body[$field])) {
            require_venture_permission($pdo, $ctx, 'ventures.edit_theme');
            break;
        }
    }
    if (array_key_exists('status', $body) && $existing && $body['status'] !== $existing['status']) {
        if ($body['status'] === 'published') {
            require_venture_permission($pdo, $ctx, 'ventures.publish');
        }
        if ($body['status'] === 'archived') {
            require_venture_permission($pdo, $ctx, 'ventures.archive');
        }
    }
}
