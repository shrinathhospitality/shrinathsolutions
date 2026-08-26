export type Heading = { text: string; id: string };

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Parses <h2> tags out of already-sanitized HTML, stamps each with a unique anchor id, and
 *  returns both the id-annotated HTML and the heading list — used to build an "On this page"
 *  table of contents for long imported content without touching the stored markup.
 *  `startCount` lets callers keep ids unique across multiple HTML blocks on one page. */
export function annotateHeadings(html: string, startCount = 0): { html: string; headings: Heading[]; count: number } {
  const headings: Heading[] = [];
  let count = startCount;

  const annotated = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return `<h2${attrs}>${inner}</h2>`;
    count += 1;
    const id = `${slugify(text)}-${count}`;
    headings.push({ text, id });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  return { html: annotated, headings, count };
}
