// node boxes.js in.png  -> bounding boxes of separate figures (black merged within GAP px)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , file, GAP] = process.argv; const b64 = fs.readFileSync(file).toString('base64');
  const b = await chromium.launch(); const pg = await b.newPage();
  const out = await pg.evaluate(async ({ b64, G }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    const s = 4, W = Math.ceil(w / s), H = Math.ceil(h / s), m = new Uint8Array(W * H);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (y < 70 && x > w - 260) continue; const i = (y * w + x) * 4; if (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 110) m[((y / s) | 0) * W + ((x / s) | 0)] = 1; }
    const r = Math.ceil(G / s), lab = new Int32Array(W * H).fill(-1), boxes = [];
    for (let i = 0; i < W * H; i++) { if (!m[i] || lab[i] >= 0) continue; const id = boxes.length, bx = [1e9, 1e9, -1, -1, 0]; const st = [i]; lab[i] = id;
      while (st.length) { const q = st.pop(), x = q % W, y = (q / W) | 0; bx[0] = Math.min(bx[0], x); bx[1] = Math.min(bx[1], y); bx[2] = Math.max(bx[2], x); bx[3] = Math.max(bx[3], y); bx[4]++;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (m[k] && lab[k] < 0) { lab[k] = id; st.push(k); } } }
      boxes.push(bx); }
    return boxes.filter((b) => b[4] > 40).map((b) => [b[0] * s, b[1] * s, b[2] * s + s, b[3] * s + s]);
  }, { b64, G: +(GAP || 12) });
  console.log(JSON.stringify(out)); await b.close();
})();
