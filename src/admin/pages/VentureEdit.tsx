import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import type { SeoFields } from '../lib/contentTypes';
import SeoStudioPanel from '../../features/seo-studio/components/SeoStudioPanel';
import { seoStudioApi, type StoredAnalysis } from '../../features/seo-studio/api';
import { useAuth } from '../context/AuthContext';

type VentureService = { title: string; description: string; icon: string; is_active?: boolean };
type VentureSection = { heading: string; subheading?: string; body_html: string; is_visible?: boolean };
type VentureMedia = { media_url: string; media_role: string; alt_text?: string; caption?: string; is_visible?: boolean };
type VentureFaq = { question: string; answer: string };

type Form = {
  name: string; short_name: string; slug: string; tagline: string; category: string; summary: string;
  status: 'draft' | 'published' | 'archived'; sort_order: number; is_featured: boolean;
  layout_variant: string;
  primary_color: string; secondary_color: string; accent_color: string; background_color: string;
  surface_color: string; text_color: string; muted_color: string; on_primary_color: string;
  logo_image: string; hero_image: string;
  phone_numbers: string[]; email: string; website_url: string; google_business_url: string;
  cta_label: string; cta_url: string;
  updated_at?: string;
};

const empty: Form = {
  name: '', short_name: '', slug: '', tagline: '', category: '', summary: '',
  status: 'draft', sort_order: 0, is_featured: false,
  layout_variant: 'heritage-craft',
  primary_color: '#1e293b', secondary_color: '#334155', accent_color: '#c9a24b',
  background_color: '#ffffff', surface_color: '#f7f8fb', text_color: '#151a2e', muted_color: '#565f78', on_primary_color: '#ffffff',
  logo_image: '', hero_image: '',
  phone_numbers: [''], email: '', website_url: '', google_business_url: '', cta_label: '', cta_url: '',
};

const LAYOUT_VARIANTS = [
  { value: 'heritage-craft', label: 'Heritage Craft (Shrinath Rubber Stamp style)' },
  { value: 'technical-grid', label: 'Technical Grid (Shrinath Enterprise style)' },
  { value: 'cinematic-desert', label: 'Cinematic Desert (Shrinath Desert Camp style)' },
  { value: 'route-planner', label: 'Route Planner (Shrinath Adventures style)' },
  { value: 'b2b-trade', label: 'B2B Trade (Sam Sand Dunes DMC style)' },
  { value: 'portfolio-management', label: 'Portfolio Management (Shrinath Hospitality style)' },
  { value: 'offbeat-expedition', label: 'Offbeat Expedition (Jaisalmer Adventures style)' },
  { value: 'directory-portal', label: 'Directory Portal (My Jaisalmer style)' },
  { value: 'editorial-guide', label: 'Editorial Guide (Welcome to Jaisalmer style)' },
];

const CATEGORIES = ['Legacy Business', 'Technology & Security', 'Hospitality', 'Travel & Experiences', 'Local Digital Platforms'];

type PageTab = 'overview' | 'contact' | 'services' | 'sections' | 'highlights' | 'faqs' | 'design' | 'seo' | 'publishing' | 'history';
const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'contact', label: 'Contact' },
  { key: 'services', label: 'Services' },
  { key: 'sections', label: 'Sections' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'design', label: 'Design' },
  { key: 'seo', label: 'SEO Studio' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'history', label: 'History' },
];

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%' };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };
const colorInput: React.CSSProperties = { width: 44, height: 36, padding: 2, borderRadius: 8, border: `1px solid ${adminColors.cardBorder}`, cursor: 'pointer' };

function isValidHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

export default function VentureEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { ventureCapabilities } = useAuth();
  const canEditContact = ventureCapabilities?.includes('ventures.edit_contact') ?? false;
  const canEditTheme = ventureCapabilities?.includes('ventures.edit_theme') ?? false;
  const canPublish = ventureCapabilities?.includes('ventures.publish') ?? false;

  const [form, setForm] = useState<Form>(empty);
  const [services, setServices] = useState<VentureService[]>([]);
  const [sections, setSections] = useState<VentureSection[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<VentureFaq[]>([]);
  const [media, setMedia] = useState<VentureMedia[]>([]);
  const [seo, setSeo] = useState<SeoFields>({ robots_index: true, robots_follow: true });
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [pageTab, setPageTab] = useState<PageTab>('overview');
  const [keyphrase, setKeyphrase] = useState('');
  const [relatedKeyphrases, setRelatedKeyphrases] = useState<string[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [isCornerstone, setIsCornerstone] = useState(false);
  const [storedAnalysis, setStoredAnalysis] = useState<StoredAnalysis>(null);
  const [contentId, setContentId] = useState<number | null>(isNew ? null : Number(id));
  const [history, setHistory] = useState<{ action: string; description: string | null; created_at: string; admin_username: string | null }[]>([]);
  const [publishPreview, setPublishPreview] = useState(false);

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ venture: any; seo: SeoFields | null; faqs: VentureFaq[] }>(`/api/admin/ventures/${id}`)
      .then((d) => {
        const v = d.venture;
        setForm({
          name: v.name, short_name: v.short_name ?? '', slug: v.slug, tagline: v.tagline, category: v.category,
          summary: v.summary, status: v.status, sort_order: v.sort_order, is_featured: v.is_featured,
          layout_variant: v.layout_variant,
          primary_color: v.primary_color, secondary_color: v.secondary_color, accent_color: v.accent_color,
          background_color: v.background_color, surface_color: v.surface_color, text_color: v.text_color,
          muted_color: v.muted_color, on_primary_color: v.on_primary_color,
          logo_image: v.logo_image ?? '', hero_image: v.hero_image ?? '',
          phone_numbers: v.phone_numbers?.length ? v.phone_numbers : [''],
          email: v.email ?? '', website_url: v.website_url ?? '', google_business_url: v.google_business_url ?? '',
          cta_label: v.cta_label ?? '', cta_url: v.cta_url ?? '',
          updated_at: v.updated_at,
        });
        setServices(v.services?.length ? v.services : []);
        setSections((v.sections ?? []).map((s: any) => ({ heading: s.heading, subheading: s.subheading ?? '', body_html: s.body_html ?? '', is_visible: s.is_visible })));
        setHighlights((v.highlights ?? []).map((h: any) => h.highlight_text));
        setMedia(v.media ?? []);
        setFaqs(d.faqs ?? []);
        setSeo(d.seo ?? { robots_index: true, robots_follow: true });
      })
      .catch(() => toast.error('Failed to load venture'))
      .finally(() => setLoading(false));

    seoStudioApi.contentDetail('venture', Number(id)).then((d) => {
      setStoredAnalysis(d.analysis);
      if (d.analysis) {
        setKeyphrase(d.analysis.primary_keyphrase ?? '');
        setRelatedKeyphrases(d.analysis.related_keyphrases ?? []);
        setLanguage((d.analysis.language as 'en' | 'hi') ?? 'en');
        setIsCornerstone(d.analysis.is_cornerstone);
      }
    }).catch(() => {});
  }, [id, isNew]);

  useEffect(() => {
    if (isNew || pageTab !== 'history') return;
    adminFetch<{ history: typeof history }>(`/api/admin/ventures/${id}/history`).then((d) => setHistory(d.history)).catch(() => {});
  }, [id, isNew, pageTab]);

  function buildPayload(statusOverride?: Form['status']) {
    return {
      ...form,
      status: statusOverride ?? form.status,
      phone_numbers: form.phone_numbers.map((p) => p.trim()).filter(Boolean),
      services, sections, highlights, media, faqs, seo,
      expected_updated_at: form.updated_at,
    };
  }

  async function save(statusOverride?: Form['status']) {
    setSubmitting(true);
    const payload = buildPayload(statusOverride);
    try {
      let savedId = contentId;
      if (isNew) {
        const res = await adminFetch<{ id: number }>('/api/admin/ventures', { method: 'POST', body: JSON.stringify(payload) });
        savedId = res.id;
        setContentId(res.id);
        toast.success('Venture created');
        navigate(`/admin/ventures/${res.id}/edit`, { replace: true });
      } else {
        const res = await adminFetch<{ slug_changed?: boolean; old_slug?: string; new_slug?: string }>(`/api/admin/ventures/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Saved');
        if (res.slug_changed) {
          toast(
            `Slug changed from /our-ventures/${res.old_slug} to /our-ventures/${res.new_slug}. A 301 redirect was NOT created automatically — set one up in Redirects if needed.`,
            { duration: 8000, icon: '⚠️' },
          );
        }
      }

      if (savedId) {
        const seoStudioResult = await seoStudioApi.saveContent('venture', savedId, {
          seo, primary_keyphrase: keyphrase, related_keyphrases: relatedKeyphrases, language, is_cornerstone: isCornerstone,
        });
        setStoredAnalysis(seoStudioResult.analysis);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('This venture was changed by someone else since you loaded it. Reload the page and reapply your edits.', { duration: 8000 });
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to save');
      }
    } finally {
      setSubmitting(false);
      setPublishPreview(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save();
  }

  function requestPublish() {
    if (!form.name || !form.slug || !form.summary) {
      toast.error('Name, slug and summary are required before publishing.');
      return;
    }
    setPublishPreview(true);
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5 w-full">
      <div className="flex gap-1 border-b sticky top-0 z-10 overflow-x-auto" style={{ borderColor: adminColors.cardBorder, background: adminColors.contentBg }}>
        {PAGE_TABS.map((t) => (
          <button
            key={t.key} type="button" onClick={() => setPageTab(t.key)}
            className="px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap -mb-px"
            style={{ borderBottom: pageTab === t.key ? `2px solid ${adminColors.accentBlue}` : '2px solid transparent', color: pageTab === t.key ? adminColors.accentBlue : adminColors.textMuted }}
          >
            {t.label}
            {t.key === 'faqs' && faqs.length > 0 ? ` (${faqs.length})` : ''}
            {t.key === 'services' && services.length > 0 ? ` (${services.length})` : ''}
            {t.key === 'sections' && sections.length > 0 ? ` (${sections.length})` : ''}
          </button>
        ))}
      </div>

      {pageTab === 'overview' && (
        <div style={adminCard} className="p-6 grid gap-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="grid gap-1.5" style={label}>Venture name<input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="grid gap-1.5" style={label}>Short name<input style={input} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></label>
          </div>
          <label className="grid gap-1.5" style={label}>
            Slug
            <input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required />
          </label>
          <p className="text-[12.5px] m-0 -mt-2" style={{ color: adminColors.textMuted }}>
            Public URL: <strong>/our-ventures/{form.slug || '{slug}'}</strong>
          </p>
          <label className="grid gap-1.5" style={label}>Tagline<input style={input} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} required /></label>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="grid gap-1.5" style={label}>
              Category
              <select style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                {form.category && !CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
              </select>
            </label>
            <label className="grid gap-1.5" style={label}>Display order<input type="number" style={input} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></label>
          </div>
          <label className="grid gap-1.5" style={label}>Summary<textarea style={{ ...input, resize: 'vertical' }} rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required /></label>
          <label className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: adminColors.textPrimary }}>
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Featured venture
          </label>
        </div>
      )}

      {pageTab === 'contact' && (
        <div style={adminCard} className="p-6 grid gap-4">
          {!canEditContact && (
            <p className="text-[12.5px] m-0 px-3 py-2 rounded-[8px]" style={{ background: '#fdf3d8', color: '#9a6700' }}>
              Your account can view but not change contact details — this requires the "edit contact" permission.
            </p>
          )}
          <fieldset disabled={!canEditContact} className="grid gap-4">
            <label className="grid gap-1.5" style={label}>
              Phone numbers
              <div className="grid gap-2">
                {form.phone_numbers.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input style={input} value={p} onChange={(e) => setForm({ ...form, phone_numbers: form.phone_numbers.map((x, xi) => (xi === i ? e.target.value : x)) })} placeholder="9414319897" />
                    <button type="button" onClick={() => setForm({ ...form, phone_numbers: form.phone_numbers.filter((_, xi) => xi !== i) })} className="px-3 text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, phone_numbers: [...form.phone_numbers, ''] })} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add phone number</button>
              </div>
            </label>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="grid gap-1.5" style={label}>Email<input type="email" style={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="grid gap-1.5" style={label}>Official website<input style={input} value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" /></label>
            </div>
            <label className="grid gap-1.5" style={label}>Google Business / Directions URL<input style={input} value={form.google_business_url} onChange={(e) => setForm({ ...form, google_business_url: e.target.value })} placeholder="https://…" /></label>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="grid gap-1.5" style={label}>CTA label<input style={input} value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Get in touch" /></label>
              <label className="grid gap-1.5" style={label}>CTA URL<input style={input} value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://… or tel:…" /></label>
            </div>
          </fieldset>
        </div>
      )}

      {pageTab === 'services' && (
        <div style={adminCard} className="p-6 grid gap-3">
          <div className="font-heading font-bold text-[15px]">Services ({services.length}/20)</div>
          {services.map((s, i) => (
            <div key={i} className="grid gap-2 p-3 rounded-[10px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              <div className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <input style={input} placeholder="Title" value={s.title} onChange={(e) => setServices(services.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))} />
                <input style={input} placeholder="Icon (lucide name)" value={s.icon} onChange={(e) => setServices(services.map((x, xi) => (xi === i ? { ...x, icon: e.target.value } : x)))} />
              </div>
              <textarea style={{ ...input, resize: 'vertical' }} rows={2} placeholder="Description" value={s.description} onChange={(e) => setServices(services.map((x, xi) => (xi === i ? { ...x, description: e.target.value } : x)))} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={s.is_active !== false} onChange={(e) => setServices(services.map((x, xi) => (xi === i ? { ...x, is_active: e.target.checked } : x)))} /> Active
                </label>
                <div className="flex gap-2">
                  <button type="button" disabled={i === 0} onClick={() => { const n = [...services]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setServices(n); }} className="text-[12.5px]" style={{ color: adminColors.textMuted }}>↑</button>
                  <button type="button" disabled={i === services.length - 1} onClick={() => { const n = [...services]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setServices(n); }} className="text-[12.5px]" style={{ color: adminColors.textMuted }}>↓</button>
                  <button type="button" onClick={() => setServices(services.filter((_, xi) => xi !== i))} className="text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          {services.length < 20 && (
            <button type="button" onClick={() => setServices([...services, { title: '', description: '', icon: '', is_active: true }])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add service</button>
          )}
        </div>
      )}

      {pageTab === 'sections' && (
        <div style={adminCard} className="p-6 grid gap-3">
          <div className="font-heading font-bold text-[15px]">Content sections ({sections.length}/20)</div>
          {sections.map((s, i) => (
            <div key={i} className="grid gap-2 p-3 rounded-[10px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              <input style={input} placeholder="Heading" value={s.heading} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, heading: e.target.value } : x)))} />
              <textarea style={{ ...input, resize: 'vertical' }} rows={4} placeholder="Body (plain text or simple HTML)" value={s.body_html} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, body_html: e.target.value } : x)))} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={s.is_visible !== false} onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, is_visible: e.target.checked } : x)))} /> Visible
                </label>
                <div className="flex gap-2">
                  <button type="button" disabled={i === 0} onClick={() => { const n = [...sections]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setSections(n); }} className="text-[12.5px]" style={{ color: adminColors.textMuted }}>↑</button>
                  <button type="button" disabled={i === sections.length - 1} onClick={() => { const n = [...sections]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setSections(n); }} className="text-[12.5px]" style={{ color: adminColors.textMuted }}>↓</button>
                  <button type="button" onClick={() => setSections(sections.filter((_, xi) => xi !== i))} className="text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          {sections.length < 20 && (
            <button type="button" onClick={() => setSections([...sections, { heading: '', body_html: '', is_visible: true }])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add section</button>
          )}
        </div>
      )}

      {pageTab === 'highlights' && (
        <div style={adminCard} className="p-6 grid gap-3">
          <div className="font-heading font-bold text-[15px]">Highlights ({highlights.length}/20)</div>
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input style={input} value={h} onChange={(e) => setHighlights(highlights.map((x, xi) => (xi === i ? e.target.value : x)))} />
              <button type="button" disabled={i === 0} onClick={() => { const n = [...highlights]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setHighlights(n); }} className="px-2 text-[12.5px]" style={{ color: adminColors.textMuted }}>↑</button>
              <button type="button" disabled={i === highlights.length - 1} onClick={() => { const n = [...highlights]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setHighlights(n); }} className="px-2 text-[12.5px]" style={{ color: adminColors.textMuted }}>↓</button>
              <button type="button" onClick={() => setHighlights(highlights.filter((_, xi) => xi !== i))} className="px-3 text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
            </div>
          ))}
          {highlights.length < 20 && (
            <button type="button" onClick={() => setHighlights([...highlights, ''])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add highlight</button>
          )}
        </div>
      )}

      {pageTab === 'faqs' && (
        <div style={adminCard} className="p-6 grid gap-3">
          <div className="font-heading font-bold text-[15px]">FAQs</div>
          <p className="text-[12.5px] m-0" style={{ color: adminColors.textMuted }}>FAQ schema is generated only from visible FAQs with both a question and an answer filled in.</p>
          {faqs.map((f, i) => (
            <div key={i} className="grid gap-2 p-3 rounded-[10px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              <input style={input} placeholder="Question" value={f.question} onChange={(e) => setFaqs(faqs.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))} />
              <textarea style={{ ...input, resize: 'vertical' }} rows={2} placeholder="Answer" value={f.answer} onChange={(e) => setFaqs(faqs.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)))} />
              <button type="button" onClick={() => setFaqs(faqs.filter((_, xi) => xi !== i))} className="justify-self-start text-[13px]" style={{ color: adminColors.danger }}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>+ Add FAQ</button>
        </div>
      )}

      {pageTab === 'design' && (
        <div style={adminCard} className="p-6 grid gap-4">
          {!canEditTheme && (
            <p className="text-[12.5px] m-0 px-3 py-2 rounded-[8px]" style={{ background: '#fdf3d8', color: '#9a6700' }}>
              Your account can view but not change the theme/layout — this requires the "edit theme" permission.
            </p>
          )}
          <fieldset disabled={!canEditTheme} className="grid gap-4">
            <label className="grid gap-1.5" style={label}>
              Layout variant
              <select style={input} value={form.layout_variant} onChange={(e) => setForm({ ...form, layout_variant: e.target.value })}>
                {LAYOUT_VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </label>
            <p className="text-[12.5px] m-0 -mt-2" style={{ color: adminColors.textMuted }}>
              Each layout is one of the site's existing bespoke Venture designs. Picking one reuses that visual style for this venture — new layouts aren't created here.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
              {([
                ['primary_color', 'Primary'], ['secondary_color', 'Secondary'], ['accent_color', 'Accent'],
                ['background_color', 'Background'], ['surface_color', 'Surface'], ['text_color', 'Text'],
                ['muted_color', 'Muted'], ['on_primary_color', 'On-primary'],
              ] as const).map(([key, lbl]) => (
                <label key={key} className="grid gap-1.5" style={label}>
                  {lbl}
                  <div className="flex items-center gap-2">
                    <input type="color" style={colorInput} value={isValidHex(form[key]) ? form[key] : '#000000'} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    <input style={{ ...input, width: 100 }} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                </label>
              ))}
            </div>
            <div className="rounded-[12px] p-5 grid gap-2" style={{ background: form.background_color, color: form.text_color, border: `1px solid ${adminColors.cardBorder}` }}>
              <div className="text-[12px] font-semibold" style={{ color: form.muted_color }}>Live preview</div>
              <div className="text-[20px] font-bold" style={{ color: form.text_color }}>{form.name || 'Venture name'}</div>
              <div style={{ color: form.muted_color }}>{form.tagline || 'Tagline preview text'}</div>
              <button type="button" className="justify-self-start px-4 py-2 rounded-full text-[13px] font-semibold" style={{ background: form.primary_color, color: form.on_primary_color }}>
                {form.cta_label || 'Call to action'}
              </button>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="grid gap-1.5" style={label}>Logo image<input style={input} placeholder="uploads/2026/.../logo.png or https://…" value={form.logo_image} onChange={(e) => setForm({ ...form, logo_image: e.target.value })} /></label>
              <label className="grid gap-1.5" style={label}>Hero image<input style={input} placeholder="uploads/2026/.../hero.jpg or https://…" value={form.hero_image} onChange={(e) => setForm({ ...form, hero_image: e.target.value })} /></label>
            </div>
            <p className="text-[12.5px] m-0 -mt-2" style={{ color: adminColors.textMuted }}>
              Copy an image path from the <a href="/admin/media" target="_blank" rel="noreferrer" style={{ color: adminColors.accentBlue }}>Media Library</a>.
            </p>
          </fieldset>
        </div>
      )}

      {pageTab === 'seo' && (
        <>
          <div style={adminCard} className="p-6 grid gap-4">
            <div className="font-heading font-bold text-[15px]">SEO metadata</div>
            <label className="grid gap-1.5" style={label}>Meta title<input style={input} value={seo.meta_title ?? ''} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} /></label>
            <label className="grid gap-1.5" style={label}>Meta description<textarea style={{ ...input, resize: 'vertical' }} rows={2} value={seo.meta_description ?? ''} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} /></label>
            <label className="grid gap-1.5" style={label}>Canonical URL<input style={input} value={seo.canonical_url ?? ''} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })} /></label>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_index ?? true} onChange={(e) => setSeo({ ...seo, robots_index: e.target.checked })} /> Index</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={seo.robots_follow ?? true} onChange={(e) => setSeo({ ...seo, robots_follow: e.target.checked })} /> Follow</label>
            </div>
          </div>

          <SeoStudioPanel
            contentType="venture" contentId={contentId} seo={seo} slug={form.slug} h1={form.name}
            introText={form.summary}
            blocks={sections.filter((s) => s.is_visible !== false).map((s) => ({ kind: 'html', heading: s.heading, body: s.body_html, items: [] }))}
            pageType="venture" publicUrl={`/our-ventures/${form.slug}`}
            keyphrase={keyphrase} onKeyphraseChange={setKeyphrase}
            relatedKeyphrases={relatedKeyphrases} onRelatedKeyphrasesChange={setRelatedKeyphrases}
            language={language} onLanguageChange={setLanguage}
            isCornerstone={isCornerstone} onCornerstoneChange={setIsCornerstone}
            storedAnalysis={storedAnalysis}
          />
        </>
      )}

      {pageTab === 'publishing' && (
        <div style={adminCard} className="p-6 grid gap-4">
          <div className="font-heading font-bold text-[15px]">Publishing</div>
          <label className="grid gap-1.5" style={label}>
            Status
            <select style={{ ...input, maxWidth: 220 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'] })} disabled={!canPublish && form.status !== 'draft'}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {form.status === 'draft' && !isNew && (
            <a href={`/our-ventures/${form.slug}`} target="_blank" rel="noreferrer" className="justify-self-start text-[13.5px] font-semibold" style={{ color: adminColors.accentBlue }}>
              Preview (this draft is not indexed — noindex applies until published)
            </a>
          )}
          {storedAnalysis && (
            <div className="grid gap-1 text-[13px]" style={{ color: adminColors.textMuted }}>
              <div>SEO score: <strong style={{ color: adminColors.textPrimary }}>{storedAnalysis.seo_score ?? '—'}</strong></div>
              <div>Readability: <strong style={{ color: adminColors.textPrimary }}>{storedAnalysis.readability_score ?? '—'}</strong></div>
              <div>Overall: <strong style={{ color: adminColors.textPrimary }}>{storedAnalysis.overall_score ?? '—'}</strong></div>
            </div>
          )}
          {canPublish && form.status !== 'published' && (
            <button type="button" onClick={requestPublish} className="justify-self-start px-5 py-2.5 rounded-full text-[14px] font-semibold" style={adminPrimaryBtn}>
              Publish
            </button>
          )}
          {publishPreview && (
            <div className="p-4 rounded-[10px] grid gap-3" style={{ background: '#fdf3d8' }}>
              <div className="font-semibold text-[14px]">Confirm publish</div>
              <ul className="text-[13px] m-0 pl-4" style={{ color: '#5c4a1e' }}>
                <li>Route: /our-ventures/{form.slug}</li>
                <li>SEO score: {storedAnalysis?.seo_score ?? 'not yet analyzed'}</li>
                <li>Visible FAQs: {faqs.filter((f) => f.question && f.answer).length}</li>
                <li>Contact: {form.phone_numbers.filter(Boolean).length} phone(s), {form.email ? 'email set' : 'no email'}, {form.website_url ? 'website set' : 'no website'}</li>
              </ul>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPublishPreview(false)} className="text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>Return to editing</button>
                <button type="button" onClick={() => save('published')} className="px-4 py-2 rounded-full text-[13.5px] font-semibold" style={adminPrimaryBtn}>Publish anyway</button>
              </div>
            </div>
          )}
        </div>
      )}

      {pageTab === 'history' && (
        <div style={adminCard} className="p-6 grid gap-2">
          <div className="font-heading font-bold text-[15px]">History</div>
          {history.length === 0 ? (
            <p className="text-[13px] m-0" style={{ color: adminColors.textMuted }}>No history yet.</p>
          ) : (
            history.map((h, i) => (
              <div key={i} className="text-[13px] py-2" style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <strong>{h.action.replace(/_/g, ' ')}</strong>{h.description ? ` — ${h.description}` : ''}
                <div style={{ color: adminColors.textMuted }}>{h.admin_username ?? 'system'} · {new Date(h.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
          {submitting ? 'Saving…' : isNew ? 'Save Draft' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
