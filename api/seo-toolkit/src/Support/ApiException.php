<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Thrown deliberately by controllers/services to produce a specific HTTP
 * status + safe client-facing message. Anything else (uncaught TypeError,
 * DB/file errors, etc.) is treated as a 500 by the ErrorHandler.
 */
final class ApiException extends \RuntimeException
{
    /** @param list<string> $errors */
    public function __construct(
        string $message,
        private readonly int $statusCode = 400,
        private readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /** @return list<string> */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
