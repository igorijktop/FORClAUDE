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
        return self::lower(implode(' ', $flat));
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
