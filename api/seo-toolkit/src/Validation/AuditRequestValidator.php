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
    /** @param array<string, mixed> $body @return array{url: string, leadName: ?string, leadEmail: ?string} */
    public static function validate(array $body): array
    {
        $url = $body['url'] ?? null;
        if (!is_string($url) || trim($url) === '') {
            throw new ApiException('url is required and must be a string.', 422);
        }

        UrlValidator::validate($url);

        // Optional lead-capture fields — the tool works with just a URL; these are only
        // recorded (admin-side visibility) when the caller actually sends them. Never
        // required, never used to gate the result.
        $leadName = is_string($body['leadName'] ?? null) ? trim($body['leadName']) : null;
        $leadEmail = is_string($body['leadEmail'] ?? null) ? trim($body['leadEmail']) : null;
        if ($leadName !== null && mb_strlen($leadName) > 150) {
            throw new ApiException('leadName is too long (max 150 characters).', 422);
        }
        if ($leadEmail !== null && $leadEmail !== '') {
            if (mb_strlen($leadEmail) > 255) {
                throw new ApiException('leadEmail is too long (max 255 characters).', 422);
            }
            if (!filter_var($leadEmail, FILTER_VALIDATE_EMAIL)) {
                throw new ApiException('leadEmail must be a valid email address.', 422);
            }
            // Header-injection guard: an email address can never legitimately contain a
            // newline, and this value only ever reaches storage/display, never a mail header
            // today — but reject it outright so it stays true if that ever changes.
            if (preg_match('/[\r\n]/', $leadEmail) === 1) {
                throw new ApiException('leadEmail must be a valid email address.', 422);
            }
        }

        return [
            'url' => trim($url),
            'leadName' => $leadName !== '' ? $leadName : null,
            'leadEmail' => $leadEmail !== '' ? $leadEmail : null,
        ];
    }
}
