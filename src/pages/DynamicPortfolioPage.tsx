import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import Hero from '../components/Hero';
import RichContent from '../components/RichContent';
import { CardsGrid, Section } from '../components/Sections';
import RelatedLinks from '../components/RelatedLinks';
import NotFound from './NotFound';

type Project = {
  title: string; slug: string; category: string | null; short_description: string | null;
  detailed_description: string | null; results: { title: string; body: string }[];
  cta_heading: string | null; cta_body: string | null;
};
type Seo_ = { meta_title: string | null; meta_description: string | null } | null;

export default function DynamicPortfolioPage() {
  const { slug = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [seo, setSeo] = useState<Seo_>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading');

  useEffect(() => {
    setState('loading');
    const controller = new AbortController();

    fetch(`/api/public/portfolio/${encodeURIComponent(slug)}`, { signal: controller.signal })
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
          setProject(json.project);
          setSeo(json.seo);
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
  if (state === 'not-found') return <NotFound />;
  if (state === 'error' || !project) {
    return <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">Something went wrong loading this project. Please try again shortly.</div>;
  }

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
