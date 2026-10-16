"use strict";
// While You Have the Light: the creatures that are not demons. Each is of a role, and the rules
// that people a mountain place roles, not creatures: where a role is to go, one of its kinds is
// drawn at random (by weight), so a kind added to a role's pool is placed with no other change.
//   harmful: they hurt him, but are not demons (the little frog, the spider)
//   neutral: they mind their own business, or flee (the mouse, the bird)
//   platform: carry him across (the platform bird: its art to come)
// The frog and the spider are traced (frogs-1.jpg, cobwebs-spider-1.jpg); the mouse and the bird
// are drawn here. They live in S.critters.

const CRITTERS = {
  // The little frog: sits; seeing him near, crouches, and leaps at him. Landed on or struck, it
  // turns over, and is gone.
  frog: { role: "harmful", hw: 7, ht: 10, w: 2 },
  // The spider: waits on the roof; he comes beneath, and it drops on its thread to his height, and
  // hangs there a while, and climbs back. Its touch hurts. Struck, it falls dead.
  spider: { role: "harmful", hw: 11, ht: 16, w: 1, roof: true },
  // The mouse: about the floor; he comes near, and it runs.
  mouse: { role: "neutral", hw: 5, ht: 5, w: 2 },
  // The bird: flies about a place of its own. The hook can take it (as it takes a chain), and then
  // it panics: it flies wildly, dragging him about, and tears free.
  bird: { role: "neutral", hw: 6, ht: 6, w: 1, air: true },
  // The platform bird: a bloated vulture with a broad flat back, flying slowly to and fro on its
  // beat (across a pit, or up a shaft). He can stand on its back and be carried; it sags under him.
  vulture: { role: "platform", hw: 30, ht: 30, w: 1, air: true },
};
const PB_K = 1.4, PB_TOP = 23, PB_U0 = -22, PB_U1 = 12;      // its size; its back's height, and from where to where along it (facing +u)
const ROLES = { harmful: [], neutral: [], platform: [] };
for (const k in CRITTERS) ROLES[CRITTERS[k].role].push(k);
// One kind of a role, drawn by weight.
function pickKind(role, rnd) {
  const pool = ROLES[role] || []; if (!pool.length) return null;
  let n = pool.reduce((a, k) => a + CRITTERS[k].w, 0) * (rnd || Math.random)();
  for (const k of pool) { n -= CRITTERS[k].w; if (n <= 0) return k; }
  return pool[pool.length - 1];
}
function spawnCritter(kind, x, y) {
  const K = CRITTERS[kind]; if (!K) return null;
  const c = { kind, x, y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, st: "idle", t: Math.random() * 2, hp: 1, id: ++S.ids, a: 1, ph: Math.random() * TAU, hx: x, hy: y, len: 2, ang: 0 };
  if (K.roof) { c.ay = y; c.st = "wait"; }
  if (kind === "vulture") { c.beat = { ax: x - 150, ay: y, bx: x + 150, by: y }; c.u = 0.5; c.s = 1; }
  (S.critters = S.critters || []).push(c);
  return c;
}
const critterMid = (c) => [c.x, c.y - CRITTERS[c.kind].ht / 2];
const touches = (c, pad) => { const K = CRITTERS[c.kind], [cx, cy] = critterMid(c); return Math.abs(cx - S.x) < HW + K.hw + (pad || 0) && Math.abs(cy - (S.y - HT / 2)) < HT / 2 + K.ht / 2 + (pad || 0); };
// A tap on a harmful creature near him: he strikes it.
function critterAt(wx, wy) {
  for (const c of S.critters || []) { if (c.st === "dead" || CRITTERS[c.kind].role !== "harmful") continue; const [cx, cy] = critterMid(c); if (dist(wx, wy, cx, cy) < 22) return c; }
  return null;
}
function strikeCritter(c) {
  if (dist(c.x, c.y, S.x, S.y) > 72) return false;
  killCritter(c, sign(c.x - S.x) || S.dir); S.dir = sign(c.x - S.x) || S.dir; Sound.fx.kick(1, panX(c.x)); S.shake = 0.08;
  return true;
}
function killCritter(c, kx) {
  c.st = "dead"; c.t = 0; c.vx = kx * 90; c.vy = -170; ev("a creature struck", { kind: c.kind });
  for (let q = 0; q < 6; q++) S.parts.push({ kind: "chip", x: c.x, y: c.y - 5, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.5, age: 0 });
}
// The birds, for the hook: as chains are (a point it can be taken by).
const birdsNear = () => (S.critters || []).filter((c) => c.kind === "bird" && c.st !== "dead" && Math.abs(c.y - S.y) < 600);

function stepCritters(dt) {
  if (!S.critters) return;
  const [mx, my] = middle();
  for (const c of S.critters) {
    if (Math.abs(c.y - S.y) > 1400 || Math.abs(c.x - S.x) > 1600) continue;      // (only those near him move)
    const K = CRITTERS[c.kind]; c.t += dt;
    if (c.st === "dead") {
      // (Turned over and falling; then fading.)
      c.vy = Math.min(VMAX, c.vy + GRAV * dt); if (c.kind === "bird") c.vy = Math.min(c.vy, 260);
      const [hx, hy] = moveBox(c, c.vx * dt, c.vy * dt, K.hw, K.ht); if (hy) { c.vy = 0; c.vx *= 0.5; } if (hx) c.vx = 0;
      c.a = clamp(1 - (c.t - 1.2) / 1.2, 0, 1); continue;
    }
    const d = dist(c.x, c.y, S.x, S.y), seen = d < 200 && los(c.x, c.y - K.ht / 2, mx, my);
    if (c.kind === "frog") {
      c.vy = Math.min(VMAX, c.vy + GRAV * dt);
      const [hx, hy] = moveBox(c, c.vx * dt, c.vy * dt, K.hw, K.ht); const ground = hy > 0;
      if (hx) c.vx = -c.vx * 0.3;
      if (ground) { c.vy = 0; if (c.st === "leap") { c.st = "idle"; c.t = 0; c.vx = 0; } }
      if (c.st === "idle" && ground && seen && d < 170 && c.t > 1.1) { c.st = "crouch"; c.t = 0; c.dir = sign(S.x - c.x) || c.dir; }
      else if (c.st === "crouch" && c.t > 0.45) { c.st = "leap"; c.t = 0; c.dir = sign(S.x - c.x) || c.dir; c.vx = c.dir * clamp(Math.abs(S.x - c.x) * 1.6, 90, 210); c.vy = -250 - Math.random() * 60; Sound.fx.tick(300, 0.25); }
      // (Landed on from above: it is crushed, and he springs up off it.)
      if (S.vy > 120 && !S.ground && Math.abs(S.x - c.x) < HW + K.hw && S.y > c.y - K.ht - 4 && S.y < c.y + 2) { killCritter(c, S.dir); S.vy = -280; continue; }
      if (c.st === "leap" && touches(c)) { hitMonk(c.dir * 120, 0.05); c.vx = -c.vx * 0.4; c.st = "idle"; c.t = 0; }
    } else if (c.kind === "spider") {
      // (Its thread from the roof: down to his height, a while there, and up again.)
      if (c.st === "wait") { c.y = c.ay; if (Math.abs(S.x - c.x) < 50 && S.y > c.ay && S.y - c.ay < 340 && los(c.x, c.ay + 4, mx, my)) { c.st = "drop"; c.t = 0; Sound.fx.tick(1800, 0.15); } }
      else if (c.st === "drop") { const to = Math.min(S.y - 10, floorBelow(c.x, c.ay) - 2); c.y = Math.min(to, c.y + 420 * dt); if (c.y >= to - 1) { c.st = "hang"; c.t = 0; } }
      else if (c.st === "hang") { c.y += Math.sin(c.t * 3) * 6 * dt; if (c.t > 3) { c.st = "climb"; c.t = 0; } }
      else if (c.st === "climb") { c.y = Math.max(c.ay, c.y - 70 * dt); if (c.y <= c.ay + 0.5) { c.st = "wait"; c.t = 0; } }
      if (c.st !== "wait" && touches(c, -2) && !(S.invT > 0)) hitMonk(sign(S.x - c.x) * 100, 0.05);
    } else if (c.kind === "mouse") {
      c.vy = Math.min(VMAX, c.vy + GRAV * dt);
      if (seen && d < 120) { c.st = "flee"; c.dir = sign(c.x - S.x) || c.dir; c.t = 0; }
      if (c.st === "flee" && c.t > 1.4 && d > 160) c.st = "idle";
      if (c.st === "idle") { if (c.t > 1.5 + (c.ph % 1.5)) { c.st = Math.random() < 0.5 ? "walk" : "idle"; c.t = 0; c.dir = Math.random() < 0.5 ? -1 : 1; } c.vx = 0; }
      else if (c.st === "walk") { c.vx = c.dir * 30; if (c.t > 1.2) { c.st = "idle"; c.t = 0; } }
      else c.vx = c.dir * 170;
      // (Into a wall, it is gone: into some crack too small to see.)
      const [hx, hy] = moveBox(c, c.vx * dt, c.vy * dt, K.hw, K.ht); if (hy) c.vy = 0; if (hx) { c.a = 0; continue; }
      c.ph += Math.abs(c.vx) * dt * 0.4;
    } else if (c.kind === "vulture") {
      const B = c.beat, len = Math.max(40, dist(B.ax, B.ay, B.bx, B.by)), x0 = c.x, y0 = c.y;
      c.u += c.s * dt * 52 / len; if (c.u > 1) { c.u = 1; c.s = -1; c.turnT = 0.35; } if (c.u < 0) { c.u = 0; c.s = 1; c.turnT = 0.35; }
      const e = smooth(c.u), ride = S.rideOn === c; c.sag = (c.sag || 0) + ((ride ? 7 : 0) - (c.sag || 0)) * Math.min(1, dt * 4);
      c.x = lerp(B.ax, B.bx, e); c.y = lerp(B.ay, B.by, e) + Math.sin(c.t * 1.3 + c.ph) * 4 + c.sag;
      if (Math.abs(B.bx - B.ax) > 4) c.dir = sign((B.bx - B.ax) * c.s); c.turnT = Math.max(0, (c.turnT || 0) - dt);
      c.ph += dt * (ride ? 3.2 : 2.2);
      // (Carried: he goes where it goes.)
      if (ride) { S.x += c.x - x0; S.y += c.y - y0; }
      continue;
    } else if (c.kind === "bird") {
      const held = S.rope && S.rope.chain === c;
      if (held) {
        // Panic: wild, sudden turns, mostly up and away; then it tears free.
        if (c.st !== "panic") { c.st = "panic"; c.t = 0; ev("a bird taken by the hook"); Sound.fx.tick(2200, 0.4); }
        if (Math.random() < dt * 3) { c.vx = (Math.random() - 0.5) * 420; c.vy = -60 - Math.random() * 220 + (Math.random() < 0.25 ? 260 : 0); }
        if (c.t > 2.4 + (c.ph % 1)) { dropRope(true); c.st = "flee"; c.t = 0; c.vy = -160; }
      } else if (c.st === "panic") c.st = "flee";
      else if (c.st === "flee") { c.vy += (-60 - c.vy) * dt; c.vx += (c.dir * 160 - c.vx) * dt * 2; if (c.t > 3) { c.st = "idle"; c.hx = c.x; c.hy = c.y; } }
      else {
        // About its place, rising and falling as it beats its wings; startled when he comes close.
        const tx = c.hx + Math.sin(c.t * 0.5 + c.ph) * 110, ty = c.hy + Math.sin(c.t * 0.9 + c.ph * 2) * 40;
        c.vx += ((tx - c.x) * 1.2 - c.vx) * dt * 1.5; c.vy += ((ty - c.y) * 1.2 - c.vy) * dt * 1.5;
        if (seen && d < 60) { c.st = "flee"; c.t = 0; c.dir = sign(c.x - S.x) || 1; }
      }
      const [hx, hy] = moveBox(c, c.vx * dt, c.vy * dt, K.hw, K.ht); if (hx) { c.vx = -c.vx * 0.6; c.dir = -c.dir; } if (hy) c.vy = -c.vy * 0.6;
      if (Math.abs(c.vx) > 5) c.dir = sign(c.vx);
      c.ph += dt * (c.st === "panic" ? 30 : 13);
      if (held) { S.rope.x = c.x; S.rope.y = c.y; }
    }
  }
  S.critters = S.critters.filter((c) => c.a > 0.02);
}
// The floor under a point (for a spider's thread: no lower than the floor).
function floorBelow(x, y) { for (let d = 0; d < 900; d += 4) if (solidAt(x, y + d)) return y + d; return y + 900; }

function drawCritters(cam) {
  for (const c of S.critters || []) {
    const x = c.x - cam.x, y = c.y - cam.y; if (x < -60 || x > W + 60 || y < -60 || y > H + 400) continue;
    ctx.globalAlpha = c.a; const ink = "#0a090b";
    if (c.kind === "frog" || c.kind === "spider") {
      const k = c.kind === "frog" ? (c.st === "dead" ? "fg4" : c.st === "crouch" ? "fg1" : c.st === "leap" ? (c.vy < 0 ? "fg2" : "fg3") : "fg0")
        : c.st === "dead" ? "sp5" : c.st === "wait" ? "sp2" : c.st === "drop" ? "sp4" : "sp3";
      if (c.kind === "spider" && c.st !== "dead") line(x, c.ay - cam.y - 2, x, y - 14, "rgba(30,28,32,0.8)", 1);
      const P = new Path2D(), T = put(c.x, c.y, c.dir, cam);
      addShape(P, TRACED[k], c.kind === "spider" && c.st === "wait" ? (u, v) => T(u, -v + 16) : T);
      ctx.fillStyle = ink; ctx.fill(P, "evenodd");
    } else if (c.kind === "mouse") {
      const s = c.dir, run = Math.abs(c.vx) > 40, b = run ? Math.sin(c.ph * 6) * 1.2 : 0;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(x, y - 3.5 + b * 0.3, 6, 3.4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + s * 6, y - 4, 3, 2.3, s * 0.3, 0, TAU); ctx.fill();
      circle(x + s * 4.6, y - 6.6, 1.6, ink);
      line(x - s * 6, y - 3, x - s * 13, y - 4 + Math.sin(c.ph * 3) * 2, ink, 1);
      line(x - 3 + b, y - 1, x - 3 - b, y + 0.3, ink, 1.2); line(x + 3 - b, y - 1, x + 3 + b, y + 0.3, ink, 1.2);
    } else if (c.kind === "vulture") {
      const k = S.rideOn === c ? "pb3" : c.turnT > 0 ? "pb5" : ["pb0", "pb1", "pb0", "pb2"][Math.floor(c.ph) % 4], P = new Path2D(), T = put(c.x, c.y, c.dir, cam);
      addShape(P, TRACED[k], (u, v) => T(u * PB_K, v * PB_K)); ctx.fillStyle = ink; ctx.fill(P, "evenodd");
    } else if (c.kind === "bird") {
      const s = c.dir, fl = Math.sin(c.ph), dead = c.st === "dead";
      ctx.save(); ctx.translate(x, y - 4); if (dead) ctx.rotate(c.t * 4);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 3.6, 0, 0, TAU); ctx.fill();
      circle(s * 6.2, -2, 2.6, ink); poly([s * 8, -2.6, s * 11.5, -1.4, s * 8, -0.8], ink); poly([-s * 6, -0.5, -s * 11, -2.5, -s * 10, 1.5], ink);
      const wy = dead ? 2 : -fl * 9; poly([-2, -1, 3, -1, s * -1 + 1, wy - 2, -s * 6, wy], ink);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

// ---- The rules that people a whole mountain -------------------------------------------------------
// Room by room (makeMountain keeps each room's place): fewer at the foot, more toward the top; the
// demons in rooms on the ways, the harmful creatures on floors and roofs, the neutral anywhere;
// the shrine and the crawl only the neutral (and the shrine its idol). Never two at one spot,
// never near a room's sides (where the passages come in), never near where he starts.
function peopleMountain(sec, dom) {
  const R = sec.R, rnd = seeded(seed + 9091), RW = ROOM_W * ROOM_K, RH = ROOM_H * ROOM_K, start = R.marks.S[0] || [-999, -999], taken = [];
  const cellX = (i) => (sec.x0 + i + 0.5) * CELL, cellY = (r) => -(sec.h1 - r) * CELL - 0.01;
  const air = (i, r) => i >= 0 && r >= 0 && i < R.w && r < R.h && !R.g[r][i];
  const free = (i, r) => !taken.some(([a, b]) => Math.abs(a - i) < 10 && Math.abs(b - r) < 6) && Math.hypot(i - start[0], r - start[1]) > 22;
  // A spot in a room: on a floor (air over rock, room to stand), or under a roof (air under rock,
  // a fall beneath it), or in the open air.
  function spot(S0, kind) {
    for (let n = 0; n < 60; n++) {
      const i = S0.ox + 8 + Math.floor(rnd() * (RW - 16)), r = S0.oy + 4 + Math.floor(rnd() * (RH - 8));
      if (!air(i, r) || !free(i, r)) continue;
      if (kind === "floor") { let q = r; while (air(i, q + 1) && q < S0.oy + RH - 1) q++; if (air(i, q + 1) || !air(i, q - 3) || !air(i - 2, q) || !air(i + 2, q) || air(i - 2, q + 1) || air(i + 2, q + 1)) continue; taken.push([i, q]); return [cellX(i), cellY(q)]; }
      if (kind === "roof") { let q = r; while (air(i, q - 1) && q > S0.oy) q--; if (air(i, q - 1)) continue; let f = q; while (air(i, f + 1) && f - q < 30) f++; if (f - q < 10) continue; taken.push([i, q]); return [cellX(i), cellY(q) + CELL]; }
      if (kind === "open") { let ok = true; for (let a = -4; a <= 4 && ok; a++) for (let b = -3; b <= 3 && ok; b++) if (!air(i + a, r + b)) ok = false; if (!ok) continue; taken.push([i, r]); return [cellX(i), cellY(r)]; }
    }
    return null;
  }
  for (const S0 of R.slots) {
    const up = 1 - S0.oy / R.h, quiet = S0.kind === "shrine" || S0.kind === "crawl", n = (base) => Math.floor(base + rnd() * (base + 1));
    if (S0.kind === "shrine") { const I = R.marks.I.find(([i, r]) => i >= S0.ox && i < S0.ox + RW && r >= S0.oy && r < S0.oy + RH); if (I) { let q = I[1]; while (air(I[0], q + 1)) q++; placeShrine(0, dom, [[cellX(I[0]), cellY(q), cellX(I[0]) - 90, cellX(I[0]) + 90]], []); } }
    if (S0.onWay && !quiet) for (let q = 0; q < n(0.1 + 0.45 * up); q++) { const p = spot(S0, "floor"); if (p) spawnDemon(dom, p[0], p[1], p[0] - 110, p[0] + 110, 0); }
    if (!quiet) for (let q = 0; q < n(0.2 + 0.8 * up); q++) {
      const kind = pickKind("harmful", rnd), p = kind && spot(S0, CRITTERS[kind].roof ? "roof" : "floor");
      if (p) spawnCritter(kind, p[0], p[1]);
    }
    if (S0.onWay && (S0.kind === "gap" || (S0.kind === "shaft" && rnd() < 0.4))) {
      const kind = pickKind("platform", rnd);
      if (kind) { const cx = cellX(S0.ox + RW / 2), cy = cellY(S0.oy + RH * 0.45), c = spawnCritter(kind, cx, cy);
        if (c && S0.kind === "shaft") c.beat = { ax: cx, ay: cellY(S0.oy + RH - 8), bx: cx, by: cellY(S0.oy + 6) };
        else if (c) c.beat = { ax: cellX(S0.ox + 14), ay: cy, bx: cellX(S0.ox + RW - 14), by: cy }; }
    }
    for (let q = 0; q < n(0.6); q++) {
      const kind = pickKind("neutral", rnd), p = kind && spot(S0, CRITTERS[kind].air ? "open" : "floor");
      if (p) spawnCritter(kind, p[0], p[1]);
    }
  }
}

// The back of a platform bird under his feet, if he stands (or comes down) on one: its top, and the bird.
function backUnder() {
  for (const c of S.critters || []) {
    if (c.kind !== "vulture" || c.st === "dead") continue;
    const top = c.y - PB_TOP * PB_K, a = c.x + c.dir * PB_U0 * PB_K, b = c.x + c.dir * PB_U1 * PB_K;
    if (S.x > Math.min(a, b) - HW + 2 && S.x < Math.max(a, b) + HW - 2 && S.y >= top - 3 && S.y <= top + 16) return { top, c };
  }
  return null;
}
