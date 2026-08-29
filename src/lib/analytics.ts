// GA4 analytics — entirely optional and safe by default. With no VITE_GA4_MEASUREMENT_ID
// set, every function here is a no-op (no script is ever injected, no network request is
// ever made). Never pass personal data (name, phone, email, message text, or any submitted
// URL/audit id) into these helpers — only label-style, non-identifying values.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

let initialized = false;

export function isAnalyticsEnabled(): boolean {
  return Boolean(MEASUREMENT_ID);
}

export function initAnalytics(): void {
  if (!MEASUREMENT_ID || initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  // send_page_view is off: this is a client-routed SPA, so page views are sent manually via
  // trackPageView() on each route change instead (see AnalyticsRouteTracker).
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

function send(eventName: string, params?: Record<string, string | number | boolean>): void {
  if (!MEASUREMENT_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function trackPageView(path: string): void {
  send('page_view', { page_path: path });
}

export function trackWhatsappClick(source: string): void {
  send('whatsapp_click', { source });
}

export function trackPhoneClick(source: string): void {
  send('phone_click', { source });
}

export function trackCtaClick(label: string, location: string): void {
  send('cta_click', { label, location });
}

export function trackFormSubmit(formName: string): void {
  send('form_submit', { form_name: formName });
}

export function trackAuditToolSubmit(): void {
  send('audit_tool_submit');
}

export function trackAuditToolResult(scoreBand: 'low' | 'medium' | 'high'): void {
  send('audit_tool_result', { score_band: scoreBand });
}

export function trackOutboundLink(domain: string): void {
  send('outbound_click', { domain });
}
