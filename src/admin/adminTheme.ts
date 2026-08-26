import type { CSSProperties } from 'react';

/** Admin-panel palette: dark navy sidebar, light content area, brand accents. Data-first, not decorative. */
export const adminColors = {
  sidebarBg: '#0b0f1f',
  sidebarBorder: 'rgba(255,255,255,.08)',
  sidebarText: 'rgba(226,234,255,.68)',
  sidebarTextActive: '#ffffff',
  contentBg: '#f4f6fb',
  cardBg: '#ffffff',
  cardBorder: '#e4e8f2',
  textPrimary: '#101425',
  textMuted: '#5b6478',
  accentBlue: '#3b6bff',
  accentPurple: '#7b5cff',
  accentOrange: '#ff7a2f',
  danger: '#e0473e',
  success: '#1fa971',
};

export const adminCard: CSSProperties = {
  background: adminColors.cardBg,
  border: `1px solid ${adminColors.cardBorder}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(16,20,37,.04)',
};

export const adminPrimaryBtn: CSSProperties = {
  background: `linear-gradient(135deg, ${adminColors.accentBlue}, ${adminColors.accentPurple})`,
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 10px 24px rgba(59,107,255,.28)',
};
