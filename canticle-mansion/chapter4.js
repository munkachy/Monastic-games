"use strict";
// Canticle Mansion, Chapter IV: "My sister, my spouse, is a garden enclosed."
// Mount Galaad and its flocks of goats; the sheep come up from the washing;
// the scarlet lace; the tower of David hung with a thousand bucklers; the two
// young roes among the lilies, the mountain of myrrh and the hill of
// frankincense; the dens of the lions and the mountains of the leopards; the
// dropping honeycomb; and the garden enclosed, where the guardian angel waits
// and the north wind and the south wind blow.

CHAPTERS[3] = { start: "c4_galaad", title: "A Garden Enclosed" };
const room4 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 4 }, def); };

// ---- 1. Mount Galaad -------------------------------------------------------------------------------------
{
  const g = G(75, 18).floor(16, 0, 9).floor(14, 10, 17).floor(12, 18, 25).floor(10, 26, 33).floor(8, 34, 41).floor(10, 42, 49).floor(12, 50, 57).floor(14, 58, 74).door(74, 10, 13, "2");
  g.set(37, 7, "l").set(22, 4, "v").set(54, 4, "v");
  room4("c4_galaad", {
    name: "Mount Galaad", song: "mountain", wall: "none", sky: "day", tiles: { 1: "earth" }, dust: "#8a7a50", start: [2, 15],
    map: g.rows(), doors: { 2: { to: "c4_washing", door: "1" } },
    texts: [
      { v: 1, part: [0, 20], style: "sky", x: 40, y: 16, w: 420, size: 17, color: "rgba(255,255,255,0.85)" },
      { v: 1, part: [20, 99], style: "sky", x: 640, y: 26, w: 420, size: 17, color: "rgba(255,255,255,0.85)" },
    ],
    back(c, Wd, t) {
      // Mount Galaad far off, and its flocks of goats streaming down the slope.
      const slope = (x) => 70 + (1200 - x) * 0.075;
      c.fillStyle = "#6a8a5a"; c.beginPath(); c.moveTo(-20, 260); for (let x = -20; x <= 1220; x += 40) c.lineTo(x, slope(x) + 12); c.lineTo(1220, 260); c.fill();
      c.fillStyle = "#7a9a6a"; c.beginPath(); c.moveTo(-20, 260); for (let x = -20; x <= 1220; x += 40) c.lineTo(x, slope(x) + 20 + Math.sin(x / 90) * 4); c.lineTo(1220, 260); c.fill();
      for (let i = 0; i < 18; i++) { const u = ((t * 0.04 + i * 0.13) % 1), x = 1200 - u * 1260 + (i % 3) * 14; goat(c, x, slope(x) + (i % 3) * 3, -1, t + i, ["#2a2228", "#4a3a30", "#e8e0d0"][i % 3]); }
      // Doves wheeling: "thy eyes are doves' eyes".
      for (let i = 0; i < 4; i++) { const a = t * 0.6 + i * 1.6; SCENE.dove(c, 300 + Math.cos(a) * 160 + i * 200, 70 + Math.sin(a * 2) * 14, t, { ph: i, face: Math.sin(a) < 0 ? 1 : -1 }); }
    },
  });
}

// ---- 2. Come Up from the Washing -----------------------------------------------------------------------------
// Across the river on the backs of the sheep, coming up shorn from the washing.
{
  const g = G(75, 14).floor(12, 0, 13).floor(12, 61, 74).door(0, 8, 11, "1").door(74, 8, 11, "2");
  const flock = (x0, dx, ph) => ({ x: x0, y: 11.5, w: 3, h: 8, path: [dx, 0], period: 6, t: ph,
    draw(c, mv, t) { const dir = mv.dx >= 0 ? 1 : -1; sheep(c, mv.x + 12, mv.y + 8, t, { face: dir, wet: true }); sheep(c, mv.x + 34, mv.y + 8, t + 0.3, { face: dir, wet: true }); for (let i = 0; i < 3; i++) px(c, mv.x + i * 16 + ((t * 30) % 16), mv.y + 10, 6, 1, "#ffffff"); } });
  room4("c4_washing", {
    name: "Come Up from the Washing", song: "sea", wall: "none", sky: "day", tiles: { 1: "earth" }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c4_galaad", door: "2" }, 2: { to: "c4_scarlet", door: "1" } },
    movers: [flock(14, 14, 0), flock(29, 14, 3), flock(44, 13, 0)],
    texts: [{ v: 2, style: "sky", x: 260, y: 20, w: 620, size: 17, color: "rgba(255,255,255,0.85)" }],
    update() { hintOnce("sheep", "Ride the sheep across, stepping from one pair to the next.", Game.monk.x > 8 * T); },
    paint(c) { px(c, 224, 196, 752, 28, "#3a7ad0"); for (let i = 0; i < 80; i++) px(c, 224 + hash(i, 3) * 752, 198 + hash(i, 4) * 20, 5, 1, "#a8d4ff"); for (let i = 0; i < 6; i++) sheep(c, 1000 + i * 26, 192, 0, { face: 1 }); },
  });
}

// ---- 3. The Scarlet Lace -------------------------------------------------------------------------------------
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.climb(12, 4, 25).ledge(14, 18, 18, "b").ledge(5, 10, 12, "b").ledge(13, 23, 5, "b").set(16, 17, "h").set(7, 11, "l").set(18, 10, "e");
  room4("c4_scarlet", {
    name: "The Scarlet Lace", song: "shield", wall: "mansion", paper: "#3a1a1a", pillar: "#7a3a2a", sky: "none", tiles: { 1: "red", 2: "vine" }, legend: { b: ONEWAY }, dark: 0.25,
    climb: { kind: "scarlet" },
    map: g.rows(), doors: { 1: { to: "c4_washing", door: "2" }, 2: { to: "c4_tower", door: "1" } },
    decor: [{ k: "banner", x: 20, y: 300, w: 140, h: 56, c: "#8a1a2a" }],
    texts: [
      { v: 3, part: [0, 11], style: "embroidered", x: 28, y: 310, w: 124, size: 9, color: "#ffd0d8" },
      { v: 3, part: [11, 99], style: "painted", x: 236, y: 230, w: 130, size: 9, color: "#3a1410", panel: "board", panelColor: "#e8b8a0" },
    ],
    paint(c) {
      // A pomegranate tree in the corner, its fruit split to show the seeds.
      px(c, 330, 300, 10, 116, "#5a3a20"); c.fillStyle = "#2a5a2a"; c.beginPath(); c.arc(335, 290, 46, 0, 7); c.fill();
      for (let i = 0; i < 10; i++) { const x = 300 + hash(i, 1) * 70, y = 260 + hash(i, 2) * 50; c.fillStyle = "#b8202e"; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); px(c, x - 2, y - 1, 4, 3, "#ffb0b8"); }
    },
  });
}

// ---- 4. The Tower of David ---------------------------------------------------------------------------------------
// Up the inside of the tower, from buckler to buckler.
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.ledge(10, 14, 23, "s").ledge(16, 20, 20, "s").ledge(10, 14, 17, "s").ledge(4, 8, 14, "s").ledge(10, 14, 11, "s").ledge(16, 20, 8, "s").ledge(18, 23, 5, "s").set(6, 13, "l").set(5, 6, "b");
  room4("c4_tower", {
    name: "The Tower of David", song: "foes", wall: "cellar", sky: "none", tiles: { 1: "stone", 2: "gold" }, legend: { s: ONEWAY }, dark: 0.45,
    map: g.rows(), doors: { 1: { to: "c4_scarlet", door: "2" }, 2: { to: "c4_myrrh", door: "1" } },
    lights: [{ x: 200, y: 360, r: 120, flicker: 1 }, { x: 200, y: 160, r: 120, flicker: 1 }, { x: 330, y: 50, r: 90, c: "rgba(255,240,200,0.5)" }],
    texts: [{ v: 4, style: "carved", x: 48, y: 104, w: 140, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#a89888" }],
    paint(c) {
      // A thousand bucklers hung on the walls, every one a little different.
      for (let i = 0; i < 70; i++) { const x = 30 + hash(i, 5) * 340, y = 30 + hash(i, 6) * 360, r = 6 + hash(i, 7) * 4; c.fillStyle = "#06040a"; c.beginPath(); c.arc(x, y, r + 1, 0, 7); c.fill(); c.fillStyle = ["#a8b0bc", "#c8962a", "#8a6a4a", "#b8322a"][i % 4]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); px(c, x - 1, y - 1, 2, 2, "#ffffff"); }
    },
  });
}

// ---- 5. The Mountain of Myrrh and the Hill of Frankincense -----------------------------------------------------------
{
  const g = G(75, 18).floor(16, 0, 24).door(0, 12, 15, "1").door(74, 12, 15, "2");
  g.fill(25, 14, 29, 17).fill(30, 12, 33, 17).fill(34, 10, 37, 17).fill(38, 8, 42, 17).fill(43, 10, 45, 17).fill(46, 9, 52, 17).fill(53, 7, 56, 17).fill(57, 10, 60, 17).floor(16, 61, 74);
  g.set(40, 7, "l").set(30, 5, "e").set(50, 4, "e");
  room4("c4_myrrh", {
    name: "The Mountain of Myrrh", song: "heaven", wall: "none", sky: "day", tiles: { 1: "rock" }, dust: "#a09070",
    zones: [{ x0: 0, x1: 24, y0: 0, y1: 17, 1: "earth" }, { x0: 46, x1: 60, y0: 0, y1: 17, 1: "marble" }, { x0: 61, x1: 74, y0: 0, y1: 17, 1: "earth" }],
    map: g.rows(), doors: { 1: { to: "c4_tower", door: "2" }, 2: { to: "c4_lions", door: "1" } },
    updrafts: [{ x: 49, y: 2, w: 2, h: 7, force: 1800, max: 140 }],
    texts: [
      { v: 5, style: "sky", x: 30, y: 24, w: 340, size: 16, color: "rgba(255,255,255,0.85)" },
      { v: 6, style: "kindle", x: 420, y: 20, w: 300, size: 11, reach: 260 },
      { v: 7, style: "gilded", x: 800, y: 52, w: 150, size: 9, panel: "plaque", panelColor: "#f4f0e8" },
    ],
    update(Wd) { if (Math.random() < 0.5) Wd.parts.push({ x: 49 * T + Math.random() * 32, y: 9 * T, vx: (Math.random() - 0.5) * 10, vy: -50, g: -10, life: 2, c: "#f4f4f8", s: 2 }); },
    paint(c) {
      for (let i = 0; i < 40; i++) SCENE.lily(c, 10 + hash(i, 2) * 380, 256, 0);
      for (let i = 0; i < 20; i++) { const x = 410 + hash(i, 3) * 320; px(c, x, 150 + hash(i, 4) * 60, 6, 4, "#5a6a3a"); }
      px(c, 780, 132, 30, 12, "#c8b8a0"); px(c, 784, 120, 22, 12, "#e8dcc8");
    },
    back(c, Wd, t) { roe(c, 200 + Math.sin(t * 0.7) * 30, 254, t, { face: 1 }); roe(c, 230 + Math.sin(t * 0.7) * 30, 254, t + 0.4, { face: 1, col: "#c8945a" }); },
  });
}

// ---- 6. From the Dens of the Lions --------------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(12, 9, 18, 11).fill(30, 8, 36, 11).fill(48, 9, 54, 11).ledge(22, 26, 7, "r").ledge(40, 44, 6, "r").ledge(58, 62, 7, "r").set(42, 5, "l");
  g.set(24, 11, "n").set(44, 11, "n").set(32, 7, "k").set(60, 11, "k");
  room4("c4_lions", {
    name: "The Dens of the Lions", song: "foes", wall: "none", sky: "sunset", tiles: { 1: "rock", 2: "stone" }, legend: { r: ONEWAY }, dust: "#a09070",
    map: g.rows(), doors: { 1: { to: "c4_myrrh", door: "2" }, 2: { to: "c4_honey", door: "1" } },
    texts: [
      { v: 8, part: [0, 9], style: "sky", x: 60, y: 22, w: 400, size: 17, color: "rgba(255,240,230,0.9)" },
      { v: 8, part: [9, 99], style: "carved", x: 700, y: 30, w: 220, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#a89070" },
    ],
    paint(c) {
      // The dens: dark mouths in the hills. Signs for the three peaks.
      for (const x of [340, 640, 920]) { c.fillStyle = "#1a1410"; c.beginPath(); c.ellipse(x, 186, 26, 18, 0, Math.PI, 0); c.fill(); }
      c.font = "8px " + FONT.carved; c.fillStyle = "#3a2410";
      for (const [x, n] of [[210, "AMANA"], [520, "SANIR"], [800, "HERMON"]]) { px(c, x, 150, 44, 12, "#c8a070"); px(c, x + 20, 162, 3, 30, "#6a4a2a"); c.fillText(n, x + 4, 158); }
    },
  });
}

// ---- 7. A Dropping Honeycomb --------------------------------------------------------------------------------------------
{
  const g = G(50, 20).walls().floor(18).door(0, 15, 17, "1").door(49, 15, 17, "2");
  g.fill(10, 15, 14, 17).ledge(17, 22, 12, "c").ledge(26, 31, 9, "c").ledge(34, 39, 12, "c").fill(40, 15, 44, 17).set(28, 8, "l");
  g.set(12, 6, "e").set(24, 5, "e").set(36, 6, "e").set(44, 10, "e");
  room4("c4_honey", {
    name: "A Dropping Honeycomb", song: "festival", wall: "cave", sky: "none", tiles: { 1: "gold", 2: "gold" }, legend: { c: ONEWAY }, dark: 0.45,
    map: g.rows(), doors: { 1: { to: "c4_lions", door: "2" }, 2: { to: "c4_garden", door: "1" } },
    lights: [{ x: 200, y: 160, r: 140, c: "rgba(255,200,80,0.4)" }, { x: 560, y: 160, r: 140, c: "rgba(255,200,80,0.4)" }],
    texts: [
      { v: 9, style: "painted", x: 30, y: 50, w: 150, size: 8.5, color: "#3a2000", panel: "board", panelColor: "#f0c050" },
      { v: 10, style: "painted", x: 300, y: 30, w: 170, size: 8.5, color: "#3a2000", panel: "board", panelColor: "#f0c050" },
      { v: 11, style: "painted", x: 600, y: 60, w: 170, size: 8.5, color: "#3a2000", panel: "board", panelColor: "#f0c050" },
    ],
    update(Wd) { if (Math.random() < 0.1) Wd.parts.push({ x: 40 + Math.random() * 720, y: 16, vx: 0, vy: 10, g: 300, life: 1.1, c: "#ffb020", s: 2 }); },
    paint(c) {
      // Honeycomb over all the walls.
      for (let y = 0; y < 320; y += 12) for (let x = (y / 12) % 2 ? 7 : 0; x < 800; x += 14) { c.strokeStyle = "#8a5a10"; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } c.closePath(); c.stroke(); if (hash(x, y) > 0.6) { c.fillStyle = "#c8861a"; c.fill(); } }
    },
  });
}

// ---- 8. A Garden Enclosed --------------------------------------------------------------------------------------------------
// Over the garden wall by its vine; the guardian angel waits beside the sealed
// fountain; when the angel comes, the fountain is unsealed and its water lifts
// the monk to the high terrace, where the north wind and the south wind blow.
{
  const g = G(75, 18).floor(16).door(0, 12, 15, "1").door(74, 2, 5, "2");
  g.fill(8, 4, 9, 15).climb(7, 3, 15).fill(18, 15, 21, 15).fill(38, 15, 41, 15).fill(50, 15, 53, 15).set(26, 15, "P").set(45, 14, "l");
  g.fill(34, 6, 73, 7).clear(30, 6, 33, 7);
  room4("c4_garden", {
    name: "A Garden Enclosed", song: "heaven", wall: "none", sky: "day", tiles: { 1: "earth", 2: "stone" }, power: "angel", dust: "#8a7a50",
    zones: [{ x0: 8, x1: 9, y0: 0, y1: 15, 1: "stone" }, { x0: 34, x1: 73, y0: 6, y1: 7, 1: "marble" }],
    climb: { kind: "vine" },
    map: g.rows(), doors: { 1: { to: "c4_honey", door: "2" }, 2: { to: "END" } },
    updrafts: [],
    winds: [{ x: 40, y: 0, w: 14, h: 6, push: -60, gust: 1.1 }, { x: 56, y: 0, w: 14, h: 6, push: 60, gust: 1.3 }],
    texts: [
      { v: 12, style: "gilded", x: 2, y: 4, w: 230, size: 10 },
      { v: 13, part: [0, 13], style: "painted", x: 270, y: 150, w: 120, size: 8, color: "#2a1a10", panel: "board", panelColor: "#d8b880" },
      { v: 13, part: [13, 99], style: "label", x: 300, y: 206, w: 60, size: 7, color: "#2a1a10", panel: "board", panelColor: "#d8b880" },
      { v: 14, part: [0, 7], style: "label", x: 584, y: 204, w: 70, size: 7, color: "#2a1a10", panel: "board", panelColor: "#d8b880" },
      { v: 14, part: [7, 13], style: "label", x: 720, y: 206, w: 80, size: 7, color: "#2a1a10", panel: "board", panelColor: "#d8b880" },
      { v: 14, part: [13, 99], style: "label", x: 820, y: 206, w: 90, size: 7, color: "#2a1a10", panel: "board", panelColor: "#d8b880" },
      { v: 15, style: "painted", x: 444, y: 138, w: 160, size: 8.5, color: "#1a2a4a", panel: "parchment" },
      { v: 16, style: "sky", x: 700, y: 14, w: 460, size: 15, color: "rgba(255,255,255,0.9)" },
    ],
    update(Wd) {
      // The fountain sealed until the angel comes.
      this.updrafts = save.powers.angel ? [{ x: 30, y: 3, w: 4, h: 13, force: 2400, max: 190 }] : [];
      if (save.powers.angel && Math.random() < 0.8) Wd.parts.push({ x: 30 * T + Math.random() * 64, y: 15.5 * T, vx: (Math.random() - 0.5) * 30, vy: -150 - Math.random() * 80, g: 120, life: 1.4, c: Math.random() < 0.5 ? "#a8d4ff" : "#ffffff", s: 2 });
      // The spices, carried on the winds.
      if (Math.random() < 0.5) Wd.parts.push({ x: 40 * T + Math.random() * 30 * T, y: Math.random() * 6 * T, vx: (Math.random() < 0.5 ? -1 : 1) * 80, vy: 0, g: 0, life: 1.5, c: ["#c86a2a", "#e8b030", "#7a3a1a"][Math.floor(Math.random() * 3)], s: 1 });
      hintOnce("fountain", "A fountain sealed up. Who will unseal it?", Game.monk.x > 27 * T && !save.powers.angel);
    },
    paint(c) {
      // Beds of spices; the fountain with its stone lid; trees of Libanus.
      for (const x of [288, 608, 800]) { px(c, x, 240, 64, 8, "#5a3a20"); for (let i = 0; i < 10; i++) SCENE.flowers(c, x + i * 6, 240, 2, 0, { cols: ["#ff9a5a", "#e8b030", "#c8a0ff"] }); }
      px(c, 476, 236, 72, 20, "#a8a0a8"); px(c, 476, 236, 72, 3, "#d8d0d8");
      for (const x of [140, 1000, 1120]) SCENE.cypress(c, x, 256, 70);
      for (const x of [600, 900]) SCENE.palm(c, x, 96, 50, 0);
    },
    back(c, Wd, t) {
      if (save.powers.angel) { c.fillStyle = "rgba(170,210,255,0.55)"; c.fillRect(30 * T, 4 * T, 64, 12 * T); }
      else { px(c, 480, 228, 64, 8, "#8a8090"); px(c, 504, 222, 16, 6, "#c8962a"); }
    },
  });
}
