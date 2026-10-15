// node mtn-sheet.js out.png [n]: n whole mountains (rooms.js makeMountain) side by side, a pixel to 2 cells:
// rock dark, air pale, the start green, demons red, herbs light green.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('http://localhost:8100/while-you-have-the-light/index.html'); await pg.waitForTimeout(400);
  const n = +(process.argv[3] || 4);
  const sz = await pg.evaluate((n) => {
    const Ms = []; for (let t = 0; t < n; t++) Ms.push(makeMountain(seeded(1234 + t * 7919)));
    const k = 0.5, pad = 10, W = Ms.reduce((a, R) => a + R.w * k + pad, pad), H = Math.max(...Ms.map((R) => R.h)) * k + 2 * pad;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    let ox = pad;
    for (const R of Ms) {
      const img = x.createImageData(Math.ceil(R.w * k), Math.ceil(R.h * k));
      for (let i = 0; i < img.height; i++) for (let j = 0; j < img.width; j++) { const a = !R.g[i * 2][j * 2], p = (i * img.width + j) * 4; img.data[p] = a ? 236 : 58; img.data[p + 1] = a ? 230 : 51; img.data[p + 2] = a ? 216 : 44; img.data[p + 3] = 255; }
      x.putImageData(img, ox, pad);
      const col = { S: '#1a9a2a', D: '#d23a2a', H: '#6ac03a' };
      for (const m in col) for (const [cx, cy] of R.marks[m]) { x.fillStyle = col[m]; x.fillRect(ox + cx * k - 2, pad + cy * k - 2, m === 'S' ? 8 : 4, m === 'S' ? 8 : 4); }
      ox += R.w * k + pad;
    }
    document.body.innerHTML = ''; document.body.style.margin = 0; document.body.appendChild(c); return [W, H];
  }, n);
  await pg.setViewportSize({ width: Math.ceil(sz[0]), height: Math.ceil(sz[1]) });
  await pg.screenshot({ path: process.argv[2] || 'mountains.png' });
  await b.close();
})();
