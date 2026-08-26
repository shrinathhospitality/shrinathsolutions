import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type PublicMenuItem = {
  id: number;
  parent_id: number | null;
  label: string;
  url_type: 'internal' | 'external';
  internal_path: string | null;
  external_url: string | null;
  icon: string | null;
  mega_menu_slug: string | null;
  mega_column: string | null;
  show_desktop: boolean | number;
  show_mobile: boolean | number;
  children: PublicMenuItem[];
  mega?: PublicMenuItem[];
};

export type HeaderData = {
  settings: Record<string, string>;
  primary_menu: PublicMenuItem[];
};

export type FooterSocialLink = { id: number; platform: string; url: string; icon: string | null };
export type FooterLink = { id: number; label: string; url: string };
export type FooterSection = { id: number; title: string; links: FooterLink[] };

export type FooterData = {
  settings: Record<string, string>;
  social_links: FooterSocialLink[];
  sections: FooterSection[];
};

type SiteDataValue = {
  header: HeaderData | null;
  footer: FooterData | null;
  loading: boolean;
};

const SiteDataContext = createContext<SiteDataValue>({ header: null, footer: null, loading: true });

/** Fetches header/footer/menu content once at the app root. Public pages fall back to
 *  their static defaults whenever this is null (still loading, or the request failed). */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<HeaderData | null>(null);
  const [footer, setFooter] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch('/api/public/header', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/public/footer', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([headerRes, footerRes]) => {
        if (headerRes?.success) setHeader(headerRes);
        if (footerRes?.success) setFooter(footerRes);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // Swallow: components fall back to their static defaults.
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return <SiteDataContext.Provider value={{ header, footer, loading }}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteDataValue {
  return useContext(SiteDataContext);
}
