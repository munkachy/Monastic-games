"use strict";
// Fear Not: the pictures of the cut scenes, after the storyboard sheets. Dark, wet and still: one
// strong light in each picture, the rest left to the dark; neon in the city, gold only where the
// light is holy, warm adobe in the desert. What does not move in a shot is drawn once and kept
// (`still`); only the rain, the flicker and the drift are drawn each frame, and a fine film grain
// over all of it.

// ---- Helpers ---------------------------------------------------------------------------------------
// A shot's still part, drawn once at this size and kept (a few at a time).
const stillCache = new Map();
function still(key, A, fn) {
  const k = key + ":" + A.w + ":" + A.h + ":" + DPR + ":" + scale;
  let c = stillCache.get(k);
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.max(1, Math.round(A.w * scale * DPR)); c.height = Math.max(1, Math.round(A.h * scale * DPR));
    const c2 = c.getContext("2d"); c2.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
    const back = useCtx(c2);
    try { fn(A.w, A.h); } finally { useCtx(back); }
    stillCache.set(k, c);
    if (stillCache.size > 8) stillCache.delete(stillCache.keys().next().value);
  } else { stillCache.delete(k); stillCache.set(k, c); }
  ctx.drawImage(c, 0, 0, A.w, A.h);
}
// Film grain, shifting each frame.
let grainCv = null;
function grain(A, a) {
  if (!grainCv) {
    grainCv = document.createElement("canvas"); grainCv.width = grainCv.height = 128;
    const g = grainCv.getContext("2d"), d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = a || 0.07;
  const ox = Math.floor(Math.random() * 128), oy = Math.floor(Math.random() * 128);
  for (let x = -ox; x < A.w; x += 128) for (let y = -oy; y < A.h; y += 128) ctx.drawImage(grainCv, x, y);
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc;
}
// The last touch on every picture: the corners dark, and the grain.
function finish(A, v) { const g = ctx.createRadialGradient(A.w / 2, A.h / 2, A.h * 0.35, A.w / 2, A.h / 2, A.w * 0.62); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + (v === undefined ? 0.7 : v) + ")"); ctx.fillStyle = g; ctx.fillRect(0, 0, A.w, A.h); grain(A, 0.06); }
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function fillPath(c, fn) { ctx.beginPath(); fn(); ctx.fillStyle = c; ctx.fill(); }
function vgrad(y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; }
function hgrad(x0, x1, stops) { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; }
// Light on something, from one side: a gradient laid over the shape last drawn (call after a path).
function lightFrom(x0, y0, x1, y1, c, a) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, hexA(c, a)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fill(); }
// Soft lights out of focus (bokeh): lit windows and signs through rain or glass.
function bokeh(seed, n, x, y, w, h, cols, r0, r1, a) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const bx = x + r() * w, by = y + Math.pow(r(), 0.7) * h, rad = r0 + r() * (r1 - r0), c = cols[Math.floor(r() * cols.length)], al = a * (0.4 + r() * 0.6);
    glow(bx, by, rad * 2.2, c, al * 0.5);
    ctx.globalAlpha = al * 0.55; circle(bx, by, rad, c); ctx.globalAlpha = 1;
  }
}
// Drops on a window, and a few running down it.
function glassDrops(seed, n, x, y, w, h, t, c) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const dx = x + r() * w, sp = r() < 0.3 ? 8 + r() * 26 : 0, dy = y + ((r() * h + t * sp) % h), s = 0.8 + r() * 1.8;
    ctx.globalAlpha = 0.35 + r() * 0.3; circle(dx, dy, s, c);
    if (sp) { ctx.globalAlpha = 0.12; rect(dx - s * 0.4, dy - 14 - r() * 20, s * 0.8, 14 + r() * 20, c); }
  }
  ctx.globalAlpha = 1;
}
// A building in silhouette with a few lit windows.
function tower(x, base, w, h, c, o) {
  o = o || {};
  rect(x, base - h, w, h, c);
  if (o.spire) { rect(x + w * 0.42, base - h - o.spire, w * 0.16, o.spire, c); }
  if (o.step) rect(x + w * 0.15, base - h - o.step, w * 0.7, o.step, c);
  const r = seeded(o.seed || x | 0), lit = o.lit === undefined ? 0.08 : o.lit;
  for (let wy = base - h + 8; wy < base - 6; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 5) if (r() < lit) { const k = r(); ctx.globalAlpha = 0.35 + 0.5 * r(); rect(wx, wy, 2.2, 3, k < 0.5 ? "#ffd9a0" : k < 0.8 ? "#bfe4ff" : "#e9a8c0"); }
  ctx.globalAlpha = 1;
}
// A vertical neon sign of unreadable glyphs, as in the sheets.
function neonBlade(x, y, w, h, c, a) {
  a = a === undefined ? 1 : a;
  glow(x + w / 2, y + h / 2, h * 0.9, c, 0.35 * a);
  ctx.globalAlpha = a; ctx.strokeStyle = mix(c, "#ffffff", 0.35); ctx.lineWidth = 1.4; ctx.strokeRect(x, y, w, h);
  const r = seeded((x * 7 + y) | 0);
  for (let gy = y + 5; gy < y + h - 6; gy += w * 0.9) { ctx.beginPath(); ctx.moveTo(x + w * 0.25, gy + r() * 3); ctx.lineTo(x + w * 0.75, gy + r() * 3); ctx.lineTo(x + w * (0.3 + r() * 0.4), gy + w * 0.55); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// Seven-segment figures, for the clock.
function seg7(str, x, y, hgt, c) {
  const S = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
  const w = hgt * 0.5, th = hgt * 0.12;
  let cx = x;
  ctx.fillStyle = c;
  for (const ch of str) {
    if (ch === ":") { circle(cx + th, y + hgt * 0.3, th * 0.6, c); circle(cx + th, y + hgt * 0.7, th * 0.6, c); cx += th * 3; continue; }
    const on = S[ch] || "";
    const seg = { a: [cx + th, y, w - th * 2, th], g: [cx + th, y + hgt / 2 - th / 2, w - th * 2, th], d: [cx + th, y + hgt - th, w - th * 2, th], f: [cx, y + th, th, hgt / 2 - th * 1.5], b: [cx + w - th, y + th, th, hgt / 2 - th * 1.5], e: [cx, y + hgt / 2 + th / 2, th, hgt / 2 - th * 1.5], c: [cx + w - th, y + hgt / 2 + th / 2, th, hgt / 2 - th * 1.5] };
    for (const k in seg) { const [sx2, sy2, sw, sh] = seg[k]; ctx.globalAlpha = on.includes(k) ? 1 : 0.07; rr(sx2, sy2, sw, sh, th / 2); ctx.fill(); }
    ctx.globalAlpha = 1; cx += w + th * 1.6;
  }
}
// An old sedan, side on, its nose to the right (or `rear`: from behind).
function sedan(x, y, s, o) {
  o = o || {};
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.dir || 1), s);
  const body = o.body || "#15171f", hi = o.hi || "#3a4258";
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.ellipse(0, 2, 96, 6, 0, 0, TAU); ctx.fill();
  fillPath(body, () => { ctx.moveTo(-92, -10); ctx.lineTo(-90, -30); ctx.quadraticCurveTo(-86, -34, -70, -35); ctx.lineTo(-48, -36); ctx.lineTo(-30, -58); ctx.quadraticCurveTo(-26, -61, -18, -61); ctx.lineTo(30, -61); ctx.quadraticCurveTo(38, -61, 42, -57); ctx.lineTo(58, -38); ctx.lineTo(84, -35); ctx.quadraticCurveTo(94, -33, 95, -24); ctx.lineTo(96, -10); ctx.closePath(); });
  // Windows, dark, with a sheen.
  fillPath("#07080d", () => { ctx.moveTo(-42, -38); ctx.lineTo(-27, -56); ctx.lineTo(4, -56); ctx.lineTo(4, -38); ctx.closePath(); ctx.moveTo(9, -38); ctx.lineTo(9, -56); ctx.lineTo(30, -56); ctx.quadraticCurveTo(35, -56, 38, -52); ctx.lineTo(50, -38); ctx.closePath(); });
  ctx.globalAlpha = 0.25; fillPath(o.glass || "#5a7aa8", () => { ctx.moveTo(-30, -55); ctx.lineTo(-20, -55); ctx.lineTo(-34, -39); ctx.lineTo(-40, -39); ctx.closePath(); ctx.moveTo(18, -55); ctx.lineTo(24, -55); ctx.lineTo(14, -39); ctx.lineTo(10, -39); ctx.closePath(); }); ctx.globalAlpha = 1;
  // The highlight along the top of the body and the bumper line.
  line(-88, -33, -50, -35, hi, 1.2); line(58, -37, 88, -34, hi, 1.2); line(-30, -59, 32, -59, hi, 1);
  line(-92, -18, 96, -18, "rgba(255,255,255,0.08)", 1);
  rect(-94, -14, 10, 5, "#2a2e3a"); rect(86, -14, 10, 5, "#2a2e3a");
  if (o.tail) { rect(-95, -30, 5, 9, o.tail); glow(-95, -26, 26, o.tail, 0.8); }
  if (o.head) { rect(92, -30, 5, 7, "#fff6dc"); glow(96, -27, 30, "#fff6dc", 0.6); }
  for (const wx of [-58, 60]) { circle(wx, -8, 15, "#050508"); circle(wx, -8, 8, "#1a1c24"); circle(wx, -8, 3, "#33363f"); }
  ctx.restore();
}
// A demon standing: tall and thin, a hat askew, a ragged long coat to the shins, ember eyes,
// the red of its edges the only colour on it. (x, y): its feet.
function demonStand(x, y, s, o) {
  o = o || {};
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.dir || 1), s); ctx.rotate(o.lean || 0);
  const ink = "#030205", rim = o.rim || "#d01828", edge = 1.3 / s;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // Thin legs below the coat.
  ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(-9, 0); ctx.moveTo(6, -40); ctx.lineTo(10, 0); ctx.stroke();
  // The far arm, hanging behind.
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-14, -128); ctx.quadraticCurveTo(-24, -96, -22, -66); ctx.stroke();
  for (const c of [-1, 0, 1]) line(-22, -66, -24 + c * 3, -54, ink, 1.4);
  // The coat: narrow at the shoulders, falling in rags to the shins.
  const coat = () => {
    ctx.beginPath(); ctx.moveTo(-8, -146); ctx.quadraticCurveTo(-18, -142, -19, -126); ctx.lineTo(-24, -40);
    const pts = [[-24, -40], [-20, -22], [-16, -34], [-10, -14], [-5, -30], [0, -18], [5, -32], [10, -12], [14, -30], [19, -20], [24, -38]];
    for (const [px, py] of pts) ctx.lineTo(px, py);
    ctx.lineTo(18, -126); ctx.quadraticCurveTo(16, -142, 8, -146); ctx.closePath();
  };
  coat(); ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = hexA(rim, 0.6); ctx.lineWidth = edge; ctx.stroke();
  // The near arm, long, with claws; reaching forward if asked.
  const rch = o.reach || 0, hx = 22 + rch * 34, hy = -64 - rch * 40;
  ctx.strokeStyle = ink; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(14, -130); ctx.quadraticCurveTo(26 + rch * 10, -100 - rch * 20, hx, hy); ctx.stroke();
  ctx.strokeStyle = hexA(rim, 0.55); ctx.lineWidth = edge; ctx.beginPath(); ctx.moveTo(18, -128); ctx.quadraticCurveTo(30 + rch * 10, -100 - rch * 20, hx + 3, hy); ctx.stroke();
  for (const c of [-1, 0, 1]) line(hx, hy, hx + 5 + c * 2, hy + 10 + c * 2, ink, 1.6);
  // The head, the collar up round it, and the hat.
  circle(0, -156, 9, ink);
  fillPath(ink, () => { ctx.moveTo(-12, -146); ctx.lineTo(-10, -160); ctx.lineTo(0, -150); ctx.lineTo(10, -160); ctx.lineTo(12, -146); ctx.closePath(); });
  ctx.save(); ctx.translate(0, -164); ctx.rotate(o.hatTilt === undefined ? -0.16 : o.hatTilt);
  fillPath(ink, () => { ctx.ellipse(0, 0, 20, 3.6, 0, 0, TAU); });
  fillPath(ink, () => { ctx.moveTo(-11, 0); ctx.lineTo(-10, -13); ctx.quadraticCurveTo(-4, -17, 0, -13); ctx.quadraticCurveTo(4, -17, 10, -13); ctx.lineTo(11, 0); ctx.closePath(); });
  ctx.strokeStyle = hexA(rim, 0.65); ctx.lineWidth = edge; ctx.beginPath(); ctx.ellipse(0, 0, 20, 3.6, 0, PI * 0.95, TAU * 1.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-4, -17, 0, -13); ctx.quadraticCurveTo(4, -17, 10, -13); ctx.stroke();
  ctx.restore();
  // The eyes.
  for (const d of [-1, 1]) { circle(d * 3.6 + 1, -157, 1.5, "#ffc080"); glow(d * 3.6 + 1, -157, 8, "#ff2a10", 0.95); }
  ctx.restore();
}

// ---- 1. Bring Daddy Home ---------------------------------------------------------------------------
// The radio on the kitchen table at two in the morning: its dial glowing cyan, the clock in red.
function radioShot(t, A) {
  const w = A.w, h = A.h, rx = w * 0.4, ry = h * 0.56, cx = w * 0.7;
  still("radio", A, () => {
    rect(0, 0, w, h, "#040509");
    ctx.fillStyle = vgrad(0, h, [[0, "#06080f"], [0.7, "#0a0d16"], [1, "#05060a"]]); ctx.fillRect(0, 0, w, h * 0.72);
    // The wall: faint boards, and a window's cold light far to the left.
    for (let x = 20; x < w; x += 46) rect(x, 0, 1, h * 0.72, "rgba(255,255,255,0.015)");
    glowOval(w * 0.05, h * 0.3, w * 0.25, h * 0.5, "#2a4a7a", 0.12);
    // The table.
    ctx.fillStyle = vgrad(h * 0.72, h, [[0, "#14100e"], [1, "#060504"]]); ctx.fillRect(0, h * 0.72, w, h * 0.28);
    rect(0, h * 0.72, w, 1.5, "#2a2420");
    for (let k = 1; k < 6; k++) line(0, h * 0.72 + k * k * 2.2, w, h * 0.72 + k * k * 2.2, "rgba(0,0,0,0.25)", 1);
    // The radio: a rounded body, the grille, the dial window, the knob.
    rr(rx - 130, ry - 80, 260, 132, 18); ctx.fillStyle = vgrad(ry - 80, ry + 52, [[0, "#232631"], [1, "#0e1016"]]); ctx.fill();
    rr(rx - 130, ry - 80, 260, 132, 18); ctx.strokeStyle = "rgba(0,194,240,0.35)"; ctx.lineWidth = 1.2; ctx.stroke();
    rr(rx - 112, ry - 58, 118, 92, 10); ctx.fillStyle = "#0a0b10"; ctx.fill();
    for (let i = 0; i < 11; i++) { rr(rx - 104, ry - 50 + i * 8, 102, 3.5, 2); ctx.fillStyle = "#171a22"; ctx.fill(); }
    rr(rx + 18, ry - 62, 96, 54, 8); ctx.fillStyle = "#04121a"; ctx.fill(); ctx.strokeStyle = "#2a3a46"; ctx.lineWidth = 1.5; ctx.stroke();
    circle(rx + 92, ry + 18, 15, "#14161d"); circle(rx + 92, ry + 18, 11, "#1e2129"); line(rx + 92, ry + 18, rx + 99, ry + 11, "#3a404c", 2);
    circle(rx + 40, ry + 18, 6, "#14161d");
    rect(rx - 112, ry + 58, 30, 4, "#0a0b10"); rect(rx + 82, ry + 58, 30, 4, "#0a0b10");
    // The clock.
    rr(cx - 70, ry - 36, 140, 74, 10); ctx.fillStyle = vgrad(ry - 36, ry + 38, [[0, "#15161c"], [1, "#08090c"]]); ctx.fill();
    rr(cx - 60, ry - 26, 120, 54, 6); ctx.fillStyle = "#120406"; ctx.fill();
  });
  // The dial: its arc of marks, the needle drifting, the cyan glow on the table.
  const dx = rx + 66, dy = ry - 14, fl = 0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 5.1);
  glow(dx, dy - 10, 110, C.cyan, 0.32 * fl);
  ctx.strokeStyle = hexA(C.cyan, 0.95); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(dx, dy, 32, PI * 1.08, PI * 1.92); ctx.stroke();
  for (let i = 0; i <= 12; i++) { const a = PI * 1.08 + i / 12 * PI * 0.84, r0 = i % 3 ? 27 : 24; line(dx + Math.cos(a) * r0, dy + Math.sin(a) * r0, dx + Math.cos(a) * 30, dy + Math.sin(a) * 30, hexA(C.ice, 0.85), 1.2); }
  const na = PI * 1.5 + Math.sin(t * 0.6) * 0.15;
  line(dx, dy, dx + Math.cos(na) * 34, dy + Math.sin(na) * 34, "#e8fbff", 1.6);
  rect(rx + 26, ry - 20, 80, 2, hexA(C.cyan, 0.7));
  glowOval(dx, ry + 70, 160, 14, C.cyan, 0.22 * fl);
  // The clock: 2:00, the colon blinking.
  const red = "#ff2a35";
  glow(cx, ry, 110, C.red, 0.3);
  seg7(Math.sin(t * PI) > 0 ? "2:00" : "2 00", cx - 46, ry - 17, 34, red);
  glow(cx, ry, 60, C.red, 0.35);
  glowOval(cx, ry + 66, 110, 10, C.red, 0.25);
  finish(A, 0.75);
}
// The city, a week into the dark: towers against the night, few windows lit, neon on the wet.
function skylineDarkShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.8;
  still("skyline-dark", A, () => {
    ctx.fillStyle = vgrad(0, gy, [[0, "#03050c"], [0.6, "#0a1430"], [1, "#132046"]]); ctx.fillRect(0, 0, w, gy);
    glowOval(w * 0.5, gy, w * 0.6, h * 0.25, "#2a3a7a", 0.25);
    const r = seeded(77);
    for (let x = -10; x < w; x += 26 + r() * 30) tower(x, gy - 4, 22 + r() * 34, 60 + r() * 120, "#0b1328", { seed: x | 0, lit: 0.05, spire: r() < 0.15 ? 20 : 0 });
    for (let x = -20; x < w; x += 34 + r() * 40) tower(x, gy, 30 + r() * 46, 40 + Math.pow(r(), 1.5) * 150, "#060a16", { seed: (x | 0) + 9, lit: 0.08, step: r() < 0.3 ? 10 : 0, spire: r() < 0.12 ? 26 : 0 });
    // The street, wet, at the foot of it.
    ctx.fillStyle = vgrad(gy, h, [[0, "#070a14"], [1, "#030408"]]); ctx.fillRect(0, gy, w, h - gy);
    rect(0, gy, w, 1, "#1a2440");
  });
  const signs = [[w * 0.27, 0.0, C.cyan], [w * 0.62, 0.4, C.pink], [w * 0.74, 1.3, C.red]];
  for (const [x, ph, c] of signs) {
    const a = c === C.red ? 0.8 : Math.sin(t * 2.3 + ph * 7) > 0.96 ? 0.3 : 1, sh = c === C.red ? 16 : 56;
    neonBlade(x, gy - 40 - sh, c === C.red ? 14 : 12, sh, c, a);
    // Its reflection on the wet street.
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = vgrad(gy, h, [[0, hexA(c, 0.32 * a)], [1, hexA(c, 0)]]); ctx.fillRect(x - 3 + Math.sin(t * 2 + x) * 1.5, gy + 2, 18, h - gy); ctx.restore();
  }
  rain(t, 140, 0, 0, w, h, { seed: 3, color: "rgba(196,220,255,0.22)" });
  finish(A, 0.6);
}
// The girl at her window, side on: kneeling on her bed, hands joined, the pink city beyond the rain.
function girlWindowShot(t, A, o) {
  const w = A.w, h = A.h, wx = w * 0.46, wy = h * 0.04, ww = w * 0.5, wh = h * 0.74, sill = wy + wh;
  still("girl-window", A, () => {
    rect(0, 0, w, h, "#0d0816");
    ctx.fillStyle = hgrad(0, w, [[0, "#0a0612"], [0.5, "#150b22"], [1, "#1c0d26"]]); ctx.fillRect(0, 0, w, h);
    // Beyond the glass: night, the towers lost in rain, their lights blurred pink.
    ctx.save(); rr(wx, wy, ww, wh, 2); ctx.clip();
    ctx.fillStyle = vgrad(wy, sill, [[0, "#1a0828"], [0.6, "#3a0c3a"], [1, "#5a1450"]]); ctx.fillRect(wx, wy, ww, wh);
    const r = seeded(5);
    for (let i = 0; i < 9; i++) { const bx = wx + r() * ww, bw = 20 + r() * 40, bh = 40 + r() * 120; ctx.globalAlpha = 0.35; rect(bx, sill - bh, bw, bh, "#1a0620"); }
    ctx.globalAlpha = 1;
    bokeh(11, 46, wx, wy + wh * 0.15, ww, wh * 0.85, ["#ff4fa8", "#ff7ac0", "#d040ff", "#ff9ad0"], 1.5, 6, 0.9);
    bokeh(12, 10, wx, wy + wh * 0.3, ww, wh * 0.7, ["#ff4fa8", "#c050ff"], 8, 16, 0.5);
    ctx.restore();
    // The frame and its bars.
    ctx.strokeStyle = "#1a1024"; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh);
    rect(wx + ww * 0.5 - 4, wy, 8, wh, "#1a1024"); rect(wx, wy + wh * 0.46, ww, 6, "#1a1024");
    rect(wx - 4, wy, 3, wh, hexA("#ff5ab0", 0.35));
    // The sill, and the bed below it.
    rect(wx - 18, sill, ww + 30, 12, "#2a1636"); rect(wx - 18, sill, ww + 30, 2, "#ff7ac0");
    ctx.fillStyle = vgrad(sill + 12, h, [[0, "#22122e"], [1, "#0c0612"]]); ctx.fillRect(0, sill + 12, w, h);
    ctx.fillStyle = vgrad(sill - 10, h, [[0, "#2a1a3c"], [1, "#120a1c"]]); rr(-20, sill - 6, wx + 10, h, 18); ctx.fill();
    // The pillow, at the left.
    rr(w * 0.03, sill - 44, w * 0.16, 48, 22); ctx.fillStyle = "#2c1e40"; ctx.fill(); rr(w * 0.03, sill - 44, w * 0.16, 48, 22); lightFrom(w * 0.19, 0, w * 0.03, 0, "#ff7ac0", 0.18);
    // The rabbit on the sill, against the glow.
    const bx = wx + ww * 0.86, by = sill;
    ctx.fillStyle = "#3a2240";
    fillPath("#3a2240", () => { ctx.ellipse(bx, by - 18, 15, 18, 0, 0, TAU); });
    fillPath("#3a2240", () => { ctx.arc(bx + 2, by - 42, 11, 0, TAU); });
    fillPath("#3a2240", () => { ctx.ellipse(bx - 3, by - 64, 4, 13, -0.15, 0, TAU); });
    fillPath("#3a2240", () => { ctx.ellipse(bx + 7, by - 63, 4, 13, 0.25, 0, TAU); });
    ctx.strokeStyle = hexA("#ff9ad0", 0.45); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx + 2, by - 42, 11, -1.2, 0.9); ctx.stroke();
    // The girl.
    girlKneeling(wx - 52 * (h / 276), sill + 22 * (h / 276), 1.5 * (h / 276));
  });
  // The rain on the glass and beyond it.
  ctx.save(); rr(wx, wy, ww, wh, 2); ctx.clip();
  rain(t, 70, wx, wy, ww, wh, { color: "rgba(255,170,220,0.22)", seed: 8, len: 16 });
  glassDrops(4, 60, wx, wy, ww, wh, t, "#ffc0e0");
  ctx.restore();
  glowOval(wx + ww * 0.4, sill + 6, ww * 0.55, 10, "#ff4fa8", 0.22);
  finish(A, 0.65);
}
// The girl, kneeling, side on and facing right: sitting back on her heels, hands joined before
// her chin, her ponytail down her back; the pink of the window along her front.
function girlKneeling(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const pj = "#b04a84", pjS = "#5a2248", pjD = "#3a1634", skin = "#d8a088", skinS = "#8a5250", hair = "#1e100c", rim = "#ff8ad0";
  // Her legs, folded under her, the knees toward the window.
  fillPath(pjD, () => { ctx.moveTo(-58, 0); ctx.quadraticCurveTo(-60, -22, -34, -30); ctx.quadraticCurveTo(10, -36, 34, -22); ctx.quadraticCurveTo(42, -10, 30, 0); ctx.closePath(); });
  fillPath(pjS, () => { ctx.moveTo(-40, -26); ctx.quadraticCurveTo(0, -38, 30, -26); ctx.quadraticCurveTo(38, -16, 28, -8); ctx.quadraticCurveTo(-10, -12, -40, -10); ctx.closePath(); });
  // The body, upright, leaning a little toward the window.
  fillPath(pj, () => { ctx.moveTo(-46, -20); ctx.quadraticCurveTo(-52, -70, -34, -98); ctx.quadraticCurveTo(-20, -112, -2, -106); ctx.quadraticCurveTo(12, -96, 10, -70); ctx.quadraticCurveTo(10, -40, 0, -22); ctx.closePath(); });
  ctx.save(); ctx.beginPath(); ctx.moveTo(-46, -20); ctx.quadraticCurveTo(-52, -70, -34, -98); ctx.quadraticCurveTo(-20, -112, -2, -106); ctx.quadraticCurveTo(12, -96, 10, -70); ctx.quadraticCurveTo(10, -40, 0, -22); ctx.closePath(); ctx.clip();
  ctx.fillStyle = hgrad(-50, 12, [[0, "rgba(20,0,20,0.55)"], [0.7, "rgba(0,0,0,0)"], [1, hexA(rim, 0.25)]]); ctx.fillRect(-60, -120, 80, 110);
  const r = seeded(3);
  for (let i = 0; i < 26; i++) { const px = -50 + r() * 60, py = -104 + r() * 84; ctx.globalAlpha = 0.45; star5(px, py, 1.8, "#ffd6ea"); }
  ctx.globalAlpha = 1; ctx.restore();
  // The near arm: from the shoulder down to the elbow, and up to the hands before her chin.
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = pjS; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(-18, -94); ctx.quadraticCurveTo(-14, -66, -4, -58); ctx.lineTo(16, -86); ctx.stroke();
  ctx.strokeStyle = hexA(rim, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -60); ctx.lineTo(20, -82); ctx.stroke();
  // The hands, palms together, fingers up, just under her chin.
  fillPath(skinS, () => { ctx.ellipse(22, -96, 7, 15, 0.35, 0, TAU); });
  fillPath(skin, () => { ctx.ellipse(24, -97, 5.5, 14, 0.35, 0, TAU); });
  ctx.strokeStyle = hexA(rim, 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(24, -97, 5.5, 14, 0.35, -1.7, 0.7); ctx.stroke();
  // The head, bowed a little, in profile: eyes closed.
  ctx.save(); ctx.translate(-8, -128); ctx.rotate(0.18);
  // The ponytail, swinging down her back, and its band.
  fillPath(hair, () => { ctx.moveTo(-18, -8); ctx.quadraticCurveTo(-44, -6, -40, 22); ctx.quadraticCurveTo(-36, 38, -28, 44); ctx.quadraticCurveTo(-30, 20, -14, 6); ctx.closePath(); });
  fillPath("#e0508a", () => { ctx.ellipse(-20, -6, 4, 6, 0.4, 0, TAU); });
  // The neck, the head, the ear.
  rect(-6, 14, 12, 14, skinS);
  fillPath(skinS, () => { ctx.arc(0, 0, 21, 0, TAU); });
  fillPath(skin, () => { ctx.moveTo(2, -20); ctx.quadraticCurveTo(20, -18, 21, -4); ctx.quadraticCurveTo(21, -1, 25, 4); ctx.quadraticCurveTo(26, 7, 22, 8); ctx.quadraticCurveTo(23, 12, 21, 13); ctx.quadraticCurveTo(22, 16, 18, 19); ctx.quadraticCurveTo(10, 24, 2, 20); ctx.quadraticCurveTo(-6, 4, 2, -20); });
  fillPath(skinS, () => { ctx.ellipse(-3, 3, 4, 6, 0.1, 0, TAU); });
  // Her hair: the crown, and the bangs over her brow.
  fillPath(hair, () => { ctx.moveTo(-20, 12); ctx.quadraticCurveTo(-26, -22, 0, -24); ctx.quadraticCurveTo(18, -24, 22, -8); ctx.quadraticCurveTo(16, -12, 12, -10); ctx.quadraticCurveTo(10, -4, 14, 0); ctx.quadraticCurveTo(6, -2, 4, -8); ctx.quadraticCurveTo(0, 2, -6, 10); ctx.quadraticCurveTo(-12, 4, -14, 14); ctx.closePath(); });
  ctx.strokeStyle = hexA(rim, 0.55); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -23); ctx.quadraticCurveTo(18, -22, 22, -8); ctx.stroke();
  // The closed eye, its lashes; the blush of her cheek; the mouth.
  ctx.strokeStyle = "#2a1210"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(11, 0); ctx.quadraticCurveTo(14, 3, 18, 1); ctx.stroke();
  for (let i = 0; i < 3; i++) line(12 + i * 2.5, 2, 11.5 + i * 2.5, 4.5, "#2a1210", 1);
  glow(12, 9, 7, "#ff7aa0", 0.25);
  line(18, 15, 21, 14.5, "#7a3a3a", 1.2);
  // The window's light along her profile.
  ctx.strokeStyle = hexA(rim, 0.95); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(19, -10); ctx.quadraticCurveTo(21, -6, 21, -4); ctx.quadraticCurveTo(21, -1, 25, 4); ctx.quadraticCurveTo(26, 7, 22, 8); ctx.quadraticCurveTo(23, 12, 21, 13); ctx.quadraticCurveTo(22, 16, 18, 19); ctx.stroke();
  ctx.restore();
  // The light along her front and her knees.
  ctx.strokeStyle = hexA(rim, 0.6); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(10, -40, 10, -66); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -26); ctx.quadraticCurveTo(40, -16, 30, -2); ctx.stroke();
  ctx.restore();
}
function star5(x, y, r, c) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
// Hands joined in prayer, side on, the fingers up and to the right; the window's light down
// their far edge. (x, y): the heel of the hands.
function prayingHands(x, y, s, o) {
  o = o || {};
  const skin = o.skin || "#d29a82", sh = o.shade || "#7a4a44", rim = o.rim || "#ffb8d8", tilt = o.tilt === undefined ? 0.22 : o.tilt;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  // The far hand's fingertips, just showing past the near hand's.
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = mix(sh, "#000000", 0.2); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(14, -40 - i * 4); ctx.lineTo(22 - i * 2, -96 + i * 10 - (i === 1 ? 6 : 0)); ctx.stroke(); }
  // The near hand: its back, then the four fingers, each a little apart, the knuckles creased.
  fillPath(skin, () => { ctx.moveTo(-26, 30); ctx.quadraticCurveTo(-34, -10, -22, -44); ctx.lineTo(18, -48); ctx.quadraticCurveTo(26, -10, 16, 30); ctx.closePath(); });
  const fingers = [[-18, -44, -14, -104], [-6, -46, -2, -116], [6, -46, 10, -110], [16, -44, 20, -94]];
  fingers.forEach(([x0, y0, x1, y1], i) => {
    ctx.strokeStyle = i % 2 ? mix(skin, sh, 0.12) : skin; ctx.lineWidth = 12.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    for (const u of [0.38, 0.7]) { const kx = lerp(x0, x1, u), ky = lerp(y0, y1, u); line(kx - 4, ky + 1, kx + 4, ky - 1, "rgba(110,50,50,0.45)", 1.1); }
  });
  for (let i = 0; i < 3; i++) { const [x0, y0, x1, y1] = fingers[i], [x2, y2, x3, y3] = fingers[i + 1]; line((x0 + x2) / 2, (y0 + y2) / 2 - 4, (x1 + x3) / 2, (y1 + y3) / 2 + 10, "rgba(80,30,30,0.55)", 1.2); }
  // The thumb, along the front.
  ctx.strokeStyle = mix(skin, sh, 0.3); ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-24, 18); ctx.quadraticCurveTo(-34, -14, -26, -50); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-23, 14); ctx.quadraticCurveTo(-32, -14, -25, -48); ctx.stroke();
  // Shadow on the near side, light on the far.
  ctx.fillStyle = hgrad(-40, 30, [[0, "rgba(60,20,30,0.4)"], [0.6, "rgba(0,0,0,0)"]]); ctx.fillRect(-42, -124, 80, 160);
  ctx.strokeStyle = hexA(rim, 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, -92); ctx.lineTo(23, -60); ctx.quadraticCurveTo(28, -10, 18, 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -116); ctx.quadraticCurveTo(10, -118, 16, -108); ctx.stroke();
  ctx.restore();
}
// Her joined hands on the sill, the glow-in-the-dark rosary hanging from them.
function girlHandsShot(t, A) {
  const w = A.w, h = A.h, cx = w * 0.42, cy = h * 0.5, k = h / 276;
  still("girl-hands", A, () => {
    rect(0, 0, w, h, "#0c0714");
    // The window behind, rain on it, the pink beyond.
    const wy0 = h * 0.06, wy1 = h * 0.62;
    ctx.fillStyle = vgrad(wy0, wy1, [[0, "#1c0a2a"], [1, "#3a1240"]]); ctx.fillRect(w * 0.08, wy0, w * 0.9, wy1 - wy0);
    bokeh(31, 30, w * 0.1, wy0, w * 0.88, wy1 - wy0, ["#ff4fa8", "#c050ff", "#ff9ad0"], 2, 8, 0.45);
    rect(w * 0.08, wy0, w * 0.9, 6, "#170c20"); rect(w * 0.08, wy0, 8, wy1 - wy0, "#170c20"); rect(w * 0.53, wy0, 7, wy1 - wy0, "#170c20");
    // The sill.
    ctx.fillStyle = vgrad(wy1, h, [[0, "#2a1636"], [0.08, "#1a0e24"], [1, "#0a0610"]]); ctx.fillRect(0, wy1, w, h - wy1);
    rect(0, wy1, w, 2, "#a05a9a");
    // Her sleeves, coming in from the left.
    fillPath("#7a3462", () => { ctx.moveTo(-10, h * 0.98); ctx.quadraticCurveTo(cx - 160 * k, cy + 60 * k, cx - 60 * k, cy + 30 * k); ctx.lineTo(cx - 40 * k, cy + 70 * k); ctx.quadraticCurveTo(cx - 140 * k, cy + 110 * k, cx - 160 * k, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath(); });
    fillPath("#5a2448", () => { ctx.moveTo(-10, h * 0.62); ctx.quadraticCurveTo(cx - 170 * k, cy + 10 * k, cx - 70 * k, cy + 4 * k); ctx.lineTo(cx - 56 * k, cy + 40 * k); ctx.quadraticCurveTo(cx - 160 * k, cy + 50 * k, -10, h * 0.86); ctx.closePath(); });
    // The hands, palms together, fingers up.
    prayingHands(cx, cy + 40 * k, 1.25 * k, {});
  });
  // The rosary: glowing beads in a loop hanging from her hands, swaying a little.
  const sw = Math.sin(t * 1.3) * 3 * k, beads = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, a = PI * 0.02 + u * PI * 0.96; beads.push([cx + 20 * k + Math.cos(a) * 44 * k + sw * Math.sin(u * PI), cy + 4 * k + Math.sin(a) * 78 * k]); }
  ctx.strokeStyle = "rgba(190,255,210,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); beads.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  for (const [x, y] of beads) { glow(x, y, 9 * k, "#9effbe", 0.55); circle(x, y, 3.4 * k, "#d4ffe2"); }
  const bx = cx + 20 * k + sw, by = cy + 100 * k;
  rect(bx - 1.6 * k, by - 10 * k, 3.2 * k, 26 * k, "#d4ffe2"); rect(bx - 8 * k, by - 3 * k, 16 * k, 3.2 * k, "#d4ffe2"); glow(bx, by, 26 * k, "#9effbe", 0.6);
  // Rain on the window behind.
  ctx.save(); ctx.beginPath(); ctx.rect(w * 0.08, h * 0.06, w * 0.9, h * 0.56); ctx.clip();
  rain(t, 40, 0, 0, w, h * 0.62, { color: "rgba(255,180,230,0.18)", seed: 14, len: 14 });
  ctx.restore();
  finish(A, 0.7);
}
// The street in the rain: a lamp, the old sedan under it, the corner store with its neon across.
function carStreetShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.78, k = h / 276, carX = w * 0.32, lampX = w * 0.17, sx0 = w * 0.55, sx1 = w * 0.9;
  still("car-street", A, () => {
    ctx.fillStyle = vgrad(0, gy, [[0, "#020309"], [1, "#0b1226"]]); ctx.fillRect(0, 0, w, gy);
    const r = seeded(23);
    for (let x = -10; x < w; x += 30 + r() * 40) tower(x, gy - 30 * k, 30 + r() * 40, 40 + r() * 110, "#070b18", { seed: x | 0, lit: 0.05 });
    // The store: a low block under a cornice, an awning, big windows lit from inside, a door.
    const sw = sx1 - sx0, top = gy - 104 * k;
    rect(sx0, top, sw, gy - top, "#0b0d16"); rect(sx0 - 6, top - 6 * k, sw + 12, 8 * k, "#151a28");
    for (let i = 0; i < 6; i++) rect(sx0 + 8 + i * (sw - 16) / 6, top + 6 * k, (sw - 16) / 6 - 8, 16 * k, "#070910");
    fillPath("#2a0a14", () => { ctx.moveTo(sx0 - 4, gy - 62 * k); ctx.lineTo(sx0 + sw + 4, gy - 62 * k); ctx.lineTo(sx0 + sw + 12, gy - 50 * k); ctx.lineTo(sx0 - 12, gy - 50 * k); ctx.closePath(); });
    for (let i = 0; i < 12; i++) rect(sx0 - 10 + i * (sw + 20) / 12, gy - 52 * k, (sw + 20) / 24, 2 * k, "#4a1020");
    const win = (x0, x1) => {
      ctx.fillStyle = vgrad(gy - 48 * k, gy - 6 * k, [[0, "#ff8aa8"], [0.5, "#c03860"], [1, "#5a1428"]]); ctx.fillRect(x0, gy - 48 * k, x1 - x0, 42 * k);
      for (let j = 0; j < 3; j++) rect(x0 + 4, gy - 40 * k + j * 12 * k, x1 - x0 - 8, 2, "rgba(40,0,10,0.5)");
      const rr3 = seeded(x0 | 0); for (let j = 0; j < 14; j++) { ctx.globalAlpha = 0.5; rect(x0 + 4 + rr3() * (x1 - x0 - 10), gy - 44 * k + Math.floor(rr3() * 3) * 12 * k, 3, 7 * k, rr3() < 0.5 ? "#ffd0a0" : "#3a0a18"); }
      ctx.globalAlpha = 1; ctx.strokeStyle = "#16080e"; ctx.lineWidth = 3; ctx.strokeRect(x0, gy - 48 * k, x1 - x0, 42 * k);
    };
    win(sx0 + 8, sx0 + sw * 0.42); win(sx0 + sw * 0.58, sx1 - 8);
    rect(sx0 + sw * 0.45, gy - 50 * k, sw * 0.1, 50 * k, "#14060c"); rect(sx0 + sw * 0.46, gy - 46 * k, sw * 0.08, 30 * k, "#7a2a40");
    // The street and the pavement, wet.
    ctx.fillStyle = vgrad(gy, h, [[0, "#0b0e18"], [1, "#04050a"]]); ctx.fillRect(0, gy, w, h - gy);
    rect(0, gy, w, 2, "#1c2236");
    // The lamp post.
    rect(lampX - 2, gy - 150 * k, 4, 150 * k, "#05060a"); rect(lampX - 2, gy - 150 * k, 22 * k, 3, "#05060a"); rect(lampX + 14 * k, gy - 149 * k, 12 * k, 4, "#0c0d12");
  });
  // The neon: the red sign over the door, the cyan one at the end.
  const fl = Math.sin(t * 17) > 0.97 ? 0.4 : 1;
  rr(sx0 + 20, gy - 82 * k, (sx1 - sx0) * 0.5, 14 * k, 3); ctx.strokeStyle = "#ff3a50"; ctx.lineWidth = 2; ctx.stroke();
  rect(sx0 + 28, gy - 76 * k, (sx1 - sx0) * 0.5 - 16, 2, "#ff9aa8");
  glow(sx0 + 20 + (sx1 - sx0) * 0.25, gy - 75 * k, 90 * k, C.red, 0.55 * fl);
  rr(sx1 - (sx1 - sx0) * 0.3, gy - 84 * k, (sx1 - sx0) * 0.24, 12 * k, 3); ctx.strokeStyle = C.cyan; ctx.stroke();
  glow(sx1 - (sx1 - sx0) * 0.18, gy - 78 * k, 60 * k, C.cyan, 0.5);
  glowOval((sx0 + sx1) / 2, gy - 30 * k, (sx1 - sx0) * 0.6, 40 * k, "#ff3a60", 0.25);
  // The lamp's cone and pool.
  const lamp = o.lamp === undefined ? (Math.sin(t * 9) > 0.7 ? 0.35 : 1) : o.lamp;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12 * lamp;
  fillPath("#cfe4ff", () => { ctx.moveTo(lampX + 16 * k, gy - 146 * k); ctx.lineTo(lampX + 24 * k, gy - 146 * k); ctx.lineTo(lampX + 80 * k, gy); ctx.lineTo(lampX - 40 * k, gy); ctx.closePath(); });
  ctx.restore();
  glow(lampX + 20 * k, gy - 146 * k, 40 * k, "#e8f4ff", 0.9 * lamp);
  glowOval(lampX + 20 * k, gy + 6, 90 * k, 12 * k, "#cfe4ff", 0.3 * lamp);
  // The shapes, tall, behind the car and leaning in round it, their eyes on him.
  if (o.shapes) {
    const lean = 0.06 * smooth(t / 3);
    demonStand(carX - 92 * k, gy + 2 * k, 0.95 * k, { lean: 0.08 + lean, reach: 0.3 });
    demonStand(carX - 30 * k, gy - 6 * k, 0.9 * k, { lean: 0.03 + lean, hatTilt: 0.18 });
    demonStand(carX + 34 * k, gy - 6 * k, 0.92 * k, { dir: -1, lean: 0.05 + lean });
    demonStand(carX + 96 * k, gy + 2 * k, 0.98 * k, { dir: -1, lean: 0.1 + lean, reach: 0.4, hatTilt: -0.28 });
    glowOval(carX, gy - 70 * k, 190 * k, 70 * k, "#ff1020", 0.1);
  }
  // The car.
  sedan(carX, gy + 18 * k, 1.25 * k, { body: "#141620", hi: "#4a5470" });
  // Reflections in the wet street.
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const [x, c, ww, a] of [[sx0 + 20 + (sx1 - sx0) * 0.25, "#ff2a50", 70, 0.4 * fl], [sx1 - (sx1 - sx0) * 0.18, C.cyan, 26, 0.35], [lampX + 20 * k, "#cfe4ff", 14, 0.3 * lamp], [(sx0 + sx1) / 2, "#ff6a90", 120, 0.18]]) {
    ctx.fillStyle = vgrad(gy, h, [[0, hexA(c, a)], [1, hexA(c, 0)]]); ctx.fillRect(x - ww / 2 + Math.sin(t * 2 + x) * 2, gy + 2, ww, h - gy);
  }
  ctx.restore();
  rain(t, 150, 0, 0, w, h, { seed: 11, color: "rgba(196,220,255,0.24)" });
  finish(A, 0.65);
}
// The man's eyes in the rear-view mirror, a band of cyan light across them.
function mirrorShot(t, A) {
  const w = A.w, h = A.h, mw = Math.min(w * 0.72, 560), mh = h * 0.5, mx = w / 2 - mw / 2, my = h * 0.24;
  still("mirror", A, () => {
    rect(0, 0, w, h, "#03050a");
    // The windscreen beyond: night, rain, a few lights far off.
    ctx.fillStyle = vgrad(0, h, [[0, "#060a14"], [1, "#020306"]]); ctx.fillRect(0, 0, w, h);
    bokeh(41, 18, 0, 0, w, h * 0.7, ["#2a6a9a", "#ff3a6a", "#4a8aba"], 2, 7, 0.25);
    rect(w / 2 - 6, 0, 12, my, "#0a0b10");
    // The mirror's glass: his eyes in it.
    ctx.save(); rr(mx, my, mw, mh, mh * 0.42); ctx.clip();
    eyesFace(mx, my, mw, mh, { skin: "#4a3430", shade: "#0e0a0c", iris: "#3a4a58", brow: "#06040a", open: 0.6, browTilt: 0.5, side: 1 });
    ctx.fillStyle = "rgba(10,30,60,0.35)"; ctx.fillRect(mx, my, mw, mh);
    ctx.restore();
    rr(mx, my, mw, mh, mh * 0.42); ctx.strokeStyle = "#0b0c12"; ctx.lineWidth = 10; ctx.stroke();
    rr(mx - 5, my - 5, mw + 10, mh + 10, mh * 0.46); ctx.strokeStyle = "#1c2030"; ctx.lineWidth = 1.5; ctx.stroke();
  });
  // The band of cyan light from the dashboard across his face, drifting.
  ctx.save(); rr(mx, my, mw, mh, mh * 0.42); ctx.clip();
  const by = my + mh * (0.72 + 0.03 * Math.sin(t * 0.7));
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = vgrad(by - mh * 0.12, by + mh * 0.12, [[0, "rgba(0,194,240,0)"], [0.5, "rgba(0,194,240,0.55)"], [1, "rgba(0,194,240,0)"]]); ctx.fillRect(mx, by - mh * 0.12, mw, mh * 0.24);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.08; rr(mx, my, mw, mh, mh * 0.42); ctx.fillStyle = "#9fc8ff"; ctx.fill(); ctx.restore();
  rain(t, 40, 0, 0, w, h, { color: "rgba(196,240,255,0.08)", seed: 2 });
  finish(A, 0.7);
}
// A strip of a face: brows and eyes, lit from one side (the mirror, and the close-ups).
function eyesFace(x, y, w, h, o) {
  const side = o.side || 1, cy = y + h * (o.cy || 0.55), sep = w * 0.2, ew = Math.min(w * 0.1, h * 0.36);
  ctx.fillStyle = hgrad(x, x + w, side > 0 ? [[0, mix(o.shade, "#000000", 0.4)], [0.45, o.shade], [1, o.skin]] : [[0, o.skin], [0.55, o.shade], [1, mix(o.shade, "#000000", 0.4)]]); ctx.fillRect(x, y, w, h);
  // The bridge of the nose, and the hollows of the eyes.
  ctx.fillStyle = hgrad(x + w / 2 - ew, x + w / 2 + ew, [[0, "rgba(0,0,0,0.25)"], [side > 0 ? 0.65 : 0.35, "rgba(255,220,190,0.08)"], [1, "rgba(0,0,0,0.25)"]]); ctx.fillRect(x + w / 2 - ew, cy - ew * 0.4, ew * 2, h);
  for (const e of [-1, 1]) {
    const ex = x + w / 2 + e * sep, lit = e === side ? 1 : 0.45, open = o.open === undefined ? 0.8 : o.open, eh = ew * 0.42 * open, tilt = (o.browTilt || 0) * -e;
    glowOval(ex, cy, ew * 1.5, ew * 0.8, "#000000", 0);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(ex, cy - ew * 0.15, ew * 1.35, ew * 0.7, 0, 0, TAU); ctx.fill();
    // The brow, heavy and drawn down.
    fillPath(o.brow, () => { ctx.moveTo(ex - ew * 1.25, cy - ew * 0.7 + tilt * ew * 0.3); ctx.quadraticCurveTo(ex, cy - ew * 1.12, ex + ew * 1.25, cy - ew * 0.72 - tilt * ew * 0.3); ctx.quadraticCurveTo(ex, cy - ew * 0.86, ex - ew * 1.25, cy - ew * 0.5 + tilt * ew * 0.3); });
    // The eye.
    const almond = () => { ctx.beginPath(); ctx.moveTo(ex - ew, cy); ctx.quadraticCurveTo(ex, cy - eh * 2.2, ex + ew, cy - eh * 0.2); ctx.quadraticCurveTo(ex, cy + eh * 1.3, ex - ew, cy); ctx.closePath(); };
    almond(); ctx.fillStyle = mix("#d8d0c8", o.shade, 1 - lit * 0.7); ctx.fill();
    ctx.save(); almond(); ctx.clip();
    const ix = ex + (o.look || 0) * ew * 0.3, iy = cy - eh * 0.3, ir = ew * 0.42;
    const ig = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir); ig.addColorStop(0, mix(o.iris, "#ffffff", 0.25)); ig.addColorStop(0.7, o.iris); ig.addColorStop(1, "#050404");
    circle(ix, iy, ir, ig); circle(ix, iy, ir * 0.42, "#020202");
    circle(ix + side * ir * 0.3, iy - ir * 0.3, ir * 0.16 * lit + 0.6, "rgba(255,255,255,0.85)");
    rect(ex - ew, cy - eh * 2.4, ew * 2, eh * 1.1, "rgba(0,0,0,0.35)");
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(ex - ew * 1.02, cy); ctx.quadraticCurveTo(ex, cy - eh * 2.2, ex + ew * 1.02, cy - eh * 0.2); ctx.strokeStyle = "#0a0605"; ctx.lineWidth = Math.max(2, ew * 0.08); ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - ew * 0.85, cy - ew * 0.32); ctx.quadraticCurveTo(ex, cy - eh * 2.2 - ew * 0.3, ex + ew * 0.95, cy - ew * 0.3); ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.stroke();
    for (const k2 of [1, 2]) { ctx.beginPath(); ctx.moveTo(ex - ew * 0.75, cy + ew * 0.25 + k2 * ew * 0.12); ctx.quadraticCurveTo(ex, cy + ew * 0.42 + k2 * ew * 0.14, ex + ew * 0.8, cy + ew * 0.2 + k2 * ew * 0.1); ctx.strokeStyle = "rgba(0,0,0," + (0.3 - k2 * 0.08) + ")"; ctx.lineWidth = 1.6; ctx.stroke(); }
    if (o.wet) { ctx.save(); almond(); ctx.clip(); rect(ex - ew, cy + eh * 0.4, ew * 2, eh * 0.5, "rgba(200,240,255,0.25)"); ctx.restore(); }
    if (o.tear && e === side) { const ty = cy + ew * 0.5 + ((o.t || 0) * 14 % (h * 0.5)); fillPath("rgba(210,240,255,0.55)", () => { ctx.ellipse(ex + ew * 0.35, ty, 2.4, 4, 0, 0, TAU); }); ctx.strokeStyle = "rgba(210,240,255,0.25)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex + ew * 0.3, cy + ew * 0.35); ctx.lineTo(ex + ew * 0.35, ty); ctx.stroke(); }
  }
}
// His phone on the dashboard, lit, buzzing; the dash's cyan lights round it.
function phoneShot(t, A) {
  const w = A.w, h = A.h, k = h / 276, px = w * 0.46, py = h * 0.56, buzz = t < 1.2 ? Math.sin(t * 90) * 1.5 : 0;
  still("phone", A, () => {
    rect(0, 0, w, h, "#030408");
    // The dashboard in perspective: dark plastic, its edge catching a little light.
    fillPath(vgrad(h * 0.2, h, [[0, "#0c0e14"], [1, "#050609"]]), () => { ctx.moveTo(0, h * 0.34); ctx.quadraticCurveTo(w * 0.5, h * 0.22, w, h * 0.3); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); });
    ctx.strokeStyle = "rgba(120,160,200,0.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, h * 0.34); ctx.quadraticCurveTo(w * 0.5, h * 0.22, w, h * 0.3); ctx.stroke();
    // The vents and the panel at the right.
    rr(w * 0.72, h * 0.5, w * 0.2, h * 0.36, 10); ctx.fillStyle = "#08090d"; ctx.fill();
    for (let i = 0; i < 4; i++) rect(w * 0.74, h * 0.55 + i * 12 * k, w * 0.16, 3, "#111318");
  });
  // The dash's lights.
  for (const [x, y, wd] of [[w * 0.06, h * 0.42, 34], [w * 0.13, h * 0.39, 18], [w * 0.78, h * 0.82, 14], [w * 0.84, h * 0.82, 8], [w * 0.8, h * 0.88, 20]]) { rr(x, y, wd * k, 4 * k, 2); ctx.fillStyle = C.cyan; ctx.fill(); glow(x + wd * k / 2, y + 2, 22 * k, C.cyan, 0.5); }
  // The phone, its screen.
  ctx.save(); ctx.translate(px + buzz, py); ctx.rotate(-0.06); ctx.transform(1, 0, -0.18, 0.78, 0, 0);
  rr(-118 * k, -76 * k, 236 * k, 152 * k, 16 * k); ctx.fillStyle = "#0a0b10"; ctx.fill(); ctx.strokeStyle = "#2a3040"; ctx.lineWidth = 1.5; ctx.stroke();
  rr(-106 * k, -64 * k, 212 * k, 128 * k, 8 * k); ctx.fillStyle = vgrad(-64 * k, 64 * k, [[0, "#d8ecff"], [1, "#9cc8f0"]]); ctx.fill();
  text("UNKNOWN", 0, -40 * k, { align: "center", size: 9 * k, weight: 700, spacing: 2, color: "#4a6a88" });
  rr(-92 * k, -28 * k, 184 * k, 62 * k, 10 * k); ctx.fillStyle = "#ffffff"; ctx.fill();
  text("Friday. All of it.", -82 * k, -6 * k, { size: 13 * k, weight: 700, color: "#1a2430" });
  text("Or we come to the house.", -82 * k, 14 * k, { size: 13 * k, weight: 700, color: "#1a2430" });
  text("2:04 AM", 82 * k, 28 * k, { align: "right", size: 7 * k, weight: 600, color: "#6a7a8a" });
  ctx.restore();
  glow(px, py, 220 * k, "#bfe0ff", 0.28);
  finish(A, 0.75);
}
// His hands in his lap, holding the pistol, lit along its edges by the cold light of the dash.
function handsGunShot(t, A) {
  const w = A.w, h = A.h, k = h / 276, cx = w * 0.5, cy = h * 0.6, br = Math.sin(t * 1.2) * 1.2;
  still("hands-gun", A, () => {
    rect(0, 0, w, h, "#030407");
    // His knees and thighs, in dark jeans; his jacket at the edges.
    fillPath("#0a0e18", () => { ctx.moveTo(-10, h * 0.5); ctx.quadraticCurveTo(w * 0.3, h * 0.36, w * 0.5, h * 0.42); ctx.quadraticCurveTo(w * 0.7, h * 0.36, w + 10, h * 0.5); ctx.lineTo(w + 10, h); ctx.lineTo(-10, h); ctx.closePath(); });
    ctx.strokeStyle = "rgba(0,194,240,0.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, h * 0.5); ctx.quadraticCurveTo(w * 0.3, h * 0.36, w * 0.5, h * 0.42); ctx.quadraticCurveTo(w * 0.7, h * 0.36, w + 10, h * 0.5); ctx.stroke();
    fillPath("#07080c", () => { ctx.moveTo(-10, -10); ctx.lineTo(w * 0.18, -10); ctx.quadraticCurveTo(w * 0.24, h * 0.5, w * 0.12, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath(); });
    fillPath("#07080c", () => { ctx.moveTo(w + 10, -10); ctx.lineTo(w * 0.82, -10); ctx.quadraticCurveTo(w * 0.76, h * 0.5, w * 0.88, h + 10); ctx.lineTo(w + 10, h + 10); ctx.closePath(); });
  });
  ctx.save(); ctx.translate(cx, cy + br); ctx.scale(k, k); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const skin = "#4a3028", sh = "#1e1210", edge = "rgba(0,194,240,0.6)";
  // The left hand lying open under the barrel, the fingers along it.
  fillPath(sh, () => { ctx.ellipse(70, 22, 62, 22, -0.08, 0, TAU); });
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? sh : skin; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(40 + i * 4, 18 + i * 8); ctx.lineTo(110 + i * 6, 6 + i * 8); ctx.stroke(); }
  ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(40, 12); ctx.lineTo(112, 0); ctx.stroke();
  // The pistol, lying across it.
  fillPath("#05060a", () => { ctx.moveTo(-40, -30); ctx.lineTo(118, -30); ctx.quadraticCurveTo(124, -30, 124, -24); ctx.lineTo(124, -8); ctx.lineTo(28, -8); ctx.lineTo(22, 4); ctx.quadraticCurveTo(12, 10, 4, 4); ctx.lineTo(-2, -8); ctx.lineTo(-10, -8); ctx.lineTo(-22, 44); ctx.quadraticCurveTo(-26, 50, -34, 50); ctx.lineTo(-48, 48); ctx.quadraticCurveTo(-54, 46, -52, 40); ctx.lineTo(-40, -8); ctx.closePath(); });
  ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(118, -30); ctx.quadraticCurveTo(124, -30, 124, -24); ctx.stroke();
  for (let i = 0; i < 6; i++) line(-32 + i * 5, -26, -32 + i * 5, -14, "rgba(80,110,140,0.35)", 1);
  rect(-36, -21, 156, 1.5, "rgba(120,170,210,0.2)");
  // The right hand round the grip: the fingers wrapped, the thumb along the side.
  fillPath(sh, () => { ctx.moveTo(-74, -6); ctx.quadraticCurveTo(-70, -24, -44, -22); ctx.lineTo(-30, 20); ctx.quadraticCurveTo(-40, 48, -66, 40); ctx.quadraticCurveTo(-92, 30, -74, -6); });
  for (let i = 0; i < 4; i++) { const fy = 2 + i * 10; ctx.strokeStyle = i % 2 ? sh : skin; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-60, fy); ctx.quadraticCurveTo(-36, fy - 4, -24, fy + 4); ctx.stroke(); }
  ctx.strokeStyle = skin; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-62, -12); ctx.quadraticCurveTo(-40, -22, -14, -18); ctx.stroke();
  ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-62, -17); ctx.quadraticCurveTo(-40, -27, -14, -23); ctx.stroke();
  fillPath("#0a0c14", () => { ctx.moveTo(-160, -20); ctx.quadraticCurveTo(-100, -30, -74, -12); ctx.lineTo(-70, 36); ctx.quadraticCurveTo(-110, 50, -160, 44); ctx.closePath(); });
  ctx.restore();
  glowOval(w * 0.5, -10, w * 0.5, h * 0.4, C.cyan, 0.12);
  finish(A, 0.85);
}

// ---- 2. Someone Asked --------------------------------------------------------------------------------
// The desert at night: a violet sky thick with stars, the mesas, the little adobe monastery with its
// bell tower and one window lit.
function desertNight(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.74, k = h / 276 * 1.3, mx = w * 0.56;
  still("desert", A, () => {
    ctx.fillStyle = vgrad(0, gy, [[0, "#0a0820"], [0.45, "#1e1440"], [0.8, "#3a2050"], [1, "#4a2850"]]); ctx.fillRect(0, 0, w, gy);
    stars(77, 260, 0, 0, w, gy * 0.92, 0);
    // The mesas: flat-topped, their faces catching a little of the sky.
    const mesa = (pts, c, lit) => { poly(pts, c); ctx.globalAlpha = 0.5; for (let i = 2; i < pts.length - 4; i += 2) if (Math.abs(pts[i + 1] - pts[i + 3]) < 6) line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], lit, 1.5); ctx.globalAlpha = 1; };
    mesa([-10, gy, -10, gy - 64 * k, 30, gy - 70 * k, 50, gy - 96 * k, w * 0.28, gy - 100 * k, w * 0.31, gy - 74 * k, w * 0.4, gy - 70 * k, w * 0.43, gy], "#2a1620", "#8a4a40");
    mesa([w * 0.18, gy, w * 0.22, gy - 40 * k, w * 0.3, gy - 44 * k, w * 0.33, gy], "#22121c", "#6a3a34");
    mesa([w * 0.66, gy, w * 0.7, gy - 50 * k, w * 0.76, gy - 54 * k, w * 0.78, gy - 84 * k, w * 0.95, gy - 88 * k, w * 0.97, gy - 60 * k, w + 10, gy - 56 * k, w + 10, gy], "#26121c", "#7a4038");
    ctx.fillStyle = vgrad(gy, h, [[0, "#1c1018"], [1, "#0a060a"]]); ctx.fillRect(0, gy, w, h - gy);
    // The monastery: the long low range, the chapel, the bell tower.
    const adobe = "#4a2c22", adobeD = "#2e1a14", my = gy + 8 * k;
    rr(mx - 130 * k, my - 40 * k, 130 * k, 40 * k, 4); ctx.fillStyle = adobeD; ctx.fill();
    rr(mx - 20 * k, my - 62 * k, 110 * k, 62 * k, 5); ctx.fillStyle = adobe; ctx.fill();
    rr(mx - 20 * k, my - 62 * k, 110 * k, 62 * k, 5); lightFrom(mx - 20 * k, 0, mx + 90 * k, 0, "#7a4a6a", 0.25);
    rr(mx + 58 * k, my - 112 * k, 34 * k, 112 * k, 4); ctx.fillStyle = adobe; ctx.fill();
    fillPath(adobe, () => { ctx.moveTo(mx + 56 * k, my - 112 * k); ctx.lineTo(mx + 75 * k, my - 126 * k); ctx.lineTo(mx + 94 * k, my - 112 * k); ctx.closePath(); });
    rect(mx + 74 * k, my - 140 * k, 2, 16 * k, "#3a2418"); rect(mx + 69 * k, my - 134 * k, 12 * k, 2, "#3a2418");
    rect(mx + 66 * k, my - 102 * k, 18 * k, 20 * k, "#120a0c");
    for (let i = 0; i < 7; i++) rect(mx - 124 * k + i * 17 * k, my - 34 * k, 4 * k, 3 * k, "#1a0e0a");
    for (const vx of [mx - 110 * k, mx - 80 * k, mx - 50 * k]) rect(vx, my - 26 * k, 8 * k, 11 * k, "#0c0608");
    const r = seeded(19);
    for (let i = 0; i < 10; i++) { const x = r() * w, y = gy + 10 + r() * (h - gy - 12), s2 = 0.6 + r(); for (let j = -3; j <= 3; j++) line(x, y, x + j * 3 * s2, y - (14 - Math.abs(j) * 2) * s2, "#0a0608", 1.4); }
  });
  // The bell, if it rings; the lit window and door of the chapel, flickering.
  const my = gy + 8 * k;
  ctx.save(); ctx.translate(mx + 75 * k, my - 99 * k); ctx.rotate(o.bell ? Math.sin(t * 2.4) * 0.5 : 0); fillPath("#8a7040", () => { ctx.moveTo(-4 * k, 0); ctx.lineTo(4 * k, 0); ctx.lineTo(6 * k, 11 * k); ctx.lineTo(-6 * k, 11 * k); ctx.closePath(); }); ctx.restore();
  const cw = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.1);
  rr(mx + 26 * k, my - 34 * k, 14 * k, 34 * k, 6 * k); ctx.fillStyle = "#ffb04a"; ctx.fill();
  rect(mx + 4 * k, my - 46 * k, 8 * k, 12 * k, "#ffc060");
  glow(mx + 33 * k, my - 18 * k, 60 * k, "#ffa040", 0.6 * cw); glow(mx + 8 * k, my - 40 * k, 24 * k, "#ffa040", 0.6 * cw);
  glowOval(mx + 33 * k, my + 4 * k, 60 * k, 8 * k, "#ffa040", 0.35 * cw);
  if (o.light) glow(mx + 33 * k, my - 33 * k, 140 * o.light * k, C.holy, 0.6 * o.light);
  finish(A, 0.55);
}
// His cell: the adobe wall, the crucifix, a little window of stars, the narrow bed and the man
// asleep in it, his glasses folded on the stool. `light`: the gold that comes in from the left.
function cellShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, L = o.light || 0, k = h / 276, by = h * 0.74;
  still("cell" + (o.empty ? "-empty" : ""), A, () => {
    ctx.fillStyle = hgrad(0, w, [[0, "#3a2418"], [0.5, "#2e1c14"], [1, "#1c110c"]]); ctx.fillRect(0, 0, w, h);
    // The adobe: soft unevenness, a few cracks.
    const r = seeded(51);
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.06; circle(r() * w, r() * by, 10 + r() * 40, r() < 0.5 ? "#5a3a28" : "#1a0e08"); }
    ctx.globalAlpha = 1;
    rect(0, by + 10 * k, w, h, "#1a0f0a");
    // The window: deep in the wall, stars beyond.
    const wx = w * 0.7, wy = h * 0.08, ww = 54 * k, wh = 64 * k;
    rect(wx - 6, wy - 6, ww + 12, wh + 12, "#1a0f0a"); ctx.fillStyle = vgrad(wy, wy + wh, [[0, "#0a1030"], [1, "#1a1a40"]]); ctx.fillRect(wx, wy, ww, wh);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); stars(5, 30, wx, wy, ww, wh, 0); ctx.restore();
    // The crucifix.
    const kx = w * 0.46, ky = h * 0.08;
    rect(kx - 3 * k, ky, 6 * k, 74 * k, "#140b07"); rect(kx - 24 * k, ky + 16 * k, 48 * k, 6 * k, "#140b07");
    fillPath("#2a1a10", () => { ctx.moveTo(kx - 20 * k, ky + 18 * k); ctx.lineTo(kx, ky + 22 * k); ctx.lineTo(kx + 20 * k, ky + 18 * k); ctx.lineTo(kx + 3 * k, ky + 26 * k); ctx.lineTo(kx + 2 * k, ky + 52 * k); ctx.lineTo(kx - 2 * k, ky + 52 * k); ctx.lineTo(kx - 3 * k, ky + 26 * k); ctx.closePath(); });
    circle(kx, ky + 16 * k, 3 * k, "#2a1a10");
    // The bed: its frame, the pillow, the blanket over him.
    const bx0 = w * 0.3, bx1 = w * 0.96;
    rect(bx0, by - 4 * k, bx1 - bx0, 16 * k, "#2a1810"); rect(bx0, by + 12 * k, 8 * k, 40 * k, "#1c100a"); rect(bx1 - 8 * k, by + 12 * k, 8 * k, 40 * k, "#1c100a");
    rect(bx0 - 4 * k, by - 40 * k, 9 * k, 92 * k, "#24140c");
    rr(bx0 + 6 * k, by - 26 * k, 70 * k, 24 * k, 10 * k); ctx.fillStyle = "#cbbfae"; ctx.fill();
    rr(bx0 + 6 * k, by - 26 * k, 70 * k, 24 * k, 10 * k); lightFrom(bx0, 0, bx0 + 80 * k, 0, "#000000", 0.1);
    fillPath("#3a2c24", () => { ctx.moveTo(bx0 + 60 * k, by); ctx.quadraticCurveTo(bx0 + 70 * k, by - 44 * k, bx0 + 120 * k, by - 40 * k); ctx.quadraticCurveTo(w * 0.7, by - 38 * k, bx1 - 30 * k, by - 22 * k); ctx.quadraticCurveTo(bx1, by - 16 * k, bx1, by); ctx.closePath(); });
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx0 + (110 + i * 50) * k, by - 36 * k); ctx.quadraticCurveTo(bx0 + (130 + i * 50) * k, by - 18 * k, bx0 + (120 + i * 50) * k, by); ctx.stroke(); }
    if (!o.empty) {
      // Him, asleep: his head on the pillow, turned to us, the grey hair, the shoulder under the blanket.
      const hx = bx0 + 46 * k, hy = by - 34 * k;
      fillPath("#5a3a2c", () => { ctx.ellipse(hx, hy, 17 * k, 14 * k, -0.15, 0, TAU); });
      fillPath("#8a6250", () => { ctx.ellipse(hx - 2 * k, hy + 1 * k, 14 * k, 12 * k, -0.15, 0, TAU); });
      fillPath("#a8a4ac", () => { ctx.moveTo(hx - 14 * k, hy - 6 * k); ctx.quadraticCurveTo(hx - 8 * k, hy - 18 * k, hx + 8 * k, hy - 16 * k); ctx.quadraticCurveTo(hx + 20 * k, hy - 12 * k, hx + 18 * k, hy + 2 * k); ctx.quadraticCurveTo(hx + 10 * k, hy - 8 * k, hx - 4 * k, hy - 8 * k); ctx.closePath(); });
      ctx.strokeStyle = "#2a1410"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx - 9 * k, hy); ctx.quadraticCurveTo(hx - 6 * k, hy + 2 * k, hx - 3 * k, hy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx + 1 * k, hy - 1 * k); ctx.quadraticCurveTo(hx + 4 * k, hy + 1 * k, hx + 7 * k, hy - 1 * k); ctx.stroke();
      line(hx - 5 * k, hy + 7 * k, hx + 1 * k, hy + 7 * k, "#3a1a14", 1.2);
      fillPath("#141016", () => { ctx.moveTo(hx + 10 * k, hy + 8 * k); ctx.quadraticCurveTo(hx + 30 * k, hy - 4 * k, bx0 + 100 * k, by - 40 * k); ctx.lineTo(bx0 + 70 * k, by - 6 * k); ctx.closePath(); });
    }
    // The stool in front: the breviary and his glasses, folded.
    const sx = w * 0.16, sy = by + 6 * k;
    rect(sx - 30 * k, sy, 60 * k, 8 * k, "#3a2216"); rect(sx - 26 * k, sy + 8 * k, 6 * k, 60 * k, "#24140c"); rect(sx + 20 * k, sy + 8 * k, 6 * k, 60 * k, "#24140c");
    rect(sx - 4 * k, sy - 8 * k, 30 * k, 8 * k, "#1a1012"); rect(sx - 4 * k, sy - 8 * k, 30 * k, 2, "#c8b088");
    ctx.strokeStyle = "rgba(200,220,240,0.7)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx - 18 * k, sy - 4 * k, 5 * k, 3.4 * k, 0, 0, TAU); ctx.moveTo(sx - 4 * k, sy - 4 * k); ctx.ellipse(sx - 9 * k, sy - 4 * k, 5 * k, 3.4 * k, 0, 0, TAU); ctx.stroke();
    // The candle's warmth that is left, low on the wall.
    glowOval(w * 0.2, by - 20 * k, w * 0.3, 80 * k, "#a05a20", 0.12);
  });
  // The light, when it comes: a tall bright opening at the left, and its rays across the room.
  if (L > 0) {
    const lx = w * 0.07;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hgrad(0, w, [[0, hexA("#ffd27a", 0.7 * L)], [0.5, hexA("#c08030", 0.25 * L)], [1, hexA("#c08030", 0)]]); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { const a = 0.18 + i * 0.12 + Math.sin(t * 0.5 + i) * 0.01; ctx.globalAlpha = (0.1 + (i % 2) * 0.06) * L; fillPath("#fff0c0", () => { ctx.moveTo(lx, h * 0.02); ctx.lineTo(lx + 16 * k, h * 0.02); ctx.lineTo(lx + Math.cos(a) * w * 1.2, h * 0.02 + Math.sin(a) * w * 1.2); ctx.lineTo(lx + Math.cos(a + 0.05) * w * 1.2, h * 0.02 + Math.sin(a + 0.05) * w * 1.2); ctx.closePath(); }); }
    ctx.restore();
    rect(lx, h * 0.02, 20 * k, h * 0.66, hexA("#fffbe8", 0.95 * L)); glow(lx + 10 * k, h * 0.3, h * 0.7, "#fff6dc", 0.7 * L);
  }
  finish(A, 0.6);
}
// Fr. Lawrence, close, three-quarter on and turned to the light at the left: grey hair swept back,
// round wire glasses, a long, kind, tired face, the black habit. `look`: "squint", "open", "wide",
// "kind", "down"; `mouth`: "closed", "open", "smile"; `hand`: "shade", "protest". `L`: how much of
// the angel's gold is on him.
function lawrenceBust(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, L = o.L === undefined ? 1 : o.L, k = h / 276, key = "bust-" + (o.look || "open") + "-" + (o.mouth || "closed") + "-" + (o.hand || "") + "-" + L;
  still(key, A, () => {
    // The room behind him: warm dark, the light pouring in from the upper left.
    ctx.fillStyle = hgrad(0, w, [[0, mix("#2a1a12", "#c08a40", 0.5 * L)], [0.45, mix("#1e130e", "#6a4420", 0.3 * L)], [1, "#0e0806"]]); ctx.fillRect(0, 0, w, h);
    if (L > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 7; i++) { ctx.globalAlpha = 0.07 * L; const a = 0.25 + i * 0.09; fillPath("#ffe0a0", () => { ctx.moveTo(-20, -20); ctx.lineTo(Math.cos(a) * w * 1.3, Math.sin(a) * w * 1.3); ctx.lineTo(Math.cos(a + 0.035) * w * 1.3, Math.sin(a + 0.035) * w * 1.3); ctx.closePath(); }); } ctx.restore(); glow(0, 0, h * 1.1, "#ffe6b0", 0.5 * L); }
    lawrenceHead(w * 0.6, h * 0.53, 1.2 * k, o, L);
  });
  finish(A, 0.55);
}
function lawrenceHead(x, y, s, o, L) {
  const lc = o.lightC, skin = "#8a6250", lit = lc ? mix("#8a6250", lc, 0.32 * L) : mix("#c89070", "#ffd8a0", 0.4 * L), dark = "#3a2620", hair = "#9c98a2", hairD = "#4e4a56", rim = lc || mix("#ffe0a0", "#ffffff", 0.3);
  const look = o.look || "open", mouth = o.mouth || "closed";
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  // The habit: the shoulders, the hood fallen round his neck.
  fillPath("#0c0a0e", () => { ctx.moveTo(-170, 130); ctx.quadraticCurveTo(-150, 62, -60, 56); ctx.lineTo(40, 52); ctx.quadraticCurveTo(150, 60, 190, 130); ctx.closePath(); });
  fillPath("#16131a", () => { ctx.moveTo(-40, 50); ctx.quadraticCurveTo(10, 36, 80, 50); ctx.quadraticCurveTo(90, 76, 40, 82); ctx.quadraticCurveTo(-10, 84, -40, 70); ctx.closePath(); });
  ctx.strokeStyle = hexA(rim, 0.35 * L); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-170, 130); ctx.quadraticCurveTo(-150, 62, -60, 56); ctx.stroke();
  // The neck.
  fillPath(dark, () => { ctx.moveTo(-18, 30); ctx.lineTo(24, 26); ctx.lineTo(28, 60); ctx.lineTo(-22, 62); ctx.closePath(); });
  // The head: the face's profile at the left, the back of the skull at the right.
  const face = () => { ctx.beginPath(); ctx.moveTo(-26, -62); ctx.quadraticCurveTo(-40, -50, -40, -34); ctx.quadraticCurveTo(-41, -26, -44, -22); ctx.lineTo(-41, -14); ctx.quadraticCurveTo(-48, 0, -56, 10); ctx.quadraticCurveTo(-54, 16, -46, 18); ctx.quadraticCurveTo(-47, 24, -45, 27); ctx.quadraticCurveTo(-47, 31, -44, 34); ctx.quadraticCurveTo(-40, 38, -40, 42); ctx.quadraticCurveTo(-42, 52, -34, 58); ctx.quadraticCurveTo(-20, 64, 2, 54); ctx.quadraticCurveTo(18, 46, 26, 30); ctx.lineTo(40, -10); ctx.quadraticCurveTo(46, -44, 22, -62); ctx.quadraticCurveTo(-4, -72, -26, -62); ctx.closePath(); };
  face(); ctx.fillStyle = skin; ctx.fill();
  ctx.save(); face(); ctx.clip();
  ctx.fillStyle = hgrad(-56, 40, [[0, lit], [0.35, mix(lit, skin, 0.5)], [0.65, skin], [1, dark]]); ctx.fillRect(-60, -80, 110, 150);
  // The planes of the face: the hollow of the cheek, the shadow under the brow, the side of the nose.
  ctx.globalAlpha = 0.2; fillPath(dark, () => { ctx.moveTo(-30, -18); ctx.quadraticCurveTo(-12, -24, 4, -16); ctx.quadraticCurveTo(-8, -10, -30, -12); ctx.closePath(); });
  fillPath(dark, () => { ctx.moveTo(-36, -10); ctx.quadraticCurveTo(-30, 6, -36, 18); ctx.quadraticCurveTo(-28, 14, -26, 0); ctx.closePath(); });
  fillPath(dark, () => { ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-2, 24, -10, 40); ctx.quadraticCurveTo(4, 30, 4, 10); ctx.closePath(); });
  ctx.globalAlpha = 1;
  // Lines of age: the forehead, the fold from the nose to the mouth, the crow's feet.
  ctx.strokeStyle = "rgba(40,20,14,0.4)"; ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-36 + i * 2, -48 + i * 7); ctx.quadraticCurveTo(-14, -52 + i * 7, 8, -46 + i * 7); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-36, 16); ctx.quadraticCurveTo(-30, 28, (mouth === "smile" ? -22 : -26), 38); ctx.stroke();
  const crow = look === "kind" || mouth === "smile" ? 3 : 2;
  for (let i = 0; i < crow; i++) { ctx.beginPath(); ctx.moveTo(4, -10 + i * 5); ctx.lineTo(14, -14 + i * 7); ctx.stroke(); }
  ctx.restore();
  // The ear.
  fillPath(dark, () => { ctx.ellipse(28, -2, 8, 15, 0.15, 0, TAU); }); fillPath(skin, () => { ctx.ellipse(27, -2, 5, 11, 0.15, 0, TAU); });
  // The hair: grey, thick, swept back from the brow in waves.
  const hairP = () => { ctx.beginPath(); ctx.moveTo(-32, -56); ctx.quadraticCurveTo(-40, -70, -30, -80); ctx.quadraticCurveTo(-22, -92, -6, -90); ctx.quadraticCurveTo(8, -96, 22, -88); ctx.quadraticCurveTo(40, -86, 46, -70); ctx.quadraticCurveTo(56, -56, 52, -36); ctx.quadraticCurveTo(54, -14, 44, 6); ctx.quadraticCurveTo(38, 0, 36, -10); ctx.quadraticCurveTo(30, -26, 22, -34); ctx.quadraticCurveTo(10, -44, 2, -48); ctx.quadraticCurveTo(-12, -50, -32, -56); ctx.closePath(); };
  hairP(); ctx.fillStyle = hairD; ctx.fill();
  ctx.save(); hairP(); ctx.clip();
  ctx.fillStyle = hgrad(-40, 56, [[0, mix(hair, "#fff4e0", 0.2 * L)], [0.35, hair], [0.8, mix(hair, hairD, 0.6)], [1, hairD]]); ctx.fillRect(-44, -100, 104, 110);
  const hr = seeded(8);
  for (let i = 0; i < 22; i++) { const y0 = -88 + hr() * 70, x0 = -34 + hr() * 20, bend = (hr() - 0.5) * 14; ctx.strokeStyle = hr() < 0.5 ? "rgba(60,56,66,0.35)" : "rgba(240,236,242,0.35)"; ctx.lineWidth = 0.8 + hr() * 1.2; ctx.beginPath(); ctx.moveTo(x0, y0 + 20); ctx.bezierCurveTo(-10, y0 - 4 + bend, 18, y0 + bend, 30 + hr() * 22, y0 + 18 + hr() * 20); ctx.stroke(); }
  ctx.globalAlpha = 0.35; fillPath(hairD, () => { ctx.moveTo(14, -48); ctx.quadraticCurveTo(36, -60, 50, -40); ctx.quadraticCurveTo(48, -16, 42, 0); ctx.quadraticCurveTo(34, -24, 14, -48); }); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = hexA(rim, 0.85 * L + 0.1); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32, -56); ctx.quadraticCurveTo(-40, -70, -30, -80); ctx.quadraticCurveTo(-22, -92, -6, -90); ctx.quadraticCurveTo(8, -96, 22, -88); ctx.stroke();
  // The brows: grey and bushy, raised or drawn down.
  const bu = look === "wide" ? -7 : look === "squint" || look === "narrow" ? 3 : look === "kind" ? -2 : 0;
  ctx.strokeStyle = "#8a8690"; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-26, -26 + bu); ctx.quadraticCurveTo(-12, -32 + bu, 6, -26 + bu * 0.6); ctx.stroke();
  ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-43, -25 + bu); ctx.lineTo(-34, -28 + bu); ctx.stroke();
  // The eyes.
  const eye = (ex, ey, ew, near) => {
    if (look === "squint" || look === "down") { ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey + (look === "down" ? 4 : 2), ex + ew, ey - 1); ctx.stroke(); return; }
    const eh = look === "wide" ? ew * 0.62 : look === "kind" ? ew * 0.34 : look === "narrow" ? ew * 0.3 : ew * 0.46;
    const al = () => { ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey - eh * 1.8, ex + ew, ey - 1); ctx.quadraticCurveTo(ex, ey + eh * 1.2, ex - ew, ey); ctx.closePath(); };
    al(); ctx.fillStyle = near ? "#d8ccc0" : "#b8a898"; ctx.fill();
    ctx.save(); al(); ctx.clip(); const ir = ew * (look === "wide" ? 0.38 : 0.48); circle(ex - ew * 0.25, ey - eh * 0.2, ir, "#3a2414"); circle(ex - ew * 0.25, ey - eh * 0.2, ir * 0.45, "#0a0604"); circle(ex - ew * 0.38, ey - eh * 0.5, ir * 0.25, "#ffffff"); ctx.restore();
    ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey - eh * 1.8, ex + ew, ey - 1); ctx.stroke();
  };
  eye(-38, -12, 4, false); eye(-14, -12, 9, true);
  // The glasses: round wire rims, the far one narrow, the lenses catching the light.
  ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-14, -12, 14, 13, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-40, -12, 6, 12, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-34, -14); ctx.quadraticCurveTo(-30, -18, -28, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(26, -10); ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18 + 0.2 * L; fillPath("#fff0d0", () => { ctx.ellipse(-20, -18, 6, 3, -0.6, 0, TAU); }); fillPath("#fff0d0", () => { ctx.ellipse(-41, -17, 2, 3, 0, 0, TAU); }); ctx.restore();
  // The mouth.
  if (mouth === "open") {
    fillPath("#1e0a08", () => { ctx.ellipse(-36, 32, 8, 9, 0.1, 0, TAU); });
    fillPath("#e8dcd0", () => { ctx.ellipse(-36, 25.5, 6, 2, 0.1, 0, TAU); });
    ctx.strokeStyle = "#4a2018"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-36, 32, 8, 9, 0.1, 0, TAU); ctx.stroke();
  } else if (mouth === "smile") {
    ctx.strokeStyle = "#4a2018"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-45, 28); ctx.quadraticCurveTo(-34, 36, -20, 28); ctx.stroke();
    ctx.globalAlpha = 0.25; fillPath("#ffb090", () => { ctx.ellipse(-24, 16, 9, 6, 0, 0, TAU); }); ctx.globalAlpha = 1;
  } else { ctx.strokeStyle = "#4a2018"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-45, 29); ctx.quadraticCurveTo(-34, 31, -24, 30); ctx.stroke(); }
  // The light along his profile.
  ctx.strokeStyle = hexA(rim, 0.75 * L + 0.1); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-40, -34); ctx.quadraticCurveTo(-41, -26, -44, -22); ctx.lineTo(-41, -14); ctx.quadraticCurveTo(-48, 0, -56, 10); ctx.quadraticCurveTo(-54, 16, -46, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-40, 42); ctx.quadraticCurveTo(-42, 52, -34, 58); ctx.stroke();
  // His hand: up against the light, or raised in protest.
  if (o.hand === "shade") {
    fillPath("#0c0a0e", () => { ctx.moveTo(-150, 140); ctx.quadraticCurveTo(-118, 60, -96, -14); ctx.lineTo(-70, -6); ctx.quadraticCurveTo(-86, 70, -110, 140); ctx.closePath(); });
    ctx.strokeStyle = hexA(rim, 0.5 * L); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-150, 140); ctx.quadraticCurveTo(-118, 60, -96, -14); ctx.stroke();
    hand(-70, -40, 1.05, 1.05, lit, dark, rim, L, "back");
  } else if (o.hand === "protest") {
    fillPath("#0c0a0e", () => { ctx.moveTo(-150, 140); ctx.quadraticCurveTo(-120, 70, -108, 40); ctx.lineTo(-76, 44); ctx.quadraticCurveTo(-84, 90, -100, 140); ctx.closePath(); });
    hand(-92, 20, -0.12, 1.15, lit, dark, rim, L, "palm");
  }
  ctx.restore();
}
// A hand: `palm` to us with the fingers up, or the `back` of it with the fingers along `a`.
function hand(x, y, a, s, lit, dark, rim, L, side) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.lineCap = "round";
  const c = side === "palm" ? lit : mix(lit, dark, 0.3);
  fillPath(c, () => { ctx.moveTo(-16, 26); ctx.quadraticCurveTo(-20, 0, -16, -14); ctx.lineTo(16, -16); ctx.quadraticCurveTo(20, 4, 14, 26); ctx.closePath(); });
  const fs = [[-12, -14, -15, -46], [-4, -16, -5, -54], [4, -16, 5, -52], [12, -14, 14, -40]];
  fs.forEach(([x0, y0, x1, y1], i) => { ctx.strokeStyle = i % 2 ? mix(c, dark, 0.15) : c; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); line(lerp(x0, x1, 0.5) - 3, lerp(y0, y1, 0.5), lerp(x0, x1, 0.5) + 3, lerp(y0, y1, 0.5) - 1, "rgba(60,30,20,0.35)", 1); });
  ctx.strokeStyle = mix(c, dark, 0.2); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-14, 16); ctx.quadraticCurveTo(-30, 2, -32, -14); ctx.stroke();
  if (side === "palm") { ctx.strokeStyle = "rgba(90,50,40,0.35)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.quadraticCurveTo(0, 10, 12, 0); ctx.stroke(); }
  ctx.strokeStyle = hexA(rim, 0.7 * L + 0.1); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-32, -14); ctx.quadraticCurveTo(-30, 2, -16, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-17, -50); ctx.lineTo(-18, -20); ctx.stroke();
  ctx.restore();
}
// An angel, standing, seen from the front: the long robe edged in gold, the great wings raised and
// falling to the ground, the face only light. `cool`: the father's guardian, all in blues.
function frontAngel(x, y, s, o) {
  o = o || {};
  const cool = !!o.cool, robe = cool ? "#a8c4ec" : "#e8e8ec", robeD = cool ? "#5a7ab4" : "#a8a6b4", edge = cool ? "#bfeaff" : "#e8c46a", wing = cool ? "#bcd4f4" : "#f2eee2", wingD = cool ? "#6a88c0" : "#b8ae94", glowC = cool ? "#bfe4ff" : "#fff2c8";
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  glow(0, -120, 170, glowC, 0.35);
  // The wings: raised over the shoulders and sweeping down to the ground, the long feathers along
  // their lower edge, rows of small ones near the top.
  for (const d of [-1, 1]) {
    const shape = () => { ctx.beginPath(); ctx.moveTo(d * 18, -158); ctx.bezierCurveTo(d * 34, -236, d * 70, -252, d * 100, -244); ctx.bezierCurveTo(d * 148, -232, d * 152, -190, d * 142, -150); ctx.bezierCurveTo(d * 134, -96, d * 124, -40, d * 108, -6); ctx.bezierCurveTo(d * 84, -24, d * 56, -50, d * 40, -84); ctx.bezierCurveTo(d * 30, -110, d * 22, -134, d * 18, -158); ctx.closePath(); };
    // The long feathers, under the wing's edge.
    const edgePts = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14, bz = (p0, p1, p2, p3) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; }; edgePts.push([bz(d * 142, d * 134, d * 124, d * 108), bz(-150, -96, -40, -6)]); }
    for (let i = 0; i <= 8; i++) { const u = i / 8, bz = (p0, p1, p2, p3) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; }; edgePts.push([bz(d * 108, d * 84, d * 56, d * 40), bz(-6, -24, -50, -84)]); }
    edgePts.forEach(([ex, ey], i) => {
      const n = edgePts.length, u = i / (n - 1), dirx = d * (0.55 - u * 0.5), diry = 1 - u * 0.3, len = 30 + Math.sin(u * PI) * 26, m = Math.hypot(dirx, diry);
      const tx = ex + dirx / m * len, ty = ey + diry / m * len - 18, nx = -diry / m * 5, ny = dirx / m * 5;
      ctx.fillStyle = mix(wing, wingD, 0.15 + u * 0.35);
      ctx.beginPath(); ctx.moveTo(ex - nx - dirx * 14, ey - ny - 20); ctx.quadraticCurveTo(ex - nx * 1.4, ey - ny, tx, ty); ctx.quadraticCurveTo(ex + nx * 1.4, ey + ny, ex + nx - dirx * 14, ey + ny - 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hexA(wingD, 0.45); ctx.lineWidth = 0.8; ctx.stroke();
      line(ex - dirx * 10, ey - 16, tx, ty, hexA(wingD, 0.35), 0.7);
    });
    shape(); ctx.fillStyle = vgrad(-250, -10, [[0, wing], [0.55, mix(wing, wingD, 0.2)], [1, mix(wing, wingD, 0.45)]]); ctx.fill();
    // Rows of small feathers, scalloped.
    ctx.save(); shape(); ctx.clip();
    for (let row = 0; row < 4; row++) {
      ctx.strokeStyle = hexA(wingD, 0.5 - row * 0.08); ctx.lineWidth = 1;
      for (let j = 0; j < 9; j++) { const u = j / 8, cx2 = d * (34 + u * 100 - row * 8), cy2 = -214 + row * 26 + Math.pow(u - 0.45, 2) * 90 + row * u * 10; ctx.beginPath(); ctx.arc(cx2, cy2, 9 + row * 2, 0.15 * PI, 0.85 * PI); ctx.stroke(); }
    }
    ctx.fillStyle = hgrad(d * 20, d * 150, [[0, hexA(wingD, 0.35)], [0.4, hexA(wingD, 0)], [1, hexA(wingD, 0.15)]]); ctx.fillRect(Math.min(d * 20, d * 150), -260, 130, 260);
    ctx.restore();
    ctx.strokeStyle = hexA(edge, 0.8); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(d * 18, -158); ctx.bezierCurveTo(d * 34, -236, d * 70, -252, d * 100, -244); ctx.bezierCurveTo(d * 148, -232, d * 152, -190, d * 142, -150); ctx.stroke();
  }
  // The robe, falling straight, with its folds and gold edges, the sash.
  const robeP = () => { ctx.beginPath(); ctx.moveTo(-22, -168); ctx.quadraticCurveTo(-34, -150, -34, -120); ctx.lineTo(-42, 0); ctx.lineTo(42, 0); ctx.lineTo(34, -120); ctx.quadraticCurveTo(34, -150, 22, -168); ctx.closePath(); };
  robeP(); ctx.fillStyle = robe; ctx.fill();
  ctx.save(); robeP(); ctx.clip();
  ctx.fillStyle = hgrad(-42, 42, [[0, hexA(robeD, 0.7)], [0.3, hexA(robeD, 0)], [0.7, hexA(robeD, 0)], [1, hexA(robeD, 0.7)]]); ctx.fillRect(-50, -180, 100, 190);
  for (const fx of [-22, -8, 6, 20]) { ctx.strokeStyle = hexA(robeD, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx * 0.6, -100); ctx.quadraticCurveTo(fx, -50, fx * 1.1, 0); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = edge; ctx.lineWidth = 2; robeP(); ctx.stroke();
  line(-38, -2, 38, -2, edge, 3); rect(-30, -112, 60, 5, edge); line(0, -112, -4, -60, edge, 2); line(4, -112, 8, -70, edge, 2);
  // The arms in their wide sleeves, the hands at his sides (or one held out).
  for (const d of [-1, 1]) {
    const out = o.reach && d === -1;
    fillPath(mix(robe, robeD, 0.15), () => { ctx.moveTo(d * 26, -160); ctx.quadraticCurveTo(d * (out ? 70 : 44), out ? -150 : -120, d * (out ? 92 : 40), out ? -136 : -82); ctx.lineTo(d * (out ? 82 : 26), out ? -122 : -82); ctx.quadraticCurveTo(d * 30, -130, d * 18, -150); ctx.closePath(); });
    ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d * (out ? 92 : 40), out ? -136 : -82); ctx.lineTo(d * (out ? 82 : 26), out ? -122 : -82); ctx.stroke();
    fillPath(mix(glowC, robe, 0.3), () => { ctx.ellipse(d * (out ? 98 : 34), out ? -132 : -74, 5, 8, out ? -0.9 : 0, 0, TAU); });
  }
  // The head: only light.
  fillPath(mix(robe, glowC, 0.5), () => { ctx.ellipse(0, -186, 15, 19, 0, 0, TAU); });
  glow(0, -186, 46, "#ffffff", 0.95); glow(0, -186, 90, glowC, 0.6);
  ctx.restore();
}
// The angel, full length, standing in its own light.
function angelShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, k = h / 276, cool = !!o.cool;
  still("angel" + (cool ? "-cool" : "") + (o.close ? "-close" : ""), A, () => {
    ctx.fillStyle = vgrad(0, h, cool ? [[0, "#06101e"], [1, "#0c1a30"]] : [[0, "#1a1008"], [1, "#2a1a0c"]]); ctx.fillRect(0, 0, w, h);
    glow(w / 2, h * 0.45, h * 1.2, cool ? "#3a6aa8" : "#c8903a", 0.5);
    if (o.close) frontAngel(w / 2, h * 1.55, 1.55 * k, { cool });
    else frontAngel(w / 2, h * 0.98, 0.96 * k, { cool });
  });
  // Motes of light drifting up.
  const r = seeded(31);
  for (let i = 0; i < 26; i++) { const x = (r() * w + Math.sin(t * 0.3 + i) * 10), y = (r() * h - t * (6 + r() * 10) + h * 4) % h; glow(x, y, 2 + r() * 4, "#ffffff", 0.3); }
  if (cool) rain(t, 60, 0, 0, w, h, { seed: 44, color: "rgba(190,220,255,0.15)" });
  finish(A, 0.55);
}
// The chapel: the altar and the gold tabernacle, the red sanctuary lamp, Fr. Lawrence on his
// knees. `spirit`: the rest of him rising out of his kneeling body, toward the angel who calls it.
function chapelShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.88, k = h / 276, ax = w * 0.6, kx = w * 0.3, sp = o.spirit !== undefined;
  still("chapel" + (sp ? "-angel" : ""), A, () => {
    ctx.fillStyle = hgrad(0, w, [[0, "#140c08"], [0.6, "#24160e"], [1, "#100a06"]]); ctx.fillRect(0, 0, w, h);
    for (let x = w * 0.08; x < w; x += w * 0.22) { rect(x, 0, 16 * k, gy, "rgba(0,0,0,0.25)"); rect(x + 16 * k, 0, 2, gy, "rgba(255,200,140,0.04)"); }
    rect(0, gy, w, h - gy, "#120a06"); rect(0, gy, w, 1.5, "#3a2418");
    // The altar, its cloth, the tabernacle.
    rr(ax - 70 * k, gy - 66 * k, 140 * k, 66 * k, 3); ctx.fillStyle = "#3a2216"; ctx.fill();
    for (let i = 0; i < 4; i++) rect(ax - 60 * k + i * 32 * k, gy - 56 * k, 24 * k, 46 * k, "rgba(0,0,0,0.2)");
    rect(ax - 74 * k, gy - 70 * k, 148 * k, 6 * k, "#d8ccb8");
    rr(ax - 22 * k, gy - 116 * k, 44 * k, 46 * k, 3); ctx.fillStyle = "#8a6a2a"; ctx.fill();
    rr(ax - 18 * k, gy - 112 * k, 36 * k, 38 * k, 2); ctx.fillStyle = "#b8923a"; ctx.fill();
    line(ax, gy - 110 * k, ax, gy - 76 * k, "#6a4a1a", 1.5); fillPath("#d8b04a", () => { ctx.moveTo(ax - 24 * k, gy - 116 * k); ctx.lineTo(ax, gy - 130 * k); ctx.lineTo(ax + 24 * k, gy - 116 * k); ctx.closePath(); });
    rect(ax - 1.5, gy - 142 * k, 3, 12 * k, "#d8b04a"); rect(ax - 5 * k, gy - 138 * k, 10 * k, 2.5, "#d8b04a");
    // The sanctuary lamp, in its red glass, on the altar's corner.
    rect(ax + 50 * k, gy - 92 * k, 14 * k, 22 * k, "#7a0e10");
  });
  // Light: the tabernacle's gold, the red lamp, the candle flicker on the walls.
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 4.3);
  glow(ax, gy - 94 * k, 70 * k, C.holy, 0.4);
  glow(ax + 57 * k, gy - 84 * k, 40 * k, C.red, 0.8 * fl); circle(ax + 57 * k, gy - 90 * k, 2.5 * k, "#ffd27a");
  glowOval(ax, gy - 40 * k, 220 * k, 110 * k, "#ffa040", 0.14 * fl);
  // Fr. Lawrence, kneeling, facing the altar.
  const kp = o.kneel || pose({ lean: 0.05, head: o.head === undefined ? -0.1 : o.head, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6, sF: 0.6, eF: 1.9, sB: 0.5, eB: 1.9 });
  glowOval(kx + 10, gy - 4, 80 * k, 10 * k, "#ffa040", 0.18 * fl);
  drawFigure("monk", kx, gy, 1.9 * k, 1, kp, { t, rim: "#ffa040", rimX: 2, noGlasses: true });
  if (sp) {
    // The angel, at the right, holding out a hand to him.
    frontAngel(w * 0.84, gy + 4 * k, 0.86 * k, { reach: true });
    // The rest of him, rising out of the kneeling body, lifting its arms to the angel.
    const u = smooth(o.spirit);
    if (u > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      drawFigure("monk", kx + 10 * k + 40 * k * u, gy - 70 * k * u, 1.9 * k, 1, pose({ lean: 0.02 - 0.25 * u, head: -0.4 * u, hF: 0.02 + 0.1 * u, kF: 1.55 * (1 - u), hB: -0.02, kB: 1.6 * (1 - u), sF: 0.6 + 2.0 * u, eF: 1.9 * (1 - u) + 0.1, sB: 0.5 + 1.8 * u, eB: 1.9 * (1 - u) + 0.1 }), { t, alpha: 0.32 * u, pal: { robe: "#c8a050", robe2: "#a07830", scap: "#e8c070", skin: "#fff0c0", skinSh: "#e8c080", hair: "#fff0c0" }, noGlasses: true });
      ctx.restore();
      glow(kx + 40 * k * u, gy - 120 * k * u - 40 * k, 120 * k, C.holy, 0.45 * u);
    }
  }
  finish(A, 0.6);
}
// A rooftop in the rain, the city lights far below: Fr. Lawrence in his coat and hat at the
// parapet, the angel beside him. `title`: the name of the game over them. `x`: where they stand.
function rooftopShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, k = h / 276, gy = h * 0.86, px = w * (o.x || 0.4);
  still("rooftop", A, () => {
    ctx.fillStyle = vgrad(0, gy, [[0, "#03050e"], [0.6, "#0c1430"], [1, "#1a2448"]]); ctx.fillRect(0, 0, w, h);
    // The city below, out of focus: a carpet of lights.
    ctx.fillStyle = vgrad(gy - 60 * k, gy, [[0, "rgba(40,30,70,0)"], [1, "rgba(60,40,90,0.6)"]]); ctx.fillRect(0, gy - 60 * k, w, 60 * k);
    bokeh(71, 140, 0, gy - 50 * k, w, 50 * k, ["#ffb060", "#ffd090", "#6aa8ff", "#ff6aa0", "#ffffff"], 0.8, 3, 0.7);
    bokeh(72, 30, 0, gy - 36 * k, w, 36 * k, ["#ffb060", "#ff6aa0", "#6aa8ff"], 3, 7, 0.4);
    // The parapet.
    ctx.fillStyle = vgrad(gy, h, [[0, "#141826"], [1, "#05060a"]]); ctx.fillRect(0, gy, w, h - gy);
    rect(0, gy, w, 2, "#2a3048");
  });
  // The angel beside him, in its own light; and him, at the parapet, looking out.
  if (o.angel !== false) { const near = o.x !== undefined; frontAngel(px + (near ? 120 : 190) * k, gy + 2, (near ? 0.6 : 0.64) * k, {}); }
  priestStand(px, gy + 2, 1.15 * k);
  rain(t, 150, 0, 0, w, h, { seed: 21, color: "rgba(196,220,255,0.22)" });
  if (o.title) {
    const a = smooth((t - 1.4) / 1.6);
    if (a > 0) {
      text("FEAR NOT", w / 2, h * 0.17, { align: "center", font: FONT.title, size: 44, weight: 700, spacing: 10, color: "#ffffff", glow: "rgba(232,196,106,0.75)", blur: 26, alpha: a });
      text("A desert monk, his guardian angel, and a city of shadows", w / 2, h * 0.17 + 26, { align: "center", font: FONT.line, italic: true, size: 16, weight: 500, color: C.holy, alpha: a * 0.9 });
    }
  }
  finish(A, 0.55);
}
// Fr. Lawrence in the city, standing side on and facing right: the long dark coat, the white
// collar, the fedora, the face just lit. (x, y): his feet.
function priestStand(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const coat = "#121118", coatL = "#24222e", rim = "#9fd8f0";
  rect(-8, -14, 6, 14, "#08070a"); rect(4, -14, 6, 14, "#08070a");
  fillPath("#06060a", () => { ctx.ellipse(-4, 0, 9, 2.5, 0, 0, TAU); ctx.ellipse(10, 0, 9, 2.5, 0, 0, TAU); });
  fillPath(coat, () => { ctx.moveTo(-16, -152); ctx.quadraticCurveTo(-26, -140, -26, -110); ctx.lineTo(-30, -14); ctx.lineTo(24, -14); ctx.lineTo(22, -110); ctx.quadraticCurveTo(22, -142, 12, -152); ctx.closePath(); });
  fillPath(coatL, () => { ctx.moveTo(8, -150); ctx.lineTo(18, -120); ctx.lineTo(8, -90); ctx.lineTo(2, -148); ctx.closePath(); });
  ctx.strokeStyle = hexA(rim, 0.45); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(12, -152); ctx.quadraticCurveTo(22, -142, 22, -110); ctx.lineTo(24, -14); ctx.stroke();
  // The arm hanging, the hand.
  fillPath("#0e0d14", () => { ctx.moveTo(-6, -146); ctx.quadraticCurveTo(10, -120, 6, -78); ctx.lineTo(-6, -78); ctx.quadraticCurveTo(-4, -120, -14, -140); ctx.closePath(); });
  circle(1, -74, 5, "#5a3c30");
  // The collar, the neck, the head in profile, the hat.
  rect(-4, -160, 12, 10, "#6a4a3c"); rect(2, -156, 8, 4, "#f2f4ff");
  fillPath("#6a4a3c", () => { ctx.moveTo(-10, -186); ctx.quadraticCurveTo(-12, -166, -2, -158); ctx.lineTo(10, -158); ctx.quadraticCurveTo(14, -164, 14, -170); ctx.lineTo(17, -174); ctx.lineTo(13, -178); ctx.quadraticCurveTo(14, -188, 4, -190); ctx.closePath(); });
  ctx.strokeStyle = hexA("#ffd8a0", 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(14, -170); ctx.lineTo(17, -174); ctx.lineTo(13, -178); ctx.stroke();
  fillPath("#a8a4ac", () => { ctx.moveTo(-12, -184); ctx.quadraticCurveTo(-14, -176, -8, -170); ctx.lineTo(-6, -184); ctx.closePath(); });
  fillPath("#0c0b10", () => { ctx.ellipse(1, -188, 20, 4, -0.04, 0, TAU); });
  fillPath("#0c0b10", () => { ctx.moveTo(-11, -188); ctx.lineTo(-9, -202); ctx.quadraticCurveTo(0, -207, 9, -202); ctx.lineTo(11, -188); ctx.closePath(); });
  rect(-10, -192, 21, 3, "#2a2632");
  ctx.strokeStyle = hexA(rim, 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(1, -188, 20, 4, -0.04, PI * 1.05, TAU); ctx.stroke();
  ctx.restore();
}

// ---- 4. The street, before the fight -----------------------------------------------------------------
// The brim of his fedora, close, rain running off it, the neon beyond; his face in its shadow.
function brimShot(t, A) {
  const w = A.w, h = A.h, k = h / 276;
  still("brim", A, () => {
    rect(0, 0, w, h, "#05040c");
    // Beyond: the street's neon, out of focus.
    ctx.fillStyle = hgrad(0, w, [[0, "#06121c"], [0.5, "#0c0816"], [1, "#2a0a2a"]]); ctx.fillRect(0, 0, w, h);
    bokeh(61, 26, w * 0.6, 0, w * 0.4, h, ["#ff4fa8", "#ff7ac0", "#c040e0"], 4, 14, 0.7);
    for (const [x, y, ww, hh, c] of [[w * 0.83, h * 0.15, 18 * k, h * 0.6, "#ff4fa8"], [w * 0.9, h * 0.08, 24 * k, h * 0.35, "#ff7ac0"]]) { glow(x + ww / 2, y + hh / 2, hh * 0.7, c, 0.35); ctx.globalAlpha = 0.35; rr(x, y, ww, hh, ww / 2); ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1; }
    bokeh(62, 8, 0, 0, w * 0.12, h, [C.cyan, "#6ad8ff"], 4, 12, 0.6);
    // His head and shoulders below, in shadow: the ear, the jaw, the collar of the coat turned up.
    const hx = w * 0.36, by = h * 0.42;
    fillPath("#07060b", () => { ctx.moveTo(hx - 200 * k, h + 10); ctx.quadraticCurveTo(hx - 170 * k, h * 0.78, hx - 90 * k, h * 0.7); ctx.lineTo(hx + 110 * k, h * 0.68); ctx.quadraticCurveTo(hx + 190 * k, h * 0.76, hx + 230 * k, h + 10); ctx.closePath(); });
    fillPath("#140c10", () => { ctx.moveTo(hx - 70 * k, by); ctx.quadraticCurveTo(hx - 80 * k, h * 0.74, hx - 10 * k, h * 0.82); ctx.quadraticCurveTo(hx + 70 * k, h * 0.84, hx + 96 * k, h * 0.7); ctx.lineTo(hx + 104 * k, by + 4 * k); ctx.closePath(); });
    ctx.strokeStyle = hexA("#ff7ac0", 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 104 * k, by + 6 * k); ctx.lineTo(hx + 96 * k, h * 0.7); ctx.quadraticCurveTo(hx + 70 * k, h * 0.84, hx + 20 * k, h * 0.83); ctx.stroke();
    fillPath("#0c080c", () => { ctx.ellipse(hx - 46 * k, by + 40 * k, 10 * k, 18 * k, 0, 0, TAU); });
    // The hat: a pinched crown with its dent, the band, and the wide brim curling at the edge.
    const crown = () => { ctx.beginPath(); ctx.moveTo(hx - 92 * k, by - 4 * k); ctx.quadraticCurveTo(hx - 100 * k, by - 90 * k, hx - 70 * k, by - 118 * k); ctx.quadraticCurveTo(hx - 30 * k, by - 100 * k, hx + 4 * k, by - 116 * k); ctx.quadraticCurveTo(hx + 50 * k, by - 128 * k, hx + 80 * k, by - 104 * k); ctx.quadraticCurveTo(hx + 104 * k, by - 60 * k, hx + 98 * k, by - 4 * k); ctx.closePath(); };
    crown(); ctx.fillStyle = "#0b0a12"; ctx.fill();
    ctx.save(); crown(); ctx.clip(); ctx.fillStyle = hgrad(hx - 100 * k, hx + 104 * k, [[0, "rgba(0,194,240,0.18)"], [0.3, "rgba(0,0,0,0)"], [0.75, "rgba(0,0,0,0)"], [1, "rgba(255,90,170,0.3)"]]); ctx.fillRect(hx - 110 * k, by - 140 * k, 230 * k, 150 * k); ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - 60 * k, by - 110 * k); ctx.quadraticCurveTo(hx - 20 * k, by - 80 * k, hx + 20 * k, by - 108 * k); ctx.stroke();
    rect(hx - 94 * k, by - 30 * k, 194 * k, 24 * k, "#16131c"); rect(hx - 94 * k, by - 30 * k, 194 * k, 2, "rgba(255,255,255,0.08)");
    fillPath("#0d0b14", () => { ctx.moveTo(-30, by + 10 * k); ctx.quadraticCurveTo(hx - 120 * k, by - 18 * k, hx, by - 10 * k); ctx.quadraticCurveTo(hx + 170 * k, by - 4 * k, hx + 260 * k, by + 26 * k); ctx.quadraticCurveTo(hx + 300 * k, by + 40 * k, hx + 290 * k, by + 46 * k); ctx.quadraticCurveTo(hx + 170 * k, by + 18 * k, hx, by + 16 * k); ctx.quadraticCurveTo(hx - 130 * k, by + 14 * k, -30, by + 40 * k); ctx.closePath(); });
    ctx.strokeStyle = hexA("#ff7ac0", 0.85); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx, by - 10 * k); ctx.quadraticCurveTo(hx + 170 * k, by - 4 * k, hx + 260 * k, by + 26 * k); ctx.quadraticCurveTo(hx + 300 * k, by + 40 * k, hx + 290 * k, by + 46 * k); ctx.stroke();
    ctx.strokeStyle = hexA("#ff7ac0", 0.5); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 80 * k, by - 104 * k); ctx.quadraticCurveTo(hx + 104 * k, by - 60 * k, hx + 98 * k, by - 30 * k); ctx.stroke();
    ctx.strokeStyle = hexA(C.cyan, 0.65); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, by + 10 * k); ctx.quadraticCurveTo(hx - 120 * k, by - 18 * k, hx - 20 * k, by - 10 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 92 * k, by - 6 * k); ctx.quadraticCurveTo(hx - 100 * k, by - 90 * k, hx - 70 * k, by - 118 * k); ctx.stroke();
  });
  // Drops gathering on the edge of the brim and falling.
  const r = seeded(6), hx = w * 0.36, bb = h * 0.42;
  for (let i = 0; i < 10; i++) {
    const u = r(), x = lerp(hx - 60 * k, hx + 286 * k, u), by = bb + 16 * k + Math.pow(u, 2) * 30 * k;
    const per = 1.2 + r() * 1.8, f = ((t + r() * 3) % per) / per, y = by + Math.pow(f, 2.2) * h * 0.9;
    circle(x, y, 2.2 * k, "rgba(220,240,255,0.8)"); glow(x, y, 7, "#ff9ad0", 0.3);
    if (f < 0.15) circle(x, by + 2, 2 * k * (f / 0.15), "rgba(220,240,255,0.7)");
  }
  rain(t, 90, 0, 0, w, h, { seed: 9, color: "rgba(220,200,255,0.2)" });
  finish(A, 0.6);
}
// In the dark, their eyes: pairs of embers at every depth, watching.
function demonShot(t, A, o) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#020103");
  const r = seeded(12);
  for (let i = 0; i < 16; i++) {
    const x = w * (0.05 + r() * 0.9), y = h * (0.12 + r() * 0.76), s = 0.5 + r() * 0.9, ph = r() * 10;
    const blink = Math.sin(t * 0.7 + ph * 3) > 0.985 ? 0.1 : 1, fl = (0.8 + 0.2 * Math.sin(t * 3 + ph)) * blink;
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(x + d * 9 * s, y); ctx.rotate(d * -0.2);
      glow(0, 0, 16 * s, "#ff2a10", 0.55 * fl);
      ctx.globalAlpha = fl; fillPath("#ff6a3a", () => { ctx.ellipse(0, 0, 5 * s, 2 * s * blink + 0.3, 0, 0, TAU); }); ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  void o;
  finish(A, 0.8);
}
// The Leone close-up: Fr. Lawrence's eyes behind his round glasses, rain, the cyan of the street.
function lawrenceEyesShot(t, A) {
  const w = A.w, h = A.h, k = h / 276;
  still("lawrence-eyes", A, () => {
    ctx.fillStyle = hgrad(0, w, [[0, "#0a2030"], [0.5, "#081018"], [1, "#04060a"]]); ctx.fillRect(0, 0, w, h);
    lawrenceHead(w * 0.6, h * 0.46 + 12 * 4.4 * k, 4.4 * k, { look: "narrow", lightC: "#7fe0ff" }, 0.8);
  });
  rain(t, 70, 0, 0, w, h, { seed: 5, color: "rgba(196,240,255,0.25)", len: 22, speed: 700 });
  finish(A, 0.65);
}
// Danny's eyes, close: wet, a tear, the cyan of the dashboard on him; his hair over his brow.
function dannyEyesShot(t, A) {
  const w = A.w, h = A.h;
  still("danny-eyes", A, () => {
    eyesFace(0, 0, w, h, { skin: "#6a4a3c", shade: "#140c0c", iris: "#4a5a6a", brow: "#0a0606", open: 0.62, browTilt: 0.7, side: 1, wet: true, cy: 0.56 });
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hgrad(w * 0.55, w, [[0, "rgba(0,194,240,0)"], [1, "rgba(0,194,240,0.4)"]]); ctx.fillRect(w * 0.55, 0, w * 0.45, h); ctx.restore();
    // His hair, falling over his brow.
    const r = seeded(17);
    fillPath("#050304", () => { ctx.moveTo(-10, -10); ctx.lineTo(w + 10, -10); ctx.lineTo(w + 10, h * 0.1); for (let i = 12; i >= 0; i--) { const x = w * i / 12; ctx.lineTo(x + 10, h * (0.14 + r() * 0.1)); ctx.lineTo(x, h * (0.06 + r() * 0.05)); } ctx.closePath(); });
    for (let i = 0; i < 18; i++) { const x = r() * w; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 10, h * 0.1, x + 4 + r() * 16, h * (0.16 + r() * 0.08)); ctx.stroke(); }
  });
  // The tear, running.
  const ex = w / 2 + w * 0.2, ty = h * 0.7 + ((t * 10) % (h * 0.3));
  ctx.strokeStyle = "rgba(200,240,255,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 10, h * 0.66); ctx.lineTo(ex + 12, ty); ctx.stroke();
  fillPath("rgba(220,245,255,0.8)", () => { ctx.ellipse(ex + 12, ty, 3, 4.5, 0, 0, TAU); }); glow(ex + 12, ty, 9, C.cyan, 0.4);
  finish(A, 0.7);
}

// ---- 4b. The guardian ---------------------------------------------------------------------------------
// The street again, the car; the father's guardian standing free beside it, the broken chains
// fading on the wet ground. `all`: Fr. Lawrence and his angel there too.
function guardianStandShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, k = h / 276, gy = h * 0.78;
  carStreetShot(t, A, {});
  // The guardian's light on the street.
  glowOval(w * 0.56, gy, 160 * k, 30 * k, "#9fd8ff", 0.35);
  frontAngel(w * 0.56, gy + 6 * k, 0.72 * k, { cool: true });
  // The broken chains, fading.
  const a = 0.9 * (1 - smooth(t / 8)), r = seeded(9);
  ctx.globalAlpha = a; ctx.strokeStyle = "#5a6a8a"; ctx.lineWidth = 2.6;
  for (let i = 0; i < 14; i++) { const x = w * 0.42 + i * 11 * k + r() * 4, y = gy + 14 * k + Math.sin(i * 0.9) * 5 * k; ctx.beginPath(); ctx.ellipse(x, y, 6 * k, 3.2 * k, i * 0.7, 0, TAU); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const x = w * 0.66 + i * 10 * k, y = gy + 20 * k + Math.cos(i) * 4 * k; ctx.beginPath(); ctx.ellipse(x, y, 6 * k, 3.2 * k, i * 0.9, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (o.all) { frontAngel(w * 0.9, gy + 6 * k, 0.58 * k, {}); priestStand(w * 0.74, gy + 8 * k, 0.8 * k); }
}

// ---- 5. The choice -------------------------------------------------------------------------------------
// The child's drawing taped to the dashboard: a sun, a house, a tall figure and a small one hand in hand.
function drawingShot(t, A) {
  const w = A.w, h = A.h, k = h / 276;
  still("drawing", A, () => {
    rect(0, 0, w, h, "#04050a");
    fillPath(vgrad(0, h, [[0, "#0c0e16"], [1, "#05060a"]]), () => { ctx.moveTo(0, h * 0.1); ctx.quadraticCurveTo(w / 2, 0, w, h * 0.1); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); });
    ctx.save(); ctx.translate(w * 0.5, h * 0.5); ctx.rotate(-0.04); ctx.scale(k, k);
    // The paper, a little creased, lit by the dash.
    rect(-150, -110, 300, 220, "#e8dcc0");
    ctx.fillStyle = hgrad(-150, 150, [[0, "rgba(0,0,0,0.12)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.18)"]]); ctx.fillRect(-150, -110, 300, 220);
    line(-150, 10, 150, 6, "rgba(0,0,0,0.08)", 2);
    // Crayon: strokes laid side by side.
    const crayon = (pts, c, wd) => { ctx.strokeStyle = c; ctx.lineWidth = wd || 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    for (let x = -140; x < 140; x += 6) crayon([[x, 78], [x + 3, 64 + Math.sin(x) * 4], [x + 6, 80]], "#3a9a3a", 2.5);
    for (let y = 2; y < 72; y += 5) crayon([[18, y], [100, y + 1]], "#3a6ac8", 2.2);
    crayon([[18, 2], [100, 2], [100, 72], [18, 72], [18, 2]], "#1a3a8a", 2.5);
    for (let i = 0; i < 9; i++) crayon([[10 + i * 3, 4 - i * 4], [110 - i * 3, 4 - i * 4]], "#d83a3a", 3);
    crayon([[6, 6], [59, -40], [114, 6]], "#a02020", 3);
    crayon([[50, 72], [50, 40], [68, 40], [68, 72]], "#6a3a1a", 3);
    rect(80, 18, 12, 12, "#f2e6a0"); crayon([[80, 18], [92, 18], [92, 30], [80, 30], [80, 18]], "#1a3a8a", 2);
    for (let a = 0; a < 12; a++) { const an = a * PI / 6; crayon([[-104 + Math.cos(an) * 24, -62 + Math.sin(an) * 24], [-104 + Math.cos(an) * 38, -62 + Math.sin(an) * 38]], "#f2b020", 3); }
    for (let rad = 4; rad < 20; rad += 4) { ctx.strokeStyle = "#f2c030"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(-104, -62, rad, 0, TAU); ctx.stroke(); }
    const fig = (x, y, s, c) => { crayon([[x, y - 30 * s], [x, y + 4 * s]], c); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 38 * s, 8 * s, 0, TAU); ctx.stroke(); crayon([[x - 8 * s, y + 24 * s], [x, y + 4 * s], [x + 8 * s, y + 24 * s]], c); fillPath(c, () => { ctx.moveTo(x - 9 * s, y - 24 * s); ctx.lineTo(x + 9 * s, y - 24 * s); ctx.lineTo(x + 13 * s, y + 6 * s); ctx.lineTo(x - 13 * s, y + 6 * s); ctx.closePath(); }); circle(x - 3 * s, y - 39 * s, 1.2, "#202020"); circle(x + 3 * s, y - 39 * s, 1.2, "#202020"); ctx.strokeStyle = "#202020"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y - 37 * s, 4 * s, 0.2, PI - 0.2); ctx.stroke(); };
    fig(-70, 46, 1.05, "#2a5ac8"); fig(-30, 52, 0.75, "#3a7ad8");
    crayon([[-58, 22], [-40, 26]], "#2a5ac8", 3);
    text("DADDY", -50, -88, { align: "center", size: 15, weight: 800, color: "#d8306a", spacing: 1, font: "'Comic Sans MS', 'Chalkboard SE', " + FONT.ui });
    // The tape at the corners.
    for (const [tx, ty, a] of [[-140, -104, -0.6], [140, -104, 0.6], [-140, 104, 0.6], [140, 104, -0.6]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(a); rect(-18, -7, 36, 14, "rgba(240,240,225,0.55)"); ctx.restore(); }
    ctx.restore();
  });
  glowOval(w * 0.5, h * 1.05, w * 0.5, h * 0.4, C.cyan, 0.18);
  finish(A, 0.8);
}
// The car pulling away down the long street, its tail lights red; behind it the streetlights come
// back on, one after another, toward us.
function lightsOnShot(t, A) {
  const w = A.w, h = A.h, k = h / 276, vx = w * 0.5, vy = h * 0.42, gy = h;
  still("lights-on", A, () => {
    ctx.fillStyle = vgrad(0, vy, [[0, "#03050c"], [1, "#101a34"]]); ctx.fillRect(0, 0, w, vy + 1);
    // The buildings on either side, running away to the far end of the street.
    for (const d of [-1, 1]) {
      fillPath("#070a14", () => { ctx.moveTo(vx + d * 20, vy); ctx.lineTo(vx + d * 20, vy - 60 * k); ctx.lineTo(vx + d * w * 0.6, -10); ctx.lineTo(vx + d * w * 0.6, h); ctx.closePath(); });
      for (let i = 0; i < 12; i++) { const u = i / 12, x = vx + d * (24 + Math.pow(u, 1.6) * w * 0.5), yt = vy - 50 * k - Math.pow(u, 1.6) * h * 0.8, hh = 4 + u * 26; rect(Math.min(x, x + d * hh * 0.6), yt + u * 30, hh * 0.6, hh, "rgba(255,200,140,0.06)"); }
    }
    // The street, wet, to the vanishing point.
    fillPath(vgrad(vy, h, [[0, "#0c1020"], [1, "#04050a"]]), () => { ctx.moveTo(vx - 20, vy); ctx.lineTo(vx + 20, vy); ctx.lineTo(w + 40, h); ctx.lineTo(-40, h); ctx.closePath(); });
    for (let i = 1; i < 8; i++) { const u = i / 8, y = vy + Math.pow(u, 2) * (h - vy); rect(vx - 2 * u, y, 4 * u + 1, 6 * u, "rgba(220,200,120,0.2)"); }
    rect(w * 0.62, vy - 90 * k, 12 * k, 40 * k, hexA("#ff4fa8", 0.5)); rect(w * 0.3, vy - 70 * k, 10 * k, 30 * k, hexA("#3ad8ff", 0.35));
  });
  // The lamps, near ones last: each comes on a moment after the one beyond it.
  const lamps = 6;
  for (let i = 0; i < lamps; i++) {
    const u = (i + 1) / lamps, on = clamp((t - 0.6 - (lamps - 1 - i) * 0.5) * 3, 0, 1);
    for (const d of [-1, 1]) {
      const x = vx + d * (30 + Math.pow(u, 1.5) * w * 0.48), y = vy + Math.pow(u, 1.5) * (h - vy) * 0.2, top = y - (20 + u * 150) * k;
      line(x, y + (10 + u * 120) * k, x, top, "#05060a", 1 + u * 3);
      if (on > 0) { glow(x, top, (10 + u * 50) * k, "#ffb060", 0.8 * on); circle(x, top, (1 + u * 3) * k, "#fff0d0"); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = vgrad(vy, h, [[0, hexA("#ffb060", 0)], [1, hexA("#ffb060", 0.2 * on * u)]]); ctx.fillRect(x - 6 * u * k, y, 12 * u * k, h - y); ctx.restore(); }
    }
  }
  // The car, going away, smaller as it goes.
  const go = clamp(t / 6, 0, 1), cs = lerp(1.15, 0.55, smooth(go)) * k, cy = lerp(h * 0.92, vy + 50 * k, smooth(go));
  ctx.save(); ctx.translate(vx, cy); ctx.scale(cs, cs);
  fillPath("rgba(0,0,0,0.5)", () => { ctx.ellipse(0, 4, 90, 8, 0, 0, TAU); });
  fillPath("#0e1018", () => { ctx.moveTo(-84, 0); ctx.lineTo(-86, -34); ctx.quadraticCurveTo(-84, -42, -70, -44); ctx.lineTo(-54, -46); ctx.lineTo(-40, -72); ctx.lineTo(40, -72); ctx.lineTo(54, -46); ctx.lineTo(70, -44); ctx.quadraticCurveTo(84, -42, 86, -34); ctx.lineTo(84, 0); ctx.closePath(); });
  fillPath("#05060a", () => { ctx.moveTo(-36, -48); ctx.lineTo(-30, -66); ctx.lineTo(30, -66); ctx.lineTo(36, -48); ctx.closePath(); });
  rect(-80, -6, 22, 10, "#050508"); rect(58, -6, 22, 10, "#050508"); rect(-24, -24, 48, 12, "#14161c");
  for (const d of [-1, 1]) { rect(d * 60 - 14, -36, 28, 10, "#ff2030"); glow(d * 66, -31, 40, "#ff1020", 0.8); }
  ctx.restore();
  glowOval(vx, cy + 10 * cs, 60 * cs, 40 * cs + 10, "#ff2030", 0.25);
  rain(t, 110, 0, 0, w, h, { seed: 11, color: "rgba(196,220,255,0.2)" });
  finish(A, 0.55);
}
// The city, and its windows coming back on, block after block.
function skylineOnShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.86, k = h / 276;
  const r = seeded(91), towers = [];
  for (let x = -10; x < w; x += 26 + r() * 30) towers.push([x, gy - 10, 22 + r() * 30, 70 + r() * 120, "#0a1228", 0]);
  for (let x = -20; x < w; x += 34 + r() * 40) towers.push([x, gy, 34 + r() * 44, 50 + Math.pow(r(), 1.4) * 160, "#060a18", r() < 0.15 ? 22 : 0]);
  still("skyline-on", A, () => {
    ctx.fillStyle = vgrad(0, gy, [[0, "#03050e"], [0.7, "#0e1838"], [1, "#1a2448"]]); ctx.fillRect(0, 0, w, h);
    for (const [x, base, tw, th, c, sp] of towers) tower(x, base, tw, th, c, { lit: 0, spire: sp });
    ctx.fillStyle = vgrad(gy, h, [[0, "#080c18"], [1, "#03040a"]]); ctx.fillRect(0, gy, w, h - gy);
  });
  // The windows, warm, coming on from the left as the light spreads.
  const front = -80 + t * w * 0.28, rw = seeded(93);
  towers.forEach(([x, base, tw, th], i) => {
    const on = clamp((front - x) / 70, 0, 1), near = i >= towers.length / 2;
    if (on <= 0) return;
    for (let wy = base - th + 8; wy < base - 6; wy += 7) for (let wx = x + 3; wx < x + tw - 4; wx += 5) {
      const c = rw(); if (c > (near ? 0.42 : 0.3)) continue;
      ctx.globalAlpha = on * (0.45 + c); rect(wx, wy, 2.2, 3, c < 0.2 ? "#ffd090" : c < 0.3 ? "#ffe8c0" : "#bfe4ff");
    }
  });
  ctx.globalAlpha = 1;
  for (const [x, c] of [[w * 0.22, C.cyan], [w * 0.64, C.pink], [w * 0.8, "#ff3a6a"]]) { const on = clamp((front - x) / 60, 0, 1); if (on > 0) neonBlade(x, gy - 70 * k, 12 * k, 44 * k, c, on); }
  glowOval(w * 0.5, gy, w * 0.6, 50 * k, "#ffb060", 0.12 * clamp(front / w, 0, 1));
  rain(t, 80, 0, 0, w, h, { seed: 3, color: "rgba(196,220,255,0.18)" });
  finish(A, 0.5);
}
// Inside the apartment, dark: the front door swings open, the warm light of the hall falls in,
// and he stands in it, his coat wet.
function doorShot(t, A) {
  const w = A.w, h = A.h, k = h / 276, u = smooth((t - 0.5) / 1.6), dx = w * 0.52, dw = 96 * k, dt = h * 0.08, db = h * 0.94;
  still("door", A, () => {
    rect(0, 0, w, h, "#07060a");
    ctx.fillStyle = hgrad(0, w, [[0, "#0a080e"], [0.5, "#120e14"], [1, "#08070a"]]); ctx.fillRect(0, 0, w, h);
    rect(0, db, w, h - db, "#0c0a0c");
    // A picture on the wall, a lamp's shade, a coat hook: shapes in the dark.
    rect(w * 0.2, h * 0.24, 50 * k, 38 * k, "#0e0b10"); ctx.strokeStyle = "#1a1418"; ctx.lineWidth = 2; ctx.strokeRect(w * 0.2, h * 0.24, 50 * k, 38 * k);
    rect(w * 0.82, h * 0.5, 4 * k, db - h * 0.5, "#0e0b10"); fillPath("#0e0b10", () => { ctx.moveTo(w * 0.8, h * 0.5); ctx.lineTo(w * 0.84, h * 0.5); ctx.lineTo(w * 0.86, h * 0.58); ctx.lineTo(w * 0.78, h * 0.58); ctx.closePath(); });
    // The door frame.
    rect(dx - 8 * k, dt - 8 * k, dw + 16 * k, db - dt + 8 * k, "#1a1418");
  });
  // The hall beyond, warm; his figure in it.
  ctx.save(); ctx.beginPath(); ctx.rect(dx, dt, dw, db - dt); ctx.clip();
  ctx.fillStyle = vgrad(dt, db, [[0, "#ffd8a0"], [1, "#c88a50"]]); ctx.fillRect(dx, dt, dw, db - dt);
  glow(dx + dw / 2, dt + 30 * k, 90 * k, "#fff0d0", 0.7);
  if (u > 0.3) {
    ctx.globalAlpha = smooth((u - 0.3) / 0.5);
    const fx = dx + dw * 0.5, fy = db;
    fillPath("#140e0c", () => { ctx.moveTo(fx - 26 * k, fy); ctx.lineTo(fx - 24 * k, fy - 120 * k); ctx.quadraticCurveTo(fx - 22 * k, fy - 150 * k, fx - 8 * k, fy - 152 * k); ctx.lineTo(fx + 8 * k, fy - 152 * k); ctx.quadraticCurveTo(fx + 22 * k, fy - 150 * k, fx + 24 * k, fy - 120 * k); ctx.lineTo(fx + 26 * k, fy); ctx.closePath(); });
    circle(fx, fy - 166 * k, 12 * k, "#140e0c");
    fillPath("#140e0c", () => { ctx.moveTo(fx - 13 * k, fy - 168 * k); ctx.quadraticCurveTo(fx - 8 * k, fy - 182 * k, fx + 6 * k, fy - 180 * k); ctx.quadraticCurveTo(fx + 15 * k, fy - 176 * k, fx + 13 * k, fy - 164 * k); ctx.closePath(); });
    ctx.globalAlpha = 1;
  }
  // The door itself, swinging in.
  const open = u * dw * 0.92;
  fillPath("#1e161a", () => { ctx.moveTo(dx, dt); ctx.lineTo(dx + dw - open, dt + open * 0.12); ctx.lineTo(dx + dw - open, db + 4); ctx.lineTo(dx, db); ctx.closePath(); });
  circle(dx + dw - open - 8 * k, (dt + db) / 2, 2.5 * k, "#8a7050");
  ctx.restore();
  // The light falling into the room and across the floor.
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 * u;
  fillPath("#ffd8a0", () => { ctx.moveTo(dx + dw - open, db); ctx.lineTo(dx + dw, db); ctx.lineTo(dx + dw + 120 * k, h + 10); ctx.lineTo(dx - 60 * k - open * 0.4, h + 10); ctx.closePath(); });
  ctx.restore();
  glow(dx + dw / 2, h * 0.5, 160 * k * u + 1, "#ffd8a0", 0.25 * u);
  finish(A, 0.6);
}
// Her face in the light from the door: big eyes opening wide, wet, and a smile breaking.
function girlFaceShot(t, A) {
  const w = A.w, h = A.h, k = h / 276, u = smooth((t - 0.6) / 1.4), cx = w * 0.46, cy = h * 0.58, s = 1.3 * k;
  ctx.fillStyle = hgrad(0, w, [[0, "#0c0810"], [0.6, "#2a1a1c"], [1, "#6a4a30"]]); ctx.fillRect(0, 0, w, h);
  glow(w * 1.05, h * 0.4, h * 1.1, "#ffd8a0", 0.45);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const skin = "#d8a088", lit = "#ffd0b0", sh = "#7a4a40", hair = "#1e100c", rim = "#ffe0b0";
  // The ponytail and the back of her head; her pyjamas at the bottom.
  fillPath("#8a2a5a", () => { ctx.moveTo(-90, 120); ctx.quadraticCurveTo(-70, 70, -20, 66); ctx.quadraticCurveTo(40, 66, 70, 120); ctx.closePath(); });
  fillPath(hair, () => { ctx.moveTo(-58, -30); ctx.quadraticCurveTo(-96, -20, -94, 30); ctx.quadraticCurveTo(-92, 56, -78, 64); ctx.quadraticCurveTo(-80, 30, -60, 6); ctx.closePath(); });
  fillPath("#e0508a", () => { ctx.ellipse(-62, -24, 6, 9, 0.5, 0, TAU); });
  fillPath(hair, () => { ctx.arc(-6, -10, 64, 0, TAU); });
  // The face, three-quarter on, turned up toward the door's light at the right.
  const face = () => { ctx.beginPath(); ctx.moveTo(-36, -36); ctx.quadraticCurveTo(-46, 10, -30, 40); ctx.quadraticCurveTo(-10, 66, 14, 62); ctx.quadraticCurveTo(40, 56, 50, 30); ctx.quadraticCurveTo(58, 6, 54, -30); ctx.quadraticCurveTo(20, -50, -36, -36); ctx.closePath(); };
  face(); ctx.fillStyle = skin; ctx.fill();
  ctx.save(); face(); ctx.clip(); ctx.fillStyle = hgrad(-46, 58, [[0, sh], [0.45, skin], [1, lit]]); ctx.fillRect(-50, -60, 110, 130); ctx.restore();
  fillPath(skin, () => { ctx.rect(-14, 52, 30, 20); });
  // The bangs over her brow.
  fillPath(hair, () => { ctx.moveTo(-50, -10); ctx.quadraticCurveTo(-48, -64, 6, -66); ctx.quadraticCurveTo(52, -64, 60, -20); ctx.quadraticCurveTo(48, -30, 40, -26); ctx.quadraticCurveTo(34, -34, 22, -30); ctx.quadraticCurveTo(10, -36, 0, -28); ctx.quadraticCurveTo(-14, -34, -24, -26); ctx.quadraticCurveTo(-40, -24, -50, -10); ctx.closePath(); });
  ctx.strokeStyle = hexA(rim, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, -64); ctx.quadraticCurveTo(54, -58, 60, -20); ctx.stroke();
  // The eyes: big, dark, wet, opening wider.
  for (const [ex, ew, lt] of [[-14, 12, 0.6], [26, 14, 1]]) {
    const ey = -2, eh = ew * (0.55 + 0.25 * u);
    const al = () => { ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, TAU); };
    al(); ctx.fillStyle = mix("#f2ebe2", sh, 1 - lt * 0.8); ctx.fill();
    ctx.save(); al(); ctx.clip();
    circle(ex + 3, ey - 1, ew * 0.72, "#3a2014"); circle(ex + 3, ey - 1, ew * 0.38, "#0a0505");
    circle(ex + 7, ey - 6, ew * 0.24, "#ffffff"); circle(ex - 1, ey + 4, ew * 0.1, "#ffffff");
    rect(ex - ew, ey + eh * 0.4, ew * 2, eh, "rgba(200,230,255,0.18)");
    ctx.restore();
    ctx.strokeStyle = "#1a0c08"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, PI * 1.05, PI * 1.95); ctx.stroke();
    for (let i = 0; i < 3; i++) line(ex + ew * (0.3 + i * 0.25), ey - eh * (0.85 - i * 0.12), ex + ew * (0.45 + i * 0.28), ey - eh * (1.2 - i * 0.12), "#1a0c08", 1.4);
    line(ex - ew * 0.8, ey - eh - 10 - 3 * u, ex + ew * 0.8, ey - eh - 12 - 3 * u, "#2a1610", 2.6);
  }
  // A tear, the nose, and the smile breaking.
  if (u > 0.4) { const ty = 18 + ((t * 8) % 20); fillPath("rgba(230,245,255,0.75)", () => { ctx.ellipse(38, ty, 2, 3, 0, 0, TAU); }); }
  ctx.strokeStyle = "rgba(90,40,30,0.4)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(8, 18); ctx.quadraticCurveTo(14, 24, 10, 26); ctx.stroke();
  ctx.strokeStyle = "#6a2a24"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-6, 38 - 2 * u); ctx.quadraticCurveTo(10, 38 + 9 * u, 28, 36 - 3 * u); ctx.stroke();
  if (u > 0.5) { fillPath("rgba(255,255,255,0.5)", () => { ctx.moveTo(0, 39); ctx.quadraticCurveTo(10, 42 + 4 * u, 22, 38); ctx.closePath(); }); }
  glow(-26, 22, 12, "#ff7a9a", 0.18 + 0.15 * u); glow(42, 20, 12, "#ff7a9a", 0.18 + 0.15 * u);
  // The light of the door along her cheek.
  ctx.strokeStyle = hexA(rim, 0.8); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(54, -24); ctx.quadraticCurveTo(58, 6, 50, 30); ctx.quadraticCurveTo(42, 52, 24, 60); ctx.stroke();
  ctx.restore();
  finish(A, 0.55);
}
