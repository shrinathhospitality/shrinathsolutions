# Admin CMS guide

## First login

```
URL:      /admin/login
Username: admin
Password: admin123   ← TEMPORARY. Change it immediately after your first login.
```

You'll be forced straight to the change-password screen on first login (`must_change_password` is set on the seeded account) — there's no way to skip it. Pick something at least 10 characters, different from the temporary one.

If you ever need to reseed the first admin (e.g. a fresh database), run `php database/seed_admin.php` — it's idempotent and does nothing if a user named `admin` already exists. Optionally set `ADMIN_SEED_PASSWORD` first to choose a different temporary password.

## What's in each area

**Dashboard** — system status (DB connectivity) and quick links. Content-count cards are placeholders (`—`) until wired to real per-module counts — deliberately not populated with fake numbers.

**Content**
- **Pages** — generic CMS pages built from controlled section types (hero, text, features, cta, etc.). Full draft/publish/schedule/archive, duplicate, and revision history with restore. Sections are edited as a validated JSON array (see the on-screen hint for the shape) rather than a drag-and-drop builder — smaller surface area, still fully server-validated and sanitized.
- **Service Pages** — the 5 migrated hand-built service pages (Website Designing, Online Marketing, SEO Services, Hotel Digital Marketing, Channel Manager) plus any new ones you create. New services render at `/services/{slug}` through the same `ServicePage` template and design system as the originals. Content blocks (paras/cards/steps/kv/pills/ticks/image) are edited as JSON, same rationale as Pages.
- **SEO Pages** — keyword-targeted landing pages, structured forms for all fields (primary keyword, target location, search intent, breadcrumbs, etc.).
- **Blogs** — full TipTap rich-text editor, categories, tags, bulk publish/archive/delete, auto-estimated reading time.
- **Portfolio** — project entries with a TipTap detailed-description editor, results, services/technologies lists.

**Website**
- **Header & Menus** — primary navigation and the full services mega-menu, inline editable with up/down reordering.
- **Footer** — footer sections and links, add/edit/delete.
- **Media Library** — upload (JPEG/PNG/WebP/GIF/PDF, 10MB cap), edit alt/title/caption, copy URL, delete (warns if the file is still used by published content).
- **Site Settings** — a single key-value screen covering both the header/footer content fields and the Global SEO fields (favicon, default meta tags, analytics ID, maintenance mode, etc.) — one screen, not split, since both are just settings.

**SEO**
- **Global SEO** — same Site Settings screen as above.
- **Redirects** — source → destination with 301/302, active/inactive toggle. Rejects self-redirects, duplicate sources, and redirect loops (checked by walking the destination chain, not just a single-hop check).

**Leads**
- **Contact Enquiries** — every contact-form submission, with status (new/contacted/converted/spam), internal notes, and CSV export.
- **Proposal Requests** — schema exists; empty until a distinct "request a proposal" form is built separately from the main contact form (today, that CTA also lands in Contact Enquiries).
- **Newsletter Subscribers** — read-only list from the footer signup.

**System**
- **Audit Logs** — every create/update/delete/publish/login/media action, who did it, and when.
- **Admin Profile** / **Change Password** / **Logout** — self-service account management.

## Security notes worth knowing

- Sessions are DB-backed opaque tokens in an `HttpOnly`, `SameSite=Strict` cookie — never in `localStorage`, never JavaScript-readable.
- Every mutating admin request requires a CSRF token (returned at login/session-check, sent back as `X-CSRF-Token`).
- 5 failed login attempts from the same IP or username locks further attempts for 15 minutes.
- Rich text (blog/portfolio/page/service content) is sanitized server-side on every save — scripts and event-handler attributes are stripped regardless of what the editor produced.

## Reminder

**Change `admin123` now if you haven't already.** It's a known, documented default — leaving it in place on a live site is the single easiest way for this CMS to be compromised.
