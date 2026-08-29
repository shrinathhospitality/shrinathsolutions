-- Ventures CMS: promotes Venture pages from static React data (src/data/ventures.ts) + a
-- registry-only "virtual" SEO document to a real, admin-editable content type — the same tier
-- as services/blog_posts/seo_pages. This is NOT a new SEO system: `ventures` rows plug into the
-- existing seo_meta/seo_documents/seo_content_analysis tables exactly like every other content
-- type (see api/lib/seo/documents.php, input.php, dashboard.php for the wiring).
--
-- venture_key is the stable identity carried over unchanged from the existing seo_documents
-- document_key values (e.g. "venture:shrinath-rubber-stamp") — see seo_document_key()'s
-- venture branch, which derives the key from the route/slug unconditionally (never from the
-- new integer id) specifically so this migration cannot change any of the 9 existing keys.

CREATE TABLE IF NOT EXISTS ventures (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venture_key VARCHAR(190) NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100) NULL,
    slug VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) NOT NULL,
    category VARCHAR(150) NOT NULL,
    summary TEXT NOT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    layout_variant VARCHAR(50) NOT NULL,
    primary_color VARCHAR(30) NOT NULL,
    secondary_color VARCHAR(30) NOT NULL,
    accent_color VARCHAR(30) NOT NULL,
    background_color VARCHAR(30) NOT NULL,
    surface_color VARCHAR(30) NOT NULL,
    text_color VARCHAR(30) NOT NULL,
    muted_color VARCHAR(30) NOT NULL,
    on_primary_color VARCHAR(30) NOT NULL,
    logo_image VARCHAR(500) NULL,
    hero_image VARCHAR(500) NULL,
    phone_numbers_json MEDIUMTEXT NULL,
    email VARCHAR(255) NULL,
    website_url VARCHAR(500) NULL,
    google_business_url VARCHAR(500) NULL,
    cta_label VARCHAR(100) NULL,
    cta_url VARCHAR(500) NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    archived_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ventures_key (venture_key),
    UNIQUE KEY uq_ventures_slug (slug),
    KEY idx_ventures_status (status),
    KEY idx_ventures_category (category),
    KEY idx_ventures_order (sort_order),
    CONSTRAINT fk_ventures_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT fk_ventures_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venture_services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venture_id INT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_venture_services_venture (venture_id, sort_order),
    CONSTRAINT fk_venture_services_venture FOREIGN KEY (venture_id) REFERENCES ventures (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venture_highlights (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venture_id INT UNSIGNED NOT NULL,
    highlight_text VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_venture_highlights_venture (venture_id, sort_order),
    CONSTRAINT fk_venture_highlights_venture FOREIGN KEY (venture_id) REFERENCES ventures (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- section_type/layout_variant/settings_json are intentionally unused by the 9 migrated rows
-- (their existing sections are all plain heading+body, matching src/types/venture.ts's
-- VentureSection shape exactly) but are here so the admin editor can offer richer section
-- types for *new* Ventures without another migration — see docs/VENTURES_CMS_ARCHITECTURE.md.
CREATE TABLE IF NOT EXISTS venture_sections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venture_id INT UNSIGNED NOT NULL,
    section_key VARCHAR(100) NULL,
    section_type VARCHAR(50) NOT NULL DEFAULT 'rich_text',
    heading VARCHAR(255) NOT NULL,
    subheading VARCHAR(255) NULL,
    body_html MEDIUMTEXT NULL,
    image_url VARCHAR(500) NULL,
    layout_variant VARCHAR(50) NULL,
    settings_json MEDIUMTEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_venture_sections_venture (venture_id, sort_order),
    CONSTRAINT fk_venture_sections_venture FOREIGN KEY (venture_id) REFERENCES ventures (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FAQs deliberately reuse the existing shared `faqs` table (entity_type='venture') rather than
-- a new venture_faqs table — every other content type's FAQs already live there, get_faqs()/
-- save_faqs() already work generically, and the SEO engine's hasFaq check
-- (get_faqs($pdo, $contentType, $contentId) in api/lib/seo/analyze.php) needs no new wiring.

-- media_url (a path/URL string) rather than a media_id FK — this project has no Media table
-- foreign-key convention anywhere else (services/seo_pages/blog_posts/portfolio_projects all
-- store `featured_image VARCHAR(500)` as a plain path); matching that existing convention
-- rather than introducing a new one for Ventures alone.
CREATE TABLE IF NOT EXISTS venture_media (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venture_id INT UNSIGNED NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_role VARCHAR(30) NOT NULL DEFAULT 'gallery',
    alt_text VARCHAR(255) NULL,
    caption VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_venture_media_venture (venture_id, sort_order),
    CONSTRAINT fk_venture_media_venture FOREIGN KEY (venture_id) REFERENCES ventures (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
