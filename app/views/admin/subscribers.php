<?php /** @var list $items */ ?>
<div class="a-toolbar"><span class="muted small"><?= e(t('admin.subscribersHint')) ?></span>
  <?php if ($items): ?><a href="<?= e(purl('/admin/subscribers.csv')) ?>" class="btn btn-sm"><?= icon('download') ?> <?= e(t('admin.exportCsv')) ?></a><?php endif ?></div>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.subscribers')) ?> · <?= count($items) ?></h2></div>
  <div class="a-table-wrap"><table class="a-table">
    <thead><tr><th>E-mail</th><th><?= e(t('admin.date')) ?></th><th></th></tr></thead>
    <tbody>
      <?php foreach ($items as $s): ?>
        <tr><td><span class="a-strong"><?= e($s['email']) ?></span></td><td class="small muted"><?= e(dt($s['at'], true)) ?></td>
          <td class="a-actions"><form method="post" action="<?= e(purl('/admin/subscribers/delete')) ?>" data-confirm="<?= e(t('admin.deleteSubscriber')) ?>"><?= csrf_field() ?>
            <input type="hidden" name="email" value="<?= e($s['email']) ?>"><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>"><?= icon('trash') ?></button></form></td></tr>
      <?php endforeach ?>
      <?php if (!$items): ?><tr><td colspan="3" class="a-empty"><?= e(t('admin.subscribersEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
