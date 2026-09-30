(function () {
  'use strict';

  var CURRENCY = window.__CUR || '₴';
  var FREE_FROM = window.__FREE || 0;
  var LANG = window.__LANG || 'uk';
  var PREFIX = window.__PREFIX || '';
  var DICT = window.__T || {};
  var CART_KEY = 'onika_cart_v1';
  var FAV_KEY = 'onika_fav_v1';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function T(key, vars) {
    var v = DICT[key];
    if (v === undefined) return key;
    if (Array.isArray(v)) v = v[0];
    if (vars) for (var k in vars) v = v.split('{' + k + '}').join(vars[k]);
    return v;
  }
  function money(n) {
    return (Number(n) || 0).toLocaleString('uk-UA').replace(/\u00a0/g, ' ') + ' ' + CURRENCY;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------- language dropdown ------------------------ */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.lang-toggle');
    if (toggle) {
      var sw = toggle.closest('.lang-switch');
      var open = sw.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    var opt = e.target.closest('.lang-opt');
    if (opt) {
      e.preventDefault();
      var targetLang = opt.dataset.lang || 'uk';
      document.cookie = 'lang=' + targetLang + '; path=/; max-age=31536000; samesite=lax';
      var currentSearch = window.location.search;
      var pathname = window.location.pathname;
      // Strip current language prefix if present
      pathname = pathname.replace(/^\/(ru|en)(?=\/|$)/, '') || '/';
      var newPath = (targetLang === 'uk' ? '' : '/' + targetLang) + (pathname === '/' && targetLang !== 'uk' ? '' : pathname);
      if (!newPath) newPath = '/';
      window.location.href = newPath + currentSearch;
      return;
    }
    if (!e.target.closest('.lang-switch')) {
      $$('.lang-switch.open').forEach(function (s) { s.classList.remove('open'); });
    }
    var accToggle = e.target.closest('.account-toggle');
    if (accToggle) {
      var am = accToggle.closest('.account-menu');
      var open = am.classList.toggle('open');
      accToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    if (!e.target.closest('.account-menu')) {
      $$('.account-menu.open').forEach(function (m) { m.classList.remove('open'); });
    }
  });

  /* ----------------------------- toast ----------------------------- */
  var TOAST_ICONS = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  };
  function toast(msg, type, link) {
    var wrap = $('#toasts');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML =
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      (TOAST_ICONS[type] || TOAST_ICONS.info) + '</svg><span>' + esc(msg) + '</span>' +
      (link ? '<a href="' + PREFIX + '/checkout">' + esc(T('js.checkout')) + '</a>' : '');
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(function () { el.remove(); }, 320);
    }, 3200);
  }

  /* ------------------------------ cart ------------------------------ */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }
  function cartCount() {
    return getCart().reduce(function (s, i) { return s + i.qty; }, 0);
  }
  function addItem(item) {
    var cart = getCart();
    var found = cart.find(function (i) { return i.id === item.id && (i.size || '') === (item.size || ''); });
    if (found) found.qty += item.qty || 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, size: item.size || '', qty: item.qty || 1 });
    setCart(cart);
  }

  function updateCartUI() {
    var count = cartCount();
    var badge = $('#cartCount');
    if (badge) { badge.textContent = count; badge.setAttribute('data-empty', count ? '0' : '1'); }
    renderDrawer();
    renderCartPage();
    renderCheckoutSummary();
  }

  function itemHtml(it) {
    return (
      '<div class="cart-item">' +
      '<img class="thumb" src="' + esc(absImg(it.image)) + '" alt="" loading="lazy">' +
      '<div class="ci-body">' +
      '<div class="ci-name">' + esc(it.name) + (it.size ? ' <span class="muted small">· ' + esc(it.size) + '</span>' : '') + '</div>' +
      '<div class="mini-qty">' +
      '<button type="button" data-qty="dec" data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '">−</button>' +
      '<input type="number" value="' + it.qty + '" min="1" data-qty-input data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '">' +
      '<button type="button" data-qty="inc" data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '">+</button>' +
      '</div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">' +
      '<div class="ci-price">' + money(it.price * it.qty) + '</div>' +
      '<button class="ci-remove" data-remove data-id="' + esc(it.id) + '" data-size="' + esc(it.size || '') + '" aria-label="' + esc(T('common.remove')) + '">' +
      '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      '</button></div></div>'
    );
  }

  function freeShipHtml(subtotal) {
    if (!FREE_FROM) return '';
    if (subtotal >= FREE_FROM) {
      return '<p style="color:var(--green);font-weight:600">' + esc(T('cart.freeNow')) + '</p><div class="track"><div class="fill" style="width:100%"></div></div>';
    }
    var pct = Math.min(100, Math.round((subtotal / FREE_FROM) * 100));
    return '<p>' + esc(T('cart.freeMore', { amount: money(FREE_FROM - subtotal) })) + '</p>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%"></div></div>';
  }

  function renderDrawer() {
    var wrap = $('#cartItems');
    var foot = $('#cartFoot');
    if (!wrap || !foot) return;
    var cart = getCart();
    if (!cart.length) {
      wrap.innerHTML =
        '<div class="empty-state" style="border:none;padding:50px 10px">' +
        '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
        '<h3>' + esc(T('cart.empty')) + '</h3><p>' + esc(T('cart.emptyText')) + '</p><a href="' + PREFIX + '/catalog" class="btn">' + esc(T('cart.toCatalog')) + '</a></div>';
      foot.style.display = 'none';
      return;
    }
    foot.style.display = '';
    var subtotal = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    wrap.innerHTML = cart.map(function (i) { return itemHtml(i); }).join('');
    var fs = $('#freeShip');
    if (fs) fs.innerHTML = freeShipHtml(subtotal);
    var st = $('#cartSubtotal');
    if (st) st.textContent = money(subtotal);
  }

  function renderCartPage() {
    var wrap = $('#cartPageContent');
    if (!wrap) return;
    var cart = getCart();
    if (!cart.length) {
      wrap.innerHTML =
        '<div class="empty-state"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
        '<h3>' + esc(T('js.cartEmptyTitle')) + '</h3><p>' + esc(T('cartPage.emptyText')) + '</p><a href="' + PREFIX + '/catalog" class="btn">' + esc(T('cart.toCatalog')) + '</a></div>';
      return;
    }
    var subtotal = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var freeShip = FREE_FROM && subtotal >= FREE_FROM;
    var shipText = freeShip ? esc(T('common.free')) : esc(T('cartPage.byCarrier'));
    wrap.innerHTML =
      '<div class="checkout-grid" style="padding:0">' +
      '<div><div class="card" style="padding:10px 26px">' + cart.map(function (i) { return itemHtml(i); }).join('') + '</div>' +
      '<a href="' + PREFIX + '/catalog" class="link-arrow" style="margin-top:22px;display:inline-flex">' + esc(T('cart.continue')) + '</a></div>' +
      '<aside class="card order-summary"><h2>' + esc(T('cartPage.total')) + '</h2>' +
      '<div class="summary-row"><span>' + esc(T('cartPage.items', { n: cartCount() })) + '</span><b>' + money(subtotal) + '</b></div>' +
      '<div class="summary-row"><span>' + esc(T('cartPage.delivery')) + '</span><b>' + shipText + '</b></div>' +
      '<div class="summary-row total"><span>' + esc(T('cartPage.toPay')) + '</span><span>' + money(subtotal) + '</span></div>' +
      '<a href="' + PREFIX + '/checkout" class="btn btn-block" style="margin-top:16px">' + esc(T('cart.checkout')) + '</a></aside></div>';
  }

  function renderCheckoutSummary() {
    var wrap = $('#checkoutSummary');
    if (!wrap) return;
    var cart = getCart();
    if (!cart.length) {
      wrap.innerHTML = '<div class="empty-state" style="border:none;padding:20px 0"><p>' + esc(T('checkout.emptyCart')) + '</p><a href="' + PREFIX + '/catalog" class="btn btn-sm">' + esc(T('cart.toCatalog')) + '</a></div>';
      var f = $('#checkoutForm');
      if (f) $$('button[type=submit], input, textarea, select', f).forEach(function (el) { el.disabled = true; });
      return;
    }
    var subtotal = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var freeShip = isPickup() || (FREE_FROM && subtotal >= FREE_FROM);
    var shipText = freeShip ? esc(T('common.free')) : esc(T('cartPage.byCarrier'));
    wrap.innerHTML =
      cart.map(function (it) {
        return '<div class="os-item"><img src="' + esc(absImg(it.image)) + '" alt="" loading="lazy"><div><div class="n">' + esc(it.name) + (it.size ? ' <span class="muted">· ' + esc(it.size) + '</span>' : '') + '</div><div class="small muted">' + it.qty + ' × ' + money(it.price) + '</div></div><div class="p">' + money(it.price * it.qty) + '</div></div>';
      }).join('') +
      '<div class="summary-row" style="margin-top:16px"><span>' + esc(T('cartPage.delivery')) + '</span><b>' + shipText + '</b></div>' +
      '<div class="summary-row total"><span>' + esc(T('cartPage.toPay')) + '</span><span>' + money(subtotal) + '</span></div>';
  }

  /* ------------------------- drawers (cart/fav/nav) ------------------- */
  function anyOverlayOpen() {
    return ($('#cartDrawer') && $('#cartDrawer').classList.contains('on')) ||
      ($('#favDrawer') && $('#favDrawer').classList.contains('on')) ||
      ($('#mobileNav') && $('#mobileNav').classList.contains('on'));
  }
  function syncOverlay() {
    var o = $('#overlay');
    if (anyOverlayOpen()) {
      if (o) o.classList.add('on');
      document.body.style.overflow = 'hidden';
    } else {
      if (o) o.classList.remove('on');
      document.body.style.overflow = '';
    }
  }
  function openDrawer() {
    var d = $('#cartDrawer');
    closeFav();
    var nav = $('#mobileNav'); if (nav) nav.classList.remove('on');
    if (d) d.classList.add('on');
    syncOverlay();
  }
  function closeDrawer() {
    var d = $('#cartDrawer');
    if (d) d.classList.remove('on');
    syncOverlay();
  }
  function closeAll() {
    var d = $('#cartDrawer'); if (d) d.classList.remove('on');
    var f = $('#favDrawer'); if (f) f.classList.remove('on');
    var nav = $('#mobileNav'); if (nav) nav.classList.remove('on');
    syncOverlay();
  }

  /* ---------------------------- favorites --------------------------- */
  function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; }
  }
  function toggleFav(id) {
    var favs = getFavs();
    var i = favs.indexOf(id);
    if (i > -1) { favs.splice(i, 1); toast(T('js.removedFav'), 'info'); }
    else { favs.push(id); toast(T('js.addedFav'), 'success'); }
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    $$('[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('on', favs.indexOf(id) > -1); });
    syncFavBtn();
  }
  function syncFavBtn() {
    var n = getFavs().length;
    var b = $('#favBtn');
    if (b) {
      var c = b.querySelector('.cart-count');
      if (!c) { c = document.createElement('span'); c.className = 'cart-count'; b.appendChild(c); }
      c.textContent = n; c.setAttribute('data-empty', n ? '0' : '1');
    }
  }
  function syncFavs() {
    var favs = getFavs();
    favs.forEach(function (id) {
      $$('[data-fav="' + id + '"]').forEach(function (b) { b.classList.add('on'); });
    });
    syncFavBtn();
  }

  /* --------------------------- favorites drawer ----------------------- */
  function absImg(src) {
    // cart/fav store raw "images/xxx.jpg" (no leading slash) -> make absolute so it works on /ru, /en, /product/...
    if (!src) return '';
    if (/^(https?:|data:|\/\/|blob:)/.test(src)) return src;
    return src.charAt(0) === '/' ? src : PREFIX + '/' + src;
  }
  function favItemHtml(it) {
    return (
      '<div class="cart-item">' +
      '<img class="thumb" src="' + esc(absImg(it.image)) + '" alt="" loading="lazy">' +
      '<div class="ci-body"><div class="ci-name">' + esc(it.name) + '</div>' +
      '<div class="ci-price">' + money(it.price) + '</div>' +
      '<div><button class="btn btn-sm" data-add="' + esc(it.id) + '" data-name="' + esc(it.name) + '" data-price="' + it.price + '" data-img="' + esc(absImg(it.image)) + '">' + esc(T('common.toCart')) + '</button> ' +
      '<button class="btn btn-ghost btn-sm" data-unfav="' + esc(it.id) + '">' + esc(T('common.remove')) + '</button></div></div></div>'
    );
  }
  function renderFav() {
    var wrap = $('#favItems');
    var ids = getFavs();
    if (!wrap) return;
    if (!ids.length) {
      wrap.innerHTML = '<div class="empty-state" style="border:none;padding:40px 10px"><h3>' + esc(T('js.favEmpty')) + '</h3><p>' + esc(T('cart.emptyText')) + '</p></div>';
      return;
    }
    fetch(PREFIX + '/api/products?perPage=100000')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var items = (j.items || j || []).filter(function (p) { return ids.indexOf(String(p.id)) > -1; });
        wrap.innerHTML = items.length
          ? items.map(function (p) {
              var imgs = p.images || [];
              return favItemHtml({ id: String(p.id), name: p.name, price: p.price, image: imgs[0] || '' });
            }).join('')
          : '<div class="empty-state" style="border:none;padding:40px 10px"><h3>' + esc(T('js.favEmpty')) + '</h3></div>';
      })
      .catch(function () {
        wrap.innerHTML = ids.map(function (id) { return favItemHtml({ id: id, name: id, price: 0, image: '' }); }).join('');
      });
  }
  function openFav() {
    var d = $('#favDrawer');
    closeDrawer();
    var nav = $('#mobileNav'); if (nav) nav.classList.remove('on');
    if (d) d.classList.add('on');
    syncOverlay();
    renderFav();
  }
  function closeFav() {
    var d = $('#favDrawer');
    if (d) d.classList.remove('on');
    syncOverlay();
  }

  /* ----------------------------- events ---------------------------- */
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      addItem({ id: add.dataset.add, name: add.dataset.name, price: parseFloat(add.dataset.price), image: add.dataset.img, qty: 1 });
      toast(T('js.addedCart'), 'success', true);
      openDrawer();
      return;
    }
    var unfav = e.target.closest('[data-unfav]');
    if (unfav) {
      var favs = getFavs().filter(function (x) { return String(x) !== String(unfav.dataset.unfav); });
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
      syncFavBtn();
      renderFav();
      return;
    }
    var fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(fav.dataset.fav); renderFav(); return; }

    var rm = e.target.closest('[data-remove]');
    if (rm) {
      setCart(getCart().filter(function (i) { return !(i.id === rm.dataset.id && (i.size || '') === (rm.dataset.size || '')); }));
      return;
    }
    var q = e.target.closest('[data-qty]');
    if (q) {
      var dir = q.dataset.qty === 'inc' ? 1 : -1;
      var cart2 = getCart();
      var it = cart2.find(function (i) { return i.id === q.dataset.id && (i.size || '') === (q.dataset.size || ''); });
      if (it) { it.qty = Math.max(1, it.qty + dir); setCart(cart2); }
      return;
    }
    if (e.target.closest('#cartBtn')) { anyOverlayOpen() && $('#cartDrawer') && $('#cartDrawer').classList.contains('on') ? closeDrawer() : openDrawer(); return; }
    if (e.target.closest('#closeCart') || e.target.closest('#continueShopping')) { closeDrawer(); return; }
    if (e.target.closest('#overlay')) { closeAll(); return; }
    if (e.target.closest('#favBtn')) { $('#favDrawer') && $('#favDrawer').classList.contains('on') ? closeFav() : openFav(); return; }
    if (e.target.closest('#closeFav')) { closeFav(); return; }
    if (e.target.closest('#burger')) { closeDrawer(); closeFav(); $('#mobileNav').classList.add('on'); syncOverlay(); return; }
    if (e.target.closest('#mobileClose')) { var nav = $('#mobileNav'); if (nav) nav.classList.remove('on'); syncOverlay(); return; }

    var accHead = e.target.closest('.acc-head');
    if (accHead) { accHead.parentElement.classList.toggle('open'); return; }

    var payOpt = e.target.closest('.pay-opt');
    if (payOpt) {
      $$('.pay-opt').forEach(function (p) { p.classList.remove('active'); });
      payOpt.classList.add('active');
      var r = payOpt.querySelector('input'); if (r) r.checked = true;
      return;
    }
    if (e.target.closest('#filterToggle')) { $('#filterCollapse').classList.toggle('open'); return; }
  });

  /* Esc closes any drawer/nav; overlay click handled above */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (anyOverlayOpen()) { closeAll(); return; }
      $$('.lang-switch.open').forEach(function (s) { s.classList.remove('open'); });
      $$('.account-menu.open').forEach(function (m) { m.classList.remove('open'); });
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-qty-input]')) {
      var v = Math.max(1, parseInt(e.target.value, 10) || 1);
      var cart = getCart();
      var it = cart.find(function (i) { return i.id === e.target.dataset.id && (i.size || '') === (e.target.dataset.size || ''); });
      if (it) { it.qty = v; setCart(cart); }
    }
  });

  /* ----------------------------- forms ----------------------------- */
  function postJSON(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }

  document.addEventListener('submit', function (e) {
    var news = e.target.closest('[data-news]');
    if (news) {
      e.preventDefault();
      postJSON('/api/subscribe', { email: news.querySelector('input[name=email]').value }).then(function (r) {
        if (r.body.ok) { toast(T('nl.done'), 'success'); news.reset(); } else toast(T('nl.error'), 'error');
      });
      return;
    }
    var contact = e.target.closest('[data-contact]');
    if (contact) {
      e.preventDefault();
      var fd = new FormData(contact);
      postJSON('/api/contact', { name: fd.get('name'), contact: fd.get('contact'), message: fd.get('message') }).then(function (r) {
        if (r.body.ok) { toast(T('contacts.sent'), 'success'); contact.reset(); } else toast(T('contacts.fill'), 'error');
      });
      return;
    }
    var checkout = e.target.closest('#checkoutForm');
    if (checkout) {
      e.preventDefault();
      var cart = getCart();
      if (!cart.length) { toast(T('js.emptyCart'), 'error'); return; }
      var fd2 = new FormData(checkout);
      var payload = {
        name: fd2.get('name'), phone: fd2.get('phone'), email: fd2.get('email'),
        city: fd2.get('city'), warehouse: fd2.get('warehouse'),
        shippingMethod: fd2.get('shippingMethod'), payment: fd2.get('payment'), comment: fd2.get('comment'),
        items: cart.map(function (i) { return { id: i.id, qty: i.qty, size: i.size, price: i.price, name: i.name, image: i.image }; }),
      };
      var btn = checkout.querySelector('button[type=submit]');
      var original = btn.innerHTML;
      btn.disabled = true; btn.textContent = T('js.sending');
      postJSON('/api/orders', payload).then(function (r) {
        if (r.body.ok) {
          localStorage.removeItem(CART_KEY);
          window.location.href = PREFIX + '/order/' + r.body.order.id + '?token=' + r.body.order.token;
        } else {
          toast(r.body.error || T('js.orderError'), 'error');
          btn.disabled = false; btn.innerHTML = original;
        }
      }).catch(function () {
        toast(T('js.networkError'), 'error');
        btn.disabled = false; btn.innerHTML = original;
      });
      return;
    }
  });

  /* -------------------------- load more ---------------------------- */
  function initLoadMore() {
    var btn = $('#loadMoreBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = parseInt(btn.dataset.page, 10) + 1;
      var pages = parseInt(btn.dataset.pages, 10);
      var params = new URLSearchParams(window.location.search);
      params.set('page', next);
      // keep category slug path: /catalog/<slug>?page=N (filters already in query)
      var cardsUrl = window.location.pathname.replace(/^\/(ru|en)(?=\/|$)/, '');
      if (!/^\/catalog(\/|$)/.test(cardsUrl)) cardsUrl = '/catalog';
      btn.disabled = true;
      btn.textContent = T('catalog.loading');
      fetch(PREFIX + cardsUrl + '/cards?' + params.toString())
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var grid = $('#productGrid');
          if (grid) grid.insertAdjacentHTML('beforeend', html);
          // cards arrive without reveal; show immediately + sync fav hearts
          $$('#productGrid .reveal').forEach(function (el) { el.classList.add('in'); });
          syncFavs();
          btn.dataset.page = next;
          if (next >= pages) btn.remove();
          else { btn.disabled = false; btn.textContent = T('catalog.loadMore'); }
        })
        .catch(function () { btn.disabled = false; btn.textContent = T('catalog.loadMore'); });
    });
  }

  /* ---------------------------- gallery ---------------------------- */
  function initGallery() {
    var main = $('#galleryMain');
    if (!main) return;
    $$('#galleryThumbs [data-thumb]').forEach(function (t) {
      t.addEventListener('click', function () {
        var img = t.querySelector('img');
        var src = img.getAttribute('src');
        // thumbs are small (w=200) — load big version for main
        var big = src.replace(/([?&])w=\d+/, '$1w=1000');
        var pre = new Image();
        pre.onload = function () { main.setAttribute('src', big); main.style.opacity = '1'; };
        main.style.opacity = '0';
        pre.src = big;
        setTimeout(function () { if (main.getAttribute('src') !== big) { main.setAttribute('src', big); main.style.opacity = '1'; } }, 600);
        $$('#galleryThumbs .gthumb').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
      });
    });
    var zoom = document.querySelector('.gallery-main .zoom-hint');
    main.parentElement.addEventListener('click', function () {
      if (main.dataset.zoom === '1') {
        main.style.transform = ''; main.style.cursor = 'zoom-in'; main.dataset.zoom = '0';
      } else {
        main.style.transform = 'scale(1.8)'; main.style.cursor = 'zoom-out'; main.dataset.zoom = '1';
      }
    });
    if (zoom) zoom.addEventListener('click', function (ev) { ev.stopPropagation(); });
  }

  function initProductBuy() {
    var btn = $('#addToCartBtn');
    if (!btn) return;
    var dataEl = $('#productData');
    var product = {};
    try { product = JSON.parse(dataEl.textContent); } catch (e) {}
    var qty = $('#qtyInput');
    $$('[data-qminus]').forEach(function (b) { b.addEventListener('click', function () { qty.value = Math.max(1, (+qty.value || 1) - 1); }); });
    $$('[data-qplus]').forEach(function (b) { b.addEventListener('click', function () { qty.value = (+qty.value || 1) + 1; }); });
    $$('input[name=size]').forEach(function (r) {
      r.addEventListener('change', function () {
        var lbl = $('[data-size-label]');
        if (lbl) lbl.textContent = r.value;
      });
    });
    btn.addEventListener('click', function () {
      var size = ($('input[name=size]:checked') || {}).value || '';
      addItem({ id: product.id, name: product.name, price: product.price, image: product.image, size: size, qty: Math.max(1, parseInt(qty.value, 10) || 1) });
      toast(T('js.addedCart'), 'success', true);
      openDrawer();
    });
  }

  /* --------------------------- scroll/reveal ------------------------ */
  function initReveal() {
    var els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function initHeader() {
    var h = $('#siteHeader');
    function onScroll() {
      if (!h) return;
      if (window.scrollY > 20) h.classList.add('scrolled');
      else h.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initFilters() {
    var toggle = $('#filterToggle');
    if (toggle) {
      if (window.innerWidth < 760) toggle.style.display = 'inline-flex';
      window.addEventListener('resize', function () {
        toggle.style.display = window.innerWidth < 760 ? 'inline-flex' : 'none';
      });
    }
  }

  /* city/warehouse optional for pickup */
  function isPickup() {
    var form = $('#checkoutForm');
    var ship = form && form.querySelector('[name="shippingMethod"]');
    if (!ship) return false;
    var opts = ship.options;
    if (ship.selectedIndex === opts.length - 1) return true;
    var cur = opts[ship.selectedIndex];
    return /self|pickup|само|самови/i.test(ship.value + ' ' + (cur ? cur.text : ''));
  }
  function initCheckoutPickup() {
    var form = $('#checkoutForm');
    if (!form) return;
    var ship = form.querySelector('[name="shippingMethod"]');
    var city = form.querySelector('[name="city"]');
    if (!ship || !city) return;
    var cityWrap = city.closest('.form-grid');
    var cityLabel = city.closest('.field');
    var wh = form.querySelector('[name="warehouse"]');
    var whLabel = wh ? wh.closest('.field') : null;
    function sync() {
      var pickup = isPickup();
      renderCheckoutSummary();
      if (pickup) {
        city.removeAttribute('required');
        if (cityWrap) cityWrap.style.display = 'none';
      } else {
        city.setAttribute('required', '');
        if (cityWrap) cityWrap.style.display = '';
        if (cityLabel) { var r = cityLabel.querySelector('.req'); if (r) r.style.display = ''; }
        if (whLabel) whLabel.style.display = '';
      }
    }
    ship.addEventListener('change', sync);
    sync();
  }

  function init() {
    updateCartUI();
    syncFavs();
    initGallery();
    initProductBuy();
    initLoadMore();
    initReveal();
    initHeader();
    initFilters();
    initCheckoutPickup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
