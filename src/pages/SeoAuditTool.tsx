import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Download, ArrowRight,
  Gauge, FileText, Smartphone, Shield, Cpu, Eye, Sparkles, Image as ImageIcon, Link2,
  Settings, Lock, ListChecks, Database, ShieldCheck, Globe,
} from 'lucide-react';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { glass, muted, emberBtn, faint } from '../styles/theme';
import { wa } from '../data/site';
import { trackAuditToolSubmit, trackAuditToolResult } from '../lib/analytics';
import { useSeoOverride } from '../hooks/useSeoOverride';
import type { AnalysisResult, Recommendation } from '../types/seoAudit';

const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free SEO Audit Tool', path: '/seo-audit-tool' }];

const STATUS_STYLE: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  pass: { color: '#6ee7b7', Icon: CheckCircle2 },
  warning: { color: '#f59e0b', Icon: AlertTriangle },
  fail: { color: '#f87171', Icon: XCircle },
};

const PRIORITY_STYLE: Record<Recommendation['priority'], { bg: string; border: string; text: string }> = {
  critical: { bg: 'rgba(220,38,38,.08)', border: 'rgba(220,38,38,.3)', text: '#b91c1c' },
  high: { bg: 'rgba(255,122,61,.1)', border: 'rgba(255,122,61,.35)', text: '#c2410c' },
  medium: { bg: 'rgba(217,119,6,.1)', border: 'rgba(217,119,6,.3)', text: '#92400e' },
  low: { bg: 'rgba(49,87,229,.08)', border: 'rgba(49,87,229,.25)', text: '#2444be' },
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
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
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
    <div className="p-4 rounded-[16px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <Icon size={16} color="var(--color-primary)" aria-hidden="true" />
        <span className="font-heading font-bold text-[18px]" style={{ color }}>{score}</span>
      </div>
      <div className="text-[13px] font-semibold mt-2" style={{ color: 'var(--color-heading)' }}>{label}</div>
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--color-surface-alt)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.warning;
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-[14.5px]" style={{ color: 'var(--color-heading)' }}>{label}</span>
      <s.Icon size={16} color={s.color} aria-hidden="true" />
    </div>
  );
}

function RecommendationCard({ r }: { r: Recommendation }) {
  const p = PRIORITY_STYLE[r.priority];
  return (
    <div className="p-5 rounded-[18px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[.06em] px-2.5 py-1 rounded-full" style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text }}>
          {r.priority}
        </span>
        {r.quickWin && (
          <span className="text-[11px] font-bold uppercase tracking-[.06em] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(15,159,117,.1)', border: '1px solid rgba(15,159,117,.3)', color: 'var(--color-success)' }}>
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

const HERO_FEATURES = [
  { label: 'Technical SEO', Icon: Settings },
  { label: 'On-page Analysis', Icon: FileText },
  { label: 'Performance', Icon: Gauge },
  { label: 'Mobile & Accessibility', Icon: Smartphone },
];

const TRUST_BADGES = [
  { label: 'No signup required', Icon: ShieldCheck },
  { label: 'Prioritized recommendations', Icon: ListChecks },
  { label: 'Mobile-friendly report', Icon: Smartphone },
  { label: 'Secure URL validation', Icon: Lock },
];

const HEALTH_CHECK_CATEGORIES = [
  { label: 'Crawl & Indexability', Icon: Settings, description: 'Identify crawl errors, blocked pages and indexation issues.' },
  { label: 'On-page SEO', Icon: FileText, description: 'Review titles, meta tags, headings and content optimisation.' },
  { label: 'Performance', Icon: Gauge, description: 'Check Core Web Vitals, load time and overall page performance.' },
  { label: 'Mobile & UX', Icon: Smartphone, description: 'Evaluate mobile usability, responsive design and UX.' },
  { label: 'Security', Icon: Lock, description: 'Scan SSL, security headers and site safety.' },
  { label: 'Structured Data', Icon: Database, description: 'Check schema markup and rich result opportunities.' },
];

const EXAMPLE_PREVIEW = [
  { label: 'Technical SEO', score: 85, color: '#16a34a' },
  { label: 'On-page SEO', score: 78, color: 'var(--color-primary)' },
  { label: 'Performance', score: 74, color: '#f59e0b' },
  { label: 'Mobile', score: 88, color: '#7c3aed' },
];

export default function SeoAuditTool() {
  const [url, setUrl] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
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
    trackAuditToolSubmit();
    try {
      const res = await fetch('/api/seo-toolkit/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          leadName: leadName.trim() || undefined,
          leadEmail: leadEmail.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? 'Could not analyse that URL. Please check it and try again.');
      const auditResult = { ...json.data.result, id: json.data.id };
      setResult(auditResult);
      trackAuditToolResult(auditResult.score >= 80 ? 'high' : auditResult.score >= 50 ? 'medium' : 'low');
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  const schema = [orgSchema, breadcrumbSchema(crumbs)];
  const seoOverride = useSeoOverride('/seo-audit-tool');

  return (
    <>
      <Seo
        title={seoOverride?.title || pageSeo?.meta_title || 'Free SEO Audit Tool | Shrinath Solutions'}
        description={seoOverride?.description || pageSeo?.meta_description || 'Run a free, instant SEO audit on any website. Check technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility in seconds.'}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        path="/seo-audit-tool"
        jsonLd={schema}
      />
      <Breadcrumbs trail={crumbs} />

      <section className="mx-auto max-w-shell px-[22px] pt-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Free SEO Audit Tool</div>
            <h1 className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3 mb-0" style={{ letterSpacing: '-0.03em' }}>
              {copy?.h1 || 'Find What Is Holding Your Website Back'}
            </h1>
            <p className="text-[17px] mt-4" style={{ color: muted }}>
              {copy?.hero_content || 'Get a comprehensive SEO audit across technical SEO, on-page optimisation, performance, mobile-friendliness, security and accessibility — with a prioritised list of what to fix first.'}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-7 max-w-[440px]">
              {HERO_FEATURES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="grid place-items-center rounded-full shrink-0" style={{ width: 40, height: 40, background: 'var(--color-surface-alt)' }}>
                    <Icon size={17} color="var(--color-primary)" aria-hidden="true" />
                  </span>
                  <span className="text-[14.5px] font-semibold" style={{ color: 'var(--color-heading)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[22px]" style={glass}>
            <h2 className="font-heading font-extrabold text-[20px] m-0">Check Your Website</h2>
            <p className="text-[14px] mt-1 mb-5" style={{ color: muted }}>Get your SEO health snapshot</p>

            <form onSubmit={onSubmit}>
              <label htmlFor="audit-url" className="block text-[13.5px] font-semibold mb-2" style={{ color: 'var(--color-heading)' }}>
                Website URL
              </label>
              <div className="relative">
                <Globe size={16} style={{ position: 'absolute', left: 16, top: 17 }} color="var(--color-muted)" aria-hidden="true" />
                <input
                  id="audit-url"
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'loading'}
                  className="w-full pl-11 pr-4 py-3.5 rounded-full text-[15.5px] transition-colors outline-none focus:!border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(49,87,229,.2)]"
                  style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-heading)' }}
                />
              </div>

              <details className="mt-3 group">
                <summary className="text-[13px] font-semibold cursor-pointer list-none flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                  Get help fixing these SEO issues (optional)
                </summary>
                <div className="grid sm:grid-cols-2 gap-2.5 mt-2.5">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    disabled={status === 'loading'}
                    className="w-full px-4 py-2.5 rounded-full text-[14px] outline-none"
                    style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-heading)' }}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    disabled={status === 'loading'}
                    className="w-full px-4 py-2.5 rounded-full text-[14px] outline-none"
                    style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-heading)' }}
                  />
                </div>
                <p className="text-[12px] mt-2 mb-0" style={{ color: 'var(--color-muted)' }}>
                  Optional — share your details if you would like Shrinath Solutions to contact you about improving these results.
                </p>
              </details>

              <button type="submit" disabled={status === 'loading'} className="w-full flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-heading font-bold text-[15.5px] disabled:opacity-70 transition hover:brightness-95 mt-4" style={emberBtn}>
                {status === 'loading' ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Analysing…</> : 'Run Free Audit'}
              </button>
              {status === 'error' && (
                <div className="flex items-center gap-2 mt-3 text-[14px]" style={{ color: 'var(--color-error)' }}>
                  <AlertCircle size={15} aria-hidden="true" /> {errorMsg}
                </div>
              )}
              <p className="mt-3 mb-0 text-[12.5px] text-center" style={{ color: 'var(--color-muted)' }}>
                Free audit &bull; No signup &bull; Prioritized recommendations
              </p>
            </form>

            {!result && (
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="text-[12px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: 'var(--color-muted)' }}>Example preview</div>
                <div className="flex items-center gap-5">
                  <ScoreRing score={82} />
                  <div className="flex-1 grid gap-2">
                    {EXAMPLE_PREVIEW.map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-[12.5px] w-[92px] shrink-0" style={{ color: 'var(--color-heading)' }}>{row.label}</span>
                        <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-alt)' }}>
                          <span className="block h-full rounded-full" style={{ width: `${row.score}%`, background: row.color }} />
                        </span>
                        <span className="text-[12px] font-semibold w-[42px] text-right" style={{ color: 'var(--color-muted)' }}>{row.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] pt-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 py-6" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          {TRUST_BADGES.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid place-items-center rounded-full shrink-0" style={{ width: 36, height: 36, background: 'var(--color-surface-alt)' }}>
                <Icon size={16} color="var(--color-primary)" aria-hidden="true" />
              </span>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--color-heading)' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] py-14">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <h2 className="font-heading font-extrabold text-[clamp(24px,3vw,32px)] m-0">A Complete Website Health Check</h2>
          <p className="mt-3 mb-0 text-[15.5px]" style={{ color: muted }}>We analyse key areas that impact your search visibility and user experience.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {HEALTH_CHECK_CATEGORIES.map(({ label, Icon, description }) => (
            <div key={label}>
              <span className="grid place-items-center rounded-full mb-3" style={{ width: 48, height: 48, background: 'var(--color-surface-alt)' }}>
                <Icon size={20} color="var(--color-primary)" aria-hidden="true" />
              </span>
              <div className="font-heading font-bold text-[15px]" style={{ color: 'var(--color-heading)' }}>{label}</div>
              <p className="mt-1.5 mb-0 text-[13.5px]" style={{ color: muted }}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {result && (
        <section className="mx-auto max-w-shell px-[22px] pt-14 pb-4">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr] items-center p-6 md:p-8 rounded-[24px] mb-8" style={glass}>
            <ScoreRing score={result.score} />
            <div>
              <div className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Overall SEO score for</div>
              <div className="font-heading font-bold text-[19px] break-all">{result.domain}</div>
              <p className="mt-2 mb-0 text-[14.5px] max-w-[520px]" style={{ color: muted }}>{result.seoInsights?.healthSummary?.summary}</p>
              {result.id && (
                <a
                  href={`/api/seo-toolkit/audits/${result.id}/report`}
                  className="inline-flex items-center gap-1.5 mt-4 font-bold text-[14px]"
                  style={{ color: 'var(--color-primary)' }}
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
            <div className="p-6 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-bold text-[18px] mt-0 mb-1">Meta &amp; Content</h2>
              <StatusRow label={`Title (${result.metrics.meta.titleLength} chars)`} status={result.metrics.meta.status} />
              <StatusRow label={`Description (${result.metrics.meta.descriptionLength} chars)`} status={result.metrics.meta.description ? 'pass' : 'fail'} />
              <StatusRow label={`H1 heading${result.metrics.headings.multipleH1 ? ' (multiple found)' : ''}`} status={result.metrics.headings.hasH1 && !result.metrics.headings.multipleH1 ? 'pass' : 'warning'} />
              <div className="flex items-center justify-between pt-2.5 text-[14.5px]" style={{ color: 'var(--color-heading)' }}>
                <span className="flex items-center gap-1.5"><ImageIcon size={14} aria-hidden="true" /> Images without alt text</span>
                <span>{result.metrics.images.missingAlt} / {result.metrics.images.totalImages}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5 text-[14.5px]" style={{ color: 'var(--color-heading)' }}>
                <span className="flex items-center gap-1.5"><Link2 size={14} aria-hidden="true" /> Internal / external links</span>
                <span>{result.metrics.links.internalLinks} / {result.metrics.links.externalLinks}</span>
              </div>
            </div>

            <div className="p-6 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
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
              <div className="rounded-[20px] overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                {result.keywords.slice(0, 10).map((k, i) => (
                  <div key={k.keyword} className="flex items-center justify-between px-5 py-3 text-[14.5px]" style={{ background: i % 2 ? 'var(--color-surface-alt)' : 'transparent', borderBottom: i < 9 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ color: 'var(--color-heading)' }}>{k.keyword}</span>
                    <span className="flex items-center gap-4">
                      <span style={{ color: 'var(--color-muted)' }}>{k.count}×</span>
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{k.density}%</span>
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

          <div className="mt-12 p-7 md:p-8 rounded-[22px] flex flex-col md:flex-row items-center justify-between gap-5" style={{ border: '1px solid var(--color-border)', background: 'linear-gradient(120deg, var(--color-surface-alt), var(--color-surface-warm))' }}>
            <div>
              <div className="font-heading font-bold text-[19px]">{copy?.cta_heading || 'Want help fixing these?'}</div>
              <p className="m-0 mt-1 text-[14.5px]" style={{ color: 'var(--color-body)' }}>{copy?.cta_body || 'Our SEO team can turn this report into a prioritised action plan for your business.'}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/contact" className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-full font-heading font-bold text-[15px] whitespace-nowrap transition hover:brightness-95" style={emberBtn}>
                Get a Free Consultation <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href={wa('Hi Shrinath Solutions, I just ran a free SEO audit and would like help with the results.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3.5 rounded-full font-bold text-[15px] whitespace-nowrap" style={{ color: 'var(--color-heading)', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)' }}>
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
