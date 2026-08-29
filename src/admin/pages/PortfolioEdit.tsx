import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import RichTextEditor from '../components/RichTextEditor';
import type { SeoFields } from '../lib/contentTypes';
import SeoStudioPanel from '../../features/seo-studio/components/SeoStudioPanel';
import { seoStudioApi, type StoredAnalysis } from '../../features/seo-studio/api';

type Form = {
  title: string; slug: string; category: string; client_name: string; short_description: string;
  detailed_description: string; services_provided: string; technologies_used: string; project_url: string;
  display_order: number; is_featured: boolean; cta_heading: string; cta_body: string; status: string; featured_image: string;
};

const empty: Form = {
  title: '', slug: '', category: '', client_name: '', short_description: '', detailed_description: '',
  services_provided: '', technologies_used: '', project_url: '', display_order: 0, is_featured: false,
  cta_heading: '', cta_body: '', status: 'draft', featured_image: '',
};

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

type PageTab = 'details' | 'content' | 'seo';
const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'content', label: 'Content' },
  { key: 'seo', label: 'SEO' },
];

export default function PortfolioEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(empty);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [keyphrase, setKeyphrase] = useState('');
  const [relatedKeyphrases, setRelatedKeyphrases] = useState<string[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [isCornerstone, setIsCornerstone] = useState(false);
  const [storedAnalysis, setStoredAnalysis] = useState<StoredAnalysis>(null);
  const [contentId, setContentId] = useState<number | null>(isNew ? null : Number(id));
  const [pageTab, setPageTab] = useState<PageTab>('details');

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ project: any; seo: SeoFields | null }>(`/api/admin/portfolio/${id}`)
      .then((d) => {
        setForm({
          title: d.project.title, slug: d.project.slug, category: d.project.category ?? '',
          client_name: d.project.client_name ?? '', short_description: d.project.short_description ?? '',
          detailed_description: d.project.detailed_description ?? '',
          services_provided: (d.project.services_provided ?? []).join(', '),
          technologies_used: (d.project.technologies_used ?? []).join(', '),
          project_url: d.project.project_url ?? '', display_order: d.project.display_order,
          is_featured: d.project.is_featured, cta_heading: d.project.cta_heading ?? '', cta_body: d.project.cta_body ?? '',
          status: d.project.status, featured_image: d.project.featured_image ?? '',
        });
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
      })
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));

    seoStudioApi.contentDetail('portfolio_project', Number(id)).then((d) => {
      setStoredAnalysis(d.analysis);
      if (d.analysis) {
        setKeyphrase(d.analysis.primary_keyphrase ?? '');
        setRelatedKeyphrases(d.analysis.related_keyphrases ?? []);
        setLanguage((d.analysis.language as 'en' | 'hi') ?? 'en');
        setIsCornerstone(d.analysis.is_cornerstone);
      }
    }).catch(() => {});
  }, [id, isNew]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title, slug: form.slug, category: form.category || null, client_name: form.client_name || null,
      short_description: form.short_description || null, detailed_description: form.detailed_description || null,
      services_provided: form.services_provided.split(',').map((s) => s.trim()).filter(Boolean),
      technologies_used: form.technologies_used.split(',').map((s) => s.trim()).filter(Boolean),
      project_url: form.project_url || null, display_order: form.display_order, is_featured: form.is_featured,
      cta_heading: form.cta_heading || null, cta_body: form.cta_body || null, status: form.status,
      featured_image: form.featured_image || null, seo,
    };

    try {
      let savedId = contentId;
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/portfolio', { method: 'POST', body: JSON.stringify(payload) });
        savedId = res.id;
        setContentId(res.id);
        toast.success('Project created');
        navigate(`/admin/portfolio/${res.id}/edit`, { replace: true });
      } else {
        await adminFetch(`/api/admin/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Saved');
      }

      if (savedId) {
        const seoStudioResult = await seoStudioApi.saveContent('portfolio_project', savedId, {
          seo, primary_keyphrase: keyphrase, related_keyphrases: relatedKeyphrases, language, is_cornerstone: isCornerstone,
        });
        setStoredAnalysis(seoStudioResult.analysis);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5 w-full">
      <div className="flex gap-1 border-b sticky top-0 z-10" style={{ borderColor: adminColors.cardBorder, background: adminColors.contentBg }}>
        {PAGE_TABS.map((t) => (
          <button
            key={t.key} type="button" onClick={() => setPageTab(t.key)}
            className="px-4 py-2.5 text-[13.5px] font-semibold -mb-px"
            style={{ borderBottom: pageTab === t.key ? `2px solid ${adminColors.accentBlue}` : '2px solid transparent', color: pageTab === t.key ? adminColors.accentBlue : adminColors.textMuted }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === 'details' && (
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>Title<input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Slug<input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Category<input style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Client name<input style={input} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Project URL<input style={input} value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Display order<input type="number" style={input} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></label>
          <label className="grid gap-1.5" style={label}>Services provided (comma separated)<input style={input} value={form.services_provided} onChange={(e) => setForm({ ...form, services_provided: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Technologies used (comma separated)<input style={input} value={form.technologies_used} onChange={(e) => setForm({ ...form, technologies_used: e.target.value })} /></label>
        </div>
        <label className="grid gap-1.5" style={label}>Short description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></label>
        <div className="flex items-center gap-5">
          <label className="grid gap-1.5" style={label}>Status
            <select style={{ ...input, maxWidth: 200 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold mt-5">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Featured project
          </label>
        </div>
        <label className="grid gap-1.5" style={label}>
          Featured image
          <input style={input} placeholder="uploads/2026/.../file.jpg or https://…" value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} />
        </label>
        {form.featured_image && (
          <img src={form.featured_image.startsWith('http') ? form.featured_image : `/api/${form.featured_image.replace(/^\//, '')}`} alt="Featured" className="rounded-[10px] max-h-[160px] object-cover justify-self-start" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <p className="text-[12.5px] m-0 -mt-2" style={{ color: adminColors.textMuted }}>
          Copy an image path from the <a href="/admin/media" target="_blank" rel="noreferrer" style={{ color: adminColors.accentBlue }}>Media Library</a>.
        </p>
      </div>
      )}

      {pageTab === 'content' && (
      <>
      <div style={adminCard} className="p-6 grid gap-3">
        <div className="font-heading font-bold text-[15px]">Detailed description</div>
        <RichTextEditor value={form.detailed_description} onChange={(html) => setForm({ ...form, detailed_description: html })} />
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">CTA</div>
        <label className="grid gap-1.5" style={label}>Heading<input style={input} value={form.cta_heading} onChange={(e) => setForm({ ...form, cta_heading: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Body<input style={input} value={form.cta_body} onChange={(e) => setForm({ ...form, cta_body: e.target.value })} /></label>
      </div>
      </>
      )}

      {pageTab === 'seo' && (
      <>
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">SEO</div>
        <label className="grid gap-1.5" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Canonical URL<input style={input} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} /></label>
      </div>

      <SeoStudioPanel
        contentType="portfolio_project" contentId={contentId} seo={seo} slug={form.slug} h1={form.title}
        introText={form.short_description} bodyHtml={form.detailed_description}
        pageType="portfolio" publicUrl={`/portfolio/${form.slug}`}
        keyphrase={keyphrase} onKeyphraseChange={setKeyphrase}
        relatedKeyphrases={relatedKeyphrases} onRelatedKeyphrasesChange={setRelatedKeyphrases}
        language={language} onLanguageChange={setLanguage}
        isCornerstone={isCornerstone} onCornerstoneChange={setIsCornerstone}
        storedAnalysis={storedAnalysis}
      />
      </>
      )}

      <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {submitting ? 'Saving…' : isNew ? 'Create project' : 'Save changes'}
      </button>
    </form>
  );
}
