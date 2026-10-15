"use strict";
// While You Have the Light, the climb (3 of 7): the demons and what they throw, the shrines, the
// blocks and the lay brothers' carts, the great demons, a great demon's dread, and the angel.

// ---- The demons, and what they throw ----------------------------------------------------------------
// Each domain has its own. Wrath conjures fire over its head and throws it, slowly: a ball of fire
// drifting at him through the dark, lighting the rock as it comes, which he can catch and fling
// back. Gluttony, huge and slow, draws in its breath, and everything near is drawn to its mouth (a
// swing goes astray; a man on foot is dragged); whatever is thrown at it, it swallows, and spits
// back; and it is too heavy to be thrown or knocked into the air. Each shaft has its demons on its
// platforms, each crossing on its floor, each cavern on its platforms; in Wrath's domain boulders
// lie about where he will want them.
const DEM = { wrath: { hw: 10, ht: 50, hp: 7 }, gluttony: { hw: 17, ht: 62, hp: 10 }, lust: { hw: 9, ht: 54, hp: 6 }, avarice: { hw: 14, ht: 40, hp: 7 } };
const BR = 11, BOULDER_V = 470, FIRE_V = 125, FIRE_FLING = 560;
function boxAt(x, y, hw, ht) {
  const i0 = Math.floor((x - hw) / CELL), i1 = Math.floor((x + hw - 0.001) / CELL);
  const j0 = Math.floor((y - ht) / CELL), j1 = Math.floor((y - 0.001) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (solid(i, j)) return true;
  return false;
}
function moveBox(o, dx, dy, hw, ht) {
  let hx = 0, hy = 0;
  if (dx) { const x0 = o.x; o.x += dx; if (boxAt(o.x, o.y, hw, ht)) { o.x = dx > 0 ? Math.floor((o.x + hw) / CELL) * CELL - hw - 0.01 : (Math.floor((o.x - hw) / CELL) + 1) * CELL + hw + 0.01; if (boxAt(o.x, o.y, hw, ht)) o.x = x0; hx = sign(dx); } }
  if (dy) { const y0 = o.y; o.y += dy; if (boxAt(o.x, o.y, hw, ht)) { o.y = dy > 0 ? Math.floor(o.y / CELL) * CELL - 0.01 : (Math.floor((o.y - ht) / CELL) + 1) * CELL + ht + 0.01; if (boxAt(o.x, o.y, hw, ht)) o.y = y0; hy = sign(dy); } }
  return [hx, hy];
}
function dFree(x, y, hw, ht) {
  if (!boxAt(x, y, hw, ht)) return [x, y];
  for (let r = 4; r <= 64; r += 4) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * TAU) * r, py = y + Math.sin(a / 16 * TAU) * r; if (!boxAt(px, py, hw, ht)) return [px, py]; }
  return null;
}
// Nothing but air between two points?
function los(x0, y0, x1, y1) { const n = Math.ceil(dist(x0, y0, x1, y1) / 6); for (let k = 1; k < n; k++) if (solidAt(lerp(x0, x1, k / n), lerp(y0, y1, k / n))) return false; return true; }
const dMid = (f) => [f.x, f.y - f.ht / 2];
const alive = (f) => !!f && f.st !== "gone" && f.st !== "dying" && f.st !== "emerge" && f.st !== "topple" && f.st !== "broken" && f.st !== "rise";
const panX = (x) => clamp((x - S.cam.x - W / 2) / (W / 2), -1, 1);
const gain = (v) => { S.meter = Math.min(1, S.meter + v); };
function setSt(f, st) { f.st = st; f.t = 0; f.thrown = false; }
function spawnDemon(sin, x, y, x0, x1, sec) {
  const D = DEM[sin], sp = dFree(x, y, D.hw, D.ht); if (!sp) return null;
  const f = { sin, hw: D.hw, ht: D.ht, maxHp: D.hp, x: sp[0], y: sp[1], vx: 0, vy: 0, dir: -1, hp: D.hp, st: "emerge", t: 0, cd: 1.8 + Math.random(), x0, x1, sec, ground: true, juggle: 0, hurtT: 0, showHp: 0, lit: 0, id: ++S.ids, size: 0 };
  S.demons.push(f); Sound.fx.spawn(panX(x));
  for (let k = 0; k < 12; k++) S.parts.push({ kind: "smoke", x: x + (Math.random() - 0.5) * 20, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, r: 4 + Math.random() * 5, life: 1, age: 0 });
  return f;
}
// The places a demon of this sin could stand in section k, best first: [x, y, x0, x1] (its feet,
// and how far it may walk).
function spotsFor(k, sin) {
  const sec = secs[k], D = DEM[sin], out = [], room = (w) => w * CELL >= D.hw * 2 + 10;
  if (sec.type === "shaft") {
    if (k === 0) { const e = edges(-1), mid = (e.L + e.R + 1) / 2 * CELL; out.push([(e.R - 1) * CELL, -0.01, mid + 40, e.R * CELL]); }
    const isls = [], mid = (sec.h0 + sec.h1) / 2;
    for (let s = Math.floor(sec.h0 / SLOT); s <= Math.floor(sec.h1 / SLOT); s++) {
      const isl = island(s); if (!isl || isl.st === "gone" || isl.h0 < sec.h0 || isl.h1 > sec.h1 || !room(isl.x1 - isl.x0 + 1)) continue;
      isls.push(isl);
    }
    isls.sort((a, b) => Math.abs(a.h0 - mid) - Math.abs(b.h0 - mid));
    for (const isl of isls) out.push([(isl.x0 + isl.x1 + 1) / 2 * CELL, -isl.h1 * CELL - 0.01, isl.x0 * CELL + D.hw, (isl.x1 + 1) * CELL - D.hw]);
  } else if (sec.type === "trav") {
    const T = trav(sec), jt = -(sec.h0 + 7), runs = [];
    let a = -1;
    for (let i = T.a; i <= T.b + 1; i++) {
      const ok = i <= T.b && !T.pit[i] && solid(i, jt) && !solid(i, jt - 1) && !solid(i, jt - 4) && !(i >= T.en.L && i <= T.en.R) && !(T.door && i >= T.door.i0 - 2 && i <= T.door.i1 + 2) && !(T.yard && i >= T.yard[0] && i <= T.yard[1]);
      if (ok && a < 0) a = i; if (!ok && a >= 0) { if (room(i - a)) runs.push([a, i - 1]); a = -1; }
    }
    const c = (T.a + T.b) / 2;
    runs.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - c) - Math.abs((q[0] + q[1]) / 2 - c));
    for (const r of runs) out.push([(r[0] + r[1] + 1) / 2 * CELL, jt * CELL - 0.01, r[0] * CELL + D.hw, (r[1] + 1) * CELL - D.hw]);
  } else if (sec.type === "summit") {
    if (!sec.filler) for (const q of [-14, 14, -21, 21]) { const i = sec.c + q; out.push([(i + 0.5) * CELL, -(sec.h0 + summitG(i, sec)) * CELL - 0.01, (i - 5) * CELL, (i + 5) * CELL]); }
  } else if (sec.type === "slope") {
    // On the bare terraces (not the first or the last, where he comes and goes).
    const V = slope(sec), at = (v) => V.iA + V.dir * v;
    V.ter.forEach((T, t) => {
      if (T.thorn || t === 0 || t === V.ter.length - 1) return;
      const a = Math.min(at(T.a), at(T.b)), b = Math.max(at(T.a), at(T.b)); if (!room(b - a + 1)) return;
      out.push([(a + b + 1) / 2 * CELL, -(sec.h0 + T.F - 1) * CELL - 0.01, a * CELL + D.hw + 2, (b + 1) * CELL - D.hw - 2, t]);
    });
    out.sort((p, q) => Math.abs(p[4] - V.ter.length * 0.35) - Math.abs(q[4] - V.ter.length * 0.35));
  } else {
    const V = cave(sec);
    for (const p of V.plats.filter((p) => room(p.x1 - p.x0 + 1)).sort((a, b) => (b.great - a.great) || (b.r1 - a.r1)))
      out.push([(p.x0 + p.x1 + 1) / 2 * CELL, -(sec.h0 + p.r1) * CELL - 0.01, p.x0 * CELL + D.hw, (p.x1 + 1) * CELL - D.hw]);
    // and on its floor, for one who falls
    for (const q of [0.35, 0.7]) { const x = lerp(V.lo + 3, V.hi - 3, q) * CELL; out.splice(1, 0, [x, -(sec.h0 - 1) * CELL - 0.01, x - 140, x + 140]); }
  }
  return out;
}
function placeFor(k, demonsOnly) {
  // (A cavern or a corridor of briars is long: twice as many demons in it, met along the way over.)
  ensureSecs(k); const sec = secs[k], sin = sec.dom || "wrath", n = demonsFor(k) * (sec.type === "cave" || sec.type === "slope" ? 2 : 1);
  if (sec.type === "summit") {
    if (sec.filler) return;
    if (!demonsOnly) placeSummit(k);
    // Three of the mountain's own demons about its top as well (Gluttony's pulling him about and
    // throwing their fat while he fights the great one), and three more when they are gone, until
    // the summit is won. (None, if the mountain was asked to have no demons.)
    if (S.won || !NOV || !NOV.demons || !DEM[sin]) return;
    const spots = spotsFor(k, sin);
    for (const s of spots.slice(0, 3)) spawnDemon(sin, s[0], s[1], s[2], s[3], k);
    return;
  }
  if (!DEM[sin]) return;
  const spots = spotsFor(k, sin), taken = [];
  // The best place first; then each further one as far as it can be from those already taken.
  for (let q = 0; q < n && spots.length; q++) {
    let bi = 0, bd = -1;
    if (taken.length) spots.forEach((s, i) => { const d = Math.min(...taken.map((t) => Math.abs(t[0] - s[0]) + Math.abs(t[1] - s[1]))); if (d > bd) { bd = d; bi = i; } });
    const s = spots.splice(bi, 1)[0]; taken.push(s);
    spawnDemon(sin, s[0], s[1], s[2], s[3], k);
  }
  if (!demonsOnly && sec.dom) placeShrine(k, sec.dom, spots, taken);
  if (!demonsOnly && sin === "wrath") placeRocks(k, taken);
  if (!demonsOnly) placeGreat(k);
}
// Boulders lying where he will want them: on the platform below a demon in a shaft, at the foot
// of the shaft, or by the way into a crossing.
function placeRocks(k, taken) {
  const sec = secs[k], at = [];
  if (sec.type === "shaft") {
    const top = taken.length ? Math.min(...taken.map((t) => -t[1] / CELL)) : sec.h1;
    const below = [];
    for (let s = Math.floor(sec.h0 / SLOT); s <= Math.floor(sec.h1 / SLOT); s++) { const isl = island(s); if (isl && isl.h0 >= sec.h0 && isl.h1 < top - 1) below.push(isl); }
    below.sort((a, b) => b.h1 - a.h1);
    for (const isl of below.slice(0, 2)) at.push([(isl.x0 + isl.x1 + 1) / 2 * CELL + (hash2(isl.s, 14, seed) - 0.5) * 12, -isl.h1 * CELL]);
    if (k === 0) { const e = edges(-1); at.push([(e.L + 2) * CELL, 0]); }
  } else if (sec.type === "trav") {
    const T = trav(sec), i = T.dir > 0 ? T.en.R + 1 : T.en.L - 1;
    at.push([(i + 0.5) * CELL, -(sec.h0 + 7) * CELL]);
  }
  for (const [x, y] of at) S.things.push({ kind: "stone", x, y: y - BR - 0.01, vx: 0, vy: 0, rot: Math.random() * TAU, vr: 0, st: "rest", by: null, g: 560, age: 0 });
}
// ---- The shrines ----------------------------------------------------------------------------------
// Here and there on level ground, in every domain, a gathering about an idol of that domain: its
// worshippers in dark robes about it in the dark, with no light of their own. As his torch passes,
// they turn their heads. (Ezekiel 8:12: "what the ancients of the house of Israel do in the dark,
// every one in private in his chamber: for they say: The Lord seeth us not.") Strike the idol and
// they scatter, and are lost in the dark. Three blows and it falls and breaks; its pieces are
// stones in his hands like any other, to throw at the demons. It is struck as a demon is (it is
// kept among them, with no mind of its own).
const IDOL_HP = 3;
function placeShrine(k, dom, spots, taken) {
  // (In about half the shafts; in every crossing, cavern and corridor that has room. In the seven
  // mountains, none at a gate: the lay brother waits there, and a block must be carried to him.)
  if (secs[k].type === "shaft" && hash2(k, 77, seed) < 0.5) return;
  if (NOV && secs[k].gate) return;
  let best = null, bs = -1e9;
  for (const sp of spots) {
    const w = sp[3] - sp[2] + 2 * DEM[dom].hw;
    if (w < 60 || crumblerAt(sp[0], sp[1] + 4)) continue;
    const far = taken.length ? Math.min(...taken.map((t) => Math.abs(t[0] - sp[0]) + Math.abs(t[1] - sp[1]))) : 400;
    const deep = secs[k].type === "cave" && sp[1] > -secs[k].h0 * CELL;      // a cavern's floor, far below the way over
    const score = Math.min(far, 400) + Math.min(w, 140) * 0.4 - (deep ? 500 : 0);
    if (score > bs) { bs = score; best = { x: sp[0], y: sp[1], w }; }
  }
  if (!best) return;
  // Its worshippers about it, as many as there is room for, on both sides, facing it.
  const kinds = dom === "lust" ? [3, 3, 1] : dom === "wrath" ? [2, 1, 2] : dom === "avarice" ? [1, 0, 1] : [0, 1, 0], who = [], n = clamp(Math.floor((best.w - 44) / 30), 1, 4);
  for (let q = 0; q < n; q++) {
    const side = q % 2 ? 1 : -1, row = Math.floor(q / 2), x = best.x + side * (dom === "gluttony" ? (side < 0 ? 44 : 60) : (dom === "wrath" || dom === "avarice") && side > 0 ? 52 : dom === "avarice" ? 46 : 32) + side * row * 27;
    who.push({ x, y: best.y, side: -side, kind: kinds[q % kinds.length], look: 0, st: "pray", vx: 0, vy: 0, t: 0, a: 1, ph: Math.random() * TAU });
  }
  S.demons.push({ idol: true, sin: dom, hw: 13, ht: 60, maxHp: IDOL_HP, hp: IDOL_HP, x: best.x, y: best.y, vx: 0, vy: 0, dir: 1, st: "idle", t: 0, cd: 0, x0: best.x, x1: best.x, sec: k,
    ground: true, juggle: 0, hurtT: 0, showHp: 0, lit: 0, id: ++S.ids, size: 0, who, fled: false, whoKinds: who.map((w) => w.kind) });
}
// ---- The blocks ---------------------------------------------------------------------------------
// In the seven mountains, an idol thrown down gives up a block of its stone, in its domain's
// colour: four squares joined (one of the seven shapes of the falling-stone game), with a little
// light of its own. They are for building, later: the stones of the idol for the house of God, as
// Benedict on Monte Cassino broke Apollo's idol and built his oratories where its temple had
// stood (Gregory, Dialogues II.8). He ties one to his belt on a short rope and takes it on with
// him: it drags along the ground and slows him, its weight tells on the rope and the rock, and as
// he swings it swings under him and strikes whatever it meets. The rope never catches on the
// rock: where the block would snag, it slides behind the rock and comes free. A hard blow knocks
// it loose. And the demons want it back: any of them near a block lying loose floats off with it
// (Avarice's thief cuts it from his belt) to the nearest shrine, and there the idol rises again,
// bigger, with the block inside it (the spirit come back to the house swept and garnished,
// Matthew 12:43-45). Hooked as it goes, the demon is pulled down out of the air. Once a block is
// found, a lay brother waits at every gate with a cart and its donkey: brought to the cart, the
// block goes into it, and home.
const BC = 7, TETHER = 54, BLOCK_LOAD = 4, FLOAT_V = 110, CARRY_V = 85, BK = 1.25;
const THROW_LEN = 230, THROW_V = 560;          // how far its rope pays out when he throws it; how hard he throws
const SHAPES = { I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], L: [[0, 0], [0, 1], [0, 2], [1, 2]], J: [[1, 0], [1, 1], [1, 2], [0, 2]] };
const SHAPE_KEYS = Object.keys(SHAPES);
// (x is its middle, y its foot, like everything else that stands; hw and ht its box.)
function newBlock(I) {
  const shape = SHAPE_KEYS[Math.floor(hash2(I.id, I.sec * 7 + 3, seed) * SHAPE_KEYS.length) % SHAPE_KEYS.length];
  return Object.assign(makeBlock(shape, I.sin), { x: I.x, y: I.y, st: "idol", by: I, home: I });
}
function makeBlock(shape, dom) {
  const cells = SHAPES[shape] || SHAPES.T, w = Math.max(...cells.map((c) => c[0])) + 1, h = Math.max(...cells.map((c) => c[1])) + 1;
  return { shape: SHAPES[shape] ? shape : "T", cells, w, h, hw: w * BC / 2, ht: h * BC, dom: SINS[dom] ? dom : "wrath", x: S.x, y: S.y, vx: 0, vy: 0, rot: 0, st: "loose", by: null, home: null, id: ++S.ids, age: 0 };
}
// Out of an idol as it breaks: thrown up the way it fell.
function reveal(b, I) {
  ev("block from an idol", { shape: b.shape, sin: I.sin });
  if (!S.blocks.includes(b)) S.blocks.push(b);
  // (It falls his way, and for a moment the demons do not see it: it is his to take, if he is quick.)
  const K = I.big || 1, s = sign(S.x - I.x) || 1;
  Object.assign(b, { st: "loose", by: null, claim: null, x: I.x + s * 6, y: I.y - 24 * K, vx: s * (40 + Math.random() * 40), vy: -300, nopick: S.rt + 0.35, unseen: S.rt + 1.25, age: 0, rot: 0 });
  for (let k = 0; k < 14; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 120; S.parts.push({ kind: "spark", c: SINS[b.dom].light, x: b.x, y: b.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.8, age: 0, real: true }); }
  if (!S.blockSeen) { S.blockSeen = true; tip("blockSeen", { text: "A BLOCK FROM THE IDOL", sub: "Go to it and it is tied to your belt. A lay brother waits at the gate above.", t: 0 }); }
}
function tie(b) {
  ev("block tied on", { shape: b.shape });
  b.st = "tied"; b.by = null; b.claim = null; b.rope = TETHER; b.flung = false; S.tied = b; S.lost = null; Sound.fx.tie(panX(b.x));
  if (S.blockK === undefined) S.blockK = S.popK;        // (from here on up, the great demons may come)
  if (!S.tiedSeen) { S.tiedSeen = true; tip("tiedSeen", { text: "TIED TO HIS BELT", sub: "It drags, and it weighs. Swing it into the demons, or tap it and throw it. Bring it to the gate.", t: 0 }); }
}
// Tapped, the block on his rope (near him): he takes it up in his hands, to throw. While he
// holds it his hands are full: on the rock, a ledge or the rope, it hangs from the rope again.
function takeUp() {
  const b = S.tied; if (!b || b.st !== "tied" || b.flung || S.held || S.rope || S.cling || S.hang || S.act || S.latched || S.dying) return false;
  const [mx, my] = middle(); if (dist(mx, my, b.x, b.y - b.ht / 2) > TETHER + 34) return false;
  b.st = "hand"; Sound.fx.pickup(); ev("block taken up");
  if (!S.handSeen) { S.handSeen = true; tip("handSeen", { text: "IN HIS HANDS", sub: "Tap where to throw it. Its rope pays out after it.", t: 0 }); }
  return true;
}
// Thrown at a point: hard, with arc enough to reach it, its rope paying out behind it (as far as
// THROW_LEN); where it lands the rope lies slack, and shortens again as he comes up to it.
function throwBlock(tx, ty) {
  const b = S.tied; if (!b) return;
  const [hx, hy] = S.handW || grip(), d = Math.max(20, dist(hx, hy, tx, ty)), T = Math.min(0.55, d / THROW_V);
  b.st = "tied"; b.flung = true; b.flyT = 0; b.rope = THROW_LEN; b.ground = false; b.x = hx; b.y = hy + b.ht / 2;
  b.vx = (tx - hx) / Math.max(T, 0.08); b.vy = (ty - hy) / Math.max(T, 0.08) - 0.5 * 640 * T;
  const sp = Math.hypot(b.vx, b.vy); if (sp > 820) { b.vx *= 820 / sp; b.vy *= 820 / sp; }
  S.dir = sign(tx - S.x) || S.dir; S.throwT = 0.3; Sound.fx.throw(1); ev("block thrown");
}
// A hard blow to him: the knot gives, and the block goes flying.
function loosen(kx) {
  const b = S.tied; if (!b) return;
  ev("block knocked loose");
  // (He is thrown one way; it goes on the other, toward the blow.)
  S.tied = null; S.lost = b; S.dragging = false; b.st = "loose"; b.flung = false; b.rope = TETHER; b.vx = -(sign(kx) || -S.dir) * 150; b.vy = Math.min(b.vy, -200); b.nopick = S.rt + 0.8; b.unseen = S.rt + 1.25;
  Sound.fx.tetherBreak();
}
// A demon takes a block up, and makes for the nearest shrine with it.
function carryOff(f, b) {
  ev("a demon took the block", { sin: f.sin });
  b.st = "carried"; b.by = f; b.claim = null; f.block = b; f.want = null;
  f.dest = shrineFor(f, b); setSt(f, "carry"); f.ground = false; f.stuckT = 0; f.ghostT = 0;
  if (!S.carrySeen && dist(f.x, f.y, S.x, S.y) < 700) { S.carrySeen = true; tip("carrySeen", { text: "A DEMON HAS THE BLOCK", sub: "Tap it: the hook pulls it down. Stop it before it reaches a shrine.", t: 0 }); }
}
function shrineFor(f, b) {
  const cands = S.demons.filter((g) => g.idol && g.st !== "gone");
  if (b.home && !cands.includes(b.home)) cands.push(b.home);
  let best = null, bd = 1e9;
  for (const I of cands) { const d = dist(f.x, f.y, I.x, I.y); if (d < bd) { bd = d; best = I; } }
  return best;
}
function dropBlock(f, kx, ky) {
  const b = f.block; if (!b) return;
  f.block = null; b.st = "loose"; b.by = null; b.x = f.x; b.y = f.y - f.ht * 0.5 + b.ht / 2;
  b.vx = (kx || 0) * 0.5; b.vy = Math.min(-100, (ky || 0) * 0.5); b.nopick = S.rt + 0.25; b.unseen = S.rt + 1.25;
}
// A demon at rest, a block lying loose near it: it rises, and goes for it.
function seekBlock(f) {
  if (S.dying || f.idol || !NOV) return false;
  let best = null, bd = 300;
  for (const b of S.blocks) {
    if (b.st !== "loose" || b.unseen > S.rt) continue;
    const c = b.claim; if (c && c !== f && c.st === "seize" && c.want === b) continue;
    const d = dist(f.x, f.y - f.ht / 2, b.x, b.y - b.ht / 2); if (d < bd) { bd = d; best = b; }
  }
  if (!best) return false;
  best.claim = f; f.want = best; setSt(f, "seize"); f.ground = false; f.stuckT = 0; f.ghostT = 0; f.vx = 0; f.vy = 0;
  Sound.fx.swoop();
  return true;
}
// Through the air toward a point (its middle there): round the rock where it can, a little turned
// either way; where it cannot (or gets no nearer for a while), through the rock, behind it, slowly.
function floatTo(f, tx, ty, sp, dt) {
  const cx = f.x, cy = f.y - f.ht / 2, d = dist(cx, cy, tx, ty);
  if (d < 0.5) return d;
  const ux = (tx - cx) / d, uy = (ty - cy) / d, st = Math.min(d, sp * dt);
  let mx = 0, my = 0;
  if (!(f.ghostT > 0) && !boxAt(f.x, f.y, f.hw, f.ht)) {
    for (const a of [0, 0.6, -0.6, 1.2, -1.2]) {
      const c = Math.cos(a), s = Math.sin(a), vx = ux * c - uy * s, vy = ux * s + uy * c;
      if (!boxAt(f.x + vx * st, f.y + vy * st, f.hw, f.ht)) { mx = vx * st; my = vy * st; break; }
    }
  }
  if (!mx && !my) { mx = ux * st * 0.6; my = uy * st * 0.6; }
  f.x += mx; f.y += my; f.vx = mx / Math.max(dt, 1e-4); f.vy = my / Math.max(dt, 1e-4);
  if (Math.abs(mx) > 0.05) f.dir = sign(mx);
  const nd = dist(f.x, f.y - f.ht / 2, tx, ty);
  if (nd > d - st * 0.3) { f.stuckT = (f.stuckT || 0) + dt; if (f.stuckT > 0.7) { f.ghostT = 1.2; f.stuckT = 0; } } else f.stuckT = 0;
  if (f.ghostT > 0) f.ghostT -= dt;
  return nd;
}
// Done floating (inside the rock, it may be): out into the air nearest, and down.
function alight(f) { if (boxAt(f.x, f.y, f.hw, f.ht)) { const sp = dFree(f.x, f.y, f.hw, f.ht); if (sp) { f.x = sp[0]; f.y = sp[1]; } } f.vx = 0; f.vy = 0; setSt(f, "fall"); }
function floatDemon(f, dt) {
  if (f.st === "seize") {
    const b = f.want;
    if (!b || b.st !== "loose" || f.t > 9) { if (b && b.claim === f) b.claim = null; f.want = null; alight(f); return; }
    if (floatTo(f, b.x, b.y - b.ht / 2, FLOAT_V, dt) < f.hw + 12) carryOff(f, b);
    return;
  }
  const b = f.block;
  if (!b) { alight(f); return; }
  b.x = f.x + f.dir * 2; b.y = f.y - f.ht - 2;
  if (!f.dest) { f.dest = shrineFor(f, b); if (!f.dest) { dropBlock(f, 0, 0); alight(f); return; } }
  const I = f.dest, K = I.big || 1;
  if (floatTo(f, I.x, I.y - 34 * K, CARRY_V, dt) < 24) rebuild(I, f, b);
}
// At the shrine: the idol rises again where it fell (or, standing, swells), bigger and harder to
// throw down, and the block is in it. No one comes back to worship it.
function rebuild(I, f, b) {
  f.block = null; f.dest = null;
  raiseIdol(I, b);
  alight(f); f.x0 = I.x - 70; f.x1 = I.x + 70;
}
// The idol rising again with the block in it.
function raiseIdol(I, b) {
  ev("idol rebuilt", { sin: I.sin, hp: IDOL_HP + 3 * ((I.rebuilt || 0) + 1) });
  b.st = "idol"; b.by = I; b.claim = null; b.flung = false; b.rope = TETHER;
  (I.blocks || (I.blocks = [])).push(b);
  I.rebuilt = (I.rebuilt || 0) + 1; I.big = Math.min(2, 1 + 0.25 * I.rebuilt);
  I.maxHp = IDOL_HP + 3 * I.rebuilt; I.hp = I.maxHp; I.hw = 13 * I.big; I.ht = 60 * I.big; I.showHp = 2;
  if (!S.demons.includes(I)) S.demons.push(I);
  if (I.st !== "idle") setSt(I, "rise");
  Sound.fx.rise(panX(I.x)); S.shake = Math.max(S.shake, 0.1);
  for (let k = 0; k < 18; k++) S.parts.push({ kind: "smoke", x: I.x + (Math.random() - 0.5) * 40 * I.big, y: I.y - Math.random() * 50 * I.big, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, r: 4 + Math.random() * 6, life: 1.2, age: 0 });
  if (!S.riseSeen && dist(I.x, I.y, S.x, S.y) < 760) { S.riseSeen = true; tip("riseSeen", { text: "THE IDOL RISES AGAIN", sub: "Bigger now, and harder to throw down. The block is in it.", t: 0 }); }
}
// The hook thrown at a demon in the air with a block (or going for one): it bites, and the demon
// is pulled down out of the air toward him, and lets go of what it holds.
function yank(f) {
  const [hx, hy] = S.handW || grip(), [cx, cy] = dMid(f), d = dist(hx, hy, cx, cy);
  if (d > 560 || !los(hx, hy, cx, cy - 4)) { Sound.fx.tick(420, 0.3); return; }
  S.yank = { f, t: 0, T: clamp(d / 1600, 0.06, 0.32) }; Sound.fx.whoosh(0.6);
}
function stepYank(dt) {
  const Y = S.yank, f = Y.f; Y.t += dt;
  if (!alive(f)) { S.yank = null; return; }
  if (Y.t < Y.T) return;
  S.yank = null;
  const [mx, my] = middle(), [cx, cy] = dMid(f), d = dist(mx, my, cx, cy) || 1, ux = (mx - cx) / d, uy = (my - cy) / d;
  if (f.block) dropBlock(f, ux * 300, uy * 300 - 60);
  if (f.want && f.want.claim === f) f.want.claim = null; f.want = null; f.dest = null;
  setSt(f, "thrown"); f.vx = ux * 470; f.vy = uy * 470 + 40; f.ground = false;
  impact(f, ux, uy, 1.4); Sound.fx.tetherBreak(); Sound.fx.kick(0.8, panX(f.x)); gain(0.1); ev("hooked a demon down", { sin: f.sin });
}
// The lay brother's place at a gate (in the seven mountains): just past its lamp, he, then the
// cart, then its donkey, facing on.
function brotherOf(sec) {
  if (!NOV || !sec || sec.type !== "trav" || !sec.gate) return null;
  const T = trav(sec); if (T.bro) return T.bro;
  const D = T.door; if (!D) return null;
  const base = T.dir > 0 ? (D.i1 + 1) * CELL : D.i0 * CELL, y = -(sec.h0 + 7) * CELL - 0.01;
  return (T.bro = { sec: sec.k, dir: T.dir, y, x: base + T.dir * 4.5 * CELL, cart: base + T.dir * 8.5 * CELL, donkey: base + T.dir * 12.5 * CELL, bin: [], cheer: -9 });
}
// The traced figures' scale; and how far the cart is shifted so its box, not the whole of it, stands at G.cart.
const ART_K = 1.35, CART_DU = 10;
const binSlot = (G, s) => [G.cart + G.dir * (-9 + (s % 3) * 9) * BK, G.y - (21.5 * ART_K + Math.floor(s / 3) * 5 * BK)];
// Brought to the cart: the rope untied, the block up and into it, and the brother lifts his
// hands over it. His blessing fills the torch.
function deliver(G) {
  ev("block brought to the cart", { gate: G.sec });
  const b = S.tied; S.tied = null; S.lost = null; S.dragging = false;
  Object.assign(b, { st: "tobin", t: 0, fx: b.x, fy: b.y, by: G, slot: G.bin.length });
  G.bin.push(b); G.cheer = S.rt; S.binned++; S.fuel = 1;
  Sound.fx.deliver(panX(G.cart));
  keepHere("cart");
}
// The cart he stands at, if any (and has blocks in it, if asked).
function cartAt(x, y, full) {
  const h = -y / CELL;
  for (const sec of sectionsIn(h - 10, h + 10)) { const G = brotherOf(sec); if (G && Math.abs(x - G.cart) < 48 && Math.abs(y - G.y) < 56 && (!full || G.bin.some((b) => b.st === "bin"))) return G; }
  return null;
}
// Out of the cart again: the top block, into his hands. It counts as brought down no longer; it
// does not go back in by itself until he has gone off and come back, or taps the cart.
function unbin(G) {
  if (S.tied || S.held || S.act || S.rope || S.cling || S.dying || S.latched) return false;
  const b = G.bin.length && G.bin[G.bin.length - 1]; if (!b || b.st !== "bin") return false;
  G.bin.pop(); S.binned = Math.max(0, S.binned - 1);
  Object.assign(b, { st: "hand", by: null, slot: undefined, rope: TETHER, flung: false, claim: null, out: G });
  S.tied = b; S.lost = null; Sound.fx.pickup(); ev("block taken out of the cart", { gate: G.sec });
  keepHere("cart");
  return true;
}
function stepBlocks(dt) {
  for (const b of S.blocks) {
    b.age = (b.age || 0) + dt;
    if (b.st === "loose") stepLoose(b, dt);
    else if (b.st === "tied") stepTied(b, dt);
    else if (b.st === "hand") { if (S.tied !== b || S.cling || S.hang || S.act || S.rope) b.st = S.tied === b ? "tied" : "loose"; else { const [hx, hy] = S.handW || grip(); b.x = hx; b.y = hy - 2; b.vx = S.vx; b.vy = S.vy; b.rot = 0; b.rope = TETHER; } }
    else if (b.st === "carried") { const f = b.by; if (!f || !alive(f) || f.block !== b) { if (f && f.block === b) f.block = null; b.st = "loose"; b.by = null; } }
    else if (b.st === "tobin") { b.t += dt; if (b.t >= 0.55) b.st = "bin"; }
    else if (b.st === "grasped") { const g = b.by; if (!g || !S.bigs.includes(g) || !g.laugh || g.laugh.b !== b) { b.st = "loose"; b.by = null; } }
  }
  // A block lying loose within his reach: he ties it on.
  if (!S.tied && !S.dying) {
    const [mx, my] = middle();
    for (const b of S.blocks) if (b.st === "loose" && !(b.nopick > S.rt) && Math.abs(mx - b.x) < HW + b.hw + 8 && Math.abs(my - (b.y - b.ht / 2)) < HT / 2 + b.ht / 2 + 4) { tie(b); break; }
  }
  // At a gate's cart: into it.
  if (S.tied && !S.dying) {
    const G = cartAt(S.x, S.y), out = S.tied.out;
    if (out && (G !== out)) S.tied.out = null;         // (gone off from the cart it came out of)
    else if (G && !out) deliver(G);
  }
}
function stepLoose(b, dt) {
  if (boxAt(b.x, b.y, b.hw, b.ht)) { const sp = dFree(b.x, b.y, b.hw, b.ht); if (sp) { b.x = sp[0]; b.y = sp[1]; } else { b.y += 60 * dt; return; } }
  // Hurled back by a great demon: reaching him, a blow (his ward turns it); and it falls by him.
  if (b.hurled && S.rt - b.hurled < 1.2 && !S.dying && !S.latched) {
    const [mx, my] = middle();
    if (Math.abs(b.x - S.x) < HW + b.hw + 2 && Math.abs(b.y - b.ht / 2 - my) < HT / 2 + b.ht / 2) {
      b.hurled = 0;
      if (S.ward) { spendWard(); ev("the ward turned the thrown block"); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); }
      else if (!(S.invT > 0)) { hitMonk(sign(b.vx), 0.08); Sound.fx.brickHit(1, panX(b.x)); impactAt(b.x, b.y - b.ht / 2, b.vx, b.vy, 2, null); }
      b.vx = sign(b.vx) * 40; b.vy = -140; b.nopick = S.rt + 0.4;          // (dropping at his feet, just past him: his again)
    }
  }
  const n = clamp(Math.ceil(Math.hypot(b.vx, b.vy) * dt / 5), 1, 8), h = dt / n;
  for (let k = 0; k < n; k++) {
    b.vy = Math.min(b.vy + 640 * h, 900);
    const vyIn = b.vy, [hx, hy] = moveBox(b, b.vx * h, b.vy * h, b.hw, b.ht);
    if (hx) b.vx *= -0.3;
    if (hy > 0) { if (vyIn > 240) { Sound.fx.brickDrop(panX(b.x), clamp(vyIn / 600, 0.3, 1)); b.vy = -vyIn * 0.2; } else b.vy = 0; b.vx *= 0.6; b.ground = true; }
    else { if (hy < 0) b.vy = 20; b.ground = false; }
  }
  if (b.ground) { b.vx *= Math.pow(0.02, dt); b.rot += (Math.round(b.rot / PI) * PI - b.rot) * Math.min(1, dt * 10); }
  else b.rot += b.vx * dt * 0.03;
}
// On the rope from his belt: it falls, it slides, it stops on the rock; and the rope, never longer
// than it is, draws it after him (its speed is what that makes of it, so a pull sets it swinging,
// and a sudden stop flings it on). Inside the rock (behind it) it goes where it is drawn.
function stepTied(b, dt) {
  const ax = S.x - S.dir * 2, ay = S.y - 20, L = b.rope || TETHER;
  if (dist(ax, ay, b.x, b.y - b.ht) > L * 3) { b.x = ax; b.y = ay + TETHER + b.ht * 0.5; b.vx = S.vx; b.vy = S.vy; b.rope = TETHER; b.flung = false; }
  const x0 = b.x, y0 = b.y, n = clamp(Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4), 1, 10), h = dt / n;
  let grounded = false;
  for (let k = 0; k < n; k++) {
    b.vy += 640 * h;
    if (b.ground || grounded) b.vx *= Math.pow(0.002, h);           // (on the rock, it scrapes to a stop: before it moves, so its speed keeps it)
    if (boxAt(b.x, b.y, b.hw, b.ht)) { b.x += b.vx * h; b.y += b.vy * h; }
    else {
      const [hx, hy] = moveBox(b, b.vx * h, b.vy * h, b.hw, b.ht);
      if (hx) b.vx *= -0.2;
      if (hy > 0) { grounded = true; b.vy = 0; } else if (hy < 0) b.vy *= -0.2;
    }
    const tx = b.x, ty = b.y - b.ht, d = dist(ax, ay, tx, ty);
    if (d > L) {
      // (A pull that would draw it down into the ground, a tall block lying with its top above the
      // knot: along the ground only. Into rock any other way, it goes behind the rock, and frees itself.)
      const q = (d - L) / d, px = (ax - tx) * q, py = (ay - ty) * q;
      if (py > 0 && !boxAt(b.x + px, b.y, b.hw, b.ht) && boxAt(b.x + px, b.y + py, b.hw, b.ht)) b.x += px;
      else { b.x += px; b.y += py; }
    }
  }
  b.vx = clamp((b.x - x0) / dt, -900, 900); b.vy = clamp((b.y - y0) / dt, -900, 900);
  b.ground = grounded && !boxAt(b.x, b.y, b.hw, b.ht);
  // Behind the rock for more than a moment (dangling in it under him as he walks on above, say):
  // it comes out at his feet, behind him (or before him, if there is no room behind).
  b.inRockT = boxAt(b.x, b.y, b.hw, b.ht) ? (b.inRockT || 0) + dt : 0;
  if (b.inRockT > 0.7 && !b.flung) {
    const sp = dFree(S.x - S.dir * (HW + b.hw + 4), S.y - 0.01, b.hw, b.ht) || dFree(S.x + S.dir * (HW + b.hw + 4), S.y - 0.01, b.hw, b.ht);
    if (sp) {
      puff(b.x, b.y - b.ht / 2, 5, false);
      b.x = sp[0]; b.y = sp[1]; b.vx = S.vx * 0.5; b.vy = 0; b.rope = TETHER; b.inRockT = 0;
      puff(b.x, b.y - b.ht / 2, 6, false); Sound.fx.brickDrop(panX(b.x), 0.3); ev("block came out of the rock");
    }
  }
  const dNow = dist(ax, ay, b.x, b.y - b.ht);
  S.dragging = b.ground && dNow > L - 3;
  // Thrown: once it has come down (or is spent), the rope lies as it fell; and as he comes up to it, it shortens.
  if (b.flung) { b.flyT = (b.flyT || 0) + dt; if (b.ground || b.flyT > 2.5) { b.flung = false; b.rope = clamp(dNow + 2, TETHER, THROW_LEN); } }
  else b.rope = Math.max(TETHER, Math.min(L, dNow + 1));
  const want = b.ground ? Math.round(b.rot / PI) * PI : Math.atan2(ax - b.x, (b.y - b.ht / 2) - ay);
  b.rot += (want - b.rot) * Math.min(1, dt * 10);
  flail(b);
}
// Swung (or flung) fast into a demon, or an idol: it strikes like a flail.
function flail(b) {
  const sp = Math.hypot(b.vx, b.vy); if (sp < 190) return;
  const cx = b.x, cy = b.y - b.ht / 2;
  for (const g of S.bigs) if (g.st !== "dying" && g.st !== "latch" && Math.abs(cx - g.x) < g.hw + b.hw && cy > g.y - g.ht - b.ht / 2 && cy < g.y + b.ht / 2) { strikeGreat(g, b); return; }
  for (const f of S.demons) {
    if (!alive(f) || (f.flailCd || 0) > S.rt) continue;
    if (Math.abs(cx - f.x) < f.hw + b.hw && cy > f.y - f.ht - b.ht / 2 && cy < f.y + b.ht / 2) {
      const hard = sp > 420;
      f.flailCd = S.rt + 0.45;
      impactAt(cx, cy, b.vx, b.vy, hard ? 2.2 : 1.5, f);
      hurtDemon(f, hard ? 3 : 2, b.vx * 0.7, -150 - sp * 0.15, "launch");
      Sound.fx.brickHit(hard ? 1 : 0.75, panX(f.x)); gain(0.1); S.shake = Math.max(S.shake, 0.15);
      break;
    }
  }
}
// Drawing: a block, its four squares each a cut stone of its colour, lit on the upper edges.
function drawBlock(b, x, y, k, rot, a) {
  const c = SINS[b.dom] || SINS.wrath, s = BC * k, w = b.w * s, h = b.h * s;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (a !== undefined) ctx.globalAlpha *= a;
  for (const [i, j] of b.cells) {
    const px = -w / 2 + i * s, py = -h / 2 + j * s;
    rect(px, py, s, s, c.deep);
    rect(px + 0.7, py + 0.7, s - 1.4, s - 1.4, c.color);
    rect(px + 0.7, py + 0.7, s - 1.4, 1.1, c.light); rect(px + 0.7, py + 0.7, 1.1, s - 1.4, c.light);
    rect(px + 1.8, py + s - 1.8, s - 2.5, 1.1, c.dark);
  }
  ctx.restore();
}
const GLOWS = [];
function drawBlocks(cam, rimP, lights) {
  GLOWS.length = 0;
  if (S.blockSeen) for (const sec of sectionsIn(-(cam.y + H) / CELL - 6, -cam.y / CELL + 6)) { const G = brotherOf(sec); if (G) drawBrother(G, cam, rimP, lights); }
  for (const b of S.blocks) {
    let x, y, rot = b.rot || 0;
    if (b.st === "loose") { x = b.x; y = b.y - b.ht / 2; }
    else if (b.st === "carried") {
      const f = b.by, q = f.p ? demonJoint(f.sin, f.x, f.y, f.dir, f.p, "hF") : [f.x, f.y - f.ht];
      x = q[0]; y = q[1] - b.ht / 2 - 2; b.x = x; b.y = y + b.ht / 2; rot = 0;
    } else if (b.st === "grasped") { x = b.x; y = b.y - b.ht / 2; rot = 0.12 * Math.sin(S.rt * 24);
    } else if (b.st === "tobin") {
      const [ex, ey] = binSlot(b.by, b.slot), u = ease(Math.min(1, b.t / 0.55));
      x = lerp(b.fx, ex, u); y = lerp(b.fy - b.ht / 2, ey, u) - Math.sin(u * PI) * 46; rot = (1 - u) * rot;
    } else continue;
    if (x < cam.x - 60 || x > cam.x + W + 60 || y < cam.y - 60 || y > cam.y + H + 60) continue;
    drawBlock(b, x - cam.x, y - cam.y, 1, rot);
    lights.push({ x: x - cam.x, y: y - cam.y, r: 40, a: 0.55 });
    GLOWS.push([b, x, y, rot]);
  }
}
// On the rope from his belt, behind him.
function drawTied(mx, my, p, cam, lights) {
  const b = S.tied, hp = monkJoint(mx, my, S.dir, p, "hip"), cx = b.x, cy = b.y - b.ht / 2;
  const tx = cx + Math.sin(b.rot) * b.ht / 2, ty = cy - Math.cos(b.rot) * b.ht / 2;
  const d = dist(hp[0], hp[1], tx, ty), slack = b.flung ? 0 : Math.max(0, (b.rope || TETHER) - d), sag = Math.min(slack * 0.5, Math.max(4, 2 * (b.y - (hp[1] + ty) / 2)));
  ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hp[0] - cam.x, hp[1] - cam.y);
  ctx.quadraticCurveTo((hp[0] + tx) / 2 - cam.x, (hp[1] + ty) / 2 + sag - cam.y, tx - cam.x, ty - cam.y); ctx.stroke();
  drawBlock(b, cx - cam.x, cy - cam.y, 1, b.rot);
  lights.push({ x: cx - cam.x, y: cy - cam.y, r: 40, a: 0.55 });
  GLOWS.push([b, cx, cy, b.rot]);
}
// In his hands, over his head, to throw: its rope from his belt hanging in a loop below it.
function drawHeld(b, mx, my, p, hand, cam, lights) {
  const hp = monkJoint(mx, my, S.dir, p, "hip"), cx = hand[0], cy = hand[1] - 2 - b.ht / 2;
  b.x = cx; b.y = cy + b.ht / 2;
  ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hp[0] - cam.x, hp[1] - cam.y);
  ctx.quadraticCurveTo(hp[0] - S.dir * 12 - cam.x, Math.max(hp[1], b.y) + 14 - cam.y, cx - cam.x, b.y - cam.y); ctx.stroke();
  drawBlock(b, cx - cam.x, cy - cam.y, 1, 0);
  lights.push({ x: cx - cam.x, y: cy - cam.y, r: 40, a: 0.55 });
  GLOWS.push([b, cx, cy, 0]);
}
function drawYank(cam) {
  const Y = S.yank, f = Y.f, [hx, hy] = S.handW || grip(), [cx, cy] = dMid(f), u = clamp(Y.t / Y.T, 0, 1), x = lerp(hx, cx, u), y = lerp(hy, cy, u);
  line(hx - cam.x, hy - cam.y, x - cam.x, y - cam.y, "#0b0b0d", 1.4);
  drawHook(x - cam.x, y - cam.y, Math.atan2(cy - hy, cx - hx));
}
// The lay brother (when a block is brought, he reaches for it, then lifts his hands over it); his
// cart, a box of boards on one spoked wheel, with a lantern on a pole; and its donkey. Traced shapes.
function drawBrother(G, cam, rimP, lights) {
  const sx = G.cart - cam.x, sy = G.y - cam.y;
  if (sx < -220 || sx > W + 220 || sy < -140 || sy > H + 90) return;
  const t = S.rt;
  const A = ART_K, C0 = put(G.cart, G.y, G.dir, cam), CT = (u, v) => C0(u * A, v * A);
  // What is in the cart first, so the side of the box hides all but the tops.
  G.bin.forEach((b, s) => { if (b.st !== "bin") return; const [x, y] = binSlot(G, s); drawBlock(b, x - cam.x, y - cam.y, 1, 0); });
  const cart = new Path2D(), donk = new Path2D(), bro = new Path2D();
  addShape(cart, TRACED.cart, CT, CART_DU);
  addPoly(cart, [[-18, 23], [-16.8, 23], [-16.8, 34], [-18, 34]], CT); addPoly(cart, [[-18, 34], [-12, 34], [-12, 35], [-18, 35]], CT);   // the lantern's post
  const k = clamp((t - G.cheer) / 0.3, 0, 1) * clamp((1.9 - (t - G.cheer)) / 0.4, 0, 1), since = t - G.cheer;
  // The donkey, now and then lifting its head to bray (and always when a block comes).
  const bray = (since > 0.2 && since < 1.4) || Math.sin(t * 0.7 + G.sec * 3) > 0.985;
  const D0 = put(G.donkey, G.y, G.dir, cam);
  addShape(donk, bray ? TRACED.donkeyBray : TRACED.donkey, (u, v) => D0(u * A, v * A));
  // The lay brother: standing with a hand on the cart; reaching to it as a block comes; then his hands raised, blessing.
  const B0 = put(G.x + G.dir * 30, G.y, -G.dir, cam), br = Math.sin(t * 1.4 + G.sec) * 0.3;
  addShape(bro, since >= 0 && since < 0.45 ? TRACED.broLift : k > 0.05 ? TRACED.broBless : TRACED.broStand, (u, v) => B0(u * A, v * A + (v > 20 ? br : 0)));
  ctx.fillStyle = C.ink; ctx.fill(bro, "evenodd"); rimNow(bro);   // (he stands just behind the cart's end, his hand on it hidden by it)
  ctx.fill(cart, "evenodd"); ctx.fill(donk, "evenodd");
  const ink = new Path2D(); ink.addPath(cart); ink.addPath(donk);
  // (Its rim of torchlight laid on now, not over him: he stands before the cart, not behind it.)
  rimNow(ink);
  const [lx, ly] = CT(-13, 32.5); lights.push({ x: lx, y: ly, r: 120, a: 0.8 });
  GLOWS.push([null, lx + cam.x, ly + cam.y, 0, G, k]);
}
// The torch's rim on a shape drawn behind him (by the light of the last picture: near enough).
function rimNow(path) {
  if (!S.light || !S.torch) return;
  const tx = S.torch[0] - S.cam.x, ty = S.torch[1] - S.cam.y, R = lightR();
  ctx.save(); ctx.clip(S.light);
  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
  g.addColorStop(0, "rgba(255,190,110,0.8)"); g.addColorStop(0.5, "rgba(232,128,58,0.4)"); g.addColorStop(1, "rgba(232,128,58,0)");
  ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke(path); ctx.restore();
}
// Over the dark: each block's own light; the lantern's flame; the blocks in the cart, and his blessing.
function blockGlows(cam) {
  const t = S.rt;
  for (const [b, x, y, rot, G, k] of GLOWS) {
    if (!b) {
      const sx = x - cam.x, sy = y - cam.y;
      glow(sx, sy, 34, C.flame, 0.35); drawFlame(sx, sy + 3, 0.42, t + G.sec, {});
      G.bin.forEach((q, s) => { if (q.st !== "bin") return; const [bx, by] = binSlot(G, s); glow(bx - cam.x, by - cam.y - 2, 9, SINS[q.dom].color, 0.35); });
      if (k > 0.05) { const [hx, hy] = put(G.x + G.dir * 30, G.y, -G.dir, cam)(0, 46 * ART_K); glow(hx, hy, 40, C.warm, 0.4 * k); lightCross(hx, hy, 9, 0.8 * k, 2); }
      continue;
    }
    const sx = x - cam.x, sy = y - cam.y, c = SINS[b.dom] || SINS.wrath, inRock = solidAt(x, y);
    glow(sx, sy, inRock ? 22 : 18, c.color, (inRock ? 0.3 : 0.42) + 0.08 * Math.sin(t * 3 + b.id));
    if (!inRock) drawBlock(b, sx, sy, 1, rot, 0.55);
  }
}
// ---- The great demons --------------------------------------------------------------------------------
// In the seven mountains, here and there, a demon greater than the rest. Gluttony's is the Maw: a
// swollen thing that floats, nearly all mouth. Unseen, it is stone: out of the torch's light, or
// with his back to it, it hangs where it is, a statue, its face at rest. Turned toward in the
// light, it wakes and gapes and comes for him: slowly, but faster higher up the mountain, and near
// the top his back no longer stops it. (What is looked at with desire comes on; turned from, it is
// stone. The Rule's Prologue: he who casts the devil and his suggestion out from the sight of his
// heart brings him to nothing, and takes his thoughts while they are small and dashes them against
// Christ.) Nothing of his own hurts it, no blow, no kick, no sign of the cross: only the stone of an
// idol, a block thrown or swung. If it reaches him it takes him in, head and shoulders, and he must
// fight his way out, his light going all the while. A block it comes on, it seizes and hurls back
// at him, hard: but it cannot be rid of the stone that hurts it, and the block falls by him.
const GREAT = { gluttony: { hw: 20, ht: 84 } };
const GREAT_V = [0, 52, 62, 72, 84, 92], GRASP = [0, 5, 8, 11, 14, 18];   // by tier: how fast it comes; the blows it takes to get out of it
// The first in the cavern of the fourth crossing, in the room over the chasm, across the way. After
// it, here and there by chance (more often the higher he goes), never two within three sections.
// (Where one would wait in section k, given where the last one waited: nothing is changed.)
function planGreat(k) {
  if (!NOV || !GREAT[NOV.domain] || k >= summitK()) return null;
  // None until he has a block from an idol (blockK: the first place set out after that); then
  // three before the summit, each a tier stronger: the first in the first place it can stand, the
  // rest at least three places apart, likelier the higher he goes, and sure to come in time.
  if (S.blockK === undefined || k < S.blockK || (S.greatN || 0) >= 3) return null;
  const sec = secs[k], n = S.greatN || 0, G = GREAT[NOV.domain], tier = n + 1, sc = 1 + 0.2 * (tier - 1), hw = G.hw * sc, ht = G.ht * sc;
  if (sec.gate) return null;
  if (n > 0) {
    const since = k - S.greatK, left = summitK() - k, must = left <= (3 - n) * 3;
    if (since < 3 || (!must && hash2(k, 990, seed) >= clamp(0.03 + 0.012 * (k - S.blockK), 0, 0.5))) return null;
  }
  const sp = spotsFor(k, NOV.domain); if (!sp.length) return null;
  const s = sp[Math.floor(hash2(k, 991, seed) * sp.length) % sp.length];
  const at = dFree(s[0], s[1] - 30, hw, ht), dir = hash2(k, 992, seed) < 0.5 ? -1 : 1;
  return at ? { at, dir, tier, sc, hw, ht } : null;
}
function placeGreat(k) {
  const P = planGreat(k); if (!P) return;
  S.greatK = k; S.greatN = (S.greatN || 0) + 1;
  if (S.greatDown.has(k)) return;                 // (cast down already, before he left the mountain)
  const { at, dir, tier, sc, hw, ht } = P;
  S.bigs.push({ sin: NOV.domain, tier, sc, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir, hp: tier, maxHp: tier, st: "stone", t: 0, wake: 0, lit: 0, anim: hash2(k, 993, seed) * 9,
    stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: k, id: ++S.ids, growlT: -9, stoneT: -9 });
  ev("a great demon waits", { k, tier });
}
// The greatest of them, on the summit: bigger than any met on the way, and stronger (five blows).
// It does not leave the mountain's top, and does not follow him down into it.
function placeSummit(k) {
  const sec = secs[k];
  if (S.greatDown.has(k)) { S.won = S.won || { t: 9 }; return; }        // (won before he left the mountain: the angel waits)
  if (S.bigs.some((g) => g.summit)) return;
  const G = GREAT.gluttony, sc = 1.9, hw = G.hw * sc, ht = G.ht * sc, side = hash2(k, 995, seed) < 0.5 ? -1 : 1, i = sec.c + side * 17;
  const at = dFree((i + 0.5) * CELL, -(sec.h0 + summitG(i, sec)) * CELL - 1, hw, ht) || [(i + 0.5) * CELL, -(sec.h0 + SUM_G) * CELL - 1];
  S.bigs.push({ sin: "gluttony", tier: 5, sc, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir: -side, hp: 5, maxHp: 5, st: "stone", t: 0, wake: 0, lit: 0, anim: hash2(k, 993, seed) * 9,
    stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: k, id: ++S.ids, growlT: -9, stoneT: -9, summit: true });
  ev("the summit's demon waits", { k });
}
const bigAt = (x, y) => { for (const g of S.bigs) if (g.st !== "dying" && g.st !== "latch" && Math.abs(x - g.x) < g.hw + 14 && y > g.y - g.ht - 14 && y < g.y + 10) return g; return null; };
function stepGreat(dt) {
  for (const g of S.bigs) updGreat(g, dt);
  S.bigs = S.bigs.filter((g) => g.st !== "gone");
}
function updGreat(g, dt) {
  g.t += dt; g.stunT = Math.max(0, g.stunT - dt); g.hurtT = Math.max(0, g.hurtT - dt); g.showHp = Math.max(0, g.showHp - dt); g.chew = Math.max(0, g.chew - dt); g.flingT = Math.max(0, (g.flingT || 0) - dt);
  if (g.bulge) { g.bulge.t += dt; if (g.bulge.t > 0.3) g.bulge = null; }
  if (g.st === "dying") { g.wake = Math.max(0, g.wake - dt * 4); if (g.t > 1.1) breakGreat(g); return; }
  if (g.st === "latch") { holdHim(g, dt); return; }
  // Knocked back by a blow: it drifts, slowing.
  if (g.kx || g.ky) { g.x += g.kx * dt; g.y += g.ky * dt; const q = Math.exp(-3 * dt); g.kx *= q; g.ky *= q; if (Math.abs(g.kx) + Math.abs(g.ky) < 4) { g.kx = 0; g.ky = 0; } }
  // Struck with a block, it laughs: it holds the block up in its claw, throws its head back with its
  // jaws wide, and shakes with it, flashing; and then it flings the block back at him.
  if (g.laugh) {
    const L = g.laugh, b = L.b; L.t += dt; g.wake = Math.min(1, g.wake + dt * 8); g.anim += dt * 3;
    if (b.st === "grasped") { const q = greatT(g, { x: 0, y: 0 })(LAUGH_HAND[0], LAUGH_HAND[1]); b.x = q[0]; b.y = q[1] + b.ht / 2; }
    if (!L.again && L.t > 0.55) { L.again = true; Sound.fx.laugh(panX(g.x)); }
    if (L.t >= LAUGH_T) {
      g.laugh = null;
      if (b.st === "grasped") { if (S.blocks.includes(b) && !S.dying && !S.latched) hurl(g, b); else { b.st = "loose"; b.by = null; } }
    }
    return;
  }
  // Seen: some part of it in the torch's light (or, gone into the rock, near enough to be in it),
  // and he turned toward it; or, near the top of the mountain, turned toward it or not.
  const cx = g.x, cy = g.y - g.ht / 2, [mx, my] = middle(), [lx, ly] = S.torch, R = lightR() * 0.95;
  greatThrows(g, cx, cy, dt);
  const lit = dist(lx, ly, cx, cy) < R + g.ht * 0.3 && (solidAt(cx, cy) || [0.15, 0.5, 0.85].some((q) => { const y = g.y - g.ht * q; return dist(lx, ly, cx, y) < R && los(lx, ly, cx, y); }));
  const facing = g.tier >= 4 || (cx - S.x) * S.dir > -14;
  // Seen for the first time (in his light, out in the open): the dread. From then on it follows him.
  if (!g.met && lit && !solidAt(cx, cy) && onView(g, -10) && canDread()) { g.met = true; if (!g.summit) { S.haunt = g; g.lostT = 0; g.wait = hauntWait(g); } startDread(g, "meet"); return; }
  if (S.haunt === g) {
    if (onView(g, 40) || dist(cx, cy, mx, my) < 300) g.lostT = 0; else g.lostT += dt;
    if (g.lostT > g.wait && canDread()) { if (burstAfter(g)) return; g.lostT = g.wait - 1.5; }      // (no room for it near him: it tries again soon)
  }
  const below = g.summit && S.y > -(secs[g.sec].h0 + 2) * CELL;     // (gone down off the summit: it waits for him there)
  const awake = lit && facing && g.stunT <= 0 && !S.dying && !S.latched && !below;
  if (awake && g.st !== "hunt") {
    g.st = "hunt"; g.t = 0; ev("a great demon woke", { tier: g.tier });
    if (g.met && S.haunt !== g && !g.summit) { S.haunt = g; g.lostT = 0; g.wait = hauntWait(g); }      // (woken again, it follows him again)
    if (S.rt - g.growlT > 1.6) { g.growlT = S.rt; Sound.fx.growl(panX(g.x), 0.75 + 0.08 * g.tier); }
    greatSays();
  } else if (!awake && g.st === "hunt") {
    g.st = "stone"; g.t = 0;
    if (S.rt - g.stoneT > 0.8) { g.stoneT = S.rt; Sound.fx.stone(panX(g.x)); }
  }
  g.wake = clamp(g.wake + (g.st === "hunt" ? 7 : -9) * dt, 0, 1);
  g.anim += dt * g.wake;                     // (its stirring, which stops dead when it is stone)
  if (g.st !== "hunt") return;
  if (boonOn("vade") && dist(cx, cy, mx, my) < VADE_R + g.hw) { vadeGreat(g); return; }
  floatTo(g, mx, my, GREAT_V[g.tier] * (0.3 + 0.7 * g.wake), dt);
  g.dir = sign(mx - g.x) || g.dir;         // (its eyes on him, whichever way it is going round the rock)
  // At him: it takes him in. At a block (lying, or on his rope): it seizes it and hurls it back at him.
  if (Math.abs(g.x - S.x) < g.hw * 0.7 + HW && S.y > g.y - g.ht + 12 && S.y - HT < g.y - 8) { greatReach(g); return; }
  for (const b of S.blocks) {
    if ((b.st !== "loose" && b.st !== "tied") || (b.hurled && S.rt - b.hurled < 1.5)) continue;
    const by = b.y - b.ht / 2;
    if (Math.abs(b.x - g.x) < g.hw + b.hw * 0.5 && by > g.y - g.ht && by < g.y + 6) { hurl(g, b); break; }
  }
}
function greatReach(g) {
  if (S.invT > 0 || S.dying) return;
  // On the rope, swinging hard enough for a kick: he is struck off it unharmed (and it is driven back
  // a little: only a block can hurt it). Slower, it takes him in, as anywhere (or the ward turns it).
  // So he must swing round it fast, and strike with a block.
  if (S.rope && !S.ground) {
    const sp = Math.hypot(S.vx, S.vy), s = sign(S.x - g.x) || -S.dir;
    if (sp >= 170) {
      ev("swung into a great demon", { sp: Math.round(sp) });
      dropRope(true); S.vx = s * 260; S.vy = -200; S.ground = false; S.invT = 0.9; S.swingKickT = 0.35; S.kickCd = 0.45;
      g.kx = -s * 170; g.ky = -50; g.stunT = Math.max(g.stunT, 0.7); g.hurtT = 0.2;
      impactAt(g.x + s * g.hw * 0.6, g.y - g.ht * 0.5, -s, 0, 1.2, null); Sound.fx.kick(1, panX(g.x)); Sound.fx.stone(panX(g.x)); S.shake = 0.18;
      return;
    }
  }
  if (S.ward) {
    // The ward turns it: it is thrown back, and stunned a while; and the ward is spent.
    ev("the ward turned a great demon"); spendWard();
    const s = sign(g.x - S.x) || -S.dir;
    g.kx = s * 240; g.ky = -70; g.stunT = 2; g.hurtT = 0.3; g.st = "stone"; g.t = 0;
    S.crosses.push({ kind: "smite", x: g.x, y: g.y - g.ht / 2, t: 0, size: 28 }); S.invT = 0.8; S.whiteT = 0.15;
    impactAt(g.x - s * g.hw * 0.6, g.y - g.ht * 0.5, s, 0, 1.6, null);
    Sound.fx.unlock(); Sound.fx.stone(panX(g.x));
    return;
  }
  latch(g);
}
// Taken in: its jaws close over his head and shoulders, and it holds him up, his legs kicking.
function latch(g) {
  ev("taken in by a great demon", { tier: g.tier });
  if (S.legsIn) freeLegs(false);
  breakCombo();
  S.latched = g; S.crawl = false; g.st = "latch"; g.t = 0; g.latchT = 0; g.blows = 0; g.need = GRASP[g.tier]; g.kx = 0; g.ky = 0; g.wake = 1;
  if (S.rope) dropRope(true);
  S.flip = null; S.next = null; S.pend = null; S.hang = null; S.cling = 0; S.climbing = false; S.act = null; S.atk = null; S.hoverT = 0; S.vx = 0; S.vy = 0;
  if (S.flare.on) endFlare(true);
  if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.dir * 60; S.held.vy = -80; S.held = null; }
  if (S.tied && S.tied.st === "hand") S.tied.st = "tied";
  S.shake = 0.3; Sound.fx.chomp(panX(S.x));
  if (!S.latchSeen) { S.latchSeen = true; tip("latchSeen", { text: "IT HAS HIM", sub: usingKeys() ? "Click, click, click (or any key): fight your way out. While it holds him, his light goes." : "Tap, tap, tap: fight your way out. While it holds him, his light goes.", t: 0 }); }
}
function holdHim(g, dt) {
  g.latchT += dt; g.anim += dt * 1.5; g.x = S.x; g.y = S.y - 4;
  // (The longer it holds him, the faster his light goes.)
  if (!S.dying && !boonOn("unconsumed")) { S.fuel -= dt * (0.04 + 0.05 * g.latchT); if (S.fuel <= 0) { drained(); if (!S.dying) spitOut(g); } }
}
// A blow from inside it (any tap, any key): it bulges where he strikes, and enough of them, it
// spits him out.
function punchOut() {
  const g = S.latched; if (!g || g.st !== "latch" || S.dying || (g.blowCd || 0) > S.rt) return;
  g.blowCd = S.rt + 0.06; g.blows++; g.hurtT = 0.12; g.bulge = { t: 0, a: PI / 2 + (Math.random() - 0.5) * 2.6 };
  Sound.fx.thump(0.6 + 0.4 * g.blows / g.need, panX(S.x)); S.shake = Math.max(S.shake, 0.1);
  if (g.blows >= g.need) spitOut(g);
}
function spitOut(g) {
  ev("broke out of a great demon", { after: r2(g.latchT) });
  S.latched = null; g.st = "stone"; g.t = 0; g.stunT = 2.2; g.hurtT = 0.3; g.wake = 0.5; g.bulge = null;
  const s = S.dir || 1, at = dFree(S.x - s * (g.hw + 10), S.y - 6, g.hw, g.ht);
  if (at) { g.x = at[0]; g.y = at[1]; }
  g.kx = -s * 200; g.ky = -90;
  S.vx = s * 150; S.vy = -230; S.ground = false; S.invT = 1.2; S.hurtT = 0;
  impactAt(S.x, S.y - HT * 0.7, s, -0.5, 1.8, null);
  Sound.fx.spit(); Sound.fx.stone(panX(g.x));
}
// A block into it, any way at all (thrown, swung, struck with): a blow it feels. It is knocked back
// and stunned a while (stone, its cracks glowing); the last blow, and it breaks. But it laughs, and
// takes the stone (wrenching it off his rope), and throws it back at him. (real: the block itself,
// when b is only how it was swung.)
function strikeGreat(g, b, real) {
  if (g.st === "dying" || g.st === "latch" || (g.hitCd || 0) > S.rt) return;
  g.hitCd = S.rt + 0.6;
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
  g.hp -= 1; g.showHp = 3; g.hurtT = 0.3; g.kx = ux * 120; g.ky = uy * 80 - 25;
  ev("a great demon struck", { hp: g.hp, by: b.flung ? "thrown" : "swung" });
  b.vx = -b.vx * 0.25; b.vy = -Math.abs(b.vy) * 0.25 - 140;
  impactAt(b.x, b.y - b.ht / 2, ux, uy, 2.6, null);
  Sound.fx.brickHit(1, panX(g.x)); Sound.fx.stone(panX(g.x)); gain(0.15); S.shake = Math.max(S.shake, 0.3);
  for (let q = 0; q < 10; q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: b.x, y: b.y - b.ht / 2, vx: (Math.random() - 0.5) * 240 - ux * 60, vy: -60 - Math.random() * 180, life: 0.7, age: 0 });
  if (g.hp <= 0) { g.st = "dying"; g.t = 0; g.stunT = 9; g.laugh = null; Sound.fx.greatFall(panX(g.x)); ev("a great demon cast down", { tier: g.tier }); return; }
  const blk = real || b;
  // (Any but the summit's: the block is torn from his rope and falls where it will; a demon may take it.)
  if (!g.summit && blk && blk.shape && S.blocks.includes(blk) && blk.st !== "bin" && blk.st !== "tobin") {
    if (S.tied === blk) { S.tied = null; S.lost = blk; S.dragging = false; Sound.fx.tetherBreak(); }
    Object.assign(blk, { st: "loose", by: null, claim: null, flung: false, vx: -ux * 160, vy: -120 });
    g.stunT = 1.5; g.st = "stone"; g.t = 0; ev("a block cut free by a great demon");
    return;
  }
  if (blk && blk.shape && S.blocks.includes(blk) && blk.st !== "bin" && blk.st !== "tobin") {
    // It takes the block (wrenching it off his rope), and laughs.
    if (S.tied === blk) { S.tied = null; S.lost = blk; S.dragging = false; Sound.fx.tetherBreak(); }
    Object.assign(blk, { st: "grasped", by: g, vx: 0, vy: 0, claim: null, flung: false });
    g.laugh = { t: 0, b: blk }; g.stunT = 0; Sound.fx.laugh(panX(g.x)); ev("a great demon laughed");
  } else { g.stunT = 2.5; g.st = "stone"; g.t = 0; }       // (no block to take: knocked back, and stunned a while)
}
// A great demon throws its mountain's missile at him (the summit's does not: its demons do).
function greatThrows(g, cx, cy, dt) {
  if (g.summit || g.stunT > 0 || S.dying || S.latched || g.st === "stone" && g.wake < 0.5) return;
  const [mx, my] = middle(), near = dist(cx, cy, mx, my) < 480 && los(cx, cy - g.ht * 0.25, mx, my);
  if (g.throwT === undefined) { if (near) g.throwT = 2; return; }
  g.throwT -= dt; if (g.throwT > 0) return;
  g.throwT = 2.4 + Math.random() * 1.4; if (!near) return;
  const hx = g.x + g.dir * g.hw * 0.7, hy = g.y - g.ht * 0.78;
  if (g.sin === "wrath") { const d = dist(hx, hy, mx, my) || 1; S.things.push({ kind: "fire", x: hx, y: hy, vx: (mx - hx) / d * FIRE_V, vy: (my - hy) / d * FIRE_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 8, from: null }); Sound.fx.fireball(panX(g.x)); }
  else { const o = lob(hx, hy, mx, my, 260, 330, "demon", "fat"); Object.assign(o, { r: 9 * g.sc, w: 0, wv: 6, bounces: 0, from: null, life: 12 }); Sound.fx.spit(); }
  ev("a great demon threw");
}
function breakGreat(g) {
  g.st = "gone"; S.cast++; S.fuel = 1; S.meter = 1; gain(0.3); S.greatDown.add(g.sec);
  if (S.haunt === g) S.haunt = null;
  if (NOV) keepHere("great");                       // (cast down, it stays down, whenever he comes back)
  const cx = g.x, cy = g.y - g.ht / 2;
  S.shake = 0.45; S.whiteT = 0.18; Sound.fx.crumble(panX(cx)); Sound.fx.castOut(g.sin);
  // (Its pieces are stones in his hands, like any other.)
  for (let q = 0; q < 4; q++) S.things.push({ kind: "stone", shard: g.sin, sid: g.id * 4 + q, x: cx + (Math.random() - 0.5) * g.hw, y: cy + (Math.random() - 0.5) * g.ht * 0.5, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, st: "fly", by: null, g: 560, age: 0 });
  for (let q = 0; q < 26; q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: cx + (Math.random() - 0.5) * g.hw * 2, y: cy + (Math.random() - 0.5) * g.ht * 0.8, vx: (Math.random() - 0.5) * 320, vy: -80 - Math.random() * 240, life: 0.9, age: 0 });
  for (let q = 0; q < 30; q++) { const a = Math.random() * TAU, v = 60 + Math.random() * 220; S.parts.push({ kind: "spark", c: q % 3 ? SINS[g.sin].color : "#ff4a2a", x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 1, age: 0, real: true }); }
  for (let q = 0; q < 16; q++) S.parts.push({ kind: "smoke", x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, r: 5 + Math.random() * 7, life: 1.4, age: 0 });
  S.say = g.summit ? { text: "THE SUMMIT IS WON", sub: "The greatest of this mountain's demons is cast down.", t: 0 } : { text: "THE GREAT DEMON IS CAST DOWN", sub: "The torch and the flare are full.", t: 0 };
  if (g.summit) { ev("the summit is won"); S.won = { t: 0 }; }
}
// Awake, it comes on a block (lying, or on his rope): it seizes it (wrenching it off his rope) and
// hurls it back at him, hard and straight. If it reaches him it is a blow (his ward turns it);
// either way it falls by him, his to take up again.
function hurl(g, b) {
  ev("a great demon threw the block back", { shape: b.shape });
  if (S.tied === b) { S.tied = null; S.lost = b; S.dragging = false; Sound.fx.tetherBreak(); }
  const grasped = b.st === "grasped", [mx, my] = middle(), hx = grasped ? b.x : g.x + g.dir * g.hw * 0.5, hy = grasped ? b.y - b.ht / 2 : g.y - g.ht * 0.62, T = clamp(dist(hx, hy, mx, my) / 560, 0.15, 0.6);
  Object.assign(b, { st: "loose", by: null, claim: null, flung: false, rope: TETHER, x: hx, y: hy + b.ht / 2, vx: (mx - hx) / T, vy: (my - hy) / T - 0.5 * 640 * T, rot: 0, ground: false, hurled: S.rt, nopick: S.rt + 0.5, unseen: S.rt + 3 });
  g.flingT = 0.35; g.chew = 0.3;
  Sound.fx.growl(panX(g.x), 0.6); Sound.fx.throw(1);
  if (!S.hurlSeen) { S.hurlSeen = true; tip("hurlSeen", { text: "IT THREW THE BLOCK BACK", sub: "Take it up again, and throw it true.", t: 0 }); }
}
function freedSay() { S.freedPend = false; S.freedSeen = true; tip("freedSeen", { text: "IT FOLLOWS NO FURTHER", sub: "\u201cThy word is a lamp to my feet.\u201d", t: 0 }); }
// ---- A great demon's dread ----------------------------------------------------------------------------
// The first time one comes into his light, the world stops: it shows itself (its flesh, its jaws,
// its eyes burning; white as a coal by flashes) while the sting sounds, and then all goes on as
// before. Once met, it follows him: left behind out of his sight a while, it bursts after him,
// the world stops again, and there it is at the edge of what he can see, on the side he left it
// (by his back, if it can be). Then the old rule: stone, unless he faces it in the light. So it
// follows until it is cast down, or until he reads a verse: "Thy word is a lamp to my feet"
// (Psalm 118:105).
const DREAD_T = { meet: 1.15, burst: 0.9 };
// ---- The angel -------------------------------------------------------------------------------------
// The summit won and he on it: the world stops; a beam of light falls on him out of the sky, and an
// angel comes down it, and takes him by the top of his head (as Habacuc was taken: Daniel 14:35),
// and they go up together into the light. Then home. (Its times: the beam; the angel come down; the
// hand laid on him; up; the white; home.)
const ANG = { beam: 1.3, down: 3.0, take: 3.6, white: 5.6, home: 7.2 };
function startAngel() {
  ev("the angel came");
  if (S.rope) dropRope(true);
  if (S.flare.on) endFlare(true);
  S.shot = null; S.flip = null; S.next = null; S.pend = null; S.atk = null; S.hang = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.kick = null; S.shake = 0;
  if (S.held) { S.held.st = "rest"; S.held.by = null; S.held = null; }
  S.angel = { t: 0, x: S.x, y0: S.y, lifted: false }; S.say = null; S.kept = null; S.verse = null;
  Sound.fx.angel(); Sound.muffle(false);
}
function stepAngel(dt) {
  const A = S.angel; A.t += dt; S.rt += dt * 0.2;      // (the world all but still: the flame still moves)
  if (!A.lifted && A.t > ANG.take) { A.lifted = true; Sound.fx.lift(); }
  if (A.t > ANG.take) { const u = A.t - ANG.take; S.y = A.y0 - (40 * u + 70 * u * u); S.ground = false; }
  // (The camera rises with them, but more slowly: they go up out of it.)
  const ty = A.y0 - HT / 2 - H * 0.66 - 0.35 * (A.y0 - S.y);
  S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 3); S.cam.x += (clamp(A.x - W / 2, 0, COLS * CELL - W) - S.cam.x) * Math.min(1, dt * 3);
  if (A.t > ANG.home) finishWon();
}
// Where the angel is: its feet. Down the beam to just above his head; then up with him.
function angelAt() {
  const A = S.angel, u = smooth((A.t - ANG.beam) / (ANG.down - ANG.beam));
  return [A.x + 2, A.t > ANG.take ? S.y - HT - 18 : lerp(A.y0 - 460, A.y0 - HT - 18, u)];
}
function drawBeam(cam, lights) {
  const A = S.angel, k = clamp(A.t / ANG.beam, 0, 1) * clamp((ANG.home - A.t) / 0.6, 0, 1), x = A.x - cam.x, yb = A.y0 - cam.y + 4;
  const w = 26 + 34 * k, g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, "rgba(255,244,214,0)"); g.addColorStop(0.5, "rgba(255,246,222," + (0.5 * k) + ")"); g.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, Math.max(0, yb));
  glowOval(x, yb - 4, 70 * k, 14 * k, "#fff1c4", 0.55 * k);
  lights.push({ x, y: yb - 80, r: 340 * k + 1, a: 0.95 * k });
}
function drawAngel(cam, mx, my) {
  const A = S.angel; if (A.t < ANG.beam * 0.6) return;
  const [fx, fy] = angelAt(), x = fx - cam.x, y = fy - cam.y, a = clamp((A.t - ANG.beam * 0.6) / 0.8, 0, 1), t = A.t;
  const flap = Math.sin(t * 3.2) * 0.12;
  ctx.save(); ctx.globalAlpha *= a;
  glow(x, y - 46, 110, "#fff1c4", 0.45); glow(x, y - 46, 44, "#ffffff", 0.5);
  // The wings: long, swept up and back, feather on feather, each a little apart.
  for (const sd of [-1, 1]) for (let f = 0; f < 4; f++) {
    const ang = -PI / 2 + sd * (0.55 + f * 0.24 + flap);
    const bx = x + sd * 6, by = y - 62, len = 64 - f * 9;
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(ang - sd * 0.5) * len * 0.6, by + Math.sin(ang - sd * 0.5) * len * 0.6, bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
    ctx.quadraticCurveTo(bx + Math.cos(ang + sd * 0.25) * len * 0.5, by + Math.sin(ang + sd * 0.25) * len * 0.5 + 10, bx + sd * 4, by + 12);
    ctx.closePath(); ctx.fillStyle = "rgba(255,248,230," + (0.55 - f * 0.08) + ")"; ctx.fill();
  }
  // The body: a long robe of light, falling to a point below (it does not stand: it is borne).
  ctx.beginPath(); ctx.moveTo(x - 6, y - 64); ctx.quadraticCurveTo(x - 15, y - 30, x - 9, y + 2); ctx.quadraticCurveTo(x, y + 14, x + 9, y + 2); ctx.quadraticCurveTo(x + 15, y - 30, x + 6, y - 64); ctx.closePath();
  ctx.fillStyle = "rgba(255,252,240,0.95)"; ctx.fill();
  circle(x, y - 71, 6.5, "#fffdf6"); ring(x, y - 73, 10, "rgba(255,226,150,0.85)", 1.4);
  // The arm reaching down to the top of his head (and holding him, going up).
  const reach = clamp((A.t - (ANG.down - 0.5)) / 0.7, 0, 1), hx = lerp(x + 10, mx - cam.x, reach), hy = lerp(y - 40, my - cam.y - HT - 1, reach);
  ctx.beginPath(); ctx.moveTo(x + 4, y - 56); ctx.quadraticCurveTo(x + 14, y - 44, hx, hy); ctx.strokeStyle = "rgba(255,250,236,0.95)"; ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();
}
// Over everything: the words, and the white.
function drawAngelOver() {
  const A = S.angel;
  if (A.t > ANG.take - 0.4) {
    const a = clamp((A.t - ANG.take + 0.4) / 0.8, 0, 1);
    text("\u201cThe angel of the Lord took him by the top of his head.\u201d", W / 2, H * 0.18, { align: "center", font: FONT.line, italic: true, size: 16, color: "#fff6e2", alpha: a, glow: "rgba(0,0,0,0.8)", blur: 10, max: W - 40 });
    text("DANIEL 14:35", W / 2, H * 0.18 + 18, { align: "center", size: 8, weight: 700, spacing: 3, color: "rgba(255,236,200,0.8)", alpha: a, glow: "rgba(0,0,0,0.8)", blur: 8 });
  }
  if (A.t > ANG.white) rect(0, 0, W, H, "rgba(255,252,244," + clamp((A.t - ANG.white) / (ANG.home - ANG.white - 0.3), 0, 1) + ")");
}
// Home: what he brought, kept (not from the white room); the mountain higher and harder the next
// time; his place on it forgotten (it is climbed). Then the morning at home.
function finishWon() {
  const r = { dom: NOV.domain, m: metres(S.top), binned: S.binned || 0, cast: S.cast, read: S.read, relics: S.relics, room: !!NOV.room, freed: bankFreed() };
  if (!NOV.room) {
    save.climbs = save.climbs || {}; save.climbs[NOV.domain] = (save.climbs[NOV.domain] || 0) + 1; r.climbs = save.climbs[NOV.domain];
    save.bricks = save.bricks || {}; save.bricks[NOV.domain] = (save.bricks[NOV.domain] || 0) + r.binned; r.bricks = save.bricks[NOV.domain];
    store(); forget(NOV.domain);
  }
  ev("carried home", { dom: r.dom, m: r.m, binned: r.binned });
  S.angel = null; S.won = null;
  if (typeof Home !== "undefined") Home.show(r); else Game.toNovitiate();
}
const hauntWait = (g) => 6 + Math.random() * 4 - 0.6 * (g.tier - 1);
const canDread = () => !S.dread && !S.boonShow && !S.latched && !S.dying && !S.verseHold && !S.act;
// Any of it within the view (grown by m on every side; m < 0, well inside it).
function onView(g, m) {
  const c = S.cam;
  return g.x + g.hw > c.x - m && g.x - g.hw < c.x + W + m && g.y > c.y - m && g.y - g.ht < c.y + H + m;
}
function greatSays() {
  if (!S.greatSeen) { S.greatSeen = true; tip("greatSeen", { text: "A GREAT DEMON", sub: "It moves only while you face it in the light, and it throws. Only a block can hurt it; strike it, and the block is torn from your rope.", t: 0 }); }
}
function startDread(g, kind, from) {
  S.dread = { g, kind, t: 0, T: DREAD_T[kind], from: from || null };
  Sound.fx.dread(kind === "meet" ? 1 : 0.85, panX(g.x), kind === "burst"); Sound.muffle(true, 0.05);
  ev(kind === "meet" ? "a great demon met" : "a great demon burst after him", { tier: g.tier, k: g.sec });
}
function stepDread(dt) {
  const D = S.dread; D.t += dt;
  if (D.t < D.T) return;
  S.dread = null; Sound.muffle(false, 0.6);
  const g = D.g; g.lostT = 0;
  if (D.kind !== "meet" && !g.summit) g.throwT = 0;          // (come round behind him: it throws at once)
  if (D.kind === "meet") greatSays();
  else if (!S.hauntSeen) { S.hauntSeen = true; tip("hauntSeen", { text: "IT FOLLOWS YOU", sub: "Leave it behind, and it comes after you. Cast it down, or read a verse, and it follows no further.", t: 0 }); }
}
// Where it comes in, bursting after him: at the edge of the view, the way he left it, by his back
// if it can be, in the open (each way round the edge tried, and the best taken).
function burstSpot(g) {
  const cam = S.cam, [mx, my] = middle(), ax = g.x - mx, ay = g.y - g.ht / 2 - my, al = Math.hypot(ax, ay) || 1;
  const x0 = cam.x + g.hw + 14, x1 = cam.x + W - g.hw - 14, y0 = cam.y + g.ht / 2 + 10, y1 = cam.y + H - g.ht / 2 - 6;
  let best = null;
  for (let k = 0; k < 48; k++) {
    const a = k / 48 * TAU, ux = Math.cos(a), uy = Math.sin(a);
    const tx = ux > 1e-6 ? (x1 - mx) / ux : ux < -1e-6 ? (x0 - mx) / ux : 1e9, ty = uy > 1e-6 ? (y1 - my) / uy : uy < -1e-6 ? (y0 - my) / uy : 1e9, tt = Math.min(tx, ty);
    if (!(tt > 0) || tt > 1e8) continue;
    const ex = mx + ux * tt, ey = my + uy * tt, sp = dFree(ex, ey + g.ht / 2, g.hw, g.ht); if (!sp) continue;
    const qx = sp[0], qy = sp[1] - g.ht / 2, d = dist(qx, qy, mx, my); if (d < 150) continue;
    const score = (ux * ax + uy * ay) / al * 2 + (sign(qx - S.x) === -S.dir ? 0.8 : 0) - dist(qx, qy, ex, ey) / 60;
    if (!best || score > best.score) best = { x: sp[0], y: sp[1], ux, uy, score };
  }
  return best;
}
function burstAfter(g) {
  const sp = burstSpot(g); if (!sp) return false;
  const from = [sp.x + sp.ux * 190, sp.y + sp.uy * 190];       // (from just past the edge: its rush is seen coming in)
  Object.assign(g, { x: sp.x, y: sp.y, kx: 0, ky: 0, vx: 0, vy: 0, st: "stone", t: 0, wake: 0, lostT: 0, wait: hauntWait(g), bursts: (g.bursts || 0) + 1, dir: sign(S.x - sp.x) || 1, ghostT: 0, stuckT: 0 });
  startDread(g, "burst", from);
  return true;
}
// Drawn over everything (the world held still under it): the dark closing in, and it, flashing.
function drawDread(cam) {
  const D = S.dread, g = D.g, t = D.t, fade = clamp(t / 0.05, 0, 1) * clamp((D.T - t) / 0.2, 0, 1);
  rect(0, 0, W, H, "rgba(3,1,1," + (0.66 * fade) + ")");
  const keep = [g.x, g.y, g.wake, g.anim, g.hurtT, g.st];
  const at = (q) => (D.from ? [lerp(D.from[0], keep[0], q), lerp(D.from[1], keep[1], q)] : [keep[0], keep[1]]);
  g.wake = 1; g.hurtT = 0; g.st = "hunt"; g.anim = keep[3] + t * 4;
  // Bursting in: the shapes of its rush, fading behind it.
  if (D.from && t < 0.5) for (let q = 6; q >= 1; q--) {
    [g.x, g.y] = at(smooth(clamp((t - q * 0.04) / 0.26, 0, 1)));
    paintMaw(mawParts(g), greatT(g, cam), 1, 0, (1 - q / 7) * 0.6 * clamp(1 - (t - 0.26) / 0.24, 0, 1), 0);
  }
  [g.x, g.y] = at(D.from ? smooth(clamp(t / 0.26, 0, 1)) : 1);
  const T = greatT(g, cam), c = T(0, 42), white = [0, 0.27, 0.54].some((q) => t >= q && t < q + 0.085);
  glow(c[0], c[1], 95 * g.sc, "#7a1408", 0.45 * fade);
  ctx.save(); const j = (1 - clamp(t / 0.5, 0, 1)) * 3; ctx.translate((Math.random() - 0.5) * j, (Math.random() - 0.5) * j);
  paintMaw(mawParts(g), T, 1, 1, fade, white ? 0.9 : 0);
  for (const [u, v, r] of MAW_EYES) { const [x, y] = T(u, v); glow(x, y, 18 * r * g.sc, "#ff2a12", 0.95 * fade); circle(x, y, 1.3 * r * g.sc, "rgba(255,236,210," + fade + ")"); }
  ctx.restore();
  [g.x, g.y, g.wake, g.anim, g.hurtT, g.st] = keep;
  if (t < 0.05) rect(0, 0, W, H, "rgba(255,244,232,0.45)");
}

// Drawing. Its parts in its own frame (u forward, v up from its foot), each with a tone: k the
// darkest, d dark, m its body, l the light along its edges, x the throat, t the teeth, e the eyes.
// As stone, grey and cracked; awake, its flesh is near black, with Gluttony's colour along its
// edges where the torch catches it, the throat red, the teeth bone.
const MAW_STONE = { k: "#2b2927", d: "#3d3a37", m: "#55524d", l: "#7b766e", x: "#232120", t: "#6b665f", e: "#5b2b22" };
const MAW_FLESH = { k: "#0a0403", d: "#130705", m: "#221009", l: "#f09a4a", x: "#5a0d06", t: "#f3e9d2", e: "#ff3b1f" };
const MAW_EYES = [[14.4, 76.6, 1], [7.8, 77.8, 0.8]];
const MAW_CRACKS = [[[-10, 70], [-4, 66], [-6, 60], [0, 55], [-2, 48]], [[6, 86], [9, 80], [7, 77]], [[-14, 40], [-7, 36], [-9, 28], [-3, 22]], [[10, 47], [14, 41], [12, 33], [15, 28]], [[18, 80], [13, 73], [16, 68]], [[-12, 76], [-6, 79], [-7, 84]], [[2, 54], [6, 46], [2, 40], [5, 34]], [[-15, 52], [-10, 48], [-16, 44]]];
function mawParts(g, latched) {
  const w = smooth(g.wake), A = g.anim, P = [], add = (tone, pts) => { P.push(tone, pts); };
  const limb = (p, q, wa, wb) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; return [[p[0] + nx * wa, p[1] + ny * wa], [q[0] + nx * wb, q[1] + ny * wb], [q[0] - nx * wb, q[1] - ny * wb], [p[0] - nx * wa, p[1] - ny * wa]]; };
  const claws = (tone, e, h, n, len, spread, curl) => {
    const a0 = Math.atan2(h[1] - e[1], h[0] - e[0]);
    for (let i = 0; i < n; i++) {
      const an = a0 + (i - (n - 1) / 2) * spread, m = [h[0] + Math.cos(an) * len * 0.6, h[1] + Math.sin(an) * len * 0.6], b = an + curl, tip = [m[0] + Math.cos(b) * len * 0.5, m[1] + Math.sin(b) * len * 0.5], px = -Math.sin(an) * 1.1, py = Math.cos(an) * 1.1;
      add(tone, [[h[0] + px, h[1] + py], [m[0] + px * 0.6, m[1] + py * 0.6], tip, [m[0] - px * 0.6, m[1] - py * 0.6], [h[0] - px, h[1] - py]]);
    }
  };
  const oval = (cx, cy, rx, ry, n, f) => { const o = []; for (let i = 0; i < n; i++) { const an = i / n * TAU, k = f ? f(an) : 1; o.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return o; };
  const rim = (cx, cy, rx, ry, a0, a1, th) => { const o = []; for (let k = 0; k <= 8; k++) { const an = lerp(a0, a1, k / 8); o.push([cx + Math.cos(an) * rx, cy + Math.sin(an) * ry]); } for (let k = 8; k >= 0; k--) { const an = lerp(a0, a1, k / 8); o.push([cx - th * 0.4 + Math.cos(an) * (rx - th), cy - th * 0.5 + Math.sin(an) * (ry - th)]); } return o; };
  if (latched) {
    // Over him: its head swollen round his head and shoulders, its jaws about his waist; its body
    // going up and back from it, its tail streaming; its arms about his legs.
    const t = S.rt, gulp = 1 + 0.06 * Math.sin(t * 7), B = g.bulge, bk = B ? Math.sin(clamp(B.t / 0.3, 0, 1) * PI) : 0;
    for (let i = 0; i < 3; i++) {
      const L = [], R = [], r0 = [-20 + i * 3, 84 - i * 3], len = 22 - i * 4;
      for (let s = 0; s <= 6; s++) { const k = s / 6, wv = Math.sin(A * 3.4 + i * 1.9 + k * 4) * 3.5 * k, ww = (4 - i * 0.8) * (1 - k * 0.9), cu = r0[0] - (10 + i * 3) * k + wv, cv = r0[1] + len * k; L.push([cu - ww * 0.7, cv - ww * 0.7]); R.unshift([cu + ww * 0.7, cv + ww * 0.7]); }
      add(i === 1 ? "m" : "d", L.concat(R));
    }
    add("k", limb([-12, 34], [-11, 18], 3.2, 2.6)); claws("k", [-12, 30], [-10, 13], 3, 7, 0.25, 0.6);
    add("m", [[-12, 48], [-18, 58], [-22, 70], [-24, 82], [-19, 88], [-11, 81], [-3, 69], [8, 57]]);
    add("d", [[-12, 48], [-18, 58], [-22, 70], [-18, 69], [-11, 57]]);
    add("l", [[-24, 82], [-19, 88], [-11, 81], [-3, 69], [8, 57], [6.5, 55.8], [-4.2, 67.4], [-11.6, 78.8], [-18.6, 85.6]]);
    add("m", oval(2, 36, 18, 21 * gulp, 22, (an) => 1 + (B ? 0.35 * bk * Math.pow(Math.max(0, Math.cos(an - B.a)), 6) : 0)));
    add("l", rim(2, 36, 18, 21 * gulp, 0.35, 1.45, 1.6));
    add("k", [[-17, 20], [19, 20], [18, 16], [-16, 16]]);
    for (let i = 0; i < 8; i++) { const u0 = -15 + i * 4.4, L = 4 + 2.5 * hash2(i, 9, 13); add("t", [[u0, 17], [u0 + 3, 17], [u0 + 1.5, 17 - L]]); }
    add("k", [[5, 51.5], [19, 49], [19.5, 47], [5, 49]]);
    add("k", oval(13.5, 45.5, 3.2, 2.8, 10)); add("k", oval(7, 46.8, 2.6, 2.3, 10));
    add("e", oval(13.9, 45.5, 2.4, 2.1, 10)); add("e", oval(7.4, 46.8, 1.9, 1.7, 10));
    add("m", limb([16, 34], [14, 17], 3.4, 2.8)); claws("m", [16, 29], [12, 11], 4, 8, 0.3, -0.7);
    return P;
  }
  const fk = g.flingT > 0 ? Math.sin((1 - g.flingT / 0.35) * PI) : 0;      // (flinging a block back)
  const lk = laughK(g), shk = g.laugh ? Math.sin(g.laugh.t * 30) : 0;         // (laughing: the near claw holding the block up, the far one on its belly)
  const arm = (tone, sh, back) => {
    const wv = Math.sin(A * 5 + (back ? 2 : 0));
    let el = [lerp(6, 18, w) - (back ? 6 : 0) + 4 * fk, lerp(40, 52, w) + wv * 1.5 * w + 8 * fk], hd = [lerp(8, 34, w) - (back ? 7 : 0) + 12 * fk, lerp(26, 58, w) + wv * 2.5 * w + 16 * fk];
    if (lk) { const E = back ? [4, 40] : [12, 76], Hd = back ? [14, 43 + shk] : [LAUGH_HAND[0] - 2, LAUGH_HAND[1] - 8 + shk]; el = [lerp(el[0], E[0], lk), lerp(el[1], E[1], lk)]; hd = [lerp(hd[0], Hd[0], lk), lerp(hd[1], Hd[1], lk)]; }
    add(tone, limb(sh, el, 3.4, 2.8)); add(tone, limb(el, hd, 2.8, 2.2)); claws(tone, el, hd, 4, lerp(7, 10, w), lerp(0.16, 0.38, w), lerp(0.25, -0.5, w));
  };
  arm("k", [-8, 57], true);
  // The tail: three wisps trailing down and back from under it, stirring as it moves.
  for (let i = 0; i < 3; i++) {
    const L = [], R = [], r0 = [-8 + i * 7, 26 - i * 2], len = 28 - i * 4;
    for (let s = 0; s <= 6; s++) { const k = s / 6, wv = Math.sin(A * 3.4 + i * 1.9 + k * 4) * 4 * k, ww = (5 - i) * (1 - k * 0.9), cu = r0[0] - (10 + i * 4) * k * k + wv, cv = r0[1] - len * k; L.push([cu - ww, cv]); R.unshift([cu + ww, cv]); }
    add(i === 1 ? "m" : "d", L.concat(R));
  }
  // The belly, sagging; its underside in shadow; the light along its upper edge.
  const B = oval(-1, 38, 18, 18, 18, (an) => (Math.sin(an) < 0 ? 1 - 0.1 * Math.sin(an) : 1));
  add("m", B); add("d", B.filter((p) => p[1] < 31).concat([[-15, 30]]));
  add("l", rim(-1, 38, 18, 18, 0.3, 1.9, 2.4));
  add("m", [[-14, 46], [-13, 60], [10, 62], [15, 47]]);
  // The jaw, hinged at the back of the head: shut, as stone; wide, awake (and working, as it chews;
  // and wider, laughing, in bursts).
  const h0 = P.length;
  const ga = lerp(w * (0.6 + 0.1 * Math.sin(A * 6.5)) + (g.chew > 0 ? 0.35 * Math.abs(Math.sin(g.chew * 16)) : 0), 0.95 + 0.3 * Math.abs(Math.sin((g.laugh ? g.laugh.t : 0) * 15)), lk), Hu = -8, Hv = 60, ca = Math.cos(ga), sa = Math.sin(ga);
  const J = (u, v) => { const du = u - Hu, dv = v - Hv; return [Hu + du * ca + dv * sa, Hv - du * sa + dv * ca]; };
  if (ga > 0.03) { add("x", [[-8, 61], [2, 62], [14, 63], [25, 64], J(24, 63), J(12, 62.5), J(0, 62), J(-8, 61)]); add("k", [[-7, 61], [5, 62.2], J(5, 62), J(-7, 61)]); }
  add("m", [J(-9, 61), J(24, 63), J(22, 58), J(12, 53), J(-4, 54), J(-11, 57)]);
  add("d", [J(22, 58), J(12, 53), J(-4, 54), J(4, 56.5), J(16, 57)]);
  const tl = w;
  if (tl > 0.02) for (let i = 0; i < 6; i++) { const u0 = i * 4, L = (3.5 + 2.5 * hash2(i, 7, 13) + (i === 5 ? 2 : 0)) * tl; add("t", [J(u0, 62.4), J(u0 + 2.6, 62.6), J(u0 + 1.2, 62.5 + L)]); }
  // The head: a dome over the jaws, the crown catching the light, the back of it in shadow.
  add("m", [[-12, 58], [-15, 68], [-12, 79], [-4, 86], [8, 87], [17, 82], [23, 75], [26, 69], [25, 64], [14, 63], [2, 62], [-8, 61]]);
  add("l", [[-12, 79], [-4, 86], [8, 87], [17, 82], [15, 80.5], [7, 84.5], [-4, 83.5], [-10, 77.5]]);
  add("d", [[-12, 58], [-15, 68], [-13, 72], [-10, 64], [-6, 60]]);
  if (tl > 0.02) for (let i = 0; i < 7; i++) { const u0 = -2 + i * 4, L = (4 + 3 * hash2(i, 8, 13) + (i >= 5 ? 3 : 0)) * tl, ve = 61.6 + i * 0.4; add("t", [[u0, ve], [u0 + 2.8, ve + 0.2], [u0 + 1.3, ve - L]]); }
  // The brow: level, as stone; drawn down hard over the eyes, awake. The eyes: lidded, then wide.
  const b0 = [6, lerp(80.2, 83, w)], b1 = [20, lerp(79.6, 75.6, w)];
  add("k", [[b0[0], b0[1] - 1.4], [b1[0] + 1, b1[1] - 1.2], [b1[0], b1[1] + 1.4], [b0[0], b0[1] + 1.8]]);
  add("k", oval(14, 76.6, 3.2, lerp(1.8, 2.8, w), 10)); add("k", oval(7.4, 77.8, 2.6, lerp(1.5, 2.3, w), 10));
  add("e", oval(14.4, 76.6, lerp(2.2, 2.4, w), lerp(0.7, 2.1, w) * (1 - 0.7 * lk), 10)); add("e", oval(7.8, 77.8, lerp(1.7, 1.9, w), lerp(0.55, 1.7, w) * (1 - 0.7 * lk), 10));
  // (Laughing, the whole head thrown back about its neck.)
  const tilt = headTilt(g); if (tilt) for (let i = h0 + 1; i < P.length; i += 2) P[i] = P[i].map(tilt);
  arm("m", [-2, 56], false);
  return P;
}
// Its frame on the screen: leaning into its way as it wakes, bobbing as it floats (still, as stone).
function greatT(g, cam) {
  const lk = laughK(g), sc = g.sc, d = g.dir, th = 0.2 * smooth(g.wake) - 0.28 * lk, c = Math.cos(th), s = Math.sin(th), j = g.st === "dying" ? 3.5 * clamp(g.t / 0.7, 0, 1) : g.hurtT > 0 ? 2 * g.hurtT / 0.3 : 0;
  const ox = g.x - cam.x + (Math.random() - 0.5) * j, oy = g.y - cam.y - Math.sin(g.anim * 3.2) * 2.5 * sc + (Math.random() - 0.5) * j - (g.laugh ? Math.abs(Math.sin(g.laugh.t * 15)) * 2.5 * sc * lk : 0);
  return (u, v) => { const dv = v - 40, ru = u * c + dv * s, rv = -u * s + dv * c + 40; return [ox + d * ru * sc, oy - rv * sc]; };
}
// Laughing: how far into it (in and out again); its head's turn back about the neck; where its claw holds the block up.
const LAUGH_T = 1.15, LAUGH_HAND = [20, 104];
const laughK = (g) => (g.laugh ? smooth(clamp(g.laugh.t / 0.18, 0, 1)) * clamp((LAUGH_T - g.laugh.t) / 0.15, 0, 1) : 0);
function headTilt(g) {
  const k = laughK(g); if (!k) return null;
  const a = 0.55 * k, c = Math.cos(a), s = Math.sin(a), pu = -6, pv = 56;
  return (q) => { const du = q[0] - pu, dv = q[1] - pv; return [pu + du * c - dv * s, pv + du * s + dv * c]; };
}
const latchFrame = (g, mx, my, cam) => { const d = S.dir || 1, k = 1 + 0.06 * (g.tier - 1); return (u, v) => [mx - cam.x + d * u * k, my - cam.y - v * k]; };
function paintMaw(P, T, w, lit, al, flash) {
  const all = new Path2D();
  for (let i = 1; i < P.length; i += 2) addPoly(all, P[i], T);
  const pa = ctx.globalAlpha; ctx.globalAlpha = pa * al;
  ctx.fillStyle = C.ink; ctx.fill(all);
  if (lit > 0.02) {
    ctx.globalAlpha = pa * al * clamp(lit, 0, 1);
    let cur = null, p = null;
    const flush = () => { if (p) { ctx.fillStyle = mix(MAW_STONE[cur], MAW_FLESH[cur], w); ctx.fill(p); } };
    for (let i = 0; i < P.length; i += 2) { if (P[i] !== cur) { flush(); cur = P[i]; p = new Path2D(); } addPoly(p, P[i + 1], T); }
    flush();
  }
  if (flash > 0) { ctx.globalAlpha = pa * al * flash; ctx.fillStyle = "#ffffff"; ctx.fill(all); }
  ctx.globalAlpha = pa;
}
function drawGreat(g, cam) {
  if (g.st === "latch") return;                  // (drawn over him, with him)
  if (S.dread && S.dread.g === g) { g.T = null; return; }
  const cx = g.x, cy = g.y - g.ht / 2;
  if (cx < cam.x - 140 || cx > cam.x + W + 140 || cy < cam.y - 160 || cy > cam.y + H + 160) { g.T = null; return; }
  const [lx, ly] = S.torch, R = lightR();
  g.lit += ((dist(lx, ly, cx, cy) < R * 0.95 + g.ht * 0.3 && [0.15, 0.5, 0.85].some((q) => los(lx, ly, cx, g.y - g.ht * q))) - g.lit) * 0.15;
  const T = (g.T = greatT(g, cam)), w = smooth(g.wake), al = g.st === "dying" ? clamp(1 - (g.t - 0.75) / 0.35, 0, 1) : 1;
  paintMaw(mawParts(g), T, w, g.lit, al, g.laugh ? 0.6 * laughK(g) * (0.5 + 0.5 * Math.sin(g.laugh.t * 30)) : g.hurtT > 0 ? 0.8 * g.hurtT / 0.3 : 0);
  // As stone: its cracks (more of them, the more it has been struck).
  if (g.lit > 0.05 && w < 0.95) {
    const n = Math.min(MAW_CRACKS.length, 3 + 2 * (g.maxHp - g.hp));
    ctx.save(); ctx.globalAlpha *= clamp(g.lit, 0, 1) * (1 - w) * al; ctx.lineJoin = "miter";
    for (let i = 0; i < n; i++) { const pts = MAW_CRACKS[i].map((q) => T(q[0], q[1])); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]); ctx.strokeStyle = "#1e1c1a"; ctx.lineWidth = 1.1 * g.sc; ctx.stroke(); }
    ctx.restore();
  }
}
// Over him, taken in: its head over his, his legs kicking under it.
function drawLatch(g, mx, my, cam) {
  const T = (g.T = latchFrame(g, mx, my, cam));
  paintMaw(mawParts(g, true), T, 1, 1, 1, g.hurtT > 0 ? 0.5 * g.hurtT / 0.12 : 0);
}
// Over the dark: its eyes, red, that show where it is in the dark (faint, as stone; burning,
// awake); its cracks glowing while it is stunned; the blows it has left in it; and, holding him,
// his light through its flesh.
function greatGlows(cam) {
  for (const g of S.bigs) {
    const T = g.T; if (!T) continue;
    const w = g.st === "latch" ? 1 : smooth(g.wake), al = g.st === "dying" ? clamp(1 - (g.t - 0.6) / 0.4, 0, 1) : 1;
    if (g.st === "latch") {
      const k = clamp(S.fuel * 2, 0.15, 1), [x, y] = T(2, 36);
      glowOval(x, y, 26 * k + 8, 30 * k + 8, C.flame, (0.22 + 0.06 * Math.sin(S.rt * 9)) * k);
      for (const [u, v, r] of [[13.9, 45.5, 1], [7.4, 46.8, 0.8]]) { const [ex, ey] = T(u, v); glow(ex, ey, 15 * r, "#ff2a12", 0.85); circle(ex, ey, 1.1 * r, "rgba(255,236,210,0.95)"); }
      continue;
    }
    const tilt = headTilt(g);
    for (const [u0, v0, r] of MAW_EYES) {
      const [u, v] = tilt ? tilt([u0, v0]) : [u0, v0], [x, y] = T(u, v);
      glow(x, y, (6 + 11 * w) * r * g.sc, "#ff2a12", (0.28 + 0.6 * w) * al);
      circle(x, y, (0.7 + 0.5 * w) * r * g.sc, w > 0.4 ? "rgba(255,236,210," + (w * al) + ")" : "rgba(255,80,50," + (0.55 * al) + ")");
    }
    if ((g.stunT > 0 && g.st !== "hunt") || g.st === "dying") {
      // Stunned (or breaking): its cracks lit from within.
      const k = g.st === "dying" ? clamp(g.t / 0.6, 0, 1) * al : clamp(g.stunT / 0.6, 0, 1) * (0.7 + 0.3 * Math.sin(S.rt * 12)), n = g.st === "dying" ? MAW_CRACKS.length : Math.min(MAW_CRACKS.length, 3 + 2 * (g.maxHp - g.hp));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k; ctx.lineJoin = "miter";
      for (let i = 0; i < n; i++) { const pts = MAW_CRACKS[i].map((q) => T(q[0], q[1])); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]); ctx.strokeStyle = SINS[g.sin].color; ctx.lineWidth = 1.4 * g.sc; ctx.stroke(); }
      ctx.restore();
      const [cx, cy] = T(0, 42); glow(cx, cy, 30 * g.sc, SINS[g.sin].color, 0.25 * k);
    }
    if (g.showHp > 0 && g.st !== "dying") { const a = Math.min(1, g.showHp), [hx, hy] = T(4, 96); for (let k = 0; k < g.maxHp; k++) circle(hx - (g.maxHp - 1) * 4 + k * 8, hy, 2.6, k < g.hp ? hexA(SINS[g.sin].color, a) : "rgba(40,40,46," + a + ")"); }
  }
}
