<?php
// Runs one fixture (docs/seo-studio-fixtures/*.json) through the PHP scoring engine and prints
// the result as JSON. Used standalone for manual inspection and by scripts/seo-parity-test.mjs
// to compare against the TS engine's output for the same fixture.
//
// Usage: php scripts/seo-run-php-engine.php docs/seo-studio-fixtures/some-fixture.json

declare(strict_types=1);

require __DIR__ . '/../api/lib/seo/scorer.php';

/** Minimal PDO-shaped stub for fixture testing: every duplicate/uniqueness lookup returns "not
 *  found" (fetch()/fetchColumn() => false), since fixtures test the deterministic scoring core,
 *  not live-database integration (that's exercised by the real controllers, following the same
 *  parameterized-query pattern as every other model in this codebase). */
class SeoFixtureStub extends PDOStatement
{
    public function execute($params = null): bool { return true; }
    public function fetch($mode = PDO::FETCH_ASSOC, ...$rest): mixed { return false; }
    public function fetchColumn($column = 0): mixed { return false; }
    public function fetchAll($mode = PDO::FETCH_ASSOC, ...$rest): array { return []; }
}

class SeoFixturePdo extends PDO
{
    public function __construct() {}
    #[\ReturnTypeWillChange]
    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        return new SeoFixtureStub();
    }
    #[\ReturnTypeWillChange]
    public function query(string $query, ?int $fetchMode = null, ...$args): PDOStatement|false
    {
        return new SeoFixtureStub();
    }
}

$file = $argv[1] ?? null;
if (!$file || !is_file($file)) {
    fwrite(STDERR, "Usage: php scripts/seo-run-php-engine.php <fixture.json>\n");
    exit(1);
}

$fixture = json_decode(file_get_contents($file), true);
if (!$fixture || !isset($fixture['input'])) {
    fwrite(STDERR, "Invalid fixture: $file\n");
    exit(1);
}

$input = $fixture['input'];
$input['wordCount'] = seo_word_count($input['bodyText'] ?? '');

$pdo = new SeoFixturePdo();
$incomingCount = $fixture['incomingLinkCount'] ?? 0;
$hasFaq = $fixture['hasFaq'] ?? false;

$result = seo_run_analysis($pdo, $input, $incomingCount, $hasFaq);

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
