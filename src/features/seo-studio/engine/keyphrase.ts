// Unicode-aware keyphrase normalization and matching — mirrors api/lib/seo/keyphrase.php
// exactly (same regex strategy: JS RegExp with the 'u' flag supports \p{L}/\p{N} the same way
// PCRE's /u modifier does). Never naive substring matching.

export function seoNormalizeText(text: string): string {
  const withApostrophes = text.replace(/[‘’`]/g, "'");
  const lower = withApostrophes.toLocaleLowerCase();
  return lower.replace(/\s+/gu, ' ').trim();
}

export function seoWordCount(text: string): number {
  const normalized = seoNormalizeText(text);
  if (normalized === '') return 0;
  const matches = normalized.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function seoPhraseRegex(phrase: string): RegExp | null {
  const normalized = seoNormalizeText(phrase);
  if (normalized === '') return null;
  const escaped = escapeRegExp(normalized).replace(/\\ /g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu');
}

export function seoCountPhraseOccurrences(haystack: string, phrase: string): number {
  const regex = seoPhraseRegex(phrase);
  if (!regex) return 0;
  const normalizedHaystack = seoNormalizeText(haystack);
  const matches = normalizedHaystack.match(regex);
  return matches ? matches.length : 0;
}

export function seoPhraseExists(haystack: string, phrase: string): boolean {
  return seoCountPhraseOccurrences(haystack, phrase) > 0;
}

export function seoKeyphraseDensity(bodyText: string, phrase: string): number {
  const totalWords = seoWordCount(bodyText);
  if (totalWords === 0) return 0;
  const occurrences = seoCountPhraseOccurrences(bodyText, phrase);
  const phraseWords = Math.max(1, seoWordCount(phrase));
  return ((occurrences * phraseWords) / totalWords) * 100;
}

export function seoPhraseFirstPosition(haystack: string, phrase: string): number | null {
  const regex = seoPhraseRegex(phrase);
  if (!regex) return null;
  const normalizedHaystack = seoNormalizeText(haystack);
  const match = regex.exec(normalizedHaystack);
  return match ? match.index : null;
}
