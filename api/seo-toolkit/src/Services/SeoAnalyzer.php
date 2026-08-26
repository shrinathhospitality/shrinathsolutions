<?php

declare(strict_types=1);

namespace App\Services;

use App\Security\UrlValidator;
use App\Support\ApiException;
use App\Support\Logger;

/**
 * PHP port of server/src/utils/seoAnalyzer.ts — single-page synchronous
 * analysis (fetch → parse → score → recommend), same as the Node version.
 * No multi-page crawl, no Puppeteer/JS rendering (Node never had either).
 */
final class SeoAnalyzer
{
    public function __construct(
        private readonly HttpFetcher $fetcher,
        private readonly string $pageSpeedApiKey = '',
    ) {
    }

    /** @return array<string, mixed> shaped like the TS AnalysisResult interface */
    public function analyze(string $rawUrl): array
    {
        UrlValidator::validate($rawUrl);

        $fetched = $this->fetcher->fetchHtml($rawUrl);
        return $this->analyzeFetched($rawUrl, $fetched);
    }

    /**
     * Test-only entry point used by tests/fixture-test.php to compare
     * scoring output against the legacy Node analyzer without going through
     * HttpFetcher/SsrfProtection (which correctly refuses to fetch from
     * localhost). Not called from any controller/route.
     *
     * @return array<string, mixed>
     */
    public function analyzeFromHtmlForTesting(string $html, string $url): array
    {
        $fetched = ['html' => $html, 'statusCode' => 200, 'headers' => [], 'finalUrl' => $url, 'redirectChain' => [], 'fetchTimeMs' => 0.0, 'contentType' => 'text/html'];
        return $this->analyzeFetched($url, $fetched);
    }

    /** @param array{html:string,statusCode:int,headers:array<string,string>,finalUrl:string,redirectChain:list<string>,fetchTimeMs:float,contentType:string} $fetched @return array<string, mixed> */
    private function analyzeFetched(string $rawUrl, array $fetched): array
    {
        $parser = new HtmlParser($fetched['html']);
        $domain = (string) parse_url($rawUrl, PHP_URL_HOST);

        $metrics = $this->extractMetrics($parser, $rawUrl, $fetched);
        $keywords = ScoreCalculator::keywordDensity($parser->bodyText());

        $onPage = ScoreCalculator::headingScore($metrics['headings']) * 0.4
            + ScoreCalculator::imageScore($metrics['images']) * 0.3;

        $scoreBreakdown = [
            'technical' => ScoreCalculator::technicalScore($metrics['technical']),
            'onPage' => $onPage,
            'performance' => $metrics['performance']['performance'],
            'mobile' => $metrics['mobile']['score'],
            'security' => ScoreCalculator::securityScore($metrics['security']),
            'accessibility' => $metrics['performance']['accessibility'],
            'overall' => 0,
        ];
        $scoreBreakdown['overall'] = (int) round((
            $scoreBreakdown['technical'] + $scoreBreakdown['onPage'] + $scoreBreakdown['performance']
            + $scoreBreakdown['mobile'] + $scoreBreakdown['security'] + $scoreBreakdown['accessibility']
        ) / 6);

        $recommendations = $this->buildRecommendations($metrics);
        $seoInsights = $this->buildSeoInsights($recommendations, $scoreBreakdown, $metrics);

        return [
            'url' => $rawUrl,
            'domain' => $domain,
            'score' => $scoreBreakdown['overall'],
            'scoreBreakdown' => $scoreBreakdown,
            'metrics' => $metrics,
            'keywords' => $keywords,
            'recommendations' => $recommendations,
            'seoInsights' => $seoInsights,
            'analyzedAt' => date('c'),
            // Rendering-mode disclosure (spec §6). Node never rendered JS
            // either — both versions use raw server-returned HTML.
            'rendering' => [
                'renderingMode' => 'standard',
                'javascriptRenderingAvailable' => false,
                'javascriptRenderingUsed' => false,
                'renderingLimitations' => 'Analysis uses the raw server-returned HTML (cURL + DOMDocument). '
                    . 'Content injected client-side by JavaScript after page load is not captured. '
                    . 'This matches the original tool\'s behaviour, which also never executed JavaScript.',
                'warning' => $this->possibleJsHeavyPageWarning($parser),
            ],
        ];
    }

    private function possibleJsHeavyPageWarning(HtmlParser $parser): ?string
    {
        $textLength = mb_strlen($parser->bodyText());
        $scriptCount = $parser->xpathCount('//script[@src]');

        if ($textLength < 200 && $scriptCount >= 3) {
            return 'This page returned very little text content but references several JavaScript bundles. '
                . 'It may rely on client-side rendering — results here reflect only the initial HTML.';
        }
        return null;
    }

    /** @param array{html:string,statusCode:int,headers:array<string,string>,finalUrl:string,redirectChain:list<string>,fetchTimeMs:float,contentType:string} $fetched */
    private function extractMetrics(HtmlParser $parser, string $url, array $fetched): array
    {
        $parsedHost = (string) parse_url($url, PHP_URL_HOST);
        $isHttps = strtolower((string) parse_url($url, PHP_URL_SCHEME)) === 'https';

        $meta = $parser->extractMeta();
        $meta['status'] = ScoreCalculator::metaStatus($meta);

        $headings = $parser->extractHeadings();
        $images = $parser->extractImages();
        $linkCounts = $parser->extractLinkCounts($parsedHost);
        $links = [
            'internalLinks' => $linkCounts['internalLinks'],
            'externalLinks' => $linkCounts['externalLinks'],
            'brokenLinks' => 0,
            'redirectChains' => count($fetched['redirectChain']),
        ];

        // Security headers — reuses the headers already captured by the main
        // fetch instead of issuing a second identical request (Node's
        // extractSecurityHeaders() re-fetched the page; functionally
        // equivalent here since it's the same URL/response).
        $headerPresence = [
            'X-Frame-Options' => isset($fetched['headers']['x-frame-options']),
            'Content-Security-Policy' => isset($fetched['headers']['content-security-policy']),
            'Strict-Transport-Security' => isset($fetched['headers']['strict-transport-security']),
        ];
        $security = ScoreCalculator::securityCheck($isHttps, $headerPresence);

        $securityHeadersOk = $headerPresence['Content-Security-Policy']
            && $headerPresence['X-Frame-Options']
            && $headerPresence['Strict-Transport-Security'];

        [$sitemap, $robotsTxt] = [
            $this->fetcher->resourceExists($url, '/sitemap.xml'),
            $this->fetcher->resourceExists($url, '/robots.txt'),
        ];

        $canonicalPresent = $meta['canonical'] !== '';
        $hasJsonLd = $parser->hasJsonLd();
        $hasMicrodata = $parser->hasMicrodata();
        $structuredData = $hasJsonLd || $hasMicrodata;

        $og = $parser->openGraphTags();
        $openGraph = $og['title'] && $og['description'] && $og['image'];
        $twitterCard = $parser->hasTwitterCard();

        $technical = [
            'https' => $isHttps,
            'sitemap' => $sitemap,
            'robotsTxt' => $robotsTxt,
            'canonical' => $canonicalPresent,
            'structuredData' => $structuredData,
            'openGraph' => $openGraph,
            'twitterCard' => $twitterCard,
            'securityHeaders' => $securityHeadersOk,
            'score' => 0,
            'status' => 'pass',
            'checks' => [
                'https' => $isHttps,
                'sitemap' => $sitemap,
                'robots' => $robotsTxt,
                'canonical' => $canonicalPresent,
                'structuredData' => $structuredData,
                'openGraph' => $openGraph,
                'twitterCards' => $twitterCard,
                'securityHeaders' => $securityHeadersOk,
            ],
        ];
        $technical['score'] = ScoreCalculator::technicalScore($technical);
        $technical['status'] = $technical['score'] < 50 ? 'fail' : ($technical['score'] < 80 ? 'warning' : 'pass');

        $performance = $this->fetchPerformanceAndAccessibility($url, $parser, $fetched['fetchTimeMs']);
        $mobile = ScoreCalculator::mobileOptimization($parser, $performance['performance']);

        return [
            'meta' => $meta,
            'headings' => $headings,
            'images' => $images,
            'links' => $links,
            'technical' => $technical,
            'security' => $security,
            'mobile' => $mobile,
            'performance' => $performance,
        ];
    }

    /** @return array{performance:int,accessibility:int,bestPractices:int,seo:int,status:string} */
    private function fetchPerformanceAndAccessibility(string $url, HtmlParser $parser, float $fetchTimeMs): array
    {
        if ($this->pageSpeedApiKey !== '') {
            try {
                $result = $this->callPageSpeedApi($url);
                if ($result !== null) {
                    return $result;
                }
            } catch (\Throwable $e) {
                Logger::warning('PageSpeed API call failed, falling back to HTML heuristics', ['error' => $e->getMessage()]);
            }
        }

        return ScoreCalculator::heuristicPerformanceAndAccessibility($parser, $fetchTimeMs);
    }

    /** @return array{performance:int,accessibility:int,bestPractices:int,seo:int,status:string}|null */
    private function callPageSpeedApi(string $url): ?array
    {
        $apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?'
            . http_build_query([
                'url' => $url,
                'key' => $this->pageSpeedApiKey,
                'strategy' => 'mobile',
            ]) . '&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO';

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $errNo = curl_errno($ch);
        curl_close($ch);

        if ($body === false || $errNo !== 0) {
            return null;
        }

        $data = json_decode((string) $body, true);
        $cats = $data['lighthouseResult']['categories'] ?? null;
        if (!is_array($cats)) {
            return null;
        }

        $perf = (int) round((($cats['performance']['score'] ?? 0)) * 100);
        $a11y = (int) round((($cats['accessibility']['score'] ?? 0)) * 100);
        $bp = (int) round((($cats['best-practices']['score'] ?? 0)) * 100);
        $seo = (int) round((($cats['seo']['score'] ?? 0)) * 100);

        return [
            'performance' => $perf,
            'accessibility' => $a11y,
            'bestPractices' => $bp,
            'seo' => $seo,
            'status' => ($perf >= 80 && $a11y >= 80) ? 'pass' : ($perf >= 50 ? 'warning' : 'fail'),
        ];
    }

    /** @param array<string, mixed> $metrics @return list<array<string, mixed>> */
    private function buildRecommendations(array $metrics): array
    {
        $recs = [];
        $meta = $metrics['meta'];
        $headings = $metrics['headings'];
        $images = $metrics['images'];
        $links = $metrics['links'];
        $technical = $metrics['technical'];
        $security = $metrics['security'];
        $mobile = $metrics['mobile'];
        $performance = $metrics['performance'];

        $rec = static function (
            string $type, string $category, string $priority, int $impact, string $effort, int $dayPlan,
            string $issue, string $title, string $description, string $recommendation, string $benefit,
        ): array {
            return [
                'type' => $type, 'category' => $category, 'priority' => $priority,
                'issue' => $issue, 'title' => $title, 'description' => $description,
                'recommendation' => $recommendation, 'benefit' => $benefit,
                'impact' => $impact, 'effort' => $effort,
                'quickWin' => $impact >= 6 && $effort === 'easy',
                'dayPlan' => $dayPlan,
            ];
        };

        // ── On-Page SEO ──
        if (!$meta['title']) {
            $recs[] = $rec('meta', 'on-page', 'critical', 10, 'easy', 1,
                'Missing meta title', 'Add a Meta Title',
                'The <title> tag is the most important on-page SEO element and is the clickable headline in Google search results.',
                'Add a <title> tag inside <head> with 50-60 characters containing your primary keyword near the beginning.',
                'Directly improves ranking position and click-through rate from organic search.');
        } elseif ($meta['titleLength'] < 30) {
            $recs[] = $rec('meta', 'on-page', 'high', 8, 'easy', 1,
                "Meta title too short ({$meta['titleLength']} chars)", 'Expand Meta Title',
                'A very short title fails to describe your page content to search engines and users.',
                "Expand title to 50-60 characters. Currently {$meta['titleLength']} chars. Include primary keyword and brand name.",
                'Improved keyword relevance and higher click-through rate in search results.');
        } elseif ($meta['titleLength'] > 60) {
            $recs[] = $rec('meta', 'on-page', 'medium', 5, 'easy', 1,
                "Meta title too long ({$meta['titleLength']} chars — truncated at ~60)", 'Shorten Meta Title',
                'Google truncates titles beyond 60 characters, hiding your call to action in search results.',
                "Reduce to under 60 characters. Currently {$meta['titleLength']} chars. Prioritise keyword at the start.",
                'Full title visible in SERPs — better first impression for searchers.');
        }

        if (!$meta['description']) {
            $recs[] = $rec('meta', 'on-page', 'critical', 9, 'easy', 1,
                'Missing meta description', 'Add Meta Description',
                'Meta descriptions appear under your title in search results and directly influence click-through rate.',
                'Add a <meta name="description"> of 150-160 characters summarising the page, including the primary keyword and a clear call to action.',
                'Can increase organic CTR by up to 30% on competitive search results.');
        } elseif ($meta['descriptionLength'] < 120) {
            $recs[] = $rec('meta', 'on-page', 'high', 7, 'easy', 1,
                "Meta description too short ({$meta['descriptionLength']} chars)", 'Expand Meta Description',
                'Short descriptions miss the opportunity to entice users and include relevant secondary keywords.',
                "Expand to 150-160 characters. Currently {$meta['descriptionLength']} chars. Add USP and call-to-action.",
                'More compelling snippet in search results leads to higher click-through rate.');
        } elseif ($meta['descriptionLength'] > 160) {
            $recs[] = $rec('meta', 'on-page', 'medium', 4, 'easy', 7,
                "Meta description too long ({$meta['descriptionLength']} chars — truncated at ~160)", 'Shorten Meta Description',
                'Google truncates descriptions beyond 160 characters, cutting off your call to action.',
                "Reduce to under 160 characters. Currently {$meta['descriptionLength']} chars.",
                'Complete message shown in search results — CTA always visible to users.');
        }

        if (!$headings['hasH1']) {
            $recs[] = $rec('heading', 'on-page', 'critical', 10, 'easy', 1,
                'Missing H1 heading', 'Add an H1 Heading',
                'The H1 tag is the primary heading and one of the strongest on-page ranking signals available.',
                'Add exactly one <h1> tag containing your primary keyword, clearly describing the page topic.',
                'Stronger topical relevance signal to search engines — directly impacts ranking for target keywords.');
        }

        if ($headings['multipleH1']) {
            $recs[] = $rec('heading', 'on-page', 'high', 7, 'easy', 1,
                "Multiple H1 tags found ({$headings['h1Count']} H1s)", 'Remove Duplicate H1 Tags',
                'Multiple H1 tags confuse search engines about which topic is primary on the page.',
                'Keep exactly one H1. Convert the other ' . ($headings['h1Count'] - 1) . '(s) to H2/H3 subheadings.',
                'Clear content hierarchy — search engines correctly identify the primary topic.');
        }

        if ($headings['h2Count'] === 0 && $headings['hasH1']) {
            $recs[] = $rec('heading', 'on-page', 'medium', 5, 'medium', 7,
                'No H2 subheadings found', 'Add H2 Subheadings',
                'H2 headings help search engines understand page structure and enable featured snippet eligibility.',
                'Add 2-4 H2 headings that break content into logical sections. Include secondary keywords naturally.',
                'Better content structure, eligibility for featured snippets, improved time-on-page.');
        }

        if (!$meta['canonical']) {
            $recs[] = $rec('technical', 'technical', 'medium', 7, 'easy', 7,
                'Missing canonical URL tag', 'Add Canonical URL Tag',
                'Without a canonical tag, search engines may index multiple URL variations as duplicate content, splitting ranking signals.',
                'Add <link rel="canonical" href="https://yourdomain.com/this-page/"> inside <head> on every page.',
                'Prevents duplicate content penalties and consolidates link equity to the preferred URL.');
        }

        // ── Technical SEO ──
        if (!$technical['https']) {
            $recs[] = $rec('technical', 'technical', 'critical', 10, 'medium', 1,
                'Site not served over HTTPS', 'Enable HTTPS / SSL Certificate',
                'HTTPS is a confirmed Google ranking factor. HTTP sites are labelled "Not Secure" in Chrome, destroying user trust.',
                'Install a free SSL certificate via Let\'s Encrypt. Redirect all HTTP → HTTPS. Update internal links and canonical URLs.',
                'Ranking boost, removal of "Not Secure" browser warning, required for modern browser features (PWA, HTTP/2).');
        }

        if (!$technical['sitemap']) {
            $recs[] = $rec('technical', 'technical', 'high', 8, 'medium', 7,
                'No XML sitemap found at /sitemap.xml', 'Create and Submit XML Sitemap',
                'An XML sitemap tells search engines which pages exist and how frequently they change — critical for larger sites.',
                'Generate a sitemap via your CMS plugin or sitemap generator tool. Submit to Google Search Console and Bing Webmaster Tools.',
                'Faster indexing of new pages, better crawl coverage, improved visibility for pages with few inbound links.');
        }

        if (!$technical['robotsTxt']) {
            $recs[] = $rec('technical', 'technical', 'medium', 6, 'easy', 7,
                'No robots.txt file found at /robots.txt', 'Create robots.txt File',
                'robots.txt guides crawlers and prevents wasted crawl budget on admin pages, login areas, and duplicate content.',
                'Create a robots.txt at your domain root. Disallow admin/private paths. Reference your sitemap URL.',
                'Efficient crawl budget allocation — search engines spend more time on pages that matter.');
        }

        if (!$technical['structuredData']) {
            $recs[] = $rec('schema', 'schema', 'medium', 7, 'medium', 14,
                'No structured data (JSON-LD / Schema.org) detected', 'Add Schema Markup (JSON-LD)',
                'Schema markup helps search engines understand content type and can unlock rich results (star ratings, FAQs, events).',
                'Add JSON-LD for your page type: Organization (homepage), Article (blog), Product (e-commerce), FAQ, BreadcrumbList.',
                'Eligibility for rich snippets in SERPs — can increase CTR by 20-30% when rich results appear.');
        }

        if (!$technical['openGraph']) {
            $recs[] = $rec('technical', 'technical', 'medium', 6, 'easy', 14,
                'Missing Open Graph tags (og:title, og:description, og:image)', 'Add Open Graph Meta Tags',
                'Open Graph tags control how your page appears when shared on Facebook, LinkedIn, and messaging apps.',
                'Add og:title, og:description, og:image (1200×630px), og:url, og:type to the <head> of every page.',
                'Professional-looking social shares increase engagement and drive additional referral traffic.');
        }

        if (!$technical['twitterCard']) {
            $recs[] = $rec('technical', 'technical', 'low', 4, 'easy', 14,
                'Missing Twitter Card meta tags', 'Add Twitter Card Tags',
                'Without Twitter Cards, links shared on Twitter/X show as plain text URLs with no preview.',
                'Add twitter:card, twitter:title, twitter:description, twitter:image meta tags inside <head>.',
                'Rich Twitter/X previews drive significantly more clicks than plain URL shares.');
        }

        if (!$technical['securityHeaders']) {
            $recs[] = $rec('security', 'security', 'medium', 5, 'medium', 14,
                'Missing security headers (CSP, X-Frame-Options, HSTS)', 'Implement HTTP Security Headers',
                'Security headers protect against XSS, clickjacking, and protocol downgrade attacks. Google factors site security into quality assessments.',
                'Configure Content-Security-Policy, X-Frame-Options: SAMEORIGIN, and Strict-Transport-Security in your server or CDN.',
                'Improved security score, user trust signal, compliance with security best practices.');
        }

        // ── Security ──
        if (!$security['ssl']) {
            $recs[] = $rec('security', 'security', 'critical', 10, 'medium', 1,
                'Invalid or missing SSL certificate', 'Fix SSL Certificate',
                'An invalid SSL certificate triggers browser security warnings that immediately drive users away.',
                'Obtain a valid SSL certificate from Let\'s Encrypt (free) or your hosting provider. Ensure it covers www and root domain.',
                'Eliminate browser security warnings — restore user trust and ranking eligibility immediately.');
        }

        foreach ($security['headers'] as $header => $present) {
            if (!$present) {
                $recs[] = $rec('security', 'security', 'low', 4, 'easy', 14,
                    "Missing HTTP security header: {$header}", "Add {$header} Header",
                    "The {$header} header is absent, leaving the site exposed to specific attack vectors.",
                    "Add the {$header} header via your web server config (nginx/Apache), CDN security rules, or middleware.",
                    'Improved security audit score and reduced attack surface.');
            }
        }

        // ── Images ──
        if ($images['missingAlt'] > 0) {
            $isHigh = $images['missingAlt'] > 5;
            $recs[] = $rec('image', 'images', $isHigh ? 'high' : 'medium', $isHigh ? 8 : 6, 'easy', 7,
                "{$images['missingAlt']} image(s) missing alt text", 'Add Alt Text to All Images',
                'Alt text tells search engines and screen readers what images show. Missing alt text is both an SEO and accessibility failure.',
                "Add descriptive alt attributes to all {$images['missingAlt']} affected images. Use keywords naturally. Set alt=\"\" only for purely decorative images.",
                'Image SEO improvement, Google Image Search traffic, WCAG 2.1 accessibility compliance.');
        }

        // ── Internal Linking ──
        if ($links['internalLinks'] < 5) {
            $recs[] = $rec('link', 'internal-links', 'medium', 6, 'medium', 14,
                "Low internal link count ({$links['internalLinks']} internal links found)", 'Build Internal Link Structure',
                'Internal links distribute PageRank throughout your site and help search engines discover and understand all your pages.',
                'Add 3-5 contextual internal links per page to related content. Use descriptive keyword-rich anchor text — avoid "click here".',
                'Better crawl coverage, improved authority distribution to important pages, lower bounce rate.');
        }

        if ($links['brokenLinks'] > 0) {
            $recs[] = $rec('link', 'internal-links', 'high', 8, 'medium', 7,
                "{$links['brokenLinks']} broken link(s) detected", 'Fix Broken Links',
                'Broken links waste crawl budget, create dead ends for users, and signal poor site maintenance to Google.',
                "Fix or remove all {$links['brokenLinks']} broken links. Set up 301 redirects where pages have moved. Use Google Search Console to find all broken links sitewide.",
                'Restored crawl efficiency, better user experience, maintained link equity flow.');
        }

        // ── Mobile SEO ──
        if (!$mobile['viewport']) {
            $recs[] = $rec('mobile', 'mobile', 'critical', 10, 'easy', 1,
                'Missing viewport meta tag', 'Add Viewport Meta Tag',
                'Without a viewport tag, mobile browsers zoom out to show a desktop view, making the site unusable on phones. Google uses mobile-first indexing.',
                'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.',
                'Pass Google\'s mobile-first indexing check — this single line immediately fixes mobile rendering.');
        }

        if (!$mobile['responsive']) {
            $recs[] = $rec('mobile', 'mobile', 'critical', 9, 'hard', 30,
                'No responsive design signals detected', 'Implement Responsive Design',
                'A non-responsive site fails Google\'s mobile usability requirements. Over 60% of searches now happen on mobile.',
                'Implement CSS media queries or adopt Tailwind CSS / Bootstrap. Test with Google\'s Mobile-Friendly Test. Start with flexible layouts using percentages instead of fixed pixels.',
                'Pass mobile usability requirements, serve Google\'s mobile-first index, retain mobile visitors who otherwise bounce immediately.');
        }

        if (!$mobile['touchTargets']) {
            $recs[] = $rec('mobile', 'mobile', 'medium', 6, 'medium', 14,
                'Small or inadequate touch targets detected', 'Improve Touch Target Sizes',
                'Tap targets smaller than 44×44px are difficult to tap accurately on mobile, causing user frustration and high bounce rates.',
                'Ensure all buttons, links, and inputs are at least 44×44px on mobile. Add padding around small elements. Avoid closely-spaced tap targets.',
                'Reduced mobile bounce rate, improved mobile usability score in Google Search Console.');
        }

        if (!$mobile['fontReadability']) {
            $recs[] = $rec('mobile', 'mobile', 'medium', 5, 'easy', 7,
                'Text too small to read on mobile (font size < 12px)', 'Fix Mobile Font Sizes',
                'Font sizes below 12px are difficult to read on mobile without zooming, failing Google\'s legibility requirements.',
                'Set minimum font size to 12px (16px ideal for body text). Use relative units (rem, em) instead of fixed px for scalability across devices.',
                'Pass Google\'s legibility audit, improved mobile readability, reduced pinch-to-zoom behaviour.');
        }

        if (!$mobile['layoutOverflow']) {
            $recs[] = $rec('mobile', 'mobile', 'high', 7, 'medium', 14,
                'Content wider than viewport (horizontal scroll detected)', 'Fix Layout Overflow / Horizontal Scroll',
                'Fixed-width elements wider than the mobile viewport cause horizontal scrolling, a critical mobile UX failure that Google penalises.',
                'Replace fixed pixel widths with max-width and percentages. Wrap wide tables with overflow-x: auto. Remove viewport-locking meta attributes.',
                'Eliminate horizontal scrolling, pass Google\'s mobile usability checks, retain mobile visitors.');
        }

        // ── Performance ──
        if ($performance['performance'] < 50) {
            $recs[] = $rec('performance', 'performance', 'critical', 9, 'hard', 7,
                "Critical performance score: {$performance['performance']}/100 (mobile)", 'Fix Critical Performance Issues',
                'Google uses Core Web Vitals as a ranking factor. A score below 50 directly harms search rankings and causes 53% of mobile users to abandon pages.',
                'Priority actions: enable image compression (WebP), implement lazy loading, remove render-blocking JS/CSS, enable browser caching, use a CDN. Run PageSpeed Insights for specific audit items.',
                'Direct ranking improvement, lower bounce rate, Core Web Vitals compliance — Google may show "fast page" label in SERPs.');
        } elseif ($performance['performance'] < 80) {
            $recs[] = $rec('performance', 'performance', 'high', 7, 'medium', 14,
                "Performance needs improvement: {$performance['performance']}/100 (mobile)", 'Optimise Page Performance',
                'A performance score of 50-79 indicates significant optimisation opportunities that could boost both rankings and user retention.',
                'Convert images to WebP format, defer non-critical JavaScript, preload key resources with <link rel="preload">, minimise CSS/JS bundles, implement service worker caching.',
                'Better Core Web Vitals, improved user retention, potential ranking uplift from performance signals.');
        }

        // ── Accessibility ──
        if ($performance['accessibility'] < 80) {
            $isLow = $performance['accessibility'] < 50;
            $recs[] = $rec('accessibility', 'accessibility', $isLow ? 'high' : 'medium', $isLow ? 7 : 5, 'medium', 14,
                "Accessibility score: {$performance['accessibility']}/100", 'Improve Accessibility',
                'Accessibility issues affect users with disabilities and can negatively impact Google quality scores. WCAG compliance is increasingly expected.',
                'Add lang attribute to <html>, ensure all images have alt text, add ARIA labels to interactive elements, verify colour contrast ratios, add skip-navigation links.',
                'Broader audience reach, legal compliance, improved quality signal to Google, positive impact on overall SEO.');
        }

        return $recs;
    }

    /**
     * @param list<array<string, mixed>> $recommendations
     * @param array<string, mixed> $scoreBreakdown
     * @param array<string, mixed> $metrics
     * @return array<string, mixed>
     */
    private function buildSeoInsights(array $recommendations, array $scoreBreakdown, array $metrics): array
    {
        $byImpact = $recommendations;
        usort($byImpact, static fn ($a, $b) => $b['impact'] <=> $a['impact']);
        $top5Issues = array_slice($byImpact, 0, 5);

        $quickWins = array_values(array_filter($recommendations, static fn ($r) => $r['quickWin']));
        usort($quickWins, static fn ($a, $b) => $b['impact'] <=> $a['impact']);
        $quickWins = array_slice($quickWins, 0, 6);

        $byDayPlan = static function (array $recs, int $day): array {
            $filtered = array_values(array_filter($recs, static fn ($r) => $r['dayPlan'] === $day));
            usort($filtered, static fn ($a, $b) => $b['impact'] <=> $a['impact']);
            return $filtered;
        };

        $thirtyDayPlan = [
            'week1' => ['title' => 'Week 1 — Critical Fixes', 'tasks' => $byDayPlan($recommendations, 1)],
            'week2' => ['title' => 'Week 2 — High Priority', 'tasks' => $byDayPlan($recommendations, 7)],
            'week3' => ['title' => 'Week 3 — Medium Priority', 'tasks' => $byDayPlan($recommendations, 14)],
            'week4' => ['title' => 'Week 4 — Polish & Optimise', 'tasks' => $byDayPlan($recommendations, 30)],
        ];

        $overall = (int) $scoreBreakdown['overall'];
        $grade = ScoreCalculator::grade($overall);

        $gradeSummaries = [
            'A' => 'Excellent SEO health. Your site is well-optimised. Focus on minor improvements to maintain your competitive edge.',
            'B' => 'Good SEO foundation with clear opportunities. Addressing the identified issues could meaningfully boost your rankings.',
            'C' => 'Average SEO health. Several important factors are missing or poorly configured. Prioritise critical and high-impact fixes first.',
            'D' => 'Below-average SEO health. Multiple core factors are missing. A structured improvement plan is essential to compete in search.',
            'F' => 'Poor SEO health. Fundamental requirements are not met. Immediate action is needed to establish a basic SEO foundation.',
        ];

        $strengths = [];
        if ($metrics['technical']['https']) {
            $strengths[] = 'HTTPS enabled — site is secure';
        }
        if ($metrics['technical']['sitemap']) {
            $strengths[] = 'XML sitemap found and accessible';
        }
        if ($metrics['technical']['robotsTxt']) {
            $strengths[] = 'robots.txt configured';
        }
        if ($metrics['technical']['canonical']) {
            $strengths[] = 'Canonical URL tag present';
        }
        if ($metrics['technical']['openGraph']) {
            $strengths[] = 'Open Graph social tags implemented';
        }
        if ($metrics['technical']['twitterCard']) {
            $strengths[] = 'Twitter/X Cards configured';
        }
        if ($metrics['technical']['structuredData']) {
            $strengths[] = 'Schema markup / Structured data found';
        }
        if ($metrics['mobile']['viewport']) {
            $strengths[] = 'Viewport meta tag present';
        }
        if ($metrics['mobile']['responsive']) {
            $strengths[] = 'Responsive design detected';
        }
        if ($metrics['meta']['title'] && $metrics['meta']['titleLength'] >= 30 && $metrics['meta']['titleLength'] <= 60) {
            $strengths[] = 'Meta title is well-optimised length';
        }
        if ($metrics['meta']['description'] && $metrics['meta']['descriptionLength'] >= 120 && $metrics['meta']['descriptionLength'] <= 160) {
            $strengths[] = 'Meta description is well-optimised length';
        }
        if ($metrics['headings']['hasH1'] && !$metrics['headings']['multipleH1']) {
            $strengths[] = 'Single H1 heading correctly present';
        }
        if ($metrics['images']['missingAlt'] === 0 && $metrics['images']['totalImages'] > 0) {
            $strengths[] = 'All images have descriptive alt text';
        }
        if ($scoreBreakdown['performance'] >= 80) {
            $strengths[] = 'Excellent mobile performance score';
        }
        if ($scoreBreakdown['security'] >= 70) {
            $strengths[] = 'Good overall security posture';
        }

        $critical = array_values(array_filter($recommendations, static fn ($r) => $r['priority'] === 'critical'));
        $high = array_values(array_filter($recommendations, static fn ($r) => $r['priority'] === 'high'));
        $medium = array_values(array_filter($recommendations, static fn ($r) => $r['priority'] === 'medium'));
        $low = array_values(array_filter($recommendations, static fn ($r) => $r['priority'] === 'low'));

        $healthSummary = [
            'grade' => $grade,
            'summary' => $gradeSummaries[$grade],
            'strengths' => array_slice($strengths, 0, 6),
            'criticalIssues' => array_map(static fn ($r) => $r['issue'], $critical),
            'totalIssues' => count($recommendations),
            'criticalCount' => count($critical),
            'highCount' => count($high),
            'mediumCount' => count($medium),
            'lowCount' => count($low),
        ];

        return [
            'top5Issues' => $top5Issues,
            'quickWins' => $quickWins,
            'thirtyDayPlan' => $thirtyDayPlan,
            'healthSummary' => $healthSummary,
        ];
    }
}
