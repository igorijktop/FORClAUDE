<?php /** @var list $clients @var int $guestOrders @var ?string $newPassword @var ?string $newPasswordFor */
\Onika\Session::forget('new_password'); \Onika\Session::forget('new_password_for');
$revenue = array_sum(array_column($clients, 'spent'));
$orders = array_sum(array_column($clients, 'orders'));
?>
<?php if ($newPassword): ?>
  <div class="a-alert ok" role="status"><?= icon('key') ?><div><b><?= e(t('admin.tempPassFor', ['email' => $newPasswordFor])) ?></b><br>
    <code class="a-code"><?= e($newPassword) ?></code><br><span class="small"><?= e(t('admin.tempPassNote')) ?></span></div></div>
<?php endif ?>
<div class="a-stats">
  <div class="a-stat tone-blue"><span class="a-stat-ic"><?= icon('users') ?></span><div><div class="a-stat-val"><?= count($clients) ?></div><div class="a-stat-label"><?= e(t('admin.registeredClients')) ?></div></div></div>
  <div class="a-stat tone-violet"><span class="a-stat-ic"><?= icon('truck') ?></span><div><div class="a-stat-val"><?= (int) $orders ?></div><div class="a-stat-label"><?= e(t('admin.ordersTotal')) ?></div></div></div>
  <div class="a-stat tone-green"><span class="a-stat-ic"><?= icon('trending') ?></span><div><div class="a-stat-val"><?= e(money($revenue)) ?></div><div class="a-stat-label"><?= e(t('admin.revenue')) ?></div></div></div>
  <a class="a-stat tone-amber" href="<?= e(purl('/admin/orders?account=no')) ?>"><span class="a-stat-ic"><?= icon('user') ?></span><div><div class="a-stat-val"><?= (int) $guestOrders ?></div><div class="a-stat-label"><?= e(t('account.orderGuest')) ?></div></div></a>
</div>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.clients')) ?> <span class="a-head-count"><?= count($clients) ?></span></h2></div>
  <div class="a-table-wrap"><table class="a-table a-stack">
    <thead><tr><th scope="col"><?= e(t('admin.client')) ?></th><th scope="col"><?= e(t('admin.phone')) ?></th><th scope="col"><?= e(t('admin.orders')) ?></th><th scope="col"><?= e(t('account.orderTotal')) ?></th><th scope="col"><?= e(t('admin.registered')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
    <tbody>
      <?php foreach ($clients as $c): $cid = rawurlencode($c['id']); ?>
        <tr>
          <td class="a-cell-main"><span class="a-cell-person"><span class="a-avatar a-avatar-sm" aria-hidden="true"><?= e(initial((string) ($c['name'] ?: $c['email']))) ?></span><span class="grow"><span class="a-strong a-wrap"><?= e($c['name'] ?: '—') ?></span><span class="small muted a-wrap a-block"><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></span></span></span></td>
          <td data-label="<?= e(t('admin.phone')) ?>" class="nowrap"><?php if ($c['phone']): ?><a href="<?= e(tel_href((string) $c['phone'])) ?>"><?= e($c['phone']) ?></a><?php else: ?>—<?php endif ?></td>
          <td data-label="<?= e(t('admin.orders')) ?>"><span class="pill blue"><?= (int) $c['orders'] ?></span></td>
          <td data-label="<?= e(t('account.orderTotal')) ?>"><b class="nowrap"><?= e(money($c['spent'])) ?></b></td>
          <td data-label="<?= e(t('admin.registered')) ?>" class="small muted nowrap"><?= e(dt($c['createdAt'])) ?></td>
          <td class="a-actions">
            <a class="a-icon-btn" href="<?= e(purl('/admin/orders?user=' . $cid)) ?>" title="<?= e(t('admin.viewOrders')) ?>" aria-label="<?= e(t('admin.viewOrders')) ?>: <?= e($c['email']) ?>"><?= icon('eye') ?></a>
            <form method="post" action="<?= e(purl('/admin/clients/' . $cid . '/reset')) ?>" data-confirm="<?= e(t('admin.resetPassConfirm')) ?>" data-confirm-name="<?= e($c['email']) ?>" data-confirm-kind="warn"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.resetPass')) ?>" aria-label="<?= e(t('admin.resetPass')) ?>: <?= e($c['email']) ?>"><?= icon('key') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/clients/' . $cid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteClient')) ?>" data-confirm-name="<?= e($c['email']) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e($c['email']) ?>"><?= icon('trash') ?></button></form>
          </td>
        </tr>
      <?php endforeach ?>
      <?php if (!$clients): ?><tr class="a-empty-row"><td colspan="6" class="a-empty"><?= e(t('admin.noClients')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
