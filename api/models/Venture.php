<?php
declare(strict_types=1);

const VENTURE_STATUSES = ['draft', 'published', 'archived'];

const VENTURE_LAYOUT_VARIANTS = [
    'heritage-craft', 'technical-grid', 'cinematic-desert', 'route-planner', 'b2b-trade',
    'portfolio-management', 'offbeat-expedition', 'directory-portal', 'editorial-guide',
];

function list_ventures(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(name LIKE :search1 OR slug LIKE :search2 OR category LIKE :search3)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], VENTURE_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }
    if ($params['category'] !== '') {
        $where[] = 'category = :category';
        $bind['category'] = $params['category'];
    }
    if (!empty($params['featured'])) {
        $where[] = 'is_featured = 1';
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM ventures $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, name, slug, category, status, layout_variant, is_featured, sort_order, published_at, updated_at
         FROM ventures $whereSql
         ORDER BY sort_order ASC, id ASC
         LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_venture(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM ventures WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? decode_venture_row($pdo, $row) : null;
}

function find_venture_by_slug(PDO $pdo, string $slug, bool $publishedOnly = true): ?array
{
    $sql = 'SELECT * FROM ventures WHERE slug = :slug';
    if ($publishedOnly) {
        $sql .= " AND status = 'published'";
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ? decode_venture_row($pdo, $row) : null;
}

function decode_venture_row(PDO $pdo, array $row): array
{
    $row['phone_numbers'] = $row['phone_numbers_json'] ? json_decode($row['phone_numbers_json'], true) : [];
    $row['is_featured'] = (bool) $row['is_featured'];
    unset($row['phone_numbers_json']);

    $id = (int) $row['id'];
    $children = get_venture_child_collections($pdo, $id);
    $row['services'] = $children['services'];
    $row['highlights'] = $children['highlights'];
    $row['sections'] = $children['sections'];
    $row['media'] = $children['media'];

    return $row;
}

/** Loads all 4 child collections in a single round trip instead of 4 (spec §24 — avoid N+1
 *  query patterns on the read path). Each source table has a different column set, so the
 *  UNION pads unused columns with NULL and a `kind` discriminator drives how each row is
 *  reshaped back into get_venture_services()/highlights()/sections()/media()'s normal shape —
 *  those individual functions are left in place unchanged for any caller that only needs one
 *  collection. */
function get_venture_child_collections(PDO $pdo, int $ventureId): array
{
    $stmt = $pdo->prepare(
        "SELECT 'service' AS kind, id, sort_order, title, description, icon, is_active AS flag,
                NULL AS subheading, NULL AS body_html, NULL AS image_url, NULL AS layout_variant, NULL AS settings_json,
                NULL AS media_url, NULL AS media_role, NULL AS alt_text, NULL AS caption, NULL AS section_key, NULL AS section_type
         FROM venture_services WHERE venture_id = :id1
         UNION ALL
         SELECT 'highlight', id, sort_order, highlight_text AS title, NULL, NULL, 1,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
         FROM venture_highlights WHERE venture_id = :id2
         UNION ALL
         SELECT 'section', id, sort_order, heading AS title, NULL, NULL, is_visible,
                subheading, body_html, image_url, layout_variant, settings_json, NULL, NULL, NULL, NULL, section_key, section_type
         FROM venture_sections WHERE venture_id = :id3
         UNION ALL
         SELECT 'media', id, sort_order, NULL, NULL, NULL, is_visible,
                NULL, NULL, NULL, NULL, NULL, media_url, media_role, alt_text, caption, NULL, NULL
         FROM venture_media WHERE venture_id = :id4
         ORDER BY kind, sort_order, id"
    );
    $stmt->execute(['id1' => $ventureId, 'id2' => $ventureId, 'id3' => $ventureId, 'id4' => $ventureId]);

    $out = ['services' => [], 'highlights' => [], 'sections' => [], 'media' => []];
    foreach ($stmt->fetchAll() as $r) {
        switch ($r['kind']) {
            case 'service':
                $out['services'][] = ['id' => $r['id'], 'title' => $r['title'], 'description' => $r['description'], 'icon' => $r['icon'], 'sort_order' => $r['sort_order'], 'is_active' => (bool) $r['flag']];
                break;
            case 'highlight':
                $out['highlights'][] = ['id' => $r['id'], 'highlight_text' => $r['title'], 'sort_order' => $r['sort_order']];
                break;
            case 'section':
                $out['sections'][] = [
                    'id' => $r['id'], 'section_key' => $r['section_key'], 'section_type' => $r['section_type'], 'heading' => $r['title'],
                    'subheading' => $r['subheading'], 'body_html' => $r['body_html'], 'image_url' => $r['image_url'],
                    'layout_variant' => $r['layout_variant'], 'settings' => $r['settings_json'] ? json_decode($r['settings_json'], true) : null,
                    'sort_order' => $r['sort_order'], 'is_visible' => (bool) $r['flag'],
                ];
                break;
            case 'media':
                $out['media'][] = ['id' => $r['id'], 'media_url' => $r['media_url'], 'media_role' => $r['media_role'], 'alt_text' => $r['alt_text'], 'caption' => $r['caption'], 'sort_order' => $r['sort_order'], 'is_visible' => (bool) $r['flag']];
                break;
        }
    }
    return $out;
}

function venture_slug_taken(PDO $pdo, string $slug, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM ventures WHERE slug = :slug';
    $bind = ['slug' => $slug];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

/** The stable identity persisted forever once a Venture is created — see seo_document_key()'s
 *  venture branch (api/lib/seo/documents.php), which derives the *route*-based key the exact
 *  same way, so a freshly created Venture's key and its seo_documents.document_key always
 *  agree without any extra reconciliation step. */
function venture_key_for_slug(string $slug): string
{
    return 'venture:' . $slug;
}

function create_venture(PDO $pdo, array $data, int $adminUserId): int
{
    $status = in_array($data['status'] ?? 'draft', VENTURE_STATUSES, true) ? $data['status'] : 'draft';
    $slug = (string) $data['slug'];

    $stmt = $pdo->prepare(
        'INSERT INTO ventures
            (venture_key, name, short_name, slug, tagline, category, summary, status, sort_order, layout_variant,
             primary_color, secondary_color, accent_color, background_color, surface_color, text_color, muted_color,
             on_primary_color, logo_image, hero_image, phone_numbers_json, email, website_url, google_business_url,
             cta_label, cta_url, is_featured, published_at, created_by, updated_by, created_at, updated_at)
         VALUES
            (:venture_key, :name, :short_name, :slug, :tagline, :category, :summary, :status, :sort_order, :layout_variant,
             :primary_color, :secondary_color, :accent_color, :background_color, :surface_color, :text_color, :muted_color,
             :on_primary_color, :logo_image, :hero_image, :phone_numbers_json, :email, :website_url, :google_business_url,
             :cta_label, :cta_url, :is_featured, :published_at, :created_by, :updated_by, NOW(), NOW())'
    );
    $stmt->execute(venture_bind_params($data, $status, $slug) + [
        'venture_key' => venture_key_for_slug($slug),
        'created_by' => $adminUserId,
        'updated_by' => $adminUserId,
    ]);

    return (int) $pdo->lastInsertId();
}

function update_venture(PDO $pdo, int $id, array $data, int $adminUserId): void
{
    // venture_key is never part of this UPDATE — it is immutable once created (spec §3).
    $status = in_array($data['status'] ?? 'draft', VENTURE_STATUSES, true) ? $data['status'] : 'draft';
    $slug = (string) $data['slug'];

    $stmt = $pdo->prepare(
        'UPDATE ventures SET
            name = :name, short_name = :short_name, slug = :slug, tagline = :tagline, category = :category,
            summary = :summary, status = :status, sort_order = :sort_order, layout_variant = :layout_variant,
            primary_color = :primary_color, secondary_color = :secondary_color, accent_color = :accent_color,
            background_color = :background_color, surface_color = :surface_color, text_color = :text_color,
            muted_color = :muted_color, on_primary_color = :on_primary_color, logo_image = :logo_image,
            hero_image = :hero_image, phone_numbers_json = :phone_numbers_json, email = :email,
            website_url = :website_url, google_business_url = :google_business_url, cta_label = :cta_label,
            cta_url = :cta_url, is_featured = :is_featured, published_at = :published_at, archived_at = :archived_at,
            updated_by = :updated_by, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute(venture_bind_params($data, $status, $slug) + [
        'archived_at' => $status === 'archived' ? ($data['archived_at'] ?? date('Y-m-d H:i:s')) : null,
        'updated_by' => $adminUserId,
        'id' => $id,
    ]);
}

function venture_bind_params(array $data, string $status, string $slug): array
{
    return [
        'name' => sanitize_html((string) $data['name']),
        'short_name' => $data['short_name'] ?? null,
        'slug' => $slug,
        'tagline' => sanitize_html((string) $data['tagline']),
        'category' => (string) $data['category'],
        'summary' => sanitize_html((string) $data['summary']),
        'status' => $status,
        'sort_order' => (int) ($data['sort_order'] ?? 0),
        'layout_variant' => in_array($data['layout_variant'] ?? '', VENTURE_LAYOUT_VARIANTS, true) ? $data['layout_variant'] : VENTURE_LAYOUT_VARIANTS[0],
        'primary_color' => validate_hex_color($data['primary_color'] ?? '#000000'),
        'secondary_color' => validate_hex_color($data['secondary_color'] ?? '#000000'),
        'accent_color' => validate_hex_color($data['accent_color'] ?? '#000000'),
        'background_color' => validate_hex_color($data['background_color'] ?? '#ffffff'),
        'surface_color' => validate_hex_color($data['surface_color'] ?? '#ffffff'),
        'text_color' => validate_hex_color($data['text_color'] ?? '#000000'),
        'muted_color' => (string) ($data['muted_color'] ?? '#666666'),
        'on_primary_color' => validate_hex_color($data['on_primary_color'] ?? '#ffffff'),
        'logo_image' => $data['logo_image'] ?? null,
        'hero_image' => $data['hero_image'] ?? null,
        'phone_numbers_json' => json_encode(array_values(array_filter((array) ($data['phone_numbers'] ?? [])))),
        'email' => $data['email'] ?? null,
        'website_url' => $data['website_url'] ?? null,
        'google_business_url' => $data['google_business_url'] ?? null,
        'cta_label' => $data['cta_label'] ?? null,
        'cta_url' => $data['cta_url'] ?? null,
        'is_featured' => empty($data['is_featured']) ? 0 : 1,
        'published_at' => $status === 'published' ? ($data['published_at'] ?? date('Y-m-d H:i:s')) : ($data['published_at'] ?? null),
    ];
}

/** Hex color validation (spec §11/§22) — accepts #rgb or #rrggbb, falls back to a safe black
 *  rather than ever persisting an unvalidated string into a color CSS custom property. */
function validate_hex_color(string $value): string
{
    return preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value) ? $value : '#000000';
}

// --- Child collections (replace-all-on-save, same convention as save_faqs()) ---

function get_venture_services(PDO $pdo, int $ventureId): array
{
    $stmt = $pdo->prepare('SELECT id, title, description, icon, sort_order, is_active FROM venture_services WHERE venture_id = :id ORDER BY sort_order ASC, id ASC');
    $stmt->execute(['id' => $ventureId]);
    return array_map(fn($r) => $r + ['is_active' => (bool) $r['is_active']], $stmt->fetchAll());
}

function save_venture_services(PDO $pdo, int $ventureId, array $services): void
{
    $pdo->prepare('DELETE FROM venture_services WHERE venture_id = :id')->execute(['id' => $ventureId]);
    if (!$services) {
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO venture_services (venture_id, title, description, icon, sort_order, is_active, created_at, updated_at)
         VALUES (:venture_id, :title, :description, :icon, :sort_order, :is_active, NOW(), NOW())'
    );
    foreach (array_values($services) as $i => $s) {
        if (empty($s['title'])) {
            continue;
        }
        $stmt->execute([
            'venture_id' => $ventureId,
            'title' => sanitize_html((string) $s['title']),
            'description' => sanitize_html((string) ($s['description'] ?? '')),
            'icon' => $s['icon'] ?? null,
            'sort_order' => $i,
            'is_active' => empty($s['is_active']) && array_key_exists('is_active', $s) ? 0 : 1,
        ]);
    }
}

function get_venture_highlights(PDO $pdo, int $ventureId): array
{
    $stmt = $pdo->prepare('SELECT id, highlight_text, sort_order FROM venture_highlights WHERE venture_id = :id ORDER BY sort_order ASC, id ASC');
    $stmt->execute(['id' => $ventureId]);
    return $stmt->fetchAll();
}

function save_venture_highlights(PDO $pdo, int $ventureId, array $highlights): void
{
    $pdo->prepare('DELETE FROM venture_highlights WHERE venture_id = :id')->execute(['id' => $ventureId]);
    if (!$highlights) {
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO venture_highlights (venture_id, highlight_text, sort_order, created_at, updated_at)
         VALUES (:venture_id, :text, :sort_order, NOW(), NOW())'
    );
    foreach (array_values($highlights) as $i => $h) {
        $text = is_array($h) ? ($h['highlight_text'] ?? '') : (string) $h;
        if ($text === '') {
            continue;
        }
        $stmt->execute(['venture_id' => $ventureId, 'text' => sanitize_html($text), 'sort_order' => $i]);
    }
}

function get_venture_sections(PDO $pdo, int $ventureId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, section_key, section_type, heading, subheading, body_html, image_url, layout_variant, settings_json, sort_order, is_visible
         FROM venture_sections WHERE venture_id = :id ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute(['id' => $ventureId]);
    return array_map(function ($r) {
        $r['settings'] = $r['settings_json'] ? json_decode($r['settings_json'], true) : null;
        $r['is_visible'] = (bool) $r['is_visible'];
        unset($r['settings_json']);
        return $r;
    }, $stmt->fetchAll());
}

function save_venture_sections(PDO $pdo, int $ventureId, array $sections): void
{
    $pdo->prepare('DELETE FROM venture_sections WHERE venture_id = :id')->execute(['id' => $ventureId]);
    if (!$sections) {
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO venture_sections
            (venture_id, section_key, section_type, heading, subheading, body_html, image_url, layout_variant, settings_json, sort_order, is_visible, created_at, updated_at)
         VALUES
            (:venture_id, :section_key, :section_type, :heading, :subheading, :body_html, :image_url, :layout_variant, :settings_json, :sort_order, :is_visible, NOW(), NOW())'
    );
    foreach (array_values($sections) as $i => $s) {
        if (empty($s['heading'])) {
            continue;
        }
        $stmt->execute([
            'venture_id' => $ventureId,
            'section_key' => $s['section_key'] ?? null,
            'section_type' => $s['section_type'] ?? 'rich_text',
            'heading' => sanitize_html((string) $s['heading']),
            'subheading' => isset($s['subheading']) ? sanitize_html((string) $s['subheading']) : null,
            'body_html' => isset($s['body_html']) ? sanitize_html((string) $s['body_html']) : (isset($s['body']) ? sanitize_html('<p>' . $s['body'] . '</p>') : null),
            'image_url' => $s['image_url'] ?? null,
            'layout_variant' => $s['layout_variant'] ?? null,
            'settings_json' => isset($s['settings']) ? json_encode(sanitize_json_strings($s['settings'])) : null,
            'sort_order' => $i,
            'is_visible' => array_key_exists('is_visible', $s) && empty($s['is_visible']) ? 0 : 1,
        ]);
    }
}

function get_venture_media(PDO $pdo, int $ventureId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, media_url, media_role, alt_text, caption, sort_order, is_visible
         FROM venture_media WHERE venture_id = :id ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute(['id' => $ventureId]);
    return array_map(fn($r) => $r + ['is_visible' => (bool) $r['is_visible']], $stmt->fetchAll());
}

function save_venture_media(PDO $pdo, int $ventureId, array $media): void
{
    $pdo->prepare('DELETE FROM venture_media WHERE venture_id = :id')->execute(['id' => $ventureId]);
    if (!$media) {
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO venture_media (venture_id, media_url, media_role, alt_text, caption, sort_order, is_visible, created_at, updated_at)
         VALUES (:venture_id, :media_url, :media_role, :alt_text, :caption, :sort_order, :is_visible, NOW(), NOW())'
    );
    foreach (array_values($media) as $i => $m) {
        if (empty($m['media_url'])) {
            continue;
        }
        $stmt->execute([
            'venture_id' => $ventureId,
            'media_url' => $m['media_url'],
            'media_role' => $m['media_role'] ?? 'gallery',
            'alt_text' => $m['alt_text'] ?? null,
            'caption' => isset($m['caption']) ? sanitize_html((string) $m['caption']) : null,
            'sort_order' => $i,
            'is_visible' => array_key_exists('is_visible', $m) && empty($m['is_visible']) ? 0 : 1,
        ]);
    }
}

function reorder_ventures(PDO $pdo, array $orderedIds): void
{
    $placeholders = implode(',', array_fill(0, count($orderedIds), '?'));
    $existing = $pdo->prepare("SELECT id FROM ventures WHERE id IN ($placeholders)");
    $existing->execute($orderedIds);
    $validIds = array_map('intval', $existing->fetchAll(PDO::FETCH_COLUMN));
    if (count($validIds) !== count($orderedIds)) {
        throw new InvalidArgumentException('One or more venture IDs do not exist.');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('UPDATE ventures SET sort_order = :order, updated_at = NOW() WHERE id = :id');
        foreach ($orderedIds as $i => $id) {
            $stmt->execute(['order' => $i, 'id' => (int) $id]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function delete_venture(PDO $pdo, int $id): void
{
    // Children cascade via ON DELETE CASCADE (venture_services/highlights/sections/media).
    $pdo->prepare('DELETE FROM ventures WHERE id = :id')->execute(['id' => $id]);
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = "venture" AND entity_id = :id')->execute(['id' => $id]);
    delete_seo_meta($pdo, 'venture', $id);
}
