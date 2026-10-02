"use strict";
// Canticle Mansion, Chapter I: "Let him kiss me with the kiss of his mouth."
// Through the great mouth into the house; the wine and the perfume; down into
// the king's storerooms; the tunnel out to the desert and the black tents of
// Cedar; the curtains of Solomon; the vineyard under the sun; the shepherds
// and their kids; Pharaoh's throne and his chariots; the chains of gold; the
// king at his repose and the bundle of myrrh; the vineyards of Engaddi; the
// fair one whose eyes are doves; and the bed beneath the beams of cedar.

CHAPTERS[0] = { start: "c1_hall", title: "The Kiss of His Mouth" };
const C1 = { chapter: 1 };
const room1 = (id, def) => { ROOMS[id] = Object.assign({ id, chapter: 1 }, def); };
// Once in a room: a little word of help, shown the first time only.
function hintOnce(key, text, cond) { if (!Game.flags[key] && cond) { Game.flags[key] = 1; Game.toast = { text, t: -1.5 }; } }
const near = (x, y, r) => { const m = Game.monk; return Math.hypot(m.x + m.w / 2 - x, m.y + m.h / 2 - y) < r; };

// ---- 1. The Kiss ------------------------------------------------------------------------------
// The entrance hall. A great face of marble fills the far wall; as the monk
// comes near, its lips part, and he walks in through its mouth.
{
  const g = G(50, 14).walls().floor(12);
  g.fill(9, 11, 11, 11).fill(15, 10, 17, 11).ledge(20, 23, 9).ledge(1, 4, 8).set(2, 7, "l").set(26, 11, "c");
  g.fill(32, 1, 37, 8, "X").door(49, 9, 11, "1");
  room1("c1_hall", {
    name: "The Kiss", song: "dream", wall: "mansion", paper: "#4a2232", pillar: "#a88a5a", sky: "none", hide: "X",
    tiles: { 1: "marble", 2: "marble" }, dark: 0.35, start: [3, 11],
    map: g.rows(), doors: { 1: { to: "c1_wine", door: "1" } },
    decor: [{ k: "window", x: 120, y: 56, w: 26, h: 44 }, { k: "window", x: 248, y: 56, w: 26, h: 44 }, { k: "torch", x: 70, y: 100 }, { k: "torch", x: 200, y: 100 }, { k: "torch", x: 456, y: 100 }, { k: "torch", x: 700, y: 100 }],
    lights: [{ x: 71, y: 96, r: 70, flicker: 1 }, { x: 201, y: 96, r: 70, flicker: 1 }, { x: 457, y: 96, r: 70, flicker: 1 }, { x: 701, y: 96, r: 70, flicker: 1 }, { x: 560, y: 170, r: 90, c: "rgba(255,200,170,0.3)" }],
    texts: [{ v: 1, style: "gilded", x: 128, y: 40, w: 352, size: 10, panel: "plaque", panelColor: "#3a1a26" }],
    init(Wd) {
      this.open = 0;
      Wd.movers.push({ x: 32 * T, y: 9 * T, w: 6 * T, h: 48, dx: 0, dy: 0, t: 0, solid: true, lips: true, draw() { } });
    },
    update(Wd, dt) {
      const m = Game.monk, dist = Math.abs(m.x + 5 - 560);
      this.open = clamp(this.open + (dist < 150 ? dt * 0.8 : -dt * 0.5), 0, 1);
      const blocker = Wd.movers.find((q) => q.lips);
      if (this.open > 0.55 && blocker) Wd.movers.splice(Wd.movers.indexOf(blocker), 1);
      if (this.open < 0.3 && !blocker && dist > 60) Wd.movers.push({ x: 32 * T, y: 9 * T, w: 6 * T, h: 48, dx: 0, dy: 0, t: 0, solid: true, lips: true, draw() { } });
      hintOnce("crate", "Stand by the crate and press the round button to lift it; press it again to set it down.", near(26 * T, 11 * T, 60));
    },
    paint(c) {
      // The marble face: a serene countenance, eyes closed, lips at the floor.
      const cx = 560, cy = 92;
      c.fillStyle = "#2a1820"; c.beginPath(); c.ellipse(cx, cy + 6, 86, 112, 0, 0, 7); c.fill();
      const grd = c.createRadialGradient(cx - 20, cy - 30, 10, cx, cy, 110); grd.addColorStop(0, "#f4e8dc"); grd.addColorStop(1, "#b8a494");
      c.fillStyle = grd; c.beginPath(); c.ellipse(cx, cy, 76, 104, 0, 0, 7); c.fill();
      // A veil of carved stone about the head.
      c.fillStyle = "#8a6a7a"; c.beginPath(); c.moveTo(cx - 84, cy + 120); c.quadraticCurveTo(cx - 100, cy - 60, cx, cy - 116); c.quadraticCurveTo(cx + 100, cy - 60, cx + 84, cy + 120); c.lineTo(cx + 70, cy + 120); c.quadraticCurveTo(cx + 84, cy - 50, cx, cy - 100); c.quadraticCurveTo(cx - 84, cy - 50, cx - 70, cy + 120); c.fill();
      // Brows, closed eyes, lashes.
      for (const s of [-1, 1]) {
        c.strokeStyle = "#6a5048"; c.lineWidth = 2; c.beginPath(); c.arc(cx + s * 28, cy - 34, 16, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.strokeStyle = "#4a3028"; c.beginPath(); c.arc(cx + s * 28, cy - 22, 13, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
        for (let i = 0; i < 5; i++) px(c, cx + s * 28 - 8 + i * 4, cy - 10, 1, 3, "#4a3028");
      }
      // The nose and the blush of the cheeks.
      c.strokeStyle = "#9a8070"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 2, cy - 20); c.lineTo(cx - 8, cy + 18); c.quadraticCurveTo(cx, cy + 24, cx + 8, cy + 18); c.stroke();
      c.fillStyle = "rgba(220,120,120,0.25)"; c.beginPath(); c.ellipse(cx - 44, cy + 20, 16, 9, 0, 0, 7); c.ellipse(cx + 44, cy + 20, 16, 9, 0, 0, 7); c.fill();
      // The mouth: the way through, warm and dim, light from the far side.
      const m = c.createLinearGradient(512, 0, 608, 0); m.addColorStop(0, "#2a0a12"); m.addColorStop(0.5, "#5a1a22"); m.addColorStop(1, "#ffcf9a");
      c.fillStyle = m; c.fillRect(512, 140, 96, 54);
    },
    front(c, Wd, t) {
      // The lips, parting: the lower one runs in front of the monk's feet.
      const o = this.open, cx = 560;
      const upB = lerp(170, 142, o), loT = lerp(170, 186, o);
      const lip = (y0, y1, up) => {
        c.fillStyle = "#3a0a14"; c.beginPath();
        if (up) { c.moveTo(cx - 62, y1); c.quadraticCurveTo(cx - 40, y0 - 4, cx - 10, y0); c.lineTo(cx, y0 + 4); c.lineTo(cx + 10, y0); c.quadraticCurveTo(cx + 40, y0 - 4, cx + 62, y1); c.quadraticCurveTo(cx, y1 + 6, cx - 62, y1); }
        else { c.moveTo(cx - 62, y0); c.quadraticCurveTo(cx, y0 - 4, cx + 62, y0); c.quadraticCurveTo(cx + 40, y1 + 6, cx, y1 + 8); c.quadraticCurveTo(cx - 40, y1 + 6, cx - 62, y0); }
        c.fill();
        c.fillStyle = up ? "#c8485a" : "#d85a6a"; c.beginPath();
        if (up) { c.moveTo(cx - 58, y1 - 1); c.quadraticCurveTo(cx - 40, y0 - 1, cx - 10, y0 + 2); c.lineTo(cx, y0 + 6); c.lineTo(cx + 10, y0 + 2); c.quadraticCurveTo(cx + 40, y0 - 1, cx + 58, y1 - 1); c.quadraticCurveTo(cx, y1 + 3, cx - 58, y1 - 1); }
        else { c.moveTo(cx - 58, y0 + 1); c.quadraticCurveTo(cx, y0 - 2, cx + 58, y0 + 1); c.quadraticCurveTo(cx + 38, y1 + 3, cx, y1 + 5); c.quadraticCurveTo(cx - 38, y1 + 3, cx - 58, y0 + 1); }
        c.fill();
        c.fillStyle = "rgba(255,200,210,0.6)"; if (up) c.fillRect(cx - 30, y0 + 3, 16, 2); else c.fillRect(cx - 14, y0 + 6, 28, 2);
      };
      lip(upB - 16, upB, true); lip(loT, 200, false);
    },
  });
}

// ---- 2. Wine and Ointments ----------------------------------------------------------------------
// The cellar of wine and the cabinet of perfumes. A great flask breathes its
// scent up a narrow shaft, strong enough to carry the monk; a jar of oil is
// poured out in a golden stream.
{
  const g = G(75, 14).walls().floor(12).door(0, 9, 11, "1");
  g.ledge(6, 12, 9).ledge(6, 12, 6).ledge(15, 21, 8).ledge(15, 21, 5);
  g.fill(27, 4, 27, 9).fill(30, 6, 45, 11);
  g.ledge(50, 55, 8).ledge(57, 62, 5).set(59, 4, "l").set(48, 11, "j").set(64, 11, "j");
  g.set(17, 2, "b").set(36, 2, "b").set(56, 2, "b");
  g.clear(68, 12, 70, 13).doorRow(13, 68, 70, "2");
  room1("c1_wine", {
    name: "Wine and Ointments", song: "alley", wall: "cellar", sky: "none", tiles: { 1: "cellar", 2: "shelf" }, dark: 0.55, dust: "#8a7060",
    map: g.rows(), doors: { 1: { to: "c1_hall", door: "1" }, 2: { to: "c1_store", door: "1" } },
    updrafts: [{ x: 28, y: 2, w: 2, h: 10, force: 2400, max: 170 }],
    lights: [{ x: 40, y: 60, r: 80, flicker: 1 }, { x: 230, y: 40, r: 80, flicker: 1 }, { x: 456, y: 150, r: 70, c: "rgba(255,170,220,0.3)" }, { x: 680, y: 40, r: 90, c: "rgba(255,210,90,0.4)" }, { x: 900, y: 50, r: 90, flicker: 1 }, { x: 1100, y: 60, r: 80, flicker: 1 }],
    texts: [
      { v: 2, part: [0, 6], style: "label", x: 356, y: 128, w: 56, size: 6.5, color: "#3a1030" },
      { v: 2, part: [6, 99], style: "smoke", x: 477, y: 18, w: 190, size: 11, color: "rgba(255,226,150," },
      { v: 3, part: [0, 13], style: "painted", x: 887, y: 26, w: 230, size: 11, color: "#3a2410", panel: "parchment" },
    ],
    update(Wd, dt) {
      const m = Game.monk;
      hintOnce("water", "Tap a bat to throw holy water at it.", Wd.foes.some((f) => f.alive && f.awake));
      hintOnce("shaft", "Ride the perfume up the shaft, or leap from wall to wall: jump beside a wall, then jump again.", near(28.5 * T, 9 * T, 70));
      // Perfume rising in the shaft.
      if (Math.random() < 0.5) Wd.parts.push({ x: 28 * T + Math.random() * 32, y: 11.5 * T, vx: (Math.random() - 0.5) * 10, vy: -60 - Math.random() * 60, g: 0, life: 2.4, c: Math.random() < 0.5 ? "#ffb0e0" : "#ffe0f4", s: 1 });
      // The oil, poured out.
      if (Math.random() < 0.7) Wd.parts.push({ x: 726 + Math.random() * 4, y: 64, vx: 8, vy: 40, g: 400, life: 0.5, c: Math.random() < 0.5 ? "#ffcf5a" : "#e8a030", s: 2 });
    },
    paint(c, Wd) {
      // Racks of wine in diamond lattices, and casks.
      const rack = (x0, x1, y0, y1) => {
        px(c, x0, y0, x1 - x0, y1 - y0, "#1e1410");
        for (let y = y0 + 4; y < y1 - 4; y += 8) for (let x = x0 + 4 + ((y / 8) % 2) * 4; x < x1 - 4; x += 8) { px(c, x, y, 5, 5, "#0a0606"); px(c, x + 1, y + 1, 3, 3, hash(x, y) > 0.3 ? (hash(y, x) > 0.5 ? "#4a1420" : "#24401c") : "#1e1410"); px(c, x + 1, y + 1, 1, 1, "#c88a9a"); }
        for (let x = x0; x < x1; x += 32) px(c, x, y0, 3, y1 - y0, "#4a3020");
      };
      rack(70, 400, 30, 190); rack(780, 1180, 140, 190);
      for (let i = 0; i < 4; i++) { const x = 1000 + i * 40, y = 158; c.fillStyle = "#5a3a20"; c.beginPath(); c.ellipse(x, y + 16, 17, 16, 0, 0, 7); c.fill(); px(c, x - 17, y + 6, 34, 2, "#2a1a10"); px(c, x - 17, y + 24, 34, 2, "#2a1a10"); }
      // The great perfume flask at the foot of the shaft, painted on the wall beside it.
      SCENE.perfume(c, 384, 150, { col: "#c86aa8", s: 2.6 });
      px(c, 352, 122, 64, 22, "#f0e0c8"); px(c, 352, 122, 64, 1, "#ffffff");
      // Shelves of perfumes in the right half.
      for (let i = 0; i < 12; i++) SCENE.perfume(c, 806 + i * 9, 120, { col: ["#c86aa8", "#6a8ad0", "#e8b94a", "#7ac0a0"][i % 4], s: 0.6 });
      // The jar of oil on the high floor, tilted, pouring.
      c.save(); c.translate(704, 66); c.rotate(-0.5); c.fillStyle = "#06040a"; c.beginPath(); c.ellipse(0, 0, 22, 28, 0, 0, 7); c.fill(); c.fillStyle = "#b86a3a"; c.beginPath(); c.ellipse(-1, -1, 20, 26, 0, 0, 7); c.fill(); px(c, -12, -18, 5, 26, "#d88a5a"); px(c, -8, -32, 16, 8, "#8a4a2a"); c.restore();
      px(c, 722, 64, 6, 32, "#e8b030"); px(c, 723, 64, 2, 32, "#fff0a0");
      // A basin of gold to catch it.
      px(c, 700, 86, 50, 10, "#c8962a"); px(c, 700, 86, 50, 2, "#fff0a0");
    },
  });
}

// ---- 3. The King's Storerooms ------------------------------------------------------------------
// Down the stair into the storerooms: crates to stack, jars and casks, rats,
// and up on a shelf, the staff. The way on is high on the far wall.
{
  const g = G(50, 28).walls().floor(26).doorRow(0, 16, 18, "1");
  g.fill(4, 10, 4, 23).ledge(1, 3, 9).set(2, 8, "l");
  g.ledge(7, 11, 22).set(9, 21, "P");
  for (const x of [13, 18, 22, 27]) g.set(x, 25, "c");
  g.set(23, 24, "c").set(5, 25, "j").set(6, 25, "j");
  g.fill(36, 21, 48, 25).ledge(44, 47, 18).ledge(39, 42, 15).ledge(44, 47, 12).ledge(40, 48, 9).door(49, 6, 8, "2");
  g.set(16, 25, "r").set(33, 25, "r").set(25, 3, "b").set(42, 4, "b");
  room1("c1_store", {
    name: "The King's Storerooms", song: "kings", wall: "storeroom", sky: "none", tiles: { 1: "wood", 2: "shelf" }, dark: 0.55, power: "staff", dust: "#a08060",
    map: g.rows(), doors: { 1: { to: "c1_wine", door: "2" }, 2: { to: "c1_tunnel", door: "1" } },
    lights: [{ x: 120, y: 60, r: 90, flicker: 1 }, { x: 420, y: 70, r: 110, flicker: 1 }, { x: 700, y: 90, r: 100, flicker: 1 }, { x: 160, y: 330, r: 110, flicker: 1 }, { x: 470, y: 340, r: 110, flicker: 1 }, { x: 740, y: 300, r: 100, flicker: 1 }],
    texts: [
      { v: 3, part: [13, 21], style: "painted", x: 210, y: 30, w: 330, size: 17, color: "rgba(240,210,150,0.7)" },
      { v: 3, part: [21, 99], style: "painted", x: 300, y: 172, w: 250, size: 10, color: "#3a2410", panel: "board", panelColor: "#c8a070" },
    ],
    update(Wd) {
      hintOnce("stack", "Stack crates to climb: set one down, lift another, stand on the first, set it down in front.", near(37 * T, 24 * T, 120));
    },
    paint(c) {
      // Shelves of goods: sacks, jars, bolts of cloth.
      const shelfRow = (x0, x1, y) => { px(c, x0, y, x1 - x0, 4, "#6a4424"); for (let x = x0 + 4; x < x1 - 8; x += 12) { const k = hash(x, y); if (k < 0.33) { px(c, x, y - 10, 9, 10, "#c8a878"); px(c, x + 3, y - 12, 3, 2, "#a8885a"); } else if (k < 0.66) { px(c, x, y - 12, 8, 12, "#a85a3a"); px(c, x + 1, y - 11, 2, 9, "#c87a5a"); } else { px(c, x, y - 8, 10, 8, ["#5a6aa8", "#a84a6a", "#5a8a5a"][Math.floor(k * 9) % 3]); } } };
      shelfRow(80, 560, 120); shelfRow(80, 560, 200); shelfRow(560, 780, 260);
      for (let i = 0; i < 6; i++) { const x = 340 + i * 36, y = 386; c.fillStyle = "#5a3a20"; c.beginPath(); c.ellipse(x, y, 16, 22, 0, 0, 7); c.fill(); px(c, x - 16, y - 12, 32, 2, "#2a1a10"); px(c, x - 16, y + 10, 32, 2, "#2a1a10"); px(c, x - 6, y - 18, 3, 30, "#7a5a34"); }
      // A stencilled crown, the king's mark.
      px(c, 380, 10, 30, 6, "#8a6a2a"); for (const dx of [0, 12, 24]) px(c, 380 + dx, 4, 6, 6, "#8a6a2a");
    },
  });
}

// ---- 4. The Tunnel --------------------------------------------------------------------------------
{
  const g = G(40, 14).walls().floor(12).door(0, 9, 11, "1");
  g.fill(1, 1, 32, 5).fill(8, 6, 12, 8).fill(18, 10, 20, 11).fill(24, 6, 27, 7);
  g.fill(33, 1, 33, 9).fill(37, 7, 38, 11).door(39, 4, 6, "2");
  g.set(15, 7, "b").set(29, 7, "b");
  room1("c1_tunnel", {
    name: "The Tunnel", song: "lament", wall: "cave", sky: "cave", tiles: { 1: "cave" }, dark: 0.93, dust: "#6a5a50",
    map: g.rows(), doors: { 1: { to: "c1_store", door: "2" }, 2: { to: "c1_desert", door: "1" } },
    lights: [{ x: 624, y: 84, r: 150, c: "rgba(255,230,170,0.5)" }, { x: 300, y: 150, r: 40, c: "rgba(120,160,255,0.2)" }],
    update(Wd) {
      hintOnce("leap", "Leap from wall to wall up the shaft: jump beside a wall, then jump again.", near(35 * T, 9 * T, 60));
      if (Math.random() < 0.04) Wd.parts.push({ x: (2 + Math.random() * 30) * T, y: 6 * T, vx: 0, vy: 20, g: 600, life: 0.6, c: "#8ab0d0", s: 1 });
    },
  });
}

// ---- 5. The Tents of Cedar ---------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(10, 11, 16, 11).fill(12, 10, 14, 10).fill(30, 11, 38, 11).fill(33, 10, 36, 10).fill(34, 9, 35, 9).fill(52, 11, 58, 11);
  g.ledge(21, 26, 7, "t").ledge(43, 49, 6, "t").ledge(62, 67, 7, "t");
  g.set(45, 5, "l");
  g.set(19, 11, "s").set(41, 11, "s").set(60, 11, "s");
  room1("c1_desert", {
    name: "The Tents of Cedar", song: "desert", wall: "none", sky: "desert", tiles: { 1: "sand" }, legend: { t: ONEWAY }, dust: "#e8c890",
    zones: [{ x0: 0, x1: 74, y0: 0, y1: 13, 2: "tent" }],
    map: g.rows(), doors: { 1: { to: "c1_tunnel", door: "2" }, 2: { to: "c1_curtains", door: "1" } },
    texts: [{ v: 4, part: [0, 15], style: "sky", x: 120, y: 18, w: 760, size: 19, color: "rgba(90,40,20,0.6)" }],
    paint(c) {
      SCENE.tent(c, 312, 112, 136, 80); SCENE.tent(c, 664, 96, 152, 96, { col: "#141014" }); SCENE.tent(c, 976, 112, 136, 80);
      SCENE.tent(c, 520, 140, 60, 52, { col: "#2a2226" });
      SCENE.palm(c, 160, 176, 70, 0); SCENE.palm(c, 880, 192, 84, 1);
      for (let i = 0; i < 40; i++) px(c, hash(i, 9) * 1200, 170 + hash(i, 8) * 20, 3, 1, "#c89858");
    },
  });
}

// ---- 6. The Curtains of Solomon ---------------------------------------------------------------------
// A chamber of waiting hung with rugs, one above another, to be climbed.
{
  const g = G(25, 28).walls().floor(26).door(0, 23, 25, "1").door(24, 2, 4, "2");
  g.ledge(6, 13, 15).climb(9, 14, 25);
  g.ledge(9, 17, 7).climb(15, 6, 18);
  g.ledge(18, 23, 5).ledge(2, 5, 3).set(3, 2, "l");
  room1("c1_curtains", {
    name: "The Curtains of Solomon", song: "shield", wall: "mansion", paper: "#3a1418", pillar: "#6a3a2a", sky: "none", tiles: { 1: "red", 2: "rafter" }, dark: 0.45,
    climb: { kind: "rope" },
    map: g.rows(), doors: { 1: { to: "c1_desert", door: "2" }, 2: { to: "c1_vineyard", door: "1" } },
    decor: [
      { k: "rug", x: 100, y: 248, w: 116, h: 150, c: "#7a1f2b", c2: "#e8b94a" },
      { k: "rug", x: 160, y: 120, w: 80, h: 160, c: "#2a3a7a", c2: "#e8d8a0" },
      { k: "rug", x: 300, y: 70, w: 70, h: 90, c: "#2a5a3a", c2: "#e8b94a" },
      { k: "rug", x: 24, y: 120, w: 56, h: 110, c: "#6a2a5a", c2: "#f0d0a0" },
    ],
    lights: [{ x: 200, y: 60, r: 120, flicker: 1 }, { x: 80, y: 360, r: 110, flicker: 1 }, { x: 340, y: 300, r: 100, flicker: 1 }],
    texts: [{ v: 4, part: [15, 99], style: "embroidered", x: 164, y: 168, w: 72, size: 10, color: "#ffe08a" }],
    update() { hintOnce("climb", "Jump onto a hanging rug and hold the jump to climb it.", near(9 * T, 24 * T, 60)); },
    paint(c) { for (let i = 0; i < 5; i++) { const x = 20 + i * 80; px(c, x, 400, 40, 16, ["#7a1f2b", "#2a3a7a", "#c8962a", "#2a5a3a", "#6a2a5a"][i]); px(c, x, 400, 40, 2, "#ffffff22"); } },
  });
}

// ---- 7. The Keeper of the Vineyards -----------------------------------------------------------------
// Under the sun the monk grows brown as he goes, as the verse says.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(18, 10, 30, 11).fill(42, 9, 55, 11).fill(56, 10, 58, 11);
  g.ledge(22, 28, 7).ledge(46, 52, 6).set(49, 5, "l");
  g.set(20, 3, "v").set(48, 2, "v").set(64, 3, "v");
  room1("c1_vineyard", {
    name: "The Keeper of the Vineyards", song: "river", wall: "none", sky: "vineyard", tiles: { 1: "vine", 2: "vine" }, dust: "#a08060",
    map: g.rows(), doors: { 1: { to: "c1_curtains", door: "2" }, 2: { to: "c1_meadow", door: "1" } },
    texts: [
      { v: 5, part: [0, 15], style: "kindle", x: 140, y: 30, w: 300, size: 12, reach: 260 },
      { v: 5, part: [15, 99], style: "painted", x: 940, y: 100, w: 150, size: 8, color: "#3a2410" },
    ],
    update() { const m = Game.monk; m.tan = Math.max(m.tan || 0, clamp((m.x - 60) / (70 * T), 0, 1) * 0.85); },
    paint(c, Wd) { SCENE.vines(c, 40, 150, 230, 0); SCENE.vines(c, 500, 150, 180, 0); SCENE.vines(c, 960, 150, 200, 0, { grape: "#2a5a2a" }); px(c, 936, 96, 158, 74, "#c8a070"); px(c, 936, 96, 158, 2, "#e8c890"); px(c, 940, 170, 4, 22, "#6a4a2a"); px(c, 1086, 170, 4, 22, "#6a4a2a"); },
    back(c, Wd, t) { SCENE.rays(c, Game.monk.x + 5, -40, 260, t); },
  });
}

// ---- 8. Where Thou Feedest ----------------------------------------------------------------------------
// The shepherd gives the monk three kids to lead to the shepherds' tent,
// past a stream and a wall too high for them: a crate makes them a step.
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.clear(21, 12, 23, 12).fill(21, 12, 23, 12, "~").fill(40, 9, 41, 11).set(33, 11, "c");
  room1("c1_meadow", {
    name: "Where Thou Feedest", song: "heaven", wall: "none", sky: "day", tiles: { 1: "earth" }, dust: "#8a7a50",
    map: g.rows(), doors: { 1: { to: "c1_vineyard", door: "2" }, 2: { to: "c1_throne", door: "1", locked: () => Game.flags.fed } },
    texts: [
      { v: 6, style: "sky", x: 120, y: 12, w: 520, size: 15, color: "rgba(255,255,255,0.75)" },
      { v: 7, style: "embroidered", x: 954, y: 84, w: 182, size: 9.5, color: "#e8cf8a" },
    ],
    init(Wd) {
      const sh = shepherd(6 * T, 12 * T - 26);
      sh.talk = () => {
        Game.say("A shepherd", CANTICLE[0][6], 7);
        if (!Game.flags.kids) { Game.flags.kids = 1; for (let i = 0; i < 3; i++) { const k = Kid(sh.x + 14 + i * 10, sh.y + 12, i); Wd.npcs.push(k); Game.flock.push(k); } Snd.sfx("bleat"); }
      };
      Wd.npcs.push(sh);
      if (!Game.flags.fed) Wd.movers.push({ x: 72 * T, y: 8 * T, w: T, h: 64, dx: 0, dy: 0, t: 0, solid: true, gate: true, draw: (c, mv) => { for (let i = 0; i < 4; i++) px(c, mv.x + 1, mv.y + i * 16 + 2, 14, 3, "#8a6a3a"); px(c, mv.x + 2, mv.y, 3, 64, "#6a4a2a"); px(c, mv.x + 11, mv.y, 3, 64, "#6a4a2a"); } });
      else for (let i = 0; i < 3; i++) { const k = Kid((63 + i * 3) * T, 11 * T, i); k.state = "eat"; Wd.npcs.push(k); }
      this.plants = 1;
    },
    update(Wd, dt) {
      const sh = Wd.npcs.find((n) => n.kind === "shepherd");
      if (sh && !Game.flags.kids && near(sh.x + 5, sh.y + 13, 44)) sh.talk(sh);
      for (const k of Game.flock) if (k.state === "follow" && k.x > 62 * T && k.x < 71 * T && k.ground) { k.state = "eat"; Snd.sfx("bleat"); }
      Game.flock = Game.flock.filter((k) => k.state !== "eat");
      const eating = Wd.npcs.filter((n) => n.kind === "kid" && n.state === "eat").length;
      if (eating) this.plants = Math.max(0.15, this.plants - dt * 0.02 * eating);
      if (eating >= 3 && !Game.flags.fed) {
        Game.flags.fed = 1; Snd.sfx("power"); Game.toast = { text: "Thy kids feed beside the tents of the shepherds. The gate is open.", t: 0 };
        const gate = Wd.movers.find((q) => q.gate); if (gate) Wd.movers.splice(Wd.movers.indexOf(gate), 1);
      }
      hintOnce("goats", "The kids follow you. A wall too high for them? Set a crate beside it as a step.", Game.flock.length && near(39 * T, 11 * T, 110));
    },
    paint(c) {
      // The shepherds' tent of black goat hair; the verse is woven into its front cloth,
      // between two bands of red and ochre such as the tent-weavers set in.
      SCENE.tent(c, 924, 36, 244, 156, { col: "#2a2226", door: false });
      px(c, 946, 66, 200, 126, "#3a2e2a");
      for (let i = 0; i < 14; i++) px(c, 946 + i * 15, 66, 1, 126, "#2e2420");
      for (let r = 0; r < 126; r += 3) px(c, 946, 66 + r, 200, 1, "rgba(0,0,0,0.12)");
      for (const by of [70, 160]) { px(c, 946, by, 200, 6, "#7a2a1e"); for (let i = 0; i < 200; i += 6) { px(c, 946 + i, by + 1, 3, 2, "#c8963a"); px(c, 949 + i, by + 3, 3, 2, "#c8963a"); } }
      px(c, 946, 66, 200, 1, "#4a3c36"); px(c, 945, 66, 1, 126, "#1a1416"); px(c, 1146, 66, 1, 126, "#1a1416");
      SCENE.cypress(c, 260, 192, 50); SCENE.cypress(c, 700, 192, 64);
      for (let i = 0; i < 12; i++) SCENE.flowers(c, 60 + i * 80, 190, 4, 0);
    },
    behind(c, Wd, t) {
      // Green herbs at the tent's foot, eaten down as the kids graze.
      const h = Math.round(10 * (this.plants || 1));
      for (let i = 0; i < 18; i++) { const x = 1000 + i * 8; px(c, x, 192 - h, 3, h, i % 2 ? "#5aa040" : "#3a8a2e"); px(c, x - 1, 192 - h, 5, 2, "#7ac05a"); }
    },
  });
}

// ---- 9. Pharaoh's Throne ---------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(19, 11, 30, 11).fill(21, 10, 28, 10);
  g.ledge(5, 10, 8, "g").ledge(39, 44, 8, "g").ledge(13, 17, 5, "g").ledge(32, 36, 5, "g").set(15, 4, "l");
  room1("c1_throne", {
    name: "Pharaoh's Throne", song: "kings", wall: "palace", paper: "#2a1a2e", sky: "none", tiles: { 1: "gold", 2: "gold" }, legend: { g: ONEWAY }, dark: 0.3,
    map: g.rows(), doors: { 1: { to: "c1_meadow", door: "2" }, 2: { to: "c1_chariots", door: "1" } },
    decor: [{ k: "banner", x: 262, y: 16, w: 228, h: 92, c: "#1e3a7a" }],
    lights: [{ x: 120, y: 80, r: 90, flicker: 1 }, { x: 680, y: 80, r: 90, flicker: 1 }, { x: 400, y: 120, r: 120, c: "rgba(255,210,120,0.4)" }],
    texts: [{ v: 8, style: "embroidered", x: 272, y: 30, w: 208, size: 11, color: "#ffe08a" }],
    init(Wd) {
      Wd.npcs.push({ kind: "pharaoh", x: 24 * T + 4, y: 10 * T - 30, w: 12, h: 30, t: 0, face: 1,
        draw: (c, n, t) => figure(c, n.x, n.y + Math.sin(t) * 0.5, { robe: "#f4f0e0", skin: "#b07a4a", nemes: true, sash: "#3a5aa8", w: 12, h: 30, face: Game.monk.x < n.x ? -1 : 1, still: true }, t) });
    },
    paint(c) {
      // The throne: gold, with wings and a step.
      px(c, 368, 96, 64, 64, "#8a6410"); px(c, 372, 100, 56, 56, "#c8962a"); px(c, 372, 100, 56, 3, "#fff0a0");
      for (const s of [-1, 1]) { c.fillStyle = "#c8962a"; c.beginPath(); c.moveTo(400 + s * 32, 110); c.lineTo(400 + s * 80, 90); c.lineTo(400 + s * 76, 112); c.lineTo(400 + s * 32, 128); c.fill(); for (let i = 0; i < 4; i++) px(c, 400 + s * (40 + i * 9) - 2, 100 - i * 3 + 10, 4, 10, "#3a5aa8"); }
      // Horsemen in relief along the walls.
      for (const x of [60, 600, 690]) { px(c, x, 120, 36, 18, "#5a4a3a"); px(c, x + 28, 108, 10, 16, "#5a4a3a"); px(c, x + 4, 138, 3, 14, "#5a4a3a"); px(c, x + 28, 138, 3, 14, "#5a4a3a"); px(c, x + 12, 102, 8, 18, "#6a5a48"); }
      for (const x of [140, 220, 560, 660]) SCENE.column(c, x, 16, 176, { col: "#c8b890", w: 16 });
    },
  });
}

// ---- 10. Pharaoh's Chariots -----------------------------------------------------------------------------
// A long chasm, and chariots running to and fro across it, two by two in step.
{
  const g = G(75, 14).floor(12, 0, 11).floor(12, 63, 74).door(0, 8, 11, "1").door(74, 8, 11, "2");
  const chariot = (x0, dx, ph) => ({ x: x0, y: 11.5, w: 3, h: 8, path: [dx, 0], period: 6, t: ph,
    draw(c, mv, t) {
      const x = Math.round(mv.x), y = Math.round(mv.y), dir = mv.dx >= 0 ? 1 : -1, fl = Math.floor(t * 10) % 2;
      // Two horses before the car.
      for (const k of [0, 1]) { const hx = dir > 0 ? x + 52 + k * 6 : x - 22 - k * 6; px(c, hx, y - 12, 18, 9, k ? "#5a3a2a" : "#7a4a2a"); px(c, hx + (dir > 0 ? 14 : -4), y - 20, 6, 10, k ? "#5a3a2a" : "#7a4a2a"); px(c, hx + 2 + fl * 2, y - 3, 2, 8, "#3a2a1a"); px(c, hx + 13 - fl * 2, y - 3, 2, 8, "#3a2a1a"); px(c, hx + (dir > 0 ? 16 : -4), y - 22, 4, 3, "#c83a3a"); }
      px(c, x, y, mv.w, 8, "#8a6410"); px(c, x, y, mv.w, 2, "#fff0a0"); px(c, x + 2, y + 2, mv.w - 4, 4, "#c8962a");
      px(c, x - 2, y - 14, 4, 16, "#c8962a");
      c.fillStyle = "#3a2410"; c.beginPath(); c.arc(x + mv.w / 2, y + 12, 8, 0, 7); c.fill(); c.fillStyle = "#e8b94a"; c.beginPath(); c.arc(x + mv.w / 2, y + 12, 3, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { const a = t * 6 * dir + i * Math.PI / 4; px(c, x + mv.w / 2 + Math.cos(a) * 6, y + 12 + Math.sin(a) * 6, 1, 1, "#e8b94a"); }
    } });
  room1("c1_chariots", {
    name: "Pharaoh's Chariots", song: "mountain", wall: "none", sky: "sunset", tiles: { 1: "sand" }, dust: "#d8b070",
    map: g.rows(), doors: { 1: { to: "c1_throne", door: "2" }, 2: { to: "c1_necklace", door: "1" } },
    movers: [chariot(12, 14, 0), chariot(27, 14, 3), chariot(42, 17, 0)],
    texts: [{ v: 9, style: "sky", x: 300, y: 22, w: 560, size: 19, color: "rgba(255,240,230,0.75)" }],
    update() { hintOnce("ride", "Ride the chariots across, and step from one to the next.", near(11 * T, 11 * T, 60)); },
    paint(c) { px(c, 192, 208, 816, 16, "#2a4a8a"); for (let i = 0; i < 60; i++) px(c, 192 + hash(i, 4) * 816, 210 + hash(i, 5) * 10, 6, 1, "#6a9ad0"); },
    back(c, Wd, t) {
      // Turtledoves wheeling about the words in the sky.
      for (let i = 0; i < 7; i++) { const a = t * 0.5 + i * 0.9; SCENE.dove(c, 560 + Math.cos(a) * 300, 52 + Math.sin(a * 2) * 26, t, { ph: i, face: -Math.sin(a) > 0 ? 1 : -1, col: "#e8d8c8" }); }
    },
  });
}

// ---- 11. Chains of Gold ---------------------------------------------------------------------------------------
// A giant bride sits enthroned. Up her lap, her hand, her arm to her shoulder
// the monk climbs. The little goldsmiths go about their own work: each takes a
// link of gold or silver from the heap at her feet, carries it up to her neck,
// sets it in the chain, and goes down for another. The verse is the chain.
{
  const g = G(30, 28).walls().floor(26).door(0, 23, 25, "1").door(29, 2, 4, "2");
  g.ledge(5, 12, 23, "k").ledge(13, 17, 20, "k").ledge(17, 21, 17, "k").ledge(21, 25, 14, "k").ledge(20, 24, 11, "k").ledge(9, 21, 8, "k").ledge(24, 28, 5, "k");
  g.climb(8, 9, 22);
  const path = [[40, 410], [120, 360], [220, 312], [300, 264], [360, 216], [340, 168], [240, 120], [170, 120]];
  // Distance along the goldsmiths' road, and the point at a given distance.
  const segs = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1])), road = segs.reduce((a, b) => a + b, 0);
  const at = (d) => { d = clamp(d, 0, road); for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const f = d / segs[i]; return [lerp(path[i][0], path[i + 1][0], f), lerp(path[i][1], path[i + 1][1], f)]; } d -= segs[i]; } return path[path.length - 1]; };
  const LINKS = 14;
  const made = () => clamp((Game.flags.links || 0) / LINKS, 0, 1);
  room1("c1_necklace", {
    name: "Chains of Gold", song: "festival", wall: "palace", paper: "#1a1428", sky: "none", tiles: { 1: "stone", 2: "marble" }, legend: { k: ONEWAY }, dark: 0.3,
    climb: { kind: "chain" },
    map: g.rows(), doors: { 1: { to: "c1_chariots", door: "2" }, 2: { to: "c1_repose", door: "1" } },
    lights: [{ x: 200, y: 140, r: 160, c: "rgba(255,220,150,0.35)" }, { x: 60, y: 380, r: 90, flicker: 1 }, { x: 420, y: 60, r: 90, flicker: 1 }],
    texts: [
      { v: 10, part: [0, 5], style: "chain", x: 190, y: 200, path: [[110, 168], [150, 196], [196, 206], [240, 196], [272, 170]], made: () => clamp(made() * 1.6, 0, 1), reach: 400 },
      { v: 10, part: [5, 99], style: "chain", x: 190, y: 210, path: [[96, 182], [140, 224], [196, 238], [252, 224], [288, 184]], made: () => clamp(made() * 1.6 - 0.5, 0, 1), reach: 400 },
    ],
    init() {
      this.path = path;
      if (Game.flags.links === undefined) Game.flags.links = 1;
      // Five goldsmiths, already about their work at different points of the road.
      this.smiths = [0, 1, 2, 3, 4].map((i) => ({ d: road * [0.05, 0.3, 0.55, 0.8, 0.95][i], up: i % 2 === 0, carry: i % 2 === 0 ? (i % 4 ? "silver" : "gold") : null, wait: i * 0.4, speed: 34 + i * 5 }));
    },
    update(Wd, dt) {
      for (const g of this.smiths) {
        if (g.wait > 0) { g.wait -= dt; continue; }
        if (g.up) {
          g.d += g.speed * dt;
          if (g.d >= road) {
            // At her neck: the link is set in the chain.
            g.d = road; g.up = false; g.wait = 0.8;
            if ((Game.flags.links || 0) < LINKS) { Game.flags.links = (Game.flags.links || 0) + 1; const [x, y] = at(road); Wd.glows.push({ x, y, r: 24, c: "rgba(255,230,140,0.6)", life: 0.5, max: 0.5 }); if (near(x, y, 160)) Snd.sfx("neume"); }
            g.carry = null;
          }
        } else {
          g.d -= g.speed * 1.6 * dt;
          if (g.d <= 0) {
            // At the heap: stoop, choose a link, and start up again.
            g.d = 0; g.up = true; g.wait = 0.9;
            g.carry = (Game.flags.links || 0) >= LINKS ? "jewel" : Math.random() < 0.5 ? "gold" : "silver";
          }
        }
      }
    },
    paint(c) {
      // The bride, enthroned: robe of blue and purple, a veil, a calm face.
      c.fillStyle = "#2a2a6a"; c.beginPath(); c.moveTo(60, 430); c.quadraticCurveTo(40, 280, 120, 200); c.quadraticCurveTo(190, 150, 300, 190); c.quadraticCurveTo(380, 230, 400, 300); c.lineTo(330, 300); c.quadraticCurveTo(300, 380, 200, 380); c.lineTo(120, 430); c.fill();
      c.fillStyle = "#3a3a8a"; c.beginPath(); c.moveTo(80, 430); c.quadraticCurveTo(70, 300, 130, 220); c.quadraticCurveTo(170, 300, 150, 430); c.fill();
      c.fillStyle = "#4a2a6a"; c.beginPath(); c.moveTo(120, 150); c.quadraticCurveTo(110, 70, 170, 40); c.quadraticCurveTo(240, 30, 250, 100); c.quadraticCurveTo(260, 170, 300, 200); c.lineTo(100, 220); c.fill();
      const sk = c.createRadialGradient(178, 90, 6, 180, 100, 60); sk.addColorStop(0, "#f4d4b8"); sk.addColorStop(1, "#c89a7a"); c.fillStyle = sk; c.beginPath(); c.ellipse(182, 100, 36, 48, 0.1, 0, 7); c.fill();
      c.fillStyle = "#e8c4a4"; c.fillRect(162, 140, 40, 34);
      c.strokeStyle = "#5a3a2a"; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.arc(182 + s * 14, 92, 7, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      c.strokeStyle = "#b8584a"; c.beginPath(); c.arc(184, 120, 8, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
      // The great hand resting on the knee.
      c.fillStyle = "#e0b898"; c.beginPath(); c.ellipse(240, 330, 34, 10, 0, 0, 7); c.fill();
    },
    back(c, Wd, t) {
      // The heap of links at her feet, gold and silver.
      for (let i = 0; i < 26; i++) { const x = 30 + (i * 7) % 44, y = 420 - Math.floor(i / 7) * 3 - (i % 3); c.strokeStyle = i % 3 ? "#e8b94a" : "#cfd6dc"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, 2.5, 1.6, i, 0, 7); c.stroke(); }
      // The goldsmiths on their road, going up laden and coming down empty-handed.
      (this.smiths || []).forEach((g, i) => {
        const [x0, y0] = at(g.d), x = x0 - 3, y = y0 - 14, working = g.wait > 0;
        figure(c, x, y + (working ? 2 : 0), { robe: ["#7a3a2a", "#3a5a2a", "#5a3a6a", "#2a4a6a", "#6a5a2a"][i], skin: "#e0b090", beard: "#e8e0d0", h: 14, w: 7, face: g.up ? (at(g.d + 4)[0] >= x0 ? 1 : -1) : (at(g.d - 4)[0] >= x0 ? 1 : -1), still: working }, t + i);
        if (g.carry === "jewel") { px(c, x + 1, y - 5, 5, 4, i % 2 ? "#5ad0e8" : "#e83a6a"); px(c, x + 2, y - 5, 2, 1, "#ffffff"); }
        else if (g.carry) { c.strokeStyle = g.carry === "gold" ? "#ffd04a" : "#e8eef4"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x + 3.5, y - 4, 3, 2, 0.3, 0, 7); c.stroke(); }
      });
    },
  });
}

// ---- 12. The King at His Repose -------------------------------------------------------------------------------
// The king sleeps; spikenard rises from its jars and lifts the monk; beyond,
// a bundle of myrrh as tall as a tower, to climb over a bed of thorns.
{
  const g = G(50, 28).walls().floor(26).door(0, 23, 25, "1").door(49, 3, 5, "2");
  g.ledge(17, 28, 14).fill(25, 25, 36, 25, "^").climb(30, 5, 24).ledge(32, 48, 6).set(44, 5, "l");
  g.set(20, 13, "b").set(40, 10, "b");
  room1("c1_repose", {
    name: "The King at His Repose", song: "dream", wall: "mansion", paper: "#2a2038", pillar: "#7a6a8a", sky: "none", tiles: { 1: "stone", 2: "rafter" }, dark: 0.5, thorn: "thorn",
    climb: { kind: "myrrh" },
    map: g.rows(), doors: { 1: { to: "c1_necklace", door: "2" }, 2: { to: "c1_engaddi", door: "1" } },
    updrafts: [{ x: 15, y: 9, w: 2, h: 17, force: 2400, max: 180 }],
    lights: [{ x: 120, y: 360, r: 110, flicker: 1 }, { x: 256, y: 380, r: 90, c: "rgba(255,200,240,0.4)" }, { x: 490, y: 120, r: 110, c: "rgba(255,220,160,0.35)" }, { x: 700, y: 60, r: 90, flicker: 1 }],
    texts: [
      { v: 11, style: "smoke", x: 168, y: 80, w: 170, size: 11, color: "rgba(255,226,250," },
      { v: 12, style: "painted", x: 300, y: 250, w: 130, size: 9, color: "#3a2410", panel: "parchment" },
    ],
    update(Wd) {
      if (Math.random() < 0.6) Wd.parts.push({ x: 15 * T + Math.random() * 32, y: 25 * T, vx: (Math.random() - 0.5) * 12, vy: -70 - Math.random() * 50, g: 0, life: 3, c: Math.random() < 0.5 ? "#f4c8f0" : "#ffffff", s: 1 });
      hintOnce("nard", "The spikenard's odour rises: stand in it and be lifted.", near(16 * T, 24 * T, 70));
    },
    paint(c) {
      // The couch, and the king asleep upon it, crowned.
      px(c, 40, 372, 140, 30, "#5a2a4a"); px(c, 40, 372, 140, 4, "#8a4a6a"); px(c, 36, 352, 12, 50, "#c8962a"); px(c, 176, 360, 10, 42, "#c8962a");
      c.fillStyle = "#e8dcc0"; c.beginPath(); c.ellipse(70, 366, 16, 8, 0, 0, 7); c.fill();
      c.fillStyle = "#3a4a8a"; c.beginPath(); c.ellipse(118, 366, 52, 12, 0, 0, 7); c.fill();
      c.fillStyle = "#d8a880"; c.beginPath(); c.ellipse(70, 356, 10, 9, 0, 0, 7); c.fill(); px(c, 62, 344, 16, 4, "#e8b94a"); for (const dx of [62, 69, 76]) px(c, dx, 340, 2, 4, "#e8b94a");
      c.strokeStyle = "#5a3a2a"; c.lineWidth = 1; c.beginPath(); c.moveTo(66, 356); c.lineTo(70, 357); c.stroke();
      // The jars of spikenard.
      for (const x of [240, 262]) { px(c, x, 392, 16, 24, "#06040a"); px(c, x + 1, 393, 14, 22, "#a86a9a"); px(c, x + 3, 395, 3, 18, "#d89ac8"); px(c, x + 4, 386, 8, 6, "#c8962a"); }
      // The bundle of myrrh: stems bound with gold bands.
      for (let x = 448; x < 544; x += 6) px(c, x, 80, 5, 330, hash(x, 2) > 0.5 ? "#6a4a2a" : "#8a6a3a");
      for (const y of [120, 240, 360]) { px(c, 444, y, 104, 8, "#c8962a"); px(c, 444, y, 104, 2, "#fff0a0"); }
      for (let i = 0; i < 30; i++) px(c, 446 + hash(i, 1) * 100, 70 + hash(i, 2) * 20, 4, 6, "#5a7a3a");
    },
    back(c, Wd, t) { const x = 70 + Math.sin(t) * 2; c.fillStyle = "rgba(255,255,255,0.7)"; c.font = "8px " + FONT.ui; c.fillText("z", x + 14, 330 - (t * 8) % 20); c.fillText("z", x + 20, 320 - ((t * 8 + 10) % 20)); },
  });
}

// ---- 13. The Vineyards of Engaddi ------------------------------------------------------------------------------
{
  const g = G(75, 14).floor(12).door(0, 8, 11, "1").door(74, 8, 11, "2");
  g.fill(20, 10, 23, 11).fill(24, 8, 25, 11).fill(26, 5, 33, 11).fill(34, 8, 36, 11);
  g.clear(38, 12, 44, 12).fill(38, 12, 44, 12, "~").ledge(48, 54, 9).ledge(58, 63, 7).set(29, 4, "l");
  g.set(30, 2, "v").set(56, 3, "v");
  room1("c1_engaddi", {
    name: "The Vineyards of Engaddi", song: "river", wall: "none", sky: "day", tiles: { 1: "rock", 2: "vine" }, dust: "#a09070",
    zones: [{ x0: 0, x1: 19, y0: 0, y1: 13, 1: "earth" }, { x0: 37, x1: 74, y0: 0, y1: 13, 1: "earth" }],
    map: g.rows(), doors: { 1: { to: "c1_repose", door: "2" }, 2: { to: "c1_gallery", door: "1" } },
    texts: [{ v: 13, style: "sky", x: 680, y: 18, w: 380, size: 17, color: "rgba(255,255,255,0.8)" }],
    paint(c) {
      SCENE.palm(c, 120, 192, 76, 0); SCENE.palm(c, 1080, 192, 64, 1);
      for (const [x, y] of [[300, 180], [780, 180], [860, 176], [980, 182]]) SCENE.henna(c, x, y, 0);
      SCENE.vines(c, 760, 150, 140, 0); SCENE.vines(c, 930, 150, 120, 0);
    },
    back(c, Wd, t) { SCENE.waterfall(c, 584, 80, 26, 120, t); },
    front(c, Wd, t) { for (const [x, y] of [[300, 180], [780, 180], [860, 176], [980, 182]]) for (let i = 0; i < 6; i++) px(c, x - 12 + hash(i, x) * 24, y - 8 + hash(i, y) * 12, 2, 2, Math.sin(t * 2 + i + x) > 0.5 ? "#ffffff" : "#f4e0f0"); },
  });
}

// ---- 14. Thy Eyes Are as Doves -----------------------------------------------------------------------------------
{
  const g = G(50, 14).walls().floor(12).door(0, 9, 11, "1").door(49, 9, 11, "2");
  g.fill(12, 10, 13, 11).fill(36, 10, 37, 11).ledge(3, 8, 8, "m").ledge(41, 46, 8, "m").set(44, 7, "l");
  room1("c1_gallery", {
    name: "Thy Eyes Are as Doves", song: "dream", wall: "mansion", paper: "#26283a", pillar: "#b8a888", sky: "none", tiles: { 1: "marble", 2: "marble" }, legend: { m: ONEWAY }, dark: 0.35,
    map: g.rows(), doors: { 1: { to: "c1_engaddi", door: "2" }, 2: { to: "c1_bed", door: "1" } },
    lights: [{ x: 160, y: 120, r: 80, flicker: 1 }, { x: 640, y: 120, r: 80, flicker: 1 }, { x: 400, y: 90, r: 140, c: "rgba(230,230,255,0.3)" }],
    texts: [{ v: 14, style: "gilded", x: 221, y: 26, w: 372, size: 9.5, panel: "plaque", panelColor: "#2a2030" }],
    paint(c) {
      // The portrait: a fair woman in a gilt frame, dark hair under a blue veil.
      px(c, 226, 40, 348, 156, "#8a6410"); px(c, 230, 44, 340, 148, "#e8b94a"); px(c, 236, 50, 328, 136, "#14142a");
      c.fillStyle = "#2a3a7a"; c.beginPath(); c.moveTo(286, 186); c.quadraticCurveTo(272, 40, 400, 44); c.quadraticCurveTo(528, 40, 514, 186); c.fill();
      c.fillStyle = "#3a2418"; c.beginPath(); c.moveTo(316, 186); c.quadraticCurveTo(306, 62, 400, 60); c.quadraticCurveTo(494, 62, 484, 186); c.fill();
      const sk = c.createRadialGradient(392, 104, 8, 400, 116, 80); sk.addColorStop(0, "#f8e0c8"); sk.addColorStop(1, "#d0a088");
      c.fillStyle = sk; c.beginPath(); c.ellipse(400, 116, 58, 66, 0, 0, 7); c.fill();
      c.fillStyle = "#3a2418"; c.beginPath(); c.moveTo(342, 92); c.quadraticCurveTo(372, 52, 400, 58); c.quadraticCurveTo(428, 52, 458, 92); c.quadraticCurveTo(430, 70, 400, 74); c.quadraticCurveTo(370, 70, 342, 92); c.fill();
      c.strokeStyle = "#5a3a2a"; c.lineWidth = 1.5; for (const sgn of [-1, 1]) { c.beginPath(); c.arc(400 + sgn * 30, 96, 14, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
      c.strokeStyle = "#a8786a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(399, 112); c.lineTo(395, 134); c.quadraticCurveTo(400, 138, 405, 134); c.stroke();
      c.fillStyle = "#c8586a"; c.beginPath(); c.ellipse(400, 152, 12, 4.5, 0, 0, 7); c.fill(); c.fillStyle = "#e88a9a"; c.fillRect(394, 150, 8, 1);
      c.fillStyle = "rgba(230,130,130,0.28)"; c.beginPath(); c.ellipse(362, 136, 12, 7, 0, 0, 7); c.ellipse(438, 136, 12, 7, 0, 0, 7); c.fill();
      // The hollows where the eyes would be, where the doves sit.
      c.fillStyle = "rgba(90,60,60,0.25)"; c.beginPath(); c.ellipse(370, 112, 18, 9, 0, 0, 7); c.ellipse(430, 112, 18, 9, 0, 0, 7); c.fill();
      for (const x of [140, 660]) SCENE.candelabrum(c, x, 150, 0);
    },
    back(c, Wd, t) {
      // Her eyes are doves: two white doves, facing each other, now and then lifting their wings.
      SCENE.dove(c, 368, 112, t, { face: 1, s: 1.8, rate: 0.35, ph: 0 });
      SCENE.dove(c, 432, 112, t, { face: -1, s: 1.8, rate: 0.35, ph: 0.5 });
      for (const x of [140, 660]) for (const dx of [-10, 0, 10]) SCENE.candle(c, x + dx - 1, 144 + (dx ? 4 : 0), t);
    },
  });
}

// ---- 15. Our Bed Is Flourishing ---------------------------------------------------------------------------------
// The bed, flowering, to bounce upon; above, the beams of cedar and the rafters
// of cypress, and a window high under the roof.
{
  const g = G(50, 20).walls().floor(18).door(0, 15, 17, "1").door(49, 2, 4, "2");
  g.fill(14, 16, 30, 17).fill(14, 15, 30, 15, "B");
  g.ledge(6, 12, 10).ledge(32, 38, 10).ledge(16, 28, 6).ledge(30, 37, 5).ledge(40, 48, 5).set(9, 9, "l");
  room1("c1_bed", {
    name: "Our Bed Is Flourishing", song: "heaven", wall: "mansion", paper: "#3a2a1e", pillar: "#9a5a32", sky: "none", tiles: { 1: "cedar", 2: "rafter" }, dark: 0.35,
    map: g.rows(), doors: { 1: { to: "c1_gallery", door: "2" }, 2: { to: "END" } },
    lights: [{ x: 360, y: 200, r: 160, c: "rgba(255,210,160,0.35)" }, { x: 760, y: 50, r: 110, c: "rgba(200,220,255,0.45)" }, { x: 80, y: 220, r: 80, flicker: 1 }],
    texts: [
      { v: 15, style: "embroidered", x: 244, y: 30, w: 220, size: 10, color: "#ffe8b0" },
      { v: 16, style: "carved", x: 550, y: 107, w: 196, size: 10, color: "rgba(40,20,8,0.9)", panel: "board", panelColor: "#b07040" },
    ],
    update() { hintOnce("bed", "Bounce on the bed: hold the jump as you land to fly higher.", near(22 * T, 14 * T, 90)); },
    paint(c) {
      // The canopy, hung from the rafters.
      px(c, 232, 24, 256, 54, "#5a1a2a"); px(c, 232, 24, 256, 3, "#8a3a4a"); for (let x = 232; x < 488; x += 8) px(c, x, 78, 6, 6, "#5a1a2a");
      px(c, 222, 24, 6, 230, "#6a3a1a"); px(c, 492, 24, 6, 230, "#6a3a1a");
      // The headboard and the coverlet.
      px(c, 214, 170, 18, 74, "#7a4a22"); px(c, 214, 170, 18, 3, "#a86a3a"); c.fillStyle = "#7a4a22"; c.beginPath(); c.arc(223, 172, 12, Math.PI, 0); c.fill();
      // The beams overhead: cedar, the grain running along.
      for (const y of [16, 120]) { px(c, 0, y - 6, 800, 8, "#7a4220"); px(c, 0, y - 6, 800, 1, "#a86a3a"); for (let x = 0; x < 800; x += 24) px(c, x, y - 4, 10, 1, "#5a2a10"); }
      // A window to the night, high on the right.
      px(c, 760, 30, 26, 40, "#2a1a14"); px(c, 762, 32, 22, 36, "#1a2050"); px(c, 772, 32, 2, 36, "#2a1a14"); for (let i = 0; i < 5; i++) px(c, 764 + hash(i, 1) * 18, 34 + hash(i, 2) * 30, 1, 1, "#ffffff");
    },
    behind(c, Wd, t) {
      // The coverlet over the bed, and the flowers that grow along it.
      px(c, 224, 240, 272, 6, "#c8b0d8"); px(c, 224, 240, 272, 2, "#f0e0ff");
      for (let i = 0; i < 34; i++) { const x = 228 + i * 8, h = 3 + Math.round(2 + Math.sin(t * 1.3 + i) * 2); px(c, x, 240 - h, 1, h, "#3a8a2e"); px(c, x - 1, 240 - h - 2, 3, 3, ["#ff7aa8", "#ffffff", "#ffe08a", "#c8a0ff"][i % 4]); }
    },
  });
}
