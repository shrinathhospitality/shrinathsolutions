<?php
declare(strict_types=1);

const FOOTER_SETTING_KEYS = [
    'site_name', 'phone', 'whatsapp_number', 'email', 'location', 'copyright_text', 'logo_url',
    'footer_about_text', 'footer_newsletter_heading', 'footer_newsletter_description',
    'footer_statement', 'footer_cta_heading', 'footer_cta_description',
    'footer_cta_proposal_label', 'footer_cta_whatsapp_label', 'footer_trust_points',
];

function footer_sections_with_links(PDO $pdo, bool $onlyVisible): array
{
    $sections = list_footer_sections($pdo, $onlyVisible);
    foreach ($sections as &$section) {
        $section['links'] = list_footer_links($pdo, (int) $section['id']);
    }
    unset($section);
    return $sections;
}

function footer_public(PDO $pdo): void
{
    $allSettings = get_all_settings($pdo);
    $settings = array_intersect_key($allSettings, array_flip(FOOTER_SETTING_KEYS));

    json_success([
        'settings' => $settings,
        'social_links' => list_social_links($pdo, true),
        'sections' => footer_sections_with_links($pdo, true),
    ]);
}

function footer_admin_get(PDO $pdo): void
{
    require_admin($pdo);
    json_success(['sections' => footer_sections_with_links($pdo, false)]);
}

function footer_admin_create_section(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['title']);
    if ($missing) {
        json_error('Title is required.', 422);
    }

    $id = create_footer_section($pdo, $body);
    audit_log($pdo, $ctx['user']['id'], 'footer_section_created', 'footer_section', (string) $id);

    json_success(['id' => $id], 201);
}

function footer_admin_update_section(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['title']);
    if ($missing) {
        json_error('Title is required.', 422);
    }

    update_footer_section($pdo, (int) $params['id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'footer_section_updated', 'footer_section', $params['id']);

    json_success();
}

function footer_admin_delete_section(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    delete_footer_section($pdo, (int) $params['id']);
    audit_log($pdo, $ctx['user']['id'], 'footer_section_deleted', 'footer_section', $params['id']);

    json_success();
}

function footer_admin_create_link(PDO $pdo): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['footer_section_id', 'label', 'url']);
    if ($missing) {
        json_error('Section, label and URL are required.', 422);
    }

    $id = create_footer_link($pdo, (int) $body['footer_section_id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'footer_link_created', 'footer_link', (string) $id);

    json_success(['id' => $id], 201);
}

function footer_admin_update_link(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    $body = read_json_body();
    $missing = missing_fields($body, ['label', 'url']);
    if ($missing) {
        json_error('Label and URL are required.', 422);
    }

    update_footer_link($pdo, (int) $params['id'], $body);
    audit_log($pdo, $ctx['user']['id'], 'footer_link_updated', 'footer_link', $params['id']);

    json_success();
}

function footer_admin_delete_link(PDO $pdo, array $params): void
{
    $ctx = require_admin($pdo);
    require_csrf($ctx);

    delete_footer_link($pdo, (int) $params['id']);
    audit_log($pdo, $ctx['user']['id'], 'footer_link_deleted', 'footer_link', $params['id']);

    json_success();
}
