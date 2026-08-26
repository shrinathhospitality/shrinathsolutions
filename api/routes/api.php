<?php
// Route table: [HTTP method, path pattern, handler]. Patterns use {name} for
// path parameters, passed to the handler as an associative array.
//
// Add new routes here as later stages introduce more controllers.

declare(strict_types=1);

return [
    ['POST', 'admin/login', 'auth_login'],
    ['POST', 'admin/logout', 'auth_logout'],
    ['GET', 'admin/session', 'auth_session'],
    ['POST', 'admin/change-password', 'auth_change_password'],
    ['PATCH', 'admin/profile', 'auth_update_profile'],

    // Public, read-only
    ['GET', 'public/site-settings', 'settings_public'],
    ['GET', 'public/header', 'header_public'],
    ['GET', 'public/footer', 'footer_public'],

    // Site settings
    ['GET', 'admin/site-settings', 'settings_admin_get'],
    ['PUT', 'admin/site-settings', 'settings_admin_update'],

    // Social links
    ['GET', 'admin/social-links', 'social_admin_list'],
    ['POST', 'admin/social-links', 'social_admin_create'],
    ['PUT', 'admin/social-links/{id}', 'social_admin_update'],
    ['DELETE', 'admin/social-links/{id}', 'social_admin_delete'],

    // Menus
    ['GET', 'admin/menus/{slug}', 'menu_admin_get'],
    ['POST', 'admin/menus/{slug}/items', 'menu_admin_create_item'],
    ['PUT', 'admin/menus/{slug}/reorder', 'menu_admin_reorder'],
    ['PUT', 'admin/menu-items/{id}', 'menu_admin_update_item'],
    ['DELETE', 'admin/menu-items/{id}', 'menu_admin_delete_item'],

    // Footer
    ['GET', 'admin/footer', 'footer_admin_get'],
    ['POST', 'admin/footer/sections', 'footer_admin_create_section'],
    ['PUT', 'admin/footer/sections/{id}', 'footer_admin_update_section'],
    ['DELETE', 'admin/footer/sections/{id}', 'footer_admin_delete_section'],
    ['POST', 'admin/footer/links', 'footer_admin_create_link'],
    ['PUT', 'admin/footer/links/{id}', 'footer_admin_update_link'],
    ['DELETE', 'admin/footer/links/{id}', 'footer_admin_delete_link'],

    // Pages (public)
    ['GET', 'public/pages/{slug}', 'pages_public_detail'],

    // Pages (admin)
    ['GET', 'admin/pages', 'pages_admin_list'],
    ['POST', 'admin/pages', 'pages_admin_create'],
    ['GET', 'admin/pages/{id}', 'pages_admin_detail'],
    ['PUT', 'admin/pages/{id}', 'pages_admin_update'],
    ['DELETE', 'admin/pages/{id}', 'pages_admin_delete'],
    ['POST', 'admin/pages/{id}/duplicate', 'pages_admin_duplicate'],
    ['GET', 'admin/pages/{id}/revisions', 'pages_admin_revisions'],
    ['POST', 'admin/pages/{id}/revisions/{revision_id}/restore', 'pages_admin_restore_revision'],

    // Services (public)
    ['GET', 'public/services', 'services_public_list'],
    ['GET', 'public/services/{slug}', 'services_public_detail'],

    // Services (admin)
    ['GET', 'admin/services', 'services_admin_list'],
    ['POST', 'admin/services', 'services_admin_create'],
    ['GET', 'admin/services/{id}', 'services_admin_detail'],
    ['PUT', 'admin/services/{id}', 'services_admin_update'],
    ['DELETE', 'admin/services/{id}', 'services_admin_delete'],
    ['POST', 'admin/services/{id}/duplicate', 'services_admin_duplicate'],

    // SEO Pages (public)
    ['GET', 'public/seo-pages/{slug}', 'seo_pages_public_detail'],

    // SEO Pages (admin)
    ['GET', 'admin/seo-pages', 'seo_pages_admin_list'],
    ['POST', 'admin/seo-pages', 'seo_pages_admin_create'],
    ['GET', 'admin/seo-pages/{id}', 'seo_pages_admin_detail'],
    ['PUT', 'admin/seo-pages/{id}', 'seo_pages_admin_update'],
    ['DELETE', 'admin/seo-pages/{id}', 'seo_pages_admin_delete'],

    // Blog (public)
    ['GET', 'public/blog', 'blog_public_list'],
    ['GET', 'public/blog/{slug}', 'blog_public_detail'],

    // Blog (admin)
    ['GET', 'admin/blog', 'blog_admin_list'],
    ['POST', 'admin/blog', 'blog_admin_create'],
    ['GET', 'admin/blog-categories', 'blog_admin_categories'],
    ['GET', 'admin/blog-tags', 'blog_admin_tags'],
    ['POST', 'admin/blog/bulk', 'blog_admin_bulk'],
    ['GET', 'admin/blog/{id}', 'blog_admin_detail'],
    ['PUT', 'admin/blog/{id}', 'blog_admin_update'],
    ['DELETE', 'admin/blog/{id}', 'blog_admin_delete'],

    // Portfolio (public)
    ['GET', 'public/portfolio', 'portfolio_public_list'],
    ['GET', 'public/portfolio/{slug}', 'portfolio_public_detail'],

    // Portfolio (admin)
    ['GET', 'admin/portfolio', 'portfolio_admin_list'],
    ['POST', 'admin/portfolio', 'portfolio_admin_create'],
    ['GET', 'admin/portfolio/{id}', 'portfolio_admin_detail'],
    ['PUT', 'admin/portfolio/{id}', 'portfolio_admin_update'],
    ['DELETE', 'admin/portfolio/{id}', 'portfolio_admin_delete'],

    // Media
    ['GET', 'admin/media', 'media_admin_list'],
    ['POST', 'admin/media', 'media_admin_upload'],
    ['PUT', 'admin/media/{id}', 'media_admin_update'],
    ['GET', 'admin/media/{id}/usage', 'media_admin_usage'],
    ['DELETE', 'admin/media/{id}', 'media_admin_delete'],

    // Leads (public)
    ['POST', 'public/enquiries', 'enquiry_public_create'],
    ['POST', 'public/newsletter', 'newsletter_public_subscribe'],

    // Leads (admin)
    ['GET', 'admin/enquiries', 'enquiries_admin_list'],
    ['GET', 'admin/enquiries/export', 'enquiries_admin_export'],
    ['PUT', 'admin/enquiries/{id}', 'enquiries_admin_update'],
    ['DELETE', 'admin/enquiries/{id}', 'enquiries_admin_delete'],
    ['GET', 'admin/newsletter-subscribers', 'newsletter_admin_list'],
    ['GET', 'admin/proposal-requests', 'proposals_admin_list'],

    // Redirects
    ['GET', 'public/redirects/lookup', 'redirects_public_lookup'],
    ['GET', 'admin/redirects', 'redirects_admin_list'],
    ['POST', 'admin/redirects', 'redirects_admin_create'],
    ['PUT', 'admin/redirects/{id}', 'redirects_admin_update'],
    ['DELETE', 'admin/redirects/{id}', 'redirects_admin_delete'],

    // Audit logs
    ['GET', 'admin/audit-logs', 'audit_logs_admin_list'],

    // Testimonials (public)
    ['GET', 'public/testimonials', 'testimonials_public_list'],

    // Testimonials (admin)
    ['GET', 'admin/testimonials', 'testimonials_admin_list'],
    ['POST', 'admin/testimonials', 'testimonials_admin_create'],
    ['PUT', 'admin/testimonials/{id}', 'testimonials_admin_update'],
    ['DELETE', 'admin/testimonials/{id}', 'testimonials_admin_delete'],
];
