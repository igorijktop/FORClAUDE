<?php
declare(strict_types=1);

namespace Onika\Controller;

use Onika\I18n;
use Onika\Repo\Categories;
use Onika\Request;
use Onika\Response;
use Onika\Db;

final class Seo
{
    public static function robots(array $p): Response
    {
        $base = Request::origin();
        $b = Request::base();
        $txt = "User-agent: *\nAllow: /\n";
        foreach (['/admin', '/api/'] as $path) {
            $txt .= "Disallow: {$b}{$path}\n";
        }
        // Private pages exist in every language: /cart, /ru/cart, /en/cart…
        foreach (I18n::SUPPORTED as $l) {
            $pre = $b . I18n::prefix($l);
            foreach (['/checkout', '/cart', '/order/', '/account'] as $path) {
                $txt .= "Disallow: {$pre}{$path}\n";
            }
        }
        $txt .= "\nSitemap: {$base}/sitemap.xml\n";
        return Response::text($txt)->cache(3600);
    }

    public static function sitemap(array $p): Response
    {
        $origin = (Request::isHttps() ? 'https' : 'http') . '://' . Request::host();
        $urls = [];
        $add = static function (string $cleanPath, string $prio, string $freq, ?string $lastmod = null) use (&$urls, $origin): void {
            $alts = I18n::alternates($cleanPath);
            $links = '';
            foreach (I18n::SUPPORTED as $l) {
                $links .= '    <xhtml:link rel="alternate" hreflang="' . $l . '" href="' . htmlspecialchars($origin . $alts[$l], ENT_XML1) . '"/>' . "\n";
            }
            $links .= '    <xhtml:link rel="alternate" hreflang="x-default" href="' . htmlspecialchars($origin . $alts['uk'], ENT_XML1) . '"/>' . "\n";
            foreach (I18n::SUPPORTED as $l) {
                $urls[] = "  <url>\n    <loc>" . htmlspecialchars($origin . $alts[$l], ENT_XML1) . "</loc>\n" . $links
                    . ($lastmod !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $lastmod) ? "    <lastmod>{$lastmod}</lastmod>\n" : '')
                    . "    <changefreq>{$freq}</changefreq>\n    <priority>{$prio}</priority>\n  </url>";
            }
        };
        $add('/', '1.0', 'weekly');
        $add('/catalog', '0.9', 'daily');
        $add('/catalog?featured=1', '0.6', 'daily');     // "New" — its own canonical page (Shop::renderCatalog)
        $add('/about', '0.5', 'monthly');
        $add('/contacts', '0.5', 'monthly');
        foreach (Categories::visible() as $c) {
            $add('/catalog/' . $c['slug'], '0.7', 'weekly');
        }
        $rows = Db::all("SELECT slug, COALESCE(updated_at, created_at) AS ts FROM products WHERE active = 1 AND COALESCE(category, '') NOT IN (SELECT name FROM categories WHERE active = 0) ORDER BY created_at DESC");
        foreach ($rows as $r) {
            $add('/product/' . rawurlencode((string) $r['slug']), '0.8', 'weekly', $r['ts'] ? substr((string) $r['ts'], 0, 10) : null);
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n"
            . implode("\n", $urls) . "\n</urlset>\n";
        return Response::text($xml, 'application/xml; charset=utf-8')->cache(3600);
    }
}
