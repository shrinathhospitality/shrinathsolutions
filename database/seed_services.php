<?php
// CLI-only. Idempotent: migrates the 5 existing hand-built service pages (WebsiteDesigning,
// OnlineMarketing, SeoServices, HotelDigitalMarketing, ChannelManager) into the `services`
// table, transcribed from their current src/data/*.ts + src/pages/*.tsx content. No content
// invented — this is a faithful copy of what's already live.
//
// Pricing.tsx is intentionally excluded: it's a bespoke pricing table, not a ServicePage
// instance, and doesn't fit this content model.
//
// Two known, deliberate gaps (bespoke interactive React, not content, so not DB-representable):
//   - the demo "ModelCard"/"ReportCard"/"ChannelMix" hero-aside widgets
//   - the interactive "Ecosystem" node-map block on the Channel Manager page
//
// Safe to re-run: skips any service whose slug already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/Service.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

function faqs_from_tuples(array $tuples): array
{
    return array_map(fn($t) => ['question' => $t[0], 'answer' => $t[1]], $tuples);
}

$services = [];

// --- Website Designing ---
$services[] = [
    'name' => 'Website Designing and Development',
    'slug' => 'website-designing',
    'category' => 'Services',
    'hero_label' => 'Website designing & development',
    'h1' => 'Website designing company in Jaisalmer, building sites that earn enquiries.',
    'hero_description' => 'Shrinath Solutions designs and develops websites for hotels, desert camps, tour operators, taxi services, restaurants and local businesses across Rajasthan. Every build is mobile-first, fast, structured for search and pointed at one measurable outcome: more enquiries, calls and direct bookings.',
    'hero_cta_label' => 'Get a website quote',
    'hero_notes' => ['Mobile-first builds', 'SEO-ready structure', 'Support after launch'],
    'blocks' => [
        ['kind' => 'paras', 'heading' => 'Why a website designing company in Jaisalmer should understand hospitality', 'items' => [
            "Most websites in the hospitality and travel sector fail for the same three reasons. They load too slowly on a phone in patchy network coverage, they hide the price, and they make the visitor work to make contact. None of those are design problems in the decorative sense. They are decisions about structure, weight and priority — and they decide whether a guest comparing four desert camps at midnight ends up on your enquiry form or an OTA listing.",
            "Shrinath Solutions works from Jaisalmer, so we see this from the inside. We know the season shapes everything: what a Rajasthan property needs in October is not what it needs in June, and a website that cannot be updated quickly for a seasonal package is a liability. We know most of your traffic arrives on a mid-range Android phone over mobile data. We know that a guest who cannot see a rate within two screens will leave to find one.",
            "So we design in the order the visitor reads. What is this property, what does it cost, can I trust it, how do I book. Every layout decision is measured against that sequence rather than against a moodboard. The visual work matters — a heritage hotel and a taxi service should not look alike — but it sits on top of a structure that has already been argued through.",
            "The same approach applies outside hospitality. A taxi company needs route pages that match how people search for airport transfers. A restaurant needs the menu, the location and the reservation in the first screen. A handicraft retailer needs product pages that Google can read and a checkout that does not lose the sale on a slow connection. The craft is constant; the priorities change with the business.",
        ]],
        ['kind' => 'cards', 'heading' => 'Types of websites we design and develop', 'body' => 'Nine build types cover almost every enquiry we receive as a website development company in Rajasthan.', 'items' => [
            ['glyph' => '◆', 'title' => 'Hotel website design', 'body' => 'Room-type pages with real rates, gallery, amenities, policies and a booking path that finishes in under a minute on a phone. Built to sit alongside your channel manager and booking engine rather than fight them.'],
            ['glyph' => '◍', 'title' => 'Travel and tour website development', 'body' => 'Itineraries, package pages, seasonal offers and destination content structured so each tour can rank on its own terms instead of competing with your homepage for the same searches.'],
            ['glyph' => '◈', 'title' => 'React website development', 'body' => 'Custom front-ends where interaction and speed matter: multi-property sites, availability search, comparison tools and anything that needs to feel instant rather than reload between steps.'],
            ['glyph' => '▤', 'title' => 'WordPress development', 'body' => 'Sites your own team can maintain safely. Clean theme, no plugin bloat, edit-only-what-you-should permissions and a short handover walkthrough so nobody breaks the layout changing a rate.'],
            ['glyph' => '▣', 'title' => 'E-commerce website development', 'body' => 'Catalogue structure, variants, payment and shipping set up with product-level SEO from the first build, so category pages have a chance to rank rather than being dead ends.'],
            ['glyph' => '◎', 'title' => 'Landing page design', 'body' => 'Single-purpose pages for a campaign, an offer or a season. One message, one action, tracking wired in, and fast enough that paid traffic is not wasted on a loading screen.'],
            ['glyph' => '⇄', 'title' => 'Website redesign', 'body' => 'Keep the pages that already earn traffic and rebuild the rest. We audit rankings, speed and conversion before touching anything, so a redesign does not quietly cost you your visibility.'],
            ['glyph' => '◉', 'title' => 'Business website design', 'body' => 'For local businesses and professional services: credibility, services, proof and a contact route that works. Small, fast, honest sites that answer the questions a caller would ask.'],
            ['glyph' => '◆', 'title' => 'Website maintenance', 'body' => 'Updates, security monitoring, backups, uptime checks and a monthly allowance for content changes. The unglamorous work that keeps a site earning after launch.'],
        ]],
        ['kind' => 'steps', 'heading' => 'Our website design process', 'body' => 'Six stages, each with a deliverable you can see and sign off.', 'items' => [
            ['num' => '01', 'title' => 'Discovery', 'body' => 'Your property or business, your season, your competitors and where enquiries are lost today. We look at analytics if you have them and at your current site on a real phone.'],
            ['num' => '02', 'title' => 'Structure', 'body' => 'A page map and the enquiry path through it, agreed in writing. This is where most of the value is decided, long before anything looks like a website.'],
            ['num' => '03', 'title' => 'Design', 'body' => 'Layouts and copy planned together, because a headline and the space it sits in are one decision. You see full-page designs, not decorative fragments.'],
            ['num' => '04', 'title' => 'Development', 'body' => 'Fast, accessible, correctly marked-up build. Responsive from 360px upward, keyboard navigable, no layout shift, images served in modern formats.'],
            ['num' => '05', 'title' => 'Launch', 'body' => 'Migration, redirects, indexing, analytics and conversion tracking, plus a full QA pass on real devices before the switch. Redirect maps matter more than anything else here.'],
            ['num' => '06', 'title' => 'Growth', 'body' => 'Post-launch changes, seasonal updates and, where it makes sense, ongoing SEO and campaign work measured against enquiries rather than traffic.'],
        ]],
        ['kind' => 'pills', 'heading' => 'Technology stack', 'body' => 'We pick the stack to fit the site, not the other way round.', 'items' => ['React', 'WordPress', 'Tailwind CSS', 'Node', 'WooCommerce', 'Managed cloud hosting', 'CDN', 'WebP / AVIF images', 'Google Analytics 4', 'Search Console']],
        ['kind' => 'kv', 'heading' => 'Industry solutions', 'body' => 'The same craft, aimed at different buying behaviour.', 'items' => [
            ['name' => 'Hotels and resorts', 'body' => 'room-type pages, rate clarity and booking engine integration.'],
            ['name' => 'Desert camps', 'body' => 'seasonal packages, gallery-led pages and fast mobile enquiry.'],
            ['name' => 'Tour operators', 'body' => 'itinerary structure and package pages that rank individually.'],
            ['name' => 'Taxi and transfers', 'body' => 'route pages, fare clarity and one-tap calling.'],
            ['name' => 'Restaurants', 'body' => 'menu, location, timings and reservation above the fold.'],
            ['name' => 'E-commerce and retail', 'body' => 'catalogue structure, product SEO and a checkout that survives slow networks.'],
        ]],
        ['kind' => 'cards', 'heading' => 'What you get in every build', 'body' => 'These are not upgrades. They are the baseline for any website we hand over.', 'items' => [
            ['title' => 'Mobile-first, from 360px up', 'body' => 'Designed on the smallest real screen first, then widened. Most Rajasthan travel searches happen on a phone, so that is where quality is decided.'],
            ['title' => 'Speed as a requirement', 'body' => 'Compressed modern-format images, lazy loading, minimal scripts and no layout shift. Speed is scoped as work, not hoped for at the end.'],
            ['title' => 'SEO-ready structure', 'body' => 'One clear H1 per page, logical headings, descriptive alt text, internal links, clean slugs, sitemap and correct indexing rules from launch.'],
            ['title' => 'Accessibility', 'body' => 'Keyboard navigation, visible focus states, real form labels, sensible contrast and a skip-to-content link. It widens your audience and it is simply correct.'],
            ['title' => 'Conversion paths', 'body' => 'Call, WhatsApp, enquiry form and booking, placed where the visitor is ready rather than only in the footer.'],
            ['title' => 'Analytics and tracking', 'body' => 'GA4, Search Console and conversion events configured before launch, so month one is measurable instead of guessed at.'],
            ['title' => 'Content written for you', 'body' => 'Room descriptions, service pages and enquiry copy written by us and reviewed by you. No placeholder text at launch.'],
            ['title' => 'Handover and training', 'body' => 'Admin access, a recorded walkthrough and documentation of what to edit where, so routine changes never need a support ticket.'],
        ]],
        ['kind' => 'cards', 'heading' => 'Website design packages', 'body' => 'Three starting points. Final scope and cost are confirmed after a short discovery call.', 'items' => [
            ['title' => 'Starter site', 'body' => 'A small business, single-location service or new venture. Includes: Up to 6 pages, Mobile-first responsive build, Enquiry form and WhatsApp click-to-chat, On-page SEO basics, Google Analytics and Search Console setup.'],
            ['title' => 'Hotel and travel site', 'body' => 'Properties and operators selling rooms, packages or tours. Includes: Room or package detail pages, Rates, gallery, amenities and policies, Booking engine integration, Destination and offer landing pages, Local SEO groundwork.'],
            ['title' => 'Custom build', 'body' => 'E-commerce, multi-property groups and React applications. Includes: Custom front-end in React, Catalogue or multi-property structure, Payment gateway integration, Performance and accessibility budget, Documented handover.'],
        ]],
        ['kind' => 'cards', 'heading' => 'Recent website work', 'body' => 'Placeholder entries — add real client names, screenshots and verified results before publishing.', 'items' => [
            ['title' => 'Heritage hotel, Jaisalmer', 'body' => 'Website rebuild with room-level pages and booking engine integration. Add verified result.'],
            ['title' => 'Desert camp, Sam Dunes', 'body' => 'Seasonal package pages and a mobile enquiry funnel. Add verified result.'],
            ['title' => 'Tour operator, Rajasthan', 'body' => 'Itinerary structure built for destination search terms. Add verified result.'],
        ]],
    ],
    'related' => [
        ['label' => 'SEO Services', 'to' => '/seo-services'],
        ['label' => 'Online Marketing', 'to' => '/online-marketing'],
        ['label' => 'Hotel Digital Marketing', 'to' => '/hotel-digital-marketing'],
        ['label' => 'Portfolio', 'to' => '/portfolio'],
    ],
    'cta_heading' => 'Ready for a website that pulls its weight?',
    'cta_body' => 'Send us your current site and we will tell you plainly whether to improve it or rebuild it.',
    'seo_title' => 'Website Designing Company in Jaisalmer | Website Development Rajasthan — Shrinath Solutions',
    'seo_description' => 'Website designing company in Jaisalmer building hotel websites, travel websites, WordPress, React and e-commerce sites for businesses across Rajasthan. Mobile-first, SEO-ready, built for enquiries.',
    'path' => '/website-designing',
    'faqs' => [
        ['How much does website designing cost in Jaisalmer?', 'Cost depends on page count, whether you need a booking engine, and how much content has to be written. A small business brochure site is a very different piece of work from a forty-room hotel site with live rates and payment integration. We quote after a short discovery call rather than publishing a headline price that would be wrong for most enquiries, and the quote lists exactly what is included so you can compare it against any other proposal you hold.'],
        ['How long does a website take to build?', 'A straightforward business or brochure website usually takes two to four weeks from approved structure to launch. Hotel and travel sites take longer, typically four to eight weeks, because rate tables, room pages and booking engine integration all need testing against real inventory. Delays almost always come from content — photographs, room descriptions and rates — so we agree who is supplying what during discovery.'],
        ['Will my website be SEO-ready when it launches?', 'Yes. Clean heading structure, fast loading, descriptive image alt text, internal linking, sitemap and correct indexing rules are built in rather than added later. That gives your pages a fair chance of ranking from day one. Ongoing SEO — content, local visibility, link building — is separate work, and we will tell you honestly whether you need it or whether the build alone is enough for your market.'],
        ['Can I update the website myself after launch?', 'On WordPress builds, yes. You get an admin login and a short walkthrough covering the sections you will realistically change: offers, rates, gallery images, blog posts and contact details. On React builds we agree in advance which sections must be editable and wire those to a simple content layer, so you are never dependent on us for a price change or a new photograph.'],
        ['Do you redesign existing websites?', 'Often, yes, and it is frequently the better spend. We audit the current site first — what ranks, what converts, what loads slowly — then keep the pages earning traffic and rebuild the rest. Throwing away a site that already ranks for useful local search terms is an expensive mistake, and a redesign done carelessly can undo years of visibility overnight.'],
        ['Do you provide hosting and maintenance?', 'We can arrange managed hosting with a CDN and daily backups, or work with your existing provider. Maintenance plans cover core and plugin updates, security monitoring, uptime checks, backup verification and a set allowance of small content changes each month. It is optional, but an unmaintained site is the most common cause of the emergency calls we receive.'],
        ['Do you write the website content?', 'Yes. Room descriptions, service pages, destination copy and enquiry-page wording are written by us and reviewed by you before publishing. We do not use placeholder text at launch, and we do not stuff keywords into copy that a guest has to read. Photography is the one thing we cannot produce — we advise on the shot list and can arrange a local shoot, quoted separately.'],
    ],
];

// --- Online Marketing ---
$services[] = [
    'name' => 'Online Marketing Services',
    'slug' => 'online-marketing',
    'category' => 'Services',
    'hero_label' => 'Online marketing',
    'h1' => 'Digital marketing company in Jaisalmer, working to a cost per enquiry.',
    'hero_description' => 'Google Ads, Meta Ads, social media, content, email and reputation work for hotels, travel operators and local businesses across Rajasthan — planned against a number you agree before we spend anything.',
    'hero_cta_label' => 'Request a marketing plan',
    'hero_notes' => ['Tracking set up first', 'Monthly plain-language reporting'],
    'blocks' => [
        ['kind' => 'paras', 'heading' => 'Start with the number, not the channel', 'items' => [
            "Most marketing proposals start with channels: some Google Ads, some Meta, a social calendar, perhaps a newsletter. That order is backwards. Until you know what an enquiry is worth to you and what you can afford to pay for one, no channel recommendation can be right or wrong — it is just a shopping list.",
            "So the first conversation is arithmetic. What does an average booking or job earn you. How many enquiries convert. What is a reasonable cost per enquiry given that. Once those three numbers exist, the channel decisions almost make themselves, and it becomes obvious when a channel should be cut instead of defended.",
            "The second thing we do is verify tracking, before anything goes live. A surprising share of the accounts we audit are spending real money on campaigns whose conversions were never configured correctly, which means every optimisation decision for the past year was made on fiction. Fixing that usually improves results before a single rupee of new spend.",
            "After that it becomes ordinary disciplined work: tight search term control, landing pages matched to the ad, creative refreshed before it fatigues, budget moved toward what converts, and a monthly conversation about what to change. There is no proprietary method here, and anyone claiming one is selling mystique.",
            "For seasonal businesses in Rajasthan there is one extra rule: spend follows demand. Constant year-round budget is a comfortable habit that wastes money in the quiet months and under-invests in the weeks that pay for the year. The plan is written against the calendar, and the budget moves with it.",
        ]],
        ['kind' => 'cards', 'heading' => 'What the programme includes', 'body' => 'Ten services. A working programme usually combines three or four.', 'tint' => 'rgba(123,92,255,.22)', 'items' => [
            ['glyph' => '◎', 'title' => 'Digital marketing strategy', 'body' => 'Channel mix, budget split, offer and calendar, built from your own numbers rather than a template. The document you can hold us to.'],
            ['glyph' => '◉', 'title' => 'Google Ads management', 'body' => 'Search, Performance Max and remarketing with tight search term control, negative keyword hygiene and a cost-per-enquiry target rather than a click target.'],
            ['glyph' => '◍', 'title' => 'Meta Ads management', 'body' => 'Facebook and Instagram campaigns for demand generation and seasonal occupancy, with creative refreshed before fatigue kills performance.'],
            ['glyph' => '◈', 'title' => 'Social media marketing', 'body' => 'A content calendar tied to season, inventory and real events at the property. Posts that give someone a reason to enquire, not filler to hit a quota.'],
            ['glyph' => '▣', 'title' => 'Lead generation', 'body' => 'Landing pages, forms, WhatsApp click-to-chat and call tracking, plus a follow-up standard, because unanswered leads are the most expensive kind.'],
            ['glyph' => '▤', 'title' => 'Content marketing', 'body' => 'Destination guides, service explainers and comparison content that supports search visibility and gives paid traffic somewhere useful to land.'],
            ['glyph' => '◆', 'title' => 'Online reputation management', 'body' => 'Review monitoring, response standards and escalation of recurring issues. Reputation changes conversion rate more cheaply than any ad.'],
            ['glyph' => '◉', 'title' => 'Google Business Profile management', 'body' => 'Profile kept complete and current — categories, services, photographs, posts, Q&A — because local intent converts better than almost anything else.'],
            ['glyph' => '⇄', 'title' => 'Email marketing', 'body' => 'Repeat-guest offers, off-season campaigns and enquiry follow-up sequences. Cheap, unglamorous and consistently underused.'],
            ['glyph' => '◈', 'title' => 'Reporting and analytics', 'body' => 'GA4, conversion events, call and WhatsApp tracking configured properly, with one monthly document that answers what each rupee produced.'],
        ]],
        ['kind' => 'steps', 'heading' => 'How a campaign runs', 'body' => 'Nothing goes live before tracking is verified.', 'items' => [
            ['num' => '01', 'title' => 'Audit', 'body' => 'Current spend, account structure, tracking accuracy and obvious waste. Frequently the fastest improvement available, before new budget.'],
            ['num' => '02', 'title' => 'Plan', 'body' => 'Targets, channel mix, offer and creative direction, with the arithmetic shown so you can challenge it.'],
            ['num' => '03', 'title' => 'Launch', 'body' => 'Campaigns, landing pages and tracking go live together. No spend before conversions are verified end to end.'],
            ['num' => '04', 'title' => 'Optimise', 'body' => 'Weekly work on search terms, audiences, bids and creative. Small consistent changes, not monthly overhauls.'],
            ['num' => '05', 'title' => 'Report', 'body' => 'Monthly review of cost per enquiry by channel, what changed, and the plan for the next period.'],
        ]],
        ['kind' => 'kv', 'heading' => 'Channels and when they earn their place', 'items' => [
            ['name' => 'Google Search', 'body' => 'When people are already looking for what you sell. Highest intent, usually the first channel worth funding.'],
            ['name' => 'Performance Max', 'body' => 'Useful once conversion data exists. Wasteful when launched cold with no signal to learn from.'],
            ['name' => 'Meta Ads', 'body' => 'For demand creation, gallery-led products and filling occupancy gaps. Creative quality decides everything.'],
            ['name' => 'Google Business Profile', 'body' => 'Free, local, high intent. Neglected by most competitors, which is exactly why it works.'],
            ['name' => 'Email', 'body' => 'Cheapest repeat revenue you have, provided you actually collect addresses at the right moment.'],
        ]],
        ['kind' => 'ticks', 'heading' => 'Reporting and analytics', 'body' => 'One monthly document answering what each rupee produced.', 'items' => [
            'Cost per enquiry by channel, with direction of travel',
            'Enquiries, calls and WhatsApp conversations attributed to source',
            'Landing page conversion rate and where visitors drop out',
            'What we changed this month and why',
            'The plan for next month, including anything we recommend stopping',
        ]],
        ['kind' => 'cards', 'heading' => 'Industries we run campaigns for', 'body' => 'Buying behaviour differs sharply across these, and so does the channel that works.', 'items' => [
            ['title' => 'Hotels and desert camps', 'body' => 'Seasonal demand, gallery-led decisions, short booking windows and a hard peak. Spend follows the calendar.'],
            ['title' => 'Tour operators', 'body' => 'Longer research cycles and itinerary comparison, so content and remarketing matter more than a single ad.'],
            ['title' => 'Taxi and transfers', 'body' => 'Immediate intent and map visibility. Call tracking and one-tap contact do most of the work.'],
            ['title' => 'Restaurants', 'body' => 'Local reach, reviews and timing. Small budgets, tight radius, frequent creative refresh.'],
            ['title' => 'E-commerce and retail', 'body' => 'Product feeds, category structure and margin per order deciding what is affordable to bid.'],
            ['title' => 'Professional services', 'body' => 'Fewer, higher-value enquiries. Search intent and credibility content, measured over quarters not weeks.'],
        ]],
    ],
    'related' => [
        ['label' => 'SEO Services', 'to' => '/seo-services'],
        ['label' => 'Hotel Digital Marketing', 'to' => '/hotel-digital-marketing'],
        ['label' => 'Website Designing', 'to' => '/website-designing'],
    ],
    'cta_heading' => "Let's set a target before we set a budget.",
    'cta_body' => 'Tell us what an enquiry is worth to you and we will tell you whether paid channels make sense.',
    'seo_title' => 'Digital Marketing Company in Jaisalmer | Online Marketing Services — Shrinath Solutions',
    'seo_description' => 'Digital marketing company in Jaisalmer offering Google Ads, Meta Ads, social media marketing, lead generation, content marketing, email marketing and analytics for businesses across Rajasthan.',
    'path' => '/online-marketing',
    'faqs' => [
        ['What budget do I need to start?', 'Enough to gather readable data before you judge the result, which depends on your market and the cost of a click in it. In a competitive tourism district a budget too small to produce twenty or thirty conversions a month cannot tell you anything useful — you end up guessing from noise. We tell you the realistic minimum before you commit, and if that number is beyond you we will say so and point you at organic work instead.'],
        ['Do you charge a percentage of ad spend?', 'No. We charge a management fee agreed in advance, because a percentage model quietly rewards us for spending more of your money. The fee is stated in the proposal along with what it covers: campaign management, creative iteration, landing page changes, tracking maintenance and the monthly report.'],
        ['How quickly will campaigns produce enquiries?', 'Paid search can produce enquiries in the first week, because you are buying existing demand rather than building it. What takes longer is efficiency — the first month is largely about learning which search terms, audiences and creatives are worth keeping, and the cost per enquiry usually falls substantially between month one and month three.'],
        ['Who writes the ads and creates the graphics?', 'We do. Ad copy, landing page wording and simple graphics are included. Photography and video production are not, though we will advise on the shot list and can arrange a local shoot. Good creative built on weak photography is a ceiling you cannot buy your way past, particularly in hospitality.'],
        ['Can you work alongside our in-house team?', 'Frequently, and it often works well. A common arrangement is that we run paid channels and analytics while your own team handles day-to-day social content, because they are closer to the property and can post the things guests actually want to see. We agree the boundary in writing so nothing falls between us.'],
        ['What happens if a campaign is not working?', 'We say so in the report, with the numbers, and propose a change: different channel, different offer, different landing page, or stopping altogether. Continuing to bill for a channel that is not producing is the easiest thing an agency can do and the fastest way to lose a client permanently.'],
        ['Do you manage online reputation and reviews?', 'Yes, as part of the programme or separately. That means monitoring reviews across the channels that matter to you, responding within an agreed window, and reporting recurring complaints as operational issues rather than burying them. In hospitality, review quality affects conversion more than almost any ad you can buy.'],
    ],
];

// --- SEO Services ---
$services[] = [
    'name' => 'SEO Services',
    'slug' => 'seo-services',
    'category' => 'Services',
    'hero_label' => 'SEO services',
    'h1' => 'SEO company in Jaisalmer for businesses that need to be found locally.',
    'hero_description' => 'Technical fixes first, then structure, then content and local visibility — sequenced so the work that moves rankings soonest happens soonest. No guaranteed-rank promises, no bulk link packages.',
    'hero_cta_label' => 'Request a free SEO audit',
    'hero_notes' => ['Audit before proposal', 'Monthly reporting'],
    'blocks' => [
        ['kind' => 'paras', 'heading' => 'What SEO actually looks like for a business in Rajasthan', 'items' => [
            "SEO in a tourism district is a seasonal argument, not a permanent one. Searches for Jaisalmer hotels, desert camps and tour packages spike and collapse on a predictable annual curve, which means the work you do in the quiet months decides what you earn in the busy ones. A programme that starts in October is already late.",
            "It also means the competition is unusually local. You are not fighting a national brand for the phrase that matters; you are fighting eleven properties within four kilometres, all with similar photographs and similar claims. The differences that decide rankings are unglamorous: which site loads in two seconds instead of six, which one has a page for each room type, which Google profile is complete, which one has answered its reviews.",
            "That is why we audit before proposing. Two businesses in the same street can need completely different work — one needs a technical rebuild, the other needs eight pages that were never written. Selling both the same monthly retainer is how the industry earned its reputation, and it is the fastest way to waste a year of your budget.",
            "The sequence we use is consistent even when the tasks are not. Fix what blocks Google, publish what is missing, earn relevance, then keep the momentum with content and local signals. Reported monthly against the terms and the enquiries you agreed to care about, in plain language, without a dashboard designed to look busier than the work.",
        ]],
        ['kind' => 'ticks', 'heading' => 'Start with the free SEO audit', 'body' => 'Before any proposal we run an audit and send you the findings whether or not you hire us.', 'items' => [
            'Technical health: speed, Core Web Vitals, crawl and indexing issues',
            'Page structure: headings, intent, internal linking and thin pages',
            'Local visibility: Google Business Profile, citations and reviews',
            'Competitors ranking above you and the gap that explains why',
            'Keyword opportunities with real intent in your region',
            'A prioritised fix list, quickest meaningful win first',
        ]],
        ['kind' => 'cards', 'heading' => 'Our SEO services', 'body' => 'Twelve areas of work. A typical engagement uses six or seven, in an order set by the audit.', 'tint' => 'rgba(34,211,238,.18)', 'items' => [
            ['glyph' => '◈', 'title' => 'Technical SEO', 'body' => 'Crawlability, indexing, site speed, Core Web Vitals, canonical rules, structured data and redirect hygiene. The work that decides whether anything else you do is even visible to Google.'],
            ['glyph' => '◍', 'title' => 'On-page SEO', 'body' => 'One clear intent per page, correct heading hierarchy, honest titles and descriptions, internal links that pass relevance, and content depth that matches what the search actually wants.'],
            ['glyph' => '◎', 'title' => 'Off-page SEO', 'body' => 'Relevant citations, directory listings, partnerships and coverage earned rather than bought. Fewer links, better sources, and a report of every one so you know exactly what exists.'],
            ['glyph' => '◉', 'title' => 'Local SEO', 'body' => 'Google Business Profile optimisation, local landing pages, NAP consistency, map-pack visibility and a review process. Usually the fastest-moving work for a Jaisalmer business.'],
            ['glyph' => '◆', 'title' => 'Hotel SEO', 'body' => 'Property, room-type and amenity pages, rate visibility, seasonal offers and destination content built so a guest comparing options lands on your site instead of an OTA listing.'],
            ['glyph' => '◍', 'title' => 'Travel and tour SEO', 'body' => 'Individual itinerary and package pages that rank on their own terms, plus destination guides that capture research-stage searches and route them toward your enquiry form.'],
            ['glyph' => '▣', 'title' => 'E-commerce SEO', 'body' => 'Category and product-level optimisation, faceted navigation handled correctly, product schema, and internal linking that stops deep pages from being invisible.'],
            ['glyph' => '◈', 'title' => 'Keyword research', 'body' => 'Search terms with real intent and real volume in your region, mapped to the page that should own each one — so two of your pages never compete for the same search.'],
            ['glyph' => '▤', 'title' => 'Content strategy', 'body' => 'The pages you are missing, the order to publish them and who they are for. A calendar tied to season and inventory, not a quota of articles for their own sake.'],
            ['glyph' => '◎', 'title' => 'Content writing', 'body' => 'Destination guides, service pages, room descriptions and articles written to be read by a person first. Reviewed by you before anything is published.'],
            ['glyph' => '◉', 'title' => 'Google Business Profile SEO', 'body' => 'Categories, services, attributes, photographs, posts, Q&A and review responses maintained monthly, because a stale profile quietly loses map-pack visibility.'],
            ['glyph' => '◆', 'title' => 'SEO reporting', 'body' => 'Rankings, organic traffic, enquiries from search and the work completed, in one monthly document. Bad months are explained rather than buried.'],
        ]],
        ['kind' => 'steps', 'heading' => 'The first ninety days', 'body' => 'Front-load the work that compounds.', 'items' => [
            ['num' => '01', 'title' => 'Audit', 'body' => 'Technical, content, local and competitor review, with a prioritised fix list you own regardless of what you decide next.'],
            ['num' => '02', 'title' => 'Fix', 'body' => 'Critical technical and on-page issues cleared first: speed, indexing, duplicate intent, broken structure, missing metadata.'],
            ['num' => '03', 'title' => 'Build', 'body' => 'Missing pages written and published — room types, services, destinations, routes — each mapped to a search term with real intent.'],
            ['num' => '04', 'title' => 'Earn', 'body' => 'Local profile work, citations, relevant links and review process. Slower to show, but it is what holds a position once you have it.'],
            ['num' => '05', 'title' => 'Report', 'body' => "Movement reviewed against the agreed terms, with next month's plan attached. Adjust the plan, not the definition of success."],
        ]],
        ['kind' => 'kv', 'heading' => 'Industries we run SEO for', 'items' => [
            ['name' => 'Hotels and resorts', 'body' => 'property, room and destination search terms.'],
            ['name' => 'Desert camps', 'body' => 'seasonal demand and package searches.'],
            ['name' => 'Tour operators', 'body' => 'itinerary and route-level visibility.'],
            ['name' => 'Taxi and transfers', 'body' => 'map-pack and airport transfer searches.'],
            ['name' => 'Restaurants and retail', 'body' => 'local intent and near-me visibility.'],
            ['name' => 'Professional services', 'body' => 'service pages and location-based searches.'],
        ]],
        ['kind' => 'ticks', 'heading' => 'How we report', 'body' => 'One monthly document in plain language. If a month goes badly, the report says so.', 'items' => [
            'Rankings for the agreed keyword set, with movement since last month',
            'Organic traffic and which pages earned it',
            'Enquiries, calls and form submissions attributed to search',
            'Google Business Profile views, calls and direction requests',
            'The work completed this month and the plan for next',
        ]],
        ['kind' => 'cards', 'heading' => 'What we will not do', 'body' => 'The SEO industry has earned its scepticism. These are the practices we refuse.', 'items' => [
            ['title' => 'No guaranteed rankings', 'body' => "Nobody controls Google's systems. A guarantee is either meaningless small print or a sign that low-quality tactics are coming."],
            ['title' => 'No bulk link packages', 'body' => 'Thousands of cheap links produce a short spike and a long risk. We report every link we build so you can see exactly what exists.'],
            ['title' => 'No keyword stuffing', 'body' => 'Copy is written for the guest or customer first. Search terms are used where they read naturally, and nowhere else.'],
            ['title' => 'No vanity reporting', 'body' => 'Impressions and rank averages can rise while enquiries fall. We report the enquiries, even when the number is uncomfortable.'],
        ]],
    ],
    'related' => [
        ['label' => 'Website Designing', 'to' => '/website-designing'],
        ['label' => 'Online Marketing', 'to' => '/online-marketing'],
        ['label' => 'Hotel Digital Marketing', 'to' => '/hotel-digital-marketing'],
    ],
    'cta_heading' => 'Find out what is holding your rankings back.',
    'cta_body' => 'The audit is free and yours to keep, whether you work with us or not.',
    'seo_title' => 'SEO Company in Jaisalmer | SEO Services in Rajasthan — Shrinath Solutions',
    'seo_description' => 'SEO services in Jaisalmer and across Rajasthan: technical SEO, local SEO, hotel SEO, travel and e-commerce SEO, content and reporting. Start with a free SEO audit.',
    'path' => '/seo-services',
    'faqs' => [
        ['How long does SEO take to show results?', 'Local searches can move within four to eight weeks, particularly where the Google Business Profile has been neglected and the fixes are obvious. Competitive destination terms — the ones every hotel and camp in the district wants — usually take three to six months of consistent work before they hold a stable position. Anyone promising faster on a competitive term is either guessing or planning to use tactics that will cost you later.'],
        ['Do you guarantee a number one ranking?', "No, and no credible agency does. Nobody controls Google's ranking systems, and search results now vary by device, location and query intent. What we commit to is the work, the reporting and measurable movement against the terms we agree at the start. If the movement is not there after a fair period, we tell you and we change the plan rather than repackaging the same report."],
        ['What is included in the free SEO audit?', 'A technical review covering speed, indexing, crawl issues and structured data; a content review covering page structure, intent and internal linking; a local review of your Google Business Profile and citations; and a competitor comparison for the searches that actually bring enquiries in your area. You receive the findings as a prioritised list, and it is yours whether you hire us or not.'],
        ['Do you write the content, or do we?', 'We write it, and you review it before publishing. That includes destination pages, service pages, room descriptions and blog articles. Content written by someone who has not seen the property tends to read like it, so we ask questions and use your own material where it exists. If you would rather write it yourself, we supply the brief, the structure and the search terms to cover.'],
        ['Will you fix our Google Business Profile?', 'Yes — it is usually the fastest win for a business in Jaisalmer. Categories, services, attributes, opening hours, photographs, Q&A and review responses all affect local visibility, and most profiles we audit have at least three of those either wrong or empty. We set a standard for review replies too, because unanswered reviews cost you bookings regardless of ranking.'],
        ['Do you build backlinks?', 'Selectively, and only where relevance is real: travel and tourism directories, local business listings, genuine partnerships, and press coverage where there is something worth covering. We do not buy bulk links or use private blog networks. They produce a brief spike, then a penalty risk that takes far longer to recover from than the ranking was ever worth.'],
        ['Can we do SEO without rebuilding our website?', 'Frequently, yes. If the site is reasonably fast and structured sensibly, we work with what exists — fixing technical issues, restructuring pages and adding what is missing. If the site is slow, unindexable or built in a way that blocks content changes, we say so plainly, because paying monthly for SEO on a site that cannot rank is wasted money.'],
    ],
];

// --- Hotel Digital Marketing ---
$services[] = [
    'name' => 'Hotel Digital Marketing',
    'slug' => 'hotel-digital-marketing',
    'category' => 'Services',
    'hero_label' => 'Hotel digital marketing',
    'h1' => 'Hotel digital marketing that shifts bookings from OTAs to your own site.',
    'hero_description' => 'For hotels, resorts and desert camps in Jaisalmer and across Rajasthan: hotel SEO, a direct booking strategy, OTA discipline, Google Hotel Ads, reputation management and the website and booking engine underneath it all.',
    'hero_cta_label' => 'Request a strategy call',
    'hero_notes' => ['Hospitality is our core niche', 'Based in Jaisalmer'],
    'blocks' => [
        ['kind' => 'paras', 'heading' => 'The commission problem, stated honestly', 'items' => [
            "Every hotel owner in Jaisalmer knows roughly what OTA commission costs them. Far fewer know what share of their bookings arrive through channels that were never really necessary — guests who searched for the property by name, found the listing site first, and booked there because it was easier than finding the hotel's own booking page.",
            "That is the recoverable share, and it is usually larger than owners expect. It does not require abandoning the OTAs, undercutting your own rates, or a rebrand. It requires being findable, being fast, showing a price, and making the booking possible in under a minute on a phone with two bars of signal.",
            "The properties that manage this in Rajasthan are not the ones with the biggest marketing budgets. They are the ones whose room pages exist, whose Google profile is complete, whose rates match across channels, and whose enquiries get answered the same day. None of that is glamorous work, and all of it compounds.",
            "Hospitality is our core niche rather than a category we also serve, which changes the conversation. We ask about your ADR, your shoulder season, your cancellation pattern and your OTA mix before discussing creative, because those numbers determine what is worth spending and where.",
            "What follows is the full programme. Very few properties need all of it at once, and any agency proposing everything on the first call is selling a retainer rather than solving a problem. The audit decides the order.",
        ]],
        ['kind' => 'cards', 'heading' => 'The direct-booking programme', 'body' => 'Eleven pieces of work. Most properties need six or seven.', 'tint' => 'rgba(255,122,47,.2)', 'items' => [
            ['glyph' => '◈', 'title' => 'Hotel SEO', 'body' => 'Property, room-type and amenity pages built to rank, plus destination content that captures research-stage searches before a listing site does.'],
            ['glyph' => '◆', 'title' => 'Direct booking strategy', 'body' => 'Rate parity, direct-only incentives, the booking path itself and the reasons a guest should skip the OTA. Commercial decisions first, marketing second.'],
            ['glyph' => '◎', 'title' => 'OTA optimisation', 'body' => 'Listings complete and accurate, photographs strong, amenities filled in, rates deliberate. OTAs work as discovery when they are not your only channel.'],
            ['glyph' => '◉', 'title' => 'Google Hotel Ads', 'body' => 'Your own rates shown beside the OTAs at the comparison moment, with the click going to your booking engine and an accurate rate feed behind it.'],
            ['glyph' => '▤', 'title' => 'Google Business Profile', 'body' => 'Categories, amenities, photographs, Q&A and posts maintained monthly. For local and branded searches it is often the highest-return work available.'],
            ['glyph' => '◍', 'title' => 'Meta and Google campaigns', 'body' => 'Season-led campaigns aimed at occupancy gaps rather than constant spend, with budgets set from ADR and conversion rate instead of guesswork.'],
            ['glyph' => '◎', 'title' => 'Social media management', 'body' => 'Content that shows the property honestly — rooms, food, staff, the desert at the right hour — on a calendar tied to season and inventory.'],
            ['glyph' => '◈', 'title' => 'Reputation management', 'body' => 'Review monitoring across channels, response standards, and reporting of recurring complaints as operational issues rather than marketing noise.'],
            ['glyph' => '▣', 'title' => 'Hotel website development', 'body' => 'Fast, mobile-first site with room detail, visible rates, gallery and a booking flow that finishes. Built to work with your existing systems.'],
            ['glyph' => '⇄', 'title' => 'Booking engine integration', 'body' => 'Live availability, instant confirmation and prepayment where you want it, so a direct booking is easier than an OTA booking rather than harder.'],
            ['glyph' => '◆', 'title' => 'Revenue-focused marketing', 'body' => 'Spend planned around ADR, occupancy and shoulder-season gaps, reported against booking revenue rather than clicks and impressions.'],
        ]],
        ['kind' => 'steps', 'heading' => 'Where hotels lose direct bookings', 'body' => 'Five failures account for most of it.', 'items' => [
            ['num' => '01', 'title' => 'Slow mobile site', 'body' => 'Guests leave before the room page finishes loading. On mobile data in Jaisalmer this happens more often than analytics suggests.'],
            ['num' => '02', 'title' => 'Hidden rates', 'body' => 'No visible price means a jump straight back to the OTA tab, where the price is always shown. Rate transparency is a conversion feature.'],
            ['num' => '03', 'title' => 'Broken booking flow', 'body' => 'Too many steps, no instant confirmation, or a form that promises a reply. Every extra screen loses a share of ready buyers.'],
            ['num' => '04', 'title' => 'Thin listings', 'body' => 'Weak photographs, missing amenities and empty descriptions on the channels where guests actually compare properties side by side.'],
            ['num' => '05', 'title' => 'No follow-up', 'body' => 'Enquiries arrive and nobody replies until tomorrow. Same-day response is the cheapest revenue improvement available to most properties.'],
        ]],
        ['kind' => 'kv', 'heading' => 'Property types we work with', 'items' => [
            ['name' => 'Heritage hotels', 'body' => 'brand searches, room-type depth and trust signals.'],
            ['name' => 'Desert camps', 'body' => 'short booking windows, gallery-led decisions, heavy seasonality.'],
            ['name' => 'Resorts', 'body' => 'package structure, events and multi-night stay incentives.'],
            ['name' => 'Boutique guesthouses', 'body' => 'review-driven conversion and strong local visibility.'],
            ['name' => 'Hotel groups', 'body' => 'multi-property structure without pages competing with each other.'],
        ]],
        ['kind' => 'cards', 'heading' => 'The seasonal calendar', 'body' => 'Rajasthan hospitality runs on a hard annual curve.', 'items' => [
            ['title' => 'Monsoon and low season', 'body' => 'Build the assets: technical fixes, missing pages, photography, booking engine work. Cheapest time to make changes and test them.'],
            ['title' => 'Pre-season ramp', 'body' => 'Content published, Hotel Ads live, listings refreshed, rates set. Everything must be in place before search demand rises.'],
            ['title' => 'Peak season', 'body' => 'Protect conversion and margin. Monitor parity, answer enquiries fast, keep spend focused on gaps rather than sold-out dates.'],
            ['title' => 'Post-season review', 'body' => 'Booking source analysis, what shifted direct, what the OTAs still earned, and the plan for the following year.'],
        ]],
        ['kind' => 'cards', 'heading' => 'What we measure', 'body' => 'Occupancy and margin, not impressions.', 'items' => [
            ['title' => 'Direct booking share', 'body' => 'The percentage of confirmed bookings arriving through your own channels, tracked month on month.'],
            ['title' => 'Commission avoided', 'body' => 'Direct revenue multiplied by the commission you would otherwise have paid. The clearest number in the report.'],
            ['title' => 'Cost per enquiry', 'body' => 'Total spend divided by qualified enquiries, split by channel, so weak channels are cut rather than tolerated.'],
            ['title' => 'Organic visibility', 'body' => 'Rankings and clicks for property, room and destination searches that matter in your district.'],
            ['title' => 'Booking engine conversion', 'body' => 'Sessions that reach the booking engine versus bookings completed, which isolates flow problems from traffic problems.'],
            ['title' => 'Review position', 'body' => 'Rating and volume across channels, and response time against the agreed standard.'],
        ]],
        ['kind' => 'cards', 'heading' => 'Case studies', 'body' => 'Structured placeholders. Add the real property, period and verified figures before publishing.', 'items' => [
            ['title' => 'Heritage hotel, Jaisalmer', 'body' => 'Website rebuild, room-level pages and hotel SEO. Replace with the real brief and period.'],
            ['title' => 'Desert camp, Sam Dunes', 'body' => 'Seasonal campaign, package pages and enquiry funnel. Replace with the real brief and period.'],
            ['title' => 'Resort, Rajasthan', 'body' => 'Channel manager setup plus Google Hotel Ads. Replace with the real brief and period.'],
        ]],
    ],
    'related' => [
        ['label' => 'SEO Services', 'to' => '/seo-services'],
        ['label' => 'Channel Manager & PMS', 'to' => '/channel-manager-hotel-software'],
        ['label' => 'Website Designing', 'to' => '/website-designing'],
        ['label' => 'Pricing', 'to' => '/channel-manager-pricing'],
    ],
    'cta_heading' => "Let's look at your OTA share together.",
    'cta_body' => 'Bring last year\'s booking sources to the call. We will tell you which single change is worth making first.',
    'seo_title' => 'Hotel Digital Marketing Company | Hotel SEO & Direct Booking — Shrinath Solutions',
    'seo_description' => 'Hotel digital marketing company in Jaisalmer: hotel SEO, direct booking strategy, OTA optimisation, Google Hotel Ads, reputation management and hotel website development for properties across Rajasthan.',
    'path' => '/hotel-digital-marketing',
    'faqs' => [
        ['Will this reduce our OTA bookings?', 'The aim is a better mix, not zero OTA. Listing sites are useful discovery channels, especially for a property nobody has heard of yet, and cutting them off abruptly usually costs more than it saves. What changes is the share: guests who would have booked through an OTA after finding you there anyway begin booking direct, because your own site is now faster, clearer and priced sensibly.'],
        ['Do we need a new website before marketing can work?', 'Not always. If your current site loads quickly, shows rates and has a booking path that works on a phone, we start with visibility and the booking flow instead. If it is slow, has no room-level pages or sends guests to a form that nobody answers, marketing spend leaks straight out of it — and we will say so before taking a monthly fee.'],
        ['How is hotel SEO different from ordinary SEO?', 'Intent and inventory. A hotel search carries dates, budget and a comparison set attached to it, and the competing results include OTAs with enormous authority. So the work concentrates on room-type pages, rate visibility, destination content, structured data and local signals, rather than chasing broad informational terms you cannot monetise.'],
        ['Can you work with our existing channel manager and booking engine?', 'Usually yes. We confirm what your current provider supports before promising anything, and we do not describe an integration as available until it is verified for your account. If the booking engine itself is the bottleneck — too many steps, no instant confirmation — we will tell you, and you can decide whether to change it.'],
        ['What does Google Hotel Ads actually do for us?', 'It places your own rate beside the OTA rates at the exact moment a guest is comparing, with a link to your booking engine. For properties whose direct rate is competitive, it is often the single highest-leverage channel available. It needs an accurate rate feed to work, which is why we set it up after the booking engine and channel manager are behaving correctly.'],
        ['How do you handle reviews?', 'With a process rather than ad-hoc replies. Every review gets a response within an agreed window, negative ones are answered factually and without argument, and recurring complaints are reported to you as an operations issue rather than a marketing one. Reviews influence both ranking and conversion, and a pattern of unanswered criticism costs bookings quietly.'],
        ['Do you handle photography and video?', 'We advise on the shot list — which rooms, which angles, which times of day — and can arrange a local shoot, quoted separately. Photography is the one input we cannot manufacture, and it is also the single biggest determinant of whether a guest chooses your camp over the one next to it. It is worth budgeting for properly.'],
    ],
];

// --- Channel Manager & Hotel Software ---
$services[] = [
    'name' => 'Hotel Channel Manager and Cloud PMS',
    'slug' => 'channel-manager-hotel-software',
    'category' => 'Hotel Technology',
    'hero_label' => 'Hotel software',
    'h1' => 'Hotel Channel Manager & Cloud PMS — One Connected Platform.',
    'hero_description' => 'Centralised inventory, real-time rate updates and synchronised bookings, with front desk, housekeeping, reporting and payments in the same system. Set up and supported by a team in Jaisalmer that answers the phone.',
    'hero_cta_label' => 'Request a demo',
    'hero_notes' => ['Local setup and training', 'Connections verified per property'],
    'blocks' => [
        ['kind' => 'paras', 'heading' => 'Why properties end up with a synchronisation problem', 'items' => [
            "A property with three OTA listings, a booking engine and a spreadsheet is not running a technology stack; it is running a reconciliation habit. Somebody checks channels each morning, adjusts availability by hand, and hopes nothing sold twice overnight. It works until the property is busy, which is exactly when it fails.",
            "The failure is expensive in two directions. An overbooking costs you a relocation, an apology and often a bad review that outlives the incident. An unsold room caused by defensive under-allocation costs you the whole night's revenue quietly, and nobody notices because there is nothing to notice.",
            "A channel manager removes the manual step. One inventory, read by every connected channel, updated the moment a booking lands anywhere. A cloud PMS then puts the operational side — arrivals, folios, housekeeping status, reports — in the same system rather than a separate ledger nobody reconciles until month end.",
            "None of this is new software, and we are not pretending to have invented it. What varies between providers is setup quality, whether the connections you were promised actually exist for your property, and whether anyone answers the phone in season. That is where a local partner is worth more than a feature list.",
            "We scope, configure, connect, train and support. Where an integration cannot be confirmed for your account, we say so before you sign rather than after. The pages below describe the modules and the onboarding honestly; the pricing page states plainly that figures depend on room count and channels.",
        ]],
        ['kind' => 'cards', 'heading' => 'What the platform covers', 'body' => 'Twelve modules. You enable what your property runs on and leave the rest.', 'items' => [
            ['glyph' => '⇄', 'title' => 'Centralised inventory', 'body' => 'One room count that every connected channel reads from. No parallel spreadsheets, no per-channel allocation guesswork, no defensive holdback of rooms you could have sold.'],
            ['glyph' => '◈', 'title' => 'Real-time rate updates', 'body' => 'Change a rate or restriction once and it propagates to connected channels within minutes, including derived rates and length-of-stay rules.'],
            ['glyph' => '◎', 'title' => 'Booking synchronisation', 'body' => 'Reservations from any channel flow into the PMS automatically, with availability adjusted the moment they land rather than at the next manual check.'],
            ['glyph' => '◆', 'title' => 'Overbooking reduction', 'body' => 'The most common cause of double sale — delayed inventory updates — is removed. Remaining risks are process issues, and training covers them.'],
            ['glyph' => '▤', 'title' => 'Cloud PMS', 'body' => 'Front desk, guest profiles, folios and reporting accessible from any device on the property, with user roles limiting what each staff member can change.'],
            ['glyph' => '◍', 'title' => 'Booking engine', 'body' => 'Commission-free reservations on your own domain with live availability, instant confirmation and a mobile flow that finishes in under a minute.'],
            ['glyph' => '◉', 'title' => 'OTA connections', 'body' => 'Channels activated one at a time and monitored, with the list confirmed for your property during scoping rather than promised in advance.'],
            ['glyph' => '▣', 'title' => 'Housekeeping', 'body' => 'Room status, task assignment and turnaround tracking on the floor, so reception knows what is ready without a phone call up the corridor.'],
            ['glyph' => '◈', 'title' => 'Front desk', 'body' => 'Check-in, check-out, room moves, extras and guest history on one screen, built for staff who are being interrupted while using it.'],
            ['glyph' => '◆', 'title' => 'Reports and analytics', 'body' => 'Occupancy, ADR, RevPAR, channel contribution and pace, exportable, so pricing conversations use numbers instead of impressions.'],
            ['glyph' => '◎', 'title' => 'Payment integrations', 'body' => 'Prepayment, deposits and refunds through a gateway configured for your account, with the transaction visible against the reservation.'],
            ['glyph' => '◉', 'title' => 'Google Hotel Ads feed', 'body' => 'An accurate rate feed so your own price appears beside the OTAs, sending the click to your booking engine rather than a listing.'],
        ]],
        ['kind' => 'steps', 'heading' => 'Setup and onboarding', 'body' => 'One to two weeks for most properties. Nothing goes live unmonitored.', 'items' => [
            ['num' => '01', 'title' => 'Scoping', 'body' => 'Room types, rate plans, current channels, existing systems and who does what at the property today.'],
            ['num' => '02', 'title' => 'Configuration', 'body' => 'Inventory, rates, restrictions, taxes and user roles set up, then checked against your own rate sheet.'],
            ['num' => '03', 'title' => 'Connections', 'body' => 'Channels activated one at a time and watched for a few days each, so a fault is traceable to a single change.'],
            ['num' => '04', 'title' => 'Training', 'body' => 'Separate sessions for front desk, housekeeping and management, using your real data rather than a demo property.'],
            ['num' => '05', 'title' => 'Go live', 'body' => 'Monitored switch-over with support on hand, and a follow-up session once real bookings have raised real questions.'],
        ]],
        ['kind' => 'ticks', 'heading' => 'What changes day to day', 'items' => [
            'Morning reconciliation stops being a job somebody has to remember.',
            'Rate changes take one action instead of one per channel.',
            'Reception can see room readiness without calling housekeeping.',
            'Direct bookings are confirmed instantly rather than by return email.',
            'Month-end reporting comes out of the system rather than a spreadsheet.',
            'Owners can see occupancy and channel mix without asking anyone.',
        ]],
        ['kind' => 'pills', 'heading' => 'Integrations', 'body' => 'We list an integration only once it is verified for your account. Replace these placeholders with the connections confirmed during scoping.', 'items' => [
            'OTA channel — placeholder, confirm per property',
            'OTA channel — placeholder, confirm per property',
            'Metasearch — placeholder, confirm per property',
            'Payment gateway — placeholder, confirm per property',
            'PMS API — placeholder, confirm per property',
        ], 'dashed' => true],
    ],
    'related' => [
        ['label' => 'Channel Manager Pricing', 'to' => '/channel-manager-pricing'],
        ['label' => 'Hotel Digital Marketing', 'to' => '/hotel-digital-marketing'],
        ['label' => 'Hotel Website Design', 'to' => '/website-designing'],
    ],
    'cta_heading' => 'See it running on your own inventory.',
    'cta_body' => 'A demo on your real room types and rate plans, not a generic screen tour.',
    'seo_title' => 'Hotel Channel Manager & Cloud PMS Software | Hotel Booking Software — Shrinath Solutions',
    'seo_description' => 'Hotel channel manager and cloud PMS: centralised inventory, real-time rate updates, booking synchronisation, booking engine, housekeeping, front desk, reports and payment integrations. Request a demo.',
    'path' => '/channel-manager-hotel-software',
    'faqs' => [
        ['Which OTAs and channels can you connect?', "Connections are confirmed property by property during scoping, and we do not describe an integration as available until it is verified for your account. That is a deliberate policy: the fastest way to lose a hotel's trust is to promise a channel connection in a sales conversation and then discover during setup that the property's contract type or region does not support it."],
        ['Can we keep our existing PMS and only use the channel manager?', 'Often yes, through an API connection, and for properties with staff already trained on a PMS that is usually the sensible route. We check feasibility with your current provider before quoting. Where no reliable connection exists we will tell you plainly rather than selling a partial integration that leaves you reconciling by hand anyway.'],
        ['How long does setup take?', 'Typically one to two weeks. Room types, rate plans and derived rates take the most time, particularly where a property has accumulated years of ad-hoc pricing that nobody has rationalised. Channel connections are then activated one at a time and watched for a few days each, rather than all at once.'],
        ['Will this stop overbooking completely?', 'It removes the most common cause, which is delayed inventory updates between channels. It cannot prevent a booking taken verbally at reception and entered an hour later, or a rate plan configured incorrectly. Those are process problems, and we cover them in training because the software alone does not solve them.'],
        ['Is training included, and who needs it?', 'Yes. Front desk and housekeeping staff get a working session each, and the owner or manager gets a separate session on rates, reports and channel decisions. We follow up a week or two after go-live, once real bookings have surfaced the questions that never come up during training.'],
        ['What happens when something breaks during peak season?', 'You reach a person locally rather than a ticket queue in another time zone. Support terms are stated in writing before setup, including what counts as urgent and the response window. During peak season we agree in advance who to call and when.'],
        ['Do we need the booking engine as well as the channel manager?', 'You need it if you want direct bookings, which is the entire point of reducing OTA dependence. The channel manager protects you from overbooking; the booking engine is what actually earns the commission back. Properties that install one without the other usually end up disappointed for predictable reasons.'],
    ],
];

foreach ($services as $order => $s) {
    if (service_slug_taken($pdo, $s['slug'], null)) {
        echo "Skipping {$s['slug']} — already exists.\n";
        continue;
    }

    $pdo->beginTransaction();
    try {
        $id = create_service($pdo, [
            'name' => $s['name'], 'slug' => $s['slug'], 'category' => $s['category'],
            'hero_label' => $s['hero_label'], 'h1' => $s['h1'], 'hero_description' => $s['hero_description'],
            'hero_cta_label' => $s['hero_cta_label'], 'hero_notes' => $s['hero_notes'], 'blocks' => $s['blocks'],
            'related' => $s['related'], 'cta_heading' => $s['cta_heading'], 'cta_body' => $s['cta_body'],
            'status' => 'published', 'menu_visibility' => true, 'display_order' => $order,
        ], $adminId);

        save_seo_meta($pdo, 'service', $id, [
            'meta_title' => $s['seo_title'],
            'meta_description' => $s['seo_description'],
            'canonical_url' => 'https://shrinathsolutions.com' . $s['path'],
        ]);
        save_faqs($pdo, 'service', $id, faqs_from_tuples($s['faqs']));

        $pdo->commit();
        echo "Seeded service: {$s['slug']} (id $id)\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed to seed {$s['slug']}: " . $e->getMessage() . "\n");
    }
}
