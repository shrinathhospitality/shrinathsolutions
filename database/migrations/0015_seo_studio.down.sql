-- Rollback for 0015_seo_studio.sql. Run via: php database/rollback.php 0015_seo_studio.sql
DROP TABLE IF EXISTS seo_global_settings;
DROP TABLE IF EXISTS seo_link_index;
DROP TABLE IF EXISTS seo_analysis_history;
DROP TABLE IF EXISTS seo_content_analysis;
