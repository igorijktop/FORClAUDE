<?php
/** @var array $f @var array $result @var list $categories @var list $brands @var array $query */
use Onika\I18n;

$statusOpts = ['' => t('admin.allStatuses'), 'active' => t('admin.published'), 'hidden' => t('admin.hidden'), 'out' => t('common.notAvailable')];
$filtered = $f['q'] !== '' || $f['category'] || $f['brand'] || $f['status'] !== '';
?>
<div class="a-toolbar">
  <form method="get" class="a-filters" role="search">
    <div class="a-search"><?= icon('search') ?><input type="search" name="q" value="<?= e($f['q']) ?>" placeholder="<?= e(t('admin.searchProduct')) ?>" aria-label="<?= e(t('common.search')) ?>"></div>
    <select name="category" aria-label="<?= e(t('admin.category')) ?>"><option value=""><?= e(t('admin.allCategories')) ?></option>
      <?php foreach ($categories as $c): ?><option value="<?= e($c['name']) ?>" <?= ($query['category'] ?? '') === $c['name'] ? 'selected' : '' ?>><?= e(I18n::categoryLabel($c)) ?> (<?= (int) $c['total'] ?>)</option><?php endforeach ?></select>
    <select name="brand" aria-label="<?= e(t('admin.brand')) ?>"><option value=""><?= e(t('admin.allBrands')) ?></option>
      <?php foreach ($brands as $b): ?><option value="<?= e($b['name']) ?>" <?= ($query['brand'] ?? '') === $b['name'] ? 'selected' : '' ?>><?= e($b['name']) ?></option><?php endforeach ?></select>
    <select name="status" aria-label="<?= e(t('admin.status')) ?>"><?php foreach ($statusOpts as $k => $lbl): ?><option value="<?= $k ?>" <?= $f['status'] === $k ? 'selected' : '' ?>><?= e($lbl) ?></option><?php endforeach ?></select>
    <select name="sort" aria-label="<?= e(t('sort.label')) ?>">
      <?php foreach (['new' => 'sort.new', 'popular' => 'sort.popular', 'price-asc' => 'sort.priceAsc', 'price-desc' => 'sort.priceDesc', 'name' => 'sort.name'] as $k => $l): ?><option value="<?= $k ?>" <?= $f['sort'] === $k ? 'selected' : '' ?>><?= e(t($l)) ?></option><?php endforeach ?></select>
    <button class="btn btn-ghost btn-sm" type="submit"><?= icon('filter') ?> <?= e(t('admin.filter')) ?></button>
    <?php if ($filtered): ?><a href="<?= e(purl('/admin/products')) ?>" class="btn btn-ghost btn-sm a-reset"><?= icon('x') ?> <?= e(t('admin.resetFilters')) ?></a><?php endif ?>
  </form>
  <a href="<?= e(purl('/admin/products/new')) ?>" class="btn btn-sm a-toolbar-cta"><?= icon('plus') ?> <?= e(t('admin.addProduct')) ?></a>
</div>

<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.products')) ?> <span class="a-head-count"><?= (int) $result['total'] ?></span></h2>
    <?php if ($result['pages'] > 1): ?><span class="muted small"><?= e(t('admin.pageOf', ['n' => $result['page'], 'total' => $result['pages']])) ?></span><?php endif ?></div>
  <div class="a-table-wrap">
    <table class="a-table a-stack a-products">
      <thead><tr><th scope="col"><span class="sr-only"><?= e(t('admin.images')) ?></span></th><th scope="col"><?= e(t('admin.productName')) ?></th><th scope="col"><?= e(t('admin.category')) ?></th><th scope="col"><?= e(t('admin.price')) ?></th><th scope="col"><?= e(t('admin.availability')) ?></th><th scope="col"><?= e(t('admin.status')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
      <tbody>
        <?php foreach ($result['items'] as $p): $pid = rawurlencode($p['id']); $name = I18n::productName($p); ?>
          <tr class="<?= $p['active'] ? '' : 'is-off' ?>">
            <td class="a-cell-thumb"><img class="a-thumb" src="<?= e(media($p['images'][0] ?? null, 120)) ?>" alt="" loading="lazy" width="44" height="56"></td>
            <td class="a-cell-main"><a class="a-strong a-wrap" href="<?= e(purl('/admin/products/' . $pid . '/edit')) ?>"><?= e($name) ?></a>
              <div class="small muted a-wrap"><?= e($p['brand'] ?? '') ?><?= $p['sku'] ? ($p['brand'] ? ' · ' : '') . e($p['sku']) : '' ?></div></td>
            <td data-label="<?= e(t('admin.category')) ?>"><?= e(I18n::categoryName($p['category'])) ?></td>
            <td data-label="<?= e(t('admin.price')) ?>"><b class="nowrap"><?= e(money($p['price'])) ?></b><?php if ($p['oldPrice']): ?><div class="small muted nowrap"><s><?= e(money($p['oldPrice'])) ?></s></div><?php endif ?></td>
            <td data-label="<?= e(t('admin.availability')) ?>">
              <form method="post" class="stock-form" action="<?= e(purl('/admin/products/' . $pid . '/stock')) ?>"><?= csrf_field() ?>
                <input class="stock-input<?= $p['stock'] === 0 ? ' is-zero' : '' ?>" type="number" name="qty" min="0" max="99999" step="1" inputmode="numeric" required value="<?= (int) $p['stock'] ?>" data-stock-input data-orig="<?= (int) $p['stock'] ?>" aria-label="<?= e(t('admin.stockQty')) ?>: <?= e($name) ?>" title="<?= e(t('admin.stockQty')) ?>">
                <button class="a-icon-btn a-stock-save" type="submit" data-stock-save hidden aria-label="<?= e(t('admin.saveQty')) ?>" title="<?= e(t('admin.saveQty')) ?>"><?= icon('check') ?></button></form>
              <?php if ($p['stock'] === 0): ?><div class="a-stock-note"><?= e(t('common.notAvailable')) ?></div><?php endif ?>
            </td>
            <td data-label="<?= e(t('admin.status')) ?>">
              <div class="a-status-cell">
              <form method="post" action="<?= e(purl('/admin/products/' . $pid . '/toggle')) ?>"><?= csrf_field() ?>
                <button class="pill <?= $p['active'] ? 'blue' : 'gray' ?> pill-btn" type="submit" title="<?= e($p['active'] ? t('admin.hide') : t('admin.show')) ?>"><?= e($p['active'] ? t('admin.published') : t('admin.hidden')) ?></button></form>
              <?php if ($p['featured']): ?><span class="badge top"><?= icon('star') ?> <?= e(t('common.badgeTop')) ?></span><?php endif ?>
              </div>
            </td>
            <td class="a-actions">
              <a class="a-icon-btn" href="<?= e(url('/product/' . rawurlencode($p['slug']))) ?>" target="_blank" rel="noopener" title="<?= e(t('admin.view')) ?>" aria-label="<?= e(t('admin.view')) ?>: <?= e($name) ?>"><?= icon('eye') ?></a>
              <a class="a-icon-btn" href="<?= e(purl('/admin/products/' . $pid . '/edit')) ?>" title="<?= e(t('admin.edit')) ?>" aria-label="<?= e(t('admin.edit')) ?>: <?= e($name) ?>"><?= icon('edit') ?></a>
              <form method="post" action="<?= e(purl('/admin/products/' . $pid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteProduct')) ?>" data-confirm-name="<?= e($name) ?>"><?= csrf_field() ?>
                <button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e($name) ?>"><?= icon('trash') ?></button></form>
            </td>
          </tr>
        <?php endforeach ?>
        <?php if (!$result['items']): ?><tr class="a-empty-row"><td colspan="7" class="a-empty"><?= e(t('admin.notFoundItems')) ?><?php if ($filtered): ?><br><a class="a-link" href="<?= e(purl('/admin/products')) ?>"><?= e(t('admin.resetFilters')) ?></a><?php endif ?></td></tr><?php endif ?>
      </tbody>
    </table>
  </div>
  <?= view('admin/_pagination', ['page' => $result['page'], 'pages' => $result['pages'], 'base' => purl('/admin/products'), 'query' => $query]) ?>
</section>
