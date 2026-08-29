import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import type { ContentSection, FaqItem, SectionKind, SeoFields } from '../lib/contentTypes';
import { SECTION_KIND_LABELS } from '../lib/contentTypes';
import SeoStudioPanel from '../../features/seo-studio/components/SeoStudioPanel';
import { seoStudioApi, type StoredAnalysis } from '../../features/seo-studio/api';

type Form = {
  title: string; slug: string; primary_keyword: string; target_location: string; search_intent: string;
  h1: string; hero_content: string; cta_heading: string; cta_body: string; status: string; featured_image: string;
};

const empty: Form = { title: '', slug: '', primary_keyword: '', target_location: '', search_intent: '', h1: '', hero_content: '', cta_heading: '', cta_body: '', status: 'draft', featured_image: '' };

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

type PageTab = 'details' | 'content' | 'seo' | 'faqs';
const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'content', label: 'Content' },
  { key: 'seo', label: 'SEO' },
  { key: 'faqs', label: 'FAQs' },
];

function emptyItemFor(kind: SectionKind): any {
  if (kind === 'steps') return { num: '', title: '', body: '' };
  if (kind === 'kv') return { value: '', label: '' };
  return '';
}

function SectionItemsEditor({ section, onChange }: { section: ContentSection; onChange: (s: ContentSection) => void }) {
  const items = section.items ?? [];

  if (section.kind === 'paras' || section.kind === 'ticks') {
    return (
      <div className="grid gap-2">
        {items.map((it: string, i: number) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea style={{ ...input, resize: 'vertical' }} rows={2} value={it} onChange={(e) => onChange({ ...section, items: items.map((x: string, xi: number) => (xi === i ? e.target.value : x)) })} />
            <button type="button" onClick={() => onChange({ ...section, items: items.filter((_: string, xi: number) => xi !== i) })} className="shrink-0 text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...section, items: [...items, ''] })} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add line</button>
      </div>
    );
  }

  if (section.kind === 'steps') {
    return (
      <div className="grid gap-2.5">
        {items.map((it: { num: string; title: string; body: string }, i: number) => (
          <div key={i} className="grid gap-2 p-3 rounded-[10px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: '80px 1fr' }}>
              <input style={input} placeholder="No." value={it.num} onChange={(e) => onChange({ ...section, items: items.map((x, xi) => (xi === i ? { ...x, num: e.target.value } : x)) })} />
              <input style={input} placeholder="Step title" value={it.title} onChange={(e) => onChange({ ...section, items: items.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)) })} />
            </div>
            <textarea style={{ ...input, resize: 'vertical' }} rows={2} placeholder="Step description" value={it.body} onChange={(e) => onChange({ ...section, items: items.map((x, xi) => (xi === i ? { ...x, body: e.target.value } : x)) })} />
            <button type="button" onClick={() => onChange({ ...section, items: items.filter((_, xi) => xi !== i) })} className="justify-self-start text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...section, items: [...items, emptyItemFor('steps')] })} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add step</button>
      </div>
    );
  }

  if (section.kind === 'html') {
    return (
      <textarea
        style={{ ...input, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
        rows={16}
        placeholder="<h2>Heading</h2>&#10;<p>Paragraph…</p>"
        value={section.body ?? ''}
        onChange={(e) => onChange({ ...section, body: e.target.value })}
      />
    );
  }

  if (section.kind === 'kv' || section.kind === 'testimonial') {
    return (
      <div className="grid gap-2">
        {section.kind === 'testimonial' && (
          <>
            <input style={input} placeholder="Company / project name (shown as “Success Story: …”)" value={section.meta?.company ?? ''} onChange={(e) => onChange({ ...section, meta: { ...section.meta, company: e.target.value } })} />
            <textarea style={{ ...input, resize: 'vertical' }} rows={2} placeholder="Quote" value={section.body ?? ''} onChange={(e) => onChange({ ...section, body: e.target.value })} />
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input style={input} placeholder="Person name" value={section.meta?.name ?? ''} onChange={(e) => onChange({ ...section, meta: { ...section.meta, name: e.target.value } })} />
              <input style={input} placeholder="Role / company" value={section.meta?.role ?? ''} onChange={(e) => onChange({ ...section, meta: { ...section.meta, role: e.target.value } })} />
            </div>
            <div style={{ ...label, marginTop: 4 }}>Stat numbers</div>
          </>
        )}
        {items.map((it: { value: string; label: string }, i: number) => (
          <div key={i} className="flex gap-2 items-start">
            <input style={{ ...input, maxWidth: 120 }} placeholder="Value" value={it.value} onChange={(e) => onChange({ ...section, items: items.map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)) })} />
            <input style={input} placeholder="Label" value={it.label} onChange={(e) => onChange({ ...section, items: items.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)) })} />
            <button type="button" onClick={() => onChange({ ...section, items: items.filter((_, xi) => xi !== i) })} className="shrink-0 text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...section, items: [...items, emptyItemFor('kv')] })} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add stat</button>
      </div>
    );
  }

  return null;
}

export default function SeoPageEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(empty);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [preserved, setPreserved] = useState<{ internal_links: any[]; related_services: any[]; breadcrumb: any[] }>({ internal_links: [], related_services: [], breadcrumb: [] });
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
    adminFetch<{ page: any; seo: SeoFields | null; faqs: FaqItem[] }>(`/api/admin/seo-pages/${id}`)
      .then((d) => {
        setForm({
          title: d.page.title, slug: d.page.slug, primary_keyword: d.page.primary_keyword ?? '',
          target_location: d.page.target_location ?? '', search_intent: d.page.search_intent ?? '',
          h1: d.page.h1, hero_content: d.page.hero_content ?? '', cta_heading: d.page.cta_heading ?? '',
          cta_body: d.page.cta_body ?? '', status: d.page.status, featured_image: d.page.featured_image ?? '',
        });
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
        setFaqs(d.faqs ?? []);
        setSections(d.page.content_sections ?? []);
        setPreserved({
          internal_links: d.page.internal_links ?? [],
          related_services: d.page.related_services ?? [],
          breadcrumb: d.page.breadcrumb ?? [],
        });
      })
      .catch(() => toast.error('Failed to load page'))
      .finally(() => setLoading(false));

    seoStudioApi.contentDetail('seo_page', Number(id)).then((d) => {
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
    const payload = { ...form, primary_keyword: form.primary_keyword || null, target_location: form.target_location || null, search_intent: form.search_intent || null, hero_content: form.hero_content || null, cta_heading: form.cta_heading || null, cta_body: form.cta_body || null, seo, faqs, content_sections: sections, ...preserved };

    try {
      let savedId = contentId;
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/seo-pages', { method: 'POST', body: JSON.stringify(payload) });
        savedId = res.id;
        setContentId(res.id);
        toast.success('Page created');
        navigate(`/admin/seo-pages/${res.id}/edit`, { replace: true });
      } else {
        await adminFetch(`/api/admin/seo-pages/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Saved');
      }

      if (savedId) {
        const seoStudioResult = await seoStudioApi.saveContent('seo_page', savedId, {
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
            {t.key === 'faqs' && faqs.length > 0 ? ` (${faqs.length})` : ''}
          </button>
        ))}
      </div>

      {pageTab === 'details' && (
      <>
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="grid gap-1.5" style={label}>Title<input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Slug<input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label className="grid gap-1.5" style={label}>Primary keyword<input style={input} value={form.primary_keyword} onChange={(e) => setForm({ ...form, primary_keyword: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Target location<input style={input} value={form.target_location} onChange={(e) => setForm({ ...form, target_location: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Search intent<input style={input} value={form.search_intent} onChange={(e) => setForm({ ...form, search_intent: e.target.value })} /></label>
          <label className="grid gap-1.5" style={label}>Status
            <select style={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1.5" style={label}>H1<input style={input} value={form.h1} onChange={(e) => setForm({ ...form, h1: e.target.value })} required /></label>
        <label className="grid gap-1.5" style={label}>Hero content<textarea style={{ ...input, resize: 'vertical' }} rows={4} value={form.hero_content} onChange={(e) => setForm({ ...form, hero_content: e.target.value })} /></label>
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

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">CTA</div>
        <label className="grid gap-1.5" style={label}>Heading<input style={input} value={form.cta_heading} onChange={(e) => setForm({ ...form, cta_heading: e.target.value })} /></label>
        <label className="grid gap-1.5" style={label}>Body<input style={input} value={form.cta_body} onChange={(e) => setForm({ ...form, cta_body: e.target.value })} /></label>
      </div>
      </>
      )}

      {pageTab === 'content' && (
      <>
      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Content sections</div>
        {sections.map((s, i) => (
          <div key={i} className="grid gap-2.5 p-4 rounded-[12px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 200px' }}>
              <input style={input} placeholder="Section heading" value={s.heading} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, heading: e.target.value } : x)))} />
              <select style={input} value={s.kind} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, kind: e.target.value as SectionKind, items: [] } : x)))}>
                {Object.entries(SECTION_KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            {(s.kind === 'ticks') && (
              <input style={input} placeholder="Intro line above the checklist (optional)" value={s.body ?? ''} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, body: e.target.value } : x)))} />
            )}
            <SectionItemsEditor section={s} onChange={(next) => setSections(sections.map((x, xi) => (xi === i ? next : x)))} />
            <button type="button" onClick={() => setSections(sections.filter((_, xi) => xi !== i))} className="justify-self-start text-[13px]" style={{ color: adminColors.danger }}>Remove section</button>
          </div>
        ))}
        <button type="button" onClick={() => setSections([...sections, { kind: 'paras', heading: '', items: [] }])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>
          + Add section
        </button>
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
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_index ?? true} onChange={(e) => setSeo({ ...seo, robots_index: e.target.checked })} /> Index</label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_follow ?? true} onChange={(e) => setSeo({ ...seo, robots_follow: e.target.checked })} /> Follow</label>
        </div>
      </div>

      <SeoStudioPanel
        contentType="seo_page" contentId={contentId} seo={seo} slug={form.slug} h1={form.h1}
        introText={form.hero_content} blocks={sections}
        pageType="location_seo_page" publicUrl={`/${form.slug}`}
        keyphrase={keyphrase} onKeyphraseChange={setKeyphrase}
        relatedKeyphrases={relatedKeyphrases} onRelatedKeyphrasesChange={setRelatedKeyphrases}
        language={language} onLanguageChange={setLanguage}
        isCornerstone={isCornerstone} onCornerstoneChange={setIsCornerstone}
        storedAnalysis={storedAnalysis}
      />
      </>
      )}

      {pageTab === 'faqs' && (
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
      )}

      <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {submitting ? 'Saving…' : isNew ? 'Create page' : 'Save changes'}
      </button>
    </form>
  );
}
