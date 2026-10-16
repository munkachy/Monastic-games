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
  bird: { role: "neutral", hw: 12, ht: 24, w: 1, air: true },
  // The platform bird: a bloated vulture with a broad flat back, flying slowly to and fro on its
  // beat (across a pit, or up a shaft). He can stand on its back and be carried; it sags under him.
  vulture: { role: "platform", hw: 30, ht: 30, w: 1, air: true },
};
const PB_K = 1.4, PB_TOP = 24.3, PB_U0 = -23, PB_U1 = 9;    // its size; its back's height, and from where to where along it (facing +u)
const PB_SH = [3, 19];                                      // its shoulder (u, v), where the wings are jointed
// A wing, jointed at the shoulder, wrist and the spread of its long feathers, at angle a (0 level,
// back along the body; up positive): its outline in the bird's own (u, v).
const pbWing = (a, far) => wingShape(a, far, PB_SH, far ? 19 : 22, far ? 26 : 30);
const BB_SH = [6, 12];                                       // the big bird's shoulder, on its gliding body
function wingShape(a, far, sh, L1, L2) {
  const [su, sv] = sh, a2 = a * 1.35 + 0.08, fk = L2 / 30;
  const d1 = [-Math.cos(a), Math.sin(a)], d2 = [-Math.cos(a2), Math.sin(a2)], n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]];
  const Wr = [su + d1[0] * L1, sv + d1[1] * L1], Tp = [Wr[0] + d2[0] * L2, Wr[1] + d2[1] * L2], out = [[su + 3, sv + 1], Wr, Tp];
  // (The long feathers of the hand, each a finger with a notch between; then the arm's shorter ones.)
  for (let i = 0; i <= 6; i++) {
    const k = i / 6, b = [Tp[0] - d2[0] * L2 * k, Tp[1] - d2[1] * L2 * k], f = (9 + 5 * Math.sin(k * PI) + (i === 0 ? 2 : 0)) * fk;
    out.push([b[0] + n2[0] * f - d2[0] * 3, b[1] + n2[1] * f - d2[1] * 3], [b[0] + n2[0] * f * 0.55, b[1] + n2[1] * f * 0.55]);
  }
  for (let i = 1; i <= 4; i++) { const k = i / 4, b = [Wr[0] - d1[0] * L1 * k, Wr[1] - d1[1] * L1 * k], f = (8 - 2 * k) * fk; out.push([b[0] + n1[0] * f, b[1] + n1[1] * f], [b[0] + n1[0] * f * 0.6 + d1[0] * 2, b[1] + n1[1] * f * 0.6 + d1[1] * 2]); }
  out.push([su + 2, sv - 5 * fk]);
  return out;
}
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
// A tap on one: he goes to it (a dash, as to a demon) and strikes it; it is struck when the blow lands.
function strikeCritter(c) {
  if (S.act || (S.atk && !S.atk.hit) || !upFromCrawl()) return true;
  const K = CRITTERS[c.kind], [cx, cy] = critterMid(c);
  if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return true; }
  if (S.atk) S.atk = null;
  const sp = strikeSpot({ x: c.x, y: c.y, hw: K.hw, ground: c.kind === "frog" });
  startMove("punch", sp, { f: null, crit: c, dur: 0.34 }); S.dir = c.x < sp[0] ? -1 : 1;
  return true;
}
// Its blow on him: unless he is warded (signed with the cross), when it is turned back, and the ward spent.
function critterHits(c, kx, cost) {
  if (S.ward) {
    spendWard(); ev("ward turned a " + c.kind);
    const [mx, my] = middle(); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); S.shake = 0.12;
    if (c.kind === "frog") { c.vx = sign(c.x - S.x) * 200; c.vy = -200; c.st = "idle"; c.t = 0; }
    else if (c.kind === "spider") { c.st = "climb"; c.t = 0; }
    return;
  }
  hitMonk(kx, cost);
}
function killCritter(c, kx) {
  c.st = "dead"; c.t = 0; c.vx = kx * 90; c.vy = -170; ev("a creature struck", { kind: c.kind });
  for (let q = 0; q < 6; q++) S.parts.push({ kind: "chip", x: c.x, y: c.y - 5, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.5, age: 0 });
}
// The birds, for the hook: as chains are (a point it can be taken by).
const birdsNear = () => (S.critters || []).filter((c) => c.st !== "dead" && c.grab && Math.abs(c.y - S.y) < 600 && (c.kind === "bird" || c.kind === "vulture")).map((c) => c.grab);
const BD_K = 2.6;                                            // the bird's size: about three quarters his height perched
const a0 = (c) => Math.atan2(c.vy, c.vx || 1e-6);
// A ledge for a bird: a floor near it (in its sight, with room above), not where it is now.
function perchNear(c) {
  for (let n = 0; n < 40; n++) {
    const x = c.x + (Math.random() - 0.5) * 760, y0 = c.y - 220 + Math.random() * 300; if (solidAt(x, y0)) continue;
    let y = y0; while (!solidAt(x, y + 1) && y - y0 < 400) y += 4; if (!solidAt(x, y + 1)) continue;
    if (solidAt(x - 12, y - 30) || solidAt(x + 12, y - 30) || !solidAt(x - 8, y + 3) || !solidAt(x + 8, y + 3)) continue;
    if (Math.abs(x - c.x) < 80 || !los(c.x, c.y - 10, x, y - 12)) continue;
    return [x, y - 0.5];
  }
  return null;
}
// A platform bird's back within a hop of him, the way he walks: where to land on it.
function backAhead(d) {
  for (const c of S.critters || []) {
    if (c.kind !== "vulture" || S.rideOn === c) continue;
    const top = c.y - PB_TOP * PB_K, a = c.x + c.dir * PB_U0 * PB_K, b = c.x + c.dir * PB_U1 * PB_K, near = d > 0 ? Math.min(a, b) : Math.max(a, b), gap = (near - S.x) * d;
    if (gap > -4 && gap < 5 * CELL + HW && top > S.y - 56 && top < S.y + 40) return { x: (a + b) / 2, top, c };
  }
  return null;
}

function stepCritters(dt) {
  stepHermits(dt);
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
      if (c.st === "leap" && touches(c)) { const w = !!S.ward; critterHits(c, c.dir * 120, 0.05); if (!w) { c.vx = -c.vx * 0.4; c.st = "idle"; c.t = 0; } }
    } else if (c.kind === "spider") {
      // (Its thread from the roof: down to his height, a while there, and up again.)
      if (c.st === "wait") { c.y = c.ay; if (Math.abs(S.x - c.x) < 50 && S.y > c.ay && S.y - c.ay < 340 && los(c.x, c.ay + 4, mx, my)) { c.st = "drop"; c.t = 0; Sound.fx.tick(1800, 0.15); } }
      else if (c.st === "drop") { const to = Math.min(S.y - 10, floorBelow(c.x, c.ay) - 2); c.y = Math.min(to, c.y + 420 * dt); if (c.y >= to - 1) { c.st = "hang"; c.t = 0; } }
      else if (c.st === "hang") { c.y += Math.sin(c.t * 3) * 6 * dt; if (c.t > 3) { c.st = "climb"; c.t = 0; } }
      else if (c.st === "climb") { c.y = Math.max(c.ay, c.y - 70 * dt); if (c.y <= c.ay + 0.5) { c.st = "wait"; c.t = 0; } }
      if (c.st !== "wait" && c.st !== "climb" && touches(c, -2) && !(S.invT > 0)) critterHits(c, sign(S.x - c.x) * 100, 0.05);
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
      c.ph += dt * (ride ? 4.6 : 2.6);
      // (Its back, for the hook: a line along it, as a chain is, that the rope can take.)
      { const ua = c.dir * PB_U0 * PB_K, ub = c.dir * PB_U1 * PB_K; c.grab = c.grab || { kind: "grab", owner: c, len: 1, ang: 0 };
        c.grab.x = c.x + Math.min(ua, ub); c.grab.y = c.y - PB_TOP * PB_K; c.grab.len = Math.abs(ub - ua); c.grab.ang = PI / 2; }
      // Hooked by its back: he hauls himself up the rope, and steps on to it.
      if (S.rope && S.rope.chain === c.grab) {
        const R = S.rope; R.x = c.grab.x + c.grab.len / 2; R.y = c.grab.y; R.along = 1; R.len = Math.max(ROPE_MIN * 0.5, R.len - 320 * dt);
        { const dx = R.x - S.x, dy = R.y - S.y, l = Math.hypot(dx, dy) || 1; S.vx = (dx / l) * 300; S.vy = (dy / l) * 300; S.ground = false; S.liftT = 0.15; }
        if (dist(S.x, S.y, R.x, R.y) < 44) { dropRope(true); S.x = R.x; S.y = R.y; S.vy = 0; S.vx = 0; S.rideOn = c; S.boardOn = c; S.boardT = 0.25; S.flip = null; S.hoverT = 0; ev("pulled up on to a platform bird"); }
      }
      // (Carried: he goes where it goes.)
      if (ride) { S.x += c.x - x0; S.y += c.y - y0; }
      continue;
    } else if (c.kind === "bird") {
      // From ledge to ledge: it perches a while, then flies to another; startled when he comes
      // close, it goes at once. Taken by the hook, it flies off with him (he hangs from the rope
      // under it), and at last, ten to fifteen seconds on, it shakes him off.
      const held = S.rope && c.grab && S.rope.chain === c.grab, B = BD_K;
      if (held) {
        // (Taken: at once it bolts, up and away from him.)
        if (c.st !== "carry") { c.st = "carry"; c.t = 0; c.carryT = 10 + Math.random() * 5; c.to = null; const aw = sign(c.x - S.x) || c.dir; c.head = [aw * 0.8, -0.6]; c.vx = aw * 140; c.vy = -170; ev("a bird taken by the hook"); Sound.fx.tick(2200, 0.4); }
        // (Labouring with his weight: a heading kept a while, then changed; mostly level or up; away from the rock.)
        if (!c.head || (c.t > 1.5 && Math.random() < dt * 0.6)) { const a = (Math.random() < 0.5 ? PI : 0) + (Math.random() - 0.5) * 1.2 - (Math.random() < 0.6 ? 0.35 * sign(Math.cos(a0(c))) : 0); c.head = [Math.cos(a), Math.min(0.3, Math.sin(a)) - 0.15]; }
        c.vx += (c.head[0] * 150 - c.vx) * dt * 1.5; c.vy += (c.head[1] * 150 - c.vy) * dt * 1.5;
        if (c.t > c.carryT) { dropRope(true); c.st = "fly"; c.t = 0; c.to = null; ev("the bird let him go"); }
      } else if (c.st === "carry") { c.st = "fly"; c.t = 0; c.to = null; }
      if (!held) {
        if (c.st === "perch") {
          c.vx = 0; c.vy = 0;
          if (c.t > c.rest || (seen && d < 90)) { c.st = "fly"; c.t = 0; c.to = null; c.vy = -120; }
        } else {
          // Flying to a ledge (found once): there, it lands and perches.
          if (!c.to) c.to = perchNear(c) || [c.x + (Math.random() - 0.5) * 300, c.y - 60];
          const dx = c.to[0] - c.x, dy = c.to[1] - c.y, l = Math.hypot(dx, dy) || 1, sp = Math.min(170, 60 + l);
          c.vx += ((dx / l) * sp - c.vx) * dt * 2.2; c.vy += ((dy / l) * sp - 30 * Math.sin(c.t * 2) - c.vy) * dt * 2.2;
          if (l < 10) { c.st = "perch"; c.t = 0; c.rest = 2 + Math.random() * 4; c.x = c.to[0]; c.y = c.to[1]; c.vx = 0; c.vy = 0; }
          if (c.t > 6) { c.to = null; c.t = 0; }
        }
      }
      if (c.st !== "perch") { const [hx, hy] = moveBox(c, c.vx * dt, c.vy * dt, K.hw * B * 0.5, K.ht * B * 0.5); if (hx) { c.vx = -c.vx * 0.5; c.to = null; if (c.head) c.head[0] = -c.head[0]; } if (hy) { c.vy = -c.vy * 0.5; if (c.head) c.head[1] = -Math.abs(c.head[1]); } }
      if (Math.abs(c.vx) > 8) c.dir = sign(c.vx);
      c.ph += dt * (c.st === "carry" ? 22 : 12);
      // (For the hook: a line across its body, as a chain is.)
      c.grab = c.grab || { kind: "grab", owner: c, len: 1, ang: PI / 2 }; c.grab.x = c.x - 14 * B * 0.5; c.grab.y = c.y - 8 * B * 0.5; c.grab.len = 14 * B;
      if (held) {
        // (It takes up the rope, and lifts him off his feet: he hangs and swings under it.)
        const R = S.rope; R.x = c.x; R.y = c.y - 4; R.along = 1; R.len = Math.max(ROPE_MIN + 20, Math.min(R.len, 150) - 60 * dt);
        // (While it has him, his feet touching the ground do not make him let go.)
        S.liftT = 0.3; if (S.ground) { S.ground = false; S.vy = Math.min(S.vy, -160); }
      }
    }
  }
  S.critters = S.critters.filter((c) => c.a > 0.02);
}
// The floor under a point (for a spider's thread: no lower than the floor).
function floorBelow(x, y) { for (let d = 0; d < 900; d += 4) if (solidAt(x, y + d)) return y + d; return y + 900; }

function drawCritters(cam) {
  for (const h of S.hermits || []) drawHermit(h, cam);
  for (const c of S.critters || []) {
    const x = c.x - cam.x, y = c.y - cam.y; if (x < -60 || x > W + 60 || y < -60 || y > H + 400) continue;
    ctx.globalAlpha = c.a; const ink = "#0a090b";
    if (c.kind === "frog" || c.kind === "spider") {
      const k = c.kind === "frog" ? (c.st === "dead" ? "fg4" : c.st === "crouch" ? "fg1" : c.st === "leap" ? (c.vy < 0 ? "fg2" : "fg3") : "fg0")
        : c.st === "dead" ? "sp5" : c.st === "wait" ? "sp2" : c.st === "drop" ? "sp4" : "sp3";
      if (c.kind === "spider" && c.st !== "dead") line(x, c.ay - cam.y - 2, x, y - 14, "rgba(30,28,32,0.8)", 1);
      const P = new Path2D(), T = put(c.x, c.y, c.dir, cam);
      addShape(P, TRACED[k], c.kind === "spider" && c.st === "wait" ? (u, v) => T(u, -v + 16) : T);
      litDraw([[P, ink, "evenodd"]], c.x, c.y - CRITTERS[c.kind].ht / 2, c.a);
    } else if (c.kind === "mouse") {
      const s = c.dir, run = Math.abs(c.vx) > 40, b = run ? Math.sin(c.ph * 6) * 1.2 : 0, P = new Path2D();
      P.ellipse(x, y - 3.5 + b * 0.3, 6, 3.4, 0, 0, TAU); P.moveTo(x + s * 9, y - 4); P.ellipse(x + s * 6, y - 4, 3, 2.3, s * 0.3, 0, TAU); P.moveTo(x + s * 6.2, y - 6.6); P.arc(x + s * 4.6, y - 6.6, 1.6, 0, TAU);
      litDraw([[P, ink]], c.x, c.y - 4, c.a);
      line(x - s * 6, y - 3, x - s * 13, y - 4 + Math.sin(c.ph * 3) * 2, ink, 1);
      line(x - 3 + b, y - 1, x - 3 - b, y + 0.3, ink, 1.2); line(x + 3 - b, y - 1, x + 3 + b, y + 0.3, ink, 1.2);
    } else if (c.kind === "vulture") {
      // (Its body traced; its wings jointed, beating smoothly: slow and deep, faster and harder carrying him.)
      const T = put(c.x, c.y, c.dir, cam), TK = (u, v) => T(u * PB_K, v * PB_K), beat = Math.sin(c.ph), a = 0.15 + 0.62 * beat - (S.rideOn === c ? 0.12 : 0);
      const far = new Path2D(); addPoly(far, pbWing(a + 0.18, true), TK);
      const P = new Path2D(), rid = S.rideOn === c; addShape(P, rid ? TRACED.pbR : TRACED.pbB, rid ? (u, v) => TK(u - 4.3, v - 2.6) : TK);
      const near = new Path2D(); addPoly(near, pbWing(a, false), TK);
      litDraw([[far, "#151318"], [P, ink, "evenodd"], [near, ink]], c.x, c.y - 18, c.a);
    } else if (c.kind === "bird") {
      // (Its body traced, without wings: gliding; landing, its feet out; perched; on the hook; dead.
      // Its wings jointed, as the platform bird's: beating in flight, braking as it lands, thrashing
      // on the hook. Perched, its own folded wing is in the drawing.)
      const near = c.to && c.st === "fly" && dist(c.x, c.y, c.to[0], c.to[1]) < 50, perch = c.st === "perch", dead = c.st === "dead", carry = c.st === "carry";
      const k = dead ? "bbD" : perch ? (c.t > c.rest - 0.6 ? "bbS" : "bbP") : near ? "bbL" : carry ? (Math.floor(c.t * 4) % 3 === 0 ? "bbL" : "bbG") : "bbG", hh = shapeH(k);
      const T = put(c.x, perch ? c.y : c.y + hh / 2 - 6, c.dir, cam), list = [];
      const wings = !perch && !dead, beat = Math.sin(c.ph), a = near ? 1.05 + 0.15 * beat : carry ? 0.2 + 0.85 * beat : 0.1 + 0.7 * beat;
      const sh = k === "bbG" ? BB_SH : [2, 20];
      const far = new Path2D(), nearW = new Path2D(), P = new Path2D();
      if (wings) addPoly(far, wingShape(a + 0.2, true, sh, 13, 19), T);
      addShape(P, TRACED[k], T);
      if (wings) addPoly(nearW, wingShape(a, false, sh, 15, 22), T);
      if (wings) list.push([far, "#151318"]); list.push([P, ink, "evenodd"]); if (wings) list.push([nearW, ink]);
      litDraw(list, c.x, c.y - 10, c.a);
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
  const cellX = (i) => (sec.x0 + i + 0.5) * CELL, cellY = (r) => -(sec.h1 - r - 1) * CELL - 0.01;   // (the bottom of cell row r: the floor under it)
  const air = (i, r) => i >= 0 && r >= 0 && i < R.w && r < R.h && !R.g[r][i];
  const free = (i, r) => !taken.some(([a, b]) => Math.abs(a - i) < 10 && Math.abs(b - r) < 6) && Math.hypot(i - start[0], r - start[1]) > 22;
  // A spot in a room: on a floor (air over rock, room to stand), or under a roof (air under rock,
  // a fall beneath it), or in the open air.
  function spot(S0, kind) {
    for (let n = 0; n < 60; n++) {
      const i = S0.ox + 8 + Math.floor(rnd() * (RW - 16)), r = S0.oy + 4 + Math.floor(rnd() * (RH - 8));
      if (!air(i, r) || !free(i, r)) continue;
      if (kind === "floor") { let q = r; while (air(i, q + 1) && q < S0.oy + RH - 1) q++; if (air(i, q + 1) || !air(i, q - 3) || !air(i - 2, q) || !air(i + 2, q) || air(i - 2, q + 1) || air(i + 2, q + 1)) continue; taken.push([i, q]); return [cellX(i), cellY(q)]; }
      if (kind === "roof") { let q = r; while (air(i, q - 1) && q > S0.oy) q--; if (air(i, q - 1)) continue; let f = q; while (air(i, f + 1) && f - q < 30) f++; if (f - q < 10) continue; taken.push([i, q]); return [cellX(i), cellY(q) - CELL]; }
      if (kind === "open") { let ok = true; for (let a = -4; a <= 4 && ok; a++) for (let b = -3; b <= 3 && ok; b++) if (!air(i + a, r + b)) ok = false; if (!ok) continue; taken.push([i, r]); return [cellX(i), cellY(r)]; }
    }
    return null;
  }
  // (Room for a platform bird with its rider, its base in cell (i, r): three cells either side of it,
  // six above it, for him on its back, and one below.)
  const roomy = (i, r) => { for (let a = -3; a <= 3; a++) for (let b = -6; b <= 1; b++) if (!air(i + a, r + b)) return false; return true; };
  function birdPath(S0) {
    const x0 = S0.ox + 4, x1 = S0.ox + RW - 5, y0 = S0.oy + 7, y1 = S0.oy + RH - 3;
    if (S0.kind === "shaft") {
      const i = S0.ox + RW / 2; let best = null;
      for (const di of [0, -4, 4, -8, 8]) { let a = Math.round(S0.oy + RH * 0.45); if (!roomy(i + di, a)) continue; let b = a; while (a > y0 && roomy(i + di, a - 1)) a--; while (b < y1 && roomy(i + di, b + 1)) b++; if (b - a >= 10 && (!best || b - a > best[3] - best[1])) best = [i + di, b, i + di, a]; }
      return best;
    }
    if (S0.kind === "platforms") {
      // Two stones near level, a gap between them: from beside the one to beside the other, its back
      // level with their tops.
      const tops = [];
      for (let r = y0; r <= y1; r++) for (let i = x0; i <= x1; i++) { if (!(air(i, r) && !air(i, r + 1))) continue; let j = i; while (j + 1 <= x1 && air(j + 1, r) && !air(j + 1, r + 1)) j++; if (j - i >= 2 && j - i <= 16) tops.push([i, j, r]); i = j; }
      const pairs = [];
      for (const A of tops) for (const B of tops) {
        const gap = B[0] - A[1]; if (gap < 9 || gap > 34 || Math.abs(A[2] - B[2]) > 2) continue;
        const r = Math.max(A[2], B[2]) + 2, ia = A[1] + 4, ib = B[0] - 4; let ok = ib - ia >= 1;
        for (let i = ia; i <= ib && ok; i++) ok = roomy(i, r);
        if (ok) pairs.push([ia, r, ib, r]);
      }
      return pairs.length ? pairs[Math.floor(rnd() * pairs.length)] : null;
    }
    // Over a pit: the row with the longest run of room, near the middle of the room's height.
    let best = null;
    for (let r = Math.round(S0.oy + RH * 0.3); r <= Math.round(S0.oy + RH * 0.6); r++) {
      const mid = S0.ox + RW / 2; if (!roomy(mid, r)) continue; let a = mid, b = mid; while (a > x0 && roomy(a - 1, r)) a--; while (b < x1 && roomy(b + 1, r)) b++;
      if (b - a >= 16 && (!best || b - a > best[2] - best[0])) best = [a, r, b, r];
    }
    return best;
  }
  // The gates: in each gallery at a stretch's head, the lay brother, his cart and donkey on its
  // longest floor (he takes the blocks brought from the idols, and his blessing fills the torch).
  S.gates = []; S.hermits = [];
  for (const S0 of R.slots) if (S0.kind === "cell") {
    const E = R.marks.E.find(([i, r]) => i >= S0.ox && i < S0.ox + RW && r >= S0.oy && r < S0.oy + RH); if (!E) continue;
    let q = E[1]; while (air(E[0], q + 1)) q++; taken.push([E[0], q]);
    S.hermits.push({ x: cellX(E[0]), y: cellY(q), dir: 1, ph: rnd() * TAU, st: "pray", t: 0, said: Math.floor(rnd() * SAYINGS.length), met: false, sold: false });
  }
  for (const S0 of R.slots) if (S0.gate) {
    let best = null;
    for (let r = S0.oy + 2; r < S0.oy + RH - 1; r++) for (let i = S0.ox + 2; i < S0.ox + RW - 2; i++) {
      if (!(air(i, r) && !air(i, r + 1) && air(i, r - 3))) continue; let j = i; while (j + 1 < S0.ox + RW - 2 && air(j + 1, r) && !air(j + 1, r + 1) && air(j + 1, r - 3)) j++;
      if (!best || j - i > best.n) best = { i, r, n: j - i }; i = j;
    }
    // (On a shorter floor, they stand a little closer together.)
    if (best && best.n >= 9) { const base = cellX(best.i) - CELL / 2, y = cellY(best.r), q = Math.min(1, best.n / 15); S.gates.push({ sec: 0, dir: 1, y, x: base + 4.5 * CELL * q, cart: base + 8.5 * CELL * q, donkey: base + 12.5 * CELL * q, bin: [], cheer: -9 }); taken.push([best.i + 6, best.r], [best.i + 12, best.r]); }
  }
  // The great demons: one in a large room on the ways in each of the three stretches above the
  // first gate, each a tier stronger (the summit's own above them all). Only a block can hurt one.
  for (let st = 1; st <= 3; st++) {
    const big = R.slots.filter((q) => q.onWay && q.stretch === st && !q.gate && (q.kind === "hall" || q.kind === "gap" || q.kind === "platforms"));
    const S0 = big[Math.floor(rnd() * big.length)]; if (!S0) continue;
    const G = GREAT[dom] || GREAT.gluttony, tier = st, sc = 1 + 0.2 * (tier - 1), hw = G.hw * sc, ht = G.ht * sc, p = spot(S0, "floor");
    const at = p && dFree(p[0], p[1] - 30, hw, ht); if (!at) continue;
    S.bigs.push({ sin: dom, tier, sc, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir: rnd() < 0.5 ? -1 : 1, hp: tier + 2, maxHp: tier + 2, st: "stone", t: 0, wake: 0, lit: 0, anim: rnd() * 9,
      stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: 0, id: ++S.ids, growlT: -9, stoneT: -9 });
  }
  for (const S0 of R.slots) {
    // (Each time the mountain has been climbed before, more of them: a third more a time, to twice as many.)
    const more = 1 + Math.min(3, (NOV && NOV.climbs) || 0) / 3;
    const up = 1 - S0.oy / R.h, quiet = S0.kind === "shrine" || S0.kind === "crawl", n = (base) => Math.floor(base + rnd() * (base + 1));
    if (S0.kind === "shrine") { const I = R.marks.I.find(([i, r]) => i >= S0.ox && i < S0.ox + RW && r >= S0.oy && r < S0.oy + RH); if (I) { let q = I[1]; while (air(I[0], q + 1)) q++; placeShrine(0, dom, [[cellX(I[0]), cellY(q), cellX(I[0]) - 90, cellX(I[0]) + 90]], []); } }
    if (S0.onWay && !quiet && !S0.gate && !S0.mouth) for (let q = 0; q < n((0.25 + 0.6 * up) * more); q++) { const p = spot(S0, "floor"); if (p) spawnDemon(dom, p[0], p[1], p[0] - 110, p[0] + 110, 0); }
    if (!quiet) for (let q = 0; q < n((0.6 + 1.2 * up) * more); q++) {
      const kind = pickKind("harmful", rnd), p = kind && spot(S0, CRITTERS[kind].roof ? "roof" : "floor");
      if (p) spawnCritter(kind, p[0], p[1]);
    }
    // The platform birds: to and fro over a pit, up and down a shaft, or across from one hanging
    // stone to the next; always with room over its back for him to stand, under any roof.
    const pb = S0.onWay && (S0.kind === "gap" || (S0.kind === "shaft" && rnd() < 0.4) || (S0.kind === "platforms" && rnd() < 0.6)) && pickKind("platform", rnd);
    const P = pb && birdPath(S0);
    if (P) { const c = spawnCritter(pb, cellX(P[0]), cellY(P[1])); if (c) { c.beat = { ax: cellX(P[0]), ay: cellY(P[1]), bx: cellX(P[2]), by: cellY(P[3]) }; c.x = c.beat.ax; c.y = c.beat.ay; } }
    for (let q = 0; q < n(1.2); q++) {
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

// A traced shape's height (its highest point above its feet), kept once worked out.
const SHAPE_H = {};
function shapeH(k) { if (SHAPE_H[k] === undefined) { let m = 0; for (const L of TRACED[k]) for (let i = 1; i < L.length; i += 2) m = Math.max(m, L[i]); SHAPE_H[k] = m; } return SHAPE_H[k]; }

// A creature drawn as the monk is: each shape laid a pixel toward his torch in its warm light, and
// the dark laid over it, so only the edges that face the flame are lit; fading as it is farther
// from his light. list: [[path, colour, fill rule], ...]; (wx, wy): its middle, in the world.
function litDraw(list, wx, wy, alpha) {
  let dx = S.torch[0] - wx, dy = S.torch[1] - wy; const dl = Math.hypot(dx, dy) || 1, lit = clamp(1 - dl / (lightR() * 1.1), 0, 1); dx /= dl; dy /= dl;
  const a0 = alpha === undefined ? 1 : alpha;
  if (lit > 0) for (const [k, col, al] of [[1.3, MONK_RIM2, 0.3], [0.65, MONK_RIM, 1]]) for (const [p, , rule] of list) { ctx.save(); ctx.translate(dx * k, dy * k); ctx.globalAlpha = a0 * al * lit; ctx.fillStyle = col; ctx.fill(p, rule || "nonzero"); ctx.restore(); }
  ctx.globalAlpha = a0; for (const [p, col, rule] of list) { ctx.fillStyle = col; ctx.fill(p, rule || "nonzero"); }
}

// A bird (or platform bird) under a tap.
function birdAt(wx, wy) {
  for (const c of S.critters || []) { if ((c.kind !== "bird" && c.kind !== "vulture") || c.st === "dead" || !c.grab) continue; const g = c.grab; if (wx > g.x - 10 && wx < g.x + g.len + 10 && Math.abs(wy - g.y) < 22) return c; }
  return null;
}

// ---- Cracked walls ------------------------------------------------------------------------------
// The way to a hidden room, walled up again: the rock there cracked, seen only in his light. Struck
// five or six times (a tap on it, near it), it breaks, and the way is open. (Later, a pickaxe: one blow.)
const crackBox = (sec, c) => [(sec.x0 + c.x0) * CELL, (c.y0 - sec.h1) * CELL, (sec.x0 + c.x1 + 1) * CELL, (c.y1 + 1 - sec.h1) * CELL];
function cracksIn(view) { const out = []; for (const sec of view || secs) if (sec.type === "room" && sec.R.cracks) for (const c of sec.R.cracks) if (c.hp > 0) out.push([sec, c]); return out; }
function crackAt(wx, wy) {
  for (const k of cracksIn()) { const [x0, y0, x1, y1] = crackBox(k[0], k[1]); if (wx > x0 - 14 && wx < x1 + 14 && wy > y0 - 14 && wy < y1 + 14) return k; }
  return null;
}
function strikeCrack(k) {
  if (S.act || (S.atk && !S.atk.hit) || !upFromCrawl()) return true;
  const [x0, y0, x1, y1] = crackBox(k[0], k[1]), side = S.x < (x0 + x1) / 2 ? -1 : 1, fx = side < 0 ? x0 : x1;
  if (Math.abs(S.x - fx) > 170 || S.y < y0 - 30 || S.y > y1 + 80) { Sound.fx.tick(420, 0.3); return true; }
  if (S.atk) S.atk = null;
  const sp = freeSpot(fx + side * (HW + 3), y1 - 0.01) || [S.x, S.y];
  startMove("punch", sp, { f: null, crack: k, dur: 0.34 }); S.dir = -side;
  return true;
}
function hitCrack(k) {
  const [sec, c] = k, [x0, y0, x1, y1] = crackBox(sec, c), fx = S.x < x0 ? x0 : x1;
  c.hp0 = c.hp0 || c.hp; c.hp--; c.hitT = S.rt; S.shake = Math.max(S.shake, c.hp > 0 ? 0.12 : 0.3);
  Sound.fx.punch(1, panX(fx)); Sound.fx.crack(panX(fx));
  for (let q = 0; q < (c.hp > 0 ? 6 : 26); q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: c.hp > 0 ? fx : lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 220, vy: -40 - Math.random() * 160, life: 0.7, age: 0 });
  if (S.pick) c.hp = 0;                     // (the hermit's pickaxe: one blow)
  if (c.hp > 0) { ev("struck a cracked wall", { left: c.hp }); return; }
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) sec.R.g[y][x] = false;
  MAP = null; ev("broke through a cracked wall");
  S.say = { text: "A HIDDEN WAY", sub: "The cracked rock gives way.", t: 0 };
}
// The cracks: down the face of it toward the way, more of them, and wider, the more it has been struck.
function drawCracks(cam, view, lr) {
  for (const [sec, c] of cracksIn(view)) {
    const [x0, y0, x1, y1] = crackBox(sec, c); if (y1 - cam.y < -20 || y0 - cam.y > H + 20) continue;
    const [tx, ty] = S.torch, near = clamp(1.3 - dist(tx, ty, clamp(tx, x0, x1), clamp(ty, y0, y1)) / Math.max(60, lr || 160), 0, 1); if (!near) continue;
    const dmg = 3 * (1 - c.hp / (c.hp0 || (c.hp0 = c.hp))), shake = c.hitT && S.rt - c.hitT < 0.15 ? (Math.random() - 0.5) * 2 : 0;
    ctx.save(); ctx.strokeStyle = "rgba(214,190,150," + near * (0.3 + 0.15 * dmg) + ")"; ctx.lineWidth = 0.7 + 0.3 * dmg; ctx.beginPath();
    // (Down the face toward the way, one crack the height of it, close in to the face; off it, branches into the
    // rock, more of them the more it has been struck.)
    for (const [fx, s] of c.from > 0 ? [[x1, -1]] : [[x0, 1]]) {
      const n = Math.max(4, Math.round((y1 - y0) / 14)), pts = [];
      for (let m = 0; m <= n; m++) pts.push([fx + s * (3 + hash2(c.x0 + s, m, 3) * 6) - cam.x + shake, lerp(y0 + 4, y1 - 2, m / n) - cam.y]);
      pts.forEach(([x, y], m) => (m ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let m = 1; m < n; m++) {
        if (hash2(c.y0 + s, m, 11) > 0.15 + 0.12 * dmg) continue;
        let [x, y] = pts[m]; ctx.moveTo(x, y);
        const dn = hash2(m, c.x0, 13) < 0.3 ? -1 : 1, L = 1 + dmg;
        for (let q = 0; q < L; q++) { x += s * (2 + hash2(m, q, 15) * 3); y += dn * (3 + hash2(q, m, 17) * 5); ctx.lineTo(x, y); }
      }
    }
    ctx.stroke(); ctx.restore();
  }
}

// ---- The hermit ---------------------------------------------------------------------------------
// In a cell behind a cracked wall, an old monk who left the world long ago: drawn as the monk is
// (the same jointed body), but scrawnier and bent, his habit of undyed wool, ragged at the hem and
// the sleeves. He kneels at prayer; as the monk comes near he gets up and turns to him, and speaks a
// saying of the desert fathers. He has a pickaxe, and asks for it a bowl of soup, or two herbs: with
// it, a cracked wall breaks at one blow. (Tap him to speak with him.)
const SAYINGS = [
  ["Go, sit in your cell, and your cell will teach you everything.", "ABBA MOSES"],
  ["If you will, you can become all flame.", "ABBA JOSEPH OF PANEPHYSIS"],
  ["I saw the snares of the enemy spread over all the world, and I said, What can get through them? And a voice said to me: Humility.", "ABBA ANTONY"],
  ["Do not give your heart to that which does not satisfy your heart.", "ABBA POEMEN"],
];
const HERMIT_ROBE = "#1f1810", HERMIT_RIM = "rgba(255,206,150,0.6)", HERMIT_K = 0.8;     // undyed wool; his torchlit edge; how much narrower than the monk
function stepHermits(dt) {
  for (const h of S.hermits || []) {
    h.t += dt; const d = Math.abs(S.x - h.x), dy = Math.abs(S.y - h.y);
    if (h.st === "pray" && d < 120 && dy < 50) { h.st = "rise"; h.t = 0; }
    else if (h.st !== "pray" && (d > 220 || dy > 120)) { h.st = "pray"; h.t = 0; }
    if (h.st !== "pray") h.dir = S.x < h.x ? -1 : 1;
    if (h.st === "rise" && h.t > 0.8) h.st = "stand";
    if (h.st === "stand" && !h.met) { h.met = true; hermitSays(h); ev("met the hermit"); }
  }
}
function hermitSays(h) { const [line, who] = SAYINGS[h.said % SAYINGS.length]; h.said++; S.say = { text: "THE HERMIT", sub: "“" + line + "”  " + who, t: 0 }; }
function hermitAt(wx, wy) { for (const h of S.hermits || []) if (dist(wx, wy, h.x, h.y - 22) < 28) return h; return null; }
function talkHermit(h) {
  if (Math.abs(S.x - h.x) > 120 || Math.abs(S.y - h.y) > 60) { Sound.fx.tick(420, 0.3); return; }
  if (h.sold || S.pick) { hermitSays(h); return; }
  const herbs = HERB_KEYS.filter((k) => (S.pouch[k] || 0) > 0).sort((a, b) => S.pouch[b] - S.pouch[a]), nh = HERB_KEYS.reduce((a, k) => a + (S.pouch[k] || 0), 0);
  let paid = null;
  if (S.flasks.length) { paid = "your soup"; S.flasks.shift(); }
  else if (nh >= 2) { paid = "two herbs"; for (let n = 0; n < 2; n++) { const k = HERB_KEYS.filter((q) => (S.pouch[q] || 0) > 0).sort((a, b) => S.pouch[b] - S.pouch[a])[0]; S.pouch[k]--; } }
  if (!paid) { S.say = { text: "THE HERMIT", sub: herbs.length ? "“A pickaxe, for a bowl of soup, or two herbs.” (You have one herb.)" : "“A pickaxe, for a bowl of soup, or two herbs.”", t: 0 }; Sound.fx.tick(600, 0.3); return; }
  S.pick = true; h.sold = true; Sound.fx.pickup(); ev("the hermit's pickaxe", { paid });
  S.say = { text: "A PICKAXE", sub: "From the hermit, for " + paid + ". A cracked wall breaks at one blow.", t: 0 };
}
function hermitPose(h, t) {
  const b = Math.sin(t * 1.3 + h.ph);
  const kneel = pose(Object.assign({}, W_KNEEL, { lean: 0.3, head: 0.35, sF: 1.0 + 0.04 * b, eF: 1.9, sB: 0.9 + 0.04 * b, eB: 1.9 }));
  const stand = pose({ lean: 0.32 + 0.02 * b, head: -0.05, sF: 0.35, eF: 0.9, sB: 0.15, eB: 0.7, hF: 0.12, kF: 0.25, hB: -0.08, kB: 0.3 });
  if (h.st === "pray") return kneel;
  if (h.st === "rise") { const k = ease(clamp(h.t / 0.8, 0, 1)), o = {}; for (const key in stand) o[key] = typeof stand[key] === "number" ? lerp(kneel[key] || 0, stand[key], k) : stand[key]; return o; }
  return stand;
}
function drawHermit(h, cam) {
  const x = h.x - cam.x, y = h.y - cam.y; if (x < -40 || x > W + 40 || y < -60 || y > H + 30) return;
  const p = hermitPose(h, S.rt), o = { t: S.rt, vx: 0, vy: 0, noTorch: true, drape: 3.5 };
  const [tx, ty] = S.torch, lit = clamp(1.25 - dist(tx, ty, h.x, h.y - 22) / Math.max(80, lightR()), 0, 1);
  ctx.save(); ctx.translate(x, 0); ctx.scale(HERMIT_K, 1); ctx.translate(-x, 0);
  const P = worshipPath(x, y, h.dir, p, o);
  // His rags: tatters hanging from the hem, between his shins, and from the ends of his sleeves.
  const J = (n) => monkJoint(x, y, h.dir, p, n), kF = J("kF"), kB = J("kB"), fF = J("fF"), fB = J("fB"), a = [lerp(kF[0], fF[0], 0.5), lerp(kF[1], fF[1], 0.5)], b2 = [lerp(kB[0], fB[0], 0.5), lerp(kB[1], fB[1], 0.5)];
  for (let n = 0; n <= 6; n++) {
    const u = n / 6, hx = lerp(a[0], b2[0], u) + (u - 0.5) * 6, hy = lerp(a[1], b2[1], u), L = 3 + hash2(n, 3, 7) * 5, sw = Math.sin(S.rt * 2 + n) * 0.8;
    P.moveTo(hx - 1.8, hy - 2); P.lineTo(hx + 1.8, hy - 2); P.lineTo(hx + sw + 0.4, hy + L); P.closePath();
  }
  for (const n of ["hF", "hB"]) { const [hx, hy] = J(n); for (let q = 0; q < 3; q++) { const L = 3 + hash2(q, n.length, 9) * 4; P.moveTo(hx - 2.5 + q * 1.6, hy - 2); P.lineTo(hx - 1 + q * 1.6, hy - 2); P.lineTo(hx - 1.6 + q * 1.6, hy + L); P.closePath(); } }
  if (lit > 0) { const dx = tx - h.x, dy = ty - (h.y - 22), l = Math.hypot(dx, dy) || 1; ctx.save(); ctx.translate(dx / l * 1.2 / HERMIT_K, dy / l * 1.2); ctx.globalAlpha = lit; ctx.fillStyle = HERMIT_RIM; ctx.fill(P); ctx.restore(); }
  ctx.fillStyle = HERMIT_ROBE; ctx.fill(P);
  ctx.restore();
  // Near him, and before the trade: what he asks.
  if (h.st === "stand" && !h.sold && !S.pick && lit > 0.2) text("TAP HIM: A PICKAXE, FOR SOUP OR TWO HERBS", x, y - 62, { align: "center", size: 7, weight: 800, spacing: 1.5, color: "rgba(255,220,180," + (0.5 + 0.4 * lit) + ")" });
}
