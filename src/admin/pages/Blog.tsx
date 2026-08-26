import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Search, CheckSquare, Square, Eye } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import StatusBadge from '../components/StatusBadge';
import type { ContentStatus } from '../lib/contentTypes';

type Row = { id: number; title: string; slug: string; category_name: string | null; status: ContentStatus; updated_at: string };
type ListResponse = { posts: Row[]; meta: { total: number; page: number; total_pages: number } };

export default function Blog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/blog?${params}`)
      .then((d) => { setRows(d.posts); setMeta(d.meta); setSelected(new Set()); })
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); }, [load]);

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function bulk(action: 'publish' | 'archive' | 'delete') {
    if (selected.size === 0) return;
    if (action === 'delete' && !confirm(`Delete ${selected.size} post(s)? This cannot be undone.`)) return;
    try {
      await adminFetch('/api/admin/blog/bulk', { method: 'POST', body: JSON.stringify({ ids: [...selected], action }) });
      toast.success('Done');
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Bulk action failed');
    }
  }

  async function remove(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
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

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-[10px]" style={{ background: '#eef0ff' }}>
          <span className="text-[13.5px] font-semibold">{selected.size} selected</span>
          <button type="button" onClick={() => bulk('publish')} className="text-[13.5px] font-semibold" style={{ color: adminColors.success }}>Publish</button>
          <button type="button" onClick={() => bulk('archive')} className="text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>Archive</button>
          <button type="button" onClick={() => bulk('delete')} className="text-[13.5px] font-semibold" style={{ color: adminColors.danger }}>Delete</button>
        </div>
      )}

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No posts found.</div>
        ) : (
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Title</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Category</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Updated</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggle(row.id)} style={{ color: adminColors.textMuted }}>
                      {selected.has(row.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{row.title}<div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>/{row.slug}</div></td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.category_name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{new Date(row.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2.5">
                      <a href={`/blog/${row.slug}`} target="_blank" rel="noopener noreferrer" title="View live page" style={{ color: adminColors.textMuted }}><Eye size={15} /></a>
                      <Link to={`/admin/blog/${row.id}/edit`} style={{ color: adminColors.accentBlue }}><Pencil size={15} /></Link>
                      <button type="button" onClick={() => remove(row.id, row.title)} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.total_pages > 1 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => load(p)} className="w-8 h-8 rounded-full text-[13px] font-semibold" style={p === meta.page ? adminPrimaryBtn : { border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
