<?php /** @var list $items @var array $old @var array $errors */
use Onika\I18n;
$old = $old ?? [];
$errors = $errors ?? [];
$o = static fn(string $k, string $def = ''): string => (string) ($old[$k] ?? $def);
?>
<div class="a-grid-2 a-grid-form">
  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.categories')) ?> <span class="a-head-count"><?= count($items) ?></span></h2></div>
    <div class="a-table-wrap"><table class="a-table a-stack">
      <thead><tr><th scope="col"><span class="sr-only"><?= e(t('admin.color')) ?></span></th><th scope="col"><?= e(t('admin.name')) ?></th><th scope="col"><?= e(t('admin.products')) ?></th><th scope="col"><?= e(t('admin.status')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
      <tbody>
        <?php foreach ($items as $c): $cid = rawurlencode($c['id']); ?>
          <tr class="<?= $c['active'] ? '' : 'is-off' ?>">
            <td class="a-cell-thumb"><span class="a-color" style="background:<?= e($c['color']) ?>"></span></td>
            <td class="a-cell-main"><span class="a-strong a-wrap"><?= e(I18n::categoryLabel($c)) ?></span><div class="small muted a-wrap">/<?= e($c['slug']) ?></div></td>
            <td data-label="<?= e(t('admin.products')) ?>"><?= (int) $c['count'] ?><?php if ($c['total'] !== $c['count']): ?> <span class="muted small">/ <?= (int) $c['total'] ?></span><?php endif ?></td>
            <td data-label="<?= e(t('admin.status')) ?>"><form method="post" action="<?= e(purl('/admin/categories/' . $cid . '/toggle')) ?>"><?= csrf_field() ?>
              <button class="pill <?= $c['active'] ? 'green' : 'gray' ?> pill-btn" type="submit"><?= e($c['active'] ? t('admin.active') : t('admin.hidden')) ?></button></form></td>
            <td class="a-actions">
              <button type="button" class="a-icon-btn" data-edit-cat="<?= json_attr(['id' => $c['id'], 'name' => $c['name'], 'description' => $c['description'], 'color' => $c['color'],
                  'nameRu' => $c['translations']['ru']['name'] ?? '', 'nameEn' => $c['translations']['en']['name'] ?? '',
                  'descRu' => $c['translations']['ru']['description'] ?? '', 'descEn' => $c['translations']['en']['description'] ?? '']) ?>" title="<?= e(t('admin.edit')) ?>" aria-label="<?= e(t('admin.edit')) ?>: <?= e(I18n::categoryLabel($c)) ?>"><?= icon('edit') ?></button>
              <a class="a-icon-btn" href="<?= e(url('/catalog/' . rawurlencode($c['slug']))) ?>" target="_blank" rel="noopener" title="<?= e(t('admin.view')) ?>" aria-label="<?= e(t('admin.view')) ?>: <?= e(I18n::categoryLabel($c)) ?>"><?= icon('eye') ?></a>
              <form method="post" action="<?= e(purl('/admin/categories/' . $cid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteCategory')) ?>" data-confirm-name="<?= e(I18n::categoryLabel($c)) ?>"><?= csrf_field() ?>
                <button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e(I18n::categoryLabel($c)) ?>"><?= icon('trash') ?></button></form>
            </td>
          </tr>
        <?php endforeach ?>
        <?php if (!$items): ?><tr class="a-empty-row"><td colspan="5" class="a-empty"><?= e(t('admin.noData')) ?></td></tr><?php endif ?>
      </tbody></table></div>
  </section>

  <section class="a-card a-sticky">
    <div class="a-card-head"><h2 id="catFormTitle"><?= e(t($o('id') !== '' ? 'admin.editCategory' : 'admin.newCategory')) ?></h2>
      <button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn" data-src-name="catName" data-src-desc="catDesc" data-dst="catNameRu,catDescRu,catNameEn,catDescEn"><?= icon('sparkle') ?> <?= e(t('admin.translateSuggest')) ?></button></div>
    <form method="post" action="<?= e(purl('/admin/categories/save')) ?>" class="a-card-body form-grid" id="catForm">
      <?= csrf_field() ?>
      <input type="hidden" name="id" id="catId" value="<?= e($o('id')) ?>">
      <div class="field<?= isset($errors['name']) ? ' has-error' : '' ?>"><label for="catName"><?= e(t('admin.name')) ?> (UA) <span class="req">*</span></label><input id="catName" name="name" required maxlength="80" value="<?= e($o('name')) ?>"<?= isset($errors['name']) ? ' aria-invalid="true" aria-describedby="catName-err"' : '' ?>><?php if (isset($errors['name'])): ?><span class="err" id="catName-err"><?= icon('alert') ?> <?= e(t($errors['name'] === 'exists' ? 'admin.nameExists' : 'admin.errRequired')) ?></span><?php endif ?></div>
      <div class="form-grid two">
        <div class="field"><label for="catNameRu"><?= e(t('admin.nameRu')) ?></label><input id="catNameRu" name="nameRu" maxlength="80" value="<?= e($o('nameRu')) ?>"></div>
        <div class="field"><label for="catNameEn"><?= e(t('admin.nameEn')) ?></label><input id="catNameEn" name="nameEn" maxlength="80" value="<?= e($o('nameEn')) ?>"></div>
      </div>
      <div class="field"><label for="catDesc"><?= e(t('admin.description')) ?> (UA)</label><textarea id="catDesc" name="description" rows="2" maxlength="300"><?= e($o('description')) ?></textarea></div>
      <div class="form-grid two">
        <div class="field"><label for="catDescRu"><?= e(t('admin.descRu')) ?></label><textarea id="catDescRu" name="descRu" rows="2" maxlength="300"><?= e($o('descRu')) ?></textarea></div>
        <div class="field"><label for="catDescEn"><?= e(t('admin.descEn')) ?></label><textarea id="catDescEn" name="descEn" rows="2" maxlength="300"><?= e($o('descEn')) ?></textarea></div>
      </div>
      <div class="field"><label for="catColor"><?= e(t('admin.color')) ?></label><input id="catColor" type="color" name="color" value="<?= e(preg_match('/^#[0-9a-f]{6}$/i', $o('color')) ? $o('color') : '#e11d74') ?>"></div>
      <div class="a-form-actions">
        <button class="btn" type="submit"><?= icon('check') ?> <?= e(t('admin.saveCategory')) ?></button>
        <button class="btn btn-ghost" type="button" id="catReset"<?= $o('id') !== '' ? '' : ' hidden' ?>><?= e(t('admin.cancel')) ?></button>
      </div>
    </form>
  </section>
</div>
