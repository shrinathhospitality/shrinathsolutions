import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import Faq from '../components/Faq';
import { CardsGrid, KvList, Paras, PillList, StepsGrid, Ticks } from '../components/Sections';
import RichContent from '../components/RichContent';
import ServiceVisual from '../components/service/ServiceVisual';
import SeoPageSidebar from '../components/SeoPageSidebar';
import { annotateHeadings, type Heading } from '../lib/extractHeadings';
import type { Block } from './ServicePage';
import NotFound from './NotFound';
import { site } from '../data/site';
import { emberBtn, ghostBtn, glassStrong, muted } from '../styles/theme';

type ApiSeoPage = {
  title: string;
  slug: string;
  primary_keyword: string | null;
  target_location: string | null;
  h1: string;
  hero_content: string | null;
  content_sections: (Block | { kind: 'html'; heading: string; body: string; items?: never })[];
  cta_heading: string | null;
  cta_body: string | null;
};

type ApiSeo = { meta_title: string | null; meta_description: string | null } | null;
type ApiFaq = { question: string; answer: string };
type Response = { success: boolean; page: ApiSeoPage; seo: ApiSeo; faqs: ApiFaq[] };

/** Renders any published SEO landing page (keyword/location pages, separate from Services and
 *  the generic Pages module) at its own root-level slug — matches on any otherwise-unrouted
 *  single path segment. */
export default function DynamicSeoPage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<Response | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading');

  useEffect(() => {
    setState('loading');
    setData(null);
    const controller = new AbortController();

    fetch(`/api/public/seo-pages/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((r) => {
        if (r.status === 404) {
          setState('not-found');
          return null;
        }
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((json) => {
        if (json?.success) {
          setData(json);
          setState('ready');
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setState('error');
      });

    return () => controller.abort();
  }, [slug]);

  if (state === 'loading') return null;
  if (state === 'not-found') return <NotFound />;
  if (state === 'error' || !data) {
    return (
      <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">
        Something went wrong loading this page. Please try again shortly.
      </div>
    );
  }

  const { page, seo, faqs: rawFaqs } = data;

  const seenQuestions = new Set<string>();
  const faqs = rawFaqs
    .map((f): [string, string] => [f.question, f.answer])
    .filter(([q]) => {
      const key = q.trim().toLowerCase();
      if (seenQuestions.has(key)) return false;
      seenQuestions.add(key);
      return true;
    });

  const crumbs = [{ name: 'Home', path: '/' }, { name: page.title, path: `/${page.slug}` }];
  const schema: object[] = [orgSchema, breadcrumbSchema(crumbs)];
  if (faqs.length) schema.push(faqSchema(faqs));

  const allHeadings: Heading[] = [];
  let headingCount = 0;
  const sections = page.content_sections.map((b) => {
    if (b.kind !== 'html') return b;
    const { html, headings, count } = annotateHeadings(b.body, headingCount);
    headingCount = count;
    allHeadings.push(...headings);
    return { ...b, body: html };
  });

  return (
    <>
      <Seo
        title={seo?.meta_title ?? page.h1}
        description={seo?.meta_description ?? page.hero_content ?? ''}
        path={`/${page.slug}`}
        jsonLd={schema}
      />
      <Breadcrumbs trail={crumbs} />

      <section className="mx-auto max-w-shell px-[22px] pt-9 grid gap-11 items-stretch lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          {(page.target_location || page.primary_keyword) && (
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>
              {page.target_location ?? page.primary_keyword}
            </div>
          )}
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,52px)] leading-[1.08] mt-4 mb-0" style={{ letterSpacing: '-0.03em' }}>
            {page.h1}
          </h1>
          {page.hero_content && (
            <p className="text-[18px] mt-5 max-w-[560px]" style={{ color: 'rgba(226,234,255,.74)' }}>{page.hero_content}</p>
          )}
          <div className="flex flex-wrap gap-3.5 mt-7">
            <Link to="/contact" className="px-7 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>
              Get a Free Quote
            </Link>
            <a href={site.phoneHref} className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>
              <Phone size={16} aria-hidden="true" /> {site.phone}
            </a>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 mt-8">
            {[
              ['Delivery', 'Websites from 2 weeks'],
              ['Quotes', 'Fixed, in writing'],
              ['Serving', page.target_location ? `${page.target_location} & beyond` : 'All of India'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[12.5px] font-semibold uppercase tracking-[.08em]" style={{ color: muted }}>{label}</div>
                <div className="font-heading font-bold text-[15.5px] mt-1">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-full min-h-[320px] rounded-[28px] p-6 md:p-8 flex items-center justify-center" style={glassStrong}>
          <div className="w-full max-w-[380px]">
            <ServiceVisual category={page.primary_keyword} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] pt-12 grid lg:grid-cols-[1fr_320px] gap-10 items-start">
        <div className="min-w-0">
          {sections.map((b, i) => {
            if (b.kind === 'custom') return <div key={i} className={i === 0 ? '' : 'pt-12'}>{b.node}</div>;
            if (b.kind === 'html') {
              return (
                <div key={i} className={i === 0 ? '' : 'pt-12'}>
                  <RichContent html={b.body} />
                </div>
              );
            }
            return (
              <div key={b.heading + i} className={i === 0 ? '' : 'pt-12'}>
                {(b.heading || b.body) && (
                  <div className="max-w-[720px]">
                    {b.heading && <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] leading-[1.12] m-0">{b.heading}</h2>}
                    {b.body && <p className="text-[17.4px] mt-3.5" style={{ color: muted }}>{b.body}</p>}
                  </div>
                )}
                {b.kind === 'paras' && <Paras items={b.items} />}
                {b.kind === 'cards' && <CardsGrid items={b.items} tint={b.tint} />}
                {b.kind === 'steps' && <StepsGrid items={b.items} />}
                {b.kind === 'kv' && <KvList items={b.items} />}
                {b.kind === 'pills' && <PillList items={b.items} dashed={b.dashed} />}
                {b.kind === 'ticks' && <Ticks items={b.items} />}
              </div>
            );
          })}

          {faqs.length ? <Faq faqs={faqs} heading="Frequently Asked Questions" /> : null}
        </div>

        <aside className="lg:sticky lg:top-24">
          <SeoPageSidebar headings={allHeadings} targetLocation={page.target_location} />
        </aside>
      </section>
    </>
  );
}
