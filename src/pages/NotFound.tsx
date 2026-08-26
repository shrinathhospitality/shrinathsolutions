import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../components/Sections';
import { glass } from '../styles/theme';

const popular = [
  { label: 'Hotel software', to: '/channel-manager-hotel-software', body: 'Channel manager and Cloud PMS.' },
  { label: 'SEO services', to: '/seo-services', body: 'Free audit and local search work.' },
  { label: 'Website designing', to: '/website-designing', body: 'Hotel, travel and business websites.' },
  { label: 'Contact', to: '/contact', body: 'Reply the same working day.' },
];

/** No SSR/edge middleware here, so a true server-side 301 isn't possible for this SPA on
 *  static hosting — this checks the admin-managed redirect table and does a full navigation
 *  as the closest practical equivalent before falling back to the real 404 content. */
function useRedirectCheck() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    fetch(`/api/public/redirects/lookup?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data.found && data.destination) {
          window.location.replace(data.destination);
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, []);

  return checked;
}

export default function NotFound() {
  const checked = useRedirectCheck();
  if (!checked) return null;

  return (
    <>
      <title>Page not found — Shrinath Solutions</title>
      <meta name="robots" content="noindex" />

      <section className="mx-auto max-w-shell px-[22px] pt-16">
        <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>Error 404</div>
        <h1 className="font-heading font-extrabold text-[clamp(34px,5vw,60px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
          That page has checked out.
        </h1>
        <p className="text-[18.5px] mt-5 max-w-[640px]" style={{ color: 'var(--color-body)' }}>
          The link is broken or the page has moved. Try one of the routes below, or send us a message and we will point you to it.
        </p>
      </section>

      <Section heading="Popular pages">
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {popular.map((p) => (
            <Link key={p.to} to={p.to} className="p-6 rounded-[22px] !text-heading" style={glass}>
              <div className="font-heading font-bold text-[18.5px] mb-1.5">{p.label}</div>
              <div className="text-[15.6px]" style={{ color: 'var(--color-body)' }}>{p.body}</div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
