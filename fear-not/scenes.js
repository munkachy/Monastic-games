"use strict";
// Fear Not: the cut scenes. Shots move between tight close-ups (an eye filling the screen, a
// mouth, hands on a rosary, rain on a hat brim) and medium views of a figure framed close. Flat
// colour, a few sharp shapes, neon light down one side of the face. The dialogue sits in a clean
// band below the picture. Few words, plain type, slow cuts. Nobody speaks aloud: the angel's
// words come with a faint chord, a sigh is a breath, the whispers are a hiss.

const BAND = 84;
const WHO = {
  radio: { name: "THE RADIO", color: "#8fd8f0" },
  girl: { name: "THE GIRL", color: "#ffb8d0" },
  whisper: { name: "THE WHISPERS", color: "#ff7a50", italic: true },
  angel: { name: "HIS ANGEL", color: C.holy, italic: true },
  lawrence: { name: "FR. LAWRENCE", color: "#e9e6df" },
  guardian: { name: "THE GUARDIAN", color: "#c4f0ff", italic: true },
  brother: { name: "BR. AMBROSE", color: "#e8c8a0" },
  cantor: { name: "THE CANTOR", color: C.holy, italic: true },
  choir: { name: "THE CHOIR", color: C.holy, italic: true },
  phone: { name: "A TEXT MESSAGE", color: "#9fe4ff" },
  caption: { name: "", color: "#a9a49a", italic: true },
};

// ---- The engine ---------------------------------------------------------------------------------
// A scene is a list of shots: { draw(t, A), lines: [[who, text, sound?]], hold, enter(), music,
// level, cut: "hard" }. A shot without lines moves on by itself after `hold` seconds.
const Scene = {
  start(shots, done) {
    const S = { shots, done, i: -1, li: 0, t: 0, lt: 0, fade: 0, fadeDir: 0, next: 0, chord: 0, over: false };
    Scene.S = S; mode = Scene; Scene.go(0, true);
  },
  go(i, instant) {
    const S = Scene.S;
    if (i >= S.shots.length) { if (!S.over) { S.over = true; S.done(); } return; }
    const sh = S.shots[i];
    if (!instant && sh.cut !== "hard") { S.fadeDir = 1; S.next = i; return; }
    S.i = i; S.li = 0; S.t = 0; S.lt = 0; S.fadeDir = 0; S.fade = sh.cut === "hard" || instant ? 0 : S.fade;
    if (sh.music) { if (sh.music === "stop") Sound.stop(); else if (sh.now) Sound.play(SONGS[sh.music]); else Sound.queue(SONGS[sh.music]); }
    if (sh.level !== undefined) Sound.setLevel(sh.level);
    if (sh.amb) Sound.ambience(sh.amb);
    if (sh.enter) sh.enter();
    Scene.voice();
  },
  // The sound that comes with a line: never a voice.
  voice() {
    const S = Scene.S, sh = S.shots[S.i], ln = sh.lines && sh.lines[S.li];
    if (!ln) return;
    const fx = Sound.fx, k = ln[2];
    if (k === "none") return;
    if (k === "sigh") fx.sigh(); else if (k === "gasp") fx.gasp();
    else if (ln[0] === "angel") fx.chord(S.chord++);
    else if (ln[0] === "guardian") fx.lowChord(S.chord++);
    else if (ln[0] === "whisper") fx.whisper(1.6);
    else if (ln[0] === "radio") fx.radio(2.2);
    else if (ln[0] === "phone") fx.buzz();
  },
  advance() {
    const S = Scene.S, sh = S.shots[S.i];
    if (S.fadeDir) return;
    const n = sh.lines ? sh.lines.length : 0;
    if (n && S.lt < 0.3) { S.lt = 0.3; return; }
    if (!n && S.t < 0.5) return;
    if (n && S.li < n - 1) { S.li++; S.lt = 0; Scene.voice(); return; }
    Scene.go(S.i + 1);
  },
  skip() { const S = Scene.S; if (!S.over) { S.over = true; S.done(); } },
  step(dt) {
    const S = Scene.S, sh = S.shots[S.i];
    S.t += dt; S.lt += dt;
    if (S.fadeDir > 0) { S.fade += dt / 0.28; if (S.fade >= 1) { S.fade = 1; Scene.go(S.next, true); S.fadeDir = -1; } }
    else if (S.fade > 0) { S.fade = Math.max(0, S.fade - dt / 0.4); }
    if (!S.fadeDir && sh && (!sh.lines || !sh.lines.length) && S.t > (sh.hold || 2.5)) Scene.go(S.i + 1);
    if (!S.fadeDir && sh && sh.lines && sh.auto && S.lt > sh.auto) Scene.advance();
  },
  draw() {
    const S = Scene.S, sh = S.shots[S.i];
    rect(0, 0, W, H, "#000");
    if (!sh) return;
    const A = { w: W, h: H - BAND };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, A.w, A.h); ctx.clip();
    if (sh.zoom) { const k = 1 + sh.zoom * smooth(S.t / (sh.zoomT || 8)), fx = (sh.fx === undefined ? 0.5 : sh.fx) * A.w, fy = (sh.fy === undefined ? 0.5 : sh.fy) * A.h; ctx.translate(fx, fy); ctx.scale(k, k); ctx.translate(-fx, -fy); }
    sh.draw(S.t, A);
    ctx.restore();
    // The band.
    rect(0, A.h, W, BAND, "#050407"); rect(0, A.h, W, 1, "rgba(232,196,106,0.18)");
    const ln = sh.lines && sh.lines[S.li];
    if (ln) {
      const who = WHO[ln[0]] || WHO.caption, a = clamp(S.lt / 0.3, 0, 1), x = Math.max(40, W * 0.09);
      if (who.name) text(who.name, x, A.h + 21, { size: 8, weight: 700, spacing: 2.5, color: who.color, alpha: a });
      const font = who.italic ? FONT.line : FONT.ui, size = who.italic ? 19 : 14, wt = who.italic ? 500 : 500;
      const lines = wrap(ln[1], W - x * 2 - 20, (who.italic ? "italic " : "") + wt + " " + size + "px " + font);
      const y0 = A.h + (who.name ? 42 : 34) + (lines.length > 1 ? -4 : 2);
      lines.slice(0, 2).forEach((l, i) => text(l, x, y0 + i * (size + 5), { size, weight: wt, font, italic: who.italic, color: who.name ? "#f1ede4" : who.color, alpha: a }));
      if (a >= 1 && Math.sin(S.lt * 5) > -0.3) poly([W - x + 4, H - 22, W - x + 12, H - 18, W - x + 4, H - 14], "rgba(232,196,106,0.7)");
    }
    if (sh.caption) text(sh.caption, 18, 26, { size: 10, weight: 600, spacing: 2, color: "#e9e6df", alpha: clamp(S.t / 0.8, 0, 1) * 0.85 });
    if (S.fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + S.fade + ")");
    // Skip.
    buttons.push({ x: W - 74, y: 0, w: 74, h: 34, act: () => Scene.skip() });
    text("SKIP ›", W - 14, 22, { align: "right", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.55)" });
  },
  down() { Scene.advance(); },
  key(code, down) { if (!down) return; if (code === "Escape") Scene.skip(); else if (code === "Enter" || code === "Space" || code === "ArrowRight") Scene.advance(); },
};

// ---- Close-ups ------------------------------------------------------------------------------------
// Two eyes in a strip, the Leone close-up before a showdown.
function eyesShot(t, A, sp) {
  const w = A.w, h = A.h, cy = h * 0.5 + (sp.dy || 0), sep = Math.min(w * 0.22, 170), ew = Math.min(w * 0.12, 88), open = sp.open === undefined ? 1 : sp.open;
  const side = sp.side || -1, rim = sp.rim || C.pink;
  const g = ctx.createLinearGradient(side < 0 ? 0 : w, 0, side < 0 ? w : 0, 0);
  g.addColorStop(0, mix(sp.skin, rim, 0.55)); g.addColorStop(0.16, sp.skin); g.addColorStop(0.62, sp.shade); g.addColorStop(1, mix(sp.shade, "#000000", 0.55));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // The bridge of the nose.
  const ng = ctx.createLinearGradient(w / 2 - 50, 0, w / 2 + 50, 0); ng.addColorStop(0, "rgba(0,0,0,0)"); ng.addColorStop(side < 0 ? 0.35 : 0.65, "rgba(255,255,255,0.06)"); ng.addColorStop(side < 0 ? 0.7 : 0.3, "rgba(0,0,0,0.3)"); ng.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ng; ctx.fillRect(w / 2 - 50, cy - 20, 100, h);
  const blink = sp.blink ? (Math.sin(t * 0.9) > 0.985 ? 0.1 : 1) : 1;
  for (const e of [-1, 1]) {
    const x = w / 2 + e * sep, lit = e === side ? 1 : 0.5, eo = open * blink;
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x, cy - 6, ew * 1.3, ew * 0.78, 0, 0, TAU); ctx.fill();
    // The brow.
    const bt = (sp.browTilt || 0) * e * -1, by = cy - ew * 0.9 - (sp.browUp || 0);
    ctx.beginPath(); ctx.moveTo(x - ew * 1.15, by + 8 - bt * 10); ctx.quadraticCurveTo(x, by - 12, x + ew * 1.15, by + 8 + bt * 10);
    ctx.quadraticCurveTo(x, by + 4, x - ew * 1.15, by + 14 - bt * 10); ctx.closePath(); ctx.fillStyle = sp.brow; ctx.fill();
    // The eye.
    const eh = ew * 0.55 * eo, tilt = sp.tilt || 0;
    const almond = () => { ctx.beginPath(); ctx.moveTo(x - ew, cy + tilt * e); ctx.quadraticCurveTo(x - ew * 0.1, cy - eh * 1.75, x + ew, cy - tilt * e); ctx.quadraticCurveTo(x + ew * 0.1, cy + eh * 1.15, x - ew, cy + tilt * e); ctx.closePath(); };
    if (eo > 0.12) {
      almond(); ctx.fillStyle = mix(sp.white || "#e2dad0", sp.shade, 1 - lit * 0.75); ctx.fill();
      ctx.save(); almond(); ctx.clip();
      if (sp.blood) for (let k = 0; k < 4; k++) line(x + e * ew * (0.95 - k * 0.04), cy + (k - 1.5) * 4, x + e * ew * 0.55, cy + (k - 1.5) * 2 + Math.sin(k) * 3, "rgba(170,40,40,0.45)", 0.8);
      const ix = x + (sp.look || 0) * ew * 0.38, iy = cy + 1 + (sp.lookY || 0) * 6, ir = ew * (sp.iris || 0.44);
      const ig = ctx.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir); ig.addColorStop(0, mix(sp.irisC, "#ffffff", 0.15)); ig.addColorStop(0.75, sp.irisC); ig.addColorStop(1, mix(sp.irisC, "#000000", 0.6));
      circle(ix, iy, ir, ig); circle(ix, iy, ir * 0.42, "#050304");
      circle(ix + side * ir * 0.35, iy - ir * 0.35, ir * 0.18, "rgba(255,255,255,0.9)");
      if (sp.wet) { circle(ix - side * ir * 0.3, iy + ir * 0.35, ir * 0.09, "rgba(255,255,255,0.8)"); rect(x - ew * 0.7, cy + eh * 0.55, ew * 1.4, 2, "rgba(255,255,255,0.25)"); }
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x - ew, cy - eh * 2, ew * 2, eh * 0.9);   // the shadow of the lid
      ctx.restore();
    }
    // The lids.
    ctx.beginPath(); ctx.moveTo(x - ew * 1.02, cy + tilt * e); ctx.quadraticCurveTo(x - ew * 0.1, cy - eh * 1.75, x + ew * 1.02, cy - tilt * e);
    ctx.strokeStyle = sp.lid || "#1a0e0c"; ctx.lineWidth = sp.lash ? 6 : 4.5; ctx.lineCap = "round"; ctx.stroke();
    if (sp.lash) for (let k = 0; k < 5; k++) { const u = 0.35 + k * 0.14, lx = lerp(x - ew, x + ew, u), ly = cy - eh * 1.75 * 2 * u * (1 - u) * 1.0 - 1; line(lx, ly, lx + e * 0 + (u - 0.5) * 8, ly - 7, sp.lid || "#1a0e0c", 1.8); }
    ctx.beginPath(); ctx.moveTo(x - ew * 0.9, cy - ew * 0.12); ctx.quadraticCurveTo(x, cy - eh * 1.75 - ew * 0.32, x + ew * 0.95, cy - ew * 0.2); ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - ew * 0.9, cy + 2); ctx.quadraticCurveTo(x + ew * 0.1, cy + eh * 1.15 + 1, x + ew * 0.95, cy); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
    if (sp.bags) for (const k of [1, 2]) { ctx.beginPath(); ctx.moveTo(x - ew * 0.7, cy + ew * 0.32 + k * 9); ctx.quadraticCurveTo(x, cy + ew * 0.5 + k * 12, x + ew * 0.75, cy + ew * 0.28 + k * 8); ctx.strokeStyle = "rgba(0,0,0," + (0.28 - k * 0.07) + ")"; ctx.lineWidth = 2; ctx.stroke(); }
    if (sp.crow) for (const k of [-1, 0, 1]) line(x + e * ew * 1.1, cy + k * 6, x + e * ew * 1.42, cy + k * 13 - 3, "rgba(0,0,0,0.3)", 1.6);
    if (sp.tear && e === side) { const ty = cy + eh + 6 + ((t * 18) % 60); glow(x + ew * 0.4, ty, 8, "#ffffff", 0.4); circle(x + ew * 0.4, ty, 2.6, "rgba(230,245,255,0.8)"); }
  }
  if (sp.glasses) {
    ctx.strokeStyle = "#0b0808"; ctx.lineWidth = 6;
    for (const e of [-1, 1]) { const x = w / 2 + e * sep; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - ew * 1.38, cy - ew * 0.92, ew * 2.76, ew * 1.72, ew * 0.55) : ctx.rect(x - ew * 1.38, cy - ew * 0.92, ew * 2.76, ew * 1.72); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(w / 2 - sep + ew * 1.38, cy - ew * 0.3); ctx.quadraticCurveTo(w / 2, cy - ew * 0.6, w / 2 + sep - ew * 1.38, cy - ew * 0.3); ctx.stroke();
    const gx = w / 2 + side * sep - side * ew * 0.4;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35; poly([gx - 30, cy - ew * 0.85, gx - 12, cy - ew * 0.85, gx + 22, cy + ew * 0.75, gx + 4, cy + ew * 0.75], rim); ctx.restore();
  }
  // The neon down one side.
  const rg = ctx.createLinearGradient(side < 0 ? 0 : w, 0, side < 0 ? 60 : w - 60, 0); rg.addColorStop(0, hexA(rim, 0.55)); rg.addColorStop(1, hexA(rim, 0));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rg; ctx.fillRect(side < 0 ? 0 : w - 60, 0, 60, h); ctx.restore();
  if (sp.rain) rain(t, 50, 0, 0, w, h, { color: "rgba(196,240,255,0.25)", len: 22, speed: 700, seed: 5 });
}
// The angel, up close: a soft blank glare, and perhaps the faint shape of an eye within it.
function angelShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, cx = w * (o.x || 0.5), cy = h * 0.5, k = o.k === undefined ? 1 : o.k;
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, "#fffdf4"); g.addColorStop(0.25, "#fff1c8"); g.addColorStop(0.6, o.cool ? "#9fc8e8" : "#d8b45a"); g.addColorStop(1, o.cool ? "#13243c" : "#3a2810");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  glow(cx, cy, h * 0.9, "#ffffff", 0.5 * k);
  // The eye: barely there, a darker gold line and the hint of an iris.
  ctx.globalAlpha = 0.16 + 0.06 * Math.sin(t * 1.3);
  ctx.beginPath(); ctx.moveTo(cx - 120, cy); ctx.quadraticCurveTo(cx, cy - 70, cx + 120, cy); ctx.quadraticCurveTo(cx, cy + 50, cx - 120, cy);
  ctx.strokeStyle = o.cool ? "#4a7aa0" : "#a07a20"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy - 4, 30, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
  // Motes of light drifting.
  const r = seeded(31);
  for (let i = 0; i < 30; i++) { const x = (r() * w + t * (8 + r() * 14)) % w, y = (r() * h - t * (5 + r() * 10) + h * 4) % h; glow(x, y, 3 + r() * 5, "#ffffff", 0.35); }
}
// A demon, up close: darkness, and an ember where the eye should be.
function demonShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#040206");
  const r = seeded(o.seed || 12);
  for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h, rr = 60 + r() * 120; ctx.globalAlpha = 0.25; circle(x + Math.sin(t * 0.4 + i) * 20, y + Math.cos(t * 0.3 + i) * 12, rr, i % 2 ? "#0d0812" : "#120a10"); }
  ctx.globalAlpha = 1;
  const eyes = o.eyes || [[0.5, 0.48, 1]];
  for (const [ex, ey, s] of eyes) {
    const x = ex * w, y = ey * h, fl = 0.75 + 0.25 * Math.sin(t * 3 + ex * 9);
    glow(x, y, 70 * s, C.ember, 0.35 * fl);
    for (const d of [-1, 1]) { ctx.save(); ctx.translate(x + d * 34 * s, y); ctx.rotate(d * 0.18); ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 3.2 * s, 0, 0, TAU); ctx.fillStyle = "#ffb070"; ctx.fill(); ctx.restore(); glow(x + d * 34 * s, y, 26 * s, C.ember, 0.6 * fl); }
  }
  vignette(0.8, 0.2);
}

// ---- The city: the cold open ---------------------------------------------------------------------
function radioShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#05040a");
  const x = w * 0.42, y = h * 0.62;
  // The table, and the light the dial throws on it.
  rect(0, y + 30, w, h, "#0d0a0e"); glowOval(x + 70, y + 34, 220, 26, C.teal, 0.3);
  // The radio.
  ctx.fillStyle = "#1d130f"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 120, y - 70, 240, 100, 12) : ctx.rect(x - 120, y - 70, 240, 100); ctx.fill();
  for (let i = 0; i < 9; i++) rect(x - 104, y - 56 + i * 9, 92, 3, "#0d0806");
  rect(x + 6, y - 54, 100, 40, "#0e2a28"); glow(x + 56, y - 34, 80, C.teal, 0.55);
  for (let i = 0; i < 11; i++) rect(x + 12 + i * 9, y - 26 - (i % 2 ? 0 : 5), 1, i % 2 ? 4 : 9, "#7fe8d0");
  const nx = x + 40 + Math.sin(t * 0.7) * 3; rect(nx, y - 52, 2, 36, C.red); glow(nx, y - 34, 10, C.red, 0.5);
  circle(x + 30, y + 8, 9, "#2a1c16"); circle(x + 80, y + 8, 9, "#2a1c16");
  // The clock beside it: 2:00, in red.
  const cx = w * 0.78, cy = y - 10;
  rect(cx - 50, cy - 26, 100, 52, "#0b0909"); glow(cx, cy, 70, C.red, 0.28);
  text(Math.sin(t * PI) > 0 ? "2:00" : "2 00", cx, cy + 13, { align: "center", size: 34, weight: 700, color: "#ff2a35", glow: C.red, blur: 14, spacing: 2 });
  text("AM", cx + 46, cy - 14, { align: "right", size: 7, weight: 700, color: "#ff2a35" });
  vignette(0.85, 0.25);
}
function skylineDarkShot(t, A) {
  const w = A.w, h = A.h;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#04060e"); g.addColorStop(1, "#0d1830"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const dx = w * 1.1 - t * w * 0.22;
  skyline(41, -20, w + 40, h * 0.95, 30, 120, "#0a1224", { t, winA: 0.5, dark: true, darkX: dx + 300, darkDir: 1 });
  skyline(17, -20, w + 40, h + 6, 60, 200, "#060a16", { t, dark: true, darkX: dx, darkDir: 1 });
  rain(t, 120, 0, 0, w, h, { seed: 3 });
  vignette(0.6, 0.3);
}
// The girl at her window, side on: a dark room, rain on the glass, the city's pink neon beyond.
function girlWindowShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#120b1c");
  const wx = w * 0.5, wy = h * 0.08, ww = w * 0.42, wh = h * 0.62;
  // Beyond the glass.
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, "#07081a"); g.addColorStop(1, "#2a0f2a"); ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
  skyline(9, wx - 10, wx + ww + 10, wy + wh + 10, 50, 170, "#0b0a1c", { t, winA: 0.55 });
  neon("MOTEL", wx + ww * 0.7, wy + wh * 0.6, 14, C.pink, t, { flicker: true });
  rain(t, 60, wx, wy, ww, wh, { color: "rgba(255,170,210,0.25)", seed: 8 });
  // Drops running down the glass.
  const r = seeded(4);
  for (let i = 0; i < 22; i++) { const x = wx + r() * ww, sp = 10 + r() * 30, y = wy + ((r() * wh + t * sp) % wh); circle(x, y, 1.6 + r() * 1.4, "rgba(255,210,230,0.35)"); line(x, y - 10 - r() * 20, x, y, "rgba(255,210,230,0.12)", 1.2); }
  ctx.restore();
  // The frame.
  ctx.strokeStyle = "#1c1428"; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh); rect(wx + ww / 2 - 3, wy, 6, wh, "#1c1428"); rect(wx, wy + wh / 2 - 3, ww, 6, "#1c1428");
  rect(wx - 16, wy + wh, ww + 32, 10, "#24192e");     // the sill
  glowOval(wx + ww / 2, wy + wh + 5, ww * 0.6, 14, C.pink, 0.25);
  // The rabbit on the sill.
  const bx = wx + ww * 0.82, by = wy + wh;
  ctx.fillStyle = "#3a2c44"; ctx.beginPath(); ctx.ellipse(bx, by - 12, 10, 12, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(bx + 2, by - 28, 7, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx - 1, by - 42, 2.5, 9, -0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(bx + 5, by - 41, 2.5, 9, 0.25, 0, TAU); ctx.fill();
  // The girl, kneeling on her bed, elbows on the sill, hands joined, facing the window.
  const gx = wx + ww * 0.16, gy = wy + wh + 4, pj = "#8a74a8", pjS = "#4e3e66", skin = "#c69078", hair = "#2a1a14";
  rect(0, gy + 14, w, h, "#1a1226"); rect(0, gy + 14, w, 3, "#2a1e38");      // the bed, under the window
  ctx.fillStyle = pjS; ctx.beginPath(); ctx.ellipse(gx - 40, gy + 18, 34, 14, 0, 0, TAU); ctx.fill();       // knees and legs folded
  ctx.fillStyle = pj; ctx.beginPath(); ctx.moveTo(gx - 64, gy + 16); ctx.quadraticCurveTo(gx - 70, gy - 50, gx - 34, gy - 66); ctx.lineTo(gx - 10, gy - 58); ctx.quadraticCurveTo(gx + 2, gy - 20, gx - 14, gy + 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pjS; ctx.beginPath(); ctx.moveTo(gx - 30, gy - 56); ctx.quadraticCurveTo(gx + 6, gy - 40, gx + 20, gy - 6); ctx.lineTo(gx + 30, gy - 10); ctx.quadraticCurveTo(gx + 10, gy - 52, gx - 18, gy - 64); ctx.closePath(); ctx.fill();   // the arm on the sill
  circle(gx + 30, gy - 16, 7, skin);                                   // the joined hands
  // The head.
  const hx = gx - 22, hy = gy - 88 + Math.sin(t * 0.8) * 1;
  circle(hx, hy, 21, skin);
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx - 4, hy - 3, 22, PI * 0.55, PI * 1.95); ctx.quadraticCurveTo(hx + 8, hy - 10, hx - 4, hy - 3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx - 27, hy + 2 + Math.sin(t * 1.4) * 1.5, 7, 14, 0.4, 0, TAU); ctx.fill();     // the ponytail
  circle(hx - 21, hy - 8, 4, "#d84a7a");                                   // its band
  ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(hx + 2, hy, 21, -1.0, 1.2); ctx.lineWidth = 2.5; ctx.strokeStyle = C.pink; ctx.stroke(); ctx.globalAlpha = 1;
  line(hx + 14, hy + 2, hx + 18, hy + 2, "#3a1a14", 1.6);                    // a closed eye
  vignette(0.7, 0.3);
}
// Her joined hands on the sill, and the glow-in-the-dark rosary wound round them.
function girlHandsShot(t, A) {
  const w = A.w, h = A.h, cx = w * 0.5, cy = h * 0.52, skin = "#c69078", skinS = "#8a5a4a";
  rect(0, 0, w, h, "#100a18");
  glow(w * 0.85, h * 0.2, 260, C.pink, 0.25);
  rect(0, cy + 70, w, h, "#24192e");
  // Sleeves.
  ctx.fillStyle = "#6e5a92"; ctx.beginPath(); ctx.ellipse(cx - 110, cy + 64, 90, 34, -0.15, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 110, cy + 64, 90, 34, 0.15, 0, TAU); ctx.fill();
  // Two hands, palms together, fingers up.
  for (const d of [-1, 1]) {
    ctx.fillStyle = d < 0 ? skin : skinS; ctx.beginPath();
    ctx.moveTo(cx + d * 2, cy + 70); ctx.quadraticCurveTo(cx + d * 62, cy + 60, cx + d * 48, cy - 10); ctx.quadraticCurveTo(cx + d * 40, cy - 80, cx + d * 14, cy - 110); ctx.quadraticCurveTo(cx + d * 2, cy - 116, cx + d * 2, cy - 100); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 3; k++) line(cx + d * (16 + k * 10), cy - 70 + k * 18, cx + d * (30 + k * 8), cy - 64 + k * 18, "rgba(0,0,0,0.2)", 1.5);
  }
  // The thumbs.
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(cx - 6, cy + 18, 9, 26, -0.15, 0, TAU); ctx.fill();
  // The rosary: beads glowing pale green, as the plastic ones do in the dark.
  const beads = [];
  for (let i = 0; i < 18; i++) { const a = PI * 0.15 + (i / 17) * PI * 0.7; beads.push([cx + Math.cos(a) * 70, cy + 26 + Math.sin(a) * 60]); }
  for (const [x, y] of beads) { glow(x, y, 9, "#b8ffcf", 0.6); circle(x, y, 3.6, "#d8ffe6"); }
  const bx = cx, by = cy + 100 + Math.sin(t * 1.5) * 2;
  line(cx, cy + 86, bx, by - 12, "#b8ffcf", 1.2); rect(bx - 1.5, by - 10, 3, 24, "#d8ffe6"); rect(bx - 7, by - 3, 14, 3, "#d8ffe6"); glow(bx, by, 20, "#b8ffcf", 0.6);
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(cx + 50, cy - 10); ctx.quadraticCurveTo(cx + 44, cy - 80, cx + 14, cy - 110); ctx.strokeStyle = C.pink; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
  vignette(0.75, 0.25);
}
// The street, the corner store and the car across from it, in the rain.
function carStreetShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.8;
  const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#03050c"); g.addColorStop(1, "#0b1428"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
  skyline(23, -10, w + 10, gy - 60, 40, 150, "#081022", { t, winA: o.lit === undefined ? 0.35 : o.lit, lit: o.lit === undefined ? 0.4 : o.lit });
  cornerStore(w * 0.58, gy, w * 0.3, 120, t);
  lamp(w * 0.1, gy, 120, C.ice, o.lamp === undefined ? (Math.sin(t * 9) > 0.6 ? 0.3 : 1) : o.lamp, 1);
  wetStreet(gy, h, [[w * 0.58 + w * 0.3 * 0.36, C.red, 1, 40], [w * 0.58 + w * 0.3 * 0.79, C.cyan, 1, 14], [w * 0.1 + 11, C.ice, 1, 12]], t);
  const cx = o.carX === undefined ? w * 0.3 : o.carX;
  car(cx, h * 0.93, 1.6, { t, lights: o.lights || 0, dash: o.dash === undefined ? 1 : o.dash, bow: 2, driver: o.driver });
  if (o.shapes) {
    // The shapes leaning close round the car.
    const k = smooth(t / 3);
    drawFigure("demon", cx - 120, h * 0.95, 1.45, 1, pose({ lean: 0.55 + 0.15 * k, head: 0.4, sF: 1.2 + 0.4 * k, eF: 0.6, sB: 0.7, eB: 0.5, hF: 0.25, kF: 0.15, hB: -0.25 }), { t, rim: C.red, rimX: -2 });
    drawFigure("demon", cx + 135, h * 0.95, 1.6, -1, pose({ lean: 0.6 + 0.1 * k, head: 0.5, sF: 1.5 + 0.3 * k, eF: 0.4, sB: 0.9, eB: 0.8, hF: 0.2, hB: -0.2 }), { t: t + 2, rim: C.cyan, rimX: 2, body: "big", hatKind: 1 });
    drawFigure("demon", cx + 30, h * 0.66, 1.0, -1, pose({ lean: 0.9 * k, head: 0.6, sF: 2.0, eF: 0.3, sB: 1.4 }), { t: t + 4, rim: C.pink, rimX: 2, alpha: 0.85 });
  }
  rain(t, 140, 0, 0, w, h, { seed: 11 });
  vignette(0.65, 0.3);
}
// The man's eyes in the rear-view mirror.
function mirrorShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#05060c");
  rain(t, 60, 0, 0, w, h, { color: "rgba(196,240,255,0.12)", seed: 2 });
  const mx = w * 0.5, my = h * 0.48, mw = Math.min(w * 0.8, 600), mh = 112;
  rect(mx - 4, 0, 8, my - mh / 2, "#0b0b12");
  ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx - mw / 2, my - mh / 2, mw, mh, 26) : ctx.rect(mx - mw / 2, my - mh / 2, mw, mh); ctx.clip();
  ctx.translate(mx - mw / 2, my - mh / 2);
  eyesShot(t, { w: mw, h: mh * 2.2 }, { skin: "#9a6e5a", shade: "#2e1c18", brow: "#140c0a", irisC: "#5a6a78", open: 0.62, side: 1, rim: C.red, blood: true, bags: true, look: -0.3, dy: -mh * 0.6, browTilt: 0.5 });
  ctx.restore();
  ctx.strokeStyle = "#12121c"; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx - mw / 2, my - mh / 2, mw, mh, 26) : ctx.rect(mx - mw / 2, my - mh / 2, mw, mh); ctx.stroke();
  glowOval(mx + mw * 0.4, my, 60, 50, C.red, 0.3);
  vignette(0.6, 0.3);
}
// His phone, lit on the dashboard.
function phoneShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#04050a");
  const px = w * 0.5, py = h * 0.5, buzz = t < 1.2 ? Math.sin(t * 90) * 1.5 : 0;
  glow(px, py, 200, "#7fc8ff", 0.25);
  ctx.save(); ctx.translate(px + buzz, py); ctx.rotate(-0.08);
  ctx.fillStyle = "#0c0c12"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-110, -70, 220, 140, 14) : ctx.rect(-110, -70, 220, 140); ctx.fill();
  rect(-100, -60, 200, 120, "#0f1c2a");
  text("UNKNOWN", 0, -38, { align: "center", size: 9, weight: 700, spacing: 2, color: "#7f9fb8" });
  ctx.fillStyle = "#2a3a4c"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-88, -26, 176, 64, 10) : ctx.rect(-88, -26, 176, 64); ctx.fill();
  text("Friday. All of it.", -78, -6, { size: 12, weight: 600, color: "#e9eef4" });
  text("Or we come to the house.", -78, 14, { size: 12, weight: 600, color: "#e9eef4" });
  text("2:04 AM", 78, 30, { align: "right", size: 7, weight: 500, color: "#9fb0c0" });
  ctx.restore();
  rect(0, h * 0.82, w, h, "#07070c");
  vignette(0.7, 0.3);
}
// His hands in his lap, and what he holds: a pistol lying across his open palm, lit along
// its edge by the cold light of the dashboard.
function handsGunShot(t, A) {
  const w = A.w, h = A.h, skin = "#8a5e4c", sk2 = "#5a3a30";
  rect(0, 0, w, h, "#05060b");
  glowOval(w * 0.55, -20, w * 0.6, h * 0.5, C.cyan, 0.18);
  // His thighs, in dark jeans.
  ctx.fillStyle = "#0e1424"; ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.quadraticCurveTo(w * 0.5, h * 0.48, w, h * 0.6); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(C.cyan, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.quadraticCurveTo(w * 0.5, h * 0.48, w, h * 0.6); ctx.stroke();
  const cx = w * 0.5, cy = h * 0.6, breathe = Math.sin(t * 1.2) * 1.5;
  ctx.save(); ctx.translate(cx, cy + breathe);
  // The open hand, palm up: the heel of the palm, four fingers curled at the far side, the thumb.
  ctx.fillStyle = sk2; ctx.beginPath(); ctx.ellipse(-70, 26, 46, 22, 0.1, 0, TAU); ctx.fill();          // the wrist and sleeve shadow
  rect(-150, 8, 90, 38, "#141a2c");                                                                 // the cuff of his jacket
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(-10, 18, 74, 30, 0.04, 0, TAU); ctx.fill();
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? skin : mix(skin, sk2, 0.25); ctx.beginPath(); ctx.ellipse(62 + k * 3, 2 + k * 11, 18, 8, -0.25, 0, TAU); ctx.fill(); }
  ctx.fillStyle = mix(skin, sk2, 0.15); ctx.beginPath(); ctx.ellipse(-20, -10, 30, 11, -0.35, 0, TAU); ctx.fill();   // the thumb
  // The pistol, side on: slide, trigger guard, grip.
  const gun = () => { ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(62, -22); ctx.lineTo(62, -6); ctx.lineTo(0, -6); ctx.lineTo(-6, 4); ctx.lineTo(-18, 4); ctx.quadraticCurveTo(-22, -2, -26, -6); ctx.lineTo(-34, -6); ctx.lineTo(-42, 26); ctx.lineTo(-62, 26); ctx.lineTo(-56, -6); ctx.lineTo(-60, -6); ctx.closePath(); };
  ctx.save(); ctx.rotate(-0.06); ctx.translate(4, 4);
  gun(); ctx.fillStyle = "#06070a"; ctx.fill(); ctx.strokeStyle = hexA(C.cyan, 0.75); ctx.lineWidth = 1.6; ctx.stroke();
  rect(-56, -19, 112, 2, "rgba(196,240,255,0.25)");
  ctx.restore();
  ctx.restore();
  vignette(0.85, 0.2);
}

// ---- The desert -----------------------------------------------------------------------------------
function desertNight(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.74;
  const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#03040c"); g.addColorStop(0.7, "#120c26"); g.addColorStop(1, "#2a1630"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
  stars(77, 220, 0, 0, w, gy * 0.95, t);
  // The mesas, red even at night.
  poly([0, gy, 0, gy - 70, 40, gy - 76, 70, gy - 108, 190, gy - 112, 220, gy - 80, 300, gy - 74, 330, gy], "#2c1418");
  poly([w * 0.55, gy, w * 0.6, gy - 46, w * 0.68, gy - 52, w * 0.7, gy - 86, w * 0.88, gy - 90, w * 0.9, gy - 60, w, gy - 54, w, gy], "#24101a");
  ctx.globalAlpha = 0.5; line(70, gy - 108, 190, gy - 112, "#7a3a2a", 1.5); line(w * 0.7, gy - 86, w * 0.88, gy - 90, "#7a3a2a", 1.5); ctx.globalAlpha = 1;
  rect(0, gy, w, h - gy, "#120a10");
  // The monastery: adobe blocks, the chapel with its bell tower and a candle in the window.
  const mx = w * 0.42, my = gy + 6, adobe = "#3a2420", adobeD = "#26160f";
  ctx.fillStyle = adobe; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx - 110, my - 46, 120, 46, 5) : ctx.rect(mx - 110, my - 46, 120, 46); ctx.fill();
  ctx.fillStyle = adobeD; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx + 4, my - 64, 92, 64, 5) : ctx.rect(mx + 4, my - 64, 92, 64); ctx.fill();
  ctx.fillStyle = adobe; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx + 60, my - 104, 30, 104, 4) : ctx.rect(mx + 60, my - 104, 30, 104); ctx.fill();
  rect(mx + 68, my - 96, 14, 18, "#0a0608");
  ctx.save(); ctx.translate(mx + 75, my - 92); ctx.rotate(o.bell ? Math.sin(t * 2.4) * 0.5 : 0); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fillStyle = "#6a5a3a"; ctx.fill(); ctx.restore();
  rect(mx + 74, my - 120, 2, 16, "#4a3424"); rect(mx + 69, my - 115, 12, 2, "#4a3424");
  for (const vx of [mx - 96, mx - 70, mx - 44]) rect(vx, my - 30, 8, 11, "#0a0608");
  const cw = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
  rect(mx + 30, my - 40, 10, 14, "#ffb04a"); glow(mx + 35, my - 33, 36, "#ffa040", 0.7 * cw);
  for (let i = 0; i < 7; i++) rect(mx - 110 + i * 17, my - 40, 4, 3, "#1a0e0a");          // the vigas
  // Desert plants.
  const r = seeded(19);
  for (let i = 0; i < 7; i++) { const x = r() * w, y = gy + 12 + r() * (h - gy - 12), s = 0.6 + r(); for (let k = -3; k <= 3; k++) line(x, y, x + k * 3 * s, y - (14 - Math.abs(k) * 2) * s, "#0b0608", 1.4); }
  if (o.light) glow(mx + 35, my - 33, 120 * o.light, C.holy, 0.6 * o.light);
}
// Fr. Lawrence's cell: an adobe wall, a small window of stars, the crucifix, his narrow bed.
function cellShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, L = o.light || 0;
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#2a1a16"); g.addColorStop(1, "#140c0a"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // The window.
  const wx = w * 0.62, wy = h * 0.14;
  rect(wx - 4, wy - 4, 78, 70, "#120a08"); rect(wx, wy, 70, 62, "#06071a"); ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, 70, 62); ctx.clip(); stars(5, 30, wx, wy, 70, 62, t); ctx.restore();
  rect(wx + 33, wy, 4, 62, "#120a08");
  // The crucifix.
  const kx = w * 0.32, ky = h * 0.18;
  rect(kx - 2, ky, 4, 54, "#0c0706"); rect(kx - 16, ky + 12, 32, 4, "#0c0706"); circle(kx, ky + 14, 3, "#0c0706");
  // The bed, and the man asleep in it.
  const by = h * 0.8;
  rect(w * 0.12, by, w * 0.72, 14, "#1a100c"); rect(w * 0.12, by + 14, 8, h, "#0e0806"); rect(w * 0.82, by + 14, 8, h, "#0e0806");
  ctx.fillStyle = "#4a3a30"; ctx.beginPath(); ctx.moveTo(w * 0.24, by); ctx.quadraticCurveTo(w * 0.3, by - 40, w * 0.5, by - 34); ctx.quadraticCurveTo(w * 0.66, by - 30, w * 0.8, by - 18); ctx.lineTo(w * 0.82, by); ctx.closePath(); ctx.fill();    // the blanket
  rect(w * 0.13, by - 14, 56, 14, "#5a4c40");                                                   // the pillow
  if (!o.empty) {
    const hx = w * 0.18 + 26, hy = by - 26 + Math.sin(t * 1.1) * 0.8;
    circle(hx, hy, 14, "#7a5444"); ctx.fillStyle = "#8d8a92"; ctx.beginPath(); ctx.arc(hx - 2, hy - 2, 14.5, PI * 0.8, PI * 1.9); ctx.fill();
    line(hx + 5, hy + 1, hx + 10, hy + 2, "#2a1a14", 1.6);
  }
  // The stool: his glasses, folded, and the breviary.
  const sx = w * 0.9, sy = by - 6;
  rect(sx - 18, sy, 36, 6, "#24160f"); rect(sx - 15, sy + 6, 4, 40, "#1a0f0a"); rect(sx + 11, sy + 6, 4, 40, "#1a0f0a");
  rect(sx - 14, sy - 6, 22, 6, "#3a0f12"); ctx.strokeStyle = "#c4f0ff"; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx + 6, sy - 9, 4, 0, TAU); ctx.arc(sx + 15, sy - 9, 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  // The light, when it comes.
  if (L > 0) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const lg = ctx.createLinearGradient(0, 0, w * 0.8, 0); lg.addColorStop(0, hexA(C.holy, 0.75 * L)); lg.addColorStop(1, hexA(C.holy, 0)); ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    ctx.restore(); glow(w * 0.02, h * 0.45, h * 1.1 * L, "#fff6dc", 0.8 * L);
  }
  vignette(0.6, 0.35);
}
// Fr. Lawrence, close: in the habit, grey hair, round glasses. `look`: "squint", "open", "wide",
// "kind", "down". `hand`: "shade" (against the light), "protest" ("Wait a minute"). The light
// comes from the left: gold in the desert, cyan in the city.
function lawrenceBust(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, light = o.light || C.holy, L = o.L === undefined ? 1 : o.L;
  if (o.bg) o.bg(t, A); else { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, mix("#2a1a16", light, 0.35 * L)); g.addColorStop(1, "#100a08"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  const cx = w * (o.x || 0.56), cy = h * 0.46 + (o.dy || 0), skin = "#8a6250", skinS = "#3e2a24", lit = mix(skin, light, 0.35 * L);
  // Shoulders: the black habit, the hood fallen behind.
  ctx.fillStyle = "#121018"; ctx.beginPath(); ctx.moveTo(cx - 150, h); ctx.quadraticCurveTo(cx - 130, cy + 70, cx - 30, cy + 72); ctx.lineTo(cx + 40, cy + 72); ctx.quadraticCurveTo(cx + 140, cy + 76, cx + 170, h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#0a0910"; ctx.beginPath(); ctx.ellipse(cx + 40, cy + 74, 60, 22, 0.1, 0, TAU); ctx.fill();
  rect(cx - 22, cy + 40, 40, 36, skinS);                                                         // the neck
  // The head: a long face, turned a little to the light.
  ctx.fillStyle = skinS; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 64, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = lit; ctx.beginPath(); ctx.ellipse(cx - 10, cy + 2, 44, 60, 0, PI * 0.5, PI * 1.5); ctx.ellipse(cx - 10, cy + 2, 20, 60, 0, PI * 1.5, PI * 0.5); ctx.fill();
  ctx.fillStyle = skinS; ctx.beginPath(); ctx.ellipse(cx + 48, cy + 6, 9, 15, 0.1, 0, TAU); ctx.fill();                  // the ear
  ctx.fillStyle = "#8d8a92"; ctx.beginPath(); ctx.ellipse(cx + 8, cy - 40, 50, 30, 0.15, PI * 0.95, PI * 2.05); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 40, cy - 18, 16, 28, 0.2, 0, TAU); ctx.fill();
  // The nose and mouth.
  ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(cx - 22, cy - 6); ctx.quadraticCurveTo(cx - 40, cy + 20, cx - 30, cy + 22); ctx.lineTo(cx - 18, cy + 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 18, cy + 20); ctx.lineTo(cx - 12, cy + 18); ctx.stroke();
  const mouth = o.mouth || "closed";
  if (mouth === "open") { circle(cx - 18, cy + 38, 6 + Math.sin(t * 6) * 0.6, "#1a0a08"); }
  else if (mouth === "smile") { ctx.beginPath(); ctx.moveTo(cx - 32, cy + 35); ctx.quadraticCurveTo(cx - 18, cy + 44, cx - 4, cy + 34); ctx.strokeStyle = "#2a120e"; ctx.lineWidth = 2.6; ctx.stroke(); }
  else line(cx - 30, cy + 38, cx - 6, cy + 37, "#2a120e", 2.6);
  // The eyes, behind round glasses.
  const look = o.look || "open";
  for (const [ex, k] of [[cx - 30, 1], [cx + 10, 0.8]]) {
    const ey = cy - 10;
    if (look === "squint") { ctx.beginPath(); ctx.moveTo(ex - 9 * k, ey); ctx.quadraticCurveTo(ex, ey + 3, ex + 9 * k, ey - 1); ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 2.4; ctx.stroke(); }
    else if (look === "down") { ctx.beginPath(); ctx.moveTo(ex - 9 * k, ey + 1); ctx.quadraticCurveTo(ex, ey + 6, ex + 9 * k, ey + 1); ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 2.4; ctx.stroke(); }
    else {
      const r = look === "wide" ? 6.5 : 5;
      ctx.fillStyle = "#e2d8cc"; ctx.beginPath(); ctx.ellipse(ex, ey, 9 * k, r, 0, 0, TAU); ctx.fill();
      circle(ex - 2 * k, ey + 0.5, 3.6, "#3a2414"); circle(ex - 3 * k, ey - 1, 1.1, "#ffffff");
      line(ex - 10 * k, ey - r + 0.5, ex + 9 * k, ey - r, "#1a0e0a", 2.2);
      if (look === "kind") for (const d of [-1, 0, 1]) line(ex + 11 * k, ey + d * 3, ex + 16 * k, ey + d * 5, "rgba(0,0,0,0.3)", 1.2);
    }
    const br = look === "wide" ? -9 : look === "squint" ? 2 : look === "kind" ? -2 : -4;
    line(ex - 11 * k, ey - 12 + br + (k < 1 ? 1 : 0), ex + 10 * k, ey - 13 + br, "#5a5660", 3.4);
    ctx.strokeStyle = "#0e0a0a"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(ex, ey, 14 * k, 12, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25 * L; ctx.beginPath(); ctx.ellipse(ex - 4 * k, ey - 4, 6 * k, 3, -0.6, 0, TAU); ctx.fillStyle = light; ctx.fill(); ctx.restore();
  }
  line(cx - 16, cy - 12, cx - 4, cy - 12, "#0e0a0a", 2.2);
  if (o.askew) { ctx.save(); ctx.translate(cx - 10, cy - 10); ctx.rotate(0.12); ctx.restore(); }
  // His hand.
  const hand = o.hand;
  if (hand) {
    const hx = hand === "shade" ? cx - 50 : cx - 70, hy = hand === "shade" ? cy - 40 : cy + 60, a = hand === "shade" ? -0.5 : -0.15;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    ctx.fillStyle = "#121018"; ctx.beginPath(); ctx.moveTo(-26, 120); ctx.lineTo(-18, 30); ctx.lineTo(18, 30); ctx.lineTo(26, 120); ctx.closePath(); ctx.fill();     // the sleeve
    ctx.fillStyle = lit; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-20, -18, 40, 50, 12) : ctx.rect(-20, -18, 40, 50); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-19 + k * 10, -50 + Math.abs(k - 1.5) * 5, 9, 38, 4.5) : ctx.rect(-19 + k * 10, -50, 9, 38); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(24, 4, 7, 16, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  vignette(0.55, 0.35);
}
// The chapel: candle, the red sanctuary lamp, and Fr. Lawrence on his knees.
function chapelShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.86;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0c0806"); g.addColorStop(1, "#22140e"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const ax = w * 0.7;
  // The altar, the tabernacle, the candle and the sanctuary lamp.
  rect(ax - 70, gy - 60, 140, 60, "#2e1c14"); rect(ax - 74, gy - 64, 148, 6, "#e8dccb");
  rect(ax - 14, gy - 92, 28, 28, "#8a6a2a"); rect(ax - 10, gy - 88, 20, 20, "#b8923a"); glow(ax, gy - 78, 30, C.holy, 0.4);
  const fl = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 4.3);
  for (const cxx of [ax - 50, ax + 50]) { rect(cxx - 3, gy - 96, 6, 32, "#efe6d6"); circle(cxx, gy - 100, 3, "#ffd27a"); glow(cxx, gy - 102, 50, "#ffb04a", 0.65 * fl); }
  const lx = ax - 120, ly = h * 0.22 + Math.sin(t * 0.8) * 1.5;
  line(lx, 0, lx, ly - 8, "#3a2a1a", 1); rect(lx - 6, ly - 8, 12, 14, "#7a1010"); glow(lx, ly, 40, C.red, 0.7 * fl);
  // Adobe walls catch the light.
  glowOval(ax, gy - 70, 260, 140, "#ffa040", 0.2 * fl);
  rect(0, gy, w, h - gy, "#1a0f0a");
  // Fr. Lawrence, kneeling.
  const kx = w * 0.32;
  glow(kx + 20, gy - 70, 150, "#ffa040", 0.18 * fl); glowOval(kx + 10, gy - 4, 90, 12, "#ffa040", 0.2 * fl);
  const kp = o.kneel || pose({ lean: 0.05, head: o.head === undefined ? -0.1 : o.head, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6, sF: 0.6, eF: 1.9, sB: 0.5, eB: 1.9 });
  drawFigure("monk", kx, gy, 1.55, 1, kp, { t, rim: "#ffa040", rimX: 2, noGlasses: true });
  if (o.spirit) {
    // The rest of him, lifted away by the angel, while his body stays on its knees.
    const k = smooth(o.spirit);
    drawFigure("monk", kx + 6, gy - 50 * k, 1.55, 1, pose({ lean: 0.02 - 0.12 * k, head: -0.35 * k, hF: 0.02 + 0.05 * k, kF: 1.55 * (1 - k), hB: -0.02, kB: 1.6 * (1 - k), sF: 0.6 + 0.8 * k, eF: 1.9 * (1 - k) + 0.1, sB: 0.5 + 0.6 * k, eB: 1.9 * (1 - k) + 0.1 }), { t, alpha: 0.4 * (1 - k * 0.3), pal: { robe: "#e8dcc0", robe2: "#c8b890", scap: "#f2e6c8", skin: "#fff3cf", skinSh: "#e8d0a0", hair: "#fff3cf" }, noGlasses: true });
    glow(kx, gy - 80 - 50 * k, 140, C.holy, 0.35 * k);
  }
  vignette(0.6, 0.3);
}
// A rooftop in the rain, the neon city below: Fr. Lawrence in his coat and hat, the angel behind.
function rooftopShot(t, A, o) {
  o = o || {};
  const w = A.w, h = A.h, gy = h * 0.86;
  const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#03040a"); g.addColorStop(1, "#14183a"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  skyline(61, -10, w + 10, gy - 20, 40, 180, "#0a0f24", { t, winA: 0.6 });
  skyline(62, -10, w + 10, gy + 30, 20, 110, "#070a18", { t, winA: 0.7 });
  neon("HOTEL", w * 0.12, gy - 60, 13, C.pink, t, { flicker: true }); neon("BAR", w * 0.85, gy - 40, 12, C.cyan, t, {});
  rect(0, gy, w, h - gy, "#05050b"); rect(0, gy, w, 2, "#1a1e34");
  const px = w * (o.x || 0.5), fs = o.title ? 1.05 : 1.25;
  glow(px - 20, gy - 90 * fs, 150 * fs, C.holy, 0.12);
  if (o.angel !== false) drawFigure("angel", px - 50 * fs, gy - 2, fs * 0.93, 1, pose({ wa: -2.35, wl: 0.85 + 0.15 * Math.sin(t * 1.4), lift: 4 + Math.sin(t * 1.2) * 3, sF: 0.5, eF: 0.4 }), { t, shine: 0.9 });
  drawFigure("priest", px, gy, fs, 1, pose({ lean: 0.02, head: 0.06, sF: 0.08, eF: 0.2, sB: -0.05, eB: 0.2, hF: 0.06, hB: -0.06 }), { t, rim: C.cyan, rimX: 2, flow: 0.25 });
  rain(t, 150, 0, 0, w, h, { seed: 21 });
  if (o.title) {
    const a = smooth((t - 1.4) / 1.6);
    if (a > 0) {
      text("FEAR NOT", w / 2, h * 0.19, { align: "center", font: FONT.title, size: 44, weight: 700, spacing: 10, color: "#ffffff", glow: "rgba(232,196,106,0.75)", blur: 26, alpha: a });
      text("A desert monk, his guardian angel, and a city of shadows", w / 2, h * 0.19 + 26, { align: "center", font: FONT.line, italic: true, size: 16, weight: 500, color: C.holy, alpha: a * 0.9 });
    }
  }
  vignette(0.6, 0.35);
}

// ---- The street, before the fight ---------------------------------------------------------------
function brimShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#06070e");
  skyline(5, -10, w + 10, h + 40, 60, 260, "#0b1226", { t, winA: 0.4 });
  // The brim of the fedora across the top of the picture, and the drops running off it.
  ctx.fillStyle = "#0c0b12"; ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(w + 10, -10); ctx.lineTo(w + 10, h * 0.32); ctx.quadraticCurveTo(w * 0.5, h * 0.5, -10, h * 0.36); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(-10, h * 0.36); ctx.quadraticCurveTo(w * 0.5, h * 0.5, w + 10, h * 0.32); ctx.stroke(); ctx.globalAlpha = 1;
  glowOval(w * 0.2, h * 0.4, 160, 18, C.cyan, 0.4);
  const r = seeded(6);
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) / 9 * w + r() * 30, u = x / w, by = h * (0.36 * (1 - u) + 0.32 * u) + 2 * h * 0.14 * u * (1 - u) * 2;
    const per = 1.4 + r() * 1.6, k = ((t + r() * 3) % per) / per, y = by + Math.pow(k, 2.2) * h * 1.1;
    circle(x, y, 2.6, "rgba(196,240,255,0.85)"); glow(x, y, 7, C.cyan, 0.4);
    if (k < 0.15) circle(x, by + 2, 2.2 * (k / 0.15), "rgba(196,240,255,0.7)");
  }
  // Below the brim: his face in shadow, the rim of his glasses catching the cyan, his chin,
  // and at the very bottom the white of his collar.
  const fx = w * 0.5;
  ctx.fillStyle = "#24170f"; ctx.beginPath(); ctx.moveTo(fx - 120, h * 0.45); ctx.quadraticCurveTo(fx - 130, h * 0.95, fx - 30, h * 1.02); ctx.lineTo(fx + 60, h * 1.02); ctx.quadraticCurveTo(fx + 140, h * 0.9, fx + 120, h * 0.42); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(fx - 120, h * 0.45); ctx.quadraticCurveTo(fx - 130, h * 0.95, fx - 30, h * 1.02); ctx.lineTo(fx - 22, h * 1.02); ctx.quadraticCurveTo(fx - 116, h * 0.92, fx - 108, h * 0.45); ctx.closePath(); ctx.fillStyle = C.cyan; ctx.fill(); ctx.restore();
  ctx.strokeStyle = "#0a0808"; ctx.lineWidth = 4;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + d * 46, h * 0.5, 34, 22, 0, 0.1, PI - 0.1); ctx.stroke(); }
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(fx - 46, h * 0.5, 34, 22, 0, PI * 0.55, PI * 0.95); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  line(fx - 20, h * 0.78, fx + 26, h * 0.79, "#120a08", 3);
  rect(fx - 40, h * 0.97, 80, 14, "#0c0b12"); rect(fx - 12, h * 0.955, 26, 9, "#f6f8ff"); glow(fx, h * 0.97, 30, "#ffffff", 0.35);
  rain(t, 80, 0, h * 0.4, w, h * 0.6, { seed: 9 });
  vignette(0.7, 0.3);
}

// ---- After the fight: the guardian ---------------------------------------------------------------
function guardianStandShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.88;
  carStreetShot(t, A, { lit: 0.35, carX: w * 0.36, dash: 1 });
  // The broken chains, fading on the wet street.
  ctx.globalAlpha = 0.6 * (1 - smooth(t / 6));
  for (let i = 0; i < 6; i++) { const x = w * 0.45 + i * 16, y = gy - 4 + (i % 2) * 3; ctx.strokeStyle = "#1a0a14"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 7, 4, i * 0.6, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawFigure("angel", w * 0.58, gy, 1.2, -1, pose({ wa: -2.2, wl: 0.7, sF: 0.3, eF: 0.2, lift: 2 }), { t, pal: GUARD, shine: 0.6 });
  drawFigure("angel", w * 0.78, gy, 1.25, -1, pose({ wa: -2.0, wl: 0.4 }), { t, shine: 0.8 });
  drawFigure("priest", w * 0.7, gy, 1.12, -1, pose({ lean: 0.05, head: 0.1 }), { t, rim: C.red, rimX: -2 });
}

// ---- The choice --------------------------------------------------------------------------------
// The child's drawing taped to the dashboard: a house, a sun, two figures holding hands.
function drawingShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#05060c");
  glowOval(w * 0.5, h * 0.9, w * 0.6, 60, C.cyan, 0.2);
  rect(0, h * 0.8, w, h, "#0a0c14");
  ctx.save(); ctx.translate(w * 0.5, h * 0.5); ctx.rotate(-0.05);
  rect(-150, -100, 300, 200, "#e9e2cf");
  ctx.globalAlpha = 0.85;
  rect(-130, 70, 260, 6, "#4a9a4a");
  poly([-110, 70, -110, 10, -75, -22, -40, 10, -40, 70], "#c84a4a"); poly([-118, 12, -75, -28, -32, 12], "#6a3a2a");
  rect(-86, 36, 18, 34, "#4a3020");
  circle(100, -60, 18, "#f2c030"); for (let k = 0; k < 8; k++) { const a = k * PI / 4; line(100 + Math.cos(a) * 22, -60 + Math.sin(a) * 22, 100 + Math.cos(a) * 32, -60 + Math.sin(a) * 32, "#f2c030", 3); }
  // Two figures: a tall one and a small one, holding hands.
  ctx.strokeStyle = "#2a2a6a"; ctx.lineWidth = 3; ctx.lineCap = "round";
  const fig = (x, y, s, c) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x, y - 30 * s, 9 * s, 0, TAU); ctx.moveTo(x, y - 21 * s); ctx.lineTo(x, y + 6 * s); ctx.moveTo(x, y + 6 * s); ctx.lineTo(x - 8 * s, y + 24 * s); ctx.moveTo(x, y + 6 * s); ctx.lineTo(x + 8 * s, y + 24 * s); ctx.moveTo(x - 14 * s, y - 10 * s); ctx.lineTo(x + 14 * s, y - 10 * s); ctx.stroke(); };
  fig(10, 40, 1.15, "#2a2a6a"); fig(52, 52, 0.75, "#c83a7a");
  ctx.globalAlpha = 1;
  text("COME HOME DADDY", 0, -72, { align: "center", size: 18, weight: 800, color: "#3a3ac8", spacing: 1, font: "'Comic Sans MS', 'Chalkboard SE', " + FONT.ui });
  rect(-40, -108, 80, 14, "rgba(240,240,220,0.5)");
  ctx.restore();
  glow(w * 0.5, h * 0.5, 240, C.cyan, 0.1);
  vignette(0.75, 0.3);
}
// The storm drain, and what falls into it.
function drainShot(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#07080e");
  // The kerb and the gutter, running with rain and neon.
  poly([0, h * 0.35, w, h * 0.3, w, h * 0.44, 0, h * 0.5], "#12141e");
  wetStreet(h * 0.5, h, [[w * 0.3, C.red, 1, 50], [w * 0.7, C.pink, 1, 30]], t);
  const gx = w * 0.5, gy = h * 0.62;
  rect(gx - 120, gy - 26, 240, 52, "#020203");
  for (let i = 0; i < 11; i++) rect(gx - 116 + i * 22, gy - 26, 8, 52, "#20222c");
  const r = seeded(13);
  for (let i = 0; i < 30; i++) { const x = r() * w, y = h * 0.5 + ((r() * h * 0.5 + t * 60) % (h * 0.5)); line(x, y, x + 18, y + 1, "rgba(196,240,255,0.15)", 1); }
  // The gun, falling, and gone.
  const k = clamp((t - 0.6) / 0.7, 0, 1);
  if (k < 1) { ctx.save(); ctx.translate(gx + 10, lerp(-40, gy, k * k)); ctx.rotate(0.3 + k * 1.2); poly([-34, -6, 16, -6, 16, 3, -8, 3, -12, 17, -24, 17, -20, 3, -34, 3], "#05060a"); ctx.strokeStyle = hexA(C.red, 0.7); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  else if (t < 2.6) { const s = (t - 1.3) * 40; ctx.globalAlpha = Math.max(0, 1 - (t - 1.3)); for (let i = 0; i < 8; i++) { const a = -PI * (0.1 + 0.8 * i / 7); circle(gx + Math.cos(a) * s, gy - 10 + Math.sin(a) * s * 0.6, 2.2, "#c4f0ff"); } ctx.globalAlpha = 1; }
  rain(t, 100, 0, 0, w, h, { seed: 17, len: 18 });
  vignette(0.6, 0.3);
}
// The car pulls away, and one by one the streetlights come back on.
function lightsOnShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.8;
  const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#03050c"); g.addColorStop(1, "#0f1a34"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
  skyline(23, -10, w + 10, gy - 60, 40, 150, "#081022", { t, winA: 0.6, lit: clamp(0.3 + t * 0.15, 0, 1) });
  const lamps = [0.08, 0.3, 0.52, 0.74, 0.96], refl = [];
  for (const [i, u] of lamps.entries()) { const on = clamp((t - 1 - i * 0.55) * 4, 0, 1); lamp(w * u, gy, 110, C.ice, on, 0.9); if (on > 0) refl.push([w * u + 10, C.ice, on, 12]); }
  wetStreet(gy, h, refl, t);
  car(w * 0.25 + Math.pow(Math.max(0, t - 0.5), 1.6) * 90, h * 0.93, 1.4, { t, lights: 1, dash: 1, bow: 0 });
  rain(t, 110, 0, 0, w, h, { seed: 11 });
  vignette(0.55, 0.35);
}
function skylineOnShot(t, A) {
  const w = A.w, h = A.h;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#04060e"); g.addColorStop(1, "#16223e"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const dx = -60 + t * w * 0.3;
  skyline(41, -20, w + 40, h * 0.95, 30, 120, "#0a1224", { t, winA: 0.6, dark: true, darkX: dx - 200, darkDir: 1 });
  skyline(17, -20, w + 40, h + 6, 60, 200, "#060a16", { t, winA: 0.8, dark: true, darkX: dx, darkDir: 1 });
  rain(t, 80, 0, 0, w, h, { seed: 3 });
  vignette(0.5, 0.3);
}
// Inside the apartment: the door opens, and the light from the hall falls in.
function doorShot(t, A) {
  const w = A.w, h = A.h, k = smooth((t - 0.5) / 1.6);
  rect(0, 0, w, h, "#0d0914");
  const dx = w * 0.55, dw = 110, dt = h * 0.06;
  rect(dx - 6, dt - 6, dw + 12, h, "#1a1224");
  ctx.save(); ctx.beginPath(); ctx.rect(dx, dt, dw, h); ctx.clip();
  rect(dx, dt, dw, h, "#ffe2b0"); glow(dx + dw / 2, h * 0.5, 160, "#fff0d0", 0.6);
  // His figure in the doorway, coat wet.
  if (k > 0.3) { ctx.globalAlpha = smooth((k - 0.3) / 0.5); ctx.fillStyle = "#1a1210"; ctx.beginPath(); ctx.arc(dx + dw * 0.5, dt + 52, 14, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(dx + dw * 0.5 - 26, h); ctx.lineTo(dx + dw * 0.5 - 22, dt + 72); ctx.quadraticCurveTo(dx + dw * 0.5, dt + 64, dx + dw * 0.5 + 22, dt + 72); ctx.lineTo(dx + dw * 0.5 + 26, h); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  // The door, swinging in.
  const open = k * dw * 0.9;
  poly([dx, dt, dx + dw - open, dt + open * 0.1, dx + dw - open, h + 10, dx, h], "#2a1c26");
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.22 * k;
  poly([dx + dw - open, h * 0.78, dx + dw, h * 0.78, dx + dw + 160, h, dx - 40 - open * 0.5, h], "#ffe2b0"); ctx.restore();
  glowOval(dx + dw - open * 0.5, h * 0.92, 120 * k + 1, 30 * k + 1, "#ffe2b0", 0.35 * k);
  vignette(0.6, 0.3);
}
// Her face, in the light from the door.
function girlFaceShot(t, A) {
  const w = A.w, h = A.h, cx = w * 0.5, cy = h * 0.56, skin = "#c69078", skinS = "#7a4e40", k = smooth((t - 0.6) / 1.4);
  const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#1a0e22"); g.addColorStop(1, mix("#1a0e22", "#ffe2b0", 0.45)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.ellipse(cx - 6, cy - 8, 118, 128, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = skinS; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 96, 108, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = mix(skin, "#ffe2b0", 0.35); ctx.beginPath(); ctx.ellipse(cx + 14, cy + 10, 82, 104, 0, -PI / 2, PI / 2); ctx.ellipse(cx + 14, cy + 10, 50, 104, 0, PI / 2, -PI / 2, true); ctx.fill();
  // Bangs.
  ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.moveTo(cx - 100, cy - 30); ctx.quadraticCurveTo(cx - 60, cy - 130, cx + 30, cy - 120); ctx.quadraticCurveTo(cx + 100, cy - 110, cx + 104, cy - 20); ctx.quadraticCurveTo(cx + 60, cy - 60, cx + 20, cy - 52); ctx.quadraticCurveTo(cx - 40, cy - 70, cx - 100, cy - 30); ctx.fill();
  // Big eyes, wet, opening wide.
  for (const ex of [cx - 38, cx + 40]) {
    const ey = cy + 4, eh = 13 + 5 * k;
    ctx.fillStyle = "#efe6dc"; ctx.beginPath(); ctx.ellipse(ex, ey, 21, eh, 0, 0, TAU); ctx.fill();
    circle(ex + 3, ey + 1, 11.5, "#4a2a1a"); circle(ex + 3, ey + 1, 5.2, "#0a0505"); circle(ex + 7, ey - 4, 3.6, "#ffffff"); circle(ex - 2, ey + 6, 1.6, "#ffffff");
    ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.ellipse(ex, ey, 21, eh, 0, PI * 1.05, PI * 1.95); ctx.stroke();
    line(ex - 18, ey - 26 - 6 * k, ex + 16, ey - 28 - 6 * k, "#2a1a14", 3.5);
    if (k > 0.5) { glow(ex + 12, ey + eh + 4, 6, "#ffffff", 0.5); circle(ex + 12, ey + eh + 4 + (t % 2) * 12, 2.2, "rgba(255,255,255,0.7)"); }
  }
  // The nose, and a smile breaking.
  line(cx + 4, cy + 30, cx + 10, cy + 36, "rgba(0,0,0,0.25)", 2);
  ctx.beginPath(); ctx.moveTo(cx - 20, cy + 58 - 2 * k); ctx.quadraticCurveTo(cx + 4, cy + 58 + 14 * k, cx + 28, cy + 56 - 4 * k); ctx.strokeStyle = "#5a2420"; ctx.lineWidth = 3.2; ctx.stroke();
  ctx.globalAlpha = 0.25 * k; circle(cx - 60, cy + 40, 16, "#ff7a9a"); circle(cx + 70, cy + 40, 16, "#ff7a9a"); ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 97, 109, 0, PI * 0.7, PI * 1.3); ctx.strokeStyle = C.pink; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  vignette(0.55, 0.4);
}

// ---- Vigils ----------------------------------------------------------------------------------------
function bellTowerShot(t, A) {
  const w = A.w, h = A.h;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#04050e"); g.addColorStop(1, "#1e1430"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  stars(88, 160, 0, 0, w, h * 0.9, t);
  const tx = w * 0.5, adobe = "#3a2420";
  ctx.fillStyle = adobe; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - 70, h * 0.2, 140, h, 8) : ctx.rect(tx - 70, h * 0.2, 140, h); ctx.fill();
  ctx.fillStyle = "#08050a"; ctx.beginPath(); ctx.moveTo(tx - 40, h * 0.75); ctx.lineTo(tx - 40, h * 0.42); ctx.arc(tx, h * 0.42, 40, PI, TAU); ctx.lineTo(tx + 40, h * 0.75); ctx.closePath(); ctx.fill();
  rect(tx - 3, h * 0.02, 6, h * 0.18, "#2a1a14"); rect(tx - 18, h * 0.07, 36, 6, "#2a1a14");
  const a = Math.sin(t * 2.2) * 0.55 * Math.max(0, 1 - t / 14);
  ctx.save(); ctx.translate(tx, h * 0.4); ctx.rotate(a);
  rect(-2, 0, 4, 10, "#1a120a"); ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-16, 40, -28, 52); ctx.lineTo(28, 52); ctx.quadraticCurveTo(16, 40, 14, 10); ctx.closePath(); ctx.fillStyle = "#7a6234"; ctx.fill();
  circle(0, 54, 5, "#5a4624"); ctx.restore();
  line(tx + Math.sin(a) * 50, h * 0.4 + 50, tx + 10, h, "#5a4030", 1.4);
  glowOval(tx, h * 0.98, 140, 30, "#ffa040", 0.25);
  vignette(0.5, 0.35);
}
// The brothers filing into the chapel past the lit door, hoods up.
function brothersShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.9;
  rect(0, 0, w, h, "#120a08");
  const dx = w * 0.38, dw = 120;
  rect(dx, h * 0.12, dw, gy - h * 0.12, "#3a2414"); ctx.beginPath(); ctx.arc(dx + dw / 2, h * 0.12 + 2, dw / 2, PI, TAU); ctx.fillStyle = "#3a2414"; ctx.fill();
  glow(dx + dw / 2, gy - 60, 180, "#ffa040", 0.55);
  rect(0, gy, w, h - gy, "#0c0806");
  for (let i = 0; i < 6; i++) {
    const x = w * 0.92 - (t * 46 - i * 76);
    if (x < -60 || x > w + 60) continue;
    const ph = t * 4.2 + i, sw = Math.sin(ph) * 0.35;
    drawFigure("monk", x, gy, 1.5, -1, pose({ lean: 0.08, head: 0.15, hF: sw, kF: Math.max(0, -sw) * 0.6, hB: -sw, kB: Math.max(0, sw) * 0.6, sF: 0.55, eF: 1.75, sB: 0.45, eB: 1.8 }), { t, hood: true, rim: "#ffa040", rimX: -2, handsHidden: true });
  }
  vignette(0.6, 0.3);
}
// The choir stalls, candles, and the first words of the Night Office.
function choirShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.88;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0a0605"); g.addColorStop(1, "#1e120c"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { const cx = w * (0.15 + i * 0.24), fl = 0.8 + 0.2 * Math.sin(t * 8 + i * 2); rect(cx - 2, gy - 120, 4, 22, "#efe6d6"); circle(cx, gy - 124, 2.5, "#ffd27a"); glow(cx, gy - 126, 60, "#ffa040", 0.45 * fl); }
  rect(0, gy - 40, w, 40, "#24160e"); rect(0, gy - 44, w, 5, "#3a2414");
  for (let i = 0; i < 7; i++) drawFigure("monk", w * (0.08 + i * 0.14), gy - 8, 1.25, 1, pose({ lean: 0.04, head: -0.12, sF: 0.5, eF: 1.7, sB: 0.4, eB: 1.8 }), { t: t + i, hood: i !== 3, rim: "#ffa040", rimX: 2, handsHidden: true, noGlasses: true });
  rect(0, gy - 10, w, h - gy + 10, "#160d08");
  vignette(0.55, 0.3);
}
function endCard(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#050407");
  const a = smooth(t / 2);
  glow(w / 2, h * 0.42, 220, C.holy, 0.12 * a);
  text("FEAR NOT", w / 2, h * 0.42, { align: "center", font: FONT.title, size: 48, weight: 700, spacing: 10, color: "#ffffff", glow: "rgba(232,196,106,0.7)", blur: 24, alpha: a });
  text("The first night", w / 2, h * 0.42 + 34, { align: "center", font: FONT.line, italic: true, size: 20, weight: 500, color: C.holy, alpha: a });
}

// ---- The scripts -----------------------------------------------------------------------------------
const SCENES = {
  // 1. Bring Daddy Home.
  cold: () => [
    { draw: radioShot, caption: "2:00 AM", music: "radio", now: true, level: 0, amb: { rain: 0.5 }, zoom: 0.06, fx: 0.42, fy: 0.5,
      lines: [["radio", "…a week now. Every night, a few more blocks of the city go dark."], ["radio", "The power company says it can find no fault. Tonight it was the Eastside…"]] },
    { draw: skylineDarkShot, zoom: 0.04, lines: [["radio", "…keep a flashlight by the bed. Stay indoors."]] },
    { draw: girlWindowShot, amb: { rain: 0.8 }, zoom: 0.08, fx: 0.42, fy: 0.55, lines: [["girl", "Please bring Daddy home."]] },
    { draw: girlHandsShot, hold: 3.2, zoom: 0.05 },
    { draw: carStreetShot, hold: 3.6, amb: { rain: 1 }, zoom: 0.05, fx: 0.3, fy: 0.8, caption: "Across the city" },
    { draw: mirrorShot, hold: 3.0, zoom: 0.04 },
    { draw: phoneShot, enter: () => Sound.fx.buzz(), lines: [["caption", "Deep in debt to the wrong people."]] },
    { draw: handsGunShot, hold: 3.0, level: 1, enter: () => Sound.fx.heart(0.8), zoom: 0.05 },
    { draw: (t, A) => carStreetShot(t, A, { shapes: true, lamp: 0.25 }), level: 2, zoom: 0.07, fx: 0.32, fy: 0.75,
      lines: [["whisper", "Just this once."], ["whisper", "Nobody gets hurt."], ["whisper", "You have no choice."]] },
  ],
  // 2. Someone Asked.
  desert: () => [
    { draw: desertNight, cut: "hard", music: "silence", now: true, amb: { rain: 0, wind: 0.15, windF: 300 }, hold: 4.2, caption: "The same night. A monastery in the desert.", zoom: 0.04, fx: 0.45, fy: 0.7 },
    { draw: cellShot, hold: 3.0, music: "desert", now: true, level: 0 },
    { draw: (t, A) => cellShot(t, A, { light: smooth(t / 1.5) }), enter: () => Sound.fx.glory(), level: 1, lines: [["angel", "Get up."], ["angel", "Someone asked."]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "squint", hand: "shade", L: 1 }), lines: [["lawrence", "Asked? Who… who asked?", "gasp"], ["angel", "A child, in a city far from here. She asked for her father."], ["angel", "We have work to do."]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "wide", hand: "protest", mouth: "open", L: 1 }), zoom: 0.05, fx: 0.5, fy: 0.45,
      lines: [["lawrence", "Wait a minute. I'm not Padre Pio!"], ["lawrence", "I lose my glasses twice a day. I fell asleep in Vespers. Twice this week."]] },
    { draw: (t, A) => angelShot(t, A, {}), zoom: 0.04, lines: [["angel", "No. You are not."], ["angel", "He knows every weakness you have. He means to show His power through them."], ["angel", "“Power is made perfect in infirmity.”"]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "kind", mouth: "smile", L: 0.8 }), lines: [["lawrence", "…Let me find my shoes.", "sigh"], ["angel", "Leave them. Your body will stay here, kneeling. The rest of you comes with me."]] },
    { draw: (t, A) => chapelShot(t, A, { spirit: clamp((t - 1) / 2.5, 0, 1) }), hold: 4.6, enter: () => Sound.fx.glory() },
    { draw: (t, A) => chapelShot(t, A, { spirit: 1 }), lines: [["lawrence", "Should I bring my hat?"], ["angel", "Bring what you like. It is your own imagination I am using."]] },
    { draw: (t, A) => rooftopShot(t, A, { title: true }), music: "noir", level: 0, now: true, amb: { rain: 1, wind: 0 }, lines: [["angel", "Fear not."]] },
  ],
  // 4a. The street, before the fight.
  street: () => [
    { draw: brimShot, music: "radio", now: true, level: 1, amb: { rain: 1, wind: 0 }, lines: [["lawrence", "What are they?"]] },
    { draw: (t, A) => demonShot(t, A, { eyes: [[0.3, 0.45, 1], [0.72, 0.38, 0.7], [0.55, 0.7, 0.5]] }), lines: [["angel", "What you will see is a fight. What is really happening is beyond what you can understand."], ["angel", "I am showing it to you with what you already have."]] },
    { draw: (t, A) => eyesShot(t, A, { skin: "#8a6250", shade: "#2a1a16", brow: "#4a4650", irisC: "#5a3a22", side: -1, rim: C.cyan, glasses: true, crow: true, bags: true, open: 0.85, look: 0.5, rain: true }), zoom: 0.03,
      lines: [["angel", "If you had grown up on westerns, this would be a showdown at noon."], ["lawrence", "I grew up on kung fu films."], ["angel", "I know."]] },
  ],
  // 4b. After the fight: what the guardian has seen.
  guardian: () => [
    { draw: (t, A) => angelShot(t, A, { cool: true, k: 0.8 }), music: "noir", level: 0, amb: { rain: 0.7 }, lines: [["guardian", "Thank you, brothers. I have been calling since midnight."], ["guardian", "His name is Danny. He owes money to a man uptown: Mr. Crane. Half this district owes Mr. Crane."]] },
    { draw: guardianStandShot, lines: [["guardian", "And the lights. The first to go out was the sanctuary lamp at St. Brigid's, by the river, a week ago tonight."], ["guardian", "The streets went dark after it, one by one."], ["lawrence", "A sanctuary lamp doesn't go out by itself."], ["angel", "No. It does not."]] },
    { draw: guardianStandShot, lines: [["lawrence", "What happens now?"], ["angel", "Now he chooses. We cannot choose for him."], ["guardian", "But the fog round him is gone. He can see his way."]] },
  ],
  // 5. The choice.
  choice: () => [
    { draw: (t, A) => eyesShot(t, A, { skin: "#9a6e5a", shade: "#2e1c18", brow: "#140c0a", irisC: "#5a6a78", open: 0.7, side: 1, rim: C.cyan, bags: true, wet: true, tear: true, look: 0.2, lookY: 0.6, browTilt: 0.6 }), music: "home", level: 0, amb: { rain: 0.8 }, hold: 3.4 },
    { draw: drawingShot, hold: 4.2, zoom: 0.08 },
    { draw: drainShot, hold: 3.4, enter: () => setTimeout(() => Sound.fx.splash(true), 1300) },
    { draw: lightsOnShot, level: 1, enter: () => { Sound.fx.engine(); [1, 1.55, 2.1, 2.65, 3.2].forEach((s, i) => setTimeout(() => Sound.fx.lightOn(i), s * 1000)); }, hold: 5.2 },
    { draw: skylineOnShot, hold: 4.0, enter: () => Sound.fx.glory() },
    { draw: doorShot, level: 2, enter: () => Sound.fx.door(), hold: 3.4 },
    { draw: girlFaceShot, hold: 3.0, zoom: 0.06, fx: 0.5, fy: 0.5, lines: [["girl", "Daddy."]] },
  ],
  // 6. Vigils.
  bell: () => [
    { draw: (t, A) => chapelShot(t, A, { head: t < 0.8 ? -0.1 : -0.1 + 0.35 * smooth((t - 0.8) / 0.3) }), cut: "hard", music: "stop", amb: { rain: 0, wind: 0.08, windF: 300 }, enter: () => Sound.fx.bigBell(), hold: 3.4 },
    { draw: bellTowerShot, enter: () => { setTimeout(() => Sound.fx.bigBell(0.8), 400); setTimeout(() => Sound.fx.bigBell(0.6), 3200); }, hold: 4.8, zoom: 0.05 },
    { draw: brothersShot, lines: [["brother", "You're up early, Father."], ["lawrence", "Something like that."]] },
    { draw: (t, A) => chapelShot(t, A, { kneel: blendPose(pose({ lean: 0.05, head: -0.1, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6, sF: 0.6, eF: 1.9, sB: 0.5, eB: 1.9 }), pose({ lean: 0.35, head: 0.1, hF: 0.6, kF: 0.6, hB: -0.1, kB: 0.1, sF: 0.6, eF: 0.4, sB: 0.2, eB: 0.3 }), smooth(t / 2.5)) }), enter: () => setTimeout(() => Sound.fx.sigh(), 600), lines: [["caption", "His knees ache."]] },
    { draw: choirShot, music: "chant", now: true, lines: [["cantor", "Domine, labia mea aperies.  (O Lord, open my lips.)"], ["choir", "Et os meum annuntiabit laudem tuam.  (And my mouth shall declare your praise.)"]] },
    { draw: endCard, hold: 6 },
  ],
};
