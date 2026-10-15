// node check-hearts.js [outdir]: three hearts; a blow takes one and a third of the torch; the torch
// out leaves him alive in the dark; a lay brother tends him once; the last heart lost, he dies.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { save.tipsOff = true; const N = novSettings(); N.domain = 'gluttony'; N.demons = false; N.torch = false; store(); Game.novitiate(true); });
  await pg.waitForTimeout(800);
  const st = () => pg.evaluate(() => { const S = Climb.S; return { hearts: S.hearts, torch: +S.fuel.toFixed(2), dark: S.dark, dying: !!S.dying, light: Math.round(lightR()) }; });
  console.log('start:          ', JSON.stringify(await st()));
  const blow = () => pg.evaluate(() => { Climb.S.invT = 0; hitMonk(1, 0.06); });
  await blow(); await pg.waitForTimeout(1000); console.log('one blow:       ', JSON.stringify(await st()));
  await pg.evaluate(() => { Climb.S.fuel = 0; }); await pg.waitForTimeout(600); console.log('torch run out:  ', JSON.stringify(await st()));
  if (out) await pg.screenshot({ path: out + '/dark.png' });
  await pg.evaluate(() => { ward(); }); await pg.waitForTimeout(300); console.log('blessed, dark:  ', JSON.stringify(await st()));
  // A lay brother: put him at the first cart.
  const tended = await pg.evaluate(async () => { const S = Climb.S; for (let k = 0; k < 40; k++) { ensureSecs(k); const G = brotherOf(secs[k]); if (G) { S.x = G.cart; S.y = G.y; S.ground = true; S.blockSeen = true; S.popK = Math.max(S.popK, k + 1); return k; } } return -1; });
  await pg.waitForTimeout(500); console.log('at a cart (' + tended + '):  ', JSON.stringify(await st()));
  await blow(); await pg.waitForTimeout(1000); console.log('a blow there:   ', JSON.stringify(await st()), '(once only: no second tending)');
  await blow(); await pg.waitForTimeout(1000); await blow(); await pg.waitForTimeout(800); console.log('two more blows: ', JSON.stringify(await st()));
  await pg.waitForTimeout(2500); console.log('then:           mode', await pg.evaluate(() => mode === Over ? 'Over' : mode === Climb ? 'Climb' : '?'));
  if (out) await pg.screenshot({ path: out + '/fallen.png' });
  await pg.evaluate(() => { save.tipsOff = false; store(); });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
