"use strict";
// The monastery at the foot of the seven mountains, where the angel sets him down. A strip of level
// ground he walks along (as in Kingdom), with places marked out for what is to be built: the
// library and the choir. At each he lays the stones he has brought down (the
// blocks of the idols, carried to the carts on the mountains, kept when a summit is won): each hangs
// over the place while he moves it and turns it where he likes, a shadow showing where it will
// rest; set down, it settles as stone does (planck.js, the Box2D engine of Benedictine Bricks). A
// stone laid can be taken up again, back to the store, or moved. When the stones stand as high as
// the line marked for them, the roof comes down on them and the building stands. All of it is kept.
// Built, the library can be gone into: Psalm 118 in twenty-two books, filling verse by verse as the
// verses are read on the mountains; and the choir, where the souls freed at the summits sing them.
// Those freed from the idols on the mountains come down and wait by a fire at the gate; received,
// they are lay brothers, and walk about the grounds. The days go by, and the nights, in peace.

const House = (() => {
  const pl = typeof planck !== "undefined" ? planck : null;
  const T = 20, HW = 1900, GY = 304, FH = 6, SKIN = 0.01;   // a stone's square; the grounds' width; the ground; a foundation's height
  const SHAPES = { I: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]], J: [[-1, -0.5], [0, -0.5], [1, -0.5], [1, 0.5]], L: [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5]], O: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]], S: [[0, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5]], T: [[-1, -0.5], [0, -0.5], [1, -0.5], [0, 0.5]], Z: [[-1, -0.5], [0, -0.5], [0, 0.5], [1, 0.5]] };
  const KEYS = Object.keys(SHAPES), DOMS = ["gluttony", "lust", "avarice", "wrath"];
  // The places to build: where, how wide (in stones), how high the stones must stand, how many it takes.
  const SITES = [
    { id: "library", name: "THE LIBRARY", x: 620, w: 7, h: 4, need: 6, kind: "library" },
    { id: "choir", name: "THE CHOIR", x: 1260, w: 9, h: 4, need: 8, kind: "choir" },
  ];
  // Where each stands is the player's to choose (held on the ground, a menu). x is null while it has
  // no place yet; these are where they stood before, for a building begun in an older save.
  const FIRST_X = Object.fromEntries(SITES.map((s) => [s.id, s.x]));
  const placed = () => SITES.filter((s) => s.x !== null);
  const GATE = 940;
  const H_ = { inside: null, t: 0, x: GATE, dir: 1, walkU: 0, cam: GATE - 280, world: null, stones: [], hold: null, sel: null, recheck: new Set(), drag: null, say: null, keys: {}, built: null };

  // ---- What is kept ----
  function data() {
    if (!save.house) {
      // (The first time: the stones brought home before there was a house to build, and a gift from the
      // lay brothers, the stones they had put by, to begin with.)
      const st = [], banked = {};
      for (const d of DOMS) { banked[d] = (save.bricks && save.bricks[d]) || 0; for (let i = 0; i < banked[d]; i++) st.push({ shape: KEYS[(Math.random() * 7) | 0], dom: d }); }
      for (let i = 0; i < 14; i++) st.push({ shape: KEYS[(Math.random() * 7) | 0], dom: DOMS[i % 4] });
      save.house = { store: st, sites: {}, gift: true, banked, more: true }; store();
    }
    // (A house begun when the gift was eight: the six more the gift is now, enough for the choir.)
    if (!save.house.more) { save.house.more = true; for (let i = 0; i < 6; i++) save.house.store.push({ shape: KEYS[(Math.random() * 7) | 0], dom: DOMS[i % 4] }); store(); }
    // (Kept from when there were walls and raids: the walls' stones, and the tools set out (a stone
    // each), back into the store; brothers with holy water or a trowel, brothers again.)
    const Dh = save.house;
    if (Dh.sites.wallW || Dh.sites.wallE || Dh.raid || Dh.tools) {
      for (const id of ["wallW", "wallE"]) { for (const q of (Dh.sites[id] && Dh.sites[id].stones) || []) Dh.store.push({ shape: q.shape, dom: q.dom }); delete Dh.sites[id]; }
      const t = Dh.tools || {}; for (let i = 0; i < (t.water || 0) + (t.mason || 0); i++) Dh.store.push({ shape: KEYS[(Math.random() * 7) | 0], dom: DOMS[i % 4] });
      for (const p of Dh.people || []) if (p.role === "water" || p.role === "mason") { p.role = "brother"; delete p.side; }
      delete Dh.tools; delete Dh.raid; store();
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
    for (const s of placed()) { const f = w.createBody({ type: "static", position: pl.Vec2(P(s.x), P(GY - FH / 2)) }); f.createFixture({ shape: pl.Box(s.w / 2 + 0.25, P(FH / 2)), friction: 0.95 }); }
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
  const siteOf = (S) => { const p = S.body.getPosition(); return placed().find((s) => Math.abs(p.x * T - s.x) < (s.w / 2 + 0.6) * T) || null; };

  function load() {
    for (const s of SITES) { const SD = siteData(s); if (typeof SD.x !== "number" && (SD.done || SD.stones.length)) SD.x = FIRST_X[s.id]; s.x = typeof SD.x === "number" ? SD.x : null; }
    H_.world = makeWorld(); H_.stones = []; H_.hold = null; H_.sel = null; H_.recheck = new Set();
    for (const s of SITES) for (const q of siteData(s).stones) addStone(q, q.x, q.y, q.a, !siteData(s).done);
    for (const S of H_.stones) S.body.setAwake(false);
  }
  function keep() {
    for (const s of SITES) siteData(s).stones = [];
    for (const S of H_.stones) {
      const s = siteOf(S); if (!s) continue;
      const p = S.body.getPosition(); siteData(s).stones.push({ shape: S.shape, dom: S.dom, x: +(p.x * T).toFixed(1), y: +(p.y * T).toFixed(1), a: +S.body.getAngle().toFixed(3) });
    }
    store();
  }

  // ---- Laying a stone ----
  const nearSite = () => placed().find((s) => Math.abs(H_.x - s.x) < s.w * T / 2 + 46) || null;
  // The stone in his hands, hanging over a place: { shape, dom, x, y, a, s }; its squares, as a stone's are.
  const holdSquares = (h, y) => { const c = Math.cos(h.a), sn = Math.sin(h.a), yy = y === undefined ? h.y : y; return SHAPES[h.shape].map(([cx, cy]) => [h.x + (cx * c - cy * sn) * T, yy + (cx * sn + cy * c) * T, h.a]); };
  // Do two squares (each [x, y, angle], a little smaller than a stone's square) overlap? (Separating axes.)
  function sqHit(a, b, shrink) {
    const h = T / 2 - shrink;
    for (const ang of [a[2], b[2]]) for (const [ax, ay] of [[Math.cos(ang), Math.sin(ang)], [-Math.sin(ang), Math.cos(ang)]]) {
      const ext = (q) => h * (Math.abs(Math.cos(q[2]) * ax + Math.sin(q[2]) * ay) + Math.abs(-Math.sin(q[2]) * ax + Math.cos(q[2]) * ay));
      if (Math.abs((a[0] - b[0]) * ax + (a[1] - b[1]) * ay) > ext(a) + ext(b)) return false;
    }
    return true;
  }
  // The ground under a point: a foundation's top, or the ground itself.
  const floorAt = (x) => (placed().some((s) => Math.abs(x - s.x) < (s.w / 2 + 0.25) * T) ? GY - FH : GY);
  function blocked(h, y) {
    const mine = holdSquares(h, y);
    for (const m of mine) if (m[1] + T / 2 > floorAt(m[0]) + 0.5) return true;
    for (const O of H_.stones) { if (Math.abs(O.body.getPosition().x * T - h.x) > 4 * T) continue; for (const q of squares(O)) for (const m of mine) if (sqHit(q, m, 0.6)) return true; }
    return false;
  }
  // Where it would come to rest, let straight down from where it hangs.
  function landing(h) {
    if (h.land !== undefined && h.landKey === h.x + "," + h.a + "," + H_.stones.length + "," + H_.stillN) return h.land;
    let y = h.y; if (blocked(h, y)) return (h.land = null);
    let step = 8;
    while (step >= 0.5) { while (y < GY && !blocked(h, y + step)) y += step; step /= 2; }
    h.landKey = h.x + "," + h.a + "," + H_.stones.length + "," + H_.stillN; return (h.land = y);
  }
  // It hangs two squares over the highest of the line and what stands on the place.
  function hangY(h) {
    const s = h.s, on = H_.stones.filter((O) => siteOf(O) === s), top = Math.min(GY - FH - s.h * T, ...on.flatMap((O) => squares(O).map((q) => q[1] - T / 2)));
    const low = Math.max(...holdSquares(h, 0).map((q) => q[1] + T / 2));
    return top - 2 * T - low;
  }
  function lay(s) {
    const D = data(); if (H_.hold || !D.store.length || siteData(s).done) return;
    takeUp(D.store[0], s);
    H_.goal = s.x + (H_.x < s.x ? -1 : 1) * (s.w * T / 2 + 30);          // (he steps aside, to see it go up)
  }
  // (The stone stays in the store, as kept, until it is set down: so nothing is lost if the game is left with it in his hands.)
  function takeUp(st, s, x, a) {
    const h = { st, shape: st.shape, dom: st.dom, x: x === undefined ? s.x : x, y: 0, a: a || 0, s };
    // (On the half-square, measured from the place's left edge, so that stones line up.)
    const x0 = s.x - s.w * T / 2; h.x = x0 + Math.round((h.x - x0) / (T / 2)) * (T / 2);
    h.y = hangY(h); H_.hold = h; H_.sel = null;
    Sound.fx.pickup && Sound.fx.pickup();
  }
  function moveTo(x) {
    const h = H_.hold; if (!h) return false;
    const s = h.s, x0 = s.x - s.w * T / 2;
    x = clamp(x0 + Math.round((x - x0) / (T / 2)) * (T / 2), s.x - (s.w / 2 + 2) * T, s.x + (s.w / 2 + 2) * T);
    if (x === h.x) return false;
    const was = h.x; h.x = x; h.y = Math.min(h.y, hangY(h));
    if (blocked(h, h.y)) { h.x = was; return false; }
    return true;
  }
  function nudge(d) { const h = H_.hold; if (h && moveTo(h.x + d * T / 2)) Sound.fx.tick && Sound.fx.tick(900, 0.2); }
  function turn() {
    const h = H_.hold; if (!h) return;
    const was = h.a, wy = h.y; h.a = (h.a + PI / 2) % TAU; h.y = Math.min(h.y, hangY(h));
    if (blocked(h, h.y)) { h.a = was; h.y = wy; return; }
    Sound.fx.tick && Sound.fx.tick(1200, 0.25);
  }
  // Set down: straight down to where its shadow is, and there it settles.
  function place() {
    const h = H_.hold; if (!h) return;
    const y = landing(h); if (y === null || y === undefined) return;
    const S = addStone({ shape: h.shape, dom: h.dom }, h.x, y - 0.3, h.a, true);
    S.body.setLinearVelocity(pl.Vec2(0, 0.5));
    const D = data(), i = D.store.indexOf(h.st); if (i >= 0) D.store.splice(i, 1); else D.store.shift();
    H_.hold = null; keep(); Sound.fx.brickDrop && Sound.fx.brickDrop(0, 0.6);
  }
  // Another stone from the store in his hands instead: the next shape there is in it, each shape
  // once, either way round (with only one shape, the next colour of it).
  function otherStone(d) {
    const h = H_.hold, D = data(); if (!h || D.store.length < 2) return;
    const kinds = [...new Set(D.store.map((q) => q.shape))];
    let pick = null;
    if (kinds.length > 1) { const next = kinds[(kinds.indexOf(h.shape) + d + kinds.length) % kinds.length]; pick = D.store.find((q) => q.shape === next); }
    else { const cols = [...new Set(D.store.map((q) => q.dom))], next = cols[(cols.indexOf(h.dom) + d + cols.length) % cols.length]; if (next !== h.dom) pick = D.store.find((q) => q.dom === next); }
    if (!pick) return;
    Object.assign(h, { st: pick, shape: pick.shape, dom: pick.dom, a: 0 }); h.y = hangY(h);
    Sound.fx.tick && Sound.fx.tick(1200, 0.25);
  }
  function putBack() { if (!H_.hold) return; H_.hold = null; Sound.fx.tick && Sound.fx.tick(600, 0.3); }
  // A stone laid, taken up again: into the store, or into his hands to be laid somewhere else. If it
  // was part of a building, the rest of it is loosed, and settles; if it no longer reaches the line,
  // the roof is off it.
  const inSquare = (q, x, y, pad) => { const dx = x - q[0], dy = y - q[1], c = Math.cos(q[2]), s = Math.sin(q[2]); return Math.abs(dx * c + dy * s) <= T / 2 + pad && Math.abs(-dx * s + dy * c) <= T / 2 + pad; };
  const stoneAt = (p) => { const x = p.x + H_.cam, y = p.y; for (let i = H_.stones.length - 1; i >= 0; i--) for (const q of squares(H_.stones[i])) if (inSquare(q, x, y, 2)) return H_.stones[i]; return null; };
  function lift(S, move) {
    const s = S && H_.stones.includes(S) && siteOf(S); if (!s) return;
    const px = S.body.getPosition().x * T, pa = Math.round(S.body.getAngle() / (PI / 2)) * (PI / 2);
    H_.world.destroyBody(S.body); H_.stones.splice(H_.stones.indexOf(S), 1); H_.sel = null;
    loosen(s);
    const st = { shape: S.shape, dom: S.dom }; data().store.unshift(st);
    if (move) takeUp(st, s, px, ((pa % TAU) + TAU) % TAU); else Sound.fx.pickup && Sound.fx.pickup();
    keep();
  }
  function loosen(s) {
    for (const O of H_.stones) if (siteOf(O) === s) { if (O.body.getType() !== "dynamic") O.body.setType("dynamic"); O.body.setAwake(true); O.still = 0; }
    if (siteData(s).done) H_.recheck.add(s.id);
  }
  // A built place, its stones loosed: once they are still, does it still stand to its line?
  // He says when it is done (once it has the stones it needs, all at rest): its stones made one
  // building, in the shape he laid them, of one colour. Then it can be added to, three times, each
  // time for the stones it cost to build.
  const ready = (s) => { const on = H_.stones.filter((O) => siteOf(O) === s); return on.length >= s.need && on.every((O) => O.still > 0.8); };
  function finish(s) {
    const SD = siteData(s); if (SD.done || !ready(s)) return;
    for (const O of H_.stones) if (siteOf(O) === s) O.body.setType("static");
    SD.done = true; SD.level = 0; keep();
    H_.built = { s, t: 0 }; Sound.fx.kindle && Sound.fx.kindle(1, 0); Sound.fx.unlock && Sound.fx.unlock();
  }
  function addTo(s) {
    const SD = siteData(s), D = data(); if (!SD.done || (SD.level || 0) >= 3 || D.store.length < s.need) return;
    D.store.splice(0, s.need); SD.level = (SD.level || 0) + 1; store();
    H_.say = { text: s.name + " ADDED TO", sub: ["", "A door, and its windows lit.", "Bands of stone, buttresses, and the cross.", "A bell tower, and its lamp."][SD.level], t: 0 };
    Sound.fx.kindle && Sound.fx.kindle(1, 0);
  }
  function recheck(ids, said) {
    const hurt = [];
    for (const s of SITES) {
      if (!ids.has(s.id)) continue;
      const SD = siteData(s), on = H_.stones.filter((O) => siteOf(O) === s), top = on.length ? Math.min(...on.flatMap((O) => squares(O).map((q) => q[1] - T / 2))) : GY;
      if (SD.done && on.length >= s.need && top <= GY - FH - s.h * T + T * 0.5) for (const O of on) O.body.setType("static");
      else if (SD.done) { SD.done = false; hurt.push(s); }
    }
    if (hurt.length) H_.say = { text: hurt.map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i).join(" AND ") + (hurt.length > 1 && hurt[0].name !== hurt[1].name ? " ARE" : " IS") + " " + said, sub: "Lay stones on it again, to the line, to mend it.", t: 0 };
    ids.clear(); keep();
  }

  // ---- Each step ----
  function step(dt) {
    H_.t += dt;
    if (H_.inside) { H_.inside.t += dt; const I = INSIDE[H_.inside.kind]; if (I.step) I.step(H_.inside, dt); return; }
    if (H_.say) { H_.say.t += dt; if (H_.say.t > 3.2) H_.say = null; }
    if (H_.built) { H_.built.t += dt; if (H_.built.t > 2.6) H_.built = null; }
    // He walks (not while a stone is in his hands: then the arrows move it).
    const k = H_.keys, l = k.ArrowLeft || k.KeyA || H_.pad < 0, r = k.ArrowRight || k.KeyD || H_.pad > 0;
    let vx = 0;
    if (H_.goal !== null && H_.goal !== undefined) { const d = H_.goal - H_.x; if (Math.abs(d) < 3) H_.goal = null; else vx = Math.sign(d) * 70; }
    if (!H_.hold) { if (l) { vx = -70; H_.goal = null; } if (r) { vx = 70; H_.goal = null; } }
    if (vx) { H_.dir = Math.sign(vx); H_.x = clamp(H_.x + vx * dt, 40, HW - 40); H_.walkU = (H_.walkU + Math.abs(vx) * dt / 58) % 1; }
    H_.walking = !!vx;
    H_.world.step(Math.min(dt, 1 / 30), 10, 8);
    // Stones come to rest; one off its place (fallen to the ground) goes back into the store.
    const D = data();
    let stillN = 0;
    for (const O of H_.stones.slice()) {
      const v = O.body.getLinearVelocity(), calm = Math.hypot(v.x, v.y) < 0.05 && Math.abs(O.body.getAngularVelocity()) < 0.05;
      O.still = calm || !O.body.isAwake() ? O.still + dt : 0;
      const s = siteOf(O), low = O.body.getPosition().y * T > GY - FH + 4;
      if ((!s || low) && O.still > 0.8) {
        H_.world.destroyBody(O.body); H_.stones.splice(H_.stones.indexOf(O), 1); D.store.push({ shape: O.shape, dom: O.dom });
        H_.say = { text: "THE STONE FELL OFF", sub: "It is back in your store. Lay it again.", t: 0 };
        keep();
      } else if (O.still > 0.6 && !O.kept) { O.kept = true; keep(); }
      if (!calm) O.kept = false;
      if (O.still > 0.3) stillN++;
    }
    H_.stillN = stillN;     // (the shadow of the stone in his hands is found again when something has moved)
    if (H_.sel && !H_.stones.includes(H_.sel)) H_.sel = null;
    if (H_.recheck.size && [...H_.recheck].every((id) => H_.stones.every((O) => O.still > 0.8 || (siteOf(O) || {}).id !== id))) recheck(H_.recheck, "NO LONGER WHOLE");
    stepClock(dt);
    stepFolk(dt);
    if (H_.press && (H_.press.t += dt) >= HOLD_T) openMenu(H_.press);
    if (H_.dust && H_.dust.length) { for (const d of H_.dust) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; } H_.dust = H_.dust.filter((d) => d.t < 0.8); }
    // The camera: on him; on the stone, while he holds one.
    const fx = H_.hold ? H_.hold.x : H_.x;
    H_.cam += (clamp(fx - W / 2, 0, HW - W) - H_.cam) * Math.min(1, dt * 4);
  }

  // ---- The people ----
  // Those freed from the idols on the mountains come down and wait by a fire at the gate, in the dark
  // robes they worshipped in. He goes to them and receives them ("Let all guests who arrive be received
  // as Christ": the Rule, chapter 53), and they put on the habit of lay brothers, and walk about the
  // grounds. (Work for them comes later.)
  const CAMP = GATE - 130, FOLK_V = 55;
  function folkData() { const D = data(); D.people = D.people || []; D.nextId = D.nextId || 1; return D; }
  // Those come down since he was last here (and, the first time, three who found their way down before him).
  function takePilgrims() {
    const D = folkData(); let n = 0;
    const add = (dom, kind) => { D.people.push({ id: D.nextId++, dom: SINS[dom] ? dom : "gluttony", kind: (kind | 0) % 4, role: "camp" }); n++; };
    for (const q of save.pilgrims || []) if (Array.isArray(q)) add(q[0], q[1]);
    save.pilgrims = []; store();
    return n;
  }
  function makeFolk(p, i) {
    const f = { p, x: GATE, dir: 1, u: Math.random(), goal: null, t: Math.random() * 3, st: "idle", ph: Math.random() * TAU };
    if (p.role === "camp") f.x = CAMP + (i % 2 ? 1 : -1) * (18 + (i % 5) * 9);
    else f.x = clamp(GATE + (Math.random() - 0.5) * 900, 60, HW - 60);
    return f;
  }
  function loadFolk() { const D = folkData(); H_.folk = D.people.map(makeFolk); }
  // (One at a time, and a stone from the store for each: what it costs to keep a brother.)
  function receive() {
    const D = folkData(), f = H_.folk.find((q) => q.p.role === "camp"); if (!f || !D.store.length) return;
    D.store.shift(); f.p.role = "brother"; f.p.name = newName(D); f.goal = GATE + (Math.random() - 0.5) * 260; f.recv = 1;
    store(); Sound.fx.kindle && Sound.fx.kindle(0.6, 0);
    H_.say = { text: "BROTHER " + f.p.name.toUpperCase() + " RECEIVED", sub: "“Let all guests who arrive be received as Christ.”  The Rule, chapter 53", t: 0 };
  }
  function stepFolk(dt) {
    for (const f of H_.folk) {
      const p = f.p; f.t += dt; f.ph += dt; if (f.recv) f.recv = Math.max(0, f.recv - dt * 0.8);
      if (p.role === "camp") { f.goal = null; f.st = "idle"; continue; }
      // (About the grounds: a little way at a time, and a while standing between.)
      if ((f.goal === null || f.goal === undefined) && f.t > 3) { f.t = Math.random() * 3; f.goal = clamp(f.x + (Math.random() - 0.5) * 360, 60, HW - 60); }
      f.st = "idle";
      if (f.goal !== null && f.goal !== undefined) {
        const d = f.goal - f.x;
        if (Math.abs(d) < 3) { f.x = f.goal; f.goal = null; }
        else { f.dir = Math.sign(d); f.x += f.dir * Math.min(Math.abs(d), FOLK_V * dt); f.u = (f.u + dt * 1.4) % 1; f.st = "walk"; }
      }
    }
  }
  // A lay brother (or one still in the robe he worshipped in): hooded, small beside him; what he carries in his hand.
  function drawPerson(f, cam) {
    const x = f.x - cam; if (x < -30 || x > W + 30) return;
    const p = f.p, k = 1.45, camp = p.role === "camp", robe = camp ? "#141118" : "#3e3024";
    const walk = f.st === "walk", s = walk ? Math.sin(f.u * TAU) : 0, b = walk ? Math.abs(Math.cos(f.u * TAU)) * 1.2 : 0;
    ctx.save(); ctx.translate(x, GY); ctx.scale(f.dir * k, k);
    const bob = camp ? 0 : -b, sit = camp;
    ctx.fillStyle = robe; ctx.beginPath();
    if (sit) { ctx.moveTo(-7, 0); ctx.lineTo(8, 0); ctx.lineTo(7, -4); ctx.lineTo(4, -12); ctx.lineTo(1, -15); ctx.lineTo(-3, -15); ctx.lineTo(-6, -9); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(2.5 + 0.6 * Math.sin(f.ph * 0.7), -17.5, 3, 3.3, 0, 0, TAU); ctx.fill(); }
    else {
      // legs, then the habit to the shins, the hood, an arm
      ctx.fillRect(-2 + 4 * s, -4, 2, 4); ctx.fillRect(-1 - 4 * s, -4, 2, 4);
      ctx.moveTo(-5, -3 + bob); ctx.lineTo(5, -3 + bob); ctx.lineTo(4.5, -13 + bob); ctx.lineTo(4, -20 + bob); ctx.lineTo(2, -23 + bob); ctx.lineTo(-3, -23 + bob); ctx.lineTo(-5, -18 + bob); ctx.lineTo(-5.5, -10 + bob); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.8, -25.5 + bob, 3.1, 3.4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -28 + bob); ctx.lineTo(-5.5, -22 + bob); ctx.lineTo(-1, -24 + bob); ctx.fill();
      // his hand
      const hy = -13 + bob;
      ctx.fillStyle = robe; ctx.fillRect(1, hy - 4, 4.5, 3);
    }
    ctx.restore();
    if (f.recv) glow(x, GY - 20, 26, "#fff1c4", 0.5 * f.recv);
  }
  function drawCamp(cam, t) {
    // The fire by the gate, where those come down wait.
    const cx = CAMP - cam;
    if (cx > -60 && cx < W + 60) {
      rect(cx - 9, GY - 3, 18, 3, "#2a1d14"); poly([cx - 8, GY - 1, cx + 6, GY - 5, cx + 8, GY - 3, cx - 6, GY + 1], "#3a2818");
      drawFlame(cx, GY - 6, 0.7, t, {}); glow(cx, GY - 10, 60, C.flame, 0.35 + 0.05 * Math.sin(t * 9));
    }
  }
  // The sign and the button by the fire.
  function folkSigns(cam) {
    const campers = H_.folk.filter((f) => f.p.role === "camp").length;
    if (Math.abs(H_.x - CAMP) < 70) {
      const sx = CAMP - cam;
      text("BY THE FIRE", sx, GY - 74, { align: "center", font: FONT.title, size: 11, weight: 700, spacing: 3, color: "#fff3dc", glow: "rgba(0,0,0,0.9)", blur: 6 });
      text(campers ? campers + (campers === 1 ? " freed from the idols waits" : " freed from the idols wait") + " to be received" : "No one waits here now", sx, GY - 62, { align: "center", size: 8, weight: 600, color: "#e9e6df", glow: "rgba(0,0,0,0.9)", blur: 4 });
      if (campers) { const has = data().store.length > 0; button("RECEIVE ONE", clamp(sx - 60, 8, W - 128), H - 50, 120, 36, receive, { hot: has, off: !has, sub: has ? "A stone from your store" : "No stone in your store" }); }
      return true;
    }
    return false;
  }

  // ---- Days and nights ----
  // As in Kingdom: while he is at the monastery the day goes by, and night falls, and dawn comes
  // again; in peace. (Indoors, in the library or the choir, the hours stand still.)
  const DAY_LEN = 100, NIGHT_LEN = 55;
  function stepClock(dt) {
    const C = H_.clock; C.t += dt;
    if (C.phase === "day" && C.t >= DAY_LEN) { H_.clock = { phase: "night", t: 0 }; H_.say = { text: "NIGHT FALLS", sub: "The brothers keep the fire at the gate.", t: 0 }; Sound.ambience({ wind: 0.45 }); }
    else if (C.phase === "night" && C.t >= NIGHT_LEN) { const D = data(); D.nights = (D.nights || 0) + 1; H_.clock = { phase: "day", t: 0 }; keep(); Sound.ambience({ wind: 0.25 }); }
  }
  // How dark it is: falling over the first seconds of the night, lifting over its last.
  const nightK = () => { const C = H_.clock; return C && C.phase === "night" ? clamp(C.t / 4, 0, 1) * clamp((NIGHT_LEN - C.t) / 6, 0, 1) : 0; };

  // ---- Drawn ----
  const stoneFill = (dom) => mix(SINS[dom] ? SINS[dom].color : "#888888", "#6e665c", 0.55);
  function drawSquares(sq, dom, cam) {
    for (const [x, y, a] of sq) {
      ctx.save(); ctx.translate(x - cam, y); ctx.rotate(a);
      rect(-T / 2, -T / 2, T, T, "#1b181e"); rect(-T / 2 + 1, -T / 2 + 1, T - 2, T - 2, stoneFill(dom));
      rect(-T / 2 + 1, -T / 2 + 1, T - 2, 2, "rgba(255,240,215,0.28)"); rect(-T / 2 + 1, T / 2 - 3, T - 2, 2, "rgba(0,0,0,0.22)");
      ctx.restore();
    }
  }
  const drawStone = (S, cam) => drawSquares(squares(S), S.dom, cam);
  function outline(sq, cam, color, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; if (dash) ctx.setLineDash(dash);
    for (const [x, y, a] of sq) { ctx.save(); ctx.translate(x - cam, y); ctx.rotate(a); ctx.strokeRect(-T / 2 + 0.75, -T / 2 + 0.75, T - 1.5, T - 1.5); ctx.restore(); }
    ctx.restore();
  }
  function drawBuilt(s, cam) {
    const sq = H_.stones.filter((O) => siteOf(O) === s).flatMap(squares); if (!sq.length) return;
    const SD = siteData(s), lv = SD.level || 0, ink = "#0d0b10", col = s.kind === "choir" ? "#6e6676" : "#76695a", t = H_.t;
    // One shape: each square drawn a little larger in the edge's dark, then in the stone's colour.
    const each = (pad, fill) => { for (const [x, y, a] of sq) { ctx.save(); ctx.translate(x - cam, y); ctx.rotate(a); rect(-T / 2 - pad, -T / 2 - pad, T + 2 * pad, T + 2 * pad, fill); ctx.restore(); } };
    each(1.6, "#141016"); each(0.4, col);
    const xs = sq.map((q) => q[0] - cam), ys = sq.map((q) => q[1]), x0 = Math.min(...xs) - T / 2, x1 = Math.max(...xs) + T / 2, top = Math.min(...ys) - T / 2, base = GY - FH, mx = (x0 + x1) / 2, hgt = base - top;
    const peak = sq.reduce((p, q) => (q[1] < p[1] ? q : p)), px = peak[0] - cam;
    // (What is added is drawn only within the shape.)
    const clip = () => { ctx.save(); ctx.beginPath(); for (const [x, y, a] of sq) { const c = Math.cos(a), sn = Math.sin(a), h = T / 2 + 0.4; const P = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([u, v]) => [x - cam + u * c - v * sn, y + u * sn + v * c]); ctx.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); } ctx.clip(); };
    if (lv >= 2) {
      // Bands of stone across it, and buttresses at its foot either side.
      clip(); for (let y = base - T * 1.5; y > top + 4; y -= T * 2) rect(x0, y, x1 - x0, 3, "rgba(30,24,20,0.45)"); for (let x = x0 + T; x < x1; x += T) rect(x, top, 1, hgt, "rgba(255,240,215,0.06)"); ctx.restore();
      poly([x0 - 10, base, x0, base, x0, base - Math.min(hgt * 0.6, 3 * T), x0 - 4, base - Math.min(hgt * 0.6, 3 * T) + 6], "#141016");
      poly([x1 + 10, base, x1, base, x1, base - Math.min(hgt * 0.6, 3 * T), x1 + 4, base - Math.min(hgt * 0.6, 3 * T) + 6], "#141016");
    }
    if (lv >= 3) {
      // A bell tower on its highest point, and its lamp.
      const tw = T * 1.6, th = T * 3.2, ty = top - th;
      rect(px - tw / 2 - 1.5, ty - 1.5, tw + 3, th + 3, "#141016"); rect(px - tw / 2, ty, tw, th + 2, col);
      poly([px - tw / 2 - 4, ty, px, ty - T * 1.6, px + tw / 2 + 4, ty], ink);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(px - 5, ty + T * 1.6); ctx.lineTo(px - 5, ty + 9); ctx.arc(px, ty + 9, 5, PI, 0); ctx.lineTo(px + 5, ty + T * 1.6); ctx.closePath(); ctx.fill();
      const bl = 0.7 + 0.3 * Math.sin(t * 2.3); glow(px, ty + 14, 22, C.flame, 0.4 * bl); circle(px, ty + 15, 2.4, "rgba(255,210,140," + bl.toFixed(3) + ")");
    }
    if (lv >= 2) { const cy = (lv >= 3 ? top - T * 3.2 - T * 1.6 : top) - 2; rect(px - 1, cy - 14, 2, 14, ink); rect(px - 5, cy - 10, 10, 2, ink); }
    if (lv >= 1) {
      // A door at its foot, and windows lit within.
      clip();
      const dw = Math.min(10, (x1 - x0) / 5), dh = Math.min(26, hgt * 0.7);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(mx - dw, base); ctx.lineTo(mx - dw, base - dh + dw); ctx.arc(mx, base - dh + dw, dw, PI, 0); ctx.lineTo(mx + dw, base); ctx.closePath(); ctx.fill();
      const lamp = 0.65 + 0.35 * Math.sin(t * 1.7 + s.x);
      for (const [wx, wy] of [[x0 + (x1 - x0) * 0.22, top + hgt * 0.35], [x1 - (x1 - x0) * 0.22, top + hgt * 0.35]]) if (hgt > 50) { ctx.beginPath(); ctx.moveTo(wx - 3, wy + 12); ctx.lineTo(wx - 3, wy + 3); ctx.arc(wx, wy + 3, 3, PI, 0); ctx.lineTo(wx + 3, wy + 12); ctx.closePath(); ctx.fillStyle = "rgba(255,196,120," + (0.8 * lamp).toFixed(3) + ")"; ctx.fill(); }
      if (lv >= 3 && hgt > 70) { ctx.beginPath(); ctx.arc(mx, top + hgt * 0.32, 7, 0, TAU); ctx.fillStyle = "rgba(255,196,120," + (0.7 * lamp).toFixed(3) + ")"; ctx.fill(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; line(mx, top + hgt * 0.32, mx + Math.cos(a) * 7, top + hgt * 0.32 + Math.sin(a) * 7, ink, 1); } }
      ctx.restore();
      for (const wx of [x0 + (x1 - x0) * 0.22, x1 - (x1 - x0) * 0.22]) if (hgt > 50) glow(wx, top + hgt * 0.35 + 7, 16, C.flame, 0.22 * lamp);
    }
  }
  function draw() {
    if (H_.inside) { INSIDE[H_.inside.kind].draw(H_.inside); if (H_.inside.t < 0.5) rect(0, 0, W, H, "rgba(0,0,0," + (1 - H_.inside.t / 0.5) + ")"); return; }
    const cam = H_.cam, t = H_.t;
    // Dusk over the mountains; the ground; the gate in the middle, where he was set down.
    const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, "#1b1f3a"); g.addColorStop(0.55, "#5a4a64"); g.addColorStop(0.9, "#c08870"); g.addColorStop(1, "#e8b88a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY + 2);
    // (By day the sky clears to a pale morning; toward nightfall it goes to the gold of the evening.)
    const CK = H_.clock || { phase: "day", t: 0 }, dayK = CK.phase === "day" ? clamp(CK.t / 6, 0, 1) * clamp((DAY_LEN - 12 - CK.t) / 14, 0, 1) : 0;
    if (dayK > 0) { const gd = ctx.createLinearGradient(0, 0, 0, GY); gd.addColorStop(0, "#4d6a92"); gd.addColorStop(0.6, "#9fb0c2"); gd.addColorStop(1, "#e6dcc4"); ctx.save(); ctx.globalAlpha = dayK; ctx.fillStyle = gd; ctx.fillRect(0, 0, W, GY + 2); ctx.restore(); }
    glow(W * 0.7 - cam * 0.03, GY - 10 - 90 * dayK, 140, "#ffd9a0", 0.35);
    Climb.DOMAINS.forEach((d, i) => { const cx = ((i * 260 + 120 - cam * 0.25) % (W + 300) + W + 300) % (W + 300) - 150, h = 110 + 40 * Math.sin(i * 1.9 + 1); poly([cx - 150, GY + 2, cx - 30, GY - h * 0.7, cx, GY - h, cx + 40, GY - h * 0.75, cx + 150, GY + 2], i % 2 ? "#3e3a50" : "#463f55"); });
    // (Night: the sky gone dark, and the stars.)
    const night = nightK();
    if (night > 0) {
      rect(0, 0, W, GY + 2, "rgba(8,5,16," + (0.7 * night).toFixed(3) + ")");
      for (let k = 0; k < 40; k++) { const sx = (k * 97.3 + 13) % W, sy = (k * 53.7) % (GY * 0.6); rect(sx, sy, 1, 1, "rgba(255,255,255," + (0.5 * night * (0.5 + 0.5 * Math.sin(t * 2 + k))).toFixed(3) + ")"); }
    }
    rect(0, GY, W, H - GY, "#0d0b10");
    const ink = "#0d0b10", gx = GATE - cam;
    rect(gx - 34, GY - 52, 10, 52, ink); rect(gx + 24, GY - 52, 10, 52, ink); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(gx, GY - 52, 34, PI, 0); ctx.lineTo(gx + 24, GY - 52); ctx.arc(gx, GY - 52, 24, 0, PI, true); ctx.closePath(); ctx.fill();
    rect(gx - 1, GY - 98, 2, 14, ink); rect(gx - 5, GY - 94, 10, 2, ink);
    // The places: the foundation, the line the stones must reach, and (built) the building.
    const near = nearSite();
    for (const s of placed()) {
      const SD = siteData(s), x0 = s.x - s.w * T / 2 - cam, w = s.w * T, top = GY - FH - s.h * T;
      if (x0 > W + 60 || x0 + w < -60) continue;
      rect(x0 - 4, GY - FH, w + 8, FH, "#3a3540");
      if (!SD.done) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,226,170," + (near === s ? 0.75 : 0.35) + ")"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, s.h * T); ctx.restore();
        { ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = "rgba(255,226,170,0.22)"; ctx.beginPath(); ctx.moveTo(x0 - 10, top); ctx.lineTo(x0 + w / 2, top - (s.kind === "choir" ? 40 : 30)); ctx.lineTo(x0 + w + 10, top); ctx.stroke(); ctx.restore(); }
      }
    }
    for (const S of H_.stones) { const s = siteOf(S); if (!(s && siteData(s).done)) drawStone(S, cam); }
    for (const s of SITES) if (siteData(s).done) drawBuilt(s, cam);
    drawCamp(cam, t);
    for (const f of H_.folk || []) drawPerson(f, cam);
    // The stone he has chosen, ringed; the stone in his hands, hanging, and its shadow where it will rest.
    if (H_.sel) { const sq = squares(H_.sel); for (const q of sq) glow(q[0] - cam, q[1], 18, "#ffe2aa", 0.25); outline(sq, cam, "rgba(255,240,200," + (0.75 + 0.25 * Math.sin(t * 6)).toFixed(3) + ")"); drawSquares(sq, H_.sel.dom, cam); outline(sq, cam, "rgba(255,240,200," + (0.75 + 0.25 * Math.sin(t * 6)).toFixed(3) + ")"); }
    if (H_.hold) {
      const h = H_.hold, ly = landing(h);
      if (ly !== null && ly !== undefined) {
        const sh = holdSquares(h, ly);
        ctx.save(); ctx.globalAlpha = 0.28; drawSquares(sh, h.dom, cam); ctx.restore();
        outline(sh, cam, "rgba(255,226,170,0.8)", [3, 3]);
        const xs = holdSquares(h).map((q) => q[0]), xa = Math.min(...xs) - T / 2 - cam, xb = Math.max(...xs) + T / 2 - cam;
        ctx.save(); ctx.strokeStyle = "rgba(255,226,170,0.25)"; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(xa, h.y); ctx.lineTo(xa, ly); ctx.moveTo(xb, h.y); ctx.lineTo(xb, ly); ctx.stroke(); ctx.restore();
      }
      glow(h.x - cam, h.y, 40, "#ffe2aa", 0.15);
      drawSquares(holdSquares(h), h.dom, cam);
    }
    for (const d of H_.dust || []) { const a = clamp(1 - d.t / 0.8, 0, 1); if (d.spark) { glow(d.x - cam, d.y, 6, d.spark, 0.5 * a); rect(d.x - cam - 1, d.y - 1, 2, 2, d.spark); } else rect(d.x - cam - 1.5, d.y - 1.5, 3, 3, "rgba(150,138,124," + (0.8 * a).toFixed(3) + ")"); }
    // He.
    const p = H_.walking ? MONK_ANIM.walk(H_.walkU) : MONK_ANIM.idle((t * 0.4) % 1, t);
    const r = drawMonk(H_.x - cam, GY, H_.dir, p, { t });
    if (r && r.torch) { drawFlame(r.torch[0], r.torch[1], 0.9, t, {}); glow(r.torch[0], r.torch[1], 40, C.flame, 0.3); }
    // The sign over the place he stands at.
    const signed = !H_.hold && !H_.sel && folkSigns(cam);
    if (near && !signed && !H_.hold && !H_.sel) {
      const SD = siteData(near), mine = H_.stones.filter((O) => siteOf(O) === near), on = mine.length, sx = near.x - cam;
      // (Over whatever stands there: the line marked, or what he has built, and its tower.)
      const built = mine.length ? Math.min(...mine.flatMap(squares).map((q) => q[1])) - T / 2 - ((SD.level || 0) >= 3 ? T * 4.8 : (SD.level || 0) >= 2 ? 16 : 0) : GY;
      const sy = Math.max(30, Math.min(GY - FH - near.h * T, built) - 30);
      text(near.name, sx, sy, { align: "center", font: FONT.title, size: 11, weight: 700, spacing: 3, color: "#fff3dc", glow: "rgba(0,0,0,0.9)", blur: 6 });
      text(SD.done ? ((SD.level || 0) >= 3 ? "Built, and finished" : "Built  \u00b7  added to " + (SD.level || 0) + " of 3 times") : on + " of at least " + near.need + " stones", sx, sy + 12, { align: "center", size: 8, weight: 600, color: SD.done ? "#ffd9a0" : "#e9e6df", glow: "rgba(0,0,0,0.9)", blur: 4 });
      if (SD.done && INSIDE[near.kind]) button("GO IN", clamp(sx - 60, 8, W - 128), H - 50, 120, 36, () => goIn(near.kind), { hot: true, sub: INSIDE[near.kind].sub() });
      if (SD.done && (SD.level || 0) < 3) { const has = data().store.length >= near.need; button("ADD TO IT", clamp(sx + 68, 8, W - 128), H - 50, 120, 36, () => addTo(near), { hot: has, off: !has, sub: near.need + " stones  \u00b7  " + data().store.length + " in store" }); }
      if (!SD.done) {
        if (ready(near)) button("FINISH IT", clamp(sx + 68, 8, W - 128), H - 50, 120, 36, () => finish(near), { hot: true, sub: "Or lay more first" });
        if (data().store.length) button("LAY A STONE", clamp(sx - 60, 8, W - 128), H - 50, 120, 36, () => lay(near), { hot: true, sub: data().store.length + " in your store" });
        else text("No stones in your store: bring blocks to the carts on the mountains, and win its summit.", W / 2, H - 30, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, max: W - 40 });
      }
    }
    // A stone in his hands: how to lay it. A stone chosen: what to do with it.
    if (H_.hold) {
      const keys = usingKeys(), ok = landing(H_.hold) !== null;
      text(keys ? "\u2190 \u2192 move it  \u00b7  \u2191 or click: turn it  \u00b7  \u2193 or space: set it down  \u00b7  Q E: another stone" : "Drag to move it  \u00b7  tap to turn it  \u00b7  \u25c0 \u25b6: another stone", W / 2, H - 62, { align: "center", size: 8.5, weight: 600, color: "#e9e6df", glow: "rgba(0,0,0,0.9)", blur: 4, max: W - 330 });
      button("SET IT DOWN", W - 132, H - 50, 120, 38, () => place(), { hot: ok, off: !ok });
      button("BACK TO THE STORE", W - 262, H - 50, 122, 38, () => putBack(), { size: 8 });
      if (data().store.length > 1) {
        // (Another stone instead: the arrows either side of it.)
        button("\u25c0", 104, H - 50, 34, 38, () => otherStone(-1), {}); button("\u25b6", 196, H - 50, 34, 38, () => otherStone(1), {});
        text("STONE", 167, H - 40, { align: "center", size: 7, weight: 800, spacing: 1.5, color: "rgba(233,230,223,0.7)" });
        for (const [cx, cy] of SHAPES[H_.hold.shape]) { const qx = 167 + cx * 6 - 3, qy = H - 28 + cy * 6 - 3; rect(qx, qy, 6, 6, "#1b181e"); rect(qx + 0.5, qy + 0.5, 5, 5, stoneFill(H_.hold.dom)); }
      }
    } else if (H_.sel) {
      text("This stone: take it up into your store, or move it somewhere else.", W / 2, 134, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, glow: "rgba(0,0,0,0.9)", blur: 4, max: W - 40 });
      button("TAKE IT UP", W / 2 - 128, H - 50, 120, 38, () => lift(H_.sel, false), { hot: true, sub: "Into your store" });
      button("MOVE IT", W / 2 + 8, H - 50, 120, 38, () => lift(H_.sel, true), { sub: "Lay it again" });
    }
    // What he has: the stones in his store, in their colours.
    const D = data();
    text("THE MONASTERY", 18, 30, { font: FONT.title, size: 16, weight: 700, spacing: 4, color: "#fff" });
    text("STONES IN YOUR STORE: " + D.store.length, 18, 46, { size: 8, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.75)" });
    D.store.slice(0, 16).forEach((st, i) => rect(18 + i * 9, 52, 7, 7, stoneFill(st.dom)));
    { const P = folkData().people, n = (r) => P.filter((q) => q.role === r).length, nb = P.length - n("camp");
      if (P.length) text("BROTHERS: " + nb + (n("camp") ? "  \u00b7  WAITING BY THE FIRE: " + n("camp") : ""), 18, 72, { size: 7.5, weight: 700, spacing: 1.2, color: "rgba(233,230,223,0.6)", max: W * 0.6 }); }
    if (H_.clock && H_.clock.phase === "day") {
      const k = clamp(H_.clock.t / DAY_LEN, 0, 1), late = H_.clock.t > DAY_LEN - 15;
      text("DAY " + ((D.nights || 0) + 1), W - 60, 26, { align: "right", size: 8, weight: 800, spacing: 2, color: late ? "#ffcf8a" : "rgba(255,241,196,0.85)" });
      rect(W - 160, 32, 100, 3, "rgba(255,255,255,0.15)"); rect(W - 160, 32, 100 * k, 3, late ? "#ff9a5a" : "#ffe9b0");
      text(late ? "NIGHT IS FALLING" : "UNTIL NIGHTFALL", W - 60, 46, { align: "right", size: 7, weight: 700, spacing: 1.5, color: late ? "#ffb070" : "rgba(255,217,160,0.6)" });
    }
    if (H_.clock && H_.clock.phase === "night") {
      text("NIGHT", W - 60, 26, { align: "right", size: 8, weight: 800, spacing: 2, color: "rgba(220,215,240,0.85)" });
      rect(W - 160, 32, 100, 3, "rgba(255,255,255,0.15)"); rect(W - 160, 32, 100 * clamp(H_.clock.t / NIGHT_LEN, 0, 1), 3, "#c9c4e8");
      text("UNTIL DAWN", W - 60, 46, { align: "right", size: 7, weight: 700, spacing: 1.5, color: "rgba(200,196,232,0.6)" });
    }
    if (H_.built) {
      const a = clamp(H_.built.t / 0.3, 0, 1) * clamp((2.6 - H_.built.t) / 0.5, 0, 1);
      text(H_.built.s.name + " IS BUILT", W / 2, 98, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 4, color: "#fff1c4", alpha: a, glow: "rgba(255,170,70,0.8)", blur: 12, max: W - 30 });
    } else if (H_.say) {
      const a = clamp(H_.say.t / 0.3, 0, 1) * clamp((3.2 - H_.say.t) / 0.6, 0, 1);
      text(H_.say.text, W / 2, 98, { align: "center", font: FONT.title, size: 14, weight: 700, spacing: 3, color: "#fff3dc", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 30 });
      text(H_.say.sub, W / 2, 114, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, alpha: a, max: W - 30 });
    }
    if (D.gift && H_.t < 6) text("The lay brothers had put stones by for you, to begin with.", W / 2, 132, { align: "center", font: FONT.line, italic: true, size: 12, color: "#efe9dc", alpha: clamp((6 - H_.t) / 1, 0, 1), max: W - 30 });
    drawMenu(cam);
    if (H_.moving) text("Tap where " + H_.moving.name + " should stand.", W / 2, 150, { align: "center", font: FONT.line, italic: true, size: 13, color: "#fff3dc", glow: "rgba(0,0,0,0.9)", blur: 4, max: W - 40 });
    else if (!H_.menu && !H_.hold && !H_.sel && !H_.inside && !nearSite() && Math.abs(H_.x - CAMP) > 70 && SITES.some((s) => s.x === null)) text("Hold on the ground to choose where to build.", W / 2, H - 14, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, alpha: 0.85, glow: "rgba(0,0,0,0.9)", blur: 4 });
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
    const i = I.book, h = hourOf(i), x0 = 20, y0 = 14, w = W - 40, hh = H - 70, mid = x0 + w / 2;
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
  // ---- The choir ----
  // The souls freed at the summits (one for each summit won) stand in the stalls, in the order they
  // came, and sing the verses read on the mountains: the sections of the psalm for an Hour, as the
  // library sets them out, each verse to a plain psalm tone in two halves (the first rising from
  // its intonation and resting at the middle, the second falling to the close), and after each book
  // that is whole, the Gloria Patri.
  const freed = () => { let n = 0; for (const d in (save.climbs || {})) n += save.climbs[d] || 0; return n; };
  const GLORIA = [["Glory be to the Father, and to the Son,", "and to the Holy Ghost."], ["As it was in the beginning, is now,", "and ever shall be, world without end. Amen."]];
  const VOW = { a: "a", e: "e", i: "i", o: "o", u: "u", y: "i" };
  // A word's syllables, as their vowels (near enough: a silent e, and -ed that is not said, left out).
  function sylls(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    let g = w.match(/[aeiouy]+/g) || ["a"];
    if (g.length > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) g = g.slice(0, -1);
    else if (g.length > 1 && /[^aeiouytd]ed$/.test(w)) g = g.slice(0, -1);
    return g.map((s) => VOW[s[0]] || "a");
  }
  // One verse to the tone: its notes ({ at, m, d, v, w }: when from the verse's start, the note,
  // how long, the vowel, which word), how long it takes, and its words.
  function tone(halves, first) {
    const notes = [], words = []; let at = 0;
    halves.forEach((half, h) => {
      const S = [], end = h === halves.length - 1;
      for (const w of half.split(/\s+/).filter(Boolean)) { for (const v of sylls(w)) S.push({ v, w: words.length }); words.push(w); }
      if (!end) words.push("*");
      const n = S.length;
      S.forEach((s, j) => {
        let m = 60, d = 0.24;                                   // on the reciting note
        if (h === 0 && first && j < 2 && n > 5) m = j ? 57 : 55; // the intonation, up to it
        const k = n - j;
        if (k <= 2 && n >= 3) { m = end ? (k === 2 ? 57 : 55) : (k === 2 ? 62 : 60); d = k === 1 ? (end ? 0.95 : 0.6) : 0.34; }
        notes.push({ at, m, d, v: s.v, w: s.w }); at += d;
      });
      if (!end) at += 0.35;
    });
    return { notes, len: at, words };
  }
  // What an Hour has to sing: the verses of its sections read so far, in order, and the Gloria after each book that is whole.
  function hourVerses(h) {
    const L = [];
    for (let i = h.from; i < h.from + h.n; i++) {
      let first = true;
      for (let k = 0; k < 8; k++) if (Verses.bits(i) & (1 << k)) { const v = Verses.verse(i, k); L.push({ halves: v[5], first, head: v[0] + "  " + v[1] + " · " + v[4] + ":" + v[2] }); first = false; }
      if (Verses.count(i) === 8) for (const g of GLORIA) L.push({ halves: g, first: false, head: "GLORIA PATRI" });
    }
    return L;
  }
  function sing(I) {
    const h = HOURS[I.hour], L = hourVerses(h); if (!L.length) return;
    const n = freed(), voices = (m) => (n === 0 ? [m] : n < 4 ? [m, m] : [m, m, m - 12]), vol = 0.22 + 0.035 * Math.min(n, 8);
    let t0 = Sound.now() + 0.4; const ev = [], vs = [];
    L.forEach((V, vi) => {
      const T = tone(V.halves, V.first); vs.push({ head: V.head, words: T.words, t0 });
      for (const q of T.notes) ev.push({ t: t0 + q.at, m: q.m, d: q.d, v: q.v, w: q.w, vi });
      t0 += T.len + (L[vi + 1] && L[vi + 1].first ? 1.6 : 0.7);
    });
    I.chant = { ev, vs, next: 0, end: t0, voices, vol, vi: 0, w: -1 };
    Sound.fx.tick && Sound.fx.tick(400, 0.2);
  }
  // A monk in his stall, from the waist up (the stall's front hides the rest): his cowl, his hood
  // over his head, his book held up before him, its page a little lit by the candles.
  let COWL = null;
  function chorister(x, y, dir, s, bob, lit) {
    if (!COWL) {
      COWL = new Path2D();
      COWL.moveTo(-11, 4); COWL.lineTo(-10, -22); COWL.quadraticCurveTo(-9, -34, -4, -40); COWL.quadraticCurveTo(2, -44, 6, -38);
      COWL.lineTo(8, -31); COWL.lineTo(6, -27); COWL.lineTo(10, -22); COWL.lineTo(15, -14); COWL.lineTo(13, -9); COWL.lineTo(10, 4); COWL.closePath();
    }
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(dir * s, s);
    // (The rim of the light from the altar, on the side toward it; then the black of the habit.)
    ctx.translate(1.4, -0.8); ctx.fillStyle = "rgba(255,210,150," + (0.45 + 0.3 * lit).toFixed(3) + ")"; ctx.fill(COWL);
    ctx.translate(-1.4, 0.8); ctx.fillStyle = "#0a0808"; ctx.fill(COWL);
    ctx.fillStyle = "rgba(255,206,140," + (0.35 + 0.4 * lit).toFixed(3) + ")"; ctx.fillRect(12, -20, 5, 6);
    ctx.restore();
  }
  function stallSeats() {
    // Twelve to a side, in two rows; filled in the order they came, a side each in turn, from the altar outward, front row first.
    const out = [], sideW = Math.min(W * 0.34, 250), step = sideW / 6.2;
    for (let row = 0; row < 2; row++) for (let j = 0; j < 6; j++) for (const side of [-1, 1]) {
      const x = W / 2 + side * (W * 0.16 + (j + 0.5) * step + (row ? step * 0.3 : 0)), y = row ? 236 : 262;
      out.push({ x, y, dir: -side, row });
    }
    return out;
  }
  function drawChoir(I) {
    const t = I.t, singing = !!I.chant, n = freed();
    rect(0, 0, W, H, "#0d0a09");
    // The apse: a tall window full of the day, its light falling across the floor; the altar under it.
    const wx = W / 2, wy0 = 34, wy1 = 168, ww = 34;
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.globalAlpha = 0.06 + 0.02 * k; ctx.fillStyle = "#ffe6b0"; ctx.beginPath(); ctx.moveTo(wx - ww / 2 + k * 6, wy1); ctx.lineTo(wx + ww / 2 - k * 6, wy1); ctx.lineTo(wx + 120 - k * 30, H); ctx.lineTo(wx - 120 + k * 30, H); ctx.closePath(); ctx.fill(); ctx.restore(); }
    const wg = ctx.createLinearGradient(0, wy0, 0, wy1); wg.addColorStop(0, "#fff6dc"); wg.addColorStop(1, "#f2c98a");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy1); ctx.lineTo(wx - ww / 2, wy0 + ww / 2); ctx.arc(wx, wy0 + ww / 2, ww / 2, PI, 0); ctx.lineTo(wx + ww / 2, wy1); ctx.closePath(); ctx.fill();
    rect(wx - 1, wy0 + 6, 2, wy1 - wy0 - 6, "#3a2a1a"); rect(wx - ww / 2, wy0 + 70, ww, 2, "#3a2a1a");
    glow(wx, (wy0 + wy1) / 2, 110, "#ffe0a0", 0.25 + (singing ? 0.08 : 0));
    // The walls' piers; the floor.
    for (const px of [W * 0.3, W * 0.7]) rect(px - 7, 20, 14, 230, "#120e0c");
    rect(0, 250, W, H - 250, "#16110e"); for (let k = 1; k < 6; k++) rect(0, 250 + k * k * 4, W, 1, "rgba(0,0,0,0.35)");
    rect(wx - 46, 196, 92, 40, "#0a0808"); rect(wx - 50, 192, 100, 6, "#0a0808");
    rect(wx - 1.5, 158, 3, 34, "#0a0808"); rect(wx - 9, 166, 18, 3, "#0a0808");
    for (const cx of [wx - 34, wx + 34]) { rect(cx - 1.5, 178, 3, 14, "#d9cdb0"); drawFlame(cx, 176, 0.5, t + cx, {}); glow(cx, 176, 40, C.flame, 0.3); }
    // The stalls: their canopies against the wall, the monks in them, and their fronts.
    const seats = stallSeats();
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 0 : W / 2 + W * 0.16, x1 = side < 0 ? W / 2 - W * 0.16 : W;
      rect(x0, 150, x1 - x0, 100, "#33231a"); for (let x = x0 + 8; x < x1 - 20; x += 26) rect(x + 3, 156, 20, 74, "rgba(0,0,0,0.18)");
      for (let x = x0 + 8; x < x1; x += 26) { ctx.fillStyle = "#22170f"; ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x + 13, 132); ctx.lineTo(x + 26, 150); ctx.closePath(); ctx.fill(); }
    }
    seats.forEach((s, i) => {
      if (s.row !== 1) return;
      if (i < n) chorister(s.x, s.y, s.dir, 0.95, singing ? Math.sin(t * 5 + i) * 0.5 : 0, singing ? 0.6 : 0.2);
    });
    for (const side of [-1, 1]) { const x0 = side < 0 ? 0 : W / 2 + W * 0.16, x1 = side < 0 ? W / 2 - W * 0.16 : W; rect(x0, 236, x1 - x0, 30, "#24180f"); rect(x0, 234, x1 - x0, 3, "#3a2818"); }
    seats.forEach((s, i) => {
      if (s.row !== 0) return;
      if (i < n) chorister(s.x, s.y, s.dir, 1, singing ? Math.sin(t * 5 + i) * 0.5 : 0, singing ? 0.7 : 0.25);
    });
    for (const side of [-1, 1]) { const x0 = side < 0 ? 0 : W / 2 + W * 0.16, x1 = side < 0 ? W / 2 - W * 0.16 : W; rect(x0, 262, x1 - x0, 40, "#2c1d12"); rect(x0, 260, x1 - x0, 3, "#47301c"); for (let x = x0 + 10; x < x1 - 4; x += 30) rect(x, 268, 20, 26, "rgba(0,0,0,0.25)"); }
    // He, the cantor, at the lectern in the middle, the great book open on it.
    const lx = W / 2 + 18, ly = 300;
    rect(lx - 2, ly - 30, 4, 30, "#0a0808"); rect(lx - 9, ly - 2, 18, 3, "#0a0808");
    poly([lx - 13, ly - 30, lx + 13, ly - 30, lx + 10, ly - 44, lx - 10, ly - 44], "#0a0808");
    poly([lx - 12, ly - 32, lx - 0.5, ly - 33, lx - 1, ly - 45, lx - 10, ly - 44], "#e8dcc0"); poly([lx + 0.5, ly - 33, lx + 12, ly - 32, lx + 10, ly - 44, lx + 1, ly - 45], "#ddd0b2");
    for (let k = 0; k < 4; k++) { rect(lx - 9, ly - 42 + k * 2.6, 7, 0.8, "rgba(40,28,18,0.55)"); rect(lx + 2, ly - 42 + k * 2.6, 7, 0.8, k === 0 ? "rgba(142,36,22,0.8)" : "rgba(40,28,18,0.55)"); }
    const p = MONK_ANIM.idle((t * 0.4) % 1, t), r = drawMonk(W / 2 - 22, ly, 1, p, { t });
    if (r && r.torch) { drawFlame(r.torch[0], r.torch[1], 0.8, t, {}); glow(r.torch[0], r.torch[1], 40, C.flame, 0.3); }
    // The words: the title; while they sing, the verse, word by word.
    if (!singing) {
      text("THE CHOIR", W / 2, 22, { align: "center", font: FONT.title, size: 16, weight: 700, spacing: 5, color: "#fff3dc", glow: "rgba(0,0,0,0.9)", blur: 8 });
      text(n ? (n === 1 ? "One soul freed at a summit sings here." : n + " souls freed at the summits sing here.") + (n > 24 ? " (Twenty-four in the stalls, the rest beyond.)" : "") : "The stalls are empty. Each soul you free at a summit comes here to sing.", W / 2, 40, { align: "center", font: FONT.line, italic: true, size: 12, color: C.warm, max: W - 40, glow: "rgba(0,0,0,0.9)", blur: 6 });
    } else {
      const C2 = I.chant, V = C2.vs[C2.vi];
      rect(0, 0, W, 92, "rgba(6,4,4,0.72)");
      text(V.head, W / 2, 18, { align: "center", size: 8, weight: 800, spacing: 2, color: C.gold, max: W - 40 });
      // (Each word laid out in turn, the one being sung lit.)
      const font = "italic 500 15px " + FONT.line, maxW = Math.min(W - 60, 560); ctx.font = font;
      const sp = ctx.measureText(" ").width, lines = [[]]; let lw = 0;
      V.words.forEach((w, k) => { const ww = ctx.measureText(w).width; if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push({ w, k, x: lw, ww }); lw += ww + sp; });
      lines.forEach((L, li) => {
        const tw = L.length ? L[L.length - 1].x + L[L.length - 1].ww : 0, x0 = W / 2 - tw / 2, y = 40 + li * 19;
        for (const q of L) text(q.w, x0 + q.x, y, { font: FONT.line, italic: true, size: 15, weight: 500, color: q.w === "*" ? C.gold : q.k === C2.w ? "#fff1c4" : q.k < C2.w ? "rgba(255,226,170,0.85)" : "rgba(233,230,223,0.4)", glow: q.k === C2.w ? "rgba(255,190,90,0.8)" : undefined, blur: 8 });
      });
    }
    // Which Hour, and to sing it.
    const h = HOURS[I.hour], L = hourVerses(h), bx = W / 2 - 170 + 52;
    button("‹", bx, H - 46, 34, 32, () => { if (!I.chant) I.hour = (I.hour + HOURS.length - 1) % HOURS.length; }, { size: 14, off: !!I.chant });
    button(h.day + " · " + h.hour, bx + 38, H - 46, 150, 32, () => { }, { size: 8.5, sub: L.length ? L.filter((q) => q.head !== "GLORIA PATRI").length + " verses read" : "nothing of it read yet", off: !L.length });
    button("›", bx + 192, H - 46, 34, 32, () => { if (!I.chant) I.hour = (I.hour + 1) % HOURS.length; }, { size: 14, off: !!I.chant });
    if (I.chant) button("STOP", bx + 232, H - 46, 84, 32, () => { I.chant = null; }, {});
    else button("SING", bx + 232, H - 46, 84, 32, () => sing(I), { hot: !!L.length, off: !L.length });
  }

  const INSIDE = {
    choir: {
      sub: () => { const n = freed(); return n ? n + (n === 1 ? " soul sings" : " souls sing") : "The stalls are empty"; },
      enter(I) { I.hour = 0; I.chant = null; for (let k = 0; k < HOURS.length; k++) if (hasVerses() && hourVerses(HOURS[k]).length) { I.hour = k; break; } Sound.stop(); Sound.ambience({ wind: 0.06 }); },
      leave(I) { I.chant = null; Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.25 }); },
      step(I) {
        const C2 = I.chant; if (!C2) return;
        const now = Sound.now();
        while (C2.next < C2.ev.length && C2.ev[C2.next].t < now + 0.3) { const e = C2.ev[C2.next++]; Sound.fx.chant && Sound.fx.chant(e.t, C2.voices(e.m), e.d + 0.06, e.v, C2.vol); }
        for (let k = C2.next - 1; k >= 0; k--) if (C2.ev[k].t <= now) { C2.vi = C2.ev[k].vi; C2.w = C2.ev[k].w; break; }
        if (now > C2.end + 0.5) I.chant = null;
      },
      draw(I) { if (!hasVerses()) { rect(0, 0, W, H, "#0d0a09"); button("GO OUT", 12, H - 46, 90, 32, goOut, {}); return; } drawChoir(I); button("GO OUT", 12, H - 46, 90, 32, goOut, {}); },
      key(I, code) {
        if (code === "ArrowLeft" || code === "KeyA") { if (!I.chant) I.hour = (I.hour + HOURS.length - 1) % HOURS.length; return true; }
        if (code === "ArrowRight" || code === "KeyD") { if (!I.chant) I.hour = (I.hour + 1) % HOURS.length; return true; }
        if (code === "Space" || code === "Enter") { if (I.chant) I.chant = null; else sing(I); return true; }
        if (code === "Escape" && I.chant) { I.chant = null; return true; }
        return false;
      },
    },
    library: {
      sub: () => (hasVerses() ? Verses.total() + " of 176 verses" : ""),
      draw(I) {
        const t = I.t;
        drawRoom(t, 1);
        if (I.necro) { drawNecrology(); button("BACK", 12, H - 46, 90, 32, () => { I.necro = false; }, {}); return; }
        if ((save.necrology || []).length) button("THE NECROLOGY", W - 142, H - 46, 130, 32, () => { I.necro = true; I.book = null; }, { sub: save.necrology.length + (save.necrology.length === 1 ? " name" : " names") });
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

  // ---- Choosing where to build ----
  // Held still on the ground: a little menu over the spot. On open ground, the buildings not yet
  // placed, each with the stones it needs (greyed where it would not fit); on an outline with no
  // stone laid in it yet, to move it or take it away.
  const HOLD_T = 0.5;
  const span = (s, x) => [x - s.w * T / 2, x + s.w * T / 2];
  function fits(s, x) {
    const [a, b] = span(s, x);
    if (a < 40 || b > HW - 40) return false;
    if (a < GATE + 50 && b > GATE - 50) return false;                // (the gate)
    if (a < CAMP + 34 && b > CAMP - 34) return false;                // (the fire)
    return !placed().some((o) => o !== s && a < o.x + o.w * T / 2 + 20 && b > o.x - o.w * T / 2 - 20);
  }
  const emptyAt = (wx) => placed().find((s) => !siteData(s).done && !H_.stones.some((O) => siteOf(O) === s) && Math.abs(wx - s.x) < s.w * T / 2) || null;
  function openMenu(P) {
    H_.press = null; H_.goal = null;
    const s = emptyAt(P.wx);
    H_.menu = s ? { site: s, x: P.x, y: P.y } : { wx: P.wx, x: P.x, y: P.y };
    Sound.fx.tick && Sound.fx.tick(1100, 0.3);
  }
  function setPlace(s, x) {
    keep(); siteData(s).x = Math.round(x); store(); load();
    H_.say = { text: s.name, sub: "Its place is marked out. Lay " + s.need + " stones in it, up to the line.", t: 0 };
    Sound.fx.pickup && Sound.fx.pickup();
  }
  function unplace(s) { keep(); delete siteData(s).x; store(); load(); }
  function drawMenu(cam) {
    const m = H_.menu; if (!m) return;
    const items = m.site
      ? [["MOVE IT", () => { H_.moving = m.site; H_.menu = null; }, { sub: "Then tap where" }], ["TAKE IT AWAY", () => { unplace(m.site); H_.menu = null; }, { sub: "Not built here" }]]
      : SITES.filter((s) => s.x === null).map((s) => { const ok = fits(s, m.wx); return [s.name, () => { if (fits(s, m.wx)) { setPlace(s, m.wx); H_.menu = null; } }, { hot: ok, off: !ok, sub: ok ? s.need + " stones" : "No room here" }]; });
    if (!items.length) { H_.menu = null; H_.say = { text: "ALL ARE PLACED", sub: "The library and the choir have their places. Hold on an empty one to move it.", t: 0 }; return; }
    const bw = 132, bh = 36, x = clamp(m.x - bw / 2, 8, W - bw - 8), y0 = clamp(m.y - 30 - items.length * (bh + 6), 8, H - 8 - items.length * (bh + 6));
    rect(x - 6, y0 - 6, bw + 12, items.length * (bh + 6) + 6, "rgba(6,5,8,0.82)");
    items.forEach(([label, act, o], i) => button(label, x, y0 + i * (bh + 6), bw, bh, act, o));
  }

  // The book of the dead: the brothers who fell on the mountains, the latest first.
  function drawNecrology() {
    rect(0, 0, W, H, "rgba(4,3,3,0.78)");
    const x0 = 30, w = W - 60; rect(x0 - 3, 14, w + 6, H - 70, "#3a2414"); rect(x0, 17, w, H - 76, "#e9dfc6");
    text("THE NECROLOGY", W / 2, 38, { align: "center", font: FONT.title, size: 15, weight: 700, spacing: 4, color: "#5a2a1a" });
    text("Eternal rest grant unto them, O Lord, and let perpetual light shine upon them.", W / 2, 54, { align: "center", font: FONT.line, italic: true, size: 12, color: "#6b4a30", max: w - 20 });
    (save.necrology || []).slice(0, 14).forEach((e, i) => text(e.line, x0 + 16, 76 + i * 15, { font: FONT.line, size: 12, color: "#2a1a10", max: w - 32 }));
    if ((save.necrology || []).length > 14) text("and " + (save.necrology.length - 14) + " more before them.", W / 2, H - 66, { align: "center", font: FONT.line, italic: true, size: 11, color: "#6b4a30" });
  }

  // ---- Hands on it ----
  function down(p) {
    if (H_.inside) { const I = INSIDE[H_.inside.kind]; if (I.down) I.down(H_.inside, p); return; }
    if (H_.hold) { H_.drag = { x: p.x, hx: H_.hold.x, moved: false }; return; }
    // The menu up: a tap anywhere but on it closes it. A place being moved: a tap sets it there.
    if (H_.menu) { H_.menu = null; return; }
    if (H_.moving) { const s = H_.moving, x = p.x + H_.cam; if (fits(s, x)) { setPlace(s, x); H_.moving = null; } else Sound.fx.tick && Sound.fx.tick(420, 0.3); return; }
    // A tap on a stone laid: it is chosen. On the ground: he walks there (and held there, still, the menu).
    const S = stoneAt(p);
    if (S && siteOf(S)) { H_.sel = H_.sel === S ? null : S; Sound.fx.tick && Sound.fx.tick(800, 0.2); return; }
    H_.sel = null;
    if (p.y > GY - 140) { H_.goal = clamp(p.x + H_.cam, 40, HW - 40); H_.press = { x: p.x, y: p.y, wx: p.x + H_.cam, t: 0 }; }
  }
  function move(p) {
    if (H_.inside) { const I = H_.inside; if (I.B) { const q = I.B.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); I.hover = q ? q.i : null; } return; }
    if (H_.press && Math.hypot(p.x - H_.press.x, p.y - H_.press.y) > 10) H_.press = null;
    const d = H_.drag; if (!d || !H_.hold) return;
    if (Math.abs(p.x - d.x) > 6) d.moved = true;
    if (d.moved && moveTo(d.hx + (p.x - d.x))) Sound.fx.tick && Sound.fx.tick(900, 0.12);
  }
  function up() { H_.press = null; const d = H_.drag; H_.drag = null; if (d && !d.moved && H_.hold) turn(); }
  function key(code, isDown) {
    H_.keys[code] = isDown; if (!isDown) return;
    if (H_.inside) { const I = INSIDE[H_.inside.kind]; if (!(I.key && I.key(H_.inside, code)) && (code === "Escape" || code === "Enter" || code === "Space")) goOut(); return; }
    if (H_.hold) {
      if (code === "ArrowLeft" || code === "KeyA") nudge(-1); else if (code === "ArrowRight" || code === "KeyD") nudge(1);
      else if (code === "ArrowUp" || code === "KeyW") turn(); else if (code === "ArrowDown" || code === "KeyS" || code === "Space" || code === "Enter") place();
      else if (code === "Escape" || code === "Backspace") putBack();
      else if (code === "KeyQ") otherStone(-1); else if (code === "KeyE") otherStone(1);
      return;
    }
    if (H_.sel) {
      if (code === "Backspace" || code === "Delete" || code === "KeyX") lift(H_.sel, false); else if (code === "KeyM") lift(H_.sel, true); else if (code === "Escape") H_.sel = null;
      if (code !== "ArrowLeft" && code !== "ArrowRight" && code !== "KeyA" && code !== "KeyD") return;
      H_.sel = null;
    }
    if ((code === "Space" || code === "Enter") && Math.abs(H_.x - CAMP) < 70) { receive(); return; }
    if (code === "Space" || code === "Enter") { const s = nearSite(); if (s && !siteData(s).done) lay(s); else if (s && INSIDE[s.kind]) goIn(s.kind); }
    if (code === "KeyF") { const s = nearSite(); if (s) finish(s); }
    if (code === "KeyU") { const s = nearSite(); if (s) addTo(s); }
    if (code === "Escape") { if (H_.menu || H_.moving) { H_.menu = null; H_.moving = null; } else leave(); }
  }
  function leave() { if (H_.hold) putBack(); keep(); Game.toTitle(); }
  // In.
  function open() {
    if (!pl) return;
    data(); brotherData(); takeBanked(); load(); H_.dust = []; H_.menu = null; H_.moving = null; H_.press = null;
    const come = takePilgrims(); loadFolk();
    H_.inside = null; H_.t = 0; H_.x = GATE; H_.dir = 1; H_.cam = clamp(GATE - W / 2, 0, HW - W); H_.goal = null; H_.keys = {}; H_.say = null; H_.built = null;
    if (data().gift) setTimeout(() => { if (data().gift) { data().gift = false; store(); } }, 6000);
    mode = M; Sound.flare(false); Sound.muffle(false); Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.25 });
    // (Morning, as he comes.)
    H_.clock = { phase: "day", t: 0 };
    if (come) H_.say = { text: come === 1 ? "ONE FREED FROM THE IDOLS HAS COME DOWN" : come + " FREED FROM THE IDOLS HAVE COME DOWN", sub: "They wait by the fire at the gate, to be received.", t: -0.8 };
  }
  const M = { step, draw, down, move, up, key, open, ok: () => !!pl, data, get state() { return H_; }, SITES, CAMP, receive, lay, finish, addTo, turn, nudge, place, drop: place, putBack, lift, landing };
  return M;
})();
