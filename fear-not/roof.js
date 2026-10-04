"use strict";
// Fear Not: fights on the rooftops, seen from straight above, on the way across the city. Where the
// angel lands, the demons come down out of the dark onto every roof round about, and Fr. Lawrence
// gets down off its back to meet them. The same moves as on the street, by the same gestures, and
// the same one rule (never the same blow twice on the same demon); only seen from above, where a
// crowd round him is easy to read. Tap one on his roof, and he flies at it and strikes; tap one on
// another roof (or still coming down out of the sky), and his angel, hovering over him, strikes it
// with a beam of light. Knocked or thrown off the edge of a roof, a demon falls to the street and
// is gone. Drag one on another roof, and the rosary hauls it across the gap.
// The flight lends it the city (`api`): the camera, the roofs, and the angel's picture.

function RoofFight(api) {
  const { sx, sy, K } = api;
  const SPIRIT = 10, HEIGHTS_AT = 12, DEPTHS_OUT = 10, WATER_MS = 300, WORN = [0.5, 0.2];
  // Distances on the roofs, in the city's own measure: how close he strikes from, what counts as
  // near enough to throw, and how far round him they keep.
  const REACH = 20, NEAR = 36, RING = 27, FIG = 1.22;      // FIG: the figures drawn a little larger than life, to read
  const RULES = {
    roof: { wind: 1, strike: 1, hurt: 1, comboT: 2.6, swoop: 4, floor: 2.6 },
    heights: { wind: 1.7, strike: 0.72, hurt: 0.6, comboT: 3.4, swoop: 3, regen: 6, floor: 3.6 },
    depths: { wind: 0.85, strike: 1, hurt: 1.5, comboT: 1.4, swoop: 0, floor: 1.6 },
  };
  const COAT = "#3a4c78", COAT2 = "#283658", HAT = "#33446c", BAND = "#e8c46a", SKIN = "#9a6e58", RIMS = ["#ff2a2a", "#ff6a2a", "#e0105a"];
  const WHISPERS = ["No one is coming.", "You are not Padre Pio.", "Go back to your desert.", "It is too late for him.", "You are alone up here.", "What use is a priest?", "Give it up, Father.", "He will do it anyway."];
  const STRIKES = ["palm", "cup", "kick", "knee", "sweep"];
  let B = null, foeId = 0, replaying = false;
  const R = () => RULES[B.world];
  const tip = (touch, keys) => (usingKeys() ? keys : touch);

  // ---- Where things are -------------------------------------------------------------------------------
  const gap = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  const inside = (b, x, y, m) => x > b.x0 + m && x < b.x1 - m && y > b.y0 + m && y < b.y1 - m;
  const keepOn = (o, b, m) => { o.x = clamp(o.x, b.x0 + m, b.x1 - m); o.y = clamp(o.y, b.y0 + m, b.y1 - m); };
  // How high a demon's feet are: on its roof, or in the air between (leaping, falling, coming down).
  const floorOf = (f) => (f.roof ? f.roof.h : f.alt);
  const zOf = (f) => floorOf(f) + (f.z || 0);
  const heroZ = () => B.roof.h + B.hero.z;
  const mine = (f) => f.roof === B.roof && !["leap", "arrive", "fall", "pulled"].includes(f.act.kind);
  const dTo = (f) => Math.hypot(f.x - B.hero.x, f.y - B.hero.y);
  const near = (f) => mine(f) && dTo(f) < NEAR;
  const lying = (f) => f && !f.gone && f.act.kind === "floored";
  const alive = () => B.foes.filter((f) => !f.gone);
  const angTo = (f) => Math.atan2(f.y - B.hero.y, f.x - B.hero.x);
  const scr = (x, y, z) => ({ x: sx(x, z), y: sy(y, z) });

  // ---- Starting a fight ---------------------------------------------------------------------------------
  function start(enc, done) {
    const P = api.P, b = P.on;
    B = {
      enc, done, t: 0, ts: 1, slowT: 0, slowTs: 1, zoomK: 1, freeze: 0, pulseT: 0, pulseTs: 1, warnT: 0, warnF: null, slowFor: null, slowVis: 0, muffled: false,
      roof: b, near: [], shake: 0, flash: 0, flashC: "#fff", foes: [], parts: [], pops: [], spawnQ: [], msg: null, banner: null, taught: {}, waveT: 0, nextAtk: 2.6, keys: {},
      hero: { x: clamp(P.x, b.x0 + 10, b.x1 - 10), y: clamp(P.y, b.y0 + 10, b.y1 - 10), z: 30, ang: P.head, act: { kind: "dismount", t: 0, dur: 0.45 }, resolve: 100, spirit: 0, combo: 0, comboT: 0, best: 0, inv: 0.8, queue: null, hits: 0 },
      angel: { x: P.x, y: P.y, alt: b.h + 8, head: P.head, wing: 0, mode: "flap", act: { kind: "hover", t: 0 }, t: 0 },
      world: "roof", worldT: 0, shift: null, woe: 0, woeT: 0, lastMove: null, prevMove: null, lastTap: null, over: 0, down: 0, cast: 0, whispers: [], whisperT: 2, hurtWave: false, rosary: null, touch: null, leapT: 1.6,
    };
    B.near = api.roofs().filter((o) => o !== b && !o.church && gap(o, b) < 120 && o.x1 - o.x0 > 26 && o.y1 - o.y0 > 26);
    for (const [kind, at] of enc.foes) B.spawnQ.push({ kind, at });
    say(enc.say());
    Sound.play(SONGS.fight); Sound.setLevel(1); Sound.fill("hit"); Sound.fx.whoosh(0.6, 1, true);
  }
  function say(t, who) { B.msg = { text: t, t: 0, who: who || "angel" }; if ((who || "angel") === "angel") Sound.fx.chord(B.t | 0); }
  // They come down out of the dark: on his roof, round him, or on the edge of a roof near his.
  function spawn(kind) {
    const H0 = B.hero, b0 = B.roof, mineN = B.foes.filter((f) => !f.gone && f.roof === b0).length;
    let b = b0;
    if ((mineN >= 2 || Math.random() < 0.45) && B.near.length) b = B.near[Math.floor(Math.random() * B.near.length)];
    let x, y;
    if (b === b0) { const a = Math.random() * TAU; x = H0.x + Math.cos(a) * 34; y = H0.y + Math.sin(a) * 34; }
    else { x = clamp(H0.x, b.x0 + 10, b.x1 - 10) + (Math.random() - 0.5) * 30; y = clamp(H0.y, b.y0 + 10, b.y1 - 10) + (Math.random() - 0.5) * 30; }
    x = clamp(x, b.x0 + 9, b.x1 - 9); y = clamp(y, b.y0 + 9, b.y1 - 9);
    const a = Math.random() * TAU, far = 420, z0 = Math.max(90, api.cam.z - b.h - 30);
    const f = {
      id: ++foeId, kind, x: x + Math.cos(a) * far, y: y + Math.sin(a) * far, roof: b, alt: b.h, z: z0, vx: 0, vy: 0, vz: 0, ang: a + PI,
      hp: kind === "grab" ? 12 : kind === "shield" ? 10 : 9, act: { kind: "arrive", t: 0, dur: 1.0 + Math.random() * 0.4, x0: x + Math.cos(a) * far, y0: y + Math.sin(a) * far, z0, x1: x, y1: y },
      sign: null, stun: 0, dizzy: 0, shield: kind === "shield", hat: true, hatKind: foeId % 3 === 0 ? 1 : 0, slot: Math.random() * TAU, ph: Math.random() * 10, seed: Math.random() * 10, rim: RIMS[foeId % 3],
    };
    f.max = f.hp; B.foes.push(f);
    Sound.fx.growl(0.5); Sound.fx.whoosh(0.3, 0.5, true);
    if (f.shield && !B.taught.shieldSeen) { B.taught.shieldSeen = true; say(tip("That one has a shield. Never strike it: it will only hurt you. Drag it, and your rosary snatches the shield away.", "That one has a shield. Never strike it: it will only hurt you. Press R, and your rosary snatches the shield away.")); }
    return f;
  }

  // ---- Slow time --------------------------------------------------------------------------------------
  function slowmo(ts, secs, k) { if (B.slowT > 0 && ts > B.slowTs) return; B.slowTs = ts; B.slowT = secs; B.zoomK = k || 1.12; }
  const hitStop = (s) => { B.freeze = Math.max(B.freeze, s); };
  const pulse = (ts, secs) => { if (B.pulseT > 0 && ts > B.pulseTs) return; B.pulseTs = ts; B.pulseT = secs; };
  const engaged = () => B.foes.some((f) => !f.gone && f.act.kind === "wind" && f.act.t < f.act.dur * 0.6 && dTo(f) < 90);
  function warn(f) {
    if (B.over || B.down || B.shift || dTo(f) > 120) return;
    B.warnT = B.hero.combo >= 2 ? 0.5 : 0.38; B.warnF = f;
    Sound.fx.tick(f.sign === "red" ? 1500 : 2600, 1.4); Sound.fx.whoosh(0.35, 0.35, true);
    B.parts.push({ kind: "warn", f, t: 0, c: f.sign === "red" ? "#ff3040" : C.holy });
  }

  // ---- What he does -------------------------------------------------------------------------------------
  const BUSY = ["strike", "zip", "counter", "hurt", "grabbed", "bless", "down", "jumpkick", "dash", "toss", "lash", "haul", "grab", "spike", "finish", "trip", "aside", "pray", "point", "dismount", "mount"];
  const busy = () => BUSY.includes(B.hero.act.kind) || !!B.shift;
  function act(kind, o) { B.hero.act = Object.assign({ kind, t: 0 }, o); }
  // The one rule. The angel's blows are his, not Fr. Lawrence's, so they are never a repeat.
  function fresh(kind, f, instead) {
    if (replaying) return true;
    if (f && ["strike", "heavy", "launch", "slam"].includes(kind) && f.z <= 12 && !lying(f) && !f.shield && mine(f) && angelNext()) { B.prevMove = B.lastMove; B.lastMove = { kind, f }; return true; }
    const L = instead ? B.prevMove : B.lastMove;
    if (L && L.kind === kind && L.f === f && f && !f.gone) { trip(); return false; }
    if (!instead) B.prevMove = B.lastMove;
    B.lastMove = { kind, f };
    return true;
  }
  const moved = (kind) => { if (!replaying) { B.prevMove = B.lastMove; B.lastMove = { kind, f: null }; } };
  function trip() {
    const H0 = B.hero;
    if (["trip", "down", "grabbed"].includes(H0.act.kind) || B.shift) return;
    B.lastMove = null; B.prevMove = null; H0.queue = null; H0.combo = 0; H0.comboT = 0;
    act("trip", { dur: 0.95 });
    Sound.fx.gasp(); Sound.fx.hit(0.7); B.shake = 5;
    pop(H0, "TRIPPED: THE SAME BLOW TWICE", "#ff8a70");
    if (!B.taught.trip) { B.taught.trip = true; say("Never the same blow twice on the same one, or you trip over your own feet. Change your blow, or change your demon."); }
    hurtHero(8, true); woe();
  }
  function woe() {
    if (B.world !== "roof" || B.shift || B.over || B.down) return;
    B.woe++; B.woeT = 0.8;
    if (B.woe === 2 && !B.taught.woe) { B.taught.woe = true; say("Careful, Father! One more fall, and they drag us down into the Depths."); }
    if (B.woe >= 3) { B.woe = 0; pop(B.hero, "THREE FALLS: DRAGGED DOWN", "#ff5a3a"); Sound.fx.growl(1.2); shiftTo("depths"); }
  }
  function tapDemon(f, fromKey) {
    const H0 = B.hero, now = B.t;
    if (["grabbed", "down", "dismount", "mount"].includes(H0.act.kind) || B.over || B.shift || f.gone) return;
    if (lying(f) && mine(f)) { finishFoe(f); return; }
    if (!fromKey && B.lastTap && B.lastTap.f === f && now - B.lastTap.t < 0.34 * Math.max(B.ts, 0.3)) { B.lastTap = null; heavy(f); return; }
    B.lastTap = { f, t: now };
    if (f.sign === "gold" && f.act.kind === "wind") { counter(f); return; }
    if (f.sign === "red" && f.act.kind === "wind") { pop(f, tip("HOLD TO BLOCK!", "HOLD Q!"), "#ff8a70"); return; }
    if (!fresh(f.z > 12 ? "air" : "strike", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "strike" }; return; }
    goStrike(f, "strike");
  }
  // To a demon on his roof: across to it (a flip, a roll, a flying kick, a cartwheel, flat out like
  // a prostration: never a walk), then the blow. To one out of his reach: his angel's light.
  function goStrike(f, move) {
    const H0 = B.hero; if (f.gone) return;
    if (move !== "finish" && f.z <= 12 && !lying(f) && !f.shield && mine(f)) { const k = angelNext(); if (k) { angelBlow(f, k); return; } }
    if (!mine(f)) { if (move !== "finish") beamAt(f, move); return; }
    H0.ang = angTo(f);
    const ux = Math.cos(H0.ang), uy = Math.sin(H0.ang), d = dTo(f);
    if (move === "finish") {
      if (d > 30) { act("zip", { f, move, style: "flip", dur: clamp(d / 260, 0.16, 0.34), from: [H0.x, H0.y], to: [f.x - ux * 14, f.y - uy * 14] }); Sound.fx.whoosh(0.22, 0.5); }
      else doMove(f, move);
      return;
    }
    if (f.z > 12 && (move === "strike" || move === "slam")) { act(move === "slam" ? "spike" : "jumpkick", { f, dur: 0.32, from: [H0.x, H0.y], to: [f.x - ux * 10, f.y - uy * 10] }); Sound.fx.whoosh(0.25, 0.6, true); return; }
    if (d > REACH + 6) {
      B.zipN = (B.zipN || 0) + 1;
      const set = d > 80 ? ["flip", "superman", "jumpkick"] : d > 40 ? ["roll", "jumpkick", "cartwheel", "superman", "flip"] : ["lurch", "roll", "cartwheel"];
      let k = (B.zipN + f.id) % set.length; if (set[k] === B.lastZip) k = (k + 1) % set.length;
      const style = B.lastZip = set[k];
      const to = { x: f.x - ux * REACH * 0.8, y: f.y - uy * REACH * 0.8 }; keepOn(to, B.roof, 5);
      act("zip", { f, move, style, dur: clamp((d - REACH) / 260, 0.14, 0.34) * (style === "superman" ? 1.15 : 1), from: [H0.x, H0.y], to: [to.x, to.y] });
      Sound.fx.whoosh(0.22, 0.5);
    } else doMove(f, move);
  }
  function doMove(f, move, style) {
    const H0 = B.hero, sp = R().strike;
    H0.ang = angTo(f);
    if (move === "finish") { act("finish", { f, dur: 0.5 * sp, hit: false, from: [H0.x, H0.y] }); Sound.fx.effort(); return; }
    if (lying(f)) { finishFoe(f); return; }
    if (move === "heavy" || move === "launch" || move === "slam") { act("strike", { f, which: move, dur: (move === "heavy" ? 0.36 : 0.33) * sp, hit: false }); Sound.fx.effort(); return; }
    act("strike", { f, which: style === "jumpkick" ? "kick" : style === "superman" ? "palm" : STRIKES[H0.hits % STRIKES.length], dur: 0.24 * sp, hit: false });
    Sound.fx.effort();
  }
  function special(f, move) {
    if (!f || f.gone || B.over || B.shift) return;
    if (lying(f) && mine(f)) { finishFoe(f); return; }
    const a = B.hero.act, q = B.hero.queue, LM = B.lastMove;
    const pending = LM && LM.f === f && LM.kind === "strike" && ((a.kind === "zip" && a.f === f && a.move === "strike") || (a.kind === "strike" && a.f === f && !a.hit && STRIKES.includes(a.which)) || (q && q.f === f && q.move === "strike"));
    if (!fresh(move === "slam" && f.z > 12 ? "spike" : move, f, pending)) return;
    if (a.kind === "zip" && a.f === f) { a.move = move; return; }
    if (a.kind === "strike" && a.f === f && !a.hit && STRIKES.includes(a.which)) { doMove(f, move); return; }
    if (busy() && a.kind !== "hurt") { B.hero.queue = { f, move }; return; }
    goStrike(f, move);
  }
  const heavy = (f) => special(f, "heavy"), launch = (f) => special(f, "launch"), slam = (f) => special(f, "slam");
  function finishFoe(f) {
    const H0 = B.hero;
    if (!lying(f) || B.over || B.shift || ["grabbed", "down", "bless"].includes(H0.act.kind)) return;
    const a = H0.act;
    if (a.kind === "finish" && a.f === f) return;
    moved("takedown");
    if (a.kind === "zip" && a.f === f) { a.move = "finish"; return; }
    if (busy() && a.kind !== "hurt") { H0.queue = { f, move: "finish" }; return; }
    goStrike(f, "finish");
  }
  function floor(f, o) {
    o = o || {};
    if (f.gone || !f.roof) return;
    if (f.act.kind === "floored") { f.act.t = Math.min(f.act.t, f.act.dur * 0.3); return; }
    f.act = { kind: "floored", t: 0, dur: R().floor * (o.long || 1) };
    f.sign = null; f.z = 0; f.vz = 0; f.dizzy = 0; f.stun = 0;
    f.worn = f.worn || 0; while (f.worn < WORN.length && f.hp <= f.max * WORN[f.worn]) f.worn++;
    if (B.slowFor === f) B.slowFor = null;
    dust(f.x, f.y, floorOf(f)); Sound.fx.step(2.2);
    if (!B.taught.finish && !B.over) { B.taught.finish = true; say(tip("He is down! Tap him before he rises, and finish him.", "He is down! Space toward him before he rises, and finish him.")); }
  }
  function takedown(f) {
    const H0 = B.hero;
    if (f.gone) return;
    if (!lying(f)) { landHit(f, 2, 1.6, { breaks: true }); return; }
    countHit(f);
    H0.spirit = Math.min(SPIRIT, H0.spirit + 1);
    B.chainTD = B.lastTD && B.t - B.lastTD < 4 && H0.combo > 1 ? B.chainTD + 1 : 1; B.lastTD = B.t;
    slowmo(0.15, 0.5, 1.3); hitStop(0.12); B.shake = 10; B.flash = 0.4; B.flashC = C.holy;
    B.parts.push({ kind: "column", x: f.x, y: f.y, z: floorOf(f), t: 0 }); B.parts.push({ kind: "ring", x: f.x, y: f.y, z: floorOf(f), r: 4, t: 0.15 });
    sparks(f, "#ffffff", 12);
    Sound.fx.hit(2.2); Sound.fx.hah(1.3); Sound.fx.clang();
    f.takenDown = true; f.hp = 0; castOut(f);
    pop(f, B.chainTD > 1 ? "TAKEDOWN ×" + B.chainTD : "TAKEDOWN", "#ffffff", true);
  }
  // Holy water, near or far: it arcs over to the demon, and stuns it (and splashes those beside it).
  function water(f) {
    const H0 = B.hero;
    if (!f || f.gone || B.over || B.shift || ["grabbed", "down", "bless", "toss", "trip"].includes(H0.act.kind)) return;
    if (!fresh("water", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "water" }; return; }
    H0.ang = angTo(f);
    act("toss", { f, dur: 0.3 * R().strike, fired: false });
    Sound.fx.whoosh(0.2, 0.5, true);
  }
  // The rosary, thrown crucifix first: across to one far off (on another roof, even), round it, and
  // hauled in. Round one with a shield, it snatches the shield away; the rosary again hauls it in.
  function stole(f) {
    const H0 = B.hero;
    if (!f || f.gone || B.over || B.shift || ["grabbed", "down", "bless", "dismount", "mount"].includes(H0.act.kind)) return;
    if (lying(f) && mine(f)) { finishFoe(f); return; }
    if (near(f) && !f.shield) { if (fresh("strike", f)) { if (busy() && H0.act.kind !== "hurt") H0.queue = { f, move: "strike" }; else goStrike(f, "strike"); } return; }
    if (["arrive", "fall"].includes(f.act.kind)) return;
    if (!fresh(f.shield ? "snatch" : "arm", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "stole" }; return; }
    H0.ang = angTo(f);
    act("lash", { f, dur: 0.44 * R().strike });
    B.rosary = { f, phase: "out", t: 0 };
    Sound.fx.whoosh(0.3, 0.8, false);
  }
  // One close by, picked up and thrown: into the others, or off the roof.
  function throwFoe(f, dx, dy) {
    const H0 = B.hero;
    if (!f || f.gone || B.over || B.shift || ["grabbed", "down", "bless"].includes(H0.act.kind)) return;
    if (lying(f) && mine(f)) { finishFoe(f); return; }
    if (f.shield || !near(f)) { stole(f); return; }
    if (!fresh("throw", f)) return;
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "throw", dx, dy }; return; }
    let m = Math.hypot(dx, dy);
    if (m < 0.1) {
      // No way given: toward the nearest edge of the roof.
      const b = B.roof, opts = [[-1, 0, f.x - b.x0], [1, 0, b.x1 - f.x], [0, -1, f.y - b.y0], [0, 1, b.y1 - f.y]].sort((a, c) => a[2] - c[2]);
      dx = opts[0][0]; dy = opts[0][1]; m = 1;
    }
    H0.ang = angTo(f);
    act("grab", { f, dur: 0.46 * R().strike, d: [dx / m, dy / m], flung: false });
    f.act = { kind: "held", t: 0 }; f.sign = null; if (B.slowFor === f) B.slowFor = null;
    Sound.fx.effort();
  }
  // A blow of his own on a shield: it rings off, and it is he who is hurt.
  function shieldBlock(f) {
    const H0 = B.hero;
    Sound.fx.clang(); Sound.fx.hit(0.9); sparks(f, "#ff9a60", 10);
    f.act = { kind: "recover", t: 0 };
    pop(f, tip("THE SHIELD! DRAG HIM: THE ROSARY", "THE SHIELD! R: THE ROSARY"), "#ff8a70");
    hurtHero(10); void H0;
  }
  function snatchShield(f) {
    const H0 = B.hero, a = angTo(f);
    f.shield = false; f.sign = null; if (B.slowFor === f) B.slowFor = null;
    if (f.act.kind === "wind" || f.act.kind === "lunge") f.act = { kind: "idle", t: 0 };
    f.dizzy = Math.max(f.dizzy, 2.4);
    // It goes spinning away over the edge and down to the street.
    B.parts.push({ kind: "shieldfly", x: f.x, y: f.y, z: zOf(f) + 10, vx: -Math.cos(a) * 30 + Math.sin(a) * 60, vy: -Math.sin(a) * 30 - Math.cos(a) * 60, vz: 80, r: 0, vr: 12, t: 0 });
    sparks(f, C.ember, 10);
    slowmo(0.3, 0.45, 1.15); hitStop(0.06);
    Sound.fx.chain(true); Sound.fx.clang();
    countHit(f); void H0;
    pop(f, "SHIELD SNATCHED", C.holy, true);
  }
  function landHit(f, dmg, k, o) {
    o = o || {};
    if (f.gone) return;
    const H0 = B.hero;
    if (f.shield && !o.breaks && o.front !== false) { Sound.fx.hit(0.6); Sound.fx.tick(900, 1); sparks(f, "#ff9a60", 6); return false; }
    if (o.breaks && f.shield) { f.shield = false; Sound.fx.shatter(); shards(f); pop(f, "GUARD BROKEN", C.holy); f.dizzy = 2.2; }
    // The longer the flow, the harder every blow lands.
    const flow = 1 + Math.min(1.5, H0.combo * 0.07), mult = (f.dizzy > 0 ? 1.5 : 1) * (B.world === "heights" ? 1.25 : 1) * flow;
    k *= 1 + Math.min(0.6, H0.combo * 0.03);
    f.hp -= dmg * mult; f.stun += 1; f.stunT = 1.6;
    if (f.act.kind === "wind" || f.act.kind === "lunge") { f.sign = null; if (B.slowFor === f) B.slowFor = null; }
    const fx = o.fromX === undefined ? H0.x : o.fromX, fy = o.fromY === undefined ? H0.y : o.fromY, dx = f.x - fx, dy = f.y - fy, d = Math.hypot(dx, dy) || 1;
    const kb = (o.kx === undefined ? 1 : o.kx) * (30 + 22 * k);
    if (f.act.kind === "floored") { f.vx = dx / d * kb * 0.4; f.vy = dy / d * kb * 0.4; }
    else if (!["thrown", "pulled", "leap", "arrive", "fall", "held", "countered"].includes(f.act.kind)) { f.act = { kind: "hurt", t: 0, dur: 0.32 }; f.vx = dx / d * kb; f.vy = dy / d * kb; }
    if (k > 1.3 && f.hat && Math.random() < 0.6) { f.hat = false; B.parts.push({ kind: "hat", x: f.x, y: f.y, z: zOf(f) + 12, vx: dx / d * 40, vy: dy / d * 40, vz: 60, r: 0, vr: 10, hk: f.hatKind, t: 0, floor: floorOf(f) }); }
    if (f.stun >= 3 && f.dizzy <= 0) { f.dizzy = 2.0; f.stun = 0; pop(f, "DIZZY", "#ffe08a"); }
    if (!o.angel) countHit(f);
    f.worn = f.worn || 0;
    if (f.hp > 0 && f.worn < WORN.length && f.hp <= f.max * WORN[f.worn] && f.z <= 0 && f.act.kind === "hurt" && !o.noFloor) {
      while (f.worn < WORN.length && f.hp <= f.max * WORN[f.worn]) f.worn++;
      floor(f); f.vx *= 1.4; f.vy *= 1.4;
      slowmo(0.3, 0.28, 1.16); hitStop(0.08);
      pop(f, "DOWN", "#ffffff");
    }
    hitStop(k > 1.5 ? 0.09 : 0.045);
    B.shake = Math.max(B.shake, 2 + k * 2);
    Sound.fx.hit(k);
    sparks(f, k > 1.3 ? "#ffffff" : f.rim, 6 + k * 3);
    if (f.hp <= 0) castOut(f);
    return true;
  }
  function countHit(f) {
    const H0 = B.hero;
    H0.combo++; H0.comboT = R().comboT; H0.hits++; H0.best = Math.max(H0.best, H0.combo);
    if (H0.combo >= 3 && B.woe) B.woe = 0;
    if (H0.combo >= 3) pulse(Math.max(0.36, 0.64 - H0.combo * 0.022), 0.13);
    if (H0.spirit < SPIRIT) { H0.spirit++; if (H0.spirit === SPIRIT && !B.taught.bless) { B.taught.bless = true; say(tip("The Spirit fills you. Tap the gold cross to bless them all.", "The Spirit fills you. Press B to bless them all.")); } }
    if (H0.combo >= HEIGHTS_AT && B.world === "roof" && !B.shift && !B.over) { pop(H0, "TO THE HEIGHTS", C.holy, true); Sound.fx.hah(1.2); Sound.fx.chord(3, 0.8); shiftTo("heights"); }
    if (B.world === "depths" && H0.combo >= DEPTHS_OUT) B.rising = true;
    void f;
  }
  function counter(f) {
    const H0 = B.hero;
    const others = alive().filter((o) => o !== f && o.sign === "gold" && o.act.kind === "wind" && dTo(o) < 70);
    moved("counter");
    f.sign = null; H0.ang = angTo(f); H0.z = 0; H0.queue = null;
    act("counter", { f, dur: 0.72 * R().strike, others, a0: H0.ang, slam: false, kicked: false });
    f.act = { kind: "countered", t: 0 }; f.z = 0; f.vx = 0; f.vy = 0; f.dizzy = 0;
    for (const o of others) { o.sign = null; o.act = { kind: "idle", t: 0 }; o.dizzy = 0.6; }
    H0.inv = Math.max(H0.inv, 0.75);
    slowmo(0.2, 0.32, 1.22); B.warnT = 0;
    B.flash = 0.3; B.flashC = C.holy;
    Sound.fx.clang();
    pop(f, others.length === 2 ? "TRIPLE COUNTER" : others.length === 1 ? "DOUBLE COUNTER" : "COUNTER", C.holy, others.length > 0);
    if (B.slowFor === f || others.includes(B.slowFor)) B.slowFor = null;
  }
  function bless() {
    const H0 = B.hero;
    if (H0.spirit < SPIRIT || ["down", "grabbed", "bless", "dismount", "mount"].includes(H0.act.kind) || B.shift || B.over) return;
    H0.spirit = 0; act("bless", { dur: 0.95, fired: false });
    Sound.fx.glory();
  }
  // From on high: the end of the flow in the Heights. He prays; the angel climbs out of sight, and
  // comes down on them all in a column of light.
  function finisher() {
    const H0 = B.hero;
    if (B.world !== "heights" || B.finishing || B.shift || B.down) return;
    B.finishing = true; B.finishCombo = H0.combo; B.lastMove = null; H0.queue = null;
    act("pray", {}); H0.inv = 5;
    slowmo(0.4, 0.5, 1.1);
    Sound.fx.glory();
    pop(H0, "FROM ON HIGH", C.holy, true);
    B.angel.act = { kind: "smite", t: 0, phase: "up" };
  }
  function smiteLands() {
    const H0 = B.hero, c = B.finishCombo || 0, mult = 1 + Math.min(2, c * 0.08);
    B.finishing = false;
    let n = 0;
    for (const f of alive()) {
      if (dTo(f) > 220) continue;
      if (["leap", "arrive"].includes(f.act.kind)) { shotDown(f); n++; continue; }
      landHit(f, 2.5 * mult, 2.2, { angel: true, front: false, breaks: true, noFloor: true }); if (!f.gone && f.roof) floor(f, { long: 1.4 }); n++;
    }
    B.parts.push({ kind: "column", x: H0.x, y: H0.y, z: B.roof.h, t: 0, big: true }); B.parts.push({ kind: "ring", x: H0.x, y: H0.y, z: B.roof.h, r: 8, t: 0, big: true });
    B.shake = 14; B.flash = 0.8; B.flashC = C.holy; hitStop(0.14); slowmo(0.2, 0.7, 1.15);
    Sound.fx.hit(2.4); Sound.fx.clang();
    if (H0.act.kind === "pray") act("idle");
    pop(H0, c > 1 ? "FROM ON HIGH · " + c + " IN A ROW" : "FROM ON HIGH", "#ffffff", true);
    H0.spirit = Math.min(SPIRIT, H0.spirit + 3); H0.combo = 0; H0.comboT = 0;
    if (n) say("They fell with us. Finish them!");
    shiftTo("roof");
  }
  // Tap the open roof: he goes there at once, in a flip or a roll.
  function tapRoof(x, y) {
    const H0 = B.hero;
    if (["grabbed", "down", "bless", "grab", "dismount", "mount"].includes(H0.act.kind) || B.over || B.shift) return;
    const to = { x, y }; keepOn(to, B.roof, 6);
    const d = Math.hypot(to.x - H0.x, to.y - H0.y); if (d < 4) return;
    H0.ang = Math.atan2(to.y - H0.y, to.x - H0.x); H0.queue = null; moved("dash");
    act("dash", { from: [H0.x, H0.y], to: [to.x, to.y], dur: clamp(d / 300, 0.14, 0.4), style: d > 50 ? "flip" : "roll" });
    H0.inv = Math.max(H0.inv, 0.2);
    Sound.fx.whoosh(0.25, 0.6);
    B.parts.push({ kind: "mark", x: to.x, y: to.y, z: B.roof.h, t: 0 });
  }

  // ---- His angel, hovering over him -------------------------------------------------------------------
  // On the 3rd blow of a combo, the 7th, the 11th, the blow is the angel's: he steps aside and it
  // dives on the demon (or, every other time, sweeps round him through all of them close by). It
  // strikes any out of his reach with a beam of light. In the Depths it is far off.
  function angelNext() {
    const every = R().swoop, n = B.hero.combo + 1;
    if (!every || n % every !== every - 1 || B.angel.act.kind !== "hover" || B.shift || B.over || B.finishing) return null;
    return Math.floor(n / every) % 2 === 1 ? "sweep" : "dive";
  }
  function angelUntil() { const every = R().swoop; if (!every) return 0; let k = 0; while ((B.hero.combo + 1 + k) % every !== every - 1) k++; return k; }
  function angelBlow(f, kind) {
    const H0 = B.hero;
    H0.ang = angTo(f); H0.queue = null;
    act("aside", { dur: 0.6 });
    H0.inv = Math.max(H0.inv, 0.5);
    B.lastMove = { kind: "angel", f }; B.prevMove = null;
    B.angel.act = { kind, t: 0, f, hit: false, x0: B.angel.x, y0: B.angel.y, a0: B.angel.alt };
    Sound.fx.whoosh(0.45, 1, false);
    slowmo(0.35, 0.4, 1.15);
    if (!B.taught.swoop) { B.taught.swoop = true; say("Stand aside, Father. Let me."); }
  }
  // One out of his reach: he points, and the angel's light strikes it.
  function beamAt(f, move) {
    const H0 = B.hero, A = B.angel;
    if (!R().swoop) { pop(f, "HIS ANGEL IS FAR", "#ff8a70"); return; }
    if (A.act.kind !== "hover") { H0.queue = { f, move }; return; }
    H0.ang = angTo(f);
    act("point", { dur: 0.3 });
    A.act = { kind: "beam", t: 0, f, move, hit: false };
    Sound.fx.tick(3200, 0.8);
    if (!B.taught.beam) { B.taught.beam = true; say("Out of your reach, I strike them. But it is still your blow, and the same rule holds."); }
  }
  // One knocked out of the air on the way down, or between roofs: down to the street.
  function shotDown(f) {
    f.alt = zOf(f); f.roof = null; f.z = 0;
    f.act = { kind: "fall", t: 0 }; f.vz = 40; f.sign = null;
    pop(f, "SHOT DOWN", C.holy); Sound.fx.yelp();
  }
  function stepAngel(dt) {
    const A = B.angel, H0 = B.hero, a = A.act, h = B.roof.h; A.t += dt; a.t += dt;
    const hoverX = H0.x + Math.cos(A.t * 0.7) * 22, hoverY = H0.y + Math.sin(A.t * 0.7) * 16, hoverZ = h + 78;
    const toward = (x, y, z, k) => { A.x = lerp(A.x, x, Math.min(1, dt * k)); A.y = lerp(A.y, y, Math.min(1, dt * k)); A.alt = lerp(A.alt, z, Math.min(1, dt * k)); };
    A.wing += dt * (a.kind === "hover" ? 7 : 26); A.mode = a.kind === "hover" ? "flap" : a.kind === "sweep" && a.t > 0.15 ? "glide" : "flap";
    if (a.kind === "hover") {
      toward(hoverX, hoverY, hoverZ, 3);
      A.head = lerp(A.head, A.head + angDiff(A.head, H0.ang), Math.min(1, dt * 2));
      if (H0.queue && H0.queue.f && !mine(H0.queue.f) && !busy()) { const q = H0.queue; H0.queue = null; if (!q.f.gone) beamAt(q.f, q.move); }
    } else if (a.kind === "beam") {
      const f = a.f;
      if (f && !f.gone) A.head = Math.atan2(f.y - A.y, f.x - A.x);
      if (!a.hit && a.t > 0.07) {
        a.hit = true;
        if (f && !f.gone) {
          B.parts.push({ kind: "beam", x0: A.x, y0: A.y, z0: A.alt, f, x1: f.x, y1: f.y, z1: zOf(f) + 10, t: 0 });
          if (["leap", "arrive"].includes(f.act.kind)) { countHit(f); shotDown(f); }
          else {
            const k = a.move === "heavy" ? 1.8 : a.move === "launch" || a.move === "slam" ? 1.5 : 1.2;
            if (f.shield) { shieldBlock(f); }
            else { landHit(f, a.move === "heavy" ? 1.6 : 1, k, { kx: 1.1 }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 0.5); pop(f, "HIS LIGHT", C.holy); }
          }
          Sound.fx.clang(); B.flash = Math.max(B.flash, 0.15); B.flashC = C.holy;
        }
      }
      if (a.t > 0.32) A.act = { kind: "hover", t: 0 };
    } else if (a.kind === "dive" || a.kind === "sweep") {
      const f = a.f;
      if (a.t < 0.16) {
        const u = (a.t / 0.16) ** 2, T = a.kind === "dive" && f && !f.gone ? f : H0;
        A.x = lerp(a.x0, T.x, u); A.y = lerp(a.y0, T.y, u); A.alt = lerp(a.a0, h + 12, u);
        if (f && !f.gone) A.head = Math.atan2(f.y - A.y, f.x - A.x);
      } else if (a.t < (a.kind === "sweep" ? 0.62 : 0.34)) {
        if (a.kind === "sweep") {
          // Round him once, low, wings out: every demon close to him struck.
          const u = (a.t - 0.16) / 0.46, ang = (a.ang0 === undefined ? (a.ang0 = Math.atan2(A.y - H0.y, A.x - H0.x)) : a.ang0) + u * TAU;
          A.x = H0.x + Math.cos(ang) * 24; A.y = H0.y + Math.sin(ang) * 24; A.alt = h + 12; A.head = ang + PI / 2;
          a.hits = a.hits || [];
          for (const o of alive()) if (!a.hits.includes(o) && mine(o) && Math.hypot(o.x - A.x, o.y - A.y) < 22) { a.hits.push(o); landHit(o, 2, 1.8, { breaks: true, front: false, angel: true, fromX: H0.x, fromY: H0.y }); if (!o.gone) floor(o); if (a.hits.length === 1) countHit(o); }
          if (u >= 1 && !a.popped) { a.popped = true; if (a.hits.length) pop(H0, a.hits.length > 1 ? "WING SWEEP ×" + a.hits.length : "WING SWEEP", C.holy); }
        } else if (!a.hit) {
          a.hit = true;
          if (f && !f.gone) { countHit(f); landHit(f, 3, 2, { breaks: true, front: false, angel: true, fromX: A.x - Math.cos(A.head) * 10, fromY: A.y - Math.sin(A.head) * 10 }); if (!f.gone && f.roof) floor(f); pop(f, "HIS ANGEL", C.holy); }
          B.flash = 0.3; B.flashC = C.holy; hitStop(0.1); Sound.fx.hit(1.6); B.shake = 6;
        }
      } else {
        toward(hoverX, hoverY, hoverZ, 7);
        if (a.t > (a.kind === "sweep" ? 0.95 : 0.7)) { A.act = { kind: "hover", t: 0 }; Sound.fx.flap(1.2); }
      }
    } else if (a.kind === "smite") {
      if (a.phase === "up") { A.alt += dt * 900; A.x = lerp(A.x, H0.x, Math.min(1, dt * 4)); A.y = lerp(A.y, H0.y, Math.min(1, dt * 4)); if (a.t > 0.55 && !B.shift) { a.phase = "down"; a.t = 0; a.a0 = A.alt; Sound.fx.whoosh(1, 1, false); } }
      else if (a.phase === "down") { const u = clamp(a.t / 0.3, 0, 1); A.alt = lerp(a.a0, h + 12, u * u); A.x = H0.x + 6; A.y = H0.y; if (u >= 1) { a.phase = "rise"; a.t = 0; smiteLands(); } }
      else { toward(hoverX, hoverY, hoverZ, 5); if (a.t > 0.6) A.act = { kind: "hover", t: 0 }; }
    } else if (a.kind === "carry") {
      // He fell: the angel takes him up out of it.
      if (a.t < 0.4) toward(H0.x, H0.y, h + 14, 9);
      else { A.alt += dt * 160; A.x = H0.x; A.y = H0.y; H0.z = A.alt - h - 8; }
    } else if (a.kind === "land") {
      // The fight won: down beside him, and he climbs on.
      toward(H0.x + 10, H0.y, h + 4, 5);
    }
  }

  // ---- The Heights and the Depths -------------------------------------------------------------------
  function shiftTo(to) {
    if (B.shift || B.world === to) return;
    B.shift = { from: B.world, to, t: 0 };
    for (const f of B.foes) if (!f.gone) { f.sign = null; if (["wind", "lunge", "grabbing"].includes(f.act.kind)) f.act = { kind: "idle", t: 0 }; }
    B.slowFor = null; B.hero.queue = null;
    if (B.hero.act.kind === "grabbed") act("idle");
    if (to === "heights") { Sound.fx.glory(); Sound.fill("hit"); }
    else if (to === "depths") { Sound.fx.growl(1.6); Sound.fx.whisper(2); }
    else Sound.fx.whoosh(0.8, 1, B.shift.from === "depths");
  }
  function arrive(to, from) {
    B.world = to; B.worldT = 0; B.woe = 0;
    if (to !== "heights" && !B.finishing) { B.hero.combo = 0; B.hero.comboT = 0; }
    if (to === "heights") { B.hero.comboT = RULES.heights.comboT; B.banner = { text: "THE HEIGHTS", sub: "Keep the flow, then come down on them.", c: C.holy, t: 0 }; say(tip("Up! Keep the flow going. Then tap the gold, and I come down on them from on high.", "Up! Keep the flow going. Then press B, and I come down on them from on high.")); }
    else if (to === "depths") { B.banner = { text: "THE DEPTHS", sub: DEPTHS_OUT + " in a row, and we rise.", c: "#ff5a3a", t: 0 }; say("Do not listen to them. Ten in a row, and we rise. I am with you."); B.whisperT = 0.5; }
    else if (from === "depths") {
      B.whispers = [];
      if (B.depthsWon) { B.depthsWon = false; for (const f of alive()) if (mine(f)) { landHit(f, 3, 1.8, { angel: true, front: false, breaks: true, noFloor: true }); if (!f.gone) floor(f, { long: 1.3 }); } B.hero.spirit = SPIRIT; B.flash = 0.8; B.flashC = C.holy; say("Up, and out! They fell. Finish them!"); }
      else say("I have you. Breathe.");
    }
  }
  function stepWorld(dt) {
    B.worldT += dt;
    const H0 = B.hero;
    if (B.world === "heights") {
      H0.resolve = Math.min(100, H0.resolve + R().regen * dt);
      if (B.worldT > 12 || alive().length === 0) finisher();
    } else if (B.world === "depths") {
      if (B.rising) { B.rising = false; B.depthsWon = true; B.flash = 0.6; B.flashC = C.holy; Sound.fx.glory(); shiftTo("roof"); }
      else if (B.worldT > 25 || alive().length === 0) shiftTo("roof");
      B.whisperT -= dt;
      if (B.whisperT <= 0) { B.whisperT = 1.6 + Math.random() * 1.4; B.whispers.push({ text: WHISPERS[Math.floor(Math.random() * WHISPERS.length)], x: 80 + Math.random() * (W - 160), y: 100 + Math.random() * 140, t: 0, dx: (Math.random() - 0.5) * 20 }); Sound.fx.whisper(1.2); }
    }
    for (const w of B.whispers) { w.t += dt; w.x += w.dx * dt; }
    B.whispers = B.whispers.filter((w) => w.t < 3.4);
  }

  // ---- Time -------------------------------------------------------------------------------------------
  function step(dtRaw) {
    const H0 = B.hero;
    if (B.warnF && (B.warnF.gone || B.warnF.act.kind !== "wind")) { B.warnF = null; B.warnT = 0; }
    let target = 1;
    if (B.slowFor) target = 0.2;
    else if (B.slowT > 0) target = B.slowTs;
    else if (B.warnT > 0 && !B.over) target = 0.22;
    else if (engaged() && !B.over) target = 0.45;
    else if (H0.combo >= 4 && !B.over && !B.shift) target = 1 - Math.min(0.4, (H0.combo - 3) * 0.03);
    if (B.pulseT > 0) target = Math.min(target, B.pulseTs);
    B.ts += (target - B.ts) * Math.min(1, dtRaw * (target < B.ts ? 22 : 6));
    if (B.slowT > 0) B.slowT -= dtRaw;
    if (B.warnT > 0) B.warnT -= dtRaw;
    if (B.pulseT > 0) B.pulseT -= dtRaw;
    let dt = dtRaw * B.ts;
    if (B.freeze > 0) { B.freeze -= dtRaw; dt = 0; }
    const vis = clamp((0.85 - B.ts) / 0.6, 0, 1);
    B.slowVis += (vis - B.slowVis) * Math.min(1, dtRaw * (vis > B.slowVis ? 9 : 3));
    const muff = B.world === "depths" || (B.muffled ? B.slowVis > 0.35 : B.slowVis > 0.55);
    if (muff !== B.muffled) { B.muffled = muff; Sound.muffle(muff, muff ? 0.05 : 0.2); }
    if (B.msg) B.msg.t += dtRaw;
    if (B.banner) { B.banner.t += dtRaw; if (B.banner.t > 3) B.banner = null; }
    B.flash = Math.max(0, B.flash - dtRaw * 2); B.shake = Math.max(0, B.shake - dtRaw * 20);
    camera(dtRaw);
    stepParts(dt);
    if (B.shift) { B.shift.t += dtRaw; if (!B.shift.mid && B.shift.t > 0.45) { B.shift.mid = true; arrive(B.shift.to, B.shift.from); } if (B.shift.t > 0.9) B.shift = null; return; }
    stepWorld(dt);
    if (B.over) {
      B.over += dtRaw;
      stepHero(dt); stepAngel(dtRaw);
      if (B.over > 0.9 && H0.act.kind !== "mount") { act("mount", { dur: 0.45 }); Sound.fx.flap(1); }
      if (B.over > 1.6 && !B.left) { B.left = true; Sound.muffle(false); const done = B.done, hero = { x: H0.x, y: H0.y, ang: H0.ang }; B = null; done(hero); }
      return;
    }
    B.t += dt; B.waveT += dt;
    for (const s of B.spawnQ) if (!s.done && B.waveT > s.at) { s.done = true; spawn(s.kind); }
    B.spawnQ = B.spawnQ.filter((s) => !s.done);
    // Hold on the open roof to block; hold on a demon a moment, and the holy water is ready.
    const T = B.touch;
    if (T && !T.moved) {
      const held = performance.now() - T.r0;
      if (!T.target && !T.spent && held > 230 && !busy() && H0.act.kind !== "block") { act("block", {}); T.block = true; }
      if (T.target && !T.water && held > WATER_MS) { T.water = true; Sound.fx.tick(2200, 0.8); }
    }
    stepKeys(dt);
    stepHero(dt); stepRosary(dt); stepAngel(dtRaw);
    // Those waiting on the roofs round about come over, one at a time, when there is room.
    B.leapT -= dt;
    if (B.leapT <= 0) {
      B.leapT = 0.9 + Math.random() * 0.8;
      const onMine = alive().filter((f) => f.roof === B.roof || f.act.kind === "leap").length;
      const waiting = alive().filter((f) => f.roof && f.roof !== B.roof && f.act.kind === "idle" && f.dizzy <= 0).sort((a, b) => dTo(a) - dTo(b));
      if (waiting.length && onMine < B.enc.cap) leapOver(waiting[0]);
    }
    for (const f of B.foes) stepFoe(f, dt);
    B.foes = B.foes.filter((f) => !f.gone || f.act.t < 0.7);
    attackScheduler(dt);
    if (H0.comboT > 0) { H0.comboT -= dt; if (H0.comboT <= 0) H0.combo = 0; }
    Sound.setLevel(B.world === "heights" ? 3 : H0.combo >= 12 ? 3 : H0.combo >= 5 ? 2 : 1);
    if (B.spawnQ.length === 0 && alive().length === 0 && B.waveT > 1.5 && B.world === "roof" && !B.down) win();
    if (B.down) { B.down += dtRaw; if (B.down > 2.6) recover(); }
  }
  // The camera: straight down on his roof, close enough to see the blows, drawn in on the great
  // moments and higher in the Heights.
  function camera(dtRaw) {
    const cam = api.cam, b = B.roof, H0 = B.hero, zk = B.slowT > 0 ? B.zoomK : B.warnT > 0 ? 1.1 : 1;
    const want = b.h + (B.world === "heights" ? 280 : 200) / zk;
    cam.z += (want - cam.z) * Math.min(1, dtRaw * (want < cam.z ? 4 : 2));
    const tx = lerp((b.x0 + b.x1) / 2, H0.x, 0.6), ty = lerp((b.y0 + b.y1) / 2, H0.y, 0.6);
    cam.x += (tx - cam.x) * Math.min(1, dtRaw * 4); cam.y += (ty - cam.y) * Math.min(1, dtRaw * 4);
    cam.lx = 0; cam.ly = 0;
    if (B.shake > 0) { const k = K(b.h); cam.x += (Math.random() - 0.5) * B.shake / k; cam.y += (Math.random() - 0.5) * B.shake / k; }
    // The flight's angel stands for this one, so the city is drawn round it.
    const P = api.P; P.x = B.angel.x; P.y = B.angel.y; P.alt = B.angel.alt; P.head = B.angel.head;
  }
  function win() {
    const H0 = B.hero;
    B.over = 0.001;
    if (!B.hurtWave) { B.banner = { text: "PERFECT FREEFLOW", sub: "Not a blow on you.", c: C.holy, t: 0, small: true }; Sound.fx.chord(4, 1); }
    slowmo(0.12, 0.8, 1.2);
    B.angel.act = { kind: "land", t: 0 };
    say(B.enc.after || "Up, Father. On.");
    Sound.queue(SONGS.noir); Sound.setLevel(1);
    void H0;
  }
  function recover() {
    // The angel took him up out of it; the fight begins again.
    B.down = 0;
    const H0 = B.hero, b = B.roof;
    H0.resolve = 100; H0.combo = 0; H0.spirit = Math.max(H0.spirit, 2); act("idle"); H0.x = (b.x0 + b.x1) / 2; H0.y = (b.y0 + b.y1) / 2; H0.z = 0; H0.inv = 1.5;
    B.angel.act = { kind: "hover", t: 0 }; B.world = "roof"; B.whispers = []; B.rosary = null;
    for (const f of B.foes) f.gone = true;
    B.foes = []; B.slowFor = null; B.waveT = 0; B.spawnQ = B.enc.foes.map(([kind, at]) => ({ kind, at }));
    say("Rested a moment. Again, Father: they are not so strong as they look.");
  }
  function stepHero(dt) {
    const H0 = B.hero, A0 = H0.act; A0.t += dt;
    H0.inv = Math.max(0, H0.inv - dt);
    const u = A0.dur ? clamp(A0.t / A0.dur, 0, 1) : 0;
    const after = () => {
      act("idle");
      if (H0.queue) {
        const q = H0.queue; H0.queue = null; if (q.f.gone) return;
        replaying = true;
        try { if (q.move === "water") water(q.f); else if (q.move === "stole") stole(q.f); else if (q.move === "throw") throwFoe(q.f, q.dx, q.dy); else if (q.move === "finish") finishFoe(q.f); else goStrike(q.f, q.move); }
        finally { replaying = false; }
      }
    };
    const fwd = (k) => [H0.x + Math.cos(H0.ang) * k, H0.y + Math.sin(H0.ang) * k];
    if (A0.kind === "dismount") { H0.z = 30 * (1 - smooth(u)) + Math.sin(u * PI) * 10; if (u >= 1) { H0.z = 0; act("idle"); Sound.fx.step(1.4); } }
    else if (A0.kind === "mount") { const A = B.angel; H0.x = lerp(H0.x, A.x, Math.min(1, dt * 8)); H0.y = lerp(H0.y, A.y, Math.min(1, dt * 8)); H0.z = Math.sin(u * PI) * 14 + u * 6; }
    else if (A0.kind === "run") { A0.ph += dt * 11; }
    else if (["zip", "jumpkick", "dash", "spike"].includes(A0.kind)) {
      const e = A0.kind === "dash" ? ease(u) : smooth(u);
      H0.x = lerp(A0.from[0], A0.to[0], e); H0.y = lerp(A0.from[1], A0.to[1], e);
      const st = A0.style;
      H0.z = st === "flip" ? Math.sin(u * PI) * 16 : st === "superman" ? Math.sin(u * PI) * 9 : st === "jumpkick" ? Math.sin(u * PI) * 11 : st === "cartwheel" ? Math.sin(u * PI) * 5 : A0.kind === "jumpkick" || A0.kind === "spike" ? Math.sin(u * PI * 0.5) * (A0.f ? A0.f.z * 0.8 + 6 : 10) : st === "roll" ? Math.sin(u * PI) * 2 : 0;
      if (A0.kind === "jumpkick" && u > 0.55 && !A0.hit) { A0.hit = true; if (!A0.f.gone) { landHit(A0.f, 1, 1.1, { kx: 0.4 }); if (!A0.f.gone) A0.f.vz = Math.max(A0.f.vz, 90); } }
      if (A0.kind === "spike" && u > 0.6 && !A0.hit) {
        A0.hit = true;
        if (!A0.f.gone) { const f = A0.f; landHit(f, 0, 1.4, { angel: true, kx: 0.1 }); countHit(f); if (!f.gone) { f.vz = -300; f.act = { kind: "spiked", t: 0 }; } pop(f, "SLAM!", C.holy); Sound.fx.hah(1); }
      }
      if (u >= 1) {
        H0.z = A0.kind === "jumpkick" || A0.kind === "spike" ? H0.z : 0;
        if (A0.kind === "zip" && A0.f && !A0.f.gone) doMove(A0.f, A0.move || "strike", A0.style);
        else if (A0.kind === "jumpkick" || A0.kind === "spike") act("land", { dur: 0.25, z0: H0.z });
        else after();
      }
    } else if (A0.kind === "land") { H0.z = A0.z0 * (1 - ease(u)); if (u >= 1) { H0.z = 0; after(); } }
    else if (A0.kind === "counter") {
      // The catch, the throw over his shoulder, and down on its back behind him; then the pin.
      const f = A0.f, live = f && !f.gone;
      if (!A0.kicked && u > 0.3) {
        A0.kicked = true;
        for (const o of A0.others) if (!o.gone) { landHit(o, 2, 1.6, { front: false, noFloor: true }); if (!o.gone) floor(o); sparks(o, C.holy, 8); }
        if (A0.others.length) Sound.fx.whoosh(0.2, 0.7);
      }
      if (u < 0.2) { if (live) { f.x = H0.x + Math.cos(A0.a0) * 14; f.y = H0.y + Math.sin(A0.a0) * 14; f.ang = A0.a0 + PI; } }
      else if (u < 0.5) {
        const k = (u - 0.2) / 0.3, a = A0.a0 + PI * smooth(k);
        H0.ang = A0.a0 + PI * smooth(k);
        if (live) { f.x = H0.x + Math.cos(a) * lerp(14, 17, k); f.y = H0.y + Math.sin(a) * lerp(14, 17, k); f.z = Math.sin(k * PI) * 18; f.ang = a + PI; }
      } else if (!A0.slam) {
        A0.slam = true; H0.ang = A0.a0 + PI;
        if (live) {
          f.z = 0; keepOn(f, B.roof, 4); f.act = { kind: "hurt", t: 0, dur: 0.3 };
          landHit(f, 2, 1.7, { front: false, noFloor: true, kx: 0 });
          if (!f.gone) { floor(f); f.vx = 0; f.vy = 0; f.act.pinned = true; }
          B.shake = 9; hitStop(0.09); Sound.fx.hah(1.1);
        }
      }
      if (u >= 1) { if (live && f.act.kind === "floored") f.act.pinned = false; after(); }
    }
    else if (A0.kind === "strike") {
      const f = A0.f;
      if (!A0.hit && u > 0.42) {
        A0.hit = true;
        if (f && !f.gone && mine(f) && dTo(f) < REACH + 12) {
          const name = A0.which;
          if (f.shield && !lying(f)) { shieldBlock(f); return; }
          if (name === "heavy") {
            const wasDizzy = f.dizzy > 0;
            landHit(f, 2, 1.9, { breaks: true, front: false }); Sound.fx.hah(1);
            if (wasDizzy && !f.gone && !lying(f)) { floor(f); pop(f, "FLOORED", "#ffffff"); }
            slowmo(0.35, 0.3, 1.1);
          } else if (name === "launch") {
            landHit(f, 1, 1.3, { kx: 0.2, noFloor: true });
            if (!f.gone) { f.z = Math.max(f.z, 1); f.vz = 110; f.act = { kind: "air", t: 0 }; f.dizzy = Math.max(f.dizzy, 1); pop(f, "LAUNCHED", C.holy); }
          } else if (name === "slam") {
            const landed = landHit(f, 1.5, 1.6, { kx: 0.3 });
            if (landed !== false && !f.gone) { f.dizzy = Math.max(f.dizzy, 1.0); B.shake = 7; }
          } else landHit(f, 1, 1);
        }
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "toss") {
      if (!A0.fired && u > 0.42) {
        A0.fired = true; const f = A0.f && !A0.f.gone ? A0.f : null;
        if (f) B.parts.push({ kind: "flask", x0: H0.x, y0: H0.y, z0: heroZ() + 10, f, x1: f.x, y1: f.y, z1: zOf(f) + 8, t: 0, dur: 0.3 });
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "lash") {
      const f = A0.f;
      if (u >= 1) {
        if (!f || f.gone) { after(); return; }
        if (f.shield) { snatchShield(f); act("haul", { f, dur: 0.28, snatch: true }); Sound.fx.whoosh(0.3, 0.9, true); return; }
        const to = { x: H0.x + Math.cos(H0.ang) * 15, y: H0.y + Math.sin(H0.ang) * 15 }; keepOn(to, B.roof, 5);
        f.act = { kind: "pulled", t: 0, x0: f.x, y0: f.y, h0: zOf(f), x1: to.x, y1: to.y }; f.alt = zOf(f); f.roof = null; f.z = 0; f.sign = null; if (B.slowFor === f) B.slowFor = null;
        act("haul", { f, dur: 0.32 }); Sound.fx.whoosh(0.3, 0.9, true);
      }
    }
    else if (A0.kind === "haul") {
      const f = A0.f;
      if (u >= 1) {
        if (!A0.snatch && f && !f.gone) { f.roof = B.roof; f.z = 0; f.act = { kind: "hurt", t: 0, dur: 0.5 }; keepOn(f, B.roof, 5); landHit(f, 1, 0.9, { front: false, kx: 0.1 }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 1.4); pop(f, "THE ROSARY", C.holy); }
        if (B.rosary) { B.rosary.phase = "back"; B.rosary.t = 0; }
        after();
      }
    }
    else if (A0.kind === "grab") {
      const f = A0.f;
      if (f && !f.gone && !A0.flung) { const [x, y] = fwd(11); f.x = lerp(f.x, x, Math.min(1, dt * 20)); f.y = lerp(f.y, y, Math.min(1, dt * 20)); f.z = 4 + 12 * smooth(u * 2); }
      if (!A0.flung && u > 0.55) {
        A0.flung = true;
        if (f && !f.gone) { f.act = { kind: "thrown", t: 0, hits: [] }; f.vx = A0.d[0] * 200; f.vy = A0.d[1] * 200; f.vz = 50; countHit(f); pop(f, "THROWN", C.holy); Sound.fx.hah(0.9); }
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "finish") {
      const f = A0.f, k = clamp(u / 0.5, 0, 1), tx = f && !f.gone ? f.x - Math.cos(H0.ang) * 8 : H0.x, ty = f && !f.gone ? f.y - Math.sin(H0.ang) * 8 : H0.y;
      H0.x = lerp(A0.from[0], tx, smooth(k)); H0.y = lerp(A0.from[1], ty, smooth(k)); H0.z = u < 0.5 ? Math.sin(k * PI) * 14 : 0;
      if (!A0.hit && u >= 0.5) { A0.hit = true; if (f) takedown(f); }
      if (u >= 1) after();
    }
    else if (A0.kind === "hurt") { const [x, y] = fwd(-40 * dt * (1 - u)); H0.x = x; H0.y = y; if (u >= 1) after(); }
    else if (A0.kind === "aside" || A0.kind === "point") { if (u >= 1) after(); }
    else if (A0.kind === "pray") { H0.z = 0; if (A0.t > 6) { act("idle"); B.finishing = false; } }
    else if (A0.kind === "trip") { if (u < 0.25) { const [x, y] = fwd(30 * dt); H0.x = x; H0.y = y; } if (u >= 1) act("idle"); }
    else if (A0.kind === "grabbed") {
      if (A0.t > (A0.tick || 0)) { A0.tick = A0.t + 0.4; hurtHero(5, true); }
      if (A0.t > 1.4 || (A0.by && A0.by.gone)) { act("idle"); H0.inv = 0.6; }
    } else if (A0.kind === "bless") {
      if (!A0.fired && u > 0.5) {
        A0.fired = true; B.flash = 0.6; B.flashC = C.holy; B.parts.push({ kind: "ring", x: H0.x, y: H0.y, z: B.roof.h, r: 6, t: 0, big: true });
        slowmo(0.25, 0.6, 1.1);
        for (const f of alive()) if (mine(f)) { landHit(f, 2, 1.4, { breaks: true, front: false, noFloor: true }); if (!f.gone) floor(f, { long: 1.3 }); }
        Sound.fx.hah(1); Sound.fx.clang();
      }
      if (u >= 1) act("idle");
    } else if (A0.kind === "block") { const k = B.keys; if (!(B.touch && B.touch.block && !B.touch.spent) && !k.KeyQ && !k.KeyZ && !k.ShiftLeft && !k.ShiftRight) act("idle"); }
    if (!["mount", "down"].includes(A0.kind) && B.angel.act.kind !== "carry") keepOn(H0, B.roof, 5);
  }
  function hurtHero(dmg, grab) {
    const H0 = B.hero;
    dmg *= R().hurt;
    B.hurtWave = true;
    H0.resolve = Math.max(0, H0.resolve - dmg); H0.combo = 0; H0.comboT = 0; H0.queue = null; H0.spirit = Math.max(0, H0.spirit - 2);
    B.shake = 6; Sound.fx.hit(1.2); Sound.fx.effort(); hitStop(0.07);
    if (!grab) { act("hurt", { dur: 0.42 }); woe(); }
    if (H0.resolve <= 0 && !B.down) {
      B.down = 0.001; act("down", {}); say("I have you. I have you. Rest now."); for (const f of B.foes) f.sign = null; B.slowFor = null;
      B.angel.act = { kind: "carry", t: 0 };
    }
  }
  // A demon draws back to strike (the gold sign) or to grab (the red).
  function windUp(f, grab, durMul) {
    f.act = { kind: "wind", t: 0, dur: (grab ? 0.95 : 0.85) * R().wind * (durMul || 1) }; f.sign = grab ? "red" : "gold"; f.ang = angTo(f) + PI;
    f.atk = grab ? "grab" : "punch";
    Sound.fx.growl(0.4);
    warn(f);
  }
  function attackScheduler(dt) {
    if (B.over || B.down || B.shift) return;
    B.nextAtk -= dt;
    const winding = B.foes.filter((f) => !f.gone && (f.act.kind === "wind" || f.act.kind === "lunge")).length;
    const maxW = B.enc.cap >= 4 || B.world === "depths" ? 2 : 1;
    if (B.nextAtk > 0 || winding >= maxW) return;
    const cands = B.foes.filter((f) => !f.gone && f.act.kind === "idle" && f.dizzy <= 0 && f.z === 0 && mine(f) && dTo(f) < 80);
    if (!cands.length) return;
    const f = cands[Math.floor(Math.random() * cands.length)], grab = f.kind === "grab";
    windUp(f, grab);
    B.nextAtk = lerp(B.enc.gap[0], B.enc.gap[1], Math.random()) * (B.world === "depths" ? 0.75 : 1);
    if (!grab && !B.taught.gold) { B.taught.gold = true; B.slowFor = f; say(tip("A gold sign: tap him now, to counter!", "A gold sign: press X now, to counter!")); f.act.dur = 1.0; }
    if (grab && !B.taught.red) { B.taught.red = true; B.slowFor = f; say(tip("A red sign cannot be countered. Hold on the open roof, to block it!", "A red sign cannot be countered. Hold Q, to block it!")); f.act.dur = 1.1; }
  }
  // Across from a roof near his: a leap over the gap, onto the edge of his roof.
  function leapOver(f) {
    const b0 = f.roof, R0 = B.roof, H0 = B.hero;
    const to = { x: lerp(clamp(f.x, R0.x0 + 10, R0.x1 - 10), H0.x, 0.3), y: lerp(clamp(f.y, R0.y0 + 10, R0.y1 - 10), H0.y, 0.3) }; keepOn(to, R0, 8);
    f.act = { kind: "leap", t: 0, dur: 0.7 + gap(b0, R0) / 300, x0: f.x, y0: f.y, h0: b0.h, x1: to.x, y1: to.y, h1: R0.h, top: Math.max(b0.h, R0.h) + 34 };
    f.alt = b0.h; f.roof = null; f.z = 0;
    Sound.fx.whoosh(0.3, 0.6, true); Sound.fx.growl(0.3);
  }
  // Off the edge: it falls to the street, and is gone.
  function fallOff(f) {
    f.alt = zOf(f); f.roof = null; f.z = 0; f.sign = null; f.vz = 30;
    f.act = { kind: "fall", t: 0 };
    if (B.slowFor === f) B.slowFor = null;
    pop(f, "OFF THE ROOF", "#ffffff", true); Sound.fx.yelp();
    if (!B.taught.edge) { B.taught.edge = true; say("Off the roof! Knock them over the edge, or throw them, and they are gone."); }
  }
  function stepFoe(f, dt) {
    const H0 = B.hero, a = f.act; a.t += dt; f.ph += dt;
    if (f.gone) return;
    if (f.dizzy > 0) f.dizzy -= dt;
    if (f.stunT > 0) { f.stunT -= dt; if (f.stunT <= 0) f.stun = 0; }
    const by = H0.act;
    if (a.kind === "arrive") {
      const u = clamp(a.t / a.dur, 0, 1), e = ease(u);
      f.x = lerp(a.x0, a.x1, e); f.y = lerp(a.y0, a.y1, e); f.z = a.z0 * (1 - u) * (1 - u); f.ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0);
      if (u >= 1) { f.z = 0; f.act = { kind: "idle", t: 0 }; dust(f.x, f.y, floorOf(f)); Sound.fx.step(1.8); }
      return;
    }
    if (a.kind === "leap") {
      const u = clamp(a.t / a.dur, 0, 1), e = smooth(u), c = 2 * a.top - (a.h0 + a.h1) / 2;
      f.x = lerp(a.x0, a.x1, e); f.y = lerp(a.y0, a.y1, e); f.alt = (1 - u) * (1 - u) * a.h0 + 2 * u * (1 - u) * c + u * u * a.h1; f.ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0);
      if (u >= 1) { f.roof = B.roof; f.z = 0; f.act = { kind: "idle", t: 0 }; dust(f.x, f.y, B.roof.h); Sound.fx.step(2); }
      return;
    }
    if (a.kind === "fall") {
      f.vz -= 520 * dt; f.alt += f.vz * dt; f.x += f.vx * dt * 0.6; f.y += f.vy * dt * 0.6;
      if (f.alt <= 0) { f.alt = 0; castOut(f, true); B.parts.push({ kind: "ring", x: f.x, y: f.y, z: 0, r: 4, t: 0 }); Sound.fx.hit(1.4); }
      return;
    }
    if (a.kind === "held") { if (by.kind !== "grab" || by.f !== f) { f.act = { kind: "hurt", t: 0, dur: 0.3 }; f.z = 0; } return; }
    if (a.kind === "countered") { if (by.kind !== "counter" || by.f !== f) { f.z = 0; floor(f); } return; }
    if (a.kind === "pulled") {
      const u = clamp(a.t / 0.32, 0, 1), e = u * u;
      f.x = lerp(a.x0, a.x1, e); f.y = lerp(a.y0, a.y1, e); f.alt = lerp(a.h0, B.roof.h, e) + Math.sin(u * PI) * 14; f.ang = Math.atan2(H0.y - f.y, H0.x - f.x);
      if (u >= 1 && !(by.kind === "haul" && by.f === f)) { f.roof = B.roof; f.z = 0; f.act = { kind: "hurt", t: 0, dur: 0.4 }; }
      return;
    }
    if (a.kind === "thrown") {
      f.x += f.vx * dt; f.y += f.vy * dt; f.vz -= 300 * dt; f.z = Math.max(0, f.z + f.vz * dt); f.ang += dt * 14;
      for (const o of B.foes) if (o !== f && !o.gone && !a.hits.includes(o) && mine(o) && Math.hypot(o.x - f.x, o.y - f.y) < 13) {
        a.hits.push(o);
        if (o.shield) { Sound.fx.clang(); sparks(o, "#ff9a60", 8); pop(o, "OFF THE SHIELD", "#ff8a70"); continue; }
        landHit(o, 2, 1.7, { front: false, breaks: true, fromX: f.x, fromY: f.y }); if (!o.gone && !lying(o)) o.dizzy = Math.max(o.dizzy, 1.6); pop(o, "BOWLED OVER", C.holy);
      }
      if (!inside(f.roof, f.x, f.y, -2)) { fallOff(f); return; }
      if (a.t > 0.5) { f.act = { kind: "hurt", t: 0, dur: 0.4 }; f.z = 0; f.vz = 0; f.vx *= 0.3; f.vy *= 0.3; landHit(f, 2, 1.4, { angel: true, front: false, kx: 0.2, noFloor: true }); if (!f.gone) floor(f); B.shake = 6; }
      return;
    }
    // In the air: launched, or slammed down.
    if (f.z > 0 || f.vz > 0 || a.kind === "spiked") {
      f.vz -= 260 * dt; f.z += f.vz * dt;
      if (f.z <= 0) {
        f.z = 0;
        if (a.kind === "spiked") { f.act = { kind: "hurt", t: 0, dur: 0.3 }; landHit(f, 3, 2, { angel: true, front: false, kx: 0.1, noFloor: true }); B.shake = 10; hitStop(0.1); if (!f.gone) floor(f, { long: 1.15 }); return; }
        f.vz = 0; if (a.kind === "air") { f.act = { kind: "idle", t: 0 }; landHit(f, 1, 0.8, { front: false, kx: 0.2, angel: true }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 1.5); B.shake = 4; }
      }
    }
    // Knocked across the roof: and over the edge, if it is near.
    f.x += f.vx * dt; f.y += f.vy * dt; const damp = 1 - 5 * dt; f.vx *= damp; f.vy *= damp;
    if (f.roof && !inside(f.roof, f.x, f.y, -1)) { if (Math.hypot(f.vx, f.vy) > 8 || a.kind === "hurt" || a.kind === "floored") { fallOff(f); return; } keepOn(f, f.roof, 2); }
    if (a.kind === "castout") return;
    if (a.kind === "hurt") { if (a.t > a.dur) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "floored") { if (a.t > a.dur) { f.act = { kind: "rise", t: 0 }; Sound.fx.growl(0.3); } return; }
    if (a.kind === "rise") { if (a.t > 0.4) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "wind") {
      f.ang = angTo(f) + PI;
      if (f.dizzy > 0) { f.sign = null; f.act = { kind: "idle", t: 0 }; if (B.slowFor === f) B.slowFor = null; return; }
      if (B.slowFor === f && a.t > a.dur * 0.55) B.slowFor = null;
      if (a.t > a.dur) {
        // Aimed where he is now, and only so far: get away in time, and it falls short.
        const ang = Math.atan2(H0.y - f.y, H0.x - f.x), d = Math.min(26, Math.max(0, dTo(f) - 10));
        f.act = { kind: "lunge", t: 0, dur: 0.2, x0: f.x, y0: f.y, x1: f.x + Math.cos(ang) * d, y1: f.y + Math.sin(ang) * d };
      }
      return;
    }
    if (a.kind === "lunge") {
      const u = clamp(a.t / a.dur, 0, 1);
      f.x = lerp(a.x0, a.x1, ease(u)); f.y = lerp(a.y0, a.y1, ease(u));
      if (u >= 1) resolveAttack(f);
      return;
    }
    if (a.kind === "recover") { if (a.t > 0.6) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "grabbing") { f.x = H0.x - Math.cos(f.ang + PI) * -12; f.y = H0.y - Math.sin(f.ang + PI) * -12; if (H0.act.kind !== "grabbed") f.act = { kind: "recover", t: 0 }; return; }
    // Idle. On his roof: round him, each to its own place in the ring, apart from the others. On a
    // roof near his: at its edge, watching, waiting a turn to come over.
    if (f.dizzy > 0) return;
    if (f.roof !== B.roof) { f.ang = angTo(f) + PI; f.walk = false; keepOn(f, f.roof, 6); return; }
    const ring = RING + (f.kind === "grab" ? 5 : 0), sa = f.slot + B.t * 0.25;
    let tx = H0.x + Math.cos(sa) * ring, ty = H0.y + Math.sin(sa) * ring;
    for (const o of B.foes) { if (o === f || o.gone || !mine(o)) continue; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < 16 && d > 0.1) { tx += dx / d * 14; ty += dy / d * 14; } }
    const to = { x: tx, y: ty }; keepOn(to, B.roof, 7);
    const dx = to.x - f.x, dy = to.y - f.y, d = Math.hypot(dx, dy);
    if (d > 2) { const sp = f.kind === "grab" ? 26 : 34; f.x += dx / d * sp * dt; f.y += dy / d * sp * dt; f.walk = true; } else f.walk = false;
    f.ang = angTo(f) + PI;
  }
  function spendBlock() { act("idle"); if (B.touch) B.touch.spent = true; B.qSpent = true; }
  function resolveAttack(f) {
    const H0 = B.hero, grab = f.sign === "red", close = dTo(f) < 20;
    f.sign = null;
    if (!close || H0.inv > 0 || H0.act.kind === "dash" || B.down || B.over) {
      if (grab) { floor(f, { long: 1.2 }); pop(f, "MISSED", "#9fe4ff"); Sound.fx.hit(0.6); }
      else { f.act = { kind: "recover", t: 0 }; if (H0.act.kind === "dash") pop(H0, "DODGED", "#9fe4ff"); }
      return;
    }
    if (grab && H0.act.kind === "block") {
      f.act = { kind: "hurt", t: 0, dur: 0.3 };
      landHit(f, 1.5, 1.6, { front: false, noFloor: true });
      if (!f.gone) { floor(f, { long: 1.1 }); const a = angTo(f); f.vx = Math.cos(a) * 70; f.vy = Math.sin(a) * 70; }
      B.flash = 0.45; B.flashC = C.holy; Sound.fx.clang(); Sound.fx.chord(5, 0.6);
      slowmo(0.25, 0.35, 1.15);
      pop(H0, "BLOCKED: THROWN OFF", C.holy, true);
      spendBlock(); return;
    }
    if (grab) { act("grabbed", { by: f }); f.act = { kind: "grabbing", t: 0 }; Sound.fx.growl(1); return; }
    if (H0.act.kind === "block") { f.act = { kind: "hurt", t: 0, dur: 0.4 }; const a = angTo(f); f.vx = Math.cos(a) * 40; f.vy = Math.sin(a) * 40; Sound.fx.clang(); pop(H0, "BLOCKED", C.holy); f.dizzy = 1; hitStop(0.06); spendBlock(); return; }
    f.act = { kind: "recover", t: 0 };
    hurtHero(10);
  }
  function castOut(f, fell) {
    B.cast++;
    f.gone = true; f.sign = null; f.act = { kind: "castout", t: 0, fell: !!fell };
    Sound.fx.yelp();
    setTimeout(() => { Sound.fx.puff(); }, fell ? 0 : 380);
    pop(f, fell ? "GONE" : "CAST OUT", "#ffffff");
    if (B.slowFor === f) B.slowFor = null;
    if (!alive().length && B.spawnQ.length === 0) slowmo(0.12, 1.1, 1.25);
  }
  function stepRosary(dt) {
    const Q = B.rosary; if (!Q) return;
    Q.t += dt;
    const H0 = B.hero, holding = (H0.act.kind === "lash" || H0.act.kind === "haul") && H0.act.f === Q.f;
    if ((!Q.f || Q.f.gone || !holding) && Q.phase !== "back") { Q.phase = "back"; Q.t = 0; }
    if (Q.phase === "out" && Q.t > 0.22) { Q.phase = "wrap"; Q.t = 0; Sound.fx.chain(false); }
    else if (Q.phase === "wrap" && Q.t > 0.18) { Q.phase = "haul"; Q.t = 0; }
    else if (Q.phase === "back" && Q.t > 0.25) B.rosary = null;
  }

  // ---- Keys ---------------------------------------------------------------------------------------------
  const arrows = () => { const k = B.keys; return [(k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0)]; };
  function stepKeys(dt) {
    const H0 = B.hero, [kx, ky] = arrows(), moving = kx || ky;
    if (B.woeT) B.woeT = Math.max(0, B.woeT - dt);
    if (moving && (H0.act.kind === "idle" || H0.act.kind === "run")) {
      if (H0.act.kind !== "run") act("run", { ph: 0 });
      const m = Math.hypot(kx, ky);
      H0.x += kx / m * 70 * dt; H0.y += ky / m * 70 * dt; H0.ang = Math.atan2(ky, kx);
    } else if (!moving && H0.act.kind === "run") act("idle");
  }
  // The best target the way an arrow points (or, with none, the nearest).
  function pick(o) {
    o = o || {};
    const H0 = B.hero, [kx, ky] = arrows(), m = Math.hypot(kx, ky);
    let best = null, bs = -1e9;
    for (const f of alive()) {
      if (["arrive", "fall", "castout"].includes(f.act.kind)) continue;
      if (o.air && f.z <= 12) continue;
      if (o.far && near(f) && !f.shield) continue;
      if (o.near && !near(f)) continue;
      if ((o.far || o.near) && lying(f)) continue;
      const dx = f.x - H0.x, dy = f.y - H0.y, d = Math.hypot(dx, dy) || 1;
      if (d > 320) continue;
      let s;
      if (m) { const dot = (dx * kx + dy * ky) / (d * m); if (dot < 0.25) continue; s = dot * 120 - d; }
      else s = -d + (mine(f) ? 60 : 0);
      if (f.sign === "gold") s += 30;
      if (lying(f) && mine(f)) s += 50;
      if (o.far) s += d * 1.4 + (f.shield ? 300 : 0);
      if (s > bs) { bs = s; best = f; }
    }
    return best;
  }
  function key(code, isDown, e) {
    B.keys[code] = isDown;
    if (!isDown) { if (["KeyQ", "KeyZ", "ShiftLeft", "ShiftRight"].includes(code) && B.hero.act.kind === "block") act("idle"); return; }
    if (e && e.repeat) return;
    if (code === "Escape" || code === "KeyP") { Game.pause(); return; }
    if (B.over || B.down) return;
    const H0 = B.hero, [kx, ky] = arrows();
    if (code === "Space" || code === "KeyJ") { const f = pick(); if (f) tapDemon(f, true); }
    else if (code === "KeyX") { const g = alive().filter((f) => f.sign === "gold" && f.act.kind === "wind").sort((a, b) => dTo(a) - dTo(b))[0]; if (g) counter(g); else pop(H0, "NOTHING TO COUNTER", "rgba(233,230,223,0.6)"); }
    else if (code === "KeyQ" || code === "KeyZ" || code === "ShiftLeft" || code === "ShiftRight") { if (!busy()) act("block", {}); }
    else if (code === "KeyC") heavy(pick());
    else if (code === "KeyE") launch(pick());
    else if (code === "KeyV") slam(pick({ air: true }) || pick());
    else if (code === "KeyF") water(pick());
    else if (code === "KeyR") { const f = pick({ far: true }); if (f) stole(f); else pop(H0, "NONE FAR ENOUGH", "rgba(233,230,223,0.6)"); }
    else if (code === "KeyT") { const f = pick({ near: true }); if (f) throwFoe(f, kx, ky); else pop(H0, "NONE CLOSE ENOUGH", "rgba(233,230,223,0.6)"); }
    else if (code === "KeyB") { if (B.world === "heights") finisher(); else bless(); }
  }

  // ---- Touch --------------------------------------------------------------------------------------------
  function foeAt(p) {
    let best = null, bd = 1e9;
    for (const f of B.foes) {
      if (f.gone || f.act.kind === "fall") continue;
      const z = zOf(f), x = sx(f.x, z), y = sy(f.y, z), r = 11 * FIG * K(z) * (f.kind === "grab" ? 1.25 : 1) + 12, d = Math.hypot(p.x - x, p.y - y);
      if (d < r + (f.sign ? 8 : 0) && d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function gesture(T, dx, dy) {
    const tg = T.target;
    if (!tg || tg.gone) return;
    if (tg.shield && !lying(tg)) stole(tg);
    else if (dy < -30 && Math.abs(dy) > Math.abs(dx) * 1.1) launch(tg);
    else if (dy > 30 && Math.abs(dy) > Math.abs(dx) * 1.1) slam(tg);
    else if (near(tg)) throwFoe(tg, dx, dy);
    else stole(tg);
  }
  function down(p, e) {
    if (B.over || B.down) return;
    B.touch = { id: e.pointerId, x0: p.x, y0: p.y, r0: performance.now(), target: foeAt(p), moved: false, block: false, water: false };
  }
  function move(p, e) {
    const T = B.touch; if (!T || T.id !== e.pointerId) return;
    if (dist(p.x, p.y, T.x0, T.y0) > 14) T.moved = true;
    if (T.moved && !T.done && !T.block) { const dx = p.x - T.x0, dy = p.y - T.y0; if (Math.hypot(dx, dy) > 40) { T.done = true; gesture(T, dx, dy); } }
  }
  function up(p, e) {
    const T = B.touch; if (!T || T.id !== e.pointerId) return;
    B.touch = null;
    if (T.block) { if (B.hero.act.kind === "block") act("idle"); return; }
    if (T.done || B.over || B.down) return;
    if (!T.moved) {
      if (T.target && !T.target.gone) { if (T.water && !lying(T.target)) water(T.target); else tapDemon(T.target); return; }
      const f = foeAt(p); if (f) { tapDemon(f); return; }
      // The open roof, where he stands: he goes there.
      const h = B.roof.h, k = K(h), cam = api.cam, x = cam.x + (p.x - W / 2) / k, y = cam.y + (p.y - H / 2) / k;
      if (inside(B.roof, x, y, -4)) tapRoof(x, y);
    } else { const dx = p.x - T.x0, dy = p.y - T.y0; if (Math.hypot(dx, dy) > 20) gesture(T, dx, dy); }
  }

  // ---- Bits and pieces ------------------------------------------------------------------------------------
  function pop(o, text, c, big) { const z = o === B.hero ? heroZ() : zOf(o); B.pops.push({ x: o.x, y: o.y, z: z + 20, text, c, t: 0, big }); }
  function sparks(f, c, n) { const z = f === B.hero ? heroZ() : zOf(f); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 70; B.parts.push({ kind: "spark", x: f.x, y: f.y, z: z + 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 20 + Math.random() * 50, c, t: 0 }); } }
  function shards(f) { for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; B.parts.push({ kind: "shard", x: f.x, y: f.y, z: zOf(f) + 10, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 40 + Math.random() * 60, r: Math.random() * TAU, t: 0 }); } }
  function dust(x, y, z) { for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; B.parts.push({ kind: "smoke", x, y, z, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, vz: 0, t: 0 }); } }
  const LIFE = { shieldfly: 2, hat: 2, ring: 0.7, smoke: 0.8, flask: 0.5, mark: 0.4, beam: 0.35, column: 1, warn: 0.5, drop: 0.6 };
  function stepParts(dt) {
    for (const p of B.parts) {
      p.t += dt;
      if (["spark", "shard", "hat", "shieldfly", "drop"].includes(p.kind)) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= (p.kind === "spark" ? 160 : 260) * dt; p.z += p.vz * dt;
        if (p.r !== undefined) p.r += (p.vr || 8) * dt;
        if (p.floor !== undefined && p.z < p.floor) { p.z = p.floor; p.vz = -p.vz * 0.3; p.vx *= 0.5; p.vy *= 0.5; }
        if (p.z < 0) p.z = 0;
      } else if (p.kind === "smoke") { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
      else if (p.kind === "ring") p.r += dt * (p.big ? 260 : 120);
      else if (p.kind === "flask" && p.t >= p.dur && !p.done) {
        p.done = true;
        for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; B.parts.push({ kind: "drop", x: p.x1, y: p.y1, z: p.z1, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, vz: 40 + Math.random() * 40, t: 0 }); }
        Sound.fx.splash();
        const t = p.f;
        if (t && !t.gone) {
          if (t.shield) pop(t, "OFF THE SHIELD", "#9fe4ff");
          else { landHit(t, 1, 1, { front: false, kx: 0.3 }); if (!t.gone) t.dizzy = Math.max(t.dizzy, 1.4); pop(t, "HOLY WATER", "#9fe4ff"); }
          for (const o of alive()) if (o !== t && !o.shield && Math.hypot(o.x - t.x, o.y - t.y) < 16 && mine(o) === mine(t)) { landHit(o, 0.5, 0.6, { front: false, angel: true, kx: 0.2 }); if (!o.gone) o.dizzy = Math.max(o.dizzy, 0.8); }
        }
      }
    }
    B.parts = B.parts.filter((p) => p.t < (LIFE[p.kind] || 0.6));
    for (const p of B.pops) p.t += dt;
    B.pops = B.pops.filter((p) => p.t < 1.1);
  }

  // ---- Drawing: the figures from above ------------------------------------------------------------------
  // Drawn once the roofs are down, before any building that stands over the angel. Everyone in order
  // of height, so one higher (a leap, a launch) passes over the rest.
  function drawWorld() {
    const H0 = B.hero, h = B.roof.h, t = B.t;
    // The light of his angel on his roof, and of the Heights over everything.
    const gk = K(h), A = B.angel;
    glow(sx(A.x, h), sy(A.y, h), 120 * gk, C.holy, 0.16);
    const ents = [{ z: heroZ(), y: H0.y, draw: drawHero }];
    for (const f of B.foes) ents.push({ z: zOf(f), y: f.y, draw: () => drawFoe(f) });
    ents.push({ z: A.alt, y: A.y, draw: drawAngelHere });
    ents.sort((a, b) => a.z - b.z || a.y - b.y);
    // Shadows first, on whatever is under each.
    for (const f of B.foes) if (!f.gone && f.act.kind !== "fall") shadow(f.x, f.y, floorOf(f), zOf(f) - floorOf(f), f.kind === "grab" ? 1.25 : 1);
    shadow(H0.x, H0.y, h, H0.z, 1);
    for (const e of ents) e.draw();
    drawRosary();
    drawParts();
    if (B.world === "heights") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,226,160,0.08)"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    void t;
  }
  function shadow(x, y, z, up, s) { s *= FIG; const k = K(z), X = sx(x + up * 0.1, z), Y = sy(y + up * 0.14, z); ctx.globalAlpha = clamp(0.4 - up / 200, 0.12, 0.4); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(X, Y, 9 * k * s, 7 * k * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  function drawAngelHere() {
    const A = B.angel;
    if (A.act.kind === "smite" && A.alt > api.cam.z - 40) return;
    api.drawAngel({ x: A.x, y: A.y, alt: A.alt, head: A.head, mode: A.mode, wing: A.wing, rider: (B.over > 1.25) || A.act.kind === "carry" && A.act.t > 0.4 });
  }
  // How he looks this moment: how far each arm reaches, a kick, a spin, a stretch, flat out.
  function heroLook() {
    const H0 = B.hero, a = H0.act, u = a.dur ? clamp(a.t / a.dur, 0, 1) : 0, t = B.t;
    const L = { armF: 0.15 + 0.08 * Math.sin(t * 1.7), armB: 0.1, kick: 0, spin: 0, sx: 1, sy: 1, tail: 0, pray: false, flat: false };
    const blow = (k0) => (u < 0.3 ? -0.2 * (u / 0.3) : u < 0.48 ? lerp(-0.2, 1, (u - 0.3) / 0.18) : u < 0.72 ? 1 : lerp(1, k0, (u - 0.72) / 0.28));
    switch (a.kind) {
      case "run": L.tail = 1; L.armF = 0.3 + 0.3 * Math.sin(a.ph); L.armB = 0.3 - 0.3 * Math.sin(a.ph); break;
      case "zip": case "dash":
        L.tail = 1;
        if (a.style === "superman") { L.sx = 1.45; L.sy = 0.8; L.armF = L.armB = 1; }
        else if (a.style === "jumpkick") { L.kick = 1; }
        else if (a.style === "flip" || a.style === "roll" || a.style === "cartwheel") { L.spin = u * TAU; L.sy = a.style === "cartwheel" ? 1.25 : 0.85; }
        else { L.spin = Math.sin(u * PI * 2) * 0.4; }
        break;
      case "jumpkick": L.kick = 1; L.tail = 1; break;
      case "spike": L.armF = L.armB = u < 0.5 ? -0.2 : 1; break;
      case "land": L.sy = 0.9; break;
      case "strike": {
        const w = a.which;
        if (w === "kick" || w === "sweep") { L.kick = Math.max(0, blow(0)); if (w === "sweep") L.spin = -0.6 * Math.max(0, blow(0)); }
        else if (w === "knee") { L.kick = 0.5 * Math.max(0, blow(0)); L.armF = L.armB = 0.6; }
        else if (w === "heavy" || w === "slam") { L.armF = L.armB = blow(0.1); }
        else if (w === "launch") { L.armF = blow(0.2); L.sx = 1 + 0.15 * Math.max(0, blow(0)); }
        else if (H0.hits % 2) L.armB = blow(0.1); else L.armF = blow(0.1);
        break;
      }
      case "counter": L.armF = L.armB = 0.8; if (u > 0.5) { L.sy = 0.9; L.armF = 0.9; } break;
      case "toss": L.armF = blow(0.2); break;
      case "lash": L.armF = Math.min(1, u * 2); break;
      case "haul": L.armF = lerp(1, 0.2, u); L.armB = 0.3; break;
      case "point": L.armF = 1; break;
      case "grab": L.armF = L.armB = u < 0.55 ? 0.6 : 1; if (u > 0.55) L.spin = (u - 0.55) * 2; break;
      case "finish": L.armF = L.armB = u > 0.45 ? 1 : 0.2; break;
      case "hurt": L.armF = L.armB = -0.3; L.spin = Math.sin(a.t * 30) * 0.2 * (1 - u); break;
      case "aside": L.armF = 0.6 * Math.min(1, u * 4); break;
      case "trip": case "down": L.flat = true; break;
      case "grabbed": L.spin = Math.sin(t * 22) * 0.25; L.armF = L.armB = -0.2; break;
      case "block": case "pray": L.pray = true; break;
      case "bless": L.armF = u < 0.5 ? u * 2 : 1 - (u - 0.5) * 2; break;
    }
    return L;
  }
  function drawHero() {
    const H0 = B.hero, h = B.roof.h, z = heroZ(), k = K(z), X = sx(H0.x, z), Y = sy(H0.y, z), L = heroLook();
    if (H0.act.kind === "mount" && B.over > 1.25) return;
    // His ring of light on the roof.
    const gk = K(h), GX = sx(H0.x, h), GY = sy(H0.y, h);
    glow(GX, GY, 26 * gk, C.holy, 0.22);
    ctx.strokeStyle = hexA(C.holy, 0.5 + 0.15 * Math.sin(B.t * 3)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(GX, GY, 15 * gk, 0, TAU); ctx.stroke();
    const hide = H0.inv > 0 && !["dash", "dismount"].includes(H0.act.kind) && Math.sin(B.t * 40) > 0;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(H0.ang + L.spin);
    ctx.scale(k * FIG, k * FIG);
    if (hide) ctx.globalAlpha = 0.6;
    if (L.flat) {
      // Flat on the roof: the length of him, the hat rolled off.
      ctx.fillStyle = COAT2; ctx.beginPath(); ctx.ellipse(-3, 0, 12, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = COAT; ctx.beginPath(); ctx.ellipse(-1, 0, 9, 5.4, 0, 0, TAU); ctx.fill();
      circle(9, 0, 3.4, SKIN); circle(14, 5, 4.6, HAT);
      ctx.restore(); return;
    }
    ctx.scale(L.sx, L.sy);
    // A leg out ahead, in a kick.
    if (L.kick > 0) { stroke2(1, 2.5, 3 + 13 * L.kick, 2.5, "#2a3656", 3.6); circle(4 + 13 * L.kick, 2.5, 2, "#0c0e18"); }
    // The coat, its tail streaming out behind him when he moves.
    const tl = L.tail * (1 + 0.3 * Math.sin(B.t * 18));
    poly([-2, -6.5, -9 - tl * 5, -4.5, -12 - tl * 7, 0, -9 - tl * 5, 4.5, -2, 6.5], COAT2);
    ctx.fillStyle = COAT; ctx.beginPath(); ctx.ellipse(0, 0, 5, 7.6, 0, 0, TAU); ctx.fill();
    // The arms: the shoulders, and the hands as far out as the blow has carried them.
    if (L.pray) { stroke2(1, -6.4, 5.5, -1.2, COAT, 3.2); stroke2(1, 6.4, 5.5, 1.2, COAT2, 3.2); circle(6.4, -0.6, 1.6, SKIN); circle(6.4, 0.6, 1.6, SKIN); }
    else for (const [side, ext] of [[-1, L.armB], [1, L.armF]]) { const hx = 2.5 + 12 * ext, hy = side * (6.6 - 4.8 * Math.max(0, ext)); stroke2(1, side * 6.4, hx, hy, side > 0 ? COAT : COAT2, 3.2); circle(hx, hy, 1.9, SKIN); }
    // The white collar at the front, and the hat: brim, crown, the gold band.
    rect(3.8, -1.6, 1.6, 3.2, "#ffffff");
    circle(0.4, 0, 6.6, HAT); circle(0.4, 0, 4.2, "#2a3858");
    ctx.strokeStyle = BAND; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0.4, 0, 4.5, 0, TAU); ctx.stroke();
    ctx.restore();
    // At prayer, or blocking: the light of his angel round him like a halo.
    if (L.pray) {
      const pul = 0.85 + 0.15 * Math.sin(B.t * 9), r = 20 * k * pul;
      glow(X, Y, r * 1.6, C.holy, 0.35);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = hexA(C.holy, 0.7); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + B.t * 0.6; ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * r * 1.1, Y + Math.sin(a) * r * 1.1); ctx.lineTo(X + Math.cos(a) * r * 1.4, Y + Math.sin(a) * r * 1.4); ctx.stroke(); }
      ctx.restore();
    }
    if (H0.act.kind === "bless") glow(X, Y, 50 * k, C.holy, 0.6);
  }
  function stroke2(x0, y0, x1, y1, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  // A demon from above: a ragged coat of darkness edged in red, a crooked hat, two embers for eyes,
  // the claws. The big ones are bigger; one with a shield holds a slab of dark before it.
  function drawFoe(f) {
    const z = zOf(f), k = K(z), X = sx(f.x, z), Y = sy(f.y, z), s = (f.kind === "grab" ? 1.25 : 1) * FIG, a = f.act, t = B.t + f.seed, ink = "#050308";
    if (f.act.kind === "castout") {
      const u = a.t / 0.7;
      if (u > 0.4) { if (!f.puffed) { f.puffed = true; B.parts.push({ kind: "ring", x: f.x, y: f.y, z, r: 4, t: 0.2 }); for (let i = 0; i < 8; i++) { const an = Math.random() * TAU; B.parts.push({ kind: "spark", x: f.x, y: f.y, z: z + 8, vx: Math.cos(an) * 50, vy: Math.sin(an) * 50, vz: 60, c: C.holy, t: 0 }); } } return; }
      ctx.globalAlpha = 1 - u * 1.6;
    }
    if (!f.gone && f.roof && !lying(f)) glowOval(sx(f.x, floorOf(f)), sy(f.y, floorOf(f)), 18 * K(floorOf(f)) * s, 18 * K(floorOf(f)) * s, "#ff1a1a", 0.16);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(f.ang + (a.kind === "fall" || a.kind === "thrown" || a.kind === "castout" ? a.t * 9 : 0)); ctx.scale(k * s, k * s);
    if (lying(f) || (a.kind === "castout" && f.takenDown)) {
      // Flat on its back, twitching.
      const tw = Math.sin(t * 11) * 0.6;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = f.rim; ctx.lineWidth = 1.1 / (k * s); ctx.stroke();
      circle(10, 0, 4, ink); stroke2(2, -4, 4 + tw, -10, ink, 2.4); stroke2(2, 4, 5 - tw, 10, ink, 2.4);
    } else {
      // The arms and claws: at its sides, raised back to strike, or thrown forward in the lunge.
      const reach = a.kind === "wind" ? -0.4 : a.kind === "lunge" || a.kind === "grabbing" ? 1 : a.kind === "hurt" ? -0.6 + Math.sin(t * 30) * 0.4 : f.walk ? 0.15 + 0.15 * Math.sin(f.ph * 9) : 0.1;
      for (const side of [-1, 1]) { const hx = 3 + 9 * reach, hy = side * (6.5 + (a.kind === "wind" ? 3 : 0) - 3 * Math.max(0, reach)); stroke2(0, side * 5.5, hx, hy, ink, 2.6); for (const c of [-0.5, 0, 0.5]) stroke2(hx, hy, hx + Math.cos(c) * 3, hy + Math.sin(c) * 3 + side * 0.5, ink, 0.9); }
      // The coat, ragged.
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const an = i * TAU / 12, r = (i % 2 ? 5.4 : 7) + Math.sin(t * 5 + i) * 0.5, rx = an > PI / 2 && an < PI * 1.5 ? 1.15 : 0.9; const px = Math.cos(an) * r * rx, py = Math.sin(an) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = f.rim; ctx.lineWidth = 1.2 / (k * s); ctx.stroke();
      if (f.kind === "grab") { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(-3, 0, 4, 6, 0, 0, TAU); ctx.fill(); }
      // The hat, askew.
      if (f.hat) { ctx.save(); ctx.translate(-0.5, 0.6); ctx.rotate(0.4); ctx.fillStyle = "#0e0a12"; ctx.beginPath(); ctx.ellipse(0, 0, f.hatKind ? 5 : 6, f.hatKind ? 5 : 4.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#16101c"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); ctx.restore(); }
      // The ember eyes, at the front.
      const ek = f.dizzy > 0 ? 0.5 + 0.5 * Math.sin(t * 20) : 1;
      circle(4.6, -1.7, 0.9, "#ffb070"); circle(4.6, 1.7, 0.9, "#ffb070");
      ctx.restore(); glow(X + Math.cos(f.ang) * 4.6 * k * s, Y + Math.sin(f.ang) * 4.6 * k * s, 7 * k, C.ember, 0.6 * ek);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(f.ang); ctx.scale(k * s, k * s);
      if (f.shield) { poly([7, -9, 10.5, -8, 10.5, 8, 7, 9], ink); ctx.strokeStyle = hexA(C.ember, 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(8.5, -7); ctx.lineTo(9.4, -2); ctx.lineTo(8.2, 2); ctx.lineTo(9.3, 7); ctx.stroke(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    if (a.kind === "castout") return;
    // One that is down: a gold mark, and a ring that runs out as it gets ready to rise.
    if (lying(f) && !a.pinned) {
      const u = clamp(a.t / a.dur, 0, 1), pul = 0.75 + 0.25 * Math.sin(B.t * 9), my = Y - 20;
      glow(X, my, 16, C.holy, 0.4 * pul);
      ctx.strokeStyle = hexA(u > 0.7 ? "#ff8a70" : C.holy, 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, my, 10, -PI / 2, -PI / 2 + TAU * (1 - u)); ctx.stroke();
      poly([X - 5, my - 3, X + 5, my - 3, X, my + 4], "#fff3cf");
      if (B.cast < 3) text(tip("TAP · FINISH", "SPACE · FINISH"), X, my - 15, { align: "center", size: 7.5, weight: 800, spacing: 2, color: C.holy, alpha: pul });
    }
    if (f.sign) {
      const hx = X, hy = Y - 24 * Math.max(1, k * 0.6), pul = 1 + 0.15 * Math.sin(B.t * 18), col = f.sign === "gold" ? C.holy : "#ff3040";
      glow(hx, hy, 22 * pul, col, 0.7);
      ctx.save(); ctx.translate(hx, hy); ctx.scale(pul, pul);
      if (f.sign === "gold") { rect(-2, -9, 4, 18, "#fff3cf"); rect(-7, -4, 14, 4, "#fff3cf"); }
      else { poly([0, -10, 9, 6, -9, 6], "#ff6070"); rect(-1.1, -4, 2.2, 6, "#200"); rect(-1.1, 3, 2.2, 2, "#200"); }
      ctx.restore();
      const kk = clamp(a.t / a.dur, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 15, -PI / 2, -PI / 2 + TAU * (1 - kk)); ctx.stroke();
    }
    if (f.dizzy > 0) for (let i = 0; i < 3; i++) { const an = B.t * 5 + i * TAU / 3; star(X + Math.cos(an) * 11, Y - 12 + Math.sin(an) * 4, 3.4, "#ffe08a"); }
    if (f.hp < f.max) { const bw = 22; rect(X - bw / 2, Y + 13 * k, bw, 2.2, "rgba(255,255,255,0.12)"); rect(X - bw / 2, Y + 13 * k, bw * Math.max(0, f.hp) / f.max, 2.2, f.rim); }
  }
  function star(x, y, r, c) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
  // The rosary from above: out from his hand across the roofs, a ring of beads round the demon.
  function drawRosary() {
    const Q = B.rosary; if (!Q) return;
    const H0 = B.hero, f = Q.f, hz = heroZ() + 6, hx = H0.x + Math.cos(H0.ang) * 10, hy = H0.y + Math.sin(H0.ang) * 10;
    const A = scr(hx, hy, hz);
    let T = f && !f.gone ? scr(f.x, f.y, zOf(f) + 6) : A;
    const k = clamp(Q.phase === "out" ? Q.t / 0.22 : Q.phase === "back" ? 1 - Q.t / 0.25 : 1, 0, 1);
    const E = { x: lerp(A.x, T.x, ease(k)), y: lerp(A.y, T.y, ease(k)) }, n = 34, nx = -(E.y - A.y), ny = E.x - A.x, nl = Math.hypot(nx, ny) || 1;
    ctx.strokeStyle = "#a88a48"; ctx.lineWidth = 0.8; ctx.beginPath();
    const pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, sag = Math.sin(u * PI) * 10 * (1 - (Q.phase === "haul" ? 0.6 : 0)); const x = lerp(A.x, E.x, u) + nx / nl * sag, y = lerp(A.y, E.y, u) + ny / nl * sag; pts.push([x, y]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18; ctx.strokeStyle = C.holy; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    pts.forEach(([x, y], i) => { if (i % 2) return; const big = i % 10 === 0; circle(x, y, big ? 2.3 : 1.6, "#4a2c18"); circle(x - 0.6, y - 0.6, big ? 1 : 0.7, "#e0b080"); });
    if ((Q.phase === "wrap" || Q.phase === "haul") && f && !f.gone) {
      // Wound round it.
      const kz = K(zOf(f)), turns = Q.phase === "wrap" ? smooth(Q.t / 0.18) : 1;
      for (let i = 0; i < 18 * turns; i++) { const a = i / 18 * TAU, x = T.x + Math.cos(a) * 9 * kz, y = T.y + Math.sin(a) * 9 * kz; circle(x, y, 1.6, "#4a2c18"); circle(x - 0.5, y - 0.5, 0.7, "#e0b080"); }
    }
    // The crucifix, lit, at the end.
    glow(E.x, E.y, 10, C.holy, 0.5);
    ctx.save(); ctx.translate(E.x, E.y); ctx.rotate(Math.atan2(E.y - A.y, E.x - A.x) + PI / 2); rect(-1, -5, 2, 10, "#ece6d4"); rect(-3.5, -3, 7, 1.8, "#ece6d4"); ctx.restore();
  }
  function drawParts() {
    for (const p of B.parts) {
      const a = 1 - p.t / (LIFE[p.kind] || 0.6), k = K(p.z === undefined ? B.roof.h : p.z);
      if (p.kind === "spark") { const x = sx(p.x, p.z), y = sy(p.y, p.z); line(x, y, x - p.vx * 0.02 * k, y - p.vy * 0.02 * k, p.c, 2); glow(x, y, 6, p.c, a * 0.6); }
      else if (p.kind === "drop") circle(sx(p.x, p.z), sy(p.y, p.z), 1.8, "rgba(196,240,255," + a + ")");
      else if (p.kind === "shard") { ctx.save(); ctx.translate(sx(p.x, p.z), sy(p.y, p.z)); ctx.rotate(p.r); poly([-4, -2, 5, 0, -2, 3], "#050308"); ctx.restore(); }
      else if (p.kind === "smoke") { ctx.globalAlpha = a * 0.6; circle(sx(p.x, p.z), sy(p.y, p.z), (6 + (1 - a) * 12) * k * 0.6, "#030205"); ctx.globalAlpha = 1; }
      else if (p.kind === "ring") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a)); ctx.lineWidth = p.big ? 5 : 3; ctx.beginPath(); ctx.arc(sx(p.x, p.z), sy(p.y, p.z), p.r * k, 0, TAU); ctx.stroke(); }
      else if (p.kind === "hat") { ctx.save(); ctx.translate(sx(p.x, p.z), sy(p.y, p.z)); ctx.rotate(p.r); ctx.scale(k, k); ctx.fillStyle = "#0e0a12"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (p.kind === "shieldfly") { ctx.save(); ctx.translate(sx(p.x, p.z), sy(p.y, p.z)); ctx.rotate(p.r); ctx.scale(k, k); poly([-2, -9, 2, -8, 2, 8, -2, 9], "#050308"); ctx.restore(); glow(sx(p.x, p.z), sy(p.y, p.z), 14, C.ember, 0.3 * a); }
      else if (p.kind === "flask") { const u = clamp(p.t / p.dur, 0, 1), x = lerp(p.x0, p.x1, u), y = lerp(p.y0, p.y1, u), z = lerp(p.z0, p.z1, u) + Math.sin(u * PI) * 24, X = sx(x, z), Y = sy(y, z); ctx.save(); ctx.translate(X, Y); ctx.rotate(u * 12); rect(-2, -4, 4, 7, "#bfe8ff"); ctx.restore(); glow(X, Y, 10, C.ice, 0.6); }
      else if (p.kind === "mark") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a) * 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx(p.x, p.z), sy(p.y, p.z), (4 + p.t * 30) * k, 0, TAU); ctx.stroke(); }
      else if (p.kind === "warn") { const f = p.f; if (!f.gone) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = hexA(p.c, Math.max(0, a)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx(f.x, zOf(f)), sy(f.y, zOf(f)) - 24, 12 + p.t * 110, 0, TAU); ctx.stroke(); ctx.restore(); } }
      else if (p.kind === "beam") {
        // His angel's light: a lance of it, from the angel down to the demon.
        const f = p.f, x1 = f && !f.gone ? f.x : p.x1, y1 = f && !f.gone ? f.y : p.y1, z1 = f && !f.gone ? zOf(f) + 8 : p.z1;
        const A = scr(p.x0, p.y0, p.z0), T = scr(x1, y1, z1);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        line(A.x, A.y, T.x, T.y, hexA(C.holy, 0.5 * Math.max(0, a)), 14 * a + 2); line(A.x, A.y, T.x, T.y, hexA("#ffffff", Math.max(0, a)), 3 * a + 1);
        ctx.restore(); glow(T.x, T.y, 30, C.holy, 0.8 * a); glow(A.x, A.y, 18, "#ffffff", 0.6 * a);
      }
      else if (p.kind === "column") {
        // A column of light straight down out of the sky: from right over us, onto the roof.
        const X = sx(p.x, p.z), Y = sy(p.y, p.z), r = (p.big ? 46 : 18) * k;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.max(0, a);
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, r * 2.2); g.addColorStop(0, "rgba(255,250,230,0.95)"); g.addColorStop(0.4, hexA(C.holy, 0.6)); g.addColorStop(1, hexA(C.holy, 0)); ctx.fillStyle = g; ctx.fillRect(X - r * 2.2, Y - r * 2.2, r * 4.4, r * 4.4);
        ctx.restore();
      }
    }
    for (const p of B.pops) {
      const al = clamp(1 - (p.t - 0.6) / 0.5, 0, 1), x = clamp(sx(p.x, p.z), 70, W - 70), y = Math.max(70, sy(p.y, p.z) - 22 - p.t * 26);
      text(p.text, x, y, { align: "center", size: p.big ? 15 : 10.5, weight: 800, spacing: p.big ? 3 : 2, color: p.c, glow: p.big ? C.holy : p.c, blur: p.big ? 14 : 8, alpha: al });
    }
  }

  // ---- The HUD ----------------------------------------------------------------------------------------
  function drawHUD() {
    const H0 = B.hero;
    if (B.world === "depths" && !B.shift) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9); vg.addColorStop(0, "rgba(30,0,4,0.25)"); vg.addColorStop(1, "rgba(20,0,4,0.8)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      for (const w of B.whispers) { const a = Math.min(1, w.t / 0.6) * Math.min(1, (3.4 - w.t) / 0.8); text(w.text, w.x, w.y, { align: "center", font: FONT.line, italic: true, size: 17, weight: 500, color: "#c87a7a", alpha: a * 0.55 }); }
    }
    if (B.slowVis > 0.02) { const a = B.slowVis; ctx.fillStyle = "rgba(6,12,30," + (0.3 * a) + ")"; ctx.fillRect(0, 0, W, H); }
    if (B.shift) { const u = B.shift.t / 0.9; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(B.shift.to === "depths" ? "#ff2a1a" : C.holy, 0.45 * Math.sin(u * PI)); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (B.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(B.flashC, Math.min(0.5, B.flash * 0.6)); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    text("FR. LAWRENCE", 16, 20, { size: 8, weight: 700, spacing: 2, color: C.holy });
    rect(16, 26, 140, 6, "rgba(255,255,255,0.1)"); rect(16, 26, 140 * H0.resolve / 100, 6, H0.resolve < 30 && Math.sin(B.t * 10) > 0 ? "#ff6a50" : "#e9eef8");
    for (let i = 0; i < 3; i++) { const on = i < B.woe, x = 168 + i * 11; circle(x, 29, 3.6, on ? "#ff5a3a" : "rgba(255,255,255,0.12)"); if (on) glow(x, 29, 9, "#ff3a2a", 0.4 + B.woeT * 0.5); }
    text("FALLS", 201, 32, { size: 7, weight: 700, spacing: 2, color: B.woe ? "#ff8a70" : "rgba(233,230,223,0.35)" });
    for (let i = 0; i < SPIRIT; i++) { const x = 20 + i * 11, y = 44, on = i < H0.spirit; ctx.save(); ctx.translate(x, y); ctx.rotate(PI / 4); rect(-3, -3, 6, 6, on ? C.holy : "rgba(255,255,255,0.12)"); ctx.restore(); if (on) glow(x, y, 9, C.holy, 0.4); }
    text("SPIRIT", 22 + SPIRIT * 11, 47, { size: 7, weight: 700, spacing: 2, color: "rgba(242,212,122,0.6)" });
    const every = R().swoop, ready = B.angel.act.kind === "hover", slots = Math.max(1, (every || 4) - 1), toGo = angelUntil(), fill = every ? slots - toGo : 0;
    for (let i = 0; i < slots; i++) { const x = 20 + i * 14, y = 60, on = i < fill; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2, 0, 0, TAU); ctx.fillStyle = on ? "#fff6dc" : every ? "rgba(255,255,255,0.14)" : "rgba(255,90,58,0.2)"; ctx.fill(); ctx.restore(); if (on) glow(x, y, 8, C.holy, 0.35 + (toGo === 0 ? 0.3 * Math.sin(B.t * 8) : 0)); }
    text(!every ? "HIS ANGEL IS FAR" : !ready ? "HIS ANGEL IS HERE" : toGo === 0 ? "NEXT BLOW: HIS ANGEL" : "HIS ANGEL", 22 + slots * 14, 63, { size: 7, weight: 700, spacing: 2, color: !every ? "#ff8a70" : !ready || toGo === 0 ? C.holy : "rgba(242,212,122,0.6)" });
    const left = alive().length + B.spawnQ.length;
    text("ON THE ROOFS: " + left, 16, 80, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
    if (H0.combo >= 2) {
      const k = clamp(H0.comboT / R().comboT, 0, 1);
      text(H0.combo + "", W - 66, 60, { align: "right", size: 34, weight: 800, italic: true, color: "#ffffff", glow: C.holy, blur: 16, alpha: 0.4 + 0.6 * k });
      text("HITS", W - 62, 60, { size: 9, weight: 800, spacing: 2, color: C.holy, alpha: 0.4 + 0.6 * k });
      if (H0.combo >= 5) text(H0.combo >= 10 ? "sobria ebrietas" : "sobria", W - 18, 78, { align: "right", size: 15, italic: true, font: FONT.line, weight: 500, color: C.holy, alpha: 0.5 + 0.5 * k });
    }
    if (B.world === "roof" && !B.shift && H0.combo >= 4 && H0.combo < HEIGHTS_AT) {
      const lft = HEIGHTS_AT - H0.combo;
      text(lft + " MORE: THE HEIGHTS", W - 18, 96, { align: "right", size: 8, weight: 800, spacing: 2, color: C.holy, alpha: 0.55 + 0.45 * (H0.combo / HEIGHTS_AT) });
      rect(W - 118, 101, 100, 2, "rgba(255,255,255,0.15)"); rect(W - 118, 101, 100 * H0.combo / HEIGHTS_AT, 2, C.holy);
    }
    if (B.world === "depths" && !B.shift) {
      for (let i = 0; i < DEPTHS_OUT; i++) { const x = W / 2 - (DEPTHS_OUT - 1) * 8 + i * 16, on = i < H0.combo; circle(x, H - 18, 4, on ? C.holy : "rgba(255,90,58,0.3)"); if (on) glow(x, H - 18, 10, C.holy, 0.5); }
      text(DEPTHS_OUT + " IN A ROW TO RISE", W / 2, H - 30, { align: "center", size: 8, weight: 800, spacing: 3, color: "#ff8a70" });
    }
    if (B.banner) {
      const b = B.banner, a = clamp(b.t / 0.4, 0, 1) * clamp((3 - b.t) / 0.8, 0, 1), y = b.small ? 104 : H * 0.42;
      text(b.text, W / 2, y, { align: "center", font: FONT.title, size: b.small ? 20 : 34, weight: 700, spacing: b.small ? 5 : 8, color: b.c, glow: b.c, blur: 20, alpha: a });
      if (b.sub) text(b.sub, W / 2, y + (b.small ? 18 : 24), { align: "center", font: FONT.line, italic: true, size: b.small ? 13 : 16, weight: 500, color: b.c, alpha: a * 0.85 });
    }
    if (B.world === "heights" && !B.shift && !B.finishing) {
      const bx = W - 52, by = H - 52, pul = 1 + 0.1 * Math.sin(B.t * 8);
      glow(bx, by, 60 * pul, C.holy, 0.7); circle(bx, by, 28 * pul, "rgba(255,240,200,0.9)"); ctx.strokeStyle = "#8a6020"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 28 * pul, 0, TAU); ctx.stroke();
      poly([bx, by + 14, bx - 11, by - 4, bx - 4, by - 4, bx - 4, by - 14, bx + 4, by - 14, bx + 4, by - 4, bx + 11, by - 4], "#8a6020");
      text(tip("FROM ON HIGH", "B · FROM ON HIGH"), W - 12, by + 42, { align: "right", size: 8, weight: 800, spacing: 1.5, color: "#fff3cf", max: 110 });
      buttons.push({ x: bx - 36, y: by - 36, w: 72, h: 72, act: () => finisher() });
    } else if (H0.spirit >= SPIRIT && !B.over) {
      const bx = W - 52, by = H - 52, pul = 1 + 0.08 * Math.sin(B.t * 6);
      glow(bx, by, 50 * pul, C.holy, 0.5); circle(bx, by, 26 * pul, "rgba(20,14,8,0.85)"); ctx.strokeStyle = C.holy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 26 * pul, 0, TAU); ctx.stroke();
      rect(bx - 2.5, by - 13, 5, 26, "#fff3cf"); rect(bx - 10, by - 6, 20, 5, "#fff3cf");
      text(tip("BLESS", "B · BLESS"), bx, by + 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.holy });
      buttons.push({ x: bx - 34, y: by - 34, w: 68, h: 68, act: () => bless() });
    }
    // Any of them off the screen: a red mark at the edge, pointing the way.
    for (const f of alive()) {
      if (["fall", "castout"].includes(f.act.kind)) continue;
      const z = zOf(f), x = sx(f.x, z), y = sy(f.y, z);
      if (x > 6 && x < W - 6 && y > 6 && y < H - 6) continue;
      const an = Math.atan2(y - H / 2, x - W / 2), ex = clamp(x, 14, W - 14), ey = clamp(y, 14, H - 14), col = f.sign === "red" ? "#ff3040" : f.sign === "gold" ? C.holy : "#ff6a5a";
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(an); poly([7, 0, -4, -6, -4, 6], col); ctx.restore(); glow(ex, ey, 11, col, 0.4);
    }
    if (B.msg && B.msg.t < 7) {
      const a = clamp(B.msg.t / 0.3, 0, 1) * clamp((7 - B.msg.t) / 0.8, 0, 1);
      const ls = wrap(B.msg.text, Math.min(W - 240, 480), "italic 500 17px " + FONT.line), bw = Math.min(W - 220, 500);
      ctx.globalAlpha = 0.55 * a; rect(W / 2 - bw / 2, 8, bw, 14 + ls.length * 20, "#050407"); ctx.globalAlpha = 1;
      ls.forEach((l, i) => text(l, W / 2, 26 + i * 20, { align: "center", size: 17, weight: 500, italic: true, font: FONT.line, color: "#f6eccb", alpha: a }));
    }
    if (B.enc.first && B.t < 40 && !B.over) text(tip("TAP ONE ON HIS ROOF: STRIKE · ON ANOTHER ROOF: THE ANGEL'S LIGHT · DRAG ONE FAR OFF: THE ROSARY", "SPACE: STRIKE (FAR OFF: THE ANGEL'S LIGHT) · X: COUNTER · Q: BLOCK · R: ROSARY · T: THROW"),
      W / 2, H - 12, { align: "center", size: 7.5, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.5)", max: W - 40 });
    if (B.down) rect(0, 0, W, H, "rgba(0,0,0," + clamp((B.down - 1.2) / 0.8, 0, 1) * (B.down > 2.2 ? (2.6 - B.down) / 0.4 : 1) + ")");
  }

  return { start, step, drawWorld, drawHUD, down, move, up, key, active: () => !!B, get B() { return B; } };
}
