<?php

declare(strict_types=1);

namespace App\Storage;

/**
 * Generic JSON/binary file storage helper: atomic writes (write to a temp
 * file, then rename — rename is atomic on the same filesystem), exclusive
 * locking, and safe filename validation so callers can never escape the
 * intended directory.
 */
final class FileStorage
{
    public function __construct(private readonly string $baseDir)
    {
        if (!is_dir($this->baseDir)) {
            mkdir($this->baseDir, 0750, true);
        }
    }

    public static function isSafeId(string $id): bool
    {
        return preg_match('/^[A-Za-z0-9_-]{8,128}$/', $id) === 1;
    }

    /** @param array<string, mixed> $data */
    public function putJson(string $id, array $data): void
    {
        $this->assertSafe($id);
        $this->writeAtomic($this->pathFor($id, 'json'), json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}');
    }

    /** @return array<string, mixed>|null */
    public function getJson(string $id): ?array
    {
        $this->assertSafe($id);
        $path = $this->pathFor($id, 'json');
        if (!is_file($path)) {
            return null;
        }

        $fh = fopen($path, 'r');
        if ($fh === false) {
            return null;
        }
        flock($fh, LOCK_SH);
        $raw = stream_get_contents($fh);
        flock($fh, LOCK_UN);
        fclose($fh);

        if ($raw === false || $raw === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    public function putBinary(string $id, string $extension, string $contents): void
    {
        $this->assertSafe($id);
        $this->writeAtomic($this->pathFor($id, $extension), $contents);
    }

    public function getBinary(string $id, string $extension): ?string
    {
        $this->assertSafe($id);
        $path = $this->pathFor($id, $extension);
        if (!is_file($path)) {
            return null;
        }
        $contents = file_get_contents($path);
        return $contents === false ? null : $contents;
    }

    public function exists(string $id, string $extension = 'json'): bool
    {
        $this->assertSafe($id);
        return is_file($this->pathFor($id, $extension));
    }

    public function mtime(string $id, string $extension = 'json'): ?int
    {
        $this->assertSafe($id);
        $path = $this->pathFor($id, $extension);
        $mtime = @filemtime($path);
        return $mtime === false ? null : $mtime;
    }

    public function delete(string $id, string $extension): void
    {
        $this->assertSafe($id);
        $path = $this->pathFor($id, $extension);
        if (is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * Deletes every file in this store older than $maxAgeSeconds. Called
     * opportunistically on writes rather than via a dedicated cron job,
     * since standard shared hosting may not offer one.
     */
    public function sweepExpired(int $maxAgeSeconds): void
    {
        $files = @scandir($this->baseDir);
        if ($files === false) {
            return;
        }

        $now = time();
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }
            $path = $this->baseDir . '/' . $file;
            $mtime = @filemtime($path);
            if ($mtime !== false && ($now - $mtime) > $maxAgeSeconds) {
                @unlink($path);
            }
        }
    }

    private function assertSafe(string $id): void
    {
        if (!self::isSafeId($id)) {
            throw new \InvalidArgumentException('Invalid storage identifier.');
        }
    }

    private function pathFor(string $id, string $extension): string
    {
        return $this->baseDir . '/' . $id . '.' . $extension;
    }

    private function writeAtomic(string $path, string $contents): void
    {
        $tmp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
        $fh = fopen($tmp, 'wb');
        if ($fh === false) {
            throw new \RuntimeException('Unable to write to storage.');
        }
        flock($fh, LOCK_EX);
        fwrite($fh, $contents);
        fflush($fh);
        flock($fh, LOCK_UN);
        fclose($fh);
        rename($tmp, $path);
    }
}
