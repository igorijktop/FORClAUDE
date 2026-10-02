<?php
declare(strict_types=1);

namespace Onika;

use Onika\Repo\Categories;
use Onika\Repo\Messages;
use Onika\Repo\Orders;
use Onika\Repo\Settings;

/** Template rendering (plain PHP templates in app/views). */
final class View
{
    /** Render a template without any layout. */
    public static function partial(string $name, array $data = []): string
    {
        $file = APP_DIR . '/views/' . $name . '.php';
        if (!is_file($file)) {
            throw new \RuntimeException("View not found: $name");
        }
        return (static function (string $__file, array $__data): string {
            extract($__data, EXTR_SKIP);
            ob_start();
            try {
                include $__file;
            } catch (\Throwable $e) {
                ob_end_clean();
                throw $e;
            }
            return (string) ob_get_clean();
        })($file, $data);
    }

    /**
     * Storefront page inside the main layout.
     * @param array{title?:string,description?:string,path?:string,image?:?string,type?:string,jsonLd?:list<array>,active?:string,bodyClass?:string,noindex?:bool,page?:string} $meta
     */
    public static function shop(string $tpl, array $data = [], array $meta = []): Response
    {
        $settings = Settings::all();
        $body = self::partial($tpl, $data + ['settings' => $settings]);
        $html = self::partial('layout', [
            'body' => $body,
            'meta' => $meta,
            'settings' => $settings,
            'categories' => Categories::visible(),
            'user' => Auth::user(),
        ]);
        return Response::html($html)->noCache();
    }

    /** Admin page inside the admin layout. */
    public static function admin(string $tpl, array $data = [], array $meta = []): Response
    {
        $admin = Auth::admin();
        $body = self::partial('admin/' . $tpl, $data + ['admin' => $admin]);
        $html = self::partial('admin/layout', [
            'body' => $body,
            'meta' => $meta,
            'admin' => $admin,
            'unread' => Messages::unread(),
            'newOrders' => Orders::countsByStatus()['new'] ?? 0,
            'flash' => Session::pullFlash(),
        ]);
        return Response::html($html)->noCache();
    }

    public static function notFoundPage(): Response
    {
        if (str_starts_with(Request::path(), '/admin')) {
            return Response::html(self::simpleMessage('404', t('nf.title')), 404);
        }
        try {
            return self::shop('shop/404', [], ['title' => '404', 'noindex' => true, 'page' => '404'])->withStatus(404);
        } catch (\Throwable) {
            return Response::html(self::simpleMessage('404', 'Not found'), 404);
        }
    }

    /** Minimal standalone page (errors before the layout is usable). */
    public static function simpleMessage(string $code, string $message): string
    {
        return '<!doctype html><html lang="' . e(I18n::lang()) . '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>' . e($code) . ' — ONIKA</title><body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:14vh auto;padding:0 20px;color:#3d0f27;text-align:center">'
            . '<div style="font-size:72px;font-weight:800;background:linear-gradient(135deg,#ff6ba5,#e11d74);-webkit-background-clip:text;background-clip:text;color:transparent">' . e($code) . '</div>'
            . '<p style="color:#8b5a73">' . e($message) . '</p><p><a style="color:#e11d74" href="' . e(purl('/')) . '">ONIKA</a></p></body></html>';
    }
}
