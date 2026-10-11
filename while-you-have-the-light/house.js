"use strict";
// The house: the monastery at the foot of the seven mountains, where the angel sets him down. A strip
// of level ground he walks along (as in Kingdom), with places marked out for what is to be built:
// the library, the choir, and a wall at either end. At each he lays the stones he has brought home
// (the blocks of the idols, carried to the carts on the mountains, kept when a summit is won): each
// falls as he steers it and turns it, and lands and settles as stone does (planck.js, the Box2D
// engine of Benedictine Bricks). When the stones stand as high as the line marked for them, the
// roof comes down on them and the building stands. What he lays is kept, stone by stone.
// Built, the library can be gone into: Psalm 118 in twenty-two books, filling verse by verse as the
// verses are read on the mountains.

const House = (() => {
  const pl = typeof planck !== "undefined" ? planck : null;
  const T = 20, HW = 1900, GY = 304, FH = 6, FALL = 2.5 * T, DROP = 15 * T, SKIN = 0.01;   // a stone's square; the grounds' width; the ground; a foundation's height; how fast a steered stone falls, and a dropped one (as in Benedictine Bricks)
  const SHAPES = { I: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]], J: [[-1, -0.5], [0, -0.5], [1, -0.5], [1, 0.5]], L: [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5]], O: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]], S: [[0, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5]], T: [[-1, -0.5], [0, -0.5], [1, -0.5], [0, 0.5]], Z: [[-1, -0.5], [0, -0.5], [0, 0.5], [1, 0.5]] };
  const KEYS = Object.keys(SHAPES), DOMS = ["gluttony", "lust", "avarice", "wrath"];
  // The places to build: where, how wide (in stones), how high the stones must stand, how many it takes.
  const SITES = [
    { id: "wallW", name: "THE WALL", x: 190, w: 3, h: 5, need: 4, kind: "wall" },
    { id: "library", name: "THE LIBRARY", x: 620, w: 7, h: 4, need: 6, kind: "library" },
    { id: "choir", name: "THE CHOIR", x: 1260, w: 9, h: 4, need: 8, kind: "choir" },
    { id: "wallE", name: "THE WALL", x: 1710, w: 3, h: 5, need: 4, kind: "wall" },
  ];
  const GATE = 940;
  const H_ = { inside: null, t: 0, x: GATE, dir: 1, walkU: 0, cam: GATE - 280, world: null, stones: [], active: null, steer: false, angle: 0, drag: null, say: null, keys: {}, built: null };

  // ---- What is kept ----
  function data() {
    if (!save.house) {
      // (The first time: the stones brought home before there was a house to build, and a gift from the
      // lay brothers, the stones they had put by, to begin with.)
      const st = [], banked = {};
      for (const d of DOMS) { banked[d] = (save.bricks && save.bricks[d]) || 0; for (let i = 0; i < banked[d]; i++) st.push({ shape: KEYS[(Math.random() * 7) | 0], dom: d }); }
      for (let i = 0; i < 8; i++) st.push({ shape: KEYS[(Math.random() * 7) | 0], dom: DOMS[i % 4] });
      save.house = { store: st, sites: {}, gift: true, banked }; store();
    }
    return save.house;
  }
  const siteData = (s) => (data().sites[s.id] || (data().sites[s.id] = { done: false, stones: [] }));
  // Stones brought home since (each summit won banks the blocks in the carts): into the store.
  function takeBanked() {
    const D = data(); D.banked = D.banked || {};
    for (const d of DOMS) { const have = (save.bricks && save.bricks[d]) || 0, had = D.banked[d] === undefined ? have : D.banked[d]; for (let i = had; i < have; i++) D.store.push({ shape: KEYS[(Math.random() * 7) | 0], dom: d }); D.banked[d] = have; }
  }

  // ---- The stones, as bodies ----
  const P = (px) => px / T;
  function makeWorld() {
    const w = new pl.World({ gravity: pl.Vec2(0, 20) });
    const g = w.createBody({ type: "static", position: pl.Vec2(P(HW / 2), P(GY + 60)) }); g.createFixture({ shape: pl.Box(P(HW / 2 + 200), P(60)), friction: 0.9 });
    for (const s of SITES) { const f = w.createBody({ type: "static", position: pl.Vec2(P(s.x), P(GY - FH / 2)) }); f.createFixture({ shape: pl.Box(s.w / 2 + 0.25, P(FH / 2)), friction: 0.95 }); }
    w.on("begin-contact", (c) => {
      const a = c.getFixtureA().getBody(), b = c.getFixtureB().getBody();
      if (H_.active && (a === H_.active.body || b === H_.active.body)) H_.hit = true;
    });
    return w;
  }
  function addStone(st, x, y, a, dyn) {
    const body = H_.world.createBody({ type: dyn === false ? "static" : "dynamic", position: pl.Vec2(P(x), P(y)), angle: a || 0, angularDamping: 0.3 });
    for (const [cx, cy] of SHAPES[st.shape]) body.createFixture({ shape: pl.Box(0.5 - SKIN, 0.5 - SKIN, pl.Vec2(cx, cy), 0), density: 1, friction: 0.95, restitution: 0 });
    const S = { shape: st.shape, dom: st.dom, body, still: 0 };
    H_.stones.push(S); return S;
  }
  // Where each square of a stone is, in pixels: [x, y, angle].
  const squares = (S) => { const b = S.body, a = b.getAngle(); return SHAPES[S.shape].map(([cx, cy]) => { const p = b.getWorldPoint(pl.Vec2(cx, cy)); return [p.x * T, p.y * T, a]; }); };
  const siteOf = (S) => { const p = S.body.getPosition(); return SITES.find((s) => Math.abs(p.x * T - s.x) < (s.w / 2 + 0.6) * T) || null; };

  function load() {
    H_.world = makeWorld(); H_.stones = []; H_.active = null; H_.steer = false;
    for (const s of SITES) for (const q of siteData(s).stones) addStone(q, q.x, q.y, q.a, !siteData(s).done);
    for (const S of H_.stones) S.body.setAwake(false);
  }
  function keep() {
    for (const s of SITES) { const D = siteData(s); if (D.done) continue; D.stones = []; }
    for (const S of H_.stones) {
      if (S === H_.active) continue;
      const s = siteOf(S); if (!s || siteData(s).done) continue;
      const p = S.body.getPosition(); siteData(s).stones.push({ shape: S.shape, dom: S.dom, x: +(p.x * T).toFixed(1), y: +(p.y * T).toFixed(1), a: +S.body.getAngle().toFixed(3) });
    }
    store();
  }

  // ---- Laying a stone ----
  const nearSite = () => SITES.find((s) => Math.abs(H_.x - s.x) < s.w * T / 2 + 46) || null;
  function lay(s) {
    const D = data(); if (H_.active || !D.store.length || siteData(s).done) return;
    const st = D.store.shift();
    const top = Math.min(GY - FH, ...H_.stones.filter((S) => siteOf(S) === s).map((S) => Math.min(...squares(S).map((q) => q[1] - T / 2))));
    const S = addStone(st, s.x, Math.min(top - 120, GY - FH - s.h * T - 70), 0);
    H_.active = S; H_.site = s; H_.steer = true; H_.angle = 0; H_.hit = false; S.laidT = H_.t;
    H_.goal = s.x + (H_.x < s.x ? -1 : 1) * (s.w * T / 2 + 30);          // (he steps aside, to watch it go up)
    Sound.fx.pickup && Sound.fx.pickup();
  }
  // Would the steered stone, put here, run into another?
  function clear(S, x, a) {
    const b = S.body, p0 = b.getPosition(), a0 = b.getAngle();
    b.setTransform(pl.Vec2(P(x), p0.y), a);
    const mine = squares(S); let ok = true;
    for (const O of H_.stones) { if (O === S) continue; for (const q of squares(O)) for (const m of mine) if (Math.abs(q[0] - m[0]) < T - 2 && Math.abs(q[1] - m[1]) < T - 2) ok = false; }
    if (!ok) b.setTransform(p0, a0);
    return ok;
  }
  function nudge(d) {
    const S = H_.active; if (!S || !H_.steer) return;
    const s = H_.site, x = S.body.getPosition().x * T + d * T / 2;
    if (Math.abs(x - s.x) > (s.w / 2 + 2.5) * T) return;
    if (clear(S, x, H_.angle)) Sound.fx.tick && Sound.fx.tick(900, 0.2);
  }
  function turn() {
    const S = H_.active; if (!S || !H_.steer) return;
    if (clear(S, S.body.getPosition().x * T, H_.angle + PI / 2)) { H_.angle += PI / 2; Sound.fx.tick && Sound.fx.tick(1200, 0.25); }
  }
  function drop() { if (H_.active && H_.steer) { H_.steer = false; H_.active.body.setLinearVelocity(pl.Vec2(0, P(DROP))); } }
  function landed() {
    const S = H_.active; H_.active = null; H_.steer = false;
    const v = S.body.getLinearVelocity(); S.body.setLinearVelocity(pl.Vec2(v.x * 0.12, v.y * 0.12)); S.body.setAngularVelocity(S.body.getAngularVelocity() * 0.12);
    Sound.fx.brickDrop && Sound.fx.brickDrop(0, 0.8);
  }

  // ---- Each step ----
  function step(dt) {
    H_.t += dt;
    if (H_.inside) { H_.inside.t += dt; return; }
    if (H_.say) { H_.say.t += dt; if (H_.say.t > 3.2) H_.say = null; }
    if (H_.built) { H_.built.t += dt; if (H_.built.t > 2.6) H_.built = null; }
    // He walks (not while a stone is in the air).
    const k = H_.keys, l = k.ArrowLeft || k.KeyA || H_.pad < 0, r = k.ArrowRight || k.KeyD || H_.pad > 0;
    let vx = 0;
    if (H_.goal !== null && H_.goal !== undefined) { const d = H_.goal - H_.x; if (Math.abs(d) < 3) H_.goal = null; else vx = Math.sign(d) * 70; }
    if (!H_.active) { if (l) { vx = -70; H_.goal = null; } if (r) { vx = 70; H_.goal = null; } }
    if (vx) { H_.dir = Math.sign(vx); H_.x = clamp(H_.x + vx * dt, 40, HW - 40); H_.walkU = (H_.walkU + Math.abs(vx) * dt / 58) % 1; }
    H_.walking = !!vx;
    const S = H_.active;
    if (S && H_.steer) { S.body.setTransform(S.body.getPosition(), H_.angle); S.body.setAngularVelocity(0); S.body.setLinearVelocity(pl.Vec2(0, P(FALL))); }
    else if (S) { const v = S.body.getLinearVelocity(); if (v.y > P(DROP)) S.body.setLinearVelocity(pl.Vec2(v.x, P(DROP))); }   // (dropped: fast, but not so fast it bounces off)
    H_.world.step(Math.min(dt, 1 / 30), 10, 8);
    if (S && H_.hit) { H_.hit = false; landed(); }
    // Stones come to rest; one off its place (fallen to the ground) goes back into the store.
    const D = data();
    for (const O of H_.stones.slice()) {
      if (O === H_.active) continue;
      const v = O.body.getLinearVelocity(), calm = Math.hypot(v.x, v.y) < 0.05 && Math.abs(O.body.getAngularVelocity()) < 0.05;
      O.still = calm || !O.body.isAwake() ? O.still + dt : 0;
      const s = siteOf(O), low = O.body.getPosition().y * T > GY - FH + 4;
      if ((!s || low) && O.still > 0.8) {
        H_.world.destroyBody(O.body); H_.stones.splice(H_.stones.indexOf(O), 1); D.store.push({ shape: O.shape, dom: O.dom });
        H_.say = { text: "THE STONE FELL OFF", sub: "It is back in your store. Lay it again.", t: 0 }; keep();
      } else if (O.still > 0.6 && !O.kept) { O.kept = true; keep(); }
      if (!calm) O.kept = false;
    }
    // A place built: its stones as many as it takes, and standing as high as the line, and all still.
    for (const s of SITES) {
      const SD = siteData(s); if (SD.done) continue;
      const on = H_.stones.filter((O) => O !== H_.active && siteOf(O) === s);
      if (on.length < s.need || on.some((O) => O.still < 0.8)) continue;
      const top = Math.min(...on.flatMap((O) => squares(O).map((q) => q[1] - T / 2)));
      if (top > GY - FH - s.h * T + T * 0.5) continue;
      for (const O of on) O.body.setType("static");
      SD.done = true; keep();
      H_.built = { s, t: 0 }; Sound.fx.kindle && Sound.fx.kindle(1, 0); Sound.fx.unlock && Sound.fx.unlock();
    }
    // The camera: on him; on the stone, while one is laid.
    const fx = S ? S.body.getPosition().x * T : H_.x;
    H_.cam += (clamp(fx - W / 2, 0, HW - W) - H_.cam) * Math.min(1, dt * 4);
  }

  // ---- Drawn ----
  const stoneFill = (dom) => mix(SINS[dom] ? SINS[dom].color : "#888888", "#6e665c", 0.55);
  function drawStone(S, cam, lit) {
    for (const [x, y, a] of squares(S)) {
      ctx.save(); ctx.translate(x - cam, y); ctx.rotate(a);
      rect(-T / 2, -T / 2, T, T, "#1b181e"); rect(-T / 2 + 1, -T / 2 + 1, T - 2, T - 2, stoneFill(S.dom));
      rect(-T / 2 + 1, -T / 2 + 1, T - 2, 2, "rgba(255,240,215,0.28)"); rect(-T / 2 + 1, T / 2 - 3, T - 2, 2, "rgba(0,0,0,0.22)");
      ctx.restore();
    }
  }
  function drawBuilt(s, cam) {
    const x0 = s.x - s.w * T / 2 - cam, x1 = s.x + s.w * T / 2 - cam, top = GY - FH - s.h * T, ink = "#0d0b10";
    if (s.kind === "wall") {
      for (let i = 0; i < s.w; i++) if (i % 2 === 0) rect(x0 + i * T, top - 9, T, 9, ink);
      rect(x0 - 2, top - 1, x1 - x0 + 4, 3, ink);
      return;
    }
    // The roof, the door, the windows lit within.
    poly([x0 - 10, top + 2, (x0 + x1) / 2, top - (s.kind === "choir" ? 40 : 30), x1 + 10, top + 2], ink);
    const mx = (x0 + x1) / 2, dw = 10, dh = 22;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(mx - dw, GY - FH); ctx.lineTo(mx - dw, GY - FH - dh + dw); ctx.arc(mx, GY - FH - dh + dw, dw, PI, 0); ctx.lineTo(mx + dw, GY - FH); ctx.closePath(); ctx.fill();
    const lamp = 0.65 + 0.35 * Math.sin(H_.t * 1.7 + s.x);
    for (const wx of s.kind === "choir" ? [x0 + 16, x1 - 16] : [x0 + 13, x1 - 13]) { rect(wx - 3, top + 12, 6, 12, "rgba(255,196,120," + (0.8 * lamp).toFixed(3) + ")"); glow(wx, top + 18, 16, C.flame, 0.25 * lamp); }
    if (s.kind === "choir") { rect(mx - 6, top - 64, 12, 26, ink); poly([mx - 9, top - 64, mx, top - 78, mx + 9, top - 64], ink); rect(mx - 1, top - 92, 2, 14, ink); rect(mx - 5, top - 88, 10, 2, ink); }
    if (s.kind === "library") { rect(mx - 4, top - 44, 8, 16, ink); }
  }
  function draw() {
    if (H_.inside) { INSIDE[H_.inside.kind].draw(H_.inside); if (H_.inside.t < 0.5) rect(0, 0, W, H, "rgba(0,0,0," + (1 - H_.inside.t / 0.5) + ")"); return; }
    const cam = H_.cam, t = H_.t;
    // Dusk over the mountains; the ground; the gate in the middle, where he was set down.
    const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, "#1b1f3a"); g.addColorStop(0.55, "#5a4a64"); g.addColorStop(0.9, "#c08870"); g.addColorStop(1, "#e8b88a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY + 2);
    glow(W * 0.7 - cam * 0.03, GY - 10, 140, "#ffd9a0", 0.35);
    Climb.DOMAINS.forEach((d, i) => { const cx = ((i * 260 + 120 - cam * 0.25) % (W + 300) + W + 300) % (W + 300) - 150, h = 110 + 40 * Math.sin(i * 1.9 + 1); poly([cx - 150, GY + 2, cx - 30, GY - h * 0.7, cx, GY - h, cx + 40, GY - h * 0.75, cx + 150, GY + 2], i % 2 ? "#3e3a50" : "#463f55"); });
    rect(0, GY, W, H - GY, "#0d0b10");
    const ink = "#0d0b10", gx = GATE - cam;
    rect(gx - 34, GY - 52, 10, 52, ink); rect(gx + 24, GY - 52, 10, 52, ink); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(gx, GY - 52, 34, PI, 0); ctx.lineTo(gx + 24, GY - 52); ctx.arc(gx, GY - 52, 24, 0, PI, true); ctx.closePath(); ctx.fill();
    rect(gx - 1, GY - 98, 2, 14, ink); rect(gx - 5, GY - 94, 10, 2, ink);
    // The places: the foundation, the line the stones must reach, and (built) the building.
    const near = nearSite();
    for (const s of SITES) {
      const SD = siteData(s), x0 = s.x - s.w * T / 2 - cam, w = s.w * T, top = GY - FH - s.h * T;
      if (x0 > W + 60 || x0 + w < -60) continue;
      rect(x0 - 4, GY - FH, w + 8, FH, "#3a3540");
      if (!SD.done) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,226,170," + (near === s ? 0.75 : 0.35) + ")"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, s.h * T); ctx.restore();
        if (s.kind !== "wall") { ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = "rgba(255,226,170,0.22)"; ctx.beginPath(); ctx.moveTo(x0 - 10, top); ctx.lineTo(x0 + w / 2, top - (s.kind === "choir" ? 40 : 30)); ctx.lineTo(x0 + w + 10, top); ctx.stroke(); ctx.restore(); }
      }
    }
    for (const S of H_.stones) drawStone(S, cam);
    for (const s of SITES) if (siteData(s).done) drawBuilt(s, cam);
    // He.
    const p = H_.walking ? MONK_ANIM.walk(H_.walkU) : MONK_ANIM.idle((t * 0.4) % 1, t);
    const r = drawMonk(H_.x - cam, GY - FH * 0 , H_.dir, p, { t });
    if (r && r.torch) { drawFlame(r.torch[0], r.torch[1], 0.9, t, {}); glow(r.torch[0], r.torch[1], 40, C.flame, 0.3); }
    // The sign over the place he stands at.
    if (near && !H_.active) {
      const SD = siteData(near), on = H_.stones.filter((O) => siteOf(O) === near).length, sx = near.x - cam, sy = GY - FH - near.h * T - (near.kind === "wall" ? 26 : 52);
      text(near.name, sx, sy, { align: "center", font: FONT.title, size: 11, weight: 700, spacing: 3, color: "#fff3dc", glow: "rgba(0,0,0,0.9)", blur: 6 });
      text(SD.done ? "Built" : on + " of " + near.need + " stones, up to the line", sx, sy + 12, { align: "center", size: 8, weight: 600, color: SD.done ? "#ffd9a0" : "#e9e6df", glow: "rgba(0,0,0,0.9)", blur: 4 });
      if (SD.done && INSIDE[near.kind]) button("GO IN", clamp(sx - 60, 8, W - 128), H - 50, 120, 36, () => goIn(near.kind), { hot: true, sub: INSIDE[near.kind].sub() });
      if (!SD.done) {
        if (data().store.length) button("LAY A STONE", clamp(sx - 60, 8, W - 128), H - 50, 120, 36, () => lay(near), { hot: true, sub: data().store.length + " in your store" });
        else text("No stones in your store: bring blocks to the carts on the mountains, and win its summit.", W / 2, H - 30, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, max: W - 40 });
      }
    }
    // A stone in the air: how to steer it.
    if (H_.active && H_.steer) {
      const keys = usingKeys();
      text(keys ? "← → move it  ·  ↑ or click: turn it  ·  ↓ or space: drop it" : "Drag to move it  ·  tap to turn it", W / 2, H - 22, { align: "center", size: 9, weight: 600, color: "#e9e6df", glow: "rgba(0,0,0,0.9)", blur: 4, max: W - 140 });
      if (!keys) button("DROP", W - 96, H - 52, 80, 38, () => drop(), { hot: true });
    }
    // What he has: the stones in his store, in their colours.
    const D = data();
    text("HOME", 18, 30, { font: FONT.title, size: 16, weight: 700, spacing: 4, color: "#fff" });
    text("STONES IN YOUR STORE: " + D.store.length, 18, 46, { size: 8, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.75)" });
    D.store.slice(0, 16).forEach((st, i) => rect(18 + i * 9, 52, 7, 7, stoneFill(st.dom)));
    if (H_.built) {
      const a = clamp(H_.built.t / 0.3, 0, 1) * clamp((2.6 - H_.built.t) / 0.5, 0, 1);
      text(H_.built.s.name + " IS BUILT", W / 2, 84, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 4, color: "#fff1c4", alpha: a, glow: "rgba(255,170,70,0.8)", blur: 12, max: W - 30 });
    } else if (H_.say) {
      const a = clamp(H_.say.t / 0.3, 0, 1) * clamp((3.2 - H_.say.t) / 0.6, 0, 1);
      text(H_.say.text, W / 2, 84, { align: "center", font: FONT.title, size: 14, weight: 700, spacing: 3, color: "#fff3dc", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 30 });
      text(H_.say.sub, W / 2, 100, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, alpha: a, max: W - 30 });
    }
    if (D.gift && H_.t < 6) text("The lay brothers had put stones by for you: eight, to begin.", W / 2, 118, { align: "center", font: FONT.line, italic: true, size: 12, color: "#efe9dc", alpha: clamp((6 - H_.t) / 1, 0, 1), max: W - 30 });
    button("LEAVE", 12, H - 46, 80, 32, () => leave(), {});
    if (H_.t < 0.8) rect(0, 0, W, H, "rgba(0,0,0," + (1 - H_.t / 0.8) + ")");
  }

  // ---- Inside ----
  function goIn(kind) { H_.inside = { kind, t: 0, book: null }; H_.goal = null; Sound.fx.tick && Sound.fx.tick(700, 0.3); if (INSIDE[kind].enter) INSIDE[kind].enter(H_.inside); }
  function goOut() { const I = H_.inside && INSIDE[H_.inside.kind]; if (I && I.leave) I.leave(H_.inside); H_.inside = null; H_.t = Math.max(H_.t, 1); }

  // The library. Psalm 118 in twenty-two books, a stanza to each, on two shelves as the Rule lays the
  // psalm out (chapter 18): on Sunday, four of its sections at Prime and three each at Terce, Sext and
  // None; on Monday, the nine left, three each at Terce, Sext and None. A book fills a line at a
  // time as its verses are read on the mountains; opened, it shows them, the rest still blank.
  const HOURS = [
    { day: "SUNDAY", hour: "PRIME", from: 0, n: 4, col: "#5c2020" }, { day: "SUNDAY", hour: "TERCE", from: 4, n: 3, col: "#22402e" },
    { day: "SUNDAY", hour: "SEXT", from: 7, n: 3, col: "#22304f" }, { day: "SUNDAY", hour: "NONE", from: 10, n: 3, col: "#4c381a" },
    { day: "MONDAY", hour: "TERCE", from: 13, n: 3, col: "#22402e" }, { day: "MONDAY", hour: "SEXT", from: 16, n: 3, col: "#22304f" },
    { day: "MONDAY", hour: "NONE", from: 19, n: 3, col: "#4c381a" },
  ];
  const hourOf = (i) => HOURS.find((h) => i >= h.from && i < h.from + h.n);
  const hasVerses = () => typeof Verses !== "undefined" && !!Verses.verse;
  function shelves() {
    const rows = [HOURS.slice(0, 4), HOURS.slice(4)], out = [], gap = 14, bw = Math.min(34, (W - 56 - 3 * gap) / 13 - 3), bh = 74;
    rows.forEach((row, r) => {
      const n = row.reduce((a, h) => a + h.n, 0), tw = n * (bw + 3) - 3 + (row.length - 1) * gap, y = r ? 206 : 92;
      let x = W / 2 - tw / 2;
      for (const h of row) { h.x0 = x; for (let j = 0; j < h.n; j++) { out.push({ i: h.from + j, x, y, w: bw, h: bh, hour: h }); x += bw + 3; } h.x1 = x - 3; h.y = y; x += gap - 3; }
    });
    return out;
  }
  function drawRoom(t, warm) {
    rect(0, 0, W, H, "#0e0b0a");
    // The stones of the wall, faint; the light of the lamps on them.
    ctx.globalAlpha = 0.5;
    for (let r = 0; r * 18 < H; r++) for (let c = -1; c * 40 < W; c++) { const x = c * 40 + (r % 2) * 20; ctx.strokeStyle = "#1d1714"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, r * 18 + 0.5, 40, 18); }
    ctx.globalAlpha = 1;
    const fl = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    for (const lx of [W * 0.08, W * 0.92]) { glow(lx, 70, 120 * fl, C.flame, 0.22 * warm); rect(lx - 2, 74, 4, 14, "#d9cdb0"); drawFlame(lx, 72, 0.55, t, {}); }
  }
  function drawSpine(b, t, hot) {
    const n = hasVerses() ? Verses.count(b.i) : 0, bits = hasVerses() ? Verses.bits(b.i) : 0, whole = n === 8;
    if (whole) glow(b.x + b.w / 2, b.y + b.h / 2, 46, C.gold, 0.18 + 0.06 * Math.sin(t * 2 + b.i));
    rect(b.x, b.y, b.w, b.h, "#060505"); rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, b.hour.col);
    const sh = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0); sh.addColorStop(0, "rgba(0,0,0,0.45)"); sh.addColorStop(0.35, "rgba(255,255,255,0.08)"); sh.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = sh; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    rect(b.x + 1, b.y + 5, b.w - 2, 2, "rgba(232,196,106,0.5)"); rect(b.x + 1, b.y + b.h - 7, b.w - 2, 2, "rgba(232,196,106,0.5)");
    const g = Verses.STANZAS ? Verses.STANZAS[b.i][0] : "";
    text(g, b.x + b.w / 2, b.y + 25, { align: "center", font: "'Times New Roman', serif", size: 16, weight: 700, color: n ? C.gold : "rgba(232,196,106,0.3)", glow: n ? "rgba(255,190,90,0.6)" : undefined, blur: 6 });
    // A line of gold for each verse of it read.
    for (let k = 0; k < 8; k++) rect(b.x + 5, b.y + 33 + k * 4.2, b.w - 10, 2, bits & (1 << k) ? C.gold : "rgba(0,0,0,0.35)");
    if (!n) rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, "rgba(0,0,0,0.35)");
    if (whole || hot) { ctx.strokeStyle = whole ? C.gold : "rgba(255,226,170,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); }
  }
  function drawBook(I) {
    const i = I.book, t = I.t, h = hourOf(i), x0 = 20, y0 = 14, w = W - 40, hh = H - 70, mid = x0 + w / 2;
    rect(0, 0, W, H, "rgba(4,3,3,0.72)");
    // The two pages, the gutter between.
    rect(x0 - 3, y0 - 3, w + 6, hh + 6, "#3a2414");
    const pg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    pg.addColorStop(0, "#d8c8a4"); pg.addColorStop(0.08, "#eadfc4"); pg.addColorStop(0.46, "#e6d9bc"); pg.addColorStop(0.5, "#b9a682"); pg.addColorStop(0.54, "#e6d9bc"); pg.addColorStop(0.92, "#eadfc4"); pg.addColorStop(1, "#d8c8a4");
    ctx.fillStyle = pg; ctx.fillRect(x0, y0, w, hh);
    const ink = "#2b1e12", rub = "#8e2416", n = Verses.count(i);
    const v0 = Verses.verse(i, 0);
    // (The letter, its name, and where it stands in the psalm on the left; on the right, the Hour it is sung at.)
    text(v0[0], x0 + 22, y0 + 34, { font: "'Times New Roman', serif", size: 26, weight: 700, color: rub });
    text(v0[1], x0 + 56, y0 + 24, { font: FONT.title, size: 13, weight: 700, spacing: 3, color: ink });
    text("PSALM " + v0[4] + ":" + (i * 8 + 1) + "–" + (i * 8 + 8), x0 + 56, y0 + 36, { size: 7, weight: 700, spacing: 1.2, color: "rgba(43,30,18,0.65)", max: w / 2 - 80 });
    text(h.day + "  ·  " + h.hour, mid + w / 4, y0 + 28, { align: "center", font: FONT.title, size: 9, weight: 700, spacing: 3, color: rub, max: w / 2 - 30 });
    const pw = w / 2 - 34, fs = W < 640 ? 11 : 12, lh = fs + 2;
    for (let side = 0; side < 2; side++) {
      let y = y0 + 58; const x = side ? mid + 18 : x0 + 22;
      for (let k = side * 4; k < side * 4 + 4; k++) {
        const v = Verses.verse(i, k), read = Verses.bits(i) & (1 << k);
        text(String(v[2]), x - 4, y, { align: "right", size: 7, weight: 700, color: rub });
        if (read) {
          const L = textLines(v[3], x + 2, y, pw, { font: FONT.line, italic: true, size: fs, weight: 500, color: ink, lh });
          y += L * lh + 7;
        } else { text("·  ·  ·", x + 2, y, { font: FONT.line, size: fs, color: "rgba(43,30,18,0.3)" }); y += lh + 7; }
      }
    }
    const foot = n === 8 ? "The book is whole." : n ? n + " of its 8 verses read. The rest are read on the mountains, one a climb." : "Not one verse of it read yet. Its verse waits on the rock of every mountain.";
    text(foot, mid, y0 + hh - 10, { align: "center", font: FONT.line, italic: true, size: 11, color: n === 8 ? rub : "rgba(43,30,18,0.7)", max: w - 30 });
    button("‹", 16, H - 48, 44, 34, () => { I.book = (i + 21) % 22; }, { size: 16 });
    button("CLOSE", W / 2 - 50, H - 48, 100, 34, () => { I.book = null; }, {});
    button("›", W - 60, H - 48, 44, 34, () => { I.book = (i + 1) % 22; }, { size: 16 });
  }
  const INSIDE = {
    library: {
      sub: () => (hasVerses() ? Verses.total() + " of 176 verses" : ""),
      draw(I) {
        const t = I.t;
        drawRoom(t, 1);
        if (!hasVerses()) { button("GO OUT", 12, H - 46, 90, 32, goOut, {}); return; }
        text("THE LIBRARY", W / 2, 30, { align: "center", font: FONT.title, size: 17, weight: 700, spacing: 5, color: "#fff3dc", glow: "rgba(255,170,70,0.5)", blur: 10 });
        text("Psalm 118, a book to each of its stanzas, kept as the Rule sets them out for the Hours", W / 2, 47, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, max: W - 40 });
        text(Verses.total() + " OF 176 VERSES READ  ·  " + Verses.name().toUpperCase(), W / 2, 62, { align: "center", size: 7.5, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.6)", max: W - 40 });
        const B = shelves(); I.B = B;
        for (const [r, y] of [[0, 92], [1, 206]]) {
          const row = HOURS.filter((h) => (r ? h.day === "MONDAY" : h.day === "SUNDAY")), xa = row[0].x0 - 8, xb = row[row.length - 1].x1 + 8;
          rect(xa, y + 74, xb - xa, 5, "#4a301c"); rect(xa, y + 79, xb - xa, 2, "#1b120b");
          text(row[0].day, xa, y - 6, { size: 7, weight: 800, spacing: 2, color: "rgba(233,230,223,0.55)" });
          for (const h of row) text(h.hour, (h.x0 + h.x1) / 2, y + 91, { align: "center", size: 7, weight: 700, spacing: 1.5, color: "rgba(255,226,170,0.55)" });
        }
        for (const b of B) drawSpine(b, t, I.hover === b.i);
        if (I.book !== null) { drawBook(I); return; }
        text(usingKeys() ? "Click a book to open it" : "Tap a book to open it", W / 2, H - 22, { align: "center", font: FONT.line, italic: true, size: 12, color: "rgba(255,226,170,0.7)" });
        button("GO OUT", 12, H - 46, 90, 32, goOut, {});
      },
      down(I, p) {
        if (I.book !== null || !I.B) return;
        const b = I.B.find((q) => p.x >= q.x - 1 && p.x <= q.x + q.w + 1 && p.y >= q.y && p.y <= q.y + q.h);
        if (b) { I.book = b.i; Sound.fx.tick && Sound.fx.tick(500, 0.3); }
      },
      key(I, code) {
        if (I.book === null) return false;
        if (code === "ArrowLeft" || code === "KeyA") I.book = (I.book + 21) % 22;
        else if (code === "ArrowRight" || code === "KeyD") I.book = (I.book + 1) % 22;
        else if (code === "Escape" || code === "Enter" || code === "Space") I.book = null;
        return true;
      },
    },
  };

  // ---- Hands on it ----
  function down(p) {
    if (H_.inside) { const I = INSIDE[H_.inside.kind]; if (I.down) I.down(H_.inside, p); return; }
    if (H_.active && H_.steer) { H_.drag = { x: p.x, moved: 0 }; return; }
    // A tap on the ground: he walks there.
    if (p.y > GY - 140) { H_.goal = clamp(p.x + H_.cam, 40, HW - 40); }
  }
  function move(p) {
    if (H_.inside) { const I = H_.inside; if (I.B) { const q = I.B.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); I.hover = q ? q.i : null; } return; }
    const d = H_.drag; if (!d || !H_.active) return;
    const dx = p.x - d.x; if (Math.abs(dx) >= 12) { nudge(Math.sign(dx)); d.x = p.x; d.moved += 1; }
  }
  function up() { const d = H_.drag; H_.drag = null; if (d && !d.moved && H_.active) turn(); }
  function key(code, isDown) {
    H_.keys[code] = isDown; if (!isDown) return;
    if (H_.inside) { const I = INSIDE[H_.inside.kind]; if (!(I.key && I.key(H_.inside, code)) && (code === "Escape" || code === "Enter" || code === "Space")) goOut(); return; }
    if (H_.active && H_.steer) {
      if (code === "ArrowLeft" || code === "KeyA") nudge(-1); else if (code === "ArrowRight" || code === "KeyD") nudge(1);
      else if (code === "ArrowUp" || code === "KeyW") turn(); else if (code === "ArrowDown" || code === "KeyS" || code === "Space") drop();
      return;
    }
    if (code === "Space" || code === "Enter") { const s = nearSite(); if (s && !siteData(s).done) lay(s); else if (s && INSIDE[s.kind]) goIn(s.kind); }
    if (code === "Escape") leave();
  }
  function leave() { keep(); Game.toTitle(); }
  // In.
  function open() {
    if (!pl) return;
    data(); takeBanked(); load();
    H_.inside = null; H_.t = 0; H_.x = GATE; H_.dir = 1; H_.cam = clamp(GATE - W / 2, 0, HW - W); H_.goal = null; H_.keys = {}; H_.say = null; H_.built = null;
    if (data().gift) setTimeout(() => { if (data().gift) { data().gift = false; store(); } }, 6000);
    mode = M; Sound.flare(false); Sound.muffle(false); Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.25 });
  }
  const M = { step, draw, down, move, up, key, open, ok: () => !!pl, get state() { return H_; }, SITES, lay, turn, nudge, drop };
  return M;
})();
