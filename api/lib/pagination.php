<?php
declare(strict_types=1);

/** Reads page/per_page/search/status/category from the query string with sane bounds. */
function pagination_params(): array
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($_GET['per_page'] ?? 20)));

    return [
        'page'     => $page,
        'per_page' => $perPage,
        'offset'   => ($page - 1) * $perPage,
        'search'   => trim((string) ($_GET['search'] ?? '')),
        'status'   => trim((string) ($_GET['status'] ?? '')),
        'category' => trim((string) ($_GET['category'] ?? '')),
    ];
}

function pagination_meta(int $total, int $page, int $perPage): array
{
    return [
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0,
    ];
}
