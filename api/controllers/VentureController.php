<?php
declare(strict_types=1);

// --- Public, read-only ---

function ventures_public_list(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT name, slug, short_name, tagline, category, summary, layout_variant,
                primary_color, secondary_color, accent_color, background_color, surface_color,
                text_color, muted_color, on_primary_color, logo_image, hero_image, is_featured,
                phone_numbers_json, website_url, google_business_url
         FROM ventures WHERE status = 'published' AND archived_at IS NULL
         ORDER BY sort_order ASC, id ASC"
    );
    $rows = array_map(function ($r) {
        return [
            'name' => $r['name'], 'slug' => $r['slug'], 'short_name' => $r['short_name'],
            'tagline' => $r['tagline'], 'category' => $r['category'], 'summary' => $r['summary'],
            'theme' => [
                'layoutVariant' => $r['layout_variant'], 'primary' => $r['primary_color'], 'secondary' => $r['secondary_color'],
                'accent' => $r['accent_color'], 'background' => $r['background_color'], 'surface' => $r['surface_color'],
                'text' => $r['text_color'], 'muted' => $r['muted_color'], 'onPrimary' => $r['on_primary_color'],
            ],
            'logo_image' => $r['logo_image'], 'hero_image' => $r['hero_image'], 'is_featured' => (bool) $r['is_featured'],
            'phone_numbers' => $r['phone_numbers_json'] ? json_decode($r['phone_numbers_json'], true) : [],
            'website_url' => $r['website_url'], 'google_business_url' => $r['google_business_url'],
        ];
    }, $stmt->fetchAll());
    json_success(['ventures' => $rows]);
}

function ventures_public_detail(PDO $pdo, array $params): void
{
    $venture = find_venture_by_slug($pdo, $params['slug'], true);
    if (!$venture || $venture['archived_at'] !== null) {
        json_error('Venture not found.', 404);
    }

    // Public-safe projection only — no internal ids, audit fields or admin-only columns.
    json_success([
        'venture' => [
            'name' => $venture['name'],
            'short_name' => $venture['short_name'],
            'slug' => $venture['slug'],
            'tagline' => $venture['tagline'],
            'category' => $venture['category'],
            'summary' => $venture['summary'],
            'layout_variant' => $venture['layout_variant'],
            'theme' => [
                'layoutVariant' => $venture['layout_variant'],
                'primary' => $venture['primary_color'],
                'secondary' => $venture['secondary_color'],
                'accent' => $venture['accent_color'],
                'background' => $venture['background_color'],
                'surface' => $venture['surface_color'],
                'text' => $venture['text_color'],
                'muted' => $venture['muted_color'],
                'onPrimary' => $venture['on_primary_color'],
            ],
            'logo_image' => $venture['logo_image'],
            'hero_image' => $venture['hero_image'],
            'phone_numbers' => $venture['phone_numbers'],
            'email' => $venture['email'],
            'website_url' => $venture['website_url'],
            'google_business_url' => $venture['google_business_url'],
            'cta_label' => $venture['cta_label'],
            'cta_url' => $venture['cta_url'],
            'services' => array_values(array_filter($venture['services'], fn($s) => $s['is_active'])),
            'highlights' => array_map(fn($h) => $h['highlight_text'], $venture['highlights']),
            'sections' => array_values(array_filter($venture['sections'], fn($s) => $s['is_visible'])),
            'media' => array_values(array_filter($venture['media'], fn($m) => $m['is_visible'])),
        ],
        'seo' => get_seo_meta($pdo, 'venture', (int) $venture['id']),
        'faqs' => get_faqs($pdo, 'venture', (int) $venture['id']),
    ]);
}

// --- Admin ---

function ventures_admin_list(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_venture_permission($pdo, $ctx, 'ventures.view');
    $params = pagination_params();
    $params['category'] = trim((string) ($_GET['category'] ?? ''));
    $params['featured'] = !empty($_GET['featured']);
    $result = list_ventures($pdo, $params);
    json_success(['ventures' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function ventures_admin_detail(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_venture_permission($pdo, $ctx, 'ventures.view');
    $venture = find_venture($pdo, (int) $params['id']);
    if (!$venture) {
        json_error('Venture not found.', 404);
    }
    json_success([
        'venture' => $venture,
        'seo' => get_seo_meta($pdo, 'venture', (int) $venture['id']),
        'faqs' => get_faqs($pdo, 'venture', (int) $venture['id']),
    ]);
}

function validate_venture_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['name', 'slug', 'tagline', 'category', 'summary']);
    if ($missing) {
        return 'Name, slug, tagline, category and summary are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (in_array($body['slug'], VENTURE_RESERVED_SLUGS, true)) {
        return 'That slug is reserved and cannot be used.';
    }
    if (venture_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another venture.';
    }
    if (isset($body['website_url']) && $body['website_url'] !== '' && !is_safe_public_url((string) $body['website_url'])) {
        return 'Website URL must be a valid http(s) address.';
    }
    if (isset($body['cta_url']) && $body['cta_url'] !== '' && !is_safe_public_url((string) $body['cta_url'])) {
        return 'CTA URL must be a valid http(s) address.';
    }
    if (isset($body['email']) && $body['email'] !== '' && !filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
        return 'Email address is invalid.';
    }
    if (count($body['services'] ?? []) > 20 || count($body['highlights'] ?? []) > 20 || count($body['sections'] ?? []) > 20 || count($body['media'] ?? []) > 40) {
        return 'Too many items in one of services, highlights, sections or media (limit exceeded).';
    }
    return null;
}

// Routes that already exist as fixed React <Route> paths under /our-ventures — a Venture slug
// can never collide with these (there are none today, but this guards future additions).
const VENTURE_RESERVED_SLUGS = ['new'];

/** http(s)-only, no embedded credentials, no control characters (header-injection guard) —
 *  never fetched, only stored and later rendered as a plain href. */
function is_safe_public_url(string $url): bool
{
    if (preg_match('/[\r\n\x00-\x1f]/', $url)) {
        return false;
    }
    $parts = parse_url($url);
    if (!$parts || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) {
        return false;
    }
    if (isset($parts['user']) || isset($parts['pass'])) {
        return false;
    }
    return true;
}

function ventures_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    $body = read_json_body();

    $error = validate_venture_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }
    require_venture_field_permissions($pdo, $ctx, $body, null);

    $pdo->beginTransaction();
    try {
        $id = create_venture($pdo, $body, $ctx['user']['id']);
        save_venture_services($pdo, $id, $body['services'] ?? []);
        save_venture_highlights($pdo, $id, $body['highlights'] ?? []);
        save_venture_sections($pdo, $id, $body['sections'] ?? []);
        save_venture_media($pdo, $id, $body['media'] ?? []);
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'venture', $id, $body['faqs']);
        }
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'venture', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        // One SEO Document per Venture (spec §13) — reuses the exact registry sync this project
        // already trusts rather than hand-writing a second seo_documents insert path here.
        seo_sync_registry($pdo);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save venture.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'venture_created', 'venture', (string) $id, $body['name']);
    json_success(['id' => $id], 201);
}

function ventures_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    $existing = find_venture($pdo, $id);
    if (!$existing) {
        json_error('Venture not found.', 404);
    }

    $body = read_json_body();
    $error = validate_venture_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }
    require_venture_field_permissions($pdo, $ctx, $body, $existing);

    // Optimistic concurrency (spec §23): client must echo back the updated_at it loaded the
    // editor with; a mismatch means someone else saved in between.
    if (isset($body['expected_updated_at']) && $body['expected_updated_at'] !== $existing['updated_at']) {
        json_error('This venture was changed by someone else since you loaded it. Reload and reapply your edits.', 409);
    }

    $slugChanged = $body['slug'] !== $existing['slug'];

    $pdo->beginTransaction();
    try {
        update_venture($pdo, $id, $body, $ctx['user']['id']);
        save_venture_services($pdo, $id, $body['services'] ?? []);
        save_venture_highlights($pdo, $id, $body['highlights'] ?? []);
        save_venture_sections($pdo, $id, $body['sections'] ?? []);
        save_venture_media($pdo, $id, $body['media'] ?? []);
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'venture', $id, $body['faqs']);
        }
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'venture', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        seo_sync_registry($pdo);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save venture.', 422);
    }

    $action = $body['status'] !== $existing['status'] && $body['status'] === 'published' ? 'venture_published' : 'venture_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'venture', (string) $id, $body['name'] ?? null);

    if ($slugChanged && $existing['status'] === 'published') {
        json_success(['slug_changed' => true, 'old_slug' => $existing['slug'], 'new_slug' => $body['slug']]);
        return;
    }
    json_success();
}

function ventures_admin_set_status(PDO $pdo, array $params, string $status, string $permission, string $auditAction): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_venture_permission($pdo, $ctx, $permission);

    $id = (int) $params['id'];
    $existing = find_venture($pdo, $id);
    if (!$existing) {
        json_error('Venture not found.', 404);
    }

    $data = $existing;
    $data['status'] = $status;
    if ($status === 'published') {
        $data['published_at'] = $existing['published_at'] ?? date('Y-m-d H:i:s');
        $data['archived_at'] = null;
    } elseif ($status === 'draft') {
        $data['archived_at'] = null;
    } elseif ($status === 'archived') {
        $data['archived_at'] = date('Y-m-d H:i:s');
    }

    update_venture($pdo, $id, $data, $ctx['user']['id']);
    seo_sync_registry($pdo);
    audit_log($pdo, $ctx['user']['id'], $auditAction, 'venture', (string) $id, $existing['name']);
    json_success();
}

function ventures_admin_publish(PDO $pdo, array $params): void
{
    ventures_admin_set_status($pdo, $params, 'published', 'ventures.publish', 'venture_published');
}

function ventures_admin_unpublish(PDO $pdo, array $params): void
{
    ventures_admin_set_status($pdo, $params, 'draft', 'ventures.publish', 'venture_unpublished');
}

function ventures_admin_archive(PDO $pdo, array $params): void
{
    ventures_admin_set_status($pdo, $params, 'archived', 'ventures.archive', 'venture_archived');
}

/** Restores as draft only (spec §19) — republishing is a separate, explicit action. */
function ventures_admin_restore(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_venture_permission($pdo, $ctx, 'ventures.archive');

    $id = (int) $params['id'];
    $existing = find_venture($pdo, $id);
    if (!$existing) {
        json_error('Venture not found.', 404);
    }
    if ($existing['status'] !== 'archived') {
        json_error('Venture is not archived.', 409);
    }
    if (venture_slug_taken($pdo, $existing['slug'], $id)) {
        json_error('Cannot restore: another venture now uses this slug.', 409);
    }

    $data = $existing;
    $data['status'] = 'draft';
    $data['archived_at'] = null;
    update_venture($pdo, $id, $data, $ctx['user']['id']);
    seo_sync_registry($pdo);
    audit_log($pdo, $ctx['user']['id'], 'venture_restored', 'venture', (string) $id, $existing['name']);
    json_success();
}

function ventures_admin_reorder(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_venture_permission($pdo, $ctx, 'ventures.reorder');

    $body = read_json_body();
    $ids = $body['ids'] ?? null;
    if (!is_array($ids) || !$ids || count($ids) > 200) {
        json_error('ids must be a non-empty array.', 422);
    }
    if (count($ids) !== count(array_unique($ids))) {
        json_error('Duplicate ids in reorder request.', 422);
    }

    try {
        reorder_ventures($pdo, array_map('intval', $ids));
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'venture_reordered', 'venture', null, count($ids) . ' venture(s)');
    json_success();
}

function ventures_admin_history(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_venture_permission($pdo, $ctx, 'ventures.view');

    $id = (string) (int) $params['id'];
    $stmt = $pdo->prepare(
        "SELECT a.action, a.description, a.created_at, u.username AS admin_username
         FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id
         WHERE a.entity_type = 'venture' AND a.entity_id = :id
         ORDER BY a.created_at DESC LIMIT 100"
    );
    $stmt->execute(['id' => $id]);
    json_success(['history' => $stmt->fetchAll()]);
}

function ventures_admin_delete(PDO $pdo, array $params): void
{
    // Hard delete is intentionally not exposed as a route (spec §19: archive, not hard-delete,
    // in the first version). This function exists only so a future, explicitly-approved
    // superadmin-only route can call it without another migration.
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_venture_permission($pdo, $ctx, 'ventures.archive');

    $id = (int) $params['id'];
    $existing = find_venture($pdo, $id);
    if (!$existing) {
        json_error('Venture not found.', 404);
    }
    if ($existing['status'] === 'published') {
        json_error('Cannot delete a published venture — archive it first.', 409);
    }

    delete_venture($pdo, $id);
    seo_cleanup_deleted_content($pdo, 'venture', $id);
    audit_log($pdo, $ctx['user']['id'], 'venture_deleted', 'venture', (string) $id, $existing['name']);
    json_success();
}
