-- Rollback for 0016_seo_documents.sql. Run via: php database/rollback.php 0016_seo_documents.sql
-- Caveat: narrowing redirect_type back to 301/302 will fail (or silently coerce, depending on
-- SQL mode) if any row currently stores 307/308 — reassign those rows to 301/302 by hand first.
ALTER TABLE redirects
    DROP COLUMN last_referrer,
    DROP COLUMN last_hit_at,
    DROP COLUMN hit_count,
    MODIFY COLUMN redirect_type ENUM('301', '302') NOT NULL DEFAULT '301';

ALTER TABLE seo_meta
    DROP FOREIGN KEY fk_seo_meta_document,
    DROP KEY uq_seo_meta_document,
    DROP COLUMN document_id;

DROP TABLE IF EXISTS seo_documents;
