import type { LucideIcon } from 'lucide-react';

export type SeoServiceCard = { icon: LucideIcon; title: string; body: string; to?: string };
export type SeoProcessStep = { num: string; title: string; body: string };
export type SeoFaq = { q: string; a: string };
export type SeoRelatedLink = { label: string; to: string };
export type SeoLongFormSubsection = { heading: string; paragraphs: string[] };

/** All content a single SEO landing page needs. One instance of this = one page — city pages,
 * service pages and city+service combinations all shape into the same fields. */
export type SeoPageData = {
  path: string;
  metaTitle: string;
  metaDescription: string;
  breadcrumb: { name: string; path: string }[];
  /** True for demo/preview instances (sample data, not a real published page) — keeps them
   *  out of search results without affecting crawl of their internal links. Omit/false for a
   *  genuine production page built from this template. */
  noindex?: boolean;

  eyebrow: string;
  h1: string;
  heroIntro: string;
  primaryCtaLabel: string;
  whatsappMessage: string;

  overviewHeading: string;
  overviewBody: string;
  serviceCards: SeoServiceCard[];

  problemsHeading: string;
  problems: string[];
  solutions: string[];

  processHeading: string;
  processSteps: SeoProcessStep[];

  longForm: {
    heading: string;
    intro?: string;
    subsections: SeoLongFormSubsection[];
  };

  benefitsHeading: string;
  benefits: string[];

  midCta: { heading: string; body: string; buttonLabel: string };

  faqs: SeoFaq[];
  relatedLinks: SeoRelatedLink[];

  finalCta: { eyebrow?: string; heading: string; body: string };
};
