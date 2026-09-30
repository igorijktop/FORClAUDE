<?php
/** @var array $f @var array $result @var string $basePath @var array $linkQuery @var ?array $cat @var array $categories */
use Onika\I18n;

// Full filter state → chip removal URLs.
$state = [
    'q' => $f['q'], 'category' => $f['category'], 'brand' => $f['brand'], 'min' => $f['min'], 'max' => $f['max'],
    'in_stock' => $f['in_stock'] ?: '', 'featured' => $f['featured'] ?: '', 'sort' => $f['sort'] !== 'new' ? $f['sort'] : '',
];
$without = static function (string $key, ?string $val = null) use ($state): string {
    $s = $state;
    if ($val !== null && is_array($s[$key])) {
        $s[$key] = array_values(array_diff($s[$key], [$val]));
    } else {
        $s[$key] = '';
        if ($key === 'min') { $s['max'] = $s['max']; }
    }
    $qs = query_string($s);
    return url('/catalog') . ($qs !== '' ? '?' . $qs : '');
};
$catByName = [];
foreach ($categories as $c) {
    $catByName[$c['name']] = $c;
}
$chips = [];
foreach ($f['category'] as $c) {
    $chips[] = [isset($catByName[$c]) ? I18n::categoryLabel($catByName[$c]) : I18n::categoryName($c), $without('category', $c)];
}
foreach ($f['brand'] as $b) {
    $chips[] = [$b, $without('brand', $b)];
}
if ($f['q'] !== '') { $chips[] = ['«' . $f['q'] . '»', $without('q')]; }
if ($f['min'] !== '') { $chips[] = [t('catalog.from') . ' ' . money((float) $f['min']), $without('min')]; }
if ($f['max'] !== '') { $chips[] = [t('catalog.to') . ' ' . money((float) $f['max']), $without('max')]; }
if ($f['in_stock']) { $chips[] = [t('catalog.onlyInStock'), $without('in_stock')]; }
if ($f['featured']) { $chips[] = [t('nav.new'), $without('featured')]; }
?>
<div class="catalog-toolbar">
  <div class="count-badge"><?= icon('grid') ?> <span><b id="resultCount"><?= (int) $result['total'] ?></b> <?= e(tn('common.products', $result['total'])) ?></span></div>
  <div class="toolbar-right">
    <button type="button" class="btn btn-ghost btn-sm filter-fab" id="filterToggle"><?= icon('sliders') ?> <?= e(t('catalog.filters')) ?><?php if ($chips): ?> <span class="badge"><?= count($chips) ?></span><?php endif ?></button>
    <select class="select-sm" name="sort" form="filterForm" id="sortSelect" aria-label="<?= e(t('sort.label')) ?>">
      <?php foreach (['new' => 'sort.new', 'popular' => 'sort.popular', 'price-asc' => 'sort.priceAsc', 'price-desc' => 'sort.priceDesc', 'name' => 'sort.name'] as $k => $lbl): ?>
        <option value="<?= $k ?>" <?= $f['sort'] === $k ? 'selected' : '' ?>><?= e(t($lbl)) ?></option>
      <?php endforeach ?>
    </select>
  </div>
</div>

<?php if ($chips): ?>
<div class="active-chips">
  <?php foreach ($chips as [$label, $href]): ?>
    <a class="chip" href="<?= e($href) ?>"><?= e($label) ?> <?= icon('x') ?></a>
  <?php endforeach ?>
  <a class="chip chip-clear" href="<?= e(url('/catalog')) ?>"><?= e(t('catalog.resetAll')) ?> <?= icon('x') ?></a>
</div>
<?php endif ?>

<?php if ($result['items']): ?>
  <div class="grid-products" id="productGrid">
    <?php foreach ($result['items'] as $p): ?><?= view('shop/_card', ['p' => $p]) ?><?php endforeach ?>
  </div>
  <?php if ($result['page'] < $result['pages']): ?>
    <div class="load-more-wrap" id="loadMoreWrap">
      <button type="button" class="btn btn-ghost btn-lg" id="loadMoreBtn" data-page="<?= (int) $result['page'] ?>" data-pages="<?= (int) $result['pages'] ?>"><?= e(t('catalog.loadMore')) ?></button>
    </div>
  <?php endif ?>
  <?= view('partials/pagination', ['page' => $result['page'], 'pages' => $result['pages'], 'base' => url($basePath), 'query' => $linkQuery]) ?>
<?php else: ?>
  <div class="empty-state card">
    <?= icon('search') ?>
    <h3><?= e(t('catalog.nothing')) ?></h3>
    <p><?= e(t('catalog.nothingText')) ?></p>
    <a href="<?= e(url('/catalog')) ?>" class="btn"><?= e(t('catalog.resetFilters')) ?></a>
  </div>
<?php endif ?>
