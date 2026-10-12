const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const T = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 900, height: 260 } });
  await pg.setContent('<canvas id=c width=900 height=260 style="background:#c9c1ad"></canvas>');
  await pg.evaluate((T) => {
    const g = document.getElementById('c').getContext('2d'); let x = 30, y = 110;
    for (const [n, loops] of Object.entries(T)) {
      let mn = 1e9, mx = -1e9; for (const L of loops) for (let i = 0; i < L.length; i += 2) { mn = Math.min(mn, L[i]); mx = Math.max(mx, L[i]); }
      const s = 2; if (x + (mx - mn) * s > 880) { x = 30; y += 130; }
      const p = new Path2D(); for (const L of loops) { for (let i = 0; i < L.length; i += 2) { const X = x + (L[i] - mn) * s, Y = y - L[i + 1] * s; i ? p.lineTo(X, Y) : p.moveTo(X, Y); } p.closePath(); }
      g.fillStyle = '#111'; g.fill(p, 'evenodd'); g.font = '10px sans-serif'; g.fillText(n, x, y + 12); x += (mx - mn) * s + 20;
    }
  }, T);
  await pg.screenshot({ path: process.argv[3] }); await b.close();
})();
