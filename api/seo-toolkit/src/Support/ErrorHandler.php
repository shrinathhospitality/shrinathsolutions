<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Centralised error handling. Development mode (APP_ENV != production)
 * includes exception details in the response for local debugging;
 * production mode always returns a generic message and logs the detail
 * server-side, tagged with a request ID so the two can be matched up.
 */
final class ErrorHandler
{
    private static string $requestId = '';
    private static bool $isProduction = true;

    public static function register(bool $isProduction): string
    {
        self::$isProduction = $isProduction;
        self::$requestId = bin2hex(random_bytes(8));

        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) {
                return false;
            }
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        set_exception_handler(static function (\Throwable $e): void {
            self::handle($e);
        });

        return self::$requestId;
    }

    public static function requestId(): string
    {
        return self::$requestId;
    }

    public static function handle(\Throwable $e): void
    {
        if ($e instanceof ApiException) {
            Logger::warning($e->getMessage(), [
                'exception' => $e::class,
                'statusCode' => $e->getStatusCode(),
            ], self::$requestId);

            ApiResponse::error($e->getMessage(), $e->getStatusCode(), $e->getErrors());
        }

        Logger::error($e->getMessage(), [
            'exception' => $e::class,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ], self::$requestId);

        $message = self::$isProduction
            ? 'An unexpected error occurred. Please try again later.'
            : $e->getMessage() . ' in ' . basename($e->getFile()) . ':' . $e->getLine();

        ApiResponse::error($message, 500, self::$isProduction ? [] : [$e::class]);
    }
}
