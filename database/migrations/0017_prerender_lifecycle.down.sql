ALTER TABLE seo_documents
    DROP KEY idx_seo_documents_build_id,
    DROP COLUMN last_successful_prerender_at,
    DROP COLUMN stale_reason,
    DROP COLUMN prerender_failure_reason,
    DROP COLUMN prerender_completed_at,
    DROP COLUMN prerender_started_at,
    DROP COLUMN prerender_build_id;
