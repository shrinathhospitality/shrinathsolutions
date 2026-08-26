import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Orbs from './Orbs';
import MobileBar from './MobileBar';
import ScrollProgress from './ScrollProgress';
import { SiteDataProvider, useSiteData } from '../context/SiteDataContext';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <SiteDataProvider>
      <LayoutBody />
    </SiteDataProvider>
  );
}

function MaintenanceNotice() {
  return (
    <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: '#070a17', color: '#e9efff' }}>
      <div>
        <h1 className="font-heading font-extrabold text-[32px] mb-3">We'll be right back.</h1>
        <p style={{ color: 'rgba(226,234,255,.7)' }}>This site is undergoing scheduled maintenance. Please check back shortly.</p>
      </div>
    </div>
  );
}

function LayoutBody() {
  const { header } = useSiteData();
  if (header?.settings.maintenance_mode === '1') {
    return <MaintenanceNotice />;
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-[200] focus:px-5 focus:py-2.5 focus:rounded-full" style={{ background: '#ff7a2f', color: '#14060a', fontWeight: 700 }}>
        Skip to content
      </a>
      <ScrollProgress />
      <Orbs />
      <div className="relative z-10">
        <Header />
        <main id="main" className="pb-16 md:pb-0">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MobileBar />
    </>
  );
}
