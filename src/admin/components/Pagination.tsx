import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminColors, adminPrimaryBtn } from '../adminTheme';

/** Prev/Next + numbered pages, capped to a window around the current page so it doesn't sprawl
 *  on large tables (Audit Logs, Redirects). Replaces each page's own hand-rolled page-number loop. */
export default function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const navBtn: React.CSSProperties = { border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted };

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className="w-8 h-8 rounded-full grid place-items-center disabled:opacity-40" style={navBtn}>
        <ChevronLeft size={15} />
      </button>
      {start > 1 && <span style={{ color: adminColors.textMutedLight }}>…</span>}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className="w-8 h-8 rounded-full text-[13px] font-semibold"
          style={p === page ? adminPrimaryBtn : navBtn}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span style={{ color: adminColors.textMutedLight }}>…</span>}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="w-8 h-8 rounded-full grid place-items-center disabled:opacity-40" style={navBtn}>
        <ChevronRight size={15} />
      </button>
    </nav>
  );
}
