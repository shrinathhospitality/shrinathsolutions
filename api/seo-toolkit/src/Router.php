<?php

declare(strict_types=1);

namespace App;

use App\Support\ApiResponse;

/**
 * Minimal regex-based router. Supports {param} path segments and dispatches
 * to [ControllerClass, 'method']. No framework needed for four resources.
 */
final class Router
{
    /** @var list<array{method:string, pattern:string, handler:array{0:string,1:string}, paramNames:list<string>}> */
    private array $routes = [];

    public function get(string $pattern, array $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, array $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    /** @param array{0:string,1:string} $handler */
    private function add(string $method, string $pattern, array $handler): void
    {
        $paramNames = [];
        $regex = preg_replace_callback('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', static function ($m) use (&$paramNames) {
            $paramNames[] = $m[1];
            return '([^/]+)';
        }, $pattern);

        $this->routes[] = [
            'method' => $method,
            'pattern' => '#^' . $regex . '$#',
            'handler' => $handler,
            'paramNames' => $paramNames,
        ];
    }

    public function dispatch(string $method, string $path): void
    {
        $path = '/' . trim($path, '/');
        if ($path === '/') {
            $path = '';
        }

        $allowedForPath = [];

        foreach ($this->routes as $route) {
            if (preg_match($route['pattern'], $path, $matches) === 1) {
                $allowedForPath[] = $route['method'];
                if ($route['method'] !== $method) {
                    continue;
                }

                $params = [];
                foreach ($route['paramNames'] as $i => $name) {
                    $params[$name] = $matches[$i + 1];
                }

                [$class, $action] = $route['handler'];
                $controller = new $class();
                $controller->$action($params);
                return;
            }
        }

        if ($allowedForPath !== []) {
            ApiResponse::error('Method not allowed.', 405, [implode(', ', array_unique($allowedForPath))]);
        }

        ApiResponse::error('Not found.', 404);
    }
}
