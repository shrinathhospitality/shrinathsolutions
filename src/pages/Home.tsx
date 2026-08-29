import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Globe2, MapPinned,
  MessageCircle, ShieldCheck, Sparkles, Star, Clock, Headset, Smartphone, SearchCheck,
} from 'lucide-react';
import Seo, { orgSchema, websiteSchema } from '../components/Seo';
import { useSeoOverride } from '../hooks/useSeoOverride';
import EnquiryForm from '../components/EnquiryForm';
import { Section } from '../components/Sections';
import BlogThumb from '../components/BlogThumb';
import * as h from '../data/home';
import { wa } from '../data/site';
import { emberBtn, ghostBtn, glass, muted } from '../styles/theme';
import { mediaUrl } from '../lib/media';

const WHY_ICONS = [MapPinned, Sparkles, SearchCheck, Smartphone, MessageCircle, Headset];

/* ---------------------------------- Hero visual ---------------------------------- */

function GrowthSystemVisual() {
  return (
    <div className="relative">
      <div
        className="rounded-[26px] overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', animation: 'floatY 10s ease-in-out infinite' }}
      >
        <div className="text-[12px] font-bold uppercase tracking-[.14em] px-6 pt-6" style={{ color: 'var(--color-primary)' }}>
          Digital Growth System
        </div>
        <div className="p-6 pt-4">
          <div className="grid gap-0">
            {h.growthSystemSteps.map((step, i) => (
              <div key={step}>
                <div
                  className="flex items-center gap-3.5 p-4 rounded-2xl"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: i === h.growthSystemSteps.length - 1 ? 'var(--color-surface-warm)' : 'var(--color-surface-alt)',
                  }}
                >
                  <span
                    className="grid place-items-center rounded-full font-heading font-bold text-[13.5px] shrink-0"
                    style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#3157e5,#7347e8 65%)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="font-heading font-semibold text-[16px]" style={{ color: 'var(--color-heading)' }}>{step}</span>
                  <span
                    className="ml-auto rounded-full"
                    aria-hidden="true"
                    style={{ width: 8, height: 8, background: 'var(--color-success)', animation: i === 0 ? 'pulseDot 2.4s ease-in-out infinite' : undefined }}
                  />
                </div>
                {i < h.growthSystemSteps.length - 1 && (
                  <div className="flex justify-start pl-[34px]" aria-hidden="true">
                    <div style={{ width: 1, height: 18, background: 'var(--color-border-strong)' }} />
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
        style={{ width: 220, height: 220, right: 10, top: 10, background: 'radial-gradient(circle, rgba(49,87,229,.14), transparent 70%)', filter: 'blur(30px)' }}
      />
    </div>
  );
}

/* ---------------------------------- Trust strip ---------------------------------- */

function TrustStrip() {
  const items = [...h.specialisations, ...h.specialisations];
  return (
    <section aria-label="Who we specialise in" className="mt-10 py-6 group" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="text-center text-[13px] uppercase tracking-[.16em]" style={{ color: 'var(--color-muted)' }}>
        Built for hospitality &amp; local business
      </div>
      <div className="overflow-hidden mt-4" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
        <div className="flex gap-4 py-1 group-hover:[animation-play-state:paused]" style={{ width: 'max-content', animation: 'marquee 30s linear infinite' }}>
          {items.map((l, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-heading font-semibold text-[14.5px] px-4" style={{ minWidth: 178, height: 52, borderRadius: 14, border: '1px solid var(--color-border)', color: 'var(--color-heading)', background: 'var(--color-surface-alt)' }}>
              <ShieldCheck size={16} color="var(--color-primary)" aria-hidden="true" /> {l}
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
      <Link to={s.to} className="group block h-full p-6 rounded-[24px] !text-heading transition-all hover:-translate-y-1" style={{ ...glass, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at 85% 0%, rgba(49,87,229,.06), transparent 60%)' }} />
        <span className="grid place-items-center text-[21px] relative" style={{ width: 48, height: 48, borderRadius: 14, background: s.tint, border: '1px solid var(--color-border)' }}>{s.glyph}</span>
        <div className="font-heading font-bold text-[19.5px] mt-4 mb-2 relative">{s.title}</div>
        <p className="m-0 text-[15.4px] relative" style={{ color: muted }}>{s.body}</p>
        <div className="flex flex-wrap gap-1.5 mt-4 relative">
          {s.tags.map((t) => (
            <span key={t} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-body)' }}>{t}</span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 mt-5 font-bold text-[14.5px] relative" style={{ color: 'var(--color-accent-hover)' }}>
          {s.linkText} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

function SecondaryServiceCard({ s, i }: { s: (typeof h.secondaryServices)[number]; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45, delay: i * 0.05 }}>
      <Link to={s.to} className="group flex items-start gap-3.5 h-full p-5 rounded-[20px] !text-heading transition-all hover:-translate-y-0.5" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <span className="grid place-items-center text-[17px] shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: s.tint, border: '1px solid var(--color-border)' }}>{s.glyph}</span>
        <div className="min-w-0">
          <div className="font-heading font-bold text-[16px]">{s.title}</div>
          <p className="m-0 mt-1 text-[14px] leading-snug" style={{ color: 'var(--color-body)' }}>{s.body}</p>
          <span className="inline-flex items-center gap-1 mt-2.5 font-bold text-[13px]" style={{ color: 'var(--color-primary)' }}>
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
    <div className="grid gap-6 mt-7 p-6 md:p-7 rounded-[28px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
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
              border: '1px solid ' + (node === i ? 'var(--color-primary)' : 'var(--color-border)'),
              background: node === i ? 'var(--color-surface-alt)' : 'var(--color-surface)',
              color: 'var(--color-heading)',
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
        style={{ background: 'linear-gradient(135deg, var(--color-surface-alt), var(--color-surface))', border: '1px solid var(--color-border)' }}
      >
        <div className="inline-flex px-3.5 py-1.5 rounded-full text-[13px] font-bold uppercase tracking-[.06em]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
          Shrinath Solutions at the centre
        </div>
        <motion.div key={active.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <h3 className="font-heading font-bold text-[27px] mt-4 mb-2.5" style={{ color: 'var(--color-heading)' }}>{active.name}</h3>
          <p className="m-0 text-[16.5px]" style={{ color: 'var(--color-body)' }}>{active.body}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {active.feeds.map((f) => (
              <span key={f} className="text-[13.5px] px-3 py-1.5 rounded-full" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-heading)' }}>connects to {f}</span>
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
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="grid place-items-center rounded-full font-heading font-extrabold text-[15px] shrink-0"
                  style={{ width: 40, height: 40, background: 'linear-gradient(140deg,#3157e5,#7347e8 55%,#ff7a3d)', color: '#fff' }}
                >
                  {s.num}
                </span>
                <h3 className="font-heading font-bold text-[18px] m-0" style={{ color: 'var(--color-heading)' }}>{s.title}</h3>
              </div>
              <p className="m-0 text-[15px]" style={{ color: 'var(--color-body)' }}>{s.body}</p>
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
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
        >
          <span className="grid place-items-center mx-auto text-[16px]" style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }} aria-hidden="true">
            {ind.glyph}
          </span>
          <div className="font-semibold text-[13.5px] mt-2.5 leading-tight" style={{ color: 'var(--color-heading)' }}>{ind.name}</div>
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
    <div className="relative overflow-hidden" style={{ aspectRatio: tall ? '16/13' : '16/10', borderBottom: '1px solid var(--color-border)' }}>
      {src ? (
        <img src={src} alt={title} loading="lazy" width={1200} height={tall ? 975 : 750} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full grid place-items-center" style={{ background: 'linear-gradient(150deg, rgba(49,87,229,.16), rgba(115,71,232,.1) 55%, rgba(255,122,61,.08))' }}>
          <span className="font-heading font-extrabold text-[15px] uppercase tracking-[.1em]" style={{ color: 'var(--color-primary)' }}>Shrinath Solutions</span>
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
          {[0, 1, 2].map((i) => <div key={i} className="rounded-[24px] animate-pulse" style={{ aspectRatio: '4/5', background: 'var(--color-surface-alt)' }} />)}
        </div>
      ) : (
        <div className="grid gap-5 mt-8 lg:grid-cols-2">
          <article className="group rounded-[24px] overflow-hidden" style={glass}>
            <Link to={main.slug ? `/portfolio/${main.slug}` : '/portfolio'}>
              <PortfolioMedia image={main.featured_image} title={main.title} tall />
            </Link>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {main.category && <span className="text-[12.5px] font-bold px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>{main.category}</span>}
              </div>
              <h3 className="font-heading font-bold text-[23px] mt-0 mb-2" style={{ color: 'var(--color-heading)' }}>{main.title}</h3>
              {main.short_description && <p className="mb-4 text-[15.8px]" style={{ color: muted }}>{main.short_description}</p>}
              <Link to={main.slug ? `/portfolio/${main.slug}` : '/portfolio'} className="inline-flex items-center gap-1.5 font-bold text-[14.5px]" style={{ color: 'var(--color-accent-hover)' }}>
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
                  {p.category && <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>{p.category}</span>}
                  <h3 className="font-heading font-bold text-[17px] mt-2 mb-1.5" style={{ color: 'var(--color-heading)' }}>{p.title}</h3>
                  <Link to={p.slug ? `/portfolio/${p.slug}` : '/portfolio'} className="inline-flex items-center gap-1.5 font-bold text-[13.5px]" style={{ color: 'var(--color-accent-hover)' }}>
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
      <div className="p-9 rounded-[28px] mt-6" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        {items.length > 1 && (
          <div className="flex justify-end gap-2.5">
            <button type="button" aria-label="Previous testimonial" onClick={() => setT((t + items.length - 1) % items.length)} className="grid place-items-center rounded-full" style={{ width: 46, height: 46, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-alt)', color: 'var(--color-heading)' }}>
              <ArrowLeft size={18} strokeWidth={2.75} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next testimonial" onClick={() => setT((t + 1) % items.length)} className="grid place-items-center rounded-full" style={{ width: 46, height: 46, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-alt)', color: 'var(--color-heading)' }}>
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
        <blockquote className="font-heading font-semibold text-[clamp(20px,2.4vw,30px)] leading-[1.35] mt-4 mx-0 mb-0" style={{ color: 'var(--color-heading)' }}>{quote.quote}</blockquote>
        <div className="flex items-center gap-3.5 mt-5">
          {mediaUrl(quote.client_image) ? (
            <img src={mediaUrl(quote.client_image)!} alt="" width={46} height={46} className="rounded-full object-cover" style={{ width: 46, height: 46 }} />
          ) : (
            <span className="grid place-items-center rounded-full font-bold text-white" style={{ width: 46, height: 46, background: 'linear-gradient(140deg,#3157e5,#22d3ee)' }} aria-hidden="true">
              {quote.client_name.charAt(0)}
            </span>
          )}
          <div>
            <div className="font-bold" style={{ color: 'var(--color-heading)' }}>{quote.client_name}</div>
            <div className="text-[14.5px]" style={{ color: 'var(--color-muted)' }}>{[quote.business_name, quote.service_used].filter(Boolean).join(' · ')}</div>
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
          {[0, 1, 2].map((i) => <div key={i} className="rounded-[22px] animate-pulse" style={{ height: 220, background: 'var(--color-surface-alt)' }} />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 mt-7 lg:grid-cols-2">
            <Link to={`/blog/${featured.slug}`} className="group block rounded-[24px] overflow-hidden !text-heading" style={glass}>
              <PortfolioMedia image={featured.featured_image} title={featured.title} tall />
              <div className="p-6">
                <div className="text-[13px] uppercase tracking-[.1em] font-bold" style={{ color: 'var(--color-primary)' }}>{featured.category_name ?? 'Blog'}</div>
                <div className="font-heading font-bold text-[22px] mt-2.5 mb-2.5 leading-tight">{featured.title}</div>
                {featured.excerpt && <div className="text-[15.5px] mb-3" style={{ color: muted }}>{featured.excerpt}</div>}
                <div className="flex items-center gap-3 text-[13.5px]" style={{ color: 'var(--color-muted)' }}>
                  {featured.reading_time_minutes && <span className="flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {featured.reading_time_minutes} min read</span>}
                  {featured.published_at && <span>{new Date(featured.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                <span className="inline-flex items-center gap-1.5 mt-4 font-bold text-[14.5px]" style={{ color: 'var(--color-accent-hover)' }}>
                  Read Article <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>

            <div className="grid gap-5 content-start">
              {compactRest.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="group block p-5 rounded-[20px] !text-heading" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <div className="text-[12.5px] uppercase tracking-[.1em] font-bold" style={{ color: 'var(--color-primary)' }}>{p.category_name ?? 'Blog'}</div>
                  <div className="font-heading font-bold text-[17px] mt-2 mb-1.5 leading-tight">{p.title}</div>
                  <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--color-muted)' }}>
                    {p.reading_time_minutes && <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" /> {p.reading_time_minutes} min read</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {gridRest.length > 0 && (
            <div className="grid gap-5 mt-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridRest.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="group block rounded-[20px] overflow-hidden !text-heading" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <BlogThumb category={p.category_name} image={p.featured_image} title={p.title} className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="p-4">
                    <div className="text-[12px] uppercase tracking-[.1em] font-bold" style={{ color: 'var(--color-primary)' }}>{p.category_name ?? 'Blog'}</div>
                    <div className="font-heading font-bold text-[15.5px] mt-2 mb-1.5 leading-snug line-clamp-2">{p.title}</div>
                    {p.reading_time_minutes && (
                      <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--color-muted)' }}>
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
              style={{ border: '1px solid var(--color-border-strong)', color: 'var(--color-heading)' }}
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
  const seoOverride = useSeoOverride('/');

  return (
    <>
      <Seo
        path="/"
        title={seoOverride?.title ?? "Shrinath Solutions | Website Designing, Digital Marketing & Hotel Technology in Jaisalmer"}
        description={seoOverride?.description ?? "Shrinath Solutions helps hotels, travel companies and local businesses in Jaisalmer and across Rajasthan build powerful websites, improve Google visibility and generate more direct enquiries."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, websiteSchema]}
      />

      {/* Hero */}
      <section
        className="relative"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(49,87,229,.10), transparent 35%), radial-gradient(circle at 90% 75%, rgba(255,122,61,.10), transparent 32%), linear-gradient(135deg, #eef4ff 0%, #ffffff 55%, #fff7f1 100%)',
        }}
      >
        <div className="mx-auto max-w-shell px-[22px] pt-14 md:pt-16 pb-14 grid gap-12 items-center lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full text-[13.5px] font-semibold" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-heading)', boxShadow: 'var(--shadow-card)' }}>
              <span className="rounded-full" aria-hidden="true" style={{ width: 8, height: 8, background: 'var(--color-primary)', boxShadow: '0 0 10px rgba(49,87,229,.5)', animation: 'pulseDot 2.2s ease-in-out infinite' }} />
              Hospitality Technology &amp; Digital Growth Partner
            </span>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-heading font-extrabold text-[clamp(34px,4.8vw,58px)] leading-[1.08] mt-5 max-w-[640px]"
              style={{ letterSpacing: '-0.03em', color: 'var(--color-heading)' }}
            >
              Websites, Marketing &amp; Hotel Technology Built to{' '}
              <span style={{ background: 'linear-gradient(105deg,#3157e5,#7347e8 45%,#ff7a3d)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Generate Direct Enquiries
              </span>
              .
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="text-[18px] mt-6 max-w-[600px]" style={{ color: 'var(--color-body)', lineHeight: 1.7 }}>
              Shrinath Solutions helps hotels, desert camps, travel companies and ambitious local businesses build faster websites, improve Google visibility and turn more visitors into direct enquiries.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="flex flex-wrap gap-3.5 mt-8">
              <button type="button" onClick={() => auditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-8 py-4 rounded-full font-heading font-bold text-[16px] transition hover:brightness-95" style={emberBtn}>
                Get Your Free Growth Audit
              </button>
              <Link to="/portfolio" className="px-8 py-4 rounded-full font-bold text-[16px] transition-colors hover:bg-[var(--color-surface-alt)]" style={ghostBtn}>View Our Work</Link>
            </motion.div>

            <motion.a
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}
              href={wa()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-[14.5px] font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              <MessageCircle size={15} aria-hidden="true" /> Or discuss your project on WhatsApp
            </motion.a>

            <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-8 text-[14px] font-medium" style={{ color: 'var(--color-body)' }}>
              {[MapPinned, Globe2, SearchCheck].map((Icon, i) => (
                <span key={h.heroTrustPoints[i]} className="flex items-center gap-1.5">
                  <Icon size={15} color="var(--color-success)" aria-hidden="true" /> {h.heroTrustPoints[i]}
                </span>
              ))}
            </div>
          </div>

          <GrowthSystemVisual />
        </div>
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
            <motion.div key={c.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45, delay: i * 0.06 }} className="p-5 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <c.icon size={22} color="var(--color-primary)" aria-hidden="true" />
              <div className="font-heading font-bold text-[16px] mt-3 mb-1.5" style={{ color: 'var(--color-heading)' }}>{c.title}</div>
              <p className="m-0 text-[14.5px]" style={{ color: 'var(--color-body)' }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <FeaturedPortfolio />

      {/* Why Shrinath Solutions */}
      <section className="mx-auto max-w-shell px-[22px] pt-16" style={{ background: 'var(--color-surface-alt)', paddingTop: 64, paddingBottom: 8 }}>
        <div className="max-w-[820px]">
          <div className="text-[13px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--color-primary)' }}>Why Shrinath Solutions</div>
          <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] leading-[1.12] mt-2 m-0" style={{ color: 'var(--color-heading)' }}>We build for enquiries, not for applause.</h2>
          <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>Hospitality is our home ground — we know where OTA commission leaks and why a fast mobile site wins the walk-in.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 pb-16">
          {h.whyPoints.map((it, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <motion.article key={it.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: (i % 6) * 0.06 }} className="p-6 rounded-[22px]" style={glass}>
                <span className="grid place-items-center text-[19px]" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                  <Icon size={20} color="var(--color-primary)" aria-hidden="true" />
                </span>
                <h3 className="font-heading font-bold text-[19px] mt-4 mb-2" style={{ color: 'var(--color-heading)' }}>{it.title}</h3>
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
          <div className="p-8 rounded-[26px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <EnquiryForm fields={h.formFields} services={h.serviceOptions} source="Home audit form" autoOpenWhatsApp={false} />
          </div>
          <div className="grid gap-4">
            <div className="p-6 rounded-[24px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
              <div className="font-heading font-bold text-[21px] mb-3.5" style={{ color: 'var(--color-heading)' }}>What the audit covers</div>
              <div className="grid gap-2.5">
                {h.auditPoints.map((a) => (
                  <div key={a} className="flex gap-2.5 text-[15.5px]" style={{ color: 'var(--color-heading)' }}>
                    <CheckCircle2 size={18} color="var(--color-success)" className="shrink-0 mt-0.5" aria-hidden="true" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-[24px] flex items-start gap-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <ShieldCheck size={22} color="var(--color-primary)" className="shrink-0" aria-hidden="true" />
              <p className="m-0 text-[14.5px]" style={{ color: 'var(--color-body)' }}>
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
