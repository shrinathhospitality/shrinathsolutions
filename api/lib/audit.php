<?php
// Administrator action logging. Never pass passwords, tokens, or raw request bodies here.

declare(strict_types=1);

function audit_log(
    PDO $pdo,
    ?int $adminUserId,
    string $action,
    ?string $entityType = null,
    ?string $entityId = null,
    ?string $description = null
): void {
    $stmt = $pdo->prepare(
        'INSERT INTO audit_logs (admin_user_id, action, entity_type, entity_id, description, ip_address, created_at)
         VALUES (:admin_user_id, :action, :entity_type, :entity_id, :description, :ip_address, NOW())'
    );
    $stmt->execute([
        'admin_user_id' => $adminUserId,
        'action'        => $action,
        'entity_type'   => $entityType,
        'entity_id'     => $entityId,
        'description'   => $description,
        'ip_address'    => client_ip(),
    ]);
}
