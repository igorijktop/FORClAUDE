/* ONIKA storefront — vanilla JS, no dependencies. */
(function () {
  'use strict';

  var C = window.ONIKA || {};
  var DICT = C.t || {};
  var CART_KEY = 'onika_cart_v2';
  var FAV_KEY = 'onika_fav_v2';
  var RECENT_KEY = 'onika_recent_v1';

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
  function plural(key, n) {
    var f = DICT[key];
    if (!Array.isArray(f)) return String(f || '');
    var a = Math.abs(n), i;
    if (C.lang === 'en') i = a === 1 ? 0 : 1;
    else { var n10 = a % 10, n100 = a % 100; i = (n10 === 1 && n100 !== 11) ? 0 : (n10 >= 2 && n10 <= 4 && !(n100 >= 12 && n100 <= 14)) ? 1 : 2; }
    return f[Math.min(i, f.length - 1)];
  }
  function money(n) {
    n = Number(n) || 0;
    var dec = Math.abs(n - Math.round(n)) > 0.004;
    var s = (dec ? n.toFixed(2).replace('.', ',') : String(Math.round(n)));
    var parts = s.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',') + ' ' + (C.currency || '₴');
  }
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* private mode */ }
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
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    });
  }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  /* -------------------------------------------------------------- toasts */
  function toast(msg, type, link) {
    var wrap = $('#toasts');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    var ic = type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info';
    el.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>' + (link ? '<a href="' + esc(link.href) + '">' + esc(link.label) + '</a>' : '');
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, 3600);
  }

  /* ---------------------------------------------------------- theme toggle */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') !== 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('onika_theme', dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
  });

  /* ---------------------------------------------------------- header + menus */
  (function header() {
    var h = $('#siteHeader');
    function onScroll() { if (h) h.classList.toggle('scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  function closeMenus(except) {
    $$('.lang-switch.open, .account-menu.open').forEach(function (m) {
      if (m !== except) { m.classList.remove('open'); var b = m.querySelector('button'); if (b) b.setAttribute('aria-expanded', 'false'); }
    });
  }
  document.addEventListener('click', function (e) {
    var tog = e.target.closest('.lang-toggle, .account-toggle');
    if (tog) {
      var box = tog.parentElement;
      var open = box.classList.toggle('open');
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      closeMenus(box);
      return;
    }
    var opt = e.target.closest('.lang-opt');
    if (opt) {
      // keep active filters / search when switching language
      var href = opt.getAttribute('href');
      if (href && location.search && href.indexOf('?') === -1) { e.preventDefault(); location.href = href + location.search + location.hash; }
      return;
    }
    if (!e.target.closest('.lang-switch, .account-menu')) closeMenus();
  });

  /* ------------------------------------------------------------- overlays */
  var overlay = $('#overlay');
  function openPanel(el) {
    if (!el) return;
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closePanels() {
    $$('.drawer.on, .mnav.on, .filters.on').forEach(function (p) { p.classList.remove('on'); p.setAttribute('aria-hidden', 'true'); });
    if (overlay) overlay.classList.remove('on');
    var fo = $('#filtersOverlay'); if (fo) fo.classList.remove('on');
    document.body.style.overflow = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanels(); closeMenus(); closeSearch(); closeLightbox(); }
  });

  /* ================================================================= CART */
  var cart = [];
  function loadCart() {
    var c = store(CART_KEY);
    cart = Array.isArray(c) ? c.filter(function (i) { return i && i.id && i.qty > 0; }) : [];
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
  /* Stock is kept per product, so sizes of one product share it. */
  function limitFor(id, size, stock) {
    var s = typeof stock === 'number' ? stock : 99;
    var others = 0;
    cart.forEach(function (i) { if (i.id === id && (i.size || '') !== (size || '')) others += i.qty; });
    return Math.max(1, Math.min(99, s - others));
  }
  function addToCart(p, size, qty) {
    var id = String(p.id);
    var f = findItem(id, size);
    var max = limitFor(id, size, p.stock);
    qty = Math.max(1, qty || 1);
    var want = (f ? f.qty : 0) + qty;
    if (want > max) toast(T('product.maxQty', { n: max }), 'info');
    want = Math.min(max, want);
    if (f) { f.qty = want; f.stock = p.stock; }
    else cart.push({ id: id, size: size || '', qty: want, stock: p.stock, name: p.name, price: Number(p.price), oldPrice: p.oldPrice || null, image: p.image, url: p.url, brand: p.brand || '', inStock: true });
    saveCart();
    var badge = $('#cartCount'); if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
  }

  var lastSync = 0;
  function syncCart(force, quiet) {
    if (!cart.length) return Promise.resolve();
    if (!force && Date.now() - lastSync < 20000) return Promise.resolve();
    lastSync = Date.now();
    var ids = cart.map(function (i) { return i.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return api('/products?ids=' + encodeURIComponent(ids.join(','))).then(function (r) {
      if (!r.ok || !r.body || !r.body.items) return;
      var by = {};
      r.body.items.forEach(function (p) { by[p.id] = p; });
      var removed = 0, clamped = 0;
      cart = cart.filter(function (it) { if (by[it.id]) return true; removed++; return false; });
      cart.forEach(function (it) {
        var p = by[it.id];
        it.name = p.name; it.price = p.price; it.oldPrice = p.oldPrice; it.image = p.image; it.url = p.url; it.inStock = p.inStock; it.sizes = p.sizes; it.stock = p.stock;
        if (p.sizes && p.sizes.length && p.sizes.indexOf(it.size) === -1) it.inStock = false;
      });
      cart.forEach(function (it) {
        if (it.inStock === false) return;
        var lim = limitFor(it.id, it.size, it.stock);
        if (it.qty > lim) { it.qty = lim; clamped++; }
      });
      store(CART_KEY, cart);
      renderCartUI();
      if (removed) toast(T('js.itemsRemoved'), 'info');
      else if (clamped && !quiet) toast(T('js.stockLimit'), 'info');
    }).catch(function () { /* offline: keep local data */ });
  }

  function itemHtml(it) {
    var line = it.price * it.qty;
    var k = 'data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '"';
    return '<div class="cart-item">' +
      '<a href="' + esc(it.url || '#') + '"><img class="thumb" src="' + esc(it.image || C.urls.placeholder) + '" alt="" loading="lazy" width="76" height="96"></a>' +
      '<div><div class="ci-name"><a href="' + esc(it.url || '#') + '">' + esc(it.name) + '</a></div>' +
      '<div class="ci-meta">' + (it.brand ? esc(it.brand) : '') + (it.size ? (it.brand ? ' · ' : '') + esc(T('product.size')) + ': ' + esc(it.size) : '') + '</div>' +
      (it.inStock === false ? '<div class="ci-note">' + esc(T('js.outOfStockItem')) + '</div>' :
        '<div class="qty"><button type="button" data-qty="dec" ' + k + ' aria-label="−">' + icon('minus') + '</button>' +
        '<input type="number" value="' + it.qty + '" min="1" max="' + limitFor(it.id, it.size, it.stock) + '" inputmode="numeric" data-qty-input ' + k + ' aria-label="' + esc(T('product.qty')) + '">' +
        '<button type="button" data-qty="inc" ' + k + (it.qty >= limitFor(it.id, it.size, it.stock) ? ' disabled' : '') + ' aria-label="+">' + icon('plus') + '</button></div>') +
      '</div><div class="ci-side"><div class="ci-price">' + money(line) + (it.oldPrice && it.oldPrice > it.price ? '<s>' + money(it.oldPrice * it.qty) + '</s>' : '') + '</div>' +
      '<button type="button" class="ci-remove" data-remove ' + k + ' aria-label="' + esc(T('common.remove')) + '">' + icon('trash') + '</button></div></div>';
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
  function renderCartUI() {
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
        $('#freeShip').innerHTML = freeShipHtml(sub);
        $('#cartSubtotal').textContent = money(sub);
      }
    }
    renderCartPage();
    renderCheckoutSummary();
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
      '<a href="' + esc(C.urls.checkout) + '" class="btn btn-lg btn-block" style="margin-top:16px' + (bad ? ';pointer-events:none;opacity:.5' : '') + '">' + esc(T('cart.checkout')) + ' ' + icon('arrow') + '</a>' +
      '<a href="' + esc(C.urls.catalog) + '" class="link-arrow" style="margin-top:18px;display:inline-flex">' + esc(T('cart.continue')) + '</a></aside></div>';
  }
  function renderCheckoutSummary() {
    var wrap = $('#checkoutSummary');
    if (!wrap) return;
    var form = $('#checkoutForm');
    if (!cart.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:20px 0"><p>' + esc(T('checkout.emptyCart')) + '</p><a href="' + esc(C.urls.catalog) + '" class="btn btn-sm">' + esc(T('cart.toCatalog')) + '</a></div>';
      if (form) $$('button[type=submit], input, textarea', form).forEach(function (el) { el.disabled = true; });
      return;
    }
    if (form) $$('button[type=submit], input, textarea', form).forEach(function (el) { el.disabled = false; });
    var sub = cartTotal();
    wrap.innerHTML = cart.map(function (it) {
      return '<div class="os-item"><img src="' + esc(it.image || C.urls.placeholder) + '" alt="" loading="lazy" width="60" height="76"><div><div class="n">' + esc(it.name) + '</div>' +
        '<div class="small muted">' + it.qty + ' × ' + money(it.price) + (it.size ? ' · ' + esc(it.size) : '') + '</div>' +
        (it.inStock === false ? '<div class="ci-note">' + esc(T('js.outOfStockItem')) + '</div>' : '') + '</div><div class="p">' + money(it.price * it.qty) + '</div></div>';
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
    var add = t.closest('[data-add]');
    if (add && !add.disabled) {
      var card = add.closest('[data-p]');
      var p = null;
      try { p = JSON.parse(card.getAttribute('data-p')); } catch (err) { /* ignore */ }
      if (p) { addToCart(p, '', 1); openCart(); }
      return;
    }
    if (t.closest('#cartBtn')) { var d = $('#cartDrawer'); if (d && d.classList.contains('on')) closePanels(); else openCart(); return; }
    if (t.closest('#closeCart')) { closePanels(); return; }
    if (t.closest('#favBtn')) { var f = $('#favDrawer'); if (f && f.classList.contains('on')) closePanels(); else openFav(); return; }
    if (t.closest('#closeFav')) { closePanels(); return; }
    if (t.closest('#burger')) { closePanels(); openPanel($('#mobileNav')); return; }
    if (t.closest('#mobileClose')) { closePanels(); return; }
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
  function openCart() {
    closePanels();
    openPanel($('#cartDrawer'));
    syncCart(false);
  }

  /* =========================================================== FAVOURITES */
  var favs = [];
  function loadFavs() { var f = store(FAV_KEY); favs = Array.isArray(f) ? f.map(String) : []; }
  function paintFavs() {
    $$('[data-fav]').forEach(function (b) {
      var on = favs.indexOf(String(b.dataset.fav)) > -1;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var c = $('#favCount');
    if (c) { c.textContent = favs.length; c.setAttribute('data-empty', favs.length ? '0' : '1'); }
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
    return '<div class="cart-item"><a href="' + esc(p.url) + '"><img class="thumb" src="' + esc(p.image) + '" alt="" loading="lazy" width="76" height="96"></a>' +
      '<div><div class="ci-name"><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></div><div class="ci-meta">' + esc(p.brand || '') + '</div>' +
      (p.inStock ? (sized ? '<a class="btn btn-sm" href="' + esc(p.url) + '">' + esc(T('product.chooseSize')) + '</a>' :
        '<button type="button" class="btn btn-sm" data-fav-add="' + esc(p.id) + '">' + esc(T('common.toCart')) + '</button>') : '<div class="ci-note">' + esc(T('common.notAvailable')) + '</div>') +
      '</div><div class="ci-side"><div class="ci-price">' + money(p.price) + '</div><button type="button" class="ci-remove" data-unfav="' + esc(p.id) + '" aria-label="' + esc(T('common.remove')) + '">' + icon('trash') + '</button></div></div>';
  }
  var favCache = {};
  function renderFav() {
    var wrap = $('#favItems');
    if (!wrap) return;
    if (!favs.length) {
      wrap.innerHTML = '<div class="empty-state">' + icon('heart') + '<h3>' + esc(T('js.favEmpty')) + '</h3><p>' + esc(T('js.favEmptyText')) + '</p><a href="' + esc(C.urls.catalog) + '" class="btn">' + esc(T('cart.toCatalog')) + '</a></div>';
      return;
    }
    wrap.innerHTML = '<div class="skeleton" style="height:120px;margin:16px 0"></div>';
    api('/products?ids=' + encodeURIComponent(favs.join(','))).then(function (r) {
      var items = (r.body && r.body.items) || [];
      items.forEach(function (p) { favCache[p.id] = p; });
      wrap.innerHTML = items.length ? items.map(favItemHtml).join('') : '<div class="empty-state"><h3>' + esc(T('js.favEmpty')) + '</h3></div>';
    }).catch(function () { wrap.innerHTML = '<div class="empty-state"><p>' + esc(T('js.networkError')) + '</p></div>'; });
  }
  function openFav() { closePanels(); openPanel($('#favDrawer')); renderFav(); }
  document.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav); return; }
    var un = e.target.closest('[data-unfav]');
    if (un) { favs = favs.filter(function (x) { return x !== String(un.dataset.unfav); }); store(FAV_KEY, favs); paintFavs(); renderFav(); return; }
    var fa = e.target.closest('[data-fav-add]');
    if (fa && favCache[fa.dataset.favAdd]) { addToCart(favCache[fa.dataset.favAdd], '', 1); toast(T('js.addedCart'), 'success'); }
  });

  /* ============================================================== SEARCH */
  var hs = $('#hsearch'), hsInput = $('#hsearchInput'), hsPop = $('#hsearchPop');
  var searchSel = -1;
  function closeSearch() {
    if (!hs) return;
    hs.classList.remove('open', 'mobile-open');
    document.body.classList.remove('search-open');
    searchSel = -1;
  }
  function searchHtml(j, q) {
    if (!j.items.length && !j.categories.length) return '<div class="sr-empty">' + esc(T('search.nothing', { q: q })) + '</div>';
    var h = '';
    j.categories.forEach(function (c) { h += '<a class="sr-cat" href="' + esc(c.url) + '">' + icon('grid') + esc(c.name) + '<small>' + c.count + '</small></a>'; });
    j.items.forEach(function (p) {
      h += '<a class="sr-item" role="option" href="' + esc(p.url) + '"><img src="' + esc(p.image) + '" alt="" width="52" height="64"><div><div class="n">' + esc(p.name) + '</div><div class="b">' + esc(p.brand || p.category) + '</div></div><div class="p">' + money(p.price) + '</div></a>';
    });
    if (j.total > j.items.length) h += '<a class="sr-all" href="' + esc(j.all) + '">' + esc(T('search.all', { n: j.total })) + ' ' + icon('arrow') + '</a>';
    return h;
  }
  var lastQ = '';
  var doSearch = debounce(function () {
    var q = hsInput.value.trim();
    if (q.length < 2) { hsPop.innerHTML = ''; hs.classList.remove('open'); return; }
    lastQ = q;
    api('/search?q=' + encodeURIComponent(q)).then(function (r) {
      if (q !== lastQ || !r.body || !r.body.items) return;
      hsPop.innerHTML = searchHtml(r.body, q);
      hs.classList.add('open');
      searchSel = -1;
    });
  }, 180);
  if (hs && hsInput) {
    hsInput.addEventListener('input', function () { hs.classList.toggle('has-value', !!hsInput.value); doSearch(); });
    hsInput.addEventListener('focus', function () { if (hsPop.innerHTML) hs.classList.add('open'); });
    hsInput.addEventListener('keydown', function (e) {
      var items = $$('.sr-item, .sr-cat, .sr-all', hsPop);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        searchSel = (searchSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (el, i) { el.classList.toggle('sel', i === searchSel); });
        items[searchSel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && searchSel > -1 && items[searchSel]) {
        e.preventDefault(); location.href = items[searchSel].href;
      }
    });
    $('#hsearchClear').addEventListener('click', function () { hsInput.value = ''; hs.classList.remove('has-value', 'open'); hsInput.focus(); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#hsearch') && !e.target.closest('#searchToggle')) hs.classList.remove('open', 'mobile-open');
    });
    var st = $('#searchToggle');
    if (st) st.addEventListener('click', function () { hs.classList.add('mobile-open'); document.body.classList.add('search-open'); setTimeout(function () { hsInput.focus(); }, 30); });
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
  var galleryIdx = 0, galleryImgs = [];
  function setGallery(i) {
    if (!galleryImgs.length) return;
    galleryIdx = (i + galleryImgs.length) % galleryImgs.length;
    var img = $('#galleryImg');
    var src = galleryImgs[galleryIdx];
    var pre = new Image();
    pre.onload = function () { img.removeAttribute('srcset'); img.src = src; img.style.opacity = 1; };
    img.style.opacity = .35;
    pre.src = src;
    $$('#galleryThumbs .gthumb').forEach(function (t, n) { t.classList.toggle('on', n === galleryIdx); });
    var on = $('#galleryThumbs .gthumb.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    var lb = $('#lightbox'); if (lb && lb.classList.contains('on')) $('#lbImg').src = src;
  }
  function openLightbox() {
    var lb = $('#lightbox'); if (!lb) return;
    lb.classList.add('on');
    var img = $('#lbImg'); img.src = galleryImgs[galleryIdx]; img.classList.remove('zoomed');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    var lb = $('#lightbox');
    if (!lb || !lb.classList.contains('on')) return;
    lb.classList.remove('on');
    document.body.style.overflow = '';
  }
  function initProduct() {
    var dataEl = $('#productData');
    var gal = $('#gallery');
    if (!dataEl || !gal) return;
    var product = JSON.parse(dataEl.textContent);
    try { galleryImgs = JSON.parse(gal.getAttribute('data-images')) || []; } catch (e) { galleryImgs = []; }

    $$('#galleryThumbs .gthumb').forEach(function (t) { t.addEventListener('click', function () { setGallery(+t.dataset.index); }); });
    var main = $('#galleryMain');
    var prev = $('#galPrev'), next = $('#galNext');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); setGallery(galleryIdx - 1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); setGallery(galleryIdx + 1); });
    main.addEventListener('click', openLightbox);
    main.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
      if (e.key === 'ArrowLeft') setGallery(galleryIdx - 1);
      if (e.key === 'ArrowRight') setGallery(galleryIdx + 1);
    });
    // swipe
    var sx = null;
    main.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { setGallery(galleryIdx + (dx < 0 ? 1 : -1)); e.preventDefault(); }
    });
    var lb = $('#lightbox');
    $('#lbClose').addEventListener('click', closeLightbox);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    var lp = $('#lbPrev'), ln = $('#lbNext');
    if (lp) lp.addEventListener('click', function () { setGallery(galleryIdx - 1); });
    if (ln) ln.addEventListener('click', function () { setGallery(galleryIdx + 1); });
    $('#lbImg').addEventListener('click', function () { this.classList.toggle('zoomed'); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'ArrowLeft') setGallery(galleryIdx - 1);
      if (e.key === 'ArrowRight') setGallery(galleryIdx + 1);
    });

    // quantity
    var qty = $('#qtyInput');
    var qtyMax = Math.max(1, Math.min(99, typeof product.stock === 'number' ? product.stock : 99));
    function setQty(n) {
      if (n > qtyMax) toast(T('product.maxQty', { n: qtyMax }), 'info');
      qty.value = Math.max(1, Math.min(qtyMax, n || 1));
    }
    $('[data-qminus]').addEventListener('click', function () { setQty((+qty.value || 1) - 1); });
    $('[data-qplus]').addEventListener('click', function () { setQty((+qty.value || 1) + 1); });
    qty.addEventListener('change', function () { setQty(parseInt(qty.value, 10) || 1); });

    function buy() {
      var size = '';
      if (product.sizes && product.sizes.length) {
        var chosen = $('input[name=size]:checked');
        if (!chosen) {
          var box = $('#sizeBox'); box.classList.remove('size-error'); void box.offsetWidth; box.classList.add('size-error');
          $('#sizeErr').hidden = false;
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast(T('product.chooseSize'), 'error');
          return;
        }
        size = chosen.value;
      }
      addToCart(product, size, Math.max(1, parseInt(qty.value, 10) || 1));
      openCart();
    }
    $$('input[name=size]').forEach(function (r) { r.addEventListener('change', function () { $('#sizeErr').hidden = true; }); });
    var btn = $('#addToCartBtn'); if (btn) btn.addEventListener('click', buy);
    var bb = $('#buybarBtn'); if (bb) bb.addEventListener('click', buy);

    // sticky buy bar on mobile once the main button leaves the viewport
    var bar = $('#buybar'), row = $('#buyRow');
    if (bar && row && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var visible = en[0].isIntersecting;
        bar.classList.toggle('on', !visible);
        bar.setAttribute('aria-hidden', visible ? 'true' : 'false');
      }).observe(row);
    }

    // share
    var share = $('#shareBtn');
    if (share) {
      if (!navigator.share) share.hidden = true;
      share.addEventListener('click', function () { navigator.share({ title: share.dataset.title, url: share.dataset.url }).catch(function () {}); });
    }
    var copy = $('#copyBtn');
    if (copy) copy.addEventListener('click', function () {
      var url = copy.dataset.url;
      var done = function () { toast(T('product.linkCopied'), 'success'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else { var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
    });

    // remember for "recently viewed"
    var rec = store(RECENT_KEY); rec = Array.isArray(rec) ? rec : [];
    rec = [String(product.id)].concat(rec.filter(function (x) { return x !== String(product.id); })).slice(0, 12);
    store(RECENT_KEY, rec);
  }

  /* recently viewed strip (home + product pages) */
  function cardHtml(p) {
    var sale = p.oldPrice && p.oldPrice > p.price;
    var data = esc(JSON.stringify({ id: p.id, name: p.name, price: p.price, oldPrice: p.oldPrice, image: p.image, url: p.url, brand: p.brand, inStock: p.inStock, stock: p.stock, sizes: p.sizes }));
    var sized = p.sizes && p.sizes.length;
    return '<article class="pcard' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '" data-p="' + data + '"><div class="pcard-media"><a href="' + esc(p.url) + '" tabindex="-1"><img class="main" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" width="300" height="400"></a>' +
      '<div class="pcard-badges">' + (p.inStock ? '' : '<span class="badge out">' + esc(T('common.badgeOut')) + '</span>') + (sale ? '<span class="badge sale">−' + Math.round((1 - p.price / p.oldPrice) * 100) + '%</span>' : '') + '</div>' +
      '<button type="button" class="pcard-fav" data-fav="' + esc(p.id) + '" aria-label="' + esc(T('common.fav')) + '">' + icon('heart') + '</button>' +
      (sized && p.inStock ? '<a class="pcard-add" href="' + esc(p.url) + '">' + icon('arrow') + '<span>' + esc(T('product.chooseSize')) + '</span></a>' :
        '<button type="button" class="pcard-add" data-add="' + esc(p.id) + '"' + (p.inStock ? '' : ' disabled') + '>' + icon('plus') + '<span>' + esc(T('common.toCart')) + '</span></button>') +
      '</div><div class="pcard-body"><span class="pcard-brand">' + esc(p.brand || p.category || '') + '</span><h3 class="pcard-name"><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3>' +
      '<div class="pcard-price"><b>' + money(p.price) + '</b>' + (sale ? '<s>' + money(p.oldPrice) + '</s>' : '') + '</div></div></article>';
  }
  function initRecent() {
    var sec = $('#recentSection'), grid = $('#recentGrid');
    if (!sec || !grid) return;
    var ids = store(RECENT_KEY);
    if (!Array.isArray(ids)) return;
    var current = $('#productData') ? JSON.parse($('#productData').textContent).id : null;
    ids = ids.filter(function (x) { return x !== String(current); }).slice(0, 4);
    if (!ids.length) return;
    api('/products?ids=' + encodeURIComponent(ids.join(','))).then(function (r) {
      var items = (r.body && r.body.items) || [];
      if (!items.length) return;
      grid.innerHTML = items.map(cardHtml).join('');
      sec.hidden = false;
      paintFavs();
    });
  }

  /* --------------------------------------------------------------- catalog */
  function initCatalog() {
    var main = $('#catalogMain'), form = $('#filterForm');
    if (!main || !form) return;
    var filters = $('#filters'), fo = $('#filtersOverlay');

    function buildUrl(extra) {
      var fd = new FormData(form);
      var q = new URLSearchParams();
      fd.forEach(function (v, k) { if (String(v) !== '') q.append(k, v); });
      var sel = $('#sortSelect');
      if (sel && !q.has('sort') && sel.value) q.set('sort', sel.value);
      if (q.get('sort') === 'new') q.delete('sort');
      if (extra) Object.keys(extra).forEach(function (k) { q.set(k, extra[k]); });
      return q;
    }
    function load(q, push) {
      main.classList.add('is-loading');
      var target = form.getAttribute('action');
      var pq = new URLSearchParams(q.toString()); pq.set('partial', '1');
      fetch(target + '?' + pq.toString(), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error('bad');
          main.innerHTML = j.html;
          main.classList.remove('is-loading');
          if (push !== false && j.url) history.pushState({ catalog: 1 }, '', j.url);
          if (j.title) { var h = $('#catalogTitle'); if (h) h.textContent = j.title; }
          paintFavs();
          bindSort();
          bindLoadMore();
          if (window.matchMedia('(max-width: 899px)').matches) closePanels();
          var top = $('.catalog-toolbar', main); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
        .catch(function () { location.href = target + '?' + q.toString(); });
    }
    var apply = debounce(function () { load(buildUrl(), true); }, 320);
    form.addEventListener('change', function (e) { if (e.target.type !== 'number' && e.target.type !== 'search') apply(); });
    form.addEventListener('input', function (e) { if (e.target.type === 'number' || e.target.type === 'search') apply(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); load(buildUrl(), true); });
    $('#filterApply').style.display = window.matchMedia('(max-width: 899px)').matches ? '' : 'none';
    window.addEventListener('popstate', function () { location.reload(); });

    function bindSort() {
      var sel = $('#sortSelect');
      if (sel) sel.addEventListener('change', function () { load(buildUrl(), true); });
      var ft = $('#filterToggle');
      if (ft) ft.addEventListener('click', function () { filters.classList.add('on'); filters.setAttribute('aria-hidden', 'false'); fo.classList.add('on'); document.body.style.overflow = 'hidden'; });
    }
    function bindLoadMore() {
      var btn = $('#loadMoreBtn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var next = parseInt(btn.dataset.page, 10) + 1, pages = parseInt(btn.dataset.pages, 10);
        var q = new URLSearchParams(location.search); q.set('page', next); q.set('partial', 'cards');
        btn.classList.add('is-loading');
        fetch(location.pathname + '?' + q.toString(), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j.ok) throw new Error('x');
            $('#productGrid').insertAdjacentHTML('beforeend', j.html);
            paintFavs();
            btn.dataset.page = next; btn.classList.remove('is-loading');
            var pg = $('#pagination'); if (pg) pg.remove();
            if (next >= pages) $('#loadMoreWrap').remove();
          })
          .catch(function () { btn.classList.remove('is-loading'); toast(T('js.networkError'), 'error'); });
      });
    }
    bindSort();
    bindLoadMore();
    $('#filtersClose').addEventListener('click', closePanels);
  }

  /* ---------------------------------------------------------------- forms */
  function isPickup() {
    var r = $('#checkoutForm input[name=shippingMethod]:checked');
    return !!r && r.value === 'pickup';
  }
  function initCheckout() {
    var form = $('#checkoutForm');
    if (!form) return;
    var box = $('#addressBox'), whField = $('#co-wh').closest('.field');
    function syncShip() {
      var v = ($('input[name=shippingMethod]:checked', form) || {}).value;
      box.hidden = v === 'pickup';
      whField.style.display = v === 'kyiv_courier' ? 'none' : '';
      $('#whLabel').firstChild.textContent = (v === 'np_courier' || v === 'kyiv_courier' ? T('checkout.address') : T('checkout.warehouse')) + ' ';
      renderCheckoutSummary();
    }
    $$('input[name=shippingMethod]', form).forEach(function (r) { r.addEventListener('change', syncShip); });
    syncShip();

    function setErr(name, on) {
      var f = form.querySelector('[name=' + name + ']');
      if (!f) return;
      f.closest('.field').classList.toggle('has-error', on);
    }
    function validate() {
      var v = function (n) { return (form.elements[n].value || '').trim(); };
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
    form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f) f.classList.remove('has-error'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cart.length) { toast(T('js.emptyCart'), 'error'); return; }
      if (cart.some(function (i) { return i.inStock === false; })) { toast(T('js.removeUnavailable'), 'error'); return; }
      var bad = validate();
      if (bad) { form.elements[bad].focus(); toast(T('checkout.fixErrors'), 'error'); return; }
      var fd = new FormData(form);
      var payload = {
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), city: fd.get('city'), warehouse: fd.get('warehouse'),
        shippingMethod: fd.get('shippingMethod'), payment: fd.get('payment'), comment: fd.get('comment'),
        items: cart.map(function (i) { return { id: i.id, qty: i.qty, size: i.size || '' }; }),
      };
      var btn = $('#checkoutSubmit'); btn.classList.add('is-loading'); btn.disabled = true;
      api('/orders', { method: 'POST', body: payload }).then(function (r) {
        if (r.ok && r.body.ok) {
          store(CART_KEY, []);
          location.href = r.body.redirect;
          return;
        }
        btn.classList.remove('is-loading'); btn.disabled = false;
        if (r.status === 403) { toast(T('js.csrf'), 'error'); return; }
        if (r.status === 429) { toast(T('js.tooMany'), 'error'); return; }
        var errs = (r.body && r.body.errors) || {};
        Object.keys(errs).forEach(function (k) { setErr(k, true); });
        if (errs.items) { lastSync = 0; syncCart(true, true); }
        toast((r.body && r.body.error) || T('js.orderError'), 'error');
      }).catch(function () { btn.classList.remove('is-loading'); btn.disabled = false; toast(T('js.networkError'), 'error'); });
    });
  }

  document.addEventListener('submit', function (e) {
    var news = e.target.closest('[data-news]');
    if (news) {
      e.preventDefault();
      var input = news.querySelector('input[name=email]');
      var btn = news.querySelector('button[type=submit]');
      btn.disabled = true;
      api('/subscribe', { method: 'POST', body: { email: input.value } }).then(function (r) {
        btn.disabled = false;
        if (r.ok && r.body.ok) { toast(T('nl.done'), 'success'); news.reset(); }
        else toast(r.status === 429 ? T('js.tooMany') : T('nl.error'), 'error');
      }).catch(function () { btn.disabled = false; toast(T('js.networkError'), 'error'); });
      return;
    }
    var contact = e.target.closest('[data-contact]');
    if (contact) {
      e.preventDefault();
      var fd = new FormData(contact);
      var b = contact.querySelector('button[type=submit]'); b.classList.add('is-loading'); b.disabled = true;
      api('/contact', { method: 'POST', body: { name: fd.get('name'), contact: fd.get('contact'), message: fd.get('message'), website: fd.get('website') } }).then(function (r) {
        b.classList.remove('is-loading'); b.disabled = false;
        if (r.ok && r.body.ok) { toast(T('contacts.sent'), 'success'); contact.reset(); }
        else toast(r.status === 429 ? T('js.tooMany') : T('contacts.fill'), 'error');
      }).catch(function () { b.classList.remove('is-loading'); b.disabled = false; toast(T('js.networkError'), 'error'); });
    }
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
    $$('[data-count]').forEach(function (el) {
      var target = +el.dataset.count, start = null, dur = 1200;
      if (!target) return;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- init */
  function init() {
    loadCart();
    loadFavs();
    renderCartUI();
    paintFavs();
    initProduct();
    initCatalog();
    initCheckout();
    initRecent();
    initReveal();
    initCounters();
    if (cart.length && (C.page === 'cart' || C.page === 'checkout')) syncCart(true);
    else if (cart.length) syncCart(false);
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY || e.key === FAV_KEY) { loadCart(); loadFavs(); renderCartUI(); paintFavs(); } });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { loadCart(); renderCartUI(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
