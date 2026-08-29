import { adminColors } from '../../../admin/adminTheme';

export type ScoreStatus = 'good' | 'needs_improvement' | 'poor' | 'not_analyzed';

export function statusForScore(score: number | null): ScoreStatus {
  if (score === null) return 'not_analyzed';
  if (score >= 80) return 'good';
  if (score >= 50) return 'needs_improvement';
  return 'poor';
}

export const STATUS_META: Record<ScoreStatus, { label: string; color: string; bg: string }> = {
  good: { label: 'Good', color: '#1fa971', bg: '#e6f7ef' },
  needs_improvement: { label: 'Needs Improvement', color: '#c9720b', bg: '#fff2e0' },
  poor: { label: 'Poor', color: adminColors.danger, bg: '#fdecea' },
  not_analyzed: { label: 'Not analyzed', color: adminColors.textMuted, bg: '#f1f3f9' },
};

/** A plain SVG ring, not a charting library — a single arc needs nothing heavier. Score is
 *  always shown as a number and a text status label together, never color alone. */
export function ScoreRing({ score, label, size = 72 }: { score: number | null; label: string; size?: number }) {
  const status = statusForScore(score);
  const meta = STATUS_META[status];
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5" role="group" aria-label={`${label}: ${score === null ? 'not analyzed' : `${score} out of 100, ${meta.label}`}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e4e8f2" strokeWidth={6} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={meta.color} strokeWidth={6}
            strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-heading font-bold" style={{ fontSize: size / 4, color: adminColors.textPrimary }}>
          {score === null ? '—' : score}
        </div>
      </div>
      <div className="text-[12px] font-semibold text-center" style={{ color: adminColors.textMuted }}>{label}</div>
      <StatusPill status={status} />
    </div>
  );
}

export function StatusPill({ status }: { status: ScoreStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}
