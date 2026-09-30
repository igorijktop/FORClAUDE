<?php
/** @var array $s dashboard stats */
use Onika\I18n;
use Onika\Labels;

$series = $s['series'];
$maxRev = max(1.0, ...array_map(static fn($d) => $d['revenue'], $series));
$maxOrd = max(1, ...array_map(static fn($d) => $d['orders'], $series));
$W = 720; $H = 220; $padL = 8; $padB = 26; $padT = 12;
$bw = ($W - $padL) / count($series);
$sumOrders = array_sum(array_column($series, 'orders'));
$sumRev = array_sum(array_column($series, 'revenue'));
$statCard = static function (string $ic, string $tone, string $label, string $value, string $sub = '', string $href = ''): string {
    $tag = $href !== '' ? 'a href="' . e($href) . '"' : 'div';
    $end = $href !== '' ? 'a' : 'div';
    return '<' . $tag . ' class="a-stat tone-' . $tone . '"><span class="a-stat-ic">' . icon($ic) . '</span><div><div class="a-stat-val">' . $value . '</div><div class="a-stat-label">' . e($label) . '</div>'
        . ($sub !== '' ? '<div class="a-stat-sub">' . $sub . '</div>' : '') . '</div></' . $end . '>';
};
?>
<div class="a-stats">
  <?= $statCard('truck', 'blue', t('admin.ordersTotal'), (string) $s['orders'], e($s['byStatus']['new']) . ' ' . e(t('admin.newOrders')), purl('/admin/orders')) ?>
  <?= $statCard('trending', 'green', t('admin.revenue'), e(money($s['revenue'])), e(t('admin.noCancelled'))) ?>
  <?= $statCard('box', 'violet', t('admin.productsCatalog'), (string) $s['productsActive'], e($s['outOfStock']) . ' ' . e(t('admin.noStock')) . ($s['productsHidden'] ? ' · ' . e($s['productsHidden']) . ' ' . e(t('admin.hiddenShort')) : ''), purl('/admin/products')) ?>
  <?= $statCard('users', 'amber', t('admin.clients'), (string) $s['customers'], e($s['subscribers']) . ' ' . e(t('admin.subscribersShort')), purl('/admin/clients')) ?>
</div>

<div class="a-grid-2">
  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.last14')) ?></h2><span class="muted small"><?= (int) $sumOrders ?> <?= e(t('admin.ordersShort')) ?> · <?= e(money($sumRev)) ?></span></div>
    <div class="a-card-body">
      <svg class="a-chart" viewBox="0 0 <?= $W ?> <?= $H ?>" role="img" aria-label="<?= e(t('admin.last14')) ?>" preserveAspectRatio="none">
        <defs><linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00c8ff"/><stop offset="1" stop-color="#1f5bff"/></linearGradient></defs>
        <?php for ($g = 0; $g <= 3; $g++): $y = $padT + ($H - $padT - $padB) * $g / 3; ?><line x1="<?= $padL ?>" x2="<?= $W ?>" y1="<?= round($y, 1) ?>" y2="<?= round($y, 1) ?>" class="a-grid-line"/><?php endfor ?>
        <?php foreach ($series as $i => $d):
            $h = ($H - $padT - $padB) * ($d['revenue'] / $maxRev);
            $x = $padL + $i * $bw + $bw * 0.18;
            $w = $bw * 0.64;
            $y = $H - $padB - $h; ?>
          <g class="a-bar">
            <rect x="<?= round($x, 1) ?>" y="<?= round($d['revenue'] > 0 ? $y : $H - $padB - 3, 1) ?>" width="<?= round($w, 1) ?>" height="<?= round(max($d['revenue'] > 0 ? $h : 3, 3), 1) ?>" rx="5" fill="<?= $d['revenue'] > 0 ? 'url(#barg)' : 'currentColor' ?>" opacity="<?= $d['revenue'] > 0 ? 1 : .12 ?>"/>
            <title><?= e(date('d.m', strtotime($d['date']))) ?>: <?= (int) $d['orders'] ?> · <?= e(money($d['revenue'])) ?></title>
          </g>
          <?php if ($i % 2 === 0 || count($series) < 8): ?><text x="<?= round($x + $w / 2, 1) ?>" y="<?= $H - 6 ?>" text-anchor="middle" class="a-axis"><?= e(date('d.m', strtotime($d['date']))) ?></text><?php endif ?>
        <?php endforeach ?>
      </svg>
    </div>
  </section>

  <section class="a-card">
    <div class="a-card-head"><h2><?= e(t('admin.popularProducts')) ?></h2><a href="<?= e(purl('/admin/products')) ?>" class="a-link"><?= e(t('admin.products')) ?> <?= icon('arrow') ?></a></div>
    <div class="a-list">
      <?php foreach ($s['top'] as $p): ?>
        <a class="a-list-item" href="<?= e(purl('/admin/products/' . rawurlencode($p['id']) . '/edit')) ?>">
          <img src="<?= e(media($p['images'][0] ?? null, 120)) ?>" alt="" loading="lazy" width="44" height="56">
          <div class="grow"><div class="a-list-name"><?= e(I18n::productName($p)) ?></div><div class="small muted"><?= e($p['brand'] ?: I18n::categoryName($p['category'])) ?> · <?= (int) $p['views'] ?> <?= e(t('admin.views')) ?></div></div>
          <b class="small"><?= e(money($p['price'])) ?></b>
        </a>
      <?php endforeach ?>
      <?php if (!$s['top']): ?><div class="a-empty"><?= e(t('admin.noData')) ?></div><?php endif ?>
    </div>
  </section>
</div>

<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.recentOrders')) ?></h2><a href="<?= e(purl('/admin/orders')) ?>" class="a-link"><?= e(t('admin.allOrders')) ?> <?= icon('arrow') ?></a></div>
  <div class="a-table-wrap">
    <table class="a-table">
      <thead><tr><th>№</th><th><?= e(t('admin.client')) ?></th><th><?= e(t('admin.phone')) ?></th><th><?= e(t('admin.sum')) ?></th><th><?= e(t('admin.status')) ?></th><th><?= e(t('admin.date')) ?></th></tr></thead>
      <tbody>
        <?php foreach ($s['recent'] as $o): ?>
          <tr>
            <td><a class="a-link" href="<?= e(purl('/admin/orders/' . rawurlencode($o['id']))) ?>">#<?= e($o['id']) ?></a></td>
            <td><?= e($o['customer']['name'] ?? '—') ?></td>
            <td><?= e($o['customer']['phone'] ?? '—') ?></td>
            <td><b><?= e(money($o['total'])) ?></b></td>
            <td><span class="pill <?= e(Labels::statusTone($o['status'])) ?>"><?= e(Labels::status($o['status'])) ?></span></td>
            <td class="muted small"><?= e(dt($o['createdAt'], true)) ?></td>
          </tr>
        <?php endforeach ?>
        <?php if (!$s['recent']): ?><tr><td colspan="6" class="a-empty"><?= e(t('admin.noOrders')) ?></td></tr><?php endif ?>
      </tbody>
    </table>
  </div>
</section>
