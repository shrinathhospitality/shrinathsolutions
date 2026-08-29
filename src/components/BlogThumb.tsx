import { useState } from 'react';
import { Monitor, Search, Megaphone, TrendingUp, Building2, type LucideIcon } from 'lucide-react';
import { mediaUrl } from '../lib/media';

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; base: string; iconColor: string }> = {
  'Website Design': { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(49,87,229,.16), transparent 60%), #eef4ff', iconColor: '#3157e5' },
  SEO: { icon: Search, base: 'radial-gradient(circle at 30% 20%, rgba(34,211,238,.16), transparent 60%), #eafbfd', iconColor: '#0891b2' },
  'Hotel Marketing': { icon: Megaphone, base: 'radial-gradient(circle at 30% 20%, rgba(255,122,61,.16), transparent 60%), #fff7f1', iconColor: '#f06424' },
  'Paid Ads': { icon: TrendingUp, base: 'radial-gradient(circle at 30% 20%, rgba(115,71,232,.16), transparent 60%), #f4f0ff', iconColor: '#7347e8' },
  'Hotel Technology': { icon: Building2, base: 'radial-gradient(circle at 30% 20%, rgba(15,159,117,.16), transparent 60%), #eafbf4', iconColor: '#0f9f75' },
};

const DEFAULT_STYLE = { icon: Monitor, base: 'radial-gradient(circle at 30% 20%, rgba(49,87,229,.14), transparent 60%), #eef4ff', iconColor: '#3157e5' };

/** Article thumbnail — renders the post's real featured image when one is set (via the admin's
 *  Media Library "Featured Image" field), falling back to a category-tinted placeholder panel
 *  for posts that don't have a photo yet. */
export default function BlogThumb({ category, image, title, className = '' }: { category: string | null; image?: string | null; title?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? mediaUrl(image) : null;
  const { icon: Icon, base, iconColor } = (category && CATEGORY_STYLE[category]) || DEFAULT_STYLE;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '16/9', background: base, border: '1px solid var(--color-border)' }}>
      {src ? (
        <img src={src} alt={title ?? ''} loading="lazy" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Icon size={38} color={iconColor} strokeWidth={1.5} opacity={0.6} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
