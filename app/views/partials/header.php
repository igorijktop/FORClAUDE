<?php
/** @var array $settings @var array $categories @var ?array $user @var string $active @var array $alts */
use Onika\I18n;
use Onika\Repo\Settings;

$lang = I18n::lang();
$site = (string) $settings['siteName'];
$announcement = Settings::tr('announcement', $lang);
$nav = [
    'home' => ['/', t('nav.home')],
    'catalog' => ['/catalog', t('nav.catalog')],
    'new' => ['/catalog?featured=1', t('nav.new')],
    'about' => ['/about', t('nav.about')],
    'contacts' => ['/contacts', t('nav.contacts')],
];
$navHtml = static function (array $nav, string $active): string {
    $o = '';
    foreach ($nav as $key => [$href, $label]) {
        $o .= '<a href="' . e(url($href)) . '" class="' . ($active === $key ? 'active' : '') . '"' . ($active === $key ? ' aria-current="page"' : '') . '>' . e($label) . '</a>';
    }
    return $o;
};
$langSwitch = static function (array $alts) use ($lang): string {
    $o = '<div class="lang-switch"><button type="button" class="lang-toggle" aria-haspopup="true" aria-expanded="false" title="' . e(t('common.language')) . '">'
        . icon('globe') . '<span class="lang-cur">' . e(I18n::SHORT[$lang]) . '</span>' . icon('chevron', 'chev') . '</button><div class="lang-menu" role="menu">';
    foreach (I18n::SUPPORTED as $l) {
        $o .= '<a class="lang-opt' . ($l === $lang ? ' on' : '') . '" role="menuitem" href="' . e($alts[$l]) . '" hreflang="' . $l . '" data-lang="' . $l . '"><span class="code">' . I18n::SHORT[$l] . '</span><span>' . e(I18n::NAMES[$l]) . '</span>' . ($l === $lang ? icon('check') : '') . '</a>';
    }
    return $o . '</div></div>';
};
$accountHtml = static function (?array $user): string {
    if ($user) {
        $first = preg_split('/[\s@]+/', trim($user['name'] !== '' ? $user['name'] : $user['email']))[0] ?? '';
        return '<div class="account-menu"><button type="button" class="account-toggle" aria-haspopup="true" aria-expanded="false"><span class="account-avatar">' . e(initial($first)) . '</span><span class="account-name">' . e($first) . '</span>' . icon('chevron', 'chev') . '</button>'
            . '<div class="account-drop"><a href="' . e(url('/account')) . '">' . icon('user') . '<span>' . e(t('account.title')) . '</span></a>'
            . '<form method="post" action="' . e(url('/account/logout')) . '">' . csrf_field() . '<button type="submit">' . icon('logout') . '<span>' . e(t('account.logout')) . '</span></button></form></div></div>';
    }
    return '<a class="icon-btn" href="' . e(url('/account/login')) . '" aria-label="' . e(t('account.login')) . '" title="' . e(t('account.login')) . '">' . icon('user') . '</a>';
};
?>
<?php if ($announcement !== ''): ?>
<div class="announce" role="region" aria-label="<?= e(t('common.announcement')) ?>">
  <div class="announce-track"><?php for ($i = 0; $i < 6; $i++): ?><span><?= e($announcement) ?></span><?php endfor ?></div>
</div>
<?php endif ?>
<header class="site-header" id="siteHeader">
  <div class="container header-inner">
    <button class="icon-btn burger" id="burger" aria-label="<?= e(t('common.menu')) ?>" aria-controls="mobileNav"><?= icon('menu') ?></button>
    <a href="<?= e(url('/')) ?>" class="brand" aria-label="<?= e($site) ?>"><?= logo_tag($site, 40) ?></a>
    <nav class="main-nav" aria-label="<?= e(t('common.mainNav')) ?>"><?= $navHtml($nav, $active) ?></nav>

    <form class="hsearch" id="hsearch" role="search" action="<?= e(url('/catalog')) ?>" method="get" autocomplete="off">
      <div class="hsearch-field">
        <?= icon('search') ?>
        <input type="search" name="q" id="hsearchInput" placeholder="<?= e(t('search.placeholder')) ?>" aria-label="<?= e(t('common.search')) ?>" aria-autocomplete="list" aria-controls="hsearchPop" enterkeyhint="search">
        <button type="button" class="hsearch-clear" id="hsearchClear" aria-label="<?= e(t('common.close')) ?>"><?= icon('x', 'sm') ?></button>
      </div>
      <div class="hsearch-pop" id="hsearchPop" role="listbox"></div>
    </form>

    <div class="header-actions">
      <button class="icon-btn search-toggle" id="searchToggle" aria-label="<?= e(t('common.search')) ?>"><?= icon('search') ?></button>
      <span class="hide-mobile"><?= $langSwitch($alts) ?></span>
      <button class="icon-btn theme-toggle" id="themeToggle" aria-label="<?= e(t('theme.toggle')) ?>" title="<?= e(t('theme.toggle')) ?>"><?= icon('moon', 'ic-moon') ?><?= icon('sun', 'ic-sun') ?></button>
      <button class="icon-btn" id="favBtn" aria-label="<?= e(t('common.favorites')) ?>"><?= icon('heart') ?><span class="cart-count" id="favCount" data-empty="1">0</span></button>
      <span class="hide-mobile"><?= $accountHtml($user) ?></span>
      <button class="icon-btn" id="cartBtn" aria-label="<?= e(t('common.cart')) ?>"><?= icon('bag') ?><span class="cart-count" id="cartCount" data-empty="1">0</span></button>
    </div>
  </div>
</header>

<div class="overlay" id="overlay"></div>
<aside class="mnav" id="mobileNav" aria-label="<?= e(t('common.menu')) ?>">
  <div class="mnav-head">
    <a href="<?= e(url('/')) ?>" class="brand"><?= logo_tag($site, 40) ?></a>
    <button class="icon-btn" id="mobileClose" aria-label="<?= e(t('common.close')) ?>"><?= icon('x') ?></button>
  </div>
  <nav><?= $navHtml($nav, $active) ?></nav>
  <div>
    <h4><?= e(t('catalog.categories')) ?></h4>
    <?php foreach (array_slice($categories, 0, 8) as $c): ?>
      <a class="m-cat" href="<?= e(url('/catalog/' . $c['slug'])) ?>"><?= e(I18n::categoryLabel($c)) ?></a>
    <?php endforeach ?>
  </div>
  <div class="mnav-foot">
    <?= $langSwitch($alts) ?>
    <?php if ($user): ?>
      <a class="btn btn-ghost btn-sm" href="<?= e(url('/account')) ?>"><?= icon('user') ?> <?= e(t('account.title')) ?></a>
    <?php else: ?>
      <a class="btn btn-sm" href="<?= e(url('/account/login')) ?>"><?= icon('user') ?> <?= e(t('account.login')) ?></a>
    <?php endif ?>
  </div>
</aside>
