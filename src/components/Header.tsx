import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Minus, Plus, ArrowRight, Gauge } from 'lucide-react';
import { primaryNav as staticPrimaryNav, site, wa } from '../data/site';
import { columns as staticColumns } from '../data/megaMenu';
import { emberBtn } from '../styles/theme';
import { useSiteData } from '../context/SiteDataContext';

const COLUMN_TINTS = ['rgba(59,107,255,.12)', 'rgba(123,92,255,.14)', 'rgba(34,211,238,.14)', 'rgba(255,122,47,.14)'];
const COLUMN_ICON_COLORS = ['#3b6bff', '#7b5cff', '#0891b2', '#ff7a2f'];

// Fixed per-category colors, keyed by title rather than list position — so a nav item that
// shows only one category (e.g. "Hotel Technology") keeps that category's own color instead
// of picking up whatever index-0 happens to be.
const CATEGORY_STYLE: Record<string, { tint: string; icon: string }> = {
  'Website Design & Development': { tint: COLUMN_TINTS[0], icon: COLUMN_ICON_COLORS[0] },
  'Digital Marketing': { tint: COLUMN_TINTS[1], icon: COLUMN_ICON_COLORS[1] },
  'SEO Services': { tint: COLUMN_TINTS[2], icon: COLUMN_ICON_COLORS[2] },
  'Hotel Technology': { tint: COLUMN_TINTS[3], icon: COLUMN_ICON_COLORS[3] },
};

type NavEntry = { label: string; to: string; mega: boolean; columns: ColumnEntry[] };
type ColumnEntry = { title: string; glyph: string; tint: string; links: { label: string; to: string }[] };

/** Scopes a set of mega columns to the nav item that's about to show them — "Hotel Technology"
 * gets only its own column; everything else mega-flagged (i.e. "Services") gets the rest, minus
 * Hotel Technology, since that already has its own dedicated nav item and dropdown.
 *
 * Applied to both the static fallback and the CMS-sourced columns: the CMS's "Services" and
 * "Hotel Technology" primary-menu items currently share one `services_mega` record (all 4
 * categories), so without this filter both dropdowns would show all 4 once that data loads —
 * this keeps the display correct regardless of what the backend returns; the shared
 * `mega_menu_slug` is a separate admin/CMS data issue worth splitting properly later. */
function scopeColumnsToNav(label: string, columns: ColumnEntry[]): ColumnEntry[] {
  if (label === 'Hotel Technology') {
    const only = columns.filter((c) => c.title === 'Hotel Technology');
    return only.length > 0 ? only : columns;
  }
  return columns.filter((c) => c.title !== 'Hotel Technology');
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [openNav, setOpenNav] = useState<string | null>(null);
  const { header } = useSiteData();

  const nav: NavEntry[] = useMemo(() => {
    const base: NavEntry[] = !header
      ? staticPrimaryNav.map((n) => ({
          label: n.label,
          to: n.to,
          mega: !!n.mega,
          columns: n.mega ? scopeColumnsToNav(n.label, staticColumns) : [],
        }))
      : header.primary_menu
          .filter((i) => i.show_desktop || i.show_mobile)
          .map((i) => {
            const megaSource = i.mega_menu_slug ? (i.mega ?? []) : [];
            const rawColumns: ColumnEntry[] = megaSource.length > 0
              ? megaSource.map((col, idx) => ({
                  title: col.label,
                  glyph: col.icon ?? '◍',
                  tint: COLUMN_TINTS[idx % COLUMN_TINTS.length],
                  links: col.children.map((c) => ({ label: c.label, to: c.internal_path ?? '/services' })),
                }))
              : (i.mega_menu_slug ? staticColumns : []);
            const columns = i.mega_menu_slug ? scopeColumnsToNav(i.label, rawColumns) : [];
            return {
              label: i.label,
              to: i.url_type === 'external' ? (i.external_url ?? '#') : (i.internal_path ?? '/'),
              mega: !!i.mega_menu_slug,
              columns,
            };
          });

    // Not part of the CMS-driven menu (no backend content model for it), so it's always
    // appended here — inserted just before Contact when present, or at the end otherwise.
    const venturesEntry: NavEntry = { label: 'Our Ventures', to: '/our-ventures', mega: false, columns: [] };
    const contactIdx = base.findIndex((n) => n.to === '/contact');
    if (contactIdx === -1) base.push(venturesEntry);
    else base.splice(contactIdx, 0, venturesEntry);
    return base;
  }, [header]);

  const activeNav = nav.find((n) => n.label === activeMega) ?? null;
  // Explicit pixel width, not shrink-to-fit: a `w-fit` card's intrinsic size is computed from
  // the widest unwrapped row among ALL its children, including the bottom note/link bar — so a
  // single-column dropdown was still sizing itself off that bar's max-content instead of the
  // 280px-capped column grid above it. A definite width makes the bottom bar wrap inside it
  // instead of dictating it.
  const megaCardWidth = activeNav ? activeNav.columns.length * 280 + (activeNav.columns.length - 1) * 32 + 56 : 0;

  const topbarMessage = header?.settings.header_topbar_message ?? 'Grow your hotel or business with result-driven digital solutions.';
  const topbarCtaText = header?.settings.header_topbar_cta_text ?? 'Get Free Consultation';
  const ctaText = header?.settings.header_cta_text ?? 'Get Free Proposal';
  const ctaUrl = header?.settings.header_cta_url ?? '/contact';
  const phone = header?.settings.phone ?? site.phone;
  const siteName = header?.settings.site_name ?? site.name;
  const logoUrl = header?.settings.logo_url;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="relative hidden sm:block" style={{ background: 'linear-gradient(90deg, rgba(15,23,45,.96), rgba(20,26,54,.96) 50%, rgba(15,23,45,.96))', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div className="mx-auto max-w-shell px-[22px] py-[7px] flex flex-wrap items-center justify-between gap-3 text-[13.5px] font-medium">
          <span style={{ color: 'rgba(226,234,255,.7)' }}>{topbarMessage}</span>
          <span className="flex items-center gap-5">
            <Link to="/seo-audit-tool" className="inline-flex items-center gap-1.5 font-semibold !text-[#7dd3fc]">
              <Gauge size={14} aria-hidden="true" /> Check Your SEO Score
            </Link>
            <a href={wa()} target="_blank" rel="noopener noreferrer" className="!text-[#8fd6ff] font-semibold">WhatsApp {phone}</a>
            <Link to={ctaUrl} className="font-semibold" style={{ color: '#ffb182' }}>{topbarCtaText}</Link>
          </span>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, #22d3ee, #7b5cff, #ff8a45, transparent)',
            backgroundSize: '200% 100%',
            animation: 'topbarSheen 8s linear infinite',
          }}
        />
      </div>

      <header
        className="sticky top-0 z-50 transition-all"
        style={{
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          background: scrolled ? 'rgba(6,10,23,.9)' : 'rgba(9,14,32,.62)',
          borderBottom: '1px solid rgba(255,255,255,.09)',
          boxShadow: scrolled ? '0 12px 34px rgba(2,6,23,.5)' : 'none',
        }}
        onMouseLeave={() => setActiveMega(null)}
      >
        <div className="mx-auto max-w-shell px-[22px] py-3 flex items-center gap-7">
          <Link to="/" className="flex items-center gap-3 !text-white">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="shrink-0 object-contain" style={{ height: 40, maxWidth: 160 }} />
            ) : (
              <span
                className="grid place-items-center font-heading font-extrabold text-[19px]"
                style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5)' }}
              >
                S
              </span>
            )}
            <span className="flex flex-col leading-tight">
              <span className="font-heading font-bold text-[17.5px]">{siteName}</span>
              <span className="text-[11px] uppercase tracking-[.14em]" style={{ color: 'rgba(233,239,255,.5)' }}>
                Jaisalmer, Rajasthan
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden xl:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to + n.label}
                to={n.to}
                end={n.to === '/'}
                onMouseEnter={() => setActiveMega(n.mega ? n.label : null)}
                className={({ isActive }) =>
                  'px-3.5 py-2.5 rounded-full font-semibold text-[15px] transition-colors ' +
                  (isActive ? '!text-white' : '!text-paper hover:bg-white/8')
                }
                style={({ isActive }) => (isActive ? { background: 'rgba(59,107,255,.28)', boxShadow: 'inset 0 0 0 1px rgba(125,211,252,.35)' } : undefined)}
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to={ctaUrl}
              className="ml-2 px-5 py-3 rounded-full font-heading font-bold text-[15px] transition-shadow hover:brightness-105"
              style={{ ...emberBtn, boxShadow: '0 0 0 1px rgba(255,154,83,.3), 0 10px 26px rgba(255,122,47,.4)' }}
            >
              {ctaText}
            </Link>
          </nav>

          <button
            type="button"
            aria-label={mobile ? 'Close menu' : 'Open menu'}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
            className="ml-auto xl:hidden grid place-items-center"
            style={{ width: 44, height: 44, borderRadius: 13, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.07)', color: '#fff' }}
          >
            {mobile ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
        </div>

        {activeNav && (
          <div className="hidden xl:block absolute inset-x-0 top-full z-40">
            <div className="mx-auto max-w-shell px-[22px] pt-3 flex justify-center">
              <div
                className="max-w-full overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-2xl"
                style={{ width: megaCardWidth }}
              >
                <div className="grid gap-x-8 gap-y-6 p-7" style={{ gridTemplateColumns: `repeat(${activeNav.columns.length}, minmax(240px, 280px))` }}>
                  {activeNav.columns.map((col, i) => {
                    const style = CATEGORY_STYLE[col.title] ?? { tint: COLUMN_TINTS[i % COLUMN_TINTS.length], icon: COLUMN_ICON_COLORS[i % COLUMN_ICON_COLORS.length] };
                    return (
                      <div key={col.title}>
                        <div className="flex items-center gap-2.5 pb-3 mb-2.5 border-b" style={{ borderColor: 'rgba(20,28,55,.08)' }}>
                          <span
                            className="grid place-items-center text-[16px] shrink-0"
                            style={{ width: 34, height: 34, borderRadius: 10, background: style.tint, color: style.icon }}
                          >
                            {col.glyph}
                          </span>
                          <span className="font-heading font-bold text-[13px] uppercase tracking-[.08em]" style={{ color: '#1a2340' }}>
                            {col.title}
                          </span>
                        </div>
                        <div className="grid gap-0.5">
                          {col.links.map((l) => (
                            <Link
                              key={l.label}
                              to={l.to}
                              className="px-2.5 py-1.5 rounded-[10px] text-[14.5px] font-medium !text-[#3d4560] transition-colors hover:!text-[#1a2340]"
                              style={{ background: 'transparent' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f5fb')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-7 py-4" style={{ borderTop: '1px solid rgba(20,28,55,.08)', background: '#f8f9fc' }}>
                  <span className="text-[13.5px] max-w-[220px]" style={{ color: '#6b7290' }}>
                    Every service is scoped to your business, not sold off the shelf.
                  </span>
                  <Link to={activeNav.to} className="flex items-center gap-1.5 text-[13.5px] font-bold shrink-0" style={{ color: '#3b6bff' }}>
                    All {activeNav.label.toLowerCase()} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {mobile && (
          <div className="xl:hidden px-[18px] pb-6 pt-3.5 max-h-[74vh] overflow-y-auto" style={{ borderTop: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,12,28,.96)' }}>
            {nav.map((n) =>
              n.mega ? (
                <div key={n.label} style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenNav(openNav === n.label ? null : n.label)}
                    aria-expanded={openNav === n.label}
                    className="w-full flex items-center justify-between gap-3 py-3 text-left font-heading font-bold text-[16px] text-white"
                  >
                    {n.label}
                    {openNav === n.label ? <Minus size={18} color="#ff9a53" strokeWidth={2.75} /> : <Plus size={18} color="#ff9a53" strokeWidth={2.75} />}
                  </button>
                  {openNav === n.label && (
                    <div className="grid gap-4 pb-3.5">
                      {n.columns.map((col) => (
                        <div key={col.title}>
                          {n.columns.length > 1 && (
                            <div className="text-[12px] font-bold uppercase tracking-[.08em] mb-1.5" style={{ color: 'rgba(233,239,255,.5)' }}>
                              {col.title}
                            </div>
                          )}
                          <div className="grid gap-0.5">
                            {col.links.map((l) => (
                              <Link key={l.label} to={l.to} onClick={() => setMobile(false)} className="px-2.5 py-2 rounded-[10px] text-[15.5px] !text-[#cfd9f6]">
                                {l.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={n.label} to={n.to} onClick={() => setMobile(false)} className="block py-3 font-heading font-bold text-[16px] !text-white" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                  {n.label}
                </Link>
              )
            )}
            <Link to={ctaUrl} onClick={() => setMobile(false)} className="block text-center mt-5 py-3.5 rounded-full font-bold" style={emberBtn}>
              {ctaText}
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
