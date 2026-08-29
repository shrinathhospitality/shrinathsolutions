#!/usr/bin/env node
// Runs one fixture through the TS scoring engine (bundled on the fly with esbuild, already a
// project dependency via Vite — no new dependency added) and prints the result as JSON, in the
// same shape seo-run-php-engine.php prints, for scripts/seo-parity-test.mjs to diff.
//
// Usage: node scripts/seo-run-ts-engine.mjs docs/seo-studio-fixtures/some-fixture.json

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/seo-run-ts-engine.mjs <fixture.json>');
  process.exit(1);
}

const fixture = JSON.parse(readFileSync(file, 'utf8'));

const built = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/features/seo-studio/engine/scorer.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  target: 'node18',
});

const code = built.outputFiles[0].text;
const tmpFile = path.join(ROOT, `scratch-ts-engine-bundle-${process.pid}.mjs`);
const { writeFileSync, rmSync } = await import('node:fs');
writeFileSync(tmpFile, code, 'utf8');

let seoRunAnalysis;
try {
  ({ seoRunAnalysis } = await import(`file://${tmpFile.replace(/\\/g, '/')}`));
} finally {
  rmSync(tmpFile, { force: true });
}

const input = fixture.input;
// Word count is computed inside the engine's own input-building step in real use
// (src/loaders equivalent for CMS content); fixtures supply it implicitly via bodyText, so
// compute it the same way the PHP fixture runner does.
const wordMatches = (input.bodyText ?? '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
input.wordCount = wordMatches ? wordMatches.length : 0;

// For fixture parity testing only: mirror the PHP fixture stub's "no duplicates found"
// behavior via an explicit context, so the 3 DB-dependent checks (which the live TS engine
// correctly reports 'unavailable' without a real API call — see LiveAnalysisContext in
// types.ts) don't cause an artificial score mismatch against the PHP engine's always-connected
// database in this specific test-only comparison.
const ctx = {
  isTitleDuplicate: () => false,
  isDescriptionDuplicate: () => false,
  isSlugDuplicate: () => false,
};

const result = seoRunAnalysis(input, fixture.incomingLinkCount ?? 0, fixture.hasFaq ?? false, ctx);

console.log(JSON.stringify(result, null, 2));
