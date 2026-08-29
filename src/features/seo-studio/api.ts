import { adminFetch } from '../../admin/lib/api';
import type { AnalysisResult, CheckResult } from './engine/types';

export type ContentType = 'page' | 'service' | 'seo_page' | 'blog_post' | 'portfolio_project' | 'static_page' | 'venture';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  page: 'Page',
  service: 'Service',
  seo_page: 'SEO Landing Page',
  blog_post: 'Blog Post',
  portfolio_project: 'Portfolio Project',
  static_page: 'Static Page',
  venture: 'Venture',
};

export type StoredAnalysis = {
  id: number;
  content_type: ContentType;
  content_id: number;
  primary_keyphrase: string | null;
  related_keyphrases: string[];
  synonyms: string[];
  language: string;
  seo_score: number | null;
  readability_score: number | null;
  overall_score: number | null;
  score_status: 'good' | 'needs_improvement' | 'poor' | 'not_analyzed';
  checks: CheckResult[];
  content_hash: string | null;
  engine_version: string;
  is_cornerstone: boolean;
  page_type: string | null;
  last_analyzed_at: string | null;
} | null;

export type DashboardSummary = {
  totalIndexable: number;
  good: number;
  needsImprovement: number;
  poor: number;
  notAnalyzed: number;
  orphanPages: number;
  duplicateTitles: number;
  missingDescriptions: number;
  brokenLinks: number;
  staleCornerstone: number;
  staleEngineVersion: number;
};

export type InventoryItem = {
  content_type: ContentType;
  content_id: number;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  primary_keyphrase: string | null;
  seo_score: number | null;
  readability_score: number | null;
  overall_score: number | null;
  score_status: string;
  is_cornerstone: boolean;
  last_analyzed_at: string | null;
  robots_index: boolean;
  incoming_links: number;
  outgoing_links: number;
};

export const seoStudioApi = {
  dashboard: () => adminFetch<{ summary: DashboardSummary }>('/api/admin/seo/dashboard'),

  content: (query: string) => adminFetch<{ items: InventoryItem[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(`/api/admin/seo/content?${query}`),

  contentDetail: (type: ContentType, id: number) =>
    adminFetch<{ content: { type: string; id: number; title: string; slug: string; status: string }; seo: Record<string, unknown> | null; analysis: StoredAnalysis; incomingLinks: number; engineVersion: string }>(
      `/api/admin/seo/content/${type}/${id}`,
    ),

  saveContent: (type: ContentType, id: number, body: Record<string, unknown>) =>
    adminFetch<{ analysis: StoredAnalysis }>(`/api/admin/seo/content/${type}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  analyze: (type: ContentType, id: number) =>
    adminFetch<{ analysis: StoredAnalysis }>('/api/admin/seo/analyze', { method: 'POST', body: JSON.stringify({ content_type: type, content_id: id }) }),

  analyzeBulk: (body: { content_type?: ContentType; only_stale?: boolean; offset?: number; batch_size?: number }) =>
    adminFetch<{ batch: { succeeded: number; failed: number; errors: unknown[] }; progress: { total: number; processed: number; remaining: number; nextOffset: number; status: string } }>(
      '/api/admin/seo/analyze-bulk',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  history: (type: ContentType, id: number) =>
    adminFetch<{ history: { id: number; seo_score: number | null; readability_score: number | null; overall_score: number | null; content_hash: string; engine_version: string; created_at: string; analyzed_by_name: string | null }[] }>(
      `/api/admin/seo/history/${type}/${id}`,
    ),

  linkSuggestions: (type: ContentType, id: number) =>
    adminFetch<{ suggestions: { contentType: ContentType; contentId: number; reason: string; suggestedAnchor: string | null; isCornerstone: boolean; targetScore: number | null }[] }>(
      `/api/admin/seo/link-suggestions/${type}/${id}`,
    ),

  rebuildLinkIndex: () => adminFetch<{ rebuilt: number }>('/api/admin/seo/link-index/rebuild', { method: 'POST' }),

  orphans: () => adminFetch<{ orphans: { content_type: ContentType; content_id: number; overall_score: number | null }[] }>('/api/admin/seo/orphans'),

  duplicates: () =>
    adminFetch<{
      duplicateTitles: { value: string; members: string }[];
      duplicateDescriptions: { value: string; members: string }[];
      duplicateKeyphrases: { value: string; members: string }[];
    }>('/api/admin/seo/duplicates'),

  settings: () => adminFetch<{ settings: Record<string, unknown> }>('/api/admin/seo/settings'),
  saveSettings: (settings: Record<string, unknown>) => adminFetch('/api/admin/seo/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  exportReportUrl: () => '/api/admin/seo/reports/export',

  registrySync: (dryRun = false) => adminFetch<{ report: RegistrySyncReport }>('/api/admin/seo/registry/sync', { method: 'POST', body: JSON.stringify({ dry_run: dryRun }) }),
  registryDiagnostics: () => adminFetch<{ diagnostics: RegistryDiagnostics }>('/api/admin/seo/registry/diagnostics'),

  recoverAbandonedBuilds: (timeoutMinutes = 60) =>
    adminFetch<{ recovered: string[]; count: number }>('/api/admin/seo/prerender/recover-abandoned', { method: 'POST', body: JSON.stringify({ timeout_minutes: timeoutMinutes }) }),

  documentDetail: (documentId: number) =>
    adminFetch<{ document: SeoDocument; content: { type: ContentType; id: number; title: string; slug: string; status: string } | null; seo: Record<string, unknown> | null; analysis: StoredAnalysis; incomingLinks: number; engineVersion: string }>(
      `/api/admin/seo/documents/${documentId}`,
    ),
  saveDocument: (documentId: number, body: Record<string, unknown>) =>
    adminFetch<{ analysis: StoredAnalysis }>(`/api/admin/seo/documents/${documentId}`, { method: 'PUT', body: JSON.stringify(body) }),
};

export type RegistrySyncReport = {
  created: number; updated: number; unchanged: number; dryRun: boolean;
  duplicateKeys: string[]; routeConflicts: { route: string; keys: string[] }[];
  orphans: { id: number; document_key: string; route_path: string }[];
  backfilled?: number;
};

export type RegistryDiagnostics = {
  manifestStaticRouteCount: number; registryDocumentCount: number; registryDynamicDocumentCount: number;
  manifestRoutesMissingFromRegistry: string[]; unpublishedInRegistry: number;
  duplicateNormalizedRoutes: string[]; noindexRegisteredCount: number;
  redirectSourceOverlap: string[]; publishedMissingCanonical: number;
};

export type SeoDocument = {
  id: number; document_key: string; route_path: string; content_type: string; content_id: number | null;
  source_type: string; page_profile: string | null; display_name: string; is_dynamic: boolean;
  is_indexable: boolean; is_published: boolean; seo_editable: boolean; content_editable: boolean;
  canonical_route: string; prerender_status: 'current' | 'stale' | 'building' | 'failed' | 'not_applicable';
  last_synced_at: string | null;
  content_hash: string | null; prerender_hash: string | null; prerender_build_id: string | null;
  prerender_started_at: string | null; prerender_completed_at: string | null;
  prerender_failure_reason: string | null; stale_reason: string | null; last_successful_prerender_at: string | null;
};

export type { AnalysisResult };
