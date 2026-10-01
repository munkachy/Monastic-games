"use strict";
// Canticle Mansion, Chapter III: "In my bed by night I sought him whom my soul loveth."
// The dark bedchamber and the lantern; the streets and the broad ways; the
// watchmen at the gate; my mother's house; the sleeping roes under the stars;
// the pillar of smoke of aromatical spices; the threescore valiant ones; the
// litter of Solomon; and the king crowned in the day of his espousals.

CHAPTERS[2] = { start: "c3_bed", title: "By Night I Sought Him" };
const room3 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 3 }, def); };
// Houses along a street: windows lit and dark, painted over their walls.
function houseFronts(c, spans, t) {
  for (const [x0, x1, y0] of spans) {
    for (let x = x0 * T + 10; x < (x1 + 1) * T - 14; x += 26) for (let y = y0 * T + 12; y < 11 * T; y += 30) {
      const lit = hash(x, y, 4) > 0.45; px(c, x, y, 12, 16, "#14101a"); px(c, x + 1, y + 1, 10, 14, lit ? "#ffcf6a" : "#2a2440"); px(c, x + 5, y + 1, 1, 14, "#14101a");
    }
    px(c, x0 * T, y0 * T - 2, (x1 - x0 + 1) * T, 3, "#6a3a2a");
  }
}

// ---- 1. In My Bed by Night ---------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(49, 9, 11, "2");
  g.fill(8, 11, 16, 11).fill(8, 10, 16, 10, "B").ledge(17, 21, 3).set(19, 2, "P").fill(26, 6, 28, 11).ledge(33, 37, 8).set(35, 7, "l");
  room3("c3_bed", {
    name: "In My Bed by Night", song: "lament", wall: "mansion", paper: "#1a1a2e", pillar: "#3a3a5a", sky: "none", tiles: { 1: "wood", 2: "shelf" }, dark: 0.93, power: "lantern", start: [3, 11],
    zones: [{ x0: 26, x1: 28, y0: 6, y1: 11, 1: "cedar" }],
    map: g.rows(), doors: { 2: { to: "c3_streets", door: "1" } },
    decor: [{ k: "window", x: 600, y: 40, w: 30, h: 50, night: true }],
    lights: [{ x: 615, y: 70, r: 110, c: "rgba(150,170,255,0.35)" }],
    texts: [{ v: 1, style: "painted", x: 150, y: 26, w: 150, size: 9, color: "#2a1a10", panel: "parchment" }],
    update() { hintOnce("lantern", "Too dark to see far. Is there a lamp in the room? Bounce on the bed to reach high places.", Game.monk.x > 6 * T); },
    paint(c) { px(c, 120, 140, 12, 50, "#5a3a20"); px(c, 266, 150, 10, 40, "#5a3a20"); px(c, 132, 152, 140, 8, "#c8c0d8"); },
  });
}

// ---- 2. The Streets and the Broad Ways ---------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(10, 6, 16, 11).ledge(7, 9, 9, "a").fill(30, 5, 38, 11).ledge(27, 29, 8, "a").ledge(39, 41, 8, "a").fill(52, 7, 60, 11).ledge(49, 51, 9, "a").set(34, 4, "l");
  g.set(22, 11, "w").set(45, 11, "w").set(66, 11, "w");
  room3("c3_streets", {
    name: "The Streets and the Broad Ways", song: "alley", wall: "none", sky: "night", tiles: { 1: "brick", 2: "wood" }, legend: { a: ONEWAY }, dark: 0.8, dust: "#6a6070",
    map: g.rows(), doors: { 1: { to: "c3_bed", door: "2" }, 2: { to: "c3_watch", door: "1" } },
    lights: [{ x: 300, y: 150, r: 90, flicker: 1 }, { x: 680, y: 150, r: 90, flicker: 1 }, { x: 1020, y: 150, r: 90, flicker: 1 }, { x: 1150, y: 150, r: 80, flicker: 1 }],
    texts: [
      { v: 2, part: [0, 9], style: "painted", x: 290, y: 70, w: 150, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
      { v: 2, part: [9, 24], style: "painted", x: 650, y: 54, w: 170, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
      { v: 2, part: [24, 99], style: "painted", x: 1000, y: 70, w: 150, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
    ],
    paint(c) { for (const x of [300, 680, 1020, 1150]) { px(c, x - 1, 150, 3, 42, "#2a2228"); px(c, x - 5, 142, 10, 10, "#3a3030"); px(c, x - 3, 144, 6, 6, "#ffcf6a"); } },
    front(c, Wd, t) { houseFronts(c, [[10, 16, 6], [30, 38, 5], [52, 60, 7]], t); },
  });
}

// ---- 3. The Watchmen -------------------------------------------------------------------------------------------
// The city gate is shut while its keepers walk before it.
{
  const g = G(50, 20).walls(false).floor(18).door(0, 14, 17, "1").door(49, 14, 17, "2");
  g.fill(20, 5, 29, 14, "X").ledge(14, 18, 14, "a").ledge(8, 12, 11, "a").ledge(14, 19, 8, "a").set(10, 10, "l");
  g.set(9, 17, "w").set(15, 17, "w");
  room3("c3_watch", {
    name: "The Watchmen", song: "foes", wall: "none", sky: "night", tiles: { 1: "stone", 2: "wood" }, legend: { a: ONEWAY }, hide: "X", dark: 0.75,
    map: g.rows(), doors: { 1: { to: "c3_streets", door: "2" }, 2: { to: "c3_house", door: "1" } },
    lights: [{ x: 300, y: 230, r: 100, flicker: 1 }, { x: 500, y: 230, r: 100, flicker: 1 }, { x: 400, y: 120, r: 120, c: "rgba(255,210,140,0.3)" }],
    texts: [{ v: 3, style: "carved", x: 336, y: 112, w: 128, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#a89888" }],
    init(Wd) { Wd.movers.push(Gate(24, 15, 3, () => !Wd.foes.some((f) => f.alive && f.kind === "watchman" && f.home.x < 20 * T), { w: 2, lock: true })); },
    update() { hintOnce("watch", "The watchmen keep the gate. Drive them off with holy water.", Game.monk.x > 4 * T); },
    paint(c) {
      // The city wall and its gate tower, with battlements against the stars.
      px(c, 320, 60, 160, 240, "#4a4250"); for (let y = 60; y < 300; y += 10) for (let x = 320 + ((y / 10) % 2) * 10; x < 480; x += 20) { px(c, x, y, 19, 9, "#544a5a"); px(c, x, y, 19, 1, "#6a6070"); }
      for (let x = 320; x < 480; x += 20) px(c, x, 48, 12, 14, "#4a4250");
      c.fillStyle = "#0a080e"; c.beginPath(); c.moveTo(368, 288); c.lineTo(368, 248); c.arc(400, 248, 32, Math.PI, 0); c.lineTo(432, 288); c.fill();
      for (const x of [350, 450]) { px(c, x - 1, 200, 3, 16, "#3a3030"); px(c, x - 3, 196, 7, 6, "#ffcf6a"); }
    },
  });
}

// ---- 4. My Mother's House ---------------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(12, 10, 16, 11).ledge(20, 25, 8).ledge(28, 33, 6).fill(38, 9, 41, 11).set(30, 5, "h").set(23, 7, "l");
  room3("c3_house", {
    name: "My Mother's House", song: "dream", wall: "mansion", paper: "#4a2a1e", pillar: "#8a5a32", sky: "none", tiles: { 1: "wood", 2: "shelf" }, dark: 0.25,
    zones: [{ x0: 12, x1: 16, y0: 9, y1: 11, 1: "cedar" }, { x0: 38, x1: 41, y0: 8, y1: 11, 1: "brick" }],
    map: g.rows(), doors: { 1: { to: "c3_watch", door: "2" }, 2: { to: "c3_garden", door: "1" } },
    decor: [{ k: "banner", x: 48, y: 18, w: 196, h: 60, c: "#5a1a22" }, { k: "banner", x: 410, y: 18, w: 236, h: 76, c: "#1e2a5a" }],
    lights: [{ x: 630, y: 160, r: 140, c: "rgba(255,170,90,0.45)" }, { x: 200, y: 120, r: 110, flicker: 1 }],
    texts: [
      { v: 4, part: [0, 15], style: "embroidered", x: 58, y: 30, w: 176, size: 9, color: "#ffe08a" },
      { v: 4, part: [15, 99], style: "embroidered", x: 420, y: 28, w: 216, size: 9, color: "#ffe8b0" },
    ],
    back(c, Wd, t) {
      // The hearth, burning.
      const f = Math.sin(t * 9); px(c, 610, 154, 44, 4, "#5a3a2a");
      for (let i = 0; i < 6; i++) { const h = 10 + Math.abs(Math.sin(t * 7 + i)) * 10; px(c, 614 + i * 6, 152 - h, 5, h, i % 2 ? "#ff8a3a" : "#ffcf5a"); }
      void f;
    },
    paint(c) { px(c, 600, 120, 64, 72, "#3a2a2a"); px(c, 606, 128, 52, 60, "#140c0c"); px(c, 596, 116, 72, 6, "#6a5040"); px(c, 300, 140, 40, 40, "#6a4a2a"); for (let i = 0; i < 8; i++) px(c, 302 + i * 5, 142, 1, 36, "#e8d8b0"); },
  });
}

// ---- 5. By the Roes and the Harts --------------------------------------------------------------------------------
// The garden by night, the roes asleep, the verse in the stars.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(18, 10, 23, 11).fill(36, 11, 40, 11).fill(52, 9, 55, 11).ledge(56, 60, 7).set(58, 6, "l").set(30, 3, "b").set(46, 3, "b");
  room3("c3_garden", {
    name: "By the Roes and the Harts", song: "heaven", wall: "none", sky: "night", tiles: { 1: "earth", 2: "vine" }, dark: 0.55, dust: "#6a6a5a",
    map: g.rows(), doors: { 1: { to: "c3_house", door: "2" }, 2: { to: "c3_smoke", door: "1" } },
    lights: [{ x: 700, y: 30, r: 160, c: "rgba(200,210,255,0.25)" }],
    texts: [{ v: 5, style: "stars", x: 60, y: 16, w: 640, size: 16 }],
    back(c, Wd, t) {
      // Roes and harts asleep in the grass.
      for (const [x, f, h] of [[260, 1, 0], [300, -1, 1], [700, 1, 1], [880, -1, 0]]) { c.save(); c.translate(x, 192); c.scale(f, 0.75); roe(c, 0, 0, 0, { hart: !!h, leap: true, col: "#8a6a4a" }); c.restore(); px(c, x - 2, 174 + Math.sin(t + x) * 2, 2, 2, "rgba(255,255,255,0.5)"); }
    },
    paint(c) { for (const x of [140, 460, 1000]) SCENE.cypress(c, x, 192, 56); },
  });
}

// ---- 6. A Pillar of Smoke -----------------------------------------------------------------------------------------
// Who is she that goeth up by the desert, as a pillar of smoke? The smoke of spices lifts the monk.
{
  const g = G(25, 28).walls(false).floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.fill(0, 0, 0, 22).fill(24, 5, 24, 25).ledge(14, 17, 18, "a").ledge(14, 17, 11, "a").ledge(13, 23, 5, "a").set(16, 10, "h");
  room3("c3_smoke", {
    name: "A Pillar of Smoke", song: "desert", wall: "none", sky: "dawn", tiles: { 1: "sand", 2: "wood" }, legend: { a: ONEWAY }, dust: "#d8b070",
    map: g.rows(), doors: { 1: { to: "c3_garden", door: "2" }, 2: { to: "c3_valiant", door: "1" } },
    updrafts: [{ x: 9, y: 3, w: 4, h: 23, force: 2200, max: 170 }],
    texts: [{ v: 6, style: "smoke", x: 20, y: 120, w: 120, size: 10, color: "rgba(255,236,210," }],
    update(Wd) { for (let i = 0; i < 2; i++) Wd.parts.push({ x: 9 * T + Math.random() * 64, y: 25 * T, vx: (Math.random() - 0.5) * 16, vy: -80 - Math.random() * 60, g: 0, life: 5, c: ["#c8b8a8", "#e8d8c8", "#a89888", "#f4d8a0"][Math.floor(Math.random() * 4)], s: 2 }); },
    paint(c) { for (const x of [152, 168, 184]) { px(c, x, 400, 10, 16, "#8a4a2a"); px(c, x + 2, 396, 6, 4, "#c8962a"); } },
  });
}

// ---- 7. Threescore Valiant Ones ------------------------------------------------------------------------------------
{
  const g = G(75, 14).walls().floor(12).door(0, 9, 11, "1").door(74, 9, 11, "2");
  g.ledge(8, 14, 9, "s").ledge(17, 23, 7, "s").ledge(50, 56, 7, "s").ledge(59, 65, 9, "s").fill(30, 10, 44, 11).set(37, 9, "h").set(20, 6, "l");
  g.set(12, 3, "b").set(26, 3, "b").set(48, 3, "b").set(62, 3, "b");
  room3("c3_valiant", {
    name: "Threescore Valiant Ones", song: "shield", wall: "palace", paper: "#1e1a2a", sky: "none", tiles: { 1: "gold", 2: "gold" }, legend: { s: ONEWAY }, dark: 0.6,
    map: g.rows(), doors: { 1: { to: "c3_smoke", door: "2" }, 2: { to: "c3_litter", door: "1" } },
    lights: [{ x: 600, y: 120, r: 150, c: "rgba(255,210,140,0.4)" }, { x: 160, y: 80, r: 90, flicker: 1 }, { x: 1040, y: 80, r: 90, flicker: 1 }],
    texts: [
      { v: 7, style: "carved", x: 40, y: 22, w: 200, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#a89070" },
      { v: 8, part: [0, 8], style: "painted", x: 880, y: 26, w: 150, size: 9, color: "#3a2410", panel: "parchment" },
      { v: 8, part: [8, 99], style: "painted", x: 1010, y: 70, w: 150, size: 9, color: "#3a2410", panel: "parchment" },
    ],
    paint(c) {
      // The bed of Solomon at the centre, and the valiant ones about it in ranks, every sword at his side.
      px(c, 520, 120, 160, 40, "#7a3a2a"); px(c, 520, 120, 160, 4, "#c8962a"); px(c, 510, 80, 10, 80, "#c8962a"); px(c, 680, 80, 10, 80, "#c8962a"); px(c, 510, 76, 180, 8, "#c8962a");
      for (let row = 0; row < 3; row++) for (let i = 0; i < 20; i++) {
        const x = 250 + i * 36 + (row % 2) * 18, y = 150 - row * 22; if (x > 500 && x < 700) continue;
        px(c, x, y, 8, 18, ["#3a4a6a", "#4a3a5a", "#3a5a4a"][row]); px(c, x + 1, y - 7, 6, 7, "#c8a080"); px(c, x, y - 9, 8, 3, "#a8b0bc"); px(c, x + 8, y + 6, 2, 10, "#c8ccd4"); px(c, x + 7, y + 6, 4, 1, "#8a6a3a");
      }
    },
  });
}

// ---- 8. The Litter of Solomon -----------------------------------------------------------------------------------------
// Up the pillars of silver, onto the seat of gold, up the going-up of purple,
// to the canopy of the wood of Libanus.
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.climb(5, 21, 25).ledge(3, 21, 20, "g").ledge(14, 19, 17, "p").ledge(8, 13, 14, "p").ledge(14, 19, 11, "p").ledge(6, 11, 8, "p").ledge(13, 23, 5, "c").set(8, 7, "l");
  room3("c3_litter", {
    name: "The Litter of Solomon", song: "kings", wall: "palace", paper: "#2a1a1e", sky: "none", tiles: { 1: "cedar", 2: "gold" }, legend: { g: ONEWAY, p: ONEWAY, c: ONEWAY }, dark: 0.35,
    zones: [{ x0: 0, x1: 24, y0: 6, y1: 18, 2: "red" }, { x0: 0, x1: 24, y0: 0, y1: 5, 2: "cedar" }],
    climb: { kind: "chain" },
    map: g.rows(), doors: { 1: { to: "c3_valiant", door: "2" }, 2: { to: "c3_crown", door: "1" } },
    lights: [{ x: 200, y: 220, r: 160, c: "rgba(255,220,150,0.35)" }, { x: 360, y: 60, r: 100 }],
    texts: [
      { v: 9, style: "gilded", x: 200, y: 366, w: 160, size: 9 },
      { v: 10, part: [0, 7], style: "carved", x: 30, y: 340, w: 120, size: 8, color: "rgba(30,30,40,0.9)", panel: "plaque", panelColor: "#c8ccd4" },
      { v: 10, part: [7, 11], style: "gilded", x: 150, y: 296, w: 120, size: 8.5 },
      { v: 10, part: [11, 16], style: "embroidered", x: 36, y: 188, w: 110, size: 9, color: "#e8c0ff" },
      { v: 10, part: [16, 99], style: "embroidered", x: 160, y: 30, w: 150, size: 8.5, color: "#ffe8b0" },
    ],
    paint(c) {
      // The pillars of silver, the purple hangings, the canopy of cedar.
      for (const x of [62, 330]) { px(c, x, 80, 16, 340, "#a8b0bc"); px(c, x, 80, 3, 340, "#e0e6ee"); px(c, x + 13, 80, 3, 340, "#6a7280"); }
      c.fillStyle = "#4a1a4a"; c.beginPath(); c.moveTo(84, 120); c.quadraticCurveTo(200, 170, 326, 120); c.lineTo(326, 300); c.quadraticCurveTo(200, 260, 84, 300); c.fill();
      px(c, 40, 320, 330, 6, "#e8b94a");
      px(c, 40, 40, 330, 18, "#9a5a32"); px(c, 40, 40, 330, 2, "#c8844a");
    },
  });
}

// ---- 9. The Day of His Espousals ------------------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(20, 11, 30, 11).fill(22, 10, 28, 10).ledge(6, 11, 8, "g").ledge(38, 43, 8, "g").set(40, 7, "l");
  room3("c3_crown", {
    name: "The Day of His Espousals", song: "festival", wall: "palace", paper: "#3a1a2e", sky: "none", tiles: { 1: "gold", 2: "gold" }, legend: { g: ONEWAY }, dark: 0.2,
    map: g.rows(), doors: { 1: { to: "c3_litter", door: "2" }, 2: { to: "END" } },
    decor: [{ k: "banner", x: 230, y: 16, w: 340, h: 70, c: "#7a1f2b" }],
    lights: [{ x: 400, y: 120, r: 180, c: "rgba(255,230,160,0.4)" }],
    texts: [{ v: 11, style: "gilded", x: 240, y: 26, w: 320, size: 9.5 }],
    init(Wd) {
      Wd.npcs.push({ kind: "king", x: 24 * T, y: 10 * T - 28, w: 12, h: 28, draw: (c, n, t) => figure(c, n.x, n.y, { robe: "#7a1f2b", skin: "#d8a47a", beard: "#5a3a2a", crown: true, sash: "#e8b94a", w: 12, h: 28, still: true, face: Game.monk.x < n.x ? -1 : 1 }, t) });
      Wd.npcs.push({ kind: "queen", x: 27 * T, y: 10 * T - 26, w: 10, h: 26, draw: (c, n, t) => figure(c, n.x, n.y, { robe: "#2a3a7a", skin: "#e8b898", headcloth: "#e8dcc0", w: 10, h: 26, still: true, face: -1 }, t) });
    },
    back(c, Wd, t) {
      // The daughters of Sion, dancing.
      for (let i = 0; i < 6; i++) { const x = 90 + i * 36 + (i > 2 ? 360 : 0), y = 166 - Math.abs(Math.sin(t * 3 + i)) * 4; figure(c, x, y, { robe: ["#c86aa8", "#6a8ad0", "#e8b94a", "#7ac0a0", "#e87a5a", "#a87ad0"][i], skin: "#e8b898", headcloth: "#f4ead4", h: 22, w: 9, face: i % 2 ? 1 : -1 }, t + i); }
      // Petals falling.
      for (let i = 0; i < 20; i++) px(c, (i * 47 + t * 20) % 800, (i * 31 + t * 30) % 190, 2, 2, ["#ff9ac8", "#ffffff", "#ffe08a"][i % 3]);
    },
  });
}
