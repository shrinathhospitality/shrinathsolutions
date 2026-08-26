import { Monitor, Search, Megaphone, TrendingUp, Building2, type LucideIcon } from 'lucide-react';

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; base: string }> = {
  'Website Design': { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(59,107,255,.5), transparent 60%), #0b1226' },
  SEO: { icon: Search, base: 'radial-gradient(circle at 30% 20%, rgba(34,211,238,.45), transparent 60%), #0b1226' },
  'Hotel Marketing': { icon: Megaphone, base: 'radial-gradient(circle at 30% 20%, rgba(255,122,47,.42), transparent 60%), #0b1226' },
  'Paid Ads': { icon: TrendingUp, base: 'radial-gradient(circle at 30% 20%, rgba(123,92,255,.48), transparent 60%), #0b1226' },
  'Hotel Technology': { icon: Building2, base: 'radial-gradient(circle at 30% 20%, rgba(46,214,175,.4), transparent 60%), #0b1226' },
};

const DEFAULT_STYLE = { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(59,107,255,.4), transparent 60%), #0b1226' };

/** Article thumbnail placeholder — no real photography exists per post, so this renders a
 *  category-tinted 16:9 panel (icon + base radial glow) with a subtle blue-purple gradient
 *  overlay on top, rather than an empty box. Swap for a real `src` once photos are available. */
export default function BlogThumb({ category, className = '' }: { category: string | null; className?: string }) {
  const { icon: Icon, base } = (category && CATEGORY_STYLE[category]) || DEFAULT_STYLE;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '16/9', background: base }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(59,107,255,.22), rgba(123,92,255,.16) 55%, transparent)' }} aria-hidden="true" />
      <div className="absolute inset-0 grid place-items-center">
        <Icon size={38} color="rgba(233,239,255,.35)" strokeWidth={1.5} aria-hidden="true" />
      </div>
    </div>
  );
}
