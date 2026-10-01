"use strict";
// The words of the Canticle in the world. Every verse of every chapter is
// set somewhere in the rooms: cut in stone, gilded over a door, painted on
// plaster, written across the sky, pressed into sand, stitched into a
// curtain, lettered on a label, kindled in light as the monk draws near,
// strung on a golden chain. A text names its verse; it may show only part of
// it (part: [first word, last word]), in which case the rest is elsewhere.
const VERSE = {
  words(R, tx) {
    const full = CANTICLE[R.chapter - 1][tx.v - 1];
    if (!tx.part) return full;
    return full.split(" ").slice(tx.part[0], tx.part[1]).join(" ");
  },
  // The lines of a text, wrapped to its width in its own face.
  layout(ctx, R, tx) {
    const st = STYLE[tx.style] || STYLE.painted;
    const size = tx.size || st.size;
    ctx.font = st.font(size);
    let str = VERSE.words(R, tx);
    if (st.upper) str = str.toUpperCase();
    const lines = tx.w ? wrap(ctx, str, tx.w) : [str];
    return { lines, size, lh: size * (st.lh || 1.25), st };
  },
  draw(ctx, tx, R, t, cx, cy) {
    // Off the screen: nothing to letter.
    const pad = 220;
    if (tx.x - cx > W + pad || tx.x + (tx.w || 300) - cx < -pad || tx.y - cy > H + pad || tx.y - cy < -pad - 140) {
      if (!tx.parallax) return;
    }
    ctx.save();
    const L = VERSE.layout(ctx, R, tx);
    ctx.textBaseline = "top"; ctx.textAlign = tx.align || "center";
    const ax = tx.align === "left" ? tx.x : tx.align === "right" ? tx.x + (tx.w || 0) : tx.x + (tx.w || 0) / 2;
    let x0 = ax, y0 = tx.y;
    if (tx.parallax) { x0 += cx * tx.parallax; y0 += cy * tx.parallax; }
    const m = Game.monk, near = Math.hypot(m.x + m.w / 2 - (tx.x + (tx.w || 0) / 2), m.y - tx.y);
    // Letters set straight on a patterned wall get a soft ground of shadow (or of
    // light, for dark letters), so the pattern never runs through the words.
    if (!tx.panel && R.sky === "none" && BACKED[tx.style]) {
      const dark = lum(tx.color || BACKED[tx.style]) < 0.45, w = tx.w || 200, h = L.lines.length * L.lh;
      ctx.fillStyle = dark ? "rgba(235,222,195,0.16)" : "rgba(8,6,12,0.2)";
      for (let i = 0; i < 4; i++) { const e = 10 - i * 3; ctx.fillRect(tx.x - e, y0 - e - 2, w + e * 2, h + e * 2); }
    }
    L.st.draw(ctx, L, x0, y0, tx, t, near);
    ctx.restore();
  },
};
// Styles that get a soft ground on patterned walls, with each one's usual ink.
const BACKED = { carved: "#1e140e", gilded: "#e8b94a", painted: "#2a1a10", embroidered: "#ffd27a", kindle: "#fff4d2", smoke: "#ffecfa", label: "#3a2410" };
// How light a colour is, from 0 (black) to 1 (white).
function lum(col) {
  let r = 0, g = 0, b = 0;
  if (col[0] === "#") { const n = parseInt(col.slice(1, 7), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  else { const v = col.match(/[\d.]+/g) || [0, 0, 0]; [r, g, b] = v.map(Number); }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
// The points of a text: drawn once on a small canvas, read back, kept.
const POINTS = new Map();
function textPoints(tx, L, step) {
  const key = tx.v + ":" + (tx.part || "") + ":" + L.size + ":" + (tx.w || 0) + ":" + tx.style;
  if (POINTS.has(key)) return POINTS.get(key);
  const k = 3, w = Math.ceil((tx.w || 300) * k), h = Math.ceil(L.lines.length * L.lh * k + L.size * k);
  const cv = mk(w, h), c = cv.getContext("2d");
  c.font = L.st.font(L.size * k); c.textBaseline = "top"; c.textAlign = "center"; c.fillStyle = "#fff";
  L.lines.forEach((l, i) => c.fillText(l, w / 2, i * L.lh * k));
  const d = c.getImageData(0, 0, w, h).data, pts = [], s = step * k;
  for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) if (d[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 128) pts.push([x / k - (tx.w || 300) / 2, y / k, Math.random()]);
  POINTS.set(key, pts); return pts;
}
const STYLE = {
  // Spelled in stars on the night sky, each star twinkling in its turn.
  stars: { size: 18, lh: 1.2, font: (s) => "700 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      c.shadowColor = "rgba(200,220,255,0.9)"; c.shadowBlur = 6; c.fillStyle = tx.color || "rgba(250,248,235,0.92)";
      L.lines.forEach((l, i) => c.fillText(l, x, y + i * L.lh)); c.shadowBlur = 0;
      for (const [px0, py0, r] of textPoints(tx, L, 1.6)) { if (r > 0.12) continue; const a = Math.max(0, Math.sin(t * (1 + r * 8) + r * 60)); c.fillStyle = "rgba(255,255,255," + a + ")"; c.fillRect(x + px0 - 1, y + py0 - 0.2, 2, 0.4); c.fillRect(x + px0 - 0.2, y + py0 - 1, 0.4, 2); }
    } },
  // Set out in a flower-bed: each stroke of each letter a little bloom.
  flowers: { size: 16, lh: 1.2, font: (s) => "800 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      // Letters of green leaves, edged dark, with blossoms opening along them.
      c.lineJoin = "round"; c.lineWidth = 2.4; c.strokeStyle = "#1e4a1a"; c.fillStyle = "#5aa846";
      L.lines.forEach((l, i) => { c.strokeText(l, x, y + i * L.lh); c.fillText(l, x, y + i * L.lh); });
      const cols = ["#ff7aa8", "#ffffff", "#ffe08a", "#c8a0ff", "#ff9a5a"];
      for (const [px0, py0, r] of textPoints(tx, L, 2)) { if (r > 0.16) continue; const b = 0.8 + Math.sin(t * 1.4 + r * 40) * 0.2; c.fillStyle = cols[Math.floor(r * 31) % 5]; c.fillRect(x + px0 - b, y + py0 - b, b * 2, b * 2); }
    } },
  // Pieces of silver laid out in letters, each catching the light in its turn.
  coins: { size: 16, lh: 1.2, font: (s) => "800 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      // Letters of silver, edged dark, with a glint passing along them.
      c.lineJoin = "round"; c.lineWidth = 2; c.strokeStyle = "#3a3a48"; c.fillStyle = "#dfe3ea";
      L.lines.forEach((l, i) => { c.strokeText(l, x, y + i * L.lh); c.fillText(l, x, y + i * L.lh); });
      for (const [px0, py0, r] of textPoints(tx, L, 1.5)) { if (r > 0.2) continue; const g = Math.sin(t * 2 - px0 * 0.03 + r * 6); if (g < 0.9) continue; c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(x + px0 - 2, y + py0 - 0.25, 4, 0.5); c.fillRect(x + px0 - 0.25, y + py0 - 2, 0.5, 4); }
    } },
  // Letters of living fire: "the lamps thereof are fire and flames."
  flame: { size: 18, lh: 1.2, font: (s) => "800 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      // Letters of fire: a dark ember edge, a hot gold heart, and flames licking up from them.
      c.lineJoin = "round"; c.lineWidth = 2.2; c.strokeStyle = "#5a0e08";
      const g = c.createLinearGradient(0, y, 0, y + L.lines.length * L.lh); g.addColorStop(0, "#ffe25a"); g.addColorStop(1, "#ff6a2a");
      c.shadowColor = "rgba(255,120,40,0.8)"; c.shadowBlur = 5;
      L.lines.forEach((l, i) => c.strokeText(l, x, y + i * L.lh)); c.shadowBlur = 0; c.fillStyle = g;
      L.lines.forEach((l, i) => c.fillText(l, x, y + i * L.lh));
      for (const [px0, py0, r] of textPoints(tx, L, 1.6)) { if (r > 0.1) continue; const f = Math.sin(t * 9 + r * 400) * 0.5 + 0.5; c.fillStyle = "rgba(255,200,80," + f + ")"; c.fillRect(x + px0 - 0.4, y + py0 - 2 - f * 3, 0.8, 1.5 + f); }
    } },
  // Cut into stone: dark in the cut, light on its lower lip.
  carved: { size: 9, upper: true, lh: 1.45, font: (s) => "600 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx) { L.lines.forEach((l, i) => { const yy = y + i * L.lh; c.fillStyle = tx.light || "rgba(255,240,215,0.35)"; c.fillText(l, x, yy + 0.6); c.fillStyle = tx.color || "rgba(30,20,14,0.85)"; c.fillText(l, x, yy); }); } },
  // Gold leaf, with a shine that passes along it.
  gilded: { size: 10, upper: true, lh: 1.4, font: (s) => "700 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      L.lines.forEach((l, i) => {
        const yy = y + i * L.lh, w = c.measureText(l).width, left = x - (c.textAlign === "center" ? w / 2 : 0);
        const g = c.createLinearGradient(left, yy, left + w, yy + L.size);
        const sh = ((t * 0.25 + i * 0.1) % 1.4) - 0.2;
        g.addColorStop(0, "#a8741a"); g.addColorStop(clamp(sh - 0.08, 0, 1), "#e8b94a"); g.addColorStop(clamp(sh, 0, 1), "#fff4c0"); g.addColorStop(clamp(sh + 0.08, 0, 1), "#e8b94a"); g.addColorStop(1, "#b8862a");
        c.lineWidth = 1.2; c.strokeStyle = "rgba(40,20,0,0.7)"; c.strokeText(l, x, yy); c.fillStyle = g; c.fillText(l, x, yy);
      });
    } },
  // Painted on plaster or wood, in the book hand.
  painted: { size: 10, lh: 1.3, font: (s) => "400 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx) { c.fillStyle = tx.color || "rgba(70,30,20,0.85)"; L.lines.forEach((l, i) => c.fillText(l, x, y + i * L.lh)); } },
  // Across the sky, large and pale, moving slower than the land.
  sky: { size: 20, lh: 1.15, font: (s) => "italic 500 " + s + "px " + FONT.sky,
    draw(c, L, x, y, tx, t) { c.shadowColor = tx.shadow || "rgba(20,30,70,0.55)"; c.shadowBlur = 4; c.fillStyle = tx.color || "rgba(255,255,255,0.55)"; L.lines.forEach((l, i) => c.fillText(l, x + Math.sin(t * 0.3 + i) * 2, y + i * L.lh)); c.shadowBlur = 0; } },
  // Pressed into the sand: flattened, shadowed.
  sand: { size: 13, lh: 1.1, font: (s) => "italic 600 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx) { c.translate(x, y); c.scale(1, 0.75); L.lines.forEach((l, i) => { c.fillStyle = "rgba(255,244,210,0.6)"; c.fillText(l, 0, i * L.lh + 1); c.fillStyle = tx.color || "rgba(90,52,20,0.9)"; c.fillText(l, 0, i * L.lh); }); } },
  // Stitched into a curtain or a rug.
  embroidered: { size: 9, lh: 1.35, font: (s) => "700 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx, t) {
      // Worked in wool on the cloth: a dark under-stitch, solid thread, and the grain of the stitches.
      L.lines.forEach((l, i) => {
        const yy = y + i * L.lh;
        c.fillStyle = "rgba(0,0,0,0.55)"; c.fillText(l, x + 0.5, yy + 0.6);
        c.fillStyle = tx.color || "#ffd27a"; c.fillText(l, x, yy);
        c.save(); c.globalAlpha = 0.35; c.setLineDash([0.6, 0.9]); c.lineWidth = 0.35; c.strokeStyle = "#ffffff"; c.strokeText(l, x, yy); c.restore();
      });
    } },
  // Little labels on bottles and crates.
  label: { size: 5.5, lh: 1.25, font: (s) => "700 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx) { c.fillStyle = tx.color || "#3a2410"; L.lines.forEach((l, i) => c.fillText(l, x, y + i * L.lh)); } },
  // Letters of light that kindle one by one as the monk draws near.
  kindle: { size: 11, lh: 1.35, font: (s) => "italic 600 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx, t, near) {
      const total = L.lines.join("").length, lit = clamp((tx.reach || 200) - near, 0, 1e9) / ((tx.reach || 200) * 0.6) * total;
      let n = 0;
      L.lines.forEach((l, i) => {
        const yy = y + i * L.lh, w = c.measureText(l).width;
        let xx = c.textAlign === "center" ? x - w / 2 : x; c.textAlign = "left";
        for (const ch of l) {
          // Always glowing softly enough to read; blazing up, letter by letter, as the monk draws near.
          const a = clamp(lit - n, 0, 1); n++;
          c.shadowColor = tx.glow || "rgba(255,210,120,0.95)"; c.shadowBlur = 4 + 6 * a;
          c.fillStyle = "rgba(255,244,210," + (0.62 + 0.38 * a) + ")"; c.fillText(ch, xx, yy - a);
          xx += c.measureText(ch).width;
        }
        c.textAlign = tx.align || "center";
      });
      c.shadowBlur = 0;
    } },
  // Rising like the smoke of incense: each word floats on its own.
  smoke: { size: 11, lh: 1.4, font: (s) => "italic 500 " + s + "px " + FONT.sky,
    draw(c, L, x, y, tx, t) {
      L.lines.forEach((l, i) => {
        const ws = l.split(" "), w = c.measureText(l).width; let xx = c.textAlign === "center" ? x - w / 2 : x; c.textAlign = "left";
        ws.forEach((wd, k) => { const a = 0.55 + 0.35 * Math.sin(t * 1.3 + k + i); c.fillStyle = (tx.color || "rgba(255,236,250,") + a + ")"; c.fillText(wd, xx, y + i * L.lh + Math.sin(t * 1.6 + k * 0.9) * 2.5); xx += c.measureText(wd + " ").width; });
        c.textAlign = tx.align || "center";
      });
    } },
  // On a golden chain: letters strung one by one along a curve, as far as it is made.
  chain: { size: 8, upper: true, font: (s) => "700 " + s + "px " + FONT.carved,
    draw(c, L, x, y, tx, t) {
      const str = L.lines.join(" "), pts = tx.path, made = tx.made ? tx.made() : 1;
      const total = str.length, show = Math.floor(total * made);
      c.textAlign = "center"; c.textBaseline = "middle";
      for (let i = 0; i < show; i++) {
        const u = i / Math.max(1, total - 1), seg = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(seg)), f = seg - k;
        const px = lerp(pts[k][0], pts[k + 1][0], f), py = lerp(pts[k][1], pts[k + 1][1], f);
        c.fillStyle = i % 2 ? "#cfd6dc" : "#e8b94a"; c.beginPath(); c.arc(px, py, 4.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#2a1a08"; c.fillText(str[i], px, py + 0.3);
      }
    } },
};
