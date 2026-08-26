import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Loader2, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Download, ArrowRight,
  Gauge, FileText, Smartphone, Shield, Cpu, Eye, Sparkles, Image as ImageIcon, Link2,
} from 'lucide-react';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { glass, muted, emberBtn, faint } from '../styles/theme';
import { wa } from '../data/site';
import type { AnalysisResult, Recommendation } from '../types/seoAudit';

const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free SEO Audit Tool', path: '/seo-audit-tool' }];

const STATUS_STYLE: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  pass: { color: '#6ee7b7', Icon: CheckCircle2 },
  warning: { color: '#f59e0b', Icon: AlertTriangle },
  fail: { color: '#f87171', Icon: XCircle },
};

const PRIORITY_STYLE: Record<Recommendation['priority'], { bg: string; border: string; text: string }> = {
  critical: { bg: 'rgba(248,113,113,.14)', border: 'rgba(248,113,113,.35)', text: '#fca5a5' },
  high: { bg: 'rgba(255,122,47,.14)', border: 'rgba(255,122,47,.35)', text: '#ffb182' },
  medium: { bg: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.35)', text: '#fcd34d' },
  low: { bg: 'rgba(125,211,252,.14)', border: 'rgba(125,211,252,.35)', text: '#7dd3fc' },
};

const CATEGORY_ICONS: Record<string, typeof Gauge> = {
  technical: Cpu, onPage: FileText, performance: Gauge, mobile: Smartphone, security: Shield, accessibility: Eye,
};
const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical', onPage: 'On-Page', performance: 'Performance', mobile: 'Mobile', security: 'Security', accessibility: 'Accessibility',
};

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#6ee7b7' : score >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="font-heading font-extrabold text-[34px] leading-none">{score}</span>
        <span className="text-[11px] uppercase tracking-[.1em] mt-1" style={{ color: muted }}>/ 100</span>
      </div>
    </div>
  );
}

function CategoryCard({ label, score, Icon }: { label: string; score: number; Icon: typeof Gauge }) {
  const color = score >= 80 ? '#6ee7b7' : score >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="p-4 rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
      <div className="flex items-center justify-between">
        <Icon size={16} color="#7dd3fc" aria-hidden="true" />
        <span className="font-heading font-bold text-[18px]" style={{ color }}>{score}</span>
      </div>
      <div className="text-[13px] font-semibold mt-2">{label}</div>
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.warning;
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <span className="text-[14.5px]" style={{ color: 'rgba(226,234,255,.8)' }}>{label}</span>
      <s.Icon size={16} color={s.color} aria-hidden="true" />
    </div>
  );
}

function RecommendationCard({ r }: { r: Recommendation }) {
  const p = PRIORITY_STYLE[r.priority];
  return (
    <div className="p-5 rounded-[18px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[.06em] px-2.5 py-1 rounded-full" style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text }}>
          {r.priority}
        </span>
        {r.quickWin && (
          <span className="text-[11px] font-bold uppercase tracking-[.06em] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(110,231,183,.14)', border: '1px solid rgba(110,231,183,.35)', color: '#6ee7b7' }}>
            <Sparkles size={11} aria-hidden="true" /> Quick win
          </span>
        )}
        <span className="text-[12px]" style={{ color: faint }}>{r.effort} effort</span>
      </div>
      <h3 className="font-heading font-bold text-[16.5px] m-0">{r.title}</h3>
      <p className="m-0 mt-1.5 text-[14px]" style={{ color: muted }}>{r.recommendation}</p>
    </div>
  );
}

type PageCopy = { h1: string; hero_content: string | null; cta_heading: string | null; cta_body: string | null };
type PageSeo = { meta_title?: string | null; meta_description?: string | null };

export default function SeoAuditTool() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copy, setCopy] = useState<PageCopy | null>(null);
  const [pageSeo, setPageSeo] = useState<PageSeo | null>(null);

  useEffect(() => {
    fetch('/api/public/seo-pages/seo-audit-tool')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json?.success) { setCopy(json.page); setPageSeo(json.seo); } })
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    try {
      const res = await fetch('/api/seo-toolkit/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? 'Could not analyse that URL. Please check it and try again.');
      setResult({ ...json.data.result, id: json.data.id });
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  const schema = [orgSchema, breadcrumbSchema(crumbs)];

  return (
    <>
      <Seo
        title={pageSeo?.meta_title || 'Free SEO Audit Tool | Shrinath Solutions'}
        description={pageSeo?.meta_description || 'Run a free, instant SEO audit on any website. Check technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility in seconds.'}
        path="/seo-audit-tool"
        jsonLd={schema}
      />
      <Breadcrumbs trail={crumbs} />

      <section className="mx-auto max-w-shell px-[22px] pt-8">
        <div className="max-w-[720px]">
          <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>Free Tool</div>
          <h1 className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3 mb-0" style={{ letterSpacing: '-0.03em' }}>
            {copy?.h1 || 'Free SEO Audit Tool'}
          </h1>
          <p className="text-[17px] mt-4" style={{ color: muted }}>
            {copy?.hero_content || 'Enter any website URL to get an instant SEO score across technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility — with a prioritised list of what to fix first.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 p-6 rounded-[22px]" style={glass}>
          <label htmlFor="audit-url" className="block text-[13.5px] font-semibold mb-2" style={{ color: 'rgba(226,234,255,.75)' }}>
            Website URL
          </label>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} style={{ position: 'absolute', left: 16, top: 17 }} color={faint} aria-hidden="true" />
              <input
                id="audit-url"
                type="text"
                required
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === 'loading'}
                className="w-full pl-11 pr-4 py-3.5 rounded-full text-[15.5px] text-white"
                style={{ border: '1px solid rgba(255,255,255,.16)', background: 'rgba(4,8,20,.5)' }}
              />
            </div>
            <button type="submit" disabled={status === 'loading'} className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-heading font-bold text-[15.5px] disabled:opacity-70" style={emberBtn}>
              {status === 'loading' ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Analysing…</> : 'Run Free Audit'}
            </button>
          </div>
          {status === 'error' && (
            <div className="flex items-center gap-2 mt-3 text-[14px]" style={{ color: '#fca5a5' }}>
              <AlertCircle size={15} aria-hidden="true" /> {errorMsg}
            </div>
          )}
          <p className="mt-3 mb-0 text-[13px]" style={{ color: faint }}>
            Free, no signup. Limited to a few audits per hour to keep this fair for everyone.
          </p>
        </form>
      </section>

      {result && (
        <section className="mx-auto max-w-shell px-[22px] pt-14 pb-4">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr] items-center p-6 md:p-8 rounded-[24px] mb-8" style={glass}>
            <ScoreRing score={result.score} />
            <div>
              <div className="text-[13px]" style={{ color: faint }}>Overall SEO score for</div>
              <div className="font-heading font-bold text-[19px] break-all">{result.domain}</div>
              <p className="mt-2 mb-0 text-[14.5px] max-w-[520px]" style={{ color: muted }}>{result.seoInsights?.healthSummary?.summary}</p>
              {result.id && (
                <a
                  href={`/api/seo-toolkit/audits/${result.id}/report`}
                  className="inline-flex items-center gap-1.5 mt-4 font-bold text-[14px]"
                  style={{ color: '#7dd3fc' }}
                >
                  <Download size={15} aria-hidden="true" /> Download PDF Report
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-10">
            {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => (
              <CategoryCard key={k} label={CATEGORY_LABELS[k]} score={result.scoreBreakdown[k as keyof typeof result.scoreBreakdown] as number} Icon={CATEGORY_ICONS[k]} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-10">
            <div className="p-6 rounded-[20px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
              <h2 className="font-heading font-bold text-[18px] mt-0 mb-1">Meta &amp; Content</h2>
              <StatusRow label={`Title (${result.metrics.meta.titleLength} chars)`} status={result.metrics.meta.status} />
              <StatusRow label={`Description (${result.metrics.meta.descriptionLength} chars)`} status={result.metrics.meta.description ? 'pass' : 'fail'} />
              <StatusRow label={`H1 heading${result.metrics.headings.multipleH1 ? ' (multiple found)' : ''}`} status={result.metrics.headings.hasH1 && !result.metrics.headings.multipleH1 ? 'pass' : 'warning'} />
              <div className="flex items-center justify-between pt-2.5 text-[14.5px]" style={{ color: 'rgba(226,234,255,.8)' }}>
                <span className="flex items-center gap-1.5"><ImageIcon size={14} aria-hidden="true" /> Images without alt text</span>
                <span>{result.metrics.images.missingAlt} / {result.metrics.images.totalImages}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5 text-[14.5px]" style={{ color: 'rgba(226,234,255,.8)' }}>
                <span className="flex items-center gap-1.5"><Link2 size={14} aria-hidden="true" /> Internal / external links</span>
                <span>{result.metrics.links.internalLinks} / {result.metrics.links.externalLinks}</span>
              </div>
            </div>

            <div className="p-6 rounded-[20px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
              <h2 className="font-heading font-bold text-[18px] mt-0 mb-1">Technical &amp; Security</h2>
              <StatusRow label="HTTPS" status={result.metrics.technical.https ? 'pass' : 'fail'} />
              <StatusRow label="Sitemap.xml" status={result.metrics.technical.sitemap ? 'pass' : 'warning'} />
              <StatusRow label="Robots.txt" status={result.metrics.technical.robotsTxt ? 'pass' : 'warning'} />
              <StatusRow label="Structured data" status={result.metrics.technical.structuredData ? 'pass' : 'warning'} />
              <StatusRow label="Open Graph tags" status={result.metrics.technical.openGraph ? 'pass' : 'warning'} />
              <StatusRow label="Security headers" status={result.metrics.security.headers && Object.values(result.metrics.security.headers).some(Boolean) ? 'pass' : 'warning'} />
            </div>
          </div>

          {result.keywords?.length > 0 && (
            <div className="mb-10">
              <h2 className="font-heading font-bold text-[20px] mb-4">Top Keywords</h2>
              <div className="rounded-[20px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
                {result.keywords.slice(0, 10).map((k, i) => (
                  <div key={k.keyword} className="flex items-center justify-between px-5 py-3 text-[14.5px]" style={{ background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent', borderBottom: i < 9 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                    <span style={{ color: 'rgba(226,234,255,.85)' }}>{k.keyword}</span>
                    <span className="flex items-center gap-4">
                      <span style={{ color: faint }}>{k.count}×</span>
                      <span className="font-semibold" style={{ color: '#7dd3fc' }}>{k.density}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div className="mb-4">
              <h2 className="font-heading font-bold text-[20px] mb-4">Recommendations</h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {[...result.recommendations]
                  .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]))
                  .slice(0, 10)
                  .map((r, i) => <RecommendationCard key={i} r={r} />)}
              </div>
            </div>
          )}

          <div className="mt-12 p-7 md:p-8 rounded-[22px] flex flex-col md:flex-row items-center justify-between gap-5" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'linear-gradient(120deg, rgba(59,107,255,.22), rgba(123,92,255,.16))' }}>
            <div>
              <div className="font-heading font-bold text-[19px]">{copy?.cta_heading || 'Want help fixing these?'}</div>
              <p className="m-0 mt-1 text-[14.5px]" style={{ color: 'rgba(226,234,255,.72)' }}>{copy?.cta_body || 'Our SEO team can turn this report into a prioritised action plan for your business.'}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/contact" className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-full font-heading font-bold text-[15px] whitespace-nowrap" style={emberBtn}>
                Get a Free Consultation <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href={wa('Hi Shrinath Solutions, I just ran a free SEO audit and would like help with the results.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3.5 rounded-full font-bold text-[15px] whitespace-nowrap" style={{ color: '#eaf1ff', border: '1px solid rgba(255,255,255,.25)' }}>
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
