// IBS Help Centre — search, chapter menu on small screens, and "on this page" highlighting.
(function () {
    'use strict';

    // ---- chapter menu (small screens) -----------------------------------
    var menuBtn = document.querySelector('.menu-btn');
    var sidebar = document.getElementById('sidebar');
    var scrim = document.querySelector('.scrim');

    function setMenu(open) {
        if (!sidebar) return;
        sidebar.classList.toggle('is-open', open);
        if (scrim) scrim.hidden = !open;
        if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            var current = sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector('a');
            if (current) current.focus({ preventScroll: false });
        }
    }
    if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('is-open')); });
    if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
    if (sidebar) sidebar.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenu(false);
    });

    // ---- search -----------------------------------------------------------
    var items = null;
    function norm(s) {
        return String(s).toLowerCase().replace(/[‘’]/g, "'");
    }
    function getItems() {
        if (items) return items;
        items = (window.HELP_SEARCH || []).map(function (it) {
            return { t: it.t, p: it.p, u: it.u, x: it.x, nt: norm(it.t), np: norm(it.p), nx: norm(it.x) };
        });
        return items;
    }
    function tokenize(q) {
        return norm(q).split(/[^a-z0-9]+/).filter(Boolean);
    }
    function wordStart(hay, tok) {
        var i = hay.indexOf(tok);
        while (i !== -1) {
            if (i === 0 || !/[a-z0-9]/.test(hay.charAt(i - 1))) return true;
            i = hay.indexOf(tok, i + 1);
        }
        return false;
    }
    function count(hay, tok, max) {
        var n = 0, i = hay.indexOf(tok);
        while (i !== -1 && n < max) { n++; i = hay.indexOf(tok, i + tok.length); }
        return n;
    }

    function search(q) {
        var tokens = tokenize(q);
        if (!tokens.length) return [];
        var phrase = tokens.join(' ');
        var results = [];
        getItems().forEach(function (it) {
            var score = 0;
            for (var k = 0; k < tokens.length; k++) {
                var tok = tokens[k];
                var inT = it.nt.indexOf(tok) !== -1, inP = it.np.indexOf(tok) !== -1, inX = it.nx.indexOf(tok) !== -1;
                if (!inT && !inP && !inX) return;
                if (inT) score += wordStart(it.nt, tok) ? 14 : 6;
                if (inP) score += 2;
                if (inX) score += (wordStart(it.nx, tok) ? 2 : 1) * Math.min(count(it.nx, tok, 6), 6) * 0.6;
            }
            if (tokens.length > 1) {
                if (it.nt.indexOf(phrase) !== -1) score += 24;
                else if (it.nx.indexOf(phrase) !== -1) score += 8;
            }
            if (it.nt.replace(/[^a-z0-9]+/g, ' ').trim() === phrase) score += 30;
            results.push({ it: it, score: score });
        });
        results.sort(function (a, b) { return b.score - a.score; });
        return results.slice(0, 10).map(function (r) { return r.it; });
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function highlight(text, tokens) {
        if (!tokens.length) return escapeHtml(text);
        var re = new RegExp('(' + tokens.slice().sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'gi');
        return text.split(re).map(function (part, i) {
            return i % 2 ? '<mark>' + escapeHtml(part) + '</mark>' : escapeHtml(part);
        }).join('');
    }
    function snippet(it, tokens) {
        var hay = it.x.toLowerCase(), at = -1;
        tokens.forEach(function (t) {
            var i = hay.indexOf(t);
            if (i !== -1 && (at === -1 || i < at)) at = i;
        });
        if (at === -1) return it.x.slice(0, 140) + (it.x.length > 140 ? '…' : '');
        var start = Math.max(0, at - 50);
        if (start > 0) { var sp = it.x.indexOf(' ', start); if (sp !== -1 && sp < at) start = sp + 1; }
        var end = Math.min(it.x.length, start + 160);
        return (start > 0 ? '…' : '') + it.x.slice(start, end) + (end < it.x.length ? '…' : '');
    }

    document.querySelectorAll('.search').forEach(function (box, n) {
        var input = box.querySelector('.search-input');
        var list = box.querySelector('.search-results');
        if (!input || !list) return;
        list.id = 'search-results-' + n;
        input.setAttribute('aria-controls', list.id);
        var active = -1;

        function links() { return list.querySelectorAll('a'); }
        function setActive(i) {
            var all = links();
            if (!all.length) return;
            active = (i + all.length) % all.length;
            all.forEach(function (a, k) { a.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
            all[active].scrollIntoView({ block: 'nearest' });
            input.setAttribute('aria-activedescendant', all[active].id);
        }
        function close() {
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            active = -1;
        }
        function render() {
            var q = input.value.trim();
            if (!q) { list.innerHTML = ''; close(); return; }
            var tokens = tokenize(q);
            var found = search(q);
            if (!found.length) {
                list.innerHTML = '<p class="search-empty">No matches for “' + escapeHtml(q) + '”. Try a different word, such as “sale” or “stock”.</p>';
            } else {
                list.innerHTML = found.map(function (it, k) {
                    return '<a role="option" id="' + list.id + '-' + k + '" href="' + escapeHtml(it.u) + '">' +
                        '<span class="sr-title">' + highlight(it.t, tokens) + '</span>' +
                        (it.p ? '<span class="sr-path">' + escapeHtml(it.p) + '</span>' : '') +
                        (it.x ? '<span class="sr-snippet">' + highlight(snippet(it, tokens), tokens) + '</span>' : '') +
                        '</a>';
                }).join('');
            }
            list.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            active = -1;
            if (found.length) setActive(0);
        }

        input.addEventListener('input', render);
        input.addEventListener('focus', function () { if (input.value.trim()) render(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
            else if (e.key === 'Enter') {
                var all = links();
                if (all.length) { e.preventDefault(); window.location.href = all[Math.max(active, 0)].getAttribute('href'); close(); }
            } else if (e.key === 'Escape') {
                if (!list.hidden) close(); else { input.value = ''; input.blur(); }
            }
        });
        list.addEventListener('click', function () { close(); });
        document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('is-open')) { setMenu(false); if (menuBtn) menuBtn.focus(); }
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
        var el = document.activeElement;
        if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
        var input = document.querySelector('.search-input');
        if (input) { e.preventDefault(); input.focus(); input.select(); }
    });

    // ---- "on this page" highlighting -------------------------------------
    var headings = Array.prototype.slice.call(document.querySelectorAll('.doc h2[id], .doc h3[id]'));
    if (!headings.length) return;
    var tocLinks = {}, navLinks = {};
    document.querySelectorAll('.on-this-page a').forEach(function (a) { tocLinks[a.getAttribute('href').slice(1)] = a; });
    document.querySelectorAll('.nav-sections a').forEach(function (a) { navLinks[a.getAttribute('href').slice(1)] = a; });
    var current = null, ticking = false;

    function update() {
        ticking = false;
        var line = 120, hit = null, h2 = null;
        for (var i = 0; i < headings.length; i++) {
            if (headings[i].getBoundingClientRect().top > line) break;
            hit = headings[i];
            if (hit.tagName === 'H2') h2 = hit;
        }
        // At the very bottom, the last heading counts as current.
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2) {
            hit = headings[headings.length - 1];
            for (var j = headings.length - 1; j >= 0; j--) if (headings[j].tagName === 'H2') { h2 = headings[j]; break; }
        }
        var id = hit ? hit.id : null;
        if (id === current) return;
        current = id;
        Object.keys(tocLinks).forEach(function (k) { tocLinks[k].classList.toggle('is-active', k === id); });
        Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.toggle('is-active', !!h2 && k === h2.id); });
        if (id && tocLinks[id]) {
            var box = tocLinks[id].closest('.on-this-page');
            var r = tocLinks[id].getBoundingClientRect(), b = box.getBoundingClientRect();
            if (r.top < b.top + 40 || r.bottom > b.bottom - 40) box.scrollTop += r.top - b.top - b.height / 3;
        }
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
})();
