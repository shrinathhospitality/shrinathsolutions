<?php
declare(strict_types=1);

function get_seo_meta(PDO $pdo, string $entityType, int $entityId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM seo_meta WHERE entity_type = :type AND entity_id = :id LIMIT 1');
    $stmt->execute(['type' => $entityType, 'id' => $entityId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['robots_index'] = (bool) $row['robots_index'];
    $row['robots_follow'] = (bool) $row['robots_follow'];
    $row['schema'] = $row['schema_json'] ? json_decode($row['schema_json'], true) : null;
    unset($row['schema_json']);
    return $row;
}

/** Upserts SEO fields for an entity. Returns null on success, or an error message if the
 *  canonical URL is already used by a different entity. */
function save_seo_meta(PDO $pdo, string $entityType, int $entityId, array $data): ?string
{
    $canonical = $data['canonical_url'] ?? null;
    if ($canonical) {
        $stmt = $pdo->prepare(
            'SELECT entity_type, entity_id FROM seo_meta WHERE canonical_url = :url AND NOT (entity_type = :type AND entity_id = :id) LIMIT 1'
        );
        $stmt->execute(['url' => $canonical, 'type' => $entityType, 'id' => $entityId]);
        if ($stmt->fetch()) {
            return 'That canonical URL is already used by another page.';
        }
    }

    $stmt = $pdo->prepare(
        'INSERT INTO seo_meta
            (entity_type, entity_id, meta_title, meta_description, canonical_url, og_title, og_description, og_image,
             twitter_title, twitter_description, twitter_image, robots_index, robots_follow, schema_json, created_at, updated_at)
         VALUES
            (:entity_type, :entity_id, :meta_title, :meta_description, :canonical_url, :og_title, :og_description, :og_image,
             :twitter_title, :twitter_description, :twitter_image, :robots_index, :robots_follow, :schema_json, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
            meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), canonical_url = VALUES(canonical_url),
            og_title = VALUES(og_title), og_description = VALUES(og_description), og_image = VALUES(og_image),
            twitter_title = VALUES(twitter_title), twitter_description = VALUES(twitter_description), twitter_image = VALUES(twitter_image),
            robots_index = VALUES(robots_index), robots_follow = VALUES(robots_follow), schema_json = VALUES(schema_json), updated_at = NOW()'
    );
    $stmt->execute([
        'entity_type'          => $entityType,
        'entity_id'            => $entityId,
        'meta_title'           => $data['meta_title'] ?? null,
        'meta_description'     => $data['meta_description'] ?? null,
        'canonical_url'        => $canonical,
        'og_title'             => $data['og_title'] ?? null,
        'og_description'       => $data['og_description'] ?? null,
        'og_image'             => $data['og_image'] ?? null,
        'twitter_title'        => $data['twitter_title'] ?? null,
        'twitter_description'  => $data['twitter_description'] ?? null,
        'twitter_image'        => $data['twitter_image'] ?? null,
        'robots_index'         => array_key_exists('robots_index', $data) ? (empty($data['robots_index']) ? 0 : 1) : 1,
        'robots_follow'        => array_key_exists('robots_follow', $data) ? (empty($data['robots_follow']) ? 0 : 1) : 1,
        'schema_json'          => isset($data['schema']) ? json_encode($data['schema']) : null,
    ]);

    return null;
}

function delete_seo_meta(PDO $pdo, string $entityType, int $entityId): void
{
    $pdo->prepare('DELETE FROM seo_meta WHERE entity_type = :type AND entity_id = :id')
        ->execute(['type' => $entityType, 'id' => $entityId]);
}
