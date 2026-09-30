const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const cheerio = require('cheerio');

const BASE = 'https://onika.com.ua';
const LIST_URL = `${BASE}/ua/product_list`;
const OUT_JSON = path.join(__dirname, 'products.json');
const IMG_DIR = path.join(__dirname, 'images');
const DELAY_MS = 250;
const IMG_CONCURRENCY = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'uk,ru;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === tries) throw new Error(`fetch failed ${url}: ${e.message}`);
      await sleep(1000 * i);
    }
  }
}

function parseJsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (_) {}
  }
  return out;
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fullImageUrl(u) {
  if (!u) return null;
  if (u.startsWith('/')) u = BASE + u;
  if (!u.startsWith('http')) return null;
  if (u.includes('no-image')) return null;
  // remove size suffix _wNNN_hNNN_
  return u.replace(/_w\d+_h\d+_/, '_');
}

function extFromUrl(u, fallback = '.jpg') {
  try {
    const p = new URL(u).pathname;
    const m = p.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i);
    if (m) return m[0].toLowerCase();
  } catch (_) {}
  return fallback;
}

async function collectProductUrls() {
  const urls = new Set();
  let pageUrl = LIST_URL;
  let pageNum = 1;

  while (pageUrl) {
    console.log(`[list] page ${pageNum}: ${pageUrl}`);
    const html = await fetchText(pageUrl);
    if (!html) break;

    const $ = cheerio.load(html);
    let foundOnPage = 0;
    $('a[href]').each((_, el) => {
      let href = $(el).attr('href') || '';
      if (/\/p\d+-[^"']+\.html$/.test(href)) {
        if (href.startsWith('/')) href = BASE + href;
        // normalize to /ua/ path
        try {
          const u = new URL(href, BASE);
          if (!u.pathname.startsWith('/ua/')) {
            u.pathname = '/ua' + u.pathname;
          }
          // strip query/hash
          urls.add(u.origin + u.pathname);
          foundOnPage++;
        } catch (_) {}
      }
    });

    // also from JSON-LD
    for (const ld of parseJsonLd(html)) {
      if (ld['@type'] === 'Product' && ld.offers && ld.offers.url) {
        let href = ld.offers.url;
        if (href.startsWith('/')) href = BASE + href;
        try {
          const u = new URL(href, BASE);
          if (!u.pathname.startsWith('/ua/')) u.pathname = '/ua' + u.pathname;
          urls.add(u.origin + u.pathname);
        } catch (_) {}
      }
    }

    const next = $('link[rel="next"]').attr('href');
    pageUrl = next ? new URL(next, BASE).href : null;
    pageNum++;
    if (pageNum > 200) break;
    await sleep(DELAY_MS);
  }

  return [...urls];
}

function extractProduct(html, pageUrl) {
  const lds = parseJsonLd(html);
  const productLd = lds.find((l) => l['@type'] === 'Product');
  const $ = cheerio.load(html);

  const name =
    ($('[data-qaid="product_name"]').first().text() || '').trim() ||
    (productLd && productLd.name) ||
    ($('h1').first().text() || '').trim();

  let price = null;
  let currency = 'UAH';
  let availability = null;
  let brand = null;
  let ldImage = null;
  if (productLd) {
    if (productLd.offers) {
      price = productLd.offers.price != null ? parseFloat(productLd.offers.price) : null;
      currency = productLd.offers.priceCurrency || currency;
      availability = productLd.offers.availability || null;
    }
    brand = typeof productLd.brand === 'string' ? productLd.brand : (productLd.brand && productLd.brand.name) || null;
    ldImage = productLd.image || null;
    if (!productLd.description && price == null) {
      // not a real product page
    }
  }

  const priceDisplay = ($('[data-qaid="product_price"]').first().text() || '').trim();
  const presence = ($('[data-qaid="presence_data"]').first().text() || '').trim();
  const inStock = presence ? /наявності/i.test(presence) && !/немає/i.test(presence) : availability === 'http://schema.org/InStock';

  const descEl = $('[data-qaid="product_description"]').first();
  let description = descEl.length ? stripTags(descEl.html() || '') : '';
  if (!description && productLd && productLd.description) {
    description = String(productLd.description).trim();
  }

  // brand from characteristics table
  if (!brand) {
    $('table.b-product-info tr').each((_, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 2) {
        const k = tds.eq(0).text().trim();
        const v = tds.eq(1).text().trim();
        if (/виробник|бренд/i.test(k) && v) brand = v;
      }
    });
  }

  // category from breadcrumbs
  let category = null;
  try {
    const crumbsRaw = $('[data-crumbs-path]').attr('data-crumbs-path');
    if (crumbsRaw) {
      const crumbs = JSON.parse(crumbsRaw);
      if (Array.isArray(crumbs) && crumbs.length >= 2) {
        category = crumbs[crumbs.length - 2].name || null;
      }
    }
  } catch (_) {}

  // images: only product gallery (exclude site logo/header)
  const imgSet = new Set();
  const addImg = (u) => {
    const f = fullImageUrl(u);
    if (f && !/6989228565|_onika\.jpg$/i.test(f)) imgSet.add(f);
  };

  $(
    '.b-product__image-panel img, .cs-images img, img.csjs-image, [data-qaid="img_product_sticky_panel"], .b-sticky-panel__image-box'
  ).each((_, el) => {
    addImg($(el).attr('src') || $(el).attr('href') || '');
  });
  $('.b-product__image-panel a[href*="images.prom"]').each((_, el) =>
    addImg($(el).attr('href'))
  );
  const ogImg = $('meta[property="og:image"]').attr('content');
  if (ogImg) addImg(ogImg);
  if (ldImage) {
    (Array.isArray(ldImage) ? ldImage : [ldImage]).forEach(addImg);
  }

  // Prefer order: main product image first
  const mainSel = $('img.csjs-image').attr('src');
  let images = [...imgSet];
  if (mainSel) {
    const mf = fullImageUrl(mainSel);
    if (mf && !/6989228565|_onika\.jpg$/i.test(mf)) {
      images = [mf, ...images.filter((u) => u !== mf)];
    }
  }

  // id from url
  const idM = pageUrl.match(/\/p(\d+)-/);
  const id = idM ? idM[1] : null;

  return {
    id,
    name,
    price,
    price_display: priceDisplay || null,
    currency,
    availability,
    in_stock: inStock,
    presence: presence || null,
    brand,
    category,
    description,
    url: pageUrl,
    image_urls: images,
  };
}

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Referer: BASE + '/',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error('too small');
      fs.writeFileSync(dest, buf);
      return true;
    } catch (e) {
      if (i === 3) {
        console.error(`  [img-fail] ${url}: ${e.message}`);
        return false;
      }
      await sleep(500 * i);
    }
  }
}

function imgFilename(u) {
  try {
    const p = new URL(u).pathname;
    const m = p.match(/\/(\d{6,})/);
    if (m) return m[1] + extFromUrl(u);
    const base = p.split('/').pop() || '';
    if (base) return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch (_) {}
  let h = 0;
  for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0;
  return h.toString(16) + extFromUrl(u);
}

async function downloadImages(products) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const jobs = [];
  const seen = new Map(); // url -> local filename

  for (const p of products) {
    p.images = [];
    p.image_files = [];
    const urls = p.image_urls || [];
    for (const u of urls) {
      let fname = seen.get(u);
      if (!fname) {
        fname = imgFilename(u);
        // avoid collision with different url same id
        let k = 1;
        const orig = fname;
        while ([...seen.values()].includes(fname) && seen.get(u) !== fname) {
          fname = orig.replace(/(\.[^.]+)$/, `_${k}$1`);
          k++;
        }
        seen.set(u, fname);
        jobs.push({ url: u, dest: path.join(IMG_DIR, fname) });
      }
      p.images.push(`images/${fname}`);
      p.image_files.push(`images/${fname}`);
    }
  }

  console.log(`[images] downloading ${jobs.length} files (${seen.size} unique)`);
  let done = 0;
  let ok = 0;
  let idx = 0;

  async function worker() {
    while (idx < jobs.length) {
      const j = jobs[idx++];
      const success = await downloadFile(j.url, j.dest);
      if (success) ok++;
      done++;
      if (done % 50 === 0) console.log(`  [images] ${done}/${jobs.length} (ok ${ok})`);
      await sleep(50);
    }
  }

  await Promise.all(Array.from({ length: IMG_CONCURRENCY }, worker));
  console.log(`[images] done: ${ok}/${jobs.length}`);
}

async function main() {
  const listFile = path.join(__dirname, 'product_urls.json');
  let urls;
  if (fs.existsSync(listFile)) {
    const rels = JSON.parse(fs.readFileSync(listFile, 'utf8'));
    urls = rels.map((r) => (r.startsWith('http') ? r : BASE + r));
    console.log(`Loaded ${urls.length} product URLs from product_urls.json`);
  } else {
    console.log('Collecting product URLs...');
    urls = await collectProductUrls();
    console.log(`Found ${urls.length} product URLs`);
  }

  const products = [];
  const byUrl = new Map();
  if (fs.existsSync(OUT_JSON)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
      for (const p of prev.products || []) {
        if (p && p.url) {
          products.push(p);
          byUrl.set(p.url, p);
        }
      }
      console.log(`Resuming: ${products.length} products already scraped`);
    } catch (_) {}
  }

  let n = 0;
  let added = 0;
  for (const u of urls) {
    n++;
    if (byUrl.has(u)) continue;
    try {
      const html = await fetchText(u);
      if (!html) {
        console.warn(`  [skip 404] ${u}`);
        continue;
      }
      const data = extractProduct(html, u);
      if (!data.name) {
        console.warn(`  [skip no-name] ${u}`);
        continue;
      }
      products.push(data);
      byUrl.set(u, data);
      added++;
      if (added % 20 === 0) console.log(`[products] +${added} (total ${products.length}/${urls.length})`);
    } catch (e) {
      console.error(`  [err] ${u}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`Parsed ${products.length} products (${added} new), downloading images...`);
  await downloadImages(products);

  const catalog = {
    source: BASE + '/ua/',
    scraped_at: new Date().toISOString(),
    count: products.length,
    products,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Saved ${OUT_JSON} (${products.length} products)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
