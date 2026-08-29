import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Search, Eye } from 'lucide-react';
import { adminFetch } from '../lib/api';
import { adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import type { ContentStatus } from '../lib/contentTypes';
import { seoStudioApi, type InventoryItem } from '../../features/seo-studio/api';
import SeoInventoryCell from '../components/SeoInventoryCell';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import DataTable, { type Column } from '../components/DataTable';

type Row = { id: number; title: string; slug: string; primary_keyword: string | null; target_location: string | null; status: ContentStatus; updated_at: string };
type ListResponse = { seo_pages: Row[]; meta: { total: number; page: number; total_pages: number } };

export default function SeoPages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seoByContentId, setSeoByContentId] = useState<Record<number, InventoryItem>>({});
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    return adminFetch<ListResponse>(`/api/admin/seo-pages?${params}`)
      .then((d) => { setRows(d.seo_pages); setMeta(d.meta); setLoadError(null); })
      .catch(() => {
        toast.error('Failed to load SEO pages');
        setLoadError("Couldn't load SEO pages.");
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    seoStudioApi
      .content('content_type=seo_page&per_page=100')
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
        await adminFetch(`/api/admin/seo-pages/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader title="SEO Pages" description="Manage location and keyword-targeted landing pages." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search SEO pages…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link to="/admin/seo-pages/new" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> New SEO page
        </Link>
      </div>

      <DataTable<Row>
        columns={seoPagesColumns(seoByContentId, remove)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No SEO pages yet"
        emptyDescription="Create your first location or keyword-targeted landing page."
        caption="SEO pages with target keyword, location, status, SEO score and available actions."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function seoPagesColumns(
  seoByContentId: Record<number, InventoryItem>,
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
    { key: 'keyword', header: 'Keyword', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.primary_keyword ?? '—'}</span> },
    { key: 'location', header: 'Location', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.target_location ?? '—'}</span> },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'seo', header: 'SEO score', wrap: false, render: (row) => <SeoInventoryCell item={seoByContentId[row.id]} hideKeyword /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      // Only 3 actions exist (View/Edit/Delete) — a flat inline layout stays clear here, so
      // RowActionMenu isn't used; see the DataTable migration report for the fit rationale.
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <a href={`/${row.slug}`} target="_blank" rel="noopener noreferrer" title="View live page" style={{ color: adminColors.textMuted }}><Eye size={15} /></a>
          <Link to={`/admin/seo-pages/${row.id}/edit`} title="Edit" style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
          <button type="button" onClick={() => remove(row.id, row.title)} aria-label={`Delete "${row.title}"`} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];
}
