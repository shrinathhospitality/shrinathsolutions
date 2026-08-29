import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, MinusCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { adminColors } from '../../../admin/adminTheme';
import { CHECK_META } from '../checkMeta';
import type { CheckResult } from '../engine/types';

const OUTCOME_META: Record<CheckResult['outcome'], { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  passed: { label: 'Passed', color: adminColors.success, Icon: CheckCircle2 },
  improvement: { label: 'Improvement', color: '#c9720b', Icon: TrendingUp },
  warning: { label: 'Warning', color: '#c9720b', Icon: AlertTriangle },
  failed: { label: 'Critical', color: adminColors.danger, Icon: XCircle },
  unavailable: { label: 'Not available', color: adminColors.textMuted, Icon: MinusCircle },
  informational: { label: 'Info', color: adminColors.accentBlue, Icon: Info },
};

const CATEGORY_LABELS: Record<string, string> = {
  keyword: 'Keyword & search intent', metadata: 'Metadata', content: 'Content structure',
  readability: 'Readability', links: 'Links', images: 'Images', technical: 'Technical & indexability',
};

function CheckRow({ check }: { check: CheckResult }) {
  const outcome = OUTCOME_META[check.outcome];
  const meta = CHECK_META[check.id];
  return (
    <li className="flex items-start gap-2.5 py-2.5" style={{ borderTop: `1px solid ${adminColors.cardBorder}` }}>
      <outcome.Icon size={17} style={{ color: outcome.color, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold">{meta?.title ?? check.id}</span>
          <span className="text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: outcome.color, background: `${outcome.color}18` }}>
            {outcome.label}
          </span>
        </div>
        {check.detail && <div className="text-[12.5px] mt-0.5" style={{ color: adminColors.textMuted }}>{check.detail}</div>}
        {meta?.why && <div className="text-[11.5px] mt-0.5 italic" style={{ color: adminColors.textMuted }}>Why it matters: {meta.why}</div>}
      </div>
    </li>
  );
}

/** Grouped, keyboard-accessible accordion of every check result. `aria-live` announces when a
 *  fresh analysis result replaces the previous one (spec: analysis-completion announcement). */
export function ChecklistPanel({ checks, isAnalyzing }: { checks: CheckResult[]; isAnalyzing?: boolean }) {
  const [openCategory, setOpenCategory] = useState<string | null>('keyword');
  const byCategory = new Map<string, CheckResult[]>();
  for (const c of checks) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }

  return (
    <div>
      <div aria-live="polite" className="sr-only">
        {isAnalyzing ? 'Analyzing…' : checks.length > 0 ? 'Analysis complete.' : ''}
      </div>
      {[...byCategory.entries()].map(([cat, catChecks]) => {
        const isOpen = openCategory === cat;
        const failedCount = catChecks.filter((c) => c.outcome === 'failed').length;
        const warnCount = catChecks.filter((c) => c.outcome === 'warning' || c.outcome === 'improvement').length;
        return (
          <div key={cat} className="mb-2 rounded-[12px] overflow-hidden" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            <button
              type="button"
              onClick={() => setOpenCategory(isOpen ? null : cat)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
              style={{ background: '#fafbfd' }}
            >
              <span className="text-[13.5px] font-bold">{CATEGORY_LABELS[cat] ?? cat}</span>
              <span className="flex items-center gap-2 text-[12px]" style={{ color: adminColors.textMuted }}>
                {failedCount > 0 && <span style={{ color: adminColors.danger, fontWeight: 700 }}>{failedCount} critical</span>}
                {warnCount > 0 && <span>{warnCount} to improve</span>}
                <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} aria-hidden="true" />
              </span>
            </button>
            {isOpen && (
              <ul className="px-3.5 pb-1">
                {catChecks.map((c) => <CheckRow key={c.id} check={c} />)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
