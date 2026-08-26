import { useParams } from 'react-router-dom';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import { VentureBackLink, VentureBreadcrumb, VenturePrevNext, VentureStickyBar } from '../components/ventures/primitives';
import { getAdjacentVentures, getVentureBySlug } from '../data/ventures';
import { site } from '../data/site';
import NotFound from './NotFound';

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

const layouts: Record<string, React.ComponentType<{ venture: Venture }>> = {
  'shrinath-rubber-stamp': RubberStamp,
  'shrinath-enterprise': Enterprise,
  'shrinath-desert-camp': DesertCamp,
  'shrinath-adventures': Adventures,
  'sam-sand-dunes-desert-camp-dmc': SamSandDunesDmc,
  'shrinath-hospitality': Hospitality,
  'jaisalmer-adventures': JaisalmerAdventures,
  'my-jaisalmer': MyJaisalmer,
  'welcome-to-jaisalmer': WelcomeToJaisalmer,
};

export default function VentureDetail() {
  const { slug = '' } = useParams();
  const venture = getVentureBySlug(slug);

  if (!venture) return <NotFound />;

  const Layout = layouts[venture.slug];
  const { prev, next } = getAdjacentVentures(venture.slug);
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
      <Seo title={venture.seo.title} description={venture.seo.description} path={venture.seo.canonicalPath} jsonLd={schema} />
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
