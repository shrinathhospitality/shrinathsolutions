<?php

declare(strict_types=1);

namespace App\Security;

use App\Support\ApiException;

/**
 * Syntax-level URL validation. Does not touch the network — see
 * SsrfProtection for DNS resolution + IP-range checks, which must run
 * in addition to this before any outbound request.
 */
final class UrlValidator
{
    private const MAX_URL_LENGTH = 2048;
    private const ALLOWED_SCHEMES = ['http', 'https'];

    /**
     * @throws ApiException on any validation failure
     */
    public static function validate(string $url): void
    {
        $url = trim($url);

        if ($url === '') {
            throw new ApiException('URL is required.', 422);
        }

        if (strlen($url) > self::MAX_URL_LENGTH) {
            throw new ApiException('URL is too long.', 422);
        }

        // filter_var is a syntax check only; never rely on it (or a regex)
        // as the sole SSRF defence — that's SsrfProtection's job.
        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            throw new ApiException('Please provide a valid URL.', 422);
        }

        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            throw new ApiException('Please provide a valid URL.', 422);
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, self::ALLOWED_SCHEMES, true)) {
            throw new ApiException('Only http:// and https:// URLs are supported.', 422);
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new ApiException('URLs with embedded credentials are not allowed.', 422);
        }

        if (isset($parts['port'])) {
            $port = $parts['port'];
            if ($port < 1 || $port > 65535) {
                throw new ApiException('URL contains an invalid port.', 422);
            }
        }

        $host = $parts['host'];
        if ($host === '' || strlen($host) > 253) {
            throw new ApiException('Please provide a valid URL.', 422);
        }
    }

    public static function normalizeHost(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        return is_string($host) ? strtolower($host) : '';
    }
}
