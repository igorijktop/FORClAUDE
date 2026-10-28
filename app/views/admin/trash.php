<?php /** @var list $items */
use Onika\I18n; ?>
<?php if ($items): ?>
<div class="a-toolbar"><span class="muted small a-toolbar-note"><?= icon('info') ?> <?= e(t('admin.trashHint')) ?></span>
  <form method="post" action="<?= e(purl('/admin/trash/empty')) ?>" data-confirm="<?= e(t('admin.emptyTrashConfirm')) ?>"><?= csrf_field() ?>
    <button class="btn btn-ghost btn-sm"><?= icon('trash') ?> <?= e(t('admin.emptyTrash')) ?></button></form></div>
<?php endif ?>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.trash')) ?> <span class="a-head-count"><?= count($items) ?></span></h2></div>
  <div class="a-table-wrap"><table class="a-table a-stack">
    <thead><tr><th scope="col"><span class="sr-only"><?= e(t('admin.images')) ?></span></th><th scope="col"><?= e(t('admin.productName')) ?></th><th scope="col"><?= e(t('admin.category')) ?></th><th scope="col"><?= e(t('admin.price')) ?></th><th scope="col"><?= e(t('admin.deletedAt')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
    <tbody>
      <?php foreach ($items as $it): $p = $it['product']; $tid = rawurlencode($it['id']); ?>
        <tr>
          <td class="a-cell-thumb"><img class="a-thumb" src="<?= e(media($p['images'][0] ?? null, 120)) ?>" alt="" loading="lazy" width="44" height="56"></td>
          <td class="a-cell-main"><span class="a-strong a-wrap"><?= e($p['name']) ?></span><div class="small muted a-wrap"><?= e($p['brand'] ?? '') ?></div></td>
          <td data-label="<?= e(t('admin.category')) ?>"><?= e(I18n::categoryName($p['category'])) ?></td>
          <td data-label="<?= e(t('admin.price')) ?>"><b class="nowrap"><?= e(money($p['price'])) ?></b></td>
          <td data-label="<?= e(t('admin.deletedAt')) ?>" class="small muted nowrap"><?= e(dt($it['deletedAt'], true)) ?></td>
          <td class="a-actions">
            <form method="post" action="<?= e(purl('/admin/trash/' . $tid . '/restore')) ?>"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.restore')) ?>" aria-label="<?= e(t('admin.restore')) ?>: <?= e($p['name']) ?>"><?= icon('return') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/trash/' . $tid . '/purge')) ?>" data-confirm="<?= e(t('admin.purgeConfirm')) ?>" data-confirm-name="<?= e($p['name']) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.purge')) ?>" aria-label="<?= e(t('admin.purge')) ?>: <?= e($p['name']) ?>"><?= icon('trash') ?></button></form>
          </td>
        </tr>
      <?php endforeach ?>
      <?php if (!$items): ?><tr class="a-empty-row"><td colspan="6" class="a-empty"><?= e(t('admin.trashEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
