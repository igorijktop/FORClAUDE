<?php
/** @var string $body @var array $meta @var ?array $admin @var int $unread @var int $newOrders @var list $flash */
use Onika\I18n;

$lang = I18n::lang();
$active = (string) ($meta['active'] ?? '');
$nav = [
    ['dashboard', '/admin', 'dashboard', t('admin.dashboard'), 0],
    ['products', '/admin/products', 'box', t('admin.products'), 0],
    ['categories', '/admin/categories', 'layers', t('admin.categories'), 0],
    ['brands', '/admin/brands', 'star', t('admin.brands'), 0],
    ['orders', '/admin/orders', 'truck', t('admin.orders'), $newOrders],
    ['clients', '/admin/clients', 'users', t('admin.clients'), 0],
    ['messages', '/admin/messages', 'message', t('admin.messages'), $unread],
    ['subscribers', '/admin/subscribers', 'mail', t('admin.subscribers'), 0],
    ['trash', '/admin/trash', 'trash', t('admin.trash'), 0],
    ['settings', '/admin/settings', 'settings', t('admin.settings'), 0],
];
$here = purl(I18n::cleanPath());
?>
<!doctype html>
<html lang="<?= e($lang) ?>" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<title><?= e(($meta['title'] ?? 'Admin') . ' — ONIKA Admin') ?></title>
<link rel="icon" type="image/png" href="<?= e(purl('/assets/img/favicon-64.png')) ?>">
<link rel="preload" href="<?= e(purl('/assets/fonts/onest-cyrillic.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= e(asset('fonts/fonts.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/base.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/admin.css')) ?>">
<script nonce="<?= nonce() ?>">
(function(){var d=document.documentElement;d.classList.remove('no-js');try{var s=localStorage.getItem('onika_theme');
var dark=s?s==='dark':window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;d.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();
</script>
</head>
<body class="admin">
<?= icon_sprite() ?>
<div class="a-shell">
  <aside class="a-sidebar" id="aSidebar" aria-label="Admin navigation">
    <a href="<?= e(purl('/admin')) ?>" class="a-brand"><?= logo_tag('ONIKA', 38) ?><span>admin</span></a>
    <nav class="a-nav">
      <?php foreach ($nav as [$key, $href, $ic, $label, $badge]): ?>
        <a href="<?= e(purl($href)) ?>" class="<?= $active === $key ? 'on' : '' ?>"<?= $active === $key ? ' aria-current="page"' : '' ?>>
          <?= icon($ic) ?><span><?= e($label) ?></span><?php if ($badge > 0): ?><em class="a-count"><?= (int) $badge ?></em><?php endif ?>
        </a>
      <?php endforeach ?>
    </nav>
    <div class="a-side-foot">
      <div class="a-langs" role="group" aria-label="<?= e(t('common.language')) ?>">
        <?php foreach (I18n::SUPPORTED as $l): ?>
          <a href="<?= e($here . '?' . query_string(array_merge($_GET, ['lang' => $l]))) ?>" class="<?= $l === $lang ? 'on' : '' ?>"><?= e(I18n::SHORT[$l]) ?></a>
        <?php endforeach ?>
      </div>
      <a href="<?= e(purl('/')) ?>" target="_blank" rel="noopener" class="a-side-link"><?= icon('external') ?> <?= e(t('common.openSite')) ?></a>
      <form method="post" action="<?= e(purl('/admin/logout')) ?>"><?= csrf_field() ?><button type="submit" class="a-side-link"><?= icon('logout') ?> <?= e(t('common.logout')) ?></button></form>
    </div>
  </aside>

  <div class="a-main">
    <header class="a-topbar">
      <button class="icon-btn a-burger" id="aBurger" aria-label="Menu" aria-controls="aSidebar"><?= icon('menu') ?></button>
      <h1><?= e($meta['title'] ?? '') ?></h1>
      <div class="a-top-actions">
        <?php if (!empty($meta['actions'])) { echo $meta['actions']; } ?>
        <button class="icon-btn theme-toggle" id="themeToggle" aria-label="<?= e(t('theme.toggle')) ?>"><?= icon('moon', 'ic-moon') ?><?= icon('sun', 'ic-sun') ?></button>
        <?php if ($admin): ?><span class="a-user" title="<?= e($admin['username']) ?>"><span class="a-avatar"><?= e(initial($admin['username'])) ?></span><span class="a-user-name"><?= e($admin['username']) ?></span></span><?php endif ?>
      </div>
    </header>
    <main class="a-content" id="main"><?= $body ?></main>
  </div>
</div>
<div class="a-overlay" id="aOverlay"></div>
<div class="toast-wrap" id="toasts" role="status" aria-live="polite"></div>
<script nonce="<?= nonce() ?>">
window.ADMIN = <?= json_script([
    'csrf' => csrf_token(),
    'base' => \Onika\Request::base(),
    'flash' => $flash,
    'api' => purl('/admin'),
    'lang' => $lang,
    't' => [
        'confirm' => t('admin.confirmTitle'), 'cancel' => t('admin.cancel'), 'ok' => t('admin.confirmOk'),
        'translateEmpty' => t('admin.translateEmpty'), 'translateError' => t('admin.translateError'),
        'translateDone' => t('admin.translateDone'), 'translateWait' => t('admin.translateWait'),
        'uploadFailed' => t('admin.uploadFailed'), 'uploading' => t('admin.uploading'), 'main' => t('admin.mainImage'),
        'copied' => t('product.linkCopied'), 'newCategory' => t('admin.newCategory'), 'editCategory' => t('admin.editCategory'),
        'newBrand' => t('admin.newBrand'), 'editBrand' => t('admin.editBrand'), 'remove' => t('common.remove'),
    ],
]) ?>;
</script>
<script src="<?= e(asset('js/admin.js')) ?>" defer></script>
</body>
</html>
