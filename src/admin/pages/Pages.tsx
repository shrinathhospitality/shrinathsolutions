import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Copy, Trash2, Pencil, Search, History, Eye } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import type { ContentStatus } from '../lib/contentTypes';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import RowActionMenu, { type RowAction } from '../components/RowActionMenu';
import DataTable, { type Column } from '../components/DataTable';
import { seoStudioApi, type InventoryItem } from '../../features/seo-studio/api';
import SeoScoreBadge from '../components/SeoScoreBadge';

type Row = { id: number; title: string; slug: string; status: ContentStatus; updated_at: string };
type ListResponse = { pages: Row[]; meta: { total: number; page: number; total_pages: number } };

export default function Pages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seoByContentId, setSeoByContentId] = useState<Record<number, InventoryItem>>({});
  const { confirm, dialog } = useConfirmDialog();
  const navigate = useNavigate();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    return adminFetch<ListResponse>(`/api/admin/pages?${params}`)
      .then((d) => { setRows(d.pages); setMeta(d.meta); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load pages');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load pages.");
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    seoStudioApi
      .content('content_type=page&per_page=100')
      .then((d) => {
        const map: Record<number, InventoryItem> = {};
        for (const item of d.items) map[item.content_id] = item;
        setSeoByContentId(map);
      })
      .catch(() => {});
  }, []);

  function remove(id: number, title: string) {
    confirm({
      title: `Delete "${title}"?`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  async function duplicate(id: number) {
    try {
      await adminFetch(`/api/admin/pages/${id}/duplicate`, { method: 'POST' });
      toast.success('Duplicated as draft');
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to duplicate');
    }
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader title="Pages" description="Manage static site pages." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link to="/admin/pages/new" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> New page
        </Link>
      </div>

      <DataTable<Row>
        columns={pagesColumns(seoByContentId, navigate, duplicate, remove)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No pages yet"
        emptyDescription="Create your first page to get started."
        caption="Pages with route, status, SEO score, last-updated date and available actions."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function pagesColumns(
  seoByContentId: Record<number, InventoryItem>,
  navigate: ReturnType<typeof useNavigate>,
  duplicate: (id: number) => void,
  remove: (id: number, title: string) => void,
): Column<Row>[] {
  return [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <>
          <span className="font-medium">{row.title}</span>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>/{row.slug}</div>
        </>
      ),
    },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'seo',
      header: 'SEO score',
      wrap: false,
      render: (row) => {
        const item = seoByContentId[row.id];
        return item ? <SeoScoreBadge score={item.overall_score} lastAnalyzedAt={item.last_analyzed_at} /> : <span style={{ color: adminColors.textMuted }}>—</span>;
      },
    },
    { key: 'updated', header: 'Updated', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <Link to={`/admin/pages/${row.id}/edit`} title="Edit" style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
          <RowActionMenu
            label={`Actions for "${row.title}"`}
            actions={[
              { label: 'View live page', icon: <Eye size={14} />, onClick: () => window.open(`/${row.slug}`, '_blank', 'noopener,noreferrer') },
              { label: 'Revisions', icon: <History size={14} />, onClick: () => navigate(`/admin/pages/${row.id}/revisions`) },
              { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicate(row.id) },
              { label: 'Delete', icon: <Trash2 size={14} />, danger: true, separated: true, onClick: () => remove(row.id, row.title) },
            ] satisfies RowAction[]}
          />
        </div>
      ),
    },
  ];
}
