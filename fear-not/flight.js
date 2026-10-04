"use strict";
// Fear Not: the flight. The city seen from straight above, as in the first Grand Theft Auto:
// tall buildings leaning away from the middle of the screen, their walls and windows and neon
// showing as you pass, and the camera drawing back while the angel is in the air and coming in
// close when it lands. Fr. Lawrence rides his angel from rooftop to rooftop: tap a roof near you
// and the angel leaps to it, gliding down to a lower one, beating its wings hard to climb to a
// higher one. Only so far at a leap: across the city it goes building by building. Below, the
// traffic and the people under their umbrellas. Three times on the way the demons come down out of
// the dark onto the roofs round them, and Fr. Lawrence gets down to fight them there (roof.js).

const Flight = (() => {
  const BLOCK = 200, STREET = 56, NX = 20, NY = 14, LANE = 12, WALK = 5;
  const FOCAL = 430, REACH = 300;
  const START = { x: 320, y: 300 }, CHURCH = { x: 9.5 * BLOCK, y: 5.5 * BLOCK }, HOME = { x: 3.5 * BLOCK, y: 11.5 * BLOCK };
  const CARLINE = 10, CAR = { x: 16.5 * BLOCK, y: CARLINE * BLOCK + LANE + 6 };
  const SIGNS = [C.pink, C.cyan, C.red, C.teal, C.pink, C.cyan, C.lav];
  const CARCOL = ["#1c2236", "#2a1a22", "#14262a", "#262630", "#301c14", "#1a1a1e", "#3a3a44", "#22304a"];
  const ROOFS = ["#161d33", "#1b2238", "#1a1c2c", "#20283e", "#262234", "#151a28", "#1d2630", "#22243a"];
  const UMB = ["#2a2a34", "#2a2a34", "#4a2430", "#24384e", "#6a1c26", "#34405e", "#a01e30", "#a08a30", "#24504a", "#5a3a6a"];
  let F = null, P = null, built = null, cars = null, people = null, RF = null;
  // The fights on the rooftops on the way: after a leap or two, on the way to the church; after the
  // church; and near her father's car. Each starts on the next roof big enough to fight on.
  const FIGHTS = [
    { step: 1, leaps: 1, cap: 3, gap: [2.4, 3.2], first: true, foes: [["whisper", 0.4], ["whisper", 0.9], ["whisper", 2.6], ["whisper", 5]],
      say: () => tip("They have seen us. Down you go, Father: I am right above you. Tap one on our roof, and strike it; tap one on another roof, and I strike it with light.", "They have seen us. Down you go, Father: I am right above you. Arrows and Space to strike; at one on another roof, Space, and I strike it with light."),
      after: "Up, Father. On to the church." },
    { step: 3, leaps: 1, cap: 3, gap: [2, 2.8], foes: [["whisper", 0.4], ["grab", 1], ["whisper", 2.4], ["whisper", 4.4], ["whisper", 7]],
      say: () => tip("More of them, on every roof round us. That big one grabs: when it shows red, hold on the open roof to block. And drag one on another roof: your rosary hauls it over.", "More of them, on every roof round us. That big one grabs: when it shows red, hold Q to block. And R throws your rosary at one on another roof, and hauls it over."),
      after: "Up. Follow her prayer." },
    { step: 4, leaps: 1, cap: 4, gap: [1.7, 2.5], foes: [["whisper", 0.4], ["shield", 1], ["grab", 3], ["whisper", 4.4], ["whisper", 6.4], ["whisper", 9]],
      say: () => "They will not let us near him. Throw them off the roofs, Father, and keep moving.",
      after: "Up. He is close now." },
  ];
  const roomy = (b) => b && !b.church && b.x1 - b.x0 >= 64 && b.y1 - b.y0 >= 64;
  function startFight(enc) {
    F.fought.push(enc);
    RF.start(enc, (hero) => {
      // He climbs back on, and the flight goes on from his roof.
      P.x = hero.x; P.y = hero.y; P.alt = P.on.h; P.mode = "stand"; P.head = hero.ang; F.landT = 0.4;
      say(enc.after);
    });
  }
  const tip = (touch, keys) => (usingKeys() ? keys : touch);

  // ---- The city, from a fixed seed: the same every time --------------------------------------------
  function build() {
    const blocks = [], lights = [];
    const near = (x, y, o, r) => dist(x, y, o.x, o.y) < r;
    const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, k = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return dist(x, y, a.x + dx * k, a.y + dy * k); };
    // How lit a place is by design: the church's quarter and the way from it are lit; the rest
    // of the district is dimmer, and round the car it is darkest.
    const litChance = (x, y) => {
      let k = 0.3;
      if (near(x, y, CHURCH, 600)) k = 0.95;
      else if (segD(x, y, START, CHURCH) < 260) k = 0.85;
      else if (segD(x, y, CHURCH, HOME) < 240) k = 0.75;
      else if (near(x, y, HOME, 360)) k = 0.65;
      else if (segD(x, y, HOME, CAR) < 200) k = 0.45;
      if (near(x, y, CAR, 420)) k = Math.min(k, 0.15);
      return k;
    };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x0 = i * BLOCK + STREET / 2, y0 = j * BLOCK + STREET / 2, x1 = (i + 1) * BLOCK - STREET / 2, y1 = (j + 1) * BLOCK - STREET / 2;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = seeded(i * 7919 + j * 104729 + 17);
      const B = { i, j, x0, y0, x1, y1, kind: "city", b: [] };
      const isChurch = Math.abs(cx - CHURCH.x) < 1 && Math.abs(cy - CHURCH.y) < 1, isHome = Math.abs(cx - HOME.x) < 1 && Math.abs(cy - HOME.y) < 1;
      // Tall uptown, to the north and east, with towers among them; low in the old quarter round
      // the church.
      const up = clamp((x0 / (NX * BLOCK)) * 0.8 + (1 - y0 / (NY * BLOCK)) * 0.6 - 0.2, 0, 1), old = clamp(1 - dist(cx, cy, CHURCH.x, CHURCH.y) / 700, 0, 1);
      const roll = r();
      if (isChurch) {
        B.kind = "church";
        B.b.push({ church: true, x0: CHURCH.x - 62, y0: CHURCH.y - 22, x1: CHURCH.x + 62, y1: CHURCH.y + 22, h: 66 }, { church: true, x0: CHURCH.x + 6, y0: CHURCH.y - 56, x1: CHURCH.x + 38, y1: CHURCH.y + 56, h: 66 });
      } else if (!isHome && roll < 0.06) B.kind = "park";
      else if (!isHome && roll < 0.1) { B.kind = "lot"; B.parked = Math.floor(r() * 1e6); }
      else {
        const split = r(), lots = [];
        if (split < 0.22) lots.push([x0, y0, x1, y1]);
        else if (split < 0.5) { const m = lerp(x0, x1, 0.35 + r() * 0.3); lots.push([x0, y0, m - 4, y1], [m + 4, y0, x1, y1]); }
        else if (split < 0.72) { const m = lerp(y0, y1, 0.35 + r() * 0.3); lots.push([x0, y0, x1, m - 4], [x0, m + 4, x1, y1]); }
        else { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; lots.push([x0, y0, mx - 4, my - 4], [mx + 4, y0, x1, my - 4], [x0, my + 4, mx - 4, y1], [mx + 4, my + 4, x1, y1]); }
        for (const [a, b, c, d] of lots) {
          const ins = 8 + r() * 5;
          let h = 40 + Math.pow(r(), 1.3) * (100 + 300 * up);
          if (r() < 0.16 && up > 0.25) h += 200 + r() * 360;          // the towers: twice the height of the rest
          h = clamp(h * (1 - 0.55 * old), 28, 920);
          if (isHome) h = 84;
          const bd = { x0: a + ins, y0: b + ins, x1: c - ins, y1: d - ins, h, tone: r(), win: Math.floor(r() * 1e6), tank: r() < 0.3, ac: r() < 0.55, pad: h > 300 && r() < 0.5, sign: null };
          if (r() < 0.38) { const side = Math.floor(r() * 4); bd.sign = { side, c: SIGNS[Math.floor(r() * SIGNS.length)], z: clamp(h * (0.25 + r() * 0.5), 18, h - 10) }; }
          B.b.push(bd);
          if (bd.sign) {
            const s = bd.sign, sx = s.side === 1 ? bd.x1 : s.side === 3 ? bd.x0 : (bd.x0 + bd.x1) / 2, sy = s.side === 0 ? bd.y0 : s.side === 2 ? bd.y1 : (bd.y0 + bd.y1) / 2;
            lights.push({ x: sx, y: sy, z: s.z, c: s.c, kind: "neon", r: 30, pow: 1, lit: r() < litChance(sx, sy) ? 1 : 0, b: bd });
          }
        }
        if (isHome) { B.home = B.b[0]; B.kind = "home"; }
      }
      blocks.push(B);
    }
    // Street lamps, at the corners of the crossroads.
    for (let j = 1; j < NY; j++) for (let i = 1; i < NX; i++) {
      const x = i * BLOCK + (hash2(i, j, 3) < 0.5 ? 1 : -1) * (STREET / 2 + 2), y = j * BLOCK + (hash2(i, j, 4) < 0.5 ? 1 : -1) * (STREET / 2 + 2);
      lights.push({ x, y, z: 16, c: C.ice, kind: "lamp", r: 14, pow: 0.8, lit: hash2(i, j, 5) < litChance(x, y) + 0.2 ? 1 : 0 });
    }
    lights.push({ x: CHURCH.x, y: CHURCH.y, z: 66, c: C.holy, kind: "church", r: 80, pow: 2.2, lit: 1, holy: true });
    for (const L of lights) { L.base = L.lit; L.show = L.lit; }
    return { blocks, lights };
  }
  const blockAt = (x, y) => { const i = Math.floor(x / BLOCK), j = Math.floor(y / BLOCK); return i < 0 || j < 0 || i >= NX || j >= NY ? null : built.blocks[j * NX + i]; };
  // The roof under (x, y), or the street.
  function groundAt(x, y) {
    const B = blockAt(x, y); let h = 0;
    if (B) for (const b of B.b) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) h = Math.max(h, b.h);
    return h;
  }

  // ---- The traffic, and the people under their umbrellas ---------------------------------------------
  // Cars keep to the right along the streets and turn at the crossroads; people walk round their
  // blocks on the pavement. A few hundred of each, and only the ones on the screen are drawn.
  function makeLife() {
    cars = []; people = [];
    const r = seeded(321);
    while (cars.length < 150) {
      const ax = r() < 0.5 ? "h" : "v", line = ax === "h" ? 1 + Math.floor(r() * (NY - 1)) : 1 + Math.floor(r() * (NX - 1));
      if (ax === "h" && line === CARLINE) continue;
      const len = (ax === "h" ? NX : NY) * BLOCK;
      cars.push({ ax, line, pos: BLOCK * 1.5 + r() * (len - BLOCK * 3), dir: r() < 0.5 ? 1 : -1, sp: 70 + r() * 70, col: r() < 0.12 ? "#c8a028" : CARCOL[Math.floor(r() * CARCOL.length)], long: r() < 0.08, bl: 0, from: null });
    }
    for (const B of built.blocks) {
      if (B.kind === "church") continue;
      const n = B.kind === "park" ? 4 : 2 + Math.floor(r() * 2.6), w = B.x1 - B.x0 - 2 * WALK, h = B.y1 - B.y0 - 2 * WALK;
      for (let k = 0; k < n; k++) people.push({ B, per: 2 * (w + h), w, h, s: r() * 2 * (w + h), dir: r() < 0.5 ? 1 : -1, sp: 9 + r() * 12, umb: r() < 0.6 ? UMB[Math.floor(r() * UMB.length)] : null, coat: CARCOL[Math.floor(r() * CARCOL.length)], gust: 0, spin: 0 });
    }
  }
  function carXY(c) {
    if (c.ax === "h") return [c.pos, c.line * BLOCK + LANE * c.dir, c.dir > 0 ? 0 : PI];
    return [c.line * BLOCK - LANE * c.dir, c.pos, c.dir > 0 ? PI / 2 : -PI / 2];
  }
  function stepCars(dt) {
    const nmax = { h: NX, v: NY };
    for (const c of cars) {
      const before = c.pos; c.pos += c.dir * c.sp * dt;
      c.bl = Math.max(0, c.bl - dt * 2.2);
      const k0 = Math.floor(before / BLOCK), k1 = Math.floor(c.pos / BLOCK);
      if (k0 === k1) continue;
      // Over a crossroads: on, or turn.
      const cross = c.dir > 0 ? k1 : k0, edge = cross <= 1 || cross >= nmax[c.ax] - 1;
      if (!edge && Math.random() > 0.3) continue;
      const nax = c.ax === "h" ? "v" : "h", nline = cross;
      if (nax === "h" && nline === CARLINE) { if (!edge) continue; c.dir = -c.dir; continue; }
      c.from = carXY(c); c.bl = 1;
      const npos = c.line * BLOCK, along = npos / BLOCK;
      c.ax = nax; c.line = nline; c.pos = npos;
      c.dir = along <= 1 ? 1 : along >= nmax[nax] - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;
    }
  }
  function personXY(p) {
    const B = p.B, x0 = B.x0 + WALK, y0 = B.y0 + WALK, s = ((p.s % p.per) + p.per) % p.per;
    if (s < p.w) return [x0 + s, y0, p.dir > 0 ? 0 : PI];
    if (s < p.w + p.h) return [x0 + p.w, y0 + s - p.w, p.dir > 0 ? PI / 2 : -PI / 2];
    if (s < 2 * p.w + p.h) return [x0 + p.w - (s - p.w - p.h), y0 + p.h, p.dir > 0 ? PI : 0];
    return [x0, y0 + p.h - (s - 2 * p.w - p.h), p.dir > 0 ? -PI / 2 : PI / 2];
  }
  function stepPeople(dt) {
    for (const p of people) {
      p.gust = Math.max(0, p.gust - dt); p.spin += p.gust * dt * 20;
      if (p.gust < 0.4) p.s += p.dir * p.sp * dt;
    }
  }

  // ---- Starting --------------------------------------------------------------------------------
  // Every roof the angel can stand on: the buildings, the church's roofs, and none of the parks.
  function roofs() { const out = []; for (const B of built.blocks) for (const b of B.b) out.push(b); return out; }
  const roofCentre = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
  // How far from where he stands to the nearest edge of a roof.
  const edgeD = (b, x, y) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
  const reachable = (b) => b !== P.on && edgeD(b, P.x, P.y) <= REACH;
  function start(done) {
    if (!built) { built = build(); makeLife(); }
    for (const L of built.lights) { L.lit = L.base; L.show = L.lit; L.dying = 0; }
    const first = roofs().sort((a, b) => dist(START.x, START.y, roofCentre(a).x, roofCentre(a).y) - dist(START.x, START.y, roofCentre(b).x, roofCentre(b).y))[0], c = roofCentre(first);
    P = { x: c.x, y: c.y, alt: first.h, on: first, jump: null, speed: 0, head: 0.55, wing: 0, mode: "stand", flapT: 0 };
    F = { done, t: 0, step: 0, stepT: 0, lastStep: 0, stepLeaps: 0, msg: null, msgs: [], keys: {}, arrive: 0, fade: 1, dark: 300, rain: [], leaps: 0, ups: 0, downs: 0, far: null, hits: [], toldFar: false, fought: [] };
    RF = RF || RoofFight({ sx, sy, K, roofs, groundAt, drawAngel, get P() { return P; }, get cam() { return cam; } });
    cam = { x: P.x, y: P.y, z: P.alt + 300, lx: 0, ly: 0 };
    for (let i = 0; i < 120; i++) F.rain.push(rainDrop(true));
    say(tip("Hold on to me, Father. Tap a rooftop near us, and I will leap to it.", "Hold on to me, Father. Press an arrow, and I will leap to the nearest roof that way; or click a roof near us."));
    Sound.play(SONGS.noir); Sound.setLevel(0); Sound.ambience({ wind: 0.2, windF: 420, rain: 0 });
    mode = Flight;
  }
  function say(t, who) { F.msg = { text: t, t: 0, who: who || "angel" }; if ((who || "angel") === "angel") Sound.fx.chord(F.msgs.length); F.msgs.push(t); }

  // ---- The leaps ---------------------------------------------------------------------------------
  // To a roof near him: up over anything taller on the way, beating hard if the roof is higher,
  // gliding if it is lower. `street` for the last one, down to his car.
  function leap(b, street) {
    if (P.jump || F.arrive) return false;
    let tx, ty, h1;
    if (street) { tx = CAR.x - 34; ty = CAR.y - 18; h1 = 0; }
    else { const c = roofCentre(b), nx = clamp(P.x, b.x0, b.x1), ny = clamp(P.y, b.y0, b.y1); tx = clamp(lerp(c.x, nx, 0.4), b.x0 + 8, b.x1 - 8); ty = clamp(lerp(c.y, ny, 0.4), b.y0 + 8, b.y1 - 8); h1 = b.h; }
    const d = dist(P.x, P.y, tx, ty), h0 = P.alt;
    let top = Math.max(h0, h1);
    for (let i = 1; i < 10; i++) top = Math.max(top, groundAt(lerp(P.x, tx, i / 10), lerp(P.y, ty, i / 10)));
    const apex = top + 30 + d * 0.08, c = 2 * apex - (h0 + h1) / 2;
    const dur = 0.6 + d / 480 + Math.max(0, h1 - h0) / 700 + (street ? 0.4 : 0);
    P.jump = { x0: P.x, y0: P.y, h0, x1: tx, y1: ty, h1, c, dur, t: 0, b, street, d };
    P.head = Math.atan2(ty - P.y, tx - P.x); P.on = null;
    F.leaps++; if (h1 > h0 + 40) F.ups++; else if (h1 < h0 - 40) F.downs++;
    Sound.fx.whoosh(0.4, 0.7, true); Sound.fx.flap(1.1);
    return true;
  }
  function stepLeap(dt) {
    const J = P.jump; J.t += dt;
    const u = clamp(J.t / J.dur, 0, 1), e = smooth(u);
    P.x = lerp(J.x0, J.x1, e); P.y = lerp(J.y0, J.y1, e);
    const alt = (1 - u) * (1 - u) * J.h0 + 2 * u * (1 - u) * J.c + u * u * J.h1, rising = 2 * (1 - u) * (J.c - J.h0) + 2 * u * (J.h1 - J.c);
    P.alt = alt;
    P.speed = J.d / J.dur * 1.6 + Math.abs(rising) / J.dur * 0.3;
    // Climbing, the wings beat fast; coming down, they spread and glide.
    P.mode = rising > 20 ? "flap" : "glide";
    if (P.mode === "flap") { P.flapT -= dt; if (P.flapT <= 0) { P.flapT = 0.16; Sound.fx.flap(0.7); } }
    if (u >= 1) {
      P.jump = null; P.speed = 0; P.alt = J.h1; P.mode = "stand";
      Sound.fx.step(1.6); F.landT = 0.4;
      if (J.street) { F.arrive = 0.001; Sound.fx.whoosh(1.2, 1, false); Sound.fx.heart(1); }
      else P.on = J.b;
    }
  }
  // The roof under a point on the screen: the one drawn on top there, its roof first, then its walls.
  function roofAt(p) {
    let best = null;
    for (let i = F.hits.length - 1; i >= 0; i--) {
      const h = F.hits[i];
      if (p.x >= h.rx0 - 6 && p.x <= h.rx1 + 6 && p.y >= h.ry0 - 6 && p.y <= h.ry1 + 6) return h.b;
      if (!best && p.x >= h.bx0 && p.x <= h.bx1 && p.y >= h.by0 && p.y <= h.by1) best = h.b;
    }
    return best;
  }
  function tryLeap(b) {
    if (!b || P.jump || F.arrive || b === P.on) return;
    if (!reachable(b)) {
      F.far = { b, t: F.t }; Sound.fx.tick(600, 0.8);
      if (!F.toldFar) { F.toldFar = true; say("Too far for one leap, Father. Building by building."); }
      return;
    }
    leap(b);
  }
  // The best roof within reach the way he points (or, with no way, toward where they are going).
  function roofToward(dx, dy) {
    let best = null, bs = -1e9;
    const T = target();
    for (const b of roofs()) {
      if (!reachable(b)) continue;
      const c = roofCentre(b), vx = c.x - P.x, vy = c.y - P.y, d = Math.hypot(vx, vy) || 1;
      let sc;
      if (dx || dy) { const m = Math.hypot(dx, dy), dot = (vx * dx + vy * dy) / (d * m); if (dot < 0.55) continue; sc = dot * 220 - d * 0.5; }
      else { const gain = dist(P.x, P.y, T.x, T.y) - dist(c.x, c.y, T.x, T.y); if (gain <= 0) continue; sc = gain; }
      if (sc > bs) { bs = sc; best = b; }
    }
    return best;
  }
  const nearCar = () => dist(P.x, P.y, CAR.x, CAR.y) < REACH + 140;

  const fighting = () => RF && RF.active();
  function step(dt) { stepFlight(dt); if (!fighting()) moveCam(dt); }
  function stepFlight(dt) {
    F.t += dt; if (F.msg) F.msg.t += dt;
    F.fade = Math.max(0, F.fade - dt * 1.2);
    if (F.landT) F.landT = Math.max(0, F.landT - dt);
    stepCars(dt); stepPeople(dt);
    // The darkness closes round the car, and the lights in it go out one by one.
    F.dark = Math.min(1150, 300 + F.t * 4.2);
    for (const L of built.lights) {
      if (L.holy || L.lit <= 0) { L.show = L.lit; continue; }
      if (dist(L.x, L.y, CAR.x, CAR.y) < F.dark && !L.dying) L.dying = 0.001;
      if (L.dying) { L.dying += dt; L.show = Math.sin(L.dying * 40) > 0 ? 0.3 : 1; if (L.dying > 0.9) { L.lit = 0; L.show = 0; } }
      else L.show = L.lit;
    }
    if (fighting()) { RF.step(dt); return; }
    if (F.arrive) {
      F.arrive += dt;
      if (F.arrive > 1.6 && !F.left) { F.left = true; Sound.ambience({ wind: 0 }); F.done(); }
      return;
    }
    if (P.jump) stepLeap(dt);
    P.wing += dt * (P.mode === "flap" ? 26 : P.mode === "glide" ? 0.6 : 2);
    // Low over the street, the wind of the wings stirs the umbrellas.
    if (P.alt < 50) for (const p of people) { if (p.gust > 0) continue; const [x, y] = personXY(p); if (Math.abs(x - P.x) < 34 && Math.abs(y - P.y) < 34) p.gust = 1; }
    Sound.setLevel(P.jump ? 2 : F.step >= 1 ? 1 : 0);
    Sound.ambience({ wind: P.jump ? 0.55 : 0.2, windF: P.jump ? 900 : 420 });
    lessons();
  }
  // ---- The lessons of the first flight, one after another ------------------------------------------
  function lessons() {
    const s = F.step, on = P.on;
    if (s === 0 && F.leaps >= 1 && !P.jump) { F.step = 1; say("Higher, and I beat my wings; lower, and I glide. But only so far at a leap: across the city we go building by building."); }
    else if (s === 1 && F.leaps >= 3 && !P.jump) { F.step = 2; say("There: the church. Its light will fill us."); }
    else if (s === 2 && on && on.church) { F.step = 3; say("Now the gold thread, to the south. That is her prayer, rising. Follow it."); Sound.fx.glory(); }
    else if (s === 3 && on && dist(P.x, P.y, HOME.x, HOME.y) < 200) { F.step = 4; say("Her window. She has prayed all night. Now the smoke, to the east: her father. Hurry. The dark is closing round him."); }
    else if (s === 4 && nearCar() && !P.jump && F.fought.length >= FIGHTS.length) { F.step = 5; say(tip("There, his car. Tap it, and we dive down to the street.", "There, his car. Press Space, or click it, and we dive down to the street.")); }
    if (F.step !== F.lastStep) { F.lastStep = F.step; F.stepT = F.t; F.stepLeaps = F.leaps; }
    // A fight, when one is due and the roof is wide enough to stand on.
    const nf = FIGHTS[F.fought.length];
    if (nf && F.step >= nf.step && F.leaps - F.stepLeaps >= nf.leaps && !P.jump && !F.arrive && (roomy(P.on) || (nearCar() && P.on && !P.on.church && P.on.x1 - P.on.x0 >= 40 && P.on.y1 - P.on.y0 >= 40))) startFight(nf);
  }
  function target() {
    if (F.step <= 2) return { x: CHURCH.x, y: CHURCH.y, c: C.holy, z: 66 };
    if (F.step === 3) return { x: HOME.x, y: HOME.y, c: C.holy, z: 84 };
    return { x: CAR.x, y: CAR.y, c: C.ember, z: 0 };
  }

  // ---- The camera ------------------------------------------------------------------------------------
  // Straight down from above the angel. It draws back with speed and comes in close when slow, and
  // always stays well above the tallest roof in view, so the towers loom but never reach it.
  let cam = { x: 0, y: 0, z: 400, lx: 0, ly: 0 };
  const K = (z) => FOCAL / Math.max(30, cam.z - z);
  const sx = (x, z) => W / 2 + (x - cam.x) * K(z);
  const sy = (y, z) => H / 2 + (y - cam.y) * K(z);
  function moveCam(dt) {
    // Drawn back while the angel is in the air, close in when it stands on a roof.
    const sp = clamp(P.speed / 600, 0, 1), back = lerp(250, 620, sp);
    let tall = 0;
    // It must stay above the towers right round him; taller ones further off are drawn reaching
    // up past it, as the tallest did in the first Grand Theft Auto.
    const i0 = Math.floor((P.x - 280) / BLOCK), i1 = Math.floor((P.x + 280) / BLOCK), j0 = Math.floor((P.y - 280) / BLOCK), j1 = Math.floor((P.y + 280) / BLOCK);
    for (let j = Math.max(0, j0); j <= Math.min(NY - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) for (const b of built.blocks[j * NX + i].b) if (edgeD(b, P.x, P.y) < 240) tall = Math.max(tall, b.h);
    const want = Math.max(P.alt + back, tall + 150);
    cam.z += (want - cam.z) * Math.min(1, dt * (want > cam.z ? 2.6 : 1.4));
    // A little way ahead of the angel while it leaps; over it when it stands.
    const lead = P.jump ? 30 + P.speed * 0.1 : 0;
    cam.lx += (Math.cos(P.head) * lead - cam.lx) * Math.min(1, dt * 2); cam.ly += (Math.sin(P.head) * lead - cam.ly) * Math.min(1, dt * 2);
    cam.x = P.x + cam.lx; cam.y = P.y + cam.ly;
  }

  // ---- Drawing -------------------------------------------------------------------------------------
  function rainDrop(any) { const a = Math.random() * TAU, r = any ? Math.random() * W * 0.7 : W * (0.45 + Math.random() * 0.35); return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, k: 0.6 + Math.random() * 0.8 }; }
  function draw() {
    F.hits.length = 0;
    const k0 = K(0), hw = W / 2 / k0 + 30, hh = H / 2 / k0 + 30;
    const vx0 = cam.x - hw, vx1 = cam.x + hw, vy0 = cam.y - hh, vy1 = cam.y + hh;
    const inView = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
    // The street: wet asphalt, the pavements, the markings.
    rect(0, 0, W, H, "#070910");
    const i0 = Math.max(0, Math.floor(vx0 / BLOCK)), i1 = Math.min(NX - 1, Math.floor(vx1 / BLOCK)), j0 = Math.max(0, Math.floor(vy0 / BLOCK)), j1 = Math.min(NY - 1, Math.floor(vy1 / BLOCK));
    drawMarkings(i0, i1, j0, j1, k0);
    // The pavements, with their kerbs, all in two fills.
    ctx.beginPath(); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const B = built.blocks[j * NX + i]; ctx.rect(sx(B.x0, 0), sy(B.y0, 0), (B.x1 - B.x0) * k0, (B.y1 - B.y0) * k0); } ctx.fillStyle = "#141924"; ctx.fill();
    ctx.beginPath(); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const B = built.blocks[j * NX + i]; ctx.rect(sx(B.x0 + 2, 0), sy(B.y0 + 2, 0), (B.x1 - B.x0 - 4) * k0, (B.y1 - B.y0 - 4) * k0); } ctx.fillStyle = "#10141e"; ctx.fill();
    const vis = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const B = built.blocks[j * NX + i];
      const x0 = sx(B.x0, 0), y0 = sy(B.y0, 0), w = (B.x1 - B.x0) * k0, h = (B.y1 - B.y0) * k0;
      if (B.kind === "park") {
        rect(x0 + 8 * k0, y0 + 8 * k0, w - 16 * k0, h - 16 * k0, "#08130f");
        const r = seeded(B.i * 31 + B.j);
        for (let n = 0; n < 9; n++) { const tx = B.x0 + 20 + r() * (B.x1 - B.x0 - 40), ty = B.y0 + 20 + r() * (B.y1 - B.y0 - 40), tr = 10 + r() * 9; circle(sx(tx, 0) + 3 * k0, sy(ty, 0) + 3 * k0, tr * k0, "#040806"); circle(sx(tx, 18), sy(ty, 18), tr * K(18), "#0c2018"); circle(sx(tx - 2, 20), sy(ty - 3, 20), tr * 0.55 * K(20), "#12291f"); }
      } else if (B.kind === "lot") {
        rect(x0 + 8 * k0, y0 + 8 * k0, w - 16 * k0, h - 16 * k0, "#0c0f18");
        for (let n = 1; n < 8; n++) rect(x0 + 8 * k0 + n * (w - 16 * k0) / 8, y0 + 10 * k0, 1, h * 0.32, "#232a3c");
        const r = seeded(B.parked);
        for (let n = 0; n < 7; n++) if (r() < 0.55) parkedCar(B.x0 + 8 + (n + 0.5) * (B.x1 - B.x0 - 16) / 8, B.y0 + 30, CARCOL[Math.floor(r() * CARCOL.length)]);
      }
      for (const b of B.b) if (!b.church) vis.push(b);
      if (B.kind === "church") vis.push({ church: true, x0: CHURCH.x - 62, y0: CHURCH.y - 56, x1: CHURCH.x + 62, y1: CHURCH.y + 56, h: 66 });
    }
    // Light pooled on the wet street.
    for (const L of built.lights) if (L.show > 0 && (L.kind !== "lamp" || k0 > 0.75) && inView(L.x, L.y, 120)) glow(sx(L.x, 0), sy(L.y, 0), (L.kind === "church" ? 170 : L.kind === "lamp" ? 46 : 54) * k0, L.c, (L.kind === "lamp" ? 0.2 : 0.22) * L.show);
    // The people, and the traffic.
    // Detail by distance: people and their umbrellas only when close enough to see them.
    if (k0 > 0.8) drawPeople(inView);
    drawCars(inView, k0 > 0.85);
    drawCar();
    // The angel's light on the street below it, when it flies low.
    if (P.alt < 160) glow(sx(P.x, 0), sy(P.y, 0), 70 * k0, C.holy, 0.3 * (1 - P.alt / 160));
    // Buildings, the farthest from the middle first, so the near ones lean over them. Any that
    // stand between the camera and the angel, taller than it flies, are drawn after it.
    for (const b of vis) b.d = (cam.x - clamp(cam.x, b.x0, b.x1)) ** 2 + (cam.y - clamp(cam.y, b.y0, b.y1)) ** 2;
    vis.sort((a, b) => b.d - a.d);
    const pd = (cam.x - P.x) ** 2 + (cam.y - P.y) ** 2, over = [];
    const inDark = (b) => dist((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, CAR.x, CAR.y) < F.dark;
    for (const b of vis) { if (b.h > P.alt && b.d < pd) { over.push(b); continue; } b.church ? drawChurch() : drawBuilding(b, inDark(b)); }
    if (fighting()) RF.drawWorld(); else { drawShadow(); drawAngel(); }
    for (const b of over) b.church ? drawChurch() : drawBuilding(b, inDark(b));
    // The lights themselves: neon and lamps.
    for (const L of built.lights) {
      if (!inView(L.x, L.y, 200) || L.kind === "church") continue;
      const x = sx(L.x, L.z), y = sy(L.y, L.z), kz = K(L.z);
      if (L.show > 0) { glow(x, y, L.r * kz, L.c, (L.kind === "lamp" ? 0.6 : 0.8) * L.show); circle(x, y, Math.max(1, (L.kind === "lamp" ? 1.6 : 2) * kz), mix(L.c, "#ffffff", 0.6)); }
      else if (L.kind === "lamp") circle(x, y, Math.max(1, 1.8 * kz), "#1a2030");
    }
    drawThread();
    // The darkness round the car.
    const dx = sx(CAR.x, 0), dy = sy(CAR.y, 0), gr = ctx.createRadialGradient(dx, dy, 0, dx, dy, Math.max(1, F.dark * k0));
    gr.addColorStop(0, "rgba(2,1,4,0.72)"); gr.addColorStop(0.7, "rgba(2,1,4,0.45)"); gr.addColorStop(1, "rgba(2,1,4,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    drawCarEyes(); drawSmoke();
    // Mist in the air, thicker the higher you are; clouds passing under you up top.
    const haze = clamp((cam.z - 500) / 900, 0, 0.35);
    if (haze > 0) { ctx.fillStyle = "rgba(18,24,44," + haze + ")"; ctx.fillRect(0, 0, W, H); }
    drawRain();
    if (fighting()) { RF.drawHUD(); pauseButton(); } else drawHUD();
    if (F.arrive) rect(0, 0, W, H, "rgba(0,0,0," + clamp((F.arrive - 0.6) / 1.0, 0, 1) + ")");
    if (F.fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + F.fade + ")");
  }
  // Lane lines and zebra crossings, as the first Grand Theft Auto had them.
  function drawMarkings(i0, i1, j0, j1, k0) {
    // The lane lines: one dashed path for the lot.
    ctx.beginPath();
    for (let j = Math.max(1, j0); j <= Math.min(NY - 1, j1 + 1); j++) for (let i = i0; i <= i1; i++) { const y = sy(j * BLOCK, 0); ctx.moveTo(sx(i * BLOCK + STREET / 2 + 10, 0), y); ctx.lineTo(sx((i + 1) * BLOCK - STREET / 2 - 10, 0), y); }
    for (let i = Math.max(1, i0); i <= Math.min(NX - 1, i1 + 1); i++) for (let j = j0; j <= j1; j++) { const x = sx(i * BLOCK, 0); ctx.moveTo(x, sy(j * BLOCK + STREET / 2 + 10, 0)); ctx.lineTo(x, sy((j + 1) * BLOCK - STREET / 2 - 10, 0)); }
    ctx.setLineDash([16 * k0, 14 * k0]); ctx.strokeStyle = "#3a3524"; ctx.lineWidth = 1.2 * k0; ctx.stroke(); ctx.setLineDash([]);
    // Crossings: white stripes across each street at every corner (when close enough to see them).
    if (k0 < 0.8) return;
    ctx.fillStyle = "rgba(200,206,220,0.16)";
    for (let j = Math.max(1, j0); j <= Math.min(NY - 1, j1 + 1); j++) for (let i = Math.max(1, i0); i <= Math.min(NX - 1, i1 + 1); i++) {
      const cx = i * BLOCK, cy = j * BLOCK, e = STREET / 2 + 3;
      for (let n = -3; n <= 3; n++) {
        ctx.fillRect(sx(cx + n * 7 - 2, 0), sy(cy - e - 6, 0), 4 * k0, 6 * k0); ctx.fillRect(sx(cx + n * 7 - 2, 0), sy(cy + e, 0), 4 * k0, 6 * k0);
        ctx.fillRect(sx(cx - e - 6, 0), sy(cy + n * 7 - 2, 0), 6 * k0, 4 * k0); ctx.fillRect(sx(cx + e, 0), sy(cy + n * 7 - 2, 0), 6 * k0, 4 * k0);
      }
    }
  }
  function parkedCar(x, y, col) {
    const k = K(0);
    ctx.save(); ctx.translate(sx(x, 0), sy(y, 0)); ctx.rotate(PI / 2); ctx.scale(k, k);
    rect(-11, -5, 22, 10, col); rect(-4, -4, 9, 8, "#0a0c14"); ctx.restore();
  }
  // A car from above at night: its body, the glass, the roof, its headlights throwing light ahead
  // on the wet street and its tail lights red behind.
  function drawCars(inView, near) {
    const k = K(0), kr = K(7);
    for (const c of cars) {
      let [x, y, a] = carXY(c);
      if (c.bl > 0 && c.from) { const u = smooth(1 - c.bl); x = lerp(c.from[0], x, u); y = lerp(c.from[1], y, u); a = c.from[2] + angDiff(c.from[2], a) * u; }
      if (!inView(x, y, 60)) continue;
      const L = c.long ? 34 : 22, X = sx(x, 0), Y = sy(y, 0), ca = Math.cos(a), sa = Math.sin(a);
      if (!near) { ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.scale(k, k); rect(-L / 2, -5.2, L, 10.4, c.col); rect(L / 2 - 2, -4, 2, 8, "#fffbe8"); rect(-L / 2, -4, 1.6, 8, "#ff2030"); ctx.restore(); continue; }
      // The beams on the street ahead.
      glow(X + ca * (L * 0.5 + 26) * k, Y + sa * (L * 0.5 + 26) * k, 24 * k, "#fff2c8", 0.32);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.scale(k, k);
      rect(-L / 2, -5.2, L, 10.4, c.col);
      rect(-L / 2 + L * 0.22, -4.2, L * 0.16, 8.4, "#0a0e18");                 // the rear window
      rect(L / 2 - L * 0.36, -4.2, L * 0.14, 8.4, "#101a2a");                  // the windscreen
      ctx.restore();
      // The roof, a little higher, so it shifts as the car passes under you.
      ctx.save(); ctx.translate(sx(x, 7), sy(y, 7)); ctx.rotate(a); ctx.scale(kr, kr);
      rect(-L * 0.12 - L * 0.14, -4, L * 0.38, 8, mix(c.col, "#ffffff", 0.12)); if (c.col === "#c8a028") rect(-2, -1.5, 4, 3, "#ffe680");
      ctx.restore();
      circle(X + (ca * L * 0.5 - sa * 3.6) * k, Y + (sa * L * 0.5 + ca * 3.6) * k, 1.1 * k, "#fffbe8"); circle(X + (ca * L * 0.5 + sa * 3.6) * k, Y + (sa * L * 0.5 - ca * 3.6) * k, 1.1 * k, "#fffbe8");
      circle(X - (ca * L * 0.5 - sa * 3.6) * k, Y - (sa * L * 0.5 + ca * 3.6) * k, 1 * k, "#ff2030"); circle(X - (ca * L * 0.5 + sa * 3.6) * k, Y - (sa * L * 0.5 - ca * 3.6) * k, 1 * k, "#ff2030");
      glow(X - ca * L * 0.5 * k, Y - sa * L * 0.5 * k, 7 * k, "#ff2030", 0.4);
    }
  }
  // People on the pavements: umbrellas, mostly, in the rain; or a hat and shoulders.
  function drawPeople(inView) {
    const k = K(6);
    for (const p of people) {
      const [x, y, a] = personXY(p);
      if (!inView(x, y, 20)) continue;
      const X = sx(x, 6), Y = sy(y, 6), step = Math.sin((p.s + p.dir * 3) * 0.6);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.scale(k, k);
      if (p.umb) {
        const w = p.gust > 0 ? Math.sin(p.spin) * 0.5 : 0;
        ctx.rotate(w); ctx.fillStyle = p.umb; ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, TAU); ctx.fill();
        // The wet sheen of the street lights on it, and its ribs.
        ctx.strokeStyle = "rgba(210,230,255,0.35)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 5.6, -2.6, -1.2); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 0.5; for (let n = 0; n < 4; n++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(n * PI / 2 + 0.4) * 6.4, Math.sin(n * PI / 2 + 0.4) * 6.4); ctx.stroke(); }
      } else {
        ctx.fillStyle = p.coat; ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 4.2, 0, 0, TAU); ctx.fill();
        rect(step * 1.6 - 1, 2.6, 2, 1.2, "#0a0a10"); rect(-step * 1.6 - 1, -3.8, 2, 1.2, "#0a0a10");
        circle(0.4, 0, 1.9, "#1a1418");
      }
      ctx.restore();
    }
  }
  function drawBuilding(b, dark) {
    const top = Math.min(b.h, cam.z - 90), kr = K(top);
    const gx0 = sx(b.x0, 0), gx1 = sx(b.x1, 0), gy0 = sy(b.y0, 0), gy1 = sy(b.y1, 0);
    const rx0 = sx(b.x0, top), rx1 = sx(b.x1, top), ry0 = sy(b.y0, top), ry1 = sy(b.y1, top);
    const t = b.tone, wall = dark ? "#06080f" : t < 0.33 ? "#121a32" : t < 0.66 ? "#161c3a" : "#14162a", wall2 = dark ? "#040509" : t < 0.33 ? "#0c1224" : t < 0.66 ? "#0e132a" : "#0d0f1e";
    const walls = [];
    if (cam.y > b.y1) walls.push([2, [gx0, gy1, gx1, gy1, rx1, ry1, rx0, ry1], wall]);
    if (cam.y < b.y0) walls.push([0, [gx0, gy0, gx1, gy0, rx1, ry0, rx0, ry0], wall2]);
    if (cam.x > b.x1) walls.push([1, [gx1, gy0, gx1, gy1, rx1, ry1, rx1, ry0], wall2]);
    if (cam.x < b.x0) walls.push([3, [gx0, gy0, gx0, gy1, rx0, ry1, rx0, ry0], wall]);
    for (const [side, q, c] of walls) {
      poly(q, c);
      const span = Math.hypot(q[4] - q[2], q[5] - q[3]);
      // Windows in rows up the wall, a few of them lit.
      if (!dark && span > 6 && span / Math.max(1, Math.floor(top / 14)) > 1.5) {
        const floors = Math.max(1, Math.floor(top / 14)), len = side % 2 ? b.y1 - b.y0 : b.x1 - b.x0, cols = Math.max(3, Math.min(9, Math.floor(len / 14))), sz = clamp(span / floors * 0.45, 1, 3.2);
        for (let f = 0; f < floors; f++) for (let cI = 0; cI < cols; cI++) {
          if (hash2(b.win + side * 97, f, cI) > 0.3) continue;
          const u = (cI + 0.5) / cols, v = (f + 0.6) / (floors + 0.4);
          const ax = lerp(q[0], q[2], u), ay = lerp(q[1], q[3], u), bx = lerp(q[6], q[4], u), by = lerp(q[7], q[5], u);
          const wx = lerp(ax, bx, v), wy = lerp(ay, by, v), hc = hash2(b.win, f + side, cI + 9);
          winAdd(hc < 0.2 ? 0 : hc < 0.6 ? 3 : 2, wx - sz / 2, wy - sz / 2, sz, sz);
        }
      }
      // The street's darkness pooled at the foot of the wall.
      ctx.globalAlpha = 0.55; poly([q[0], q[1], q[2], q[3], lerp(q[2], q[4], 0.25), lerp(q[3], q[5], 0.25), lerp(q[0], q[6], 0.25), lerp(q[1], q[7], 0.25)], "#03040a"); ctx.globalAlpha = 1;
      // A neon sign on this wall.
      if (b.sign && b.sign.side === side) {
        const v = Math.min(0.95, b.sign.z / top), u0 = 0.25, u1 = 0.75, dv = Math.min(0.1, 12 / top);
        const p = (u, vv) => [lerp(lerp(q[0], q[2], u), lerp(q[6], q[4], u), vv), lerp(lerp(q[1], q[3], u), lerp(q[7], q[5], u), vv)];
        const a = p(u0, v - dv), bb = p(u1, v - dv), c2 = p(u1, v + dv), d = p(u0, v + dv);
        const L = b.light || (b.light = built.lights.find((l) => l.b === b));
        const on = L ? L.show : 0;
        poly([a[0], a[1], bb[0], bb[1], c2[0], c2[1], d[0], d[1]], on > 0 ? mix(b.sign.c, "#ffffff", 0.3) : "#1a1a26");
      }
    }
    winFlush(0.6);
    F.hits.push({ b, rx0, ry0, rx1, ry1, bx0: Math.min(gx0, rx0), by0: Math.min(gy0, ry0), bx1: Math.max(gx1, rx1), by1: Math.max(gy1, ry1) });
    // The roof: its parapet, the plant on it, a water tank, a helipad on the tallest.
    const rw = rx1 - rx0, rh = ry1 - ry0, roofC = ROOFS[Math.floor(t * ROOFS.length)];
    rect(rx0, ry0, rw, rh, dark ? "#080a12" : roofC);
    // Tar seams across the roof, and the parapet round its edge.
    if (!dark && rw > 30) { ctx.fillStyle = "rgba(0,0,0,0.16)"; const n = Math.floor((b.win % 5) + 2); for (let i = 1; i <= n; i++) ctx.fillRect(rx0, ry0 + rh * i / (n + 1), rw, Math.max(0.6, 0.8 * kr)); }
    ctx.strokeStyle = dark ? "#0e1220" : mix(roofC, "#8a9cc8", 0.3); ctx.lineWidth = Math.max(1, 2 * kr); ctx.strokeRect(rx0 + 0.5, ry0 + 0.5, rw - 1, rh - 1);
    // The stair head: a little hut on the roof, its door lit.
    if (b.win % 3 === 0 && rw > 24) { const hx = lerp(rx0, rx1, 0.18), hy = lerp(ry0, ry1, 0.2), hw = rw * 0.16, hh = rh * 0.14; rect(hx, hy, hw, hh, dark ? "#06080e" : mix(roofC, "#000000", 0.35)); if (!dark) rect(hx + hw * 0.3, hy + hh - Math.max(1, kr), hw * 0.4, Math.max(1, kr), "#ffd9a0"); }
    if (b.ac) { rect(lerp(rx0, rx1, 0.58), lerp(ry0, ry1, 0.26), rw * 0.2, rh * 0.15, dark ? "#0a0c14" : "#2a3250"); rect(lerp(rx0, rx1, 0.62), lerp(ry0, ry1, 0.29), rw * 0.05, rh * 0.09, dark ? "#06080e" : "#141a2c"); }
    if (b.tank) { circle(lerp(rx0, rx1, 0.28), lerp(ry0, ry1, 0.68), Math.min(rw, rh) * 0.11, dark ? "#0a0c14" : "#2c2638"); circle(lerp(rx0, rx1, 0.28), lerp(ry0, ry1, 0.68), Math.min(rw, rh) * 0.06, dark ? "#06080e" : "#1a1624"); }
    if (b.pad && !dark) { const cx = lerp(rx0, rx1, 0.5), cy = lerp(ry0, ry1, 0.5), r = Math.min(rw, rh) * 0.3; ctx.strokeStyle = "rgba(242,212,122,0.4)"; ctx.lineWidth = Math.max(1, kr); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); rect(cx - r * 0.4, cy - r * 0.5, r * 0.15, r, "rgba(242,212,122,0.45)"); rect(cx + r * 0.25, cy - r * 0.5, r * 0.15, r, "rgba(242,212,122,0.45)"); rect(cx - r * 0.3, cy - r * 0.07, r * 0.6, r * 0.14, "rgba(242,212,122,0.45)"); if (Math.sin(F.t * 3 + b.win) > 0.6) glow(rx0 + 3, ry0 + 3, 8, "#ff3040", 0.8); }
    if (b === homeB()) glow(lerp(rx0, rx1, 0.5), ry1, 34 * kr, "#ffd9a0", 0.6);    // her building: one warm window
    roofMarks(b, rx0, ry0, rx1, ry1);
  }
  // The roofs within a leap, outlined faintly in gold; one tapped that is too far, in red.
  function roofMarks(b, rx0, ry0, rx1, ry1) {
    if (F.far && F.far.b === b && F.t - F.far.t < 0.7) { ctx.strokeStyle = hexA("#ff5a3a", 1 - (F.t - F.far.t) / 0.7); ctx.lineWidth = 2.5; ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0); }
    if (P.jump || F.arrive || !reachable(b)) return;
    ctx.strokeStyle = hexA(C.holy, 0.45 + 0.18 * Math.sin(F.t * 3 + b.x0 * 0.01)); ctx.lineWidth = 2; ctx.strokeRect(rx0 + 2, ry0 + 2, rx1 - rx0 - 4, ry1 - ry0 - 4);
  }
  let homeCache;
  function homeB() { if (homeCache === undefined) { const B = built.blocks.find((x) => x.kind === "home"); homeCache = B ? B.home : null; } return homeCache; }
  // The church: a cross of roofs, gold in every window, and its column of light.
  let churchB = null;
  function drawChurch() {
    const B = churchB || (churchB = built.blocks.find((x) => x.kind === "church")), h = 66, k = K(h), cx = sx(CHURCH.x, h), cy = sy(CHURCH.y, h);
    for (const bb of B.b) {
      const q = [];
      const gx0 = sx(bb.x0, 0), gx1 = sx(bb.x1, 0), gy0 = sy(bb.y0, 0), gy1 = sy(bb.y1, 0), rx0 = sx(bb.x0, bb.h), rx1 = sx(bb.x1, bb.h), ry0 = sy(bb.y0, bb.h), ry1 = sy(bb.y1, bb.h);
      if (cam.y > bb.y1) q.push([gx0, gy1, gx1, gy1, rx1, ry1, rx0, ry1]);
      if (cam.y < bb.y0) q.push([gx0, gy0, gx1, gy0, rx1, ry0, rx0, ry0]);
      if (cam.x > bb.x1) q.push([gx1, gy0, gx1, gy1, rx1, ry1, rx1, ry0]);
      if (cam.x < bb.x0) q.push([gx0, gy0, gx0, gy1, rx0, ry1, rx0, ry0]);
      for (const w of q) {
        poly(w, "#2a2018");
        for (let i = 1; i < 6; i++) { const u = i / 6, ax = lerp(w[0], w[2], u), ay = lerp(w[1], w[3], u), bx = lerp(w[6], w[4], u), by = lerp(w[7], w[5], u); line(lerp(ax, bx, 0.25), lerp(ay, by, 0.25), lerp(ax, bx, 0.75), lerp(ay, by, 0.75), "#ffd27a", Math.max(1.5, 2.2 * k)); }
      }
      rect(rx0, ry0, rx1 - rx0, ry1 - ry0, "#3a2c20"); ctx.strokeStyle = "#7a5a30"; ctx.lineWidth = 1; ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
      F.hits.push({ b: bb, rx0, ry0, rx1, ry1, bx0: Math.min(gx0, rx0), by0: Math.min(gy0, ry0), bx1: Math.max(gx1, rx1), by1: Math.max(gy1, ry1) });
      roofMarks(bb, rx0, ry0, rx1, ry1);
    }
    // The cross on the roof, and the light.
    const kk = K(h + 8), cx2 = sx(CHURCH.x + 22, h + 8), cy2 = sy(CHURCH.y, h + 8);
    rect(cx2 - 1.8 * kk, cy2 - 11 * kk, 3.6 * kk, 22 * kk, "#ffe6a0"); rect(cx2 - 7 * kk, cy2 - 5 * kk, 14 * kk, 3.6 * kk, "#ffe6a0");
    glow(cx, cy, 130 * k, C.holy, 0.45 + 0.1 * Math.sin(F.t * 2));
    // The updraft: motes of light rising toward you.
    const r = seeded(77);
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, rr = r() * 80, u = (r() + F.t * (0.25 + r() * 0.2)) % 1, z = h + u * (cam.z - h) * 0.85;
      glow(sx(CHURCH.x + Math.cos(a) * rr, z), sy(CHURCH.y + Math.sin(a) * rr, z), 3 + 5 * u, "#fff3cf", 0.5 * (1 - u));
    }
  }
  // His car, stopped in the dark street, and the corner store's sign across from it.
  function drawCar() {
    const k = K(0), x = sx(CAR.x, 0), y = sy(CAR.y, 0);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    rect(-13, -6, 26, 12, "#141828"); rect(-5, -5, 9, 10, "#0a0c16"); rect(5, -5, 3, 10, "#1e2a40");
    ctx.restore();
    glow(sx(CAR.x + 40, 24), sy(CAR.y - 46, 24), 40 * K(24), C.red, 0.6 + 0.3 * Math.sin(F.t * 13) * Math.sin(F.t * 3));
  }
  function drawCarEyes() {
    const k = K(6);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + F.t * 0.2; glow(sx(CAR.x + Math.cos(a) * 34, 6), sy(CAR.y + Math.sin(a) * 30, 6), 7 * k, C.ember, 0.55 + 0.3 * Math.sin(F.t * 3 + i)); }
  }
  // The gold thread of the child's prayer: from her window up toward you.
  function drawThread() {
    const top = Math.max(120, Math.min(cam.z - 60, P.alt * 0.9 + 60)), n = 28, base = 84;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [wd, a] of [[5, 0.18], [1.6, 0.85]]) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n, z = base + (top - base) * u, wob = Math.sin(u * 9 - F.t * 2.5) * 8 * u;
        const x = sx(HOME.x + wob, z), y = sy(HOME.y + wob * 0.5, z);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = hexA(C.holy, a); ctx.lineWidth = wd; ctx.stroke();
    }
    ctx.restore();
    glow(sx(HOME.x, base), sy(HOME.y, base), 26 * K(base), "#ffd9a0", 0.8);
  }
  // The smoke over the car: dark puffs rising, with embers.
  function drawSmoke() {
    const r = seeded(99), top = Math.min(cam.z - 60, Math.max(160, P.alt * 0.85));
    for (let i = 0; i < 22; i++) {
      const u = (r() + F.t * (0.08 + r() * 0.06)) % 1, z = u * top, a = r() * TAU, rr = 10 + u * 50;
      const x = sx(CAR.x + Math.cos(a) * rr, z), y = sy(CAR.y + Math.sin(a) * rr, z), s = (14 + 30 * u) * K(z);
      ctx.globalAlpha = 0.65 * (1 - u * 0.8); circle(x, y, s * 1.2, "#030104"); ctx.globalAlpha = 1;
      if (i % 3 === 0) glow(x, y, 6 * K(z), C.ember, 0.7 * (1 - u));
    }
  }
  function drawShadow() {
    // The shadow falls a little to the south-east, on the roof or the street below the angel.
    const hz = groundAt(P.x + (P.alt) * 0.12, P.y + (P.alt) * 0.16), gx = P.x + (P.alt - hz) * 0.12, gy = P.y + (P.alt - hz) * 0.16;
    const k = K(hz), x = sx(gx, hz), y = sy(gy, hz), op = P.mode === "stand" ? 0.7 : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(P.head); ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 0, 15 * k * 0.5, 5 * k * 0.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2 * k * 0.5, 0, 7 * k * 0.5, 30 * k * op * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // The angel from above, wings out, and Fr. Lawrence on its back holding his hat on.
  // `o`: where and how, when it is not carrying him (in a fight on the roofs, it hovers over him).
  function drawAngel(o) {
    o = o || { x: P.x, y: P.y, alt: P.alt, head: P.head, mode: P.mode, wing: P.wing, rider: true };
    // Scaled with height, but not so far that it is lost among the towers.
    const k = clamp(0.42 + K(o.alt) * 0.34, 0.6, 1.1), x = sx(o.x, o.alt), y = sy(o.y, o.alt);
    glow(x, y, 70 * k, C.holy, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.head); ctx.scale(k, k);
    // Standing, the wings folded; climbing, beating fast; coming down, spread wide in a glide.
    const beat = o.mode === "flap" ? Math.sin(o.wing) : o.mode === "stand" ? 0.2 * Math.sin(o.wing) : 0;
    const span = o.mode === "stand" ? 0.46 + 0.04 * beat : o.mode === "glide" ? 1.04 : 0.78 + 0.26 * beat, sweep = o.mode === "glide" ? 3 : o.mode === "stand" ? -12 : -5 * beat;
    if (F.landT && o.rider) ctx.scale(1 + F.landT * 0.2, 1 + F.landT * 0.2);
    for (const d of [-1, 1]) {
      // A wing: the leading edge out from the shoulder, and a scalloped trailing edge of
      // long feathers, swept back when diving.
      ctx.save(); ctx.scale(1, d);
      const L = 40 * span + 4, tp = [sweep - 6, L], wrist = [4 + sweep * 0.3, L * 0.55];
      ctx.beginPath(); ctx.moveTo(6, 3);
      ctx.quadraticCurveTo(8, L * 0.3, wrist[0], wrist[1]); ctx.quadraticCurveTo(wrist[0] - 2, L * 0.85, tp[0], tp[1]);
      const N = 6;
      for (let f = 1; f <= N; f++) {
        const u = f / N, px = lerp(tp[0], -8, u) - 8 * Math.sin(u * PI), py = lerp(tp[1], 4, u), qx = lerp(tp[0], -8, u - 0.5 / N) - 8 * Math.sin((u - 0.5 / N) * PI) - 7, qy = lerp(tp[1], 4, u - 0.5 / N);
        ctx.quadraticCurveTo(qx, qy, px, py);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, L); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#e2dac4");
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,170,90,0.75)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.globalAlpha = 0.35; for (let f = 1; f < N; f++) { const u = f / N; line(lerp(wrist[0], 2, u) - 2, lerp(wrist[1], 6, u), lerp(tp[0], -8, u) - 8 * Math.sin(u * PI) - 4, lerp(tp[1], 4, u), "#b8a878", 0.6); } ctx.globalAlpha = 1;
      ctx.restore();
    }
    // The angel's body, robed, and its head of light.
    ctx.fillStyle = "#e4e9f6"; ctx.beginPath(); ctx.ellipse(-3, 0, 16, 6.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#aab6d4"; ctx.beginPath(); ctx.ellipse(-13, 0, 7, 4.2, 0, 0, TAU); ctx.fill();
    glow(14, 0, 16, "#fff6dc", 0.95); circle(13, 0, 4.4, "#fff6dc");
    if (!o.rider) { ctx.restore(); return; }
    // Fr. Lawrence: his coat flapping behind, his hat a black disc, a hand on the brim.
    const fl = Math.sin(F.t * 18) * 2;
    poly([3, -5, -15 + fl, -7, -21 + fl, 0, -15 - fl, 7, 3, 5], "#15131d");
    circle(2, 0, 6.4, "#121019"); ctx.strokeStyle = "#2c2836"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(2, 0, 4, 0, TAU); ctx.stroke();
    circle(5, -5.5, 1.9, "#8a6250");
    rect(6, -0.9, 2, 1.8, "#f6f8ff");
    ctx.restore();
  }
  // Rain, falling away from you: streaks that run in toward the middle of the screen.
  function drawRain() {
    ctx.strokeStyle = "rgba(196,240,255,0.28)"; ctx.lineWidth = 1; ctx.beginPath();
    const dt = 1 / 60;
    for (const d of F.rain) {
      const f = 1 - dt * 1.6 * d.k; d.x *= f; d.y *= f;
      if (Math.hypot(d.x, d.y) < 30) Object.assign(d, rainDrop(false));
      const x = W / 2 + d.x, y = H / 2 + d.y; ctx.moveTo(x, y); ctx.lineTo(x + d.x * 0.07, y + d.y * 0.07);
    }
    ctx.stroke();
  }
  function drawHUD() {
    // Where to go.
    const T = target(), tx = sx(T.x, T.z), ty = sy(T.y, T.z);
    if (tx < 20 || tx > W - 20 || ty < 20 || ty > H - 20) {
      const a = Math.atan2(ty - H / 2, tx - W / 2), ex = clamp(W / 2 + Math.cos(a) * W, 26, W - 40), ey = clamp(H / 2 + Math.sin(a) * W, 40, H - 26);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); poly([10, 0, -6, -7, -3, 0, -6, 7], T.c); ctx.restore(); glow(ex, ey, 16, T.c, 0.4);
    } else { ctx.strokeStyle = hexA(T.c, 0.5 + 0.3 * Math.sin(F.t * 4)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx, ty, 18 + 4 * Math.sin(F.t * 4), 0, TAU); ctx.stroke(); }
    // His car, when they are near enough to dive to it.
    if (F.step >= 5 && !P.jump && !F.arrive) { const cx = sx(CAR.x, 0), cy = sy(CAR.y, 0), pul = Math.sin(F.t * 6); ctx.strokeStyle = hexA(C.holy, 0.6 + 0.3 * pul); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 26 + 4 * pul, 0, TAU); ctx.stroke(); text(tip("TAP HIS CAR", "SPACE: DIVE"), cx, cy - 34, { align: "center", size: 9, weight: 800, spacing: 2, color: C.holy }); }
    // The angel's words.
    if (F.msg && F.msg.t < 9) {
      const a = clamp(F.msg.t / 0.4, 0, 1) * clamp((9 - F.msg.t) / 0.8, 0, 1);
      const ls = wrap(F.msg.text, Math.min(W - 160, 520), "italic 500 17px " + FONT.line);
      ctx.globalAlpha = 0.55 * a; rect(W / 2 - Math.min(W - 140, 540) / 2, 8, Math.min(W - 140, 540), 14 + ls.length * 20, "#050407"); ctx.globalAlpha = 1;
      ls.forEach((l, i) => text(l, W / 2, 26 + i * 20, { align: "center", size: 17, weight: 500, italic: true, font: FONT.line, color: "#f6eccb", alpha: a }));
    }
    // How to play, while it is being learned.
    if (F.step < 3) text(tip("TAP A GOLD ROOF NEAR YOU: THE ANGEL LEAPS TO IT", "ARROWS: LEAP THAT WAY  ·  SPACE: LEAP TOWARD WHERE WE ARE GOING  ·  OR CLICK A GOLD ROOF"), W / 2, H - 16, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.55)", max: W - 60 });
    pauseButton();
  }

  // ---- Touch and keys: tap a roof near you, and the angel leaps to it --------------------------------
  function down(p, ev) { if (fighting()) { RF.down(p, ev); return; } F.touch = { id: ev.pointerId, x: p.x, y: p.y, moved: false }; }
  function move(p, ev) { if (fighting()) { RF.move(p, ev); return; } const T = F.touch; if (T && T.id === ev.pointerId && dist(p.x, p.y, T.x, T.y) > 14) T.moved = true; }
  function up(p, ev) {
    if (fighting()) { RF.up(p, ev); return; }
    const T = F.touch; F.touch = null;
    if (!T || T.id !== ev.pointerId || T.moved || P.jump || F.arrive) return;
    // His car, at the end: down to the street.
    if (F.step >= 5 && nearCar() && dist(p.x, p.y, sx(CAR.x, 0), sy(CAR.y, 0)) < 60) { leap(null, true); return; }
    tryLeap(roofAt(p));
  }
  function key(code, isDown, e) {
    if (fighting()) { RF.key(code, isDown, e); return; }
    F.keys[code] = isDown;
    if (!isDown || (e && e.repeat)) return;
    if (code === "Escape") { Game.pause(); return; }
    if (P.jump || F.arrive) return;
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
    if (dirs[code]) { const [dx, dy] = dirs[code], k = F.keys; const ddx = dx || ((k.ArrowLeft || k.KeyA) ? -1 : (k.ArrowRight || k.KeyD) ? 1 : 0), ddy = dy || ((k.ArrowUp || k.KeyW) ? -1 : (k.ArrowDown || k.KeyS) ? 1 : 0); const b = roofToward(ddx, ddy); if (b) leap(b); else { Sound.fx.tick(600, 0.8); } return; }
    if (code === "Space" || code === "Enter") {
      if (F.step >= 5 && nearCar()) { leap(null, true); return; }
      const b = roofToward(0, 0); if (b) leap(b); else Sound.fx.tick(600, 0.8);
    }
  }
  // For trying a fight at once, wherever the angel stands: Flight.fight(0).
  function fight(i) { if (!P.jump && P.on && !fighting()) startFight(FIGHTS[i || 0]); }
  return { start, step, draw, down, move, up, key, fight, get F() { return F; }, get P() { return P; }, get cam() { return cam; }, get RF() { return RF; }, CHURCH, HOME, CAR };
})();
