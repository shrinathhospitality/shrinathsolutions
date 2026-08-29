import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Search, Eye, ArrowUp, ArrowDown, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import { seoStudioApi, type InventoryItem } from '../../features/seo-studio/api';
import SeoInventoryCell from '../components/SeoInventoryCell';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import RowActionMenu, { type RowAction } from '../components/RowActionMenu';
import DataTable, { type Column } from '../components/DataTable';

type VentureRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  layout_variant: string;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
};
type ListResponse = { ventures: VentureRow[]; meta: { total: number; page: number; total_pages: number } };

export default function Ventures() {
  const { ventureCapabilities } = useAuth();
  const canReorder = ventureCapabilities?.includes('ventures.reorder') ?? false;
  const canPublish = ventureCapabilities?.includes('ventures.publish') ?? false;
  const canArchive = ventureCapabilities?.includes('ventures.archive') ?? false;

  const [rows, setRows] = useState<VentureRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seoByContentId, setSeoByContentId] = useState<Record<number, InventoryItem>>({});
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/ventures?${params}`)
      .then((d) => { setRows(d.ventures); setMeta(d.meta); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load ventures');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load ventures.");
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    seoStudioApi
      .content('content_type=venture&per_page=100')
      .then((d) => {
        const map: Record<number, InventoryItem> = {};
        for (const item of d.items) map[item.content_id] = item;
        setSeoByContentId(map);
      })
      .catch(() => {});
  }, []);

  async function runStatusAction(id: number, action: 'publish' | 'unpublish' | 'archive' | 'restore') {
    await adminFetch(`/api/admin/ventures/${id}/${action}`, { method: 'POST' });
    toast.success('Done');
    await load(meta.page);
  }

  function setStatusAction(id: number, action: 'publish' | 'unpublish' | 'archive' | 'restore', label: string) {
    if (action === 'archive') {
      confirm({
        title: `Archive "${label}"?`,
        description: 'It will be removed from the public site until restored.',
        variant: 'archive',
        onConfirm: () => runStatusAction(id, action),
      });
      return;
    }
    if (action === 'publish') {
      confirm({
        title: `Publish "${label}"?`,
        description: 'It will become publicly visible.',
        variant: 'publish',
        onConfirm: () => runStatusAction(id, action),
      });
      return;
    }
    runStatusAction(id, action).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Action failed'));
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    try {
      await adminFetch('/api/admin/ventures/reorder', { method: 'POST', body: JSON.stringify({ ids: next.map((r) => r.id) }) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reorder');
      load(meta.page);
    }
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader title="Ventures" description="Manage Venture pages, publishing status and SEO performance." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search ventures…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <Link to="/admin/ventures/new" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> Add New Venture
        </Link>
      </div>

      <DataTable<VentureRow>
        columns={venturesColumns(seoByContentId, canReorder, canPublish, canArchive, rows.length, move, setStatusAction)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No ventures yet"
        emptyDescription="Add your first Venture page to get started."
        caption="Ventures with category, status, layout variant, SEO score, order, last-updated date and available actions."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function venturesColumns(
  seoByContentId: Record<number, InventoryItem>,
  canReorder: boolean,
  canPublish: boolean,
  canArchive: boolean,
  rowCount: number,
  move: (index: number, direction: -1 | 1) => void,
  setStatusAction: (id: number, action: 'publish' | 'unpublish' | 'archive' | 'restore', label: string) => void,
): Column<VentureRow>[] {
  return [
    {
      key: 'venture',
      header: 'Venture',
      render: (row) => (
        <>
          <span className="font-medium">{row.name}</span>
          {row.is_featured && <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: '#9a6700', background: '#fdf3d8' }}>Featured</span>}
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>/our-ventures/{row.slug}</div>
        </>
      ),
    },
    { key: 'category', header: 'Category', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.category}</span> },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <StatusBadge status={row.status === 'archived' ? 'archived' : row.status} /> },
    { key: 'layout', header: 'Layout', wrap: false, render: (row) => <span className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{row.layout_variant}</span> },
    { key: 'seo', header: 'SEO', wrap: false, render: (row) => <SeoInventoryCell item={seoByContentId[row.id]} /> },
    { key: 'updated', header: 'Updated', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (row, i) => (
        <div className="flex items-center justify-end gap-2">
          {canReorder && (
            <>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} title="Move up" aria-label={`Move "${row.name}" up`} style={{ color: i === 0 ? adminColors.cardBorder : adminColors.textMuted }}><ArrowUp size={14} /></button>
              <button type="button" disabled={i === rowCount - 1} onClick={() => move(i, 1)} title="Move down" aria-label={`Move "${row.name}" down`} style={{ color: i === rowCount - 1 ? adminColors.cardBorder : adminColors.textMuted }}><ArrowDown size={14} /></button>
            </>
          )}
          <Link to={`/admin/ventures/${row.id}/edit`} title="Edit" style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
          <RowActionMenu
            label={`Actions for "${row.name}"`}
            actions={[
              ...(row.status === 'published' ? [{ label: 'View live page', icon: <Eye size={14} />, onClick: () => window.open(`/our-ventures/${row.slug}`, '_blank', 'noopener,noreferrer') }] : []),
              ...(canPublish && row.status === 'draft' ? [{ label: 'Publish', icon: <CheckCircle2 size={14} />, onClick: () => setStatusAction(row.id, 'publish', row.name) }] : []),
              ...(canPublish && row.status === 'published' ? [{ label: 'Unpublish', icon: <XCircle size={14} />, onClick: () => setStatusAction(row.id, 'unpublish', row.name) }] : []),
              ...(canArchive && row.status === 'archived' ? [{ label: 'Restore', icon: <RotateCcw size={14} />, onClick: () => setStatusAction(row.id, 'restore', row.name) }] : []),
              ...(canArchive && row.status !== 'archived' ? [{ label: 'Archive', icon: <Trash2 size={14} />, danger: true, separated: true, onClick: () => setStatusAction(row.id, 'archive', row.name) }] : []),
            ] satisfies RowAction[]}
          />
        </div>
      ),
    },
  ];
}
