// node replay.js URL [frames]: plays the climb with everything fixed (Math.random seeded, the clock
// stepped by hand, the same keys at the same frames) and prints a fingerprint of the climb's state
// every 100 frames. Run it against two versions of the game: if play is unchanged, they match.
// e.g. node replay.js http://localhost:8100/while-you-have-the-light/index.html
const { chromium } = require('playwright');
const url = process.argv[2], N = +(process.argv[3] || 2400);
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.addInitScript(() => {
    let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let now = 1000; performance.now = () => now; Date.now = () => 1.7e12 + now; window.__tick = (ms) => { now += ms; };
    window.requestAnimationFrame = () => 0;
    try { localStorage.clear(); } catch (e) { }
  });
  await pg.goto(url); await pg.waitForTimeout(500);
  const out = await pg.evaluate((N) => {
    const prints = [];
    const fp = (o) => { let h = 2166136261; const s = JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v instanceof Map ? [...v] : v instanceof Set ? [...v] : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16) + ':' + s.length; };
    // Keys by frame: walk, jump, hook up, climb, swing, strike, the flare.
    const plan = [[30, 'ArrowRight', 1], [200, 'ArrowRight', 0], [210, 'Space', 1], [220, 'Space', 0], [260, 'ArrowLeft', 1], [500, 'ArrowLeft', 0],
      [520, 'KeyW', 1], [700, 'KeyW', 0], [720, 'ArrowRight', 1], [900, 'ArrowRight', 0], [910, 'Space', 1], [915, 'Space', 0], [950, 'ShiftLeft', 1], [1000, 'ShiftLeft', 0],
      [1100, 'ArrowLeft', 1], [1400, 'ArrowLeft', 0], [1450, 'KeyW', 1], [1700, 'KeyW', 0], [1750, 'ArrowRight', 1], [2100, 'ArrowRight', 0], [2150, 'Space', 1], [2160, 'Space', 0]];
    const runs = [['climb', () => Game.climb()], ['gluttony', () => { const S0 = novSettings(); S0.domain = 'gluttony'; S0.demons = true; Game.novitiate(true); }], ['avarice', () => { const S0 = novSettings(); S0.domain = 'avarice'; S0.demons = true; Game.novitiate(true); }]];
    for (const [name, go] of runs) {
      go();
      for (let f = 0; f < N; f++) {
        for (const [at, k, d] of plan) if (at === f) mode.key(k, !!d, {});
        // A tap on the rock above him now and then (the hook), and on whatever is near.
        if (f % 240 === 120 && mode === Climb && Climb.S) { const S = Climb.S, p = { x: S.x - S.cam.x + 40, y: S.y - S.cam.y - 120 }; mode.down(p, { pointerId: 7 }); mode.up(p, { pointerId: 7 }); }
        window.__tick(1000 / 60);
        if (mode.step) mode.step(1 / 60); mode.draw(1 / 60);
        if (f % 100 === 99) prints.push(name + ' ' + (f + 1) + ' ' + (mode === Climb ? fp(Climb.S) : 'mode:' + Object.keys(window).find(k => window[k] === mode)));
      }
    }
    return prints;
  }, N);
  console.log(out.join('\n')); if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
