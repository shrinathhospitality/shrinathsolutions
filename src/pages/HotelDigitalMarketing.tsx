import ServicePage from './ServicePage';
import * as d from '../data/hotelMarketing';

export default function HotelDigitalMarketing() {
  return (
    <ServicePage
      path="/hotel-digital-marketing"
      title="Hotel Digital Marketing Company | Hotel SEO & Direct Booking — Shrinath Solutions"
      description="Hotel digital marketing company in Jaisalmer: hotel SEO, direct booking strategy, OTA optimisation, Google Hotel Ads, reputation management and hotel website development for properties across Rajasthan."
      crumbs={[{ name: 'Services', path: '/services' }, { name: 'Hotel Digital Marketing', path: '/hotel-digital-marketing' }]}
      serviceName="Hotel Digital Marketing"
      kicker="Hotel digital marketing"
      category="Hotel Technology"
      h1="Hotel digital marketing that shifts bookings from OTAs to your own site."
      intro="For hotels, resorts and desert camps in Jaisalmer and across Rajasthan: hotel SEO, a direct booking strategy, OTA discipline, Google Hotel Ads, reputation management and the website and booking engine underneath it all."
      ctaLabel="Request a strategy call"
      heroNotes={['Hospitality is our core niche', 'Based in Jaisalmer']}
      blocks={[
        { kind: 'paras', heading: 'The commission problem, stated honestly', items: d.intro },
        { kind: 'cards', heading: 'The direct-booking programme', body: 'Eleven pieces of work. Most properties need six or seven.', tint: 'rgba(255,122,47,.2)', items: d.services },
        { kind: 'steps', heading: 'Where hotels lose direct bookings', body: 'Five failures account for most of it.', items: d.leaks },
        { kind: 'kv', heading: 'Property types we work with', items: d.propertyTypes },
        { kind: 'cards', heading: 'The seasonal calendar', body: 'Rajasthan hospitality runs on a hard annual curve.', items: d.calendar.map((c) => ({ title: c.period, body: c.body })) },
        { kind: 'cards', heading: 'What we measure', body: 'Occupancy and margin, not impressions.', items: d.metrics },
        { kind: 'cards', heading: 'Case studies', body: 'A sample of recent hotel and camp projects. See the full portfolio for more.', items: d.cases.map((c) => ({ title: c.name, body: c.body })) },
      ]}
      faqs={d.faqs}
      related={[
        { label: 'SEO Services', to: '/seo-services' },
        { label: 'Channel Manager & PMS', to: '/channel-manager-hotel-software' },
        { label: 'Website Designing', to: '/website-designing' },
        { label: 'Pricing', to: '/channel-manager-pricing' },
      ]}
      ctaHeading="Let's look at your OTA share together."
      ctaBody="Bring last year's booking sources to the call. We will tell you which single change is worth making first."
    />
  );
}
