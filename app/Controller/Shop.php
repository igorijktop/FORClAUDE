<?php
declare(strict_types=1);

namespace Onika\Controller;

use Onika\Auth;
use Onika\Halt;
use Onika\I18n;
use Onika\Media;
use Onika\Repo\Brands;
use Onika\Repo\Categories;
use Onika\Repo\Orders;
use Onika\Repo\Products;
use Onika\Repo\Settings;
use Onika\Repo\Stats;
use Onika\Request;
use Onika\Response;
use Onika\Session;
use Onika\Text;
use Onika\View;

final class Shop
{
    /* ------------------------------------------------------------------ home */
    public static function home(array $p): Response
    {
        $settings = Settings::all();
        $fresh = Products::search(['per_page' => 8, 'sort' => 'new'])['items'];
        $popular = Products::search(['per_page' => 4, 'sort' => 'popular'])['items'];
        // Tile count that always fills the grid: 1 big + 8 small (desktop), or 5, or all.
        $allCats = Categories::visible();
        $cats = array_slice($allCats, 0, count($allCats) >= 9 ? 9 : (count($allCats) >= 5 ? 5 : count($allCats)));
        foreach ($cats as &$c) {
            $top = Products::search(['category' => [$c['name']], 'per_page' => 1, 'sort' => 'popular'])['items'][0] ?? null;
            $c['cover'] = $top['images'][0] ?? null;
        }
        unset($c);
        $brands = Brands::visible();

        $heroTitle = Settings::tr('heroTitle', I18n::lang()) ?: t('home.title');
        $heroLead = Settings::tr('heroSubtitle', I18n::lang()) ?: t('home.lead');

        return View::shop('shop/home', [
            'fresh' => $fresh,
            'popular' => $popular,
            'cats' => $cats,
            'catBig' => count($cats) >= 5,
            'brands' => $brands,
            'productCount' => Stats::visibleProducts(),
            'heroTitle' => $heroTitle,
            'heroLead' => $heroLead,
        ], [
            'active' => 'home',
            'page' => 'home',
            'description' => strip_tags($heroLead),
            'image' => 'logo.png',
            'jsonLd' => [[
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $settings['siteName'],
                'url' => I18n::abs(url('/')),
                'inLanguage' => I18n::lang(),
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => I18n::abs(url('/catalog')) . '?q={search_term_string}',
                    'query-input' => 'required name=search_term_string',
                ],
            ]],
        ]);
    }

    /* --------------------------------------------------------------- catalog */
    /** Normalised filters from the query string (accepts legacy parameter names). */
    private static function filters(array $q, ?string $forcedCategory = null): array
    {
        $arr = static fn($v): array => array_values(array_filter(array_map('strval', (array) $v), static fn($s) => $s !== ''));
        $cats = $arr($q['category'] ?? []);
        if ($forcedCategory !== null && !in_array($forcedCategory, $cats, true)) {
            array_unshift($cats, $forcedCategory);
        }
        $sort = (string) ($q['sort'] ?? 'new');
        if (!in_array($sort, ['new', 'popular', 'price-asc', 'price-desc', 'name'], true)) {
            $sort = 'new';
        }
        $num = static fn($v): string => (isset($v) && is_numeric($v) && (float) $v >= 0) ? (string) (float) $v : '';
        return [
            'q' => mb_substr(trim((string) ($q['q'] ?? '')), 0, 80),
            'category' => array_slice($cats, 0, 20),
            'brand' => array_slice($arr($q['brand'] ?? []), 0, 30),
            'min' => $num($q['min'] ?? ($q['minPrice'] ?? null)),
            'max' => $num($q['max'] ?? ($q['maxPrice'] ?? null)),
            'in_stock' => !empty($q['in_stock'] ?? ($q['inStock'] ?? '')) ? 1 : 0,
            'featured' => !empty($q['featured']) ? 1 : 0,
            'sort' => $sort,
            'page' => max(1, (int) ($q['page'] ?? 1)),
        ];
    }

    public static function catalog(array $p): Response
    {
        $q = Request::queryAll();
        $f = self::filters($q);
        // /catalog?category[]=X only (no other filters) → pretty URL /catalog/<slug>
        if (count($f['category']) === 1) {
            $only = $f['category'][0];
            $rest = $f;
            $others = $rest['q'] !== '' || $rest['brand'] || $rest['min'] !== '' || $rest['max'] !== '' || $rest['in_stock'] || $rest['featured'];
            $cat = Categories::find($only);
            if ($cat && !$others) {
                $keep = ['sort' => $f['sort'] !== 'new' ? $f['sort'] : '', 'page' => $f['page'] > 1 ? $f['page'] : ''];
                $qs = query_string($keep);
                return Response::redirect(url('/catalog/' . $cat['slug']) . ($qs !== '' ? '?' . $qs : ''), 301);
            }
        }
        return self::renderCatalog($f, null);
    }

    public static function category(array $p): Response
    {
        $cat = Categories::find($p['slug']);
        if (!$cat || !$cat['active']) {
            return Response::notFound();
        }
        // Old links used the category name: /catalog/<Name> → canonical slug URL.
        if ($cat['slug'] !== $p['slug']) {
            return Response::redirect(url('/catalog/' . $cat['slug']), 301);
        }
        $f = self::filters(Request::queryAll(), $cat['name']);
        return self::renderCatalog($f, $cat);
    }

    private static function renderCatalog(array $f, ?array $cat): Response
    {
        $result = Products::search([
            'q' => $f['q'], 'category' => $f['category'], 'brand' => $f['brand'], 'min' => $f['min'], 'max' => $f['max'],
            'in_stock' => $f['in_stock'], 'featured' => $f['featured'], 'sort' => $f['sort'], 'page' => $f['page'],
            'per_page' => (int) cfg('per_page', 24),
        ]);
        $isCategoryPage = $cat !== null;
        $basePath = $isCategoryPage ? '/catalog/' . $cat['slug'] : '/catalog';
        $singleCat = count($f['category']) === 1 ? Categories::find($f['category'][0]) : null;

        // Query used for links (sort/page/filters). On a category page the category itself is implicit.
        $linkQuery = [
            'q' => $f['q'], 'category' => $isCategoryPage ? array_values(array_diff($f['category'], [$cat['name']])) : $f['category'],
            'brand' => $f['brand'], 'min' => $f['min'], 'max' => $f['max'], 'in_stock' => $f['in_stock'] ?: '', 'featured' => $f['featured'] ?: '',
            'sort' => $f['sort'] !== 'new' ? $f['sort'] : '',
        ];
        $data = [
            'f' => $f,
            'result' => $result,
            'basePath' => $basePath,
            'linkQuery' => $linkQuery,
            'cat' => $cat,
            'singleCat' => $singleCat,
            'categories' => Categories::visible(),
            'brands' => Brands::visible(),
            'priceRange' => self::priceRange(),
        ];

        $canonicalUrl = url($basePath) . (($qs = query_string($linkQuery + ['page' => $result['page'] > 1 ? $result['page'] : ''])) !== '' ? '?' . $qs : '');

        if (Request::query('partial') !== null) {
            $mode = (string) Request::query('partial');
            $cards = '';
            foreach ($result['items'] as $prod) {
                $cards .= view('shop/_card', ['p' => $prod]);
            }
            if ($mode === 'cards') {
                return Response::json([
                    'ok' => true, 'html' => $cards, 'page' => $result['page'], 'pages' => $result['pages'], 'total' => $result['total'],
                ])->noCache();
            }
            return Response::json([
                'ok' => true,
                'html' => view('shop/_catalog_main', $data),
                'url' => $canonicalUrl,
                'total' => $result['total'],
                'title' => self::catalogTitle($f, $cat, $singleCat),
            ])->noCache();
        }

        $title = self::catalogTitle($f, $cat, $singleCat);
        $subtitle = $singleCat ? t('catalog.singleCat', ['cat' => I18n::categoryLabel($singleCat)]) : t('catalog.subtitle');
        $crumbs = [['label' => t('nav.home'), 'url' => url('/')], ['label' => t('nav.catalog'), 'url' => url('/catalog')]];
        if ($singleCat) {
            $crumbs[] = ['label' => I18n::categoryLabel($singleCat), 'url' => null];
        }
        $noindex = $f['q'] !== '' || $f['brand'] || $f['min'] !== '' || $f['max'] !== '' || $f['in_stock'] || count($f['category']) > 1;
        $ld = [
            '@context' => 'https://schema.org', '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(static fn(array $c, int $i) => [
                '@type' => 'ListItem', 'position' => $i + 1, 'name' => $c['label'], 'item' => $c['url'] ? I18n::abs($c['url']) : I18n::abs($canonicalUrl),
            ], $crumbs, array_keys($crumbs)),
        ];
        return View::shop('shop/catalog', $data + ['title' => $title, 'subtitle' => $subtitle, 'crumbs' => $crumbs], [
            'title' => $title,
            'description' => $subtitle,
            'active' => $f['featured'] ? 'new' : 'catalog',
            'page' => 'catalog',
            'image' => $result['items'][0]['images'][0] ?? 'logo.png',
            'path' => $basePath,
            'noindex' => $noindex,
            'jsonLd' => [$ld],
            'bodyClass' => 'is-catalog',
        ]);
    }

    private static function catalogTitle(array $f, ?array $cat, ?array $singleCat): string
    {
        if ($f['featured'] && !$singleCat) {
            return t('nav.new');
        }
        if ($f['q'] !== '' && !$singleCat) {
            return t('search.resultsFor', ['q' => $f['q']]);
        }
        return $singleCat ? I18n::categoryLabel($singleCat) : t('catalog.title');
    }

    /** @return array{min:int,max:int} price bounds of the visible catalogue (for the slider placeholders). */
    private static function priceRange(): array
    {
        static $r = null;
        if ($r === null) {
            $row = \Onika\Db::one('SELECT MIN(price) AS lo, MAX(price) AS hi FROM products WHERE active = 1 AND category NOT IN (SELECT name FROM categories WHERE active = 0)');
            $r = ['min' => (int) floor((float) ($row['lo'] ?? 0)), 'max' => (int) ceil((float) ($row['hi'] ?? 0))];
        }
        return $r;
    }

    /* --------------------------------------------------------------- product */
    public static function product(array $p): Response
    {
        $prod = Products::findVisible($p['slug']);
        if (!$prod) {
            return Response::notFound();
        }
        // Old links used ids: redirect to the canonical slug URL.
        if ($prod['slug'] !== $p['slug']) {
            return Response::redirect(url('/product/' . $prod['slug']), 301);
        }
        self::countView($prod['id']);

        $settings = Settings::all();
        $name = I18n::productName($prod);
        $description = I18n::productDescription($prod);
        $related = Products::related($prod, 8);
        $cat = Categories::find($prod['category']);
        $catUrl = $cat ? url('/catalog/' . $cat['slug']) : url('/catalog');
        $catLabel = $cat ? I18n::categoryLabel($cat) : I18n::categoryName($prod['category']);
        $canonical = I18n::abs(I18n::url('/product/' . $prod['slug']));

        $ld = [
            [
                '@context' => 'https://schema.org', '@type' => 'Product',
                'name' => $name,
                'description' => Text::truncate($description !== '' ? $description : $name, 500),
                'sku' => $prod['sku'] ?: $prod['id'],
                'brand' => ['@type' => 'Brand', 'name' => $prod['brand'] ?: $settings['siteName']],
                'category' => $catLabel,
                'image' => array_map(static fn($s) => I18n::abs(Media::url($s, 1000)), array_slice($prod['images'], 0, 4)),
                'url' => $canonical,
                'offers' => [
                    '@type' => 'Offer', 'url' => $canonical, 'priceCurrency' => 'UAH', 'price' => $prod['price'],
                    'availability' => $prod['inStock'] ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    'itemCondition' => 'https://schema.org/NewCondition',
                    'seller' => ['@type' => 'Organization', 'name' => $settings['siteName']],
                ],
            ],
            [
                '@context' => 'https://schema.org', '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => t('nav.home'), 'item' => I18n::abs(url('/'))],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => t('nav.catalog'), 'item' => I18n::abs(url('/catalog'))],
                    ['@type' => 'ListItem', 'position' => 3, 'name' => $catLabel, 'item' => I18n::abs($catUrl)],
                    ['@type' => 'ListItem', 'position' => 4, 'name' => $name, 'item' => $canonical],
                ],
            ],
        ];

        return View::shop('shop/product', [
            'product' => $prod,
            'name' => $name,
            'description' => $description,
            'related' => $related,
            'catUrl' => $catUrl,
            'catLabel' => $catLabel,
            'shareUrl' => $canonical,
        ], [
            'title' => $name,
            'description' => Text::truncate($description !== '' ? $description : $name, 160),
            'active' => 'catalog',
            'page' => 'product',
            'image' => $prod['images'][0] ?? null,
            'type' => 'product',
            'jsonLd' => $ld,
            'bodyClass' => 'is-product',
        ]);
    }

    /** Count one view per visitor session and product (ignoring crawlers). */
    private static function countView(string $id): void
    {
        if (preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview/i', (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''))) {
            return;
        }
        $seen = (array) Session::get('viewed', []);
        if (in_array($id, $seen, true)) {
            return;
        }
        $seen[] = $id;
        Session::set('viewed', array_slice($seen, -200));
        Products::incrementViews($id);
    }

    /* ------------------------------------------------------------ cart, order */
    public static function cart(array $p): Response
    {
        return View::shop('shop/cart', [], ['title' => t('cartPage.title'), 'active' => 'catalog', 'page' => 'cart', 'noindex' => true]);
    }

    public static function checkout(array $p): Response
    {
        return View::shop('shop/checkout', ['user' => Auth::user()], ['title' => t('checkout.title'), 'active' => 'catalog', 'page' => 'checkout', 'noindex' => true]);
    }

    public static function order(array $p): Response
    {
        $order = Orders::find($p['id']);
        if (!$order) {
            return Response::notFound();
        }
        $user = Auth::user();
        $owner = $user && $order['userId'] && $order['userId'] === $user['id'];
        $token = (string) Request::query('token', '');
        if (!Auth::admin() && !$owner && !hash_equals($order['token'], $token)) {
            return Response::notFound();
        }
        return View::shop('shop/order', ['order' => $order], [
            'title' => t('order.accepted', ['id' => $order['id']]), 'active' => 'catalog', 'page' => 'order', 'noindex' => true,
        ]);
    }

    /* ---------------------------------------------------------------- content */
    public static function about(array $p): Response
    {
        $top = Products::search(['per_page' => 1, 'sort' => 'popular'])['items'][0] ?? null;
        return View::shop('shop/about', ['cover' => $top['images'][0] ?? null, 'productCount' => Stats::visibleProducts()], [
            'title' => t('nav.about'), 'description' => t('about.subtitle'), 'active' => 'about', 'page' => 'about',
        ]);
    }

    public static function contacts(array $p): Response
    {
        return View::shop('shop/contacts', [], [
            'title' => t('nav.contacts'), 'description' => t('contacts.subtitle'), 'active' => 'contacts', 'page' => 'contacts',
        ]);
    }
}
