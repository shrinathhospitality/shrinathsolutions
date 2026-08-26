<?php

declare(strict_types=1);

namespace App\Security;

use App\Support\ApiException;

/**
 * Simple fixed-window, file-based rate limiter keyed by client IP + bucket
 * name. Good enough for shared hosting without Redis/Memcached — one small
 * JSON file per (ip, bucket), written atomically under an exclusive lock.
 */
final class RateLimiter
{
    /** @param list<string> $trustedProxies */
    public function __construct(
        private readonly string $storageDir,
        private readonly array $trustedProxies = [],
    ) {
        if (!is_dir($this->storageDir)) {
            mkdir($this->storageDir, 0750, true);
        }
    }

    /**
     * @throws ApiException (429) when the limit for this bucket is exceeded
     */
    public function check(string $bucket, int $limit, int $windowSeconds): void
    {
        if ($limit <= 0) {
            return;
        }

        $ip = $this->clientIp();
        $key = hash('sha256', $ip . '|' . $bucket);
        $file = $this->storageDir . '/' . $key . '.json';

        $fh = fopen($file, 'c+');
        if ($fh === false) {
            // Fail open rather than break the API if storage is briefly unwritable.
            return;
        }

        flock($fh, LOCK_EX);

        $raw = stream_get_contents($fh);
        $data = $raw !== false && $raw !== '' ? json_decode($raw, true) : null;
        $now = time();

        if (!is_array($data) || !isset($data['windowStart']) || ($now - (int) $data['windowStart']) >= $windowSeconds) {
            $data = ['windowStart' => $now, 'count' => 0];
        }

        $data['count'] = (int) $data['count'] + 1;

        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($data));
        fflush($fh);
        flock($fh, LOCK_UN);
        fclose($fh);

        if ($data['count'] > $limit) {
            $retryAfter = max(1, $windowSeconds - ($now - (int) $data['windowStart']));
            header('Retry-After: ' . $retryAfter);
            throw new ApiException(
                "Rate limit exceeded for this action. Please try again in {$retryAfter} seconds.",
                429,
            );
        }
    }

    private function clientIp(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        if (in_array($remote, $this->trustedProxies, true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $forwarded = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
            $candidate = trim($forwarded[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP) !== false) {
                return $candidate;
            }
        }

        return is_string($remote) ? $remote : '0.0.0.0';
    }
}
