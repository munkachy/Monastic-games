"use strict";
// Fear Not: the demons roaming the city, seen from straight above on the flight. They wander the
// roofs in twos and threes, a roof at a time, keeping to the dark: the fewer lights burning round a
// roof, the likelier they are on it, and none come near the church. Each smoulders red, with a red
// ripple now and then, so they are seen from far off; at the edge of the screen a red mark points
// to the nearest out of sight. Land near them, and the whole gang is on him: the fight itself is on
// the street's terms, side on (fight.js). As the dark spreads round the car there are more of them,
// and those beaten are made up from the dark, far from him.
// The flight lends it the city (`api`): the camera, the roofs, the lights, and where things are.

function Roamers(api) {
  const { sx, sy, K } = api;
  const ROAM_R = 230;      // how near they must be, when he gets down on a roof, for the fight to begin
  const SEE_R = 320;       // while he stands still on a roof, those this near come after him
  const HOP = 100;         // how far apart two roofs may be for them to leap it
  const FIG = 1.22, RIMS = ["#ff2a2a", "#ff6a2a", "#e0105a"];
  let roam = [], clock = 0, roamT = 0, seen = 0, idx = new Map(), id = 0;

  // ---- Where things are -------------------------------------------------------------------------------
  const gap = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  const keepOn = (o, b, m) => { o.x = clamp(o.x, b.x0 + m, b.x1 - m); o.y = clamp(o.y, b.y0 + m, b.y1 - m); };
  const zOf = (f) => (f.roof ? f.roof.h : f.alt) + (f.z || 0);
  const any = (a) => a[Math.floor(Math.random() * a.length)];
  const centre = (r) => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });
  function okRoof(r) { if (r.church || r.x1 - r.x0 < 40 || r.y1 - r.y0 < 40) return false; const c = centre(r); return Math.hypot(c.x - api.holy.x, c.y - api.holy.y) > 420; }
  function roofInfo(r) {
    if (r.nb) return r;
    const c = centre(r);
    r.nb = api.roofs().filter((o) => o !== r && okRoof(o) && gap(o, r) <= 90);
    r.lts = api.lights().filter((L) => !L.holy && Math.hypot(L.x - c.x, L.y - c.y) < 170);
    return r;
  }
  // How dark a roof is: by the lights still burning round it.
  const darkness = (r) => { roofInfo(r); let n = 0; for (const L of r.lts) n += L.lit; return clamp(1 - n / 2.5, 0, 1); };
  const spot = (r) => ({ x: lerp(r.x0 + 10, r.x1 - 10, Math.random()), y: lerp(r.y0 + 10, r.y1 - 10, Math.random()) });

  // ---- Packs of them ----------------------------------------------------------------------------------
  // What kind: harder the further on in the story, and the further out from where he starts.
  function kindFor(dk, r) {
    const c = centre(r), far = Math.hypot(c.x - api.begin.x, c.y - api.begin.y), st = Math.max(api.stage(), far > 1600 ? 3 : far > 850 ? 1 : 0), k = Math.random();
    if (st >= 3) return k < 0.2 + dk * 0.06 ? "grab" : k < 0.38 + dk * 0.06 ? "shield" : "whisper";
    if (st >= 1) return k < 0.14 ? "grab" : k < 0.22 ? "shield" : "whisper";
    return "whisper";
  }
  function addPack(r, n, o) {
    o = o || {};
    roofInfo(r);
    const dk = darkness(r);
    for (let i = 0; i < n; i++) {
      const b = i && r.nb.length && Math.random() < 0.3 ? any(r.nb) : r, p = spot(b);
      const f = { id: ++id, kind: (o.kinds && o.kinds[i]) || kindFor(dk, b), x: p.x, y: p.y, roof: b, alt: b.h, z: 0, ang: Math.random() * TAU, walk: false, guard: !!o.guard, ph: Math.random() * 10, seed: Math.random() * 10, hatKind: id % 3 === 0 ? 1 : 0, rim: RIMS[id % 3] };
      f.shield = f.kind === "shield";
      f.roam = { home: o.home || { x: p.x, y: p.y }, tether: o.tether || 320, wait: Math.random() * 2, tx: p.x, ty: p.y, hop: null, drop: o.drop ? { t: -i * 0.25, dur: 1.1, z0: 300 } : null };
      if (f.roam.drop) f.z = 300;
      roam.push(f);
    }
  }
  // A roof for a new pack: weighted to the dark, and away from him (and, at first, from where he starts).
  function packRoof(awayX, awayY, away) {
    let tot = 0; const cand = [];
    for (const r of api.roofs()) {
      if (!okRoof(r)) continue;
      const c = centre(r);
      if (Math.hypot(c.x - awayX, c.y - awayY) < away) continue;
      const w = 0.22 + Math.pow(darkness(r), 1.5);
      tot += w; cand.push([r, tot]);
    }
    const x = Math.random() * tot;
    for (const [r, t] of cand) if (t >= x) return r;
    return null;
  }
  const packSize = (r) => 1 + (darkness(r) > 0.6 ? 1 : 0) + (Math.random() < 0.45 ? 1 : 0);
  function reset() {
    roam = []; clock = 0; roamT = 0;
    const S = api.begin, Car = api.car;
    // A pair to meet first, a little off the way to the church; and his father's car, guarded.
    const nearest = (x, y, ok) => api.roofs().filter((r) => okRoof(r) && (!ok || ok(r))).sort((a, b) => Math.hypot(centre(a).x - x, centre(a).y - y) - Math.hypot(centre(b).x - x, centre(b).y - y))[0];
    const dx = api.holy.x - S.x, dy = api.holy.y - S.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const first = nearest(S.x + ux * 560 - uy * 120, S.y + uy * 560 + ux * 120);
    if (first) addPack(first, 2, { kinds: ["whisper", "whisper"], tether: 160 });
    const guard = nearest(Car.x, Car.y - 90, (r) => r.x1 - r.x0 >= 50);
    if (guard) addPack(guard, 4, { kinds: ["whisper", "grab", "shield", "whisper"], home: { x: Car.x, y: Car.y }, tether: 230, guard: true });
    for (let n = 0; n < 50 && roam.length < 36; n++) { const r = packRoof(S.x, S.y, 480); if (r) addPack(r, packSize(r)); }
  }

  // ---- Their wandering ---------------------------------------------------------------------------------
  function step(dt) {
    clock += dt;
    const P = api.P, hRoof = P.on && !P.jump ? P.on : null;
    for (const f of roam) stepOne(f, dt, hRoof, P.x, P.y);
    // Those beaten are made up from the dark, far off.
    roamT -= dt;
    if (roamT <= 0) {
      roamT = 3;
      if (roam.length < 32 + Math.round(api.gloom() * 12)) { const r = packRoof(P.x, P.y, 620); if (r) addPack(r, packSize(r), { drop: true }); }
    }
  }
  function stepOne(f, dt, hRoof, hx, hy) {
    const R0 = f.roam; f.ph += dt;
    if (R0.drop) {
      // Down out of the dark onto the roof.
      R0.drop.t += dt; const u = clamp(R0.drop.t / R0.drop.dur, 0, 1);
      f.z = Math.min(R0.drop.z0, Math.max(0, api.cam.z - f.roof.h - 60)) * (1 - u) * (1 - u);
      if (u >= 1) { f.z = 0; R0.drop = null; }
      return;
    }
    if (R0.hop) {
      const J = R0.hop; J.t += dt;
      const u = clamp(J.t / J.dur, 0, 1), e = smooth(u), c = 2 * J.top - (J.h0 + J.h1) / 2;
      f.x = lerp(J.x0, J.x1, e); f.y = lerp(J.y0, J.y1, e); f.alt = (1 - u) * (1 - u) * J.h0 + 2 * u * (1 - u) * c + u * u * J.h1; f.ang = Math.atan2(J.y1 - J.y0, J.x1 - J.x0);
      if (u >= 1) { f.roof = J.to; f.alt = J.to.h; R0.hop = null; R0.tx = f.x; R0.ty = f.y; R0.wait = 0.6 + Math.random() * 1.6; }
      return;
    }
    const dx = R0.tx - f.x, dy = R0.ty - f.y, d = Math.hypot(dx, dy);
    if (d > 1.5) { const sp = f.kind === "grab" ? 11 : 14; f.x += dx / d * sp * dt; f.y += dy / d * sp * dt; f.ang = Math.atan2(dy, dx); f.walk = true; return; }
    f.walk = false;
    R0.wait -= dt;
    if (R0.wait > 0) return;
    R0.wait = 1 + Math.random() * 2.4;
    roofInfo(f.roof);
    // He has stopped near them: after him, a roof at a time.
    if (hRoof && f.roof !== hRoof && Math.hypot(hx - f.x, hy - f.y) < SEE_R) {
      let best = null, bd = gap(f.roof, hRoof);
      for (const r of f.roof.nb) { const g = r === hRoof ? -1 : gap(r, hRoof); if (g < bd - 4 && roam.filter((o) => o.roof === r).length < 3) { bd = g; best = r; } }
      if (best && best !== hRoof) { hopTo(f, best, hx, hy); R0.wait = 0.4 + Math.random() * 0.8; return; }
      R0.tx = clamp(hx, f.roof.x0 + 9, f.roof.x1 - 9); R0.ty = clamp(hy, f.roof.y0 + 9, f.roof.y1 - 9); f.ang = Math.atan2(hy - f.y, hx - f.x); return;
    }
    // Otherwise about the roof, or on to a darker one near it, not too far from where they keep.
    if (Math.random() < 0.62 || !f.roof.nb.length) { const p = spot(f.roof); R0.tx = p.x; R0.ty = p.y; return; }
    let best = null, bs = -1e9;
    for (const r of f.roof.nb) {
      const c = centre(r), far = Math.hypot(c.x - R0.home.x, c.y - R0.home.y);
      if (far > R0.tether || roam.filter((o) => o.roof === r).length >= 3) continue;
      const sc = darkness(r) * 2 + Math.random() - far / R0.tether * 0.6;
      if (sc > bs) { bs = sc; best = r; }
    }
    if (best) hopTo(f, best);
    else { const p = spot(f.roof); R0.tx = p.x; R0.ty = p.y; }
  }
  function hopTo(f, r, hx, hy) {
    const to = hx === undefined ? spot(r) : { x: clamp(hx, r.x0 + 9, r.x1 - 9) + (Math.random() - 0.5) * 20, y: clamp(hy, r.y0 + 9, r.y1 - 9) + (Math.random() - 0.5) * 20 };
    keepOn(to, r, 8);
    f.roam.hop = { t: 0, dur: 0.7 + gap(f.roof, r) / 300, x0: f.x, y0: f.y, h0: f.roof.h, x1: to.x, y1: to.y, h1: r.h, top: Math.max(f.roof.h, r.h) + 30, to: r };
    f.alt = f.roof.h; f.roof = null;
  }

  // ---- For the flight -----------------------------------------------------------------------------------
  // Those near enough, where he has got down, for the fight to begin (none if none).
  function near(x, y, roof) {
    return roam.filter((f) => !f.roam.hop && !f.roam.drop && f.roof && (f.roof === roof || (Math.hypot(f.x - x, f.y - y) < ROAM_R && gap(f.roof, roof) <= HOP)));
  }
  // How many are left within r of a place.
  const left = (x, y, r) => roam.filter((f) => Math.hypot(f.x - x, f.y - y) < r).length;
  // The gang beaten: they and any others close by are gone from the roofs.
  function beaten(x, y, r) { const n = roam.length; roam = roam.filter((f) => Math.hypot(f.x - x, f.y - y) >= r); return n - roam.length; }
  // For trying a fight at once: a pack on his roof, round him.
  function packHere(x, y, roof, kinds) {
    addPack(roof, kinds.length, { kinds });
    for (const f of roam.slice(-kinds.length)) { const a = Math.random() * TAU; f.x = clamp(x + Math.cos(a) * 34, roof.x0 + 9, roof.x1 - 9); f.y = clamp(y + Math.sin(a) * 34, roof.y0 + 9, roof.y1 - 9); f.roof = roof; f.roam.tx = f.x; f.roam.ty = f.y; }
  }

  // ---- Drawing them -------------------------------------------------------------------------------------
  // Each on its roof, drawn with the building (so the taller ones near the edges of the screen lean
  // over it); those in the air after all the buildings.
  function index() { idx = new Map(); for (const f of roam) if (f.roof && !f.roam.drop) { const l = idx.get(f.roof); if (l) l.push(f); else idx.set(f.roof, [f]); } }
  function drawOn(b) { const l = idx.get(b); if (l) for (const f of l) { shadow(f, 0); drawOne(f); } }
  function drawAir() { for (const f of roam) if (!f.roof || f.roam.drop) { if (f.roof) shadow(f, f.z); drawOne(f); } }
  function shadow(f, up) { const s = FIG * (f.kind === "grab" ? 1.25 : 1), z = f.roof ? f.roof.h : 0, k = K(z), X = sx(f.x + up * 0.1, z), Y = sy(f.y + up * 0.14, z); ctx.globalAlpha = clamp(0.4 - up / 200, 0.12, 0.4); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(X, Y, 9 * k * s, 7 * k * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  function stroke2(x0, y0, x1, y1, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  // One of them from above: the ragged coat, the claws, the hat askew, the ember eyes at the front.
  function drawOne(f) {
    const z = zOf(f), k = K(z), X = sx(f.x, z), Y = sy(f.y, z), s = (f.kind === "grab" ? 1.25 : 1) * FIG, t = clock + f.seed, ink = "#050308";
    if (X < -60 || X > W + 60 || Y < -60 || Y > H + 60) return;
    if (f.roof) glowOval(sx(f.x, f.roof.h), sy(f.y, f.roof.h), 18 * K(f.roof.h) * s, 18 * K(f.roof.h) * s, "#ff1a1a", 0.16);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(f.ang); ctx.scale(k * s, k * s);
    const reach = f.walk ? 0.15 + 0.15 * Math.sin(f.ph * 9) : 0.1;
    for (const side of [-1, 1]) { const hx = 3 + 9 * reach, hy = side * (6.5 - 3 * Math.max(0, reach)); stroke2(0, side * 5.5, hx, hy, ink, 2.6); for (const c of [-0.5, 0, 0.5]) stroke2(hx, hy, hx + Math.cos(c) * 3, hy + Math.sin(c) * 3 + side * 0.5, ink, 0.9); }
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const an = i * TAU / 12, r = (i % 2 ? 5.4 : 7) + Math.sin(t * 5 + i) * 0.5, rx = an > PI / 2 && an < PI * 1.5 ? 1.15 : 0.9; const px = Math.cos(an) * r * rx, py = Math.sin(an) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = f.rim; ctx.lineWidth = 1.2 / (k * s); ctx.stroke();
    if (f.kind === "grab") { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(-3, 0, 4, 6, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(-0.5, 0.6); ctx.rotate(0.4); ctx.fillStyle = "#0e0a12"; ctx.beginPath(); ctx.ellipse(0, 0, f.hatKind ? 5 : 6, f.hatKind ? 5 : 4.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#16101c"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); ctx.restore();
    circle(4.6, -1.7, 0.9, "#ffb070"); circle(4.6, 1.7, 0.9, "#ffb070");
    if (f.shield) { poly([7, -9, 10.5, -8, 10.5, 8, 7, 9], ink); ctx.strokeStyle = hexA(C.ember, 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(8.5, -7); ctx.lineTo(9.4, -2); ctx.lineTo(8.2, 2); ctx.lineTo(9.3, 7); ctx.stroke(); }
    ctx.restore();
    glow(X + Math.cos(f.ang) * 4.6 * k * s, Y + Math.sin(f.ang) * 4.6 * k * s, 7 * k, C.ember, 0.6);
  }
  // Over the dark: the smoulder of each, and a red ripple now and then, to be seen from far off; and
  // at the edge of the screen, a mark toward the nearest packs out of sight.
  function drawGlow(marks) {
    const cam = api.cam, out = [];
    seen = 0;
    for (const f of roam) {
      const z = zOf(f), X = sx(f.x, z), Y = sy(f.y, z), k = K(z);
      if (X < -40 || X > W + 40 || Y < -40 || Y > H + 40) { out.push(f); continue; }
      seen++;
      const pul = 0.75 + 0.25 * Math.sin(clock * 3 + f.seed);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      glowOval(X, Y, Math.max(12, 34 * k), Math.max(12, 34 * k), "#ff2010", 0.3 * pul);
      glow(X + Math.cos(f.ang) * 5 * k, Y + Math.sin(f.ang) * 5 * k, Math.max(7, 7 * k + 3), C.ember, 0.8 * pul);
      const ph = (clock * 0.5 + f.seed) % 1.8;
      if (ph < 1) { ctx.strokeStyle = hexA("#ff4a2a", 0.65 * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, Math.max(4, (6 + ph * 52) * k), 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    if (!marks) return;
    out.sort((a, b) => Math.hypot(a.x - cam.x, a.y - cam.y) - Math.hypot(b.x - cam.x, b.y - cam.y));
    const shown = [];
    for (const f of out) {
      const d = Math.hypot(f.x - cam.x, f.y - cam.y);
      if (d > 1700 || shown.length >= 4 || shown.some((o) => Math.hypot(o.x - f.x, o.y - f.y) < 180)) continue;
      shown.push(f);
      const z = zOf(f), X = sx(f.x, z), Y = sy(f.y, z), a = Math.atan2(Y - H / 2, X - W / 2);
      const ex = clamp(X, 22, W - 22), ey = clamp(Y, 64, H - 30), al = clamp(1 - d / 1700, 0.4, 0.95) * (0.8 + 0.2 * Math.sin(clock * 4));
      glow(ex, ey, 20, "#ff2a1a", 0.45 * al);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.globalAlpha = al;
      poly([11, 0, -7, -9, -3, 0, -7, 9], "#ff5a3a"); ctx.restore(); ctx.globalAlpha = 1;
    }
  }

  return { reset, step, near, left, beaten, packHere, darkness, index, drawOn, drawAir, drawGlow, get list() { return roam; }, get seen() { return seen; } };
}
