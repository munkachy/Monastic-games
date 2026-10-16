"use strict";
// Luminaries: the stages, one for each Doctor of the Church, in the order of
// their deaths (`n` is the Doctor's place among all thirty-eight). Each has two
// colours of block, a world drawn behind the field that moves with the music,
// a song, the notes its sounds are drawn from, and the Doctor's gift.
const TAU = Math.PI * 2;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function grad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rgrad(c, x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function heartPath(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.05, y + s * 0.2, x - s * 0.55, y - s * 0.05, x - s * 0.5, y - s * 0.35);
  c.bezierCurveTo(x - s * 0.45, y - s * 0.65, x - s * 0.08, y - s * 0.62, x, y - s * 0.38);
  c.bezierCurveTo(x + s * 0.08, y - s * 0.62, x + s * 0.45, y - s * 0.65, x + s * 0.5, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.55, y - s * 0.05, x + s * 0.05, y + s * 0.2, x, y + s * 0.35);
  c.closePath();
}
function flame(c, x, y, w, h, t, k) {
  const sw = Math.sin(t * 7 + k) * w * 0.35;
  c.beginPath(); c.moveTo(x - w / 2, y);
  c.bezierCurveTo(x - w / 2, y - h * 0.4, x + sw - w * 0.2, y - h * 0.6, x + sw, y - h);
  c.bezierCurveTo(x + sw + w * 0.25, y - h * 0.6, x + w / 2, y - h * 0.4, x + w / 2, y);
  c.closePath();
}
function rose(c, x, y, r, rot, col, dark) {
  c.save(); c.translate(x, y); c.rotate(rot);
  for (let ring = 0; ring < 4; ring++) {
    const rr = r * (1 - ring * 0.22), n = 5 + ring;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ring * 0.6;
      c.fillStyle = ring % 2 ? dark : col;
      c.beginPath(); c.ellipse(Math.cos(a) * rr * 0.45, Math.sin(a) * rr * 0.45, rr * 0.55, rr * 0.38, a, 0, TAU); c.fill();
    }
  }
  c.fillStyle = dark; c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); c.fill();
  c.restore();
}

const STAGES = [
  // ---- St. Augustine ------------------------------------------------------------------------
  {
    id: "augustine", n: 11, name: "St. Augustine", short: "Augustine", title: "Doctor of Grace", life: "354–430", place: "Hippo",
    song: "augustine", scale: [62, 65, 67, 69, 72, 74, 77, 79],
    colors: { a: ["#ff8a2a", "#ffd08a", "#b2400e"], b: ["#8a1236", "#d8406a", "#3e0616"], line: "#ffcf7a", panel: "rgba(20,2,6,0.55)", ink: "#ffe0c0", accent: "#ff9a3a" },
    gift: { name: "Tolle, lege", about: "Take up and read: the next three blocks come in one colour.", kind: "mono" },
    motif: (c, k, s) => { if (k === "a") { c.fillStyle = "rgba(255,240,200,0.55)"; flame(c, s / 2, s * 0.78, s * 0.32, s * 0.5, 0, 0); c.fill(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      c.fillStyle = grad(c, 0, 0, 0, 360, [[0, "#140306"], [0.6, "#3a0810"], [1, "#5a1408"]]); c.fillRect(0, 0, 640, 360);
      // The sea at Hippo, dark, under the fire.
      c.fillStyle = "rgba(255,120,40,0.06)"; for (let i = 0; i < 6; i++) c.fillRect(0, 300 + i * 10 + Math.sin(t + i) * 2, 640, 2);
      // The heart: pierced, burning, beating with the kick.
      const s = 230 * (1 + pulse * 0.045 + energy * 0.05), x = 320, y = 205;
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = rgrad(c, x, y - 30, 10, s * 0.9, [[0, "rgba(255,190,80,0.55)"], [0.35, "rgba(255,90,30,0.25)"], [1, "rgba(120,0,20,0)"]]);
      c.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 9; i++) {
        const fx = x + (i - 4) * s * 0.11, h = s * (0.32 + 0.18 * Math.sin(t * 3 + i * 1.7) + (L >= 2 ? 0.12 : 0) + energy * 0.2);
        c.fillStyle = `rgba(255,${120 + i * 12},40,${0.16 + pulse * 0.08})`; flame(c, fx, y - s * 0.25, s * 0.13, h, t, i); c.fill();
      }
      c.restore();
      heartPath(c, x, y, s); c.fillStyle = grad(c, x, y - s * 0.6, x, y + s * 0.4, [[0, "rgba(220,40,60,0.55)"], [1, "rgba(90,0,20,0.55)"]]); c.fill();
      c.strokeStyle = `rgba(255,200,120,${0.35 + pulse * 0.3})`; c.lineWidth = 2; c.stroke();
      // The arrows of love through it.
      c.strokeStyle = "rgba(255,220,170,0.5)"; c.lineWidth = 2;
      for (const [a, b] of [[[x - s * 0.7, y - s * 0.55], [x + s * 0.55, y + s * 0.15]], [[x + s * 0.7, y - s * 0.6], [x - s * 0.5, y + s * 0.1]]]) { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
      // Embers.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 70; i++) { const sp = 18 + hash(i) * 40, yy = 380 - ((t * sp + hash(i + 9) * 420) % 420), xx = hash(i + 3) * 640 + Math.sin(t * 0.8 + i) * 14; c.fillStyle = `rgba(255,${150 + hash(i + 5) * 90},60,${0.25 + 0.5 * hash(i + 7)})`; c.fillRect(xx, yy, 1.6, 1.6); }
      c.restore();
    },
  },
  // ---- St. Hildegard of Bingen ----------------------------------------------------------------
  {
    id: "hildegard", n: 23, name: "St. Hildegard of Bingen", short: "Hildegard", title: "the Sibyl of the Rhine", life: "1098–1179", place: "Bingen",
    song: "hildegard", scale: [64, 65, 67, 69, 71, 72, 74, 76, 79, 83],
    colors: { a: ["#3ed06a", "#b0ff9a", "#126a2e"], b: ["#8a46e0", "#d4b0ff", "#3a1680"], line: "#c8ff9a", panel: "rgba(6,4,20,0.55)", ink: "#e8fff0", accent: "#7ae88a" },
    gift: { name: "Viriditas", about: "The greening power: every lonely block, touching none of its own colour, turns to the other.", kind: "green" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(230,255,220,0.55)" : "rgba(240,220,255,0.45)"; c.lineWidth = 1; c.beginPath(); if (k === "a") { c.moveTo(s * 0.25, s * 0.75); c.quadraticCurveTo(s * 0.5, s * 0.2, s * 0.78, s * 0.25); c.moveTo(s * 0.45, s * 0.5); c.lineTo(s * 0.38, s * 0.36); } else { c.arc(s / 2, s / 2, s * 0.18, 0, TAU); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      c.fillStyle = grad(c, 0, 0, 0, 360, [[0, "#06041a"], [1, "#1a0a3a"]]); c.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 120; i++) { const tw = 0.4 + 0.6 * Math.sin(t * (1 + hash(i)) + i); c.fillStyle = `rgba(255,255,255,${0.15 + 0.4 * tw * hash(i + 2)})`; c.fillRect(hash(i) * 640, hash(i + 1) * 360, 1.3, 1.3); }
      // The universe as she saw it: an egg, fire at its rim, then darkness, then the starry air, and the earth within.
      const x = 320, y = 190, sp = 1 + pulse * 0.03;
      c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.1) * 0.05); c.scale(sp, sp);
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU + t * 0.15, fl = 0.75 + 0.25 * Math.sin(t * 5 + i * 2.3); c.fillStyle = `rgba(255,${110 + (i % 5) * 20},30,${0.18 * fl + energy * 0.15})`; c.beginPath(); c.ellipse(Math.cos(a) * 250, Math.sin(a) * 175, 26 * fl, 12 * fl, a, 0, TAU); c.fill(); }
      c.globalCompositeOperation = "source-over";
      c.fillStyle = "rgba(30,10,40,0.6)"; c.beginPath(); c.ellipse(0, 0, 232, 160, 0, 0, TAU); c.fill();
      c.fillStyle = rgrad(c, 0, 0, 20, 200, [[0, "rgba(60,90,200,0.5)"], [1, "rgba(20,20,80,0.2)"]]); c.beginPath(); c.ellipse(0, 0, 196, 132, 0, 0, TAU); c.fill();
      c.fillStyle = rgrad(c, 0, 0, 4, 60, [[0, "rgba(140,255,150,0.75)"], [1, "rgba(30,120,60,0.15)"]]); c.beginPath(); c.arc(0, 0, 58 + pulse * 4, 0, TAU); c.fill();
      // The wheel (in rota): spokes turning.
      c.strokeStyle = "rgba(200,255,200,0.18)"; c.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.25; c.beginPath(); c.moveTo(Math.cos(a) * 64, Math.sin(a) * 64); c.lineTo(Math.cos(a) * 190, Math.sin(a) * 128); c.stroke(); }
      c.restore();
      // Viriditas: green vines climbing up from the corners, longer as the stage goes on.
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : 640, len = 120 + L * 50 + energy * 40;
        c.strokeStyle = "rgba(90,220,110,0.55)"; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, 360);
        for (let k = 0; k <= 20; k++) { const u = k / 20, yy = 360 - u * len * 1.6, xx = x0 - side * (30 + Math.sin(u * 7 + t) * 22 * u + u * 60); c.lineTo(xx, yy); }
        c.stroke();
        for (let k = 2; k < 20; k += 3) { const u = k / 20, yy = 360 - u * len * 1.6, xx = x0 - side * (30 + Math.sin(u * 7 + t) * 22 * u + u * 60), sz = 9 * (1 + pulse * 0.25); c.fillStyle = "rgba(120,240,120,0.6)"; c.beginPath(); c.ellipse(xx + side * 6, yy, sz, sz * 0.45, side * 0.6 + Math.sin(t + k), 0, TAU); c.fill(); }
      }
    },
  },
  // ---- St. Thomas Aquinas ------------------------------------------------------------------------
  {
    id: "thomas", n: 25, name: "St. Thomas Aquinas", short: "Thomas", title: "the Angelic Doctor", life: "1225–1274", place: "Aquino",
    song: "thomas", scale: [69, 71, 72, 74, 76, 77, 79, 81],
    colors: { a: ["#e8b84a", "#fff2b0", "#8a5a0e"], b: ["#2a5ac0", "#9ac0ff", "#0e2a6a"], line: "#fff2b0", panel: "rgba(2,6,24,0.6)", ink: "#f0f4ff", accent: "#ffd86a" },
    gift: { name: "Summa", about: "The next block carries a light: when it makes a square, every block of its colour joined to it is swept away.", kind: "lumen" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(120,70,0,0.45)" : "rgba(200,220,255,0.4)"; c.lineWidth = 1; c.beginPath(); if (k === "a") { c.arc(s / 2, s / 2, s * 0.2, 0, TAU); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.moveTo(s / 2 + Math.cos(a) * s * 0.24, s / 2 + Math.sin(a) * s * 0.24); c.lineTo(s / 2 + Math.cos(a) * s * 0.34, s / 2 + Math.sin(a) * s * 0.34); } } else { c.moveTo(s * 0.25, s * 0.25); c.lineTo(s * 0.75, s * 0.75); c.moveTo(s * 0.75, s * 0.25); c.lineTo(s * 0.25, s * 0.75); } c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy, section } = I;
      c.fillStyle = grad(c, 0, 0, 640, 360, [[0, "#030a24"], [1, "#0a1a44"]]); c.fillRect(0, 0, 640, 360);
      c.strokeStyle = "rgba(120,160,255,0.06)"; c.lineWidth = 1;
      for (let x = 0; x <= 640; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 360); c.stroke(); }
      for (let y = 0; y <= 360; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(640, y); c.stroke(); }
      // The sun on his breast.
      const sx = 92, sy = 120, r = 46 * (1 + pulse * 0.06);
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = rgrad(c, sx, sy, 4, r * 2.4, [[0, "rgba(255,230,140,0.6)"], [1, "rgba(255,200,60,0)"]]); c.fillRect(0, 0, 640, 360);
      c.restore();
      c.save(); c.translate(sx, sy); c.rotate(t * 0.2);
      c.strokeStyle = "rgba(255,216,106,0.7)"; c.lineWidth = 1.5;
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr = i % 2 ? r * 1.5 : r * 1.9; c.beginPath(); c.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.stroke(); }
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.62, 0, TAU); c.stroke();
      c.restore();
      // The figures of the geometers: circles drawn with compasses, the vesica, a triangle in the circle, turning with the bars.
      c.save(); c.translate(548, 220); c.strokeStyle = `rgba(255,216,106,${0.28 + pulse * 0.2})`; c.lineWidth = 1.2;
      const rr = 54, a0 = t * 0.12;
      for (let i = 0; i < 6; i++) { const a = a0 + i / 6 * TAU; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, rr, 0, TAU); c.stroke(); }
      c.beginPath(); c.arc(0, 0, rr * 2, 0, TAU); c.stroke();
      c.beginPath(); for (let i = 0; i <= 3; i++) { const a = -a0 + i / 3 * TAU - Math.PI / 2; c[i ? "lineTo" : "moveTo"](Math.cos(a) * rr * 2, Math.sin(a) * rr * 2); } c.stroke();
      c.restore();
      // A golden line drawn out across the dark, a proof unfolding.
      c.strokeStyle = "rgba(255,216,106,0.22)"; c.setLineDash([4, 6]); c.lineDashOffset = -t * 30; c.beginPath(); c.moveTo(0, 330); c.bezierCurveTo(200, 250, 440, 410, 640, 300); c.stroke(); c.setLineDash([]);
      // Where the song is in its article.
      const words = { obj: "VIDETUR QUOD …", contra: "SED CONTRA", resp: "RESPONDEO …", rep: "AD PRIMUM …" };
      if (section) { c.font = "600 9px Cinzel, Georgia, serif"; c.textAlign = "center"; c.fillStyle = `rgba(255,230,150,${0.55 + energy * 0.3})`; c.fillText(words[section] || "", 570, 306); }
      void L;
    },
  },
  // ---- St. Teresa of Ávila ----------------------------------------------------------------------
  {
    id: "teresa", n: 30, name: "St. Teresa of Ávila", short: "Teresa", title: "Doctor of Prayer", life: "1515–1582", place: "Ávila",
    song: "teresa", scale: [69, 71, 73, 76, 78, 81, 83, 85],
    colors: { a: ["#9ae4ff", "#ffffff", "#2a8ac0"], b: ["#e8902e", "#ffd28a", "#8a4a0a"], line: "#ffffff", panel: "rgba(10,14,40,0.5)", ink: "#fff6e8", accent: "#9ae4ff" },
    gift: { name: "The Interior Castle", about: "Through the seven mansions: the field moves seven places toward its fuller side, and every block carried out counts for points.", kind: "shift" },
    motif: (c, k, s) => { if (k === "a") { c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.2, s * 0.5); c.lineTo(s * 0.5, s * 0.2); c.lineTo(s * 0.8, s * 0.5); c.lineTo(s * 0.5, s * 0.8); c.closePath(); c.moveTo(s * 0.5, s * 0.2); c.lineTo(s * 0.5, s * 0.8); c.stroke(); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      c.fillStyle = grad(c, 0, 0, 0, 360, [[0, "#14183e"], [0.55, "#5a3a6a"], [1, "#e8904a"]]); c.fillRect(0, 0, 640, 360);
      // The walls of Ávila along the foot.
      c.fillStyle = "rgba(40,20,30,0.55)"; c.fillRect(0, 318, 640, 42);
      for (let x = 0; x < 640; x += 46) { c.fillRect(x, 300, 26, 20); for (let k = 0; k < 3; k++) c.fillRect(x + k * 9, 294, 6, 6); }
      // The castle of crystal: seven mansions one within another, light at the centre.
      const x = 320, y = 182;
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = rgrad(c, x, y, 2, 200, [[0, `rgba(255,250,220,${0.55 + L * 0.1 + energy * 0.2})`], [0.25, "rgba(255,210,150,0.18)"], [1, "rgba(150,200,255,0)"]]); c.fillRect(0, 0, 640, 360);
      for (let i = 7; i >= 1; i--) {
        const r = 30 + i * 30 * (1 + pulse * 0.02), rot = t * 0.08 * (i % 2 ? 1 : -1) + i * 0.3;
        c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, 0.72);
        c.strokeStyle = `rgba(${170 + i * 10},${220 + i * 4},255,${0.12 + 0.05 * (7 - i) + (i === 7 - (Math.floor(t) % 7) ? 0.15 : 0)})`; c.lineWidth = 1.5;
        c.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU; c[k ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
        c.fillStyle = `rgba(160,220,255,${0.025})`; c.fill();
        c.restore();
      }
      // Sparkles in the crystal.
      for (let i = 0; i < 40; i++) { const a = hash(i) * TAU + t * 0.1, d = 40 + hash(i + 1) * 200, tw = Math.max(0, Math.sin(t * 3 + i * 1.3)); c.fillStyle = `rgba(255,255,255,${tw * 0.6})`; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72, 1.5, 1.5); }
      c.restore();
    },
  },
  // ---- St. John of the Cross ----------------------------------------------------------------------
  {
    id: "john", n: 31, name: "St. John of the Cross", short: "John of the Cross", title: "the Mystical Doctor", life: "1542–1591", place: "Fontiveros",
    song: "john", scale: [60, 63, 67, 70, 72, 75, 79],
    colors: { a: ["#e6dfcb", "#ffffff", "#8e8774"], b: ["#2a2a32", "#6a6a78", "#0a0a0e"], line: "#fff6dc", panel: "rgba(0,0,0,0.35)", ink: "#d8d4c8", accent: "#fff2c8" },
    gift: { name: "Dark Night", about: "The line of light stops for eight beats while you build in the dark; then it sweeps.", kind: "hold" },
    motif: (c, k, s) => { if (k === "b") { c.strokeStyle = "rgba(220,220,235,0.55)"; c.lineWidth = 1; c.strokeRect(2.5, 2.5, s - 5, s - 5); } },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      c.fillStyle = "#020203"; c.fillRect(0, 0, 640, 360);
      // One ray, from far above, swaying a little.
      const sway = Math.sin(t * 0.2) * 30, k = 0.08 + pulse * 0.03 + energy * 0.1 + L * 0.015;
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = grad(c, 320 + sway, 0, 320, 360, [[0, `rgba(255,240,200,${k * 2})`], [1, "rgba(255,240,200,0)"]]);
      c.beginPath(); c.moveTo(300 + sway, -10); c.lineTo(340 + sway, -10); c.lineTo(440, 370); c.lineTo(200, 370); c.closePath(); c.fill();
      // Motes in it.
      for (let i = 0; i < 40; i++) { const yy = (hash(i) * 360 + t * (6 + hash(i + 1) * 8)) % 360, u = yy / 360, xx = 320 + sway * (1 - u) + (hash(i + 2) - 0.5) * (40 + 200 * u); c.fillStyle = `rgba(255,240,200,${0.25 * hash(i + 3)})`; c.fillRect(xx, yy, 1.2, 1.2); }
      c.restore();
      // The secret ladder, faint, as the night deepens.
      if (L >= 2) { c.strokeStyle = `rgba(200,190,170,${0.06 + (L - 2) * 0.05})`; c.lineWidth = 2; c.beginPath(); c.moveTo(560, 360); c.lineTo(590, 0); c.moveTo(600, 360); c.lineTo(622, 0); for (let i = 0; i < 14; i++) { const u = i / 14; c.moveTo(560 + 30 * u, 360 - 360 * u); c.lineTo(600 + 22 * u, 360 - 360 * u); } c.stroke(); }
      // A few far stars.
      for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * Math.max(0, Math.sin(t * 0.7 + i))})`; c.fillRect(hash(i + 50) * 640, hash(i + 60) * 200, 1, 1); }
      // The flame, small, low and steady: "save that which in my heart was burning".
      const fx = 600, fy = 306;
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = rgrad(c, fx, fy - 10, 1, 40, [[0, "rgba(255,200,120,0.5)"], [1, "rgba(255,150,60,0)"]]); c.fillRect(fx - 40, fy - 50, 80, 80);
      c.fillStyle = "rgba(255,220,150,0.8)"; flame(c, fx, fy, 7, 18 + pulse * 3, t * 0.6, 1); c.fill();
      c.restore();
    },
  },
  // ---- St. Thérèse of Lisieux ------------------------------------------------------------------
  {
    id: "therese", n: 38, name: "St. Thérèse of Lisieux", short: "Thérèse", title: "the Little Flower", life: "1873–1897", place: "Lisieux",
    song: "therese", scale: [65, 69, 72, 74, 77, 79, 81, 84],
    colors: { a: ["#ff5aa0", "#ffc4e0", "#b01a60"], b: ["#fff4f8", "#ffffff", "#d0aec0"], line: "#ffffff", panel: "rgba(70,0,36,0.55)", ink: "#fff0f6", accent: "#ffc0dc" },
    gift: { name: "Shower of Roses", about: "Roses fall from heaven: the top block of each of the eight tallest columns is taken up.", kind: "roses" },
    motif: (c, k, s) => { c.strokeStyle = k === "a" ? "rgba(255,230,240,0.6)" : "rgba(230,120,170,0.45)"; c.lineWidth = 1; c.beginPath(); c.arc(s / 2, s / 2, s * 0.16, 0, TAU * 0.8); c.arc(s / 2, s / 2, s * 0.28, TAU * 0.3, TAU * 1.05); c.stroke(); },
    bg(c, I) {
      const { t, pulse, L, energy } = I;
      c.fillStyle = grad(c, 0, 0, 640, 360, [[0, "#5a0c3a"], [0.5, "#a0286a"], [1, "#e86aa0"]]); c.fillRect(0, 0, 640, 360);
      // Light from above, pulsing.
      c.save(); c.globalCompositeOperation = "lighter";
      c.fillStyle = rgrad(c, 320, 40, 10, 380, [[0, `rgba(255,210,235,${0.35 + pulse * 0.2 + energy * 0.2})`], [1, "rgba(255,150,200,0)"]]); c.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i - 4.5) * 0.17 + Math.sin(t * 0.3) * 0.05; c.fillStyle = `rgba(255,230,245,${0.04 + pulse * 0.03})`; c.beginPath(); c.moveTo(320, -20); c.lineTo(320 + Math.cos(a - 0.04) * 600, -20 + Math.sin(a - 0.04) * 600); c.lineTo(320 + Math.cos(a + 0.04) * 600, -20 + Math.sin(a + 0.04) * 600); c.closePath(); c.fill(); }
      c.restore();
      // Roses in bloom at the corners, breathing with the beat.
      const sc = 1 + pulse * 0.08;
      for (const [x, y, r, k] of [[40, 50, 46, 0], [610, 70, 38, 1], [36, 320, 52, 2], [604, 312, 58, 3], [140, 340, 26, 4], [500, 20, 24, 5]]) rose(c, x, y, r * sc, t * 0.1 * (k % 2 ? 1 : -1) + k, k % 3 ? "#ff6aa8" : "#ffd0e4", k % 3 ? "#c02a6a" : "#ff8ab8");
      // The shower of roses: petals falling.
      const n = 40 + L * 25 + Math.floor(energy * 30);
      for (let i = 0; i < n; i++) {
        const sp = 20 + hash(i) * 30, yy = ((t * sp + hash(i + 1) * 400) % 400) - 20, xx = hash(i + 2) * 640 + Math.sin(t * 1.3 + i) * 20, rot = t * (1 + hash(i + 3) * 2) + i;
        c.save(); c.translate(xx, yy); c.rotate(rot); c.fillStyle = i % 3 ? "rgba(255,150,200,0.75)" : "rgba(255,235,245,0.85)"; c.beginPath(); c.ellipse(0, 0, 4, 2.4, 0, 0, TAU); c.fill(); c.restore();
      }
      // Sparkles.
      for (let i = 0; i < 30; i++) { const tw = Math.max(0, Math.sin(t * 4 + i * 2.1)); c.fillStyle = `rgba(255,255,255,${tw * 0.8})`; const xx = hash(i + 80) * 640, yy = hash(i + 81) * 360; c.fillRect(xx - 2, yy, 5, 1); c.fillRect(xx, yy - 2, 1, 5); }
    },
  },
];
