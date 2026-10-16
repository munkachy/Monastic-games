// Great demons: where they come on Gluttony after a block is found; that they throw; that a block
// striking one is cut free, and the summit's still takes it.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  // 1. Placement, over several mountains' seeds: with no block, none; with a block found at
  //    place 4, which places get one (as populate would ask, in order).
  const plan = await pg.evaluate(() => {
    const out = [];
    for (const sd of [1, 2, 3, 4, 5]) {
      const N = novSettings(); N.domain = 'gluttony'; N.demons = true; store(); Game.novitiate(true);
      seed = sd; secs.length = 0; rows = new Map(); slots = new Map();
      const K = summitK(), got = [];
      S.blockK = undefined; S.greatN = 0; for (let k = 0; k < K; k++) { ensureSecs(k); if (planGreat(k)) got.push(k); }
      const none = got.length;
      S.blockK = 4; S.greatN = 0; S.greatK = undefined; got.length = 0;
      for (let k = 0; k < K; k++) { ensureSecs(k); const P = planGreat(k); if (P) { got.push(k + ':t' + P.tier); S.greatK = k; S.greatN++; } }
      out.push(`seed ${sd}: summit at ${K}; no block: ${none}; block at 4: ${got.join(' ')}`);
    }
    return out;
  });
  console.log(plan.join('\n'));
  // 2. A great demon beside him: does it throw, and how soon?
  const base = { title: 't', mountain: 'gluttony', summit: false, metres: 0, place: 'any', demons: 0, near: [], great: 1, block: true, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false, seed: 3 };
  await pg.evaluate((b) => { Game.scene(b); const S = Climb.S, g = S.bigs[0]; g.x = S.x + 200; g.y = S.y; const f = dFree(g.x, g.y - 30, g.hw, g.ht); if (f) { g.x = f[0]; g.y = f[1]; } g.st = 'stone'; g.hp = g.maxHp = 99; S.dir = 1; }, base); await pg.waitForTimeout(300);
  const t = await pg.evaluate(async () => {
    const g = Climb.S.bigs[0];
    const times = [], t0 = Climb.S.rt; let n = 0;
    for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); const c = Climb.record ? 0 : 0; const fat = Climb.S.things.filter(o => o.kind === 'fat').length; if (fat > n) { times.push(+(Climb.S.rt - t0).toFixed(1)); n = fat; } }
    return { throws: times, st: g.st, wake: +g.wake.toFixed(2), dist: Math.round(Math.hypot(g.x - Climb.S.x, g.y - Climb.S.y)) };
  });
  console.log('throws at (s):', JSON.stringify(t));
  // 3. The block, struck into it: cut free. And the summit's: taken.
  const cut = await pg.evaluate(() => {
    const S = Climb.S, g = S.bigs[0], blk = S.tied; if (!g || !blk) return 'no great or no block';
    S.latched = null; g.st = 'stone'; g.hitCd = 0; g.stunT = 0; blk.vx = 300; blk.vy = 0; strikeGreat(g, blk);
    return { tied: !!S.tied, st: blk.st, hp: g.hp + '/' + g.maxHp, laugh: !!g.laugh };
  });
  console.log('ordinary, struck:', JSON.stringify(cut));
  await pg.evaluate((b) => Game.scene(Object.assign({}, b, { great: 0, summit: true })), base); await pg.waitForTimeout(1500);
  const boss = await pg.evaluate(() => {
    const S = Climb.S, g = S.bigs.find(x => x.summit), blk = S.tied; if (!g || !blk) return 'no boss or no block';
    S.latched = null; g.st = 'stone'; g.hitCd = 0; g.stunT = 0; blk.vx = 300; blk.vy = 0; strikeGreat(g, blk);
    return { tied: !!S.tied, st: blk.st, laugh: !!g.laugh };
  });
  console.log('summit, struck:', JSON.stringify(boss));
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
