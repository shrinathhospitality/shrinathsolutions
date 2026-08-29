<?php
/**
 * scripts/import-seo-master.php
 *
 * CLI-only, resumable importer for docs/shrinath-solutions-seo-studio-master-import.json
 * ("the master import") into the existing SEO Studio content model (seo_pages, services,
 * blog_posts, seo_meta, seo_documents, faqs).
 *
 * This script is deliberately conservative. It is a thin, safety-first orchestration layer
 * on top of code that already exists and is trusted:
 *   - api/lib/seo/documents.php   for seo_normalize_route() / seo_document_key() / document lookups
 *   - api/lib/sanitize.php        for sanitize_html() — the only HTML sanitizer this project uses
 *   - api/models/SeoPage.php, Service.php, Blog.php, Faq.php, SeoMeta.php — the only writers of
 *     their respective tables
 *   - api/lib/audit.php           for audit_log()
 *
 * It never talks to the scoring engine (checks.php/rules.php/scorer.php/analyze.php) and never
 * modifies config/seo-scoring-rules.json. It never runs a migration or rollback. It never
 * executes destructive SQL. See the "SAFETY" block below and the inline comments throughout.
 *
 * Usage:
 *   php scripts/import-seo-master.php --help
 *   php scripts/import-seo-master.php --dry-run [--file=path/to/import.json]
 *   php scripts/import-seo-master.php --apply --confirmed-backup [--file=...] [--resume=state.json]
 *
 * Exit codes:
 *   0  success (dry run completed and wrote its report, or apply batch completed cleanly)
 *   1  usage / safety-gate error (bad flags, missing --confirmed-backup with --apply, etc.)
 *   2  structural validation failure (checksum/schema mismatch) — never proceeds past this
 *   3  could not connect to the database — reported cleanly, nothing was written
 *   4  apply mode aborted after too many consecutive DB errors
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// CLI-only guard — identical pattern to every existing database/seed_*.php script.
// ---------------------------------------------------------------------------
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/validate.php'; // client_ip() — used by audit_log() below
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/lib/audit.php';
require __DIR__ . '/../api/lib/route_manifest.php';
require __DIR__ . '/../api/lib/seo/rules.php';
require __DIR__ . '/../api/lib/seo/documents.php'; // seo_normalize_route(), seo_document_key(), seo_find_document_by_*()
require __DIR__ . '/../api/models/SeoPage.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Service.php';
require __DIR__ . '/../api/models/Blog.php';
require __DIR__ . '/../api/models/Faq.php';
require __DIR__ . '/lib/import_markdown.php'; // import_extract_service_hero_description() / import_extract_blog_content()

const IMPORT_DEFAULT_FILE = __DIR__ . '/../docs/shrinath-solutions-seo-studio-master-import.json';
const IMPORT_DRY_RUN_JSON = __DIR__ . '/../docs/seo-master-import-dry-run.json';
const IMPORT_REPORT_MD = __DIR__ . '/../docs/SEO_MASTER_IMPORT_REPORT.md';
const IMPORT_DEFAULT_STATE_FILE = __DIR__ . '/../docs/.seo-master-import-state.json';
const IMPORT_BATCH_MIN = 10;
const IMPORT_BATCH_MAX = 20;
const IMPORT_MAX_CONSECUTIVE_DB_ERRORS = 3;
const IMPORT_ALLOWED_CONTENT_TYPES = ['seo_page', 'service', 'blog', 'venture', 'static_page'];
const IMPORT_ALLOWED_STATUSES = ['draft', 'published', 'scheduled', 'archived'];
const IMPORT_ALLOWED_INDEXABILITY = ['index', 'noindex'];
const IMPORT_ALLOWED_ROBOTS = [
    'index,follow', 'index,nofollow', 'noindex,follow', 'noindex,nofollow',
];
const IMPORT_CANONICAL_HOST = 'shrinathsolutions.com';

// =============================================================================================
// SAFETY (non-negotiable — see docs/... spec). This block is the single place every one of
// these rules is enforced; nothing below should ever be able to route around it.
//   1. --apply requires --confirmed-backup, always.
//   2. No TRUNCATE / DROP / down-migration / DELETE is ever issued by this script, except the
//      resumable-state file's own bookkeeping (a local JSON file, not SQL).
//   3. A populated field is never silently overwritten — see field_classify().
//   4. A draft is never auto-published — see status handling in each import_* function.
//   5. Every SQL statement in this file is a PDO prepared statement with bound parameters.
//   6. config/seo-scoring-rules.json and api/lib/seo/{checks,rules,scorer}.php are never
//      required, read, or written by this script.
// =============================================================================================

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function import_parse_args(array $argv): array
{
    $args = [
        'help' => false,
        'file' => IMPORT_DEFAULT_FILE,
        'dry_run' => false,
        'apply' => false,
        'confirmed_backup' => false,
        'resume' => null,
        'apply_overwrites' => null,
    ];
    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--help' || $arg === '-h') {
            $args['help'] = true;
        } elseif ($arg === '--dry-run') {
            $args['dry_run'] = true;
        } elseif ($arg === '--apply') {
            $args['apply'] = true;
        } elseif ($arg === '--confirmed-backup') {
            $args['confirmed_backup'] = true;
        } elseif (str_starts_with($arg, '--file=')) {
            $args['file'] = substr($arg, strlen('--file='));
        } elseif (str_starts_with($arg, '--resume=')) {
            $args['resume'] = substr($arg, strlen('--resume='));
        } elseif (str_starts_with($arg, '--apply-overwrites=')) {
            $args['apply_overwrites'] = substr($arg, strlen('--apply-overwrites='));
        } else {
            fwrite(STDERR, "Unknown argument: $arg\n\n");
            $args['help'] = true;
        }
    }
    // Dry-run is the default mode whenever --apply wasn't explicitly requested.
    if (!$args['apply']) {
        $args['dry_run'] = true;
    }
    return $args;
}

function import_print_help(): void
{
    echo <<<HELP
        SEO Master Import — scripts/import-seo-master.php

        Imports docs/shrinath-solutions-seo-studio-master-import.json into the SEO Studio
        content model (seo_pages, services, blog_posts, seo_meta, seo_documents, faqs).

        Modes (mutually reinforcing, dry-run is the default):
          --dry-run                 Validate + match + classify only. Nothing is written to the
                                     database. Writes docs/seo-master-import-dry-run.json and
                                     docs/SEO_MASTER_IMPORT_REPORT.md. This is the default mode
                                     when --apply is not given.
          --apply                   Actually write changes, in batches of 10-20 records per
                                     transaction. REQUIRES --confirmed-backup or the script
                                     refuses to run. PROPOSE_OVERWRITE fields are still never
                                     applied unless --apply-overwrites is also given.
          --confirmed-backup        Required alongside --apply — you are asserting a real,
                                     verified database backup exists before this runs. This flag
                                     alone proves nothing; it is a deliberate, typed acknowledgement.

        Options:
          --file=PATH                Import JSON file (default: docs/shrinath-solutions-seo-studio-master-import.json)
          --resume=PATH               Resume an --apply run from a specific state file (default:
                                       docs/.seo-master-import-state.json). Already-processed
                                       records are skipped.
          --apply-overwrites=VALUE    Off by default. Gate for applying PROPOSE_OVERWRITE field
                                       changes during --apply. VALUE is either the literal string
                                       "all", or a path to a text file containing one route path
                                       or documentKey per line to allow overwrites for.
          --help, -h                  Show this help.

        Safety:
          - Never auto-publishes a draft record.
          - Never overwrites a populated field without --apply-overwrites.
          - Never runs destructive SQL (no TRUNCATE/DROP/rollback).
          - Never treats the JSON's own numeric/internal identifiers as production primary keys.
          - Uses PDO prepared statements exclusively.

        Examples:
          php scripts/import-seo-master.php --dry-run
          php scripts/import-seo-master.php --apply --confirmed-backup
          php scripts/import-seo-master.php --apply --confirmed-backup --resume=docs/.seo-master-import-state.json

        HELP;
}

// ---------------------------------------------------------------------------
// Step 1: checksum + structural validation
// ---------------------------------------------------------------------------
function import_compute_sha256(string $path): string
{
    $hash = hash_file('sha256', $path);
    if ($hash === false) {
        throw new RuntimeException("Could not read file for hashing: $path");
    }
    return $hash;
}

/** @return array{errors: string[], data: array|null} */
function import_validate_structure(string $path): array
{
    $errors = [];
    if (!is_file($path)) {
        return ['errors' => ["Import file not found: $path"], 'data' => null];
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return ['errors' => ["Could not read import file: $path"], 'data' => null];
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        return ['errors' => ['Import file is not valid JSON: ' . json_last_error_msg()], 'data' => null];
    }

    if (empty($data['schemaVersion']) || !is_string($data['schemaVersion'])) {
        $errors[] = 'Missing or invalid top-level "schemaVersion".';
    }
    if (!isset($data['records']) || !is_array($data['records'])) {
        $errors[] = 'Missing or invalid top-level "records" array.';
        return ['errors' => $errors, 'data' => $data];
    }
    if (!isset($data['summary']) || !is_array($data['summary']) || !isset($data['summary']['countsByType'])) {
        $errors[] = 'Missing "summary.countsByType" — cannot cross-check declared vs actual record counts.';
        return ['errors' => $errors, 'data' => $data];
    }

    $actualCounts = [];
    foreach ($data['records'] as $i => $record) {
        if (!is_array($record)) {
            $errors[] = "records[$i] is not an object.";
            continue;
        }
        $type = $record['contentType'] ?? '__missing__';
        $actualCounts[$type] = ($actualCounts[$type] ?? 0) + 1;
    }

    foreach ($data['summary']['countsByType'] as $type => $declaredCount) {
        $actual = $actualCounts[$type] ?? 0;
        if ($actual !== $declaredCount) {
            $errors[] = "summary.countsByType[$type] declares $declaredCount but $actual records of that type were found.";
        }
        unset($actualCounts[$type]);
    }
    foreach ($actualCounts as $type => $count) {
        $errors[] = "Found $count record(s) of contentType \"$type\" not represented in summary.countsByType.";
    }

    return ['errors' => $errors, 'data' => $data];
}

// ---------------------------------------------------------------------------
// Step 2: per-record validation
// ---------------------------------------------------------------------------

/** Header-injection guard for any value that could end up reflected in an HTTP header
 *  (canonical URLs, redirect targets, meta values echoed into <meta> tags server-side, etc). */
function import_has_header_injection(string $value): bool
{
    return (bool) preg_match('/[\r\n]/', $value);
}

function import_is_safe_canonical(string $url): bool
{
    if ($url === '') {
        return true; // absence is a separate (missing-field) check
    }
    if (import_has_header_injection($url)) {
        return false;
    }
    if (str_starts_with($url, '/')) {
        return !str_starts_with($url, '//'); // reject protocol-relative URLs
    }
    $parts = parse_url($url);
    if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
        return false;
    }
    if ($parts['scheme'] !== 'https') {
        return false;
    }
    if (!empty($parts['user']) || !empty($parts['pass'])) {
        return false; // embedded credentials
    }
    if (strtolower($parts['host']) !== IMPORT_CANONICAL_HOST) {
        return false;
    }
    return true;
}

/** Very small, deliberately conservative unsafe-content scan — reused for HTML bodies and for
 *  schema JSON serialized back to a string. Does not attempt full HTML parsing (sanitize_html()
 *  already owns that at write time); this is a validation-time reject/report pass only. */
function import_contains_unsafe_markup(string $text): ?string
{
    if (preg_match('/<script\b/i', $text)) {
        return 'contains a <script> tag';
    }
    if (preg_match('/\bon[a-z]+\s*=/i', $text)) {
        return 'contains an inline event handler attribute (onXxx=)';
    }
    if (preg_match('/javascript\s*:/i', $text)) {
        return 'contains a javascript: URL';
    }
    return null;
}

/** Rough well-formedness check for HTML fragments — not a full parser (sanitize_html() is the
 *  real sanitizer used at write time); this only flags obviously broken markup so a bad record
 *  is reported rather than silently saved. */
function import_html_is_malformed(string $html): bool
{
    if (trim($html) === '' || !str_contains($html, '<')) {
        return false;
    }
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><div>' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    $fatalErrors = array_filter(libxml_get_errors(), fn($e) => $e->level === LIBXML_ERR_FATAL);
    libxml_clear_errors();
    return count($fatalErrors) > 0;
}

/** Counts H1-equivalents in a record's content — an <h1> tag in HTML content, or a single
 *  leading "# " markdown heading. Used only to flag duplicate-H1 within one record's own body;
 *  the record's own dedicated `h1` field (present on service/venture records) is not counted
 *  here since it's stored separately, not inside the body. */
function import_count_h1_like(string $text, string $format): int
{
    if ($format === 'markdown') {
        return preg_match_all('/^#\s+\S/m', $text);
    }
    return preg_match_all('/<h1[\s>]/i', $text);
}

function import_normalize_route_local(string $path): string
{
    // Delegates to the project's own normalizer (api/lib/seo/documents.php) — never a second,
    // competing implementation of route normalization.
    return seo_normalize_route($path);
}

/** Builds the set of routes this import considers "known" for internal-link validation when a
 *  live database isn't available: every route already in the import file itself, plus every
 *  fixed static route from route_manifest.php (the single source of truth for route validity
 *  project-wide). When $pdo is available, dynamic slugs are checked against it as well by the
 *  caller (see import_validate_internal_links()). */
function import_known_routes_from_file(array $records): array
{
    $routes = array_map('seo_normalize_route', static_public_routes());
    foreach ($records as $r) {
        if (!empty($r['routePath']) && is_string($r['routePath'])) {
            $routes[] = seo_normalize_route($r['routePath']);
        }
    }
    return array_values(array_unique($routes));
}

/** @return array{errors: string[], warnings: string[]} */
function import_validate_record(array $record, int $index, array $knownRoutes, ?PDO $pdo): array
{
    $errors = [];
    $warnings = [];
    $label = "records[$index]" . (isset($record['routePath']) ? " ({$record['routePath']})" : '');

    // --- routePath ---------------------------------------------------------
    $routePath = $record['routePath'] ?? null;
    if (!is_string($routePath) || $routePath === '') {
        $errors[] = "$label: missing routePath.";
    } elseif (import_has_header_injection($routePath)) {
        $errors[] = "$label: routePath contains a newline/carriage-return (header injection risk).";
    }

    // --- canonicalUrl --------------------------------------------------------
    $canonical = $record['canonicalUrl'] ?? null;
    if ($canonical !== null && !is_string($canonical)) {
        $errors[] = "$label: canonicalUrl must be a string or null.";
    } elseif (is_string($canonical) && $canonical !== '' && !import_is_safe_canonical($canonical)) {
        $errors[] = "$label: canonicalUrl is not a safe absolute https://" . IMPORT_CANONICAL_HOST . "/... URL or a site-relative path — got: $canonical";
    }

    // --- contentType / sourceType / status / indexability / robots ---------
    $contentType = $record['contentType'] ?? null;
    if (!in_array($contentType, IMPORT_ALLOWED_CONTENT_TYPES, true)) {
        $errors[] = "$label: unsupported contentType \"" . (string) $contentType . '".';
    }
    if (!isset($record['status']) || !in_array($record['status'], IMPORT_ALLOWED_STATUSES, true)) {
        $errors[] = "$label: invalid or missing status.";
    }
    if (!isset($record['indexability']) || !in_array($record['indexability'], IMPORT_ALLOWED_INDEXABILITY, true)) {
        $errors[] = "$label: invalid or missing indexability (expected index|noindex).";
    }
    if (!isset($record['robots']) || !in_array($record['robots'], IMPORT_ALLOWED_ROBOTS, true)) {
        $errors[] = "$label: invalid or missing robots directive.";
    }

    // --- title / keyphrase / description -------------------------------------
    if (empty($record['title']) || !is_string($record['title'])) {
        $errors[] = "$label: missing title.";
    } elseif (import_has_header_injection($record['title'])) {
        $errors[] = "$label: title contains a newline/carriage-return.";
    }
    if (empty($record['primaryKeyphrase']) || !is_string($record['primaryKeyphrase'])) {
        $errors[] = "$label: missing primaryKeyphrase.";
    }
    if (empty($record['metaDescription']) || !is_string($record['metaDescription'])) {
        $warnings[] = "$label: missing metaDescription.";
    } elseif (import_has_header_injection($record['metaDescription'])) {
        $errors[] = "$label: metaDescription contains a newline/carriage-return.";
    }
    if (isset($record['relatedKeyphrases']) && !is_array($record['relatedKeyphrases'])) {
        $errors[] = "$label: relatedKeyphrases must be an array.";
    }
    if (isset($record['searchIntent']) && !is_string($record['searchIntent'])) {
        $errors[] = "$label: searchIntent must be a string.";
    }
    if (isset($record['seoTitle']) && (!is_string($record['seoTitle']) || import_has_header_injection($record['seoTitle']))) {
        $errors[] = "$label: seoTitle is invalid or contains a newline/carriage-return.";
    }

    // --- openGraph / twitter -------------------------------------------------
    foreach (['openGraph', 'twitter'] as $socialKey) {
        $social = $record[$socialKey] ?? null;
        if ($social !== null && !is_array($social)) {
            $errors[] = "$label: $socialKey must be an object.";
            continue;
        }
        if (is_array($social)) {
            foreach (['title', 'description'] as $f) {
                if (isset($social[$f]) && is_string($social[$f]) && import_has_header_injection($social[$f])) {
                    $errors[] = "$label: $socialKey.$f contains a newline/carriage-return.";
                }
            }
            if (isset($social['image']) && is_string($social['image']) && $social['image'] !== '') {
                $imgUrl = parse_url($social['image']);
                if ($imgUrl === false || (isset($imgUrl['scheme']) && !in_array(strtolower($imgUrl['scheme']), ['https', 'http'], true))) {
                    $errors[] = "$label: $socialKey.image has an invalid/unsafe URL scheme.";
                }
            }
        }
    }

    // --- schemaTypes / schema -------------------------------------------------
    if (isset($record['schemaTypes']) && !is_array($record['schemaTypes'])) {
        $errors[] = "$label: schemaTypes must be an array.";
    }
    if (!empty($record['schema'])) {
        $schemaText = json_encode($record['schema']);
        if ($schemaText === false) {
            $errors[] = "$label: schema could not be encoded — likely malformed.";
        } else {
            $unsafe = import_contains_unsafe_markup($schemaText);
            if ($unsafe !== null) {
                $errors[] = "$label: schema $unsafe.";
            }
        }
    }

    // --- content / contentFormat / H1 duplication / unsafe markup ------------
    $format = $record['contentFormat'] ?? null;
    $content = $record['content'] ?? null;
    if ($content !== null) {
        $contentText = is_string($content) ? $content : (is_array($content) ? json_encode($content) : null);
        if ($contentText === null) {
            $errors[] = "$label: content is an unsupported type.";
        } else {
            $unsafe = import_contains_unsafe_markup($contentText);
            if ($unsafe !== null) {
                $errors[] = "$label: content $unsafe.";
            }
            if (is_string($content) && $format === 'markdown' && import_html_is_malformed($content)) {
                // Markdown bodies sometimes carry raw HTML blocks; only flag if genuinely broken.
                $warnings[] = "$label: content contains malformed inline HTML.";
            }
            if (is_string($content)) {
                $h1Count = import_count_h1_like($content, (string) $format);
                if ($h1Count > 1) {
                    $warnings[] = "$label: content body contains $h1Count H1-level headings (expected at most 1).";
                }
            }
        }
    }

    // --- faqs ------------------------------------------------------------------
    if (isset($record['faqs'])) {
        if (!is_array($record['faqs'])) {
            $errors[] = "$label: faqs must be an array.";
        } else {
            foreach ($record['faqs'] as $fi => $faq) {
                if (!is_array($faq) || empty($faq['question']) || empty($faq['answer'])) {
                    $errors[] = "$label: faqs[$fi] is missing question or answer.";
                    continue;
                }
                foreach (['question', 'answer'] as $f) {
                    $unsafe = import_contains_unsafe_markup((string) $faq[$f]);
                    if ($unsafe !== null) {
                        $errors[] = "$label: faqs[$fi].$f $unsafe.";
                    }
                }
            }
        }
    }

    // --- internalLinkSuggestions: targets must resolve to a known route --------
    if (isset($record['internalLinkSuggestions'])) {
        if (!is_array($record['internalLinkSuggestions'])) {
            $errors[] = "$label: internalLinkSuggestions must be an array.";
        } else {
            foreach ($record['internalLinkSuggestions'] as $li => $link) {
                $target = is_array($link) ? ($link['target'] ?? $link['url'] ?? null) : (is_string($link) ? $link : null);
                if (!is_string($target) || $target === '') {
                    $errors[] = "$label: internalLinkSuggestions[$li] has no usable target.";
                    continue;
                }
                if (str_starts_with($target, 'http')) {
                    continue; // external — not this importer's concern
                }
                $normalizedTarget = seo_normalize_route($target);
                if (!in_array($normalizedTarget, $knownRoutes, true)) {
                    $warnings[] = "$label: internalLinkSuggestions[$li] target \"$target\" does not match any known route in this import file or route_manifest.php.";
                }
            }
        }
    }

    return ['errors' => $errors, 'warnings' => $warnings];
}

/** File-wide checks that need to see every record at once: duplicate normalized routes,
 *  duplicate canonicals, and route ownership conflicts (same route claimed by two different
 *  contentTypes). Returns errors keyed by nothing in particular — just a flat list, each
 *  message names the offending route(s)/index(es). */
function import_validate_cross_record(array $records): array
{
    $errors = [];
    $routeToIndexes = [];
    $canonicalToIndexes = [];
    $routeToTypes = [];

    foreach ($records as $i => $r) {
        if (!is_array($r)) {
            continue;
        }
        if (is_string($r['routePath'] ?? null) && $r['routePath'] !== '') {
            $norm = seo_normalize_route($r['routePath']);
            $routeToIndexes[$norm][] = $i;
            $routeToTypes[$norm][($r['contentType'] ?? '?')][] = $i;
        }
        if (is_string($r['canonicalUrl'] ?? null) && $r['canonicalUrl'] !== '') {
            $normCanon = strtolower(rtrim($r['canonicalUrl'], '/'));
            $canonicalToIndexes[$normCanon][] = $i;
        }
    }

    foreach ($routeToIndexes as $route => $indexes) {
        if (count($indexes) > 1) {
            $errors[] = 'Duplicate normalized route "' . $route . '" at records[' . implode(',', $indexes) . '].';
        }
    }
    foreach ($canonicalToIndexes as $canon => $indexes) {
        if (count($indexes) > 1) {
            $errors[] = 'Duplicate canonical "' . $canon . '" at records[' . implode(',', $indexes) . '].';
        }
    }
    foreach ($routeToTypes as $route => $byType) {
        if (count($byType) > 1) {
            $desc = [];
            foreach ($byType as $type => $indexes) {
                $desc[] = "$type=[" . implode(',', $indexes) . ']';
            }
            $errors[] = 'Route "' . $route . '" is claimed by more than one contentType: ' . implode(', ', $desc) . '.';
        }
    }

    return $errors;
}

// ---------------------------------------------------------------------------
// Content-type mapping & slug derivation
// ---------------------------------------------------------------------------

/** Maps the import file's contentType vocabulary onto this project's internal content_type /
 *  seo_meta.entity_type vocabulary (SEO_CONTENT_TYPES + SEO_VIRTUAL_CONTENT_TYPES). Only "blog"
 *  differs (-> "blog_post"); everything else is already the same string. */
function import_internal_content_type(string $jsonType): string
{
    return $jsonType === 'blog' ? 'blog_post' : $jsonType;
}

/** Best-effort slug derivation from a record's routePath, given its contentType. Documented
 *  assumption (see final report): the import file's `service` records use a bare top-level
 *  routePath (e.g. "/business-website-design") while this project's live services are actually
 *  served at "/services/{slug}" (see api/lib/seo/input.php::seo_public_url and
 *  api/lib/route_manifest.php's dynamic_route_sources()) — except for the handful of
 *  "category" services in reserved_service_slugs() that really do live at a bare top-level
 *  route. This function still derives the slug as the last path segment either way, since
 *  matching against the `services` table by slug is meaningful regardless of which URL prefix
 *  the record's author assumed; import_validate_record() surfaces the prefix mismatch itself as
 *  a warning via the internal-link/known-route checks, it is not silently hidden. */
function import_derive_slug(string $jsonType, string $routePath): string
{
    $norm = seo_normalize_route($routePath);
    if ($jsonType === 'venture') {
        return str_starts_with($norm, '/our-ventures/') ? substr($norm, strlen('/our-ventures/')) : trim($norm, '/');
    }
    if ($jsonType === 'blog') {
        return str_starts_with($norm, '/blog/') ? substr($norm, strlen('/blog/')) : trim($norm, '/');
    }
    // seo_page, service, static_page: single trailing segment.
    $trimmed = trim($norm, '/');
    $segments = $trimmed === '' ? [] : explode('/', $trimmed);
    return $segments ? end($segments) : '';
}

// ---------------------------------------------------------------------------
// Step 3/6: matching against the database, in the exact priority order specified:
//   1. existing immutable CMS ownership/association
//   2. existing seo_documents.document_key
//   3. existing content type + immutable content ID
//   4. exact normalized canonical route
//   5. exact normalized route path
// For a real DB row (seo_page/service/blog_post), (1) and (3) collapse into the same lookup
// (find-by-slug IS the CMS ownership check here, since slug is this project's stable natural
// key for those tables) — implemented once and reused. For virtual types (static_page/venture)
// there is no content row at all; only seo_documents.document_key applies (priority 2).
// ---------------------------------------------------------------------------

/** @return array{priority:int, reason:string, contentId:?int, documentId:?int, existingRow:?array}|null */
function import_match_document(PDO $pdo, array $record): ?array
{
    $jsonType = $record['contentType'];
    $internalType = import_internal_content_type($jsonType);
    $routePath = (string) $record['routePath'];
    $normRoute = seo_normalize_route($routePath);
    $slug = import_derive_slug($jsonType, $routePath);

    // Virtual types: no content row of their own; existence is entirely the seo_documents row.
    if (in_array($internalType, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        $key = seo_document_key($internalType, null, $routePath);
        $doc = seo_find_document_by_key($pdo, $key);
        if ($doc) {
            return ['priority' => 2, 'reason' => "existing seo_documents.document_key=$key", 'contentId' => (int) $doc['id'], 'documentId' => (int) $doc['id'], 'existingRow' => $doc];
        }
        // Not yet synced into the registry (seo_sync_registry() hasn't run, or this route isn't
        // a real static_public_routes()/venture route at all) — fall through to route-path match
        // against seo_documents directly, in case the row exists under a route_path that hasn't
        // been re-keyed.
        $stmt = $pdo->prepare('SELECT * FROM seo_documents WHERE route_path = :route LIMIT 1');
        $stmt->execute(['route' => $normRoute]);
        $doc = $stmt->fetch();
        if ($doc) {
            return ['priority' => 5, 'reason' => 'existing seo_documents.route_path match', 'contentId' => (int) $doc['id'], 'documentId' => (int) $doc['id'], 'existingRow' => $doc];
        }
        return null; // no document yet — registry sync (an existing, separate tool) must run first
    }

    // Priority 1 & 3: real content row, matched by this project's stable natural key (slug).
    $existing = match ($internalType) {
        'seo_page' => $slug !== '' ? find_seo_page_by_slug($pdo, $slug, false) : null,
        'service' => $slug !== '' ? find_service_by_slug($pdo, $slug, false) : null,
        'blog_post' => $slug !== '' ? find_blog_post_by_slug($pdo, $slug, false) : null,
        default => null,
    };
    if ($existing) {
        $doc = seo_find_document_by_content($pdo, $internalType, (int) $existing['id']);
        return [
            'priority' => 1,
            'reason' => "existing $internalType row matched by slug=$slug (immutable CMS ownership)",
            'contentId' => (int) $existing['id'],
            'documentId' => $doc['id'] ?? null,
            'existingRow' => $existing,
        ];
    }

    // Priority 4: exact normalized canonical route, via seo_meta.canonical_url (UNIQUE column).
    $canonical = (string) ($record['canonicalUrl'] ?? '');
    if ($canonical !== '') {
        $stmt = $pdo->prepare('SELECT entity_type, entity_id FROM seo_meta WHERE canonical_url = :url LIMIT 1');
        $stmt->execute(['url' => $canonical]);
        $row = $stmt->fetch();
        if ($row && $row['entity_type'] === $internalType) {
            $existingRow = seo_load_content_row_safe($pdo, $internalType, (int) $row['entity_id']);
            if ($existingRow) {
                return ['priority' => 4, 'reason' => 'matched by canonical_url', 'contentId' => (int) $row['entity_id'], 'documentId' => null, 'existingRow' => $existingRow];
            }
        }
    }

    // Priority 5: exact normalized route path, via seo_documents.route_path.
    $stmt = $pdo->prepare('SELECT * FROM seo_documents WHERE route_path = :route AND content_type = :type LIMIT 1');
    $stmt->execute(['route' => $normRoute, 'type' => $internalType]);
    $doc = $stmt->fetch();
    if ($doc && $doc['content_id']) {
        $existingRow = seo_load_content_row_safe($pdo, $internalType, (int) $doc['content_id']);
        if ($existingRow) {
            return ['priority' => 5, 'reason' => 'matched by seo_documents.route_path', 'contentId' => (int) $doc['content_id'], 'documentId' => (int) $doc['id'], 'existingRow' => $existingRow];
        }
    }

    return null; // no match at any priority — this is a CREATE
}

/** Thin, defensive wrapper — this script deliberately does not require api/lib/seo/analyze.php
 *  (seo_load_content_row()) since that file pulls in the scoring engine's dependency chain;
 *  duplicating just the three lookups this script actually needs keeps that boundary clean. */
function seo_load_content_row_safe(PDO $pdo, string $internalType, int $id): ?array
{
    return match ($internalType) {
        'seo_page' => find_seo_page($pdo, $id),
        'service' => find_service($pdo, $id),
        'blog_post' => find_blog_post($pdo, $id),
        default => null,
    };
}

// ---------------------------------------------------------------------------
// Step 8: field classification
//   CREATE            — no existing record; this field will be set on a brand-new draft row
//   FILL_MISSING       — existing value is empty and the incoming value is valid -> safe to apply
//   UNCHANGED          — existing value already equals the incoming value (normalized)
//   PROPOSE_OVERWRITE — existing value is non-empty and differs -> never auto-applied
//   CONFLICT           — values differ in a way that isn't a simple overwrite (e.g. two
//                        different non-empty canonical URLs, or a status downgrade attempt)
//   SKIP               — field intentionally not touched by this importer (e.g. venture contact
//                        details, which live in React component data, not the database)
// ---------------------------------------------------------------------------
function import_normalize_for_compare($value): string
{
    if (is_array($value)) {
        return json_encode($value);
    }
    return trim((string) $value);
}

function import_field_classify(?string $existingValue, ?string $incomingValue, bool $isCreate): string
{
    if ($isCreate) {
        return $incomingValue !== null && $incomingValue !== '' ? 'CREATE' : 'SKIP';
    }
    $existingNorm = trim((string) $existingValue);
    $incomingNorm = trim((string) $incomingValue);
    if ($incomingNorm === '') {
        return 'SKIP'; // never propose blanking out a field with an empty incoming value
    }
    if ($existingNorm === '') {
        return 'FILL_MISSING';
    }
    if ($existingNorm === $incomingNorm) {
        return 'UNCHANGED';
    }
    return 'PROPOSE_OVERWRITE';
}

/** Builds the full field-level diff for one record against its match (or null if this is a
 *  CREATE). This is the one function both dry-run reporting and apply-mode consult, so the two
 *  modes can never disagree about what a field's classification is. */
function import_build_field_diffs(array $record, ?array $match): array
{
    $jsonType = $record['contentType'];
    $internalType = import_internal_content_type($jsonType);
    $isCreate = $match === null;
    $existing = $match['existingRow'] ?? null;
    $diffs = [];

    $addDiff = function (string $field, $existingValue, $incomingValue) use (&$diffs, $isCreate) {
        $diffs[$field] = [
            'existing' => is_string($existingValue) ? mb_substr($existingValue, 0, 200) : $existingValue,
            'incoming' => is_string($incomingValue) ? mb_substr($incomingValue, 0, 200) : $incomingValue,
            'classification' => import_field_classify(
                $existingValue === null ? null : import_normalize_for_compare($existingValue),
                $incomingValue === null ? null : import_normalize_for_compare($incomingValue),
                $isCreate
            ),
        ];
    };

    // Metadata fields common to every real content type + virtual documents.
    $addDiff('meta_title', $existing['meta_title'] ?? null, $record['seoTitle'] ?? null);
    $addDiff('meta_description', $existing['meta_description'] ?? null, $record['metaDescription'] ?? null);
    $addDiff('canonical_url', $existing['canonical_url'] ?? null, $record['canonicalUrl'] ?? null);
    $addDiff('robots', import_robots_string_from_row($existing), $record['robots'] ?? null);

    switch ($internalType) {
        case 'seo_page':
            $addDiff('title', $existing['title'] ?? null, $record['title'] ?? null);
            $addDiff('h1', $existing['h1'] ?? null, $record['h1'] ?? $record['title'] ?? null);
            $addDiff('primary_keyword', $existing['primary_keyword'] ?? null, $record['primaryKeyphrase'] ?? null);
            $addDiff('content_body', $existing['hero_content'] ?? ($existing['content_sections'] ?? null), is_string($record['content'] ?? null) ? $record['content'] : null);
            break;
        case 'service':
            $addDiff('name', $existing['name'] ?? null, $record['title'] ?? null);
            $addDiff('h1', $existing['h1'] ?? null, $record['h1'] ?? $record['title'] ?? null);
            $addDiff('hero_description', $existing['hero_description'] ?? null, import_extract_service_hero_description($record));
            break;
        case 'blog_post':
            $addDiff('title', $existing['title'] ?? null, $record['title'] ?? null);
            $addDiff('excerpt', $existing['excerpt'] ?? null, $record['metaDescription'] ?? null);
            $addDiff('content_body', $existing['content'] ?? null, import_extract_blog_content($record));
            break;
        case 'venture':
            // Venture contact details (phones/email/website/googleBusinessUrl) live in React
            // component data (VentureDetail.tsx / src/data), never in the database — this
            // importer must never propose changing them, only report that they were seen.
            foreach (['phones', 'email', 'website', 'googleBusinessUrl'] as $contactField) {
                $incomingContact = $record['content'][$contactField] ?? $record[$contactField] ?? null;
                $diffs["contact.$contactField"] = [
                    'existing' => null,
                    'incoming' => $incomingContact,
                    'classification' => 'SKIP',
                ];
            }
            break;
        case 'static_page':
            // Metadata-only: no body content field exists for static pages at all.
            break;
    }

    return $diffs;
}

function import_robots_string_from_row(?array $existing): ?string
{
    if ($existing === null) {
        return null;
    }
    if (!array_key_exists('robots_index', $existing)) {
        return null;
    }
    $index = !empty($existing['robots_index']) ? 'index' : 'noindex';
    $follow = !empty($existing['robots_follow']) ? 'follow' : 'nofollow';
    return "$index,$follow";
}

// ---------------------------------------------------------------------------
// Step 3/6/7: apply logic per content type (only ever called under --apply)
// ---------------------------------------------------------------------------

/** Applies FILL_MISSING (always) and, when explicitly allowed, PROPOSE_OVERWRITE field changes
 *  for one record. Never changes `status` on an existing row (never auto-publish, never
 *  silently un-publish either — status is entirely operator-controlled once a row exists).
 *  Returns a short human-readable summary of what happened, for the audit log. */
function import_apply_record(PDO $pdo, int $adminId, array $record, ?array $match, array $diffs, bool $allowOverwrites): string
{
    $jsonType = $record['contentType'];
    $internalType = import_internal_content_type($jsonType);
    $routePath = (string) $record['routePath'];

    if (in_array($internalType, SEO_VIRTUAL_CONTENT_TYPES, true)) {
        return import_apply_virtual($pdo, $adminId, $internalType, $routePath, $record, $match, $diffs, $allowOverwrites);
    }

    return match ($internalType) {
        'seo_page' => import_apply_seo_page($pdo, $adminId, $record, $match, $diffs, $allowOverwrites),
        'service' => import_apply_service($pdo, $adminId, $record, $match, $diffs, $allowOverwrites),
        'blog_post' => import_apply_blog($pdo, $adminId, $record, $match, $diffs, $allowOverwrites),
        default => throw new RuntimeException("No apply handler for content type $internalType"),
    };
}

/** Decides, per field, whether this apply pass should write the incoming value: yes for
 *  FILL_MISSING and CREATE always; yes for PROPOSE_OVERWRITE only when $allowOverwrites is
 *  true; never for UNCHANGED/CONFLICT/SKIP. */
function import_should_write(array $diffs, string $field, bool $allowOverwrites): bool
{
    $classification = $diffs[$field]['classification'] ?? null;
    return match ($classification) {
        'CREATE', 'FILL_MISSING' => true,
        'PROPOSE_OVERWRITE' => $allowOverwrites,
        default => false,
    };
}

function import_apply_seo_page(PDO $pdo, int $adminId, array $record, ?array $match, array $diffs, bool $allowOverwrites): string
{
    $slug = import_derive_slug('seo_page', $record['routePath']);
    if ($match === null) {
        $id = create_seo_page($pdo, [
            'title' => (string) $record['title'],
            'slug' => $slug,
            'primary_keyword' => $record['primaryKeyphrase'] ?? null,
            'secondary_keywords' => $record['relatedKeyphrases'] ?? [],
            'search_intent' => $record['searchIntent'] ?? null,
            'h1' => $record['h1'] ?? $record['title'],
            'hero_content' => is_string($record['content'] ?? null) ? mb_substr($record['content'], 0, 1000) : null,
            'content_sections' => is_string($record['content'] ?? null)
                ? [['kind' => 'html', 'heading' => '', 'body' => $record['content'], 'items' => []]]
                : [],
            'status' => 'draft', // never auto-publish, regardless of the record's own `status`
        ], $adminId);
        if (!empty($record['faqs'])) {
            save_faqs($pdo, 'seo_page', $id, $record['faqs']);
        }
        import_save_seo_meta_from_record($pdo, 'seo_page', $id, $record);
        return "created seo_pages id=$id slug=$slug (draft)";
    }

    $id = (int) $match['contentId'];
    $existing = $match['existingRow'];
    $data = [
        'title' => $existing['title'],
        'slug' => $existing['slug'],
        'primary_keyword' => $existing['primary_keyword'],
        'secondary_keywords' => $existing['secondary_keywords'],
        'search_intent' => $existing['search_intent'],
        'target_location' => $existing['target_location'],
        'h1' => $existing['h1'],
        'hero_content' => $existing['hero_content'],
        'content_sections' => $existing['content_sections'],
        'internal_links' => $existing['internal_links'],
        'related_services' => $existing['related_services'],
        'cta_heading' => $existing['cta_heading'],
        'cta_body' => $existing['cta_body'],
        'featured_image' => $existing['featured_image'],
        'breadcrumb' => $existing['breadcrumb'],
        'status' => $existing['status'], // never touched by this importer
        'published_at' => $existing['published_at'],
    ];
    if (import_should_write($diffs, 'title', $allowOverwrites)) {
        $data['title'] = (string) $record['title'];
    }
    if (import_should_write($diffs, 'h1', $allowOverwrites)) {
        $data['h1'] = (string) ($record['h1'] ?? $record['title']);
    }
    if (import_should_write($diffs, 'primary_keyword', $allowOverwrites)) {
        $data['primary_keyword'] = $record['primaryKeyphrase'];
    }
    if (import_should_write($diffs, 'content_body', $allowOverwrites) && is_string($record['content'] ?? null)) {
        $data['content_sections'] = [['kind' => 'html', 'heading' => '', 'body' => $record['content'], 'items' => []]];
    }
    update_seo_page($pdo, $id, $data, $adminId);
    import_save_seo_meta_from_record($pdo, 'seo_page', $id, $record, $diffs, $allowOverwrites);
    return "updated seo_pages id=$id slug={$existing['slug']}";
}

function import_apply_service(PDO $pdo, int $adminId, array $record, ?array $match, array $diffs, bool $allowOverwrites): string
{
    $slug = import_derive_slug('service', $record['routePath']);
    if ($match === null) {
        $id = create_service($pdo, [
            'name' => (string) $record['title'],
            'slug' => $slug,
            'h1' => $record['h1'] ?? $record['title'],
            'hero_description' => import_extract_service_hero_description($record),
            'status' => 'draft',
        ], $adminId);
        if (!empty($record['faqs'])) {
            save_faqs($pdo, 'service', $id, $record['faqs']);
        }
        import_save_seo_meta_from_record($pdo, 'service', $id, $record);
        return "created services id=$id slug=$slug (draft)";
    }

    $id = (int) $match['contentId'];
    $existing = $match['existingRow'];
    $data = [
        'name' => $existing['name'],
        'slug' => $existing['slug'],
        'category' => $existing['category'],
        'hero_label' => $existing['hero_label'],
        'h1' => $existing['h1'],
        'hero_description' => $existing['hero_description'],
        'hero_cta_label' => $existing['hero_cta_label'],
        'hero_notes' => $existing['hero_notes'],
        'blocks' => $existing['blocks'],
        'related' => $existing['related'],
        'cta_heading' => $existing['cta_heading'],
        'cta_body' => $existing['cta_body'],
        'featured_image' => $existing['featured_image'],
        'icon' => $existing['icon'],
        'display_order' => $existing['display_order'],
        'menu_visibility' => $existing['menu_visibility'],
        'status' => $existing['status'], // never touched
        'published_at' => $existing['published_at'],
    ];
    if (import_should_write($diffs, 'name', $allowOverwrites)) {
        $data['name'] = (string) $record['title'];
    }
    if (import_should_write($diffs, 'h1', $allowOverwrites)) {
        $data['h1'] = (string) ($record['h1'] ?? $record['title']);
    }
    if (import_should_write($diffs, 'hero_description', $allowOverwrites)) {
        $extracted = import_extract_service_hero_description($record);
        if ($extracted !== null) {
            $data['hero_description'] = $extracted;
        }
    }
    update_service($pdo, $id, $data, $adminId);
    import_save_seo_meta_from_record($pdo, 'service', $id, $record, $diffs, $allowOverwrites);
    return "updated services id=$id slug={$existing['slug']}";
}

function import_apply_blog(PDO $pdo, int $adminId, array $record, ?array $match, array $diffs, bool $allowOverwrites): string
{
    $slug = import_derive_slug('blog', $record['routePath']);
    if ($match === null) {
        $id = create_blog_post($pdo, [
            'title' => (string) $record['title'],
            'slug' => $slug,
            'excerpt' => $record['metaDescription'] ?? null,
            'content' => import_extract_blog_content($record),
            'status' => 'draft',
        ], $adminId);
        if (!empty($record['faqs'])) {
            save_faqs($pdo, 'blog_post', $id, $record['faqs']);
        }
        import_save_seo_meta_from_record($pdo, 'blog_post', $id, $record);
        return "created blog_posts id=$id slug=$slug (draft)";
    }

    $id = (int) $match['contentId'];
    $existing = $match['existingRow'];
    $data = [
        'title' => $existing['title'],
        'slug' => $existing['slug'],
        'excerpt' => $existing['excerpt'],
        'content' => $existing['content'],
        'featured_image' => $existing['featured_image'],
        'author_name' => $existing['author_name'],
        'category' => $existing['category_slug'] ?? null,
        'reading_time_minutes' => $existing['reading_time_minutes'],
        'status' => $existing['status'], // never touched
        'published_at' => $existing['published_at'],
        'tags' => array_column($existing['tags'] ?? [], 'name'),
    ];
    if (import_should_write($diffs, 'title', $allowOverwrites)) {
        $data['title'] = (string) $record['title'];
    }
    if (import_should_write($diffs, 'excerpt', $allowOverwrites)) {
        $data['excerpt'] = $record['metaDescription'];
    }
    if (import_should_write($diffs, 'content_body', $allowOverwrites)) {
        $extracted = import_extract_blog_content($record);
        if ($extracted !== null) {
            $data['content'] = $extracted;
        }
    }
    update_blog_post($pdo, $id, $data, $adminId);
    import_save_seo_meta_from_record($pdo, 'blog_post', $id, $record, $diffs, $allowOverwrites);
    return "updated blog_posts id=$id slug={$existing['slug']}";
}

/** Virtual documents (static_page/venture) have no content row of their own; the only thing an
 *  apply can ever do is fill/propose their seo_meta (entity_type='seo_document'). If the
 *  document doesn't exist yet in seo_documents, this importer does NOT create one — that is
 *  seo_sync_registry()'s job (api/lib/seo/documents.php), a separate, already-existing, trusted
 *  tool this script deliberately does not duplicate. */
function import_apply_virtual(PDO $pdo, int $adminId, string $internalType, string $routePath, array $record, ?array $match, array $diffs, bool $allowOverwrites): string
{
    if ($match === null || empty($match['documentId'])) {
        return "SKIPPED $internalType at $routePath — no seo_documents row yet; run the existing SEO Studio registry sync first.";
    }
    $documentId = (int) $match['documentId'];

    // A registry document's route can collide with a canonical URL already owned by a real,
    // separately-tracked CMS entity (e.g. a legacy `service` row published at the same slug
    // before the registry document existed). Per the ownership-priority rule (existing CMS
    // content ownership beats a prepared-dataset record), never fight that entity for the
    // canonical — skip this document cleanly and report it, the same way /seo-company-jaisalmer
    // is already excluded, rather than letting save_seo_meta()'s uniqueness check throw and
    // roll back the whole batch (which would collaterally undo unrelated sibling records).
    $incomingCanonical = $record['canonicalUrl'] ?? null;
    if ($incomingCanonical) {
        $conflict = import_find_canonical_owner($pdo, 'seo_document', $documentId, $incomingCanonical);
        if ($conflict) {
            return "SKIPPED $internalType at $routePath — canonical $incomingCanonical is already owned by {$conflict['entity_type']}:{$conflict['entity_id']} (a real, separately-tracked CMS entity). Registry/content ownership conflict — needs manual resolution, not an automated overwrite.";
        }
    }

    import_save_seo_meta_from_record($pdo, 'seo_document', $documentId, $record, $diffs, $allowOverwrites);
    return "updated seo_meta for seo_documents id=$documentId ($internalType at $routePath) — content itself untouched (route-only document)";
}

/** Read-only lookup mirroring save_seo_meta()'s own uniqueness check, so callers can decide to
 *  skip gracefully instead of triggering (and having to roll back a whole batch for) its
 *  RuntimeException. Returns the conflicting owner's entity_type/entity_id, or null if free. */
function import_find_canonical_owner(PDO $pdo, string $entityType, int $entityId, string $canonicalUrl): ?array
{
    $stmt = $pdo->prepare(
        'SELECT entity_type, entity_id FROM seo_meta WHERE canonical_url = :url AND NOT (entity_type = :type AND entity_id = :id) LIMIT 1'
    );
    $stmt->execute(['url' => $canonicalUrl, 'type' => $entityType, 'id' => $entityId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Applies FILL_MISSING/allowed-overwrite metadata fields via save_seo_meta() — the same
 *  function every existing controller and seed script uses, so canonical-URL uniqueness and
 *  json-encoding of the schema field are enforced identically everywhere. When $diffs is
 *  omitted (brand-new content, i.e. straight after create_*()), every metadata field is written
 *  once, unconditionally — there is nothing to conflict with yet. */
function import_save_seo_meta_from_record(PDO $pdo, string $entityType, int $entityId, array $record, ?array $diffs = null, bool $allowOverwrites = false): void
{
    $current = $diffs !== null ? get_seo_meta($pdo, $entityType, $entityId) : null;
    $data = [
        'meta_title' => $current['meta_title'] ?? null,
        'meta_description' => $current['meta_description'] ?? null,
        'canonical_url' => $current['canonical_url'] ?? null,
        'og_title' => $current['og_title'] ?? null,
        'og_description' => $current['og_description'] ?? null,
        'og_image' => $current['og_image'] ?? null,
        'twitter_title' => $current['twitter_title'] ?? null,
        'twitter_description' => $current['twitter_description'] ?? null,
        'twitter_image' => $current['twitter_image'] ?? null,
        'robots_index' => $current['robots_index'] ?? true,
        'robots_follow' => $current['robots_follow'] ?? true,
        'schema' => $current['schema'] ?? null,
    ];

    $writeMetaTitle = $diffs === null || import_should_write($diffs, 'meta_title', $allowOverwrites);
    $writeMetaDesc = $diffs === null || import_should_write($diffs, 'meta_description', $allowOverwrites);
    $writeCanonical = $diffs === null || import_should_write($diffs, 'canonical_url', $allowOverwrites);
    $writeRobots = $diffs === null || import_should_write($diffs, 'robots', $allowOverwrites);

    if ($writeMetaTitle && !empty($record['seoTitle'])) {
        $data['meta_title'] = (string) $record['seoTitle'];
    }
    if ($writeMetaDesc && !empty($record['metaDescription'])) {
        $data['meta_description'] = (string) $record['metaDescription'];
    }
    if ($writeCanonical && !empty($record['canonicalUrl'])) {
        $data['canonical_url'] = (string) $record['canonicalUrl'];
    }
    if ($writeRobots && !empty($record['robots']) && is_string($record['robots'])) {
        [$idx, $follow] = array_pad(explode(',', $record['robots']), 2, '');
        $data['robots_index'] = $idx === 'index';
        $data['robots_follow'] = $follow === 'follow';
    }
    $og = $record['openGraph'] ?? [];
    if (is_array($og)) {
        if (($diffs === null || true) && !empty($og['title']) && empty($data['og_title'])) {
            $data['og_title'] = (string) $og['title'];
        }
        if (!empty($og['description']) && empty($data['og_description'])) {
            $data['og_description'] = (string) $og['description'];
        }
        if (!empty($og['image']) && empty($data['og_image'])) {
            $data['og_image'] = (string) $og['image'];
        }
    }
    $tw = $record['twitter'] ?? [];
    if (is_array($tw)) {
        if (!empty($tw['title']) && empty($data['twitter_title'])) {
            $data['twitter_title'] = (string) $tw['title'];
        }
        if (!empty($tw['description']) && empty($data['twitter_description'])) {
            $data['twitter_description'] = (string) $tw['description'];
        }
        if (!empty($tw['image']) && empty($data['twitter_image'])) {
            $data['twitter_image'] = (string) $tw['image'];
        }
    }
    // Schema storage is intentionally NOT touched here: SeoStudioController already owns the
    // one place schema JSON is written (seo_meta.schema_json via save_seo_meta), and the import
    // file's `schema` field is null on every sampled record (`schemaTypes` is advisory metadata
    // only). Writing a competing schema payload here risks exactly the "duplicate/conflicting
    // JSON-LD" the task spec explicitly forbids, so this importer only ever fills schema_json
    // when the record supplies a concrete, non-null `schema` object AND the field is currently
    // empty (FILL_MISSING semantics) — never an overwrite of an existing schema.
    if (empty($data['schema']) && !empty($record['schema']) && is_array($record['schema'])) {
        $data['schema'] = $record['schema'];
    }

    $err = save_seo_meta($pdo, $entityType, $entityId, $data);
    if ($err) {
        throw new RuntimeException("save_seo_meta failed for $entityType:$entityId — $err");
    }
}

// ---------------------------------------------------------------------------
// Resumable state file (apply mode only)
// ---------------------------------------------------------------------------
function import_load_state(string $path): array
{
    if (!is_file($path)) {
        return ['processedRoutes' => [], 'startedAt' => date('c'), 'file' => null, 'checksum' => null];
    }
    $raw = file_get_contents($path);
    $decoded = $raw !== false ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : ['processedRoutes' => [], 'startedAt' => date('c'), 'file' => null, 'checksum' => null];
}

function import_save_state(string $path, array $state): void
{
    $tmp = $path . '.' . getmypid() . '.tmp';
    file_put_contents($tmp, json_encode($state, JSON_PRETTY_PRINT));
    rename($tmp, $path);
}

/** Reads --apply-overwrites into a lookup set of allowed route paths / documentKeys, or a
 *  special 'all' marker. Defaults to "nothing allowed" (empty set, not 'all') when the flag is
 *  omitted — the off-by-default gate the safety spec requires. */
function import_load_overwrite_allowlist(?string $value): array
{
    if ($value === null) {
        return ['all' => false, 'set' => []];
    }
    if (strtolower($value) === 'all') {
        return ['all' => true, 'set' => []];
    }
    if (!is_file($value)) {
        fwrite(STDERR, "Warning: --apply-overwrites file not found: $value — treating as empty allowlist (no overwrites permitted).\n");
        return ['all' => false, 'set' => []];
    }
    $lines = array_filter(array_map('trim', file($value)));
    return ['all' => false, 'set' => array_map('seo_normalize_route', $lines)];
}

function import_overwrite_allowed(array $allowlist, string $routePath): bool
{
    if ($allowlist['all']) {
        return true;
    }
    return in_array(seo_normalize_route($routePath), $allowlist['set'], true);
}

// =============================================================================================
// MAIN
// =============================================================================================
function import_main(array $argv): int
{
    $args = import_parse_args($argv);
    if ($args['help']) {
        import_print_help();
        return 0;
    }

    // ---- Safety gate: --apply always requires --confirmed-backup ----------------------------
    if ($args['apply'] && !$args['confirmed_backup']) {
        fwrite(STDERR, "ERROR: --apply requires --confirmed-backup. Refusing to run.\n");
        fwrite(STDERR, "Take (and verify) a real database backup first, then re-run with both flags.\n");
        return 1;
    }
    if ($args['apply'] && $args['dry_run']) {
        // --apply implies real writes; never let a stray --dry-run silently downgrade it or
        // vice versa — require the caller to be unambiguous.
        fwrite(STDERR, "ERROR: --apply and --dry-run cannot both be set. Choose one.\n");
        return 1;
    }

    echo "=== SEO Master Import ===\n";
    echo 'Mode: ' . ($args['apply'] ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)') . "\n";
    echo 'File: ' . $args['file'] . "\n\n";

    // ---- Step 1: checksum ---------------------------------------------------------------------
    if (!is_file($args['file'])) {
        fwrite(STDERR, "ERROR: import file not found: {$args['file']}\n");
        return 2;
    }
    $checksum = import_compute_sha256($args['file']);
    echo "SHA-256: $checksum\n\n";

    $structure = import_validate_structure($args['file']);
    if ($structure['errors']) {
        echo "STRUCTURAL VALIDATION FAILED:\n";
        foreach ($structure['errors'] as $e) {
            echo "  - $e\n";
        }
        echo "\nRefusing to proceed past structural validation.\n";
        return 2;
    }
    $data = $structure['data'];
    $records = $data['records'];
    echo 'Structural validation passed: ' . count($records) . " records, schemaVersion={$data['schemaVersion']}.\n\n";

    // ---- Step 2: per-record + cross-record validation ------------------------------------------
    $knownRoutes = import_known_routes_from_file($records);
    $recordErrors = [];
    $recordWarnings = [];
    foreach ($records as $i => $record) {
        if (!is_array($record)) {
            $recordErrors[$i] = ["records[$i] is not an object — skipped entirely."];
            continue;
        }
        $result = import_validate_record($record, $i, $knownRoutes, null);
        if ($result['errors']) {
            $recordErrors[$i] = $result['errors'];
        }
        if ($result['warnings']) {
            $recordWarnings[$i] = $result['warnings'];
        }
    }
    $crossErrors = import_validate_cross_record($records);

    $totalErrorCount = array_sum(array_map('count', $recordErrors)) + count($crossErrors);
    $totalWarningCount = array_sum(array_map('count', $recordWarnings));
    echo "Per-record validation: $totalErrorCount error(s) across " . count($recordErrors) . " record(s), $totalWarningCount warning(s), " . count($crossErrors) . " cross-record error(s).\n";

    // Explicit note on the /seo-company-jaisalmer route per the task's audit requirement.
    $hasJaisalmerRoute = false;
    foreach ($records as $r) {
        if (is_array($r) && ($r['routePath'] ?? '') === '/seo-company-jaisalmer') {
            $hasJaisalmerRoute = true;
            break;
        }
    }
    if (!$hasJaisalmerRoute) {
        echo "Note: /seo-company-jaisalmer is not present in this import file — already excluded/out of scope for this import (it retains its own real CMS ownership; see database/seed_seo_page_seo_company_jaisalmer.php and api/lib/seo/documents.php's SEO_ROUTES_WHERE_STATIC_OVERRIDE_WINS handling).\n";
    }
    echo "\n";

    // Records with hard errors are excluded from matching/classification but still appear in
    // the report so nothing is silently dropped.
    $validIndexes = array_values(array_diff(array_keys($records), array_keys($recordErrors)));

    // ---- Step 3+: attempt DB connection ---------------------------------------------------------
    $pdo = null;
    $dbError = null;
    try {
        $pdo = get_db_connection();
        $pdo->query('SELECT 1'); // fail fast/clearly rather than on the first real query below
    } catch (Throwable $e) {
        $dbError = $e->getMessage();
    }

    if ($pdo === null) {
        echo "Could not connect to the database — this environment has no live/configured\n";
        echo "database connection, so matching, classification, and (for --apply) writing cannot\n";
        echo "proceed. Validation-only results are shown above; nothing was written.\n";
        echo 'Underlying error: ' . $dbError . "\n\n";

        $partialReport = [
            'checksum' => $checksum,
            'file' => $args['file'],
            'database' => ['connected' => false, 'error' => $dbError],
            'structuralValidation' => ['errors' => $structure['errors']],
            'recordValidation' => ['errors' => $recordErrors, 'warnings' => $recordWarnings],
            'crossRecordErrors' => $crossErrors,
            'generatedAt' => date('c'),
        ];
        @file_put_contents(IMPORT_DRY_RUN_JSON, json_encode($partialReport, JSON_PRETTY_PRINT));
        echo 'Partial (validation-only) report written to ' . IMPORT_DRY_RUN_JSON . "\n";
        return 3;
    }

    echo "Database connection established.\n\n";

    if ($args['apply']) {
        return import_run_apply($pdo, $args, $records, $validIndexes, $recordErrors);
    }

    return import_run_dry_run($pdo, $args, $checksum, $records, $validIndexes, $recordErrors, $recordWarnings, $crossErrors);
}

/** @return int exit code */
function import_run_dry_run(PDO $pdo, array $args, string $checksum, array $records, array $validIndexes, array $recordErrors, array $recordWarnings, array $crossErrors): int
{
    $counters = [
        'total' => count($records),
        'invalid' => count($recordErrors),
        'byClassificationTotals' => ['CREATE' => 0, 'FILL_MISSING' => 0, 'UNCHANGED' => 0, 'PROPOSE_OVERWRITE' => 0, 'CONFLICT' => 0, 'SKIP' => 0],
        'byContentType' => [],
        'matchedByPriority' => [1 => 0, 2 => 0, 4 => 0, 5 => 0],
        'unmatched_create' => 0,
        'virtual_awaiting_registry_sync' => 0,
    ];

    $recordReports = [];
    foreach ($validIndexes as $i) {
        $record = $records[$i];
        $match = import_match_document($pdo, $record);
        $diffs = import_build_field_diffs($record, $match);

        foreach ($diffs as $field => $d) {
            $counters['byClassificationTotals'][$d['classification']] = ($counters['byClassificationTotals'][$d['classification']] ?? 0) + 1;
        }
        $type = $record['contentType'];
        $counters['byContentType'][$type] = $counters['byContentType'][$type] ?? ['records' => 0, 'matched' => 0, 'create' => 0];
        $counters['byContentType'][$type]['records']++;
        if ($match) {
            $counters['byContentType'][$type]['matched']++;
            $counters['matchedByPriority'][$match['priority']] = ($counters['matchedByPriority'][$match['priority']] ?? 0) + 1;
        } else {
            $counters['byContentType'][$type]['create']++;
            if (in_array(import_internal_content_type($type), SEO_VIRTUAL_CONTENT_TYPES, true)) {
                $counters['virtual_awaiting_registry_sync']++;
            } else {
                $counters['unmatched_create']++;
            }
        }

        $recordReports[] = [
            'index' => $i,
            'routePath' => $record['routePath'],
            'contentType' => $type,
            'matched' => $match !== null,
            'matchPriority' => $match['priority'] ?? null,
            'matchReason' => $match['reason'] ?? 'no match — would be created as a new draft (or is awaiting SEO Studio registry sync, for static_page/venture)',
            'fieldDiffs' => $diffs,
            'warnings' => $recordWarnings[$i] ?? [],
        ];
    }

    $report = [
        'generatedAt' => date('c'),
        'sourceFile' => $args['file'],
        'sha256' => $checksum,
        'database' => ['connected' => true],
        'counters' => $counters,
        'invalidRecords' => $recordErrors,
        'crossRecordErrors' => $crossErrors,
        'records' => $recordReports,
    ];

    file_put_contents(IMPORT_DRY_RUN_JSON, json_encode($report, JSON_PRETTY_PRINT));
    import_write_markdown_report($report);

    echo "Dry run complete.\n";
    echo '  ' . IMPORT_DRY_RUN_JSON . "\n";
    echo '  ' . IMPORT_REPORT_MD . "\n\n";
    echo "Field classification totals:\n";
    foreach ($counters['byClassificationTotals'] as $k => $v) {
        echo "  $k: $v\n";
    }
    echo "\nNext step: review the report above, then (only after a verified backup exists) re-run with --apply --confirmed-backup.\n";
    return 0;
}

function import_write_markdown_report(array $report): void
{
    $c = $report['counters'];
    $lines = [];
    $lines[] = '# SEO Master Import — Dry Run Report';
    $lines[] = '';
    $lines[] = '- Generated: ' . $report['generatedAt'];
    $lines[] = '- Source file: `' . $report['sourceFile'] . '`';
    $lines[] = '- SHA-256: `' . $report['sha256'] . '`';
    $lines[] = '- Total records: ' . $c['total'] . ' (invalid: ' . $c['invalid'] . ')';
    $lines[] = '';
    $lines[] = '## Field classification totals';
    $lines[] = '';
    foreach ($c['byClassificationTotals'] as $k => $v) {
        $lines[] = "- **$k**: $v";
    }
    $lines[] = '';
    $lines[] = '## By content type';
    $lines[] = '';
    $lines[] = '| Content type | Records | Matched existing | Would create |';
    $lines[] = '|---|---|---|---|';
    foreach ($c['byContentType'] as $type => $row) {
        $lines[] = "| $type | {$row['records']} | {$row['matched']} | {$row['create']} |";
    }
    $lines[] = '';
    $lines[] = '## Matches by priority';
    $lines[] = '';
    $lines[] = '1. Immutable CMS ownership (slug match): ' . ($c['matchedByPriority'][1] ?? 0);
    $lines[] = '2. Existing seo_documents.document_key: ' . ($c['matchedByPriority'][2] ?? 0);
    $lines[] = '4. Canonical route match: ' . ($c['matchedByPriority'][4] ?? 0);
    $lines[] = '5. Route path match: ' . ($c['matchedByPriority'][5] ?? 0);
    $lines[] = '- New records that would be created as drafts: ' . $c['unmatched_create'];
    $lines[] = '- static_page/venture records awaiting SEO Studio registry sync (`seo_sync_registry()`) before they can be matched: ' . $c['virtual_awaiting_registry_sync'];
    $lines[] = '';
    if ($report['crossRecordErrors']) {
        $lines[] = '## Cross-record errors';
        $lines[] = '';
        foreach ($report['crossRecordErrors'] as $e) {
            $lines[] = "- $e";
        }
        $lines[] = '';
    }
    if ($report['invalidRecords']) {
        $lines[] = '## Invalid records (excluded from matching)';
        $lines[] = '';
        foreach ($report['invalidRecords'] as $i => $errs) {
            $lines[] = "- records[$i]: " . implode('; ', $errs);
        }
        $lines[] = '';
    }
    $lines[] = '## Records proposing an overwrite (require --apply-overwrites to apply)';
    $lines[] = '';
    $anyOverwrite = false;
    foreach ($report['records'] as $r) {
        $overwriteFields = array_keys(array_filter($r['fieldDiffs'], fn($d) => $d['classification'] === 'PROPOSE_OVERWRITE'));
        if ($overwriteFields) {
            $anyOverwrite = true;
            $lines[] = '- `' . $r['routePath'] . '` (' . $r['contentType'] . '): ' . implode(', ', $overwriteFields);
        }
    }
    if (!$anyOverwrite) {
        $lines[] = '_None._';
    }
    $lines[] = '';
    file_put_contents(IMPORT_REPORT_MD, implode("\n", $lines) . "\n");
}

/** @return int exit code */
function import_run_apply(PDO $pdo, array $args, array $records, array $validIndexes, array $recordErrors): int
{
    $statePath = $args['resume'] ?? IMPORT_DEFAULT_STATE_FILE;
    $state = import_load_state($statePath);
    $processed = array_flip($state['processedRoutes'] ?? []);
    $allowlist = import_load_overwrite_allowlist($args['apply_overwrites']);

    $adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")->fetchColumn();
    if ($adminId <= 0) {
        fwrite(STDERR, "ERROR: could not find an admin user to attribute this import to (audit_log/created_by would be invalid). Aborting before any writes.\n");
        return 4;
    }

    $toProcess = [];
    foreach ($validIndexes as $i) {
        $route = seo_normalize_route((string) $records[$i]['routePath']);
        if (isset($processed[$route])) {
            continue; // resumed — already committed in a previous run
        }
        $toProcess[] = $i;
    }

    echo count($toProcess) . ' record(s) remaining to process (' . count($processed) . " already done, resuming from $statePath).\n";
    if (!$allowlist['all'] && !$allowlist['set']) {
        echo "--apply-overwrites was not given: PROPOSE_OVERWRITE fields will be left untouched on every matched record.\n";
    }
    echo "\n";

    $batchSize = IMPORT_BATCH_MAX; // 10-20 per batch; using the upper bound, still one transaction per batch
    $consecutiveErrors = 0;
    $created = 0;
    $updated = 0;
    $skipped = 0;
    $failed = 0;

    $batches = array_chunk($toProcess, $batchSize);
    foreach ($batches as $batchNum => $batchIndexes) {
        echo 'Batch ' . ($batchNum + 1) . '/' . count($batches) . ' (' . count($batchIndexes) . " records)...\n";
        $pdo->beginTransaction();
        $batchOk = true;
        $newlyProcessedRoutes = [];
        try {
            foreach ($batchIndexes as $i) {
                $record = $records[$i];
                $route = (string) $record['routePath'];
                $match = import_match_document($pdo, $record);
                $diffs = import_build_field_diffs($record, $match);
                $overwriteOk = import_overwrite_allowed($allowlist, $route);

                $internalType = import_internal_content_type($record['contentType']);
                if (in_array($internalType, SEO_VIRTUAL_CONTENT_TYPES, true) && ($match === null || empty($match['documentId']))) {
                    $skipped++;
                    $newlyProcessedRoutes[] = seo_normalize_route($route);
                    echo "  SKIP  $route — awaiting registry sync\n";
                    continue;
                }

                $summary = import_apply_record($pdo, $adminId, $record, $match, $diffs, $overwriteOk);
                $wasCreate = $match === null;
                $wasCreate ? $created++ : $updated++;
                echo '  ' . ($wasCreate ? 'CREATE' : 'UPDATE') . "  $route — $summary\n";

                // Mark prerender stale on any changed, published+indexable route — never marks
                // 'current' (only a real successful prerender build may do that; see
                // seo_mark_document_stale()'s own doc comment in documents.php).
                if (!$wasCreate) {
                    $isPublishedIndexable = ($match['existingRow']['status'] ?? '') === 'published' && ($record['indexability'] ?? '') === 'index';
                    if ($isPublishedIndexable) {
                        seo_mark_document_stale($pdo, $internalType, (int) $match['contentId'], hash('sha256', json_encode($record)), 'SEO Master Import applied changes');
                    }
                }

                audit_log($pdo, $adminId, $wasCreate ? 'seo_master_import_created' : 'seo_master_import_updated', $internalType, (string) ($match['contentId'] ?? 'new'), "route=$route");
                $newlyProcessedRoutes[] = seo_normalize_route($route);
            }
        } catch (Throwable $e) {
            $batchOk = false;
            $pdo->rollBack();
            $consecutiveErrors++;
            $failed += count($batchIndexes);
            fwrite(STDERR, '  BATCH FAILED, rolled back: ' . $e->getMessage() . "\n");
        }

        if ($batchOk) {
            $pdo->commit();
            $consecutiveErrors = 0;
            $state['processedRoutes'] = array_values(array_unique(array_merge($state['processedRoutes'] ?? [], $newlyProcessedRoutes)));
            $state['file'] = $args['file'];
            $state['lastBatchAt'] = date('c');
            import_save_state($statePath, $state);
        }

        if ($consecutiveErrors >= IMPORT_MAX_CONSECUTIVE_DB_ERRORS) {
            fwrite(STDERR, 'ABORTING: ' . IMPORT_MAX_CONSECUTIVE_DB_ERRORS . " consecutive batch failures. State saved to $statePath — re-run with --resume=$statePath after investigating.\n");
            return 4;
        }
    }

    echo "\nApply run complete. created=$created updated=$updated skipped=$skipped failed=$failed\n";
    echo "State file: $statePath\n";
    return $failed > 0 ? 4 : 0;
}

// ---------------------------------------------------------------------------
exit(import_main($argv));
