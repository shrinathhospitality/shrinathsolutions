import ServicePage from './ServicePage';
import * as d from '../data/onlineMarketing';

export default function OnlineMarketing() {
  return (
    <ServicePage
      path="/online-marketing"
      title="Digital Marketing Company in Jaisalmer | Online Marketing Services — Shrinath Solutions"
      description="Digital marketing company in Jaisalmer offering Google Ads, Meta Ads, social media marketing, lead generation, content marketing, email marketing and analytics for businesses across Rajasthan."
      crumbs={[{ name: 'Services', path: '/services' }, { name: 'Online Marketing', path: '/online-marketing' }]}
      serviceName="Online Marketing Services"
      kicker="Online marketing"
      category="Digital Marketing"
      h1="Digital marketing company in Jaisalmer, working to a cost per enquiry."
      intro="Google Ads, Meta Ads, social media, content, email and reputation work for hotels, travel operators and local businesses across Rajasthan — planned against a number you agree before we spend anything."
      ctaLabel="Request a marketing plan"
      heroNotes={['Tracking set up first', 'Monthly plain-language reporting']}
      blocks={[
        { kind: 'paras', heading: 'Start with the number, not the channel', items: d.intro },
        { kind: 'cards', heading: 'What the programme includes', body: 'Ten services. A working programme usually combines three or four.', tint: 'rgba(123,92,255,.22)', items: d.services },
        { kind: 'steps', heading: 'How a campaign runs', body: 'Nothing goes live before tracking is verified.', items: d.phases },
        { kind: 'kv', heading: 'Channels and when they earn their place', items: d.channels },
        { kind: 'ticks', heading: 'Reporting and analytics', body: 'One monthly document answering what each rupee produced.', items: d.reporting },
        { kind: 'cards', heading: 'Industries we run campaigns for', body: 'Buying behaviour differs sharply across these, and so does the channel that works.', items: d.industries },
      ]}
      faqs={d.faqs}
      related={[
        { label: 'SEO Services', to: '/seo-services' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
        { label: 'Website Designing', to: '/website-designing' },
      ]}
      ctaHeading="Let's set a target before we set a budget."
      ctaBody="Tell us what an enquiry is worth to you and we will tell you whether paid channels make sense."
    />
  );
}
