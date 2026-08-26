<?php

declare(strict_types=1);

namespace App\Services;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * PHP port of server/src/utils/pdfGenerator.ts and comparisonPdf.ts. PDFKit
 * drew directly onto a PDF canvas (absolute x/y positioning); Dompdf instead
 * renders HTML+CSS, so each report is rebuilt as an HTML template that
 * reproduces the same sections, order, brand colors, and Shrinath Solutions
 * branding rather than replaying the same draw calls.
 */
final class PdfReportGenerator
{
    private const BRAND = '#4f46e5';
    private const MUTED = '#64748b';
    private const DARK_BG = '#0f172a';
    private const SURFACE = '#1e293b';
    private const SUCCESS = '#10b981';
    private const WARNING = '#f59e0b';
    private const DANGER = '#ef4444';
    private const TEXT_MAIN = '#f1f5f9';
    private const TEXT_MUTED = '#94a3b8';

    /** @param array<string, mixed> $data */
    public function generateAuditReport(array $data): string
    {
        $html = $this->auditReportHtml($data);
        return $this->render($html);
    }

    /** @param array<string, mixed> $result */
    public function generateComparisonReport(array $result): string
    {
        $html = $this->comparisonReportHtml($result);
        return $this->render($html);
    }

    private function render(string $html): string
    {
        $options = new Options();
        $options->set('isRemoteEnabled', false); // never fetch remote assets — no SSRF surface in report rendering
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans'); // ships with Dompdf, has broad Unicode coverage

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->render();
        return $dompdf->output();
    }

    private function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function scoreColor(int|float $score): string
    {
        if ($score >= 80) {
            return self::SUCCESS;
        }
        if ($score >= 60) {
            return self::WARNING;
        }
        return self::DANGER;
    }

    private function priorityColor(string $priority): string
    {
        return match ($priority) {
            'high', 'critical' => self::DANGER,
            'medium' => self::WARNING,
            default => '#3b82f6',
        };
    }

    /** @param array<string, mixed> $data */
    private function auditReportHtml(array $data): string
    {
        $b = self::BRAND;
        $muted = self::MUTED;
        $score = (int) $data['score'];
        $breakdown = $data['scoreBreakdown'];
        $domain = $this->e($data['domain']);
        $url = $this->e($data['url']);
        $date = $this->e(date('jS F Y, g:i A', strtotime((string) $data['analyzedAt'])));

        $rows = [
            ['Technical SEO', $breakdown['technical']],
            ['On Page SEO', $breakdown['onPage']],
            ['Performance', $breakdown['performance']],
            ['Mobile', $breakdown['mobile']],
            ['Security', $breakdown['security']],
            ['Accessibility', $breakdown['accessibility']],
        ];

        $breakdownRows = '';
        foreach ($rows as [$label, $value]) {
            $breakdownRows .= '<tr>'
                . '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">' . $this->e($label) . '</td>'
                . '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;color:' . $this->scoreColor((float) $value) . ';">' . round((float) $value) . '</td>'
                . '</tr>';
        }

        $recsHtml = '';
        foreach (array_slice($data['recommendations'], 0, 15) as $rec) {
            $color = $this->priorityColor((string) $rec['priority']);
            $recsHtml .= '<div style="margin-bottom:10px;">'
                . '<div style="color:' . $color . ';font-size:12px;font-weight:bold;">&#9679; ' . $this->e($rec['title']) . '</div>'
                . '<div style="color:#475569;font-size:10px;margin-top:2px;">' . $this->e($rec['description']) . '</div>'
                . '</div>';
        }

        $keywordsHtml = '';
        if (!empty($data['keywords'])) {
            $kwRows = '';
            foreach ($data['keywords'] as $kw) {
                $kwRows .= '<tr>'
                    . '<td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">' . $this->e($kw['keyword']) . '</td>'
                    . '<td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">' . $this->e($kw['density']) . '%</td>'
                    . '</tr>';
            }
            $keywordsHtml = '<h2 style="color:' . $b . ';font-size:16px;margin-top:24px;">Top Keywords</h2>'
                . '<table style="width:100%;border-collapse:collapse;font-size:11px;">'
                . '<tr><th style="text-align:left;padding:6px 12px;background:#f8fafc;">Keyword</th><th style="text-align:right;padding:6px 12px;background:#f8fafc;">Density</th></tr>'
                . $kwRows . '</table>';
        }

        return <<<HTML
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'DejaVu Sans', sans-serif; color:#0f172a; }
  .gauge-bg { background:#e2e8f0; border-radius:8px; height:16px; }
  .gauge-fill { background:{$b}; border-radius:8px; height:16px; }
</style></head>
<body>
  <h1 style="color:{$b};font-size:26px;margin-bottom:4px;">SEO Audit Report</h1>
  <p style="color:{$muted};font-size:12px;margin:2px 0;">Generated for: {$domain}</p>
  <p style="color:{$muted};font-size:12px;margin:2px 0;">Analyzed URL: {$url}</p>
  <p style="color:{$muted};font-size:12px;margin:2px 0 20px;">Date: {$date}</p>

  <h2 style="color:{$b};font-size:18px;">Overall Score</h2>
  <table style="width:100%;"><tr>
    <td style="width:80%;"><div class="gauge-bg"><div class="gauge-fill" style="width:{$score}%;"></div></div></td>
    <td style="width:20%;text-align:right;font-size:16px;font-weight:bold;">{$score} / 100</td>
  </tr></table>

  <h2 style="color:{$b};font-size:18px;margin-top:24px;">Score Breakdown</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">{$breakdownRows}</table>

  <h2 style="color:{$b};font-size:18px;margin-top:24px;">Recommendations</h2>
  {$recsHtml}

  {$keywordsHtml}

  <p style="margin-top:30px;color:#94a3b8;font-size:9px;text-align:center;">Shrinath Solutions &middot; SEO Toolkit</p>
</body>
</html>
HTML;
    }

    /** @param array<string, mixed> $result */
    private function comparisonReportHtml(array $result): string
    {
        $sites = array_values(array_filter($result['sites'], static fn ($s) => $s['result'] !== null));
        $date = $this->e(date('jS F Y, g:i A', strtotime((string) $result['analyzedAt'])));

        $siteBoxes = '';
        foreach ($sites as $site) {
            $score = (int) ($site['result']['scoreBreakdown']['overall'] ?? 0);
            $siteBoxes .= '<td style="width:' . floor(100 / max(count($sites), 1)) . '%;padding:6px;">'
                . '<div style="background:' . self::SURFACE . ';border-radius:6px;padding:10px;">'
                . '<div style="color:' . self::TEXT_MUTED . ';font-size:9px;">' . $this->e($site['label']) . '</div>'
                . '<div style="color:' . self::TEXT_MAIN . ';font-size:8px;margin-bottom:6px;">' . $this->e($site['domain']) . '</div>'
                . '<div style="color:' . $this->scoreColor($score) . ';font-size:26px;font-weight:bold;">' . $score . '</div>'
                . '<div style="color:' . self::TEXT_MUTED . ';font-size:8px;">Overall Score</div>'
                . '</div></td>';
        }

        $winnerRow = '';
        if (!empty($result['winners']['overall'])) {
            $winnerRow = '<div style="background:' . self::SURFACE . ';border-radius:6px;padding:10px;margin-top:10px;color:' . self::TEXT_MAIN . ';font-size:11px;">'
                . '<span style="color:' . self::WARNING . ';">&#127942; Overall Winner:</span> ' . $this->e($result['winners']['overall']) . '</div>';
        }

        $cats = [
            'overall' => 'Overall SEO', 'technical' => 'Technical SEO', 'onPage' => 'On-Page SEO',
            'performance' => 'Performance', 'mobile' => 'Mobile', 'security' => 'Security', 'accessibility' => 'Accessibility',
        ];

        $breakdownRows = '';
        foreach ($cats as $key => $label) {
            $cells = '';
            foreach ($sites as $site) {
                $val = (int) ($site['result']['scoreBreakdown'][$key] ?? 0);
                $cells .= '<td style="text-align:center;color:' . $this->scoreColor($val) . ';font-size:10px;font-weight:bold;padding:6px;">' . $val . '</td>';
            }
            $breakdownRows .= '<tr style="background:' . self::SURFACE . ';">'
                . '<td style="color:' . self::TEXT_MAIN . ';font-size:10px;padding:6px;">' . $this->e($label) . '</td>' . $cells . '</tr>';
        }

        $winnersRows = '';
        foreach ($cats as $key => $label) {
            if ($key === 'overall') {
                continue;
            }
            $winner = $result['winners'][$key] ?? '—';
            $winnersRows .= '<tr style="background:' . self::SURFACE . ';">'
                . '<td style="color:' . self::TEXT_MAIN . ';font-size:10px;padding:6px;">' . $this->e($label) . '</td>'
                . '<td style="color:' . self::WARNING . ';font-size:10px;padding:6px;">&#127942; ' . $this->e($winner ?: '—') . '</td>'
                . '</tr>';
        }

        $metricRows = $this->comparisonMetricRows($sites);

        $insightColors = ['advantage' => self::SUCCESS, 'warning' => self::DANGER, 'opportunity' => self::WARNING, 'tip' => self::BRAND];
        $insightLabels = ['advantage' => '&#10022; Advantage', 'warning' => '&#9888; Warning', 'opportunity' => '&#8599; Opportunity', 'tip' => '&#9679; Tip'];

        $insightsHtml = '';
        foreach ($result['insights'] as $insight) {
            $color = $insightColors[$insight['type']] ?? self::BRAND;
            $label = $insightLabels[$insight['type']] ?? $this->e($insight['type']);
            $insightsHtml .= '<div style="background:' . self::SURFACE . ';border-left:3px solid ' . $color . ';border-radius:4px;padding:10px;margin-bottom:8px;">'
                . '<div style="font-size:9px;color:' . $color . ';">' . $label . ' <span style="color:' . self::TEXT_MUTED . ';">(' . $this->e($insight['site']) . ')</span></div>'
                . '<div style="font-size:10px;color:' . self::TEXT_MAIN . ';margin-top:4px;">' . $this->e($insight['message']) . '</div>'
                . '</div>';
        }

        $bg = self::DARK_BG;
        $b = self::BRAND;
        $textMain = self::TEXT_MAIN;
        $textMuted = self::TEXT_MUTED;

        return <<<HTML
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'DejaVu Sans', sans-serif; background:{$bg}; color:{$textMain}; margin:0; padding:24px; }
  table { border-collapse:collapse; }
  h2.section { background:{$b}; color:#ffffff; font-size:13px; padding:10px 12px; border-radius:4px; margin-top:24px; }
</style></head>
<body>
  <div style="background:{$b};padding:24px;border-radius:6px;text-align:center;margin-bottom:16px;">
    <div style="color:#ffffff;font-size:22px;font-weight:bold;">SEO Competitor Analysis Report</div>
    <div style="color:#e0e7ff;font-size:11px;margin-top:6px;">Powered by SEO Toolkit &middot; Shrinath Solutions</div>
    <div style="color:#c7d2fe;font-size:9px;margin-top:4px;">Generated: {$date}</div>
  </div>

  <table style="width:100%;"><tr>{$siteBoxes}</tr></table>
  {$winnerRow}

  <h2 class="section">Score Breakdown by Category</h2>
  <table style="width:100%;">{$breakdownRows}</table>

  <h2 class="section">Category Winners</h2>
  <table style="width:100%;">{$winnersRows}</table>

  <h2 class="section">Detailed Metrics Comparison</h2>
  <table style="width:100%;">{$metricRows}</table>

  <h2 class="section">AI-Powered Insights &amp; Recommendations</h2>
  {$insightsHtml}

  <p style="margin-top:24px;color:{$textMuted};font-size:8px;text-align:center;">Shrinath Solutions &mdash; SEO Competitor Analysis &middot; {$date}</p>
</body>
</html>
HTML;
    }

    /** @param list<array<string, mixed>> $sites */
    private function comparisonMetricRows(array $sites): string
    {
        $rows = [
            ['Meta Title', static fn ($s) => !empty($s['result']['metrics']['meta']['title']) ? $s['result']['metrics']['meta']['titleLength'] . ' chars' : '✗ Missing'],
            ['Meta Description', static fn ($s) => !empty($s['result']['metrics']['meta']['description']) ? $s['result']['metrics']['meta']['descriptionLength'] . ' chars' : '✗ Missing'],
            ['H1 Tag', static fn ($s) => $s['result']['metrics']['headings']['hasH1'] ? '✓ ' . $s['result']['metrics']['headings']['h1Count'] . ' H1' : '✗ Missing'],
            ['H2 Tags', static fn ($s) => (string) $s['result']['metrics']['headings']['h2Count']],
            ['HTTPS', static fn ($s) => $s['result']['metrics']['technical']['https'] ? '✓ Yes' : '✗ No'],
            ['Sitemap', static fn ($s) => $s['result']['metrics']['technical']['sitemap'] ? '✓ Found' : '✗ Missing'],
            ['Robots.txt', static fn ($s) => $s['result']['metrics']['technical']['robotsTxt'] ? '✓ Found' : '✗ Missing'],
            ['Canonical', static fn ($s) => $s['result']['metrics']['technical']['canonical'] ? '✓ Yes' : '✗ Missing'],
            ['Schema Markup', static fn ($s) => $s['result']['metrics']['technical']['structuredData'] ? '✓ Yes' : '✗ No'],
            ['Open Graph', static fn ($s) => $s['result']['metrics']['technical']['openGraph'] ? '✓ Yes' : '✗ No'],
            ['Twitter Cards', static fn ($s) => $s['result']['metrics']['technical']['twitterCard'] ? '✓ Yes' : '✗ No'],
            ['Viewport Tag', static fn ($s) => $s['result']['metrics']['mobile']['viewport'] ? '✓ Yes' : '✗ No'],
            ['Responsive Design', static fn ($s) => $s['result']['metrics']['mobile']['responsive'] ? '✓ Yes' : '✗ No'],
            ['Images Total', static fn ($s) => (string) $s['result']['metrics']['images']['totalImages']],
            ['Images Missing Alt', static fn ($s) => (string) $s['result']['metrics']['images']['missingAlt']],
            ['Internal Links', static fn ($s) => (string) $s['result']['metrics']['links']['internalLinks']],
            ['SSL Certificate', static fn ($s) => $s['result']['metrics']['security']['ssl'] ? '✓ Valid' : '✗ Invalid'],
        ];

        $html = '';
        foreach ($rows as $i => [$label, $getValue]) {
            $bgColor = $i % 2 === 0 ? self::SURFACE : '#162032';
            $cells = '';
            foreach ($sites as $site) {
                $val = (string) $getValue($site);
                $color = str_starts_with($val, '✗') ? self::DANGER : (str_starts_with($val, '✓') ? self::SUCCESS : self::TEXT_MAIN);
                $cells .= '<td style="text-align:center;font-size:9px;color:' . $color . ';padding:5px;">' . $this->e($val) . '</td>';
            }
            $html .= '<tr style="background:' . $bgColor . ';"><td style="font-size:9px;color:' . self::TEXT_MAIN . ';padding:5px;">' . $this->e($label) . '</td>' . $cells . '</tr>';
        }
        return $html;
    }
}
