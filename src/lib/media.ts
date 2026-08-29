/** Resolves a stored media path (Media Library relative path, e.g. "uploads/2026/x.webp") or a
 *  full external URL into a src the browser can load. Returns null when there's nothing to show
 *  so callers can render their own placeholder. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (trimmed === '') return null;
  return trimmed.startsWith('http') ? trimmed : `/api/${trimmed.replace(/^\//, '')}`;
}
