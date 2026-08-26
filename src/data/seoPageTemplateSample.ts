import { MapPin, Cpu, FileText, PenTool } from 'lucide-react';
import type { SeoPageData } from '../components/seo-template/types';

/**
 * TEMPORARY sample content for previewing SeoPageTemplate — not real page copy, not wired to
 * any API. Once the template is approved, real per-page data (from the 74-page content set)
 * gets its own loader; this file is just a placeholder for that shape.
 */
export const seoCompanyJaisalmerSample: SeoPageData = {
  path: '/seo-preview/seo-company-jaisalmer',
  metaTitle: 'SEO Company in Jaisalmer | Shrinath Solutions',
  metaDescription: 'Shrinath Solutions is an SEO company in Jaisalmer helping hotels, resorts and local businesses rank higher on Google and get more direct enquiries.',
  breadcrumb: [
    { name: 'Home', path: '/' },
    { name: 'SEO Services', path: '/seo-services' },
    { name: 'Jaisalmer', path: '/seo-preview/seo-company-jaisalmer' },
  ],

  eyebrow: 'SEO Services in Jaisalmer',
  h1: 'SEO Company in Jaisalmer',
  heroIntro: 'We help hotels, resorts and local businesses in Jaisalmer rank higher on Google, attract the right visitors, and turn them into direct enquiries — without long contracts or guesswork.',
  primaryCtaLabel: 'Get a Free SEO Audit',
  whatsappMessage: 'Hi Shrinath Solutions, I would like a free SEO audit for my business in Jaisalmer.',

  overviewHeading: 'Professional SEO, Built Around Jaisalmer Businesses',
  overviewBody: 'Most SEO agencies apply the same playbook everywhere. We work almost exclusively with hotels, homestays, travel agencies and local businesses in Jaisalmer, so every recommendation is shaped by what actually moves rankings and bookings here — not a generic checklist.',

  serviceCards: [
    { icon: MapPin, title: 'Local SEO', body: 'Google Business Profile optimisation, local citations and location-specific strategies.', to: '/services/local-seo' },
    { icon: Cpu, title: 'Technical SEO', body: 'Site speed, mobile usability and indexing fixes that remove hidden ranking blockers.', to: '/services/technical-seo' },
    { icon: FileText, title: 'On-Page SEO', body: 'Titles, meta tags and internal linking tuned for the searches your customers actually type.', to: '/services/on-page-seo' },
    { icon: PenTool, title: 'Content Marketing', body: 'SEO-friendly content that attracts, informs and converts — not keyword-stuffed filler.', to: '/services/content-marketing' },
  ],

  problemsHeading: 'Sound Familiar?',
  problems: [
    'Your website barely shows up when someone searches "hotels in Jaisalmer" or similar terms.',
    'Most of your bookings still come through OTAs, and their commissions keep eating into your margins.',
    'You’ve tried SEO before, but never got a clear answer on what actually changed or why.',
    'Your Google Business Profile is outdated, unclaimed, or barely gets any views.',
  ],
  solutions: [
    'We target the exact searches your future guests are already typing, and build your pages to answer them.',
    'A stronger direct-search presence means more direct bookings, not just more OTA traffic.',
    'Monthly reporting in plain language — what changed, why, and what happens next.',
    'We fully set up and actively manage your Google Business Profile as part of the plan.',
  ],

  processHeading: 'How We Work',
  processSteps: [
    { num: '01', title: 'Audit', body: 'A full review of your site, rankings and competitors in Jaisalmer.' },
    { num: '02', title: 'Strategy', body: 'A prioritised plan built around your business and realistic timelines.' },
    { num: '03', title: 'Execution', body: 'On-page, technical and content work carried out and tracked monthly.' },
    { num: '04', title: 'Reporting', body: 'Clear monthly updates on rankings, traffic and enquiries.' },
  ],

  longForm: {
    heading: 'SEO in Jaisalmer: What It Actually Takes',
    intro: 'Jaisalmer is a small, highly seasonal market where a handful of search terms drive most of the bookings — which makes ranking for the right ones worth more here than in most cities.',
    subsections: [
      {
        heading: 'Why generic SEO underperforms here',
        paragraphs: [
          'Jaisalmer’s search demand is concentrated around a small set of high-intent terms — hotel names, desert safari, and neighbourhood-specific searches near the fort. A generic SEO package built for a national audience usually spreads effort too thin to move any of them.',
          'The businesses that rank consistently are the ones whose content, structure and Google Business Profile are all built around those specific searches, not just "SEO" in general.',
        ],
      },
      {
        heading: 'What we prioritise first',
        paragraphs: [
          'We start with the fixes that move fastest: a fully optimised Google Business Profile, clean on-page targeting for your core pages, and any technical issues that are actively blocking indexing.',
          'Content and link-building come next, once the foundation is in place — building on a broken base rarely pays off, however good the content is.',
        ],
      },
    ],
  },

  benefitsHeading: 'What You Get',
  benefits: [
    'More visibility for the exact searches your future guests use',
    'A steady increase in direct, commission-free bookings',
    'Clear monthly reporting you can actually understand',
    'A Google Business Profile that works for you, not against you',
    'A long-term asset — unlike ads, rankings keep working after you stop paying for the month',
  ],

  midCta: {
    heading: 'Ready to Rank Higher in Jaisalmer?',
    body: 'Get an SEO plan built around your business, your budget and your goals.',
    buttonLabel: 'Get a Custom Plan',
  },

  faqs: [
    { q: 'How long does SEO take to show results in Jaisalmer?', a: 'Most businesses start seeing measurable movement in rankings within 8–12 weeks, with meaningful traffic and enquiry growth by month four to six. Jaisalmer’s smaller, more specific search volume means well-targeted pages can move faster than in larger cities.' },
    { q: 'Do you work with hotels, homestays and travel agencies specifically?', a: 'Yes — the majority of our SEO clients are hospitality and travel businesses in and around Jaisalmer, so our process is already tuned to how people search for stays and experiences here.' },
    { q: 'Will SEO reduce how much I rely on OTAs?', a: 'It won’t replace OTAs entirely, but a stronger direct-search presence consistently shifts a portion of bookings to your own website, where you keep the full margin.' },
    { q: 'What’s included in the free SEO audit?', a: 'A review of your current rankings, technical health, Google Business Profile and content, plus a short list of the highest-impact fixes we’d prioritise first.' },
    { q: 'Do I need a new website for SEO to work?', a: 'Not usually. Most sites can be optimised as they are. We’ll flag it separately if something about the current site is a genuine blocker rather than just a nice-to-have fix.' },
    { q: 'How do you report on progress?', a: 'A monthly report covering ranking movement, traffic and enquiries, written in plain language — what changed, why, and what we’re doing next.' },
    { q: 'Is there a minimum contract length?', a: 'No long lock-ins. SEO is inherently a months-long process to show its full effect, but you’re free to stop at any monthly cycle.' },
    { q: 'How is this different from paying for Google Ads?', a: 'Ads stop the moment you stop paying. SEO builds rankings that keep bringing traffic on their own, which compounds in value the longer you invest in it.' },
  ],

  relatedLinks: [
    { label: 'SEO Services', to: '/seo-services' },
    { label: 'Local SEO', to: '/services/local-seo' },
    { label: 'Hotel SEO', to: '/services/hotel-seo' },
    { label: 'Technical SEO', to: '/services/technical-seo' },
    { label: 'Digital Marketing', to: '/online-marketing' },
  ],

  finalCta: {
    eyebrow: 'Let’s Talk',
    heading: 'Ready to Get Found on Google in Jaisalmer?',
    body: 'Tell us about your business and we’ll show you exactly where you stand and what it would take to rank higher.',
  },
};
