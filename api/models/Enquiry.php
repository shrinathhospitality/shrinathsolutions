<?php
declare(strict_types=1);

const ENQUIRY_STATUSES = ['new', 'contacted', 'converted', 'spam'];

function list_enquiries(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];

    if ($params['search'] !== '') {
        $where[] = '(name LIKE :search1 OR email LIKE :search2 OR phone LIKE :search3 OR message LIKE :search4)';
        $bind['search1'] = $bind['search2'] = $bind['search3'] = $bind['search4'] = '%' . $params['search'] . '%';
    }
    if ($params['status'] !== '' && in_array($params['status'], ENQUIRY_STATUSES, true)) {
        $where[] = 'status = :status';
        $bind['status'] = $params['status'];
    }
    if (!empty($params['source'])) {
        $where[] = 'source = :source';
        $bind['source'] = $params['source'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM contact_enquiries $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM contact_enquiries $whereSql ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}");
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

function create_enquiry(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO contact_enquiries
            (name, phone, email, message, service, page_url, source, utm_source, utm_medium, utm_campaign, referrer, ip_address, status, created_at, updated_at)
         VALUES
            (:name, :phone, :email, :message, :service, :page_url, :source, :utm_source, :utm_medium, :utm_campaign, :referrer, :ip_address, "new", NOW(), NOW())'
    );
    $stmt->execute([
        'name'         => sanitize_html((string) $data['name']),
        'phone'        => $data['phone'] ?? null,
        'email'        => $data['email'] ?? null,
        'message'      => isset($data['message']) ? sanitize_html($data['message']) : null,
        'service'      => $data['service'] ?? null,
        'page_url'     => $data['page_url'] ?? null,
        'source'       => $data['source'] ?? 'contact_form',
        'utm_source'   => $data['utm_source'] ?? null,
        'utm_medium'   => $data['utm_medium'] ?? null,
        'utm_campaign' => $data['utm_campaign'] ?? null,
        'referrer'     => $data['referrer'] ?? null,
        'ip_address'   => client_ip(),
    ]);
    return (int) $pdo->lastInsertId();
}

function find_enquiry(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM contact_enquiries WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function update_enquiry(PDO $pdo, int $id, array $data): void
{
    $status = in_array($data['status'] ?? '', ENQUIRY_STATUSES, true) ? $data['status'] : 'new';
    $pdo->prepare('UPDATE contact_enquiries SET status = :status, internal_notes = :notes, updated_at = NOW() WHERE id = :id')
        ->execute(['status' => $status, 'notes' => $data['internal_notes'] ?? null, 'id' => $id]);
}

function delete_enquiry(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM contact_enquiries WHERE id = :id')->execute(['id' => $id]);
}

function list_all_enquiries_for_export(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM contact_enquiries ORDER BY created_at DESC')->fetchAll();
}

// --- Newsletter ---

function subscribe_newsletter(PDO $pdo, string $email, ?string $source): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO newsletter_subscribers (email, status, source, created_at, updated_at)
         VALUES (:email, "subscribed", :source, NOW(), NOW())
         ON DUPLICATE KEY UPDATE status = "subscribed", updated_at = NOW()'
    );
    $stmt->execute(['email' => $email, 'source' => $source]);
}

function list_newsletter_subscribers(PDO $pdo, array $params): array
{
    $where = [];
    $bind = [];
    if ($params['search'] !== '') {
        $where[] = 'email LIKE :search';
        $bind['search'] = '%' . $params['search'] . '%';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM newsletter_subscribers $whereSql");
    $countStmt->execute($bind);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM newsletter_subscribers $whereSql ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}");
    $stmt->execute($bind);

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}

// --- Proposal requests (schema + admin read; no distinct public form exists yet) ---

function list_proposal_requests(PDO $pdo, array $params): array
{
    $countStmt = $pdo->query('SELECT COUNT(*) FROM proposal_requests');
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM proposal_requests ORDER BY created_at DESC LIMIT {$params['per_page']} OFFSET {$params['offset']}");
    $stmt->execute();

    return ['items' => $stmt->fetchAll(), 'total' => $total];
}
