import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { adminColors } from '../adminTheme';

/** Sticky floating bar shown once at least one row is selected. Callers pass their own action
 *  buttons (each wired to confirm/run through the page's own useConfirmDialog + bulk endpoint) —
 *  this component only owns the count, clear-selection control, and consistent placement/style. */
export default function BulkActionBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 px-4 py-3 rounded-[14px] mx-auto"
      style={{ background: adminColors.textPrimary, color: '#fff', boxShadow: '0 12px 30px rgba(18,24,22,.25)', width: 'fit-content' }}
    >
      <span className="text-[13.5px] font-semibold">{count} selected</span>
      <button type="button" onClick={onClear} className="flex items-center gap-1 text-[12.5px]" style={{ color: 'rgba(255,255,255,.7)' }}>
        <X size={13} /> Clear
      </button>
      <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,.2)' }} aria-hidden="true" />
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
