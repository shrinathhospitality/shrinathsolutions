import { useAuth } from '../../admin/context/AuthContext';

export type SeoCapability =
  | 'seo.view' | 'seo.analyze' | 'seo.edit_metadata' | 'seo.edit_advanced'
  | 'seo.manage_schema' | 'seo.manage_redirects' | 'seo.run_bulk' | 'seo.manage_settings';

/** Reads the current session's SEO Studio capabilities from AuthContext (sourced from the
 *  authenticated /api/admin/session response — never guessed from a role name in JS). Returns
 *  `'loading'` while the session hasn't resolved yet, so callers can render a neutral/disabled
 *  state instead of briefly flashing a control that then has to be hidden — the backend
 *  (api/lib/seo/permissions.php) enforces the real boundary regardless of what this returns. */
export function useSeoCapability(capability: SeoCapability): boolean | 'loading' {
  const { seoCapabilities } = useAuth();
  if (seoCapabilities === null) return 'loading';
  return seoCapabilities.includes(capability);
}

export function useSeoCapabilities(): string[] | 'loading' {
  const { seoCapabilities } = useAuth();
  return seoCapabilities === null ? 'loading' : seoCapabilities;
}
