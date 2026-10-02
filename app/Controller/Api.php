<?php
declare(strict_types=1);

namespace Onika\Controller;

use Onika\Auth;
use Onika\I18n;
use Onika\Media;
use Onika\RateLimit;
use Onika\Repo\Categories;
use Onika\Repo\Messages;
use Onika\Repo\Orders;
use Onika\Repo\Products;
use Onika\Repo\Subscribers;
use Onika\Request;
use Onika\Response;
use Onika\Session;
use Onika\Text;

/** JSON endpoints used by the storefront scripts. */
final class Api
{
    /** Compact product representation for cards in drawers / search dropdown. */
    public static function brief(array $p): array
    {
        return [
            'id' => $p['id'],
            'slug' => $p['slug'],
            'name' => I18n::productName($p),
            'price' => $p['price'],
            'oldPrice' => $p['oldPrice'],
            'brand' => $p['brand'],
            'category' => I18n::categoryName($p['category']),
            'inStock' => $p['inStock'],
            'stock' => $p['stock'],
            'sizes' => $p['sizes'],
            'image' => Media::url($p['images'][0] ?? null, 300),
            'url' => url('/product/' . $p['slug']),
        ];
    }

    /** GET /api/search?q= — suggestions for the header search box. */
    public static function search(array $p): Response
    {
        $q = trim((string) Request::query('q', ''));
        if (mb_strlen($q) < 2) {
            return Response::json(['ok' => true, 'items' => [], 'categories' => [], 'total' => 0]);
        }
        $r = Products::search(['q' => $q, 'per_page' => 6, 'sort' => 'popular']);
        $lower = Text::lower($q);
        $cats = [];
        foreach (Categories::visible() as $c) {
            $label = I18n::categoryLabel($c);
            if (str_contains(Text::lower($label), $lower)) {
                $cats[] = ['name' => $label, 'url' => url('/catalog/' . $c['slug']), 'count' => $c['count']];
            }
        }
        return Response::json([
            'ok' => true,
            'items' => array_map([self::class, 'brief'], $r['items']),
            'categories' => array_slice($cats, 0, 3),
            'total' => $r['total'],
            'all' => url('/catalog') . '?q=' . rawurlencode($q),
        ])->header('Cache-Control', 'private, max-age=30');
    }

    /** GET /api/products?ids=1,2,3 — fresh price/stock data for cart, favourites and "recently viewed". */
    public static function products(array $p): Response
    {
        $ids = array_filter(explode(',', (string) Request::query('ids', '')), 'strlen');
        $items = array_map([self::class, 'brief'], Products::byIds($ids));
        return Response::json(['ok' => true, 'items' => $items])->noCache();
    }

    /** POST /api/orders (JSON). */
    public static function createOrder(array $p): Response
    {
        Session::requireCsrf();
        RateLimit::guard('order', 15, 600);
        $user = Auth::user();
        $r = Orders::create(Request::json() ?: $_POST, $user['id'] ?? null);
        if (!$r['ok']) {
            $errors = $r['errors'] ?? [];
            $msg = t('js.orderError');
            if (($errors['items'] ?? '') === 'unavailable') {
                $msg = !empty($r['limits']) ? t('js.stockLimit') : t('js.unavailable');
            } elseif (($errors['items'] ?? '') === 'empty') {
                $msg = t('js.emptyCart');
            }
            return Response::json(['ok' => false, 'error' => $msg, 'errors' => $errors, 'unavailable' => $r['unavailable'] ?? [], 'limits' => (object) ($r['limits'] ?? [])], 422);
        }
        $o = $r['order'];
        return Response::json([
            'ok' => true,
            'order' => ['id' => $o['id'], 'total' => $o['total']],
            'redirect' => url('/order/' . $o['id']) . '?token=' . $o['token'],
        ]);
    }

    /** POST /api/subscribe (JSON {email}). */
    public static function subscribe(array $p): Response
    {
        Session::requireCsrf();
        RateLimit::guard('subscribe', 8, 600);
        return Response::json(['ok' => Subscribers::add((string) Request::input('email', ''))]);
    }

    /** POST /api/contact (JSON {name, contact, message}). */
    public static function contact(array $p): Response
    {
        Session::requireCsrf();
        RateLimit::guard('contact', 6, 600);
        // Honeypot: real users never fill the hidden "website" field.
        if (Request::str('website') !== '') {
            return Response::json(['ok' => true]);
        }
        $name = Request::str('name');
        $contact = Request::str('contact');
        $message = Request::str('message');
        if ($name === '' || $contact === '' || mb_strlen($message) < 3) {
            return Response::json(['ok' => false, 'error' => t('contacts.fill')], 422);
        }
        Messages::add($name, $contact, $message);
        return Response::json(['ok' => true]);
    }
}
