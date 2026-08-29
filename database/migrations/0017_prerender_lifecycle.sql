-- Closes the prerender lifecycle loop for real "building"/"failed" tracking
-- (docs/SEO_STUDIO_ARCHITECTURE.md Part 4). prerender_status itself already supports these
-- values (0016_seo_documents.sql's ENUM) — nothing sets them yet. This adds the columns needed
-- to know *which* build a document is/was mid-way through, when it started/finished, and a
-- safe (no filesystem paths, no secrets) reason when it failed or was marked stale.

ALTER TABLE seo_documents
    ADD COLUMN prerender_build_id VARCHAR(64) NULL AFTER prerender_status,
    ADD COLUMN prerender_started_at TIMESTAMP NULL AFTER prerender_build_id,
    ADD COLUMN prerender_completed_at TIMESTAMP NULL AFTER prerender_started_at,
    ADD COLUMN prerender_failure_reason VARCHAR(255) NULL AFTER prerender_completed_at,
    ADD COLUMN stale_reason VARCHAR(255) NULL AFTER prerender_failure_reason,
    ADD COLUMN last_successful_prerender_at TIMESTAMP NULL AFTER stale_reason,
    ADD KEY idx_seo_documents_build_id (prerender_build_id);
