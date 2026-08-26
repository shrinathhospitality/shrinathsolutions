<?php

declare(strict_types=1);

namespace App\Services;

/**
 * PHP port of server/src/utils/competitorAnalyzer.ts. Node ran all sites
 * concurrently via Promise.allSettled; PHP runs them sequentially (each
 * SeoAnalyzer::analyze() call is CPU + a handful of quick HTTP requests, so
 * total wall time stays reasonable — see the conversion plan's documented
 * deviation). Every site's success/failure is still independent, matching
 * Node's allSettled semantics: one competitor failing never fails the rest.
 */
final class CompetitorAnalyzer
{
    private const LABELS = ['Your Site', 'Competitor 1', 'Competitor 2', 'Competitor 3'];

    public function __construct(private readonly SeoAnalyzer $analyzer)
    {
    }

    /**
     * @param list<string> $competitorUrls
     * @return array<string, mixed>
     */
    public function compareAll(string $mainUrl, array $competitorUrls): array
    {
        $urls = array_merge([$mainUrl], array_slice(array_values(array_filter(
            $competitorUrls,
            static fn ($u) => is_string($u) && trim($u) !== ''
        )), 0, 3));

        $sites = [];
        foreach ($urls as $i => $url) {
            $label = self::LABELS[$i] ?? "Competitor {$i}";
            $host = (string) parse_url($url, PHP_URL_HOST) ?: $url;

            try {
                $result = $this->analyzer->analyze($url);
                $sites[] = ['url' => $url, 'domain' => $result['domain'], 'label' => $label, 'result' => $result, 'error' => null];
            } catch (\Throwable $e) {
                $sites[] = ['url' => $url, 'domain' => $host, 'label' => $label, 'result' => null, 'error' => $e->getMessage()];
            }
        }

        $valid = array_values(array_filter($sites, static fn ($s) => $s['result'] !== null));

        return [
            'sites' => $sites,
            'winners' => $valid !== [] ? $this->buildWinners($valid) : $this->emptyWinners(),
            'insights' => $this->buildInsights($sites),
            'analyzedAt' => date('c'),
        ];
    }

    /** @return array<string, string> */
    private function emptyWinners(): array
    {
        return [
            'overall' => '', 'technical' => '', 'onPage' => '', 'performance' => '',
            'mobile' => '', 'security' => '', 'accessibility' => '',
        ];
    }

    /** @param list<array<string, mixed>> $sites @return array<string, string> */
    private function buildWinners(array $sites): array
    {
        $top = static function (string $key) use ($sites): string {
            $best = $sites[0];
            foreach ($sites as $site) {
                if (($site['result']['scoreBreakdown'][$key] ?? 0) > ($best['result']['scoreBreakdown'][$key] ?? 0)) {
                    $best = $site;
                }
            }
            return $best['domain'];
        };

        return [
            'overall' => $top('overall'),
            'technical' => $top('technical'),
            'onPage' => $top('onPage'),
            'performance' => $top('performance'),
            'mobile' => $top('mobile'),
            'security' => $top('security'),
            'accessibility' => $top('accessibility'),
        ];
    }

    /** @param list<array<string, mixed>> $sites @return list<array{type:string,site:string,message:string}> */
    private function buildInsights(array $sites): array
    {
        $insights = [];
        $main = $sites[0];
        $comps = array_slice($sites, 1);
        $validComps = array_values(array_filter($comps, static fn ($c) => $c['result'] !== null));

        $ins = static fn (string $type, string $site, string $message) => ['type' => $type, 'site' => $site, 'message' => $message];

        if ($main['result'] === null) {
            $insights[] = $ins('warning', $main['domain'], "Could not analyze {$main['domain']}: " . ($main['error'] ?? 'unknown error') . '. Check that the URL is publicly accessible.');
            foreach ($validComps as $c) {
                $insights[] = $ins('tip', $c['domain'], "{$c['domain']} is accessible and scores {$c['result']['scoreBreakdown']['overall']}/100 overall.");
            }
            return $insights;
        }

        $mainR = $main['result'];
        $mainOverall = $mainR['scoreBreakdown']['overall'];

        $betterComps = array_values(array_filter($validComps, static fn ($c) => $c['result']['scoreBreakdown']['overall'] > $mainOverall + 10));
        $worseComps = array_values(array_filter($validComps, static fn ($c) => $c['result']['scoreBreakdown']['overall'] < $mainOverall - 10));

        if ($betterComps !== []) {
            $gaps = implode(', ', array_map(static fn ($c) => "{$c['domain']} ({$c['result']['scoreBreakdown']['overall']})", $betterComps));
            $weakLabels = ['technical' => 'Technical SEO', 'performance' => 'Performance', 'mobile' => 'Mobile SEO'];
            $weakAreas = [];
            foreach ($weakLabels as $key => $label) {
                foreach ($betterComps as $c) {
                    if (($c['result']['scoreBreakdown'][$key] ?? 0) > ($mainR['scoreBreakdown'][$key] ?? 0) + 10) {
                        $weakAreas[] = $label;
                        break;
                    }
                }
            }
            $weakAreasStr = $weakAreas !== [] ? implode(', ', $weakAreas) : 'overall SEO scoring';
            $insights[] = $ins('warning', $main['domain'], "Your site ({$mainOverall}) trails {$gaps}. The biggest gaps are in {$weakAreasStr}. Fixing these areas could close the gap significantly.");
        } elseif (count($worseComps) === count($validComps) && $validComps !== []) {
            $insights[] = $ins('advantage', $main['domain'], "Your site leads all competitors with an overall score of {$mainOverall}. Continue improving to widen the lead and maintain your competitive edge.");
        }

        $mainPerf = $mainR['scoreBreakdown']['performance'];
        $slowerComps = array_values(array_filter($validComps, static fn ($c) => $c['result']['scoreBreakdown']['performance'] > $mainPerf + 10));
        $fasterThanAll = $validComps !== [] && count(array_filter($validComps, static fn ($c) => $c['result']['scoreBreakdown']['performance'] < $mainPerf - 5)) === count($validComps);

        if ($slowerComps !== []) {
            $names = implode(', ', array_map(static fn ($c) => "{$c['domain']} ({$c['result']['scoreBreakdown']['performance']})", $slowerComps));
            $insights[] = $ins('warning', $main['domain'], "Your performance score ({$mainPerf}) is below {$names}. Large uncompressed images, render-blocking scripts, or missing lazy loading are the most common culprits. Converting images to WebP and deferring non-critical JS typically recovers 20-40 points.");
        } elseif ($fasterThanAll) {
            $insights[] = $ins('advantage', $main['domain'], "Your site outperforms all competitors on page speed ({$mainPerf}/100). This directly benefits Core Web Vitals and user retention — keep monitoring with PageSpeed Insights.");
        }

        $mainHasSchema = $mainR['metrics']['technical']['structuredData'];
        $compsWithSchema = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['technical']['structuredData']));
        if (!$mainHasSchema && $compsWithSchema !== []) {
            $insights[] = $ins('opportunity', $main['domain'], 'Adding JSON-LD structured data could boost your SEO score by 8-12 points. ' . implode(', ', array_map(static fn ($c) => $c['domain'], $compsWithSchema)) . ' already leverage schema markup for rich snippets — star ratings, FAQs, and product cards in search results.');
        } elseif ($mainHasSchema) {
            $missing = array_values(array_filter($validComps, static fn ($c) => !$c['result']['metrics']['technical']['structuredData']));
            if ($missing !== []) {
                $insights[] = $ins('advantage', $main['domain'], 'You use structured data (JSON-LD/Schema.org) which ' . implode(', ', array_map(static fn ($c) => $c['domain'], $missing)) . ' lack. This gives you an edge in rich snippet eligibility in Google Search.');
            }
        }

        if (!$mainR['metrics']['technical']['sitemap']) {
            $compsWithSitemap = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['technical']['sitemap']));
            if ($compsWithSitemap !== []) {
                $insights[] = $ins('opportunity', $main['domain'], 'Your site is missing a sitemap.xml while ' . implode(', ', array_map(static fn ($c) => $c['domain'], $compsWithSitemap)) . ' have one. Submit a sitemap to Google Search Console for faster indexing — especially important for pages with few inbound links.');
            }
        }

        if (!$mainR['metrics']['technical']['openGraph']) {
            $compsWithOg = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['technical']['openGraph']));
            if ($compsWithOg !== []) {
                $insights[] = $ins('opportunity', $main['domain'], implode(', ', array_map(static fn ($c) => $c['domain'], $compsWithOg)) . ' use Open Graph tags which you are missing. OG tags control how your pages appear when shared on social media, directly impacting referral traffic.');
            }
        } else {
            $missing = array_values(array_filter($validComps, static fn ($c) => !$c['result']['metrics']['technical']['openGraph']));
            if ($missing !== []) {
                $insights[] = $ins('advantage', $main['domain'], 'Your Open Graph implementation gives you better social sharing previews than ' . implode(', ', array_map(static fn ($c) => $c['domain'], $missing)) . '.');
            }
        }

        $mainMobile = $mainR['scoreBreakdown']['mobile'];
        $betterMobileComps = array_values(array_filter($validComps, static fn ($c) => $c['result']['scoreBreakdown']['mobile'] > $mainMobile + 15));
        if ($betterMobileComps !== []) {
            $names = implode(', ', array_map(static fn ($c) => "{$c['domain']} ({$c['result']['scoreBreakdown']['mobile']})", $betterMobileComps));
            $insights[] = $ins('warning', $main['domain'], "Your mobile score ({$mainMobile}) is behind {$names}. With 60%+ of searches happening on mobile and Google using mobile-first indexing, this gap directly hurts rankings.");
        }

        if (!$mainR['metrics']['technical']['securityHeaders']) {
            $secureComps = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['technical']['securityHeaders']));
            if ($secureComps !== []) {
                $insights[] = $ins('tip', $main['domain'], implode(', ', array_map(static fn ($c) => $c['domain'], $secureComps)) . ' implement HTTP security headers (CSP, X-Frame-Options, HSTS) that your site lacks. These headers improve your security posture and signal a well-maintained site to Google.');
            }
        }

        if (!$mainR['metrics']['meta']['title']) {
            $insights[] = $ins('warning', $main['domain'], 'Your site is missing a meta title — the single most important on-page SEO element. This alone can prevent ranking for any targeted keywords.');
        } elseif (!$mainR['metrics']['meta']['description']) {
            $insights[] = $ins('warning', $main['domain'], 'Your site has no meta description. Without one, Google auto-generates a snippet that typically achieves 20-30% lower click-through rates.');
        }

        if (!$mainR['metrics']['headings']['hasH1']) {
            $insights[] = $ins('warning', $main['domain'], 'Your page is missing an H1 heading — one of the strongest on-page ranking signals. Add a single H1 containing your primary keyword.');
        }

        $mainLinks = $mainR['metrics']['links']['internalLinks'];
        $betterLinked = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['links']['internalLinks'] > $mainLinks + 8));
        if ($betterLinked !== [] && $mainLinks < 8) {
            $insights[] = $ins('opportunity', $main['domain'], "Your site has {$mainLinks} internal links compared to " . implode(', ', array_map(static fn ($c) => "{$c['domain']} ({$c['result']['metrics']['links']['internalLinks']})", $betterLinked)) . '. More contextual internal links improve PageRank distribution and help search engines discover all your pages.');
        }

        if ($mainR['metrics']['images']['missingAlt'] > 3) {
            $compsWithGoodImages = array_values(array_filter($validComps, static fn ($c) => $c['result']['metrics']['images']['missingAlt'] < $mainR['metrics']['images']['missingAlt']));
            if ($compsWithGoodImages !== []) {
                $insights[] = $ins('tip', $main['domain'], "You have {$mainR['metrics']['images']['missingAlt']} images without alt text. " . implode(', ', array_map(static fn ($c) => $c['domain'], $compsWithGoodImages)) . ' score better here. Alt text improves Google Image Search rankings and WCAG accessibility compliance.');
            }
        }

        return array_slice($insights, 0, 8);
    }
}
