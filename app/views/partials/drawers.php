<?php /** @var array $settings */ ?>
<aside class="drawer" id="favDrawer" aria-label="<?= e(t('common.favorites')) ?>" aria-hidden="true">
  <div class="drawer-head">
    <h3><?= icon('heart') ?> <?= e(t('common.favorites')) ?></h3>
    <button class="icon-btn" id="closeFav" aria-label="<?= e(t('common.close')) ?>"><?= icon('x') ?></button>
  </div>
  <div class="drawer-body" id="favItems"></div>
</aside>

<aside class="drawer" id="cartDrawer" aria-label="<?= e(t('common.cart')) ?>" aria-hidden="true">
  <div class="drawer-head">
    <h3><?= icon('bag') ?> <?= e(t('cart.title')) ?> <span class="count" id="cartDrawerCount"></span></h3>
    <button class="icon-btn" id="closeCart" aria-label="<?= e(t('common.close')) ?>"><?= icon('x') ?></button>
  </div>
  <div class="drawer-body" id="cartItems"></div>
  <div class="drawer-foot" id="cartFoot" hidden>
    <div class="free-ship" id="freeShip"></div>
    <div class="sum-row"><span><?= e(t('cart.subtotal')) ?></span><b id="cartSubtotal">0</b></div>
    <div class="sum-row small muted"><span><?= e(t('cart.shippingNote')) ?></span></div>
    <a href="<?= e(url('/checkout')) ?>" class="btn btn-block btn-lg" style="margin-top:14px"><?= e(t('cart.checkout')) ?> <?= icon('arrow') ?></a>
    <a href="<?= e(url('/cart')) ?>" class="btn btn-ghost btn-block" style="margin-top:10px"><?= e(t('cart.viewCart')) ?></a>
  </div>
</aside>
