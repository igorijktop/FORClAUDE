<?php /** @var bool $forced */ ?>
<div class="a-narrow">
  <?php if ($forced): ?>
    <div class="a-alert warn"><?= icon('shield') ?><div><b><?= e(t('admin.mustChangeTitle')) ?></b><br><?= e(t('admin.mustChange')) ?></div></div>
  <?php endif ?>
  <form method="post" action="<?= e(purl('/admin/password')) ?>" class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.changePass')) ?></h2></div>
    <div class="a-card-body form-grid">
      <?= csrf_field() ?>
      <div class="field"><label for="pw-cur"><?= e(t('admin.currentPass')) ?></label><input id="pw-cur" type="password" name="current" required autocomplete="current-password"></div>
      <div class="field"><label for="pw-new"><?= e(t('admin.newPass')) ?></label><input id="pw-new" type="password" name="next" required minlength="8" autocomplete="new-password"><span class="hint"><?= e(t('admin.passRules')) ?></span></div>
      <div class="field"><label for="pw-new2"><?= e(t('admin.newPass2')) ?></label><input id="pw-new2" type="password" name="next2" required minlength="8" autocomplete="new-password"></div>
      <button class="btn" type="submit"><?= icon('lock') ?> <?= e(t('admin.changePassBtn')) ?></button>
    </div>
  </form>
</div>
