import type { VentureTheme } from '../../types/venture';
import { VentureIcon } from './ventureIcons';

/** Tasteful gradient + icon placeholder standing in for real venture photography. Swap the
 *  `background` gradient for a real <img src="/images/ventures/<slug>/..."> once the owner
 *  supplies approved photos — see src/data/ventureImages.ts for per-venture replacement notes.
 *  No "placeholder" text is ever shown to visitors; the label is screen-reader-only. */
export function VentureImage({
  theme, icon, ratio = '16/9', label, className = '',
}: {
  theme: VentureTheme; icon: string; ratio?: string; label: string; className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, background: `linear-gradient(135deg, ${theme.primary}2e, ${theme.accent}26 55%, ${theme.surface})` }}
    >
      <div className="absolute inset-0 grid place-items-center" style={{ color: theme.primary }}>
        <VentureIcon name={icon} size={46} className="opacity-45" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
