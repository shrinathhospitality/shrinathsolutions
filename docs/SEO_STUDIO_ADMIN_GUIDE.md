# Shrinath SEO Studio — Admin Guide

A plain-language guide for whoever manages content in the Shrinath Solutions admin panel.

## What this is (and isn't)

Shrinath SEO Studio helps you check and improve the SEO of pages already in this CMS — service
pages, blog posts, SEO landing pages, portfolio projects, and general pages. It is **not** the
"Free SEO Audit Tool" on the public website (that checks *other people's* websites for
prospective clients) — this is for your own content.

Every score is calculated fresh from your actual saved content. Nothing is invented, guessed, or
copied from another tool.

## Where to find it

Left sidebar → **SEO** section → **Shrinath SEO Studio**. From there:

- **Dashboard** — a quick health check across everything: how many pages are scoring well,
  which ones need attention, orphan pages, duplicate titles, and a button to rebuild the
  internal-link index.
- **All Content** — a searchable, filterable table of every service, blog post, SEO page,
  portfolio project and page, with its scores and indexability at a glance.
- **Settings** — bulk-analysis batch size and the cornerstone-content staleness threshold.

## Using it inside a Service or Blog Post editor

Open any Service page or Blog post in the admin and scroll down — there's now a **"Shrinath SEO
Studio"** panel between the content fields and the FAQ section.

1. **Set a focus keyphrase** — the main term you want this page to be found for (e.g. "hotel
   website design"). Optionally add up to 5 related keyphrases.
2. **Watch the three scores** update live as you type — SEO Score, Readability, and Overall. This
   live preview never sends anything over the network; it's calculated in your browser.
3. **Open the checklist** below the scores — grouped by category (Keyword, Metadata, Content,
   Readability, Links, Images, Technical). Each item explains what it checked and why it matters.
   Green = passed, orange = needs improvement, red = a real problem worth fixing first.
4. **Check the Metadata & Preview tab** for a Google search-result preview — showing how your
   title and description look, with character counts and a truncation warning if they're too
   long.
5. **Check the Social tab** for how the page looks when shared on Facebook/X.
6. **Save the page as normal** (the same "Save changes" button you already use) — this saves your
   content *and* triggers the authoritative server-side analysis, which replaces the live preview
   with the real, saved score.

For SEO landing pages, portfolio projects, and general pages, use **All Content** to open the
analyzer for that specific item instead — it works the same way, just as its own page rather than
built into the content editor.

## What "Cornerstone content" means

Mark your most important pages (the ones you most want to rank well) as cornerstone. The
dashboard specifically flags cornerstone content that hasn't been re-analyzed in a while, or that
has issues — this is just a bookmark to help you prioritize, it does **not** artificially raise
the page's own score. A cornerstone page with real problems still scores poorly until you fix
them.

## Bulk-analyzing many pages at once

On **All Content**, select several rows and click **"Analyze selected"**, or click **"Analyze all
stale"** to re-check every page whose content has changed since it was last analyzed (or whose
analysis used an older version of the scoring engine). This runs in small batches automatically —
keep the browser tab open until it finishes; closing it mid-run just means you can click the
button again later to pick up where it left off.

## Orphan pages and internal links

A page nobody links to internally is hard for both visitors and search engines to find. The
dashboard shows an orphan-page count; **All Content** with the "Orphan only" filter lists exactly
which pages. The **Links & Suggestions** tab inside a page's SEO Studio panel suggests other pages
you could reasonably link *to* from here, based on shared keyphrase terms — never inserted
automatically, always your choice to add.

If you've made a lot of content changes recently and link counts look stale, use the Dashboard's
**"Rebuild link index"** button.

## Publishing with issues

There's no hard block on publishing content with a low score — you'll see the checklist, but the
existing "Save changes" / "Publish" flow works exactly as it always has. Use your judgment: a
"Needs Improvement" score isn't an error, it's a prioritized to-do list.

## All-Page Integration (every route, not just database content)

SEO landing pages, Portfolio projects, and general Pages now have the exact same live-editor SEO
Studio panel as Service pages and Blog posts — open any of them in their existing editor and
scroll down to find it. Nothing about their normal content editor changed.

**Static pages and Ventures** — Home, About, Contact, the Our Ventures pages, and similar — now
also show up in SEO Studio's **All Content** list and have their own analyzer page (opened via
"Open →" from the list, since they have no dedicated content editor). You can set a focus
keyphrase, edit SEO title/description/canonical/robots, and see a real score for these pages too.

**Update**: for these route-only pages (Home, About, Contact, Our Ventures pages, Services hub,
Portfolio hub, Blog hub, Pricing, and more), the title/description/canonical/robots/social
fields you set in SEO Studio now **do** appear on the live public page and in the prerendered
HTML search engines actually see — this gap from the earlier note above is closed. If you leave
a field blank, the page's own built-in default is used, exactly as before.

## Rebuild required after saving a static/Venture page

Saving one of these route-only pages' SEO fields marks it **"Rebuild required"** in the SEO
Studio document view — your change is saved and will appear next time the site is rebuilt and
redeployed, but the *already-live* prerendered HTML file for that route won't reflect it until
then. This is normal, expected behavior (not a bug): ask your developer to run a rebuild/deploy,
after which the document's status returns to "Up to date." Database-backed content (Service
pages, Blog posts, SEO landing pages, Portfolio, Pages) doesn't have this delay — those render
live on every request.

## Permissions

Every SEO Studio and Redirects action now checks a specific permission behind the scenes
(view/analyze/edit metadata/edit advanced fields like canonical & robots/manage schema/manage
redirects/run bulk actions/manage settings). Right now every admin account has every
permission, so this is invisible day-to-day — it exists so that, if a more limited staff role is
introduced later, it can be restricted safely without touching this module again. If you ever
see a "You don't have permission for this action" message, ask whoever manages admin accounts to
check your role.

Click **"Synchronize registry"** on the SEO Studio dashboard any time you add new content types or
suspect the "All Content" list is missing something — it's safe to click repeatedly and never
deletes anything, only adds or updates.

**Every static page — including the Sitemap page and the two Legal pages** (Privacy Policy,
Terms & Conditions) — now has its saved SEO fields appear on the live page too, the same as
Home, About, and every other static route. The SEO Company Jaisalmer page already worked this
way (it's a normal content page, not a route-only one) — this release also fixed a bug that
was silently hiding its real entry from the "All Content" list on some syncs; that's now fixed
and it appears correctly.

## Understanding a page's prerender status

Open any static or Venture page's analyzer (via "Open →" from **All Content**) to see a new
**Prerender status** panel:

- **Status**: Current (the live page matches what's saved), Stale (saved changes are waiting
  for the next rebuild), Building (a rebuild is currently being applied), Failed (the last
  rebuild attempt for this page didn't complete — the page keeps showing its last good version,
  never something broken), or N/A (this page's metadata doesn't depend on a rebuild).
- **Saved SEO version** / **Prerendered SEO version**: short reference codes — if they match,
  nothing further is needed; if they differ, "Rebuild required" shows **Yes**.
- **Last successful prerender** / **Last build attempt**: when the live page was last actually
  refreshed, and when a rebuild was last tried.

There's no button that deploys a rebuild for you — that step still needs your developer to run
`npm run build:prerender` and apply its result. If a build gets interrupted partway (a server
crash, for example), a page can be left showing "Building" indefinitely; the Dashboard's new
**"Recover abandoned builds"** button checks for anything stuck that way for over an hour and
moves it to "Failed" so it's clearly flagged rather than silently stuck — it never marks
anything as done that wasn't actually verified.

## Redirects: what's new

The Redirects page now supports **307** and **308** redirect types alongside 301/302, shows a
**hit count** and **last hit date** for every redirect, and has **Export CSV** / **Import CSV**
buttons. Importing always shows you a preview first — nothing is created until you review the
preview and click "Import valid rows." A redirect can't be created if its source URL is a real,
currently-published page (that would break a working page), and pointing a redirect at another
website requires an explicit confirmation.

## Free SEO Audit Tool: admin visibility

Every run of the public **Free SEO Audit Tool** (`/seo-audit-tool`) is now recorded under
**SEO → SEO Audit Tool Runs** in the admin sidebar, so you can see how the tool is being used
without needing to check the site's server logs.

**What you'll see per run:** the website's domain and (redacted) URL, whether the audit
completed or failed, the overall score, how many critical/warning/improvement issues were
found, and — only if the visitor chose to share it — their name and email. Clicking a row opens
a detail page with the full category breakdown and recommendations for that run.

**What is deliberately never stored or shown**, even to admins: the visitor's IP address, their
browser's user-agent string, or the full URL they typed (anything after a `?` or `#` — tracking
parameters, tokens, session ids — is stripped before the run is ever saved). This is a
privacy-by-design choice, not a missing feature.

**The optional "Get help fixing these SEO issues" fields**: the audit tool never requires a name
or email to show results — it's always free, no signup, full results every time. The optional
fields exist only so a visitor who wants a hand can leave their details; no email report is sent
automatically (this tool doesn't currently send email at all — the wording says exactly that: an
optional way to ask Shrinath Solutions to follow up, nothing more).

**Working a lead**: open a run that has contact details and use the **Lead status** dropdown —
New → Contacted → Qualified → Closed, or Not interested if it's not a fit. This is exactly the
same kind of tracking as Contact Enquiries, just scoped to the audit tool.

**Deleting old runs**: a developer can run a retention cleanup script on a schedule (see
`docs/SEO_STUDIO_DEPLOYMENT.md`) that removes old anonymous runs automatically, while runs with
a contact lead are kept longer. Nothing is ever deleted automatically without that being set up
and explicitly turned on — this doesn't happen by itself.

## What SEO Studio will never do

- It will never invent search-volume, ranking-position, or traffic numbers — those require a real
  third-party integration this project doesn't have.
- It will never rewrite your content automatically or insert hidden text.
- It will never guarantee a ranking improvement — nothing legitimately can.
- It will never publish a change to your live content without you clicking Save.
