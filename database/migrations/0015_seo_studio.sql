-- Shrinath SEO Studio: content-analysis, analysis-history, internal-link-index and global
-- settings tables. `content_type` values intentionally reuse the exact strings already used
-- as `seo_meta.entity_type` ('page', 'service', 'seo_page', 'blog_post', 'portfolio_project')
-- so an analysis row's identity lines up 1:1 with its existing seo_meta row — no new mapping
-- layer. Scores are never editable directly by an API client: every score column here is only
-- ever written by api/lib/seo/scorer.php, never accepted as raw input from a request body.

CREATE TABLE IF NOT EXISTS seo_content_analysis (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id INT UNSIGNED NOT NULL,
    primary_keyphrase VARCHAR(255) NULL,
    related_keyphrases_json MEDIUMTEXT NULL,
    synonyms_json MEDIUMTEXT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    seo_score TINYINT UNSIGNED NULL,
    readability_score TINYINT UNSIGNED NULL,
    overall_score TINYINT UNSIGNED NULL,
    score_status ENUM('good', 'needs_improvement', 'poor', 'not_analyzed') NOT NULL DEFAULT 'not_analyzed',
    checks_json MEDIUMTEXT NULL,
    content_hash CHAR(64) NULL,
    engine_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    is_cornerstone TINYINT(1) NOT NULL DEFAULT 0,
    page_type VARCHAR(50) NULL,
    last_analyzed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seo_content_analysis_content (content_type, content_id),
    KEY idx_seo_content_analysis_status (score_status),
    KEY idx_seo_content_analysis_cornerstone (is_cornerstone),
    KEY idx_seo_content_analysis_keyphrase (primary_keyphrase),
    KEY idx_seo_content_analysis_analyzed (last_analyzed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A limited, rolling history — see SEO_STUDIO_ANALYSIS_HISTORY_LIMIT in api/lib/seo/history.php
-- for the cleanup that keeps this from growing unbounded (default: 20 rows per content item).
CREATE TABLE IF NOT EXISTS seo_analysis_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id INT UNSIGNED NOT NULL,
    seo_score TINYINT UNSIGNED NULL,
    readability_score TINYINT UNSIGNED NULL,
    overall_score TINYINT UNSIGNED NULL,
    checks_json MEDIUMTEXT NULL,
    content_hash CHAR(64) NULL,
    engine_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    analyzed_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_seo_analysis_history_content (content_type, content_id, created_at),
    CONSTRAINT fk_seo_analysis_history_user FOREIGN KEY (analyzed_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Internal-link index, rebuilt from stored content on save (and via a bulk rebuild endpoint).
-- One row per link occurrence, not per page pair, so anchor text and fragment are preserved.
CREATE TABLE IF NOT EXISTS seo_link_index (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_content_type VARCHAR(50) NOT NULL,
    source_content_id INT UNSIGNED NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    target_url_normalized VARCHAR(500) NOT NULL,
    target_content_type VARCHAR(50) NULL,
    target_content_id INT UNSIGNED NULL,
    anchor_text VARCHAR(500) NULL,
    is_internal TINYINT(1) NOT NULL DEFAULT 1,
    target_status ENUM('ok', 'redirect', 'broken', 'unknown') NOT NULL DEFAULT 'unknown',
    last_checked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_seo_link_index_source (source_content_type, source_content_id),
    KEY idx_seo_link_index_target_normalized (target_url_normalized),
    KEY idx_seo_link_index_target_content (target_content_type, target_content_id),
    KEY idx_seo_link_index_status (target_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_global_settings (
    setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value MEDIUMTEXT NULL,
    updated_by INT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_seo_global_settings_user FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
