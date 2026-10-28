<?php
/** @var list $flash */
use Onika\I18n;

$lang = I18n::lang();
?>
<!doctype html>
<html lang="<?= e($lang) ?>" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= e(t('admin.loginTitle')) ?> — ONIKA Admin</title>
<link rel="icon" type="image/png" href="<?= e(purl('/assets/img/favicon-64.png')) ?>">
<link rel="stylesheet" href="<?= e(asset('fonts/fonts.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/base.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/admin.css')) ?>">
<script nonce="<?= nonce() ?>">
(function(){var d=document.documentElement;d.classList.remove('no-js');try{var s=localStorage.getItem('onika_theme');
var dark=s?s==='dark':window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;d.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();
</script>
</head>
<body class="admin-auth">
<?= icon_sprite() ?>
<div class="a-sky" aria-hidden="true"><span class="a-blob b1"></span><span class="a-blob b2"></span><span class="a-blob b3"></span></div>
<main class="auth-page">
  <form class="auth-card" method="post" action="<?= e(purl('/admin/login')) ?>">
    <span class="auth-deco" aria-hidden="true"><i></i><i></i><i></i></span>
    <a href="<?= e(purl('/')) ?>" class="auth-logo"><?= logo_tag('ONIKA', 46) ?></a>
    <p class="auth-kicker"><?= icon('lock') ?> admin</p>
    <h1><?= e(t('admin.loginTitle')) ?></h1>
    <p class="muted"><?= e(t('admin.loginSub')) ?></p>
    <?= view('partials/flash', ['flash' => $flash]) ?>
    <?= csrf_field() ?>
    <div class="form-grid">
      <div class="field"><label for="a-user"><?= e(t('admin.login')) ?></label><input id="a-user" name="user" required autocomplete="username" autocapitalize="none" spellcheck="false" autofocus></div>
      <div class="field"><label for="a-pass"><?= e(t('admin.password')) ?></label>
        <div class="a-pass-wrap"><input id="a-pass" type="password" name="password" required autocomplete="current-password">
          <button type="button" class="a-pass-eye" data-toggle-pass="a-pass" aria-label="<?= e(t('admin.showPass')) ?>" aria-pressed="false" data-label-show="<?= e(t('admin.showPass')) ?>" data-label-hide="<?= e(t('admin.hidePass')) ?>"><?= icon('eye') ?></button></div></div>
      <button class="btn btn-lg btn-block" type="submit"><?= e(t('admin.enter')) ?> <?= icon('arrow') ?></button>
    </div>
    <nav class="a-auth-langs" aria-label="<?= e(t('common.language')) ?>">
      <?php foreach (I18n::SUPPORTED as $l): ?><a href="<?= e(purl('/admin/login') . '?lang=' . $l) ?>" class="<?= $l === $lang ? 'on' : '' ?>" hreflang="<?= e($l) ?>"<?= $l === $lang ? ' aria-current="true"' : '' ?>><?= e(I18n::SHORT[$l]) ?></a><?php endforeach ?>
    </nav>
  </form>
</main>
<script nonce="<?= nonce() ?>">
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-toggle-pass]'); if (!b) return;
  var i = document.getElementById(b.getAttribute('data-toggle-pass')); if (!i) return;
  var show = i.type === 'password'; i.type = show ? 'text' : 'password';
  b.setAttribute('aria-pressed', show ? 'true' : 'false');
  b.setAttribute('aria-label', b.getAttribute(show ? 'data-label-hide' : 'data-label-show'));
  b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-' + (show ? 'eyeOff' : 'eye') + '"/></svg>';
});
</script>
</body>
</html>
