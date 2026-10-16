// node check-stone.js [outdir]: choosing which stone to lay. With a stone in his hands, the arrows
// (or Q and E) change it for the next of a different shape in the store.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  const shapes = await pg.evaluate(() => {
    save.house = { store: ['L', 'L', 'L', 'O', 'L', 'I', 'T'].map((shape, i) => ({ shape, dom: ['gluttony', 'lust'][i % 2] })), sites: { library: { done: false, stones: [], x: 400 } }, gift: false, banked: {}, more: true, people: [], nextId: 1, folk0: true };
    store(); House.open(); const s = House.SITES[0]; House.state.x = s.x; House.lay(s); return House.state.hold.shape;
  });
  const seq = [shapes];
  for (const k of ['KeyE', 'KeyE', 'KeyE', 'KeyE', 'KeyQ']) { await pg.keyboard.press(k); await pg.waitForTimeout(80); seq.push(k + '>' + await pg.evaluate(() => House.state.hold.shape)); }
  console.log('store L L L O L I T; in his hands, then E E E E Q:', seq.join(' '));
  if (out) await pg.screenshot({ path: out + '/stone-pick.png' });
  // Set it down: the one chosen leaves the store, not the first.
  const after = await pg.evaluate(() => { const was = House.state.hold.shape; House.place(); return { laid: was, store: save.house.store.map((q) => q.shape).join(' ') }; });
  console.log('set down:', JSON.stringify(after));
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
