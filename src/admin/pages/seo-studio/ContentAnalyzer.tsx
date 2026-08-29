import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExternalLink, Loader2 } from 'lucide-react';
import { adminCard, adminColors, adminPrimaryBtn } from '../../adminTheme';
import { seoStudioApi, CONTENT_TYPE_LABELS, type ContentType, type SeoDocument, type StoredAnalysis } from '../../../features/seo-studio/api';
import type { SeoFields } from '../../lib/contentTypes';
import { ScoreRing, STATUS_META } from '../../../features/seo-studio/components/ScoreDisplay';
import { statusForScore } from '../../../features/seo-studio/components/ScoreDisplay';
import { ChecklistPanel } from '../../../features/seo-studio/components/ChecklistPanel';
import { SerpPreview } from '../../../features/seo-studio/components/SerpPreview';
import { CapabilityButton } from '../../../features/seo-studio/components/CapabilityButton';
import { useSeoCapability } from '../../../features/seo-studio/useSeoCapability';

const EDITOR_ROUTE: Partial<Record<ContentType, (id: number) => string>> = {
  service: (id) => `/admin/services/${id}/edit`,
  blog_post: (id) => `/admin/blog/${id}/edit`,
  seo_page: (id) => `/admin/seo-pages/${id}/edit`,
  portfolio_project: (id) => `/admin/portfolio/${id}/edit`,
  page: (id) => `/admin/pages/${id}/edit`,
};

const PRERENDER_LABEL: Record<string, string> = {
  current: 'Current', stale: 'Stale — content changed since last build', building: 'Building',
  failed: 'Build failed', not_applicable: 'Not applicable',
};
const PRERENDER_COLOR: Record<string, string> = {
  current: '#1a7f37', stale: '#c9720b', building: '#0969da', failed: '#c0392b', not_applicable: adminColors.textMuted,
};

/** Short, human-readable form of a full SHA-256 content/prerender hash — the full value stays
 *  reachable to assistive tech via aria-label rather than being dropped entirely (spec §5:
 *  "human-readable abbreviated hashes with full values available accessibly"). Never exposes a
 *  filesystem path — these are pure content hashes, nothing server-specific. */
function AbbrevHash({ hash }: { hash: string | null }) {
  if (!hash) return <span>—</span>;
  return <span aria-label={`full hash ${hash}`} title={hash}>{hash.slice(0, 10)}…</span>;
}

/** Server timestamps come back as MySQL's own "YYYY-MM-DD HH:MM:SS" (server local time, not
 *  UTC) — displayed as-is rather than guessing a timezone and silently mis-converting it. */
function formatTimestamp(value: string | null): string {
  return value ?? 'Never';
}

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

/** Works for every registry document — real database content (with or without a dedicated
 *  in-editor panel) and route-only static/venture pages alike. Reads/writes keyphrase,
 *  cornerstone and SEO metadata fields, and triggers the authoritative server-side analysis,
 *  which for database content re-extracts real body content, and for static/venture content
 *  reads the build-time prerendered HTML (never a live crawl) — see
 *  docs/SEO_STUDIO_ARCHITECTURE.md. Reachable via either /content/:documentId (preferred) or
 *  the legacy /content/:contentType/:contentId. */
export default function ContentAnalyzer() {
  const params = useParams<{ documentId?: string; contentType?: ContentType; contentId?: string }>();

  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<SeoDocument | null>(null);
  const [content, setContent] = useState<{ type: ContentType; id: number; title: string; slug: string; status: string } | null>(null);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [analysis, setAnalysis] = useState<StoredAnalysis>(null);
  const [keyphrase, setKeyphrase] = useState('');
  const [relatedKeyphrases, setRelatedKeyphrases] = useState('');
  const [isCornerstone, setIsCornerstone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof seoStudioApi.history>>['history']>([]);
  const [notFound, setNotFound] = useState(false);
  // Canonical/robots are indexability-affecting (seo.edit_advanced) — gated separately from the
  // basic title/description fields (seo.edit_metadata), matching the backend's per-field check
  // in seo_studio_content_save (api/controllers/SeoStudioController.php). `'loading'` renders
  // as disabled too, so the control never flashes enabled before the session's capability list
  // resolves. The backend re-checks this independently and remains the real boundary regardless
  // of what this disables.
  const canEditAdvanced = useSeoCapability('seo.edit_advanced');
  const advancedDisabled = canEditAdvanced !== true;
  const advancedTitle = advancedDisabled && canEditAdvanced === false
    ? 'Your account role does not have the "seo.edit_advanced" permission — canonical URL and indexability are locked.'
    : undefined;

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    const load = params.documentId
      ? seoStudioApi.documentDetail(Number(params.documentId)).then((d) => ({ document: d.document, content: d.content, seo: d.seo, analysis: d.analysis }))
      : params.contentType && params.contentId
        ? seoStudioApi.contentDetail(params.contentType, Number(params.contentId)).then((d) => ({ document: null, content: d.content as any, seo: d.seo, analysis: d.analysis }))
        : Promise.reject(new Error('Missing route params'));

    load.then((d) => {
      if (!d.content) {
        setNotFound(true);
        return;
      }
      setDocument(d.document);
      setContent(d.content);
      setSeo((d.seo as SeoFields) ?? { robots_index: true, robots_follow: true });
      setAnalysis(d.analysis);
      setKeyphrase(d.analysis?.primary_keyphrase ?? '');
      setRelatedKeyphrases((d.analysis?.related_keyphrases ?? []).join(', '));
      setIsCornerstone(d.analysis?.is_cornerstone ?? false);

      seoStudioApi.history(d.content.type, d.content.id).then((h) => setHistory(h.history)).catch(() => {});
    }).catch(() => toast.error('Failed to load content')).finally(() => setLoading(false));
  }, [params.documentId, params.contentType, params.contentId]);

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    try {
      const body = {
        seo, primary_keyphrase: keyphrase,
        related_keyphrases: relatedKeyphrases.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5),
        is_cornerstone: isCornerstone, force_reanalyze: true,
      };
      const result = document
        ? await seoStudioApi.saveDocument(document.id, body)
        : await seoStudioApi.saveContent(content.type, content.id, body);
      setAnalysis(result.analysis);
      toast.success('Saved and analyzed');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;
  if (notFound || !content) return <div style={{ color: adminColors.textMuted }}>Content not found.</div>;

  const editorRoute = document?.content_editable === false ? undefined : EDITOR_ROUTE[content.type]?.(content.id);
  const overallStatus = statusForScore(analysis?.overall_score ?? null);

  return (
    <div className="grid gap-5 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: adminColors.textMuted }}>{CONTENT_TYPE_LABELS[content.type] ?? content.type}</div>
          <h2 className="font-heading font-bold text-[19px]">{content.title}</h2>
          <div className="text-[12.5px] mt-0.5" style={{ color: adminColors.textMuted }}>{document?.route_path ?? `/${content.slug}`}</div>
        </div>
        <div className="flex gap-2">
          {editorRoute ? (
            <Link to={editorRoute} className="px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Edit Content</Link>
          ) : (
            <span className="px-3.5 py-2 rounded-full text-[13px] font-semibold opacity-60" style={{ border: `1px solid ${adminColors.cardBorder}` }} title="This page's body content is not editable through the CMS">View Source Content: not editable</span>
          )}
          <a href={document?.route_path ?? `/${content.slug}`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            <ExternalLink size={13} /> View page
          </a>
        </div>
      </div>

      {document && (
        <div className="p-5 grid gap-3 text-[13px]" style={{ ...adminCard, color: adminColors.textMuted, overflowWrap: 'anywhere' } as React.CSSProperties}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', display: 'grid' }}>
            <div><strong style={{ color: adminColors.textPrimary }}>Source:</strong> {document.source_type.replace('_', ' ')}</div>
            <div><strong style={{ color: adminColors.textPrimary }}>Published:</strong> {document.is_published ? 'Yes' : 'No'}</div>
            <div><strong style={{ color: adminColors.textPrimary }}>Content editable:</strong> {document.content_editable ? 'Yes' : 'No'}</div>
          </div>

          <div style={{ borderTop: `1px solid ${adminColors.cardBorder}`, paddingTop: 10 }}>
            <div className="font-heading font-bold text-[13px] mb-2" style={{ color: adminColors.textPrimary }}>Prerender status</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', display: 'grid' }}>
              <div role="status">
                <strong style={{ color: adminColors.textPrimary }}>Status: </strong>
                <span style={{ color: PRERENDER_COLOR[document.prerender_status], fontWeight: 700 }}>
                  ● {PRERENDER_LABEL[document.prerender_status]}
                </span>
              </div>
              <div><strong style={{ color: adminColors.textPrimary }}>Saved SEO version:</strong> <AbbrevHash hash={document.content_hash} /></div>
              <div><strong style={{ color: adminColors.textPrimary }}>Prerendered SEO version:</strong> <AbbrevHash hash={document.prerender_hash} /></div>
              <div>
                <strong style={{ color: adminColors.textPrimary }}>Rebuild required:</strong>{' '}
                {document.prerender_status === 'not_applicable'
                  ? 'N/A'
                  : document.content_hash !== document.prerender_hash ? 'Yes' : 'No'}
              </div>
              <div><strong style={{ color: adminColors.textPrimary }}>Last successful prerender:</strong> {document.prerender_hash ? formatTimestamp(document.last_successful_prerender_at) : 'Never prerendered'}</div>
              <div><strong style={{ color: adminColors.textPrimary }}>Last build attempt:</strong> {formatTimestamp(document.prerender_completed_at ?? document.prerender_started_at)}</div>
            </div>

            {document.prerender_status === 'stale' && document.stale_reason && (
              <div className="mt-2 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: 'rgba(201,114,11,0.12)', color: '#c9720b', fontWeight: 600 }}>
                ⚠ Stale: {document.stale_reason}. Run <code>npm run build:prerender</code> (then apply the report — see the deployment guide) to refresh the live page.
              </div>
            )}
            {document.prerender_status === 'failed' && document.prerender_failure_reason && (
              <div className="mt-2 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: 'rgba(192,57,43,0.12)', color: '#c0392b', fontWeight: 600 }}>
                ✕ Build failed: {document.prerender_failure_reason}
              </div>
            )}
            {document.prerender_status === 'building' && (
              <div className="mt-2 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: 'rgba(9,105,218,0.12)', color: '#0969da', fontWeight: 600 }}>
                ⏳ A build attempt is being applied (started {formatTimestamp(document.prerender_started_at)}). If this persists, an admin can recover an abandoned build from the SEO Studio dashboard.
              </div>
            )}
            <div className="mt-2 text-[12px]" style={{ color: adminColors.textMuted }}>
              No automated deploy trigger exists for this project — a rebuild means running the documented command: <code>npm run build:prerender</code>, then applying its report server-side.
            </div>
          </div>
        </div>
      )}

      <div style={adminCard} className="p-6">
        <div className="flex gap-6 mb-5 flex-wrap">
          <ScoreRing score={analysis?.seo_score ?? null} label="SEO Score" />
          <ScoreRing score={analysis?.readability_score ?? null} label="Readability" />
          <ScoreRing score={analysis?.overall_score ?? null} label="Overall" />
        </div>
        <div className="text-[12.5px] mb-4" style={{ color: STATUS_META[overallStatus].color }}>
          {STATUS_META[overallStatus].label}{analysis?.last_analyzed_at ? ` — last analyzed ${new Date(analysis.last_analyzed_at).toLocaleString()}` : ' — not yet analyzed'}
        </div>

        <label className="grid gap-1.5 mb-3" style={label}>Focus keyphrase<input style={input} value={keyphrase} onChange={(e) => setKeyphrase(e.target.value)} /></label>
        <label className="grid gap-1.5 mb-3" style={label}>Related keyphrases (comma-separated)<input style={input} value={relatedKeyphrases} onChange={(e) => setRelatedKeyphrases(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-[13.5px] font-semibold mb-4"><input type="checkbox" checked={isCornerstone} onChange={(e) => setIsCornerstone(e.target.checked)} /> Cornerstone content</label>

        <label className="grid gap-1.5 mb-2" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
        <label className="grid gap-1.5 mb-2" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
        <label className="grid gap-1.5 mb-1" style={label} title={advancedTitle}>
          Canonical URL
          <input style={{ ...input, opacity: advancedDisabled ? 0.6 : 1 }} disabled={advancedDisabled} aria-disabled={advancedDisabled} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} />
        </label>
        {advancedDisabled && canEditAdvanced === false && (
          <div className="text-[12px] mb-3" style={{ color: adminColors.textMuted }} role="note">
            Canonical URL and indexability need the "Edit advanced SEO" permission — ask an admin if you need this changed.
          </div>
        )}
        <div className="flex gap-5 mb-5" title={advancedTitle}>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" disabled={advancedDisabled} aria-disabled={advancedDisabled} checked={seo.robots_index ?? true} onChange={(e) => setSeo({ ...seo, robots_index: e.target.checked })} /> Index</label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" disabled={advancedDisabled} aria-disabled={advancedDisabled} checked={seo.robots_follow ?? true} onChange={(e) => setSeo({ ...seo, robots_follow: e.target.checked })} /> Follow</label>
        </div>

        <SerpPreview title={seo.meta_title ?? ''} description={seo.meta_description ?? ''} path={document?.route_path ?? `/${content.slug}`} />

        <CapabilityButton capability="seo.edit_metadata" onClick={handleSave} disabled={saving} className="mt-5 px-6 py-3 rounded-full text-[14.5px] disabled:opacity-60 flex items-center gap-2" style={adminPrimaryBtn}>
          {saving && <Loader2 size={15} className="animate-spin" />} Save & Analyze
        </CapabilityButton>
      </div>

      {analysis && (
        <div style={adminCard} className="p-6">
          <div className="font-heading font-bold text-[15px] mb-3">Checks</div>
          <ChecklistPanel checks={analysis.checks} />
        </div>
      )}

      {history.length > 0 && (
        <div style={adminCard} className="p-6">
          <div className="font-heading font-bold text-[15px] mb-3">Optimization history</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: adminColors.textMuted, textAlign: 'left' }}>
                  <th className="py-1.5 pr-3">Date</th><th className="py-1.5 pr-3">SEO</th><th className="py-1.5 pr-3">Readability</th><th className="py-1.5 pr-3">Overall</th><th className="py-1.5">By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderTop: `1px solid ${adminColors.cardBorder}` }}>
                    <td className="py-1.5 pr-3">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{h.seo_score ?? '—'}</td>
                    <td className="py-1.5 pr-3">{h.readability_score ?? '—'}</td>
                    <td className="py-1.5 pr-3">{h.overall_score ?? '—'}</td>
                    <td className="py-1.5">{h.analyzed_by_name ?? 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
