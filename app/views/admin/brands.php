<?php /** @var list $items @var array $old @var array $errors */
$old = $old ?? [];
$errors = $errors ?? [];
$o = static fn(string $k, string $def = ''): string => (string) ($old[$k] ?? $def);
?>
<div class="a-grid-2 a-grid-form">
  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.brands')) ?> <span class="a-head-count"><?= count($items) ?></span></h2></div>
    <div class="a-table-wrap"><table class="a-table a-stack">
      <thead><tr><th scope="col"><?= e(t('admin.name')) ?></th><th scope="col"><?= e(t('admin.products')) ?></th><th scope="col"><?= e(t('admin.status')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
      <tbody>
        <?php foreach ($items as $b): $bid = rawurlencode($b['id']); ?>
          <tr class="<?= $b['active'] ? '' : 'is-off' ?>">
            <td class="a-cell-main"><span class="a-strong a-wrap"><?= e($b['name']) ?></span><div class="small muted a-wrap">/<?= e($b['slug']) ?></div></td>
            <td data-label="<?= e(t('admin.products')) ?>"><?= (int) $b['count'] ?><?php if ($b['total'] !== $b['count']): ?> <span class="muted small">/ <?= (int) $b['total'] ?></span><?php endif ?></td>
            <td data-label="<?= e(t('admin.status')) ?>"><form method="post" action="<?= e(purl('/admin/brands/' . $bid . '/toggle')) ?>"><?= csrf_field() ?>
              <button class="pill <?= $b['active'] ? 'green' : 'gray' ?> pill-btn" type="submit"><?= e($b['active'] ? t('admin.active') : t('admin.hidden')) ?></button></form></td>
            <td class="a-actions">
              <button type="button" class="a-icon-btn" data-edit-brand="<?= json_attr(['id' => $b['id'], 'name' => $b['name'], 'description' => $b['description'],
                  'nameRu' => $b['translations']['ru']['name'] ?? '', 'nameEn' => $b['translations']['en']['name'] ?? '',
                  'descRu' => $b['translations']['ru']['description'] ?? '', 'descEn' => $b['translations']['en']['description'] ?? '']) ?>" title="<?= e(t('admin.edit')) ?>" aria-label="<?= e(t('admin.edit')) ?>: <?= e($b['name']) ?>"><?= icon('edit') ?></button>
              <form method="post" action="<?= e(purl('/admin/brands/' . $bid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteBrand')) ?>" data-confirm-name="<?= e($b['name']) ?>"><?= csrf_field() ?>
                <button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e($b['name']) ?>"><?= icon('trash') ?></button></form>
            </td>
          </tr>
        <?php endforeach ?>
        <?php if (!$items): ?><tr class="a-empty-row"><td colspan="4" class="a-empty"><?= e(t('admin.noData')) ?></td></tr><?php endif ?>
      </tbody></table></div>
  </section>

  <section class="a-card a-sticky">
    <div class="a-card-head"><h2 id="brandFormTitle"><?= e(t($o('id') !== '' ? 'admin.editBrand' : 'admin.newBrand')) ?></h2>
      <button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn" data-src-name="brandName" data-src-desc="brandDesc" data-dst="brandNameRu,brandDescRu,brandNameEn,brandDescEn"><?= icon('sparkle') ?> <?= e(t('admin.translateSuggest')) ?></button></div>
    <form method="post" action="<?= e(purl('/admin/brands/save')) ?>" class="a-card-body form-grid" id="brandForm">
      <?= csrf_field() ?>
      <input type="hidden" name="id" id="brandId" value="<?= e($o('id')) ?>">
      <div class="field<?= isset($errors['name']) ? ' has-error' : '' ?>"><label for="brandName"><?= e(t('admin.name')) ?> <span class="req">*</span></label><input id="brandName" name="name" required maxlength="80" value="<?= e($o('name')) ?>"<?= isset($errors['name']) ? ' aria-invalid="true" aria-describedby="brandName-err"' : '' ?>><?php if (isset($errors['name'])): ?><span class="err" id="brandName-err"><?= icon('alert') ?> <?= e(t($errors['name'] === 'exists' ? 'admin.nameExists' : 'admin.errRequired')) ?></span><?php endif ?></div>
      <div class="form-grid two">
        <div class="field"><label for="brandNameRu"><?= e(t('admin.nameRu')) ?></label><input id="brandNameRu" name="nameRu" maxlength="80" value="<?= e($o('nameRu')) ?>"></div>
        <div class="field"><label for="brandNameEn"><?= e(t('admin.nameEn')) ?></label><input id="brandNameEn" name="nameEn" maxlength="80" value="<?= e($o('nameEn')) ?>"></div>
      </div>
      <div class="field"><label for="brandDesc"><?= e(t('admin.description')) ?> (UA)</label><textarea id="brandDesc" name="description" rows="2" maxlength="300"><?= e($o('description')) ?></textarea></div>
      <div class="form-grid two">
        <div class="field"><label for="brandDescRu"><?= e(t('admin.descRu')) ?></label><textarea id="brandDescRu" name="descRu" rows="2" maxlength="300"><?= e($o('descRu')) ?></textarea></div>
        <div class="field"><label for="brandDescEn"><?= e(t('admin.descEn')) ?></label><textarea id="brandDescEn" name="descEn" rows="2" maxlength="300"><?= e($o('descEn')) ?></textarea></div>
      </div>
      <div class="a-form-actions">
        <button class="btn" type="submit"><?= icon('check') ?> <?= e(t('admin.saveBrand')) ?></button>
        <button class="btn btn-ghost" type="button" id="brandReset"<?= $o('id') !== '' ? '' : ' hidden' ?>><?= e(t('admin.cancel')) ?></button>
      </div>
    </form>
  </section>
</div>
