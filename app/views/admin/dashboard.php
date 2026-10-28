<?php
/** @var array $s dashboard stats @var ?array $admin */
use Onika\I18n;
use Onika\Labels;

$series = $s['series'];
$maxRev = max(1.0, ...array_map(static fn($d) => (float) $d['revenue'], $series));
$W = 720; $H = 230; $padL = 8; $padB = 28; $padT = 16;
$bw = ($W - $padL) / count($series);
$sumOrders = array_sum(array_column($series, 'orders'));
$sumRev = array_sum(array_column($series, 'revenue'));
$day = static fn(string $d): string => I18n::lang() === 'en' ? date('M j', strtotime($d)) : date('d.m', strtotime($d));
$statCard = static function (string $ic, string $tone, string $label, string $value, string $sub = '', string $href = ''): string {
    $tag = $href !== '' ? 'a href="' . e($href) . '"' : 'div';
    $end = $href !== '' ? 'a' : 'div';
    return '<' . $tag . ' class="a-stat tone-' . $tone . '"><span class="a-stat-ic">' . icon($ic) . '</span><div class="a-stat-text"><div class="a-stat-val">' . $value . '</div><div class="a-stat-label">' . e($label) . '</div>'
        . ($sub !== '' ? '<div class="a-stat-sub">' . $sub . '</div>' : '') . '</div>' . ($href !== '' ? '<span class="a-stat-go">' . icon('arrowUpRight') . '</span>' : '') . '</' . $end . '>';
};
$new = (int) ($s['byStatus']['new'] ?? 0);
?>
<section class="a-hero">
  <div class="a-hero-text">
    <p class="a-hero-kicker"><?= icon('sparkle') ?> <?= e(date('d.m.Y')) ?></p>
    <h2><?= e(t('admin.hello', ['name' => $admin['username'] ?? 'admin'])) ?></h2>
    <p class="a-hero-sub"><?= e(t('admin.helloSub')) ?></p>
  </div>
  <div class="a-hero-actions">
    <a class="btn btn-sm" href="<?= e(purl('/admin/products/new')) ?>"><?= icon('plus') ?> <?= e(t('admin.addProduct')) ?></a>
    <a class="btn btn-ghost btn-sm" href="<?= e(purl('/admin/orders?status=new')) ?>"><?= icon('truck') ?> <?= e(t('admin.orders')) ?><?php if ($new > 0): ?> <em class="a-count"><?= $new ?></em><?php endif ?></a>
  </div>
  <span class="a-hero-deco" aria-hidden="true"><i></i><i></i><i></i></span>
</section>

<div class="a-stats">
  <?= $statCard('truck', 'blue', t('admin.ordersTotal'), (string) $s['orders'], e((string) $new) . ' ' . e(t('admin.newOrders')), purl('/admin/orders')) ?>
  <?= $statCard('trending', 'green', t('admin.revenue'), e(money($s['revenue'])), e(t('admin.noCancelled'))) ?>
  <?= $statCard('box', 'violet', t('admin.productsCatalog'), (string) $s['productsActive'], e((string) $s['outOfStock']) . ' ' . e(t('admin.noStock')) . ($s['productsHidden'] ? ' · ' . e((string) $s['productsHidden']) . ' ' . e(t('admin.hiddenShort')) : ''), purl('/admin/products')) ?>
  <?= $statCard('users', 'amber', t('admin.clients'), (string) $s['customers'], e((string) $s['subscribers']) . ' ' . e(t('admin.subscribersShort')), purl('/admin/clients')) ?>
</div>

<div class="a-grid-2">
  <section class="a-card a-chart-card">
    <div class="a-card-head"><h2><?= e(t('admin.last14')) ?></h2><span class="a-chip-static"><b><?= (int) $sumOrders ?></b> <?= e(t('admin.ordersShort')) ?> · <b><?= e(money($sumRev)) ?></b></span></div>
    <div class="a-card-body a-chart-wrap">
      <svg class="a-chart" viewBox="0 0 <?= $W ?> <?= $H ?>" role="img" aria-label="<?= e(t('admin.last14')) ?>: <?= (int) $sumOrders ?> <?= e(t('admin.ordersShort')) ?>, <?= e(money($sumRev)) ?>" preserveAspectRatio="none">
        <defs><linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#d63384"/></linearGradient></defs>
        <?php for ($g = 0; $g <= 3; $g++): $y = $padT + ($H - $padT - $padB) * $g / 3; ?><line x1="<?= $padL ?>" x2="<?= $W ?>" y1="<?= round($y, 1) ?>" y2="<?= round($y, 1) ?>" class="a-grid-line"/><?php endfor ?>
        <?php foreach ($series as $i => $d):
            $h = ($H - $padT - $padB) * ((float) $d['revenue'] / $maxRev);
            $x = $padL + $i * $bw + $bw * 0.2;
            $w = $bw * 0.6;
            $y = $H - $padB - $h; ?>
          <g class="a-bar<?= $d['revenue'] > 0 ? ' has' : '' ?>">
            <rect class="a-bar-bg" x="<?= round($x, 1) ?>" y="<?= $padT ?>" width="<?= round($w, 1) ?>" height="<?= $H - $padB - $padT ?>" rx="8"/>
            <rect x="<?= round($x, 1) ?>" y="<?= round($d['revenue'] > 0 ? $y : $H - $padB - 4, 1) ?>" width="<?= round($w, 1) ?>" height="<?= round(max($d['revenue'] > 0 ? $h : 4, 4), 1) ?>" rx="8" fill="<?= $d['revenue'] > 0 ? 'url(#barg)' : 'currentColor' ?>" opacity="<?= $d['revenue'] > 0 ? 1 : .14 ?>"/>
            <title><?= e($day($d['date'])) ?>: <?= (int) $d['orders'] ?> <?= e(t('admin.ordersShort')) ?> · <?= e(money($d['revenue'])) ?></title>
          </g>
          <?php if ($i % 2 === 0 || count($series) < 8): ?><text x="<?= round($x + $w / 2, 1) ?>" y="<?= $H - 8 ?>" text-anchor="middle" class="a-axis"><?= e($day($d['date'])) ?></text><?php endif ?>
        <?php endforeach ?>
      </svg>
      <?php if ($sumOrders === 0): ?><div class="a-chart-empty"><span><?= icon('chart') ?></span><?= e(t('admin.chartEmpty')) ?></div><?php endif ?>
    </div>
  </section>

  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.popularProducts')) ?></h2><a href="<?= e(purl('/admin/products?sort=popular')) ?>" class="a-link"><?= e(t('admin.products')) ?> <?= icon('arrow') ?></a></div>
    <div class="a-list">
      <?php foreach ($s['top'] as $n => $p): ?>
        <a class="a-list-item" href="<?= e(purl('/admin/products/' . rawurlencode($p['id']) . '/edit')) ?>">
          <span class="a-rank"><?= $n + 1 ?></span>
          <img src="<?= e(media($p['images'][0] ?? null, 120)) ?>" alt="" loading="lazy" width="44" height="56">
          <div class="grow"><div class="a-list-name"><?= e(I18n::productName($p)) ?></div><div class="small muted a-ellipsis"><?= e($p['brand'] ?: I18n::categoryName($p['category'])) ?> · <?= icon('eye') ?> <?= (int) $p['views'] ?></div></div>
          <b class="small nowrap"><?= e(money($p['price'])) ?></b>
        </a>
      <?php endforeach ?>
      <?php if (!$s['top']): ?><div class="a-empty"><?= e(t('admin.noData')) ?></div><?php endif ?>
    </div>
  </section>
</div>

<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.recentOrders')) ?></h2><a href="<?= e(purl('/admin/orders')) ?>" class="a-link"><?= e(t('admin.allOrders')) ?> <?= icon('arrow') ?></a></div>
  <div class="a-table-wrap">
    <table class="a-table a-stack">
      <thead><tr><th scope="col">№</th><th scope="col"><?= e(t('admin.client')) ?></th><th scope="col"><?= e(t('admin.phone')) ?></th><th scope="col"><?= e(t('admin.sum')) ?></th><th scope="col"><?= e(t('admin.status')) ?></th><th scope="col"><?= e(t('admin.date')) ?></th></tr></thead>
      <tbody>
        <?php foreach ($s['recent'] as $o): ?>
          <tr>
            <td class="a-cell-main"><a class="a-strong" href="<?= e(purl('/admin/orders/' . rawurlencode($o['id']))) ?>">#<?= e($o['id']) ?></a></td>
            <td data-label="<?= e(t('admin.client')) ?>" class="a-wrap"><?= e($o['customer']['name'] ?? '—') ?></td>
            <td data-label="<?= e(t('admin.phone')) ?>" class="nowrap"><?= e($o['customer']['phone'] ?? '—') ?></td>
            <td data-label="<?= e(t('admin.sum')) ?>"><b class="nowrap"><?= e(money($o['total'])) ?></b></td>
            <td data-label="<?= e(t('admin.status')) ?>"><span class="pill <?= e(Labels::statusTone($o['status'])) ?>"><?= e(Labels::status($o['status'])) ?></span></td>
            <td data-label="<?= e(t('admin.date')) ?>" class="muted small nowrap"><?= e(dt($o['createdAt'], true)) ?></td>
          </tr>
        <?php endforeach ?>
        <?php if (!$s['recent']): ?><tr class="a-empty-row"><td colspan="6" class="a-empty"><?= e(t('admin.noOrders')) ?></td></tr><?php endif ?>
      </tbody>
    </table>
  </div>
</section>
