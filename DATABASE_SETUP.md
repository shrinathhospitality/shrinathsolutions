# Database setup

## Connection

Real credentials live in `api/config/config.php` (gitignored — copy `api/config/config.example.php` to create it). It resolves the host as:

```php
'host' => getenv('DB_HOST') ?: 'localhost',
```

- **Production (Hostinger)**: leave `DB_HOST` unset. `localhost` is correct because PHP and MySQL run on the same account.
- **Local development / running migrations from your own machine**: set `DB_HOST` to the Remote MySQL hostname or IP shown in hPanel → Databases → Remote MySQL (e.g. `82.25.121.210`), and make sure your current IP is whitelisted there (or `%` for any host, if you've enabled that).

```bash
DB_HOST=<remote-mysql-host> php database/migrate.php
```

## Migrations

Numbered, schema-only SQL files in `database/migrations/`, applied in order and tracked in a `schema_migrations` table so re-running is always safe:

```bash
php database/migrate.php
```

Current migrations:

| File | Adds |
|---|---|
| `0001_auth.sql` | `admin_users`, `admin_sessions`, `password_reset_tokens`, `login_attempts`, `audit_logs` |
| `0002_site_settings.sql` | `site_settings`, `social_links` |
| `0003_menus.sql` | `menus`, `menu_items` |
| `0004_footer.sql` | `footer_sections`, `footer_links` |
| `0005_content_shared.sql` | `seo_meta`, `faqs`, `redirects` |
| `0006_pages.sql` | `pages`, `page_sections`, `page_revisions` |
| `0007_services.sql` | `services` |
| `0008_seo_pages.sql` | `seo_pages` |
| `0009_blog.sql` | `blog_categories`, `blog_tags`, `blog_posts`, `blog_post_tags` |
| `0010_portfolio.sql` | `portfolio_categories`, `portfolio_projects`, `portfolio_images` |
| `0011_media.sql` | `media_folders`, `media_files` |
| `0012_leads.sql` | `contact_enquiries`, `proposal_requests`, `newsletter_subscribers` |
| `0013_enquiry_ip.sql` | adds `ip_address` to `contact_enquiries` (enquiry rate-limiting) |

To add new schema later, create `database/migrations/00NN_description.sql` and run `migrate.php` again — never edit an already-applied migration file.

## Seeders

CLI-only, idempotent (safe to re-run — each checks for existing data before inserting):

```bash
php database/seed_admin.php            # first admin account (see ADMIN_CMS.md)
php database/seed_site_content.php     # site_settings, social_links, menus, footer — mirrors the original static content
php database/seed_settings_extra.php   # remaining Global SEO / settings keys
php database/seed_services.php         # migrates the 5 hand-built ServicePage.tsx pages into `services`
php database/seed_blog.php             # migrates the 6 blog list entries into `blog_posts`
php database/seed_portfolio.php        # migrates the 6 portfolio entries + categories
```

Run them once, in this order, against a fresh database.

## Backups

Before applying new migrations to a database that already holds real content, take a backup. From a machine with `mysqldump` (or via hPanel → Databases → phpMyAdmin → Export):

```bash
mysqldump -h <host> -u u369539812_shrinathsol -p u369539812_shrinathsol > backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

To restore:

```bash
mysql -h <host> -u u369539812_shrinathsol -p u369539812_shrinathsol < backups/backup-YYYYMMDD-HHMMSS.sql
```

`migrate.php` itself checks `information_schema` before ever running against a database that isn't empty — it will not silently overwrite existing tables, since every migration uses `CREATE TABLE IF NOT EXISTS`.

## Content safety

- **Pages** have full revision history (`page_revisions`) with restore, created automatically on every update. Services, SEO pages, blog posts and portfolio projects don't have revision history yet — a future enhancement, not present today.
- Deleting a page/service/post/project is a hard delete (with its SEO meta and FAQs cascaded). There is no soft-delete/archive-then-purge flow yet — the `archived` status exists but currently behaves the same as any other status for storage purposes (it's just excluded from public "published" queries). Treat delete as permanent.
- Media deletion checks for usage across content tables first and requires an explicit `force=1` to delete a file that's still referenced.
