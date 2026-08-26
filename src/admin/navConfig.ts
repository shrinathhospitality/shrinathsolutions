export type AdminNavItem = {
  label: string;
  to?: string; // absent => not built yet in this stage
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const adminNav: AdminNavGroup[] = [
  { title: '', items: [{ label: 'Dashboard', to: '/admin' }] },
  {
    title: 'Content',
    items: [
      { label: 'Pages', to: '/admin/pages' },
      { label: 'Service Pages', to: '/admin/services' },
      { label: 'SEO Pages', to: '/admin/seo-pages' },
      { label: 'Blogs', to: '/admin/blog' },
      { label: 'Portfolio', to: '/admin/portfolio' },
      { label: 'Testimonials', to: '/admin/testimonials' },
    ],
  },
  {
    title: 'Website',
    items: [
      { label: 'Header & Menus', to: '/admin/menus' },
      { label: 'Footer', to: '/admin/footer' },
      { label: 'Media Library', to: '/admin/media' },
      { label: 'Site Settings', to: '/admin/site-settings' },
    ],
  },
  {
    title: 'SEO',
    items: [
      { label: 'Global SEO', to: '/admin/site-settings' },
      { label: 'Redirects', to: '/admin/redirects' },
    ],
  },
  {
    title: 'Leads',
    items: [
      { label: 'Contact Enquiries', to: '/admin/enquiries' },
      { label: 'Proposal Requests', to: '/admin/proposal-requests' },
      { label: 'Newsletter Subscribers', to: '/admin/newsletter-subscribers' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', to: '/admin/audit-logs' },
      { label: 'Admin Profile', to: '/admin/profile' },
      { label: 'Change Password', to: '/admin/change-password' },
    ],
  },
];
