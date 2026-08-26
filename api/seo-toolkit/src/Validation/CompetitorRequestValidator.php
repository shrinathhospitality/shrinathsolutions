<?php

declare(strict_types=1);

namespace App\Validation;

use App\Security\UrlValidator;
use App\Support\ApiException;

/**
 * PHP port of the Node route's zod schema:
 *   z.object({ mainUrl: z.string().url(), competitors: z.array(z.string().url()).min(1).max(3) })
 */
final class CompetitorRequestValidator
{
    private const MAX_COMPETITORS = 3;

    /** @param array<string, mixed> $body @return array{mainUrl: string, competitors: list<string>} */
    public static function validate(array $body): array
    {
        $mainUrl = $body['mainUrl'] ?? null;
        if (!is_string($mainUrl) || trim($mainUrl) === '') {
            throw new ApiException('mainUrl is required and must be a string.', 422);
        }
        UrlValidator::validate($mainUrl);

        $competitors = $body['competitors'] ?? null;
        if (!is_array($competitors) || $competitors === []) {
            throw new ApiException('competitors must be a non-empty array of URLs.', 422);
        }
        if (count($competitors) > self::MAX_COMPETITORS) {
            throw new ApiException('A maximum of ' . self::MAX_COMPETITORS . ' competitors is allowed.', 422);
        }

        $mainHost = UrlValidator::normalizeHost($mainUrl);
        $seenHosts = [$mainHost];
        $validated = [];

        foreach ($competitors as $competitorUrl) {
            if (!is_string($competitorUrl) || trim($competitorUrl) === '') {
                throw new ApiException('Each competitor must be a valid URL string.', 422);
            }
            UrlValidator::validate($competitorUrl);

            $host = UrlValidator::normalizeHost($competitorUrl);
            if (in_array($host, $seenHosts, true)) {
                throw new ApiException("Duplicate domain detected: {$host}. Each site must be unique.", 422);
            }
            $seenHosts[] = $host;
            $validated[] = trim($competitorUrl);
        }

        return ['mainUrl' => trim($mainUrl), 'competitors' => $validated];
    }
}
