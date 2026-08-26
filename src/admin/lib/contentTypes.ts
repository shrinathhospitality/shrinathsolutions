export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export const STATUS_OPTIONS: ContentStatus[] = ['draft', 'published', 'scheduled', 'archived'];

export const STATUS_COLORS: Record<ContentStatus, { bg: string; text: string }> = {
  draft: { bg: '#f1f3f9', text: '#5b6478' },
  published: { bg: '#e6f7ef', text: '#1fa971' },
  scheduled: { bg: '#eef0ff', text: '#3b6bff' },
  archived: { bg: '#fdecea', text: '#e0473e' },
};

export type SeoFields = {
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  robots_index?: boolean;
  robots_follow?: boolean;
};

export type FaqItem = { question: string; answer: string };

export type SectionKind = 'paras' | 'ticks' | 'steps' | 'kv' | 'testimonial' | 'html';

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  paras: 'Paragraphs',
  ticks: 'Checklist',
  steps: 'Numbered steps',
  kv: 'Stat panel (numbers)',
  testimonial: 'Testimonial / case study',
  html: 'Rich text (HTML)',
};

export type ContentSection = {
  kind: SectionKind;
  heading: string;
  body?: string;
  items: any[];
  meta?: { name?: string; role?: string; company?: string };
};
