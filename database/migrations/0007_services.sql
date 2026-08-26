-- Service pages. blocks_json holds an ordered array of the same Block shapes
-- ServicePage.tsx already renders (paras/cards/steps/kv/pills/ticks/image) — reusing the
-- existing template and design system exactly, no new renderer needed.

CREATE TABLE IF NOT EXISTS services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(150) NULL,
    hero_label VARCHAR(150) NULL,
    h1 VARCHAR(255) NOT NULL,
    hero_description TEXT NULL,
    hero_cta_label VARCHAR(100) NULL,
    hero_notes_json MEDIUMTEXT NULL,
    blocks_json MEDIUMTEXT NULL,
    related_json MEDIUMTEXT NULL,
    cta_heading VARCHAR(255) NULL,
    cta_body TEXT NULL,
    featured_image VARCHAR(500) NULL,
    icon VARCHAR(50) NULL,
    display_order INT NOT NULL DEFAULT 0,
    menu_visibility TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('draft', 'published', 'scheduled', 'archived') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_services_slug (slug),
    KEY idx_services_status (status),
    KEY idx_services_category (category),
    KEY idx_services_order (display_order),
    KEY idx_services_published (published_at),
    CONSTRAINT fk_services_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT fk_services_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
