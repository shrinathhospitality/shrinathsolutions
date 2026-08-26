<?php
declare(strict_types=1);

function list_social_links(PDO $pdo, bool $onlyVisible = false): array
{
    $sql = 'SELECT id, platform, url, icon, display_order, is_visible FROM social_links';
    if ($onlyVisible) {
        $sql .= ' WHERE is_visible = 1';
    }
    $sql .= ' ORDER BY display_order ASC, id ASC';
    return $pdo->query($sql)->fetchAll();
}

function create_social_link(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO social_links (platform, url, icon, display_order, is_visible, created_at, updated_at)
         VALUES (:platform, :url, :icon, :order, :visible, NOW(), NOW())'
    );
    $stmt->execute([
        'platform' => $data['platform'],
        'url'      => $data['url'],
        'icon'     => $data['icon'] ?? null,
        'order'    => (int) ($data['display_order'] ?? 0),
        'visible'  => !empty($data['is_visible']) ? 1 : 0,
    ]);
    return (int) $pdo->lastInsertId();
}

function update_social_link(PDO $pdo, int $id, array $data): void
{
    $stmt = $pdo->prepare(
        'UPDATE social_links SET platform = :platform, url = :url, icon = :icon,
            display_order = :order, is_visible = :visible, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'platform' => $data['platform'],
        'url'      => $data['url'],
        'icon'     => $data['icon'] ?? null,
        'order'    => (int) ($data['display_order'] ?? 0),
        'visible'  => !empty($data['is_visible']) ? 1 : 0,
        'id'       => $id,
    ]);
}

function delete_social_link(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM social_links WHERE id = :id')->execute(['id' => $id]);
}
