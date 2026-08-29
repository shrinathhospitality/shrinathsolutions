import { useState } from 'react';
import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import { useSeoOverride } from '../hooks/useSeoOverride';
import Breadcrumbs from '../components/Breadcrumbs';
import Faq from '../components/Faq';
import RelatedLinks from '../components/RelatedLinks';
import { KvList, Paras, Section, Ticks } from '../components/Sections';
import { wa } from '../data/site';
import * as d from '../data/pricing';
import { emberBtn } from '../styles/theme';

type Plan = { name: string; for: string; popular?: boolean; features: string[] };
const plans = d.PLANS as Plan[];
const comparison = d.COMPARISON as string[][];

const trail = [
  { name: 'Home', path: '/' },
  { name: 'Hotel Technology', path: '/channel-manager-hotel-software' },
  { name: 'Channel Manager Pricing', path: '/channel-manager-pricing' },
];

export default function Pricing() {
  const [term, setTerm] = useState<'monthly' | 'yearly'>('monthly');
  const toggle = (v: 'monthly' | 'yearly') => ({
    padding: '10px 24px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 15,
    ...(term === v ? emberBtn : { color: 'var(--color-heading)', background: 'transparent' }),
  });

  const seoOverride = useSeoOverride('/channel-manager-pricing');
  return (
    <>
      <Seo
        path="/channel-manager-pricing"
        title={seoOverride?.title ?? "Channel Manager Pricing | Hotel PMS Software Plans — Shrinath Solutions"}
        description={seoOverride?.description ?? "Channel manager and cloud PMS plans for hotels, resorts and desert camps: Starter, Growth and Hotel Pro. Feature comparison, setup information and FAQs. Pricing shared on enquiry."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, breadcrumbSchema(trail), faqSchema(d.faqs)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="max-w-[860px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Pricing</div>
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
            Channel manager and hotel PMS plans, priced for your property size.
          </h1>
          <p className="text-[18.5px] mt-5 max-w-[720px]" style={{ color: 'var(--color-body)' }}>
            Three plans covering channel management through to full property operations. What you pay depends on room count, rate plans and how many channels you connect, so we share figures on enquiry.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] pt-12">
        <div className="flex justify-center mb-7">
          <div className="flex gap-1 p-1.5 rounded-full" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <button type="button" onClick={() => setTerm('monthly')} style={toggle('monthly')} aria-pressed={term === 'monthly'}>Monthly</button>
            <button type="button" onClick={() => setTerm('yearly')} style={toggle('yearly')} aria-pressed={term === 'yearly'}>Yearly</button>
          </div>
        </div>

        <div className="grid gap-4.5" style={{ gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
          {plans.map((p) => (
            <div
              key={p.name}
              className="relative p-7 rounded-[26px]"
              style={
                p.popular
                  ? { background: 'linear-gradient(160deg,#3157e5,#2444be)', color: '#fff', boxShadow: '0 22px 50px rgba(49,87,229,.28)' }
                  : { border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }
              }
            >
              {p.popular && (
                <span className="absolute -top-3 left-6 px-4 py-1.5 rounded-full text-[12.5px] font-bold whitespace-nowrap" style={emberBtn}>
                  Most Popular
                </span>
              )}
              <h2 className="font-heading font-bold text-[24px] m-0" style={{ color: p.popular ? '#fff' : 'var(--color-heading)' }}>{p.name}</h2>
              <p className="text-[15.5px] mt-2 mb-4.5" style={{ color: p.popular ? 'rgba(255,255,255,.8)' : 'var(--color-body)', marginBottom: 18 }}>{p.for}</p>
              <div className="font-heading font-extrabold text-[26px]" style={{ color: p.popular ? '#fff' : 'var(--color-heading)' }}>Contact for Pricing</div>
              <div className="text-[14px] mt-1" style={{ color: p.popular ? 'rgba(255,255,255,.65)' : 'var(--color-muted)' }}>
                billed {term} · setup quoted separately
              </div>
              <a
                href={wa('Hi Shrinath Solutions, please send pricing for the ' + p.name + ' (' + term + ' billing). Room count: ')}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center my-5 py-3.5 rounded-full font-heading font-bold text-[15.5px] transition hover:brightness-95"
                style={emberBtn}
              >
                Request a Demo
              </a>
              <div className="grid gap-2.5">
                {p.features.map((f) => (
                  <div key={f} className="flex gap-2.5 text-[15.4px]" style={{ color: p.popular ? 'rgba(255,255,255,.92)' : 'var(--color-heading)' }}>
                    <span style={{ color: p.popular ? '#6ee7b7' : 'var(--color-success)' }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Section heading="Why we quote instead of publishing a price">
        <Paras items={d.intro} />
      </Section>

      <Section heading="Feature comparison">
        <div className="overflow-x-auto mt-6 rounded-[22px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full border-collapse text-[15.5px]" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th className="text-left px-5 py-4 font-heading text-[14px] uppercase tracking-[.08em]" style={{ color: 'var(--color-muted)', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>Feature</th>
                {plans.map((p) => (
                  <th key={p.name} className="px-5 py-4 font-heading text-[14px]" style={{ color: 'var(--color-heading)', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                    {p.name.replace(' Plan', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={'px-5 py-3 ' + (i === 0 ? '' : 'text-center')}
                      style={{ borderBottom: '1px solid var(--color-border)', color: i === 0 ? 'var(--color-heading)' : 'var(--color-body)' }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3.5 text-[14px]" style={{ color: 'var(--color-muted)' }}>
          Plan names, features and any prices live in src/data/pricing.ts. Add confirmed figures there.
        </p>
      </Section>

      <Section heading="What setup includes" body="Setup is quoted once, separately from the plan, and covers everything needed to go live safely.">
        <Ticks items={d.setup} />
      </Section>

      <Section heading="Which plan fits your property">
        <KvList items={d.fit} />
      </Section>

      <Faq faqs={d.faqs} heading="Pricing FAQs" />
      <RelatedLinks items={[
        { label: 'Channel Manager & PMS', to: '/channel-manager-hotel-software' },
        { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
        { label: 'Contact', to: '/contact' },
      ]} />
    </>
  );
}
