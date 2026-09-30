<?php
/** @var array $settings @var array $fresh @var array $popular @var array $cats @var array $brands @var int $productCount @var string $heroTitle @var string $heroLead */
use Onika\I18n;

$site = (string) $settings['siteName'];
$hero = [$fresh[0] ?? null, $fresh[1] ?? null, $fresh[2] ?? null];
$brandNames = array_slice(array_column($brands, 'name'), 0, 16);
// Highlight the last word of the hero title with the brand gradient.
$titleWords = preg_split('/\s+/u', trim($heroTitle)) ?: [];
$titleLast = count($titleWords) > 1 ? array_pop($titleWords) : '';
?>
<section class="hero">
  <div class="container">
    <div class="hero-card">
      <div class="hero-inner">
        <div class="hero-copy reveal">
          <span class="eyebrow"><?= icon('sparkle', 'sm') ?> <?= e(\Onika\Repo\Settings::tr('tagline', I18n::lang()) ?: t('home.eyebrow')) ?></span>
          <h1><?= e(implode(' ', $titleWords)) ?><?php if ($titleLast !== ''): ?> <em><?= e($titleLast) ?></em><?php endif ?></h1>
          <p class="lead"><?= e($heroLead) ?></p>
          <div class="hero-cta">
            <a href="<?= e(url('/catalog')) ?>" class="btn btn-lg"><?= e(t('home.viewCatalog')) ?> <?= icon('arrow') ?></a>
            <a href="<?= e(url('/catalog?featured=1')) ?>" class="btn btn-ghost btn-lg"><?= e(t('home.new')) ?></a>
          </div>
          <div class="hero-stats">
            <div><b data-count="<?= (int) $productCount ?>"><?= (int) $productCount ?></b><span><?= e(tn('common.products', $productCount)) ?></span></div>
            <div><b data-count="<?= count($brands) ?>"><?= count($brands) ?></b><span><?= e(tn('common.brands', count($brands))) ?></span></div>
            <div><b>100%</b><span><?= e(t('common.originalShort')) ?></span></div>
          </div>
        </div>
        <div class="hero-visual reveal" style="--d:.15s">
          <?php if ($hero[2]): ?><a class="ph ph-a" href="<?= e(url('/product/' . $hero[2]['slug'])) ?>" tabindex="-1" aria-hidden="true"><img src="<?= e(media($hero[2]['images'][0] ?? null, 450)) ?>" alt="" width="300" height="400"></a><?php endif ?>
          <?php if ($hero[0]): ?><a class="ph ph-main" href="<?= e(url('/product/' . $hero[0]['slug'])) ?>" aria-label="<?= e(I18n::productName($hero[0])) ?>"><img src="<?= e(media($hero[0]['images'][0] ?? null, 800)) ?>" alt="<?= e(I18n::productName($hero[0])) ?>" width="560" height="746" fetchpriority="high"></a><?php endif ?>
          <?php if ($hero[1]): ?><a class="ph ph-b" href="<?= e(url('/product/' . $hero[1]['slug'])) ?>" tabindex="-1" aria-hidden="true"><img src="<?= e(media($hero[1]['images'][0] ?? null, 450)) ?>" alt="" width="300" height="400"></a><?php endif ?>
          <div class="hero-chip chip-a"><span class="ic-wrap"><?= icon('shield') ?></span><?= e(t('common.original')) ?></div>
          <div class="hero-chip chip-b"><span class="ic-wrap"><?= icon('truck') ?></span><?= e(t('home.f1Title')) ?></div>
        </div>
      </div>
    </div>
    <?php if ($brandNames): ?>
    <div class="brand-strip" aria-hidden="true"><div class="brand-track">
      <?php for ($i = 0; $i < 2; $i++): foreach ($brandNames as $b): ?><span><?= e($b) ?></span><?php endforeach; endfor ?>
    </div></div>
    <?php endif ?>
  </div>
</section>

<?php if ($cats): ?>
<section class="section container">
  <div class="section-head center reveal">
    <span class="eyebrow"><?= e(t('home.categoriesEyebrow')) ?></span>
    <h2><?= e(t('home.categoriesTitle')) ?></h2>
    <p><?= e(t('home.categoriesText')) ?></p>
  </div>
  <div class="cat-grid<?= !empty($catBig) ? ' has-big' : '' ?>">
    <?php foreach ($cats as $i => $c): ?>
      <a class="cat-tile reveal" style="--d:<?= ($i % 4) * .07 ?>s" href="<?= e(url('/catalog/' . $c['slug'])) ?>">
        <?php if (!empty($c['cover'])): ?><img src="<?= e(media($c['cover'], $i === 0 ? 800 : 450)) ?>" alt="" loading="lazy" decoding="async" width="450" height="560"><?php endif ?>
        <span class="ct-go"><?= icon('arrowUpRight') ?></span>
        <div class="ct-body"><h3><?= e(I18n::categoryLabel($c)) ?></h3><span><?= e($c['count']) ?> <?= e(tn('common.products', $c['count'])) ?></span></div>
      </a>
    <?php endforeach ?>
  </div>
</section>
<?php endif ?>

<section class="section-sm container">
  <div class="section-head split-head reveal">
    <div><span class="eyebrow"><?= e(t('home.newEyebrow')) ?></span><h2><?= e(t('home.newTitle')) ?></h2></div>
    <a href="<?= e(url('/catalog')) ?>" class="link-arrow"><?= e(t('home.allCatalog')) ?> <?= icon('arrow') ?></a>
  </div>
  <div class="grid-products cols-4">
    <?php foreach ($fresh as $p): ?><?= view('shop/_card', ['p' => $p]) ?><?php endforeach ?>
  </div>
</section>

<section class="section container">
  <div class="split">
    <div class="split-media reveal">
      <?php $aboutImg = $popular[0]['images'][0] ?? ($fresh[3]['images'][0] ?? null); ?>
      <img src="<?= e(media($aboutImg, 800)) ?>" alt="<?= e($site) ?>" loading="lazy" width="640" height="800">
      <div class="float-card">
        <span class="ic-round"><?= icon('shield') ?></span>
        <div><b><?= e(t('home.checkedTitle')) ?></b><div class="small muted"><?= e(t('home.checkedText')) ?></div></div>
      </div>
    </div>
    <div class="split-body reveal" style="--d:.12s">
      <span class="eyebrow"><?= e(t('home.aboutEyebrow')) ?></span>
      <h2><?= e(t('home.aboutTitle')) ?></h2>
      <p><?= e(t('home.aboutText')) ?></p>
      <ul class="check-list">
        <li><?= icon('check') ?><span><?= e(t('home.aboutP1')) ?></span></li>
        <li><?= icon('check') ?><span><?= e(t('home.aboutP2')) ?></span></li>
        <li><?= icon('check') ?><span><?= e(t('home.aboutP3', ['n' => $productCount])) ?></span></li>
      </ul>
      <a href="<?= e(url('/about')) ?>" class="btn btn-ghost"><?= e(t('home.more')) ?> <?= icon('arrow') ?></a>
    </div>
  </div>
</section>

<section class="section-sm container">
  <div class="features">
    <?php foreach ([['truck', 'home.f1'], ['shield', 'home.f2'], ['return', 'home.f3'], ['message', 'home.f4']] as $i => [$ic, $k]): ?>
      <div class="feature reveal" style="--d:<?= $i * .08 ?>s">
        <span class="ic-round"><?= icon($ic) ?></span>
        <h3><?= e(t($k . 'Title')) ?></h3>
        <p><?= e(t($k . 'Text')) ?></p>
      </div>
    <?php endforeach ?>
  </div>
</section>

<?php if ($popular): ?>
<section class="section container">
  <div class="section-head split-head reveal">
    <div><span class="eyebrow"><?= e(t('home.popularEyebrow')) ?></span><h2><?= e(t('home.popularTitle')) ?></h2></div>
    <a href="<?= e(url('/catalog?sort=popular')) ?>" class="link-arrow"><?= e(t('home.more2')) ?> <?= icon('arrow') ?></a>
  </div>
  <div class="grid-products cols-4">
    <?php foreach ($popular as $p): ?><?= view('shop/_card', ['p' => $p]) ?><?php endforeach ?>
  </div>
</section>
<?php endif ?>

<section class="section container recent" id="recentSection" hidden>
  <div class="section-head reveal"><span class="eyebrow"><?= e(t('product.recentEyebrow')) ?></span><h2><?= e(t('product.recentTitle')) ?></h2></div>
  <div class="grid-products cols-4" id="recentGrid"></div>
</section>

<section class="section-sm container">
  <div class="newsletter reveal">
    <div class="newsletter-inner">
      <div>
        <span class="eyebrow"><?= e(t('nl.eyebrow')) ?></span>
        <h2><?= e(t('nl.title')) ?></h2>
        <p><?= e(t('nl.text')) ?></p>
      </div>
      <form class="news-form" data-news novalidate>
        <input type="email" name="email" placeholder="<?= e(t('nl.placeholder')) ?>" required autocomplete="email" aria-label="<?= e(t('nl.placeholder')) ?>">
        <button class="btn btn-light" type="submit"><?= e(t('nl.button')) ?> <?= icon('arrow') ?></button>
      </form>
    </div>
  </div>
</section>
