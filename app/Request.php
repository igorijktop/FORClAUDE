<?php
declare(strict_types=1);

namespace Onika;

/** Thin wrapper over the current HTTP request. */
final class Request
{
    private static ?array $json = null;
    private static string $base = '';
    private static string $path = '/';

    /** Detect the sub-folder the app lives in (e.g. "/onika" under XAMPP htdocs). */
    public static function init(): void
    {
        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
        $uri = rawurldecode((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH));

        // Under Apache (rewrite → index.php) SCRIPT_NAME is "<base>/index.php". The PHP built-in server
        // in router mode reports the request path instead, in which case the app lives at the root.
        $dir = basename($script) === 'index.php' ? rtrim(str_replace('\\', '/', dirname($script)), '/') : '';
        if ($dir !== '' && ($uri === $dir || strncmp($uri, $dir . '/', strlen($dir) + 1) === 0)) {
            self::$base = $dir;
            $path = substr($uri, strlen($dir));
        } else {
            self::$base = '';
            $path = $uri;
        }
        $path = '/' . ltrim((string) $path, '/');
        // Collapse duplicate slashes, remove trailing slash (except root).
        $path = preg_replace('#/{2,}#', '/', $path) ?? $path;
        if ($path !== '/' && substr($path, -1) === '/') {
            $path = rtrim($path, '/');
        }
        self::$path = $path;
    }

    public static function base(): string
    {
        return self::$base;
    }

    /** Request path relative to the app base (no query string), always starts with "/". */
    public static function path(): string
    {
        return self::$path;
    }

    public static function setPath(string $path): void
    {
        self::$path = $path === '' ? '/' : $path;
    }

    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    public static function isPost(): bool
    {
        return self::method() === 'POST';
    }

    public static function isHttps(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }
        return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }

    public static function host(): string
    {
        $h = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
        // Only allow sane host characters (prevents header injection into absolute URLs).
        return preg_match('/^[A-Za-z0-9.\-:\[\]]+$/', $h) ? $h : 'localhost';
    }

    /** scheme://host + base (no trailing slash). */
    public static function origin(): string
    {
        return (self::isHttps() ? 'https' : 'http') . '://' . self::host() . self::$base;
    }

    public static function ip(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    public static function isAjax(): bool
    {
        return strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest'
            || str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');
    }

    public static function header(string $name): string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return (string) ($_SERVER[$key] ?? '');
    }

    /** @return mixed */
    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    /** All GET params. */
    public static function queryAll(): array
    {
        return $_GET;
    }

    /** Value from the POST body (form-encoded or JSON). */
    public static function input(string $key, mixed $default = null): mixed
    {
        if (isset($_POST[$key])) {
            return $_POST[$key];
        }
        $j = self::json();
        return $j[$key] ?? $default;
    }

    public static function inputAll(): array
    {
        return $_POST + self::json();
    }

    public static function str(string $key, string $default = ''): string
    {
        $v = self::input($key, $default);
        return is_scalar($v) ? trim((string) $v) : $default;
    }

    /** JSON request body as array ([] when absent/invalid). */
    public static function json(): array
    {
        if (self::$json === null) {
            self::$json = [];
            $ct = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
            if (stripos($ct, 'application/json') !== false) {
                $raw = file_get_contents('php://input', false, null, 0, 2 * 1024 * 1024);
                $d = json_decode($raw ?: '', true);
                if (is_array($d)) {
                    self::$json = $d;
                }
            }
        }
        return self::$json;
    }
}
