<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Minimal file-based logger. Writes one JSON line per event to
 * storage/logs/app.log. Never logs passwords, API keys, Authorization
 * headers, or full request bodies — callers pass only safe summaries.
 */
final class Logger
{
    private static ?string $logDir = null;

    public static function init(string $logDir): void
    {
        self::$logDir = $logDir;
        if (!is_dir($logDir)) {
            mkdir($logDir, 0750, true);
        }
    }

    /** @param array<string, mixed> $context */
    public static function info(string $message, array $context = [], ?string $requestId = null): void
    {
        self::write('info', $message, $context, $requestId);
    }

    /** @param array<string, mixed> $context */
    public static function warning(string $message, array $context = [], ?string $requestId = null): void
    {
        self::write('warning', $message, $context, $requestId);
    }

    /** @param array<string, mixed> $context */
    public static function error(string $message, array $context = [], ?string $requestId = null): void
    {
        self::write('error', $message, self::redact($context), $requestId);
    }

    /** @param array<string, mixed> $context */
    private static function write(string $level, string $message, array $context, ?string $requestId): void
    {
        if (self::$logDir === null) {
            return;
        }

        $line = json_encode([
            'ts' => date('c'),
            'level' => $level,
            'requestId' => $requestId,
            'message' => $message,
            'context' => self::redact($context),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $file = self::$logDir . '/app.log';
        $fh = @fopen($file, 'ab');
        if ($fh === false) {
            return;
        }
        flock($fh, LOCK_EX);
        fwrite($fh, $line . PHP_EOL);
        flock($fh, LOCK_UN);
        fclose($fh);
    }

    /** @param array<string, mixed> $context @return array<string, mixed> */
    private static function redact(array $context): array
    {
        $blocked = ['password', 'authorization', 'auth', 'secret', 'token', 'apikey', 'api_key'];
        foreach ($context as $key => $value) {
            if (in_array(strtolower((string) $key), $blocked, true)) {
                $context[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $context[$key] = self::redact($value);
            }
        }
        return $context;
    }
}
