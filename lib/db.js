'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'onika.db');
const LEGACY_JSON = path.join(DATA_DIR, 'db.json');
const SOURCE_JSON = path.join(ROOT, 'products.json');

const CATEGORY_COLORS = [
  '#8e2a3c', '#b45309', '#0f766e', '#4338ca', '#9d174d',
  '#1d4ed8', '#047857', '#7c2d12', '#4c1d95', '#be185d',
];

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'e', є: 'ie',
  ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'iu', я: 'ia',
};

function slugify(str) {
  return (
    String(str || '')
      .toLowerCase()
      .split('')
      .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  );
}

function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/Інформація про оплату:.*?Відправлення[^\n]*\n?/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

let db = null;

function open() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      old_price REAL,
      category TEXT,
      brand TEXT,
      description TEXT,
      images TEXT,
      image_urls TEXT,
      in_stock INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      sizes TEXT,
      tags TEXT,
      search_blob TEXT,
      sku TEXT,
      source_url TEXT,
      views INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      translations TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_p_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_p_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_p_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_p_created ON products(created_at);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      slug TEXT UNIQUE,
      description TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      translations TEXT
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      slug TEXT UNIQUE,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      translations TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      token TEXT,
      created_at TEXT,
      status TEXT,
      customer TEXT,
      payment TEXT,
      items TEXT,
      subtotal REAL,
      shipping REAL,
      total REAL,
      history TEXT,
      user_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_o_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_o_created ON orders(created_at);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      phone TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_u_email ON users(email);

    CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, at TEXT);

    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      user TEXT,
      at INTEGER
    );
  `);
  migrate();
  seed();
  return db;
}

/* lightweight, idempotent column migrations for older DBs */
function migrate() {
  const addCol = (table, col, def) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch (e) { /* exists */ }
  };
  addCol('orders', 'user_id', 'TEXT');
  addCol('users', 'address', 'TEXT');
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_o_user ON orders(user_id)'); } catch (e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_u_email ON users(email)'); } catch (e) {}
}

function getDb() {
  return open();
}

/* ------------------------------ seeding ------------------------------ */
function loadLegacyProducts() {
  // Prefer the already-canonical data/db.json (has featured/translations/views)
  if (fs.existsSync(LEGACY_JSON)) {
    try {
      const j = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));
      if (j.products && j.products.length) return { products: j.products, settings: j.settings, orders: j.orders, subscribers: j.subscribers };
    } catch (e) {
      console.warn('[db] legacy db.json unreadable:', e.message);
    }
  }
  return null;
}

function seedFromCatalog() {
  const catalog = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
  const now = Date.now();
  const products = [];
  let i = 0;
  for (const raw of catalog.products || []) {
    const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
    if (!images.length) continue;
    products.push({
      id: String(raw.id || uid('p')),
      name: cleanText(raw.name).replace(/\s*\n\s*/g, ' ').trim(),
      slug: slugify(raw.name) || 'product',
      price: Number(raw.price) || 0,
      oldPrice: null,
      category: (raw.category || 'Інше').trim(),
      brand: raw.brand || null,
      description: cleanText(raw.description) || '',
      images,
      image_urls: raw.image_urls || [],
      inStock: raw.in_stock !== false,
      featured: i % 26 === 0,
      active: true,
      views: 0,
      sales: 0,
      sku: 'ON-' + String(raw.id || '').slice(-6),
      sourceUrl: raw.url || null,
      createdAt: new Date(now - i * 1000).toISOString(),
      translations: {},
    });
    i++;
  }
  return products;
}

function uniqueSlug(slug, used) {
  let s = slug || 'item';
  let n = 2;
  while (used.has(s)) s = slug + '-' + n++;
  used.add(s);
  return s;
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const hasSettings = db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key='site'").get().n;
  if (count > 0 && hasSettings) return;

  const legacy = loadLegacyProducts();
  const products = legacy ? legacy.products : seedFromCatalog();
  const legacySettings = legacy ? legacy.settings : null;

  const used = new Set();
  const insertP = db.prepare(`INSERT OR REPLACE INTO products
    (id,name,slug,price,old_price,category,brand,description,images,image_urls,in_stock,featured,active,sizes,tags,search_blob,sku,source_url,views,sales,translations,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const tx = () => {
    db.exec('BEGIN');
    for (const p of products) {
      const slug = uniqueSlug(p.slug || slugify(p.name), used);
      insertP.run(
        String(p.id),
        p.name || '',
        slug,
        Number(p.price) || 0,
        p.oldPrice != null && p.oldPrice !== '' ? Number(p.oldPrice) : null,
        p.category || 'Інше',
        p.brand || null,
        p.description || '',
        JSON.stringify(p.images || []),
        JSON.stringify(p.image_urls || []),
        p.inStock === false ? 0 : 1,
        p.featured ? 1 : 0,
        p.active === false ? 0 : 1,
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.tags || []),
        [p.name, p.brand, p.category, p.description].filter(Boolean).join(' ').toLowerCase(),
        p.sku || null,
        p.sourceUrl || p.url || null,
        Number(p.views) || 0,
        Number(p.sales) || 0,
        JSON.stringify(p.translations || {}),
        p.createdAt || new Date().toISOString(),
        p.updatedAt || null
      );
    }

    // categories
    const counts = new Map();
    for (const p of products) counts.set(p.category || 'Інше', (counts.get(p.category || 'Інше') || 0) + 1);
    try { db.exec('ALTER TABLE categories ADD COLUMN translations TEXT'); } catch (e) { /* already there */ }
    db.exec(`CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY, name TEXT UNIQUE, slug TEXT UNIQUE, description TEXT,
      sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, translations TEXT)`);
    const insertC = db.prepare('INSERT OR REPLACE INTO categories (id,name,slug,description,color,sort_order,active,translations) VALUES (?,?,?,?,?,?,?,?)');
    const usedC = new Set();
    let idx = 0;
    if (hasSettings) {
      // nothing
    }
    const cats = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name] of cats) {
      const slug = uniqueSlug(slugify(name), usedC);
      insertC.run(slug, name, slug, '', CATEGORY_COLORS[idx % CATEGORY_COLORS.length], idx, 1, '{}');
      idx++;
    }
    // brands from products
    const bcounts = new Map();
    for (const p of products) { if (p.brand) bcounts.set(String(p.brand).trim(), (bcounts.get(String(p.brand).trim()) || 0) + 1); }
    const insertB = db.prepare('INSERT OR IGNORE INTO brands (id,name,slug,description,sort_order,active,translations) VALUES (?,?,?,?,?,?,?)');
    const usedB = new Set();
    let bidx = 0;
    const bsorted = [...bcounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name] of bsorted) {
      const slug = uniqueSlug(slugify(name), usedB);
      insertB.run(uid('b'), name, slug, '', bidx, 1, '{}');
      bidx++;
    }
    db.exec('COMMIT');
  };

  if (!count) {
    tx();
    console.log('[db] seeded ' + products.length + ' products');
  } else {
    // products exist but settings missing — just write settings/orders below
  }

  if (!hasSettings) {
    const defaults = require('./store-defaults')();
    if (legacySettings) Object.assign(defaults, legacySettings);
    db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('site', JSON.stringify(defaults));
  }

  // Legacy orders/subscribers
  if (legacy) {
    const insO = db.prepare('INSERT OR IGNORE INTO orders (id,token,created_at,status,customer,payment,items,subtotal,shipping,total,history) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const o of legacy.orders || []) {
      insO.run(o.id, o.token, o.createdAt, o.status, JSON.stringify(o.customer || {}), o.payment || '', JSON.stringify(o.items || []), o.subtotal || 0, o.shipping || 0, o.total || 0, JSON.stringify(o.history || []));
    }
    const insS = db.prepare('INSERT OR IGNORE INTO subscribers (email,at) VALUES (?,?)');
    for (const s of legacy.subscribers || []) insS.run(s.email, s.at);
  }
}

function reset() {
  try { if (db) db.close(); } catch (e) {}
  db = null;
}

module.exports = {
  getDb,
  open,
  reset,
  slugify,
  cleanText,
  uid,
  ROOT,
  DATA_DIR,
  DB_FILE,
};
