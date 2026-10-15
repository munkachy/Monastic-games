// node check-tips.js [outdir]: the tips. Held while read, gone on with a key, shown once on the
// device, and all shown again when turned off and on (the pause screen's switch).
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { save.seen = {}; save.tipsOff = false; store(); });
  const base = { title: 't', mountain: 'gluttony', summit: false, metres: 0, place: 'any', demons: 0, near: [{ sin: 'wrath', count: 1 }], great: 0, block: false, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false, seed: 3 };
  // (On a real mountain: scenes from the white room count every tip as seen.) A demon set beside him.
  const fight = async (o) => {
    await pg.evaluate(() => { const N = novSettings(); N.domain = 'wrath'; N.demons = true; store(); Game.novitiate(true); });
    await pg.waitForTimeout(400);
    await pg.evaluate((great) => { const S = Climb.S; if (great) { S.greatSeen = false; greatSays(); return; } const f = S.demons.find((d) => !d.idol); if (f) { f.x = S.x + 120; f.y = S.y; } }, !!(o && o.great));
    await pg.waitForTimeout(600);
  };
  const state = () => pg.evaluate(() => { const S = Climb.S; return { hold: S.tipHold || null, t: +S.t.toFixed(2), say: S.say && S.say.tip ? S.say.text : null }; });
  await fight(); const a = await state(); await pg.waitForTimeout(800); const a2 = await state();
  console.log('1. demon met:      ', JSON.stringify(a), a.t === a2.t ? '(world held)' : '(world NOT held)');
  if (out) await pg.screenshot({ path: out + '/tip-fight.png' });
  await pg.keyboard.press('KeyX'); await pg.waitForTimeout(300);
  console.log('2. key pressed:    ', JSON.stringify(await state()), 'seen:', JSON.stringify(await pg.evaluate(() => save.seen.tips)));
  await fight(); console.log('3. next fight:     ', JSON.stringify(await state()));
  await pg.evaluate(() => { setTips(false); setTips(true); }); await fight();
  console.log('4. off, then on:   ', JSON.stringify(await state()));
  await pg.keyboard.press('KeyX'); await pg.waitForTimeout(200);
  await fight({ great: 1 });
  const g = await state(); console.log('5. great demon:    ', JSON.stringify(g));
  if (out) await pg.screenshot({ path: out + '/tip-great.png' });
  await pg.evaluate(() => { setTips(false); }); await pg.keyboard.press('KeyX');
  await fight(); console.log('6. tips off:       ', JSON.stringify(await state()));
  await pg.evaluate(() => { setTips(true); });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
