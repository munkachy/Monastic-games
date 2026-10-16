const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html');
  await pg.waitForTimeout(800);
  await pg.mouse.click(370, 200); await pg.waitForTimeout(300);
  const r = await pg.evaluate(async () => {
    const srcs = [...document.scripts].map(s => s.src.split('/').pop());
    Game.novitiate(); if (mode === Gate) { while (!prepMountain(Gate.sc.seed, 5)) await new Promise(r => setTimeout(r, 0)); Gate.go(); }
    await new Promise(r => setTimeout(r, 1500));
    const s = Climb.S; return { srcs, mode: mode === Climb, t: +s.rt.toFixed(1), verses: typeof Verses, notes: typeof Notes, bigs: s.bigs.length };
  });
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
