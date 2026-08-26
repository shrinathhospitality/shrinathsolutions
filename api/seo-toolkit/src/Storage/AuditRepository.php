<?php

declare(strict_types=1);

namespace App\Storage;

/**
 * Persists audit and competitor-comparison job records as JSON under
 * storage/audits/{id}.json (both resource kinds share the directory,
 * distinguished by the "kind" field — "audit" or "competitor" — since both
 * are just {id, kind, status, createdAt, expiresAt, result|error} records).
 *
 * Because analysis in this product is single-page and synchronous (see the
 * conversion plan — the Node version never had a job queue either), a job
 * is always written already in its final state ("completed" or "failed").
 * The repository still models "queued"/"processing"/"expired" so the
 * GET .../status contract is meaningful and forward-compatible.
 */
final class AuditRepository
{
    private readonly FileStorage $storage;

    public function __construct(string $storageRoot, private readonly int $retentionHours)
    {
        $this->storage = new FileStorage($storageRoot . '/audits');
        $this->storage->sweepExpired($retentionHours * 3600);
    }

    public static function generateId(): string
    {
        return bin2hex(random_bytes(16));
    }

    /** @param array<string, mixed> $result */
    public function saveCompleted(string $id, string $kind, array $result): void
    {
        $now = time();
        $this->storage->putJson($id, [
            'id' => $id,
            'kind' => $kind,
            'status' => 'completed',
            'createdAt' => date('c', $now),
            'expiresAt' => date('c', $now + $this->retentionHours * 3600),
            'result' => $result,
            'error' => null,
        ]);
    }

    public function saveFailed(string $id, string $kind, string $error): void
    {
        $now = time();
        $this->storage->putJson($id, [
            'id' => $id,
            'kind' => $kind,
            'status' => 'failed',
            'createdAt' => date('c', $now),
            'expiresAt' => date('c', $now + $this->retentionHours * 3600),
            'result' => null,
            'error' => $error,
        ]);
    }

    /** @return array<string, mixed>|null */
    public function find(string $id): ?array
    {
        if (!FileStorage::isSafeId($id)) {
            return null;
        }

        $record = $this->storage->getJson($id);
        if ($record === null) {
            return null;
        }

        $expiresAt = strtotime((string) ($record['expiresAt'] ?? ''));
        if ($expiresAt !== false && $expiresAt < time()) {
            $record['status'] = 'expired';
            $record['result'] = null;
        }

        return $record;
    }
}
