<?php /** @var list $items */ ?>
<div class="a-toolbar"><span class="muted small a-toolbar-note"><?= icon('info') ?> <?= e(t('admin.subscribersHint')) ?></span>
  <?php if ($items): ?><a href="<?= e(purl('/admin/subscribers.csv')) ?>" class="btn btn-sm"><?= icon('download') ?> <?= e(t('admin.exportCsv')) ?></a><?php endif ?></div>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.subscribers')) ?> <span class="a-head-count"><?= count($items) ?></span></h2></div>
  <div class="a-table-wrap"><table class="a-table a-stack">
    <thead><tr><th scope="col">E-mail</th><th scope="col"><?= e(t('admin.date')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
    <tbody>
      <?php foreach ($items as $s): ?>
        <tr><td class="a-cell-main"><a class="a-strong a-wrap" href="mailto:<?= e($s['email']) ?>"><?= e($s['email']) ?></a></td><td data-label="<?= e(t('admin.date')) ?>" class="small muted nowrap"><?= e(dt($s['at'], true)) ?></td>
          <td class="a-actions"><form method="post" action="<?= e(purl('/admin/subscribers/delete')) ?>" data-confirm="<?= e(t('admin.deleteSubscriber')) ?>" data-confirm-name="<?= e($s['email']) ?>"><?= csrf_field() ?>
            <input type="hidden" name="email" value="<?= e($s['email']) ?>"><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e($s['email']) ?>"><?= icon('trash') ?></button></form></td></tr>
      <?php endforeach ?>
      <?php if (!$items): ?><tr class="a-empty-row"><td colspan="3" class="a-empty"><?= e(t('admin.subscribersEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
