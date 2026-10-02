<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

final class Categories
{
    private const COLORS = ['#e11d74', '#ec4899', '#be185d', '#a21caf', '#f59e0b', '#fb7185', '#ea580c', '#9d174d', '#c026d3', '#db2777'];

    public static function hydrate(array $c): array
    {
        return [
            'id' => (string) $c['id'],
            'name' => (string) $c['name'],
            'slug' => (string) $c['slug'],
            'description' => (string) ($c['description'] ?? ''),
            'color' => (string) ($c['color'] ?? '#e11d74'),
            'order' => (int) $c['sort_order'],
            'active' => (int) $c['active'] === 1,
            'translations' => (array) Text::jsonDecode($c['translations'] ?? '{}', []),
            'count' => (int) ($c['cnt'] ?? 0),
            'total' => (int) ($c['total'] ?? 0),
        ];
    }

    /** All categories (admin), with active/total product counts. */
    public static function all(): array
    {
        $rows = Db::all(
            'SELECT c.*,
                    (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.active = 1) AS cnt,
                    (SELECT COUNT(*) FROM products p WHERE p.category = c.name) AS total
             FROM categories c ORDER BY c.sort_order ASC, c.name ASC'
        );
        return array_map([self::class, 'hydrate'], $rows);
    }

    /** Storefront categories: active and containing at least one visible product. */
    public static function visible(): array
    {
        return array_values(array_filter(self::all(), static fn(array $c) => $c['active'] && $c['count'] > 0));
    }

    public static function find(string $slugOrName): ?array
    {
        $r = Db::one(
            'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.active = 1) AS cnt,
                    (SELECT COUNT(*) FROM products p WHERE p.category = c.name) AS total
             FROM categories c WHERE c.slug = ? OR c.name = ? OR c.id = ? LIMIT 1',
            [$slugOrName, $slugOrName, $slugOrName]
        );
        return $r ? self::hydrate($r) : null;
    }

    /** Make sure a category with this name exists (used when a product is saved with a new one). */
    public static function ensure(string $name): void
    {
        $name = trim($name);
        if ($name === '' || Db::val('SELECT 1 FROM categories WHERE name = ?', [$name])) {
            return;
        }
        self::create(['name' => $name]);
    }

    public static function uniqueSlug(string $base, string $exceptId = ''): string
    {
        $slug = $base;
        $n = 2;
        while (true) {
            $hit = Db::val('SELECT id FROM categories WHERE slug = ? LIMIT 1', [$slug]);
            if ($hit === null || (string) $hit === $exceptId) {
                return $slug;
            }
            $slug = $base . '-' . $n++;
        }
    }

    private static function create(array $in): string
    {
        $name = trim((string) $in['name']);
        $id = Text::uid('c');
        $order = (int) Db::val('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories');
        Db::exec(
            'INSERT INTO categories (id,name,slug,description,color,sort_order,active,translations) VALUES (?,?,?,?,?,?,1,?)',
            [$id, $name, self::uniqueSlug(Text::slugify($name)), Text::clean($in['description'] ?? ''), self::color($in['color'] ?? null, $order), $order, Text::jsonEncode((object) ($in['translations'] ?? []))]
        );
        return $id;
    }

    private static function color(?string $c, int $i): string
    {
        return $c && preg_match('/^#[0-9a-fA-F]{6}$/', $c) ? strtolower($c) : self::COLORS[$i % count(self::COLORS)];
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
            if (Db::val('SELECT 1 FROM categories WHERE name = ?', [$name])) {
                return ['ok' => false, 'error' => 'exists'];
            }
            return ['ok' => true, 'id' => self::create(['name' => $name, 'description' => $in['description'] ?? '', 'color' => $in['color'] ?? null, 'translations' => $tr])];
        }
        $cur = Db::one('SELECT * FROM categories WHERE id = ?', [$id]);
        if (!$cur) {
            return ['ok' => false, 'error' => 'not_found'];
        }
        $name = $name !== '' ? $name : $cur['name'];
        if ($name !== $cur['name'] && Db::val('SELECT 1 FROM categories WHERE name = ?', [$name])) {
            return ['ok' => false, 'error' => 'exists'];
        }
        Db::tx(function () use ($id, $cur, $name, $in, $tr): void {
            if ($name !== $cur['name']) {
                Db::exec('UPDATE products SET category = ?, search_blob = search_blob || ? WHERE category = ?', [$name, ' ' . Text::lower($name), $cur['name']]);
            }
            Db::exec(
                'UPDATE categories SET name=?, description=?, color=?, translations=? WHERE id=?',
                [$name, Text::clean($in['description'] ?? $cur['description']), self::color($in['color'] ?? $cur['color'], (int) $cur['sort_order']), $tr ? Text::jsonEncode($tr) : ($cur['translations'] ?: '{}'), $id]
            );
        });
        return ['ok' => true, 'id' => $id];
    }

    public static function toggle(string $id): void
    {
        Db::exec('UPDATE categories SET active = 1 - active WHERE id = ?', [$id]);
    }

    /** Only empty categories can be deleted. */
    public static function delete(string $id): bool
    {
        $c = Db::one('SELECT name FROM categories WHERE id = ?', [$id]);
        if (!$c || (int) Db::val('SELECT COUNT(*) FROM products WHERE category = ?', [$c['name']]) > 0) {
            return false;
        }
        Db::exec('DELETE FROM categories WHERE id = ?', [$id]);
        return true;
    }
}
