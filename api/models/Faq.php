<?php
declare(strict_types=1);

function get_faqs(PDO $pdo, string $entityType, int $entityId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, question, answer, display_order FROM faqs
         WHERE entity_type = :type AND entity_id = :id ORDER BY display_order ASC, id ASC'
    );
    $stmt->execute(['type' => $entityType, 'id' => $entityId]);
    return $stmt->fetchAll();
}

/** Replaces all FAQs for an entity with the given ordered list of {question, answer}. */
function save_faqs(PDO $pdo, string $entityType, int $entityId, array $faqs): void
{
    $pdo->prepare('DELETE FROM faqs WHERE entity_type = :type AND entity_id = :id')
        ->execute(['type' => $entityType, 'id' => $entityId]);

    if (!$faqs) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO faqs (entity_type, entity_id, question, answer, display_order, created_at, updated_at)
         VALUES (:type, :id, :question, :answer, :order, NOW(), NOW())'
    );
    foreach (array_values($faqs) as $i => $faq) {
        if (empty($faq['question']) || empty($faq['answer'])) {
            continue;
        }
        $stmt->execute([
            'type'     => $entityType,
            'id'       => $entityId,
            'question' => sanitize_html((string) $faq['question']),
            'answer'   => sanitize_html((string) $faq['answer']),
            'order'    => $i,
        ]);
    }
}
