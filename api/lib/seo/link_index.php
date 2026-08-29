<?php
// Internal-link index: extraction/rebuild, incoming-link counting, orphan detection, and
// deterministic (token-overlap, not "AI") internal-link suggestions.

declare(strict_types=1);

function seo_resolve_target_content(PDO $pdo, string $normalizedPath): array
{
    if (str_starts_with($normalizedPath, '/blog/')) {
        $slug = substr($normalizedPath, 6);
        $stmt = $pdo->prepare("SELECT id, status FROM blog_posts WHERE slug = :s LIMIT 1");
        $stmt->execute(['s' => $slug]);
        $row = $stmt->fetch();
        return $row ? ['blog_post', (int) $row['id'], $row['status'] === 'published' ? 'ok' : 'broken'] : [null, null, 'broken'];
    }
    if (str_starts_with($normalizedPath, '/portfolio/')) {
        $slug = substr($normalizedPath, 11);
        $stmt = $pdo->prepare("SELECT id, status FROM portfolio_projects WHERE slug = :s LIMIT 1");
        $stmt->execute(['s' => $slug]);
        $row = $stmt->fetch();
        return $row ? ['portfolio_project', (int) $row['id'], $row['status'] === 'published' ? 'ok' : 'broken'] : [null, null, 'broken'];
    }
    if (str_starts_with($normalizedPath, '/services/')) {
        $slug = substr($normalizedPath, 10);
        $stmt = $pdo->prepare("SELECT id, status FROM services WHERE slug = :s LIMIT 1");
        $stmt->execute(['s' => $slug]);
        $row = $stmt->fetch();
        return $row ? ['service', (int) $row['id'], $row['status'] === 'published' ? 'ok' : 'broken'] : [null, null, 'unknown']; // may be a static /services/:reserved-slug route
    }
    $slug = trim($normalizedPath, '/');
    if ($slug === '') {
        return [null, null, 'ok']; // homepage — always a valid static route
    }
    foreach ([['seo_pages', 'seo_page'], ['pages', 'page']] as [$table, $type]) {
        $stmt = $pdo->prepare("SELECT id, status FROM $table WHERE slug = :s LIMIT 1");
        $stmt->execute(['s' => $slug]);
        $row = $stmt->fetch();
        if ($row) {
            return [$type, (int) $row['id'], $row['status'] === 'published' ? 'ok' : 'broken'];
        }
    }
    // Not a CMS row — could be a fixed static route (about, contact, our-ventures/*, ...) which
    // this index doesn't track individually; treat as unknown rather than falsely "broken".
    return [null, null, 'unknown'];
}

function seo_rebuild_link_index_for_content(PDO $pdo, string $contentType, int $contentId, string $sourceUrl, array $links): void
{
    $pdo->prepare('DELETE FROM seo_link_index WHERE source_content_type = :t AND source_content_id = :id')
        ->execute(['t' => $contentType, 'id' => $contentId]);

    if (!$links) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO seo_link_index
            (source_content_type, source_content_id, source_url, target_url, target_url_normalized,
             target_content_type, target_content_id, anchor_text, is_internal, target_status, last_checked_at, created_at)
         VALUES (:st, :sid, :su, :tu, :tun, :tt, :tid, :anchor, :internal, :status, NOW(), NOW())'
    );

    foreach ($links as $link) {
        $normalized = seo_normalize_url_for_matching($link['href']);
        [$targetType, $targetId, $status] = $link['isInternal']
            ? seo_resolve_target_content($pdo, $normalized)
            : [null, null, 'unknown'];

        $stmt->execute([
            'st' => $contentType, 'sid' => $contentId, 'su' => $sourceUrl,
            'tu' => $link['href'], 'tun' => $normalized,
            'tt' => $targetType, 'tid' => $targetId,
            'anchor' => mb_substr($link['text'], 0, 500),
            'internal' => $link['isInternal'] ? 1 : 0,
            'status' => $link['isInternal'] ? $status : 'unknown',
        ]);
    }
}

function seo_count_incoming_links(PDO $pdo, string $contentType, int $contentId): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(DISTINCT source_content_type, source_content_id) FROM seo_link_index
         WHERE target_content_type = :t AND target_content_id = :id'
    );
    $stmt->execute(['t' => $contentType, 'id' => $contentId]);
    return (int) $stmt->fetchColumn();
}

/** Published, indexable content with zero incoming internal links from any other analyzed
 *  content item. Excludes the homepage and content types with no analysis row yet (not yet
 *  analyzed content can't reliably know its own outgoing links either). */
function seo_find_orphans(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT a.content_type, a.content_id, a.overall_score
         FROM seo_content_analysis a
         WHERE NOT EXISTS (
             SELECT 1 FROM seo_link_index l WHERE l.target_content_type = a.content_type AND l.target_content_id = a.content_id
         )
         ORDER BY a.content_type, a.content_id"
    );
    return $stmt->fetchAll();
}

/** Deterministic (token-overlap on title/keyphrase words, never called "AI") suggestions for
 *  where $contentType/$contentId could link to, drawn from other analyzed content that isn't
 *  already linked to and shares at least one significant word with this item's own keyphrase/
 *  title. Approval to actually add a link always happens in the editor — nothing here writes
 *  content. */
function seo_link_suggestions(PDO $pdo, string $contentType, int $contentId, string $keyphrase, string $title, int $limit = 8): array
{
    $words = array_filter(preg_split('/\s+/u', seo_normalize_text($keyphrase . ' ' . $title)) ?: [], fn($w) => mb_strlen($w) > 3);
    if (!$words) {
        return [];
    }

    $alreadyLinked = $pdo->prepare(
        'SELECT target_content_type, target_content_id FROM seo_link_index WHERE source_content_type = :t AND source_content_id = :id AND target_content_type IS NOT NULL'
    );
    $alreadyLinked->execute(['t' => $contentType, 'id' => $contentId]);
    $linkedSet = [];
    foreach ($alreadyLinked->fetchAll() as $row) {
        $linkedSet[$row['target_content_type'] . ':' . $row['target_content_id']] = true;
    }

    $stmt = $pdo->query(
        "SELECT content_type, content_id, primary_keyphrase, is_cornerstone, overall_score FROM seo_content_analysis"
    );
    $candidates = [];
    foreach ($stmt->fetchAll() as $row) {
        if ($row['content_type'] === $contentType && (int) $row['content_id'] === $contentId) {
            continue;
        }
        $key = $row['content_type'] . ':' . $row['content_id'];
        if (isset($linkedSet[$key])) {
            continue;
        }
        $candidateWords = array_filter(preg_split('/\s+/u', seo_normalize_text((string) $row['primary_keyphrase'])) ?: [], fn($w) => mb_strlen($w) > 3);
        $overlap = array_intersect($words, $candidateWords);
        if (!$overlap) {
            continue;
        }
        $candidates[] = [
            'contentType' => $row['content_type'],
            'contentId' => (int) $row['content_id'],
            'reason' => 'Shares keyphrase term(s): ' . implode(', ', $overlap),
            'suggestedAnchor' => $row['primary_keyphrase'],
            'isCornerstone' => (bool) $row['is_cornerstone'],
            'targetScore' => $row['overall_score'] === null ? null : (int) $row['overall_score'],
            'overlapCount' => count($overlap),
        ];
    }

    usort($candidates, fn($a, $b) => $b['isCornerstone'] <=> $a['isCornerstone'] ?: $b['overlapCount'] <=> $a['overlapCount']);
    return array_slice($candidates, 0, $limit);
}
