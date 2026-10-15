// node check-house.js [outdir]: the monastery in peace. An old save (walls with stones in them,
// tools set out, a raid waiting, brothers with holy water and trowels) comes in cleanly; the day
// turns to night and back; the brothers walk about.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => {
    const st = (n) => Array.from({ length: n }, (_, i) => ({ shape: 'T', dom: 'gluttony', x: 190, y: 300, a: 0 }));
    save.house = { store: st(5).map(({ shape, dom }) => ({ shape, dom })), sites: { wallW: { done: true, stones: st(4) }, wallE: { done: false, stones: st(2) } }, gift: false, banked: {}, more: true,
      raid: { dom: 'wrath', n: 4 }, tools: { water: 1, mason: 2 }, nextId: 6, folk0: true,
      people: [{ id: 1, dom: 'gluttony', kind: 0, role: 'water', side: -1 }, { id: 2, dom: 'lust', kind: 1, role: 'mason' }, { id: 3, dom: 'wrath', kind: 2, role: 'brother' }, { id: 4, dom: 'avarice', kind: 3, role: 'camp' }] };
    store(); House.open();
    const D = save.house;
    return { store: D.store.length, sites: Object.keys(D.sites), raid: D.raid, tools: D.tools, roles: D.people.map((p) => p.role), sitesNow: House.SITES.map((s) => s.id) };
  });
  console.log('old save, opened:', JSON.stringify(r), '(store should be 5 + 6 wall stones + 3 tools = 14)');
  const xs0 = await pg.evaluate(() => House.state.folk.map((f) => Math.round(f.x)));
  await pg.waitForTimeout(5000);
  const xs1 = await pg.evaluate(() => House.state.folk.map((f) => Math.round(f.x) + ':' + f.p.role));
  console.log('brothers, then 5 s later:', JSON.stringify(xs0), JSON.stringify(xs1));
  await pg.evaluate(() => { House.state.clock.t = 99.5; }); await pg.waitForTimeout(5000);
  console.log('after nightfall:', JSON.stringify(await pg.evaluate(() => ({ clock: House.state.clock.phase, say: House.state.say && House.state.say.text }))));
  if (out) await pg.screenshot({ path: out + '/house-night.png' });
  await pg.evaluate(() => { House.state.clock.t = 54.5; }); await pg.waitForTimeout(1500);
  console.log('after dawn:', JSON.stringify(await pg.evaluate(() => ({ clock: House.state.clock.phase, nights: save.house.nights }))));
  if (out) await pg.screenshot({ path: out + '/house-day.png' });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
