// Internal-link directory for the footer's SEO link block. Every entry points at a real
// published seo_pages row (see database/seed_rajasthan_36.php, seed_seo_services_by_city_22.php
// and seed_seo_pages_india_16.php) — keep this in sync if pages are renamed or removed.

export type DirectoryLink = { label: string; to: string };
export type DirectoryGroup = { title: string; links: DirectoryLink[] };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const RAJASTHAN_TITLE_TYPES = ['Website Designer', 'Software Developer', 'Web Development Company', 'Software Development'];
const INDIA_TITLE_TYPES = ['Web Development Company', 'Software Development', 'Website Designer', 'Software Developer'];

function cityTypeLinks(cities: string[], titleTypes: string[]): DirectoryLink[] {
  return cities.map((city, i) => {
    const type = titleTypes[i % 4];
    const label = `${type} in ${city}`;
    return { label, to: `/${slugify(label)}` };
  });
}

const RAJASTHAN_CITIES = [
  'Udaipur', 'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Pali',
  'Chittorgarh', 'Banswara', 'Rajsamand', 'Nathdwara', 'Mount Abu', 'Sri Ganganagar', 'Jaisalmer',
  'Bharatpur', 'Dungarpur', 'Nagaur', 'Tonk', 'Jhalawar', 'Barmer', 'Hanumangarh', 'Churu', 'Baran',
  'Bundi', 'Dausa', 'Karauli', 'Pratapgarh', 'Sawai Madhopur', 'Jhunjhunu', 'Jalore', 'Sirohi',
  'Kishangarh', 'Beawar',
];

const SEO_CITIES = [
  'Udaipur', 'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Pali',
  'Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Ahmedabad', 'Surat', 'Indore',
];

const INDIA_CITIES = [
  'Delhi', 'Gurugram', 'Noida', 'Mumbai', 'Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Ahmedabad', 'Surat', 'Indore', 'Bhopal', 'Lucknow', 'Chandigarh', 'Nagpur',
];

export const seoLinkDirectory: DirectoryGroup[] = [
  {
    title: 'Website Design & Software Development Across Rajasthan',
    links: cityTypeLinks(RAJASTHAN_CITIES, RAJASTHAN_TITLE_TYPES),
  },
  {
    title: 'SEO Services by City',
    links: SEO_CITIES.map((city) => ({ label: `SEO Company in ${city}`, to: `/seo-company-in-${slugify(city)}` })),
  },
  {
    title: 'Software Development & Web Design Across India',
    links: cityTypeLinks(INDIA_CITIES, INDIA_TITLE_TYPES),
  },
];
