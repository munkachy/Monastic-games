// node check-boon.js: a relic's power lasts half its time, and a twentieth more for each brother
// received after the first three, up to the whole.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => {
    const keep = save.house, out = [];
    const N = novSettings(); N.domain = 'gluttony'; store(); Game.novitiate(true);
    for (const [n, camp] of [[0, 3], [3, 0], [4, 0], [8, 0], [13, 0], [20, 0]]) {
      save.house = { store: [], sites: {}, people: [...Array(n)].map(() => ({ role: 'brother' })).concat([...Array(camp)].map(() => ({ role: 'camp' }))) };
      grantBoon('vade'); out.push(`${n} brothers (${camp} waiting): ${Climb.S.boon.T.toFixed(0)} of ${BOONS.vade.T} s`);
    }
    save.house = keep; store();
    return out;
  });
  console.log(r.join('\n')); console.log(errs.length ? errs : 'no errors');
  await b.close();
})();
