<?php /** @var array $s @var list $backups @var array $old @var array $errors */
$tr = $s['translations'] ?? [];
$old = $old ?? [];
$errors = $errors ?? [];
// After a failed save the fields show what was typed (nothing was stored).
$val = static fn(string $name, string $stored): string => array_key_exists($name, $old) && is_scalar($old[$name]) ? (string) $old[$name] : $stored;
$f = static fn(string $lang, string $key): string => (string) ($tr[$lang][$key] ?? '');
$errText = ['email' => t('admin.errEmail'), 'url' => t('admin.errUrl'), 'number' => t('admin.errNumber')];
$field = static function (string $name, string $id, string $label, string $input, string $hint = '') use ($errors, $errText): string {
    $err = $errors[$name] ?? null;
    if ($err !== null) {
        $input = preg_replace('/^<(input|textarea)/', '<$1 aria-invalid="true" aria-describedby="' . $id . '-err"', $input, 1) ?? $input;
    }
    return '<div class="field' . ($err !== null ? ' has-error' : '') . '"><label for="' . $id . '">' . $label . '</label>' . $input
        . ($err !== null ? '<span class="err" id="' . $id . '-err">' . icon('alert') . ' ' . e($errText[$err] ?? t('admin.formInvalid')) . '</span>' : '')
        . ($hint !== '' ? '<span class="hint">' . $hint . '</span>' : '') . '</div>';
};
?>
<form method="post" action="<?= e(purl('/admin/settings/save')) ?>" class="a-form-layout" novalidate>
  <?= csrf_field() ?>
  <div class="a-form-main">
    <section class="a-card">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('home') ?></span><?= e(t('admin.shop')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="form-grid two">
          <?= $field('siteName', 's-site', e(t('admin.siteName')), '<input id="s-site" name="siteName" maxlength="60" value="' . e($val('siteName', (string) $s['siteName'])) . '">') ?>
          <?= $field('freeShippingFrom', 's-free', e(t('admin.freeFrom')) . ' (₴)', '<input id="s-free" type="number" min="0" step="1" inputmode="numeric" name="freeShippingFrom" value="' . e($val('freeShippingFrom', (string) (int) $s['freeShippingFrom'])) . '">', e(t('admin.freeFromHint'))) ?>
        </div>
        <?php foreach ([['tagline', 'admin.tagline', false, 120], ['announcement', 'admin.announcement', false, 240], ['heroTitle', 'admin.heroTitle', false, 160], ['heroSubtitle', 'admin.heroSubtitle', true, 400]] as [$key, $label, $area, $max]): ?>
          <fieldset class="a-lang-block">
            <legend><?= e(t($label)) ?></legend>
            <div class="field"><label for="s-<?= $key ?>"><span class="a-lang-tag">UA</span> <?= e(t($label)) ?></label>
              <?php if ($area): ?><textarea id="s-<?= $key ?>" name="<?= $key ?>" rows="2" maxlength="<?= $max ?>"><?= e($val($key, (string) ($s[$key] ?? ''))) ?></textarea><?php else: ?><input id="s-<?= $key ?>" name="<?= $key ?>" maxlength="<?= $max ?>" value="<?= e($val($key, (string) ($s[$key] ?? ''))) ?>"><?php endif ?></div>
            <div class="form-grid two">
              <?php foreach (['ru' => 'RU', 'en' => 'EN'] as $l => $L): $n = $key . '_' . $l; ?>
                <div class="field"><label for="s-<?= $n ?>"><span class="a-lang-tag"><?= $L ?></span> <?= e(t($label)) ?></label>
                  <?php if ($area): ?><textarea id="s-<?= $n ?>" name="<?= $n ?>" rows="2" maxlength="<?= $max ?>"><?= e($val($n, $f($l, $key))) ?></textarea><?php else: ?><input id="s-<?= $n ?>" name="<?= $n ?>" maxlength="<?= $max ?>" value="<?= e($val($n, $f($l, $key))) ?>"><?php endif ?></div>
              <?php endforeach ?>
            </div>
          </fieldset>
        <?php endforeach ?>
      </div>
    </section>
    <section class="a-card">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('phone') ?></span><?= e(t('admin.contacts')) ?></h2></div>
      <div class="a-card-body form-grid">
        <div class="form-grid two">
          <?= $field('phone', 's-phone', e(t('contacts.phone')), '<input id="s-phone" name="phone" type="tel" maxlength="40" value="' . e($val('phone', (string) $s['phone'])) . '">') ?>
          <?= $field('email', 's-email', e(t('contacts.email')), '<input id="s-email" type="email" name="email" maxlength="120" value="' . e($val('email', (string) $s['email'])) . '">') ?>
        </div>
        <?= $field('address', 's-addr', e(t('admin.address')), '<input id="s-addr" name="address" maxlength="200" value="' . e($val('address', (string) $s['address'])) . '">') ?>
        <div class="form-grid two">
          <?= $field('instagram', 's-ig', 'Instagram', '<input id="s-ig" name="instagram" type="url" placeholder="https://instagram.com/…" value="' . e($val('instagram', (string) $s['instagram'])) . '">') ?>
          <?= $field('telegram', 's-tg', 'Telegram', '<input id="s-tg" name="telegram" type="url" placeholder="https://t.me/…" value="' . e($val('telegram', (string) $s['telegram'])) . '">') ?>
        </div>
      </div>
    </section>
  </div>
  <aside class="a-form-side">
    <section class="a-card a-sticky">
      <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('check') ?></span><?= e(t('admin.save')) ?></h2></div>
      <div class="a-card-body form-grid a-gap12">
        <button class="btn btn-block" type="submit"><?= icon('check') ?> <?= e(t('admin.saveSettings')) ?></button>
        <a class="btn btn-ghost btn-block" href="<?= e(purl('/admin/password')) ?>"><?= icon('lock') ?> <?= e(t('admin.changePass')) ?></a>
      </div>
    </section>
  </aside>
</form>

<section class="a-card" id="backups">
  <div class="a-card-head"><h2><span class="a-head-ic"><?= icon('shield') ?></span><?= e(t('admin.backups')) ?> <span class="a-head-count"><?= count($backups) ?></span></h2>
    <form method="post" action="<?= e(purl('/admin/backups/create')) ?>"><?= csrf_field() ?><button class="btn btn-sm"><?= icon('plus') ?> <?= e(t('admin.backupCreate')) ?></button></form></div>
  <div class="a-table-wrap"><table class="a-table a-stack">
    <thead><tr><th scope="col"><?= e(t('admin.backupName')) ?></th><th scope="col"><?= e(t('admin.backupSize')) ?></th><th scope="col"><?= e(t('admin.backupDate')) ?></th><th scope="col"><span class="sr-only"><?= e(t('admin.actions')) ?></span></th></tr></thead>
    <tbody>
      <?php foreach ($backups as $b): $n = rawurlencode($b['name']); ?>
        <tr><td class="a-cell-main"><span class="a-strong a-wrap a-mono"><?= e($b['name']) ?></span></td><td data-label="<?= e(t('admin.backupSize')) ?>" class="small muted nowrap"><?= e(number_format($b['size'] / 1024, 0, ',', "\u{00A0}")) ?> KB</td><td data-label="<?= e(t('admin.backupDate')) ?>" class="small muted nowrap"><?= e(date('d.m.Y H:i', $b['at'])) ?></td>
          <td class="a-actions">
            <a class="a-icon-btn" href="<?= e(purl('/admin/backups/' . $n . '/download')) ?>" title="<?= e(t('admin.backupDownload')) ?>" aria-label="<?= e(t('admin.backupDownload')) ?>: <?= e($b['name']) ?>" download><?= icon('download') ?></a>
            <form method="post" action="<?= e(purl('/admin/backups/' . $n . '/restore')) ?>" data-confirm="<?= e(t('admin.backupRestoreConfirm')) ?>" data-confirm-name="<?= e($b['name']) ?>" data-confirm-kind="warn"><?= csrf_field() ?><button class="a-icon-btn" title="<?= e(t('admin.restore')) ?>" aria-label="<?= e(t('admin.restore')) ?>: <?= e($b['name']) ?>"><?= icon('return') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/backups/' . $n . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteBackup')) ?>" data-confirm-name="<?= e($b['name']) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>" aria-label="<?= e(t('admin.delete')) ?>: <?= e($b['name']) ?>"><?= icon('trash') ?></button></form>
          </td></tr>
      <?php endforeach ?>
      <?php if (!$backups): ?><tr class="a-empty-row"><td colspan="4" class="a-empty"><?= e(t('admin.backupsEmpty')) ?></td></tr><?php endif ?>
    </tbody></table></div>
</section>
