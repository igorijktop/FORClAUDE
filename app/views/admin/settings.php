<?php /** @var array $s @var list $backups */
$tr = $s['translations'] ?? [];
$f = static fn(string $lang, string $key): string => (string) ($tr[$lang][$key] ?? '');
?>
<form method="post" action="<?= e(purl('/admin/settings/save')) ?>" class="a-form-layout">
  <?= csrf_field() ?>
  <div class="a-form-main">
    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.shop')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="form-grid two">
          <div class="field"><label for="s-site"><?= e(t('admin.siteName')) ?></label><input id="s-site" name="siteName" maxlength="60" value="<?= e($s['siteName']) ?>"></div>
          <div class="field"><label for="s-free"><?= e(t('admin.freeFrom')) ?> (₴)</label><input id="s-free" type="number" min="0" step="1" name="freeShippingFrom" value="<?= (int) $s['freeShippingFrom'] ?>"><span class="hint"><?= e(t('admin.freeFromHint')) ?></span></div>
        </div>
        <?php foreach ([['tagline', 'admin.tagline', false], ['announcement', 'admin.announcement', false], ['heroTitle', 'admin.heroTitle', false], ['heroSubtitle', 'admin.heroSubtitle', true]] as [$key, $label, $area]): ?>
          <div class="a-lang-block">
            <div class="field"><label><?= e(t($label)) ?> · UA</label>
              <?php if ($area): ?><textarea name="<?= $key ?>" rows="2"><?= e($s[$key] ?? '') ?></textarea><?php else: ?><input name="<?= $key ?>" value="<?= e($s[$key] ?? '') ?>"><?php endif ?></div>
            <div class="form-grid two">
              <?php foreach (['ru' => 'RU', 'en' => 'EN'] as $l => $L): ?>
                <div class="field"><label><?= e(t($label)) ?> · <?= $L ?></label>
                  <?php if ($area): ?><textarea name="<?= $key . '_' . $l ?>" rows="2"><?= e($f($l, $key)) ?></textarea><?php else: ?><input name="<?= $key . '_' . $l ?>" value="<?= e($f($l, $key)) ?>"><?php endif ?></div>
              <?php endforeach ?>
            </div>
          </div>
        <?php endforeach ?>
      </div>
    </section>
    <section class="a-card">
      <div class="a-card-head"><h2><?= e(t('admin.contacts')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="form-grid two">
          <div class="field"><label for="s-phone"><?= e(t('contacts.phone')) ?></label><input id="s-phone" name="phone" value="<?= e($s['phone']) ?>"></div>
          <div class="field"><label for="s-email"><?= e(t('contacts.email')) ?></label><input id="s-email" type="email" name="email" value="<?= e($s['email']) ?>"></div>
        </div>
        <div class="field"><label for="s-addr"><?= e(t('admin.address')) ?></label><input id="s-addr" name="address" value="<?= e($s['address']) ?>"></div>
        <div class="form-grid two">
          <div class="field"><label for="s-ig">Instagram</label><input id="s-ig" name="instagram" type="url" placeholder="https://instagram.com/…" value="<?= e($s['instagram']) ?>"></div>
          <div class="field"><label for="s-tg">Telegram</label><input id="s-tg" name="telegram" type="url" placeholder="https://t.me/…" value="<?= e($s['telegram']) ?>"></div>
        </div>
      </div>
    </section>
  </div>
  <aside class="a-form-side">
    <section class="a-card a-sticky">
      <div class="a-card-head"><h2><?= e(t('admin.save')) ?></h2></div>
      <div class="a-card-body form-grid" style="gap:12px">
        <button class="btn btn-block" type="submit"><?= icon('check') ?> <?= e(t('admin.saveSettings')) ?></button>
        <a class="btn btn-ghost btn-block" href="<?= e(purl('/admin/password')) ?>"><?= icon('lock') ?> <?= e(t('admin.changePass')) ?></a>
      </div>
    </section>
  </aside>
</form>

<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.backups')) ?></h2>
    <form method="post" action="<?= e(purl('/admin/backups/create')) ?>"><?= csrf_field() ?><button class="btn btn-sm"><?= icon('plus') ?> <?= e(t('admin.backupCreate')) ?></button></form></div>
  <div class="a-table-wrap"><table class="a-table">
    <thead><tr><th><?= e(t('admin.backupName')) ?></th><th><?= e(t('admin.backupSize')) ?></th><th><?= e(t('admin.backupDate')) ?></th><th></th></tr></thead>
    <tbody>
      <?php foreach ($backups as $b): $n = rawurlencode($b['name']); ?>
        <tr><td><span class="a-strong"><?= e($b['name']) ?></span></td><td class="small muted"><?= e(number_format($b['size'] / 1024, 0, ',', ' ')) ?> KB</td><td class="small muted"><?= e(date('d.m.Y H:i', $b['at'])) ?></td>
          <td class="a-actions">
            <a class="a-icon-btn" href="<?= e(purl('/admin/backups/' . $n . '/download')) ?>" title="<?= e(t('admin.backupDownload')) ?>"><?= icon('download') ?></a>
            <form method="post" action="<?= e(purl('/admin/backups/' . $n . '/restore')) ?>" data-confirm="<?= e(t('admin.backupRestoreConfirm')) ?>"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.restore')) ?>"><?= icon('return') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/backups/' . $n . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteBackup')) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>"><?= icon('trash') ?></button></form>
          </td></tr>
      <?php endforeach ?>
      <?php if (!$backups): ?><tr><td colspan="4" class="a-empty"><?= e(t('admin.backupsEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
