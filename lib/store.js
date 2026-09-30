'use strict';

const crypto = require('crypto');
const dbmod = require('./db');
const defaults = require('./store-defaults');
const { hashPassword } = require('./store-defaults');

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

function db() {
  return dbmod.getDb();
}

function ensureDb() {
  dbmod.open();
  return true;
}

function parseJSON(s, fb) {
  try {
    return JSON.parse(s || '');
  } catch (e) {
    return fb;
  }
}

function rowToProduct(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    price: r.price,
    oldPrice: r.old_price,
    category: r.category,
    brand: r.brand,
    description: r.description,
    images: parseJSON(r.images, []),
    image_urls: parseJSON(r.image_urls, []),
    inStock: r.in_stock !== 0,
    featured: !!r.featured,
    active: r.active !== 0,
    sizes: parseJSON(r.sizes, []),
    tags: parseJSON(r.tags, []),
    sku: r.sku,
    sourceUrl: r.source_url,
    views: r.views || 0,
    sales: r.sales || 0,
    translations: parseJSON(r.translations, {}),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id,
    token: r.token,
    userId: r.user_id || null,
    createdAt: r.created_at,
    status: r.status,
    customer: parseJSON(r.customer, {}),
    payment: r.payment,
    items: parseJSON(r.items, []),
    subtotal: r.subtotal,
    shipping: r.shipping,
    total: r.total,
    history: parseJSON(r.history, []),
  };
}

function rowToUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name || '',
    phone: r.phone || '',
    address: r.address || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function uniqueSlug(slug, excludeId) {
  const base = slug || 'item';
  let s = base;
  let n = 2;
  const stmt = db().prepare('SELECT id FROM products WHERE slug = ? LIMIT 1');
  for (;;) {
    const row = stmt.get(s);
    if (!row || String(row.id) === String(excludeId)) return s;
    s = base + '-' + n++;
  }
}

/* ----------------------------- products ----------------------------- */
function getProducts(filters) {
  ensureDb();
  const f = filters || {};
  const where = ['active = 1'];
  const params = [];

  if (f.includeInactive) where[0] = '1 = 1';

  if (f.q) {
    where.push('search_blob LIKE ?');
    params.push('%' + String(f.q).toLowerCase().trim() + '%');
  }
  const catFilters = Array.isArray(f.category) ? f.category : f.category ? [f.category] : [];
  if (catFilters.length) {
    where.push('category IN (' + catFilters.map(() => '?').join(',') + ')');
    params.push(...catFilters);
  }
  const exclCats = Array.isArray(f.excludeCategory) ? f.excludeCategory : f.excludeCategory ? [f.excludeCategory] : [];
  if (exclCats.length) {
    where.push('category NOT IN (' + exclCats.map(() => '?').join(',') + ')');
    params.push(...exclCats);
  }
  const brandFilters = Array.isArray(f.brand) ? f.brand : f.brand ? [f.brand] : [];
  if (brandFilters.length) {
    where.push('brand IN (' + brandFilters.map(() => '?').join(',') + ')');
    params.push(...brandFilters);
  }
  if (f.minPrice != null && f.minPrice !== '') {
    where.push('price >= ?');
    params.push(Number(f.minPrice));
  }
  if (f.maxPrice != null && f.maxPrice !== '') {
    where.push('price <= ?');
    params.push(Number(f.maxPrice));
  }
  if (f.inStock) where.push('in_stock = 1');
  if (f.featured) where.push('featured = 1');

  const whereSql = where.join(' AND ');

  const total = db().prepare('SELECT COUNT(*) AS n FROM products WHERE ' + whereSql).get(...params).n;

  const sortMap = {
    'price-asc': 'price ASC',
    'price-desc': 'price DESC',
    popular: 'views DESC, id DESC',
    name: 'name ASC',
    new: 'created_at DESC, id DESC',
  };
  const orderSql = sortMap[f.sort] || sortMap.new;

  const page = Math.max(1, parseInt(f.page, 10) || 1);
  const perPage = Math.max(1, Math.min(100000, parseInt(f.perPage, 10) || 24));
  const pages = Math.max(1, Math.ceil(total / perPage));
  const offset = (page - 1) * perPage;

  const rows = db()
    .prepare('SELECT * FROM products WHERE ' + whereSql + ' ORDER BY ' + orderSql + ' LIMIT ? OFFSET ?')
    .all(...params, perPage, offset);

  return { items: rows.map(rowToProduct), total, page, pages, perPage };
}

function getProduct(idOrSlug) {
  ensureDb();
  const row = db().prepare('SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1').get(String(idOrSlug), String(idOrSlug));
  return rowToProduct(row);
}

function getRelated(product, limit) {
  ensureDb();
  const hidden = getHiddenCategories();
  let sql = 'SELECT * FROM products WHERE active = 1 AND category = ? AND id <> ?';
  const params = [product.category, product.id];
  if (hidden.length) {
    sql += ' AND category NOT IN (' + hidden.map(() => '?').join(',') + ')';
    params.push(...hidden);
  }
  sql += ' ORDER BY views DESC, created_at DESC LIMIT ?';
  params.push(limit || 8);
  return db().prepare(sql).all(...params).map(rowToProduct);
}

function incrementViews(id) {
  ensureDb();
  db().prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(String(id));
}

function normalizeProduct(input, base) {
  const out = Object.assign({}, base || {});
  if (input.name != null) out.name = String(input.name).trim();
  if (input.price != null) out.price = Number(input.price) || 0;
  if (input.oldPrice !== undefined) out.oldPrice = input.oldPrice === '' || input.oldPrice == null ? null : Number(input.oldPrice) || null;
  if (input.category != null) out.category = String(input.category).trim() || 'Інше';
  if (input.brand !== undefined) out.brand = input.brand ? String(input.brand).trim() : null;
  if (input.description != null) out.description = dbmod.cleanText(input.description);
  if (input.inStock != null) out.inStock = input.inStock === true || input.inStock === 'true' || input.inStock === 'on';
  if (input.featured != null) out.featured = input.featured === true || input.featured === 'true' || input.featured === 'on';
  if (input.active != null) out.active = input.active === true || input.active === 'true' || input.active === 'on';
  if (input.sku !== undefined) out.sku = input.sku ? String(input.sku).trim() : null;
  if (input.sizes != null) {
    out.sizes = Array.isArray(input.sizes) ? input.sizes : String(input.sizes).split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (input.tags != null) {
    out.tags = Array.isArray(input.tags) ? input.tags : String(input.tags).split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (input.images != null) {
    out.images = Array.isArray(input.images) ? input.images.filter(Boolean) : String(input.images).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
  if (input.image_urls != null) out.image_urls = input.image_urls;
  if (input.sourceUrl != null) out.sourceUrl = input.sourceUrl;
  if (input.translations != null) {
    out.translations = Object.assign({}, out.translations || {}, input.translations);
    for (const l of Object.keys(out.translations)) {
      const tr = out.translations[l] || {};
      if (!tr.name && !tr.description) delete out.translations[l];
      else out.translations[l] = { name: (tr.name || '').trim(), description: dbmod.cleanText(tr.description || '') };
    }
  }
  // SQLite cannot bind undefined — coerce all nullable fields
  if (out.name == null) out.name = '';
  if (out.price == null) out.price = 0;
  if (out.oldPrice === undefined) out.oldPrice = null;
  if (out.category == null) out.category = 'Інше';
  if (out.brand === undefined) out.brand = null;
  if (out.description == null) out.description = '';
  if (out.inStock === undefined) out.inStock = true;
  if (out.featured === undefined) out.featured = false;
  if (out.active === undefined) out.active = true;
  if (out.sku === undefined) out.sku = null;
  if (out.sourceUrl === undefined) out.sourceUrl = null;
  if (!Array.isArray(out.sizes)) out.sizes = [];
  if (!Array.isArray(out.tags)) out.tags = [];
  if (!Array.isArray(out.images)) out.images = [];
  if (!Array.isArray(out.image_urls)) out.image_urls = [];
  if (!out.translations || typeof out.translations !== 'object') out.translations = {};
  if (out.views == null) out.views = 0;
  if (out.sales == null) out.sales = 0;
  return out;
}

function upsertProduct(input) {
  ensureDb();
  const now = new Date().toISOString();
  let product;
  if (input.id && getProduct(input.id)) {
    const existing = getProduct(input.id);
    const merged = normalizeProduct(input, existing);
    merged.id = existing.id;
    merged.views = (input.views != null ? input.views : existing.views) || 0;
    merged.sales = (input.sales != null ? input.sales : existing.sales) || 0;
    merged.createdAt = existing.createdAt;
    merged.updatedAt = now;
    merged.slug = uniqueSlug(dbmod.slugify(merged.name), existing.id);
    product = merged;
    const blob = [product.name, product.brand, product.category, product.description].filter(Boolean).join(' ').toLowerCase();
    db()
      .prepare(
        `UPDATE products SET name=?, slug=?, price=?, old_price=?, category=?, brand=?, description=?, images=?, image_urls=?, in_stock=?, featured=?, active=?, sizes=?, tags=?, search_blob=?, sku=?, source_url=?, views=?, sales=?, translations=?, updated_at=? WHERE id=?`
      )
      .run(
        product.name, product.slug, product.price, product.oldPrice, product.category, product.brand,
        product.description, JSON.stringify(product.images || []), JSON.stringify(product.image_urls || []),
        product.inStock ? 1 : 0, product.featured ? 1 : 0, product.active !== false ? 1 : 0,
        JSON.stringify(product.sizes || []), JSON.stringify(product.tags || []), blob, product.sku || null,
        product.sourceUrl || null, product.views || 0, product.sales || 0, JSON.stringify(product.translations || {}),
        now, product.id
      );
  } else {
    const base = { id: input.id || dbmod.uid('p'), createdAt: now, updatedAt: null, views: 0, sales: 0, active: true, inStock: true, translations: {} };
    const merged = normalizeProduct(input, base);
    merged.id = base.id;
    merged.createdAt = now;
    merged.slug = uniqueSlug(dbmod.slugify(merged.name), merged.id);
    product = merged;
    const blob = [product.name, product.brand, product.category, product.description].filter(Boolean).join(' ').toLowerCase();
    db()
      .prepare(
        `INSERT INTO products (id,name,slug,price,old_price,category,brand,description,images,image_urls,in_stock,featured,active,sizes,tags,search_blob,sku,source_url,views,sales,translations,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        product.id, product.name, product.slug, product.price || 0, product.oldPrice, product.category || 'Інше',
        product.brand, product.description || '', JSON.stringify(product.images || []), JSON.stringify(product.image_urls || []),
        product.inStock ? 1 : 0, product.featured ? 1 : 0, product.active !== false ? 1 : 0,
        JSON.stringify(product.sizes || []), JSON.stringify(product.tags || []), blob, product.sku || null,
        product.sourceUrl || null, product.views || 0, product.sales || 0, JSON.stringify(product.translations || {}),
        now, now
      );
  }
  return getProduct(product.id);
}

function deleteProduct(id) {
  ensureDb();
  ensureTrashTable();
  const p = getProduct(String(id));
  if (!p) return false;
  db().prepare('INSERT OR REPLACE INTO trash (id, kind, data, deleted_at) VALUES (?,?,?,?)')
    .run('p:' + p.id, 'product', JSON.stringify(p), new Date().toISOString());
  const r = db().prepare('DELETE FROM products WHERE id = ?').run(String(id));
  return r.changes > 0;
}

/* ------------------------------- trash ------------------------------ */
function ensureTrashTable() {
  ensureDb();
  db().exec(`CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY, kind TEXT, data TEXT, deleted_at TEXT)`);
}
function getTrash(kind) {
  ensureTrashTable();
  const rows = kind
    ? db().prepare('SELECT * FROM trash WHERE kind = ? ORDER BY deleted_at DESC').all(kind)
    : db().prepare('SELECT * FROM trash ORDER BY deleted_at DESC').all();
  return rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.data || '{}'); } catch (e) { data = {}; }
    return { id: r.id, kind: r.kind, deletedAt: r.deleted_at, data };
  });
}
function restoreFromTrash(trashId) {
  ensureTrashTable();
  const row = db().prepare('SELECT * FROM trash WHERE id = ?').get(String(trashId));
  if (!row) return null;
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch (e) { return null; }
  if (row.kind === 'product') {
    const exists = db().prepare('SELECT id FROM products WHERE id = ?').get(String(data.id));
    if (exists) { db().prepare('DELETE FROM trash WHERE id = ?').run(String(trashId)); return getProduct(data.id); }
    const restored = upsertProduct(Object.assign({}, data, { active: true }));
    db().prepare('DELETE FROM trash WHERE id = ?').run(String(trashId));
    return restored;
  }
  return null;
}
function purgeFromTrash(trashId) {
  ensureTrashTable();
  return db().prepare('DELETE FROM trash WHERE id = ?').run(String(trashId)).changes > 0;
}
function emptyTrash(kind) {
  ensureTrashTable();
  if (kind) return db().prepare('DELETE FROM trash WHERE kind = ?').run(kind).changes;
  return db().prepare('DELETE FROM trash').run().changes;
}

function getBrands() {
  ensureDb();
  return db()
    .prepare("SELECT brand AS name, COUNT(*) AS count FROM products WHERE active = 1 AND brand IS NOT NULL AND brand <> '' GROUP BY brand ORDER BY count DESC, brand ASC")
    .all();
}

function getCategoryCounts() {
  ensureDb();
  const rows = db().prepare('SELECT category AS name, COUNT(*) AS count FROM products WHERE active = 1 GROUP BY category').all();
  const map = {};
  for (const r of rows) map[r.name] = r.count;
  return map;
}

function getHiddenCount() {
  ensureDb();
  try {
    return db().prepare('SELECT COUNT(*) AS n FROM products WHERE active = 0').get().n || 0;
  } catch (e) { return 0; }
}

/* names of categories hidden by admin (affect storefront visibility) */
function getHiddenCategories() {
  ensureDb();
  try {
    return db().prepare('SELECT name FROM categories WHERE active = 0').all().map((r) => r.name);
  } catch (e) { return []; }
}

/* storefront product query: excludes inactive products AND products of hidden categories */
function getVisibleProducts(filters) {
  ensureDb();
  const f = Object.assign({}, filters || {});
  const hiddenCats = getHiddenCategories();
  if (hiddenCats.length) {
    const cur = Array.isArray(f.excludeCategory) ? f.excludeCategory : f.excludeCategory ? [f.excludeCategory] : [];
    f.excludeCategory = [...cur, ...hiddenCats];
  }
  return getProducts(f);
}

/* ---------------------------- categories ---------------------------- */
function getCategories() {
  ensureDb();
  const counts = getCategoryCounts();
  return db()
    .prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC')
    .all()
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, color: c.color, order: c.sort_order, active: c.active !== 0, count: counts[c.name] || 0 }))
    .filter((c) => c.count > 0);
}

/* resolve category by slug OR name (fallback for legacy query links) */
function findCategory(slugOrName) {
  ensureDb();
  const s = String(slugOrName || '').trim();
  if (!s) return null;
  const bySlug = db().prepare('SELECT * FROM categories WHERE slug = ? LIMIT 1').get(s);
  if (bySlug) {
    return { id: bySlug.id, name: bySlug.name, slug: bySlug.slug, description: bySlug.description, color: bySlug.color, order: bySlug.sort_order, active: bySlug.active !== 0, translations: parseJSON(bySlug.translations, {}) };
  }
  const all = getAllCategories();
  try {
    const dec = decodeURIComponent(s);
    const found = all.find((c) => c.name === dec);
    if (found) return found;
  } catch (e) { /* not encoded */ }
  return all.find((c) => c.name === s) || null;
}

function getAllCategories() {
  ensureDb();
  ensureBrandColumn();
  return db()
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC')
    .all()
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, color: c.color, order: c.sort_order, active: c.active !== 0, translations: parseJSON(c.translations, {}) }));
}

function upsertCategoryLegacy(input) {
  const name = String(input.name || '').trim();
  if (!name) return null;
  let slug = dbmod.slugify(name);
  let n = 2;
  while (db().prepare('SELECT id FROM categories WHERE slug = ?').get(slug)) slug = dbmod.slugify(name) + '-' + n++;
  const id = dbmod.uid('c');
  const order = (db().prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS o FROM categories').get().o) || 0;
  db()
    .prepare('INSERT INTO categories (id,name,slug,description,color,sort_order,active,translations) VALUES (?,?,?,?,?,?,1,?)')
    .run(id, name, slug, input.description || '', input.color || '#9c2543', order, '{}');
  return getAllCategories().find((c) => c.id === id);
}

function deleteCategory(id) {
  ensureDb();
  const c = db().prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!c) return false;
  const used = db().prepare('SELECT COUNT(*) AS n FROM products WHERE category = ?').get(c.name).n;
  if (used > 0) return false;
  db().prepare('DELETE FROM categories WHERE id = ?').run(id);
  return true;
}

/* ------------------------------ brands ------------------------------ */
function rowToBrand(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, slug: r.slug, description: r.description,
    order: r.sort_order, active: r.active !== 0,
    translations: parseJSON(r.translations, {}),
  };
}
function ensureBrandColumn() {
  ensureDb();
  try { db().exec('ALTER TABLE categories ADD COLUMN translations TEXT'); } catch (e) { /* exists */ }
  db().exec(`CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY, name TEXT UNIQUE, slug TEXT UNIQUE, description TEXT,
    sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, translations TEXT)`);
}
function getAllBrands() {
  ensureBrandColumn();
  let rows = db().prepare('SELECT * FROM brands ORDER BY sort_order ASC').all();
  if (!rows.length) {
    syncBrandsFromProducts();
    rows = db().prepare('SELECT * FROM brands ORDER BY sort_order ASC').all();
  }
  return rows.map(rowToBrand);
}
function getBrands() {
  ensureDb();
  try {
    const rows = db().prepare('SELECT * FROM brands WHERE active = 1 ORDER BY sort_order ASC').all().map(rowToBrand);
    if (rows.length) return rows.map((b) => ({ name: b.name, count: 0 }));
  } catch (e) { /* table missing -> fallback */ }
  return db()
    .prepare("SELECT brand AS name, COUNT(*) AS count FROM products WHERE active = 1 AND brand IS NOT NULL AND brand <> '' GROUP BY brand ORDER BY count DESC, brand ASC")
    .all();
}
function getBrandCounts() {
  ensureDb();
  const rows = db().prepare("SELECT brand AS name, COUNT(*) AS count FROM products WHERE active = 1 GROUP BY brand").all();
  const map = {};
  for (const r of rows) map[r.name] = r.count;
  return map;
}
function upsertBrand(input) {
  ensureBrandColumn();
  const tr = {};
  if (input.nameRu || input.descRu) tr.ru = { name: input.nameRu || '', description: input.descRu || '' };
  if (input.nameEn || input.descEn) tr.en = { name: input.nameEn || '', description: input.descEn || '' };
  if (input.id) {
    const cur = db().prepare('SELECT * FROM brands WHERE id = ?').get(input.id);
    if (!cur) return null;
    const name = input.name != null && String(input.name).trim() ? String(input.name).trim() : cur.name;
    const description = input.description != null ? input.description : cur.description;
    const active = input.active != null ? (input.active === true || input.active === 'true' || input.active === 'on' ? 1 : 0) : cur.active;
    const translations = Object.keys(tr).length ? JSON.stringify(tr) : cur.translations;
    if (name !== cur.name) {
      db().prepare('UPDATE products SET brand = ? WHERE brand = ?').run(name, cur.name);
      db().prepare('UPDATE brands SET name=?, description=?, active=?, translations=? WHERE id=?').run(name, description, active, translations, input.id);
    } else {
      db().prepare('UPDATE brands SET description=?, active=?, translations=? WHERE id=?').run(description, active, translations, input.id);
    }
    return getAllBrands().find((b) => b.id === input.id);
  }
  const name = String(input.name || '').trim();
  if (!name) return null;
  if (db().prepare('SELECT id FROM brands WHERE name = ?').get(name)) return null;
  let slug = dbmod.slugify(name);
  let n = 2;
  while (db().prepare('SELECT id FROM brands WHERE slug = ?').get(slug)) slug = dbmod.slugify(name) + '-' + n++;
  const id = dbmod.uid('b');
  const order = (db().prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS o FROM brands').get().o) || 0;
  db().prepare('INSERT INTO brands (id,name,slug,description,sort_order,active,translations) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, slug, input.description || '', order, 1, JSON.stringify(tr));
  return getAllBrands().find((b) => b.id === id);
}
function deleteBrand(id) {
  ensureBrandColumn();
  const b = db().prepare('SELECT * FROM brands WHERE id = ?').get(id);
  if (!b) return false;
  const used = db().prepare('SELECT COUNT(*) AS n FROM products WHERE brand = ?').get(b.name).n;
  if (used > 0) return false;
  db().prepare('DELETE FROM brands WHERE id = ?').run(id);
  return true;
}
function syncBrandsFromProducts() {
  ensureBrandColumn();
  const rows = db().prepare("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> ''").all();
  const ins = db().prepare('INSERT OR IGNORE INTO brands (id,name,slug,description,sort_order,active,translations) VALUES (?,?,?,?,?,?,?)');
  let added = 0;
  let order = (db().prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS o FROM brands').get().o) || 0;
  for (const r of rows) {
    const name = String(r.brand).trim();
    if (!name) continue;
    if (db().prepare('SELECT id FROM brands WHERE name = ?').get(name)) continue;
    let slug = dbmod.slugify(name);
    let n = 2;
    while (db().prepare('SELECT id FROM brands WHERE slug = ?').get(slug)) slug = dbmod.slugify(name) + '-' + n++;
    const res = ins.run(dbmod.uid('b'), name, slug, '', order++, 1, '{}');
    if (res.changes) added++;
  }
  return added;
}

/* category translations (RU/EN) */
function upsertCategory(input) {
  ensureDb();
  ensureBrandColumn();
  const tr = {};
  if (input.nameRu || input.descRu) tr.ru = { name: input.nameRu || '', description: input.descRu || '' };
  if (input.nameEn || input.descEn) tr.en = { name: input.nameEn || '', description: input.descEn || '' };
  if (input.id) {
    const cur = db().prepare('SELECT * FROM categories WHERE id = ?').get(input.id);
    if (!cur) return null;
    const name = input.name != null ? input.name.trim() : cur.name;
    const active = input.active != null ? (input.active === true || input.active === 'true' || input.active === 'on' ? 1 : 0) : cur.active;
    const color = input.color != null ? input.color : cur.color;
    const description = input.description != null ? input.description : cur.description;
    const translations = Object.keys(tr).length ? JSON.stringify(tr) : cur.translations;
    if (name !== cur.name) db().prepare('UPDATE products SET category = ? WHERE category = ?').run(name, cur.name);
    db().prepare('UPDATE categories SET name=?, color=?, description=?, active=?, translations=? WHERE id=?').run(name, color, description, active, translations, input.id);
    return getAllCategories().find((c) => c.id === input.id);
  }
  const created = upsertCategoryLegacy(input);
  if (created && Object.keys(tr).length) {
    db().prepare('UPDATE categories SET translations=? WHERE id=?').run(JSON.stringify(tr), created.id);
    return getAllCategories().find((c) => c.id === created.id);
  }
  return created;
}
function upsertCategoryLegacy(input) {
  const name = String(input.name || '').trim();
  if (!name) return null;
  let slug = dbmod.slugify(name);
  let n = 2;
  while (db().prepare('SELECT id FROM categories WHERE slug = ?').get(slug)) slug = dbmod.slugify(name) + '-' + n++;
  const id = dbmod.uid('c');
  const order = (db().prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS o FROM categories').get().o) || 0;
  db()
    .prepare('INSERT INTO categories (id,name,slug,description,color,sort_order,active,translations) VALUES (?,?,?,?,?,?,1,?)')
    .run(id, name, slug, input.description || '', input.color || '#9c2543', order, '{}');
  return getAllCategories().find((c) => c.id === id);
}

/* ------------------------------ orders ------------------------------ */
function createOrder(payload, userId) {
  ensureDb();
  const items = (payload.items || []).map((it) => {
    const p = getProduct(it.id) || {};
    return {
      id: it.id,
      name: p.name || it.name || 'Товар',
      price: p.price != null ? p.price : Number(it.price) || 0,
      qty: Math.max(1, parseInt(it.qty, 10) || 1),
      image: (p.images && p.images[0]) || it.image || null,
      size: it.size || null,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const settings = getSettings();
  // Delivery price is unknown on our side (carrier tariff) — never invent a fixed sum.
  // Persist shipping=0 for free delivery, null otherwise ("за тарифами перевізника"); total = subtotal.
  const shipMethod = String(payload.shippingMethod || '');
  const isPickup = /self|pickup|само|самови/i.test(shipMethod);
  const freeShip = isPickup || (settings.freeShippingFrom && subtotal >= settings.freeShippingFrom);
  const shipping = payload.shipping != null ? Number(payload.shipping) : freeShip ? 0 : null;
  const total = subtotal + (shipping || 0);
  const order = {
    id: 'ON' + Date.now().toString().slice(-8),
    token: crypto.randomBytes(12).toString('hex'),
    userId: userId || null,
    createdAt: new Date().toISOString(),
    status: 'new',
    customer: {
      name: (payload.name || '').trim(),
      phone: (payload.phone || '').trim(),
      email: (payload.email || '').trim(),
      city: (payload.city || '').trim(),
      shipping: (payload.shippingMethod || 'Нова пошта').trim(),
      warehouse: (payload.warehouse || '').trim(),
      comment: (payload.comment || '').trim(),
    },
    payment: (payload.payment || 'Післяплата').trim(),
    items,
    subtotal,
    shipping,
    total,
    history: [{ at: new Date().toISOString(), status: 'new', note: 'Замовлення створено' }],
  };
  db()
    .prepare('INSERT INTO orders (id,token,created_at,status,customer,payment,items,subtotal,shipping,total,history,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(order.id, order.token, order.createdAt, order.status, JSON.stringify(order.customer), order.payment, JSON.stringify(order.items), order.subtotal, order.shipping, order.total, JSON.stringify(order.history), order.userId);
  return order;
}

function getOrders(filter) {
  ensureDb();
  const f = filter || {};
  const where = [];
  const params = [];
  if (f.status) {
    where.push('status = ?');
    params.push(f.status);
  }
  if (f.userId) {
    where.push('user_id = ?');
    params.push(String(f.userId));
  }
  if (f.account === 'yes') where.push('user_id IS NOT NULL');
  else if (f.account === 'no') where.push('user_id IS NULL');
  if (f.q) {
    const q = '%' + String(f.q).toLowerCase() + '%';
    where.push("(lower(id) LIKE ? OR lower(customer) LIKE ? OR lower(COALESCE(user_id,'')) LIKE ?)");
    params.push(q, q, q);
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const sortMap = {
    new: 'created_at DESC',
    old: 'created_at ASC',
    'total-desc': 'total DESC',
    'total-asc': 'total ASC',
    client: 'created_at DESC',
    status: 'status ASC, created_at DESC',
  };
  const orderSql = sortMap[f.sort] || sortMap.new;
  let rows = db().prepare('SELECT * FROM orders' + whereSql + ' ORDER BY ' + orderSql).all(...params);
  if (f.sort === 'client') {
    rows.sort((a, b) => {
      const na = (parseJSON(a.customer, {}).name || '').toLowerCase();
      const nb = (parseJSON(b.customer, {}).name || '').toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
  }
  return rows.map(rowToOrder);
}

function getUserOrders(userId) {
  ensureDb();
  return db()
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(String(userId))
    .map(rowToOrder);
}

function getOrder(id) {
  ensureDb();
  const row = db().prepare('SELECT * FROM orders WHERE id = ? OR token = ? LIMIT 1').get(String(id), String(id));
  return rowToOrder(row);
}

function updateOrderStatus(id, status, note) {
  ensureDb();
  const o = getOrder(id);
  if (!o) return null;
  o.status = status;
  o.history = o.history || [];
  o.history.push({ at: new Date().toISOString(), status, note: note || '' });
  db().prepare('UPDATE orders SET status=?, history=? WHERE id=?').run(status, JSON.stringify(o.history), o.id);
  return o;
}

function deleteOrder(id) {
  ensureDb();
  return db().prepare('DELETE FROM orders WHERE id = ?').run(String(id)).changes > 0;
}

/* ----------------------------- settings ----------------------------- */
let settingsCache = null;

function getSettings() {
  ensureDb();
  if (settingsCache) return settingsCache;
  const def = defaults();
  const row = db().prepare("SELECT value FROM settings WHERE key = 'site'").get();
  settingsCache = Object.assign({}, def, row ? parseJSON(row.value, {}) : {});
  // ensure default translations exist (merge, stored wins)
  settingsCache.translations = settingsCache.translations || {};
  for (const lang of ['ru', 'en']) {
    settingsCache.translations[lang] = Object.assign({}, def.translations[lang], settingsCache.translations[lang] || {});
  }
  // one-time migration: old default free-shipping threshold 3000 -> 5000
  if (settingsCache.freeShippingFrom === 3000) {
    settingsCache.freeShippingFrom = 5000;
    settingsCache.announcement = String(settingsCache.announcement || '').replace('3000', '5000');
    for (const lang of ['ru', 'en']) {
      const b = settingsCache.translations[lang];
      if (b && b.announcement) b.announcement = String(b.announcement).replace('3000', '5000');
    }
    db().prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('site', ?)").run(JSON.stringify(settingsCache));
  }
  return settingsCache;
}

function updateSettings(patch) {
  ensureDb();
  const s = Object.assign({}, getSettings(), patch);
  settingsCache = s;
  db().prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('site', ?)").run(JSON.stringify(s));
  return s;
}

/* ------------------------------ backups ----------------------------- */
const BACKUP_DIR = require('path').join(require('./db').DATA_DIR, 'backups');
function listBackups() {
  ensureDb();
  const fs = require('fs');
  try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (e) {}
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^onika-\d{4}-\d{2}-\d{2}[T_-].*\.db$/.test(f))
    .map((f) => {
      const st = fs.statSync(require('path').join(BACKUP_DIR, f));
      return { name: f, size: st.size, at: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}
function createBackup(label) {
  ensureDb();
  const fs = require('fs');
  const path = require('path');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  // flush WAL so the copy is consistent
  try { db().exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch (e) {}
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const safe = String(label || 'manual').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 24) || 'manual';
  const name = `onika-${stamp}-${safe}.db`;
  fs.copyFileSync(require('./db').DB_FILE, path.join(BACKUP_DIR, name));
  // keep last 20
  const all = listBackups();
  for (const old of all.slice(20)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, old.name)); } catch (e) {}
  }
  return name;
}
function restoreBackup(name) {
  ensureDb();
  const fs = require('fs');
  const path = require('path');
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]+/g, '');
  if (!/^onika-\d{4}-\d{2}-\d{2}[T_-].*\.db$/.test(safe)) return { ok: false, error: 'bad name' };
  const src = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(src)) return { ok: false, error: 'not found' };
  // safety copy of current state
  createBackup('pre-restore');
  db().close();
  require('./db').reset();
  fs.copyFileSync(src, require('./db').DB_FILE);
  settingsCache = null;
  ensureDb();
  return { ok: true };
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function setAdminPassword(currentPassword, newPassword) {
  ensureDb();
  const s = getSettings();
  if (!verifyPassword(currentPassword, s.adminPass)) return { ok: false, error: 'wrong' };
  updateSettings({ adminPass: hashPassword(newPassword), mustChangePassword: false });
  return { ok: true };
}

function checkAdmin(user, pass) {
  ensureDb();
  const s = getSettings();
  if (user !== s.adminUser) return false;
  return verifyPassword(pass, s.adminPass);
}

/* ------------------------------ stats ------------------------------- */
function stats() {
  ensureDb();
  const d = db();
  const products = d.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1').get().n;
  const inactive = d.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 0').get().n;
  const categories = d.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  const orders = d.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
  const revenue = d.prepare("SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE status <> 'cancelled'").get().s;
  const outOfStock = d.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1 AND in_stock = 0').get().n;
  const byStatusRows = d.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
  const byStatus = {};
  for (const r of byStatusRows) byStatus[r.status] = r.n;
  const recentOrders = d.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6').all().map(rowToOrder);
  const topProducts = d.prepare('SELECT * FROM products WHERE active = 1 ORDER BY views DESC LIMIT 5').all().map(rowToProduct);
  return { products, inactive, categories, orders, newOrders: byStatus.new || 0, revenue, outOfStock, byStatus, recentOrders, topProducts };
}

/* ---------------------------- subscribers --------------------------- */
function subscribe(email) {
  ensureDb();
  const e = String(email || '').trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return false;
  db().prepare('INSERT OR IGNORE INTO subscribers (email, at) VALUES (?, ?)').run(e, new Date().toISOString());
  return true;
}

function getSubscribers() {
  ensureDb();
  return db().prepare('SELECT email, at FROM subscribers ORDER BY at DESC').all();
}

function deleteSubscriber(email) {
  ensureDb();
  db().prepare('DELETE FROM subscribers WHERE email = ?').run(String(email || '').trim().toLowerCase());
  return true;
}

/* ------------------------------- users ------------------------------ */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
function isEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function getUser(id) {
  ensureDb();
  const row = db().prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(String(id));
  return rowToUser(row);
}
function getUserByEmail(email) {
  ensureDb();
  const row = db().prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(normalizeEmail(email));
  return rowToUser(row);
}
function linkOrdersByEmail(userId, email) {
  ensureDb();
  const e = normalizeEmail(email);
  if (!e) return 0;
  const rows = db().prepare('SELECT id, customer FROM orders WHERE user_id IS NULL').all();
  const upd = db().prepare('UPDATE orders SET user_id = ? WHERE id = ?');
  let n = 0;
  for (const r of rows) {
    const c = parseJSON(r.customer, {});
    if (normalizeEmail(c.email) === e) { upd.run(String(userId), r.id); n++; }
  }
  return n;
}
function createUser(input) {
  ensureDb();
  const email = normalizeEmail(input.email);
  if (!isEmail(email)) return { ok: false, error: 'email' };
  const pass = String(input.password || '');
  if (pass.length < 6) return { ok: false, error: 'password' };
  if (getUserByEmail(email)) return { ok: false, error: 'exists' };
  const id = dbmod.uid('u');
  const now = new Date().toISOString();
  db()
    .prepare('INSERT INTO users (id,email,password,name,phone,address,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, email, hashPassword(pass), String(input.name || '').trim(), String(input.phone || '').trim(), String(input.address || '').trim(), now, null);
  try { linkOrdersByEmail(id, email); } catch (e) { /* best effort */ }
  return { ok: true, user: getUser(id) };
}
function checkUser(email, password) {
  ensureDb();
  const row = db().prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(normalizeEmail(email));
  if (!row) return null;
  if (!verifyPassword(password, row.password)) return null;
  // attach any guest orders placed earlier with the same e-mail
  try { linkOrdersByEmail(row.id, row.email); } catch (e) { /* best effort */ }
  return rowToUser(row);
}
function updateUser(id, patch) {
  ensureDb();
  const u = getUser(id);
  if (!u) return null;
  const name = patch.name != null ? String(patch.name).trim() : u.name;
  const phone = patch.phone != null ? String(patch.phone).trim() : u.phone;
  const address = patch.address != null ? String(patch.address).trim() : u.address;
  db()
    .prepare('UPDATE users SET name=?, phone=?, address=?, updated_at=? WHERE id=?')
    .run(name, phone, address, new Date().toISOString(), String(id));
  return getUser(id);
}
function setUserPassword(id, currentPassword, nextPassword) {
  ensureDb();
  const row = db().prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(String(id));
  if (!row) return { ok: false, error: 'notfound' };
  if (!verifyPassword(currentPassword, row.password)) return { ok: false, error: 'wrong' };
  if (String(nextPassword || '').length < 6) return { ok: false, error: 'password' };
  db().prepare('UPDATE users SET password=?, updated_at=? WHERE id=?').run(hashPassword(nextPassword), new Date().toISOString(), String(id));
  return { ok: true };
}
function getAllUsers() {
  ensureDb();
  return db().prepare('SELECT * FROM users ORDER BY created_at DESC').all().map(rowToUser);
}
function getClients() {
  ensureDb();
  const rows = db()
    .prepare(
      `SELECT user_id,
              COUNT(*) AS orders,
              COALESCE(SUM(total),0) AS spent,
              MAX(created_at) AS last_at,
              (SELECT customer FROM orders o2 WHERE o2.user_id = o.user_id ORDER BY created_at DESC LIMIT 1) AS last_customer
       FROM orders o
       WHERE user_id IS NOT NULL
       GROUP BY user_id`
    )
    .all();
  const users = {};
  for (const u of getAllUsers()) users[u.id] = u;
  return rows
    .map((r) => {
      const u = users[r.user_id] || {};
      const c = parseJSON(r.last_customer, {});
      return {
        userId: r.user_id,
        email: u.email || '',
        name: u.name || c.name || '',
        phone: u.phone || c.phone || '',
        orders: r.orders,
        spent: r.spent,
        lastAt: r.last_at,
        registeredAt: u.createdAt || null,
      };
    })
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}
function deleteUser(id) {
  ensureDb();
  return db().prepare('DELETE FROM users WHERE id = ?').run(String(id)).changes > 0;
}

/* --------------------------- user sessions -------------------------- */
const USER_SESSION_PREFIX = 'u:';
function createUserSession(userId) {
  ensureDb();
  const sid = crypto.randomBytes(24).toString('hex');
  db().prepare('INSERT INTO sessions (sid, user, at) VALUES (?,?,?)').run(sid, USER_SESSION_PREFIX + String(userId), Date.now());
  return sid;
}
function getUserSession(sid) {
  if (!sid) return null;
  const s = getSessionRecord(sid);
  if (!s || !String(s.user).startsWith(USER_SESSION_PREFIX)) return null;
  const userId = String(s.user).slice(USER_SESSION_PREFIX.length);
  return { sid, userId, user: getUser(userId) };
}
function deleteUserSession(sid) {
  ensureDb();
  db().prepare('DELETE FROM sessions WHERE sid = ? AND user LIKE ?').run(String(sid), USER_SESSION_PREFIX + '%');
}

/* ------------------------------ sessions ---------------------------- */
function createSession(user) {
  ensureDb();
  const sid = crypto.randomBytes(24).toString('hex');
  db().prepare('INSERT OR REPLACE INTO sessions (sid, user, at) VALUES (?,?,?)').run(sid, user, Date.now());
  return sid;
}

/* shared session record lookup + sliding expiration */
function getSessionRecord(sid) {
  ensureDb();
  if (!sid) return null;
  const row = db().prepare('SELECT * FROM sessions WHERE sid = ?').get(sid);
  if (!row) return null;
  if (Date.now() - row.at > SESSION_TTL) {
    db().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    return null;
  }
  db().prepare('UPDATE sessions SET at = ? WHERE sid = ?').run(Date.now(), sid);
  return row;
}

function getSession(sid) {
  const row = getSessionRecord(sid);
  if (!row) return null;
  // never treat a customer session as an admin session
  if (String(row.user).startsWith(USER_SESSION_PREFIX)) return null;
  return { sid: row.sid, user: row.user, at: row.at };
}

function deleteSession(sid) {
  ensureDb();
  db().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
}

function cleanupSessions() {
  ensureDb();
  db().prepare('DELETE FROM sessions WHERE at < ?').run(Date.now() - SESSION_TTL);
}

module.exports = {
  ensureDb,
  slugify: dbmod.slugify,
  getProducts,
  getProduct,
  getRelated,
  incrementViews,
  upsertProduct,
  deleteProduct,
  getTrash,
  restoreFromTrash,
  purgeFromTrash,
  emptyTrash,
  listBackups,
  createBackup,
  restoreBackup,
  getBrands,
  getAllBrands,
  getBrandCounts,
  upsertBrand,
  deleteBrand,
  syncBrandsFromProducts,
  getCategoryCounts,
  getHiddenCount,
  getHiddenCategories,
  getVisibleProducts,
  getCategories,
  getAllCategories,
  findCategory,
  upsertCategory,
  deleteCategory,
  createOrder,
  getOrders,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
  getUser,
  getUserByEmail,
  createUser,
  checkUser,
  updateUser,
  setUserPassword,
  getAllUsers,
  getClients,
  linkOrdersByEmail,
  deleteUser,
  createUserSession,
  getUserSession,
  deleteUserSession,
  getSettings,
  updateSettings,
  setAdminPassword,
  checkAdmin,
  stats,
  subscribe,
  getSubscribers,
  deleteSubscriber,
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
  cleanupSessions,
};
