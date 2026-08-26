import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Globe2, MapPinned,
  MessageCircle, ShieldCheck, Sparkles, Star, Clock, Headset, Smartphone, SearchCheck,
} from 'lucide-react';
import Seo, { orgSchema } from '../components/Seo';
import EnquiryForm from '../components/EnquiryForm';
import { Section } from '../components/Sections';
import BlogThumb from '../components/BlogThumb';
import * as h from '../data/home';
import { site, wa } from '../data/site';
import { emberBtn, ghostBtn, glass, muted } from '../styles/theme';

const websiteSchema = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url };

const WHY_ICONS = [MapPinned, Sparkles, SearchCheck, Smartphone, MessageCircle, Headset];

function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith('http') ? path : `/api/${path}`;
}

/* ---------------------------------- Hero visual ---------------------------------- */

function GrowthSystemVisual() {
  return (
    <div className="relative">
      <div
        className="rounded-[26px] overflow-hidden"
        style={{ ...glass, background: 'rgba(255,255,255,.055)', animation: 'floatY 10s ease-in-out infinite' }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)' }}>
          {['#ff6a1f', '#fbbf24', '#34d399'].map((c) => (
            <span key={c} className="rounded-full" style={{ width: 11, height: 11, background: c }} />
          ))}
          <span className="ml-2.5 text-[13px] px-3.5 py-1 rounded-full" style={{ color: 'rgba(226,234,255,.6)', background: 'rgba(0,0,0,.25)' }}>
            shrinathsolutions.com
          </span>
        </div>

        <div className="p-6" style={{ background: 'radial-gradient(circle at 30% 10%, rgba(59,107,255,.22), rgba(6,10,23,0) 60%)' }}>
          <div className="text-[12.5px] uppercase tracking-[.14em] mb-4" style={{ color: 'rgba(226,234,255,.5)' }}>
            Digital growth system
          </div>
          <div className="grid gap-0">
            {h.growthSystemSteps.map((step, i) => (
              <div key={step}>
                <div
                  className="flex items-center gap-3.5 p-4 rounded-2xl"
                  style={{
                    border: '1px solid rgba(255,255,255,.12)',
                    background: i === h.growthSystemSteps.length - 1 ? 'linear-gradient(120deg, rgba(255,122,47,.22), rgba(255,122,47,.06))' : 'rgba(255,255,255,.05)',
                  }}
                >
                  <span
                    className="grid place-items-center rounded-full font-heading font-bold text-[13.5px] shrink-0"
                    style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="font-heading font-semibold text-[16px]">{step}</span>
                  <span
                    className="ml-auto rounded-full"
                    aria-hidden="true"
                    style={{ width: 8, height: 8, background: '#6ee7b7', boxShadow: '0 0 10px #6ee7b7', animation: i === 0 ? 'pulseDot 2.4s ease-in-out infinite' : undefined }}
                  />
                </div>
                {i < h.growthSystemSteps.length - 1 && (
                  <div className="flex justify-start pl-[34px]" aria-hidden="true">
                    <div style={{ width: 1, height: 18, background: 'linear-gradient(180deg, rgba(125,211,252,.5), rgba(123,92,255,.5))' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute -z-10 rounded-full"
        style={{ width: 220, height: 220, right: 10, top: 10, background: 'radial-gradient(circle, rgba(34,211,238,.25), transparent 70%)', filter: 'blur(30px)' }}
      />
    </div>
  );
}

/* ---------------------------------- Trust strip ---------------------------------- */

function TrustStrip() {
  const items = [...h.specialisations, ...h.specialisations];
  return (
    <section aria-label="Who we specialise in" className="mt-10 py-6 group" style={{ borderTop: '1px solid rgba(255,255,255,.07)', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
      <div className="text-center text-[13px] uppercase tracking-[.16em]" style={{ color: 'rgba(226,234,255,.45)' }}>
        Built for hospitality &amp; local business
      </div>
      <div className="overflow-hidden mt-4" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
        <div className="flex gap-4 py-1 group-hover:[animation-play-state:paused]" style={{ width: 'max-content', animation: 'marquee 30s linear infinite' }}>
          {items.map((l, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-heading font-semibold text-[14.5px] px-4" style={{ minWidth: 178, height: 52, borderRadius: 14, border: '1px solid rgba(255,255,255,.12)', color: 'rgba(226,234,255,.7)', background: 'rgba(255,255,255,.03)' }}>
              <ShieldCheck size={16} color="#7dd3fc" aria-hidden="true" /> {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Services bento ---------------------------------- */

function PrimaryServiceCard({ s, i }: { s: (typeof h.primaryServices)[number]; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.06 }}>
      <Link to={s.to} className="group block h-full p-6 rounded-[24px] !text-paper transition-all hover:-translate-y-1" style={{ ...glass, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at 85% 0%, rgba(125,211,252,.16), transparent 60%)' }} />
        <span className="grid place-items-center text-[21px] relative" style={{ width: 48, height: 48, borderRadius: 14, background: s.tint, border: '1px solid rgba(255,255,255,.18)' }}>{s.glyph}</span>
        <div className="font-heading font-bold text-[19.5px] mt-4 mb-2 relative">{s.title}</div>
        <p className="m-0 text-[15.4px] relative" style={{ color: muted }}>{s.body}</p>
        <div className="flex flex-wrap gap-1.5 mt-4 relative">
          {s.tags.map((t) => (
            <span key={t} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.13)', color: 'rgba(226,234,255,.68)' }}>{t}</span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 mt-5 font-bold text-[14.5px] relative" style={{ color: '#ffb182' }}>
          {s.linkText} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

function SecondaryServiceCard({ s, i }: { s: (typeof h.secondaryServices)[number]; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45, delay: i * 0.05 }}>
      <Link to={s.to} className="group flex items-start gap-3.5 h-full p-5 rounded-[20px] !text-paper transition-all hover:-translate-y-0.5" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
        <span className="grid place-items-center text-[17px] shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: s.tint, border: '1px solid rgba(255,255,255,.16)' }}>{s.glyph}</span>
        <div className="min-w-0">
          <div className="font-heading font-bold text-[16px]">{s.title}</div>
          <p className="m-0 mt-1 text-[14px] leading-snug" style={{ color: 'rgba(226,234,255,.6)' }}>{s.body}</p>
          <span className="inline-flex items-center gap-1 mt-2.5 font-bold text-[13px]" style={{ color: '#7dd3fc' }}>
            {s.linkText} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ---------------------------------- Hotel technology ecosystem ---------------------------------- */

function HotelEcosystem() {
  const [node, setNode] = useState(0);
  const active = h.ecosystem[node];

  return (
    <div className="grid gap-6 mt-7 p-6 md:p-7 rounded-[28px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
      <div role="tablist" aria-label="Hotel technology modules" className="grid grid-cols-2 gap-3 content-start">
        {h.ecosystem.map((n, i) => (
          <button
            key={n.name}
            type="button"
            role="tab"
            aria-selected={node === i}
            tabIndex={node === i ? 0 : -1}
            onClick={() => setNode(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setNode((node + 1) % h.ecosystem.length);
              if (e.key === 'ArrowLeft') setNode((node - 1 + h.ecosystem.length) % h.ecosystem.length);
            }}
            className="text-left p-4 rounded-2xl font-semibold text-[15px] transition-all hover:-translate-y-0.5"
            style={{
              border: '1px solid ' + (node === i ? 'rgba(125,211,252,.6)' : 'rgba(255,255,255,.12)'),
              background: node === i ? 'rgba(59,107,255,.24)' : 'rgba(255,255,255,.04)',
              color: '#e9efff',
            }}
          >
            <span className="block text-[19px] mb-1.5" aria-hidden="true">{n.glyph}</span>
            {n.name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="p-7 rounded-[24px] relative overflow-hidden"
        style={{ background: 'radial-gradient(circle at 30% 20%, rgba(59,107,255,.3), rgba(6,10,23,.6) 70%)', border: '1px solid rgba(255,255,255,.14)' }}
      >
        <div className="inline-flex px-3.5 py-1.5 rounded-full text-[13px] font-bold uppercase tracking-[.06em]" style={{ background: 'rgba(255,255,255,.1)', color: '#cfe0ff' }}>
          Shrinath Solutions at the centre
        </div>
        <motion.div key={active.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <h3 className="font-heading font-bold text-[27px] mt-4 mb-2.5">{active.name}</h3>
          <p className="m-0 text-[16.5px]" style={{ color: 'rgba(226,234,255,.74)' }}>{active.body}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {active.feeds.map((f) => (
              <span key={f} className="text-[13.5px] px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(226,234,255,.78)' }}>connects to {f}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------------------------- Six-step process ---------------------------------- */

function ProcessTimeline() {
  return (
    <div className="relative mt-8">
      <div className="hidden lg:block absolute left-0 right-0" style={{ top: 26, height: 1, background: 'linear-gradient(90deg, rgba(125,211,252,.4), rgba(123,92,255,.4), rgba(255,138,69,.4))' }} aria-hidden="true" />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {h.process.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="relative p-5 rounded-[20px]"
              style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.045)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="grid place-items-center rounded-full font-heading font-extrabold text-[15px] shrink-0"
                  style={{ width: 40, height: 40, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#ff8a45)', color: '#fff' }}
                >
                  {s.num}
                </span>
                <h3 className="font-heading font-bold text-[18px] m-0">{s.title}</h3>
              </div>
              <p className="m-0 text-[15px]" style={{ color: 'rgba(226,234,255,.68)' }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Industries ---------------------------------- */

function IndustriesGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-7">
      {h.industries.map((ind, i) => (
        <motion.div
          key={ind.name}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
          className="p-4 rounded-[18px] text-center"
          style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}
        >
          <span className="grid place-items-center mx-auto text-[16px]" style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(59,107,255,.18)', border: '1px solid rgba(255,255,255,.14)' }} aria-hidden="true">
            {ind.glyph}
          </span>
          <div className="font-semibold text-[13.5px] mt-2.5 leading-tight">{ind.name}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------------------------- Portfolio (live) ---------------------------------- */

type PortfolioRow = {
  title: string; slug: string; category: string | null; short_description: string | null;
  featured_image: string | null; is_featured: number | boolean; results_json: unknown;
};

function PortfolioMedia({ image, title, tall }: { image: string | null; title: string; tall?: boolean }) {
  const src = mediaUrl(image);
  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: tall ? '16/13' : '16/10', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
      {src ? (
        <img src={src} alt={title} loading="lazy" width={1200} height={tall ? 975 : 750} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full grid place-items-center" style={{ background: 'linear-gradient(150deg, rgba(59,107,255,.28), rgba(123,92,255,.18) 55%, rgba(34,211,238,.14))' }}>
          <span className="font-heading font-extrabold text-[15px] uppercase tracking-[.1em]" style={{ color: 'rgba(255,255,255,.55)' }}>Shrinath Solutions</span>
        </div>
      )}
    </div>
  );
}

function FeaturedPortfolio() {
  const [projects, setProjects] = useState<PortfolioRow[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/portfolio', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.projects)) {
          const sorted = [...data.projects].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
          setProjects(sorted.slice(0, 3));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (projects !== null && projects.length === 0) return null;

  const [main, ...rest] = projects ?? [];

  return (
    <Section heading="Work built for Rajasthan's hospitality economy." body="Real projects, from the properties and businesses we work with.">
      {!projects ? (
        <div className="grid gap-4 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {[0, 1, 2].map((i) => <div key={i} className="rounded-[24px] animate-pulse" style={{ aspectRatio: '4/5', background: 'rgba(255,255,255,.04)' }} />)}
        </div>
      ) : (
        <div className="grid gap-5 mt-8 lg:grid-cols-2">
          <article className="group rounded-[24px] overflow-hidden" style={glass}>
            <Link to={main.slug ? `/portfolio/${main.slug}` : '/portfolio'}>
              <PortfolioMedia image={main.featured_image} title={main.title} tall />
            </Link>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {main.category && <span className="text-[12.5px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(34,211,238,.14)', border: '1px solid rgba(34,211,238,.3)', color: '#a5f3fc' }}>{main.category}</span>}
              </div>
              <h3 className="font-heading font-bold text-[23px] mt-0 mb-2">{main.title}</h3>
              {main.short_description && <p className="mb-4 text-[15.8px]" style={{ color: muted }}>{main.short_description}</p>}
              <Link to={main.slug ? `/portfolio/${main.slug}` : '/portfolio'} className="inline-flex items-center gap-1.5 font-bold text-[14.5px]" style={{ color: '#ffb182' }}>
                View Case Study <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>

          <div className="grid gap-5 content-start">
            {rest.map((p) => (
              <article key={p.slug || p.title} className="group rounded-[24px] overflow-hidden grid sm:grid-cols-[160px_1fr]" style={glass}>
                <Link to={p.slug ? `/portfolio/${p.slug}` : '/portfolio'} className="block h-full">
                  <PortfolioMedia image={p.featured_image} title={p.title} />
                </Link>
                <div className="p-5">
                  {p.category && <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,211,238,.14)', border: '1px solid rgba(34,211,238,.3)', color: '#a5f3fc' }}>{p.category}</span>}
                  <h3 className="font-heading font-bold text-[17px] mt-2 mb-1.5">{p.title}</h3>
                  <Link to={p.slug ? `/portfolio/${p.slug}` : '/portfolio'} className="inline-flex items-center gap-1.5 font-bold text-[13.5px]" style={{ color: '#ffb182' }}>
                    View Case Study <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ---------------------------------- Testimonials (live) ---------------------------------- */

type Testimonial = { id: number; client_name: string; business_name: string | null; client_image: string | null; quote: string; service_used: string | null; rating: number | null };

function TestimonialsSection() {
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/testimonials', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.success && Array.isArray(data.testimonials)) setItems(data.testimonials); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!items || items.length === 0) return null;
  const quote = items[t % items.length];

  return (
    <Section heading="What clients say">
      <div className="p-9 rounded-[28px] mt-6" style={{ border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.05)' }}>
        {items.length > 1 && (
          <div className="flex justify-end gap-2.5">
            <button type="button" aria-label="Previous testimonial" onClick={() => setT((t + items.length - 1) % items.length)} className="grid place-items-center rounded-full" style={{ width: 46, height: 46, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)', color: '#fff' }}>
              <ArrowLeft size={18} strokeWidth={2.75} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next testimonial" onClick={() => setT((t + 1) % items.length)} className="grid place-items-center rounded-full" style={{ width: 46, height: 46, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)', color: '#fff' }}>
              <ArrowRight size={18} strokeWidth={2.75} aria-hidden="true" />
            </button>
          </div>
        )}
        {quote.rating && (
          <div className="flex gap-1 mt-1" aria-label={`${quote.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={16} fill={i < quote.rating! ? '#f59e0b' : 'none'} color="#f59e0b" aria-hidden="true" />
            ))}
          </div>
        )}
        <blockquote className="font-heading font-semibold text-[clamp(20px,2.4vw,30px)] leading-[1.35] mt-4 mx-0 mb-0">{quote.quote}</blockquote>
        <div className="flex items-center gap-3.5 mt-5">
          {mediaUrl(quote.client_image) ? (
            <img src={mediaUrl(quote.client_image)!} alt="" width={46} height={46} className="rounded-full object-cover" style={{ width: 46, height: 46 }} />
          ) : (
            <span className="grid place-items-center rounded-full font-bold" style={{ width: 46, height: 46, background: 'linear-gradient(140deg,#3b6bff,#22d3ee)' }} aria-hidden="true">
              {quote.client_name.charAt(0)}
            </span>
          )}
          <div>
            <div className="font-bold">{quote.client_name}</div>
            <div className="text-[14.5px]" style={{ color: 'rgba(226,234,255,.6)' }}>{[quote.business_name, quote.service_used].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------- Latest insights (live) ---------------------------------- */

type BlogRow = { title: string; slug: string; excerpt: string | null; featured_image: string | null; reading_time_minutes: number | null; published_at: string | null; category_name: string | null };

function InsightsSection() {
  const [posts, setPosts] = useState<BlogRow[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/blog?per_page=6', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.success && Array.isArray(data.posts)) setPosts(data.posts); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (posts !== null && posts.length === 0) return null;
  const [featured, ...rest] = posts ?? [];
  const compactRest = rest.slice(0, 2);
  const gridRest = rest.slice(2, 5);

  return (
    <Section heading="Latest insights" body="Practical notes on websites, SEO and hotel marketing.">
      {!posts ? (
        <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[0, 1, 2].map((i) => <div key={i} className="rounded-[22px] animate-pulse" style={{ height: 220, background: 'rgba(255,255,255,.04)' }} />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 mt-7 lg:grid-cols-2">
            <Link to={`/blog/${featured.slug}`} className="group block rounded-[24px] overflow-hidden !text-paper" style={glass}>
              <PortfolioMedia image={featured.featured_image} title={featured.title} tall />
              <div className="p-6">
                <div className="text-[13px] uppercase tracking-[.1em] font-bold" style={{ color: '#7dd3fc' }}>{featured.category_name ?? 'Blog'}</div>
                <div className="font-heading font-bold text-[22px] mt-2.5 mb-2.5 leading-tight">{featured.title}</div>
                {featured.excerpt && <div className="text-[15.5px] mb-3" style={{ color: muted }}>{featured.excerpt}</div>}
                <div className="flex items-center gap-3 text-[13.5px]" style={{ color: 'rgba(226,234,255,.45)' }}>
                  {featured.reading_time_minutes && <span className="flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {featured.reading_time_minutes} min read</span>}
                  {featured.published_at && <span>{new Date(featured.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                <span className="inline-flex items-center gap-1.5 mt-4 font-bold text-[14.5px]" style={{ color: '#ffb182' }}>
                  Read Article <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>

            <div className="grid gap-5 content-start">
              {compactRest.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="group block p-5 rounded-[20px] !text-paper" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
                  <div className="text-[12.5px] uppercase tracking-[.1em] font-bold" style={{ color: '#7dd3fc' }}>{p.category_name ?? 'Blog'}</div>
                  <div className="font-heading font-bold text-[17px] mt-2 mb-1.5 leading-tight">{p.title}</div>
                  <div className="flex items-center gap-3 text-[13px]" style={{ color: 'rgba(226,234,255,.45)' }}>
                    {p.reading_time_minutes && <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" /> {p.reading_time_minutes} min read</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {gridRest.length > 0 && (
            <div className="grid gap-5 mt-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridRest.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="group block rounded-[20px] overflow-hidden !text-paper" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
                  <BlogThumb category={p.category_name} className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="p-4">
                    <div className="text-[12px] uppercase tracking-[.1em] font-bold" style={{ color: '#7dd3fc' }}>{p.category_name ?? 'Blog'}</div>
                    <div className="font-heading font-bold text-[15.5px] mt-2 mb-1.5 leading-snug line-clamp-2">{p.title}</div>
                    {p.reading_time_minutes && (
                      <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'rgba(226,234,255,.45)' }}>
                        <Clock size={12} aria-hidden="true" /> {p.reading_time_minutes} min read
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[14.5px]"
              style={{ border: '1px solid rgba(255,255,255,.14)', color: 'rgba(226,234,255,.85)' }}
            >
              View All Articles <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---------------------------------- Home ---------------------------------- */

export default function Home() {
  const auditRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <Seo
        path="/"
        title="Shrinath Solutions | Website Designing, Digital Marketing & Hotel Technology in Jaisalmer"
        description="Shrinath Solutions helps hotels, travel companies and local businesses in Jaisalmer and across Rajasthan build powerful websites, improve Google visibility and generate more direct enquiries."
        jsonLd={[orgSchema, websiteSchema]}
      />

      {/* Hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-14 md:pt-16 grid gap-12 items-center lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full text-[13.5px] font-semibold" style={{ border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', color: '#cfe0ff' }}>
            <span className="rounded-full" aria-hidden="true" style={{ width: 8, height: 8, background: '#22d3ee', boxShadow: '0 0 12px #22d3ee', animation: 'pulseDot 2.2s ease-in-out infinite' }} />
            Hospitality Technology &amp; Digital Growth Partner
          </span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading font-extrabold text-[clamp(34px,4.8vw,58px)] leading-[1.08] mt-5 max-w-[640px]"
            style={{ letterSpacing: '-0.03em' }}
          >
            Websites, Marketing &amp; Hotel Technology Built to{' '}
            <span style={{ background: 'linear-gradient(105deg,#7dd3fc,#7b5cff 45%,#ff8a45)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Generate Direct Enquiries
            </span>
            .
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="text-[18px] mt-6 max-w-[600px]" style={{ color: 'rgba(226,234,255,.72)' }}>
            Shrinath Solutions helps hotels, desert camps, travel companies and ambitious local businesses build faster websites, improve Google visibility and turn more visitors into direct enquiries.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="flex flex-wrap gap-3.5 mt-8">
            <button type="button" onClick={() => auditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-8 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>
              Get Your Free Growth Audit
            </button>
            <Link to="/portfolio" className="px-8 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>View Our Work</Link>
          </motion.div>

          <motion.a
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}
            href={wa()} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-[14.5px] font-semibold"
            style={{ color: '#7dd3fc' }}
          >
            <MessageCircle size={15} aria-hidden="true" /> Or discuss your project on WhatsApp
          </motion.a>

          <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-8 text-[14px] font-medium" style={{ color: 'rgba(214,225,255,.65)' }}>
            {[MapPinned, Globe2, SearchCheck].map((Icon, i) => (
              <span key={h.heroTrustPoints[i]} className="flex items-center gap-1.5">
                <Icon size={15} color="#6ee7b7" aria-hidden="true" /> {h.heroTrustPoints[i]}
              </span>
            ))}
          </div>
        </div>

        <GrowthSystemVisual />
      </section>

      <TrustStrip />

      {/* Core services ecosystem */}
      <Section id="services" heading="Everything your property or business needs to be found and booked." body="Start with the piece that is holding your enquiries back.">
        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {h.primaryServices.map((s, i) => <PrimaryServiceCard key={s.title} s={s} i={i} />)}
        </div>
        <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.secondaryServices.map((s, i) => <SecondaryServiceCard key={s.title} s={s} i={i} />)}
        </div>
      </Section>

      {/* Qualitative proof — no invented numbers */}
      <Section heading="What working with us actually looks like" body="No invented statistics — just how projects are run, start to finish.">
        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CheckCircle2, title: 'One connected build', body: 'Website, SEO and hotel technology planned together, not handed to separate vendors.' },
            { icon: Smartphone, title: 'Mobile-first from day one', body: 'Every page is designed and tested for the phone screen first, desktop second.' },
            { icon: SearchCheck, title: 'Search-ready structure', body: 'Clean markup, schema and page speed considered during build, not patched later.' },
            { icon: Headset, title: 'Support after launch', body: 'Maintenance, seasonal updates and campaign changes stay part of the relationship.' },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45, delay: i * 0.06 }} className="p-5 rounded-[20px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}>
              <c.icon size={22} color="#7dd3fc" aria-hidden="true" />
              <div className="font-heading font-bold text-[16px] mt-3 mb-1.5">{c.title}</div>
              <p className="m-0 text-[14.5px]" style={{ color: 'rgba(226,234,255,.62)' }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <FeaturedPortfolio />

      {/* Why Shrinath Solutions */}
      <section className="mx-auto max-w-shell px-[22px] pt-16">
        <div className="max-w-[820px]">
          <div className="text-[13px] font-bold uppercase tracking-[.16em]" style={{ color: '#7dd3fc' }}>Why Shrinath Solutions</div>
          <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] leading-[1.12] mt-2 m-0">We build for enquiries, not for applause.</h2>
          <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>Hospitality is our home ground — we know where OTA commission leaks and why a fast mobile site wins the walk-in.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {h.whyPoints.map((it, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <motion.article key={it.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: (i % 6) * 0.06 }} className="p-6 rounded-[22px]" style={glass}>
                <span className="grid place-items-center text-[19px]" style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59,107,255,.2)', border: '1px solid rgba(255,255,255,.16)' }}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="font-heading font-bold text-[19px] mt-4 mb-2">{it.title}</h3>
                <p className="m-0 text-[15.4px]" style={{ color: muted }}>{it.body}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <Section heading="One connected system behind every direct booking." body="Select any piece to see how it feeds the rest.">
        <HotelEcosystem />
      </Section>

      <Section heading="Six steps from first call to steady growth.">
        <ProcessTimeline />
      </Section>

      <Section heading="Industries we serve">
        <IndustriesGrid />
      </Section>

      <TestimonialsSection />

      {/* Free audit */}
      <Section id="audit" heading="Free website & marketing audit" body="Send your details and we will review what is costing you enquiries.">
        <div ref={auditRef} className="grid gap-5 mt-7 items-start lg:grid-cols-2">
          <div className="p-8 rounded-[26px]" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(20px)' }}>
            <EnquiryForm fields={h.formFields} services={h.serviceOptions} source="Home audit form" autoOpenWhatsApp={false} />
          </div>
          <div className="grid gap-4">
            <div className="p-6 rounded-[24px]" style={{ border: '1px solid rgba(255,255,255,.11)', background: 'linear-gradient(160deg, rgba(59,107,255,.2), rgba(123,92,255,.1))' }}>
              <div className="font-heading font-bold text-[21px] mb-3.5">What the audit covers</div>
              <div className="grid gap-2.5">
                {h.auditPoints.map((a) => (
                  <div key={a} className="flex gap-2.5 text-[15.5px]" style={{ color: 'rgba(233,239,255,.85)' }}>
                    <CheckCircle2 size={18} color="#6ee7b7" className="shrink-0 mt-0.5" aria-hidden="true" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-[24px] flex items-start gap-3" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
              <ShieldCheck size={22} color="#7dd3fc" className="shrink-0" aria-hidden="true" />
              <p className="m-0 text-[14.5px]" style={{ color: 'rgba(226,234,255,.62)' }}>
                Your details go straight to our team and are never sold or shared. We reply with practical next steps, not a sales script.
              </p>
            </div>
            <a href={wa('Hi Shrinath Solutions, I would like a free website and marketing audit.')} target="_blank" rel="noopener noreferrer" className="text-center px-6 py-3.5 rounded-full font-bold" style={ghostBtn}>
              Or message us on WhatsApp
            </a>
          </div>
        </div>
      </Section>

      <InsightsSection />
    </>
  );
}
