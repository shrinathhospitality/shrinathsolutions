import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type Testimonial = {
  id: number;
  client_name: string;
  business_name: string | null;
  client_image: string | null;
  quote: string;
  service_used: string | null;
  rating: number | null;
  is_featured: number | boolean;
  is_active: number | boolean;
  display_order: number;
};
type ListResponse = { testimonials: Testimonial[]; meta: { total: number; page: number; total_pages: number } };

const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14, width: '100%' };
const emptyForm = { client_name: '', business_name: '', client_image: '', quote: '', service_used: '', rating: '', is_featured: false };

export default function Testimonials() {
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback((page = 1) => {
    setLoading(true);
    return adminFetch<ListResponse>(`/api/admin/testimonials?page=${page}&per_page=50`)
      .then((d) => { setRows(d.testimonials); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load testimonials'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function add() {
    if (!form.client_name.trim() || !form.quote.trim()) return;
    setSaving(true);
    try {
      await adminFetch('/api/admin/testimonials', {
        method: 'POST',
        body: JSON.stringify({ ...form, rating: form.rating || null }),
      });
      setForm(emptyForm);
      toast.success('Testimonial added');
      load(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add testimonial');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Testimonial) {
    try {
      await adminFetch(`/api/admin/testimonials/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ client_name: t.client_name, quote: t.quote, business_name: t.business_name, client_image: t.client_image, service_used: t.service_used, rating: t.rating, is_featured: t.is_featured, is_active: !t.is_active, display_order: t.display_order }),
      });
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  async function toggleFeatured(t: Testimonial) {
    try {
      await adminFetch(`/api/admin/testimonials/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ client_name: t.client_name, quote: t.quote, business_name: t.business_name, client_image: t.client_image, service_used: t.service_used, rating: t.rating, is_featured: !t.is_featured, is_active: t.is_active, display_order: t.display_order }),
      });
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await adminFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="grid gap-4 max-w-[860px]">
      <p style={{ color: adminColors.textMuted, fontSize: 14 }}>
        Only real, authorised testimonials belong here. The homepage testimonials section hides itself automatically when no active testimonial exists.
      </p>

      <div style={adminCard} className="p-5 grid gap-3">
        <div className="font-heading font-bold text-[15px]">Add a testimonial</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <input style={inputStyle} placeholder="Client name *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <input style={inputStyle} placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          <input style={inputStyle} placeholder="Service used" value={form.service_used} onChange={(e) => setForm({ ...form, service_used: e.target.value })} />
          <input style={inputStyle} placeholder="Client image URL (optional)" value={form.client_image} onChange={(e) => setForm({ ...form, client_image: e.target.value })} />
          <select style={inputStyle} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>)}
          </select>
          <label className="flex items-center gap-2 text-[14px]" style={{ color: adminColors.textMuted }}>
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Featured (large quote)
          </label>
        </div>
        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Testimonial quote *" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        <button type="button" disabled={saving} onClick={add} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] w-fit" style={adminPrimaryBtn}>
          <Plus size={15} /> Add testimonial
        </button>
      </div>

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No testimonials yet. The homepage section stays hidden until one is added and active.</div>
        ) : (
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Client</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Quote</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Featured</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-medium">
                    {t.client_name}
                    <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{t.business_name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[320px]" style={{ color: adminColors.textMuted }}>{t.quote.slice(0, 90)}{t.quote.length > 90 ? '…' : ''}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleFeatured(t)} style={{ color: t.is_featured ? '#f59e0b' : adminColors.textMuted }}>
                      <Star size={16} fill={t.is_featured ? '#f59e0b' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleActive(t)} className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize inline-flex items-center gap-1" style={t.is_active ? { background: '#e6f7ef', color: '#1fa971' } : { background: '#f1f3f9', color: adminColors.textMuted }}>
                      {t.is_active ? <Eye size={12} /> : <EyeOff size={12} />} {t.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove(t.id)} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
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
