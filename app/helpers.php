<?php
declare(strict_types=1);

/**
 * Global helper functions used by controllers and templates.
 */

use Onika\I18n;
use Onika\Media;
use Onika\Repo\Settings;
use Onika\Session;

function cfg(string $key, mixed $default = null): mixed
{
    return $GLOBALS['onika_config'][$key] ?? $default;
}

/** HTML-escape. */
function e(mixed $v): string
{
    return htmlspecialchars((string) ($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Per-request CSP nonce for inline scripts. */
function nonce(): string
{
    static $n = null;
    return $n ??= rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
}

/** Language-aware app URL, e.g. url('/catalog') → /onika/ru/catalog. */
function url(string $path = '/'): string
{
    return I18n::url($path);
}

/** URL that never gets a language prefix (admin, API, assets). */
function purl(string $path = '/'): string
{
    return I18n::plainUrl($path);
}

/** Versioned URL of a file under /assets. */
function asset(string $file): string
{
    $fs = ROOT . '/assets/' . ltrim($file, '/');
    $v = is_file($fs) ? substr(md5((string) filemtime($fs)), 0, 8) : '0';
    return purl('/assets/' . ltrim($file, '/')) . '?v=' . $v;
}

function t(string $key, array $vars = []): string
{
    return I18n::t($key, $vars);
}

function tn(string $key, int|float $n, array $vars = []): string
{
    return I18n::tn($key, $n, $vars);
}

function money(int|float|string|null $n, ?string $currency = null): string
{
    $n = (float) $n;
    $currency ??= (string) Settings::get('currency', '₴');
    $decimals = abs($n - round($n)) > 0.004 ? 2 : 0;
    return number_format($n, $decimals, ',', "\u{00A0}") . "\u{00A0}" . $currency;
}

/** Inline SVG icon referencing the sprite (see icon_sprite()). */
function icon(string $name, string $class = ''): string
{
    return '<svg class="ic' . ($class !== '' ? ' ' . e($class) : '') . '" aria-hidden="true" focusable="false"><use href="#i-' . e($name) . '"/></svg>';
}

/** Hidden SVG sprite with all icons; printed once per page. */
function icon_sprite(): string
{
    static $icons = null;
    $icons ??= require APP_DIR . '/icons.php';
    $out = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
    foreach ($icons as $name => $inner) {
        $out .= '<symbol id="i-' . $name . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' . $inner . '</symbol>';
    }
    return $out . '</defs></svg>';
}

/** Resized image URL for a stored path ("images/x.jpg", "uploads/x.jpg" or an absolute URL). */
function media(?string $src, int $width = 600): string
{
    return Media::url($src, $width);
}

function media_srcset(?string $src, array $widths): string
{
    return Media::srcset($src, $widths);
}

function csrf_token(): string
{
    return Session::csrf();
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(Session::csrf()) . '">';
}

/** Format a stored UTC ISO timestamp in the configured time zone. */
function dt(?string $iso, bool $withTime = false): string
{
    if (!$iso) {
        return '—';
    }
    $ts = strtotime($iso);
    if ($ts === false) {
        return '—';
    }
    return date($withTime ? 'd.m.Y H:i' : 'd.m.Y', $ts);
}

/** JSON for use inside an HTML attribute. */
function json_attr(mixed $v): string
{
    return e(json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
}

/** JSON safe for embedding inside <script>. */
function json_script(mixed $v): string
{
    // Escape everything that could end a <script> block or break out of it (the JSON escape for "<" is backslash-u003c).
    return str_replace(
        ['<', '>', '&', "\u{2028}", "\u{2029}"],
        ['\u003c', '\u003e', '\u0026', '\u2028', '\u2029'],
        (string) json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE)
    );
}

/** Render a template from app/views (no layout). */
function view(string $name, array $data = []): string
{
    return \Onika\View::partial($name, $data);
}

/** Tel: href from a phone string. */
function tel_href(string $phone): string
{
    return 'tel:' . preg_replace('/[^+\d]/', '', $phone);
}

/** Two-letter avatar initial. */
function initial(string $s): string
{
    $s = trim($s);
    return $s === '' ? 'U' : mb_strtoupper(mb_substr($s, 0, 1));
}

/** Query string with readable array params: category[]=a&category[]=b (empty values dropped). */
function query_string(array $params): string
{
    $clean = [];
    foreach ($params as $k => $v) {
        if (is_array($v)) {
            $v = array_values(array_filter($v, static fn($x) => $x !== '' && $x !== null));
            if (!$v) {
                continue;
            }
        } elseif ($v === '' || $v === null || $v === false) {
            continue;
        }
        $clean[$k] = $v;
    }
    $qs = http_build_query($clean, '', '&', PHP_QUERY_RFC3986);
    $qs = (string) preg_replace('/%5B\d+%5D=/', '%5B%5D=', $qs);
    return str_replace(['%5B', '%5D'], ['[', ']'], $qs);
}

/** Plain text → safe HTML paragraphs (blank line = new paragraph, single newline = <br>). */
function text_html(string $text): string
{
    $text = trim(str_replace(["\r\n", "\r"], "\n", $text));
    if ($text === '') {
        return '';
    }
    $out = '';
    foreach (preg_split('/\n{2,}/', $text) ?: [] as $para) {
        $out .= '<p>' . str_replace("\n", '<br>', e(trim($para))) . '</p>';
    }
    return $out;
}

/** Brand logo <img> (optimised 1x/2x files from assets/img). $height is the CSS height in px. */
function logo_tag(string $alt, int $height = 40, string $class = ''): string
{
    static $ratio = null;
    if ($ratio === null) {
        $size = @getimagesize(ROOT . '/assets/img/logo.png');
        $ratio = $size ? $size[0] / $size[1] : 3.9;
    }
    return '<img' . ($class !== '' ? ' class="' . e($class) . '"' : '') . ' src="' . e(purl('/assets/img/logo.png')) . '" srcset="' . e(purl('/assets/img/logo.png')) . ' 1x, '
        . e(purl('/assets/img/logo@2x.png')) . ' 2x" alt="' . e($alt) . '" width="' . (int) round($height * $ratio) . '" height="' . $height . '">';
}
