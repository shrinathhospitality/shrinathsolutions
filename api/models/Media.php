<?php
declare(strict_types=1);

function list_media(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(original_filename LIKE :search1 OR alt_text LIKE :search2 OR title LIKE :search3)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = '%' . $params['search'] . '%';
    }
    if (!empty($params['type'])) {
        $where[] = 'mime_type LIKE :type';
        $bind['type'] = $params['type'] . '%';
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM media_files $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, filename, original_filename, relative_path, mime_type, size_bytes, width, height,
                alt_text, title, caption, created_at
         FROM media_files $whereSql ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function find_media(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM media_files WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function create_media(PDO $pdo, array $meta, int $adminUserId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO media_files
            (filename, original_filename, relative_path, mime_type, size_bytes, width, height, uploaded_by, created_at, updated_at)
         VALUES
            (:filename, :original_filename, :relative_path, :mime_type, :size_bytes, :width, :height, :uploaded_by, NOW(), NOW())'
    );
    $stmt->execute([
        'filename'          => $meta['filename'],
        'original_filename' => $meta['original_filename'],
        'relative_path'     => $meta['relative_path'],
        'mime_type'         => $meta['mime_type'],
        'size_bytes'        => $meta['size_bytes'],
        'width'             => $meta['width'],
        'height'            => $meta['height'],
        'uploaded_by'       => $adminUserId,
    ]);
    return (int) $pdo->lastInsertId();
}

function update_media_meta(PDO $pdo, int $id, array $data): void
{
    $pdo->prepare('UPDATE media_files SET alt_text = :alt, title = :title, caption = :caption, updated_at = NOW() WHERE id = :id')
        ->execute([
            'alt'     => $data['alt_text'] ?? null,
            'title'   => $data['title'] ?? null,
            'caption' => $data['caption'] ?? null,
            'id'      => $id,
        ]);
}

function delete_media(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM media_files WHERE id = :id')->execute(['id' => $id]);
}

/** Naive usage search: looks for the file's relative path inside common content columns. */
function find_media_usage(PDO $pdo, string $relativePath): array
{
    $needle = '%' . $relativePath . '%';
    $usage = [];

    $checks = [
        ['table' => 'services', 'label_col' => 'name', 'cols' => ['featured_image', 'blocks_json']],
        ['table' => 'pages', 'label_col' => 'title', 'cols' => ['featured_image']],
        ['table' => 'blog_posts', 'label_col' => 'title', 'cols' => ['featured_image', 'content']],
        ['table' => 'portfolio_projects', 'label_col' => 'title', 'cols' => ['featured_image', 'detailed_description']],
        ['table' => 'seo_pages', 'label_col' => 'title', 'cols' => ['featured_image']],
    ];

    foreach ($checks as $check) {
        $conditions = implode(' OR ', array_map(fn($c) => "$c LIKE ?", $check['cols']));
        $stmt = $pdo->prepare("SELECT id, {$check['label_col']} AS label FROM {$check['table']} WHERE $conditions LIMIT 5");
        $stmt->execute(array_fill(0, count($check['cols']), $needle));
        foreach ($stmt->fetchAll() as $row) {
            $usage[] = ['type' => $check['table'], 'id' => $row['id'], 'label' => $row['label']];
        }
    }

    return $usage;
}
