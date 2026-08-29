import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { adminColors } from '../adminTheme';

export type RowAction = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  /** Groups destructive actions visually below a divider (spec: "never place Delete beside
   *  common safe actions without confirmation" — the confirmation itself is the caller's job
   *  via ConfirmDialog; this only handles the visual/semantic separation). */
  separated?: boolean;
};

/** Accessible three-dot row action menu — keyboard-navigable, closes on Escape/outside-click,
 *  returns focus to its trigger, and never renders actions the caller didn't pass in (callers
 *  filter by capability before building the `actions` array). */
export default function RowActionMenu({ actions, label = 'Row actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, actions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, actions.length]);

  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  if (actions.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="grid place-items-center rounded-full focus-visible:outline focus-visible:outline-2"
        style={{ width: 32, height: 32, color: adminColors.textMuted }}
      >
        <MoreVertical size={17} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="absolute right-0 mt-1 min-w-[170px] rounded-[12px] overflow-hidden z-30 py-1"
          style={{ background: adminColors.cardBg, border: `1px solid ${adminColors.cardBorder}`, boxShadow: '0 12px 28px rgba(18,24,22,.14)' }}
        >
          {actions.map((a, i) => (
            <div key={a.label}>
              {a.separated && i > 0 && <div style={{ borderTop: `1px solid ${adminColors.cardBorder}`, margin: '4px 0' }} />}
              <button
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => { setOpen(false); triggerRef.current?.focus(); a.onClick(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ color: a.danger ? adminColors.danger : adminColors.textPrimary, minHeight: 40 }}
              >
                {a.icon}
                {a.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
