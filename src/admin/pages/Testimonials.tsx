import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    return adminFetch<ListResponse>(`/api/admin/testimonials?page=${page}&per_page=50`)
      .then((d) => { setRows(d.testimonials); setMeta(d.meta); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load testimonials');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load testimonials.");
      })
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

  function remove(id: number) {
    confirm({
      title: 'Delete this testimonial?',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  return (
    <div className="grid gap-4 w-full">
      {dialog}
      <PageHeader
        title="Testimonials"
        description="Only real, authorised testimonials belong here. The homepage testimonials section hides itself automatically when no active testimonial exists."
        count={meta.total}
      />

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

      <DataTable<Testimonial>
        columns={testimonialColumns(toggleFeatured, toggleActive, remove)}
        rows={rows}
        rowKey={(t) => t.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No testimonials yet"
        emptyDescription="The homepage testimonials section stays hidden until one is added and active."
        caption="Testimonials with client, quote, rating, featured and visibility status, and available actions."
      />
    </div>
  );
}

/** Column definitions kept outside the component body — they're pure functions of the row plus
 *  the (stable, useCallback-free) action handlers, so there's no reason to rebuild the array
 *  every render via useMemo; the array identity changing on every render costs nothing here
 *  since DataTable doesn't rely on column referential stability. */
function testimonialColumns(
  toggleFeatured: (t: Testimonial) => void,
  toggleActive: (t: Testimonial) => void,
  remove: (id: number) => void,
): Column<Testimonial>[] {
  return [
    {
      key: 'client',
      header: 'Client',
      render: (t) => (
        <>
          <span className="font-medium">{t.client_name}</span>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{t.business_name || '—'}</div>
        </>
      ),
    },
    {
      key: 'quote',
      header: 'Quote',
      className: 'max-w-[320px]',
      render: (t) => <span style={{ color: adminColors.textMuted }}>{t.quote.slice(0, 90)}{t.quote.length > 90 ? '…' : ''}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      wrap: false,
      render: (t) => (t.rating ? (
        <span className="inline-flex items-center gap-0.5" style={{ color: '#f59e0b' }} title={`${t.rating} of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < t.rating! ? '#f59e0b' : 'none'} />)}
        </span>
      ) : <span style={{ color: adminColors.textMuted }}>—</span>),
    },
    {
      key: 'featured',
      header: 'Featured',
      wrap: false,
      render: (t) => (
        <button type="button" onClick={() => toggleFeatured(t)} aria-pressed={!!t.is_featured} aria-label={t.is_featured ? `Unmark "${t.client_name}" as featured` : `Mark "${t.client_name}" as featured`} style={{ color: t.is_featured ? '#f59e0b' : adminColors.textMuted }}>
          <Star size={16} fill={t.is_featured ? '#f59e0b' : 'none'} />
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      wrap: false,
      render: (t) => (
        <button
          type="button"
          onClick={() => toggleActive(t)}
          aria-pressed={!!t.is_active}
          aria-label={t.is_active ? `Hide "${t.client_name}"'s testimonial` : `Show "${t.client_name}"'s testimonial`}
          className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize inline-flex items-center gap-1"
          style={t.is_active ? { background: '#e6f7ef', color: '#1fa971' } : { background: '#f1f3f9', color: adminColors.textMuted }}
        >
          {t.is_active ? <Eye size={12} /> : <EyeOff size={12} />} {t.is_active ? 'Active' : 'Hidden'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      wrap: false,
      render: (t) => (
        <button type="button" onClick={() => remove(t.id)} aria-label={`Delete testimonial from "${t.client_name}"`} style={{ color: adminColors.danger }}><Trash2 size={15} /></button>
      ),
    },
  ];
}
