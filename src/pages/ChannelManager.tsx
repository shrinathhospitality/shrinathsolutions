import { useState } from 'react';
import ServicePage from './ServicePage';
import * as d from '../data/channelManager';
import { Section } from '../components/Sections';

type Node = { name: string; glyph: string; body: string; feeds: string[] };
const nodes = d.NODES as Node[];

function Ecosystem() {
  const [active, setActive] = useState(2);
  const n = nodes[active];
  return (
    <Section heading="The hotel technology ecosystem" body="Each piece feeds the next. Select any node to see what it connects to and why.">
      <div className="grid gap-6 mt-7 p-7 rounded-[28px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', backdropFilter: 'blur(18px)' }}>
        <div className="grid grid-cols-2 gap-3">
          {nodes.map((item, i) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(i)}
              className="text-left p-4 rounded-2xl font-semibold text-[15.5px] transition-transform hover:-translate-y-0.5"
              style={{
                border: '1px solid ' + (active === i ? 'rgba(125,211,252,.6)' : 'rgba(255,255,255,.12)'),
                background: active === i ? 'rgba(59,107,255,.24)' : 'rgba(255,255,255,.05)',
                color: '#e9efff',
              }}
            >
              <span className="block text-[18px] mb-1.5">{item.glyph}</span>
              {item.name}
            </button>
          ))}
        </div>
        <div className="p-7 rounded-[24px]" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(59,107,255,.28), rgba(6,10,23,.6) 70%)', border: '1px solid rgba(255,255,255,.14)' }}>
          <h3 className="font-heading font-bold text-[25px] mt-0 mb-2.5">{n.name}</h3>
          <p className="m-0 text-[16.5px]" style={{ color: 'rgba(226,234,255,.76)' }}>{n.body}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {n.feeds.map((f) => (
              <span key={f} className="text-[13.5px] px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(226,234,255,.78)' }}>
                connects to {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function ChannelManager() {
  return (
    <ServicePage
      path="/channel-manager-hotel-software"
      title="Hotel Channel Manager & Cloud PMS Software | Hotel Booking Software — Shrinath Solutions"
      description="Hotel channel manager and cloud PMS: centralised inventory, real-time rate updates, booking synchronisation, booking engine, housekeeping, front desk, reports and payment integrations. Request a demo."
      crumbs={[{ name: 'Hotel Technology', path: '/channel-manager-hotel-software' }, { name: 'Channel Manager & Hotel Software', path: '/channel-manager-hotel-software' }]}
      serviceName="Hotel Channel Manager and Cloud PMS"
      kicker="Hotel software"
      category="Hotel Technology"
      h1="Hotel Channel Manager & Cloud PMS — One Connected Platform."
      intro="Centralised inventory, real-time rate updates and synchronised bookings, with front desk, housekeeping, reporting and payments in the same system. Set up and supported by a team in Jaisalmer that answers the phone."
      ctaLabel="Request a demo"
      heroNotes={['Local setup and training', 'Connections verified per property']}
      blocks={[
        { kind: 'paras', heading: 'Why properties end up with a synchronisation problem', items: d.intro },
        { kind: 'cards', heading: 'What the platform covers', body: 'Twelve modules. You enable what your property runs on and leave the rest.', items: d.modules },
        { kind: 'custom', node: <Ecosystem /> },
        { kind: 'steps', heading: 'Setup and onboarding', body: 'One to two weeks for most properties. Nothing goes live unmonitored.', items: d.onboarding },
        { kind: 'ticks', heading: 'What changes day to day', items: d.outcomes },
        { kind: 'pills', heading: 'Integrations', body: 'The connection points we set up and verify for your property during onboarding.', items: d.integrations, dashed: true },
      ]}
      faqs={d.faqs}
      related={[
        { label: 'Channel Manager Pricing', to: '/channel-manager-pricing' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
        { label: 'Hotel Website Design', to: '/website-designing' },
      ]}
      ctaHeading="See it running on your own inventory."
      ctaBody="A demo on your real room types and rate plans, not a generic screen tour."
    />
  );
}
