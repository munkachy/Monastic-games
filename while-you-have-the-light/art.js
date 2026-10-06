"use strict";
// While You Have the Light: the art. Everything is drawn here in code, as in Limbo: the figures
// are black shapes cut out against a pale mist, flat and sharp-edged after Another World, and the
// only colours are the torch flame and the seven sins. The monk is always rimmed by his own torch.
// The figures are jointed, as in Fear Not, and move after Prince of Persia (1989): a crouch
// before every jump, weight in every step, the hang from a ledge and the pull-up with legs kicking.

// ---- The figures ----------------------------------------------------------------------------------
// A pose is a set of angles in radians. 0 hangs straight down from the joint; a positive angle
// swings toward the way the figure faces. Knees bend back, elbows forward. `lean` tips the body,
// `head` tips the head (negative lifts the chin), `spin` turns the whole figure about the hips
// (flips and rolls), `lift` raises it off its feet (in world pixels), and `air` (0..1) holds the
// hips at standing height whatever the legs do, for a figure in flight. `tq` is the angle of the
// torch in the monk's far hand, measured from his forearm. Wings: `wa` is the angle of the wing
// from the shoulder (screen radians, facing right: -PI/2 is straight up), `wl` how far it is
// opened. `jaw` (0..1) opens a mouth.
const POSE0 = { lean: 0.04, head: 0, sF: 0.15, eF: 0.35, sB: -0.15, eB: 0.4, hF: 0.12, kF: 0.08, hB: -0.12, kB: 0.12, spin: 0, lift: 0, air: 0, tq: 0.45, wa: -1.75, wl: 0.1, jaw: 0 };
const pose = (o) => Object.assign({}, POSE0, o);
// Blend two poses (every field) by k.
function blendPose(a, b, k) { const o = {}; for (const key in POSE0) { const x = a[key] === undefined ? POSE0[key] : a[key], y = b[key] === undefined ? POSE0[key] : b[key]; o[key] = x + (y - x) * k; } return o; }
// A pose from keyframes [[u, pose], ...] at u in 0..1, eased between them. A key may carry a third
// item, the easing into it: "in" (gathering speed: a blow landing), "out" (slowing: a follow
// through), "lin", or by default smooth at both ends.
const EASE = { in: (k) => k * k * k, out: (k) => 1 - Math.pow(1 - k, 3), lin: (k) => k, step: (k) => (k < 1 ? 0 : 1) };
function keyPose(keys, u) {
  let i = 0; while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const [u0, a] = keys[i], [u1, b, e] = keys[i + 1], k = clamp((u - u0) / Math.max(0.0001, u1 - u0), 0, 1);
  return blendPose(a, b, e ? EASE[e](k) : smooth(k));
}
// A smooth closed curve through values spaced evenly round a cycle (for walks and wingbeats).
function loop(vals, u) {
  const n = vals.length; u = ((u % 1) + 1) % 1; const f = u * n, i = Math.floor(f), k = f - i;
  const p0 = vals[(i - 1 + n) % n], p1 = vals[i], p2 = vals[(i + 1) % n], p3 = vals[(i + 2) % n];
  return 0.5 * (2 * p1 + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k * k + (-p0 + 3 * p1 - 3 * p2 + p3) * k * k * k);
}

// Where every joint is, for a body and a pose, with the feet at (0, 0) and the figure facing right.
// The hips sit as high as the lower foot lets them, or at standing height in the air; a body that
// floats (Sloth) hangs at its own height above the point under its hem.
function solve(B, p) {
  const leg = (h, k) => { const kx = Math.sin(h) * B.thigh, ky = Math.cos(h) * B.thigh, a2 = h - k; return [kx, ky, kx + Math.sin(a2) * B.shin, ky + Math.cos(a2) * B.shin]; };
  const lf = leg(p.hF, p.kF), lb = leg(p.hB, p.kB);
  const ground = B.hover !== undefined ? B.hover : lerp(Math.max(lf[3], lb[3], B.min || 3), B.thigh + B.shin, clamp(p.air, 0, 1));
  const hx = 0, hy = -ground - p.lift;
  const J = { hip: [hx, hy], kF: [hx + lf[0], hy + lf[1]], fF: [hx + lf[2], hy + lf[3]], kB: [hx + lb[0], hy + lb[1]], fB: [hx + lb[2], hy + lb[3]] };
  const ux = Math.sin(p.lean), uy = -Math.cos(p.lean);
  J.up = [ux, uy]; J.n = [-uy, ux];                       // up the body, and forward square to it
  J.neck = [hx + ux * B.torso, hy + uy * B.torso];
  J.sh = [hx + ux * (B.torso - B.shd), hy + uy * (B.torso - B.shd)];
  const arm = (s, e) => { const ex = J.sh[0] + Math.sin(s) * B.upper, ey = J.sh[1] + Math.cos(s) * B.upper, a2 = s + e; return [[ex, ey], [ex + Math.sin(a2) * B.fore, ey + Math.cos(a2) * B.fore]]; };
  [J.eF, J.hF] = arm(p.sF, p.eF); [J.eB, J.hB] = arm(p.sB, p.eB);
  J.ha = p.lean + p.head;
  J.head = [J.neck[0] + Math.sin(J.ha) * (B.neck + B.head), J.neck[1] - Math.cos(J.ha) * (B.neck + B.head)];
  return J;
}
// A figure-space point to the world: turned with the spin about the hips, flipped to face dir.
function figToWorld(J, p, x, y, dir, pt) {
  let px = pt[0], py = pt[1];
  if (p.spin) { const c = Math.cos(p.spin), s = Math.sin(p.spin), dx = px - J.hip[0], dy = py - J.hip[1]; px = J.hip[0] + dx * c - dy * s; py = J.hip[1] + dx * s + dy * c; }
  return [x + px * dir, y + py];
}
// Two-bone reach: the shoulder and elbow angles that put a hand on a point (for the climb's grip).
function reach(B, sh, T) {
  const dx = T[0] - sh[0], dy = T[1] - sh[1], l1 = B.upper, l2 = B.fore;
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.001), th = Math.atan2(dx, dy);
  const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), be = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  return [th - al, PI - be];
}

// ---- Flat shapes ----------------------------------------------------------------------------------
// Every figure is a list of flat polygons. Each is turned the same way round before it goes into
// the path, so that a whole figure fills as one shape in one go, however its pieces overlap.
const P2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const PA = (a, v, k) => [a[0] + v[0] * k, a[1] + v[1] * k];
function addPts(c, pts) {
  const n = pts.length; let a = 0;
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  if (a >= 0) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]); }
  else { c.moveTo(pts[n - 1][0], pts[n - 1][1]); for (let i = n - 2; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1]); }
  c.closePath();
}
// A limb: a quad from a to b, wa wide at a and wb at b (half widths).
function seg(a, b, wa, wb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  return [[a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb], [b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]];
}
// A small six-sided knot: a joint, a fist.
function gem(c, r) { const h = r * 0.87; return [[c[0] + r, c[1]], [c[0] + r * 0.5, c[1] + h], [c[0] - r * 0.5, c[1] + h], [c[0] - r, c[1]], [c[0] - r * 0.5, c[1] - h], [c[0] + r * 0.5, c[1] - h]]; }
// A point in a head's own frame (x forward along the face, y down) to figure space.
function HL(J, x, y) { const c = Math.cos(J.ha), s = Math.sin(J.ha); return [J.head[0] + x * c - y * s, J.head[1] + x * s + y * c]; }
function HLs(J, arr) { const out = []; for (let i = 0; i < arr.length; i += 2) out.push(HL(J, arr[i], arr[i + 1])); return out; }
// The way loose cloth falls in a figure's own frame: down with the world, and streaming back
// against its motion. Returns [gravity, wind, speed].
function clothWind(p, dir, vx, vy, t, gust) {
  const sp = p.spin || 0, cs = Math.cos(sp), sn = Math.sin(sp), lvx = (vx || 0) * dir, wy = vy || 0;
  const fvx = lvx * cs + wy * sn, fvy = -lvx * sn + wy * cs;
  let sx = -fvx / 230, sy = -fvy / 230; const sm = Math.hypot(sx, sy); if (sm > 1.4) { sx *= 1.4 / sm; sy *= 1.4 / sm; }
  const v = Math.min(1.4, sm), f1 = Math.sin(t * 8.3) * (0.06 + 0.2 * v) * (gust || 1), f2 = Math.sin(t * 6.1 + 1.3) * (0.05 + 0.14 * v) * (gust || 1);
  return [[sn, cs], [sn + sx + f1, cs + sy + f2], v];
}

// ---- The monk -------------------------------------------------------------------------------------
// A Benedictine in his black habit with the choir cowl over it: the long robe to the ankles, very
// wide sleeves, the deep hood up with its point falling behind, the face lost in the hood. He is
// 48 pixels tall to the top of the hood, so the shape has to say "monk" by its outline alone: the
// hood's point, the hanging sleeves, the hem. The proportions are Fear Not's monk, scaled down.
const MONK_H = 48;
const MONK_BODY = { thigh: 11.6, shin: 11.6, torso: 15.2, shd: 1.8, upper: 9.4, fore: 9.2, neck: 1.4, head: 3.6, min: 3 };
const MONK_INK = "#060607", MONK_RIM = "#ffb347", MONK_RIM2 = "#e8803a";
const TORCH_UP = 16, TORCH_DOWN = 3;                       // the shaft above and below his fist
function torchTip(J, p) { const a = p.sB + p.eB + p.tq; return [J.hB[0] + Math.sin(a) * TORCH_UP, J.hB[1] + Math.cos(a) * TORCH_UP]; }
// A wide cowl sleeve on an arm: the upper arm, then the sleeve from the elbow to a wide mouth at
// the wrist, its lower corner hanging with the cloth's fall.
function sleeve(out, S, E, Hd, wind, drape) {
  out.push(seg(S, E, 2.8, 2.5));
  const dx = Hd[0] - E[0], dy = Hd[1] - E[1], l = Math.hypot(dx, dy) || 1, ax = dx / l, ay = dy / l;
  let px = -ay, py = ax;
  if (px * (wind[0] - 0.35) + py * wind[1] < 0) { px = -px; py = -py; }    // p: the side that hangs
  const C = [E[0] + dx * 0.8, E[1] + dy * 0.8];
  const lo = [C[0] + px * 3.9, C[1] + py * 3.9], hi = [C[0] - px * 2.3, C[1] - py * 2.3];
  const D = [lo[0] + wind[0] * drape, lo[1] + wind[1] * drape];
  out.push([[E[0] - px * 2.5, E[1] - py * 2.5], hi, lo, D, [E[0] + px * 2.7 + wind[0] * drape * 0.3, E[1] + py * 2.7 + wind[1] * drape * 0.3]]);
  out.push(gem([Hd[0] + ax * 0.4, Hd[1] + ay * 0.4], 1.45));
}
// A foot at the end of a shin, pointing the way the foot would.
function footShape(K, F, len) {
  const dx = F[0] - K[0], dy = F[1] - K[1], l = Math.hypot(dx, dy) || 1, ax = dx / l, ay = dy / l, fx = ay, fy = -ax;
  return [[F[0] - fx * 1.2 - ax * 1.1, F[1] - fy * 1.2 - ay * 1.1], [F[0] + fx * 1.3 - ax * 1.4, F[1] + fy * 1.3 - ay * 1.4], [F[0] + fx * len + ax * 0.5, F[1] + fy * len + ay * 0.5], [F[0] - fx * 1.4 + ax * 0.7, F[1] - fy * 1.4 + ay * 0.7]];
}
// All of him as two lists of polygons: the body (A) and the near arm (B), which is drawn over the
// body with its own rim of light so that a punch reads even in front of the black robe.
function monkGeo(J, p, o, dir) {
  const n = J.n, t = o.t || 0, A = [], Bn = [];
  const [g, wind, v] = clothWind(p, dir, o.vx, o.vy, t);
  const st = [wind[0] - g[0], wind[1] - g[1]], hx = -g[1], hy = g[0];   // the stream alone; across the fall
  const low = Math.max(J.fF[1], J.fB[1]) - 0.6;
  // The habit falls from each knee by its own weight, to just above the ankle: over a standing
  // leg it covers the shin; from a kicking leg it hangs like a curtain and the leg comes out bare.
  const drop = 9.4 * (1 - 0.3 * Math.min(1, v)), hemPt = (K) => { const q = [K[0] + g[0] * drop + st[0] * 3.2, K[1] + g[1] * drop + st[1] * 3.2]; if (!p.spin && q[1] > low) q[1] = low; return q; };
  const QF = hemPt(J.kF), QB = hemPt(J.kB), hw = 5.6 + 0.8 * v;
  for (const [K, F, Q] of [[J.kB, J.fB, QB], [J.kF, J.fF, QF]]) {
    A.push(seg(K, F, 1.35, 1.1)); A.push(footShape(K, F, 3.6));
    A.push(seg(J.hip, K, 5.0, 4.7));
    const tx = K[0] - J.hip[0], ty = K[1] - J.hip[1], tl = Math.hypot(tx, ty) || 1; let sx = -ty / tl, sy = tx / tl, ax = hx, ay = hy;
    if (sx * ax + sy * ay < 0) { ax = -ax; ay = -ay; }
    A.push([[K[0] + sx * 4.7, K[1] + sy * 4.7], [Q[0] + ax * hw, Q[1] + ay * hw], [Q[0] - ax * hw, Q[1] - ay * hw], [K[0] - sx * 4.7, K[1] - sy * 4.7]]);
  }
  // The cloth between the legs, sagging with its weight and blown with his motion.
  const mid = P2(QF, QB, 0.5);
  A.push([J.hip, J.kF, QF, [mid[0] + g[0] * 1.2 + st[0] * 3, mid[1] + g[1] * 1.2 + st[1] * 3], QB, J.kB]);
  // The body under the cowl, and the cowl's back falling from the shoulders behind him.
  const waist = P2(J.hip, J.sh, 0.45), sb = PA(J.sh, n, -4.3);
  A.push([sb, PA(J.neck, n, -2.4), PA(J.neck, n, 2.3), PA(J.sh, n, 4.0), PA(waist, n, 4.4), PA(J.hip, n, 4.7), PA(J.hip, n, -4.8), PA(waist, n, -4.8)]);
  A.push([sb, [sb[0] + g[0] * 17 + st[0] * 6, sb[1] + g[1] * 17 + st[1] * 6], PA(J.hip, n, -4.6)]);
  // The far arm, holding the torch: a short shaft with a pitch-soaked head (the caller lays the flame on it).
  sleeve(A, PA(J.sh, n, -0.8), J.eB, J.hB, wind, 9.5);
  const ta = p.sB + p.eB + p.tq, tvx = Math.sin(ta), tvy = Math.cos(ta);
  const tip = [J.hB[0] + tvx * TORCH_UP, J.hB[1] + tvy * TORCH_UP];
  A.push(seg([J.hB[0] - tvx * TORCH_DOWN, J.hB[1] - tvy * TORCH_DOWN], tip, 0.75, 0.95));
  A.push(seg([tip[0] - tvx * 3.4, tip[1] - tvy * 3.4], tip, 1.45, 1.65));
  // The hood: deep, its brow standing out over the hidden face, its point falling down his back,
  // and the cowl's collar joining it to the shoulders.
  A.push(HLs(J, [2.9, 4.4, 2.2, 1.1, 4.5, -1.1, 4.3, -2.3, 2.4, -4.0, -0.6, -4.5, -3.2, -3.6, -4.7, -1.2, -4.8, 2.2, -3.8, 4.9]));
  const b1 = HL(J, -0.8, -4.5), b2 = HL(J, -4.4, 3.4), bm = P2(b1, b2, 0.35);
  const px = wind[0] * 1.3 - 0.8, py = wind[1], hl = Math.hypot(px, py) || 1;
  A.push([b1, HL(J, -4.6, -2.6), [bm[0] + px / hl * 9.5, bm[1] + py / hl * 9.5], b2]);
  A.push([HL(J, -3.8, 4.9), PA(J.sh, n, -4.4), PA(J.sh, n, 3.8), HL(J, 2.9, 4.4)]);
  // The near arm, free for blows and for catching.
  sleeve(Bn, PA(J.sh, n, 0.6), J.eF, J.hF, wind, 9.5);
  return { A, B: Bn, tip };
}
// Draw the monk: feet at (x, y), facing dir, in pose p. o = { t, vx, vy, alpha, ghost }.
// Returns the world points of the torch's tip (where the flame stands) and of his free hand.
function drawMonk(x, y, dir, p, o) {
  o = o || {}; dir = dir < 0 ? -1 : 1;
  const J = solve(MONK_BODY, p), G = monkGeo(J, p, o, dir);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (p.spin) { ctx.translate(J.hip[0], J.hip[1]); ctx.rotate(p.spin); ctx.translate(-J.hip[0], -J.hip[1]); }
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.ghost) {
    // The after-image of a zip: one flat dark shape.
    const P = new Path2D(); for (const q of G.A) addPts(P, q); for (const q of G.B) addPts(P, q);
    ctx.globalAlpha *= 0.45; ctx.fillStyle = "#16161a"; ctx.fill(P);
  } else {
    const PAth = new Path2D(), PB = new Path2D();
    for (const q of G.A) addPts(PAth, q); for (const q of G.B) addPts(PB, q);
    // The rim of torchlight: the whole shape laid a pixel toward the torch in warm light, then
    // the black laid over it, so only the edges that face the flame stay lit.
    const cx = (J.hip[0] + J.neck[0]) / 2, cy = (J.hip[1] + J.neck[1]) / 2;
    let dx = G.tip[0] - cx, dy = G.tip[1] - cy; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * 0.3; ctx.fillStyle = MONK_RIM2;
    ctx.translate(dx * 1.3, dy * 1.3); ctx.fill(PAth); ctx.fill(PB);
    ctx.globalAlpha = pa; ctx.fillStyle = MONK_RIM;
    ctx.translate(-dx * 0.62, -dy * 0.62); ctx.fill(PAth); ctx.fill(PB);
    ctx.translate(-dx * 0.68, -dy * 0.68); ctx.fillStyle = MONK_INK; ctx.fill(PAth);
    ctx.translate(dx * 0.55, dy * 0.55); ctx.fillStyle = MONK_RIM; ctx.globalAlpha = pa * 0.38; ctx.fill(PB);
    ctx.translate(-dx * 0.55, -dy * 0.55); ctx.globalAlpha = pa; ctx.fillStyle = MONK_INK; ctx.fill(PB);
    // The faintest warm edge of a cheek in the hood, when the flame is before his face.
    if (G.tip[0] > J.head[0] + 1) {
      ctx.beginPath(); addPts(ctx, HLs(J, [2.2, -0.3, 3.0, 0.5, 2.7, 2.9, 1.9, 1.3]));
      ctx.globalAlpha = pa * 0.55; ctx.fillStyle = MONK_RIM2; ctx.fill(); ctx.globalAlpha = pa;
    }
  }
  ctx.restore();
  return { torch: figToWorld(J, p, x, y, dir, G.tip), hand: figToWorld(J, p, x, y, dir, J.hF) };
}
// Where a joint of the monk is in the world: torch (the flame's base), hF, hB, fF, fB, kF, kB,
// eF, eB, hip, neck, sh, head.
function monkJoint(x, y, dir, p, name) {
  const J = solve(MONK_BODY, p);
  return figToWorld(J, p, x, y, dir < 0 ? -1 : 1, name === "torch" ? torchTip(J, p) : (J[name] || J.hip));
}

// ---- The monk's moves -------------------------------------------------------------------------------
// His standing pose: the torch held up at the shoulder, lighting his way; the free hand at rest.
const STAND_O = { lean: 0.05, head: 0.08, sF: 0.12, eF: 0.3, sB: 0.3, eB: 2.3, tq: 0.45, hF: 0.07, kF: 0.06, hB: -0.07, kB: 0.1 };
const S_ = (o) => pose(Object.assign({}, STAND_O, o));
const STAND = S_({});
// The gathering crouch before every spring, and the deep crouch that takes a landing.
const CROUCH = S_({ lean: 0.42, head: -0.18, sF: -0.4, eF: 0.5, sB: -0.05, eB: 2.1, tq: 0.5, hF: 0.95, kF: 1.75, hB: 0.25, kB: 1.45 });
const LANDP = S_({ lean: 0.58, head: 0.12, sF: 0.75, eF: 0.4, sB: 0.85, eB: 1.5, tq: 0.65, hF: 1.3, kF: 2.3, hB: 0.5, kB: 2.25 });
const TUCK = S_({ air: 1, lean: 0.55, head: 0.45, sF: 1.3, eF: 1.7, sB: 1.0, eB: 2.0, tq: 0.3, hF: 2.2, kF: 2.6, hB: 2.0, kB: 2.5 });
const HANGP = S_({ lean: 0.06, head: -0.14, sF: 3.03, eF: 0.06, sB: -1.25, eB: 0.5, tq: -2.1, hF: 0.06, kF: 0.18, hB: -0.04, kB: 0.34 });
const DOWNP = S_({ lean: -1.5, head: 0.35, sF: -1.7, eF: 0.4, sB: 2.5, eB: 0.6, tq: 0.2, hF: 1.42, kF: 0.25, hB: 1.25, kB: 0.75 });
const KNEEL = S_({ lean: 0.18, head: 0.55, sF: 0.6, eF: 2.3, sB: 0.95, eB: 1.35, tq: 0.5, hF: 1.45, kF: 1.45, hB: -0.15, kB: 1.75 });
const BLOCKP = S_({ lean: 0.12, head: 0.28, sF: 1.25, eF: 2.0, sB: 1.05, eB: 1.55, tq: 1.28, hF: 0.42, kF: 0.6, hB: -0.35, kB: 0.45 });
const CARRYP = S_({ sF: 0.85, eF: 1.35 });
// The heavy walk of the dark (thigh and knee through the stride, the near leg; the far leg is
// half a stride behind), and the long light strides of the quick speed.
const WALK_H = [0.42, 0.33, 0.12, -0.14, -0.36, -0.34, -0.02, 0.3], WALK_K = [0.08, 0.44, 0.24, 0.12, 0.3, 0.95, 1.0, 0.42];
const RUN_H = [0.55, 0.25, -0.15, -0.5, -0.68, -0.15, 0.55, 0.85], RUN_K = [0.15, 0.45, 0.35, 0.15, 0.35, 1.7, 1.9, 0.9];
// The climb: where his feet go while his hand keeps hold of the edge (see monkClimb below).
const MONK_EDGE = 7;
let MONK_HANG = [0, -60];
function climbRootUp(u) {
  // In the edge's own frame (the edge at 0, 0, the wall below it, facing right): the anchor.
  const hx = -MONK_HANG[0], hy = -MONK_HANG[1];
  if (u < 0.55) return [hx, hy];
  const k = clamp((u - 0.55) / 0.3, 0, 1);
  return [lerp(hx, MONK_EDGE, smooth(clamp((k - 0.3) / 0.7, 0, 1))), lerp(hy, 0, smooth(k))];
}
function climbRootDown(u) {
  const hx = -MONK_HANG[0], hy = -MONK_HANG[1];
  if (u < 0.15) return [MONK_EDGE, 0];
  if (u < 0.5) { const k = (u - 0.15) / 0.35; return [lerp(MONK_EDGE, hx, smooth(clamp(k / 0.7, 0, 1))), lerp(0, hy, smooth(k))]; }
  return [hx, hy];
}
// The free hand's grip on the edge, whatever the body is doing.
function gripEdge(p, root, gx) {
  const J = solve(MONK_BODY, p), [sF, eF] = reach(MONK_BODY, J.sh, [gx - root[0], -root[1]]);
  p.sF = sF; p.eF = eF; return p;
}
// A roll: lift the turning body until its lowest point (less the cloth's thickness) touches the
// ground, so it rolls along it like a wheel instead of sinking into it.
function groundRoll(p, pad) {
  const J = solve(MONK_BODY, p), c = Math.cos(p.spin), s = Math.sin(p.spin);
  let low = -1e9;
  for (const q of [J.head, J.neck, J.sh, J.kF, J.kB, J.fF, J.fB, J.hF, J.hB, J.eF, J.eB]) { const y = J.hip[1] + (q[0] - J.hip[0]) * s + (q[1] - J.hip[1]) * c; if (y > low) low = y; }
  p.lift += Math.max(0, low + pad); return p;
}
// Each move: cyclic ones take u as a phase in [0, 1); one-shots take u from 0 to 1. t is time.
const MONK_ANIM = {
  idle: (u, t) => { const b = Math.sin(TAU * u); return S_({ lean: 0.05 + 0.015 * b, head: 0.08 + 0.03 * Math.sin(TAU * u + 1), sF: 0.12 + 0.03 * b, eF: 0.3 + 0.03 * b, sB: 0.3 + 0.03 * b, eB: 2.3 - 0.04 * b, tq: 0.45 + 0.04 * Math.sin((t || 0) * 1.3) }); },
  // The dark speed: careful, heavy, a slow deliberate stride, the torch held forward and up.
  walk: (u) => {
    const hF = loop(WALK_H, u), kF = loop(WALK_K, u), hB = loop(WALK_H, u + 0.5), kB = loop(WALK_K, u + 0.5), bob = Math.cos(TAU * 2 * u);
    return S_({ lean: 0.14 + 0.025 * bob, head: 0.06, hF, kF, hB, kB, sF: 0.3 - 0.55 * hF, eF: 0.45, sB: 0.95 + 0.04 * bob, eB: 1.45, tq: 0.55 });
  },
  // The quick speed: light and long, the torch streaming back.
  run: (u) => {
    const hF = loop(RUN_H, u), kF = loop(RUN_K, u), hB = loop(RUN_H, u + 0.5), kB = loop(RUN_K, u + 0.5);
    return S_({ lean: 0.24 + 0.03 * Math.cos(TAU * 2 * u), head: -0.1, air: 0.55, lift: 1.4 * Math.cos(TAU * 2 * u - 1.2), hF, kF, hB, kB, sF: 0.3 - 1.0 * hF, eF: 1.7, sB: -1.75 + 0.1 * Math.sin(TAU * u), eB: 0.4, tq: -1.2 });
  },
  fall: (u) => { const s = Math.sin(TAU * u); return S_({ air: 1, lean: -0.08, head: -0.25, sF: 2.55 + 0.15 * s, eF: 0.45, sB: 2.25 + 0.1 * Math.sin(TAU * u + 1), eB: 0.55, tq: 0.25, hF: 0.55 + 0.2 * s, kF: 1.0, hB: -0.15 - 0.15 * s, kB: 0.6 }); },
  // Hanging from a ledge by the free hand, the torch held out to the side. The gripping hand
  // keeps still against his feet through the whole cycle (MONK_HANG).
  hang: (u) => { const s = Math.sin(TAU * u); return Object.assign(pose(HANGP), { sB: -1.25 + 0.07 * s, eB: 0.5 + 0.05 * s, head: -0.14 + 0.04 * Math.sin(TAU * u + 1), tq: -2.1 + 0.05 * s }); },
  block: (u) => { const s = Math.sin(TAU * u); return Object.assign(pose(BLOCKP), { lean: 0.12 + 0.01 * s, sB: 1.05 + 0.02 * s }); },
  carry: (u, t) => { const b = Math.sin(TAU * u); return S_({ lean: 0.05 + 0.015 * b, sF: 0.85 + 0.03 * b, eF: 1.35, sB: 0.3 + 0.03 * b, eB: 2.3 - 0.04 * b, tq: 0.45 + 0.04 * Math.sin((t || 0) * 1.3) }); },

  // Prince-style turn on the spot: at the half he faces us square, so the flip of dir does not show.
  turn: (u) => keyPose([[0, STAND], [0.22, S_({ lean: -0.04, head: 0.0, sF: 0.05, eF: 0.15, sB: 0.12, eB: 2.75, tq: 0.25, hF: -0.05, kF: 0.35, hB: 0.12, kB: 0.1 })], [0.5, S_({ lean: 0, head: 0, sF: 0, eF: 0, sB: 0, eB: PI, tq: 0, hF: 0.06, kF: 0.12, hB: -0.06, kB: 0.12 })], [0.78, S_({ lean: 0.08, head: 0.1, sF: 0.1, eF: 0.4, sB: 0.2, eB: 2.5, tq: 0.4, hF: 0.18, kF: 0.3, hB: -0.12, kB: 0.15 })], [1, STAND]], u),
  stepUp: (u) => keyPose([[0, STAND], [0.25, S_({ lean: 0.3, head: -0.1, sF: -0.2, eF: 0.4, hF: 0.6, kF: 1.1, hB: -0.05, kB: 0.6 })], [0.55, S_({ air: 0.7, lean: 0.25, head: -0.05, sF: 0.6, eF: 0.6, sB: 0.6, eB: 1.9, hF: 1.25, kF: 1.7, hB: -0.45, kB: 0.5 })], [0.8, S_({ lean: 0.22, sF: 0.3, hF: 0.45, kF: 0.9, hB: -0.25, kB: 0.7 })], [1, STAND]], u),
  stepDown: (u) => keyPose([[0, STAND], [0.25, S_({ air: 0.4, lean: 0.12, sF: 0.5, eF: 0.4, hF: 0.6, kF: 0.15, hB: -0.1, kB: 0.4 })], [0.6, S_({ air: 0.8, lean: 0.05, head: 0.15, sF: 0.9, eF: 0.4, sB: 0.6, eB: 1.9, hF: 0.35, kF: 0.25, hB: -0.3, kB: 0.9 })], [0.8, S_({ lean: 0.4, head: 0.1, sF: 0.5, hF: 0.9, kF: 1.6, hB: 0.2, kB: 1.4 })], [1, STAND]], u),
  // The ledge climb: crouch; spring up, arms reaching; hang by the free hand, legs dangling; pull
  // up, the chest over the edge, a knee up onto the ledge and the legs kicking; stand. The free
  // hand is set on the edge by reach while he holds it, along the path monkClimb gives his feet.
  climbUp: (u) => {
    const kick = Math.sin(u * 46);
    const p = keyPose([[0, STAND],
      [0.12, S_({ lean: 0.38, head: -0.6, sF: -0.55, eF: 0.4, sB: -0.5, eB: 1.6, tq: 1.6, hF: 0.9, kF: 1.7, hB: 0.25, kB: 1.45 })],
      [0.18, S_({ lean: 0.42, head: -0.65, sF: -0.7, eF: 0.4, sB: -0.6, eB: 1.6, tq: 1.6, hF: 1.0, kF: 1.95, hB: 0.3, kB: 1.65 })],
      [0.3, S_({ air: 0.6, lean: 0.02, head: -0.45, sF: 2.9, eF: 0.1, sB: -1.6, eB: 0.6, tq: -1.9, hF: 0.15, kF: 0.25, hB: -0.15, kB: 0.5 }), "out"],
      [0.38, pose(HANGP)],
      [0.47, Object.assign(pose(HANGP), { hF: 0.18, kF: 0.35, hB: -0.12, kB: 0.25, sB: -1.15 })],
      [0.55, pose(HANGP)],
      [0.64, S_({ lean: 0.3, head: -0.25, sB: -1.3, eB: 0.7, tq: -2.0, hF: 0.4, kF: 0.9, hB: -0.15, kB: 0.5 })],
      [0.73, S_({ lean: 0.85, head: -0.15, sB: -1.1, eB: 1.2, tq: -2.2, hF: 1.75, kF: 2.45, hB: -0.15 + 0.12 * kick, kB: 0.8 + 0.25 * kick })],
      [0.8, S_({ lean: 0.75, head: 0.0, sB: -0.4, eB: 1.6, tq: -1.4, hF: 1.5, kF: 2.4, hB: 0.6 + 0.15 * kick, kB: 2.0 })],
      [0.85, S_({ lean: 0.55, head: 0.05, sB: 0.4, eB: 1.8, tq: 0.0, hF: 1.35, kF: 2.3, hB: 0.3, kB: 2.1 })],
      [1, STAND]], u);
    if (u > 0.3 && u < 0.85) {
      const k = clamp((u - 0.3) / 0.08, 0, 1) * clamp((0.85 - u) / 0.04, 0, 1);
      const g = gripEdge(pose(p), climbRootUp(u), lerp(0, 3, clamp((u - 0.62) / 0.2, 0, 1)));
      p.sF = lerp(p.sF, g.sF, k); p.eF = lerp(p.eF, g.eF, k);
    }
    return p;
  },
  // The way down, drawn facing the wall (dir faces back over the ledge): crouch at the edge,
  // lower himself over, hang, drop, land.
  climbDown: (u) => {
    const p = keyPose([[0, S_({ lean: 0, head: 0, sF: 0, eF: 0, sB: 0, eB: PI, tq: 0, hF: 0.06, kF: 0.12, hB: -0.06, kB: 0.12 })],
      [0.15, S_({ lean: 0.6, head: 0.3, sB: 0.3, eB: 1.9, tq: 0.3, hF: 1.35, kF: 2.4, hB: 0.55, kB: 2.3 })],
      [0.28, S_({ lean: 0.85, head: 0.1, sB: -0.6, eB: 1.4, tq: -1.6, hF: 0.9, kF: 2.0, hB: -0.6, kB: 0.6 })],
      [0.4, S_({ lean: 0.45, head: -0.2, sB: -1.3, eB: 0.7, tq: -2.0, hF: 0.4, kF: 0.9, hB: -0.15, kB: 0.5 })],
      [0.5, pose(HANGP)], [0.65, pose(HANGP)],
      [0.72, S_({ air: 1, lean: -0.05, head: -0.3, sF: 2.7, eF: 0.3, sB: 2.3, eB: 0.5, tq: 0.3, hF: 0.15, kF: 0.25, hB: -0.1, kB: 0.4 })],
      [0.9, S_({ air: 1, lean: 0.05, head: -0.1, sF: 2.2, eF: 0.4, sB: 2.0, eB: 0.6, tq: 0.4, hF: 0.35, kF: 0.5, hB: -0.1, kB: 0.6 })],
      [0.94, LANDP, "out"], [1, CROUCH]], u);
    if (u > 0.12 && u < 0.66) {
      const k = clamp((u - 0.12) / 0.06, 0, 1) * clamp((0.66 - u) / 0.02, 0, 1);
      const g = gripEdge(pose(p), climbRootDown(u), lerp(3, 0, clamp((u - 0.15) / 0.25, 0, 1)));
      p.sF = lerp(p.sF, g.sF, k); p.eF = lerp(p.eF, g.eF, k);
    }
    return p;
  },
  // A jump across a gap or up or down: crouch, the legs split wide in the air, the landing crouch.
  leap: (u) => keyPose([[0, STAND], [0.2, CROUCH], [0.3, S_({ air: 1, lean: 0.3, head: -0.1, sF: 1.5, eF: 0.4, sB: -0.7, eB: 1.0, tq: -1.6, hF: 1.15, kF: 0.9, hB: -0.6, kB: 0.4 }), "out"], [0.55, S_({ air: 1, lean: 0.2, head: -0.05, sF: 1.7, eF: 0.5, sB: -0.9, eB: 1.1, tq: -1.5, hF: 1.25, kF: 0.35, hB: -0.75, kB: 1.1 })], [0.8, S_({ air: 1, lean: 0.1, head: 0.05, sF: 1.3, eF: 0.4, sB: 0.2, eB: 1.8, tq: 0.3, hF: 0.75, kF: 0.4, hB: -0.2, kB: 0.6 })], [0.88, LANDP, "out"], [1, STAND]], u),
  land: (u) => keyPose([[0, LANDP], [0.3, LANDP], [0.65, S_({ lean: 0.28, sF: 0.4, hF: 0.6, kF: 1.0, hB: 0.1, kB: 0.9 })], [1, STAND]], u),
  // The quick flip through the air to any point he can see in the light: a tucked front somersault.
  zip: (u) => {
    const p = keyPose([[0, STAND], [0.1, CROUCH], [0.2, Object.assign(pose(TUCK), { air: 1 })], [0.8, TUCK], [0.9, S_({ air: 1, lean: 0.2, sF: 1.6, eF: 0.4, sB: 1.2, eB: 1.5, hF: 0.7, kF: 0.6, hB: -0.1, kB: 0.5 })], [0.95, LANDP, "out"], [1, STAND]], u);
    p.spin = TAU * smooth(clamp((u - 0.12) / 0.74, 0, 1));
    return p;
  },
  // The roll along the ground, tucked tight, the torch held clear.
  dodge: (u) => {
    const ball = S_({ air: 0, lean: 1.25, head: 0.6, sF: 1.0, eF: 2.0, sB: 1.3, eB: 1.8, tq: 0.4, hF: 2.2, kF: 2.6, hB: 2.0, kB: 2.5 });
    const p = keyPose([[0, STAND], [0.12, CROUCH], [0.2, ball], [0.8, ball], [0.9, LANDP], [1, STAND]], u);
    const r = clamp((u - 0.12) / 0.72, 0, 1); p.spin = TAU * smooth(r);
    // The torch is held up clear of the ground all the way round: its arm turns against the roll.
    const k = Math.sin(PI * r); p.sB = lerp(p.sB, 2.7 - p.spin, k); p.eB = lerp(p.eB, 0.25, k); p.tq = lerp(p.tq, 0.15, k);
    p.lift = 0; return groundRoll(p, 3.2);
  },
  // Flying side kick: crouch, rise with the knee drawn up, the leg shot out at 0.6.
  jumpKick: (u) => keyPose([[0, STAND], [0.15, CROUCH], [0.38, S_({ air: 1, lean: -0.1, head: 0.05, sF: 1.3, eF: 1.6, sB: -1.0, eB: 1.0, tq: -1.0, hF: 1.95, kF: 2.45, hB: -0.25, kB: 1.3 }), "out"], [0.6, S_({ air: 1, lean: -0.5, head: 0.25, sF: -0.9, eF: 0.4, sB: -1.7, eB: 0.8, tq: -1.2, hF: 1.68, kF: 0.0, hB: 0.25, kB: 2.1 }), "in"], [0.72, S_({ air: 1, lean: -0.3, head: 0.15, sF: -0.4, eF: 0.8, sB: -1.2, eB: 1.0, tq: -1.0, hF: 1.6, kF: 0.15, hB: 0.2, kB: 1.9 })], [0.84, S_({ air: 1, lean: 0.1, sF: 0.6, eF: 0.6, sB: 0.4, eB: 1.8, hF: 0.9, kF: 0.9, hB: -0.1, kB: 0.6 })], [0.92, LANDP, "out"], [1, STAND]], u),
  // The "Superman": flat out through the air, both fists before him, the torch in one of them.
  superman: (u) => {
    const fly = S_({ air: 1, lean: 0, head: -0.3, sF: 3.1, eF: 0, sB: 2.98, eB: 0.05, tq: 0, hF: -0.04, kF: 0.05, hB: 0.06, kB: 0.2 });
    const p = keyPose([[0, STAND], [0.12, S_({ lean: 0.6, head: -0.3, sF: -0.9, eF: 0.3, sB: -0.95, eB: 0.4, tq: -1.2, hF: 1.0, kF: 1.85, hB: 0.3, kB: 1.6 })], [0.3, fly, "out"], [0.62, fly], [0.78, Object.assign(pose(TUCK), { air: 1 })], [0.9, S_({ air: 1, lean: 0.15, sF: 1.4, sB: 1.0, eB: 1.6, hF: 0.6, kF: 0.6, hB: -0.1, kB: 0.5 })], [0.95, LANDP, "out"], [1, STAND]], u);
    p.spin = (PI / 2) * (smooth(clamp((u - 0.13) / 0.15, 0, 1)) - smooth(clamp((u - 0.64) / 0.2, 0, 1)));
    return p;
  },
  // The torch swept in a great arc over his head and down onto the demon.
  torchSwing: (u) => keyPose([[0, STAND], [0.35, S_({ lean: -0.25, head: -0.1, sF: 1.2, eF: 0.8, sB: 3.9, eB: 0.5, tq: 0.2, hF: 0.35, kF: 0.2, hB: -0.35, kB: 0.7 })], [0.45, S_({ lean: 0.45, head: 0.15, sF: -0.7, eF: 0.6, sB: 1.35, eB: 0.1, tq: 0.15, hF: 0.75, kF: 0.9, hB: -0.55, kB: 0.1 }), "in"], [0.62, S_({ lean: 0.55, head: 0.2, sF: -0.6, eF: 0.6, sB: 0.45, eB: 0.2, tq: 0.2, hF: 0.75, kF: 0.95, hB: -0.55, kB: 0.15 }), "out"], [1, STAND]], u),
  palm: (u) => keyPose([[0, STAND], [0.22, S_({ lean: -0.1, head: 0.05, sF: -0.3, eF: 2.0, sB: -0.2, eB: 2.1, tq: 0.6, hF: 0.2, kF: 0.4, hB: -0.3, kB: 0.6 })], [0.4, S_({ lean: 0.3, head: 0.1, sF: 1.55, eF: 0.0, sB: 1.42, eB: 0.12, tq: 1.26, hF: 0.85, kF: 0.8, hB: -0.6, kB: 0.05 }), "in"], [0.62, S_({ lean: 0.32, head: 0.1, sF: 1.5, eF: 0.1, sB: 1.38, eB: 0.2, tq: 1.2, hF: 0.85, kF: 0.8, hB: -0.6, kB: 0.08 })], [1, STAND]], u),
  // The spinning back kick: twist away, then the heel driven out, the body laid back from it.
  spinKick: (u) => keyPose([[0, STAND], [0.28, S_({ lean: 0.3, head: 0.35, sF: -0.6, eF: 1.4, sB: 0.9, eB: 1.8, tq: 0.3, hF: 1.15, kF: 2.25, hB: -0.05, kB: 0.5 })], [0.42, S_({ lean: 0.05, head: 0.4, sF: -1.0, eF: 0.9, sB: 0.1, eB: 1.6, tq: -0.6, hF: 1.4, kF: 2.4, hB: -0.1, kB: 0.4 })], [0.55, S_({ lean: -0.85, head: 0.35, sF: -1.6, eF: 0.4, sB: -0.5, eB: 1.4, tq: -1.5, hF: 1.62, kF: 0.0, hB: -0.15, kB: 0.25 }), "in"], [0.72, S_({ lean: -0.3, head: 0.25, sF: -1.0, eF: 0.8, sB: 0.0, eB: 1.8, tq: -0.6, hF: 1.0, kF: 1.9, hB: -0.1, kB: 0.35 })], [1, STAND]], u),
  // The low sweep: down onto the haunch, a hand to the ground, the leg swept out along it.
  sweep: (u) => keyPose([[0, STAND], [0.2, S_({ lean: 0.65, head: -0.15, sF: 0.9, eF: 0.1, sB: 1.8, eB: 1.2, tq: 0.3, hF: 1.0, kF: 2.2, hB: 0.9, kB: 2.5 })], [0.45, S_({ lean: 0.75, head: -0.3, sF: 0.3, eF: 0.1, sB: 2.1, eB: 1.0, tq: 0.2, hF: 1.5, kF: 0.0, hB: 1.05, kB: 2.6 }), "in"], [0.7, S_({ lean: 0.7, head: -0.25, sF: 0.35, eF: 0.15, sB: 2.0, eB: 1.1, tq: 0.25, hF: 1.35, kF: 0.4, hB: 1.0, kB: 2.5 })], [1, STAND]], u),
  // A leap up into a knee, both hands pulling the demon's head down onto it.
  risingKnee: (u) => keyPose([[0, STAND], [0.15, CROUCH], [0.55, S_({ air: 1, lift: 4, lean: 0.0, head: -0.25, sF: 2.25, eF: 1.0, sB: 1.9, eB: 1.2, tq: 0.3, hF: 2.15, kF: 2.5, hB: -0.3, kB: 0.5 }), "out"], [0.75, S_({ air: 1, lift: 2, lean: 0.1, head: 0.0, sF: 1.6, eF: 0.6, sB: 1.2, eB: 1.6, hF: 1.0, kF: 1.0, hB: -0.2, kB: 0.6 })], [0.9, LANDP, "in"], [1, STAND]], u),
  // A rising torch blow that throws the demon up; he rises with it.
  launch: (u) => keyPose([[0, STAND], [0.2, S_({ lean: 0.45, head: -0.1, sF: 0.3, eF: 0.8, sB: -0.9, eB: 0.4, tq: 0.4, hF: 0.9, kF: 1.6, hB: 0.2, kB: 1.3 })], [0.4, S_({ air: 0.7, lift: 8, lean: -0.2, head: -0.4, sF: -0.6, eF: 0.5, sB: 2.75, eB: 0.1, tq: 0.2, hF: 1.3, kF: 1.6, hB: -0.2, kB: 0.3 }), "in"], [0.58, S_({ air: 1, lift: 12, lean: -0.15, head: -0.35, sF: -0.4, eF: 0.6, sB: 2.95, eB: 0.1, tq: 0.1, hF: 1.0, kF: 1.4, hB: -0.15, kB: 0.6 }), "out"], [0.85, S_({ air: 0.6, lift: 2, lean: 0.1, sF: 0.6, sB: 1.0, eB: 1.8, hF: 0.6, kF: 0.6, hB: -0.1, kB: 0.6 })], [0.92, LANDP, "out"], [1, STAND]], u),
  // Both hands overhead and down: a smash that drives the demon into the ground.
  slam: (u) => keyPose([[0, STAND], [0.3, S_({ air: 0.5, lift: 4, lean: -0.25, head: -0.2, sF: 2.95, eF: 0.3, sB: 3.05, eB: 0.3, tq: 0.1, hF: 0.6, kF: 1.0, hB: -0.1, kB: 0.6 })], [0.5, S_({ lean: 0.75, head: 0.3, sF: 1.0, eF: 0.05, sB: 0.95, eB: 0.1, tq: 0.0, hF: 1.0, kF: 1.5, hB: -0.3, kB: 1.1 }), "in"], [0.7, S_({ lean: 0.72, head: 0.3, sF: 0.95, eF: 0.1, sB: 0.9, eB: 0.15, tq: 0.05, hF: 1.0, kF: 1.5, hB: -0.3, kB: 1.1 })], [1, STAND]], u),
  // A dive down onto a demon below: a hop, the stamping leg straight down, the arms flung up.
  diveStomp: (u) => keyPose([[0, STAND], [0.12, CROUCH], [0.2, S_({ air: 0.7, lift: 3, lean: 0.1, head: 0.1, sF: 1.8, eF: 0.4, sB: 1.6, eB: 1.2, hF: 0.9, kF: 1.4, hB: 0.2, kB: 1.2 }), "out"], [0.45, S_({ air: 1, lean: 0.2, head: 0.35, sF: 2.6, eF: 0.3, sB: 2.45, eB: 0.5, tq: 0.3, hF: 0.15, kF: 0.0, hB: -0.6, kB: 1.8 })], [0.7, S_({ air: 1, lean: 0.25, head: 0.4, sF: 2.4, eF: 0.4, sB: 2.3, eB: 0.6, tq: 0.3, hF: 0.1, kF: 0.0, hB: -0.6, kB: 1.9 })], [0.8, LANDP, "out"], [1, STAND]], u),
  // A dash through, striking in passing, and the long skid after.
  dash: (u) => keyPose([[0, STAND], [0.1, S_({ lean: 0.6, head: -0.1, sF: -0.6, eF: 0.6, sB: -0.4, eB: 1.0, tq: -0.4, hF: 0.6, kF: 1.1, hB: -0.2, kB: 0.9 })], [0.35, S_({ air: 0.4, lean: 0.85, head: -0.25, sF: -1.3, eF: 0.3, sB: 1.75, eB: 0.0, tq: 0.3, hF: 1.15, kF: 0.6, hB: -0.85, kB: 0.4 }), "in"], [0.6, S_({ air: 0.3, lean: 0.8, head: -0.25, sF: -1.2, eF: 0.4, sB: 1.6, eB: 0.1, tq: 0.4, hF: 1.0, kF: 0.6, hB: -0.8, kB: 0.5 })], [0.8, S_({ lean: -0.25, head: 0.1, sF: 1.2, eF: 0.5, sB: -1.0, eB: 1.4, tq: -1.4, hF: 0.9, kF: 0.05, hB: -0.15, kB: 1.4 })], [1, STAND]], u),
  // A kick in mid-air, to keep a launched demon up.
  airKick: (u) => keyPose([[0, S_({ air: 1, lean: 0.1, sF: 1.5, eF: 0.6, sB: 1.2, eB: 1.6, hF: 0.6, kF: 0.9, hB: -0.2, kB: 0.6 })], [0.2, S_({ air: 1, lean: 0.0, sF: 1.0, eF: 1.4, sB: -0.6, eB: 1.0, tq: -1.0, hF: 1.95, kF: 2.4, hB: -0.1, kB: 1.0 })], [0.4, S_({ air: 1, lean: -0.6, head: 0.15, sF: -1.0, eF: 0.4, sB: -1.6, eB: 0.8, tq: -1.2, hF: 2.05, kF: 0.0, hB: 0.2, kB: 1.8 }), "in"], [0.65, S_({ air: 1, lean: -0.3, sF: -0.3, eF: 0.8, sB: -0.8, eB: 1.2, tq: -0.8, hF: 1.4, kF: 1.2, hB: 0.1, kB: 1.4 })], [1, S_({ air: 1, lean: 0.1, sF: 1.5, eF: 0.6, sB: 1.2, eB: 1.6, hF: 0.6, kF: 0.9, hB: -0.2, kB: 0.6 })]], u),
  // An overhand throw with the free hand; the arm goes back and down, then over the top.
  throw: (u) => {
    const wind = { lean: -0.2, head: -0.05, eF: 0.6, sB: 1.2, eB: 1.2, tq: 1.0, hF: 0.35, kF: 0.15, hB: -0.3, kB: 0.5 };
    return keyPose([[0, STAND], [0.3, S_(Object.assign({ sF: -2.35 }, wind))], [0.3001, S_(Object.assign({ sF: 3.93 }, wind)), "lin"], [0.45, S_({ lean: 0.35, head: 0.1, sF: 1.85, eF: 0.1, sB: 0.6, eB: 1.9, tq: 0.5, hF: 0.55, kF: 0.6, hB: -0.5, kB: 0.15 }), "in"], [0.65, S_({ lean: 0.45, head: 0.15, sF: 0.7, eF: 0.4, sB: 0.5, eB: 2.0, hF: 0.55, kF: 0.65, hB: -0.5, kB: 0.2 }), "out"], [1, STAND]], u);
  },
  // Holy water lobbed underhand in a high arc.
  lob: (u) => keyPose([[0, STAND], [0.3, S_({ lean: 0.15, head: -0.15, sF: -1.1, eF: 0.25, hF: 0.4, kF: 0.6, hB: -0.25, kB: 0.6 })], [0.5, S_({ lean: -0.1, head: -0.3, sF: 2.0, eF: 0.3, hF: 0.25, kF: 0.15, hB: -0.3, kB: 0.25 }), "in"], [0.7, S_({ lean: -0.12, head: -0.3, sF: 2.45, eF: 0.4 }), "out"], [1, STAND]], u),
  // Snatching a thing out of the air, and drawing it in.
  catch: (u) => keyPose([[0, STAND], [0.3, S_({ lean: 0.15, head: -0.2, sF: 1.95, eF: 0.0, hF: 0.4, kF: 0.4, hB: -0.3, kB: 0.4 }), "in"], [0.55, S_({ lean: -0.05, head: 0.05, sF: 0.7, eF: 2.0, hF: 0.15, kF: 0.2, hB: -0.15, kB: 0.3 })], [1, CARRYP]], u),
  // A backhand bat that sends a thing back where it came from.
  flick: (u) => keyPose([[0, STAND], [0.2, S_({ lean: 0.05, head: 0.1, sF: 0.9, eF: 2.6 })], [0.35, S_({ lean: 0.25, head: 0.0, sF: 1.9, eF: 0.05, hF: 0.4, kF: 0.4, hB: -0.3, kB: 0.3 }), "in"], [0.6, S_({ lean: 0.2, head: -0.05, sF: 2.4, eF: 0.1, hF: 0.35, kF: 0.4, hB: -0.3, kB: 0.3 }), "out"], [1, STAND]], u),
  pickup: (u) => keyPose([[0, STAND], [0.5, S_({ lean: 0.85, head: 0.4, sF: 0.25, eF: 0.1, sB: 1.6, eB: 1.3, tq: 0.3, hF: 1.3, kF: 2.3, hB: 0.4, kB: 2.2 })], [0.6, S_({ lean: 0.8, head: 0.35, sF: 0.3, eF: 0.4, sB: 1.6, eB: 1.3, tq: 0.3, hF: 1.25, kF: 2.2, hB: 0.4, kB: 2.1 })], [1, CARRYP]], u),
  // Out of the block, a sharp thrust of the torch.
  parry: (u) => keyPose([[0, BLOCKP], [0.15, S_({ lean: -0.05, head: 0.15, sF: 1.1, eF: 1.9, sB: 0.4, eB: 2.4, tq: 0.5, hF: 0.3, kF: 0.5, hB: -0.35, kB: 0.6 })], [0.35, S_({ lean: 0.4, head: 0.1, sF: -0.6, eF: 0.6, sB: 1.6, eB: 0.0, tq: 0.0, hF: 0.8, kF: 0.7, hB: -0.6, kB: 0.05 }), "in"], [0.6, S_({ lean: 0.38, sF: -0.5, eF: 0.6, sB: 1.55, eB: 0.05, tq: 0.05, hF: 0.8, kF: 0.7, hB: -0.6, kB: 0.08 })], [1, STAND]], u),
  hurt: (u) => keyPose([[0, STAND], [0.15, S_({ lean: -0.45, head: -0.45, sF: 1.9, eF: 0.4, sB: 2.2, eB: 0.6, tq: 0.2, hF: 0.4, kF: 0.3, hB: -0.3, kB: 0.8 }), "out"], [0.45, S_({ lean: 0.3, head: 0.4, sF: 0.5, eF: 0.8, sB: 0.6, eB: 1.8, hF: 0.4, kF: 0.8, hB: -0.2, kB: 0.6 })], [1, STAND]], u),
  // Thrown down onto his back (the torch still held up off the ground), and lying there.
  knockdown: (u) => keyPose([[0, STAND], [0.15, S_({ air: 0.5, lift: 4, lean: -0.6, head: -0.5, sF: 2.4, eF: 0.4, sB: 2.6, eB: 0.5, tq: 0.2, hF: 0.8, kF: 0.3, hB: 0.3, kB: 0.6 }), "out"], [0.35, S_({ air: 0.8, lift: 3, lean: -1.2, head: -0.2, sF: 2.8, eF: 0.3, sB: 2.8, eB: 0.5, tq: 0.2, hF: 1.4, kF: 0.4, hB: 1.1, kB: 0.6 })], [0.5, DOWNP, "in"], [0.56, Object.assign(pose(DOWNP), { lift: 1.5, hF: 1.6, hB: 1.4 }), "out"], [0.64, DOWNP, "in"], [1, DOWNP]], u),
  getUp: (u) => keyPose([[0, DOWNP], [0.3, S_({ lean: -0.35, head: 0.2, sF: -0.9, eF: 0.3, sB: 1.8, eB: 1.2, tq: 0.3, hF: 1.6, kF: 2.4, hB: 1.3, kB: 2.2 })], [0.6, S_({ lean: 0.35, head: 0.2, sF: 0.6, eF: 0.3, sB: 0.8, eB: 1.6, hF: 1.3, kF: 1.5, hB: -0.2, kB: 1.8 })], [1, STAND]], u),
  // The flare: the torch raised high overhead, the light surging at 0.4 and held.
  flare: (u, t) => { const tr = 0.012 * Math.sin((t || 0) * 31); return keyPose([[0, STAND], [0.25, S_({ lean: 0.22, head: 0.25, sF: 0.6, eF: 1.2, sB: 0.0, eB: 2.7, tq: 0.4, hF: 0.4, kF: 0.6, hB: -0.3, kB: 0.6 })], [0.4, S_({ lean: -0.18, head: -0.4, sF: 2.0, eF: 0.2, sB: 3.05 + tr, eB: 0.05, tq: 0.05, hF: 0.35, kF: 0.1, hB: -0.4, kB: 0.15 }), "in"], [1, S_({ lean: -0.16, head: -0.38, sF: 2.0, eF: 0.25, sB: 3.05 - tr, eB: 0.05, tq: 0.05, hF: 0.35, kF: 0.1, hB: -0.4, kB: 0.15 })]], u); },
  // The finishers.
  castOut: (u) => keyPose([[0, STAND], [0.3, S_({ lean: -0.2, head: -0.1, sF: 1.0, eF: 0.8, sB: 3.5, eB: 0.6, tq: 0.3, hF: 0.4, kF: 0.3, hB: -0.3, kB: 0.5 })], [0.5, S_({ lean: 0.75, head: 0.4, sF: -0.9, eF: 0.5, sB: 1.0, eB: 0.0, tq: 0.0, hF: 1.1, kF: 1.4, hB: -0.55, kB: 0.3 }), "in"], [0.75, S_({ lean: 0.72, head: 0.4, sF: -0.85, eF: 0.5, sB: 0.95, eB: 0.05, tq: 0.0, hF: 1.1, kF: 1.4, hB: -0.55, kB: 0.35 })], [1, STAND]], u),
  underFoot: (u) => keyPose([[0, STAND], [0.15, CROUCH], [0.4, S_({ air: 1, lift: 14, lean: 0.1, head: 0.3, sF: 2.4, eF: 0.4, sB: 2.7, eB: 0.4, tq: 0.2, hF: 1.9, kF: 2.5, hB: 0.6, kB: 1.6 }), "out"], [0.6, S_({ air: 1, lift: 6, lean: 0.15, head: 0.45, sF: 2.2, eF: 0.4, sB: 2.5, eB: 0.5, tq: 0.2, hF: 0.15, kF: 0.0, hB: 1.2, kB: 2.0 }), "in"], [0.75, LANDP], [1, STAND]], u),
  pillar: (u) => keyPose([[0, STAND], [0.25, S_({ lean: 0.35, head: 0.3, sF: 0.4, eF: 1.3, sB: 0.3, eB: 0.6, tq: 2.4, hF: 0.9, kF: 1.6, hB: 0.2, kB: 1.4 })], [0.45, S_({ lift: 2, lean: -0.05, head: -0.5, sF: 2.95, eF: 0.1, sB: 3.12, eB: 0.0, tq: 0.0, hF: 0.05, kF: 0.0, hB: -0.08, kB: 0.05 }), "in"], [1, S_({ lift: 1, lean: -0.04, head: -0.45, sF: 2.9, eF: 0.12, sB: 3.1, eB: 0.02, tq: 0.0, hF: 0.06, kF: 0.02, hB: -0.08, kB: 0.06 })]], u),
  // A whirl of the torch, round and round in a wide wheel of fire.
  scattered: (u) => {
    const p = keyPose([[0, STAND], [0.15, S_({ lean: -0.1, sF: 1.6, eF: 0.4, sB: -1.2, eB: 0.3, tq: 0.0, hF: 0.5, kF: 0.4, hB: -0.5, kB: 0.4 })], [0.5, S_({ lean: 0.2, head: 0.1, sF: -1.4, eF: 0.4, sB: 1.57 + TAU, eB: 0.05, tq: 0.0, hF: -0.4, kF: 0.4, hB: 0.5, kB: 0.4 }), "lin"], [0.85, S_({ lean: 0.0, sF: 1.6, eF: 0.4, sB: 1.57 + 2 * TAU, eB: 0.05, tq: 0.0, hF: 0.5, kF: 0.4, hB: -0.5, kB: 0.4 }), "lin"], [1, S_({ sB: STAND_O.sB + 2 * TAU })]], u);
    p.sB = Math.atan2(Math.sin(p.sB), Math.cos(p.sB));
    return p;
  },
  virtue: (u) => keyPose([[0, STAND], [0.4, KNEEL], [0.6, Object.assign(pose(KNEEL), { head: -0.4, lean: -0.05, sB: 3.0, eB: 0.15, tq: 0.0, sF: 0.5, eF: 2.4 }), "in"], [1, Object.assign(pose(KNEEL), { head: -0.38, lean: -0.04, sB: 3.02, eB: 0.12, tq: 0.0, sF: 0.5, eF: 2.4 })]], u),
};
// The moment each one-shot lands its blow, lets go, or takes hold (u in 0..1).
const MONK_HIT = { jumpKick: 0.6, superman: 0.62, torchSwing: 0.45, palm: 0.4, spinKick: 0.55, sweep: 0.45, risingKnee: 0.55, launch: 0.4, slam: 0.5, diveStomp: 0.7, dash: 0.35, airKick: 0.4, throw: 0.45, lob: 0.5, catch: 0.3, flick: 0.35, pickup: 0.5, parry: 0.35, flare: 0.4, castOut: 0.5, underFoot: 0.6, pillar: 0.45, scattered: 0.5, virtue: 0.6 };
const MONK_CYCLIC = ["idle", "walk", "run", "fall", "hang", "block", "carry"];
// The hang: where his gripping hand is from his feet (facing right).
MONK_HANG = (() => { const p = MONK_ANIM.hang(0, 0), J = solve(MONK_BODY, p); return [J.hF[0], J.hF[1]]; })();
// The path of his feet through a climb, so the poses keep his hand on the edge. climbUp: from
// (x0, y0) on the ground below to (x1, y1) standing on the ledge, MONK_EDGE in from its edge.
// climbDown: from (x0, y0) standing MONK_EDGE in from the edge (drawn facing back over the
// ledge, toward x0 from x1) down to (x1, y1) on the ground below.
function monkClimb(name, u, x0, y0, x1, y1) {
  const tdir = x1 >= x0 ? 1 : -1;
  if (name === "climbDown") {
    const ex = x0 + tdir * MONK_EDGE, fdir = -tdir;
    if (u < 0.65) { const r = climbRootDown(u); return [ex + r[0] * fdir, y0 + r[1]]; }
    const r = climbRootDown(0.65), sx = ex + r[0] * fdir, sy = y0 + r[1];
    if (u < 0.9) { const k = easeIn((u - 0.65) / 0.25); return [lerp(sx, x1, (u - 0.65) / 0.25), lerp(Math.min(sy, y1), y1, k)]; }
    return [x1, y1];
  }
  const ex = x1 - tdir * MONK_EDGE, dir = tdir;
  const hang = climbRootUp(0.4), hx = ex + hang[0] * dir, hy = Math.min(y0, y1 + hang[1]);
  if (u < 0.18) return [x0, y0];
  if (u < 0.38) { const k = ease((u - 0.18) / 0.2); return [lerp(x0, hx, k), lerp(y0, hy, k)]; }
  if (u < 0.55) return [hx, hy];
  if (u < 0.85) { const r = climbRootUp(u); return [ex + r[0] * dir, Math.min(y0, y1 + r[1])]; }
  return [x1, y1];
}

// ---- The torch flame -------------------------------------------------------------------------------
// Flat, layered, angular tongues: deep red, orange, yellow, and a white heart, each flickering on
// its own, leaning away from his motion. The flare makes it tall, white and roaring; a blow makes
// it gutter, low and sputtering.
const FLAME_LAYERS = [["#a8240e", 1, 1], ["#ff6a1e", 0.78, 0.82], ["#ffb347", 0.56, 0.62], ["#fff1c4", 0.3, 0.36]];
function drawFlame(x, y, size, t, o) {
  o = o || {}; size = size === undefined ? 1 : size; t = t || 0;
  const fl = clamp(o.flare || 0, 0, 1), gu = clamp(o.gutter || 0, 0, 1);
  const sput = gu > 0 ? 1 - gu * (0.45 + 0.55 * Math.abs(Math.sin(t * 23 + Math.sin(t * 7.3) * 3))) : 1;
  const hgt = 12.5 * size * (1 + fl * 0.9) * (1 - gu * 0.45) * (0.55 + 0.45 * sput), wid = 4.8 * size * (1 + fl * 0.45) * (1 - gu * 0.25);
  const lean = clamp(-(o.vx || 0) / 260 - (o.dir || 0) * 0.04, -1.3, 1.3) * 0.8;
  const tt = t * (1 + fl * 0.8), amp = 0.16 + fl * 0.12 + gu * 0.1;
  glow(x, y - hgt * 0.42, (24 + 34 * fl) * size * (1 - gu * 0.45), C.flame, (0.5 + 0.3 * fl) * (0.7 + 0.3 * sput));
  glow(x, y - hgt * 0.3, (9 + 8 * fl) * size, C.flameHot, 0.5 + 0.3 * fl);
  for (let j = 0; j < 4; j++) {
    const [c0, lw, lh] = FLAME_LAYERS[j], w = wid * lw, h = hgt * lh;
    const f = (k) => 1 - amp + amp * (0.55 * Math.sin(tt * (11 + j * 2.3 + k * 3.1) + k * 2.1 + j) + 0.45 * Math.sin(tt * (19 + k * 4.7) + j * 1.7));
    const n1 = f(0), n2 = f(1), n3 = f(2), L = (yy) => lean * yy;
    const col = fl > 0 ? mix(c0, "#ffffff", fl * (0.25 + j * 0.12)) : gu > 0 ? mix(c0, "#601006", gu * 0.35) : c0;
    poly([-w * 0.5, 0, -w * 0.62, -h * 0.26, -w * 0.4 + L(h * 0.58 * n1), -h * 0.58 * n1, -w * 0.14 + L(h * 0.42), -h * 0.42, L(h * n2), -h * n2, w * 0.18 + L(h * 0.45), -h * 0.45, w * 0.4 + L(h * 0.52 * n3), -h * 0.52 * n3, w * 0.6, -h * 0.24, w * 0.46, 0, 0, h * 0.16].map((v, i) => v + (i % 2 ? y : x)), col);
  }
}
// A spark: a hot point with an ember's glow.
function drawEmber(x, y, s, a) {
  s = s || 1; a = a === undefined ? 1 : a; if (a <= 0.01) return;
  glow(x, y, s * 4, C.ember, a * 0.6);
  const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a;
  poly([x, y - s, x + s * 0.7, y, x, y + s, x - s * 0.7, y], C.flameHot);
  ctx.globalAlpha = pa;
}

// ---- The seven sins ----------------------------------------------------------------------------------
// The colours of Benedictine Bricks. Each sin is seen in its true colour only in the light; in the
// dark it is a black shape with two pale eyes.
const SIN_ORDER = ["pride", "avarice", "lust", "envy", "gluttony", "wrath", "sloth"];
const SINS = {};
[["pride", "Pride", "Humility", "#a86ad8", "#4a1a6a", "#2a0a3a", "#ffd83a", "#ffe9a0"],
 ["avarice", "Avarice", "Generosity", "#c8b02a", "#6a5a14", "#2e2608", "#fff4a0", "#8a6420"],
 ["lust", "Lust", "Chastity", "#e85a9a", "#a82a6a", "#3a0a2a", "#ffe0f0", "#ff9ac8"],
 ["envy", "Envy", "Kindness", "#6ad06a", "#2a7a3a", "#0a2a14", "#c8ff3a", "#dcffe0"],
 ["gluttony", "Gluttony", "Temperance", "#f09a4a", "#a8582a", "#3a1a08", "#ffe8a0", "#fff0c8"],
 ["wrath", "Wrath", "Patience", "#ff5a2a", "#a01810", "#3a0606", "#ffe46a", "#2a0806"],
 ["sloth", "Sloth", "Diligence", "#9aa8c0", "#5a6a88", "#1a2030", "#d8e0f0", "#c8d4e8"],
].forEach(([id, name, virtue, color, dark, deep, eye, extra]) => {
  const light = mix(color, "#ffffff", 0.42);
  SINS[id] = { id, name, virtue, color, dark, deep, light, eye, tone: { k: deep, d: dark, m: color, l: light, h: eye, x: "#12060a", s: extra } };
});
// Standing height and width of each, in world pixels (the monk is 48).
const DEMON_SIZE = { pride: { h: 58, w: 22 }, avarice: { h: 40, w: 34 }, lust: { h: 54, w: 18 }, envy: { h: 46, w: 20 }, gluttony: { h: 66, w: 46 }, wrath: { h: 54, w: 30 }, sloth: { h: 50, w: 22 } };
const DEMON_BODY = {
  pride: { thigh: 13.5, shin: 14.5, torso: 16.5, shd: 2, upper: 11, fore: 11.5, neck: 2.4, head: 3.4, min: 3 },
  avarice: { thigh: 8.5, shin: 9.5, torso: 15, shd: 2, upper: 12, fore: 12.5, neck: 1.6, head: 4.2, min: 3 },
  lust: { thigh: 14, shin: 15, torso: 15, shd: 2, upper: 10.5, fore: 11, neck: 3.6, head: 3.2, min: 3 },
  envy: { thigh: 11.5, shin: 12, torso: 13.5, shd: 1.8, upper: 11, fore: 11, neck: 2.2, head: 3.6, min: 3 },
  gluttony: { thigh: 10, shin: 10, torso: 34, shd: 5, upper: 10, fore: 10, neck: 1, head: 5.2, min: 4 },
  wrath: { thigh: 12.5, shin: 13, torso: 18, shd: 2.5, upper: 11, fore: 11.5, neck: 1.2, head: 4.4, min: 3 },
  sloth: { thigh: 10, shin: 10, torso: 16, shd: 2, upper: 12, fore: 13, neck: 2, head: 4.2, min: 3, hover: 17 },
};

// The painter's list for a demon: flat polygons, each with a tone, in the order they are laid on;
// and the thin lines (cracks, edges) laid over them in the light.
const DP = [], DL = [];
const dp = (tone, pts) => { DP.push(tone, pts); };
const dl = (tone, w, pts) => { DL.push(tone, w, pts); };
// Long fingers or claws fanned from a hand, curling.
function claws(tone, E, Hd, n, len, w, curl, spread) {
  const a0 = Math.atan2(Hd[1] - E[1], Hd[0] - E[0]);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i - (n - 1) / 2) * (spread || 0.45), c = Math.cos(a), s = Math.sin(a);
    const m = [Hd[0] + c * len * 0.65, Hd[1] + s * len * 0.65], b = a + (curl || 0), tip = [m[0] + Math.cos(b) * len * 0.5, m[1] + Math.sin(b) * len * 0.5];
    dp(tone, [[Hd[0] - s * w, Hd[1] + c * w], [m[0] - s * w * 0.6, m[1] + c * w * 0.6], tip, [m[0] + s * w * 0.6, m[1] - c * w * 0.6], [Hd[0] + s * w, Hd[1] - c * w]]);
  }
}
// A ribbon or a streamer: from a root, along a way, waving as it goes, tapering to nothing.
function ribbon(tone, A, dx, dy, len, w, t, ph, amp) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const px = -dy, py = dx, N = 7, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N, wv = Math.sin(t * 3.1 + i * 0.85 + ph) * (amp || 3.2) * k, ww = w * (1 - k * 0.92);
    const cx = A[0] + dx * len * k + px * wv, cy = A[1] + dy * len * k + py * wv;
    L.push([cx + px * ww, cy + py * ww]); R.unshift([cx - px * ww, cy - py * ww]);
  }
  dp(tone, L.concat(R));
}
// A tapering spike from a base point outward.
function spike(tone, B, ang, len, w) { const c = Math.cos(ang), s = Math.sin(ang); return dp(tone, [[B[0] - s * w, B[1] + c * w], [B[0] + c * len, B[1] + s * len], [B[0] + s * w, B[1] - c * w]]); }

// Pride: tall and upright, chin high, a crown of horns, great angular wings. It flies.
function prideWing(J, p, far) {
  const n = J.n, up = J.up, R = PA(PA(J.sh, n, far ? -1.4 : -2.8), up, far ? 0.6 : -0.4);
  const wl = clamp(p.wl, 0, 1.2), a = p.wa + (far ? 0.28 : 0), L1 = 11 + 9 * wl;
  const Wp = [R[0] + Math.cos(a) * L1, R[1] + Math.sin(a) * L1];
  const sp0 = lerp(2.3, 0.35, Math.min(1, wl)), spd = lerp(0.13, 0.55, Math.min(1, wl)), sc = 0.78 + 0.4 * wl;
  const tips = [24, 20, 15].map((L, j) => { const b = a - (sp0 + j * spd); return [Wp[0] + Math.cos(b) * L * sc, Wp[1] + Math.sin(b) * L * sc]; });
  const notch = (q, r) => P2(P2(q, r, 0.5), Wp, 0.32);
  const base = PA(PA(J.hip, n, -1.5), up, 5);
  dp(far ? "k" : "d", [R, Wp, tips[0], notch(tips[0], tips[1]), tips[1], notch(tips[1], tips[2]), tips[2], base]);
  const bt = far ? "d" : "m";
  dp(bt, seg(R, Wp, 1.5, 1.0));
  for (const q of tips) dp(bt, seg(Wp, q, 0.7, 0.15));
  spike(bt, Wp, a - 0.6, 4, 0.8);
}
function paintPride(J, p, o) {
  const n = J.n, up = J.up;
  prideWing(J, p, true);
  // The far leg and arm, in shadow.
  dp("d", seg(J.hip, J.kB, 2.5, 1.7)); dp("d", seg(J.kB, J.fB, 1.7, 0.6)); spike("d", J.fB, Math.atan2(J.fB[1] - J.kB[1], J.fB[0] - J.kB[0]) - 1.35, 5, 0.9);
  dp("d", seg(J.sh, J.eB, 1.9, 1.5)); dp("d", seg(J.eB, J.hB, 1.5, 0.8)); claws("d", J.eB, J.hB, 3, 5.5, 0.55, 0.2, 0.3);
  prideWing(J, p, false);
  // The body: the chest thrust out, the waist narrow, a pointed plate below it.
  const w1 = P2(J.hip, J.sh, 0.45), w2 = P2(J.hip, J.sh, 0.55);
  dp("m", [PA(PA(J.sh, n, -3.2), up, 1.2), PA(J.neck, n, -1.2), PA(J.neck, n, 1.4), PA(J.sh, n, 4.8), PA(w1, n, 1.6), PA(J.hip, n, 2.3), PA(J.hip, n, -2.4), PA(w2, n, -2.6)]);
  dp("m", [PA(J.hip, n, -2.6), PA(J.hip, n, 2.6), PA(PA(J.hip, up, -7), n, 0.8)]);
  spike("m", PA(J.sh, n, -2.2), Math.atan2(up[1], up[0]) - 0.45, 6.5, 1.6);
  dp("l", [PA(J.neck, n, 1.2), PA(J.sh, n, 4.6), PA(w1, n, 1.5), PA(w1, n, -0.2)]);
  // The head, chin high, and its crown of horns.
  dp("m", HLs(J, [3.2, 3.0, -0.6, 3.4, -2.8, 0.8, -2.6, -2.6, 0.6, -3.4, 3.0, -1.6, 4.3, 1.0]));
  dp("l", HLs(J, [0.6, -3.4, 3.0, -1.6, 4.3, 1.0, 1.4, -0.8]));
  for (let i = 0; i < 5; i++) {
    const a = -PI / 2 + (i - 2) * 0.42 + J.ha, L = [4.5, 6.5, 8.5, 6.5, 4.5][i], c = HL(J, Math.cos(-PI / 2 + (i - 2) * 0.42) * 2.6, Math.sin(-PI / 2 + (i - 2) * 0.42) * 2.6 - 0.3);
    spike(i === 2 ? "h" : "l", c, a, L, 0.95);
  }
  // The near leg and arm.
  dp("m", seg(J.hip, J.kF, 2.6, 1.8)); dp("m", seg(J.kF, J.fF, 1.8, 0.6)); spike("m", J.fF, Math.atan2(J.fF[1] - J.kF[1], J.fF[0] - J.kF[0]) - 1.35, 5.5, 0.9);
  spike("m", J.kF, Math.atan2(J.kF[1] - J.hip[1], J.kF[0] - J.hip[0]) + 0.9, 3, 0.8);
  dp("m", seg(J.sh, J.eF, 2.0, 1.6)); dp("m", seg(J.eF, J.hF, 1.6, 0.9)); claws("m", J.eF, J.hF, 3, 6, 0.6, 0.25, 0.3);
  dl("k", 0.6, [J.sh, J.eF, J.hF]);
}

// Avarice: hunched, long grasping arms, hooked fingers, and a sack on its back that swells.
function paintAvarice(J, p, o) {
  const n = J.n, up = J.up, carry = clamp(o.carry || 0, 0, 3);
  dp("d", seg(J.sh, J.eB, 2.2, 1.8)); dp("d", seg(J.eB, J.hB, 1.8, 1.4)); claws("d", J.eB, J.hB, 3, 4.6, 0.55, 1.5, 0.5);
  dp("d", seg(J.hip, J.kB, 2.8, 2.2)); dp("d", seg(J.kB, J.fB, 2.2, 1.4)); claws("d", J.kB, J.fB, 2, 3.5, 0.6, -1.0, 0.9);
  // The sack: lumpy, tied at the neck, held at the shoulder.
  const sz = 5.5 + carry * 2.5, base = PA(P2(J.hip, J.sh, 0.72), n, -3.2);
  const c = PA(PA(base, n, -sz * 0.6), up, sz * 0.55), R = [1, 0.84, 1.06, 0.9, 1.02, 0.9, 1.08, 0.86, 0.96], sack = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.3, r = sz * R[i]; sack.push([c[0] + Math.cos(a) * r * 1.08, c[1] + Math.sin(a) * r * 0.92]); }
  const tie = PA(PA(c, up, sz * 0.85), n, sz * 0.45);
  dp("s", sack); dp("s", [PA(c, up, sz * 0.6), tie, PA(PA(tie, n, 1.6), up, 1.8), PA(J.sh, n, -1.5)]);
  dp("h", [PA(PA(c, up, sz * 0.6), n, -sz * 0.2), PA(PA(c, up, sz * 0.75), n, sz * 0.25), PA(PA(c, up, sz * 0.1), n, sz * 0.5), PA(PA(c, up, sz * 0.05), n, -sz * 0.1)].map((q) => q));
  // The hunched body, a ridge of spines along its back.
  const w = P2(J.hip, J.sh, 0.55);
  dp("m", [PA(J.hip, n, -3), PA(w, n, -4.4), PA(PA(J.sh, n, -3.4), up, 2.6), PA(J.neck, n, -0.8), PA(J.neck, n, 2.2), PA(J.sh, n, 3.4), PA(w, n, 3.4), PA(J.hip, n, 3)]);
  for (let i = 0; i < 3; i++) spike("d", PA(P2(w, J.sh, i * 0.35), n, -4.2), Math.atan2(-n[1] + up[1] * 2, -n[0] + up[0] * 2), 3, 0.9);
  dp("l", [PA(J.neck, n, 2.0), PA(J.sh, n, 3.2), PA(w, n, 3.2), PA(w, n, 1.2)]);
  // The head: a jutting jaw, a long hooked nose, a pointed ear laid back.
  dp("m", HLs(J, [2.0, 3.6, -1.5, 3.0, -3.8, 0.6, -3.4, -2.6, -0.4, -4.0, 2.8, -2.6, 4.2, -0.6, 7.0, 1.8, 5.8, 3.0, 4.0, 1.6, 3.6, 3.4]));
  dp("m", HLs(J, [-2.0, -2.2, -7.2, -4.8, -3.2, 0.4]));
  dp("l", HLs(J, [2.8, -2.6, 4.2, -0.6, 7.0, 1.8, 3.0, -0.6]));
  dp("d", seg(J.hip, J.kF, 2.9, 2.3)); dp("m", seg(J.hip, J.kF, 2.7, 2.1)); dp("m", seg(J.kF, J.fF, 2.1, 1.4)); claws("m", J.kF, J.fF, 2, 3.6, 0.6, -1.0, 0.9);
  dp("m", seg(J.sh, J.eF, 2.3, 1.9)); dp("m", seg(J.eF, J.hF, 1.9, 1.4)); claws("l", J.eF, J.hF, 3, 4.8, 0.55, 1.5, 0.5);
  // A coin or two winking from the sack's neck when it is full.
  if (carry >= 1) dp("h", gem(PA(PA(c, up, sz * 0.95), n, sz * 0.1), 1.2));
}

// Lust: slender and sinuous, long ribbons streaming from it; a lure, elegant and inhuman.
function paintLust(J, p, o, t) {
  const n = J.n, up = J.up;
  const back = PA(J.head, n, -1);
  ribbon("d", HL(J, -3.5, -1.5), -n[0] * 0.8 + 0.25, -n[1] * 0.8 + 0.6, 30, 1.5, t, 0, 3.5);
  ribbon("d", J.hB, -0.5, 1, 20, 1.1, t, 2, 3);
  dp("d", seg(J.hip, J.kB, 2.0, 1.3)); dp("d", seg(J.kB, J.fB, 1.3, 0.25));
  dp("d", seg(J.sh, J.eB, 1.4, 1.1)); dp("d", seg(J.eB, J.hB, 1.1, 0.5)); claws("d", J.eB, J.hB, 2, 5, 0.4, -0.2, 0.25);
  // A skirt of streamers hanging from the hips, swaying.
  for (let i = 0; i < 3; i++) ribbon(i === 1 ? "m" : "d", PA(J.hip, n, -1.5 + i * 1.5), -0.25 + i * 0.05, 1, 15 + i * 3, 1.3, t * 0.8, i * 1.7, 1.8);
  const w = P2(J.hip, J.sh, 0.42);
  dp("m", [PA(J.sh, n, -2.4), PA(J.neck, n, -0.9), PA(J.neck, n, 0.9), PA(J.sh, n, 2.6), PA(w, n, 1.1), PA(J.hip, n, 2.0), PA(PA(J.hip, up, -4.5), n, 0.2), PA(J.hip, n, -2.0), PA(w, n, -1.1)]);
  dp("m", seg(J.neck, P2(J.neck, J.head, 0.6), 0.9, 0.8));
  dp("l", [PA(J.neck, n, 0.8), PA(J.sh, n, 2.4), PA(w, n, 1.0), PA(w, n, 0.1)]);
  // The head: a long almond swept back into a crest.
  dp("m", HLs(J, [3.2, 1.2, 1.2, 2.6, -2.0, 2.0, -5.0, -0.4, -11.5, -4.8, -3.4, -2.8, 0.4, -2.9, 2.8, -1.2]));
  dp("l", HLs(J, [0.4, -2.9, 2.8, -1.2, 3.2, 1.2, 0.6, -0.4, -6.0, -2.6]));
  dp("m", seg(J.hip, J.kF, 2.1, 1.4)); dp("m", seg(J.kF, J.fF, 1.4, 0.25));
  dp("m", seg(J.sh, J.eF, 1.4, 1.1)); dp("m", seg(J.eF, J.hF, 1.1, 0.5)); claws("m", J.eF, J.hF, 2, 5, 0.4, -0.2, 0.25);
  ribbon("l", J.hF, -0.4, 1, 22, 1.1, t, 4, 3);
  ribbon("l", HL(J, -2.5, -2), -n[0] + 0.1, -n[1] + 0.45, 24, 1.2, t, 1, 3);
}

// Envy: lean and twisted, long limbs, a blank mirror for a face. It is drawn in any pose, the
// monk's too, for it copies what it sees.
function paintEnvy(J, p, o) {
  const n = J.n, up = J.up;
  dp("d", seg(J.hip, J.kB, 1.9, 1.5)); dp("d", gem(J.kB, 1.8)); dp("d", seg(J.kB, J.fB, 1.5, 0.8)); claws("d", J.kB, J.fB, 2, 4, 0.5, -1.2, 0.5);
  dp("d", seg(J.sh, J.eB, 1.6, 1.3)); dp("d", gem(J.eB, 1.6)); dp("d", seg(J.eB, J.hB, 1.3, 0.8)); claws("d", J.eB, J.hB, 3, 5, 0.45, 0.4, 0.35);
  // The twisted body: one shoulder hunched up, the spine kinked.
  const m = PA(P2(J.hip, J.sh, 0.5), n, 1.6);
  dp("m", [PA(J.hip, n, -2.2), PA(m, n, -2.4), PA(PA(J.sh, n, -3.2), up, 1.8), PA(J.neck, n, -0.6), PA(J.neck, n, 1.2), PA(J.sh, n, 2.6), PA(m, n, 1.4), PA(J.hip, n, 2.0)]);
  for (let i = 0; i < 3; i++) spike("k", PA(P2(m, J.sh, i * 0.4), n, -2.6), Math.atan2(-n[1] + up[1], -n[0] + up[0]), 2.6, 0.7);
  dp("l", [PA(J.neck, n, 1.0), PA(J.sh, n, 2.4), PA(m, n, 1.3), PA(m, n, 0.2)]);
  // The head: spines behind, and before it the mirror-plate.
  dp("m", HLs(J, [2.2, 3.2, -1.6, 3.4, -3.6, 1.0, -3.8, -2.0, -1.2, -3.8, 2.0, -3.4]));
  dp("d", HLs(J, [-3.2, -2.6, -7.4, -4.4, -3.6, -0.4])); dp("d", HLs(J, [-3.4, 0.6, -6.8, 2.0, -3.0, 2.4]));
  dp("s", HLs(J, [0.4, -4.0, 3.4, -3.1, 4.5, 0.0, 3.4, 3.1, 0.6, 3.9, -0.5, 0.0]));
  dp("l", HLs(J, [1.0, -3.4, 2.8, -2.8, 1.0, 2.6, 0.2, 0.4]));
  dp("m", seg(J.hip, J.kF, 2.0, 1.6)); dp("m", gem(J.kF, 1.9)); dp("m", seg(J.kF, J.fF, 1.6, 0.8)); claws("m", J.kF, J.fF, 2, 4.2, 0.5, -1.2, 0.5);
  dp("m", seg(J.sh, J.eF, 1.7, 1.4)); dp("m", gem(J.eF, 1.7)); dp("m", seg(J.eF, J.hF, 1.4, 0.8)); claws("m", J.eF, J.hF, 3, 5.4, 0.45, 0.4, 0.35);
  dl("h", 0.5, HLs(J, [3.4, -3.1, 4.5, 0.0, 3.4, 3.1]));
}

// Gluttony: a huge round belly, a small head, a wide mouth; heavy legs.
function paintGluttony(J, p, o) {
  const n = J.n, up = J.up, belly = clamp(o.belly || 0, 0, 3);
  dp("d", seg(J.sh, J.eB, 3.4, 3.0)); dp("d", seg(J.eB, J.hB, 3.0, 2.6)); claws("d", J.eB, J.hB, 3, 3.6, 1.0, 0.6, 0.55);
  dp("d", seg(J.hip, J.kB, 4.6, 4.2)); dp("d", seg(J.kB, J.fB, 4.2, 3.6)); dp("d", footShape(J.kB, J.fB, 6));
  // The belly: a great many-sided round, pushed out by what it has swallowed.
  const c = PA(PA(J.hip, up, 14.5), n, 3.5 + belly * 0.6), rx = 20 + belly * 1.6, ry = 19 + belly * 1.2, B = [], lo = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU, ca = Math.cos(a), sa = Math.sin(a);
    let k = 1 + (sa > 0 ? sa * 0.06 : 0);
    if (belly > 0) k += 0.08 * Math.max(0, Math.cos(a - 0.5)) * Math.min(1, belly) + 0.07 * Math.max(0, Math.cos(a + 1.2)) * clamp(belly - 1, 0, 1) + 0.07 * Math.max(0, Math.cos(a - 2.0)) * clamp(belly - 2, 0, 1);
    const q = [c[0] + n[0] * ca * rx * k - up[0] * sa * ry * k, c[1] + n[1] * ca * rx * k - up[1] * sa * ry * k];
    B.push(q); if (sa > -0.2) lo.push(q);
  }
  // The shoulders: a heavy mound on top of the belly, the arms set on it.
  dp("m", [PA(J.sh, n, -8), PA(J.neck, n, -3.6), PA(J.neck, n, 3.6), PA(J.sh, n, 9), PA(c, n, 12), PA(c, n, -12)]);
  dp("m", B);
  dp("d", lo.concat([PA(PA(c, up, -ry * 0.1), n, -rx * 0.98)]));
  dp("l", [PA(PA(c, up, ry * 0.75), n, rx * 0.15), PA(PA(c, up, ry * 0.55), n, rx * 0.72), PA(PA(c, up, ry * 0.05), n, rx * 0.9), PA(PA(c, up, ry * 0.35), n, rx * 0.4)]);
  for (let i = 0; i < Math.floor(belly); i++) dp("h", gem(PA(PA(c, up, [2, -6, 6][i]), n, [8, 4, -6][i]), 2.2));
  // The small head and the wide mouth: the jaw hinged back and opening below.
  const jaw = clamp(p.jaw, 0, 1), ja = jaw * 0.85, hc = Math.cos(ja), hs = Math.sin(ja), hx = -2.6, hy = 1.0;
  const J2 = (x, y) => { const dx = x - hx, dy = y - hy; return [hx + dx * hc - dy * hs, hy + dx * hs + dy * hc]; };
  const jawPts = [J2(-3.8, 1.2), J2(8.6, 1.0), J2(7.4, 3.8), J2(0, 5.2), J2(-3.6, 3.6)];
  if (jaw > 0.05) dp("x", HLs(J, [-2.6, 1.0, 8.4, 0.4, jawPts[1][0], jawPts[1][1], jawPts[2][0], jawPts[2][1]]));
  dp("m", HLs(J, [-4.2, 1.0, -4.4, -2.8, -1.2, -5.0, 2.8, -4.2, 4.6, -1.2, 8.6, 0.2, 8.4, 1.2, -1.0, 1.6]));
  dp("m", HLs(J, [].concat(...jawPts)));
  dp("l", HLs(J, [-1.2, -5.0, 2.8, -4.2, 4.6, -1.2, 1.0, -2.0]));
  for (let i = 0; i < 4; i++) { const x = 1.6 + i * 1.7; dp("s", HLs(J, [x - 0.6, 1.1, x + 0.6, 1.1, x, 2.4])); }
  dp("m", seg(J.hip, J.kF, 4.7, 4.3)); dp("m", seg(J.kF, J.fF, 4.3, 3.7)); dp("m", footShape(J.kF, J.fF, 6.5));
  dp("m", seg(J.sh, J.eF, 3.5, 3.1)); dp("m", seg(J.eF, J.hF, 3.1, 2.7)); claws("m", J.eF, J.hF, 3, 3.8, 1.0, 0.6, 0.55);
}

// Wrath: bull-like, horned, hunched forward over massive shoulders, its hide cracked with fire.
function paintWrath(J, p, o) {
  const n = J.n, up = J.up;
  const horn = (tone, dx) => dp(tone, HLs(J, [1.6 + dx, -2.8, -0.8 + dx, -2.4, -3.8 + dx, -5.4, -3.4 + dx, -9.2, -0.4 + dx, -11.4, 4.0 + dx, -11.6, 0.4 + dx, -9.6, -0.6 + dx, -6.8]));
  horn("k", -1.6);
  dp("d", seg(J.sh, J.eB, 3.2, 2.8)); dp("d", seg(J.eB, J.hB, 2.8, 2.4)); dp("d", gem(J.hB, 3.0));
  dp("d", seg(J.hip, J.kB, 3.8, 2.8)); dp("d", seg(J.kB, J.fB, 2.6, 1.6)); dp("k", footShape(J.kB, J.fB, 3.2));
  const w = P2(J.hip, J.sh, 0.55), w2 = P2(J.hip, J.sh, 0.45);
  dp("m", [PA(J.hip, n, -3.4), PA(w, n, -5.6), PA(PA(J.sh, n, -4.6), up, 4.8), PA(PA(J.neck, n, 0.5), up, 2.6), PA(J.sh, n, 6.6), PA(w2, n, 4.4), PA(J.hip, n, 3.2)]);
  for (let i = 0; i < 3; i++) spike("d", PA(PA(P2(w, J.sh, 0.4 + i * 0.3), n, -4.8 + i * 0.6), up, i * 1.8), Math.atan2(up[1] - n[1] * 0.6, up[0] - n[0] * 0.6), 3.4, 1.0);
  dp("l", [PA(PA(J.neck, n, 0.5), up, 2.4), PA(J.sh, n, 6.4), PA(w2, n, 4.2), PA(w2, n, 1.8)]);
  // The bull's head, low and forward, and its great horns.
  dp("m", HLs(J, [6.4, 0.6, 6.2, 3.0, 3.4, 4.2, -1.4, 3.8, -3.4, 0.6, -2.2, -2.8, 2.6, -3.0, 4.4, -1.6]));
  dp("l", HLs(J, [2.6, -3.0, 4.4, -1.6, 6.4, 0.6, 3.0, 0.0]));
  horn("s", 0);
  dp("d", seg(J.hip, J.kF, 4.0, 3.0)); dp("m", seg(J.hip, J.kF, 3.8, 2.8)); dp("m", seg(J.kF, J.fF, 2.7, 1.7)); dp("s", footShape(J.kF, J.fF, 3.4));
  dp("m", seg(J.sh, J.eF, 3.4, 3.0)); dp("m", seg(J.eF, J.hF, 3.0, 2.6)); dp("m", gem(J.hF, 3.2));
  // The fire in the cracks of its hide.
  dl("h", 0.9, [PA(PA(J.sh, n, -2), up, 3), PA(w, n, -1.5), PA(w, n, 1.5), PA(w2, n, -0.5), PA(J.hip, n, 1)]);
  dl("h", 0.8, [PA(J.sh, n, 3), PA(w2, n, 3.2), PA(P2(w2, J.hip, 0.5), n, 1.5)]);
  dl("h", 0.7, [P2(J.sh, J.eF, 0.2), P2(J.sh, J.eF, 0.6), P2(J.eF, J.hF, 0.3), P2(J.eF, J.hF, 0.75)]);
  dl("h", 0.7, [P2(J.hip, J.kF, 0.2), P2(J.hip, J.kF, 0.7), P2(J.kF, J.fF, 0.4)]);
  dl("h", 0.6, HLs(J, [-1.5, -1.8, 0.5, 0.2, 3.0, 0.5]));
}

// Sloth (acedia): a drifting wraith with no legs, a tattered hem, drooping head and arms.
function paintSloth(J, p, o, t) {
  const n = J.n, B = DEMON_BODY.sloth;
  dp("d", seg(J.sh, J.eB, 2.2, 1.8)); dp("d", seg(J.eB, J.hB, 1.8, 1.0)); claws("d", J.eB, J.hB, 3, 5.5, 0.4, 0.5, 0.25);
  // The body, falling to tatters that drift behind it.
  const pts = [PA(J.sh, n, -4.2), PA(J.neck, n, -1.4), PA(J.neck, n, 2.0), PA(J.sh, n, 4.4), PA(J.hip, n, 5.6)];
  const L = [0.98, 0.66, 1.0, 0.72, 0.9, 0.58];
  for (let i = 0; i < 6; i++) {
    const k = i / 5, x = J.hip[0] + lerp(5.2, -7, k) - (1 - L[i]) * 2 + Math.sin(t * 1.7 + i * 1.3) * 1.2 - k * 2.5, yb = J.hip[1] + B.hover * L[i] + Math.sin(t * 2.3 + i) * 0.8;
    pts.push([x, yb]);
    if (i < 5) pts.push([J.hip[0] + lerp(5.2, -7, k + 0.1) - k * 2, J.hip[1] + B.hover * 0.5]);
  }
  pts.push(PA(J.hip, n, -6.4));
  dp("m", pts);
  dp("l", [PA(J.neck, n, 1.8), PA(J.sh, n, 4.2), PA(J.hip, n, 5.2), PA(J.hip, n, 3.2)]);
  // The heavy bowed head, and the strands hanging from it like weed.
  dp("m", HLs(J, [3.8, 3.8, 0.6, 4.6, -3.4, 2.2, -4.2, -1.8, -1.0, -4.2, 2.6, -3.4, 4.6, -0.4]));
  for (let i = 0; i < 3; i++) ribbon(i === 1 ? "m" : "d", HL(J, 3.2 - i * 2.4, 3.6), 0.12 * Math.sin(t + i), 1, 9 + i * 2, 0.9, t * 0.6, i * 2, 1.2);
  dp("m", seg(J.sh, J.eF, 2.3, 1.9)); dp("m", seg(J.eF, J.hF, 1.9, 1.0)); claws("l", J.eF, J.hF, 3, 6, 0.4, 0.5, 0.25);
}
const DEMON_PAINT = { pride: paintPride, avarice: paintAvarice, lust: paintLust, envy: paintEnvy, gluttony: paintGluttony, wrath: paintWrath, sloth: paintSloth };

// Lay the painter's list on: in the dark, all of it as one black shape; in the light, in its
// tones, each run of one tone filled at once.
function fillDemon(lit, S) {
  if (!lit) { ctx.beginPath(); for (let i = 1; i < DP.length; i += 2) addPts(ctx, DP[i]); ctx.fillStyle = C.ink; ctx.fill(); return; }
  let cur = null;
  for (let i = 0; i < DP.length; i += 2) {
    if (DP[i] !== cur) { if (cur) { ctx.fillStyle = S.tone[cur]; ctx.fill(); } cur = DP[i]; ctx.beginPath(); }
    addPts(ctx, DP[i + 1]);
  }
  if (cur) { ctx.fillStyle = S.tone[cur]; ctx.fill(); }
  ctx.lineJoin = "miter"; ctx.lineCap = "butt";
  for (let i = 0; i < DL.length; i += 3) {
    const pts = DL[i + 2]; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.strokeStyle = S.tone[DL[i]]; ctx.lineWidth = DL[i + 1]; ctx.stroke();
  }
}
function demonFlash(color, a) { ctx.beginPath(); for (let i = 1; i < DP.length; i += 2) addPts(ctx, DP[i]); const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = pa; }
// The cracks of a broken demon, glowing in its colour.
function brokenCracks(sin, J, S, t) {
  const c = mix(S.color, "#ffffff", 0.45), k = 0.75 + 0.25 * Math.sin(t * 5);
  const pa = ctx.globalAlpha; ctx.globalAlpha = pa * k; ctx.strokeStyle = c; ctx.lineWidth = 0.9; ctx.lineJoin = "miter";
  const n = J.n, m = P2(J.hip, J.neck, 0.5);
  ctx.beginPath(); ctx.moveTo(J.neck[0], J.neck[1]); ctx.lineTo(PA(P2(J.neck, m, 0.5), n, 1.6)[0], PA(P2(J.neck, m, 0.5), n, 1.6)[1]); ctx.lineTo(PA(m, n, -1.2)[0], PA(m, n, -1.2)[1]); ctx.lineTo(PA(P2(m, J.hip, 0.6), n, 1.4)[0], PA(P2(m, J.hip, 0.6), n, 1.4)[1]);
  ctx.moveTo(J.sh[0], J.sh[1]); ctx.lineTo(P2(J.sh, J.eF, 0.6)[0] + 1, P2(J.sh, J.eF, 0.6)[1]); ctx.lineTo(J.eF[0], J.eF[1]);
  if (sin !== "sloth") { ctx.moveTo(J.hip[0], J.hip[1]); ctx.lineTo(P2(J.hip, J.kF, 0.5)[0] - 1, P2(J.hip, J.kF, 0.5)[1]); ctx.lineTo(J.kF[0], J.kF[1]); }
  ctx.stroke(); ctx.globalAlpha = pa;
}
// Draw a demon: feet at (x, y) (for Sloth, the point under its hem), facing dir, in pose p.
// o = { t, lit, alpha, hurt, broken, windup, carry, belly, mirror }.
function drawDemon(sin, x, y, dir, p, o) {
  o = o || {}; dir = dir < 0 ? -1 : 1;
  const S = SINS[sin], J = solve(DEMON_BODY[sin], p), t = o.t || 0, lit = clamp(o.lit || 0, 0, 1);
  DP.length = 0; DL.length = 0;
  DEMON_PAINT[sin](J, p, o, t);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (p.spin) { ctx.translate(J.hip[0], J.hip[1]); ctx.rotate(p.spin); ctx.translate(-J.hip[0], -J.hip[1]); }
  let a = o.alpha === undefined ? 1 : o.alpha; if (sin === "sloth") a *= lit > 0 ? 0.62 : 0.8;
  ctx.globalAlpha *= a;
  const ch = P2(J.hip, J.neck, 0.6);
  if (o.broken) glow(ch[0], ch[1], 26, S.color, 0.35 + 0.12 * Math.sin(t * 5));
  if (lit <= 0) fillDemon(false, S);
  else if (lit >= 1) fillDemon(true, S);
  else { fillDemon(false, S); const pa = ctx.globalAlpha; ctx.globalAlpha = pa * lit; fillDemon(true, S); ctx.globalAlpha = pa; }
  if (lit > 0 && o.windup > 0) { const hd = sin === "pride" || sin === "lust" || sin === "envy" ? J.hF : ch; glow(hd[0], hd[1], 14 + 10 * o.windup, S.color, 0.75 * o.windup); glow(ch[0], ch[1], 22, S.light, 0.3 * o.windup); }
  if (o.mirror > 0) { demonFlash(mix(S.color, "#ffffff", 0.55), 0.65 * o.mirror); glow(J.head[0], J.head[1], 24, S.color, o.mirror); }
  if (o.hurt > 0) demonFlash(lit > 0 ? "#ffffff" : "#e8e8f0", (lit > 0 ? 0.85 : 0.6) * o.hurt);
  if (o.broken) brokenCracks(sin, J, S, t);
  ctx.restore();
}
// The eyes alone: two pale points, which show in the dark. o = { windup, dim, alpha, t }.
// Each: the near eye's place in the head's frame, the far eye's offset, size, slant.
const EYES = { pride: [2.2, -0.6, 1.6, 1.1, -0.35], avarice: [2.6, -1.0, 1.7, 1.2, 0.3], lust: [1.8, -0.6, 1.5, 1.0, -0.25], envy: [2.6, -1.2, 1.8, 1.9, 0], gluttony: [1.4, -2.2, 1.5, 0.9, 0.1], wrath: [2.4, -0.4, 1.6, 1.2, 0.45], sloth: [2.4, 0.6, 1.6, 1.0, -0.15] };
function demonEyes(sin, x, y, dir, p, o) {
  o = o || {}; dir = dir < 0 ? -1 : 1;
  const J = solve(DEMON_BODY[sin], p), E = EYES[sin], w = o.windup || 0, S = SINS[sin];
  let a = (o.alpha === undefined ? 1 : o.alpha) * (o.dim || sin === "sloth" ? 0.5 : 1);
  if (a <= 0.01) return;
  const blink = Math.sin((o.t || 0) * 0.7 + x * 0.13) > 0.985 ? 0.15 : 1; a *= blink;
  const ha = J.ha + (p.spin || 0);
  for (let i = 0; i < 2; i++) {
    const q = figToWorld(J, p, x, y, dir, HL(J, E[0] - i * E[2], E[1] - i * 0.35)), r = E[3] * (i ? 0.8 : 1) * (1 + w * 0.5);
    glow(q[0], q[1], r * 4.5 * (1 + w * 1.4), w > 0 ? S.color : "#e8e8f0", a * (0.55 + 0.45 * w));
    const c = Math.cos(ha) * dir, s = Math.sin(ha) + E[4] * dir * 0.0, sl = E[4];
    const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a;
    poly([q[0] - c * r, q[1] - Math.sin(ha) * r + sl * r * 0.6, q[0] + c * r * 0.2, q[1] - r * 0.55, q[0] + c * r, q[1] + Math.sin(ha) * r - sl * r * 0.6, q[0] - c * r * 0.2, q[1] + r * 0.45], w > 0.4 ? "#ffffff" : "#e8e8f0");
    ctx.globalAlpha = pa;
  }
}
// Where a joint of a demon is in the world: head, hF, hB, fF, fB, hip, neck, sh, eF, eB, kF, kB.
function demonJoint(sin, x, y, dir, p, name) {
  const B = DEMON_BODY[sin], J = solve(B, p);
  let pt = J[name] || J.hip;
  if (B.hover !== undefined && (name === "fF" || name === "fB")) pt = [J.hip[0], J.hip[1] + B.hover];
  return figToWorld(J, p, x, y, dir < 0 ? -1 : 1, pt);
}

// ---- The demons' moves ---------------------------------------------------------------------------------
// Each sin has its own way of standing (DS), and every move is built from it, so the same move
// looks different on each: Avarice scuttles, Wrath charges head down, Lust glides, Sloth drifts.
const DS = {
  pride: { p: { lean: -0.06, head: -0.32, sF: 0.25, eF: 0.5, sB: -0.2, eB: 0.6, hF: 0.06, kF: 0.05, hB: -0.08, kB: 0.08, wa: -1.75, wl: 0.05 }, A: 0.38, K: 0.9 },
  avarice: { p: { lean: 0.95, head: -0.75, sF: 0.55, eF: 0.55, sB: 0.3, eB: 0.6, hF: 0.55, kF: 1.1, hB: 0.05, kB: 0.8 }, A: 0.42, K: 1.1 },
  lust: { p: { lean: -0.04, head: 0.05, sF: 0.5, eF: 1.0, sB: -0.4, eB: 0.8, hF: 0.15, kF: 0.05, hB: -0.25, kB: 0.4 }, A: 0.45, K: 0.7 },
  envy: { p: { lean: 0.28, head: 0.3, sF: 0.4, eF: 0.9, sB: 0.1, eB: 1.2, hF: 0.35, kF: 0.6, hB: -0.25, kB: 0.5 }, A: 0.5, K: 1.0 },
  gluttony: { p: { lean: -0.1, head: 0.05, sF: 0.75, eF: 0.4, sB: 0.55, eB: 0.5, hF: 0.25, kF: 0.15, hB: -0.25, kB: 0.15 }, A: 0.3, K: 0.6 },
  wrath: { p: { lean: 0.5, head: -0.35, sF: 0.45, eF: 0.8, sB: 0.15, eB: 0.9, hF: 0.4, kF: 0.7, hB: -0.3, kB: 0.6 }, A: 0.55, K: 1.2 },
  sloth: { p: { lean: 0.3, head: 0.75, sF: 0.25, eF: 0.15, sB: 0.1, eB: 0.2, hF: 0, kF: 0, hB: 0, kB: 0 }, A: 0, K: 0 },
};
const DD = (sin, o) => pose(Object.assign({}, DS[sin].p, o));
const GAIT_H = [1, 0.8, 0.3, -0.35, -0.9, -0.85, -0.1, 0.7], GAIT_K = [0.05, 0.35, 0.15, 0.1, 0.3, 0.9, 1.0, 0.4];
const WING_A = [-1.65, -2.4, -3.4, -3.9, -3.6, -3.0, -2.4, -1.9], WING_L = [1, 1, 0.95, 0.85, 0.6, 0.55, 0.7, 0.9];
function gait(sin, u, A, K, extra) {
  const b = DS[sin].p, mid = (b.hF + b.hB) / 2, k0 = Math.min(b.kF, b.kB);
  const gF = loop(GAIT_H, u), gB = loop(GAIT_H, u + 0.5);
  return DD(sin, Object.assign({ hF: mid + A * gF, kF: k0 + K * loop(GAIT_K, u), hB: mid + A * gB, kB: k0 + K * loop(GAIT_K, u + 0.5), sF: b.sF - 0.4 * A * gF, sB: b.sB - 0.4 * A * gB }, extra));
}
// The poses each sin strikes from: [the wind-up, the blow].
const DSTRIKE = {
  pride: [{ lean: -0.2, head: -0.4, sF: 2.8, eF: 0.4, wa: -2.5, wl: 1, hF: 0.2, kF: 0.3 }, { lean: 0.35, head: 0.0, sF: 1.2, eF: 0.1, wa: -0.9, wl: 0.8, hF: 0.6, kF: 0.6, hB: -0.4, kB: 0.2 }],
  avarice: [{ lean: 0.7, head: -0.6, sF: -0.7, eF: 0.6, sB: -0.9, eB: 0.6, hF: 0.7, kF: 1.5, hB: 0.1, kB: 1.2 }, { lean: 1.0, head: -0.8, sF: 1.6, eF: 0.15, sB: 1.45, eB: 0.3, hF: 0.9, kF: 0.8, hB: -0.4, kB: 0.4 }],
  lust: [{ lean: -0.2, head: -0.1, sF: 2.6, eF: 0.8, sB: -0.8, hF: 0.1, kF: 0.1, hB: -0.3, kB: 0.4 }, { lean: 0.2, head: 0.1, sF: 1.3, eF: 0.0, sB: -1.2, hF: 0.4, kF: 0.2, hB: -0.4, kB: 0.3 }],
  envy: [{ lean: 0.05, head: 0.2, sF: -0.6, eF: 1.7, sB: 0.6, eB: 1.6, hF: 0.25, kF: 0.6, hB: -0.35, kB: 0.6 }, { lean: 0.45, head: 0.2, sF: 1.55, eF: 0.05, sB: -0.6, eB: 0.8, hF: 0.8, kF: 0.7, hB: -0.55, kB: 0.1 }],
  gluttony: [{ lean: -0.3, head: -0.2, sF: 2.6, eF: 0.4, sB: 2.4, eB: 0.5, jaw: 0.3 }, { lean: 0.32, head: 0.2, sF: 1.1, eF: 0.1, sB: 1.0, eB: 0.2, jaw: 0.7, hF: 0.45, kF: 0.4 }],
  wrath: [{ lean: -0.05, head: -0.55, sF: 2.8, eF: 0.4, sB: 2.6, eB: 0.5, hF: 0.3, kF: 0.4, hB: -0.3, kB: 0.4 }, { lean: 0.85, head: 0.2, sF: 1.0, eF: 0.0, sB: 0.9, eB: 0.1, hF: 0.7, kF: 0.9, hB: -0.45, kB: 0.4 }],
  sloth: [{ lean: 0.2, head: 0.6, sF: 1.0, eF: 0.4, sB: 0.6, eB: 0.4, lift: 3 }, { lean: 0.6, head: 0.6, sF: 1.65, eF: 0.0, sB: 1.2, eB: 0.2, lift: 1 }],
};
const DEMON_ANIM = {
  idle: (u, t, sin) => {
    const b = DS[sin].p, s = Math.sin(TAU * u), s2 = Math.sin(TAU * u + 1.3);
    const sway = sin === "lust" ? 0.09 * Math.sin(TAU * u) : 0;
    return DD(sin, { lean: b.lean + 0.03 * s + sway, head: b.head + 0.05 * s2 - sway * 0.8, sF: b.sF + 0.08 * s2, sB: b.sB + 0.08 * s, eF: b.eF + 0.1 * s, wl: (b.wl || 0) + (sin === "pride" ? 0.06 * (s + 1) : 0), lift: sin === "sloth" ? 1.8 * s : 0, jaw: sin === "gluttony" ? 0.08 * (s2 + 1) : 0 });
  },
  walk: (u, t, sin) => {
    const s = DS[sin];
    if (sin === "sloth") return DEMON_ANIM.float(u, t, sin);
    const bob = Math.cos(TAU * 2 * u);
    return gait(sin, u, s.A, s.K, { lean: s.p.lean + 0.04 * bob + (sin === "gluttony" ? 0.06 * Math.sin(TAU * u) : 0), head: s.p.head - 0.03 * bob, wl: sin === "pride" ? 0.12 : 0 });
  },
  // The run; Wrath's is its charge, head down and horns first; Avarice goes on all fours.
  run: (u, t, sin) => {
    const s = DS[sin], f = loop(GAIT_H, u);
    if (sin === "sloth") return Object.assign(DEMON_ANIM.float(u, t, sin), { lean: 0.6 });
    if (sin === "pride") return gait(sin, u, 0.75, 1.4, { lean: 0.3, head: -0.15, air: 0.3, wa: -2.4, wl: 0.55, sF: 0.9, sB: 0.5 });
    if (sin === "wrath") return gait(sin, u, 0.85, 1.8, { lean: 0.95, head: -0.1, air: 0.35, sF: -0.7 + 0.3 * f, eF: 0.6, sB: -0.9 - 0.3 * f, eB: 0.6 });
    if (sin === "avarice") return gait(sin, u, 0.8, 1.6, { lean: 1.3, head: -1.1, air: 0.3, sF: 0.2 + 0.7 * f, eF: 0.2, sB: 0.2 - 0.7 * f, eB: 0.2 });
    if (sin === "lust") return gait(sin, u, 0.6, 0.6, { lean: 0.18, head: 0.0, air: 0.25, sF: -1.2, eF: 0.6, sB: -1.4, eB: 0.5 });
    if (sin === "gluttony") return gait(sin, u, 0.5, 1.0, { lean: 0.1 + 0.05 * Math.cos(TAU * 2 * u), air: 0.2, sF: 1.0, sB: 0.9 });
    return gait(sin, u, 0.85, 1.6, { lean: s.p.lean + 0.25, air: 0.3, sF: -0.6 - 0.5 * f, eF: 1.2, sB: -0.6 + 0.5 * f, eB: 1.2 });
  },
  // Flight: Pride's wingbeat, a quick downstroke and a slow recovery.
  fly: (u, t, sin) => {
    const wa = loop(WING_A, u), wl = loop(WING_L, u), bob = -Math.sin(TAU * u + 0.6);
    if (sin !== "pride") return DD(sin, { air: 1, lift: 2 * bob, sF: 2.4, eF: 0.4, sB: 2.2, eB: 0.5, hF: 0.4, kF: 0.8, hB: -0.2, kB: 0.6 });
    return DD(sin, { air: 1, lift: 2.2 * bob, lean: 0.25 + 0.04 * bob, head: -0.3, wa, wl, sF: 0.9 + 0.15 * bob, eF: 0.35, sB: 0.6 + 0.15 * bob, eB: 0.4, hF: -0.2, kF: 0.6, hB: -0.45, kB: 0.4 });
  },
  float: (u, t, sin) => { const s = Math.sin(TAU * u), s2 = Math.sin(TAU * u + 1.1); return DD(sin, { lift: 2.5 * s, lean: DS[sin].p.lean + 0.05 * s2, head: DS[sin].p.head + 0.06 * s, sF: DS[sin].p.sF + 0.12 * s2, sB: DS[sin].p.sB + 0.1 * s, eF: DS[sin].p.eF + 0.1 * s, air: sin === "sloth" ? 0 : 1 }); },
  // Tumbling in the air, flung by a blow.
  launched: (u, t, sin) => { const s = Math.sin(TAU * u * 2); return DD(sin, { air: 1, spin: -TAU * u, lean: 0.2, head: 0.4, sF: 2.2 + 0.4 * s, eF: 0.5, sB: 2.6 - 0.4 * s, eB: 0.4, hF: 0.9 + 0.3 * s, kF: 1.2, hB: -0.3 - 0.3 * s, kB: 1.0, wa: -3.2, wl: 0.6, jaw: 0.5 }); },
  // Lying on its back.
  down: (u, t, sin) => {
    const tw = 0.04 * Math.sin(TAU * u);
    if (sin === "sloth") return DD(sin, { lift: -12, lean: 1.25, head: 0.4, sF: 1.3 + tw, eF: 0.1, sB: 1.1, eB: 0.1 });
    return DD(sin, { lean: -1.5, head: 0.3 + tw, sF: -1.6, eF: 0.3, sB: -1.9 + tw, eB: 0.3, hF: 1.42, kF: 0.3, hB: 1.2, kB: 0.85, wa: -3.0, wl: 0.8, jaw: 0.3 });
  },
  // Broken: kneeling, swaying, waiting for the finisher.
  broken: (u, t, sin) => {
    const s = Math.sin(TAU * u), s2 = Math.sin(TAU * u + 1.4);
    if (sin === "sloth") return DD(sin, { lift: -6, lean: 0.45 + 0.07 * s, head: 1.0, sF: 0.1, eF: 0.1, sB: 0.0, eB: 0.1 });
    return DD(sin, { lean: 0.35 + 0.08 * s, head: 0.6 + 0.08 * s2, sF: 0.3 + 0.1 * s2, eF: 0.2, sB: 0.1 + 0.1 * s, eB: 0.2, hF: 1.35, kF: 1.4, hB: -0.2, kB: 1.8, wa: -3.4, wl: 0.4, jaw: 0.2 });
  },
  stunned: (u, t, sin) => { const s = Math.sin(TAU * u), s2 = Math.sin(TAU * u * 2); const b = DS[sin].p; return DD(sin, { lean: b.lean + 0.15 * s, head: 0.55 + 0.3 * s2, sF: 0.15, eF: 0.2, sB: -0.05, eB: 0.2, hF: b.hF + 0.1 * s, kF: b.kF + 0.2, hB: b.hB - 0.1 * s, kB: b.kB + 0.25, wa: -2.6, wl: 0.4, jaw: 0.4 }); },
  // The telegraph before a blow, held at its end.
  windup: (u, t, sin) => keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [1, DD(sin, DSTRIKE[sin][0])]], u),
  strike: (u, t, sin) => keyPose([[0, DD(sin, DSTRIKE[sin][0])], [0.25, DD(sin, Object.assign({}, DSTRIKE[sin][0], { lean: DSTRIKE[sin][0].lean - 0.08 }))], [0.4, DD(sin, DSTRIKE[sin][1]), "in"], [0.6, DD(sin, DSTRIKE[sin][1])], [1, DEMON_ANIM.idle(0, t, sin)]], u),
  throw: (u, t, sin) => {
    const b = DS[sin].p;
    return keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.3, DD(sin, { lean: b.lean - 0.25, sF: -2.4, eF: 0.6, sB: b.sB + 0.6, hF: b.hF + 0.15, hB: b.hB - 0.1 })], [0.3001, DD(sin, { lean: b.lean - 0.25, sF: 3.88, eF: 0.6, sB: b.sB + 0.6, hF: b.hF + 0.15, hB: b.hB - 0.1 }), "lin"], [0.45, DD(sin, { lean: b.lean + 0.3, sF: 1.8, eF: 0.1, sB: b.sB - 0.3, hF: b.hF + 0.35, kF: b.kF + 0.3 }), "in"], [0.65, DD(sin, { lean: b.lean + 0.35, sF: 0.8, eF: 0.4 })], [1, DEMON_ANIM.idle(0, t, sin)]], u);
  },
  pickup: (u, t, sin) => { const b = DS[sin].p; return keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.5, DD(sin, { lean: b.lean + 0.6, head: b.head + 0.3, sF: 0.25, eF: 0.1, hF: b.hF + 0.8, kF: b.kF + 1.4, hB: b.hB + 0.3, kB: b.kB + 1.2, lift: sin === "sloth" ? -10 : 0 })], [0.6, DD(sin, { lean: b.lean + 0.55, head: b.head + 0.3, sF: 0.4, eF: 0.6, hF: b.hF + 0.75, kF: b.kF + 1.3, hB: b.hB + 0.3, kB: b.kB + 1.1, lift: sin === "sloth" ? -9 : 0 })], [1, DEMON_ANIM.idle(0, t, sin)]], u); },
  hurt: (u, t, sin) => { const b = DS[sin].p; return keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.15, DD(sin, { lean: b.lean - 0.5, head: b.head - 0.5, sF: 2.0, eF: 0.4, sB: 2.3, eB: 0.5, hF: b.hF + 0.3, hB: b.hB - 0.2, kB: b.kB + 0.4, wa: -2.6, wl: 0.9, jaw: 0.9 }), "out"], [0.5, DD(sin, { lean: b.lean + 0.2, head: b.head + 0.4 })], [1, DEMON_ANIM.idle(0, t, sin)]], u); },
  getUp: (u, t, sin) => keyPose([[0, DEMON_ANIM.down(0, t, sin)], [0.4, DD(sin, { lean: -0.3, head: 0.3, sF: -0.9, eF: 0.3, hF: 1.6, kF: 2.4, hB: 1.3, kB: 2.2, lift: sin === "sloth" ? -8 : 0 })], [0.7, DEMON_ANIM.broken(0, t, sin)], [1, DEMON_ANIM.idle(0, t, sin)]], u),
  // Climbing up out of a crack in the rock: from below the ground (the caller clips it to the
  // rock's face), the hands on the lip, a heave, a knee up, and it stands.
  emerge: (u, t, sin) => {
    const h = DEMON_SIZE[sin].h, b = DS[sin].p;
    if (sin === "sloth") return keyPose([[0, DD(sin, { lift: -h - 4, head: 1.1, sF: 2.6, eF: 0.3, sB: 2.4, eB: 0.3 })], [0.7, DD(sin, { lift: -h * 0.2, head: 0.9, sF: 1.2, eF: 0.3, sB: 1.0 })], [1, DEMON_ANIM.idle(0, t, sin)]], u);
    return keyPose([[0, DD(sin, { lift: -h - 6, lean: 0.1, head: -0.5, sF: 3.0, eF: 0.2, sB: 2.9, eB: 0.2, hF: 0.1, kF: 0.3, hB: -0.1, kB: 0.4, wl: 0 })],
      [0.35, DD(sin, { lift: -h * 0.6, lean: 0.4, head: -0.4, sF: 2.4, eF: 1.2, sB: 2.3, eB: 1.3, hF: 0.2, kF: 0.4, hB: -0.2, kB: 0.6, wl: 0 })],
      [0.65, DD(sin, { lift: -h * 0.15, lean: 0.85, head: -0.2, sF: 0.6, eF: 0.4, sB: 0.4, eB: 0.5, hF: 1.6, kF: 2.4, hB: -0.2, kB: 0.8, wl: 0.3 })],
      [0.85, DD(sin, { lean: b.lean + 0.35, sF: 0.6, hF: b.hF + 0.6, kF: b.kF + 1.0, hB: b.hB + 0.2, kB: b.kB + 0.9, wl: 0.6 })], [1, DEMON_ANIM.idle(0, t, sin)]], u);
  },
  // Lust casting its ribbon, and holding the pull.
  tether: (u, t, sin) => keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.3, DD(sin, { lean: -0.15, head: -0.1, sF: 2.7, eF: 0.6, sB: -0.6, hF: 0.1, kF: 0.1, hB: -0.35, kB: 0.4 })], [0.5, DD(sin, { lean: 0.15, head: 0.1, sF: 1.6, eF: 0.0, sB: -1.0, hF: 0.45, kF: 0.25, hB: -0.4, kB: 0.2 }), "in"], [1, DD(sin, { lean: -0.25, head: -0.05, sF: 1.45, eF: 0.1, sB: -1.3, eB: 0.6, hF: 0.4, kF: 0.3, hB: -0.5, kB: 0.25 })]], u),
  // Gluttony's swallow: the mouth thrown wide, the lunge, the gulp.
  swallow: (u, t, sin) => keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.3, DD(sin, { jaw: 1, lean: -0.22, head: -0.35, sF: 1.6, eF: 0.4, sB: 1.4, eB: 0.5 })], [0.55, DD(sin, { jaw: 1, lean: 0.22, head: 0.2, sF: 1.3, eF: 0.8, sB: 1.2, eB: 0.8, hF: 0.45, kF: 0.4 })], [0.7, DD(sin, { jaw: 0, lean: -0.12, head: -0.1, sF: 0.9, sB: 0.7 }), "in"], [0.85, DD(sin, { jaw: 0.15, lean: -0.05 })], [1, DEMON_ANIM.idle(0, t, sin)]], u),
  spit: (u, t, sin) => keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.3, DD(sin, { jaw: 0.1, lean: -0.3, head: -0.3, sF: 1.0, sB: 0.8 })], [0.5, DD(sin, { jaw: 1, lean: 0.3, head: 0.1, sF: 0.5, sB: 0.4, hF: 0.45, kF: 0.4 }), "in"], [0.7, DD(sin, { jaw: 0.6, lean: 0.25, head: 0.05 })], [1, DEMON_ANIM.idle(0, t, sin)]], u),
  // Envy's mirror: arms crossed before the plate, a flash, and back.
  mirror: (u, t, sin) => { const blk = DD(sin, { lean: 0.05, head: 0.15, sF: 1.4, eF: 1.8, sB: 1.2, eB: 2.0, hF: 0.4, kF: 0.6, hB: -0.35, kB: 0.5 }); return keyPose([[0, DEMON_ANIM.idle(0, t, sin)], [0.15, blk, "out"], [0.7, blk], [1, DEMON_ANIM.idle(0, t, sin)]], u); },
};
const DEMON_HIT = { strike: 0.4, throw: 0.45, pickup: 0.5, spit: 0.5 };
const DEMON_CYCLIC = ["idle", "walk", "run", "fly", "float", "launched", "down", "broken", "stunned"];

// ---- Things lying about, and thrown ---------------------------------------------------------------------
const OBJECTS = { stone: { id: "stone", name: "Stone", r: 6 }, jar: { id: "jar", name: "Jar", r: 7 }, beam: { id: "beam", name: "Beam", r: 4, len: 34 }, skull: { id: "skull", name: "Skull", r: 5 }, brand: { id: "brand", name: "Burning brand", r: 3, len: 22 }, flask: { id: "flask", name: "Holy water", r: 4 } };
const OBJ_PAINT = {
  stone: (lit) => {
    poly([-6, 1.5, -4.5, -3.5, -0.5, -5.5, 4.5, -4, 6.2, 0.5, 4, 4.5, -2, 5], lit ? "#5d554b" : C.ink);
    if (lit) { poly([-4.5, -3.5, -0.5, -5.5, 4.5, -4, 1, -1.5, -3, -0.5], "#877b6b"); poly([1, -1.5, 4.5, -4, 6.2, 0.5, 4, 4.5], "#3e3730"); }
  },
  jar: (lit) => {
    poly([-2.6, -7, 2.6, -7, 2.2, -5.2, 5.4, -3, 6.2, 1.5, 4.4, 5.6, 2.2, 7, -2.2, 7, -4.4, 5.6, -6.2, 1.5, -5.4, -3, -2.2, -5.2], lit ? "#9a5636" : C.ink);
    poly([-6.2, 0, -7.6, -2.4, -7, -3.6, -5.2, -2.4], lit ? "#7a4028" : C.ink); poly([6.2, 0, 7.6, -2.4, 7, -3.6, 5.2, -2.4], lit ? "#7a4028" : C.ink);
    if (lit) { poly([-5.4, -3, -2.2, -5.2, -1, -3, -3.6, 2.5, -6.2, 1.5], "#c27a50"); poly([2.2, -5.2, 5.4, -3, 6.2, 1.5, 4.4, 5.6, 2.2, 7, 2.6, 0], "#6e3a22"); rect(-2.6, -7.6, 5.2, 1.2, "#b86a44"); rect(-1.8, -6.6, 3.6, 0.9, "#24130c"); }
  },
  beam: (lit) => {
    poly([-17, -3.5, 16, -4, 17, -1, 16.5, 3.5, -16, 4, -17.2, 1], lit ? "#5e4228" : C.ink);
    if (lit) { poly([-17, -3.5, 16, -4, 15.5, -1.6, -16.5, -1.2], "#7e5c3a"); line(-12, 1, 6, 1.6, "#3e2a18", 0.6); line(-4, 2.6, 12, 2.2, "#3e2a18", 0.5); poly([16, -4, 17, -1, 16.5, 3.5, 15.4, 3.4, 15.6, -3.6], "#a07a50"); }
  },
  skull: (lit) => {
    poly([-4.6, 1, -4.8, -2.6, -2.6, -4.8, 1.2, -5, 4.2, -3, 5.2, 0, 4.6, 2.2, 3.4, 2.6, 3.2, 4.6, -1, 4.8, -2.4, 3, -4, 2.8], lit ? "#d8d2c4" : C.ink);
    if (lit) {
      poly([-4.6, 1, -4.8, -2.6, -2.6, -4.8, -1.2, -2, -2.8, 2.6], "#a8a090");
      poly([1.2, -1.6, 3.6, -1.4, 3.4, 0.6, 1.4, 0.8], "#1c1610"); poly([-1.2, -1.4, 0.4, -1.4, 0.2, 0.6, -1.2, 0.4], "#1c1610"); poly([2.2, 1.4, 3, 2.6, 1.6, 2.6], "#1c1610");
      line(0.4, 3.4, 3.2, 3.4, "#5a5246", 0.5);
    }
  },
  brand: (lit, t) => {
    poly([-11, -1.6, 9, -2.2, 11, -1, 11, 1.2, 9, 2.2, -11, 1.4], lit ? "#4e3420" : C.ink);
    if (lit) { poly([-11, -1.6, 9, -2.2, 9, -0.6, -11, -0.2], "#6e4c2e"); }
    poly([6.5, -2.2, 11, -1, 11, 1.2, 6.5, 2.2], lit ? "#1a0e08" : C.ink);
    for (let i = 0; i < 3; i++) { const k = 0.5 + 0.5 * Math.sin((t || 0) * (7 + i * 3) + i * 2); rect(7.2 + i * 1.3, -1.2 + (i % 2) * 1.3, 1.1, 0.9, hexA(C.ember, 0.5 + 0.5 * k)); }
  },
  flask: (lit) => {
    poly([-1.2, -5.6, 1.2, -5.6, 1.2, -3, 3.8, -0.8, 4, 2.6, 2.4, 4.4, -2.4, 4.4, -4, 2.6, -3.8, -0.8, -1.2, -3], lit ? "#8ab4cc" : "#0b0d10");
    if (lit) { poly([-3.6, 0.6, 3.6, 0.6, 3.8, 2.6, 2.4, 4.2, -2.4, 4.2, -3.8, 2.6], "#cfe9ff"); poly([-3.2, -0.6, -1.6, -2.4, -1.4, 2.6, -2.8, 3], "#ffffff"); rect(-1.3, -6.8, 2.6, 1.6, "#8a6a48"); }
    else { line(-3.6, 1, 3.6, 1, hexA(C.holy, 0.35), 0.6); }
  },
};
// A thing at (x, y), turned rot. o = { lit, t, alpha }. The brand always burns; the flask of holy
// water always glows faintly, for holy things are seen in the dark.
function drawObject(kind, x, y, rot, o) {
  o = o || {}; const lit = clamp(o.lit || 0, 0, 1), t = o.t || 0, paint = OBJ_PAINT[kind]; if (!paint) return;
  if (kind === "flask") glow(x, y, 13, C.holy, (0.24 + 0.06 * Math.sin(t * 2.2)) * (o.alpha === undefined ? 1 : o.alpha));
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (lit > 0 && lit < 1) { paint(0, t); ctx.globalAlpha *= lit; paint(1, t); } else paint(lit, t);
  ctx.restore();
  if (kind === "brand") { const c = Math.cos(rot || 0), s = Math.sin(rot || 0); drawFlame(x + c * 10, y + s * 10, 0.42, t + x * 0.01, {}); }
}
// Pride's shard: a violet crystal it throws down from above.
function drawShard(x, y, rot, lit) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  if (lit) {
    glow(0, 0, 16, SINS.pride.color, 0.5);
    poly([9, 0, 2, -2.8, -7, -1.4, -8.5, 0.6, -2, 2.8], SINS.pride.color);
    poly([9, 0, 2, -2.8, -7, -1.4, -1, -0.2], "#e6ccff"); poly([9, 0, -1, -0.2, -8.5, 0.6, -2, 2.8], SINS.pride.dark);
  } else {
    glow(0, 0, 9, SINS.pride.color, 0.16);
    poly([9, 0, 2, -2.8, -7, -1.4, -8.5, 0.6, -2, 2.8], C.ink); line(9, 0, 2, -2.8, hexA(SINS.pride.light, 0.55), 0.6);
  }
  ctx.restore();
}

// ---- The backdrop ------------------------------------------------------------------------------------------
// The Limbo mist: pale high and far, darker below, and layer on layer of angular mountains and
// crags in greys that darken toward us, each sliding against the camera at its own depth, with
// slow bands of fog drifting between them. The layers are drawn once to canvases of their own and
// laid on as pictures; a frame costs a handful of drawImage calls.
const BACK_LH = 330, BACK_BASE = 236;      // the height of a layer's picture, and its ridge's foot in it
const BACK_LAYERS = [
  { f: 0.03, color: "#8b8e91", fog: "#a3a5a7", y: 150, amp: 84, w: 1500, seed: 11, step: [26, 92], spires: 3, rocks: 0, sharp: 0.7 },
  { f: 0.075, color: "#737679", fog: "#909295", y: 186, amp: 90, w: 1400, seed: 23, step: [22, 74], spires: 2, rocks: 1, sharp: 0.8 },
  { f: 0.14, color: "#5a5d61", fog: "#7a7d80", y: 222, amp: 84, w: 1300, seed: 37, step: [18, 62], spires: 3, rocks: 2, sharp: 0.9 },
  { f: 0.24, color: "#404246", fog: "#626568", y: 262, amp: 74, w: 1200, seed: 41, step: [16, 52], spires: 2, rocks: 2, sharp: 1 },
  { f: 0.38, color: "#2a2b2e", fog: "#46484b", y: 306, amp: 66, w: 1100, seed: 53, step: [14, 46], spires: 2, rocks: 0, sharp: 1 },
];
const BACK = { layers: null, res: 0, sky: null, band: null };
function buildBackdrop(res) {
  BACK.res = res; BACK.layers = [];
  BACK_LAYERS.forEach((L, i) => {
    const r = seeded(L.seed), lr = res * (i < 2 ? 0.6 : i < 3 ? 0.8 : 1);
    const c = document.createElement("canvas"); c.width = Math.ceil(L.w * lr); c.height = Math.ceil(BACK_LH * lr);
    const g = c.getContext("2d"); g.scale(lr, lr);
    // The ridge: straight runs between sharp peaks and notches, closing on itself so the picture tiles.
    const pts = []; let x = 0; const y0 = BACK_BASE - L.amp * 0.45;
    pts.push([0, y0]);
    while (x < L.w - L.step[0] * 1.5) {
      x += L.step[0] + r() * (L.step[1] - L.step[0]); if (x > L.w - L.step[0]) break;
      const peak = r() < 0.5;
      const y = peak ? BACK_BASE - L.amp * (0.55 + 0.45 * Math.pow(r(), 0.8)) : BACK_BASE - L.amp * (0.1 + 0.4 * r());
      if (peak && r() < 0.35) pts.push([x - 3 - r() * 4, y + 6 + r() * 8]);        // a jutting crag below a peak
      pts.push([x, y]);
    }
    pts.push([L.w, y0]);
    g.beginPath(); g.moveTo(0, BACK_LH); for (const q of pts) g.lineTo(q[0], q[1]); g.lineTo(L.w, BACK_LH); g.closePath();
    g.fillStyle = L.color; g.fill();
    // Spires: tall thin crags standing up out of the ridge, leaning a little.
    for (let s = 0; s < L.spires; s++) {
      const sx = 60 + r() * (L.w - 120), sh = 70 + r() * 90, sw = 10 + r() * 16, lean = (r() - 0.5) * 18, by = BACK_BASE - L.amp * 0.3;
      g.beginPath(); g.moveTo(sx - sw, by); g.lineTo(sx - sw * 0.45, by - sh * 0.55); g.lineTo(sx - sw * 0.3 + lean * 0.7, by - sh * 0.8); g.lineTo(sx + lean, by - sh);
      g.lineTo(sx + sw * 0.25 + lean * 0.6, by - sh * 0.72); g.lineTo(sx + sw * 0.6, by - sh * 0.4); g.lineTo(sx + sw, by); g.closePath(); g.fill();
    }
    // Floating slabs: flat-topped rocks hanging in the mist, their undersides broken to points.
    for (let s = 0; s < L.rocks; s++) {
      const rx = 80 + r() * (L.w - 160), ry = 30 + r() * 70, rw = 26 + r() * 46, rd = rw * (0.5 + r() * 0.4);
      g.beginPath(); g.moveTo(rx - rw / 2, ry); g.lineTo(rx + rw / 2, ry - 2); g.lineTo(rx + rw * 0.35, ry + rd * 0.35); g.lineTo(rx + rw * 0.1, ry + rd * 0.5);
      g.lineTo(rx - rw * 0.05, ry + rd); g.lineTo(rx - rw * 0.2, ry + rd * 0.45); g.lineTo(rx - rw * 0.42, ry + rd * 0.3); g.closePath(); g.fill();
    }
    // The foot of each layer pales into the valley mist, so the layer before it stands out.
    const gr = g.createLinearGradient(0, BACK_BASE - L.amp * 0.4, 0, BACK_LH);
    gr.addColorStop(0, hexA(L.fog, 0)); gr.addColorStop(1, hexA(L.fog, 1));
    g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(0, 0, L.w, BACK_LH);
    BACK.layers.push(c);
  });
  // The sky: a tall strip of the mist's gradient, stretched to the screen.
  const s = document.createElement("canvas"); s.width = 2; s.height = 256;
  const sg = s.getContext("2d"), gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#b3b5b6"); gr.addColorStop(0.4, "#a3a5a7"); gr.addColorStop(0.75, "#8a8d90"); gr.addColorStop(1, "#66696d");
  sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256); BACK.sky = s;
  // A band of fog: soft at every edge.
  const b = document.createElement("canvas"); b.width = 256; b.height = 48;
  const bg = b.getContext("2d"), rg = bg.createRadialGradient(128, 24, 0, 128, 24, 128);
  rg.addColorStop(0, "rgba(214,216,218,0.9)"); rg.addColorStop(0.5, "rgba(214,216,218,0.4)"); rg.addColorStop(1, "rgba(214,216,218,0)");
  bg.setTransform(1, 0, 0, 0.1875, 0, 19.5); bg.fillStyle = rg; bg.fillRect(0, 0, 256, 256); BACK.band = b;
}
// Draw the whole screen behind the world. (cx, cy): the camera's centre in world pixels; zoom;
// t: time; o.warm = { x, y, r } (screen): a faint warmth in the mist about the torch; o.y0: the
// camera height at which the mountains sit at rest (300 by default).
function drawBackdrop(cx, cy, zoom, t, o) {
  o = o || {}; zoom = zoom || 1; t = t || 0;
  const m = ctx.getTransform(), pr = clamp(Math.hypot(m.a, m.b), 1, 1.6);
  if (!BACK.layers || Math.abs(pr - BACK.res) > 0.25) buildBackdrop(pr);
  ctx.drawImage(BACK.sky, 0, 0, W, H);
  const y0 = o.y0 === undefined ? 300 : o.y0;
  for (let i = 0; i < BACK_LAYERS.length; i++) {
    const L = BACK_LAYERS[i], img = BACK.layers[i], s = 1 + (zoom - 1) * Math.min(1, L.f * 2.2);
    const lw = L.w * s, lh = BACK_LH * s;
    let ox = -(cx * L.f * s) % lw; if (ox > 0) ox -= lw;
    const top = H * 0.5 + (L.y - BACK_BASE - H * 0.5) * s - clamp((cy - y0) * L.f * 0.9, -70, 70);
    for (let x = ox; x < W; x += lw) ctx.drawImage(img, x, top, lw + 0.6, lh);
    if (top + lh < H) rect(0, top + lh - 0.5, W, H - top - lh + 1, L.fog);
    // Fog drifting in front of this layer.
    if (i < 4) {
      for (let j = 0; j < 2; j++) {
        const bw = W * (0.9 + 0.5 * hash2(i, j)), bh = 26 + 30 * hash2(j, i, 3), span = W + bw;
        const bx = ((hash2(i, j, 7) * span + t * (4 + 5 * hash2(i, j, 9)) * (j ? 1 : -1) - cx * L.f * 1.4) % span + span) % span - bw;
        const by = top + BACK_BASE * s - 20 - j * 34 + Math.sin(t * 0.15 + i + j) * 6;
        const pa = ctx.globalAlpha; ctx.globalAlpha = pa * (0.22 + 0.12 * hash2(i, j, 5)); ctx.drawImage(BACK.band, bx, by - bh / 2, bw, bh); ctx.globalAlpha = pa;
      }
    }
  }
  if (o.warm) glow(o.warm.x, o.warm.y, o.warm.r, C.amber, 0.13);
}
