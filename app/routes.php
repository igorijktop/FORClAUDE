<?php
declare(strict_types=1);

use Onika\Controller\Account;
use Onika\Controller\Admin;
use Onika\Controller\Api;
use Onika\Controller\Seo;
use Onika\Controller\Shop;
use Onika\Media;
use Onika\Router;

return static function (Router $r): void {
    /* ---------------------------------------------------------- storefront */
    $r->get('/', [Shop::class, 'home']);
    $r->get('/catalog', [Shop::class, 'catalog']);
    $r->get('/catalog/{slug}', [Shop::class, 'category']);
    $r->get('/product/{slug}', [Shop::class, 'product']);
    $r->get('/cart', [Shop::class, 'cart']);
    $r->get('/checkout', [Shop::class, 'checkout']);
    $r->get('/order/{id}', [Shop::class, 'order']);
    $r->get('/about', [Shop::class, 'about']);
    $r->get('/contacts', [Shop::class, 'contacts']);

    /* ------------------------------------------------------------- account */
    $r->get('/account', [Account::class, 'dashboard']);
    $r->get('/account/login', [Account::class, 'loginForm']);
    $r->post('/account/login', [Account::class, 'login']);
    $r->get('/account/register', [Account::class, 'registerForm']);
    $r->post('/account/register', [Account::class, 'register']);
    $r->post('/account/logout', [Account::class, 'logout']);
    $r->get('/account/logout', [Account::class, 'logoutGet']);
    $r->post('/account/profile', [Account::class, 'profile']);
    $r->post('/account/password', [Account::class, 'password']);

    /* ----------------------------------------------------------------- API */
    $r->get('/api/search', [Api::class, 'search']);
    $r->get('/api/products', [Api::class, 'products']);
    $r->post('/api/orders', [Api::class, 'createOrder']);
    $r->post('/api/subscribe', [Api::class, 'subscribe']);
    $r->post('/api/contact', [Api::class, 'contact']);

    /* ----------------------------------------------------------------- SEO */
    $r->get('/robots.txt', [Seo::class, 'robots']);
    $r->get('/sitemap.xml', [Seo::class, 'sitemap']);

    /* --------------------------------------------------------------- media */
    // Resized product images: /media/600/images/123.jpg.webp (generated once, then served as a static file).
    $r->get('/media/{w:\d+}/{dir:images|uploads}/{file:[A-Za-z0-9._-]+}', static function (array $p) {
        return Media::serve((int) $p['w'], $p['dir'], $p['file']);
    });
    $r->get('/favicon.ico', static fn() => \Onika\Response::file(ROOT . '/assets/img/favicon-64.png', 'image/png')->cache(86400));

    /* --------------------------------------------------------------- admin */
    $r->get('/admin', [Admin::class, 'dashboard']);
    $r->get('/admin/login', [Admin::class, 'loginForm']);
    $r->post('/admin/login', [Admin::class, 'login']);
    $r->post('/admin/logout', [Admin::class, 'logout']);
    $r->get('/admin/password', [Admin::class, 'passwordForm']);
    $r->post('/admin/password', [Admin::class, 'password']);

    $r->get('/admin/products', [Admin::class, 'products']);
    $r->get('/admin/products/new', [Admin::class, 'productNew']);
    $r->get('/admin/products/{id}/edit', [Admin::class, 'productEdit']);
    $r->post('/admin/products/save', [Admin::class, 'productSave']);
    $r->post('/admin/products/{id}/toggle', [Admin::class, 'productToggle']);
    $r->post('/admin/products/{id}/stock', [Admin::class, 'productStock']);
    $r->post('/admin/products/{id}/delete', [Admin::class, 'productDelete']);
    $r->post('/admin/upload', [Admin::class, 'upload']);
    $r->post('/admin/api/translate', [Admin::class, 'translate']);

    $r->get('/admin/trash', [Admin::class, 'trash']);
    $r->post('/admin/trash/empty', [Admin::class, 'trashEmpty']);
    $r->post('/admin/trash/{id}/restore', [Admin::class, 'trashRestore']);
    $r->post('/admin/trash/{id}/purge', [Admin::class, 'trashPurge']);

    $r->get('/admin/categories', [Admin::class, 'categories']);
    $r->post('/admin/categories/save', [Admin::class, 'categorySave']);
    $r->post('/admin/categories/{id}/toggle', [Admin::class, 'categoryToggle']);
    $r->post('/admin/categories/{id}/delete', [Admin::class, 'categoryDelete']);

    $r->get('/admin/brands', [Admin::class, 'brands']);
    $r->post('/admin/brands/save', [Admin::class, 'brandSave']);
    $r->post('/admin/brands/{id}/toggle', [Admin::class, 'brandToggle']);
    $r->post('/admin/brands/{id}/delete', [Admin::class, 'brandDelete']);

    $r->get('/admin/orders', [Admin::class, 'orders']);
    $r->get('/admin/orders/{id}', [Admin::class, 'orderView']);
    $r->post('/admin/orders/{id}/status', [Admin::class, 'orderStatus']);
    $r->post('/admin/orders/{id}/delete', [Admin::class, 'orderDelete']);

    $r->get('/admin/clients', [Admin::class, 'clients']);
    $r->post('/admin/clients/{id}/reset', [Admin::class, 'clientReset']);
    $r->post('/admin/clients/{id}/delete', [Admin::class, 'clientDelete']);

    $r->get('/admin/subscribers', [Admin::class, 'subscribers']);
    $r->get('/admin/subscribers.csv', [Admin::class, 'subscribersCsv']);
    $r->post('/admin/subscribers/delete', [Admin::class, 'subscriberDelete']);

    $r->get('/admin/messages', [Admin::class, 'messages']);
    $r->post('/admin/messages/{id}/read', [Admin::class, 'messageRead']);
    $r->post('/admin/messages/{id}/delete', [Admin::class, 'messageDelete']);

    $r->get('/admin/settings', [Admin::class, 'settings']);
    $r->post('/admin/settings/save', [Admin::class, 'settingsSave']);
    $r->post('/admin/backups/create', [Admin::class, 'backupCreate']);
    $r->get('/admin/backups/{name}/download', [Admin::class, 'backupDownload']);
    $r->post('/admin/backups/{name}/restore', [Admin::class, 'backupRestore']);
    $r->post('/admin/backups/{name}/delete', [Admin::class, 'backupDelete']);
};
