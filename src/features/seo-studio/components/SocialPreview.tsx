import { ImageOff } from 'lucide-react';
import { adminColors } from '../../../admin/adminTheme';
import { site } from '../../../data/site';

type Props = {
  ogTitle: string; ogDescription: string; ogImage: string;
  fallbackTitle: string; fallbackDescription: string;
};

/** Facebook/Open Graph + X/Twitter card previews. Falls back to the SEO title/description
 *  when no social-specific override is set, and to the branded default OG image (never a
 *  broken image) when no page-specific image is set. */
export function SocialPreview({ ogTitle, ogDescription, ogImage, fallbackTitle, fallbackDescription }: Props) {
  const title = ogTitle || fallbackTitle || 'Untitled';
  const description = ogDescription || fallbackDescription || '';
  const image = ogImage || '/og-image.png';
  const usingDefaultImage = !ogImage;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['Facebook', 'X (Twitter)'] as const).map((platform) => (
        <div key={platform} className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${adminColors.cardBorder}`, background: '#fff' }}>
          <div className="aspect-[1200/630] w-full grid place-items-center overflow-hidden" style={{ background: '#f1f3f9' }}>
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <ImageOff size={28} style={{ color: adminColors.textMuted }} aria-hidden="true" />
            )}
          </div>
          <div className="p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: adminColors.textMuted }}>{platform}</div>
            <div className="text-[11px] uppercase mt-1" style={{ color: adminColors.textMuted }}>{site.url.replace('https://', '')}</div>
            <div className="text-[14px] font-bold mt-0.5 line-clamp-2">{title}</div>
            <div className="text-[12.5px] mt-0.5 line-clamp-2" style={{ color: adminColors.textMuted }}>{description}</div>
          </div>
        </div>
      ))}
      {usingDefaultImage && (
        <p className="sm:col-span-2 text-[11.5px]" style={{ color: adminColors.textMuted }}>
          Using the branded default social image — set a page-specific image above for a custom preview.
        </p>
      )}
    </div>
  );
}
