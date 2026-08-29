<?php
// CLI-only. Idempotent: migrates the 9 existing Ventures from src/data/ventures.ts into the new
// `ventures` (+ venture_services/venture_highlights/venture_sections/venture_media, and the
// shared `faqs` table) tables, transcribed verbatim — no content invented, no facts corrected.
//
// Also migrates each Venture's existing seo_meta row from its old route-only association
// (entity_type='seo_document', entity_id=<old seo_documents.id>) to the real content
// association (entity_type='venture', entity_id=<new ventures.id>) now that Ventures are a real
// content type — see api/lib/seo/documents.php's SEO_VIRTUAL_CONTENT_TYPES change. This
// preserves every existing score/keyphrase/history row; nothing is reset to empty.
//
// Safe to re-run: skips any venture whose slug already exists in `ventures`.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/Venture.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();
if (!$adminId) {
    $adminId = null;
}

// Transcribed verbatim from src/data/ventures.ts — see that file for the source of truth this
// was copied from. Any value here that conflicts with what's already live should be treated as
// a bug in this transcription, not a correction to make silently.
$ventures = [
    [
        'slug' => 'shrinath-rubber-stamp',
        'name' => 'Shrinath Rubber Stamp',
        'tagline' => 'Four Decades of Trusted Rubber Stamp Craftsmanship',
        'category' => 'Legacy Business',
        'summary' => 'A 40-year-old Jaisalmer rubber stamp business serving offices, hotels, schools and shops with traditional and self-inking stamps.',
        'phone_numbers' => ['9414319897', '7014259990'],
        'google_business_url' => 'https://share.google/mfS4YHPYDDjmztf2o',
        'theme' => ['layoutVariant' => 'heritage-craft', 'primary' => '#7a1f1f', 'secondary' => '#3a2a1c', 'accent' => '#b08d57', 'background' => '#f4ecdc', 'surface' => '#fffaf0', 'text' => '#241a12', 'muted' => '#5c4d3c', 'onPrimary' => '#fffaf0'],
        'services' => [
            ['title' => 'Traditional Rubber Stamps', 'description' => 'Classic wooden-handle stamps made to order for everyday office and personal use.', 'icon' => 'Stamp'],
            ['title' => 'Self-Inking Stamps', 'description' => 'Pre-inked, ready-to-use stamps for high-frequency signing, dating and approval work.', 'icon' => 'Repeat'],
            ['title' => 'Date & Numbering Stamps', 'description' => 'Adjustable date stamps and numbering stamps for registers, receipts and logbooks.', 'icon' => 'CalendarDays'],
            ['title' => 'Office & Business Stamps', 'description' => 'Company name, address and designation stamps for daily paperwork and correspondence.', 'icon' => 'Building2'],
            ['title' => 'Name Stamps', 'description' => 'Personal and professional name stamps for individuals, doctors and consultants.', 'icon' => 'UserRound'],
            ['title' => 'Custom Stamp Requirements', 'description' => 'Share your layout or requirement and we will discuss what is possible before production.', 'icon' => 'PenTool'],
            ['title' => 'Signature Stamps', 'description' => 'Facsimile signature stamps for approvals and high-volume signing.', 'icon' => 'PenTool'],
            ['title' => 'Stamp Pads & Ink Refills', 'description' => 'Replacement pads and ink in standard colours to keep existing stamps working well.', 'icon' => 'ShoppingBag'],
        ],
        'highlights' => [
            '40 years of continuous rubber stamp craft in Jaisalmer',
            'Traditional and self-inking formats',
            'Enquiry-based custom layouts',
            'Trusted by offices, hotels, schools and shops across the city',
        ],
        'sections' => [
            ['heading' => 'A Craft Passed Down Over Four Decades', 'body' => 'Shrinath Rubber Stamp has been part of Jaisalmer’s everyday business life for forty years. Long before digital signatures and printed letterheads became common, this workshop was already producing the stamps that offices, schools, hotels and shopkeepers relied on to authenticate their paperwork. That continuity is the business’s real legacy: the same attention to detail, carried forward across a generation of customers who return not because of a marketing campaign, but because the stamps simply work, order after order.'],
            ['heading' => 'Who Uses Our Stamps', 'body' => 'Government and private offices use our stamps for approvals, dispatch and correspondence. Hotels and guesthouses use them for registers, checks-in and billing. Schools use them for attendance, certificates and administrative records. Shops, clinics and independent professionals use name and designation stamps for daily paperwork. Whatever the setting, the requirement is the same: a stamp that is legible, durable and made correctly the first time.'],
            ['heading' => 'Enquiry-First, Not Assumption-First', 'body' => 'Every stamp is different — the wording, the layout, the size, the ink colour. Rather than listing fixed products with fixed turnaround promises, we treat each requirement as an enquiry: you tell us what the stamp needs to say and where it will be used, we confirm the layout with you, and then production begins. This keeps mistakes low and ensures the finished stamp matches exactly what you intended.'],
        ],
        'faqs' => [
            ['question' => 'Do you make both traditional and self-inking stamps?', 'answer' => 'Yes. We produce traditional wooden-handle stamps as well as self-inking stamps, depending on what suits your daily use.'],
            ['question' => 'Can I get a custom layout for my office stamp?', 'answer' => 'Yes. Share your requirement — the text, any logo or designation — and we will confirm the layout with you before production begins.'],
            ['question' => 'Do you supply date and numbering stamps for registers?', 'answer' => 'Yes, adjustable date stamps and numbering stamps are part of our regular work for offices, hotels and schools.'],
            ['question' => 'How do I place an order?', 'answer' => 'Call either of our numbers or visit us with your requirement. We will confirm the details with you before production.'],
            ['question' => 'Do you make personal name stamps?', 'answer' => 'Yes, we make name and designation stamps for individuals and professionals such as doctors and consultants.'],
            ['question' => 'Where is Shrinath Rubber Stamp located?', 'answer' => 'Use the Google Directions button on this page to find us and get accurate directions from your current location.'],
        ],
        'seo' => ['title' => 'Shrinath Rubber Stamp Jaisalmer | 40 Years of Stamp Craft', 'description' => 'Shrinath Rubber Stamp is a 40-year-old Jaisalmer business making traditional, self-inking, date and custom rubber stamps for offices, hotels, schools and shops.'],
    ],
    [
        'slug' => 'shrinath-enterprise',
        'name' => 'Shrinath Enterprise',
        'tagline' => 'Integrated Security, Communication and IT Solutions',
        'category' => 'Technology & Security',
        'summary' => 'CCTV, security systems, EPABX, boom barriers, PCs and technology supply for hotels, offices, institutions and residences in Jaisalmer.',
        'phone_numbers' => ['7727971536'],
        'google_business_url' => 'https://share.google/lH6ay5MYVfGftYNWk',
        'theme' => ['layoutVariant' => 'technical-grid', 'primary' => '#0f5fd6', 'secondary' => '#1f2733', 'accent' => '#f5a524', 'background' => '#f4f6fa', 'surface' => '#ffffff', 'text' => '#161c26', 'muted' => '#586374', 'onPrimary' => '#ffffff'],
        'services' => [
            ['title' => 'CCTV Surveillance', 'description' => 'Camera systems for premises monitoring, sized to the property and access points involved.', 'icon' => 'Camera'],
            ['title' => 'Security Systems', 'description' => 'Alarm and access-control components suited to hotels, offices and residences.', 'icon' => 'ShieldCheck'],
            ['title' => 'EPABX Communication', 'description' => 'Internal telephone exchange systems for multi-line offices and hospitality properties.', 'icon' => 'PhoneCall'],
            ['title' => 'Boom Barriers & Access Control', 'description' => 'Vehicle entry management for gated properties, hotels and institutional campuses.', 'icon' => 'ParkingSquare'],
            ['title' => 'PCs & Computers', 'description' => 'Desktop and workstation supply for office, front-desk and back-office use.', 'icon' => 'Monitor'],
            ['title' => 'Technology Supply', 'description' => 'General IT hardware sourcing and supply support for business and institutional buyers.', 'icon' => 'Cpu'],
            ['title' => 'Biometric Access Systems', 'description' => 'Biometric and card-based access control for staff and restricted areas.', 'icon' => 'ShieldCheck'],
            ['title' => 'Networking & Cabling', 'description' => 'Structured cabling and networking setup to support your other systems.', 'icon' => 'Wrench'],
        ],
        'highlights' => [
            'Single point of contact for security, communication and IT hardware',
            'Serves hotels, offices, institutions, residences and commercial properties',
            'Consultation-first approach to system planning',
            'Local Jaisalmer support',
        ],
        'sections' => [
            ['heading' => 'One Enquiry, Every System Covered', 'body' => 'Most properties end up dealing with separate vendors for cameras, phones, gate barriers and computers. Shrinath Enterprise brings CCTV, security systems, EPABX communication, boom barriers, PCs and general technology supply under one enquiry point, so property owners and administrators can plan their technical setup with a single conversation instead of several disconnected ones.'],
            ['heading' => 'Built for Hotels, Offices and Institutions', 'body' => 'Hotels need surveillance at entrances and common areas, an internal phone system between departments, and controlled vehicle access at the gate. Offices need CCTV, structured internal communication and reliable desktop hardware. Institutions and residential campuses need access control and monitoring at scale. We work across all of these settings, adapting the system mix to what the property actually needs rather than a one-size-fits-all package.'],
            ['heading' => 'How a System Planning Enquiry Works', 'body' => 'We start with a consultation to understand the property — its layout, entry points and current gaps. From there we discuss what supply and installation-enquiry options make sense, and outline a system plan you can evaluate before committing. This keeps the process transparent: you know what is being proposed and why, before any commitment is made.'],
        ],
        'faqs' => [
            ['question' => 'What kind of properties do you work with?', 'answer' => 'Hotels, offices, institutions, residences and commercial properties across Jaisalmer.'],
            ['question' => 'Do you handle CCTV and EPABX together?', 'answer' => 'Yes. We can discuss CCTV, security systems and EPABX communication as part of one consultation if your property needs more than one system.'],
            ['question' => 'Can you help with boom barriers for a gated property?', 'answer' => 'Yes, boom barriers and access control are part of our regular scope for hotels and institutional campuses.'],
            ['question' => 'Do you supply computers as well?', 'answer' => 'Yes, we supply PCs and computers along with general technology supply support.'],
            ['question' => 'How do I start a system planning enquiry?', 'answer' => 'Call us to arrange a consultation. We will discuss your property and outline a system plan before any commitment.'],
            ['question' => 'Can I visit your office?', 'answer' => 'Use the Google Directions button on this page for accurate directions to our location.'],
        ],
        'seo' => ['title' => 'Shrinath Enterprise Jaisalmer | CCTV, Security & IT Solutions', 'description' => 'Shrinath Enterprise supplies CCTV, security systems, EPABX, boom barriers and computer hardware for hotels, offices and institutions in Jaisalmer.'],
    ],
    [
        'slug' => 'shrinath-desert-camp',
        'name' => 'Shrinath Desert Camp',
        'tagline' => 'A Desert Camp Experience in the Heart of Jaisalmer',
        'category' => 'Hospitality',
        'summary' => 'Desert camp stays near Jaisalmer with tent accommodation, camel and jeep safaris, cultural evenings and desert dining.',
        'phone_numbers' => ['9694994943'],
        'email' => 'shrinathdesertcamp@gmail.com',
        'website_url' => 'https://shrinathdesertcamp.com/',
        'google_business_url' => 'https://share.google/xWyblhTKWwIWQkIah',
        'theme' => ['layoutVariant' => 'cinematic-desert', 'primary' => '#d9782e', 'secondary' => '#1b1533', 'accent' => '#f2c14e', 'background' => '#211a35', 'surface' => '#2a2145', 'text' => '#fbf3e6', 'muted' => 'rgba(251,243,230,.72)', 'onPrimary' => '#1b1533'],
        'services' => [
            ['title' => 'Desert Tents', 'description' => 'Comfortable tent accommodation set within the camp for an overnight desert stay.', 'icon' => 'Tent'],
            ['title' => 'Camel Safari', 'description' => 'Guided camel rides across the dunes, typically timed around sunset.', 'icon' => 'Footprints'],
            ['title' => 'Jeep Safari', 'description' => 'Open-terrain jeep rides through the surrounding desert landscape.', 'icon' => 'Car'],
            ['title' => 'Cultural Evening', 'description' => 'Rajasthani folk music and dance performances as part of the evening programme.', 'icon' => 'Music'],
            ['title' => 'Desert Dinner', 'description' => 'Dinner served at the camp as part of the overnight desert experience.', 'icon' => 'UtensilsCrossed'],
            ['title' => 'Stargazing', 'description' => 'Clear desert skies away from city lighting, part of the overnight camp atmosphere.', 'icon' => 'Stars'],
            ['title' => 'Campfire Evenings', 'description' => 'A bonfire as part of the evening programme, weather and season permitting.', 'icon' => 'Music'],
            ['title' => 'Sunset Point Visit', 'description' => 'A stop at a desert vantage point to watch the sunset before the evening programme.', 'icon' => 'Sunset'],
        ],
        'highlights' => [
            'Overnight desert camp stay near Jaisalmer',
            'Camel safari, jeep safari and cultural evening',
            'Suitable for couples, families and groups',
            'Direct enquiry and booking support',
        ],
        'sections' => [
            ['heading' => 'An Overnight Escape Into the Thar', 'body' => 'Shrinath Desert Camp offers a night in the desert without needing to plan every detail yourself — a tent to stay in, a camel or jeep ride across the dunes, a cultural evening, dinner, and a sky full of stars once the lights of the city are far behind. It is built for travellers who want to experience the Thar Desert directly rather than just pass through it.'],
            ['heading' => 'A Stay Suited to Different Travellers', 'body' => 'Couples looking for a quiet evening under the stars, families wanting a safe and comfortable introduction to desert travel, and groups of friends looking for a shared adventure all find a version of the experience that suits them at the camp. The core elements — tents, safari options, the evening programme and dinner — stay the same; how you experience them is up to you.'],
            ['heading' => 'Planning Your Visit', 'body' => 'For current availability, exact packages and pricing, the official Shrinath Desert Camp website and direct enquiry contacts are the best source of accurate, up-to-date information. This page is an introduction to the experience — for booking details, please reach out directly or visit the website.'],
        ],
        'faqs' => [
            ['question' => 'What is included in a stay at Shrinath Desert Camp?', 'answer' => 'A typical stay includes tent accommodation, a safari option, the evening cultural programme and dinner. Contact us directly to confirm current inclusions.'],
            ['question' => 'Do you offer both camel and jeep safaris?', 'answer' => 'Yes, both are offered as part of the desert experience.'],
            ['question' => 'Is the camp suitable for families?', 'answer' => 'Yes, the camp is suitable for couples, families and groups.'],
            ['question' => 'How do I check availability and pricing?', 'answer' => 'Contact us directly by phone, email or through the official website for current availability and pricing.'],
            ['question' => 'Is there a cultural programme in the evening?', 'answer' => 'Yes, a Rajasthani cultural evening with music and dance is part of the camp experience.'],
            ['question' => 'Where exactly is the camp located?', 'answer' => 'Use the Google Directions button on this page for accurate directions from your location.'],
        ],
        'seo' => ['title' => 'Shrinath Desert Camp | Desert Camp in Jaisalmer', 'description' => 'Shrinath Desert Camp offers desert tent stays near Jaisalmer with camel and jeep safaris, a cultural evening and desert dining under the stars.'],
    ],
    [
        'slug' => 'shrinath-adventures',
        'name' => 'Shrinath Adventures',
        'tagline' => 'Plan Rajasthan and India with Local Expertise',
        'category' => 'Travel & Experiences',
        'summary' => 'A Rajasthan and India tour planning service handling itineraries, hotel and camp coordination, transport and activities.',
        'phone_numbers' => ['7878656767'],
        'email' => 'shrinathadventures@gmail.com',
        'website_url' => 'https://shrinathadventures.com/',
        'google_business_url' => 'https://share.google/ikIm572RfHZazKSMk',
        'theme' => ['layoutVariant' => 'route-planner', 'primary' => '#1e3a8a', 'secondary' => '#7c3f22', 'accent' => '#c9a24b', 'background' => '#f7f3ea', 'surface' => '#ffffff', 'text' => '#20242e', 'muted' => '#5a5c6b', 'onPrimary' => '#ffffff'],
        'services' => [
            ['title' => 'Jaisalmer Planning', 'description' => 'Local itinerary planning for Jaisalmer’s fort, desert and heritage circuit.', 'icon' => 'MapPin'],
            ['title' => 'Jodhpur & Jaipur', 'description' => 'Trip coordination for the Blue City and the Pink City as part of a wider Rajasthan route.', 'icon' => 'Map'],
            ['title' => 'Udaipur & Beyond', 'description' => 'Extended Rajasthan planning including Udaipur and connecting destinations.', 'icon' => 'Compass'],
            ['title' => 'Pan-India Planning', 'description' => 'Broader India travel planning for travellers extending their trip beyond Rajasthan.', 'icon' => 'Globe'],
            ['title' => 'Hotel & Camp Coordination', 'description' => 'Coordinating stays across hotels and desert camps along your route.', 'icon' => 'BedDouble'],
            ['title' => 'Transport & Activity Assistance', 'description' => 'Helping arrange transport and activities that fit your itinerary and pace.', 'icon' => 'Route'],
            ['title' => 'Honeymoon Itineraries', 'description' => 'A quieter, more scenic route plan for couples travelling together.', 'icon' => 'Compass'],
            ['title' => 'Corporate & Group Travel', 'description' => 'Coordinated planning support for larger corporate or group trips.', 'icon' => 'Users'],
        ],
        'highlights' => [
            'Local Jaisalmer-based travel planning expertise',
            'Rajasthan and pan-India itinerary coordination',
            'Hotel, camp, transport and activity assistance',
            'Custom tours for couples, families and groups',
        ],
        'sections' => [
            ['heading' => 'Local Knowledge, Full-Trip Planning', 'body' => 'Shrinath Adventures plans trips across Jaisalmer, Jodhpur, Jaipur, Udaipur and wider Rajasthan, extending into pan-India travel when a trip calls for it. Being based in Jaisalmer means the planning starts with genuine local knowledge — not a generic route pulled from a brochure — and extends outward as your itinerary grows.'],
            ['heading' => 'A Simple Four-Step Process', 'body' => 'It starts with a conversation about where you want to go and what kind of trip you are looking for. From there we put together a draft itinerary, coordinate the hotels, camps and transport that fit it, and stay available to adjust things as your plans firm up. The result is a trip that is planned around you, not fitted into a fixed package.'],
            ['heading' => 'Built for Every Kind of Traveller', 'body' => 'Couples planning a quiet Rajasthan trip, families needing a comfortable and well-paced route, groups of friends wanting a shared adventure, and travellers who want a fully custom tour all work with the same planning process — adapted to what matters most for that trip.'],
        ],
        'faqs' => [
            ['question' => 'Which destinations do you plan trips for?', 'answer' => 'Jaisalmer, Jodhpur, Jaipur, Udaipur, wider Rajasthan, and pan-India trips when needed.'],
            ['question' => 'Can you coordinate hotels and desert camps together?', 'answer' => 'Yes, hotel and camp coordination is part of our regular planning support.'],
            ['question' => 'Do you help with transport between cities?', 'answer' => 'Yes, we assist with transport and activity planning as part of your itinerary.'],
            ['question' => 'Can you plan a custom trip instead of a fixed package?', 'answer' => 'Yes, our process is built around your requirements rather than a fixed package.'],
            ['question' => 'How do I start planning a trip?', 'answer' => 'Call, email or visit our website to begin a conversation about your travel plans.'],
            ['question' => 'Is Shrinath Adventures based in Jaisalmer?', 'answer' => 'Yes. Use the Google Directions button on this page to find our location.'],
        ],
        'seo' => ['title' => 'Shrinath Adventures | Rajasthan & India Tour Planner', 'description' => 'Shrinath Adventures plans Rajasthan and India trips — itineraries, hotel and camp coordination, transport and activities — from local Jaisalmer expertise.'],
    ],
    [
        'slug' => 'sam-sand-dunes-desert-camp-dmc',
        'name' => 'Sam Sand Dunes Desert Camp DMC',
        'tagline' => 'Jaisalmer B2B Desert Camp Support for Trade Partners',
        'category' => 'Travel & Experiences',
        'summary' => 'A Sam Sand Dunes desert-camp DMC for travel agents and group organisers, offering competitive B2B rates and trade-focused coordination.',
        'phone_numbers' => ['7891911536'],
        'email' => 'smasanddunesdmc@gmail.com',
        'website_url' => 'https://samsanddunesdesertsafari.com/',
        'google_business_url' => 'https://share.google/GPJwOC4Pq0ByWNaW4',
        'theme' => ['layoutVariant' => 'b2b-trade', 'primary' => '#0f766e', 'secondary' => '#3b2a1e', 'accent' => '#d8a24a', 'background' => '#f6f1e7', 'surface' => '#ffffff', 'text' => '#241f18', 'muted' => '#5a5245', 'onPrimary' => '#ffffff'],
        'services' => [
            ['title' => 'Camp Sourcing & Comparison', 'description' => 'Support comparing desert camp options at Sam Sand Dunes for your client group.', 'icon' => 'ClipboardList'],
            ['title' => 'Group Booking Coordination', 'description' => 'Handling room and tent allocation for group movements and series bookings.', 'icon' => 'Users'],
            ['title' => 'Desert Activity Coordination', 'description' => 'Arranging camel and jeep safari slots alongside camp stays for group itineraries.', 'icon' => 'Route'],
            ['title' => 'Trade Rate Support', 'description' => 'Competitive B2B rates structured for travel agents and DMC partners.', 'icon' => 'Handshake'],
            ['title' => 'Meal & Activity Planning', 'description' => 'Coordinating meal plans and activity requirements for group bookings.', 'icon' => 'UtensilsCrossed'],
            ['title' => 'Trade Enquiry Handling', 'description' => 'A dedicated enquiry process for agencies rather than individual travellers.', 'icon' => 'FileText'],
            ['title' => 'Series Booking Support', 'description' => 'Support for repeat or recurring group series across a season.', 'icon' => 'ClipboardList'],
            ['title' => 'On-Ground Coordination', 'description' => 'Local coordination on the ground for your group’s arrival and stay.', 'icon' => 'Route'],
        ],
        'highlights' => [
            'Dedicated B2B desert-camp DMC for Sam Sand Dunes',
            'Built for travel agents and group organisers',
            'Competitive B2B rates',
            'Structured group booking and activity coordination',
        ],
        'sections' => [
            ['heading' => 'A Trade Desk for Sam Sand Dunes', 'body' => 'Sam Sand Dunes Desert Camp DMC exists specifically for travel agents and group organisers who need reliable desert-camp coordination at Sam Sand Dunes without managing every property relationship themselves. It is a trade-facing operation — built around allocation, rates and group logistics rather than individual holiday planning.'],
            ['heading' => 'Competitive B2B Rates, Handled as a Trade Relationship', 'body' => 'Rates are structured for trade partners and quoted directly against your group’s dates, numbers and requirements — we describe them as competitive B2B rates rather than making an unverifiable “lowest rate” claim. What we can commit to is a straightforward trade enquiry process and clear communication on allocation and group requirements.'],
            ['heading' => 'How a Trade Enquiry Works', 'body' => 'Submit your group’s travel dates, guest count, room or tent requirement, and any meal or activity needs through the enquiry form below, or contact us directly. We will respond with camp options, rates and availability so you can confirm the booking with your client.'],
        ],
        'faqs' => [
            ['question' => 'Who is this service for?', 'answer' => 'Travel agents, tour operators and group organisers booking desert camps at Sam Sand Dunes on a trade basis.'],
            ['question' => 'Do you offer fixed lowest rates?', 'answer' => 'We offer competitive B2B rates quoted against your group’s specific dates and requirements rather than a fixed guaranteed rate.'],
            ['question' => 'Can you handle group bookings with mixed room and tent needs?', 'answer' => 'Yes, group booking and allocation coordination is a core part of what we do.'],
            ['question' => 'How do I submit a trade enquiry?', 'answer' => 'Use the B2B enquiry form on this page, or contact us directly by phone or email with your group details.'],
            ['question' => 'Do you coordinate desert activities as well as accommodation?', 'answer' => 'Yes, camel and jeep safari coordination can be arranged alongside camp stays for your group.'],
            ['question' => 'Is this suitable for individual travellers?', 'answer' => 'This desk is built for trade partners and group organisers. Individual travellers are better served by our consumer-facing camp and travel-planning ventures.'],
        ],
        'seo' => ['title' => 'Sam Sand Dunes Desert Camp DMC | Jaisalmer B2B Camp Support', 'description' => 'Sam Sand Dunes Desert Camp DMC provides B2B desert-camp sourcing, group booking coordination and competitive trade rates for travel agents in Jaisalmer.'],
    ],
    [
        'slug' => 'shrinath-hospitality',
        'name' => 'Shrinath Hospitality',
        'tagline' => 'Hotel Marketing & Management for Jaisalmer Properties',
        'category' => 'Hospitality',
        'summary' => 'Hotel marketing strategy, direct-enquiry support, OTA distribution and property management/marketing for hotels and resorts around Jaisalmer.',
        'phone_numbers' => ['7727971536'],
        'email' => 'shrinathhospitality@gmail.com',
        'theme' => ['layoutVariant' => 'portfolio-management', 'primary' => '#14532d', 'secondary' => '#3f3f2f', 'accent' => '#c9a45c', 'background' => '#faf7f0', 'surface' => '#ffffff', 'text' => '#1c1f1a', 'muted' => '#5b5f52', 'onPrimary' => '#ffffff'],
        'services' => [
            ['title' => 'Hotel Marketing Strategy', 'description' => 'Positioning and marketing direction for hotels and resorts working with us.', 'icon' => 'Megaphone'],
            ['title' => 'Website & Direct Enquiry Support', 'description' => 'Support for a property’s website presence and direct booking enquiry flow.', 'icon' => 'Globe'],
            ['title' => 'OTA Presence & Distribution', 'description' => 'Support maintaining a property’s presence and distribution across OTA channels.', 'icon' => 'LayoutGrid'],
            ['title' => 'Property Positioning & Content', 'description' => 'Positioning and content support so a property’s story is presented consistently.', 'icon' => 'FileText'],
            ['title' => 'Sales Coordination', 'description' => 'Coordination support for a property’s sales enquiries and conversion.', 'icon' => 'Handshake'],
            ['title' => 'Operational & Management Enquiry', 'description' => 'A discussion point for owners exploring management involvement, not a fixed package.', 'icon' => 'ClipboardCheck'],
            ['title' => 'Photography & Content Shoots', 'description' => 'Coordinating photography and content shoots for a property’s marketing needs.', 'icon' => 'Camera'],
            ['title' => 'Guest Experience Consulting', 'description' => 'Advisory input on the guest journey, from enquiry through to stay.', 'icon' => 'Handshake'],
        ],
        'highlights' => [
            'Marketing and management support for hotels around Jaisalmer',
            'Works with managed, marketed or associated properties',
            'Property onboarding for new hotel partners',
            'Separate support for shoot locations and long-stay properties',
        ],
        'sections' => [
            ['heading' => 'Marketing and Management Support for Hotel Owners', 'body' => 'Shrinath Hospitality works with hotel and resort owners on the marketing and management side of running a property — positioning, direct-enquiry support, OTA presence and sales coordination. The goal is straightforward: help a property be found, understood and booked, while giving the owner a single point of contact for that side of the business.'],
            ['heading' => 'Properties We Work With', 'body' => 'We currently work with Hotel Garh Adhiraj, KK Desert Camp & Resort, Lakhmana Desert Camp, Vijaybagh Resort, Hotel Elite Castle, Hotel Vasshifa and Hotel Narpat Garh Palace, in a managed, marketed or associated capacity depending on the specific relationship with each property.'],
            ['heading' => 'Add Your Hotel', 'body' => 'If you own or operate a hotel, resort or desert camp around Jaisalmer and are exploring marketing or management support, we welcome a conversation. Property onboarding starts with understanding your current setup and what kind of support would actually help — not a one-size-fits-all pitch.'],
            ['heading' => 'Properties for Shoots and Long Stays', 'body' => 'Separately from hotel management, we also help connect production teams and long-stay guests with suitable properties in our network for shoots, photography, film work and extended stays. If you have a location or duration requirement, share it with us through the enquiry form and we will check what is available.'],
        ],
        'faqs' => [
            ['question' => 'Do you own all the listed hotels?', 'answer' => 'No. The listed properties are managed, marketed or associated with Shrinath Hospitality — not all are under direct ownership.'],
            ['question' => 'How can I add my hotel to your portfolio?', 'answer' => 'Use the “Add Your Hotel” contact option on this page to start a conversation about property onboarding.'],
            ['question' => 'Do you help with OTA listings?', 'answer' => 'Yes, OTA presence and distribution support is part of our regular scope.'],
            ['question' => 'Can I book a property for a photo or film shoot?', 'answer' => 'Yes, use the shoot and long-stay enquiry option on this page to share your requirement.'],
            ['question' => 'Do you manage day-to-day hotel operations?', 'answer' => 'Operational and management involvement is discussed individually with each property — contact us to explore what applies to your situation.'],
            ['question' => 'How do I get in touch?', 'answer' => 'Call or email us using the contact details on this page.'],
        ],
        'seo' => ['title' => 'Shrinath Hospitality | Hotel Marketing & Management', 'description' => 'Shrinath Hospitality provides marketing, direct-enquiry, OTA distribution and management support for hotels and resorts around Jaisalmer.'],
    ],
    [
        'slug' => 'jaisalmer-adventures',
        'name' => 'Jaisalmer Adventures',
        'tagline' => 'Beyond the Crowds: Non-Touristic Desert Safaris',
        'category' => 'Travel & Experiences',
        'summary' => 'Offbeat, non-touristic desert safari experiences around Jaisalmer, away from the standard tourist dune circuit.',
        'phone_numbers' => ['9694994940'],
        'website_url' => 'https://jaisalmeradventures.com/',
        'google_business_url' => 'https://share.google/y3e6XciY7FJXaloCm',
        'theme' => ['layoutVariant' => 'offbeat-expedition', 'primary' => '#8a6a3f', 'secondary' => '#4a5233', 'accent' => '#c2b280', 'background' => '#141210', 'surface' => '#1f1c18', 'text' => '#f1ece0', 'muted' => 'rgba(241,236,224,.68)', 'onPrimary' => '#141210'],
        'services' => [
            ['title' => 'Camel Trail Routes', 'description' => 'Camel routes through quieter desert stretches away from the busiest dune areas.', 'icon' => 'Footprints'],
            ['title' => 'Offbeat Jeep Routes', 'description' => 'Jeep safaris through less-visited desert and village terrain.', 'icon' => 'Car'],
            ['title' => 'Village & Desert Landscapes', 'description' => 'Routes that pass through rural desert landscapes rather than tourist-only stops.', 'icon' => 'Mountain'],
            ['title' => 'Sunset Points', 'description' => 'Quieter vantage points for watching the desert sunset away from crowds.', 'icon' => 'Sunset'],
            ['title' => 'Stargazing', 'description' => 'Night-sky viewing away from ambient city and camp lighting.', 'icon' => 'Stars'],
            ['title' => 'Custom Route Enquiries', 'description' => 'Share what kind of experience you are looking for and we will discuss what fits.', 'icon' => 'Route'],
            ['title' => 'Photography Expeditions', 'description' => 'Routes and timing planned around light and landscape for photography-focused travellers.', 'icon' => 'Camera'],
            ['title' => 'Multi-Day Desert Treks', 'description' => 'Longer offbeat routes for travellers with more time to explore.', 'icon' => 'Footprints'],
        ],
        'highlights' => [
            'Non-touristic, offbeat desert safari focus',
            'Camel and jeep routes away from the standard circuit',
            'Responsible, low-impact approach to desert travel',
            'Suited to travellers who have already seen the standard dune experience',
        ],
        'sections' => [
            ['heading' => 'The Difference Between a Dune Visit and an Offbeat Safari', 'body' => 'Most Jaisalmer desert trips follow the same well-travelled dune circuit — the same viewpoint, the same crowd, the same photograph. Jaisalmer Adventures is built for travellers who want something else: quieter camel trails, jeep routes through village and desert landscapes, and sunset or stargazing spots that are not part of the standard tourist stop list.'],
            ['heading' => 'Responsible Travel in the Desert', 'body' => 'Offbeat travel comes with a responsibility to the land and the communities along the route. We plan routes with respect for local villages and the desert environment, and we do not promise access to private or restricted areas, or guaranteed wildlife sightings — what we do promise is a genuine attempt to show the desert as it actually is, away from the tourist script.'],
            ['heading' => 'Who This Is For', 'body' => 'This is best suited to travellers who have already experienced or want to skip the standard tourist dune visit, and are looking for a quieter, more exploratory desert experience. Basic physical preparedness for open-terrain travel is worth planning for — we can advise on what to expect once you get in touch.'],
        ],
        'faqs' => [
            ['question' => 'How is this different from a normal Jaisalmer desert safari?', 'answer' => 'We focus on offbeat camel and jeep routes away from the standard tourist dune circuit, rather than the most crowded viewpoints.'],
            ['question' => 'Can you guarantee we’ll see wildlife or reach restricted areas?', 'answer' => 'No. We do not promise guaranteed wildlife sightings or access to private or restricted areas — our focus is genuine, responsible offbeat routes.'],
            ['question' => 'Is this suitable for first-time desert visitors?', 'answer' => 'It can be, but it is especially suited to travellers looking for something beyond the standard tourist dune experience.'],
            ['question' => 'Do you offer both camel and jeep options?', 'answer' => 'Yes, both offbeat camel trails and jeep routes are available.'],
            ['question' => 'What should I prepare for?', 'answer' => 'Basic preparedness for open desert terrain is worth planning for. Contact us and we can advise based on your chosen route.'],
            ['question' => 'How do I get in touch to plan a route?', 'answer' => 'Call us or visit our website to discuss the kind of offbeat experience you are looking for.'],
        ],
        'seo' => ['title' => 'Jaisalmer Adventures | Non-Touristic Desert Safaris', 'description' => 'Jaisalmer Adventures offers offbeat, non-touristic desert safaris around Jaisalmer — quiet camel trails, jeep routes and responsible desert travel.'],
    ],
    [
        'slug' => 'my-jaisalmer',
        'name' => 'My Jaisalmer',
        'tagline' => 'Jaisalmer Yellow Pages & Local Business Directory',
        'category' => 'Local Digital Platforms',
        'summary' => 'A local business directory portal for Jaisalmer covering hotels, camps, restaurants, taxis, shopping, services and attractions.',
        'phone_numbers' => ['9549484949'],
        'email' => 'myjaisalmer@gmail.com',
        'website_url' => 'https://myjaisalmer.com/',
        'theme' => ['layoutVariant' => 'directory-portal', 'primary' => '#0b3d91', 'secondary' => '#0b3d91', 'accent' => '#f2b705', 'background' => '#ffffff', 'surface' => '#f7f8fb', 'text' => '#151a2e', 'muted' => '#565f78', 'onPrimary' => '#ffffff'],
        'services' => [
            ['title' => 'Hotels & Stays', 'description' => 'A directory category for hotels, resorts and camps around Jaisalmer.', 'icon' => 'BedDouble'],
            ['title' => 'Restaurants & Food', 'description' => 'Local eateries and dining options listed by category.', 'icon' => 'UtensilsCrossed'],
            ['title' => 'Taxis & Transport', 'description' => 'Local transport and taxi service listings for visitors and residents.', 'icon' => 'Car'],
            ['title' => 'Shopping', 'description' => 'Local shops and markets across Jaisalmer, organised by category.', 'icon' => 'ShoppingBag'],
            ['title' => 'Services', 'description' => 'Everyday local services relevant to residents and businesses.', 'icon' => 'Wrench'],
            ['title' => 'Attractions', 'description' => 'Local attractions and points of interest around the city.', 'icon' => 'Landmark'],
            ['title' => 'Health & Wellness', 'description' => 'Local clinics, wellness and everyday health-related services.', 'icon' => 'ShieldCheck'],
            ['title' => 'Events & Culture', 'description' => 'Local events and cultural happenings around Jaisalmer.', 'icon' => 'Music'],
        ],
        'highlights' => [
            'A dedicated local directory for Jaisalmer',
            'Organised by category: hotels, camps, restaurants, taxis, shopping, services and attractions',
            'Built for residents, visitors and local businesses alike',
            'Business listing enquiries welcomed',
        ],
        'sections' => [
            ['heading' => 'A Local Directory Built for Jaisalmer', 'body' => 'My Jaisalmer is a local Yellow Pages-style directory bringing together hotels, camps, restaurants, taxis, shops, services and attractions in one place. Instead of searching separately for each category, visitors and residents can use My Jaisalmer as a starting point for finding what the city has to offer.'],
            ['heading' => 'Useful for Residents, Visitors and Local Businesses', 'body' => 'Residents get a quick reference for everyday local services. Visitors get a simpler way to explore the city’s hotels, dining and attractions beyond the most obvious tourist listings. Local businesses get a channel to be discoverable to both audiences without building their own directory presence from scratch.'],
            ['heading' => 'Add Your Business', 'body' => 'If you run a business in Jaisalmer and want to be listed, reach out through the contact details on this page. We will walk you through the listing-enquiry process and what information is needed to get your business included in the relevant category.'],
        ],
        'faqs' => [
            ['question' => 'What categories does My Jaisalmer cover?', 'answer' => 'Hotels, camps, restaurants, taxis, shopping, services and attractions, among other local categories.'],
            ['question' => 'How do I list my business?', 'answer' => 'Use the “Add Your Business” contact option on this page to start a listing enquiry.'],
            ['question' => 'Is My Jaisalmer free to use for visitors?', 'answer' => 'Yes, the directory is intended as a free reference for visitors and residents browsing local listings.'],
            ['question' => 'Does My Jaisalmer show reviews or ratings?', 'answer' => 'Please check the website directly for current listing details — this page is an introduction to the platform rather than a live listing feed.'],
            ['question' => 'Can taxi and transport services be listed?', 'answer' => 'Yes, taxis and local transport is one of the directory categories.'],
            ['question' => 'How do I contact My Jaisalmer directly?', 'answer' => 'Call, email or visit the website using the contact options on this page.'],
        ],
        'seo' => ['title' => 'My Jaisalmer | Jaisalmer Yellow Pages & Business Directory', 'description' => 'My Jaisalmer is a local business directory covering hotels, camps, restaurants, taxis, shopping, services and attractions across Jaisalmer.'],
    ],
    [
        'slug' => 'welcome-to-jaisalmer',
        'name' => 'Welcome to Jaisalmer',
        'tagline' => 'Your Jaisalmer Travel Guide',
        'category' => 'Local Digital Platforms',
        'summary' => 'A Jaisalmer travel guide and destination-information portal covering attractions, itineraries, desert experiences and hotels.',
        'phone_numbers' => ['9549484949'],
        'email' => 'shrinathhospitality@gmail.com',
        'website_url' => 'https://welcometojaisalmer.com/',
        'theme' => ['layoutVariant' => 'editorial-guide', 'primary' => '#8a1c1c', 'secondary' => '#c9a24b', 'accent' => '#1e2a5e', 'background' => '#fbf7ee', 'surface' => '#ffffff', 'text' => '#241a12', 'muted' => '#5c4d3c', 'onPrimary' => '#fbf7ee'],
        'services' => [
            ['title' => 'Attractions Guide', 'description' => 'Editorial coverage of Jaisalmer’s fort, havelis and heritage sites.', 'icon' => 'Landmark'],
            ['title' => 'Itineraries', 'description' => 'Suggested ways to plan time in and around Jaisalmer.', 'icon' => 'Map'],
            ['title' => 'Desert Experiences', 'description' => 'An overview of the desert camp and safari experiences available around the city.', 'icon' => 'Tent'],
            ['title' => 'Hotels & Camps', 'description' => 'Guide-style coverage of accommodation options in Jaisalmer.', 'icon' => 'BedDouble'],
            ['title' => 'Travel Tips', 'description' => 'Practical guidance for planning a Jaisalmer visit.', 'icon' => 'Lightbulb'],
            ['title' => 'Local Updates', 'description' => 'General information relevant to travellers visiting the destination.', 'icon' => 'Newspaper'],
            ['title' => 'Food & Culture', 'description' => 'An introduction to Jaisalmer’s local food and cultural traditions worth knowing before you visit.', 'icon' => 'UtensilsCrossed'],
            ['title' => 'Getting Around', 'description' => 'Practical guidance on getting to and moving around Jaisalmer during your stay.', 'icon' => 'Car'],
        ],
        'highlights' => [
            'A destination guide dedicated to Jaisalmer',
            'Covers attractions, itineraries, desert experiences and stays',
            'Written for first-time visitors, families, couples and planners',
            'Links through to the full guide on the official website',
        ],
        'sections' => [
            ['heading' => 'A Guide for Getting Jaisalmer Right the First Time', 'body' => 'Welcome to Jaisalmer is a travel-guide platform built around one goal: helping visitors plan a Jaisalmer trip well, from the fort and old city to the desert beyond it. It brings together attractions, itineraries, desert-experience overviews and accommodation guidance in one editorial destination guide.'],
            ['heading' => 'Who the Guide Is For', 'body' => 'First-time visitors get an orientation to what Jaisalmer offers and how to plan around it. Families get practical guidance suited to travelling with children. Couples get suggestions for a quieter, more scenic pace. Travel planners and agents get a reliable reference point when putting together a Jaisalmer leg of a larger trip.'],
            ['heading' => 'Plan Your Jaisalmer Visit', 'body' => 'This page is an introduction to the guide — for the full destination content, itinerary detail and latest travel information, visit the official Welcome to Jaisalmer website linked on this page.'],
        ],
        'faqs' => [
            ['question' => 'What does Welcome to Jaisalmer cover?', 'answer' => 'Attractions, itineraries, desert experiences, hotel and camp guidance, and general travel tips for visiting Jaisalmer.'],
            ['question' => 'Is this a booking platform?', 'answer' => 'No, it is a travel-guide and information portal. For bookings, visit the relevant venture or property directly.'],
            ['question' => 'Is the guide useful for first-time visitors?', 'answer' => 'Yes, it is written with first-time visitors, families, couples and travel planners in mind.'],
            ['question' => 'Where can I read the full guide content?', 'answer' => 'Visit the official Welcome to Jaisalmer website using the link on this page.'],
            ['question' => 'How do I contact Welcome to Jaisalmer directly?', 'answer' => 'Call or email using the contact details on this page.'],
            ['question' => 'Does the guide cover desert camp experiences?', 'answer' => 'Yes, an overview of desert experiences around Jaisalmer is part of the guide.'],
        ],
        'seo' => ['title' => 'Welcome to Jaisalmer | Jaisalmer Travel Guide', 'description' => 'Welcome to Jaisalmer is a destination travel guide covering attractions, itineraries, desert experiences and hotels for visitors planning a Jaisalmer trip.'],
    ],
];

$created = 0;
$skipped = 0;
$seoMigrated = 0;
$conflicts = [];

foreach ($ventures as $i => $v) {
    if (venture_slug_taken($pdo, $v['slug'], null)) {
        $skipped++;
        continue;
    }

    $pdo->beginTransaction();
    try {
        $data = [
            'name' => $v['name'],
            'slug' => $v['slug'],
            'tagline' => $v['tagline'],
            'category' => $v['category'],
            'summary' => $v['summary'],
            'status' => 'published',
            'sort_order' => $i,
            'layout_variant' => $v['theme']['layoutVariant'],
            'primary_color' => $v['theme']['primary'],
            'secondary_color' => $v['theme']['secondary'],
            'accent_color' => $v['theme']['accent'],
            'background_color' => $v['theme']['background'],
            'surface_color' => $v['theme']['surface'],
            'text_color' => $v['theme']['text'],
            'muted_color' => $v['theme']['muted'],
            'on_primary_color' => $v['theme']['onPrimary'],
            'phone_numbers' => $v['phone_numbers'],
            'email' => $v['email'] ?? null,
            'website_url' => $v['website_url'] ?? null,
            'google_business_url' => $v['google_business_url'] ?? null,
            'published_at' => date('Y-m-d H:i:s'),
        ];
        $id = create_venture($pdo, $data, $adminId ?? 0);
        save_venture_services($pdo, $id, $v['services']);
        save_venture_highlights($pdo, $id, $v['highlights']);
        save_venture_sections($pdo, $id, $v['sections']);
        save_faqs($pdo, 'venture', $id, $v['faqs']);

        // --- Migrate the existing seo_meta row (old route-only association) to the new real
        // content association, preserving score/keyphrase/history exactly as-is. ---
        $key = venture_key_for_slug($v['slug']);
        $docStmt = $pdo->prepare('SELECT id FROM seo_documents WHERE document_key = :k LIMIT 1');
        $docStmt->execute(['k' => $key]);
        $documentId = $docStmt->fetchColumn();

        if ($documentId) {
            $pdo->prepare('UPDATE seo_documents SET content_id = :cid, source_type = \'database\' WHERE id = :doc')
                ->execute(['cid' => $id, 'doc' => (int) $documentId]);

            $metaStmt = $pdo->prepare("SELECT id FROM seo_meta WHERE entity_type = 'seo_document' AND entity_id = :doc LIMIT 1");
            $metaStmt->execute(['doc' => (int) $documentId]);
            $metaId = $metaStmt->fetchColumn();
            if ($metaId) {
                $pdo->prepare('UPDATE seo_meta SET entity_type = \'venture\', entity_id = :vid WHERE id = :mid')
                    ->execute(['vid' => $id, 'mid' => (int) $metaId]);
                $seoMigrated++;
            }

            $analysisStmt = $pdo->prepare("SELECT id FROM seo_content_analysis WHERE content_type = 'venture' AND content_id = :doc LIMIT 1");
            $analysisStmt->execute(['doc' => (int) $documentId]);
            $analysisId = $analysisStmt->fetchColumn();
            if ($analysisId) {
                $pdo->prepare('UPDATE seo_content_analysis SET content_id = :vid WHERE id = :aid')
                    ->execute(['vid' => $id, 'aid' => (int) $analysisId]);
            }
        }

        // Fresh SEO title/description only if nothing was preserved above (spec: never
        // overwrite an existing value silently) — checked after the migration attempt.
        $currentSeo = get_seo_meta($pdo, 'venture', $id);
        if (!$currentSeo || empty($currentSeo['meta_title'])) {
            save_seo_meta($pdo, 'venture', $id, array_merge($currentSeo ?? [], [
                'meta_title' => $v['seo']['title'],
                'meta_description' => $v['seo']['description'],
                'canonical_url' => 'https://shrinathsolutions.com/our-ventures/' . $v['slug'],
            ]));
        }

        $pdo->commit();
        $created++;
        echo "Created venture #{$id} ({$v['slug']})" . ($documentId ? " — seo_meta migrated from seo_documents #{$documentId}" : ' — no prior seo_documents row found') . "\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "FAILED for {$v['slug']}: " . $e->getMessage() . "\n");
        $conflicts[] = $v['slug'];
    }
}

echo "\nDone. created={$created} skipped={$skipped} seo_meta_migrated={$seoMigrated} failed=" . count($conflicts) . "\n";
if ($conflicts) {
    echo "Failed slugs: " . implode(', ', $conflicts) . "\n";
}
