<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Bootstrap;
use App\Support\ApiException;
use App\Support\ApiResponse;
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

        try {
            $result = Bootstrap::analyzer()->analyze($validated['url']);
        } catch (ApiException $e) {
            $repo->saveFailed($id, 'audit', $e->getMessage());
            throw $e;
        } catch (\Throwable $e) {
            $repo->saveFailed($id, 'audit', 'Failed to analyze URL: ' . $e->getMessage());
            throw new ApiException('Failed to analyze the URL. It may be unreachable or blocked this request.', 503);
        }

        $repo->saveCompleted($id, 'audit', $result);

        ApiResponse::success(['id' => $id, 'status' => 'completed', 'result' => $result], null, 201);
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
