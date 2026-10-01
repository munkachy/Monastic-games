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
    L.st.draw(ctx, L, x0, y0, tx, t, near);
    ctx.restore();
  },
};
const STYLE = {
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
    draw(c, L, x, y, tx, t) { c.fillStyle = tx.color || "rgba(255,255,255,0.55)"; L.lines.forEach((l, i) => c.fillText(l, x + Math.sin(t * 0.3 + i) * 2, y + i * L.lh)); } },
  // Pressed into the sand: flattened, shadowed.
  sand: { size: 13, lh: 1.1, font: (s) => "italic 600 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx) { c.translate(x, y); c.scale(1, 0.55); L.lines.forEach((l, i) => { c.fillStyle = "rgba(255,240,200,0.35)"; c.fillText(l, 0, i * L.lh + 1); c.fillStyle = tx.color || "rgba(110,70,30,0.65)"; c.fillText(l, 0, i * L.lh); }); } },
  // Stitched into a curtain or a rug.
  embroidered: { size: 9, lh: 1.35, font: (s) => "700 " + s + "px " + FONT.book,
    draw(c, L, x, y, tx, t) { c.setLineDash([1.2, 0.8]); c.lineWidth = 0.9; L.lines.forEach((l, i) => { const yy = y + i * L.lh + Math.sin(t * 1.5 + i) * 0.6; c.strokeStyle = tx.color || "#ffd27a"; c.strokeText(l, x, yy); c.fillStyle = "rgba(255,220,140,0.35)"; c.fillText(l, x, yy); }); } },
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
          const a = clamp(lit - n, 0, 1); n++;
          if (a > 0) { c.shadowColor = tx.glow || "rgba(255,220,140,0.9)"; c.shadowBlur = 6 * a; c.fillStyle = "rgba(255,246,214," + a + ")"; c.fillText(ch, xx, yy - (1 - a) * 4); }
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
