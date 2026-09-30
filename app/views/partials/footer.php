<?php
/** @var array $settings @var array $categories */
use Onika\I18n;
use Onika\Repo\Settings;

$lang = I18n::lang();
$site = (string) $settings['siteName'];
?>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-about">
        <a href="<?= e(url('/')) ?>" aria-label="<?= e($site) ?>"><?= logo_tag($site, 44) ?></a>
        <p><?= e(Settings::tr('heroSubtitle', $lang)) ?></p>
        <div class="socials">
          <?php if (!empty($settings['instagram'])): ?><a href="<?= e($settings['instagram']) ?>" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><?= icon('instagram') ?></a><?php endif ?>
          <?php if (!empty($settings['telegram'])): ?><a href="<?= e($settings['telegram']) ?>" aria-label="Telegram" target="_blank" rel="noopener noreferrer"><?= icon('send') ?></a><?php endif ?>
          <?php if (!empty($settings['phone'])): ?><a href="<?= e(tel_href($settings['phone'])) ?>" aria-label="<?= e(t('contacts.phone')) ?>"><?= icon('phone') ?></a><?php endif ?>
        </div>
      </div>
      <div>
        <h4><?= e(t('footer.catalog')) ?></h4>
        <ul class="footer-links">
          <?php foreach (array_slice($categories, 0, 7) as $c): ?>
            <li><a href="<?= e(url('/catalog/' . $c['slug'])) ?>"><?= e(I18n::categoryLabel($c)) ?></a></li>
          <?php endforeach ?>
        </ul>
      </div>
      <div>
        <h4><?= e(t('footer.info')) ?></h4>
        <ul class="footer-links">
          <li><a href="<?= e(url('/about')) ?>"><?= e(t('footer.aboutShop')) ?></a></li>
          <li><a href="<?= e(url('/contacts')) ?>#delivery"><?= e(t('footer.delivery')) ?></a></li>
          <li><a href="<?= e(url('/contacts')) ?>#returns"><?= e(t('footer.exchange')) ?></a></li>
          <li><a href="<?= e(url('/contacts')) ?>"><?= e(t('footer.contacts')) ?></a></li>
          <li><a href="<?= e(url('/account')) ?>"><?= e(t('account.title')) ?></a></li>
        </ul>
      </div>
      <div>
        <h4><?= e(t('footer.contacts')) ?></h4>
        <div class="footer-contact">
          <?php if (!empty($settings['phone'])): ?><div><?= icon('phone') ?><a href="<?= e(tel_href($settings['phone'])) ?>"><?= e($settings['phone']) ?></a></div><?php endif ?>
          <?php if (!empty($settings['email'])): ?><div><?= icon('mail') ?><a href="mailto:<?= e($settings['email']) ?>"><?= e($settings['email']) ?></a></div><?php endif ?>
          <?php if (!empty($settings['address'])): ?><div><?= icon('pin') ?><span><?= e($settings['address']) ?></span></div><?php endif ?>
          <div><?= icon('clock') ?><span><?= e(t('footer.hours')) ?></span></div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <?= date('Y') ?> <?= e($site) ?>. <?= e(t('footer.rights')) ?></span>
      <div class="pay-icons"><span><?= e(t('footer.novaPoshta')) ?></span><span><?= e(t('checkout.pay1')) ?></span><span><?= e(t('checkout.pay2')) ?></span></div>
    </div>
  </div>
</footer>
