<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

final class Brands
{
    public static function hydrate(array $b): array
    {
        return [
            'id' => (string) $b['id'],
            'name' => (string) $b['name'],
            'slug' => (string) $b['slug'],
            'description' => (string) ($b['description'] ?? ''),
            'order' => (int) $b['sort_order'],
            'active' => (int) $b['active'] === 1,
            'translations' => (array) Text::jsonDecode($b['translations'] ?? '{}', []),
            'count' => (int) ($b['cnt'] ?? 0),
            'total' => (int) ($b['total'] ?? 0),
        ];
    }

    public static function all(): array
    {
        $rows = Db::all(
            'SELECT b.*,
                    (SELECT COUNT(*) FROM products p WHERE p.brand = b.name AND p.active = 1) AS cnt,
                    (SELECT COUNT(*) FROM products p WHERE p.brand = b.name) AS total
             FROM brands b ORDER BY b.sort_order ASC, b.name ASC'
        );
        return array_map([self::class, 'hydrate'], $rows);
    }

    /** Storefront brands (active with visible products), ordered by product count. */
    public static function visible(): array
    {
        $list = array_values(array_filter(self::all(), static fn(array $b) => $b['active'] && $b['count'] > 0));
        usort($list, static fn($a, $b) => [$b['count'], $a['name']] <=> [$a['count'], $b['name']]);
        return $list;
    }

    public static function ensure(string $name): void
    {
        $name = trim($name);
        if ($name === '' || Db::val('SELECT 1 FROM brands WHERE name = ?', [$name])) {
            return;
        }
        self::create($name, '', []);
    }

    private static function uniqueSlug(string $base, string $exceptId = ''): string
    {
        $slug = $base;
        $n = 2;
        while (true) {
            $hit = Db::val('SELECT id FROM brands WHERE slug = ? LIMIT 1', [$slug]);
            if ($hit === null || (string) $hit === $exceptId) {
                return $slug;
            }
            $slug = $base . '-' . $n++;
        }
    }

    private static function create(string $name, string $description, array $tr): string
    {
        $id = Text::uid('b');
        $order = (int) Db::val('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM brands');
        Db::exec(
            'INSERT INTO brands (id,name,slug,description,sort_order,active,translations) VALUES (?,?,?,?,?,1,?)',
            [$id, $name, self::uniqueSlug(Text::slugify($name)), Text::clean($description), $order, Text::jsonEncode((object) $tr)]
        );
        return $id;
    }

    /** @return array{ok:bool,error?:string,id?:string} */
    public static function save(array $in): array
    {
        $name = trim((string) ($in['name'] ?? ''));
        $tr = [];
        foreach (['ru', 'en'] as $l) {
            $n = trim((string) ($in['name_' . $l] ?? ''));
            $d = Text::clean((string) ($in['desc_' . $l] ?? ''));
            if ($n !== '' || $d !== '') {
                $tr[$l] = ['name' => $n, 'description' => $d];
            }
        }
        $id = (string) ($in['id'] ?? '');
        if ($id === '') {
            if ($name === '') {
                return ['ok' => false, 'error' => 'name'];
            }
            if (Db::val('SELECT 1 FROM brands WHERE name = ?', [$name])) {
                return ['ok' => false, 'error' => 'exists'];
            }
            return ['ok' => true, 'id' => self::create($name, (string) ($in['description'] ?? ''), $tr)];
        }
        $cur = Db::one('SELECT * FROM brands WHERE id = ?', [$id]);
        if (!$cur) {
            return ['ok' => false, 'error' => 'not_found'];
        }
        $name = $name !== '' ? $name : $cur['name'];
        if ($name !== $cur['name'] && Db::val('SELECT 1 FROM brands WHERE name = ?', [$name])) {
            return ['ok' => false, 'error' => 'exists'];
        }
        Db::tx(function () use ($id, $cur, $name, $in, $tr): void {
            if ($name !== $cur['name']) {
                Db::exec('UPDATE products SET brand = ?, search_blob = search_blob || ? WHERE brand = ?', [$name, ' ' . Text::lower($name), $cur['name']]);
            }
            Db::exec(
                'UPDATE brands SET name=?, description=?, translations=? WHERE id=?',
                [$name, Text::clean($in['description'] ?? $cur['description']), $tr ? Text::jsonEncode($tr) : ($cur['translations'] ?: '{}'), $id]
            );
        });
        return ['ok' => true, 'id' => $id];
    }

    public static function toggle(string $id): void
    {
        Db::exec('UPDATE brands SET active = 1 - active WHERE id = ?', [$id]);
    }

    public static function delete(string $id): bool
    {
        $b = Db::one('SELECT name FROM brands WHERE id = ?', [$id]);
        if (!$b || (int) Db::val('SELECT COUNT(*) FROM products WHERE brand = ?', [$b['name']]) > 0) {
            return false;
        }
        Db::exec('DELETE FROM brands WHERE id = ?', [$id]);
        return true;
    }
}
