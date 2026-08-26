import type { CSSProperties } from 'react';

/** Shared inline-style tokens for the light/hybrid theme. `glass`/`glassStrong` used to be
 *  translucent dark "glassmorphism" panels from the old all-dark design — they're now solid
 *  white elevated cards (glassmorphism doesn't read well on light backgrounds), used across
 *  services, portfolio, blog and SEO template cards. Header, Footer and MobileBar stay dark
 *  and don't use these — they set their own explicit dark colors inline. */
export const glass: CSSProperties = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-card)',
};

export const glassStrong: CSSProperties = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.1)',
};

/** Alternate pale-blue surface, for the "one important card may use --color-surface-alt" /
 *  benefit-card / trust-indicator treatment called for throughout the light theme spec. */
export const glassAlt: CSSProperties = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-alt)',
  boxShadow: 'var(--shadow-card)',
};

export const emberBtn: CSSProperties = {
  color: '#180a03',
  background: 'linear-gradient(135deg,#ff9a53,#ff6a1f)',
  boxShadow: '0 14px 34px rgba(255,122,47,.22)',
};

/** Light-surface secondary button: white background, navy text, light border — the "ghost"
 *  button now sits on light sections, not dark ones. */
export const ghostBtn: CSSProperties = {
  color: 'var(--color-heading)',
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-surface)',
};

export const muted = 'var(--color-body)';
export const faint = 'var(--color-muted)';

/** Dark-surface text tokens — for the deliberately-preserved dark panels (Header, Footer,
 *  final dark CTA banners) so those call sites don't hand-roll rgba literals. */
export const darkText = 'var(--color-dark-text)';
export const darkTextMuted = 'var(--color-dark-text-muted)';
