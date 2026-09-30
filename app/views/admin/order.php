<?php
/** @var array $o @var ?array $client */
use Onika\Labels;

$c = $o['customer'];
?>
<div class="a-order-head">
  <a href="<?= e(purl('/admin/orders')) ?>" class="a-link"><?= icon('arrowLeft') ?> <?= e(t('admin.orders')) ?></a>
  <span class="pill <?= e(Labels::statusTone($o['status'])) ?>"><?= e(Labels::status($o['status'])) ?></span>
  <span class="muted small"><?= e(dt($o['createdAt'], true)) ?></span>
</div>

<div class="a-form-layout">
  <div class="a-form-main">
    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('order.details')) ?></h2></div>
      <div class="a-card-body">
        <?php foreach ($o['items'] as $it): ?>
          <div class="a-order-item">
            <img src="<?= e(media($it['image'] ?? null, 120)) ?>" alt="" loading="lazy" width="52" height="66">
            <div class="grow"><div class="a-strong"><?php if (!empty($it['slug'])): ?><a href="<?= e(url('/product/' . rawurlencode($it['slug']))) ?>" target="_blank" rel="noopener"><?= e($it['name']) ?></a><?php else: ?><?= e($it['name']) ?><?php endif ?></div>
              <div class="small muted"><?= (int) $it['qty'] ?> × <?= e(money($it['price'])) ?><?= !empty($it['size']) ? ' · ' . e(t('product.size')) . ': ' . e($it['size']) : '' ?></div></div>
            <b><?= e(money($it['price'] * $it['qty'])) ?></b>
          </div>
        <?php endforeach ?>
        <div class="a-sum"><span><?= e(t('cartPage.items', ['n' => array_sum(array_map(static fn($i) => (int) $i['qty'], $o['items']))])) ?></span><b><?= e(money($o['subtotal'])) ?></b></div>
        <div class="a-sum"><span><?= e(t('cartPage.delivery')) ?></span><b><?= $o['shipping'] === null ? e(t('cartPage.byCarrier')) : ($o['shipping'] > 0 ? e(money($o['shipping'])) : e(t('common.free'))) ?></b></div>
        <div class="a-sum total"><span><?= e(t('cartPage.total')) ?></span><b><?= e(money($o['total'])) ?></b></div>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.history')) ?></h2></div>
      <div class="a-card-body">
        <ol class="a-timeline">
          <?php foreach (array_reverse($o['history']) as $h): ?>
            <li><span class="dot tone-<?= e(Labels::statusTone((string) ($h['status'] ?? 'new'))) ?>"></span>
              <div><b><?= e(Labels::status((string) ($h['status'] ?? 'new'))) ?></b> <span class="muted small"><?= e(dt($h['at'] ?? null, true)) ?></span>
              <?php if (!empty($h['note'])): ?><div class="small"><?= e($h['note']) ?></div><?php endif ?></div></li>
          <?php endforeach ?>
        </ol>
      </div>
    </section>
  </div>

  <aside class="a-form-side">
    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.status')) ?></h2></div>
      <form method="post" action="<?= e(purl('/admin/orders/' . rawurlencode($o['id']) . '/status')) ?>" class="a-card-body form-grid" style="gap:12px"><?= csrf_field() ?>
        <select name="status" aria-label="<?= e(t('admin.status')) ?>"><?php foreach (Labels::STATUS as $k => $_): ?><option value="<?= $k ?>" <?= $o['status'] === $k ? 'selected' : '' ?>><?= e(Labels::status($k)) ?></option><?php endforeach ?></select>
        <input name="note" maxlength="300" placeholder="<?= e(t('admin.statusNote')) ?>" aria-label="<?= e(t('admin.statusNote')) ?>">
        <button class="btn" type="submit"><?= icon('check') ?> <?= e(t('admin.save')) ?></button>
      </form>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.client')) ?></h2></div>
      <div class="a-card-body a-kv">
        <div><span><?= e(t('checkout.name')) ?></span><b><?= e($c['name'] ?? '—') ?></b></div>
        <div><span><?= e(t('admin.phone')) ?></span><b><a href="<?= e(tel_href((string) ($c['phone'] ?? ''))) ?>"><?= e($c['phone'] ?? '—') ?></a></b></div>
        <?php if (!empty($c['email'])): ?><div><span><?= e(t('checkout.email')) ?></span><b><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></b></div><?php endif ?>
        <div><span><?= e(t('admin.account')) ?></span><b><?= $client ? e($client['name'] ?: $client['email']) : e(t('account.orderGuest')) ?></b></div>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('order.delivery')) ?></h2></div>
      <div class="a-card-body a-kv">
        <div><span><?= e(t('checkout.shippingMethod')) ?></span><b><?= e(Labels::shipping((string) ($c['shipping'] ?? ''))) ?></b></div>
        <?php if (!empty($c['city'])): ?><div><span><?= e(t('checkout.city')) ?></span><b><?= e($c['city']) ?></b></div><?php endif ?>
        <?php if (!empty($c['warehouse'])): ?><div><span><?= e(t('checkout.warehouse')) ?></span><b><?= e($c['warehouse']) ?></b></div><?php endif ?>
        <div><span><?= e(t('checkout.payment')) ?></span><b><?= e(Labels::payment($o['payment'])) ?></b></div>
        <?php if (!empty($c['comment'])): ?><div><span><?= e(t('checkout.comment')) ?></span><b style="font-weight:500"><?= e($c['comment']) ?></b></div><?php endif ?>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-body form-grid" style="gap:10px">
        <a class="btn btn-ghost btn-block" href="<?= e(url('/order/' . rawurlencode($o['id'])) . '?token=' . $o['token']) ?>" target="_blank" rel="noopener"><?= icon('external') ?> <?= e(t('admin.customerView')) ?></a>
        <form method="post" action="<?= e(purl('/admin/orders/' . rawurlencode($o['id']) . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteOrder')) ?>"><?= csrf_field() ?>
          <button class="btn btn-ghost btn-block danger-text" type="submit"><?= icon('trash') ?> <?= e(t('admin.delete')) ?></button></form>
      </div>
    </section>
  </aside>
</div>
