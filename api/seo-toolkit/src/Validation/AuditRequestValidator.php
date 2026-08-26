<?php

declare(strict_types=1);

namespace App\Validation;

use App\Security\UrlValidator;
use App\Support\ApiException;

/**
 * PHP port of the Node route's zod schema: z.object({ url: z.string().url() }).
 */
final class AuditRequestValidator
{
    /** @param array<string, mixed> $body @return array{url: string} */
    public static function validate(array $body): array
    {
        $url = $body['url'] ?? null;
        if (!is_string($url) || trim($url) === '') {
            throw new ApiException('url is required and must be a string.', 422);
        }

        UrlValidator::validate($url);

        return ['url' => trim($url)];
    }
}
