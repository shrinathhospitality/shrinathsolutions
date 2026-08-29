<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Bootstrap;
use App\Support\ApiException;
use App\Support\ApiResponse;
use App\Support\Logger;
use App\Support\RequestBody;
use App\Validation\AuditRequestValidator;

/**
 * PHP port of server/src/routes/analyze.ts, normalized to a REST-ish
 * audit-resource shape (spec §12). Analysis is single-page and fast enough
 * to run synchronously within the request — see the conversion plan for why
 * no real async job queue was built (the Node version never had one either).
 */
final class AuditController
{
    /** @param array<string, string> $params */
    public function create(array $params): void
    {
        Bootstrap::rateLimiter()->check('audits', Bootstrap::config()['rateLimits']['audits']['limit'], Bootstrap::config()['rateLimits']['audits']['windowSeconds']);

        $body = RequestBody::json();
        $validated = AuditRequestValidator::validate($body);

        $repo = Bootstrap::auditRepository();
        $id = $repo->generateId();

        // Lifecycle step: one 'processing' row per accepted request, created before analysis
        // starts — see api/models/SeoAudit.php. Best-effort: a main-database hiccup must never
        // block the public tool, so failure here just means no admin-visible row exists,
        // never an error surfaced to the caller. $mainDbAuditRowId stays null in that case,
        // and the completion/failure step below simply no-ops.
        $mainDbAuditRowId = $this->createMainDatabaseRow($id, $validated);
        $startedAt = microtime(true);

        try {
            $result = Bootstrap::analyzer()->analyze($validated['url']);
        } catch (ApiException $e) {
            $repo->saveFailed($id, 'audit', $e->getMessage());
            $this->failMainDatabaseRow($mainDbAuditRowId, $e->getMessage(), $startedAt);
            throw $e;
        } catch (\Throwable $e) {
            // Never persist $e->getMessage() here — it isn't a curated public-facing string
            // like an ApiException's, so it can't be trusted not to contain internal detail.
            Logger::warning('Unexpected audit analysis failure', ['error' => $e->getMessage()]);
            $repo->saveFailed($id, 'audit', 'Failed to analyze URL: ' . $e->getMessage());
            $this->failMainDatabaseRow($mainDbAuditRowId, 'The analysis could not be completed for this URL.', $startedAt);
            throw new ApiException('Failed to analyze the URL. It may be unreachable or blocked this request.', 503);
        }

        $repo->saveCompleted($id, 'audit', $result);
        $this->completeMainDatabaseRow($mainDbAuditRowId, $result, $startedAt);

        ApiResponse::success(['id' => $id, 'status' => 'completed', 'result' => $result], null, 201);
    }

    /**
     * Creates the permanent, admin-visible 'processing' row for this request — best-effort,
     * purely for admin visibility. This tool's own JSON-file storage (self-expiring after
     * AUDIT_RETENTION_HOURS) remains the source of truth for the /report and /status
     * endpoints regardless of whether this succeeds. Only a redacted, normalized URL is ever
     * stored — no raw IP, no user-agent, no query string (see normalize_audit_url()).
     *
     * @param array{url: string, leadName: ?string, leadEmail: ?string} $validated
     * @return int|null the new row's id, or null if the row couldn't be created (main DB
     *                   unavailable, or the URL failed to normalize into a safe form)
     */
    private function createMainDatabaseRow(string $requestId, array $validated): ?int
    {
        try {
            if (!$this->loadMainDatabaseSupport()) {
                return null;
            }

            $normalized = normalize_audit_url($validated['url']);
            if ($normalized === null) {
                return null; // couldn't be safely normalized — don't store anything for it
            }

            return create_seo_audit(get_db_connection(), [
                'request_id' => $requestId,
                'url_hash' => $normalized['url_hash'],
                'normalized_url' => $normalized['normalized_url'],
                'domain' => $normalized['domain'],
                'path' => $normalized['path'],
                'lead_name' => $validated['leadName'],
                'lead_email' => $validated['leadEmail'],
            ]);
        } catch (\Throwable $e) {
            Logger::warning('Failed to create seo_audits row', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function completeMainDatabaseRow(?int $rowId, array $result, float $startedAt): void
    {
        if ($rowId === null) {
            return;
        }
        try {
            $this->loadMainDatabaseSupport();
            $processingTimeMs = (int) round((microtime(true) - $startedAt) * 1000);
            complete_seo_audit(get_db_connection(), $rowId, $result, $processingTimeMs);
        } catch (\Throwable $e) {
            Logger::warning('Failed to complete seo_audits row', ['error' => $e->getMessage()]);
        }
    }

    private function failMainDatabaseRow(?int $rowId, string $safeMessage, float $startedAt): void
    {
        if ($rowId === null) {
            return;
        }
        try {
            $this->loadMainDatabaseSupport();
            $processingTimeMs = (int) round((microtime(true) - $startedAt) * 1000);
            fail_seo_audit(get_db_connection(), $rowId, $safeMessage, $processingTimeMs);
        } catch (\Throwable $e) {
            Logger::warning('Failed to mark seo_audits row failed', ['error' => $e->getMessage()]);
        }
    }

    private function loadMainDatabaseSupport(): bool
    {
        $mainDbConfig = __DIR__ . '/../../../config/db.php';
        $mainDbModel = __DIR__ . '/../../../models/SeoAudit.php';
        if (!is_file($mainDbConfig) || !is_file($mainDbModel)) {
            return false;
        }
        require_once $mainDbConfig;
        require_once $mainDbModel;
        return true;
    }

    /** @param array<string, string> $params */
    public function show(array $params): void
    {
        Bootstrap::rateLimiter()->check('status', Bootstrap::config()['rateLimits']['status']['limit'], Bootstrap::config()['rateLimits']['status']['windowSeconds']);

        $record = $this->findOrFail($params['id']);
        ApiResponse::success($record);
    }

    /** @param array<string, string> $params */
    public function status(array $params): void
    {
        Bootstrap::rateLimiter()->check('status', Bootstrap::config()['rateLimits']['status']['limit'], Bootstrap::config()['rateLimits']['status']['windowSeconds']);

        $record = $this->findOrFail($params['id']);
        ApiResponse::success([
            'status' => $record['status'],
            'progress' => $record['status'] === 'completed' ? 100 : 0,
        ]);
    }

    /** @param array<string, string> $params */
    public function report(array $params): void
    {
        Bootstrap::rateLimiter()->check('pdf', Bootstrap::config()['rateLimits']['pdf']['limit'], Bootstrap::config()['rateLimits']['pdf']['windowSeconds']);

        $record = $this->findOrFail($params['id']);
        if ($record['status'] !== 'completed' || $record['result'] === null) {
            throw new ApiException('This audit has no completed result to report on.', 409);
        }

        $storageRoot = Bootstrap::config()['storage']['root'];
        $reportsDir = $storageRoot . '/reports';
        if (!is_dir($reportsDir)) {
            mkdir($reportsDir, 0750, true);
        }
        $reportPath = $reportsDir . '/audit-' . $params['id'] . '.pdf';

        $maxAge = (int) Bootstrap::config()['storage']['reportRetentionHours'] * 3600;
        if (!is_file($reportPath) || (time() - (int) filemtime($reportPath)) > $maxAge) {
            $pdf = Bootstrap::pdfGenerator()->generateAuditReport($record['result']);
            file_put_contents($reportPath, $pdf);
        } else {
            $pdf = file_get_contents($reportPath);
            if ($pdf === false) {
                throw new ApiException('Failed to generate the PDF report.', 500);
            }
        }

        $domain = preg_replace('/[^a-z0-9.-]/i', '-', (string) $record['result']['domain']);
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="seo-report-' . str_replace('.', '-', (string) $domain) . '.pdf"');
        header('Content-Length: ' . strlen($pdf));
        echo $pdf;
        exit;
    }

    /** @return array<string, mixed> */
    private function findOrFail(string $id): array
    {
        $record = Bootstrap::auditRepository()->find($id);
        if ($record === null) {
            throw new ApiException('Audit not found.', 404);
        }
        if ($record['status'] === 'expired') {
            throw new ApiException('This audit result has expired. Please run a new analysis.', 404);
        }
        return $record;
    }
}
