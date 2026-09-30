<?php
declare(strict_types=1);

namespace Onika;

/** Three languages: uk (default, no URL prefix), ru (/ru), en (/en). */
final class I18n
{
    public const SUPPORTED = ['uk', 'ru', 'en'];
    public const NAMES = ['uk' => 'Українська', 'ru' => 'Русский', 'en' => 'English'];
    public const SHORT = ['uk' => 'UA', 'ru' => 'RU', 'en' => 'EN'];
    public const LOCALES = ['uk' => 'uk_UA', 'ru' => 'ru_RU', 'en' => 'en_US'];

    /** Keys (prefixes) exported to the browser. */
    private const CLIENT_PREFIXES = ['js.', 'cart.', 'cartPage.', 'common.', 'nl.', 'checkout.', 'catalog.', 'product.', 'sort.', 'search.', 'theme.', 'contacts.sent', 'contacts.fill'];

    private static string $lang = 'uk';
    /** Path without language prefix, e.g. "/catalog/futbolki". */
    private static string $cleanPath = '/';
    /** @var array<string,array<string,string|array>> */
    private static array $dict = [];
    private static ?array $cats = null;

    public static function lang(): string
    {
        return self::$lang;
    }

    public static function cleanPath(): string
    {
        return self::$cleanPath;
    }

    public static function set(string $lang, string $cleanPath = '/'): void
    {
        self::$lang = in_array($lang, self::SUPPORTED, true) ? $lang : 'uk';
        self::$cleanPath = $cleanPath;
    }

    /**
     * Split the request path into [lang, cleanPath].
     * "/ru/catalog" → ['ru', '/catalog'];  "/catalog" → ['uk', '/catalog'].
     */
    public static function fromPath(string $path): array
    {
        if (preg_match('#^/(ru|en|uk)(?=/|$)(.*)$#', $path, $m)) {
            $rest = $m[2] === '' ? '/' : $m[2];
            return [$m[1], $rest];
        }
        return ['uk', $path];
    }

    /* ------------------------------------------------------------- dictionary */
    private static function load(string $lang): array
    {
        if (!isset(self::$dict[$lang])) {
            $f = ROOT . "/lang/{$lang}.php";
            self::$dict[$lang] = is_file($f) ? (require $f) : [];
        }
        return self::$dict[$lang];
    }

    /** @return string|list<string> */
    public static function raw(string $key, ?string $lang = null): string|array
    {
        $l = $lang ?? self::$lang;
        $d = self::load($l);
        if (array_key_exists($key, $d)) {
            return $d[$key];
        }
        $uk = self::load('uk');
        return array_key_exists($key, $uk) ? $uk[$key] : $key;
    }

    public static function t(string $key, array $vars = []): string
    {
        $s = self::raw($key);
        if (is_array($s)) {
            $s = (string) ($s[0] ?? $key);
        }
        return self::subst($s, $vars);
    }

    /** Plural-aware: tn('common.products', 5) → "5 товарів"-style forms without the number. */
    public static function tn(string $key, int|float $n, array $vars = []): string
    {
        $forms = self::raw($key);
        if (is_array($forms)) {
            $s = $forms[min(self::pluralIndex(self::$lang, (int) $n), count($forms) - 1)];
        } else {
            $s = $forms;
        }
        return str_replace('{n}', (string) $n, self::subst($s, $vars));
    }

    private static function subst(string $s, array $vars): string
    {
        foreach ($vars as $k => $v) {
            $s = str_replace('{' . $k . '}', (string) $v, $s);
        }
        return $s;
    }

    private static function pluralIndex(string $lang, int $n): int
    {
        $n = abs($n);
        if ($lang === 'en') {
            return $n === 1 ? 0 : 1;
        }
        $n10 = $n % 10;
        $n100 = $n % 100;
        if ($n10 === 1 && $n100 !== 11) {
            return 0;
        }
        if ($n10 >= 2 && $n10 <= 4 && !($n100 >= 12 && $n100 <= 14)) {
            return 1;
        }
        return 2;
    }

    /** Dictionary subset for the browser (window.ONIKA.t). */
    public static function client(): array
    {
        $out = [];
        $d = array_replace(self::load('uk'), self::load(self::$lang));
        foreach ($d as $k => $v) {
            foreach (self::CLIENT_PREFIXES as $p) {
                if (strncmp($k, $p, strlen($p)) === 0) {
                    $out[$k] = $v;
                    break;
                }
            }
        }
        return $out;
    }

    /* ---------------------------------------------------------- content names */
    public static function categoryName(string $name, ?string $lang = null): string
    {
        $l = $lang ?? self::$lang;
        if ($l === 'uk') {
            return $name;
        }
        self::$cats ??= (is_file(ROOT . '/lang/categories.php') ? require ROOT . '/lang/categories.php' : []);
        if (isset(self::$cats[$name])) {
            return self::$cats[$name][$l === 'ru' ? 0 : 1];
        }
        return $name;
    }

    /** Localised name for a category row that carries its own translations. */
    public static function categoryLabel(array $cat, ?string $lang = null): string
    {
        $l = $lang ?? self::$lang;
        if ($l !== 'uk' && !empty($cat['translations'][$l]['name'])) {
            return (string) $cat['translations'][$l]['name'];
        }
        return self::categoryName((string) $cat['name'], $l);
    }

    public static function productName(array $p, ?string $lang = null): string
    {
        $l = $lang ?? self::$lang;
        if ($l !== 'uk' && !empty($p['translations'][$l]['name'])) {
            return (string) $p['translations'][$l]['name'];
        }
        return (string) $p['name'];
    }

    public static function productDescription(array $p, ?string $lang = null): string
    {
        $l = $lang ?? self::$lang;
        if ($l !== 'uk' && !empty($p['translations'][$l]['description'])) {
            return (string) $p['translations'][$l]['description'];
        }
        return (string) ($p['description'] ?? '');
    }

    /* -------------------------------------------------------------------- urls */
    /** Language prefix for the current language ("" for uk). */
    public static function prefix(?string $lang = null): string
    {
        $l = $lang ?? self::$lang;
        return $l === 'uk' ? '' : '/' . $l;
    }

    /** App URL (base + language prefix + path[?query]). External URLs pass through. */
    public static function url(string $path = '/'): string
    {
        if (preg_match('#^(https?:|mailto:|tel:|data:|//|\#)#i', $path)) {
            return $path;
        }
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }
        $base = Request::base();
        $prefix = self::prefix();
        if ($path === '/') {
            return ($base . $prefix) === '' ? '/' : $base . $prefix . ($prefix === '' ? '/' : '');
        }
        return $base . $prefix . $path;
    }

    /** Language-independent URL (no prefix) — used for admin, assets, API. */
    public static function plainUrl(string $path = '/'): string
    {
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }
        $base = Request::base();
        return $path === '/' && $base === '' ? '/' : $base . $path;
    }

    /** @return array{uk:string,ru:string,en:string} paths (with base) for the current page in every language. */
    public static function alternates(?string $cleanPathWithQuery = null): array
    {
        $p = $cleanPathWithQuery ?? self::$cleanPath;
        $qpos = strpos($p, '?');
        $query = $qpos === false ? '' : substr($p, $qpos);
        $path = $qpos === false ? $p : substr($p, 0, $qpos);
        $base = Request::base();
        $out = [];
        foreach (self::SUPPORTED as $l) {
            $pre = $l === 'uk' ? '' : '/' . $l;
            $full = $pre . ($path === '/' ? '' : $path);
            $out[$l] = $base . ($full === '' ? '/' : $full) . $query;
        }
        return $out;
    }

    public static function abs(string $urlOrPath): string
    {
        if (preg_match('#^https?://#i', $urlOrPath)) {
            return $urlOrPath;
        }
        $origin = (Request::isHttps() ? 'https' : 'http') . '://' . Request::host();
        return $origin . $urlOrPath;
    }
}
