'use strict';

/**
 * One-time (resumable) translation of product names & descriptions
 * from Ukrainian (source) into Russian and English, cached in SQLite.
 *
 * Usage:  node scripts/translate-products.js [--force]
 */

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB = new DatabaseSync(path.join(__dirname, '..', 'data', 'onika.db'));
DB.exec('PRAGMA busy_timeout = 8000;');

const FORCE = process.argv.indexOf('--force') > -1;
const LANGS = ['ru', 'en'];
const DELAY = 160;
const MAX_DESC = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(text, tl) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=' +
    tl +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnikaBot/1.0)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  return j[0].map((s) => s[0]).join('');
}

async function translateProduct(row, lang) {
  const text = String(row.name || '') + '\n' + String(row.description || '').slice(0, MAX_DESC);
  let out;
  try {
    out = await translate(text, lang);
  } catch (e) {
    await sleep(1500);
    out = await translate(text, lang);
  }
  const nl = out.indexOf('\n');
  const name = (nl > -1 ? out.slice(0, nl) : out).trim();
  const description = (nl > -1 ? out.slice(nl + 1) : '').trim();
  return { name, description };
}

(async () => {
  const rows = DB.prepare('SELECT id,name,description,translations FROM products').all();
  console.log('products:', rows.length, 'langs:', LANGS.join(','), FORCE ? '(force)' : '');
  let updated = 0;
  let processed = 0;

  for (const row of rows) {
    let tr = {};
    try {
      tr = JSON.parse(row.translations || '{}');
    } catch (e) {}
    let changed = false;
    for (const lang of LANGS) {
      const cur = tr[lang] || {};
      if (cur.name && !FORCE) continue;
      try {
        const t = await translateProduct(row, lang);
        if (t.name) {
          tr[lang] = t;
          changed = true;
        }
      } catch (e) {
        console.error('  fail', row.id, lang, e.message);
      }
      await sleep(DELAY);
    }
    if (changed) {
      DB.prepare('UPDATE products SET translations=? WHERE id=?').run(JSON.stringify(tr), row.id);
      updated++;
    }
    processed++;
    if (processed % 25 === 0) console.log('  progress', processed + '/' + rows.length, 'updated', updated);
  }
  console.log('DONE. updated', updated, 'of', rows.length);
})();
