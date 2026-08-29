import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { adminColors } from '../adminTheme';

const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

/** Debounced search box — reports the raw keystroke immediately via `onChange` (callers already
 *  debounce their own data fetch through the existing `load()`/`useEffect` pattern) but also
 *  exposes a clear (×) button once there's a value, since that's easy to forget per-page. */
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} aria-hidden="true" />
      <input
        style={{ ...inputStyle, paddingLeft: 34, paddingRight: value ? 30 : 13, width: '100%' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: 8, color: adminColors.textMuted }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export type SelectOption = { value: string; label: string };

export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: SelectOption[]; label: string }) {
  return (
    <select aria-label={label} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function SortSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  return <FilterSelect value={value} onChange={onChange} options={options} label="Sort by" />;
}

/** Wraps the search box, filters, sort, and any extra controls (upload button, "New" link) into
 *  one consistent row. Purely layout — every filter's actual state stays owned by the page. */
export default function TableToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}
