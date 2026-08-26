<?php
// Copy this file to config.php (same folder) and fill in the real values.
// config.php is gitignored and must never be committed.

return [
    // 'localhost' when PHP and MySQL run on the same Hostinger account (production).
    // Overridable via DB_HOST env var for local dev against Hostinger's Remote MySQL host.
    'host'    => getenv('DB_HOST') ?: 'localhost',
    'dbname'  => 'u000000000_example',
    'user'    => 'u000000000_example',
    'pass'    => 'REPLACE_ME',
    'charset' => 'utf8mb4',
];
