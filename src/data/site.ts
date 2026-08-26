export const site = {
  name: 'Shrinath Solutions',
  url: 'https://shrinathsolutions.com',
  phone: '+91 94615 31536',
  phoneHref: 'tel:+919461531536',
  whatsappNumber: '919461531536',
  email: 'shrinathsolutions@gmail.com',
  location: 'Jaisalmer, Rajasthan, India',
  copyright: '© 2026 Shrinath Solutions. All Rights Reserved.',
};

export const wa = (text = 'Hi Shrinath Solutions, I have an enquiry.') =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(text)}`;

export const primaryNav = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services', mega: true },
  { label: 'Hotel Technology', to: '/channel-manager-hotel-software', mega: true },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Pricing', to: '/channel-manager-pricing' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

export const footerColumns = [
  {
    title: 'Website services',
    links: [
      { label: 'Business Website Design', to: '/website-designing' },
      { label: 'Hotel Website Design', to: '/website-designing' },
      { label: 'WordPress Development', to: '/website-designing' },
      { label: 'E-commerce Development', to: '/website-designing' },
      { label: 'Website Redesign', to: '/website-designing' },
    ],
  },
  {
    title: 'Marketing',
    links: [
      { label: 'Digital Marketing', to: '/online-marketing' },
      { label: 'Google Ads', to: '/online-marketing' },
      { label: 'Meta Ads', to: '/online-marketing' },
      { label: 'Social Media Marketing', to: '/online-marketing' },
      { label: 'Lead Generation', to: '/online-marketing' },
    ],
  },
  {
    title: 'SEO',
    links: [
      { label: 'SEO Services', to: '/seo-services' },
      { label: 'Local SEO', to: '/seo-services' },
      { label: 'Hotel SEO', to: '/seo-services' },
      { label: 'Technical SEO', to: '/seo-services' },
      { label: 'SEO Audit', to: '/seo-audit-tool' },
    ],
  },
  {
    title: 'Hotel technology',
    links: [
      { label: 'Channel Manager', to: '/channel-manager-hotel-software' },
      { label: 'Cloud PMS', to: '/channel-manager-hotel-software' },
      { label: 'Booking Engine', to: '/channel-manager-hotel-software' },
      { label: 'Pricing', to: '/channel-manager-pricing' },
      { label: 'Hotel Digital Marketing', to: '/hotel-digital-marketing' },
    ],
  },
];
