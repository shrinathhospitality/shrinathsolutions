# Deployment (Hostinger shared hosting)

No Node.js runs in production. The only server-side code is PHP + MySQL; Node/Vite are build
tools used locally to produce static output.

## 1. Build the frontend

```bash
npm install
npm run build
```

This produces `dist/` — a static site (HTML/CSS/JS). `tsc -b` runs first as part of `npm run build`, so a type error fails the build before anything is deployed.

## 2. What goes to `public_html`

Upload (via File Manager or FTP/SFTP) these, merged into the Hostinger account's `public_html/`:

```
public_html/
├── (contents of dist/, i.e. index.html, assets/, robots.txt, favicon, etc.)
├── .htaccess              ← from the project root, NOT the one Vite generates (there isn't one)
└── api/
    ├── config/
    │   ├── config.php          ← create on the server, see step 3. NEVER upload your local one over an unencrypted channel if avoidable — prefer creating it directly in File Manager.
    │   └── (config.example.php, db.php — safe to upload as-is)
    ├── controllers/, models/, middleware/, lib/, routes/
    ├── index.php, health.php, sitemap.php, dev-router.php (dev-router.php is harmless to leave out — it's local-dev only)
    └── uploads/            ← must be writable by PHP (see step 4); .htaccess inside it must be present
```

Do **not** upload: `node_modules/`, `src/`, `database/` is optional (handy to keep for future migrations, but not required at runtime — it's CLI tooling, not served), `.git/`.

## 3. Server-side config

In `api/config/`, create `config.php` (copy `config.example.php` and fill in the real values — the same values already used locally):

```php
return [
    'host'    => 'localhost',   // same-account MySQL — not the Remote MySQL hostname
    'dbname'  => 'u369539812_shrinathsol',
    'user'    => 'u369539812_shrinathsol',
    'pass'    => '<the real password>',
    'charset' => 'utf8mb4',
];
```

Confirm `api/config/.htaccess` (`Require all denied`) is present — it blocks direct HTTP access to this file.

## 4. File permissions

- `api/uploads/` and its subfolders must be writable by the PHP process (typically `755` is enough on Hostinger; the account owns both PHP and the filesystem, so this is usually already correct — verify with a test upload from the admin Media Library after deploy).
- `api/uploads/.htaccess` must be present — it disables script execution inside the uploads folder. Without it, an uploaded file could theoretically be requested and (if it were ever a script, which validation prevents, but defense in depth matters) executed.

## 5. Database

Already covered in `DATABASE_SETUP.md`. In short, from your own machine (with the current IP whitelisted under hPanel → Databases → Remote MySQL):

```bash
DB_HOST=<remote-mysql-host> php database/migrate.php
DB_HOST=<remote-mysql-host> php database/seed_admin.php
# ...and the other seed_*.php scripts, once, on first deploy
```

## 6. CORS

`api/index.php` only allows requests from a fixed origin allowlist:

```php
$allowedOrigins = [
    'https://shrinathsolutions.com',
    'https://www.shrinathsolutions.com',
    'http://localhost:5173', // local Vite dev server
];
```

If the production domain ever changes, update this list — a request from an origin not on it gets no CORS headers and the browser blocks the response.

## 7. Post-deploy smoke test

- `https://shrinathsolutions.com/` — homepage loads, header/footer render (confirms `/api/public/header` and `/api/public/footer` are reachable)
- `https://shrinathsolutions.com/api/health.php` — `{"success":true,"database":"connected"}`
- `https://shrinathsolutions.com/sitemap.xml` — valid XML, includes published content
- `https://shrinathsolutions.com/admin/login` — log in with the admin account, confirm the forced change-password flow, then explore a few CMS screens
- Submit the contact form once — confirm it appears in `/admin/enquiries`
- Refresh a deep link directly (e.g. `/blog/some-slug`) — confirms the `.htaccess` SPA fallback is working, not just client-side navigation
- Upload a small image in the Media Library — confirms `api/uploads/` is writable

## 8. Ongoing

- `display_errors` is off and `log_errors` is on via `.htaccess` — check your Hostinger PHP error log (hPanel → Advanced → PHP Configuration, or the account's `error_log` file) rather than expecting errors on-screen.
- The sitemap cache file (`api/uploads/.cache-sitemap.xml`) regenerates itself every hour; no cron needed.
- Never commit `api/config/config.php` — it's gitignored, and CI/deploy tooling should create it from `config.example.php` + secrets, not copy a file that was ever committed.
