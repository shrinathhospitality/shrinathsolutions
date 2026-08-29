import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';
import type { Block } from '../pages/ServicePage';

export type ApiSeoPage = {
  title: string;
  slug: string;
  primary_keyword: string | null;
  target_location: string | null;
  h1: string;
  hero_content: string | null;
  content_sections: (Block | { kind: 'html'; heading: string; body: string; items?: never })[];
  cta_heading: string | null;
  cta_body: string | null;
};
export type SeoPageSeo = {
  meta_title: string | null; meta_description: string | null; canonical_url?: string | null;
  robots_index?: boolean; robots_follow?: boolean; og_image?: string | null;
} | null;
export type SeoPageFaq = { question: string; answer: string };

export type SeoPageDetailData = { page: ApiSeoPage; seo: SeoPageSeo; faqs: SeoPageFaq[] };

type ApiResponse = { success: boolean; page: ApiSeoPage; seo: SeoPageSeo; faqs: SeoPageFaq[] };

/** Loads a single published SEO landing page (root-level catch-all slug). Used identically by
 *  DynamicSeoPage.tsx's client fetch and scripts/prerender.mjs. */
export async function loadSeoPage(slug: string, opts: LoaderOptions = {}): Promise<LoaderResult<SeoPageDetailData>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/seo-pages/${encodeURIComponent(slug)}`, opts);
    if (httpStatus === 404) return { status: 'not-found', data: null };
    if (!json?.success) return { status: 'error', data: null, message: 'Request failed' };
    return { status: 'success', data: { page: json.page, seo: json.seo, faqs: json.faqs } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
