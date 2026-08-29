import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { ImageSlot } from '../components/Sections';
import { projects as staticProjects, filters as staticFilters } from '../data/portfolio';
import { emberBtn, glass } from '../styles/theme';
import { useSeoOverride } from '../hooks/useSeoOverride';

const trail = [{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio' }];

type Project = { name: string; category: string; summary: string; imageNote: string; slug: string };

const fallbackProjects: Project[] = staticProjects.map((p) => ({ ...p, slug: '' }));

export default function Portfolio() {
  const [filter, setFilter] = useState('All');
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [filters, setFilters] = useState<string[]>(staticFilters);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/portfolio', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.projects)) {
          setProjects(
            data.projects.map((p: any) => ({
              name: p.title, category: p.category ?? 'General', summary: p.short_description ?? '', imageNote: p.title, slug: p.slug,
            }))
          );
          if (Array.isArray(data.categories) && data.categories.length) {
            setFilters(['All', ...data.categories.map((c: any) => c.name)]);
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const list = projects ?? fallbackProjects;
  const visible = list.filter((p) => filter === 'All' || p.category === filter);
  const seoOverride = useSeoOverride('/portfolio');

  return (
    <>
      <Seo
        path="/portfolio"
        title={seoOverride?.title ?? "Portfolio | Hotel, Travel & Local Business Websites — Shrinath Solutions"}
        description={seoOverride?.description ?? "Website, SEO and marketing work for hotels, desert camps, tour operators, taxi services, restaurants and e-commerce brands in Jaisalmer and across Rajasthan."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, breadcrumbSchema(trail)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="max-w-[820px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Our work</div>
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
            Work built for Rajasthan's hospitality and local economy.
          </h1>
          <p className="text-[18.5px] mt-5" style={{ color: 'var(--color-body)' }}>
            Filter by industry. Every entry is a structured placeholder — add real screenshots, client names and verified results before publishing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-8">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="px-4.5 py-2.5 rounded-full font-semibold text-[15px]"
              style={{
                padding: '10px 18px',
                ...(filter === f ? emberBtn : { color: 'var(--color-heading)', background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)' }),
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-4.5 mt-7" style={{ gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))' }}>
          {visible.map((p) => (
            <article key={p.name} className="rounded-[22px] overflow-hidden transition-all hover:-translate-y-0.5" style={glass}>
              <ImageSlot note={p.imageNote} ratio="16/10" size="1600 × 1000 px" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--color-border)' }} />
              <div className="p-5">
                <span className="text-[12.5px] font-bold px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>{p.category}</span>
                <h2 className="font-heading font-bold text-[20px] mt-3 mb-2">{p.name}</h2>
                <p className="mb-3.5 text-[15.4px]" style={{ color: 'var(--color-body)' }}>{p.summary}</p>
                <Link to={p.slug ? `/portfolio/${p.slug}` : '/case-studies'} className="font-bold text-[14.5px]" style={{ color: 'var(--color-accent-hover)' }}>View case study →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
