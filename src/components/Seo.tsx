import { site } from '../data/site';

type Props = {
  title: string;
  description: string;
  path: string;
  jsonLd?: object | object[];
  /** Defaults to 'index, follow'. Pass 'noindex, follow' etc. for pages that should stay out
   *  of search results (private/utility routes) without removing them from crawl entirely. */
  robots?: string;
  /** Absolute or site-relative URL to a 1200×630 image. Defaults to the branded
   *  /og-image.png (see public/og-image.svg for the editable source) when not passed. */
  image?: string;
  /** 'website' (default) for ordinary pages, 'article' for blog posts. */
  type?: 'website' | 'article';
  /** Article metadata — only meaningful (and only rendered) when type='article'. */
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  /** An admin-saved canonical override (e.g. from SEO Studio) — validated before use; an
   *  invalid value (wrong scheme, embedded credentials, wrong host) is silently ignored in
   *  favor of the normal path-derived canonical rather than ever rendering something unsafe.
   *  See sanitizeCanonicalOverride() below for the exact rules. */
  canonicalOverride?: string | null;
};

/** Canonical-override validation (spec: accept internal paths and authorized absolute HTTPS
 *  same-site URLs; reject dangerous schemes, embedded credentials, and anything that could
 *  enable header injection or point at an unrelated document). Returns a safe absolute URL, or
 *  null if the candidate fails any check — callers always have the normal derived canonical as
 *  a fallback, so an invalid override never breaks the page. */
export function sanitizeCanonicalOverride(candidate: string | null | undefined, fallbackUrl: string): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  // Reject anything with control/whitespace characters up front — the single most direct
  // header-injection vector (a literal newline/carriage-return in a value React would
  // otherwise render as-is into an HTML attribute).
  if (/[\r\n\t\0]/.test(value)) return null;

  if (value.startsWith('/') && !value.startsWith('//')) {
    // Internal path — always safe, resolve against the same origin as the fallback.
    try {
      const base = new URL(fallbackUrl);
      return `${base.origin}${value}`;
    } catch {
      return null;
    }
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null; // reject http:, javascript:, data:, ftp:, etc.
    if (url.username || url.password) return null; // reject embedded credentials
    const fallbackHost = new URL(fallbackUrl).host;
    if (url.host !== fallbackHost) return null; // same-site only — never point at another domain
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Per-page title, meta description, canonical, robots, Open Graph, Twitter card and JSON-LD.
 *
 * Renders these tags directly rather than through react-helmet-async: that package's peer
 * dependency tops out at React 18, and under React 19 it silently drops every tag except
 * <title> (verified — meta/link/script never reached the document head). React 19 natively
 * hoists <title>, <meta>, <link> and <script> rendered anywhere in the tree into <head>, so
 * no wrapper library is needed. Re-rendering on client-side route change replaces the previous
 * page's tags rather than stacking them, since React reconciles by tag identity here.
 */
export default function Seo({
  title, description, path, jsonLd, robots = 'index, follow', image, type = 'website',
  publishedTime, modifiedTime, author, canonicalOverride,
}: Props) {
  const url = site.url + path;
  const canonicalUrl = sanitizeCanonicalOverride(canonicalOverride, url) ?? url;
  const resolvedImage = image ?? '/og-image.png';
  const absoluteImage = resolvedImage.startsWith('http') ? resolvedImage : site.url + resolvedImage;
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={site.name} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}
      {type === 'article' && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {type === 'article' && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}
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

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': site.url + '/#website',
  name: site.name,
  url: site.url,
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

/** Service schema for service/hotel-technology detail pages. */
export const serviceSchema = (opts: { name: string; description: string; path: string; category?: string | null }) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: opts.name,
  description: opts.description,
  url: site.url + opts.path,
  provider: { '@id': site.url + '/#org' },
  areaServed: 'Rajasthan, India',
  ...(opts.category ? { serviceType: opts.category } : {}),
});

/** BlogPosting schema for blog detail pages. */
export const articleSchema = (opts: {
  headline: string; description: string; path: string;
  datePublished?: string | null; dateModified?: string | null; image?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: opts.headline,
  description: opts.description,
  url: site.url + opts.path,
  mainEntityOfPage: site.url + opts.path,
  author: { '@type': 'Organization', name: site.name },
  publisher: { '@type': 'Organization', name: site.name },
  ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
  ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
  ...(opts.image ? { image: opts.image.startsWith('http') ? opts.image : site.url + opts.image } : {}),
});
