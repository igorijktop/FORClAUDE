<?php
/** @var array $settings @var array $user @var list $orders @var list $flash */
use Onika\Labels;

$spent = 0.0;
foreach ($orders as $o) {
    if ($o['status'] !== 'cancelled') {
        $spent += $o['total'];
    }
}
$greet = $user['name'] !== '' ? $user['name'] : $user['email'];
?>
<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs"><a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?><span><?= e(t('account.title')) ?></span></nav>
    <div class="account-hello">
      <div>
        <h1><?= e(t('account.greeting', ['name' => $greet])) ?></h1>
        <p class="muted" style="margin:6px 0 0"><?= e(t('account.memberSince', ['date' => dt($user['createdAt'])])) ?></p>
      </div>
      <form method="post" action="<?= e(url('/account/logout')) ?>"><?= csrf_field() ?><button class="btn btn-ghost btn-sm" type="submit"><?= icon('logout') ?> <?= e(t('account.logout')) ?></button></form>
    </div>
  </div>
</section>

<div class="container">
  <div style="margin-top:20px"><?= view('partials/flash', ['flash' => $flash]) ?></div>
  <div class="account-stats">
    <div class="a-stat"><span class="ic-round"><?= icon('box') ?></span><div><b><?= count($orders) ?></b><span><?= e(t('account.totalOrders')) ?></span></div></div>
    <div class="a-stat"><span class="ic-round"><?= icon('tag') ?></span><div><b><?= e(money($spent)) ?></b><span><?= e(t('account.totalSpent')) ?></span></div></div>
  </div>

  <div class="account-grid">
    <div>
      <h2 style="font-size:24px;margin-bottom:18px"><?= e(t('account.myOrders')) ?></h2>
      <?php if ($orders): foreach ($orders as $o): $link = url('/order/' . $o['id']) . '?token=' . $o['token']; ?>
        <div class="order-card">
          <div class="oc-head">
            <div><a class="oc-id" href="<?= e($link) ?>"><?= e(t('account.orderNo', ['id' => $o['id']])) ?></a><span class="oc-date"><?= e(t('account.orderDate', ['date' => dt($o['createdAt'])])) ?></span></div>
            <span class="pill <?= e(Labels::statusTone($o['status'])) ?>"><?= e(Labels::status($o['status'])) ?></span>
          </div>
          <div class="oc-body">
            <div class="oc-thumbs"><?php foreach (array_slice($o['items'], 0, 4) as $it): ?><img src="<?= e(media($it['image'] ?? null, 120)) ?>" alt="" loading="lazy" width="52" height="66"><?php endforeach ?></div>
            <div class="oc-meta">
              <div><span class="muted small"><?= e(t('account.orderItems')) ?></span><b><?= array_sum(array_map(static fn($i) => (int) ($i['qty'] ?? 1), $o['items'])) ?></b></div>
              <div><span class="muted small"><?= e(t('account.orderTotal')) ?></span><b><?= e(money($o['total'])) ?></b></div>
            </div>
            <a class="btn btn-ghost btn-sm" href="<?= e($link) ?>"><?= e(t('account.viewOrder')) ?> <?= icon('arrow') ?></a>
          </div>
        </div>
      <?php endforeach; else: ?>
        <div class="empty-state card">
          <?= icon('box') ?>
          <h3><?= e(t('account.noOrders')) ?></h3>
          <p><?= e(t('account.noOrdersText')) ?></p>
          <a href="<?= e(url('/catalog')) ?>" class="btn"><?= e(t('account.toCatalog')) ?> <?= icon('arrow') ?></a>
        </div>
      <?php endif ?>
    </div>

    <aside class="account-side">
      <form class="card" method="post" action="<?= e(url('/account/profile')) ?>">
        <h3><?= e(t('account.personal')) ?></h3>
        <?= csrf_field() ?>
        <div class="form-grid">
          <div class="field"><label for="p-name"><?= e(t('account.name')) ?></label><input id="p-name" name="name" value="<?= e($user['name']) ?>" autocomplete="name"></div>
          <div class="field"><label><?= e(t('account.email')) ?></label><input value="<?= e($user['email']) ?>" disabled></div>
          <div class="field"><label for="p-phone"><?= e(t('account.phone')) ?></label><input id="p-phone" name="phone" type="tel" value="<?= e($user['phone']) ?>" placeholder="+380 __ ___ __ __" autocomplete="tel"></div>
        </div>
        <button class="btn btn-block" type="submit" style="margin-top:18px"><?= e(t('account.saveProfile')) ?></button>
      </form>
      <form class="card" method="post" action="<?= e(url('/account/password')) ?>">
        <h3><?= e(t('account.changePass')) ?></h3>
        <?= csrf_field() ?>
        <div class="form-grid">
          <div class="field"><label for="pw-cur"><?= e(t('account.currentPass')) ?></label><input id="pw-cur" type="password" name="current" required autocomplete="current-password"></div>
          <div class="field"><label for="pw-new"><?= e(t('account.newPass')) ?></label><input id="pw-new" type="password" name="next" required minlength="8" autocomplete="new-password"></div>
        </div>
        <button class="btn btn-ghost btn-block" type="submit" style="margin-top:18px"><?= icon('lock') ?> <?= e(t('account.savePass')) ?></button>
      </form>
    </aside>
  </div>
</div>
