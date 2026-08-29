import { AlertTriangle, Inbox } from 'lucide-react';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

/** Shared empty/error states for list pages — consistent visuals, real (never fake) messaging. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div style={adminCard} className="p-10 text-center grid justify-items-center gap-2">
      <span className="grid place-items-center rounded-full" style={{ width: 44, height: 44, background: adminColors.contentBg, color: adminColors.textMutedLight }} aria-hidden="true">
        <Inbox size={20} />
      </span>
      <div className="font-heading font-bold text-[15px]" style={{ color: adminColors.textPrimary }}>{title}</div>
      {description && <p className="text-[13.5px] m-0 max-w-[360px]" style={{ color: adminColors.textMuted }}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Couldn't load this data.", onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div style={adminCard} className="p-6 flex items-center justify-between gap-4" role="alert">
      <span className="flex items-center gap-2.5 text-[14px]" style={{ color: adminColors.danger }}>
        <AlertTriangle size={17} aria-hidden="true" /> {message}
      </span>
      <button type="button" onClick={onRetry} className="px-4 py-2 rounded-full text-[13.5px] font-semibold shrink-0" style={adminPrimaryBtn}>
        Retry
      </button>
    </div>
  );
}

/** Generic table-row skeleton — stable layout, no flash of an empty state before data loads. */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <span key={c} className="h-[14px] rounded animate-pulse motion-reduce:animate-none block" style={{ background: '#F0F1F0', width: c === 0 ? '28%' : `${100 / cols}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
