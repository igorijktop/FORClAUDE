<?php
declare(strict_types=1);

namespace Onika;

/** String helpers: transliteration, slugs, ids, search text. */
final class Text
{
    private const TRANSLIT = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'ґ' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e', 'є' => 'ie',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'і' => 'i', 'ї' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h',
        'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'shch', 'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e',
        'ю' => 'iu', 'я' => 'ia',
    ];

    public static function lower(string $s): string
    {
        return mb_strtolower($s, 'UTF-8');
    }

    /**
     * Form text that must fit on one line (names, cities, phones): any value type is accepted
     * (arrays give ""), invalid UTF-8 and control characters are dropped, whitespace is collapsed.
     */
    public static function line(mixed $v, int $max = 200): string
    {
        if (!is_scalar($v)) {
            return '';
        }
        $s = mb_scrub((string) $v, 'UTF-8');
        $s = preg_replace('/[\p{Cc}\p{Zl}\p{Zp}\x{200B}\x{FEFF}]+/u', ' ', $s) ?? '';
        return self::truncate($s, $max);
    }

    /**
     * Search-friendly form of a lower-cased text: "ё" matches "е", every apostrophe variant
     * (’ ʼ ` ´) is the plain one, so "м’ята" finds "м'ята".
     */
    public static function searchNorm(string $s): string
    {
        return strtr($s, ['ё' => 'е', '’' => "'", 'ʼ' => "'", '`' => "'", '´' => "'", '‘' => "'"]);
    }

    /**
     * Normalise a phone number. Ukrainian numbers in any common notation (+380…, 380…, 80…, 0XX…)
     * become "+380 XX XXX XX XX"; other international numbers keep their digits with a "+".
     * Returns null when the value cannot be a phone number.
     */
    public static function phone(string $s): ?string
    {
        $s = trim($s);
        if ($s === '' || preg_match('/[^\d\s+()\-.\/]/', $s)) {
            return null;
        }
        $d = self::phoneDigits($s);
        if (str_starts_with($d, '00')) {
            $d = substr($d, 2);
        } elseif (strlen($d) === 10 && $d[0] === '0') {
            $d = '38' . $d;
        } elseif (strlen($d) === 11 && str_starts_with($d, '80')) {
            $d = '3' . $d;
        } elseif (strlen($d) === 13 && str_starts_with($d, '3800')) {
            $d = '380' . substr($d, 4);       // "+380 067…": the trunk zero typed twice
        }
        if (str_starts_with($d, '380')) {
            if (strlen($d) !== 12 || $d[3] === '0') {
                return null;
            }
            return '+380 ' . substr($d, 3, 2) . ' ' . substr($d, 5, 3) . ' ' . substr($d, 8, 2) . ' ' . substr($d, 10, 2);
        }
        if ($d === '' || $d[0] === '0' || strlen($d) < 10 || strlen($d) > 15) {
            return null;
        }
        return '+' . $d;
    }

    public static function slugify(string $s, int $max = 60): string
    {
        $s = self::lower($s);
        $s = strtr($s, self::TRANSLIT);
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        $s = trim($s, '-');
        $s = substr($s, 0, $max);
        return trim($s, '-') ?: 'item';
    }

    /** Unique-ish id: prefix + time + random. */
    public static function uid(string $prefix = 'id'): string
    {
        return $prefix . '_' . base_convert((string) (int) (microtime(true) * 1000), 10, 36) . bin2hex(random_bytes(3));
    }

    /** Normalise free text coming from forms: trim, unify line breaks, cap blank lines. */
    public static function clean(?string $s): string
    {
        $s = (string) $s;
        $s = str_replace(["\r\n", "\r"], "\n", $s);
        $s = preg_replace("/[ \t]+\n/", "\n", $s) ?? $s;
        $s = preg_replace("/\n{3,}/", "\n\n", $s) ?? $s;
        return trim($s);
    }

    /** Lower-cased text used by the storefront search. */
    public static function blob(array $parts): string
    {
        $flat = [];
        foreach ($parts as $p) {
            if (is_array($p)) {
                foreach ($p as $x) {
                    if (is_string($x) && $x !== '') {
                        $flat[] = $x;
                    }
                }
            } elseif (is_string($p) && $p !== '') {
                $flat[] = $p;
            }
        }
        return self::searchNorm(self::lower(implode(' ', $flat)));
    }

    public static function truncate(string $s, int $len): string
    {
        $s = trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
        if (mb_strlen($s) <= $len) {
            return $s;
        }
        return rtrim(mb_substr($s, 0, $len - 1), " ,.;:-—") . '…';
    }

    public static function isEmail(string $s): bool
    {
        return (bool) filter_var($s, FILTER_VALIDATE_EMAIL) && mb_strlen($s) <= 190;
    }

    /** Digits-only phone length check (Ukrainian numbers: 10–12 digits). */
    public static function phoneDigits(string $s): string
    {
        return preg_replace('/\D+/', '', $s) ?? '';
    }

    public static function boolish(mixed $v): bool
    {
        return $v === true || $v === 1 || $v === '1' || $v === 'on' || $v === 'true' || $v === 'yes';
    }

    public static function jsonDecode(?string $s, mixed $fallback = []): mixed
    {
        if ($s === null || $s === '') {
            return $fallback;
        }
        $d = json_decode($s, true);
        return json_last_error() === JSON_ERROR_NONE ? $d : $fallback;
    }

    public static function jsonEncode(mixed $v): string
    {
        return (string) json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public static function now(): string
    {
        return gmdate('Y-m-d\TH:i:s.000\Z');
    }
}
