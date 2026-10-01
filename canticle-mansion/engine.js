"use strict";
// Canticle Mansion: the engine.
// The world is painted at 400 x 224 into small canvases, layer by layer, and
// set on the screen crisp; the words of the Canticle are lettered at the
// screen's full resolution between the back wall and the figures, so the monk
// walks in front of them and the dark falls over them.
//
// Layers, back to front: sky and far things; the back wall of the room;
// the verses; tiles, objects, creatures, the monk; the dark and the lights;
// glows; the words of the game itself.

const W = 400, H = 224, T = 16;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; };
function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

// ---- The screen -------------------------------------------------------------------
const screen = document.getElementById("screen"), sx = screen.getContext("2d");
const bgBuf = mk(W, H), bx = bgBuf.getContext("2d");
const fgBuf = mk(W, H), fx = fgBuf.getContext("2d");
const ltBuf = mk(W, H), lx = ltBuf.getContext("2d");
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  screen.width = Math.round(innerWidth * dpr); screen.height = Math.round(innerHeight * dpr);
  screen.style.width = innerWidth + "px"; screen.style.height = innerHeight + "px";
  scale = Math.min(innerWidth / W, innerHeight / H);
  offX = (innerWidth - W * scale) / 2; offY = (innerHeight - H * scale) / 2;
}
addEventListener("resize", resize); resize();
// Drawing in the game's own units on the screen canvas, crisp at any size.
function toScreenSpace() { sx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY); }

// ---- Type --------------------------------------------------------------------------
// Cinzel for carved capitals, IM Fell English for the book hand, Cormorant for
// the sky; each with a plain fallback if the fonts cannot be fetched.
const FONT = {
  carved: "'Cinzel', 'Trajan Pro', Georgia, serif",
  book: "'IM Fell English', 'Palatino Linotype', Georgia, serif",
  sky: "'Cormorant Garamond', Georgia, serif",
  ui: "'Trebuchet MS', 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
};
function wrap(ctx, str, width) {
  const words = str.split(" "), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > width && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}
function uiText(str, x, y, o) {
  o = o || {};
  const size = o.size || 8;
  sx.save(); sx.font = (o.weight || 700) + " " + size + "px " + (o.font || FONT.ui);
  sx.textAlign = o.align || "left"; sx.textBaseline = "top";
  if (o.alpha !== undefined) sx.globalAlpha = o.alpha;
  if (o.edge !== null) { sx.lineJoin = "round"; sx.lineWidth = Math.max(1.5, size / 4); sx.strokeStyle = o.edge || "#0c0810"; sx.strokeText(str, x, y); }
  sx.fillStyle = o.color || "#ffffff"; sx.fillText(str, x, y);
  const w = sx.measureText(str).width; sx.restore(); return w;
}

// ---- Saved progress -----------------------------------------------------------------
let save = { open: 1, read: {}, lilies: {}, powers: {}, done: {}, sound: true };
try { save = Object.assign(save, JSON.parse(localStorage.getItem("canticle-mansion") || "{}")); } catch (e) { }
function store() { try { localStorage.setItem("canticle-mansion", JSON.stringify(save)); } catch (e) { } }
Snd.on = save.sound !== false;
Snd.onToggle = (on) => { save.sound = on; store(); };

// ---- Input --------------------------------------------------------------------------
// Touch: hold the lower left of the screen to walk left, the lower right to
// walk right; tap the top of the screen to jump (hold it to jump higher).
// Double-tap: pick a thing up or set it down, open a door, greet someone, or,
// beside a wall, leap off it. Tap a creature to throw holy water at it.
// Keys: arrows or WASD to walk, Up / W / Space to jump, Down / S / E to pick
// up or set down, X or J to throw, C or Shift to dash, P or Esc to pause.
const input = { left: false, right: false, up: false, jumpHeld: false, jumpPressed: false, double: null, throwAt: null, dash: 0, taps: [] };
const touches = new Map();
let lastTap = { t: -9, x: 0, y: 0 };
const JUMP_BAND = 0.4;
function toGame(ev) { return { x: (ev.clientX - offX) / scale, y: (ev.clientY - offY) / scale }; }
function recompute() {
  input.left = input.right = input.jumpHeld = false;
  for (const t of touches.values()) { if (t.zone === "left") input.left = true; if (t.zone === "right") input.right = true; if (t.zone === "jump") input.jumpHeld = true; }
  for (const k of keys) { if (k === "ArrowLeft" || k === "KeyA") input.left = true; if (k === "ArrowRight" || k === "KeyD") input.right = true; if (k === "ArrowUp" || k === "KeyW" || k === "Space" || k === "KeyZ") input.jumpHeld = true; }
  input.up = input.jumpHeld;
}
addEventListener("pointerdown", (ev) => {
  if (ev.cancelable) ev.preventDefault();
  Snd.init();
  const p = toGame(ev), now = performance.now() / 1000;
  if (Game.state !== "play") { input.taps.push(p); return; }
  if (p.x > W - 24 && p.y < 22) { Game.pause(); return; }
  const dbl = now - lastTap.t < 0.32 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 46;
  lastTap = { t: dbl ? -9 : now, x: p.x, y: p.y };
  let zone = p.y < H * JUMP_BAND ? "jump" : ev.clientX < innerWidth / 2 ? "left" : "right";
  if (dbl) input.double = { x: p.x + World.camX, y: p.y + World.camY, zone };
  // A creature under the finger: the holy water goes to it, and the finger does not walk.
  const wx = p.x + World.camX, wy = p.y + World.camY;
  if (!dbl && World.foeNear(wx, wy, 26)) { input.throwAt = { x: wx, y: wy }; zone = "none"; }
  touches.set(ev.pointerId, { zone });
  if (zone === "jump") input.jumpPressed = true;
  recompute();
}, { passive: false });
const release = (ev) => { touches.delete(ev.pointerId); recompute(); };
addEventListener("pointerup", release); addEventListener("pointercancel", release);
addEventListener("contextmenu", (e) => e.preventDefault());
const keys = new Set();
addEventListener("keydown", (e) => {
  Snd.init();
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (Game.state !== "play") { input.taps.push({ key: e.code }); recompute(); return; }
  if (["ArrowUp", "KeyW", "Space", "KeyZ"].includes(e.code)) input.jumpPressed = true;
  if (["ArrowDown", "KeyS", "KeyE"].includes(e.code)) input.double = { key: true };
  if (["KeyX", "KeyJ", "KeyK"].includes(e.code)) input.throwAt = { forward: true };
  if (["KeyC", "ShiftLeft", "ShiftRight"].includes(e.code)) input.dash = 1;
  if (e.code === "KeyP" || e.code === "Escape") Game.pause();
  if (e.code === "KeyM") Snd.toggle();
  recompute();
});
addEventListener("keyup", (e) => { keys.delete(e.code); recompute(); });

// ---- Tiles ----------------------------------------------------------------------------
// The map of a room is drawn in letters. These are the kinds of ground; any
// other letter is empty air, or marks where something begins.
const SOLID = 1, ONEWAY = 2, THORN = 3, BOUNCE = 4, CLIMB = 5, BREAK = 6, WATER = 7;
const TILE_OF = { "#": SOLID, "=": ONEWAY, "^": THORN, "B": BOUNCE, "H": CLIMB, "%": BREAK, "~": WATER, "X": SOLID };

// ---- The world --------------------------------------------------------------------------
const World = {
  room: null, def: null, w: 0, h: 0, grid: null, camX: 0, camY: 0, t: 0,
  bodies: [], foes: [], shots: [], parts: [], npcs: [], movers: [], items: [], glows: [], doors: {},
  tileCanvas: null, backCanvas: null,
  at(tx, ty) { if (tx < 0 || tx >= this.w) return SOLID; if (ty < 0) return 0; if (ty >= this.h) return 0; return this.grid[ty * this.w + tx]; },
  // Solid for a body moving the given way: one-way ledges hold only from above.
  blocks(tx, ty, fromAbove) { const k = this.at(tx, ty); return k === SOLID || k === BREAK || k === BOUNCE || (fromAbove && k === ONEWAY); },
  foeNear(x, y, r) { return this.foes.some((f) => f.alive && Math.hypot(f.x + f.w / 2 - x, f.y + f.h / 2 - y) < r + Math.max(f.w, f.h) / 2); },
};

// ---- Bodies: the monk, crates and jars, goats, creatures --------------------------------------
// Each moves on X, then on Y, stopping at tiles and at the bodies it stands on.
function rectHitsTiles(x, y, w, h, fromAbove, prevBottom) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.01) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const k = World.at(tx, ty);
    if (k === SOLID || k === BREAK || k === BOUNCE) return { tx, ty, k };
    if (k === ONEWAY && fromAbove && prevBottom <= ty * T + 0.5) return { tx, ty, k };
  }
  return null;
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// Things a body can stand on or bump: the solid objects and the moving platforms.
function solidsFor(self) {
  const out = [];
  for (const b of World.bodies) if (b !== self && !b.carried && b.solid !== false) out.push(b);
  for (const m of World.movers) out.push(m);
  return out;
}
function moveBody(b, dt, opts) {
  opts = opts || {};
  const others = opts.noBodies ? World.movers : solidsFor(b);
  b.hitWall = 0; const wasGround = b.ground; b.ground = false; b.standOn = null; b.bounced = false;
  // Riding: carried along by what it stood on last frame.
  if (b.riding) { b.x += b.riding.dx || 0; b.y += b.riding.dy || 0; }
  // Across.
  let dx = b.vx * dt;
  if (dx) {
    b.x += dx;
    const hit = rectHitsTiles(b.x, b.y, b.w, b.h, false);
    if (hit) { if (dx > 0) b.x = hit.tx * T - b.w; else b.x = (hit.tx + 1) * T; b.hitWall = Math.sign(dx); b.vx = 0; }
    for (const o of others) if (overlap(b, o)) {
      // A push: a body walked into may give way if nothing holds it.
      if (opts.push && o.pushable && b.ground !== undefined && Math.abs(b.y + b.h - (o.y + o.h)) < 10) {
        const step = dx > 0 ? b.x + b.w - o.x : b.x - (o.x + o.w);
        if (tryShift(o, step)) continue;
      }
      if (dx > 0) b.x = o.x - b.w; else b.x = o.x + o.w; b.hitWall = Math.sign(dx); b.vx = 0;
    }
  }
  // Down or up.
  const prevBottom = b.y + b.h;
  let dy = b.vy * dt;
  b.y += dy;
  const hit = rectHitsTiles(b.x, b.y, b.w, b.h, dy > 0, prevBottom);
  if (hit) {
    if (dy > 0) { b.y = hit.ty * T - b.h; b.ground = true; if (hit.k === BOUNCE && opts.bouncy !== false) b.bounced = true; b.vy = 0; }
    else if (dy < 0) { b.y = (hit.ty + 1) * T; b.vy = 0; b.bumped = hit; }
  }
  for (const o of others) if (overlap(b, o)) {
    if (dy >= 0 && prevBottom <= o.y + 6) { b.y = o.y - b.h; b.ground = true; b.vy = 0; b.standOn = o; }
    else if (dy < 0 && b.y > o.y + o.h - 8) { b.y = o.y + o.h; b.vy = 0; }
  }
  // Still standing on something, though not moving into it this frame.
  if (!b.ground && b.vy >= 0) {
    const foot = { x: b.x + 1, y: b.y + b.h, w: b.w - 2, h: 1 };
    if (rectHitsTiles(foot.x, foot.y, foot.w, 1, true, b.y + b.h)) b.ground = true;
    for (const o of others) if (overlap(foot, o) && Math.abs(o.y - (b.y + b.h)) < 1) { b.ground = true; b.standOn = o; }
  }
  b.riding = b.standOn && b.standOn.dx !== undefined ? b.standOn : null;
  return wasGround;
}
// Slide a body sideways if nothing stops it; a row of crates moves together,
// and what stands on them comes along.
function tryShift(o, dx, depth) {
  depth = depth || 0;
  if (depth > 4) return false;
  const ox = o.x; o.x += dx;
  if (rectHitsTiles(o.x, o.y, o.w, o.h, false)) { o.x = ox; return false; }
  for (const q of solidsFor(o)) {
    if (q === o || !overlap(o, q) || q.y + q.h <= o.y + 1) continue;
    const level = Math.abs(q.y + q.h - (o.y + o.h)) < 6;
    if (level && q.pushable && !q.carried) {
      const need = dx > 0 ? o.x + o.w - q.x : o.x - (q.x + q.w);
      if (tryShift(q, need, depth + 1)) continue;
    }
    o.x = ox; return false;
  }
  for (const q of World.bodies) if (q !== o && !q.carried && Math.abs(q.y + q.h - o.y) < 1 && q.x < o.x + o.w && q.x + q.w > o.x) q.x += dx;
  return true;
}
// ---- The monk ------------------------------------------------------------------------------
const Monk = {
  make(x, y) {
    return { x, y, w: 10, h: 24, vx: 0, vy: 0, ground: false, face: 1, hearts: 5, max: 5, inv: 0, cd: 0, coyote: 0, buffer: 0, jumps: 0, wall: 0, lock: 0,
      climbing: false, carry: null, anim: "idle", at: 0, cut: false, dash: 0, dashCd: 0, safe: { x, y }, tan: 0, step: 0 };
  },
};
const P = {
  run: 104, accel: 1000, airAccel: 700, grav: 1000, fall: 430,
  jump() { return save.powers.staff ? 368 : 322; },   // three tiles high, four with the staff
  wallJump: { vx: 150, vy: 315 }, slide: 70, climb: 82, bounce: 470,
};

// ---- Holy water and splashes ---------------------------------------------------------------------
function throwWater(m, target) {
  if (m.cd > 0) return;
  const love = save.powers.seal;
  m.cd = love ? 0.28 : 0.38;
  const ox = m.x + m.w / 2 + m.face * 4, oy = m.y + 6;
  let vx = m.face * 170, vy = -170;
  if (target && !target.forward) {
    const dx = target.x - ox, dy = target.y - oy, t = clamp(Math.hypot(dx, dy) / 230, 0.22, 0.7);
    vx = dx / t; vy = dy / t - 0.5 * 700 * t; m.face = dx < 0 ? -1 : 1;
  }
  World.shots.push({ kind: love ? "flame" : "flask", x: ox - 3, y: oy - 3, w: 6, h: 6, vx, vy, g: love ? 300 : 700, life: 1.6, spin: 0 });
  m.anim = "throw"; m.at = 0;
  Snd.sfx("throw");
}
function splash(x, y, big) {
  Snd.sfx("splash");
  const r = big ? 30 : 20;
  for (let i = 0; i < 18; i++) World.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, g: 500, life: 0.5 + Math.random() * 0.3, c: big ? (i % 2 ? "#ffcf5a" : "#ff6a3a") : i % 3 ? "#bfe6ff" : "#ffffff", s: 2 });
  World.glows.push({ x, y, r: r * 2, c: big ? "rgba(255,170,80,0.5)" : "rgba(170,220,255,0.45)", life: 0.35, max: 0.35 });
  for (const f of World.foes) if (f.alive && Math.hypot(f.x + f.w / 2 - x, f.y + f.h / 2 - y) < r + f.w / 2) hurtFoe(f, big ? 2 : 1, x);
}
function hurtFoe(f, n, fromX) {
  if (f.inv > 0) return;
  f.hp -= n; f.inv = 0.25; f.vx = (f.x + f.w / 2 < fromX ? -1 : 1) * 60;
  if (f.hp <= 0) {
    f.alive = false; Snd.sfx("smite");
    for (let i = 0; i < 14; i++) World.parts.push({ x: f.x + f.w / 2, y: f.y + f.h / 2, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 80, g: -40, life: 0.8, c: i % 2 ? "#fff4c8" : "#ffe08a", s: 1 });
  } else Snd.sfx("block");
}
function hurtMonk(m, fromX) {
  if (m.inv > 0 || Game.god) return;
  m.hearts--; m.inv = 1.1; Snd.sfx("hurt"); Game.shake = 0.25;
  m.vx = (m.x + m.w / 2 < fromX ? -1 : 1) * 150; m.vy = -200; m.lock = 0.2;
  if (m.carry) dropCarry(m, true);
  if (m.hearts <= 0) Game.fallen();
}

// ---- Carrying -------------------------------------------------------------------------------
function nearestLift(m, at) {
  let best = null, bd = 30;
  for (const b of World.bodies) {
    if (!b.liftable || b.carried) continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const dMonk = Math.hypot(cx - (m.x + m.w / 2), cy - (m.y + m.h / 2));
    if (dMonk > 34) continue;
    // Nothing may be resting on it.
    if (World.bodies.some((q) => q !== b && !q.carried && Math.abs(q.y + q.h - b.y) < 1 && q.x < b.x + b.w && q.x + q.w > b.x)) continue;
    const d = at && at.x !== undefined ? Math.hypot(cx - at.x, cy - at.y) * 0.6 + dMonk * 0.4 : dMonk;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function lift(m, b) { m.carry = b; b.carried = true; b.vx = 0; b.vy = 0; Snd.sfx("pickup"); }
function dropCarry(m, flung) {
  const b = m.carry; if (!b) return false;
  // Set it down just in front, at the feet; if that is taken, on top of what is there.
  // With no room at all (a wall right in front), keep holding it.
  const fx = m.face > 0 ? m.x + m.w + 1 : m.x - b.w - 1, feet = m.y + m.h - b.h - 2;
  // Snug against a wall just ahead, if the crate would poke into it.
  const snug = m.face > 0 ? Math.floor((fx + b.w) / T) * T - b.w : Math.ceil(fx / T) * T;
  const behind = m.face > 0 ? m.x - b.w - 1 : m.x + m.w + 1;
  const tries = [[fx, feet], [snug, feet], [fx, m.y - b.h + 4], [behind, feet]];
  if (flung) tries.push([m.x + m.w / 2 - b.w / 2, m.y - b.h - 1]);
  let placed = false;
  for (const [x, y] of tries) {
    b.x = x; b.y = y;
    if (!rectHitsTiles(b.x, b.y, b.w, b.h, false) && !solidsFor(b).some((o) => overlap(b, o)) && !overlap(b, m)) { placed = true; break; }
  }
  if (!placed) { b.x = m.x + m.w / 2 - b.w / 2; b.y = m.y - b.h + 2; Snd.sfx("block"); return false; }
  m.carry = null; b.carried = false;
  b.vx = flung ? m.face * 80 : 0; b.vy = flung ? -80 : 0;
  Snd.sfx("drop");
  return true;
}

// ---- One step of play --------------------------------------------------------------------------
function stepMonk(m, dt) {
  const R = World.def, k0 = World.at(Math.floor((m.x + m.w / 2) / T), Math.floor((m.y + m.h / 2) / T));
  m.inv = Math.max(0, m.inv - dt); m.cd = Math.max(0, m.cd - dt); m.lock = Math.max(0, m.lock - dt); m.dashCd = Math.max(0, m.dashCd - dt);
  m.at += dt;
  let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (Game.cutscene) dir = 0;
  if (m.lock > 0) dir = 0;
  // Climbing: hanging rugs, the bundle of myrrh, the golden chain.
  // On a rope or rug if any part of the body is against it.
  let ropeX = -1;
  for (const px0 of [m.x + 2, m.x + m.w / 2, m.x + m.w - 2]) for (const py of [m.y + 4, m.y + m.h / 2]) if (World.at(Math.floor(px0 / T), Math.floor(py / T)) === CLIMB) ropeX = Math.floor(px0 / T);
  const onClimb = ropeX >= 0;
  m.climbCd = Math.max(0, (m.climbCd || 0) - dt);
  if (onClimb && input.up && !m.carry && m.climbCd <= 0) m.climbing = true;
  if (!onClimb) m.climbing = false;
  // Leaping off a wall: a double tap, or a jump, while beside one in the air (or a double tap on the ground).
  const wallL = rectHitsTiles(m.x - 2, m.y + 4, 2, m.h - 8, false) || solidsFor(m).some((o) => overlap({ x: m.x - 2, y: m.y + 4, w: 2, h: m.h - 8 }, o));
  const wallR = rectHitsTiles(m.x + m.w, m.y + 4, 2, m.h - 8, false) || solidsFor(m).some((o) => overlap({ x: m.x + m.w, y: m.y + 4, w: 2, h: m.h - 8 }, o));
  m.wall = wallL ? -1 : wallR ? 1 : 0;
  const wantJump = input.jumpPressed || m.buffer > 0;
  m.buffer = input.jumpPressed ? 0.12 : Math.max(0, m.buffer - dt);
  // Double tap: lift, set down, open, greet, or leap off the wall.
  const dbl = input.double; input.double = null;
  if (dbl && !Game.cutscene) {
    const used = Game.interact(m, dbl);
    if (!used && m.wall && !m.carry) { wallLeap(m); }
    else if (!used && save.powers.chariot && dbl.zone && dbl.zone !== "jump" && !m.dash) startDash(m, dbl.zone === "left" ? -1 : 1);
  }
  if (input.dash && save.powers.chariot && !m.dash) startDash(m, m.face);
  input.dash = 0;
  if (input.throwAt && !m.carry && !Game.cutscene) throwWater(m, input.throwAt);
  input.throwAt = null;

  if (m.dash > 0) {
    m.dash -= dt; m.vy = 0; m.vx = m.dashDir * 270;
    if (Math.random() < 0.8) World.parts.push({ x: m.x + m.w / 2, y: m.y + 6 + Math.random() * 16, vx: -m.dashDir * 30, vy: 0, g: 0, life: 0.25, c: "#ffcf5a", s: 2 });
  } else if (m.climbing) {
    m.vx = dir * 50; m.vy = input.up ? -P.climb : 30;
    // Drawn gently onto the middle of the rope.
    if (!dir && ropeX >= 0) m.x = lerp(m.x, ropeX * T + T / 2 - m.w / 2, 0.2);
    const ct = ropeX >= 0 ? ropeX : Math.floor((m.x + m.w / 2) / T);
    // At the top: a little hop up and over, onto the ledge beside.
    if (input.up && World.at(ct, Math.floor((m.y - 1) / T)) !== CLIMB && World.at(ct, Math.floor((m.y + 6) / T)) !== CLIMB) { m.climbing = false; m.vy = -250; m.climbCd = 0.35; m.cut = true; }
    // A jump with a direction held: leap off the side.
    else if (input.jumpPressed && dir) { m.climbing = false; m.vy = -P.jump() * 0.8; m.vx = dir * 120; m.climbCd = 0.35; m.buffer = 0; Snd.sfx("jump"); }
  } else {
    const acc = m.ground ? P.accel : P.airAccel;
    const top = P.run * (m.carry ? 0.85 : 1) * (Game.slow || 1);
    m.vx = approach(m.vx, dir * top, acc * dt);
    if (dir) m.face = dir;
    m.vy = Math.min(m.vy + P.grav * dt, P.fall);
    // Sliding down a wall, slowly, when leaning into it.
    m.sliding = !m.ground && m.wall && dir === m.wall && m.vy > 0 && !m.carry;
    if (m.sliding) m.vy = Math.min(m.vy, save.powers.gloves && input.up ? -P.climb : P.slide);
    if (wantJump) {
      if (m.ground || m.coyote > 0) { m.vy = -P.jump() * (m.carry ? 0.9 : 1); m.ground = false; m.coyote = 0; m.buffer = 0; m.cut = false; m.jumps = 1; Snd.sfx("jump"); m.riding = null; }
      else if (m.wall && !m.carry) { wallLeap(m); m.buffer = 0; }
      else if (save.powers.sandals && m.jumps < 2 && !m.carry) { m.vy = -P.jump() * 0.88; m.jumps = 2; m.buffer = 0; m.cut = false; Snd.sfx("float"); for (let i = 0; i < 8; i++) World.parts.push({ x: m.x + m.w / 2, y: m.y + m.h, vx: (Math.random() - 0.5) * 80, vy: 30, g: 0, life: 0.3, c: "#ffe9a8", s: 2 }); }
    }
    // Let go early, land early.
    if (!input.jumpHeld && m.vy < -80 && !m.cut && !m.bounced) { m.vy *= 0.5; m.cut = true; }
  }
  input.jumpPressed = false;
  const was = moveBody(m, dt, { push: true });
  if (m.ground) { m.coyote = 0.08; m.jumps = 0; m.bouncedUp = false; }
  else m.coyote = Math.max(0, m.coyote - dt);
  if (m.bounced) { m.vy = -P.bounce * (input.jumpHeld ? 1.18 : 1); m.ground = false; m.cut = true; Snd.sfx("bounce"); m.bounced = false; }
  if (!was && m.ground && m.vy >= 0) { Snd.sfx("step"); for (let i = 0; i < 4; i++) World.parts.push({ x: m.x + m.w / 2 + (Math.random() - 0.5) * 10, y: m.y + m.h, vx: (Math.random() - 0.5) * 50, vy: -20, g: 60, life: 0.3, c: R.dust || "#b8a890", s: 1 }); }
  // A head that breaks blocks: with the helmet, a bump from below.
  if (m.bumped && save.powers.helmet && World.at(m.bumped.tx, m.bumped.ty) === BREAK) breakTile(m.bumped.tx, m.bumped.ty);
  m.bumped = null;
  // Thorns.
  const feetK = World.at(Math.floor((m.x + m.w / 2) / T), Math.floor((m.y + m.h + 1) / T));
  if (feetK === THORN || k0 === THORN) hurtMonk(m, m.x + m.w / 2 - m.face * 10);
  // Safe ground to come back to after a fall.
  if (m.ground && !m.standOn && feetK === SOLID) { m.safe.x = m.x; m.safe.y = m.y; }
  if (m.y > World.h * T + 40) Game.fellOut(m);
  // The carried thing rides above the head.
  if (m.carry) { m.carry.x = m.x + m.w / 2 - m.carry.w / 2; m.carry.y = m.y - m.carry.h + 2; }
  // How the monk looks this frame.
  const prev = m.anim;
  if (m.anim === "throw" && m.at < 0.22) { }
  else if (m.dash > 0) m.anim = "dash";
  else if (m.climbing) m.anim = "climb";
  else if (m.sliding) m.anim = "slide";
  else if (!m.ground) m.anim = m.vy < 0 ? "jump" : "fall";
  else if (Math.abs(m.vx) > 8) m.anim = "run";
  else m.anim = "idle";
  if (m.anim !== prev && m.anim !== "throw") m.at = 0;
  if (m.anim === "run") { m.step += dt * Math.abs(m.vx) / 9; }
}
function wallLeap(m) {
  m.vx = -m.wall * P.wallJump.vx; m.vy = -P.wallJump.vy; m.face = -m.wall; m.lock = 0.16; m.cut = false; m.jumps = 1; m.ground = false;
  Snd.sfx("jump");
  for (let i = 0; i < 6; i++) World.parts.push({ x: m.wall > 0 ? m.x + m.w : m.x, y: m.y + 12 + Math.random() * 8, vx: -m.wall * Math.random() * 60, vy: -Math.random() * 40, g: 200, life: 0.3, c: "#d8d0c0", s: 1 });
}
function startDash(m, dir) { if (m.dashCd > 0 || m.carry) return; m.dash = 0.2; m.dashDir = dir; m.face = dir; m.dashCd = 0.6; Snd.sfx("float"); }
function breakTile(tx, ty) {
  World.grid[ty * World.w + tx] = 0; Snd.sfx("rod");
  for (let i = 0; i < 12; i++) World.parts.push({ x: tx * T + 8, y: ty * T + 8, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 160, g: 600, life: 0.7, c: i % 2 ? "#8a7a68" : "#5a4c3e", s: 2 });
  World.redrawTiles();
}

// ---- Rooms ------------------------------------------------------------------------------
const ROOMS = {};
const CHAPTERS = [];
World.load = function (id, doorKey, how) {
  const def = ROOMS[id]; if (!def) throw new Error("no room " + id);
  this.room = id; this.def = def; this.t = 0;
  const rows = def.map; this.h = rows.length; this.w = Math.max(...rows.map((r) => r.length));
  this.grid = new Uint8Array(this.w * this.h); this.hidden = new Uint8Array(this.w * this.h);
  this.bodies = []; this.foes = []; this.shots = []; this.parts = []; this.npcs = []; this.movers = []; this.items = []; this.glows = []; this.doors = {};
  const marks = {};
  for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
    const ch = rows[y][x] || ".";
    const k = (def.legend && def.legend[ch] !== undefined) ? def.legend[ch] : TILE_OF[ch];
    if (typeof k === "number") { this.grid[y * this.w + x] = k; if (def.hide && def.hide.includes(ch)) this.hidden[y * this.w + x] = 1; }
    else if (/[0-9]/.test(ch)) (this.doors[ch] = this.doors[ch] || []).push({ x, y });
    else if (ch !== ".") (marks[ch] = marks[ch] || []).push({ x, y });
  }
  // Doors: each numbered patch of the map is one doorway.
  for (const key in this.doors) {
    const cells = this.doors[key];
    const x0 = Math.min(...cells.map((c) => c.x)), x1 = Math.max(...cells.map((c) => c.x)), y0 = Math.min(...cells.map((c) => c.y)), y1 = Math.max(...cells.map((c) => c.y));
    const d = (def.doors || {})[key] || {};
    this.doors[key] = Object.assign({ key, x: x0 * T, y: y0 * T, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T, edge: x0 === 0 ? "left" : x1 === this.w - 1 ? "right" : y0 === 0 ? "top" : y1 === this.h - 1 ? "bottom" : "inside" }, d);
  }
  // Things that begin at a letter of the map.
  for (const ch in marks) for (const c of marks[ch]) spawnAt(ch, c.x * T, c.y * T, def);
  for (const m of def.movers || []) this.movers.push(Object.assign({ dx: 0, dy: 0, t: 0, solid: true }, m, { x: m.x * T, y: m.y * T, w: m.w * T, h: m.h || 8, x0: m.x * T, y0: m.y * T }));
  this.redrawTiles();
  this.backCanvas = mk(this.w * T, this.h * T);
  const bctx = this.backCanvas.getContext("2d"); bctx.imageSmoothingEnabled = false;
  ART.back(bctx, def, this);
  if (def.init) def.init(this);
  // The monk comes in by the door.
  const m = Game.monk;
  if (doorKey && this.doors[doorKey]) {
    const d = this.doors[doorKey];
    if (d.edge === "left") { m.x = d.x + d.w + 4; m.y = d.y + d.h - m.h; m.face = 1; }
    else if (d.edge === "right") { m.x = d.x - m.w - 4; m.y = d.y + d.h - m.h; m.face = -1; }
    else if (d.edge === "top") { m.x = d.x + d.w / 2 - m.w / 2; m.y = d.y + d.h + 2; m.vy = 40; }
    else if (d.edge === "bottom") { m.x = d.x + d.w / 2 - m.w / 2; m.y = d.y - m.h - 2; m.vy = -330; }
    else { m.x = d.x + d.w / 2 - m.w / 2; m.y = d.y + d.h - m.h; }
    if (how && how.vy !== undefined && d.edge !== "bottom") m.vy = how.vy;
  } else if (def.start) { m.x = def.start[0] * T; m.y = def.start[1] * T - m.h + T; }
  // Push out of any wall the doorway left us in.
  for (let i = 0; i < 20 && rectHitsTiles(m.x, m.y, m.w, m.h, false); i++) m.y -= 4;
  m.climbing = false; m.dash = 0; m.riding = null;
  if (m.carry) { this.bodies.push(m.carry); }
  m.safe = { x: m.x, y: m.y };
  Game.entry = { room: id, door: doorKey, x: m.x, y: m.y };
  this.snapCamera();
  if (def.song) Snd.play(def.song);
  Game.roomName = def.name; Game.nameTime = 3;
  if (def.music === false) Snd.stop();
};
World.redrawTiles = function () {
  this.tileCanvas = mk(this.w * T, this.h * T);
  const c = this.tileCanvas.getContext("2d"); c.imageSmoothingEnabled = false;
  ART.tiles(c, this.def, this);
};
World.snapCamera = function () { this.follow(1); };
World.follow = function (k) {
  const m = Game.monk, rw = this.w * T, rh = this.h * T;
  let tx = m.x + m.w / 2 - W / 2 + m.face * 24, ty = m.y + m.h / 2 - H * 0.55;
  if (this.def.camY !== undefined) ty = this.def.camY;
  tx = rw <= W ? (rw - W) / 2 : clamp(tx, 0, rw - W);
  ty = rh <= H ? (rh - H) / 2 : clamp(ty, 0, rh - H);
  this.camX = lerp(this.camX, tx, k); this.camY = lerp(this.camY, ty, k);
  if (Math.abs(this.camX - tx) < 0.2) this.camX = tx;
  if (Math.abs(this.camY - ty) < 0.2) this.camY = ty;
};

// What each letter of a map brings into the room.
function spawnAt(ch, x, y, def) {
  const custom = def.spawn && def.spawn[ch];
  if (custom) { custom(x, y); return; }
  const B = (o) => World.bodies.push(Object.assign({ vx: 0, vy: 0, ground: false, liftable: true, pushable: true }, o));
  switch (ch) {
    case "c": B({ kind: "crate", x, y, w: 16, h: 16 }); break;
    case "j": B({ kind: "jar", x: x + 2, y: y + 2, w: 12, h: 14 }); break;
    case "b": World.foes.push(Foe("bat", x, y)); break;
    case "r": World.foes.push(Foe("rat", x, y + 8)); break;
    case "s": World.foes.push(Foe("scorpion", x, y + 6)); break;
    case "v": World.foes.push(Foe("crow", x, y)); break;
    case "f": World.foes.push(Foe("fox", x, y + 4)); break;
    case "w": World.foes.push(Foe("watchman", x, y - 10)); break;
    case "l": if (!(save.lilies[def.chapter] || {})[def.id + x + "," + y]) World.items.push({ kind: "lily", x: x + 3, y: y + 2, w: 10, h: 12, key: def.id + x + "," + y }); break;
    case "h": World.items.push({ kind: "heart", x: x + 3, y: y + 3, w: 10, h: 10 }); break;
    case "P": if (def.power && !save.powers[def.power]) World.items.push({ kind: "power", power: def.power, x: x, y: y - 4, w: 16, h: 20 }); break;
  }
}

// ---- Creatures --------------------------------------------------------------------------
// Bats, rats, scorpions, crows, foxes, watchmen: each walks or flies its own
// way, hurts by touch, and goes up in light when the holy water finds it.
function Foe(kind, x, y) {
  const base = { kind, x, y, vx: 0, vy: 0, alive: true, inv: 0, t: Math.random() * 5, hp: 1, home: { x, y }, face: -1 };
  const size = { bat: [12, 8], rat: [14, 8], scorpion: [16, 10], crow: [14, 10], fox: [20, 12], watchman: [12, 26], lion: [24, 16] }[kind] || [12, 12];
  base.w = size[0]; base.h = size[1];
  if (kind === "watchman") base.hp = 3;
  if (kind === "fox" || kind === "lion") base.hp = 2;
  return base;
}
function stepFoe(f, dt) {
  f.t += dt; f.inv = Math.max(0, f.inv - dt);
  const m = Game.monk, dx = m.x + m.w / 2 - (f.x + f.w / 2), dy = m.y + m.h / 2 - (f.y + f.h / 2), dist = Math.hypot(dx, dy);
  const ground = (sp) => { f.vy = Math.min(f.vy + P.grav * dt, P.fall); f.vx = f.face * sp; moveBody(f, dt, { noBodies: true, bouncy: false });
    // Turn at walls and at edges.
    const ahead = World.at(Math.floor((f.x + (f.face > 0 ? f.w + 1 : -1)) / T), Math.floor((f.y + f.h + 2) / T));
    if (f.hitWall || (f.ground && ahead !== SOLID && ahead !== ONEWAY && ahead !== BOUNCE)) f.face = -f.face; };
  switch (f.kind) {
    case "bat":
      // Hangs until the monk comes near, then flutters down at him in loops.
      if (!f.awake && dist < 110) f.awake = true;
      if (f.awake) { f.vx = lerp(f.vx, Math.sign(dx) * 60, dt * 2); f.vy = lerp(f.vy, Math.sign(dy) * 40 + Math.sin(f.t * 6) * 70, dt * 3); f.x += f.vx * dt; f.y += f.vy * dt; }
      break;
    case "crow":
      // Circles overhead, then dives.
      if (!f.dive && dist < 120 && Math.random() < dt * 0.8) { f.dive = 1; f.dvx = Math.sign(dx) * 110; f.dvy = 120; }
      if (f.dive) { f.x += f.dvx * dt; f.y += f.dvy * dt; f.dvy -= 200 * dt; if (f.dvy < -60) { f.dive = 0; f.home.x = f.x; f.home.y = f.y; } }
      else { f.x = f.home.x + Math.sin(f.t * 1.2) * 40; f.y = f.home.y + Math.sin(f.t * 2.4) * 8; }
      f.face = f.dive ? Math.sign(f.dvx) : Math.cos(f.t * 1.2) > 0 ? 1 : -1;
      break;
    case "rat": ground(55); break;
    case "scorpion": if ((f.t % 3) < 2.2) ground(32); else { f.vx = 0; f.vy = Math.min(f.vy + P.grav * dt, P.fall); moveBody(f, dt, { noBodies: true }); } break;
    case "fox": if (dist < 140 && f.ground) f.face = Math.sign(dx) || f.face; ground(dist < 140 ? 95 : 45); if (f.ground && dist < 60 && Math.random() < dt * 2) { f.vy = -260; f.ground = false; } break;
    case "watchman": if (dist < 120) f.face = Math.sign(dx) || f.face; ground(dist < 120 ? 50 : 30); break;
    case "lion": if (dist < 160) f.face = Math.sign(dx) || f.face; ground(dist < 160 ? 110 : 40); if (f.ground && dist < 90 && dist > 30 && Math.random() < dt * 1.5) { f.vy = -300; f.ground = false; } break;
  }
  if (f.inv > 0 && f.kind !== "bat" && f.kind !== "crow") f.x += f.vx * dt * 0.2;
  if (overlap({ x: m.x + 1, y: m.y + 2, w: m.w - 2, h: m.h - 2 }, f)) {
    // The guardian angel turns them aside.
    if (Game.angel && Game.angel.shield > 0) { Game.angel.shield = 0; hurtFoe(f, 1, m.x + m.w / 2); Game.angel.flash = 0.3; }
    else hurtMonk(m, f.x + f.w / 2);
  }
}

// ---- The guardian angel ----------------------------------------------------------------------
// Once found, the angel follows at the monk's shoulder, goes before him toward
// any creature that comes near, and turns one blow aside every few seconds.
function stepAngel(a, dt) {
  const m = Game.monk;
  a.t += dt; a.shield = Math.min(1, (a.shield || 0) + dt / 4); a.flash = Math.max(0, (a.flash || 0) - dt);
  let tx = m.x + m.w / 2 - m.face * 18, ty = m.y - 10 + Math.sin(a.t * 2) * 4;
  let near = null, nd = 90;
  for (const f of World.foes) if (f.alive) { const d = Math.hypot(f.x - m.x, f.y - m.y); if (d < nd) { nd = d; near = f; } }
  if (near) { tx = lerp(m.x, near.x, 0.55); ty = lerp(m.y, near.y, 0.55) - 6; a.cool = (a.cool || 0) - dt; if (a.cool <= 0 && Math.hypot(a.x - near.x, a.y - near.y) < 26) { hurtFoe(near, 1, a.x); a.cool = 1.2; a.flash = 0.25; } }
  a.x = lerp(a.x, tx, Math.min(1, dt * 4)); a.y = lerp(a.y, ty, Math.min(1, dt * 4));
}

// ---- The game --------------------------------------------------------------------------------
const Game = {
  state: "title", monk: Monk.make(0, 0), chapter: 1, shake: 0, cutscene: null, roomName: "", nameTime: 0, god: false, slow: 1,
  fade: 0, fadeTo: null, banner: null, toast: null, angel: null, clock: 0, readNow: null,
  start(ch, roomId, door) {
    this.chapter = ch; this.state = "play";
    const C = CHAPTERS[ch - 1];
    this.monk = Monk.make(0, 0); this.monk.max = this.monk.hearts = save.powers.helmet ? 6 : 5;
    this.angel = save.powers.angel ? { x: 0, y: 0, t: 0 } : null;
    this.flags = {}; this.flock = []; this.speech = null; this.banner = null;
    if (ch === 1 && !Object.keys(save.read).length) this.hint = 8;
    World.load(roomId || C.start, door);
    if (this.angel) { this.angel.x = this.monk.x; this.angel.y = this.monk.y - 20; }
  },
  go(id, door) {
    // A short fade, then the next room.
    if (this.fadeTo) return;
    if (id === "END") { this.finishChapter(); return; }
    this.fadeTo = { id, door }; this.fade = 0;
    Snd.sfx("door");
  },
  pause() { if (this.state === "play") { this.state = "pause"; this.pageRead = 0; } },
  fallen() {
    // Back to the doorway of this room, whole again.
    const e = this.entry, m = this.monk;
    this.state = "fallen"; this.fallenT = 0;
    setTimeout(() => { }, 0);
    m.hearts = m.max;
    this.respawn = e;
  },
  fellOut(m) {
    hurtMonk(m, m.x);
    if (this.state !== "play") return;
    m.x = m.safe.x; m.y = m.safe.y - 2; m.vx = 0; m.vy = 0; m.inv = 1.2;
  },
  // A double tap: what is there to do?
  interact(m, at) {
    if (m.carry) { dropCarry(m); return true; }
    const near = (o, r) => Math.hypot(o.x + (o.w || 0) / 2 - (m.x + m.w / 2), o.y + (o.h || 0) / 2 - (m.y + m.h / 2)) < r;
    // Someone to speak with.
    for (const n of World.npcs) if (n.talk && near(n, 40)) { n.talk(n); return true; }
    // A door within the room.
    for (const k in World.doors) { const d = World.doors[k]; if (d.edge === "inside" && d.to && overlap({ x: m.x - 4, y: m.y, w: m.w + 8, h: m.h }, d)) { if (!d.locked || d.locked()) { this.go(d.to, d.door); return true; } } }
    // Something to lift.
    const b = nearestLift(m, at.x !== undefined ? at : null);
    if (b) { lift(m, b); return true; }
    return false;
  },
};

function stepPlay(dt) {
  const m = Game.monk, R = World.def;
  World.t += dt; Game.clock += dt;
  if (Game.shake > 0) Game.shake -= dt;
  if (Game.nameTime > 0) Game.nameTime -= dt;
  if (Game.banner) { Game.banner.t += dt; if (Game.banner.t > Game.banner.len) Game.banner = null; }
  if (Game.toast) { Game.toast.t += dt; if (Game.toast.t > 2.6) Game.toast = null; }
  // Room transitions: fade out, change, fade in.
  if (Game.fadeTo) {
    Game.fade += dt * 5;
    if (Game.fade >= 1) {
      const f = Game.fadeTo; Game.fadeTo = null;
      const carry = m.carry;
      World.load(f.id, f.door, { vy: m.vy });
      if (carry) { m.carry = carry; }
      if (Game.angel) { Game.angel.x = m.x; Game.angel.y = m.y - 20; }
      // The flock comes too.
      for (const g of Game.flock || []) { g.x = m.x - 14 * (1 + Game.flock.indexOf(g)) * m.face; g.y = m.y + m.h - g.h; g.vx = 0; g.vy = 0; if (!World.npcs.includes(g)) World.npcs.push(g); }
      Game.fade = 1; Game.fadeIn = true;
    }
    return;
  }
  if (Game.fadeIn) { Game.fade -= dt * 4; if (Game.fade <= 0) { Game.fade = 0; Game.fadeIn = false; } }
  if (window.__bot) window.__bot(dt);
  // Moving platforms: the chariots, the rising jewels.
  for (const mv of World.movers) {
    mv.t += dt; const ox = mv.x, oy = mv.y;
    if (mv.update) mv.update(mv, dt);
    else if (mv.path) { const p = mv.path, period = mv.period || 4, u = (Math.sin(mv.t * Math.PI * 2 / period - Math.PI / 2) + 1) / 2; mv.x = mv.x0 + (p[0] * T) * u; mv.y = mv.y0 + (p[1] * T) * u; }
    mv.dx = mv.x - ox; mv.dy = mv.y - oy;
  }
  // Objects fall and settle, lowest first, so stacks rest on what is under them.
  World.bodies.sort((a, b) => b.y - a.y);
  for (const b of World.bodies) {
    if (b.carried) continue;
    b.vy = Math.min(b.vy + P.grav * dt, P.fall);
    b.vx = approach(b.vx, 0, (b.ground ? 600 : 60) * dt);
    moveBody(b, dt, { bouncy: true });
    if (b.bounced) { b.vy = -260; b.bounced = false; }
    if (b.y > World.h * T + 60) { b.x = b.home ? b.home.x : b.x; b.y = b.home ? b.home.y : 0; b.vy = 0; }
  }
  stepMonk(m, dt);
  // Rising air: perfume, spice, the warmth of the sun. It lifts the monk while he is in it.
  for (const u of R.updrafts || []) {
    if (overlap(m, { x: u.x * T, y: u.y * T, w: u.w * T, h: u.h * T }) && !m.climbing) { m.vy = Math.max(m.vy - (u.force || 2600) * dt, -(u.max || 190)); m.cut = true; m.inUpdraft = true; }
  }
  if (Game.angel) stepAngel(Game.angel, dt);
  for (const f of World.foes) if (f.alive) stepFoe(f, dt);
  World.foes = World.foes.filter((f) => f.alive || f.keep);
  for (const n of World.npcs) if (n.update) n.update(n, dt);
  // Holy water in flight.
  for (const s of World.shots) {
    s.life -= dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.spin += dt * 14;
    if (s.kind === "flame" && Math.random() < 0.7) World.parts.push({ x: s.x + 3, y: s.y + 3, vx: -s.vx * 0.1, vy: -20, g: -60, life: 0.3, c: Math.random() < 0.5 ? "#ffcf5a" : "#ff6a3a", s: 2 });
    const hitFoe = World.foes.find((f) => f.alive && overlap(s, f));
    if (hitFoe || rectHitsTiles(s.x, s.y, s.w, s.h, s.vy > 0, s.y + s.h - s.vy * dt) || s.life <= 0) {
      if (s.kind === "flame" && hitFoe && !s.through) { s.through = 1; hurtFoe(hitFoe, 2, s.x); continue; }
      splash(s.x + 3, s.y + 3, s.kind === "flame"); s.life = 0;
    }
  }
  World.shots = World.shots.filter((s) => s.life > 0);
  // Gifts on the ground: lilies, hearts, the chapter's power.
  for (const it of World.items) {
    if (it.taken || !overlap(m, it)) continue;
    it.taken = true;
    if (it.kind === "lily") { const c = save.lilies[R.chapter] = save.lilies[R.chapter] || {}; c[it.key] = 1; store(); Snd.sfx("neume"); Game.toast = { text: "A lily of the valleys", t: 0 }; }
    if (it.kind === "heart") { m.hearts = Math.min(m.max, m.hearts + 2); Snd.sfx("neume"); }
    if (it.kind === "power") Game.gainPower(it.power);
  }
  World.items = World.items.filter((i) => !i.taken);
  for (const p of World.parts) { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  World.parts = World.parts.filter((p) => p.life > 0);
  for (const g of World.glows) g.life -= dt;
  World.glows = World.glows.filter((g) => g.life > 0);
  // Doors at the edges: walk through.
  for (const k in World.doors) {
    const d = World.doors[k];
    if (d.edge === "inside" || !d.to) continue;
    const c = { x: m.x + m.w / 2, y: m.y + m.h / 2 };
    const inside = c.x >= d.x - 2 && c.x <= d.x + d.w + 2 && c.y >= d.y - 8 && c.y <= d.y + d.h + 8;
    const leaving = (d.edge === "left" && m.x < 8) || (d.edge === "right" && m.x + m.w > World.w * T - 8) || (d.edge === "top" && m.y < 4) || (d.edge === "bottom" && m.y + m.h > World.h * T - 2);
    if (inside && leaving && (!d.locked || d.locked())) Game.go(d.to, d.door);
  }
  // The words on the walls: read when the monk comes near.
  Game.readNow = null;
  for (const tx of R.texts || []) {
    const cx = tx.x + (tx.w || 0) / 2, cy = tx.y + 10;
    const d = Math.hypot(m.x + m.w / 2 - cx, m.y + m.h / 2 - cy);
    if (d < (tx.reach || Math.max(90, (tx.w || 0) / 2 + 40))) {
      const key = R.chapter + ":" + tx.v;
      if (!save.read[key]) { save.read[key] = 1; store(); Snd.sfx("verse"); Game.toast = { text: "Canticle " + R.chapter + ":" + tx.v, t: 0, verse: true }; }
      Game.readNow = tx;
    }
  }
  if (R.update) R.update(World, dt);
  World.follow(Math.min(1, dt * 7));
}

// ---- Drawing ---------------------------------------------------------------------------------
function drawWorld() {
  const R = World.def, cx = Math.round(World.camX + (Game.shake > 0 ? (Math.random() - 0.5) * 4 : 0)), cy = Math.round(World.camY + (Game.shake > 0 ? (Math.random() - 0.5) * 4 : 0));
  const t = World.t;
  // The back: sky, far things, the back wall, the great figures behind.
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.imageSmoothingEnabled = false; bx.clearRect(0, 0, W, H);
  ART.sky(bx, R, cx, cy, t);
  bx.drawImage(World.backCanvas, -cx, -cy);
  bx.save(); bx.translate(-cx, -cy); if (R.back) R.back(bx, World, t); bx.restore();
  // The front: tiles, things, creatures, the monk.
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.imageSmoothingEnabled = false; fx.clearRect(0, 0, W, H);
  fx.save(); fx.translate(-cx, -cy);
  if (R.behind) R.behind(fx, World, t);
  fx.drawImage(World.tileCanvas, 0, 0);
  for (const mv of World.movers) ART.mover(fx, mv, t);
  for (const it of World.items) ART.item(fx, it, t);
  for (const b of World.bodies) if (!b.carried) ART.body(fx, b, t);
  for (const n of World.npcs) ART.npc(fx, n, t);
  for (const f of World.foes) ART.foe(fx, f, t);
  if (Game.angel) ART.angel(fx, Game.angel, t);
  ART.monk(fx, Game.monk, t);
  if (Game.monk.carry) ART.body(fx, Game.monk.carry, t);
  for (const s of World.shots) ART.shot(fx, s, t);
  for (const p of World.parts) { fx.fillStyle = p.c; fx.fillRect(Math.round(p.x), Math.round(p.y), p.s || 1, p.s || 1); }
  if (R.front) R.front(fx, World, t);
  fx.restore();

  // Onto the screen: back, words, front, dark, glows.
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.fillStyle = "#000"; sx.fillRect(0, 0, screen.width, screen.height);
  sx.imageSmoothingEnabled = false;
  sx.drawImage(bgBuf, Math.round(offX * dpr), Math.round(offY * dpr), Math.round(W * scale * dpr), Math.round(H * scale * dpr));
  toScreenSpace();
  sx.save(); sx.beginPath(); sx.rect(0, 0, W, H); sx.clip();
  sx.translate(-cx, -cy);
  for (const tx of R.texts || []) VERSE.draw(sx, tx, R, t, cx, cy);
  sx.restore();
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.imageSmoothingEnabled = false;
  sx.drawImage(fgBuf, Math.round(offX * dpr), Math.round(offY * dpr), Math.round(W * scale * dpr), Math.round(H * scale * dpr));
  drawLight(cx, cy, t);
  sx.imageSmoothingEnabled = true;
  sx.drawImage(ltBuf, Math.round(offX * dpr), Math.round(offY * dpr), Math.round(W * scale * dpr), Math.round(H * scale * dpr));
  // Glows, added over all.
  toScreenSpace();
  sx.save(); sx.beginPath(); sx.rect(0, 0, W, H); sx.clip(); sx.translate(-cx, -cy); sx.globalCompositeOperation = "lighter";
  const glow = (x, y, r, c, a) => { const g = sx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); sx.globalAlpha = a; sx.fillStyle = g; sx.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const L of R.lights || []) if (L.glow !== false) glow(L.x, L.y, (L.r || 60) * 0.6, L.c || "rgba(255,190,110,0.35)", 0.8 + (L.flicker ? Math.sin(t * 13 + L.x) * 0.15 : 0));
  for (const g of World.glows) glow(g.x, g.y, g.r, g.c, g.life / g.max);
  for (const it of World.items) if (it.kind === "power") glow(it.x + 8, it.y + 10, 40, "rgba(255,230,150,0.6)", 0.7 + Math.sin(t * 4) * 0.2);
  if (save.powers.lantern) glow(Game.monk.x + 5 + Game.monk.face * 6, Game.monk.y + 16, 40, "rgba(255,200,120,0.25)", 1);
  if (Game.angel) glow(Game.angel.x + 6, Game.angel.y + 8, 30, "rgba(220,235,255,0.5)", 0.8);
  if (R.glow) R.glow(sx, World, t, glow);
  sx.restore();
}
// The dark of a room, and the light that the lamps, the sun and the monk's lantern cut into it.
function drawLight(cx, cy, t) {
  const R = World.def;
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = "source-over"; lx.clearRect(0, 0, W, H);
  const dark = R.dark || 0;
  if (dark <= 0) return;
  lx.fillStyle = R.darkColor || "rgba(6,4,14," + dark + ")"; lx.globalAlpha = R.darkColor ? dark : 1; lx.fillRect(0, 0, W, H); lx.globalAlpha = 1;
  lx.globalCompositeOperation = "destination-out";
  const hole = (x, y, r, a) => { const g = lx.createRadialGradient(x - cx, y - cy, r * 0.15, x - cx, y - cy, r); g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(1, "rgba(0,0,0,0)"); lx.fillStyle = g; lx.fillRect(x - cx - r, y - cy - r, r * 2, r * 2); };
  for (const L of R.lights || []) hole(L.x, L.y, (L.r || 60) * (L.flicker ? 1 + Math.sin(t * 11 + L.y) * 0.04 : 1), L.a || 1);
  const m = Game.monk;
  hole(m.x + m.w / 2, m.y + m.h / 2, save.powers.lantern ? 130 : 72, save.powers.lantern ? 1 : 0.85);
  for (const s of World.shots) hole(s.x, s.y, s.kind === "flame" ? 40 : 18, 0.8);
  for (const g of World.glows) hole(g.x, g.y, g.r, Math.max(0, g.life / g.max));
  for (const it of World.items) if (it.kind === "power" || it.kind === "lily") hole(it.x + 6, it.y + 8, 36, 0.8);
  if (Game.angel) hole(Game.angel.x + 6, Game.angel.y + 8, 50, 0.8);
  if (R.lightHoles) R.lightHoles(hole, World, t);
  lx.globalCompositeOperation = "source-over";
}
