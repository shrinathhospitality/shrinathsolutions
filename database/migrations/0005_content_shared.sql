-- Shared, polymorphic tables reused by pages, services, and SEO pages:
-- seo_meta and faqs attach to any entity_type/entity_id pair. redirects is standalone.

CREATE TABLE IF NOT EXISTS seo_meta (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT UNSIGNED NOT NULL,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    canonical_url VARCHAR(500) NULL,
    og_title VARCHAR(255) NULL,
    og_description VARCHAR(500) NULL,
    og_image VARCHAR(500) NULL,
    twitter_title VARCHAR(255) NULL,
    twitter_description VARCHAR(500) NULL,
    twitter_image VARCHAR(500) NULL,
    robots_index TINYINT(1) NOT NULL DEFAULT 1,
    robots_follow TINYINT(1) NOT NULL DEFAULT 1,
    schema_json MEDIUMTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seo_meta_entity (entity_type, entity_id),
    UNIQUE KEY uq_seo_meta_canonical (canonical_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT UNSIGNED NOT NULL,
    question VARCHAR(500) NOT NULL,
    answer MEDIUMTEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_faqs_entity (entity_type, entity_id),
    KEY idx_faqs_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redirects (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_url VARCHAR(500) NOT NULL,
    destination_url VARCHAR(500) NOT NULL,
    redirect_type ENUM('301', '302') NOT NULL DEFAULT '301',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_redirects_source (source_url),
    KEY idx_redirects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
