import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { glass, muted } from '../../styles/theme';

type ServiceSummary = { name: string; slug: string; category: string | null; icon: string | null };

/** Enriches related-service links with a real icon + category pulled from the published
 *  services list, fetched once per page render. Falls back to a plain link if no match. */
export default function RelatedServices({ items, currentSlug }: { items: { label: string; to: string }[]; currentSlug?: string }) {
  const [catalogue, setCatalogue] = useState<ServiceSummary[] | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const controller = new AbortController();
    fetch('/api/public/services', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.success && Array.isArray(data.services)) setCatalogue(data.services); })
      .catch(() => {});
    return () => controller.abort();
  }, [items.length]);

  const visible = items.filter((i) => !currentSlug || !i.to.endsWith(`/${currentSlug}`));
  if (visible.length === 0) return null;

  const bySlug = new Map((catalogue ?? []).map((s) => [s.slug, s]));

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,32px)] m-0">Related services</h2>
      <div className="grid gap-3.5 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => {
          const slug = item.to.split('/').filter(Boolean).pop();
          const match = slug ? bySlug.get(slug) : undefined;
          return (
            <Link key={item.to + item.label} to={item.to} className="group flex items-start gap-3.5 p-5 rounded-[20px] !text-heading transition-all hover:-translate-y-0.5" style={glass}>
              <span className="grid place-items-center text-[17px] shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }} aria-hidden="true">
                {match?.icon ?? <Layers size={17} />}
              </span>
              <div className="min-w-0">
                <div className="font-heading font-bold text-[15.5px]">{item.label}</div>
                {match?.category && <div className="text-[13px] mt-0.5" style={{ color: muted }}>{match.category}</div>}
                <span className="inline-flex items-center gap-1 mt-2 font-bold text-[13px]" style={{ color: 'var(--color-primary)' }}>
                  View service <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
