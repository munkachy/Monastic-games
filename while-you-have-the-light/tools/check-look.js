// node check-look.js: looking about. Space held with an arrow moves the view, not him; how far
// and how fast out and back; while crawling he stays on his knees.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { save.tipsOff = true; const N = novSettings(); N.domain = 'gluttony'; N.demons = false; store(); Game.novitiate(true); });
  await pg.waitForTimeout(1500);
  const st = () => pg.evaluate(() => { const S = Climb.S; return { x: Math.round(S.x), off: [Math.round(S.lookO.x), Math.round(S.lookO.y)], look: !!S.look, crawl: !!S.crawl }; });
  console.log('label before:', await pg.evaluate(() => lookable() ? 'LOOK' : 'not lookable'), JSON.stringify(await st()));
  await pg.keyboard.down('Space'); await pg.keyboard.down('ArrowRight');
  for (const t of [1000, 2000, 3500, 5000]) { await pg.waitForTimeout(t === 1000 ? 1000 : t === 2000 ? 1000 : 1500); console.log(`looking right ${t / 1000}s:`, JSON.stringify(await st())); }
  await pg.keyboard.up('ArrowRight'); await pg.keyboard.up('Space');
  const t0 = Date.now(); let back = null;
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(100); const s = await st(); if (!back && Math.abs(s.off[0]) < 2) back = (Date.now() - t0) / 1000; }
  console.log('let go: back in about', back, 's', JSON.stringify(await st()));
  await pg.keyboard.down('Space'); await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(1500); console.log('looking up 1.5s:', JSON.stringify(await st()));
  await pg.keyboard.up('ArrowUp'); await pg.keyboard.up('Space'); await pg.waitForTimeout(1500);
  // On his knees: crawl, then look; he must stay down.
  await pg.keyboard.down('ArrowDown'); await pg.waitForTimeout(600);
  await pg.keyboard.down('Space'); await pg.keyboard.up('ArrowDown'); await pg.keyboard.down('ArrowLeft'); await pg.waitForTimeout(1200);
  console.log('crawling, looking left:', JSON.stringify(await st()));
  await pg.keyboard.up('ArrowLeft'); await pg.keyboard.up('Space');
  await pg.evaluate(() => { save.tipsOff = false; store(); });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
