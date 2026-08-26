<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Every scoring formula ported verbatim from server/src/utils/seoAnalyzer.ts
 * — same weights, same thresholds, same status cutoffs. See the conversion
 * plan's fixture-comparison step for how parity was verified.
 */
final class ScoreCalculator
{
    /** @param array{title: string, description: string, canonical: string} $meta */
    public static function metaStatus(array $meta): string
    {
        $score = 0;
        if (strlen($meta['title']) > 0) {
            $score++;
        }
        $titleLen = mb_strlen($meta['title']);
        if ($titleLen >= 30 && $titleLen <= 60) {
            $score++;
        }
        if (strlen($meta['description']) > 0) {
            $score++;
        }
        $descLen = mb_strlen($meta['description']);
        if ($descLen >= 150 && $descLen <= 160) {
            $score++;
        }
        if (strlen($meta['canonical']) > 0) {
            $score++;
        }

        if ($score <= 2) {
            return 'fail';
        }
        if ($score <= 4) {
            return 'warning';
        }
        return 'pass';
    }

    /** @param array{h1Count: int, h2Count: int, h3Count: int, h4Count: int, multipleH1: bool, hasH1: bool} $headings */
    public static function headingScore(array $headings): int
    {
        $score = 0;
        if ($headings['hasH1'] && !$headings['multipleH1']) {
            $score += 40;
        } elseif ($headings['hasH1']) {
            $score += 20;
        }
        if ($headings['h2Count'] > 0) {
            $score += 30;
        }
        if ($headings['h3Count'] > 0) {
            $score += 20;
        }
        if ($headings['h4Count'] > 0) {
            $score += 10;
        }
        return $score;
    }

    /** @param array{totalImages: int, missingAlt: int} $images */
    public static function imageScore(array $images): int
    {
        if ($images['totalImages'] === 0) {
            return 100;
        }
        $ratio = ($images['totalImages'] - $images['missingAlt']) / $images['totalImages'];
        return (int) round($ratio * 100);
    }

    // Weighted scoring — total = 100
    // HTTPS:20 | Sitemap:15 | Robots:15 | Canonical:15 | StructuredData:15 | OG:10 | Twitter:5 | SecHeaders:5
    /** @param array{https:bool,sitemap:bool,robotsTxt:bool,canonical:bool,structuredData:bool,openGraph:bool,twitterCard:bool,securityHeaders:bool} $tech */
    public static function technicalScore(array $tech): int
    {
        $score = 0;
        $score += $tech['https'] ? 20 : 0;
        $score += $tech['sitemap'] ? 15 : 0;
        $score += $tech['robotsTxt'] ? 15 : 0;
        $score += $tech['canonical'] ? 15 : 0;
        $score += $tech['structuredData'] ? 15 : 0;
        $score += $tech['openGraph'] ? 10 : 0;
        $score += $tech['twitterCard'] ? 5 : 0;
        $score += $tech['securityHeaders'] ? 5 : 0;
        return $score;
    }

    /** @param array{ssl:bool,https:bool,headers:array<string,bool>} $sec */
    public static function securityScore(array $sec): int
    {
        $score = 0;
        if ($sec['ssl']) {
            $score += 40;
        }
        if ($sec['https']) {
            $score += 20;
        }
        $headerKeys = array_keys($sec['headers']);
        $present = count(array_filter($headerKeys, static fn ($k) => $sec['headers'][$k]));
        $score += count($headerKeys) > 0 ? (int) round(($present / count($headerKeys)) * 40) : 0;
        return $score;
    }

    /**
     * Mobile optimization — Viewport:20 | Responsive:20 | TouchTargets:15 |
     * FontReadability:10 | LayoutOverflow:10 | MobilePerf:25 (scaled from the
     * 0-100 performance score, same as Node's analyzeMobileOptimization).
     *
     * @return array{
     *   viewport:bool, responsive:bool, touchElements:bool, touchTargets:bool,
     *   fontReadability:bool, layoutOverflow:bool, performanceScore:int,
     *   score:int, status:string,
     *   checks: array{viewport:bool,responsive:bool,touchTargets:bool,fontReadability:bool,layoutOverflow:bool,performanceScore:int}
     * }
     */
    public static function mobileOptimization(HtmlParser $parser, int $mobilePerformanceScore): array
    {
        $viewportContent = $parser->viewportContent();
        $viewport = $viewportContent !== null;

        $inlineStyleText = $parser->inlineStyleText();
        $fullHtml = $parser->rawHtml();

        $hasMediaQueries = preg_match('/@media\s/i', $inlineStyleText) === 1;
        $hasTailwind = preg_match('/\b(?:sm|md|lg|xl|2xl):[a-z]/', $fullHtml) === 1;
        $hasBootstrap = preg_match('/\bcol-(?:xs|sm|md|lg|xl)\b|container-fluid|navbar-expand/', $fullHtml) === 1;
        $hasFrameworkLink = false;
        foreach ($parser->stylesheetHrefs() as $href) {
            if (preg_match('/bootstrap|foundation|bulma|materialize|tailwind/i', $href) === 1) {
                $hasFrameworkLink = true;
                break;
            }
        }
        $hasFlexGrid = preg_match('/display\s*:\s*(flex|grid)/i', $inlineStyleText) === 1;
        $hasFluidWidths = preg_match('/width\s*:\s*(?:100%|[0-9]+(?:vw|%))/i', $fullHtml) === 1;

        $responsive = $hasMediaQueries || $hasTailwind || $hasBootstrap || $hasFrameworkLink || $hasFlexGrid || $hasFluidWidths;

        // Touch targets
        $interactiveEls = $parser->queryElements('//button | //a[@href] | //input[not(@type="hidden")] | //select | //*[@role="button"]');
        $tinyTargetCount = 0;
        foreach ($interactiveEls as $el) {
            $style = $el->getAttribute('style');
            $h = [];
            $w = [];
            $hMatch = preg_match('/\bheight\s*:\s*(\d+)px/i', $style, $h) === 1;
            $wMatch = preg_match('/\bwidth\s*:\s*(\d+)px/i', $style, $w) === 1;
            if (($hMatch && (int) $h[1] < 32) || ($wMatch && (int) $w[1] < 32)) {
                $tinyTargetCount++;
            }
        }
        $iconOnlyLinks = 0;
        foreach ($parser->queryElements('//a[@href]') as $a) {
            $text = trim($a->textContent);
            $hasMedia = false;
            foreach (['img', 'svg'] as $tag) {
                if ($a->getElementsByTagName($tag)->length > 0) {
                    $hasMedia = true;
                    break;
                }
            }
            if ($text === '' && !$hasMedia) {
                $iconOnlyLinks++;
            }
        }
        $touchTargets = $tinyTargetCount === 0 && $iconOnlyLinks < 3;

        // Font readability
        $smallInlineFonts = 0;
        foreach ($parser->queryElements('//*[@style]') as $el) {
            $style = $el->getAttribute('style');
            if (preg_match('/font-size\s*:\s*([\d.]+)(px|pt)/i', $style, $m) === 1) {
                $px = (float) $m[1] * (strtolower($m[2]) === 'pt' ? 1.333 : 1);
                if ($px < 12) {
                    $smallInlineFonts++;
                }
            }
        }
        $smallFontInCSS = false;
        if (preg_match_all('/font-size\s*:\s*([\d.]+)px/i', $inlineStyleText, $matches) > 0) {
            foreach ($matches[1] as $val) {
                if ((float) $val < 12) {
                    $smallFontInCSS = true;
                    break;
                }
            }
        }
        $legacySmallFont = $parser->xpathCount('//font[@size="1"] | //font[@size="2"]') > 0;
        $fontReadability = $smallInlineFonts === 0 && !$smallFontInCSS && !$legacySmallFont;

        // Layout overflow
        $wideFixedEls = 0;
        foreach ($parser->queryElements('//*[@style]') as $el) {
            $style = $el->getAttribute('style');
            if (preg_match('/(?:^|;)\s*(?:min-)?width\s*:\s*(\d+)px/i', $style, $m) === 1 && (int) $m[1] >= 600) {
                $wideFixedEls++;
            }
        }
        $viewportLocked = preg_match('/maximum-scale\s*=\s*1|user-scalable\s*=\s*no/i', (string) $viewportContent) === 1;
        $layoutOverflow = $wideFixedEls === 0 && !$viewportLocked;

        $mobilePerformancePts = (int) round(($mobilePerformanceScore / 100) * 25);

        $score = ($viewport ? 20 : 0)
            + ($responsive ? 20 : 0)
            + ($touchTargets ? 15 : 0)
            + ($fontReadability ? 10 : 0)
            + ($layoutOverflow ? 10 : 0)
            + $mobilePerformancePts;

        return [
            'viewport' => $viewport,
            'responsive' => $responsive,
            'touchElements' => count($interactiveEls) > 0,
            'touchTargets' => $touchTargets,
            'fontReadability' => $fontReadability,
            'layoutOverflow' => $layoutOverflow,
            'performanceScore' => $mobilePerformanceScore,
            'score' => $score,
            'status' => $score < 50 ? 'fail' : ($score < 80 ? 'warning' : 'pass'),
            'checks' => [
                'viewport' => $viewport,
                'responsive' => $responsive,
                'touchTargets' => $touchTargets,
                'fontReadability' => $fontReadability,
                'layoutOverflow' => $layoutOverflow,
                'performanceScore' => $mobilePerformanceScore,
            ],
        ];
    }

    /**
     * HTML-heuristic performance + accessibility scoring, used whenever no
     * PageSpeed API key is configured (or the PageSpeed call fails) — same
     * fallback path as Node's analyzePerformanceAndAccessibility.
     *
     * @return array{performance:int, accessibility:int, bestPractices:int, seo:int, status:string}
     */
    public static function heuristicPerformanceAndAccessibility(HtmlParser $parser, float $fetchTimeMs): array
    {
        $perfScore = 60;

        $scripts = $parser->xpathCount('//script[@src]');
        $stylesheets = $parser->xpathCount('//link[@rel="stylesheet"]');
        $images = $parser->queryElements('//img');
        $totalImgs = count($images);
        $lazyImgs = 0;
        $dimsImgs = 0;
        foreach ($images as $img) {
            if ($img->getAttribute('loading') === 'lazy') {
                $lazyImgs++;
            }
            if ($img->hasAttribute('width') && $img->hasAttribute('height')) {
                $dimsImgs++;
            }
        }

        $perfScore -= min($scripts * 3, 20);
        $perfScore -= min($stylesheets * 3, 15);

        if ($parser->xpathCount('//link[@rel="preload"]') > 0) {
            $perfScore += 5;
        }
        if ($parser->xpathCount('//link[@rel="prefetch"] | //link[@rel="preconnect"] | //link[@rel="dns-prefetch"]') > 0) {
            $perfScore += 5;
        }
        if ($totalImgs > 0 && $lazyImgs / $totalImgs >= 0.5) {
            $perfScore += 10;
        }
        if ($totalImgs > 0 && $dimsImgs / $totalImgs >= 0.5) {
            $perfScore += 5;
        }
        if ($fetchTimeMs < 1000) {
            $perfScore += 10;
        } elseif ($fetchTimeMs < 2000) {
            $perfScore += 5;
        }

        $asyncScripts = $parser->xpathCount('//script[@src][@async] | //script[@src][@defer]');
        if ($scripts > 0 && $asyncScripts / $scripts >= 0.5) {
            $perfScore += 10;
        }

        $perfScore = max(0, min(100, $perfScore));

        // Accessibility
        $a11yScore = 100;

        if ($parser->htmlLang() === '') {
            $a11yScore -= 15;
        }

        $missingAltCount = 0;
        foreach ($images as $img) {
            // Matches Cheerio's `!$(el).attr('alt')`: an empty alt="" is
            // also falsy in JS, so it counts as missing here too.
            if (!$img->hasAttribute('alt') || $img->getAttribute('alt') === '') {
                $missingAltCount++;
            }
        }
        if ($totalImgs > 0) {
            $a11yScore -= (int) round(($missingAltCount / $totalImgs) * 20);
        }

        $inputEls = $parser->queryElements('//input[not(@type="hidden")] | //select | //textarea');
        $totalInputs = count($inputEls);
        if ($totalInputs > 0) {
            $labeled = 0;
            foreach ($inputEls as $el) {
                $id = $el->getAttribute('id');
                $hasLabel = $id !== '' && $parser->xpathCount("//label[@for=\"{$id}\"]") > 0;
                $hasAria = $el->hasAttribute('aria-label') || $el->hasAttribute('aria-labelledby');
                if ($hasLabel || $hasAria) {
                    $labeled++;
                }
            }
            $ratio = $labeled / $totalInputs;
            if ($ratio < 0.5) {
                $a11yScore -= 20;
            } elseif ($ratio < 1) {
                $a11yScore -= 10;
            }
        }

        if ($parser->xpathCount('//main | //*[@role="main"]') === 0) {
            $a11yScore -= 5;
        }

        $genericText = ['click here', 'here', 'read more', 'more', 'link', 'this'];
        $genericLinks = 0;
        foreach ($parser->queryElements('//a') as $a) {
            if (in_array(strtolower(trim($a->textContent)), $genericText, true)) {
                $genericLinks++;
            }
        }
        $a11yScore -= min($genericLinks * 3, 15);

        if ($parser->countTag('h1') === 0 && $parser->countTag('h2') > 0) {
            $a11yScore -= 10;
        }

        $a11yScore = max(0, min(100, $a11yScore));

        return [
            'performance' => $perfScore,
            'accessibility' => $a11yScore,
            'bestPractices' => 0,
            'seo' => 0,
            'status' => ($perfScore >= 80 && $a11yScore >= 80) ? 'pass' : ($perfScore >= 50 ? 'warning' : 'fail'),
        ];
    }

    /** @param array<string,bool> $headers @return array{ssl:bool,https:bool,headers:array<string,bool>,score:int,status:string} */
    public static function securityCheck(bool $isHttps, array $headers): array
    {
        $score = 0;
        if ($isHttps) {
            $score += 50;
        }
        $present = count(array_filter($headers));
        $score += count($headers) > 0 ? (int) round(($present / count($headers)) * 40) : 0;

        $status = $isHttps ? ($score >= 80 ? 'pass' : 'warning') : 'fail';

        return ['ssl' => $isHttps, 'https' => $isHttps, 'headers' => $headers, 'score' => $score, 'status' => $status];
    }

    /** @return list<array{keyword:string, density:float, count:int}> */
    public static function keywordDensity(string $text): array
    {
        $words = array_values(array_filter(
            preg_split('/\W+/u', mb_strtolower($text)) ?: [],
            static fn ($w) => mb_strlen($w) > 3
        ));

        $freq = [];
        foreach ($words as $word) {
            $freq[$word] = ($freq[$word] ?? 0) + 1;
        }

        arsort($freq);
        $top = array_slice($freq, 0, 10, true);
        $total = count($words) ?: 1;

        $out = [];
        foreach ($top as $keyword => $count) {
            $out[] = ['keyword' => $keyword, 'density' => round(($count / $total) * 100, 2), 'count' => $count];
        }
        return $out;
    }

    public static function grade(int $overall): string
    {
        if ($overall >= 90) {
            return 'A';
        }
        if ($overall >= 75) {
            return 'B';
        }
        if ($overall >= 60) {
            return 'C';
        }
        if ($overall >= 45) {
            return 'D';
        }
        return 'F';
    }
}
