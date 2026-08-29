<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/seo/permissions.php';

function redirects_public_lookup(PDO $pdo): void
{
    $path = $_GET['path'] ?? '';
    if ($path === '') {
        json_error('A path is required.', 422);
    }

    $redirect = find_active_redirect_by_source($pdo, $path);
    if (!$redirect) {
        json_success(['found' => false]);
    }

    // Best-effort: a tracking failure must never turn a working redirect into an error response
    // (spec §19) — the lookup result below is unaffected either way.
    try {
        record_redirect_hit($pdo, (int) $redirect['id'], $_SERVER['HTTP_REFERER'] ?? null);
    } catch (Throwable $e) {
        error_log('[redirects] hit tracking failed: ' . $e->getMessage());
    }

    json_success([
        'found'       => true,
        'destination' => $redirect['destination_url'],
        'type'        => $redirect['redirect_type'],
    ]);
}

function redirects_admin_list(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');
    $params = pagination_params();
    $result = list_redirects($pdo, $params);
    json_success(['redirects' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

/** External-destination and open-redirect guard: a destination is "internal" if it has no
 *  scheme/host at all (a bare path) or its host matches the site's own canonical host. Any
 *  other absolute URL is external and requires the caller to pass `allow_external: true`
 *  explicitly (spec §18/§20 — "external destinations require explicit permission", "no open
 *  redirects"). Scheme is restricted to http/https; javascript:, data:, and similar are
 *  always rejected regardless of the allow_external flag. */
function redirect_destination_is_safe(string $destination, bool $allowExternal): ?string
{
    $scheme = parse_url($destination, PHP_URL_SCHEME);
    if ($scheme === null) {
        return null; // relative path — always fine
    }
    if (!in_array(strtolower($scheme), ['http', 'https'], true)) {
        return 'Only http/https destinations are allowed.';
    }
    $host = parse_url($destination, PHP_URL_HOST) ?? '';
    if (!in_array(strtolower($host), ['shrinathsolutions.com', 'www.shrinathsolutions.com'], true) && !$allowExternal) {
        return 'This destination points to an external site — pass allow_external to confirm this is intentional.';
    }
    return null;
}

function validate_redirect_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['source_url', 'destination_url']);
    if ($missing) {
        return 'Source and destination URLs are required.';
    }

    $source = normalize_path($body['source_url']);
    $destPath = normalize_path($body['destination_url']);

    if ($source === $destPath) {
        return 'Source and destination cannot be the same URL.';
    }
    if (redirect_source_taken($pdo, $source, $excludeId)) {
        return 'A redirect for that source URL already exists.';
    }
    if (redirect_creates_loop($pdo, $source, $body['destination_url'], $excludeId)) {
        return 'That destination would create a redirect loop.';
    }
    if (redirect_source_conflicts_with_live_route($pdo, $source)) {
        return 'That source URL is a real, currently published page — redirecting it away would break a working page.';
    }
    $destError = redirect_destination_is_safe($body['destination_url'], !empty($body['allow_external']));
    if ($destError) {
        return $destError;
    }

    return null;
}

function redirects_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_redirects');

    $body = read_json_body();
    $error = validate_redirect_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $id = create_redirect($pdo, $body);
    audit_log($pdo, $ctx['user']['id'], 'content_created', 'redirect', (string) $id, $body['source_url'] . ' -> ' . $body['destination_url']);

    json_success(['id' => $id], 201);
}

function redirects_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_redirects');

    $id = (int) $params['id'];
    if (!find_redirect($pdo, $id)) {
        json_error('Redirect not found.', 404);
    }

    $body = read_json_body();
    $error = validate_redirect_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    update_redirect($pdo, $id, $body);
    audit_log($pdo, $ctx['user']['id'], 'content_updated', 'redirect', (string) $id);

    json_success();
}

function redirects_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_redirects');

    $id = (int) $params['id'];
    if (!find_redirect($pdo, $id)) {
        json_error('Redirect not found.', 404);
    }

    delete_redirect($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'redirect', (string) $id);

    json_success();
}

function redirects_admin_export(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.view');

    $stmt = $pdo->query('SELECT source_url, destination_url, redirect_type, status, notes, hit_count, last_hit_at FROM redirects ORDER BY source_url ASC');

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="redirects.csv"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ['Source URL', 'Destination URL', 'Type', 'Status', 'Notes', 'Hit Count', 'Last Hit']);
    foreach ($stmt->fetchAll() as $r) {
        fputcsv($out, array_map('csv_safe', [$r['source_url'], $r['destination_url'], $r['redirect_type'], $r['status'], $r['notes'], $r['hit_count'], $r['last_hit_at']]));
    }
    fclose($out);
    exit;
}

/** Parses an uploaded CSV and returns a row-by-row validation preview — never writes anything.
 *  Nothing from the file is trusted: every row runs through the exact same
 *  validate_redirect_input() the single-redirect form uses, so a malicious or malformed CSV
 *  can only ever produce a preview, never a database change (spec §18: "do not create
 *  redirects until import preview is approved", "do not trust CSV contents"). */
function redirects_admin_import_preview(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_permission($pdo, $ctx, 'seo.manage_redirects');

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        json_error('A CSV file is required.', 422);
    }
    if ($_FILES['file']['size'] > 1_000_000) {
        json_error('CSV file is too large (max 1MB).', 422);
    }

    $rows = [];
    $handle = fopen($_FILES['file']['tmp_name'], 'r');
    if ($handle === false) {
        json_error('Could not read the uploaded file.', 422);
    }

    $header = fgetcsv($handle);
    $expected = ['source_url', 'destination_url', 'redirect_type', 'status', 'notes'];
    $normalizedHeader = $header ? array_map(fn($h) => strtolower(trim((string) $h)), $header) : [];
    if (array_slice($normalizedHeader, 0, 2) !== ['source_url', 'destination_url']) {
        fclose($handle);
        json_error('CSV must start with source_url,destination_url columns.', 422);
    }

    $lineNumber = 1;
    $preview = [];
    while (($cols = fgetcsv($handle)) !== false && count($preview) < 500) {
        $lineNumber++;
        if (count(array_filter($cols, fn($c) => trim((string) $c) !== '')) === 0) {
            continue; // blank line
        }
        $row = array_combine(array_slice($expected, 0, count($cols)), $cols) ?: [];
        $error = validate_redirect_input($pdo, $row, null);
        $preview[] = ['line' => $lineNumber, 'row' => $row, 'valid' => $error === null, 'error' => $error];
    }
    fclose($handle);

    $validCount = count(array_filter($preview, fn($p) => $p['valid']));
    json_success(['preview' => $preview, 'validCount' => $validCount, 'invalidCount' => count($preview) - $validCount]);
}

/** Applies a previously-previewed import — only the rows explicitly approved by the caller
 *  (by line number) are created, each re-validated at write time (state may have changed
 *  since the preview was generated). */
function redirects_admin_import_apply(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);
    require_permission($pdo, $ctx, 'seo.manage_redirects');

    $body = read_json_body();
    $rows = is_array($body['rows'] ?? null) ? $body['rows'] : [];
    if (!$rows) {
        json_error('No rows to import.', 422);
    }
    if (count($rows) > 500) {
        json_error('A maximum of 500 rows can be imported at once.', 422);
    }

    $created = 0;
    $failed = [];
    foreach ($rows as $row) {
        if (!is_array($row) || empty($row['source_url']) || empty($row['destination_url'])) {
            $failed[] = ['row' => $row, 'error' => 'Missing source or destination URL.'];
            continue;
        }
        $error = validate_redirect_input($pdo, $row, null);
        if ($error) {
            $failed[] = ['row' => $row, 'error' => $error];
            continue;
        }
        create_redirect($pdo, $row);
        $created++;
    }

    audit_log($pdo, $ctx['user']['id'], 'redirects_imported', null, null, "created=$created failed=" . count($failed));
    json_success(['created' => $created, 'failed' => $failed]);
}
