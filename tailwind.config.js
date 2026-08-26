/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { heading: ['Sora', 'sans-serif'], body: ['Manrope', 'sans-serif'] },
      colors: {
        ink: '#060a17',
        navy: '#0b1226',
        blue: '#3b6bff',
        purple: '#7b5cff',
        cyan: '#22d3ee',
        ember: '#ff7a2f',
        paper: '#e9efff',
      },
      maxWidth: { shell: '1340px' },
    },
  },
  plugins: [],
};
