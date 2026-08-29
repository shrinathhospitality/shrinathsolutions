import { adminColors } from '../adminTheme';

function scoreColor(score: number | null): string {
  if (score === null) return adminColors.textMutedLight;
  if (score >= 80) return '#1a7f37';
  if (score >= 50) return '#9a6700';
  return '#b42318';
}

/** Small progress-ring SEO score badge with a tooltip showing the exact score and last-analysis
 *  time. Standalone version of the score half of SeoInventoryCell, for places that only need the
 *  score (not the full keyword + index-status cell) — e.g. a compact column or a card footer. */
export default function SeoScoreBadge({ score, lastAnalyzedAt }: { score: number | null; lastAnalyzedAt?: string | null }) {
  const color = scoreColor(score);
  const pct = score ?? 0;
  const title = score === null
    ? 'Not analyzed yet'
    : `SEO score: ${score}/100${lastAnalyzedAt ? ` · last analyzed ${new Date(lastAnalyzedAt).toLocaleString()}` : ''}`;

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2 py-1 rounded-full"
      style={{ color, background: score === null ? '#F5F6F7' : `${color}1A` }}
    >
      <span
        aria-hidden="true"
        className="inline-block rounded-full"
        style={{
          width: 12,
          height: 12,
          background: score === null ? '#E4E8E7' : `conic-gradient(${color} ${pct * 3.6}deg, #E4E8E7 0deg)`,
        }}
      />
      {score === null ? 'Not analyzed' : `${score}/100`}
    </span>
  );
}
