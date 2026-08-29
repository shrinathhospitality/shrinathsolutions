<?php
// Standalone privacy/safety assertions for the SEO Audit Tool's persistence layer
// (api/models/SeoAudit.php) — no database connection needed, pure function tests. Run with:
//   php scripts/test-seo-audit-privacy.php
// Mirrors this project's existing scripts/test-migrate-glob.php / scripts/seo-parity-test.mjs
// convention: a small assert-based script rather than a full test framework.

declare(strict_types=1);

// SeoAudit.php only defines functions/constants — no PDO calls happen just by requiring it.
require __DIR__ . '/../api/models/SeoAudit.php';

$failures = [];
$checks = 0;

function check(string $label, bool $condition, array &$failures, int &$checks): void
{
    $checks++;
    if (!$condition) {
        $failures[] = $label;
    }
}

// --- URL normalization: query strings, fragments, and case are handled correctly ---
$n = normalize_audit_url('https://Example.COM/Some/Path?utm_source=x&token=secret#section');
check('normalizes host to lowercase', $n !== null && str_starts_with($n['normalized_url'], 'https://example.com'), $failures, $checks);
check('strips query string', $n !== null && !str_contains($n['normalized_url'], 'utm_source'), $failures, $checks);
check('strips query string (token)', $n !== null && !str_contains($n['normalized_url'], 'token'), $failures, $checks);
check('strips fragment', $n !== null && !str_contains($n['normalized_url'], 'section'), $failures, $checks);
check('preserves path case', $n !== null && str_contains($n['normalized_url'], '/Some/Path'), $failures, $checks);
check('domain extracted correctly', $n !== null && $n['domain'] === 'example.com', $failures, $checks);
check('url_hash is a 64-char sha256 hex digest', $n !== null && preg_match('/^[a-f0-9]{64}$/', $n['url_hash']) === 1, $failures, $checks);
check('url_hash matches hash of the normalized url (not the raw input)', $n !== null && $n['url_hash'] === hash('sha256', $n['normalized_url']), $failures, $checks);

// --- Default ports are omitted, non-default ports are kept ---
$defaultPort = normalize_audit_url('https://example.com:443/x');
check('default https port omitted', $defaultPort !== null && !str_contains($defaultPort['normalized_url'], ':443'), $failures, $checks);
$customPort = normalize_audit_url('http://example.com:8080/x');
check('non-default port kept', $customPort !== null && str_contains($customPort['normalized_url'], ':8080'), $failures, $checks);

// --- Embedded credentials are rejected outright, never redacted-and-stored ---
$withCreds = normalize_audit_url('https://user:pass@example.com/');
check('embedded credentials rejected (returns null, not a redacted url)', $withCreds === null, $failures, $checks);

// --- Root path defaults to '/' ---
$noPath = normalize_audit_url('https://example.com');
check('empty path normalizes to /', $noPath !== null && $noPath['path'] === '/', $failures, $checks);

// --- Non-http(s) schemes are rejected ---
check('javascript: scheme rejected', normalize_audit_url('javascript:alert(1)') === null, $failures, $checks);
check('ftp: scheme rejected', normalize_audit_url('ftp://example.com/') === null, $failures, $checks);

// --- Stored length is bounded ---
$longPath = normalize_audit_url('https://example.com/' . str_repeat('a', 3000));
check('normalized_url is bounded to <= 512 chars', $longPath !== null && mb_strlen($longPath['normalized_url']) <= 512, $failures, $checks);

// --- Error classification never leaks raw internals, always returns a stable short code ---
[$code1] = classify_seo_audit_error('This host is not allowed.');
check('SSRF-blocked host classified correctly', $code1 === 'ssrf_blocked', $failures, $checks);
[$code2] = classify_seo_audit_error('The domain could not be resolved.');
check('DNS failure classified correctly', $code2 === 'dns_unresolvable', $failures, $checks);
[$code3, $msg3] = classify_seo_audit_error('Some completely unrecognized internal message');
check('unrecognized message still gets a safe generic code', $code3 === 'analysis_failed', $failures, $checks);
check('classified message is bounded to <= 255 chars', mb_strlen($msg3) <= 255, $failures, $checks);

// --- Result summary is bounded and derives only from the authoritative result fields ---
$fakeResult = [
    'score' => 77,
    'scoreBreakdown' => ['technical' => 80, 'onPage' => 65.4, 'performance' => 90, 'mobile' => 70, 'security' => 60, 'accessibility' => 88],
    'seoInsights' => ['healthSummary' => ['grade' => 'B', 'criticalCount' => 2, 'highCount' => 3, 'mediumCount' => 4, 'lowCount' => 1]],
    'metrics' => [
        'meta' => ['status' => 'pass'], 'technical' => ['status' => 'pass'], 'security' => ['status' => 'warning'],
        'mobile' => ['status' => 'pass'], 'performance' => ['status' => 'fail'],
    ],
    'recommendations' => array_fill(0, 40, ['title' => str_repeat('x', 500), 'priority' => 'critical', 'effort' => 'hard', 'recommendation' => str_repeat('y', 1000)]),
];
$built = build_seo_audit_summary($fakeResult);
check('critical_count derived from healthSummary.criticalCount', $built['counts']['critical'] === 2, $failures, $checks);
check('warning_count derived from healthSummary.highCount', $built['counts']['warning'] === 3, $failures, $checks);
check('improvement_count = mediumCount + lowCount', $built['counts']['improvement'] === 5, $failures, $checks);
check('passed_count counts pass-status metric groups (meta/technical/mobile)', $built['counts']['passed'] === 3, $failures, $checks);
check('summary_json is valid JSON', json_decode($built['summary_json']) !== null, $failures, $checks);
check('summary_json is bounded even with 40 huge recommendations', strlen($built['summary_json']) <= SEO_AUDIT_MAX_SUMMARY_JSON_BYTES, $failures, $checks);
check('summary_json never contains raw html/script-looking analyzer fields', !str_contains($built['summary_json'], '<html'), $failures, $checks);

// --- Lead status validation only accepts the documented enum ---
check('valid lead status accepted', in_array('qualified', SEO_AUDIT_LEAD_STATUSES, true), $failures, $checks);
check('invalid lead status rejected by the enum list', !in_array('spam', SEO_AUDIT_LEAD_STATUSES, true), $failures, $checks);

echo "Ran {$checks} checks.\n";
if ($failures) {
    echo "FAILED (" . count($failures) . "):\n";
    foreach ($failures as $f) {
        echo "  - {$f}\n";
    }
    exit(1);
}
echo "PASS — all seo_audits privacy/safety checks passed.\n";
