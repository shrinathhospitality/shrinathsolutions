import type { ReactNode } from 'react';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import Faq from '../components/Faq';
import { CardsGrid, ImageSlot, KvList, Paras, PillList, Section, StepsGrid, Ticks } from '../components/Sections';
import ServiceHero from '../components/service/ServiceHero';
import ServiceAbout from '../components/service/ServiceAbout';
import ServiceDeliverables from '../components/service/ServiceDeliverables';
import ServiceGrowthJourney from '../components/service/ServiceGrowthJourney';
import ServiceProcess from '../components/service/ServiceProcess';
import ServiceAudience from '../components/service/ServiceAudience';
import ServiceOutcomes from '../components/service/ServiceOutcomes';
import ServiceAdvantages from '../components/service/ServiceAdvantages';
import RelatedServices from '../components/service/RelatedServices';
import { normalizeServiceBlocks, highlightsFrom } from '../lib/serviceContent';
import { useSeoOverride } from '../hooks/useSeoOverride';

export type Block =
  | { kind: 'paras'; heading: string; body?: string; items: string[] }
  | { kind: 'cards'; heading: string; body?: string; tint?: string; items: { glyph?: string; title: string; body: string }[] }
  | { kind: 'steps'; heading: string; body?: string; items: { num: string; title: string; body: string }[] }
  | { kind: 'kv'; heading: string; body?: string; items: { name: string; body: string }[] }
  | { kind: 'pills'; heading: string; body?: string; items: string[]; dashed?: boolean }
  | { kind: 'ticks'; heading: string; body?: string; items: string[] }
  | { kind: 'journey'; heading: string; body?: string; items: { glyph?: string; title: string; body: string }[] }
  | { kind: 'image'; heading: string; body?: string; note: string }
  | { kind: 'custom'; node: ReactNode };

export type ServicePageProps = {
  path: string;
  title: string;
  description: string;
  crumbs: { name: string; path: string }[];
  kicker: string;
  h1: string;
  intro: string;
  ctaLabel: string;
  heroNotes?: string[];
  /** Explicit visual override for the hero's right column (used rarely — most pages should
   *  rely on the automatic category-driven ServiceVisual instead). */
  heroAside?: ReactNode;
  serviceName?: string;
  category?: string | null;
  featuredImage?: string | null;
  blocks: Block[];
  faqs?: [string, string][];
  related?: { label: string; to: string }[];
  ctaHeading: string;
  ctaBody?: string;
};

/**
 * One reusable, database-driven template for every service-detail page — the 5 flagship
 * category pages and all CMS-authored service pages alike. Content arrives as a flexible
 * `blocks` array (see Block above); normalizeServiceBlocks() buckets it into the named
 * premium sections below by kind + heading, so no service needs its own component and no
 * real content is ever dropped (anything unclaimed still renders via the generic fallback).
 */
export default function ServicePage(p: ServicePageProps) {
  const schema: object[] = [orgSchema, breadcrumbSchema([{ name: 'Home', path: '/' }, ...p.crumbs])];
  if (p.serviceName) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: p.serviceName,
      provider: { '@id': 'https://shrinathsolutions.com/#org' },
      areaServed: 'Rajasthan, India',
      description: p.description,
    });
  }
  // Guard against an accidental duplicate question in the source content — never emit or
  // render the same FAQ twice.
  const seenQuestions = new Set<string>();
  const faqs = (p.faqs ?? []).filter(([q]) => {
    const key = q.trim().toLowerCase();
    if (seenQuestions.has(key)) return false;
    seenQuestions.add(key);
    return true;
  });
  if (faqs.length) schema.push(faqSchema(faqs));

  const n = normalizeServiceBlocks(p.blocks);
  const currentSlug = p.path.split('/').filter(Boolean).pop();
  // Shared by both the 7 hardcoded static pages (About, WebsiteDesigning, ...) and the
  // CMS-driven DynamicServicePage.tsx — for a dynamic /services/:slug route this correctly
  // resolves to null (that content_type isn't a route-only document), at the cost of one
  // harmless extra request on those routes specifically; see SEO_STUDIO_ARCHITECTURE.md Part 3.
  const seoOverride = useSeoOverride(p.path);

  return (
    <>
      <Seo
        title={seoOverride?.title ?? p.title}
        description={seoOverride?.description ?? p.description}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        path={p.path} jsonLd={schema}
      />
      <Breadcrumbs trail={[{ name: 'Home', path: '/' }, ...p.crumbs]} />

      <ServiceHero
        kicker={p.kicker}
        h1={p.h1}
        intro={p.intro}
        ctaLabel={p.ctaLabel}
        notes={p.heroNotes}
        category={p.category}
        featuredImage={p.heroAside ? undefined : p.featuredImage}
      />
      {p.heroAside}

      {n.about && (
        <ServiceAbout
          heading={n.about.heading}
          paragraphs={n.about.paragraphs}
          highlights={highlightsFrom(n.deliverables?.items)}
          featuredImage={p.featuredImage}
          ctaLabel={p.ctaHeading ? 'Discuss your goals' : undefined}
        />
      )}

      {n.deliverables && <ServiceDeliverables heading={n.deliverables.heading} body={n.deliverables.body} items={n.deliverables.items} />}

      {n.journey && <ServiceGrowthJourney heading={n.journey.heading} body={n.journey.body} items={n.journey.items} />}

      {n.process && <ServiceProcess heading={n.process.heading} body={n.process.body} items={n.process.items} />}

      {n.audience && <ServiceAudience heading={n.audience.heading} paragraphs={n.audience.paragraphs} chips={n.audience.chips} />}

      {n.outcomes && <ServiceOutcomes heading={n.outcomes.heading} body={n.outcomes.body} items={n.outcomes.items} category={p.category} />}

      {n.advantages && <ServiceAdvantages heading={n.advantages.heading} body={n.advantages.body} items={n.advantages.items} />}

      {/* Anything not claimed by a named section above still renders, generically. */}
      {n.extras.map((b, i) => {
        if (b.kind === 'custom') return <div key={i}>{b.node}</div>;
        return (
          <Section key={b.heading + i} heading={b.heading} body={b.body}>
            {b.kind === 'paras' && <Paras items={b.items} />}
            {b.kind === 'cards' && <CardsGrid items={b.items} tint={b.tint} />}
            {b.kind === 'steps' && <StepsGrid items={b.items} />}
            {b.kind === 'kv' && <KvList items={b.items} />}
            {b.kind === 'pills' && <PillList items={b.items} dashed={b.dashed} />}
            {b.kind === 'ticks' && <Ticks items={b.items} />}
            {b.kind === 'journey' && <CardsGrid items={b.items} />}
            {b.kind === 'image' && <div className="mt-7"><ImageSlot note={b.note} ratio="16/7" size="1920 × 840 px, WebP" /></div>}
          </Section>
        );
      })}

      {faqs.length ? <Faq faqs={faqs} heading="Frequently asked questions" /> : null}
      {p.related?.length ? <RelatedServices items={p.related} currentSlug={currentSlug} /> : null}
    </>
  );
}
