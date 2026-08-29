import type { ReactNode } from 'react';
import { adminCard } from '../adminTheme';

/** Horizontal-scroll wrapper for admin tables — keeps the page from scrolling sideways on narrow
 *  viewports while letting the table itself scroll, and gives every table the same card chrome. */
export default function ResponsiveTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div style={adminCard} className="overflow-x-auto">
      {children}
    </div>
  );
}
