-- Header navigation and mega-menu structure. `mega_menu_slug` on a top-level item
-- names another menu (by slug) to show as a dropdown/mega panel when that item is active.

CREATE TABLE IF NOT EXISTS menus (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_menus_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id INT UNSIGNED NOT NULL,
    parent_id INT UNSIGNED NULL,
    label VARCHAR(150) NOT NULL,
    url_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
    internal_path VARCHAR(255) NULL,
    external_url VARCHAR(500) NULL,
    icon VARCHAR(50) NULL,
    mega_menu_slug VARCHAR(100) NULL,
    display_order INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    open_new_tab TINYINT(1) NOT NULL DEFAULT 0,
    is_highlighted TINYINT(1) NOT NULL DEFAULT 0,
    mega_column VARCHAR(150) NULL,
    show_desktop TINYINT(1) NOT NULL DEFAULT 1,
    show_mobile TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_menu_items_menu (menu_id),
    KEY idx_menu_items_parent (parent_id),
    KEY idx_menu_items_order (display_order),
    CONSTRAINT fk_menu_items_menu FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_items_parent FOREIGN KEY (parent_id) REFERENCES menu_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
