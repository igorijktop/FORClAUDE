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
<div class="auth-page">
  <form class="auth-card" method="post" action="<?= e(purl('/admin/login')) ?>">
    <a href="<?= e(purl('/')) ?>" class="auth-logo"><?= logo_tag('ONIKA', 46) ?></a>
    <h1><?= e(t('admin.loginTitle')) ?></h1>
    <p class="muted"><?= e(t('admin.loginSub')) ?></p>
    <?= view('partials/flash', ['flash' => $flash]) ?>
    <?= csrf_field() ?>
    <div class="form-grid">
      <div class="field"><label for="a-user"><?= e(t('admin.login')) ?></label><input id="a-user" name="user" required autocomplete="username" autofocus></div>
      <div class="field"><label for="a-pass"><?= e(t('admin.password')) ?></label><input id="a-pass" type="password" name="password" required autocomplete="current-password"></div>
      <button class="btn btn-lg btn-block" type="submit"><?= e(t('admin.enter')) ?> <?= icon('arrow') ?></button>
    </div>
    <div class="a-auth-langs">
      <?php foreach (I18n::SUPPORTED as $l): ?><a href="<?= e(purl('/admin/login') . '?lang=' . $l) ?>" class="<?= $l === $lang ? 'on' : '' ?>"><?= e(I18n::SHORT[$l]) ?></a><?php endforeach ?>
    </div>
  </form>
</div>
</body>
</html>
