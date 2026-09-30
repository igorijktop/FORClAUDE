<?php /** @var list $flash @var string $email */ ?>
<div class="container auth-wrap">
  <form class="card auth-card" method="post" action="<?= e(url('/account/login')) ?>">
    <span class="eyebrow"><?= e(t('account.title')) ?></span>
    <h1><?= e(t('account.loginTitle')) ?></h1>
    <p class="muted"><?= e(t('account.loginSub')) ?></p>
    <?= view('partials/flash', ['flash' => $flash]) ?>
    <?= csrf_field() ?>
    <div class="form-grid">
      <div class="field"><label for="l-email"><?= e(t('account.email')) ?></label><input id="l-email" type="email" name="email" required autocomplete="email" value="<?= e($email) ?>" placeholder="you@email.com" autofocus></div>
      <div class="field"><label for="l-pass"><?= e(t('account.password')) ?></label><input id="l-pass" type="password" name="password" required autocomplete="current-password"></div>
    </div>
    <button class="btn btn-lg btn-block" type="submit" style="margin-top:22px"><?= e(t('account.login')) ?> <?= icon('arrow') ?></button>
    <p class="auth-alt"><?= e(t('account.noAccount')) ?> <a href="<?= e(url('/account/register')) ?>"><?= e(t('account.createOne')) ?></a></p>
  </form>
</div>
