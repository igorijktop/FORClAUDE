<?php /** @var list $clients @var int $guestOrders @var ?string $newPassword @var ?string $newPasswordFor */
\Onika\Session::forget('new_password'); \Onika\Session::forget('new_password_for');
$revenue = array_sum(array_column($clients, 'spent'));
$orders = array_sum(array_column($clients, 'orders'));
?>
<?php if ($newPassword): ?>
  <div class="a-alert ok"><?= icon('key') ?><div><b><?= e(t('admin.tempPassFor', ['email' => $newPasswordFor])) ?></b><br>
    <code class="a-code"><?= e($newPassword) ?></code><br><span class="small"><?= e(t('admin.tempPassNote')) ?></span></div></div>
<?php endif ?>
<div class="a-stats">
  <div class="a-stat tone-blue"><span class="a-stat-ic"><?= icon('users') ?></span><div><div class="a-stat-val"><?= count($clients) ?></div><div class="a-stat-label"><?= e(t('admin.registeredClients')) ?></div></div></div>
  <div class="a-stat tone-violet"><span class="a-stat-ic"><?= icon('truck') ?></span><div><div class="a-stat-val"><?= (int) $orders ?></div><div class="a-stat-label"><?= e(t('admin.ordersTotal')) ?></div></div></div>
  <div class="a-stat tone-green"><span class="a-stat-ic"><?= icon('trending') ?></span><div><div class="a-stat-val"><?= e(money($revenue)) ?></div><div class="a-stat-label"><?= e(t('admin.revenue')) ?></div></div></div>
  <a class="a-stat tone-amber" href="<?= e(purl('/admin/orders?account=no')) ?>"><span class="a-stat-ic"><?= icon('user') ?></span><div><div class="a-stat-val"><?= (int) $guestOrders ?></div><div class="a-stat-label"><?= e(t('account.orderGuest')) ?></div></div></a>
</div>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.clients')) ?> · <?= count($clients) ?></h2></div>
  <div class="a-table-wrap"><table class="a-table">
    <thead><tr><th><?= e(t('admin.client')) ?></th><th><?= e(t('admin.phone')) ?></th><th><?= e(t('admin.orders')) ?></th><th><?= e(t('account.orderTotal')) ?></th><th><?= e(t('admin.registered')) ?></th><th></th></tr></thead>
    <tbody>
      <?php foreach ($clients as $c): $cid = rawurlencode($c['id']); ?>
        <tr>
          <td><span class="a-strong"><?= e($c['name'] ?: '—') ?></span><div class="small muted"><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></div></td>
          <td><?= e($c['phone'] ?: '—') ?></td>
          <td><span class="pill blue"><?= (int) $c['orders'] ?></span></td>
          <td><b><?= e(money($c['spent'])) ?></b></td>
          <td class="small muted"><?= e(dt($c['createdAt'])) ?></td>
          <td class="a-actions">
            <a class="a-icon-btn" href="<?= e(purl('/admin/orders?user=' . $cid)) ?>" title="<?= e(t('admin.viewOrders')) ?>"><?= icon('eye') ?></a>
            <form method="post" action="<?= e(purl('/admin/clients/' . $cid . '/reset')) ?>" data-confirm="<?= e(t('admin.resetPassConfirm')) ?>"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.resetPass')) ?>"><?= icon('key') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/clients/' . $cid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteClient')) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>"><?= icon('trash') ?></button></form>
          </td>
        </tr>
      <?php endforeach ?>
      <?php if (!$clients): ?><tr><td colspan="6" class="a-empty"><?= e(t('admin.noClients')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
