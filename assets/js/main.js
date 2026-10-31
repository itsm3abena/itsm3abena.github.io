/* =====================================================================
   ABENEZER.L — behaviour + motion
   ===================================================================== */
(function () {
    'use strict';

    var html = document.documentElement;
    html.classList.remove('no-js');
    html.classList.add('js');

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

    /* ----- helpers ----- */
    function setIndex(selector, root) {
        $$(selector, root).forEach(function (el, i) { el.style.setProperty('--i', i); });
    }

    /* wrap each character of an element's text nodes in <span class="ch"> (keeps child elements) */
    function splitChars(el, mask) {
        if (!el || el.dataset.split) return;
        var label = el.textContent.trim();
        var i = 0;
        Array.prototype.slice.call(el.childNodes).forEach(function (node) {
            if (node.nodeType !== 3 || !node.textContent.trim()) return;
            var frag = document.createDocumentFragment();
            var host = frag;
            if (mask) { host = document.createElement('span'); host.className = 'word'; frag.appendChild(host); }
            Array.prototype.forEach.call(node.textContent, function (chr) {
                var s = document.createElement('span');
                s.className = 'ch';
                s.textContent = chr;
                s.style.setProperty('--i', i++);
                s.setAttribute('aria-hidden', 'true');
                host.appendChild(s);
            });
            node.parentNode.replaceChild(frag, node);
        });
        el.setAttribute('aria-label', label);
        el.dataset.split = '1';
    }

    /* turn every digit inside el into a rolling odometer column */
    function odometer(el) {
        if (!el || el.dataset.odo) return;
        var targets = [];
        function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (n) {
                if (n.nodeType === 1) { if (n.tagName !== 'SUP') walk(n); return; }
                if (n.nodeType !== 3) return;
                var frag = document.createDocumentFragment();
                Array.prototype.forEach.call(n.textContent, function (chr) {
                    if (!/\d/.test(chr)) { frag.appendChild(document.createTextNode(chr)); return; }
                    var wrap = document.createElement('span'); wrap.className = 'odo';
                    var col = document.createElement('span'); col.className = 'odo-col';
                    for (var k = 0; k < 20; k++) { var d = document.createElement('span'); d.textContent = String(k % 10); col.appendChild(d); }
                    var digit = +chr;
                    col.style.setProperty('--n', digit + 10);   /* start one full turn away */
                    wrap.appendChild(col); frag.appendChild(wrap);
                    targets.push({ col: col, n: digit });
                });
                n.parentNode.replaceChild(frag, n);
            });
        }
        var label = el.textContent.trim();
        walk(el);
        el.setAttribute('aria-label', label);
        el.dataset.odo = '1';
        return function roll(delay) {
            setTimeout(function () {
                targets.forEach(function (t, i) {
                    setTimeout(function () { t.col.style.setProperty('--n', t.n); }, i * 140);
                });
            }, delay || 0);
        };
    }

    /* slot-machine flicker that settles on the element's own number */
    function slot(el, delay) {
        var final = el.textContent.trim();
        if (!/^\d+$/.test(final) || el.dataset.slotted) return;
        el.dataset.slotted = '1';
        if (reduceMotion) return;
        setTimeout(function () {
            var t = 0, step = 45, total = 620;
            var iv = setInterval(function () {
                t += step;
                if (t >= total) { clearInterval(iv); el.textContent = final; return; }
                var out = '';
                for (var i = 0; i < final.length; i++) {
                    /* digits lock in left to right */
                    out += (t > total * (0.45 + 0.35 * i / final.length)) ? final[i] : String(Math.floor(Math.random() * 10));
                }
                el.textContent = out;
            }, step);
        }, delay || 0);
    }

    /* ----- NAV ----- */
    window.myMenuFunction = function () { $('#myNavMenu').classList.toggle('responsive'); };
    $$('.nav-menu .nav-link').forEach(function (a) {
        a.addEventListener('click', function () { $('#myNavMenu').classList.remove('responsive'); });
    });
    var navHeader = $('#header');
    function headerShadow() { navHeader.classList.toggle('scrolled', window.scrollY > 40); }

    var sections = $$('section[id]');
    function scrollActive() {
        var y = window.scrollY + 120, current = null;
        sections.forEach(function (sec) { if (y >= sec.offsetTop) current = sec.id; });
        $$('.nav-menu .nav-link').forEach(function (a) {
            a.classList.toggle('active-link', a.getAttribute('href') === '#' + current);
        });
    }

    /* portrait parallax: 0 at top → 1 when the hero has scrolled past */
    var hero = $('.featured-box');
    function parallax() {
        if (!hero) return;
        var p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));
        hero.style.setProperty('--sy', p.toFixed(4));
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { headerShadow(); scrollActive(); parallax(); ticking = false; });
    }, { passive: true });
    headerShadow(); scrollActive(); parallax();

    /* ----- CONTACT FORM → mailto ----- */
    var form = $('#contactForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = form.name.value.trim(), email = form.email.value.trim(), msg = form.message.value.trim();
            if (!name || !msg) { form.reportValidity(); return; }
            var subject = encodeURIComponent('Portfolio contact from ' + name);
            var body = encodeURIComponent(msg + '\n\n— ' + name + (email ? ' <' + email + '>' : ''));
            window.location.href = 'mailto:itsm3abena@gmail.com?subject=' + subject + '&body=' + body;
        });
    }

    /* =================================================================
       PROJECTS ARCHIVE — expand / collapse
       ================================================================= */
    (function () {
        var btn = $('#moreBtn'), wrap = $('#projectsMore');
        if (!btn || !wrap) return;
        btn.addEventListener('click', function () {
            var open = !wrap.classList.contains('open');
            wrap.classList.toggle('open', open);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                /* reveal the archive cards even if the observer already saw them collapsed */
                setTimeout(function () { $$('[data-reveal]', wrap).forEach(function (el) { el.classList.add('is-in'); }); }, 120);
            } else {
                btn.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        });
    })();

    /* =================================================================
       CV VIEWER
       ================================================================= */
    (function () {
        var modal = $('#cvModal');
        if (!modal) return;
        var dialog = $('.cv-dialog', modal), frame = $('.cv-frame', modal), fallback = $('.cv-fallback', modal);
        var closeBtn = $('.cv-close', modal), lastFocus = null, loaded = false;
        var canInline = (typeof navigator.pdfViewerEnabled === 'boolean') ? navigator.pdfViewerEnabled : !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        function open() {
            lastFocus = document.activeElement;
            if (!loaded) {
                if (canInline) { frame.src = frame.getAttribute('data-src'); }
                else { frame.remove(); fallback.hidden = false; }
                loaded = true;
            }
            modal.hidden = false;
            document.body.classList.add('cv-open');
            requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('open'); }); });
            setTimeout(function () { closeBtn.focus(); }, 60);
            if (history.replaceState) history.replaceState(null, '', '#cv');
        }
        function close() {
            modal.classList.remove('open');
            document.body.classList.remove('cv-open');
            setTimeout(function () { modal.hidden = true; }, 450);
            if (history.replaceState && location.hash === '#cv') history.replaceState(null, '', location.pathname + location.search);
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        $$('[data-cv]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   /* let "open in new tab" through */
                e.preventDefault(); open();
            });
        });
        $$('[data-cv-close]', modal).forEach(function (el) { el.addEventListener('click', close); });
        document.addEventListener('keydown', function (e) {
            if (modal.hidden) return;
            if (e.key === 'Escape') { close(); return; }
            if (e.key === 'Tab') {   /* keep focus inside the dialog */
                var f = $$('a[href], button:not([disabled]), iframe', dialog);
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        if (location.hash === '#cv') open();
    })();

    /* =================================================================
       HERO INTRO — "printing" the four labels
       ================================================================= */
    var bento = $('.bento');
    var heroDelays = { 'hero-red': 0, 'hero-orange': .14, 'hero-green': .3, 'hero-grey': .4 };

    function prepHero() {
        if (!bento) return;
        $$('.bento > .card').forEach(function (card) {
            Object.keys(heroDelays).forEach(function (k) {
                if (card.classList.contains(k)) card.style.setProperty('--d', heroDelays[k] + 's');
            });
            var ph = document.createElement('span'); ph.className = 'printhead'; ph.setAttribute('aria-hidden', 'true');
            card.appendChild(ph);
        });
        splitChars($('.hero-orange .name'), true);
        splitChars($('.hero-red .jp'), false);
        splitChars($('.hero-green .big strong'), false);
        setIndex('.adsr .bar'); setIndex('.adsr .labels span'); setIndex('.spec .hd > *');
        setIndex('.spec .rows .spec-row'); setIndex('.spec .gauge svg'); setIndex('.hero-orange .jobs li');
        setIndex('.hero-orange .row-bot > *'); setIndex('.hero-orange .barcode rect'); setIndex('.hero-orange .pies svg');
        $$('.hero-green .sys, .hero-green .mid, .hero-green .big').forEach(function (el, i) { el.style.setProperty('--i', i); });
    }

    var rollGrey = odometer($('.hero-grey .num'));

    function startHero() {
        if (!bento || bento.classList.contains('is-in')) return;
        bento.classList.add('is-in');
        navHeader.classList.add('is-in');
        /* counters: flicker then settle, timed with the panel rows */
        $$('.hero-orange .spec .v').forEach(function (v, i) { slot(v, 1250 + i * 140); });
        if (rollGrey) rollGrey(reduceMotion ? 0 : 950);
    }

    /* once an intro animation finishes, hand control back to the cascade (so hover/tilt can transform again) */
    document.addEventListener('animationend', function (e) {
        var el = e.target;
        if (!(el instanceof Element) || !el.closest('.bento')) return;
        if (e.pseudoElement) return;
        el.style.animation = 'none';
    });

    prepHero();
    if (reduceMotion) {
        startHero();
    } else {
        var started = false;
        var go = function () { if (!started) { started = true; requestAnimationFrame(startHero); } };
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); }
        setTimeout(go, 1400);   /* never wait on a slow font CDN */
    }

    /* =================================================================
       SCROLL REVEAL
       ================================================================= */
    var revealSel = '.sec-head, .about-intro, .skills-box, .project-card, .contact-info, .form-card, footer > *';
    $$(revealSel).forEach(function (el) {
        el.setAttribute('data-reveal', '');
        /* stagger among siblings that also reveal */
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
        var idx = sibs.indexOf(el);
        el.style.setProperty('--rd', ((idx % 6) * .09).toFixed(2) + 's');
        setIndex('.chip', el); setIndex('.ledger .row', el);
    });
    $$('.sec-head h2').forEach(function (h) { splitChars(h, false); });

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                var el = en.target;
                el.classList.add('is-in');
                $$('.stats .v', el).forEach(function (v, i) { slot(v, 500 + i * 160); });
                io.unobserve(el);
            });
        }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
        $$('[data-reveal]').forEach(function (el) { io.observe(el); });
    } else {
        $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    }

    /* =================================================================
       POINTER — tilt + sheen on cards, magnetic buttons
       ================================================================= */
    if (finePointer && !reduceMotion) {
        $$('.card').forEach(function (card) {
            var rect = null;
            card.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); card.classList.add('tilting'); });
            card.addEventListener('pointermove', function (e) {
                if (!rect) rect = card.getBoundingClientRect();
                var px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
                var max = Math.min(4.5, 1500 / rect.width);          /* big cards tilt less */
                card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
                card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
                card.style.setProperty('--ry', ((px - .5) * 2 * max).toFixed(2) + 'deg');
                card.style.setProperty('--rx', ((.5 - py) * 2 * max).toFixed(2) + 'deg');
            });
            card.addEventListener('pointerleave', function () {
                rect = null;
                card.classList.remove('tilting');
                card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
            });
        });

        $$('.nav-button .btn, .form-button .btn, .about-intro .btn').forEach(function (el) {
            el.classList.add('magnet');
            var zone = el;
            zone.addEventListener('pointerenter', function () { el.classList.add('on'); });
            zone.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
                el.style.transform = 'translate(' + (dx * .28).toFixed(1) + 'px,' + (dy * .28).toFixed(1) + 'px)';
            });
            zone.addEventListener('pointerleave', function () { el.classList.remove('on'); el.style.transform = ''; });
        });
    }
})();
