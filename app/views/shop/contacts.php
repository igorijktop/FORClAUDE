<?php
/** @var array $settings */
$free = money($settings['freeShippingFrom'] ?: 5000);
?>
<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs"><a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?><span><?= e(t('nav.contacts')) ?></span></nav>
    <h1><?= e(t('contacts.title')) ?></h1>
    <p><?= e(t('contacts.subtitle')) ?></p>
  </div>
</section>
<section class="section container">
  <div class="contact-cards">
    <?php if (!empty($settings['phone'])): ?><div class="feature"><span class="ic-round"><?= icon('phone') ?></span><h3><?= e(t('contacts.phone')) ?></h3><p><a href="<?= e(tel_href($settings['phone'])) ?>"><?= e($settings['phone']) ?></a></p></div><?php endif ?>
    <?php if (!empty($settings['email'])): ?><div class="feature"><span class="ic-round"><?= icon('mail') ?></span><h3><?= e(t('contacts.email')) ?></h3><p><a href="mailto:<?= e($settings['email']) ?>"><?= e($settings['email']) ?></a></p></div><?php endif ?>
    <?php if (!empty($settings['address'])): ?><div class="feature"><span class="ic-round"><?= icon('pin') ?></span><h3><?= e(t('contacts.address')) ?></h3><p><?= e($settings['address']) ?></p></div><?php endif ?>
  </div>
</section>
<section class="section-sm container">
  <div class="split" style="align-items:start">
    <div class="split-body prose reveal" id="delivery">
      <span class="eyebrow"><?= e(t('contacts.deliveryEyebrow')) ?></span>
      <h2><?= e(t('contacts.deliveryTitle')) ?></h2>
      <h3><?= e(t('contacts.deliveryH')) ?></h3>
      <ul><li><?= e(t('contacts.delivery1')) ?></li><li><?= e(t('contacts.delivery2')) ?></li><li><?= e(t('contacts.delivery3')) ?></li><li><?= e(t('contacts.delivery4', ['amount' => $free])) ?></li></ul>
      <h3><?= e(t('contacts.paymentH')) ?></h3>
      <ul><li><?= e(t('contacts.payment1')) ?></li><li><?= e(t('contacts.payment2')) ?></li></ul>
      <h3 id="returns"><?= e(t('contacts.returnH')) ?></h3>
      <p><?= e(t('contacts.returnText')) ?></p>
    </div>
    <div class="card reveal" style="--d:.12s">
      <h2><?= e(t('contacts.writeUs')) ?></h2>
      <form data-contact class="form-grid" novalidate>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field"><label for="ct-name"><?= e(t('contacts.name')) ?></label><input id="ct-name" name="name" required placeholder="<?= e(t('contacts.namePlaceholder')) ?>" autocomplete="name"></div>
        <div class="field"><label for="ct-contact"><?= e(t('contacts.contact')) ?></label><input id="ct-contact" name="contact" required placeholder="<?= e(t('contacts.contactPlaceholder')) ?>"></div>
        <div class="field"><label for="ct-msg"><?= e(t('contacts.message')) ?></label><textarea id="ct-msg" name="message" required rows="5" maxlength="3000" placeholder="<?= e(t('contacts.messagePlaceholder')) ?>"></textarea></div>
        <button class="btn btn-lg btn-block" type="submit"><?= e(t('contacts.send')) ?> <?= icon('send') ?></button>
      </form>
    </div>
  </div>
</section>
