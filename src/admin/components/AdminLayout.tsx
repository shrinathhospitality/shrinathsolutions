import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Menu, X, LogOut, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { adminNav } from '../navConfig';
import { adminColors } from '../adminTheme';

function ViewLiveSiteLink({ collapsed }: { collapsed?: boolean }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 mx-3 mt-3 rounded-[10px] text-[13.5px] font-semibold transition-colors !text-white/70 hover:!text-white"
      style={{ border: '1px solid rgba(226,234,255,.14)', background: 'rgba(255,255,255,.04)' }}
      title="View Live Site"
    >
      <ExternalLink size={15} />
      {!collapsed && <span>View Live Site</span>}
    </a>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {adminNav.map((group, gi) => (
        <div key={gi} className="mb-5">
          {group.title && !collapsed && (
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: 'rgba(226,234,255,.4)' }}>
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
                  className={({ isActive }) =>
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[14.5px] font-semibold transition-colors ' +
                    (isActive ? 'bg-white/10 !text-white' : '!text-white/60 hover:bg-white/5 hover:!text-white/85')
                  }
                >
                  {item.to === '/admin' && <LayoutDashboard size={16} strokeWidth={2.5} />}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ) : (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-[10px] text-[14.5px] font-medium cursor-not-allowed"
                  style={{ color: 'rgba(226,234,255,.28)' }}
                  title="Coming in a later stage"
                >
                  {!collapsed && <span>{item.label}</span>}
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

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = adminNav.flatMap((g) => g.items).find((i) => i.to === pathname)?.label ?? 'Dashboard';

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
            style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)' }}
          >
            S
          </span>
          {!collapsed && <span className="font-heading font-bold text-[15px] text-white">Shrinath Admin</span>}
        </div>

        <ViewLiveSiteLink collapsed={collapsed} />

        <SidebarContent collapsed={collapsed} />

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold !text-white/50 hover:!text-white/80"
          style={{ borderTop: `1px solid ${adminColors.sidebarBorder}` }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] flex flex-col" style={{ background: adminColors.sidebarBg }}>
            <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: `1px solid ${adminColors.sidebarBorder}` }}>
              <span className="font-heading font-bold text-[15px] text-white">Shrinath Admin</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="!text-white/70">
                <X size={22} />
              </button>
            </div>
            <ViewLiveSiteLink />
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3.5"
          style={{ background: adminColors.cardBg, borderBottom: `1px solid ${adminColors.cardBorder}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMobileOpen(true)} className="md:hidden" style={{ color: adminColors.textMuted }}>
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <div className="text-[12px]" style={{ color: adminColors.textMuted }}>
                <Link to="/admin" style={{ color: adminColors.textMuted }}>Admin</Link> / {pageTitle}
              </div>
              <h1 className="font-heading font-bold text-[19px] truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[14px] font-semibold">{user?.name}</div>
              <div className="text-[12px]" style={{ color: adminColors.textMuted }}>{user?.role}</div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13.5px] font-semibold"
              style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
