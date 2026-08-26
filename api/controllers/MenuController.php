<?php
declare(strict_types=1);

const HEADER_SETTING_KEYS = [
    'site_name', 'phone', 'whatsapp_number', 'email', 'logo_url',
    'header_topbar_message', 'header_cta_text', 'header_cta_url',
    'header_topbar_cta_text', 'header_topbar_cta_url', 'maintenance_mode',
];

function header_public(PDO $pdo): void
{
    $allSettings = get_all_settings($pdo);
    $settings = array_intersect_key($allSettings, array_flip(HEADER_SETTING_KEYS));

    $primaryMenu = find_menu_by_slug($pdo, 'primary');
    $primaryTree = $primaryMenu ? build_menu_tree(list_menu_items($pdo, (int) $primaryMenu['id'])) : [];

    // Resolve each item's mega_menu_slug reference to that menu's tree.
    $megaCache = [];
    foreach ($primaryTree as &$item) {
        if (empty($item['mega_menu_slug'])) {
            continue;
        }
        $slug = $item['mega_menu_slug'];
        if (!array_key_exists($slug, $megaCache)) {
            $menu = find_menu_by_slug($pdo, $slug);
            $megaCache[$slug] = $menu ? build_menu_tree(list_menu_items($pdo, (int) $menu['id'])) : [];
        }
        $item['mega'] = $megaCache[$slug];
    }
    unset($item);

    json_success(['settings' => $settings, 'primary_menu' => $primaryTree]);
}

function menu_admin_get(PDO $pdo, array $params): void
{
    require_admin($pdo);

    $menu = find_menu_by_slug($pdo, $params['slug']);
    if (!$menu) {
        json_error('Menu not found.', 404);
    }

    $tree = build_menu_tree(list_menu_items($pdo, (int) $menu['id']));
    json_success(['menu' => $menu, 'items' => $tree]);
}

function menu_admin_create_item(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $menu = find_menu_by_slug($pdo, $params['slug']);
    if (!$menu) {
        json_error('Menu not found.', 404);
    }

    $body = read_json_body();
    $missing = missing_fields($body, ['label']);
    if ($missing) {
        json_error('Label is required.', 422);
    }

    $id = create_menu_item($pdo, (int) $menu['id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'menu_item_created', 'menu_item', (string) $id, $params['slug']);

    json_success(['id' => $id], 201);
}

function menu_admin_update_item(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $item = find_menu_item($pdo, (int) $params['id']);
    if (!$item) {
        json_error('Menu item not found.', 404);
    }

    $body = read_json_body();
    $missing = missing_fields($body, ['label']);
    if ($missing) {
        json_error('Label is required.', 422);
    }

    update_menu_item($pdo, (int) $params['id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'menu_item_updated', 'menu_item', $params['id']);

    json_success();
}

function menu_admin_delete_item(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $item = find_menu_item($pdo, (int) $params['id']);
    if (!$item) {
        json_error('Menu item not found.', 404);
    }

    delete_menu_item($pdo, (int) $params['id']);
    audit_log($pdo, $ctx['user']['id'], 'menu_item_deleted', 'menu_item', $params['id']);

    json_success();
}

function menu_admin_reorder(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $menu = find_menu_by_slug($pdo, $params['slug']);
    if (!$menu) {
        json_error('Menu not found.', 404);
    }

    $body = read_json_body();
    if (!isset($body['order']) || !is_array($body['order'])) {
        json_error('An "order" array is required.', 422);
    }

    reorder_menu_items($pdo, $body['order']);
    audit_log($pdo, $ctx['user']['id'], 'menu_reordered', 'menu', $params['slug']);

    json_success();
}
