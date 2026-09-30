<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;

/** Numbers for the admin dashboard and the storefront hero. */
final class Stats
{
    /** Products visible in the shop. */
    public static function visibleProducts(): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM products WHERE active = 1 AND category NOT IN (SELECT name FROM categories WHERE active = 0)');
    }

    public static function dashboard(): array
    {
        $byStatus = Orders::countsByStatus();
        return [
            'products' => (int) Db::val('SELECT COUNT(*) FROM products'),
            'productsActive' => (int) Db::val('SELECT COUNT(*) FROM products WHERE active = 1'),
            'productsHidden' => (int) Db::val('SELECT COUNT(*) FROM products WHERE active = 0'),
            'outOfStock' => (int) Db::val('SELECT COUNT(*) FROM products WHERE active = 1 AND in_stock = 0'),
            'categories' => (int) Db::val('SELECT COUNT(*) FROM categories'),
            'brands' => (int) Db::val('SELECT COUNT(*) FROM brands'),
            'orders' => array_sum($byStatus),
            'byStatus' => $byStatus,
            'revenue' => Orders::revenue(),
            'customers' => (int) Db::val('SELECT COUNT(*) FROM users'),
            'subscribers' => (int) Db::val('SELECT COUNT(*) FROM subscribers'),
            'unread' => Messages::unread(),
            'series' => Orders::series(14),
            'recent' => Orders::recent(6),
            'top' => array_map([Products::class, 'hydrate'], Db::all('SELECT * FROM products WHERE active = 1 ORDER BY views DESC LIMIT 5')),
        ];
    }
}
