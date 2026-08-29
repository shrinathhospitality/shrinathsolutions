import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import { VentureBackLink, VentureBreadcrumb, VenturePrevNext, VentureStickyBar } from '../components/ventures/primitives';
import { getAdjacentVentures, getVentureBySlug } from '../data/ventures';
import { site } from '../data/site';
import NotFound from './NotFound';
import { useRouteData } from '../loaders/useRouteData';
import { loadVenture, type VentureDetailData } from '../loaders/ventureLoader';

import RubberStamp from '../components/ventures/layouts/RubberStamp';
import Enterprise from '../components/ventures/layouts/Enterprise';
import DesertCamp from '../components/ventures/layouts/DesertCamp';
import Adventures from '../components/ventures/layouts/Adventures';
import SamSandDunesDmc from '../components/ventures/layouts/SamSandDunesDmc';
import Hospitality from '../components/ventures/layouts/Hospitality';
import JaisalmerAdventures from '../components/ventures/layouts/JaisalmerAdventures';
import MyJaisalmer from '../components/ventures/layouts/MyJaisalmer';
import WelcomeToJaisalmer from '../components/ventures/layouts/WelcomeToJaisalmer';
import type { Venture } from '../types/venture';
import { useSeoOverride } from '../hooks/useSeoOverride';

// Keyed by layout_variant (a controlled, predefined set — see api/models/Venture.php's
// VENTURE_LAYOUT_VARIANTS), not by slug: this is what lets a brand-new Venture reuse one of the
// site's existing bespoke designs instead of every Venture needing its own hand-built layout.
const layouts: Record<string, React.ComponentType<{ venture: Venture }>> = {
  'heritage-craft': RubberStamp,
  'technical-grid': Enterprise,
  'cinematic-desert': DesertCamp,
  'route-planner': Adventures,
  'b2b-trade': SamSandDunesDmc,
  'portfolio-management': Hospitality,
  'offbeat-expedition': JaisalmerAdventures,
  'directory-portal': MyJaisalmer,
  'editorial-guide': WelcomeToJaisalmer,
};

export default function VentureDetail() {
  const { slug = '' } = useParams();
  const path = `/our-ventures/${slug}`;
  const result = useRouteData<VentureDetailData>(path, (signal) => loadVenture(slug, { signal }));
  // Called unconditionally, before any early return below (React hooks rule).
  const seoOverride = useSeoOverride(path);
  const [siblingSlugs, setSiblingSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/ventures')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success) setSiblingSlugs(d.ventures.map((v: { slug: string }) => v.slug));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (result === 'loading') {
    return (
      <>
        <Seo title="Loading… — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>
      </>
    );
  }

  // API unavailable (build-time/runtime outage) — fall back to the matching static snapshot
  // rather than a false 404, per the Ventures CMS migration's documented fallback behavior.
  // Neither available → NotFound below.
  const venture: Venture | null =
    result.status === 'success' ? result.data.venture : result.status === 'error' ? getVentureBySlug(slug) ?? null : null;

  if (!venture) {
    return <NotFound />;
  }

  const Layout = layouts[venture.theme.layoutVariant] ?? layouts['editorial-guide'];

  // Prev/next uses the live published-Ventures list once it loads (so new Ventures appear in
  // the rotation); before that resolves, or if the list fetch fails, falls back to the static
  // ventures.ts ordering — a convenience nav, not core content, so this graceful degrade is fine.
  const { prev, next } = siblingSlugs
    ? (() => {
        const idx = siblingSlugs.indexOf(venture.slug);
        if (idx === -1) return { prev: null, next: null };
        const prevSlug = siblingSlugs[(idx - 1 + siblingSlugs.length) % siblingSlugs.length];
        const nextSlug = siblingSlugs[(idx + 1) % siblingSlugs.length];
        return {
          prev: getVentureBySlug(prevSlug) ?? (prevSlug === venture.slug ? venture : null),
          next: getVentureBySlug(nextSlug) ?? (nextSlug === venture.slug ? venture : null),
        };
      })()
    : getAdjacentVentures(venture.slug);

  const { theme } = venture;

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Our Ventures', path: '/our-ventures' },
    { name: venture.name, path: `/our-ventures/${venture.slug}` },
  ];

  const schema: object[] = [orgSchema, breadcrumbSchema(trail)];
  if (venture.faqs.length) schema.push(faqSchema(venture.faqs.map((f): [string, string] => [f.question, f.answer])));
  if (venture.website || venture.googleBusinessUrl) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: venture.name,
      description: venture.summary,
      url: venture.website ?? site.url + `/our-ventures/${venture.slug}`,
      telephone: `+91${venture.phoneNumbers[0]}`,
      ...(venture.email ? { email: venture.email } : {}),
      areaServed: 'Jaisalmer, Rajasthan, India',
    });
  }

  return (
    <div className="pb-[130px] md:pb-0" style={{ background: theme.background, color: theme.text }}>
      <Seo
        title={seoOverride?.title ?? venture.seo.title}
        description={seoOverride?.description ?? venture.seo.description}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        path={venture.seo.canonicalPath}
        jsonLd={schema}
      />
      <VentureBreadcrumb theme={theme} name={venture.name} />

      <Layout venture={venture} />

      <section className="mx-auto max-w-shell px-[22px] pt-16 pb-14 grid gap-6">
        <VenturePrevNext prev={prev} next={next} theme={theme} />
        <VentureBackLink theme={theme} />
      </section>

      <VentureStickyBar venture={venture} theme={theme} />
    </div>
  );
}
