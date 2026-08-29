<?php
// Server-authoritative SEO Studio permission layer. Deliberately the smallest maintainable
// design compatible with the existing auth model: this project's admin_users.role column
// exists but is checked by zero controllers today (verified — see
// docs/SEO_STUDIO_ARCHITECTURE.md §19 for the audit). Rather than bolting on a full RBAC
// table system for a project with exactly one role in real use, this is a static, versioned
// capability map — real enforcement, still trivially extensible to a second role later without
// a schema change (spec: "add a future-compatible capability mapping").
//
// Frontend visibility is never trusted — every mutating SEO Studio endpoint calls
// require_permission() itself; hiding a button is a UX nicety, not a security boundary.

declare(strict_types=1);

const SEO_PERMISSIONS = [
    'seo.view', 'seo.analyze', 'seo.edit_metadata', 'seo.edit_advanced',
    'seo.manage_schema', 'seo.manage_redirects', 'seo.run_bulk', 'seo.manage_settings',
];

// The existing, only-ever-used role ('admin', admin_users.role's own DEFAULT) keeps full
// access — explicitly documented, not implicit: this is the "current admins receiving
// explicitly documented permissions" the spec requires. Any role NOT listed here (including a
// typo, or a role introduced later without updating this map) gets zero permissions by
// default — a secure default, never an accidental full-access fallback.
const SEO_ROLE_PERMISSIONS = [
    'admin' => SEO_PERMISSIONS,
];

function seo_role_permissions(string $role): array
{
    return SEO_ROLE_PERMISSIONS[$role] ?? [];
}

function seo_user_has_permission(array $ctx, string $permission): bool
{
    $role = $ctx['user']['role'] ?? '';
    return in_array($permission, seo_role_permissions($role), true);
}

/** Halts the request with a normalized 403 (never reveals whether the underlying resource
 *  exists — call this before any resource lookup, not after) and records a denial in the
 *  audit log. $entityType/$entityId are optional context for the audit row only. */
function require_permission(PDO $pdo, array $ctx, string $permission, ?string $entityType = null, ?string $entityId = null): void
{
    if (seo_user_has_permission($ctx, $permission)) {
        return;
    }
    audit_log($pdo, $ctx['user']['id'], 'seo_permission_denied', $entityType, $entityId, $permission);
    json_error('Forbidden', 403);
}
