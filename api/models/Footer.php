<?php
declare(strict_types=1);

function list_footer_sections(PDO $pdo, bool $onlyVisible = false): array
{
    $sql = 'SELECT id, title, display_order, is_visible FROM footer_sections';
    if ($onlyVisible) {
        $sql .= ' WHERE is_visible = 1';
    }
    $sql .= ' ORDER BY display_order ASC, id ASC';
    return $pdo->query($sql)->fetchAll();
}

function list_footer_links(PDO $pdo, int $sectionId): array
{
    $stmt = $pdo->prepare('SELECT id, label, url, display_order FROM footer_links WHERE footer_section_id = :id ORDER BY display_order ASC, id ASC');
    $stmt->execute(['id' => $sectionId]);
    return $stmt->fetchAll();
}

function create_footer_section(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO footer_sections (title, display_order, is_visible, created_at, updated_at)
         VALUES (:title, :order, :visible, NOW(), NOW())'
    );
    $stmt->execute([
        'title'   => $data['title'],
        'order'   => (int) ($data['display_order'] ?? 0),
        'visible' => array_key_exists('is_visible', $data) ? (empty($data['is_visible']) ? 0 : 1) : 1,
    ]);
    return (int) $pdo->lastInsertId();
}

function update_footer_section(PDO $pdo, int $id, array $data): void
{
    $stmt = $pdo->prepare(
        'UPDATE footer_sections SET title = :title, display_order = :order, is_visible = :visible, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'title'   => $data['title'],
        'order'   => (int) ($data['display_order'] ?? 0),
        'visible' => array_key_exists('is_visible', $data) ? (empty($data['is_visible']) ? 0 : 1) : 1,
        'id'      => $id,
    ]);
}

function delete_footer_section(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM footer_sections WHERE id = :id')->execute(['id' => $id]);
}

function create_footer_link(PDO $pdo, int $sectionId, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO footer_links (footer_section_id, label, url, display_order, created_at, updated_at)
         VALUES (:section_id, :label, :url, :order, NOW(), NOW())'
    );
    $stmt->execute([
        'section_id' => $sectionId,
        'label'      => $data['label'],
        'url'        => $data['url'],
        'order'      => (int) ($data['display_order'] ?? 0),
    ]);
    return (int) $pdo->lastInsertId();
}

function update_footer_link(PDO $pdo, int $id, array $data): void
{
    $stmt = $pdo->prepare(
        'UPDATE footer_links SET label = :label, url = :url, display_order = :order, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'label' => $data['label'],
        'url'   => $data['url'],
        'order' => (int) ($data['display_order'] ?? 0),
        'id'    => $id,
    ]);
}

function delete_footer_link(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM footer_links WHERE id = :id')->execute(['id' => $id]);
}
