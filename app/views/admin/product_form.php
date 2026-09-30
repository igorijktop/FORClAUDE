<?php
/** @var ?array $product @var list $categories @var list $brands */
use Onika\I18n;

$isNew = $product === null;
$p = $product ?? ['id' => '', 'name' => '', 'slug' => '', 'price' => '', 'oldPrice' => null, 'category' => '', 'brand' => null, 'description' => '', 'images' => [], 'sizes' => [], 'sku' => '', 'inStock' => true, 'featured' => false, 'active' => true, 'translations' => [], 'views' => 0, 'createdAt' => null, 'updatedAt' => null];
$tr = $p['translations'];
$brandNames = array_column($brands, 'name');
?>
<form method="post" action="<?= e(purl('/admin/products/save')) ?>" enctype="multipart/form-data" class="a-form-layout" id="productForm">
  <?= csrf_field() ?>
  <input type="hidden" name="id" value="<?= e($p['id']) ?>">
  <div class="a-form-main">
    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.generalInfo')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="field"><label for="f-name"><?= e(t('admin.productName')) ?> (UA) <span class="req">*</span></label>
          <input id="f-name" name="name" required maxlength="200" value="<?= e($p['name']) ?>" placeholder="<?= e(t('admin.productNamePlaceholder')) ?>"></div>
        <div class="form-grid two">
          <div class="field"><label for="f-price"><?= e(t('admin.price')) ?>, ₴ <span class="req">*</span></label>
            <input id="f-price" type="number" step="0.01" min="0" name="price" required value="<?= e($p['price']) ?>"></div>
          <div class="field"><label for="f-old"><?= e(t('admin.oldPrice')) ?></label>
            <input id="f-old" type="number" step="0.01" min="0" name="oldPrice" value="<?= e($p['oldPrice']) ?>"><span class="hint"><?= e(t('admin.oldPriceHint')) ?></span></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="f-cat"><?= e(t('admin.category')) ?></label>
            <select id="f-cat" name="category">
              <?php foreach ($categories as $c): ?><option value="<?= e($c['name']) ?>" <?= $p['category'] === $c['name'] ? 'selected' : '' ?>><?= e(I18n::categoryLabel($c)) ?></option><?php endforeach ?>
              <?php if ($p['category'] !== '' && !in_array($p['category'], array_column($categories, 'name'), true)): ?><option value="<?= e($p['category']) ?>" selected><?= e($p['category']) ?></option><?php endif ?>
            </select></div>
          <div class="field"><label for="f-brand"><?= e(t('admin.brand')) ?></label>
            <select id="f-brand" name="brand"><option value="">—</option>
              <?php foreach ($brandNames as $b): ?><option value="<?= e($b) ?>" <?= $p['brand'] === $b ? 'selected' : '' ?>><?= e($b) ?></option><?php endforeach ?>
              <?php if ($p['brand'] && !in_array($p['brand'], $brandNames, true)): ?><option value="<?= e($p['brand']) ?>" selected><?= e($p['brand']) ?></option><?php endif ?>
            </select>
            <input name="brandNew" placeholder="<?= e(t('admin.brandNewPlaceholder')) ?>" style="margin-top:8px" aria-label="<?= e(t('admin.brandNewPlaceholder')) ?>"><span class="hint"><?= e(t('admin.brandNewHint')) ?></span></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="f-sku"><?= e(t('admin.sku')) ?></label><input id="f-sku" name="sku" maxlength="60" value="<?= e($p['sku']) ?>"></div>
          <div class="field"><label for="f-sizes"><?= e(t('admin.sizes')) ?></label><input id="f-sizes" name="sizes" value="<?= e(implode(', ', $p['sizes'])) ?>" placeholder="S, M, L"><span class="hint"><?= e(t('admin.sizesHint')) ?></span></div>
        </div>
        <div class="field"><label for="f-desc"><?= e(t('admin.description')) ?> (UA)</label>
          <textarea id="f-desc" name="description" rows="6" maxlength="5000" placeholder="<?= e(t('admin.descriptionPlaceholder')) ?>"><?= e($p['description']) ?></textarea></div>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.images')) ?></h2></div>
      <div class="a-card-body">
        <div class="a-drop" id="dropZone" tabindex="0" role="button" aria-label="<?= e(t('admin.dropFiles')) ?>">
          <?= icon('upload') ?>
          <b><?= e(t('admin.dropFiles')) ?></b>
          <span class="muted small"><?= e(t('admin.dropHint')) ?></span>
          <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
        </div>
        <div class="a-images" id="imgList" data-empty="<?= e(t('admin.noImages')) ?>">
          <?php foreach ($p['images'] as $src): ?>
            <div class="a-img" draggable="true" data-src="<?= e($src) ?>">
              <img src="<?= e(media($src, 300)) ?>" alt="" width="120" height="150">
              <input type="hidden" name="images[]" value="<?= e($src) ?>">
              <span class="a-img-grip"><?= icon('grip') ?></span>
              <button type="button" class="a-img-del" data-remove-img aria-label="<?= e(t('common.remove')) ?>"><?= icon('x') ?></button>
            </div>
          <?php endforeach ?>
        </div>
        <p class="hint" style="margin-top:10px"><?= e(t('admin.imagesOrderHint')) ?></p>
        <details class="a-details"><summary><?= e(t('admin.imageUrl')) ?></summary>
          <div class="field"><textarea name="imageUrls" rows="3" placeholder="https://…"></textarea></div></details>
      </div>
    </section>

    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.translations')) ?></h2>
        <button type="button" class="btn btn-ghost btn-sm" id="translateSuggestBtn" data-src-name="f-name" data-src-desc="f-desc" data-dst="nameRu,descRu,nameEn,descEn"><?= icon('globe') ?> <?= e(t('admin.translateSuggest')) ?></button></div>
      <div class="a-card-body form-grid">
        <p class="small muted" style="margin:0"><?= e(t('admin.translationsHint')) ?>. <?= e(t('admin.translateSuggestHint')) ?>.</p>
        <div class="form-grid two">
          <div class="field"><label for="nameRu"><?= e(t('admin.nameRu')) ?></label><input id="nameRu" name="nameRu" value="<?= e($tr['ru']['name'] ?? '') ?>"></div>
          <div class="field"><label for="nameEn"><?= e(t('admin.nameEn')) ?></label><input id="nameEn" name="nameEn" value="<?= e($tr['en']['name'] ?? '') ?>"></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label for="descRu"><?= e(t('admin.descRu')) ?></label><textarea id="descRu" name="descRu" rows="4"><?= e($tr['ru']['description'] ?? '') ?></textarea></div>
          <div class="field"><label for="descEn"><?= e(t('admin.descEn')) ?></label><textarea id="descEn" name="descEn" rows="4"><?= e($tr['en']['description'] ?? '') ?></textarea></div>
        </div>
      </div>
    </section>
  </div>

  <aside class="a-form-side">
    <section class="a-card a-sticky">
      <div class="a-card-head"><h2><?= e(t('admin.publish')) ?></h2></div>
      <div class="a-card-body form-grid" style="gap:14px">
        <label class="switch"><input type="checkbox" name="active" <?= $p['active'] ? 'checked' : '' ?>><span class="track"></span><?= e(t('admin.published')) ?></label>
        <label class="switch"><input type="checkbox" name="inStock" <?= $p['inStock'] ? 'checked' : '' ?>><span class="track"></span><?= e(t('admin.inStock')) ?></label>
        <label class="switch"><input type="checkbox" name="featured" <?= $p['featured'] ? 'checked' : '' ?>><span class="track"></span><?= e(t('admin.showHome')) ?></label>
        <?php if (!$isNew): ?>
          <div class="field"><label for="f-slug">URL</label><input id="f-slug" name="slug" value="<?= e($p['slug']) ?>" pattern="[a-z0-9\-]+" title="a-z, 0-9, -"><span class="hint"><?= e(t('admin.slugHint')) ?></span></div>
        <?php endif ?>
        <button class="btn btn-block" type="submit"><?= icon('check') ?> <?= e(t('admin.saveProduct')) ?></button>
        <a href="<?= e(purl('/admin/products')) ?>" class="btn btn-ghost btn-block"><?= e(t('admin.cancel')) ?></a>
        <?php if (!$isNew): ?>
          <a class="btn btn-ghost btn-block" href="<?= e(url('/product/' . rawurlencode($p['slug']))) ?>" target="_blank" rel="noopener"><?= icon('external') ?> <?= e(t('admin.viewOnSite')) ?></a>
          <div class="small muted"><?= e(t('admin.created')) ?>: <?= e(dt($p['createdAt'], true)) ?><br><?= e(t('admin.views')) ?>: <?= (int) $p['views'] ?></div>
        <?php endif ?>
      </div>
    </section>
  </aside>
</form>
