// Loads the exact same config/seo-scoring-rules.json the PHP engine reads (Vite/esbuild both
// support native JSON imports) — never hardcode a threshold/weight anywhere else here.
import rulesJson from '../../../../config/seo-scoring-rules.json';

export type SeoRules = typeof rulesJson;

export function seoRules(): SeoRules {
  return rulesJson;
}

export function seoEngineVersion(): string {
  return rulesJson.engine_version;
}

// Content types this module supports — the exact strings already used as seo_meta.entity_type
// (see api/lib/seo/rules.php's SEO_CONTENT_TYPES for the PHP mirror).
export const SEO_CONTENT_TYPES = ['page', 'service', 'seo_page', 'blog_post', 'portfolio_project'] as const;
