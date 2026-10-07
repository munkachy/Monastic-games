"use strict";
// While You Have the Light: the game. The title, the arena, the practice (choose which sins come;
// nothing can hurt you; holy water never runs out), the finishers and how they open, the pause
// (with every move listed), and the end, when the light goes out. Played sideways; where the
// phone allows, it locks to sideways when play starts.

const Game = {
  music: false,
  soundWoke() {
    if (Game.music || !Sound.ctx()) return;
    Game.music = true;
    if (mode === Title || mode === Setup || mode === Book) { Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.5 }); }
  },
  arena() { goSideways(); Game.music = true; Game.last = { practice: false }; Arena.start({ practice: false }); },
  practice() {
    goSideways(); Game.music = true;
    const P = save.practice || { sins: SIN_ORDER.slice(), count: 3, endlessOil: false };
    Game.last = { practice: true }; Arena.start({ practice: true, sins: P.sins, count: P.count, endlessOil: P.endlessOil });
  },
  climb() { goSideways(); Game.music = true; Game.last = { climb: true }; G = null; Climb.start(); },
  again() { if (Game.last && Game.last.climb) Game.climb(); else if (Game.last && Game.last.practice) Game.practice(); else Game.arena(); },
  toTitle() {
    G = null; Title.t = 0; mode = Title;
    Sound.flare(false); Sound.muffle(false); Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.5 });
  },
  pause() {
    if (mode === Climb) { Climb.pause(); return; }
    if (mode !== Arena || !G || G.over) return;
    Pause.t = 0; mode = Pause; Sound.muffle(true, 0.2);
  },
  resume() { if (mode === Pause) { mode = Arena; Sound.muffle(false, 0.2); if (G) { G.touches.clear(); G.two = null; G.keys = {}; } } },
  over() { Over.t = 0; mode = Over; Sound.muffle(true, 0.6); },
};

// A monk on a crag with his torch, for the title and the end.
function vignetteMonk(x, y, t, flame) {
  const p = MONK_ANIM.idle((t * 0.4) % 1, t);
  // The crag he stands on, black and sharp.
  poly([x - 120, H + 4, x - 70, y + 10, x - 30, y, x + 22, y, x + 40, y + 6, x + 70, y + 40, x + 96, y + 30, x + 150, H + 4], C.ink);
  poly([x + 70, y + 40, x + 82, y - 10, x + 92, y + 34], C.ink);
  glow(x + 4, y - 40, 140, C.flame, 0.16 * flame); glow(x + 4, y - 40, 60, C.warm, 0.14 * flame);
  const r = drawMonk(x, y, 1, p, { t });
  if (r && r.torch) { drawFlame(r.torch[0], r.torch[1], 1.1, t, {}); glow(r.torch[0], r.torch[1], 30, C.flame, 0.5 * flame); }
}

// ---- The title -----------------------------------------------------------------------------------------
const Title = {
  t: 0,
  step(dt) { Title.t += dt; },
  draw() {
    const t = Title.t;
    drawBackdrop(600 + t * 6, 300, 1, t, { warm: { x: W * 0.72, y: H * 0.58, r: 160 } });
    // Eyes in the dark, watching.
    for (let i = 0; i < 5; i++) {
      const ex = W * (0.42 + i * 0.13) % W, ey = H * (0.6 + 0.12 * Math.sin(i * 2.1)), on = Math.sin(t * 0.7 + i * 1.7) > 0.2;
      if (on && Math.abs(ex - W * 0.72) > 70) { glow(ex - 3, ey, 4, "#e8e8f0", 0.6); glow(ex + 3, ey, 4, "#e8e8f0", 0.6); circle(ex - 3, ey, 1, "#f4f4fa"); circle(ex + 3, ey, 1, "#f4f4fa"); }
    }
    vignetteMonk(W * 0.72, H * 0.68, t, 1);
    const g = ctx.createLinearGradient(0, 0, W * 0.6, 0); g.addColorStop(0, "rgba(3,3,5,0.85)"); g.addColorStop(1, "rgba(3,3,5,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.6, H);
    const x = Math.max(32, W * 0.07);
    text("WHILE YOU HAVE", x, 70, { font: FONT.title, size: 30, weight: 700, spacing: 5, color: "#ffffff", glow: "rgba(255,179,71,0.6)", blur: 20 });
    text("THE LIGHT", x, 104, { font: FONT.title, size: 30, weight: 700, spacing: 5, color: "#ffffff", glow: "rgba(255,179,71,0.6)", blur: 20 });
    text("Run while you have the light of life, lest the darkness of death overtake you.", x + 2, 128, { font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, max: W * 0.5 });
    text("THE RULE OF ST. BENEDICT, PROLOGUE", x + 2, 142, { size: 7, weight: 700, spacing: 2, color: "rgba(233,230,223,0.5)" });
    const by = 166;
    button("THE ENDLESS CLIMB", x, by, 200, 42, () => Game.climb(), { hot: true, sub: save.climbBest ? "Up for ever · your best: " + save.climbBest + " m" : "Up for ever, while the torch lasts" });
    button("PRACTICE", x, by + 50, 97, 32, () => { Setup.t = 0; mode = Setup; }, { sub: "Nothing can hurt you" });
    button("FINISHERS", x + 103, by + 50, 97, 32, () => { Book.t = 0; mode = Book; }, {});
    button(Sound.muted ? "SOUND OFF" : "SOUND ON", x, by + 90, 97, 26, () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); }, {});
    buttons.push({ x: x + 103, y: by + 90, w: 97, h: 26, act: () => { location.href = "design.html"; } });
    text("Design notes ›", x + 151, by + 107, { align: "center", size: 9, weight: 600, color: "rgba(255,179,71,0.75)" });
    text("The climb, a first build: the swing, no demons yet. Best with sound, phone sideways.", x, H - 16, { size: 8.5, weight: 500, color: "rgba(233,230,223,0.5)", max: W * 0.55 });
    if (t < 0.8) rect(0, 0, W, H, "rgba(0,0,0," + (1 - t / 0.8) + ")");
  },
  key(code, down) { if (down && (code === "Enter" || code === "Space")) Game.climb(); },
};

// ---- The practice: which sins come, how many at once ----------------------------------------------------
const Setup = {
  t: 0,
  step(dt) { Setup.t += dt; },
  draw() {
    const P = save.practice || (save.practice = { sins: SIN_ORDER.slice(), count: 3, endlessOil: false });
    drawBackdrop(300, 300, 1, Setup.t, {});
    rect(0, 0, W, H, "rgba(3,3,5,0.6)");
    text("PRACTICE", W / 2, 40, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    text("Nothing can hurt you, holy water never runs out, and every finisher is open.", W / 2, 60, { align: "center", font: FONT.line, italic: true, size: 13, color: C.warm, max: W - 40 });
    text("WHICH SINS COME", W / 2, 88, { align: "center", size: 8, weight: 800, spacing: 3, color: "rgba(233,230,223,0.65)" });
    const bw = Math.min(82, (W - 40) / 7 - 6), x0 = W / 2 - (bw + 6) * 3.5 + 3;
    SIN_ORDER.forEach((s, i) => {
      const on = P.sins.includes(s), x = x0 + i * (bw + 6), y = 98;
      buttons.push({ x, y, w: bw, h: 56, act: () => { if (on) { if (P.sins.length > 1) P.sins = P.sins.filter((q) => q !== s); } else P.sins.push(s); store(); } });
      rect(x, y, bw, 56, on ? hexA(SINS[s].color, 0.18) : "rgba(8,8,10,0.7)");
      ctx.strokeStyle = on ? SINS[s].color : "rgba(233,230,223,0.15)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, 55);
      circle(x + bw / 2, y + 20, 9, on ? SINS[s].color : "#26262a");
      if (on) glow(x + bw / 2, y + 20, 18, SINS[s].color, 0.35);
      text(SINS[s].name.toUpperCase(), x + bw / 2, y + 46, { align: "center", size: 8, weight: 800, spacing: 1, color: on ? "#fff" : "#77736c", max: bw - 6 });
    });
    text("HOW MANY AT ONCE", W / 2, 180, { align: "center", size: 8, weight: 800, spacing: 3, color: "rgba(233,230,223,0.65)" });
    for (let n = 1; n <= 6; n++) button(String(n), W / 2 - 3 * 40 + (n - 1) * 40 + 2, 188, 36, 28, () => { P.count = n; store(); }, { hot: P.count === n });
    button(P.endlessOil ? "ENDLESS OIL: ON" : "ENDLESS OIL: OFF", W / 2 - 100, 226, 200, 28, () => { P.endlessOil = !P.endlessOil; store(); }, { hot: P.endlessOil, sub: P.endlessOil ? "Flare as often as you like" : "Oil comes from the flow" });
    button("BEGIN", W / 2 - 100, 268, 200, 40, () => Game.practice(), { hot: true });
    button("BACK", 16, H - 44, 80, 30, () => Game.toTitle(), {});
  },
  key(code, down) { if (down && code === "Escape") Game.toTitle(); if (down && code === "Enter") Game.practice(); },
};

// ---- The finishers, and the virtues ---------------------------------------------------------------------
const Book = {
  t: 0,
  step(dt) { Book.t += dt; },
  draw() {
    drawBackdrop(900, 300, 1, Book.t, {});
    rect(0, 0, W, H, "rgba(3,3,5,0.72)");
    text("FINISHERS", W / 2, 34, { align: "center", font: FONT.title, size: 20, weight: 700, spacing: 5, color: "#fff" });
    text("A demon brought to nothing is broken for a few moments. Finish it.", W / 2, 52, { align: "center", font: FONT.line, italic: true, size: 13, color: C.warm, max: W - 40 });
    const x = Math.max(20, W / 2 - 300), cw = Math.min(600, W - 40);
    FINISHERS.forEach((F, i) => {
      const y = 70 + i * 34, open = F.id === "virtue" ? SIN_ORDER.some((s) => (save.cast[s] || 0) >= 5) : F.id === "castOut" || save.unlocked[F.id];
      rect(x, y, cw, 30, open ? "rgba(255,179,71,0.08)" : "rgba(8,8,10,0.6)");
      text(F.name.toUpperCase(), x + 10, y + 13, { font: FONT.title, size: 11, weight: 700, spacing: 1.5, color: open ? C.flameHot : "#8a857c" });
      text(F.gesture, x + 10, y + 25, { size: 8, weight: 700, spacing: 1, color: open ? "#e9e6df" : "#77736c" });
      text(F.what, x + 170, y + 13, { size: 9, weight: 500, color: open ? "#e9e6df" : "#8a857c", max: cw - 180 });
      text(open ? "Open" : F.opens, x + 170, y + 25, { size: 8, weight: 600, color: open ? "rgba(255,179,71,0.8)" : "#77736c", max: cw - 180 });
    });
    text("THE VIRTUES · CAST OUT FIVE OF A SIN TO OPEN ITS VIRTUE", W / 2, 252, { align: "center", size: 7.5, weight: 800, spacing: 2, color: "rgba(233,230,223,0.6)", max: W - 30 });
    const bw = Math.min(82, (W - 40) / 7 - 6), x0 = W / 2 - (bw + 6) * 3.5 + 3;
    SIN_ORDER.forEach((s, i) => {
      const n = Math.min(5, save.cast[s] || 0), open = n >= 5, bx = x0 + i * (bw + 6), y = 262;
      rect(bx, y, bw, 48, open ? hexA(SINS[s].color, 0.16) : "rgba(8,8,10,0.6)");
      text(SINS[s].virtue.toUpperCase(), bx + bw / 2, y + 14, { align: "center", size: 7.5, weight: 800, spacing: 0.5, color: open ? "#fff" : "#8a857c", max: bw - 4 });
      text("against " + SINS[s].name, bx + bw / 2, y + 26, { align: "center", font: FONT.line, italic: true, size: 10, color: open ? SINS[s].color : "#77736c", max: bw - 4 });
      for (let k = 0; k < 5; k++) circle(bx + bw / 2 - 16 + k * 8, y + 38, 2.2, k < n ? SINS[s].color : "#2a2a2e");
    });
    button("BACK", 16, H - 44, 80, 30, () => Game.toTitle(), {});
  },
  key(code, down) { if (down && (code === "Escape" || code === "Enter")) Game.toTitle(); },
};

// ---- The pause, with the moves ----------------------------------------------------------------------------
const Pause = {
  t: 0,
  step(dt) { Pause.t += dt; },
  draw() {
    Scene.draw(true);
    rect(0, 0, W, H, "rgba(3,3,5,0.82)");
    const cx = Math.min(W * 0.26, 170), bw = 200;
    text("PAUSED", cx, 46, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    let y = 66;
    const b = (label, act, o) => { button(label, cx - bw / 2, y, bw, 30, act, o || {}); y += 38; };
    b("GO ON", () => Game.resume(), { hot: true });
    b("BEGIN AGAIN", () => { Sound.muffle(false); Game.again(); });
    b(G && G.practice ? "TO THE ARENA" : "TO PRACTICE", () => { Sound.muffle(false); if (G && G.practice) Game.arena(); else Game.practice(); });
    b(Sound.muted ? "SOUND: OFF" : "SOUND: ON", () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); });
    b("BACK TO THE TITLE", () => Game.toTitle());
    const mx = Math.max(cx + bw / 2 + 24, W * 0.42), mv = Arena.moves(), rh = Math.min(28, (H - 64) / mv.length);
    text("THE MOVES", mx, 40, { size: 9, weight: 800, spacing: 3, color: C.flame });
    mv.forEach(([k, what], i) => {
      const yy = 60 + i * rh;
      text(k, mx, yy, { size: 8.5, weight: 800, spacing: 1, color: "#f1ede4", max: W - mx - 16 });
      text(what, mx, yy + 11, { size: 8.5, weight: 500, color: "#b9b3a6", max: W - mx - 16 });
    });
  },
  key(code, down) { if (down && (code === "Escape" || code === "KeyP" || code === "Enter")) Game.resume(); },
};

// ---- The end: the light goes out ------------------------------------------------------------------------
const Over = {
  t: 0,
  step(dt) { Over.t += dt; },
  draw() {
    const t = Over.t;
    rect(0, 0, W, H, "#030304");
    drawBackdrop(500, 300, 1, t, {});
    rect(0, 0, W, H, "rgba(3,3,5," + Math.min(0.82, 0.5 + t * 0.3) + ")");
    const a = clamp(t / 0.8, 0, 1);
    text("THE LIGHT WENT OUT", W / 2, 70, { align: "center", font: FONT.title, size: 24, weight: 700, spacing: 5, color: "#fff", alpha: a });
    text("Walk whilst you have the light, that the darkness overtake you not.", W / 2, 94, { align: "center", font: FONT.line, italic: true, size: 14, color: C.warm, alpha: a, max: W - 40 });
    text("JOHN 12:35", W / 2, 108, { align: "center", size: 7, weight: 700, spacing: 2, color: "rgba(233,230,223,0.5)", alpha: a });
    if (Game.last && Game.last.climb) {
      Climb.over().forEach(([k, v], i) => {
        text(k.toUpperCase(), W / 2 - 8, 140 + i * 22, { align: "right", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.65)", alpha: a });
        text(String(v), W / 2 + 8, 141 + i * 22, { font: FONT.title, size: 15, weight: 700, color: C.flameHot, alpha: a });
      });
    } else if (G) {
      const rows = G.practice ? [["Demons cast out", G.castTotal], ["Longest flow", G.best]] : [["Wave reached", G.wave], ["Demons cast out", G.castTotal], ["Longest flow", G.best], ["Your best wave", save.best || G.wave]];
      rows.forEach(([k, v], i) => {
        text(k.toUpperCase(), W / 2 - 8, 140 + i * 22, { align: "right", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.65)", alpha: a });
        text(String(v), W / 2 + 8, 141 + i * 22, { font: FONT.title, size: 15, weight: 700, color: C.flameHot, alpha: a });
      });
    }
    if (t > 0.6) {
      button("AGAIN", W / 2 - 104, H - 76, 100, 36, () => { Sound.muffle(false); Game.again(); }, { hot: true });
      button("TITLE", W / 2 + 4, H - 76, 100, 36, () => { Sound.muffle(false); Game.toTitle(); }, {});
    }
  },
  key(code, down) { if (down && (code === "Enter" || code === "Space") && Over.t > 0.6) { Sound.muffle(false); Game.again(); } if (down && code === "Escape") Game.toTitle(); },
};

// ---- The loop ---------------------------------------------------------------------------------------
function onResize() { }
addEventListener("blur", () => Game.pause());
document.addEventListener("visibilitychange", () => { if (document.hidden) Game.pause(); });
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
  buttons.length = 0;
  if (portrait) { drawTurnCard(now / 1000); requestAnimationFrame(frame); return; }
  ctx.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
  try { if (mode.step) mode.step(dt); mode.draw(dt); }
  catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
resize();
Sound.muted = !!save.muted;
mode = Title;
// For trying things directly: ?climb starts the climb, ?arena the arena, ?practice the practice.
if (/[?&]climb\b/.test(location.search)) setTimeout(() => Game.climb(), 50);
if (/[?&]arena\b/.test(location.search)) setTimeout(() => Game.arena(), 50);
if (/[?&]practice\b/.test(location.search)) setTimeout(() => Game.practice(), 50);
requestAnimationFrame(frame);
