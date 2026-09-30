<?php
/** @var array $settings @var array $order */
use Onika\Labels;

$steps = ['new', 'confirmed', 'shipped', 'done'];
$idx = array_search($order['status'], $steps, true);
$cancelled = $order['status'] === 'cancelled';
$c = $order['customer'];
?>
<div class="container" style="padding:56px 0 100px;max-width:820px">
  <div class="center">
    <div class="order-ok"><?= icon('check') ?></div>
    <span class="eyebrow"><?= e(t('order.eyebrow')) ?></span>
    <h1 style="font-size:clamp(28px,4vw,44px);margin:14px 0"><?= e(t('order.accepted', ['id' => $order['id']])) ?></h1>
    <p class="muted" style="max-width:520px;margin:0 auto"><?= e(t('order.manager')) ?></p>
  </div>

  <div class="timeline" aria-label="<?= e(t('account.orderStatus')) ?>">
    <?php foreach ($steps as $i => $s): ?>
      <div class="tl-step<?= (!$cancelled && $idx !== false && $i <= $idx) ? ' done' : '' ?>"><i><?= icon($s === 'new' ? 'inbox' : ($s === 'confirmed' ? 'checkCircle' : ($s === 'shipped' ? 'truck' : 'package'))) ?></i><?= e(Labels::status($s)) ?></div>
    <?php endforeach ?>
  </div>
  <?php if ($cancelled): ?><p class="center" style="margin-top:14px"><span class="pill gray"><?= e(Labels::status('cancelled')) ?></span></p><?php endif ?>

  <div class="card" style="margin-top:30px">
    <h3><?= e(t('order.details')) ?></h3>
    <?php foreach ($order['items'] as $it): ?>
      <div class="os-item">
        <img src="<?= e(media($it['image'] ?? null, 200)) ?>" alt="" loading="lazy" width="60" height="76">
        <div><div class="n"><?php if (!empty($it['slug'])): ?><a href="<?= e(url('/product/' . $it['slug'])) ?>"><?= e($it['name']) ?></a><?php else: ?><?= e($it['name']) ?><?php endif ?></div>
          <div class="small muted"><?= (int) $it['qty'] ?> × <?= e(money($it['price'])) ?><?= !empty($it['size']) ? ' · ' . e($it['size']) : '' ?></div></div>
        <div class="p"><?= e(money($it['price'] * $it['qty'])) ?></div>
      </div>
    <?php endforeach ?>
    <div class="sum-row" style="margin-top:14px"><span><?= e(t('cartPage.delivery')) ?></span>
      <b><?= $order['shipping'] === null ? e(t('cartPage.byCarrier')) : ($order['shipping'] > 0 ? e(money($order['shipping'])) : e(t('common.free'))) ?></b></div>
    <div class="sum-row total"><span><?= e(t('cartPage.total')) ?></span><span><?= e(money($order['total'])) ?></span></div>
  </div>

  <div class="card" style="margin-top:18px">
    <h3><?= e(t('order.delivery')) ?></h3>
    <div class="form-grid two" style="gap:14px">
      <div><span class="small muted"><?= e(t('checkout.recipient')) ?></span><div><b><?= e($c['name'] ?? '') ?></b><br><?= e($c['phone'] ?? '') ?></div></div>
      <div><span class="small muted"><?= e(t('checkout.shippingMethod')) ?></span><div><b><?= e(Labels::shipping((string) ($c['shipping'] ?? ''))) ?></b><br><?= e(trim(($c['city'] ?? '') . ' ' . ($c['warehouse'] ?? ''))) ?></div></div>
      <div><span class="small muted"><?= e(t('checkout.payment')) ?></span><div><b><?= e(Labels::payment($order['payment'])) ?></b></div></div>
      <?php if (!empty($c['comment'])): ?><div><span class="small muted"><?= e(t('checkout.comment')) ?></span><div><?= e($c['comment']) ?></div></div><?php endif ?>
    </div>
  </div>

  <div style="display:flex;gap:12px;justify-content:center;margin-top:30px;flex-wrap:wrap">
    <a href="<?= e(url('/catalog')) ?>" class="btn"><?= e(t('order.continue')) ?> <?= icon('arrow') ?></a>
    <a href="<?= e(url('/')) ?>" class="btn btn-ghost"><?= e(t('order.toHome')) ?></a>
  </div>
</div>
<script nonce="<?= nonce() ?>">try{localStorage.removeItem('onika_cart_v2')}catch(e){}</script>
