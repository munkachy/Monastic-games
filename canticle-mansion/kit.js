"use strict";
// Canticle Mansion: the builder's kit for rooms. A map is laid out by
// coordinates (columns and rows of 16-pixel tiles), and scenery is painted
// with small helpers shared by every chapter.

// ---- Laying out a map -------------------------------------------------------------------
// G(50, 14).walls().floor(12).fill(9, 11, 11, 11).door(49, 9, 11, "1").rows()
function G(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill("."));
  const api = {
    w, h,
    fill(x0, y0, x1, y1, ch) { ch = ch || "#"; for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = ch; return api; },
    clear(x0, y0, x1, y1) { return api.fill(x0, y0, x1, y1, "."); },
    set(x, y, ch) { if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch; return api; },
    // Walls round the room: ceiling, both sides, and the floor's lowest rows.
    walls(top) { api.fill(0, 0, 0, h - 1); api.fill(w - 1, 0, w - 1, h - 1); if (top !== false) api.fill(0, 0, w - 1, 0); return api; },
    floor(y, x0, x1) { return api.fill(x0 === undefined ? 0 : x0, y, x1 === undefined ? w - 1 : x1, h - 1); },
    ledge(x0, x1, y, ch) { return api.fill(x0, y, x1, y, ch || "="); },
    // A doorway at the edge of the map: a column (or row) of door marks.
    door(x, y0, y1, key) { for (let y = y0; y <= y1; y++) g[y][x] = key; return api; },
    doorRow(y, x0, x1, key) { for (let x = x0; x <= x1; x++) g[y][x] = key; return api; },
    climb(x, y0, y1) { for (let y = y0; y <= y1; y++) g[y][x] = "H"; return api; },
    rows() { return g.map((r) => r.join("")); },
  };
  return api;
};
const at16 = (n) => n * T;

// ---- Scenery ----------------------------------------------------------------------------
const SCENE = {
  // A black tent of goat's hair: the tents of Cedar.
  tent(c, x, y, w, h, o) {
    o = o || {};
    const col = o.col || "#1e1a1e", hi = shade(col, 0.25), lo = shade(col, -0.4);
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w * 0.12, y + h * 0.25); c.quadraticCurveTo(x + w * 0.3, y + h * 0.05, x + w * 0.5, y); c.quadraticCurveTo(x + w * 0.7, y + h * 0.05, x + w * 0.88, y + h * 0.25); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    for (let i = 1; i < 6; i++) px(c, x + (w * i) / 6, y + h * 0.12, 1, h * 0.88, lo);
    px(c, x + w * 0.5 - 1, y - 6, 2, 8, "#6a4a2a");
    c.strokeStyle = "#8a7050"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * 0.12, y + h * 0.25); c.lineTo(x - 10, y + h); c.moveTo(x + w * 0.88, y + h * 0.25); c.lineTo(x + w + 10, y + h); c.stroke();
    if (o.door !== false) { px(c, x + w * 0.42, y + h * 0.5, w * 0.16, h * 0.5, "#0a080a"); px(c, x + w * 0.42, y + h * 0.5, 1, h * 0.5, hi); }
    for (let i = 0; i < w; i += 7) px(c, x + i, y + h - 2 - (i % 3), 4, 1, hi);
  },
  // Vines on a trellis, heavy with grapes.
  vines(c, x, y, w, t, o) {
    o = o || {};
    for (let i = 0; i < w; i += 32) { px(c, x + i, y, 3, 40, "#6a4a2a"); px(c, x + i, y, 1, 40, "#8a6a3a"); }
    px(c, x, y + 4, w, 1, "#a8946a"); px(c, x, y + 18, w, 1, "#a8946a");
    for (let i = 0; i < w; i += 6) {
      const k = hash(i, x, 4), sway = Math.sin(t * 1.5 + i * 0.3) * 0.8;
      px(c, x + i + sway, y + 2 + k * 6, 7, 5, k > 0.5 ? "#4a8a2e" : "#5aa040");
      px(c, x + i + 1 + sway, y + 14 + k * 4, 6, 5, k > 0.3 ? "#3a7a2e" : "#6ab04a");
      if (k > 0.55) { const g = o.grape || "#5a2a6a"; for (let j = 0; j < 3; j++) for (let q = 0; q <= j; q++) px(c, x + i + 1 + q * 2 - j + sway, y + 20 + (2 - j) * 2, 2, 2, j === 2 ? shade(g, 0.25) : g); }
    }
  },
  palm(c, x, y, h, t) {
    for (let i = 0; i < h; i += 4) { const bend = Math.sin(i / h * 1.4) * 6; px(c, x + bend, y - i, 5, 4, i % 8 ? "#7a5a34" : "#5a4024"); }
    const tx = x + Math.sin(1.4) * 6 + 2, ty = y - h;
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.55 + Math.sin(t + k) * 0.05; for (let s = 0; s < 22; s++) { const dx = Math.cos(a) * s * 1.3, dy = Math.sin(a) * s * 0.7 + s * s * 0.04; px(c, tx + dx, ty + dy, 3, 2, s % 3 ? "#3a8a3a" : "#5aa64a"); } }
    for (let k = 0; k < 4; k++) px(c, tx - 2 + k * 2, ty + 3, 3, 4, "#8a5a1a");
  },
  cypress(c, x, y, h) {
    c.fillStyle = "#1e4a2a"; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 9, y - h * 0.6, x, y - h); c.quadraticCurveTo(x - 9, y - h * 0.6, x, y); c.fill();
    c.fillStyle = "#2a6a3a"; c.beginPath(); c.moveTo(x - 1, y - 4); c.quadraticCurveTo(x - 6, y - h * 0.6, x - 1, y - h + 4); c.lineTo(x - 1, y - 4); c.fill();
  },
  // A cluster of cypress (henna) in flower: little white blossoms.
  henna(c, x, y, t) {
    c.fillStyle = "#3a6a2e"; c.beginPath(); c.arc(x, y, 14, 0, 7); c.arc(x + 12, y + 4, 10, 0, 7); c.arc(x - 12, y + 5, 10, 0, 7); c.fill();
    for (let i = 0; i < 18; i++) { const a = hash(i, x) * 6.28, r = hash(i, y) * 16; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2, 2, Math.sin(t * 2 + i) > 0.6 ? "#ffffff" : "#f4e0f0"); }
  },
  column(c, x, y, h, o) {
    o = o || {}; const col = o.col || "#d8d0c4", w = o.w || 20;
    px(c, x - 3, y, w + 6, 6, shade(col, -0.1)); px(c, x - 3, y, w + 6, 1, shade(col, 0.4));
    px(c, x, y + 6, w, h - 12, col);
    for (let i = 3; i < w; i += 5) px(c, x + i, y + 6, 1, h - 12, shade(col, -0.15));
    px(c, x, y + 6, 2, h - 12, shade(col, 0.3)); px(c, x + w - 2, y + 6, 2, h - 12, shade(col, -0.35));
    px(c, x - 3, y + h - 6, w + 6, 6, shade(col, -0.1));
  },
  candle(c, x, y, t) { px(c, x, y, 3, 8, "#f4ead4"); px(c, x, y, 1, 8, "#ffffff"); const f = Math.sin(t * 12 + x) > 0 ? 1 : 0; px(c, x, y - 4 - f, 3, 4, "#ffcf5a"); px(c, x + 1, y - 3, 1, 2, "#fff4c8"); },
  candelabrum(c, x, y, t) { px(c, x - 1, y, 3, 28, "#c8962a"); px(c, x - 10, y + 4, 21, 2, "#c8962a"); px(c, x - 6, y + 28, 13, 3, "#a8761a"); for (const dx of [-10, 0, 10]) SCENE.candle(c, x + dx - 1, y - 6 + (dx ? 4 : 0), t); },
  bottle(c, x, y, o) {
    o = o || {}; const col = o.col || "#2a5a2a", h = o.h || 16, w = o.w || 6;
    px(c, x + w / 2 - 1, y, 2, 4, shade(col, -0.2)); px(c, x + w / 2 - 1, y - 1, 2, 1, o.cork || "#c8a878");
    px(c, x, y + 4, w, h - 4, col); px(c, x + 1, y + 5, 1, h - 7, shade(col, 0.45));
    if (o.label) px(c, x, y + h * 0.5, w, h * 0.25, o.label);
  },
  perfume(c, x, y, o) {
    o = o || {}; const col = o.col || "#c86aa8", s = o.s || 1;
    c.fillStyle = shade(col, -0.2); c.beginPath(); c.ellipse(x, y, 7 * s, 9 * s, 0, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(x - 1, y - 1, 6 * s, 8 * s, 0, 0, 7); c.fill();
    px(c, x - 3 * s, y - 4 * s, 2 * s, 5 * s, shade(col, 0.5));
    px(c, x - 2 * s, y - 13 * s, 4 * s, 4 * s, "#e8b94a"); px(c, x - 3 * s, y - 16 * s, 6 * s, 3 * s, "#c8962a");
  },
  dove(c, x, y, t, o) {
    o = o || {}; const fl = Math.sin(t * (o.rate || 8) * Math.PI + (o.ph || 0) * 6.28), col = o.col || "#f4f4f8", s = o.s || 1, face = o.face || 1;
    c.save(); c.translate(x, y); c.scale(face * s, s);
    const dark = shade(col, -0.3);
    c.fillStyle = "#06040a"; c.beginPath(); c.ellipse(0, 0, 7.5, 4.5, -0.1, 0, 7); c.fill(); c.beginPath(); c.arc(6, -3, 3.4, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 6.5, 3.6, -0.1, 0, 7); c.fill(); c.beginPath(); c.arc(6, -3, 2.6, 0, 7); c.fill();
    c.fillStyle = dark; c.beginPath(); c.moveTo(-5, -1); c.lineTo(-11, -3); c.lineTo(-11, 2); c.closePath(); c.fill();
    c.fillStyle = "#e8a060"; c.beginPath(); c.moveTo(8.4, -3.4); c.lineTo(10.5, -2.6); c.lineTo(8.4, -1.9); c.fill();
    c.fillStyle = "#06040a"; c.fillRect(6.4, -4, 1, 1);
    if (o.wings !== false) { c.fillStyle = shade(col, 0.15); c.beginPath(); c.moveTo(-3, -1); c.quadraticCurveTo(0, -1 - 9 * fl, 4, -1); c.quadraticCurveTo(0, -2, -3, -1); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.6; c.stroke(); }
    c.restore();
  },
  flowers(c, x, y, n, t, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const fx = x + hash(i, x, 2) * (o.w || 40), fy = y - hash(i, y, 3) * (o.h || 6), col = (o.cols || ["#ff7aa8", "#ffffff", "#ffe08a", "#c8a0ff"])[i % (o.cols ? o.cols.length : 4)];
      px(c, fx, fy + 2, 1, 4, "#3a7a2e"); px(c, fx - 1, fy, 3, 3, col); px(c, fx, fy + 1, 1, 1, "#ffe08a");
    }
  },
  // Lilies of the valleys: tall white flowers.
  lily(c, x, y, t) { px(c, x, y - 12, 1, 12, "#3a7a2e"); px(c, x - 3, y - 6, 3, 1, "#5aa040"); px(c, x - 2, y - 16, 5, 4, "#ffffff"); px(c, x - 3, y - 14, 7, 2, "#ffffff"); px(c, x, y - 15, 1, 2, "#ffe08a"); },
  rays(c, x, y, len, t, col) {
    c.save(); c.globalAlpha = 0.18; c.fillStyle = col || "#fff4c8";
    for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + (i - 2.5) * 0.18 + Math.sin(t * 0.4 + i) * 0.03; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - 0.04) * len, y + Math.sin(a - 0.04) * len); c.lineTo(x + Math.cos(a + 0.04) * len, y + Math.sin(a + 0.04) * len); c.fill(); }
    c.restore();
  },
  waterfall(c, x, y, w, h, t) {
    px(c, x, y, w, h, "#4a8ad0");
    for (let i = 0; i < w; i += 2) for (let k = 0; k < h; k += 10) px(c, x + i, y + ((k + t * 90 + i * 7) % h), 1, 5, i % 4 ? "#a8d4ff" : "#ffffff");
    for (let i = 0; i < 10; i++) px(c, x - 4 + hash(i, 3) * (w + 8), y + h - 4 - Math.abs(Math.sin(t * 6 + i)) * 6, 2, 2, "#ffffff");
  },
  rug(c, x, y, w, h, o) { DECOR.rug(c, Object.assign({ x, y, w, h }, o || {})); },
};

// ---- The goats of the shepherds ----------------------------------------------------------------
// Little kids that follow the monk once the shepherd gives them, hop up a
// step and over a narrow gap, wait at a wall too high for them, and graze
// once they reach the tent.
function Kid(x, y, i) {
  return { kind: "kid", x, y, w: 12, h: 10, vx: 0, vy: 0, face: 1, i, ground: false, state: "follow", t: Math.random() * 3, col: ["#f0e8d8", "#8a6a4a", "#2a2228"][i % 3], update: stepKid, draw: (c, g, t) => goat(c, g.x - 1, g.y - 2, g.face, t + g.i, g.col, g.state === "eat" && Math.sin(t * 3 + g.i) > -0.3) };
}
function stepKid(g, dt) {
  g.t += dt;
  const m = Game.monk;
  g.vy = Math.min(g.vy + P.grav * dt, P.fall);
  if (g.state === "eat") { g.vx = approach(g.vx, 0, 400 * dt); moveBody(g, dt); return; }
  const target = m.x + m.w / 2 - m.face * (18 + g.i * 15), dx = target - (g.x + g.w / 2);
  const want = Math.abs(dx) > 8 ? Math.sign(dx) : 0;
  g.vx = approach(g.vx, want * 96, 700 * dt);
  if (want) g.face = want;
  if (g.ground && want) {
    // A step of up to two tiles: hop it. A gap: leap it. Higher: wait and bleat.
    const fx = want > 0 ? g.x + g.w + 3 : g.x - 3, feetRow = Math.floor((g.y + g.h - 1) / T), col = Math.floor(fx / T);
    const blockedAt = (row) => World.blocks(col, row, false) || World.bodies.some((b) => !b.carried && fx >= b.x && fx <= b.x + b.w && row * T + 8 >= b.y && row * T + 8 <= b.y + b.h);
    const wall = blockedAt(feetRow);
    let height = 0; if (wall) { height = 1; while (height < 4 && blockedAt(feetRow - height)) height++; }
    const below = World.blocks(col, feetRow + 1, true) || World.bodies.some((b) => !b.carried && fx >= b.x && fx <= b.x + b.w && Math.abs(b.y - (g.y + g.h)) < 4);
    if ((wall && height <= 2) || (!wall && !below && Math.abs(dx) > 20)) { g.vy = -272; g.ground = false; g.vx = want * 100; }
    else if (wall && height > 2 && Math.random() < dt * 0.8) Snd.sfx("bleat");
  }
  moveBody(g, dt);
  if (g.y > World.h * T + 30) { g.x = m.x - m.face * 20; g.y = m.y; g.vy = 0; }
}
function shepherd(x, y, o) {
  return Object.assign({ kind: "shepherd", x, y, w: 10, h: 26, face: 1, t: 0,
    draw: (c, n, t) => figure(c, n.x, n.y, { robe: "#8a6a4a", skin: "#d8a47a", beard: "#d8d4cc", headcloth: "#e8dcc0", staff: true, face: n.face, still: false }, t),
    update(n, dt) { n.t += dt; n.face = Game.monk.x < n.x ? -1 : 1; } }, o || {});
}
