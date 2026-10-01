"use strict";
// Canticle Mansion, Chapter II: "I am the flower of the field, and the lily of the valleys."
// The lily among thorns; the apple tree; the cellar of wine; the roes and the
// harts; leaping upon the mountains (the sandals of the roe); behind our wall,
// at the lattice; the winter past and the spring come; the clefts of the rock;
// the little foxes in the vines; and the shadows retiring at the break of day.

CHAPTERS[1] = { start: "c2_lilies", title: "The Lily among Thorns" };
const room2 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 2 }, def); };

// ---- 1. The Lily of the Valleys --------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(74, 8, 11, "2");
  g.fill(12, 11, 14, 11, "^").fill(15, 10, 16, 11).fill(17, 11, 19, 11, "^");
  g.fill(30, 11, 33, 11, "^").ledge(30, 33, 8, "v");
  g.fill(48, 11, 49, 11, "^").fill(50, 9, 50, 11).fill(51, 11, 52, 11, "^").set(50, 8, "l");
  g.set(40, 3, "v");
  room2("c2_lilies", {
    name: "The Lily of the Valleys", song: "river", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { v: ONEWAY }, thorn: "thorn", dust: "#8a7a50", start: [2, 11],
    map: g.rows(), doors: { 2: { to: "c2_apple", door: "1" } },
    texts: [
      { v: 1, style: "sky", x: 80, y: 18, w: 460, size: 18, color: "rgba(255,255,255,0.8)" },
      { v: 2, style: "kindle", x: 424, y: 60, w: 200, size: 11, reach: 220 },
    ],
    paint(c) {
      for (let i = 0; i < 60; i++) { const x = 20 + hash(i, 4) * 1150; if ((x > 185 && x < 320) || (x > 470 && x < 545) || (x > 760 && x < 850)) continue; SCENE.lily(c, x, 192, 0); }
      for (const x of [250, 500]) for (let i = 0; i < 3; i++) SCENE.lily(c, x + i * 6, 160, 0);
      SCENE.cypress(c, 620, 192, 60); SCENE.cypress(c, 980, 192, 70);
    },
  });
}

// ---- 2. As the Apple Tree ------------------------------------------------------------------------------
// One great apple tree among the trees of the wood, climbed branch by branch.
{
  const g = G(50, 28).walls(false).floor(26).door(0, 23, 25, "1").door(49, 2, 4, "2");
  g.fill(0, 0, 0, 22).fill(49, 5, 49, 25);
  g.ledge(14, 21, 23, "b").ledge(28, 34, 23, "b").ledge(18, 24, 20, "b").ledge(26, 33, 17, "b").ledge(16, 23, 14, "b").ledge(26, 34, 11, "b").ledge(20, 28, 8, "b").ledge(30, 38, 5, "b").ledge(39, 48, 5, "b");
  g.set(17, 13, "h").set(33, 4, "l").set(30, 9, "v").set(12, 6, "v");
  room2("c2_apple", {
    name: "As the Apple Tree", song: "heaven", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { b: ONEWAY }, dust: "#7a6a40",
    map: g.rows(), doors: { 1: { to: "c2_lilies", door: "2" }, 2: { to: "c2_cellar", door: "1" } },
    texts: [{ v: 3, style: "painted", x: 52, y: 132, w: 170, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" }],
    paint(c) {
      // The wood behind, and the tree itself: a broad trunk, boughs, leaves, apples.
      for (let i = 0; i < 9; i++) { const x = 30 + i * 90; px(c, x, 120, 10, 300, "#3a2a1a"); c.fillStyle = "#2a5a2a"; c.beginPath(); c.arc(x + 5, 110, 40, 0, 7); c.fill(); }
      px(c, 352, 60, 96, 360, "#5a3a20"); for (let y = 60; y < 420; y += 8) px(c, 356 + hash(y, 1) * 80, y, 10, 3, "#3a2410");
      c.fillStyle = "#2a6a2a"; for (const [x, y, r] of [[400, 60, 120], [260, 140, 80], [560, 120, 90], [400, 200, 70], [300, 260, 60], [520, 260, 60]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      c.fillStyle = "#3a8a3a"; for (const [x, y, r] of [[380, 40, 70], [250, 120, 40], [580, 100, 50]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      for (let i = 0; i < 70; i++) { const x = 170 + hash(i, 7) * 480, y = 20 + hash(i, 8) * 300; px(c, x, y, 4, 4, "#d8323a"); px(c, x + 1, y, 1, 1, "#ff8a8a"); }
    },
  });
}

// ---- 3. The Cellar of Wine -------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(8, 10, 10, 11).fill(14, 8, 16, 11).fill(22, 10, 24, 11).fill(30, 9, 33, 11).ledge(36, 41, 7).set(38, 6, "l");
  g.set(12, 2, "b").set(27, 2, "b").set(42, 3, "b");
  room2("c2_cellar", {
    name: "The Cellar of Wine", song: "alley", wall: "cellar", sky: "none", tiles: { 1: "cellar", 2: "shelf" }, dark: 0.5, dust: "#8a7060",
    zones: [{ x0: 8, x1: 10, y0: 8, y1: 11, 1: "wood" }, { x0: 14, x1: 16, y0: 8, y1: 11, 1: "wood" }, { x0: 22, x1: 24, y0: 8, y1: 11, 1: "wood" }, { x0: 30, x1: 33, y0: 8, y1: 11, 1: "wood" }],
    map: g.rows(), doors: { 1: { to: "c2_apple", door: "2" }, 2: { to: "c2_harts", door: "1" } },
    decor: [{ k: "banner", x: 72, y: 20, w: 200, h: 52, c: "#7a1f2b" }],
    lights: [{ x: 172, y: 50, r: 110, flicker: 1 }, { x: 480, y: 60, r: 120, flicker: 1 }, { x: 700, y: 60, r: 90, flicker: 1 }],
    texts: [
      { v: 4, style: "embroidered", x: 80, y: 28, w: 184, size: 10, color: "#ffe08a" },
      { v: 5, style: "flowers", x: 360, y: 28, w: 300, size: 15 },
    ],
    paint(c) {
      // Garlands of flowers and apples along the wall.
      for (let x = 320; x < 700; x += 4) { const y = 92 + Math.sin(x / 30) * 8; px(c, x, y, 3, 3, "#3a7a2e"); if (x % 16 === 0) px(c, x, y - 2, 4, 4, ["#ff7aa8", "#ffe08a", "#ffffff"][(x / 16) % 3]); if (x % 40 === 0) px(c, x, y + 4, 5, 5, "#d8323a"); }
    },
  });
}

// ---- 4. The Roes and the Harts --------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(14, 10, 22, 11).fill(17, 9, 19, 9).fill(36, 11, 44, 11).clear(52, 12, 55, 12).fill(52, 12, 55, 12, "~").fill(60, 10, 66, 11);
  room2("c2_harts", {
    name: "The Roes and the Harts", song: "river", wall: "none", sky: "day", tiles: { 1: "earth" }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c2_cellar", door: "2" }, 2: { to: "c2_mountains", door: "1" } },
    texts: [
      { v: 6, style: "sky", x: 60, y: 22, w: 400, size: 17, color: "rgba(255,255,255,0.8)" },
      { v: 7, style: "sky", x: 600, y: 14, w: 520, size: 15, color: "rgba(255,255,255,0.8)" },
    ],
    paint(c) { SCENE.cypress(c, 120, 192, 54); SCENE.cypress(c, 760, 192, 60); for (let i = 0; i < 14; i++) SCENE.flowers(c, 40 + i * 82, 190, 4, 0); },
    back(c, Wd, t) {
      // The roes and the harts, leaping across the field and back.
      for (let i = 0; i < 5; i++) {
        const period = 7 + i, u = ((t + i * 2.3) % period) / period, dir = Math.floor((t + i * 2.3) / period) % 2 ? -1 : 1;
        const x = dir > 0 ? -40 + u * 1300 : 1260 - u * 1300, hop = Math.abs(Math.sin(u * Math.PI * 9)) * 22;
        roe(c, x, 186 - hop - (i % 2) * 6, t + i, { face: dir, leap: hop > 4, hart: i % 2 === 1, col: i % 2 ? "#a86a2a" : "#c88a4a" });
      }
    },
  });
}

// ---- 5. Leaping upon the Mountains ------------------------------------------------------------------------------
// The sandals of the roe wait on the second peak; beyond it the chasms are too wide without them.
{
  const g = G(75, 18).floor(16, 0, 8).door(0, 12, 15, "1").door(74, 10, 13, "2");
  g.fill(9, 13, 12, 17).fill(15, 10, 18, 17).set(17, 9, "P").fill(25, 9, 28, 17).fill(35, 11, 39, 17).fill(42, 7, 45, 17).fill(53, 10, 57, 17).fill(58, 14, 74, 17);
  g.set(32, 4, "v").set(49, 3, "v");
  room2("c2_mountains", {
    name: "Leaping upon the Mountains", song: "mountain", wall: "none", sky: "day", tiles: { 1: "rock" }, power: "sandals", dust: "#8a8070",
    zones: [{ x0: 0, x1: 8, y0: 0, y1: 17, 1: "earth" }, { x0: 58, x1: 74, y0: 0, y1: 17, 1: "earth" }],
    map: g.rows(), doors: { 1: { to: "c2_harts", door: "2" }, 2: { to: "c2_lattice", door: "1" } },
    winds: [{ x: 40, y: 0, w: 8, h: 8, push: -30, gust: 1.3 }],
    texts: [{ v: 8, style: "sky", x: 300, y: 20, w: 520, size: 19, color: "rgba(255,255,255,0.85)" }],
    update() { hintOnce("double", "With the sandals, tap jump again in the air to leap higher still.", save.powers.sandals && Game.monk.x > 19 * T); },
    back(c, Wd, t) {
      // The beloved's own leaping: a hart bounding from peak to peak far off.
      const u = (t % 6) / 6, x = 150 + u * 900, y = 120 - Math.abs(Math.sin(u * Math.PI * 5)) * 50;
      c.globalAlpha = 0.55; roe(c, x, y, t, { hart: true, leap: true, s: 0.8, col: "#8a6a4a" }); c.globalAlpha = 1;
    },
  });
}

// ---- 6. Behind Our Wall ------------------------------------------------------------------------------------------
// A high garden wall with lattice windows: climb the lattice, over the top, and down.
{
  const g = G(50, 20).walls().floor(18).door(0, 15, 17, "1").door(49, 15, 17, "2");
  g.fill(22, 4, 27, 17).climb(21, 3, 17).ledge(14, 18, 13, "s").set(16, 12, "h");
  room2("c2_lattice", {
    name: "Behind Our Wall", song: "dream", wall: "mansion", paper: "#2a3a2a", pillar: "#6a7a5a", sky: "none", tiles: { 1: "stone", 2: "stone" }, legend: { s: ONEWAY }, dark: 0.2,
    climb: { kind: "vine" },
    map: g.rows(), doors: { 1: { to: "c2_mountains", door: "2" }, 2: { to: "c2_spring", door: "1" } },
    texts: [
      { v: 9, style: "painted", x: 40, y: 70, w: 200, size: 10, color: "#2a1a10", panel: "parchment" },
      { v: 10, style: "kindle", x: 470, y: 168, w: 280, size: 12, reach: 260 },
    ],
    paint(c) {
      for (let i = 0; i < 20; i++) SCENE.flowers(c, 460 + i * 16, 286, 2, 0);
    },
    front(c, Wd, t) {
      // Lattice windows set in the wall: the garden's green light through them, and
      // behind the upper one a shadow, someone standing there, looking through the lattices.
      for (const y of [110, 190]) {
        px(c, 366, y - 2, 68, 48, "#3a2e22"); px(c, 368, y, 64, 44, "#4a6a3a");
        for (let k = 0; k < 6; k++) px(c, 370 + k * 11, y + 30 + (k % 2) * 4, 6, 14 - (k % 2) * 4, "#6a9a4a");
        if (y === 110) { c.globalAlpha = 0.55 + Math.sin(t) * 0.1; figure(c, 394, y + 12, { robe: "#141a14", skin: "#141a14", h: 28, w: 12, still: true }, t); c.globalAlpha = 1; }
        for (let i = 0; i <= 64; i += 8) px(c, 368 + i, y, 2, 44, "#c8b088");
        for (let j = 0; j <= 44; j += 8) px(c, 368, y + j, 64, 2, "#c8b088");
      }
    },
  });
}

// ---- 7. The Winter Is Past -----------------------------------------------------------------------------------------
// It is raining at the start; the rain thins, the sky clears, the flowers come up as the monk goes on.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(12, 11, 15, 11).fill(26, 10, 29, 11).ledge(48, 54, 9, "f").ledge(51, 56, 6, "f").set(54, 5, "l").fill(62, 10, 64, 11);
  room2("c2_spring", {
    name: "The Winter Is Past", song: "festival", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { f: ONEWAY }, dust: "#7a6a40",
    map: g.rows(), doors: { 1: { to: "c2_lattice", door: "2" }, 2: { to: "c2_clefts", door: "1" } },
    texts: [
      { v: 11, style: "sky", x: 40, y: 22, w: 360, size: 18, color: "rgba(255,255,255,0.85)" },
      { v: 12, style: "flowers", x: 440, y: 22, w: 380, size: 14 },
      { v: 13, style: "painted", x: 865, y: 51, w: 180, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
    ],
    update(Wd) {
      const k = clamp(Game.monk.x / (40 * T), 0, 1);
      if (Math.random() > k) for (let i = 0; i < 3; i++) Wd.parts.push({ x: Wd.camX + Math.random() * W, y: Wd.camY - 4, vx: -20, vy: 260, g: 0, life: 0.9, c: "#bcd4f0", s: 1 });
    },
    back(c, Wd, t) {
      // Grey over the sky at first, clearing.
      const k = clamp(Game.monk.x / (40 * T), 0, 1);
      c.fillStyle = "rgba(90,96,110," + (0.6 * (1 - k)) + ")"; c.fillRect(Wd.camX, Wd.camY, W, H);
      // Flowers springing up along the ground behind the monk.
      for (let i = 0; i < 90; i++) { const x = 10 + i * 13; const grown = clamp((Game.monk.x - x + 60) / 60, 0, 1); if (grown <= 0) continue; const y = 192 - (x > 192 && x < 256 ? 16 : x > 416 && x < 480 ? 32 : x > 992 && x < 1040 ? 32 : 0); px(c, x, y - 5 * grown, 1, 5 * grown, "#3a7a2e"); px(c, x - 1, y - 6 * grown - 1, 3, 3, ["#ff7aa8", "#ffffff", "#ffe08a", "#c8a0ff"][i % 4]); }
      // The voice of the turtle: two turtledoves on the fig tree.
      SCENE.dove(c, 830, 104, t, { face: 1, rate: 0.5, col: "#d8c8b8" }); SCENE.dove(c, 852, 104, t, { face: -1, rate: 0.5, ph: 0.4, col: "#d8c8b8" });
    },
    paint(c) {
      // The fig tree with its green figs.
      px(c, 836, 110, 10, 82, "#6a5040"); c.fillStyle = "#3a7a2e"; c.beginPath(); c.arc(841, 100, 46, 0, 7); c.fill(); c.fillStyle = "#4a9a3a"; c.beginPath(); c.arc(826, 90, 26, 0, 7); c.fill();
      for (let i = 0; i < 16; i++) px(c, 805 + hash(i, 2) * 70, 70 + hash(i, 3) * 50, 4, 5, "#8ab040");
      SCENE.vines(c, 1060, 150, 100, 0);
    },
  });
}

// ---- 8. In the Clefts of the Rock -------------------------------------------------------------------------------------
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.ledge(12, 20, 23, "r").ledge(3, 9, 19, "r").ledge(12, 19, 15, "r").ledge(3, 9, 11, "r").ledge(11, 17, 7, "r").ledge(19, 23, 5, "r").set(5, 10, "l").set(18, 12, "b");
  room2("c2_clefts", {
    name: "In the Clefts of the Rock", song: "shield", wall: "cave", sky: "none", tiles: { 1: "rock", 2: "stone" }, legend: { r: ONEWAY }, dark: 0.35,
    map: g.rows(), doors: { 1: { to: "c2_spring", door: "2" }, 2: { to: "c2_foxes", door: "1" } },
    lights: [{ x: 200, y: 40, r: 140, c: "rgba(255,240,200,0.5)" }, { x: 100, y: 380, r: 90 }],
    texts: [{ v: 14, style: "carved", x: 178, y: 157, w: 168, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#9a8a7a" }],
    paint(c) {
      // Clefts in the rock, and a dove in each.
      for (const [x, y] of [[40, 270], [330, 200], [60, 140], [300, 90], [120, 60]]) { c.fillStyle = "#0e0a08"; c.beginPath(); c.ellipse(x, y, 16, 9, 0, 0, 7); c.fill(); }
    },
    back(c, Wd, t) { for (const [x, y, f] of [[40, 272, 1], [330, 202, -1], [60, 142, 1], [300, 92, -1], [120, 62, 1]]) SCENE.dove(c, x, y, t, { face: f, rate: 0.3, ph: x * 0.01 }); },
  });
}

// ---- 9. Catch Us the Little Foxes ----------------------------------------------------------------------------------------
// Foxes are spoiling the vines; the vineyard gate stays shut until every one is caught.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(16, 10, 22, 11).ledge(28, 34, 8, "v").fill(40, 10, 46, 11).ledge(52, 58, 8, "v");
  for (const x of [12, 25, 38, 50, 62]) g.set(x, 11, "f");
  room2("c2_foxes", {
    name: "Catch Us the Little Foxes", song: "foes", wall: "none", sky: "day", tiles: { 1: "vine", 2: "vine" }, legend: { v: ONEWAY }, dust: "#a08060",
    map: g.rows(), doors: { 1: { to: "c2_clefts", door: "2" }, 2: { to: "c2_dawn", door: "1" } },
    texts: [{ v: 15, style: "painted", x: 40, y: 92, w: 150, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" }],
    init(Wd) { Wd.movers.push(Gate(72, 8, 4, () => !Wd.foes.some((f) => f.alive && f.kind === "fox"), { lock: true })); },
    update(Wd) {
      const left = Wd.foes.filter((f) => f.alive && f.kind === "fox").length;
      hintOnce("foxes", "Five little foxes in the vines. Catch them all with holy water and the gate will open.", Game.monk.x > 6 * T);
      if (!left && !Game.flags.foxesDone) { Game.flags.foxesDone = 1; Game.toast = { text: "The foxes are caught: the vineyard hath flourished.", t: 0 }; }
    },
    paint(c) { SCENE.vines(c, 60, 150, 200, 0); SCENE.vines(c, 420, 150, 200, 0); SCENE.vines(c, 780, 150, 300, 0); },
  });
}

// ---- 10. Till the Day Break -----------------------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(20, 11, 26, 11).fill(22, 10, 24, 10).fill(44, 10, 50, 11).fill(60, 9, 62, 11);
  room2("c2_dawn", {
    name: "Till the Day Break", song: "heaven", wall: "none", sky: "dawn", tiles: { 1: "earth" }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c2_foxes", door: "2" }, 2: { to: "END" } },
    texts: [
      { v: 16, style: "sky", x: 80, y: 30, w: 420, size: 18, color: "rgba(255,250,240,0.85)" },
      { v: 17, style: "kindle", x: 700, y: 30, w: 360, size: 12, reach: 280 },
    ],
    paint(c) { for (let i = 0; i < 80; i++) SCENE.lily(c, 10 + hash(i, 9) * 1180, 192 - ((hash(i, 9) * 1180 > 320 && hash(i, 9) * 1180 < 416) ? 16 : 0), 0); },
    back(c, Wd, t) {
      // Shadows withdrawing: long shapes that shorten as the monk nears the end.
      const k = clamp(Game.monk.x / (70 * T), 0, 1);
      c.fillStyle = "rgba(20,10,40," + (0.35 * (1 - k)) + ")"; c.fillRect(Wd.camX, Wd.camY, W, H);
      // A roe and a young hart running ahead toward the mountains of Bether.
      const m = Game.monk, run = m.x + 90 + Math.sin(t) * 10;
      roe(c, run, 190 - Math.abs(Math.sin(t * 6)) * 12, t, { face: 1, leap: true });
      roe(c, run + 40, 188 - Math.abs(Math.sin(t * 6 + 1)) * 14, t, { face: 1, leap: true, hart: true, col: "#a86a2a" });
    },
  });
}
