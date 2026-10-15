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
  if (process.env.COVER) await pg.coverage.startJSCoverage({ resetOnNavigation: false });
  await pg.goto(url); await pg.waitForTimeout(500);
  const out = await pg.evaluate((N) => {
    const prints = [];
    const fp = (o) => { let h = 2166136261; const rep = (k, v) => typeof v === 'function' ? undefined : v instanceof Map ? [...v] : v instanceof Set ? [...v] : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
      // (Where the state loops back on itself, each thing is written once, then marked.)
      let s; try { s = JSON.stringify(o, rep); } catch (e) { const seen = new WeakSet(); s = JSON.stringify(o, (k, v) => { v = rep(k, v); if (v && typeof v === 'object') { if (seen.has(v)) return '~'; seen.add(v); } return v; }); } for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16) + ':' + s.length; };
    // Keys by frame: walk, jump, hook up, climb, swing, strike, the flare.
    const plan = [[30, 'ArrowRight', 1], [200, 'ArrowRight', 0], [210, 'Space', 1], [220, 'Space', 0], [260, 'ArrowLeft', 1], [500, 'ArrowLeft', 0],
      [520, 'KeyW', 1], [700, 'KeyW', 0], [720, 'ArrowRight', 1], [900, 'ArrowRight', 0], [910, 'Space', 1], [915, 'Space', 0], [950, 'ShiftLeft', 1], [1000, 'ShiftLeft', 0],
      [1100, 'ArrowLeft', 1], [1400, 'ArrowLeft', 0], [1450, 'KeyW', 1], [1700, 'KeyW', 0], [1750, 'ArrowRight', 1], [2100, 'ArrowRight', 0], [2150, 'Space', 1], [2160, 'Space', 0]];
    const runs = [['climb', () => Game.climb()], ['gluttony', () => { const S0 = novSettings(); S0.domain = 'gluttony'; S0.demons = true; Game.novitiate(true); }], ['avarice', () => { const S0 = novSettings(); S0.domain = 'avarice'; S0.demons = true; Game.novitiate(true); }]];
    // Scenes, set up as the white room sets them: each starts right where a system is.
    const base = { title: 'test', mountain: 'gluttony', summit: false, metres: 0, place: 'any', demons: 1, near: [], great: 0, block: false, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false, seed: 7 };
    const scene = (o) => () => Game.scene(Object.assign({}, base, o));
    runs.push(['fight', scene({ near: [{ sin: 'gluttony', count: 2 }, { sin: 'wrath', count: 2 }] })],
      ['coins', scene({ mountain: 'avarice', near: [{ sin: 'avarice', count: 3 }] })],
      ['lust', scene({ mountain: 'lust', place: 'crossing', near: [{ sin: 'lust', count: 2 }] })],
      ['great', scene({ great: 2, block: true, demons: 0 })],
      ['summit', scene({ summit: true, block: true, mountain: 'wrath' })],
      ['boons', scene({ boon: 'friar', near: [{ sin: 'wrath', count: 1 }] })]);
    // The fighter: every half second, a tap on the nearest demon or great demon in reach (with an
    // arrow held in turn: none, up, down, across), else on the rock above him.
    const ARROWS = [null, 'ArrowUp', 'ArrowDown', 'ArrowRight'];
    const fighter = (f) => {
      if (f % 30 !== 15 || mode !== Climb || !Climb.S || Climb.S.dying) return;
      const S = Climb.S, near = [];
      for (const d of S.demons) if (!d.idol && !d.dead) near.push([d.x, d.y - (d.ht || 30) / 2]);
      for (const g of S.bigs || []) near.push([g.x, g.y - (g.ht || 60) / 2]);
      near.sort((a, b) => Math.hypot(a[0] - S.x, a[1] - S.y) - Math.hypot(b[0] - S.x, b[1] - S.y));
      const t = near.length && Math.hypot(near[0][0] - S.x, near[0][1] - S.y) < 260 ? near[0] : [S.x + 40, S.y - 140];
      const k = ARROWS[(f / 30 | 0) % 4]; if (k) mode.key(k, true, {});
      const p = { x: t[0] - S.cam.x, y: t[1] - S.cam.y }; mode.down(p, { pointerId: 7 }); mode.up(p, { pointerId: 7 });
      if (k) mode.key(k, false, {});
    };
    for (const [name, go] of runs) {
      go();
      for (let f = 0; f < N; f++) {
        for (const [at, k, d] of plan) if (at === f) mode.key(k, !!d, {});
        // A tap on the rock above him now and then (the hook), and on whatever is near.
        if (runs.findIndex((r) => r[0] === name) >= 3) fighter(f);
        else if (f % 240 === 120 && mode === Climb && Climb.S) { const S = Climb.S, p = { x: S.x - S.cam.x + 40, y: S.y - S.cam.y - 120 }; mode.down(p, { pointerId: 7 }); mode.up(p, { pointerId: 7 }); }
        window.__tick(1000 / 60);
        if (mode.step) mode.step(1 / 60); mode.draw(1 / 60);
        if (f % 100 === 99) prints.push(name + ' ' + (f + 1) + ' ' + (mode === Climb ? fp(Climb.S) : 'mode:' + Object.keys(window).find(k => window[k] === mode)));
      }
    }
    return prints;
  }, N);
  console.log(out.join('\n')); if (errs.length) console.log('ERRORS', errs);
  if (process.env.COVER) require('fs').writeFileSync(process.env.COVER, JSON.stringify(await pg.coverage.stopJSCoverage()));
  await b.close();
})();
