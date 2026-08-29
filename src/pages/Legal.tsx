import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { Paras, Section } from '../components/Sections';
import { useSeoOverride } from '../hooks/useSeoOverride';

type Block = { heading: string; paras: string[] };

const PRIVACY: Block[] = [
  {
    heading: 'Information we collect',
    paras: [
      'Placeholder: the details submitted through enquiry forms — name, phone, email, website and message — and how they reach us. This site has no backend; form submissions open WhatsApp on your own device.',
      'Placeholder: analytics data collected about site usage, and the tools used to collect it.',
    ],
  },
  {
    heading: 'How we use it',
    paras: ['Placeholder: responding to enquiries, providing quotes and delivering agreed services. State clearly that details are not sold or shared for marketing.'],
  },
  {
    heading: 'Retention and your rights',
    paras: [
      'Placeholder: how long enquiry records are kept and how to request deletion.',
      'Placeholder: contact route for privacy requests — shrinathsolutions@gmail.com.',
    ],
  },
];

const TERMS: Block[] = [
  { heading: 'Use of this website', paras: ['Placeholder: acceptable use, accuracy of published content and limits of liability for information on this site.'] },
  { heading: 'Services and payment', paras: ['Placeholder: how scope is agreed, invoicing terms and what happens when scope changes mid-project.'] },
  { heading: 'Intellectual property', paras: ['Placeholder: ownership of delivered work, third-party licences and the point at which ownership transfers.'] },
];

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  const path = privacy ? '/privacy-policy' : '/terms-conditions';
  const name = privacy ? 'Privacy Policy' : 'Terms & Conditions';
  const trail = [{ name: 'Home', path: '/' }, { name, path }];
  const blocks = privacy ? PRIVACY : TERMS;
  // Keyed by the exact active route (`/privacy-policy` vs `/terms-conditions`), never by this
  // shared component's filename — each has its own seo_documents registry row and must never
  // receive the other's saved override (see docs/SEO_STUDIO_ARCHITECTURE.md Part 3 §23a).
  const seoOverride = useSeoOverride(path);

  return (
    <>
      <Seo
        path={path}
        title={seoOverride?.title ?? `${name} — Shrinath Solutions`}
        description={seoOverride?.description ?? (privacy
          ? 'How Shrinath Solutions handles information sent through this website.'
          : 'Terms covering use of this website and engagements with Shrinath Solutions.')}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, breadcrumbSchema(trail)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="max-w-[820px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Legal</div>
          <h1 className="font-heading font-extrabold text-[clamp(31px,4vw,50px)] leading-[1.08] mt-4" style={{ letterSpacing: '-0.03em' }}>{name}</h1>
          <p className="text-[18px] mt-5" style={{ color: 'var(--color-body)' }}>
            Placeholder wording. Have this reviewed by a professional before publishing.
          </p>
        </div>
      </section>

      {blocks.map((b) => (
        <Section key={b.heading} heading={b.heading}>
          <Paras items={b.paras} />
        </Section>
      ))}
    </>
  );
}
