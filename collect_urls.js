const { URL } = require('url');

const BASE = 'https://onika.com.ua';
const START = [
  '/ua/g149677185-zhenskaya-odezhda',
  '/ua/g149677187-muzhskaya-odezhda',
  '/ua/g149677203-detskaya-odezhda',
  '/ua/g149677215-aksesuari',
  '/ua/g149677217-kosmetikaparfyumeriya',
  '/ua/g149715550-zhenskaya-obuv',
  '/ua/g149733862-opt',
  '/ua/g149789254-muzhskaya-obuv',
  '/ua/g149789255-detskaya-obuv',
  '/ua/g151222127-tovari-dlya-domu',
  '/ua/g156225173-semenasazhentsyrasteniya',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === tries) throw e;
      await sleep(800 * i);
    }
  }
}

async function main() {
  const queue = [...START];
  const seenPages = new Set();
  const products = new Set();
  const categories = new Set();

  while (queue.length) {
    const path = queue.shift();
    if (seenPages.has(path)) continue;
    seenPages.add(path);

    const url = path.startsWith('http') ? path : BASE + path;
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      console.error(`ERR ${url}: ${e.message}`);
      continue;
    }
    if (!html) {
      console.log(`404 ${url}`);
      continue;
    }

    // product links
    const prodRe = /href="(\/ua\/p\d+-[^"]+\.html)"/g;
    let m;
    let pageProds = 0;
    while ((m = prodRe.exec(html))) {
      if (!products.has(m[1])) {
        products.add(m[1]);
        pageProds++;
      }
    }

    // subcategory links on this page (group pages gNNN)
    const catRe = /href="(\/ua\/g\d+-[^"]+)"/g;
    while ((m = catRe.exec(html))) {
      const c = m[1];
      if (!categories.has(c) && !seenPages.has(c)) {
        categories.add(c);
        queue.push(c);
      }
    }

    // pagination next
    const nextM = html.match(/<link rel="next" href="([^"]+)"/);
    if (nextM) {
      let n = nextM[1];
      if (n.startsWith('/')) n = BASE + n;
      try {
        const nu = new URL(n);
        const p = nu.pathname + nu.search;
        if (!seenPages.has(p)) queue.push(p);
      } catch (_) {}
    }

    console.log(`OK ${path} (+${pageProds} new products, total ${products.size})`);
    await sleep(200);
  }

  console.log('---');
  console.log(`pages crawled: ${seenPages.size}`);
  console.log(`categories found: ${categories.size}`);
  console.log(`unique products: ${products.size}`);
  require('fs').writeFileSync(
    require('path').join(__dirname, 'product_urls.json'),
    JSON.stringify([...products].sort(), null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
