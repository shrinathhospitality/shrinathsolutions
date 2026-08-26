<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Support\ApiResponse;

final class HealthController
{
    /** @param array<string, string> $params */
    public function show(array $params): void
    {
        ApiResponse::success(['status' => 'ok', 'time' => date('c')]);
    }
}
