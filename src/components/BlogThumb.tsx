import { Monitor, Search, Megaphone, TrendingUp, Building2, type LucideIcon } from 'lucide-react';

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; base: string; iconColor: string }> = {
  'Website Design': { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(49,87,229,.16), transparent 60%), #eef4ff', iconColor: '#3157e5' },
  SEO: { icon: Search, base: 'radial-gradient(circle at 30% 20%, rgba(34,211,238,.16), transparent 60%), #eafbfd', iconColor: '#0891b2' },
  'Hotel Marketing': { icon: Megaphone, base: 'radial-gradient(circle at 30% 20%, rgba(255,122,61,.16), transparent 60%), #fff7f1', iconColor: '#f06424' },
  'Paid Ads': { icon: TrendingUp, base: 'radial-gradient(circle at 30% 20%, rgba(115,71,232,.16), transparent 60%), #f4f0ff', iconColor: '#7347e8' },
  'Hotel Technology': { icon: Building2, base: 'radial-gradient(circle at 30% 20%, rgba(15,159,117,.16), transparent 60%), #eafbf4', iconColor: '#0f9f75' },
};

const DEFAULT_STYLE = { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(49,87,229,.14), transparent 60%), #eef4ff', iconColor: '#3157e5' };

/** Article thumbnail placeholder — no real photography exists per post, so this renders a
 *  category-tinted 16:9 panel (icon + base radial glow), rather than an empty box. Swap for a
 *  real `src` once photos are available. */
export default function BlogThumb({ category, className = '' }: { category: string | null; className?: string }) {
  const { icon: Icon, base, iconColor } = (category && CATEGORY_STYLE[category]) || DEFAULT_STYLE;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '16/9', background: base, border: '1px solid var(--color-border)' }}>
      <div className="absolute inset-0 grid place-items-center">
        <Icon size={38} color={iconColor} strokeWidth={1.5} opacity={0.6} aria-hidden="true" />
      </div>
    </div>
  );
}
