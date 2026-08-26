// Editable content for this page. Text only — no layout here.
// `to` points at each link's real content page (seeded 1:1 in `services`, see
// database/seed_service_pages_39.php) except: UI/UX Design and Content Writing have no
// dedicated content yet and fall back to /services; SEO Audit, Hotel Channel Manager and
// Hotel Digital Marketing have their own purpose-built pages instead of a generic /services/:slug one.

export const columns = [
  {
    title: "Website Design & Development", glyph: "◍", tint: "rgba(59,107,255,.2)",
    links: [
      { label: "Business Website Design", to: "/services/business-website-design" },
      { label: "Hotel Website Design", to: "/services/hotel-website-design" },
      { label: "Tour & Travel Website Design", to: "/services/tour-travel-website-design" },
      { label: "WordPress Development", to: "/services/wordpress-development" },
      { label: "React Website Development", to: "/services/react-website-development" },
      { label: "E-commerce Development", to: "/services/ecommerce-development" },
      { label: "Landing Page Design", to: "/services/landing-page-design" },
      { label: "Website Redesign", to: "/services/website-redesign" },
      { label: "Website Maintenance", to: "/services/website-maintenance" },
      { label: "UI/UX Design", to: "/services" },
    ],
  },
  {
    title: "Digital Marketing", glyph: "◎", tint: "rgba(123,92,255,.22)",
    links: [
      { label: "Digital Marketing Services", to: "/services/digital-marketing-services" },
      { label: "Social Media Marketing", to: "/services/social-media-marketing" },
      { label: "Google Ads Management", to: "/services/google-ads-management" },
      { label: "Meta Ads Management", to: "/services/meta-ads-management" },
      { label: "Content Marketing", to: "/services/content-marketing" },
      { label: "Email Marketing", to: "/services/email-marketing" },
      { label: "Online Reputation Management", to: "/services/online-reputation-management" },
      { label: "Google Business Profile", to: "/services/google-business-profile-management" },
      { label: "Lead Generation", to: "/services/lead-generation" },
      { label: "Conversion Rate Optimisation", to: "/services/conversion-rate-optimisation" },
    ],
  },
  {
    title: "SEO Services", glyph: "◈", tint: "rgba(34,211,238,.2)",
    links: [
      { label: "Search Engine Optimisation", to: "/services/search-engine-optimisation" },
      { label: "Local SEO", to: "/services/local-seo" },
      { label: "Hotel SEO", to: "/services/hotel-seo" },
      { label: "Travel Website SEO", to: "/services/travel-website-seo" },
      { label: "Technical SEO", to: "/services/technical-seo" },
      { label: "On-Page SEO", to: "/services/on-page-seo" },
      { label: "Off-Page SEO", to: "/services/off-page-seo" },
      { label: "E-commerce SEO", to: "/services/ecommerce-seo" },
      { label: "Google Business Profile SEO", to: "/services/google-business-profile-seo" },
      { label: "SEO Audit", to: "/seo-audit-tool" },
      { label: "Content Writing", to: "/services" },
    ],
  },
  {
    title: "Hotel Technology", glyph: "◆", tint: "rgba(255,122,47,.22)",
    links: [
      { label: "Hotel Channel Manager", to: "/channel-manager-hotel-software" },
      { label: "Cloud PMS", to: "/services/cloud-pms" },
      { label: "Hotel Booking Engine", to: "/services/hotel-booking-engine" },
      { label: "Hotel Website", to: "/services/hotel-website" },
      { label: "OTA Listing", to: "/services/ota-listing" },
      { label: "OTA Management", to: "/services/ota-management" },
      { label: "Revenue Management", to: "/services/hotel-revenue-management" },
      { label: "Google Hotel Ads", to: "/services/google-hotel-ads" },
      { label: "Payment Gateway Integration", to: "/services/payment-gateway-integration" },
      { label: "Hotel Digital Marketing", to: "/hotel-digital-marketing" },
    ],
  },
];
