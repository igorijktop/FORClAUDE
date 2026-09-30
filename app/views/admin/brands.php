<?php /** @var list $items */ ?>
<div class="a-grid-2 a-grid-form">
  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.brands')) ?> · <?= count($items) ?></h2></div>
    <div class="a-table-wrap"><table class="a-table">
      <thead><tr><th><?= e(t('admin.name')) ?></th><th><?= e(t('admin.products')) ?></th><th><?= e(t('admin.status')) ?></th><th></th></tr></thead>
      <tbody>
        <?php foreach ($items as $b): $bid = rawurlencode($b['id']); ?>
          <tr class="<?= $b['active'] ? '' : 'is-off' ?>">
            <td><span class="a-strong"><?= e($b['name']) ?></span><div class="small muted">/<?= e($b['slug']) ?></div></td>
            <td><?= (int) $b['count'] ?><?php if ($b['total'] !== $b['count']): ?> <span class="muted small">/ <?= (int) $b['total'] ?></span><?php endif ?></td>
            <td><form method="post" action="<?= e(purl('/admin/brands/' . $bid . '/toggle')) ?>"><?= csrf_field() ?>
              <button class="pill <?= $b['active'] ? 'green' : 'gray' ?> pill-btn" type="submit"><?= e($b['active'] ? t('admin.active') : t('admin.hidden')) ?></button></form></td>
            <td class="a-actions">
              <button type="button" class="a-icon-btn" data-edit-brand="<?= json_attr(['id' => $b['id'], 'name' => $b['name'], 'description' => $b['description'],
                  'nameRu' => $b['translations']['ru']['name'] ?? '', 'nameEn' => $b['translations']['en']['name'] ?? '',
                  'descRu' => $b['translations']['ru']['description'] ?? '', 'descEn' => $b['translations']['en']['description'] ?? '']) ?>" title="<?= e(t('admin.edit')) ?>"><?= icon('edit') ?></button>
              <form method="post" action="<?= e(purl('/admin/brands/' . $bid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteBrand')) ?>"><?= csrf_field() ?>
                <button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>"><?= icon('trash') ?></button></form>
            </td>
          </tr>
        <?php endforeach ?>
        <?php if (!$items): ?><tr><td colspan="4" class="a-empty"><?= e(t('admin.noData')) ?></td></tr><?php endif ?>
      </tbody></table></div>
  </section>

  <section class="a-card a-sticky">
    <div class="a-card-head"><h2 id="brandFormTitle"><?= e(t('admin.newBrand')) ?></h2>
      <button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn" data-src-name="brandName" data-src-desc="brandDesc" data-dst="brandNameRu,brandDescRu,brandNameEn,brandDescEn"><?= icon('globe') ?> <?= e(t('admin.translateSuggest')) ?></button></div>
    <form method="post" action="<?= e(purl('/admin/brands/save')) ?>" class="a-card-body form-grid" id="brandForm">
      <?= csrf_field() ?>
      <input type="hidden" name="id" id="brandId">
      <div class="field"><label for="brandName"><?= e(t('admin.name')) ?> <span class="req">*</span></label><input id="brandName" name="name" required maxlength="80"></div>
      <div class="form-grid two">
        <div class="field"><label for="brandNameRu"><?= e(t('admin.nameRu')) ?></label><input id="brandNameRu" name="nameRu" maxlength="80"></div>
        <div class="field"><label for="brandNameEn"><?= e(t('admin.nameEn')) ?></label><input id="brandNameEn" name="nameEn" maxlength="80"></div>
      </div>
      <div class="field"><label for="brandDesc"><?= e(t('admin.description')) ?> (UA)</label><textarea id="brandDesc" name="description" rows="2" maxlength="300"></textarea></div>
      <div class="form-grid two">
        <div class="field"><label for="brandDescRu"><?= e(t('admin.descRu')) ?></label><textarea id="brandDescRu" name="descRu" rows="2" maxlength="300"></textarea></div>
        <div class="field"><label for="brandDescEn"><?= e(t('admin.descEn')) ?></label><textarea id="brandDescEn" name="descEn" rows="2" maxlength="300"></textarea></div>
      </div>
      <div class="a-form-actions">
        <button class="btn" type="submit"><?= icon('check') ?> <?= e(t('admin.saveBrand')) ?></button>
        <button class="btn btn-ghost" type="button" id="brandReset" hidden><?= e(t('admin.cancel')) ?></button>
      </div>
    </form>
  </section>
</div>
