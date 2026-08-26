<?php

declare(strict_types=1);

namespace App\Services;

use App\Security\SsrfProtection;
use App\Security\UrlValidator;
use App\Support\ApiException;
use App\Support\Logger;

/**
 * SSRF-safe HTTP fetcher built on cURL. Replaces the Node version's axios
 * calls (fetchHtml / checkResource / extractSecurityHeaders in
 * seoAnalyzer.ts). Redirects are followed manually (CURLOPT_FOLLOWLOCATION
 * disabled) so every hop's resolved IP is re-validated by SsrfProtection
 * before connecting — the connection is then pinned to that validated IP via
 * CURLOPT_RESOLVE, so a DNS answer that changes between the check and the
 * actual TCP connect (DNS rebinding) can't be used to reach a private host.
 */
final class HttpFetcher
{
    /**
     * @param array{connectTimeoutSeconds:int, requestTimeoutSeconds:int, maxRedirects:int, maxResponseBytes:int, userAgent:string} $config
     */
    public function __construct(private readonly array $config)
    {
    }

    /**
     * @return array{
     *   html: string, statusCode: int, headers: array<string, string>,
     *   finalUrl: string, redirectChain: list<string>, fetchTimeMs: float,
     *   contentType: string
     * }
     */
    public function fetchHtml(string $url): array
    {
        UrlValidator::validate($url);
        $start = microtime(true);

        $result = $this->fetchFollowingRedirects($url, 'GET');

        $contentType = $result['headers']['content-type'] ?? '';
        if ($contentType !== '' && !str_contains(strtolower($contentType), 'html') && !str_contains(strtolower($contentType), 'text/plain')) {
            throw new ApiException("The URL did not return an HTML page (content-type: {$contentType}).", 422);
        }

        $html = self::normalizeToUtf8($result['body'], $contentType);

        return [
            'html' => $html,
            'statusCode' => $result['statusCode'],
            'headers' => $result['headers'],
            'finalUrl' => $result['finalUrl'],
            'redirectChain' => $result['redirectChain'],
            'fetchTimeMs' => (microtime(true) - $start) * 1000,
            'contentType' => $contentType,
        ];
    }

    /**
     * HEAD-style existence check used for /robots.txt and /sitemap.xml,
     * matching the Node `checkResource` helper. Falls back to a ranged GET
     * since some servers don't implement HEAD correctly.
     */
    public function resourceExists(string $baseUrl, string $path): bool
    {
        try {
            $target = self::resolveRelative($baseUrl, $path);
            UrlValidator::validate($target);
            $result = $this->fetchFollowingRedirects($target, 'HEAD');
            return $result['statusCode'] >= 200 && $result['statusCode'] < 400;
        } catch (\Throwable) {
            return false;
        }
    }

    private static function resolveRelative(string $baseUrl, string $path): string
    {
        $parts = parse_url($baseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        return "{$scheme}://{$host}{$port}{$path}";
    }

    /**
     * @return array{body: string, statusCode: int, headers: array<string, string>, finalUrl: string, redirectChain: list<string>}
     */
    private function fetchFollowingRedirects(string $url, string $method): array
    {
        $redirectChain = [];
        $current = $url;
        $maxRedirects = $this->config['maxRedirects'];

        for ($hop = 0; $hop <= $maxRedirects; $hop++) {
            $parts = parse_url($current);
            if ($parts === false || !isset($parts['host'])) {
                throw new ApiException('The URL could not be parsed.', 422);
            }

            $resolvedIps = SsrfProtection::resolveAndValidateHost($parts['host']);
            $response = $this->curlRequest($current, $method, $parts['host'], $resolvedIps[0]);

            if (in_array($response['statusCode'], [301, 302, 303, 307, 308], true) && isset($response['headers']['location'])) {
                $next = self::resolveLocation($current, $response['headers']['location']);
                UrlValidator::validate($next);
                $redirectChain[] = $current;
                $current = $next;
                continue;
            }

            $response['finalUrl'] = $current;
            $response['redirectChain'] = $redirectChain;
            return $response;
        }

        throw new ApiException('Too many redirects.', 422);
    }

    private static function resolveLocation(string $baseUrl, string $location): string
    {
        if (preg_match('#^https?://#i', $location) === 1) {
            return $location;
        }

        $base = parse_url($baseUrl);
        $scheme = $base['scheme'] ?? 'https';
        $host = $base['host'] ?? '';
        $port = isset($base['port']) ? ':' . $base['port'] : '';

        if (str_starts_with($location, '/')) {
            return "{$scheme}://{$host}{$port}{$location}";
        }

        $basePath = $base['path'] ?? '/';
        $dir = substr($basePath, 0, (int) strrpos($basePath, '/') + 1);
        return "{$scheme}://{$host}{$port}{$dir}{$location}";
    }

    /**
     * @return array{body: string, statusCode: int, headers: array<string, string>}
     */
    private function curlRequest(string $url, string $method, string $host, string $pinnedIp): array
    {
        $parts = parse_url($url);
        $scheme = $parts['scheme'] ?? 'https';
        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);

        $ch = curl_init();
        $bodyBuffer = '';
        $headerBuffer = [];
        $maxBytes = $this->config['maxResponseBytes'];
        $bytesReceived = 0;

        $options = [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => $method === 'HEAD' ? null : $method,
            CURLOPT_NOBODY => $method === 'HEAD',
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => $this->config['connectTimeoutSeconds'],
            CURLOPT_TIMEOUT => $this->config['requestTimeoutSeconds'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING => '', // accept + auto-decompress gzip/deflate/br
            CURLOPT_USERAGENT => $this->config['userAgent'],
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            // Pin the TCP connection to the IP we already validated, while
            // keeping the original Host header / SNI for virtual hosting.
            CURLOPT_RESOLVE => ["{$host}:{$port}:{$pinnedIp}"],
            CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$headerBuffer): int {
                $len = strlen($line);
                $trimmed = trim($line);
                if ($trimmed !== '' && str_contains($trimmed, ':')) {
                    [$key, $value] = explode(':', $trimmed, 2);
                    $headerBuffer[strtolower(trim($key))] = trim($value);
                }
                return $len;
            },
            CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$bodyBuffer, &$bytesReceived, $maxBytes): int {
                $bytesReceived += strlen($chunk);
                if ($bytesReceived > $maxBytes) {
                    return 0; // abort transfer — exceeds the size cap
                }
                $bodyBuffer .= $chunk;
                return strlen($chunk);
            },
        ];

        // Optional CA bundle override — needed on some local/Windows dev
        // environments whose system CA store curl can't locate. Production
        // (Linux shared hosting) has a system bundle and never sets this.
        if (!empty($this->config['caBundlePath'])) {
            $options[CURLOPT_CAINFO] = $this->config['caBundlePath'];
        }

        curl_setopt_array($ch, $options);

        $ok = curl_exec($ch);
        $errNo = curl_errno($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($ok === false) {
            Logger::warning('cURL request failed', ['url' => $url, 'error' => $error, 'errno' => $errNo]);
            if ($errNo === CURLE_WRITE_ERROR || $bytesReceived > $maxBytes) {
                throw new ApiException('The page is too large to analyze (exceeds 5MB).', 413);
            }
            throw new ApiException('Failed to fetch the URL. It may be unreachable or timed out.', 503);
        }

        return ['body' => $bodyBuffer, 'statusCode' => $statusCode, 'headers' => $headerBuffer];
    }

    private static function normalizeToUtf8(string $html, string $contentType): string
    {
        $charset = null;
        if (preg_match('/charset=([^\s;]+)/i', $contentType, $m) === 1) {
            $charset = trim($m[1], "\"' ");
        }
        if ($charset === null && preg_match('/<meta[^>]+charset=["\']?([a-zA-Z0-9_-]+)/i', $html, $m) === 1) {
            $charset = $m[1];
        }
        $charset = $charset !== null ? strtoupper($charset) : 'UTF-8';

        if ($charset === 'UTF-8' || $charset === 'UTF8') {
            return $html;
        }

        $converted = @mb_convert_encoding($html, 'UTF-8', $charset);
        return $converted !== false ? $converted : $html;
    }
}
