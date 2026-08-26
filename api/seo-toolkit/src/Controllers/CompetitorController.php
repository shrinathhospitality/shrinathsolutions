<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Bootstrap;
use App\Support\ApiException;
use App\Support\ApiResponse;
use App\Support\RequestBody;
use App\Validation\CompetitorRequestValidator;

/**
 * PHP port of server/src/routes/compare.ts, normalized to a REST-ish
 * comparison-resource shape (spec §12). Same synchronous-job model as
 * AuditController — see the conversion plan.
 */
final class CompetitorController
{
    /** @param array<string, string> $params */
    public function create(array $params): void
    {
        Bootstrap::rateLimiter()->check('competitors', Bootstrap::config()['rateLimits']['competitors']['limit'], Bootstrap::config()['rateLimits']['competitors']['windowSeconds']);

        $body = RequestBody::json();
        $validated = CompetitorRequestValidator::validate($body);

        $repo = Bootstrap::auditRepository();
        $id = $repo->generateId();

        try {
            $result = Bootstrap::competitorAnalyzer()->compareAll($validated['mainUrl'], $validated['competitors']);
        } catch (\Throwable $e) {
            $repo->saveFailed($id, 'competitor', 'Comparison failed: ' . $e->getMessage());
            throw new ApiException('Comparison failed. Please check the URLs and try again.', 503);
        }

        $repo->saveCompleted($id, 'competitor', $result);

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
            throw new ApiException('This comparison has no completed result to report on.', 409);
        }

        $storageRoot = Bootstrap::config()['storage']['root'];
        $reportsDir = $storageRoot . '/reports';
        if (!is_dir($reportsDir)) {
            mkdir($reportsDir, 0750, true);
        }
        $reportPath = $reportsDir . '/competitor-' . $params['id'] . '.pdf';

        $maxAge = (int) Bootstrap::config()['storage']['reportRetentionHours'] * 3600;
        if (!is_file($reportPath) || (time() - (int) filemtime($reportPath)) > $maxAge) {
            $pdf = Bootstrap::pdfGenerator()->generateComparisonReport($record['result']);
            file_put_contents($reportPath, $pdf);
        } else {
            $pdf = file_get_contents($reportPath);
            if ($pdf === false) {
                throw new ApiException('Failed to generate the PDF report.', 500);
            }
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="seo-competitor-analysis-report.pdf"');
        header('Content-Length: ' . strlen($pdf));
        echo $pdf;
        exit;
    }

    /** @return array<string, mixed> */
    private function findOrFail(string $id): array
    {
        $record = Bootstrap::auditRepository()->find($id);
        if ($record === null) {
            throw new ApiException('Comparison not found.', 404);
        }
        if ($record['status'] === 'expired') {
            throw new ApiException('This comparison result has expired. Please run a new comparison.', 404);
        }
        return $record;
    }
}
