import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';

export type PortfolioProject = {
  title: string; slug: string; category: string | null; short_description: string | null;
  detailed_description: string | null; results: { title: string; body: string }[];
  cta_heading: string | null; cta_body: string | null;
};
export type PortfolioSeo = { meta_title: string | null; meta_description: string | null } | null;

export type PortfolioDetailData = { project: PortfolioProject; seo: PortfolioSeo };

type ApiResponse = { success: boolean; project: PortfolioProject; seo: PortfolioSeo };

/** Loads a single published portfolio project. Used identically by DynamicPortfolioPage.tsx's
 *  client fetch and scripts/prerender.mjs. */
export async function loadPortfolioProject(slug: string, opts: LoaderOptions = {}): Promise<LoaderResult<PortfolioDetailData>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/portfolio/${encodeURIComponent(slug)}`, opts);
    if (httpStatus === 404) return { status: 'not-found', data: null };
    if (!json?.success) return { status: 'error', data: null, message: 'Request failed' };
    return { status: 'success', data: { project: json.project, seo: json.seo } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
