import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { adminColors } from '../adminTheme';
import ResponsiveTableWrapper from './ResponsiveTableWrapper';
import { EmptyState, ErrorState, TableSkeleton } from './ListStates';

export type SortDirection = 'asc' | 'desc';

export type Column<T> = {
  key: string;
  header: string;
  /** `index` is the row's position within the current `rows` array (current page/filtered view)
   *  — useful for boundary checks like "disable move-up on the first row". It is not a stable
   *  identity; use `rowKey`/the row's own id for that. */
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Only set this when the page actually has a working sort handler for this column — DataTable
   *  never invents sorting for a column the caller can't really sort. */
  sortable?: boolean;
  /** Set false for short/fixed-width columns (icons, badges, actions) that should never wrap. */
  wrap?: boolean;
};

/** Generic admin list table: header row, one <tr> per item via `columns`, optional row selection
 *  checkboxes, and consistent loading/empty/error states via the shared ListStates components.
 *  Column definitions stay page-owned (`columns` prop) so every module keeps its own field set —
 *  this only standardizes the table chrome, not what's in it. */
export default function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, emptyTitle = 'Nothing here yet', emptyDescription,
  selectable, selectedKeys, onToggleSelect, onToggleSelectAll, rowSelectLabel, caption,
  sortKey, sortDirection, onSortChange, onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onToggleSelect?: (key: string | number) => void;
  /** `checked` reflects only the rows currently passed in `rows` (i.e. the current page/filtered
   *  view) — DataTable never silently expands "select all" to a larger, unfetched result set. */
  onToggleSelectAll?: (checked: boolean) => void;
  /** Per-row accessible label for its selection checkbox, e.g. `(row) => `Select "${row.title}"``.
   *  Falls back to a generic label if omitted. */
  rowSelectLabel?: (row: T) => string;
  /** Accessible table name — visually hidden, describes what the table lists for screen readers. */
  caption?: string;
  /** Current sort column key, if any column is sortable. */
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  /** Opens a row (e.g. a details modal) when the row itself has no other interactive controls.
   *  Do not combine with columns that also render buttons/links unless those stop click
   *  propagation — nesting interactive controls inside a clickable row is invalid markup. */
  onRowClick?: (row: T) => void;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry ?? (() => {})} />;

  if (loading) {
    return (
      <ResponsiveTableWrapper>
        <TableSkeleton cols={columns.length + (selectable ? 1 : 0)} />
      </ResponsiveTableWrapper>
    );
  }

  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedKeys?.has(rowKey(r)));

  return (
    <ResponsiveTableWrapper>
      <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
        {caption && <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{caption}</caption>}
        <thead>
          <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
            {selectable && (
              <th scope="col" className="px-4 py-3" style={{ width: 40 }}>
                <input type="checkbox" aria-label="Select all rows on this page" checked={!!allSelected} onChange={(e) => onToggleSelectAll?.(e.target.checked)} />
              </th>
            )}
            {columns.map((c) => {
              const isActive = c.sortable && sortKey === c.key;
              const SortIcon = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th key={c.key} scope="col" className={`px-4 py-3 font-semibold text-${c.align ?? 'left'} ${c.className ?? ''}`} style={{ color: adminColors.textMuted }}>
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(c.key)}
                      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="inline-flex items-center gap-1 font-semibold focus-visible:outline focus-visible:outline-2"
                      style={{ color: isActive ? adminColors.textPrimary : adminColors.textMuted }}
                    >
                      {c.header}
                      <SortIcon size={12} aria-hidden="true" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={rowSelectLabel?.(row) ?? 'Select row'} checked={!!selectedKeys?.has(key)} onChange={() => onToggleSelect?.(key)} />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 text-${c.align ?? 'left'} ${c.className ?? ''}`}
                    style={c.wrap === false ? { whiteSpace: 'nowrap' } : { overflowWrap: 'anywhere' }}
                  >
                    {c.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResponsiveTableWrapper>
  );
}
