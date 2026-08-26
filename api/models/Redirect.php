<?php
declare(strict_types=1);

function normalize_path(string $url): string
{
    $path = parse_url($url, PHP_URL_PATH) ?? $url;
    $path = '/' . ltrim($path, '/');
    return rtrim($path, '/') ?: '/';
}

function list_redirects(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];
    if ($params['search'] !== '') {
        $where[] = '(source_url LIKE :search1 OR destination_url LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM redirects $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM redirects $whereSql ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}");
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_redirect(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM redirects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function find_active_redirect_by_source(PDO $pdo, string $path): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM redirects WHERE source_url = :src AND status = 'active' LIMIT 1");
    $stmt->execute(['src' => normalize_path($path)]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function redirect_source_taken(PDO $pdo, string $source, ?int $excludeId): bool
{
    $sql = 'SELECT id FROM redirects WHERE source_url = :source';
    $bind = ['source' => $source];
    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $bind['id'] = $excludeId;
    }
    $stmt = $pdo->prepare($sql . ' LIMIT 1');
    $stmt->execute($bind);
    return (bool) $stmt->fetch();
}

/** Detects whether adding source -> destination would create a redirect loop, following
 *  existing chains up to a safe depth. */
function redirect_creates_loop(PDO $pdo, string $source, string $destination, ?int $excludeId): bool
{
    $current = normalize_path($destination);
    $source = normalize_path($source);

    for ($i = 0; $i < 20; $i++) {
        if ($current === $source) {
            return true;
        }
        $sql = 'SELECT destination_url FROM redirects WHERE source_url = :src';
        $bind = ['src' => $current];
        if ($excludeId !== null) {
            $sql .= ' AND id != :id';
            $bind['id'] = $excludeId;
        }
        $stmt = $pdo->prepare($sql . ' LIMIT 1');
        $stmt->execute($bind);
        $next = $stmt->fetchColumn();
        if (!$next) {
            return false;
        }
        $current = normalize_path($next);
    }
    return true; // depth exceeded — treat as a loop rather than trust it
}

function create_redirect(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO redirects (source_url, destination_url, redirect_type, status, notes, created_at, updated_at)
         VALUES (:source, :destination, :type, :status, :notes, NOW(), NOW())'
    );
    $stmt->execute([
        'source'      => normalize_path($data['source_url']),
        'destination' => $data['destination_url'],
        'type'        => $data['redirect_type'] === '302' ? '302' : '301',
        'status'      => ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        'notes'       => $data['notes'] ?? null,
    ]);
    return (int) $pdo->lastInsertId();
}

function update_redirect(PDO $pdo, int $id, array $data): void
{
    $stmt = $pdo->prepare(
        'UPDATE redirects SET source_url = :source, destination_url = :destination, redirect_type = :type,
            status = :status, notes = :notes, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'source'      => normalize_path($data['source_url']),
        'destination' => $data['destination_url'],
        'type'        => $data['redirect_type'] === '302' ? '302' : '301',
        'status'      => ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        'notes'       => $data['notes'] ?? null,
        'id'          => $id,
    ]);
}

function delete_redirect(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM redirects WHERE id = :id')->execute(['id' => $id]);
}
