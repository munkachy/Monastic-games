// node check-herbs.js [outdir]: herbs placed on the mountain and picked; the pouch opened (the world
// held), two ground into a soup; the soups drunk, and what each does.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { save.tipsOff = true; delete save.recipes; delete save.herbal; const N = novSettings(); N.domain = 'gluttony'; N.demons = true; N.torch = false; store(); Game.novitiate(true); });
  await pg.waitForTimeout(1000);
  console.log('1. herbs set out so far:', await pg.evaluate(() => Climb.S.herbs.length + ' (' + Climb.S.herbs.map((h) => h.kind).join(' ') + ')'));
  const got = await pg.evaluate(async () => { const S = Climb.S, h = S.herbs[0]; if (!h) return 'none'; S.x = h.x; S.y = h.y; S.vx = S.vy = 0; await new Promise((r) => setTimeout(r, 300)); return h.got + ' ' + JSON.stringify(S.pouch); });
  console.log('2. walked onto one:      ', got);
  await pg.evaluate(() => { const S = Climb.S; S.pouch = { rue: 3, hyssop: 2, sage: 1, wormwood: 0 }; S.demons.forEach((d) => { if (!d.idol) d.x += 2000; }); });
  await pg.waitForTimeout(600);
  await pg.keyboard.press('KeyB'); await pg.waitForTimeout(200);
  const t0 = await pg.evaluate(() => Climb.S.t); await pg.waitForTimeout(400); const t1 = await pg.evaluate(() => Climb.S.t);
  console.log('3. pouch open:           ', await pg.evaluate(() => !!Climb.S.mix), t0 === t1 ? '(world held)' : '(world NOT held)');
  await pg.keyboard.press('Digit1'); await pg.keyboard.press('Digit2'); await pg.waitForTimeout(300);
  if (out) await pg.screenshot({ path: out + '/pouch.png' });
  await pg.waitForTimeout(1200);
  console.log('4. rue + hyssop ground:  ', await pg.evaluate(() => JSON.stringify({ flasks: Climb.S.flasks, pouch: Climb.S.pouch, herbal: save.herbal, open: !!Climb.S.mix })));
  // Each soup drunk: what it does.
  for (const kind of ['rising', 'feather', 'unseen', 'bright', 'soup']) {
    const r = await pg.evaluate(async (kind) => {
      const S = Climb.S; S.flasks = [kind]; S.soup = null; S.fuel = 0.5; S.invT = 0; const f0 = S.fuel, l0 = lightR(); drink(0);
      const y0 = S.y; await new Promise((r) => setTimeout(r, 1500));
      const o = { soup: S.soup && S.soup.kind, rose: Math.round(y0 - S.y) };
      if (kind === 'unseen') { const h0 = S.hearts; S.invT = 0; hitMonk(1, 0.06); o.blowTook = h0 - S.hearts; }
      if (kind === 'bright') o.light = Math.round(l0) + '->' + Math.round(lightR());
      if (kind === 'soup') o.torch = f0 + '->' + S.fuel.toFixed(2);
      if (kind === 'feather') { S.y -= 400; S.vy = 0; S.ground = false; await new Promise((r) => setTimeout(r, 700)); o.fallSpeed = Math.round(S.vy); }
      return o;
    }, kind);
    console.log('5. ' + kind.padEnd(8) + ':', JSON.stringify(r));
  }
  await pg.evaluate(() => { save.tipsOff = false; store(); });
  console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
