import ServicePage from './ServicePage';

export default function CaseStudy() {
  return (
    <ServicePage
      path="/case-studies"
      title="Case Study | Heritage Hotel Website & SEO, Jaisalmer — Shrinath Solutions"
      description="A structured hotel case-study template covering client overview, challenge, strategy, website work, SEO work, marketing work and results. Replace with verified project data."
      crumbs={[{ name: 'Portfolio', path: '/portfolio' }, { name: 'Case Studies', path: '/case-studies' }]}
      kicker="Case study"
      h1="Heritage hotel, Jaisalmer — website rebuild and search visibility."
      intro="A structured case-study template. Replace each section with the real brief, the work delivered and verified numbers for the project."
      ctaLabel="Discuss a similar project"
      blocks={[
        { kind: 'paras', heading: 'Client overview', items: ['Placeholder: property type, room count, location and the channels they relied on before the project.', 'Placeholder: who we worked with on the client side and over what period.'] },
        { kind: 'paras', heading: 'The challenge', items: ['Placeholder: the measurable problem — for example a slow mobile site, no direct booking path, or heavy OTA dependence.'] },
        {
          kind: 'steps',
          heading: 'Strategy',
          items: [
            { num: '01', title: 'Audit', body: 'What we measured first and what it told us.' },
            { num: '02', title: 'Priorities', body: 'What we fixed before anything else, and why.' },
            { num: '03', title: 'Build', body: 'What was designed and developed.' },
            { num: '04', title: 'Growth', body: 'What continued after launch.' },
          ],
        },
        { kind: 'image', heading: 'Website work', body: 'Placeholder: pages built, booking flow changes, performance improvements.', note: 'before / after screenshots' },
        { kind: 'paras', heading: 'SEO work', items: ['Placeholder: technical fixes, pages published, local profile work and the terms targeted.'] },
        { kind: 'paras', heading: 'Marketing work', items: ['Placeholder: campaigns run, budget, targeting and creative approach.'] },
        {
          kind: 'cards',
          heading: 'Results',
          body: 'Add verified figures with the period they cover. Leave this section empty rather than estimating.',
          items: [
            { glyph: '◈', title: 'Organic traffic', body: 'Add verified figure and period.' },
            { glyph: '◉', title: 'Direct bookings', body: 'Add verified figure and period.' },
            { glyph: '◎', title: 'Enquiries', body: 'Add verified figure and period.' },
          ],
        },
        { kind: 'paras', heading: 'Client testimonial', items: ['Placeholder quote from the client, with name, role and property.'] },
      ]}
      related={[
        { label: 'Portfolio', to: '/portfolio' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
        { label: 'Contact', to: '/contact' },
      ]}
      ctaHeading="Want this kind of write-up for your property?"
    />
  );
}
