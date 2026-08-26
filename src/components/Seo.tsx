import { site } from '../data/site';

type Props = {
  title: string;
  description: string;
  path: string;
  jsonLd?: object | object[];
};

/**
 * Per-page title, meta description, canonical, Open Graph, Twitter card and JSON-LD.
 *
 * Renders these tags directly rather than through react-helmet-async: that package's peer
 * dependency tops out at React 18, and under React 19 it silently drops every tag except
 * <title> (verified — meta/link/script never reached the document head). React 19 natively
 * hoists <title>, <meta>, <link> and <script> rendered anywhere in the tree into <head>, so
 * no wrapper library is needed.
 */
export default function Seo({ title, description, path, jsonLd }: Props) {
  const url = site.url + path;
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {jsonLdItems.map((item, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(item)}</script>
      ))}
    </>
  );
}

export const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': site.url + '/#org',
  name: site.name,
  url: site.url,
  telephone: '+91-94615-31536',
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Jaisalmer',
    addressRegion: 'Rajasthan',
    addressCountry: 'IN',
  },
  areaServed: 'Rajasthan, India',
};

export const breadcrumbSchema = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: t.name,
    item: site.url + t.path,
  })),
});

export const faqSchema = (faqs: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});
