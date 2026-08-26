import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type Redirect = { id: number; source_url: string; destination_url: string; redirect_type: '301' | '302'; status: 'active' | 'inactive'; notes: string | null };
type ListResponse = { redirects: Redirect[]; meta: { total: number; page: number; total_pages: number } };

const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

export default function Redirects() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [type, setType] = useState<'301' | '302'>('301');

  const load = useCallback((page = 1) => {
    setLoading(true);
    return adminFetch<ListResponse>(`/api/admin/redirects?page=${page}&per_page=50`)
      .then((d) => { setRows(d.redirects); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load redirects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function add() {
    if (!source.trim() || !destination.trim()) return;
    try {
      await adminFetch('/api/admin/redirects', {
        method: 'POST',
        body: JSON.stringify({ source_url: source, destination_url: destination, redirect_type: type }),
      });
      setSource('');
      setDestination('');
      toast.success('Redirect added');
      load(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add redirect');
    }
  }

  async function toggleStatus(r: Redirect) {
    try {
      await adminFetch(`/api/admin/redirects/${r.id}`, {
        method: 'PUT',
        body: JSON.stringify({ source_url: r.source_url, destination_url: r.destination_url, redirect_type: r.redirect_type, status: r.status === 'active' ? 'inactive' : 'active' }),
      });
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this redirect?')) return;
    try {
      await adminFetch(`/api/admin/redirects/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="grid gap-4 max-w-[760px]">
      <div style={adminCard} className="p-4 flex flex-wrap items-center gap-2.5">
        <input style={{ ...inputStyle, width: 200 }} placeholder="/old-path" value={source} onChange={(e) => setSource(e.target.value)} />
        <span style={{ color: adminColors.textMuted }}>→</span>
        <input style={{ ...inputStyle, width: 220 }} placeholder="/new-path or https://…" value={destination} onChange={(e) => setDestination(e.target.value)} />
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as '301' | '302')}>
          <option value="301">301 (permanent)</option>
          <option value="302">302 (temporary)</option>
        </select>
        <button type="button" onClick={add} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No redirects yet.</div>
        ) : (
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Source</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Destination</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Type</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-mono text-[13px]">{r.source_url}</td>
                  <td className="px-4 py-3 font-mono text-[13px]" style={{ color: adminColors.textMuted }}>{r.destination_url}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.redirect_type}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleStatus(r)} className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize" style={r.status === 'active' ? { background: '#e6f7ef', color: '#1fa971' } : { background: '#f1f3f9', color: adminColors.textMuted }}>
                      {r.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove(r.id)} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
