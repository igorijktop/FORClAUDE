(function () {
  'use strict';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* sidebar */
  var burger = $('#aBurger');
  var sidebar = $('#aSidebar');
  var overlay = $('#aOverlay');
  function closeNav() {
    if (sidebar) sidebar.classList.remove('on');
    if (overlay) overlay.classList.remove('on');
  }
  if (burger) burger.addEventListener('click', function () {
    sidebar.classList.toggle('on');
    overlay.classList.toggle('on');
  });
  if (overlay) overlay.addEventListener('click', closeNav);

  /* confirm deletes */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-confirm]');
    if (form && !window.confirm(form.dataset.confirm)) {
      e.preventDefault();
    }
  });

  /* image upload / preview */
  var drop = $('#dropZone');
  var fileInput = $('#fileInput');
  var preview = $('#imagePreview');

  function tile(src) {
    return '<div class="a-img-tile" data-src="' + src.replace(/"/g, '&quot;') + '">' +
      '<img src="' + src + '" alt="">' +
      '<button type="button" class="a-img-del" data-remove-img title="Видалити">' +
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button></div>';
  }

  function fileUrl(file) {
    if (!file.__url) file.__url = URL.createObjectURL(file);
    return file.__url;
  }

  var pendingFiles = [];
  if (drop && fileInput) {
    drop.addEventListener('click', function () { fileInput.click(); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    });
    fileInput.addEventListener('change', function () {
      addFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type)) return;
      pendingFiles.push(f);
      if (preview) preview.insertAdjacentHTML('beforeend', tile(fileUrl(f)));
    });
    syncFiles();
  }

  function syncFiles() {
    if (!fileInput) return;
    var dt = new DataTransfer();
    pendingFiles.forEach(function (f) { dt.items.add(f); });
    fileInput.files = dt.files;
  }

  document.addEventListener('click', function (e) {
    var del = e.target.closest('[data-remove-img]');
    if (!del) return;
    e.preventDefault();
    var t = del.closest('.a-img-tile');
    var src = t.dataset.src;
    pendingFiles = pendingFiles.filter(function (f) { return fileUrl(f) !== src; });
    syncFiles();
    t.remove();
    syncExisting();
  });

  function syncExisting() {
    var ex = $('#existingImages');
    if (!ex) return;
    var srcs = $$('#imagePreview .a-img-tile').map(function (t) { return t.dataset.src; })
      .filter(function (s) { return s.indexOf('blob:') !== 0; });
    ex.value = srcs.join('\n');
  }

  if (preview) {
    new MutationObserver(syncExisting).observe(preview, { childList: true });
    syncExisting();
  }

  /* language dropdown */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.lang-toggle');
    if (toggle) {
      var sw = toggle.closest('.lang-switch');
      var open = sw.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    var opt = e.target.closest('.lang-opt');
    if (opt) {
      e.preventDefault();
      var targetLang = opt.dataset.lang || 'uk';
      document.cookie = 'lang=' + targetLang + '; path=/; max-age=31536000; samesite=lax';
      var currentSearch = window.location.search;
      var pathname = window.location.pathname;
      pathname = pathname.replace(/^\/(ru|en)(?=\/|$)/, '') || '/';
      var newPath = (targetLang === 'uk' ? '' : '/' + targetLang) + (pathname === '/' && targetLang !== 'uk' ? '' : pathname);
      if (!newPath) newPath = '/';
      window.location.href = newPath + currentSearch;
      return;
    }
    if (!e.target.closest('.lang-switch')) {
      $$('.lang-switch.open').forEach(function (s) { s.classList.remove('open'); });
    }
  });

  /* suggest translations (UK -> RU/EN): product, category, brand forms */
  function wireSuggest(btnId, srcName, srcDesc, dst) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var form = btn.closest('form') || document;
      function val(name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value : '';
      }
      function setVal(id, v) {
        var el = document.getElementById(id);
        if (el && v) el.value = v;
      }
      var name = val(srcName || 'name');
      var description = val(srcDesc || 'description');
      var okBox = $('#translateSuggestOk');
      var errBox = $('#translateSuggestErr');
      if (form.id === 'catForm' || form.id === 'brandForm') {
        if (!okBox) { okBox = document.createElement('div'); okBox.className = 'a-flash ok'; okBox.style.display = 'none'; form.insertBefore(okBox, form.firstChild); }
        if (!errBox) { errBox = document.createElement('div'); errBox.className = 'a-flash err'; errBox.style.display = 'none'; form.insertBefore(errBox, form.firstChild); }
      }
      function show(box, msg) {
        if (!box) return;
        box.textContent = msg;
        box.style.display = 'flex';
      }
      function hide(box) { if (box) box.style.display = 'none'; }
      hide(okBox); hide(errBox);
      if (!name.trim() && !description.trim()) {
        show(errBox, (window.__T && window.__T.translateEmpty) || 'Fill in the Ukrainian name or description first');
        return;
      }
      var orig = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = (window.__T && window.__T.translateWait) || 'Translating…';
      fetch('/admin/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF || '' },
        body: JSON.stringify({ name: name, description: description })
      }).then(function (r) { return r.json(); }).then(function (j) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (!j || !j.ok || !j.translations) {
          show(errBox, (window.__T && window.__T.translateError) || 'Translation failed');
          return;
        }
        var ru = j.translations.ru || {};
        var en = j.translations.en || {};
        if (dst) {
          setVal(dst.nameRu, ru.name); setVal(dst.descRu, ru.description);
          setVal(dst.nameEn, en.name); setVal(dst.descEn, en.description);
        } else {
          setVal('nameRu', ru.name); setVal('descRu', ru.description);
          setVal('nameEn', en.name); setVal('descEn', en.description);
        }
        show(okBox, (window.__T && window.__T.translateDone) || 'Translation suggested');
      }).catch(function () {
        btn.disabled = false;
        btn.innerHTML = orig;
        show(errBox, (window.__T && window.__T.translateError) || 'Translation failed');
      });
    });
  }
  wireSuggest('translateSuggestBtn');
  wireSuggest('catTranslateBtn', 'name', 'description', { nameRu: 'catNameRu', descRu: 'catDescRu', nameEn: 'catNameEn', descEn: 'catDescEn' });
  wireSuggest('brandTranslateBtn', 'name', 'description', { nameRu: 'brandNameRu', descRu: 'brandDescRu', nameEn: 'brandNameEn', descEn: 'brandDescEn' });

  /* CSRF token injection into all forms */
  var CSRF = window.__CSRF || '';
  function injectCsrf() {
    if (!CSRF) return;
    $$('form').forEach(function (f) {
      if (f.querySelector('input[name="_csrf"]')) return;
      var i = document.createElement('input');
      i.type = 'hidden';
      i.name = '_csrf';
      i.value = CSRF;
      f.appendChild(i);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCsrf);
  else injectCsrf();
})();
