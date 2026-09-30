<?php
/**
 * @var array $f @var array $result @var string $basePath @var array $linkQuery @var ?array $cat @var ?array $singleCat
 * @var array $categories @var array $brands @var array $priceRange @var string $title @var string $subtitle @var array $crumbs
 */
use Onika\I18n;
?>
<section class="page-head">
  <div class="container">
    <nav class="breadcrumbs" aria-label="breadcrumbs">
      <?php foreach ($crumbs as $i => $c): ?>
        <?php if ($i): ?><?= icon('chevronRight') ?><?php endif ?>
        <?php if ($c['url']): ?><a href="<?= e($c['url']) ?>"><?= e($c['label']) ?></a><?php else: ?><span><?= e($c['label']) ?></span><?php endif ?>
      <?php endforeach ?>
    </nav>
    <h1 id="catalogTitle"><?= e($title) ?></h1>
    <p><?= e($subtitle) ?></p>
  </div>
</section>

<div class="container catalog">
  <aside class="filters" id="filters" aria-label="<?= e(t('catalog.filters')) ?>">
    <div class="sheet-head"><h3><?= icon('sliders') ?> <?= e(t('catalog.filters')) ?></h3><button type="button" class="icon-btn" id="filtersClose" aria-label="<?= e(t('common.close')) ?>"><?= icon('x') ?></button></div>
    <form method="get" action="<?= e(url('/catalog')) ?>" id="filterForm" class="filter-card">
      <div class="filter-group">
        <h4><?= e(t('common.search')) ?></h4>
        <div class="hsearch-field" style="height:48px">
          <?= icon('search') ?>
          <input type="search" name="q" value="<?= e($f['q']) ?>" placeholder="<?= e(t('catalog.searchPlaceholder')) ?>" aria-label="<?= e(t('common.search')) ?>">
        </div>
      </div>
      <div class="filter-group">
        <h4><?= e(t('catalog.categories')) ?></h4>
        <div class="f-options">
          <?php foreach ($categories as $c): ?>
            <label class="check">
              <input type="checkbox" name="category[]" value="<?= e($c['name']) ?>" <?= in_array($c['name'], $f['category'], true) ? 'checked' : '' ?>>
              <span class="box"><?= icon('check') ?></span><span><?= e(I18n::categoryLabel($c)) ?></span><span class="cnt"><?= (int) $c['count'] ?></span>
            </label>
          <?php endforeach ?>
        </div>
      </div>
      <?php if ($brands): ?>
      <div class="filter-group">
        <h4><?= e(t('catalog.brands')) ?></h4>
        <div class="f-options">
          <?php foreach ($brands as $b): ?>
            <label class="check">
              <input type="checkbox" name="brand[]" value="<?= e($b['name']) ?>" <?= in_array($b['name'], $f['brand'], true) ? 'checked' : '' ?>>
              <span class="box"><?= icon('check') ?></span><span><?= e($b['name']) ?></span><span class="cnt"><?= (int) $b['count'] ?></span>
            </label>
          <?php endforeach ?>
        </div>
      </div>
      <?php endif ?>
      <div class="filter-group">
        <h4><?= e(t('catalog.price')) ?></h4>
        <div class="price-row">
          <input type="number" name="min" inputmode="numeric" min="0" placeholder="<?= e(t('catalog.from')) ?> <?= (int) $priceRange['min'] ?>" value="<?= e($f['min']) ?>" aria-label="<?= e(t('catalog.from')) ?>">
          <span>—</span>
          <input type="number" name="max" inputmode="numeric" min="0" placeholder="<?= e(t('catalog.to')) ?> <?= (int) $priceRange['max'] ?>" value="<?= e($f['max']) ?>" aria-label="<?= e(t('catalog.to')) ?>">
        </div>
      </div>
      <div class="filter-group">
        <label class="switch"><input type="checkbox" name="in_stock" value="1" <?= $f['in_stock'] ? 'checked' : '' ?>><span class="track"></span><?= e(t('catalog.onlyInStock')) ?></label>
      </div>
      <?php if ($f['featured']): ?><input type="hidden" name="featured" value="1"><?php endif ?>
      <div class="filter-actions">
        <button type="submit" class="btn btn-block" id="filterApply"><?= e(t('catalog.apply')) ?></button>
        <a href="<?= e(url('/catalog')) ?>" class="btn btn-ghost btn-block"><?= e(t('catalog.clear')) ?></a>
      </div>
    </form>
  </aside>

  <div class="catalog-main" id="catalogMain" data-base="<?= e(url($basePath)) ?>">
    <?= view('shop/_catalog_main', get_defined_vars()) ?>
  </div>
</div>
<div class="overlay" id="filtersOverlay"></div>
