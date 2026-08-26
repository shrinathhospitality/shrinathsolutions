-- Portfolio module.

CREATE TABLE IF NOT EXISTS portfolio_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_portfolio_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_projects (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(150) NULL,
    client_name VARCHAR(150) NULL,
    short_description VARCHAR(500) NULL,
    detailed_description MEDIUMTEXT NULL,
    services_provided_json MEDIUMTEXT NULL,
    technologies_used_json MEDIUMTEXT NULL,
    project_url VARCHAR(500) NULL,
    featured_image VARCHAR(500) NULL,
    completion_date DATE NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    results_json MEDIUMTEXT NULL,
    cta_heading VARCHAR(255) NULL,
    cta_body TEXT NULL,
    status ENUM('draft', 'published', 'scheduled', 'archived') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_portfolio_projects_slug (slug),
    KEY idx_portfolio_projects_status (status),
    KEY idx_portfolio_projects_category (category),
    KEY idx_portfolio_projects_order (display_order),
    CONSTRAINT fk_portfolio_projects_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT fk_portfolio_projects_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    portfolio_project_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_portfolio_images_project (portfolio_project_id),
    CONSTRAINT fk_portfolio_images_project FOREIGN KEY (portfolio_project_id) REFERENCES portfolio_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
