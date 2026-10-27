<?php
/** @var ?array $product @var list $categories @var list $brands @var array $old @var array $errors @var string $back */
use Onika\I18n;

$isNew = $product === null;
$p = $product ?? ['id' => '', 'name' => '', 'slug' => '', 'price' => '', 'oldPrice' => null, 'category' => '', 'brand' => null, 'description' => '', 'images' => [], 'sizes' => [], 'sku' => '', 'stock' => 1, 'inStock' => true, 'featured' => false, 'active' => true, 'translations' => [], 'views' => 0, 'createdAt' => null, 'updatedAt' => null];
$tr = $p['translations'];
$brandNames = array_column($brands, 'name');
$old = $old ?? [];
$errors = $errors ?? [];
// After a failed save the form shows exactly what was typed, not the stored product.
$v = static fn(string $k, mixed $def): mixed => array_key_exists($k, $old) ? $old[$k] : $def;
$name = (string) $v('name', $p['name']);
$category = (string) $v('category', $p['category']);
$brand = (string) $v('brand', (string) $p['brand']);
$images = (array) $v('images', $p['images']);
$msg = ['name' => t('admin.errRequired'), 'price' => t('admin.errPrice'), 'stock' => t('admin.errStock'), 'slug' => t('admin.errSlug')];
$fieldCls = static fn(string $k): string => 'field' . (isset($errors[$k]) ? ' has-error' : '');
$errAttr = static fn(string $k, string $id): string => isset($errors[$k]) ? ' aria-invalid="true" aria-describedby="' . $id . '-err"' : '';
$errMsg = static fn(string $k, string $id): string => isset($errors[$k]) ? '<span class="err" id="' . $id . '-err">' . icon('alert') . ' ' . e($msg[$k] ?? t('admin.formInvalid')) . '</span>' : '';
?>
<a href="<?= e($back) ?>" class="a-link a-back"><?= icon('arrowLeft') ?> <?= e(t('admin.backToList')) ?></a>
<form method="post" action="<?= e(purl('/admin/products/save')) ?>" enctype="multipart/form-data" class="a-form-layout" id="productForm"<?= $errors ? ' data-has-errors' : '' ?>>
  <?= csrf_field() ?>
  <input type="hidden" name="id" value="<?= e($p['id']) ?>">
  <div class="a-form-main">
    <section class="a-card">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('tag') ?></span><?= e(t('admin.generalInfo')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="<?= $fieldCls('name') ?>"><label for="f-name"><?= e(t('admin.productName')) ?> (UA) <span class="req">*</span></label>
          <input id="f-name" name="name" required maxlength="200" value="<?= e($name) ?>" placeholder="<?= e(t('admin.productNamePlaceholder')) ?>"<?= $errAttr('name', 'f-name') ?>><?= $errMsg('name', 'f-name') ?></div>
        <div class="form-grid two">
          <div class="<?= $fieldCls('price') ?>"><label for="f-price"><?= e(t('admin.price')) ?>, ₴ <span class="req">*</span></label>
            <input id="f-price" type="number" step="0.01" min="0" name="price" required inputmode="decimal" value="<?= e((string) $v('price', $p['price'])) ?>"<?= $errAttr('price', 'f-price') ?>><?= $errMsg('price', 'f-price') ?></div>
          <div class="field"><label for="f-old"><?= e(t('admin.oldPrice')) ?></label>
            <input id="f-old" type="number" step="0.01" min="0" name="oldPrice" inputmode="decimal" value="<?= e((string) $v('oldPrice', (string) $p['oldPrice'])) ?>"><span class="hint"><?= e(t('admin.oldPriceHint')) ?></span></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="f-cat"><?= e(t('admin.category')) ?></label>
            <select id="f-cat" name="category">
              <?php foreach ($categories as $c): ?><option value="<?= e($c['name']) ?>" <?= $category === $c['name'] ? 'selected' : '' ?>><?= e(I18n::categoryLabel($c)) ?></option><?php endforeach ?>
              <?php if ($category !== '' && !in_array($category, array_column($categories, 'name'), true)): ?><option value="<?= e($category) ?>" selected><?= e($category) ?></option><?php endif ?>
            </select></div>
          <div class="field"><label for="f-brand"><?= e(t('admin.brand')) ?></label>
            <select id="f-brand" name="brand"><option value="">—</option>
              <?php foreach ($brandNames as $b): ?><option value="<?= e($b) ?>" <?= $brand === $b ? 'selected' : '' ?>><?= e($b) ?></option><?php endforeach ?>
              <?php if ($brand !== '' && !in_array($brand, $brandNames, true)): ?><option value="<?= e($brand) ?>" selected><?= e($brand) ?></option><?php endif ?>
            </select>
            <input name="brandNew" value="<?= e((string) $v('brandNew', '')) ?>" placeholder="<?= e(t('admin.brandNewPlaceholder')) ?>" class="a-mt8" aria-label="<?= e(t('admin.brandNewPlaceholder')) ?>" maxlength="80"><span class="hint"><?= e(t('admin.brandNewHint')) ?></span></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="f-sku"><?= e(t('admin.sku')) ?></label><input id="f-sku" name="sku" maxlength="60" value="<?= e((string) $v('sku', (string) $p['sku'])) ?>"></div>
          <div class="field"><label for="f-sizes"><?= e(t('admin.sizes')) ?></label><input id="f-sizes" name="sizes" value="<?= e((string) $v('sizes', implode(', ', $p['sizes']))) ?>" placeholder="S, M, L" aria-describedby="f-sizes-hint"><span class="hint" id="f-sizes-hint"><?= e(t('admin.sizesHint')) ?></span></div>
        </div>
        <div class="field"><label for="f-desc"><?= e(t('admin.description')) ?> (UA)</label>
          <textarea id="f-desc" name="description" rows="6" maxlength="5000" placeholder="<?= e(t('admin.descriptionPlaceholder')) ?>"><?= e((string) $v('description', $p['description'])) ?></textarea></div>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('image') ?></span><?= e(t('admin.images')) ?> <span class="a-head-count" id="imgCount"><?= count($images) ?></span></h2></div>
      <div class="a-card-body">
        <div class="a-drop" id="dropZone" tabindex="0" role="button" aria-label="<?= e(t('admin.dropFiles')) ?>. <?= e(t('admin.dropHint')) ?>">
          <span class="a-drop-ic"><?= icon('upload') ?></span>
          <b><?= e(t('admin.dropFiles')) ?></b>
          <span class="muted small"><?= e(t('admin.dropHint')) ?></span>
          <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
        </div>
        <div class="a-images" id="imgList" data-empty="<?= e(t('admin.noImages')) ?>" aria-label="<?= e(t('admin.images')) ?>"><?php foreach ($images as $src): ?><div class="a-img" draggable="true" data-src="<?= e((string) $src) ?>" tabindex="0">
              <img src="<?= e(media((string) $src, 300)) ?>" alt="" width="120" height="150">
              <input type="hidden" name="images[]" value="<?= e((string) $src) ?>">
              <span class="a-img-grip" aria-hidden="true"><?= icon('grip') ?></span>
              <button type="button" class="a-img-del" data-remove-img aria-label="<?= e(t('common.remove')) ?>" title="<?= e(t('common.remove')) ?>"><?= icon('x') ?></button>
              <span class="a-img-tools"><button type="button" data-move="-1" aria-label="<?= e(t('admin.moveLeft')) ?>" title="<?= e(t('admin.moveLeft')) ?>"><?= icon('chevronLeft') ?></button><button type="button" data-make-main aria-label="<?= e(t('admin.makeMain')) ?>" title="<?= e(t('admin.makeMain')) ?>"><?= icon('star') ?></button><button type="button" data-move="1" aria-label="<?= e(t('admin.moveRight')) ?>" title="<?= e(t('admin.moveRight')) ?>"><?= icon('chevronRight') ?></button></span>
            </div><?php endforeach ?></div>
        <p class="hint a-mt10"><?= icon('info') ?> <?= e(t('admin.imagesOrderHint')) ?> <?= e(t('admin.imagesKeysHint')) ?></p>
        <details class="a-details"><summary><?= e(t('admin.imageUrl')) ?></summary>
          <div class="field"><textarea name="imageUrls" rows="3" placeholder="https://…" aria-label="<?= e(t('admin.imageUrl')) ?>"></textarea></div></details>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('globe') ?></span><?= e(t('admin.translations')) ?></h2>
        <button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn" data-src-name="f-name" data-src-desc="f-desc" data-dst="nameRu,descRu,nameEn,descEn"><?= icon('sparkle') ?> <?= e(t('admin.translateSuggest')) ?></button></div>
      <div class="a-card-body form-grid">
        <p class="small muted a-m0"><?= e(t('admin.translationsHint')) ?>. <?= e(t('admin.translateSuggestHint')) ?>.</p>
        <div class="form-grid two">
          <div class="field"><label for="nameRu"><?= e(t('admin.nameRu')) ?></label><input id="nameRu" name="nameRu" maxlength="200" value="<?= e((string) $v('nameRu', $tr['ru']['name'] ?? '')) ?>"></div>
          <div class="field"><label for="nameEn"><?= e(t('admin.nameEn')) ?></label><input id="nameEn" name="nameEn" maxlength="200" value="<?= e((string) $v('nameEn', $tr['en']['name'] ?? '')) ?>"></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="descRu"><?= e(t('admin.descRu')) ?></label><textarea id="descRu" name="descRu" rows="4" maxlength="5000"><?= e((string) $v('descRu', $tr['ru']['description'] ?? '')) ?></textarea></div>
          <div class="field"><label for="descEn"><?= e(t('admin.descEn')) ?></label><textarea id="descEn" name="descEn" rows="4" maxlength="5000"><?= e((string) $v('descEn', $tr['en']['description'] ?? '')) ?></textarea></div>
        </div>
      </div>
    </section>
  </div>

  <aside class="a-form-side">
    <section class="a-card a-sticky">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('send') ?></span><?= e(t('admin.publish')) ?></h2></div>
      <div class="a-card-body form-grid a-gap14">
        <label class="switch"><input type="checkbox" name="active" <?= $v('active', (bool) $p['active']) ? 'checked' : '' ?>><span class="track"></span><?= e(t('admin.published')) ?></label>
        <?php $stockVal = (string) $v('stock', (string) (int) $p['stock']); ?>
        <div class="<?= $fieldCls('stock') ?>"><label for="f-stock"><?= e(t('admin.stockQty')) ?></label>
          <div class="stock-field"><input id="f-stock" name="stock" type="number" min="0" max="99999" step="1" inputmode="numeric" value="<?= e($stockVal) ?>" required class="<?= $stockVal === '0' ? 'is-zero' : '' ?>" aria-describedby="f-stock-hint<?= isset($errors['stock']) ? ' f-stock-err' : '' ?>"<?= isset($errors['stock']) ? ' aria-invalid="true"' : '' ?>><span class="muted"><?= e(t('admin.pcs')) ?></span></div>
          <?= $errMsg('stock', 'f-stock') ?><span class="hint" id="f-stock-hint"><?= e(t('admin.stockHint')) ?></span></div>
        <label class="switch"><input type="checkbox" name="featured" <?= $v('featured', (bool) $p['featured']) ? 'checked' : '' ?>><span class="track"></span><?= e(t('admin.showHome')) ?></label>
        <?php if (!$isNew): ?>
          <div class="<?= $fieldCls('slug') ?>"><label for="f-slug">URL</label><input id="f-slug" name="slug" value="<?= e((string) $v('slug', $p['slug'])) ?>" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="a-z, 0-9, -" maxlength="120" spellcheck="false" aria-describedby="f-slug-hint<?= isset($errors['slug']) ? ' f-slug-err' : '' ?>"<?= isset($errors['slug']) ? ' aria-invalid="true"' : '' ?>><?= $errMsg('slug', 'f-slug') ?><span class="hint" id="f-slug-hint"><?= e(t('admin.slugHint')) ?></span></div>
        <?php endif ?>
        <button class="btn btn-block" type="submit"><?= icon('check') ?> <?= e(t('admin.saveProduct')) ?></button>
        <a href="<?= e($back) ?>" class="btn btn-ghost btn-block"><?= e(t('admin.cancel')) ?></a>
        <?php if (!$isNew): ?>
          <a class="btn btn-ghost btn-block" href="<?= e(url('/product/' . rawurlencode($p['slug']))) ?>" target="_blank" rel="noopener"><?= icon('external') ?> <?= e(t('admin.viewOnSite')) ?></a>
          <dl class="a-meta"><div><dt><?= e(t('admin.created')) ?></dt><dd><?= e(dt($p['createdAt'], true)) ?></dd></div><div><dt><?= e(t('admin.views')) ?></dt><dd><?= (int) $p['views'] ?></dd></div></dl>
        <?php endif ?>
      </div>
    </section>
  </aside>
</form>
