// node check-cart.js: a block into a lay brother's cart, out again (the action button, a tap), and back.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  const wait = (ms) => pg.waitForTimeout(ms);
  const st = () => pg.evaluate(() => { const S = Climb.S, G = cartAt(S.x, S.y); return `tied=${S.tied ? S.tied.st : '-'} binned=${S.binned} cart=${G ? G.bin.filter(b => b.st === 'bin' || b.st === 'tobin').length : 'none'} label=${(() => { const lab = S.latched ? "STRIKE" : S.rope || S.hang ? "LET GO" : S.cling ? "LEAP" : S.held || (S.tied && S.tied.st === "hand") ? "DROP" : !S.tied && S.ground && cartAt(S.x, S.y, true) ? "TAKE" : ""; return lab; })()}`; });
  const ok = await pg.evaluate(() => {
    const N = novSettings(); N.domain = 'gluttony'; N.demons = false; store(); Game.novitiate(true);
    const S = Climb.S;
    for (let k = 0; k < 40; k++) { ensureSecs(k); const G = brotherOf(secs[k]); if (G) { S.x = G.cart; S.y = G.y; S.vx = S.vy = 0; S.ground = true; S.blockSeen = true;
      S.cam.x = S.x - W / 2; S.cam.y = S.y - H * 0.62; S.popK = Math.max(S.popK, k + 1);
      const blk = makeBlock('T', 'gluttony'); blk.x = S.x; blk.y = S.y; S.blocks.push(blk); tie(blk); S.say = null; return 'cart at section ' + k; } }
    return null;
  });
  console.log(ok); await wait(1200); console.log('delivered:   ', await st());
  await pg.evaluate(() => { Climb.S.say = null; action(); }); await wait(600); console.log('took out:    ', await st());
  await wait(1200); console.log('stayed:      ', await st());
  await pg.keyboard.down('ArrowRight'); await wait(1600); await pg.keyboard.up('ArrowRight'); console.log('walked off:  ', await st());
  await pg.keyboard.down('ArrowLeft'); await wait(1700); await pg.keyboard.up('ArrowLeft'); await wait(800); console.log('came back:   ', await st());
  // The tap: out, and back in.
  const tap = () => pg.evaluate(() => { const S = Climb.S, G = cartAt(S.x, S.y); if (!G) return 'no cart'; const p = { x: G.cart - S.cam.x, y: G.y - 12 - S.cam.y }; Climb.down(p, { pointerId: 3 }); Climb.up(p, { pointerId: 3 }); return 'tapped'; });
  console.log(await tap()); await wait(500); console.log('tap out:     ', await st());
  console.log(await tap()); await wait(900); console.log('tap back in: ', await st());
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
