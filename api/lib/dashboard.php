<?php
// Site-wide admin dashboard summary — distinct from api/lib/seo/dashboard.php (SEO Studio's own
// dashboard), which this reuses wholesale for every SEO-related figure rather than recomputing
// it a second way. One bundled endpoint (counts + recent activity + attention lists) rather than
// several, so the dashboard page makes exactly one request.

declare(strict_types=1);

/** Content-type row counts via a single UNION ALL query (spec §2: "small number of aggregate
 *  queries", not one query per content type). */
function admin_dashboard_content_counts(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT 'pages' AS t, COUNT(*) AS total, SUM(status = 'published') AS published, SUM(status = 'draft') AS draft FROM pages
        UNION ALL
        SELECT 'services', COUNT(*), SUM(status = 'published'), SUM(status = 'draft') FROM services
        UNION ALL
        SELECT 'seo_pages', COUNT(*), SUM(status = 'published'), SUM(status = 'draft') FROM seo_pages
        UNION ALL
        SELECT 'blog_posts', COUNT(*), SUM(status = 'published'), SUM(status = 'draft') FROM blog_posts
        UNION ALL
        SELECT 'portfolio_projects', COUNT(*), SUM(status = 'published'), SUM(status = 'draft') FROM portfolio_projects
        UNION ALL
        SELECT 'ventures', COUNT(*), SUM(status = 'published'), SUM(status = 'draft') FROM ventures
    ");
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $out[$r['t']] = ['total' => (int) $r['total'], 'published' => (int) $r['published'], 'draft' => (int) $r['draft']];
    }
    return $out;
}

function admin_dashboard_summary(PDO $pdo): array
{
    $content = admin_dashboard_content_counts($pdo);

    $leads = $pdo->query("
        SELECT
            (SELECT COUNT(*) FROM contact_enquiries WHERE status = 'new') AS new_enquiries,
            (SELECT COUNT(*) FROM proposal_requests WHERE status = 'new') AS new_proposals,
            (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed') AS subscribers
    ")->fetch();

    $testimonials = (int) $pdo->query('SELECT COUNT(*) FROM testimonials')->fetchColumn();
    $mediaFiles = (int) $pdo->query('SELECT COUNT(*) FROM media_files')->fetchColumn();
    $ventureArchived = (int) $pdo->query("SELECT COUNT(*) FROM ventures WHERE status = 'archived'")->fetchColumn();

    // Guarded: migration 0019_seo_audits.sql may not be applied yet on every environment this
    // runs against (staging, a fresh clone) — a missing table here must never break the whole
    // dashboard summary the rest of this endpoint already provides.
    try {
        $seoAudits = seo_audit_dashboard_summary($pdo);
    } catch (\PDOException $e) {
        $seoAudits = null;
    }

    $seo = seo_dashboard_summary($pdo);
    $prerenderStale = (int) $pdo->query("SELECT COUNT(*) FROM seo_documents WHERE prerender_status IN ('stale', 'failed')")->fetchColumn();
    $diagnostics = seo_registry_diagnostics($pdo);
    $registryConflicts = count($diagnostics['duplicateNormalizedRoutes']) + count($diagnostics['manifestRoutesMissingFromRegistry']);
    $redirectConflicts = count($diagnostics['redirectSourceOverlap']);

    return [
        'content' => $content + ['ventures_archived' => $ventureArchived],
        'testimonials' => $testimonials,
        'media_files' => $mediaFiles,
        'leads' => [
            'new_enquiries' => (int) $leads['new_enquiries'],
            'new_proposals' => (int) $leads['new_proposals'],
            'newsletter_subscribers' => (int) $leads['subscribers'],
        ],
        'seo' => $seo,
        'seo_audits' => $seoAudits,
        'prerender_stale' => $prerenderStale,
        'registry_conflicts' => $registryConflicts,
        'redirect_conflicts' => $redirectConflicts,
    ];
}

/** Recent safe audit events — never returns full content bodies (audit_log() itself is never
 *  passed them; see api/lib/audit.php's own doc comment), only the short description string. */
function admin_dashboard_recent_activity(PDO $pdo, int $limit = 15): array
{
    $stmt = $pdo->prepare(
        "SELECT a.action, a.entity_type, a.entity_id, a.description, a.created_at, u.username AS admin_username
         FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id
         WHERE a.action NOT LIKE '%permission_denied'
         ORDER BY a.created_at DESC LIMIT :limit"
    );
    $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/** Bounded, actionable "needs attention" lists — a handful of items per category, each with
 *  enough identity (type/id/slug) for the frontend to link straight to the right editor. */
function admin_dashboard_attention(PDO $pdo, int $limitPerCategory = 5): array
{
    $draftUnion = "
        SELECT 'page' AS content_type, id, title AS name, slug, updated_at FROM pages WHERE status = 'draft'
        UNION ALL SELECT 'service', id, name, slug, updated_at FROM services WHERE status = 'draft'
        UNION ALL SELECT 'seo_page', id, title, slug, updated_at FROM seo_pages WHERE status = 'draft'
        UNION ALL SELECT 'blog_post', id, title, slug, updated_at FROM blog_posts WHERE status = 'draft'
        UNION ALL SELECT 'portfolio_project', id, title, slug, updated_at FROM portfolio_projects WHERE status = 'draft'
        UNION ALL SELECT 'venture', id, name, slug, updated_at FROM ventures WHERE status = 'draft'
        ORDER BY updated_at DESC LIMIT $limitPerCategory
    ";
    $draft = $pdo->query($draftUnion)->fetchAll();

    $poorScores = $pdo->prepare(
        "SELECT content_type, content_id, overall_score, primary_keyphrase
         FROM seo_content_analysis WHERE score_status = 'poor'
         ORDER BY overall_score ASC LIMIT :limit"
    );
    $poorScores->bindValue('limit', $limitPerCategory, PDO::PARAM_INT);
    $poorScores->execute();

    $missingMeta = $pdo->prepare(
        "SELECT entity_type, entity_id FROM seo_meta
         WHERE (meta_title IS NULL OR meta_title = '' OR meta_description IS NULL OR meta_description = '')
         ORDER BY updated_at DESC LIMIT :limit"
    );
    $missingMeta->bindValue('limit', $limitPerCategory, PDO::PARAM_INT);
    $missingMeta->execute();

    $stalePrerender = $pdo->prepare(
        "SELECT id, route_path, content_type, prerender_status, stale_reason FROM seo_documents
         WHERE prerender_status IN ('stale', 'failed') AND is_published = 1
         ORDER BY updated_at DESC LIMIT :limit"
    );
    $stalePrerender->bindValue('limit', $limitPerCategory, PDO::PARAM_INT);
    $stalePrerender->execute();

    $unansweredEnquiries = $pdo->prepare(
        "SELECT id, name, email, service, created_at FROM contact_enquiries
         WHERE status = 'new' ORDER BY created_at DESC LIMIT :limit"
    );
    $unansweredEnquiries->bindValue('limit', $limitPerCategory, PDO::PARAM_INT);
    $unansweredEnquiries->execute();

    return [
        'draft_content' => $draft,
        'poor_seo_scores' => $poorScores->fetchAll(),
        'missing_metadata' => $missingMeta->fetchAll(),
        'stale_prerender' => $stalePrerender->fetchAll(),
        'unanswered_enquiries' => $unansweredEnquiries->fetchAll(),
    ];
}
