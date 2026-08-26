/** Renders content already sanitized server-side (see api/lib/sanitize.php) on save.
 *  Only ever fed HTML that came back from our own API. */
export default function RichContent({ html }: { html: string }) {
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
