// Editable content for the homepage. Text only — no layout here.
// Portfolio, blog and testimonial content is loaded live from the database — see Home.tsx.

export const heroTrustPoints = ['Based in Jaisalmer', 'Hospitality-first expertise', 'SEO-ready development'];

export const growthSystemSteps = ['Website', 'Google Search', 'Qualified Enquiry', 'Direct Booking or Sale'];

export const specialisations = ['Hotels & Resorts', 'Desert Camps', 'Tour Operators', 'Taxi Companies', 'Restaurants', 'Local Businesses'];

export const primaryServices = [
  { title: 'Website Design & Development', glyph: '◍', tint: 'rgba(59,107,255,.22)', body: 'Conversion-focused websites for hotels, camps, travel companies and local businesses.', tags: ['Custom design', 'Mobile-first', 'SEO-ready'], to: '/website-designing', linkText: 'Build a better website' },
  { title: 'Digital Marketing', glyph: '◎', tint: 'rgba(123,92,255,.22)', body: 'Paid and organic campaigns built around enquiries you can count, not impressions.', tags: ['Social media', 'Paid ads', 'Content'], to: '/online-marketing', linkText: 'Grow your visibility' },
  { title: 'SEO & Local Search', glyph: '◈', tint: 'rgba(34,211,238,.2)', body: 'Technical, on-page and local SEO so the right searches in your region find you first.', tags: ['Local SEO', 'Technical SEO', 'On-page'], to: '/seo-services', linkText: 'Improve direct enquiries' },
  { title: 'Hotel Technology', glyph: '⇄', tint: 'rgba(255,122,47,.22)', body: 'Channel manager, cloud PMS and booking engine working as one connected system.', tags: ['Channel manager', 'Cloud PMS', 'Booking engine'], to: '/channel-manager-hotel-software', linkText: 'Explore hotel technology' },
];

export const secondaryServices = [
  { title: 'Google Ads', glyph: '◉', tint: 'rgba(255,122,47,.2)', body: 'Search and Performance Max campaigns managed to a clear cost-per-enquiry target.', to: '/services/google-ads-management', linkText: 'Manage paid campaigns' },
  { title: 'OTA Management', glyph: '◎', tint: 'rgba(34,211,238,.18)', body: 'Listings kept complete, priced sensibly and reviewed against your direct rates.', to: '/services/ota-management', linkText: 'Optimise OTA performance' },
  { title: 'Channel Manager', glyph: '⇄', tint: 'rgba(59,107,255,.2)', body: 'One inventory across every OTA, with live rate and availability sync.', to: '/services/hotel-channel-manager', linkText: 'Prevent overbooking' },
  { title: 'Cloud PMS', glyph: '▤', tint: 'rgba(123,92,255,.2)', body: 'Front desk, housekeeping and reporting from any device on the property.', to: '/services/cloud-pms', linkText: 'Run the front desk smarter' },
];

export const whyPoints = [
  { title: 'Hospitality industry expertise', body: 'Hotels, camps and tour operators are our core work, not a side category.', glyph: '◍' },
  { title: 'Conversion-focused design', body: 'Every layout is planned around the enquiry, call or booking it needs to produce.', glyph: '◈' },
  { title: 'SEO-ready development', body: 'Clean structure, fast loading and correct markup from the first build, not bolted on later.', glyph: '◎' },
  { title: 'Mobile-first experience', body: 'Most Jaisalmer travel searches happen on a phone. That is where we design first.', glyph: '▤' },
  { title: 'Transparent communication', body: 'Plain reporting on what changed, what it cost and what it returned.', glyph: '▣' },
  { title: 'Long-term support', body: 'Maintenance, updates and seasonal campaign changes after launch.', glyph: '◆' },
];

export const process = [
  { num: '01', title: 'Discovery', body: 'Your property, your season, your competition and where enquiries are lost today.' },
  { num: '02', title: 'Strategy', body: 'Channels, budget split and the pages that need to exist to win those searches.' },
  { num: '03', title: 'Design', body: 'Layouts and copy planned around the booking or enquiry action.' },
  { num: '04', title: 'Development', body: 'Fast, accessible build with clean markup and correct tracking in place.' },
  { num: '05', title: 'Launch', body: 'Migration, indexing, analytics and integration checks before go-live.' },
  { num: '06', title: 'Growth', body: 'Monthly SEO and campaign work with reporting you can act on.' },
];

export const industries = [
  { name: 'Hotels & Resorts', glyph: '◍' },
  { name: 'Desert Camps', glyph: '◈' },
  { name: 'Tour Operators', glyph: '◎' },
  { name: 'Taxi Companies', glyph: '⇄' },
  { name: 'Restaurants', glyph: '▤' },
  { name: 'Local Businesses', glyph: '▣' },
  { name: 'E-commerce', glyph: '◆' },
  { name: 'Professional Services', glyph: '◉' },
];

export const auditPoints = [
  'Where your site loses visitors before the enquiry',
  'Technical issues blocking Google from ranking pages',
  'Local search visibility against nearby competitors',
  'How much traffic you are handing to OTAs',
  'A prioritised fix list, quickest win first',
];

export const formFields = [
  { label: 'Name', name: 'name', type: 'text', placeholder: 'Your name', required: true },
  { label: 'Phone or WhatsApp', name: 'phone', type: 'tel', placeholder: '+91', required: true },
  { label: 'Website URL', name: 'website_url', type: 'url', placeholder: 'https:// (optional)', required: false },
];

export const serviceOptions = ['Website Design', 'Digital Marketing', 'SEO', 'Hotel Digital Marketing', 'Channel Manager / PMS', 'Google Ads', 'Not sure yet'];

export const ecosystem = [
  { name: 'Hotel Website', glyph: '◍', body: "A fast, mobile-first site that answers the guest's questions and sends them straight to your own booking flow.", feeds: ['Booking Engine', 'Google Hotel Ads', 'Digital Marketing'] },
  { name: 'Booking Engine', glyph: '◈', body: 'Commission-free reservations taken on your own domain, with live rates pulled from your inventory.', feeds: ['Channel Manager', 'Payment Gateway', 'Cloud PMS'] },
  { name: 'Channel Manager', glyph: '⇄', body: 'One inventory pushed to every OTA. Rates and availability update together, so overbooking stops being a daily risk.', feeds: ['OTA Platforms', 'Cloud PMS', 'Booking Engine'] },
  { name: 'Cloud PMS', glyph: '▤', body: 'Front desk, housekeeping and reporting in one place, reachable from any device on the property.', feeds: ['Channel Manager', 'Payment Gateway'] },
  { name: 'OTA Platforms', glyph: '◎', body: 'Listings kept complete and competitive, so OTA visibility works as discovery rather than your only channel.', feeds: ['Channel Manager', 'Revenue Management'] },
  { name: 'Google Hotel Ads', glyph: '◉', body: 'Your own rates shown beside the OTAs at the moment of comparison, pointing at your booking engine.', feeds: ['Booking Engine', 'Hotel Website'] },
  { name: 'Payment Gateway', glyph: '▣', body: 'Secure online prepayment and deposits, integrated where your guests already are.', feeds: ['Booking Engine', 'Cloud PMS'] },
  { name: 'Digital Marketing', glyph: '◆', body: 'SEO, social and paid campaigns aimed at the guests who book direct, not just at traffic numbers.', feeds: ['Hotel Website', 'Google Hotel Ads'] },
];
