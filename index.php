<?php
declare(strict_types=1);

/**
 * ONIKA — front controller. Every request that is not a real file lands here
 * (Apache: .htaccess rewrite; PHP built-in server: `php -S localhost:8080 index.php`).
 */

// PHP built-in server: let it serve real static files (css, js, images…) itself.
if (PHP_SAPI === 'cli-server') {
    $reqPath = explode('?', (string) $_SERVER['REQUEST_URI'], 2)[0];
    $file = __DIR__ . rawurldecode($reqPath);
    // Mirrors the .htaccess rules: internal folders and config files are never served.
    $internal = (bool) preg_match('#^/(app|data|dist|lang|tools)(/|$)|^/config(\.local)?\.php$|/\.#', $reqPath);
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

$qs = (string) ($_SERVER['QUERY_STRING'] ?? '');
$isGet = in_array(Request::method(), ['GET', 'HEAD'], true);
// "/RU/catalog", "/En" → the lower-case language prefix.
if ($isGet && preg_match('#^/(ru|en|uk)(?=/|$)#i', Request::path(), $lm) && $lm[1] !== strtolower($lm[1])) {
    Request::setPath('/' . strtolower($lm[1]) . substr(Request::path(), 3));
    Request::markMessy();
}
[$lang, $clean] = I18n::fromPath(Request::path());

// One canonical URL per page: "/uk/…" is the same as "/…", and "/catalog/", "//catalog" are "/catalog".
// (Only GET/HEAD: redirecting a POST would lose its body.)
if ($isGet && ((bool) preg_match('#^/uk(/|$)#', Request::path()) || Request::rawPathIsMessy())) {
    $target = $lang === 'uk' ? url($clean) : I18n::plainUrl('/' . $lang . ($clean === '/' ? '' : $clean));
    Response::redirect(Request::encodePath($target) . ($qs !== '' ? '?' . $qs : ''), 301)->send();
    return;
}

// API calls go to /api without a language prefix: answer in the language of the page that made them
// (?lang=xx, or the Referer of a same-site fetch) so names, URLs and messages match the storefront.
if (str_starts_with($clean, '/api/')) {
    $lang = I18n::fromRequest($lang);
}

// Admin panel language comes from a cookie (?lang=xx switches it); never from the URL.
$isAdmin = $clean === '/admin' || str_starts_with($clean, '/admin/');
if ($isAdmin) {
    $lang = is_string($_COOKIE['onika_lang'] ?? null) ? $_COOKIE['onika_lang'] : 'uk';
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
