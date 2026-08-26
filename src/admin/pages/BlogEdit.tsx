import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import RichTextEditor from '../components/RichTextEditor';
import type { FaqItem, SeoFields } from '../lib/contentTypes';

type Form = {
  title: string; slug: string; excerpt: string; content: string; author_name: string;
  category: string; tags: string; reading_time_minutes: string; status: string;
};

const empty: Form = { title: '', slug: '', excerpt: '', content: '', author_name: '', category: '', tags: '', reading_time_minutes: '', status: 'draft' };
const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

export default function BlogEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(empty);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ post: any; seo: SeoFields | null; faqs: FaqItem[] }>(`/api/admin/blog/${id}`)
      .then((d) => {
        setForm({
          title: d.post.title, slug: d.post.slug, excerpt: d.post.excerpt ?? '', content: d.post.content ?? '',
          author_name: d.post.author_name ?? '', category: d.post.category_name ?? '',
          tags: (d.post.tags ?? []).map((t: any) => t.name).join(', '), reading_time_minutes: String(d.post.reading_time_minutes ?? ''),
          status: d.post.status,
        });
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
        setFaqs(d.faqs ?? []);
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title, slug: form.slug, excerpt: form.excerpt || null, content: form.content || null,
      author_name: form.author_name || null, category: form.category || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      reading_time_minutes: form.reading_time_minutes ? Number(form.reading_time_minutes) : null,
      status: form.status, seo, faqs,
    };

    try {
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/blog', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Post created');
        navigate(`/admin/blog/${res.id}/edit`, { replace: true });
      } else {
        await adminFetch(`/api/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
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
          <label className="grid gap-1.5" style={label}>Title<input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Slug<input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Category<input style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Author<input style={input} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Tags (comma separated)<input style={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Reading time (minutes)<input type="number" style={input} value={form.reading_time_minutes} onChange={(e) => setForm({ ...form, reading_time_minutes: e.target.value })} placeholder="auto-estimated if left blank" /></label>
        </div>
        <label className="grid gap-1.5" style={label}>Excerpt<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Status
          <select style={{ ...input, maxWidth: 220 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div style={adminCard} className="p-6 grid gap-3">
        <div className="font-heading font-bold text-[15px]">Content</div>
        <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} />
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">SEO</div>
        <label className="grid gap-1.5" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Canonical URL<input style={input} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} /></label>
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
        {submitting ? 'Saving…' : isNew ? 'Create post' : 'Save changes'}
      </button>
    </form>
  );
}
