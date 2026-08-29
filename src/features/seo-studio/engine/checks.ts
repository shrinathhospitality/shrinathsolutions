// The 49 check implementations — mirrors api/lib/seo/checks.php exactly (same check IDs,
// thresholds, outcome logic). See docs/SEO_SCORING_SPECIFICATION.md §6.
//
// DB-dependent checks (metadata.title_unique, metadata.description_unique,
// technical.unique_slug) report 'unavailable' here unless the caller supplies the matching
// LiveAnalysisContext callback — the PHP engine is authoritative for these on save regardless.

import { seoRules } from './rules';
import { seoKeyphraseDensity, seoNormalizeText, seoPhraseExists, seoPhraseFirstPosition, seoWordCount } from './keyphrase';
import { seoNormalizeUrlForMatching } from './extract';
import type { AnalysisInput, CheckResult, LiveAnalysisContext } from './types';

function check(id: string, outcome: CheckResult['outcome'], detail = ''): Omit<CheckResult, 'category'> {
  return { id, outcome, detail };
}

// ---------------------------------------------------------------------------
// Keyword (10 checks)
// ---------------------------------------------------------------------------
export function seoCheckKeyword(input: AnalysisInput): Omit<CheckResult, 'category'>[] {
  const t = seoRules().thresholds;
  const kp = input.primaryKeyphrase.trim();
  const out: Omit<CheckResult, 'category'>[] = [];

  if (kp === '') {
    out.push(check('keyword.primary_exists', 'failed', 'No focus keyphrase set.'));
    for (const id of ['keyword.in_title', 'keyword.title_position', 'keyword.in_description', 'keyword.in_slug',
      'keyword.in_h1', 'keyword.in_introduction', 'keyword.in_subheadings', 'keyword.density', 'keyword.related_usage']) {
      out.push(check(id, 'unavailable', 'Set a focus keyphrase first.'));
    }
    return out;
  }
  out.push(check('keyword.primary_exists', 'passed', `Focus keyphrase: "${kp}".`));

  const inTitle = seoPhraseExists(input.title, kp);
  out.push(check('keyword.in_title', inTitle ? 'passed' : 'improvement', inTitle ? 'Keyphrase appears in the SEO title.' : 'Keyphrase does not appear in the SEO title.'));

  const pos = seoPhraseFirstPosition(input.title, kp);
  out.push(check('keyword.title_position', pos === null ? 'unavailable' : (pos <= t.keyphrase_in_title_max_position_chars ? 'passed' : 'improvement'),
    pos === null ? 'Keyphrase not in title.' : `Keyphrase starts at character ${pos} of the title.`));

  const inDesc = seoPhraseExists(input.description, kp);
  out.push(check('keyword.in_description', inDesc ? 'passed' : 'improvement', inDesc ? 'Keyphrase appears in the meta description.' : 'Keyphrase does not appear in the meta description.'));

  const inSlug = seoPhraseExists(input.slug.replace(/-/g, ' '), kp);
  out.push(check('keyword.in_slug', inSlug ? 'passed' : 'improvement', 'Checks the URL slug for the keyphrase (as separate words).'));

  const inH1 = seoPhraseExists(input.h1, kp);
  out.push(check('keyword.in_h1', inH1 ? 'passed' : 'improvement', inH1 ? 'Keyphrase appears in the H1.' : 'Keyphrase does not appear in the H1.'));

  const inIntro = seoPhraseExists(input.introText, kp);
  out.push(check('keyword.in_introduction', inIntro ? 'passed' : 'improvement',
    input.introText === '' ? 'No introduction text found.' : (inIntro ? 'Keyphrase appears in the introduction.' : 'Keyphrase does not appear in the introduction.')));

  const subheadingText = input.headings.filter((h) => h.level >= 2).map((h) => h.text).join(' ');
  out.push(check('keyword.in_subheadings', subheadingText === '' ? 'unavailable' : (seoPhraseExists(subheadingText, kp) ? 'passed' : 'informational'),
    'Not required in every subheading — natural placement only.'));

  const density = seoKeyphraseDensity(input.bodyText, kp);
  let densityOutcome: CheckResult['outcome'] = 'passed';
  if (density < t.keyphrase_density_min_pct) densityOutcome = 'improvement';
  else if (density > t.keyphrase_density_max_pct) densityOutcome = 'warning';
  out.push(check('keyword.density', input.wordCount < 30 ? 'unavailable' : densityOutcome, `Density: ${density.toFixed(2)}%.`));

  const related = input.relatedKeyphrases.filter((r) => r.trim() !== '');
  if (related.length === 0) {
    out.push(check('keyword.related_usage', 'informational', 'No related keyphrases set.'));
  } else {
    const used = related.filter((r) => seoPhraseExists(input.bodyText, r)).length;
    out.push(check('keyword.related_usage', used > 0 ? 'passed' : 'improvement', `${used} of ${related.length} related keyphrases used.`));
  }

  return out;
}

// ---------------------------------------------------------------------------
// Metadata (12 checks)
// ---------------------------------------------------------------------------
export function seoCheckMetadata(input: AnalysisInput, ctx?: LiveAnalysisContext): Omit<CheckResult, 'category'>[] {
  const t = seoRules().thresholds;
  const out: Omit<CheckResult, 'category'>[] = [];
  const titleLen = [...input.title].length;
  const descLen = [...input.description].length;

  out.push(check('metadata.title_exists', input.title !== '' ? 'passed' : 'failed', input.title !== '' ? '' : 'No SEO title set.'));
  out.push(check('metadata.title_length',
    input.title === '' ? 'unavailable' : ((titleLen >= t.title_min_chars && titleLen <= t.title_max_chars) ? 'passed' : (titleLen > 0 ? 'improvement' : 'failed')),
    `Title is ${titleLen} characters (recommended ${t.title_min_chars}-${t.title_max_chars}).`));

  const titleDupe = ctx?.isTitleDuplicate?.(input.title);
  out.push(check('metadata.title_unique', input.title === '' || titleDupe === undefined ? 'unavailable' : (titleDupe ? 'warning' : 'passed'),
    titleDupe ? 'Another published page uses this exact SEO title.' : ''));

  out.push(check('metadata.description_exists', input.description !== '' ? 'passed' : 'failed', input.description !== '' ? '' : 'No meta description set.'));
  out.push(check('metadata.description_length',
    input.description === '' ? 'unavailable' : ((descLen >= t.description_min_chars && descLen <= t.description_max_chars) ? 'passed' : 'improvement'),
    `Description is ${descLen} characters (recommended ${t.description_min_chars}-${t.description_max_chars}).`));

  const descDupe = ctx?.isDescriptionDuplicate?.(input.description);
  out.push(check('metadata.description_unique', input.description === '' || descDupe === undefined ? 'unavailable' : (descDupe ? 'warning' : 'passed'),
    descDupe ? 'Another published page uses this exact meta description.' : ''));

  out.push(check('metadata.canonical_exists', input.canonical !== '' ? 'passed' : 'improvement', input.canonical !== '' ? '' : 'No canonical URL set — the app supplies a default one at render time.'));
  const httpsAbsolute = input.canonical !== '' && input.canonical.startsWith('https://');
  out.push(check('metadata.canonical_https_absolute', input.canonical === '' ? 'unavailable' : (httpsAbsolute ? 'passed' : 'failed'), ''));

  out.push(check('metadata.robots_directive', 'informational', `${input.robotsIndex ? 'index' : 'noindex'}, ${input.robotsFollow ? 'follow' : 'nofollow'}`));

  out.push(check('metadata.og_title', input.ogTitle !== '' || input.title !== '' ? 'passed' : 'improvement', input.ogTitle === '' ? 'Falls back to the SEO title.' : ''));
  out.push(check('metadata.og_description', input.ogDescription !== '' || input.description !== '' ? 'passed' : 'improvement', input.ogDescription === '' ? 'Falls back to the meta description.' : ''));
  out.push(check('metadata.og_image', input.ogImage !== '' ? 'passed' : 'informational', input.ogImage === '' ? 'Falls back to the branded default OG image.' : ''));

  return out;
}

// ---------------------------------------------------------------------------
// Content (8 checks)
// ---------------------------------------------------------------------------
export function seoCheckContent(input: AnalysisInput): Omit<CheckResult, 'category'>[] {
  const rules = seoRules();
  const out: Omit<CheckResult, 'category'>[] = [];

  out.push(check('content.single_h1', input.h1 !== '' ? 'passed' : 'failed', input.h1 !== '' ? 'One H1 found.' : 'No H1 found.'));

  const levels = input.headings.map((h) => h.level);
  let orderOk = true;
  let prev = 1;
  for (const l of levels) {
    if (l > prev + 1) orderOk = false;
    prev = l;
  }
  out.push(check('content.heading_structure', levels.length === 0 ? 'informational' : (orderOk ? 'passed' : 'improvement'),
    orderOk ? '' : 'A heading level is skipped (e.g. H2 straight to H4).'));

  const profile = (rules.page_type_profiles as Record<string, { skip_thin_content?: boolean; requires_faq?: boolean; requires_cta?: boolean }>)[input.pageType] ?? {};
  const minWords = (rules.thin_content_words as Record<string, number>)[input.pageType] ?? rules.thin_content_words.default;
  const skipThin = !!profile.skip_thin_content;
  out.push(check('content.word_count',
    skipThin ? 'informational' : (input.wordCount >= minWords ? 'passed' : (input.wordCount >= minWords * 0.6 ? 'improvement' : 'failed')),
    `${input.wordCount} words (guideline for this page type: ${minWords}+).`));

  out.push(check('content.introduction_present', input.introText !== '' ? 'passed' : 'improvement', ''));

  const headingTexts = input.headings.map((h) => seoNormalizeText(h.text));
  const dupes = new Set(headingTexts).size !== headingTexts.length;
  out.push(check('content.duplicate_headings', headingTexts.length === 0 ? 'informational' : (dupes ? 'warning' : 'passed'), ''));

  const empty = input.headings.filter((h) => h.text.trim() === '').length;
  out.push(check('content.empty_headings', empty > 0 ? 'failed' : 'passed', empty > 0 ? `${empty} empty heading(s) found.` : ''));

  const requiresFaq = !!profile.requires_faq;
  out.push(check('content.faq_presence', !requiresFaq ? 'informational' : (input.hasFaq ? 'passed' : 'improvement'), ''));

  const requiresCta = !!profile.requires_cta;
  const hasCta = /\b(contact|get a quote|book|enquire|call|whatsapp|get started|request)\b/iu.test(input.bodyText);
  out.push(check('content.cta_presence', !requiresCta ? 'informational' : (hasCta ? 'passed' : 'improvement'), ''));

  return out;
}

// ---------------------------------------------------------------------------
// Readability (6 checks, English only)
// ---------------------------------------------------------------------------
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z\p{Lu}])/u);
  return parts.map((s) => s.trim()).filter((s) => s !== '');
}

export function seoCheckReadability(input: AnalysisInput): Omit<CheckResult, 'category'>[] {
  const ids = ['readability.sentence_length', 'readability.paragraph_length', 'readability.passive_voice',
    'readability.transition_words', 'readability.subheading_distribution', 'readability.consecutive_sentence_starts'];

  if (input.language !== 'en') {
    return ids.map((id) => check(id, 'unavailable', 'Language-specific readability checks are English-only.'));
  }
  if (input.wordCount < 30) {
    return ids.map((id) => check(id, 'unavailable', 'Not enough content to analyze readability.'));
  }

  const t = seoRules().thresholds;
  const out: Omit<CheckResult, 'category'>[] = [];
  const sentences = splitSentences(input.bodyText);
  const sentenceWordCounts = sentences.map(seoWordCount);
  const longSentences = sentenceWordCounts.filter((c) => c > t.sentence_words_hard).length;
  const longPct = sentences.length ? (longSentences / sentences.length) * 100 : 0;
  out.push(check('readability.sentence_length', longPct <= 10 ? 'passed' : (longPct <= 25 ? 'improvement' : 'warning'),
    `${longPct.toFixed(0)}% of sentences exceed ${t.sentence_words_hard} words.`));

  const paraWordCounts = input.paragraphs.map(seoWordCount);
  const longParas = paraWordCounts.filter((c) => c > t.paragraph_words_hard).length;
  out.push(check('readability.paragraph_length', input.paragraphs.length === 0 ? 'unavailable' : (longParas === 0 ? 'passed' : 'improvement'),
    longParas > 0 ? `${longParas} paragraph(s) exceed ${t.paragraph_words_hard} words.` : ''));

  const passiveMatches = input.bodyText.match(/\b(?:is|are|was|were|be|been|being)\s+\w+ed\b/giu);
  const passiveHits = passiveMatches ? passiveMatches.length : 0;
  const passivePct = sentences.length ? (passiveHits / sentences.length) * 100 : 0;
  out.push(check('readability.passive_voice', passivePct <= 10 ? 'passed' : (passivePct <= 20 ? 'improvement' : 'warning'),
    `Approx. ${passivePct.toFixed(0)}% of sentences use a passive construction.`));

  const transitionWords = ['however', 'therefore', 'moreover', 'additionally', 'furthermore', 'because', 'meanwhile', 'in addition', 'as a result', 'for example', 'in fact', 'consequently', 'similarly', 'next', 'finally', 'also', 'but', 'so'];
  let withTransition = 0;
  for (const s of sentences) {
    if (transitionWords.some((tw) => seoPhraseExists(s, tw))) withTransition++;
  }
  const transitionPct = sentences.length ? (withTransition / sentences.length) * 100 : 0;
  out.push(check('readability.transition_words', transitionPct >= t.transition_word_target_pct ? 'passed' : 'improvement',
    `${transitionPct.toFixed(0)}% of sentences use a transition word (target ${t.transition_word_target_pct}%+).`));

  const subheadings = input.headings.filter((h) => h.level >= 2);
  const expectedHeadings = Math.max(1, Math.floor(input.wordCount / t.heading_distribution_words));
  out.push(check('readability.subheading_distribution', input.wordCount < t.heading_distribution_words ? 'informational' : (subheadings.length >= expectedHeadings ? 'passed' : 'improvement'),
    `${subheadings.length} subheading(s) for ${input.wordCount} words (guideline: ~1 per ${t.heading_distribution_words} words).`));

  const starts = sentences.map((s) => seoNormalizeText((s.trim().split(/\s+/u)[0]) ?? ''));
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] !== '' && starts[i] === starts[i - 1]) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  out.push(check('readability.consecutive_sentence_starts', maxRun < t.consecutive_same_start_limit ? 'passed' : 'improvement',
    maxRun >= t.consecutive_same_start_limit ? `${maxRun} consecutive sentences start with the same word.` : ''));

  return out;
}

// ---------------------------------------------------------------------------
// Links (5 checks)
// ---------------------------------------------------------------------------
export function seoCheckLinks(input: AnalysisInput, incomingCount: number): Omit<CheckResult, 'category'>[] {
  const t = seoRules().thresholds;
  const out: Omit<CheckResult, 'category'>[] = [];
  const internal = input.links.filter((l) => l.isInternal);
  const external = input.links.filter((l) => !l.isInternal);

  out.push(check('links.internal_count', internal.length > 0 ? 'passed' : 'improvement', `${internal.length} internal link(s).`));
  out.push(check('links.outgoing_present', input.links.length > 0 ? 'passed' : 'informational', ''));

  const generic = input.links.filter((l) => (t.generic_anchor_terms as string[]).includes(seoNormalizeText(l.text))).length;
  out.push(check('links.generic_anchor_text', input.links.length === 0 ? 'informational' : (generic === 0 ? 'passed' : 'improvement'),
    generic > 0 ? `${generic} link(s) use generic anchor text (e.g. "click here").` : ''));

  out.push(check('links.incoming_count', incomingCount > 0 ? 'passed' : 'warning',
    incomingCount === 0 ? 'No other page links to this one (orphan risk).' : `${incomingCount} incoming internal link(s).`));

  const insecure = external.filter((l) => l.target === '_blank' && (!l.rel || !l.rel.includes('noopener'))).length;
  out.push(check('links.external_security', external.length === 0 ? 'informational' : (insecure === 0 ? 'passed' : 'failed'),
    insecure > 0 ? `${insecure} external link(s) open a new tab without rel="noopener".` : ''));

  return out;
}

// ---------------------------------------------------------------------------
// Images (4 checks)
// ---------------------------------------------------------------------------
export function seoCheckImages(input: AnalysisInput): Omit<CheckResult, 'category'>[] {
  const out: Omit<CheckResult, 'category'>[] = [];
  const images = input.images;

  const missingAlt = images.filter((i) => i.alt.trim() === '').length;
  out.push(check('images.missing_alt', images.length === 0 ? 'informational' : (missingAlt === 0 ? 'passed' : 'failed'),
    missingAlt > 0 ? `${missingAlt} of ${images.length} image(s) missing alt text.` : ''));

  const generic = ['image', 'photo', 'picture', 'img', 'untitled'];
  const poorAlt = images.filter((i) => i.alt.trim() !== '' && generic.includes(seoNormalizeText(i.alt))).length;
  out.push(check('images.alt_quality', images.length === 0 ? 'informational' : (poorAlt === 0 ? 'passed' : 'improvement'),
    poorAlt > 0 ? `${poorAlt} image(s) use a generic alt value like "image".` : ''));

  const missingDims = images.filter((i) => !i.hasDimensions).length;
  out.push(check('images.missing_dimensions', images.length === 0 ? 'informational' : (missingDims === 0 ? 'passed' : 'improvement'),
    missingDims > 0 ? `${missingDims} image(s) missing width/height attributes (CLS risk).` : ''));

  out.push(check('images.count', 'informational', `${images.length} image(s) found in this content.`));

  return out;
}

// ---------------------------------------------------------------------------
// Technical (4 checks)
// ---------------------------------------------------------------------------
export function seoCheckTechnical(input: AnalysisInput, ctx?: LiveAnalysisContext): Omit<CheckResult, 'category'>[] {
  const profile = (seoRules().page_type_profiles as Record<string, { default_indexable?: boolean }>)[input.pageType] ?? {};
  const out: Omit<CheckResult, 'category'>[] = [];

  const defaultIndexable = profile.default_indexable ?? true;
  const isIndexable = input.robotsIndex;
  if (isIndexable === defaultIndexable) {
    out.push(check('technical.indexable', 'passed', isIndexable ? 'Indexable, as expected for this page type.' : 'Intentionally noindex, as expected for this page type.'));
  } else {
    out.push(check('technical.indexable', defaultIndexable && !isIndexable ? 'failed' : 'warning',
      defaultIndexable && !isIndexable ? 'This page type should normally be indexable, but robots is set to noindex.' : 'This page is indexable but its page type usually defaults to noindex — confirm this is intentional.'));
  }

  if (input.canonical === '') {
    out.push(check('technical.canonical_matches_page', 'improvement', "No canonical set — defaults to this page's own URL at render time."));
  } else {
    const canonicalPath = seoNormalizeUrlForMatching(input.canonical);
    const ownPath = seoNormalizeUrlForMatching(input.publicUrl);
    out.push(check('technical.canonical_matches_page', canonicalPath === ownPath ? 'passed' : 'failed',
      canonicalPath === ownPath ? '' : `Canonical points to "${canonicalPath}", not this page's own URL ("${ownPath}").`));
  }

  out.push(check('technical.structured_data_present', input.schemaTypes.length === 0 ? 'improvement' : 'passed',
    input.schemaTypes.length === 0 ? 'No page-specific schema selected.' : `Schema: ${input.schemaTypes.join(', ')}.`));

  const dupSlug = ctx?.isSlugDuplicate?.(input.slug);
  out.push(check('technical.unique_slug', dupSlug === undefined ? 'unavailable' : (dupSlug ? 'failed' : 'passed'),
    dupSlug ? 'This slug is also used by another root-level page.' : ''));

  return out;
}
