import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import type { SeoFields } from '../lib/contentTypes';
import { PAGE_SECTION_TYPES } from '../lib/pageSectionTypes';

type Form = { title: string; slug: string; template: string; status: string; sectionsJson: string };

const empty: Form = { title: '', slug: '', template: '', status: 'draft', sectionsJson: '[]' };
const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

export default function PageEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(empty);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ page: any; sections: any[]; seo: SeoFields | null }>(`/api/admin/pages/${id}`)
      .then((d) => {
        setForm({
          title: d.page.title, slug: d.page.slug, template: d.page.template ?? '', status: d.page.status,
          sectionsJson: JSON.stringify(d.sections.map((s) => ({ section_type: s.section_type, content: s.content, is_visible: s.is_visible })), null, 2),
        });
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
      })
      .catch(() => toast.error('Failed to load page'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    let sections: unknown;
    try {
      sections = JSON.parse(form.sectionsJson);
      if (!Array.isArray(sections)) throw new Error();
    } catch {
      toast.error('Sections must be a valid JSON array');
      return;
    }

    setSubmitting(true);
    const payload = { title: form.title, slug: form.slug, template: form.template || null, status: form.status, sections, seo };

    try {
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/pages', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Page created');
        navigate(`/admin/pages/${res.id}/edit`, { replace: true });
      } else {
        await adminFetch(`/api/admin/pages/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
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
    <form onSubmit={onSubmit} className="grid gap-5 max-w-[720px]">
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>Title<input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Slug<input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Template<input style={input} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Status
            <select style={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Sections</div>
        <p className="text-[13px] m-0" style={{ color: adminColors.textMuted }}>
          JSON array of <code>{'{ section_type, content, is_visible }'}</code>. Allowed types: {PAGE_SECTION_TYPES.join(', ')}. Order = array order. Content is sanitized on save; unknown types are dropped.
        </p>
        <textarea style={{ ...input, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} rows={14} value={form.sectionsJson} onChange={(e) => setForm({ ...form, sectionsJson: e.target.value })} />
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">SEO</div>
        <label className="grid gap-1.5" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Canonical URL<input style={input} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} /></label>
      </div>

      <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {submitting ? 'Saving…' : isNew ? 'Create page' : 'Save changes'}
      </button>
    </form>
  );
}
