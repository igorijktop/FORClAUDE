<?php
/** @var ?array $user */
use Onika\Labels;

$u = $user ?? [];
?>
<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs"><a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?><a href="<?= e(url('/cart')) ?>"><?= e(t('cartPage.title')) ?></a><?= icon('chevronRight') ?><span><?= e(t('checkout.title')) ?></span></nav>
    <h1><?= e(t('checkout.title')) ?></h1>
    <p><?= e(t('checkout.subtitle')) ?></p>
  </div>
</section>
<div class="container">
  <div class="checkout-grid">
    <form id="checkoutForm" class="card" novalidate>
      <h2><?= e(t('checkout.recipient')) ?></h2>
      <div class="form-grid two">
        <div class="field"><label for="co-name"><?= e(t('checkout.name')) ?> <span class="req">*</span></label>
          <input id="co-name" name="name" required autocomplete="name" value="<?= e($u['name'] ?? '') ?>"><span class="err" data-err="name"><?= e(t('checkout.errName')) ?></span></div>
        <div class="field"><label for="co-phone"><?= e(t('checkout.phone')) ?> <span class="req">*</span></label>
          <input id="co-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="+380 __ ___ __ __" value="<?= e($u['phone'] ?? '') ?>"><span class="err" data-err="phone"><?= e(t('checkout.errPhone')) ?></span></div>
      </div>
      <div class="field" style="margin-top:18px"><label for="co-email"><?= e(t('checkout.email')) ?></label>
        <input id="co-email" name="email" type="email" autocomplete="email" placeholder="you@email.com" value="<?= e($u['email'] ?? '') ?>"><span class="err" data-err="email"><?= e(t('checkout.errEmail')) ?></span></div>

      <h2 style="margin-top:32px"><?= e(t('checkout.shippingMethod')) ?></h2>
      <div class="opt-grid" id="shipOpts">
        <?php foreach (Labels::shippingOptions() as $code => $label): ?>
          <label class="opt"><input type="radio" name="shippingMethod" value="<?= e($code) ?>" <?= $code === 'np_branch' ? 'checked' : '' ?>><span class="radio"></span>
            <span><b><?= e($label) ?></b></span><?= icon($code === 'pickup' ? 'pin' : 'truck') ?></label>
        <?php endforeach ?>
      </div>
      <div id="addressBox">
        <div class="form-grid two" style="margin-top:18px">
          <div class="field"><label for="co-city"><?= e(t('checkout.city')) ?> <span class="req">*</span></label>
            <input id="co-city" name="city" autocomplete="address-level2"><span class="err" data-err="city"><?= e(t('checkout.errCity')) ?></span></div>
          <div class="field"><label for="co-wh" id="whLabel"><?= e(t('checkout.warehouse')) ?> <span class="req">*</span></label>
            <input id="co-wh" name="warehouse" placeholder="<?= e(t('checkout.warehousePlaceholder')) ?>"><span class="err" data-err="warehouse"><?= e(t('checkout.errWarehouse')) ?></span></div>
        </div>
      </div>

      <h2 style="margin-top:32px"><?= e(t('checkout.payment')) ?></h2>
      <div class="opt-grid">
        <?php foreach (Labels::paymentOptions() as $code => $o): ?>
          <label class="opt"><input type="radio" name="payment" value="<?= e($code) ?>" <?= $code === 'cod' ? 'checked' : '' ?>><span class="radio"></span>
            <span><b><?= e($o['label']) ?></b><small><?= e($o['desc']) ?></small></span><?= icon('card') ?></label>
        <?php endforeach ?>
      </div>

      <div class="field" style="margin-top:22px"><label for="co-comment"><?= e(t('checkout.comment')) ?></label>
        <textarea id="co-comment" name="comment" rows="3" maxlength="1000" placeholder="<?= e(t('checkout.commentPlaceholder')) ?>"></textarea></div>

      <button class="btn btn-lg btn-block" type="submit" id="checkoutSubmit" style="margin-top:26px"><?= e(t('checkout.confirm')) ?> <?= icon('arrow') ?></button>
      <p class="form-note"><?= icon('lock') ?><span><?= e(t('checkout.privacy')) ?></span></p>
    </form>

    <aside class="card order-summary" aria-label="<?= e(t('checkout.yourOrder')) ?>">
      <h2><?= e(t('checkout.yourOrder')) ?></h2>
      <div id="checkoutSummary"><div class="skeleton" style="height:160px"></div></div>
    </aside>
  </div>
</div>
