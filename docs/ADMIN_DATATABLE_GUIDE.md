# Admin DataTable — usage, conventions, and where it does (and doesn't) apply

This documents the shared `DataTable` component (`src/admin/components/DataTable.tsx`) introduced
during the "Admin Lists, Tables, Toolbars & Safe Confirmation System" and "DataTable Integration,
Column Conformance & Responsive QA" phases of the admin redesign.

## API

```tsx
<DataTable<RowType>
  columns={columns}              // Column<RowType>[]
  rows={rows}
  rowKey={(row) => row.id}       // stable identity, never an array index
  loading={loading}
  error={loadError}              // string | null — safe message only, never a stack trace
  onRetry={() => load(meta.page)}
  emptyTitle="No X yet"
  emptyDescription="..."
  caption="Screen-reader table name describing what this table lists."
  selectable                     // optional — only when a real bulk workflow exists
  selectedKeys={selected}
  onToggleSelect={(key) => ...}
  onToggleSelectAll={(checked) => ...}
  rowSelectLabel={(row) => `Select "${row.title}"`}
  sortKey={sortKey}               // optional — only when a real sort handler exists
  sortDirection={sortDirection}
  onSortChange={(key) => ...}
  onRowClick={(row) => setSelected(row)}  // optional — only when the row has no other controls
/>
```

`Column<T>`:

```ts
type Column<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sortable?: boolean;   // only set when onSortChange actually does something for this column
  wrap?: boolean;       // false for short/fixed columns (badges, dates, actions); default wraps
};
```

Column arrays are built by a small factory function per page (e.g. `pagesColumns(...)`,
`venturesColumns(...)`) rather than inlined in JSX — keeps the render method readable and the
column list independently testable/readable. They are not memoized: column arrays are cheap pure
functions of a few closures, and no page migrated so far showed a measurable re-render cost from
rebuilding them each render. Don't add `useMemo` here without first measuring an actual problem.

## What DataTable owns vs. what stays page-owned

DataTable owns: table chrome (`<table>`/`<thead>`/`<tbody>`), the responsive horizontal-scroll
wrapper, loading skeleton, empty state, error state with retry, optional selection checkboxes,
optional sort-button semantics, `scope="col"` headers, and a visually-hidden caption.

Every page keeps ownership of: what columns exist, what each cell renders (including `StatusBadge`,
`SeoScoreBadge`, `RowActionMenu`, edit links, etc.), search/filter state, pagination, and all CRUD
logic. DataTable never fetches data, never invents a column, and never assumes the shape of a row
beyond genericity.

## Suitable vs. unsuitable cases

Migrated to `DataTable`: Testimonials (pilot), Pages, Services, Ventures, Blog, SEO Pages,
Portfolio, Enquiries, Audit Logs, Newsletter Subscribers, Proposal Requests.

Intentionally **not** migrated, with reasons:

- **SEO Studio "All Content"** (`src/admin/pages/seo-studio/ContentInventory.tsx`) — has a wider
  column set (content type, keyphrase, SEO/readability/overall scores, indexability, link counts,
  last-analyzed), multiple filters, bulk selection tied to bulk *analysis* (not just delete), and a
  denser comparison-table use case where administrators visually scan many score columns side by
  side. The generic `DataTable` selection model and column list would need to grow
  SEO-Studio-specific concepts (multi-metric columns, stale-analysis highlighting) that don't belong
  in a page-agnostic shared component. Retaining its own table (already using the shared
  `ResponsiveTableWrapper`/badge components via `PageHeader`) keeps comparison and bulk-analysis
  fast and readable. Revisit if/when a second page needs the same multi-score comparison layout.
- **Redirects** (`src/admin/pages/Redirects.tsx`) — the CSV import-preview table (a *second*,
  transient table with its own valid/invalid-row semantics) and the source/destination/status-code/
  hit-count/notes table together are tightly coupled to the import workflow. `ConfirmDialog` is
  already wired for delete; the toggle-status control is already a `CapabilityButton`. Migrating the
  main table without the preview table would create two divergent table styles on one page, which is
  a worse outcome than the current single consistent (if page-owned) table.
- **Media Library** (`src/admin/pages/Media.tsx`) — a thumbnail grid, not tabular data. Spec and
  general UX guidance agree: don't force a grid into rows/columns. It already got the
  `PageHeader`/`SearchInput`/`Pagination`/`EmptyState` treatment from the toolbar phase; a future
  list-view toggle, if ever added, would be the point to consider `DataTable` there — not now.

"Not migrated because it doesn't fit" is a valid, documented outcome — adoption is not measured by
forcing every list into one component.

## RowActionMenu vs. flat inline actions

Use `RowActionMenu` when a row has more than ~3 actions, or when actions are conditionally rendered
based on capability/status (Ventures: publish/unpublish/archive/restore, all capability- and
status-gated). Keep a flat inline icon row when there are only 2-3 always-relevant actions
(SEO Pages, Portfolio: View/Edit/Delete) — collapsing 3 stable actions into a menu adds a click for
no accessibility or clarity benefit.

## Sorting

`sortable` is only ever set on a column when the page has a real `onSortChange` handler wired to an
actual sort — no migrated page currently has server-side or client-side sorting implemented, so no
column is currently marked `sortable`. The header-button/`aria-sort` machinery exists in `DataTable`
for the first page that adds real sorting, so it isn't invented and then discarded later.

## Pagination and search-state interaction

Pagination remains page-owned (`<Pagination page={meta.page} totalPages={meta.total_pages}
onChange={load} />`), unchanged by this phase. Every migrated list already resets to page 1 when a
new search fires (`load(1)` in `useEffect`) and re-requests the current page number on retry. No
page fetches an unbounded result set to fake client-side pagination — all use `per_page` server-side.

## Bulk selection scope

Only Blog has a real bulk workflow (`/api/admin/blog/bulk`), so only Blog's `DataTable` sets
`selectable`. "Select all" only ever means the rows currently loaded into `rows` (the current
page/filtered view) — `DataTable`'s header checkbox label says "Select all rows on this page"
explicitly so this is never ambiguous to a screen-reader user. No other page's selection model was
invented — Services/Portfolio/etc. have no bulk endpoint, so they were left without `selectable`.

## Accessibility rules encoded in DataTable

- `<th scope="col">` on every header cell.
- A visually-hidden `<caption>` names the table for screen readers (`caption` prop) — always pass
  one when migrating a page.
- Row/select-all checkboxes take an explicit `aria-label` (`rowSelectLabel`), not a bare "Select".
- Sortable headers are real `<button>`s with `aria-sort`, not a clickable `<th>` with no semantics.
- Status is never color-only — every migrated page continues to pair `StatusBadge`/status pills with
  text.
- Cells default to `overflow-wrap: anywhere` so long titles/emails/URLs wrap instead of causing
  horizontal blowout; short/fixed columns (badges, dates, actions) opt out via `wrap: false`.
- `onRowClick` exists for the Enquiries "click a row to see details" pattern specifically because
  that row has no other interactive controls — never combine `onRowClick` with a row that also
  renders buttons/links unless those stop event propagation.

## PermissionButton — intentionally unused outside SEO/Ventures

`PermissionButton` (`src/admin/components/PermissionButton.tsx`) exists as a generic
allowed/disabled-button wrapper, but **no plain-CRUD module (Pages, Services, Blog, Portfolio, SEO
Pages, Testimonials, Enquiries, Newsletter, Proposals, Audit Logs) wires it in**, because the backend
session for those modules exposes no per-action capability list to check against — only a bare
`user.role`. Wiring a frontend-only permission gate there would either (a) fabricate a capability
model that doesn't exist server-side, which the backend wouldn't enforce anyway, or (b) gate on
`role` directly, which duplicates/guesses at a policy the backend doesn't expose in a structured way.
Neither is acceptable per this phase's explicit constraint against inventing frontend-only
permissions.

Where a real capability list *does* exist — SEO Studio (`seoCapabilities`) and Ventures
(`ventureCapabilities`), both delivered by `/api/admin/session` and enforced server-side — the
existing dedicated `CapabilityButton` (SEO Studio) and inline `canPublish`/`canArchive`/`canReorder`
checks (Ventures) are used consistently, unchanged by this phase. If the backend is ever extended to
expose capabilities for other modules, `PermissionButton` is ready to be wired against them without
further component work.

## Responsive strategy

Every `DataTable` renders inside `ResponsiveTableWrapper`, which scrolls horizontally within its own
card rather than letting the page scroll sideways. No column is hidden at narrow widths — per spec,
horizontal scroll is preferred over silently dropping information. This was verified by code
inspection (the wrapper's CSS is unconditional, not viewport-gated) — **actual rendering at the
specified breakpoints (1920 down to 360px) was not verified in a browser**, since no browser tooling
is available in this environment. Treat responsive QA as a code-level pass only until someone opens
these pages in a real viewport.

## Known limitations / not done this phase

- No page has real column sorting yet — the `sortable`/`onSortChange` plumbing is present but unused.
- Visual/browser QA (screenshots, live keyboard-only walkthroughs, actual viewport testing) was not
  performed — no browser automation tool was available in this session. Everything above was
  verified by `tsc --noEmit`, a production build, and reading the resulting component/page code, not
  by rendering it.
- SEO Studio All Content, Redirects, and Media Library remain on their own table/grid
  implementations by design (see above), not because migration was attempted and failed.
