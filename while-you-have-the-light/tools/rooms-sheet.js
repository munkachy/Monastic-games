// node rooms-sheet.js out.png: every room in rooms.js, made three times (so its maybe-rock shows),
// drawn as a sheet: rock dark, air pale, marks coloured (S green, V gold, D red, H light green, I purple).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(400);
  const n = await pg.evaluate(() => {
    const names = Object.keys(ROOMS), k = 3, cw = 64 * k, ch = 34 * k, pad = 14, top = 22;
    const c = document.createElement('canvas'); c.width = 3 * (cw + pad) + pad; c.height = names.length * (ch + pad + top) + pad; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.font = '13px sans-serif';
    names.forEach((nm, r) => {
      for (let v = 0; v < 3; v++) {
        let s = 1 + v * 77 + r * 13; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const R = makeRoom(nm, rnd), ox = pad + v * (cw + pad), oy = pad + top + r * (ch + pad + top);
        if (v === 0) { x.fillStyle = '#222'; x.fillText(ROOMS[nm].name + '  (ways: ' + ROOMS[nm].ways + ')', ox, oy - 6); }
        for (let i = 0; i < R.h; i++) for (let j = 0; j < R.w; j++) { x.fillStyle = R.g[i][j] ? '#3a332c' : '#ece6d8'; x.fillRect(ox + j * k, oy + i * k, k, k); }
        const col = { S: '#2c9a3a', V: '#d8a520', D: '#d23a2a', H: '#8ad05a', I: '#8a3ad2' };
        for (const m in R.marks) for (const [cx, cy] of R.marks[m]) { x.fillStyle = col[m]; x.fillRect(ox + cx * k - 3, oy + cy * k - 3, 8, 8); }
      }
    });
    document.body.innerHTML = ''; document.body.style.margin = 0; document.body.appendChild(c); return [c.width, c.height];
  });
  await pg.setViewportSize({ width: n[0], height: n[1] });
  await pg.screenshot({ path: process.argv[2] || 'rooms.png' });
  await b.close();
})();
