/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { heading: ['Sora', 'sans-serif'], body: ['Manrope', 'sans-serif'] },
      colors: {
        // Legacy dark-chrome tokens — Header, Footer, MobileBar and any panel that
        // intentionally stays dark still use these.
        ink: '#060a17',
        navy: '#0b1226',
        blue: '#3b6bff',
        purple: '#7b5cff',
        cyan: '#22d3ee',
        ember: '#ff7a2f',
        paper: '#e9efff',
        // Light/hybrid theme tokens — the sitewide default.
        page: '#f7f9fc',
        surface: '#ffffff',
        'surface-alt': '#eef4ff',
        'surface-warm': '#fff7f1',
        heading: '#0b1739',
        body: '#475569',
        slate: '#64748b',
        border: '#dce4ef',
        'border-strong': '#cbd5e1',
        primary: '#3157e5',
        'primary-dark': '#2444be',
        secondary: '#7347e8',
        accent: '#ff7a3d',
        'accent-hover': '#f06424',
        dark: '#07142e',
        'dark-surface': '#0b1c3b',
      },
      boxShadow: {
        card: '0 12px 35px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 18px 45px rgba(49, 87, 229, 0.14)',
      },
      maxWidth: { shell: '1340px' },
    },
  },
  plugins: [],
};
