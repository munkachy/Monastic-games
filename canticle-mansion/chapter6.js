"use strict";
// Canticle Mansion, Chapter VI: "Terrible as an army set in array."
// The bed of aromatical spices; the army in its ranks and banners; the flock
// from the washing; the threescore queens and the one dove; the morning
// rising, fair as the moon, bright as the sun; the garden of nuts; and the
// chariots of Aminadab, with the cry: Return, return, O Sulamitess.

CHAPTERS[5] = { start: "c6_spices", title: "Terrible as an Army" };
const room6 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 6 }, def); };

// ---- 1. Gone Down into His Garden ----------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(74, 8, 11, "2");
  g.fill(14, 11, 20, 11).fill(30, 10, 34, 11).fill(48, 11, 54, 11).ledge(38, 43, 7, "b").set(40, 6, "l").set(26, 3, "e").set(58, 4, "e");
  room6("c6_spices", {
    name: "Gone Down into His Garden", song: "river", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { b: ONEWAY }, dust: "#8a7a50", start: [2, 11],
    map: g.rows(), doors: { 2: { to: "c6_army", door: "1" } },
    texts: [
      { v: 1, style: "flowers", x: 60, y: 24, w: 420, size: 13 },
      { v: 2, style: "kindle", x: 700, y: 34, w: 360, size: 12, reach: 260 },
    ],
    paint(c) { for (let i = 0; i < 12; i++) { const x = 30 + i * 96; px(c, x, 186, 70, 6, "#5a3a20"); SCENE.flowers(c, x + 2, 186, 10, 0, { w: 66, cols: ["#c8602a", "#e8b030", "#c8a0ff", "#ffffff"] }); } for (let i = 0; i < 30; i++) SCENE.lily(c, 600 + hash(i, 6) * 560, 192, 0); },
  });
}

// ---- 2. Terrible as an Army Set in Array -------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(12, 9, 16, 11).fill(26, 8, 30, 11).fill(42, 9, 46, 11).fill(58, 10, 62, 11).ledge(34, 38, 6, "b").set(36, 5, "l");
  g.set(20, 11, "w").set(50, 11, "w").set(66, 11, "w");
  room6("c6_army", {
    name: "Terrible as an Army", song: "foes", wall: "none", sky: "sunset", tiles: { 1: "earth", 2: "wood" }, legend: { b: ONEWAY }, dust: "#a08060",
    map: g.rows(), doors: { 1: { to: "c6_spices", door: "2" }, 2: { to: "c6_washing", door: "1" } },
    decor: [{ k: "banner", x: 160, y: 24, w: 230, h: 44, c: "#1e3a7a" }],
    texts: [
      { v: 3, style: "gilded", x: 170, y: 32, w: 210, size: 9 },
      { v: 4, part: [0, 13], style: "painted", x: 520, y: 40, w: 150, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 4, part: [13, 99], style: "sky", x: 800, y: 20, w: 330, size: 15, color: "rgba(255,240,230,0.9)" },
    ],
    back(c, Wd, t) {
      // The army in its ranks on the hills, banners lifted; goats on Galaad beyond.
      for (let row = 0; row < 3; row++) for (let i = 0; i < 40; i++) { const x = i * 30 + row * 15 + Math.sin(t + i) * 0.5, y = 132 - row * 14; px(c, x, y, 5, 10, ["#3a3a52", "#4a3a3a", "#3a4a3a"][row]); px(c, x + 1, y - 4, 3, 4, "#c8a080"); px(c, x + 5, y - 10, 1, 14, "#8a8a92"); px(c, x + 4, y - 11, 3, 2, "#c8ccd4"); if (i % 8 === 0) { px(c, x + 5, y - 26, 1, 16, "#6a4a2a"); px(c, x + 6, y - 26, 10, 7, ["#c83a3a", "#e8b94a", "#3a5aa8"][row]); } }
      for (let i = 0; i < 10; i++) goat(c, 900 + i * 22 + Math.sin(t * 0.4 + i) * 10, 96 + (i % 3) * 5, -1, t + i, ["#2a2228", "#4a3a30"][i % 2]);
    },
  });
}

// ---- 3. A Flock of Sheep from the Washing ---------------------------------------------------------------------
{
  const g = G(50, 14).floor(12, 0, 15).floor(12, 34, 49).door(0, 8, 11, "1").door(49, 8, 11, "2");
  g.ledge(40, 44, 8, "b").set(42, 7, "l");
  room6("c6_washing", {
    name: "A Flock from the Washing", song: "sea", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { b: ONEWAY }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c6_army", door: "2" }, 2: { to: "c6_queens", door: "1" } },
    movers: [{ x: 16, y: 11.5, w: 3, h: 8, path: [15, 0], period: 7, t: 0, draw(c, mv, t) { const dir = mv.dx >= 0 ? 1 : -1; sheep(c, mv.x + 12, mv.y + 8, t, { face: dir, wet: true }); sheep(c, mv.x + 34, mv.y + 8, t + 0.3, { face: dir, wet: true }); } }],
    texts: [
      { v: 5, style: "sky", x: 40, y: 20, w: 380, size: 15, color: "rgba(255,255,255,0.9)" },
      { v: 6, style: "painted", x: 600, y: 60, w: 150, size: 9, color: "#3a1410", panel: "board", panelColor: "#e8b8a0" },
    ],
    paint(c) {
      px(c, 256, 196, 288, 28, "#3a7ad0"); for (let i = 0; i < 40; i++) px(c, 256 + hash(i, 3) * 288, 198 + hash(i, 4) * 20, 5, 1, "#a8d4ff");
      px(c, 700, 120, 8, 72, "#5a3a20"); c.fillStyle = "#2a5a2a"; c.beginPath(); c.arc(704, 110, 34, 0, 7); c.fill();
      for (let i = 0; i < 7; i++) { const x = 684 + hash(i, 1) * 40, y = 96 + hash(i, 2) * 30; c.fillStyle = "#b8202e"; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); px(c, x - 1, y - 1, 3, 2, "#ffb0b8"); }
    },
  });
}

// ---- 4. Threescore Queens --------------------------------------------------------------------------------------
// Balconies full of queens; a dove flies ahead to show the way up and across.
{
  const g = G(75, 18).walls().floor(16).door(0, 13, 15, "1").door(74, 3, 5, "2");
  for (const [a, b, r] of [[6, 11, 13], [14, 19, 10], [22, 27, 13], [30, 35, 10], [38, 43, 7], [46, 51, 10], [54, 59, 7], [62, 67, 4], [68, 73, 6]]) g.ledge(a, b, r, "g");
  g.set(32, 9, "l");
  const route = [[8, 12], [16, 9], [24, 12], [32, 9], [40, 6], [48, 9], [56, 6], [64, 3], [71, 5]];
  room6("c6_queens", {
    name: "Threescore Queens", song: "kings", wall: "palace", paper: "#2a1a3a", sky: "none", tiles: { 1: "marble", 2: "gold" }, legend: { g: ONEWAY }, dark: 0.25,
    map: g.rows(), doors: { 1: { to: "c6_washing", door: "2" }, 2: { to: "c6_morning", door: "1" } },
    texts: [
      { v: 7, style: "painted", x: 60, y: 30, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 8, part: [0, 25], style: "embroidered", x: 430, y: 24, w: 200, size: 9, color: "#ffe08a" },
      { v: 8, part: [25, 99], style: "painted", x: 881, y: 138, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
    ],
    decor: [{ k: "banner", x: 420, y: 14, w: 220, h: 66, c: "#5a1a4a" }],
    back(c, Wd, t) {
      // Queens on the balconies, crowned, in every colour.
      for (let i = 0; i < 24; i++) { const x = 20 + i * 48, y = 40 + (i % 3) * 50; figure(c, x, y, { robe: ["#7a1f2b", "#2a3a7a", "#2a6a3a", "#7a5a1a", "#5a2a6a"][i % 5], skin: "#e0b090", crown: true, h: 20, w: 8, still: true, face: Game.monk.x < x ? -1 : 1 }, t); }
      // The one dove, going on before the monk to the next place to land.
      const m = Game.monk; let k = 0; while (k < route.length - 1 && route[k][0] * T < m.x + 8) k++;
      const [dx, dy] = route[k]; const bx = dx * T, by = dy * T - 20 + Math.sin(t * 3) * 3;
      SCENE.dove(c, bx, by, t, { face: bx > m.x ? 1 : -1, s: 1.2 });
    },
    glow(c, Wd, t, glow) { const m = Game.monk; let k = 0; while (k < route.length - 1 && route[k][0] * T < m.x + 8) k++; glow(route[k][0] * T, route[k][1] * T - 20, 26, "rgba(255,255,240,0.6)", 0.7); },
  });
}

// ---- 5. As the Morning Rising ------------------------------------------------------------------------------------
// Up through the clouds: the dawn behind, then the moon, then the sun.
{
  const g = G(75, 18).floor(16, 0, 10).door(0, 12, 15, "1").door(74, 1, 4, "2");
  for (const [a, b, r] of [[11, 15, 13], [18, 22, 11], [25, 29, 13], [31, 35, 10], [38, 42, 8], [45, 49, 10], [52, 56, 7], [59, 63, 5], [66, 73, 5]]) g.ledge(a, b, r, "c");
  g.set(54, 6, "l");
  room6("c6_morning", {
    name: "As the Morning Rising", song: "heaven", wall: "none", sky: "dawn", tiles: { 1: "earth", 2: "cloud" }, legend: { c: ONEWAY }, dust: "#c8c0e0",
    map: g.rows(), doors: { 1: { to: "c6_queens", door: "2" }, 2: { to: "c6_nuts", door: "1" } },
    texts: [
      { v: 9, part: [0, 10], style: "sky", x: 40, y: 24, w: 300, size: 16, color: "rgba(255,240,230,0.9)" },
      { v: 9, part: [10, 14], style: "sky", x: 420, y: 18, w: 200, size: 16, color: "rgba(230,235,255,0.9)" },
      { v: 9, part: [14, 18], style: "sky", x: 700, y: 26, w: 200, size: 16, color: "rgba(255,250,200,0.95)" },
      { v: 9, part: [18, 99], style: "sky", x: 960, y: 30, w: 220, size: 16, color: "rgba(255,240,230,0.9)" },
    ],
    back(c, Wd, t) {
      // As the monk climbs, the sky passes from dawn through moonlight to full sun.
      const k = clamp(Game.monk.x / (70 * T), 0, 1);
      if (k > 0.3 && k < 0.7) { c.fillStyle = "rgba(20,24,60," + (0.5 * Math.sin((k - 0.3) / 0.4 * Math.PI)) + ")"; c.fillRect(Wd.camX, Wd.camY, W, H); }
      if (k > 0.55) { c.fillStyle = "rgba(120,180,255," + ((k - 0.55) * 1.2) + ")"; c.fillRect(Wd.camX, Wd.camY, W, H); }
      const moonA = clamp(1 - Math.abs(k - 0.45) * 4, 0, 1), sunA = clamp((k - 0.6) * 3, 0, 1);
      c.globalAlpha = moonA; c.fillStyle = "#f4f0e0"; c.beginPath(); c.arc(Wd.camX + 300, Wd.camY + 50, 20, 0, 7); c.fill(); c.globalAlpha = 1;
      c.globalAlpha = sunA; c.fillStyle = "#fff4c8"; c.beginPath(); c.arc(Wd.camX + 320, Wd.camY + 46, 26, 0, 7); c.fill(); c.globalAlpha = 1;
    },
  });
}

// ---- 6. The Garden of Nuts ---------------------------------------------------------------------------------------
// Walnuts fall from the boughs: watch above you.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(18, 10, 22, 11).fill(40, 9, 44, 11).ledge(28, 33, 7, "b").ledge(52, 57, 7, "b").set(55, 6, "l");
  room6("c6_nuts", {
    name: "The Garden of Nuts", song: "river", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { b: ONEWAY }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c6_morning", door: "2" }, 2: { to: "c6_aminadab", door: "1" } },
    texts: [{ v: 10, style: "painted", x: 620, y: 40, w: 200, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" }],
    init() { this.nuts = []; },
    update(Wd, dt) {
      // A walnut drops now and then from the trees over the path.
      for (const tx of [10, 26, 36, 50, 64]) if (Math.random() < dt * 0.5) this.nuts.push({ x: tx * T + Math.random() * 40 - 20, y: 40, vy: 0 });
      const m = Game.monk;
      for (const n of this.nuts) { n.vy += 500 * dt; n.y += n.vy * dt; if (!n.hit && overlap({ x: n.x, y: n.y, w: 5, h: 5 }, m)) { n.hit = true; hurtMonk(m, n.x); } }
      this.nuts = this.nuts.filter((n) => n.y < 192 && !n.hit);
    },
    paint(c) { for (const x of [160, 416, 576, 800, 1024]) { px(c, x - 4, 50, 10, 142, "#5a4030"); c.fillStyle = "#2a5a2a"; c.beginPath(); c.arc(x, 44, 46, 0, 7); c.fill(); c.fillStyle = "#3a7a3a"; c.beginPath(); c.arc(x - 14, 34, 26, 0, 7); c.fill(); } SCENE.vines(c, 860, 150, 120, 0); },
    front(c, Wd, t) { for (const n of this.nuts || []) { px(c, n.x, n.y, 5, 5, "#6a4a2a"); px(c, n.x + 1, n.y + 1, 2, 2, "#8a6a4a"); } },
  });
}

// ---- 7. The Chariots of Aminadab -----------------------------------------------------------------------------------
// The chariot waits at the start; past it the chasms are too wide for any jump,
// and only the dash will carry the monk over. Then: Return, return.
{
  const g = G(75, 14).floor(12, 0, 12).floor(12, 22, 31).floor(12, 41, 50).floor(12, 60, 74).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.set(6, 11, "P").set(46, 10, "l");
  room6("c6_aminadab", {
    name: "The Chariots of Aminadab", song: "mountain", wall: "none", sky: "sunset", tiles: { 1: "rock" }, power: "chariot", dust: "#a09070",
    map: g.rows(), doors: { 1: { to: "c6_nuts", door: "2" }, 2: { to: "END" } },
    texts: [
      { v: 11, style: "sky", x: 200, y: 24, w: 320, size: 17, color: "rgba(255,240,230,0.9)" },
      { v: 12, style: "sky", x: 640, y: 16, w: 440, size: 16, color: "rgba(255,240,230,0.9)" },
      { v: 12, part: [0, 2], style: "sky", x: 1000, y: 96, w: 100, size: 12, color: "rgba(255,240,230,0.45)", reach: 300 },
    ],
    update() { hintOnce("dash", "The round button dashes the way you face. Jump, then dash, to cross the chasms.", save.powers.chariot); },
    back(c, Wd, t) {
      // Chariots racing along the far ridge.
      for (let i = 0; i < 3; i++) { const x = ((t * 140 + i * 420) % 1500) - 150, y = 120 + i * 6; px(c, x, y, 26, 6, "#c8962a"); c.fillStyle = "#3a2410"; c.beginPath(); c.arc(x + 13, y + 8, 5, 0, 7); c.fill(); px(c, x + 28, y - 6, 14, 7, "#7a4a2a"); px(c, x + 38, y - 12, 4, 7, "#7a4a2a"); }
      // Return, return: echoes fading across the sky.
      c.font = "italic 10px " + FONT.sky; for (let i = 0; i < 4; i++) { c.fillStyle = "rgba(255,240,230," + (0.4 - i * 0.08) + ")"; c.fillText("Return, return", 1000 + i * 40, 110 + i * 16 + Math.sin(t + i) * 2); }
    },
  });
}
