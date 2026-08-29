import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Copy, Trash2, Pencil, Search, Eye } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import type { ContentStatus } from '../lib/contentTypes';
import { seoStudioApi, type InventoryItem } from '../../features/seo-studio/api';
import SeoInventoryCell from '../components/SeoInventoryCell';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import RowActionMenu, { type RowAction } from '../components/RowActionMenu';
import DataTable, { type Column } from '../components/DataTable';

type ServiceRow = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  status: ContentStatus;
  display_order: number;
  updated_at: string;
};

type ListResponse = { services: ServiceRow[]; meta: { total: number; page: number; total_pages: number } };

export default function Services() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seoByContentId, setSeoByContentId] = useState<Record<number, InventoryItem>>({});
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/services?${params}`)
      .then((d) => {
        setRows(d.services);
        setMeta(d.meta);
        setLoadError(null);
      })
      .catch((err) => {
        toast.error('Failed to load services');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load services.");
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    seoStudioApi
      .content('content_type=service&per_page=100')
      .then((d) => {
        const map: Record<number, InventoryItem> = {};
        for (const item of d.items) map[item.content_id] = item;
        setSeoByContentId(map);
      })
      .catch(() => {});
  }, []);

  function remove(id: number, name: string) {
    confirm({
      title: `Delete "${name}"?`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/services/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  async function duplicate(id: number) {
    try {
      await adminFetch(`/api/admin/services/${id}/duplicate`, { method: 'POST' });
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
      <PageHeader title="Service Pages" description="Create, publish and optimize service pages." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <Link to="/admin/services/new" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> New service
        </Link>
      </div>

      <DataTable<ServiceRow>
        columns={servicesColumns(seoByContentId, duplicate, remove)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No service pages yet"
        emptyDescription="Create your first service page to get started."
        caption="Service pages with category, status, SEO score, order, last-updated date and available actions."
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function servicesColumns(
  seoByContentId: Record<number, InventoryItem>,
  duplicate: (id: number) => void,
  remove: (id: number, name: string) => void,
): Column<ServiceRow>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <>
          <span className="font-medium">{row.name}</span>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>/{row.slug}</div>
        </>
      ),
    },
    { key: 'category', header: 'Category', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.category ?? '—'}</span> },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'seo', header: 'SEO', wrap: false, render: (row) => <SeoInventoryCell item={seoByContentId[row.id]} /> },
    { key: 'order', header: 'Order', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.display_order}</span> },
    { key: 'updated', header: 'Updated', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <Link to={`/admin/services/${row.id}/edit`} title="Edit" style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
          <RowActionMenu
            label={`Actions for "${row.name}"`}
            actions={[
              { label: 'View live page', icon: <Eye size={14} />, onClick: () => window.open(`/services/${row.slug}`, '_blank', 'noopener,noreferrer') },
              { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicate(row.id) },
              { label: 'Delete', icon: <Trash2 size={14} />, danger: true, separated: true, onClick: () => remove(row.id, row.name) },
            ] satisfies RowAction[]}
          />
        </div>
      ),
    },
  ];
}
