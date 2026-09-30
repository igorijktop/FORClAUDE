<?php /** @var list $items */
use Onika\I18n; ?>
<?php if ($items): ?>
<div class="a-toolbar"><span class="muted small"><?= e(t('admin.trashHint')) ?></span>
  <form method="post" action="<?= e(purl('/admin/trash/empty')) ?>" data-confirm="<?= e(t('admin.emptyTrashConfirm')) ?>"><?= csrf_field() ?>
    <button class="btn btn-ghost btn-sm"><?= icon('trash') ?> <?= e(t('admin.emptyTrash')) ?></button></form></div>
<?php endif ?>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.trash')) ?> · <?= count($items) ?></h2></div>
  <div class="a-table-wrap"><table class="a-table">
    <thead><tr><th></th><th><?= e(t('admin.productName')) ?></th><th><?= e(t('admin.category')) ?></th><th><?= e(t('admin.price')) ?></th><th><?= e(t('admin.deletedAt')) ?></th><th></th></tr></thead>
    <tbody>
      <?php foreach ($items as $it): $p = $it['product']; $tid = rawurlencode($it['id']); ?>
        <tr>
          <td><img class="a-thumb" src="<?= e(media($p['images'][0] ?? null, 120)) ?>" alt="" loading="lazy" width="44" height="56"></td>
          <td><span class="a-strong"><?= e($p['name']) ?></span><div class="small muted"><?= e($p['brand'] ?? '') ?></div></td>
          <td><?= e(I18n::categoryName($p['category'])) ?></td>
          <td><b><?= e(money($p['price'])) ?></b></td>
          <td class="small muted"><?= e(dt($it['deletedAt'], true)) ?></td>
          <td class="a-actions">
            <form method="post" action="<?= e(purl('/admin/trash/' . $tid . '/restore')) ?>"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.restore')) ?>"><?= icon('return') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/trash/' . $tid . '/purge')) ?>" data-confirm="<?= e(t('admin.purgeConfirm')) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.purge')) ?>"><?= icon('trash') ?></button></form>
          </td>
        </tr>
      <?php endforeach ?>
      <?php if (!$items): ?><tr><td colspan="6" class="a-empty"><?= e(t('admin.trashEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
