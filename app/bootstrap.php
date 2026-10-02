<?php
declare(strict_types=1);

/**
 * ONIKA — application bootstrap: constants, requirement check, autoloader,
 * configuration, error handling and timezone.
 */

const ONIKA_VERSION = '2.0.0';

define('ROOT', dirname(__DIR__));
define('APP_DIR', ROOT . '/app');
define('DATA_DIR', ROOT . '/data');
define('MEDIA_DIR', ROOT . '/media');
define('UPLOAD_DIR', ROOT . '/uploads');

/* ---------------------------------------------------------------- requirements */
(function (): void {
    $problems = [];
    if (PHP_VERSION_ID < 80100) {
        $problems[] = 'PHP 8.1 або новіше / PHP 8.1 or newer (зараз / now: ' . PHP_VERSION . ')';
    }
    foreach (['pdo_sqlite' => 'PDO SQLite', 'mbstring' => 'mbstring', 'gd' => 'GD', 'json' => 'JSON', 'fileinfo' => 'Fileinfo'] as $ext => $label) {
        if (!extension_loaded($ext)) {
            $problems[] = "Розширення / extension: {$label} ({$ext})";
        }
    }
    foreach ([DATA_DIR, MEDIA_DIR, UPLOAD_DIR] as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        if (!is_dir($dir) || !is_writable($dir)) {
            $problems[] = 'Немає прав запису / not writable: ' . basename($dir) . '/';
        }
    }
    if (!$problems) {
        return;
    }
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>ONIKA — налаштування сервера</title>'
        . '<body style="font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#3d0f27">'
        . '<h1>ONIKA</h1><p>Сервер ще не готовий до запуску. Виправте:<br>The server is not ready yet. Please fix:</p><ul>';
    foreach ($problems as $p) {
        echo '<li>' . htmlspecialchars($p, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    echo '</ul><p style="color:#8b5a73">XAMPP: Config → php.ini → розкоментуйте / uncomment '
        . '<code>extension=pdo_sqlite</code>, <code>extension=gd</code>, <code>extension=mbstring</code>, '
        . '<code>extension=fileinfo</code> → Restart Apache.</p></body>';
    exit;
})();

/* -------------------------------------------------------------------- autoload */
spl_autoload_register(static function (string $class): void {
    if (strncmp($class, 'Onika\\', 6) !== 0) {
        return;
    }
    $file = APP_DIR . '/' . str_replace('\\', '/', substr($class, 6)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

require APP_DIR . '/helpers.php';

/* --------------------------------------------------------------------- config */
$GLOBALS['onika_config'] = (static function (): array {
    $cfg = require ROOT . '/config.php';
    $local = ROOT . '/config.local.php';
    if (is_file($local)) {
        $over = require $local;
        if (is_array($over)) {
            $cfg = array_replace($cfg, $over);
        }
    }
    return $cfg;
})();

// "Europe/Kyiv" is missing from very old time-zone databases: fall back to its former name, then UTC.
foreach ([(string) cfg('timezone', 'Europe/Kyiv'), 'Europe/Kiev', 'UTC'] as $tz) {
    if (@date_default_timezone_set($tz)) {
        break;
    }
}
mb_internal_encoding('UTF-8');

/* ------------------------------------------------------------- error handling */
error_reporting(E_ALL);
ini_set('display_errors', cfg('debug') ? '1' : '0');
ini_set('log_errors', '1');
@mkdir(DATA_DIR . '/logs', 0775, true);
ini_set('error_log', DATA_DIR . '/logs/php-error.log');

set_error_handler(static function (int $no, string $str, string $file, int $line): bool {
    if (!(error_reporting() & $no)) {
        return false;
    }
    // Warnings/notices are logged, not fatal.
    error_log("[$no] $str in $file:$line");
    return true;
});

set_exception_handler(static function (Throwable $e): void {
    if ($e instanceof \Onika\Halt) {
        $e->response->send();
        return;
    }
    error_log('[exception] ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    \Onika\Response::serverError($e)->send();
});
