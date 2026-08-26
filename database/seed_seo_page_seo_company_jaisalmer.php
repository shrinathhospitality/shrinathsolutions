<?php
// CLI-only. Idempotent: adds the "SEO Company in Jaisalmer" SEO landing page, transcribed
// verbatim from the content supplied by the client. Safe to re-run — skips if the slug
// already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/SeoPage.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

$slug = 'seo-company-jaisalmer';

if (seo_page_slug_taken($pdo, $slug, null)) {
    echo "Skipping $slug — already exists.\n";
    exit(0);
}

$contentSections = [
    [
        'kind' => 'paras',
        'heading' => 'Professional SEO Services in Jaisalmer',
        'items' => [
            "Search Engine Optimization is the process of improving a website so that search engines can understand its content and show it for relevant searches. As an experienced SEO agency in Jaisalmer, Shrinath Solutions provides complete on-page, off-page, technical and local SEO solutions.",
            "We do not use the same strategy for every business. A hotel needs to attract travellers searching for accommodation, while a taxi company needs visibility for local routes and transport-related searches. Before starting the work, we understand your business, target customers, services, competition and preferred locations.",
        ],
    ],
    [
        'kind' => 'ticks',
        'heading' => 'Our SEO services include',
        'items' => [
            'Complete website SEO audit',
            'Keyword research and competitor analysis',
            'On-page SEO optimization',
            'Technical SEO improvements',
            'Local SEO and Google Maps optimization',
            'Google Business Profile optimization',
            'SEO content writing',
            'Internal linking improvement',
            'Local citation building',
            'Ethical link-building strategies',
            'Image and page-speed optimization',
            'Monthly ranking and performance reports',
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => 'Why Your Business Needs SEO',
        'items' => [
            "Most customers now search online before contacting a hotel, tour operator, restaurant or service provider. If your website does not appear on the first page for relevant searches, those customers are likely to contact a competitor.",
            "Paid advertisements can generate quick traffic, but the traffic normally stops when the advertising budget ends. SEO is a long-term digital marketing strategy that can continue bringing relevant visitors through organic search results. A properly optimized website also builds trust because customers often consider businesses appearing prominently on Google to be more established and reliable.",
        ],
    ],
    [
        'kind' => 'ticks',
        'heading' => 'What SEO can do for your business',
        'body' => 'Our affordable SEO services in Jaisalmer can help your business:',
        'items' => [
            'Improve visibility on Google',
            'Reach customers actively searching for your services',
            'Generate more calls and WhatsApp enquiries',
            'Increase relevant website traffic',
            'Strengthen your local presence',
            'Build brand credibility',
            'Reduce long-term dependence on paid advertising',
            'Compete with established businesses',
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => 'Local SEO Company in Jaisalmer',
        'items' => [
            "Local SEO is especially important for businesses serving customers in a particular city or area. Shrinath Solutions provides local SEO services in Jaisalmer to help businesses appear in location-based search results and Google Maps.",
            "We optimize your Google Business Profile with the correct business category, description, services, contact details, website link, photos and local keywords. We also review the consistency of your business name, address and phone number across online platforms.",
            "Our local SEO strategy may include location-focused landing pages, Google Business Profile posts, review-management guidance, local business citations and area-specific content. These improvements make it easier for nearby customers and tourists planning their Jaisalmer trip to discover your business.",
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => 'SEO for Hotels and Tourism Businesses',
        'items' => [
            "Jaisalmer is a highly competitive tourism destination. Hotels, resorts, desert camps, travel agencies and taxi companies compete for many of the same customers. Generic website content is rarely enough to achieve strong visibility in this market.",
            "Shrinath Solutions specializes in online hotel marketing and tourism SEO. We research how travellers search for rooms, desert experiences, sightseeing tours, taxi services and holiday packages. We then create dedicated pages around relevant search intent rather than forcing unrelated keywords onto one page.",
        ],
    ],
    [
        'kind' => 'ticks',
        'heading' => 'Our hotel SEO services can target searches related to',
        'items' => [
            'Hotels in Jaisalmer',
            'Desert camps in Jaisalmer',
            'Resorts near Sam Sand Dunes',
            'Jaisalmer tour packages',
            'Camel and jeep safari',
            'Taxi services in Jaisalmer',
            'Jaisalmer sightseeing tours',
            'Rajasthan holiday packages',
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => '',
        'items' => [
            'We can also improve room pages, package descriptions, activity pages, blog content and destination guides. The goal is not simply to attract more visitors but to attract people who are genuinely interested in booking or making an enquiry.',
        ],
    ],
    [
        'kind' => 'steps',
        'heading' => 'Our SEO Work Process',
        'items' => [
            ['num' => '01', 'title' => 'Website and Competitor Analysis', 'body' => "We begin by checking your website's content, speed, mobile usability, page structure, indexing status and technical issues. We also study your competitors to understand which keywords and pages are helping them gain visibility."],
            ['num' => '02', 'title' => 'Keyword Research', 'body' => 'We identify primary keywords, supporting keywords, long-tail searches and local search terms relevant to your services. Every important keyword is mapped to the most suitable page to reduce keyword cannibalization.'],
            ['num' => '03', 'title' => 'On-Page and Technical SEO', 'body' => 'We optimize page titles, meta descriptions, headings, URLs, images, content and internal links. Technical issues affecting crawling, indexing, mobile performance or page speed are also identified and corrected wherever possible.'],
            ['num' => '04', 'title' => 'Content Optimization', 'body' => 'Our team creates useful and original content based on what customers want to know. This can include service pages, location pages, blogs, FAQs, tour itineraries and hotel descriptions.'],
            ['num' => '05', 'title' => 'Local SEO and Authority Building', 'body' => 'We improve local signals through Google Business Profile optimization, relevant citations and quality link-building activities. We focus on sustainable methods instead of spammy shortcuts.'],
            ['num' => '06', 'title' => 'Monitoring and Reporting', 'body' => 'SEO performance is monitored using rankings, website traffic, search visibility, calls and enquiries. Regular reports help you understand completed work and future opportunities.'],
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => 'Why Choose Shrinath Solutions?',
        'items' => [
            "Shrinath Solutions understands both technology and the local Jaisalmer market. Our experience with hospitality, travel and local-service businesses enables us to create strategies based on real customer searches.",
            "We focus on clear communication, practical recommendations and ethical SEO practices. We do not promise overnight rankings because SEO results depend on competition, website condition, content quality and search-engine updates. Instead, we work toward measurable and sustainable improvement.",
        ],
    ],
    [
        'kind' => 'ticks',
        'heading' => 'What you receive',
        'body' => 'With Shrinath Solutions, you receive:',
        'items' => [
            'Customized SEO strategy',
            'Local-market understanding',
            'Hospitality and tourism expertise',
            'Transparent reporting',
            'Mobile and SEO-friendly optimization',
            'Original keyword-focused content',
            'Dedicated support',
            'Flexible SEO packages',
        ],
    ],
    [
        'kind' => 'paras',
        'heading' => 'Customized SEO Packages in Jaisalmer',
        'items' => [
            "Every business has different requirements. A newly launched website may need technical corrections, service pages and local SEO setup, while an established hotel may require content expansion, competitor research and reputation improvement.",
            "We therefore offer customized monthly SEO packages based on your website size, targeted locations, industry competition and business goals. After reviewing your website, our SEO team will recommend a suitable plan without adding unnecessary services.",
        ],
    ],
];

$faqs = [
    ['How long does SEO take to show results?', 'Initial improvements may appear within a few weeks, but meaningful results often require three to six months. The exact period depends on competition, website history and the amount of optimization required.'],
    ['Can SEO help a local business in Jaisalmer?', 'Yes. Local SEO can help hotels, camps, taxi companies, restaurants and service providers appear for relevant searches in Jaisalmer and nearby areas.'],
    ['Do you optimize Google Business Profiles?', 'Yes. We provide Google Business Profile optimization, local keyword targeting, listing improvement and Google Maps SEO guidance.'],
    ['Do you provide SEO services for hotels?', 'Yes. Hotel SEO, desert camp marketing, travel website optimization and direct-enquiry growth are among our key services.'],
    ['Can you guarantee the first position on Google?', 'No genuine SEO company can guarantee a fixed ranking. We follow approved practices and focus on improving visibility, traffic quality and enquiries over time.'],
    ['Do you also write SEO content?', 'Yes. We create service-page content, location pages, blogs, FAQs, hotel descriptions and tourism-related content based on keyword research.'],
];

$pdo->beginTransaction();
try {
    $id = create_seo_page($pdo, [
        'title' => 'SEO Company in Jaisalmer',
        'slug' => $slug,
        'primary_keyword' => 'SEO company in Jaisalmer',
        'search_intent' => 'Commercial investigation / service enquiry',
        'target_location' => 'Jaisalmer',
        'h1' => 'SEO Company in Jaisalmer',
        'hero_content' => "Want more customers to find your business on Google? Shrinath Solutions is a professional SEO company in Jaisalmer helping hotels, desert camps, travel agencies, taxi operators, restaurants and local businesses improve their online visibility. We create practical SEO strategies that help your website reach the right audience, generate enquiries and build long-term digital growth.\n\nHaving a website is not enough if potential customers cannot find it. When people search for services such as \xE2\x80\x9Cbest hotel in Jaisalmer,\xE2\x80\x9D \xE2\x80\x9Cdesert camp in Jaisalmer,\xE2\x80\x9D \xE2\x80\x9Ctaxi service in Jaisalmer\xE2\x80\x9D or \xE2\x80\x9Cwebsite designer in Jaisalmer,\xE2\x80\x9D your business should appear prominently in the search results. Our SEO services in Jaisalmer focus on improving your website's structure, content, local presence and overall search performance.",
        'content_sections' => $contentSections,
        'cta_heading' => 'Grow Your Business with a Trusted SEO Agency',
        'cta_body' => 'If your website is not generating enough traffic, calls or enquiries, it is time to improve its search presence. Partner with Shrinath Solutions, a trusted SEO company in Jaisalmer, for a strategy designed around your business and customers. Contact us today for a website SEO audit and customized quotation.',
        'status' => 'published',
    ], $adminId);

    $seoError = save_seo_meta($pdo, 'seo_page', $id, [
        'meta_title' => 'SEO Company in Jaisalmer | Shrinath Solutions',
        'meta_description' => 'Grow your business with Shrinath Solutions, a trusted SEO company in Jaisalmer offering local SEO, Google Maps SEO, website audits and content marketing.',
        'robots_index' => true,
        'robots_follow' => true,
    ]);
    if ($seoError) {
        throw new RuntimeException($seoError);
    }

    save_faqs($pdo, 'seo_page', $id, array_map(fn($f) => ['question' => $f[0], 'answer' => $f[1]], $faqs));

    $pdo->commit();
    echo "Created seo_pages id=$id at slug=$slug\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Failed: ' . $e->getMessage() . "\n");
    exit(1);
}
