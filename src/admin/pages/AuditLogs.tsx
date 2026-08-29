import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminColors } from '../adminTheme';
import PageHeader from '../components/PageHeader';
import { SearchInput } from '../components/TableToolbar';
import Pagination from '../components/Pagination';
import DataTable, { type Column } from '../components/DataTable';

type LogRow = { id: number; action: string; entity_type: string | null; entity_id: string | null; description: string | null; ip_address: string | null; created_at: string; admin_name: string | null };
type ListResponse = { logs: LogRow[]; meta: { total: number; page: number; total_pages: number } };

export default function AuditLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '30' });
    if (search) params.set('search', search);
    return adminFetch<ListResponse>(`/api/admin/audit-logs?${params}`)
      .then((d) => { setRows(d.logs); setMeta(d.meta); setLoadError(null); })
      .catch(() => {
        toast.error('Failed to load audit logs');
        setLoadError("Couldn't load audit logs.");
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Audit Logs" description="Read-only record of admin activity." count={meta.total} />
      <div className="max-w-[320px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
      </div>

      <DataTable<LogRow>
        columns={auditLogColumns()}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No activity recorded yet"
        caption="Read-only log of admin actions with entity, administrator and timestamp — no edit or delete actions exist here."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function auditLogColumns(): Column<LogRow>[] {
  return [
    { key: 'action', header: 'Action', wrap: false, render: (row) => <span className="font-medium">{row.action.replace(/_/g, ' ')}</span> },
    { key: 'entity', header: 'Entity', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.entity_type ? `${row.entity_type} #${row.entity_id}` : '—'}</span> },
    { key: 'admin', header: 'Admin', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.admin_name ?? '—'}</span> },
    { key: 'details', header: 'Details', render: (row) => <span style={{ color: adminColors.textMuted }}>{row.description ?? '—'}</span> },
    { key: 'when', header: 'When', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.created_at).toLocaleString()}</span> },
  ];
}
