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
        // "D": "$" must not match before a trailing newline ("/media/…webp%0A").
        $this->routes[] = [$method, '#^' . $regex . '$#uD', $handler];
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
            // The path is already percent-decoded (Request::init); decoding again would turn "%2541" into "A".
            $params = array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY);
            $res = $handler($params);
            if ($res instanceof Response) {
                return $res;
            }
            return Response::html((string) $res);
        }
        if ($allowed) {
            $allowed = array_unique($allowed);
            if (in_array('GET', $allowed, true)) {
                $allowed[] = 'HEAD';
            }
            $res = str_starts_with($path, '/api/')
                ? Response::json(['ok' => false, 'error' => 'method_not_allowed'], 405)
                : Response::text('Method Not Allowed', 'text/plain; charset=utf-8', 405);
            return $res->header('Allow', implode(', ', $allowed));
        }
        return Response::notFound();
    }
}
