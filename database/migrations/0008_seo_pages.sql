-- SEO landing pages: keyword-targeted long-form pages, separate from the generic
-- Pages module and from Services. SEO fields (meta/OG/twitter/robots/schema) live in seo_meta.

CREATE TABLE IF NOT EXISTS seo_pages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_page_slug VARCHAR(255) NULL,
    primary_keyword VARCHAR(255) NULL,
    secondary_keywords_json MEDIUMTEXT NULL,
    search_intent VARCHAR(100) NULL,
    target_location VARCHAR(150) NULL,
    h1 VARCHAR(255) NOT NULL,
    hero_content TEXT NULL,
    content_sections_json MEDIUMTEXT NULL,
    internal_links_json MEDIUMTEXT NULL,
    related_services_json MEDIUMTEXT NULL,
    cta_heading VARCHAR(255) NULL,
    cta_body TEXT NULL,
    featured_image VARCHAR(500) NULL,
    breadcrumb_json MEDIUMTEXT NULL,
    status ENUM('draft', 'published', 'scheduled', 'archived') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seo_pages_slug (slug),
    KEY idx_seo_pages_status (status),
    KEY idx_seo_pages_published (published_at),
    KEY idx_seo_pages_location (target_location),
    CONSTRAINT fk_seo_pages_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT fk_seo_pages_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
