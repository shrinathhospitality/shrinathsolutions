import { Link } from 'react-router-dom';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { Section } from '../components/Sections';
import { columns } from '../data/megaMenu';
import { glass } from '../styles/theme';

const trail = [{ name: 'Home', path: '/' }, { name: 'All Services', path: '/services' }];

export default function Services() {
  return (
    <>
      <Seo
        path="/services"
        title="All Services | Websites, Marketing, SEO & Hotel Technology — Shrinath Solutions"
        description="Every service from Shrinath Solutions: website design and development, digital marketing, SEO and hotel technology for businesses in Jaisalmer and across Rajasthan."
        jsonLd={[orgSchema, breadcrumbSchema(trail)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="max-w-[820px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Services</div>
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
            Websites, marketing, SEO and hotel technology under one roof.
          </h1>
          <p className="text-[18.5px] mt-5" style={{ color: 'var(--color-body)' }}>
            Start with the service that is holding your enquiries back. Most clients begin with one and add the rest as results appear.
          </p>
        </div>
      </section>

      {columns.map((col) => (
        <Section key={col.title} heading={col.title}>
          <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {col.links.map((l) => (
              <Link key={l.label} to={l.to} className="p-4 rounded-[18px] font-semibold text-[16px] !text-heading" style={glass}>
                {l.label} →
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
