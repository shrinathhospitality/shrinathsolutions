import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Search, Eye } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import type { ContentStatus } from '../lib/contentTypes';
import { seoStudioApi, type InventoryItem } from '../../features/seo-studio/api';
import SeoInventoryCell from '../components/SeoInventoryCell';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import BulkActionBar from '../components/BulkActionBar';
import DataTable, { type Column } from '../components/DataTable';

type Row = { id: number; title: string; slug: string; category_name: string | null; status: ContentStatus; updated_at: string };
type ListResponse = { posts: Row[]; meta: { total: number; page: number; total_pages: number } };

export default function Blog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seoByContentId, setSeoByContentId] = useState<Record<number, InventoryItem>>({});
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/blog?${params}`)
      .then((d) => { setRows(d.posts); setMeta(d.meta); setSelected(new Set()); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load posts');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load posts.");
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    seoStudioApi
      .content('content_type=blog_post&per_page=100')
      .then((d) => {
        const map: Record<number, InventoryItem> = {};
        for (const item of d.items) map[item.content_id] = item;
        setSeoByContentId(map);
      })
      .catch(() => {});
  }, []);

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function runBulk(action: 'publish' | 'archive' | 'delete') {
    await adminFetch('/api/admin/blog/bulk', { method: 'POST', body: JSON.stringify({ ids: [...selected], action }) });
    toast.success('Done');
    await load(meta.page);
  }

  function bulk(action: 'publish' | 'archive' | 'delete') {
    if (selected.size === 0) return;
    if (action === 'delete') {
      confirm({
        title: `Delete ${selected.size} post(s)?`,
        variant: 'destructive',
        confirmLabel: 'Delete',
        onConfirm: () => runBulk(action),
      });
      return;
    }
    runBulk(action).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Bulk action failed'));
  }

  function remove(id: number, title: string) {
    confirm({
      title: `Delete "${title}"?`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader title="Blog Posts" description="Create, publish and optimize website articles." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search posts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <Link to="/admin/blog/new" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> New post
        </Link>
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button type="button" onClick={() => bulk('publish')} className="text-[13.5px] font-semibold" style={{ color: adminColors.lime }}>Publish</button>
        <button type="button" onClick={() => bulk('archive')} className="text-[13.5px] font-semibold" style={{ color: 'rgba(255,255,255,.75)' }}>Archive</button>
        <button type="button" onClick={() => bulk('delete')} className="text-[13.5px] font-semibold" style={{ color: '#ff8f8f' }}>Delete</button>
      </BulkActionBar>

      <DataTable<Row>
        columns={blogColumns(seoByContentId, remove)}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No blog posts yet"
        emptyDescription="Write your first article to get started."
        caption="Blog posts with category, status, SEO score, last-updated date and available actions."
        selectable
        selectedKeys={selected}
        onToggleSelect={(id) => toggle(id as number)}
        onToggleSelectAll={(checked) => setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set())}
        rowSelectLabel={(row) => `Select "${row.title}"`}
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}

function blogColumns(
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
    { key: 'category', header: 'Category', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.category_name ?? '—'}</span> },
    { key: 'status', header: 'Status', wrap: false, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'seo', header: 'SEO', wrap: false, render: (row) => <SeoInventoryCell item={seoByContentId[row.id]} /> },
    { key: 'updated', header: 'Updated', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <a href={`/blog/${row.slug}`} target="_blank" rel="noopener noreferrer" title="View live page" style={{ color: adminColors.textMuted }}><Eye size={15} /></a>
          <Link to={`/admin/blog/${row.id}/edit`} title="Edit" style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
          <button type="button" onClick={() => remove(row.id, row.title)} aria-label={`Delete "${row.title}"`} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];
}
