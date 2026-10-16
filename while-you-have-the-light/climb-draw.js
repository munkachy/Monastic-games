"use strict";
// While You Have the Light, the climb (6 of 7): drawing, and the domains drawn.

// ---- Drawing -----------------------------------------------------------------------------------------
function lightR() {
  const f = S.dying ? Math.max(0, 1 - S.dying / 1.4) * 0.15 : clamp(S.fuel, 0, 1);
  let R = f <= 0 && !S.dying ? 18 : 50 + 210 * Math.pow(f, 0.75);
  if (S.ward && !S.dying) R = Math.max(R, 52);
  if (S.flare.on) R = Math.max(R, FLARE_R + 30);
  if (S && S.boon && S.boon.kind === "unconsumed") R *= 1.3;
  if (soupOn("bright")) R *= 1.35;
  if (S.latched) R *= 1 - 0.65 * clamp((S.latched.latchT || 0) / 0.6, 0, 1);       // (shut in a great demon's mouth, the torch shows little)
  return R;
}
// What the torch can see: rays cast through the grid of rock, each stopping a little way into
// the first rock it meets (so the faces it lights are lit).
// (The niches cut into the walls are hollows the light goes into: HOLES holds their cells.)
const HOLES = new Set(), holeKey = (i, j) => (j + 1e6) * 256 + i;
function visPoly(ox, oy, R) {
  const N = 180, pts = new Float32Array(N * 2), i0 = Math.floor(ox / CELL), j0 = Math.floor(oy / CELL);
  if (!Number.isFinite(ox + oy + R)) return pts;
  const inRock = solid(i0, j0);
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU, dx = Math.cos(a), dy = Math.sin(a), sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = Math.abs(CELL / (dx || 1e-9)), tdy = Math.abs(CELL / (dy || 1e-9));
    let i = i0, j = j0, tmx = dx > 0 ? ((i + 1) * CELL - ox) / dx : dx < 0 ? (ox - i * CELL) / -dx : 1e9;
    let tmy = dy > 0 ? ((j + 1) * CELL - oy) / dy : dy < 0 ? (oy - j * CELL) / -dy : 1e9, d = R;
    if (!inRock) while (true) {
      let t; if (tmx < tmy) { t = tmx; tmx += tdx; i += sx; } else { t = tmy; tmy += tdy; j += sy; }
      if (t > R) break;
      if (solid(i, j) && !(HOLES.size && HOLES.has(holeKey(i, j)))) { d = Math.min(R, t + 5); break; }
    }
    pts[k * 2] = ox + dx * d; pts[k * 2 + 1] = oy + dy * d;
  }
  return pts;
}
let DK = null;
// The dark over everything, but where the torch can see; and, without shadows, a little way round
// the other lights (lamps, fire, the glow from a pit): lights = [{ x, y, r, a, sx }] on the screen.
// The night sky over the summit: dark blue going up, paler at the mountain's rim; the stars, and the
// moon; turning slowly as the camera goes (the sky is far: it moves less than the rock).
// (lit: the second pass, over the dark: the glow low over the far mountains, the stars and the moon.)
function drawSky(cam, yb, t, lit) {
  const y1 = Math.min(H, yb + 24), top = yb * 0.4 - 560;
  if (!lit) {
    const g = ctx.createLinearGradient(0, top, 0, y1);
    g.addColorStop(0, "rgba(5,7,16,0.98)"); g.addColorStop(0.6, "rgba(14,19,38,0.94)"); g.addColorStop(0.92, "rgba(36,42,66,0.72)"); g.addColorStop(1, "rgba(60,62,80,0.4)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1);
    return;
  }
  const hz = ctx.createLinearGradient(0, yb - 520, 0, yb - SUM_G * CELL);
  hz.addColorStop(0, "rgba(8,11,28,0.55)"); hz.addColorStop(0.7, "rgba(24,32,66,0.4)"); hz.addColorStop(1, "rgba(80,92,136,0.3)");
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, Math.min(H, yb));
  const span = W * 1.6;
  for (let n = 0; n < 110; n++) {
    const x = ((hash2(n, 1, 7) * span - cam.x * 0.04) % span + span) % span - W * 0.3, y = yb * 0.4 + 40 - hash2(n, 2, 7) * 460;
    if (y < -4 || y > y1 - 12 || x < -4 || x > W + 4) continue;
    const a = (0.35 + 0.5 * hash2(n, 3, 7)) * (0.75 + 0.25 * Math.sin(t * (0.6 + hash2(n, 4, 7) * 2) + n));
    const z = hash2(n, 5, 7) < 0.1 ? 1.4 : 0.8;
    if (z > 1) glow(x, y, 4, "#cfd8ff", a * 0.5);
    rect(x - z / 2, y - z / 2, z, z, "rgba(225,230,255," + a.toFixed(3) + ")");
  }
  const mx = W * 0.72 - ((cam.x * 0.012) % 160), my = yb * 0.4 - 30;
  if (my > -40 && my < y1) { glow(mx, my, 70, "#9fb0d8", 0.18); glow(mx, my, 26, "#e8ecff", 0.35); circle(mx, my, 13, "#e9e7dc"); circle(mx + 4, my - 3, 3, "rgba(190,188,176,0.6)"); circle(mx - 4, my + 4, 2.2, "rgba(190,188,176,0.5)"); }
}
function darkness(cam, tx, ty, R, lights, shade) {
  const k = 0.5, w = Math.ceil(W * k), h = Math.ceil(H * k);
  if (!DK) DK = document.createElement("canvas");
  if (DK.width !== w || DK.height !== h) { DK.width = w; DK.height = h; }
  const g = DK.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h);
  g.fillStyle = shade || "rgba(4,4,6,0.95)"; g.fillRect(0, 0, w, h);
  g.setTransform(k, 0, 0, k, 0, 0); g.globalCompositeOperation = "destination-out";
  const gr = g.createRadialGradient(tx, ty, 0, tx, ty, R);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.3, "rgba(0,0,0,0.95)"); gr.addColorStop(0.65, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fill(S.light);
  for (const L of lights || []) {
    if (L.x + L.r * (L.sx || 1) < 0 || L.x - L.r * (L.sx || 1) > W || L.y + L.r < 0 || L.y - L.r > H) continue;
    g.save(); g.translate(L.x, L.y); if (L.sx) g.scale(L.sx, 1);
    const q = g.createRadialGradient(0, 0, 0, 0, 0, L.r);
    q.addColorStop(0, "rgba(0,0,0," + L.a + ")"); q.addColorStop(0.45, "rgba(0,0,0," + L.a * 0.6 + ")"); q.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = q; g.beginPath(); g.arc(0, 0, L.r, 0, TAU); g.fill(); g.restore();
  }
  g.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true; ctx.drawImage(DK, 0, 0, W, H);
}
// A slab of rock standing free (a platform in a shaft, or hung in a cavern): flat on top (or a
// little askew: tilt is how far its right end lies below its middle), its underside broken. jit
// shakes it (as it crumbles).
function slab(P, cam, x0, x1, y0, y1, s, jit, tilt) {
  const X = (x) => x - cam.x + jx, Y = (y) => y - cam.y + jy, q = (k) => (hash2(s, k, 77) - 0.5) * 4, tl = (x) => (tilt || 0) * clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1);
  const jx = jit ? (Math.random() - 0.5) * jit : 0, jy = jit ? (Math.random() - 0.5) * jit * 0.6 : 0, deep = y1 - y0 > CELL * 1.5;
  P.moveTo(X(x0 + 2), Y(y0 + q(2) * 0.4 + tl(x0))); P.lineTo(X((x0 + x1) / 2 + q(3)), Y(y0 - 1)); P.lineTo(X(x1 - 2), Y(y0 + 0.5 + tl(x1)));
  P.lineTo(X(x1 + 1 + q(6) * 0.4), Y((y0 + y1) / 2 + tl(x1) * 0.5)); P.lineTo(X(x1 - 4 + q(7)), Y(y1 + 2 + Math.abs(q(8))));
  if (deep || x1 - x0 > 80) { P.lineTo(X(lerp(x0, x1, 0.68) + q(13)), Y(y1 + 9 + Math.abs(q(14)) * 2)); P.lineTo(X(lerp(x0, x1, 0.5) + q(9)), Y(y1 + 3)); P.lineTo(X(lerp(x0, x1, 0.32) + q(15)), Y(y1 + 12 + Math.abs(q(16)) * 2)); }
  else P.lineTo(X((x0 + x1) / 2 + q(9)), Y(y1 + 6 + Math.abs(q(10))));
  P.lineTo(X(x0 + 3), Y(y1 + 2 + Math.abs(q(11)))); P.lineTo(X(x0 - 1 + q(12) * 0.4), Y((y0 + y1) / 2 + tl(x0) * 0.5)); P.closePath();
}
// The rock as one path: the walls with craggy faces, the platforms, the crossings, the caverns, the floor.
function rockPath(cam) {
  const j0 = Math.floor(cam.y / CELL) - 1, j1 = Math.min(-1, Math.floor((cam.y + H) / CELL) + 1);
  const P = new Path2D(), X = (x) => x - cam.x, Y = (y) => y - cam.y, i0 = Math.max(0, Math.floor(cam.x / CELL) - 1), i1 = Math.min(COLS - 1, Math.floor((cam.x + W) / CELL) + 1);
  const jig = (j, k) => (hash2(j, k, 99) - 0.5) * 1.6;
  // Shaft rows: the two walls as long craggy runs; crossing and cavern rows: cell by cell, merged along each row.
  let run = null;
  const flush = (side) => {
    if (!run) return;
    const lx = side < 0 ? -60 : COLS * CELL + 60;
    P.moveTo(X(lx), Y(run.j0 * CELL));
    for (const q of run.pts) P.lineTo(X(q[0]), Y(q[1]));
    P.lineTo(X(lx), Y((run.j1 + 1) * CELL)); P.closePath();
  };
  for (const side of [-1, 1]) {
    run = null;
    for (let j = j0; j <= j1; j++) {
      const sec = sectionAt(-j);
      if (sec.type !== "shaft") { flush(side); run = null; continue; }
      const e = edges(j), x = side < 0 ? e.L * CELL : (e.R + 1) * CELL, ka = side < 0 ? 1 : 3;
      if (!run) run = { j0: j, j1: j, pts: [] };
      run.j1 = j; run.pts.push([x + jig(j, ka), j * CELL + 2], [x + jig(j, ka + 1), j * CELL + CELL - 2]);
    }
    flush(side);
  }
  // Crossing and cavern rows: each row's runs of rock, then runs that go on unchanged from row to
  // row merged into one face (so a cliff is one cliff, with no seams for the light to catch).
  const caves = new Set(), rowRuns = new Map();
  for (let j = j0; j <= j1; j++) {
    const sec = sectionAt(-j);
    if (sec.type === "shaft") continue;
    // (In a cavern, its platforms are left out here: they are drawn as slabs.)
    let sd0 = (i) => solid(i, j);
    if (sec.type === "cave") { caves.add(sec); const V = cave(sec), r = -j - sec.h0; sd0 = (i) => V.base[r * COLS + i] === 1; }
    const runs = []; let a = -1;
    for (let i = i0 - 1; i <= i1 + 1; i++) {
      const sd = sd0(Math.max(0, Math.min(COLS - 1, i)));
      if (sd && a < 0) a = i;
      if ((!sd || i === i1 + 1) && a >= 0) { runs.push([a, sd ? i : i - 1]); a = -1; }
    }
    rowRuns.set(j, runs);
  }
  const sdAt = (i, j) => { const sec = sectionAt(-j); if (sec.type === "cave") { const r = -j - sec.h0; return r >= 0 && r < CH && cave(sec).base[r * COLS + Math.max(0, Math.min(COLS - 1, i))] === 1; } return solid(Math.max(0, Math.min(COLS - 1, i)), j); };
  const over = (p, q) => p[0] <= q[1] && q[0] <= p[1];
  for (let j = j0; j <= j1; j++) {
    const runs = rowRuns.get(j); if (!runs) continue;
    for (const run of runs) {
      if (run.done) continue;
      // Down from here while one run below goes on from this one alone, and only from it.
      const chain = [run]; let jb = j;
      for (; ;) {
        const last = chain[chain.length - 1], here = rowRuns.get(jb), nx = rowRuns.get(jb + 1); if (!nx) break;
        const ms = nx.filter((q) => !q.done && over(q, last)); if (ms.length !== 1) break;
        if (here.filter((q) => over(q, ms[0])).length !== 1) break;
        ms[0].done = true; chain.push(ms[0]); jb++;
      }
      const xa = (r) => (r[0] <= i0 - 1 ? -60 : r[0] * CELL), xb = (r) => (r[1] >= i1 + 1 ? COLS * CELL + 60 : (r[1] + 1) * CELL);
      const f = chain[0], l = chain[chain.length - 1];
      const up = !sdAt(f[0], j - 1), dn = !sdAt(l[0], jb + 1), yt = j * CELL - (up ? 0.5 : 1), yb = jb * CELL + CELL + (dn ? 0.5 : 1);
      P.moveTo(X(xa(f) + jig(j, f[0])), Y(yt)); P.lineTo(X(xb(f) + jig(j, f[1] + 7)), Y(yt));
      chain.forEach((r, n) => { const q = j + n; P.lineTo(X(xb(r) + jig(q, r[1] + 7)), Y(q * CELL + (n ? 2 : 0))); P.lineTo(X(xb(r) + jig(q + 1, r[1] + 7)), Y(q * CELL + CELL - (n < chain.length - 1 ? 2 : 0))); });
      P.lineTo(X(xb(l) + jig(jb + 1, l[1] + 7)), Y(yb)); P.lineTo(X(xa(l) + jig(jb + 1, l[0])), Y(yb));
      for (let n = chain.length - 1; n >= 0; n--) { const r = chain[n], q = j + n; P.lineTo(X(xa(r) + jig(q + 1, r[0])), Y(q * CELL + CELL - (n < chain.length - 1 ? 2 : 0))); P.lineTo(X(xa(r) + jig(q, r[0])), Y(q * CELL + (n ? 2 : 0))); }
      P.closePath();
    }
  }
  for (const sec of caves) for (const p of cave(sec).plats) {
    const y0 = -(sec.h0 + p.r1) * CELL, y1 = -(sec.h0 + p.r0 - 1) * CELL;
    if (y1 + 30 < cam.y || y0 - 10 > cam.y + H) continue;
    slab(P, cam, p.x0 * CELL, (p.x1 + 1) * CELL, y0, y1, sec.k * 31 + p.x0, 0, p.tilt);
  }
  for (let s = Math.floor(-j1 / SLOT) - 1; s <= Math.floor(-j0 / SLOT) + 1; s++) {
    const isl = s >= 0 && island(s); if (!isl || isl.st === "gone") continue;
    slab(P, cam, isl.x0 * CELL, (isl.x1 + 1) * CELL, -isl.h1 * CELL, (1 - isl.h0) * CELL, s, isl.st === "crack" && S.rt - isl.loadT < 0.1 ? 0.6 + isl.stage * 0.8 : 0, isl.tilt);
  }
  for (const sec of sectionsIn(-j1 - 4, -j0 + 4)) {
    const E = sec.type === "shaft" && eyeOf(sec); if (!E) continue;
    const yT = -E.h1 * CELL, yB = (1 - E.h0) * CELL, eL = Math.min(edges(-E.h0).L, edges(-E.h1).L) - 1, eR = Math.max(edges(-E.h0).R, edges(-E.h1).R) + 1;
    slab(P, cam, eL * CELL, E.i0 * CELL, yT, yB, sec.k * 7 + 1, 0, 0); slab(P, cam, (E.i1 + 1) * CELL, (eR + 1) * CELL, yT, yB, sec.k * 7 + 2, 0, 0);
  }
  if (cam.y + H > -2) {
    P.moveTo(X(-60), Y(0)); for (let x = 0; x <= COLS * CELL; x += 24) P.lineTo(X(x), Y(jig(x, 5) * 0.6 + 1)); P.lineTo(X(COLS * CELL + 60), Y(0));
    P.lineTo(X(COLS * CELL + 60), Y(Math.max(0, cam.y + H) + 10)); P.lineTo(X(-60), Y(Math.max(0, cam.y + H) + 10)); P.closePath();
  }
  return P;
}
function drawTablet(w, cam, unlit) {
  const p = wallPos(w), x = p.x - cam.x, y = p.y - cam.y, s = w.side;
  if (y < -60 || y > H + 60) return;
  const x0 = s < 0 ? x - 2 : x - 20;
  // The candle under it, on its iron: burning till the verse is read (a light to make for in the
  // dark, and the torch lit again from it), then a stub.
  { const cx = x0 + 11, cy = y + 24;
    rect(cx - 6, cy + 1, 12, 2, "#16140f"); rect(cx - 1, cy + 3, 2, 4, "#16140f");
    if (!w.read) { rect(cx - 1.5, cy - 7, 3, 8, "#d9cfb8"); glow(cx, cy - 10, 26, C.flame, 0.35 + 0.05 * Math.sin(S.rt * 9 + w.n)); drawFlame(cx, cy - 8, 0.32, S.rt + w.n, {}); }
    else rect(cx - 1.5, cy - 2, 3, 3, "#8c8270"); }
  if (unlit) {
    rect(x0, y - 17, 22, 34, "#1c1b19");
    ctx.globalAlpha = 0.5; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, "#5a554a"); ctx.globalAlpha = 1;
    return;
  }
  const pulse = 0.5 + 0.5 * Math.sin(S.rt * 2.2 + w.n);
  if (!w.read) {
    glow(x + s * -10, y, 46, C.gold, 0.22 + 0.12 * pulse);
    ctx.globalAlpha = 0.55 + 0.25 * pulse; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1;
  } else if (w.lit > 0) glow(x + s * -10, y, 70, C.flameHot, 0.4 * w.lit);
  else { ctx.globalAlpha = 0.18; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1; }
}
// Walking up the wall on the rope: leaning back from it, feet planted on the rock in turn, hand
// over hand up the rope (the torch held in one hand as it grips).
// (The torch, held in the hand that also grips: up, and back from the rock or the rope.)
const torchBack = (sB, eB) => PI + 0.55 - sB - eB;
function wallWalk(ph) {
  const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v), sB = 2.7 + 0.28 * b, eB = 0.25 + 0.35 * up(b);
  return S_({ lean: -0.55, head: -0.5, sF: 2.7 + 0.28 * a, eF: 0.25 + 0.35 * up(a), sB, eB, tq: torchBack(sB, eB),
    hF: 1.25 + 0.45 * up(a), kF: 1.0 + 0.7 * up(a), hB: 1.25 + 0.45 * up(b), kB: 1.0 + 0.7 * up(b) });
}
// On the rock with bare hands, facing it: the free hand up to a hold, and the torch hand up in
// turn to plant the torch's foot in the rock like a spike (its flame up and back from the rock),
// a knee up with each.
function wallClimb(ph) {
  const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v), stab = Math.pow(up(b), 6);
  const sB = 2.45 + 0.5 * b, eB = 0.25 + 0.55 * up(a) - 0.15 * stab;
  return S_({ lean: 0.12, head: -0.35, sF: 2.55 + 0.4 * a, eF: 0.35 + 0.5 * up(b), sB, eB, tq: PI + 0.6 - 0.4 * stab - sB - eB,
    hF: 0.35 + 0.95 * up(a), kF: 0.5 + 1.3 * up(a), hB: 0.35 + 0.95 * up(b), kB: 0.5 + 1.3 * up(b) });
}
// On his hands and knees in a low way: the body flat out over the knees, the free hand and the
// fist with the torch in it going down in turn, the knees after them, the torch held up before him.
function crawlPose(u) {
  const c = Math.sin(TAU * u), c2 = Math.sin(TAU * u + PI), hF = 0.15 + 0.25 * c2, hB = 0.15 - 0.25 * c2;
  return pose({ lean: 1.38, head: -1.05, sF: 0.62 + 0.28 * c, eF: 0.1 - 0.07 * c, sB: 1.15 - 0.25 * c, eB: -1.5, tq: 2.85, hF, kF: hF + 1.5, hB, kB: hB + 1.5, lift: 0.5 * Math.abs(c) });
}
function monkPose() {
  const t = S.t;
  if (S.latched) return MONK_ANIM.fall((S.rt * 2.6) % 1);       // (held up in its jaws, his legs kicking)
  if (S.crownSpin > 0 && !S.atk) { const k = 1 - S.crownSpin / CROWN_SPIN, p = blendPose(TUCK, MONK_ANIM.fall(0), smooth(k)); p.spin = S.dir * TAU * ease(k); return p; }
  if (S.atk) { const a = S.atk; return a.t < a.dash ? MONK_ANIM.dash(clamp(a.t / a.dash, 0, 1)) : MONK_ANIM[ATK_ANIM[a.kind][0]](clamp((a.t - a.dash) / a.dur, 0, 1)); }
  if (S.hurtT > 0 && !S.act) return MONK_ANIM.hurt(1 - S.hurtT / 0.45);
  if (S.dying) return MONK_ANIM.fall(0.3);
  if (S.act && S.act.kind === "flipUp") { const u = S.act.u, p = blendPose(TUCK, STAND, smooth((u - 0.75) / 0.25)); p.spin = S.act.s * S.dir * TAU * ease(Math.min(1, u * 1.25)); return p; }
  if (S.act) return S.act.kind === "stepUp" ? MONK_ANIM.stepUp(S.act.u) : MONK_ANIM.climbUp(actPoseU(S.act));
  let p;
  if (S.hang) p = MONK_ANIM.climbUp(0.44 + 0.05 * Math.sin(t * 1.7));
  else if (S.cling) p = wallClimb(S.climbPh);
  else if (S.wall) p = wallWalk(S.climbPh);
  else if (S.rope && !S.ground) {
    p = MONK_ANIM.hang((t * 0.6) % 1);
    // Near the ground on the rope (and just after lifting off): the feet drawn up.
    const low = (S.liftT || 0) > 0 || boxHit(S.x, S.y + 22);
    if (low && !S.climbing && !(S.swingKickT > 0)) { p.hF = 1.0; p.kF = 1.7; p.hB = 0.75; p.kB = 1.6; }
    if (S.swingKickT > 0) {
      // The swing's kick: both legs driven out ahead, the near one straight.
      const k = Math.sin(clamp(1 - S.swingKickT / 0.35, 0, 1) * PI);
      p.hF = lerp(p.hF, 1.65, k); p.kF = lerp(p.kF, 0.1, k); p.hB = lerp(p.hB, 0.9, k); p.kB = lerp(p.kB, 0.6, k); p.lean = lerp(p.lean, -0.35, k);
    } else if (S.climbing) {
      // Both hands on the rope in turn, the torch held in one of them, out from the rope.
      p.sB = 2.85 + 0.25 * Math.sin(S.climbPh + PI); p.eB = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(S.climbPh + PI));
      p.sF = 2.85 + 0.25 * Math.sin(S.climbPh); p.tq = torchBack(p.sB, p.eB);
      // Hand over hand, the knees coming up in turn to grip the rope.
      const c = Math.sin(S.climbPh);
      p.hF = 0.25 + 0.75 * Math.max(0, c); p.kF = 0.3 + 1.1 * Math.max(0, c);
      p.hB = 0.1 + 0.75 * Math.max(0, -c); p.kB = 0.3 + 1.1 * Math.max(0, -c);
      p.eF = 0.06 + 0.35 * (0.5 + 0.5 * Math.sin(S.climbPh * 2)); p.lift = 1.5 * Math.sin(S.climbPh * 2);
    }
  } else if (!S.ground && S.stompT > 0) p = MONK_ANIM.diveStomp(0.72 + 0.28 * (1 - S.stompT / 0.4));
  else if (!S.ground && S.flip) {
    const k = S.flip.t / flipDur(S.flip);
    p = blendPose(TUCK, MONK_ANIM.fall(0), smooth((k - 0.7) / 0.3)); p.spin = S.flip.s * S.dir * TAU * (S.flip.half ? 0.5 : 1) * ease(Math.min(1, k * 1.15));
  } else if (!S.ground && S.jumpT > 0) p = MONK_ANIM.leap(clamp(0.32 + (0.6 - S.jumpT) * 0.5, 0.32, 0.6));
  else if (!S.ground) p = MONK_ANIM.fall((t * 1.3) % 1);
  else if (S.crawl) p = crawlPose(S.anim % 1);
  else if (S.landT > 0) p = MONK_ANIM.land(1 - S.landT / (S.landMax || 0.35));
  else if (Math.abs(S.vx) > 12) p = MONK_ANIM.walk(S.anim % 1);
  else p = MONK_ANIM.idle((t * 0.4) % 1, t);
  if ((S.held || (S.tied && S.tied.st === "hand")) && !S.atk) { p.sF = 2.8; p.eF = 0.3; p.lean = Math.min(p.lean, 0.04); }   // the boulder up in his free hand, the torch still in the other
  if (S.throwT > 0) {
    // The throw: the free arm drawn back, then flung toward the rock.
    const k = 1 - S.throwT / 0.32, ax = Math.cos(S.throwA) * S.dir, ay = Math.sin(S.throwA), aim = Math.atan2(ax, ay);
    p.sF = k < 0.35 ? lerp(p.sF, aim - 1.4, ease(k / 0.35)) : lerp(aim - 1.4, aim, ease((k - 0.35) / 0.4));
    p.eF = k < 0.35 ? 1.6 : lerp(1.6, 0.1, ease((k - 0.35) / 0.3));
  }
  return p;
}
function demonPose(f) {
  const A = DEMON_ANIM, t = S.rt, s = f.sin, k = (d) => clamp(f.t / d, 0, 1);
  switch (f.st) {
    case "walk": return A.walk((f.t * 0.9) % 1, t, s);
    case "creep": return A.walk((f.t * 1.5) % 1, t, s);
    case "flee": return A.walk((f.t * 2) % 1, t, s);
    case "snatch": return A.throw(k(0.4), t, s);
    case "cast": return A.windup(k(0.5), t, s);
    case "tether": return A.throw(0.55, t, s);
    case "pickup": return s === "wrath" ? A.windup(k(0.7), t, s) : A.pickup(k(0.5), t, s);
    case "windup": return A.windup(s === "wrath" ? 1 : k(0.55), t, s);
    case "inhale": { const p = A.idle((t * 0.5 + f.id * 0.3) % 1, t, s); p.jaw = Math.min(1, f.t * 3); p.lean -= 0.18 * Math.min(1, f.t * 3); p.head -= 0.25 * Math.min(1, f.t * 3); return p; }
    case "bite": return A.swallow(k(0.6), t, s);
    case "heave": { const p = A.windup(k(0.75), t, s); p.jaw = 0.25 + 0.25 * k(0.75); return p; }
    case "lob": return A.spit(k(0.5), t, s);
    case "swallow": return A.swallow(k(0.7), t, s);
    case "spit": return A.spit(k(0.6), t, s);
    case "throw": return A.throw(k(0.42), t, s);
    case "hurt": return A.hurt(k(0.38), t, s);
    case "air": case "thrown": case "fall": return A.launched((f.t * 0.9) % 1, t, s);
    case "down": return A.down(k(0.9), t, s);
    case "getUp": return A.getUp(k(0.5), t, s);
    case "emerge": return A.emerge(k(0.9), t, s);
    case "dying": return A.hurt(1, t, s);
    // Floating off: going for a block, its arms out for it; with it, holding it up over its head.
    case "seize": { const p = A.float((t * 0.8 + f.id * 0.3) % 1, t, s); p.sF = 1.5; p.eF = 0.2; p.sB = 1.3; p.eB = 0.3; return p; }
    case "carry": { const p = A.float((t * 0.8 + f.id * 0.3) % 1, t, s); p.sF = 2.9; p.eF = 0.25; p.sB = 2.8; p.eB = 0.3; return p; }
    default: return A.idle((t * 0.5 + f.id * 0.3) % 1, t, s);
  }
}
// A cross of light: the long upright and the short beam, white-hot, glowing.
function lightCross(x, y, z, a, w) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,214,140,1)"; ctx.shadowBlur = 14 * scale * DPR;
  line(x, y - z, x, y + z * 0.9, "#fff7e2", w); line(x - z * 0.58, y - z * 0.32, x + z * 0.58, y - z * 0.32, "#fff7e2", w);
  ctx.shadowBlur = 0; line(x, y - z, x, y + z * 0.9, "#ffffff", w * 0.4); line(x - z * 0.58, y - z * 0.32, x + z * 0.58, y - z * 0.32, "#ffffff", w * 0.4);
  ctx.restore();
}
function drawSign(c, cam) {
  const x = c.x - cam.x, y = c.y - cam.y, t = c.t;
  if (c.kind === "smite") {
    // A shaft of light falls on the demon; the cross burns over it; rays and a ring go out.
    const k = t / 1.1, a = 1 - k, open = ease(Math.min(1, t / 0.12));
    const bw = lerp(30, 8, Math.min(1, t / 0.4)), g = ctx.createLinearGradient(0, 0, 0, y);
    g.addColorStop(0, "rgba(255,240,200,0)"); g.addColorStop(1, "rgba(255,240,200," + (0.55 * a) + ")");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - bw / 2, 0, bw, y + 10); ctx.globalCompositeOperation = "source-over";
    glow(x, y, 90 * open, C.flameHot, 0.6 * a);
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * 0.6, r0 = 18 * open, r1 = r0 + 70 * ease(Math.min(1, t / 0.5)); ctx.globalAlpha = 0.5 * a; line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, "#ffe9b8", i % 2 ? 1 : 2); }
    ctx.globalAlpha = 1;
    ring(x, y, 12 + 150 * ease(Math.min(1, t / 0.7)), "rgba(255,236,190," + (0.7 * a) + ")", 2.5 * a + 0.5);
    lightCross(x, y - 4, c.size * lerp(2.2, 1, open), a, 4.5);
  } else if (c.kind === "ward") {
    // The cross appears in the air before him, and fades as the light settles round his body.
    const a = Math.min(1, t / 0.1) * (1 - t / 0.8), z = c.size * lerp(1.5, 1, ease(Math.min(1, t / 0.2)));
    glow(x, y, z * 3, C.flameHot, 0.4 * a); lightCross(x, y, z, a, 3.5);
  } else if (c.kind === "turn") {
    // A boulder turned: a flash of the cross and a ring.
    const a = 1 - t / 0.8; ring(x, y, 14 + 70 * ease(t / 0.8), "rgba(255,236,190," + (0.8 * a) + ")", 2); lightCross(x, y, c.size * (1 + t * 0.5), a, 3.5);
  } else if (c.kind === "fizzle") {
    // Not enough flare: the sign begins, breaks, and falls.
    const a = 0.6 * (1 - t / 0.8), z = c.size, dy = t * t * 60;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
    line(x - 1, y - z + dy * 0.5, x - 2, y - 2 + dy, "#c9b892", 2); line(x + 1, y + 2 + dy * 1.2, x + 2, y + z * 0.9 + dy * 1.4, "#c9b892", 2);
    line(x - z * 0.58, y - z * 0.32 + dy, x - 3, y - z * 0.36 + dy * 0.8, "#c9b892", 2); line(x + 3, y - z * 0.3 + dy * 1.1, x + z * 0.58, y - z * 0.26 + dy * 1.3, "#c9b892", 2);
    ctx.restore();
  }
}
// A boulder: the stone drawn large.
function drawBoulder(x, y, rot, lit) { ctx.save(); ctx.translate(x, y); ctx.scale(1.85, 1.85); drawObject("stone", 0, 0, rot, { lit, t: S.rt }); ctx.restore(); }
function drawRope(P, w, c) {
  if (P.length < 2) return;
  ctx.beginPath(); ctx.moveTo(P[0].x - S.cam.x, P[0].y - S.cam.y);
  for (let k = 1; k < P.length; k++) ctx.lineTo(P[k].x - S.cam.x, P[k].y - S.cam.y);
  ctx.strokeStyle = c || "#0b0b0d"; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.stroke();
}
function drawHook(x, y, a) {
  // A grappling hook: a shaft and three curved tines.
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(3, 0);
  ctx.moveTo(3, 0); ctx.quadraticCurveTo(6, -1, 5, -5); ctx.moveTo(3, 0); ctx.quadraticCurveTo(6, 1, 5, 5); ctx.moveTo(3, 0); ctx.lineTo(7, 0);
  ctx.stroke(); ctx.lineCap = "butt";
  ctx.restore();
}
// Under a tip being read: how to go on.
function goOnLine(y, a) { text(usingKeys() ? "PRESS ANY KEY TO GO ON" : "TAP TO GO ON", W / 2, y, { align: "center", size: 7.5, weight: 800, spacing: 2, color: C.flame, alpha: a * (0.6 + 0.4 * Math.sin(S.rt * 4)), glow: "rgba(0,0,0,0.9)", blur: 6 }); }
// A heart: full, or only its outline.
// An herb where it grows: only where the light is on it, a little lit, so it is seen. Rue and sage
// a low tuft of leaves; hyssop and wormwood a taller sprig.
function drawHerb(h, cam) {
  const x = h.x - cam.x, y = h.y - cam.y; if (x < -20 || x > W + 20 || y < -20 || y > H + 30) return;
  if (!inLight(h.x, h.y - 5)) return;
  const c = HERBS[h.kind].c, sway = Math.sin(S.rt * 1.6 + h.x) * 0.12;
  glow(x, y - 6, 16, c, 0.28);
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = c; ctx.strokeStyle = "#1a2214"; ctx.lineWidth = 1;
  const leaf = (lx, ly, a, l, w) => { ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + sway); ctx.beginPath(); ctx.ellipse(0, -l / 2, w, l / 2, 0, 0, TAU); ctx.fill(); ctx.restore(); };
  if (h.kind === "rue" || h.kind === "sage") { for (let i = -2; i <= 2; i++) leaf(i * 1.5, 0, i * 0.42, h.kind === "sage" ? 7 : 6, h.kind === "sage" ? 2.2 : 1.6); }
  else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway * 8, -7, sway * 10, -14); ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.stroke(); for (let i = 0; i < 4; i++) { const ly = -3 - i * 3; leaf(sway * i * 2, ly, (i % 2 ? 1 : -1) * 0.9, h.kind === "hyssop" ? 3.5 : 4.5, 1.1); } }
  ctx.restore();
}
// The pouch's button (by the flare), what is in it, the flasks (tapped, drunk), the soup on him,
// and the pouch opened: the herbs to choose from, the grinding, the herbal of what pairs make.
const pouchBtn = () => ({ x: W - 58, y: H - 228, r: 22 });
function drawSoups() {
  // The flasks, under the hearts: tapped (1, 2, 3 on keys), drunk.
  S.flasks.forEach((k, i) => {
    const x = 20 + i * 18, y = 84, c = k === "soup" ? "#c9a46a" : { rising: "#cfe4ff", unseen: "#b9b3d9", feather: "#e9e6df", bright: "#ffd27a" }[k];
    rect(x - 3, y - 8, 6, 3, "#3a3026"); ctx.beginPath(); ctx.ellipse(x, y, 5.5, 6, 0, 0, TAU); ctx.fillStyle = "rgba(20,18,16,0.85)"; ctx.fill(); ctx.strokeStyle = "rgba(233,230,223,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 4, 4, 0, 0, TAU); ctx.fillStyle = c; ctx.fill();
    buttons.push({ x: x - 8, y: y - 11, w: 16, h: 20, act: () => drink(i) });
  });
  if (S.flasks.length) text("SOUP", 20 + S.flasks.length * 18, 87, { size: 6.5, weight: 800, spacing: 1, color: "rgba(233,230,223,0.5)" });
  if (S.soup) { const left = 1 - S.soup.t / SOUP_T; text(SOUPS[S.soup.kind].name, W / 2, 30, { align: "center", size: 7.5, weight: 800, spacing: 2, color: "#e9e6df", alpha: 0.8 }); rect(W / 2 - 40, 36, 80 * left, 2, "#e9e6df"); }
  // The pouch: what is in it, at its button.
  const n = HERB_KEYS.reduce((a, k) => a + (S.pouch[k] || 0), 0), pb = pouchBtn();
  if (n || S.flasks.length) {
    ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fillStyle = "rgba(10,9,8,0.55)"; ctx.fill(); ctx.strokeStyle = "rgba(201,180,120,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
    text("HERBS", pb.x, pb.y - 2, { align: "center", size: 6.5, weight: 800, spacing: 1, color: "#e9e6df" });
    text(String(n), pb.x, pb.y + 9, { align: "center", size: 7, weight: 800, color: "rgba(233,230,223,0.7)" });
    buttons.push({ x: pb.x - pb.r, y: pb.y - pb.r, w: pb.r * 2, h: pb.r * 2, act: () => openPouch() });
  }
  if (!S.mix) return;
  // The pouch opened.
  const M_ = S.mix, w = 360, h = 200, x0 = W / 2 - w / 2, y0 = H / 2 - h / 2 - 10;
  rect(0, 0, W, H, "rgba(3,3,5,0.6)"); rect(x0, y0, w, h, "rgba(14,12,10,0.94)");
  text("THE POUCH", W / 2, y0 + 20, { align: "center", font: FONT.title, size: 13, weight: 700, spacing: 3, color: C.gold });
  text(M_.grind >= 0 ? "Grinding..." : M_.full ? "His three flasks are full: drink one first." : M_.pick.length ? "And one more." : "Choose two herbs to grind together.", W / 2, y0 + 36, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm });
  HERB_KEYS.forEach((k, i) => {
    const bx = x0 + 14 + i * 84, by = y0 + 48, have = (S.pouch[k] || 0) - M_.pick.filter((q) => q === k).length;
    button(HERBS[k].name, bx, by, 78, 40, () => pickHerb(k), { off: have <= 0 || M_.grind >= 0, hot: M_.pick.includes(k), sub: (have > 0 ? have : 0) + "  \u00b7  key " + (i + 1), size: 8 });
  });
  if (M_.grind >= 0) { const k = M_.grind / GRIND_T; rect(W / 2 - 60, y0 + 98, 120, 3, "rgba(255,255,255,0.15)"); rect(W / 2 - 60, y0 + 98, 120 * k, 3, C.gold); }
  // The herbal: each pair once made.
  const known = Object.entries(save.herbal || {});
  text(known.length ? "THE HERBAL" : "The herbal is empty: what a pair makes is learned by making it.", W / 2, y0 + 118, { align: "center", size: known.length ? 7.5 : 8, weight: 800, spacing: known.length ? 2 : 0, color: "rgba(233,230,223,0.6)", max: w - 20 });
  known.slice(0, 10).forEach(([p, fx], i) => text(p.split("+").map((q) => HERBS[q].name.toLowerCase()).join(" + ") + ":  " + SOUPS[fx].name.toLowerCase(), x0 + 20 + (i % 2) * 170, y0 + 134 + Math.floor(i / 2) * 12, { size: 8, weight: 600, color: "#e9e6df" }));
  if (M_.grind < 0) button("CLOSE", W / 2 - 40, y0 + h - 2, 80, 26, () => { S.mix = null; }, { size: 8 });
}
function drawHeart(x, y, full) {
  ctx.beginPath(); ctx.moveTo(x, y + 4.5); ctx.bezierCurveTo(x - 7, y - 0.5, x - 4.5, y - 6, x, y - 2.5); ctx.bezierCurveTo(x + 4.5, y - 6, x + 7, y - 0.5, x, y + 4.5); ctx.closePath();
  if (full) { ctx.fillStyle = "#e0573f"; ctx.fill(); } ctx.strokeStyle = full ? "rgba(255,210,190,0.7)" : "rgba(233,230,223,0.45)"; ctx.lineWidth = 1; ctx.stroke();
}
function draw() {
  // (The shaking, and the knock of a blow: the view thrown the blow's way and coming back.)
  const K = S.kick, kk = K ? Math.max(0, 1 - K.t / 0.16) : 0;
  const sx = (S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0) - (K ? K.x * kk * kk : 0), sy = (S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0) - (K ? K.y * kk * kk : 0);
  S.cam.x += sx; S.cam.y += sy;
  drawWorld();
  S.cam.x -= sx; S.cam.y -= sy;
}
// ---- The domains, drawn ----------------------------------------------------------------------------
// The rock stays black everywhere. A domain shows in the mist (a little of its colour in it) and in
// the dark (a little there too), in its gates and its idols, and in the light of its own fires.
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbs = (c, a) => "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")";
function tintStep(dt) {
  const dom = sectionAt(Math.max(1, Math.floor(-(S.cam.y + H / 2) / CELL))).dom;
  const hc = -(S.cam.y + H / 2) / CELL, m = rgb(dom ? mix(mix("#ffffff", SINS[dom].color, 0.34), strataAt(hc, dom), 0.22) : "#ffffff"), d = rgb(dom ? mix("#040406", SINS[dom].deep, 0.28) : "#040406");
  if (!S.tint) S.tint = { m, d };
  const k = 1 - Math.exp(-dt * 1.2);
  for (let i = 0; i < 3; i++) { S.tint.m[i] += (m[i] - S.tint.m[i]) * k; S.tint.d[i] += (d[i] - S.tint.d[i]) * k; }
}
// Points in a frame of its own (u, v) put on the screen at (x, y): flipped by side, v going up.
const put = (x, y, side, cam) => (u, v) => [x + side * u - cam.x, y - v - cam.y];
// Gluttony's common demon, from its traced poses: its feet at (0, 0), facing f.dir; lit, the torch shows its colour.
function drawGlutton(f, al) {
  const st = f.st, k = st === "dying" ? "gd7" : f.hurtT > 0 || st === "hurt" || st === "down" ? "gd6" : st === "heave" || st === "inhale" ? "gd3" : st === "lob" ? "gd4"
    : st === "swallow" || st === "bite" ? "gd5" : Math.abs(f.vx || 0) > 8 ? (Math.floor(S.rt * 5 + f.x * 0.01) % 2 ? "gd1" : "gd2") : "gd0";
  // Winding up, it shakes, harder and harder, before the fat comes up.
  const sh = st === "heave" ? clamp(f.t / 0.75, 0, 1) * 2.4 : 0, jx = sh * (Math.random() * 2 - 1), jy = sh * 0.6 * (Math.random() * 2 - 1);
  const P = new Path2D(); addShape(P, TRACED[k], (u, v) => [f.dir * u + jx, -v + jy]);
  ctx.globalAlpha *= al; ctx.fillStyle = C.ink; ctx.fill(P, "evenodd");
  const sc = 1 + 0.1 * (f.size || 0);
  if (S.torch) shadeGlut(P, (S.torch[0] - f.x) / sc, (S.torch[1] - f.y - (f.dy || 0)) / sc, lightR() / sc, clamp(f.lit, 0, 1));
  if (st !== "dying") eyeGlut(k, f.dir, jx, jy);
}
// Rounded by the torch (at tx, ty, in the shape's own frame): its sickly yellow strongest on the
// side the torch is, falling off into black; and a rim of the torch's light round the edge, as the monk's.
function shadeGlut(P, tx, ty, R, L) {
  if (L <= 0.02) return;
  ctx.save(); ctx.clip(P, "evenodd");
  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.42);
  g.addColorStop(0, "rgba(176,150,52," + 0.75 * L + ")"); g.addColorStop(0.45, "rgba(120,96,30," + 0.45 * L + ")"); g.addColorStop(1, "rgba(60,44,12,0)");
  ctx.fillStyle = g; ctx.fill(P, "evenodd");
  const rim = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
  rim.addColorStop(0, "rgba(255,190,110," + 0.9 * L + ")"); rim.addColorStop(0.5, "rgba(232,128,58," + 0.45 * L + ")"); rim.addColorStop(1, "rgba(232,128,58,0)");
  ctx.strokeStyle = rim; ctx.lineWidth = 2.6; ctx.stroke(P); ctx.restore();
}
// Its eye, glinting in the dark.
function eyeGlut(k, dir, jx, jy) {
  const e = glutEye(k); if (!e) return;
  const x = dir * e[0] + jx, y = -e[1] + jy; glow(x, y, 11, SINS.gluttony.eye, 0.75); ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fillStyle = SINS.gluttony.eye; ctx.fill();
}
// Where the eye is in each traced pose: the small hole highest up in it.
const GLUT_EYE = {};
function glutEye(k) {
  if (k in GLUT_EYE) return GLUT_EYE[k];
  let best = null;
  for (const L of TRACED[k].slice(1)) {
    let mu = 0, mv = 0, u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; const n = L.length / 2;
    for (let i = 0; i < L.length; i += 2) { mu += L[i] / n; mv += L[i + 1] / n; u0 = Math.min(u0, L[i]); u1 = Math.max(u1, L[i]); v0 = Math.min(v0, L[i + 1]); v1 = Math.max(v1, L[i + 1]); }
    if (u1 - u0 < 4 && v1 - v0 < 4 && (!best || mv > best[1])) best = [mu, mv];
  }
  return (GLUT_EYE[k] = best);
}
// A traced shape (TRACED): its outlines, moved along by du and leaned by lean (u + lean * v).
function addShape(path, loops, T, du = 0, lean = 0) {
  for (const L of loops) { let a = T(L[0] + du + lean * L[1], L[1]); path.moveTo(a[0], a[1]); for (let i = 2; i < L.length; i += 2) { a = T(L[i] + du + lean * L[i + 1], L[i + 1]); path.lineTo(a[0], a[1]); } path.closePath(); }
}
function addPoly(path, pts, T) { const a = T(pts[0][0], pts[0][1]); path.moveTo(a[0], a[1]); for (let i = 1; i < pts.length; i++) { const b = T(pts[i][0], pts[i][1]); path.lineTo(b[0], b[1]); } path.closePath(); }
function addOval(path, u, v, ru, rv, T, n) { n = n || 12; const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([u + Math.cos(a) * ru, v + Math.sin(a) * rv]); } addPoly(path, pts, T); }
// Bel, seated on his plinth, his head thrown back and his mouth open, reaching to the loaves on his
// table: traced from a silhouette made for the game (black on white, the white lines in it cut through),
// in the idol's own frame (its middle at u 33, its foot at v 0). The first outline is his; the rest,
// the cuts in it, wound the other way so they show through.
const BEL = [
  [22.1,32,22.1,30.4,20.8,30,20.1,29.5,19.9,29.3,20.1,28.9,19.6,28.5,18.8,28.6,18,28.9,16.9,30,17,29.2,17.6,28,18.3,27.3,19.1,26.9,18.8,25.3,19.9,24.5,19.8,23.9,20.2,23.6,18.6,21.8,17.7,20.2,16.9,17.7,16.5,15,16.5,13.1,17.5,12.2,17.5,11.6,17.1,11.2,16.5,7.8,17.3,5.6,18.2,4.5,13,4.4,12.8,0,53.1,0,52.9,4.4,50.6,4.5,50.6,7.9,51.4,7.9,51.5,9.1,52.4,9.2,52.6,10.7,51.4,10.7,51.7,11.2,51.6,11.6,50.8,12.4,49.8,12.5,48.8,12.1,49.4,12.7,50.1,12.9,50,13.7,49.4,14.2,48.6,14.5,47.6,14.5,46.7,14.1,47.1,14.5,47.7,14.8,47.6,15.4,46.9,15.8,45.3,16,44.2,15.6,43.6,15,43.5,14.3,44.9,14.3,45.6,13.8,44.5,14.1,43.5,14,42.2,13.3,42,12.5,43.2,12.3,43.8,11.8,42.8,12.1,41.8,12.1,40.7,11.4,40.5,10.7,38.9,10.7,39,9.2,39.6,9.1,39.7,7.9,40.4,7.9,40.4,4.5,39.3,4.5,39.7,5.7,39.2,7.3,38.1,8.2,37.3,8.6,37.9,10.3,37.9,11.8,37.6,13.2,37.1,14.3,36.3,15.4,35.2,16.5,33.6,17.5,31.8,18.3,32,18.6,33,18.3,34.6,17.5,35.8,16.5,36.6,16.6,36.7,16.4,37.2,16.4,38.3,16.6,38.5,17,39.6,16.9,40.7,15.8,41.7,15.2,42.4,15.3,42.5,15.5,41.6,16.4,41.5,17,42.4,16.9,42.8,16.2,43.4,15.7,43.8,15.8,43.8,16,43.3,17,44.6,16.5,45,16.6,45.1,16.8,44,17.8,42.1,18.7,38.7,19.2,38.4,19.5,37,20,36.8,20,36.5,19.6,32,20.7,28.1,22.7,29.3,24.3,30.8,25,30.2,25.4,30.4,25.7,29.1,26.8,29,26.1,28.3,26.3,28,26.7,27.9,27.7,28.1,28.2,28.6,28.6,28.5,28.9,27.8,29,28,29.8,27.6,29.9,25.1,29.4,24.1,30.1,23.3,30.3,22.8,31.3],
  [22.7,16.9,21.8,15,22.7,14,23.4,14,24.9,13.2,27.2,13.6,28.2,13,29.6,11.8,29.5,10.8,31.3,10.2,32.8,8.9,33.9,7,33.9,5.8,33.3,7,32.5,8.4,31.5,9.4,30.1,10.1,28.2,10.7,28.2,10.8,28.9,10.9,29.1,11.6,28.1,12.5,27,13.1,24.7,12.5,24.6,12.9,23.4,13.6,22.6,13.5,21.1,15.2],
  [45.9,12.8,46.9,12.8,47.4,12.6,47.8,12,46.6,12.4,45.8,12.4,44.7,12,45,12.5],
  [18.3,11.7,19.8,11,21.3,10.7,21.3,10.2,19.2,10.8,18.3,11.4],
  [42.5,7.9,48.5,7.9,48.9,4.7,48.9,4.5,48.5,4.5,42.2,4.5],
  [36.7,7.8,36.5,7.2,35.6,6.3,35.5,6.7,36,7],
].map((L) => { const P = []; for (let i = 0; i < L.length; i += 2) P.push([L[i], L[i + 1]]); return P; });
// The idols, one to a domain, each from the Scriptures: Bel, who was said to eat (Daniel 14); Moloch,
// the bull with the fire in its belly; and so on (those of the domains not yet made: a figure on a plinth).
function idolPath(path, dom, T) {
  if (dom === "gluttony") {
    for (const L of BEL) addPoly(path, L, T);                                                             // (drawn by hand: see BEL)
  } else if (dom === "wrath") {
    addPoly(path, [[24, 0], [41, 0], [41, 4], [24, 4]], T);
    addPoly(path, [[28, 4], [39, 4], [38.5, 24], [28.5, 24]], T);                                          // the body
    addPoly(path, [[29.5, 21], [21, 18], [19.6, 16.2], [21.2, 15.6], [29.5, 17.6]], T);                    // the arms held out, the hands open
    addPoly(path, [[29, 23], [37.5, 23], [38, 29], [35.5, 33], [30.5, 33], [28.4, 30.4], [25, 29.8], [24.6, 27.2], [28.4, 26.4]], T);   // the bull's head
    addPoly(path, [[30.6, 32], [27.6, 37.6], [25.4, 40.4], [26.6, 36.2], [29, 31]], T); addPoly(path, [[35, 32.4], [37.6, 37], [37.4, 40.6], [35.6, 37], [33.6, 32.8]], T);   // the horns
  } else if (dom === "avarice") {
    // The golden calf, that Aaron made of their earrings, and they said: "These are thy gods, O
    // Israel" (Exodus 32:4): on its plinth, standing four-square, its head up.
    addPoly(path, [[22, 0], [44, 0], [44, 4], [22, 4]], T);                                                // the plinth
    addOval(path, 33, 15, 9, 5, T, 14);                                                                   // the body
    for (const u of [26, 29, 37, 40]) addPoly(path, [[u - 1.1, 4], [u + 1.1, 4], [u + 1.3, 12], [u - 1.3, 12]], T);   // the legs
    addPoly(path, [[39.5, 16], [42, 22], [46.5, 23.5], [47.5, 20.5], [44.5, 18.5], [41.5, 13.5]], T);       // the neck and head
    addPoly(path, [[43, 22.5], [41.5, 26.5], [42.6, 26.6], [44.2, 23]], T); addPoly(path, [[45.4, 23.4], [46.8, 27], [47.6, 26.4], [46.6, 23]], T);   // the horns
    addPoly(path, [[24.2, 16], [21, 12], [21.6, 11.2], [24.8, 14.5]], T);                                    // the tail
  } else if (dom === "lust") {
    // Ashtoreth, the goddess of the Sidonians, after whom Solomon went (1 Kings 11:5): slender on her
    // plinth, her arms raised, holding up the horned moon over her head.
    addPoly(path, [[26, 0], [40, 0], [40, 4], [26, 4]], T);
    addPoly(path, [[29, 4], [37, 4], [35.2, 16], [36, 22], [34.8, 28], [31.2, 28], [30, 22], [30.8, 16]], T);   // the body, long and narrow
    addOval(path, 33, 31.5, 2.6, 3.1, T, 10);                                                                 // the head
    addPoly(path, [[31, 26.5], [27.6, 33], [28.4, 36.5], [29.6, 36], [29.4, 33.4], [32, 27.5]], T);            // the arms raised
    addPoly(path, [[35, 26.5], [38.4, 33], [37.6, 36.5], [36.4, 36], [36.6, 33.4], [34, 27.5]], T);
    addPoly(path, [[26.6, 37], [28.6, 36.4], [30.6, 39], [33, 40], [35.4, 39], [37.4, 36.4], [39.4, 37], [37.2, 40.8], [33, 42.4], [28.8, 40.8]], T);   // the horned moon held up
  } else {
    addPoly(path, [[26, 0], [40, 0], [40, 4], [26, 4]], T);
    addPoly(path, [[29.5, 4], [36.5, 4], [35.5, 26], [37, 32], [33, 36], [29, 32], [30.5, 26]], T);
    addOval(path, 33, 38.5, 3.6, 3.8, T, 10);
  }
}
// A shrine on its level ground: about the idol (or what is left of it), the things of its domain's
// worship; and its worshippers, kneeling, or fled. Each domain's differs: Bel at his table, jars
// of wine set by; Ashtoreth between two bowls of incense; Moloch with a fire pit before him.
const ROBE = "#17141b", IK = 1.35;   // the robes' dark; the idol's size, out on open ground
function drawShrine(f, cam, rimP, idols, lights) {
  const sx = f.x - cam.x, sy = f.y - cam.y, dom = f.sin;
  const [lx, ly] = S.torch, near = dist(lx, ly, f.x, f.y - 20) < lightR() * 0.85 && los(lx, ly, f.x, f.y - 20);
  for (const w of f.who) drawWorshipper(w, cam, rimP, near);
  if (sx < -120 || sx > W + 120 || sy < -90 || sy > H + 60) return;
  const K = IK * (f.big || 1), rz = f.st === "rise" ? ease(clamp(f.t / 0.9, 0, 1)) : 1, B0 = put(f.x, f.y, 1, cam), B = (u, v) => B0(u * K, v * K), ink = new Path2D();
  if (dom === "gluttony") for (const u of [22, 29]) { addOval(ink, u, 4.5, 3.3, 4.5, B, 10); addPoly(ink, [[u - 1.3, 8], [u + 1.3, 8], [u + 1.8, 10.5], [u - 1.8, 10.5]], B); }
  else if (dom === "lust") for (const u of [-17, 17]) {
    addPoly(ink, [[u - 3.5, 0], [u + 3.5, 0], [u + 0.8, 2], [u + 0.6, 22], [u - 0.6, 22], [u - 0.8, 2]], B); addPoly(ink, [[u - 5, 22], [u + 5, 22], [u + 3.5, 26], [u - 3.5, 26]], B);
    if (f.st === "idle" && Math.random() < 0.05) S.parts.push({ kind: "smoke", x: f.x + u * K, y: f.y - 27 * K, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 8, r: 2 + Math.random() * 2, life: 1.8, age: 0 });
  } else if (dom === "avarice") { for (const u of [-24, 24, 31]) addPoly(ink, [[u - 6, 0], [u + 6, 0], [u + 3, 3.5], [u, 4.5], [u - 3, 3.5]], B); }
  else if (dom === "wrath") { addPoly(ink, [[13, 0], [29, 0], [27, 5], [15, 5]], B); lights.push({ x: sx + 21 * K, y: sy - 6, r: 50, a: 0.5 }); }
  if (f.st === "broken") addPoly(ink, [[-8, 0], [8, 0], [7, 4], [2, 5.5], [-3, 4.5], [-7, 4]], B);
  else {
    // Standing (shaken as it is struck), or falling over.
    const ang = f.st === "topple" ? f.fall * (PI / 2) * ease(Math.min(1, f.t / 0.45)) : f.hurtT > 0 ? Math.sin(f.hurtT * 70) * 0.05 : 0;
    const base = put(f.x - 33 * K, f.y, 1, cam), px = sx + (f.st === "topple" ? f.fall * 10 : 0), c = Math.cos(ang), sn = Math.sin(ang);
    const T = (u, v) => { const [x, y] = base(u * K, v * K * rz), dx = x - px, dy = y - sy; return [px + dx * c - dy * sn, sy + dx * sn + dy * c]; };
    const idol = new Path2D(); idolPath(idol, dom, T);
    ctx.fillStyle = C.ink; ctx.fill(idol); rimP.addPath(idol); idols.push({ path: idol, dom, idol: true });
    if (dom === "wrath" && f.st === "idle") { const a = T(31, 12), b = T(36, 7); rect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1], "#3a0c06"); }
  }
  ctx.fillStyle = C.ink; ctx.fill(ink); rimP.addPath(ink);
}
// One of them: at prayer, its head turning to his light as it comes near; or running, bent double,
// its robe flying, and fading into the dark.
function drawWorshipper(w, cam, rimP, near) {
  const x = w.x - cam.x, y = w.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
  const run = w.st === "run", P = worshipPath(x, y, run ? w.dir : w.side, worshipPose(w, S.rt), { t: S.rt, vx: run ? w.dir * (w.sp || 80) : 0, vy: w.vy || 0, noTorch: true, drape: 3.5, pointed: true });
  // (One colour, and a little faded from the first, as though half in shadow: no rim of torchlight.)
  ctx.globalAlpha = w.a * 0.62; ctx.fillStyle = ROBE; ctx.fill(P); ctx.globalAlpha = 1;
}
// The worshippers are jointed like the monk (his body and habit, without the torch), after the
// worshippers' sheets: kneeling with hands lifted; bowed low; flat on the face; standing with arms
// raised (Lust's, swaying). Their hands rise and fall a little as they pray. When the idol falls:
// a moment's panic, hands to the head, and then they run.
const W_KNEEL = { lean: 0.12, hF: 1.45, kF: 1.5, hB: -0.12, kB: 1.75 };
function worshipPose(w, t) {
  const b = Math.sin(t * 1.4 + w.ph * 3), k = w.kind;
  if (w.st === "run") {
    if (w.t < 0.4) return pose(Object.assign({}, W_KNEEL, { lean: -0.12 + w.t * 0.5, head: 0.35, sF: 2.85, eF: 2.5, sB: 2.95, eB: 2.4, hF: 1.45 * (1 - w.t / 0.4), kF: 1.5 * (1 - w.t / 0.4), hB: 0, kB: 0.3 }));
    const p = MONK_ANIM.run(((w.ph / TAU) % 1 + 1) % 1); p.sB = 0.3 - 1.0 * p.hB; p.eB = 1.7; p.head = -0.25; return p;
  }
  if (k === 1) return pose(Object.assign({}, W_KNEEL, { lean: 1.25 + 0.04 * b, head: 0.5, sF: 1.45, eF: 0.2, sB: 1.35, eB: 0.25 }));
  if (k === 2) return pose({ spin: 1.52, lift: -19.5, lean: 0, head: 0.15, sF: 2.95 + 0.05 * b, eF: 0.05, sB: 2.85, eB: 0.1, hF: 0.05, kF: 0.2, hB: -0.05, kB: 0.35 });
  if (k === 3) return pose({ lean: Math.sin(t * 1.6 + w.ph) * 0.07, head: -0.35, sF: 2.55 + 0.12 * b, eF: 0.35, sB: 2.2 + 0.1 * b, eB: 0.5, hF: 0.06, kF: 0.04, hB: -0.06, kB: 0.08 });
  return pose(Object.assign({}, W_KNEEL, { head: -0.4, sF: 2.6 + 0.12 * b, eF: 0.45, sB: 2.35 + 0.1 * b, eB: 0.55 }));
}
// A figure's shape as one path on the screen (its feet at x, y, facing dir).
function worshipPath(x, y, dir, p, o) {
  const J = solve(MONK_BODY, p), G = monkGeo(J, p, o, dir), P = new Path2D();
  const c = Math.cos(p.spin || 0), s = Math.sin(p.spin || 0);
  const tf = (q) => q.map(([u, v]) => { const dx = u - J.hip[0], dy = v - J.hip[1]; return [x + (J.hip[0] + dx * c - dy * s) * dir, y + J.hip[1] + dx * s + dy * c]; });
  for (const q of G.A) addPts(P, tf(q)); for (const q of G.B) addPts(P, tf(q));
  return P;
}
// A piece of a broken idol: a rough lump of it, its colour showing in the light.
function drawShardOf(x, y, rot, lit, dom, sid) {
  const pts = []; for (let i = 0; i < 7; i++) { const a = rot + i / 7 * TAU, r = 7.5 + 5 * hash2(sid || 1, i, 41); pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  poly(pts, "#0d0d10");
  if (lit) { poly(pts, hexA((SINS[dom] || SINS.wrath).dark, 0.75)); ctx.globalAlpha = 0.6; line(pts[0], pts[1], pts[6], pts[7], (SINS[dom] || SINS.wrath).color, 1); ctx.globalAlpha = 1; }
}
// A gate: the great block over the doorway carved as its domain's face. The block is rock (drawn
// already); here are its carvings, and what hangs from it.
const carved = [];
function drawGate(sec, cam, rimP, embers) {
  const T0 = trav(sec), D = T0.door; if (!D) return;
  const x0 = D.i0 * CELL, x1 = (D.i1 + 1) * CELL, yB = -(sec.h0 + 11) * CELL, yF = -(sec.h0 + 7) * CELL;
  if (x1 < cam.x - 80 || x0 > cam.x + W + 80 || yB < cam.y - 120 || yB > cam.y + H + 120) return;
  const T = put(x0, yB, 1, cam), F = put(x0, yF, 1, cam), solidP = new Path2D(), cut = new Path2D(), dom = sec.dom;
  if (dom === "gluttony") {
    // A mouth: the doorway is its gape. Teeth hang from the block, teeth stand up from the floor, and
    // above, two round eyes and the swell of its cheeks.
    for (let q = 0; q < 5; q++) addPoly(solidP, [[2 + q * 9.4, 0.5], [10 + q * 9.4, 0.5], [6 + q * 9.4, -9 - (q % 2) * 3]], T);
    for (let q = 0; q < 5; q++) addPoly(solidP, [[3 + q * 9.4, -0.5], [9.5 + q * 9.4, -0.5], [6.2 + q * 9.4, 6 + (q % 2) * 2]], F);
    addPoly(solidP, [[-4, 0], [0, 0], [0, 64], [-3, 50], [-6, 30], [-6.5, 12]], T); addPoly(solidP, [[48, 0], [52, 0], [54.5, 12], [54, 30], [51, 50], [48, 64]], T);   // the swollen cheeks
    addOval(cut, 13, 42, 5.5, 5.2, T, 12); addOval(cut, 35, 42, 5.5, 5.2, T, 12);
    addPoly(cut, [[4, 5], [44, 5], [42, 7.5], [24, 9], [6, 7.5]], T);
  } else if (dom === "wrath") {
    // A bull's head: the horns sweeping out and down from the block, a heavy brow, the nostrils
    // flared over the doorway; and the cracks of its hide, with the fire in them.
    addPoly(solidP, [[0, 58], [-9, 52], [-14, 40], [-12, 28], [-8, 22], [-7.5, 31], [-5, 42], [0, 47]], T);
    addPoly(solidP, [[48, 58], [57, 52], [62, 40], [60, 28], [56, 22], [55.5, 31], [53, 42], [48, 47]], T);
    addPoly(cut, [[8, 44], [20, 38], [19, 35], [9, 40]], T); addPoly(cut, [[40, 44], [28, 38], [29, 35], [39, 40]], T);
    addOval(cut, 17, 10, 3.2, 2.6, T, 10); addOval(cut, 31, 10, 3.2, 2.6, T, 10);
    addPoly(cut, [[10, 20], [38, 20], [36, 22], [12, 22]], T);
    embers.push([T(6, 56), T(12, 48), T(9, 40), T(15, 30)], [T(42, 58), T(37, 49), T(40, 41), T(34, 28)], [T(24, 62), T(22, 52), T(25, 46)]);
  } else if (dom === "avarice") {
    // A great purse: its body swelling down either side of the doorway, its neck gathered over it
    // by a drawstring knotted in front, and coins spilling from its mouth on the floor.
    addPoly(solidP, [[-2, 0], [2, 0], [1, 22], [-5, 40], [-9, 52], [-7, 60], [0, 64]], T); addPoly(solidP, [[46, 0], [50, 0], [55, 22], [57, 40], [55, 52], [50, 60], [48, 64]], T);
    addPoly(cut, [[6, 46], [42, 46], [40, 49], [24, 50.5], [8, 49]], T);                                   // the drawstring
    addOval(cut, 24, 48, 3.4, 2.8, T, 10); addPoly(cut, [[22.5, 46], [25.5, 46], [27, 38], [24, 36], [21, 38]], T);   // its knot, and the tie hanging
    for (let q = 0; q < 6; q++) addPoly(cut, [[8 + q * 6.5, 30], [10 + q * 6.5, 30], [11 + q * 6.5, 44], [9 + q * 6.5, 44]], T);   // the gathers of its neck
    for (let q = 0; q < 5; q++) addOval(solidP, 6 + q * 9.5, -1.6, 3.2, 1.6, F, 8);                        // coins on the floor
  } else if (dom === "lust") {
    // A veiled face: the veil falling from the brow over the block in long folds, two narrow eyes
    // above it, and briars hanging down either side of the doorway, to the floor.
    addPoly(cut, [[9, 40], [19, 43], [21, 41.5], [11, 38.5]], T); addPoly(cut, [[39, 40], [29, 43], [27, 41.5], [37, 38.5]], T);   // the eyes, long and narrow
    addPoly(cut, [[4, 34], [44, 34], [42, 31.5], [24, 30], [6, 31.5]], T);                               // the veil's hem across the face
    for (let q = 0; q < 4; q++) addPoly(cut, [[10 + q * 9.5, 29], [12 + q * 9.5, 29], [11.5 + q * 9.5, 8], [10.5 + q * 9.5, 8]], T);   // its folds
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? -1.5 : 49.5;
      addPoly(solidP, [[x - 1.2, 0], [x + 1.2, 0], [x + 1.6 * sd, -20], [x + 0.2, -42], [x - 1.8, -42], [x - 0.6 * sd, -20]], T);   // the briar hanging
      for (let q = 0; q < 7; q++) { const v = -3 - q * 5.6, o = (q % 2 ? 1 : -1); addPoly(solidP, [[x, v - 1.2], [x + o * 5, v - 3.2], [x, v + 1.2]], T); }
    }
  } else {
    addPoly(cut, [[6, 8], [42, 8], [42, 56], [6, 56]], T);
  }
  ctx.fillStyle = C.ink; ctx.fill(solidP); rimP.addPath(solidP);
  // The carving on the block's face is in the rock, where the torch's rays do not go: it is laid on
  // after the dark, as bright as the torch is near (and can see the doorway under it).
  const [cx, cy] = [(x0 + x1) / 2, yB + 8], [lx, ly] = S.torch, k = clamp(1 - dist(lx, ly, cx, cy) / (lightR() * 0.95), 0, 1) * (los(lx, ly, cx, cy) ? 1 : 0);
  if (k > 0.02) carved.push({ path: cut, k, x: cx - cam.x, y: cy - cam.y });
}
// Briars along a rock face from (ax, ay) to (bx, by), pointing out along (nx, ny): a tangled
// stem close along the rock, and thorns standing out from it, long and short.
function briarStrip(P, ax, ay, bx, by, nx, ny, key) {
  const L = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / L, ty = (by - ay) / L, n = Math.max(2, Math.round(L / 4));
  // The stem, tangled: a thick band along the rock, humped here and there.
  P.moveTo(ax, ay);
  for (let q = 0; q <= n; q++) { const u = q / n, w = 2.6 + 1.8 * Math.sin(u * 9 + key) * Math.sin(u * 3.1 + key * 0.7); P.lineTo(lerp(ax, bx, u) + nx * w, lerp(ay, by, u) + ny * w); }
  P.lineTo(bx, by); P.closePath();
  // The thorns: every few pixels, leaning this way and that, some long.
  for (let q = 0; q < n; q++) {
    const u = (q + 0.5) / n, h = hash2(key, q, 77), len = 5 + 8 * h * h, lean = (hash2(key, q, 78) - 0.5) * 1.3, x = lerp(ax, bx, u), y = lerp(ay, by, u);
    const ox = nx + tx * lean, oy = ny + ty * lean, b = 2.1;
    P.moveTo(x - tx * b + nx * 2, y - ty * b + ny * 2); P.lineTo(x + ox * (len + 2), y + oy * (len + 2)); P.lineTo(x + tx * b + nx * 2, y + ty * b + ny * 2); P.closePath();
  }
}
function drawBriars(sec, cam, rimP, idols) {
  const V = slope(sec), P = new Path2D(), i0 = Math.max(V.lo, Math.floor(cam.x / CELL) - 1), i1 = Math.min(V.hi, Math.floor((cam.x + W) / CELL) + 1);
  const Y = (r) => -(sec.h0 + r) * CELL - cam.y;          // the top edge of row r
  let any = false;
  for (let i = i0; i <= i1; i++) {
    const x0 = i * CELL - cam.x, x1 = x0 + CELL, F = V.fl[i], top = Y(F - 1), k = sec.k * 1000 + i;
    if (V.tf[i] && top > -20 && top < H + 20) { briarStrip(P, x0, top, x1, top, 0, -1, k); any = true; }
    if (V.pl[i]) {
      const pt = Y(F + V.pl[i] - 1); if (pt > H + 20 || top < -20) continue;
      briarStrip(P, x0, pt, x1, pt, 0, -1, k + 7); any = true;
      if (!V.pl[i - 1]) briarStrip(P, x0, top, x0, pt, -1, 0, k + 3);
      if (!V.pl[i + 1]) briarStrip(P, x1, pt, x1, top, 1, 0, k + 5);
    }
    if (V.tr[i]) {
      const bot = Y(V.cl[i] - 1); if (bot < -20 || bot > H + 20) continue;
      briarStrip(P, x1, bot, x0, bot, 0, 1, k + 11); any = true;
      if (!V.tr[i - 1]) briarStrip(P, x0, bot, x0, Y(V.cl[i - 1] - 1), -1, 0, k + 13);
      if (!V.tr[i + 1]) briarStrip(P, x1, Y(V.cl[i + 1] - 1), x1, bot, 1, 0, k + 17);
    }
  }
  if (!any) return;
  ctx.fillStyle = C.ink; ctx.fill(P); rimP.addPath(P); idols.push({ path: P, dom: "lust" });
}
// A chain from its beam: links of iron, down to its end (or, if he hangs from it, to the hook).
function drawChain(c, cam, rimP) {
  const held = S.rope && S.rope.chain === c, len = held ? S.rope.along : c.len, a = c.ang || 0;
  const x0 = c.x - cam.x, y0 = c.y - cam.y, x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
  if (Math.max(x0, x1) < -30 || Math.min(x0, x1) > W + 30 || y1 < -30 || y0 > H + 30) return;
  const P = new Path2D(); P.rect(x0 - 10, y0 - 7, 20, 6);                 // the beam
  const n = Math.max(2, Math.round(len / 5)), ux = (x1 - x0) / n, uy = (y1 - y0) / n;
  for (let q = 0; q < n; q++) { const cx = x0 + ux * (q + 0.5), cy = y0 + uy * (q + 0.5); P.moveTo(cx + (q % 2 ? 1.2 : 2.4), cy); P.ellipse(cx, cy, q % 2 ? 1.2 : 2.4, 3.2, a, 0, TAU); }
  ctx.strokeStyle = "#16161a"; ctx.lineWidth = 1.5; ctx.stroke(P); ctx.fillStyle = "#16161a"; ctx.fillRect(x0 - 10, y0 - 7, 20, 6); rimP.addPath(P);
  if (!held) { const g = new Path2D(); g.arc(x1, y1 + 2, 3, 0, TAU); ctx.fillStyle = "#16161a"; ctx.fill(g); rimP.addPath(g); }
}
// A coin: a little disc of gold, turning as it flies (sx: how much of its face shows).
function drawCoin(x, y, sx, lit, a, r) {
  r = r || 4; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.6, Math.abs(sx) * r), r, 0, 0, TAU);
  ctx.fillStyle = lit ? SINS.avarice.color : "#2a2410"; ctx.fill();
  if (lit) { ctx.strokeStyle = SINS.avarice.dark; ctx.lineWidth = 0.8; ctx.stroke(); circle(x - sx * r * 0.3, y - r * 0.3, r * 0.3, "rgba(255,248,200,0.8)"); }
  ctx.globalAlpha = 1;
}
// A box for alms: a small chest of wood bound with iron, a slot in its lid and a cross on its face;
// on a bracket from the rock, or standing on the floor.
function drawAlms(b, cam, rimP) {
  const x = b.x - cam.x, y = b.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
  const P = new Path2D();
  if (b.hang) { P.rect(x - 1, y - 16, 2, 6); P.rect(x - 8, y - 11, 16, 2); }
  P.rect(x - 7, y - 10, 14, 10); P.rect(x - 8, y - 11.5, 16, 2.5);
  ctx.fillStyle = "#1c140c"; ctx.fill(P); rimP.addPath(P);
  const [lx, ly] = S.torch, lit = dist(lx, ly, b.x, b.y) < lightR() * 0.9;
  if (lit) { line(x - 2.5, y - 10.5, x + 2.5, y - 10.5, "#000", 1); line(x, y - 8, x, y - 2, "rgba(255,230,170,0.7)", 1.2); line(x - 2.5, y - 6, x + 2.5, y - 6, "rgba(255,230,170,0.7)", 1.2); }
}
// A thorn: a long dark spike, pointing the way it flies.
function drawThorn(x, y, a, lit) {
  const c = Math.cos(a), sn = Math.sin(a), q = (u, v) => [x + c * u - sn * v, y + sn * u + c * v];
  poly([...q(8, 0), ...q(-5, 2), ...q(-8, 0.6), ...q(-8, -0.6), ...q(-5, -2)], lit ? "#2a0d1c" : "#0d0709");
  if (lit) { const [ax, ay] = q(7, 0), [bx, by] = q(-5, 1.4); line(ax, ay, bx, by, hexA(SINS.lust.color, 0.7), 0.8); }
}
// Lust's ribbon, from its hand to him: a long veil rippling as it draws him in.
function drawRibbon(cam) {
  const P = S.pulled; if (!P || !P.f.p) return;
  const [x0, y0] = ribbonHand(P.f), [x1, y1] = middle(), n = 16;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x0 - cam.x, y0 - cam.y);
  for (let i = 1; i <= n; i++) { const u = i / n, w = Math.sin(u * PI) * 9 * Math.sin(S.rt * 9 + u * 8); ctx.lineTo(lerp(x0, x1, u) - cam.x, lerp(y0, y1, u) + w - Math.sin(u * PI) * 10 - cam.y); }
  ctx.strokeStyle = hexA(SINS.lust.dark, 0.85); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = hexA(SINS.lust.color, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  glow(x1 - cam.x, y1 - cam.y, 18, SINS.lust.color, 0.25);
}
// A lamp: an iron stand with a bowl, cold until he passes, and then burning for good.
function drawLamp(L, cam, lights, lit) {
  const x = L.x - cam.x, y = L.y - cam.y;
  if (x < -40 || x > W + 40 || y < -60 || y > H + 40) return;
  if (!lit) {
    ctx.strokeStyle = "#0a0a0c"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 21); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.stroke();
    poly([x - 5, y - 21, x + 5, y - 21, x + 3, y - 24.5, x - 3, y - 24.5], "#0a0a0c");
    if (L.lit) lights.push({ x, y: y - 26, r: 95, a: 0.8 });
    return;
  }
  if (!L.lit) return;
  const age = S.rt - (L.litT || 0), k = Math.min(1, age / 0.5);
  glow(x, y - 28, 46 * k, C.flame, 0.35); drawFlame(x, y - 24, 0.5 * k, S.rt + L.x * 0.01, {});
}
// A reliquary: a little gold house with a cross on it. Holy things are seen in the dark, a little.
function drawRelic(R, cam, lit) {
  const x = R.x - cam.x, y = R.y - cam.y;
  if (R.got || x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
  const b = 0.5 + 0.5 * Math.sin(S.rt * 2.4 + R.x);
  if (!lit) { poly([x - 6, y, x + 6, y, x + 6, y - 7, x, y - 11, x - 6, y - 7], "#0a0a0c"); return; }
  glow(x, y - 6, 26, C.gold, 0.18 + 0.12 * b);
  ctx.globalAlpha = 0.35 + 0.4 * b; line(x, y - 11, x, y - 17, C.gold, 1.2); line(x - 2.4, y - 15, x + 2.4, y - 15, C.gold, 1.2); ctx.globalAlpha = 1;
}
// Rock that will crumble: hairline cracks with a dull fire in them; each time it cracks under him,
// a third more of them blaze, and run deeper.
function crackLines(x0, x1, y0, s, stage) {
  const n = Math.max(3, Math.round((x1 - x0) / 18)), lit = Math.ceil(n * clamp(stage || 0, 0, 3) / 3);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass ? 0.95 : 0.22 + 0.08 * Math.sin(S.rt * 2 + s); ctx.strokeStyle = pass ? "#ffb070" : "#c8401c"; ctx.lineWidth = pass ? 1.3 : 0.9;
    ctx.beginPath();
    for (let q = 0; q < n; q++) {
      if (pass && q % n >= lit) continue;
      const cx = lerp(x0 + 6, x1 - 6, (q + 0.5) / n) + (hash2(s, q, 5) - 0.5) * 8, deep = pass ? 15 + 4 * (stage || 0) : 15;
      ctx.moveTo(cx, y0 + 0.5); ctx.lineTo(cx + (hash2(s, q, 6) - 0.5) * 6, y0 + deep * 0.33); ctx.lineTo(cx + (hash2(s, q, 7) - 0.5) * 9, y0 + deep * 0.66); ctx.lineTo(cx + (hash2(s, q, 8) - 0.5) * 6, y0 + deep);
    }
    ctx.stroke();
    if (!lit) break;
  }
  ctx.restore();
}
// A blob of fat: pale and glistening in the light, a black lump with a sickly glint in the dark;
// stretched along its flight, and quivering.
function drawFat(x, y, o, lit) {
  const r = o.r || 8, sp = Math.hypot(o.vx || 0, o.vy || 0), st = o.st === "fly" ? clamp(sp / 500, 0, 0.35) : 0, w = clamp(o.w || 0, -0.4, 0.4);
  const a = o.st === "fly" ? Math.atan2(o.vy, o.vx) : 0, rx = r * (1 + st + w * 0.5), ry = r * (1 - st * 0.6 - w * 0.4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = lit ? "#cdb47c" : C.ink; ctx.fill();
  if (lit) { ctx.beginPath(); ctx.ellipse(-rx * 0.15, ry * 0.25, rx * 0.8, ry * 0.55, 0, 0, TAU); ctx.fillStyle = "#a88a52"; ctx.fill(); ctx.beginPath(); ctx.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.35, ry * 0.22, -0.3, 0, TAU); ctx.fillStyle = "#fff4d0"; ctx.fill(); }
  ctx.restore();
  if (!lit) glow(x, y, r + 5, SINS.gluttony.color, 0.35);
}
// Slime: on slimy platforms and greased floors, a glistening skin and drips hanging off the edge;
// on the slimed cliff of a cavern, runs of it down the face.
function sheen(x0, x1, y, s, tl) {
  const pa = ctx.globalAlpha, ty = (x) => (tl || 0) * clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1), t = S.rt;
  // A thick skin of it on top, heaped in soft lumps that slowly heave.
  const n = Math.max(2, Math.round((x1 - x0) / 9)), top = [];
  for (let q = 0; q <= n; q++) { const x = lerp(x0 + 1, x1 - 1, q / n); top.push([x, y + ty(x) - (q === 0 || q === n ? 1.5 : 3.6 + 2.2 * hash2(s, q, 36) + 0.7 * Math.sin(t * 1.3 + q * 1.7 + s))]); }
  const crest = (dy) => { ctx.moveTo(top[0][0], top[0][1] + dy); for (let q = 1; q < top.length; q++) { const [px, py] = top[q - 1], [x, yy] = top[q]; ctx.quadraticCurveTo(px, py + dy, (px + x) / 2, (py + yy) / 2 + dy); } ctx.lineTo(top[n][0], top[n][1] + dy); };
  ctx.globalAlpha = pa * 0.96; ctx.beginPath(); crest(0); ctx.lineTo(x1 - 1, y + 2.5 + ty(x1)); ctx.lineTo(x0 + 1, y + 2.5 + ty(x0)); ctx.closePath(); ctx.fillStyle = "#9a8740"; ctx.fill();
  // its pale crest, wet, and spots on it catching the light
  ctx.globalAlpha = pa * 0.95; ctx.strokeStyle = "#f0e3a4"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); crest(0.7); ctx.stroke(); ctx.lineCap = "butt";
  for (let q = 0; q < Math.max(1, (x1 - x0) / 18); q++) { const k = 1 + Math.floor(hash2(s, q, 33) * (n - 1)), b = 0.5 + 0.5 * Math.sin(t * 2.3 + q * 2 + s); ctx.globalAlpha = pa * (0.45 + 0.55 * b); circle(top[k][0], top[k][1] + 1.6, 1.5, "#fffbe6"); }
  // and hanging off its edge, drips that swell and stretch, and fall
  for (let q = 0; q < Math.max(2, (x1 - x0) / 11); q++) {
    const dx = x0 + 4 + hash2(s, q, 31) * (x1 - x0 - 8), ph = (t * (0.3 + 0.3 * hash2(s, q, 34)) + hash2(s, q, 35)) % 1, l = 5 + hash2(s, q, 32) * 7 + ph * 8, w = 1.9 + ph * 1.1;
    ctx.globalAlpha = pa * 0.95 * (ph > 0.88 ? (1 - ph) / 0.12 : 1); ctx.beginPath(); ctx.ellipse(dx, y + 2 + l * 0.5 + ty(dx), w, l * 0.62, 0, 0, TAU); ctx.fillStyle = "#b29c55"; ctx.fill();
    ctx.globalAlpha *= 0.8; rect(dx - w * 0.45, y + 3 + ty(dx), 0.9, l * 0.7, "#efe2a6");
    if (ph > 0.88) { ctx.globalAlpha = pa * 0.9; circle(dx, y + 2 + l + (ph - 0.88) * 140 + ty(dx), 1.6, "#b29c55"); }
  }
  ctx.globalAlpha = pa;
}
// His prints in the fat: flat smears on the rock where he trod, glistening in the torchlight, fading.
function drawPrints(cam) {
  ctx.save();
  for (const q of S.prints) {
    const a = q.a * clamp(1 - (S.rt - q.t) / 9, 0, 1), x = q.x - cam.x, y = q.y - cam.y;
    if (a <= 0.02 || x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = "#cdb47c"; ctx.beginPath(); ctx.ellipse(x + q.dir * 1.5, y - 0.4, 3.4, 1.1, 0, 0, TAU); ctx.ellipse(x - q.dir * 2.6, y - 0.4, 1.7, 0.9, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.6; ctx.fillStyle = "#fff3cf"; ctx.beginPath(); ctx.ellipse(x + q.dir * 1, y - 0.9, 1.3, 0.35, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawSlime(cam, view) {
  for (let s = Math.floor(-(cam.y + H) / CELL / SLOT) - 1; s <= Math.floor(-cam.y / CELL / SLOT) + 1; s++) {
    const isl = s >= 0 && island(s); if (!isl || !isl.slick || isl.st === "gone") continue;
    sheen(isl.x0 * CELL - cam.x, (isl.x1 + 1) * CELL - cam.x, -isl.h1 * CELL - cam.y, s, isl.tilt);
  }
  for (const sec of view) if (sec.type === "cave") {
    const V = cave(sec);
    for (const p of V.plats) if (p.slick) sheen(p.x0 * CELL - cam.x, (p.x1 + 1) * CELL - cam.x, -(sec.h0 + p.r1) * CELL - cam.y, sec.k * 31 + p.x0, p.tilt);
    const fx = (V.dir > 0 ? V.face * CELL : (V.face + 1) * CELL) - cam.x;
    if (fx > -20 && fx < W + 20) {
      ctx.globalAlpha = 0.45; ctx.strokeStyle = "#cdb47c"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let r = 4; r < LH; r += 2) { const y = -(sec.h0 + r) * CELL - cam.y; if (y < -40 || y > H + 40) continue; const o = (hash2(sec.k, r, 41) - 0.3) * 3 * -V.dir; ctx.moveTo(fx + o, y); ctx.lineTo(fx + o + V.dir * -0.5, y + 22 + hash2(sec.k, r, 42) * 18); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  for (const g of S.grease) if (g.until > S.t) { const k = clamp((g.until - S.t) / 3, 0, 1); ctx.globalAlpha = k; sheen(g.i0 * CELL - cam.x, (g.i1 + 1) * CELL - cam.x, g.j * CELL - cam.y, g.i0 * 7 + g.j, 0); ctx.globalAlpha = 1; }
}
// Wrath's fire: a ball of it, roaring, its own light round it.
function drawFire(x, y, s, ph) {
  glow(x, y, 40 * s, SINS.wrath.color, 0.5); glow(x, y, 18 * s, C.flame, 0.75);
  drawFlame(x, y + 6 * s, 0.85 * s, S.rt * 1.4 + ph, { vx: 0 });
  circle(x, y, 3.2 * s, C.flameHot);
}
let DDT = 1 / 60;                            // the time since the last picture was drawn
function drawWorld() {
  const cam = S.cam, t = S.rt, F = S.flare, hM = metres(-S.y);
  DDT = S.dread || S.boonShow ? 0 : clamp(t - (S.lastDraw || t), 0, 0.05) || 1 / 60;
  const fdt = DDT * (F.on ? FLARE_SLOW : 1); S.lastDraw = t;
  tintStep(fdt);
  // The far mist set back, so the near rock stands out; and the domain's colour in it.
  const m = S.tint.m;
  drawBackdrop(600 + cam.x * 0.6, 300 + clamp(cam.y * 0.05, -70, 70), 1, t, { y0: 300, dim: "rgba(12,12,14,0.3)", tint: m[0] + m[1] + m[2] < 760 ? rgbs(m, 1) : null });
  drawNearWall(cam, t, (NOV && NOV.domain) || sectionAt(Math.max(1, Math.floor(-(cam.y + H / 2) / CELL))).dom);
  const dawn = clamp(metres(S.top) / 1500, 0, 1);
  if (dawn > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(200,190,170," + (0.22 * dawn) + ")"); g.addColorStop(1, "rgba(200,190,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // Over the summit, the open sky. (sky: how much of the screen it fills, for the dark below.)
  const su = summitSec(), skyB = su ? -su.h0 * CELL - cam.y : -1, sky = clamp(skyB / H, 0, 1);
  if (skyB > -40) drawSky(cam, skyB, t, false);
  const P = rockPath(cam), view = sectionsIn(-(cam.y + H) / CELL - 4, -cam.y / CELL + 4), lights = [];
  const hTop = -(cam.y) / CELL + 4, hBot = -(cam.y + H) / CELL - 4;
  const vis = []; for (let n = 0; ; n++) { const w = wallAt(n); if (w.h > hTop) break; if (w.h >= hBot) vis.push(w); }
  for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
  // The shrines, on the floor of the place; then the demons, their colour showing where the torch
  // can see them (or their own fire).
  const rimP = new Path2D(), idols = [], embers = []; carved.length = 0;
  const [lx0, ly0] = S.torch, R0 = lightR();
  for (const h of S.herbs) if (!h.got) drawHerb(h, cam);
  for (const f of S.demons) if (f.idol) drawShrine(f, cam, rimP, idols, lights);
  for (const f of S.demons) {
    if (f.idol || f.st === "legs") continue;
    const [cx, cy] = dMid(f); if (cx < cam.x - 80 || cx > cam.x + W + 80 || cy < cam.y - 100 || cy > cam.y + H + 100) continue;
    const kindled = f.sin === "wrath" && (f.st === "pickup" || f.st === "windup" || (f.st === "throw" && !f.thrown));
    f.lit += ((kindled || !!f.block || (dist(lx0, ly0, cx, cy) < R0 * 0.9 && los(lx0, ly0, cx, cy))) - f.lit) * 0.15;
    f.p = demonPose(f);
    const al = f.st === "dying" ? 1 - f.t / 0.8 : f.st === "emerge" ? Math.min(1, f.t / 0.5) : 1;
    f.dy = f.ground ? tiltDy(f.x, f.y) : 0;
    const sc = 1 + 0.1 * (f.size || 0), q = f.squash > 0 ? Math.sin(f.squash * PI) * 0.9 : 0, sx = Math.abs(Math.cos(f.squashA || 0)); ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y + f.dy);
    ctx.scale(sc * (1 + 0.24 * q * (1 - sx) - 0.16 * q * sx), sc * (1 + 0.24 * q * sx - 0.18 * q * (1 - sx)));
    if (f.sin === "gluttony" && !f.great) drawGlutton(f, al); else drawDemon(f.sin, 0, 0, f.dir, f.p, { t: S.rt, lit: Math.max(f.lit, f.brokenT > 0 ? 1 : 0), hurt: f.hurtT / 0.25, windup: f.st === "windup" || f.st === "heave" ? Math.min(1, f.t / 0.55) : 0, alpha: al, broken: f.brokenT > 0, belly: f.size || 0, carry: f.sin === "avarice" ? clamp(1 + (f.loot || 0) * 14, 0, 3) : 0 });
    ctx.restore();
    // Gluttony heaving up its fat: the blob swelling in its mouth.
    if ((f.st === "heave" || (f.st === "lob" && !f.thrown)) && !(f.sin === "gluttony" && !f.great)) { const [ox, oy] = mouth(f), k = f.st === "heave" ? clamp(f.t / 0.75, 0, 1) : 1; f.fatAt = [ox - cam.x, oy - cam.y - 2, { r: (3 + 5 * k) * (1 + 0.18 * f.size), w: 0.2 * Math.sin(S.rt * 18), st: "held" }]; } else f.fatAt = null;
    if (kindled) { const k = f.st === "pickup" ? f.t / 0.7 : 1, q = demonJoint(f.sin, f.x, f.y, f.dir, f.p, "hF"); f.fireAt = [q[0] - cam.x, q[1] - cam.y - 4, 0.3 + 0.7 * k]; lights.push({ x: q[0] - cam.x, y: q[1] - cam.y, r: 60 + 50 * k, a: 0.8 }); } else f.fireAt = null;
  }
  for (const g of S.bigs) drawGreat(g, cam);
  for (const o of S.things) {
    if (o.st === "held") continue;
    if (o.kind === "fire") { lights.push({ x: o.x - cam.x, y: o.y - cam.y, r: 95, a: 0.85 }); continue; }
    const lit = dist(lx0, ly0, o.x, o.y) < R0 * 0.85 && los(lx0, ly0, o.x, o.y);
    if (o.kind === "fat") { drawFat(o.x - cam.x, o.y - cam.y, o, lit); continue; }
    if (o.kind === "coin") { drawCoin(o.x - cam.x, o.y - cam.y, o.st === "rest" ? 1 : Math.cos(o.age * 14), lit, o.st === "rest" ? clamp(o.life - o.age, 0, 1) : 1); continue; }
    if (o.kind === "thorn") { drawThorn(o.x - cam.x, o.y - cam.y, o.st === "stuck" ? o.rot + 0.06 * Math.sin(o.age * 40) * Math.max(0, 1 - o.age * 2) : Math.atan2(o.vy, o.vx), lit); continue; }
    if (o.shard) drawShardOf(o.x - cam.x, o.y - cam.y + (o.st === "rest" ? tiltDy(o.x, o.y + BR) + 3 : 0), o.rot, lit, o.shard, o.sid);
    else drawBoulder(o.x - cam.x, o.y - cam.y + (o.st === "rest" ? tiltDy(o.x, o.y + BR) : 0), o.rot, lit ? 1 : 0);
  }
  // The blocks lying about, or carried off (and the lay brothers at the gates, with their carts).
  drawBlocks(cam, rimP, lights);
  // The monk: on the rope, hung from his hand.
  const p = monkPose(); let mx = S.x, my = S.y;
  if (S.rope && !S.ground && !S.cling && !S.act) {
    const Q = pivotOf(S.rope), [gx, gy] = grip(), th = Math.atan2(Q.x - gx, gy - Q.y);
    if (!S.wall) p.spin = clamp(th, -1.3, 1.3) * S.dir * 0.85;
    const hd = monkJoint(S.x, S.y, S.dir, p, "hF"); mx += gx - hd[0]; my += gy - hd[1];
  }
  if (S.ground && !S.act && !(S.atk && S.atk.t < S.atk.dash)) my += tiltDy(S.x, S.y);
  if (S.crawl && !S.boonShow) mx -= S.dir * 10;        // (on his knees, his body laid out over the length of him)
  S.lastPose = p; S.drawX = mx; S.drawY = my;
  if (S.angel) drawBeam(cam, lights);
  if (S.tied && S.tied.st !== "hand") drawTied(mx, my, p, cam, lights);
  if (S.ward && !S.boonShow) {
    // The ward: a light about him like a second habit, and a light in the dark round him. Near
    // its end it dims, and in its last moments it flickers. (Doubled: a second habit of light.)
    const b = (0.75 + 0.25 * Math.sin(S.rt * 4)) * wardFade(), k = scale * DPR, wx = mx - cam.x, wy = my - cam.y - HT / 2;
    glow(wx, wy, 64, C.warm, 0.22 * b);
    ctx.save(); ctx.shadowColor = "rgba(255,230,170," + b + ")"; ctx.shadowBlur = 20 * k;
    if ((S.ward.n || 1) > 1) for (const [ox, oy] of [[-4.5, 0], [4.5, 0], [0, -4.5], [0, 4.5]]) drawMonk(mx - cam.x + ox, my - cam.y + oy, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, tint: "rgba(255,222,140," + (0.45 * b) + ")" });
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) drawMonk(mx - cam.x + ox, my - cam.y + oy, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, tint: "rgba(255,246,222," + (0.9 * b) + ")" });
    ctx.restore();
    // (A light of its own about him, not the torch's: near as wide as a full torch's, to see his way
    // by; the torch burns as it burns, and the blessing does not keep it.)
    lights.push({ x: wx, y: wy, r: 200, a: 0.9 * wardFade() });
  }
  let r;
  if (S.boonShow) { r = drawMonkFront(mx - cam.x, my - cam.y, S.dir, S.boonShow.t); S.boonShow.up = r.up; }
  // Swallowed to the waist: turned to us, flailing his free arm.
  else if (S.legsIn) r = drawMonkFront(mx - cam.x, my - cam.y, S.dir, 0.35 * (0.5 + 0.5 * Math.sin(S.rt * 11)));
  else r = drawMonk(mx - cam.x, my - cam.y, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, alpha: (soupOn("unseen") ? 0.38 : 1) * (F.on ? 0.8 : 1) * (S.flashT > 0 && Math.floor(S.rt * 24) % 2 ? 0.35 : 1) });
  if (r && r.torch) S.torch = [r.torch[0] + cam.x, r.torch[1] + cam.y];
  // The gold clinging to his habit, coin by coin.
  if (S.coins > 0) {
    const hp = monkJoint(mx, my, S.dir, p, "hip"), nk = monkJoint(mx, my, S.dir, p, "neck");
    for (let q = 0; q < S.coins; q++) { const u = 0.15 + 0.75 * hash2(q, 3, 5), w = (hash2(q, 4, 5) - 0.5) * 9; drawCoin(lerp(hp[0], nk[0], u) + w - cam.x, lerp(hp[1], nk[1], u) + 6 * (1 - u) - cam.y, 0.8, true, 1, 2.6); }
  }
  // Greased: his feet glistening with the fat he trod in, and dripping.
  if (S.greaseT > 0 && !S.latched) {
    const k = clamp(S.greaseT / 2, 0, 1);
    ctx.save(); ctx.globalAlpha *= k;
    for (const nm of ["fB", "fF"]) {
      const q = monkJoint(mx, my, S.dir, p, nm), x = q[0] - cam.x + S.dir * 1.5, y = q[1] - cam.y - 0.6, dl = 1.5 + 2.5 * (0.5 + 0.5 * Math.sin(S.rt * 2.3 + (nm === "fF" ? 0 : 2)));
      ctx.fillStyle = "#cdb47c"; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.3, 0, 0, TAU); ctx.ellipse(x + S.dir * 0.5, y + 1.6 + dl / 2, 0.9, dl / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff3cf"; ctx.beginPath(); ctx.ellipse(x - S.dir * 1.2, y - 0.9, 1.4, 0.6, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  const hand = r && r.hand ? [r.hand[0] + cam.x, r.hand[1] + cam.y] : grip();
  S.handW = hand;
  if (S.tied && S.tied.st === "hand") drawHeld(S.tied, mx, my, p, hand, cam, lights);
  if (S.latched) drawLatch(S.latched, mx, my, cam);
  if (S.angel) drawAngel(cam, mx, my);
  if (S.legsIn && !S.boonShow) drawLegsSac(mx, my, p, cam);
  if (S.held) {
    S.held.x = hand[0]; S.held.y = hand[1] - (S.held.kind === "fire" || S.held.kind === "thorn" ? 6 : S.held.kind === "coin" ? 4 : S.held.kind === "fat" ? 7 : 9);
    if (S.held.kind === "fire") lights.push({ x: S.held.x - cam.x, y: S.held.y - cam.y, r: 80, a: 0.8 });
    else if (S.held.kind === "fat") { S.held.wv = (S.held.wv || 0) + (-90 * (S.held.w || 0) - 7 * S.held.wv) * fdt; S.held.w = (S.held.w || 0) + S.held.wv * fdt; drawFat(S.held.x - cam.x, S.held.y - cam.y, S.held, true); }
    else if (S.held.kind === "coin") drawCoin(S.held.x - cam.x, S.held.y - cam.y, Math.cos(S.rt * 3), true, 1);
    else if (S.held.kind === "thorn") drawThorn(S.held.x - cam.x, S.held.y - cam.y, -PI / 2 + S.dir * 0.4, true);
    else if (S.held.shard) drawShardOf(S.held.x - cam.x, S.held.y - cam.y, S.rt * 0.5, true, S.held.shard, S.held.sid);
    else drawBoulder(S.held.x - cam.x, S.held.y - cam.y, 0, 1);
  }
  if (S.rope && S.rope.chain) {
    // From a chain: the rope from his hand to the chain's end (where the hook is), and the chain from there to its beam.
    const [px, py] = chainTip({ x: S.rope.x, y: S.rope.y, len: S.rope.along, ang: S.rope.chain.ang });
    S.rope.hx = px; S.rope.hy = py;
    hangRope(S.ropeVis, hand[0], hand[1], px, py, Math.max(freeOf(S.rope) - S.rope.along, 10), fdt);
    drawRope(S.ropeVis, 1.6);
  } else if (S.rope) {
    const Q = pivotOf(S.rope), B = bendsOf(S.rope);
    hangRope(S.ropeVis, hand[0], hand[1], Q.x, Q.y, Math.max(freeOf(S.rope), 10), fdt);
    drawRope(S.ropeVis, 1.6);
    if (B.length) {
      ctx.beginPath(); ctx.moveTo(Q.x - cam.x, Q.y - cam.y);
      for (let k = B.length - 2; k >= 0; k--) ctx.lineTo(B[k].x - cam.x, B[k].y - cam.y);
      ctx.lineTo(S.rope.x - cam.x, S.rope.y - cam.y); ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
    }
  }
  if (S.shot) {
    const sh = S.shot, out = dist(hand[0], hand[1], sh.x, sh.y);
    hangRope(S.shotVis, hand[0], hand[1], sh.x, sh.y, Math.max(10, out * (sh.ph === "fly" ? 1.12 : 1.3)), fdt);
    drawRope(S.shotVis, 1.3);
  }
  if (S.yank) drawYank(cam);
  // The rock, in front of him: its crags overlap him where he stands or clings against it.
  ctx.fillStyle = C.ink; ctx.fill(P);
  // In the rock: the gates; the lamps; the tablets.
  for (const sec of view) {
    if (sec.type === "slope") drawBriars(sec, cam, rimP, idols);
    for (const b of almsOf(sec)) drawAlms(b, cam, rimP);
    if (sec.type === "trav" && MINE[sec.dom]) for (const c of trav(sec).chains || []) drawChain(c, cam, rimP);
    if (sec.type === "trav" && sec.gate) drawGate(sec, cam, rimP, embers);
    for (const L of lampsOf(sec)) drawLamp(L, cam, lights, false);
    for (const R of relicsOf(sec)) drawRelic(R, cam, false);
  }
  for (const w of vis) drawTablet(w, cam, true);
  drawSlime(cam, view);
  if (S.prints.length) drawPrints(cam);
  if (S.rope && S.ropeVis.length > 1) { const B = bendsOf(S.rope), q = B.length ? B[0] : S.ropeVis[S.ropeVis.length - 2], hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy; drawHook(hx - cam.x, hy - cam.y, Math.atan2(S.rope.y - q.y, S.rope.x - q.x)); }
  if (S.shot && S.shotVis.length > 1) { const sh = S.shot, q = S.shotVis[S.shotVis.length - 2]; drawHook(sh.x - cam.x, sh.y - cam.y, Math.atan2(sh.y - q.y, sh.x - q.x)); }
  for (const q of S.parts) if (q.kind === "chip") { const z = q.big ? 4 : 2; rect(q.x - cam.x - z / 2, q.y - cam.y - z / 2, z, z, "#0b0b0d"); }
  // The dark, and what the torch can see of the rock around it (and into the niches).
  HOLES.clear();
  let [lx, ly] = S.torch;
  if (solidAt(lx, ly)) [lx, ly] = middle();
  const R = lightR();
  S.light = new Path2D();
  const vp = visPoly(lx, ly, R);
  S.light.moveTo(vp[0] - cam.x, vp[1] - cam.y); for (let k = 2; k < vp.length; k += 2) S.light.lineTo(vp[k] - cam.x, vp[k + 1] - cam.y); S.light.closePath();
  const tx = S.torch[0] - cam.x, ty = S.torch[1] - cam.y;
  darkness(cam, lx - cam.x, ly - cam.y, R, lights, rgbs(S.tint.d, 1 - 0.27 * sky));      // (black where no light reaches; under the open sky, the moon's light)
  // (The sky's own lights are not darkened: over the dark, where no rock stands in front of them.)
  if (skyB > -40) {
    const yr = Math.min(H, skyB - SUM_G * CELL + 4), Q = new Path2D(); Q.rect(-10, -10, W + 20, H + 20); Q.addPath(P);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, yr); ctx.clip(); ctx.clip(Q, "evenodd"); drawSky(cam, skyB, t, true); ctx.restore();
  }
  ctx.save(); ctx.clip(S.light);
  glow(tx, ty, R * 0.9, C.flame, 0.1);
  const rim = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
  rim.addColorStop(0, "rgba(255,190,110,0.8)"); rim.addColorStop(0.5, "rgba(232,128,58,0.4)"); rim.addColorStop(1, "rgba(232,128,58,0)");
  ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke(P);
  ctx.lineWidth = 1; ctx.stroke(rimP);
  // In the mine, flecks of gold in the rock, catching the torch.
  for (const sec of view) if (MINE[sec.dom]) {
    const ia = Math.floor(cam.x / CELL), ib = Math.floor((cam.x + W) / CELL), ja = Math.floor(cam.y / CELL), jb = Math.floor((cam.y + H) / CELL);
    for (let j = Math.max(ja, -sec.h1); j <= Math.min(jb, -sec.h0); j++) for (let i = ia; i <= ib; i++) {
      if (hash2(i, j, 91) > 0.07 || !solid(i, j) || (solid(i - 1, j) && solid(i + 1, j) && solid(i, j - 1) && solid(i, j + 1))) continue;
      const x = (i + 0.2 + 0.6 * hash2(i, j, 92)) * CELL - cam.x, y = (j + 0.2 + 0.6 * hash2(i, j, 93)) * CELL - cam.y, k = 0.6 + 0.4 * Math.sin(t * 2 + i * 1.7 + j);
      if (dist(tx, ty, x, y) > R * 0.9) continue;
      ctx.globalAlpha = k * clamp(1 - dist(tx, ty, x, y) / (R * 0.9), 0, 1); rect(x - 1, y - 0.5, 2.5, 1.2, SINS.avarice.color); rect(x, y - 1.5, 0.8, 3, "#fff4b0"); ctx.globalAlpha = 1;
    }
  }
  // The idols show their colour in the light, as the demons do.
  for (const I of idols) {
    const c = SINS[I.dom] || SINS.wrath, gI = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.9), br = !I.idol;
    gI.addColorStop(0, hexA(c.color, br ? 0.8 : 0.55)); gI.addColorStop(0.6, hexA(c.dark, br ? 0.65 : 0.4)); gI.addColorStop(1, hexA(c.dark, br ? 0.15 : 0));
    ctx.fillStyle = gI; ctx.fill(I.path);
  }
  ctx.restore();
  for (const w of vis) drawTablet(w, cam, false);
  blockGlows(cam);
  if (S.bigs.length) greatGlows(cam);
  if (S.boon) boonGlows(cam);
  if (S.combo) drawCombo();
  if (S.crownShow) drawCrown();
  // What has a light of its own, or shows in the dark: the lamps, the reliquaries, the glow-worms
  // on a cavern's roof, the fire in Moloch's belly and in the cracks of Wrath's gates and rock.
  for (const sec of view) {
    for (const L of lampsOf(sec)) drawLamp(L, cam, lights, true);
    if (sec.type === "cave") {
      const V = cave(sec);
      for (const Rl of V.relics) drawRelic(Rl, cam, true);
      for (const wm of V.worms) {
        const x = wm.x - cam.x, y = wm.y - cam.y; if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
        const a = 0.28 + 0.22 * Math.sin(t * 1.3 + wm.ph); glow(x, y, 3.5, "#bfe8d8", a); rect(x - 0.5, y - 0.5, 1, 1, "rgba(220,255,240," + a + ")");
      }
    } else if (sec.crawl) for (const Rl of sec.crawl.relics) drawRelic(Rl, cam, true);
    if (sec.type === "trav" && sec.dom === "wrath") {
      // The pits of Wrath's crossings: embers far down in them.
      const T = trav(sec), yb = -(sec.h0 + 1) * CELL - cam.y;
      if (yb > -40 && yb < H + 60) for (let i = T.a; i <= T.b; i++) if (T.pit[i] && !T.pit[i - 1]) { let e = i; while (T.pit[e + 1]) e++; glowOval((i + e + 1) / 2 * CELL - cam.x, yb + 10, (e - i + 1) * CELL * 0.6, 18, SINS.wrath.color, 0.16 + 0.05 * Math.sin(t * 1.7 + i)); }
      for (const B of T.bridges) if (B.st !== "gone") crackLines(B.i0 * CELL - cam.x, (B.i1 + 1) * CELL - cam.x, -(sec.h0 + 7) * CELL - cam.y, sec.k * 13 + B.i0, B.stage);
    }
  }
  // Moloch's fires: in its belly, and in the pit before it.
  for (const f of S.demons) if (f.idol && f.sin === "wrath") {
    const K = IK * (f.big || 1), T0 = put(f.x - 33 * K, f.y, 1, cam), T = (u, v) => T0(u * K, v * K), [px, py] = [f.x + 21 * K - cam.x, f.y - 3 - cam.y];
    if (px < -40 || px > W + 40 || py < -60 || py > H + 40) continue;
    if (f.st === "idle") { const [ex, ey] = T(33.5, 9.5); glow(ex, ey, 7, SINS.wrath.color, 0.5 + 0.2 * Math.sin(t * 3 + f.id)); glow(ex, ey, 3, C.flame, 0.6); }
    glow(px, py, 16, SINS.wrath.color, 0.35 + 0.1 * Math.sin(t * 2.3 + f.id)); glow(px, py - 2, 6, C.flame, 0.5);
    if (Math.random() < 0.2) S.parts.push({ kind: "ember", x: f.x + 21 * K + (Math.random() - 0.5) * 8, y: f.y - 4, vx: (Math.random() - 0.5) * 16, vy: -20 - Math.random() * 30, life: 0.8, age: 0 });
  }
  for (const c of carved) {
    ctx.globalAlpha = c.k; ctx.fillStyle = "#2c2a28"; ctx.fill(c.path);
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60); g.addColorStop(0, "rgba(255,190,110,0.7)"); g.addColorStop(1, "rgba(232,128,58,0.15)");
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke(c.path); ctx.globalAlpha = 1;
  }
  for (const e of embers) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 2.3 + e[0][0] * 0.1); ctx.strokeStyle = "#c8401c"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(e[0][0], e[0][1]); for (let q = 1; q < e.length; q++) ctx.lineTo(e[q][0], e[q][1]); ctx.stroke(); ctx.restore(); }
  for (let s = Math.floor(-(cam.y + H) / CELL / SLOT) - 1; s <= Math.floor(-cam.y / CELL / SLOT) + 1; s++) {
    const isl = s >= 0 && island(s); if (!isl || !isl.crumble || isl.st === "gone") continue;
    crackLines(isl.x0 * CELL - cam.x, (isl.x1 + 1) * CELL - cam.x, -isl.h1 * CELL - cam.y, s, isl.stage);
  }
  for (const f of S.demons) {
    if (f.idol) { if (f.showHp > 0 && f.st === "idle") { const a = Math.min(1, f.showHp), y = f.y - f.ht - 10 - cam.y; for (let k = 0; k < f.maxHp; k++) circle(f.x - cam.x - (f.maxHp - 1) * 3.5 + k * 7, y, 2.2, k < Math.floor(f.hp + 1e-6) ? hexA(SINS[f.sin].color, a) : k < f.hp ? hexA(SINS[f.sin].color, a * 0.4) : "rgba(40,40,46," + a + ")"); } continue; }
    if (!f.p || f.st === "gone") continue;
    if (f.lit < 0.6 && f.st !== "dying") { const sc = 1 + 0.1 * (f.size || 0); ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y + (f.dy || 0)); ctx.scale(sc, sc); demonEyes(f.sin, 0, 0, f.dir, f.p, { t: S.rt, windup: f.st === "windup" || f.st === "inhale" || f.st === "heave" ? Math.min(1, f.t / 0.55) : 0, alpha: 1 - f.lit }); ctx.restore(); }
    if (f.fatAt) drawFat(f.fatAt[0], f.fatAt[1], f.fatAt[2], f.lit > 0.5);
    if (f.showHp > 0 && alive(f)) { const a = Math.min(1, f.showHp), y = f.y - f.ht - 10 - cam.y; for (let k = 0; k < f.maxHp; k++) circle(f.x - cam.x - (f.maxHp - 1) * 3.5 + k * 7, y, 2.2, k < Math.floor(f.hp + 1e-6) ? hexA(SINS[f.sin].color, a) : k < f.hp ? hexA(SINS[f.sin].color, a * 0.4) : "rgba(40,40,46," + a + ")"); }
    if (f.fireAt) drawFire(f.fireAt[0], f.fireAt[1], f.fireAt[2], f.id);
    if (f.loot && alive(f)) { const x = f.x - f.dir * 9 - cam.x, y = f.y - f.ht * 0.62 - cam.y; glow(x, y, 12 + f.loot * 60, C.flame, 0.35 + 0.1 * Math.sin(S.rt * 5)); }
  }
  // The fire: Wrath's, thrown; and in his hand, if he has caught it.
  for (const o of S.things) if (o.kind === "fire" && o.st === "fly") drawFire(o.x - cam.x, o.y - cam.y, o.by === "monk" ? 0.9 : 0.8 + 0.05 * Math.sin(o.age * 9), o.age * 3);
  if (S.held && S.held.kind === "fire") drawFire(S.held.x - cam.x, S.held.y - cam.y, 0.7, 0);
  // The signs of the cross: a cross of light that swells and fades; the ward, steady before him.
  for (const c of S.crosses) drawSign(c, cam);
  // The cross drawing itself under a held finger: the upright, then the beam.
  for (const t of S.touches.values()) {
    const g = t.g; if (!g || g.done || !g.still || g.o || !(g.f || g.self)) continue;
    const k = (S.rt - g.t0) / HOLD_SIGN; if (k < 0.12) continue;
    const [cx, cy] = g.f ? dMid(g.f) : middle(), x = cx - cam.x, y = cy - cam.y - 6, z = g.f ? 20 : 16, u = clamp((k - 0.12) / 0.88, 0, 1);
    ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = "rgba(255,214,140,0.9)"; ctx.shadowBlur = 8 * scale * DPR;
    const v = Math.min(1, u / 0.55), h = clamp((u - 0.55) / 0.45, 0, 1);
    line(x, y - z, x, y - z + z * 1.9 * v, "rgba(255,241,210,0.9)", 2.4);
    if (h > 0) { line(x, y - z * 0.32, x - z * 0.58 * h, y - z * 0.32, "rgba(255,241,210,0.9)", 2.4); line(x, y - z * 0.32, x + z * 0.58 * h, y - z * 0.32, "rgba(255,241,210,0.9)", 2.4); }
    ctx.restore();
  }
  if (S.ward) {
    // ...and over the dark: a ring of light turning slowly round him, a small cross on his breast,
    // and motes of light rising off him.
    const [cx, cy] = middle(), x = cx - cam.x, y = cy - cam.y, b = (0.75 + 0.25 * Math.sin(S.rt * 4)) * wardFade();
    glow(x, y, 56, C.warm, 0.22 * b); glow(x, y, 26, "#fff4dc", 0.2 * b);
    ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = "rgba(255,226,160,0.9)"; ctx.shadowBlur = 10 * scale * DPR; ctx.strokeStyle = "rgba(255,241,206," + (0.6 * b) + ")"; ctx.lineWidth = 1.8;
    for (let q = 0; q < 4; q++) { const a0 = S.rt * 1.3 + q * PI / 2; ctx.beginPath(); ctx.arc(x, y, 33, a0, a0 + 0.95); ctx.stroke(); }
    ctx.restore();
    lightCross(x + S.dir * 2, y - 3, 6, 0.55 * b, 1.6);
    if (Math.random() < 0.45) S.parts.push({ kind: "spark", c: C.warm, x: cx + (Math.random() - 0.5) * 40, y: cy + 18 - Math.random() * 34, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 30, life: 0.9, age: 0, real: true });
  }
  // What he has pointed at, ringed: warm if he can take it as it comes (standing, his hands free), grey if not.
  if (S.mark) {
    const o = S.mark;
    if (o.st !== "fly") S.mark = null;
    else { const ok = S.ground && !S.held && !S.cling && !S.hang, b = 0.6 + 0.4 * Math.sin(S.rt * 10); ctx.setLineDash([3, 3]); ring(o.x - cam.x, o.y - cam.y, (o.r || 10) + 7 + 2 * b, ok ? "rgba(255,241,196," + (0.55 + 0.4 * b) + ")" : "rgba(160,160,170,0.5)", 1.4); ctx.setLineDash([]); }
  }
  // A thrown stone keeps a faint glint of the sin that threw it, so its arc can be read in the dark.
  for (const o of S.things) if (o.st === "fly" && o.by === "demon" && o.kind !== "fire") glow(o.x - cam.x, o.y - cam.y, 9, o.kind === "thorn" ? SINS.lust.color : SINS.wrath.color, 0.45);
  drawRibbon(cam);
  for (const o of S.things) if (o.kind === "coin" && o.st === "fly") glow(o.x - cam.x, o.y - cam.y, 7, SINS.avarice.color, 0.5);
  for (const sec of view) {
    for (const b of almsOf(sec)) { const x = b.x - cam.x, y = b.y - cam.y - 5; if (x > -20 && x < W + 20 && y > -20 && y < H + 20) glow(x, y, 10, C.warm, S.coins > 0 ? 0.3 + 0.15 * Math.sin(t * 4) : 0.12); }
    const E = sec.type === "shaft" && eyeOf(sec);
    if (E && eyeShut()) {
      const x0 = E.i0 * CELL - cam.x, x1 = (E.i1 + 1) * CELL - cam.x, y0 = -E.h1 * CELL - cam.y, y1 = (1 - E.h0) * CELL - cam.y;
      if (y1 > -10 && y0 < H + 10) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3); rect(x0, y0, x1 - x0, y1 - y0, SINS.avarice.dark); for (let q = 1; q < 4; q++) line(x0 + (x1 - x0) * q / 4, y0, x0 + (x1 - x0) * q / 4, y1, SINS.avarice.color, 1); ctx.globalAlpha = 1; }
    }
  }

  // (Held up out of a great demon's mouth, the torch gutters as its light goes.)
  if (S.dark && !S.dying) { glow(tx, ty, 8, C.ember, 0.5 + 0.2 * Math.sin(t * 3)); rect(tx - 1, ty - 1, 2, 2, C.ember); }   // (out: only an ember left on it)
  else if (!S.dying || S.dying < 1.2) drawFlame(tx, ty, S.latched ? 0.45 + 0.5 * S.fuel : F.on ? 1.3 : boonOn("unconsumed") ? 1.25 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : S.latched ? clamp(1.1 - S.fuel, 0.35, 1) : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
  for (const q of S.parts) {
    const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
    if (q.kind === "ember") drawEmber(x, y, 1, a);
    else if (q.kind === "glob") { ctx.globalAlpha = a; circle(x, y, q.r, dist(S.torch[0], S.torch[1], q.x, q.y) < lightR() * 0.85 ? "#cdb47c" : "#1a1610"); ctx.globalAlpha = 1; }
    else if (q.kind === "spark") { glow(x, y, 6, q.c || C.gold, a * 0.8); circle(x, y, 1, q.c ? mix(q.c, "#ffffff", 0.5) : C.flameHot); }
    else if (q.kind === "wave") { const w = q.age / q.life; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 0, 18 + 150 * w, 0, TAU); ctx.restore(); ctx.strokeStyle = "rgba(255,226,170," + (0.85 * (1 - w)).toFixed(3) + ")"; ctx.lineWidth = 1 + 3 * (1 - w); ctx.stroke(); }
    else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
    else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
    else if (q.kind === "impact") {
      // A blow landing: a white flash, a ring going out, and rays thrown the way of the blow.
      const k = q.age / q.life, z = 9 + 9 * q.s;
      if (k < 0.3) { glow(x, y, z * 2.2, "#fff6e0", 0.9 * (1 - k / 0.3)); circle(x, y, z * 0.55 * (1 - k), "#ffffff"); }
      ring(x, y, z * (0.6 + 1.6 * k), hexA(q.c, 0.8 * (1 - k)), 2.2 * (1 - k) + 0.6);
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) { const an = q.a + (i - 3) * 0.42, r0 = z * (0.5 + k), r1 = r0 + z * (1.1 - 0.4 * Math.abs(i - 3) / 3) * (1 - k * 0.6); ctx.globalAlpha = 1 - k; line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, i === 3 ? "#ffffff" : q.c, i === 3 ? 2.4 : 1.5); }
      ctx.globalAlpha = 1; ctx.lineCap = "butt";
    }
    else if (q.kind === "coinfly") { if (!q.done) { if (q.light) { glow(x, y, 7, C.flame, 0.6); circle(x, y, 1.4, C.flameHot); } else { drawCoin(x, y, Math.cos(q.age * 20), true, 1, 3.4); glow(x, y, 6, SINS.avarice.color, 0.5); } } }
    else if (q.kind === "draft" && q.px !== undefined) { ctx.globalAlpha = 0.55 * a; line(q.px - cam.x, q.py - cam.y, x, y, "#e8d4b0", 1.2); ctx.globalAlpha = 1; }
  }
  if (F.on) {
    ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
    const [cx, cy] = middle();
    if (F.on) { ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.25)", 1.2); ctx.setLineDash([]); }
  }
  if (S.whiteT > 0) rect(0, 0, W, H, "rgba(255,246,226," + (S.whiteT * 1.4) + ")");
  hud(hM);
  if (S.dread) drawDread(cam);
  if (S.boonShow) drawBoonShow(cam);
  if (S.angel) drawAngelOver();
}
// His block, lost (knocked loose, or stolen) and out of sight: a mark at the edge of the view the
// way it lies, with its shape and how far it is (as the trackers of the great open-world games).
// Gone to a cart, or tied on again, and the mark is gone.
function lostMarker() {
  const b = S.lost;
  if (!b || S.tied === b || b.st === "bin" || b.st === "tobin" || !S.blocks.includes(b)) { S.lost = null; return; }
  const bx = b.x - S.cam.x, by = b.y - b.ht / 2 - S.cam.y;
  if (bx > -6 && bx < W + 6 && by > -6 && by < H + 6) return;
  const cx = W / 2, cy = H / 2, dx = bx - cx, dy = by - cy, x0 = 30, x1 = W - 30, y0 = 62, y1 = H - 34;
  const t = Math.min(dx > 0 ? (x1 - cx) / dx : dx < 0 ? (x0 - cx) / dx : 1e9, dy > 0 ? (y1 - cy) / dy : dy < 0 ? (y0 - cy) / dy : 1e9);
  const x = cx + dx * t, y = cy + dy * t, a = Math.atan2(dy, dx), c = SINS[b.dom] || SINS.wrath, pulse = 0.8 + 0.2 * Math.sin(S.rt * 4);
  glow(x, y, 22, c.color, 0.25 * pulse);
  circle(x, y, 14, "rgba(6,6,8,0.82)"); ring(x, y, 14, "rgba(232,196,106," + (0.7 * pulse) + ")", 1.2);
  const tip = [x + Math.cos(a) * 20, y + Math.sin(a) * 20], l = [x + Math.cos(a + 0.42) * 14.5, y + Math.sin(a + 0.42) * 14.5], r = [x + Math.cos(a - 0.42) * 14.5, y + Math.sin(a - 0.42) * 14.5];
  poly([tip[0], tip[1], l[0], l[1], r[0], r[1]], "rgba(232,196,106," + (0.85 * pulse) + ")");
  const z = 3.2, w = (b.w || 3) * z, h = (b.h || 2) * z;
  for (const [i, j] of b.cells) rect(x - w / 2 + i * z, y - h / 2 + j * z, z - 0.5, z - 0.5, c.color);
  text(metres(dist(S.x, S.y, b.x, b.y)) + " m", x, y + 25, { align: "center", size: 7, weight: 800, color: "rgba(233,230,223,0.85)", glow: "rgba(0,0,0,0.9)", blur: 4 });
}
// The thumb's cross: where it is, and which ways a thumb on it is pressing. (Left and right have
// the wider share of it, so that rocking a swing does not climb by mistake.)
const dpad = () => ({ x: 70, y: H - 72, r: 52 });
function dpadDir(t) {
  const b = dpad(), dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy);
  if (d < 9) return [0, 0];
  return [Math.abs(dx) / d > 0.38 ? sign(dx) : 0, Math.abs(dy) / d > 0.55 ? sign(dy) : 0];
}
const actBtn = () => ({ x: W - 58, y: H - 64, r: 32 });
const flareBtn = () => ({ x: W - 58, y: H - 150, r: 27 });
// Which way to push to climb, when the wrong way would drop him: hanging from a ledge, toward
// it; on the rock with bare hands, toward the rock.
const climbWay = () => (S.hang ? S.hang.L.s : S.cling && !slickWall(S.cling) ? S.cling : 0);
function sideArrow(x, y, s) {
  const b = 0.7 + 0.3 * Math.sin(S.rt * 5), o = s * 3 * Math.sin(S.rt * 5);
  glow(x, y, 18, C.flame, 0.25 * b);
  const arrow = (c, w) => { line(x - s * 10 + o, y, x + s * 8 + o, y, c, w); line(x + s * 8 + o, y, x + s * 1 + o, y - 7, c, w); line(x + s * 8 + o, y, x + s * 1 + o, y + 7, c, w); };
  ctx.lineCap = "round"; ctx.globalAlpha = 0.6 * b; arrow("#000", 5.5); ctx.globalAlpha = b; arrow(C.flameHot, 2.6); ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
function hud(hM) {
  const F = S.flare, I = pads(), way = climbWay();
  text(hM + " m", 16, 30, { font: FONT.title, size: 20, weight: 700, color: "#fff", glow: "rgba(255,179,71,0.5)", blur: 10 });
  for (let i = 0; i < HEARTS; i++) drawHeart(20 + i * 15, 62, i < (S.hearts === undefined ? HEARTS : S.hearts));
  drawSoups();
  text(NOV ? "THE MOUNTAIN OF " + SINS[NOV.domain].name.toUpperCase() : "BEST " + Math.max(save.climbBest || 0, metres(S.top)) + " m", 16, 46, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)", max: 190 });
  // (What he carries, counted: under the hearts and the flasks.)
  ctx.save(); ctx.translate(0, 42);
  if (S.coins > 0) { const y = S.relics ? 76 : 62; drawCoin(22, y - 3, 1, true, 1, 4.2); text("× " + S.coins + (S.coins >= 6 ? "  HEAVY" : ""), 30, y, { size: 8, weight: 700, color: S.coins >= 6 ? "#ffb070" : "rgba(232,196,106,0.85)" }); }
  if (S.relics) { glow(22, 60, 8, C.gold, 0.4); rect(18, 58, 8, 5, C.gold); poly([18, 58, 26, 58, 22, 55], C.gold); text("× " + S.relics, 30, 63, { size: 8, weight: 700, color: "rgba(232,196,106,0.85)" }); }
  if (S.binned) { const y = 62 + (S.relics ? 14 : 0) + (S.coins > 0 ? 14 : 0), c = SINS[NOV ? NOV.domain : "wrath"]; glow(22, y - 3, 8, c.color, 0.35); for (const [i, j] of SHAPES.T) rect(16 + i * 4, y - 6 + j * 4, 3.4, 3.4, c.color); text("× " + S.binned + " IN THE CARTS", 30, y, { size: 8, weight: 700, color: "rgba(233,230,223,0.7)" }); }
  if (S.freedList && S.freedList.length) { const y = 62 + (S.relics ? 14 : 0) + (S.coins > 0 ? 14 : 0) + (S.binned ? 14 : 0); circle(22, y - 6, 2.2, "#cfc6b4"); poly([18.5, y, 25.5, y, 24, y - 4.5, 20, y - 4.5], "#cfc6b4"); text("× " + S.freedList.length + " FREED", 30, y, { size: 8, weight: 700, color: "rgba(233,230,223,0.7)" }); }
  ctx.restore();
  if (S.say) {
    const a = clamp(S.say.t / 0.3, 0, 1) * clamp((3 - S.say.t) / 0.6, 0, 1);
    text(S.say.text, W / 2, 92, { align: "center", font: FONT.title, size: 16, weight: 700, spacing: 4, color: C.gold, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 8 });
    text(S.say.sub, W / 2, 108, { align: "center", size: 8.5, weight: 600, color: "#e9e6df", alpha: a * 0.85, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 40 });
    if (S.tipHold && S.say.tip) goOnLine(126, a);
  }
  if (S.boon) {
    const B = S.boon, left = clamp(1 - B.t / B.T, 0, 1), x = W / 2, y = 44, blink = B.T - B.t < 3 && Math.floor(S.rt * 6) % 2;
    ctx.globalAlpha = blink ? 0.4 : 1;
    drawToken(B.kind, x, y, 7, 1);
    ctx.beginPath(); ctx.arc(x, y, 10.5, -PI / 2, -PI / 2 + TAU * left); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.stroke();
    text(BOONS[B.kind].name, x, y + 22, { align: "center", size: 7, weight: 800, spacing: 2, color: C.gold, glow: "rgba(0,0,0,0.9)", blur: 4 });
    ctx.globalAlpha = 1;
  }
  if (S.kept && S.rt - S.kept.t < 2.6 && !F.on) text("THE PLACE IS KEPT", W / 2, 24, { align: "center", size: 8, weight: 800, spacing: 3, color: C.warm, alpha: clamp((2.6 - (S.rt - S.kept.t)) / 0.6, 0, 1) * clamp((S.rt - S.kept.t) / 0.2, 0, 1) * 0.85 });
  if (S.lost) lostMarker();
  pauseButton();
  if (!usingKeys()) {
    // The cross under the left thumb: faint, its arms lit as they are pressed; the arm that
    // climbs, when the other would let him fall, glowing.
    const b = dpad(), held = [...S.touches.values()].find((t) => t.dpad);
    circle(b.x, b.y, b.r, held ? "rgba(8,8,10,0.32)" : "rgba(8,8,10,0.22)");
    ring(b.x, b.y, b.r, "rgba(255,179,71,0.22)", 1.2);
    for (const [ax, ay, on] of [[-1, 0, I.l], [1, 0, I.r], [0, -1, I.u && !I.both], [0, 1, I.dn]]) {
      const cx = b.x + ax * b.r * 0.62, cy = b.y + ay * b.r * 0.62, px = -ay, py = ax;
      if (ax && ax === way && !on) { const k = 0.5 + 0.5 * Math.sin(S.rt * 5); glow(cx, cy, 24, C.flame, 0.35 * k); ring(cx, cy, 15 + 2 * k, "rgba(255,210,140," + (0.5 + 0.4 * k) + ")", 2); }
      if (on) glow(cx, cy, 20, C.flame, 0.3);
      poly([cx + ax * 9, cy + ay * 9, cx - ax * 5 + px * 9, cy - ay * 5 + py * 9, cx - ax * 5 - px * 9, cy - ay * 5 - py * 9], on ? "#fff3dc" : "rgba(233,230,223,0.42)");
    }
    if (held) circle(clamp(held.x, b.x - b.r, b.x + b.r), clamp(held.y, b.y - b.r, b.y + b.r), 7, "rgba(255,241,206,0.18)");
    if (S.climbing) text("CLIMBING", W / 2, H - 12, { align: "center", size: 8, weight: 800, spacing: 3, color: "rgba(255,241,196,0.7)" });
  }
  // The flare's button, its ring the meter; and the other button, saying what it will do now.
  const fb = usingKeys() ? { x: W - 40, y: 66, r: 16 } : flareBtn(), ready = S.meter >= 0.12;
  circle(fb.x, fb.y, fb.r, F.on ? "rgba(255,241,196,0.25)" : "rgba(8,8,10,0.45)");
  ring(fb.x, fb.y, fb.r, "rgba(233,230,223,0.15)", 1.2);
  ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r + 3, -PI / 2, -PI / 2 + TAU * S.meter); ctx.strokeStyle = F.on ? C.flameHot : ready ? C.flame : "rgba(255,179,71,0.35)"; ctx.lineWidth = 3; ctx.stroke();
  if (S.meterFlash > 0 && Math.floor(S.rt * 10) % 2) ring(fb.x, fb.y, fb.r + 6, "rgba(220,80,60,0.9)", 2);
  text(usingKeys() ? "SHIFT" : "FLARE", fb.x, fb.y + 3, { align: "center", size: usingKeys() ? 6.5 : 7.5, weight: 800, spacing: 1, color: ready || F.on ? "#fff3dc" : "#77736c" });
  if (!usingKeys()) {
    const f = actBtn(), lab = S.latched ? "STRIKE" : S.rope || S.hang ? "LET GO" : S.cling ? "LEAP" : S.held || (S.tied && S.tied.st === "hand") ? "DROP" : !S.tied && S.ground && cartAt(S.x, S.y, true) ? "TAKE" : "";
    const on = [...S.touches.values()].some((t) => t.act);
    circle(f.x, f.y, f.r, on ? "rgba(255,179,71,0.22)" : "rgba(8,8,10,0.45)");
    ring(f.x, f.y, f.r, lab ? "rgba(255,179,71,0.55)" : "rgba(233,230,223,0.15)", 1.2);
    text(lab || "·", f.x, f.y + 3, { align: "center", size: 7.5, weight: 800, spacing: 1, color: lab ? "#fff3dc" : "#77736c" });
  }
  if (F.on) text("THE FLARE · TAP A DEMON, A BOULDER, OR ANYWHERE", W / 2, 24, { align: "center", size: 9, weight: 800, spacing: 2, color: C.flameHot, max: W - 140 });
  if (S.tipHold === "fightSeen") goOnLine(S.say ? 178 : 156, 1);
  if (S.fightSeen && S.fightHintT < 12 && !F.on && !S.verseHold) {
    const a = clamp(S.fightHintT / 0.5, 0, 1) * clamp((12 - S.fightHintT) / 1.5, 0, 1);
    const L = [usingKeys() ? "A demon. Click it: strike.  Hold \u25b2 / \u25bc / \u25c0\u25b6 as you click: uppercut, slam, hurl.  Swing into it: a kick." : "A demon. Tap it: strike.  Swipe up: uppercut.  Down: slam.  Across: hurl.  Swing into it: a kick.", "Tap what is thrown at you: standing, you catch it as it comes. Tap again: fling it.  Swing into it: kick it back.  " + (usingKeys() ? "Hold on a demon (or yourself): the sign of the cross." : "Hold on a demon: the sign of the cross.  Two fingers at once: bless yourself.")];
    let y = S.say ? 134 : 112; for (const l of L) y += 12 * textLines(l, W / 2, y, W - 120, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, lh: 12 }) + 3;
  }
  if (S.verse && S.verseHold) {
    // Stopped to read it: the verse large over the dimmed climb, its letter over it.
    const v = S.verse, a = clamp(v.t / 0.4, 0, 1);
    rect(0, 0, W, H, "rgba(4,4,6," + (0.6 * a) + ")");
    const ls = wrap(v.v[3], Math.min(W - 110, 540), "italic 500 18px " + FONT.line), lh = 23, y0 = H / 2 - (ls.length * lh) / 2 - 6;
    text(v.v[0], W / 2, y0 - 22, { align: "center", font: FONT.title, size: 28, weight: 700, color: C.gold, alpha: a, glow: "rgba(255,179,71,0.6)", blur: 14 });
    ls.forEach((l, i) => text(l, W / 2, y0 + 16 + i * lh, { align: "center", font: FONT.line, italic: true, size: 18, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 40 }));
    text(v.v[1] + " · " + (v.ps || "PSALM 118") + ":" + v.v[2], W / 2, y0 + 16 + ls.length * lh + 4, { align: "center", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.75)", alpha: a });
    if (v.book) text((v.book === 8 ? "THE BOOK OF " + v.v[1] + " IS WHOLE" : "KEPT IN THE MONASTERY'S LIBRARY: THE BOOK OF " + v.v[1] + ", " + v.book + " OF 8"), W / 2, y0 + 16 + ls.length * lh + 20, { align: "center", size: 7.5, weight: 700, spacing: 1.5, color: v.book === 8 ? C.gold : "rgba(255,226,170,0.6)", alpha: a, max: W - 40 });
    text(usingKeys() ? "CLICK, OR PRESS A KEY, TO GO ON" : "TAP ANYWHERE TO GO ON", W / 2, H - 22, { align: "center", size: 8.5, weight: 800, spacing: 3, color: "rgba(255,241,196," + (0.5 + 0.35 * Math.sin(performance.now() / 380)).toFixed(3) + ")", alpha: a });
  } else if (S.verse) {
    const v = S.verse, a = clamp(v.t / 0.5, 0, 1) * clamp((7 - v.t) / 1, 0, 1), y = 64;
    const ls = wrap(v.v[3], Math.min(W - 220, 460), "italic 500 14px " + FONT.line);
    ls.forEach((l, i) => text(l, W / 2, y + i * 17, { align: "center", font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }));
    text(v.v[0] + "  " + v.v[1] + " · " + (v.ps || "PSALM 118") + ":" + v.v[2], W / 2, y + ls.length * 17 + 4, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.7)", alpha: a });
  }
  if ((S.hintT < 16 || S.hooked < 2) && !(S.fightSeen && S.fightHintT < 12) && !S.verseHold) {
    const a = clamp(S.hintT / 0.6, 0, 1) * (S.hooked >= 2 ? clamp((16 - S.hintT) / 1.5, 0, 1) : 1);
    const L = usingKeys()
      ? ["Click the rock: he throws the hook there. Swinging, click to one side: he flips, then hooks up that way.", "← → rock the swing to build it. Hold toward a wall: he climbs it.  W: climb the rope.  Space: let go.", "Shift: the flare (the ring is what is left). Then click anywhere near: appear there."]
      : ["Tap the rock above him: he throws the hook there. Swinging, tap to one side: he flips, then hooks up that way.", "◀ ▶ rock the swing to build it.  ▲ climb the rope, ▼ let it out.  Toward a wall: he climbs it.", "FLARE: time slows (the ring is what is left). Tap anywhere near: appear there."];
    // From the foot of the screen up, each over as many lines as it needs (on touch, between the cross and the buttons).
    let y = H - 14; for (const l of L.slice().reverse()) y -= 12 * textLines(l, W / 2 + (usingKeys() ? 0 : 14), y, usingKeys() ? W - 100 : W - 250, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, lh: 12, up: true }) + 3;
  }
  // Hanging from a ledge, or on the rock with bare hands: an arrow showing which way to push
  // to climb. (The other way, he lets go.)
  if (S.hang) {
    const L = S.hang.L;
    sideArrow(L.edge + L.s * 10 - S.cam.x, L.top - 14 - S.cam.y, L.s);
    if (S.hangs <= 4) {
      const [go, off] = usingKeys() ? (L.s > 0 ? ["→", "←"] : ["←", "→"]) : (L.s > 0 ? ["▶", "◀"] : ["◀", "▶"]);
      text(go + "  CLIMB UP        " + off + "  LET GO", W / 2, H - 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.warm, alpha: 0.85 });
    }
  } else if (way && I.d !== way) sideArrow(S.x - way * 6 - S.cam.x, S.y - HT - 30 - S.cam.y, way);
  if (S.pulled && S.pulls <= 3) text(usingKeys() ? "ITS RIBBON DRAWS HIM IN: CLICK IT TO STRIKE, OR SWING INTO IT" : "ITS RIBBON DRAWS HIM IN: TAP IT TO STRIKE, OR SWING INTO IT", W / 2, H - 40, { align: "center", size: 8, weight: 800, spacing: 2, color: SINS.lust.light, alpha: 0.9, max: W - 260 });
  if (S.fuel < 0.25 && !S.dying) text(S.dark ? "IN THE DARK: FIND A CANDLE BY A VERSE, OR A LAY BROTHER" : "THE TORCH IS GUTTERING: FIND A VERSE", W / 2, H - 24, { align: "center", size: 8, weight: 800, spacing: 2, color: C.ember, alpha: 0.6 + 0.4 * Math.sin(S.rt * 6) });
}

// ---- The map ---------------------------------------------------------------------------------------
// What he has seen of the mountain, kept as he goes in squares of MAP_T cells (all about him, as far
// as the torch reaches); and on the pause, the whole mountain drawn small, dark but for those squares.
const MAP_T = 8, MAP_P = 4;                      // cells to a square seen; cells to a pixel of the map
function markSeen() {
  if (!S.seen) S.seen = new Set();
  const [mx, my] = middle(), r = Math.ceil(lightR() / CELL / MAP_T), ti = Math.floor(mx / CELL / MAP_T), tj = Math.floor(-my / CELL / MAP_T);
  for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r + 1) S.seen.add((ti + a) * 4096 + (tj + b));
}
// (Built once each pause: a pixel to MAP_P cells, from the foot to the summit, the width of the world.)
let MAP = null;
const bandRGB = (h) => rgb(strataAt(h, (NOV && NOV.domain) || "gluttony"));
function buildMap() {
  if (NOV && Number.isFinite(summitK())) ensureSecs(summitK());
  const su = summitSec(), top = su ? su.h0 + 8 : Math.ceil(S.top / CELL) + 60, w = Math.ceil(COLS / MAP_P), h = Math.ceil(top / MAP_P);
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = x * MAP_P, hh = (h - y) * MAP_P, p = (y * w + x) * 4;
    if (!ClimbPause.all && !(S.seen && S.seen.has(Math.floor(i / MAP_T) * 4096 + Math.floor(hh / MAP_T)))) { d[p + 3] = 0; continue; }
    const rock = solid(i + 1, -hh), c = bandRGB(hh);
    d[p] = rock ? c[0] * 0.45 : 150 + c[0] * 0.35; d[p + 1] = rock ? c[1] * 0.45 : 150 + c[1] * 0.3; d[p + 2] = rock ? c[2] * 0.45 : 140 + c[2] * 0.25; d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0); MAP = { c, w, h, top };
}
// (Near: the part of it about him, larger, filling the space given.)
function drawMap(x, y, w, h, near) {
  if (!MAP) buildMap();
  const fit = Math.min(w / MAP.w, h / MAP.h), k = near ? Math.max(fit * 4, Math.min(w / MAP.w, 3)) : fit;
  const mx = S.x / CELL / MAP_P, my = MAP.h - -S.y / CELL / MAP_P;       // (where he is, in the map's pixels)
  const vw = Math.min(w, MAP.w * k), vh = Math.min(h, MAP.h * k), ox = x + (w - vw) / 2;
  const sx = clamp(mx - vw / k / 2, 0, Math.max(0, MAP.w - vw / k)), sy = clamp(my - vh / k / 2, 0, Math.max(0, MAP.h - vh / k));
  rect(ox - 2, y - 2, vw + 4, vh + 4, "#050506"); ctx.strokeStyle = "rgba(255,179,71,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(ox - 2.5, y - 2.5, vw + 5, vh + 5);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(MAP.c, sx, sy, vw / k, vh / k, ox, y, vw, vh); ctx.imageSmoothingEnabled = true;
  // (Where he is: a flame.)
  const px = ox + (mx - sx) * k, py = y + (my - sy) * k;
  glow(px, py, 9, C.flame, 0.6); circle(px, py, 2.2, C.flameHot);
  return [ox, y, vw, vh];
}

// ---- The near wall, and the strata -----------------------------------------------------------------
// Behind the rock he climbs, nearer than the far mist: the cave's own wall, moving at half his pace,
// columns and ribs of rock, teeth hanging from above, and here and there a face in the stone. It
// changes colour by bands as he climbs, as rock is laid down in strata, a band to each row of rooms;
// the map shows the bands too. Seen only where his light reaches.
const BAND = 44;                                 // rows of cells to a band (a row of rooms)
const STRATA = {
  gluttony: ["#8a6a3e", "#6e6c3a", "#a3963e", "#7c4a30", "#6a3a34", "#8a7a52"],
  lust: ["#7a4a5e", "#5e3e5a", "#8a5a6a", "#4e3a52"], avarice: ["#7a6a3a", "#5e5a4a", "#8a7a4a", "#4e4a3e"], wrath: ["#7a3a2e", "#5a3a34", "#8a4a32", "#4a2e2a"],
};
// The band's colour at height h (in cells): each band its own, blending into the next at its top.
function strataAt(h, dom) {
  const c = STRATA[dom] || STRATA.gluttony, b = Math.max(0, h) / BAND, i = Math.floor(b), k = smooth((b - i - 0.82) / 0.18);
  return mix(c[i % c.length], c[(i + 1) % c.length], k);
}
function drawNearWall(cam, t, dom) {
  const PX = 0.5, ox = cam.x * PX, oy = cam.y * PX, TW = 170, TH = 230, hMid = -(cam.y + H / 2) / CELL;
  const col = strataAt(hMid, dom), body = mix("#0b0a0c", col, 0.42), shade = mix("#060507", col, 0.18);
  const [lx, ly] = S.torch, sd = (seed % 997) + 3;
  for (let iy = Math.floor(oy / TH) - 1; iy <= Math.floor((oy + H) / TH) + 1; iy++) for (let ix = Math.floor(ox / TW) - 1; ix <= Math.floor((ox + W) / TW) + 1; ix++) {
    // (A column runs unbroken through two or more tiles, and comes to a point where it ends.)
    const has = (j) => hash2(ix, Math.floor(j / 2), sd) < 0.42, x0 = ix * TW - ox, y0 = iy * TH - oy;
    if (has(iy)) {
      // A column of rock, its sides broken.
      const cx = x0 + TW * (0.25 + 0.5 * hash2(ix, 0, sd + 1)), w = 40 + 80 * hash2(ix, 0, sd + 2), L = [], R = [], up = !has(iy - 1), dn = !has(iy + 1);
      for (let q = 0; q <= 9; q++) {
        const g = iy * 9 + q, y = y0 + (TH * q) / 9, n = (hash2(ix * 13, g, sd + 3) - 0.5) * 22, m = (hash2(ix * 13, g, sd + 4) - 0.5) * 22;
        const k = Math.min(up ? smooth(q / 5) : 1, dn ? smooth((9 - q) / 5) : 1), hw = (w / 2) * (0.08 + 0.92 * k);
        L.push([cx - hw + n * k, y]); R.push([cx + hw + m * k, y]);
      }
      const outline = [...L, ...R.reverse()]; poly(outline.flat(), body);
      poly([L[2][0] + 6, L[2][1], L[6][0] + 10, L[6][1], L[7][0] + 4, L[7][1]], shade);
      // Now and then, a face in the stone (the traced face of Gluttony's mouth), set into the column's
      // side as though carved there: a shade darker than the rock, its cracks showing the rock through.
      if (hash2(ix, iy, sd + 5) < 0.14 && w > 60) {
        const side = hash2(ix, iy, sd + 6) < 0.5 ? 1 : -1, k = (w / 64) * (0.9 + 0.3 * hash2(ix, iy, sd + 7)), fx = cx + side * w * 0.12, fy = y0 + TH * (0.5 + 0.3 * hash2(ix, iy, sd + 8));
        const T = (u, v) => [fx + side * u * k, fy - v * k], F = new Path2D(); addShape(F, TRACED.wf0, T);
        // (Only within the column: the face is in the rock, and does not stand out of it.)
        const C = new Path2D(); C.moveTo(outline[0][0], outline[0][1]); for (const q of outline) C.lineTo(q[0], q[1]); C.closePath();
        ctx.save(); ctx.clip(C); ctx.globalAlpha = 0.8; ctx.fillStyle = mix(body, "#040305", 0.5); ctx.fill(F, "evenodd"); ctx.restore();
        // (Lit, its eye glints, now and then.)
        const [ex, ey] = T(-0.6, 69.9);
        if (dist(lx - cam.x, ly - cam.y, ex, ey) < lightR() * 0.9 && Math.sin(t * 0.7 + ix * 2.3) > 0.55) circle(ex, ey, 1.4, "rgba(255,226,180,0.7)");
      }
    } else if (hash2(ix, iy, sd + 14) < 0.35) {
      // Teeth of rock hanging from above.
      // (The fat of Gluttony dripping from a ledge: traced.)
      const D = new Path2D();
      for (let q = 0; q < 2; q++) { const sh = TRACED["wd" + Math.floor(hash2(ix, iy * 3 + q, sd + 11) * 3)], k = 1.6 + 1.6 * hash2(ix, q, sd + 12), x = x0 + TW * (0.25 + 0.5 * q), top = sh === TRACED.wd2 ? 40 : 30; addShape(D, sh, (u, v) => [x + u * k, y0 + (top - v) * k]); }
      ctx.fillStyle = body; ctx.fill(D);
    }
  }
}
