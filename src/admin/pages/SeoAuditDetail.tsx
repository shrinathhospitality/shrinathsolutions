import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors } from '../adminTheme';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ListStates';
import SeoScoreBadge from '../components/SeoScoreBadge';
import { AuditStatusPill, LeadStatusPill, type AuditRow, type LeadStatus } from './SeoAudits';

type RecommendationSummary = { title: string; priority: 'critical' | 'high' | 'medium' | 'low'; effort: 'easy' | 'medium' | 'hard'; advice: string };
type ResultSummary = { grade: string | null; categories: Record<string, number>; recommendations: RecommendationSummary[] };
type AuditDetail = AuditRow & {
  path: string;
  safe_error_code: string | null;
  safe_error_message: string | null;
  processing_time_ms: number | null;
  completed_at: string | null;
  updated_at: string;
  result_summary: ResultSummary | null;
};

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'closed', label: 'Closed' },
  { value: 'not_interested', label: 'Not interested' },
];

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical', onPage: 'On-Page', performance: 'Performance', mobile: 'Mobile', security: 'Security', accessibility: 'Accessibility',
};

export default function SeoAuditDetail() {
  const { id } = useParams();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingLeadStatus, setSavingLeadStatus] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    return adminFetch<{ audit: AuditDetail }>(`/api/admin/seo-audits/${id}`)
      .then((d) => setAudit(d.audit))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load audit');
          setLoadError(err instanceof ApiError ? err.message : "Couldn't load this audit.");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveLeadStatus(status: LeadStatus) {
    if (!audit) return;
    setSavingLeadStatus(true);
    try {
      await adminFetch(`/api/admin/seo-audits/${audit.id}/lead-status`, { method: 'PUT', body: JSON.stringify({ lead_status: status }) });
      setAudit({ ...audit, lead_status: status });
      toast.success('Lead status updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update lead status');
    } finally {
      setSavingLeadStatus(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Audit Details"
        breadcrumbs={[{ label: 'SEO Audit Tool Runs', to: '/admin/seo-audits' }, { label: audit?.domain ?? (id ?? '') }]}
        actions={<Link to="/admin/seo-audits" className="flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}><ArrowLeft size={15} /> Back to list</Link>}
      />

      {loading ? (
        <div style={adminCard} className="p-6"><TableSkeleton rows={4} cols={2} /></div>
      ) : notFound ? (
        <EmptyState title="Audit not found" description="This audit may have been deleted, or the link is incorrect." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : audit ? (
        <>
          <div style={adminCard} className="p-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[.06em]" style={{ color: adminColors.textMuted }}>Website</div>
              <a href={audit.normalized_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-heading font-bold text-[17px] mt-1" style={{ color: adminColors.textPrimary }}>
                {audit.domain}{audit.path !== '/' ? audit.path : ''} <ExternalLink size={14} style={{ color: adminColors.textMuted }} />
              </a>
              <div className="text-[12.5px] mt-1" style={{ color: adminColors.textMuted }}>Request ID: {audit.request_id}</div>
            </div>
            <div className="grid gap-1.5 content-start">
              <div className="flex items-center gap-2"><AuditStatusPill status={audit.status} /> {audit.overall_score !== null && <SeoScoreBadge score={audit.overall_score} />}</div>
              <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>
                Run: {new Date(audit.created_at).toLocaleString()}
                {audit.completed_at && <> &middot; Completed: {new Date(audit.completed_at).toLocaleString()}</>}
                {audit.processing_time_ms !== null && <> &middot; {(audit.processing_time_ms / 1000).toFixed(1)}s</>}
              </div>
            </div>
          </div>

          {audit.status === 'failed' && (
            <div style={adminCard} className="p-5" >
              <div className="font-heading font-bold text-[15px]" style={{ color: adminColors.danger }}>Failure reason</div>
              <p className="mt-1.5 mb-0 text-[14px]" style={{ color: adminColors.textMuted }}>{audit.safe_error_message ?? 'The analysis could not be completed.'}</p>
              {audit.safe_error_code && <div className="text-[12px] mt-1" style={{ color: adminColors.textMutedLight }}>Code: {audit.safe_error_code}</div>}
            </div>
          )}

          {audit.status === 'completed' && (
            <>
              <div style={adminCard} className="p-5 grid gap-4 sm:grid-cols-4">
                <SummaryStat label="Critical" value={audit.critical_count} color={adminColors.danger} />
                <SummaryStat label="Warnings" value={audit.warning_count} color={adminColors.warning} />
                <SummaryStat label="Improvements" value={audit.improvement_count} color={adminColors.info} />
                <SummaryStat label="Passed" value={audit.passed_count} color={adminColors.success} />
              </div>

              {audit.result_summary && (
                <div style={adminCard} className="p-5">
                  <div className="font-heading font-bold text-[15px] mb-3">Category scores{audit.result_summary.grade ? ` — Grade ${audit.result_summary.grade}` : ''}</div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {Object.entries(audit.result_summary.categories).map(([key, score]) => (
                      <div key={key}>
                        <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{CATEGORY_LABELS[key] ?? key}</div>
                        <div className="font-heading font-bold text-[18px]">{score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {audit.result_summary && audit.result_summary.recommendations.length > 0 && (
                <div style={adminCard} className="p-5">
                  <div className="font-heading font-bold text-[15px] mb-3">Recommendations</div>
                  <div className="grid gap-3">
                    {audit.result_summary.recommendations.map((r, i) => (
                      <div key={i} className="p-3.5 rounded-[12px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: adminColors.contentBg, color: adminColors.textMuted }}>{r.priority}</span>
                          <span className="text-[11px]" style={{ color: adminColors.textMutedLight }}>{r.effort} effort</span>
                        </div>
                        <div className="font-semibold text-[14px]">{r.title}</div>
                        <p className="text-[13px] mt-1 mb-0" style={{ color: adminColors.textMuted }}>{r.advice}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={adminCard} className="p-5">
            <div className="font-heading font-bold text-[15px] mb-3">Contact lead</div>
            {audit.lead_email ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-[14px] font-semibold">{audit.lead_name || audit.lead_email}</div>
                  {audit.lead_name && <div className="text-[13px]" style={{ color: adminColors.textMuted }}>{audit.lead_email}</div>}
                </div>
                <label className="grid gap-1 text-[12.5px] font-semibold" style={{ color: adminColors.textMuted }}>
                  Lead status
                  <select
                    value={audit.lead_status ?? 'new'}
                    disabled={savingLeadStatus}
                    onChange={(e) => saveLeadStatus(e.target.value as LeadStatus)}
                    className="px-3 py-2 rounded-[10px] text-[13.5px]"
                    style={{ border: `1px solid ${adminColors.cardBorder}` }}
                  >
                    {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <p className="m-0 text-[14px]" style={{ color: adminColors.textMuted }}>
                This was an anonymous audit — no contact details were provided. <LeadStatusPill status={null} />
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{label}</div>
      <div className="font-heading font-bold text-[22px]" style={{ color }}>{value}</div>
    </div>
  );
}
