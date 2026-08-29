<?php
declare(strict_types=1);

// Persists results from the public SEO Audit Tool (api/seo-toolkit/*) into the main database.
//
// Privacy contract — never violate this from any function in this file:
//   - No raw visitor IP is ever stored.
//   - No browser user-agent string is ever stored.
//   - No full submitted URL is stored — only a normalized, query/fragment-stripped URL.
//   - No raw analyzer output (HTML, headers, cookies, stack traces) is ever stored.
// See docs/SEO_STUDIO_ARCHITECTURE.md's "SEO Audit Tool persistence" section for the full
// rationale and the schema this backs (database/migrations/0019_seo_audits.sql).

const SEO_AUDIT_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed', 'not_interested'];
const SEO_AUDIT_MAX_SUMMARY_JSON_BYTES = 8000;

/** Strips everything except scheme + lowercase host + non-default port + path: no query
 *  string, no fragment, no embedded credentials (already rejected upstream by UrlValidator,
 *  but re-checked here defensively since this function must be safe to call on its own).
 *  Returns null if the URL can't be parsed into a safe absolute http(s) URL — callers must
 *  never store an audit whose URL failed to normalize. */
function normalize_audit_url(string $rawUrl): ?array
{
    $parts = parse_url(trim($rawUrl));
    if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
        return null;
    }
    if (isset($parts['user']) || isset($parts['pass'])) {
        return null; // embedded credentials — never stored, even redacted
    }

    $scheme = strtolower($parts['scheme']);
    if (!in_array($scheme, ['http', 'https'], true)) {
        return null;
    }

    $host = strtolower($parts['host']);
    if ($host === '') {
        return null;
    }

    $defaultPort = $scheme === 'https' ? 443 : 80;
    $port = $parts['port'] ?? null;
    $portSuffix = ($port !== null && $port !== $defaultPort) ? ':' . $port : '';

    $path = $parts['path'] ?? '';
    if ($path === '') {
        $path = '/';
    }
    // Path case is preserved (URL paths are case-sensitive on most servers) — only the
    // scheme and host are normalized to lowercase.

    // Deliberately no query string, no fragment: anything after ? or # is discarded, which
    // is what keeps tracking params, tokens, and any sensitive query values out of storage.
    $normalizedUrl = mb_substr("{$scheme}://{$host}{$portSuffix}{$path}", 0, 512);

    return [
        'normalized_url' => $normalizedUrl,
        'domain' => mb_substr($host, 0, 255),
        'path' => mb_substr($path, 0, 512),
        'url_hash' => hash('sha256', $normalizedUrl),
    ];
}

/** Builds a small, bounded, safe summary of an analyzer result for permanent storage —
 *  derived entirely from the same authoritative result already returned to the caller, never
 *  recalculated. Progressively drops detail (recommendations first) until the encoded JSON
 *  fits SEO_AUDIT_MAX_SUMMARY_JSON_BYTES, so storage is never unbounded regardless of how much
 *  the analyzer returns. */
function build_seo_audit_summary(array $result): array
{
    $scoreBreakdown = is_array($result['scoreBreakdown'] ?? null) ? $result['scoreBreakdown'] : [];
    $healthSummary = is_array($result['seoInsights']['healthSummary'] ?? null) ? $result['seoInsights']['healthSummary'] : [];
    $metrics = is_array($result['metrics'] ?? null) ? $result['metrics'] : [];

    $passedCount = 0;
    foreach (['meta', 'technical', 'security', 'mobile', 'performance'] as $group) {
        if (($metrics[$group]['status'] ?? null) === 'pass') {
            $passedCount++;
        }
    }

    $counts = [
        'critical' => (int) ($healthSummary['criticalCount'] ?? 0),
        'warning' => (int) ($healthSummary['highCount'] ?? 0),
        'improvement' => (int) ($healthSummary['mediumCount'] ?? 0) + (int) ($healthSummary['lowCount'] ?? 0),
        'passed' => $passedCount,
    ];

    $categories = [
        'technical' => (int) round((float) ($scoreBreakdown['technical'] ?? 0)),
        'onPage' => (int) round((float) ($scoreBreakdown['onPage'] ?? 0)),
        'performance' => (int) round((float) ($scoreBreakdown['performance'] ?? 0)),
        'mobile' => (int) round((float) ($scoreBreakdown['mobile'] ?? 0)),
        'security' => (int) round((float) ($scoreBreakdown['security'] ?? 0)),
        'accessibility' => (int) round((float) ($scoreBreakdown['accessibility'] ?? 0)),
    ];

    $allRecommendations = is_array($result['recommendations'] ?? null) ? $result['recommendations'] : [];
    $safeRecommendation = function (array $r): array {
        $priority = $r['priority'] ?? '';
        $effort = $r['effort'] ?? '';
        return [
            'title' => mb_substr((string) ($r['title'] ?? ''), 0, 150),
            'priority' => in_array($priority, ['critical', 'high', 'medium', 'low'], true) ? $priority : 'low',
            'effort' => in_array($effort, ['easy', 'medium', 'hard'], true) ? $effort : 'medium',
            'advice' => mb_substr((string) ($r['recommendation'] ?? ''), 0, 300),
        ];
    };

    for ($limit = 10; $limit >= 0; $limit -= 5) {
        $recommendations = array_map($safeRecommendation, array_slice($allRecommendations, 0, $limit));
        $summary = [
            'grade' => is_string($healthSummary['grade'] ?? null) ? $healthSummary['grade'] : null,
            'categories' => $categories,
            'recommendations' => $recommendations,
        ];
        $encoded = json_encode($summary, JSON_UNESCAPED_SLASHES);
        if ($encoded !== false && strlen($encoded) <= SEO_AUDIT_MAX_SUMMARY_JSON_BYTES) {
            return ['counts' => $counts, 'summary_json' => $encoded];
        }
    }

    // Even the recommendation-free summary didn't fit (shouldn't happen with 6 short
    // categories) — fall back to just the counts/categories, guaranteed small.
    return ['counts' => $counts, 'summary_json' => json_encode(['grade' => null, 'categories' => $categories, 'recommendations' => []])];
}

/** Classifies an already-safe, curated ApiException message (never a raw internal exception
 *  message — callers must not pass anything else here) into a short stable code plus its own
 *  copy of the safe message, so both are independently available for the admin UI without
 *  string-matching in the frontend. */
function classify_seo_audit_error(string $safeMessage): array
{
    $lower = strtolower($safeMessage);
    $map = [
        'embedded credentials' => 'embedded_credentials',
        'host is not allowed' => 'ssrf_blocked',
        'ip address is not allowed' => 'ssrf_blocked',
        'could not be resolved' => 'dns_unresolvable',
        'too many redirects' => 'too_many_redirects',
        'too large' => 'response_too_large',
        'unreachable or timed out' => 'fetch_timeout',
        'rate limit' => 'rate_limited',
        'html page' => 'unsupported_content_type',
        'valid url' => 'invalid_url',
        'url is required' => 'invalid_url',
        'invalid port' => 'invalid_url',
    ];
    foreach ($map as $needle => $code) {
        if (str_contains($lower, $needle)) {
            return [$code, mb_substr($safeMessage, 0, 255)];
        }
    }
    return ['analysis_failed', mb_substr($safeMessage, 0, 255)];
}

/** Step 1 of the lifecycle: one row per accepted request, created before analysis starts.
 *  Returns the new row's id (used to update the same row later — never insert a second row
 *  for the same request). Throws on duplicate request_id (defends against any retry logic
 *  ever accidentally reusing an id). */
function create_seo_audit(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO seo_audits (request_id, url_hash, normalized_url, domain, path, status, lead_name, lead_email, lead_status, created_at)
         VALUES (:request_id, :url_hash, :normalized_url, :domain, :path, \'processing\', :lead_name, :lead_email, :lead_status, NOW())'
    );
    $leadEmail = isset($data['lead_email']) && $data['lead_email'] !== '' ? mb_substr((string) $data['lead_email'], 0, 255) : null;
    $stmt->execute([
        'request_id' => $data['request_id'],
        'url_hash' => $data['url_hash'],
        'normalized_url' => $data['normalized_url'],
        'domain' => $data['domain'],
        'path' => $data['path'],
        'lead_name' => isset($data['lead_name']) && $data['lead_name'] !== '' ? mb_substr((string) $data['lead_name'], 0, 150) : null,
        'lead_email' => $leadEmail,
        'lead_status' => $leadEmail !== null ? 'new' : null,
    ]);
    return (int) $pdo->lastInsertId();
}

/** Step 2 (success path): updates the same row created above — never inserts a new one. */
function complete_seo_audit(PDO $pdo, int $id, array $result, int $processingTimeMs): void
{
    $built = build_seo_audit_summary($result);
    $stmt = $pdo->prepare(
        "UPDATE seo_audits SET
            status = 'completed',
            overall_score = :overall_score,
            critical_count = :critical_count,
            warning_count = :warning_count,
            improvement_count = :improvement_count,
            passed_count = :passed_count,
            result_summary_json = :summary_json,
            processing_time_ms = :processing_time_ms,
            completed_at = NOW()
         WHERE id = :id"
    );
    $stmt->execute([
        'overall_score' => max(0, min(100, (int) ($result['score'] ?? 0))),
        'critical_count' => $built['counts']['critical'],
        'warning_count' => $built['counts']['warning'],
        'improvement_count' => $built['counts']['improvement'],
        'passed_count' => $built['counts']['passed'],
        'summary_json' => $built['summary_json'],
        'processing_time_ms' => max(0, $processingTimeMs),
        'id' => $id,
    ]);
}

/** Step 2 (failure path): updates the same row to 'failed' with only a pre-classified safe
 *  error — never the raw exception message from a non-ApiException throwable. */
function fail_seo_audit(PDO $pdo, int $id, string $safeMessage, int $processingTimeMs): void
{
    [$code, $message] = classify_seo_audit_error($safeMessage);
    $stmt = $pdo->prepare(
        "UPDATE seo_audits SET status = 'failed', safe_error_code = :code, safe_error_message = :message, processing_time_ms = :processing_time_ms, completed_at = NOW() WHERE id = :id"
    );
    $stmt->execute([
        'code' => $code,
        'message' => $message,
        'processing_time_ms' => max(0, $processingTimeMs),
        'id' => $id,
    ]);
}

function list_seo_audits(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];
    if ($params['search'] !== '') {
        $where[] = '(normalized_url LIKE :search1 OR domain LIKE :search2 OR lead_name LIKE :search3 OR lead_email LIKE :search4)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = $bind['search4'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '') {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }
    if (($params['lead'] ?? '') === 'lead') {
        $where[] = 'lead_email IS NOT NULL';
    } elseif (($params['lead'] ?? '') === 'anonymous') {
        $where[] = 'lead_email IS NULL';
    }
    if (($params['score_status'] ?? '') === 'good') {
        $where[] = 'overall_score >= 80';
    } elseif (($params['score_status'] ?? '') === 'needs_improvement') {
        $where[] = 'overall_score >= 50 AND overall_score < 80';
    } elseif (($params['score_status'] ?? '') === 'poor') {
        $where[] = 'overall_score IS NOT NULL AND overall_score < 50';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM seo_audits $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    // No result_summary_json in the list response — full summaries are only ever fetched
    // per-record via find_seo_audit() on the admin detail page.
    $stmt = $pdo->prepare(
        "SELECT id, request_id, normalized_url, domain, status, overall_score, critical_count, warning_count,
                improvement_count, passed_count, lead_name, lead_email, lead_status, created_at
         FROM seo_audits $whereSql ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_seo_audit(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM seo_audits WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function update_seo_audit_lead_status(PDO $pdo, int $id, string $status): bool
{
    if (!in_array($status, SEO_AUDIT_LEAD_STATUSES, true)) {
        return false;
    }
    $stmt = $pdo->prepare('UPDATE seo_audits SET lead_status = :status WHERE id = :id AND lead_email IS NOT NULL');
    $stmt->execute(['status' => $status, 'id' => $id]);
    return $stmt->rowCount() > 0;
}

function delete_seo_audit(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM seo_audits WHERE id = :id')->execute(['id' => $id]);
}

function seo_audit_leads_count(PDO $pdo): int
{
    return (int) $pdo->query('SELECT COUNT(*) FROM seo_audits WHERE lead_email IS NOT NULL')->fetchColumn();
}

/** Aggregate counts for the admin dashboard's SEO Audit panel — single grouped query, no N+1. */
function seo_audit_dashboard_summary(PDO $pdo): array
{
    $row = $pdo->query(
        "SELECT
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
            SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) AS this_month,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN lead_email IS NOT NULL THEN 1 ELSE 0 END) AS leads,
            AVG(CASE WHEN status = 'completed' THEN overall_score END) AS avg_score
         FROM seo_audits"
    )->fetch();

    return [
        'audits_today' => (int) ($row['today'] ?? 0),
        'audits_this_month' => (int) ($row['this_month'] ?? 0),
        'completed' => (int) ($row['completed'] ?? 0),
        'failed' => (int) ($row['failed'] ?? 0),
        'leads' => (int) ($row['leads'] ?? 0),
        'average_score' => $row['avg_score'] !== null ? (int) round((float) $row['avg_score']) : null,
    ];
}

/** Retention cleanup — dry-run by default (see scripts/seo-audits-cleanup.php). Never called
 *  automatically; requires explicit admin/CLI invocation. Deletes in bounded chunks so a large
 *  backlog can't lock the table for an extended write. Leads (lead_email IS NOT NULL) are never
 *  touched by the anonymous-audit cutoffs — they follow the separate lead retention cutoff. */
function seo_audits_cleanup_candidates(PDO $pdo, int $failedDays, int $completedDays, int $leadDays): array
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM seo_audits WHERE lead_email IS NULL AND status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)"
    );
    $stmt->execute(['days' => $failedDays]);
    $failedCount = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM seo_audits WHERE lead_email IS NULL AND status = 'completed' AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)"
    );
    $stmt->execute(['days' => $completedDays]);
    $completedCount = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM seo_audits WHERE lead_email IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)'
    );
    $stmt->execute(['days' => $leadDays]);
    $leadCount = (int) $stmt->fetchColumn();

    return ['anonymous_failed' => $failedCount, 'anonymous_completed' => $completedCount, 'leads' => $leadCount];
}

/** Actually deletes one category of expired rows, in chunks of $chunkSize, up to $maxChunks
 *  iterations (a hard ceiling so a misconfigured cutoff can't run unbounded). Returns the
 *  total number of rows deleted. Callers must pass dryRun=false explicitly — there is no
 *  default that deletes anything. */
function seo_audits_cleanup_delete(PDO $pdo, string $category, int $days, int $chunkSize = 500, int $maxChunks = 200): int
{
    $whereByCategory = [
        'anonymous_failed' => "lead_email IS NULL AND status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)",
        'anonymous_completed' => "lead_email IS NULL AND status = 'completed' AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)",
        'leads' => 'lead_email IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)',
    ];
    if (!isset($whereByCategory[$category])) {
        throw new InvalidArgumentException('Unknown cleanup category: ' . $category);
    }

    $deleted = 0;
    $sql = "DELETE FROM seo_audits WHERE {$whereByCategory[$category]} LIMIT {$chunkSize}";
    for ($i = 0; $i < $maxChunks; $i++) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['days' => $days]);
        $affected = $stmt->rowCount();
        $deleted += $affected;
        if ($affected < $chunkSize) {
            break;
        }
    }
    return $deleted;
}
