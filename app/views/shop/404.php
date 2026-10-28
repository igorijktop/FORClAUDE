<div class="container err-page">
  <div class="err-code">404</div>
  <h1 style="font-size:clamp(32px,4.4vw,48px);margin:8px 0 12px"><?= e(t('nf.title')) ?></h1>
  <p class="muted" style="margin-bottom:28px"><?= e(t('nf.text')) ?></p>
  <a href="<?= e(url('/catalog')) ?>" class="btn btn-lg"><?= e(t('nf.button')) ?> <?= icon('arrow') ?></a>
</div>
