<?php
// Retention cleanup for the seo_audits table (see database/migrations/0019_seo_audits.sql and
// docs/SEO_STUDIO_ARCHITECTURE.md's "SEO Audit Tool persistence / retention" section).
//
// Default retention policy (override with the flags below if the business needs differ):
//   - Failed anonymous audits (no lead_email):     30 days
//   - Completed anonymous audits (no lead_email):  90 days
//   - Audits with a contact lead (lead_email set):  follow the existing enquiry retention
//                                                    policy — see docs/SEO_STUDIO_ARCHITECTURE.md;
//                                                    defaults to 365 days here, override with
//                                                    --lead-days if that policy changes.
//
// This script NEVER deletes anything by default — it only counts matching rows (dry run) until
// both --apply and --confirmed-backup are passed, exactly like scripts/seo-seed-analysis.php's
// existing safety pattern. It is never invoked automatically (no cron entry exists for it) —
// running it is an explicit admin/CLI decision.
//
// Usage:
//   php scripts/seo-audits-cleanup.php                          # dry run, default cutoffs
//   php scripts/seo-audits-cleanup.php --failed-days=30 --completed-days=90 --lead-days=365
//   php scripts/seo-audits-cleanup.php --apply --confirmed-backup

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit(1);
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/validate.php';
require __DIR__ . '/../api/lib/audit.php';
require __DIR__ . '/../api/models/SeoAudit.php';

$opts = getopt('', ['apply', 'confirmed-backup', 'failed-days::', 'completed-days::', 'lead-days::']);

$apply = isset($opts['apply']);
if ($apply && !isset($opts['confirmed-backup'])) {
    fwrite(STDERR, "ERROR: --apply requires --confirmed-backup. Refusing to run.\n");
    exit(1);
}

$failedDays = isset($opts['failed-days']) ? max(1, (int) $opts['failed-days']) : 30;
$completedDays = isset($opts['completed-days']) ? max(1, (int) $opts['completed-days']) : 90;
$leadDays = isset($opts['lead-days']) ? max(1, (int) $opts['lead-days']) : 365;

$pdo = get_db_connection();

$counts = seo_audits_cleanup_candidates($pdo, $failedDays, $completedDays, $leadDays);
$cutoffFailed = date('Y-m-d', strtotime("-{$failedDays} days"));
$cutoffCompleted = date('Y-m-d', strtotime("-{$completedDays} days"));
$cutoffLead = date('Y-m-d', strtotime("-{$leadDays} days"));

echo "SEO audits cleanup — " . ($apply ? "APPLYING" : "DRY RUN (no rows will be deleted)") . "\n";
echo "  Anonymous failed audits older than {$failedDays}d (before {$cutoffFailed}): {$counts['anonymous_failed']} row(s)\n";
echo "  Anonymous completed audits older than {$completedDays}d (before {$cutoffCompleted}): {$counts['anonymous_completed']} row(s)\n";
echo "  Contact-lead audits older than {$leadDays}d (before {$cutoffLead}): {$counts['leads']} row(s)\n";

if (!$apply) {
    echo "\nNo rows deleted (dry run). Re-run with --apply --confirmed-backup to actually delete.\n";
    exit(0);
}

$deletedFailed = seo_audits_cleanup_delete($pdo, 'anonymous_failed', $failedDays);
$deletedCompleted = seo_audits_cleanup_delete($pdo, 'anonymous_completed', $completedDays);
$deletedLeads = seo_audits_cleanup_delete($pdo, 'leads', $leadDays);

echo "\nDeleted {$deletedFailed} anonymous failed, {$deletedCompleted} anonymous completed, {$deletedLeads} contact-lead row(s).\n";

try {
    audit_log($pdo, null, 'seo_audits_cleanup', null, null, "failed=$deletedFailed completed=$deletedCompleted leads=$deletedLeads (cutoffs: {$failedDays}d/{$completedDays}d/{$leadDays}d)");
} catch (\Throwable $e) {
    fwrite(STDERR, "Warning: cleanup ran but audit_log() failed: {$e->getMessage()}\n");
}
