import { adminColors } from '../adminTheme';
import type { InventoryItem } from '../../features/seo-studio/api';
import SeoScoreBadge from './SeoScoreBadge';

/** Compact per-row SEO summary — focus keyword, overall score, index status — used across the
 *  Services/Blog/SEO Pages/Portfolio list tables, all backed by the same SEO Studio inventory
 *  endpoint (/api/admin/seo/content) rather than a separate per-page query. */
export default function SeoInventoryCell({ item, hideKeyword }: { item: InventoryItem | undefined; hideKeyword?: boolean }) {
  if (!item) {
    return <span style={{ color: adminColors.textMuted, fontSize: 12.5 }}>—</span>;
  }
  return (
    <div className="grid gap-1">
      {!hideKeyword && (
        <div
          className="text-[12.5px]"
          style={{ color: item.primary_keyphrase ? adminColors.textPrimary : adminColors.textMuted, fontStyle: item.primary_keyphrase ? 'normal' : 'italic' }}
        >
          {item.primary_keyphrase || 'No focus keyword'}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <SeoScoreBadge score={item.overall_score} lastAnalyzedAt={item.last_analyzed_at} />
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: item.robots_index ? '#1a7f37' : adminColors.textMuted, background: item.robots_index ? '#e6f6ea' : '#f0f1f5' }}
        >
          {item.robots_index ? 'Index' : 'Noindex'}
        </span>
      </div>
    </div>
  );
}
