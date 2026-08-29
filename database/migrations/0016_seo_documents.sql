-- SEO Document Registry: one row per legitimate public route, whether or not it has a
-- database row of its own (static React pages, Venture pages) — the admin-side aggregation
-- layer SEO Studio's generic editor, dashboard and "all content" inventory read from. This is
-- NOT a new metadata store and NOT a new route source: real SEO field values still live in the
-- existing seo_meta table (see the seo_meta.document_id association added below); real route
-- validity still comes from api/lib/route_manifest.php; the public site's rendering pipeline
-- (Seo.tsx, the public API controllers) is completely unchanged by this table's existence.

CREATE TABLE IF NOT EXISTS seo_documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_key VARCHAR(190) NOT NULL,
    route_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id INT UNSIGNED NULL,
    source_type ENUM('database', 'static_route', 'venture_data') NOT NULL DEFAULT 'database',
    source_id VARCHAR(100) NULL,
    page_profile VARCHAR(50) NULL,
    display_name VARCHAR(255) NOT NULL,
    is_dynamic TINYINT(1) NOT NULL DEFAULT 0,
    is_indexable TINYINT(1) NOT NULL DEFAULT 1,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    seo_editable TINYINT(1) NOT NULL DEFAULT 1,
    content_editable TINYINT(1) NOT NULL DEFAULT 0,
    canonical_route VARCHAR(500) NOT NULL,
    content_hash CHAR(64) NULL,
    prerender_hash CHAR(64) NULL,
    prerender_status ENUM('current', 'stale', 'building', 'failed', 'not_applicable') NOT NULL DEFAULT 'not_applicable',
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seo_documents_key (document_key),
    UNIQUE KEY uq_seo_documents_route (route_path),
    KEY idx_seo_documents_content (content_type, content_id),
    KEY idx_seo_documents_indexable (is_indexable),
    KEY idx_seo_documents_prerender_status (prerender_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Association only — seo_meta stays the single metadata store. Nullable and independently
-- indexed so existing entity_type/entity_id lookups (every current controller) are completely
-- unaffected; document_id is populated by the registry backfill (api/lib/seo/documents.php)
-- for both real content rows (matched by content_type+content_id) and new route-only rows
-- (a fresh seo_meta row keyed entity_type='seo_document', entity_id=seo_documents.id, so the
-- pre-existing UNIQUE KEY uq_seo_meta_entity still guarantees exactly one metadata row per
-- document — no second uniqueness mechanism needed).
ALTER TABLE seo_meta
    ADD COLUMN document_id INT UNSIGNED NULL AFTER entity_id,
    ADD UNIQUE KEY uq_seo_meta_document (document_id),
    ADD CONSTRAINT fk_seo_meta_document FOREIGN KEY (document_id) REFERENCES seo_documents (id) ON DELETE SET NULL;

-- Redirect Manager completion: additional status codes + lightweight, atomic hit tracking.
-- hit_count is incremented via a single `UPDATE ... SET hit_count = hit_count + 1` on lookup
-- (api/controllers/RedirectController.php) — atomic in MySQL without needing a separate
-- buffering/queue layer at this project's traffic scale; see SEO_STUDIO_ARCHITECTURE.md.
ALTER TABLE redirects
    MODIFY COLUMN redirect_type ENUM('301', '302', '307', '308') NOT NULL DEFAULT '301',
    ADD COLUMN hit_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER notes,
    ADD COLUMN last_hit_at DATETIME NULL AFTER hit_count,
    ADD COLUMN last_referrer VARCHAR(500) NULL AFTER last_hit_at;
