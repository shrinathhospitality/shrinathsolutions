import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Cpu, FileText, PenTool, Link2, ShoppingCart, Eye, Users, TrendingUp, Rocket,
  Target, Star, CheckCircle2, ArrowRight, Search, Phone, Mail, MessageCircle, ChevronRight,
} from 'lucide-react';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import Faq from '../components/Faq';
import EnquiryForm from '../components/EnquiryForm';
import { glass, muted, emberBtn, ghostBtn } from '../styles/theme';
import { site, wa } from '../data/site';

type ContentSection = { kind: string; heading: string; body?: string; items: any[]; meta?: { name?: string; role?: string; company?: string } };
type StatItem = { value: string; label: string };
type ApiPage = {
  h1: string;
  hero_content: string | null;
  cta_heading: string | null;
  cta_body: string | null;
  content_sections: ContentSection[];
};
type ApiFaq = { question: string; answer: string };

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'process', label: 'Process' },
  { id: 'case-study', label: 'Case Study' },
  { id: 'faqs', label: 'FAQs' },
];

const SERVICE_CARDS = [
  { icon: MapPin, title: 'Local SEO', to: '/services/local-seo', body: 'Google Business Profile optimization, local citations and location-specific strategies.' },
  { icon: Cpu, title: 'Technical SEO', to: '/services/technical-seo', body: 'Website speed, mobile usability, indexing and site architecture for better performance.' },
  { icon: FileText, title: 'On-Page SEO', to: '/services/on-page-seo', body: 'Titles, meta tags, content and internal linking to rank higher for target keywords.' },
  { icon: PenTool, title: 'Content Marketing', to: '/services/content-marketing', body: 'SEO-friendly content that attracts, engages and converts your target audience.' },
  { icon: Link2, title: 'Link Building', to: '/services/off-page-seo', body: 'Ethical, authoritative backlinks built to boost your site’s authority and rankings.' },
  { icon: ShoppingCart, title: 'Ecommerce SEO', to: '/services/ecommerce-seo', body: 'SEO strategies for online stores to increase product visibility, traffic and sales.' },
];

const BENEFIT_CARDS = [
  { icon: Eye, title: 'More Visibility', body: 'Rank higher on Google and get noticed by active searchers.' },
  { icon: Users, title: 'Quality Traffic', body: 'Attract the right visitors who are more likely to become customers.' },
  { icon: TrendingUp, title: 'Higher Conversions', body: 'Turn website visitors into leads and paying customers.' },
  { icon: Rocket, title: 'Long-Term Growth', body: 'Build sustainable traffic and grow your business over time.' },
];

const TOURISM_TAGS = ['Hotel SEO', 'Resort SEO', 'Travel Agency SEO', 'Tour Package SEO', 'Homestay SEO', 'Desert Safari SEO'];

const WHY_CHOOSE = [
  'Experienced SEO Professionals',
  'Transparent Reporting & Communication',
  'White-Hat Ethical SEO Practices',
  'Customized Strategies for Your Business',
  'Proven Results & Long-Term Partnerships',
];

function DesertIllustration() {
  return (
    <svg viewBox="0 0 600 340" className="w-full h-auto" role="img" aria-label="Illustration of Jaisalmer fort at night above the desert dunes">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1330" />
          <stop offset="100%" stopColor="#1a1440" />
        </linearGradient>
        <linearGradient id="duneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b6bff" stopOpacity=".28" />
          <stop offset="100%" stopColor="#7b5cff" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <rect width="600" height="340" fill="url(#skyGrad)" />
      <circle cx="500" cy="70" r="26" fill="#ffb182" opacity=".85" />
      {Array.from({ length: 40 }).map((_, i) => (
        <circle key={i} cx={(i * 53) % 600} cy={(i * 37) % 140} r={i % 5 === 0 ? 1.6 : 0.9} fill="#dbe6ff" opacity={0.5} />
      ))}
      <path d="M0,230 Q120,190 240,225 T480,215 Q560,210 600,230 L600,340 L0,340 Z" fill="url(#duneGrad)" />
      <g fill="#101a38">
        <rect x="150" y="150" width="18" height="70" />
        <rect x="175" y="130" width="22" height="90" />
        <rect x="205" y="160" width="16" height="60" />
        <rect x="228" y="120" width="26" height="100" />
        <rect x="262" y="145" width="18" height="75" />
        <rect x="288" y="105" width="30" height="115" />
        <rect x="326" y="150" width="16" height="70" />
        <rect x="350" y="135" width="20" height="85" />
        <path d="M295,105 l15,-22 l15,22 z" />
      </g>
      <path d="M0,250 Q150,215 300,248 T600,240 L600,340 L0,340 Z" fill="#060a17" />
      {Array.from({ length: 4 }).map((_, i) => (
        <g key={i} transform={`translate(${90 + i * 26},265)`}>
          <path d="M0,10 Q4,-6 8,10" stroke="#8b93ad" strokeWidth="1.4" fill="none" opacity=".6" />
        </g>
      ))}
    </svg>
  );
}

function DashboardVisual() {
  return (
    <div className="rounded-[22px] overflow-hidden" style={{ ...glass, animation: 'floatY 10s ease-in-out infinite' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)' }}>
        <Search size={13} color="#7dd3fc" aria-hidden="true" />
        <span className="text-[12.5px]" style={{ color: 'rgba(226,234,255,.6)' }}>Jaisalmer hotels</span>
      </div>
      <div className="p-4 grid gap-3">
        <div className="p-3.5 rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[.08em]" style={{ color: 'rgba(226,234,255,.5)' }}>Organic Traffic</span>
            <span className="font-heading font-bold text-[15px]" style={{ color: '#6ee7b7' }}>+156%</span>
          </div>
          <svg viewBox="0 0 220 50" className="w-full h-[42px] mt-1.5" preserveAspectRatio="none">
            <polyline points="0,42 30,38 60,30 90,32 120,20 150,22 180,10 220,6" fill="none" stroke="#7dd3fc" strokeWidth="2" />
          </svg>
        </div>
        <div className="p-3.5 rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)' }}>
          <div className="text-[12px] uppercase tracking-[.08em] mb-2" style={{ color: 'rgba(226,234,255,.5)' }}>Local Rankings</div>
          <div className="grid gap-1.5">
            {[['Jaisalmer Hotels', '#1'], ['Desert Safari Jaisalmer', '#2'], ['Jaisalmer Resort', '#3']].map(([label, rank]) => (
              <div key={label} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'rgba(226,234,255,.75)' }}>{label}</span>
                <span className="font-bold" style={{ color: '#ffb182' }}>{rank}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)' }}>
          <span className="grid place-items-center rounded-full shrink-0" style={{ width: 30, height: 30, background: 'rgba(255,122,47,.18)' }}>
            <MapPin size={14} color="#ff9a53" aria-hidden="true" />
          </span>
          <span className="text-[12.5px]" style={{ color: 'rgba(226,234,255,.65)' }}>Jaisalmer, Rajasthan, India</span>
        </div>
      </div>
    </div>
  );
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -70% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

type ApiSeo = { meta_title?: string | null; meta_description?: string | null };

export default function SeoCompanyJaisalmer() {
  const [data, setData] = useState<{ page: ApiPage; faqs: ApiFaq[]; seo: ApiSeo | null } | null>(null);
  const active = useScrollSpy(TABS.map((t) => t.id));
  const contactRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/public/seo-pages/seo-company-jaisalmer')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json?.success) setData({ page: json.page, faqs: json.faqs, seo: json.seo }); })
      .catch(() => {});
  }, []);

  const sections = data?.page.content_sections ?? [];
  const byHeading = (h: string) => sections.find((s) => s.heading === h);

  const heroIntro = (data?.page.hero_content ?? '').split('\n\n')[0];
  const aboutParas: string[] = byHeading('Professional SEO Services in Jaisalmer')?.items ?? [];
  const whyParas: string[] = byHeading('Why Your Business Needs SEO')?.items ?? [];
  const tourismParas: string[] = byHeading('SEO for Hotels and Tourism Businesses')?.items ?? [];
  const processSteps: { num: string; title: string; body: string }[] = byHeading('Our SEO Work Process')?.items ?? [];
  const whyChooseParas: string[] = byHeading('Why Choose Shrinath Solutions?')?.items ?? [];

  const glanceStats: StatItem[] = byHeading('At a Glance')?.items ?? [
    { value: '98%', label: 'Client Retention' },
    { value: '120+', label: 'Successful Projects' },
    { value: '250K+', label: 'Organic Visits Generated' },
    { value: '35+', label: 'Industries Served' },
  ];
  const resultStats: StatItem[] = byHeading('Client Results')?.items ?? [
    { value: '150%', label: 'Avg Organic Traffic Increase' },
    { value: '85%', label: 'Top 3 Keyword Rankings' },
    { value: '4.9/5', label: 'Client Satisfaction' },
    { value: '120+', label: 'Projects Completed' },
  ];
  const caseStudy = byHeading('Case Study');
  const caseStudyTitle = `Success Story: ${caseStudy?.meta?.company || 'Desert Heritage Resort'}`;
  const caseStudyStats: StatItem[] = caseStudy?.items?.length
    ? caseStudy.items
    : [{ value: '+172%', label: 'Organic Traffic' }, { value: '+126%', label: 'Direct Bookings' }, { value: '+68', label: 'Keywords in Top 3' }];
  const caseStudyQuote = caseStudy?.body || 'Shrinath transformed our online presence. Our rankings improved and bookings increased significantly.';
  const caseStudyName = caseStudy?.meta?.name || 'Rahul Singh';
  const caseStudyRole = caseStudy?.meta?.role || 'Owner, Desert Heritage Resort';
  const caseStudyInitials = caseStudyName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const faqs = data?.faqs ?? [];
  const seenQ = new Set<string>();
  const dedupedFaqs = faqs.filter((f) => {
    const k = f.question.trim().toLowerCase();
    if (seenQ.has(k)) return false;
    seenQ.add(k);
    return true;
  });
  const faqLeft = dedupedFaqs.slice(0, Math.ceil(dedupedFaqs.length / 2)).map((f): [string, string] => [f.question, f.answer]);
  const faqRight = dedupedFaqs.slice(Math.ceil(dedupedFaqs.length / 2)).map((f): [string, string] => [f.question, f.answer]);

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'SEO Services', path: '/seo-services' }, { name: 'Jaisalmer', path: '/seo-company-jaisalmer' }];
  const schema: object[] = [orgSchema, breadcrumbSchema(crumbs)];
  if (dedupedFaqs.length) schema.push(faqSchema(dedupedFaqs.map((f): [string, string] => [f.question, f.answer])));

  return (
    <>
      <Seo
        title={data?.seo?.meta_title || 'SEO Company in Jaisalmer | Shrinath Solutions'}
        description={data?.seo?.meta_description || 'Grow your business with Shrinath Solutions, a trusted SEO company in Jaisalmer offering local SEO, Google Maps SEO, website audits and content marketing.'}
        path="/seo-company-jaisalmer"
        jsonLd={schema}
      />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-shell px-[22px] pt-6 flex flex-wrap items-center gap-1.5 text-sm" style={{ color: 'rgba(226,234,255,.5)' }}>
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" style={{ color: '#cfe0ff' }}>{c.name}</span>
            ) : (
              <Link to={c.path} style={{ color: 'rgba(226,234,255,.62)' }}>{c.name}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-6 grid gap-11 items-center lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>SEO Services in Jaisalmer</div>
          <h1 className="font-heading font-extrabold text-[clamp(32px,4.4vw,52px)] leading-[1.08] mt-3 mb-0 max-w-[600px]" style={{ letterSpacing: '-0.03em' }}>
            SEO Company in Jaisalmer
          </h1>
          <p className="text-[17.5px] mt-5 max-w-[560px]" style={{ color: 'rgba(226,234,255,.74)' }}>
            {heroIntro || 'We help businesses rank higher on Google, get more website traffic, and turn visitors into customers.'}
          </p>
          <div className="flex flex-wrap gap-3.5 mt-7">
            <button type="button" onClick={() => contactRef.current?.scrollIntoView({ behavior: 'smooth' })} className="px-7 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>
              Get Free SEO Audit
            </button>
            <a href={wa('Hi Shrinath Solutions, I would like a free SEO audit for my business in Jaisalmer.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>
              <MessageCircle size={16} aria-hidden="true" /> Chat on WhatsApp
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 mt-8 text-[14.5px]" style={{ color: 'rgba(214,225,255,.68)' }}>
            <span className="flex items-center gap-1.5">
              <span className="flex" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} color="#f59e0b" fill="#f59e0b" />)}</span>
              4.9/5 <span style={{ color: 'rgba(226,234,255,.45)' }}>(58+ Reviews)</span>
            </span>
            <span>120+ Projects Completed</span>
            <span>5+ Years SEO Experience</span>
          </div>
        </div>
        <DashboardVisual />
      </section>

      {/* Sticky tab nav */}
      <div className="sticky z-30 mt-11" style={{ top: 0, background: 'rgba(6,10,23,.9)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <nav aria-label="Page sections" className="mx-auto max-w-shell px-[22px] flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="shrink-0 px-4 py-3.5 text-[14.5px] font-semibold whitespace-nowrap"
              style={{ color: active === t.id ? '#fff' : 'rgba(226,234,255,.55)', borderBottom: '2px solid ' + (active === t.id ? '#3b6bff' : 'transparent') }}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Overview */}
      <section id="overview" className="mx-auto max-w-shell px-[22px] pt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
        <div>
          <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] leading-[1.15] m-0">Professional SEO Services in Jaisalmer</h2>
          <div className="grid gap-4 mt-4 max-w-[680px]">
            {aboutParas.map((p, i) => <p key={i} className="m-0 text-[16.5px]" style={{ color: muted, lineHeight: 1.72 }}>{p}</p>)}
          </div>
        </div>
        <div className="p-6 rounded-[22px] grid grid-cols-2 gap-4" style={glass}>
          {glanceStats.map((s) => (
            <div key={s.label}>
              <div className="font-heading font-extrabold text-[26px]" style={{ color: '#ffb182' }}>{s.value}</div>
              <div className="text-[13px] mt-1" style={{ color: muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">Our SEO Services</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CARDS.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}>
              <Link to={s.to} className="group block h-full p-6 rounded-[20px] !text-paper transition-all hover:-translate-y-0.5" style={glass}>
                <span className="grid place-items-center" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(59,107,255,.2)', border: '1px solid rgba(255,255,255,.16)' }}>
                  <s.icon size={19} color="#7dd3fc" aria-hidden="true" />
                </span>
                <h3 className="font-heading font-bold text-[17.5px] mt-3.5 mb-1.5">{s.title}</h3>
                <p className="m-0 text-[14.5px]" style={{ color: muted }}>{s.body}</p>
                <span className="inline-flex items-center gap-1 mt-3.5 font-bold text-[13.5px]" style={{ color: '#7dd3fc' }}>
                  Learn more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">Why Your Business Needs SEO</h2>
        <div className="grid gap-6 mt-6 lg:grid-cols-[1fr_1.3fr] items-start">
          <div className="grid gap-4 max-w-[420px]">
            {whyParas.map((p, i) => <p key={i} className="m-0 text-[15.8px]" style={{ color: muted, lineHeight: 1.7 }}>{p}</p>)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {BENEFIT_CARDS.map((b) => (
              <div key={b.title} className="p-5 rounded-[18px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
                <b.icon size={20} color="#6ee7b7" aria-hidden="true" />
                <div className="font-heading font-bold text-[15px] mt-2.5 mb-1">{b.title}</div>
                <p className="m-0 text-[13.5px]" style={{ color: muted }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hotels & tourism */}
      <section className="mx-auto max-w-shell px-[22px] pt-16">
        <div className="grid gap-8 lg:grid-cols-2 items-center p-7 md:p-9 rounded-[26px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
          <div>
            <h2 className="font-heading font-bold text-[clamp(24px,2.6vw,32px)] leading-[1.15] m-0">SEO for Hotels &amp; Tourism Businesses</h2>
            <div className="grid gap-3.5 mt-4">
              {tourismParas.map((p, i) => <p key={i} className="m-0 text-[15.5px]" style={{ color: muted, lineHeight: 1.7 }}>{p}</p>)}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {TOURISM_TAGS.map((t) => (
                <span key={t} className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', color: 'rgba(226,234,255,.72)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
            <DesertIllustration />
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">Our SEO Work Process</h2>
        <div className="hidden lg:block relative mt-9">
          <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 23, height: 1, background: 'linear-gradient(90deg, rgba(125,211,252,.4), rgba(123,92,255,.4), rgba(255,138,69,.4))' }} />
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${processSteps.length || 6}, 1fr)` }}>
            {processSteps.map((s) => (
              <div key={s.num} className="text-center px-2">
                <span className="grid place-items-center mx-auto rounded-full font-heading font-extrabold text-[14px]" style={{ width: 46, height: 46, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#22d3ee)', color: '#fff', boxShadow: '0 0 0 6px #060a17' }}>
                  {s.num}
                </span>
                <h3 className="font-heading font-bold text-[15.5px] mt-3 mb-1.5">{s.title}</h3>
                <p className="m-0 text-[13.5px]" style={{ color: muted }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:hidden mt-8 grid gap-5">
          {processSteps.map((s) => (
            <div key={s.num} className="flex gap-4">
              <span className="grid place-items-center shrink-0 rounded-full font-heading font-extrabold text-[13px]" style={{ width: 38, height: 38, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#22d3ee)', color: '#fff' }}>
                {s.num}
              </span>
              <div>
                <h3 className="font-heading font-bold text-[16px] m-0">{s.title}</h3>
                <p className="m-0 mt-1 text-[14px]" style={{ color: muted }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose + case study */}
      <section id="case-study" className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">Why Choose Shrinath Solutions?</h2>
        <div className="grid gap-6 mt-6 lg:grid-cols-2 items-start">
          <div>
            <div className="grid gap-3.5 mb-6">
              {whyChooseParas.map((p, i) => <p key={i} className="m-0 text-[15.5px]" style={{ color: muted, lineHeight: 1.7 }}>{p}</p>)}
            </div>
            <div className="grid gap-2.5">
              {WHY_CHOOSE.map((w) => (
                <div key={w} className="flex items-center gap-2.5 text-[15px] font-medium">
                  <CheckCircle2 size={17} color="#6ee7b7" className="shrink-0" aria-hidden="true" />
                  {w}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 p-5 rounded-[20px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
              {resultStats.map((s) => (
                <div key={s.label}>
                  <div className="font-heading font-extrabold text-[20px]" style={{ color: '#ffb182' }}>{s.value}</div>
                  <div className="text-[12.5px] mt-0.5" style={{ color: muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-[20px]" style={{ border: '1px solid rgba(255,255,255,.11)', background: 'linear-gradient(160deg, rgba(59,107,255,.14), rgba(123,92,255,.08))' }}>
              <div className="text-[13px] font-bold uppercase tracking-[.1em] mb-3" style={{ color: '#7dd3fc' }}>{caseStudyTitle}</div>
              <div className="flex gap-5 flex-wrap mb-4">
                {caseStudyStats.map((s) => (
                  <div key={s.label}>
                    <div className="font-heading font-bold text-[19px]" style={{ color: '#6ee7b7' }}>{s.value}</div>
                    <div className="text-[12px]" style={{ color: muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
                <span className="grid place-items-center rounded-full font-heading font-bold shrink-0" style={{ width: 42, height: 42, background: 'linear-gradient(140deg,#3b6bff,#22d3ee)' }} aria-hidden="true">{caseStudyInitials}</span>
                <div>
                  <p className="m-0 text-[14.5px] italic" style={{ color: 'rgba(226,234,255,.85)' }}>
                    &ldquo;{caseStudyQuote}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[13.5px] font-bold">{caseStudyName}</span>
                    <span className="text-[12.5px]" style={{ color: muted }}>{caseStudyRole}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <section className="mx-auto max-w-shell px-[22px] pt-16">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between p-7 md:p-8 rounded-[22px]" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'linear-gradient(120deg, rgba(59,107,255,.22), rgba(123,92,255,.16))' }}>
          <div className="flex items-center gap-4">
            <span className="grid place-items-center rounded-full shrink-0" style={{ width: 52, height: 52, background: 'rgba(255,255,255,.1)' }}>
              <Target size={24} aria-hidden="true" />
            </span>
            <div>
              <div className="font-heading font-bold text-[19px]">{data?.page.cta_heading || 'Ready to Rank Higher in Jaisalmer?'}</div>
              <p className="m-0 mt-1 text-[14.5px]" style={{ color: 'rgba(226,234,255,.72)' }}>{data?.page.cta_body || 'Get an SEO plan tailored to your business goals and budget. Let’s grow your business together.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => contactRef.current?.scrollIntoView({ behavior: 'smooth' })} className="shrink-0 inline-flex items-center gap-1.5 px-6 py-3.5 rounded-full font-heading font-bold text-[15px] whitespace-nowrap" style={emberBtn}>
            Get a Custom SEO Plan <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-[13px]" style={{ color: muted }}>
          <span>No Contracts</span><span>&bull;</span><span>Cancel Anytime</span>
        </div>
      </section>

      {/* FAQs */}
      {dedupedFaqs.length > 0 && (
        <section id="faqs" className="mx-auto max-w-shell px-[22px] pt-16">
          <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] mb-6">Frequently Asked Questions</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="[&>section]:pt-0 [&>section]:px-0">
              <Faq faqs={faqLeft} heading="" />
            </div>
            {faqRight.length > 0 && (
              <div className="[&>section]:pt-0 [&>section]:px-0">
                <Faq faqs={faqRight} heading="" />
              </div>
            )}
          </div>
          <p className="mt-5 text-[14.5px]" style={{ color: muted }}>
            Have more questions? <Link to="/contact" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Contact us anytime.</Link>
          </p>
        </section>
      )}

      {/* Contact */}
      <section ref={contactRef} className="mx-auto max-w-shell px-[22px] pt-16 pb-4">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] p-7 md:p-9 rounded-[26px]" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}>
          <div>
            <h2 className="font-heading font-bold text-[26px] m-0">Let&rsquo;s Grow Your Business</h2>
            <p className="mt-2 mb-5 text-[15px]" style={{ color: muted }}>Have a project in mind? Get in touch with our SEO experts for a free consultation.</p>
            <div className="grid gap-3">
              <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                <span className="grid place-items-center rounded-full" style={{ width: 34, height: 34, background: 'rgba(37,211,102,.16)' }}><MessageCircle size={15} color="#25d366" aria-hidden="true" /></span>
                WhatsApp Us <span style={{ color: muted, fontWeight: 500 }}>{site.phone}</span>
              </a>
              <a href={site.phoneHref} className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                <span className="grid place-items-center rounded-full" style={{ width: 34, height: 34, background: 'rgba(59,107,255,.18)' }}><Phone size={15} color="#7dd3fc" aria-hidden="true" /></span>
                Call Us <span style={{ color: muted, fontWeight: 500 }}>{site.phone}</span>
              </a>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                <span className="grid place-items-center rounded-full" style={{ width: 34, height: 34, background: 'rgba(123,92,255,.18)' }}><Mail size={15} color="#a78bfa" aria-hidden="true" /></span>
                Email Us <span style={{ color: muted, fontWeight: 500 }}>{site.email}</span>
              </a>
            </div>
          </div>
          <EnquiryForm
            fields={[
              { label: 'Full Name', name: 'name', type: 'text', placeholder: 'Your name', required: true },
              { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+91', required: true },
            ]}
            services={['Hotel or Resort', 'Travel Agency', 'Tour Operator', 'Homestay', 'Restaurant', 'Other local business']}
            source="SEO company Jaisalmer page"
            autoOpenWhatsApp={false}
          />
        </div>
      </section>
    </>
  );
}
