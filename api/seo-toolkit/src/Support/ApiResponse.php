<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Standard API response envelope: {success, data, message, errors}.
 */
final class ApiResponse
{
    /** @param array<string, mixed>|list<mixed>|null $data */
    public static function success(mixed $data = null, ?string $message = null, int $statusCode = 200): never
    {
        self::send($statusCode, [
            'success' => true,
            'data' => $data,
            'message' => $message,
            'errors' => [],
        ]);
    }

    /** @param list<string> $errors */
    public static function error(string $message, int $statusCode = 400, array $errors = []): never
    {
        self::send($statusCode, [
            'success' => false,
            'data' => null,
            'message' => $message,
            'errors' => $errors,
        ]);
    }

    /** @param array<string, mixed> $payload */
    private static function send(int $statusCode, array $payload): never
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
