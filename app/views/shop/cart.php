<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs"><a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?><span><?= e(t('cartPage.title')) ?></span></nav>
    <h1><?= e(t('cartPage.title')) ?></h1>
    <p><?= e(t('cartPage.subtitle')) ?></p>
  </div>
</section>
<div class="container" style="padding:32px 0 90px">
  <div id="cartPageContent" aria-live="polite">
    <div class="skeleton" style="height:220px"></div>
  </div>
</div>
