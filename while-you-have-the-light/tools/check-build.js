// node check-build.js [outdir]: choosing where to build. A fresh monastery has nothing placed; a
// hold on open ground opens the menu; a building is placed where it fits and not where it does not;
// an empty outline can be moved and taken away; an older save's begun building stays where it was.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  const box = await pg.evaluate(() => { const r = cv.getBoundingClientRect(); return [r.left, r.top, r.width / W]; });
  const at = (x, y) => [box[0] + x * box[2], box[1] + y * box[2]];
  const holdAt = async (x, y, ms) => { const [px, py] = at(x, y); await pg.mouse.move(px, py); await pg.mouse.down(); await pg.waitForTimeout(ms); await pg.mouse.up(); await pg.waitForTimeout(200); };
  const tapAt = async (x, y) => { const [px, py] = at(x, y); await pg.mouse.click(px, py); await pg.waitForTimeout(300); };
  const st = () => pg.evaluate(() => ({ places: House.SITES.map((s) => s.id + '@' + s.x), menu: House.state.menu ? (House.state.menu.site ? 'site:' + House.state.menu.site.id : 'new') : null, moving: House.state.moving ? House.state.moving.id : null }));
  await pg.evaluate(() => { delete save.house; store(); House.open(); }); await pg.waitForTimeout(1200);
  console.log('1. fresh:              ', JSON.stringify(await st()));
  await holdAt(200, 300, 200); console.log('2. a short tap:        ', JSON.stringify(await st()));
  await holdAt(90, 300, 800); console.log('3. held:               ', JSON.stringify(await st()));
  if (out) await pg.screenshot({ path: out + '/build-menu.png' });
  // The first button of the menu: the library.
  const btn = await pg.evaluate(() => buttons.filter((q) => q.w === 132).map((q) => [q.x + q.w / 2, q.y + q.h / 2]));
  await tapAt(btn[0][0], btn[0][1]); console.log('4. library chosen:     ', JSON.stringify(await st()));
  // Held by the gate: no room for the choir there.
  await pg.evaluate(() => { House.state.x = 940; House.state.cam = 940 - W / 2; }); await pg.waitForTimeout(400);
  await holdAt(W_ = 370, 300, 800);
  const g = await pg.evaluate(() => buttons.filter((q) => q.w === 132).length);
  console.log('5. held at the gate:   ', JSON.stringify(await st()), 'buttons:', g);
  await tapAt(370, 300); await pg.waitForTimeout(200);
  console.log('   choir there? (no):   ', JSON.stringify(await st()));
  // The library's empty outline: held, MOVE, then a tap elsewhere.
  const lx = await pg.evaluate(() => { const s = House.SITES[0]; House.state.x = s.x; House.state.cam = clamp(s.x - W / 2, 0, 1e9); return s.x - House.state.cam; }); await pg.waitForTimeout(400);
  await holdAt(lx, 300, 800); console.log('6. held on its outline:', JSON.stringify(await st()));
  const mv = await pg.evaluate(() => buttons.filter((q) => q.w === 132).map((q) => [q.x + q.w / 2, q.y + q.h / 2]));
  await tapAt(mv[0][0], mv[0][1]); await tapAt(lx - 150, 300); console.log('7. moved:              ', JSON.stringify(await st()));
  // An older save: the choir begun with stones in it, no place kept: it stays where it stood.
  await pg.evaluate(() => { save.house = { store: [], sites: { choir: { done: false, stones: [{ shape: 'O', dom: 'lust', x: 1260, y: 310, a: 0 }] } }, gift: false, banked: {}, more: true, people: [], nextId: 1, folk0: true }; store(); House.open(); });
  await pg.waitForTimeout(600); console.log('8. older save:         ', JSON.stringify(await st()));
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
