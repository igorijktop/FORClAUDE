<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\I18n;
use Onika\Media;
use Onika\Text;

final class Products
{
    public static function hydrate(array $r): array
    {
        return [
            'id' => (string) $r['id'],
            'name' => (string) $r['name'],
            'slug' => (string) $r['slug'],
            'price' => (float) $r['price'],
            'oldPrice' => $r['old_price'] !== null ? (float) $r['old_price'] : null,
            'category' => (string) ($r['category'] ?? ''),
            'brand' => $r['brand'] !== null && $r['brand'] !== '' ? (string) $r['brand'] : null,
            'description' => (string) ($r['description'] ?? ''),
            'images' => array_values(array_filter((array) Text::jsonDecode($r['images'] ?? '[]', []), 'is_string')),
            'inStock' => (int) $r['in_stock'] === 1,
            'featured' => (int) $r['featured'] === 1,
            'active' => (int) $r['active'] === 1,
            'sizes' => array_values(array_filter((array) Text::jsonDecode($r['sizes'] ?? '[]', []), 'is_string')),
            'tags' => array_values(array_filter((array) Text::jsonDecode($r['tags'] ?? '[]', []), 'is_string')),
            'sku' => $r['sku'] ?? null,
            'views' => (int) ($r['views'] ?? 0),
            'sales' => (int) ($r['sales'] ?? 0),
            'translations' => (array) Text::jsonDecode($r['translations'] ?? '{}', []),
            'createdAt' => $r['created_at'] ?? null,
            'updatedAt' => $r['updated_at'] ?? null,
        ];
    }

    /**
     * Product listing.
     * Filters: q, category[], brand[], min, max, in_stock, featured, sort, page, per_page,
     *          include_inactive (admin: also hidden products / hidden categories).
     * @return array{items:list<array>,total:int,page:int,pages:int,perPage:int}
     */
    public static function search(array $f = []): array
    {
        $where = [];
        $params = [];
        $admin = !empty($f['include_inactive']);
        if (!$admin) {
            $where[] = 'active = 1';
            $where[] = "COALESCE(category, '') NOT IN (SELECT name FROM categories WHERE active = 0)";
        }
        $q = trim((string) ($f['q'] ?? ''));
        if ($q !== '') {
            foreach (array_slice(preg_split('/\s+/u', Text::lower($q)) ?: [], 0, 6) as $term) {
                if ($term === '') {
                    continue;
                }
                $where[] = "search_blob LIKE ? ESCAPE '\\'";
                $params[] = Db::like($term);
            }
        }
        $cats = array_values(array_filter((array) ($f['category'] ?? []), 'strlen'));
        if ($cats) {
            $where[] = 'category IN (' . Db::in($cats) . ')';
            array_push($params, ...$cats);
        }
        $brands = array_values(array_filter((array) ($f['brand'] ?? []), 'strlen'));
        if ($brands) {
            $where[] = 'brand IN (' . Db::in($brands) . ')';
            array_push($params, ...$brands);
        }
        if (isset($f['min']) && $f['min'] !== '' && is_numeric($f['min'])) {
            $where[] = 'price >= ?';
            $params[] = (float) $f['min'];
        }
        if (isset($f['max']) && $f['max'] !== '' && is_numeric($f['max'])) {
            $where[] = 'price <= ?';
            $params[] = (float) $f['max'];
        }
        if (!empty($f['in_stock'])) {
            $where[] = 'in_stock = 1';
        }
        if (!empty($f['featured'])) {
            $where[] = 'featured = 1';
        }
        if (isset($f['status']) && $f['status'] !== '') {
            $where[] = match ((string) $f['status']) {
                'active' => 'active = 1',
                'hidden' => 'active = 0',
                'out' => 'in_stock = 0',
                default => '1 = 1',
            };
        }
        $sql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

        $order = match ((string) ($f['sort'] ?? 'new')) {
            'price-asc' => 'price ASC, id DESC',
            'price-desc' => 'price DESC, id DESC',
            'popular' => 'views DESC, created_at DESC',
            'name' => 'name COLLATE NOCASE ASC',
            default => 'created_at DESC, id DESC',
        };

        $total = (int) Db::val('SELECT COUNT(*) FROM products' . $sql, $params);
        $perPage = max(1, min(100, (int) ($f['per_page'] ?? cfg('per_page', 24))));
        $pages = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($pages, (int) ($f['page'] ?? 1)));
        $rows = Db::all(
            'SELECT * FROM products' . $sql . ' ORDER BY ' . $order . ' LIMIT ? OFFSET ?',
            array_merge($params, [$perPage, ($page - 1) * $perPage])
        );
        return [
            'items' => array_map([self::class, 'hydrate'], $rows),
            'total' => $total,
            'page' => $page,
            'pages' => $pages,
            'perPage' => $perPage,
        ];
    }

    public static function find(string $idOrSlug): ?array
    {
        $r = Db::one('SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1', [$idOrSlug, $idOrSlug]);
        return $r ? self::hydrate($r) : null;
    }

    /** Storefront-visible product by slug/id (active and category not hidden). */
    public static function findVisible(string $idOrSlug): ?array
    {
        $p = self::find($idOrSlug);
        if (!$p || !$p['active']) {
            return null;
        }
        $hidden = (int) Db::val('SELECT COUNT(*) FROM categories WHERE name = ? AND active = 0', [$p['category']]);
        return $hidden ? null : $p;
    }

    /**
     * Products by ids for cart / favourites / recently viewed. Unknown or hidden ids are skipped.
     * @param list<string> $ids
     * @return list<array>
     */
    public static function byIds(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $ids), fn($s) => $s !== '' && strlen($s) <= 64)));
        $ids = array_slice($ids, 0, 60);
        if (!$ids) {
            return [];
        }
        $rows = Db::all(
            'SELECT * FROM products WHERE active = 1 AND id IN (' . Db::in($ids) . ')'
            . " AND COALESCE(category, '') NOT IN (SELECT name FROM categories WHERE active = 0)",
            $ids
        );
        $by = [];
        foreach ($rows as $r) {
            $by[(string) $r['id']] = self::hydrate($r);
        }
        $out = [];
        foreach ($ids as $id) {          // keep requested order
            if (isset($by[$id])) {
                $out[] = $by[$id];
            }
        }
        return $out;
    }

    public static function related(array $p, int $limit = 8): array
    {
        $rows = Db::all(
            'SELECT * FROM products WHERE active = 1 AND category = ? AND id <> ?'
            . ' ORDER BY (brand = ?) DESC, views DESC, created_at DESC LIMIT ?',
            [$p['category'], $p['id'], (string) ($p['brand'] ?? ''), $limit]
        );
        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function incrementViews(string $id): void
    {
        Db::exec('UPDATE products SET views = views + 1 WHERE id = ?', [$id]);
    }

    /** Live-search suggestions for the header search box. */
    public static function suggest(string $q, int $limit = 6): array
    {
        return self::search(['q' => $q, 'per_page' => $limit, 'sort' => 'popular'])['items'];
    }

    /** @return array{ok:bool,product?:array,errors?:array<string,string>} */
    public static function save(array $in, ?string $id = null): array
    {
        $existing = $id ? self::find($id) : null;
        if ($id && !$existing) {
            return ['ok' => false, 'errors' => ['id' => 'not_found']];
        }
        $errors = [];
        $name = trim((string) ($in['name'] ?? ($existing['name'] ?? '')));
        if ($name === '') {
            $errors['name'] = 'required';
        }
        $price = isset($in['price']) ? str_replace(',', '.', (string) $in['price']) : (string) ($existing['price'] ?? '0');
        if (!is_numeric($price) || (float) $price < 0) {
            $errors['price'] = 'invalid';
        }
        if ($errors) {
            return ['ok' => false, 'errors' => $errors];
        }
        $price = round((float) $price, 2);

        $oldRaw = array_key_exists('oldPrice', $in) ? str_replace(',', '.', trim((string) $in['oldPrice'])) : (string) ($existing['oldPrice'] ?? '');
        $old = is_numeric($oldRaw) && (float) $oldRaw > $price ? round((float) $oldRaw, 2) : null;

        $category = trim((string) ($in['category'] ?? ($existing['category'] ?? '')));
        if ($category === '') {
            $category = 'Інше';
        }
        Categories::ensure($category);

        $brand = array_key_exists('brand', $in) ? trim((string) $in['brand']) : (string) ($existing['brand'] ?? '');
        if ($brand !== '') {
            Brands::ensure($brand);
        }

        $sizes = $in['sizes'] ?? ($existing['sizes'] ?? []);
        if (is_string($sizes)) {
            $sizes = preg_split('/[,\n;]+/u', $sizes) ?: [];
        }
        $sizes = array_slice(array_values(array_unique(array_filter(array_map(fn($s) => Text::truncate((string) $s, 20), (array) $sizes), 'strlen'))), 0, 30);

        $images = $in['images'] ?? ($existing['images'] ?? []);
        if (is_string($images)) {
            $images = preg_split('/[\n,]+/u', $images) ?: [];
        }
        $clean = [];
        foreach ((array) $images as $src) {
            $src = trim((string) $src);
            if ($src === '') {
                continue;
            }
            if (Media::isExternal($src)) {
                if (preg_match('#^https?://#i', $src)) {
                    $clean[] = $src;
                }
            } elseif (Media::exists($src)) {
                $clean[] = ltrim(str_replace('\\', '/', $src), '/');
            }
        }
        $clean = array_slice(array_values(array_unique($clean)), 0, 20);

        $description = Text::clean((string) ($in['description'] ?? ($existing['description'] ?? '')));

        $tr = $existing['translations'] ?? [];
        if (isset($in['translations']) && is_array($in['translations'])) {
            foreach (['ru', 'en'] as $l) {
                $n = trim((string) ($in['translations'][$l]['name'] ?? ''));
                $d = Text::clean((string) ($in['translations'][$l]['description'] ?? ''));
                if ($n === '' && $d === '') {
                    unset($tr[$l]);
                } else {
                    $tr[$l] = ['name' => $n, 'description' => $d];
                }
            }
        }

        $flag = static fn(string $k, bool $def): int => array_key_exists($k, $in) ? (Text::boolish($in[$k]) ? 1 : 0) : ($existing ? (int) $existing[$k === 'inStock' ? 'inStock' : $k] : (int) $def);
        $inStock = $flag('inStock', true);
        $featured = $flag('featured', false);
        $active = $flag('active', true);

        $sku = trim((string) ($in['sku'] ?? ($existing['sku'] ?? '')));
        $now = Text::now();
        $blob = Text::blob([
            $name, $brand, $category, I18n::categoryName($category, 'ru'), I18n::categoryName($category, 'en'), $description,
            $tr['ru']['name'] ?? '', $tr['en']['name'] ?? '', $sku,
        ]);

        return Db::tx(function () use ($existing, $name, $price, $old, $category, $brand, $description, $clean, $inStock, $featured, $active, $sizes, $blob, $sku, $tr, $now, $in): array {
            if ($existing) {
                $slug = $existing['slug'];
                $custom = trim((string) ($in['slug'] ?? ''));
                if ($custom !== '' && $custom !== $slug) {
                    $slug = self::uniqueSlug(Text::slugify($custom), $existing['id']);
                }
                Db::exec(
                    'UPDATE products SET name=?, slug=?, price=?, old_price=?, category=?, brand=?, description=?, images=?, in_stock=?, featured=?, active=?, sizes=?, search_blob=?, sku=?, translations=?, updated_at=? WHERE id=?',
                    [$name, $slug, $price, $old, $category, $brand !== '' ? $brand : null, $description, Text::jsonEncode($clean), $inStock, $featured, $active, Text::jsonEncode($sizes), $blob, $sku !== '' ? $sku : null, Text::jsonEncode((object) $tr), $now, $existing['id']]
                );
                $id = $existing['id'];
            } else {
                $id = Text::uid('p');
                $slug = self::uniqueSlug(Text::slugify($name), $id);
                Db::exec(
                    'INSERT INTO products (id,name,slug,price,old_price,category,brand,description,images,in_stock,featured,active,sizes,tags,search_blob,sku,views,sales,translations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$id, $name, $slug, $price, $old, $category, $brand !== '' ? $brand : null, $description, Text::jsonEncode($clean), $inStock, $featured, $active, Text::jsonEncode($sizes), '[]', $blob, $sku !== '' ? $sku : null, 0, 0, Text::jsonEncode((object) $tr), $now, $now]
                );
            }
            return ['ok' => true, 'product' => self::find($id)];
        });
    }

    public static function uniqueSlug(string $base, string $exceptId = ''): string
    {
        $slug = $base;
        $n = 2;
        while (true) {
            $hit = Db::val('SELECT id FROM products WHERE slug = ? LIMIT 1', [$slug]);
            if ($hit === null || (string) $hit === $exceptId) {
                return $slug;
            }
            $slug = $base . '-' . $n++;
        }
    }

    public static function setActive(string $id, bool $active): void
    {
        Db::exec('UPDATE products SET active = ?, updated_at = ? WHERE id = ?', [$active ? 1 : 0, Text::now(), $id]);
    }

    public static function setInStock(string $id, bool $inStock): void
    {
        Db::exec('UPDATE products SET in_stock = ?, updated_at = ? WHERE id = ?', [$inStock ? 1 : 0, Text::now(), $id]);
    }

    /** Move to trash (soft delete). */
    public static function delete(string $id): bool
    {
        $row = Db::one('SELECT * FROM products WHERE id = ?', [$id]);
        if (!$row) {
            return false;
        }
        Db::tx(function () use ($row, $id): void {
            Db::exec('INSERT OR REPLACE INTO trash (id, kind, data, deleted_at) VALUES (?,?,?,?)', ['p:' . $id, 'product', Text::jsonEncode($row), Text::now()]);
            Db::exec('DELETE FROM products WHERE id = ?', [$id]);
        });
        return true;
    }

    public static function restore(string $trashId): bool
    {
        $t = Db::one("SELECT * FROM trash WHERE id = ? AND kind = 'product'", [$trashId]);
        if (!$t) {
            return false;
        }
        $r = Text::jsonDecode($t['data'], []);
        if (!$r || !isset($r['id'])) {
            return false;
        }
        Db::tx(function () use ($r, $trashId): void {
            if (!Db::val('SELECT 1 FROM products WHERE id = ?', [$r['id']])) {
                $r['slug'] = self::uniqueSlug((string) $r['slug'], (string) $r['id']);
                $cols = array_keys($r);
                Db::exec(
                    'INSERT INTO products (' . implode(',', $cols) . ') VALUES (' . Db::in($cols) . ')',
                    array_values($r)
                );
                Categories::ensure((string) ($r['category'] ?? 'Інше'));
            }
            Db::exec('DELETE FROM trash WHERE id = ?', [$trashId]);
        });
        return true;
    }

    /** @return list<array{id:string,deletedAt:string,product:array}> */
    public static function trash(): array
    {
        $out = [];
        foreach (Db::all("SELECT * FROM trash WHERE kind = 'product' ORDER BY deleted_at DESC") as $t) {
            $r = Text::jsonDecode($t['data'], []);
            if ($r) {
                $out[] = ['id' => $t['id'], 'deletedAt' => $t['deleted_at'], 'product' => self::hydrate($r)];
            }
        }
        return $out;
    }

    public static function purge(string $trashId): void
    {
        Db::exec('DELETE FROM trash WHERE id = ?', [$trashId]);
    }

    public static function emptyTrash(): void
    {
        Db::exec("DELETE FROM trash WHERE kind = 'product'");
    }
}
