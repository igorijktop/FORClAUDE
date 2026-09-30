'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const i18n = require('./i18n');

/* request-scoped current user (set by server middleware before rendering) */
let CURRENT_USER = null;
function setUser(u) { CURRENT_USER = u || null; }
function getUser() { return CURRENT_USER; }
function firstName(u) {
  const s = String((u && (u.name || u.email)) || '').trim();
  return s.split(/[\s@]+/)[0] || '';
}

function asset(p) {
  try {
    const file = path.join(__dirname, '..', 'public', p.replace(/^\//, ''));
    const h = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
    return p + '?v=' + h;
  } catch (e) {
    return p;
  }
}

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M14 9h4l4 4v5a1 1 0 0 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>',
  sparkle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  return: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  star: '<path d="M11.5 2.7a.6.6 0 0 1 1 0l2.4 5 5.5.8a.6.6 0 0 1 .33 1L17 13.6l.94 5.5a.6.6 0 0 1-.87.63L12 17.1l-4.5 2.4a.6.6 0 0 1-.87-.63L7.57 13 3.5 9.5a.6.6 0 0 1 .33-1l5.5-.8z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2 2z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
};

function icon(name, cls) {
  const p = ICONS[name] || '';
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(n, currency) {
  const v = Number(n) || 0;
  const s = v.toLocaleString('uk-UA').replace(/\u00a0/g, ' ');
  return `${s} ${currency || '₴'}`;
}

/* ------------------------------ images ------------------------------ */
function isExternal(s) {
  return /^(https?:|data:|\/\/)/.test(String(s || ''));
}

function placeholderData() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#f3ede6"/><text x="150" y="205" font-family="serif" font-size="26" fill="#c9beb0" text-anchor="middle">ONIKA</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function rawImage(src) {
  if (!src) return '';
  if (isExternal(src)) return src;
  return '/' + String(src).replace(/^\/+/, '');
}

/** Optimized display URL (sharp resize endpoint) for local images. */
function img(src, w, fmt) {
  if (!src) return placeholderData();
  if (isExternal(src)) return src;
  const p = String(src).replace(/^\/+/, '');
  if (!/^(images|uploads)\//.test(p)) return '/' + p;
  return `/img?p=${encodeURIComponent(p)}&w=${w || 700}&f=${fmt || 'webp'}`;
}

function imgSet(src, widths) {
  if (!src || isExternal(src)) return '';
  const p = String(src).replace(/^\/+/, '');
  if (!/^(images|uploads)\//.test(p)) return '';
  return widths.map((w) => `/img?p=${encodeURIComponent(p)}&w=${w}&f=webp ${w}w`).join(', ');
}

/* ------------------------------ language ---------------------------- */
function langSwitch() {
  const cur = i18n.getLang();
  const alts = i18n.alternates(i18n.getPath());
  return `<div class="lang-switch" id="langSwitch">
    <button type="button" class="lang-toggle" aria-haspopup="true" aria-expanded="false" title="${esc(i18n.t('common.language'))}">
      ${icon('globe')}
      <span class="lang-cur">${i18n.LANG_SHORT[cur]}</span>
      ${icon('chevron', 'chev')}
    </button>
    <div class="lang-menu">
      ${i18n.SUPPORTED.map(
        (l) =>
          `<a class="lang-opt ${l === cur ? 'on' : ''}" href="${esc(alts[l])}" data-lang="${l}">
            <span class="lang-code">${i18n.LANG_SHORT[l]}</span>
            <span>${esc(i18n.LANG_NAMES[l])}</span>
            ${l === cur ? icon('check') : ''}
          </a>`
      ).join('')}
    </div>
  </div>`;
}

function nav(active) {
  const links = [
    ['/', i18n.t('nav.home')],
    ['/catalog', i18n.t('nav.catalog')],
    ['/catalog?featured=1', i18n.t('nav.new')],
    ['/about', i18n.t('nav.about')],
    ['/contacts', i18n.t('nav.contacts')],
  ];
  return links
    .map(([href, label]) => {
      const isActive = active === href || (href !== '/' && active && String(active).startsWith(href) && !href.includes('?')) || (href === '/catalog' && String(active || '').startsWith('/catalog/'));
      return `<a href="${esc(i18n.url(href))}" class="${isActive ? 'active' : ''}">${esc(label)}</a>`;
    })
    .join('');
}

function trField(settings, field) {
  const lang = i18n.getLang();
  if (lang !== 'uk' && settings.translations && settings.translations[lang] && settings.translations[lang][field]) {
    return settings.translations[lang][field];
  }
  return settings[field] || '';
}

function accountArea() {
  const u = CURRENT_USER;
  if (u) {
    const name = firstName(u);
    return `<div class="account-menu">
      <button type="button" class="account-toggle" aria-haspopup="true" aria-expanded="false">
        <span class="account-avatar">${esc((name || 'U').charAt(0).toUpperCase())}</span>
        <span class="account-name">${esc(name)}</span>
        ${icon('chevron', 'chev')}
      </button>
      <div class="account-drop">
        <a href="${esc(i18n.url('/account'))}">${icon('user')} <span>${esc(i18n.t('account.title'))}</span></a>
        <a href="${esc(i18n.url('/account/logout'))}">${icon('logout')} <span>${esc(i18n.t('account.logout'))}</span></a>
      </div>
    </div>`;
  }
  return `<div class="account-auth-btns">
    <a class="account-login" href="${esc(i18n.url('/account/login'))}">${icon('user')} <span>${esc(i18n.t('account.login'))}</span></a>
    <a class="btn btn-sm account-register" href="${esc(i18n.url('/account/register'))}"><span>${esc(i18n.t('account.register'))}</span></a>
  </div>`;
}

function header(settings, categories, active) {
  return `
  <div class="announce">
    <div class="marq">
      ${Array(4).fill(`<span>${esc(trField(settings, 'announcement'))}</span>`).join('')}
    </div>
  </div>
  <header class="site-header" id="siteHeader">
    <div class="container header-inner">
      <button class="icon-btn burger" id="burger" aria-label="${esc(i18n.t('common.menu'))}">${icon('menu')}</button>
      <a href="${esc(i18n.url('/'))}" class="brand brand-logo" aria-label="${esc(settings.siteName)}">
        <img src="/logo.png" alt="${esc(settings.siteName)}" width="165" height="46">
      </a>
      <nav class="main-nav">${nav(active)}</nav>
      <div class="header-actions">
        ${langSwitch()}
        <a class="icon-btn search-btn" href="${esc(i18n.url('/catalog'))}" aria-label="${esc(i18n.t('common.search'))}">${icon('search')}</a>
        <button class="icon-btn" id="favBtn" aria-label="${esc(i18n.t('common.favorites'))}">${icon('heart')}</button>
        ${accountArea()}
        <button class="icon-btn" id="cartBtn" aria-label="${esc(i18n.t('common.cart'))}">
          ${icon('cart')}
          <span class="cart-count" id="cartCount" data-empty="1">0</span>
        </button>
      </div>
    </div>
  </header>
  <div class="mobile-nav" id="mobileNav">
    <div class="mobile-nav-head">
      <a href="${esc(i18n.url('/'))}" class="brand brand-logo" aria-label="${esc(settings.siteName)}"><img src="/logo.png" alt="${esc(settings.siteName)}"></a>
      <button class="icon-btn" id="mobileClose">${icon('x')}</button>
    </div>
    <div class="mobile-nav-account">${accountArea()}</div>
    <div style="margin-bottom:18px">${langSwitch()}</div>
    <nav class="m-nav">${nav(active)}</nav>
    <div class="mobile-nav-cats">
      <h4 class="m-title">${esc(i18n.t('catalog.categories'))}</h4>
      ${categories
        .slice(0, 8)
        .map((c) => `<a class="m-cat" href="${esc(i18n.url('/catalog/' + (c.slug || encodeURIComponent(c.name))))}">${esc(i18n.categoryName(c.name))}</a>`)
        .join('')}
    </div>
  </div>`;
}

function footer(settings, categories) {
  const cats = categories.slice(0, 7);
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-about">
          <a href="${esc(i18n.url('/'))}" class="brand brand-logo" aria-label="${esc(settings.siteName)}">
            <img src="/logo.png" alt="${esc(settings.siteName)}">
          </a>
          <p>${esc(trField(settings, 'heroSubtitle'))}</p>
          <div class="socials">
            <a href="${esc(settings.instagram || '#')}" aria-label="Instagram" target="_blank" rel="noopener">${icon('instagram')}</a>
            <a href="${esc(settings.telegram || '#')}" aria-label="Telegram" target="_blank" rel="noopener">${icon('send')}</a>
            <a href="tel:${esc((settings.phone || '').replace(/[^+\d]/g, ''))}" aria-label="${esc(i18n.t('contacts.phone'))}">${icon('phone')}</a>
          </div>
        </div>
        <div>
          <h4>${esc(i18n.t('footer.catalog'))}</h4>
          <ul class="footer-links">
            ${cats.map((c) => `<li><a href="${esc(i18n.url('/catalog/' + (c.slug || encodeURIComponent(c.name))))}">${esc(i18n.categoryName(c.name))}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h4>${esc(i18n.t('footer.info'))}</h4>
          <ul class="footer-links">
            <li><a href="${esc(i18n.url('/about'))}">${esc(i18n.t('footer.aboutShop'))}</a></li>
            <li><a href="${esc(i18n.url('/contacts'))}">${esc(i18n.t('footer.delivery'))}</a></li>
            <li><a href="${esc(i18n.url('/contacts'))}">${esc(i18n.t('footer.exchange'))}</a></li>
            <li><a href="${esc(i18n.url('/contacts'))}">${esc(i18n.t('footer.contacts'))}</a></li>
            <li><a href="${esc(i18n.url('/admin'))}">${esc(i18n.t('footer.admin'))}</a></li>
          </ul>
        </div>
        <div>
          <h4>${esc(i18n.t('footer.contacts'))}</h4>
          <div class="footer-contact">
            <div>${icon('phone')}<span>${esc(settings.phone || '')}</span></div>
            <div>${icon('mail')}<span>${esc(settings.email || '')}</span></div>
            <div>${icon('pin')}<span>${esc(settings.address || '')}</span></div>
            <div>${icon('clock')}<span>${esc(i18n.t('footer.hours'))}</span></div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(settings.siteName)}. ${esc(i18n.t('footer.rights'))}</span>
        <div class="pay-icons">
          <span>VISA</span><span>Mastercard</span><span>Нова пошта</span><span>Післяплата</span>
        </div>
      </div>
    </div>
  </footer>`;
}

function cartDrawer(settings) {
  return `
  <div class="overlay" id="overlay"></div>
  <aside class="fav-drawer" id="favDrawer" aria-label="${esc(i18n.t('common.favorites'))}">
    <div class="drawer-head">
      <h3>${esc(i18n.t('common.favorites'))}</h3>
      <button class="icon-btn" id="closeFav" aria-label="${esc(i18n.t('common.close'))}">${icon('x')}</button>
    </div>
    <div class="drawer-body" id="favItems"></div>
  </aside>
  <aside class="drawer" id="cartDrawer" aria-label="${esc(i18n.t('common.cart'))}">
    <div class="drawer-head">
      <h3>${esc(i18n.t('cart.title'))}</h3>
      <button class="icon-btn" id="closeCart" aria-label="${esc(i18n.t('common.close'))}">${icon('x')}</button>
    </div>
    <div class="drawer-body" id="cartItems"></div>
    <div class="drawer-foot" id="cartFoot">
      <div class="free-ship-bar" id="freeShip"></div>
      <div class="summary-row"><span>${esc(i18n.t('cart.subtotal'))}</span><b id="cartSubtotal">0 ₴</b></div>
      <div class="summary-row muted small">${esc(i18n.t('cart.shippingNote'))}</div>
      <a href="${esc(i18n.url('/checkout'))}" class="btn btn-block" style="margin-top:14px">${esc(i18n.t('cart.checkout'))} ${icon('arrow')}</a>
      <a href="${esc(i18n.url('/catalog'))}" class="btn btn-ghost btn-block" style="margin-top:10px" id="continueShopping">${esc(i18n.t('cart.continue'))}</a>
    </div>
  </aside>`;
}

function head(title, description, opts) {
  const o = opts || {};
  const lang = i18n.getLang();
  const pathForSeo = o.path || i18n.getPath();
  const canon = i18n.canonical(pathForSeo);
  const alts = i18n.alternates(pathForSeo);
  const ogImage = o.ogImage
    ? (isExternal(o.ogImage) ? o.ogImage : i18n.abs(rawImage(o.ogImage)))
    : i18n.abs('/logo.png');
  const localeMap = { uk: 'uk_UA', ru: 'ru_RU', en: 'en_US' };
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description || '')}">
  <link rel="canonical" href="${esc(canon)}">
  <link rel="alternate" hreflang="uk" href="${esc(i18n.abs(alts.uk))}">
  <link rel="alternate" hreflang="ru" href="${esc(i18n.abs(alts.ru))}">
  <link rel="alternate" hreflang="en" href="${esc(i18n.abs(alts.en))}">
  <link rel="alternate" hreflang="x-default" href="${esc(i18n.abs(alts.uk))}">
  <meta property="og:type" content="${o.ogType || 'website'}">
  <meta property="og:site_name" content="${esc(o.siteName || 'ONIKA')}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description || '')}">
  <meta property="og:url" content="${esc(canon)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:locale" content="${localeMap[lang] || 'uk_UA'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description || '')}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  <link rel="stylesheet" href="${asset('/css/styles.css')}">
  ${o.jsonLd || ''}`;
}

function layout(opts) {
  const { title, description, settings, categories, active, body, bodyClass, bare } = opts;
  const fullTitle = title ? `${title} — ${settings.siteName}` : `${settings.siteName} — ${i18n.t('home.eyebrow')}`;
  const lang = i18n.getLang();
  if (bare) {
    return `<!doctype html><html lang="${lang}"><head>${head(fullTitle, description, opts)}</head><body class="${bodyClass || ''}">${body}${scripts(settings, opts)}</body></html>`;
  }
  return `<!doctype html>
<html lang="${lang}">
<head>${head(fullTitle, description, opts)}</head>
<body class="${bodyClass || ''}">
  ${header(settings, categories, active)}
  <main>${body}</main>
  ${footer(settings, categories)}
  ${cartDrawer(settings)}
  <div class="toast-wrap" id="toasts"></div>
  ${scripts(settings, opts)}
</body>
</html>`;
}

function scripts(settings, opts) {
  const cfg = {
    currency: (settings && settings.currency) || '₴',
    freeShippingFrom: (settings && settings.freeShippingFrom) || 0,
    lang: i18n.getLang(),
    langPrefix: i18n.getLang() === 'uk' ? '' : '/' + i18n.getLang(),
  };
  const t = JSON.stringify(i18n.clientDict()).replace(/</g, '\\u003c');
  const pageType = (opts && opts.pageType) || '';
  return `<script>window.__CUR='${esc(cfg.currency)}';window.__FREE=${Number(cfg.freeShippingFrom) || 0};window.__LANG='${cfg.lang}';window.__PREFIX='${cfg.langPrefix}';window.__PAGE='${pageType}';window.__T=${t};</script><script src="${asset('/js/app.js')}" defer></script>`;
}

function productCard(p, settings) {
  const src0 = p.images && p.images[0];
  const src1 = p.images && p.images[1];
  const outOfStock = p.inStock === false;
  const name = i18n.productName(p);
  const brand = p.brand || i18n.categoryName(p.category);
  const badgeNew = p.featured && !p.oldPrice ? `<span class="badge new">${esc(i18n.t('common.badgeNew'))}</span>` : '';
  const badgeSale = p.oldPrice && p.oldPrice > p.price ? `<span class="badge sale">${esc(i18n.t('common.badgeSale'))}</span>` : '';
  const badgeOut = outOfStock ? `<span class="badge out">${esc(i18n.t('common.badgeOut'))}</span>` : '';
  const href = i18n.url('/product/' + encodeURIComponent(p.slug || p.id));
  return `
  <article class="p-card reveal${outOfStock ? ' out' : ''}" data-id="${esc(p.id)}" data-cat="${esc(p.category)}">
    <div class="p-media">
      <a href="${esc(href)}" aria-label="${esc(name)}">
        <img class="main" src="${img(src0, 600)}" srcset="${imgSet(src0, [300, 450, 600, 900])}" sizes="(max-width:760px) 45vw, (max-width:1080px) 30vw, 300px" alt="${esc(name)}" loading="lazy" width="600" height="800">
        ${src1 ? `<img class="alt" src="${img(src1, 600)}" alt="" loading="lazy">` : ''}
      </a>
      <div class="p-badges">${badgeOut}${badgeSale}${badgeNew}</div>
      <button class="p-fav" data-fav="${esc(p.id)}" aria-label="${esc(i18n.t('common.fav'))}">${icon('heart')}</button>
      <div class="p-quick">
        <button class="btn btn-sm" data-add="${esc(p.id)}"
          data-name="${esc(name)}" data-price="${p.price}" data-img="${esc(img(src0, 600))}"
          data-brand="${esc(p.brand || '')}" ${outOfStock ? 'disabled' : ''}>
          ${outOfStock ? esc(i18n.t('common.notAvailable')) : esc(i18n.t('common.toCart')) + ' ' + icon('plus')}
        </button>
      </div>
    </div>
    <div class="p-body">
      <span class="p-brand">${esc(brand)}</span>
      <h3 class="p-name"><a href="${esc(href)}">${esc(name)}</a></h3>
      <div class="p-price">
        <b>${money(p.price, settings.currency)}</b>
        ${p.oldPrice && p.oldPrice > p.price ? `<s>${money(p.oldPrice, settings.currency)}</s>` : ''}
      </div>
    </div>
  </article>`;
}

function pagination(page, pages, baseQuery, basePath) {
  if (pages <= 1) return '';
  const prefix = basePath || '?';
  const mk = (n, label, cls) => {
    const q = new URLSearchParams(baseQuery || {});
    q.set('page', n);
    const s = q.toString();
    const href = prefix === '?' ? '?' + s : prefix + (s ? '?' + s : '');
    return `<a class="${cls || ''}" href="${href}">${label}</a>`;
  };
  let html = '';
  if (page > 1) html += mk(page - 1, icon('arrowLeft'), '');
  else html += `<span class="disabled">${icon('arrowLeft')}</span>`;
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) html += mk(1, '1');
  if (start > 2) html += `<span class="disabled">…</span>`;
  for (let i = start; i <= end; i++) {
    html += i === page ? `<span class="current">${i}</span>` : mk(i, i);
  }
  if (end < pages - 1) html += `<span class="disabled">…</span>`;
  if (end < pages) html += mk(pages, pages);
  if (page < pages) html += mk(page + 1, icon('arrow'));
  else html += `<span class="disabled">${icon('arrow')}</span>`;
  return `<nav class="pagination">${html}</nav>`;
}

module.exports = {
  ICONS,
  icon,
  esc,
  money,
  img,
  imgSet,
  rawImage,
  isExternal,
  header,
  footer,
  cartDrawer,
  layout,
  head,
  productCard,
  pagination,
  trField,
  langSwitch,
  asset,
  setUser,
  getUser,
};
