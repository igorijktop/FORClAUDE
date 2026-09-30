<?php
/** @var string $body @var array $meta @var array $settings @var array $categories @var ?array $user */
use Onika\I18n;
use Onika\Media;
use Onika\Repo\Settings;

$lang = I18n::lang();
$site = (string) $settings['siteName'];
$tagline = Settings::tr('tagline', $lang);
$title = !empty($meta['title']) ? $meta['title'] . ' — ' . $site : $site . ($tagline !== '' ? ' — ' . $tagline : '');
$description = (string) ($meta['description'] ?? Settings::tr('heroSubtitle', $lang));
$cleanPath = (string) ($meta['path'] ?? I18n::cleanPath());
$canonical = I18n::abs(I18n::url($cleanPath));
$alts = I18n::alternates($cleanPath);
$ogImage = $meta['image'] ?? null;
$ogUrl = ($ogImage === null || $ogImage === 'logo.png') ? I18n::abs(purl('/assets/img/og-default.png')) : (Media::isExternal((string) $ogImage) ? (string) $ogImage : I18n::abs(Media::url((string) $ogImage, 1000)));
$page = (string) ($meta['page'] ?? '');
$bodyClass = trim('page-' . ($page ?: 'x') . ' ' . ($meta['bodyClass'] ?? ''));
$freeFrom = (int) ($settings['freeShippingFrom'] ?? 0);
?>
<!doctype html>
<html lang="<?= e($lang) ?>" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($description) ?>">
<?php if (!empty($meta['noindex'])): ?><meta name="robots" content="noindex, follow"><?php endif ?>
<meta name="theme-color" content="#1454ff">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<link rel="canonical" href="<?= e($canonical) ?>">
<?php foreach (I18n::SUPPORTED as $l): ?>
<link rel="alternate" hreflang="<?= $l ?>" href="<?= e(I18n::abs($alts[$l])) ?>">
<?php endforeach ?>
<link rel="alternate" hreflang="x-default" href="<?= e(I18n::abs($alts['uk'])) ?>">
<meta property="og:type" content="<?= e($meta['type'] ?? 'website') ?>">
<meta property="og:site_name" content="<?= e($site) ?>">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($description) ?>">
<meta property="og:url" content="<?= e($canonical) ?>">
<meta property="og:image" content="<?= e($ogUrl) ?>">
<meta property="og:locale" content="<?= e(I18n::LOCALES[$lang]) ?>">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="<?= e(purl('/assets/img/favicon-64.png')) ?>">
<link rel="apple-touch-icon" href="<?= e(purl('/assets/img/apple-touch-icon.png')) ?>">
<link rel="preload" href="<?= e(purl('/assets/fonts/onest-cyrillic.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?= e(purl('/assets/fonts/onest-latin.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= e(asset('fonts/fonts.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/base.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/shop.css')) ?>">
<script nonce="<?= nonce() ?>">
(function(){var d=document.documentElement;d.classList.remove('no-js');try{var s=localStorage.getItem('onika_theme');
var dark=s?s==='dark':window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;d.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();
</script>
<?php foreach ($meta['jsonLd'] ?? [] as $ld): ?>
<script type="application/ld+json"><?= json_script($ld) ?></script>
<?php endforeach ?>
</head>
<body class="<?= e($bodyClass) ?>">
<noscript><div style="padding:12px 16px;background:#fdf1dc;color:#7a4b00;text-align:center;font:500 14px system-ui"><?= e(t('js.required')) ?></div></noscript>
<a class="skip-link" href="#main"><?= e(t('common.skip')) ?></a>
<?= icon_sprite() ?>
<?= view('partials/header', ['settings' => $settings, 'categories' => $categories, 'user' => $user, 'active' => $meta['active'] ?? '', 'alts' => $alts]) ?>
<main id="main"><?= $body ?></main>
<?= view('partials/footer', ['settings' => $settings, 'categories' => $categories]) ?>
<?= view('partials/drawers', ['settings' => $settings]) ?>
<div class="toast-wrap" id="toasts" role="status" aria-live="polite"></div>
<script nonce="<?= nonce() ?>">
window.ONIKA = <?= json_script([
    'lang' => $lang,
    'base' => \Onika\Request::base(),
    'prefix' => I18n::prefix(),
    'currency' => (string) ($settings['currency'] ?? '₴'),
    'free' => $freeFrom,
    'csrf' => csrf_token(),
    'page' => $page,
    'user' => $user ? ['name' => $user['name'], 'email' => $user['email'], 'phone' => $user['phone']] : null,
    'urls' => [
        'api' => purl('/api'),
        'cart' => url('/cart'),
        'checkout' => url('/checkout'),
        'catalog' => url('/catalog'),
        'placeholder' => Media::placeholder(),
    ],
    't' => I18n::client(),
]) ?>;
</script>
<script src="<?= e(asset('js/app.js')) ?>" defer></script>
</body>
</html>
