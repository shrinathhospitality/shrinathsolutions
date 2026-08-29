// Aggregates check results into category scores, the three headline scores, status and caps.
// Mirrors api/lib/seo/scorer.php exactly — see docs/SEO_SCORING_SPECIFICATION.md.

import { seoEngineVersion, seoRules } from './rules';
import { seoCheckContent, seoCheckImages, seoCheckKeyword, seoCheckLinks, seoCheckMetadata, seoCheckReadability, seoCheckTechnical } from './checks';
import type { AnalysisInput, AnalysisResult, CheckResult, LiveAnalysisContext } from './types';

export function seoCategoryScore(checks: Omit<CheckResult, 'category'>[]): number | null {
  const values = seoRules().outcome_values as Record<string, number>;
  let sum = 0;
  let count = 0;
  for (const c of checks) {
    if (!(c.outcome in values)) continue;
    sum += values[c.outcome];
    count++;
  }
  return count === 0 ? null : (sum / count) * 100;
}

export function seoStatusForScore(score: number | null): AnalysisResult['scoreStatus'] {
  if (score === null) return 'not_analyzed';
  const t = seoRules().status_thresholds;
  if (score >= t.good) return 'good';
  if (score >= t.needs_improvement) return 'needs_improvement';
  return 'poor';
}

export function seoContentHash(input: AnalysisInput): string {
  const parts = [
    input.title, input.description, input.canonical, input.robotsIndex ? '1' : '0', input.robotsFollow ? '1' : '0',
    input.h1, input.bodyText, input.primaryKeyphrase, input.relatedKeyphrases.join(','),
    input.images.map((i) => `${i.alt}:${i.src}`).join('|'),
    input.links.map((l) => l.href).join('|'),
  ];
  return parts.join('\x1f');
}

/** Runs every category's checks and returns the full analysis result — a pure function, no
 *  side effects. `incomingLinkCount`/`hasFaq` are DB-derived facts the checks can't compute
 *  alone; `ctx`'s optional duplicate-check callbacks let a caller (e.g. a debounced admin API
 *  call) supply live-editor duplicate detection — omitted, those 3 checks report 'unavailable'. */
export function seoRunAnalysis(rawInput: AnalysisInput, incomingLinkCount: number, hasFaq: boolean, ctx?: LiveAnalysisContext): AnalysisResult {
  const input: AnalysisInput = { ...rawInput, hasFaq };

  const byCategory: Record<string, Omit<CheckResult, 'category'>[]> = {
    keyword: seoCheckKeyword(input),
    metadata: seoCheckMetadata(input, ctx),
    content: seoCheckContent(input),
    readability: seoCheckReadability(input),
    links: seoCheckLinks(input, incomingLinkCount),
    images: seoCheckImages(input),
    technical: seoCheckTechnical(input, ctx),
  };

  const categoryScores: Record<string, number | null> = {};
  for (const [cat, checks] of Object.entries(byCategory)) {
    categoryScores[cat] = seoCategoryScore(checks);
  }

  const weights = seoRules().category_weights as Record<string, number>;

  let overallNum = 0;
  let overallDen = 0;
  for (const [cat, w] of Object.entries(weights)) {
    if (categoryScores[cat] !== null) {
      overallNum += (categoryScores[cat] as number) * w;
      overallDen += w;
    }
  }
  let overall: number | null = overallDen > 0 ? overallNum / overallDen : null;

  let seoNum = 0;
  let seoDen = 0;
  for (const [cat, w] of Object.entries(weights)) {
    if (cat === 'readability') continue;
    if (categoryScores[cat] !== null) {
      seoNum += (categoryScores[cat] as number) * w;
      seoDen += w;
    }
  }
  let seoScore: number | null = seoDen > 0 ? seoNum / seoDen : null;
  const readabilityScore = categoryScores.readability;

  let capReason: string | null = null;
  const profile = (seoRules().page_type_profiles as Record<string, { default_indexable?: boolean }>)[input.pageType] ?? {};
  const defaultIndexable = profile.default_indexable ?? true;
  if (defaultIndexable && !input.robotsIndex) {
    capReason = 'unintentional_noindex';
  } else if (input.h1 === '' && input.title === '') {
    capReason = 'missing_title_and_h1';
  } else {
    const mismatch = byCategory.technical.find((c) => c.id === 'technical.canonical_matches_page' && c.outcome === 'failed');
    if (mismatch) capReason = 'canonical_mismatch';
  }
  if (capReason) {
    const cap = (seoRules().caps as Record<string, number>)[capReason];
    if (seoScore !== null) seoScore = Math.min(seoScore, cap);
    if (overall !== null) overall = Math.min(overall, cap);
  }

  const allChecks: CheckResult[] = [];
  for (const [cat, checks] of Object.entries(byCategory)) {
    for (const c of checks) allChecks.push({ ...c, category: cat });
  }

  return {
    contentType: input.contentType,
    contentId: input.contentId,
    seoScore: seoScore === null ? null : Math.round(seoScore),
    readabilityScore: readabilityScore === null ? null : Math.round(readabilityScore),
    overallScore: overall === null ? null : Math.round(overall),
    scoreStatus: seoStatusForScore(overall),
    categoryScores: Object.fromEntries(Object.entries(categoryScores).map(([k, v]) => [k, v === null ? null : Math.round(v)])),
    checks: allChecks,
    capReason,
    engineVersion: seoEngineVersion(),
    contentHash: seoContentHash(input),
    pageType: input.pageType,
    language: input.language,
  };
}
