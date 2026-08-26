import ServicePage from './ServicePage';
import * as d from '../data/seoServices';

export default function SeoServices() {
  return (
    <ServicePage
      path="/seo-services"
      title="SEO Company in Jaisalmer | SEO Services in Rajasthan — Shrinath Solutions"
      description="SEO services in Jaisalmer and across Rajasthan: technical SEO, local SEO, hotel SEO, travel and e-commerce SEO, content and reporting. Start with a free SEO audit."
      crumbs={[{ name: 'Services', path: '/services' }, { name: 'SEO Services', path: '/seo-services' }]}
      serviceName="SEO Services"
      kicker="SEO services"
      category="SEO Services"
      h1="SEO company in Jaisalmer for businesses that need to be found locally."
      intro="Technical fixes first, then structure, then content and local visibility — sequenced so the work that moves rankings soonest happens soonest. No guaranteed-rank promises, no bulk link packages."
      ctaLabel="Request a free SEO audit"
      heroNotes={['Audit before proposal', 'Monthly reporting']}
      blocks={[
        { kind: 'paras', heading: 'What SEO actually looks like for a business in Rajasthan', items: d.intro },
        { kind: 'ticks', heading: 'Start with the free SEO audit', body: 'Before any proposal we run an audit and send you the findings whether or not you hire us.', items: d.auditPoints },
        { kind: 'cards', heading: 'Our SEO services', body: 'Twelve areas of work. A typical engagement uses six or seven, in an order set by the audit.', tint: 'rgba(34,211,238,.18)', items: d.services },
        { kind: 'steps', heading: 'The first ninety days', body: 'Front-load the work that compounds.', items: d.phases },
        { kind: 'kv', heading: 'Industries we run SEO for', items: d.industries },
        { kind: 'ticks', heading: 'How we report', body: 'One monthly document in plain language. If a month goes badly, the report says so.', items: d.reporting },
        { kind: 'cards', heading: 'What we will not do', body: 'The SEO industry has earned its scepticism. These are the practices we refuse.', items: d.nos },
      ]}
      faqs={d.faqs}
      related={[
        { label: 'Website Designing', to: '/website-designing' },
        { label: 'Online Marketing', to: '/online-marketing' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
      ]}
      ctaHeading="Find out what is holding your rankings back."
      ctaBody="The audit is free and yours to keep, whether you work with us or not."
    />
  );
}
