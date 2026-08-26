# Shrinath Solutions — website (React + Vite + TypeScript)

Frontend only. No backend, database or admin panel: every form opens WhatsApp with the entered
details, so the site can be hosted as static files.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the built site
```

Node 18 or newer.

## Stack

React 19 · Vite 6 · TypeScript · React Router 7 · Framer Motion · Lucide icons ·
react-helmet-async · Tailwind CSS (layout utilities; the glass/gradient surfaces are inline
style tokens in `src/styles/theme.ts`).

## Where to edit

| What | Where |
| --- | --- |
| Phone, email, WhatsApp number, nav, footer columns | `src/data/site.ts` |
| Mega-menu columns | `src/data/megaMenu.ts` |
| Page copy (all of it) | `src/data/*.ts` — one file per page |
| Pricing plans + comparison table | `src/data/pricing.ts` |
| Portfolio projects and filters | `src/data/portfolio.ts` |
| Blog posts | `src/data/blog.ts` |
| Colours, glass surfaces, buttons | `src/styles/theme.ts` and `src/index.css` |
| Routes | `src/App.tsx` |

No copy lives inside components. Layout is in `src/pages` and `src/components`; words are in
`src/data`.

## Images

Every image is currently a labelled placeholder (`<ImageSlot>`) stating what belongs there and
at what size. To replace one:

1. Put the file in `public/images/` (WebP or AVIF, compressed).
2. Swap the `<ImageSlot .../>` for
   `<img src="/images/your-file.webp" alt="descriptive alt text" width="1600" height="1000" loading="lazy" />`.
3. Keep the alt text descriptive — it is part of the SEO work.

Recommended sizes: project and case-study screenshots 1600 × 1000, hero mockups 1600 × 1000,
section banners 1920 × 840, map/office 1200 × 900, team photo 1600 × 900.

## SEO

Each page sets its own title, meta description, canonical, Open Graph and Twitter tags through
`<Seo>`, plus JSON-LD: ProfessionalService / LocalBusiness, WebSite, Service, BreadcrumbList,
FAQPage and BlogPosting. `public/robots.txt` and `public/sitemap.xml` ship as static files —
update `sitemap.xml` when routes change.

Because this is a client-rendered SPA, add prerendering or SSR before relying on social-preview
crawlers that do not execute JavaScript (`vite-plugin-prerender`, or move to a static export).

## Content rules kept in the code

- No invented client counts, awards or certifications.
- Sample dashboards and statistics are labelled as demo data.
- Case-study results say "add verified figure" rather than showing estimates.
- Channel-manager integrations are placeholders until confirmed per property.
- Pricing shows "Contact for Pricing" — real figures go in `src/data/pricing.ts`.
- Legal pages are placeholders and need professional review before publishing.

## Accessibility

Skip-to-content link, keyboard-navigable accordions and toggles with `aria-expanded` /
`aria-pressed`, visible focus ring, labelled form fields, and `prefers-reduced-motion` honoured
throughout (animations collapse to near-zero duration).

## Not included

Analytics IDs, hosting config, real photography, prerendering, and the illustrated mascot from
the design (the React build ships the simpler WhatsApp assistant instead).
