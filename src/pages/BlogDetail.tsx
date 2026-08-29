import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3, CalendarDays, ArrowRight } from 'lucide-react';
import Seo, { articleSchema, breadcrumbSchema, faqSchema, orgSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import RichContent from '../components/RichContent';
import Faq from '../components/Faq';
import BlogThumb from '../components/BlogThumb';
import BlogSidebar from '../components/BlogSidebar';
import { muted } from '../styles/theme';
import NotFound from './NotFound';
import { useRouteData } from '../loaders/useRouteData';
import { loadBlogPost, type BlogDetailData } from '../loaders/blogLoader';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function BlogDetail() {
  const { slug = '' } = useParams();
  const path = `/blog/${slug}`;
  const result = useRouteData<BlogDetailData>(path, (signal) => loadBlogPost(slug, { signal }));

  if (result === 'loading') {
    return (
      <>
        <Seo title="Loading… — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>
      </>
    );
  }
  if (result.status === 'not-found') return <NotFound />;
  if (result.status === 'error') {
    return (
      <>
        <Seo title="Something went wrong — Shrinath Solutions" description="" path={path} robots="noindex, follow" />
        <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-70">Something went wrong loading this article. Please try again shortly.</div>
      </>
    );
  }

  const { post, seo, faqs, related } = result.data;

  const faqPairs: [string, string][] = faqs.map((f) => [f.question, f.answer]);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }];
  const schema: object[] = [
    orgSchema,
    breadcrumbSchema(crumbs),
    articleSchema({
      headline: post.title,
      description: post.excerpt ?? '',
      path: `/blog/${post.slug}`,
      datePublished: post.published_at,
    }),
  ];
  if (faqPairs.length) schema.push(faqSchema(faqPairs));

  return (
    <>
      <Seo
        path={`/blog/${post.slug}`}
        title={seo?.meta_title ?? `${post.title} — Shrinath Solutions`}
        description={seo?.meta_description ?? post.excerpt ?? ''}
        jsonLd={schema}
        type="article"
        publishedTime={post.published_at ?? undefined}
      />
      <Breadcrumbs trail={crumbs} />

      <section className="mx-auto w-[90%] max-w-[1600px] pt-8">
        <div className="max-w-[780px]">
          {post.category_name && (
            <span className="inline-block text-[12px] font-bold uppercase tracking-[.08em] px-3 py-1 rounded-full" style={{ color: 'var(--color-primary)', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
              {post.category_name}
            </span>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading font-extrabold text-[clamp(30px,4.2vw,50px)] leading-[1.1] mt-4 mb-0"
            style={{ letterSpacing: '-0.03em' }}
          >
            {post.title}
          </motion.h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-[14.5px]" style={{ color: muted }}>
            {post.published_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" /> {formatDate(post.published_at)}
              </span>
            )}
            {post.reading_time_minutes && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} aria-hidden="true" /> {post.reading_time_minutes} min read
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[90%] max-w-[1600px] pt-7 grid lg:grid-cols-[1fr_320px] gap-10 items-start">
        <div className="min-w-0">
          <BlogThumb category={post.category_name} image={post.featured_image} title={post.title} className="w-full rounded-[26px]" />

          {post.content && (
            <div className="pt-12 max-w-[760px]">
              <RichContent html={post.content} />
            </div>
          )}

          {faqPairs.length > 0 && <Faq faqs={faqPairs} heading="Frequently asked questions" />}

          {related.length > 0 && (
            <div className="pt-16">
              <h2 className="font-heading font-bold text-[27px] mb-6">Related articles</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/blog/${r.slug}`}
                    className="group flex flex-col gap-2 p-5 rounded-[20px] !text-heading"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <span className="text-[12px] font-bold uppercase tracking-[.08em]" style={{ color: 'var(--color-primary)' }}>{r.category_name}</span>
                    <span className="font-heading font-bold text-[15.5px] leading-snug line-clamp-2">{r.title}</span>
                    <span className="inline-flex items-center gap-1 mt-1 font-bold text-[13px]" style={{ color: 'var(--color-accent-hover)' }}>
                      Read Article <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <BlogSidebar excludeSlug={post.slug} />
        </aside>
      </section>
    </>
  );
}
