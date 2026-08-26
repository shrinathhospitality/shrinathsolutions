<?php
declare(strict_types=1);

function audit_logs_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $action = $_GET['action'] ?? '';

    $where = [];
    $bind = [];
    if ($action !== '') {
        $where[] = 'l.action = :action';
        $bind['action'] = $action;
    }
    if ($params['search'] !== '') {
        $where[] = '(l.description LIKE :search1 OR l.entity_type LIKE :search2)';
        $bind['search1'] = $bind['search2'] = '%' . $params['search'] . '%';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs l $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT l.id, l.action, l.entity_type, l.entity_id, l.description, l.ip_address, l.created_at, u.name AS admin_name
         FROM audit_logs l LEFT JOIN admin_users u ON u.id = l.admin_user_id
         $whereSql ORDER BY l.created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}"
    );
    $stmt->execute($bind);

    json_success(['logs' => $stmt->fetchAll(), 'meta' => pagination_meta($total, $params['page'], $params['per_page'])]);
}
