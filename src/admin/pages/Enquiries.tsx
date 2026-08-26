import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Search, Download, X } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type Enquiry = {
  id: number; name: string; phone: string | null; email: string | null; message: string | null;
  service: string | null; page_url: string | null; source: string | null; status: string;
  internal_notes: string | null; created_at: string;
};
type ListResponse = { enquiries: Enquiry[]; meta: { total: number; page: number; total_pages: number } };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#eef0ff', text: '#3b6bff' },
  contacted: { bg: '#fff4e6', text: '#c2650a' },
  converted: { bg: '#e6f7ef', text: '#1fa971' },
  spam: { bg: '#fdecea', text: '#e0473e' },
};

export default function Enquiries() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/enquiries?${params}`)
      .then((d) => { setRows(d.enquiries); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load enquiries'))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); }, [load]);

  async function save(enquiry: Enquiry) {
    try {
      await adminFetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: enquiry.status, internal_notes: enquiry.internal_notes }),
      });
      toast.success('Saved');
      setSelected(null);
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this enquiry? This cannot be undone.')) return;
    try {
      await adminFetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      setSelected(null);
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
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search enquiries…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="spam">Spam</option>
        </select>
        <a href="/api/admin/enquiries/export" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
          <Download size={15} /> Export CSV
        </a>
      </div>

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No enquiries found.</div>
        ) : (
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Name</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Contact</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Service</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer" style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.phone ?? row.email ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.service ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize" style={{ background: (STATUS_COLORS[row.status] ?? STATUS_COLORS.new).bg, color: (STATUS_COLORS[row.status] ?? STATUS_COLORS.new).text }}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{new Date(row.created_at).toLocaleString()}</td>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(10,14,28,.5)' }} onClick={() => setSelected(null)}>
          <div style={{ ...adminCard, maxWidth: 520, width: '100%' }} className="p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading font-bold text-[17px]">{selected.name}</div>
              <button type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="grid gap-2 text-[14px] mb-4">
              {selected.phone && <div><strong>Phone:</strong> {selected.phone}</div>}
              {selected.email && <div><strong>Email:</strong> {selected.email}</div>}
              {selected.service && <div><strong>Service:</strong> {selected.service}</div>}
              {selected.page_url && <div><strong>Page:</strong> {selected.page_url}</div>}
              {selected.message && <div className="mt-1"><strong>Message:</strong> {selected.message}</div>}
            </div>
            <label className="grid gap-1.5 text-[13px] font-semibold mb-3" style={{ color: adminColors.textMuted }}>
              Status
              <select style={inputStyle} value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value })}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="spam">Spam</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
              Internal notes
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={selected.internal_notes ?? ''} onChange={(e) => setSelected({ ...selected, internal_notes: e.target.value })} />
            </label>
            <div className="flex items-center gap-2.5 mt-5">
              <button type="button" onClick={() => save(selected)} className="px-4 py-2.5 rounded-full text-[13.5px]" style={adminPrimaryBtn}>Save</button>
              <button type="button" onClick={() => remove(selected.id)} className="ml-auto" style={{ color: adminColors.danger }}><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
