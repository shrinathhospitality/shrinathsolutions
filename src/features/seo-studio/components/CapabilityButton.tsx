import type { ButtonHTMLAttributes } from 'react';
import { useSeoCapability, type SeoCapability } from '../useSeoCapability';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  capability: SeoCapability;
  /** Rendered instead of `disabled` while the session's capability list hasn't loaded yet —
   *  avoids flashing an enabled control that then has to be disabled a moment later. */
  loadingDisabled?: boolean;
};

/** A <button> that disables itself (with an accessible explanation, not just a visual dim) when
 *  the current session lacks the given SEO Studio capability. This is a UX nicety only — every
 *  endpoint these buttons call re-checks the same permission server-side via require_permission()
 *  (api/lib/seo/permissions.php), which is the real, authoritative boundary. */
export function CapabilityButton({ capability, loadingDisabled = true, children, style, ...rest }: Props) {
  const allowed = useSeoCapability(capability);
  const isLoading = allowed === 'loading';
  const disabled = isLoading ? loadingDisabled : !allowed || rest.disabled;

  return (
    <button
      {...rest}
      disabled={disabled}
      aria-disabled={disabled}
      title={!isLoading && !allowed ? `Your account role does not have the "${capability}" permission.` : rest.title}
      style={{ ...style, cursor: disabled ? 'not-allowed' : style?.cursor, opacity: disabled && !isLoading ? 0.55 : style?.opacity }}
    >
      {children}
      {!isLoading && !allowed && <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}> (disabled — missing permission)</span>}
    </button>
  );
}
