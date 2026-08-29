import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Wrench, MapPinned, Newspaper, Briefcase, Building2, Star, Image as ImageIcon,
  Mail, FileSignature, Send, RotateCcw, RefreshCw, AlertTriangle, Inbox, CheckCircle2, XCircle, Loader2,
  ExternalLink, Search as SearchIcon, ArrowRight, Gauge, Users,
} from 'lucide-react';
import { adminFetch } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useAuth } from '../context/AuthContext';

type EnquiryRow = { id: number; name: string; service: string | null; status: string; created_at: string };

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

type HealthState = 'checking' | 'connected' | 'unavailable';

type ContentCounts = { total: number; published: number; draft: number };
type Summary = {
  content: {
    pages: ContentCounts; services: ContentCounts; seo_pages: ContentCounts;
    blog_posts: ContentCounts; portfolio_projects: ContentCounts; ventures: ContentCounts;
    ventures_archived: number;
  };
  testimonials: number;
  media_files: number;
  leads: { new_enquiries: number; new_proposals: number; newsletter_subscribers: number };
  seo: {
    totalIndexable: number; good: number; needsImprovement: number; poor: number; notAnalyzed: number;
    orphanPages: number; duplicateTitles: number; missingDescriptions: number; brokenLinks: number;
  };
  prerender_stale: number;
  registry_conflicts: number;
  redirect_conflicts: number;
  seo_audits: {
    audits_today: number; audits_this_month: number; completed: number; failed: number;
    leads: number; average_score: number | null;
  } | null;
};
type ActivityRow = { action: string; entity_type: string | null; entity_id: string | null; description: string | null; created_at: string; admin_username: string | null };
type AttentionRow = { content_type?: string; id?: number; name?: string; title?: string; slug?: string; entity_type?: string; entity_id?: number; overall_score?: number; primary_keyphrase?: string | null; route_path?: string; prerender_status?: string; email?: string; service?: string; created_at?: string };
type Attention = {
  draft_content: AttentionRow[]; poor_seo_scores: AttentionRow[]; missing_metadata: AttentionRow[];
  stale_prerender: AttentionRow[]; unanswered_enquiries: AttentionRow[];
};
type DashboardResponse = { summary: Summary; recent_activity: ActivityRow[]; attention: Attention };

const EDIT_ROUTE: Record<string, string> = {
  page: '/admin/pages', service: '/admin/services', seo_page: '/admin/seo-pages',
  blog_post: '/admin/blog', portfolio_project: '/admin/portfolio', venture: '/admin/ventures',
};

function editLink(contentType: string | undefined, id: number | undefined): string | null {
  if (!contentType || id === undefined) return null;
  const base = EDIT_ROUTE[contentType];
  return base ? `${base}/${id}/edit` : null;
}

function seoLink(entityType: string | undefined, entityId: number | undefined): string | null {
  if (!entityType || entityId === undefined) return null;
  return entityType === 'seo_document' ? `/admin/seo-studio/content/${entityId}` : `/admin/seo-studio/content/${entityType}/${entityId}`;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div style={adminCard} className="p-4 flex items-start gap-3">
      <span className="grid place-items-center rounded-[10px] shrink-0" style={{ width: 38, height: 38, background: adminColors.primarySoft, color: adminColors.primary }} aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="text-[22px] font-heading font-bold leading-none" style={{ color: adminColors.textPrimary }}>{value}</div>
        <div className="text-[13px] mt-1" style={{ color: adminColors.textMuted }}>{label}</div>
        {sub && <div className="text-[11.5px] mt-0.5" style={{ color: adminColors.textMuted }}>{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={adminCard} className="p-4 flex items-start gap-3" aria-hidden="true">
      <span className="rounded-[10px] shrink-0 animate-pulse" style={{ width: 38, height: 38, background: '#f0f1f5' }} />
      <div className="grid gap-2 flex-1">
        <span className="h-[22px] w-12 rounded animate-pulse block" style={{ background: '#f0f1f5' }} />
        <span className="h-[13px] w-24 rounded animate-pulse block" style={{ background: '#f0f1f5' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, ventureCapabilities, seoCapabilities } = useAuth();
  const [health, setHealth] = useState<HealthState>('checking');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<EnquiryRow[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    return adminFetch<DashboardResponse>('/api/admin/dashboard/summary')
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/health.php')
      .then((r) => r.json())
      .then((d) => setHealth(d.success ? 'connected' : 'unavailable'))
      .catch(() => setHealth('unavailable'));
  }, []);

  useEffect(() => {
    adminFetch<{ enquiries: EnquiryRow[] }>('/api/admin/enquiries?per_page=5')
      .then((d) => setEnquiries(d.enquiries))
      .catch(() => setEnquiries([]));
  }, []);

  const canCreateVenture = ventureCapabilities?.includes('ventures.create') ?? false;
  const canViewSeo = seoCapabilities?.includes('seo.view') ?? false;
  const canRunBulkSeo = seoCapabilities?.includes('seo.run_bulk') ?? false;

  const quickActions = [
    { to: '/admin/pages/new', label: 'Add Page', icon: <FileText size={15} aria-hidden="true" />, show: true },
    { to: '/admin/services/new', label: 'Add Service', icon: <Wrench size={15} aria-hidden="true" />, show: true },
    { to: '/admin/seo-pages/new', label: 'Add SEO Page', icon: <MapPinned size={15} aria-hidden="true" />, show: true },
    { to: '/admin/blog/new', label: 'Add Blog', icon: <Newspaper size={15} aria-hidden="true" />, show: true },
    { to: '/admin/portfolio/new', label: 'Add Portfolio', icon: <Briefcase size={15} aria-hidden="true" />, show: true },
    { to: '/admin/ventures/new', label: 'Add Venture', icon: <Building2 size={15} aria-hidden="true" />, show: canCreateVenture },
    { to: '/admin/media', label: 'Upload Media', icon: <ImageIcon size={15} aria-hidden="true" />, show: true },
    { to: '/admin/seo-studio', label: 'Open SEO Studio', icon: <RefreshCw size={15} aria-hidden="true" />, show: canViewSeo },
    { to: '/admin/seo-studio', label: 'Analyze Stale SEO Documents', icon: <RotateCcw size={15} aria-hidden="true" />, show: canRunBulkSeo },
  ].filter((a) => a.show);

  return (
    <div className="grid gap-7">
      <div
        className="relative overflow-hidden rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{ background: `linear-gradient(120deg, ${adminColors.primary}, ${adminColors.primaryHover})`, color: '#fff' }}
      >
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{ right: -40, top: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${adminColors.lime}33, transparent 70%)` }}
        />
        <div className="relative max-w-[560px]">
          <h2 className="font-heading font-bold text-[24px] md:text-[28px] m-0">{timeGreeting()}, {user?.name}.</h2>
          <p className="text-[14.5px] mt-2 m-0" style={{ color: 'rgba(255,255,255,.82)' }}>
            Here's today's content, enquiry and SEO overview.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-bold" style={{ background: adminColors.lime, color: adminColors.textPrimary }}>
              View Website <ExternalLink size={14} aria-hidden="true" />
            </a>
            {seoCapabilities?.includes('seo.view') && (
              <Link to="/admin/seo-studio" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-bold" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }}>
                Open SEO Studio <SearchIcon size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={adminCard} className="p-5 flex items-center gap-3.5 max-w-[420px]">
        {health === 'checking' && <Loader2 size={20} className="animate-spin motion-reduce:animate-none" style={{ color: adminColors.textMuted }} aria-hidden="true" />}
        {health === 'connected' && <CheckCircle2 size={20} style={{ color: adminColors.success }} aria-hidden="true" />}
        {health === 'unavailable' && <XCircle size={20} style={{ color: adminColors.danger }} aria-hidden="true" />}
        <div>
          <div className="text-[14.5px] font-semibold">Database connection</div>
          <div className="text-[13px]" style={{ color: adminColors.textMuted }}>
            {health === 'checking' ? 'Checking…' : health === 'connected' ? 'Connected' : 'Unavailable'}
          </div>
        </div>
      </div>

      {error && (
        <div style={adminCard} className="p-5 flex items-center justify-between gap-4" role="alert">
          <span className="text-[14px]" style={{ color: adminColors.danger }}>Couldn't load dashboard statistics.</span>
          <button type="button" onClick={load} className="px-4 py-2 rounded-full text-[13.5px] font-semibold" style={adminPrimaryBtn}>
            Retry
          </button>
        </div>
      )}

      <section aria-labelledby="quick-actions-heading">
        <h3 id="quick-actions-heading" className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Quick actions
        </h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} style={adminCard} className="flex items-center gap-2 px-4 py-3 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" >
              {a.icon} {a.label}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="content-heading">
        <h3 id="content-heading" className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Content overview
        </h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {loading || !data ? (
            Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard icon={<FileText size={18} aria-hidden="true" />} label="Pages" value={data.summary.content.pages.total} sub={`${data.summary.content.pages.published} published, ${data.summary.content.pages.draft} draft`} />
              <StatCard icon={<Wrench size={18} aria-hidden="true" />} label="Service pages" value={data.summary.content.services.total} sub={`${data.summary.content.services.published} published, ${data.summary.content.services.draft} draft`} />
              <StatCard icon={<MapPinned size={18} aria-hidden="true" />} label="SEO pages" value={data.summary.content.seo_pages.total} sub={`${data.summary.content.seo_pages.published} published, ${data.summary.content.seo_pages.draft} draft`} />
              <StatCard icon={<Newspaper size={18} aria-hidden="true" />} label="Blog posts" value={data.summary.content.blog_posts.total} sub={`${data.summary.content.blog_posts.published} published, ${data.summary.content.blog_posts.draft} draft`} />
              <StatCard icon={<Briefcase size={18} aria-hidden="true" />} label="Portfolio projects" value={data.summary.content.portfolio_projects.total} sub={`${data.summary.content.portfolio_projects.published} published, ${data.summary.content.portfolio_projects.draft} draft`} />
              <StatCard icon={<Building2 size={18} aria-hidden="true" />} label="Ventures" value={data.summary.content.ventures.total} sub={`${data.summary.content.ventures.published} published, ${data.summary.content.ventures_archived} archived`} />
              <StatCard icon={<Star size={18} aria-hidden="true" />} label="Testimonials" value={data.summary.testimonials} />
              <StatCard icon={<ImageIcon size={18} aria-hidden="true" />} label="Media files" value={data.summary.media_files} />
            </>
          )}
        </div>
        {!loading && data && (
          <div className="mt-4">
            <ContentDistribution
              counts={[
                { label: 'Pages', value: data.summary.content.pages.total },
                { label: 'Services', value: data.summary.content.services.total },
                { label: 'SEO Pages', value: data.summary.content.seo_pages.total },
                { label: 'Blogs', value: data.summary.content.blog_posts.total },
                { label: 'Portfolio', value: data.summary.content.portfolio_projects.total },
                { label: 'Ventures', value: data.summary.content.ventures.total },
              ]}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="leads-heading">
        <h3 id="leads-heading" className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Leads
        </h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {loading || !data ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <Link to="/admin/enquiries" style={{ textDecoration: 'none', color: 'inherit' }}>
                <StatCard icon={<Mail size={18} aria-hidden="true" />} label="New contact enquiries" value={data.summary.leads.new_enquiries} />
              </Link>
              <Link to="/admin/proposal-requests" style={{ textDecoration: 'none', color: 'inherit' }}>
                <StatCard icon={<FileSignature size={18} aria-hidden="true" />} label="New proposal requests" value={data.summary.leads.new_proposals} />
              </Link>
              <Link to="/admin/newsletter-subscribers" style={{ textDecoration: 'none', color: 'inherit' }}>
                <StatCard icon={<Send size={18} aria-hidden="true" />} label="Newsletter subscribers" value={data.summary.leads.newsletter_subscribers} />
              </Link>
            </>
          )}
        </div>
      </section>

      {canViewSeo && (
        <section aria-labelledby="seo-heading">
          <h3 id="seo-heading" className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
            SEO health
          </h3>
          {!loading && data && (
            <div style={adminCard} className="p-5 mb-3">
              <SeoDonut good={data.summary.seo.good} needsImprovement={data.summary.seo.needsImprovement} poor={data.summary.seo.poor} notAnalyzed={data.summary.seo.notAnalyzed} />
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {loading || !data ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <Link to="/admin/seo-studio/content?score_status=good" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatCard icon={<CheckCircle2 size={18} aria-hidden="true" />} label="Good scores" value={data.summary.seo.good} />
                </Link>
                <Link to="/admin/seo-studio/content?score_status=needs_improvement" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatCard icon={<AlertTriangle size={18} aria-hidden="true" />} label="Needs improvement" value={data.summary.seo.needsImprovement} />
                </Link>
                <Link to="/admin/seo-studio/content?score_status=poor" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatCard icon={<XCircle size={18} aria-hidden="true" />} label="Poor scores" value={data.summary.seo.poor} />
                </Link>
                <Link to="/admin/seo-studio/content?missing_keyphrase=1" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatCard icon={<Inbox size={18} aria-hidden="true" />} label="Not analyzed" value={data.summary.seo.notAnalyzed} />
                </Link>
              </>
            )}
          </div>
          {!loading && data && (
            <p className="text-[12.5px] mt-3" style={{ color: adminColors.textMuted }}>
              {data.summary.prerender_stale} route(s) need a prerender rebuild · {data.summary.registry_conflicts} registry conflict(s) · {data.summary.redirect_conflicts} redirect conflict(s)
            </p>
          )}
        </section>
      )}

      {canViewSeo && !loading && data?.summary.seo_audits && (
        <section aria-labelledby="seo-audits-heading">
          <div className="flex items-center justify-between mb-3">
            <h3 id="seo-audits-heading" className="text-[13px] font-bold uppercase tracking-[.08em] m-0" style={{ color: adminColors.textMuted }}>
              Free SEO Audit Tool
            </h3>
            <Link to="/admin/seo-audits" className="text-[12.5px] font-semibold" style={{ color: adminColors.accentBlue }}>View all runs</Link>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <StatCard icon={<Gauge size={18} aria-hidden="true" />} label="Audits today" value={data.summary.seo_audits.audits_today} sub={`${data.summary.seo_audits.audits_this_month} this month`} />
            <StatCard icon={<CheckCircle2 size={18} aria-hidden="true" />} label="Completed" value={data.summary.seo_audits.completed} />
            <StatCard icon={<XCircle size={18} aria-hidden="true" />} label="Failed" value={data.summary.seo_audits.failed} />
            <Link to="/admin/seo-audits?lead=lead" style={{ textDecoration: 'none', color: 'inherit' }}>
              <StatCard icon={<Users size={18} aria-hidden="true" />} label="Consultation leads" value={data.summary.seo_audits.leads} />
            </Link>
            {data.summary.seo_audits.average_score !== null && (
              <StatCard icon={<Gauge size={18} aria-hidden="true" />} label="Average completed score" value={data.summary.seo_audits.average_score} />
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <RecentEnquiries rows={enquiries} />

        <section aria-labelledby="attention-heading" style={adminCard} className="p-5">
          <h3 id="attention-heading" className="text-[14px] font-bold mb-3">Needs attention</h3>
          {loading || !data ? (
            <p className="text-[13.5px]" style={{ color: adminColors.textMuted }}>Loading…</p>
          ) : (
            <div className="grid gap-4">
              <AttentionGroup title="Draft content" rows={data.attention.draft_content} render={(r) => (
                <Link to={editLink(r.content_type, r.id) ?? '#'} className="text-[13.5px]" style={{ color: adminColors.accentBlue }}>{r.name ?? r.title ?? r.slug}</Link>
              )} />
              <AttentionGroup title="Poor SEO scores" rows={data.attention.poor_seo_scores} render={(r) => (
                <Link to={seoLink(r.content_type, r.id) ?? '#'} className="text-[13.5px]" style={{ color: adminColors.accentBlue }}>
                  {r.content_type} #{r.id} — score {r.overall_score}{r.primary_keyphrase ? ` (${r.primary_keyphrase})` : ''}
                </Link>
              )} />
              <AttentionGroup title="Missing metadata" rows={data.attention.missing_metadata} render={(r) => (
                <Link to={seoLink(r.entity_type, r.entity_id) ?? '#'} className="text-[13.5px]" style={{ color: adminColors.accentBlue }}>{r.entity_type} #{r.entity_id}</Link>
              )} />
              <AttentionGroup title="Stale prerender routes" rows={data.attention.stale_prerender} render={(r) => (
                <Link to={`/admin/seo-studio/content/${r.id}`} className="text-[13.5px]" style={{ color: adminColors.accentBlue }}>{r.route_path} ({r.prerender_status})</Link>
              )} />
              <AttentionGroup title="Unanswered enquiries" rows={data.attention.unanswered_enquiries} render={(r) => (
                <Link to="/admin/enquiries" className="text-[13.5px]" style={{ color: adminColors.accentBlue }}>{r.name} — {r.service ?? r.email}</Link>
              )} />
            </div>
          )}
        </section>

        <section aria-labelledby="activity-heading" style={adminCard} className="p-5">
          <h3 id="activity-heading" className="text-[14px] font-bold mb-3">Recent activity</h3>
          {loading || !data ? (
            <p className="text-[13.5px]" style={{ color: adminColors.textMuted }}>Loading…</p>
          ) : data.recent_activity.length === 0 ? (
            <p className="text-[13.5px]" style={{ color: adminColors.textMuted }}>No activity recorded yet.</p>
          ) : (
            <ul className="grid gap-2.5 m-0 p-0" style={{ listStyle: 'none' }}>
              {data.recent_activity.map((a, i) => (
                <li key={i} className="text-[13px] pb-2.5" style={{ borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${adminColors.cardBorder}` : 'none' }}>
                  <span style={{ color: adminColors.textPrimary, fontWeight: 600 }}>{a.action.replace(/_/g, ' ')}</span>
                  {a.entity_type && <span style={{ color: adminColors.textMuted }}> — {a.entity_type}{a.entity_id ? ` #${a.entity_id}` : ''}</span>}
                  {a.description && <span style={{ color: adminColors.textMuted }}> ({a.description})</span>}
                  <div style={{ color: adminColors.textMuted }}>{a.admin_username ?? 'system'} · {new Date(a.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Lightweight CSS bar chart — no charting library for a handful of real counts. */
function ContentDistribution({ counts }: { counts: { label: string; value: number }[] }) {
  const max = Math.max(1, ...counts.map((c) => c.value));
  return (
    <div style={adminCard} className="p-5">
      <h3 className="text-[14px] font-bold mb-4">Content distribution</h3>
      <div className="grid gap-3">
        {counts.map((c) => (
          <div key={c.label} className="grid gap-1">
            <div className="flex items-center justify-between text-[12.5px]" style={{ color: adminColors.textMuted }}>
              <span>{c.label}</span>
              <span style={{ color: adminColors.textPrimary, fontWeight: 600 }}>{c.value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: adminColors.contentBg }}>
              <div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: adminColors.primary }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Real-data donut via a single CSS conic-gradient — no charting library for 4 segments. */
function SeoDonut({ good, needsImprovement, poor, notAnalyzed }: { good: number; needsImprovement: number; poor: number; notAnalyzed: number }) {
  const total = good + needsImprovement + poor + notAnalyzed;
  const segments: { value: number; color: string }[] = [
    { value: good, color: adminColors.success },
    { value: needsImprovement, color: adminColors.warning },
    { value: poor, color: adminColors.danger },
    { value: notAnalyzed, color: adminColors.textMutedLight },
  ];
  let acc = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / Math.max(1, total)) * 360;
      acc += s.value;
      const end = (acc / Math.max(1, total)) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(', ');

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative rounded-full shrink-0"
        style={{ width: 96, height: 96, background: total > 0 ? `conic-gradient(${stops})` : adminColors.contentBg }}
        role="img"
        aria-label={`SEO score distribution: ${good} good, ${needsImprovement} needs improvement, ${poor} poor, ${notAnalyzed} not analyzed`}
      >
        <div className="absolute inset-[10px] rounded-full grid place-items-center" style={{ background: adminColors.cardBg }}>
          <div className="text-center">
            <div className="text-[16px] font-heading font-bold leading-none">{total}</div>
            <div className="text-[9.5px]" style={{ color: adminColors.textMuted }}>Analyzed</div>
          </div>
        </div>
      </div>
      <ul className="grid gap-1.5 m-0 p-0 text-[12.5px]" style={{ listStyle: 'none' }}>
        <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: adminColors.success }} aria-hidden="true" /> Good — {good}</li>
        <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: adminColors.warning }} aria-hidden="true" /> Needs improvement — {needsImprovement}</li>
        <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: adminColors.danger }} aria-hidden="true" /> Poor — {poor}</li>
        <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: adminColors.textMutedLight }} aria-hidden="true" /> Not analyzed — {notAnalyzed}</li>
      </ul>
    </div>
  );
}

function RecentEnquiries({ rows }: { rows: EnquiryRow[] | null }) {
  return (
    <section aria-labelledby="enquiries-heading" style={adminCard} className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 id="enquiries-heading" className="text-[14px] font-bold m-0">Recent enquiries</h3>
        <Link to="/admin/enquiries" className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: adminColors.primary }}>
          View all <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      {rows === null ? (
        <p className="text-[13.5px]" style={{ color: adminColors.textMuted }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: adminColors.textMuted }}>No enquiries yet.</p>
      ) : (
        <ul className="grid gap-2.5 m-0 p-0" style={{ listStyle: 'none' }}>
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-[13px] pb-2.5" style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold truncate" style={{ color: adminColors.textPrimary }}>
                  {r.status === 'new' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: adminColors.info }} aria-label="Unread" />}
                  {r.name}
                </div>
                <div className="truncate" style={{ color: adminColors.textMuted }}>{r.service ?? 'General enquiry'} · {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <Link to="/admin/enquiries" className="text-[12px] font-semibold shrink-0" style={{ color: adminColors.primary }}>View</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionGroup({ title, rows, render }: { title: string; rows: AttentionRow[]; render: (row: AttentionRow) => React.ReactNode }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-[.06em] mb-1.5" style={{ color: adminColors.textMuted }}>{title} ({rows.length})</div>
      <ul className="grid gap-1 m-0 p-0" style={{ listStyle: 'none' }}>
        {rows.map((r, i) => <li key={i}>{render(r)}</li>)}
      </ul>
    </div>
  );
}
