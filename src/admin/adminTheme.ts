import type { CSSProperties } from 'react';

/** Admin-panel design tokens — light sidebar, white surfaces, deep-emerald primary with a lime
 *  accent. Every existing admin screen already styles itself through these tokens (`adminCard`,
 *  `adminColors.*`, `adminPrimaryBtn`) rather than one-off colors, so changing the values here is
 *  what recolors the whole admin panel — no per-page edits needed for the base look. Key NAMES
 *  are kept stable even where their role shifted (e.g. `accentBlue` is now the emerald primary)
 *  specifically so every existing call site keeps compiling and re-themes for free. */
export const adminColors = {
  // Layout surfaces
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#E4E8E7',
  sidebarText: '#66716E',
  sidebarTextActive: '#FFFFFF',
  contentBg: '#F5F6F7',
  cardBg: '#FFFFFF',
  cardBorder: '#E4E8E7',

  // Text
  textPrimary: '#121816',
  textMuted: '#66716E',
  textMutedLight: '#929C99',

  // Brand
  primary: '#14665B',
  primaryHover: '#0F5148',
  primarySoft: '#E4F1EE',
  lime: '#B7F56A',
  limeSoft: '#EEFDDC',

  // Legacy names kept for the ~100 existing call sites — repointed to the new palette so the
  // whole admin re-themes without touching every file. New code should prefer `primary`/`lime`
  // directly over `accentBlue`/`accentPurple`.
  accentBlue: '#14665B',
  accentPurple: '#0F5148',
  accentOrange: '#F2A918',

  // Status
  danger: '#DC4545',
  warning: '#F2A918',
  success: '#37A866',
  info: '#4778E8',
};

export const adminCard: CSSProperties = {
  background: adminColors.cardBg,
  border: `1px solid ${adminColors.cardBorder}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(18,24,22,.04)',
};

export const adminPrimaryBtn: CSSProperties = {
  background: adminColors.primary,
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 8px 20px rgba(20,102,91,.22)',
};

/** Secondary/soft button — emerald text and tint background, no border. Used where a primary
 *  button would be too heavy (e.g. a second action beside a primary one). */
export const adminSoftBtn: CSSProperties = {
  background: adminColors.primarySoft,
  color: adminColors.primary,
  fontWeight: 700,
};
