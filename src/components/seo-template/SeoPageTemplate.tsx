import Seo, { breadcrumbSchema, faqSchema, orgSchema } from '../Seo';
import Breadcrumbs from '../Breadcrumbs';
import Faq from '../Faq';
import RelatedLinks from '../RelatedLinks';
import { Section, Ticks } from '../Sections';
import SeoHero from './SeoHero';
import SeoServiceCards from './SeoServiceCards';
import SeoProblemsSolutions from './SeoProblemsSolutions';
import SeoProcess from './SeoProcess';
import SeoLongForm from './SeoLongForm';
import SeoMidCta from './SeoMidCta';
import type { SeoPageData } from './types';

/**
 * Reusable shell for SEO landing pages (city pages, service pages, and city+service
 * combinations — "SEO Company in Jaisalmer", "Hotel SEO in Jodhpur", etc). Every page is one
 * `SeoPageData` object; this component owns layout and section order only. Section order is
 * fixed by design — pass different `data` for a different page rather than reordering here.
 */
export default function SeoPageTemplate({ data }: { data: SeoPageData }) {
  const schema: object[] = [orgSchema, breadcrumbSchema(data.breadcrumb)];
  if (data.faqs.length > 0) {
    schema.push(faqSchema(data.faqs.map((f): [string, string] => [f.q, f.a])));
  }

  return (
    <>
      <Seo title={data.metaTitle} description={data.metaDescription} path={data.path} jsonLd={schema} />

      <Breadcrumbs trail={data.breadcrumb} />

      <SeoHero
        eyebrow={data.eyebrow}
        h1={data.h1}
        intro={data.heroIntro}
        primaryCtaLabel={data.primaryCtaLabel}
        whatsappMessage={data.whatsappMessage}
      />

      <Section heading={data.overviewHeading} body={data.overviewBody} />

      <SeoServiceCards heading="Our Services" cards={data.serviceCards} />

      <SeoProblemsSolutions heading={data.problemsHeading} problems={data.problems} solutions={data.solutions} />

      <SeoProcess heading={data.processHeading} steps={data.processSteps} />

      <SeoLongForm heading={data.longForm.heading} intro={data.longForm.intro} subsections={data.longForm.subsections} />

      <Section heading={data.benefitsHeading}>
        <Ticks items={data.benefits} />
      </Section>

      <SeoMidCta heading={data.midCta.heading} body={data.midCta.body} buttonLabel={data.midCta.buttonLabel} />

      {data.faqs.length > 0 && (
        <Faq faqs={data.faqs.map((f): [string, string] => [f.q, f.a])} heading="Frequently Asked Questions" />
      )}

      {data.relatedLinks.length > 0 && <RelatedLinks items={data.relatedLinks} />}
    </>
  );
}
