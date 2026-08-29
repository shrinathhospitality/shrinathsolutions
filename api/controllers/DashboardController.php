<?php
declare(strict_types=1);

/** Bundled dashboard summary — counts + recent activity + attention lists in one request
 *  (spec: "one optimized dashboard summary endpoint"). Any authenticated admin may view their
 *  own dashboard; the individual quick-action links/buttons are what the frontend gates behind
 *  each module's own capability, not this read-only summary itself. */
function dashboard_admin_summary(PDO $pdo): void
{
    require_admin($pdo);

    json_success([
        'summary' => admin_dashboard_summary($pdo),
        'recent_activity' => admin_dashboard_recent_activity($pdo),
        'attention' => admin_dashboard_attention($pdo),
    ]);
}
