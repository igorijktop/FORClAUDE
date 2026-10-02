/* ONIKA admin panel — vanilla JS. */
(function () {
  'use strict';

  var A = window.ADMIN || {};
  var TT = A.t || {};

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  /* ---------------------------------------------------------------- toasts */
  function toast(msg, type) {
    var wrap = $('#toasts'); if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info') + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, type === 'error' ? 6000 : 3800);
  }
  (A.flash || []).forEach(function (f) { toast(f.message, f.type === 'ok' ? 'success' : 'error'); });

  /* -------------------------------------------------------------- theme */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    var root = document.documentElement, dark = root.getAttribute('data-theme') !== 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('onika_theme', dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
  });

  /* ------------------------------------------------------------- sidebar */
  var sidebar = $('#aSidebar'), overlay = $('#aOverlay');
  function navToggle(on) { sidebar.classList.toggle('on', on); overlay.classList.toggle('on', on); }
  var burger = $('#aBurger');
  if (burger) burger.addEventListener('click', function () { navToggle(!sidebar.classList.contains('on')); });
  if (overlay) overlay.addEventListener('click', function () { navToggle(false); });

  /* ------------------------------------------------- confirm modal (forms) */
  function confirmBox(message) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>' + esc(TT.confirm || 'Confirm') + '</h3><p>' + esc(message) + '</p>' +
        '<div class="row"><button type="button" class="btn btn-ghost btn-sm" data-no>' + esc(TT.cancel || 'Cancel') + '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-yes>' + esc(TT.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(back);
      var yes = $('[data-yes]', back), no = $('[data-no]', back);
      function done(v) { document.removeEventListener('keydown', onKey); back.remove(); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') done(false); }
      document.addEventListener('keydown', onKey);
      yes.addEventListener('click', function () { done(true); });
      no.addEventListener('click', function () { done(false); });
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      yes.focus();
    });
  }
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-confirm]');
    if (!form || form.__ok) return;
    e.preventDefault();
    confirmBox(form.dataset.confirm).then(function (ok) { if (ok) { form.__ok = true; form.requestSubmit ? form.requestSubmit() : form.submit(); } });
  });

  /* auto-submit selects (order status in lists) */
  document.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-autosubmit]');
    if (s && s.form) s.form.submit();
  });

  /* inline stock quantity in the product list: show the save button once the number changed */
  document.addEventListener('input', function (e) {
    var inp = e.target.closest('[data-stock-input]');
    if (!inp || !inp.form) return;
    var btn = inp.form.querySelector('[data-stock-save]');
    if (btn) btn.hidden = inp.value === inp.dataset.orig;
  });

  /* --------------------------------------------------------- product images */
  var list = $('#imgList'), drop = $('#dropZone'), fileInput = $('#fileInput');
  function tile(path, url, uploading) {
    var d = document.createElement('div');
    d.className = 'a-img' + (uploading ? ' uploading' : '');
    d.draggable = true;
    d.dataset.src = path || '';
    d.setAttribute('data-main', TT.main || 'Main');
    d.innerHTML = '<img src="' + esc(url) + '" alt="" width="120" height="150">' + (path ? '<input type="hidden" name="images[]" value="' + esc(path) + '">' : '') +
      '<span class="a-img-grip">' + icon('grip') + '</span><button type="button" class="a-img-del" data-remove-img aria-label="' + esc(TT.remove || 'Remove') + '">' + icon('x') + '</button>';
    return d;
  }
  function markMain() { $$('.a-img', list).forEach(function (t) { t.setAttribute('data-main', TT.main || 'Main'); }); }
  markMain();

  function upload(files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var placeholders = files.map(function (f) {
      var t = tile('', URL.createObjectURL(f), true); list.appendChild(t); return t;
    });
    var fd = new FormData();
    files.forEach(function (f) { fd.append('files[]', f); });
    fd.append('_csrf', A.csrf);
    fetch(A.api + '/upload', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': A.csrf, Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (r) {
        placeholders.forEach(function (p) { p.remove(); });
        if (!r.ok || !r.body.ok) { toast((r.body && r.body.error) || TT.uploadFailed, 'error'); return; }
        r.body.files.forEach(function (f) { list.appendChild(tile(f.path, f.url, false)); });
        if (r.body.files.length < files.length) toast(TT.uploadFailed, 'error');
        markMain();
      })
      .catch(function () { placeholders.forEach(function (p) { p.remove(); }); toast(TT.uploadFailed, 'error'); });
  }
  if (drop && fileInput && list) {
    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1) { e.preventDefault(); drop.classList.add('over'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) upload(e.dataTransfer.files); });
    fileInput.addEventListener('change', function () { upload(fileInput.files); fileInput.value = ''; });

    list.addEventListener('click', function (e) {
      var del = e.target.closest('[data-remove-img]');
      if (del) { del.closest('.a-img').remove(); markMain(); }
    });
    // drag to reorder
    var dragEl = null;
    list.addEventListener('dragstart', function (e) { var t = e.target.closest('.a-img'); if (!t) return; dragEl = t; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (er) { /* ignore */ } });
    list.addEventListener('dragend', function () { if (dragEl) dragEl.classList.remove('dragging'); dragEl = null; markMain(); });
    list.addEventListener('dragover', function (e) {
      if (!dragEl) return;
      e.preventDefault();
      var over = e.target.closest('.a-img');
      if (!over || over === dragEl) return;
      var r = over.getBoundingClientRect();
      var after = (e.clientX - r.left) > r.width / 2;
      list.insertBefore(dragEl, after ? over.nextSibling : over);
    });
  }

  /* ------------------------------------------------------ translate suggest */
  var tbtn = $('#translateSuggestBtn');
  if (tbtn) tbtn.addEventListener('click', function () {
    var name = ($('#' + tbtn.dataset.srcName) || {}).value || '';
    var desc = ($('#' + tbtn.dataset.srcDesc) || {}).value || '';
    var dst = (tbtn.dataset.dst || '').split(',');
    if (!name.trim() && !desc.trim()) { toast(TT.translateEmpty, 'error'); return; }
    var orig = tbtn.innerHTML;
    tbtn.disabled = true; tbtn.textContent = TT.translateWait || '…';
    fetch(A.api + '/api/translate', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': A.csrf }, body: JSON.stringify({ name: name, description: desc }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        tbtn.disabled = false; tbtn.innerHTML = orig;
        if (!j || !j.ok) { toast(TT.translateError, 'error'); return; }
        function set(id, v) { var el = $('#' + id); if (el && v) el.value = v; }
        set(dst[0], j.translations.ru.name); set(dst[1], j.translations.ru.description);
        set(dst[2], j.translations.en.name); set(dst[3], j.translations.en.description);
        toast(TT.translateDone, 'success');
      })
      .catch(function () { tbtn.disabled = false; tbtn.innerHTML = orig; toast(TT.translateError, 'error'); });
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
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[' + attr + ']');
      if (!b) return;
      var d = {}; try { d = JSON.parse(b.getAttribute(attr)); } catch (er) { /* ignore */ }
      fill(d);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var first = $('input:not([type=hidden])', form); if (first) first.focus({ preventScroll: true });
    });
    reset.addEventListener('click', function () { fill({}); });
  }
  bindEditor('data-edit-cat', 'catForm', 'cat', 'catFormTitle', 'catReset', TT.newCategory, TT.editCategory,
    { name: 'catName', description: 'catDesc', color: 'catColor', nameRu: 'catNameRu', nameEn: 'catNameEn', descRu: 'catDescRu', descEn: 'catDescEn' });
  bindEditor('data-edit-brand', 'brandForm', 'brand', 'brandFormTitle', 'brandReset', TT.newBrand, TT.editBrand,
    { name: 'brandName', description: 'brandDesc', nameRu: 'brandNameRu', nameEn: 'brandNameEn', descRu: 'brandDescRu', descEn: 'brandDescEn' });

  /* warn about unsaved product changes */
  var pf = $('#productForm');
  if (pf) {
    var dirty = false;
    pf.addEventListener('input', function () { dirty = true; });
    pf.addEventListener('submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    if (list) new MutationObserver(function () { dirty = true; }).observe(list, { childList: true });
  }
})();
