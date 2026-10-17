// IB Solutions Global — page motion and the tour players.
// Everything here is an enhancement: without it the page reads top to
// bottom, the tours stay embedded, and "Click through it" opens Supademo.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var embed = function (id) { return 'https://app.supademo.com/embed/' + id + '?embed_v=2&utm_source=embed'; };

  /* ── Split headings into words that rise into place ── */
  $$('[data-split]').forEach(function (el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span');
            var inner = document.createElement('span');
            outer.className = 'sw'; inner.className = 'si';
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    Array.prototype.slice.call(el.children).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
  });

  /* ── Words that fill in as you scroll ── */
  var fills = $$('[data-fill]').map(function (el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'fw';
            w.textContent = part;
            words.push(w);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    return { el: el, words: words, lit: -1 };
  });

  /* ── Pill labels: a second copy rolls up on hover ── */
  $$('.pill-label').forEach(function (label) {
    var text = label.textContent;
    label.textContent = '';
    var a = document.createElement('span'); a.textContent = text;
    var b = document.createElement('span'); b.textContent = text; b.setAttribute('aria-hidden', 'true');
    label.appendChild(a); label.appendChild(b);
  });

  /* ── Reveal on scroll ── */
  $$('.trades, .haul-list').forEach(function (list) {
    $$('[data-reveal]', list).forEach(function (el, i) { el.style.setProperty('--d', i % 2); });
  });
  $$('.plans tbody tr').forEach(function (tr, i) { tr.style.setProperty('--d', i); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal], [data-split]:not(.hero-title)').forEach(function (el) { io.observe(el); });

  /* ── Preloader, then the hero entrance ── */
  var hero = $('.hero');
  function startHero() {
    hero.classList.add('is-in');
    $('.hero-title').classList.add('is-in');
  }
  if (root.classList.contains('is-loading')) {
    var loader = $('.loader');
    var num = $('.loader-count b');
    var t0 = performance.now(), dur = 1300;
    (function tick(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var n = Math.round(e * 100);
      num.textContent = n;
      loader.style.setProperty('--n', n);
      if (p < 1) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        root.classList.add('is-loaded');
        setTimeout(startHero, 250);
        setTimeout(function () { root.classList.remove('is-loading', 'is-loaded'); }, 1100);
      }, 200);
    })(t0);
  } else {
    requestAnimationFrame(startHero);
  }

  /* ── Hero: rotating facts ── */
  var factRows = $$('.facts-show > span').map(function (r) { return $$('b', r); });
  if (factRows.length && !reduce) {
    var fi = 0;
    setInterval(function () {
      var nx = (fi + 1) % factRows[0].length;
      factRows.forEach(function (list) {
        var old = list[fi], nw = list[nx];
        old.classList.remove('on'); old.classList.add('out');
        nw.classList.add('reset'); nw.classList.remove('out'); void nw.offsetWidth;
        nw.classList.remove('reset'); nw.classList.add('on');
        setTimeout(function () { old.classList.add('reset'); old.classList.remove('out'); void old.offsetWidth; old.classList.remove('reset'); }, 900);
      });
      fi = nx;
    }, 2800);
  }

  /* ── Hero: leaves drift with the pointer ── */
  var leaves = $$('.hero-art svg, .leaf-big').map(function (el, i) {
    el.classList.add('parallax');
    return { el: el, depth: [18, 30, 40, 14][i] || 20 };
  });
  var mx = 0, my = 0, cx = 0, cy = 0;
  if (fine && !reduce) {
    addEventListener('pointermove', function (e) {
      mx = e.clientX / innerWidth - .5;
      my = e.clientY / innerHeight - .5;
    }, { passive: true });
  }

  /* ── Header, menu and back-to-top ── */
  var header = $('.site-header');
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  var toTop = $('.to-top');
  var darkZones = $$('[data-header="dark"]');
  var lastY = scrollY;

  function setMenu(open) {
    if (open) {
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 800);
    }
    header.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
  }
  menuBtn.setAttribute('aria-label', 'Open the menu');
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () { if (a.getAttribute('href').charAt(0) === '#') setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  // Keep Tab inside the open menu (the header's buttons stay reachable)
  document.addEventListener('focusin', function (e) {
    if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
    if (!menu.contains(e.target) && !header.contains(e.target)) $('a', menu).focus();
  });

  function overDark(y) {
    for (var i = 0; i < darkZones.length; i++) {
      var r = darkZones[i].getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) return true;
    }
    return false;
  }

  /* ── The 2-minute tour frame opens out ── */
  var tourFrame = $('.tour-frame');

  /* ── Marquees: drift, faster while you scroll ── */
  var marquees = $$('.marquee-track').map(function (track) {
    var items = Array.prototype.slice.call(track.children);
    for (var k = 0; k < 3; k++) items.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
    return { track: track, x: 0, w: 0, dir: track.closest('.marquee-sm') ? 1 : -1 };
  });
  function measureMarquees() {
    marquees.forEach(function (m) { m.w = m.track.scrollWidth / 4; });
  }

  /* ── The day track: pinned, moves sideways as you scroll ── */
  var day = $('.day');
  var dayPin = $('.day-pin');
  var dayTrack = $('.day-track');
  var pinMQ = matchMedia('(min-width: 900px) and (min-height: 600px)');
  var dayDist = 0;
  function setupDay() {
    var on = pinMQ.matches && !reduce;
    day.classList.toggle('is-pinned', on);
    dayTrack.style.transform = '';
    if (!on) { day.style.height = ''; dayDist = 0; return; }
    dayDist = Math.max(0, dayTrack.scrollWidth - innerWidth);
    day.style.height = (innerHeight + dayDist) + 'px';
  }
  // Tabbing into a card: scroll the page to where that card is in view
  dayTrack.addEventListener('focusin', function (e) {
    if (!day.classList.contains('is-pinned')) return;
    dayPin.scrollLeft = 0;
    var card = e.target.closest('.day-intro, .day-card, .day-end');
    if (!card) return;
    var gutter = parseFloat(getComputedStyle(dayTrack).paddingLeft) || 0;
    var x = card.offsetLeft + (card.parentElement.classList.contains('day-list') ? card.parentElement.offsetLeft : 0) - gutter;
    var p = clamp(x / (dayDist || 1), 0, 1);
    scrollTo({ top: day.offsetTop + p * dayDist, behavior: 'auto' });
  });

  /* ── Scroll-linked pieces ── */
  var localSection = $('.local');
  var localBar = $('.local-progress');
  var stepsWrap = $('.steps-wrap');
  var stepsLine = $('.steps-line');
  var stepItems = $$('.steps li');

  function onFrame() {
    var y = scrollY, vh = innerHeight;

    // header
    header.classList.toggle('is-scrolled', y > 30);
    if (!header.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY + 4 && y > vh * .6);
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    header.classList.toggle('on-dark', overDark(40));
    lastY = y;

    // back to top
    var max = document.documentElement.scrollHeight - vh;
    toTop.classList.toggle('is-shown', y > vh * .8);
    toTop.style.setProperty('--p', clamp(y / (max || 1), 0, 1));
    toTop.classList.toggle('on-dark', overDark(vh - 46));

    // tour frame
    if (tourFrame && !reduce) {
      var r = tourFrame.getBoundingClientRect();
      var open = clamp((vh - r.top) / (vh * .75), 0, 1);
      tourFrame.style.setProperty('--open', open.toFixed(3));
    }

    // words filling in
    fills.forEach(function (f) {
      var r = f.el.getBoundingClientRect();
      var p = clamp((vh * .85 - r.top) / (r.height + vh * .35), 0, 1);
      if (reduce) p = r.top < vh ? 1 : 0;
      var lit = Math.round(p * f.words.length) - 1;
      if (lit === f.lit) return;
      f.words.forEach(function (w, i) { w.classList.toggle('on', i <= lit); });
      f.lit = lit;
    });

    // day track
    if (dayDist) {
      var p2 = clamp((y - day.offsetTop) / dayDist, 0, 1);
      dayTrack.style.transform = 'translate3d(' + (-p2 * dayDist).toFixed(1) + 'px,0,0)';
    }

    // Built in Accra progress bar
    if (localSection && localBar) {
      var lr = localSection.getBoundingClientRect();
      localBar.style.setProperty('--p', clamp((vh * .5 - lr.top) / (lr.height - vh * .5), 0, 1).toFixed(3));
    }

    // onboarding line and dots
    if (stepsWrap) {
      var sr = stepsWrap.getBoundingClientRect();
      var sp = reduce ? 1 : clamp((vh * .8 - sr.top) / (vh * .45), 0, 1);
      if (stepsLine) stepsLine.style.setProperty('--p', sp.toFixed(3));
      stepItems.forEach(function (li, i) { li.classList.toggle('on', sp >= i / Math.max(1, stepItems.length - 1) - .001 && sp > 0); });
    }
  }

  function loop() {
    // marquees and the pointer parallax run every frame; the rest only on scroll
    if (!reduce) {
      var v = Math.abs(scrollY - (loop.y || scrollY));
      loop.y = scrollY;
      var boost = 1 + Math.min(v, 60) / 6;
      marquees.forEach(function (m) {
        if (!m.w) return;
        m.x += m.dir * .5 * boost;
        if (m.x <= -m.w) m.x += m.w;
        if (m.x > 0) m.x -= m.w;
        m.track.style.transform = 'translate3d(' + m.x.toFixed(1) + 'px,0,0)';
      });
      cx += (mx - cx) * .06; cy += (my - cy) * .06;
      var hy = Math.min(scrollY, innerHeight);
      leaves.forEach(function (l) {
        l.el.style.transform = 'translate3d(' + (cx * l.depth).toFixed(2) + 'px,' + (cy * l.depth - hy * l.depth / 160).toFixed(2) + 'px,0)';
      });
    }
    if (loop.dirty) { loop.dirty = false; onFrame(); }
    requestAnimationFrame(loop);
  }
  addEventListener('scroll', function () { loop.dirty = true; }, { passive: true });

  function layout() {
    setupDay();
    measureMarquees();
    loop.dirty = true;
  }
  addEventListener('resize', layout);
  if (pinMQ.addEventListener) pinMQ.addEventListener('change', layout);
  addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
  requestAnimationFrame(loop);

  /* ── Magnetic pills ── */
  if (fine && !reduce) {
    $$('.pill, .menu-btn, .to-top').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width;
        var dy = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.translate = (dx * 8).toFixed(1) + 'px ' + (dy * 6).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ── Feature tour player: one frame, any tour ── */
  var playerFrame = $('.player-frame');
  var playerIframe = playerFrame && $('iframe', playerFrame);
  var playerCaption = $('.player-caption strong');
  $$('.player-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      if (item.getAttribute('aria-current') === 'true') return;
      $$('.player-item').forEach(function (o) { o.removeAttribute('aria-current'); });
      item.setAttribute('aria-current', 'true');
      var title = item.getAttribute('data-title');
      playerCaption.textContent = title;
      playerFrame.classList.add('is-swapping');
      setTimeout(function () {
        playerIframe.title = 'Feature tour: ' + title;
        playerIframe.src = embed(item.getAttribute('data-tour'));
        var shown = false;
        var show = function () { if (shown) return; shown = true; playerFrame.classList.remove('is-swapping'); };
        playerIframe.addEventListener('load', show, { once: true });
        setTimeout(show, 1500);
      }, reduce ? 0 : 320);
      if (innerWidth < 1000) playerFrame.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
  });

  /* ── Tour pop-up for "Click through it" ── */
  var modal = $('.tour-modal');
  var modalTitle = $('#tour-modal-title');
  var modalFrame = $('.tour-modal-frame');
  var opener = null;
  function closeModal() {
    if (!modal.open) return;
    if (reduce) { modal.close(); return; }
    modal.classList.add('is-closing');
    setTimeout(function () { modal.classList.remove('is-closing'); modal.close(); }, 330);
  }
  if (modal && typeof modal.showModal === 'function') {
    $$('[data-tour]:not(.player-item)').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        opener = link;
        var title = link.getAttribute('data-title');
        modalTitle.textContent = title;
        modalFrame.innerHTML = '';
        var f = document.createElement('iframe');
        f.src = embed(link.getAttribute('data-tour'));
        f.title = 'Tour: ' + title;
        f.allow = 'clipboard-write';
        f.allowFullscreen = true;
        modalFrame.appendChild(f);
        modal.showModal();
        document.body.style.overflow = 'hidden';
      });
    });
    $('.tour-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
    modal.addEventListener('close', function () {
      modalFrame.innerHTML = '';
      document.body.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    });
  }
})();
