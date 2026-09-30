<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

/** Shop-wide settings (single JSON row) — contact info, hero texts, shipping threshold. */
final class Settings
{
    private static ?array $cache = null;

    public static function defaults(): array
    {
        return [
            'siteName' => 'ONIKA',
            'tagline' => 'Одяг із характером',
            'heroTitle' => 'Нова колекція вже тут',
            'heroSubtitle' => 'Жіночий та дитячий одяг, взуття, білизна і аксесуари від улюблених брендів. Оригінальні речі за чесними цінами.',
            'announcement' => 'Безкоштовна доставка від 5000 ₴ · Відправка Новою поштою щодня · Оригінал 100%',
            'translations' => [
                'ru' => [
                    'tagline' => 'Одежда с характером',
                    'heroTitle' => 'Новая коллекция уже здесь',
                    'heroSubtitle' => 'Женская и детская одежда, обувь, бельё и аксессуары от любимых брендов. Оригинальные вещи по честным ценам.',
                    'announcement' => 'Бесплатная доставка от 5000 ₴ · Отправка Новой почтой ежедневно · Оригинал 100%',
                ],
                'en' => [
                    'tagline' => 'Clothing with character',
                    'heroTitle' => 'The new collection is here',
                    'heroSubtitle' => "Women's and kids' clothing, shoes, lingerie and accessories from your favourite brands. Original items at fair prices.",
                    'announcement' => 'Free shipping from ₴5000 · Nova Poshta shipping daily · 100% original',
                ],
            ],
            'phone' => '+380 (67) 000-00-00',
            'email' => 'hello@onika.shop',
            'address' => 'м. Київ, вул. Хрещатик, 1',
            'instagram' => 'https://instagram.com/',
            'telegram' => 'https://t.me/',
            'freeShippingFrom' => 5000,
            'currency' => '₴',
        ];
    }

    public static function all(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        $def = self::defaults();
        $row = Db::val("SELECT value FROM settings WHERE key = 'site'");
        $stored = $row ? Text::jsonDecode((string) $row, []) : [];
        $s = array_replace($def, is_array($stored) ? $stored : []);
        $tr = is_array($s['translations'] ?? null) ? $s['translations'] : [];
        foreach (['ru', 'en'] as $l) {
            $tr[$l] = array_replace($def['translations'][$l], is_array($tr[$l] ?? null) ? $tr[$l] : []);
        }
        $s['translations'] = $tr;
        return self::$cache = $s;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    public static function update(array $patch): void
    {
        $s = array_replace(self::all(), $patch);
        Db::exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('site', ?)", [Text::jsonEncode($s)]);
        self::$cache = null;
    }

    /** Localised text field (falls back to Ukrainian). */
    public static function tr(string $field, string $lang): string
    {
        $s = self::all();
        if ($lang !== 'uk' && !empty($s['translations'][$lang][$field])) {
            return (string) $s['translations'][$lang][$field];
        }
        return (string) ($s[$field] ?? '');
    }
}
