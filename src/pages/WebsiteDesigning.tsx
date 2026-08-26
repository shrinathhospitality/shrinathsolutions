import ServicePage from './ServicePage';
import * as d from '../data/websiteDesigning';

export default function WebsiteDesigning() {
  return (
    <ServicePage
      path="/website-designing"
      title="Website Designing Company in Jaisalmer | Website Development Rajasthan — Shrinath Solutions"
      description="Website designing company in Jaisalmer building hotel websites, travel websites, WordPress, React and e-commerce sites for businesses across Rajasthan. Mobile-first, SEO-ready, built for enquiries."
      crumbs={[{ name: 'Services', path: '/services' }, { name: 'Website Designing', path: '/website-designing' }]}
      serviceName="Website Designing and Development"
      kicker="Website designing & development"
      category="Website Design & Development"
      h1="Website designing company in Jaisalmer, building sites that earn enquiries."
      intro="Shrinath Solutions designs and develops websites for hotels, desert camps, tour operators, taxi services, restaurants and local businesses across Rajasthan. Every build is mobile-first, fast, structured for search and pointed at one measurable outcome: more enquiries, calls and direct bookings."
      ctaLabel="Get a website quote"
      heroNotes={['Mobile-first builds', 'SEO-ready structure', 'Support after launch']}
      blocks={[
        { kind: 'paras', heading: 'Why a website designing company in Jaisalmer should understand hospitality', items: d.intro },
        { kind: 'cards', heading: 'Types of websites we design and develop', body: 'Nine build types cover almost every enquiry we receive as a website development company in Rajasthan.', items: d.types },
        { kind: 'steps', heading: 'Our website design process', body: 'Six stages, each with a deliverable you can see and sign off.', items: d.process },
        { kind: 'pills', heading: 'Technology stack', body: 'We pick the stack to fit the site, not the other way round.', items: d.stack },
        { kind: 'kv', heading: 'Industry solutions', body: 'The same craft, aimed at different buying behaviour.', items: d.industries },
        { kind: 'cards', heading: 'What you get in every build', body: 'These are not upgrades. They are the baseline for any website we hand over.', items: d.benefits },
        { kind: 'cards', heading: 'Website design packages', body: 'Three starting points. Final scope and cost are confirmed after a short discovery call.', items: d.packages.map((p) => ({ title: p.name, body: p.for + ' Includes: ' + p.items.join(', ') + '.' })) },
        { kind: 'cards', heading: 'Recent website work', body: 'A sample of recent builds. See the full portfolio for more.', items: d.work.map((w) => ({ title: w.name, body: w.body })) },
      ]}
      faqs={d.faqs}
      related={[
        { label: 'SEO Services', to: '/seo-services' },
        { label: 'Online Marketing', to: '/online-marketing' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
        { label: 'Portfolio', to: '/portfolio' },
      ]}
      ctaHeading="Ready for a website that pulls its weight?"
      ctaBody="Send us your current site and we will tell you plainly whether to improve it or rebuild it."
    />
  );
}
