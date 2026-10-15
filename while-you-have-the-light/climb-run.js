"use strict";
// While You Have the Light, the climb (2 of 7): starting and the end, his place on a mountain kept,
// a scene from the white room, the relics' boons; the hook, Avarice's chains, the rope round the
// rock, and the flare.

// ---- Starting, and the end -------------------------------------------------------------------------
// opts.nov: the novitiate ({ domain, demons, torch, flare }); otherwise the climb itself.
function start(opts) {
  opts = opts || {};
  NOV = opts.nov ? Object.assign({}, opts.nov) : null;
  seed = opts.seed || (Math.random() * 1e9) | 0; rows = new Map(); slots = new Map(); walls.length = 0; secs.length = 0;
  // (A place kept on Gluttony's mountain as it was made before its maps: from the foot, on the new mountain.)
  if (opts.resume && opts.resume.v === 2) { forget(NOV.domain); opts = Object.assign({}, opts, { resume: null, seed: undefined }); seed = (Math.random() * 1e9) | 0; }
  const r = seeded(seed); wallPh = [r() * TAU, r() * TAU, r() * TAU];
  // Where the summit is: as asked; or as kept with his place; or (a place kept before there were
  // summits) above the place kept.
  if (NOV && !NOV.room && opts.resume && !NOV.summitK) {
    const R = opts.resume;
    if (Number.isInteger(R.summitK) && R.summitK % 8 === 7) NOV.summitK = R.summitK;
    else if (Number.isFinite(R.y) && R.y < 0) { NOV.summitK = Infinity; NOV.summitK = summitAbove(sectionAt(Math.max(1, Math.floor(-R.y / CELL))).k); }
  }
  if (NOV && !NOV.summitK) NOV.summitK = SUMMIT_K + 8 * (NOV.climbs || 0);       // (higher each time it has been climbed)
  const e = edges(-2), x = (e.L + e.R + 1) / 2 * CELL;
  S = {
    x, y: -0.01, vx: 0, vy: 0, dir: 1, ground: true, cling: 0, clingT: 0, landT: 0, anim: 0, act: null,
    rope: null, shot: null, climbing: false, climbPh: 0, throwT: 0, throwA: 0, ropeVis: [], shotVis: [],
    fuel: 1, t: 0, rt: 0, top: 0, read: 0, dying: 0, level: 0,
    flare: { on: false, t: 0, n: 0 }, parts: [], ghosts: [], verse: null,
    cam: { x: clamp(x - W / 2, 0, COLS * CELL - W), y: 70 - H }, torch: [x, -50], light: null,
    touches: new Map(), keys: {}, hooked: 0, hintT: 0, lastDraw: 0, flip: null, next: null, hangT: 0, jumpT: 0, wall: 0,
    demons: [], things: [], held: null, atk: null, popK: 0, ids: 0, cast: 0, respawnT: 0, hurtT: 0, invT: 0, flashT: 0, floatT: 0, shake: 0, fightSeen: false, fightHintT: 0, meter: 1, kickCd: 0, swingKickT: 0, hang: null, ward: null, crosses: [],
    crumbling: [], relics: 0, mark: null, grease: [], say: null, tint: null, pulled: null, coins: 0, freedList: [],
    blocks: [], tied: null, yank: null, blockSeen: false, binned: 0, dragging: false, bigs: [], latched: null, prints: [], greatDown: new Set(), foot: null, kept: null, keptAt: null,
  };
  if (!tipsOn() || tipSeen("climbLesson")) { S.hintT = 99; S.hooked = 9; }   // (the climbing lesson: once on the device)
  REC = { snaps: [], events: [], next: 0 };
  if (NOV && !NOV.room) {                           // (a scene from the white room keeps nothing, and leaves every kept place alone)
    for (const d of Object.keys(keptAll())) if (d !== NOV.domain) forget(d);      // (one mountain at a time: going to another, he leaves the last)
    if (!opts.resume) forget(NOV.domain);
    else try { restore(opts.resume); } catch (e) { forget(NOV.domain); return start({ nov: opts.nov }); }   // (a kept place spoiled: from the foot)
  }
  mode = M;
  Sound.play(SONGS.arena); Sound.setLevel(0); Sound.ambience({ wind: 0.7 }); Sound.flare(false); Sound.muffle(false);
}
function metres(px) { return Math.max(0, Math.floor(px / MPX)); }
// The sections that have any rows between heights h0 and h1.
function sectionsIn(h0, h1) {
  const out = []; let s = sectionAt(Math.max(1, Math.floor(h0)));
  while (s.h0 <= h1) { out.push(s); ensureSecs(s.k + 1); s = secs[s.k + 1]; }
  return out;
}
const lampsOf = (sec) => (sec.type === "cave" ? cave(sec).lamps : sec.type === "trav" && sec.gate ? trav(sec).lamps : []);
function lightOut() {
  ev("the light went out");
  if (NOV && !NOV.room) forget(NOV.domain);         // (the light gone out, the place he kept is gone with it)
  // (And the mountain's demons follow him down: the next time he goes home, they come for the house.)
  if (NOV && !NOV.room && save.house) { const was = save.house.raid, n = Math.min(7, 3 + ((save.climbs && save.climbs[NOV.domain]) || 0)); save.house.raid = { dom: NOV.domain, n: was ? Math.min(8, Math.max(was.n, n) + 1) : n }; store(); }
  S.dying = 0.001; S.fuel = 0; endFlare(true);
  Sound.fx.death(); Sound.setLevel(0);
}
// Those freed from the idols on this climb go down to the monastery, whatever became of him.
function bankFreed() {
  if ((NOV && NOV.room) || !S.freedList || !S.freedList.length) return 0;
  const n = S.freedList.length; save.pilgrims = (save.pilgrims || []).concat(S.freedList).slice(-60); S.freedList = []; return n;
}
function finish() {
  const m = metres(S.top);
  if (!NOV && m > (save.climbBest || 0)) save.climbBest = m;
  S.freedN = bankFreed();
  store();
  Over.t = 0; mode = Over; Sound.muffle(true, 0.6);
}

// ---- His place on a mountain, kept ------------------------------------------------------------------
// In the seven mountains, each mountain keeps the last place he came to: a lamp he lit, a verse he
// read (kept where he last stood on firm ground before it), the cart he brought a block to; never
// lower than a place already kept on the same climb (fallen, what he does below is kept with the
// higher place). Leaving the mountain any way but by the light going out (to the title, to another
// mountain, the page closed), he goes on from there the next time he climbs it: the same mountain,
// what he carried, what he had done below (the lamps lit, the verses read, the relics taken, the
// blocks in the carts, the great demons cast down). The light going out, the place is forgotten.
const KEEP = "wyhtl-mountains", SEEN = ["legsSeen", "crawlSeen", "fightSeen", "blockSeen", "tiedSeen", "handSeen", "carrySeen", "riseSeen", "greatSeen", "latchSeen", "hurlSeen", "shedSeen", "hauntSeen", "freedSeen", "boonSeen"];
const keptAll = () => { try { const o = JSON.parse(localStorage.getItem(KEEP) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } };
function forget(dom) { const all = keptAll(); if (!all[dom]) return; delete all[dom]; try { localStorage.setItem(KEEP, JSON.stringify(all)); } catch (e) { } Kept.wrote(KEEP); }
Kept.watch(KEEP);
function keepPlace(x, y, why) {
  if (!NOV || NOV.room || S.dying || !Number.isFinite(x) || !Number.isFinite(y)) return;
  if (S.keptAt && y > S.keptAt[1] + CELL) [x, y] = S.keptAt;
  const walls = [], lamps = [], got = [], bins = {}, seen = {};
  for (let n = 0; n < 5000; n++) { const w = wallAt(n); if (w.h > S.top / CELL + 40) break; if (w.read) walls.push(n); }
  for (const sec of secs) {
    lampsOf(sec).forEach((L, i) => { if (L.lit) lamps.push([sec.k, i]); });
    if ((sec.type === "cave" && sec.info) || sec.crawl) relicsOf(sec).forEach((R, i) => { if (R.got) got.push([sec.k, i]); });
    const G = sec.gate && sec.type === "trav" ? brotherOf(sec) : null;
    if (G && G.bin.length) bins[sec.k] = G.bin.map((b) => [b.shape, b.dom]);
  }
  for (const k of SEEN) if (S[k]) seen[k] = true;
  const all = keptAll();
  all[NOV.domain] = { v: 1, seed, summitK: NOV.summitK, x: Math.round(x * 10) / 10, y: Math.round(y * 100) / 100, m: metres(-y), why, top: Math.round(Math.max(S.top, -y)), read: S.read, cast: S.cast, relics: S.relics, binned: S.binned, blockK: S.blockK,
    coins: S.coins || 0, freed: S.freedList, fuel: r2(S.fuel), meter: r2(S.meter), walls, lamps, got, bins, greatDown: [...S.greatDown], tied: S.tied ? [S.tied.shape, S.tied.dom] : null, seen, at: Date.now() };
  try { localStorage.setItem(KEEP, JSON.stringify(all)); } catch (e) { return; }
  Kept.wrote(KEEP);
  S.keptAt = [x, y]; S.kept = { t: S.rt }; ev("place kept", { why, m: metres(-y) });
}
// (Where he last stood firm: he may be reading a verse from the rope, or the rock.)
function keepHere(why) { const p = S.ground && !S.latched ? [S.x, S.y] : S.foot || S.keptAt; if (p) keepPlace(p[0], p[1], why); }
// Going on from a kept place: the mountain as he left it below him, he and what he carried there.
function restore(R) {
  // (Should the rock there have changed since, in a later making of the game: the nearest open
  // place; and if there is none, the foot of the mountain, as if nothing had been kept.)
  const at = Number.isFinite(R.x) && Number.isFinite(R.y) && R.y < 0 ? freeSpot(R.x, R.y) : null;
  if (!at) { forget(NOV.domain); return; }
  S.x = at[0]; S.y = at[1]; S.vx = 0; S.vy = 0; S.ground = boxHit(S.x, S.y + 3); S.dir = 1; S.keptAt = [S.x, S.y]; S.foot = S.ground ? [S.x, S.y] : null;
  S.top = Math.max(R.top || 0, -R.y); S.read = R.read || 0; S.cast = R.cast || 0; S.relics = R.relics || 0; S.binned = R.binned || 0; S.blockK = Number.isInteger(R.blockK) ? R.blockK : undefined; S.coins = R.coins || 0;
  S.freedList = Array.isArray(R.freed) ? R.freed.filter((q) => Array.isArray(q) && SINS[q[0]]).slice(0, 60) : [];
  if (Number.isFinite(R.fuel)) S.fuel = clamp(R.fuel, 0.25, 1);
  if (Number.isFinite(R.meter)) S.meter = clamp(R.meter, 0, 1);
  for (const n of R.walls || []) if (Number.isInteger(n) && n >= 0 && n < 5000) wallAt(n).read = true;
  const secAt = (k) => (Number.isInteger(k) && k >= 0 && k < 4000 ? (ensureSecs(k), secs[k]) : null);
  for (const [k, i] of R.lamps || []) { const sec = secAt(k), L = sec && lampsOf(sec)[i]; if (L) L.lit = true; }
  for (const [k, i] of R.got || []) { const sec = secAt(k), Rl = sec && relicsOf(sec)[i]; if (Rl) Rl.got = true; }
  for (const key of Object.keys(R.bins || {})) {
    const sec = secAt(+key), G = sec && brotherOf(sec); if (!G) continue;
    for (const [shape, dom] of R.bins[key]) { const b = makeBlock(shape, dom); Object.assign(b, { st: "bin", by: G, slot: G.bin.length }); G.bin.push(b); S.blocks.push(b); }
  }
  S.greatDown = new Set((R.greatDown || []).filter(Number.isInteger));
  for (const k of SEEN) if (R.seen && R.seen[k]) S[k] = true;
  if (R.tied && R.tied[0]) { const b = makeBlock(R.tied[0], R.tied[1]); b.x = S.x - 18; b.y = S.y; S.blocks.push(b); b.st = "tied"; b.rope = TETHER; S.tied = b; }
  S.blockSeen = S.blockSeen || S.binned > 0 || !!S.tied;
  settle(); S.resumed = true;
  S.say = { text: "GOING ON", sub: "From where you last stopped, " + metres(-S.y) + " m up.", t: 0 };
  ev("went on from a kept place", { why: R.why, m: metres(-S.y) });
}  // Set down where he is now, the mountain below him as if he had climbed it. Only from just below
// him are the demons and the idols set out; and where the great ones wait is worked out from the
// foot, as it was the first time, so the mountain above is the same.
function settle() {
  const k0 = sectionAt(Math.max(1, Math.floor(-S.y / CELL))).k;
  S.popK = Math.max(0, k0 - 1);
  // (Older kept places did not keep blockK: with a block found already, from here.)
  if (S.blockK === undefined && S.blockSeen) S.blockK = S.popK;
  S.greatN = 0;
  for (let k = 0; k < S.popK; k++) { ensureSecs(k); if (planGreat(k)) { S.greatK = k; S.greatN++; } }
  S.cam.x = clamp(S.x - W / 2, 0, COLS * CELL - W); S.cam.y = S.y - H * 0.62; S.torch = [S.x, S.y - 40];
  S.hintT = 99; S.hooked = 9; S.invT = 1.5;
  if (S.fightSeen) S.fightHintT = 99;              // (the moves told him once already)
}

// ---- A scene from the white room ---------------------------------------------------------------------
// A place on a mountain made to order: which mountain, how high, what kind of place; what waits for
// him there (demons beside him, a great demon); what he has (a block on his rope, a relic's power,
// so much light). Nothing of it is kept, and no place kept on any mountain is touched.
const SCENE_PLACE = { shaft: ["shaft"], crossing: ["trav", "cave", "slope"] };
function scene(sc) {
  sc = sc || {};
  const dom = BUILT.includes(sc.mountain) ? sc.mountain : "gluttony";
  start({ nov: { domain: dom, demons: clamp(Math.round(+sc.demons || 0), 0, 3), torch: !!sc.endlessTorch, flare: !!sc.endlessFlare, room: true }, seed: sc.seed });
  for (const k of SEEN) S[k] = true;                // (he knows the mountain: no lessons on the way)
  S.fightHintT = 99; S.hintT = 99; S.hooked = 9;
  // The place: the first of the kind asked for at that height or above it, with ground to stand on.
  const h = clamp((+sc.metres || 0) * MPX / CELL, 0, 9000), want = SCENE_PLACE[sc.place];
  ensureSecs(NOV.summitK); const su = secs[NOV.summitK];
  const top = !!sc.summit || h >= su.h0 - 2;             // (asked for the top, or for higher than it)
  // (None of that kind near the height asked: any kind.)
  const k0 = h < 4 || top ? 0 : sectionAt(Math.floor(h)).k;
  let spot = null;
  // On the summit: by the last shaft's mouth, under the arch, the greatest demon across from him.
  if (top) { const sd = hash2(NOV.summitK, 995, seed) < 0.5 ? -1 : 1, i = su.c - sd * 12; spot = [(i + 0.5) * CELL, -(su.h0 + summitG(i, su)) * CELL - 0.01]; S.dir = sd; }
  for (const kinds of k0 ? [want, null] : []) for (let k = k0; k < k0 + 6 && !spot; k++) {
    ensureSecs(k); const sec = secs[k];
    if (sec.gate || (kinds && !kinds.includes(sec.type))) continue;
    const sp = spotsFor(k, dom); if (sp.length) spot = sp[Math.floor(sp.length / 3)];
  }
  if (spot) {
    const at = freeSpot(spot[0], spot[1]) || [spot[0], spot[1]];
    S.x = at[0]; S.y = at[1]; S.ground = boxHit(S.x, S.y + 3); S.foot = S.ground ? [S.x, S.y] : null;
    S.top = -S.y; settle();
  }
  const kHere = sectionAt(Math.max(1, Math.floor(-S.y / CELL))).k, side = (q) => (q % 2 ? -1 : 1) * S.dir;
  if (Number.isFinite(+sc.torch)) S.fuel = clamp(+sc.torch, 0.05, 1);
  if (Number.isFinite(+sc.flare)) S.meter = clamp(+sc.flare, 0, 1);
  // Demons beside him: one side and the other, a little farther each; on the floor he stands on
  // where there is room on it (not over a pit), wherever there is room if not.
  let q = 0;
  const onFloor = (D, x) => solidAt(x, S.y + 4) && solidAt(x - D.hw + 2, S.y + 4) && solidAt(x + D.hw - 2, S.y + 4) && !boxAt(x, S.y - 0.5, D.hw, D.ht) && los(S.x, S.y - 20, x, S.y - 20);
  for (const N of Array.isArray(sc.near) ? sc.near.slice(0, 4) : []) {
    const sin = DEM[N && N.sin] ? N.sin : dom, D = DEM[sin];
    for (let i = 0; i < clamp(Math.round(+N.count || 1), 1, 6); i++, q++) {
      let x = null;
      for (let d = 70 + 34 * Math.floor(q / 2); d < 360 && x === null; d += 12) for (const sd of [side(q), -side(q)]) if (x === null && onFloor(D, S.x + sd * d)) x = S.x + sd * d;
      const y = x === null ? S.y - 2 : S.y - 0.01; if (x === null) x = S.x + side(q) * (80 + 34 * Math.floor(q / 2));
      const f = spawnDemon(sin, x, y, x - 120, x + 120, kHere);
      if (f) { f.dir = sign(S.x - f.x) || 1; f.cd = 1.2 + Math.random(); }
    }
  }
  // A great demon, a little way off, on the side he faces: as stone until he looks at it in his light.
  const tier = top ? 0 : clamp(Math.round(+sc.great || 0), 0, 4);
  if (tier) {
    const G = GREAT.gluttony, gs = 1 + 0.2 * (tier - 1), hw = G.hw * gs, ht = G.ht * gs;
    let at = null;
    for (const d of [190, 150, 240, 120, 300, 90]) for (const sd of [S.dir, -S.dir]) if (!at) at = dFree(S.x + sd * d, S.y - 20, hw, ht);
    if (!at) at = dFree(S.x, S.y - HT - ht, hw, ht);
    if (at) S.bigs.push({ sin: "gluttony", tier, sc: gs, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir: sign(S.x - at[0]) || 1, hp: tier, maxHp: tier, st: "stone", t: 0, wake: 0, lit: 0,
      anim: Math.random() * 9, stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: kHere, id: ++S.ids, growlT: -9, stoneT: -9 });
  }
  // A block tied to his belt (always, with a great demon: only a block can hurt it).
  if (sc.block || tier || top) {
    const b = makeBlock(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)], dom); b.x = S.x - S.dir * 18; b.y = S.y;
    S.blocks.push(b); b.st = "tied"; b.rope = TETHER; S.tied = b;
  }
  if (BOONS[sc.boon]) showBoon(sc.boon);
  S.say = { text: String(sc.title || "THE SCENE").toUpperCase().slice(0, 40), sub: SINS[dom].name + ", " + metres(-S.y) + " m up.", t: 0 };
  ev("a scene from the white room", { dom, m: metres(-S.y), tier, near: q });
}


// ---- The relics' boons ---------------------------------------------------------------------------------
// Each reliquary fills the torch and the flare, and gives a gift for a while, the four by turns:
// the world stops a moment, and he turns to us and holds it up to be seen (a little Alleluia
// sung); then it is his while it lasts. A Double Portion (Elisha's of Elijah's spirit, 2 Kings
// 2:9): every blessing counts twice; the ward turns two blows, and comes back when spent.
// Unconsumed (the bush that burned and was not burnt, Exodus 3:2): no blow dims the torch, nor a
// great demon's mouth, and its light reaches farther. The Flying Friar (St Joseph of Cupertino, who rose in prayer):
// he falls slowly, and swings high. Vade Retro (St Benedict's medal): no demon can come near him.
const BOONS = {
  double: { name: "A DOUBLE PORTION", sub: "Every blessing counts twice: your ward turns two blows, and comes back.", T: 90 },
  unconsumed: { name: "UNCONSUMED", sub: "The torch burns, yet nothing can dim it; and its light reaches farther.", T: 90 },
  friar: { name: "THE FLYING FRIAR", sub: "Light as a feather: you fall slowly, and swing high.", T: 75 },
  vade: { name: "VADE RETRO", sub: "St Benedict\u2019s medal: no demon can come near you.", T: 60 },
};
const BOON_ORDER = ["double", "unconsumed", "friar", "vade"], BOON_SHOW = 2.8, VADE_R = 92, FRIAR_FALL = 230;
const boonOf = (n) => BOON_ORDER[(Math.floor(hash2(7, 77, seed) * 4) + n) % 4];
const boonOn = (k) => !!S && !!S.boon && S.boon.kind === k;
function showBoon(kind) {
  upFromCrawl();
  S.boonShow = { kind, t: 0, T: BOON_SHOW, up: null };
  Sound.fx.boon(); ev("a relic", { boon: kind });
}
function stepBoonShow(dt) {
  const B = S.boonShow; B.t += dt;
  if (B.t >= B.T) { S.boonShow = null; grantBoon(B.kind); }
}
function grantBoon(kind) {
  const D = BOONS[kind]; if (!D) return;
  S.boon = { kind, t: 0, T: D.T, regrow: 0 };
  S.say = { text: D.name, sub: D.sub, t: 0.6 };
  if (kind === "double") S.ward = { t: 0, n: 2 };
  if (kind === "vade") S.ward = { t: 0, n: Math.max(1, S.ward ? S.ward.n || 1 : 1) };
  S.boonSeen = true; ev("a boon", { kind });
}
function stepBoon(dt) {
  const B = S.boon; B.t += dt;
  if (B.kind === "double") {
    // (Spent, the ward comes back: a layer at a time.)
    if (!S.ward || (S.ward.n || 1) < 2) {
      B.regrow += dt;
      if (B.regrow > 2.5) { B.regrow = 0; if (S.ward) S.ward.n = 2; else S.ward = { t: 0, n: 1 }; const [cx, cy] = middle(); S.crosses.push({ kind: "ward", x: cx + S.dir * 18, y: cy - 10, t: 0, size: 16 }); Sound.fx.kindle(0.6); }
    } else B.regrow = 0;
    if (S.ward) S.ward.t = 0;
  } else if (B.kind === "vade") {
    if (!S.ward) S.ward = { t: 0, n: 1 }; S.ward.t = 0;
    vadeRetro(dt);
  } else if (B.kind === "friar" && Math.random() < 0.12) {
    S.parts.push({ kind: "spark", c: "#f3ead6", x: S.x + (Math.random() - 0.5) * 16, y: S.y - Math.random() * 40, vx: (Math.random() - 0.5) * 24, vy: 12 + Math.random() * 14, life: 1.2, age: 0, real: true });
  }
  if (B.t >= B.T) {
    S.boon = null; Sound.fx.boonEnd(); ev("a boon ended", { kind: B.kind });
    // (Its ward lingers a while after it, and fades as any ward does.)
    if (S.ward && (B.kind === "double" || B.kind === "vade")) { S.ward.n = 1; S.ward.t = WARD_T - 10; }
  }
}
// St Benedict's medal: any demon that comes near him is driven back, and what is thrown at him
// turned away before it reaches him.
function vadeRetro(dt) {
  const [mx, my] = middle();
  for (const f of S.demons) {
    if (!alive(f) || f.idol) continue;
    const [cx, cy] = dMid(f); if (dist(cx, cy, mx, my) > VADE_R + f.hw) continue;
    // (Pressed outward all the while it is inside the ring, as by a wind; and struck back now and then.)
    moveBox(f, (sign(cx - mx) || 1) * 150 * dt, 0, f.hw, f.ht);
    if ((f.vadeT || 0) > S.rt) continue;
    f.vadeT = S.rt + 0.9;
    hurtDemon(f, 0.5, (sign(cx - mx) || 1) * 280, -200, "hurl");
    S.crosses.push({ kind: "turn", x: cx, y: cy, t: 0, size: 18 }); Sound.fx.parry();
  }
  for (const o of S.things) {
    if (o.by !== "demon" || o.st !== "fly" || dist(o.x, o.y, mx, my) > VADE_R) continue;
    o.by = null; o.vx = (sign(o.x - mx) || 1) * Math.max(120, Math.abs(o.vx) * 0.6); o.vy = -160;
    S.crosses.push({ kind: "turn", x: o.x, y: o.y, t: 0, size: 14 });
  }
}
function vadeGreat(g) {
  const s = sign(g.x - S.x) || -S.dir;
  g.kx = s * 220; g.ky = -60; g.stunT = Math.max(g.stunT, 1.2); g.st = "stone"; g.t = 0; g.hurtT = 0.2;
  S.crosses.push({ kind: "smite", x: g.x, y: g.y - g.ht / 2, t: 0, size: 24 }); Sound.fx.stone(panX(g.x)); Sound.fx.parry();
  ev("the medal drove back a great demon");
}
// What each boon is held up as: a medallion of gold, with its sign on it. Two crosses for the
// double portion; the flame in the bush; a feather; St Benedict's cross, with the four letters
// of its quarters as four points.
function drawToken(kind, x, y, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  glow(x, y, r * 3.2, C.gold, 0.45);
  circle(x, y, r, "#8a6420"); circle(x, y, r * 0.84, "#ecc874");
  const ink = "#5e3f0c", w = Math.max(1, r * 0.17);
  ctx.fillStyle = ink; ctx.lineCap = "round";
  if (kind === "double") {
    for (const u of [-0.32, 0.32]) { line(x + u * r, y - 0.5 * r, x + u * r, y + 0.52 * r, ink, w); line(x + u * r - 0.22 * r, y - 0.17 * r, x + u * r + 0.22 * r, y - 0.17 * r, ink, w); }
  } else if (kind === "unconsumed") {
    ctx.beginPath(); ctx.moveTo(x, y - 0.62 * r); ctx.quadraticCurveTo(x + 0.44 * r, y - 0.05 * r, x + 0.16 * r, y + 0.26 * r); ctx.quadraticCurveTo(x, y + 0.36 * r, x - 0.16 * r, y + 0.26 * r); ctx.quadraticCurveTo(x - 0.44 * r, y - 0.05 * r, x, y - 0.62 * r); ctx.fill();
    for (const u of [-0.42, 0, 0.42]) line(x, y + 0.62 * r, x + u * r, y + 0.3 * r, ink, w * 0.8);
  } else if (kind === "friar") {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.55);
    ctx.beginPath(); ctx.moveTo(0, -0.7 * r); ctx.quadraticCurveTo(0.42 * r, -0.1 * r, 0.04 * r, 0.52 * r); ctx.quadraticCurveTo(-0.32 * r, -0.05 * r, 0, -0.7 * r); ctx.fill();
    line(0.04 * r, 0.5 * r, 0.1 * r, 0.76 * r, ink, w * 0.7); line(0, -0.55 * r, 0.04 * r, 0.48 * r, "#ecc874", w * 0.45);
    ctx.restore();
  } else {
    line(x, y - 0.62 * r, x, y + 0.62 * r, ink, w * 1.3); line(x - 0.62 * r, y - 0.04 * r, x + 0.62 * r, y - 0.04 * r, ink, w * 1.3);
    for (const [u, v] of [[-0.36, -0.38], [0.36, -0.38], [-0.36, 0.34], [0.36, 0.34]]) circle(x + u * r, y + v * r, Math.max(0.6, r * 0.09), ink);
  }
  ctx.restore();
}
// Him, turned to us, holding it up: the hood's arch with the shadow in it, the habit falling to
// his feet, one arm raised high (its wide sleeve fallen back to the elbow) with what he holds up,
// the other holding the torch out at his side. Lit at the edges from the torch, and from above by
// what he holds. (x, y): his feet; s: the side the torch is on; t: the time since he turned.
// Returns the torch's tip, the hand that holds the torch, and the hand that is raised.
function drawMonkFront(x, y, s, t) {
  const up = smooth(clamp(t / 0.35, 0, 1)), at = (u, v) => [x + s * u, y + v];
  const P = (pts) => { const p = new Path2D(), a = at(pts[0][0], pts[0][1]); p.moveTo(a[0], a[1]); for (let i = 1; i < pts.length; i++) { const b = at(pts[i][0], pts[i][1]); p.lineTo(b[0], b[1]); } p.closePath(); return p; };
  const hx = lerp(-10, -6.5, up), hy = lerp(-24, -60, up), ex = lerp(-10.5, -11.8, up), ey = lerp(-17, -46, up);
  const body = P([[-9.2, -1], [-4, 0.4], [4, 0.4], [9.2, -1], [7.5, -14], [8, -26], [7.6, -32.5], [3.8, -35.8], [-3.8, -35.8], [-7.6, -32.5], [-8, -26], [-7.5, -14]]);
  const hood = P([[-6.8, -33.5], [-7.7, -38.6], [-6.8, -43.4], [-4, -46.2], [0, -47.2], [4, -46.2], [6.8, -43.4], [7.7, -38.6], [6.8, -33.5], [0, -32]]);
  const arm = P([[-7.2, -33.2], [ex - 2.2, ey], [hx - 1.9, hy + 1.2], [hx + 1.9, hy + 1.6], [ex + 2.1, ey + 1.2], [-4.2, -30.6]]);
  const sleeve = P([[-8, -33], [ex - 3.6, ey + 3], [ex + 3.2, ey + 5.8], [-3.4, -29.6]]);
  const tarm = P([[7.2, -33.2], [12.6, -37.4], [14.6, -44.6], [12.4, -45.2], [10.6, -39.6], [4.4, -30.6]]);
  const tsleeve = P([[7.9, -33], [13.6, -36.2], [12.8, -40.8], [4, -29.6]]);
  const feet = new Path2D(); feet.ellipse(x - 3.3, y - 0.8, 2.8, 1.5, 0, 0, TAU); feet.ellipse(x + 3.3, y - 0.8, 2.8, 1.5, 0, 0, TAU);
  const hand = new Path2D(), [hhx, hhy] = at(hx, hy); hand.arc(hhx, hhy, 1.9, 0, TAU);
  const all = [body, hood, sleeve, arm, tarm, tsleeve, feet, hand];
  const tb = at(13.4, -40), tt = at(15.6, -57);
  const pa = ctx.globalAlpha;
  for (const [dx, dy, c, a] of [[s * 1.3, -0.6, MONK_RIM2, 0.3], [s * 0.7, -0.3, MONK_RIM, 1], [-s * 0.4, -1.2 * up, C.gold, 0.6 * up]]) {
    ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha = pa * a; ctx.fillStyle = c; for (const p of all) ctx.fill(p); ctx.restore();
  }
  ctx.globalAlpha = pa; ctx.fillStyle = MONK_INK; for (const p of all) ctx.fill(p);
  line(tb[0], tb[1], tt[0], tt[1], MONK_INK, 1.7);
  // In the hood's shadow, the faintest warm edge of a cheek on the torch's side.
  const [cx, cy] = at(2.3, -39.4); ctx.globalAlpha = pa * 0.45; ctx.fillStyle = MONK_RIM2; ctx.beginPath(); ctx.ellipse(cx, cy, 1.1, 2.6, s * 0.2, 0, TAU); ctx.fill(); ctx.globalAlpha = pa;
  return { torch: tt, hand: at(13.2, -44.2), up: [hhx, hhy] };
}
// Over all (the world stopped): the dark round him, what he holds up shining, its rays turning,
// and under him, its name and what it gives.
function drawBoonShow(cam) {
  const B = S.boonShow, D = BOONS[B.kind], t = B.t, a = clamp(t / 0.3, 0, 1) * clamp((B.T - t) / 0.35, 0, 1);
  const fx = S.drawX - cam.x, fy = S.drawY - cam.y;
  const vg = ctx.createRadialGradient(fx, fy - 30, 60, fx, fy - 30, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (0.55 * a) + ")"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const lift = smooth(clamp(t / 0.35, 0, 1)), [ux, uy] = B.up || [fx, fy - 60], tx = ux, ty = uy - 9.5;
  if (lift > 0.05) {
    const fa = clamp((B.T - t) / 0.35, 0, 1);
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * 0.7, l = (18 + 8 * Math.sin(t * 6 + i * 1.7)) * lift; ctx.globalAlpha = 0.45 * fa; line(tx + Math.cos(an) * 11, ty + Math.sin(an) * 11, tx + Math.cos(an) * (11 + l), ty + Math.sin(an) * (11 + l), C.gold, 1.3); }
    ctx.globalAlpha = 1;
    drawToken(B.kind, tx, ty, 8 * (0.55 + 0.45 * lift), lift * fa);
  }
  const ny = clamp(fy + 34, 132, H - 30);
  text(D.name, W / 2, ny, { align: "center", font: FONT.title, size: 15, weight: 700, spacing: 4, color: C.gold, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 8 });
  text(D.sub, W / 2, ny + 16, { align: "center", size: 8.5, weight: 600, color: "#e9e6df", alpha: a * 0.9, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 60 });
}
// While one lasts: the medal's ring of light about him, and its crosses going round.
function boonGlows(cam) {
  if (!boonOn("vade")) return;
  const [mx, my] = middle(), x = mx - cam.x, y = my - cam.y, B = S.boon, k = clamp((B.T - B.t) / 2, 0.3, 1) * (0.75 + 0.25 * Math.sin(S.rt * 5));
  glow(x, y, VADE_R * 1.1, C.gold, 0.08 * k);
  ctx.globalAlpha = 0.35 * k; ring(x, y, VADE_R, C.gold, 1.2); ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) { const an = S.rt * 0.9 + i * TAU / 4, cx = x + Math.cos(an) * VADE_R, cy = y + Math.sin(an) * VADE_R; ctx.globalAlpha = 0.8 * k; line(cx, cy - 4, cx, cy + 4, C.gold, 1.4); line(cx - 3, cy - 1, cx + 3, cy - 1, C.gold, 1.4); ctx.globalAlpha = 1; }
}

// ---- The hook --------------------------------------------------------------------------------------
// Where a line from (x, y) at angle a first meets rock, if within lim.
function rayRock(x, y, a, lim) {
  const ux = Math.cos(a), uy = Math.sin(a);
  for (let d = 6; d <= (lim || HOOK); d += 3) if (solidAt(x + ux * d, y + uy * d)) return d;
  return 0;
}
// The line nearest to a0 (within 24 degrees) that meets rock within lim: [angle, distance].
function nearLine(gx, gy, a0, lim, spread) {
  for (let k = 0; k <= spread; k++) for (const sg of k ? [-1, 1] : [1]) {
    const a = a0 + sg * k * 0.052, d = rayRock(gx, gy, a, lim);
    if (d) return [a, d];
  }
  return null;
}
// ---- Avarice's chains -------------------------------------------------------------------------------
// Hung from beams across a gallery's roof. The hook takes one as it takes rock, and he swings from
// its beam (the chain and the rope one line); let go, and it swings on by itself, and settles.
function chainsNear() {
  const out = [];
  for (const sec of sectionsIn(-S.y / CELL - 40, -S.y / CELL + 40)) if (sec.type === "trav" && MINE[sec.dom]) for (const c of trav(sec).chains || []) out.push(c);
  return out;
}
const chainTip = (c) => [c.x + Math.sin(c.ang || 0) * c.len, c.y + Math.cos(c.ang || 0) * c.len];
function onSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, u = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); return [ax + dx * u, ay + dy * u, u]; }
// A chain the throw meets: tapped on (near enough), or the line of it passing through the chain
// before it would reach the rock. Where on it, and how far.
function chainHit(gx, gy, a, rockD, tx, ty) {
  let best = null; const ux = Math.cos(a), uy = Math.sin(a), lim = Math.min(rockD || 1400, 1400);
  for (const c of chainsNear()) {
    if (S.rope && S.rope.chain === c) continue;
    const [ex, ey] = chainTip(c), q = onSeg(tx, ty, c.x, c.y, ex, ey);
    if (dist(tx, ty, q[0], q[1]) < 22 && q[2] > 0.12 && los(gx, gy, q[0], q[1])) { const d = dist(gx, gy, q[0], q[1]); if (!best || !best.tapped || d < best.d) best = { c, x: q[0], y: q[1], d, tapped: true }; continue; }
    if (best && best.tapped) continue;
    for (let t = 8; t < lim; t += 4) { const px = gx + ux * t, py = gy + uy * t, r = onSeg(px, py, c.x, c.y, ex, ey); if (dist(px, py, r[0], r[1]) < 6 && r[2] > 0.1) { if (!best || t < best.d) best = { c, x: r[0], y: r[1], d: t }; break; } }
  }
  return best;
}
// The chains swinging: the one he hangs from in line with his rope; the rest as pendulums, settling.
function swingChains(dt) {
  const [gx, gy] = grip();
  for (const c of chainsNear()) {
    if (S.rope && S.rope.chain === c) { const a = Math.atan2(gx - c.x, gy - c.y); c.av = (a - (c.ang || 0)) / Math.max(dt, 1e-3); c.ang = a; continue; }
    c.av = ((c.av || 0) - GRAV / c.len * Math.sin(c.ang || 0) * dt) * (1 - 0.7 * dt); c.ang = (c.ang || 0) + c.av * dt;
  }
}
// He throws it: it flies in an arc to the rock. The throw forgives a little: if the line
// misses rock near him, the nearest line within 24 degrees that meets rock near him is taken
// instead (so a tap just past a ledge still finds the ledge). Only then does it go on along the
// line, as far as it must, to the first rock it meets. Tapped far off, it goes straight there.
function throwHook(tx, ty) {
  if (!upFromCrawl()) { Sound.fx.tick(420, 0.3); return; }
  if (S.hang) S.hang = null;
  const [gx, gy] = grip(), a0 = Math.atan2(ty - gy, tx - gx), far = dist(gx, gy, tx, ty) > HOOK;
  const got = (far && nearLine(gx, gy, a0, HOOK_FAR, 0)) || nearLine(gx, gy, a0, HOOK, 8) || nearLine(gx, gy, a0, HOOK_FAR, 0) || nearLine(gx, gy, a0, HOOK_FAR, 8);
  let a = got ? got[0] : a0, d = got ? got[1] : 0, chain = null;
  const ch = chainHit(gx, gy, a0, d, tx, ty);
  if (ch && (!d || ch.d <= d + 2 || ch.tapped)) { chain = ch.c; d = ch.d; a = Math.atan2(ch.y - gy, ch.x - gx); }
  const L = d || HOOK, ux = Math.cos(a), uy = Math.sin(a);
  const T = 0.08 + Math.min(L, HOOK) / HOOK_V + Math.max(0, L - HOOK) / HOOK_V_FAR;
  S.shot = { ox: gx, oy: gy, tx: gx + ux * L, ty: gy + uy * L, ux, uy, hit: !!d, chain, t: 0, T, lift: chain ? 0 : Math.min(L, HOOK) * 0.22 * Math.abs(ux), x: gx, y: gy, ph: "fly" };
  S.shotVis = [];
  S.throwT = 0.32; S.throwA = a; if (Math.abs(ux) > 0.15 && !S.flip) S.dir = sign(ux);
  Sound.fx.throw(0.45);
}
function flyShot(dt) {
  const sh = S.shot;
  if (sh.ph === "fly") {
    sh.t += dt; const k = Math.min(1, sh.t / sh.T);
    sh.x = lerp(sh.ox, sh.tx, k); sh.y = lerp(sh.oy, sh.ty, k) - Math.sin(PI * k) * sh.lift;
    if (k < 1) return;
    if (sh.hit && sh.chain) {
      // Into a chain: he swings from its beam, the chain and the rope one line.
      const c = sh.chain, [gx, gy] = grip();
      S.rope = { x: c.x, y: c.y, len: clamp(dist(gx, gy, c.x, c.y), ROPE_MIN, 9999), bends: [], fixed: 0, hx: sh.tx, hy: sh.ty, chain: c, along: Math.max(12, dist(c.x, c.y, sh.tx, sh.ty)) };
      S.ropeVis = S.shotVis; S.shot = null; S.hooked++; lessonDone(); Sound.fx.tether(); Sound.fx.chain(panX(c.x));
      return;
    }
    if (sh.hit) {
      const [gx, gy] = grip();
      // The hook bites at the rock's face: the rope runs from just outside it, never through it.
      let hx = sh.tx, hy = sh.ty; for (let k = 0; k < 8 && solidAt(hx, hy); k++) { hx -= sh.ux * 1; hy -= sh.uy * 1; }
      S.rope = { x: hx, y: hy, len: Math.max(ROPE_MIN, dist(gx, gy, hx, hy)), bends: [], fixed: 0, hx: sh.tx, hy: sh.ty };
      S.ropeVis = S.shotVis; S.shot = null; S.hooked++; lessonDone();
      wrapRope(S.rope, gx, gy); if (freeOf(S.rope) < ROPE_MIN * 0.5) S.rope.len = (S.rope.fixed || 0) + Math.max(ROPE_MIN * 0.5, dist(gx, gy, pivotOf(S.rope).x, pivotOf(S.rope).y));
      Sound.fx.tether(); if (S.rope.len > ROPE_MAX + 60) Sound.fx.whoosh(0.5);
      for (let q = 0; q < 5; q++) S.parts.push({ kind: "chip", x: sh.tx, y: sh.ty, vx: (Math.random() - 0.5) * 120 - sh.ux * 60, vy: (Math.random() - 0.5) * 120 - sh.uy * 60, life: 0.4, age: 0 });
    } else { sh.ph = "drop"; sh.t = 0; sh.vx = sh.ux * 160; sh.vy = sh.uy * 160; }
    return;
  }
  sh.t += dt;
  if (sh.ph === "drop") { sh.vy += 900 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; if (sh.t > 0.3 || solidAt(sh.x, sh.y)) { sh.ph = "back"; sh.t = 0; sh.bx = sh.x; sh.by = sh.y; } return; }
  const [gx, gy] = grip(), k = Math.min(1, sh.t / (sh.T || 0.28));
  sh.x = lerp(sh.bx, gx, ease(k)); sh.y = lerp(sh.by, gy, ease(k));
  if (k >= 1) S.shot = null;
}
// The one button: let go of the rope, or leap off the wall.
// Letting go of the rope: with all the swing's speed (at the top of a swing, a flip and a moment
// hung in the air). The hook comes free and flies back to his hand, ready to be thrown again.
const flipDur = (f) => f.dur || (f.half ? 0.4 : 0.6);
function dropRope(quick) {
  const R = S.rope; if (!R) return;
  const P = pivotOf(R);
  S.rope = null; S.climbing = false; Sound.fx.tetherBreak();
  S.shot = { ph: "back", t: 0, T: quick ? 0.14 : 0.28, bx: P.x, by: P.y, x: P.x, y: P.y }; S.shotVis = S.ropeVis; S.ropeVis = [];
  if (S.ground) return;
  // (For the flip, the swing's speed over the last moment, not this instant's: at the top of a
  // good swing he is all but still, and that is just where a flip is wanted.)
  const sp = Math.hypot(S.vx, S.vy);
  if (quick) {
    if (Math.max(sp, S.swingSp || 0) > 80) { S.vy -= 60; S.flip = { t: 0, s: sign(S.vx || S.dir), dur: SWAP_FLIP, swap: true }; Sound.fx.whoosh(0.6); }
    return;
  }
  if (sp > 110) { S.vy -= 90; S.flip = { t: 0, s: sign(S.vx || S.dir) }; Sound.fx.whoosh(0.6); }
  if (Math.abs(S.vy) < 170 && sp > 60) S.hangT = 0.3;
}
// Swinging, a tap on fresh rock. Hanging still: the hook goes out at once to where the tap
// was (he drops a little as it flies). With speed in the swing: he lets go and flips over the
// way he is going, light as he turns; then hangs in the air a moment, all but still; then
// throws the hook up at 45 degrees on the side of him the tap was (by then he has flown past
// the place tapped, so the place itself would send it behind him). Mid-flip he takes hold of
// nothing.
const SWAP_FLIP = 0.38, HOVER_T = 0.2, HOVER_THROW = 0.05;
const sideOf = (tx) => sign(tx - S.x) || (S.flip ? S.flip.s : S.dir);
// Which way a tap while swinging sends him: the side of him it was on, as he was when it was made
// (not a moment later, when he may have swung past it); and a tap near straight above him, on
// whichever side, the way he is going.
const tapSide = (tx) => (Math.abs(tx - S.x) < 70 && Math.abs(S.vx) > 40 ? sign(S.vx) : sideOf(tx));
function swapHook(tx, ty, side) {
  dropRope(true);
  if (S.flip) S.next = { side: side || tapSide(tx), t: SWAP_FLIP + HOVER_THROW };
  else { S.shot = null; throwHook(tx, ty); }
}
function nextHook(dt) {
  const n = S.next;
  if (S.dying || S.cling || S.hang || S.act || S.atk || S.held || S.rope || S.hurtT > 0) { S.next = null; return; }
  if ((n.t -= dt) > 0) return;
  S.next = null; S.shot = null;
  const [gx, gy] = grip(), a = hookAngle(gx, gy, n.side); throwHook(gx + Math.cos(a) * 100, gy + Math.sin(a) * 100);
}
// The throw after the flip: up and on, the way chosen, at whatever angle finds rock to swing from:
// the underside of rock (a roof, not a wall's face, which would only draw him against the wall),
// at a good length for a swing (not so near that he is pulled up against it), near forty-five
// degrees if all else is equal. If nothing is in reach, forty-five, and the long throw.
function hookAngle(gx, gy, side) {
  let best = null, bs = -1e9;
  for (const deg of [45, 38, 52, 30, 60, 24, 68, 76]) {
    const e = deg * PI / 180, a = Math.atan2(-Math.sin(e), side * Math.cos(e)), d = rayRock(gx, gy, a, HOOK + 40);
    if (!d) continue;
    const hx = gx + Math.cos(a) * d, hy = gy + Math.sin(a) * d, roof = !solidAt(hx, hy + 7);
    const sc = (d < 110 ? -400 : -Math.abs(d - 220)) + (roof ? 120 : 0) - Math.abs(deg - 42) * 1.5;
    if (sc > bs) { bs = sc; best = a; }
  }
  return best === null ? Math.atan2(-1, side) : best;
}
// ---- The tips -----------------------------------------------------------------------------------
// A tip, the first time something is met: the world holds still while it is read, and a tap (or
// any key) goes on. Each is shown once on this device; all of them can be turned off (the pause
// screen), and turned on again, which shows them all again.
const tipsOn = () => !save.tipsOff;
const tipSeen = (key) => !!(save.seen.tips && save.seen.tips[key]);
function tip(key, say) {
  if (!tipsOn() || tipSeen(key)) return false;
  S.say = Object.assign(say, { tip: key }); S.tipHold = key; Sound.muffle(true, 0.3);
  return true;
}
function tipGone() {
  const key = S.tipHold; if (!key) return;
  save.seen.tips = save.seen.tips || {}; save.seen.tips[key] = true; store();
  S.tipHold = null; if (S.say && S.say.tip) S.say.t = Math.max(S.say.t, 2.4);
  if (key === "fightSeen") S.fightHintT = 99;
  S.touches.clear(); Sound.muffle(false, 0.3);
}
// The climbing lesson at the start (not held: it waits for him to hook twice), once on the device.
function lessonDone() { if (S.hooked >= 2 && !tipSeen("climbLesson")) { save.seen.tips = save.seen.tips || {}; save.seen.tips.climbLesson = true; store(); } }
function setTips(on) { save.tipsOff = !on; if (on) save.seen.tips = {}; store(); }
function action() {
  if (!S || S.dying || S.act) return;
  if (S.crawl) { upFromCrawl(); return; }
  if (S.hang) { S.hang = null; S.ground = false; return; }
  if (S.next) { S.next = null; return; }           // mid-flip: he lets the next throw go
  if (!S.tied && S.ground) { const G = cartAt(S.x, S.y, true); if (G && unbin(G)) return; }
  if (S.tied && S.tied.st === "hand") { const b = S.tied; b.st = "tied"; b.vx = S.dir * 40; b.vy = -30; Sound.fx.brickDrop(panX(b.x), 0.4); return; }   // the block in his hands: he sets it down
  if (S.rope && !S.ground) dropRope();
  else if (S.cling) {
    const s = S.cling; S.cling = 0; S.vx = -s * 210; S.vy = -360; S.dir = -s; S.flip = { t: 0, s: -s, half: true }; Sound.fx.kick(0.6);
  } else if (S.held && !S.atk) {
    const o = S.held; S.held = null; o.st = "fly"; o.by = null; o.vx = S.dir * 60; o.vy = -40; o.g = o.kind === "fire" || o.kind === "thorn" ? 0 : 560; o.x = S.x + S.dir * 14; o.age = 0; o.life = 1.5;
    if (o.kind !== "fire") Sound.fx.objHit("stone", 0);
  } else if (S.rope) dropRope();
}
// The rope as it hangs: a chain of points, falling, held at both ends, never longer than the rope.
function hangRope(P, ax, ay, bx, by, len, dt) {
  const N = 14, seg = len / (N - 1);
  if (P.length !== N) { P.length = 0; for (let k = 0; k < N; k++) { const x = lerp(ax, bx, k / (N - 1)), y = lerp(ay, by, k / (N - 1)); P.push({ x, y, px: x, py: y }); } }
  const g = 900 * dt * dt;
  if (dt > 0) for (let k = 1; k < N - 1; k++) { const p = P[k], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g; if (solidAt(p.x, p.y)) { p.x = p.px; p.y = p.py; } }
  for (let it = 0; it < 8; it++) {
    P[0].x = ax; P[0].y = ay; P[N - 1].x = bx; P[N - 1].y = by;
    for (let k = 0; k < N - 1; k++) {
      const p = P[k], q = P[k + 1], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1e-6;
      if (d <= seg) continue;
      const f = (d - seg) / d * 0.5, ox = dx * f, oy = dy * f;
      if (k > 0) { p.x += ox; p.y += oy; } else { q.x -= ox; q.y -= oy; }
      if (k + 1 < N - 1) { q.x -= ox; q.y -= oy; } else if (k > 0) { p.x += ox; p.y += oy; }
    }
  }
  P[0].x = ax; P[0].y = ay; P[N - 1].x = bx; P[N - 1].y = by;
  // Slack rope drapes over rock rather than passing through it.
  for (let k = 1; k < N - 1; k++) { const p = P[k]; if (solidAt(p.x, p.y)) { p.x = p.px; p.y = p.py; if (solidAt(p.x, p.y)) { p.x = lerp(P[k - 1].x, P[k + 1].x, 0.5); p.y = lerp(P[k - 1].y, P[k + 1].y, 0.5) - 2; } } }
}

// ---- The rope round the rock ------------------------------------------------------------------------
// The rope is straight pieces bent at the corners of the rock: from the hook, through each bend,
// to his hand. It never passes through rock: where the last piece would, it bends at the corner
// it met, and he swings about that bend with what is left of the rope (so the swing quickens).
// Swing back past the straight and the bend comes off again.
const bendsOf = (R) => R.bends || (R.bends = []);
const pivotOf = (R) => { const b = bendsOf(R); return b.length ? b[b.length - 1] : R; };
const freeOf = (R) => R.len - (R.fixed || 0);
function setFixed(R) { let L = 0, p = R; for (const b of bendsOf(R)) { L += dist(p.x, p.y, b.x, b.y); p = b; } R.fixed = L; }
// The corner the rope's last piece struck as it swept from (px, py) to (gx, gy) about P: an outer
// corner of rock (one solid cell of the four round it), the first one the sweep meets.
function sweepCorner(P, px, py, gx, gy) {
  const a0 = Math.atan2(py - P.y, px - P.x), da = angDiff(a0, Math.atan2(gy - P.y, gx - P.x));
  const reach = Math.max(dist(P.x, P.y, gx, gy), dist(P.x, P.y, px, py)) + 2, L = dist(P.x, P.y, gx, gy) || 1, ux = (gx - P.x) / L, uy = (gy - P.y) / L;
  const i0 = Math.floor(Math.min(P.x, px, gx) / CELL) - 1, i1 = Math.ceil(Math.max(P.x, px, gx) / CELL) + 1;
  const j0 = Math.floor(Math.min(P.y, py, gy) / CELL) - 1, j1 = Math.ceil(Math.max(P.y, py, gy) / CELL) + 1;
  const swept = [], near = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const s00 = solid(i - 1, j - 1), s10 = solid(i, j - 1), s01 = solid(i - 1, j), s11 = solid(i, j);
    if (s00 + s10 + s01 + s11 !== 1) continue;
    const vx = i * CELL, vy = j * CELL, dd = dist(P.x, P.y, vx, vy);
    if (dd < 3 || dd > reach) continue;
    const c = { x: vx + (s00 || s01 ? 1.2 : -1.2), y: vy + (s00 || s10 ? 1.2 : -1.2) };
    if (Math.abs(da) > 0.002) { const t = angDiff(a0, Math.atan2(vy - P.y, vx - P.x)) / da; if (t >= -0.05 && t <= 1.05) swept.push([t, c]); }
    // and, for a rope already through rock, the corners near its line, nearest the bend first
    const along = (vx - P.x) * ux + (vy - P.y) * uy, off = Math.abs((vx - P.x) * uy - (vy - P.y) * ux);
    if (along > 0 && along < L && off < 26) near.push([along + off * 2, c]);
  }
  swept.sort((p, q) => p[0] - q[0]); near.sort((p, q) => p[0] - q[0]);
  return swept.concat(near).map((e) => e[1]);
}
// After he moves (his grip was at px, py): bends come off where the rope has swung back past
// straight, and go on where the last piece now meets rock.
function wrapRope(R, px, py) {
  const B = bendsOf(R), [gx, gy] = grip();
  for (let k = 0; k < 3 && B.length; k++) {
    const b = B[B.length - 1], a = B.length > 1 ? B[B.length - 2] : R;
    const cr = (b.x - a.x) * (gy - b.y) - (b.y - a.y) * (gx - b.x);
    if (cr * b.s < 0 && los(a.x, a.y, gx, gy)) { B.pop(); setFixed(R); } else break;
  }
  for (let k = 0; k < 3; k++) {
    const P = pivotOf(R);
    if (los(P.x, P.y, gx, gy)) break;
    // the first corner the rope can reach in a clear line from its last bend
    const c = sweepCorner(P, px, py, gx, gy).find((q) => los(P.x, P.y, q.x, q.y)); if (!c) break;
    c.s = sign((c.x - P.x) * (gy - c.y) - (c.y - P.y) * (gx - c.x)) || 1;
    B.push(c); setFixed(R);
    if (freeOf(R) < 4) { R.len = (R.fixed || 0) + dist(c.x, c.y, gx, gy); }
  }
}

// ---- The flare -------------------------------------------------------------------------------------
function startFlare() {
  if (S.dying || S.flare.on) return;
  if (S.meter < 0.12) { Sound.fx.gutter(); return; }
  S.flare = { on: true, t: 0 }; S.climbing = false; ev("flare on");
  Sound.flare(true); Sound.fx.flareOn();
}
function endFlare(quiet) {
  if (!S.flare.on) return;
  S.flare.on = false; Sound.flare(false); if (!quiet) Sound.fx.flareOff(); ev("flare off");
}
function puff(x, y, n, warm) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, v = 20 + Math.random() * 70;
    S.parts.push({ kind: "smoke", x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, r: 4 + Math.random() * 6, life: 0.7 + Math.random() * 0.5, age: 0, warm, real: true });
  }
}
// In the flare, a tap in empty air: his middle appears there (no further than the flare's reach), through rock.
function blink(tx, ty) {
  const [cx, cy] = middle(); let dx = tx - cx, dy = ty - cy; const L = Math.hypot(dx, dy);
  if (L > FLARE_R) { dx *= FLARE_R / L; dy *= FLARE_R / L; }
  const spot = freeSpot(cx + dx, cy + dy + HT / 2);
  if (!spot || S.meter < BLINK_COST * 0.5) { Sound.fx.gutter(); return; }
  S.meter = Math.max(0, S.meter - BLINK_COST);
  S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
  puff(cx, cy, 14, false);
  S.x = spot[0]; S.y = spot[1]; S.vx = 0; S.vy = -40; S.rope = null; S.shot = null; S.next = null; S.cling = 0; S.climbing = false; S.act = null; S.atk = null; S.hang = null;
  S.ground = boxHit(S.x, S.y + 1);
  puff(S.x, S.y - HT / 2, 10, true);
  S.parts.push({ kind: "ring", x: S.x, y: S.y - HT / 2, life: 0.5, age: 0, real: true });
  Sound.fx.zip();
}
