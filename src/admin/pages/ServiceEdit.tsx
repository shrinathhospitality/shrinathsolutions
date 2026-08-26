import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import type { FaqItem, SeoFields } from '../lib/contentTypes';

type ServiceForm = {
  name: string;
  slug: string;
  category: string;
  hero_label: string;
  h1: string;
  hero_description: string;
  hero_cta_label: string;
  hero_notes: string[];
  featured_image: string;
  icon: string;
  blocksJson: string;
  related: { label: string; to: string }[];
  cta_heading: string;
  cta_body: string;
  display_order: number;
  menu_visibility: boolean;
  status: string;
};

type ServiceSummary = { id: number; name: string; slug: string; category: string | null };

const empty: ServiceForm = {
  name: '', slug: '', category: '', hero_label: '', h1: '', hero_description: '', hero_cta_label: '',
  hero_notes: [], featured_image: '', icon: '', blocksJson: '[]', related: [], cta_heading: '', cta_body: '',
  display_order: 0, menu_visibility: true, status: 'draft',
};

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

export default function ServiceEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<ServiceForm>(empty);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceSummary[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminFetch<{ services: ServiceSummary[] }>('/api/admin/services?per_page=100')
      .then((d) => setCatalogue(d.services))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ service: any; seo: SeoFields | null; faqs: FaqItem[] }>(`/api/admin/services/${id}`)
      .then((d) => {
        setForm({
          name: d.service.name, slug: d.service.slug, category: d.service.category ?? '',
          hero_label: d.service.hero_label ?? '', h1: d.service.h1, hero_description: d.service.hero_description ?? '',
          hero_cta_label: d.service.hero_cta_label ?? '', hero_notes: d.service.hero_notes ?? [],
          featured_image: d.service.featured_image ?? '', icon: d.service.icon ?? '',
          blocksJson: JSON.stringify(d.service.blocks ?? [], null, 2), related: d.service.related ?? [],
          cta_heading: d.service.cta_heading ?? '', cta_body: d.service.cta_body ?? '',
          display_order: d.service.display_order, menu_visibility: d.service.menu_visibility, status: d.service.status,
        });
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
        setFaqs(d.faqs ?? []);
      })
      .catch(() => toast.error('Failed to load service'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function toggleRelated(s: ServiceSummary) {
    const to = `/services/${s.slug}`;
    const exists = form.related.some((r) => r.to === to);
    setForm({
      ...form,
      related: exists ? form.related.filter((r) => r.to !== to) : [...form.related, { label: s.name, to }],
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    let blocks: unknown;
    try {
      blocks = JSON.parse(form.blocksJson);
      if (!Array.isArray(blocks)) throw new Error();
    } catch {
      toast.error('Blocks must be valid JSON array');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: form.name, slug: form.slug, category: form.category || null, hero_label: form.hero_label || null,
      h1: form.h1, hero_description: form.hero_description || null, hero_cta_label: form.hero_cta_label || null,
      hero_notes: form.hero_notes, featured_image: form.featured_image || null, icon: form.icon || null,
      blocks, related: form.related, cta_heading: form.cta_heading || null,
      cta_body: form.cta_body || null, display_order: form.display_order, menu_visibility: form.menu_visibility,
      status: form.status, seo, faqs,
    };

    try {
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/services', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Service created');
        navigate(`/admin/services/${res.id}/edit`, { replace: true });
      } else {
        await adminFetch(`/api/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Saved');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5 max-w-[760px]">
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>Name<input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Slug<input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Category<input style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Hero label<input style={input} value={form.hero_label} onChange={(e) => setForm({ ...form, hero_label: e.target.value })} /></label>
        </div>
        <label className="grid gap-1.5" style={label}>H1<input style={input} value={form.h1} onChange={(e) => setForm({ ...form, h1: e.target.value })} required /></label>
        <label className="grid gap-1.5" style={label}>Hero description<textarea style={{ ...input, resize: 'vertical' }} rows={3} value={form.hero_description} onChange={(e) => setForm({ ...form, hero_description: e.target.value })} /></label>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>
            Featured image URL
            <input style={input} placeholder="uploads/2026/.../file.jpg or https://…" value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} />
          </label>
          <label className="grid gap-1.5" style={label}>
            Icon (emoji or glyph)
            <input style={input} placeholder="◍" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </label>
        </div>
        <p className="text-[12.5px] m-0 -mt-2" style={{ color: adminColors.textMuted }}>
          Copy an image path from the <a href="/admin/media" target="_blank" rel="noreferrer" style={{ color: adminColors.accentBlue }}>Media Library</a>. Used on the service page's About section and hero when set; falls back to a category-based illustration when left blank.
        </p>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>Hero CTA label<input style={input} value={form.hero_cta_label} onChange={(e) => setForm({ ...form, hero_cta_label: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Display order<input type="number" style={input} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></label>
          <label className="grid gap-1.5" style={label}>Status
            <select style={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: adminColors.textPrimary }}>
          <input type="checkbox" checked={form.menu_visibility} onChange={(e) => setForm({ ...form, menu_visibility: e.target.checked })} />
          Show in menus
        </label>
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Content blocks</div>
        <p className="text-[13px] m-0" style={{ color: adminColors.textMuted }}>
          JSON array of section blocks. The premium template maps these onto the page automatically by kind, in this
          order: the first <code>paras</code> block(s) become "About this service", the first <code>cards</code> block
          becomes "What is included" (deliverables), a <code>journey</code> block becomes the optional growth-journey
          strip, a <code>steps</code> block becomes the process timeline, a <code>paras</code> or <code>pills</code>
          block headed "Built for…" / "Who this service is for…" becomes the audience section, a <code>ticks</code>
          block becomes "Outcomes", and a second <code>cards</code> block (ideally headed "Why choose…") becomes the
          advantages grid. Any block that doesn't match still renders further down the page — nothing is ever
          dropped. Leave the <code>journey</code> kind out entirely if you don't want that section to appear.
          Content is sanitized on save.
        </p>
        <textarea style={{ ...input, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} rows={12} value={form.blocksJson} onChange={(e) => setForm({ ...form, blocksJson: e.target.value })} />
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Related services</div>
        <p className="text-[13px] m-0" style={{ color: adminColors.textMuted }}>
          Shown as a compact card grid near the bottom of the page. Only published services should be selected — this
          list is not filtered by status.
        </p>
        <div className="grid gap-1.5 max-h-[260px] overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', display: 'grid' }}>
          {catalogue.filter((s) => s.slug !== form.slug).map((s) => {
            const checked = form.related.some((r) => r.to === `/services/${s.slug}`);
            return (
              <label key={s.id} className="flex items-center gap-2 text-[13.5px] px-2.5 py-1.5 rounded-[8px]" style={{ background: checked ? '#eef0ff' : 'transparent' }}>
                <input type="checkbox" checked={checked} onChange={() => toggleRelated(s)} />
                {s.name}
              </label>
            );
          })}
        </div>
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">CTA</div>
        <label className="grid gap-1.5" style={label}>Heading<input style={input} value={form.cta_heading} onChange={(e) => setForm({ ...form, cta_heading: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Body<input style={input} value={form.cta_body} onChange={(e) => setForm({ ...form, cta_body: e.target.value })} /></label>
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">SEO</div>
        <label className="grid gap-1.5" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Canonical URL<input style={input} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} /></label>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_index ?? true} onChange={(e) => setSeo({ ...seo, robots_index: e.target.checked })} /> Index</label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_follow ?? true} onChange={(e) => setSeo({ ...seo, robots_follow: e.target.checked })} /> Follow</label>
        </div>
      </div>

      <div style={adminCard} className="p-6 grid gap-3">
        <div className="font-heading font-bold text-[15px]">FAQs</div>
        {faqs.map((f, i) => (
          <div key={i} className="grid gap-2 p-3 rounded-[10px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            <input style={input} placeholder="Question" value={f.question} onChange={(e) => setFaqs(faqs.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))} />
            <textarea style={{ ...input, resize: 'vertical' }} rows={2} placeholder="Answer" value={f.answer} onChange={(e) => setFaqs(faqs.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)))} />
            <button type="button" onClick={() => setFaqs(faqs.filter((_, xi) => xi !== i))} className="justify-self-start text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>
          + Add FAQ
        </button>
      </div>

      <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {submitting ? 'Saving…' : isNew ? 'Create service' : 'Save changes'}
      </button>
    </form>
  );
}
