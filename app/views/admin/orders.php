<?php
/** @var array $f @var array $result @var array $counts @var array $users @var list $clients */
use Onika\Labels;

$total = array_sum($counts);
$qs = static function (array $patch) use ($f): string {
    $q = array_merge(['status' => $f['status'], 'q' => $f['q'], 'sort' => $f['sort'] !== 'new' ? $f['sort'] : '', 'account' => $f['account'], 'user' => $f['user']], $patch);
    $s = query_string($q);
    return purl('/admin/orders') . ($s !== '' ? '?' . $s : '');
};
?>
<nav class="a-chips" aria-label="<?= e(t('admin.status')) ?>">
  <a class="a-chip <?= $f['status'] === '' ? 'on' : '' ?>"<?= $f['status'] === '' ? ' aria-current="true"' : '' ?> href="<?= e($qs(['status' => '', 'page' => ''])) ?>"><?= e(t('admin.allStatuses')) ?> <em><?= (int) $total ?></em></a>
  <?php foreach (Labels::STATUS as $k => $_): ?>
    <a class="a-chip <?= $f['status'] === $k ? 'on' : '' ?>"<?= $f['status'] === $k ? ' aria-current="true"' : '' ?> href="<?= e($qs(['status' => $k, 'page' => ''])) ?>"><span class="dot tone-<?= e(Labels::statusTone($k)) ?>"></span><?= e(Labels::status($k)) ?> <em><?= (int) $counts[$k] ?></em></a>
  <?php endforeach ?>
</nav>

<div class="a-toolbar">
  <form method="get" class="a-filters" role="search">
    <div class="a-search"><?= icon('search') ?><input type="search" name="q" value="<?= e($f['q']) ?>" placeholder="<?= e(t('admin.orderSearch')) ?>" aria-label="<?= e(t('common.search')) ?>"></div>
    <?php if ($f['status'] !== ''): ?><input type="hidden" name="status" value="<?= e($f['status']) ?>"><?php endif ?>
    <select name="sort" data-autosubmit aria-label="<?= e(t('sort.label')) ?>">
      <?php foreach (['new' => 'admin.sortNew', 'old' => 'admin.sortOld', 'total-desc' => 'admin.sortTotalDesc', 'total-asc' => 'admin.sortTotalAsc', 'status' => 'admin.sortStatus'] as $k => $l): ?><option value="<?= $k ?>" <?= $f['sort'] === $k ? 'selected' : '' ?>><?= e(t($l)) ?></option><?php endforeach ?></select>
    <select name="account" data-autosubmit aria-label="<?= e(t('admin.clients')) ?>">
      <option value=""><?= e(t('admin.allClients')) ?></option>
      <option value="yes" <?= $f['account'] === 'yes' ? 'selected' : '' ?>><?= e(t('account.registeredClient')) ?></option>
      <option value="no" <?= $f['account'] === 'no' ? 'selected' : '' ?>><?= e(t('account.orderGuest')) ?></option></select>
    <?php if ($clients): ?><select name="user" data-autosubmit aria-label="<?= e(t('admin.client')) ?>"><option value=""><?= e(t('admin.client')) ?>: —</option>
      <?php foreach ($clients as $c): ?><option value="<?= e($c['id']) ?>" <?= $f['user'] === $c['id'] ? 'selected' : '' ?>><?= e(($c['name'] ?: $c['email']) . ' · ' . $c['orders']) ?></option><?php endforeach ?></select><?php endif ?>
    <button class="btn btn-ghost btn-sm" type="submit"><?= icon('filter') ?> <?= e(t('admin.filter')) ?></button>
    <?php if ($f['q'] !== '' || $f['status'] !== '' || $f['account'] !== '' || $f['user'] !== ''): ?><a href="<?= e(purl('/admin/orders')) ?>" class="btn btn-ghost btn-sm a-reset"><?= icon('x') ?> <?= e(t('admin.resetFilters')) ?></a><?php endif ?>
  </form>
</div>

<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.orders')) ?> <span class="a-head-count"><?= (int) $result['total'] ?></span></h2>
    <?php if ($result['pages'] > 1): ?><span class="muted small"><?= e(t('admin.pageOf', ['n' => $result['page'], 'total' => $result['pages']])) ?></span><?php endif ?></div>
  <div class="a-table-wrap"><table class="a-table a-stack a-orders">
    <thead><tr><th scope="col">№</th><th scope="col"><?= e(t('admin.client')) ?></th><th scope="col"><?= e(t('checkout.shippingMethod')) ?></th><th scope="col"><?= e(t('admin.sum')) ?></th><th scope="col"><?= e(t('admin.status')) ?></th><th scope="col"><?= e(t('admin.date')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
    <tbody>
      <?php foreach ($result['items'] as $o): $oid = rawurlencode($o['id']); $c = $o['customer']; $u = $o['userId'] ? ($users[$o['userId']] ?? null) : null; $count = array_sum(array_map(static fn($i) => (int) ($i['qty'] ?? 1), $o['items'])); ?>
        <tr>
          <td class="a-cell-main"><a class="a-strong" href="<?= e(purl('/admin/orders/' . $oid)) ?>">#<?= e($o['id']) ?></a><div class="small muted"><?= $count ?> <?= e(t('admin.pcs')) ?></div></td>
          <td data-label="<?= e(t('admin.client')) ?>"><span class="a-strong a-wrap"><?= e($c['name'] ?? '—') ?></span>
            <div class="small muted"><a href="<?= e(tel_href((string) ($c['phone'] ?? ''))) ?>"><?= e($c['phone'] ?? '') ?></a><?php if ($u): ?> · <span class="pill green pill-xs"><?= e(t('account.registeredClient')) ?></span><?php endif ?></div></td>
          <td data-label="<?= e(t('checkout.shippingMethod')) ?>"><?= e(Labels::shipping((string) ($c['shipping'] ?? ''))) ?><div class="small muted a-wrap"><?= e(trim(($c['city'] ?? '') . ' ' . ($c['warehouse'] ?? ''))) ?></div></td>
          <td data-label="<?= e(t('admin.sum')) ?>"><b class="nowrap"><?= e(money($o['total'])) ?></b><div class="small muted"><?= e(Labels::payment($o['payment'])) ?></div></td>
          <td data-label="<?= e(t('admin.status')) ?>">
            <form method="post" action="<?= e(purl('/admin/orders/' . $oid . '/status')) ?>" class="a-inline-status"><?= csrf_field() ?>
              <select name="status" class="tone-<?= e(Labels::statusTone($o['status'])) ?>" data-autosubmit data-orig="<?= e($o['status']) ?>" aria-label="<?= e(t('admin.status')) ?>: #<?= e($o['id']) ?>">
                <?php foreach (Labels::STATUS as $k => $_): ?><option value="<?= $k ?>" <?= $o['status'] === $k ? 'selected' : '' ?>><?= e(Labels::status($k)) ?></option><?php endforeach ?></select></form>
          </td>
          <td data-label="<?= e(t('admin.date')) ?>" class="muted small nowrap"><?= e(dt($o['createdAt'], true)) ?></td>
          <td class="a-actions"><a class="a-icon-btn" href="<?= e(purl('/admin/orders/' . $oid)) ?>" title="<?= e(t('admin.view')) ?>" aria-label="<?= e(t('admin.view')) ?>: #<?= e($o['id']) ?>"><?= icon('eye') ?></a></td>
        </tr>
      <?php endforeach ?>
      <?php if (!$result['items']): ?><tr class="a-empty-row"><td colspan="7" class="a-empty"><?= e(t('admin.noOrders')) ?></td></tr><?php endif ?>
    </tbody></table></div>
  <?= view('admin/_pagination', ['page' => $result['page'], 'pages' => $result['pages'], 'base' => purl('/admin/orders'), 'query' => ['status' => $f['status'], 'q' => $f['q'], 'sort' => $f['sort'] !== 'new' ? $f['sort'] : '', 'account' => $f['account'], 'user' => $f['user']]]) ?>
</section>
