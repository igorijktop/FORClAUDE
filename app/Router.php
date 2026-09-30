<?php
declare(strict_types=1);

namespace Onika;

/**
 * Minimal router. Patterns: "/product/{slug}", "/media/{w}/{dir}/{file:.+}".
 * Handlers are callables returning a Response (or a string = HTML 200).
 */
final class Router
{
    /** @var list<array{string,string,callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function add(string $method, string $pattern, callable $handler): void
    {
        $regex = preg_replace_callback('#\{(\w+)(?::([^}]+))?\}#', static function (array $m): string {
            $re = $m[2] ?? '[^/]+';
            return '(?P<' . $m[1] . '>' . $re . ')';
        }, $pattern);
        $this->routes[] = [$method, '#^' . $regex . '$#u', $handler];
    }

    public function dispatch(string $method, string $path): Response
    {
        $head = $method === 'HEAD';
        $allowed = [];
        foreach ($this->routes as [$m, $regex, $handler]) {
            if (!preg_match($regex, $path, $mm)) {
                continue;
            }
            if ($m !== $method && !($head && $m === 'GET')) {
                $allowed[] = $m;
                continue;
            }
            $params = array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY);
            $params = array_map('rawurldecode', $params);
            $res = $handler($params);
            if ($res instanceof Response) {
                return $res;
            }
            return Response::html((string) $res);
        }
        if ($allowed) {
            return Response::text('Method Not Allowed', 'text/plain; charset=utf-8', 405)
                ->header('Allow', implode(', ', array_unique($allowed)));
        }
        return Response::notFound();
    }
}
