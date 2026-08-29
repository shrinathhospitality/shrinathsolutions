import { useParams } from 'react-router-dom';
import ServicePage from './ServicePage';
import Seo from '../components/Seo';
import NotFound from './NotFound';
import { useRouteData } from '../loaders/useRouteData';
import { loadService, type ServiceDetailData } from '../loaders/serviceLoader';

export default function DynamicServicePage() {
  const { slug = '' } = useParams();
  const path = `/services/${slug}`;
  const result = useRouteData<ServiceDetailData>(path, (signal) => loadService(slug, { signal }));

  if (result === 'loading') {
    return (
      <>
        <Seo title="Loading… — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>
      </>
    );
  }
  if (result.status === 'not-found') {
    return <NotFound />;
  }
  if (result.status === 'error') {
    return (
      <>
        <Seo title="Something went wrong — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">
          Something went wrong loading this page. Please try again shortly.
        </div>
      </>
    );
  }

  const { service, seo, faqs } = result.data;

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
