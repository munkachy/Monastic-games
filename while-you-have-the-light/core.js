"use strict";
// While You Have the Light: the screen, the type, the save, and the things every part of the
// game shares. The picture is always 360 high; its width follows the phone's own shape, from
// 16:9 to the long phones of today, so a sideways phone is filled edge to edge. Held upright,
// the game pauses behind a card asking for the phone to be turned. (After Fear Not's core.)

// ---- The screen ----------------------------------------------------------------------------------
const H = 360;
let W = 640;
const cv = document.getElementById("screen");
let ctx = cv.getContext("2d");
// Draw somewhere else for a while (an off-screen canvas): returns the context to go back to.
function useCtx(c) { const old = ctx; ctx = c; return old; }
let scale = 1, DPR = 1, portrait = false, PW = 360, PH = 640;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  portrait = innerHeight > innerWidth * 1.05;
  let w, h;
  if (portrait) {
    PW = 360; PH = Math.round(360 * innerHeight / innerWidth); scale = innerWidth / PW;
    w = innerWidth; h = innerHeight;
  } else {
    W = Math.round(clamp(H * innerWidth / innerHeight, 560, 800));
    scale = Math.min(innerWidth / W, innerHeight / H);
    w = Math.floor(W * scale); h = Math.floor(H * scale);
  }
  cv.style.width = w + "px"; cv.style.height = h + "px";
  cv.style.left = Math.floor((innerWidth - w) / 2) + "px"; cv.style.top = Math.floor((innerHeight - h) / 2) + "px";
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  if (typeof onResize === "function") onResize();
}
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 120));

// ---- Little helpers ------------------------------------------------------------------------------
// Faults in the game's own code, the last few (each with how often it came), so a note sent after
// one carries it.
const FAULTS = [];
function fault(e) {
  const m = String((e && (e.stack || e.message)) || e).slice(0, 500), last = FAULTS[FAULTS.length - 1];
  if (last && last.m === m) { last.n++; return; }
  FAULTS.push({ m, n: 1, at: new Date().toISOString() }); if (FAULTS.length > 6) FAULTS.shift();
}
addEventListener("error", (e) => fault(e.error || e.message));
addEventListener("unhandledrejection", (e) => fault(e.reason));
const PI = Math.PI, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const easeIn = (k) => { k = clamp(k, 0, 1); return k * k * k; };
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const sign = (v) => (v < 0 ? -1 : 1);
const pick = (arr, r) => arr[Math.floor((r === undefined ? Math.random() : r) * arr.length) % arr.length];
// A seeded random stream (mulberry32): the same crags every time.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// A hash of two whole numbers to a number in [0, 1): for things placed on a grid.
function hash2(i, j, k) {
  let h = (i * 374761393 + j * 668265263 + (k || 0) * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---- The palette ----------------------------------------------------------------------------------
// As in Limbo: the near world is black, and behind it the mist pales with distance. The only
// colours are the flame and the seven sins (art.js), and the pale blue-white of holy water.
const C = {
  ink: "#040405", black: "#0a0a0c",
  mist0: "#9a9c9f", mist1: "#74777b", mist2: "#4d5054", mist3: "#2c2e31", mist4: "#18191b",
  flame: "#ffb347", flameHot: "#fff1c4", ember: "#ff6a1e", amber: "#e89a3c", warm: "#ffcf8a",
  holy: "#cfe9ff", holyHot: "#ffffff",
  bone: "#e9e6df", dim: "#a9a49a", gold: "#e8c46a", red: "#d0505a",
};

// ---- Type ------------------------------------------------------------------------------------------
const FONT = { title: "Cinzel, 'Trajan Pro', Georgia, serif", line: "'Cormorant Garamond', Georgia, serif", ui: "Montserrat, 'Segoe UI', system-ui, sans-serif" };
function text(str, x, y, o) {
  o = o || {};
  let size = o.size || 10;
  const fam = o.font || FONT.ui, wt = o.weight || 600, it = o.italic ? "italic " : "";
  ctx.font = it + wt + " " + size + "px " + fam;
  let sp = o.spacing || 0;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = sp + "px";
  // Too wide for its room (spacing and all): smaller, down to 6px; then without the spacing; then
  // as small as it must be. It always fits.
  if (o.max) {
    const fit = (z) => { ctx.font = it + wt + " " + z + "px " + fam; return ctx.measureText(str).width; };
    let w = fit(size);
    if (w > o.max) {
      size = Math.max(6, size * o.max / w); w = fit(size);
      if (w > o.max && sp) { sp = 0; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px"; w = fit(size); }
      if (w > o.max) { size *= o.max / w; fit(size); }
    }
  }
  ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 10; }
  const pa = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = pa * o.alpha;
  ctx.fillStyle = o.color || "#ffffff"; ctx.fillText(str, x, y);
  ctx.shadowBlur = 0; ctx.globalAlpha = pa; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
}
// Words laid out over as many lines as they need within `width` (each line as text() draws it), from
// y down; or, with o.up, ending at y. Returns how many lines it took.
function textLines(str, x, y, width, o) {
  o = o || {};
  const size = o.size || 10, ls = wrap(str, width, (o.italic ? "italic " : "") + (o.weight || 600) + " " + size + "px " + (o.font || FONT.ui)), lh = o.lh || Math.round(size * 1.35);
  const y0 = o.up ? y - (ls.length - 1) * lh : y;
  ls.forEach((l, i) => text(l, x, y0 + i * lh, Object.assign({}, o, { max: width })));
  return ls.length;
}
function wrap(str, width, font) {
  ctx.font = font; const out = []; let line = "";
  for (const w of str.split(" ")) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > width && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

// ---- Light ------------------------------------------------------------------------------------------
// A soft round glow, drawn once per colour and kept, then laid on with "lighter" so that
// every light adds to the light around it.
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color); if (c) return c;
  c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(0.18, color); gr.addColorStop(0.45, hexA(color, 0.35)); gr.addColorStop(1, hexA(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowCache.set(color, c); return c;
}
// (Set and put back by hand rather than with save and restore: there are hundreds a frame.)
function glow(x, y, r, color, a) {
  if (r <= 0.5 || a <= 0.005) return;
  const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = pa * clamp(a === undefined ? 1 : a, 0, 1);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc;
}
function glowOval(x, y, rx, ry, color, a) {
  if (rx <= 0.5 || ry <= 0.5 || a <= 0.005) return;
  const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = pa * clamp(a, 0, 1);
  ctx.drawImage(glowSprite(color), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc;
}
function hexA(hex, a) {
  if (hex[0] !== "#") return hex;
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
}
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp(a >> 16 & 255, b >> 16 & 255, k)), g = Math.round(lerp(a >> 8 & 255, b >> 8 & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function poly(pts, c) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
function circle(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fillStyle = c; ctx.fill(); }
function line(x1, y1, x2, y2, c, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = c; ctx.lineWidth = w || 1; ctx.stroke(); }
function ring(x, y, r, c, w) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.strokeStyle = c; ctx.lineWidth = w || 1; ctx.stroke(); }

// ---- Buttons ----------------------------------------------------------------------------------------
// Drawn each frame, and remembered for that frame, so a tap can find them.
const buttons = [];
function button(label, x, y, w, h, act, o) {
  o = o || {};
  buttons.push({ x, y, w, h, act });
  const hot = o.hot, off = o.off;
  ctx.fillStyle = hot ? "rgba(255,179,71,0.14)" : "rgba(8,8,10,0.74)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hot ? C.flame : off ? "rgba(233,230,223,0.15)" : "rgba(255,179,71,0.42)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  text(label, x + w / 2, y + h / 2 + 0.5 - (o.sub ? 4 : 0), { align: "center", base: "middle", size: o.size || 10, weight: 700, spacing: 2, color: hot ? "#fff3dc" : off ? "#77736c" : "#e9e6df", max: w - 12 });
  if (o.sub) text(o.sub, x + w / 2, y + h - 7, { align: "center", size: 7, weight: 500, color: "#a9a49a", max: w - 10 });
}
function hitButton(p) {
  for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.act && b.act(); return true; } }
  return false;
}
// The pause button, top right, on every part that is played.
function pauseButton() {
  const x = W - 40, y = 8;
  buttons.push({ x: x - 6, y: y - 6, w: 44, h: 40, act: () => Game.pause() });
  ctx.globalAlpha = 0.7; rect(x + 8, y + 6, 4, 16, "#e9e6df"); rect(x + 17, y + 6, 4, 16, "#e9e6df"); ctx.globalAlpha = 1;
}

// ---- The save -----------------------------------------------------------------------------------
// The arena's best, the finishers opened, how many of each sin cast out, the hints seen.
let save = { muted: false, best: 0, bestFlow: 0, unlocked: {}, cast: {}, seen: {}, practice: null };
try { save = Object.assign(save, JSON.parse(localStorage.getItem("while-you-have-the-light") || "{}")); } catch (e) { }
const store = () => { try { localStorage.setItem("while-you-have-the-light", JSON.stringify(save)); } catch (e) { } };
// The sound: all of it, the effects alone (no music), or none. One button goes round the three.
const SOUND_MODES = ["all", "effects", "off"];
const soundMode = () => (SOUND_MODES.includes(save.sound) ? save.sound : save.muted ? "off" : "all");
const soundLabel = () => ({ all: "SOUND: ALL", effects: "SOUND: NO MUSIC", off: "SOUND: OFF" })[soundMode()];
function applySound() { if (typeof Sound === "undefined") return; const m = soundMode(); Sound.setMute(m === "off"); Sound.setMusic(m === "all"); }
// (Going round the three also makes the sound afresh: if it has gone silent, this brings it back.)
function cycleSound() { save.sound = SOUND_MODES[(SOUND_MODES.indexOf(soundMode()) + 1) % 3]; save.muted = save.sound === "off"; store(); if (typeof Sound !== "undefined" && Sound.reboot && Sound.ctx()) Sound.reboot(); applySound(); }

// ---- Input ------------------------------------------------------------------------------------------
// Every screen of the game is a "mode" with its own step, draw and touch handlers. Touches arrive
// in the picture's own coordinates, each with its pointer id, so two fingers can work at once.
let mode = null;
function toGame(ev) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * (portrait ? PW : W), y: ((ev.clientY - r.top) / r.height) * (portrait ? PH : H) }; }
function wakeSound() { if (typeof Sound !== "undefined") Sound.init(); if (typeof Game !== "undefined" && Game.soundWoke) Game.soundWoke(); }
// Which hands are on the game: a touch screen, or a keyboard and mouse. The prompts follow it.
let lastInput = null;
const usingKeys = () => (lastInput ? lastInput !== "touch" : !matchMedia("(pointer: coarse)").matches);
addEventListener("pointerdown", (ev) => {
  if (ev.cancelable) ev.preventDefault();
  lastInput = ev.pointerType === "touch" || ev.pointerType === "pen" ? "touch" : "mouse";
  wakeSound();
  if (portrait) return;
  const p = toGame(ev);
  if (hitButton(p)) { if (typeof Sound !== "undefined" && Sound.fx && Sound.fx.tick) Sound.fx.tick(1500, 0.5); return; }
  if (mode && mode.down) mode.down(p, ev);
}, { passive: false });
addEventListener("pointermove", (ev) => { if (!portrait && mode && mode.move) mode.move(toGame(ev), ev); }, { passive: false });
const pointerUp = (ev) => { if (!portrait && mode && mode.up) mode.up(toGame(ev), ev); };
addEventListener("pointerup", pointerUp); addEventListener("pointercancel", pointerUp);
// When the last finger lifts, anything still held is let go (just after, so the pointer's own
// "up" is heard first); and all of it when the page loses the eye.
const lastUp = (ev) => { if (ev.touches && ev.touches.length === 0) { const at = performance.now(); setTimeout(() => { if (typeof Climb !== "undefined" && Climb.allUp) Climb.allUp(at); }, 60); } };
addEventListener("touchend", lastUp); addEventListener("touchcancel", lastUp);
const letGo = () => { if (typeof Climb !== "undefined" && Climb.allUp) Climb.allUp(Infinity, true); };
addEventListener("blur", letGo); addEventListener("pagehide", letGo);
document.addEventListener("visibilitychange", () => { if (document.hidden) letGo(); });
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  lastInput = "key";
  wakeSound();
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyM" && typeof Sound !== "undefined") { cycleSound(); return; }
  if (mode && mode.key) mode.key(e.code, true, e);
});
addEventListener("keyup", (e) => { if (mode && mode.key) mode.key(e.code, false, e); });

// Sideways: where the phone allows, play goes full screen and locks to landscape. iPhones do
// not allow it; there the "turn your phone" card shows until the phone is turned.
function goSideways() {
  try {
    const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
    const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => { }); } catch (e) { } };
    if (fs && !document.fullscreenElement && matchMedia("(pointer: coarse)").matches) { const r = fs.call(el); if (r && r.then) r.then(lock, () => { }); else lock(); }
    else lock();
  } catch (e) { }
}
function drawTurnCard(t) {
  ctx.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
  rect(0, 0, PW, PH, "#060607");
  const cx = PW / 2, cy = PH / 2 - 40;
  glow(cx, cy, 120, C.flame, 0.14);
  const a = -smooth((Math.sin(t * 1.6) + 1) / 2) * PI / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.strokeStyle = "#e9e6df"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-26, -48, 52, 96, 9) : ctx.rect(-26, -48, 52, 96); ctx.stroke();
  rect(-8, -42, 16, 3, "#e9e6df");
  ctx.restore();
  text("WHILE YOU HAVE", cx, cy + 96, { align: "center", font: FONT.title, size: 20, weight: 700, spacing: 3, color: "#fff", glow: "rgba(255,179,71,0.6)", blur: 18 });
  text("THE LIGHT", cx, cy + 120, { align: "center", font: FONT.title, size: 20, weight: 700, spacing: 3, color: "#fff", glow: "rgba(255,179,71,0.6)", blur: 18 });
  text("Turn your phone sideways to play.", cx, cy + 150, { align: "center", size: 12, weight: 600, color: "#e9e6df" });
  text("The game waits for you.", cx, cy + 170, { align: "center", size: 11, weight: 500, color: "#a9a49a", font: FONT.line, italic: true });
}
