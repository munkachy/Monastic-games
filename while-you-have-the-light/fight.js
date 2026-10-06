"use strict";
// While You Have the Light: the fight. The monk, what your fingers mean, the blows and the
// flow, the light that grows with it, the oil and the flare, holy water, the things lying about,
// and the waves of the arena. The demons' minds are in foes.js; the drawing is in scene.js.
//
// What is under your finger decides what he does:
//   open ground ............ he goes there (in the quick speed, a zip if he can see it in the light)
//   a demon in the light ... he flies at it and strikes (the blow depends on where it is)
//   a demon in the dark .... holy water, lobbed
//   a thing on the ground .. he goes and picks it up; holding it, tap any demon to throw it
//   a thing flying at him .. tap to catch it, swipe on it to send it back
//   a broken demon ......... a finisher: tap, swipe down, swipe up, swipe sideways, or hold
// Swipe on a demon in the light: up launches, down slams, sideways dashes through. Swipe on open
// ground in the quick speed: a roll. Two fingers down: block. Spread two fingers apart: the flare.

// ---- Tuning ---------------------------------------------------------------------------------------
const T = {
  walkDark: 68, runLight: 168,          // px/s
  R0: 96, Rmax: 236, Rflare: 330,       // the light's reach
  flowWindow: 3.0,                      // seconds a link keeps the flow going
  oilPerLink: 0.03, oilFlareMin: 0.3, oilBurn: 0.21,
  flareWorld: 0.12, flareHero: 0.5,     // time in the flare: the world, and the monk
  life: 6, flasks: 5, flasksMax: 9,
  grav: 760,
  parryWindow: 0.22,
  brokenFor: 3.4,
  quickFor: 2.0,                        // the quick speed lasts this long after the last demon leaves the light
};

// How long each of his moves takes, in seconds: [in the dark, in the quick speed].
const DUR = {
  stepUp: [0.34, 0.14], stepDown: [0.3, 0.13], climbUp: [1.3, 0.44], climbDown: [1.05, 0.38],
  leap: [0.95, 0.44], land: [0.42, 0.12], turn: [0.3, 0], zip: [0.3, 0.24], dodge: [0.42, 0.36],
  pickup: [0.62, 0.32], throw: [0.4, 0.32], lob: [0.5, 0.42], catch: [0.26, 0.22], flick: [0.3, 0.26],
  jumpKick: [0.5, 0.5], superman: [0.56, 0.56], torchSwing: [0.42, 0.4], palm: [0.32, 0.32], spinKick: [0.44, 0.42],
  sweep: [0.4, 0.38], risingKnee: [0.52, 0.5], launch: [0.44, 0.42], slam: [0.46, 0.44], diveStomp: [0.52, 0.5],
  dash: [0.44, 0.42], airKick: [0.34, 0.32], parry: [0.32, 0.3], hurt: [0.42, 0.42], knockdown: [1.0, 1.0], getUp: [0.55, 0.5],
  flare: [0.5, 0.5], castOut: [0.8, 0.8], underFoot: [0.9, 0.9], pillar: [0.95, 0.95], scattered: [0.9, 0.9], virtue: [1.4, 1.4],
};
// The blows: how hard, which way the demon goes, and whether he flies to it.
const BLOWS = {
  jumpKick: { dmg: 1.2, kx: 150, ky: -60, fly: true, arc: 26 },
  superman: { dmg: 1.5, kx: 230, ky: -40, fly: true, arc: 12, down: true },
  torchSwing: { dmg: 1, kx: 110, ky: -30, arcHit: 46, burn: true },
  palm: { dmg: 1, kx: 170, ky: -20 },
  spinKick: { dmg: 1.2, kx: 170, ky: -90 },
  sweep: { dmg: 0.8, kx: 40, ky: -120, down: true },
  risingKnee: { dmg: 1.2, kx: 60, ky: -260, fly: true, air: true },
  launch: { dmg: 1, kx: 30, ky: -330, air: true, rise: 54 },
  slam: { dmg: 1.4, kx: 40, ky: 260, down: true, aoe: 40 },
  diveStomp: { dmg: 1.4, kx: 60, ky: 120, fly: true, down: true },
  dash: { dmg: 1, kx: 90, ky: -50, through: true },
  airKick: { dmg: 1, kx: 110, ky: -150, air: true },
  chain: { dmg: 2 },
};
const NEAR_BLOWS = ["torchSwing", "palm", "spinKick", "sweep", "jumpKick"];
const FINISHERS = [
  { id: "castOut", name: "Cast Out", gesture: "Tap", key: "tap", what: "A strong rush of flow", opens: "Always open", wave: 0 },
  { id: "underFoot", name: "Under Foot", gesture: "Swipe down", key: "down", what: "A life back", opens: "After wave 3", wave: 3, verse: "Thou shalt walk upon the asp and the basilisk: and thou shalt trample under foot the lion and the dragon. (Ps 90:13)" },
  { id: "pillar", name: "Pillar of Fire", gesture: "Swipe up", key: "up", what: "Oil for the flare", opens: "After wave 5", wave: 5, verse: "And the Lord went before them... by night in a pillar of fire. (Ex 13:21)" },
  { id: "scattered", name: "Scattered", gesture: "Swipe sideways", key: "side", what: "Holy water", opens: "After wave 7", wave: 7, verse: "Let God arise, and let his enemies be scattered. (Ps 67:2)" },
  { id: "virtue", name: "The Virtue", gesture: "Hold", key: "hold", what: "The light floods; every demon of that sin is broken at once", opens: "Cast out five of a sin", wave: 99 },
];
const VERSES = [
  ["The light shineth in darkness, and the darkness did not comprehend it.", "John 1:5"],
  ["Thy word is a lamp to my feet, and a light to my paths.", "Psalm 118:105"],
  ["All things that are reproved, are made manifest by the light.", "Ephesians 5:13"],
  ["Walk whilst you have the light, that the darkness overtake you not.", "John 12:35"],
  ["The Lord is my light and my salvation, whom shall I fear?", "Psalm 26:1"],
  ["For thou lightest my lamp, O Lord: O my God enlighten my darkness.", "Psalm 17:29"],
  ["Let your loins be girt, and lamps burning in your hands.", "Luke 12:35"],
  ["Be sober and watch: because your adversary the devil, as a roaring lion, goeth about seeking whom he may devour.", "1 Peter 5:8"],
  ["Resist the devil, and he will fly from you.", "James 4:7"],
  ["Run while you have the light of life, lest the darkness of death overtake you.", "The Rule of St. Benedict, Prologue"],
  ["Let God arise, and let his enemies be scattered: and let them that hate him flee from before his face.", "Psalm 67:2"],
  ["Thou shalt walk upon the asp and the basilisk: and thou shalt trample under foot the lion and the dragon.", "Psalm 90:13"],
];
// The waves of the arena: the first eight written out; after them, mixed and growing.
const WAVES = [
  ["wrath", "wrath"],
  ["wrath", "wrath", "avarice"],
  ["avarice", "wrath", "pride"],
  ["envy", "envy", "wrath", "wrath"],
  ["gluttony", "avarice", "wrath", "wrath"],
  ["lust", "envy", "pride", "wrath", "wrath"],
  ["sloth", "sloth", "wrath", "wrath", "avarice"],
  ["pride", "avarice", "lust", "envy", "gluttony", "wrath", "sloth"],
];

let G = null;   // the state of the fight

const Arena = {
  start(opts) {
    opts = opts || {};
    World.load(HOLLOW);
    const n0 = World.node(World.start.cx, World.start.cy);
    G = {
      opts, practice: !!opts.practice, t: 0, rt: 0, ts: 1, hitStop: 0, slowMo: 0,
      hero: null, demons: [], things: [], parts: [], texts: [], nextId: 1,
      flow: 0, flowT: 0, flowDecay: 0, best: 0, oil: opts.practice && opts.endlessOil ? 1 : 0.2,
      life: T.life, flasks: T.flasks,
      light: { x: 0, y: 0, R: T.R0, poly: null, gutter: 0, flood: 0 },
      flare: { on: false, t: 0, marks: [], stroke: null, chain: null },
      quick: 0, quickK: 0,
      wave: 0, waveState: "intro", waveT: 0, queue: [], spawnT: 0, castTotal: 0, verse: null,
      cam: { x: 0, y: 0, z: 1.1, shake: 0 },
      touches: new Map(), two: null, keys: {}, mouseBlock: false,
      trail: null, toast: null, hint: null, over: null, lastMove: null, prevMove: null, used: {},
      level: -1,
    };
    const h = G.hero = {
      hero: true, x: World.feetX(n0), y: World.feetY(n0), dir: 1, vx: 0, vy: 0, node: n0, ground: true,
      act: { kind: "idle", t: 0 }, path: null, next: null, hold: null, inv: 0, blocking: false, blockT: 0,
      pulled: null, anim: "idle", u: 0, torch: [0, 0], hand: [0, 0],
    };
    h.torch = [h.x + 6, h.y - 40];
    for (const p of World.things) Arena.addThing(pick(["stone", "stone", "jar", "skull", "beam", "brand"], hash2(p.cx, p.cy, 5)), (p.cx + 0.5) * CS, (p.cy + 1) * CS - 6);
    for (const p of World.flasks) Arena.addThing("flask", (p.cx + 0.5) * CS, (p.cy + 1) * CS - 5);
    G.cam.x = h.x; G.cam.y = h.y - 40;
    if (G.practice) { G.waveState = "fight"; G.life = T.life; }
    else Arena.nextWave();
    mode = Arena;
    Sound.play(SONGS.arena); Sound.setLevel(0); Sound.ambience({ wind: 0.6 }); Sound.flare(false); Sound.muffle(false);
    Arena.hintOnce("move", "Tap where you want him to go. He climbs and leaps on his own.", "Click where you want him to go, or walk with the arrows. He climbs and leaps on his own.");
  },

  // ---- Small things ---------------------------------------------------------------------------------
  hintOnce(id, touch, keys) { if (save.seen[id]) return; save.seen[id] = 1; store(); G.hint = { text: usingKeys() && keys ? keys : touch, t: 0 }; },
  toast(title, sub, color) { G.toast = { title, sub, color: color || C.flame, t: 0 }; },
  say(x, y, str, color, size) { G.texts.push({ x, y, str, color: color || "#fff", size: size || 9, t: 0 }); },
  shake(a) { G.cam.shake = Math.max(G.cam.shake, a); },
  stop(s) { G.hitStop = Math.max(G.hitStop, s); },
  quick() { return G.quickK > 0.5; },
  dur(name) { const d = DUR[name] || [0.4, 0.4]; return Arena.quick() || G.flare.on ? d[1] : d[0]; },
  chest(f) { return [f.x, f.y - (f.hero ? 30 : DEMON_SIZE[f.sin].h * (f.act.kind === "broken" ? 0.42 : 0.58))]; },
  heroChest() { return [G.hero.x, G.hero.y - 30]; },
  // Whether a point lies in the torchlight: near enough, and not behind rock.
  lit(x, y) {
    const L = G.light, d = dist(L.x, L.y, x, y);
    return d < L.R * 0.97 && World.lineClear(L.x, L.y, x, y);
  },
  demonLit(f) {
    const s = DEMON_SIZE[f.sin], L = G.light;
    if (dist(L.x, L.y, f.x, f.y - s.h * 0.5) > L.R + s.h * 0.5) return false;
    return Arena.lit(f.x, f.y - s.h * 0.55) || Arena.lit(f.x, f.y - s.h * 0.15) || Arena.lit(f.x, f.y - s.h * 0.9);
  },

  // ---- Flow, oil and the light --------------------------------------------------------------------
  link(n, x, y) {
    n = n || 1;
    G.flow += n; G.flowT = T.flowWindow; G.flowDecay = 0;
    G.best = Math.max(G.best, G.flow);
    const before = G.oil;
    if (!G.flare.on) G.oil = Math.min(1, G.oil + T.oilPerLink * n);
    if (before < T.oilFlareMin && G.oil >= T.oilFlareMin) { Sound.fx.oilReady(); Arena.hintOnce("flare", "The oil is ready. Spread two fingers apart: the torch flares.", "The oil is ready. Press F: the torch flares. Then drag the mouse through the demons."); }
    if (G.flow === 5 || G.flow === 12 || G.flow === 20 || G.flow % 25 === 0) Arena.say(G.hero.x, G.hero.y - 70, G.flow + " IN FLOW", C.warm, 10);
  },
  breakFlow(half) {
    G.flow = half ? Math.floor(G.flow / 2) : 0; G.flowT = half && G.flow ? 1.2 : 0;
  },
  gutter(s) { G.light.gutter = Math.max(G.light.gutter, s || 0.6); Sound.fx.gutter(); },
  stepLight(dt, rdt) {
    const L = G.light, f = G.flow;
    let R = T.R0 + (T.Rmax - T.R0) * (1 - Math.exp(-f / 10));
    if (G.flare.on) R = T.Rflare;
    if (L.flood > 0) { R = Math.max(R, T.Rflare * 1.05); L.flood -= rdt; }
    if (L.gutter > 0) { R *= 0.62 + 0.15 * Math.sin(G.rt * 40); L.gutter -= rdt; }
    if (G.over) R *= Math.max(0, 1 - G.over.t / 1.4);
    L.R += (R - L.R) * (1 - Math.exp(-rdt * (G.flare.on ? 7 : 4.5)));
    L.x = G.hero.torch[0]; L.y = G.hero.torch[1];
    // The torch swung in a blow throws the circle of light with it.
    L.poly = World.visPoly(L.x, L.y, L.R, L.R > 200 ? 200 : 150);
    // The flow runs out if no link comes in time: it ebbs away a link at a time.
    if (G.flowT > 0) G.flowT -= dt;
    else if (G.flow > 0) { G.flowDecay += rdt; if (G.flowDecay > 0.16) { G.flowDecay = 0; G.flow--; } }
  },

  // ---- Things ---------------------------------------------------------------------------------------
  addThing(kind, x, y) {
    const o = { id: G.nextId++, kind, x, y, vx: 0, vy: 0, rot: (hash2(Math.round(x), Math.round(y), 9) - 0.5) * (kind === "beam" ? 0.3 : 2), vr: 0, state: "rest", by: null, at: null, slow: false, t: 0, burn: kind === "brand" ? 1 : 0, hits: 0 };
    G.things.push(o); return o;
  },
  thingR(o) { return (OBJECTS[o.kind] && OBJECTS[o.kind].r) || 6; },
  // A throw that lands on (tx, ty) in time `secs`, from (x, y).
  throwThing(o, x, y, tx, ty, secs, by, at) {
    o.state = "flying"; o.x = x; o.y = y; o.by = by; o.at = at || null; o.t = 0; o.slow = false; o.hits = 0;
    o.vx = (tx - x) / secs; o.vy = (ty - y) / secs - 0.5 * T.grav * secs; o.vr = (o.vx >= 0 ? 1 : -1) * (8 + Math.random() * 6);
  },
  stepThings(dt) {
    const h = G.hero;
    for (let i = G.things.length - 1; i >= 0; i--) {
      const o = G.things[i]; o.t += dt;
      if (o.state === "held") continue;
      if (o.state === "rest") {
        if (!World.solidAt(o.x, o.y + Arena.thingR(o) + 2) && !World.solidAt(o.x, o.y + 1)) { o.state = "flying"; o.vx = 0; o.vy = 0; o.by = null; }
        continue;
      }
      // Flying. A demon's throw slows in the light, so he can catch it or send it back.
      const toHero = o.by && !o.by.hero && !o.at, d = dist(o.x, o.y, h.x, h.y - 30);
      o.slow = toHero && o.kind !== "shard" ? Arena.lit(o.x, o.y) && (o.vx * (h.x - o.x) + o.vy * (h.y - 30 - o.y)) > 0 && d < G.light.R : false;
      if (o.kind === "shard") o.slow = toHero && Arena.lit(o.x, o.y) && d < G.light.R;
      if (o.slow && !o.wasSlow) { o.wasSlow = true; Arena.hintOnce("catch", "A thing thrown at you slows in the light. Tap it to catch it, or swipe on it to send it back.", "A thing thrown at you slows in the light. Click it (or E) to catch it, or drag across it to send it back."); }
      const k = o.slow ? 0.32 : 1, sdt = dt * k, steps = 3;
      for (let s = 0; s < steps; s++) {
        const q = sdt / steps;
        if (o.kind !== "shard") o.vy += T.grav * q;
        const nx = o.x + o.vx * q, ny = o.y + o.vy * q, r = Arena.thingR(o);
        o.rot += o.vr * q;
        // Into rock.
        if (World.solidAt(nx, ny)) {
          if (o.kind === "flask" && o.by) { Arena.splash(o.x, o.y, o.by); G.things.splice(i, 1); break; }
          if (o.kind === "jar" || o.kind === "shard") { Arena.shatter(o); G.things.splice(i, 1); break; }
          const hitX = World.solidAt(nx, o.y), hitY = World.solidAt(o.x, ny);
          if (hitY || !hitX) { o.vy *= -0.32; o.vx *= 0.6; } if (hitX) o.vx *= -0.4;
          o.vr *= 0.5;
          if (Math.abs(o.vy) < 60 && World.solidAt(o.x, o.y + r + 2)) Arena.settle(o);
          if (o.by && Math.hypot(o.vx, o.vy) > 120) Sound.fx.objHit(o.kind, Arena.pan(o.x));
          o.by = null; o.at = null;
          break;
        }
        o.x = nx; o.y = ny;
        // Into a demon (thrown by him, or flicked back).
        if (o.by && o.by.hero) {
          const f = Arena.demonAt(o.x, o.y, r + 4, (f) => f.act.kind !== "dying" && f.act.kind !== "emerge");
          if (f) { Arena.thingHits(o, f); if (!G.things.includes(o)) break; }
        } else if (o.by && !o.by.hero && o.kind !== "flask") {
          // Into him.
          if (dist(o.x, o.y, h.x, h.y - 26) < r + 12 && h.act.kind !== "dying") { Arena.thingHitsHero(o); break; }
        }
      }
      if (o.y > World.h + 60 || o.x < -60 || o.x > World.w + 60) G.things.splice(i, 1);
    }
  },
  settle(o) {
    const gy = World.groundY(o.x, o.y - 4);
    o.state = "rest"; o.vx = 0; o.vy = 0; o.vr = 0; o.by = null; o.at = null; o.slow = false;
    if (gy !== null) o.y = gy - Arena.thingR(o) * (o.kind === "beam" || o.kind === "brand" ? 0.6 : 1);
    if (o.kind === "beam" || o.kind === "brand") o.rot = (Math.random() - 0.5) * 0.25;
  },
  shatter(o) {
    Sound.fx.shatter(Arena.pan(o.x));
    for (let i = 0; i < 9; i++) G.parts.push({ kind: "chip", x: o.x, y: o.y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, t: 0, life: 0.7, c: o.kind === "shard" ? SINS.pride.color : "#2a2622", r: Math.random() * TAU });
  },
  thingHits(o, f) {
    const dmg = { stone: 1.5, jar: 1.1, beam: 2, skull: 1.1, brand: 1.5, flask: 0, shard: 1.2 }[o.kind] * (o.flicked ? 2 : 1);
    if (o.kind === "flask") { Arena.splash(o.x, o.y, o.by); G.things.splice(G.things.indexOf(o), 1); return; }
    // Gluttony swallows whatever comes at it.
    if (f.sin === "gluttony" && f.act.kind !== "broken" && f.act.kind !== "launched") { Foes.swallow(f, o); return; }
    Sound.fx.objHit(o.kind, Arena.pan(o.x));
    if (f.act.kind === "broken") { Arena.castOut(f, "castOut"); }
    else Foes.hurt(f, dmg, { kx: Math.sign(o.vx || 1) * 140, ky: o.kind === "beam" ? -160 : -60, down: o.kind === "beam", by: "throw" });
    f.reveal = 1.1;
    Arena.link(o.flicked ? 2 : 1, f.x, f.y);
    if (o.kind === "jar") { Arena.shatter(o); G.things.splice(G.things.indexOf(o), 1); return; }
    o.vx *= -0.3; o.vy = -120; o.by = null; o.at = null; o.flicked = false;
  },
  thingHitsHero(o) {
    const h = G.hero;
    if (h.blocking) {
      Arena.blocked(o.by, true);
      // A parry sends it straight back at whoever threw it.
      if (G.rt - h.blockT < T.parryWindow && o.by && G.demons.includes(o.by)) { Arena.sendBack(o, o.by); return; }
      o.vx *= -0.35; o.vy = -140; o.by = null;
      return;
    }
    if (o.kind === "jar" || o.kind === "shard") { Arena.shatter(o); G.things.splice(G.things.indexOf(o), 1); }
    else { o.vx *= -0.3; o.vy = -100; o.by = null; }
    Arena.heroHit(1, Math.sign(o.vx || -h.dir) * -1, null);
  },
  // Send a thing back where it came from (a flick, or a parry): fast, at the demon's chest.
  sendBack(o, f) {
    const [tx, ty] = Arena.chest(f), d = dist(o.x, o.y, tx, ty);
    if (o.kind === "shard") { const k = 520 / Math.max(1, d); o.vx = (tx - o.x) * k; o.vy = (ty - o.y) * k; o.state = "flying"; o.by = G.hero; o.at = f; o.flicked = true; o.slow = false; return; }
    Arena.throwThing(o, o.x, o.y, tx + f.vx * 0.15, ty, clamp(d / 640, 0.14, 0.5), G.hero, f);
    o.by = G.hero; o.flicked = true;
  },
  // Holy water bursting: it burns every demon near, and lights them up in their colours.
  splash(x, y, by) {
    Sound.fx.splash(Arena.pan(x)); Arena.shake(2);
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 200; G.parts.push({ kind: "drop", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, t: 0, life: 0.6 + Math.random() * 0.4 }); }
    for (let i = 0; i < 8; i++) G.parts.push({ kind: "steam", x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 10, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, t: 0, life: 1.1 });
    let hits = 0;
    for (const f of G.demons) {
      if (f.act.kind === "dying" || f.act.kind === "emerge") continue;
      const [cx, cy] = Arena.chest(f), d = dist(x, y, cx, cy);
      if (d > 50) continue;
      hits++;
      f.reveal = 1.4;
      if (f.act.kind === "broken") { Arena.castOut(f, "castOut", true); continue; }
      const dmg = (2.6 - d / 50 * 1.5) * (f.sin === "gluttony" ? 2 : 1);
      Foes.hurt(f, dmg, { kx: Math.sign(cx - x || 1) * 90, ky: -80, by: "water" });
      G.parts.push({ kind: "smoke", x: cx, y: cy, vx: 0, vy: -20, t: 0, life: 1, c: SINS[f.sin].color });
    }
    if (hits && by && by.hero) Arena.link(1, x, y);
  },
  pan(x) { return clamp((x - G.cam.x) / (W / 2), -1, 1); },

  // ---- Demons, found ----------------------------------------------------------------------------------
  demonAt(x, y, pad, ok) {
    let best = null, bd = Infinity;
    for (const f of G.demons) {
      if (ok && !ok(f)) continue;
      const s = DEMON_SIZE[f.sin], hgt = f.act.kind === "broken" || f.act.kind === "down" ? s.h * 0.6 : s.h;
      const top = f.y - hgt, cx = f.x;
      const dx = Math.max(0, Math.abs(x - cx) - s.w / 2), dy = y < top ? top - y : y > f.y ? y - f.y : 0, d = Math.hypot(dx, dy);
      if (d <= pad && d < bd) { bd = d; best = f; }
    }
    return best;
  },
  thingAt(x, y, pad, ok) {
    let best = null, bd = Infinity;
    for (const o of G.things) { if (ok && !ok(o)) continue; const d = dist(x, y, o.x, o.y) - Arena.thingR(o); if (d < pad && d < bd) { bd = d; best = o; } }
    return best;
  },
  nearestDemon(ok) {
    const h = G.hero; let best = null, bd = Infinity;
    for (const f of G.demons) { if (!ok(f)) continue; const d = dist(h.x, h.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
    return best;
  },
  alive(f) { return f && G.demons.includes(f) && f.act.kind !== "dying"; },

  // ---- The monk ------------------------------------------------------------------------------------
  busy() {
    const k = G.hero.act.kind;
    return !["idle", "walk", "block"].includes(k);
  },
  // Set him doing something. One-shot moves carry their own duration in act.dur.
  act(kind, o) {
    const h = G.hero;
    h.act = Object.assign({ kind, t: 0 }, o || {});
    if (kind !== "walk") h.walkPh = h.walkPh || 0;
  },
  // A command from a finger or a key. If he is in the middle of something he cannot break off
  // (a climb, a leap, a blow before it lands), it waits for him.
  command(c) {
    const h = G.hero;
    if (G.over || h.act.kind === "dying") return;
    const k = h.act.kind;
    if (k === "fall" && ["strike", "finish", "catch", "flick", "throwAt"].includes(c.type)) { Arena.run(c); return; }
    const hard = ["move", "zip", "fall", "land", "hurt", "knockdown", "getUp", "finisher", "lob", "throw", "pickup", "catch", "flick", "attack", "parry", "dodge", "flare", "chain", "turn"];
    if (hard.includes(k)) {
      // Blows may be cut short once they have landed: the next one follows at once.
      if ((k === "attack" || k === "finisher" || k === "parry" || k === "flick" || k === "catch") && h.act.landed && h.act.t > (h.act.cancelAt || 0)) { Arena.run(c); return; }
      h.next = c; return;
    }
    Arena.run(c);
  },
  run(c) {
    const h = G.hero; h.next = null;
    switch (c.type) {
      case "go": return Arena.goTo(c.x, c.y);
      case "strike": return Arena.strike(c.f, c.blow);
      case "water": return Arena.water(c.f);
      case "throwAt": return Arena.throwAt(c.f);
      case "pickup": return Arena.goPickup(c.o);
      case "catch": return Arena.catchIt(c.o);
      case "flick": return Arena.flick(c.o, c.dx, c.dy);
      case "finish": return Arena.finish(c.f, c.kind);
      case "dodge": return Arena.dodge(c.dx);
      case "drop": return Arena.dropHeld();
    }
  },
  // Go to a place: in the quick speed, a zip straight there if it is in sight in the light;
  // otherwise along a route, step by step.
  goTo(x, y) {
    const h = G.hero;
    // Only from the ground: in the air he comes down first, then goes.
    if (!Arena.onGround()) {
      if (!["fall", "attack", "zip", "move"].includes(h.act.kind)) { h.vx = 0; h.vy = 0; Arena.act("fall"); }
      h.next = { type: "go", x, y }; return "path";
    }
    const from = Arena.heroNode();
    const costs = World.costsFrom(from), to = World.pickTarget(from, x, y, costs);
    if (to < 0) return "none";
    const tx = World.feetX(to), ty = World.feetY(to);
    if (Arena.quick() && to !== from && dist(h.x, h.y, tx, ty) < G.light.R * 1.05 && dist(h.x, h.y, tx, ty) > 26 && Arena.airClear(h.x, h.y, tx, ty, 18 + Math.min(40, Math.abs(tx - h.x) * 0.12))) {
      Arena.zipTo(tx, ty, to); return "zip";
    }
    const path = World.route(from, to);
    if (!path || !path.length) { h.path = null; if (h.act.kind === "walk") Arena.act("idle"); return path ? "here" : "none"; }
    h.path = path; h.goal = to;
    G.trail = { pts: [[h.x, h.y]].concat(path.map((s) => [World.feetX(s.to), World.feetY(s.to)])), t: 0 };
    Arena.nextStep();
    return "path";
  },
  // Go to something and then do something there (strike it, pick it up): if he cannot get there
  // at all, he does nothing, rather than trying again and again.
  goThen(x, y, p) {
    const h = G.hero, r = Arena.goTo(x, y);
    if (r === "path" || r === "zip") h.pending = p;
    else h.pending = null;
    return r;
  },
  // How far below his hands his feet hang, from the art's own hanging pose.
  reach() {
    if (Arena._reach) return Arena._reach;
    let r = 54;
    try { const p = MONK_ANIM.hang(0.5, 0), hf = monkJoint(0, 0, 1, p, "hF"), hb = monkJoint(0, 0, 1, p, "hB"); r = -Math.min(hf[1], hb[1]); } catch (e) { }
    return (Arena._reach = clamp(r || 54, 36, 80));
  },
  heroNode() {
    const h = G.hero;
    let id = World.node(Math.floor(h.x / CS), Math.floor((h.y - 1) / CS));
    if (id < 0) id = World.nearestNode(h.x, h.y, 64);
    return id;
  },
  // Whether he can travel from one place to another through the air, his whole body clear of the
  // rock all along the way (lifted in an arc as high as `arc`).
  airClear(x0, y0, x1, y1, arc) {
    const n = Math.max(4, Math.ceil(dist(x0, y0, x1, y1) / 10));
    for (let i = 1; i <= n; i++) {
      const u = i / n, x = lerp(x0, x1, smooth(u)), y = lerp(y0, y1, smooth(u)) - Math.sin(u * PI) * (arc || 0);
      for (const k of [6, 24, 42]) if (World.solidAt(x, y - k)) return false;
    }
    return true;
  },
  zipTo(tx, ty, node, o) {
    const h = G.hero;
    h.path = null; h.dir = tx >= h.x ? 1 : -1;
    Arena.act("zip", Object.assign({ dur: Arena.dur("zip") + Math.min(0.14, dist(h.x, h.y, tx, ty) / 2000), from: [h.x, h.y], to: [tx, ty], node, arc: 18 + Math.min(40, Math.abs(tx - h.x) * 0.12) }, o || {}));
    Sound.fx.zip(); h.inv = Math.max(h.inv, 0.2);
  },
  // Begin the next step of the route (or stop).
  nextStep() {
    const h = G.hero;
    if (!h.path || !h.path.length) { h.path = null; Arena.act("idle"); return; }
    const s = h.path[0];
    // In the dark, turning round is a move of its own, as in Prince of Persia.
    if (s.s !== h.dir && !Arena.quick() && s.kind !== "climbDown") { Arena.act("turn", { dur: Arena.dur("turn"), flipped: false }); return; }
    const fx = World.feetX(s.from), fy = World.feetY(s.from), tx = World.feetX(s.to), ty = World.feetY(s.to);
    if (s.kind === "walk") {
      if (Math.abs(h.y - fy) > 3 && !Arena.onGround()) { h.vx = 0; h.vy = 0; Arena.act("fall"); return; }
      h.y = Math.abs(h.y - fy) <= 3 ? fy : h.y;
      h.dir = s.s; Arena.act("walk"); return;
    }
    // Not where the step begins (a blow left him elsewhere)? Come down first, or find the way
    // again from where he is; a little way along the same floor, slide to the place.
    if (Math.abs(h.y - fy) > 3 || Math.abs(h.x - fx) > 12) {
      if (!Arena.onGround()) { h.vx = 0; h.vy = 0; Arena.act("fall"); return; }
      if (!Arena._rerouting) {
        const last = h.path[h.path.length - 1], pend = h.pending;
        Arena._rerouting = true; Arena.goTo(World.feetX(last.to), World.feetY(last.to)); Arena._rerouting = false;
        h.pending = pend; return;
      }
    }
    h.x = fx; h.y = fy;
    h.path.shift();
    h.dir = s.kind === "climbDown" ? -s.s : s.s;
    if (s.kind === "climbDown") h.dir = s.s;
    const anim = s.kind === "drop" ? "drop" : s.kind;
    if (anim === "drop") { Arena.act("move", { anim: "stepDown", step: s, dur: 0.16, from: [h.x, h.y], to: [fx + s.s * 10, fy], then: "fall" }); return; }
    let d = Arena.dur(anim);
    if (anim === "leap") d += (Arena.quick() ? 0.03 : 0.05) * s.n;
    if (anim === "climbUp" || anim === "climbDown") d += (Arena.quick() ? 0.015 : 0.05) * s.n;
    Arena.act("move", { anim, step: s, dur: d, from: [h.x, h.y], to: [tx, ty], top: Math.min(fy, ty) - (1.1 + s.n * 0.22) * CS });
    if (anim === "climbUp" || anim === "climbDown") Sound.fx.grab();
  },
  // Where his feet are on a step at u, for the moves that follow the routes.
  stepRoot(a, u) {
    const [x0, y0] = a.from, [x1, y1] = a.to, s = a.step;
    switch (a.anim) {
      case "stepUp": case "stepDown": { const k = smooth(u); return [lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(u * PI) * 6]; }
      case "leap": {
        if (u < 0.2) return [x0, y0];
        if (u > 0.8) return [x1, y1];
        const k = (u - 0.2) / 0.6;
        return [lerp(x0, x1, k), World.arcY(y0, y1, a.top, k)];
      }
      case "climbUp": {
        // The edge he grips is the near top corner of the ledge cell.
        const edge = (World.nx[s.from] + (s.s > 0 ? 1 : 0)) * CS, hangX = edge - s.s * 7, reach = Arena.reach(), hangY = Math.min(y0, y1 + reach);
        if (u < 0.18) return [x0, y0];
        if (u < 0.38) { const k = ease((u - 0.18) / 0.2); return [lerp(x0, hangX, k), lerp(y0, hangY, k)]; }
        if (u < 0.55) return [hangX, hangY + Math.sin((u - 0.38) * 30) * 0.6];
        if (u < 0.85) { const k = smooth((u - 0.55) / 0.3); return [lerp(hangX, edge + s.s * 4, k * k), lerp(hangY, y1, k)]; }
        return [lerp(edge + s.s * 4, x1, smooth((u - 0.85) / 0.15)), y1];
      }
      case "climbDown": {
        const dir = Math.sign(x1 - x0) || 1, edge = (World.nx[s.from] + (dir > 0 ? 1 : 0)) * CS, hangX = edge + dir * 7, reach = Arena.reach(), hangY = Math.min(y1, y0 + reach);
        if (u < 0.15) return [lerp(x0, edge - dir * 4, smooth(u / 0.15)), y0];
        if (u < 0.5) { const k = (u - 0.15) / 0.35; return [lerp(edge - dir * 4, hangX, smooth(Math.min(1, k * 2.2))), lerp(y0, hangY, smooth(Math.max(0, k * 1.4 - 0.4)))]; }
        if (u < 0.65) return [hangX, hangY];
        if (u < 0.9) { const k = (u - 0.65) / 0.25; return [lerp(hangX, x1, k), lerp(hangY, y1, k * k)]; }
        return [x1, y1];
      }
    }
    return [lerp(x0, x1, u), lerp(y0, y1, u)];
  },

  // ---- Blows ---------------------------------------------------------------------------------------
  // Choose the blow by where the demon is: above, below, across a gap, close, or in the air.
  chooseBlow(f) {
    const h = G.hero, dx = Math.abs(f.x - h.x), fy = f.air ? f.y : f.y, dy = fy - h.y, airborne = Foes.airborne(f);
    let opts;
    if (airborne && Math.abs(dy) < 60 && dx < 90) opts = ["airKick", "spinKick", "jumpKick"];
    else if (dy < -34 || (airborne && dy < 0)) opts = ["risingKnee", "airKick"];
    else if (dy > 34) opts = ["diveStomp"];
    else if (dx > 74) opts = ["superman", "jumpKick"];
    else opts = NEAR_BLOWS.slice();
    // The least lately used of them: never the same blow twice running if there is another.
    opts.sort((a, b) => (G.used[a] || 0) - (G.used[b] || 0));
    if (opts.length > 1 && opts[0] === G.lastMove) return opts[1];
    return opts[0];
  },
  strike(f, blow) {
    const h = G.hero;
    if (!Arena.alive(f)) return;
    if (f.act.kind === "broken") return Arena.finish(f, "castOut");
    blow = blow || Arena.chooseBlow(f);
    // The dash runs along the floor he stands on: for a demon on another level, another blow.
    if (blow === "dash" && (Math.abs(f.y - h.y) > 6 || Foes.airborne(f))) blow = Arena.chooseBlow(f);
    const B = BLOWS[blow] || {};
    const [cx, cy] = Arena.chest(f);
    // Can he get at it from here through the air, within the reach of his light? If not, go to it,
    // and strike when there.
    const reachable = dist(h.x, h.y - 26, cx, cy) < Math.max(160, G.light.R * 1.15) && World.lineClear(h.x, h.y - 26, cx, cy);
    if (!reachable) { Arena.goThen(f.x, f.y, { type: "strike", f, blow }); return; }
    h.dir = f.x >= h.x ? 1 : -1;
    // Where he strikes from: beside it, at its height (for a flying blow) or on the ground near it.
    const side = f.x >= h.x ? -1 : 1, w = DEMON_SIZE[f.sin].w;
    let sx = f.x + side * (w / 2 + (B.through ? -w - 28 : 13)), sy = Foes.airborne(f) || B.fly ? f.y + (blow === "diveStomp" ? -DEMON_SIZE[f.sin].h * 0.6 : blow === "risingKnee" ? 10 : 0) : f.y;
    sy = Math.max(48, sy);
    if (B.through) {
      sx = f.x - side * (w / 2 + 34); sy = h.y;
      let n = Arena.heroNode(), end = n; const s2 = -side;
      for (let i = 0; i < 16 && n >= 0; i++) { const m = World.node(World.nx[n] + s2, World.ny[n]); if (m < 0) break; end = n = m; if ((World.feetX(m) - sx) * s2 >= 0) break; }
      if (end >= 0) { const ex = World.feetX(end); if ((ex - sx) * s2 < 0) sx = ex; sy = World.feetY(end); }
    }
    // Stay out of the rock.
    if (World.solidAt(sx, sy - 20) || World.solidAt(sx, sy - 40)) { sx = f.x + side * 4; }
    if (!B.fly) {
      // A ground blow is struck standing: on the floor beside the demon.
      const gy = World.groundY(sx, Math.min(f.y, h.y) - 24);
      if (gy !== null && Math.abs(gy - f.y) < 30) sy = gy;
      else if (Math.abs(f.y - h.y) < 30) sy = h.y;
    }
    let dur = Arena.dur(blow);
    const far = dist(h.x, h.y, sx, sy);
    if (!Arena.airClear(h.x, h.y, sx, sy, B.fly ? (B.arc || 18) : far > 30 ? 18 + Math.min(40, Math.abs(sx - h.x) * 0.12) : 0)) {
      Arena.goThen(f.x, f.y, { type: "strike", f, blow }); return;
    }
    if (!B.fly && far > 30 && blow !== "dash") {
      // A ground blow from a distance: a quick zip in first, the blow chained after.
      Arena.zipTo(sx, sy, World.nearestNode(sx, sy, 48), { then: { type: "strike", f, blow } });
      return;
    }
    if (B.fly) dur += Math.min(0.18, far / 1400);
    Arena.act("attack", { blow, f, dur, from: [h.x, h.y], to: [sx, sy], hitAt: MONK_HIT[blow] || 0.5, landed: false, cancelAt: (MONK_HIT[blow] || 0.5) * dur + 0.05 });
    h.inv = Math.max(h.inv, (MONK_HIT[blow] || 0.5) * dur + 0.08);
    if (B.fly) Sound.fx.whoosh(0.7); else if (blow === "torchSwing") Sound.fx.torch(0.8, Arena.pan(h.x));
    G.prevMove = G.lastMove; G.lastMove = blow; G.used[blow] = G.rt;
  },
  // A blow lands.
  landBlow(a) {
    const h = G.hero, f = a.f, B = BLOWS[a.blow] || BLOWS.chain;
    a.landed = true;
    const targets = [];
    if (Arena.alive(f)) targets.push(f);
    // The torch swing, the slam and the dash catch the others near.
    if (B.arcHit || B.aoe || B.through) for (const g of G.demons) {
      if (g === f || !Arena.alive(g) || g.act.kind === "emerge") continue;
      const [gx, gy] = Arena.chest(g), [hx, hy] = Arena.heroChest();
      if (B.arcHit && Math.abs(gy - hy) < 40 && (gx - hx) * h.dir > -8 && Math.abs(gx - hx) < B.arcHit + 14) targets.push(g);
      if (B.aoe && dist(gx, gy, hx, hy + 20) < B.aoe + 14) targets.push(g);
      if (B.through && Math.abs(gy - hy) < 36 && (gx - a.from[0]) * h.dir > 0 && (gx - h.x) * h.dir < 10) targets.push(g);
    }
    let n = 0;
    for (const g of targets.slice(0, 4)) {
      if (g.act.kind === "broken") { Arena.castOut(g, "castOut"); n++; continue; }
      const res = Foes.struck(g, a.blow, (a.chain ? 2 : B.dmg) * (G.flare.on ? 1.3 : 1), { kx: h.dir * (B.kx || 100), ky: B.ky || -40, down: B.down, air: B.air });
      if (res !== "mirrored") n++;
    }
    if (n) {
      const [px, py] = Arena.chest(f && G.demons.includes(f) ? f : { x: h.x + h.dir * 20, y: h.y, hero: true });
      Arena.sparks(px, py, f ? SINS[f.sin].color : C.flame, 12);
      Arena.link(Math.min(3, n), px, py);
      Arena.stop(B.dmg >= 1.4 ? 0.075 : 0.045); Arena.shake(B.dmg >= 1.4 ? 3.5 : 2);
      const kick = /Kick|sweep|Stomp|Knee/.test(a.blow);
      if (a.blow === "torchSwing") Sound.fx.torch(1, Arena.pan(px));
      (B.dmg >= 1.4 ? Sound.fx.heavy : kick ? Sound.fx.kick : Sound.fx.punch)(0.9, Arena.pan(px));
      Sound.fx.hit(0.8, Arena.pan(px));
    } else if (!targets.length) Sound.fx.whoosh(0.3);
    // He rises with the demon he launched, ready to follow it up.
    if (B.rise) { h.vy = -260; }
  },
  // A finisher on a broken demon.
  finish(f, kind) {
    const h = G.hero;
    if (!Arena.alive(f) || f.act.kind !== "broken") return Arena.strike(f);
    if (!Arena.finisherOpen(kind, f.sin)) {
      Arena.say(f.x, f.y - 50, "NOT YET OPEN", "#cfcfcf", 8);
      kind = "castOut";
    }
    const side = f.x >= h.x ? -1 : 1, sx = f.x + side * (DEMON_SIZE[f.sin].w / 2 + 10), sy = f.y;
    if (dist(h.x, h.y, sx, sy) > 26) {
      if (!Arena.airClear(h.x, h.y, sx, sy, 18 + Math.min(40, Math.abs(sx - h.x) * 0.12))) { Arena.goThen(f.x, f.y, { type: "finish", f, kind }); return; }
      const node = World.nearestNode(sx, sy, 48);
      Arena.zipTo(sx, node >= 0 && Math.abs(World.feetY(node) - sy) < 24 ? World.feetY(node) : sy, node, { then: { type: "finish", f, kind } });
      return;
    }
    h.dir = f.x >= h.x ? 1 : -1;
    f.held = true;   // it waits for the blow
    const dur = Arena.dur(kind);
    Arena.act("finisher", { fin: kind, f, dur, from: [h.x, h.y], to: [h.x, h.y], hitAt: MONK_HIT[kind] || 0.5, landed: false, cancelAt: dur * 0.85 });
    h.inv = Math.max(h.inv, dur + 0.1);
    G.slowMo = Math.max(G.slowMo, dur * 0.7);
    Sound.fx.finisher(kind);
  },
  finisherOpen(kind, sin) {
    if (G.practice || kind === "castOut") return true;
    if (kind === "virtue") return (save.cast[sin] || 0) >= 5;
    return !!save.unlocked[kind];
  },
  // The demon goes up in ash, and the finisher gives what it gives.
  castOut(f, kind, quiet) {
    if (!G.demons.includes(f) || f.act.kind === "dying") return;
    const [cx, cy] = Arena.chest(f), col = SINS[f.sin].color;
    f.act = { kind: "dying", t: 0, dur: 0.9 }; f.held = false;
    Foes.release(f);
    Sound.fx.castOut(f.sin); Arena.shake(4); Arena.stop(0.09);
    for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 160; G.parts.push({ kind: "ash", x: cx + (Math.random() - 0.5) * 16, y: cy + (Math.random() - 0.5) * 30, vx: Math.cos(a) * s * 0.5, vy: -40 - Math.random() * 120, t: 0, life: 1 + Math.random() * 0.8, c: Math.random() < 0.5 ? col : "#1a1a1c" }); }
    G.parts.push({ kind: "flash", x: cx, y: cy, t: 0, life: 0.5, c: col, r: 60 });
    // (Practice opens every finisher anyway, so only the arena counts toward the virtues.)
    G.castTotal++; if (!G.practice) save.cast[f.sin] = (save.cast[f.sin] || 0) + 1;
    if (!G.practice && save.cast[f.sin] === 5) { Arena.toast("THE VIRTUE: " + SINS[f.sin].virtue.toUpperCase(), "Hold on a broken " + SINS[f.sin].name + " to finish it with " + SINS[f.sin].virtue + ".", col); Sound.fx.unlock(); }
    store();
    // What each finisher gives.
    const F = FINISHERS.find((x) => x.id === kind);
    if (!quiet) Arena.say(cx, cy - 34, (F ? F.name : "Cast Out").toUpperCase(), col, 11);
    if (kind === "castOut") Arena.link(3, cx, cy);
    else Arena.link(2, cx, cy);
    if (kind === "castOut") G.oil = Math.min(1, G.oil + 0.06);
    if (kind === "underFoot") { if (G.life < T.life) { G.life++; Arena.say(G.hero.x, G.hero.y - 64, "+1 LIFE", "#ffffff", 9); } }
    if (kind === "pillar") { G.oil = Math.min(1, G.oil + 0.45); Arena.say(G.hero.x, G.hero.y - 64, "+ OIL", C.flame, 9); for (let i = 0; i < 26; i++) G.parts.push({ kind: "ember", x: cx + (Math.random() - 0.5) * 18, y: cy + 20, vx: (Math.random() - 0.5) * 30, vy: -200 - Math.random() * 260, t: 0, life: 0.9 + Math.random() * 0.5 }); }
    if (kind === "scattered") { G.flasks = Math.min(T.flasksMax, G.flasks + 2); Arena.say(G.hero.x, G.hero.y - 64, "+2 HOLY WATER", C.holy, 9); }
    if (kind === "virtue") {
      G.light.flood = 3; Sound.fx.finisher("virtue");
      for (const g of G.demons) if (g !== f && g.sin === f.sin && Arena.alive(g) && g.act.kind !== "broken" && g.act.kind !== "emerge") Foes.breakDown(g);
    }
    // What Avarice hoarded spills out.
    if (f.sin === "avarice") Foes.spill(f);
  },
  // Holy water at a demon in the dark: a flask lobbed in an arc to where it will be.
  water(f) {
    const h = G.hero;
    if (!Arena.alive(f)) return;
    if (G.flasks <= 0 && !G.practice) { Sound.fx.empty(); Arena.say(h.x, h.y - 60, "NO HOLY WATER", C.holy, 8); Arena.goTo(f.x, f.y); return; }
    h.dir = f.x >= h.x ? 1 : -1;
    h.path = null;
    Arena.act("lob", { dur: Arena.dur("lob"), f, at: MONK_HIT.lob || 0.5, done: false });
  },
  releaseFlask(a) {
    const h = G.hero, f = a.f;
    if (!G.practice) G.flasks--;
    const o = Arena.addThing("flask", h.hand[0], h.hand[1]);
    let tx = h.x + h.dir * 120, ty = h.y - 30;
    if (Arena.alive(f)) { [tx, ty] = Arena.chest(f); }
    const d = dist(o.x, o.y, tx, ty), secs = clamp(d / 380, 0.38, 1.05);
    if (f) { tx += (f.vx || 0) * secs * 0.8; }
    Arena.throwThing(o, o.x, o.y, tx, ty, secs, h, f);
    Sound.fx.flaskThrow();
  },
  throwAt(f) {
    const h = G.hero;
    if (!h.hold || !Arena.alive(f)) return;
    h.dir = f.x >= h.x ? 1 : -1; h.path = null;
    Arena.act("throw", { dur: Arena.dur("throw"), f, at: MONK_HIT.throw || 0.45, done: false });
  },
  releaseThrow(a) {
    const h = G.hero, o = h.hold, f = a.f; if (!o) return;
    h.hold = null;
    let [tx, ty] = Arena.alive(f) ? Arena.chest(f) : [h.x + h.dir * 140, h.y - 40];
    const d = dist(h.hand[0], h.hand[1], tx, ty), secs = clamp(d / 560, 0.16, 0.6);
    if (f) tx += (f.vx || 0) * secs * 0.7;
    Arena.throwThing(o, h.hand[0], h.hand[1], tx, ty, secs, h, f);
    Sound.fx.throw(0.8);
    G.prevMove = G.lastMove; G.lastMove = "throw";
  },
  goPickup(o) {
    const h = G.hero;
    if (!G.things.includes(o) || o.state !== "rest") return;
    if (dist(h.x, h.y, o.x, o.y) < 22 && Math.abs(h.y - o.y) < 24) { h.dir = o.x >= h.x ? 1 : -1; Arena.act("pickup", { dur: Arena.dur("pickup"), o, at: MONK_HIT.pickup || 0.5, done: false }); return; }
    Arena.goThen(o.x, o.y, { type: "pickup", o });
  },
  takeIt(o) {
    const h = G.hero;
    if (!G.things.includes(o)) return;
    if (o.kind === "flask") { G.things.splice(G.things.indexOf(o), 1); G.flasks = Math.min(T.flasksMax, G.flasks + 1); Sound.fx.flaskGet(); Arena.say(h.x, h.y - 60, "+1 HOLY WATER", C.holy, 8); return; }
    if (h.hold) Arena.dropHeld();
    o.state = "held"; h.hold = o; Sound.fx.pickup();
    Arena.hintOnce("hold", "Holding it: tap any demon, in the light or the dark, to throw it.", "Holding it: click any demon (or press E) to throw it.");
  },
  dropHeld() {
    const h = G.hero, o = h.hold; if (!o) return;
    h.hold = null; o.state = "flying"; o.x = h.hand[0]; o.y = h.hand[1]; o.vx = h.dir * 30; o.vy = -40; o.by = null;
  },
  catchIt(o) {
    const h = G.hero;
    if (!G.things.includes(o) || o.state !== "flying") return;
    if (o.kind === "shard") return Arena.flick(o, -o.vx, -o.vy);
    h.dir = o.x >= h.x ? 1 : -1;
    if (h.hold) Arena.dropHeld();
    o.state = "held"; o.by = null; o.at = null; h.hold = o;
    Arena.act("catch", { dur: Arena.dur("catch"), landed: true, cancelAt: 0.08 });
    Sound.fx.catchIt(); Arena.link(1, o.x, o.y); Arena.stop(0.04);
    Arena.say(h.x, h.y - 58, "CAUGHT", C.warm, 8);
  },
  // A thing flying at him, sent back the way the finger swept: at the demon who threw it if it
  // is that way, or the nearest demon that way.
  flick(o, dx, dy) {
    const h = G.hero;
    if (!G.things.includes(o) || o.state !== "flying") return;
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let best = null, bs = -Infinity;
    for (const f of G.demons) {
      if (!Arena.alive(f) || f.act.kind === "emerge") continue;
      const [cx, cy] = Arena.chest(f), vx = cx - o.x, vy = cy - o.y, d = Math.hypot(vx, vy) || 1, c = (vx * ux + vy * uy) / d;
      if (c < 0.45 || !World.lineClear(o.x, o.y, cx, cy)) continue;
      const score = c * 2 - d / 400 + (f === o.by ? 0.8 : 0);
      if (score > bs) { bs = score; best = f; }
    }
    h.dir = dx >= 0 ? 1 : -1;
    Arena.act("flick", { dur: Arena.dur("flick"), landed: true, cancelAt: 0.1 });
    Sound.fx.flick(); Arena.stop(0.05);
    if (best) Arena.sendBack(o, best);
    else { o.vx = ux * 520; o.vy = uy * 520 - 60; o.by = h; o.at = null; o.flicked = true; o.slow = false; }
  },
  dodge(dx) {
    const h = G.hero, s = dx >= 0 ? 1 : -1;
    // Roll along the ground as far as the floor goes, up to four cells.
    let n = World.node(Math.floor(h.x / CS), Math.floor((h.y - 1) / CS)), to = n;
    for (let i = 0; i < 4 && n >= 0; i++) { const m = World.node(World.nx[n] + s, World.ny[n]); if (m < 0) break; to = n = m; }
    h.dir = s; h.path = null;
    Arena.act("dodge", { dur: Arena.dur("dodge"), from: [h.x, h.y], to: [to >= 0 ? World.feetX(to) : h.x, h.y] });
    h.inv = Math.max(h.inv, Arena.dur("dodge") * 0.8); Sound.fx.whoosh(0.5);
  },

  // ---- He is struck ---------------------------------------------------------------------------------
  blocked(by, thing) {
    const h = G.hero, perfect = G.rt - h.blockT < T.parryWindow;
    if (perfect) {
      Sound.fx.parry(); Arena.link(2, h.x, h.y); Arena.stop(0.09); Arena.shake(3);
      Arena.say(h.x, h.y - 64, "PARRY", C.flameHot, 10);
      Arena.sparks(h.torch[0], h.torch[1], C.flameHot, 16);
      if (by && G.demons.includes(by) && !thing) Foes.parried(by);
      Arena.act("parry", { dur: Arena.dur("parry"), landed: true, cancelAt: 0.12 });
      h.blocking = false; h.inv = Math.max(h.inv, 0.3);
      return "parry";
    }
    Sound.fx.block(); Arena.sparks(h.torch[0], h.torch[1], C.flame, 6); Arena.shake(1.5);
    return "block";
  },
  // A blow from a demon: dmg in lives, push the way it would throw him, heavy throws him down.
  heroHit(dmg, push, by, heavy) {
    const h = G.hero;
    if (G.over || h.inv > 0 || h.act.kind === "finisher" || h.act.kind === "chain") return "missed";
    if (h.blocking) return Arena.blocked(by);
    if (!G.practice) G.life -= dmg;
    Arena.breakFlow(true); Arena.gutter(0.7);
    Sound.fx.hurt(); Arena.shake(5); Arena.stop(0.08);
    h.vx = (push || -h.dir) * (heavy ? 180 : 110); h.vy = heavy ? -200 : -90;
    if (h.hold) Arena.dropHeld();
    h.path = null; h.next = null; h.pending = null;
    if (h.pulled) h.pulled = null;
    h.inv = 1.0;
    if (G.life <= 0) { Arena.die(); return "hit"; }
    // Struck in the air, he falls (and lands on his back if the blow was heavy).
    if (!Arena.onGround()) { Arena.act("fall", { knock: heavy }); return "hit"; }
    Arena.act(heavy ? "knockdown" : "hurt", { dur: Arena.dur(heavy ? "knockdown" : "hurt") });
    return "hit";
  },
  // Sloth's touch: no wound, but the zeal drains away.
  drained() {
    const h = G.hero;
    if (h.blocking) return Arena.blocked(null);
    if (G.over || h.act.kind === "finisher" || h.act.kind === "chain") return "missed";
    G.flow = 0; G.flowT = 0; G.oil *= 0.5; Arena.gutter(1.1);
    Sound.fx.drain(); Arena.say(h.x, h.y - 64, "DRAINED", SINS.sloth.color, 10);
    for (let i = 0; i < 14; i++) G.parts.push({ kind: "smoke", x: h.x + (Math.random() - 0.5) * 20, y: h.y - Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: -15, t: 0, life: 1.4, c: "#5a6478" });
    Arena.hintOnce("sloth", "Sloth never wounds, but its touch drains your flow and your oil. Hunt it down.");
    return "drained";
  },
  die() {
    const h = G.hero;
    G.life = 0; G.over = { t: 0 };
    Arena.act("knockdown", { dur: 1.0 });
    Sound.fx.death(); Sound.flare(false); Sound.setLevel(0);
    if (G.flare.on) Arena.endFlare(true);
    save.best = Math.max(save.best || 0, G.wave); save.bestFlow = Math.max(save.bestFlow || 0, G.best); store();
  },

  // ---- The flare ------------------------------------------------------------------------------------
  startFlare() {
    const h = G.hero;
    if (G.flare.on || G.over) return;
    if (G.oil < T.oilFlareMin) { Arena.say(h.x, h.y - 60, "NOT ENOUGH OIL", C.flame, 8); Sound.fx.empty(); return; }
    G.flare = { on: true, t: 0, marks: [], stroke: null, chain: null };
    Sound.flare(true); Sound.fx.flareOn();
    if (!Arena.busy()) Arena.act("flare", { dur: Arena.dur("flare") });
    Arena.hintOnce("stroke", "Draw one stroke through the demons, in order. Let go: he goes through them all.", "Drag the mouse through the demons, in order (or press Space for each). Let go (or press F): he goes through them all.");
  },
  endFlare(quiet) {
    if (!G.flare.on) return;
    G.flare.on = false; G.flare.stroke = null;
    Sound.flare(false); if (!quiet) Sound.fx.flareOff();
  },
  mark(f) {
    const F = G.flare;
    if (!F.on || F.chain || F.marks.includes(f) || F.marks.length >= 8 || !Arena.alive(f) || f.act.kind === "emerge") return;
    F.marks.push(f); Sound.fx.mark(F.marks.length);
  },
  // Through the marked demons, one after another, a different blow for each.
  runChain() {
    const F = G.flare;
    F.marks = F.marks.filter(Arena.alive);
    if (!F.marks.length) { Arena.endFlare(); return; }
    F.chain = { i: 0 }; Sound.fx.chain();
    Arena.chainNext();
  },
  chainNext() {
    const F = G.flare, h = G.hero;
    if (!F.chain) return;
    while (F.chain.i < F.marks.length && !Arena.alive(F.marks[F.chain.i])) F.chain.i++;
    if (F.chain.i >= F.marks.length) { F.chain = null; F.marks = []; Arena.endFlare(); Arena.act(h.ground ? "idle" : "fall"); return; }
    const f = F.marks[F.chain.i++];
    F.chainIdle = 0;
    const [sx, sy, side] = Arena.strikeSpot(f);
    // In the stopped time he goes like light: where the way is blocked, he is simply there.
    if (!Arena.airClear(h.x, h.y, sx, sy, 16)) { Arena.flash(h.x, h.y - 26); h.x = sx; h.y = sy; Arena.flash(sx, sy - 26); }
    h.dir = side ? -side : (f.x >= h.x ? 1 : -1);
    if (f.act.kind === "broken") {
      h.x = sx; h.y = sy;
      Arena.act("finisher", { fin: "castOut", f, dur: 0.6, from: [sx, sy], to: [sx, sy], hitAt: MONK_HIT.castOut || 0.5, landed: false, chain: true, cancelAt: 0.6 });
      h.inv = 1; return;
    }
    const blow = Arena.chooseBlow(f);
    const dur = 0.34;
    Arena.act("attack", { blow, f, dur, from: [h.x, h.y], to: [sx, sy], hitAt: MONK_HIT[blow] || 0.5, landed: false, chain: true, cancelAt: dur });
    h.inv = 1;
    G.prevMove = G.lastMove; G.lastMove = blow; G.used[blow] = G.rt;
    Sound.fx.whoosh(0.8);
  },

  // A place beside a demon to strike it from, out of the rock: on the near side if it can be, on
  // its own floor (or at its height in the air).
  strikeSpot(f) {
    const h = G.hero, w = DEMON_SIZE[f.sin].w, air = Foes.airborne(f), near = f.x >= h.x ? -1 : 1;
    for (const side of [near, -near]) {
      const sx = f.x + side * (w / 2 + 12);
      let sy = f.y;
      if (!air) { const gy = World.groundY(sx, f.y - 24); if (gy !== null && Math.abs(gy - f.y) < 30) sy = gy; }
      sy = Math.max(48, sy);
      if (!World.solidAt(sx, sy - 6) && !World.solidAt(sx, sy - 24) && !World.solidAt(sx, sy - 42)) return [sx, sy, side];
    }
    // (Sloth, inside the rock: the nearest open place to it.)
    const ok = (x, y) => !World.solidAt(x, y - 6) && !World.solidAt(x, y - 24) && !World.solidAt(x, y - 42);
    if (ok(f.x, f.y - 2)) return [f.x, Math.max(48, f.y - 2), 0];
    for (let r = 16; r <= 160; r += 16) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r;
      if (y > 48 && ok(x, y)) { const gy = World.groundY(x, y - 4); return [x, gy !== null && gy - y < 40 ? gy : y, x < f.x ? -1 : 1]; }
    }
    return [G.hero.x, G.hero.y, 0];
  },
  flash(x, y) {
    G.parts.push({ kind: "flash", x, y, t: 0, life: 0.35, c: C.flameHot, r: 26 });
    for (let i = 0; i < 8; i++) G.parts.push({ kind: "ember", x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, t: 0, life: 0.5 });
  },

  // ---- Every frame ----------------------------------------------------------------------------------
  step(dt) {
    if (!G) return;
    const rdt = dt; G.rt += rdt;
    // Hit-stop: a few frames' pause on a heavy blow.
    if (G.hitStop > 0) { G.hitStop -= rdt; Arena.stepFX(rdt * 0.2); return; }
    const F = G.flare;
    let ts = 1;
    if (F.on) ts = T.flareWorld;
    if (G.slowMo > 0) { G.slowMo -= rdt; ts = Math.min(ts, 0.45); }
    if (G.over) ts = 0.5;
    G.ts = ts;
    const wdt = rdt * ts, hdt = rdt * (F.on ? (F.chain ? 0.95 : T.flareHero) : G.slowMo > 0 ? 0.8 : 1);
    G.t += wdt;
    if (F.on) {
      F.t += rdt;
      // A chain that has stalled (a blow cut short) goes on to the next demon; no flare lasts forever.
      if (F.chain) { F.chainIdle = G.hero.act.chain ? 0 : (F.chainIdle || 0) + rdt; if (F.chainIdle > 0.35) Arena.chainNext(); }
      if (F.t > 7 && F.on) { F.chain = null; F.marks = []; Arena.endFlare(); }
      if (!(G.practice && G.opts.endlessOil)) G.oil = Math.max(0, G.oil - T.oilBurn * rdt * (F.chain ? 0.4 : 1));
      if (G.oil <= 0 && !F.chain) { if (F.marks.length) Arena.runChain(); else Arena.endFlare(); }
    }
    if (G.practice && G.opts.endlessOil && !F.on) G.oil = 1;
    // The quick speed: while a demon is in the light, and a little after.
    const anyLit = G.demons.some((f) => f.lit && f.act.kind !== "dying");
    if (anyLit) G.quick = T.quickFor; else G.quick = Math.max(0, G.quick - rdt);
    G.quickK = G.quick > 0 ? 1 : 0;
    Arena.stepHero(hdt, rdt);
    Foes.step(wdt, rdt);
    Arena.stepThings(wdt);
    Arena.stepLight(wdt, rdt);
    Arena.stepWaves(rdt);
    Arena.stepFX(wdt);
    Arena.stepCam(rdt);
    Arena.stepKeys(rdt);
    // The music builds with the flow.
    const L = !anyLit && !Arena.quick() ? 0 : 1 + (G.flow >= 5) + (G.flow >= 12) + (G.flow >= 20);
    if (L !== G.level) { G.level = L; Sound.setLevel(L); }
    if (G.over) { G.over.t += rdt; if (G.over.t > 2.6 && mode === Arena) Game.over(); }
    if (G.toast) { G.toast.t += rdt; if (G.toast.t > 4.5) G.toast = null; }
    if (G.hint) { G.hint.t += rdt; if (G.hint.t > 7) G.hint = null; }
    if (G.trail) { G.trail.t += rdt; if (G.trail.t > 1) G.trail = null; }
  },

  stepHero(dt, rdt) {
    const h = G.hero, a = h.act;
    a.t += dt;
    if (h.inv > 0) h.inv -= dt;
    // Blocking: two fingers, a finger held on open ground, a key, or the right mouse button.
    const wantBlock = (G.two && !G.two.flare) || [...G.touches.values()].some((p) => p.block) || G.keys.KeyQ || G.keys.ShiftLeft || G.keys.ShiftRight || G.keys.KeyZ || G.mouseBlock;
    if (wantBlock && !h.blocking && ["idle", "walk", "block", "land", "pulled"].includes(a.kind) && (h.ground || a.kind === "pulled")) {
      h.blocking = true; h.blockT = G.rt; h.path = null; Arena.act("block");
      if (h.pulled) { h.pulled.f && Foes.breakTether(h.pulled.f); h.pulled = null; }
    }
    if (!wantBlock && h.blocking) { h.blocking = false; if (a.kind === "block") Arena.act("idle"); }
    if (a.kind !== "block") h.blocking = false;
    // Lust's ribbon draws him in.
    if (h.pulled) {
      const f = h.pulled.f;
      if (!Arena.alive(f) || f.act.kind !== "tether") { h.pulled = null; }
      else if (["idle", "walk", "pulled", "land"].includes(a.kind)) {
        const dx = f.x - h.x, d = Math.abs(dx);
        if (d > 30) {
          h.path = null;
          const s = Math.sign(dx), nx = h.x + s * 92 * dt;
          if (!World.solidAt(nx + s * 6, h.y - 20) && !World.solidAt(nx + s * 6, h.y - 40)) h.x = nx;
          h.dir = s;
          const gy = World.groundY(h.x, h.y - 20);
          if (gy !== null && gy > h.y + 2) { h.ground = false; h.pulled = null; Arena.act("fall"); }
          else {
            if (gy !== null) h.y = gy;
            if (a.kind !== "pulled") Arena.act("pulled");
            h.walkPh = (h.walkPh || 0) + dt * 2;
          }
        }
      }
    } else if (a.kind === "pulled") Arena.act("idle");
    switch (a.kind) {
      case "pulled": h.vx = 0; break;
      case "idle": case "block": {
        h.vx = 0;
        if (h.next && a.kind === "idle") Arena.run(h.next);
        break;
      }
      case "walk": {
        const s = h.path && h.path[0];
        if (!s || s.kind !== "walk") { Arena.nextStep(); break; }
        const tx = World.feetX(s.to), sp = (Arena.quick() ? T.runLight : T.walkDark) * (h.hold ? 0.9 : 1);
        const d = tx - h.x;
        h.dir = s.s; h.vx = Math.sign(d) * sp;
        if (Math.abs(d) <= sp * dt) { h.x = tx; h.y = World.feetY(s.to); h.path.shift(); Arena.arrived(); }
        else h.x += Math.sign(d) * sp * dt;
        const stride = Arena.quick() ? 64 : 40, ph0 = h.walkPh || 0;
        h.walkPh = ph0 + Math.abs(sp * dt) / stride;
        if (Math.floor(h.walkPh * 2) !== Math.floor(ph0 * 2)) Sound.fx.step(Arena.quick() ? 0.5 : 0.75);
        break;
      }
      case "turn": {
        if (!a.flipped && a.t >= a.dur * 0.5) { a.flipped = true; h.dir = -h.dir; }
        if (a.t >= a.dur) { if (!a.flipped) h.dir = -h.dir; if (h.path && h.path.length) { const s = h.path[0]; h.dir = s.s; if (s.kind === "walk") Arena.act("walk"); else Arena.nextStep(); } else Arena.act("idle"); }
        break;
      }
      case "move": {
        const u = clamp(a.t / a.dur, 0, 1);
        [h.x, h.y] = Arena.stepRoot(a, u);
        h.ground = !(a.anim === "leap" && u > 0.2 && u < 0.8) && !((a.anim === "climbUp" && u > 0.18 && u < 0.85) || (a.anim === "climbDown" && u > 0.15 && u < 0.9));
        if (a.anim === "climbUp" && !a.grabbed && u > 0.38) { a.grabbed = true; Sound.fx.grab(); }
        if (a.anim === "climbUp" && !a.pulled && u > 0.6) { a.pulled = true; Sound.fx.climb(); }
        if (u >= 1) {
          if (a.then === "fall") { h.vx = 0; h.vy = 0; h.ground = false; Arena.act("fall", { tx: World.feetX(a.step.to) }); break; }
          if (a.anim === "leap" || a.anim === "climbDown") Sound.fx.land(0.6);
          Arena.arrived();
        }
        break;
      }
      case "fall": {
        h.vy += T.grav * dt; h.vy = Math.min(h.vy, 900);
        if (a.tx !== undefined) h.vx = clamp((a.tx - h.x) * 8, -140, 140);
        let nx = h.x + h.vx * dt;
        if (World.solidAt(nx + Math.sign(h.vx) * 6, h.y - 10) || World.solidAt(nx + Math.sign(h.vx) * 6, h.y - 36)) { h.vx = 0; nx = h.x; }
        h.x = nx;
        let ny = h.y + h.vy * dt;
        if (h.vy < 0 && World.solidAt(h.x, ny - 46)) h.vy = 0;
        if (World.solidAt(h.x, h.y - 2)) { const top = Math.floor((h.y - 2) / CS) * CS; if (!World.solidAt(h.x, top - 2) && h.y - top < 20) { h.y = top; ny = top; } }
        const gy = World.groundY(h.x, h.y - 2);
        if (gy !== null && ny >= gy && h.vy >= 0) {
          h.y = gy; h.ground = true; h.vx = 0;
          const hard = h.vy > 420;
          h.vy = 0; Sound.fx.land(hard ? 1 : 0.6); if (hard) Arena.shake(2);
          if (a.knock) { Arena.act("knockdown", { dur: Arena.dur("knockdown"), t: 0.5 }); break; }
          Arena.act("land", { dur: Arena.dur("land") * (hard ? 1.4 : 0.8) });
        } else h.y = ny;
        if (h.y > World.h + 100) { const n = World.nearestNode(G.cam.x, G.cam.y, 400); if (n >= 0) { h.x = World.feetX(n); h.y = World.feetY(n); } }
        break;
      }
      case "land": case "hurt": case "getUp": case "flare": case "parry": case "pickup": case "catch": case "flick": case "lob": case "throw": {
        if (a.kind === "hurt") { h.x += h.vx * dt; h.vx *= Math.pow(0.02, dt); Arena.keepOut(); }
        if (a.kind === "lob" && !a.done && a.t >= a.dur * a.at) { a.done = true; Arena.releaseFlask(a); }
        if (a.kind === "throw" && !a.done && a.t >= a.dur * a.at) { a.done = true; Arena.releaseThrow(a); }
        if (a.kind === "pickup" && !a.done && a.t >= a.dur * a.at) { a.done = true; Arena.takeIt(a.o); }
        if (a.t >= a.dur) {
          if (!Arena.onGround()) { Arena.act("fall"); h.vx = 0; h.vy = 0; break; }
          Arena.act(h.blocking ? "block" : "idle");
          if (a.kind === "land" && h.path && h.path.length && !h.next) {
            // The rest of the route, from where he actually came down.
            const goal = World.feetX(h.path[h.path.length - 1].to), gy = World.feetY(h.path[h.path.length - 1].to), pend = h.pending;
            Arena.goTo(goal, gy); h.pending = pend; break;
          }
          if (h.next) Arena.run(h.next);
        }
        break;
      }
      case "knockdown": {
        if (a.t < 0.5) { h.x += h.vx * dt; h.vx *= Math.pow(0.05, dt); Arena.keepOut(); }
        if (a.t >= a.dur && !G.over) Arena.act("getUp", { dur: Arena.dur("getUp") });
        break;
      }
      case "zip": {
        const u = clamp(a.t / a.dur, 0, 1), k = smooth(u);
        const zx = lerp(a.from[0], a.to[0], k), zy = lerp(a.from[1], a.to[1], k) - Math.sin(u * PI) * a.arc;
        if (World.solidAt(zx, zy - 6) || World.solidAt(zx, zy - 40)) { h.vx = 0; h.vy = 0; Arena.act("fall"); break; }
        h.x = zx; h.y = zy;
        h.ground = u >= 1;
        if (u >= 1) {
          h.x = a.to[0]; h.y = a.to[1];
          if (!Arena.onGround()) { h.vx = 0; h.vy = 0; Arena.act("fall"); break; }
          if (a.then) { const c = a.then; Arena.act("idle"); Arena.run(c); }
          else Arena.arrived();
        }
        break;
      }
      case "dodge": {
        const u = clamp(a.t / a.dur, 0, 1);
        h.x = lerp(a.from[0], a.to[0], ease(u));
        if (u >= 1) { Arena.act("idle"); if (h.next) Arena.run(h.next); }
        break;
      }
      case "attack": {
        const u = clamp(a.t / a.dur, 0, 1), B = BLOWS[a.blow] || {};
        // Follow the demon as he flies at it, so the blow finds it.
        if (!a.landed && Arena.alive(a.f) && (B.fly || a.chain)) {
          const side = a.f.x >= a.from[0] ? -1 : 1, w = DEMON_SIZE[a.f.sin].w;
          const nt = [a.f.x + side * (w / 2 + 12), Math.max(48, Foes.airborne(a.f) || B.fly ? a.f.y + (a.blow === "diveStomp" ? -DEMON_SIZE[a.f.sin].h * 0.6 : 0) : a.f.y)];
          if (!World.solidAt(nt[0], nt[1] - 10) && !World.solidAt(nt[0], nt[1] - 40)) a.to = nt;
        }
        const hit = a.hitAt;
        if (u <= hit) {
          const k = hit > 0 ? u / hit : 1, e = B.fly || a.chain ? smooth(k) : ease(k);
          const lift = B.fly || a.chain ? Math.sin(k * PI) * (B.arc || 18) * (1 - k * 0.4) : 0;
          const nx = lerp(a.from[0], a.to[0], e), ny = Math.max(44, lerp(a.from[1], a.to[1], e) - lift);
          if (World.solidAt(nx, ny - 6) || World.solidAt(nx, ny - 24) || World.solidAt(nx, ny - 42)) {
            // Blocked: if the demon is in reach the blow lands now; if not, he drops.
            if (Arena.alive(a.f) && dist(h.x, h.y - 26, ...Arena.chest(a.f)) < 46) { a.t = a.dur * hit; Arena.landBlow(a); }
            else if (!a.chain) { h.vx = 0; h.vy = 0; Arena.act("fall"); break; }
          } else { h.x = nx; h.y = ny; }
          h.ground = !(B.fly || a.chain) && Arena.onGround();
        }
        if (!a.landed && u >= hit) Arena.landBlow(a);
        if (B.rise && a.landed) {
          const ny = h.y + h.vy * dt, gy = World.groundY(h.x, h.y - 2);
          if (h.vy < 0 && (World.solidAt(h.x, ny - 50) || ny < 60)) h.vy = 0;
          else if (h.vy > 0 && gy !== null && ny >= gy) { h.y = gy; h.vy = 0; }
          else h.y = ny;
          h.vy += T.grav * dt * 0.8;
        }
        if (u >= 1) {
          const ok = Arena.onGround();
          if (a.chain && G.flare.chain) { Arena.chainNext(); break; }
          if (!ok) { h.vx = h.dir * 30; h.vy = B.rise ? Math.min(h.vy, 0) : -40; Arena.act("fall"); if (h.next) { /* waits */ } break; }
          Arena.act("idle"); if (h.next) Arena.run(h.next);
        }
        break;
      }
      case "finisher": {
        const u = clamp(a.t / a.dur, 0, 1);
        if (a.fin === "underFoot") h.y = a.from[1] - Math.sin(clamp(u / 0.6, 0, 1) * PI) * 26 * (u < 0.6 ? 1 : 0);
        if (!a.landed && u >= a.hitAt) { a.landed = true; if (Arena.alive(a.f)) Arena.castOut(a.f, a.fin); }
        if (u >= 1) {
          h.y = a.from[1];
          if (a.chain && G.flare.chain) { Arena.chainNext(); break; }
          Arena.act("idle"); if (h.next) Arena.run(h.next);
        }
        break;
      }
      case "dying": break;
    }
    if (!(a.kind === "move" && (a.anim === "climbUp" || a.anim === "climbDown")) && (World.solidAt(h.x, h.y - 14) || World.solidAt(h.x, h.y - 34))) Arena.unstick();
    if (h.y < 40) { h.y = 40; h.vy = Math.max(0, h.vy || 0); }
    // Where the torch is, and his free hand (the art says, for his pose this frame).
    const P = Arena.heroPose();
    h.anim = P.anim;
    h.torch = monkJoint(h.x, h.y, h.dir, P.p, "torch");
    h.hand = monkJoint(h.x, h.y, h.dir, P.p, "hF");
    h.pose = P.p;
  },
  // He has reached the end of a step: the next step, or what he came for.
  arrived() {
    const h = G.hero;
    h.ground = true;
    if (h.path && h.path.length) { Arena.nextStep(); return; }
    h.path = null; Arena.act("idle");
    if (h.pending) { const p = h.pending; h.pending = null; if (p.type === "pickup") Arena.goPickup(p.o); else if (p.type === "strike") { if (Arena.alive(p.f)) { if (Arena.demonLit(p.f) || dist(h.x, h.y, p.f.x, p.f.y) < 60) Arena.strike(p.f, p.blow); } } else if (p.type === "finish") Arena.finish(p.f, p.kind); return; }
    if (h.next) Arena.run(h.next);
  },
  // Out of the rock to the nearest place he can stand, and on with whatever he was doing.
  unstick() {
    const h = G.hero, n = World.nearestNode(h.x, h.y, 96);
    if (n < 0) return;
    h.x = World.feetX(n); h.y = World.feetY(n); h.vx = 0; h.vy = 0; h.ground = true;
    if (["fall", "zip", "attack", "dodge", "hurt", "knockdown"].includes(h.act.kind) && !(h.act.kind === "attack" && !h.act.landed)) Arena.act("idle");
  },
  onGround() { const h = G.hero; return World.solidAt(h.x, h.y + 3) || World.solidAt(h.x - 5, h.y + 3) || World.solidAt(h.x + 5, h.y + 3); },
  // Never inside the rock: pushed out sideways if a knock drove him in.
  keepOut() {
    const h = G.hero;
    if (!Arena.onGround() && h.act.kind === "knockdown" && h.act.t < 0.3) { h.vy = h.vy || 0; Arena.act("fall", { knock: true }); return; }
    for (const s of [1, -1]) if (World.solidAt(h.x + s * 6, h.y - 20)) { h.x = (Math.floor((h.x + s * 6) / CS) + (s > 0 ? 0 : 1)) * CS - s * 7; h.vx = 0; }
    if (!Arena.onGround() && ["hurt", "knockdown"].includes(h.act.kind) && h.act.t > 0.15) { const gy = World.groundY(h.x, h.y - 4); if (gy !== null && gy > h.y + 4) { h.vy = 0; Arena.act("fall"); } }
  },
  // His pose this frame, from what he is doing (MONK_ANIM, from the art).
  heroPose() {
    const h = G.hero, a = h.act, t = G.rt, q = Arena.quick();
    const A = (name, u) => ({ anim: name, p: (MONK_ANIM[name] || MONK_ANIM.idle)(u, t) });
    switch (a.kind) {
      case "idle": return h.hold ? A("carry", (t * 0.4) % 1) : A("idle", (t * 0.4) % 1);
      case "block": return A("block", (t * 0.5) % 1);
      case "walk": return A(q ? "run" : "walk", (h.walkPh || 0) % 1);
      case "pulled": return A("walk", 1 - ((h.walkPh || 0) % 1));
      case "turn": return A("turn", clamp(a.t / a.dur, 0, 1));
      case "move": return A(a.anim, clamp(a.t / a.dur, 0, 1));
      case "fall": return A("fall", (t * 2) % 1);
      case "zip": return A("zip", clamp(a.t / a.dur, 0, 1));
      case "attack": return A(a.blow, clamp(a.t / a.dur, 0, 1));
      case "finisher": return A(a.fin, clamp(a.t / a.dur, 0, 1));
      case "dying": return A("knockdown", 1);
      default: return A(a.kind, clamp(a.t / (a.dur || 1), 0, 1));
    }
  },

  // ---- The waves ------------------------------------------------------------------------------------
  nextWave() {
    G.wave++;
    const list = G.wave <= WAVES.length ? WAVES[G.wave - 1].slice() : Arena.makeWave(G.wave);
    G.queue = list; G.waveState = "intro"; G.waveT = 0; G.spawnT = 1.6;
    G.verse = VERSES[(G.wave - 1) % VERSES.length];
    Sound.fx.waveStart(G.wave);
  },
  makeWave(n) {
    const count = Math.min(14, 6 + Math.floor((n - 8) / 2)), out = [];
    const r = seeded(n * 977);
    for (let i = 0; i < count; i++) out.push(SIN_ORDER[Math.floor(r() * SIN_ORDER.length)]);
    if (!out.includes("wrath")) out[0] = "wrath";
    return out;
  },
  maxAlive() { return G.practice ? (G.opts.count === undefined ? 3 : G.opts.count) : Math.min(8, 2 + Math.ceil(G.wave / 2)); },
  stepWaves(dt) {
    if (G.over) return;
    const alive = G.demons.filter((f) => f.act.kind !== "dying").length;
    if (G.practice) {
      const sins = G.opts.sins && G.opts.sins.length ? G.opts.sins : SIN_ORDER;
      G.spawnT -= dt;
      if (alive < Arena.maxAlive() && G.spawnT <= 0) { Foes.spawn(sins[Math.floor(Math.random() * sins.length)]); G.spawnT = 1.2; }
      return;
    }
    G.waveT += dt;
    if (G.waveState === "intro" && G.waveT > 2.8) G.waveState = "fight";
    G.spawnT -= dt;
    if (G.queue.length && G.spawnT <= 0 && alive < Arena.maxAlive()) { Foes.spawn(G.queue.shift()); G.spawnT = 0.9 + Math.random() * 0.8; }
    if (G.waveState !== "clear" && !G.queue.length && alive === 0 && G.waveT > 3) {
      G.waveState = "clear"; G.waveT = 0;
      Sound.fx.waveClear();
      G.flasks = Math.min(T.flasksMax, G.flasks + 1);
      if (G.wave % 2 === 0 && G.life < T.life) G.life++;
      save.best = Math.max(save.best || 0, G.wave); store();
      // Finishers open as the waves are won.
      for (const F of FINISHERS) if (F.wave === G.wave && !save.unlocked[F.id]) {
        save.unlocked[F.id] = 1; store(); Sound.fx.unlock();
        Arena.toast("NEW FINISHER: " + F.name.toUpperCase(), F.gesture + " on a broken demon. " + F.what + ".", C.flameHot);
      }
    }
    if (G.waveState === "clear" && G.waveT > 3.4) Arena.nextWave();
  },

  // ---- Particles and words --------------------------------------------------------------------------
  sparks(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 90 + Math.random() * 260; G.parts.push({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, t: 0, life: 0.28 + Math.random() * 0.25 }); } },
  stepFX(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.t += dt;
      if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      if (p.kind === "spark") { p.vx *= Math.pow(0.02, dt); p.vy = p.vy * Math.pow(0.02, dt) + 300 * dt; }
      if (p.kind === "drop" || p.kind === "chip") p.vy += 600 * dt;
      if (p.kind === "ash") { p.vx *= Math.pow(0.3, dt); p.vy *= Math.pow(0.4, dt); p.vy -= 10 * dt; }
      if (p.kind === "ember") { p.vx += Math.sin(p.t * 9 + i) * 40 * dt; p.vy *= Math.pow(0.5, dt); }
    }
    if (G.parts.length > 600) G.parts.splice(0, G.parts.length - 600);
    for (let i = G.texts.length - 1; i >= 0; i--) { const s = G.texts[i]; s.t += dt / Math.max(0.2, G.ts); s.y -= 18 * dt / Math.max(0.2, G.ts); if (s.t > 1.3) G.texts.splice(i, 1); }
    // The torch sheds embers as it goes.
    const h = G.hero;
    if (Math.random() < (G.flare.on ? 0.9 : 0.25)) G.parts.push({ kind: "ember", x: h.torch[0] + (Math.random() - 0.5) * 4, y: h.torch[1] - 6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 50, t: 0, life: 0.6 + Math.random() * 0.6 });
  },
  stepCam(dt) {
    const h = G.hero, c = G.cam;
    let tx = h.x + h.dir * 34, ty = h.y - 52;
    if (G.flare.on && G.flare.marks.length) { const m = G.flare.marks.filter(Arena.alive); if (m.length) { let mx = 0, my = 0; for (const f of m) { mx += f.x; my += f.y; } tx = lerp(tx, mx / m.length, 0.35); ty = lerp(ty, my / m.length - 30, 0.35); } }
    const zt = G.flare.on ? 0.9 : Arena.quick() ? 0.96 : 1.1;
    c.z += (zt - c.z) * (1 - Math.exp(-dt * 2.2));
    const k = 1 - Math.exp(-dt * (Arena.quick() ? 5 : 3.2));
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
    const hw = W / 2 / c.z, hh = H / 2 / c.z;
    c.x = clamp(c.x, hw, Math.max(hw, World.w - hw)); c.y = clamp(c.y, Math.min(hh, World.h - hh) - 60, Math.max(hh, World.h - hh));
    c.shake = Math.max(0, c.shake - dt * 18);
  },
  toWorld(p) { const c = G.cam; return { x: (p.x - W / 2) / c.z + c.x, y: (p.y - H / 2) / c.z + c.y }; },
  toScreen(x, y) { const c = G.cam; return [(x - c.x) * c.z + W / 2, (y - c.y) * c.z + H / 2]; },

  // ---- Fingers --------------------------------------------------------------------------------------
  // What is under a finger: a thing flying at him in the light, a broken demon, a demon, a thing
  // lying on the ground, or open ground.
  under(w) {
    const h = G.hero;
    const fly = Arena.thingAt(w.x, w.y, 24, (o) => o.state === "flying" && o.slow);
    if (fly) return { what: "flying", o: fly };
    const br = Arena.demonAt(w.x, w.y, 18, (f) => f.act.kind === "broken");
    if (br) return { what: "broken", f: br };
    const f = Arena.demonAt(w.x, w.y, 14, (f) => f.act.kind !== "dying" && f.act.kind !== "emerge");
    if (f) return { what: f.lit ? "litDemon" : "darkDemon", f };
    const o = Arena.thingAt(w.x, w.y, 12, (o) => o.state === "rest");
    if (o) return { what: "thing", o };
    if (dist(w.x, w.y, h.x, h.y - 24) < 22 && h.hold) return { what: "self" };
    return { what: "ground" };
  },
  down(p, ev) {
    if (!G || G.over) return;
    if (p.y < 44 && p.x > W - 56) return;   // the pause button
    if (ev.button === 2) { G.mouseBlock = true; return; }
    const w = Arena.toWorld(p), id = ev.pointerId;
    // A second finger: block, or (if they spread apart) the flare.
    if (G.touches.size === 1 && !G.two) {
      const [other] = G.touches.values();
      if (G.rt - other.t0 < 0.6 || other.still) {
        other.second = true;
        G.two = { a: other.id, b: id, d0: dist(other.x, other.y, p.x, p.y), t0: G.rt, flare: false };
        G.touches.set(id, { id, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: G.rt, w, u: Arena.under(w), second: true });
        return;
      }
    }
    if (G.touches.size >= 2) return;
    const u = Arena.under(w);
    const t = { id, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: G.rt, w, u, path: [[w.x, w.y]], still: true, held: false };
    G.touches.set(id, t);
    // In the flare a finger draws the stroke through the demons.
    if (G.flare.on && !G.flare.chain) { G.flare.stroke = t.path; t.stroke = true; const f = Arena.demonAt(w.x, w.y, 16); if (f) Arena.mark(f); }
  },
  move(p, ev) {
    if (!G) return;
    const t = G.touches.get(ev.pointerId); if (!t) return;
    t.x = p.x; t.y = p.y;
    const moved = dist(t.x0, t.y0, p.x, p.y);
    if (moved > 12) t.still = false;
    // Two fingers spreading apart: the flare.
    if (G.two && !G.two.flare) {
      const A = G.touches.get(G.two.a), B = G.touches.get(G.two.b);
      if (A && B) { const d = dist(A.x, A.y, B.x, B.y); if (d - G.two.d0 > 46 && d > G.two.d0 * 1.3) { G.two.flare = true; Arena.startFlare(); } }
      return;
    }
    if (t.stroke && G.flare.on && !G.flare.chain) {
      const w = Arena.toWorld(p), last = t.path[t.path.length - 1];
      t.path.push([w.x, w.y]);
      // Every demon the stroke passes through is marked, in order.
      for (const f of G.demons) {
        if (G.flare.marks.includes(f) || !Arena.alive(f)) continue;
        const [cx, cy] = Arena.chest(f), s = DEMON_SIZE[f.sin];
        if (Arena.segDist(cx, cy, last[0], last[1], w.x, w.y) < s.w / 2 + 12 || Arena.segDist(f.x, f.y - s.h * 0.2, last[0], last[1], w.x, w.y) < s.w / 2 + 8) Arena.mark(f);
      }
    }
  },
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, k = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1);
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  },
  up(p, ev) {
    if (!G) return;
    if (ev.button === 2) { G.mouseBlock = false; return; }
    const t = G.touches.get(ev.pointerId);
    if (!t) return;
    G.touches.delete(ev.pointerId);
    if (t.second || (G.two && (G.two.a === t.id || G.two.b === t.id))) {
      if (!G.touches.size || !G.two || ![G.two.a, G.two.b].some((id) => G.touches.has(id))) G.two = null;
      if (!G.touches.size) G.two = null;
      return;
    }
    if (G.over) return;
    if (t.block || t.held) return;
    if (t.stroke) {
      if (G.flare.marks.length && t.path.length > 2) { Arena.runChain(); return; }
      if (t.path.length > 3) return;
    }
    const dx = t.x - t.x0, dy = t.y - t.y0, L = Math.hypot(dx, dy), u = t.u, h = G.hero;
    // A swipe is a finger that travels: its direction matters, not much its speed.
    const swipe = L > 22 && (G.rt - t.t0 < 0.9 || L > 70);
    const dir = !swipe ? "tap" : Math.abs(dy) > Math.abs(dx) * 1.1 ? (dy < 0 ? "up" : "down") : "side";
    Arena.gesture(u, dir, dx, dy, Arena.toWorld({ x: t.x0, y: t.y0 }), Arena.toWorld(p));
  },
  // A gesture, by what was under the finger where it began.
  gesture(u, dir, dx, dy, w0, w1) {
    const h = G.hero;
    if (!G.started) G.started = true;
    switch (u.what) {
      case "flying": {
        if (!G.things.includes(u.o) || u.o.state !== "flying") return Arena.command({ type: "go", x: w1.x, y: w1.y });
        if (dir === "tap") return Arena.command({ type: "catch", o: u.o });
        return Arena.command({ type: "flick", o: u.o, dx, dy });
      }
      case "broken": {
        const kind = { tap: "castOut", down: "underFoot", up: "pillar", side: "scattered" }[dir];
        if (!u.f.lit && dist(h.x, h.y, u.f.x, u.f.y) > G.light.R) return Arena.command({ type: "water", f: u.f });
        return Arena.command({ type: "finish", f: u.f, kind });
      }
      case "litDemon": case "darkDemon": {
        const f = u.f;
        if (h.hold) return Arena.command({ type: "throwAt", f });
        if (!Arena.demonLit(f)) return Arena.command({ type: "water", f });
        if (dir === "up") return Arena.command({ type: "strike", f, blow: f.sin === "gluttony" ? "slam" : "launch" });
        if (dir === "down") return Arena.command({ type: "strike", f, blow: Foes.airborne(f) ? "slam" : "slam" });
        if (dir === "side") return Arena.command({ type: "strike", f, blow: "dash" });
        return Arena.command({ type: "strike", f });
      }
      case "thing": {
        if (dir === "tap" || !Arena.quick()) return Arena.command({ type: "pickup", o: u.o });
        return Arena.command({ type: "dodge", dx });
      }
      case "self": return Arena.command({ type: "drop" });
      default: {
        if (dir !== "tap" && Arena.quick() && Math.abs(dx) > Math.abs(dy)) return Arena.command({ type: "dodge", dx });
        return Arena.command({ type: "go", x: w0.x, y: w0.y });
      }
    }
  },
  // A finger held still on open ground blocks, for one-hand play; a hold on a broken demon is the virtue.
  stepTouches() {
    for (const t of G.touches.values()) {
      if (t.second || t.stroke || !t.still || t.held) continue;
      if (G.rt - t.t0 > 0.42) {
        t.held = true;
        if (t.u.what === "broken" && Arena.alive(t.u.f) && t.u.f.act.kind === "broken") Arena.command({ type: "finish", f: t.u.f, kind: "virtue" });
        else if (t.u.what === "ground") t.block = true;
      }
    }
  },

  // ---- Keys -----------------------------------------------------------------------------------------
  key(code, down, e) {
    if (!G) return;
    G.keys[code] = down;
    if (!down) return;
    if (e && e.repeat) return;
    const h = G.hero;
    if (code === "Escape" || code === "KeyP") { Game.pause(); return; }
    if (G.over) return;
    const litFoe = (f) => Arena.alive(f) && f.lit && f.act.kind !== "emerge", darkFoe = (f) => Arena.alive(f) && !f.lit && f.act.kind !== "emerge";
    const ahead = (ok) => Arena.nearestDemon((f) => ok(f) && (f.x - h.x) * h.dir > -12) || Arena.nearestDemon(ok);
    if (code === "KeyF") { if (G.flare.on) { if (G.flare.marks.length) Arena.runChain(); else Arena.endFlare(); } else Arena.startFlare(); return; }
    if (code === "Space") {
      if (G.flare.on && !G.flare.chain) { const f = Arena.nearestDemon((f) => Arena.alive(f) && !G.flare.marks.includes(f) && f.act.kind !== "emerge"); if (f) Arena.mark(f); return; }
      const br = Arena.nearestDemon((f) => Arena.alive(f) && f.act.kind === "broken" && f.lit);
      if (br) return Arena.command({ type: "finish", f: br, kind: "castOut" });
      const f = ahead(litFoe);
      if (f) return Arena.command(h.hold ? { type: "throwAt", f } : { type: "strike", f });
      const g = ahead(darkFoe);
      if (g) return Arena.command(h.hold ? { type: "throwAt", f: g } : { type: "water", f: g });
      return;
    }
    if (code === "KeyE") {
      const fly = Arena.thingAt(h.x, h.y - 26, 110, (o) => o.state === "flying" && o.slow);
      if (fly) return Arena.command({ type: "catch", o: fly });
      if (h.hold) { const f = ahead((f) => Arena.alive(f) && f.act.kind !== "emerge"); if (f) return Arena.command({ type: "throwAt", f }); return Arena.command({ type: "drop" }); }
      const o = Arena.thingAt(h.x, h.y - 6, 140, (o) => o.state === "rest");
      if (o) return Arena.command({ type: "pickup", o });
      return;
    }
    const fin = { KeyX: "castOut", Digit1: "castOut", Digit2: "underFoot", Digit3: "pillar", Digit4: "scattered", Digit5: "virtue" }[code];
    if (fin) { const br = Arena.nearestDemon((f) => Arena.alive(f) && f.act.kind === "broken"); if (br) Arena.command({ type: "finish", f: br, kind: fin }); return; }
    const sw = { KeyC: "launch", KeyV: "slam", KeyR: "dash" }[code];
    if (sw) { const f = ahead(litFoe); if (f) Arena.command({ type: "strike", f, blow: sw }); return; }
    if (code === "ArrowUp" || code === "KeyW") return Arena.command({ type: "go", x: h.x + h.dir * 20, y: h.y - 70 });
    if (code === "ArrowDown" || code === "KeyS") return Arena.command({ type: "go", x: h.x + h.dir * 24, y: h.y + 90 });
  },
  // Walking with the arrows: keep him going that way while the key is held.
  stepKeys() {
    if (!G || G.over) return;
    Arena.stepTouches();
    const k = G.keys, h = G.hero, s = (k.ArrowLeft || k.KeyA) ? -1 : (k.ArrowRight || k.KeyD) ? 1 : 0;
    if (!s) return;
    if (Arena.busy() || h.blocking) return;
    if (h.act.kind === "walk" && h.path && h.path.length > 1 && h.path[h.path.length - 1] && Math.sign(World.feetX(h.path[h.path.length - 1].to) - h.x) === s) return;
    const from = Arena.heroNode();
    // Along the floor first; where it ends, the nearest place on that side.
    let to = -1;
    for (let i = 1; i <= 3; i++) { const n = World.node(World.nx[from] + s * i, World.ny[from]); if (n < 0) break; to = n; }
    if (to >= 0) { h.path = World.route(from, to); if (h.path && h.path.length) { if (h.act.kind !== "walk") Arena.nextStep(); } return; }
    Arena.goTo(h.x + s * 56, h.y - 8);
  },

  draw() { Scene.draw(); },
  moves() {
    const k = usingKeys();
    return [
      [k ? "CLICK THE GROUND" : "TAP THE GROUND", "Go there. He climbs and leaps on his own."],
      [k ? "CLICK A DEMON, LIT" : "TAP A DEMON, LIT", "Fly at it and strike: the blow fits where it is."],
      [k ? "CLICK A DEMON, DARK" : "TAP A DEMON, DARK", "Holy water, lobbed. Only so many flasks."],
      [k ? "DRAG UP / DOWN / ACROSS" : "SWIPE UP / DOWN / ACROSS", "On a lit demon: launch, slam, dash through."],
      [k ? "CLICK A THING" : "TAP A THING", "Pick it up. Then " + (k ? "click" : "tap") + " any demon to throw it."],
      [k ? "CLICK / DRAG A THROWN THING" : "TAP / SWIPE A THROWN THING", "In the light: catch it, or send it back."],
      [k ? "RIGHT BUTTON, Q, SHIFT" : "TWO FINGERS DOWN", "Block. At the last instant: parry."],
      [k ? "F, THEN DRAG" : "SPREAD TWO FINGERS", "The flare: draw one stroke through the demons."],
      [k ? "CLICK A BROKEN DEMON" : "TAP A BROKEN DEMON", "Cast Out. Swipe down, up, across, or hold: other finishers."],
      [k ? "ARROWS / A D, UP, DOWN" : "", k ? "Walk, climb, drop. Space strikes, E takes and throws." : ""],
    ].filter((r) => r[0]);
  },
};
