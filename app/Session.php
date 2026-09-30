<?php
declare(strict_types=1);

namespace Onika;

/** Native PHP session wrapper: CSRF token, flash messages, hardened cookie. */
final class Session
{
    private static bool $started = false;

    public static function start(): void
    {
        if (self::$started || PHP_SAPI === 'cli') {
            self::$started = true;
            return;
        }
        $dir = DATA_DIR . '/sessions';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        if (is_dir($dir) && is_writable($dir)) {
            session_save_path($dir);
        }
        $life = max(1, (int) cfg('customer_session_days', 30)) * 86400;
        ini_set('session.gc_maxlifetime', (string) $life);
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '100');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name((string) cfg('session_name', 'onika_sid'));
        $base = Request::base();
        session_set_cookie_params([
            'lifetime' => $life,
            'path' => $base === '' ? '/' : $base . '/',
            'secure' => Request::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
        self::$started = true;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function forget(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    /** New session id after a privilege change (login) to prevent fixation. */
    public static function regenerate(): void
    {
        self::start();
        if (PHP_SAPI !== 'cli') {
            session_regenerate_id(true);
        }
    }

    /* ------------------------------------------------------------------ CSRF */
    public static function csrf(): string
    {
        self::start();
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(20));
        }
        return (string) $_SESSION['_csrf'];
    }

    public static function checkCsrf(?string $token = null): bool
    {
        self::start();
        $token ??= (string) (Request::input('_csrf') ?? Request::header('X-CSRF-Token'));
        if ($token === '') {
            $token = Request::header('X-CSRF-Token');
        }
        return isset($_SESSION['_csrf']) && $token !== '' && hash_equals((string) $_SESSION['_csrf'], $token);
    }

    /** Abort with 403 (or JSON error) when the CSRF token is missing/invalid. */
    public static function requireCsrf(): void
    {
        if (self::checkCsrf()) {
            return;
        }
        if (str_starts_with(Request::path(), '/api/') || Request::isAjax() || Request::header('X-CSRF-Token') !== '') {
            Halt::with(Response::json(['ok' => false, 'error' => 'csrf'], 403));
        }
        Halt::with(Response::html(View::simpleMessage('403', t('js.csrf')), 403));
    }

    /* ------------------------------------------------------------------ flash */
    public static function flash(string $type, string $message): void
    {
        self::start();
        $_SESSION['_flash'][] = ['type' => $type, 'message' => $message];
    }

    /** @return list<array{type:string,message:string}> */
    public static function pullFlash(): array
    {
        self::start();
        $f = $_SESSION['_flash'] ?? [];
        unset($_SESSION['_flash']);
        return is_array($f) ? $f : [];
    }
}
