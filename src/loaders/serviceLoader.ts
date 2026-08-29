import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';
import type { Block } from '../pages/ServicePage';

export type ApiService = {
  name: string;
  slug: string;
  category: string | null;
  hero_label: string | null;
  h1: string;
  hero_description: string | null;
  hero_cta_label: string | null;
  hero_notes: string[];
  featured_image: string | null;
  icon: string | null;
  blocks: Block[];
  related: { label: string; to: string }[];
  cta_heading: string | null;
  cta_body: string | null;
};
export type ServiceSeo = { meta_title: string | null; meta_description: string | null } | null;
export type ServiceFaq = { question: string; answer: string };

export type ServiceDetailData = { service: ApiService; seo: ServiceSeo; faqs: ServiceFaq[] };

type ApiResponse = { success: boolean; service: ApiService; seo: ServiceSeo; faqs: ServiceFaq[] };

/** Loads a single published CMS-authored service page. Used identically by
 *  DynamicServicePage.tsx's client fetch and scripts/prerender.mjs. */
export async function loadService(slug: string, opts: LoaderOptions = {}): Promise<LoaderResult<ServiceDetailData>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/services/${encodeURIComponent(slug)}`, opts);
    if (httpStatus === 404) return { status: 'not-found', data: null };
    if (!json?.success) return { status: 'error', data: null, message: 'Request failed' };
    return { status: 'success', data: { service: json.service, seo: json.seo, faqs: json.faqs } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
