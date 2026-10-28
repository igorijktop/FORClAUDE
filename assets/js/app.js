/* ONIKA storefront — vanilla JS, no dependencies. */
(function () {
  'use strict';

  var C = window.ONIKA || {};
  C.urls = C.urls || {};
  var DICT = C.t || {};
  var CART_KEY = 'onika_cart_v2';
  var FAV_KEY = 'onika_fav_v2';
  var RECENT_KEY = 'onika_recent_v1';
  var THEME_KEY = 'onika_theme';
  var NBSP = ' ';
  var mqMobile = window.matchMedia('(max-width: 899px)');

  /* ------------------------------------------------------------ helpers */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function T(key, vars) {
    var v = DICT[key];
    if (v === undefined) return key;
    if (Array.isArray(v)) v = v[0];
    if (vars) for (var k in vars) v = String(v).split('{' + k + '}').join(vars[k]);
    return v;
  }
  /* same output as the PHP money() helper: "1 234,50 ₴" with non-breaking spaces */
  function money(n) {
    n = Number(n) || 0;
    var dec = Math.abs(n - Math.round(n)) > 0.004;
    var s = (dec ? n.toFixed(2) : String(Math.round(n))).replace('.', ',');
    var parts = s.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return parts.join(',') + NBSP + (C.currency || '₴');
  }
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* private mode, quota, broken JSON */ }
    return null;
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { Accept: 'application/json' };
    var init = { method: opts.method || 'GET', headers: headers, credentials: 'same-origin' };
    if (opts.body) {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = C.csrf || '';
      init.body = JSON.stringify(opts.body);
    }
    return fetch((C.urls.api || '') + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j || {} }; });
    });
  }
  /* toast text for a failed POST */
  function failText(r, fallback) {
    if (r.status === 403) return T('js.csrf');
    if (r.status === 429) return T('js.tooMany');
    if (r.status >= 500) return T('js.serverError');
    return (r.body && r.body.error) || fallback;
  }
  function debounce(fn, ms) {
    var t;
    var d = function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
    d.cancel = function () { clearTimeout(t); };
    return d;
  }
  function focusEl(el) { if (el && el.focus) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables(box) {
    return $$(FOCUSABLE, box).filter(function (n) { return !n.closest('[inert]') && (n.offsetWidth || n.offsetHeight || n.getClientRects().length); });
  }
  /* keep Tab / Shift+Tab inside an open dialog */
  function trapTab(e, box) {
    var f = focusables(box);
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || !box.contains(a))) { e.preventDefault(); focusEl(last); }
    else if (!e.shiftKey && (a === last || !box.contains(a))) { e.preventDefault(); focusEl(first); }
  }
  function onMq(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }

  /* body scroll lock without the page jumping sideways when the scrollbar disappears */
  var locks = 0;
  function lockScroll(on) {
    var b = document.body;
    if (on) {
      if (locks++) return;
      var sw = window.innerWidth - document.documentElement.clientWidth;
      if (sw > 0) b.style.paddingRight = (parseFloat(getComputedStyle(b).paddingRight) || 0) + sw + 'px';
      b.style.overflow = 'hidden';
    } else {
      if (!locks) return;
      if (--locks) return;
      b.style.overflow = '';
      b.style.paddingRight = '';
    }
  }

  /* -------------------------------------------------------------- toasts */
  function toast(msg, type, link) {
    var wrap = $('#toasts');
    if (!wrap) return;
    type = type || 'info';
    var sig = type + '|' + msg;
    // the same message twice in a row (e.g. "+" pressed at the stock limit) → one toast, timer restarted
    $$('.toast', wrap).forEach(function (t) { if (t.getAttribute('data-sig') === sig) { clearTimeout(t._t); t.remove(); } });
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('data-sig', sig);
    var ic = type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info';
    el.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>' + (link ? '<a href="' + esc(link.href) + '">' + esc(link.label) + '</a>' : '');
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    function hide() { el.classList.add('out'); el._t = setTimeout(function () { el.remove(); }, 320); }
    function arm(ms) { clearTimeout(el._t); el._t = setTimeout(hide, ms); }
    el.addEventListener('mouseenter', function () { clearTimeout(el._t); el.classList.remove('out'); });
    el.addEventListener('mouseleave', function () { arm(1800); });
    el.addEventListener('click', function (e) { if (!e.target.closest('a')) { clearTimeout(el._t); hide(); } });
    arm(type === 'error' ? 5200 : 3600);
  }

  /* ---------------------------------------------------------- theme toggle */
  var themeMq = window.matchMedia('(prefers-color-scheme: dark)');
  function savedTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function applyTheme(dark) {
    var root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    var b = $('#themeToggle'); if (b) b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    var meta = $('meta[name=theme-color]');
    if (meta) {
      if (!meta.hasAttribute('data-light')) meta.setAttribute('data-light', meta.getAttribute('content') || '');
      var bg = dark ? getComputedStyle(root).getPropertyValue('--bg').trim() : '';
      meta.setAttribute('content', bg && bg.indexOf('(') === -1 ? bg : (dark ? '#1a0510' : meta.getAttribute('data-light')));
    }
  }
  function initTheme() {
    var s = savedTheme();
    applyTheme(s ? s === 'dark' : document.documentElement.getAttribute('data-theme') === 'dark');
    // follow the OS setting until the visitor picks a theme explicitly
    onMq(themeMq, function (e) { if (!savedTheme()) applyTheme(e.matches); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    applyTheme(dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
  });

  /* ---------------------------------------------------------- header + menus */
  (function header() {
    var h = $('#siteHeader');
    function onScroll() { if (h) h.classList.toggle('scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  function menuItems(box) { return $$('.lang-menu a, .account-drop a, .account-drop button', box); }
  function closeMenus(except, refocus) {
    $$('.lang-switch.open, .account-menu.open').forEach(function (m) {
      if (m === except) return;
      m.classList.remove('open');
      var b = m.querySelector('.lang-toggle, .account-toggle');
      if (b) { b.setAttribute('aria-expanded', 'false'); if (refocus && m.contains(document.activeElement)) focusEl(b); }
    });
  }
  function openMenu(box, focusFirst) {
    closeMenus(box);
    var menu = box.querySelector('.lang-menu, .account-drop');
    // opened from the keyboard: show it at once — while it fades in (visibility is part of the
    // CSS transition) its items cannot take focus yet
    if (focusFirst && menu) menu.style.transition = 'none';
    box.classList.add('open');
    var b = box.querySelector('.lang-toggle, .account-toggle'); if (b) b.setAttribute('aria-expanded', 'true');
    if (focusFirst) {
      if (menu) { void menu.offsetWidth; }
      var items = menuItems(box), cur = box.querySelector('.lang-opt.on');
      var el = focusFirst === 'last' ? items[items.length - 1] : (cur || items[0]);
      focusEl(el);
      if (menu) menu.style.transition = '';
      var t0 = Date.now();
      (function retry() {
        if (!el || !box.classList.contains('open') || document.activeElement === el || Date.now() - t0 > 600) return;
        focusEl(el);
        requestAnimationFrame(retry);
      })();
    }
  }
  /* language links follow AJAX catalog navigation (the server rendered them for the first URL) */
  var initialPath = location.pathname;
  function langHref(l) {
    var base = C.base || '', pre = C.prefix || '', p = location.pathname;
    if (base && p.indexOf(base) === 0) p = p.slice(base.length);
    if (pre && (p === pre || p.indexOf(pre + '/') === 0)) p = p.slice(pre.length);
    if (!p || p === '/') p = '';
    var full = (l === 'uk' ? '' : '/' + l) + p;
    return base + (full || '/');
  }
  document.addEventListener('click', function (e) {
    var tog = e.target.closest('.lang-toggle, .account-toggle');
    if (tog) {
      var box = tog.parentElement;
      if (box.classList.contains('open')) closeMenus(null); else openMenu(box, e.detail === 0 ? true : false);
      return;
    }
    var opt = e.target.closest('.lang-opt');
    if (opt) {
      // keep the current page, active filters / search when switching language
      var href = opt.getAttribute('href');
      var lang = opt.getAttribute('data-lang');
      if (href && lang && location.pathname !== initialPath) href = langHref(lang);
      if (href && href.indexOf('?') === -1 && (location.search || href !== opt.getAttribute('href'))) {
        e.preventDefault();
        location.href = href + location.search + location.hash;
      }
      return;
    }
    if (!e.target.closest('.lang-switch, .account-menu')) closeMenus();
  });
  document.addEventListener('keydown', function (e) {
    var box = e.target.closest && e.target.closest('.lang-switch, .account-menu');
    if (!box) return;
    var onToggle = !!e.target.closest('.lang-toggle, .account-toggle');
    var items = menuItems(box), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (onToggle || !box.classList.contains('open')) { openMenu(box, e.key === 'ArrowUp' ? 'last' : true); return; }
      focusEl(items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]);
    } else if ((e.key === 'Home' || e.key === 'End') && !onToggle && items.length) {
      e.preventDefault(); focusEl(items[e.key === 'Home' ? 0 : items.length - 1]);
    }
  });
  /* a menu or the search popup closes when keyboard focus leaves it */
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    closeMenus(t.closest('.lang-switch, .account-menu'));
    if (hs && !hs.contains(t) && !t.closest('#searchToggle')) closeSearch();
  });

  /* ------------------------------------------------------------- overlays */
  var overlay = $('#overlay');
  var panelReturn = null;
  var TRIGGERS = { cartDrawer: '#cartBtn', favDrawer: '#favBtn', mobileNav: '#burger', filters: '#filterToggle' };
  function panels() { return $$('.drawer, .mnav, #filters'); }
  /* closed off-canvas panels must not be reachable with Tab or by screen readers */
  function syncPanel(p) {
    var open = p.classList.contains('on');
    var staticSidebar = p.id === 'filters' && !mqMobile.matches;
    if (open || staticSidebar) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    if (staticSidebar) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', open ? 'false' : 'true');
    var sel = TRIGGERS[p.id];
    if (sel) $$(sel).forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (p.id) b.setAttribute('aria-controls', p.id); });
  }
  function openPanels() { return $$('.drawer.on, .mnav.on, .filters.on'); }
  function openPanel(el) {
    if (!el) return;
    var active = document.activeElement;
    var keep = openPanels().length ? panelReturn : (active && active !== document.body ? active : null);
    closePanels(true);
    panelReturn = keep;
    el.classList.add('on');
    syncPanel(el);
    var ov = el.id === 'filters' ? $('#filtersOverlay') : overlay;
    if (ov) ov.classList.add('on');
    lockScroll(true);
    focusEl(el.querySelector('.drawer-head .icon-btn, .sheet-head .icon-btn, .mnav-head .icon-btn') || focusables(el)[0]);
  }
  function closePanels(noFocus) {
    var was = openPanels();
    var hadFocus = was.some(function (p) { return p.contains(document.activeElement); }) || document.activeElement === document.body;
    was.forEach(function (p) { p.classList.remove('on'); syncPanel(p); });
    if (overlay) overlay.classList.remove('on');
    var fo = $('#filtersOverlay'); if (fo) fo.classList.remove('on');
    if (!was.length) return;
    lockScroll(false);
    // the opener may have been re-rendered meanwhile (AJAX catalog) → find it again by id
    var back = panelReturn && !document.contains(panelReturn) && panelReturn.id ? document.getElementById(panelReturn.id) : panelReturn;
    if (!noFocus && hadFocus && back && document.contains(back)) focusEl(back);
    if (!noFocus) panelReturn = null;
  }
  function searchOpen() { return !!hs && (hs.classList.contains('open') || hs.classList.contains('mobile-open')); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (e.isComposing) return;
      // close only the top-most layer
      var lb = $('#lightbox');
      if (lb && lb.classList.contains('on')) { closeLightbox(); return; }
      if ($('.lang-switch.open, .account-menu.open')) { closeMenus(null, true); return; }
      if (searchOpen()) { var inS = hs.contains(document.activeElement); closeSearch(); if (inS && hsInput) focusEl(hsInput); return; }
      closePanels();
      return;
    }
    if (e.key === 'Tab') {
      var lbx = $('#lightbox.on');
      var box = lbx || openPanels()[0];
      if (box) trapTab(e, box);
    }
  });

  /* ================================================================= CART */
  var cart = [];
  function loadCart() {
    var c = store(CART_KEY);
    var seen = {};
    cart = Array.isArray(c) ? c.filter(function (i) {
      if (!i || !i.id || !(i.qty > 0)) return false;
      i.id = String(i.id); i.size = i.size || ''; i.qty = Math.min(99, Math.floor(i.qty)) || 1;
      var k = cartKey(i);
      if (seen[k]) { seen[k].qty = Math.min(99, seen[k].qty + i.qty); return false; }
      seen[k] = i;
      return true;
    }) : [];
  }
  function saveCart() {
    store(CART_KEY, cart);
    renderCartUI();
  }
  function cartKey(it) { return it.id + '|' + (it.size || ''); }
  function cartCount() { return cart.reduce(function (s, i) { return s + (i.qty || 0); }, 0); }
  function cartTotal() {
    return cart.reduce(function (s, i) { return s + (i.inStock === false ? 0 : i.price * i.qty); }, 0);
  }
  function findItem(id, size) {
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id && (cart[i].size || '') === (size || '')) return cart[i];
    return null;
  }
  /* Stock is kept per product, so sizes of one product share it.
     availFor() can be 0 or less when the other sizes already take all pieces. */
  function availFor(id, size, stock) {
    var s = typeof stock === 'number' ? stock : 99;
    var others = 0;
    cart.forEach(function (i) { if (i.id === id && (i.size || '') !== (size || '')) others += i.qty; });
    return Math.min(99, s - others);
  }
  function limitFor(id, size, stock) { return Math.max(1, availFor(id, size, stock)); }
  function bumpBadge() { var badge = $('#cartCount'); if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); } }
  /* returns false when nothing could be added */
  function addToCart(p, size, qty) {
    var id = String(p.id);
    var f = findItem(id, size);
    var max = availFor(id, size, p.stock);
    if (p.inStock === false || max <= 0 || (f && f.qty >= max)) {
      toast(max > 0 ? T('product.maxQty', { n: max }) : T('js.noMoreStock'), 'info');
      if (f && max > 0 && f.qty > max) { f.qty = max; saveCart(); }
      return false;
    }
    qty = Math.max(1, qty || 1);
    var want = (f ? f.qty : 0) + qty;
    if (want > max) toast(T('product.maxQty', { n: max }), 'info');
    want = Math.min(max, want);
    if (f) { f.qty = want; f.stock = p.stock; }
    else cart.push({ id: id, size: size || '', qty: want, stock: p.stock, name: p.name, price: Number(p.price), oldPrice: p.oldPrice || null, image: p.image, url: p.url, brand: p.brand || '', inStock: true });
    saveCart();
    bumpBadge();
    return true;
  }

  var lastSync = 0;
  function syncCart(force, quiet) {
    if (!cart.length) return Promise.resolve();
    if (!force && Date.now() - lastSync < 20000) return Promise.resolve();
    lastSync = Date.now();
    var ids = cart.map(function (i) { return i.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return api('/products?ids=' + encodeURIComponent(ids.join(','))).then(function (r) {
      if (!r.ok || !r.body || !Array.isArray(r.body.items)) return;
      var by = {};
      r.body.items.forEach(function (p) { by[String(p.id)] = p; });
      var removed = 0, clamped = 0;
      cart = cart.filter(function (it) { if (by[it.id]) return true; removed++; return false; });
      cart.forEach(function (it) {
        var p = by[it.id];
        it.name = p.name; it.price = Number(p.price); it.oldPrice = p.oldPrice; it.image = p.image; it.url = p.url; it.inStock = p.inStock; it.sizes = p.sizes; it.stock = p.stock; it.brand = p.brand || '';
        if (p.sizes && p.sizes.length && p.sizes.indexOf(it.size) === -1) it.inStock = false;
      });
      // sizes share the product stock: earlier lines keep their pieces, later ones get what is left
      var kept = [];
      cart.forEach(function (it) {
        if (it.inStock === false) { kept.push(it); return; }
        var used = 0;
        kept.forEach(function (k) { if (k.id === it.id && k.inStock !== false) used += k.qty; });
        var lim = Math.min(99, (typeof it.stock === 'number' ? it.stock : 99) - used);
        if (lim <= 0) { clamped++; return; }
        if (it.qty > lim) { it.qty = lim; clamped++; }
        kept.push(it);
      });
      cart = kept;
      store(CART_KEY, cart);
      renderCartUI();
      if (removed) toast(T('js.itemsRemoved'), 'info');
      else if (clamped && !quiet) toast(T('js.stockLimit'), 'info');
    }).catch(function () { lastSync = 0; /* offline: keep local data, retry next time */ });
  }

  function itemHtml(it) {
    var line = it.price * it.qty;
    var k = 'data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '"';
    var lim = limitFor(it.id, it.size, it.stock);
    return '<div class="cart-item" data-line="' + esc(cartKey(it)) + '">' +
      '<a href="' + esc(it.url || '#') + '" tabindex="-1" aria-hidden="true"><img class="thumb" src="' + esc(it.image || C.urls.placeholder) + '" alt="" loading="lazy" width="76" height="96"></a>' +
      '<div><div class="ci-name"><a href="' + esc(it.url || '#') + '">' + esc(it.name) + '</a></div>' +
      '<div class="ci-meta">' + (it.brand ? esc(it.brand) : '') + (it.size ? (it.brand ? ' · ' : '') + esc(T('product.size')) + ': ' + esc(it.size) : '') + '</div>' +
      (it.inStock === false ? '<div class="ci-note">' + esc(T('js.outOfStockItem')) + '</div>' :
        '<div class="qty"><button type="button" data-qty="dec" ' + k + (it.qty <= 1 ? ' disabled' : '') + ' aria-label="−">' + icon('minus') + '</button>' +
        '<input type="number" value="' + it.qty + '" min="1" max="' + lim + '" inputmode="numeric" data-qty-input ' + k + ' aria-label="' + esc(T('product.qty')) + '">' +
        '<button type="button" data-qty="inc" ' + k + (it.qty >= lim ? ' disabled' : '') + ' aria-label="+">' + icon('plus') + '</button></div>') +
      '</div><div class="ci-side"><div class="ci-price">' + (it.inStock === false ? '' : money(line) + (it.oldPrice && it.oldPrice > it.price ? '<s>' + money(it.oldPrice * it.qty) + '</s>' : '')) + '</div>' +
      '<button type="button" class="ci-remove" data-remove ' + k + ' aria-label="' + esc(T('common.remove')) + ': ' + esc(it.name) + '">' + icon('trash') + '</button></div></div>';
  }
  function freeShipHtml(sub) {
    var F = C.free || 0;
    if (!F) return '';
    if (sub >= F) return '<p class="ok">✓ ' + esc(T('cart.freeNow')) + '</p><div class="track"><div class="fill" style="width:100%"></div></div>';
    return '<p>' + esc(T('cart.freeMore', { amount: money(F - sub) })) + '</p><div class="track"><div class="fill" style="width:' + Math.min(100, Math.round(sub / F * 100)) + '%"></div></div>';
  }
  function emptyCartHtml() {
    return '<div class="empty-state">' + icon('bag') + '<h3>' + esc(T('cart.empty')) + '</h3><p>' + esc(T('cart.emptyText')) + '</p>' +
      '<a href="' + esc(C.urls.catalog) + '" class="btn">' + esc(T('cart.toCatalog')) + '</a></div>';
  }
  /* re-rendering replaces the buttons, so remember which control had focus and put it back */
  function focusMemo() {
    var a = document.activeElement;
    if (!a || !a.closest) return null;
    var box = a.closest('#cartItems, #cartPageContent');
    if (!box) return null;
    var kind = a.hasAttribute('data-qty') ? '[data-qty="' + a.getAttribute('data-qty') + '"]' : a.hasAttribute('data-qty-input') ? '[data-qty-input]' : a.hasAttribute('data-remove') ? '[data-remove]' : null;
    var line = a.closest('[data-line]');
    var lines = $$('[data-line]', box);
    return { box: box.id, kind: kind, line: line && line.getAttribute('data-line'), idx: line ? lines.indexOf(line) : 0 };
  }
  function focusRestore(m) {
    if (!m) return;
    var box = document.getElementById(m.box);
    if (!box) return;
    var line = null;
    $$('[data-line]', box).forEach(function (l) { if (l.getAttribute('data-line') === m.line) line = l; });
    var el = null;
    if (line) {
      el = m.kind && line.querySelector(m.kind);
      if (!el || el.disabled) el = line.querySelector('[data-qty-input]') || line.querySelector('[data-remove]');
    } else {
      var lines = $$('[data-line]', box);
      var next = lines[Math.min(m.idx, lines.length - 1)];
      el = next ? next.querySelector('[data-remove]') : (box.id === 'cartItems' ? $('#closeCart') : $('a', box));
    }
    focusEl(el);
  }
  function renderCartUI() {
    var memo = focusMemo();
    var n = cartCount();
    var badge = $('#cartCount');
    if (badge) { badge.textContent = n > 99 ? '99+' : n; badge.setAttribute('data-empty', n ? '0' : '1'); }

    var body = $('#cartItems'), foot = $('#cartFoot');
    if (body && foot) {
      var dc = $('#cartDrawerCount'); if (dc) dc.textContent = n ? '(' + n + ')' : '';
      if (!cart.length) { body.innerHTML = emptyCartHtml(); foot.hidden = true; }
      else {
        body.innerHTML = cart.map(itemHtml).join('');
        foot.hidden = false;
        var sub = cartTotal();
        var fs = $('#freeShip'); if (fs) fs.innerHTML = freeShipHtml(sub);
        var st = $('#cartSubtotal'); if (st) st.textContent = money(sub);
      }
    }
    renderCartPage();
    renderCheckoutSummary();
    focusRestore(memo);
  }
  function shippingText(sub) {
    var F = C.free || 0;
    var pickup = isPickup();
    return (pickup || (F && sub >= F)) ? T('common.free') : T('cartPage.byCarrier');
  }
  function renderCartPage() {
    var wrap = $('#cartPageContent');
    if (!wrap) return;
    if (!cart.length) { wrap.innerHTML = '<div class="card">' + emptyCartHtml() + '</div>'; return; }
    var sub = cartTotal();
    var bad = cart.some(function (i) { return i.inStock === false; });
    wrap.innerHTML = '<div class="checkout-grid" style="padding:0"><div class="card" style="padding-top:8px;padding-bottom:8px">' + cart.map(itemHtml).join('') + '</div>' +
      '<aside class="card order-summary"><h2>' + esc(T('cartPage.total')) + '</h2>' + '<div class="free-ship">' + freeShipHtml(sub) + '</div>' +
      '<div class="sum-row"><span>' + esc(T('cartPage.items', { n: cartCount() })) + '</span><b>' + money(sub) + '</b></div>' +
      '<div class="sum-row"><span>' + esc(T('cartPage.delivery')) + '</span><b>' + esc(shippingText(sub)) + '</b></div>' +
      '<div class="sum-row total"><span>' + esc(T('cartPage.toPay')) + '</span><span>' + money(sub) + '</span></div>' +
      (bad ? '<p class="ci-note">' + esc(T('js.removeUnavailable')) + '</p>' : '') +
      '<a href="' + esc(C.urls.checkout) + '" class="btn btn-lg btn-block" style="margin-top:16px' + (bad ? ';pointer-events:none;opacity:.5" aria-disabled="true" tabindex="-1' : '') + '">' + esc(T('cart.checkout')) + ' ' + icon('arrow') + '</a>' +
      '<a href="' + esc(C.urls.catalog) + '" class="link-arrow" style="margin-top:18px;display:inline-flex">' + esc(T('cart.continue')) + '</a></aside></div>';
  }
  var submitting = false;
  function renderCheckoutSummary() {
    var wrap = $('#checkoutSummary');
    if (!wrap) return;
    var form = $('#checkoutForm');
    if (!cart.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:20px 0"><p>' + esc(T('checkout.emptyCart')) + '</p><a href="' + esc(C.urls.catalog) + '" class="btn btn-sm">' + esc(T('cart.toCatalog')) + '</a></div>';
      if (form && !submitting) $$('button[type=submit], input, textarea', form).forEach(function (el) { el.disabled = true; });
      return;
    }
    // never re-enable the submit button while an order is being sent (double orders)
    if (form && !submitting) $$('button[type=submit], input, textarea', form).forEach(function (el) { el.disabled = false; });
    var sub = cartTotal();
    wrap.innerHTML = cart.map(function (it) {
      return '<div class="os-item"><img src="' + esc(it.image || C.urls.placeholder) + '" alt="" loading="lazy" width="60" height="76"><div><div class="n">' + esc(it.name) + '</div>' +
        '<div class="small muted">' + it.qty + ' × ' + money(it.price) + (it.size ? ' · ' + esc(it.size) : '') + '</div>' +
        (it.inStock === false ? '<div class="ci-note">' + esc(T('js.outOfStockItem')) + '</div>' : '') + '</div><div class="p">' + (it.inStock === false ? '' : money(it.price * it.qty)) + '</div></div>';
    }).join('') +
      '<div class="free-ship" style="margin-top:14px">' + (isPickup() ? '' : freeShipHtml(sub)) + '</div>' +
      '<div class="sum-row"><span>' + esc(T('cartPage.delivery')) + '</span><b>' + esc(shippingText(sub)) + '</b></div>' +
      '<div class="sum-row total"><span>' + esc(T('cartPage.toPay')) + '</span><span>' + money(sub) + '</span></div>';
  }

  /* cart interactions */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var rm = t.closest('[data-remove]');
    if (rm) {
      var id = rm.dataset.id, size = rm.dataset.size || '';
      cart = cart.filter(function (i) { return !(i.id === id && (i.size || '') === size); });
      saveCart();
      return;
    }
    var q = t.closest('[data-qty]');
    if (q) {
      var it = findItem(q.dataset.id, q.dataset.size);
      if (it) {
        var lim = limitFor(it.id, it.size, it.stock);
        if (q.dataset.qty === 'inc' && it.qty >= lim) toast(T('product.maxQty', { n: lim }), 'info');
        it.qty = Math.max(1, Math.min(lim, it.qty + (q.dataset.qty === 'inc' ? 1 : -1)));
        saveCart();
      }
      return;
    }
    var off = t.closest('a[aria-disabled=true]');
    if (off) { e.preventDefault(); return; }
    var add = t.closest('[data-add]');
    if (add && !add.disabled) {
      var card = add.closest('[data-p]');
      var p = null;
      try { p = JSON.parse(card.getAttribute('data-p')); } catch (err) { /* ignore */ }
      if (p && addToCart(p, '', 1)) openCart();
      return;
    }
    if (t.closest('#cartBtn')) { var d = $('#cartDrawer'); if (d && d.classList.contains('on')) closePanels(); else openCart(); return; }
    if (t.closest('#closeCart')) { closePanels(); return; }
    if (t.closest('#favBtn')) { var f = $('#favDrawer'); if (f && f.classList.contains('on')) closePanels(); else openFav(); return; }
    if (t.closest('#closeFav')) { closePanels(); return; }
    if (t.closest('#burger')) { var mn = $('#mobileNav'); if (mn && mn.classList.contains('on')) closePanels(); else openPanel(mn); return; }
    if (t.closest('#mobileClose')) { closePanels(); return; }
    if (t.closest('#filterToggle')) { openPanel($('#filters')); return; }
    if (t.closest('#filtersClose')) { closePanels(); return; }
    if (t.closest('#overlay') || t.closest('#filtersOverlay')) { closePanels(); return; }
  });
  document.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-qty-input]');
    if (!inp) return;
    var it = findItem(inp.dataset.id, inp.dataset.size);
    if (it) {
      var lim = limitFor(it.id, it.size, it.stock), want = parseInt(inp.value, 10) || 1;
      if (want > lim) toast(T('product.maxQty', { n: lim }), 'info');
      it.qty = Math.max(1, Math.min(lim, want));
      saveCart();
    }
  });
  document.addEventListener('keydown', function (e) {
    // Enter in the quantity box applies the value right away
    if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-qty-input]')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  function openCart() {
    openPanel($('#cartDrawer'));
    syncCart(false);
  }

  /* =========================================================== FAVOURITES */
  var favs = [];
  function loadFavs() {
    var f = store(FAV_KEY);
    favs = Array.isArray(f) ? f.map(String).filter(function (v, i, a) { return v && a.indexOf(v) === i; }) : [];
  }
  function paintFavs() {
    $$('[data-fav]').forEach(function (b) {
      var on = favs.indexOf(String(b.dataset.fav)) > -1;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var c = $('#favCount');
    if (c) { c.textContent = favs.length > 99 ? '99+' : favs.length; c.setAttribute('data-empty', favs.length ? '0' : '1'); }
  }
  function toggleFav(id) {
    id = String(id);
    var i = favs.indexOf(id);
    if (i > -1) { favs.splice(i, 1); toast(T('js.removedFav'), 'info'); }
    else { favs.push(id); toast(T('js.addedFav'), 'success'); }
    store(FAV_KEY, favs);
    paintFavs();
    if ($('#favDrawer.on')) renderFav();
  }
  function favItemHtml(p) {
    var sized = p.sizes && p.sizes.length;
    return '<div class="cart-item" data-line="' + esc(p.id) + '"><a href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true"><img class="thumb" src="' + esc(p.image) + '" alt="" loading="lazy" width="76" height="96"></a>' +
      '<div><div class="ci-name"><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></div><div class="ci-meta">' + esc(p.brand || '') + '</div>' +
      (p.inStock ? (sized ? '<a class="btn btn-sm" href="' + esc(p.url) + '">' + esc(T('product.chooseSize')) + '</a>' :
        '<button type="button" class="btn btn-sm" data-fav-add="' + esc(p.id) + '">' + esc(T('common.toCart')) + '</button>') : '<div class="ci-note">' + esc(T('common.notAvailable')) + '</div>') +
      '</div><div class="ci-side"><div class="ci-price">' + money(p.price) + '</div><button type="button" class="ci-remove" data-unfav="' + esc(p.id) + '" aria-label="' + esc(T('common.remove')) + ': ' + esc(p.name) + '">' + icon('trash') + '</button></div></div>';
  }
  var favCache = {}, favSeq = 0;
  function favEmptyHtml() {
    return '<div class="empty-state">' + icon('heart') + '<h3>' + esc(T('js.favEmpty')) + '</h3><p>' + esc(T('js.favEmptyText')) + '</p><a href="' + esc(C.urls.catalog) + '" class="btn">' + esc(T('cart.toCatalog')) + '</a></div>';
  }
  function renderFav(focusIdx) {
    var wrap = $('#favItems');
    if (!wrap) return;
    var my = ++favSeq;
    if (!favs.length) { wrap.innerHTML = favEmptyHtml(); if (focusIdx !== undefined) focusEl($('#closeFav')); return; }
    if (!wrap.querySelector('.cart-item')) wrap.innerHTML = '<div class="skeleton" style="height:120px;margin:16px 0"></div>';
    var asked = favs.slice();
    api('/products?ids=' + encodeURIComponent(asked.join(','))).then(function (r) {
      if (my !== favSeq) return;   // a newer render is on its way
      if (!r.ok || !Array.isArray(r.body.items)) throw new Error('bad');
      var items = r.body.items;
      items.forEach(function (p) { favCache[p.id] = p; });
      // products that were deleted / hidden on the server drop out of the favourites (and the badge)
      if (asked.length <= 60) {
        var got = items.map(function (p) { return String(p.id); });
        var before = favs.length;
        favs = favs.filter(function (id) { return asked.indexOf(id) === -1 || got.indexOf(id) > -1; });
        if (favs.length !== before) { store(FAV_KEY, favs); paintFavs(); }
      }
      wrap.innerHTML = items.length ? items.map(favItemHtml).join('') : favEmptyHtml();
      if (focusIdx !== undefined) {
        var btns = $$('[data-unfav]', wrap);
        focusEl(btns[Math.min(focusIdx, btns.length - 1)] || $('#closeFav'));
      }
    }).catch(function () { if (my === favSeq) wrap.innerHTML = '<div class="empty-state"><p>' + esc(T('js.networkError')) + '</p></div>'; });
  }
  function openFav() { openPanel($('#favDrawer')); renderFav(); }
  document.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav); return; }
    var un = e.target.closest('[data-unfav]');
    if (un) {
      var idx = $$('[data-unfav]', $('#favItems')).indexOf(un);
      var line = un.closest('.cart-item'); if (line) line.remove();
      favs = favs.filter(function (x) { return x !== String(un.dataset.unfav); });
      store(FAV_KEY, favs); paintFavs(); renderFav(Math.max(0, idx));
      return;
    }
    var fa = e.target.closest('[data-fav-add]');
    if (fa && favCache[fa.dataset.favAdd]) { if (addToCart(favCache[fa.dataset.favAdd], '', 1)) toast(T('js.addedCart'), 'success'); }
  });

  /* ============================================================== SEARCH */
  var hs = $('#hsearch'), hsInput = $('#hsearchInput'), hsPop = $('#hsearchPop');
  var searchSel = -1, searchSeq = 0;
  function searchItems() { return hsPop ? $$('.sr-item, .sr-cat, .sr-all', hsPop) : []; }
  function setSel(i) {
    var items = searchItems();
    searchSel = i;
    items.forEach(function (el, n) { el.classList.toggle('sel', n === i); el.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    if (i > -1 && items[i]) { hsInput.setAttribute('aria-activedescendant', items[i].id); items[i].scrollIntoView({ block: 'nearest' }); }
    else if (hsInput) hsInput.removeAttribute('aria-activedescendant');
  }
  function popOpen(on) {
    if (!hs) return;
    hs.classList.toggle('open', on);
    if (hsInput) hsInput.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) setSel(-1);
  }
  function closeSearch() {
    if (!hs) return;
    popOpen(false);
    hs.classList.remove('mobile-open');
    document.body.classList.remove('search-open');
  }
  function searchHtml(j, q) {
    var items = j.items || [], cats = j.categories || [];
    if (!items.length && !cats.length) return '<div class="sr-empty" role="presentation">' + esc(T('search.nothing', { q: q })) + '</div>';
    var h = '', n = 0;
    cats.forEach(function (c) { h += '<a class="sr-cat" role="option" tabindex="-1" id="sr-opt-' + (n++) + '" href="' + esc(c.url) + '">' + icon('grid') + esc(c.name) + '<small>' + esc(c.count) + '</small></a>'; });
    items.forEach(function (p) {
      h += '<a class="sr-item" role="option" tabindex="-1" id="sr-opt-' + (n++) + '" href="' + esc(p.url) + '"><img src="' + esc(p.image) + '" alt="" width="52" height="64"><div><div class="n">' + esc(p.name) + '</div><div class="b">' + esc(p.brand || p.category) + '</div></div><div class="p">' + money(p.price) + '</div></a>';
    });
    if (j.total > items.length && j.all) h += '<a class="sr-all" role="option" tabindex="-1" id="sr-opt-' + (n++) + '" href="' + esc(j.all) + '">' + esc(T('search.all', { n: j.total })) + ' ' + icon('arrow') + '</a>';
    return h;
  }
  var doSearch = debounce(function () {
    var q = hsInput.value.trim();
    var my = ++searchSeq;
    if (q.length < 2) { hsPop.innerHTML = ''; popOpen(false); return; }
    api('/search?q=' + encodeURIComponent(q)).then(function (r) {
      // drop answers to older queries (typing fast, slow network, input cleared meanwhile)
      if (my !== searchSeq || q !== hsInput.value.trim() || !r.body || !r.body.items) return;
      hsPop.innerHTML = searchHtml(r.body, q);
      setSel(-1);
      if (hs.contains(document.activeElement) || hs.classList.contains('mobile-open')) popOpen(true);
    }).catch(function () { /* offline: the form still submits to the catalog */ });
  }, 180);
  if (hs && hsInput && hsPop) {
    hsInput.setAttribute('role', 'combobox');
    hsInput.setAttribute('aria-expanded', 'false');
    hs.classList.toggle('has-value', !!hsInput.value);
    var composing = false;
    hsInput.addEventListener('compositionstart', function () { composing = true; });
    hsInput.addEventListener('compositionend', function () { composing = false; doSearch(); });
    hsInput.addEventListener('input', function (e) {
      hs.classList.toggle('has-value', !!hsInput.value);
      if (composing || e.isComposing) return;   // IME: wait for the final text
      if (hsInput.value.trim().length < 2) { searchSeq++; doSearch.cancel(); hsPop.innerHTML = ''; popOpen(false); return; }
      doSearch();
    });
    hsInput.addEventListener('focus', function () { if (hsPop.innerHTML && hsInput.value.trim().length >= 2) popOpen(true); });
    hsInput.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;
      // 1st Esc only closes the suggestions (the browser would also wipe a search field's text)
      if ((e.key === 'Escape' || e.key === 'Esc') && hs.classList.contains('open')) { e.preventDefault(); return; }
      // combobox: Tab leaves the field and closes the list (options are reached with the arrows)
      if (e.key === 'Tab') { popOpen(false); return; }
      var items = searchItems();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        if (!hs.classList.contains('open')) { popOpen(true); return; }
        var n = items.length, d = e.key === 'ArrowDown' ? 1 : -1;
        setSel(searchSel === -1 ? (d > 0 ? 0 : n - 1) : (searchSel + d + n) % n);
      } else if (e.key === 'Enter' && searchSel > -1 && items[searchSel] && hs.classList.contains('open')) {
        e.preventDefault(); location.href = items[searchSel].href;
      } else if (e.key === 'Enter' && !hsInput.value.trim()) {
        e.preventDefault();   // nothing to search for
      }
    });
    hsPop.addEventListener('mousemove', function (e) {
      var it = e.target.closest('.sr-item, .sr-cat, .sr-all');
      if (it) { var i = searchItems().indexOf(it); if (i !== searchSel) setSel(i); }
    });
    var clr = $('#hsearchClear');
    if (clr) clr.addEventListener('click', function () {
      searchSeq++; doSearch.cancel();
      hsInput.value = ''; hsPop.innerHTML = ''; hs.classList.remove('has-value'); popOpen(false); hsInput.focus();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#hsearch') && !e.target.closest('#searchToggle')) closeSearch();
    });
    var st = $('#searchToggle');
    if (st) {
      st.setAttribute('aria-controls', 'hsearch');
      st.addEventListener('click', function () {
        if (hs.classList.contains('mobile-open')) { closeSearch(); return; }
        hs.classList.add('mobile-open'); document.body.classList.add('search-open');
        if (hsPop.innerHTML && hsInput.value.trim().length >= 2) popOpen(true);
        setTimeout(function () { hsInput.focus(); }, 30);
      });
    }
  }

  /* =========================================================== PAGE INIT */
  /* accordion */
  document.addEventListener('click', function (e) {
    var h = e.target.closest('.acc-head');
    if (!h) return;
    var item = h.parentElement;
    var open = item.classList.toggle('open');
    h.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------------------------------------------------------- product page */
  var galleryIdx = 0, galleryImgs = [], lbReturn = null;
  function setGallery(i) {
    if (!galleryImgs.length) return;
    galleryIdx = (i + galleryImgs.length) % galleryImgs.length;
    var img = $('#galleryImg');
    var src = galleryImgs[galleryIdx];
    if (img) {
      var pre = new Image();
      var show = function () {
        if (galleryImgs[galleryIdx] !== src) return;   // a newer image was picked meanwhile
        img.removeAttribute('srcset'); img.src = src; img.style.opacity = '';
      };
      pre.onload = show;
      pre.onerror = show;
      img.style.opacity = .35;
      pre.src = src;
    }
    $$('#galleryThumbs .gthumb').forEach(function (t, n) {
      t.classList.toggle('on', n === galleryIdx);
      if (n === galleryIdx) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    var on = $('#galleryThumbs .gthumb.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    var lb = $('#lightbox');
    if (lb && lb.classList.contains('on')) { var li = $('#lbImg'); li.classList.remove('zoomed'); li.src = src; }
  }
  function openLightbox() {
    var lb = $('#lightbox'); if (!lb || lb.classList.contains('on') || !galleryImgs.length) return;
    lbReturn = document.activeElement;
    lb.classList.add('on');
    var img = $('#lbImg'); img.src = galleryImgs[galleryIdx]; img.classList.remove('zoomed');
    lockScroll(true);
    focusEl($('#lbClose') || lb);
  }
  function closeLightbox() {
    var lb = $('#lightbox');
    if (!lb || !lb.classList.contains('on')) return;
    lb.classList.remove('on');
    var img = $('#lbImg'); if (img) img.classList.remove('zoomed');
    lockScroll(false);
    focusEl(lbReturn && document.contains(lbReturn) ? lbReturn : $('#galleryMain'));
    lbReturn = null;
  }
  /* horizontal swipe; vertical moves are left to page scrolling */
  function onSwipe(el, fn) {
    var sx = null, sy = 0;
    el.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } else sx = null; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { fn(dx < 0 ? 1 : -1); if (e.cancelable) e.preventDefault(); }
    });
  }
  function initProduct() {
    var dataEl = $('#productData');
    var gal = $('#gallery');
    if (!dataEl || !gal) return;
    var product;
    try { product = JSON.parse(dataEl.textContent); } catch (e) { return; }
    try { galleryImgs = JSON.parse(gal.getAttribute('data-images')) || []; } catch (e) { galleryImgs = []; }
    galleryImgs = galleryImgs.filter(Boolean);

    $$('#galleryThumbs .gthumb').forEach(function (t) {
      if (t.classList.contains('on')) t.setAttribute('aria-current', 'true');
      t.addEventListener('click', function () { setGallery(+t.dataset.index); });
    });
    var main = $('#galleryMain');
    var prev = $('#galPrev'), next = $('#galNext');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); setGallery(galleryIdx - 1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); setGallery(galleryIdx + 1); });
    var lb = $('#lightbox');
    if (main) {
      main.addEventListener('click', openLightbox);
      main.addEventListener('keydown', function (e) {
        if (lb && lb.classList.contains('on')) return;   // the lightbox handles the keys itself
        if (e.target !== main) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setGallery(galleryIdx - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setGallery(galleryIdx + 1); }
      });
      onSwipe(main, function (d) { setGallery(galleryIdx + d); });
    }
    if (lb) {
      var lc = $('#lbClose'); if (lc) lc.addEventListener('click', closeLightbox);
      lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
      var lp = $('#lbPrev'), ln = $('#lbNext');
      if (lp) lp.addEventListener('click', function () { setGallery(galleryIdx - 1); });
      if (ln) ln.addEventListener('click', function () { setGallery(galleryIdx + 1); });
      var lbImg = $('#lbImg');
      if (lbImg) lbImg.addEventListener('click', function () { this.classList.toggle('zoomed'); });
      onSwipe(lb, function (d) { if (!lbImg || !lbImg.classList.contains('zoomed')) setGallery(galleryIdx + d); });
      document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('on')) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); setGallery(galleryIdx - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setGallery(galleryIdx + 1); }
      });
    }

    // quantity
    var qty = $('#qtyInput');
    var qtyMax = Math.max(1, Math.min(99, typeof product.stock === 'number' ? product.stock : 99));
    function setQty(n) {
      if (n > qtyMax) toast(T('product.maxQty', { n: qtyMax }), 'info');
      qty.value = Math.max(1, Math.min(qtyMax, n || 1));
    }
    if (qty) {
      var qm = $('[data-qminus]'), qp = $('[data-qplus]');
      if (qm) qm.addEventListener('click', function () { setQty((parseInt(qty.value, 10) || 1) - 1); });
      if (qp) qp.addEventListener('click', function () { setQty((parseInt(qty.value, 10) || 1) + 1); });
      qty.addEventListener('change', function () { setQty(parseInt(qty.value, 10) || 1); });
    }

    function buy() {
      var size = '';
      if (product.sizes && product.sizes.length) {
        var chosen = $('input[name=size]:checked');
        if (!chosen) {
          var box = $('#sizeBox');
          if (box) { box.classList.remove('size-error'); void box.offsetWidth; box.classList.add('size-error'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          var se = $('#sizeErr'); if (se) se.hidden = false;
          focusEl($('input[name=size]'));
          toast(T('product.chooseSize'), 'error');
          return;
        }
        size = chosen.value;
      }
      if (addToCart(product, size, Math.max(1, parseInt(qty && qty.value, 10) || 1))) openCart();
    }
    $$('input[name=size]').forEach(function (r) { r.addEventListener('change', function () { var se = $('#sizeErr'); if (se) se.hidden = true; var box = $('#sizeBox'); if (box) box.classList.remove('size-error'); }); });
    var btn = $('#addToCartBtn'); if (btn) btn.addEventListener('click', buy);
    var bb = $('#buybarBtn'); if (bb) bb.addEventListener('click', buy);

    // sticky buy bar on mobile once the main button leaves the viewport
    var bar = $('#buybar'), row = $('#buyRow');
    if (bar && row && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var visible = en[0].isIntersecting;
        bar.classList.toggle('on', !visible);
        bar.setAttribute('aria-hidden', visible ? 'true' : 'false');
        if (visible) bar.setAttribute('inert', ''); else bar.removeAttribute('inert');
      }).observe(row);
    }

    // share
    var share = $('#shareBtn');
    if (share) {
      if (!navigator.share) share.hidden = true;
      share.addEventListener('click', function () { if (navigator.share) navigator.share({ title: share.dataset.title, url: share.dataset.url }).catch(function () {}); });
    }
    var copy = $('#copyBtn');
    if (copy) copy.addEventListener('click', function () {
      var url = copy.dataset.url;
      var done = function () { toast(T('product.linkCopied'), 'success'); };
      var legacy = function () {
        var ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var okCopy = false; try { okCopy = document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove();
        if (okCopy) done(); else toast(url, 'info');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, legacy);
      else legacy();
    });

    // remember for "recently viewed"
    var rec = store(RECENT_KEY); rec = Array.isArray(rec) ? rec.map(String) : [];
    rec = [String(product.id)].concat(rec.filter(function (x) { return x !== String(product.id); })).slice(0, 12);
    store(RECENT_KEY, rec);
  }

  /* recently viewed strip (home + product pages) */
  function cardHtml(p) {
    var sale = p.oldPrice && p.oldPrice > p.price;
    var data = esc(JSON.stringify({ id: p.id, name: p.name, price: p.price, oldPrice: p.oldPrice, image: p.image, url: p.url, brand: p.brand, inStock: p.inStock, stock: p.stock, sizes: p.sizes }));
    var sized = p.sizes && p.sizes.length;
    return '<article class="pcard' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '" data-p="' + data + '"><div class="pcard-media"><a href="' + esc(p.url) + '" tabindex="-1" aria-label="' + esc(p.name) + '"><img class="main" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" width="300" height="400"></a>' +
      '<div class="pcard-badges">' + (p.inStock ? '' : '<span class="badge out">' + esc(T('common.badgeOut')) + '</span>') + (sale ? '<span class="badge sale">−' + Math.round((1 - p.price / p.oldPrice) * 100) + '%</span>' : '') + '</div>' +
      '<button type="button" class="pcard-fav" data-fav="' + esc(p.id) + '" aria-label="' + esc(T('common.fav')) + '" aria-pressed="false">' + icon('heart') + '</button>' +
      (sized && p.inStock ? '<a class="pcard-add" href="' + esc(p.url) + '" aria-label="' + esc(T('product.chooseSize')) + '">' + icon('arrow') + '<span>' + esc(T('product.chooseSize')) + '</span></a>' :
        '<button type="button" class="pcard-add" data-add="' + esc(p.id) + '"' + (p.inStock ? '' : ' disabled') + ' aria-label="' + esc(p.inStock ? T('common.toCart') : T('common.notAvailable')) + '">' + icon(p.inStock ? 'plus' : 'x') + '<span>' + esc(p.inStock ? T('common.toCart') : T('common.notAvailable')) + '</span></button>') +
      '</div><div class="pcard-body"><span class="pcard-brand">' + esc(p.brand || p.category || '') + '</span><h3 class="pcard-name"><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3>' +
      '<div class="pcard-price"><b>' + money(p.price) + '</b>' + (sale ? '<s>' + money(p.oldPrice) + '</s>' : '') + '</div></div></article>';
  }
  function initRecent() {
    var sec = $('#recentSection'), grid = $('#recentGrid');
    if (!sec || !grid) return;
    var ids = store(RECENT_KEY);
    if (!Array.isArray(ids)) return;
    var current = null;
    try { current = $('#productData') ? String(JSON.parse($('#productData').textContent).id) : null; } catch (e) { /* ignore */ }
    ids = ids.map(String).filter(function (x) { return x !== current; }).slice(0, 4);
    if (!ids.length) return;
    api('/products?ids=' + encodeURIComponent(ids.join(','))).then(function (r) {
      var items = (r.ok && r.body && r.body.items) || [];
      if (!items.length) return;
      grid.innerHTML = items.map(cardHtml).join('');
      sec.hidden = false;
      paintFavs();
    }).catch(function () { /* optional block */ });
  }

  /* --------------------------------------------------------------- catalog */
  function initCatalog() {
    var main = $('#catalogMain'), form = $('#filterForm');
    if (!main || !form) return;
    var filters = $('#filters');
    var seq = 0, ctrl = null;
    var shown = location.pathname + location.search;
    var JSON_OPTS = { headers: { Accept: 'application/json' }, credentials: 'same-origin' };

    function num(name) {
      var el = form.elements[name];
      var v = el ? String(el.value).trim().replace(',', '.') : '';
      if (v === '' || isNaN(+v) || +v < 0) return null;
      return +v;
    }
    function priceBad() { var a = num('min'), b = num('max'); return a !== null && b !== null && a > b; }
    function markPrice() {
      var bad = priceBad();
      ['min', 'max'].forEach(function (n) { var el = form.elements[n]; if (el) { if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); } });
      return bad;
    }
    /* "from 1500 to 1000" → swap instead of showing nothing */
    function fixPrice() {
      if (!priceBad()) return;
      var a = form.elements.min, b = form.elements.max, t = a.value;
      a.value = b.value; b.value = t;
      markPrice();
    }
    function buildUrl(extra) {
      var fd = new FormData(form);
      var q = new URLSearchParams();
      fd.forEach(function (v, k) {
        v = String(v).trim();
        if (v === '') return;
        if ((k === 'min' || k === 'max') && num(k) === null) return;   // negative / garbage prices
        q.append(k, v);
      });
      var sel = $('#sortSelect');
      if (sel && !q.has('sort') && sel.value) q.set('sort', sel.value);
      if (q.get('sort') === 'new') q.delete('sort');
      if (extra) Object.keys(extra).forEach(function (k) { q.set(k, extra[k]); });
      return q;
    }
    function formState() { return new URLSearchParams(new FormData(form)).toString(); }
    function restoreForm(s) {
      var q = new URLSearchParams(s || '');
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name || el.type === 'hidden' || el.type === 'submit') return;
        var all = q.getAll(el.name);
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = all.indexOf(el.value) > -1;
        else el.value = all.length ? all[0] : '';
      });
      markPrice();
    }
    var shownForm = formState();   // filter state of the results on screen (= current history entry)
    function remember() {
      try { history.replaceState({ catalog: 1, form: shownForm, scroll: window.scrollY }, '', location.href); } catch (e) { /* ignore */ }
    }
    /* the server 301-redirects a lone category to its pretty URL and drops ?partial — ask again there */
    function getJson(url, mode) {
      var o = { headers: JSON_OPTS.headers, credentials: JSON_OPTS.credentials };
      if (ctrl) o.signal = ctrl.signal;
      return fetch(url, o).then(function (r) {
        if (r.redirected && !/[?&]partial=/.test(r.url)) {
          var u = new URL(r.url, location.href); u.searchParams.set('partial', mode);
          return fetch(u.toString(), o);
        }
        return r;
      }).then(function (r) { return r.json(); });
    }
    function jumpTo(y) {
      var de = document.documentElement, sb = de.style.scrollBehavior;
      de.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      de.style.scrollBehavior = sb;
    }
    function load(q, o) {
      o = o || {};
      var my = ++seq;
      if (ctrl) ctrl.abort();
      ctrl = window.AbortController ? new AbortController() : null;
      main.classList.add('is-loading');
      main.setAttribute('aria-busy', 'true');
      var target = o.path || form.getAttribute('action');
      var pq = new URLSearchParams(q.toString()); pq.set('partial', '1');
      getJson(target + '?' + pq.toString(), '1')
        .then(function (j) {
          if (my !== seq) return;   // a newer request superseded this one
          if (!j || !j.ok) throw new Error('bad');
          var oldTitle = ($('#catalogTitle') || {}).textContent;
          main.innerHTML = j.html;
          main.classList.remove('is-loading');
          main.removeAttribute('aria-busy');
          if (o.push !== false && j.url) {
            remember();
            shownForm = formState();
            history.pushState({ catalog: 1, form: shownForm, scroll: 0 }, '', j.url);
          } else shownForm = formState();
          shown = location.pathname + location.search;
          if (j.title) {
            var h = $('#catalogTitle'); if (h) h.textContent = j.title;
            if (oldTitle && document.title.indexOf(oldTitle) > -1) document.title = document.title.replace(oldTitle, j.title);
          }
          paintFavs();
          moreBusy = false;
          bindLoadMore();
          if (filters) syncPanel(filters);
          if (o.close && mqMobile.matches) closePanels();
          if (typeof o.scroll === 'number') jumpTo(o.scroll);
          else { var top = $('.catalog-toolbar', main); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        })
        .catch(function (err) {
          if (my !== seq || (err && err.name === 'AbortError')) return;
          location.href = target + '?' + q.toString();
        });
    }
    var apply = debounce(function () { if (!markPrice()) load(buildUrl()); }, 320);
    form.addEventListener('change', function (e) {
      if (e.target.type === 'number') { apply.cancel(); fixPrice(); load(buildUrl()); return; }
      if (e.target.type !== 'search') apply();
    });
    form.addEventListener('input', function (e) { if (e.target.type === 'number' || e.target.type === 'search') apply(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); apply.cancel(); fixPrice(); load(buildUrl(), { close: true }); });
    // sort <select> lives inside the AJAX-replaced block → delegated
    main.addEventListener('change', function (e) { if (e.target.id === 'sortSelect') { apply.cancel(); load(buildUrl()); } });

    function syncApplyBtn() {
      var b = $('#filterApply'); if (b) b.style.display = mqMobile.matches ? '' : 'none';
      if (filters) { if (!mqMobile.matches && filters.classList.contains('on')) closePanels(true); syncPanel(filters); }
    }
    syncApplyBtn();
    onMq(mqMobile, syncApplyBtn);

    remember();
    window.addEventListener('popstate', function (e) {
      var now = location.pathname + location.search;
      if (now === shown) return;   // only the #hash changed
      var st = e.state;
      if (!st || !st.catalog) { location.reload(); return; }
      restoreForm(st.form);
      load(new URLSearchParams(location.search), { push: false, path: location.pathname, scroll: st.scroll || 0 });
      shown = now;
    });
    // remember the scroll position of the current entry (restored on back / forward)
    window.addEventListener('pagehide', remember);
    window.addEventListener('scroll', debounce(remember, 400), { passive: true });

    var moreBusy = false;
    function bindLoadMore() {
      var btn = $('#loadMoreBtn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (moreBusy) return;   // double click → one request
        moreBusy = true;
        var next = parseInt(btn.dataset.page, 10) + 1, pages = parseInt(btn.dataset.pages, 10);
        var q = new URLSearchParams(location.search); q.set('page', next); q.set('partial', 'cards');
        btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
        var mySeq = seq;
        fetch(location.pathname + '?' + q.toString(), JSON_OPTS)
          .then(function (r) { return r.json(); })
          .then(function (j) {
            moreBusy = false;
            if (mySeq !== seq || !document.contains(btn)) return;   // filters changed meanwhile
            if (!j || !j.ok) throw new Error('x');
            var grid = $('#productGrid');
            var tpl = document.createElement('template');
            tpl.innerHTML = j.html;
            var have = {};
            $$('.pcard[data-id]', grid).forEach(function (c) { have[c.getAttribute('data-id')] = 1; });
            var added = $$('.pcard', tpl.content).filter(function (c) { var id = c.getAttribute('data-id'); if (have[id]) { c.remove(); return false; } have[id] = 1; return true; });
            grid.appendChild(tpl.content);
            paintFavs();
            if (j.pages) pages = j.pages;
            btn.dataset.page = next; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
            var pg = $('#pagination'); if (pg) pg.remove();
            if (next >= pages) {
              var hadFocus = document.activeElement === btn;
              var w = $('#loadMoreWrap'); if (w) w.remove();
              if (hadFocus && added[0]) focusEl(added[0].querySelector('.pcard-name a'));
            }
          })
          .catch(function () { moreBusy = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); toast(T('js.networkError'), 'error'); });
      });
    }
    bindLoadMore();
  }

  /* ---------------------------------------------------------------- forms */
  function isPickup() {
    var r = $('#checkoutForm input[name=shippingMethod]:checked');
    return !!r && r.value === 'pickup';
  }
  function resetCheckoutBtn() {
    submitting = false;
    var btn = $('#checkoutSubmit');
    if (btn) { btn.classList.remove('is-loading'); btn.disabled = !cart.length; btn.removeAttribute('aria-busy'); }
  }
  function initCheckout() {
    var form = $('#checkoutForm');
    if (!form) return;
    var box = $('#addressBox'), wh = $('#co-wh'), whField = wh && wh.closest('.field'), whLabel = $('#whLabel');
    var whPh = wh ? wh.getAttribute('placeholder') || '' : '';
    function field(name) { return form.querySelector('[name=' + name + ']'); }
    function setErr(name, on) {
      var f = field(name);
      if (!f) return;
      var wrap = f.closest('.field');
      if (wrap) wrap.classList.toggle('has-error', on);
      if (on) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
      var msg = wrap && wrap.querySelector('[data-err]');
      if (msg) {
        if (!msg.id) msg.id = 'err-' + name;
        var d = (f.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== msg.id; });
        if (on) d.push(msg.id);
        if (d.length) f.setAttribute('aria-describedby', d.join(' ')); else f.removeAttribute('aria-describedby');
      }
    }
    function syncShip() {
      var v = ($('input[name=shippingMethod]:checked', form) || {}).value;
      var courier = v === 'np_courier' || v === 'kyiv_courier';
      if (box) box.hidden = v === 'pickup';
      if (v === 'pickup') { setErr('city', false); setErr('warehouse', false); }
      if (whField) whField.style.display = '';
      if (whLabel && whLabel.firstChild) {
        whLabel.firstChild.textContent = (courier ? T('checkout.address') : T('checkout.warehouse')) + ' ';
        // Kyiv courier: the address is optional (the courier calls before delivery)
        var req = whLabel.querySelector('.req'); if (req) req.hidden = v === 'kyiv_courier';
      }
      if (wh) {
        wh.setAttribute('placeholder', courier ? '' : whPh);
        wh.setAttribute('autocomplete', courier ? 'street-address' : 'off');
        if (v === 'kyiv_courier') setErr('warehouse', false);
      }
      renderCheckoutSummary();
    }
    $$('input[name=shippingMethod]', form).forEach(function (r) { r.addEventListener('change', syncShip); });
    syncShip();

    // phone: only digits and the usual separators
    var phone = field('phone');
    if (phone) phone.addEventListener('input', function () {
      var v = phone.value, clean = v.replace(/[^\d+()\-\s]/g, '').replace(/(?!^)\+/g, '');
      if (clean === v) return;
      var pos = phone.selectionStart - (v.length - clean.length);
      phone.value = clean;
      try { phone.setSelectionRange(Math.max(0, pos), Math.max(0, pos)); } catch (e) { /* ignore */ }
    });

    function validate() {
      var v = function (n) { var el = form.elements[n]; return el ? (el.value || '').trim() : ''; };
      var ship = ($('input[name=shippingMethod]:checked', form) || {}).value;
      var digits = v('phone').replace(/\D/g, '');
      var res = {
        name: v('name').length >= 2,
        phone: digits.length >= 10 && digits.length <= 15,
        email: !v('email') || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email')),
        city: ship === 'pickup' || v('city').length >= 2,
        warehouse: ship === 'pickup' || ship === 'kyiv_courier' || v('warehouse').length > 0,
      };
      var first = null;
      Object.keys(res).forEach(function (k) { setErr(k, !res[k]); if (!res[k] && !first) first = k; });
      return first;
    }
    function clearErr(e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('has-error') && e.target.name) setErr(e.target.name, false);
    }
    form.addEventListener('input', clearErr);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;
      if (!cart.length) { toast(T('js.emptyCart'), 'error'); return; }
      if (cart.some(function (i) { return i.inStock === false; })) { toast(T('js.removeUnavailable'), 'error'); return; }
      var bad = validate();
      if (bad) { focusEl(form.elements[bad]); form.elements[bad].scrollIntoView({ block: 'center', behavior: 'smooth' }); toast(T('checkout.fixErrors'), 'error'); return; }
      var fd = new FormData(form);
      var str = function (k) { return String(fd.get(k) || '').trim(); };
      var payload = {
        name: str('name'), phone: str('phone'), email: str('email'), city: str('city'), warehouse: str('warehouse'),
        shippingMethod: fd.get('shippingMethod'), payment: fd.get('payment'), comment: str('comment'),
        items: cart.filter(function (i) { return i.inStock !== false; }).map(function (i) { return { id: i.id, qty: i.qty, size: i.size || '' }; }),
      };
      var btn = $('#checkoutSubmit');
      submitting = true;
      if (btn) { btn.classList.add('is-loading'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      api('/orders', { method: 'POST', body: payload }).then(function (r) {
        if (r.ok && r.body.ok) {
          cart = [];
          store(CART_KEY, []);
          location.href = r.body.redirect || C.urls.catalog || '/';
          return;
        }
        resetCheckoutBtn();
        if (r.status === 403 || r.status === 429 || r.status >= 500 || !r.body.errors) { toast(failText(r, T('js.orderError')), 'error'); return; }
        var errs = r.body.errors || {};
        var first = null;
        Object.keys(errs).forEach(function (k) { if (field(k)) { setErr(k, true); if (!first) first = k; } });
        if (first) focusEl(field(first));
        if (errs.items) { lastSync = 0; syncCart(true, true); }
        toast(r.body.error || T('js.orderError'), 'error');
      }).catch(function () { resetCheckoutBtn(); toast(T('js.networkError'), 'error'); });
    });
  }

  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  document.addEventListener('submit', function (e) {
    var news = e.target.closest('[data-news]');
    if (news) {
      e.preventDefault();
      var input = news.querySelector('input[name=email]');
      var btn = news.querySelector('button[type=submit], button:not([type])');
      if (!input || (btn && btn.disabled)) return;
      var email = input.value.trim();
      if (!EMAIL_RE.test(email)) { input.setAttribute('aria-invalid', 'true'); focusEl(input); toast(T('nl.error'), 'error'); return; }
      input.removeAttribute('aria-invalid');
      if (btn) btn.disabled = true;
      api('/subscribe', { method: 'POST', body: { email: email } }).then(function (r) {
        if (btn) btn.disabled = false;
        if (r.ok && r.body.ok) { toast(T('nl.done'), 'success'); news.reset(); }
        else toast(failText(r, T('nl.error')), 'error');
      }).catch(function () { if (btn) btn.disabled = false; toast(T('js.networkError'), 'error'); });
      return;
    }
    var contact = e.target.closest('[data-contact]');
    if (contact) {
      e.preventDefault();
      var b = contact.querySelector('button[type=submit], button:not([type])');
      if (b && b.disabled) return;
      var fd = new FormData(contact);
      var val = function (k) { return String(fd.get(k) || '').trim(); };
      var missing = null;
      [['name', 1], ['contact', 1], ['message', 3]].forEach(function (p) {
        var el = contact.querySelector('[name=' + p[0] + ']');
        var bad = !!el && val(p[0]).length < p[1];
        if (el) { if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
        if (bad && !missing) missing = el;
      });
      if (missing) { focusEl(missing); toast(T('contacts.fill'), 'error'); return; }
      if (b) { b.classList.add('is-loading'); b.disabled = true; }
      api('/contact', { method: 'POST', body: { name: val('name'), contact: val('contact'), message: val('message'), website: fd.get('website') || '' } }).then(function (r) {
        if (b) { b.classList.remove('is-loading'); b.disabled = false; }
        if (r.ok && r.body.ok) { toast(T('contacts.sent'), 'success'); contact.reset(); }
        else toast(failText(r, T('contacts.fill')), 'error');
      }).catch(function () { if (b) { b.classList.remove('is-loading'); b.disabled = false; } toast(T('js.networkError'), 'error'); });
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.closest && e.target.closest('[data-news], [data-contact]')) e.target.removeAttribute('aria-invalid');
  });

  /* --------------------------------------------------- reveal + counters */
  function initReveal() {
    var els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  function initCounters() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = $$('[data-count]');
    if (!els.length) return;
    function run(el) {
      var target = +el.dataset.count, start = null, dur = 1200;
      if (!target || el.getAttribute('data-counted')) return;
      el.setAttribute('data-counted', '1');
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step); else el.textContent = target;
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    }
    // count up when the number scrolls into view (not while it is off-screen)
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { run(x.target); io.unobserve(x.target); } });
    }, { threshold: .4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------- init */
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } }
  function init() {
    loadCart();
    loadFavs();
    safe(initTheme);
    panels().forEach(syncPanel);
    safe(renderCartUI);
    paintFavs();
    safe(initProduct);
    safe(initCatalog);
    safe(initCheckout);
    safe(initRecent);
    safe(initReveal);
    safe(initCounters);
    if (cart.length && (C.page === 'cart' || C.page === 'checkout')) syncCart(true);
    else if (cart.length) syncCart(false);
    // other tabs changed the cart / favourites / theme
    window.addEventListener('storage', function (e) {
      if (e.key === null || e.key === CART_KEY) { loadCart(); if (!submitting) renderCartUI(); }
      if (e.key === null || e.key === FAV_KEY) { loadFavs(); paintFavs(); if ($('#favDrawer.on')) renderFav(); }
      if (e.key === THEME_KEY) { var s = savedTheme(); applyTheme(s ? s === 'dark' : themeMq.matches); }
    });
    // back/forward cache: the page comes back exactly as it was left
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      loadCart(); loadFavs();
      resetCheckoutBtn();
      renderCartUI(); paintFavs();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
