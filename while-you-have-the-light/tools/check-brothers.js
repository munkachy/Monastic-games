// node check-brothers.js [outdir]: each life a brother. Three deaths take the three, each written in
// the necrology (newest first); the last is the game's end, everything begun again but the
// necrology. A brother received at the gate costs a stone; of the freed, about three in ten come
// down; an older monastery's three waiting by the fire become its brothers.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { for (const k of ['house', 'bricks', 'climbs', 'lib', 'recipes', 'herbal', 'mortar', 'pilgrims', 'necrology']) delete save[k]; save.game = 1; save.tipsOff = true; store(); });
  const dieOnce = async () => {
    await pg.evaluate(() => { const N = novSettings(); N.domain = 'wrath'; N.demons = true; store(); Game.novitiate(true); });
    await pg.waitForTimeout(700);
    await pg.evaluate(() => { const S = Climb.S; S.binned = 2; const f = S.demons.find((d) => !d.idol); if (f) { f.x = S.x + 60; f.y = S.y; } for (let i = 0; i < 3; i++) { S.invT = 0; hitMonk(1, 0.06); } });
    await pg.waitForTimeout(3500);
    return pg.evaluate(() => ({ mode: mode === Over ? 'Over' : '?', fell: Climb.fell(), brothers: save.house ? save.house.people.filter((p) => p.role === 'brother').map((p) => p.name) : 'no house (reset)', bricks: save.bricks && save.bricks.wrath, game: save.game }));
  };
  await pg.evaluate(() => brotherData());
  console.log('0. at the start, brothers:', await pg.evaluate(() => save.house.people.filter((p) => p.role === 'brother').map((p) => p.name).join(', ')));
  for (let i = 1; i <= 3; i++) {
    const r = await dieOnce(); console.log(`${i}. died:`, JSON.stringify(r));
    if (i === 1 && out) await pg.screenshot({ path: out + '/fell.png' });
    if (i === 3 && out) await pg.screenshot({ path: out + '/lastfell.png' });
  }
  console.log('   the necrology:', JSON.stringify(await pg.evaluate(() => save.necrology.map((e) => e.line))));
  // A brother received at the gate: a stone for him.
  const rec = await pg.evaluate(() => { save.pilgrims = [['lust', 1]]; store(); House.open(); const D = save.house, s0 = D.store.length; const f = House.state.folk.find((q) => q.p.role === 'camp'); House.state.x = House.CAMP; House.receive(); return { stonesBefore: s0, after: D.store.length, received: f && f.p.role, name: f && f.p.name }; });
  console.log('4. received one:', JSON.stringify(rec));
  // Of a hundred freed, how many come down.
  console.log('5. of 100 freed, come down:', await pg.evaluate(() => { Game.climb(); Climb.S.freedList = [...Array(100)].map(() => ['wrath', 0]); const n0 = (save.pilgrims || []).length; const nov = NOV; NOV = { domain: 'wrath' }; bankFreed(); NOV = nov; return save.pilgrims.length - n0; }));
  // An older monastery: three waiting by the fire, and no brothers.
  console.log('6. older save:', await pg.evaluate(() => { save.house = { store: [], sites: {}, gift: false, banked: {}, more: true, folk0: true, nextId: 4, people: [1, 2, 3].map((id) => ({ id, dom: 'gluttony', kind: 0, role: 'camp' })) }; store(); return brotherData().people.map((p) => p.role + ':' + p.name).join(', '); }));
  // The book in the library.
  await pg.evaluate(() => { save.house.sites = { library: { done: true, x: 400, stones: [] } }; store(); House.open(); House.state.inside = { kind: 'library', t: 2, book: null, necro: true }; });
  await pg.waitForTimeout(500);
  if (out) await pg.screenshot({ path: out + '/necrology.png' });
  await pg.evaluate(() => { save.tipsOff = false; store(); });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
