-- Persists results from the public "Free SEO Audit Tool" (api/seo-toolkit/*) into the main
-- database so admins can see tool usage and any lead contact info submitted with a run. The
-- toolkit itself keeps writing its own short-lived JSON files (used for the report/status
-- endpoints); this table is a permanent, admin-visible record written alongside that.
--
-- Privacy: this table intentionally stores NO raw visitor IP, NO browser user-agent, and NO
-- full submitted URL (query strings and fragments are stripped before storage — see
-- normalize_audit_url() in api/models/SeoAudit.php). Only a redacted, normalized URL
-- (scheme + host + non-default port + path) is kept, plus a SHA-256 hash of that same
-- normalized URL for fast lookups without needing a full-length index on the URL column.
--
-- result_summary_json uses TEXT rather than the MySQL/MariaDB-native JSON column type: this
-- keeps the schema identical across MySQL 5.7+ and MariaDB (whose JSON type is itself just an
-- alias for LONGTEXT), and the only writer is PHP's json_encode(), which always produces valid
-- JSON, so a native JSON type's validation adds no real safety here. The application layer
-- (build_seo_audit_summary() in api/models/SeoAudit.php) bounds its size before every insert.

CREATE TABLE IF NOT EXISTS seo_audits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    url_hash CHAR(64) NOT NULL,
    normalized_url VARCHAR(512) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    path VARCHAR(512) NOT NULL DEFAULT '/',
    status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    overall_score TINYINT UNSIGNED NULL,
    critical_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    warning_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    improvement_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    passed_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    result_summary_json TEXT NULL,
    safe_error_code VARCHAR(64) NULL,
    safe_error_message VARCHAR(255) NULL,
    lead_name VARCHAR(150) NULL,
    lead_email VARCHAR(255) NULL,
    lead_status ENUM('new', 'contacted', 'qualified', 'closed', 'not_interested') NULL,
    processing_time_ms INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seo_audits_request_id (request_id),
    KEY idx_seo_audits_url_hash (url_hash),
    KEY idx_seo_audits_domain (domain),
    KEY idx_seo_audits_status (status),
    KEY idx_seo_audits_lead_status (lead_status),
    KEY idx_seo_audits_created_at (created_at),
    KEY idx_seo_audits_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
