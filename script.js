// Print / PDF button
document.querySelector('[data-print]').addEventListener('click', () => window.print());

// Deck: on wide screens the sections pin into a split stage; scroll advances
// the pill rail and the plate stack in sync. Also marks the section in view in the token bar.
(() => {
    const root = document.documentElement;
    const deck = document.querySelector('.deck');
    const cards = deck.querySelector('.cards');
    // each job is its own plate; Experience holds too much for one
    const plates = [...cards.querySelectorAll('.cards > .row:not(#experience), #experience .job')];
    plates.forEach(s => s.classList.add('sheet'));
    const n = plates.length;
    const wide = matchMedia('screen and (min-width: 1100px) and (min-height: 860px)');
    const BAR = 56; // --bar-h
    const barLinks = [...document.querySelectorAll('.bar-links a')];

    const rail = document.createElement('div');
    rail.className = 'rail';
    rail.setAttribute('aria-hidden', 'true'); // ponytail: mirrors the token bar, which stays the real nav
    rail.innerHTML = '<ol class="pills">' + plates.map((s, i) =>
        `<li><a href="#${s.id}" tabindex="-1"><span>${String(i + 1).padStart(2, '0')}</span>${s.dataset.short}</a></li>`
    ).join('') + '</ol>';
    deck.querySelector('.stage').prepend(rail);
    const pills = [...rail.querySelectorAll('a')];

    const count = document.createElement('p');
    count.className = 'count label';
    count.setAttribute('aria-hidden', 'true');
    cards.append(count);

    const snaps = plates.map(() => deck.appendChild(Object.assign(document.createElement('div'), { className: 'snap' })));

    let step = 0, cur = -1, queued = false;

    const mark = i => {
        if (i === cur) return;
        cur = i;
        const set = (a, yes) => yes ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
        pills.forEach((a, k) => set(a, k === i));
        barLinks.forEach(a => set(a, !!plates[i].closest(a.hash)));
        count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
        if (root.classList.contains('deck-on')) plates.forEach((s, k) => { s.inert = k !== i; });
    };

    const update = () => {
        queued = false;
        if (!root.classList.contains('deck-on')) {
            // stacked rows: the last section whose top has passed 45% of the viewport
            let i = 0;
            plates.forEach((s, k) => { if (s.getBoundingClientRect().top < innerHeight * .45) i = k; });
            return mark(i);
        }
        let p = Math.min(n - 1, Math.max(0, (BAR - deck.getBoundingClientRect().top) / step));
        // browser zoom leaves snapped scroll on fractional pixels (p = 1.0001); without this the
        // resting plate counts as outgoing and drops under the next one
        if (Math.abs(p - Math.round(p)) < .01) p = Math.round(p);
        rail.style.setProperty('--p', p);
        plates.forEach((s, k) => {
            const d = k - p;
            s.style.setProperty('--d', d);
            s.style.zIndex = Math.round(d >= 0 ? 100 - d * 10 : 50 + d * 10); // outgoing plate slides under the incoming one
        });
        mark(Math.round(p));
    };

    const layout = () => {
        const on = wide.matches;
        root.classList.toggle('deck-on', on);
        if (on) {
            step = innerHeight * .8; // ponytail: scroll distance per plate, tune here
            deck.style.setProperty('--h', `${innerHeight - BAR + (n - 1) * step}px`);
            // snapped scrollY lands each plate exactly in place (offsets html's scroll-padding-top of bar + 24px)
            snaps.forEach((el, k) => { el.style.top = `${k * step + 24}px`; });
        } else {
            plates.forEach(s => { s.inert = false; });
        }
        cur = -1;
        update();
    };

    // in deck mode, section anchors jump to the plate's scroll position instead of the pinned element
    document.addEventListener('click', e => {
        const a = e.target.closest('.bar-links a, .pills a');
        const i = a ? plates.findIndex(s => s.closest(a.hash)) : -1;
        if (i < 0 || !root.classList.contains('deck-on')) return;
        e.preventDefault();
        scrollTo({ top: deck.getBoundingClientRect().top + scrollY - BAR + i * step });
    });

    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', layout);
    wide.addEventListener('change', layout);
    layout();
})();

// Halftone screen: dot size follows slow drifting "ink coverage" waves
(() => {
    const canvas = document.querySelector('.screen');
    const ctx = canvas.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const PITCH = 16, MAX_R = 1.6, INK = 'rgba(74, 77, 82, 0.55)'; // --ink-2
    const LENS = 130; // px radius the cursor swells
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let w, h, raf = 0, last = 0;
    // pointer target (tx, ty, on) eased into (px, py, amt) so the lens glides, not snaps
    let tx = -1e4, ty = -1e4, on = 0, px = -1e4, py = -1e4, amt = 0;

    const size = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        w = innerWidth; h = innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = t => {
        const s = t / 1000;
        px += (tx - px) * 0.18; py += (ty - py) * 0.18; amt += (on - amt) * 0.08;
        const reach = LENS * LENS * 4;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = INK;
        ctx.beginPath();
        for (let y = PITCH / 2; y < h; y += PITCH) {
            for (let x = PITCH / 2; x < w; x += PITCH) {
                // three slow waves crossing at different angles read as moving ink, not ripples
                const v = Math.sin(x * 0.006 + s * 0.35)
                        + Math.sin(y * 0.008 - s * 0.25)
                        + Math.sin((x + y) * 0.004 + s * 0.18);
                let r = MAX_R * Math.max(0, v / 3 + 0.15), dx = x, dy = y;
                if (amt > 0.01) {
                    const ox = x - px, oy = y - py, d2 = ox * ox + oy * oy;
                    if (d2 < reach) {
                        // gaussian swell plus a small outward push, like ink spreading under a loupe
                        const f = amt * Math.exp(-d2 / (LENS * LENS));
                        const d = Math.sqrt(d2) || 1;
                        r += MAX_R * 1.8 * f;
                        dx += ox / d * 7 * f; dy += oy / d * 7 * f;
                    }
                }
                if (r < 0.25) continue;
                ctx.moveTo(dx + r, dy);
                ctx.arc(dx, dy, r, 0, Math.PI * 2);
            }
        }
        ctx.fill();
    };

    // ponytail: ~30fps for the slow drift, full rate only while the lens is live
    const loop = t => {
        raf = requestAnimationFrame(loop);
        if (t - last < (amt > 0.01 || on ? 15 : 33)) return;
        last = t;
        draw(t);
    };
    const start = () => { if (!raf && !still.matches && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    addEventListener('pointermove', e => {
        if (!fine.matches || e.pointerType !== 'mouse') return;
        tx = e.clientX; ty = e.clientY;
        if (!on && amt < 0.05) { px = tx; py = ty; } // fresh contact: appear in place, don't fly in
        on = 1;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { on = 0; });
    addEventListener('blur', () => { on = 0; });

    addEventListener('resize', () => { size(); draw(performance.now()); });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    still.addEventListener('change', () => { stop(); draw(performance.now()); start(); });

    size();
    draw(performance.now()); // reduced motion keeps this one static frame
    start();
})();
