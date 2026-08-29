// Browser-side content extraction — mirrors api/lib/seo/extract.php's output shape exactly.
// Uses the native DOMParser (never `dangerouslySetInnerHTML`-executes anything; DOMParser
// never runs scripts). Only used by the live editor analysis — the build/test scripts operate
// on already-extracted AnalysisInput fixtures directly, so this file has no Node-side use and
// intentionally isn't part of the cross-engine parity test.
import { seoWordCount } from './keyphrase';
import type { Heading, ImageRef, LinkRef } from './types';

export type ExtractedContent = {
  plainText: string;
  headings: Heading[];
  images: ImageRef[];
  links: LinkRef[];
  paragraphs: string[];
  wordCount: number;
};

const EMPTY: ExtractedContent = { plainText: '', headings: [], images: [], links: [], paragraphs: [], wordCount: 0 };

export function seoIsInternalUrl(href: string): boolean {
  if (href === '' || href.startsWith('#')) return true;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
  return href.includes('shrinathsolutions.com');
}

export function seoNormalizeUrlForMatching(href: string): string {
  const noFragment = href.split('#')[0] || href;
  const path = noFragment.replace(/^https?:\/\/[^/]*shrinathsolutions\.com/i, '') || '/';
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function seoExtractHtml(html: string | null | undefined): ExtractedContent {
  const trimmed = (html ?? '').trim();
  if (trimmed === '' || typeof DOMParser === 'undefined') return EMPTY;

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const body = doc.body;
  if (!body) return EMPTY;

  body.querySelectorAll('script, style, nav, header, footer').forEach((n) => n.remove());

  const headings: Heading[] = [];
  body.querySelectorAll('h1, h2, h3, h4').forEach((node) => {
    headings.push({ level: Number(node.tagName.slice(1)), text: (node.textContent ?? '').trim() });
  });

  const images: ImageRef[] = [];
  body.querySelectorAll('img').forEach((img) => {
    images.push({
      alt: (img.getAttribute('alt') ?? '').trim(),
      src: (img.getAttribute('src') ?? '').trim(),
      hasDimensions: img.hasAttribute('width') && img.hasAttribute('height'),
      loading: img.getAttribute('loading'),
    });
  });

  const links: LinkRef[] = [];
  body.querySelectorAll('a').forEach((a) => {
    const href = (a.getAttribute('href') ?? '').trim();
    if (href === '') return;
    links.push({
      href,
      text: (a.textContent ?? '').trim(),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      isInternal: seoIsInternalUrl(href),
    });
  });

  const paragraphs: string[] = [];
  body.querySelectorAll('p').forEach((p) => {
    const text = (p.textContent ?? '').trim();
    if (text !== '') paragraphs.push(text);
  });

  const plainText = (body.textContent ?? '').replace(/\s+/gu, ' ').trim();

  return { plainText, headings, images, links, paragraphs, wordCount: seoWordCount(plainText) };
}

/** Mirrors api/lib/seo/extract.php's seo_extract_blocks() — same best-effort walk of a
 *  services/seo_pages block-JSON structure. */
export function seoExtractBlocks(blocks: unknown): ExtractedContent {
  const headings: Heading[] = [];
  const paragraphs: string[] = [];
  const images: ImageRef[] = [];
  const links: LinkRef[] = [];
  const plainParts: string[] = [];

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj.kind === 'html' && typeof obj.body === 'string' && obj.body) {
        const extracted = seoExtractHtml(obj.body);
        extracted.headings.forEach((h) => headings.push({ level: Math.max(2, h.level), text: h.text }));
        paragraphs.push(...extracted.paragraphs);
        images.push(...extracted.images);
        links.push(...extracted.links);
        plainParts.push(extracted.plainText);
        return;
      }
      if (typeof obj.heading === 'string' && obj.heading) {
        headings.push({ level: 2, text: obj.heading });
        plainParts.push(obj.heading);
      }
      for (const key of ['body', 'text']) {
        if (typeof obj[key] === 'string' && obj[key]) {
          paragraphs.push(obj[key] as string);
          plainParts.push(obj[key] as string);
        }
      }
      for (const key of ['question', 'answer']) {
        if (typeof obj[key] === 'string' && obj[key]) {
          plainParts.push(obj[key] as string);
        }
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object') walk(v);
      }
    }
  };
  walk(blocks);

  const plainText = plainParts.join(' ').replace(/\s+/gu, ' ').trim();
  return { plainText, headings, images, links, paragraphs, wordCount: seoWordCount(plainText) };
}
