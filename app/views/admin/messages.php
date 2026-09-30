<?php /** @var list $items */ ?>
<section class="a-card">
  <div class="a-card-head"><h2><?= e(t('admin.messages')) ?> · <?= count($items) ?></h2></div>
  <div class="a-messages">
    <?php foreach ($items as $m): $mid = (int) $m['id']; $unread = !(int) $m['is_read']; ?>
      <article class="a-message<?= $unread ? ' unread' : '' ?>">
        <div class="a-message-head">
          <span class="a-avatar"><?= e(initial((string) $m['name'])) ?></span>
          <div class="grow"><b><?= e($m['name']) ?></b> <?php if ($unread): ?><span class="pill blue"><?= e(t('admin.new')) ?></span><?php endif ?>
            <div class="small muted"><?= e($m['contact']) ?> · <?= e(dt($m['created_at'], true)) ?> · <?= e(strtoupper((string) $m['lang'])) ?></div></div>
          <div class="a-actions">
            <?php $c = (string) $m['contact']; if (str_contains($c, '@')): ?><a class="a-icon-btn" href="mailto:<?= e($c) ?>" title="<?= e(t('contacts.email')) ?>"><?= icon('mail') ?></a>
            <?php elseif (preg_match('/\d{7,}/', $c)): ?><a class="a-icon-btn" href="<?= e(tel_href($c)) ?>" title="<?= e(t('contacts.phone')) ?>"><?= icon('phone') ?></a><?php endif ?>
            <form method="post" action="<?= e(purl('/admin/messages/' . $mid . '/read')) ?>"><?= csrf_field() ?><input type="hidden" name="read" value="<?= $unread ? '1' : '0' ?>">
              <button class="a-icon-btn" title="<?= e($unread ? t('admin.markRead') : t('admin.markUnread')) ?>"><?= icon($unread ? 'check' : 'inbox') ?></button></form>
            <form method="post" action="<?= e(purl('/admin/messages/' . $mid . '/delete')) ?>" data-confirm="<?= e(t('admin.deleteMessage')) ?>"><?= csrf_field() ?><button class="a-icon-btn danger" title="<?= e(t('admin.delete')) ?>"><?= icon('trash') ?></button></form>
          </div>
        </div>
        <p class="a-message-body"><?= nl2br(e($m['message'])) ?></p>
      </article>
    <?php endforeach ?>
    <?php if (!$items): ?><div class="a-empty"><?= e(t('admin.messagesEmpty')) ?></div><?php endif ?>
  </div>
</section>
