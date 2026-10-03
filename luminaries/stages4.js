"use strict";
// Luminaries: the Doctors from St. John Damascene to St. Catherine of Siena.

STAGES.push(
  // ---- St. John Damascene ---------------------------------------------------------------------------
  {
    id: "damascene", n: 18, name: "St. John Damascene", short: "John Damascene", title: "Defender of the Holy Icons", life: "c. 675–749", place: "Mar Saba",
    song: "damascene", scale: [62, 64, 65, 67, 69, 71, 72, 74],
    colors: { a: ["#e8b030", "#ffe890", "#8a5e08"], b: ["#b0381e", "#ff8a60", "#5a1406"], line: "#fff4c8", panel: "rgba(26,10,2,0.6)", ink: "#fff4dc", accent: "#f4c040" },
    gift: { name: "The Icon", about: "A window into heaven: the next block carries a light, and when it makes a square, all its colour joined to it goes.", kind: "lumen" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(110,60,0,0.5)" : "rgba(255,210,170,0.45)"; c.lineWidth = 1; c.beginPath(); c.arc(s / 2, s * 0.42, s * 0.16, 0, TAU); c.moveTo(s * 0.3, s * 0.78); c.quadraticCurveTo(s / 2, s * 0.56, s * 0.7, s * 0.78); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a0802"], [0.6, "#5a2a0a"], [1, "#a8601e"]]);
      // The desert monastery of Mar Saba, built into the cliff.
      BG.ridge(c, 250, 50, 0.006, "#4a2410", 2, true);
      for (let i = 0; i < 14; i++) { const x = 20 + i * 46, y = 200 + hash(i + 180) * 60, w = 22 + hash(i + 181) * 16; c.fillStyle = "#7a4a22"; c.fillRect(x, y, w, 360 - y); c.fillStyle = `rgba(255,200,110,${0.4 + pulse * 0.4 * (i % 3 === L % 3 ? 1 : 0.3)})`; c.fillRect(x + w / 2 - 2, y + 10, 4, 7); }
      // A great icon of gold, its halo turning in light.
      BG.glow(c, 320, 140, 220, "rgba(255,200,80,0.5)", 0.5 + energy * 0.4 + pulse * 0.2);
      c.save(); c.translate(320, 120); c.strokeStyle = `rgba(255,220,120,${0.35 + pulse * 0.3})`; c.lineWidth = 2;
      for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(0, 0, 70 + r * 16, 0, TAU); c.stroke(); }
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + t * 0.08; c.beginPath(); c.moveTo(Math.cos(a) * 72, Math.sin(a) * 72); c.lineTo(Math.cos(a) * (102 + L * 4), Math.sin(a) * (102 + L * 4)); c.stroke(); }
      c.restore();
      BG.drift(c, t, 30, 182, "rgba(255,220,140,0.8)", -1, 8, 1.6, 10);
    },
  },
  // ---- St. Gregory of Narek -------------------------------------------------------------------------
  {
    id: "narek", n: 19, name: "St. Gregory of Narek", short: "Gregory of Narek", title: "Poet of the Book of Lamentations", life: "c. 951–1003", place: "Narek",
    song: "narek", scale: [60, 62, 63, 65, 67, 68, 71, 72],
    colors: { a: ["#f4a060", "#ffd8b0", "#9a5420"], b: ["#a84a5a", "#f09aaa", "#521824"], line: "#fff0e4", panel: "rgba(30,10,12,0.55)", ink: "#fff2ea", accent: "#f8b480" },
    gift: { name: "From the Depths", about: "Speaking with God from the depths of the heart: the lowest row is taken away, and everything above it settles.", kind: "bottom" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(120,50,10,0.5)" : "rgba(255,200,210,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s / 2, s * 0.22); c.lineTo(s / 2, s * 0.78); c.moveTo(s * 0.3, s * 0.42); c.lineTo(s * 0.7, s * 0.42); for (const [x, y] of [[0.5, 0.22], [0.3, 0.42], [0.7, 0.42], [0.5, 0.78]]) { c.moveTo(s * x + 3, s * y); c.arc(s * x, s * y, 3, 0, TAU); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#2a0e1a"], [0.5, "#8a3a3a"], [1, "#f0a060"]]);
      BG.glow(c, 320, 300, 300, "rgba(255,170,100,0.5)", 0.6 + energy * 0.3);
      // Mount Ararat, white and far.
      c.fillStyle = "rgba(255,230,220,0.55)"; c.beginPath(); c.moveTo(80, 300); c.lineTo(230, 150); c.lineTo(300, 210); c.lineTo(380, 175); c.lineTo(560, 300); c.fill();
      BG.ridge(c, 300, 16, 0.02, "#5a2a2a", 3);
      // Khachkars, cross-stones of rose tuff, carved with lace.
      for (const [x, h] of [[60, 110], [580, 120], [130, 80], [510, 84]]) {
        c.fillStyle = "#c06a5a"; c.fillRect(x - 22, 360 - h, 44, h); c.strokeStyle = `rgba(255,220,200,${0.4 + pulse * 0.3})`; c.lineWidth = 1.4;
        const cy = 360 - h * 0.6; c.beginPath(); c.moveTo(x, cy - 26); c.lineTo(x, cy + 26); c.moveTo(x - 16, cy - 6); c.lineTo(x + 16, cy - 6); c.stroke();
        for (let k = 0; k < 6 + L; k++) { c.beginPath(); c.arc(x + Math.cos(k + t * 0.2) * 12, cy + 18 + Math.sin(k * 2) * 6, 2.5, 0, TAU); c.stroke(); }
      }
      // Apricot petals on the wind.
      BG.drift(c, t, 30 + L * 10, 191, "rgba(255,200,160,0.85)", 1, 10, 2.4, 40);
    },
  },
  // ---- St. Peter Damian -----------------------------------------------------------------------------
  {
    id: "damian", n: 20, name: "St. Peter Damian", short: "Peter Damian", title: "Hermit of Fonte Avellana", life: "1007–1072", place: "Fonte Avellana",
    song: "damian", scale: [64, 65, 67, 69, 71, 72, 74, 76],
    colors: { a: ["#8a9098", "#d8dee6", "#3e444c"], b: ["#f2f6fa", "#ffffff", "#a8b0bc"], line: "#ffffff", panel: "rgba(10,14,20,0.6)", ink: "#f4f8ff", accent: "#c8d8ec" },
    gift: { name: "The Cell", about: "The meeting-place of God and men: the line of light waits eight beats while you build; then it sweeps.", kind: "hold" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,255,255,0.3)" : "rgba(60,70,90,0.35)"; c.lineWidth = 1; c.strokeRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#0a1018"], [0.6, "#2a3a4c"], [1, "#6a7a8c"]]);
      // The Apennines under snow, the hermitage on the slope.
      BG.ridge(c, 230, 70, 0.007, "#3a4654", 1, true);
      BG.ridge(c, 260, 40, 0.012, "#c8d4e0", 4, true);
      BG.ridge(c, 300, 20, 0.02, "#e8f0f8", 2);
      // The cells, a row of small stone huts, each with its light.
      for (let i = 0; i < 9; i++) { const x = 40 + i * 70, y = 300 + Math.sin(i) * 6; c.fillStyle = "#4a525c"; c.fillRect(x - 12, y - 14, 24, 18); c.beginPath(); c.moveTo(x - 15, y - 14); c.lineTo(x, y - 24); c.lineTo(x + 15, y - 14); c.fill(); c.fillStyle = `rgba(255,220,150,${0.4 + 0.5 * (i % 3 === Math.floor(t) % 3 ? pulse : 0.2)})`; c.fillRect(x - 2, y - 8, 4, 6); }
      BG.glow(c, 320, 60, 200, "rgba(220,235,255,0.35)", 0.4 + energy * 0.4);
      BG.drift(c, t, 80 + L * 25, 201, "rgba(255,255,255,0.9)", 1, 24, 2, 26);
    },
  },
  // ---- St. Anselm ------------------------------------------------------------------------------------
  {
    id: "anselm", n: 21, name: "St. Anselm", short: "Anselm", title: "Father of Scholasticism", life: "1033–1109", place: "Canterbury",
    song: "anselm", scale: [57, 59, 60, 62, 64, 65, 67, 69],
    colors: { a: ["#2a3ac8", "#9aa8ff", "#0e1660"], b: ["#e4e8f0", "#ffffff", "#9aa0b0"], line: "#ffffff", panel: "rgba(4,6,30,0.6)", ink: "#f2f4ff", accent: "#aab8ff" },
    gift: { name: "Faith Seeking Understanding", about: "The next two blocks each carry a light: when one makes a square, all its colour joined to it goes.", kind: "lumen2" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,255,255,0.4)" : "rgba(40,50,120,0.35)"; c.lineWidth = 1; for (const f of [0.2, 0.3]) c.strokeRect(s * f, s * f, s * (1 - 2 * f), s * (1 - 2 * f)); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#02041a"], [1, "#0e1a4a"]]);
      // Frames within frames, each greater than the last, for ever: id quo maius cogitari nequit.
      c.save(); c.translate(320, 180);
      const z = (t * 0.25) % 1;
      for (let i = 0; i < 12; i++) {
        const k = Math.pow(1.45, i + z) * 8, a = Math.min(1, (12 - i - z) / 6) * (0.25 + pulse * 0.15);
        c.strokeStyle = `rgba(${170 + i * 6},${190 + i * 4},255,${a})`; c.lineWidth = 1 + i * 0.3; c.strokeRect(-k * 1.78, -k, k * 3.56, k * 2);
      }
      c.restore();
      BG.glow(c, 320, 180, 80 + L * 20, "rgba(220,230,255,0.8)", 0.5 + energy * 0.5);
      BG.stars(c, t, 60, 211, 0.5);
    },
  },
  // ---- St. Bernard of Clairvaux ------------------------------------------------------------------------
  {
    id: "bernard", n: 22, name: "St. Bernard of Clairvaux", short: "Bernard", title: "the Mellifluous Doctor", life: "1090–1153", place: "Clairvaux",
    song: "bernard", scale: [61, 63, 65, 68, 70, 72, 73, 75],
    colors: { a: ["#f4f0e4", "#ffffff", "#b4aa94"], b: ["#e09a20", "#ffd280", "#8a5404"], line: "#fff8e0", panel: "rgba(30,20,6,0.55)", ink: "#fff8ea", accent: "#f4b840" },
    gift: { name: "Honey-Sweet", about: "Like honey to the mouth: for thirty seconds the blocks fall at half speed.", kind: "calm" },
    motif: (c, k, s) => { if (k === "b") { c.fillStyle = "rgba(255,240,180,0.6)"; c.beginPath(); c.ellipse(s * 0.45, s * 0.4, s * 0.07, s * 0.11, 0.3, 0, TAU); c.fill(); } else { c.strokeStyle = "rgba(140,120,90,0.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.5, s * 0.2); c.lineTo(s * 0.5, s * 0.8); c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#2a1a08"], [0.55, "#8a5a1a"], [1, "#f0c070"]]);
      // A plain Cistercian nave: bare white arches, light through clear glass.
      for (let i = 0; i < 6; i++) { const x = 40 + i * 112, w = 90; c.fillStyle = "rgba(240,232,214,0.85)"; c.fillRect(x - 6, 60, 12, 300); c.strokeStyle = "rgba(240,232,214,0.85)"; c.lineWidth = 10; c.beginPath(); c.arc(x + 56, 100, 56, Math.PI, 0); c.stroke(); void w; }
      for (let i = 0; i < 5; i++) { const x = 96 + i * 112; c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = `rgba(255,220,140,${0.1 + pulse * 0.06 + energy * 0.06})`; c.beginPath(); c.moveTo(x - 10, 70); c.lineTo(x + 10, 70); c.lineTo(x + 60, 360); c.lineTo(x + 10, 360); c.fill(); c.restore(); }
      // Honey dripping slowly from the top.
      for (let i = 0; i < 10 + L * 3; i++) { const x = 30 + hash(i + 220) * 580, k = (t * (0.08 + hash(i + 221) * 0.06) + hash(i + 222)) % 1, len = 20 + k * 120; c.fillStyle = "rgba(240,170,30,0.6)"; c.fillRect(x - 1.5, 0, 3, len); c.beginPath(); c.arc(x, len, 4 + k * 2, 0, TAU); c.fill(); }
      BG.drift(c, t, 20, 223, "rgba(255,230,160,0.7)", -1, 6, 1.6, 8);
    },
  },
  // ---- St. Anthony of Padua -----------------------------------------------------------------------
  {
    id: "anthony", n: 24, name: "St. Anthony of Padua", short: "Anthony", title: "Doctor of the Gospel", life: "1195–1231", place: "Padua",
    song: "anthony", scale: [65, 67, 69, 70, 72, 74, 75, 77],
    colors: { a: ["#8a5a32", "#d8a878", "#3e2410"], b: ["#f6f4ec", "#ffffff", "#b0aa98"], line: "#ffffff", panel: "rgba(2,20,30,0.55)", ink: "#f2fbff", accent: "#7ae0f0" },
    gift: { name: "Sermon to the Fish", about: "The fish came to listen in rows: the next three blocks come in one colour.", kind: "mono" },
    motif: (c, k, s) => { if (k === "b") { c.strokeStyle = "rgba(140,130,100,0.5)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s / 2, s * 0.75); c.lineTo(s / 2, s * 0.4); c.moveTo(s / 2, s * 0.42); c.quadraticCurveTo(s * 0.32, s * 0.3, s / 2, s * 0.2); c.quadraticCurveTo(s * 0.68, s * 0.3, s / 2, s * 0.42); c.stroke(); } else { c.strokeStyle = "rgba(255,220,180,0.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.3, s * 0.3); c.lineTo(s * 0.3, s * 0.7); c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#04303a"], [0.5, "#0a5a6a"], [1, "#0a2a40"]]);
      // Light from the surface, rippling down.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 8; i++) { const x = 40 + i * 80 + Math.sin(t * 0.5 + i) * 20; c.fillStyle = `rgba(160,240,255,${0.05 + energy * 0.04})`; c.beginPath(); c.moveTo(x - 14, 0); c.lineTo(x + 14, 0); c.lineTo(x + 60, 360); c.lineTo(x + 20, 360); c.fill(); }
      c.restore();
      // The fish, in rows, heads all turned to listen.
      for (let row = 0; row < 3 + (L >= 2 ? 1 : 0); row++) for (let i = 0; i < 11; i++) {
        const x = 20 + i * 60 + ((t * 6 + row * 20) % 60) - 30, y = 70 + row * 70 + Math.sin(t * 2 + i + row) * 4, sz = 9 + row * 1.5;
        c.fillStyle = ["#f8a040", "#f0f0f0", "#60c8e0", "#ffd060"][row % 4]; c.globalAlpha = 0.6 + pulse * 0.2;
        c.beginPath(); c.ellipse(x, y, sz, sz * 0.5, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - sz, y); c.lineTo(x - sz * 1.6, y - sz * 0.5); c.lineTo(x - sz * 1.6, y + sz * 0.5); c.fill();
      }
      c.globalAlpha = 1;
      // Bubbles rising.
      BG.drift(c, t, 40 + L * 10, 241, "rgba(220,255,255,0.8)", -1, 26, 2.4, 6);
    },
  },
  // ---- St. Bonaventure -----------------------------------------------------------------------------
  {
    id: "bonaventure", n: 26, name: "St. Bonaventure", short: "Bonaventure", title: "the Seraphic Doctor", life: "1221–1274", place: "Paris",
    song: "bonaventure", scale: [55, 57, 59, 62, 64, 66, 67, 69, 71],
    colors: { a: ["#ff6a2a", "#ffc090", "#8a2a04"], b: ["#fff0b0", "#ffffff", "#c0a860"], line: "#ffffff", panel: "rgba(30,8,4,0.55)", ink: "#fff6e8", accent: "#ffb070" },
    gift: { name: "Six Wings", about: "Lifted by the seraph's wings: for twenty seconds the blocks hang where they are, until you let them fall.", kind: "hang" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,230,200,0.45)" : "rgba(150,110,30,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s / 2, s / 2); c.quadraticCurveTo(s * 0.2, s * 0.25, s * 0.25, s * 0.7); c.moveTo(s / 2, s / 2); c.quadraticCurveTo(s * 0.8, s * 0.25, s * 0.75, s * 0.7); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#2a0604"], [0.5, "#8a2a0a"], [1, "#f8a050"]]);
      // The seraph: six wings of flame, two raised, two spread, two veiling.
      c.save(); c.translate(320, 170); c.globalCompositeOperation = "lighter";
      const flap = Math.sin(t * 1.6) * 0.06 + pulse * 0.05;
      for (const [a, len] of [[-2.4, 190], [-0.74, 190], [-2.9, 210], [-0.24, 210], [2.5, 160], [0.64, 160]]) for (let f = 0; f < 7; f++) {
        const aa = a + (a < -1.6 || a > 1.6 ? -flap : flap) + (f - 3) * 0.06; c.strokeStyle = `rgba(255,${140 + f * 14},${60 + f * 10},${0.12 + 0.04 * L})`; c.lineWidth = 9 - f;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(aa - 0.3) * len * 0.6, Math.sin(aa - 0.3) * len * 0.6, Math.cos(aa) * len, Math.sin(aa) * len); c.stroke();
      }
      c.restore();
      BG.glow(c, 320, 170, 90, "rgba(255,240,200,0.9)", 0.6 + energy * 0.4);
      // Six steps of light, lit one by one as the music climbs.
      for (let i = 0; i < 6; i++) { const on = i <= (Math.floor(t * 0.5) % 7); c.fillStyle = on ? `rgba(255,240,200,${0.5 + pulse * 0.3})` : "rgba(255,200,150,0.12)"; c.fillRect(170 + i * 50, 340 - i * 10, 46, 6); }
    },
  },
  // ---- St. Albert the Great --------------------------------------------------------------------------
  {
    id: "albert", n: 27, name: "St. Albert the Great", short: "Albert", title: "the Universal Doctor", life: "c. 1200–1280", place: "Cologne",
    song: "albert", scale: [55, 57, 58, 60, 62, 63, 65, 67, 69],
    colors: { a: ["#c8703a", "#ffb888", "#6a3010"], b: ["#2aa89a", "#8af0e0", "#0a4e46"], line: "#f4fff8", panel: "rgba(8,16,14,0.6)", ink: "#f0fff8", accent: "#f0a070" },
    gift: { name: "Doctor Universalis", about: "He knew every branch of learning: every square on the field is taken at once, with every block of its colour joined to it.", kind: "sweep" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,220,190,0.4)" : "rgba(220,255,250,0.4)"; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU + Math.PI / 6; c[i ? "lineTo" : "moveTo"](s / 2 + Math.cos(a) * s * 0.22, s / 2 + Math.sin(a) * s * 0.22); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#04100e"], [0.6, "#0e2a26"], [1, "#2a4a3a"]]);
      // Crystals growing: the mineralogist's stones.
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * 40, h = 30 + hash(i + 270) * 70 + Math.sin(t * 0.4 + i) * 4 + L * 6, w = 10 + hash(i + 271) * 10;
        c.fillStyle = i % 2 ? `rgba(42,168,154,${0.5 + pulse * 0.2})` : `rgba(200,112,58,${0.5 + pulse * 0.2})`;
        c.beginPath(); c.moveTo(x - w, 360); c.lineTo(x - w * 0.8, 360 - h); c.lineTo(x, 360 - h - w); c.lineTo(x + w * 0.8, 360 - h); c.lineTo(x + w, 360); c.fill();
      }
      // The heavens he charted: planets turning on their circles.
      c.save(); c.translate(320, 110); c.strokeStyle = "rgba(160,255,230,0.25)"; c.lineWidth = 1;
      for (let r = 1; r <= 4; r++) { c.beginPath(); c.ellipse(0, 0, r * 60, r * 18, 0, 0, TAU); c.stroke(); const a = t * (0.6 / r) + r; c.fillStyle = r % 2 ? "#f0a070" : "#8af0e0"; c.beginPath(); c.arc(Math.cos(a) * r * 60, Math.sin(a) * r * 18, 3 + r * 0.5, 0, TAU); c.fill(); }
      c.restore();
      BG.glow(c, 320, 110, 60, "rgba(255,220,160,0.7)", 0.5 + energy * 0.5);
      BG.drift(c, t, 25, 272, "rgba(160,255,230,0.7)", -1, 10, 1.6, 6);
    },
  },
  // ---- St. Catherine of Siena -----------------------------------------------------------------------
  {
    id: "catherine", n: 28, name: "St. Catherine of Siena", short: "Catherine", title: "Patroness of Europe", life: "1347–1380", place: "Siena",
    song: "catherine", scale: [62, 64, 65, 67, 69, 70, 72, 74],
    colors: { a: ["#c8102a", "#ff6a7a", "#600410"], b: ["#f8f4f0", "#ffffff", "#b4aaa4"], line: "#ffffff", panel: "rgba(30,2,6,0.6)", ink: "#fff2f2", accent: "#ff6070" },
    gift: { name: "The Bridge", about: "Christ the Bridge over the river: the top two blocks of every column are struck away.", kind: "top2" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,200,200,0.45)" : "rgba(160,30,40,0.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.2, s * 0.65); c.quadraticCurveTo(s / 2, s * 0.25, s * 0.8, s * 0.65); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      BG.sky(c, [[0, "#1a0204"], [0.6, "#5a0810"], [1, "#9a1a20"]]);
      // The crown of thorns, turning slowly, pulsing with the heartbeat.
      c.save(); c.translate(320, 170); c.scale(1 + pulse * 0.05, 1 + pulse * 0.05); c.rotate(t * 0.05);
      c.strokeStyle = "rgba(40,10,6,0.85)"; c.lineWidth = 3;
      for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU, r = 120 + Math.sin(a * 7 + k * 2) * 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5 + Math.sin(a * 3 + k) * 4); } c.stroke(); }
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, r = 120, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a + 0.6) * 12, y + Math.sin(a + 0.6) * 12 - 4); c.stroke(); }
      c.restore();
      BG.glow(c, 320, 170, 150 + L * 20, "rgba(255,60,70,0.45)", 0.5 + energy * 0.5 + pulse * 0.3);
      // Siena: the tower of the Mangia and the striped Duomo, black and white.
      c.fillStyle = "#14020a"; c.fillRect(40, 140, 24, 220); c.fillRect(34, 128, 36, 16);
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#4a1418" : "#14020a"; c.fillRect(520, 220 + i * 14, 100, 14); }
      c.fillStyle = "#14020a"; c.beginPath(); c.arc(570, 220, 40, Math.PI, 0); c.fill();
      // Drops of light falling.
      BG.drift(c, t, 30 + L * 10, 281, "rgba(255,120,130,0.8)", 1, 16, 2, 4);
    },
  },
);
