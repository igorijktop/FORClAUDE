<?php
/** @var array $settings @var ?string $cover @var int $productCount */
$site = (string) $settings['siteName'];
?>
<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs"><a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?><span><?= e(t('nav.about')) ?></span></nav>
    <h1><?= e(t('about.title')) ?></h1>
    <p><?= e(t('about.subtitle')) ?></p>
  </div>
</section>
<section class="section container">
  <div class="split">
    <div class="split-media reveal">
      <img src="<?= e(media($cover, 800)) ?>" alt="<?= e($site) ?>" loading="lazy" width="640" height="800">
      <div class="float-card"><span class="ic-round"><?= icon('sparkle') ?></span><div><b><?= (int) $productCount ?> <?= e(tn('common.products', $productCount)) ?></b><div class="small muted"><?= e(t('about.productsSub')) ?></div></div></div>
    </div>
    <div class="split-body prose reveal" style="--d:.12s">
      <span class="eyebrow"><?= e(t('about.historyEyebrow')) ?></span>
      <h2><?= e(t('about.historyTitle')) ?></h2>
      <p><?= e(t('about.p1')) ?></p>
      <p><?= e(t('about.p2')) ?></p>
      <ul class="check-list" style="list-style:none;padding:0">
        <li><?= icon('check') ?><span><?= e(t('about.p3', ['n' => $productCount])) ?></span></li>
        <li><?= icon('check') ?><span><?= e(t('about.p4')) ?></span></li>
        <li><?= icon('check') ?><span><?= e(t('about.p5')) ?></span></li>
      </ul>
    </div>
  </div>
</section>
<section class="section-sm container">
  <div class="features">
    <?php foreach ([['star', 'about.f1'], ['truck', 'about.f2'], ['heart', 'about.f3'], ['return', 'about.f4']] as $i => [$ic, $k]): ?>
      <div class="feature reveal" style="--d:<?= $i * .08 ?>s"><span class="ic-round"><?= icon($ic) ?></span><h3><?= e(t($k . 'Title')) ?></h3><p><?= e(t($k . 'Text')) ?></p></div>
    <?php endforeach ?>
  </div>
</section>
<section class="section container">
  <div class="newsletter reveal">
    <div class="newsletter-inner">
      <div><span class="eyebrow"><?= e(t('nl.join')) ?></span><h2><?= e(t('nl.aboutTitle')) ?></h2><p><?= e(t('nl.aboutText')) ?></p></div>
      <form class="news-form" data-news novalidate>
        <input type="email" name="email" placeholder="<?= e(t('nl.placeholder')) ?>" required autocomplete="email" aria-label="<?= e(t('nl.placeholder')) ?>">
        <button class="btn btn-light" type="submit"><?= e(t('nl.button')) ?> <?= icon('arrow') ?></button>
      </form>
    </div>
  </div>
</section>
