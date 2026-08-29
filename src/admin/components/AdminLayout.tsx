import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ChevronLeft, ChevronRight, ExternalLink, Search, Bell, ChevronDown, UserCircle, Lock } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { adminNav, type AdminNavItem } from '../navConfig';
import { adminColors } from '../adminTheme';
import { adminFetch } from '../lib/api';

function ViewLiveSiteLink({ collapsed }: { collapsed?: boolean }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 mx-3 mt-3 rounded-[10px] text-[13.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2"
      style={{ border: `1px solid ${adminColors.cardBorder}`, background: adminColors.contentBg, color: adminColors.textMuted }}
      title="View Live Site"
    >
      <ExternalLink size={15} aria-hidden="true" />
      {!collapsed && <span>View Live Site</span>}
    </a>
  );
}

function NavIcon({ item }: { item: AdminNavItem }) {
  const Icon = item.icon;
  return Icon ? <Icon size={17} strokeWidth={2} aria-hidden="true" className="shrink-0" /> : null;
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
      {adminNav.map((group, gi) => (
        <div key={gi} className="mb-5">
          {group.title && !collapsed && (
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: adminColors.textMutedLight }}>
              {group.title}
            </div>
          )}
          <div className="grid gap-0.5">
            {group.items.map((item) =>
              item.to ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[14.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ' +
                    (isActive ? '' : 'hover:opacity-90')
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: adminColors.primary, color: adminColors.sidebarTextActive }
                      : { color: adminColors.sidebarText, background: 'transparent' }
                  }
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = adminColors.primarySoft;
                  }}
                  onMouseLeave={(e) => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <NavIcon item={item} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ) : (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-[10px] text-[14.5px] font-medium cursor-not-allowed"
                  style={{ color: adminColors.textMutedLight }}
                  title="Coming in a later stage"
                >
                  <span className="flex items-center gap-2.5">
                    <NavIcon item={item} />
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                  {!collapsed && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

const flatNav = adminNav.flatMap((g) => g.items.filter((i): i is AdminNavItem & { to: string } => !!i.to));

function AdminSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flatNav.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(to: string) {
    navigate(to);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative flex-1 max-w-[360px] min-w-0">
      <Search size={15} style={{ position: 'absolute', left: 12, top: 10.5, color: adminColors.textMutedLight }} aria-hidden="true" />
      <label htmlFor="admin-search" className="sr-only">Search admin sections</label>
      <input
        id="admin-search"
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) go(results[0].to);
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Search admin sections…"
        className="w-full text-[13.5px] py-2 pl-9 pr-3 rounded-[10px] focus-visible:outline focus-visible:outline-2"
        style={{ border: `1px solid ${adminColors.cardBorder}`, background: adminColors.contentBg, color: adminColors.textPrimary }}
      />
      {open && results.length > 0 && (
        <div role="listbox" className="absolute left-0 right-0 mt-1.5 rounded-[12px] overflow-hidden z-40" style={{ background: adminColors.cardBg, border: `1px solid ${adminColors.cardBorder}`, boxShadow: '0 12px 28px rgba(18,24,22,.12)' }}>
          {results.map((r) => (
            <button
              key={r.to}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => go(r.to)}
              className="w-full text-left px-3.5 py-2.5 text-[13.5px] flex items-center gap-2.5 hover:opacity-90"
              style={{ color: adminColors.textPrimary }}
            >
              <NavIcon item={r} />
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full focus-visible:outline focus-visible:outline-2"
      >
        <span className="grid place-items-center rounded-full font-bold text-[13px]" style={{ width: 32, height: 32, background: adminColors.primarySoft, color: adminColors.primary }} aria-hidden="true">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
        </span>
        <span className="text-left hidden sm:block">
          <span className="block text-[13.5px] font-semibold leading-tight">{user?.name}</span>
          <span className="block text-[11.5px] leading-tight" style={{ color: adminColors.textMuted }}>{user?.role}</span>
        </span>
        <ChevronDown size={14} style={{ color: adminColors.textMuted }} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-[190px] rounded-[12px] overflow-hidden z-40" style={{ background: adminColors.cardBg, border: `1px solid ${adminColors.cardBorder}`, boxShadow: '0 12px 28px rgba(18,24,22,.12)' }}>
          <Link role="menuitem" to="/admin/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium hover:opacity-90" style={{ color: adminColors.textPrimary }}>
            <UserCircle size={16} aria-hidden="true" /> Admin Profile
          </Link>
          <Link role="menuitem" to="/admin/change-password" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium hover:opacity-90" style={{ color: adminColors.textPrimary, borderTop: `1px solid ${adminColors.cardBorder}` }}>
            <Lock size={16} aria-hidden="true" /> Change Password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium hover:opacity-90"
            style={{ color: adminColors.danger, borderTop: `1px solid ${adminColors.cardBorder}` }}
          >
            <LogOut size={16} aria-hidden="true" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);

  const pageTitle = flatNav.find((i) => i.to === pathname)?.label ?? 'Dashboard';

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  // Real, actionable pending-item count for the header bell — same figures the dashboard's
  // "Needs attention" section surfaces, not a decorative badge.
  useEffect(() => {
    adminFetch<{ summary: { leads: { new_enquiries: number; new_proposals: number }; seo: { poor: number } } }>('/api/admin/dashboard/summary')
      .then((d) => setNotifCount(d.summary.leads.new_enquiries + d.summary.leads.new_proposals + d.summary.seo.poor))
      .catch(() => setNotifCount(null));
  }, []);

  return (
    <div className="min-h-screen flex" style={{ background: adminColors.contentBg, color: adminColors.textPrimary }}>
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Manrope, sans-serif', fontSize: 14.5 } }} />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 transition-all"
        style={{ width: collapsed ? 76 : 260, background: adminColors.sidebarBg, borderRight: `1px solid ${adminColors.sidebarBorder}` }}
      >
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: `1px solid ${adminColors.sidebarBorder}` }}>
          <span
            className="grid place-items-center font-heading font-extrabold text-[17px] shrink-0"
            style={{ width: 36, height: 36, borderRadius: 12, background: adminColors.primary, color: '#fff' }}
            aria-hidden="true"
          >
            S
          </span>
          {!collapsed && <span className="font-heading font-bold text-[15px]" style={{ color: adminColors.textPrimary }}>Shrinath Admin</span>}
        </div>

        <ViewLiveSiteLink collapsed={collapsed} />

        <SidebarContent collapsed={collapsed} />

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ borderTop: `1px solid ${adminColors.sidebarBorder}`, color: adminColors.textMuted }}
        >
          {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><ChevronLeft size={16} aria-hidden="true" /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="w-[280px] flex flex-col" style={{ background: adminColors.sidebarBg }}>
            <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: `1px solid ${adminColors.sidebarBorder}` }}>
              <span className="font-heading font-bold text-[15px]" style={{ color: adminColors.textPrimary }}>Shrinath Admin</span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" style={{ color: adminColors.textMuted }}>
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <ViewLiveSiteLink />
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1" style={{ background: 'rgba(18,24,22,.5)' }} onClick={() => setMobileOpen(false)} aria-hidden="true" />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3"
          style={{ background: adminColors.cardBg, borderBottom: `1px solid ${adminColors.cardBorder}` }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="md:hidden shrink-0" style={{ color: adminColors.textMuted }}>
              <Menu size={22} aria-hidden="true" />
            </button>
            <AdminSearch />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden lg:flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
              <ExternalLink size={14} aria-hidden="true" /> View Live Site
            </a>
            <Link to="/admin/enquiries" className="relative" aria-label={notifCount ? `${notifCount} item(s) need attention` : 'Notifications'} title="Items needing attention">
              <Bell size={19} style={{ color: adminColors.textMuted }} aria-hidden="true" />
              {!!notifCount && (
                <span
                  className="absolute -top-1.5 -right-1.5 grid place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ minWidth: 16, height: 16, padding: '0 3px', background: adminColors.danger }}
                >
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <ProfileMenu />
          </div>
        </header>

        <div className="px-5 md:px-7 pt-4">
          <div className="text-[12px]" style={{ color: adminColors.textMuted }}>
            <Link to="/admin" style={{ color: adminColors.textMuted }}>Admin</Link> / {pageTitle}
          </div>
          <h1 className="font-heading font-bold text-[22px] md:text-[26px] mt-0.5" style={{ color: adminColors.textPrimary }}>{pageTitle}</h1>
        </div>

        <main className="flex-1 p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
