"use strict";
// Luminaries: the Fathers of the first centuries, from St. Irenaeus to St. Ambrose.
// Shared brushes for the worlds behind the field.
const BG = {
  sky(c, stops) { c.fillStyle = grad(c, 0, 0, 0, 360, stops); c.fillRect(0, 0, 640, 360); },
  stars(c, t, n, seed, a, ymax) { for (let i = 0; i < n; i++) { const tw = 0.5 + 0.5 * Math.sin(t * (0.7 + hash(i + seed)) + i); c.fillStyle = `rgba(255,255,255,${(a || 0.6) * tw * hash(i + seed + 2)})`; c.fillRect(hash(i + seed) * 640, hash(i + seed + 1) * (ymax || 360), 1.3, 1.3); } },
  glow(c, x, y, r, col, a) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = a === undefined ? 1 : a; c.fillStyle = rgrad(c, x, y, 1, r, [[0, col], [1, "rgba(0,0,0,0)"]]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); },
  // Motes drifting up (dir -1) or down (dir 1).
  drift(c, t, n, seed, col, dir, speed, size, sway) {
    c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = col;
    for (let i = 0; i < n; i++) { const sp = (speed || 20) * (0.5 + hash(i + seed)), y = ((t * sp + hash(i + seed + 1) * 400) % 400), yy = dir < 0 ? 380 - y : y - 20, x = hash(i + seed + 2) * 640 + Math.sin(t * 0.8 + i) * (sway || 10); c.globalAlpha = 0.3 + 0.6 * hash(i + seed + 3); c.fillRect(x, yy, size || 1.6, size || 1.6); }
    c.restore();
  },
  // A ridge of hills, mountains or dunes.
  ridge(c, base, amp, freq, col, phase, sharp) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 360);
    for (let x = 0; x <= 640; x += 8) { let s = Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.3 + phase * 1.7) * 0.4; if (sharp) s = 1 - Math.abs(s) * 2; c.lineTo(x, base - s * amp); }
    c.lineTo(640, 360); c.closePath(); c.fill();
  },
  ripples(c, x, y, t, n, col, speed, sy) { c.strokeStyle = col; c.lineWidth = 1.2; for (let i = 0; i < n; i++) { const r = ((t * (speed || 20) + i * (200 / n)) % 200); c.globalAlpha = Math.max(0, 1 - r / 200); c.beginPath(); c.ellipse(x, y, r * 1.6, r * (sy || 0.4), 0, 0, TAU); c.stroke(); } c.globalAlpha = 1; },
  hexes(c, size, t, col, pulse, f) { c.strokeStyle = col; c.lineWidth = 1; const h = size * Math.sqrt(3); for (let row = -1; row < 360 / h * 2 + 1; row++) for (let q = -1; q < 640 / (size * 1.5) + 1; q++) { const x = q * size * 1.5, y = row * h / 2 + (q % 2 ? h / 4 : -h / 4) + (row % 2 ? 0 : 0); if ((row + q) % 2) continue; const k = f ? f(x, y) : 0; c.globalAlpha = 0.25 + k; c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * size, y + Math.sin(a) * size); } c.stroke(); } c.globalAlpha = 1; void t; void pulse; },
};

STAGES.push(
  // ---- St. Irenaeus of Lyon ---------------------------------------------------------------------
  {
    id: "irenaeus", n: 1, name: "St. Irenaeus of Lyon", short: "Irenaeus", title: "Doctor of Unity", life: "c. 130–c. 202", place: "Lyon",
    song: "irenaeus", scale: [58, 62, 65, 67, 70, 72, 74, 77],
    colors: { a: ["#f0be3a", "#fff0a0", "#9a6a10"], b: ["#1e8a6a", "#7ae0b8", "#0a4a36"], line: "#fff0b0", panel: "rgba(4,20,14,0.55)", ink: "#f4ffe8", accent: "#f8d060" },
    gift: { name: "Recapitulation", about: "All things gathered up in Christ: every square on the field is taken at once, with every block of its colour joined to it.", kind: "sweep" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(120,70,0,0.45)" : "rgba(200,255,230,0.45)"; c.lineWidth = 1; c.beginPath(); if (k === "a") c.arc(s / 2, s / 2, s * 0.2, 0, TAU); else { c.ellipse(s / 2, s / 2, s * 0.26, s * 0.12, -0.7, 0, TAU); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a2a22"], [0.55, "#3a6a3a"], [1, "#e8b860"]]);
      BG.glow(c, 320, 330, 320, "rgba(255,220,120,0.55)", 0.6 + energy * 0.4);
      // The tree of life: a living man is the glory of God.
      const tree = (x, y, ang, len, d) => {
        if (d === 0 || len < 4) { c.fillStyle = `rgba(${200 + d * 10},255,${120 + pulse * 80},${0.5 + pulse * 0.3})`; c.beginPath(); c.arc(x, y, 3 + pulse * 1.5, 0, TAU); c.fill(); return; }
        const sway = Math.sin(t * 0.6 + d) * 0.04, x2 = x + Math.cos(ang + sway) * len, y2 = y + Math.sin(ang + sway) * len;
        c.strokeStyle = `rgba(60,40,20,${0.5 + d * 0.06})`; c.lineWidth = d * 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
        tree(x2, y2, ang - 0.42, len * 0.74, d - 1); tree(x2, y2, ang + 0.38, len * 0.72, d - 1);
      };
      tree(320, 372, -Math.PI / 2, 92, 7 + (L >= 2 ? 1 : 0));
      BG.drift(c, t, 40 + L * 15, 11, "rgba(255,240,150,0.9)", -1, 14, 1.8, 16);
    },
  },
  // ---- St. Hilary of Poitiers --------------------------------------------------------------------
  {
    id: "hilary", n: 2, name: "St. Hilary of Poitiers", short: "Hilary", title: "the Athanasius of the West", life: "c. 310–367", place: "Poitiers",
    song: "hilary", scale: [60, 62, 64, 67, 69, 72, 74, 76],
    colors: { a: ["#8ad8ff", "#ffffff", "#2a7ab0"], b: ["#6a3ac8", "#c4a8ff", "#2e1470"], line: "#ffffff", panel: "rgba(8,14,40,0.55)", ink: "#eef6ff", accent: "#9ae0ff" },
    gift: { name: "Hammer of the Arians", about: "One blow: the lowest row is struck away, and everything above it settles.", kind: "bottom" },
    motif: (c, k, s) => { if (k === "a") { c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; c.moveTo(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3); c.lineTo(s / 2 - Math.cos(a) * s * 0.3, s / 2 - Math.sin(a) * s * 0.3); } c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0c1440"], [0.6, "#3a5aa0"], [1, "#b8d8f0"]]);
      BG.glow(c, 320, 60, 260, "rgba(220,240,255,0.5)", 0.5 + pulse * 0.3 + energy * 0.3);
      BG.ridge(c, 300, 30, 0.012, "rgba(220,235,255,0.75)", 1);
      BG.ridge(c, 330, 18, 0.02, "rgba(255,255,255,0.9)", 3);
      // Frost crystals growing at the corners.
      for (const [x, y, s] of [[40, 60, 1], [600, 80, -1], [30, 300, 1], [610, 290, -1]]) {
        c.save(); c.translate(x, y); c.rotate(t * 0.05 * s); c.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.25})`; c.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 34 + L * 4); for (const k of [12, 22]) { c.moveTo(0, k); c.lineTo(7, k + 6); c.moveTo(0, k); c.lineTo(-7, k + 6); } c.stroke(); }
        c.restore();
      }
      BG.drift(c, t, 70 + L * 20, 21, "rgba(255,255,255,0.9)", 1, 22, 2, 30);
    },
  },
  // ---- St. Athanasius ------------------------------------------------------------------------------
  {
    id: "athanasius", n: 3, name: "St. Athanasius", short: "Athanasius", title: "Father of Orthodoxy", life: "c. 296–373", place: "Alexandria",
    song: "athanasius", scale: [64, 67, 69, 71, 74, 76, 79],
    colors: { a: ["#e8c070", "#fff0c0", "#9a6a20"], b: ["#1e5ab4", "#80b4ff", "#0a2460"], line: "#fff4d0", panel: "rgba(20,10,4,0.55)", ink: "#fff2dc", accent: "#f0c870" },
    gift: { name: "Contra Mundum", about: "Against the world: the top two blocks of every column are struck away.", kind: "top2" },
    motif: (c, k, s) => { if (k === "a") { c.strokeStyle = "rgba(120,70,10,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.2, s * 0.7); c.lineTo(s * 0.5, s * 0.25); c.lineTo(s * 0.8, s * 0.7); c.closePath(); c.stroke(); } else { c.strokeStyle = "rgba(200,230,255,0.4)"; c.beginPath(); c.moveTo(s * 0.2, s * 0.5); c.quadraticCurveTo(s * 0.35, s * 0.35, s * 0.5, s * 0.5); c.quadraticCurveTo(s * 0.65, s * 0.65, s * 0.8, s * 0.5); c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a0a24"], [0.5, "#3a2448"], [1, "#c87a3a"]]);
      BG.stars(c, t, 80, 31, 0.7, 180);
      BG.glow(c, 520, 70, 60, "rgba(255,240,210,0.7)", 0.8);
      BG.ridge(c, 290, 34, 0.009, "#5a3a24", t * 0.05, true);
      BG.ridge(c, 320, 26, 0.014, "#8a5a2a", 1 + t * 0.03, true);
      // The Nile, winding through.
      c.strokeStyle = `rgba(80,150,255,${0.6 + pulse * 0.2})`; c.lineWidth = 6; c.beginPath(); for (let x = 0; x <= 640; x += 10) c.lineTo(x, 345 + Math.sin(x * 0.02 + t * 0.5) * 6); c.stroke();
      // A lone figure on the ridge, and the wind of the world against him.
      c.fillStyle = "#1a0e08"; c.fillRect(560, 262, 5, 16); c.beginPath(); c.arc(562.5, 259, 3.5, 0, TAU); c.fill();
      c.strokeStyle = `rgba(255,220,170,${0.15 + 0.1 * L + energy * 0.2})`; c.lineWidth = 1;
      for (let i = 0; i < 40 + L * 20; i++) { const y = hash(i + 40) * 330, x = 640 - ((t * (200 + hash(i) * 300) + hash(i + 41) * 700) % 760); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + hash(i + 3) * 40, y + 2); c.stroke(); }
    },
  },
  // ---- St. Ephrem the Syrian ---------------------------------------------------------------------------
  {
    id: "ephrem", n: 4, name: "St. Ephrem the Syrian", short: "Ephrem", title: "Harp of the Spirit", life: "c. 306–373", place: "Edessa",
    song: "ephrem", scale: [64, 65, 68, 69, 71, 72, 74, 76],
    colors: { a: ["#f6ecf2", "#ffffff", "#c0a8b8"], b: ["#127888", "#6ad8e0", "#063c46"], line: "#ffffff", panel: "rgba(2,20,26,0.55)", ink: "#f0fbff", accent: "#9ae8f0" },
    gift: { name: "Harp of the Spirit", about: "For thirty seconds the music slows the blocks: they fall at half speed.", kind: "calm" },
    motif: (c, k, s) => { if (k === "a") { c.fillStyle = "rgba(255,255,255,0.75)"; c.beginPath(); c.arc(s * 0.38, s * 0.38, s * 0.12, 0, TAU); c.fill(); } else { c.strokeStyle = "rgba(200,255,255,0.4)"; c.lineWidth = 1; for (const k2 of [0.35, 0.5, 0.65]) { c.beginPath(); c.moveTo(s * k2, s * 0.2); c.lineTo(s * k2, s * 0.8); c.stroke(); } } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#021a24"], [0.6, "#08485a"], [1, "#0a6a78"]]);
      for (let i = 0; i < 6; i++) { c.strokeStyle = `rgba(160,240,255,${0.06 + i * 0.01})`; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= 640; x += 10) c.lineTo(x, 40 + i * 50 + Math.sin(x * 0.015 + t * (0.3 + i * 0.05) + i) * 10); c.stroke(); }
      // The pearl rising from the sea: "the daughter of the sea am I".
      const py = 210 - Math.sin(t * 0.2) * 10, pr = 70 + pulse * 4 + L * 4;
      BG.glow(c, 320, py, pr * 2.6, "rgba(255,240,250,0.5)", 0.6 + energy * 0.4);
      c.fillStyle = rgrad(c, 300, py - 20, 5, pr, [[0, "#ffffff"], [0.5, "#f2e0ea"], [1, "#b8a0b8"]]); c.globalAlpha = 0.8; c.beginPath(); c.arc(320, py, pr, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = "rgba(255,255,255,0.4)"; c.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.1; c.beginPath(); c.moveTo(320 + Math.cos(a) * pr * 1.1, py + Math.sin(a) * pr * 1.1); c.lineTo(320 + Math.cos(a) * pr * (1.5 + pulse * 0.3), py + Math.sin(a) * pr * (1.5 + pulse * 0.3)); c.stroke(); }
      BG.drift(c, t, 40, 51, "rgba(220,255,255,0.8)", -1, 12, 2.2, 8);
    },
  },
  // ---- St. Basil the Great -------------------------------------------------------------------------------
  {
    id: "basil", n: 5, name: "St. Basil the Great", short: "Basil", title: "Father of Eastern Monks", life: "c. 330–379", place: "Caesarea",
    song: "basil", scale: [67, 69, 71, 74, 76, 79, 81],
    colors: { a: ["#d8743a", "#ffc08a", "#7a3410"], b: ["#f2e6c8", "#ffffff", "#b8a682"], line: "#fff4dc", panel: "rgba(30,12,4,0.55)", ink: "#fff2e2", accent: "#f0a060" },
    gift: { name: "The Basiliad", about: "His city of care for the poor: every lonely block, touching none of its own colour, is taken in and turns to the other.", kind: "green" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,220,180,0.45)" : "rgba(160,120,80,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.5, s * 0.22); c.lineTo(s * 0.5, s * 0.78); c.moveTo(s * 0.25, s * 0.42); c.lineTo(s * 0.75, s * 0.42); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#2a1a3a"], [0.5, "#c86a4a"], [1, "#f8c070"]]);
      BG.glow(c, 320, 300, 300, "rgba(255,200,120,0.5)", 0.6 + energy * 0.3);
      // The stone chimneys of Cappadocia, cones with caps, lit by the evening.
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 74 + Math.sin(i * 3) * 14, h = 90 + hash(i + 5) * 90, w = 34 + hash(i + 6) * 20, y = 360;
        c.fillStyle = i % 2 ? "#a8583a" : "#c87a4a"; c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x - w * 0.15, y - h * 0.6, x, y - h); c.quadraticCurveTo(x + w * 0.15, y - h * 0.6, x + w / 2, y); c.closePath(); c.fill();
        c.fillStyle = "#6a3424"; c.beginPath(); c.ellipse(x, y - h, w * 0.32, 7, 0, 0, TAU); c.fill();
        // A lit window in the rock: a cell, a chapel, a house of the poor.
        if ((i + L) % 2 === 0) { c.fillStyle = `rgba(255,220,140,${0.6 + pulse * 0.4})`; c.fillRect(x - 3, y - h * 0.45, 6, 9); }
      }
      BG.drift(c, t, 30, 61, "rgba(255,230,180,0.7)", -1, 8, 1.6, 12);
    },
  },
  // ---- St. Cyril of Jerusalem --------------------------------------------------------------------------
  {
    id: "cyriljer", n: 6, name: "St. Cyril of Jerusalem", short: "Cyril of Jerusalem", title: "Teacher of the Mysteries", life: "c. 313–386", place: "Jerusalem",
    song: "cyriljer", scale: [62, 65, 67, 69, 72, 74, 77],
    colors: { a: ["#3ad0dc", "#b0f4ff", "#0a6a7a"], b: ["#e8a83a", "#ffe0a0", "#8a5410"], line: "#e8ffff", panel: "rgba(2,14,24,0.55)", ink: "#e8fbff", accent: "#7ae4ee" },
    gift: { name: "The Laver", about: "Washed in the water: the lowest row is taken away, and everything above it settles.", kind: "bottom" },
    motif: (c, k, s) => { if (k === "a") { c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 1; c.beginPath(); c.arc(s / 2, s / 2, s * 0.14, 0, TAU); c.arc(s / 2, s / 2, s * 0.28, 0, TAU); c.stroke(); } else { c.fillStyle = "rgba(255,250,220,0.7)"; c.beginPath(); c.ellipse(s / 2, s * 0.45, s * 0.07, s * 0.16, 0, 0, TAU); c.fill(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#020a18"], [0.6, "#0a2a3a"], [1, "#0e4a5a"]]);
      // The dome over the Tomb, dark against the night.
      c.fillStyle = "#06121c"; c.beginPath(); c.arc(320, 150, 120, Math.PI, 0); c.fill(); c.fillRect(190, 150, 260, 210);
      c.fillStyle = "#0a1a26"; c.fillRect(312, 20, 16, 14); c.fillRect(318, 10, 4, 12);
      // Lamps along the walls, flickering.
      for (let i = 0; i < 10; i++) { const x = 40 + i * 62, y = 70 + (i % 2) * 20, f = 0.7 + 0.3 * Math.sin(t * 9 + i * 2.1); BG.glow(c, x, y, 26 + pulse * 6, `rgba(255,190,90,${0.5 * f})`, 1); c.fillStyle = `rgba(255,230,160,${f})`; c.beginPath(); c.ellipse(x, y, 2.5, 5, 0, 0, TAU); c.fill(); }
      // The water of the font, rippling from where a drop falls with the beat.
      BG.ripples(c, 320, 330, t, 6 + L, `rgba(120,240,255,${0.5 + energy * 0.4})`, 26, 0.25);
      c.fillStyle = `rgba(80,220,240,${0.12 + pulse * 0.08})`; c.fillRect(0, 312, 640, 48);
    },
  },
  // ---- St. Gregory Nazianzen ----------------------------------------------------------------------------
  {
    id: "gregnaz", n: 7, name: "St. Gregory Nazianzen", short: "Gregory Nazianzen", title: "the Theologian", life: "c. 329–390", place: "Nazianzus",
    song: "gregnaz", scale: [68, 70, 72, 75, 77, 79, 80, 84],
    colors: { a: ["#f4a88a", "#ffe0d0", "#a8583a"], b: ["#4a5aa8", "#a8b8ff", "#1e2660"], line: "#fff0e8", panel: "rgba(14,10,30,0.5)", ink: "#fff2ec", accent: "#f8b89a" },
    gift: { name: "Light of Light", about: "The next block carries a light: when it makes a square, all its colour joined to it goes.", kind: "lumen" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(140,60,30,0.45)" : "rgba(220,230,255,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.25, s * 0.75); c.lineTo(s * 0.72, s * 0.28); c.lineTo(s * 0.78, s * 0.22); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a1e4a"], [0.45, "#6a5a8a"], [0.75, "#e8907a"], [1, "#ffd0a0"]]);
      BG.glow(c, 320, 300, 160 + L * 20, "rgba(255,230,180,0.7)", 0.7 + pulse * 0.2 + energy * 0.3);
      BG.ridge(c, 300, 40, 0.008, "rgba(60,50,90,0.85)", 2);
      BG.ridge(c, 330, 22, 0.016, "rgba(30,24,50,0.95)", 5);
      // Clouds drifting slowly; the poet's lines written across the dawn.
      for (let i = 0; i < 5; i++) { const x = ((t * (6 + i * 2) + i * 150) % 800) - 80, y = 50 + i * 30; c.fillStyle = "rgba(255,230,220,0.18)"; c.beginPath(); c.ellipse(x, y, 70, 12, 0, 0, TAU); c.fill(); }
      c.strokeStyle = `rgba(255,240,220,${0.25 + pulse * 0.2})`; c.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const len = ((t * 40 + k * 120) % 520); c.beginPath(); for (let x = 0; x < len; x += 4) c.lineTo(60 + x, 230 + k * 14 + Math.sin(x * 0.2 + k) * 2); c.stroke(); }
    },
  },
  // ---- St. Ambrose of Milan ---------------------------------------------------------------------------
  {
    id: "ambrose", n: 8, name: "St. Ambrose of Milan", short: "Ambrose", title: "Bishop of Milan", life: "c. 340–397", place: "Milan",
    song: "ambrose", scale: [62, 65, 67, 69, 70, 72, 74, 77],
    colors: { a: ["#f2b42a", "#ffe890", "#9a6a08"], b: ["#6a3a18", "#c08a5a", "#2e1608"], line: "#fff4b0", panel: "rgba(24,12,2,0.55)", ink: "#fff6dc", accent: "#f8c840" },
    gift: { name: "Honey-Tongued", about: "Bees, they say, settled on his lips as a child: the next three blocks come in one colour.", kind: "mono" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(120,70,0,0.5)" : "rgba(255,210,160,0.4)"; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; c[i ? "lineTo" : "moveTo"](s / 2 + Math.cos(a) * s * 0.26, s / 2 + Math.sin(a) * s * 0.26); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a0e02"], [0.6, "#4a2a06"], [1, "#8a5a10"]]);
      BG.glow(c, 320, 180, 300, "rgba(255,190,60,0.4)", 0.6 + pulse * 0.25 + energy * 0.3);
      // The honeycomb, cells filling with gold as the stage goes on.
      BG.hexes(c, 22, t, "rgba(255,200,80,0.6)", pulse, (x, y) => (Math.sin(x * 0.03 + y * 0.02 + t) > 0.6 - L * 0.25 ? 0.35 : 0));
      // The bees, in and out, left and right, as the two choirs answer.
      for (let i = 0; i < 18 + L * 6; i++) {
        const a = t * (0.8 + hash(i) * 0.6) + i, x = 320 + Math.cos(a) * (120 + hash(i + 1) * 200) + Math.sin(a * 2.3) * 20, y = 180 + Math.sin(a * 1.3) * (80 + hash(i + 2) * 70);
        c.fillStyle = "#ffd040"; c.beginPath(); c.ellipse(x, y, 3.5, 2.4, Math.cos(a), 0, TAU); c.fill(); c.fillStyle = "#2a1a04"; c.fillRect(x - 0.6, y - 2, 1.2, 4);
        c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.ellipse(x, y - 3, 2.4, 1.4, 0, 0, TAU); c.fill();
      }
    },
  },
);
