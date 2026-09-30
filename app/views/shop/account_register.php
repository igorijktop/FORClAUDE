<?php /** @var list $flash @var array $old */ ?>
<div class="container auth-wrap">
  <form class="card auth-card" method="post" action="<?= e(url('/account/register')) ?>">
    <span class="eyebrow"><?= e(t('account.title')) ?></span>
    <h1><?= e(t('account.registerTitle')) ?></h1>
    <p class="muted"><?= e(t('account.registerSub')) ?></p>
    <?= view('partials/flash', ['flash' => $flash]) ?>
    <?= csrf_field() ?>
    <div class="form-grid">
      <div class="field"><label for="r-name"><?= e(t('account.name')) ?></label><input id="r-name" name="name" autocomplete="name" value="<?= e($old['name'] ?? '') ?>"></div>
      <div class="field"><label for="r-email"><?= e(t('account.email')) ?> <span class="req">*</span></label><input id="r-email" type="email" name="email" required autocomplete="email" value="<?= e($old['email'] ?? '') ?>" placeholder="you@email.com"></div>
      <div class="field"><label for="r-phone"><?= e(t('account.phone')) ?></label><input id="r-phone" type="tel" name="phone" autocomplete="tel" value="<?= e($old['phone'] ?? '') ?>" placeholder="+380 __ ___ __ __"></div>
      <div class="form-grid two">
        <div class="field"><label for="r-pass"><?= e(t('account.password')) ?> <span class="req">*</span></label><input id="r-pass" type="password" name="password" required autocomplete="new-password" minlength="8"></div>
        <div class="field"><label for="r-pass2"><?= e(t('account.password2')) ?> <span class="req">*</span></label><input id="r-pass2" type="password" name="password2" required autocomplete="new-password" minlength="8"></div>
      </div>
      <p class="hint" style="margin:0"><?= e(t('account.passHint')) ?></p>
    </div>
    <button class="btn btn-lg btn-block" type="submit" style="margin-top:22px"><?= e(t('account.register')) ?> <?= icon('arrow') ?></button>
    <p class="auth-alt"><?= e(t('account.haveAccount')) ?> <a href="<?= e(url('/account/login')) ?>"><?= e(t('account.signIn')) ?></a></p>
  </form>
</div>
