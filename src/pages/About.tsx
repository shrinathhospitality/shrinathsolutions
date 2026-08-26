import ServicePage from './ServicePage';

export default function About() {
  return (
    <ServicePage
      path="/about"
      title="About Shrinath Solutions | Website & Hotel Marketing Team in Jaisalmer"
      description="Shrinath Solutions is a Jaisalmer team building websites, running digital marketing and installing hotel technology for properties and businesses across Rajasthan."
      crumbs={[{ name: 'About', path: '/about' }]}
      kicker="About us"
      h1="A Jaisalmer team that treats hospitality as its home ground."
      intro="Shrinath Solutions builds websites, runs marketing and installs hotel technology for properties and businesses across Rajasthan. One team, accountable for the enquiry — not just the deliverable."
      ctaLabel="Work with us"
      blocks={[
        {
          kind: 'paras',
          heading: 'How we work',
          items: [
            'We are a small team, which shapes everything about how we work. You speak to the people doing the work rather than an account layer, every project starts with a written scope, and reporting is monthly and plain enough to act on.',
            'Hospitality is our core niche rather than a category we also serve. That means we ask about ADR, shoulder season and OTA mix before we discuss design, because those numbers decide what is worth building.',
            'We do not publish client counts, awards or certifications we have not earned. Replace the team section below with real names and photographs before this page goes live.',
          ],
        },
        {
          kind: 'cards',
          heading: 'What we do',
          body: 'Four connected practices, sold separately or as one programme.',
          items: [
            { glyph: '◍', title: 'Websites', body: 'Fast, mobile-first builds with clean structure and the enquiry designed in.' },
            { glyph: '◎', title: 'Marketing', body: 'Google and Meta campaigns measured on cost per enquiry, not impressions.' },
            { glyph: '◈', title: 'SEO', body: 'Technical, on-page and local search work for Rajasthan search terms.' },
            { glyph: '◆', title: 'Hotel technology', body: 'Channel manager, cloud PMS, booking engine and OTA management.' },
          ],
        },
        {
          kind: 'steps',
          heading: 'How an engagement runs',
          items: [
            { num: '01', title: 'Direct contact', body: 'You speak to the people doing the work, not an account manager relaying messages.' },
            { num: '02', title: 'Written scope', body: 'Every project starts with what is included, what it costs and what it does not cover.' },
            { num: '03', title: 'Monthly reporting', body: 'What changed, what it cost and what it returned, in language you can act on.' },
            { num: '04', title: 'Long-term support', body: 'Maintenance, seasonal campaign changes and improvements after launch.' },
          ],
        },
        { kind: 'image', heading: 'Our team', body: 'Add real names, roles and photographs before publishing.', note: 'a team photograph' },
      ]}
      faqs={[
        ['Where are you based?', 'Jaisalmer, Rajasthan. We work with clients across the state and remotely elsewhere in India.'],
        ['Do you only work with hotels?', 'No. Hospitality is our core niche, but we also build for taxi companies, restaurants, retail and professional services.'],
        ['Can you take over an existing website?', 'Usually yes. We audit the current build first and tell you whether improving it or rebuilding is the better spend.'],
      ]}
      related={[
        { label: 'All Services', to: '/services' },
        { label: 'Portfolio', to: '/portfolio' },
        { label: 'Contact', to: '/contact' },
      ]}
      ctaHeading="Let's talk about what your property needs first."
    />
  );
}
