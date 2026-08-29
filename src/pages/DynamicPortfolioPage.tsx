import { useParams } from 'react-router-dom';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import Hero from '../components/Hero';
import RichContent from '../components/RichContent';
import { CardsGrid, Section } from '../components/Sections';
import RelatedLinks from '../components/RelatedLinks';
import NotFound from './NotFound';
import { useRouteData } from '../loaders/useRouteData';
import { loadPortfolioProject, type PortfolioDetailData } from '../loaders/portfolioLoader';

export default function DynamicPortfolioPage() {
  const { slug = '' } = useParams();
  const path = `/portfolio/${slug}`;
  const result = useRouteData<PortfolioDetailData>(path, (signal) => loadPortfolioProject(slug, { signal }));

  if (result === 'loading') {
    return (
      <>
        <Seo title="Loading… — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>
      </>
    );
  }
  if (result.status === 'not-found') return <NotFound />;
  if (result.status === 'error') {
    return (
      <>
        <Seo title="Something went wrong — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">Something went wrong loading this project. Please try again shortly.</div>
      </>
    );
  }

  const { project, seo } = result.data;

  const trail = [{ name: 'Portfolio', path: '/portfolio' }, { name: project.title, path: `/portfolio/${project.slug}` }];

  return (
    <>
      <Seo
        path={`/portfolio/${project.slug}`}
        title={seo?.meta_title ?? `${project.title} — Shrinath Solutions`}
        description={seo?.meta_description ?? project.short_description ?? ''}
        jsonLd={[orgSchema, breadcrumbSchema([{ name: 'Home', path: '/' }, ...trail])]}
      />
      <Breadcrumbs trail={trail} />
      <Hero kicker={project.category ?? 'Case study'} h1={project.title} intro={project.short_description ?? ''} ctaLabel="Discuss a similar project" />

      {project.detailed_description && (
        <section className="mx-auto max-w-shell px-[22px] pt-16">
          <RichContent html={project.detailed_description} />
        </section>
      )}

      {project.results?.length > 0 && (
        <Section heading="Results" body="Verified figures, where available.">
          <CardsGrid items={project.results.map((r) => ({ title: r.title, body: r.body }))} />
        </Section>
      )}

      <RelatedLinks items={[{ label: 'Portfolio', to: '/portfolio' }, { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' }, { label: 'Contact', to: '/contact' }]} />
    </>
  );
}
