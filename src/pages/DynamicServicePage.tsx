import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ServicePage, { type Block } from './ServicePage';
import NotFound from './NotFound';

type ApiService = {
  name: string;
  slug: string;
  category: string | null;
  hero_label: string | null;
  h1: string;
  hero_description: string | null;
  hero_cta_label: string | null;
  hero_notes: string[];
  featured_image: string | null;
  icon: string | null;
  blocks: Block[];
  related: { label: string; to: string }[];
  cta_heading: string | null;
  cta_body: string | null;
};

type ApiSeo = { meta_title: string | null; meta_description: string | null } | null;
type ApiFaq = { question: string; answer: string };

type Response = { success: boolean; service: ApiService; seo: ApiSeo; faqs: ApiFaq[] };

export default function DynamicServicePage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<Response | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading');

  useEffect(() => {
    setState('loading');
    setData(null);
    const controller = new AbortController();

    fetch(`/api/public/services/${encodeURIComponent(slug)}`, { signal: controller.signal })
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

  if (state === 'loading') {
    return <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>;
  }
  if (state === 'not-found') {
    return <NotFound />;
  }
  if (state === 'error' || !data) {
    return (
      <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">
        Something went wrong loading this page. Please try again shortly.
      </div>
    );
  }

  const { service, seo, faqs } = data;

  return (
    <ServicePage
      path={`/services/${service.slug}`}
      title={seo?.meta_title ?? service.h1}
      description={seo?.meta_description ?? service.hero_description ?? ''}
      crumbs={[{ name: 'Services', path: '/services' }, { name: service.name, path: `/services/${service.slug}` }]}
      serviceName={service.name}
      category={service.category}
      featuredImage={service.featured_image}
      kicker={service.hero_label ?? ''}
      h1={service.h1}
      intro={service.hero_description ?? ''}
      ctaLabel={service.hero_cta_label ?? 'Get a Free Consultation'}
      heroNotes={service.hero_notes}
      blocks={service.blocks}
      faqs={faqs.map((f): [string, string] => [f.question, f.answer])}
      related={service.related}
      ctaHeading={service.cta_heading ?? 'Ready to get started?'}
      ctaBody={service.cta_body ?? undefined}
    />
  );
}
