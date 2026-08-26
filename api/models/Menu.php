<?php
declare(strict_types=1);

function find_menu_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT id, slug, name FROM menus WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Flat list of a menu's items, ordered so parents precede their children. */
function list_menu_items(PDO $pdo, int $menuId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, parent_id, label, url_type, internal_path, external_url, icon, mega_menu_slug,
                display_order, status, open_new_tab, is_highlighted, mega_column, show_desktop, show_mobile
         FROM menu_items WHERE menu_id = :menu_id ORDER BY parent_id IS NULL DESC, parent_id ASC, display_order ASC, id ASC'
    );
    $stmt->execute(['menu_id' => $menuId]);
    return $stmt->fetchAll();
}

/** Builds a parent -> children tree from the flat list above. */
function build_menu_tree(array $flatItems): array
{
    $byParent = [];
    foreach ($flatItems as $item) {
        $byParent[$item['parent_id'] ?? '0'][] = $item;
    }

    $attachChildren = function (array $item) use (&$attachChildren, $byParent): array {
        $item['children'] = array_map($attachChildren, $byParent[$item['id']] ?? []);
        return $item;
    };

    return array_map($attachChildren, $byParent['0'] ?? []);
}

function create_menu_item(PDO $pdo, int $menuId, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO menu_items
            (menu_id, parent_id, label, url_type, internal_path, external_url, icon, mega_menu_slug,
             display_order, status, open_new_tab, is_highlighted, mega_column, show_desktop, show_mobile, created_at, updated_at)
         VALUES
            (:menu_id, :parent_id, :label, :url_type, :internal_path, :external_url, :icon, :mega_menu_slug,
             :display_order, :status, :open_new_tab, :is_highlighted, :mega_column, :show_desktop, :show_mobile, NOW(), NOW())'
    );
    $stmt->execute(menu_item_params($data) + ['menu_id' => $menuId]);
    return (int) $pdo->lastInsertId();
}

function update_menu_item(PDO $pdo, int $id, array $data): void
{
    $stmt = $pdo->prepare(
        'UPDATE menu_items SET
            parent_id = :parent_id, label = :label, url_type = :url_type, internal_path = :internal_path,
            external_url = :external_url, icon = :icon, mega_menu_slug = :mega_menu_slug,
            display_order = :display_order, status = :status, open_new_tab = :open_new_tab,
            is_highlighted = :is_highlighted, mega_column = :mega_column, show_desktop = :show_desktop,
            show_mobile = :show_mobile, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute(menu_item_params($data) + ['id' => $id]);
}

function menu_item_params(array $data): array
{
    return [
        'parent_id'      => !empty($data['parent_id']) ? (int) $data['parent_id'] : null,
        'label'          => $data['label'],
        'url_type'       => ($data['url_type'] ?? 'internal') === 'external' ? 'external' : 'internal',
        'internal_path'  => $data['internal_path'] ?? null,
        'external_url'   => $data['external_url'] ?? null,
        'icon'           => $data['icon'] ?? null,
        'mega_menu_slug' => $data['mega_menu_slug'] ?? null,
        'display_order'  => (int) ($data['display_order'] ?? 0),
        'status'         => ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        'open_new_tab'   => !empty($data['open_new_tab']) ? 1 : 0,
        'is_highlighted' => !empty($data['is_highlighted']) ? 1 : 0,
        'mega_column'    => $data['mega_column'] ?? null,
        'show_desktop'   => array_key_exists('show_desktop', $data) ? (empty($data['show_desktop']) ? 0 : 1) : 1,
        'show_mobile'    => array_key_exists('show_mobile', $data) ? (empty($data['show_mobile']) ? 0 : 1) : 1,
    ];
}

function delete_menu_item(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM menu_items WHERE id = :id')->execute(['id' => $id]);
}

function find_menu_item(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, menu_id FROM menu_items WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Applies a new display_order to each {id, display_order} pair. */
function reorder_menu_items(PDO $pdo, array $order): void
{
    $stmt = $pdo->prepare('UPDATE menu_items SET display_order = :order, updated_at = NOW() WHERE id = :id');
    foreach ($order as $entry) {
        $stmt->execute(['order' => (int) $entry['display_order'], 'id' => (int) $entry['id']]);
    }
}
