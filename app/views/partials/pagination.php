<?php
/** @var int $page @var int $pages @var string $base @var array $query */
if ($pages <= 1) {
    return;
}
$href = static function (int $n) use ($base, $query): string {
    $qs = query_string($query + ['page' => $n > 1 ? $n : '']);
    return $base . ($qs !== '' ? '?' . $qs : '');
};
$start = max(1, $page - 2);
$end = min($pages, $page + 2);
?>
<nav class="pagination" aria-label="pagination" id="pagination">
  <?php if ($page > 1): ?><a href="<?= e($href($page - 1)) ?>" rel="prev" aria-label="prev"><?= icon('chevronLeft') ?></a><?php else: ?><span class="disabled"><?= icon('chevronLeft') ?></span><?php endif ?>
  <?php if ($start > 1): ?><a href="<?= e($href(1)) ?>">1</a><?php endif ?>
  <?php if ($start > 2): ?><span class="disabled">…</span><?php endif ?>
  <?php for ($i = $start; $i <= $end; $i++): ?>
    <?php if ($i === $page): ?><span class="current" aria-current="page"><?= $i ?></span><?php else: ?><a href="<?= e($href($i)) ?>"><?= $i ?></a><?php endif ?>
  <?php endfor ?>
  <?php if ($end < $pages - 1): ?><span class="disabled">…</span><?php endif ?>
  <?php if ($end < $pages): ?><a href="<?= e($href($pages)) ?>"><?= $pages ?></a><?php endif ?>
  <?php if ($page < $pages): ?><a href="<?= e($href($page + 1)) ?>" rel="next" aria-label="next"><?= icon('chevronRight') ?></a><?php else: ?><span class="disabled"><?= icon('chevronRight') ?></span><?php endif ?>
</nav>
