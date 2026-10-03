/* ONIKA — storefront effects: floating hearts / sparkles / bubbles, hero parallax,
   "fly to cart", heart bursts and the back-to-top bubble.
   Purely decorative: nothing here is needed for the shop to work, and everything
   except the back-to-top button is skipped for visitors who prefer reduced motion. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && matchMedia('(max-width: 720px)').matches;
  var weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
  var density = weak ? .5 : (small ? .6 : 1);

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function T(key) { var t = window.ONIKA && window.ONIKA.t; return (t && t[key]) || ''; }
  function raf(fn) { var busy = false; return function () { if (busy) return; busy = true; requestAnimationFrame(function () { busy = false; fn(); }); }; }

  var PINKS = ['#ff9ac6', '#ff7fb6', '#ffb3d6', '#f55ba5'];
  var SOFT = ['#ffc2dd', '#ffd4b8', '#e0ceff', '#ffb3d6'];

  function shape(kind, parent, props) {
    var s = doc.createElement('i');
    s.className = 'fx-shape fx-' + kind;
    for (var k in props) s.style.setProperty(k, props[k]);
    parent.appendChild(s);
    return s;
  }

  /* -------------------------------------------------- twinkling sky sparkles */
  var sky = doc.querySelector('.fx-sky');
  if (sky && !reduce) {
    var n = Math.round(9 * density);
    for (var i = 0; i < n; i++) {
      var sp = shape('star', sky, {
        left: rnd(2, 97).toFixed(1) + '%', top: rnd(4, 94).toFixed(1) + '%', '--s': rnd(10, 22).toFixed(0) + 'px',
        '--c': pick(PINKS), '--dur': rnd(3.2, 6.5).toFixed(1) + 's', '--delay': (-rnd(0, 6)).toFixed(1) + 's',
      });
      sp.classList.add('fx-sparkle');
    }
  }

  /* ----------------------------------- rising hearts / bubbles inside a card */
  var fields = [];
  function makeField(host, count) {
    if (!host || reduce) return;
    var field = doc.createElement('div');
    field.className = 'fx-field';
    field.setAttribute('aria-hidden', 'true');
    host.insertBefore(field, host.firstChild);
    var kinds = ['heart', 'heart', 'bubble', 'bubble', 'star', 'petal'];
    for (var i = 0; i < count; i++) {
      var kind = pick(kinds);
      var size = kind === 'bubble' ? rnd(16, 46) : kind === 'star' ? rnd(10, 20) : rnd(12, 24);
      var dur = rnd(15, 30);
      var s = shape(kind, field, {
        '--x': rnd(3, 96).toFixed(1) + '%', '--s': size.toFixed(0) + 'px', '--c': pick(kind === 'petal' ? SOFT : PINKS),
        '--dur': dur.toFixed(1) + 's', '--delay': (-rnd(0, dur)).toFixed(1) + 's', '--sway': rnd(-40, 40).toFixed(0) + 'px',
        '--spin': rnd(-50, 50).toFixed(0) + 'deg', '--o': rnd(.5, .9).toFixed(2),
      });
      s.classList.add('fx-rise');
    }
    fields.push({ host: host, field: field });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { field.classList.toggle('paused', !en[0].isIntersecting); }).observe(host);
    }
  }
  function sizeFields() {
    fields.forEach(function (f) { f.field.style.setProperty('--rise', (f.host.clientHeight + 80) + 'px'); });
  }
  makeField(doc.querySelector('.hero-card'), Math.round(15 * density));
  makeField(doc.querySelector('.newsletter'), Math.round(8 * density));
  sizeFields();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(sizeFields, 200); });

  /* ------------------------------------------------- hero parallax (mouse) */
  var hero = doc.querySelector('.hero-card');
  if (hero && !reduce && window.matchMedia && matchMedia('(hover: hover)').matches) {
    var tx = 0, ty = 0;
    var apply = raf(function () { hero.style.setProperty('--mx', tx.toFixed(3)); hero.style.setProperty('--my', ty.toFixed(3)); });
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 2;
      ty = ((e.clientY - r.top) / r.height - .5) * 2;
      apply();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; apply(); }, { passive: true });
  }

  /* ----------------------------------------- scroll: backdrop drift + to-top */
  var toTop = doc.createElement('button');
  toTop.type = 'button';
  toTop.className = 'fx-top';
  toTop.setAttribute('aria-label', T('common.toTop') || 'Back to top');
  toTop.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  doc.body.appendChild(toTop);
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  var onScroll = raf(function () {
    var y = window.scrollY || window.pageYOffset || 0;
    toTop.classList.toggle('on', y > 700);
    if (sky && !reduce) sky.style.setProperty('--sy', y.toFixed(0));
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (reduce) return;

  /* ------------------------------------------------------------ bursts & fly */
  function burst(x, y, kind, count) {
    for (var i = 0; i < count; i++) {
      var p = shape(kind, doc.body, { '--s': rnd(9, 17).toFixed(0) + 'px', '--c': pick(PINKS), left: x + 'px', top: y + 'px' });
      p.className += ' fx-burst';
      var a = rnd(-Math.PI * .95, -Math.PI * .05), d = rnd(38, 92);
      p.animate([
        { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (Math.cos(a) * d).toFixed(0) + 'px,' + (Math.sin(a) * d - 14).toFixed(0) + 'px) scale(1.1) rotate(' + rnd(-40, 40).toFixed(0) + 'deg)', opacity: 1, offset: .6 },
        { transform: 'translate(' + (Math.cos(a) * d * 1.2).toFixed(0) + 'px,' + (Math.sin(a) * d - 46).toFixed(0) + 'px) scale(.7) rotate(' + rnd(-60, 60).toFixed(0) + 'deg)', opacity: 0 },
      ], { duration: rnd(650, 950), easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = (function (node) { return function () { node.remove(); }; })(p);
    }
  }

  function fly(img) {
    var cart = doc.getElementById('cartBtn');
    if (!cart || !img || !img.getBoundingClientRect) return;
    var r = img.getBoundingClientRect(), c = cart.getBoundingClientRect();
    if (!r.width || !c.width || !img.animate) return;
    var w = 76, h = 96;
    var ghost = doc.createElement('img');
    ghost.className = 'fx-fly';
    ghost.alt = '';
    ghost.src = img.currentSrc || img.src;
    var sx = r.left + r.width / 2 - w / 2, sy = r.top + r.height / 2 - h / 2;
    var ex = c.left + c.width / 2 - w / 2, ey = c.top + c.height / 2 - h / 2;
    var mx = (sx + ex) / 2, my = Math.min(sy, ey) - 80;
    doc.body.appendChild(ghost);
    ghost.animate([
      { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(.72) rotate(-9deg)', opacity: 1, offset: .55 },
      { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.1) rotate(14deg)', opacity: .15 },
    ], { duration: 820, easing: 'cubic-bezier(.45,0,.25,1)' }).onfinish = function () {
      ghost.remove();
      cart.classList.remove('wiggle'); void cart.offsetWidth; cart.classList.add('wiggle');
      burst(c.left + c.width / 2, c.top + c.height / 2, 'star', 6);
    };
  }

  doc.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add && !add.disabled) {
      var card = add.closest('.pcard');
      fly(card && card.querySelector('img.main'));
      return;
    }
    var main = e.target.closest('#addToCartBtn, #buybarBtn');
    if (main && !main.disabled) {
      // a size has to be chosen first; otherwise the page only highlights the size picker
      if (doc.querySelector('input[name=size]') && !doc.querySelector('input[name=size]:checked')) return;
      fly(doc.getElementById('galleryImg'));
    }
  }, true);

  doc.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (!fav) return;
    // app.js has already toggled the state by now (its listener was registered first)
    if (!(fav.classList.contains('on') || fav.getAttribute('aria-pressed') === 'true')) return;
    var r = fav.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 'heart', 7);
  });
})();
