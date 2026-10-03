"use strict";
// Fear Not: the screen, the type, the save, and the things every part of the game shares.
// The picture is always 360 high; its width follows the phone's own shape, from 16:9 to the
// long phones of today, so a sideways phone is filled edge to edge. Held upright, the game
// pauses behind a card asking for the phone to be turned.

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
const PI = Math.PI, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
// A seeded random stream (mulberry32): the same city every time.
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
// From the design page: neon noir, the colours of the John Wick films. Gold is kept for holy light.
const C = {
  black: "#0b0610", navy: "#0a2440", blue: "#0f5a8c", dteal: "#0d5a68", teal: "#17b39a", cyan: "#00c2f0", ice: "#c4f0ff",
  plum: "#2a1a40", lav: "#a07cb0", wine: "#9e2f5e", red: "#e0101e", pink: "#ff4382", gold: "#c8b84a",
  holy: "#f2d47a", light: "#fff3cf", ember: "#ff5a1e", ink: "#07050b",
};

// ---- Type ------------------------------------------------------------------------------------------
const FONT = { title: "Cinzel, 'Trajan Pro', Georgia, serif", line: "'Cormorant Garamond', Georgia, serif", ui: "Montserrat, 'Segoe UI', system-ui, sans-serif" };
function text(str, x, y, o) {
  o = o || {};
  let size = o.size || 10;
  const fam = o.font || FONT.ui, wt = o.weight || 600, it = o.italic ? "italic " : "";
  ctx.font = it + wt + " " + size + "px " + fam;
  if (o.max) { const w = ctx.measureText(str).width; if (w > o.max) { size = Math.max(5.5, size * o.max / w); ctx.font = it + wt + " " + size + "px " + fam; } }
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (o.spacing || 0) + "px";
  ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 10; }
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.fillStyle = o.color || "#ffffff"; ctx.fillText(str, x, y);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
}
function wrap(str, width, font) {
  ctx.font = font; const out = []; let line = "";
  for (const w of str.split(" ")) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > width && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

// ---- Light ------------------------------------------------------------------------------------------
// A soft round glow, drawn once per colour and kept, then laid on with "lighter" so that
// every light source in the city adds to the light around it.
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
// An oval glow, for light lying on a wet street or a long window.
function glowOval(x, y, rx, ry, color, a) {
  if (rx <= 0.5 || ry <= 0.5 || a <= 0.005) return;
  const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = pa * clamp(a, 0, 1);
  ctx.drawImage(glowSprite(color), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc;
}
// Many small lit windows, gathered by colour and filled at once: far cheaper than one by one.
const WINC = ["#e9a8c0", "#bfe4ff", "#ffd9a0", "#a6c8e8"];
const winBatch = [[], [], [], []];
function winAdd(k, x, y, w, h) { winBatch[k].push(x, y, w, h); }
function winFlush(a) {
  ctx.globalAlpha = a;
  for (let k = 0; k < 4; k++) {
    const b = winBatch[k]; if (!b.length) continue;
    ctx.beginPath(); for (let i = 0; i < b.length; i += 4) ctx.rect(b[i], b[i + 1], b[i + 2], b[i + 3]);
    ctx.fillStyle = WINC[k]; ctx.fill(); b.length = 0;
  }
  ctx.globalAlpha = 1;
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

// ---- Buttons ----------------------------------------------------------------------------------------
// Drawn each frame, and remembered for that frame, so a tap can find them.
const buttons = [];
function button(label, x, y, w, h, act, o) {
  o = o || {};
  buttons.push({ x, y, w, h, act });
  const hot = o.hot;
  ctx.fillStyle = hot ? "rgba(232,196,106,0.16)" : "rgba(10,8,16,0.72)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hot ? C.holy : "rgba(232,196,106,0.45)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  text(label, x + w / 2, y + h / 2 + 0.5, { align: "center", base: "middle", size: o.size || 10, weight: 700, spacing: 2, color: hot ? "#fff6dc" : "#e9e6df", max: w - 12 });
  if (o.sub) text(o.sub, x + w / 2, y + h - 6, { align: "center", size: 7, weight: 500, color: "#a9a49a", max: w - 10 });
}
function hitButton(p) {
  for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.act && b.act(); return true; } }
  return false;
}
// The pause button, top right, on every part that is played.
function pauseButton() {
  const x = W - 40, y = 8;
  buttons.push({ x: x - 6, y: y - 6, w: 44, h: 40, act: () => Game.pause() });
  ctx.globalAlpha = 0.75; rect(x + 8, y + 6, 4, 16, "#e9e6df"); rect(x + 17, y + 6, 4, 16, "#e9e6df"); ctx.globalAlpha = 1;
}

// ---- The save -----------------------------------------------------------------------------------
// Progress is kept after each part: how far the night has come, and whether it has been finished.
const PARTS = [
  { id: "cold", name: "Bring Daddy Home", about: "2 AM, in the city" },
  { id: "desert", name: "Someone Asked", about: "The monastery in the desert" },
  { id: "flight", name: "The Flight", about: "Over the rooftops, on the angel's back" },
  { id: "fight", name: "The Street", about: "The demons round the car" },
  { id: "choice", name: "The Choice", about: "What he does now" },
  { id: "bell", name: "Vigils", about: "Back before the bell" },
];
let save = { part: 0, done: false, muted: false };
try { save = Object.assign(save, JSON.parse(localStorage.getItem("fear-not") || "{}")); } catch (e) { }
const store = () => { try { localStorage.setItem("fear-not", JSON.stringify(save)); } catch (e) { } };
Sound.muted = !!save.muted;

// ---- Input ------------------------------------------------------------------------------------------
// Every part of the game is a "mode" with its own step, draw and touch handlers. Touches arrive
// in the picture's own coordinates, each with its pointer id, so two thumbs can work at once.
let mode = null;
function toGame(ev) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * (portrait ? PW : W), y: ((ev.clientY - r.top) / r.height) * (portrait ? PH : H) }; }
function wakeSound() { Sound.init(); if (typeof Game !== "undefined") Game.soundWoke(); }
// Which hands are on the game: a touch screen, or a keyboard and mouse. The prompts follow it.
let lastInput = null;
const usingKeys = () => (lastInput ? lastInput !== "touch" : !matchMedia("(pointer: coarse)").matches);
addEventListener("pointerdown", (ev) => {
  if (ev.cancelable) ev.preventDefault();
  lastInput = ev.pointerType === "touch" || ev.pointerType === "pen" ? "touch" : "mouse";
  wakeSound();
  if (portrait) return;
  const p = toGame(ev);
  if (hitButton(p)) { if (Sound.fx.tick) Sound.fx.tick(1500, 0.5); return; }
  if (mode && mode.down) mode.down(p, ev);
}, { passive: false });
addEventListener("pointermove", (ev) => { if (!portrait && mode && mode.move) mode.move(toGame(ev), ev); }, { passive: false });
const pointerUp = (ev) => { if (!portrait && mode && mode.up) mode.up(toGame(ev), ev); };
addEventListener("pointerup", pointerUp); addEventListener("pointercancel", pointerUp);
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  lastInput = "key";
  wakeSound();
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyM") { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); return; }
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
  rect(0, 0, PW, PH, "#06040a");
  const cx = PW / 2, cy = PH / 2 - 40;
  glow(cx, cy, 120, C.holy, 0.12);
  // A phone, turning.
  const a = -smooth((Math.sin(t * 1.6) + 1) / 2) * PI / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.strokeStyle = "#e9e6df"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-26, -48, 52, 96, 9) : ctx.rect(-26, -48, 52, 96); ctx.stroke();
  rect(-8, -42, 16, 3, "#e9e6df");
  ctx.restore();
  text("FEAR NOT", cx, cy + 100, { align: "center", font: FONT.title, size: 28, weight: 700, spacing: 4, color: "#fff", glow: "rgba(232,196,106,0.6)", blur: 18 });
  text("Turn your phone sideways to play.", cx, cy + 132, { align: "center", size: 12, weight: 600, color: "#e9e6df" });
  text("The game waits for you.", cx, cy + 152, { align: "center", size: 11, weight: 500, color: "#a9a49a", font: FONT.line, italic: true });
}
