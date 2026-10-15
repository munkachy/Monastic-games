// node check-upgrade.js [outdir]: a building finished when he says so (one shape, one colour, no
// roof), then added to three times, each for the stones it cost. Pictures of each stage to outdir.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    save.house = { store: [...Array(40)].map((_, i) => ({ shape: 'O', dom: ['gluttony', 'lust', 'avarice', 'wrath'][i % 4] })), sites: { library: { done: false, stones: [], x: 560 } }, gift: false, banked: {}, more: true, people: [], nextId: 1, folk0: true, brothers3: true };
    store(); House.open(); const s = House.SITES[0]; House.state.x = s.x; House.state.cam = clamp(s.x - W / 2, 0, 1900 - W);
  });
  // Nine stones laid across the place, a row at a time.
  for (let i = 0; i < 9; i++) {
    await pg.evaluate((i) => { const s = House.SITES[0]; House.lay(s); const d = [-4, 0, 4][i % 3]; for (let k = 0; k < Math.abs(d); k++) House.nudge(Math.sign(d)); House.place(); }, i);
    await pg.waitForTimeout(700);
  }
  await pg.waitForTimeout(1500);
  const st = () => pg.evaluate(() => { const SD = save.house.sites.library; return { done: SD.done, level: SD.level, laid: SD.stones.length, store: save.house.store.length }; });
  console.log('laid:      ', JSON.stringify(await st()));
  if (out) await pg.screenshot({ path: out + '/up-0laid.png' });
  await pg.evaluate(() => House.finish(House.SITES[0])); await pg.waitForTimeout(3200);
  console.log('finished:  ', JSON.stringify(await st()));
  if (out) await pg.screenshot({ path: out + '/up-1built.png' });
  for (let k = 1; k <= 4; k++) {
    await pg.evaluate(() => House.addTo(House.SITES[0])); await pg.waitForTimeout(3300);
    console.log('added to ' + k + ':', JSON.stringify(await st()));
    if (out && k <= 3) await pg.screenshot({ path: out + '/up-' + (k + 1) + 'level.png' });
  }
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
