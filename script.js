// Print / PDF button
document.querySelector('[data-print]').addEventListener('click', () => window.print());

// Mark the section in view in the token bar
const links = new Map(
    [...document.querySelectorAll('.bar-links a')].map(a => [a.hash.slice(1), a])
);
const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
        const link = links.get(e.target.id);
        if (!link) return;
        if (e.isIntersecting) {
            links.forEach(a => a.removeAttribute('aria-current'));
            link.setAttribute('aria-current', 'true');
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });
links.forEach((_, id) => spy.observe(document.getElementById(id)));

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
