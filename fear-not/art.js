"use strict";
// Fear Not: the art. Everything is drawn here in code: flat shapes, clean edges, strong rim
// light from the neon. The figures are jointed, like SaintStyle Turbo's saints, but long and
// slender, after El Greco, with arms and legs a little longer than life, so that in a fight
// the limbs fly wide and the kung fu reads from across the screen.

// ---- The figures --------------------------------------------------------------------------------
// A pose is a set of angles in radians. 0 hangs straight down from the joint; a positive angle
// swings toward the way the figure faces. Knees bend back, elbows forward. `lean` tips the body,
// `spin` turns the whole figure about the hips (flips and rolls), `lift` raises it off the
// ground. Wings: `wa` is the angle of the wing from the shoulder (screen radians, facing right),
// `wl` how far it is opened.
const POSE0 = { lean: 0.04, head: 0, sF: 0.15, eF: 0.35, sB: -0.15, eB: 0.4, hF: 0.12, kF: 0.08, hB: -0.12, kB: 0.12, spin: 0, lift: 0, wa: -1.95, wl: 0.3 };
const BODY = {
  priest: { thigh: 25, shin: 25, torso: 33, upper: 21, fore: 21, neck: 4, head: 7.2 },
  angel: { thigh: 29, shin: 30, torso: 38, upper: 25, fore: 24, neck: 5, head: 7.8 },
  demon: { thigh: 24, shin: 27, torso: 31, upper: 26, fore: 27, neck: 3, head: 7 },
  big: { thigh: 27, shin: 28, torso: 37, upper: 31, fore: 32, neck: 2, head: 7.5 },
  monk: { thigh: 25, shin: 25, torso: 33, upper: 21, fore: 21, neck: 4, head: 7.2 },
};
const pose = (o) => Object.assign({}, POSE0, o);
// Blend two poses (angles and all) by k.
function blendPose(a, b, k) { const o = {}; for (const key in POSE0) { const x = a[key] === undefined ? POSE0[key] : a[key], y = b[key] === undefined ? POSE0[key] : b[key]; o[key] = x + (y - x) * k; } return o; }
// A pose from keyframes [[u, pose], ...] at u in 0..1, eased between them.
function keyPose(keys, u) {
  let i = 0; while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const [u0, a] = keys[i], [u1, b] = keys[i + 1], k = smooth((u - u0) / Math.max(0.0001, u1 - u0));
  return blendPose(a, b, k);
}

// Where every joint is, for a body and a pose, with the feet at (0, 0) and the figure facing right.
function solve(B, p) {
  const leg = (h, k) => { const kx = Math.sin(h) * B.thigh, ky = Math.cos(h) * B.thigh, a2 = h - k; return [[kx, ky], [kx + Math.sin(a2) * B.shin, ky + Math.cos(a2) * B.shin]]; };
  const [kf, ff] = leg(p.hF, p.kF), [kb, fb] = leg(p.hB, p.kB);
  const hip = [0, -Math.max(ff[1], fb[1], 6) - p.lift];
  const J = { hip, kF: [hip[0] + kf[0], hip[1] + kf[1]], fF: [hip[0] + ff[0], hip[1] + ff[1]], kB: [hip[0] + kb[0], hip[1] + kb[1]], fB: [hip[0] + fb[0], hip[1] + fb[1]] };
  const ux = Math.sin(p.lean), uy = -Math.cos(p.lean);
  J.n = [Math.cos(p.lean), Math.sin(p.lean)];      // forward, square to the body
  J.neck = [hip[0] + ux * B.torso, hip[1] + uy * B.torso];
  J.sh = [hip[0] + ux * (B.torso - 4), hip[1] + uy * (B.torso - 4)];
  const arm = (s, e) => { const ex = J.sh[0] + Math.sin(s) * B.upper, ey = J.sh[1] + Math.cos(s) * B.upper, a2 = s + e; return [[ex, ey], [ex + Math.sin(a2) * B.fore, ey + Math.cos(a2) * B.fore]]; };
  [J.eF, J.hF] = arm(p.sF, p.eF); [J.eB, J.hB] = arm(p.sB, p.eB);
  J.ha = p.lean + p.head;
  J.head = [J.neck[0] + Math.sin(J.ha) * (B.neck + B.head), J.neck[1] - Math.cos(J.ha) * (B.neck + B.head)];
  return J;
}

function stroke(pts, c, w) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}
function shape(pts, c) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
const P2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const PA = (a, n, k) => [a[0] + n[0] * k, a[1] + n[1] * k];
// A shoe at the end of a shin, pointing the way the foot would.
function shoe(f, k, c, len) {
  const dx = f[0] - k[0], dy = f[1] - k[1], a = Math.atan2(-dx, dy);
  ctx.save(); ctx.translate(f[0], f[1]); ctx.rotate(a); ctx.beginPath(); ctx.ellipse((len || 9) * 0.35, 0.5, len || 9, 2.8, 0, 0, TAU); ctx.fillStyle = c; ctx.fill(); ctx.restore();
}

// Draw a figure: kind, feet at (x, y), scale s, facing dir (1 right, -1 left), a pose, and
// options: rim (the neon colour of the light down one side), rimX (from which side, in screen
// pixels), alpha, flipY (its reflection in the wet street), and whatever its painter wants.
function drawFigure(kind, x, y, s, dir, p, o) {
  o = o || {};
  const B = BODY[o.body || kind], J = solve(B, p), paint = PAINTERS[kind];
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.scale(s * dir, o.flipY ? -s * 0.62 : s);
  if (p.spin) { ctx.translate(J.hip[0], J.hip[1]); ctx.rotate(p.spin); ctx.translate(-J.hip[0], -J.hip[1]); }
  if (o.rim && !o.flipY) {
    ctx.save(); ctx.translate((o.rimX || -1.6) / (s * dir), (o.rimY || -0.8) / s);
    paint(J, p, o, null, o.rim); ctx.restore();
  }
  paint(J, p, o, true);
  ctx.restore();
  return J;
}
// Where a joint of a figure lands on the screen (for hits, held things, sparks).
function jointAt(kind, x, y, s, dir, p, name, body) {
  const J = solve(BODY[body || kind], p); let [jx, jy] = J[name];
  if (p.spin) { const c = Math.cos(p.spin), sn = Math.sin(p.spin), dx = jx - J.hip[0], dy = jy - J.hip[1]; jx = J.hip[0] + dx * c - dy * sn; jy = J.hip[1] + dx * sn + dy * c; }
  return [x + jx * s * dir, y + jy * s];
}

// ---- Fr. Lawrence: tall and thin, black suit, long black coat, black fedora, as priests wore
// in the forties and fifties. His white Roman collar is the brightest thing on him.
const LAWRENCE = { trouser: "#0e0c14", trouser2: "#08070c", coat: "#17151f", coat2: "#0c0b11", lapel: "#24212e", shoe: "#040306", skin: "#8a6250", skinSh: "#3e2a24", collar: "#f6f8ff", hat: "#121019", band: "#2c2836", glass: "#c4f0ff" };
function paintPriest(J, p, o, normal, rim) {
  const P = normal ? (o.pal || LAWRENCE) : null, c = (k) => (normal ? P[k] : rim);
  const n = J.n, flow = o.flow || 0, t = o.t || 0;
  // The far leg and arm, in shadow.
  stroke([J.hip, J.kB, J.fB], c("trouser2"), 7.4); shoe(J.fB, J.kB, c("shoe"));
  stroke([J.sh, J.eB, J.hB], c("coat2"), 7.2); ctx.beginPath(); ctx.arc(J.hB[0], J.hB[1], 3.2, 0, TAU); ctx.fillStyle = c("skinSh"); ctx.fill();
  // The near leg.
  stroke([J.hip, J.kF, J.fF], c("trouser"), 7.4); shoe(J.fF, J.kF, c("shoe"));
  // The long coat: from the shoulders to below the knee, open at the front, its tails flying
  // behind him as he moves.
  const wob = Math.sin(t * 7) * 1.5;
  const hemY = Math.max(J.kF[1], J.kB[1]) + 6;
  const back = [Math.min(J.kB[0], J.hip[0]) - 9 - flow * 10 + wob, hemY + 2 - Math.abs(flow) * 6];
  const front = [Math.max(J.kF[0] - 2, J.hip[0] + 4), Math.min(hemY, J.kF[1] + 8)];
  shape([PA(J.sh, n, -6.5), PA(J.neck, n, 4), PA(J.sh, n, 6.5), PA(J.hip, n, 6.5), front, P2(front, back, 0.5).map((v, i) => v + (i ? 4 : 0)), back, PA(J.hip, n, -8)], c("coat"));
  if (normal) { stroke([PA(J.neck, n, 4.5), PA(J.hip, n, 6)], P.lapel, 1.6); }
  // The collar: a white band at the throat, catching every light.
  if (normal) {
    stroke([PA(J.neck, n, 0.5), PA(J.neck, n, 5)], P.collar, 2.8);
  } else stroke([PA(J.neck, n, 0.5), PA(J.neck, n, 5)], rim, 3.4);
  // The head and the fedora.
  ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(J.ha);
  ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.fillStyle = c("skinSh"); ctx.fill();
  if (normal) {
    ctx.beginPath(); ctx.arc(2.2, 0.6, 5.6, -1.2, 1.6); ctx.fillStyle = P.skin; ctx.fill();
    shape([[6, -1], [9, 2.5], [6.2, 3.2]], P.skin);               // the nose
    if (!o.noGlasses) { stroke([[3.6, -0.6], [7.6, -0.9]], P.glass, 1.1); }
  }
  if (!o.noHat) {
    ctx.beginPath(); ctx.ellipse(1, -5.2, 12.5, 2.4, -0.04, 0, TAU); ctx.fillStyle = c("hat"); ctx.fill();
    shape([[-7, -5.5], [-6, -12.5], [-1, -11.2], [1.5, -13.4], [6, -12], [7, -5.5]], c("hat"));
    if (normal) rect(-7, -7.6, 14, 2, P.band);
  }
  ctx.restore();
  // The near arm.
  stroke([J.sh, J.eF, J.hF], c("coat"), 7.2);
  ctx.beginPath(); ctx.arc(J.hF[0], J.hF[1], 3.4, 0, TAU); ctx.fillStyle = c("skin"); ctx.fill();
  if (o.flask && normal) { ctx.save(); ctx.translate(J.hF[0], J.hF[1]); rect(-1.8, -7, 3.6, 6, "#bfe8ff"); rect(-1, -9, 2, 2, "#e9e6df"); ctx.restore(); }
  if (normal && o.collarGlow !== false) glow(PA(J.neck, n, 3)[0], J.neck[1], 9, "#ffffff", 0.18);
}

// ---- The angel: tall, a long robe, great wings, and a face too bright to look at. -----------------
const ANGEL = { robe: "#e4e9f6", robe2: "#aab6d4", edge: "#f2d47a", wing: "#f4f1e6", wing2: "#c9c2a6", light: "#fff6dc" };
const GUARD = { robe: "#a9c0e8", robe2: "#6a80b0", edge: "#c4f0ff", wing: "#c8dcf4", wing2: "#8098c4", light: "#e0f4ff" };
// A wing: a bone from the shoulder to the wrist, and feathers hung from it, the outer ones
// longest and swept out along it when the wing is opened. Drawn outermost first, so the short
// feathers near the shoulder lie on top.
function wingShape(J, p, far, c1, c2) {
  const n = J.n, R = PA(PA(J.sh, n, far ? -2 : -5), [0, 1], far ? -3 : 0), a = p.wa + (far ? -0.22 : 0), wl = clamp(p.wl, 0, 1.3);
  const L1 = 28 * (0.45 + 0.55 * wl), ux = Math.cos(a), uy = Math.sin(a), Wp = [R[0] + ux * L1, R[1] + uy * L1];
  const side = (-uy * -0.4 + ux * 1) >= 0 ? 1 : -1;     // the feathers hang down from the bone
  const N = 10; let tip = Wp;
  for (let i = N - 1; i >= 0; i--) {
    const k = i / (N - 1), b = [R[0] + ux * L1 * (0.1 + 0.9 * k), R[1] + uy * L1 * (0.1 + 0.9 * k)];
    const va = a + side * (PI / 2 - k * 1.3 * (0.35 + 0.65 * Math.min(1, wl))), len = (24 + 36 * k * k) * (0.72 + 0.28 * wl);
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(va);
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(len * 0.55, -5.2, len, 0); ctx.quadraticCurveTo(len * 0.55, 4.6, 0, 3); ctx.closePath();
    ctx.fillStyle = c1; ctx.fill(); if (c2) { ctx.strokeStyle = c2; ctx.lineWidth = 0.7; ctx.stroke(); }
    ctx.restore();
    if (i === N - 1) tip = [b[0] + Math.cos(va) * len, b[1] + Math.sin(va) * len];
  }
  stroke([R, Wp], c1, 8);
  return tip;
}
function paintAngel(J, p, o, normal, rim) {
  const P = normal ? (o.pal || ANGEL) : null, c = (k) => (normal ? P[k] : rim), n = J.n;
  if (normal && !o.dim) glow(J.sh[0], J.sh[1] + 10, 95, C.holy, 0.22 * (o.shine === undefined ? 1 : o.shine));
  // The wings, behind.
  wingShape(J, p, true, c("wing2"), normal ? hexA("#8a8470", 0.8) : null);
  const tip = wingShape(J, p, false, c("wing"), normal ? hexA(P.wing2, 0.9) : null);
  if (normal && !o.dim) glow(tip[0], tip[1], 26, C.holy, 0.25);
  // Legs, mostly hidden by the robe; the far arm.
  stroke([J.hip, J.kB, J.fB], c("robe2"), 8); stroke([J.hip, J.kF, J.fF], c("robe"), 8);
  stroke([J.sh, J.eB, J.hB], c("robe2"), 8.5);
  // The robe, long to the feet, its hem stirring.
  const t = o.t || 0, hemB = [Math.min(J.fB[0], J.hip[0]) - 10 - Math.sin(t * 3) * 2, Math.max(J.fB[1], J.fF[1]) - 3], hemF = [Math.max(J.fF[0], J.hip[0]) + 7, Math.max(J.fF[1], J.fB[1]) - 4];
  shape([PA(J.sh, n, -6), PA(J.neck, n, 3), PA(J.sh, n, 6.5), PA(J.hip, n, 7), P2(PA(J.hip, n, 7), hemF, 0.5), hemF, P2(hemF, hemB, 0.5).map((v, i) => v + (i ? 3 : 0)), hemB, PA(J.hip, n, -8)], c("robe"));
  if (normal) {
    ctx.globalAlpha *= 0.55; shape([PA(J.sh, n, -6), PA(J.sh, n, -1), P2(PA(J.hip, n, -1), hemB, 0.4), P2(hemF, hemB, 0.55), hemB, PA(J.hip, n, -8)], P.robe2); ctx.globalAlpha /= 0.55;
    stroke([PA(J.neck, n, 3), PA(J.hip, n, 7), hemF], hexA(P.edge, 0.7), 1.3); stroke([PA(J.hip, n, -6), PA(J.hip, n, 6)], P.edge, 1.6);
  }
  // The face: only light.
  if (normal) { glow(J.head[0], J.head[1], 30, P.light, 0.9); ctx.beginPath(); ctx.arc(J.head[0], J.head[1], 7.8, 0, TAU); ctx.fillStyle = P.light; ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(J.head[0], J.head[1], 8.4, 0, TAU); ctx.fillStyle = rim; ctx.fill(); }
  stroke([J.sh, J.eF, J.hF], c("robe"), 8.5);
  ctx.beginPath(); ctx.arc(J.hF[0], J.hF[1], 3.4, 0, TAU); ctx.fillStyle = c("light"); ctx.fill();
  if (normal && o.handGlow) glow(J.hF[0], J.hF[1], 22 * o.handGlow, C.holy, 0.8);
}

// ---- Demons: silhouettes in tattered coats and crooked hats, faces of blank darkness with a
// faint ember where the eyes should be. They take all the slapstick.
function paintDemon(J, p, o, normal, rim) {
  const ink = normal ? (o.ink || "#050308") : rim, n = J.n, t = o.t || 0;
  const big = o.body === "big";
  stroke([J.hip, J.kB, J.fB], ink, big ? 8 : 6.2); stroke([J.hip, J.kF, J.fF], ink, big ? 8 : 6.2);
  stroke([J.sh, J.eB, J.hB], ink, big ? 8.5 : 6);
  claws(J.eB, J.hB, ink);
  // The coat, in rags at the hem.
  const hemY = Math.max(J.kF[1], J.kB[1]) + 3, back = [J.kB[0] - 10 - Math.sin(t * 5) * 3, hemY], front = [J.kF[0] + 2, hemY - 4];
  const pts = [PA(J.sh, n, big ? -10 : -7), PA(J.neck, n, 3), PA(J.sh, n, big ? 10 : 6.5), PA(J.hip, n, 6.5), front];
  for (let i = 1; i < 5; i++) { const q = P2(front, back, i / 5); pts.push([q[0], q[1] + (i % 2 ? 7 : -1) + Math.sin(t * 6 + i) * 1.5]); }
  pts.push(back, PA(J.hip, n, -8));
  shape(pts, ink);
  if (big) shape([PA(J.sh, n, -11), PA(PA(J.sh, n, -6), [0, -1], 9), PA(J.sh, n, 2)], ink);   // a hunched back
  // The head and the hat.
  ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(J.ha);
  ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 7.5, 0, 0, TAU); ctx.fillStyle = ink; ctx.fill();
  if (o.hat !== false) {
    if (o.hatKind === 1) { ctx.beginPath(); ctx.ellipse(0, -5, 10, 2, 0.25, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0.5, -6, 6, PI, TAU); ctx.fill(); }          // a bowler
    else { ctx.beginPath(); ctx.ellipse(1, -5, 12, 2.2, 0.2, 0, TAU); ctx.fill(); shape([[-6, -5], [-4, -13], [3, -12], [7, -6]], ink); }                                // a crushed fedora, askew
  }
  ctx.restore();
  if (normal) {
    // The ember eyes.
    const e = PA(J.head, [Math.cos(J.ha), Math.sin(J.ha)], 3.4), k = o.dizzy ? 0.5 + 0.5 * Math.sin(t * 20) : 1;
    glow(e[0], e[1], 7, C.ember, 0.75 * k);
    rect(e[0] - 2.6, e[1] - 0.6, 2, 1.2, "#ffb070"); rect(e[0] + 0.8, e[1] - 0.9, 2, 1.2, "#ffb070");
  }
  stroke([J.sh, J.eF, J.hF], ink, big ? 8.5 : 6);
  claws(J.eF, J.hF, ink);
  if (o.shield) {
    // A slab of darkness held up before it, cracked with embers.
    ctx.save(); ctx.translate(J.hF[0] + 4, J.hF[1] - 6); ctx.rotate(0.08);
    shape([[-3, -36], [9, -32], [10, 22], [-4, 26]], ink);
    if (normal) { stroke([[2, -30], [5, -12], [1, 2], [6, 18]], hexA(C.ember, 0.8), 1); glow(4, -5, 16, C.ember, 0.18); }
    ctx.restore();
  }
}
function claws(e, h, c) {
  const a = Math.atan2(h[1] - e[1], h[0] - e[0]);
  for (const k of [-0.5, 0, 0.5]) stroke([h, [h[0] + Math.cos(a + k) * 6, h[1] + Math.sin(a + k) * 6]], c, 1.6);
}

// ---- A monk in the habit: the long black tunic, the scapular, the hood up or down. -------------------
const MONK = { robe: "#14121a", robe2: "#0a090e", scap: "#1c1a24", skin: "#8a6250", skinSh: "#3e2a24", hair: "#8d8a92" };
function paintMonk(J, p, o, normal, rim) {
  const P = normal ? (o.pal || MONK) : null, c = (k) => (normal ? P[k] : rim), n = J.n, t = o.t || 0;
  stroke([J.hip, J.kB, J.fB], c("robe2"), 9); stroke([J.hip, J.kF, J.fF], c("robe"), 9);
  stroke([J.sh, J.eB, J.hB], c("robe2"), 10);
  const low = Math.max(J.fF[1], J.fB[1], J.kF[1], J.kB[1]);
  const hemB = [Math.min(J.fB[0], J.kB[0], J.hip[0]) - 7, low - 1 + Math.sin(t * 2) * 0.6], hemF = [Math.max(J.fF[0], J.kF[0], J.hip[0]) + 5, low - 2];
  shape([PA(J.sh, n, -8.5), PA(J.neck, n, 3), PA(J.sh, n, 8), PA(J.hip, n, 10), [hemF[0] + 4, hemF[1]], P2(hemF, hemB, 0.5).map((v, i) => v + (i ? 2 : 0)), [hemB[0] - 4, hemB[1]], PA(J.hip, n, -11)], c("robe"));
  if (normal) shape([PA(J.neck, n, 1), PA(J.neck, n, 5), P2(PA(J.hip, n, 7), hemF, 0.6), P2(PA(J.hip, n, 2), hemF, 0.5)], P.scap);
  ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(J.ha);
  if (o.hood) {
    ctx.beginPath(); ctx.moveTo(-9, 9); ctx.quadraticCurveTo(-11, -8, -2, -12); ctx.quadraticCurveTo(8, -12, 9, 2); ctx.lineTo(7, 9); ctx.closePath(); ctx.fillStyle = c("robe"); ctx.fill();
    if (normal) { ctx.beginPath(); ctx.ellipse(4.5, 1.5, 3.6, 6, 0.1, 0, TAU); ctx.fillStyle = P.skinSh; ctx.fill(); }
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.fillStyle = c("skinSh"); ctx.fill();
    if (normal) {
      ctx.beginPath(); ctx.arc(2.2, 0.6, 5.6, -1.2, 1.6); ctx.fillStyle = P.skin; ctx.fill();
      shape([[6, -1], [9, 2.5], [6.2, 3.2]], P.skin);
      ctx.beginPath(); ctx.arc(-1, -1, 7.4, PI * 0.95, PI * 1.75); ctx.lineTo(-1, -1); ctx.fillStyle = P.hair; ctx.fill();
      if (!o.noGlasses) stroke([[3.6, -0.6], [7.6, -0.9]], "#c4f0ff", 1.1);
    }
    // The hood, down, folded on the shoulders.
    ctx.beginPath(); ctx.ellipse(-6, 9, 6, 4, -0.4, 0, TAU); ctx.fillStyle = c("robe2"); ctx.fill();
  }
  ctx.restore();
  stroke([J.sh, J.eF, J.hF], c("robe"), 10);
  if (!o.handsHidden) { ctx.beginPath(); ctx.arc(J.hF[0], J.hF[1], 3.3, 0, TAU); ctx.fillStyle = c("skin"); ctx.fill(); }
}
const PAINTERS = { priest: paintPriest, angel: paintAngel, demon: paintDemon, monk: paintMonk };

// ---- Scenery ---------------------------------------------------------------------------------------
// A skyline: towers made from a seed, the same each time, with lit windows. Cached by its key.
const skyCache = new Map();
function skylineData(seed, x0, x1, minH, maxH) {
  const key = seed + ":" + x0 + ":" + x1 + ":" + minH + ":" + maxH; let d = skyCache.get(key); if (d) return d;
  const r = seeded(seed); d = [];
  for (let x = x0; x < x1;) {
    const w = 18 + r() * 46, h = minH + Math.pow(r(), 1.6) * (maxH - minH);
    const b = { x, w, h, win: [], top: r() < 0.25 ? (r() < 0.5 ? 1 : 2) : 0, sign: r() < 0.12 ? Math.floor(r() * 4) : -1, ant: r() < 0.15 };
    for (let wy = 8; wy < h - 6; wy += 7) for (let wx = 4; wx < w - 4; wx += 6) if (r() < 0.16) b.win.push([wx, wy, r()]);
    d.push(b); x += w + (r() < 0.3 ? r() * 10 : 0);
  }
  skyCache.set(key, d); return d;
}
const SIGNC = [C.pink, C.cyan, C.red, C.teal];
function skyline(seed, x0, x1, baseY, minH, maxH, color, o) {
  o = o || {};
  const d = skylineData(seed, x0, x1, minH, maxH), t = o.t || 0, lit = o.lit === undefined ? 1 : o.lit;
  for (const b of d) {
    const top = baseY - b.h;
    rect(b.x, top, b.w + 0.5, b.h, color);
    if (b.top === 1) rect(b.x + b.w * 0.25, top - 8, b.w * 0.5, 8, color);
    if (b.top === 2) poly([b.x, top, b.x + b.w / 2, top - 14, b.x + b.w, top], color);
    if (b.ant) { rect(b.x + b.w / 2, top - 22, 1.2, 22, color); if (o.windows !== false) glow(b.x + b.w / 2, top - 22, 4, C.red, 0.6 + 0.4 * Math.sin(t * 2 + b.x)); }
    if (o.windows === false) continue;
    // The windows go dark when the block's lights go out (`lit` from 0 to 1, by position).
    for (const [wx, wy, k] of b.win) {
      const on = o.dark ? (b.x - (o.darkX || 0)) * (o.darkDir || 1) < 0 : k < lit;
      if (on) winAdd(k < 0.15 ? 0 : k < 0.35 ? 1 : k < 0.5 ? 2 : 3, b.x + wx, top + wy, 2.2, 3);
    }
    if (b.sign >= 0 && o.signs !== false && lit > 0.3) { const sc = SIGNC[b.sign], sy = top + b.h * 0.35; rect(b.x + 2, sy, 3, 14, sc); glow(b.x + 3.5, sy + 7, 14, sc, 0.5); }
  }
  winFlush((o.winA || 0.75) * 0.8);
}
// Stars, for the desert.
function stars(seed, n, x0, y0, w, h, t) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, y = y0 + Math.pow(r(), 1.3) * h, b = r(), tw = 0.6 + 0.4 * Math.sin(t * (1 + b * 3) + i);
    ctx.globalAlpha = (0.35 + 0.65 * b) * tw; rect(x, y, b > 0.92 ? 1.6 : 1, b > 0.92 ? 1.6 : 1, b > 0.8 ? "#fff6e0" : "#cfe0ff");
    if (b > 0.97) glow(x + 0.8, y + 0.8, 5, "#fff6e0", 0.5 * tw);
  }
  ctx.globalAlpha = 1;
}
// Rain in straight streaks.
function rain(t, n, x0, y0, w, h, o) {
  o = o || {};
  const r = seeded(o.seed || 7), ang = o.angle === undefined ? 0.12 : o.angle, len = o.len || 14, spd = o.speed || 520;
  ctx.strokeStyle = o.color || "rgba(196,240,255,0.32)"; ctx.lineWidth = o.width || 1; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ox = r() * w, oy = r() * h, sp = spd * (0.75 + r() * 0.5);
    const y = y0 + ((oy + t * sp) % h), x = x0 + ((ox + (y - y0) * ang) % w + w) % w;
    ctx.moveTo(x, y); ctx.lineTo(x - ang * len, y - len);
  }
  ctx.stroke();
}
// A neon sign: the letters, their glow, and now and then a flicker.
function neon(str, x, y, size, color, t, o) {
  o = o || {};
  const fl = o.flicker ? (Math.sin(t * 23 + x) > 0.93 || (Math.sin(t * 1.3 + x) > 0.97) ? 0.25 : 1) : 1;
  const a = (o.alpha === undefined ? 1 : o.alpha) * fl;
  if (a <= 0.02) return;
  ctx.font = (o.weight || 700) + " " + size + "px " + (o.font || FONT.ui); const w = ctx.measureText(str).width;
  const cx = o.align === "left" ? x + w / 2 : x;
  glowOval(cx, y - size * 0.35, w * 0.75 + size, size * 1.6, color, 0.5 * a);
  glowOval(cx, y - size * 0.35, w * 0.55 + size * 0.5, size, color, 0.45 * a);
  text(str, x, y, { align: o.align || "center", size, weight: o.weight || 700, font: o.font, color: mix(color, "#ffffff", 0.55), alpha: a, spacing: o.spacing || 1 });
  if (o.box) { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.strokeRect(cx - w / 2 - 6, y - size - 3, w + 12, size + 9); ctx.globalAlpha = 1; }
}
// A street lamp: a post, an arm, and its pool of light.
function lamp(x, y, h, color, on, s) {
  s = s || 1; const top = y - h * s;
  rect(x - 1.2 * s, top, 2.4 * s, h * s, "#07060b"); rect(x - 1.2 * s, top, 14 * s, 2 * s, "#07060b");
  if (on > 0) {
    rect(x + 8 * s, top + 2 * s, 6 * s, 2 * s, mix("#07060b", color, on));
    glow(x + 11 * s, top + 4 * s, 28 * s, color, 0.55 * on);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.07 * on;
    poly([x + 8 * s, top + 4 * s, x + 14 * s, top + 4 * s, x + 40 * s, y, x - 18 * s, y], color); ctx.restore();
    glowOval(x + 11 * s, y + 2, 40 * s, 7 * s, color, 0.35 * on);
  }
}
// A sedan, side on, its nose to the right: body, glass, wheels, and whoever sits in it.
function car(x, y, s, o) {
  o = o || {};
  const t = o.t || 0, body = o.body || "#101321";
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.dir || 1), s);
  // Body, with the neon caught along its roof and flank when there is any.
  const outline = [-58, -8, -56, -20, -40, -23, -26, -38, 14, -38, 30, -24, 54, -21, 60, -12, 60, -4, -58, -4];
  poly(outline, body);
  if (o.rim) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(-56, -20); ctx.lineTo(-40, -23); ctx.lineTo(-26, -38); ctx.lineTo(14, -38); ctx.lineTo(30, -24); ctx.lineTo(54, -21); ctx.strokeStyle = o.rim; ctx.lineWidth = 1.2 / s; ctx.stroke(); line(-54, -12, 56, -12, hexA(o.rim, 0.5), 0.8 / s); ctx.globalAlpha = 1; }
  // Glass.
  poly([-23, -35, -3, -35, -3, -24, -34, -24], o.glass || "#1a2438"); poly([1, -35, 12, -35, 25, -24, 1, -24], o.glass || "#1a2438");
  if (o.driver !== false) {
    // The man at the wheel: head bowed, shoulders.
    ctx.save(); ctx.beginPath(); ctx.rect(1, -35, 24, 11); ctx.clip();
    circle(10, -29 + (o.bow || 0), 4.5, "#05040a"); poly([2, -24, 4, -27, 16, -27, 19, -24], "#05040a");
    ctx.restore();
  }
  if (o.wet !== false) { ctx.globalAlpha = 0.5; line(-40, -21, 50, -21, "rgba(196,240,255,0.35)", 0.8); line(-24, -37, 12, -37, "rgba(255,67,130,0.45)", 0.8); ctx.globalAlpha = 1; }
  // Wheels.
  for (const wx of [-36, 38]) { circle(wx, -4, 9, "#050408"); circle(wx, -4, 4, "#1d2030"); }
  // Lights.
  if (o.lights) { glow(60, -14, 26, "#e8f6ff", 0.9 * o.lights); rect(56, -16, 4, 3, "#ffffff"); glowOval(120, -2, 70, 8, "#e8f6ff", 0.3 * o.lights); }
  rect(-59, -15, 3, 3, o.lights ? "#ff3030" : "#4a1010"); if (o.lights) glow(-58, -13, 10, C.red, 0.6 * o.lights);
  if (o.dash) glow(8, -26, 10, C.cyan, 0.35 * o.dash);
  ctx.restore();
}
// The corner store across the street: a lit window, a door, and its sign.
function cornerStore(x, y, w, h, t, o) {
  o = o || {};
  rect(x, y - h, w, h, "#0d0f1c");
  rect(x, y - h, w, 6, "#16192a");
  const wy = y - h * 0.62, wh = h * 0.5;
  rect(x + 8, wy, w * 0.55, wh, "#2a4a5c"); glow(x + 8 + w * 0.27, wy + wh / 2, w * 0.4, "#9fe4ff", 0.35);
  for (let i = 0; i < 4; i++) rect(x + 12 + i * w * 0.13, wy + wh * 0.55, w * 0.08, wh * 0.4, "#1c3442");
  rect(x + w * 0.7, y - h * 0.62, w * 0.18, h * 0.62, "#121626");
  neon("OPEN 24 HRS", x + w * 0.36, y - h + 26, 11, C.red, t, { flicker: true, box: true });
  neon("DELI", x + w * 0.79, y - h * 0.68, 9, C.cyan, t, {});
}
// Wet asphalt between two lines, with the light above it lying in long streaks.
function wetStreet(y0, y1, lights, t, x0, x1) {
  x0 = x0 === undefined ? 0 : x0; x1 = x1 === undefined ? W : x1;
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#0c1020"); g.addColorStop(1, "#06070d");
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (const [x, c, a, w] of lights) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, hexA(c, 0.32 * a)); gr.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = gr; const ww = w || 10, wob = Math.sin(t * 2 + x) * 1.5;
    ctx.fillRect(x - ww / 2 + wob, y0, ww, y1 - y0); ctx.restore();
  }
}
// The letterbox: bars above and below, for the cut scenes.
function vignette(a, r) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * (r || 0.35), W / 2, H / 2, H * 0.95);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + a + ")"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
