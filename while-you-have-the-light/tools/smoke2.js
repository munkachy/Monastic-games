// node smoke2.js [outdir]: visits every screen a player can reach, presses keys in each, and prints
// any error (page errors, console errors, and the faults the game loop catches). Saves a screenshot
// of each screen to outdir if given.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('page: ' + String(e)));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  if (process.env.COVER) await pg.coverage.startJSCoverage({ resetOnNavigation: false });
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html');
  await pg.waitForTimeout(800);
  await pg.mouse.click(370, 200); await pg.waitForTimeout(300);
  const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${n}.png` }); };
  const hold = async (keys, ms) => { for (const k of keys) await pg.keyboard.down(k); await pg.waitForTimeout(ms); for (const k of keys) await pg.keyboard.up(k); };
  const play = async () => {
    await hold(['ArrowRight'], 700); await hold(['ArrowRight', 'Space'], 400); await hold(['ArrowLeft'], 600);
    await hold(['ArrowUp'], 400); await hold(['ArrowDown'], 400); await hold(['KeyX'], 200); await hold(['KeyZ'], 200);
    await hold(['ArrowLeft', 'Space'], 500); await pg.waitForTimeout(400);
  };
  const run = async (name, js, after) => {
    const n0 = errs.length;
    await pg.evaluate(js); await pg.waitForTimeout(700);
    if (after) await after();
    await shot(name);
    const f = await pg.evaluate(() => { const f = FAULTS.map(x => x.m.split('\n')[0]); FAULTS.length = 0; return f; });
    for (const m of f) errs.push('fault: ' + m);
    console.log(name.padEnd(14), errs.length - n0 ? 'ERRORS ' + (errs.length - n0) : 'ok');
  };
  await run('title', 'Game.toTitle()');
  await run('climb', 'Game.climb()', play);
  await run('climb-pause', '0', async () => { await hold(['Escape'], 100); await pg.waitForTimeout(300); await hold(['Escape'], 100); });
  await run('novitiate', 'Game.toNovitiate()');
  for (const d of ['gluttony', 'lust', 'avarice', 'wrath'])
    await run('nov-' + d, `(() => { const N = novSettings(); N.domain = '${d}'; store(); Game.novitiate(true); })()`, play);
  await run('house', 'House.open()', async () => { await pg.mouse.click(200, 200); await pg.mouse.click(500, 150); await pg.waitForTimeout(500); });
  await run('room', 'Room.open()');
  await run('over', 'Game.climb()', async () => { await pg.evaluate(() => { Climb.S.fuel = 0; }); await pg.waitForTimeout(4000); const m = await pg.evaluate(() => mode === Over); if (!m) errs.push('over: the end screen never came'); });
  await run('title-end', 'Game.toTitle()');
  for (const p of ['art.html', 'design.html']) {
    const n0 = errs.length;
    await pg.goto('http://localhost:8100/while-you-have-the-light/' + p); await pg.waitForTimeout(1200); await shot(p);
    console.log(p.padEnd(14), errs.length - n0 ? 'ERRORS' : 'ok');
  }
  for (const e of errs) console.log('  ' + e);
  if (process.env.COVER) require('fs').writeFileSync(process.env.COVER, JSON.stringify(await pg.coverage.stopJSCoverage()));
  await b.close();
})();
