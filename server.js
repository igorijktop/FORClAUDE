'use strict';

const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const store = require('./lib/store');
const pages = require('./lib/pages');
const admin = require('./lib/admin');
const ui = require('./lib/ui');
const i18n = require('./lib/i18n');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const DEV = process.env.NODE_ENV === 'development';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const app = express();

store.ensureDb();
store.cleanupSessions();
setInterval(() => store.cleanupSessions(), 1000 * 60 * 60);

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const IMG_CACHE = path.join(__dirname, 'data', 'imgcache');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(IMG_CACHE, { recursive: true });

app.disable('x-powered-by');
app.set('trust proxy', 1);

/* ------------------------------ security ---------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(express.json({ limit: '4mb' }));

/* ------------------------------ assets ------------------------------ */
app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (/\.(css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    },
  })
);
app.get('/favicon.png', (req, res) => res.sendFile(path.join(__dirname, 'favicon.png')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.png')));
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'logo.png')));
/* product photos live in project root (images/, uploads/) — serve them directly */
app.use('/images', express.static(path.join(__dirname, 'images'), { etag: true, maxAge: '30d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { etag: true, maxAge: '30d' }));

/* never let the browser cache HTML pages (avoids "nothing changed" after deploys) */
app.use((req, res, next) => {
  if (!/\.(css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|xml|txt|json)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

/* --------------------------- image optimizer ------------------------ */
app.get('/img', async (req, res) => {
  const p = String(req.query.p || '');
  if (!/^(images|uploads)\/[A-Za-z0-9._\-]+$/.test(p)) return res.status(400).end();
  const src = path.join(__dirname, p);
  if (!fs.existsSync(src)) return res.status(404).end();
  const w = Math.max(16, Math.min(1600, parseInt(req.query.w, 10) || 700));
  let f = String(req.query.f || 'webp');
  if (['webp', 'avif', 'jpeg', 'png'].indexOf(f) === -1) f = 'webp';
  const ext = f === 'jpeg' ? 'jpg' : f;
  try {
    const mtime = fs.statSync(src).mtimeMs;
    const key = crypto.createHash('md5').update(p + '|' + w + '|' + f + '|' + mtime).digest('hex') + '.' + ext;
    const dest = path.join(IMG_CACHE, key);
    if (!fs.existsSync(dest)) {
      const tmp = dest + '.' + crypto.randomBytes(3).toString('hex');
      await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).toFormat(f, { quality: 80 }).toFile(tmp);
      fs.renameSync(tmp, dest);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(ext === 'jpg' ? 'image/jpeg' : 'image/' + ext);
    res.sendFile(dest);
  } catch (e) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(src);
  }
});

/* -------------------------- language in path ------------------------ */
const COOKIE_MAX = 1000 * 60 * 60 * 24 * 365;

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function setCookie(res, name, value, maxAge) {
  const prev = res.getHeader('Set-Cookie');
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const seg = (req.path.split('/')[1] || '').toLowerCase();
  let lang = 'uk';

  if (seg === 'ru' || seg === 'en') {
    lang = seg;
    setCookie(res, 'lang', lang, COOKIE_MAX);
    req.url = req.url.replace(/^\/(ru|en)(?=\/|$)/, '') || '/';
  } else if (seg === 'uk') {
    const clean = req.originalUrl.replace(/^\/uk(?=\/|$)/, '') || '/';
    return res.redirect(301, clean);
  } else if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    lang = ['ru', 'en'].indexOf(cookies.lang) > -1 ? cookies.lang : 'uk';
  }

  const base = req.protocol + '://' + req.get('host');
  i18n.setRequest(lang, req.path, base);
  req.lang = lang;
  req.cookies = cookies;

  // CSRF token bound to anonymous cookie
  if (!cookies.ct) {
    const ct = crypto.randomBytes(16).toString('hex');
    setCookie(res, 'ct', ct, COOKIE_MAX);
    req.csrfCookie = ct;
  } else {
    req.csrfCookie = cookies.ct;
  }
  res.locals.csrf = crypto.createHmac('sha256', SECRET).update(req.csrfCookie).digest('hex').slice(0, 40);
  req.csrf = res.locals.csrf;

  req.categories = store.getCategories();
  req.settings = store.getSettings();
  req.session = store.getSession(cookies.sid);
  req.userSession = store.getUserSession(cookies.usid);
  req.user = req.userSession ? req.userSession.user : null;
  ui.setUser(req.user);
  next();
});

function csrfCheck(req, res, next) {
  const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (token && token === res.locals.csrf) return next();
  return res.status(403).send('CSRF token invalid');
}

function requireUser(req, res, next) {
  if (!req.user) return res.redirect(i18n.url('/account/login'));
  next();
}

/* ------------------------------ uploads ----------------------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, 'up_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex')),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const MAGIC = [
  { ext: 'jpg', sig: [0xff, 0xd8, 0xff] },
  { ext: 'png', sig: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'gif', sig: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', sig: [0x52, 0x49, 0x46, 0x46], extra: [0x57, 0x45, 0x42, 0x50] },
  { ext: 'avif', sig: [0x00, 0x00, 0x00], brand: 'ftyp' },
];
function detectImage(file) {
  try {
    const fd = fs.openSync(file.path, 'r');
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);
    for (const m of MAGIC) {
      if (m.brand) {
        if (buf.slice(4, 8).toString('ascii') === 'ftyp' && /avif|heic|mif1/.test(buf.slice(8, 16).toString('ascii'))) return 'avif';
        continue;
      }
      if (m.sig.every((b, i) => buf[i] === b)) {
        if (m.ext === 'webp' && !(buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)) continue;
        return m.ext;
      }
    }
  } catch (e) {}
  return null;
}
function sanitizeUploads(files) {
  const out = [];
  for (const f of files || []) {
    const ext = detectImage(f);
    if (!ext) {
      try {
        fs.unlinkSync(f.path);
      } catch (e) {}
      continue;
    }
    const target = f.path + '.' + ext;
    try {
      fs.renameSync(f.path, target);
    } catch (e) {}
    out.push('uploads/' + path.basename(target));
  }
  return out;
}

/* ------------------------------ rate limits ------------------------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false, message: 'Too many attempts' });
const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

/* ============================== PUBLIC ============================== */
app.get('/', (req, res) => res.send(pages.home(req.settings, req.categories)));
// legacy: /catalog?category=<name> -> 301 to /catalog/<slug>
app.get('/catalog', (req, res, next) => {
  const c = req.query.category;
  if (c && !Array.isArray(c)) {
    const cat = store.findCategory(c);
    if (cat && cat.slug) return res.redirect(301, i18n.url('/catalog/' + cat.slug));
  } else if (Array.isArray(c) && c.length === 1) {
    const cat = store.findCategory(c[0]);
    if (cat && cat.slug) {
      const q = new URLSearchParams(req.query);
      q.delete('category');
      return res.redirect(301, i18n.url('/catalog/' + cat.slug) + (q.toString() ? '?' + q.toString() : ''));
    }
  }
  res.send(pages.catalog(req.settings, req.categories, req.query));
});
function catalogCardsHandler(slug) {
  return (req, res) => {
    const q = { ...req.query };
    if (slug) {
      const cat = store.findCategory(slug);
      if (cat) q.category = cat.name;
    }
    res.type('html').send(pages.catalogCards(req.settings, q));
  };
}
app.get('/catalog/cards', catalogCardsHandler(null));
app.get('/catalog/:slug/cards', (req, res, next) => {
  if (!store.findCategory(req.params.slug)) return next();
  return catalogCardsHandler(req.params.slug)(req, res);
});
// SEO: /catalog/<category-slug>
app.get('/catalog/:slug', (req, res, next) => {
  const cat = store.findCategory(req.params.slug);
  if (!cat) return next();
  if (!cat.active) return res.status(404).send(pages.notFound(req.settings, req.categories));
  res.send(pages.catalog(req.settings, req.categories, req.query, req.params.slug));
});
app.get('/product/:slug', (req, res) => {
  const product = store.getProduct(req.params.slug);
  if (!product || product.active === false) return res.status(404).send(pages.notFound(req.settings, req.categories));
  const hiddenCats = store.getHiddenCategories();
  if (hiddenCats.includes(product.category)) return res.status(404).send(pages.notFound(req.settings, req.categories));
  res.send(pages.productPage(req.settings, req.categories, product));
});
app.get('/cart', (req, res) => res.send(pages.cartPage(req.settings, req.categories)));
app.get('/checkout', (req, res) => res.send(pages.checkoutPage(req.settings, req.categories, req.user)));
app.get('/about', (req, res) => res.send(pages.about(req.settings, req.categories)));
app.get('/contacts', (req, res) => res.send(pages.contacts(req.settings, req.categories)));

/* --------------------------- user account --------------------------- */
app.get('/account', (req, res) => {
  if (!req.user) return res.redirect(i18n.url('/account/login'));
  res.send(pages.accountPage(req.settings, req.categories, {
    user: req.user,
    orders: store.getUserOrders(req.user.id),
    csrf: req.csrf,
    query: req.query,
  }));
});
app.get('/account/login', (req, res) => {
  if (req.user) return res.redirect(i18n.url('/account'));
  res.send(pages.accountLogin(req.settings, req.categories, { csrf: req.csrf, query: req.query }));
});
app.post('/account/login', loginLimiter, csrfCheck, (req, res) => {
  const b = req.body || {};
  const user = store.checkUser(b.email, b.password);
  if (!user) return res.redirect(i18n.url('/account/login?error=wrong'));
  const sid = store.createUserSession(user.id);
  setCookie(res, 'usid', sid, COOKIE_MAX / 1000);
  res.redirect(i18n.url('/account?ok=in'));
});
app.get('/account/register', (req, res) => {
  if (req.user) return res.redirect(i18n.url('/account'));
  res.send(pages.accountRegister(req.settings, req.categories, { csrf: req.csrf, query: req.query }));
});
app.post('/account/register', loginLimiter, csrfCheck, (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim();
  const keep = (err) => res.redirect(i18n.url('/account/register?error=' + err + '&email=' + encodeURIComponent(email) + '&name=' + encodeURIComponent(b.name || '')));
  if (!b.email || !b.password) return keep('fields');
  if (String(b.password) !== String(b.password2)) return keep('password2');
  const r = store.createUser({ email, password: b.password, name: b.name, phone: b.phone });
  if (!r.ok) return keep(r.error);
  const sid = store.createUserSession(r.user.id);
  setCookie(res, 'usid', sid, COOKIE_MAX / 1000);
  res.redirect(i18n.url('/account?ok=registered'));
});
app.get('/account/logout', (req, res) => {
  const sid = parseCookies(req).usid;
  if (sid) store.deleteUserSession(sid);
  setCookie(res, 'usid', '', 0);
  res.redirect(i18n.url('/account/login?ok=out'));
});
app.post('/account/profile', requireUser, csrfCheck, (req, res) => {
  store.updateUser(req.user.id, { name: (req.body || {}).name, phone: (req.body || {}).phone, address: (req.body || {}).address });
  res.redirect(i18n.url('/account?ok=saved'));
});
app.post('/account/password', requireUser, csrfCheck, (req, res) => {
  const b = req.body || {};
  const r = store.setUserPassword(req.user.id, b.current, b.next);
  res.redirect(i18n.url('/account?' + (r.ok ? 'ok=pass' : 'error=wrongpass')));
});

app.get('/order/:id', (req, res) => {
  const order = store.getOrder(req.params.id);
  const isAdmin = !!req.session;
  const isOwner = req.user && order && order.userId && String(order.userId) === String(req.user.id);
  if (!order || (!isAdmin && !isOwner && req.query.token !== order.token)) {
    return res.status(404).send(pages.notFound(req.settings, req.categories));
  }
  res.send(pages.orderSuccess(req.settings, req.categories, order, order.token));
});

/* ------------------------------- API -------------------------------- */
app.get('/api/products', (req, res) => res.json(store.getVisibleProducts(req.query)));
app.get('/api/products/:id', (req, res) => {
  const p = store.getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json({ ...p, related: store.getRelated(p, 8) });
});
app.get('/api/categories', (req, res) => res.json(store.getCategories()));
app.get('/api/settings', (req, res) => {
  const s = { ...store.getSettings() };
  delete s.adminPass;
  res.json(s);
});

app.post('/api/orders', orderLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone || !Array.isArray(b.items) || !b.items.length) {
    return res.status(400).json({ error: "Заповніть обов'язкові поля та додайте товари" });
  }
  const order = store.createOrder(b, req.user ? req.user.id : null);
  res.json({ ok: true, order: { id: order.id, token: order.token, total: order.total } });
});
app.get('/api/orders/:id', (req, res) => {
  const o = store.getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  const isOwner = req.user && o.userId && String(o.userId) === String(req.user.id);
  if (!req.session && !isOwner && req.query.token !== o.token) return res.status(403).json({ error: 'forbidden' });
  res.json(o);
});
app.post('/api/subscribe', formLimiter, (req, res) => res.json({ ok: store.subscribe((req.body || {}).email) }));
app.post('/api/contact', formLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.contact) return res.status(400).json({ error: 'Заповніть поля' });
  console.log('[contact]', b.name, b.contact);
  res.json({ ok: true });
});

/* ------------------------------- SEO -------------------------------- */
app.get('/robots.txt', (req, res) => {
  const base = i18n.abs('/');
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order/\n\nSitemap: ${base}sitemap.xml\n`
  );
});
app.get('/sitemap.xml', (req, res) => {
  const staticPaths = ['/', '/catalog', '/about', '/contacts'];
  const cats = store.getCategories();
  const products = store.getProducts({ perPage: 100000, sort: 'new' }).items;
  const urls = [];
  const add = (cleanPath, prio, freq) => {
    const alts = i18n.alternates(cleanPath);
    const links = ['uk', 'ru', 'en'].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${i18n.abs(alts[l])}"/>`).join('\n');
    for (const l of ['uk', 'ru', 'en']) {
      urls.push(`  <url>\n    <loc>${i18n.abs(alts[l])}</loc>\n${links}\n    <priority>${prio}</priority>\n    <changefreq>${freq}</changefreq>\n  </url>`);
    }
  };
  staticPaths.forEach((p) => add(p, p === '/' ? '1.0' : '0.7', 'weekly'));
  add('/catalog', '0.6', 'weekly');
  cats.forEach((c) => add('/catalog/' + (c.slug || encodeURIComponent(c.name)), '0.6', 'weekly'));
  products.forEach((p) => add('/product/' + encodeURIComponent(p.slug || p.id), '0.8', 'weekly'));
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`
  );
});

/* =============================== ADMIN ============================== */
function requireAuth(req, res, next) {
  if (!req.session) return res.redirect('/admin/login');
  next();
}

app.get('/admin', requireAuth, (req, res) => res.send(admin.dashboard(req)));
app.get('/admin/login', (req, res) => {
  if (req.session) return res.redirect('/admin');
  res.send(admin.loginPage(req, req.query.error));
});
app.post('/admin/login', loginLimiter, (req, res) => {
  const { user, password } = req.body || {};
  if (store.checkAdmin(user, password)) {
    const sid = store.createSession(user);
    setCookie(res, 'sid', sid, COOKIE_MAX / 1000);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=1');
});
app.get('/admin/logout', (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) store.deleteSession(sid);
  setCookie(res, 'sid', '', 0);
  res.redirect('/admin/login');
});

app.get('/admin/products', requireAuth, (req, res) => res.send(admin.productsPage(req, req.query)));
app.get('/admin/products/new', requireAuth, (req, res) => res.send(admin.productForm(req, null)));
app.post('/admin/products/save', requireAuth, upload.array('imageFiles', 12), csrfCheck, (req, res) => {
  const b = req.body || {};
  const uploaded = sanitizeUploads(req.files);
  const existing = (b.existingImages || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const urlImages = (b.images || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const brandNew = String(b.brandNew || '').trim();
  if (brandNew) store.upsertBrand({ name: brandNew });
  const data = {
    id: b.id || undefined,
    name: b.name,
    price: b.price,
    oldPrice: b.oldPrice,
    category: b.category,
    brand: brandNew || b.brand,
    description: b.description,
    sku: b.sku,
    sizes: b.sizes,
    inStock: b.inStock === 'on' || b.inStock === 'true' || b.inStock === true,
    featured: b.featured === 'on' || b.featured === 'true' || b.featured === true,
    active: b.active === 'on' || b.active === 'true' || b.active === true,
    images: [...existing, ...uploaded, ...urlImages],
    translations: {
      ru: { name: b.nameRu || '', description: b.descRu || '' },
      en: { name: b.nameEn || '', description: b.descEn || '' },
    },
  };
  const product = store.upsertProduct(data);
  res.redirect('/admin/products?saved=1' + (product ? '&id=' + encodeURIComponent(product.id) : ''));
});
app.get('/admin/products/:id/edit', requireAuth, (req, res) => {
  const p = store.getProduct(req.params.id);
  if (!p) return res.redirect('/admin/products');
  res.send(admin.productForm(req, p));
});
app.post('/admin/products/:id/delete', requireAuth, csrfCheck, (req, res) => {
  store.deleteProduct(req.params.id);
  res.redirect('/admin/products?deleted=1');
});
app.get('/admin/trash', requireAuth, (req, res) => res.send(admin.trashPage(req, req.query)));
app.post('/admin/trash/:id/restore', requireAuth, csrfCheck, (req, res) => {
  store.restoreFromTrash(req.params.id);
  res.redirect('/admin/trash?restored=1');
});
app.post('/admin/trash/:id/purge', requireAuth, csrfCheck, (req, res) => {
  store.purgeFromTrash(req.params.id);
  res.redirect('/admin/trash?purged=1');
});
app.post('/admin/trash/empty', requireAuth, csrfCheck, (req, res) => {
  store.emptyTrash('product');
  res.redirect('/admin/trash?purged=1');
});
app.post('/admin/products/:id/toggle', requireAuth, csrfCheck, (req, res) => {
  const p = store.getProduct(req.params.id);
  if (p) store.upsertProduct({ id: p.id, active: !(p.active !== false) });
  res.redirect(req.get('referer') || '/admin/products');
});

app.get('/admin/orders', requireAuth, (req, res) => res.send(admin.ordersPage(req, req.query)));
app.get('/admin/clients', requireAuth, (req, res) => res.send(admin.clientsPage(req, req.query)));
app.post('/admin/orders/:id/status', requireAuth, csrfCheck, (req, res) => {
  store.updateOrderStatus(req.params.id, (req.body || {}).status, (req.body || {}).note);
  res.redirect('/admin/orders');
});
app.post('/admin/orders/:id/delete', requireAuth, csrfCheck, (req, res) => {
  store.deleteOrder(req.params.id);
  res.redirect('/admin/orders');
});

app.get('/admin/categories', requireAuth, (req, res) => res.send(admin.categoriesPage(req, req.query)));
app.post('/admin/categories/save', requireAuth, csrfCheck, (req, res) => {
  store.upsertCategory(req.body || {});
  res.redirect('/admin/categories?saved=1');
});
app.post('/admin/categories/:id/delete', requireAuth, csrfCheck, (req, res) => {
  const ok = store.deleteCategory(req.params.id);
  res.redirect('/admin/categories' + (ok ? '?deleted=1' : '?error=notempty'));
});
app.post('/admin/categories/:id/toggle', requireAuth, csrfCheck, (req, res) => {
  const cats = store.getAllCategories();
  const c = cats.find((x) => String(x.id) === String(req.params.id));
  if (c) store.upsertCategory({ id: c.id, active: !(c.active !== false) });
  res.redirect(req.get('referer') || '/admin/categories');
});

app.get('/admin/subscribers', requireAuth, (req, res) => res.send(admin.subscribersPage(req, req.query)));
app.get('/admin/subscribers.csv', requireAuth, (req, res) => {
  const list = store.getSubscribers();
  const csv = 'email,subscribed_at\n' + list.map((s) => `"${String(s.email).replace(/"/g, '""')}",${s.at || ''}`).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="onika-subscribers.csv"');
  res.send('﻿' + csv);
});
app.post('/admin/subscribers/:email/delete', requireAuth, csrfCheck, (req, res) => {
  store.deleteSubscriber(decodeURIComponent(req.params.email));
  res.redirect('/admin/subscribers?deleted=1');
});

app.get('/admin/brands', requireAuth, (req, res) => res.send(admin.brandsPage(req, req.query)));
app.post('/admin/brands/save', requireAuth, csrfCheck, (req, res) => {
  store.upsertBrand(req.body || {});
  res.redirect('/admin/brands?saved=1');
});
app.post('/admin/brands/:id/delete', requireAuth, csrfCheck, (req, res) => {
  const ok = store.deleteBrand(req.params.id);
  res.redirect('/admin/brands' + (ok ? '?deleted=1' : '?error=notempty'));
});

/* Suggest translations for a product (UK -> RU/EN) via Google Translate */
async function gtxTranslate(text, tl) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=' +
    tl +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnikaAdmin/1.0)' } });
  if (!res.ok) throw new Error('translate HTTP ' + res.status);
  const j = await res.json();
  return (j[0] || []).map((s) => s[0]).join('');
}
app.post('/admin/api/translate', requireAuth, csrfCheck, async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const description = String(b.description || '').slice(0, 1500).trim();
    if (!name && !description) return res.status(400).json({ error: 'empty' });
    const out = {};
    for (const tl of ['ru', 'en']) {
      const combined = name + '\n' + description;
      const translated = await gtxTranslate(combined, tl);
      const nl = translated.indexOf('\n');
      out[tl] = {
        name: (nl > -1 ? translated.slice(0, nl) : translated).trim(),
        description: (nl > -1 ? translated.slice(nl + 1) : '').trim(),
      };
    }
    res.json({ ok: true, translations: out });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'translate failed' });
  }
});

app.get('/admin/settings', requireAuth, (req, res) => res.send(admin.settingsPage(req, req.query)));
app.post('/admin/settings/save', requireAuth, csrfCheck, (req, res) => {
  const b = req.body || {};
  const translations = {};
  for (const lang of ['ru', 'en']) {
    const block = {};
    for (const key of ['tagline', 'announcement', 'heroTitle', 'heroSubtitle']) {
      const v = b[key + '_' + lang];
      if (v != null && String(v).trim() !== '') block[key] = String(v).trim();
    }
    if (Object.keys(block).length) translations[lang] = block;
  }
  store.updateSettings({
    siteName: b.siteName,
    tagline: b.tagline,
    heroTitle: b.heroTitle,
    heroSubtitle: b.heroSubtitle,
    announcement: b.announcement,
    phone: b.phone,
    email: b.email,
    address: b.address,
    instagram: b.instagram,
    telegram: b.telegram,
    freeShippingFrom: Number(b.freeShippingFrom) || 0,
    translations,
  });
  res.redirect('/admin/settings?saved=1');
});
app.post('/admin/settings/password', requireAuth, csrfCheck, (req, res) => {
  const b = req.body || {};
  const result = store.setAdminPassword(b.current, b.next);
  res.redirect('/admin/settings?' + (result.ok ? 'saved=1' : 'error=pass'));
});

/* database backups */
app.post('/admin/backups/create', requireAuth, csrfCheck, (req, res) => {
  try {
    store.createBackup('manual');
    res.redirect('/admin/settings?backup=1');
  } catch (e) {
    res.redirect('/admin/settings?error=backup');
  }
});
app.get('/admin/backups/:name/download', requireAuth, (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const safe = String(req.params.name || '').replace(/[^a-zA-Z0-9._-]+/g, '');
  if (!/^onika-\d{4}-\d{2}-\d{2}[T_-].*\.db$/.test(safe)) return res.status(400).end();
  const file = path.join(__dirname, 'data', 'backups', safe);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.download(file, safe);
});
app.post('/admin/backups/:name/restore', requireAuth, csrfCheck, (req, res) => {
  const r = store.restoreBackup(req.params.name);
  res.redirect('/admin/settings?' + (r.ok ? 'backup=1' : 'error=backup'));
});

/* ----------------------------- fallbacks ---------------------------- */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.status(404).send(pages.notFound(req.settings, req.categories));
});
app.use((err, req, res, next) => {
  console.error('[error]', err && err.message);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: DEV ? err.message : 'server error' });
  res.status(500).send('<pre style="font-family:monospace;padding:40px">' + (DEV ? ui.esc(err.message) : 'Помилка сервера') + '</pre>');
});

let listenPort = PORT;
function start(port, attempt) {
  const server = app.listen(port);
  server.on('listening', () => {
    console.log('');
    console.log('  \x1b[1m\x1b[38;5;211mONIKA\x1b[0m — сайт запущено');
    console.log('  Магазин:  http://localhost:' + port);
    console.log('  Адмінка:  http://localhost:' + port + '/admin');
    console.log('  EN:       http://localhost:' + port + '/en');
    console.log('  Логін:    admin / onika2024');
    console.log('');
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 20) {
      console.log('  Порт ' + port + ' зайнятий, пробую ' + (port + 1) + '...');
      start(port + 1, attempt + 1);
    } else {
      console.error('  Не вдалося запустити сервер:', err.message);
      process.exit(1);
    }
  });
}
start(listenPort, 0);
