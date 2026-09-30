<?php /** @var list<array{type:string,message:string}> $flash */ ?>
<?php foreach ($flash ?? [] as $f): ?>
  <div class="flash <?= $f['type'] === 'ok' ? 'ok' : 'err' ?>" role="<?= $f['type'] === 'ok' ? 'status' : 'alert' ?>"><?= icon($f['type'] === 'ok' ? 'checkCircle' : 'alert') ?> <span><?= e($f['message']) ?></span></div>
<?php endforeach ?>
