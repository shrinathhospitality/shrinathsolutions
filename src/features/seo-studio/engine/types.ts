// Shared types for the TS scoring engine — mirrors api/lib/seo/*.php exactly. See
// docs/SEO_SCORING_SPECIFICATION.md for the authoritative spec both engines implement.

export type CheckOutcome = 'passed' | 'improvement' | 'warning' | 'failed' | 'unavailable' | 'informational';

export type CheckResult = { id: string; outcome: CheckOutcome; detail: string; category: string };

export type Heading = { level: number; text: string };
export type ImageRef = { alt: string; src: string; hasDimensions: boolean; loading: string | null };
export type LinkRef = { href: string; text: string; target: string | null; rel: string | null; isInternal: boolean };

export type AnalysisInput = {
  contentType: string;
  contentId: number;
  slug: string;
  status: string;
  title: string;
  description: string;
  canonical: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  h1: string;
  introText: string;
  bodyText: string;
  paragraphs: string[];
  headings: Heading[];
  images: ImageRef[];
  links: LinkRef[];
  wordCount: number;
  schemaTypes: string[];
  publicUrl: string;
  pageType: string;
  language: string;
  primaryKeyphrase: string;
  relatedKeyphrases: string[];
  isCornerstone: boolean;
  hasFaq?: boolean;
};

export type AnalysisResult = {
  contentType: string;
  contentId: number;
  seoScore: number | null;
  readabilityScore: number | null;
  overallScore: number | null;
  scoreStatus: 'good' | 'needs_improvement' | 'poor' | 'not_analyzed';
  categoryScores: Record<string, number | null>;
  checks: CheckResult[];
  capReason: string | null;
  engineVersion: string;
  contentHash: string;
  pageType: string;
  language: string;
};

/** DB facts the pure scoring core can't compute on its own — supplied by the caller
 *  (live editor: best-effort/cached; save flow: a real query), mirrors PHP's seo_run_analysis()
 *  parameters. Duplicate-title/description/slug checks are DB-dependent and only run
 *  authoritatively server-side — the TS engine reports them 'unavailable' unless the caller
 *  supplies a duplicate-check function (see LiveAnalysisContext in scorer.ts). */
export type LiveAnalysisContext = {
  incomingLinkCount: number;
  hasFaq: boolean;
  isTitleDuplicate?: (title: string) => boolean;
  isDescriptionDuplicate?: (description: string) => boolean;
  isSlugDuplicate?: (slug: string) => boolean;
};
