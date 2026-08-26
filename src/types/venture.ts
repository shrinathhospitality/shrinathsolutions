export type VentureSection = {
  heading: string;
  body?: string;
};

export type VentureTheme = {
  layoutVariant: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  /** Readable text color for content placed on top of `primary` (e.g. primary buttons) —
   *  kept explicit rather than derived, since `surface` is a light color for light-theme
   *  ventures but a dark card color for the two dark-theme ones. */
  onPrimary: string;
};

export type Venture = {
  slug: string;
  name: string;
  shortName?: string;
  tagline: string;
  category: string;
  summary: string;
  phoneNumbers: string[];
  email?: string;
  website?: string;
  googleBusinessUrl?: string;
  theme: VentureTheme;
  services: Array<{ title: string; description: string; icon: string }>;
  highlights: string[];
  sections: VentureSection[];
  faqs: Array<{ question: string; answer: string }>;
  seo: {
    title: string;
    description: string;
    canonicalPath: string;
  };
};
