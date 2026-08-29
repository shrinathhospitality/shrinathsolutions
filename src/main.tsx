import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AnalyticsRouteTracker from './components/AnalyticsRouteTracker';
import './index.css';

const rootEl = document.getElementById('root')!;

const app = (
  <StrictMode>
    <BrowserRouter>
      <AnalyticsRouteTracker />
      <App />
    </BrowserRouter>
  </StrictMode>
);

// scripts/prerender.mjs marks prerendered routes with data-prerendered="true" on the root div
// (see its output — dist/{route}/index.html) — genuine server-rendered markup exists there, so
// hydrateRoot reuses it. Every other route (never prerendered, or served straight from
// index.html via api/spa-router.php's SPA fallback) has an empty root div and renders fresh
// with createRoot, exactly as before this phase.
if (rootEl.hasAttribute('data-prerendered')) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}
