// Trace a black silhouette on white into simplified loops (solid on the left), in game units.
// node trace.js in.png HEIGHT_UNITS CENTER_U [tol] > out.json
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , JOBF] = process.argv; const jobs = JSON.parse(fs.readFileSync(JOBF, 'utf8')); const all = {};
  for (const J of jobs) { const file = J.file, H_UNITS = J.H, CU = 0, TOL = J.tol || 0.12;
  const b64 = fs.readFileSync(file).toString('base64');
  if (!global.__b) { global.__b = await chromium.launch(); global.__pg = await global.__b.newPage(); } const b = global.__b, pg = global.__pg;
  const out = await pg.evaluate(async ({ b64, HU, CU, TOL, CR, ER, FILL, SC }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    const black = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y < 70 && x > w - 260) continue;                    // (the "Made with AI" mark)
      if (x < CR[0] || y < CR[1] || x >= CR[2] || y >= CR[3]) continue;
      if (ER.some((r) => x >= r[0] && y >= r[1] && x < r[2] && y < r[3])) continue;
      const i = (y * w + x) * 4, l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      if (l < 110) black[y * w + x] = 1;
    }
    if (FILL) { for (let p = 0; p < FILL; p++) { const nb = black.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!black[y * w + x] && (black[y * w + x - 1] || black[y * w + x + 1] || black[(y - 1) * w + x] || black[(y + 1) * w + x])) nb[y * w + x] = 1; black.set(nb); } }
    // bounds
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (black[y * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const B = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? black[y * w + x] : 0);
    // Directed boundary edges between pixel corners, black on the left (walking in image coords, y down).
    const next = new Map(), key = (x, y) => y * (w + 1) + x;
    const addE = (ax, ay, bx, by) => { const k = key(ax, ay); if (!next.has(k)) next.set(k, []); next.get(k).push([bx, by]); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!B(x, y)) continue;
      if (!B(x, y - 1)) addE(x + 1, y, x, y);         // top edge, going left
      if (!B(x, y + 1)) addE(x, y + 1, x + 1, y + 1); // bottom edge, going right
      if (!B(x - 1, y)) addE(x, y, x, y + 1);         // left edge, going down
      if (!B(x + 1, y)) addE(x + 1, y + 1, x + 1, y); // right edge, going up
    }
    const loops = [];
    for (const [k0, list] of next) {
      while (list.length) {
        const sx = k0 % (w + 1), sy = Math.floor(k0 / (w + 1)); let [cx, cy] = list.pop(); const pts = [[sx, sy]];
        let px = sx, py = sy, guard = 0;
        while (!(cx === sx && cy === sy) && guard++ < 1e6) {
          pts.push([cx, cy]);
          const L = next.get(key(cx, cy)); if (!L || !L.length) break;
          // at a pinch (two ways on), turn the way that keeps the black on the left: prefer a left turn
          let j = 0; if (L.length > 1) { const dx = cx - px, dy = cy - py; let best = -9; L.forEach(([nx, ny], q) => { const ex = nx - cx, ey = ny - cy, cr = dx * ey - dy * ex; const s = cr < 0 ? 2 : cr === 0 ? 1 : 0; if (s > best) { best = s; j = q; } }); }
          const [nx, ny] = L.splice(j, 1)[0]; px = cx; py = cy; cx = nx; cy = ny;
        }
        if (pts.length > 8) loops.push(pts);
      }
    }
    // Simplify (Ramer-Douglas-Peucker), on a closed loop.
    const rdp = (P, eps) => {
      if (P.length < 3) return P; const a = P[0], z = P[P.length - 1]; let id = -1, dm = 0;
      const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
      for (let i = 1; i < P.length - 1; i++) { const p = P[i], dd = Math.abs((z[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (z[1] - a[1])) / L; if (dd > dm) { dm = dd; id = i; } }
      if (dm > eps) { const l = rdp(P.slice(0, id + 1), eps), r = rdp(P.slice(id), eps); return l.slice(0, -1).concat(r); }
      return [a, z];
    };
    const k = SC || HU / (y1 + 1 - y0), cxm = (x0 + x1 + 1) / 2, eps = TOL / k;
    const res = [];
    for (const P of loops) {
      // area (image coords): for size filter
      let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } A /= 2;
      if (Math.abs(A) * k * k < 0.35) continue;                 // (specks, and slivers too small to see)
      if (FILL && A >= 0) continue;                             // (filled: no holes)
      const half = Math.floor(P.length / 2), S = rdp(P.slice(0, half + 1), eps).slice(0, -1).concat(rdp(P.slice(half).concat([P[0]]), eps).slice(0, -1));
      res.push({ hole: A < 0 ? false : true, n: S.length, pts: S.map(([x, y]) => [+(CU + (x - cxm) * k).toFixed(2), +((y1 + 1 - y) * k).toFixed(2)]) });
    }
    return { w, h, bounds: [x0, y0, x1, y1], k, widthUnits: +((x1 + 1 - x0) * k).toFixed(1), loops: res };
  }, { b64, HU: +H_UNITS, CU: +CU, TOL: +(TOL || 0.12), CR: J.crop, ER: J.erase || [], FILL: J.fill || 0, SC: J.scale || 0 });
  all[J.name] = out.loops.map((L) => L.pts.map((p) => p.map((v) => +v.toFixed(1))).flat()); console.error(J.name, out.loops.length, 'loops', out.widthUnits, 'wide'); }
  console.log(JSON.stringify(all)); await global.__b.close();
})();
