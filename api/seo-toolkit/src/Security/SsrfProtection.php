<?php

declare(strict_types=1);

namespace App\Security;

use App\Support\ApiException;

/**
 * Resolves a hostname and rejects it if ANY resolved IP falls in a private,
 * loopback, link-local, or cloud-metadata range. Must be called again for
 * every redirect hop (DNS rebinding: a hostname can resolve to a public IP
 * on first lookup and a private one moments later, or vice versa, so the
 * check has to happen against the IP actually being connected to each time).
 */
final class SsrfProtection
{
    /** IPv4 CIDR ranges that must never be reachable from this server. */
    private const BLOCKED_IPV4_RANGES = [
        '0.0.0.0/8',
        '10.0.0.0/8',
        '100.64.0.0/10',      // CGNAT
        '127.0.0.0/8',        // loopback
        '169.254.0.0/16',     // link-local (incl. 169.254.169.254 cloud metadata)
        '172.16.0.0/12',
        '192.0.0.0/24',       // IETF protocol assignments
        '192.0.2.0/24',       // TEST-NET-1
        '192.168.0.0/16',
        '198.18.0.0/15',      // benchmarking
        '198.51.100.0/24',    // TEST-NET-2
        '203.0.113.0/24',     // TEST-NET-3
        '224.0.0.0/4',        // multicast
        '240.0.0.0/4',        // reserved
        '255.255.255.255/32',
    ];

    /** IPv6 CIDR ranges that must never be reachable from this server. */
    private const BLOCKED_IPV6_RANGES = [
        '::1/128',           // loopback
        '::/128',            // unspecified
        '::ffff:0:0/96',     // IPv4-mapped (checked separately via the mapped v4)
        '64:ff9b::/96',      // NAT64
        'fc00::/7',          // unique local (private)
        'fe80::/10',         // link-local
        'ff00::/8',          // multicast
        '2001:db8::/32',     // documentation
    ];

    /** Known cloud metadata hostnames some SSRF payloads use directly. */
    private const BLOCKED_HOSTNAMES = [
        'localhost',
        'metadata.google.internal',
    ];

    /**
     * Resolve the host and verify every A/AAAA record is publicly routable.
     * Returns the list of resolved IPs on success (callers use these to
     * connect directly + set the Host header, avoiding a second DNS lookup
     * that could return a different, unvalidated address — mitigating
     * DNS-rebinding races between check and connect).
     *
     * @return list<string>
     * @throws ApiException if the host is missing, unresolvable, or resolves
     *                       to any disallowed address
     */
    public static function resolveAndValidateHost(string $host): array
    {
        $host = strtolower(trim($host, ".\t\n\r\0\x0B"));

        if ($host === '' || in_array($host, self::BLOCKED_HOSTNAMES, true)) {
            throw new ApiException('This host is not allowed.', 422);
        }

        // Internal/local-looking single-label hostnames (e.g. "router", "nas")
        // are blocked outright — they can only resolve on a private network.
        if (!str_contains($host, '.') && filter_var($host, FILTER_VALIDATE_IP) === false) {
            throw new ApiException('This host is not allowed.', 422);
        }

        // Bracketed IPv6 literal, e.g. host part came from parse_url as "[::1]"
        $host = trim($host, '[]');

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            self::assertIpAllowed($host);
            return [$host];
        }

        $records = @dns_get_record($host, DNS_A + DNS_AAAA);
        if ($records === false || $records === []) {
            throw new ApiException('The domain could not be resolved.', 422);
        }

        $ips = [];
        foreach ($records as $record) {
            $ip = $record['ip'] ?? $record['ipv6'] ?? null;
            if (is_string($ip) && $ip !== '') {
                $ips[] = $ip;
            }
        }

        if ($ips === []) {
            throw new ApiException('The domain could not be resolved.', 422);
        }

        foreach ($ips as $ip) {
            self::assertIpAllowed($ip);
        }

        return $ips;
    }

    private static function assertIpAllowed(string $ip): void
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            foreach (self::BLOCKED_IPV4_RANGES as $range) {
                if (self::ipv4InCidr($ip, $range)) {
                    throw new ApiException('This IP address is not allowed.', 422);
                }
            }
            return;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            // IPv4-mapped IPv6 (::ffff:a.b.c.d) — validate the embedded IPv4.
            if (str_starts_with(strtolower($ip), '::ffff:') && str_contains($ip, '.')) {
                $mapped = substr($ip, 7);
                if (filter_var($mapped, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                    self::assertIpAllowed($mapped);
                    return;
                }
            }

            foreach (self::BLOCKED_IPV6_RANGES as $range) {
                if (self::ipv6InCidr($ip, $range)) {
                    throw new ApiException('This IP address is not allowed.', 422);
                }
            }
            return;
        }

        throw new ApiException('This IP address is not allowed.', 422);
    }

    private static function ipv4InCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = array_pad(explode('/', $cidr, 2), 2, '32');
        $bits = (int) $bits;

        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        if ($bits === 0) {
            return true;
        }

        $mask = -1 << (32 - $bits);
        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    private static function ipv6InCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = array_pad(explode('/', $cidr, 2), 2, '128');
        $bits = (int) $bits;

        $ipBin = @inet_pton($ip);
        $subnetBin = @inet_pton($subnet);
        if ($ipBin === false || $subnetBin === false) {
            return false;
        }

        $bytes = intdiv($bits, 8);
        $remainderBits = $bits % 8;

        if ($bytes > 0 && substr($ipBin, 0, $bytes) !== substr($subnetBin, 0, $bytes)) {
            return false;
        }

        if ($remainderBits === 0) {
            return true;
        }

        $mask = 0xFF << (8 - $remainderBits) & 0xFF;
        return (ord($ipBin[$bytes]) & $mask) === (ord($subnetBin[$bytes]) & $mask);
    }
}
