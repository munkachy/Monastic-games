"use strict";
// Canticle Mansion, Chapter V: "I sleep, and my heart watcheth."
// The feast in the garden; the door, the knocking, the bolt; the empty
// streets; the keepers of the walls (and the helmet); the daughters of
// Jerusalem; the beloved's image, climbed from the bases of gold to the head
// of finest gold; and the question at the crossroads: whither is he gone?

CHAPTERS[4] = { start: "c5_feast", title: "My Heart Watcheth" };
const room5 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 5 }, def); };

// ---- 1. He Is Come into His Garden ---------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(74, 8, 11, "2");
  g.fill(14, 10, 22, 10).fill(14, 11, 14, 11).fill(22, 11, 22, 11).fill(36, 9, 44, 9).fill(36, 10, 36, 11).fill(44, 10, 44, 11).fill(56, 10, 64, 10).fill(56, 11, 56, 11).fill(64, 11, 64, 11).ledge(28, 32, 7, "b").set(30, 6, "l");
  room5("c5_feast", {
    name: "He Is Come into His Garden", song: "festival", wall: "none", sky: "day", tiles: { 1: "earth", 2: "vine" }, legend: { b: ONEWAY }, dust: "#8a7a50", start: [2, 11],
    zones: [{ x0: 13, x1: 65, y0: 9, y1: 11, 1: "wood" }],
    map: g.rows(), doors: { 2: { to: "c5_door", door: "1" } },
    texts: [
      { v: 1, part: [0, 15], style: "painted", x: 40, y: 40, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 1, part: [15, 35], style: "painted", x: 470, y: 30, w: 190, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 1, part: [35, 99], style: "painted", x: 860, y: 36, w: 210, size: 9, color: "#2a1a10", panel: "parchment" },
    ],
    paint(c) {
      for (const x of [120, 400, 780, 1080]) { px(c, x, 120, 8, 72, "#5a3a20"); c.fillStyle = "#2a6a2a"; c.beginPath(); c.arc(x + 4, 110, 34, 0, 7); c.fill(); for (let i = 0; i < 8; i++) px(c, x - 20 + hash(i, x) * 44, 92 + hash(x, i) * 30, 4, 4, "#d8323a"); }
    },
    behind(c, Wd, t) {
      // The tables laid: honeycomb, wine, milk, fruit; friends feasting.
      for (const [x0, x1, y] of [[224, 368, 160], [576, 720, 144], [896, 1040, 160]]) {
        px(c, x0, y - 3, x1 - x0, 3, "#e8e0d0");
        for (let x = x0 + 8; x < x1 - 8; x += 22) { const k = Math.floor(hash(x, y) * 4); if (k === 0) { px(c, x, y - 10, 8, 7, "#e8a030"); px(c, x + 1, y - 9, 6, 1, "#ffd060"); } else if (k === 1) SCENE.bottle(c, x, y - 17, { col: "#5a1a2a", h: 14 }); else if (k === 2) { px(c, x, y - 11, 7, 8, "#f4f4f4"); px(c, x + 2, y - 13, 3, 2, "#d8d8d8"); } else { px(c, x, y - 6, 4, 4, "#d8323a"); px(c, x + 4, y - 5, 4, 4, "#8ab040"); } }
      }
      for (let i = 0; i < 4; i++) figure(c, 380 + i * 170, 166 - (i % 2) * 16, { robe: ["#7a3a2a", "#3a5a7a", "#5a7a3a", "#7a5a2a"][i], skin: "#d8a47a", beard: i % 2 ? "#4a3a2a" : null, h: 24, w: 10, face: i % 2 ? -1 : 1 }, t + i);
    },
  });
}

// ---- 2. Open to Me ---------------------------------------------------------------------------------------
// Night. The beloved knocks; dew on his head. Open the bolt of the door yourself.
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(6, 11, 13, 11).ledge(17, 21, 8).ledge(26, 30, 6).set(28, 5, "l").fill(44, 1, 44, 8);
  room5("c5_door", {
    name: "Open to Me", song: "dream", wall: "mansion", paper: "#22203a", pillar: "#4a4a6a", sky: "none", tiles: { 1: "wood", 2: "shelf" }, dark: 0.7,
    map: g.rows(), doors: { 1: { to: "c5_feast", door: "2" }, 2: { to: "c5_street", door: "1", locked: () => Game.flags.bolt } },
    lights: [{ x: 120, y: 130, r: 90, flicker: 1 }, { x: 690, y: 100, r: 110, c: "rgba(160,180,255,0.3)" }],
    texts: [
      { v: 2, part: [0, 12], style: "painted", x: 60, y: 30, w: 150, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 2, part: [12, 99], style: "kindle", x: 520, y: 26, w: 170, size: 10, reach: 200 },
      { v: 3, style: "painted", x: 250, y: 26, w: 140, size: 8.5, color: "#2a1a10", panel: "parchment" },
      { v: 4, style: "carved", x: 556, y: 120, w: 130, size: 8, color: "rgba(30,20,14,0.9)", panel: "board", panelColor: "#b07a4a" },
      { v: 5, style: "smoke", x: 356, y: 120, w: 160, size: 9.5, color: "rgba(255,230,210," },
    ],
    init(Wd) {
      if (!Game.flags.bolt) Wd.movers.push(Gate(44, 9, 3, () => Game.flags.bolt, { lock: true, col: "#5a3a20" }));
      Wd.npcs.push({ kind: "bolt", x: 42 * T, y: 9 * T, w: 16, h: 48, verb: "OPEN", talk() { if (Game.flags.bolt) return; Game.flags.bolt = 1; Snd.sfx("door"); Game.say("", CANTICLE[4][5].split(" ").slice(0, 18).join(" "), 5); }, draw() { } });
    },
    update(Wd) {
      hintOnce("bolt", "Someone knocks. Stand by the door and press the round button to draw the bolt.", Game.monk.x > 36 * T && !Game.flags.bolt);
      if (Math.random() < 0.2) Wd.parts.push({ x: (45 + Math.random() * 4) * T, y: 16, vx: 0, vy: 30, g: 300, life: 0.8, c: "#a8d4ff", s: 1 });
    },
    paint(c) {
      // The bed and the folded garment; the great door with its keyhole and bolt.
      px(c, 96, 160, 128, 16, "#5a3a5a"); px(c, 96, 156, 128, 4, "#d8d0e8"); px(c, 180, 150, 20, 6, "#8a7aa8");
      px(c, 690, 16, 26, 176, "#5a3a20"); px(c, 690, 16, 26, 2, "#8a5a32");
      c.fillStyle = "#0a0808"; c.beginPath(); c.arc(703, 110, 5, 0, 7); c.fill(); c.beginPath(); c.moveTo(700, 112); c.lineTo(706, 112); c.lineTo(708, 126); c.lineTo(698, 126); c.fill();
      px(c, 676, 140, 16, 5, "#c8962a");
      px(c, 760, 40, 22, 40, "#1a2050"); for (let i = 0; i < 4; i++) px(c, 763 + hash(i, 4) * 16, 44 + hash(i, 5) * 30, 1, 1, "#ffffff");
    },
  });
}

// ---- 3. I Sought Him, and Found Him Not -----------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(12, 7, 18, 11).ledge(9, 11, 9, "a").fill(34, 6, 42, 11).ledge(31, 33, 8, "a").fill(56, 8, 62, 11).ledge(53, 55, 9, "a").set(38, 5, "l");
  g.set(24, 11, "w").set(48, 11, "w").set(68, 11, "w");
  room5("c5_street", {
    name: "I Sought Him, and Found Him Not", song: "lament", wall: "none", sky: "night", tiles: { 1: "brick", 2: "wood" }, legend: { a: ONEWAY }, dark: 0.75,
    map: g.rows(), doors: { 1: { to: "c5_door", door: "2" }, 2: { to: "c5_walls", door: "1" } },
    lights: [{ x: 340, y: 150, r: 90, flicker: 1 }, { x: 780, y: 150, r: 90, flicker: 1 }, { x: 1080, y: 150, r: 90, flicker: 1 }],
    texts: [
      { v: 6, part: [18, 31], style: "stars", x: 300, y: 14, w: 380, size: 14 },
      { v: 6, part: [31, 99], style: "stars", x: 800, y: 20, w: 340, size: 14 },
    ],
    paint(c) { for (const x of [340, 780, 1080]) { px(c, x - 1, 150, 3, 42, "#2a2228"); px(c, x - 5, 142, 10, 10, "#3a3030"); px(c, x - 3, 144, 6, 6, "#ffcf6a"); } },
    front(c, Wd, t) { houseFronts(c, [[12, 18, 7], [34, 42, 6], [56, 62, 8]], t); },
  });
}

// ---- 4. The Keepers of the Walls -----------------------------------------------------------------------------------
// Up the inside of the city wall. The keepers strike; the helmet lies in their
// guardroom; with it, butt the cracked stones above to break through.
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.fill(1, 20, 9, 20).set(5, 25, "P").fill(14, 21, 23, 21).fill(15, 21, 18, 21, "%").ledge(19, 23, 17, "s").ledge(12, 17, 14, "s").fill(1, 11, 23, 11).fill(13, 11, 14, 11, "%").ledge(2, 8, 8, "s").ledge(17, 22, 8, "s").ledge(12, 18, 5, "s").ledge(19, 23, 5, "s").set(20, 16, "h").set(3, 7, "l");
  g.set(13, 25, "w").set(20, 20, "w");
  room5("c5_walls", {
    name: "The Keepers of the Walls", song: "foes", wall: "cellar", sky: "none", tiles: { 1: "stone", 2: "stone" }, legend: { s: ONEWAY }, dark: 0.55, power: "helmet",
    map: g.rows(), doors: { 1: { to: "c5_street", door: "2" }, 2: { to: "c5_daughters", door: "1" } },
    lights: [{ x: 80, y: 380, r: 100, flicker: 1 }, { x: 300, y: 300, r: 100, flicker: 1 }, { x: 200, y: 120, r: 100, flicker: 1 }],
    texts: [
      { v: 7, part: [0, 15], style: "carved", x: 174, y: 362, w: 150, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#a89888" },
      { v: 7, part: [15, 99], style: "painted", x: 179, y: 47, w: 150, size: 9, color: "#2a1a10", panel: "parchment" },
    ],
    update() { hintOnce("crack", "Cracked stone overhead. With the helmet, jump into it from below to break it.", save.powers.helmet); },
    back(c, Wd, t) {
      // The veil, taken away, caught on a spear by the keepers' door.
      px(c, 330, 200, 2, 40, "#8a6a3a"); c.fillStyle = "rgba(240,240,255,0.7)"; c.beginPath(); c.moveTo(332, 202); c.quadraticCurveTo(350 + Math.sin(t * 2) * 4, 214, 344, 240); c.lineTo(332, 236); c.fill();
    },
  });
}

// ---- 5. O Daughters of Jerusalem ----------------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(26, 10, 30, 11).fill(44, 9, 49, 11).ledge(56, 60, 7, "a").set(58, 6, "l");
  room5("c5_daughters", {
    name: "O Daughters of Jerusalem", song: "river", wall: "none", sky: "dawn", tiles: { 1: "stone", 2: "marble" }, legend: { a: ONEWAY }, dust: "#a09888",
    map: g.rows(), doors: { 1: { to: "c5_walls", door: "2" }, 2: { to: "c5_image", door: "1" } },
    decor: [{ k: "banner", x: 620, y: 20, w: 260, h: 44, c: "#7a1f2b" }],
    texts: [
      { v: 8, style: "painted", x: 60, y: 40, w: 170, size: 9, color: "#2a1a10", panel: "parchment" },
      { v: 9, part: [0, 16], style: "sky", x: 280, y: 18, w: 300, size: 14, color: "rgba(255,250,240,0.9)" },
      { v: 9, part: [16, 99], style: "sky", x: 300, y: 76, w: 300, size: 14, color: "rgba(255,250,240,0.9)" },
      { v: 10, style: "gilded", x: 630, y: 30, w: 240, size: 10 },
    ],
    back(c, Wd, t) {
      // The daughters of Jerusalem in the square, turning to ask.
      for (let i = 0; i < 8; i++) { const x = 240 + i * 90 + (i > 3 ? 60 : 0); figure(c, x, 168 - (x > 704 && x < 784 ? 48 : x > 416 && x < 480 ? 32 : 0), { robe: ["#c86aa8", "#6a8ad0", "#e8b94a", "#7ac0a0"][i % 4], skin: "#e8b898", headcloth: "#f4ead4", h: 22, w: 9, face: Game.monk.x < x ? -1 : 1 }, t + i); }
    },
  });
}

// ---- 6. His Head Is as the Finest Gold ------------------------------------------------------------------------------------
// A colossal image of the beloved, as the bride describes him, climbed from
// its bases of gold up to its head; each verse beside the part it tells of.
{
  const g = G(25, 42).walls().floor(40).door(0, 37, 39, "1").door(24, 2, 4, "2");
  for (const [a, b, r] of [[14, 19, 37], [6, 11, 33], [13, 18, 29], [5, 10, 25], [13, 19, 21], [6, 11, 17], [13, 18, 13], [5, 10, 9], [12, 23, 5]]) g.ledge(a, b, r, "g");
  g.set(8, 24, "l");
  room5("c5_image", {
    name: "His Head Is as the Finest Gold", song: "heaven", wall: "palace", paper: "#16122a", sky: "none", tiles: { 1: "stone", 2: "gold" }, legend: { g: ONEWAY }, dark: 0.3,
    map: g.rows(), doors: { 1: { to: "c5_daughters", door: "2" }, 2: { to: "c5_whither", door: "1" } },
    lights: [{ x: 200, y: 120, r: 160, c: "rgba(255,220,140,0.45)" }, { x: 200, y: 400, r: 160, c: "rgba(220,220,255,0.3)" }],
    texts: [
      { v: 15, part: [0, 13], style: "carved", x: 219, y: 546, w: 140, size: 8.5, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#e8e0d4" },
      { v: 14, part: [11, 99], style: "painted", x: 28, y: 440, w: 110, size: 8.5, color: "#2a2a4a", panel: "plaque", panelColor: "#f4ecd8" },
      { v: 14, part: [0, 11], style: "gilded", x: 220, y: 360, w: 150, size: 8.5 },
      { v: 13, part: [0, 12], style: "painted", x: 26, y: 300, w: 120, size: 8.5, color: "#3a1a10", panel: "parchment" },
      { v: 13, part: [12, 99], style: "painted", x: 240, y: 240, w: 130, size: 8.5, color: "#3a1a10", panel: "parchment" },
      { v: 12, style: "kindle", x: 18, y: 162, w: 140, size: 9, reach: 180 },
      { v: 11, style: "gilded", x: 220, y: 110, w: 150, size: 9 },
      { v: 15, part: [13, 99], style: "carved", x: 28, y: 82, w: 130, size: 8, color: "rgba(30,20,14,0.9)", panel: "plaque", panelColor: "#c8a878" },
      { v: 16, style: "gilded", x: 130, y: 22, w: 170, size: 8.5 },
    ],
    paint(c) {
      // Bases of gold and legs as pillars of marble.
      px(c, 140, 610, 40, 30, "#c8962a"); px(c, 220, 610, 40, 30, "#c8962a"); px(c, 140, 610, 40, 3, "#fff0a0"); px(c, 220, 610, 40, 3, "#fff0a0");
      for (const x of [146, 226]) { px(c, x, 470, 28, 140, "#e8e0d4"); px(c, x, 470, 4, 140, "#ffffff"); px(c, x + 24, 470, 4, 140, "#a8a094"); }
      // The body of ivory set with sapphires.
      px(c, 136, 340, 128, 136, "#f0e6cc"); px(c, 136, 340, 6, 136, "#ffffff"); for (let i = 0; i < 14; i++) { const x = 146 + hash(i, 1) * 104, y = 352 + hash(i, 2) * 110; px(c, x, y, 5, 5, "#2a4ad0"); px(c, x + 1, y + 1, 2, 2, "#8aa8ff"); }
      // Hands of gold, full of hyacinths.
      for (const x of [104, 270]) { px(c, x, 340, 26, 90, "#c8962a"); px(c, x - 4, 420, 34, 22, "#e8b94a"); for (let i = 0; i < 8; i++) px(c, x - 4 + hash(i, x) * 30, 410 + hash(x, i) * 14, 3, 3, "#6a4ad0"); }
      // The neck, the face: cheeks as beds of spices, lips as lilies, eyes as doves.
      px(c, 182, 290, 36, 50, "#e8c8a8");
      c.fillStyle = "#e8c8a8"; c.beginPath(); c.ellipse(200, 210, 56, 74, 0, 0, 7); c.fill();
      for (const s of [-1, 1]) { for (let i = 0; i < 10; i++) px(c, 200 + s * 30 - 8 + hash(i, s + 3) * 16, 230 + hash(s + 3, i) * 14, 3, 3, ["#c8602a", "#e8b030", "#7a3a1a"][i % 3]); }
      for (let i = 0; i < 5; i++) { px(c, 186 + i * 6, 258, 2, 6, "#3a7a2e"); px(c, 184 + i * 6, 254, 6, 5, "#ffffff"); }
      // The head of finest gold, the locks like palm branches, black as a raven.
      c.fillStyle = "#e8b94a"; c.beginPath(); c.ellipse(200, 150, 58, 34, 0, Math.PI, 0); c.fill();
      for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; c.strokeStyle = "#0e0c14"; c.lineWidth = 3; c.beginPath(); c.moveTo(200 + Math.cos(a) * 50, 154 + Math.sin(a) * 30); c.quadraticCurveTo(200 + Math.cos(a) * 80, 154 + Math.sin(a) * 50 + 20, 200 + Math.cos(a) * 70, 154 + Math.sin(a) * 30 + 60); c.stroke(); }
    },
    back(c, Wd, t) { SCENE.dove(c, 182, 196, t, { face: 1, rate: 0.3 }); SCENE.dove(c, 218, 196, t, { face: -1, rate: 0.3, ph: 0.5 }); for (let i = 0; i < 4; i++) px(c, 170 + i * 20, 206 + Math.sin(t * 3 + i) * 1, 10, 1, "#a8d4ff"); },
  });
}

// ---- 7. Whither Is Thy Beloved Gone? ----------------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(16, 10, 20, 11).fill(36, 9, 42, 11).fill(56, 10, 60, 11).ledge(46, 50, 7, "a").set(48, 6, "l");
  room5("c5_whither", {
    name: "Whither Is Thy Beloved Gone?", song: "river", wall: "none", sky: "dawn", tiles: { 1: "earth" }, legend: { a: ONEWAY }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c5_image", door: "2" }, 2: { to: "END" } },
    texts: [{ v: 17, style: "sky", x: 300, y: 22, w: 520, size: 17, color: "rgba(255,250,240,0.9)" }],
    paint(c) {
      // A crossroads of signposts pointing every way.
      for (const x of [160, 520, 880]) { px(c, x, 120, 4, 72, "#6a4a2a"); for (let k = 0; k < 3; k++) { const dir = k % 2 ? -1 : 1; px(c, x + (dir > 0 ? 4 : -40), 124 + k * 16, 40, 10, "#c8a070"); px(c, x + (dir > 0 ? 44 : -46), 126 + k * 16, 6, 6, "#c8a070"); } }
      for (const x of [300, 700, 1040]) SCENE.cypress(c, x, 192, 60);
    },
  });
}
