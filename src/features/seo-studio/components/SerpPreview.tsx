import { adminColors } from '../../../admin/adminTheme';
import { site } from '../../../data/site';

/** Illustrative desktop/mobile Google-style preview — approximate, not a guarantee of how
 *  Google will actually render the snippet (title/description truncation ultimately depends
 *  on Google's own rendering, which changes over time and isn't something this can promise). */
export function SerpPreview({ title, description, path }: { title: string; description: string; path: string }) {
  const displayTitle = title || 'Untitled — Shrinath Solutions';
  const displayDescription = description || 'No meta description set.';
  const titleTooLong = title.length > 60;
  const descTooLong = description.length > 156;
  const url = `${site.url}${path}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['desktop', 'mobile'] as const).map((mode) => (
        <div key={mode} className="p-4 rounded-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}`, background: '#fff', maxWidth: mode === 'mobile' ? 360 : undefined }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: adminColors.textMuted }}>{mode === 'desktop' ? 'Desktop' : 'Mobile'} preview</div>
          <div className="text-[13px]" style={{ color: '#202124' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)' }}>S</span>
              <span className="truncate" style={{ color: '#202124' }}>{site.name}</span>
            </div>
            <div className="text-[12px] truncate" style={{ color: '#4d5156' }}>{url}</div>
            <div className="text-[18px] leading-snug mt-0.5" style={{ color: '#1a0dab', wordBreak: 'break-word' }}>{displayTitle}</div>
            <div className="text-[13.5px] leading-snug mt-1" style={{ color: '#4d5156' }}>{displayDescription}</div>
          </div>
        </div>
      ))}
      <div className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: adminColors.textMuted }}>
        <span>Title: {title.length} chars{titleTooLong && <strong style={{ color: '#c9720b' }}> — likely truncated</strong>}</span>
        <span>Description: {description.length} chars{descTooLong && <strong style={{ color: '#c9720b' }}> — likely truncated</strong>}</span>
      </div>
      <p className="sm:col-span-2 text-[11px]" style={{ color: adminColors.textMuted }}>
        Illustrative only — Google may render titles and descriptions differently.
      </p>
    </div>
  );
}
