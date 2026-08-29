#!/usr/bin/env node
// Runs every fixture in docs/seo-studio-fixtures/ through the PHP engine, asserts each
// fixture's `expected` block, and (once the TS engine exists) cross-checks its output against
// the same fixture run through src/features/seo-studio/engine/ for score parity (within 1
// point — see docs/SEO_SCORING_SPECIFICATION.md §10).

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIXTURES_DIR = path.join(ROOT, 'docs', 'seo-studio-fixtures');

function runPhp(fixturePath) {
  const out = execFileSync('php', [path.join(ROOT, 'scripts', 'seo-run-php-engine.php'), fixturePath], { encoding: 'utf8' });
  return JSON.parse(out);
}

function runTs(fixturePath) {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'seo-run-ts-engine.mjs'), fixturePath], { encoding: 'utf8' });
  return JSON.parse(out);
}

function assertParity(phpResult, tsResult, failures) {
  for (const key of ['seoScore', 'readabilityScore', 'overallScore']) {
    const a = phpResult[key];
    const b = tsResult[key];
    if (a === null || b === null) {
      if (a !== b) failures.push(`parity: ${key} PHP=${a} TS=${b} (one is null, the other isn't)`);
      continue;
    }
    if (Math.abs(a - b) > 1) failures.push(`parity: ${key} PHP=${a} TS=${b} (diff > 1 point)`);
  }
  if (phpResult.scoreStatus !== tsResult.scoreStatus) failures.push(`parity: scoreStatus PHP=${phpResult.scoreStatus} TS=${tsResult.scoreStatus}`);
  if (phpResult.capReason !== tsResult.capReason) failures.push(`parity: capReason PHP=${phpResult.capReason} TS=${tsResult.capReason}`);

  const phpById = new Map(phpResult.checks.map((c) => [c.id, c.outcome]));
  const tsById = new Map(tsResult.checks.map((c) => [c.id, c.outcome]));
  for (const [id, outcome] of phpById) {
    if (tsById.get(id) !== outcome) failures.push(`parity: check ${id} PHP=${outcome} TS=${tsById.get(id)}`);
  }
}

function checkById(result, id) {
  return result.checks.find((c) => c.id === id);
}

function assertExpected(fixture, result, failures) {
  const exp = fixture.expected || {};

  if (exp.seoScore) {
    if (exp.seoScore.min !== undefined && result.seoScore < exp.seoScore.min) failures.push(`seoScore ${result.seoScore} < min ${exp.seoScore.min}`);
  }
  if (exp.readabilityScore?.min !== undefined && (result.readabilityScore ?? -1) < exp.readabilityScore.min) failures.push(`readabilityScore ${result.readabilityScore} < min ${exp.readabilityScore.min}`);
  if (exp.overallScore?.min !== undefined && result.overallScore < exp.overallScore.min) failures.push(`overallScore ${result.overallScore} < min ${exp.overallScore.min}`);
  if (exp.scoreStatus && result.scoreStatus !== exp.scoreStatus) failures.push(`scoreStatus ${result.scoreStatus} !== ${exp.scoreStatus}`);
  if (exp.capReason !== undefined && result.capReason !== exp.capReason) failures.push(`capReason ${result.capReason} !== ${exp.capReason}`);
  if (exp.seoScoreMax !== undefined && result.seoScore > exp.seoScoreMax) failures.push(`seoScore ${result.seoScore} > max ${exp.seoScoreMax}`);
  if (exp.overallScoreMax !== undefined && result.overallScore > exp.overallScoreMax) failures.push(`overallScore ${result.overallScore} > max ${exp.overallScoreMax}`);

  if (exp.keywordChecksUnavailable) {
    const bad = result.checks.filter((c) => c.category === 'keyword' && c.id !== 'keyword.primary_exists' && c.outcome !== 'unavailable');
    if (bad.length) failures.push(`expected all non-primary keyword checks unavailable, found: ${bad.map((c) => c.id + '=' + c.outcome).join(', ')}`);
  }
  if (exp.readabilityChecksUnavailable) {
    const bad = result.checks.filter((c) => c.category === 'readability' && c.outcome !== 'unavailable');
    if (bad.length) failures.push(`expected all readability checks unavailable, found: ${bad.map((c) => c.id + '=' + c.outcome).join(', ')}`);
  }
  if (exp.readabilityScoreNull && result.readabilityScore !== null) failures.push(`readabilityScore expected null, got ${result.readabilityScore}`);

  const idOutcomeAssertions = {
    keywordDensityOutcome: 'keyword.density',
    contentWordCountOutcome: 'content.word_count',
    headingStructureOutcome: 'content.heading_structure',
    duplicateHeadingsOutcome: 'content.duplicate_headings',
    imagesMissingAltOutcome: 'images.missing_alt',
    imagesMissingDimensionsOutcome: 'images.missing_dimensions',
    technicalIndexableOutcome: 'technical.indexable',
  };
  for (const [expKey, checkId] of Object.entries(idOutcomeAssertions)) {
    if (exp[expKey] !== undefined) {
      const c = checkById(result, checkId);
      if (!c || c.outcome !== exp[expKey]) failures.push(`${checkId} outcome ${c?.outcome} !== ${exp[expKey]}`);
    }
  }
}

const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json')).sort();
let pass = 0;
let fail = 0;

for (const file of files) {
  const fixturePath = path.join(FIXTURES_DIR, file);
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const failures = [];
  try {
    const phpResult = runPhp(fixturePath);
    assertExpected(fixture, phpResult, failures);
    const tsResult = runTs(fixturePath);
    assertParity(phpResult, tsResult, failures);
  } catch (err) {
    failures.push(`engine threw: ${err.message}`);
  }

  if (failures.length === 0) {
    console.log(`PASS  ${file}`);
    pass++;
  } else {
    console.log(`FAIL  ${file}`);
    for (const f of failures) console.log(`        - ${f}`);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed (of ${files.length} fixtures).`);
process.exit(fail === 0 ? 0 : 1);
