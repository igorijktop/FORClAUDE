'use strict';

const store = require('./store');
const ui = require('./ui');
const i18n = require('./i18n');
const { icon, esc, money, img } = ui;
const t = i18n.t;

const STATUS = {
  new: { key: 'admin.status.new', color: '#9c2543' },
  confirmed: { key: 'admin.status.confirmed', color: '#b45309' },
  shipped: { key: 'admin.status.shipped', color: '#1d4ed8' },
  done: { key: 'admin.status.done', color: '#2f7d5b' },
  cancelled: { key: 'admin.status.cancelled', color: '#857b72' },
};

function statusLabel(key) {
  return t(STATUS[key] ? STATUS[key].key : 'admin.status.new');
}

function adminHead(title) {
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — ONIKA Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  <link rel="stylesheet" href="${ui.asset('/css/styles.css')}">
  <link rel="stylesheet" href="${ui.asset('/css/admin.css')}">`;
}

function sidebar(active) {
  const links = [
    ['/admin', 'dashboard', t('admin.dashboard')],
    ['/admin/products', 'box', t('admin.products')],
    ['/admin/categories', 'tag', t('admin.categories')],
    ['/admin/brands', 'star', t('admin.brands')],
    ['/admin/orders', 'truck', t('admin.orders')],
    ['/admin/clients', 'user', t('admin.clients')],
    ['/admin/subscribers', 'mail', t('admin.subscribers')],
    ['/admin/trash', 'trash', t('admin.trash')],
    ['/admin/settings', 'settings', t('admin.settings')],
  ];
  return `
  <aside class="a-sidebar" id="aSidebar">
    <a href="/admin" class="a-brand a-brand-logo">
      <img src="/logo.png" alt="ONIKA" class="a-logo-inv">
      <span class="a-brand-tag">admin panel</span>
    </a>
    <nav class="a-nav">
      ${links
        .map(([href, ic, label]) => `<a href="${href}" class="${active === href ? 'on' : ''}">${icon(ic)}<span>${esc(label)}</span></a>`)
        .join('')}
    </nav>
    <div class="a-side-foot">
      ${ui.langSwitch()}
      <a href="/" target="_blank" class="a-view-site">${icon('eye')} ${esc(t('common.openSite'))}</a>
      <a href="/admin/logout" class="a-logout">${icon('logout')} ${esc(t('common.logout'))}</a>
    </div>
  </aside>`;
}

function adminLayout(opts) {
  return `<!doctype html>
<html lang="${i18n.getLang()}">
<head>${adminHead(opts.title)}</head>
<body class="admin">
  <div class="a-shell">
    ${sidebar(opts.active)}
    <div class="a-main">
      <header class="a-topbar">
        <button class="icon-btn a-burger" id="aBurger">${icon('menu')}</button>
        <h1>${esc(opts.title)}</h1>
        <div class="a-top-actions">
          ${ui.langSwitch()}
          <a href="/" target="_blank" class="btn btn-ghost btn-sm">${icon('eye')} <span>${esc(t('common.openSite'))}</span></a>
          <a href="/admin/logout" class="btn btn-ghost btn-sm">${icon('logout')} <span>${esc(t('common.logout'))}</span></a>
        </div>
      </header>
      <div class="a-content">${opts.body}</div>
    </div>
  </div>
  <div class="a-overlay" id="aOverlay"></div>
  <div class="toast-wrap" id="toasts"></div>
  <script>window.__CSRF='${esc(opts.csrf || '')}';window.__PREFIX='${i18n.getLang() === 'uk' ? '' : '/' + i18n.getLang()}';window.__T={translateEmpty:'${esc(t('admin.translateEmpty'))}',translateError:'${esc(t('admin.translateError'))}',translateDone:'${esc(t('admin.translateDone'))}',translateWait:'${esc(t('admin.translateWait'))}'};</script>
  <script src="${ui.asset('/js/admin.js')}" defer></script>
</body>
</html>`;
}

function flash(query) {
  if (!query) return '';
  if (query.saved) return `<div class="a-flash ok">${icon('check')} ${esc(t('admin.saved'))}</div>`;
  if (query.deleted) return `<div class="a-flash ok">${icon('check')} ${esc(t('admin.deleted'))}</div>`;
  if (query.error === 'notempty') return `<div class="a-flash err">${icon('x')} ${esc(t('admin.catNotEmpty'))}</div>`;
  if (query.error === 'pass') return `<div class="a-flash err">${icon('x')} ${esc(t('admin.wrongCurrent'))}</div>`;
  if (query.restored) return `<div class="a-flash ok">${icon('check')} ${esc(t('admin.restoredMsg'))}</div>`;
  if (query.purged) return `<div class="a-flash ok">${icon('check')} ${esc(t('admin.purgedMsg'))}</div>`;
  if (query.backup) return `<div class="a-flash ok">${icon('check')} ${esc(t('admin.backupCreated'))}</div>`;
  if (query.error === 'backup') return `<div class="a-flash err">${icon('x')} ${esc(t('admin.backupFailed'))}</div>`;
  return '';
}

function loginPage(req, error) {
  return `<!doctype html>
<html lang="${i18n.getLang()}">
<head>${adminHead(t('admin.loginTitle'))}</head>
<body class="admin-auth">
  <div class="auth-page">
    <form class="auth-card" method="post" action="/admin/login">
      <div class="a-lang-top">${ui.langSwitch()}</div>
      <a href="/" class="brand brand-logo auth-logo"><img src="/logo.png" alt="ONIKA"></a>
      <h1>${esc(t('admin.loginTitle'))}</h1>
      <p class="sub">${esc(t('admin.loginSub'))}</p>
      ${error ? `<div class="a-flash err" style="margin-bottom:18px">${icon('x')} ${esc(t('admin.wrongPass'))}</div>` : ''}
      <div class="form-grid">
        <div class="field"><label>${esc(t('admin.login'))}</label><input name="user" required autofocus value="admin"></div>
        <div class="field"><label>${esc(t('admin.password'))}</label><input type="password" name="password" required></div>
        <button class="btn btn-block" type="submit">${esc(t('admin.enter'))} ${icon('arrow')}</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

function statCard(iconName, label, value, sub, color) {
  return `
  <div class="a-stat">
    <span class="a-stat-ic" style="background:${color}1a;color:${color}">${icon(iconName)}</span>
    <div>
      <div class="a-stat-val">${value}</div>
      <div class="a-stat-label">${esc(label)}</div>
      ${sub ? `<div class="a-stat-sub">${esc(sub)}</div>` : ''}
    </div>
  </div>`;
}

function dashboard(req) {
  const s = store.stats();
  const products = store.getProducts({ perPage: 6, sort: 'new' }).items;

  const recentRows = s.recentOrders.length
    ? s.recentOrders
        .map((o) => {
          const st = STATUS[o.status] || STATUS.new;
          return `<tr>
            <td><a href="/admin/orders" class="a-link">#${esc(o.id)}</a></td>
            <td>${esc(o.customer.name || '—')}</td>
            <td>${esc(o.customer.phone || '—')}</td>
            <td><b>${money(o.total, '₴')}</b></td>
            <td><span class="a-badge" style="background:${st.color}1a;color:${st.color}">${esc(statusLabel(o.status))}</span></td>
            <td class="muted small">${new Date(o.createdAt).toLocaleDateString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA')}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="6" class="a-empty">${esc(t('admin.noOrders'))}</td></tr>`;

  const body = `
  <div class="a-grid-stats">
    ${statCard('box', t('admin.productsCatalog'), s.products, s.outOfStock + ' ' + t('admin.noStock'), '#9c2543')}
    ${statCard('truck', t('admin.ordersTotal'), s.orders, s.newOrders + ' ' + t('admin.newOrders'), '#1d4ed8')}
    ${statCard('tag', t('admin.revenue'), money(s.revenue, '₴'), t('admin.noCancelled'), '#2f7d5b')}
    ${statCard('tag', t('admin.categoriesCount'), s.categories, '', '#b45309')}
  </div>

  <div class="a-panels">
    <div class="a-panel">
      <div class="a-panel-head">
        <h2>${esc(t('admin.recentOrders'))}</h2>
        <a href="/admin/orders" class="a-link">${esc(t('admin.allOrders'))} ${icon('arrow')}</a>
      </div>
      <div class="a-table-wrap">
        <table class="a-table">
          <thead><tr><th>№</th><th>${esc(t('admin.client'))}</th><th>${esc(t('admin.phone'))}</th><th>${esc(t('admin.sum'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('admin.date'))}</th></tr></thead>
          <tbody>${recentRows}</tbody>
        </table>
      </div>
    </div>

    <div class="a-panel">
      <div class="a-panel-head">
        <h2>${esc(t('admin.popularProducts'))}</h2>
        <a href="/admin/products" class="a-link">${esc(t('admin.products'))} ${icon('arrow')}</a>
      </div>
      <div class="a-list">
        ${s.topProducts
          .map(
            (p) => `
          <div class="a-list-item">
            <img src="${img(p.images[0])}" alt="">
            <div style="flex:1;min-width:0">
              <div class="a-list-name">${esc(i18n.productName(p))}</div>
              <div class="small muted">${esc(p.brand || i18n.categoryName(p.category))} · ${p.views || 0} ${esc(t('admin.views'))}</div>
            </div>
            <b class="small">${money(p.price, '₴')}</b>
          </div>`
          )
          .join('') || `<div class="a-empty">${esc(t('admin.noData'))}</div>`}
      </div>
      <div class="a-panel-head" style="margin-top:20px;border-top:1px solid var(--line);padding-top:20px">
        <h2>${esc(t('admin.newArrivals'))}</h2>
      </div>
      <div class="a-list">
        ${products
          .slice(0, 4)
          .map(
            (p) => `
          <div class="a-list-item">
            <img src="${img(p.images[0])}" alt="">
            <div style="flex:1;min-width:0">
              <div class="a-list-name">${esc(i18n.productName(p))}</div>
              <div class="small muted">${esc(i18n.categoryName(p.category))}</div>
            </div>
            <a class="a-icon-btn" href="/admin/products/${encodeURIComponent(p.id)}/edit">${icon('edit')}</a>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </div>`;
  return adminLayout({ title: t('admin.dashboard'), active: '/admin', csrf: req.csrf, body });
}

function productsPage(req, query) {
  const f = {
    q: query.q || '',
    category: query.category || '',
    brand: query.brand || '',
    sort: query.sort || 'new',
    page: parseInt(query.page, 10) || 1,
    perPage: 30,
    includeInactive: true,
  };
  const hiddenCount = store.getHiddenCount();
  const result = store.getProducts(f);
  const categories = store.getAllCategories();

  const rows = result.items
    .map((p) => {
      const full = store.getProduct(p.id);
      const active = full.active !== false;
      return `<tr class="${active ? '' : 'a-row-off'}">
        <td><img class="a-thumb" src="${img(p.images[0])}" alt=""></td>
        <td>
          <div class="a-prod-name">${esc(i18n.productName(p))}</div>
          <div class="small muted">${esc(p.brand || '')} ${p.sku ? '· ' + esc(p.sku) : ''}</div>
        </td>
        <td>${esc(i18n.categoryName(p.category))}</td>
        <td><b>${money(p.price, '₴')}</b>${p.oldPrice ? `<div class="small muted"><s>${money(p.oldPrice, '₴')}</s></div>` : ''}</td>
        <td>${p.inStock ? `<span class="a-badge" style="background:#e9f5ef;color:#2f7d5b">${esc(t('common.inStock'))}</span>` : `<span class="a-badge" style="background:#f6e9e7;color:#c0392b">${esc(t('common.notAvailable'))}</span>`}</td>
        <td>${p.featured ? `<span class="a-badge" style="background:#f5eddd;color:#b45309">${esc(t('common.badgeTop'))}</span>` : '<span class="muted">—</span>'}</td>
        <td class="a-actions">
          <a class="a-icon-btn" href="/product/${encodeURIComponent(p.id)}" target="_blank" title="${esc(t('admin.view'))}">${icon('eye')}</a>
          <a class="a-icon-btn" href="/admin/products/${encodeURIComponent(p.id)}/edit" title="${esc(t('admin.edit'))}">${icon('edit')}</a>
          <form method="post" action="/admin/products/${encodeURIComponent(p.id)}/toggle" style="display:inline">
            <button class="a-icon-btn" title="${esc(active ? t('admin.hide') : t('admin.show'))}">${active ? icon('check') : icon('x')}</button>
          </form>
          <form method="post" action="/admin/products/${encodeURIComponent(p.id)}/delete" style="display:inline" data-confirm="${esc(t('admin.deleteProduct'))}">
            <button class="a-icon-btn danger" title="${esc(t('admin.delete'))}">${icon('trash')}</button>
          </form>
        </td>
      </tr>`;
    })
    .join('');

  const catOpts = categories
    .map((c) => `<option value="${esc(c.name)}" ${f.category === c.name ? 'selected' : ''}>${esc(i18n.categoryName(c.name))}</option>`)
    .join('');

  const body = `
  ${flash(query)}
  <div class="a-toolbar">
    <form method="get" class="a-toolbar-form">
      <div class="search-inline">${icon('search')}<input name="q" value="${esc(f.q)}" placeholder="${esc(t('admin.searchProduct'))}"></div>
      <select class="select" name="category"><option value="">${esc(t('admin.allCategories'))}</option>${catOpts}</select>
      <select class="select" name="sort">
        <option value="new" ${f.sort === 'new' ? 'selected' : ''}>${esc(t('sort.new'))}</option>
        <option value="price-asc" ${f.sort === 'price-asc' ? 'selected' : ''}>${esc(t('sort.priceAsc'))}</option>
        <option value="price-desc" ${f.sort === 'price-desc' ? 'selected' : ''}>${esc(t('sort.priceDesc'))}</option>
        <option value="name" ${f.sort === 'name' ? 'selected' : ''}>${esc(t('sort.name'))}</option>
      </select>
      <button class="btn btn-ghost btn-sm">${esc(t('admin.filter'))}</button>
    </form>
    <a href="/admin/products/new" class="btn btn-dark btn-sm">${icon('plus')} ${esc(t('admin.addProduct'))}</a>
  </div>

  <div class="a-panel">
    <div class="a-panel-head"><h2>${esc(t('admin.products'))} · ${result.total}</h2>${hiddenCount ? `<span class="a-badge" style="background:#eee;color:#857b72">${esc(t('admin.hiddenCount', { n: hiddenCount }))}</span>` : ''}</div>
    <div class="a-table-wrap">
      <table class="a-table">
        <thead><tr><th></th><th>${esc(t('admin.productName'))}</th><th>${esc(t('admin.category'))}</th><th>${esc(t('admin.price'))}</th><th>${esc(t('admin.availability'))}</th><th>${esc(t('common.badgeTop'))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="a-empty">${esc(t('admin.notFoundItems'))}</td></tr>`}</tbody>
      </table>
    </div>
    ${ui.pagination(result.page, result.pages, { q: f.q, category: f.category, brand: f.brand, sort: f.sort })}
  </div>`;
  return adminLayout({ title: t('admin.products'), active: '/admin/products', csrf: req.csrf, body });
}

function productForm(req, product) {
  const isNew = !product;
  const categories = store.getAllCategories();
  const p = product || { images: [], sizes: [], inStock: true, active: true, featured: false, translations: {} };
  const images = (p.images || []).slice();
  const tr = p.translations || {};
  const catOpts = categories
    .map((c) => `<option value="${esc(c.name)}" ${p.category === c.name ? 'selected' : ''}>${esc(i18n.categoryName(c.name))}</option>`)
    .join('');

  const body = `
  <form method="post" action="/admin/products/save" enctype="multipart/form-data" class="a-form-layout">
    <input type="hidden" name="id" value="${esc(p.id || '')}">
    <div>
      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.productName'))}</h2></div>
        <div class="a-form-body">
          <div class="field"><label>${esc(t('admin.productName'))} (UK) <span class="req">*</span></label><input name="name" required value="${esc(p.name || '')}" placeholder="${esc(t('admin.productNamePlaceholder'))}"></div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.price'))}, ₴ <span class="req">*</span></label><input type="number" step="0.01" name="price" required value="${p.price != null ? p.price : ''}"></div>
            <div class="field"><label>${esc(t('admin.oldPrice'))}</label><input type="number" step="0.01" name="oldPrice" value="${p.oldPrice != null ? p.oldPrice : ''}"><span class="hint">${esc(t('admin.oldPriceHint'))}</span></div>
          </div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.category'))}</label>
              <select name="category">${catOpts}<option value="Інше" ${p.category === 'Інше' || !p.category ? 'selected' : ''}>${esc(i18n.categoryName('Інше'))}</option></select>
            </div>
            <div class="field"><label>${esc(t('admin.brand'))}</label>
              <select name="brand" id="brandSelect">
                <option value="">—</option>
                ${store.getAllBrands().map((b) => `<option value="${esc(b.name)}" ${p.brand === b.name ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
                ${p.brand && !store.getAllBrands().some((b) => b.name === p.brand) ? `<option value="${esc(p.brand)}" selected>${esc(p.brand)}</option>` : ''}
              </select>
              <input name="brandNew" id="brandNew" placeholder="${esc(t('admin.brandNewPlaceholder'))}" style="margin-top:8px">
              <span class="hint">${esc(t('admin.brandNewHint'))}</span>
            </div>
          </div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.sku'))}</label><input name="sku" value="${esc(p.sku || '')}"></div>
            <div class="field"><label>${esc(t('admin.sizes'))}</label><input name="sizes" value="${esc((p.sizes || []).join(', '))}" placeholder="S, M, L"></div>
          </div>
          <div class="field"><label>${esc(t('admin.description'))} (UK)</label><textarea name="description" rows="5" placeholder="${esc(t('admin.descriptionPlaceholder'))}">${esc(p.description || '')}</textarea></div>
          <div class="a-switches">
            <label class="a-switch"><input type="checkbox" name="inStock" ${p.inStock !== false ? 'checked' : ''}><span></span>${esc(t('admin.inStock'))}</label>
            <label class="a-switch"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}><span></span>${esc(t('admin.showHome'))}</label>
            <label class="a-switch"><input type="checkbox" name="active" ${p.active !== false ? 'checked' : ''}><span></span>${esc(t('admin.published'))}</label>
          </div>
        </div>
      </div>

      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.translations'))}</h2><button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn">${icon('globe')} ${esc(t('admin.translateSuggest'))}</button></div>
        <div class="a-form-body">
          <p class="small muted">${esc(t('admin.translationsHint'))}. ${esc(t('admin.translateSuggestHint'))}.</p>
          <div class="a-flash ok" id="translateSuggestOk" style="display:none;margin-bottom:0"></div>
          <div class="a-flash err" id="translateSuggestErr" style="display:none;margin-bottom:0"></div>
          <div class="field"><label>${esc(t('admin.nameRu'))}</label><input name="nameRu" id="nameRu" value="${esc((tr.ru && tr.ru.name) || '')}"></div>
          <div class="field"><label>${esc(t('admin.descRu'))}</label><textarea name="descRu" id="descRu" rows="3">${esc((tr.ru && tr.ru.description) || '')}</textarea></div>
          <div class="field"><label>${esc(t('admin.nameEn'))}</label><input name="nameEn" id="nameEn" value="${esc((tr.en && tr.en.name) || '')}"></div>
          <div class="field"><label>${esc(t('admin.descEn'))}</label><textarea name="descEn" id="descEn" rows="3">${esc((tr.en && tr.en.description) || '')}</textarea></div>
        </div>
      </div>

      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.images'))}</h2></div>
        <div class="a-form-body">
          <div class="a-drop" id="dropZone">
            ${icon('upload')}
            <b>${esc(t('admin.dropFiles'))}</b>
            <span class="muted small">${esc(t('admin.dropHint'))}</span>
            <input type="file" name="imageFiles" accept="image/*" multiple hidden id="fileInput">
          </div>
          <div id="imagePreview" class="a-img-preview">
            ${images.map((src) => imageTile(src)).join('')}
          </div>
          <input type="hidden" name="existingImages" id="existingImages" value="${esc(images.join('\n'))}">
          <div class="field" style="margin-top:14px"><label>${esc(t('admin.imageUrl'))}</label><textarea name="images" rows="3" placeholder="https://..."></textarea></div>
        </div>
      </div>
    </div>

    <aside class="a-form-side">
      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.publish'))}</h2></div>
        <div class="a-form-body">
          <button class="btn btn-block" type="submit">${icon('check')} ${esc(t('admin.saveProduct'))}</button>
          <a href="/admin/products" class="btn btn-ghost btn-block" style="margin-top:10px">${esc(t('admin.cancel'))}</a>
          ${!isNew ? `<div class="small muted" style="margin-top:14px">${esc(t('admin.created'))}: ${new Date(p.createdAt).toLocaleString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA')}<br>${esc(t('admin.views'))}: ${p.views || 0}</div>` : ''}
        </div>
      </div>
      ${!isNew ? `
      <div class="a-panel" style="margin-top:16px">
        <div class="a-form-body">
          <a class="btn btn-ghost btn-block" href="/product/${encodeURIComponent(p.id)}" target="_blank">${icon('eye')} ${esc(t('admin.viewOnSite'))}</a>
        </div>
      </div>` : ''}
    </aside>
  </form>`;

  return adminLayout({ title: isNew ? t('admin.newProduct') : t('admin.editProduct'), active: '/admin/products', csrf: req.csrf, body });
}

function imageTile(src) {
  return `<div class="a-img-tile" data-src="${esc(src)}">
    <img src="${img(src)}" alt="">
    <button type="button" class="a-img-del" data-remove-img title="${esc(t('admin.delete'))}">${icon('x')}</button>
  </div>`;
}

function ordersPage(req, query) {
  const f = {
    status: query.status || '',
    q: query.q || '',
    sort: query.sort || 'new',
    account: query.account || '',
    userId: query.user || '',
  };
  const list = store.getOrders(f);
  const s = store.stats();
  const clients = store.getClients();
  const statusOpts = Object.entries(STATUS)
    .map(([k]) => `<option value="${k}" ${query.status === k ? 'selected' : ''}>${esc(statusLabel(k))}</option>`)
    .join('');
  const sortOpts = [
    ['new', t('admin.sortNew')],
    ['old', t('admin.sortOld')],
    ['total-desc', t('admin.sortTotalDesc')],
    ['total-asc', t('admin.sortTotalAsc')],
    ['client', t('admin.sortClient')],
    ['status', t('admin.sortStatus')],
  ]
    .map(([k, label]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${esc(label)}</option>`)
    .join('');
  const clientOpts = clients
    .map((c) => `<option value="${esc(c.userId)}" ${f.userId === c.userId ? 'selected' : ''}>${esc((c.name || c.email || c.userId) + ' · ' + c.orders)}</option>`)
    .join('');
  const accountOpts = [
    ['', t('admin.allClients')],
    ['yes', t('account.registeredClient')],
    ['no', t('account.orderGuest')],
  ]
    .map(([k, label]) => `<option value="${k}" ${f.account === k ? 'selected' : ''}>${esc(label)}</option>`)
    .join('');

  const cards = list
    .map((o) => {
      const st = STATUS[o.status] || STATUS.new;
      const client = store.getUser(o.userId);
      return `
      <div class="a-order">
        <div class="a-order-head">
          <div>
            <a href="/order/${encodeURIComponent(o.id)}" target="_blank" class="a-order-id">#${esc(o.id)}</a>
            <span class="a-badge" style="background:${st.color}1a;color:${st.color}">${esc(statusLabel(o.status))}</span>
            ${o.userId ? `<span class="a-badge" style="background:#e9f5ef;color:#2f7d5b">${icon('user')} ${esc(client ? (client.name || client.email) : '—')}</span>` : `<span class="a-badge" style="background:#eee;color:#857b72">${esc(t('account.orderGuest'))}</span>`}
          </div>
          <div class="a-order-total">${money(o.total, '₴')}</div>
        </div>
        <div class="a-order-body">
          <div class="a-order-grid">
            <div><span class="muted small">${esc(t('admin.client'))}</span><b><a class="a-link" href="/admin/orders?q=${encodeURIComponent(o.customer.name || '')}">${esc(o.customer.name || '—')}</a></b></div>
            <div><span class="muted small">${esc(t('admin.phone'))}</span><b>${esc(o.customer.phone || '—')}</b></div>
            <div><span class="muted small">${esc(t('checkout.shippingMethod'))}</span><b>${esc(o.customer.shipping || o.customer.shippingMethod || '—')}</b></div>
            <div><span class="muted small">${esc(t('checkout.city'))}</span><b>${esc(o.customer.city || '—')}</b></div>
          </div>
          <div class="a-order-grid" style="margin-top:12px">
            <div><span class="muted small">${esc(t('checkout.warehouse'))}</span><b>${esc(o.customer.warehouse || '—')}</b></div>
            <div><span class="muted small">${esc(t('checkout.payment'))}</span><b>${esc(o.payment || '—')}</b></div>
            <div><span class="muted small">${esc(t('admin.date'))}</span><b>${new Date(o.createdAt).toLocaleString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA')}</b></div>
          </div>
          <div class="a-order-items">
            ${(o.items || [])
              .map(
                (it) => `<div class="a-order-item">
                  <img src="${img(it.image)}" alt="">
                  <span>${esc(it.name)}</span>
                  <span class="muted">${it.qty} × ${money(it.price, '₴')}</span>
                </div>`
              )
              .join('')}
          </div>
          ${o.customer.comment ? `<div class="small muted">${esc(o.customer.comment)}</div>` : ''}
          <div class="a-order-actions">
            <form method="post" action="/admin/orders/${encodeURIComponent(o.id)}/status">
              <select class="select" name="status" onchange="this.form.submit()">
                ${Object.entries(STATUS)
                  .map(([k]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${esc(statusLabel(k))}</option>`)
                  .join('')}
              </select>
            </form>
            <form method="post" action="/admin/orders/${encodeURIComponent(o.id)}/delete" data-confirm="${esc(t('admin.deleteOrder'))}">
              <button class="btn btn-ghost btn-sm">${icon('trash')}</button>
            </form>
          </div>
        </div>
      </div>`;
    })
    .join('');

  const qs = (patch) => {
    const q = new URLSearchParams();
    const merged = { ...f, ...patch };
    for (const k of ['status', 'q', 'sort', 'account', 'user']) if (merged[k]) q.set(k, merged[k]);
    return '/admin/orders' + (q.toString() ? '?' + q.toString() : '');
  };
  const statusChips = [
    ['', t('admin.allStatuses')],
    ...Object.keys(STATUS).map((k) => [k, statusLabel(k)]),
  ]
    .map(([k, label]) => `<a class="a-chip ${f.status === k ? 'on' : ''}" href="${esc(qs({ status: k }))}">${esc(label)}</a>`)
    .join('');

  const body = `
  ${flash(query)}
  <div class="a-grid-stats">
    ${statCard('truck', t('admin.total'), s.orders, '', '#1d4ed8')}
    ${statCard('tag', t('admin.status.new'), s.newOrders, '', '#9c2543')}
    ${statCard('truck', t('admin.shipped'), (s.byStatus.shipped || 0), '', '#b45309')}
    ${statCard('tag', t('admin.done'), (s.byStatus.done || 0), '', '#2f7d5b')}
  </div>
  <div class="a-toolbar">
    <form method="get" class="a-toolbar-form">
      <div class="search-inline">${icon('search')}<input name="q" value="${esc(f.q)}" placeholder="${esc(t('admin.orderNo'))}"></div>
      <select class="select" name="status"><option value="">${esc(t('admin.allStatuses'))}</option>${statusOpts}</select>
      <select class="select" name="sort">${sortOpts}</select>
      <select class="select" name="account">${accountOpts}</select>
      <select class="select" name="user"><option value="">${esc(t('admin.allClients'))}</option>${clientOpts}</select>
      <button class="btn btn-ghost btn-sm">${esc(t('admin.filter'))}</button>
    </form>
    <a href="/admin/orders" class="btn btn-ghost btn-sm">${icon('x')} ${esc(t('admin.resetFilters'))}</a>
  </div>
  <div class="a-chips">${statusChips}</div>
  <div class="a-orders">${cards || `<div class="a-panel"><div class="a-empty">${esc(t('admin.noOrders'))}</div></div>`}</div>`;
  return adminLayout({ title: t('admin.orders'), active: '/admin/orders', csrf: req.csrf, body, count: list.length });
}

function clientsPage(req, query) {
  const clients = store.getClients();
  const guestsRow = store.getOrders({ account: 'no' });
  const guestSpent = guestsRow.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0);
  const rows = clients
    .map((c) => {
      const dfmt = (d) => (d ? new Date(d).toLocaleDateString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA') : '—');
      return `<tr>
        <td><b>${esc(c.name || '—')}</b><div class="small muted">${esc(c.email)}</div></td>
        <td>${esc(c.phone || '—')}</td>
        <td><span class="a-badge" style="background:#eef2ff;color:#1d4ed8">${c.orders}</span></td>
        <td><b>${money(c.spent, '₴')}</b></td>
        <td class="small muted">${dfmt(c.lastAt)}</td>
        <td class="a-actions">
          <a class="a-icon-btn" href="/admin/orders?user=${encodeURIComponent(c.userId)}" title="${esc(t('admin.viewOrders'))}">${icon('eye')}</a>
        </td>
      </tr>`;
    })
    .join('');
  const body = `
  ${flash(query)}
  <div class="a-grid-stats">
    ${statCard('user', t('admin.registeredClients'), clients.length, '', '#9c2543')}
    ${statCard('truck', t('admin.ordersTotal'), clients.reduce((s, c) => s + c.orders, 0), '', '#1d4ed8')}
    ${statCard('tag', t('admin.revenue'), money(clients.reduce((s, c) => s + c.spent, 0), '₴'), '', '#2f7d5b')}
    ${statCard('user', t('account.orderGuest'), guestsRow.length, money(guestSpent, '₴'), '#857b72')}
  </div>
  <div class="a-panel">
    <div class="a-panel-head"><h2>${esc(t('admin.clients'))} · ${clients.length}</h2></div>
    <div class="a-table-wrap">
      <table class="a-table">
        <thead><tr><th>${esc(t('admin.client'))}</th><th>${esc(t('admin.phone'))}</th><th>${esc(t('admin.orders'))}</th><th>${esc(t('account.orderTotal'))}</th><th>${esc(t('admin.date'))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="a-empty">${esc(t('admin.noClients'))}</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
  return adminLayout({ title: t('admin.clients'), active: '/admin/clients', csrf: req.csrf, body });
}

function categoriesPage(req, query) {
  const cats = store.getAllCategories();
  const countMap = store.getCategoryCounts();
  const counts = { get: (k) => countMap[k] || 0 };

  const rows = cats
    .map((c) => {
      const tr = c.translations || {};
      return `
    <tr>
      <td><span class="a-color" style="background:${esc(c.color || '#9c2543')}"></span></td>
      <td><b>${esc(i18n.categoryName(c.name))}</b><div class="small muted">/${esc(c.slug)}</div></td>
      <td>${counts.get(c.name) || 0}</td>
      <td>${c.active !== false ? `<span class="a-badge" style="background:#e9f5ef;color:#2f7d5b">${esc(t('admin.active'))}</span>` : `<span class="a-badge" style="background:#eee;color:#857b72">${esc(t('admin.hidden'))}</span>`}</td>
      <td><span class="muted">—</span></td>
      <td class="a-actions">
        <button class="a-icon-btn" onclick="fillCat('${esc(c.id)}','${esc(c.name)}','${esc(c.description || '')}','${esc(c.color || '')}',${esc(JSON.stringify((tr.ru && tr.ru.name) || ''))},${esc(JSON.stringify((tr.en && tr.en.name) || ''))},${esc(JSON.stringify((tr.ru && tr.ru.description) || ''))},${esc(JSON.stringify((tr.en && tr.en.description) || ''))})" title="${esc(t('admin.edit'))}">${icon('edit')}</button>
        <form method="post" action="/admin/categories/${encodeURIComponent(c.id)}/toggle" style="display:inline">
          <button class="a-icon-btn" title="${esc(c.active !== false ? t('admin.hide') : t('admin.show'))}">${c.active !== false ? icon('check') : icon('x')}</button>
        </form>
        <form method="post" action="/admin/categories/${encodeURIComponent(c.id)}/delete" style="display:inline" data-confirm="${esc(t('admin.deleteCategory'))}">
          <button class="a-icon-btn danger" title="${esc(t('admin.delete'))}">${icon('trash')}</button>
        </form>
      </td>
    </tr>`;
    })
    .join('');

  const body = `
  ${flash(query)}
  <div class="a-toolbar">
    <div></div>
    <button class="btn btn-dark btn-sm" onclick="resetCatForm();document.getElementById('catName').focus();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})">${icon('plus')} ${esc(t('admin.newCategory'))}</button>
  </div>
  <div class="a-panels">
    <div class="a-panel">
      <div class="a-panel-head"><h2>${esc(t('admin.categories'))} · ${cats.length}</h2></div>
      <div class="a-table-wrap">
        <table class="a-table">
          <thead><tr><th></th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.products'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('common.badgeTop'))}</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" class="a-empty">${esc(t('admin.noData'))}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div class="a-panel">
      <div class="a-panel-head"><h2 id="catFormTitle">${esc(t('admin.newCategory'))}</h2><button type="button" class="btn btn-ghost btn-sm" id="catTranslateBtn">${icon('globe')} ${esc(t('admin.translateSuggest'))}</button></div>
      <form method="post" action="/admin/categories/save" class="a-form-body" id="catForm">
        <input type="hidden" name="id" id="catId">
        <div class="field"><label>${esc(t('admin.name'))} (UK) <span class="req">*</span></label><input name="name" id="catName" required></div>
        <div class="form-grid two">
          <div class="field"><label>${esc(t('admin.nameRu'))}</label><input name="nameRu" id="catNameRu"></div>
          <div class="field"><label>${esc(t('admin.nameEn'))}</label><input name="nameEn" id="catNameEn"></div>
        </div>
        <div class="field"><label>${esc(t('admin.description'))} (UK)</label><textarea name="description" id="catDesc" rows="2"></textarea></div>
        <div class="form-grid two">
          <div class="field"><label>${esc(t('admin.descRu'))}</label><textarea name="descRu" id="catDescRu" rows="2"></textarea></div>
          <div class="field"><label>${esc(t('admin.descEn'))}</label><textarea name="descEn" id="catDescEn" rows="2"></textarea></div>
        </div>
        <div class="field"><label>${esc(t('admin.color'))}</label><input type="color" name="color" id="catColor" value="#9c2543" style="height:46px;padding:4px"></div>
        <button class="btn btn-block" type="submit">${icon('check')} ${esc(t('admin.saveCategory'))}</button>
      </form>
    </div>
  </div>
  <script>
  function resetCatForm(){
    document.getElementById('catId').value='';
    document.getElementById('catName').value='';
    document.getElementById('catDesc').value='';
    document.getElementById('catColor').value='#9c2543';
    document.getElementById('catNameRu').value='';
    document.getElementById('catNameEn').value='';
    document.getElementById('catDescRu').value='';
    document.getElementById('catDescEn').value='';
    document.getElementById('catFormTitle').textContent=${JSON.stringify(t('admin.newCategory'))};
  }
  function fillCat(id,name,desc,color,nameRu,nameEn,descRu,descEn){
    document.getElementById('catId').value=id;
    document.getElementById('catName').value=name;
    document.getElementById('catDesc').value=desc;
    document.getElementById('catColor').value=color||'#9c2543';
    document.getElementById('catNameRu').value=nameRu||'';
    document.getElementById('catNameEn').value=nameEn||'';
    document.getElementById('catDescRu').value=descRu||'';
    document.getElementById('catDescEn').value=descEn||'';
    document.getElementById('catFormTitle').textContent=${JSON.stringify(t('admin.editCategory'))};
    document.getElementById('catName').focus();
    window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  }
  </script>`;
  return adminLayout({ title: t('admin.categories'), active: '/admin/categories', csrf: req.csrf, body });
}

function brandsPage(req, query) {
  const brands = store.getAllBrands();
  const countMap = store.getBrandCounts();
  const rows = brands
    .map((b) => {
      const tr = b.translations || {};
      return `
    <tr>
      <td><b>${esc(b.name)}</b><div class="small muted">/${esc(b.slug)}</div></td>
      <td>${countMap[b.name] || 0}</td>
      <td>${b.active !== false ? `<span class="a-badge" style="background:#e9f5ef;color:#2f7d5b">${esc(t('admin.active'))}</span>` : `<span class="a-badge" style="background:#eee;color:#857b72">${esc(t('admin.hidden'))}</span>`}</td>
      <td class="a-actions">
        <button class="a-icon-btn" onclick="fillBrand('${esc(b.id)}','${esc(b.name)}','${esc(b.description || '')}',${esc(JSON.stringify((tr.ru && tr.ru.name) || ''))},${esc(JSON.stringify((tr.en && tr.en.name) || ''))},${esc(JSON.stringify((tr.ru && tr.ru.description) || ''))},${esc(JSON.stringify((tr.en && tr.en.description) || ''))})" title="${esc(t('admin.edit'))}">${icon('edit')}</button>
        <form method="post" action="/admin/brands/${encodeURIComponent(b.id)}/delete" style="display:inline" data-confirm="${esc(t('admin.deleteBrand'))}">
          <button class="a-icon-btn danger">${icon('trash')}</button>
        </form>
      </td>
    </tr>`;
    })
    .join('');

  const body = `
  ${flash(query)}
  <div class="a-panels">
    <div class="a-panel">
      <div class="a-panel-head"><h2>${esc(t('admin.brands'))} · ${brands.length}</h2></div>
      <div class="a-table-wrap">
        <table class="a-table">
          <thead><tr><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.products'))}</th><th>${esc(t('admin.status'))}</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4" class="a-empty">${esc(t('admin.noData'))}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div class="a-panel">
      <div class="a-panel-head"><h2 id="brandFormTitle">${esc(t('admin.newBrand'))}</h2><button type="button" class="btn btn-ghost btn-sm" id="brandTranslateBtn">${icon('globe')} ${esc(t('admin.translateSuggest'))}</button></div>
      <form method="post" action="/admin/brands/save" class="a-form-body" id="brandForm">
        <input type="hidden" name="id" id="brandId">
        <div class="field"><label>${esc(t('admin.name'))} (UK) <span class="req">*</span></label><input name="name" id="brandName" required></div>
        <div class="form-grid two">
          <div class="field"><label>${esc(t('admin.nameRu'))}</label><input name="nameRu" id="brandNameRu"></div>
          <div class="field"><label>${esc(t('admin.nameEn'))}</label><input name="nameEn" id="brandNameEn"></div>
        </div>
        <div class="field"><label>${esc(t('admin.description'))} (UK)</label><textarea name="description" id="brandDesc" rows="2"></textarea></div>
        <div class="form-grid two">
          <div class="field"><label>${esc(t('admin.descRu'))}</label><textarea name="descRu" id="brandDescRu" rows="2"></textarea></div>
          <div class="field"><label>${esc(t('admin.descEn'))}</label><textarea name="descEn" id="brandDescEn" rows="2"></textarea></div>
        </div>
        <button class="btn btn-block" type="submit">${icon('check')} ${esc(t('admin.saveBrand'))}</button>
      </form>
    </div>
  </div>
  <script>
  function fillBrand(id,name,desc,nameRu,nameEn,descRu,descEn){
    document.getElementById('brandId').value=id;
    document.getElementById('brandName').value=name;
    document.getElementById('brandDesc').value=desc;
    document.getElementById('brandNameRu').value=nameRu||'';
    document.getElementById('brandNameEn').value=nameEn||'';
    document.getElementById('brandDescRu').value=descRu||'';
    document.getElementById('brandDescEn').value=descEn||'';
    document.getElementById('brandFormTitle').textContent=${JSON.stringify(t('admin.editBrand'))};
    document.getElementById('brandName').focus();
  }
  </script>`;
  return adminLayout({ title: t('admin.brands'), active: '/admin/brands', csrf: req.csrf, body });
}

function settingsPage(req, query) {
  const s = store.getSettings();
  const str = s.translations || {};
  const field = (lang, key) => (str[lang] && str[lang][key]) || '';
  const body = `
  ${flash(query)}
  ${s.mustChangePassword ? `<div class="a-flash err">${icon('shield')} ${esc(t('admin.mustChange'))}</div>` : ''}
  <form method="post" action="/admin/settings/save" class="a-form-layout">
    <div>
      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.shop'))}</h2></div>
        <div class="a-form-body">
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.siteName'))}</label><input name="siteName" value="${esc(s.siteName)}"></div>
            <div class="field"><label>${esc(t('admin.tagline'))} (UK)</label><input name="tagline" value="${esc(s.tagline || '')}"></div>
          </div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.tagline'))} RU</label><input name="tagline_ru" value="${esc(field('ru', 'tagline'))}"></div>
            <div class="field"><label>${esc(t('admin.tagline'))} EN</label><input name="tagline_en" value="${esc(field('en', 'tagline'))}"></div>
          </div>
          <div class="field"><label>${esc(t('admin.announcement'))} (UK)</label><input name="announcement" value="${esc(s.announcement || '')}"></div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.announcement'))} RU</label><input name="announcement_ru" value="${esc(field('ru', 'announcement'))}"></div>
            <div class="field"><label>${esc(t('admin.announcement'))} EN</label><input name="announcement_en" value="${esc(field('en', 'announcement'))}"></div>
          </div>
          <div class="field"><label>${esc(t('admin.heroTitle'))} (UK)</label><input name="heroTitle" value="${esc(s.heroTitle || '')}"></div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.heroTitle'))} RU</label><input name="heroTitle_ru" value="${esc(field('ru', 'heroTitle'))}"></div>
            <div class="field"><label>${esc(t('admin.heroTitle'))} EN</label><input name="heroTitle_en" value="${esc(field('en', 'heroTitle'))}"></div>
          </div>
          <div class="field"><label>${esc(t('admin.heroSubtitle'))} (UK)</label><textarea name="heroSubtitle" rows="2">${esc(s.heroSubtitle || '')}</textarea></div>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('admin.heroSubtitle'))} RU</label><textarea name="heroSubtitle_ru" rows="2">${esc(field('ru', 'heroSubtitle'))}</textarea></div>
            <div class="field"><label>${esc(t('admin.heroSubtitle'))} EN</label><textarea name="heroSubtitle_en" rows="2">${esc(field('en', 'heroSubtitle'))}</textarea></div>
          </div>
          <div class="field"><label>${esc(t('admin.freeFrom'))}</label><input type="number" name="freeShippingFrom" value="${s.freeShippingFrom || 0}"></div>
        </div>
      </div>
      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.contacts'))}</h2></div>
        <div class="a-form-body">
          <div class="form-grid two">
            <div class="field"><label>${esc(t('contacts.phone'))}</label><input name="phone" value="${esc(s.phone || '')}"></div>
            <div class="field"><label>${esc(t('contacts.email'))}</label><input name="email" value="${esc(s.email || '')}"></div>
          </div>
          <div class="field"><label>${esc(t('admin.address'))}</label><input name="address" value="${esc(s.address || '')}"></div>
          <div class="form-grid two">
            <div class="field"><label>Instagram</label><input name="instagram" value="${esc(s.instagram || '')}"></div>
            <div class="field"><label>Telegram</label><input name="telegram" value="${esc(s.telegram || '')}"></div>
          </div>
        </div>
      </div>
    </div>
    <aside class="a-form-side">
      <div class="a-panel">
        <div class="a-panel-head"><h2>${esc(t('admin.save'))}</h2></div>
        <div class="a-form-body"><button class="btn btn-block" type="submit">${icon('check')} ${esc(t('admin.saveSettings'))}</button></div>
      </div>
    </aside>
  </form>

  <form method="post" action="/admin/settings/password" class="a-panel" style="margin-top:20px">
    <div class="a-panel-head"><h2>${esc(t('admin.changePass'))}</h2></div>
    <div class="a-form-body">
      <div class="form-grid two">
        <div class="field"><label>${esc(t('admin.currentPass'))}</label><input type="password" name="current" required></div>
        <div class="field"><label>${esc(t('admin.newPass'))}</label><input type="password" name="next" required minlength="4"></div>
      </div>
      <button class="btn btn-ghost" type="submit">${icon('shield')} ${esc(t('admin.changePassBtn'))}</button>
    </div>
  </form>

  <div class="a-panel" style="margin-top:20px">
    <div class="a-panel-head"><h2>${esc(t('admin.backups'))}</h2>
      <form method="post" action="/admin/backups/create" style="display:inline">
        <button class="btn btn-dark btn-sm">${icon('plus')} ${esc(t('admin.backupCreate'))}</button>
      </form>
    </div>
    <div class="a-table-wrap">
      <table class="a-table">
        <thead><tr><th>${esc(t('admin.backupName'))}</th><th>${esc(t('admin.backupSize'))}</th><th>${esc(t('admin.backupDate'))}</th><th></th></tr></thead>
        <tbody>${(store.listBackups() || []).map((b) => `
          <tr>
            <td><b>${esc(b.name)}</b></td>
            <td class="small muted">${(b.size / 1024).toFixed(0)} KB</td>
            <td class="small muted">${new Date(b.at).toLocaleString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA')}</td>
            <td class="a-actions">
              <a class="a-icon-btn" href="/admin/backups/${encodeURIComponent(b.name)}/download" title="${esc(t('admin.backupDownload'))}">${icon('upload')}</a>
              <form method="post" action="/admin/backups/${encodeURIComponent(b.name)}/restore" style="display:inline" data-confirm="${esc(t('admin.backupRestoreConfirm'))}">
                <button class="a-icon-btn" title="${esc(t('admin.restore'))}">${icon('return')}</button>
              </form>
            </td>
          </tr>`).join('') || `<tr><td colspan="4" class="a-empty">${esc(t('admin.backupsEmpty'))}</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
  return adminLayout({ title: t('admin.settings'), active: '/admin/settings', csrf: req.csrf, body });
}

function trashPage(req, query) {
  const items = store.getTrash('product');
  const rows = items
    .map((it) => {
      const p = it.data || {};
      const imgs = p.images || [];
      return `<tr>
        <td><img class="a-thumb" src="${img(imgs[0])}" alt=""></td>
        <td>
          <div class="a-prod-name">${esc(p.name || it.id)}</div>
          <div class="small muted">${esc(p.brand || '')} ${p.sku ? '· ' + esc(p.sku) : ''}</div>
        </td>
        <td>${esc(i18n.categoryName(p.category || '—'))}</td>
        <td><b>${money(p.price || 0, '₴')}</b></td>
        <td class="small muted">${it.deletedAt ? new Date(it.deletedAt).toLocaleString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA') : '—'}</td>
        <td class="a-actions">
          <form method="post" action="/admin/trash/${encodeURIComponent(it.id)}/restore" style="display:inline">
            <button class="a-icon-btn" title="${esc(t('admin.restore'))}">${icon('return')}</button>
          </form>
          <form method="post" action="/admin/trash/${encodeURIComponent(it.id)}/purge" style="display:inline" data-confirm="${esc(t('admin.purgeConfirm'))}">
            <button class="a-icon-btn danger" title="${esc(t('admin.purge'))}">${icon('trash')}</button>
          </form>
        </td>
      </tr>`;
    })
    .join('');

  const body = `
  ${flash(query)}
  ${items.length ? `
  <div class="a-toolbar">
    <div></div>
    <form method="post" action="/admin/trash/empty" style="display:inline" data-confirm="${esc(t('admin.emptyTrashConfirm'))}">
      <button class="btn btn-ghost btn-sm">${icon('trash')} ${esc(t('admin.emptyTrash'))}</button>
    </form>
  </div>` : ''}
  <div class="a-panel">
    <div class="a-panel-head"><h2>${esc(t('admin.trash'))} · ${items.length}</h2></div>
    <div class="a-table-wrap">
      <table class="a-table">
        <thead><tr><th></th><th>${esc(t('admin.productName'))}</th><th>${esc(t('admin.category'))}</th><th>${esc(t('admin.price'))}</th><th>${esc(t('admin.deletedAt'))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="a-empty">${esc(t('admin.trashEmpty'))}</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
  return adminLayout({ title: t('admin.trash'), active: '/admin/trash', csrf: req.csrf, body });
}

function subscribersPage(req, query) {
  const list = store.getSubscribers();
  const rows = list
    .map((s) => `
    <tr>
      <td><b>${esc(s.email)}</b></td>
      <td class="small muted">${s.at ? new Date(s.at).toLocaleString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA') : '—'}</td>
      <td class="a-actions">
        <form method="post" action="/admin/subscribers/${encodeURIComponent(s.email)}/delete" style="display:inline" data-confirm="${esc(t('admin.deleteSubscriber'))}">
          <button class="a-icon-btn danger" title="${esc(t('admin.delete'))}">${icon('trash')}</button>
        </form>
      </td>
    </tr>`)
    .join('');
  const body = `
  ${flash(query)}
  <div class="a-toolbar">
    <div class="small muted">${esc(t('admin.subscribersHint'))}</div>
    ${list.length ? `<a href="/admin/subscribers.csv" class="btn btn-dark btn-sm">${icon('upload')} ${esc(t('admin.exportCsv'))}</a>` : ''}
  </div>
  <div class="a-panel">
    <div class="a-panel-head"><h2>${esc(t('admin.subscribers'))} · ${list.length}</h2></div>
    <div class="a-table-wrap">
      <table class="a-table">
        <thead><tr><th>E-mail</th><th>${esc(t('admin.date'))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="3" class="a-empty">${esc(t('admin.subscribersEmpty'))}</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
  return adminLayout({ title: t('admin.subscribers'), active: '/admin/subscribers', csrf: req.csrf, body });
}

module.exports = {
  brandsPage,
  dashboard,
  loginPage,
  productsPage,
  productForm,
  ordersPage,
  clientsPage,
  categoriesPage,
  settingsPage,
  trashPage,
  subscribersPage,
};
