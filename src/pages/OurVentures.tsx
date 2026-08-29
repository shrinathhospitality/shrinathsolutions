import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import VentureCard from '../components/ventures/VentureCard';
import { VentureIcon } from '../components/ventures/ventureIcons';
import { ventures as staticVentures, VENTURE_CATEGORIES } from '../data/ventures';
import type { Venture } from '../types/venture';
import { site } from '../data/site';
import { useSeoOverride } from '../hooks/useSeoOverride';

type PublicVentureListItem = {
  name: string; slug: string; short_name: string | null; tagline: string; category: string; summary: string;
  theme: Venture['theme']; logo_image: string | null; hero_image: string | null; is_featured: boolean;
  phone_numbers: string[]; website_url: string | null; google_business_url: string | null;
};

/** Minimal Venture-shaped object for the card grid — this list view never needs
 *  services/sections/highlights/faqs/seo, so the public list endpoint deliberately doesn't
 *  send them (spec §6: don't load structured content the view doesn't use). */
function toCardVenture(v: PublicVentureListItem): Venture {
  return {
    slug: v.slug, name: v.name, shortName: v.short_name ?? undefined, tagline: v.tagline,
    category: v.category, summary: v.summary, phoneNumbers: v.phone_numbers,
    website: v.website_url ?? undefined, googleBusinessUrl: v.google_business_url ?? undefined,
    theme: v.theme, services: [], highlights: [], sections: [], faqs: [],
    seo: { title: v.name, description: v.summary, canonicalPath: `/our-ventures/${v.slug}` },
  };
}

/** One icon per business category, standing in for real group photography until the owner
 *  supplies approved images (see src/components/ventures/VentureImage.tsx for the per-venture
 *  equivalent). No "placeholder" text is shown to visitors. */
const CATEGORY_MOSAIC = ['Stamp', 'ShieldCheck', 'Tent', 'Compass', 'LayoutGrid'];

const trail = [{ name: 'Home', path: '/' }, { name: 'Our Ventures', path: '/our-ventures' }];

const rise = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 } };

export default function OurVentures() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  // Database is the primary source; the static ventures.ts snapshot is only ever shown if the
  // API is unavailable (build-time/runtime outage) — same fallback contract as VentureDetail.
  const [ventures, setVentures] = useState<Venture[]>(staticVentures);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/ventures')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success && Array.isArray(d.ventures) && d.ventures.length) {
          setVentures(d.ventures.map(toCardVenture));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = activeCategory === 'All' ? ventures : ventures.filter((v) => v.category === activeCategory);

  const schema = [
    orgSchema,
    breadcrumbSchema(trail),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: ventures.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: v.name,
        url: site.url + `/our-ventures/${v.slug}`,
      })),
    },
  ];

  const seoOverride = useSeoOverride('/our-ventures');

  return (
    <div style={{ background: '#fbf8f2', color: '#211d16' }}>
      <Seo
        path="/our-ventures"
        title={seoOverride?.title ?? "Our Ventures in Jaisalmer | Shrinath Solutions"}
        description={seoOverride?.description ?? "Explore the family of businesses built in Jaisalmer under Shrinath Solutions — legacy craft, technology, hospitality, travel and local digital platforms."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={schema}
      />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-shell px-[22px] pt-6 flex flex-wrap gap-2 text-[13.5px]">
        {trail.map((t, i) => {
          const last = i === trail.length - 1;
          return (
            <span key={t.path} className="flex gap-2">
              {last ? <span aria-current="page" style={{ color: '#211d16', fontWeight: 600 }}>{t.name}</span> : <Link to={t.path} style={{ color: '#8a8171' }}>{t.name}</Link>}
              {!last && <span style={{ color: '#8a8171' }}>/</span>}
            </span>
          );
        })}
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-8 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: '#a9793a' }}>Our Ventures</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(32px,4.4vw,52px)] leading-[1.08] mt-4 mb-0"
              style={{ letterSpacing: '-0.02em', color: '#1c1912' }}
            >
              Built in Jaisalmer. Serving Business, Hospitality and Travel.
            </motion.h1>
            <p className="text-[17.5px] mt-5" style={{ color: '#4c4638', lineHeight: 1.7 }}>
              Shrinath Solutions grew out of a single Jaisalmer workshop. Over the years, the same family of people extended
              that work into technology and security supply, desert hospitality, travel planning, hotel marketing and a pair
              of local digital platforms built for the city itself. Each venture below runs as its own business, serving its
              own customers — this page is simply a map of the family they belong to.
            </p>
            <div className="flex flex-wrap gap-3.5 mt-7">
              <a href="#ventures" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-heading font-bold text-[15px]" style={{ background: '#1c1912', color: '#fbf8f2' }}>
                Explore Our Ventures <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a href="#partner" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[15px]" style={{ border: '1.5px solid #1c1912', color: '#1c1912' }}>
                Partner With Us
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-hidden="true">
            {CATEGORY_MOSAIC.map((icon, i) => (
              <div
                key={icon}
                className={`rounded-[20px] grid place-items-center ${i === 0 ? 'col-span-2 aspect-[16/8]' : 'aspect-square'}`}
                style={{ background: `linear-gradient(135deg, #a9793a2e, #1c19121a)`, color: '#a9793a' }}
              >
                <VentureIcon name={icon} size={i === 0 ? 40 : 30} className="opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="flex flex-wrap gap-2.5">
          {['All', ...VENTURE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="px-4.5 py-2.5 rounded-full text-[14px] font-semibold transition-colors"
              style={
                activeCategory === cat
                  ? { background: '#1c1912', color: '#fbf8f2' }
                  : { border: '1px solid #d9d0bd', color: '#4c4638', background: '#fff' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Venture grid */}
      <section id="ventures" className="mx-auto max-w-shell px-[22px] pt-8 pb-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v, i) => <VentureCard key={v.slug} venture={v} index={i} />)}
        </div>
      </section>

      {/* Group story */}
      <section className="mx-auto max-w-shell px-[22px] pt-20">
        <motion.div {...rise} transition={{ duration: 0.5 }} className="max-w-[820px]">
          <h2 className="font-heading font-bold text-[clamp(26px,3vw,36px)] leading-[1.15] m-0" style={{ color: '#1c1912' }}>
            From a 40-Year Workshop to a Family of Businesses
          </h2>
          <div className="grid gap-4 mt-5 text-[16.5px]" style={{ color: '#4c4638', lineHeight: 1.75 }}>
            <p className="m-0">
              Shrinath Rubber Stamp has been producing stamps for Jaisalmer’s offices, hotels, schools and shops for forty
              years — the oldest and most established of the ventures in this group, and the root the rest grew from.
            </p>
            <p className="m-0">
              Over time, the same entrepreneurial approach extended into new areas: Shrinath Enterprise brought security,
              communication and IT supply to local properties; Shrinath Desert Camp and Shrinath Adventures moved into
              hospitality and travel planning; Sam Sand Dunes Desert Camp DMC opened a dedicated trade desk for travel
              agents; Shrinath Hospitality took on hotel marketing and management; Jaisalmer Adventures built an offbeat
              safari offering; and My Jaisalmer and Welcome to Jaisalmer became local digital platforms serving the wider
              city and its visitors.
            </p>
            <p className="m-0">
              Each venture has its own history and its own pace of growth — we have not invented founding dates or
              milestones for any business beyond the Rubber Stamp workshop’s well-established forty years.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Ecosystem */}
      <section className="mx-auto max-w-shell px-[22px] pt-16">
        <motion.div {...rise} transition={{ duration: 0.5 }} className="max-w-[820px]">
          <h2 className="font-heading font-bold text-[clamp(26px,3vw,36px)] leading-[1.15] m-0" style={{ color: '#1c1912' }}>
            How the Ventures Support Different Needs
          </h2>
          <p className="text-[16.5px] mt-5" style={{ color: '#4c4638', lineHeight: 1.75 }}>
            Technology and security supply, hotel marketing and management, travel planning and desert operations, and
            local digital platforms each solve a different problem for a different kind of customer — a hotel owner
            needing surveillance and a booking engine has a very different need from a travel agent sourcing a desert
            camp for a group. Where it is useful, one venture can point a customer toward another — a hotel working
            with Shrinath Hospitality might also need Shrinath Enterprise’s security systems, for example — but each
            venture is presented here as what it is: a distinct business with its own contact details, not a single
            combined entity, unless and until that is confirmed otherwise.
          </p>
        </motion.div>
      </section>

      {/* Partnership CTA */}
      <section id="partner" className="mx-auto max-w-shell px-[22px] pt-16">
        <motion.div {...rise} transition={{ duration: 0.5 }} className="rounded-[28px] p-8 md:p-12" style={{ background: '#1c1912', color: '#fbf8f2' }}>
          <h2 className="font-heading font-bold text-[clamp(24px,2.8vw,32px)] leading-[1.15] m-0">Partner With the Group</h2>
          <p className="mt-3.5 max-w-[640px] text-[16px]" style={{ color: 'rgba(251,248,242,.78)', lineHeight: 1.7 }}>
            Whether you’re a hotel owner exploring marketing support, a travel agent looking for desert-camp rates, a
            corporate client planning a Jaisalmer visit, a local business wanting a directory listing, or a production
            team scouting a shoot location — one of these ventures is likely the right starting point.
          </p>
          <div className="grid gap-2.5 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Hotel owners', '/our-ventures/shrinath-hospitality'],
              ['Travel agents', '/our-ventures/sam-sand-dunes-desert-camp-dmc'],
              ['Corporate clients', '/our-ventures/shrinath-adventures'],
              ['Local businesses', '/our-ventures/my-jaisalmer'],
              ['Production & shoot teams', '/our-ventures/shrinath-hospitality'],
            ].map(([label, to]) => (
              <Link key={label} to={to} className="flex items-center justify-between gap-2 px-5 py-3.5 rounded-[14px] font-semibold text-[14.5px] !text-current" style={{ border: '1px solid rgba(251,248,242,.2)' }}>
                {label} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact strip */}
      <section className="mx-auto max-w-shell px-[22px] py-16">
        <div className="flex flex-wrap items-center justify-between gap-5 p-6 rounded-[20px]" style={{ border: '1px solid #e3dbc8', background: '#fff' }}>
          <div>
            <div className="font-heading font-bold text-[17px]" style={{ color: '#1c1912' }}>Not sure which venture to contact?</div>
            <p className="m-0 mt-1 text-[14.5px]" style={{ color: '#5b5648' }}>Reach the Shrinath Solutions group office and we’ll point you the right way.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={site.phoneHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-[14px]" style={{ background: '#1c1912', color: '#fbf8f2' }}>
              <Phone size={15} aria-hidden="true" /> {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-[14px]" style={{ border: '1.5px solid #1c1912', color: '#1c1912' }}>
              <Mail size={15} aria-hidden="true" /> Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
