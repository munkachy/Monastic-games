"use strict";
// Canticle Mansion: the pictures. Everything is painted here in code, pixel by
// pixel, in the manner of the sixteen-bit castle and cavern games: ramps of
// three or four shades to a colour, a dark outline round every figure, light
// from the upper left.

const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// A colour a little lighter or darker: shade("#806040", 0.2).
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((A >> s) & 255, (B >> s) & 255, t)).toString(16).padStart(2, "0");
  return "#" + ch(16) + ch(8) + ch(0);
}

// ---- Tiles ---------------------------------------------------------------------------------
// Each kind of ground: a base colour ramp and a way of laying its stones.
const TILESET = {
  marble:  { base: "#d8d0c4", lay: "blocks", bw: 16, bh: 8, mortar: "#a8a094", vein: "#b8b0a4" },
  stone:   { base: "#6a6070", lay: "blocks", bw: 16, bh: 8, mortar: "#3a3440" },
  brick:   { base: "#8a4a3a", lay: "blocks", bw: 8, bh: 4, mortar: "#4a2a22" },
  cellar:  { base: "#5a4a40", lay: "blocks", bw: 12, bh: 8, mortar: "#2a2018" },
  wood:    { base: "#7a5030", lay: "planks", mortar: "#3a2414" },
  cedar:   { base: "#9a5a32", lay: "planks", mortar: "#4a2a14" },
  sand:    { base: "#d8b070", lay: "ground", top: "#ecd090", grain: "#b88a50" },
  earth:   { base: "#6a4a2e", lay: "ground", top: "#5aa040", topDark: "#3a7a2e", grain: "#4a3220" },
  vine:    { base: "#6a4a2e", lay: "ground", top: "#7aa040", topDark: "#4a7a2e", grain: "#4a3220" },
  rock:    { base: "#5a4e48", lay: "rock", grain: "#3a3230" },
  cave:    { base: "#3e342e", lay: "rock", grain: "#241e1a" },
  gold:    { base: "#c8962a", lay: "blocks", bw: 16, bh: 16, mortar: "#7a5410" },
  red:     { base: "#8a2a2a", lay: "blocks", bw: 16, bh: 8, mortar: "#4a1414" },
  dark:    { base: "#2a2430", lay: "blocks", bw: 16, bh: 8, mortar: "#16121a" },
  tent:    { base: "#1e1a1e", lay: "cloth" },
  palm:    { base: "#7a5a34", lay: "planks", mortar: "#4a3420" },
  ivory:   { base: "#f0e6cc", lay: "blocks", bw: 16, bh: 8, mortar: "#c8b898" },
};
function tileStyleAt(R, tx, ty, kind) {
  for (const z of R.zones || []) if (tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1 && z[kind]) return z[kind];
  return (R.tiles && R.tiles[kind]) || { 1: "stone", 2: "wood", 6: "cellar" }[kind] || "stone";
}
function paintSolid(c, S, x, y, tx, ty, open) {
  const b = S.base, hi = shade(b, 0.18), lo = shade(b, -0.25), lo2 = shade(b, -0.45);
  if (S.lay === "blocks") {
    px(c, x, y, T, T, b);
    // Courses of blocks, every other course set over by half a block.
    for (let yy = 0; yy < T; yy += S.bh) {
      const row = Math.floor((ty * T + yy) / S.bh), off = row % 2 ? S.bw / 2 : 0, gx0 = tx * T;
      const start = gx0 - ((((gx0 - off) % S.bw) + S.bw) % S.bw);
      for (let g = start; g < gx0 + T; g += S.bw) {
        const l = Math.max(g, gx0) - gx0, r = Math.min(g + S.bw, gx0 + T) - gx0;
        const k = hash(Math.floor(g / S.bw), row, 3), col = k < 0.3 ? shade(b, -0.08) : k > 0.8 ? shade(b, 0.07) : b;
        px(c, x + l, y + yy, r - l, S.bh, col);
        px(c, x + l, y + yy, r - l, 1, hi);
        px(c, x + l, y + yy + S.bh - 1, r - l, 1, S.mortar);
        if (g >= gx0) px(c, x + (g - gx0), y + yy, 1, S.bh, S.mortar);
        if (S.vein && k > 0.6 && r - l > 6) px(c, x + l + 2, y + yy + Math.floor(S.bh / 2), Math.min(5, r - l - 3), 1, S.vein);
      }
    }
  } else if (S.lay === "planks") {
    px(c, x, y, T, T, b);
    for (let yy = 0; yy < T; yy += 4) {
      const k = hash(tx, ty * 4 + yy / 4, 5);
      px(c, x, y + yy, T, 4, k < 0.33 ? shade(b, -0.1) : k > 0.75 ? shade(b, 0.08) : b);
      px(c, x, y + yy + 3, T, 1, S.mortar);
      if (k > 0.5) px(c, x + Math.floor(k * 12), y + yy + 1, 1, 2, shade(b, -0.3));
      const seam = Math.floor(hash(tx, ty * 4 + yy, 9) * 16); px(c, x + seam, y + yy, 1, 3, S.mortar);
    }
  } else if (S.lay === "ground") {
    px(c, x, y, T, T, b);
    for (let i = 0; i < 10; i++) px(c, x + Math.floor(hash(tx, ty, i) * 15), y + Math.floor(hash(ty, tx, i + 20) * 15), 2, 1, S.grain);
    for (let i = 0; i < 5; i++) px(c, x + Math.floor(hash(tx, ty, i + 40) * 15), y + Math.floor(hash(ty, tx, i + 60) * 15), 1, 1, shade(b, 0.15));
  } else if (S.lay === "rock") {
    px(c, x, y, T, T, b);
    for (let i = 0; i < 4; i++) { const rx = Math.floor(hash(tx, ty, i) * 12), ry = Math.floor(hash(ty, tx, i + 7) * 12); px(c, x + rx, y + ry, 5, 4, shade(b, (hash(tx, ty, i + 3) - 0.5) * 0.3)); px(c, x + rx, y + ry, 5, 1, hi); px(c, x + rx, y + ry + 4, 5, 1, S.grain); }
  } else if (S.lay === "cloth") {
    px(c, x, y, T, T, b);
    for (let yy = 0; yy < T; yy += 2) px(c, x, y + yy, T, 1, shade(b, 0.06));
  }
  // The edges: a lit top, shadowed sides, a dark underside.
  if (open.top) {
    if (S.top) { px(c, x, y, T, 4, S.top); px(c, x, y + 4, T, 1, S.topDark || shade(S.top, -0.3)); for (let i = 0; i < 4; i++) px(c, x + Math.floor(hash(tx, i, 11) * 15), y - 1 - Math.floor(hash(tx, i, 12) * 2), 1, 2, S.top); }
    else { px(c, x, y, T, 1, shade(b, 0.4)); px(c, x, y + 1, T, 1, hi); }
  }
  if (open.left) px(c, x, y, 1, T, hi);
  if (open.right) px(c, x + T - 1, y, 1, T, lo2);
  if (open.bottom) { px(c, x, y + T - 2, T, 2, lo); px(c, x, y + T - 1, T, 1, lo2); }
}
function paintOneway(c, style, x, y, tx, ty, open) {
  if (style === "shelf" || style === "wood" || style === "rafter" || style === "cedar") {
    const b = style === "cedar" || style === "rafter" ? "#9a5a32" : "#8a5a32";
    px(c, x, y, T, 5, b); px(c, x, y, T, 1, shade(b, 0.35)); px(c, x, y + 4, T, 1, shade(b, -0.45));
    for (let i = 0; i < 3; i++) px(c, x + Math.floor(hash(tx, ty, i) * 14), y + 2, 2, 1, shade(b, -0.2));
    if (open.left || open.right) { const bx0 = open.left ? x + 2 : x + T - 4; px(c, bx0, y + 5, 2, 5, shade(b, -0.3)); }
  } else if (style === "cloud") {
    px(c, x, y + 1, T, 5, "#f4f0ff"); px(c, x, y, T, 2, "#ffffff"); px(c, x, y + 5, T, 2, "#c8c0e0");
  } else if (style === "marble") {
    px(c, x, y, T, 6, "#e8e0d4"); px(c, x, y, T, 1, "#ffffff"); px(c, x, y + 5, T, 1, "#a8a094");
  } else if (style === "gold") {
    px(c, x, y, T, 5, "#e8b94a"); px(c, x, y, T, 1, "#fff0a0"); px(c, x, y + 4, T, 1, "#8a6410");
  } else if (style === "vine") {
    px(c, x, y + 1, T, 3, "#6a4a2a"); for (let i = 0; i < 4; i++) px(c, x + i * 4 + 1, y - 1 + (i % 2), 3, 2, i % 2 ? "#5aa040" : "#3a7a2e");
  } else if (style === "tent") {
    px(c, x, y, T, 4, "#2a2226"); px(c, x, y, T, 1, "#4a3e42"); px(c, x, y + 4, T, 1, "#0a080a"); for (let i = 0; i < T; i += 4) px(c, x + i, y + 5, 2, 2, "#2a2226");
  } else if (style === "stone") {
    px(c, x, y, T, 6, "#7a7080"); px(c, x, y, T, 1, "#a8a0b0"); px(c, x, y + 5, T, 1, "#3a3440");
  }
}
function paintThorn(c, x, y, style) {
  const col = style === "fire" ? "#ff8a3a" : "#3a6a2a", tip = style === "fire" ? "#ffe08a" : "#a8c080";
  for (let i = 0; i < 4; i++) { px(c, x + i * 4 + 1, y + 10, 2, 6, col); px(c, x + i * 4 + 1, y + 6, 1, 4, col); px(c, x + i * 4 + 1, y + 5, 1, 1, tip); px(c, x + i * 4 + 2, y + 9, 2, 1, col); }
}
function paintBreak(c, x, y, tx, ty) {
  px(c, x, y, T, T, "#7a6a58"); px(c, x + 1, y + 1, T - 2, T - 2, "#8a7a68");
  px(c, x + 3, y + 4, 6, 1, "#4a3e32"); px(c, x + 8, y + 4, 1, 6, "#4a3e32"); px(c, x + 5, y + 10, 7, 1, "#4a3e32"); px(c, x + 1, y + 1, T - 2, 1, "#b0a090");
}
// A barricade of cedar boards, lashed together: only flame will take it down.
function paintCedar(c, x, y, tx, ty) {
  px(c, x, y, T, T, "#3a2014");
  for (let i = 0; i < 3; i++) { px(c, x + 1 + i * 5, y, 4, T, i % 2 ? "#8a4a2a" : "#9a5a32"); px(c, x + 2 + i * 5, y, 1, T, "#b8764a"); }
  px(c, x, y + 5, T, 2, "#5a3a20"); px(c, x + 3, y + 5, 2, 2, "#c8a050"); px(c, x + 11, y + 5, 2, 2, "#c8a050");
}
function paintClimb(c, R, x, y, tx, ty) {
  const kind = (R.climb && R.climb.kind) || "rope";
  if (kind === "rope") { px(c, x + 7, y, 2, T, "#b8945a"); for (let i = 0; i < 4; i++) px(c, x + 6 + (i % 2) * 2, y + i * 4, 2, 2, "#8a6a3a"); }
  else if (kind === "chain") { for (let i = 0; i < 4; i++) { px(c, x + 6, y + i * 4, 4, 3, i % 2 ? "#cfd6dc" : "#e8b94a"); px(c, x + 7, y + i * 4 + 1, 2, 1, "#5a4410"); } }
  else if (kind === "myrrh") { for (let i = 0; i < 5; i++) px(c, x + i * 3 + 1, y, 2, T, i % 2 ? "#6a4a2a" : "#8a6a3a"); px(c, x, y + 6, T, 2, "#c8a050"); }
  else if (kind === "scarlet") { px(c, x + 7, y, 2, T, "#c8202e"); for (let i = 0; i < 4; i++) px(c, x + 6 + (i % 2) * 2, y + i * 4 + 1, 2, 2, "#ff5a6a"); }
  else if (kind === "vine") { px(c, x + 7, y, 2, T, "#4a6a2a"); px(c, x + 3, y + 4, 4, 3, "#5aa040"); px(c, x + 9, y + 10, 4, 3, "#3a8a2e"); }
}
const ART = {};
ART.tiles = function (c, R, World) {
  const at = (x, y) => (x < 0 || y < 0 || x >= World.w || y >= World.h ? 1 : World.grid[y * World.w + x]);
  const solidLike = (k) => k === SOLID || k === BREAK;
  for (let ty = 0; ty < World.h; ty++) for (let tx = 0; tx < World.w; tx++) {
    const k = at(tx, ty), x = tx * T, y = ty * T;
    if (!k || World.hidden[ty * World.w + tx]) continue;
    const open = { top: !solidLike(at(tx, ty - 1)), bottom: !solidLike(at(tx, ty + 1)) && ty < World.h - 1, left: !solidLike(at(tx - 1, ty)) && tx > 0, right: !solidLike(at(tx + 1, ty)) && tx < World.w - 1 };
    if (k === SOLID) paintSolid(c, TILESET[tileStyleAt(R, tx, ty, 1)] || TILESET.stone, x, y, tx, ty, open);
    else if (k === ONEWAY) paintOneway(c, tileStyleAt(R, tx, ty, 2), x, y, tx, ty, { left: at(tx - 1, ty) !== ONEWAY, right: at(tx + 1, ty) !== ONEWAY });
    else if (k === THORN) paintThorn(c, x, y, R.thorn);
    else if (k === BREAK) (R.cedar ? paintCedar : paintBreak)(c, x, y, tx, ty);
    else if (k === CLIMB) paintClimb(c, R, x, y, tx, ty);
    else if (k === BOUNCE) { /* the bed is painted by its room */ }
    else if (k === WATER) { px(c, x, y + 2, T, T - 2, "rgba(60,120,200,0.55)"); px(c, x, y + 2, T, 1, "rgba(200,230,255,0.8)"); }
  }
};

// ---- Skies and far things -----------------------------------------------------------------------
function band(c, colors, y0, y1) { const n = colors.length, h = (y1 - y0) / n; colors.forEach((col, i) => px(c, 0, y0 + i * h, W, h + 1, col)); }
function ridge(c, cx, par, base, amp, period, col, seed) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
  const off = cx * par;
  for (let x = 0; x <= W; x += 4) { const wx = x + off; const y = base - amp * (0.55 * Math.sin(wx / period + seed) + 0.3 * Math.sin(wx / (period * 0.43) + seed * 2) + 0.15 * Math.sin(wx / (period * 0.17) + seed * 3)); c.lineTo(x, Math.round(y)); }
  c.lineTo(W, H); c.closePath(); c.fill();
}
const SKIES = {
  none(c) { px(c, 0, 0, W, H, "#0a0810"); },
  night(c, R, cx, cy, t) { band(c, ["#060814", "#0a0e22", "#10142e", "#181a3a"], 0, H); for (let i = 0; i < 60; i++) { const x = ((hash(i, 1) * 900 - cx * 0.05) % W + W) % W, y = hash(i, 2) * 140; px(c, x, y, 1, 1, hash(i, 3) > 0.8 && Math.sin(t * 3 + i) > 0 ? "#ffffff" : "#8890c0"); } ridge(c, cx, 0.2, 170 - cy * 0.1, 30, 90, "#121430", 1); },
  day(c, R, cx, cy, t) { band(c, ["#3a7ad0", "#5a96e0", "#7ab0ea", "#a0c8f0", "#c8e0f4"], 0, H); clouds(c, cx, cy, t, "#ffffff"); ridge(c, cx, 0.15, 150 - cy * 0.1, 26, 120, "#8ab0d0", 2); ridge(c, cx, 0.3, 175 - cy * 0.2, 18, 70, "#6a9a7a", 5); },
  desert(c, R, cx, cy, t) {
    band(c, ["#f0a050", "#f4b860", "#f8cc78", "#fadc98", "#fce8b8"], 0, H);
    const sx0 = 300 - cx * 0.03, sy0 = 46 - cy * 0.05; c.fillStyle = "rgba(255,250,220,0.5)"; c.beginPath(); c.arc(sx0, sy0, 26, 0, 7); c.fill(); px(c, sx0 - 14, sy0 - 14, 28, 28, "#fff4c8");
    ridge(c, cx, 0.12, 150 - cy * 0.1, 18, 140, "#e0a060", 3); ridge(c, cx, 0.25, 170 - cy * 0.2, 14, 90, "#d08a48", 7); ridge(c, cx, 0.45, 190 - cy * 0.3, 10, 60, "#c07a3a", 11);
  },
  sunset(c, R, cx, cy, t) { band(c, ["#3a2a5a", "#6a3a6a", "#b0506a", "#e07a5a", "#f4a860"], 0, H); clouds(c, cx, cy, t, "#ffd0a0"); ridge(c, cx, 0.2, 165 - cy * 0.1, 22, 110, "#4a2a4a", 4); },
  vineyard(c, R, cx, cy, t) {
    band(c, ["#4a90e0", "#6aa8ea", "#90c0f0", "#c0dcf4", "#f4ecc8"], 0, H);
    // The sun, near and hot.
    const sx0 = 200 - cx * 0.02, sy0 = 30; for (let r = 5; r > 0; r--) { c.fillStyle = "rgba(255,240,180," + 0.12 + ")"; c.beginPath(); c.arc(sx0, sy0, 20 + r * 12, 0, 7); c.fill(); }
    px(c, sx0 - 16, sy0 - 16, 32, 32, "#fff8d8"); px(c, sx0 - 12, sy0 - 18, 24, 36, "#fff8d8"); px(c, sx0 - 18, sy0 - 12, 36, 24, "#fff8d8");
    ridge(c, cx, 0.2, 160 - cy * 0.1, 22, 100, "#7aa86a", 6); ridge(c, cx, 0.35, 180 - cy * 0.2, 14, 60, "#5a8a4a", 9);
  },
  dawn(c, R, cx, cy, t) { band(c, ["#2a3a6a", "#5a6a9a", "#c08aa0", "#f0b890", "#fce0b0"], 0, H); clouds(c, cx, cy, t, "#ffe0d0"); ridge(c, cx, 0.2, 165 - cy * 0.1, 24, 120, "#5a5a7a", 8); },
  cave(c, R, cx, cy) { band(c, ["#100c0c", "#16100e", "#1a1412"], 0, H); for (let i = 0; i < 30; i++) { const x = ((hash(i, 7) * 800 - cx * 0.3) % W + W) % W; px(c, x, 0, 6 + hash(i, 8) * 10, 10 + hash(i, 9) * 40, "#0c0808"); } },
};
function clouds(c, cx, cy, t, col) {
  for (let i = 0; i < 8; i++) {
    const x = ((hash(i, 21) * 900 + t * (4 + i) - cx * 0.1) % (W + 120) + W + 120) % (W + 120) - 60, y = 20 + hash(i, 22) * 70 - cy * 0.05;
    c.fillStyle = col; c.globalAlpha = 0.85;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 12, y + (k % 2) * 3, 9 + (k % 2) * 5, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
}
ART.sky = function (c, R, cx, cy, t) { (SKIES[R.sky || "none"] || SKIES.none)(c, R, cx, cy, t); };

// ---- Back walls ------------------------------------------------------------------------------
// Painted once for a whole room: wallpaper and wainscot, cellar arches,
// storeroom planks, cave rock. The room's own paint() adds what is its alone.
const WALLS = {
  mansion(c, R, w, h) {
    const paper = R.paper || "#4a2a3a";
    px(c, 0, 0, w, h, paper);
    // A damask of small lozenges.
    for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) { px(c, x + 5, y + 2, 2, 8, shade(paper, 0.12)); px(c, x + 3, y + 5, 6, 2, shade(paper, 0.12)); px(c, x + 5, y + 5, 2, 2, shade(paper, 0.25)); }
    // Pilasters and the dado rail.
    for (let x = 40; x < w; x += 128) { px(c, x, 0, 14, h, shade(paper, -0.3)); px(c, x + 2, 0, 10, h, R.pillar || "#8a6a4a"); px(c, x + 2, 0, 2, h, shade(R.pillar || "#8a6a4a", 0.3)); px(c, x + 10, 0, 2, h, shade(R.pillar || "#8a6a4a", -0.3)); }
    if (R.dado !== false) for (let ty = 0; ty < h; ty += T * 8) { }
  },
  cellar(c, R, w, h) {
    px(c, 0, 0, w, h, "#2e2420");
    for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < w; x += 16) { const k = hash(x, y, 2); px(c, x, y, 15, 7, k > 0.5 ? "#3a2e28" : "#342a24"); px(c, x, y, 15, 1, "#44362e"); }
    // Arches.
    for (let x = 0; x < w; x += 96) { c.fillStyle = "#1a1412"; c.beginPath(); c.moveTo(x + 16, h); c.lineTo(x + 16, h * 0.45); c.quadraticCurveTo(x + 48, h * 0.18, x + 80, h * 0.45); c.lineTo(x + 80, h); c.fill(); }
  },
  storeroom(c, R, w, h) {
    px(c, 0, 0, w, h, "#3a2818");
    for (let x = 0; x < w; x += 10) { const k = hash(x, 4); px(c, x, 0, 9, h, k > 0.5 ? "#44301c" : "#3e2c1a"); px(c, x + 9, 0, 1, h, "#24180c"); }
    for (let y = 40; y < h; y += 96) { px(c, 0, y, w, 8, "#5a3a20"); px(c, 0, y, w, 1, "#7a5a30"); px(c, 0, y + 7, w, 1, "#1a1008"); }
  },
  cave(c, R, w, h) {
    px(c, 0, 0, w, h, "#1e1816");
    for (let i = 0; i < w * h / 300; i++) { const x = hash(i, 1, 5) * w, y = hash(i, 2, 5) * h; px(c, x, y, 3 + hash(i, 3) * 8, 2 + hash(i, 4) * 6, hash(i, 6) > 0.5 ? "#262020" : "#181212"); }
  },
  palace(c, R, w, h) {
    px(c, 0, 0, w, h, R.paper || "#2a1e3a");
    for (let x = 0; x < w; x += 64) { px(c, x + 20, 0, 24, h, "#3a2a4a"); px(c, x + 22, 0, 4, h, "#5a4a6a"); px(c, x + 40, 0, 4, h, "#1e1428"); }
    for (let y = 0; y < h; y += 48) px(c, 0, y, w, 3, "#c8962a");
  },
  none() { },
};
ART.back = function (c, R, World) {
  const w = World.w * T, h = World.h * T;
  (WALLS[R.wall || "none"] || WALLS.none)(c, R, w, h);
  for (const d of R.decor || []) (DECOR[d.k] || (() => { }))(c, d, R);
  if (R.paint) R.paint(c, World);
  // A board, plaque, parchment or cloth behind a verse that asks for one.
  for (const tx of R.texts || []) {
    if (!tx.panel) continue;
    const L = VERSE.layout(c, R, tx), padX = 8, padY = 6, h = L.lines.length * L.lh;
    const x = tx.x - padX, y = tx.y - padY, w = (tx.w || 120) + padX * 2;
    (DECOR[tx.panel] || DECOR.plaque)(c, { x, y, w, h: h + padY * 2, c: tx.panelColor });
  }
};
// Small things on walls, placed by rooms.
const DECOR = {
  window(c, d) { const { x, y } = d, w = d.w || 24, h = d.h || 40; px(c, x - 2, y - 2, w + 4, h + 4, "#2a1a14"); px(c, x, y, w, h, d.night ? "#1a2050" : "#8ac0f0"); c.fillStyle = "#2a1a14"; px(c, x + w / 2 - 1, y, 2, h, "#2a1a14"); px(c, x, y + h / 2, w, 2, "#2a1a14"); px(c, x, y, w, 3, d.night ? "#2a3060" : "#c8e4fa"); },
  arch(c, d) { const { x, y } = d, w = d.w || 48, h = d.h || 64; c.fillStyle = d.c || "#120c10"; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.fill(); c.strokeStyle = d.rim || "#a8906a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 1, y + h); c.lineTo(x - 1, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2 + 1, Math.PI, 0); c.lineTo(x + w + 1, y + h); c.stroke(); },
  torch(c, d) { px(c, d.x - 1, d.y, 4, 10, "#5a3a20"); px(c, d.x - 3, d.y - 2, 8, 3, "#8a6a3a"); },
  panel(c, d) { px(c, d.x, d.y, d.w, d.h, d.c || "#d8cfb8"); px(c, d.x, d.y, d.w, 1, shade(d.c || "#d8cfb8", 0.3)); px(c, d.x, d.y + d.h - 1, d.w, 1, shade(d.c || "#d8cfb8", -0.4)); px(c, d.x + 2, d.y + 2, d.w - 4, d.h - 4, shade(d.c || "#d8cfb8", -0.05)); },
  plaque(c, d) { px(c, d.x - 2, d.y - 2, d.w + 4, d.h + 4, "#4a3420"); px(c, d.x, d.y, d.w, d.h, d.c || "#8a7a68"); px(c, d.x, d.y, d.w, 1, "#b0a090"); },
  banner(c, d) { const col = d.c || "#7a1f2b"; px(c, d.x - 3, d.y - 3, d.w + 6, 3, "#c8962a"); px(c, d.x, d.y, d.w, d.h, col); px(c, d.x, d.y, 2, d.h, shade(col, 0.2)); px(c, d.x + d.w - 2, d.y, 2, d.h, shade(col, -0.3)); for (let i = 0; i < d.w; i += 6) { px(c, d.x + i, d.y + d.h, 4, 4, col); px(c, d.x + i + 1, d.y + d.h + 4, 2, 2, "#c8962a"); } },
  scroll(c, d) { px(c, d.x, d.y, d.w, d.h, "#f0e4c4"); px(c, d.x - 3, d.y - 3, d.w + 6, 4, "#c8b088"); px(c, d.x - 3, d.y + d.h - 1, d.w + 6, 4, "#c8b088"); px(c, d.x, d.y, d.w, 1, "#fff8e0"); },
  fresco(c, d) { px(c, d.x, d.y, d.w, d.h, "#e8dcc0"); for (let i = 0; i < 30; i++) px(c, d.x + hash(i, d.x) * d.w, d.y + hash(i, d.y) * d.h, 2, 1, "#d8c8a8"); px(c, d.x, d.y, d.w, 2, "#a8906a"); px(c, d.x, d.y + d.h - 2, d.w, 2, "#a8906a"); },
  rug(c, d) {
    const col = d.c || "#8a2a2a", w = d.w, h = d.h;
    px(c, d.x - 2, d.y - 3, w + 4, 3, "#6a4a2a");
    px(c, d.x, d.y, w, h, col); px(c, d.x + 2, d.y + 2, w - 4, h - 4, shade(col, 0.12));
    for (let y = d.y + 6; y < d.y + h - 6; y += 10) for (let x = d.x + 5; x < d.x + w - 5; x += 10) { px(c, x, y, 4, 4, d.c2 || "#e8b94a"); px(c, x + 1, y + 1, 2, 2, shade(col, -0.2)); }
    px(c, d.x, d.y + 3, w, 1, d.c2 || "#e8b94a"); px(c, d.x, d.y + h - 4, w, 1, d.c2 || "#e8b94a");
    for (let x = d.x; x < d.x + w; x += 3) px(c, x, d.y + h, 1, 4, d.c2 || "#e8b94a");
  },
  board(c, d) { const col = d.c || "#8a5a32"; px(c, d.x - 2, d.y - 2, d.w + 4, d.h + 4, "#2a1408"); px(c, d.x, d.y, d.w, d.h, col); for (let y = d.y + 5; y < d.y + d.h; y += 6) px(c, d.x, y, d.w, 1, shade(col, -0.2)); px(c, d.x, d.y, d.w, 1, shade(col, 0.35)); for (const [a, b] of [[3, 3], [d.w - 5, 3], [3, d.h - 5], [d.w - 5, d.h - 5]]) px(c, d.x + a, d.y + b, 2, 2, "#c8b088"); },
  parchment(c, d) { DECOR.scroll(c, d); },
  shelf(c, d) { px(c, d.x, d.y, d.w, 4, "#6a4424"); px(c, d.x, d.y, d.w, 1, "#8a6434"); },
};

// ---- The monk -------------------------------------------------------------------------------
// A Benedictine in a black habit with scapular and cowl, tonsured, a cord at
// his waist, sandals. What he has found changes how he looks: a staff, the
// sandals of the roe, a lantern, a helmet, gloves, the seal on his heart.
ART.monkColors = function (m) {
  const tan = clamp(m.tan || 0, 0, 1);
  return { ink: "#06040a", habit: "#1c1a26", hi: "#34324a", lo: "#0e0d14", skin: mix("#f0c8a8", "#8a5636", tan), skinLo: mix("#c89878", "#5a3420", tan), hair: "#5a4434", cord: "#c8b088", sandal: save.powers.sandals ? "#e8b94a" : "#7a5030" };
};
ART.monk = function (c, m, t) {
  if (m.inv > 0 && Math.floor(m.inv * 14) % 2 === 0 && Game.state === "play") return;
  const C = ART.monkColors(m), f = m.face;
  const ox = Math.round(m.x + m.w / 2), oy = Math.round(m.y + m.h); // feet, centre
  c.save(); c.translate(ox, oy); if (f < 0) c.scale(-1, 1);
  if (m.sq) c.scale(1 - m.sq * 0.6, 1 + m.sq);
  // Lifting a new gift high: both hands up.
  const raising = Game.powerT > 0;
  const shapes = [];
  const S = (x, y, w, h, col) => shapes.push([x, y, w, h, col]);
  const a = m.anim, step = m.step || 0;
  const bob = a === "run" ? (Math.floor(step) % 2) : a === "idle" ? (Math.floor(t * 1.6) % 2) * 0.5 : 0;
  // Legs and sandals under the hem.
  let lf = 0, rf = 0, tuck = 0;
  if (a === "run") { const ph = Math.sin(step * Math.PI / 3); lf = Math.round(ph * 3); rf = -lf; }
  if (a === "jump" || a === "fall" || a === "dash") tuck = 2;
  S(-3 + lf, -4 + tuck, 3, 4 - tuck, C.lo); S(1 + rf, -4 + tuck, 3, 4 - tuck, C.lo);
  S(-4 + lf, -1, 4, 1, C.sandal); S(1 + rf, -1, 4, 1, C.sandal);
  // The habit: wider at the hem, swinging when he runs.
  const sway = a === "run" ? Math.round(Math.sin(step * Math.PI / 3) * 1) : a === "fall" ? 1 : 0;
  const y0 = -24 + bob;
  S(-5, y0 + 9, 10, 12, C.habit);
  S(-6 - sway, y0 + 15, 12, 6, C.habit);
  S(-6 - sway, y0 + 20, 12, 1, C.lo);
  S(-5, y0 + 9, 2, 11, C.hi);
  // The scapular down the front, a shade apart.
  S(1, y0 + 9, 3, 12, "#24222e"); S(1, y0 + 9, 1, 12, C.hi);
  // The cord.
  S(-5, y0 + 14, 10, 1, C.cord); S(-1, y0 + 15, 1, 4, C.cord);
  // Arms: by the side, swinging, raised to carry or to throw, against the wall.
  const arm = (x, y, w, h) => { S(x, y, w, h, C.habit); S(x, y + h - 1, w, 1, C.lo); };
  if (raising) { arm(-6, y0 - 6, 3, 12); arm(4, y0 - 6, 3, 12); S(-6, y0 - 8, 3, 2, C.skin); S(4, y0 - 8, 3, 2, C.skin); }
  else if (m.carry) { arm(-5, y0 + 2, 3, 8); arm(3, y0 + 2, 3, 8); S(-5, y0 + 1, 3, 2, C.skin); S(3, y0 + 1, 3, 2, C.skin); }
  else if (a === "throw") { arm(3, y0 + 9, 6, 3); S(9, y0 + 9, 2, 3, C.skin); }
  else if (a === "climb") { const k = Math.floor(t * 8) % 2; arm(2, y0 + (k ? 3 : 6), 3, 7); S(3, y0 + (k ? 2 : 5), 3, 2, C.skin); arm(-3, y0 + (k ? 6 : 3), 3, 7); }
  else if (a === "slide") { arm(3, y0 + 4, 3, 7); S(5, y0 + 3, 2, 3, C.skin); }
  else if (a === "jump") { arm(2, y0 + 7, 4, 4); S(5, y0 + 6, 2, 2, C.skin); }
  else { const sw = a === "run" ? Math.round(Math.sin(step * Math.PI / 3) * 2) : 0; arm(1 + sw, y0 + 10, 3, 6); S(1 + sw, y0 + 16, 3, 2, C.skin); }
  // The cowl gathered at the neck, and the head.
  S(-5, y0 + 6, 10, 4, C.habit); S(-6, y0 + 3, 4, 7, C.habit); S(-6, y0 + 3, 1, 6, C.hi);
  if (save.powers.helmet) {
    S(-4, y0 - 1, 9, 9, C.skin); S(-4, y0 - 2, 9, 5, "#a8b0bc"); S(-4, y0 - 2, 9, 1, "#e0e6ee"); S(-5, y0 + 2, 11, 1, "#6a7280"); S(3, y0 + 3, 2, 1, C.ink); S(-1, y0 - 4, 2, 2, "#b8322a");
  } else {
    S(-4, y0, 8, 8, C.skin); S(-4, y0 + 6, 8, 2, C.skinLo);
    // Tonsure: a crown of hair about a shaven head.
    S(-4, y0 + 1, 8, 2, C.hair); S(-4, y0 + 1, 2, 4, C.hair); S(-2, y0, 4, 1, C.skin);
    S(2, y0 + 4, 1, 1, C.ink); S(3, y0 + 6, 1, 1, C.skinLo);
  }
  // What he carries and wears.
  if (save.powers.staff && !m.carry && a !== "throw" && a !== "climb") { S(6, y0 - 6, 2, 30, "#8a5a2b"); S(6, y0 - 6, 1, 30, "#b8844a"); S(5, y0 - 8, 4, 3, "#6a4220"); }
  if (save.powers.lantern) { S(-6, y0 + 14, 1, 3, "#5a5050"); S(-8, y0 + 16, 5, 5, "#3a3030"); S(-7, y0 + 17, 3, 3, "#ffcf5a"); }
  if (save.powers.gloves) { /* gloved hands */ }
  if (save.powers.seal) { S(1, y0 + 11, 3, 3, "#c8323a"); S(2, y0 + 12, 1, 1, "#ffb0a0"); }
  // Outline first, then the colours.
  c.fillStyle = C.ink;
  for (const [x, y, w, h] of shapes) c.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, h + 2);
  for (const [x, y, w, h, col] of shapes) { c.fillStyle = save.powers.gloves && col === C.skin && h <= 3 && y > y0 + 1 ? "#7a4a2a" : col; c.fillRect(Math.round(x), Math.round(y), w, h); }
  c.restore();
};

// ---- Things to lift and stack ---------------------------------------------------------------------
ART.body = function (c, b, t) {
  const x = Math.round(b.x), y = Math.round(b.y);
  if (b.draw) { b.draw(c, b, t); return; }
  if (b.kind === "crate") {
    px(c, x, y, b.w, b.h, "#1a0e06"); px(c, x + 1, y + 1, b.w - 2, b.h - 2, "#9a6a3a");
    px(c, x + 1, y + 1, b.w - 2, 2, "#c89a5a"); px(c, x + 1, y + b.h - 3, b.w - 2, 2, "#6a4220");
    px(c, x + 1, y + 1, 2, b.h - 2, "#b8844a"); px(c, x + b.w - 3, y + 1, 2, b.h - 2, "#6a4220");
    for (let i = 3; i < b.w - 3; i++) px(c, x + i, y + 3 + Math.round((i - 3) * (b.h - 6) / (b.w - 6)), 1, 1, "#6a4220");
    if (b.mark) { px(c, x + 4, y + 5, b.w - 8, b.h - 10, "#d8b880"); }
  } else if (b.kind === "jar") {
    px(c, x + 2, y, b.w - 4, 2, "#1a0e06"); px(c, x + 3, y + 1, b.w - 6, 2, "#c87a4a");
    px(c, x, y + 3, b.w, b.h - 4, "#1a0e06"); px(c, x + 1, y + 3, b.w - 2, b.h - 5, "#c87a4a"); px(c, x + 2, y + 4, 2, b.h - 8, "#e8a070"); px(c, x + b.w - 3, y + 4, 2, b.h - 7, "#8a4a2a");
    px(c, x + 1, y + 7, b.w - 2, 1, "#6a3a1a"); px(c, x + 2, y + b.h - 1, b.w - 4, 1, "#1a0e06");
  } else if (b.kind === "bale") {
    px(c, x, y, b.w, b.h, "#2a1e0a"); px(c, x + 1, y + 1, b.w - 2, b.h - 2, "#d8b050"); for (let i = 2; i < b.w - 2; i += 3) px(c, x + i, y + 2, 1, b.h - 4, "#b89040"); px(c, x + 1, y + b.h / 2, b.w - 2, 1, "#7a5a20");
  } else if (b.kind === "chest") {
    px(c, x, y, b.w, b.h, "#1a0e06"); px(c, x + 1, y + 1, b.w - 2, b.h - 2, "#7a3a2a"); px(c, x + 1, y + 1, b.w - 2, 4, "#9a4a32"); px(c, x + 1, y + 5, b.w - 2, 1, "#e8b94a"); px(c, x + b.w / 2 - 1, y + 5, 2, 3, "#e8b94a");
  } else { px(c, x, y, b.w, b.h, "#888"); }
};
ART.item = function (c, it, t) {
  const x = Math.round(it.x), y = Math.round(it.y + Math.sin(t * 3 + it.x) * 1.5);
  if (it.kind === "lily") { px(c, x + 4, y + 6, 2, 6, "#3a8a2e"); px(c, x + 1, y + 8, 3, 2, "#5aa040"); px(c, x + 2, y, 6, 6, "#ffffff"); px(c, x, y + 2, 10, 3, "#ffffff"); px(c, x + 4, y + 2, 2, 2, "#ffe08a"); px(c, x + 2, y + 5, 6, 1, "#d8d8e8"); }
  if (it.kind === "pome") {
    // A pomegranate: round and red, its little crown on top, a glint.
    c.fillStyle = "#06040a"; c.beginPath(); c.arc(x + 6, y + 7, 6.5, 0, 7); c.fill();
    c.fillStyle = "#b8242e"; c.beginPath(); c.arc(x + 6, y + 7, 5.5, 0, 7); c.fill();
    px(c, x + 3, y + 4, 2, 2, "#ff8a8a"); px(c, x + 4, y - 1, 5, 3, "#06040a"); px(c, x + 5, y - 1, 1, 2, "#e8b94a"); px(c, x + 7, y - 1, 1, 2, "#e8b94a");
    if (Math.sin(t * 3 + x) > 0.8) px(c, x + 8, y + 3, 1, 1, "#ffffff");
  }
  if (it.kind === "heart") { const col = "#e8324a"; px(c, x, y + 2, 4, 4, col); px(c, x + 5, y + 2, 4, 4, col); px(c, x + 1, y + 1, 2, 1, col); px(c, x + 6, y + 1, 2, 1, col); px(c, x + 1, y + 6, 7, 1, col); px(c, x + 2, y + 7, 5, 1, col); px(c, x + 3, y + 8, 3, 1, col); px(c, x + 1, y + 2, 1, 1, "#ffb0b8"); }
  if (it.kind === "power") POWER_ICON[it.power] && POWER_ICON[it.power](c, x, y, t);
};
const POWER_ICON = {
  staff(c, x, y) { px(c, x + 7, y, 2, 20, "#8a5a2b"); px(c, x + 7, y, 1, 20, "#c8945a"); px(c, x + 5, y - 2, 6, 3, "#6a4220"); },
  sandals(c, x, y) { for (const dx of [0, 8]) { px(c, x + dx, y + 12, 7, 3, "#7a5030"); px(c, x + dx + 1, y + 9, 5, 1, "#e8b94a"); px(c, x + dx + 3, y + 9, 1, 3, "#e8b94a"); } px(c, x + 3, y + 2, 10, 4, "#fff4c8"); },
  lantern(c, x, y, t) { px(c, x + 6, y, 4, 2, "#5a5050"); px(c, x + 3, y + 2, 10, 14, "#3a3030"); px(c, x + 5, y + 4, 6, 10, "#ffcf5a"); px(c, x + 6, y + 6 + Math.sin(t * 9), 4, 4, "#fff4c8"); },
  angel(c, x, y, t) { ART.angel(c, { x, y, t }, t); },
  helmet(c, x, y) { px(c, x + 2, y + 6, 12, 10, "#a8b0bc"); px(c, x + 2, y + 6, 12, 2, "#e0e6ee"); px(c, x + 1, y + 12, 14, 2, "#6a7280"); px(c, x + 7, y + 2, 2, 4, "#b8322a"); },
  chariot(c, x, y) { px(c, x, y + 8, 16, 6, "#c8962a"); px(c, x, y + 8, 16, 1, "#fff0a0"); c.fillStyle = "#3a2410"; c.beginPath(); c.arc(x + 8, y + 16, 4, 0, 7); c.fill(); px(c, x + 7, y + 15, 2, 2, "#e8b94a"); },
  gloves(c, x, y) { for (const dx of [1, 9]) { px(c, x + dx, y + 6, 6, 9, "#7a4a2a"); px(c, x + dx, y + 4, 1, 3, "#7a4a2a"); px(c, x + dx + 2, y + 3, 1, 3, "#7a4a2a"); px(c, x + dx + 4, y + 4, 1, 3, "#7a4a2a"); } },
  seal(c, x, y, t) { c.fillStyle = "#c8323a"; c.beginPath(); c.arc(x + 8, y + 10, 7, 0, 7); c.fill(); px(c, x + 5, y + 8, 2, 2, "#ffb0a0"); px(c, x + 9, y + 8, 2, 2, "#ffb0a0"); px(c, x + 6, y + 10, 4, 2, "#ffb0a0"); px(c, x + 7, y + 12, 2, 1, "#ffb0a0"); },
};
ART.angel = function (c, a, t) {
  const x = Math.round(a.x), y = Math.round(a.y + Math.sin(t * 3) * 2), fl = Math.floor(t * 8) % 2;
  // Wings, beating.
  px(c, x - 6, y + 4 - fl * 2, 6, 8, "#e8f0ff"); px(c, x + 10, y + 4 - fl * 2, 6, 8, "#e8f0ff"); px(c, x - 6, y + 4 - fl * 2, 6, 1, "#ffffff"); px(c, x + 10, y + 4 - fl * 2, 6, 1, "#ffffff");
  px(c, x + 1, y + 7, 8, 11, "#06040a"); px(c, x + 2, y + 8, 6, 10, "#f4f0ff"); px(c, x + 2, y + 8, 6, 2, "#c8d8ff");
  px(c, x + 2, y + 1, 6, 6, "#06040a"); px(c, x + 3, y + 2, 4, 5, "#f8d8b8"); px(c, x + 3, y + 1, 4, 2, "#f0d070");
  if (a.flash > 0) { c.globalAlpha = a.flash * 3; px(c, x - 4, y - 2, 18, 22, "#ffffff"); c.globalAlpha = 1; }
};

// ---- Creatures ---------------------------------------------------------------------------------
ART.foe = function (c, f, t) {
  if (!f.alive) return;
  const x = Math.round(f.x), y = Math.round(f.y), fl = Math.floor(f.t * 10) % 2;
  if (f.inv > 0 && Math.floor(f.inv * 30) % 2) return;
  c.save();
  if (f.face > 0) { c.translate(x * 2 + f.w, 0); c.scale(-1, 1); }
  const k = f.kind;
  if (k === "bat") {
    if (!f.awake) { px(c, x + 4, y, 4, 8, "#2a1a2a"); px(c, x + 5, y + 6, 1, 1, "#e83a3a"); }
    else { px(c, x + 4, y + 2, 4, 5, "#2a1a2a"); px(c, x, y + (fl ? 0 : 3), 4, 3, "#3a2a3a"); px(c, x + 8, y + (fl ? 0 : 3), 4, 3, "#3a2a3a"); px(c, x + 5, y + 3, 1, 1, "#e83a3a"); px(c, x + 7, y + 3, 1, 1, "#e83a3a"); }
  } else if (k === "rat") {
    px(c, x + 2, y + 2, 10, 5, "#5a4a42"); px(c, x, y + 3, 3, 3, "#5a4a42"); px(c, x + 1, y + 3, 1, 1, "#e83a3a"); px(c, x + 12, y + 4, 3, 1, "#c89a8a"); px(c, x + 3 + fl, y + 7, 2, 1, "#3a2a22"); px(c, x + 8 - fl, y + 7, 2, 1, "#3a2a22"); px(c, x + 2, y + 2, 10, 1, "#7a6a62");
  } else if (k === "scorpion") {
    px(c, x + 2, y + 5, 10, 4, "#7a3a1a"); px(c, x + 2, y + 5, 10, 1, "#a85a2a"); px(c, x, y + 4, 3, 3, "#7a3a1a"); px(c, x - 1, y + 3, 2, 2, "#a85a2a");
    px(c, x + 12, y + 3, 2, 3, "#7a3a1a"); px(c, x + 13, y + 1, 2, 2, "#7a3a1a"); px(c, x + 11, y, 2, 2, "#e8b94a");
    for (let i = 0; i < 3; i++) px(c, x + 3 + i * 3, y + 9, 1, 1 + ((fl + i) % 2), "#4a2410");
  } else if (k === "crow") {
    px(c, x + 3, y + 3, 8, 5, "#14121a"); px(c, x, y + 4, 4, 2, "#14121a"); px(c, x - 2, y + 5, 2, 1, "#e8b94a"); px(c, x + 2, y + 4, 1, 1, "#ffffff");
    px(c, x + 4, y + (fl ? 0 : 6), 7, 3, "#24222e"); px(c, x + 10, y + 5, 4, 2, "#14121a");
  } else if (k === "fox") {
    px(c, x + 4, y + 3, 11, 6, "#c86a2a"); px(c, x + 4, y + 7, 11, 2, "#f4e0c8"); px(c, x, y + 1, 6, 6, "#c86a2a"); px(c, x, y + 1, 2, 2, "#c86a2a"); px(c, x + 3, y - 1, 2, 3, "#c86a2a"); px(c, x + 1, y + 3, 1, 1, "#14121a"); px(c, x - 1, y + 4, 2, 2, "#f4e0c8");
    px(c, x + 15, y + 2, 5, 3, "#c86a2a"); px(c, x + 18, y + 2, 2, 2, "#ffffff");
    px(c, x + 5 + fl, y + 9, 2, 3, "#8a4a1a"); px(c, x + 12 - fl, y + 9, 2, 3, "#8a4a1a");
  } else if (k === "watchman") {
    px(c, x + 2, y + 8, 9, 14, "#3a3a52"); px(c, x + 2, y + 8, 9, 2, "#5a5a72"); px(c, x + 3, y + 1, 6, 7, "#d8a880"); px(c, x + 2, y, 8, 3, "#8a8a9a"); px(c, x + 3, y + 3, 1, 1, "#14121a");
    px(c, x - 2, y + 4, 2, 20, "#8a6a3a"); px(c, x - 3, y + 2, 4, 3, "#c8ccd4"); px(c, x + 3 + fl, y + 22, 3, 4, "#2a2a3a"); px(c, x + 7 - fl, y + 22, 3, 4, "#2a2a3a");
    px(c, x + 10, y + 12, 4, 5, "#3a3030"); px(c, x + 11, y + 13, 2, 3, "#ffcf5a");
  } else if (k === "bee") {
    px(c, x + 1, y + 2, 6, 4, "#e8b030"); px(c, x + 2, y + 2, 1, 4, "#2a1a0a"); px(c, x + 5, y + 2, 1, 4, "#2a1a0a"); px(c, x, y + 3, 1, 2, "#2a1a0a");
    px(c, x + 2, y - (fl ? 1 : 0), 3, 2, "rgba(230,240,255,0.85)"); px(c, x + 5, y - (fl ? 0 : 1), 2, 2, "rgba(230,240,255,0.85)");
  } else if (k === "leopard") {
    px(c, x + 6, y + 3, 16, 7, "#d8a84a"); px(c, x + 6, y + 3, 16, 1, "#f0c86a"); px(c, x, y + 1, 8, 8, "#d8a84a"); px(c, x + 2, y + 3, 1, 1, "#14121a"); px(c, x, y + 5, 2, 2, "#14121a");
    for (let i = 0; i < 7; i++) px(c, x + 7 + (i * 5) % 14, y + 4 + (i % 3) * 2, 2, 2, "#3a2a1a");
    px(c, x + 22, y + 2, 4, 2, "#d8a84a"); px(c, x + 25, y, 2, 3, "#d8a84a");
    px(c, x + 7 + fl, y + 10, 3, 4, "#b8883a"); px(c, x + 17 - fl, y + 10, 3, 4, "#b8883a");
  } else if (k === "lion") {
    px(c, x + 6, y + 4, 16, 8, "#c8963a"); px(c, x + 6, y + 4, 16, 2, "#e8b65a"); px(c, x, y, 9, 10, "#8a5a1a"); px(c, x + 1, y + 2, 6, 6, "#d8a64a"); px(c, x + 2, y + 4, 1, 1, "#14121a"); px(c, x, y + 6, 2, 2, "#14121a");
    px(c, x + 22, y + 3, 3, 2, "#c8963a"); px(c, x + 24, y + 1, 2, 3, "#8a5a1a");
    px(c, x + 7 + fl, y + 12, 3, 4, "#a8762a"); px(c, x + 17 - fl, y + 12, 3, 4, "#a8762a");
  }
  c.restore();
};
ART.shot = function (c, s, t) {
  const x = Math.round(s.x), y = Math.round(s.y);
  if (s.kind === "flask") { px(c, x + 1, y + 1, 4, 5, "#9fd0ff"); px(c, x + 2, y - 1, 2, 2, "#c8a878"); px(c, x + 1, y + 1, 1, 2, "#ffffff"); }
  else { px(c, x, y, 6, 6, "#ff6a3a"); px(c, x + 1, y + 1, 4, 4, "#ffcf5a"); px(c, x + 2, y + 2, 2, 2, "#fff4c8"); }
};
ART.mover = function (c, mv, t) { if (mv.draw) mv.draw(c, mv, t); else { px(c, mv.x, mv.y, mv.w, mv.h, "#8a6a3a"); px(c, mv.x, mv.y, mv.w, 1, "#c89a5a"); } };
ART.npc = function (c, n, t) { if (n.draw) n.draw(c, n, t); };

// ---- People and animals for the chapters ---------------------------------------------------------
// A figure in a robe, drawn like the monk but plainer: shepherds, kings, dwarfs.
function figure(c, x, y, o, t) {
  const h = o.h || 26, w = o.w || 10, ink = "#06040a", bob = o.still ? 0 : Math.floor(t * 2) % 2;
  c.save(); c.translate(Math.round(x), Math.round(y)); if (o.face < 0) { c.translate(w, 0); c.scale(-1, 1); }
  const S = [];
  const R = (a, b, cw, ch, col) => S.push([a, b, cw, ch, col]);
  const top = 0 + bob * 0.5;
  R(1, top + h * 0.35, w - 2, h * 0.62, o.robe); R(0, top + h * 0.75, w, h * 0.22, o.robe); R(1, top + h * 0.35, 2, h * 0.6, shade(o.robe, 0.2));
  if (o.sash) R(1, top + h * 0.55, w - 2, 2, o.sash);
  R(2, top + h * 0.06, w - 4, h * 0.3, o.skin); R(w - 4, top + h * 0.15, 1, 1, ink);
  if (o.hair) R(2, top + h * 0.04, w - 4, 2, o.hair);
  if (o.beard) R(3, top + h * 0.24, w - 5, h * 0.14, o.beard);
  if (o.headcloth) { R(1, top, w - 2, 3, o.headcloth); R(1, top, 2, h * 0.35, o.headcloth); }
  if (o.crown) { R(2, top - 3, w - 4, 3, "#e8b94a"); R(2, top - 5, 1, 2, "#e8b94a"); R(w / 2 - 0.5, top - 5, 1, 2, "#e8b94a"); R(w - 3, top - 5, 1, 2, "#e8b94a"); }
  if (o.nemes) { R(0, top, w, 4, "#e8b94a"); R(0, top + 4, 3, h * 0.3, "#e8b94a"); for (let i = 0; i < 4; i++) R(0, top + 5 + i * 2, 3, 1, "#3a5aa8"); R(1, top, w - 2, 1, "#3a5aa8"); }
  if (o.staff) { R(w, top - 2, 1, h + 2, "#8a5a2b"); R(w, top - 3, 3, 2, "#8a5a2b"); }
  c.fillStyle = ink; for (const [a, b, cw, ch] of S) c.fillRect(Math.round(a) - 1, Math.round(b) - 1, Math.round(cw) + 2, Math.round(ch) + 2);
  for (const [a, b, cw, ch, col] of S) { c.fillStyle = col; c.fillRect(Math.round(a), Math.round(b), Math.round(cw), Math.round(ch)); }
  c.restore();
}
function goat(c, x, y, face, t, col, eating) {
  c.save(); c.translate(Math.round(x), Math.round(y)); if (face < 0) { c.translate(14, 0); c.scale(-1, 1); }
  const fl = Math.floor(t * 8) % 2, body = col || "#e8e0d0", dark = shade(body, -0.35);
  px(c, 1, 3, 10, 6, "#06040a"); px(c, 2, 4, 8, 4, body); px(c, 2, 4, 8, 1, shade(body, 0.2));
  const hy = eating ? 6 : 0;
  px(c, 9, hy, 5, 5, "#06040a"); px(c, 10, hy + 1, 3, 3, body); px(c, 10, hy - 1, 1, 2, dark); px(c, 12, hy - 1, 1, 2, dark); px(c, 12, hy + 2, 1, 1, "#06040a"); px(c, 11, hy + 4, 1, 2, dark);
  px(c, 0, 3, 2, 2, body);
  px(c, 3, 9, 1, 3 - fl, dark); px(c, 5, 9, 1, 2 + fl, dark); px(c, 8, 9, 1, 3 - fl, dark); px(c, 10, 9, 1, 2 + fl, dark);
  c.restore();
}
