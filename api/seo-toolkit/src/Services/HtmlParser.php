<?php

declare(strict_types=1);

namespace App\Services;

/**
 * DOM-based HTML extraction — the PHP equivalent of the Cheerio queries in
 * seoAnalyzer.ts's extractSEOMetrics(). Uses DOMDocument/DOMXPath instead of
 * Cheerio's jQuery-like API; malformed HTML is tolerated the same way
 * Cheerio tolerates it (libxml's HTML parser is very lenient and never
 * throws — it just does its best and reports recoverable warnings, which
 * are suppressed here).
 */
final class HtmlParser
{
    private readonly \DOMDocument $dom;
    private readonly \DOMXPath $xpath;

    public function __construct(private readonly string $html)
    {
        $this->dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        // The pseudo XML PI forces libxml's HTML parser to read the document
        // as UTF-8 without mis-decoding already-UTF-8 bytes; libxml discards
        // it from the resulting tree for loadHTML().
        $this->dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $this->xpath = new \DOMXPath($this->dom);
    }

    public function rawHtml(): string
    {
        return $this->html;
    }

    public function bodyText(): string
    {
        $body = $this->dom->getElementsByTagName('body')->item(0);
        return $body !== null ? trim(preg_replace('/\s+/', ' ', $body->textContent) ?? '') : '';
    }

    /** @return array{title: string, titleLength: int, description: string, descriptionLength: int, canonical: string, robots: string} */
    public function extractMeta(): array
    {
        $title = trim($this->firstText('//title'));
        $description = trim($this->metaContent('description'));
        $canonical = trim($this->linkHref('canonical'));
        $robots = trim($this->metaContent('robots'));

        return [
            'title' => $title,
            'titleLength' => mb_strlen($title),
            'description' => $description,
            'descriptionLength' => mb_strlen($description),
            'canonical' => $canonical,
            'robots' => $robots,
        ];
    }

    /** @return array{h1Count: int, h2Count: int, h3Count: int, h4Count: int, hasH1: bool, multipleH1: bool} */
    public function extractHeadings(): array
    {
        $h1 = $this->dom->getElementsByTagName('h1')->length;
        $h2 = $this->dom->getElementsByTagName('h2')->length;
        $h3 = $this->dom->getElementsByTagName('h3')->length;
        $h4 = $this->dom->getElementsByTagName('h4')->length;

        return [
            'h1Count' => $h1,
            'h2Count' => $h2,
            'h3Count' => $h3,
            'h4Count' => $h4,
            'hasH1' => $h1 > 0,
            'multipleH1' => $h1 > 1,
        ];
    }

    /** @return array{totalImages: int, missingAlt: int, missingTitle: int} */
    public function extractImages(): array
    {
        $images = $this->dom->getElementsByTagName('img');
        $missingAlt = 0;
        $missingTitle = 0;

        foreach ($images as $img) {
            /** @var \DOMElement $img */
            // Matches Node's `!img.attr('alt')`: Cheerio's .attr() returns the
            // empty string for alt="", and `!''` is true in JS — so an
            // explicit empty alt/title IS counted as missing there, not just
            // an absent attribute. Verified against the fixture parity test.
            if (!$img->hasAttribute('alt') || $img->getAttribute('alt') === '') {
                $missingAlt++;
            }
            if (!$img->hasAttribute('title') || $img->getAttribute('title') === '') {
                $missingTitle++;
            }
        }

        return ['totalImages' => $images->length, 'missingAlt' => $missingAlt, 'missingTitle' => $missingTitle];
    }

    /** @return array{internalLinks: int, externalLinks: int} */
    public function extractLinkCounts(string $hostname): array
    {
        $internal = 0;
        $external = 0;

        foreach ($this->xpath->query('//a[@href]') as $a) {
            /** @var \DOMElement $a */
            $href = $a->getAttribute('href');
            if (preg_match('#^https?://#i', $href) === 1) {
                if (str_contains($href, $hostname)) {
                    $internal++;
                } else {
                    $external++;
                }
            } else {
                $internal++;
            }
        }

        return ['internalLinks' => $internal, 'externalLinks' => $external];
    }

    public function hasJsonLd(): bool
    {
        return $this->xpath->query('//script[@type="application/ld+json"]')->length > 0;
    }

    public function hasMicrodata(): bool
    {
        return $this->xpath->query('//*[@itemscope]')->length > 0;
    }

    /** @return array{title: bool, description: bool, image: bool} */
    public function openGraphTags(): array
    {
        return [
            'title' => $this->hasMetaProperty('og:title'),
            'description' => $this->hasMetaProperty('og:description'),
            'image' => $this->hasMetaProperty('og:image'),
        ];
    }

    public function hasTwitterCard(): bool
    {
        return $this->xpath->query('//meta[@name="twitter:card"]')->length > 0;
    }

    public function viewportContent(): ?string
    {
        $node = $this->xpath->query('//meta[@name="viewport"]')->item(0);
        if ($node === null) {
            return null;
        }
        return $node instanceof \DOMElement ? $node->getAttribute('content') : '';
    }

    public function htmlLang(): string
    {
        $html = $this->dom->getElementsByTagName('html')->item(0);
        return $html instanceof \DOMElement ? trim($html->getAttribute('lang')) : '';
    }

    /** All inline <style> block contents, concatenated (mirrors Cheerio's $('style') join). */
    public function inlineStyleText(): string
    {
        $out = [];
        foreach ($this->dom->getElementsByTagName('style') as $style) {
            $out[] = $style->textContent;
        }
        return implode(' ', $out);
    }

    /** @return list<string> href values of <link rel="stylesheet"> */
    public function stylesheetHrefs(): array
    {
        $out = [];
        foreach ($this->xpath->query('//link[@rel="stylesheet"]') as $link) {
            /** @var \DOMElement $link */
            $out[] = $link->getAttribute('href');
        }
        return $out;
    }

    public function countTag(string $tag): int
    {
        return $this->dom->getElementsByTagName($tag)->length;
    }

    public function xpathCount(string $expression): int
    {
        return $this->xpath->query($expression)->length;
    }

    /** @return list<\DOMElement> */
    public function queryElements(string $expression): array
    {
        $out = [];
        foreach ($this->xpath->query($expression) as $node) {
            if ($node instanceof \DOMElement) {
                $out[] = $node;
            }
        }
        return $out;
    }

    private function firstText(string $expression): string
    {
        $node = $this->xpath->query($expression)->item(0);
        return $node !== null ? $node->textContent : '';
    }

    private function metaContent(string $name): string
    {
        $node = $this->xpath->query("//meta[@name=\"{$name}\"]")->item(0);
        return $node instanceof \DOMElement ? $node->getAttribute('content') : '';
    }

    private function linkHref(string $rel): string
    {
        $node = $this->xpath->query("//link[@rel=\"{$rel}\"]")->item(0);
        return $node instanceof \DOMElement ? $node->getAttribute('href') : '';
    }

    private function hasMetaProperty(string $property): bool
    {
        return $this->xpath->query("//meta[@property=\"{$property}\"]")->length > 0;
    }
}
