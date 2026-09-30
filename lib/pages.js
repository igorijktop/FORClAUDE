'use strict';

const store = require('./store');
const ui = require('./ui');
const i18n = require('./i18n');
const { icon, esc, money, img, imgSet, layout, productCard, pagination, trField } = ui;
const t = i18n.t;
const tn = i18n.tn;
const catName = i18n.categoryName;
const url = i18n.url;

/* SEO-friendly category URL; falls back to legacy query form */
function catHref(name) {
  try {
    const slug = store.findCategory(name)?.slug;
    if (slug) return url('/catalog/' + slug);
  } catch (e) { /* ignore */ }
  return url('/catalog?category=' + encodeURIComponent(name));
}

function jsonLdScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function heroImage(settings) {
  return settings.heroImage || 'images/6994397601.jpg';
}

function home(settings, categories) {
  const fresh = store.getVisibleProducts({ perPage: 8, sort: 'new' }).items;
  const popular = store.getVisibleProducts({ perPage: 4, sort: 'popular' }).items;
  const stats = store.stats();
  const brands = store.getBrands();

  const catTiles = categories
    .filter((c) => c.count > 0)
    .slice(0, 8)
    .map((c, i) => {
      const product = store.getVisibleProducts({ category: c.name, perPage: 1 }).items[0];
      const src = product ? product.images[0] : '';
      return `
      <a class="cat-tile reveal d${i % 4}" href="${esc(catHref(c.name))}">
        ${src ? `<img src="${img(src, 500)}" alt="${esc(catName(c.name))}" loading="lazy">` : ''}
        <span class="ct-go">${icon('arrow')}</span>
        <div class="ct-body">
          <h3>${esc(catName(c.name))}</h3>
          <span>${tn('common.products', c.count)}</span>
        </div>
      </a>`;
    })
    .join('');

  const brandList = brands.slice(0, 14).map((b) => b.name);
  const brandStrip = brandList.length
    ? `<div class="brand-strip"><div class="brand-track">${Array(2)
        .fill(brandList.map((b) => `<span>${esc(b)}</span>`).join(''))
        .join('')}</div></div>`
    : '';

  const saleItems = popular.map((p) => productCard(p, settings)).join('');
  const heroTitle = trField(settings, 'heroTitle') || t('home.title');
  const heroLead = trField(settings, 'heroSubtitle') || t('home.lead');

  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.siteName,
    url: i18n.abs('/'),
    inLanguage: i18n.getLang(),
    potentialAction: {
      '@type': 'SearchAction',
      target: i18n.abs(url('/catalog')) + '?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  });

  const body = `
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy reveal">
        <span class="eyebrow">${esc(trField(settings, 'tagline') || t('home.eyebrow'))}</span>
        <h1>${heroTitle}</h1>
        <p class="lead">${esc(heroLead)}</p>
        <div class="hero-cta">
          <a href="${esc(url('/catalog'))}" class="btn">${esc(t('home.viewCatalog'))} ${icon('arrow')}</a>
          <a href="${esc(url('/catalog?featured=1'))}" class="btn btn-outline">${esc(t('home.new'))}</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><b>${stats.products}+</b><span>${esc(tn('common.products', stats.products))}</span></div>
          <div class="stat"><b>${brands.length}</b><span>${esc(tn('common.brands', brands.length))}</span></div>
          <div class="stat"><b>24/7</b><span>${esc(t('common.online247'))}</span></div>
        </div>
      </div>
      <div class="hero-visual reveal d2">
        <div class="ph ph-small"><img src="${img(fresh[2] ? fresh[2].images[0] : heroImage(settings), 400)}" alt=""></div>
        <div class="ph ph-main"><img src="${img(fresh[0] ? fresh[0].images[0] : heroImage(settings), 800)}" alt="${esc(settings.siteName)}"></div>
        <div class="ph ph-side"><img src="${img(fresh[1] ? fresh[1].images[0] : heroImage(settings), 600)}" alt=""></div>
        <div class="hero-badge">${icon('sparkle')} ${esc(t('common.original'))}</div>
      </div>
    </div>
  </section>
  ${brandStrip}

  <section class="section container">
    <div class="section-head center reveal">
      <span class="eyebrow">${esc(t('home.categoriesEyebrow'))}</span>
      <h2>${esc(t('home.categoriesTitle'))}</h2>
      <div class="rule"></div>
      <p>${esc(t('home.categoriesText'))}</p>
    </div>
    <div class="cat-grid">${catTiles}</div>
  </section>

  <section class="section-sm container">
    <div class="section-head reveal" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap">
      <div>
        <span class="eyebrow">${esc(t('home.newEyebrow'))}</span>
        <h2 style="margin-top:12px">${esc(t('home.newTitle'))}</h2>
      </div>
      <a href="${esc(url('/catalog'))}" class="link-arrow">${esc(t('home.allCatalog'))} ${icon('arrow')}</a>
    </div>
    <div class="product-grid">${fresh.map((p) => productCard(p, settings)).join('')}</div>
  </section>

  <section class="section container">
    <div class="split">
      <div class="split-media reveal">
        <img src="${img(popular[0] ? popular[0].images[0] : heroImage(settings), 800)}" alt="${esc(settings.siteName)}">
        <div class="float-card">
          <span class="ic-round">${icon('star')}</span>
          <div>
            <b style="font-size:15px">${esc(t('home.rating'))}</b>
            <div class="small muted">${esc(t('common.reviews'))}</div>
          </div>
        </div>
      </div>
      <div class="split-body reveal d2">
        <span class="eyebrow">${esc(t('home.aboutEyebrow'))}</span>
        <h2>${esc(t('home.aboutTitle'))}</h2>
        <p>${esc(t('home.aboutText'))}</p>
        <ul class="check-list">
          <li>${icon('check')}<span>${esc(t('home.aboutP1'))}</span></li>
          <li>${icon('check')}<span>${esc(t('home.aboutP2'))}</span></li>
          <li>${icon('check')}<span>${esc(t('home.aboutP3'))}</span></li>
        </ul>
        <a href="${esc(url('/about'))}" class="btn btn-ghost">${esc(t('home.more'))} ${icon('arrow')}</a>
      </div>
    </div>
  </section>

  <section class="section container">
    <div class="section-head center reveal">
      <span class="eyebrow">${esc(t('home.aboutEyebrow'))}</span>
      <h2>${esc(t('home.aboutTitle'))}</h2>
      <div class="rule"></div>
    </div>
    <div class="features">
      ${[
        ['truck', t('home.f1Title'), t('home.f1Text')],
        ['shield', t('home.f2Title'), t('home.f2Text')],
        ['return', t('home.f3Title'), t('home.f3Text')],
        ['phone', t('home.f4Title'), t('home.f4Text')],
      ]
        .map(
          ([ic, title, d], i) => `
        <div class="feature reveal d${i + 1}">
          <span class="ic-round">${icon(ic)}</span>
          <h3>${esc(title)}</h3>
          <p>${esc(d)}</p>
        </div>`
        )
        .join('')}
    </div>
  </section>

  <section class="section-sm container">
    <div class="newsletter">
      <div class="newsletter-inner">
        <div>
          <span class="eyebrow" style="color:var(--accent-2)">${esc(t('nl.eyebrow'))}</span>
          <h2>${esc(t('nl.title'))}</h2>
          <p>${esc(t('nl.text'))}</p>
        </div>
        <form class="news-form" data-news>
          <input type="email" name="email" placeholder="${esc(t('nl.placeholder'))}" required>
          <button class="btn btn-light" type="submit">${esc(t('nl.button'))} ${icon('arrow')}</button>
        </form>
      </div>
    </div>
  </section>

  <section class="section container">
    <div class="section-head reveal" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap">
      <div>
        <span class="eyebrow">${esc(t('home.popularEyebrow'))}</span>
        <h2 style="margin-top:12px">${esc(t('home.popularTitle'))}</h2>
      </div>
      <a href="${esc(url('/catalog?sort=popular'))}" class="link-arrow">${esc(t('home.more2'))} ${icon('arrow')}</a>
    </div>
    <div class="product-grid">${saleItems}</div>
  </section>`;

  return layout({
    settings,
    categories,
    active: '/',
    description: heroLead.replace(/<[^>]+>/g, ''),
    ogImage: 'logo.png',
    jsonLd,
    pageType: 'home',
    body,
  });
}

function catalog(settings, categories, query, forcedCategorySlug) {
  const filters = parseFilters(query);
  // slug in path wins over query (but both stay consistent for filters/pagination)
  if (forcedCategorySlug) {
    const cat = store.findCategory(forcedCategorySlug);
    if (cat) {
      filters.category = [cat.name];
      query = { ...query, category: cat.name };
    }
  }
  const result = store.getVisibleProducts(filters);
  const allCategories = store.getCategories();
  const brands = store.getBrands();

  const catOptions = allCategories
    .filter((c) => c.count > 0)
    .map(
      (c) => `
    <label class="check">
      <input type="checkbox" name="category" value="${esc(c.name)}" ${filters.category.includes(c.name) ? 'checked' : ''}>
      <span class="box">${icon('check')}</span>
      <span>${esc(catName(c.name))}</span>
      <span class="cnt">${c.count}</span>
    </label>`
    )
    .join('');

  const brandOptions = brands
    .map(
      (b) => `
    <label class="check">
      <input type="checkbox" name="brand" value="${esc(b.name)}" ${filters.brand.includes(b.name) ? 'checked' : ''}>
      <span class="box">${icon('check')}</span>
      <span>${esc(b.name)}</span>
      <span class="cnt">${b.count}</span>
    </label>`
    )
    .join('');

  const chips = [
    ...filters.category.map((c) => ({ key: 'category', val: c, label: catName(c) })),
    ...filters.brand.map((b) => ({ key: 'brand', val: b, label: b })),
  ];
  if (filters.q) chips.push({ key: 'q', val: filters.q, label: `«${filters.q}»` });

  const activeChips = chips.length
    ? `<div class="active-chips">
        ${chips.map((c) => `<a class="chip" href="${chipUrl(query, c.key, c.val)}">${esc(c.label)} ${icon('x')}</a>`).join('')}
        <a class="chip chip-clear" href="${esc(url('/catalog'))}">${esc(t('catalog.resetAll'))} ${icon('x')}</a>
      </div>`
    : '';

  const heading = filters.category.length === 1 ? catName(filters.category[0]) : t('catalog.title');
  const subtitle =
    filters.category.length === 1 ? t('catalog.singleCat', { cat: catName(filters.category[0]) }) : t('catalog.subtitle');

  const grid = result.items.length
    ? `<div class="product-grid cols-3" id="productGrid">${result.items.map((p) => productCard(p, settings)).join('')}</div>`
    : `<div class="empty-state">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${ui.ICONS.search}</svg>
        <h3>${esc(t('catalog.nothing'))}</h3>
        <p>${esc(t('catalog.nothingText'))}</p>
        <a href="${esc(url('/catalog'))}" class="btn">${esc(t('catalog.resetFilters'))}</a>
      </div>`;

  const baseQuery = { ...query };
  delete baseQuery.page;
  const loadMore =
    result.page < result.pages && result.items.length
      ? `<div class="load-more-wrap"><button class="btn btn-ghost" id="loadMoreBtn" data-page="${result.page}" data-pages="${result.pages}">${esc(t('catalog.loadMore'))}</button></div>`
      : '';

  const isSingleCat = filters.category.length === 1;
  const canonCatPath = isSingleCat ? catHref(filters.category[0]) : '/catalog';
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('nav.home'), item: i18n.abs(url('/')) },
      { '@type': 'ListItem', position: 2, name: t('nav.catalog'), item: i18n.abs(url('/catalog')) },
      ...(isSingleCat
        ? [{ '@type': 'ListItem', position: 3, name: heading, item: i18n.abs(i18n.canonical(canonCatPath + (i18n.getPath().includes('?') ? i18n.getPath().slice(i18n.getPath().indexOf('?')) : ''))) }]
        : []),
    ],
  });

  const body = `
  <section class="page-head">
    <div class="container">
      <div class="breadcrumbs">
        <a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('nav.catalog'))}</span>
        ${filters.category.length === 1 ? `<span class="sep">/</span><span>${esc(catName(filters.category[0]))}</span>` : ''}
      </div>
      <h1>${esc(heading)}</h1>
      <p>${esc(subtitle)}</p>
    </div>
  </section>

  <div class="container catalog">
    <aside class="filters">
      <button class="btn btn-ghost btn-block" id="filterToggle" style="margin-bottom:18px;display:none">${icon('filter')} ${esc(t('catalog.filters'))}</button>
      <form method="get" action="${esc(url(canonCatPath))}" id="filterForm">
        <input type="hidden" name="sort" value="${esc(filters.sort || 'new')}">
        <div class="filter-collapse" id="filterCollapse">
          <div class="filter-group">
            <h4>${esc(t('common.search'))}</h4>
            <div class="search-inline" style="width:100%">
              ${icon('search')}
              <input type="text" name="q" value="${esc(filters.q || '')}" placeholder="${esc(t('catalog.searchPlaceholder'))}" style="width:100%">
            </div>
          </div>
          <div class="filter-group">
            <h4>${esc(t('catalog.categories'))}</h4>
            <div class="f-options scroll">${catOptions}</div>
          </div>
          <div class="filter-group">
            <h4>${esc(t('catalog.brands'))}</h4>
            <div class="f-options scroll">${brandOptions}</div>
          </div>
          <div class="filter-group">
            <h4>${esc(t('catalog.price'))}</h4>
            <div class="price-row">
              <input type="number" name="minPrice" placeholder="${esc(t('catalog.from'))}" value="${filters.minPrice || ''}">
              <span>—</span>
              <input type="number" name="maxPrice" placeholder="${esc(t('catalog.to'))}" value="${filters.maxPrice || ''}">
            </div>
          </div>
          <div class="filter-group">
            <label class="check">
              <input type="checkbox" name="inStock" value="1" ${filters.inStock ? 'checked' : ''}>
              <span class="box">${icon('check')}</span>
              <span>${esc(t('catalog.onlyInStock'))}</span>
            </label>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button type="submit" class="btn btn-block">${esc(t('catalog.apply'))}</button>
          </div>
          <a href="${esc(url('/catalog'))}" class="btn btn-ghost btn-block" style="margin-top:10px">${esc(t('catalog.clear'))}</a>
        </div>
      </form>
    </aside>

    <div>
      <div class="catalog-toolbar">
        <div class="toolbar-left">
          <span class="count-badge">${icon('grid')} <b id="resultCount">${result.total}</b> ${esc(tn('common.products', result.total))}</span>
        </div>
        <form method="get" action="${esc(url(canonCatPath))}" id="sortForm">
          ${Object.entries(query)
            .filter(([k]) => !['sort', 'page'].includes(k))
            .map(([k, v]) => (Array.isArray(v) ? v.map((x) => `<input type="hidden" name="${esc(k)}" value="${esc(x)}">`).join('') : `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`))
            .join('')}
          <select class="select" name="sort" onchange="this.form.submit()">
            <option value="new" ${filters.sort === 'new' ? 'selected' : ''}>${esc(t('sort.new'))}</option>
            <option value="popular" ${filters.sort === 'popular' ? 'selected' : ''}>${esc(t('sort.popular'))}</option>
            <option value="price-asc" ${filters.sort === 'price-asc' ? 'selected' : ''}>${esc(t('sort.priceAsc'))}</option>
            <option value="price-desc" ${filters.sort === 'price-desc' ? 'selected' : ''}>${esc(t('sort.priceDesc'))}</option>
            <option value="name" ${filters.sort === 'name' ? 'selected' : ''}>${esc(t('sort.name'))}</option>
          </select>
        </form>
      </div>
      ${activeChips}
      ${grid}
      ${loadMore}
      ${pagination(result.page, result.pages, baseQuery, url(canonCatPath))}
    </div>
  </div>`;

  return layout({
    settings,
    categories,
    active: '/catalog',
    title: heading,
    description: subtitle,
    ogImage: result.items[0] ? result.items[0].images[0] : 'logo.png',
    jsonLd,
    pageType: 'catalog',
    body,
    path: canonCatPath,
    bodyClass: 'catalog-page',
  });
}

function parseFilters(query) {
  const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  return {
    q: query.q || '',
    category: arr(query.category).filter(Boolean),
    brand: arr(query.brand).filter(Boolean),
    minPrice: query.minPrice || '',
    maxPrice: query.maxPrice || '',
    inStock: query.inStock === '1' || query.inStock === 'true',
    featured: query.featured === '1' || query.featured === 'true',
    sort: query.sort || 'new',
    page: query.page || 1,
    perPage: query.perPage || 24,
  };
}

function chipUrl(query, key, val) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (k === key) {
      const vals = (Array.isArray(v) ? v : [v]).filter((x) => x !== val);
      vals.forEach((x) => q.append(k, x));
    } else if (k === 'page') {
      continue;
    } else if (Array.isArray(v)) {
      v.forEach((x) => q.append(k, x));
    } else if (v != null && v !== '') {
      q.append(k, v);
    }
  }
  const s = q.toString();
  return url('/catalog') + (s ? '?' + s : '');
}

/** Product cards fragment for "load more". */
function catalogCards(settings, query) {
  const filters = parseFilters(query);
  const result = store.getVisibleProducts(filters);
  return result.items.map((p) => productCard(p, settings)).join('');
}

function productPage(settings, categories, product) {
  store.incrementViews(product.id);
  const images = product.images && product.images.length ? product.images : [null];
  const related = store.getRelated(product, 8);
  const name = i18n.productName(product);
  const description = i18n.productDescription(product);
  const discount = product.oldPrice && product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const productUrl = i18n.canonical('/product/' + (product.slug || product.id));

  const thumbs = images
    .map((src, i) => `<div class="gthumb ${i === 0 ? 'on' : ''}" data-thumb="${i}"><img src="${img(src, 200)}" alt="" loading="lazy"></div>`)
    .join('');

  const sizes = (product.sizes || []).length
    ? `<div class="pi-opt">
        <div class="lbl"><span>${esc(t('product.size'))}</span><span data-size-label></span></div>
        <div class="size-opts">
          ${product.sizes.map((s, i) => `<label class="size-opt"><input type="radio" name="size" value="${esc(s)}" ${i === 0 ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('')}
        </div>
      </div>`
    : '';

  const relatedGrid = related.length
    ? `<section class="section container">
        <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap">
          <div><span class="eyebrow">${esc(t('product.relatedEyebrow'))}</span><h2 style="margin-top:12px">${esc(t('product.relatedTitle'))}</h2></div>
          <a href="${esc(catHref(product.category))}" class="link-arrow">${esc(t('product.allCategory'))} ${icon('arrow')}</a>
        </div>
        <div class="product-grid">${related.map((p) => productCard(p, settings)).join('')}</div>
      </section>`
    : '';

  const jsonLd = [
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: (description || name).slice(0, 500),
      sku: product.sku || product.id,
      brand: { '@type': 'Brand', name: product.brand || settings.siteName },
      category: catName(product.category),
      image: images.filter(Boolean).slice(0, 4).map((s) => i18n.abs(ui.rawImage(s))),
      url: productUrl,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'UAH',
        price: product.price,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: settings.siteName },
      },
    }),
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav.home'), item: i18n.abs(url('/')) },
        { '@type': 'ListItem', position: 2, name: t('nav.catalog'), item: i18n.abs(url('/catalog')) },
        { '@type': 'ListItem', position: 3, name: catName(product.category), item: i18n.abs(catHref(product.category)) },
        { '@type': 'ListItem', position: 4, name, item: productUrl },
      ],
    }),
  ].join('\n');

  const body = `
  <div class="container product-page">
    <div class="breadcrumbs">
      <a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span>
      <a href="${esc(url('/catalog'))}">${esc(t('nav.catalog'))}</a><span class="sep">/</span>
      <a href="${esc(catHref(product.category))}">${esc(catName(product.category))}</a><span class="sep">/</span>
      <span>${esc(name)}</span>
    </div>

    <div class="product-top">
      <div class="gallery">
        <div class="gallery-thumbs" id="galleryThumbs">${thumbs}</div>
        <div class="gallery-main">
          <img id="galleryMain" src="${img(images[0], 1000)}" alt="${esc(name)}" width="800" height="1000">
          <span class="zoom-hint">${icon('search')} ${esc(t('product.zoom'))}</span>
        </div>
      </div>

      <div class="product-info">
        <span class="p-brand">${esc(product.brand || catName(product.category))}</span>
        <h1>${esc(name)}</h1>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <span class="pi-stock ${product.inStock ? 'in' : 'out'}"><span class="dot"></span>${esc(product.inStock ? t('common.inStock') : t('common.notAvailable'))}</span>
          ${discount ? `<span class="badge sale">-${discount}%</span>` : ''}
          ${product.sku ? `<span class="small muted">${esc(t('product.article'))}: ${esc(product.sku)}</span>` : ''}
        </div>

        <div class="pi-price">
          <b>${money(product.price, settings.currency)}</b>
          ${product.oldPrice && product.oldPrice > product.price ? `<s>${money(product.oldPrice, settings.currency)}</s>` : ''}
        </div>

        ${description ? `<p class="pi-desc">${esc(description)}</p>` : ''}

        ${sizes}

        <div class="pi-opt">
          <div class="lbl"><span>${esc(t('product.qty'))}</span></div>
          <div class="qty">
            <button type="button" data-qminus>${icon('minus')}</button>
            <input type="number" id="qtyInput" value="1" min="1" max="99">
            <button type="button" data-qplus>${icon('plus')}</button>
          </div>
        </div>

        <div class="buy-row">
          <button class="btn" id="addToCartBtn" ${product.inStock ? '' : 'disabled'} data-product-id="${esc(product.id)}">
            ${product.inStock ? icon('cart') + ' ' + esc(t('product.add')) : esc(t('common.notAvailable'))}
          </button>
          <button class="btn btn-outline" data-fav="${esc(product.id)}" data-fav-big>${icon('heart')} ${esc(t('common.fav'))}</button>
        </div>

        <div class="pi-meta">
          <div>${icon('truck')}<span>${esc(t('product.deliveryText', { amount: money(settings.freeShippingFrom || 5000, settings.currency) }))}</span></div>
          <div>${icon('return')}<span>${esc(t('product.returnText'))}</span></div>
          <div>${icon('shield')}<span>${esc(t('product.origText'))}</span></div>
        </div>

        <div class="accordion">
          <div class="acc-item open">
            <button class="acc-head" type="button">${esc(t('product.desc'))} <span class="ic">${icon('plus')}</span></button>
            <div class="acc-body"><div class="acc-body-inner">${esc(description || t('product.descFallback'))}</div></div>
          </div>
          <div class="acc-item">
            <button class="acc-head" type="button">${esc(t('product.shipping'))} <span class="ic">${icon('plus')}</span></button>
            <div class="acc-body"><div class="acc-body-inner">${esc(t('product.shippingBody', { amount: money(settings.freeShippingFrom || 5000, settings.currency) }))}</div></div>
          </div>
          <div class="acc-item">
            <button class="acc-head" type="button">${esc(t('product.returns'))} <span class="ic">${icon('plus')}</span></button>
            <div class="acc-body"><div class="acc-body-inner">${esc(t('product.returnsBody'))}</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script id="productData" type="application/json">${JSON.stringify({
    id: product.id,
    name: name,
    price: product.price,
    image: img(images[0], 600),
    brand: product.brand || '',
    inStock: product.inStock,
    sizes: product.sizes || [],
  }).replace(/</g, '\\u003c')}</script>
  ${relatedGrid}`;

  return layout({
    settings,
    categories,
    active: '/catalog',
    title: name,
    description: description ? description.slice(0, 160) : name,
    ogImage: images[0],
    ogType: 'product',
    jsonLd,
    pageType: 'product',
    body,
    bodyClass: 'product-view',
  });
}

function cartPage(settings, categories) {
  const body = `
  <section class="page-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('cartPage.title'))}</span></div>
      <h1>${esc(t('cartPage.title'))}</h1>
      <p>${esc(t('cartPage.subtitle'))}</p>
    </div>
  </section>
  <div class="container" style="padding:44px 0 80px">
    <div id="cartPageContent"></div>
  </div>`;
  return layout({ settings, categories, active: '/catalog', title: t('cartPage.title'), body, pageType: 'cart', bodyClass: 'cart-view' });
}

function checkoutPage(settings, categories, user) {
  const u = user || {};
  const body = `
  <section class="page-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><a href="${esc(url('/cart'))}">${esc(t('cartPage.title'))}</a><span class="sep">/</span><span>${esc(t('checkout.title'))}</span></div>
      <h1>${esc(t('checkout.title'))}</h1>
      <p>${esc(t('checkout.subtitle'))}</p>
    </div>
  </section>
  <div class="container">
    <div class="checkout-grid">
      <div>
        <form id="checkoutForm" class="card">
          <h2>${esc(t('checkout.recipient'))}</h2>
          <div class="form-grid two">
            <div class="field"><label>${esc(t('checkout.name'))} <span class="req">*</span></label><input name="name" required autocomplete="name" value="${esc(u.name || '')}"></div>
            <div class="field"><label>${esc(t('checkout.phone'))} <span class="req">*</span></label><input name="phone" required autocomplete="tel" placeholder="+380 __ ___ __ __" value="${esc(u.phone || '')}"></div>
          </div>
          <div class="field" style="margin-top:18px"><label>${esc(t('checkout.email'))}</label><input type="email" name="email" autocomplete="email" placeholder="you@email.com" value="${esc(u.email || '')}"></div>
          <div class="field" style="margin-top:18px">
            <label>${esc(t('checkout.shippingMethod'))}</label>
            <select name="shippingMethod">
              <option>${esc(t('checkout.ship1'))}</option>
              <option>${esc(t('checkout.ship2'))}</option>
              <option>${esc(t('checkout.ship3'))}</option>
              <option>${esc(t('checkout.ship4'))}</option>
            </select>
          </div>
          <div class="form-grid two" style="margin-top:18px">
            <div class="field"><label>${esc(t('checkout.city'))} <span class="req">*</span></label><input name="city" required autocomplete="address-level2"></div>
            <div class="field"><label>${esc(t('checkout.warehouse'))}</label><input name="warehouse" placeholder="${esc(t('checkout.warehousePlaceholder'))}"></div>
          </div>
          <div class="field" style="margin-top:18px">
            <label>${esc(t('checkout.payment'))}</label>
            <div class="payment-opts">
              <label class="pay-opt active"><input type="radio" name="payment" value="${esc(t('checkout.pay1'))}" checked><span class="radio"></span><span><b>${esc(t('checkout.pay1'))}</b><span>${esc(t('checkout.pay1desc'))}</span></span></label>
              <label class="pay-opt"><input type="radio" name="payment" value="${esc(t('checkout.pay2'))}"><span class="radio"></span><span><b>${esc(t('checkout.pay2'))}</b><span>${esc(t('checkout.pay2desc'))}</span></span></label>
            </div>
          </div>
          <div class="field" style="margin-top:18px"><label>${esc(t('checkout.comment'))}</label><textarea name="comment" placeholder="${esc(t('checkout.commentPlaceholder'))}"></textarea></div>
          <button class="btn btn-block" type="submit" style="margin-top:24px">${esc(t('checkout.confirm'))} ${icon('arrow')}</button>
        </form>
      </div>
      <aside class="card order-summary">
        <h2>${esc(t('checkout.yourOrder'))}</h2>
        <div id="checkoutSummary"></div>
      </aside>
    </div>
  </div>`;
  return layout({ settings, categories, active: '/catalog', title: t('checkout.title'), body, pageType: 'checkout', bodyClass: 'checkout-view' });
}

function orderSuccess(settings, categories, order, token) {
  const body = `
  <div class="container" style="padding:70px 0 100px;max-width:760px;text-align:center">
    <div style="width:86px;height:86px;border-radius:50%;background:#e9f5ef;color:var(--green);display:grid;place-items:center;margin:0 auto 24px">
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ui.ICONS.check}</svg>
    </div>
    <span class="eyebrow">${esc(t('order.eyebrow'))}</span>
    <h1 style="font-size:clamp(30px,4vw,46px);margin:16px 0">${esc(t('order.accepted', { id: order.id }))}</h1>
    <p class="muted" style="max-width:520px;margin:0 auto 30px">${esc(t('order.manager'))}</p>
    <div class="card" style="text-align:left">
      ${order.items
        .map(
          (it) => `
        <div class="os-item">
          <img src="${img(it.image, 120)}" alt="">
          <div><div class="n">${esc(it.name)}</div><div class="small muted">${it.qty} × ${money(it.price, settings.currency)}${it.size ? ' · ' + esc(it.size) : ''}</div></div>
          <div class="p">${money(it.price * it.qty, settings.currency)}</div>
        </div>`
        )
        .join('')}
      <div class="summary-row" style="margin-top:18px"><span>${esc(t('cartPage.delivery'))}</span><b>${order.shipping != null ? (order.shipping ? money(order.shipping, settings.currency) : esc(t('common.free'))) : esc(t('cartPage.byCarrier'))}</b></div>
      <div class="summary-row total"><span>${esc(t('cartPage.total'))}</span><span>${money(order.total, settings.currency)}</span></div>
    </div>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:30px;flex-wrap:wrap">
      <a href="${esc(url('/catalog'))}" class="btn">${esc(t('order.continue'))} ${icon('arrow')}</a>
      <a href="${esc(url('/'))}" class="btn btn-ghost">${esc(t('order.toHome'))}</a>
    </div>
  </div>`;
  return layout({
    settings,
    categories,
    active: '/catalog',
    title: t('order.accepted', { id: order.id }),
    body,
    pageType: 'order',
    bodyClass: 'order-view',
  });
}

function about(settings, categories) {
  const stats = store.stats();
  const body = `
  <section class="page-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('nav.about'))}</span></div>
      <h1>${esc(t('about.title'))}</h1>
      <p>${esc(t('about.subtitle'))}</p>
    </div>
  </section>
  <section class="section container">
    <div class="split">
      <div class="split-media reveal">
        <img src="${img((store.getVisibleProducts({ perPage: 1, sort: 'popular' }).items[0] || {}).images?.[0] || 'images/6991783925.jpg', 800)}" alt="${esc(settings.siteName)}">
        <div class="float-card"><span class="ic-round">${icon('sparkle')}</span><div><b style="font-size:15px">${stats.products}+ ${esc(tn('common.products', stats.products))}</b><div class="small muted">${esc(t('about.productsSub'))}</div></div></div>
      </div>
      <div class="split-body reveal d2 prose">
        <span class="eyebrow">${esc(t('about.historyEyebrow'))}</span>
        <h2>${esc(t('about.historyTitle'))}</h2>
        <p>${esc(t('about.p1'))}</p>
        <p>${esc(t('about.p2'))}</p>
        <ul class="check-list">
          <li>${icon('check')}<span>${esc(t('about.p3'))}</span></li>
          <li>${icon('check')}<span>${esc(t('about.p4'))}</span></li>
          <li>${icon('check')}<span>${esc(t('about.p5'))}</span></li>
        </ul>
      </div>
    </div>
  </section>
  <section class="section-sm container">
    <div class="features">
      ${[
        ['star', t('about.f1Title'), t('about.f1Text')],
        ['truck', t('about.f2Title'), t('about.f2Text')],
        ['heart', t('about.f3Title'), t('about.f3Text')],
        ['return', t('about.f4Title'), t('about.f4Text')],
      ]
        .map(([ic, title, d], i) => `<div class="feature reveal d${i + 1}"><span class="ic-round">${icon(ic)}</span><h3>${esc(title)}</h3><p>${esc(d)}</p></div>`)
        .join('')}
    </div>
  </section>
  <section class="section container">
    <div class="newsletter">
      <div class="newsletter-inner">
        <div><span class="eyebrow" style="color:var(--accent-2)">${esc(t('nl.join'))}</span><h2>${esc(t('nl.aboutTitle'))}</h2><p>${esc(t('nl.aboutText'))}</p></div>
        <form class="news-form" data-news><input type="email" name="email" placeholder="${esc(t('nl.placeholder'))}" required><button class="btn btn-light" type="submit">${esc(t('nl.button'))} ${icon('arrow')}</button></form>
      </div>
    </div>
  </section>`;
  return layout({ settings, categories, active: '/about', title: t('nav.about'), body, pageType: 'about' });
}

function contacts(settings, categories) {
  const body = `
  <section class="page-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('nav.contacts'))}</span></div>
      <h1>${esc(t('contacts.title'))}</h1>
      <p>${esc(t('contacts.subtitle'))}</p>
    </div>
  </section>
  <section class="section container">
    <div class="features" style="grid-template-columns:repeat(3,1fr)">
      <div class="feature"><span class="ic-round">${icon('phone')}</span><h3>${esc(t('contacts.phone'))}</h3><p><a href="tel:${esc((settings.phone || '').replace(/[^+\d]/g, ''))}">${esc(settings.phone || '')}</a></p></div>
      <div class="feature"><span class="ic-round">${icon('mail')}</span><h3>${esc(t('contacts.email'))}</h3><p><a href="mailto:${esc(settings.email || '')}">${esc(settings.email || '')}</a></p></div>
      <div class="feature"><span class="ic-round">${icon('pin')}</span><h3>${esc(t('contacts.address'))}</h3><p>${esc(settings.address || '')}</p></div>
    </div>
  </section>
  <section class="section-sm container">
    <div class="split">
      <div class="split-body prose reveal">
        <span class="eyebrow">${esc(t('contacts.deliveryEyebrow'))}</span>
        <h2>${esc(t('contacts.deliveryTitle'))}</h2>
        <h3>${esc(t('contacts.deliveryH'))}</h3>
        <ul>
          <li>${esc(t('contacts.delivery1'))}</li>
          <li>${esc(t('contacts.delivery2'))}</li>
          <li>${esc(t('contacts.delivery3'))}</li>
          <li>${esc(t('contacts.delivery4', { amount: money(settings.freeShippingFrom || 5000, settings.currency) }))}</li>
        </ul>
        <h3>${esc(t('contacts.paymentH'))}</h3>
        <ul>
          <li>${esc(t('contacts.payment1'))}</li>
          <li>${esc(t('contacts.payment2'))}</li>
        </ul>
        <h3>${esc(t('contacts.returnH'))}</h3>
        <p>${esc(t('contacts.returnText'))}</p>
      </div>
      <div class="split-media reveal d2">
        <div class="card" style="padding:34px">
          <h2 style="font-size:24px;margin-bottom:18px">${esc(t('contacts.writeUs'))}</h2>
          <form data-contact class="form-grid">
            <div class="field"><label>${esc(t('contacts.name'))}</label><input name="name" required placeholder="${esc(t('contacts.namePlaceholder'))}"></div>
            <div class="field"><label>${esc(t('contacts.contact'))}</label><input name="contact" required placeholder="${esc(t('contacts.contactPlaceholder'))}"></div>
            <div class="field"><label>${esc(t('contacts.message'))}</label><textarea name="message" required placeholder="${esc(t('contacts.messagePlaceholder'))}"></textarea></div>
            <button class="btn btn-block" type="submit">${esc(t('contacts.send'))} ${icon('send')}</button>
          </form>
        </div>
      </div>
    </div>
  </section>`;
  return layout({ settings, categories, active: '/contacts', title: t('nav.contacts'), body, pageType: 'contacts' });
}

const ORDER_STATUS = {
  new: { key: 'admin.status.new', color: '#9c2543' },
  confirmed: { key: 'admin.status.confirmed', color: '#b45309' },
  shipped: { key: 'admin.status.shipped', color: '#1d4ed8' },
  done: { key: 'admin.status.done', color: '#2f7d5b' },
  cancelled: { key: 'admin.status.cancelled', color: '#857b72' },
};

function accountFlash(opts) {
  const q = opts || {};
  const msg = (key, cls) => (q[key] ? `<div class="account-flash ${cls}">${icon(cls === 'ok' ? 'check' : 'x')} ${esc(t(q[key]))}</div>` : '');
  if (q.ok === 'registered') return msg('account.registered', 'ok');
  if (q.ok === 'saved') return msg('account.saved', 'ok');
  if (q.ok === 'pass') return msg('account.passChanged', 'ok');
  if (q.error === 'wrong') return msg('account.errWrong', 'err');
  if (q.error === 'wrongpass') return msg('account.errWrongPass', 'err');
  if (q.error === 'exists') return msg('account.errExists', 'err');
  if (q.error === 'email') return msg('account.errEmail', 'err');
  if (q.error === 'password') return msg('account.errPassword', 'err');
  if (q.error === 'password2') return msg('account.errPassword2', 'err');
  if (q.error === 'fields') return msg('account.errFields', 'err');
  return '';
}

function accountAuthHead() {
  return `
  <section class="page-head account-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('account.title'))}</span></div>
    </div>
  </section>`;
}

function accountLogin(settings, categories, opts) {
  const o = opts || {};
  const body = `
  ${accountAuthHead()}
  <div class="container account-auth-wrap">
    <form class="card account-auth" method="post" action="${esc(url('/account/login'))}">
      <span class="eyebrow">${esc(t('account.title'))}</span>
      <h1>${esc(t('account.loginTitle'))}</h1>
      <p class="muted">${esc(t('account.loginSub'))}</p>
      ${accountFlash(o)}
      <input type="hidden" name="_csrf" value="${esc(o.csrf || '')}">
      <div class="form-grid">
        <div class="field"><label>${esc(t('account.email'))}</label><input type="email" name="email" required autocomplete="email" value="${esc(o.email || '')}" placeholder="you@email.com"></div>
        <div class="field"><label>${esc(t('account.password'))}</label><input type="password" name="password" required autocomplete="current-password"></div>
      </div>
      <button class="btn btn-block" type="submit" style="margin-top:22px">${esc(t('account.login'))} ${icon('arrow')}</button>
      <p class="account-alt">${esc(t('account.noAccount'))} <a href="${esc(url('/account/register'))}">${esc(t('account.createOne'))}</a></p>
    </form>
  </div>`;
  return layout({ settings, categories, active: '/account', title: t('account.loginTitle'), body, pageType: 'account', bodyClass: 'account-view' });
}

function accountRegister(settings, categories, opts) {
  const o = opts || {};
  const body = `
  ${accountAuthHead()}
  <div class="container account-auth-wrap">
    <form class="card account-auth" method="post" action="${esc(url('/account/register'))}">
      <span class="eyebrow">${esc(t('account.title'))}</span>
      <h1>${esc(t('account.registerTitle'))}</h1>
      <p class="muted">${esc(t('account.registerSub'))}</p>
      ${accountFlash(o)}
      <input type="hidden" name="_csrf" value="${esc(o.csrf || '')}">
      <div class="form-grid">
        <div class="field"><label>${esc(t('account.name'))}</label><input name="name" autocomplete="name" value="${esc(o.name || '')}"></div>
        <div class="field"><label>${esc(t('account.email'))}</label><input type="email" name="email" required autocomplete="email" value="${esc(o.email || '')}" placeholder="you@email.com"></div>
        <div class="field"><label>${esc(t('account.phone'))}</label><input name="phone" autocomplete="tel" value="${esc(o.phone || '')}" placeholder="+380 __ ___ __ __"></div>
        <div class="form-grid two">
          <div class="field"><label>${esc(t('account.password'))}</label><input type="password" name="password" required autocomplete="new-password" minlength="6"></div>
          <div class="field"><label>${esc(t('account.password2'))}</label><input type="password" name="password2" required autocomplete="new-password" minlength="6"></div>
        </div>
      </div>
      <button class="btn btn-block" type="submit" style="margin-top:22px">${esc(t('account.register'))} ${icon('arrow')}</button>
      <p class="account-alt">${esc(t('account.haveAccount'))} <a href="${esc(url('/account/login'))}">${esc(t('account.signIn'))}</a></p>
    </form>
  </div>`;
  return layout({ settings, categories, active: '/account', title: t('account.registerTitle'), body, pageType: 'account', bodyClass: 'account-view' });
}

function accountPage(settings, categories, opts) {
  const o = opts || {};
  const user = o.user || {};
  const orders = o.orders || [];
  const activeOrders = orders.filter((x) => x.status !== 'cancelled');
  const spent = activeOrders.reduce((s, x) => s + (Number(x.total) || 0), 0);
  const dfmt = (d) => (d ? new Date(d).toLocaleDateString(i18n.getLang() === 'en' ? 'en-GB' : 'uk-UA') : '—');
  const greetingName = user.name || user.email || '';

  const ordersHtml = orders.length
    ? orders
        .map((ord) => {
          const st = ORDER_STATUS[ord.status] || ORDER_STATUS.new;
          const itemsCount = (ord.items || []).reduce((s, it) => s + (it.qty || 1), 0);
          const thumbs = (ord.items || [])
            .slice(0, 4)
            .map((it) => `<img src="${img(it.image, 120)}" alt="" loading="lazy">`)
            .join('');
          return `
        <div class="account-order">
          <div class="ao-head">
            <div>
              <a class="ao-id" href="${esc(url('/order/' + ord.id + '?token=' + ord.token))}">${esc(t('account.orderNo', { id: ord.id }))}</a>
              <span class="ao-date">${esc(t('account.orderDate', { date: dfmt(ord.createdAt) }))}</span>
            </div>
            <span class="ao-status" style="background:${st.color}1a;color:${st.color}">${esc(t(st.key))}</span>
          </div>
          <div class="ao-body">
            <div class="ao-thumbs">${thumbs}</div>
            <div class="ao-meta">
              <div><span class="muted small">${esc(t('account.orderItems'))}</span><b>${itemsCount}</b></div>
              <div><span class="muted small">${esc(t('account.orderTotal'))}</span><b>${money(ord.total, settings.currency)}</b></div>
            </div>
            <a class="btn btn-ghost btn-sm" href="${esc(url('/order/' + ord.id + '?token=' + ord.token))}">${esc(t('account.viewOrder'))} ${icon('arrow')}</a>
          </div>
        </div>`;
        })
        .join('')
    : `<div class="empty-state" style="padding:50px 20px">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${ui.ICONS.box}</svg>
        <h3>${esc(t('account.noOrders'))}</h3>
        <p>${esc(t('account.noOrdersText'))}</p>
        <a href="${esc(url('/catalog'))}" class="btn">${esc(t('account.toCatalog'))} ${icon('arrow')}</a>
      </div>`;

  const body = `
  <section class="page-head account-head">
    <div class="container">
      <div class="breadcrumbs"><a href="${esc(url('/'))}">${esc(t('nav.home'))}</a><span class="sep">/</span><span>${esc(t('account.title'))}</span></div>
      <div class="account-hello">
        <div>
          <h1>${esc(t('account.greeting', { name: greetingName }))}</h1>
          <p class="muted">${esc(t('account.memberSince', { date: dfmt(user.createdAt) }))}</p>
        </div>
        <a href="${esc(url('/account/logout'))}" class="btn btn-ghost btn-sm">${icon('logout')} ${esc(t('account.logout'))}</a>
      </div>
    </div>
  </section>

  <div class="container account-body">
    ${accountFlash(o)}
    <div class="account-stats">
      <div class="account-stat"><span class="as-ic">${icon('box')}</span><div><b>${orders.length}</b><span>${esc(t('account.totalOrders'))}</span></div></div>
      <div class="account-stat"><span class="as-ic">${icon('tag')}</span><div><b>${money(spent, settings.currency)}</b><span>${esc(t('account.totalSpent'))}</span></div></div>
    </div>

    <div class="account-grid">
      <div class="account-main">
        <div class="a-panel-head-simple"><h2>${esc(t('account.myOrders'))}</h2></div>
        <div class="account-orders">${ordersHtml}</div>
      </div>
      <aside class="account-side">
        <form class="card" method="post" action="${esc(url('/account/profile'))}">
          <h3>${esc(t('account.personal'))}</h3>
          <input type="hidden" name="_csrf" value="${esc(o.csrf || '')}">
          <div class="form-grid">
            <div class="field"><label>${esc(t('account.name'))}</label><input name="name" value="${esc(user.name || '')}"></div>
            <div class="field"><label>${esc(t('account.email'))}</label><input value="${esc(user.email || '')}" disabled></div>
            <div class="field"><label>${esc(t('account.phone'))}</label><input name="phone" value="${esc(user.phone || '')}" placeholder="+380 __ ___ __ __"></div>
          </div>
          <button class="btn btn-block" type="submit" style="margin-top:18px">${esc(t('account.saveProfile'))}</button>
        </form>

        <form class="card" method="post" action="${esc(url('/account/password'))}">
          <h3>${esc(t('account.changePass'))}</h3>
          <input type="hidden" name="_csrf" value="${esc(o.csrf || '')}">
          <div class="form-grid">
            <div class="field"><label>${esc(t('account.currentPass'))}</label><input type="password" name="current" required></div>
            <div class="field"><label>${esc(t('account.newPass'))}</label><input type="password" name="next" required minlength="6"></div>
          </div>
          <button class="btn btn-ghost btn-block" type="submit" style="margin-top:18px">${icon('shield')} ${esc(t('account.savePass'))}</button>
        </form>
      </aside>
    </div>
  </div>`;
  return layout({ settings, categories, active: '/account', title: t('account.title'), body, pageType: 'account', bodyClass: 'account-view' });
}

function notFound(settings, categories) {
  const body = `
  <div class="container" style="padding:100px 0;text-align:center">
    <div style="font-family:var(--serif);font-size:120px;line-height:1;color:var(--accent)">404</div>
    <h1 style="font-size:36px;margin:20px 0 12px">${esc(t('nf.title'))}</h1>
    <p class="muted" style="margin-bottom:26px">${esc(t('nf.text'))}</p>
    <a href="${esc(url('/catalog'))}" class="btn">${esc(t('nf.button'))} ${icon('arrow')}</a>
  </div>`;
  return layout({ settings, categories, active: '', title: '404', body, pageType: '404' });
}

module.exports = {
  home,
  catalog,
  catalogCards,
  productPage,
  cartPage,
  checkoutPage,
  orderSuccess,
  about,
  contacts,
  accountLogin,
  accountRegister,
  accountPage,
  notFound,
  parseFilters,
};
