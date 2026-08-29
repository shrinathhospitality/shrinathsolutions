import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from '../lib/analytics';

// Mounted once inside <BrowserRouter>, alongside <App>. Sends a GA4 page_view on every
// client-side route change (send_page_view is disabled in analytics.ts's initial config
// since this is an SPA — the automatic GA snippet would otherwise only ever see the first
// load). No-ops entirely when VITE_GA4_MEASUREMENT_ID isn't set — see src/lib/analytics.ts.
export default function AnalyticsRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
