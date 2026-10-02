<?php
declare(strict_types=1);

namespace Onika;

use Onika\Repo\Settings;

/** First-run data: catalog (data/seed/catalog.json), default settings and the admin account. */
final class Seeder
{
    public static function run(): void
    {
        Db::tx(static function (): void {
            self::catalog();
            self::settings();
            self::admin();
        });
    }

    private static function catalog(): void
    {
        $file = DATA_DIR . '/seed/catalog.json';
        if (!is_file($file)) {
            return;
        }
        $seed = Text::jsonDecode((string) file_get_contents($file), []);
        $catTr = is_file(ROOT . '/lang/categories.php') ? (require ROOT . '/lang/categories.php') : [];

        $insC = Db::pdo()->prepare('INSERT OR IGNORE INTO categories (id,name,slug,description,color,sort_order,active,translations) VALUES (?,?,?,?,?,?,?,?)');
        foreach ($seed['categories'] ?? [] as $c) {
            $insC->execute([
                (string) $c['id'], $c['name'], $c['slug'], (string) ($c['description'] ?? ''), $c['color'] ?? '#e11d74',
                (int) ($c['sort_order'] ?? 0), !empty($c['active']) ? 1 : 0, Text::jsonEncode((object) ($c['translations'] ?? [])),
            ]);
        }
        $insB = Db::pdo()->prepare('INSERT OR IGNORE INTO brands (id,name,slug,description,sort_order,active,translations) VALUES (?,?,?,?,?,?,?)');
        foreach ($seed['brands'] ?? [] as $b) {
            $insB->execute([
                (string) $b['id'], $b['name'], $b['slug'], (string) ($b['description'] ?? ''),
                (int) ($b['sort_order'] ?? 0), !empty($b['active']) ? 1 : 0, Text::jsonEncode((object) ($b['translations'] ?? [])),
            ]);
        }

        $insP = Db::pdo()->prepare('INSERT OR IGNORE INTO products
            (id,name,slug,price,old_price,category,brand,description,images,in_stock,stock_qty,featured,active,sizes,tags,search_blob,sku,views,sales,translations,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($seed['products'] ?? [] as $p) {
            $tr = $p['translations'] ?? [];
            $blob = Text::blob([
                $p['name'], $p['brand'] ?? '', $p['category'], $catTr[$p['category']] ?? [], $p['description'] ?? '',
                $tr['ru']['name'] ?? '', $tr['en']['name'] ?? '',
            ]);
            // "stock" = pieces on hand; when the catalog has no number, an in-stock product counts as 1 piece.
            $stock = isset($p['stock']) ? max(0, (int) $p['stock']) : (!empty($p['in_stock']) ? 1 : 0);
            $insP->execute([
                (string) $p['id'], $p['name'], $p['slug'], (float) $p['price'],
                isset($p['old_price']) && $p['old_price'] ? (float) $p['old_price'] : null,
                $p['category'], $p['brand'] ?: null, (string) $p['description'],
                Text::jsonEncode(array_values($p['images'] ?? [])), $stock > 0 ? 1 : 0, $stock,
                !empty($p['featured']) ? 1 : 0, !empty($p['active']) ? 1 : 0,
                Text::jsonEncode(array_values($p['sizes'] ?? [])), Text::jsonEncode(array_values($p['tags'] ?? [])),
                $blob, $p['sku'] ?? null, (int) ($p['views'] ?? 0), 0, Text::jsonEncode((object) $tr),
                $p['created_at'] ?? Text::now(), $p['updated_at'] ?? null,
            ]);
        }
    }

    private static function settings(): void
    {
        if (Db::val("SELECT COUNT(*) FROM settings WHERE key = 'site'") == 0) {
            Db::exec("INSERT INTO settings (key, value) VALUES ('site', ?)", [Text::jsonEncode(Settings::defaults())]);
        }
    }

    private static function admin(): void
    {
        if ((int) Db::val('SELECT COUNT(*) FROM admins') > 0) {
            return;
        }
        Db::exec(
            'INSERT INTO admins (username, password, must_change, created_at) VALUES (?,?,1,?)',
            [(string) cfg('admin_default_user', 'admin'), password_hash((string) cfg('admin_default_pass', 'onika2024'), PASSWORD_DEFAULT), Text::now()]
        );
    }
}
