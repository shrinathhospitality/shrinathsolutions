import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2020' },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
    // The PHP backend (api/) and the pre-integration reference copy (seotoolkit/)
    // don't need HMR watching, and api/seo-toolkit/config/cacert.pem in particular
    // is a large binary file that can trip Vite's watcher on Windows.
    watch: { ignored: ['**/api/**', '**/seotoolkit/**'] },
  },
});
