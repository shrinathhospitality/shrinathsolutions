import SeoPageTemplate from '../components/seo-template/SeoPageTemplate';
import { seoCompanyJaisalmerSample } from '../data/seoPageTemplateSample';

/** Preview route for the reusable SeoPageTemplate, using temporary sample data (see
 * src/data/seoPageTemplateSample.ts). Not linked from navigation — visit directly at
 * /seo-preview/seo-company-jaisalmer. */
export default function SeoPageTemplatePreview() {
  return <SeoPageTemplate data={seoCompanyJaisalmerSample} />;
}
