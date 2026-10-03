"use strict";
// Luminaries: the Doctors from St. John of Ávila to St. John Henry Newman.

STAGES.push(
  // ---- St. John of Ávila ----------------------------------------------------------------------------
  {
    id: "avila", n: 29, name: "St. John of Ávila", short: "John of Ávila", title: "Apostle of Andalusia", life: "1499–1569", place: "Montilla",
    song: "avila", scale: [64, 65, 68, 69, 71, 72, 74, 76],
    colors: { a: ["#1e5ac8", "#8ab4ff", "#0a2460"], b: ["#f08a24", "#ffd090", "#8a4204"], line: "#ffffff", panel: "rgba(6,14,36,0.55)", ink: "#f4f8ff", accent: "#ffb050" },
    gift: { name: "Audi, Filia", about: "Listen, daughter, to his little book: every square on the field is taken at once, with every block of its colour joined to it.", kind: "sweep" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,255,255,0.45)" : "rgba(120,50,0,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s / 2, s * 0.25); c.lineTo(s * 0.75, s / 2); c.lineTo(s / 2, s * 0.75); c.lineTo(s * 0.25, s / 2); c.closePath(); c.moveTo(s / 2, s * 0.38); c.lineTo(s / 2, s * 0.62); c.moveTo(s * 0.38, s / 2); c.lineTo(s * 0.62, s / 2); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a1a4a"], [0.5, "#3a4aa0"], [1, "#f0a050"]]);
      // Azulejos: a wall of blue-and-white tiles, the pattern turning with the music.
      for (let y = 0; y < 360; y += 32) for (let x = 0; x < 640; x += 32) {
        const k = (Math.floor(x / 32) + Math.floor(y / 32)) % 2, sp = Math.sin(t * 0.5 + (x + y) * 0.01) * 0.5 + 0.5;
        c.fillStyle = `rgba(240,246,255,${0.07 + k * 0.03})`; c.fillRect(x + 1, y + 1, 30, 30);
        c.strokeStyle = `rgba(40,90,200,${0.25 + sp * 0.2 + pulse * 0.1})`; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 16, y + 16, 9, 0, TAU); c.moveTo(x + 16, y + 3); c.lineTo(x + 16, y + 29); c.moveTo(x + 3, y + 16); c.lineTo(x + 29, y + 16); c.stroke();
      }
      // The sun of the south, low and orange.
      BG.glow(c, 320, 360, 280, "rgba(255,170,70,0.6)", 0.5 + energy * 0.4 + pulse * 0.15);
      // Orange trees in the patio.
      for (const x of [40, 600, 140, 500]) { c.fillStyle = "#1a3a1a"; c.beginPath(); c.arc(x, 300, 34, 0, TAU); c.fill(); c.fillStyle = "#3a2410"; c.fillRect(x - 3, 320, 6, 40); for (let i = 0; i < 6 + L; i++) { c.fillStyle = "#ff9a20"; c.beginPath(); c.arc(x + Math.cos(i * 2.4) * 22, 300 + Math.sin(i * 2.4) * 20, 3.5, 0, TAU); c.fill(); } }
    },
  },
  // ---- St. Peter Canisius --------------------------------------------------------------------------
  {
    id: "canisius", n: 32, name: "St. Peter Canisius", short: "Canisius", title: "Second Apostle of Germany", life: "1521–1597", place: "Fribourg",
    song: "canisius", scale: [62, 64, 66, 69, 71, 74, 76, 78],
    colors: { a: ["#1a2a7a", "#7a8ae8", "#080e3a"], b: ["#f0ead8", "#ffffff", "#a8a08a"], line: "#ffffff", panel: "rgba(6,8,30,0.6)", ink: "#f4f4ff", accent: "#a8b8ff" },
    gift: { name: "The Catechism", about: "Every answer in its place: the next three blocks come in one colour.", kind: "mono" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,255,255,0.4)" : "rgba(40,50,120,0.4)"; c.lineWidth = 1; c.beginPath(); for (const y of [0.32, 0.45, 0.58, 0.7]) { c.moveTo(s * 0.25, s * y); c.lineTo(s * 0.75, s * y); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#04061e"], [0.6, "#14205a"], [1, "#3a4a8a"]]);
      // Printed pages, flying off the press, line after line.
      for (let i = 0; i < 14 + L * 4; i++) {
        const k = (t * (0.05 + hash(i + 320) * 0.05) + hash(i + 321)) % 1, x = 20 + hash(i + 322) * 600 + Math.sin(t + i) * 10, y = 380 - k * 420, r = Math.sin(t * 0.7 + i) * 0.4;
        c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = "rgba(240,234,216,0.4)"; c.fillRect(-14, -18, 28, 36);
        c.fillStyle = "rgba(30,40,100,0.35)"; for (let l = 0; l < 7; l++) c.fillRect(-10, -13 + l * 4.4, 14 + hash(i * 7 + l) * 6, 1.4); c.restore();
      }
      // The road across Germany: a long line he walked, marked with milestones in time.
      c.strokeStyle = `rgba(170,184,255,${0.3 + pulse * 0.3})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -t * 30; c.beginPath(); c.moveTo(0, 340); c.bezierCurveTo(200, 300, 440, 380, 640, 330); c.stroke(); c.setLineDash([]);
      BG.glow(c, 320, 60, 180, "rgba(170,184,255,0.3)", 0.4 + energy * 0.4);
    },
  },
  // ---- St. Lawrence of Brindisi -------------------------------------------------------------------------
  {
    id: "lawrence", n: 33, name: "St. Lawrence of Brindisi", short: "Lawrence of Brindisi", title: "the Apostolic Doctor", life: "1559–1619", place: "Brindisi",
    song: "lawrence", scale: [55, 57, 58, 60, 62, 63, 66, 67],
    colors: { a: ["#b81424", "#ff7080", "#58040c"], b: ["#9aa4b0", "#e4eaf0", "#4a525c"], line: "#ffffff", panel: "rgba(20,6,8,0.6)", ink: "#fff2f2", accent: "#ff8090" },
    gift: { name: "The Crucifix at the Front", about: "He rode ahead of the army with only a crucifix: the lowest row is struck away, and everything above it settles.", kind: "bottom" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,210,210,0.5)" : "rgba(40,46,54,0.5)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s / 2, s * 0.22); c.lineTo(s / 2, s * 0.78); c.moveTo(s * 0.32, s * 0.38); c.lineTo(s * 0.68, s * 0.38); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a0408"], [0.5, "#6a1018"], [1, "#c86a3a"]]);
      // Dust and smoke over the plain of Hungary.
      for (let i = 0; i < 12; i++) { const x = ((t * (8 + i) + i * 90) % 800) - 80; c.fillStyle = "rgba(200,140,110,0.12)"; c.beginPath(); c.ellipse(x, 230 + Math.sin(i) * 20, 90, 22, 0, 0, TAU); c.fill(); }
      BG.ridge(c, 290, 10, 0.01, "#3a0e10", 1);
      // Banners and lances on the march, in rank.
      for (let i = 0; i < 16; i++) { const x = ((i * 44 - t * 14) % 704 + 704) % 704 - 32, h = 70 + (i % 3) * 14; c.strokeStyle = "#1a0608"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 330); c.lineTo(x, 330 - h); c.stroke(); if (i % 4 === 0) { c.fillStyle = i % 8 ? "#b81424" : "#e4eaf0"; c.beginPath(); c.moveTo(x, 330 - h); c.lineTo(x + 22 + Math.sin(t * 4 + i) * 3, 330 - h + 7); c.lineTo(x, 330 - h + 14); c.fill(); } }
      // The crucifix held high at the front, shining.
      BG.glow(c, 320, 120, 90 + L * 14, "rgba(255,220,180,0.75)", 0.6 + energy * 0.4 + pulse * 0.2);
      c.fillStyle = "#fff0dc"; c.fillRect(317, 80, 6, 80); c.fillRect(300, 100, 40, 6);
    },
  },
  // ---- St. Robert Bellarmine -----------------------------------------------------------------------------
  {
    id: "bellarmine", n: 34, name: "St. Robert Bellarmine", short: "Bellarmine", title: "Prince of Apologists", life: "1542–1621", place: "Rome",
    song: "bellarmine", scale: [58, 60, 62, 63, 65, 67, 69, 70],
    colors: { a: ["#b0102a", "#ff6a80", "#560410"], b: ["#f2ead8", "#ffffff", "#aaa08a"], line: "#ffffff", panel: "rgba(24,4,8,0.6)", ink: "#fff4ee", accent: "#ff7a90" },
    gift: { name: "The Mind's Ascent", about: "Climbing the ladder of created things, unhurried: for thirty seconds the blocks fall at half speed.", kind: "calm" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,220,220,0.45)" : "rgba(130,20,30,0.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.35, s * 0.2); c.lineTo(s * 0.35, s * 0.8); c.moveTo(s * 0.65, s * 0.2); c.lineTo(s * 0.65, s * 0.8); for (const y of [0.35, 0.5, 0.65]) { c.moveTo(s * 0.35, s * y); c.lineTo(s * 0.65, s * y); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#14020a"], [0.55, "#4a0a18"], [1, "#a85a4a"]]);
      // The ladder of created things, rising into light: fifteen rungs.
      BG.glow(c, 320, 20, 220, "rgba(255,240,210,0.6)", 0.5 + energy * 0.5);
      c.strokeStyle = "rgba(242,234,216,0.55)"; c.lineWidth = 3;
      const lean = (y) => 320 + (y - 360) * -0.02;
      c.beginPath(); c.moveTo(lean(360) - 60, 360); c.lineTo(lean(0) - 26, 0); c.moveTo(lean(360) + 60, 360); c.lineTo(lean(0) + 26, 0); c.stroke();
      const climb = (t * 0.6) % 15;
      for (let i = 0; i < 15; i++) { const y = 350 - i * 24, w = 60 - i * 2.3, lit = i <= climb; c.strokeStyle = lit ? `rgba(255,240,210,${0.6 + pulse * 0.3})` : "rgba(242,234,216,0.3)"; c.lineWidth = lit ? 3 : 2; c.beginPath(); c.moveTo(lean(y) - w, y); c.lineTo(lean(y) + w, y); c.stroke(); }
      // A cardinal's red, the hems of the robe, falling in folds at the sides.
      for (const x of [0, 600]) { c.fillStyle = grad(c, x, 0, x + 40, 0, [[0, "#6a0410"], [0.5, "#b0102a"], [1, "#6a0410"]]); c.fillRect(x, 0, 40, 360); }
      BG.drift(c, t, 20 + L * 8, 341, "rgba(255,230,200,0.7)", -1, 10, 1.6, 6);
    },
  },
  // ---- St. Francis de Sales ---------------------------------------------------------------------------
  {
    id: "francis", n: 35, name: "St. Francis de Sales", short: "Francis de Sales", title: "Doctor of Charity", life: "1567–1622", place: "Annecy",
    song: "francis", scale: [65, 67, 69, 72, 74, 76, 77, 79],
    colors: { a: ["#3a8ad8", "#a8d4ff", "#0e3a6e"], b: ["#f0a8b8", "#ffe0e8", "#9a5060"], line: "#ffffff", panel: "rgba(6,18,34,0.5)", ink: "#f4faff", accent: "#ffc0d0" },
    gift: { name: "Gentleness", about: "Nothing hurried: for twenty seconds the blocks hang where they are, until you let them fall.", kind: "hang" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,255,255,0.4)" : "rgba(150,60,80,0.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.5, s * 0.72); c.bezierCurveTo(s * 0.2, s * 0.5, s * 0.3, s * 0.25, s * 0.5, s * 0.4); c.bezierCurveTo(s * 0.7, s * 0.25, s * 0.8, s * 0.5, s * 0.5, s * 0.72); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#3a5a9a"], [0.5, "#a8b8e0"], [1, "#f4c8c8"]]);
      // The mountains round Lake Annecy, and their reflection.
      BG.ridge(c, 210, 60, 0.008, "#5a6a9a", 1, true);
      BG.ridge(c, 230, 30, 0.013, "#7a8ab8", 3, true);
      c.fillStyle = grad(c, 0, 230, 0, 360, [[0, "#6a9ad8"], [1, "#2a5a9a"]]); c.fillRect(0, 230, 640, 130);
      c.save(); c.globalAlpha = 0.25; c.translate(0, 460); c.scale(1, -1); BG.ridge(c, 210, 60, 0.008, "#5a6a9a", 1, true); c.restore();
      BG.ripples(c, 320, 300, t, 5 + L, `rgba(255,255,255,${0.25 + energy * 0.3})`, 10, 0.18);
      // A small boat, drifting, and a gentle sun.
      BG.glow(c, 470, 120, 90, "rgba(255,230,220,0.7)", 0.5 + pulse * 0.2);
      const bx = 100 + ((t * 6) % 460); c.fillStyle = "#2a1a1a"; c.beginPath(); c.moveTo(bx - 14, 268); c.lineTo(bx + 14, 268); c.lineTo(bx + 9, 274); c.lineTo(bx - 9, 274); c.fill(); c.fillStyle = "#fff4f4"; c.beginPath(); c.moveTo(bx, 246); c.lineTo(bx, 266); c.lineTo(bx + 12, 266); c.fill();
      BG.drift(c, t, 16 + L * 4, 351, "rgba(255,210,225,0.8)", 1, 8, 2.4, 30);
    },
  },
  // ---- St. Alphonsus Liguori -------------------------------------------------------------------------
  {
    id: "alphonsus", n: 36, name: "St. Alphonsus Liguori", short: "Alphonsus", title: "Prince of Moralists", life: "1696–1787", place: "Naples",
    song: "alphonsus", scale: [57, 59, 60, 62, 64, 65, 68, 69],
    colors: { a: ["#1a3ab8", "#8aa4ff", "#081a5a"], b: ["#f8e030", "#fff8a0", "#9a8404"], line: "#ffffff", panel: "rgba(4,8,30,0.55)", ink: "#f8f8ff", accent: "#ffe860" },
    gift: { name: "A Visit", about: "Stay a while before the Blessed Sacrament: the line of light waits eight beats while you build; then it sweeps.", kind: "hold" },
    motif: (c, k, s) => { if (k === "b") { c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(s * 0.45, s * 0.45, s * 0.14, s * 0.1, -0.5, 0, TAU); c.fill(); } else { c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * 0.07 : s * 0.17; c.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } c.fill(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#020624"], [0.6, "#0e1e5a"], [1, "#2a3a7a"]]);
      BG.stars(c, t, 110, 361, 0.8, 260);
      // "Tu scendi dalle stelle": a star coming down, again and again.
      const k = (t * 0.12) % 1; BG.glow(c, 120 + k * 400, 20 + k * 200, 30, "rgba(255,240,160,0.9)", 1 - k);
      // Vesuvius, smoking, across the bay.
      c.fillStyle = "#0a0e2a"; c.beginPath(); c.moveTo(340, 300); c.lineTo(460, 200); c.lineTo(490, 204); c.lineTo(620, 300); c.fill();
      for (let i = 0; i < 8; i++) { const sy = 196 - ((t * 10 + i * 20) % 160); c.fillStyle = `rgba(160,160,190,${0.15 * (1 - (196 - sy) / 160)})`; c.beginPath(); c.arc(475 + Math.sin(t * 0.3 + i) * 10 + (196 - sy) * 0.3, sy, 10 + (196 - sy) * 0.15, 0, TAU); c.fill(); }
      // The bay of Naples, lit windows along the shore.
      c.fillStyle = "#06103a"; c.fillRect(0, 300, 640, 60);
      for (let i = 0; i < 30 + L * 5; i++) { const x = hash(i + 362) * 640, y = 290 + hash(i + 363) * 10; c.fillStyle = `rgba(255,${200 + hash(i) * 40},120,${0.5 + pulse * 0.4 * (i % 3 === 0 ? 1 : 0.3)})`; c.fillRect(x, y, 2, 3); c.fillStyle = "rgba(255,220,140,0.15)"; c.fillRect(x, 304, 2, 18 + energy * 10); }
      // Lemons hanging in the corners.
      for (const [x, y] of [[30, 30], [70, 50], [600, 40], [560, 24]]) { c.fillStyle = "#f8e030"; c.beginPath(); c.ellipse(x, y, 9, 6.5, 0.4, 0, TAU); c.fill(); c.fillStyle = "#1a4a1a"; c.beginPath(); c.ellipse(x - 8, y - 8, 7, 3, -0.6, 0, TAU); c.fill(); }
    },
  },
  // ---- St. John Henry Newman --------------------------------------------------------------------------
  {
    id: "newman", n: 37, name: "St. John Henry Newman", short: "Newman", title: "Cardinal and Convert", life: "1801–1890", place: "Oxford",
    song: "newman", scale: [56, 58, 60, 63, 65, 67, 68, 70],
    colors: { a: ["#7a8aa0", "#d0dae8", "#2e3a4c"], b: ["#f0a830", "#ffe0a0", "#8a5404"], line: "#fff4dc", panel: "rgba(10,14,22,0.6)", ink: "#f4f6fa", accent: "#ffc060" },
    gift: { name: "Kindly Light", about: "One step enough: the next block carries a light, and when it makes a square, all its colour joined to it goes.", kind: "lumen" },
    motif: (c, k, s) => { if (k === "b") { c.fillStyle = "rgba(255,250,230,0.6)"; c.beginPath(); c.ellipse(s / 2, s * 0.48, s * 0.06, s * 0.13, 0, 0, TAU); c.fill(); } else { c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.2, s * 0.6); c.quadraticCurveTo(s * 0.5, s * 0.4, s * 0.8, s * 0.6); c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a0e18"], [0.6, "#2a3448"], [1, "#4a5468"]]);
      // Oxford's spires in the fog.
      c.fillStyle = "#1a2030";
      for (const [x, h, w] of [[60, 170, 30], [150, 120, 40], [250, 190, 22], [400, 150, 36], [520, 200, 24], [600, 130, 40]]) { c.fillRect(x - w / 2, 360 - h + 30, w, h); c.beginPath(); c.moveTo(x - w / 2, 360 - h + 30); c.lineTo(x, 360 - h - 30); c.lineTo(x + w / 2, 360 - h + 30); c.fill(); }
      for (let i = 0; i < 6; i++) { const x = ((t * (5 + i) + i * 130) % 900) - 130; c.fillStyle = "rgba(200,210,225,0.12)"; c.beginPath(); c.ellipse(x, 230 + i * 18, 160, 24, 0, 0, TAU); c.fill(); }
      // The lamp, and the path lit one step ahead of the walker.
      const lx = 120 + ((t * 10) % 420); BG.glow(c, lx, 300, 70 + L * 10, "rgba(255,200,110,0.8)", 0.7 + pulse * 0.3 + energy * 0.3);
      c.fillStyle = "#ffe0a0"; c.beginPath(); c.arc(lx, 300, 4, 0, TAU); c.fill();
      for (let k = 1; k <= 3; k++) { c.fillStyle = `rgba(255,220,150,${0.35 / k})`; c.fillRect(lx + k * 18 - 6, 330, 12, 3); }
    },
  },
);
