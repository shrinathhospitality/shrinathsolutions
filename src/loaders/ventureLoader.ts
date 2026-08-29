import { fetchJson } from './apiClient';
import type { LoaderOptions, LoaderResult } from './types';
import type { Venture } from '../types/venture';

type ApiVenture = {
  name: string;
  short_name: string | null;
  slug: string;
  tagline: string;
  category: string;
  summary: string;
  layout_variant: string;
  theme: { layoutVariant: string; primary: string; secondary: string; accent: string; background: string; surface: string; text: string; muted: string; onPrimary: string };
  logo_image: string | null;
  hero_image: string | null;
  phone_numbers: string[];
  email: string | null;
  website_url: string | null;
  google_business_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  services: { title: string; description: string; icon: string }[];
  highlights: string[];
  sections: { heading: string; subheading: string | null; body_html: string | null }[];
};
type VentureSeo = { meta_title: string | null; meta_description: string | null } | null;
type VentureFaq = { question: string; answer: string };

export type VentureDetailData = { venture: Venture; source: 'api' };

type ApiResponse = { success: boolean; venture: ApiVenture; seo: VentureSeo; faqs: VentureFaq[] };

/** The 9 original (and any future) Venture layout components render `section.body` as plain
 *  JSX text (no dangerouslySetInnerHTML anywhere in src/components/ventures/) — strips markup
 *  down to plain text rather than changing that render contract. Simple/regex-based so this
 *  runs identically in the browser and during the Node prerender/SSR pass. */
function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, '’')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function toVenture(api: ApiVenture, seo: VentureSeo, faqs: VentureFaq[]): Venture {
  return {
    slug: api.slug,
    name: api.name,
    shortName: api.short_name ?? undefined,
    tagline: api.tagline,
    category: api.category,
    summary: api.summary,
    phoneNumbers: api.phone_numbers,
    email: api.email ?? undefined,
    website: api.website_url ?? undefined,
    googleBusinessUrl: api.google_business_url ?? undefined,
    theme: api.theme,
    services: api.services.map((s) => ({ title: s.title, description: s.description, icon: s.icon })),
    highlights: api.highlights,
    sections: api.sections.map((s) => ({ heading: s.heading, body: s.body_html ? stripHtmlToPlainText(s.body_html) : undefined })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    seo: {
      title: seo?.meta_title ?? `${api.name} | Shrinath Solutions Venture`,
      description: seo?.meta_description ?? api.summary,
      canonicalPath: `/our-ventures/${api.slug}`,
    },
  };
}

/** Loads a single published Venture from the database. Used by DynamicVentureDetail.tsx's
 *  client fetch and scripts/prerender.mjs (via useRouteData's isomorphic loader contract). */
export async function loadVenture(slug: string, opts: LoaderOptions = {}): Promise<LoaderResult<VentureDetailData>> {
  try {
    const { httpStatus, json } = await fetchJson<ApiResponse>(`/api/public/ventures/${encodeURIComponent(slug)}`, opts);
    if (httpStatus === 404) return { status: 'not-found', data: null };
    if (!json?.success) return { status: 'error', data: null, message: 'Request failed' };
    return { status: 'success', data: { venture: toVenture(json.venture, json.seo, json.faqs), source: 'api' } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { status: 'error', data: null, message: err instanceof Error ? err.message : 'Request failed' };
  }
}
