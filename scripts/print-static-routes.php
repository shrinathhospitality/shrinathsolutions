<?php
// Build-time helper for scripts/prerender.mjs: prints the authoritative static route list as
// JSON by calling the real static_public_routes() function directly — not a second, hand
// maintained copy of the route list. `php scripts/print-static-routes.php`.
declare(strict_types=1);
require __DIR__ . '/../api/lib/route_manifest.php';
echo json_encode(static_public_routes());
