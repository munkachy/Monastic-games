"use strict";
// Canticle Mansion, Chapter VII: "Thy stature is like to a palm tree."
// The companies of camps and the steps in shoes; the heap of wheat set about
// with lilies; the tower of ivory and the fishpools in Hesebon; Carmel and the
// purple of the king bound in the channels; the palm tree, climbed with the
// gloves; the best wine; the field and the villages; and the gates where all
// fruits, new and old, are kept.

CHAPTERS[6] = { start: "c7_camps", title: "The Palm Tree" };
const room7 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 7 }, def); };

// ---- 1. The Companies of Camps ----------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(74, 8, 11, "2");
  g.ledge(14, 19, 8, "t").ledge(30, 36, 7, "t").ledge(46, 51, 8, "t").fill(58, 10, 62, 11).set(33, 6, "l").set(24, 11, "s").set(54, 11, "s");
  room7("c7_camps", {
    name: "The Companies of Camps", song: "desert", wall: "none", sky: "desert", tiles: { 1: "sand", 2: "tent" }, legend: { t: ONEWAY }, dust: "#e8c890", start: [2, 11],
    zones: [{ x0: 0, x1: 74, y0: 0, y1: 13, 2: "tent" }],
    map: g.rows(), doors: { 2: { to: "c7_wheat", door: "1" } },
    texts: [
      { v: 1, part: [0, 12], style: "sky", x: 40, y: 18, w: 340, size: 16, color: "rgba(90,40,20,0.7)", shadow: "rgba(255,240,200,0.6)" },
      { v: 1, part: [12, 22], style: "sand", x: 410, y: 180, w: 360, size: 13 },
      { v: 1, part: [22, 99], style: "painted", x: 940, y: 60, w: 190, size: 9, color: "#3a2410", panel: "board", panelColor: "#d8b070" },
    ],
    paint(c) {
      SCENE.tent(c, 210, 128, 120, 64); SCENE.tent(c, 470, 112, 140, 80, { col: "#2a2226" }); SCENE.tent(c, 730, 128, 120, 64);
      // The skilful workman's bench: jewels set out to see.
      px(c, 960, 150, 120, 6, "#6a4424"); for (let i = 0; i < 12; i++) { const x = 966 + i * 9; px(c, x, 144, 5, 5, ["#e83a6a", "#5ad0e8", "#e8b94a", "#7ae86a"][i % 4]); px(c, x + 1, 144, 2, 1, "#ffffff"); }
      // Footprints of sandals, walking on through the sand.
      for (let x = 400; x < 820; x += 22) { px(c, x, 200 + ((x / 22) % 2) * 3, 4, 2, "#b88a50"); }
    },
  });
}

// ---- 2. A Heap of Wheat ----------------------------------------------------------------------------------------
{
  const g = G(50, 14).floor(12).door(0, 8, 11, "1").door(49, 8, 11, "2");
  g.fill(16, 11, 30, 11).fill(18, 10, 28, 10).fill(20, 9, 26, 9).fill(22, 8, 24, 8).ledge(36, 41, 7, "b").set(23, 7, "l");
  room7("c7_wheat", {
    name: "A Heap of Wheat", song: "river", wall: "none", sky: "day", tiles: { 1: "sand", 2: "vine" }, legend: { b: ONEWAY }, dust: "#d8c070",
    zones: [{ x0: 16, x1: 30, y0: 7, y1: 11, 1: "sand" }],
    map: g.rows(), doors: { 1: { to: "c7_camps", door: "2" }, 2: { to: "c7_ivory", door: "1" } },
    texts: [
      { v: 2, style: "painted", x: 40, y: 34, w: 170, size: 9, color: "#3a2410", panel: "parchment" },
      { v: 3, style: "sky", x: 470, y: 22, w: 280, size: 15, color: "rgba(255,255,255,0.9)" },
    ],
    paint(c) {
      // The round bowl, and the heap of wheat set about with lilies.
      c.fillStyle = "#c8962a"; c.beginPath(); c.ellipse(120, 176, 40, 14, 0, 0, Math.PI); c.fill(); px(c, 80, 174, 80, 3, "#fff0a0");
      for (let i = 0; i < 40; i++) SCENE.lily(c, 250 + i * 6 + (i % 2) * 2, 192 - (i > 6 && i < 34 ? 16 : 0), 0);
    },
    back(c, Wd, t) { roe(c, 640, 190, t, { face: -1 }); roe(c, 666, 190, t + 0.3, { face: -1, col: "#c8945a" }); },
  });
}

// ---- 3. A Tower of Ivory -----------------------------------------------------------------------------------------
// The fishpools of Hesebon at its foot; up the ivory tower to the window that looks toward Damascus.
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.clear(8, 26, 16, 26).fill(8, 26, 16, 26, "~").fill(8, 27, 16, 27);
  for (const [a, b, r] of [[17, 22, 23], [10, 15, 20], [3, 8, 17], [10, 15, 14], [17, 22, 11], [10, 15, 8], [18, 23, 5]]) g.ledge(a, b, r, "i");
  g.set(5, 16, "l").set(6, 10, "b");
  room7("c7_ivory", {
    name: "A Tower of Ivory", song: "shield", wall: "cellar", sky: "none", tiles: { 1: "ivory", 2: "marble" }, legend: { i: ONEWAY }, dark: 0.3,
    map: g.rows(), doors: { 1: { to: "c7_wheat", door: "2" }, 2: { to: "c7_carmel", door: "1" } },
    lights: [{ x: 200, y: 420, r: 120, c: "rgba(150,200,255,0.3)" }, { x: 340, y: 50, r: 120, c: "rgba(255,240,200,0.5)" }],
    texts: [
      { v: 4, part: [0, 7], style: "carved", x: 30, y: 210, w: 120, size: 8.5, color: "rgba(60,40,20,0.9)", panel: "plaque", panelColor: "#f4ecd8" },
      { v: 4, part: [7, 25], style: "painted", x: 99, y: 373, w: 160, size: 8.5, color: "#1a2a4a", panel: "parchment" },
      { v: 4, part: [25, 99], style: "kindle", x: 30, y: 40, w: 230, size: 10, reach: 200 },
    ],
    paint(c) { px(c, 300, 40, 50, 30, "#8ac0f0"); px(c, 300, 40, 50, 30, "rgba(0,0,0,0)"); for (let i = 0; i < 6; i++) px(c, 304 + i * 8, 58 - (i % 3) * 4, 6, 12 - (i % 3) * 4, "#c8b898"); px(c, 298, 38, 54, 2, "#a89878"); px(c, 298, 70, 54, 2, "#a89878"); },
    back(c, Wd, t) { for (let i = 0; i < 4; i++) px(c, 140 + ((t * 20 + i * 37) % 120), 420 + (i % 2) * 4, 3, 1, "#ffffff"); },
  });
}

// ---- 4. Thy Head Is like Carmel -----------------------------------------------------------------------------------
// Over Carmel, across the channels where the king's purple is dyed.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  for (const x of [14, 30, 46]) g.clear(x, 12, x + 3, 13).fill(x, 13, x + 3, 13, "~");
  g.fill(22, 9, 26, 11).fill(38, 8, 42, 11).fill(56, 9, 60, 11).set(40, 7, "l").set(30, 4, "v").set(60, 3, "v");
  room7("c7_carmel", {
    name: "Thy Head Is like Carmel", song: "mountain", wall: "none", sky: "sunset", tiles: { 1: "rock" }, dust: "#a09070",
    map: g.rows(), doors: { 1: { to: "c7_ivory", door: "2" }, 2: { to: "c7_palm", door: "1" } },
    texts: [
      { v: 5, part: [0, 5], style: "sky", x: 60, y: 22, w: 260, size: 18, color: "rgba(255,240,230,0.9)" },
      { v: 5, part: [5, 99], style: "painted", x: 520, y: 40, w: 170, size: 9, color: "#2a1030", panel: "parchment" },
      { v: 6, style: "kindle", x: 860, y: 40, w: 280, size: 12, reach: 260 },
    ],
    paint(c) { for (const x of [14, 30, 46]) { px(c, x * T, 200, 64, 24, "#6a1a6a"); for (let i = 0; i < 6; i++) px(c, x * T + i * 10, 204 + (i % 2) * 6, 6, 1, "#c86ac8"); } },
  });
}

// ---- 5. The Palm Tree --------------------------------------------------------------------------------------------------
// The gloves wait at its foot. The trunk is too tall and too far from any wall
// to leap: with the gloves, hold toward it in the air and climb to the clusters.
{
  const g = G(25, 42).walls().floor(40).door(0, 37, 39, "1").door(24, 2, 4, "2");
  g.set(5, 39, "P").fill(11, 9, 13, 39).ledge(5, 19, 8, "f").ledge(19, 23, 5, "f").set(7, 7, "l");
  room7("c7_palm", {
    name: "The Palm Tree", song: "festival", wall: "none", sky: "day", tiles: { 1: "palm", 2: "vine" }, legend: { f: ONEWAY }, power: "gloves",
    zones: [{ x0: 0, x1: 0, y0: 0, y1: 41, 1: "rock" }, { x0: 24, x1: 24, y0: 0, y1: 41, 1: "rock" }, { x0: 0, x1: 24, y0: 40, y1: 41, 1: "sand" }],
    map: g.rows(), doors: { 1: { to: "c7_carmel", door: "2" }, 2: { to: "c7_wine", door: "1" } },
    texts: [
      { v: 7, style: "painted", x: 234, y: 560, w: 140, size: 9, color: "#3a2410", panel: "board", panelColor: "#d8b070" },
      { v: 8, part: [0, 18], style: "kindle", x: 20, y: 30, w: 170, size: 10, reach: 200 },
      { v: 8, part: [18, 99], style: "kindle", x: 194, y: 37, w: 150, size: 10, reach: 200 },
    ],
    update() { hintOnce("climbpalm", "Jump at the trunk and hold toward it to climb.", save.powers.gloves && Game.monk.x > 8 * T); },
    paint(c) { for (let i = 0; i < 30; i++) px(c, 176 + (i % 3), 150 + i * 16, 48, 2, "#5a3a20"); },
    front(c, Wd, t) {
      // The fronds and the clusters of dates and grapes at the crown.
      for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; for (let s = 0; s < 40; s++) px(c, 200 + Math.cos(a) * s * 3, 140 + Math.sin(a) * s * 1.2 + s * s * 0.03, 4, 2, s % 3 ? "#3a8a3a" : "#5aa64a"); }
      for (const [x, y, col] of [[180, 146, "#8a5a1a"], [214, 148, "#5a2a6a"], [196, 150, "#8a5a1a"]]) for (let i = 0; i < 6; i++) px(c, x + (i % 3) * 4, y + Math.floor(i / 3) * 4, 4, 4, col);
    },
  });
}

// ---- 6. The Best Wine ---------------------------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(14, 10, 19, 11).fill(30, 9, 34, 11).ledge(22, 27, 7).set(24, 6, "l").set(12, 2, "b").set(38, 2, "b");
  room7("c7_wine", {
    name: "The Best Wine", song: "alley", wall: "cellar", sky: "none", tiles: { 1: "cellar", 2: "shelf" }, dark: 0.45,
    zones: [{ x0: 14, x1: 19, y0: 9, y1: 11, 1: "wood" }, { x0: 30, x1: 34, y0: 8, y1: 11, 1: "wood" }],
    map: g.rows(), doors: { 1: { to: "c7_palm", door: "2" }, 2: { to: "c7_villages", door: "1" } },
    lights: [{ x: 160, y: 80, r: 110, flicker: 1 }, { x: 600, y: 80, r: 110, flicker: 1 }],
    decor: [{ k: "banner", x: 470, y: 18, w: 220, h: 40, c: "#5a1a2a" }],
    texts: [
      { v: 9, style: "painted", x: 40, y: 28, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 10, style: "gilded", x: 480, y: 26, w: 200, size: 10 },
    ],
    paint(c) { for (let i = 0; i < 5; i++) { const x = 260 + i * 34; c.fillStyle = "#5a3a20"; c.beginPath(); c.ellipse(x, 172, 15, 18, 0, 0, 7); c.fill(); px(c, x - 15, 162, 30, 2, "#2a1a10"); } },
  });
}

// ---- 7. Let Us Go Forth into the Field -------------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(16, 10, 20, 11).fill(36, 9, 40, 11).fill(52, 10, 56, 11).ledge(44, 49, 7, "v").set(47, 6, "l").set(28, 3, "v").set(62, 3, "v");
  room7("c7_villages", {
    name: "Let Us Go Forth into the Field", song: "river", wall: "none", sky: "dawn", tiles: { 1: "earth", 2: "vine" }, legend: { v: ONEWAY }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c7_wine", door: "2" }, 2: { to: "c7_gates", door: "1" } },
    texts: [
      { v: 11, style: "sky", x: 40, y: 22, w: 360, size: 16, color: "rgba(255,250,240,0.9)" },
      { v: 12, part: [0, 15], style: "painted", x: 620, y: 40, w: 170, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
      { v: 12, part: [15, 99], style: "painted", x: 910, y: 74, w: 190, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
    ],
    paint(c) {
      for (const x of [140, 300]) { px(c, x, 150, 40, 42, "#c8a878"); c.fillStyle = "#8a4a2a"; c.beginPath(); c.moveTo(x - 4, 152); c.lineTo(x + 20, 132); c.lineTo(x + 44, 152); c.fill(); px(c, x + 16, 170, 8, 22, "#4a3020"); }
      SCENE.vines(c, 620, 150, 220, 0); SCENE.vines(c, 900, 150, 240, 0);
      for (let i = 0; i < 6; i++) { const x = 1000 + i * 24; c.fillStyle = "#b8202e"; c.beginPath(); c.arc(x, 140, 4, 0, 7); c.fill(); }
    },
  });
}

// ---- 8. In Our Gates Are All Fruits ------------------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(10, 10, 13, 11).fill(36, 10, 39, 11).ledge(18, 23, 7, "s").ledge(26, 31, 7, "s").set(28, 6, "l");
  room7("c7_gates", {
    name: "In Our Gates Are All Fruits", song: "festival", wall: "storeroom", sky: "none", tiles: { 1: "wood", 2: "shelf" }, legend: { s: ONEWAY }, dark: 0.3,
    map: g.rows(), doors: { 1: { to: "c7_villages", door: "2" }, 2: { to: "END" } },
    lights: [{ x: 400, y: 100, r: 160, c: "rgba(255,220,150,0.4)" }],
    texts: [
      { v: 13, part: [0, 5], style: "smoke", x: 40, y: 40, w: 160, size: 12, color: "rgba(255,230,200," },
      { v: 13, part: [5, 99], style: "carved", x: 300, y: 30, w: 200, size: 9, color: "rgba(30,20,14,0.9)", panel: "board", panelColor: "#b07a4a" },
    ],
    paint(c) {
      // Baskets of every fruit, new and old; the mandrakes.
      for (let i = 0; i < 10; i++) { const x = 60 + i * 70, y = 172; px(c, x, y, 40, 18, "#8a6a3a"); for (let k = 0; k < 8; k++) px(c, x + 3 + (k % 4) * 9, y - 4 - Math.floor(k / 4) * 5, 6, 6, ["#d8323a", "#e8b030", "#8ab040", "#6a2a6a", "#e87a3a"][(i + k) % 5]); }
      for (const x of [80, 120]) { px(c, x, 120, 2, 12, "#3a7a2e"); c.fillStyle = "#5aa040"; c.beginPath(); c.ellipse(x, 118, 8, 4, 0, 0, 7); c.fill(); px(c, x - 2, 112, 4, 4, "#c8a0ff"); }
    },
  });
}
