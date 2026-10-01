"use strict";
// Canticle Mansion, Chapter VIII: "Love is strong as death."
// My mother's house and the cup of spiced wine; coming up from the desert to
// the apple tree; the seal upon the heart, whose lamps are fire and flames;
// the many waters that cannot quench charity; the little sister, the wall and
// the door of cedar; the vineyard of the peaceable and its pieces of silver;
// the gardens where the friends hearken; and the flight of the roe over the
// mountains of aromatical spices.

CHAPTERS[7] = { start: "c8_house", title: "Love Is Strong as Death" };
const room8 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 8 }, def); };

// ---- 1. My Mother's House -------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(49, 9, 11, "2");
  g.fill(16, 10, 19, 11).fill(30, 9, 33, 11).ledge(36, 41, 7, "s").set(39, 6, "l").set(10, 11, "j").set(12, 11, "j").set(25, 11, "r").set(44, 11, "r");
  room8("c8_house", {
    name: "My Mother's House", song: "dream", wall: "mansion", sky: "none", tiles: { 1: "wood", 2: "shelf" }, legend: { s: ONEWAY }, dark: 0.35, start: [2, 11],
    zones: [{ x0: 16, x1: 19, y0: 10, y1: 11, 1: "cedar" }, { x0: 30, x1: 33, y0: 9, y1: 11, 1: "cedar" }],
    map: g.rows(), doors: { 2: { to: "c8_desert", door: "1" } },
    lights: [{ x: 140, y: 90, r: 120, flicker: 1 }, { x: 420, y: 90, r: 120, flicker: 1 }, { x: 680, y: 90, r: 110, flicker: 1 }],
    decor: [{ k: "banner", x: 330, y: 18, w: 250, h: 74, c: "#5a1a2a" }, { k: "banner", x: 610, y: 22, w: 170, h: 56, c: "#2a3a5a" }],
    texts: [
      { v: 1, style: "painted", x: 40, y: 30, w: 190, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 2, style: "gilded", x: 342, y: 26, w: 226, size: 8.5 },
      { v: 3, style: "embroidered", x: 622, y: 32, w: 146, size: 10, color: "#f4e0b0" },
    ],
    paint(c) {
      // The table, the cup of spiced wine, and the pomegranates.
      px(c, 256, 154, 64, 4, "#6a4424"); c.fillStyle = "#c8962a"; c.beginPath(); c.moveTo(276, 140); c.lineTo(292, 140); c.lineTo(286, 150); c.lineTo(282, 150); c.fill(); px(c, 283, 150, 2, 4, "#c8962a"); px(c, 278, 141, 12, 2, "#7a1a2a");
      for (const [x, y] of [[262, 148], [300, 148], [308, 146]]) { c.fillStyle = "#b8202e"; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); px(c, x - 1, y - 5, 2, 2, "#e8b030"); }
      // A cradle by the hearth: the brother, as if nursed at the same mother's breast.
      px(c, 96, 178, 36, 10, "#8a5a32"); px(c, 98, 174, 32, 4, "#e8dcc0"); px(c, 92, 186, 44, 3, "#5a3a20"); px(c, 120, 172, 6, 6, "#e8b48a");
    },
  });
}

// ---- 2. Who Is This That Cometh Up from the Desert -----------------------------------------------------------
// The desert by night, the stars spelling the charge to the daughters, and the apple tree at its end.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(14, 11, 22, 11).fill(16, 10, 20, 10).fill(38, 10, 45, 11).fill(40, 9, 43, 9).ledge(61, 68, 7, "a").climb(64, 8, 11).set(66, 6, "l").set(30, 11, "s").set(52, 11, "s").set(26, 3, "b");
  room8("c8_desert", {
    name: "Cometh Up from the Desert", song: "desert", wall: "none", sky: "night", tiles: { 1: "sand", 2: "vine" }, legend: { a: ONEWAY }, dust: "#c8a870", dark: 0.3,
    climb: { kind: "vine" },
    map: g.rows(), doors: { 1: { to: "c8_house", door: "2" }, 2: { to: "c8_seal", door: "1" } },
    texts: [
      { v: 4, style: "stars", x: 30, y: 12, w: 600, size: 17 },
      { v: 5, part: [0, 13], style: "sand", x: 738, y: 171, w: 260, size: 12 },
      { v: 5, part: [13, 99], style: "painted", x: 880, y: 40, w: 170, size: 9, color: "#2a1a10", panel: "board", panelColor: "#d8b070" },
    ],
    lights: [{ x: 1040, y: 120, r: 120, c: "rgba(255,230,180,0.35)" }],
    paint(c) {
      // The apple tree: a trunk to climb, boughs to stand on, apples among the leaves.
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = 30 + (i % 3) * 8; c.fillStyle = i % 2 ? "#2e5a2a" : "#3a6a32"; c.beginPath(); c.arc(1032 + Math.cos(a) * r * 1.6, 96 + Math.sin(a) * r * 0.7, 16, 0, 7); c.fill(); }
      for (let i = 0; i < 9; i++) { c.fillStyle = "#c82a2a"; c.beginPath(); c.arc(990 + i * 12, 90 + (i % 3) * 10, 3, 0, 7); c.fill(); }
      // Two figures coming up from the desert, she leaning on her beloved.
      figure(c, 500, 166, { robe: "#5a4a7a", skin: "#d8a47a", headcloth: "#e8dcc0", still: true, face: 1 }, 0);
      figure(c, 512, 166, { robe: "#8a3a2a", skin: "#c8946a", beard: "#3a2a1a", still: true, face: 1 }, 0);
    },
  });
}

// ---- 3. Put Me as a Seal upon Thy Heart ----------------------------------------------------------------------
// The seal waits on its altar; with it the holy water burns, and cedar barricades go up in flame.
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(10, 11, 12, 11).set(11, 10, "P").fill(22, 1, 23, 11, "%").fill(38, 1, 39, 11, "%").ledge(28, 33, 8, "s").set(30, 7, "l").set(31, 3, "b").set(45, 4, "b").set(34, 11, "r");
  room8("c8_seal", {
    name: "Put Me as a Seal", song: "flames", wall: "palace", sky: "none", tiles: { 1: "red", 2: "gold" }, legend: { s: ONEWAY }, dark: 0.55, power: "seal", cedar: true,
    zones: [{ x0: 10, x1: 12, y0: 11, y1: 11, 1: "gold" }],
    map: g.rows(), doors: { 1: { to: "c8_desert", door: "2" }, 2: { to: "c8_waters", door: "1" } },
    lights: [{ x: 184, y: 150, r: 120, c: "rgba(255,180,120,0.5)" }, { x: 480, y: 80, r: 110, flicker: 1 }, { x: 720, y: 80, r: 110, flicker: 1 }],
    decor: [{ k: "torch", x: 60, y: 100 }, { k: "torch", x: 300, y: 100 }, { k: "torch", x: 560, y: 100 }, { k: "torch", x: 760, y: 100 }, { k: "banner", x: 90, y: 16, w: 190, h: 52, c: "#7a1a22" }],
    texts: [
      { v: 6, part: [0, 13], style: "gilded", x: 100, y: 24, w: 170, size: 9 },
      { v: 6, part: [13, 99], style: "flame", x: 392, y: 24, w: 210, size: 16 },
    ],
    update() { hintOnce("burncedar", "Tap the cedar to throw at it: the flame will take it.", save.powers.seal && Game.monk.x > 14 * T); },
    paint(c) { px(c, 164, 168, 40, 3, "#e8b94a"); for (let i = 0; i < 3; i++) SCENE.candle(c, 168 + i * 14, 164, 0); },
  });
}

// ---- 4. Many Waters Cannot Quench Charity -----------------------------------------------------------------------
// The flood fills the hall; the goods of a house float on it as rafts, and love goes over dry-shod.
{
  const g = G(50, 14).floor(12, 0, 5).floor(12, 43, 49).door(0, 8, 11, "1").door(49, 8, 11, "2");
  g.set(47, 11, "l");
  const raft = (x, i) => ({ x, y: 11, w: 3, h: 8, path: [0, -2], period: 3 + (i % 3) * 0.5, t: i * 0.7,
    draw(c, mv, t) { px(c, mv.x, mv.y, mv.w, 8, "#6a4424"); for (let k = 2; k < mv.w; k += 8) px(c, mv.x + k, mv.y + 1, 1, 6, "#3a2414"); px(c, mv.x, mv.y, mv.w, 1, "#a8784a"); if (i % 2) { px(c, mv.x + 14, mv.y - 10, 18, 10, "#8a5a32"); px(c, mv.x + 14, mv.y - 10, 18, 2, "#c8962a"); px(c, mv.x + 22, mv.y - 6, 2, 3, "#e8b94a"); } else { px(c, mv.x + 18, mv.y - 12, 2, 12, "#5a3a20"); px(c, mv.x + 28, mv.y - 12, 2, 12, "#5a3a20"); px(c, mv.x + 18, mv.y - 6, 12, 2, "#5a3a20"); } } });
  room8("c8_waters", {
    name: "Many Waters", song: "sea", wall: "none", sky: "sunset", tiles: { 1: "stone" },
    map: g.rows(), doors: { 1: { to: "c8_seal", door: "2" }, 2: { to: "c8_wall", door: "1" } },
    movers: [8, 13, 18, 23, 28, 33, 38].map((x, i) => raft(x, i)),
    texts: [
      { v: 7, part: [0, 11], style: "sky", x: 60, y: 18, w: 360, size: 15, color: "rgba(255,250,240,0.92)", shadow: "rgba(40,30,60,0.6)" },
      { v: 7, part: [11, 99], style: "painted", x: 520, y: 40, w: 220, size: 9, color: "#2a1a10", panel: "parchment" },
    ],
    front(c, Wd, t) {
      // The flood: it heaves, but never rises over the rafts.
      for (let x = 96; x < 688; x += 4) { const y = 194 + Math.sin(t * 1.6 + x * 0.05) * 3 + Math.sin(t * 0.7 + x * 0.013) * 3; c.fillStyle = "rgba(40,90,150,0.78)"; c.fillRect(x, y, 4, 224 - y); c.fillStyle = "rgba(200,230,255,0.7)"; c.fillRect(x, y, 4, 1); }
    },
  });
}

// ---- 5. If She Be a Wall ---------------------------------------------------------------------------------------------
// The little sister; a wall like a tower to climb with the gloves; and a door joined with boards of cedar, to burn.
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(28, 3, 31, 11).ledge(20, 24, 8, "s").fill(41, 1, 42, 11, "%").set(30, 2, "l").set(16, 11, "c").set(36, 11, "r");
  room8("c8_wall", {
    name: "If She Be a Wall", song: "shield", wall: "none", sky: "day", tiles: { 1: "stone", 2: "marble" }, legend: { s: ONEWAY }, cedar: true,
    zones: [{ x0: 28, x1: 31, y0: 3, y1: 11, 1: "ivory" }],
    map: g.rows(), doors: { 1: { to: "c8_waters", door: "2" }, 2: { to: "c8_vineyard", door: "1" } },
    texts: [
      { v: 8, style: "painted", x: 30, y: 30, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 9, part: [0, 13], style: "carved", x: 235, y: 26, w: 190, size: 8.5, color: "rgba(40,30,20,0.9)", panel: "plaque", panelColor: "#e8e8ec" },
      { v: 9, part: [13, 99], style: "painted", x: 525, y: 70, w: 120, size: 9, color: "#3a2410", panel: "board", panelColor: "#c8905a" },
      { v: 10, style: "sky", x: 205, y: 66, w: 230, size: 11, color: "rgba(255,255,255,0.92)", shadow: "rgba(40,60,90,0.5)" },
    ],
    update() { hintOnce("towerwall", "Jump at the wall and hold toward it to climb.", Game.monk.x > 22 * T && Game.monk.x < 28 * T); },
    paint(c) {
      // Bulwarks of silver along the tower's top.
      for (let i = 0; i < 4; i++) px(c, 448 + i * 18, 40, 10, 8, "#cfd6dc");
      // The little sister, waiting to be spoken for.
      figure(c, 132, 174, { robe: "#c8a0ff", skin: "#e8b48a", headcloth: "#f4ecd8", h: 18, w: 8, still: true, face: 1 }, 0);
    },
  });
}

// ---- 6. The Peaceable Had a Vineyard --------------------------------------------------------------------------------
// In that which hath people: keepers among the vines, and the verse laid out in pieces of silver.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(16, 10, 19, 11).fill(40, 9, 44, 11).ledge(52, 57, 7, "v").set(54, 6, "l").set(24, 11, "w").set(48, 11, "w").set(33, 11, "f").set(64, 11, "f");
  room8("c8_vineyard", {
    name: "The Vineyard of the Peaceable", song: "festival", wall: "none", sky: "vineyard", tiles: { 1: "earth", 2: "vine" }, legend: { v: ONEWAY }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c8_wall", door: "2" }, 2: { to: "c8_gardens", door: "1" } },
    texts: [
      { v: 11, part: [0, 15], style: "painted", x: 40, y: 40, w: 180, size: 9, color: "#3a2410", panel: "board", panelColor: "#d8b070" },
      { v: 11, part: [15, 99], style: "coins", x: 280, y: 14, w: 420, size: 17 },
      { v: 12, part: [0, 5], style: "gilded", x: 760, y: 24, w: 200, size: 10 },
      { v: 12, part: [5, 99], style: "coins", x: 740, y: 48, w: 440, size: 17 },
    ],
    paint(c) {
      for (const x of [80, 380, 620, 900]) SCENE.vines(c, x, 150, 200, 0);
      // The fruit of it: silver paid in, heaped by the keepers' booth.
      px(c, 560, 168, 40, 22, "#6a4424"); px(c, 556, 164, 48, 4, "#8a5a32");
      for (let i = 0; i < 26; i++) { const x = 600 + (i % 9) * 5 + (Math.floor(i / 9) % 2) * 2, y = 188 - Math.floor(i / 9) * 3; px(c, x, y, 4, 2, i % 4 ? "#c8ccd4" : "#ffffff"); }
    },
  });
}

// ---- 7. Thou That Dwellest in the Gardens ---------------------------------------------------------------------------------
// The friends sit and hearken; as the monk comes near, they turn to listen.
{
  const g = G(50, 14).floor(12).door(0, 8, 11, "1").door(49, 8, 11, "2");
  g.fill(20, 10, 23, 11).ledge(30, 35, 7, "v").set(32, 6, "l").set(14, 4, "e").set(40, 3, "e");
  const friend = (x, robe, beard) => ({ kind: "friend", x: x * T, y: 192 - 26, w: 10, h: 26, face: 1, t: 0,
    draw: (c, n, t) => figure(c, n.x, n.y, { robe, skin: "#d8a47a", beard, headcloth: beard ? null : "#e8dcc0", still: true, face: n.face }, t),
    update(n, dt) { n.t += dt; n.face = Game.monk.x < n.x ? -1 : 1; } });
  room8("c8_gardens", {
    name: "Thou That Dwellest in the Gardens", song: "heaven", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { v: ONEWAY },
    map: g.rows(), doors: { 1: { to: "c8_vineyard", door: "2" }, 2: { to: "c8_flee", door: "1" } },
    texts: [{ v: 13, style: "flowers", x: 260, y: 16, w: 480, size: 17 }],
    init(Wd) { Wd.npcs.push(friend(6, "#5a6a8a", "#5a4a3a"), friend(8, "#8a5a6a", null), friend(10, "#6a7a4a", "#d8d4cc")); },
    paint(c) {
      SCENE.cypress(c, 40, 190, 70); SCENE.cypress(c, 560, 190, 80); SCENE.cypress(c, 760, 190, 64);
      SCENE.waterfall(c, 420, 140, 24, 52, 0);
      for (let i = 0; i < 8; i++) SCENE.flowers(c, 230 + i * 70, 190, 8, 0, { w: 50 });
    },
  });
}

// ---- 8. Flee Away, O My Beloved -------------------------------------------------------------------------------------------
// Up the mountains of aromatical spices: the roe and the young hart leap ahead,
// and the scent of the spices rises to lift the monk from one height to the next.
{
  const g = G(75, 28).door(0, 23, 25, "1").door(74, 5, 7, "2");
  const steps = [[0, 14, 26], [15, 24, 23], [25, 34, 20], [35, 44, 17], [45, 54, 14], [55, 64, 11], [65, 74, 8]];
  for (const [a, b, r] of steps) g.floor(r, a, b);
  g.set(30, 19, "l").set(50, 6, "v").set(20, 10, "v");
  const heightAt = (x) => { for (const [a, b, r] of steps) if (x >= a * T && x < (b + 1) * T) return r * T; return 8 * T; };
  room8("c8_flee", {
    name: "Flee Away, O My Beloved", song: "mountain", wall: "none", sky: "dawn", tiles: { 1: "rock" }, dust: "#c8a870",
    zones: steps.map(([a, b, r]) => ({ x0: a, x1: b, y0: r, y1: r, 1: "earth" })),
    map: g.rows(), doors: { 1: { to: "c8_gardens", door: "2" }, 2: { to: "END" } },
    updrafts: steps.slice(1).map(([a, b, r]) => ({ x: a - 2, y: r - 2, w: 2, h: 5, force: 2400, max: 170 })),
    texts: [
      { v: 14, part: [0, 9], style: "sky", x: 200, y: 250, w: 340, size: 16, color: "rgba(255,250,240,0.92)", shadow: "rgba(90,40,60,0.5)" },
      { v: 14, part: [9, 99], style: "sky", x: 700, y: 20, w: 420, size: 16, color: "rgba(255,250,240,0.92)", shadow: "rgba(90,40,60,0.5)" },
    ],
    paint(c) {
      // Spice bushes on every height: myrrh, frankincense, cinnamon.
      for (const [a, b, r] of steps) for (let x = a * T + 10; x < (b + 1) * T - 8; x += 38) { c.fillStyle = ["#5a7a3a", "#7a6a3a", "#6a4a2a"][x % 3]; c.beginPath(); c.arc(x, r * T - 5, 7, 0, 7); c.fill(); px(c, x - 2, r * T - 10, 3, 2, "#e8c870"); }
    },
    back(c, Wd, t) {
      // The rising scent at each height.
      for (const u of Wd.def.updrafts) for (let i = 0; i < 5; i++) { const k = (t * 0.6 + i / 5) % 1; px(c, u.x * T + 8 + Math.sin(t * 2 + i) * 6, (u.y + u.h) * T - k * u.h * T, 2, 2, "rgba(255,230,170," + (1 - k) * 0.8 + ")"); }
      // The roe and the young hart, leaping on ahead from height to height.
      for (const [off, hart] of [[0, false], [70, true]]) {
        const span = 1200, x = (t * 70 + off) % span, y = heightAt(x), leap = (x % 160) > 120;
        roe(c, x, y - (leap ? Math.sin(((x % 160) - 120) / 40 * Math.PI) * 30 : 0), t, { face: 1, leap, hart, col: hart ? "#a86a32" : "#c8945a" });
      }
    },
  });
}
