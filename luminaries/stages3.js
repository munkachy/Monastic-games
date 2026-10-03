"use strict";
// Luminaries: the Fathers from St. John Chrysostom to St. Bede.

STAGES.push(
  // ---- St. John Chrysostom -------------------------------------------------------------------------
  {
    id: "chrysostom", n: 9, name: "St. John Chrysostom", short: "Chrysostom", title: "the Golden-Mouthed", life: "c. 347–407", place: "Constantinople",
    song: "chrysostom", scale: [63, 65, 67, 70, 72, 75, 77, 79],
    colors: { a: ["#f4c430", "#fff2a0", "#9a7008"], b: ["#b0182a", "#ff7080", "#58040e"], line: "#fff6c0", panel: "rgba(30,4,8,0.55)", ink: "#fff4e4", accent: "#f8d050" },
    gift: { name: "Golden Mouth", about: "One sermon moves the whole city: every square on the field is taken at once, with every block of its colour joined to it.", kind: "sweep" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(120,80,0,0.5)" : "rgba(255,190,200,0.45)"; c.lineWidth = 1; c.beginPath(); c.arc(s / 2, s * 0.62, s * 0.24, Math.PI, 0); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a0206"], [0.55, "#5a0a16"], [1, "#a8402a"]]);
      // The great dome, its ring of windows lit.
      BG.glow(c, 320, 120, 260, "rgba(255,200,80,0.45)", 0.5 + pulse * 0.25 + energy * 0.3);
      c.fillStyle = "#2a0408"; c.beginPath(); c.arc(320, 230, 210, Math.PI, 0); c.fill(); c.fillRect(110, 230, 420, 130);
      for (let i = 0; i < 20; i++) { const a = Math.PI + (i + 0.5) / 20 * Math.PI, x = 320 + Math.cos(a) * 196, y = 230 + Math.sin(a) * 196; c.fillStyle = `rgba(255,${200 + 40 * Math.sin(t * 2 + i)},120,${0.5 + pulse * 0.4})`; c.fillRect(x - 3, y - 5, 6, 10); }
      // Golden rays, as from the mosaics.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14 + L * 4; i++) { const a = Math.PI + (i / (13 + L * 4)) * Math.PI + Math.sin(t * 0.2) * 0.02; c.strokeStyle = `rgba(255,210,90,${0.07 + pulse * 0.05})`; c.lineWidth = 6; c.beginPath(); c.moveTo(320, 230); c.lineTo(320 + Math.cos(a) * 420, 230 + Math.sin(a) * 420); c.stroke(); }
      c.restore();
      // Words of gold, poured out from the pulpit.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 30 + L * 10; i++) { const k = (t * (0.15 + hash(i) * 0.1) + hash(i + 7)) % 1, a = -Math.PI / 2 + (hash(i + 3) - 0.5) * 2.6, r = k * 360; c.globalAlpha = (1 - k) * 0.8; c.fillStyle = "#ffd860"; c.fillRect(320 + Math.cos(a) * r, 330 + Math.sin(a) * r * 0.8, 2 + hash(i + 5) * 2, 2); }
      c.restore();
    },
  },
  // ---- St. Jerome ---------------------------------------------------------------------------------
  {
    id: "jerome", n: 10, name: "St. Jerome", short: "Jerome", title: "Doctor of Scripture", life: "c. 347–420", place: "Bethlehem",
    song: "jerome", scale: [57, 60, 62, 64, 67, 69, 72, 74],
    colors: { a: ["#ecdcb0", "#fff8e0", "#9a8458"], b: ["#a8141e", "#ff6a6a", "#50060a"], line: "#fff6dc", panel: "rgba(20,10,4,0.6)", ink: "#fff4e0", accent: "#f0d8a0" },
    gift: { name: "The Vulgate", about: "Every word put into the common tongue: each lonely block, touching none of its own colour, turns to the other.", kind: "green" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(90,60,20,0.5)" : "rgba(255,200,200,0.35)"; c.lineWidth = 1; c.beginPath(); for (const y of [0.35, 0.5, 0.65]) { c.moveTo(s * 0.22, s * y); c.lineTo(s * (0.6 + hash(y * 10) * 0.2), s * y); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a0604"], [0.7, "#1e1208"], [1, "#2a1a0c"]]);
      // The cave at Bethlehem, its rough mouth.
      c.fillStyle = "#050302"; c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= 640; x += 20) c.lineTo(x, 26 + hash(x) * 22); c.lineTo(640, 0); c.fill();
      // The candle, and its light on the walls.
      const f = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
      BG.glow(c, 70, 250, 220 + pulse * 20, `rgba(255,170,70,${0.55 * f})`, 0.8 + energy * 0.2);
      c.fillStyle = "#e8d8b0"; c.fillRect(64, 262, 12, 46); c.fillStyle = `rgba(255,220,120,${f})`; c.beginPath(); c.ellipse(70, 252 + Math.sin(t * 9) * 0.6, 4, 10 * f, 0, 0, TAU); c.fill();
      // The scroll, the text growing as he works.
      c.fillStyle = "rgba(236,220,176,0.18)"; c.fillRect(470, 120, 150, 210);
      c.strokeStyle = "rgba(60,40,20,0.55)"; c.lineWidth = 1;
      const lines = Math.floor((t * 0.6) % 22);
      for (let i = 0; i < 22; i++) { if (i > lines + L * 2) break; const w = 100 + hash(i + 90) * 30; c.beginPath(); c.moveTo(482, 132 + i * 9); c.lineTo(482 + (i === lines ? w * ((t * 0.6) % 1) : w), 132 + i * 9); c.stroke(); }
      c.fillStyle = "#a8141e"; c.fillRect(466, 112, 158, 6); c.fillRect(466, 330, 158, 6);
      // The lion, at rest at his feet.
      c.fillStyle = "#120a04"; c.beginPath(); c.ellipse(560, 350, 60, 16, 0, Math.PI, 0); c.fill(); c.beginPath(); c.arc(508, 332, 16 + Math.sin(t * 1.2) * 0.6, 0, TAU); c.fill();
      BG.drift(c, t, 20, 101, "rgba(255,210,150,0.6)", -1, 6, 1.4, 6);
    },
  },
  // ---- St. Cyril of Alexandria ------------------------------------------------------------------------
  {
    id: "cyrilalex", n: 12, name: "St. Cyril of Alexandria", short: "Cyril of Alexandria", title: "Doctor of the Incarnation", life: "c. 376–444", place: "Alexandria",
    song: "cyrilalex", scale: [62, 64, 66, 69, 71, 73, 74, 78],
    colors: { a: ["#2a5ad8", "#9ab8ff", "#0e2a78"], b: ["#ff8a2a", "#ffd090", "#a04406"], line: "#eaf0ff", panel: "rgba(4,8,30,0.55)", ink: "#eef2ff", accent: "#ffb060" },
    gift: { name: "Theotokos", about: "The next two blocks each carry a light: when one makes a square, all its colour joined to it goes.", kind: "lumen2" },
    motif: (c, k, s) => { if (k === "a") { c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU * 2 / 5; c.lineTo(s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18); } c.fill(); } else { c.fillStyle = "rgba(255,240,180,0.6)"; c.beginPath(); c.ellipse(s / 2, s * 0.48, s * 0.06, s * 0.14, 0, 0, TAU); c.fill(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#020624"], [0.6, "#0a1a5a"], [1, "#1a2a7a"]]);
      BG.stars(c, t, 90, 121, 0.7, 220);
      // The Pharos, its beam turning over the sea.
      const a = t * 0.5, bx = 560, by = 120;
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = `rgba(255,220,140,${0.12 + energy * 0.1})`; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a) * 900, by + Math.sin(a) * 240 - 60); c.lineTo(bx + Math.cos(a + 0.12) * 900, by + Math.sin(a + 0.12) * 240 - 40); c.closePath(); c.fill(); c.restore();
      c.fillStyle = "#0a0a20"; c.beginPath(); c.moveTo(540, 300); c.lineTo(550, 140); c.lineTo(570, 140); c.lineTo(580, 300); c.fill(); c.fillRect(530, 290, 60, 20);
      BG.glow(c, bx, by + 14, 40 + pulse * 10, "rgba(255,210,120,0.9)", 1);
      // The sea.
      c.fillStyle = "#06103a"; c.fillRect(0, 300, 640, 60);
      for (let i = 0; i < 8; i++) { c.strokeStyle = `rgba(120,160,255,${0.15 + i * 0.02})`; c.beginPath(); for (let x = 0; x <= 640; x += 12) c.lineTo(x, 306 + i * 7 + Math.sin(x * 0.03 + t + i) * 2); c.stroke(); }
      // The torchlit procession along the shore, growing as the stage goes on.
      for (let i = 0; i < 8 + L * 8; i++) { const x = ((t * 18 + i * 34) % 720) - 40, y = 296 + Math.sin(i) * 3, fl = 0.7 + 0.3 * Math.sin(t * 13 + i * 3); BG.glow(c, x, y - 8, 16, `rgba(255,150,50,${0.6 * fl})`, 1); c.fillStyle = "#04040e"; c.fillRect(x - 2, y - 6, 4, 10); }
    },
  },
  // ---- St. Peter Chrysologus --------------------------------------------------------------------------
  {
    id: "chrysologus", n: 13, name: "St. Peter Chrysologus", short: "Chrysologus", title: "Doctor of Homilies", life: "c. 380–c. 450", place: "Ravenna",
    song: "chrysologus", scale: [60, 63, 65, 67, 70, 72, 75, 77],
    colors: { a: ["#1e3aa8", "#7a9aff", "#0a1a5a"], b: ["#e8b830", "#fff0a0", "#8a6406"], line: "#fff8d0", panel: "rgba(4,8,30,0.6)", ink: "#f2f4ff", accent: "#f0c848" },
    gift: { name: "Prayer, Fasting, Mercy", about: "The three that give life to one another: the line of light waits eight beats while you build; then it sweeps.", kind: "hold" },
    motif: (c, k, s) => { c.fillStyle = k === "a" ? "rgba(255,220,100,0.5)" : "rgba(80,50,0,0.4)"; for (let i = 0; i < 4; i++) c.fillRect(s * (0.3 + (i % 2) * 0.24), s * (0.3 + (i >> 1) * 0.24), s * 0.16, s * 0.16); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#06103a"], [1, "#0e1e66"]]);
      // The starry vault of Ravenna, in tesserae.
      for (let y = 0; y < 360; y += 8) for (let x = 0; x < 640; x += 8) { const h = hash(x * 7 + y * 13); c.fillStyle = `rgba(${20 + h * 30},${40 + h * 40},${120 + h * 80},0.5)`; c.fillRect(x, y, 7, 7); }
      // Golden stars in rings round the cross, turning slowly.
      c.save(); c.translate(320, 180);
      for (let r = 1; r <= 5; r++) { const n = r * 8, rr = r * 34; for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 0.03 * (r % 2 ? 1 : -1), x = Math.cos(a) * rr * 1.5, y = Math.sin(a) * rr; const tw = 0.6 + 0.4 * Math.sin(t * 2 + i + r); c.fillStyle = `rgba(255,${210 + 30 * tw},90,${0.5 + pulse * 0.3 * tw})`; c.save(); c.translate(x, y); c.rotate(TAU / 16); for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.fillRect(-1, 0, 2, 4 + L * 0.6); } c.restore(); } }
      c.restore();
      BG.glow(c, 320, 180, 120, "rgba(255,220,120,0.5)", 0.4 + energy * 0.4 + pulse * 0.2);
      c.fillStyle = "rgba(255,226,140,0.85)"; c.fillRect(317, 150, 6, 60); c.fillRect(300, 168, 40, 6);
    },
  },
  // ---- St. Leo the Great ---------------------------------------------------------------------------
  {
    id: "leo", n: 14, name: "St. Leo the Great", short: "Leo", title: "Doctor of the Unity of the Church", life: "c. 400–461", place: "Rome",
    song: "leo", scale: [53, 56, 58, 60, 63, 65, 68, 72],
    colors: { a: ["#6a2a9a", "#c890ff", "#2e0c4a"], b: ["#ece6dc", "#ffffff", "#a49a8a"], line: "#fff4ff", panel: "rgba(16,4,24,0.6)", ink: "#f8f0ff", accent: "#d0a8ff" },
    gift: { name: "Before Attila", about: "He went out unarmed to meet the king of the Huns: the top two blocks of every column are struck away.", kind: "top2" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(230,200,255,0.4)" : "rgba(120,100,90,0.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.2, s * 0.4); c.bezierCurveTo(s * 0.4, s * 0.2, s * 0.6, s * 0.7, s * 0.8, s * 0.5); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#14041e"], [0.55, "#4a1a5a"], [1, "#b06a5a"]]);
      BG.glow(c, 320, 330, 280, "rgba(255,170,140,0.4)", 0.6 + energy * 0.3);
      // Dust of an army on the horizon, far off.
      for (let i = 0; i < 20; i++) { c.fillStyle = `rgba(200,140,110,${0.08 + 0.04 * Math.sin(t + i)})`; c.beginPath(); c.ellipse(80 + i * 26 + Math.sin(t * 0.3 + i) * 6, 262, 30, 10, 0, 0, TAU); c.fill(); }
      // Marble columns of Rome, close and tall.
      for (const [x, w] of [[30, 34], [100, 30], [540, 30], [606, 34]]) {
        c.fillStyle = grad(c, x - w / 2, 0, x + w / 2, 0, [[0, "#b8aea0"], [0.5, "#f4eee4"], [1, "#9a9080"]]); c.fillRect(x - w / 2, 40, w, 320);
        c.strokeStyle = "rgba(120,110,100,0.4)"; c.lineWidth = 1; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * w * 0.18, 44); c.lineTo(x + k * w * 0.18, 356); c.stroke(); }
        c.fillStyle = "#d8d0c4"; c.fillRect(x - w / 2 - 6, 30, w + 12, 12);
      }
      // A lion, majestic in purple light, breathing with the beat.
      c.save(); c.translate(320, 300); c.scale(1 + pulse * 0.02, 1 + pulse * 0.02); c.fillStyle = "rgba(30,6,40,0.85)";
      c.beginPath(); c.arc(0, -40, 34 + L * 2, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 0, 70, 30, 0, Math.PI, 0); c.fill();
      c.restore();
      BG.drift(c, t, 30, 141, "rgba(230,200,255,0.7)", -1, 10, 1.6, 10);
    },
  },
  // ---- St. Gregory the Great -------------------------------------------------------------------------
  {
    id: "gregory", n: 15, name: "St. Gregory the Great", short: "Gregory the Great", title: "Father of Christian Worship", life: "c. 540–604", place: "Rome",
    song: "gregory", scale: [55, 57, 59, 60, 62, 64, 65, 67, 69],
    colors: { a: ["#1e4ab0", "#7aa4ff", "#0a2266"], b: ["#efe2c0", "#fffaea", "#a89670"], line: "#ffffff", panel: "rgba(6,12,34,0.55)", ink: "#f4f6ff", accent: "#e8d49a" },
    gift: { name: "Servus Servorum Dei", about: "The servant of the servants of God waits on you: for twenty seconds the blocks hang where they are, until you let them fall.", kind: "hang" },
    motif: (c, k, s) => { c.fillStyle = k === "a" ? "rgba(255,255,255,0.45)" : "rgba(120,20,20,0.5)"; c.fillRect(s * 0.38, s * 0.38, s * 0.24, s * 0.2); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#081a4a"], [0.6, "#1a3a8a"], [1, "#3a5aa0"]]);
      // Vellum, and a four-line staff of red ink with square neumes moving along it.
      c.fillStyle = "rgba(239,226,192,0.12)"; c.fillRect(0, 40, 640, 290);
      for (let row = 0; row < 3; row++) {
        const y0 = 70 + row * 100; c.strokeStyle = "rgba(200,50,40,0.55)"; c.lineWidth = 1;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, y0 + k * 9); c.lineTo(640, y0 + k * 9); c.stroke(); }
        for (let i = 0; i < 18; i++) { const x = ((i * 40 - t * (20 + row * 6)) % 720 + 720) % 720 - 40, h = Math.floor(hash(i + row * 30) * 7), lit = Math.abs(x - 320) < 30; c.fillStyle = lit ? `rgba(255,255,255,${0.7 + pulse * 0.3})` : "rgba(20,20,30,0.75)"; c.fillRect(x, y0 + 27 - h * 4.5 - 3, 7, 6); }
      }
      // The dove at his ear, circling.
      const a = t * 0.6, x = 320 + Math.cos(a) * (180 + L * 10), y = 180 + Math.sin(a * 2) * 50;
      BG.glow(c, x, y, 40, "rgba(255,255,255,0.6)", 0.5 + energy * 0.5);
      c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(x, y, 9, 4, Math.sin(a) * 0.3, 0, TAU); c.fill();
      const wf = Math.sin(t * 10) * 6; c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x - 8, y - 8 - wf); c.lineTo(x + 4, y - 1); c.fill(); c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x - 6, y + 6 + wf * 0.5); c.lineTo(x + 4, y + 1); c.fill();
    },
  },
  // ---- St. Isidore of Seville ----------------------------------------------------------------------
  {
    id: "isidore", n: 16, name: "St. Isidore of Seville", short: "Isidore", title: "Schoolmaster of the Middle Ages", life: "c. 560–636", place: "Seville",
    song: "isidore", scale: [64, 66, 67, 69, 71, 74, 76, 79],
    colors: { a: ["#20e8ff", "#c0fcff", "#0a7088"], b: ["#ff2aa8", "#ff9ad8", "#8a0450"], line: "#ffffff", panel: "rgba(4,2,20,0.6)", ink: "#f0fcff", accent: "#5af0ff" },
    gift: { name: "Etymologies", about: "Everything sorted, every word in its place: the next three blocks come in one colour.", kind: "mono" },
    motif: (c, k, s) => { c.fillStyle = k === "a" ? "rgba(0,40,60,0.45)" : "rgba(255,220,240,0.4)"; c.fillRect(s * 0.3, s * 0.3, s * 0.12, s * 0.12); c.fillRect(s * 0.58, s * 0.58, s * 0.12, s * 0.12); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#04021a"], [0.6, "#14063a"], [1, "#2a0a4a"]]);
      // A neon grid running to the horizon.
      c.strokeStyle = `rgba(255,42,168,${0.4 + pulse * 0.3})`; c.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const z = ((i + (t * 1.2) % 1) / 14), y = 220 + z * z * 140; c.globalAlpha = z; c.beginPath(); c.moveTo(0, y); c.lineTo(640, y); c.stroke(); }
      c.globalAlpha = 1;
      for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(320 + i * 10, 220); c.lineTo(320 + i * 70, 360); c.stroke(); }
      // The sun of Seville, in bands.
      BG.glow(c, 320, 200, 160, "rgba(32,232,255,0.5)", 0.4 + energy * 0.4);
      c.fillStyle = grad(c, 0, 140, 0, 216, [[0, "#20e8ff"], [1, "#ff2aa8"]]); c.beginPath(); c.arc(320, 216, 70, Math.PI, 0); c.fill();
      c.fillStyle = "#14063a"; for (let k = 0; k < 6; k++) c.fillRect(250, 170 + k * 8, 140, 2 + k * 0.6);
      // Letters of the alphabet, raining in columns, as the encyclopedia is written.
      c.font = "10px Montserrat, sans-serif"; c.textAlign = "center";
      for (let i = 0; i < 24 + L * 6; i++) { const x = 14 + i * 27 % 640, sp = 30 + hash(i) * 40, y = (t * sp + hash(i + 1) * 360) % 400 - 20; c.fillStyle = `rgba(${i % 2 ? "90,240,255" : "255,120,210"},${0.3 + 0.3 * hash(i + 2)})`; c.fillText("ABCDEFGHILMNOPQRSTVX"[(Math.floor(t * 3) + i) % 20], x, y); }
      // Scanlines.
      c.fillStyle = "rgba(0,0,0,0.12)"; for (let y = 0; y < 360; y += 3) c.fillRect(0, y, 640, 1);
    },
  },
  // ---- St. Bede the Venerable -------------------------------------------------------------------------
  {
    id: "bede", n: 17, name: "St. Bede the Venerable", short: "Bede", title: "Father of English History", life: "c. 673–735", place: "Jarrow",
    song: "bede", scale: [62, 64, 66, 67, 69, 71, 72, 74, 76],
    colors: { a: ["#8a4aa8", "#d8a8f0", "#3e1656"], b: ["#1a9a8a", "#80f0e0", "#064a42"], line: "#f4fff8", panel: "rgba(4,16,20,0.55)", ink: "#f2fffa", accent: "#c8a0f0" },
    gift: { name: "The Sparrow's Flight", about: "In at one door and out at the other: the lowest row flies away, and everything above it settles.", kind: "bottom" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,230,255,0.4)" : "rgba(200,255,240,0.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.25, s * 0.5); c.quadraticCurveTo(s * 0.4, s * 0.3, s * 0.5, s * 0.5); c.quadraticCurveTo(s * 0.6, s * 0.3, s * 0.75, s * 0.5); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#020a14"], [0.5, "#0a2a3a"], [1, "#2a4a5a"]]);
      BG.stars(c, t, 80, 171, 0.6, 200);
      // The northern lights over the Tyne.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let k = 0; k < 3; k++) { c.fillStyle = `rgba(${k === 1 ? "160,90,220" : "60,230,190"},${0.08 + energy * 0.06})`; c.beginPath(); c.moveTo(0, 120); for (let x = 0; x <= 640; x += 16) c.lineTo(x, 60 + k * 20 + Math.sin(x * 0.012 + t * 0.4 + k) * 30); for (let x = 640; x >= 0; x -= 16) c.lineTo(x, 130 + k * 20 + Math.sin(x * 0.01 + t * 0.3 + k) * 20); c.fill(); }
      c.restore();
      // The heather hills and the sea.
      BG.ridge(c, 280, 26, 0.01, "#3a2048", 1);
      c.fillStyle = "#06222a"; c.fillRect(0, 300, 640, 60);
      // The hall, firelit, with its two open doors.
      c.fillStyle = "#0a0604"; c.beginPath(); c.moveTo(220, 300); c.lineTo(220, 250); c.lineTo(320, 214); c.lineTo(420, 250); c.lineTo(420, 300); c.fill();
      const fire = 0.7 + 0.3 * Math.sin(t * 8) * Math.sin(t * 5.1);
      for (const x of [236, 392]) { c.fillStyle = `rgba(255,${150 + pulse * 60},60,${fire})`; c.fillRect(x, 266, 12, 34); BG.glow(c, x + 6, 284, 34, "rgba(255,150,60,0.5)", fire); }
      // The sparrow: out of the winter, through the warm hall, back into the winter.
      const k = (t * 0.18) % 1, sx = -40 + k * 720, sy = 274 - Math.sin(k * Math.PI) * 30 + Math.sin(t * 12) * 2, inside = sx > 236 && sx < 404;
      if (!inside) { c.fillStyle = "#c8a070"; c.beginPath(); c.ellipse(sx, sy, 5, 3, 0, 0, TAU); c.fill(); const w = Math.sin(t * 22) * 4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 4, sy - 4 - w); c.lineTo(sx + 3, sy); c.fill(); }
      // Snow, more of it as the stage goes on.
      BG.drift(c, t, 50 + L * 25, 173, "rgba(255,255,255,0.85)", 1, 18, 1.8, 24);
    },
  },
);
