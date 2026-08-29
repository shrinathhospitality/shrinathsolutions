import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';

export type BlogPost = {
  id: number;
  title: string; slug: string; excerpt: string | null; content: string | null;
  category_name: string | null; category_slug: string | null;
  reading_time_minutes: number | null; published_at: string | null;
};
export type BlogSeo = { meta_title: string | null; meta_description: string | null } | null;
export type BlogFaq = { question: string; answer: string };
export type BlogRelatedPost = { title: string; slug: string; category_name: string | null; reading_time_minutes: number | null };

export type BlogDetailData = {
  post: BlogPost;
  seo: BlogSeo;
  faqs: BlogFaq[];
  related: BlogRelatedPost[];
};

type ApiResponse = { success: boolean; post: BlogPost; seo: BlogSeo; faqs?: BlogFaq[] };
type RelatedResponse = { success: boolean; posts?: BlogRelatedPost[] };

/** Loads a single published blog post plus (best-effort) related posts from the same category.
 *  Used identically by BlogDetail.tsx's client fetch and scripts/prerender.mjs. */
export async function loadBlogPost(slug: string, opts: LoaderOptions = {}): Promise<LoaderResult<BlogDetailData>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/blog/${encodeURIComponent(slug)}`, opts);
    if (httpStatus === 404) return { status: 'not-found', data: null };
    if (!json?.success) return { status: 'error', data: null, message: 'Request failed' };

    let related: BlogRelatedPost[] = [];
    if (json.post.category_slug) {
      try {
        const { json: relJson } = await fetchJson<RelatedResponse>(
          `/api/public/blog?category=${encodeURIComponent(json.post.category_slug)}&per_page=6`,
          opts,
        );
        if (relJson?.success && Array.isArray(relJson.posts)) {
          related = relJson.posts.filter((p) => p.slug !== json.post.slug).slice(0, 3);
        }
      } catch {
        // Related posts are a nice-to-have; a failure here shouldn't fail the whole page.
      }
    }

    return { status: 'success', data: { post: json.post, seo: json.seo, faqs: json.faqs ?? [], related } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
