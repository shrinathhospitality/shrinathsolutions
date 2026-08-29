import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Whether the current session may use this action. Callers compute this from whatever real
   *  permission source applies to the page (seoCapabilities, ventureCapabilities, or `user.role`
   *  for plain-CRUD modules) — this component never invents its own permission model, it only
   *  standardizes the disabled/tooltip/accessibility treatment once that boolean is known. */
  allowed: boolean;
  /** Shown as a title tooltip and to screen readers when disabled because of `allowed`. */
  deniedReason?: string;
};

/** Generic permission-gated button for modules that don't have a capability list (Pages, Blog,
 *  Services, etc). For SEO Studio and Ventures screens, prefer their existing dedicated
 *  `CapabilityButton` components, which already do this against the real capability arrays. */
export default function PermissionButton({ allowed, deniedReason = 'Your account role does not have permission for this action.', children, style, disabled, ...rest }: Props) {
  const isDisabled = !allowed || disabled;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      title={!allowed ? deniedReason : rest.title}
      style={{ ...style, cursor: isDisabled ? 'not-allowed' : style?.cursor, opacity: isDisabled ? 0.55 : style?.opacity }}
    >
      {children}
      {!allowed && <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}> (disabled — missing permission)</span>}
    </button>
  );
}
