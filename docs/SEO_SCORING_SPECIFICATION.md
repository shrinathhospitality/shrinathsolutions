# Shrinath SEO Studio — Scoring Specification

This is the single source of truth for how a page's SEO/Readability/Overall scores are
computed. Both engines — `api/lib/seo/*.php` (authoritative, runs on save/publish) and
`src/features/seo-studio/engine/*.ts` (provisional, runs live while editing) — implement
**exactly** this spec: same check IDs, same weights, same thresholds, same status meanings,
same engine version. Both read the same numeric constants from `config/seo-scoring-rules.json`
at runtime (PHP via `json_decode(file_get_contents(...))`, TS via a native Vite JSON import) so
the two implementations can never silently drift on a threshold or weight — only on the check
*logic* itself, which is why `scripts/seo-parity-test.mjs` (see §Testing) exists.

This is an original scoring model inspired only by the general *category* of tool Yoast SEO
Premium represents (an in-CMS SEO/readability analyzer) — no Yoast code, check wording,
copy, icons, or proprietary formula was copied. Every threshold below is a documented,
adjustable constant this project owns.

> Confirmed unchanged during the "Live Metadata Resolution & Production Readiness" phase
> (SEO_IMPLEMENTATION.md Phase 5) — no check, weight, or threshold in this document was
> modified; `npm run test:seo-parity` still passes 13/13.

## 1. Three scores, one formula

```
Readability Score  = readability category score (0-100)
SEO Score          = (keyword×25 + metadata×15 + content×15 + links×10 + images×10 + technical×10) / 85 × 100
Overall Score       = keyword×25 + metadata×15 + content×15 + readability×15 + links×10 + images×10 + technical×10
```

`keyword`, `metadata`, `content`, `readability`, `links`, `images`, `technical` above are each
category's own 0–100 score (see §3). SEO Score excludes readability and renormalizes the
remaining 85% of weight back up to 100. Overall Score already sums to 100% across all seven
categories, no renormalization needed. **Only the final displayed number is rounded** — every
intermediate calculation keeps full floating-point precision.

## 2. Category weights (of the Overall Score)

| Category | Weight |
|---|---|
| Keyword and search intent | 25% |
| Metadata | 15% |
| Content structure | 15% |
| Readability | 15% |
| Links | 10% |
| Images | 10% |
| Technical and indexability | 10% |

## 3. Check outcomes and normalization

Every check produces exactly one outcome:

| Outcome | Normalized value | Counts toward category score? |
|---|---|---|
| `passed` | 1.0 | Yes |
| `improvement` | 0.65 | Yes |
| `warning` | 0.35 | Yes |
| `failed` | 0.0 | Yes |
| `unavailable` | — | **No** — excluded from the denominator entirely, never counted as passed |
| `informational` | — | **No** — shown to the editor, never affects any score |

A category's score is the weight-normalized average of its non-excluded checks' normalized
values × 100. If every check in a category is `unavailable`/`informational` (e.g. Readability
for an unsupported language), that category's score is `null` ("Not analyzed"), and the Overall
Score formula excludes it from both the numerator and the weight denominator — an unsupported-
language page is never penalized for a category it genuinely cannot be scored on.

## 4. Status colors

Applied independently to each of the three scores:

| Range | Label | Color |
|---|---|---|
| 80–100 | Good | Green |
| 50–79 | Needs Improvement | Orange |
| 0–49 | Poor | Red |
| *(not yet analyzed)* | Not analyzed | Grey |

Every status is also shown as a text label, never color alone (accessibility requirement).

## 5. Critical-issue caps

Applied to **SEO Score and Overall Score only** (never Readability — a content-quality
dimension, orthogonal to indexability):

| Condition | Cap |
|---|---|
| Indexable page unintentionally blocked by robots/noindex | 49 |
| Canonical points to a genuinely different, unrelated page | 49 |
| Missing both `<title>` and `<h1>` | 49 |
| Live HTTP status is 4xx/5xx | 29 |

"Unintentional" is the operative word — a page whose page-type profile (see §7) has
`default_indexable: false` (e.g. `utility_noindex`), or whose `robots_index=0` was explicitly
set by an editor, is **never capped for being noindex**. The cap only fires when a page that
*should* be indexable (by its profile) resolves to noindex — almost always a mistake, not a
choice.

## 6. Check ID list (49 checks, this version)

Format: `category.check_id` — outcome logic — weight note. All check IDs are stable across
engine versions; a check is only ever added, never renamed (a rename would break
`seo_analysis_history` continuity).

### Keyword (10 checks, 25% category weight)
`keyword.primary_exists`, `keyword.in_title`, `keyword.title_position`, `keyword.in_description`,
`keyword.in_slug`, `keyword.in_h1`, `keyword.in_introduction`, `keyword.in_subheadings`,
`keyword.density`, `keyword.related_usage`.

### Metadata (12 checks, 15%)
`metadata.title_exists`, `metadata.title_length`, `metadata.title_unique`,
`metadata.description_exists`, `metadata.description_length`, `metadata.description_unique`,
`metadata.canonical_exists`, `metadata.canonical_https_absolute`, `metadata.robots_directive`
(informational), `metadata.og_title`, `metadata.og_description`, `metadata.og_image`.

### Content (8 checks, 15%)
`content.single_h1`, `content.heading_structure`, `content.word_count`,
`content.introduction_present`, `content.duplicate_headings`, `content.empty_headings`,
`content.faq_presence`, `content.cta_presence`.

### Readability (6 checks, 15%; English-only — see §8)
`readability.sentence_length`, `readability.paragraph_length`, `readability.passive_voice`,
`readability.transition_words`, `readability.subheading_distribution`,
`readability.consecutive_sentence_starts`.

### Links (5 checks, 10%)
`links.internal_count`, `links.outgoing_present`, `links.generic_anchor_text`,
`links.incoming_count`, `links.external_security`.

### Images (4 checks, 10%)
`images.missing_alt`, `images.alt_quality`, `images.missing_dimensions`, `images.count`.

### Technical (4 checks, 10%)
`technical.indexable`, `technical.canonical_matches_page`, `technical.structured_data_present`,
`technical.unique_slug`.

**Not yet implemented** (documented gap, not silently skipped — see
`docs/SEO_STUDIO_ARCHITECTURE.md`'s limitations section): keyphrase-in-image-alt, synonym
distribution, previously-targeted-keyphrase conflict, search-intent-alignment scoring,
approximate-rendered-width previews (character counts are implemented; pixel-width estimation
is not), social-image-dimension measurement, content-freshness/last-modified scoring, list/table
usage checks, potential-duplicate-body-content detection (title/description/keyphrase duplicate
detection *is* implemented — see `duplicates` endpoint), links-to-cornerstone/related-service
checks, excessive-exact-match-anchor detection, LCP-image-lazy-loading detection, descriptive-
filename checks, word-complexity/reading-ease numeric formulas (sentence/paragraph length are
implemented as a practical proxy).

## 7. Page-type profiles

`config/seo-scoring-rules.json`'s `page_type_profiles` defines, per profile: whether an `<h1>`
is required, expected schema types, `default_indexable`, whether FAQ/CTA content is expected,
and (via `thin_content_words`) a page-type-specific minimum word count before
`content.word_count` degrades from `passed`. A Contact page's profile sets `skip_thin_content:
true` and a much lower floor (80 words) specifically so it is never penalized for being short by
nature — this is a direct, load-bearing requirement, not a nice-to-have.

## 8. Language handling

Readability's 6 checks are English-only (`language !== 'en'` → every readability check reports
`unavailable`, and the Readability Score itself is `null`/"Not analyzed" rather than a fabricated
number). Universal, language-independent checks (word count, paragraph length as a structural
metric, heading distribution, image/link/metadata checks) still run normally for any language.

## 9. Content hashing and staleness

`content_hash` = `sha256` of a normalized concatenation of every field the analysis actually
reads (title, description, canonical, robots flags, H1, body text, image alts, link hrefs,
keyphrase, related keyphrases) — deliberately *not* a hash of raw stored HTML/JSON, so
formatting-only changes (e.g. re-saving with no real edit) don't force a re-analysis. On save,
if the newly computed hash matches the stored one **and** `engine_version` hasn't changed,
the stored analysis is reused as-is (no re-scoring, no new history row) — this is what makes
bulk "reanalyze all stale" cheap: only genuinely-changed or engine-upgraded content re-runs.

## 10a. All-Page Integration — engine unchanged

The subsequent "All-Page Integration" pass (SEO Document Registry, static/Venture page support,
full editor integration for SEO landing pages/Portfolio/Pages, redirect manager completion) made
**zero changes** to this specification, `api/lib/seo/checks.php`, `api/lib/seo/scorer.php`,
`src/features/seo-studio/engine/checks.ts`, or `src/features/seo-studio/engine/scorer.ts` — no
check ID, weight, threshold, or outcome rule differs from what's documented above. Two new
fixtures (`static-homepage.json`, `venture-page.json`) were added to exercise the `homepage` and
`venture` page-type profiles, which existed in `config/seo-scoring-rules.json` from the start
but had no fixture coverage until this pass — both pass on both engines with full parity,
confirming the existing engine handles the two new content types (`static_page`, `venture`)
correctly without any engine-side modification, only new *input-building* code
(`api/lib/seo/analyze.php`'s `seo_load_virtual_content_row()`).

## 10. Testing

`scripts/seo-parity-test.mjs` runs a fixed set of fixtures (see
`docs/SEO_STUDIO_ARCHITECTURE.md`'s fixtures section) through both the PHP engine (via CLI,
`php scripts/seo-run-php-engine.php`) and the TS engine (via a Node-compatible import) and
diffs every score and check outcome. A same-fixture score difference of more than 1 point is a
test failure — 1 point is allowed only for genuinely unavoidable floating-point rounding order
differences between the two languages, not for a logic mismatch.
