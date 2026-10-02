<?php
declare(strict_types=1);

namespace Onika;

/** Database schema + versioned migrations (PRAGMA user_version). */
final class Schema
{
    private const VERSION = 2;

    public static function migrate(bool $fresh): void
    {
        $pdo = Db::pdo();
        $v = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
        if ($v >= self::VERSION) {
            return;
        }
        $pdo->beginTransaction();
        try {
            if ($v < 1) {
                self::v1($pdo);
            }
            if ($v < 2) {
                self::v2($pdo);
            }
            $pdo->exec('PRAGMA user_version = ' . self::VERSION);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        if ($fresh || (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn() === 0) {
            Seeder::run();
        }
    }

    /** Stock quantity per product. Products that were "in stock" get 1 piece, the others 0. */
    private static function v2(\PDO $pdo): void
    {
        $pdo->exec('ALTER TABLE products ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 1');
        $pdo->exec('UPDATE products SET stock_qty = CASE WHEN in_stock = 1 THEN 1 ELSE 0 END');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_p_stock ON products(stock_qty)');
    }

    private static function v1(\PDO $pdo): void
    {
        $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  category TEXT,
  brand TEXT,
  description TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  in_stock INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sizes TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  search_blob TEXT NOT NULL DEFAULT '',
  sku TEXT,
  source_url TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  translations TEXT NOT NULL DEFAULT '{}',
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_p_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_p_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_p_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_p_created ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_p_featured ON products(featured);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#e11d74',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  translations TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  translations TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  customer TEXT NOT NULL DEFAULT '{}',
  payment TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  shipping REAL,
  total REAL NOT NULL DEFAULT 0,
  history TEXT NOT NULL DEFAULT '[]',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_o_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_o_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_o_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'uk',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS trash (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
SQL);
    }
}
