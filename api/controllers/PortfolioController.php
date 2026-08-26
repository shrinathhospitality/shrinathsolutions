<?php
declare(strict_types=1);

function portfolio_public_list(PDO $pdo): void
{
    $category = $_GET['category'] ?? '';
    $sql = "SELECT title, slug, category, short_description, featured_image, services_provided_json, results_json, is_featured
            FROM portfolio_projects WHERE status = 'published'";
    $bind = [];
    if ($category !== '' && $category !== 'All') {
        $sql .= ' AND category = :category';
        $bind['category'] = $category;
    }
    $sql .= ' ORDER BY display_order ASC, id ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);

    json_success(['projects' => $stmt->fetchAll(), 'categories' => list_portfolio_categories($pdo)]);
}

function portfolio_public_detail(PDO $pdo, array $params): void
{
    $project = find_portfolio_project_by_slug($pdo, $params['slug'], true);
    if (!$project) {
        json_error('Project not found.', 404);
    }

    json_success([
        'project' => $project,
        'images'  => get_portfolio_images($pdo, (int) $project['id']),
        'seo'     => get_seo_meta($pdo, 'portfolio_project', (int) $project['id']),
        'faqs'    => get_faqs($pdo, 'portfolio_project', (int) $project['id']),
    ]);
}

function portfolio_admin_list(PDO $pdo): void
{
    require_admin($pdo);
    $params = pagination_params();
    $result = list_portfolio_projects($pdo, $params);
    json_success(['projects' => $result['items'], 'meta' => pagination_meta($result['total'], $params['page'], $params['per_page'])]);
}

function portfolio_admin_detail(PDO $pdo, array $params): void
{
    require_admin($pdo);
    $project = find_portfolio_project($pdo, (int) $params['id']);
    if (!$project) {
        json_error('Project not found.', 404);
    }
    json_success([
        'project' => $project,
        'images'  => get_portfolio_images($pdo, (int) $project['id']),
        'seo'     => get_seo_meta($pdo, 'portfolio_project', (int) $project['id']),
        'faqs'    => get_faqs($pdo, 'portfolio_project', (int) $project['id']),
    ]);
}

function validate_portfolio_input(PDO $pdo, array $body, ?int $excludeId): ?string
{
    $missing = missing_fields($body, ['title', 'slug']);
    if ($missing) {
        return 'Title and slug are required.';
    }
    if (!is_valid_slug((string) $body['slug'])) {
        return 'Slug must be lowercase letters, numbers and hyphens only.';
    }
    if (portfolio_slug_taken($pdo, $body['slug'], $excludeId)) {
        return 'That slug is already in use by another project.';
    }
    return null;
}

function portfolio_admin_create(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $error = validate_portfolio_input($pdo, $body, null);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        $id = create_portfolio_project($pdo, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'portfolio_project', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'portfolio_project', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save project.', 422);
    }

    audit_log($pdo, $ctx['user']['id'], 'content_created', 'portfolio_project', (string) $id, $body['title']);
    json_success(['id' => $id], 201);
}

function portfolio_admin_update(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_portfolio_project($pdo, $id)) {
        json_error('Project not found.', 404);
    }

    $body = read_json_body();
    $error = validate_portfolio_input($pdo, $body, $id);
    if ($error) {
        json_error($error, 422);
    }

    $pdo->beginTransaction();
    try {
        update_portfolio_project($pdo, $id, $body, $ctx['user']['id']);
        if (isset($body['seo']) && is_array($body['seo'])) {
            $seoError = save_seo_meta($pdo, 'portfolio_project', $id, $body['seo']);
            if ($seoError) {
                throw new RuntimeException($seoError);
            }
        }
        if (isset($body['faqs']) && is_array($body['faqs'])) {
            save_faqs($pdo, 'portfolio_project', $id, $body['faqs']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e instanceof RuntimeException ? $e->getMessage() : 'Failed to save project.', 422);
    }

    $action = ($body['status'] ?? 'draft') === 'published' ? 'content_published' : 'content_updated';
    audit_log($pdo, $ctx['user']['id'], $action, 'portfolio_project', (string) $id, $body['title'] ?? null);
    json_success();
}

function portfolio_admin_delete(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $id = (int) $params['id'];
    if (!find_portfolio_project($pdo, $id)) {
        json_error('Project not found.', 404);
    }

    delete_portfolio_project($pdo, $id);
    audit_log($pdo, $ctx['user']['id'], 'content_deleted', 'portfolio_project', (string) $id);
    json_success();
}
