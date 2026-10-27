/* ONIKA admin panel — vanilla JS. */
(function () {
  'use strict';

  var A = window.ADMIN || {};
  var TT = A.t || {};
  var UP = A.upload || { maxBytes: 8388608, maxFiles: 12, maxImages: 20 };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function fmt(s, vars) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; }); }

  /* ---------------------------------------------------------------- toasts */
  function toast(msg, type) {
    var wrap = $('#toasts'); if (!wrap || !msg) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    if (type === 'error') el.setAttribute('role', 'alert');
    el.innerHTML = icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info') + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, type === 'error' ? 7000 : 3800);
  }
  (A.flash || []).forEach(function (f) { toast(f.message, f.type === 'ok' ? 'success' : 'error'); });

  /* inline error banners can be closed */
  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-dismiss]');
    if (x) { var box = x.closest('.a-flash'); if (box) box.remove(); }
  });

  /* -------------------------------------------------------------- theme */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    var root = document.documentElement, dark = root.getAttribute('data-theme') !== 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('onika_theme', dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
  });

  /* ------------------------------------------------- sidebar (mobile drawer) */
  var sidebar = $('#aSidebar'), overlay = $('#aOverlay'), burger = $('#aBurger');
  var drawerMq = window.matchMedia ? window.matchMedia('(max-width: 999px)') : null;
  function navOpen() { return !!(sidebar && sidebar.classList.contains('on')); }
  function navToggle(on) {
    if (!sidebar) return;
    sidebar.classList.toggle('on', on);
    if (overlay) overlay.classList.toggle('on', on);
    document.body.classList.toggle('a-nav-open', on);
    if (burger) burger.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { var first = $('.a-nav a.on', sidebar) || $('.a-nav a', sidebar); if (first) first.focus(); }
    else if (burger && sidebar.contains(document.activeElement)) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { navToggle(!navOpen()); });
  if (overlay) overlay.addEventListener('click', function () { navToggle(false); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-nav-close]')) navToggle(false); });
  document.addEventListener('keydown', function (e) {
    if (!navOpen() || !drawerMq || !drawerMq.matches) return;
    if (e.key === 'Escape') { navToggle(false); return; }
    if (e.key === 'Tab') { trapFocus(e, sidebar); }
  });
  if (drawerMq && drawerMq.addEventListener) drawerMq.addEventListener('change', function (m) { if (!m.matches) navToggle(false); });

  function trapFocus(e, box) {
    var f = $$('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ------------------------------------------------- confirm modal (forms) */
  var uid = 0;
  function confirmBox(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var prev = document.activeElement, id = 'cf' + (++uid);
      var back = document.createElement('div');
      back.className = 'modal-back a-modal-back';
      back.innerHTML = '<div class="modal a-modal ' + (opts.kind === 'warn' ? 'is-warn' : 'is-danger') + '" role="alertdialog" aria-modal="true" aria-labelledby="' + id + 't" aria-describedby="' + id + 'd">' +
        '<span class="a-modal-ic">' + icon(opts.kind === 'warn' ? 'alert' : 'trash') + '</span>' +
        '<h3 id="' + id + 't">' + esc(TT.confirm || 'Confirm') + '</h3>' +
        '<p id="' + id + 'd">' + esc(message) + (opts.name ? '<span class="a-modal-name">' + esc(opts.name) + '</span>' : '') + '</p>' +
        '<div class="row"><button type="button" class="btn btn-ghost btn-sm" data-no>' + esc(TT.cancel || 'Cancel') + '</button>' +
        '<button type="button" class="btn btn-sm ' + (opts.kind === 'warn' ? '' : 'btn-danger') + '" data-yes>' + esc(TT.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(back);
      var box = $('.modal', back), yes = $('[data-yes]', back), no = $('[data-no]', back);
      function done(v) {
        document.removeEventListener('keydown', onKey, true);
        back.remove();
        if (prev && prev.focus && document.contains(prev)) prev.focus();
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
        else if (e.key === 'Tab') trapFocus(e, box);
      }
      document.addEventListener('keydown', onKey, true);
      yes.addEventListener('click', function () { done(true); });
      no.addEventListener('click', function () { done(false); });
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      no.focus();
    });
  }
  function submitConfirmed(form) { form.__ok = true; if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-confirm]');
    if (!form) return;
    if (form.__ok) { form.__ok = false; return; }
    e.preventDefault();
    confirmBox(form.dataset.confirm, { name: form.dataset.confirmName, kind: form.dataset.confirmKind }).then(function (ok) { if (ok) submitConfirmed(form); });
  });

  /* order status: cancelling returns stock, so it is confirmed first */
  function isCancel(sel) { return sel && sel.value === 'cancelled' && (sel.dataset.orig || sel.form && sel.form.dataset.orig) !== 'cancelled'; }
  document.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-autosubmit]');
    if (!s || !s.form) return;
    if (isCancel(s)) {
      confirmBox(TT.cancelOrder, { kind: 'warn' }).then(function (ok) { if (ok) s.form.submit(); else s.value = s.dataset.orig || s.value; });
      return;
    }
    s.form.submit();
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-status-form]');
    if (!form) return;
    if (form.__ok) { form.__ok = false; return; }
    var sel = form.querySelector('select[name=status]');
    if (!isCancel(sel)) return;
    e.preventDefault();
    confirmBox(TT.cancelOrder, { kind: 'warn' }).then(function (ok) { if (ok) submitConfirmed(form); });
  });

  /* ------------------------------------- inline stock quantity in the list */
  function stockState(inp) {
    var v = inp.value.trim(), ok = /^\d+$/.test(v) && +v <= 99999;
    inp.setCustomValidity(ok ? '' : fmt(TT.stockInvalid, { max: 99999 }));
    inp.classList.toggle('is-zero', ok && +v === 0);
    inp.classList.toggle('is-bad', !ok);
    var btn = inp.form && inp.form.querySelector('[data-stock-save]');
    if (btn) btn.hidden = v === inp.dataset.orig;
    return ok;
  }
  document.addEventListener('input', function (e) {
    var inp = e.target.closest('[data-stock-input]');
    if (inp && inp.form) stockState(inp);
  });
  document.addEventListener('keydown', function (e) {
    var inp = e.target.closest && e.target.closest('[data-stock-input]');
    if (inp && e.key === 'Escape') { inp.value = inp.dataset.orig; stockState(inp); inp.blur(); }
  });
  document.addEventListener('submit', function (e) {
    var inp = e.target.querySelector && e.target.querySelector('[data-stock-input]');
    if (!inp) return;
    if (!stockState(inp)) { e.preventDefault(); toast(fmt(TT.stockInvalid, { max: 99999 }), 'error'); inp.focus(); return; }
    if (inp.value.trim() === inp.dataset.orig) e.preventDefault();   // nothing changed: no reload
  });

  /* --------------------------------------------------------- product images */
  var list = $('#imgList'), drop = $('#dropZone'), fileInput = $('#fileInput'), live = null;
  function say(msg) {
    if (!live) { live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30);
  }
  function tools() {
    return '<span class="a-img-tools"><button type="button" data-move="-1" aria-label="' + esc(TT.moveLeft) + '" title="' + esc(TT.moveLeft) + '">' + icon('chevronLeft') + '</button>' +
      '<button type="button" data-make-main aria-label="' + esc(TT.makeMain) + '" title="' + esc(TT.makeMain) + '">' + icon('star') + '</button>' +
      '<button type="button" data-move="1" aria-label="' + esc(TT.moveRight) + '" title="' + esc(TT.moveRight) + '">' + icon('chevronRight') + '</button></span>';
  }
  function tile(path, url, uploading) {
    var d = document.createElement('div');
    d.className = 'a-img' + (uploading ? ' uploading' : '');
    d.draggable = !uploading;
    d.dataset.src = path || '';
    if (!uploading) d.tabIndex = 0;
    d.innerHTML = '<img src="' + esc(url) + '" alt="" width="120" height="150">' + (path ? '<input type="hidden" name="images[]" value="' + esc(path) + '">' : '') +
      (uploading ? '' : '<span class="a-img-grip" aria-hidden="true">' + icon('grip') + '</span><button type="button" class="a-img-del" data-remove-img aria-label="' + esc(TT.remove || 'Remove') + '" title="' + esc(TT.remove || 'Remove') + '">' + icon('x') + '</button>' + tools());
    return d;
  }
  function tiles() { return $$('.a-img:not(.uploading)', list); }
  function markMain() {
    if (!list) return;
    var all = tiles();
    all.forEach(function (t, i) {
      t.setAttribute('data-main', TT.main || 'Main');
      t.setAttribute('aria-label', fmt(TT.imageN, { n: i + 1, total: all.length }) + (i === 0 ? ' — ' + (TT.main || 'Main') : ''));
      var l = $('[data-move="-1"]', t), r = $('[data-move="1"]', t), m = $('[data-make-main]', t);
      if (l) l.disabled = i === 0; if (r) r.disabled = i === all.length - 1; if (m) m.disabled = i === 0;
    });
    var c = $('#imgCount'); if (c) c.textContent = all.length;
  }
  function move(t, dir, keepFocus) {
    var all = tiles(), i = all.indexOf(t), j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    if (dir < 0) list.insertBefore(t, all[j]); else list.insertBefore(t, all[j].nextSibling);
    markMain(); if (keepFocus) t.focus();
    say(t.getAttribute('aria-label'));
  }
  function removeTile(t) {
    var all = tiles(), i = all.indexOf(t);
    t.remove(); markMain();
    var next = tiles()[Math.min(i, tiles().length - 1)];
    if (next) next.focus(); else if (drop) drop.focus();
  }

  function upload(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    var errs = [], ok = [];
    files.forEach(function (f) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) errs.push(fmt(TT.badType, { name: f.name }));
      else if (f.size > UP.maxBytes) errs.push(fmt(TT.tooBig, { name: f.name, mb: Math.round(UP.maxBytes / 1048576) }));
      else ok.push(f);
    });
    if (ok.length > UP.maxFiles) { errs.push(fmt(TT.tooMany, { n: UP.maxFiles })); ok = ok.slice(0, UP.maxFiles); }
    if (tiles().length + ok.length > UP.maxImages) errs.push(fmt(TT.imagesLimit, { n: UP.maxImages }));
    if (errs.length) toast(errs.join(' '), 'error');
    if (!ok.length) return;
    var placeholders = ok.map(function (f) { var t = tile('', URL.createObjectURL(f), true); list.appendChild(t); return t; });
    if (drop) drop.classList.add('busy');
    var fd = new FormData();
    ok.forEach(function (f) { fd.append('files[]', f); });
    fd.append('_csrf', A.csrf);
    fetch(A.api + '/upload', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': A.csrf, Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, body: j || {} }; }); })
      .then(function (r) {
        placeholders.forEach(function (p) { URL.revokeObjectURL($('img', p).src); p.remove(); });
        if (drop) drop.classList.remove('busy');
        if (!r.ok || !r.body.ok) { toast(r.body.error || TT.uploadFailed, 'error'); return; }
        r.body.files.forEach(function (f) { list.appendChild(tile(f.path, f.url, false)); });
        if (r.body.rejected && r.body.rejected.length) toast(r.body.rejected.join(' '), 'error');
        markMain();
      })
      .catch(function () { placeholders.forEach(function (p) { p.remove(); }); if (drop) drop.classList.remove('busy'); toast(TT.uploadFailed, 'error'); });
  }
  if (drop && fileInput && list) {
    markMain();
    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1; }
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (hasFiles(e)) { e.preventDefault(); drop.classList.add('over'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) upload(e.dataTransfer.files); });
    fileInput.addEventListener('change', function () { upload(fileInput.files); fileInput.value = ''; });
    // files dropped next to the zone must not open in the browser tab
    window.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', function (e) { if (hasFiles(e)) { e.preventDefault(); if (!e.target.closest('#dropZone')) upload(e.dataTransfer.files); } });

    list.addEventListener('click', function (e) {
      var t = e.target.closest('.a-img'); if (!t) return;
      if (e.target.closest('[data-remove-img]')) { removeTile(t); return; }
      var mv = e.target.closest('[data-move]');
      if (mv) { move(t, +mv.dataset.move, false); var b = $('[data-move="' + mv.dataset.move + '"]', t); if (b && !b.disabled) b.focus(); else t.focus(); return; }
      if (e.target.closest('[data-make-main]')) { list.insertBefore(t, tiles()[0]); markMain(); t.focus(); say(t.getAttribute('aria-label')); }
    });
    // keyboard: ← / → move the focused photo, Home makes it the main one, Delete removes it
    list.addEventListener('keydown', function (e) {
      var t = e.target.classList && e.target.classList.contains('a-img') ? e.target : null;
      if (!t) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(t, -1, true); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(t, 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); list.insertBefore(t, tiles()[0]); markMain(); t.focus(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeTile(t); }
    });
    // mouse: drag to reorder
    var dragEl = null;
    list.addEventListener('dragstart', function (e) { var t = e.target.closest('.a-img'); if (!t || t.classList.contains('uploading')) return; dragEl = t; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (er) { /* ignore */ } });
    list.addEventListener('dragend', function () { if (dragEl) dragEl.classList.remove('dragging'); dragEl = null; markMain(); });
    list.addEventListener('dragover', function (e) {
      if (!dragEl) return;
      e.preventDefault();
      var over = e.target.closest('.a-img');
      if (!over || over === dragEl || over.classList.contains('uploading')) return;
      var r = over.getBoundingClientRect();
      var after = (e.clientX - r.left) > r.width / 2;
      list.insertBefore(dragEl, after ? over.nextSibling : over);
    });
    list.addEventListener('drop', function (e) { if (dragEl) e.preventDefault(); });
  }

  /* ------------------------------------------------------ translate suggest */
  var tbtn = $('#translateSuggestBtn');
  if (tbtn) tbtn.addEventListener('click', function () {
    var name = ($('#' + tbtn.dataset.srcName) || {}).value || '';
    var desc = ($('#' + tbtn.dataset.srcDesc) || {}).value || '';
    var dst = (tbtn.dataset.dst || '').split(',');
    if (!name.trim() && !desc.trim()) { toast(TT.translateEmpty, 'error'); return; }
    var orig = tbtn.innerHTML;
    tbtn.disabled = true; tbtn.classList.add('is-loading'); tbtn.textContent = TT.translateWait || '…';
    function reset() { tbtn.disabled = false; tbtn.classList.remove('is-loading'); tbtn.innerHTML = orig; }
    fetch(A.api + '/api/translate', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': A.csrf }, body: JSON.stringify({ name: name, description: desc }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        reset();
        if (!j || !j.ok) { toast(TT.translateError, 'error'); return; }
        function set(id, v) { var el = $('#' + id); if (el && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }
        set(dst[0], j.translations.ru.name); set(dst[1], j.translations.ru.description);
        set(dst[2], j.translations.en.name); set(dst[3], j.translations.en.description);
        toast(TT.translateDone, 'success');
      })
      .catch(function () { reset(); toast(TT.translateError, 'error'); });
  });

  /* ---------------------------------------- category / brand inline editing */
  function bindEditor(attr, formId, prefix, titleId, resetId, newTitle, editTitle, fields) {
    var form = $('#' + formId);
    if (!form) return;
    var title = $('#' + titleId), reset = $('#' + resetId);
    function fill(d) {
      Object.keys(fields).forEach(function (k) { var el = $('#' + fields[k]); if (el) el.value = d[k] || (k === 'color' ? '#e11d74' : ''); });
      $('#' + prefix + 'Id').value = d.id || '';
      title.textContent = d.id ? editTitle : newTitle;
      reset.hidden = !d.id;
      $$('.field.has-error', form).forEach(function (f) { f.classList.remove('has-error'); var er = $('.err', f); if (er) er.remove(); var i = $('[aria-invalid]', f); if (i) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); } });
      form.closest('.a-card').classList.toggle('is-editing', !!d.id);
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[' + attr + ']');
      if (!b) return;
      var d = {}; try { d = JSON.parse(b.getAttribute(attr)); } catch (er) { /* ignore */ }
      fill(d);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var first = $('input:not([type=hidden])', form); if (first) first.focus({ preventScroll: true });
    });
    reset.addEventListener('click', function () { fill({}); var first = $('input:not([type=hidden])', form); if (first) first.focus(); });
    if ($('#' + prefix + 'Id').value) form.closest('.a-card').classList.add('is-editing');
  }
  bindEditor('data-edit-cat', 'catForm', 'cat', 'catFormTitle', 'catReset', TT.newCategory, TT.editCategory,
    { name: 'catName', description: 'catDesc', color: 'catColor', nameRu: 'catNameRu', nameEn: 'catNameEn', descRu: 'catDescRu', descEn: 'catDescEn' });
  bindEditor('data-edit-brand', 'brandForm', 'brand', 'brandFormTitle', 'brandReset', TT.newBrand, TT.editBrand,
    { name: 'brandName', description: 'brandDesc', nameRu: 'brandNameRu', nameEn: 'brandNameEn', descRu: 'brandDescRu', descEn: 'brandDescEn' });

  /* first invalid field gets the focus after a failed save */
  var firstBad = $('.a-content .field.has-error input, .a-content .field.has-error textarea, .a-content .field.has-error select');
  if (firstBad) { firstBad.focus({ preventScroll: true }); firstBad.scrollIntoView({ block: 'center' }); }
  /* editing a field clears its error mark */
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.field.has-error');
    if (f) { f.classList.remove('has-error'); e.target.removeAttribute('aria-invalid'); }
  });

  /* warn about unsaved product changes */
  var pf = $('#productForm');
  if (pf) {
    var dirty = pf.hasAttribute('data-has-errors');
    pf.addEventListener('input', function () { dirty = true; });
    pf.addEventListener('change', function () { dirty = true; });
    pf.addEventListener('submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    if (list) new MutationObserver(function () { dirty = true; }).observe(list, { childList: true });
    var st = $('#f-stock');
    if (st) st.addEventListener('input', function () { st.classList.toggle('is-zero', st.value.trim() === '0'); });
  }

  /* no double submits: the pressed button shows a spinner until the next page */
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    var form = e.target, btn = e.submitter || $('button[type=submit], button:not([type])', form);
    if (form.method.toLowerCase() !== 'post' || !btn) return;
    if (form.__busy) { e.preventDefault(); return; }
    form.__busy = true;
    btn.classList.add('is-loading');
    setTimeout(function () { form.__busy = false; btn.classList.remove('is-loading'); }, 8000);
  });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    $$('form').forEach(function (f) { f.__busy = false; });
    $$('.is-loading').forEach(function (b) { b.classList.remove('is-loading'); });
  });
})();
