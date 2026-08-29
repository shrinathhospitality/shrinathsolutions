import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3 } from 'lucide-react';
import Seo, { breadcrumbSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import BlogThumb from '../components/BlogThumb';
import { muted } from '../styles/theme';
import { CATEGORIES as CATEGORY_NAMES, FEATURED_SLUG, COMPACT_SLUGS } from '../data/blogPinned';
import { useSeoOverride } from '../hooks/useSeoOverride';

const trail = [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }];

type Post = {
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category_name: string | null;
  reading_time_minutes: number | null;
  published_at: string | null;
};

const CATEGORIES = ['All', ...CATEGORY_NAMES];

const rise = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 } };

function ReadingTime({ minutes }: { minutes: number | null }) {
  if (!minutes) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: muted }}>
      <Clock3 size={13} aria-hidden="true" /> {minutes} min read
    </span>
  );
}

function CategoryBadge({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-block text-[12px] font-bold uppercase tracking-[.08em] px-3 py-1 rounded-full" style={{ color: 'var(--color-primary)', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
      {name}
    </span>
  );
}

function FeaturedCard({ post }: { post: Post }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="h-full">
      <Link
        to={`/blog/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[26px] !text-heading"
        style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
      >
        <BlogThumb category={post.category_name} image={post.featured_image} title={post.title} className="w-full transition-transform duration-300 group-hover:scale-[1.02]" />
        <div className="flex flex-1 flex-col p-7">
          <CategoryBadge name={post.category_name} />
          <h2 className="font-heading font-bold text-[clamp(22px,2.4vw,30px)] leading-[1.2] mt-4 mb-2.5">{post.title}</h2>
          <p className="m-0 text-[15.5px]" style={{ color: muted, lineHeight: 1.65 }}>{post.excerpt}</p>
          <div className="mt-5 flex items-center justify-between gap-4">
            <ReadingTime minutes={post.reading_time_minutes} />
            <span className="inline-flex items-center gap-1.5 font-bold text-[14px]" style={{ color: 'var(--color-accent-hover)' }}>
              Read Full Article <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CompactCard({ post }: { post: Post }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
      <Link
        to={`/blog/${post.slug}`}
        className="group flex gap-4 rounded-[20px] p-3 !text-heading"
        style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <BlogThumb category={post.category_name} image={post.featured_image} title={post.title} className="w-[130px] shrink-0 rounded-[14px]" />
        <div className="min-w-0 flex flex-col justify-center py-1">
          <CategoryBadge name={post.category_name} />
          <h3 className="font-heading font-bold text-[15.5px] leading-snug mt-2 mb-1.5 line-clamp-2">{post.title}</h3>
          <div className="flex items-center gap-3">
            <ReadingTime minutes={post.reading_time_minutes} />
            <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function GridCard({ post, index }: { post: Post; index: number }) {
  return (
    <motion.div {...rise} transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05 }}>
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="h-full">
        <Link
          to={`/blog/${post.slug}`}
          className="group flex h-full flex-col overflow-hidden rounded-[22px] !text-heading"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <BlogThumb category={post.category_name} image={post.featured_image} title={post.title} className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="flex flex-1 flex-col p-5">
            <CategoryBadge name={post.category_name} />
            <h3 className="font-heading font-bold text-[17.5px] leading-snug mt-3 mb-2 line-clamp-2">{post.title}</h3>
            <p className="m-0 text-[14px] line-clamp-3" style={{ color: muted, lineHeight: 1.6 }}>{post.excerpt}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <ReadingTime minutes={post.reading_time_minutes} />
              <span className="inline-flex items-center gap-1 font-bold text-[13px]" style={{ color: 'var(--color-accent-hover)' }}>
                Read Article <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  function setActiveCategory(cat: string) {
    setSearchParams(cat === 'All' ? {} : { category: cat });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/blog?per_page=50', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setState('ready');
        } else {
          setState('error');
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') setState('error'); });
    return () => controller.abort();
  }, []);

  const isSearching = searchQuery.trim() !== '';

  const featured = !isSearching ? posts.find((p) => p.slug === FEATURED_SLUG) ?? posts[0] : undefined;
  const compact = !isSearching ? COMPACT_SLUGS.map((s) => posts.find((p) => p.slug === s)).filter((p): p is Post => !!p) : [];
  const pinnedSlugs = new Set([featured?.slug, ...compact.map((p) => p.slug)].filter(Boolean));

  const remaining = posts.filter((p) => !pinnedSlugs.has(p.slug));
  const categoryFiltered = activeCategory === 'All' ? remaining : remaining.filter((p) => p.category_name === activeCategory);
  const q = searchQuery.trim().toLowerCase();
  const gridPosts = isSearching
    ? categoryFiltered.filter((p) => p.title.toLowerCase().includes(q) || (p.excerpt ?? '').toLowerCase().includes(q))
    : categoryFiltered;

  const seoOverride = useSeoOverride('/blog');

  return (
    <>
      <Seo
        path="/blog"
        title={seoOverride?.title ?? "Blog | Hotel Marketing, SEO & Website Notes — Shrinath Solutions"}
        description={seoOverride?.description ?? "Practical articles on hotel marketing, local SEO, websites and online growth for hotel owners and local businesses in Jaisalmer and across Rajasthan."}
        canonicalOverride={seoOverride?.canonical}
        robots={seoOverride ? `${seoOverride.robotsIndex ? 'index' : 'noindex'}, ${seoOverride.robotsFollow ? 'follow' : 'nofollow'}` : undefined}
        image={seoOverride?.ogImage ?? undefined}
        jsonLd={[orgSchema, breadcrumbSchema(trail)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto w-[90%] max-w-[1600px] pt-10">
        <div className="max-w-[820px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Blog</div>
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
            Latest Insights
          </h1>
          <p className="text-[18.5px] mt-5" style={{ color: muted }}>
            Practical articles on websites, SEO and hotel marketing, written by the team doing the work.
          </p>
        </div>
      </section>

      {state === 'error' && (
        <section className="mx-auto w-[90%] max-w-[1600px] pt-16 text-center" style={{ color: muted }}>
          Couldn&rsquo;t load articles right now. Please try again shortly.
        </section>
      )}

      {featured && (
        <section className="mx-auto w-[90%] max-w-[1600px] pt-10">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-stretch">
            <FeaturedCard post={featured} />
            <div className="grid gap-4 content-start">
              {compact.map((p) => <CompactCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-[90%] max-w-[1600px] pt-12">
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="px-4.5 py-2.5 rounded-full text-[14px] font-semibold transition-colors"
              style={
                activeCategory === cat
                  ? { background: 'linear-gradient(135deg,#3157e5,#7347e8)', color: '#fff' }
                  : { border: '1px solid var(--color-border-strong)', color: 'var(--color-heading)', background: 'var(--color-surface)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[90%] max-w-[1600px] pt-8 pb-4">
        {isSearching && (
          <p className="text-[15px] mb-5" style={{ color: muted }}>
            {gridPosts.length} result{gridPosts.length === 1 ? '' : 's'} for &ldquo;{searchQuery.trim()}&rdquo;
          </p>
        )}
        {gridPosts.length === 0 && state === 'ready' ? (
          <p className="text-[15px]" style={{ color: muted }}>
            {isSearching ? 'No articles matched your search.' : 'No articles in this category yet.'}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((p, i) => <GridCard key={p.slug} post={p} index={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
