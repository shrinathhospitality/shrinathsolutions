import {
  LayoutDashboard, FileText, Wrench, MapPinned, Newspaper, Briefcase, Building2, Star,
  Menu as MenuIcon, PanelBottom, Image, Settings, Search, ListTree, GitCompareArrows,
  Mail, FileSignature, Send, ClipboardList, UserCircle, Lock, Gauge, type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  label: string;
  to?: string; // absent => not built yet in this stage
  icon?: LucideIcon;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const adminNav: AdminNavGroup[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard }] },
  {
    title: 'Content',
    items: [
      { label: 'Pages', to: '/admin/pages', icon: FileText },
      { label: 'Service Pages', to: '/admin/services', icon: Wrench },
      { label: 'SEO Pages', to: '/admin/seo-pages', icon: MapPinned },
      { label: 'Blogs', to: '/admin/blog', icon: Newspaper },
      { label: 'Portfolio', to: '/admin/portfolio', icon: Briefcase },
      { label: 'Ventures', to: '/admin/ventures', icon: Building2 },
      { label: 'Testimonials', to: '/admin/testimonials', icon: Star },
    ],
  },
  {
    title: 'Website',
    items: [
      { label: 'Header & Menus', to: '/admin/menus', icon: MenuIcon },
      { label: 'Footer', to: '/admin/footer', icon: PanelBottom },
      { label: 'Media Library', to: '/admin/media', icon: Image },
      { label: 'Site Settings', to: '/admin/site-settings', icon: Settings },
    ],
  },
  {
    title: 'SEO',
    items: [
      { label: 'Shrinath SEO Studio', to: '/admin/seo-studio', icon: Search },
      { label: 'All Content (SEO Studio)', to: '/admin/seo-studio/content', icon: ListTree },
      { label: 'Global SEO', to: '/admin/site-settings', icon: Settings },
      { label: 'Redirects', to: '/admin/redirects', icon: GitCompareArrows },
      { label: 'SEO Audit Tool Runs', to: '/admin/seo-audits', icon: Gauge },
    ],
  },
  {
    title: 'Leads',
    items: [
      { label: 'Contact Enquiries', to: '/admin/enquiries', icon: Mail },
      { label: 'Proposal Requests', to: '/admin/proposal-requests', icon: FileSignature },
      { label: 'Newsletter Subscribers', to: '/admin/newsletter-subscribers', icon: Send },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: ClipboardList },
      { label: 'Admin Profile', to: '/admin/profile', icon: UserCircle },
      { label: 'Change Password', to: '/admin/change-password', icon: Lock },
    ],
  },
];
