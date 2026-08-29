import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Trash2, ExternalLink, Eye } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminColors } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { SearchInput, FilterSelect } from '../components/TableToolbar';
import DataTable, { type Column } from '../components/DataTable';
import SeoScoreBadge from '../components/SeoScoreBadge';

export type AuditStatus = 'processing' | 'completed' | 'failed';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'not_interested';

export type AuditRow = {
  id: number;
  request_id: string;
  normalized_url: string;
  domain: string;
  status: AuditStatus;
  overall_score: number | null;
  critical_count: number;
  warning_count: number;
  improvement_count: number;
  passed_count: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_status: LeadStatus | null;
  created_at: string;
};
type ListResponse = { audits: AuditRow[]; meta: { total: number; page: number; total_pages: number }; leads_count: number };

const AUDIT_STATUS_STYLE: Record<AuditStatus, { bg: string; text: string; label: string }> = {
  processing: { bg: '#EAF0FB', text: adminColors.info, label: 'Processing' },
  completed: { bg: adminColors.limeSoft, text: adminColors.success, label: 'Completed' },
  failed: { bg: '#FBEAEA', text: adminColors.danger, label: 'Failed' },
};

export function AuditStatusPill({ status }: { status: AuditStatus }) {
  const s = AUDIT_STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

export function LeadStatusPill({ status }: { status: LeadStatus | null }) {
  if (!status) return <span style={{ color: adminColors.textMuted }}>—</span>;
  const labels: Record<LeadStatus, string> = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', closed: 'Closed', not_interested: 'Not interested' };
  const colors: Record<LeadStatus, { bg: string; text: string }> = {
    new: { bg: adminColors.primarySoft, text: adminColors.primary },
    contacted: { bg: '#EAF0FB', text: adminColors.info },
    qualified: { bg: adminColors.limeSoft, text: adminColors.success },
    closed: { bg: '#F5F6F7', text: adminColors.textMuted },
    not_interested: { bg: '#FBEAEA', text: adminColors.danger },
  };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: colors[status].bg, color: colors[status].text }}>
      {labels[status]}
    </span>
  );
}

export default function SeoAudits() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [leadsCount, setLeadsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [scoreStatus, setScoreStatus] = useState('');
  const [lead, setLead] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (scoreStatus) params.set('score_status', scoreStatus);
    if (lead) params.set('lead', lead);
    return adminFetch<ListResponse>(`/api/admin/seo-audits?${params}`)
      .then((d) => { setRows(d.audits); setMeta(d.meta); setLeadsCount(d.leads_count); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load SEO audits');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load SEO audits.");
      })
      .finally(() => setLoading(false));
  }, [search, status, scoreStatus, lead]);

  useEffect(() => { load(1); }, [load]);

  function remove(id: number, domain: string) {
    confirm({
      title: `Delete the audit run for "${domain}"?`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/seo-audits/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader
        title="SEO Audit Tool Runs"
        description={`Every audit run through the public Free SEO Audit Tool. ${leadsCount} run(s) included a contact request.`}
        count={meta.total}
        actions={(
          <a href="/api/admin/seo-audits/export" className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
            <Download size={15} /> Export CSV
          </a>
        )}
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by URL, domain, name or email…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <FilterSelect
          label="Score"
          value={scoreStatus}
          onChange={setScoreStatus}
          options={[
            { value: '', label: 'All scores' },
            { value: 'good', label: 'Good (80+)' },
            { value: 'needs_improvement', label: 'Needs improvement (50-79)' },
            { value: 'poor', label: 'Poor (<50)' },
          ]}
        />
        <FilterSelect
          label="Contact"
          value={lead}
          onChange={setLead}
          options={[
            { value: '', label: 'All runs' },
            { value: 'lead', label: 'With contact details' },
            { value: 'anonymous', label: 'Anonymous' },
          ]}
        />
      </div>

      <DataTable<AuditRow>
        columns={auditColumns(remove)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No audits yet"
        emptyDescription="Runs of the public Free SEO Audit Tool will appear here."
        caption="SEO audit tool runs with domain, status, score, issue counts, contact lead and run date."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function auditColumns(remove: (id: number, domain: string) => void): Column<AuditRow>[] {
  return [
    {
      key: 'domain',
      header: 'Website',
      render: (row) => (
        <>
          <a href={row.normalized_url} target="_blank" rel="noopener noreferrer" className="font-medium inline-flex items-center gap-1" style={{ color: adminColors.textPrimary }}>
            {row.domain} <ExternalLink size={12} style={{ color: adminColors.textMuted }} />
          </a>
        </>
      ),
    },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <AuditStatusPill status={row.status} /> },
    { key: 'score', header: 'Overall score', wrap: false, render: (row) => (row.overall_score !== null ? <SeoScoreBadge score={row.overall_score} /> : <span style={{ color: adminColors.textMuted }}>—</span>) },
    { key: 'critical', header: 'Critical', wrap: false, render: (row) => <span style={{ color: row.critical_count > 0 ? adminColors.danger : adminColors.textMuted }}>{row.critical_count}</span> },
    { key: 'warnings', header: 'Warnings', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.warning_count}</span> },
    {
      key: 'lead',
      header: 'Lead',
      wrap: false,
      render: (row) => row.lead_email ? (
        <>
          <div className="text-[13.5px]">{row.lead_name || row.lead_email}</div>
          {row.lead_name && <div className="text-[12px]" style={{ color: adminColors.textMuted }}>{row.lead_email}</div>}
        </>
      ) : <span style={{ color: adminColors.textMuted }}>Anonymous</span>,
    },
    { key: 'lead_status', header: 'Lead status', wrap: false, render: (row) => <LeadStatusPill status={row.lead_status} /> },
    { key: 'when', header: 'Audit date', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.created_at).toLocaleString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <Link to={`/admin/seo-audits/${row.id}`} title="View details" aria-label={`View details for "${row.domain}"`} style={{ color: adminColors.accentBlue }}><Eye size={15} /></Link>
          <button type="button" onClick={() => remove(row.id, row.domain)} aria-label={`Delete audit run for "${row.domain}"`} style={{ color: adminColors.danger }}>
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];
}
