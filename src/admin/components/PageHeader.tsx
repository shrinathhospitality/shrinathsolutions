import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminColors } from '../adminTheme';

export type Crumb = { label: string; to?: string };

/** Breadcrumb trail — last crumb renders as plain text (current page), earlier ones link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-[12.5px]" style={{ color: adminColors.textMuted }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:underline" style={{ color: adminColors.textMuted }}>{item.label}</Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} style={isLast ? { color: adminColors.textPrimary, fontWeight: 600 } : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Standard admin list-page header — breadcrumb, title, description, and right-aligned actions
 *  (primary "New" button, export links, etc). Every list page should render exactly one of these
 *  instead of hand-rolling its own title row. */
export default function PageHeader({
  title, description, breadcrumbs, actions, count,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Optional total-record count shown next to the title, e.g. "128 total". */
  count?: number;
}) {
  return (
    <div className="grid gap-1.5 mb-1">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-[20px] m-0 flex items-center gap-2" style={{ color: adminColors.textPrimary }}>
            {title}
            {typeof count === 'number' && (
              <span className="text-[12.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: adminColors.primarySoft, color: adminColors.primary }}>
                {count}
              </span>
            )}
          </h1>
          {description && <p className="text-[13.5px] m-0 mt-0.5" style={{ color: adminColors.textMuted }}>{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
