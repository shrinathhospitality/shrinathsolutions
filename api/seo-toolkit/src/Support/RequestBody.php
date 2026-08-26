<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Reads and JSON-decodes the request body with a size cap and strict
 * content-type validation — mirrors Express's express.json({ limit }).
 */
final class RequestBody
{
    private const MAX_BYTES = 1_048_576; // 1MB — payloads here are just a few URLs

    /** @return array<string, mixed> */
    public static function json(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        if ($contentType !== '' && !str_contains(strtolower($contentType), 'application/json')) {
            throw new ApiException('Content-Type must be application/json.', 415);
        }

        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BYTES + 1);
        if ($raw === false) {
            throw new ApiException('Unable to read request body.', 400);
        }

        if (strlen($raw) > self::MAX_BYTES) {
            throw new ApiException('Request body is too large.', 413);
        }

        if (trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('Request body must be valid JSON.', 400);
        }

        return $data;
    }
}
