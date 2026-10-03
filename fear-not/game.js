"use strict";
// Fear Not: the game. The first night, in six parts: the cold open in the city, the desert,
// the flight, the fight on the street, the father's choice, and the bell for Vigils. Progress
// is saved after each part. Played sideways; where the phone allows, it locks to sideways
// when play starts.

const Game = {
  part: 0, music: false,
  soundWoke() {
    if (Game.music || !Sound.ctx()) return;
    Game.music = true;
    if (mode === Title) { Sound.play(SONGS.noir); Sound.setLevel(0); Sound.ambience({ rain: 0.6 }); }
  },
  startPart(i) {
    goSideways();
    Game.music = true;
    Game.part = i;
    const done = () => Game.partDone(i);
    switch (PARTS[i].id) {
      case "cold": Scene.start(SCENES.cold(), done); break;
      case "desert": Scene.start(SCENES.desert(), done); break;
      case "flight": Flight.start(done); break;
      case "fight": Scene.start(SCENES.street(), () => Fight.start(() => Scene.start(SCENES.guardian(), done))); break;
      case "choice": Scene.start(SCENES.choice(), done); break;
      case "bell": Scene.start(SCENES.bell(), done); break;
    }
  },
  partDone(i) {
    if (i >= PARTS.length - 1) { save.done = true; save.part = PARTS.length - 1; store(); Game.toTitle(true); return; }
    save.part = Math.max(save.part, i + 1); store();
    Game.startPart(i + 1);
  },
  toTitle(finished) {
    Title.t = 0; Title.finished = !!finished; mode = Title;
    Sound.play(SONGS.noir); Sound.setLevel(0); Sound.ambience({ rain: 0.6, wind: 0 }); Sound.muffle(false);
  },
  pause() {
    if (mode === Pause || !mode || !mode.step || mode === Title || mode === Parts) return;
    Pause.under = mode; Pause.t = 0; mode = Pause; Sound.muffle(true, 0.2);
  },
  resume() { if (mode === Pause) { mode = Pause.under; Sound.muffle(false, 0.2); } },
};

// ---- The title ---------------------------------------------------------------------------------------
const Title = {
  t: 0, finished: false,
  step(dt) { Title.t += dt; },
  draw() {
    const t = Title.t;
    rooftopShot(t, { w: W, h: H }, { x: 0.72 });
    const g = ctx.createLinearGradient(0, 0, W * 0.6, 0); g.addColorStop(0, "rgba(3,3,8,0.85)"); g.addColorStop(1, "rgba(3,3,8,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.6, H);
    const x = Math.max(36, W * 0.07);
    text("FEAR NOT", x, 92, { font: FONT.title, size: 50, weight: 700, spacing: 9, color: "#ffffff", glow: "rgba(232,196,106,0.7)", blur: 24 });
    text("A desert monk, his guardian angel, and a city of shadows", x + 2, 120, { font: FONT.line, italic: true, size: 17, weight: 500, color: C.holy, max: W * 0.5 });
    const cont = save.part > 0 && !save.done;
    const by = 160;
    if (cont) {
      button("CONTINUE", x, by, 190, 40, () => Game.startPart(save.part), { hot: true, sub: PARTS[save.part].name });
      button("BEGIN AGAIN", x, by + 50, 190, 30, () => Game.startPart(0), {});
    } else button(save.done ? "PLAY AGAIN" : "BEGIN", x, by, 190, 40, () => Game.startPart(0), { hot: true, sub: "The first night" });
    button("PARTS", x, by + (cont ? 90 : 50), 92, 30, () => { Parts.t = 0; mode = Parts; }, {});
    button(Sound.muted ? "SOUND OFF" : "SOUND ON", x + 98, by + (cont ? 90 : 50), 92, 30, () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); }, {});
    text(Title.finished ? "The first night is done. More nights are coming." : "A first build: the first night. Best with sound, phone sideways.", x, H - 22, { size: 9, weight: 500, color: "rgba(233,230,223,0.55)", max: W * 0.55 });
    buttons.push({ x: W - 150, y: H - 34, w: 150, h: 34, act: () => { location.href = "design.html"; } });
    text("Design notes ›", W - 16, H - 14, { align: "right", size: 9, weight: 600, color: "rgba(232,196,106,0.7)" });
    if (t < 0.8) rect(0, 0, W, H, "rgba(0,0,0," + (1 - t / 0.8) + ")");
  },
  key(code, down) { if (down && (code === "Enter" || code === "Space")) Game.startPart(save.part > 0 && !save.done ? save.part : 0); },
};

// ---- The parts of the night, to play again -------------------------------------------------------
const Parts = {
  t: 0,
  step(dt) { Parts.t += dt; },
  draw() {
    rect(0, 0, W, H, "#06050a");
    rain(Parts.t, 60, 0, 0, W, H, { seed: 3, color: "rgba(196,240,255,0.12)" });
    text("THE FIRST NIGHT", W / 2, 44, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#ffffff", glow: "rgba(232,196,106,0.5)", blur: 14 });
    const cols = 3, bw = Math.min(200, (W - 80) / 3 - 10), bh = 76, x0 = W / 2 - (cols * bw + (cols - 1) * 12) / 2;
    PARTS.forEach((P, i) => {
      const open = save.done || i <= save.part, x = x0 + (i % cols) * (bw + 12), y = 74 + Math.floor(i / cols) * (bh + 14);
      if (open) buttons.push({ x, y, w: bw, h: bh, act: () => Game.startPart(i) });
      ctx.fillStyle = open ? "rgba(232,196,106,0.07)" : "rgba(255,255,255,0.02)"; ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = open ? "rgba(232,196,106,0.45)" : "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      text(["I", "II", "III", "IV", "V", "VI"][i], x + 12, y + 22, { font: FONT.title, size: 13, weight: 700, color: open ? C.holy : "#55524c" });
      text(open ? P.name : "Not yet", x + 12, y + 46, { size: 12, weight: 700, color: open ? "#f1ede4" : "#55524c", max: bw - 20 });
      if (open) text(P.about, x + 12, y + 63, { size: 8.5, weight: 500, color: "#a9a49a", max: bw - 20 });
    });
    button("BACK", W / 2 - 60, H - 52, 120, 32, () => { mode = Title; }, {});
  },
  key(code, down) { if (down && code === "Escape") mode = Title; },
};

// ---- Paused ------------------------------------------------------------------------------------------
const Pause = {
  under: null, t: 0,
  step(dt) { Pause.t += dt; },
  draw() {
    Pause.under.draw();
    buttons.length = 0;
    rect(0, 0, W, H, "rgba(4,3,8,0.78)");
    text("PAUSED", W / 2, 70, { align: "center", font: FONT.title, size: 26, weight: 700, spacing: 6, color: "#ffffff", glow: "rgba(232,196,106,0.5)", blur: 14 });
    text(PARTS[Game.part].name, W / 2, 94, { align: "center", font: FONT.line, italic: true, size: 16, color: C.holy });
    const bx = W / 2 - 110, bw = 220;
    button("RESUME", bx, 116, bw, 36, () => Game.resume(), { hot: true });
    button("BEGIN THIS PART AGAIN", bx, 160, bw, 30, () => { Sound.muffle(false); Game.startPart(Game.part); }, {});
    button("SKIP TO THE NEXT PART", bx, 196, bw, 30, () => { Sound.muffle(false); Game.partDone(Game.part); }, {});
    button(Sound.muted ? "SOUND: OFF" : "SOUND: ON", bx, 232, bw, 30, () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); }, {});
    button("BACK TO THE TITLE", bx, 268, bw, 30, () => Game.toTitle(), {});
  },
  key(code, down) { if (down && (code === "Escape" || code === "KeyP" || code === "Enter")) Game.resume(); },
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
mode = Title;
// For trying a part directly: ?part=2 starts the flight, and so on.
(() => { const m = /[?&]part=(\d)/.exec(location.search); if (m) { const i = clamp(+m[1], 0, PARTS.length - 1); setTimeout(() => Game.startPart(i), 50); } })();
requestAnimationFrame(frame);
