import type { CSSProperties } from 'react';

/** Shared inline-style tokens for the liquid-glass surfaces. */
export const glass: CSSProperties = {
  border: '1px solid rgba(255,255,255,.11)',
  background: 'rgba(255,255,255,.05)',
  backdropFilter: 'blur(18px) saturate(150%)',
  WebkitBackdropFilter: 'blur(18px) saturate(150%)',
  boxShadow: '0 18px 40px rgba(2,6,23,.32), inset 0 1px 0 rgba(255,255,255,.2)',
};

export const glassStrong: CSSProperties = {
  ...glass,
  border: '1px solid rgba(255,255,255,.14)',
  background: 'rgba(255,255,255,.06)',
  boxShadow: '0 30px 70px rgba(2,6,23,.55), inset 0 1px 0 rgba(255,255,255,.3)',
};

export const emberBtn: CSSProperties = {
  color: '#180a03',
  background: 'linear-gradient(135deg,#ff9a53,#ff6a1f)',
  boxShadow: '0 14px 34px rgba(255,122,47,.35)',
};

export const ghostBtn: CSSProperties = {
  color: '#eaf1ff',
  border: '1px solid rgba(255,255,255,.2)',
  background: 'rgba(255,255,255,.06)',
};

export const muted = 'rgba(226,234,255,.7)';
export const faint = 'rgba(226,234,255,.5)';
