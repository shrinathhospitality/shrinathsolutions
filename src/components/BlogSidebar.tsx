import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Flame, Clock3, FolderOpen, type LucideIcon } from 'lucide-react';
import { muted } from '../styles/theme';
import { CATEGORIES, TOP_SLUGS } from '../data/blogPinned';

type Post = {
  title: string;
  slug: string;
  category_name: string | null;
  reading_time_minutes: number | null;
  published_at: string | null;
};

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="p-5 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      <h3 className="flex items-center gap-2 font-heading font-bold text-[14.5px] m-0 mb-4">
        <Icon size={16} style={{ color: 'var(--color-primary)' }} aria-hidden="true" /> {title}
      </h3>
      {children}
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group flex flex-col gap-1.5 py-3 !text-heading">
      <span className="font-heading font-semibold text-[14px] leading-snug line-clamp-2 transition-colors group-hover:!text-[var(--color-primary)]">
        {post.title}
      </span>
      {post.reading_time_minutes && (
        <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: muted }}>
          <Clock3 size={12} aria-hidden="true" /> {post.reading_time_minutes} min read
        </span>
      )}
    </Link>
  );
}

export default function BlogSidebar({ excludeSlug }: { excludeSlug?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/blog?per_page=50', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.posts)) setPosts(data.posts);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/blog?search=${encodeURIComponent(query)}` : '/blog');
  }

  const pool = posts.filter((p) => p.slug !== excludeSlug);
  const topPosts = TOP_SLUGS.map((s) => pool.find((p) => p.slug === s)).filter((p): p is Post => !!p);
  const recentPosts = pool
    .filter((p) => !TOP_SLUGS.includes(p.slug))
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, 5);

  const counts = new Map<string, number>();
  for (const p of posts) {
    if (p.category_name) counts.set(p.category_name, (counts.get(p.category_name) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Search" icon={Search}>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles…"
            className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-[14px] !text-heading outline-none transition-colors"
            style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)' }}
          />
          <button
            type="submit"
            aria-label="Search"
            className="grid place-items-center rounded-full shrink-0"
            style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3157e5,#7347e8)' }}
          >
            <Search size={16} color="#fff" aria-hidden="true" />
          </button>
        </form>
      </Panel>

      {topPosts.length > 0 && (
        <Panel title="Top Posts" icon={Flame}>
          <div className="divide-y divide-[var(--color-border)]">
            {topPosts.map((p) => <PostRow key={p.slug} post={p} />)}
          </div>
        </Panel>
      )}

      <Panel title="Categories" icon={FolderOpen}>
        <div className="flex flex-col">
          {CATEGORIES.filter((c) => counts.has(c)).map((c) => (
            <Link
              key={c}
              to={`/blog?category=${encodeURIComponent(c)}`}
              className="group flex items-center justify-between py-2.5 text-[14px] !text-heading"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span className="transition-colors group-hover:!text-[var(--color-primary)]">{c}</span>
              <span className="text-[12.5px]" style={{ color: muted }}>{counts.get(c)}</span>
            </Link>
          ))}
        </div>
      </Panel>

      {recentPosts.length > 0 && (
        <Panel title="Recent Posts" icon={Clock3}>
          <div className="divide-y divide-white/[.07]">
            {recentPosts.map((p) => <PostRow key={p.slug} post={p} />)}
          </div>
        </Panel>
      )}
    </div>
  );
}
