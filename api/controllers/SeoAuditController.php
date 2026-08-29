<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/seo/permissions.php';

// Permission mapping for this feature (reusing the existing SEO Studio capability set — see
// api/lib/seo/permissions.php; no new permission was introduced):
//   - seo.view            : view audit history (list + detail)
//   - seo.edit_metadata   : the closest existing "edit content" capability, reused for the one
//                           mutation a lead record supports (its status)
//   - seo.manage_settings : the closest existing high-trust capability, reused for delete —
//                           deleting an audit record is treated the same as any other
//                           destructive admin-configuration action

function seo_audits_admin_list(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $params = pagination_params();
    $params['lead'] = trim((string) ($_GET['lead'] ?? ''));
    $params['score_status'] = trim((string) ($_GET['score_status'] ?? ''));

    $result = list_seo_audits($pdo, $params);
    json_success([
        'audits' => $result['items'],
        'meta' => pagination_meta($result['total'], $params['page'], $params['per_page']),
        'leads_count' => seo_audit_leads_count($pdo),
    ]);
}

function seo_audits_admin_detail(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $id = (int) $params['id'];
    $audit = find_seo_audit($pdo, $id);
    if (!$audit) {
        json_error('Audit not found.', 404);
    }

    $audit['result_summary'] = $audit['result_summary_json'] !== null ? json_decode($audit['result_summary_json'], true) : null;
    unset($audit['result_summary_json']);

    json_success(['audit' => $audit]);
}

function seo_audits_admin_update_lead_status(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.edit_metadata');

    $id = (int) $params['id'];
    if (!find_seo_audit($pdo, $id)) {
        json_error('Audit not found.', 404);
    }

    $body = read_json_body();
    $status = is_string($body['lead_status'] ?? null) ? $body['lead_status'] : '';
    if (!in_array($status, SEO_AUDIT_LEAD_STATUSES, true)) {
        json_error('lead_status must be one of: ' . implode(', ', SEO_AUDIT_LEAD_STATUSES), 422);
    }

    $updated = update_seo_audit_lead_status($pdo, $id, $status);
    if (!$updated) {
        json_error('This audit has no contact lead to update.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'seo_audit_lead', (string) $id, 'lead_status=' . $status);
    json_success();
}

function seo_audits_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_settings');

    $id = (int) $params['id'];
    if (!find_seo_audit($pdo, $id)) {
        json_error('Audit not found.', 404);
    }

    delete_seo_audit($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'seo_audit', (string) $id);

    json_success();
}

function seo_audits_admin_export(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $stmt = $pdo->query(
        "SELECT normalized_url, domain, status, overall_score, critical_count, warning_count, improvement_count,
                passed_count, lead_name, lead_email, lead_status, created_at
         FROM seo_audits ORDER BY created_at DESC"
    );

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="seo-audits.csv"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ['URL', 'Domain', 'Status', 'Score', 'Critical', 'Warnings', 'Improvements', 'Passed', 'Lead Name', 'Lead Email', 'Lead Status', 'Run At']);
    foreach ($stmt->fetchAll() as $r) {
        fputcsv($out, array_map('csv_safe', [
            $r['normalized_url'], $r['domain'], $r['status'], $r['overall_score'],
            $r['critical_count'], $r['warning_count'], $r['improvement_count'], $r['passed_count'],
            $r['lead_name'], $r['lead_email'], $r['lead_status'], $r['created_at'],
        ]));
    }
    fclose($out);
    exit;
}
