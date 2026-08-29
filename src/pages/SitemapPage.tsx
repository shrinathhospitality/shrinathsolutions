import { Link } from 'react-router-dom';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { Section } from '../components/Sections';
import { glass } from '../styles/theme';
import { useSeoOverride } from '../hooks/useSeoOverride';

const trail = [{ name: 'Home', path: '/' }, { name: 'Sitemap', path: '/sitemap' }];

const groups = [
  {
    title: 'Main pages',
    links: [
      { label: 'Home', to: '/' },
      { label: 'About', to: '/about' },
      { label: 'All Services', to: '/services' },
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Case Studies', to: '/case-studies' },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Service pages',
    links: [
      { label: 'Website Designing', to: '/website-designing' },
      { label: 'Online Marketing', to: '/online-marketing' },
      { label: 'SEO Services', to: '/seo-services' },
      { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
    ],
  },
  {
    title: 'Hotel technology',
    links: [
      { label: 'Channel Manager & Hotel Software', to: '/channel-manager-hotel-software' },
      { label: 'Channel Manager Pricing', to: '/channel-manager-pricing' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms & Conditions', to: '/terms-conditions' },
      { label: 'Sitemap', to: '/sitemap' },
    ],
  },
];

export default function SitemapPage() {
  const seoOverride = useSeoOverride('/sitemap');
  return (
    <>
      <Seo
        path="/sitemap"
        title={seoOverride?.title ?? "Sitemap — Shrinath Solutions"}
        description={seoOverride?.description ?? "Every page on the Shrinath Solutions website, listed for people. The XML sitemap lives at /sitemap.xml."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, breadcrumbSchema(trail)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <h1 className="font-heading font-extrabold text-[clamp(31px,4vw,50px)] leading-[1.08]" style={{ letterSpacing: '-0.03em' }}>Every page on this site</h1>
        <p className="text-[18px] mt-4 max-w-[700px]" style={{ color: 'var(--color-body)' }}>
          A human-readable index. The XML sitemap is served from <code>/sitemap.xml</code> and robots.txt from <code>/robots.txt</code>.
        </p>
      </section>

      {groups.map((g) => (
        <Section key={g.title} heading={g.title}>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {g.links.map((l) => (
              <Link key={l.to + l.label} to={l.to} className="p-4 rounded-[18px] font-semibold text-[16px] !text-heading" style={glass}>
                {l.label} →
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
