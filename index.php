<?php
declare(strict_types=1);

/**
 * ONIKA — front controller. Every request that is not a real file lands here
 * (Apache: .htaccess rewrite; PHP built-in server: `php -S localhost:8080 index.php`).
 */

// PHP built-in server: let it serve real static files (css, js, images…) itself.
if (PHP_SAPI === 'cli-server') {
    $reqPath = (string) parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . rawurldecode($reqPath);
    // Mirrors the .htaccess rules: internal folders and config files are never served.
    $internal = (bool) preg_match('#^/(app|data|lang|tools)(/|$)|^/config(\.local)?\.php$|/\.#', $reqPath);
    if ($reqPath !== '/' && !$internal && is_file($file) && !str_ends_with($file, '.php')) {
        return false;
    }
}

require __DIR__ . '/app/bootstrap.php';

use Onika\I18n;
use Onika\Request;
use Onika\Response;
use Onika\Router;

Request::init();

[$lang, $clean] = I18n::fromPath(Request::path());

// "/uk/…" is the same as "/…": keep one canonical URL per page.
if ($lang === 'uk' && str_starts_with(Request::path(), '/uk')) {
    $qs = (string) ($_SERVER['QUERY_STRING'] ?? '');
    Response::redirect(url($clean) . ($qs !== '' ? '?' . $qs : ''), 301)->send();
    return;
}

// Admin panel language comes from a cookie (?lang=xx switches it); never from the URL.
$isAdmin = $clean === '/admin' || str_starts_with($clean, '/admin/');
if ($isAdmin) {
    $lang = (string) ($_COOKIE['onika_lang'] ?? 'uk');
    if (isset($_GET['lang']) && in_array($_GET['lang'], I18n::SUPPORTED, true)) {
        setcookie('onika_lang', (string) $_GET['lang'], [
            'expires' => time() + 31536000, 'path' => Request::base() ?: '/', 'samesite' => 'Lax', 'httponly' => false,
        ]);
        $q = $_GET;
        unset($q['lang']);
        Response::redirect(purl($clean) . ($q ? '?' . query_string($q) : ''))->send();
        return;
    }
}
I18n::set($lang, $clean);
Request::setPath($clean);

$router = new Router();
(require __DIR__ . '/app/routes.php')($router);

$response = $router->dispatch(Request::method(), $clean);
$response->send();
