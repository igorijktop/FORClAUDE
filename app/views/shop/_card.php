<?php
/** @var array $p product */
use Onika\I18n;

$name = I18n::productName($p);
$href = url('/product/' . $p['slug']);
$src0 = $p['images'][0] ?? null;
$src1 = $p['images'][1] ?? null;
$out = !$p['inStock'];
$sale = $p['oldPrice'] && $p['oldPrice'] > $p['price'];
$off = $sale ? (int) round((1 - $p['price'] / $p['oldPrice']) * 100) : 0;
$brand = $p['brand'] ?: I18n::categoryName($p['category']);
$needsSize = !empty($p['sizes']);
?>
<article class="pcard<?= $out ? ' is-out' : '' ?>" data-id="<?= e($p['id']) ?>" data-p="<?= json_attr([
    'id' => $p['id'], 'name' => $name, 'price' => $p['price'], 'oldPrice' => $p['oldPrice'], 'image' => media($src0, 300),
    'url' => $href, 'brand' => $p['brand'], 'inStock' => $p['inStock'], 'sizes' => $p['sizes'],
]) ?>">
  <div class="pcard-media">
    <a href="<?= e($href) ?>" aria-label="<?= e($name) ?>" tabindex="-1">
      <img class="main" src="<?= e(media($src0, 450)) ?>" srcset="<?= e(media_srcset($src0, [300, 450, 600])) ?>" sizes="(max-width: 639px) 46vw, (max-width: 1099px) 30vw, 300px" alt="<?= e($name) ?>" loading="lazy" decoding="async" width="450" height="600">
      <?php if ($src1): ?><img class="alt" src="<?= e(media($src1, 450)) ?>" alt="" loading="lazy" decoding="async" width="450" height="600"><?php endif ?>
    </a>
    <div class="pcard-badges">
      <?php if ($out): ?><span class="badge out"><?= e(t('common.badgeOut')) ?></span><?php endif ?>
      <?php if ($sale): ?><span class="badge sale">−<?= $off ?>%</span><?php endif ?>
      <?php if ($p['featured'] && !$sale && !$out): ?><span class="badge new"><?= e(t('common.badgeNew')) ?></span><?php endif ?>
    </div>
    <button type="button" class="pcard-fav" data-fav="<?= e($p['id']) ?>" aria-label="<?= e(t('common.fav')) ?>" aria-pressed="false"><?= icon('heart') ?></button>
    <?php if ($needsSize && !$out): ?>
      <a class="pcard-add" href="<?= e($href) ?>" aria-label="<?= e(t('product.chooseSize')) ?>"><?= icon('arrow') ?><span><?= e(t('product.chooseSize')) ?></span></a>
    <?php else: ?>
      <button type="button" class="pcard-add" data-add="<?= e($p['id']) ?>" <?= $out ? 'disabled' : '' ?> aria-label="<?= e(t('common.toCart')) ?>">
        <?= icon($out ? 'x' : 'plus') ?><span><?= e($out ? t('common.notAvailable') : t('common.toCart')) ?></span>
      </button>
    <?php endif ?>
  </div>
  <div class="pcard-body">
    <span class="pcard-brand"><?= e($brand) ?></span>
    <h3 class="pcard-name"><a href="<?= e($href) ?>"><?= e($name) ?></a></h3>
    <div class="pcard-price">
      <b><?= e(money($p['price'])) ?></b>
      <?php if ($sale): ?><s><?= e(money($p['oldPrice'])) ?></s><?php endif ?>
    </div>
  </div>
</article>
