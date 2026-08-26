import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import { AuthProvider } from './admin/context/AuthContext';
import ProtectedRoute from './admin/components/ProtectedRoute';

const AdminLogin = lazy(() => import('./admin/pages/Login'));
const AdminLayout = lazy(() => import('./admin/components/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/pages/Dashboard'));
const AdminChangePassword = lazy(() => import('./admin/pages/ChangePassword'));
const AdminProfile = lazy(() => import('./admin/pages/Profile'));
const AdminSiteSettings = lazy(() => import('./admin/pages/SiteSettings'));
const AdminMenus = lazy(() => import('./admin/pages/Menus'));
const AdminFooter = lazy(() => import('./admin/pages/Footer'));
const AdminPages = lazy(() => import('./admin/pages/Pages'));
const AdminPageEdit = lazy(() => import('./admin/pages/PageEdit'));
const AdminPageRevisions = lazy(() => import('./admin/pages/PageRevisions'));
const AdminServices = lazy(() => import('./admin/pages/Services'));
const AdminServiceEdit = lazy(() => import('./admin/pages/ServiceEdit'));
const AdminSeoPages = lazy(() => import('./admin/pages/SeoPages'));
const AdminSeoPageEdit = lazy(() => import('./admin/pages/SeoPageEdit'));
const AdminBlog = lazy(() => import('./admin/pages/Blog'));
const AdminBlogEdit = lazy(() => import('./admin/pages/BlogEdit'));
const AdminPortfolio = lazy(() => import('./admin/pages/Portfolio'));
const AdminPortfolioEdit = lazy(() => import('./admin/pages/PortfolioEdit'));
const AdminTestimonials = lazy(() => import('./admin/pages/Testimonials'));
const AdminMedia = lazy(() => import('./admin/pages/Media'));
const AdminEnquiries = lazy(() => import('./admin/pages/Enquiries'));
const AdminRedirects = lazy(() => import('./admin/pages/Redirects'));
const AdminAuditLogs = lazy(() => import('./admin/pages/AuditLogs'));
const AdminNewsletterSubscribers = lazy(() => import('./admin/pages/NewsletterSubscribers'));
const AdminProposalRequests = lazy(() => import('./admin/pages/ProposalRequests'));

/** Route-based code splitting: the homepage ships eagerly, everything else on demand. */
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const WebsiteDesigning = lazy(() => import('./pages/WebsiteDesigning'));
const OnlineMarketing = lazy(() => import('./pages/OnlineMarketing'));
const SeoServices = lazy(() => import('./pages/SeoServices'));
const HotelDigitalMarketing = lazy(() => import('./pages/HotelDigitalMarketing'));
const ChannelManager = lazy(() => import('./pages/ChannelManager'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const CaseStudy = lazy(() => import('./pages/CaseStudy'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const DynamicServicePage = lazy(() => import('./pages/DynamicServicePage'));
const DynamicPortfolioPage = lazy(() => import('./pages/DynamicPortfolioPage'));
const DynamicSeoPage = lazy(() => import('./pages/DynamicSeoPage'));
const OurVentures = lazy(() => import('./pages/OurVentures'));
const VentureDetail = lazy(() => import('./pages/VentureDetail'));
const SeoCompanyJaisalmer = lazy(() => import('./pages/SeoCompanyJaisalmer'));
const SeoPageTemplatePreview = lazy(() => import('./pages/SeoPageTemplatePreview'));
const SeoAuditTool = lazy(() => import('./pages/SeoAuditTool'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Fallback = () => <div className="mx-auto max-w-shell px-[22px] py-24 text-center opacity-60">Loading…</div>;
const AdminFallback = () => <div className="min-h-screen grid place-items-center bg-[#0b0f1f] text-white/60">Loading…</div>;

export default function App() {
  return (
    <Routes>
      <Route
        path="admin/*"
        element={
          <AuthProvider>
            <Suspense fallback={<AdminFallback />}>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="change-password" element={<AdminChangePassword />} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="site-settings" element={<AdminSiteSettings />} />
                    <Route path="menus" element={<AdminMenus />} />
                    <Route path="footer" element={<AdminFooter />} />
                    <Route path="pages" element={<AdminPages />} />
                    <Route path="pages/new" element={<AdminPageEdit />} />
                    <Route path="pages/:id/edit" element={<AdminPageEdit />} />
                    <Route path="pages/:id/revisions" element={<AdminPageRevisions />} />
                    <Route path="services" element={<AdminServices />} />
                    <Route path="services/new" element={<AdminServiceEdit />} />
                    <Route path="services/:id/edit" element={<AdminServiceEdit />} />
                    <Route path="seo-pages" element={<AdminSeoPages />} />
                    <Route path="seo-pages/new" element={<AdminSeoPageEdit />} />
                    <Route path="seo-pages/:id/edit" element={<AdminSeoPageEdit />} />
                    <Route path="blog" element={<AdminBlog />} />
                    <Route path="blog/new" element={<AdminBlogEdit />} />
                    <Route path="blog/:id/edit" element={<AdminBlogEdit />} />
                    <Route path="portfolio" element={<AdminPortfolio />} />
                    <Route path="portfolio/new" element={<AdminPortfolioEdit />} />
                    <Route path="portfolio/:id/edit" element={<AdminPortfolioEdit />} />
                    <Route path="testimonials" element={<AdminTestimonials />} />
                    <Route path="media" element={<AdminMedia />} />
                    <Route path="enquiries" element={<AdminEnquiries />} />
                    <Route path="redirects" element={<AdminRedirects />} />
                    <Route path="audit-logs" element={<AdminAuditLogs />} />
                    <Route path="newsletter-subscribers" element={<AdminNewsletterSubscribers />} />
                    <Route path="proposal-requests" element={<AdminProposalRequests />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<Fallback />}>
              <Routes>
                <Route path="about" element={<About />} />
                <Route path="services" element={<Services />} />
                <Route path="website-designing" element={<WebsiteDesigning />} />
                <Route path="online-marketing" element={<OnlineMarketing />} />
                <Route path="seo-services" element={<SeoServices />} />
                <Route path="seo-company-jaisalmer" element={<SeoCompanyJaisalmer />} />
                <Route path="seo-preview/seo-company-jaisalmer" element={<SeoPageTemplatePreview />} />
                <Route path="seo-audit-tool" element={<SeoAuditTool />} />
                <Route path="hotel-digital-marketing" element={<HotelDigitalMarketing />} />
                <Route path="channel-manager-hotel-software" element={<ChannelManager />} />
                <Route path="channel-manager-pricing" element={<Pricing />} />
                <Route path="our-ventures" element={<OurVentures />} />
                <Route path="our-ventures/:slug" element={<VentureDetail />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="case-studies" element={<CaseStudy />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogDetail />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy-policy" element={<Legal kind="privacy" />} />
                <Route path="terms-conditions" element={<Legal kind="terms" />} />
                <Route path="sitemap" element={<SitemapPage />} />
                <Route path="services/:slug" element={<DynamicServicePage />} />
                <Route path="portfolio/:slug" element={<DynamicPortfolioPage />} />
                <Route path=":slug" element={<DynamicSeoPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
