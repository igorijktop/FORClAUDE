<?php
/**
 * @var array $settings @var array $product @var string $name @var string $description @var array $related
 * @var string $catUrl @var string $catLabel @var string $shareUrl
 */
use Onika\I18n;

$images = $product['images'] ?: [null];
$sale = $product['oldPrice'] && $product['oldPrice'] > $product['price'];
$off = $sale ? (int) round((1 - $product['price'] / $product['oldPrice']) * 100) : 0;
$free = money($settings['freeShippingFrom'] ?: 5000);
$data = [
    'id' => $product['id'], 'name' => $name, 'price' => $product['price'], 'oldPrice' => $product['oldPrice'],
    'image' => media($images[0], 300), 'url' => url('/product/' . $product['slug']), 'brand' => $product['brand'],
    'inStock' => $product['inStock'], 'sizes' => $product['sizes'],
];
$big = array_map(static fn($s) => media($s, 1400), $images);
?>
<div class="container product-page">
  <nav class="breadcrumbs" aria-label="breadcrumbs">
    <a href="<?= e(url('/')) ?>"><?= e(t('nav.home')) ?></a><?= icon('chevronRight') ?>
    <a href="<?= e(url('/catalog')) ?>"><?= e(t('nav.catalog')) ?></a><?= icon('chevronRight') ?>
    <a href="<?= e($catUrl) ?>"><?= e($catLabel) ?></a><?= icon('chevronRight') ?>
    <span><?= e($name) ?></span>
  </nav>

  <div class="product-top">
    <div class="gallery" id="gallery" data-images="<?= json_attr($big) ?>">
      <?php if (count($images) > 1): ?>
      <div class="gallery-thumbs" id="galleryThumbs">
        <?php foreach ($images as $i => $src): ?>
          <button type="button" class="gthumb<?= $i === 0 ? ' on' : '' ?>" data-index="<?= $i ?>" aria-label="<?= e($name) ?> #<?= $i + 1 ?>"><img src="<?= e(media($src, 200)) ?>" alt="" loading="lazy" width="78" height="104"></button>
        <?php endforeach ?>
      </div>
      <?php endif ?>
      <div class="gallery-main" id="galleryMain" role="button" tabindex="0" aria-label="<?= e(t('product.zoom')) ?>">
        <img id="galleryImg" src="<?= e(media($images[0], 1000)) ?>" srcset="<?= e(media_srcset($images[0], [600, 800, 1000, 1400])) ?>" sizes="(max-width: 899px) 100vw, 46vw" alt="<?= e($name) ?>" width="800" height="1000" fetchpriority="high">
        <?php if (count($images) > 1): ?>
          <button type="button" class="gallery-nav prev" id="galPrev" aria-label="prev"><?= icon('chevronLeft') ?></button>
          <button type="button" class="gallery-nav next" id="galNext" aria-label="next"><?= icon('chevronRight') ?></button>
        <?php endif ?>
        <span class="zoom-hint"><?= icon('search') ?> <?= e(t('product.zoom')) ?></span>
      </div>
    </div>

    <div class="product-info">
      <?php if ($product['brand']): ?><a class="eyebrow" href="<?= e(url('/catalog?' . query_string(['brand' => [$product['brand']]]))) ?>"><?= e($product['brand']) ?></a><?php else: ?><span class="eyebrow"><?= e($catLabel) ?></span><?php endif ?>
      <h1><?= e($name) ?></h1>
      <div class="pi-row">
        <span class="pi-stock <?= $product['inStock'] ? 'in' : 'out' ?>"><span class="dot"></span><?= e($product['inStock'] ? t('common.inStock') : t('common.notAvailable')) ?></span>
        <?php if ($sale): ?><span class="badge sale">−<?= $off ?>%</span><?php endif ?>
        <?php if ($product['sku']): ?><span class="small muted"><?= e(t('product.article')) ?>: <?= e($product['sku']) ?></span><?php endif ?>
      </div>

      <div class="pi-price">
        <b><?= e(money($product['price'])) ?></b>
        <?php if ($sale): ?><s><?= e(money($product['oldPrice'])) ?></s><?php endif ?>
      </div>

      <?php if ($product['sizes']): ?>
      <div class="pi-opt" id="sizeBox">
        <div class="lbl"><span><?= e(t('product.size')) ?></span><span class="muted" id="sizeErr" hidden><?= e(t('product.chooseSize')) ?></span></div>
        <div class="size-opts" role="radiogroup" aria-label="<?= e(t('product.size')) ?>">
          <?php foreach ($product['sizes'] as $s): ?>
            <label class="size-opt"><input type="radio" name="size" value="<?= e($s) ?>"><span><?= e($s) ?></span></label>
          <?php endforeach ?>
        </div>
      </div>
      <?php endif ?>

      <div class="pi-opt">
        <div class="lbl"><span><?= e(t('product.qty')) ?></span></div>
        <div class="qty">
          <button type="button" data-qminus aria-label="−"><?= icon('minus') ?></button>
          <input type="number" id="qtyInput" value="1" min="1" max="99" inputmode="numeric" aria-label="<?= e(t('product.qty')) ?>">
          <button type="button" data-qplus aria-label="+"><?= icon('plus') ?></button>
        </div>
      </div>

      <div class="buy-row" id="buyRow">
        <button class="btn btn-lg" id="addToCartBtn" type="button" <?= $product['inStock'] ? '' : 'disabled' ?>>
          <?= $product['inStock'] ? icon('bag') . ' ' . e(t('product.add')) : e(t('common.notAvailable')) ?>
        </button>
        <button class="btn btn-ghost btn-lg" type="button" data-fav="<?= e($product['id']) ?>" data-fav-big aria-pressed="false"><?= icon('heart') ?> <span><?= e(t('common.fav')) ?></span></button>
      </div>

      <div class="pi-meta">
        <div><?= icon('truck') ?><span><?= e(t('product.deliveryText', ['amount' => $free])) ?></span></div>
        <div><?= icon('return') ?><span><?= e(t('product.returnText')) ?></span></div>
        <div><?= icon('shield') ?><span><?= e(t('product.origText')) ?></span></div>
      </div>

      <div class="accordion">
        <div class="acc-item open">
          <button class="acc-head" type="button" aria-expanded="true"><?= e(t('product.desc')) ?> <?= icon('plus') ?></button>
          <div class="acc-body"><div class="acc-body-inner"><?= text_html($description !== '' ? $description : t('product.descFallback')) ?></div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head" type="button" aria-expanded="false"><?= e(t('product.shipping')) ?> <?= icon('plus') ?></button>
          <div class="acc-body"><div class="acc-body-inner"><?= text_html(t('product.shippingBody', ['amount' => $free])) ?></div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head" type="button" aria-expanded="false"><?= e(t('product.returns')) ?> <?= icon('plus') ?></button>
          <div class="acc-body"><div class="acc-body-inner"><?= text_html(t('product.returnsBody')) ?></div></div>
        </div>
      </div>

      <div class="share-row">
        <span><?= e(t('product.share')) ?>:</span>
        <button type="button" class="icon-btn" id="shareBtn" data-url="<?= e($shareUrl) ?>" data-title="<?= e($name) ?>" aria-label="<?= e(t('product.share')) ?>"><?= icon('share') ?></button>
        <button type="button" class="icon-btn" id="copyBtn" data-url="<?= e($shareUrl) ?>" aria-label="<?= e(t('product.copyLink')) ?>"><?= icon('copy') ?></button>
      </div>
    </div>
  </div>
</div>

<div class="buybar" id="buybar" aria-hidden="true">
  <div class="bb-price"><?= e(money($product['price'])) ?><?php if ($sale): ?><s><?= e(money($product['oldPrice'])) ?></s><?php endif ?></div>
  <button class="btn" id="buybarBtn" type="button" <?= $product['inStock'] ? '' : 'disabled' ?>><?= $product['inStock'] ? icon('bag') . ' ' . e(t('product.add')) : e(t('common.notAvailable')) ?></button>
</div>

<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="<?= e($name) ?>">
  <button class="lb-close" id="lbClose" aria-label="<?= e(t('common.close')) ?>"><?= icon('x') ?></button>
  <?php if (count($images) > 1): ?>
    <button class="lb-prev" id="lbPrev" aria-label="prev"><?= icon('chevronLeft') ?></button>
    <button class="lb-next" id="lbNext" aria-label="next"><?= icon('chevronRight') ?></button>
  <?php endif ?>
  <img id="lbImg" src="" alt="<?= e($name) ?>">
</div>

<script type="application/json" id="productData"><?= json_script($data) ?></script>

<?php if ($related): ?>
<section class="section container">
  <div class="section-head split-head">
    <div><span class="eyebrow"><?= e(t('product.relatedEyebrow')) ?></span><h2><?= e(t('product.relatedTitle')) ?></h2></div>
    <a href="<?= e($catUrl) ?>" class="link-arrow"><?= e(t('product.allCategory')) ?> <?= icon('arrow') ?></a>
  </div>
  <div class="grid-products cols-4">
    <?php foreach (array_slice($related, 0, 4) as $p): ?><?= view('shop/_card', ['p' => $p]) ?><?php endforeach ?>
  </div>
</section>
<?php endif ?>

<section class="section-sm container recent" id="recentSection" hidden>
  <div class="section-head"><span class="eyebrow"><?= e(t('product.recentEyebrow')) ?></span><h2><?= e(t('product.recentTitle')) ?></h2></div>
  <div class="grid-products cols-4" id="recentGrid"></div>
</section>
