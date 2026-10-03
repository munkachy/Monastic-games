"use strict";
// Fear Not: the flight. The city seen from straight above, as in the first Grand Theft Auto:
// tall buildings leaning away from the middle of the screen, their walls and windows and neon
// showing as you pass, and the camera drawing back as the angel gathers speed and coming in close
// when it slows. Fr. Lawrence rides his angel over the roofs, or down into the streets between the
// buildings, over the traffic and the people under their umbrellas. Dive to drop and gain speed;
// beat the wings (strongest on the beat) to climb. Mind the walls down there.

const Flight = (() => {
  const BLOCK = 200, STREET = 56, NX = 20, NY = 14, LANE = 12, WALK = 5;
  const FOCAL = 430, LOW = 14, CEIL = 600;
  const START = { x: 320, y: 300 }, CHURCH = { x: 9.5 * BLOCK, y: 5.5 * BLOCK }, HOME = { x: 3.5 * BLOCK, y: 11.5 * BLOCK };
  const CARLINE = 10, CAR = { x: 16.5 * BLOCK, y: CARLINE * BLOCK + LANE + 6 };
  const BOUND = { x0: 100, y0: 100, x1: NX * BLOCK - 100, y1: NY * BLOCK - 100 };
  const SIGNS = [C.pink, C.cyan, C.red, C.teal, C.pink, C.cyan, C.lav];
  const CARCOL = ["#1c2236", "#2a1a22", "#14262a", "#262630", "#301c14", "#1a1a1e", "#3a3a44", "#22304a"];
  const ROOFS = ["#161d33", "#1b2238", "#1a1c2c", "#20283e", "#262234", "#151a28", "#1d2630", "#22243a"];
  const UMB = ["#2a2a34", "#2a2a34", "#4a2430", "#24384e", "#6a1c26", "#34405e", "#a01e30", "#a08a30", "#24504a", "#5a3a6a"];
  let F = null, P = null, built = null, cars = null, people = null;
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
          let h = 40 + Math.pow(r(), 1.3) * (90 + 260 * up);
          if (r() < 0.14 && up > 0.3) h += 100 + r() * 120;
          h = clamp(h * (1 - 0.55 * old), 28, 440);
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
  // A building the angel would fly into at (x, y) and height z.
  function solidAt(x, y, z) {
    const B = blockAt(x, y); if (!B) return null;
    for (const b of B.b) if (x > b.x0 - 5 && x < b.x1 + 5 && y > b.y0 - 5 && y < b.y1 + 5 && z < b.h + 6) return b;
    return null;
  }
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
  function start(done) {
    if (!built) { built = build(); makeLife(); }
    for (const L of built.lights) { L.lit = L.base; L.show = L.lit; L.dying = 0; }
    P = { x: START.x, y: START.y, alt: 430, vz: 0, speed: 150, head: 0.55, breath: 5, light: 100, wing: 0, flap: 0, diving: false, diveT: 0, turned: 0, bump: 0, lowT: 0 };
    F = { done, t: 0, step: 0, stepT: 0, lastStep: 0, msg: null, msgs: [], stick: null, wingTouch: null, keys: {}, arrive: 0, rescue: 0, fade: 1, dark: 300, onBeatT: -9, rain: [], warned: false, flaps: 0, bumps: 0 };
    cam = { x: P.x, y: P.y, z: P.alt + 300, lx: 0, ly: 0 };
    for (let i = 0; i < 120; i++) F.rain.push(rainDrop(true));
    say(tip("Hold on to me, Father. Drag on the left side to steer.", "Hold on to me, Father. Steer with the arrow keys."));
    Sound.play(SONGS.noir); Sound.setLevel(0); Sound.ambience({ wind: 0.35, windF: 500, rain: 0 });
    mode = Flight;
  }
  function say(t, who) { F.msg = { text: t, t: 0, who: who || "angel" }; if ((who || "angel") === "angel") Sound.fx.chord(F.msgs.length); F.msgs.push(t); }

  // ---- The rules of flight -------------------------------------------------------------------------
  function onBeat() {
    const b = Sound.beat();
    if (b) return b.phase < 0.17 || b.phase > 0.86;
    const ph = (performance.now() / 625) % 1; return ph < 0.17 || ph > 0.86;
  }
  function flap() {
    if (F.arrive) return;
    if (P.breath < 1) { F.noBreath = 0.6; return; }
    const beat = onBeat();
    P.breath -= beat ? 0.5 : 1;
    P.vz += beat ? 170 : 110; P.speed += beat ? 60 : 16; P.flap = 1; F.flaps++;
    if (beat) { F.onBeatT = F.t; Sound.fx.whoosh(0.35, 0.6, true); }
    Sound.fx.flap(beat ? 1.2 : 0.8);
  }
  function startDive() { P.diving = true; P.diveT = 0; }
  function endDive() {
    if (!P.diving) return;
    P.diving = false;
    // Coming out of a dive, the speed turns into lift.
    if (P.diveT > 0.25) { P.vz += Math.max(0, P.speed - 150) * 0.8; P.speed = lerp(P.speed, 190, 0.3); Sound.fx.whoosh(0.4, 0.5, true); }
  }
  function rescue() { F.rescue = 0.001; P.diving = false; }
  // A wall met down among the buildings: a scrape of feathers, a jolt, some light lost.
  function bump(hard) {
    if (P.bump > 0) return false;
    P.bump = 0.35; F.bumps++;
    P.speed *= hard ? 0.55 : 0.85; P.light = Math.max(0, P.light - (hard ? 4 : 1.5));
    Sound.fx.hit(hard ? 0.7 : 0.35); if (hard) Sound.fx.gasp();
    F.feathers = F.feathers || [];
    for (let i = 0; i < (hard ? 6 : 2); i++) F.feathers.push({ x: P.x, y: P.y, z: P.alt, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, t: 0, r: Math.random() * TAU });
    if (hard && !F.toldWalls && F.step >= 2) { F.toldWalls = true; say("Gently, Father! Steer along the streets."); }
    return true;
  }
  function step(dt) { stepFlight(dt); moveCam(dt); }
  function stepFlight(dt) {
    F.t += dt; if (F.msg) F.msg.t += dt;
    if (F.noBreath) F.noBreath = Math.max(0, F.noBreath - dt);
    F.fade = Math.max(0, F.fade - dt * 1.2);
    stepCars(dt); stepPeople(dt);
    if (F.feathers) { for (const f of F.feathers) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z -= 30 * dt; f.r += dt * 3; } F.feathers = F.feathers.filter((f) => f.t < 1.6); }
    // The darkness closes round the car, and the lights in it go out one by one.
    F.dark = Math.min(1150, 300 + F.t * 4.2);
    for (const L of built.lights) {
      if (L.holy || L.lit <= 0) { L.show = L.lit; continue; }
      if (dist(L.x, L.y, CAR.x, CAR.y) < F.dark && !L.dying) L.dying = 0.001;
      if (L.dying) { L.dying += dt; L.show = Math.sin(L.dying * 40) > 0 ? 0.3 : 1; if (L.dying > 0.9) { L.lit = 0; L.show = 0; } }
      else L.show = L.lit;
    }
    if (F.rescue) {
      F.rescue += dt;
      if (F.rescue > 1.0 && F.rescue < 1.2) { P.x = CHURCH.x - 140; P.y = CHURCH.y - 120; P.alt = 330; P.vz = 0; P.speed = 140; P.light = 100; P.breath = 5; P.head = 0; say("I have you. Rest a moment in the church's light, then on."); F.rescue = 1.2; }
      if (F.rescue > 2.2) F.rescue = 0;
      return;
    }
    if (F.arrive) {
      F.arrive += dt; P.alt = lerp(P.alt, LOW, dt * 2.2); P.x = lerp(P.x, CAR.x - 30, dt * 2); P.y = lerp(P.y, CAR.y - 20, dt * 2); P.speed = lerp(P.speed, 40, dt * 2);
      Sound.ambience({ wind: 0.9, windF: 1400 });
      if (F.arrive > 1.6 && !F.left) { F.left = true; Sound.ambience({ wind: 0 }); F.done(); }
      return;
    }
    // Steering: tighter when slow, as among the buildings.
    const rate = 3.0 - P.speed / 330;
    const S = F.stick;
    if (S && S.mag > 0.15) { const d = angDiff(P.head, Math.atan2(S.dy, S.dx)), turn = rate * Math.min(1, S.mag) * dt, tt = clamp(d, -turn, turn); P.head += tt; P.turned += Math.abs(tt); }
    const k = F.keys;
    const kx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), ky = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
    if (kx || ky) { const d = angDiff(P.head, Math.atan2(ky, kx)), turn = rate * dt, tt = clamp(d, -turn, turn); P.head += tt; P.turned += Math.abs(tt); }
    // Out of bounds: the angel turns back of its own accord.
    if (P.x < BOUND.x0 || P.x > BOUND.x1 || P.y < BOUND.y0 || P.y > BOUND.y1) {
      const want = Math.atan2((BOUND.y0 + BOUND.y1) / 2 - P.y, (BOUND.x0 + BOUND.x1) / 2 - P.x);
      P.head += clamp(angDiff(P.head, want), -1.8 * dt, 1.8 * dt);
      if (!F.warned) { F.warned = true; say("Not that way. Her prayer is behind us."); }
    }
    // Wings. Near the street the angel glides slower, as if walking the city.
    if (F.wingTouch && !F.wingTouch.dove && F.t - F.wingTouch.t0 > 0.2) { F.wingTouch.dove = true; startDive(); }
    const cruise = lerp(100, 160, clamp(P.alt / 380, 0, 1));
    if (P.diving) { P.diveT += dt; P.vz = lerp(P.vz, -260, dt * 3); P.speed = Math.min(480, P.speed + 120 * dt); }
    else { P.vz -= 26 * dt; P.vz *= 1 - 1.15 * dt; P.speed += (cruise - P.speed) * 0.55 * dt; }
    P.breath = Math.min(5, P.breath + 0.9 * dt);
    P.flap = Math.max(0, P.flap - dt * 2.2); P.wing += dt * (P.diving ? 2 : 3 + P.flap * 14);
    P.bump = Math.max(0, P.bump - dt);
    // Moving, and the walls: slide along one met side on; stop and lose speed against one met head on.
    const vx = Math.cos(P.head) * P.speed * dt, vy = Math.sin(P.head) * P.speed * dt;
    if (!solidAt(P.x + vx, P.y + vy, P.alt)) { P.x += vx; P.y += vy; }
    else if (!solidAt(P.x + vx, P.y, P.alt) && Math.abs(vx) > Math.abs(vy) * 0.3) { P.x += vx; P.head += clamp(angDiff(P.head, vx > 0 ? 0 : PI), -4 * dt, 4 * dt); bump(false); }
    else if (!solidAt(P.x, P.y + vy, P.alt) && Math.abs(vy) > Math.abs(vx) * 0.3) { P.y += vy; P.head += clamp(angDiff(P.head, vy > 0 ? PI / 2 : -PI / 2), -4 * dt, 4 * dt); bump(false); }
    else if (bump(true)) {
      // Head on: bounce off the wall.
      let cx = Math.cos(P.head), cy = Math.sin(P.head);
      if (solidAt(P.x + vx, P.y, P.alt)) cx = -cx;
      if (solidAt(P.x, P.y + vy, P.alt)) cy = -cy;
      P.head = Math.atan2(cy, cx);
    }
    // The church lifts you on its column of light, and fills you again.
    const dc = dist(P.x, P.y, CHURCH.x, CHURCH.y);
    if (dc < 190 && P.alt > 60) { P.vz += 260 * dt * (1 - dc / 190); P.light = Math.min(100, P.light + 45 * dt); }
    P.alt += P.vz * dt;
    const floor = Math.max(LOW, groundAt(P.x, P.y) + 10);
    if (P.alt < floor) { P.alt = floor; P.vz = Math.max(0, P.vz); }
    if (P.alt > CEIL) { P.alt = CEIL; P.vz = Math.min(0, P.vz); }
    if (P.alt < 70) P.lowT += dt;
    // The light: the dark round the car drains it; the lights in the streets and the church fill it.
    const inDark = dist(P.x, P.y, CAR.x, CAR.y) < F.dark;
    P.light += (inDark ? -(6 + (P.alt < 90 ? 5 : 0)) : 1) * dt;
    for (const L of built.lights) if (L.show > 0.5 && Math.abs(L.x - P.x) < 150 && Math.abs(L.y - P.y) < 150 && Math.hypot(L.x - P.x, L.y - P.y, (L.z - P.alt) * 0.5) < 150) { P.light += 10 * dt; break; }
    P.light = clamp(P.light, 0, 100);
    if (P.light <= 0) rescue();
    // Down low, the wind of the wings stirs the umbrellas.
    if (P.alt < 50) for (const p of people) { if (p.gust > 0) continue; const [x, y] = personXY(p); if (Math.abs(x - P.x) < 34 && Math.abs(y - P.y) < 34) p.gust = 1; }
    // The music and the wind follow the flight.
    Sound.setLevel(P.diving || P.speed > 260 ? 2 : F.step >= 1 ? 1 : 0);
    Sound.ambience({ wind: 0.25 + clamp((P.speed - 140) / 300, 0, 0.7), windF: 380 + P.speed * 2.2 });
    lessons();
  }
  // ---- The lessons of the first flight, one after another ------------------------------------------
  function lessons() {
    const s = F.step, since = F.t - F.stepT;
    if (s === 0 && P.turned > 1.5) { F.step = 1; say(tip("Now fold my wings: hold on the right side to dive. Down into the streets.", "Now fold my wings: hold Shift to dive. Down into the streets.")); }
    else if (s === 1 && P.alt < 70) { F.step = 2; say(tip("Down here we are among them. Mind the walls. Tap on the right to beat my wings and climb; on the beat is strongest.", "Down here we are among them. Mind the walls. Press Space to beat my wings and climb; on the beat is strongest.")); }
    else if (s === 2 && ((P.alt > 280 && F.flaps >= 2) || since > 30)) { F.step = 3; say("There: the church. Fly over it, and its light will fill us again."); }
    else if (s === 3 && dist(P.x, P.y, CHURCH.x, CHURCH.y) < 200) { F.step = 4; say("Now the gold thread, to the south. That is her prayer, rising. Follow it."); Sound.fx.glory(); }
    else if (s === 4 && dist(P.x, P.y, HOME.x, HOME.y) < 190) { F.step = 5; say("Her window. She has prayed all night. Now the smoke, to the east: her father. Hurry. The dark is closing round him."); }
    else if (s === 5 && dist(P.x, P.y, CAR.x, CAR.y) < 520) { F.step = 6; say(tip("Down! Hold on the right, and dive to the street, to his car.", "Down! Hold Shift, and dive to the street, to his car.")); }
    if (F.step >= 5 && dist(P.x, P.y, CAR.x, CAR.y) < 170 && P.alt < 80) { F.arrive = 0.001; Sound.fx.whoosh(1.2, 1, false); Sound.fx.heart(1); }
    if (F.step !== F.lastStep) { F.lastStep = F.step; F.stepT = F.t; }
  }
  function target() {
    if (F.step <= 3) return { x: CHURCH.x, y: CHURCH.y, c: C.holy, z: 66 };
    if (F.step === 4) return { x: HOME.x, y: HOME.y, c: C.holy, z: 84 };
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
    const sp = clamp((P.speed - 90) / 380, 0, 1), back = lerp(210, 620, sp);
    let tall = 0;
    const i0 = Math.floor((P.x - 650) / BLOCK), i1 = Math.floor((P.x + 650) / BLOCK), j0 = Math.floor((P.y - 450) / BLOCK), j1 = Math.floor((P.y + 450) / BLOCK);
    for (let j = Math.max(0, j0); j <= Math.min(NY - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) for (const b of built.blocks[j * NX + i].b) tall = Math.max(tall, b.h);
    const want = Math.max(P.alt + back, tall + 140);
    cam.z += (want - cam.z) * Math.min(1, dt * (want > cam.z ? 3 : 1.6));
    // A little way ahead of the angel, the way it is going.
    const lead = 20 + P.speed * 0.14;
    cam.lx += (Math.cos(P.head) * lead - cam.lx) * Math.min(1, dt * 2); cam.ly += (Math.sin(P.head) * lead - cam.ly) * Math.min(1, dt * 2);
    cam.x = P.x + cam.lx; cam.y = P.y + cam.ly;
  }

  // ---- Drawing -------------------------------------------------------------------------------------
  function rainDrop(any) { const a = Math.random() * TAU, r = any ? Math.random() * W * 0.7 : W * (0.45 + Math.random() * 0.35); return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, k: 0.6 + Math.random() * 0.8 }; }
  function draw() {
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
    drawShadow();
    drawFeathers();
    drawAngel();
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
    drawClouds();
    drawRain();
    drawHUD();
    if (F.rescue) rect(0, 0, W, H, "rgba(0,0,0," + clamp(F.rescue < 1.2 ? F.rescue : 2.2 - F.rescue, 0, 1) + ")");
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
    const kr = K(b.h);
    const gx0 = sx(b.x0, 0), gx1 = sx(b.x1, 0), gy0 = sy(b.y0, 0), gy1 = sy(b.y1, 0);
    const rx0 = sx(b.x0, b.h), rx1 = sx(b.x1, b.h), ry0 = sy(b.y0, b.h), ry1 = sy(b.y1, b.h);
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
      if (!dark && span > 6 && span / Math.max(1, Math.floor(b.h / 14)) > 1.5) {
        const floors = Math.max(1, Math.floor(b.h / 14)), len = side % 2 ? b.y1 - b.y0 : b.x1 - b.x0, cols = Math.max(3, Math.min(9, Math.floor(len / 14))), sz = clamp(span / floors * 0.45, 1, 3.2);
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
        const v = b.sign.z / b.h, u0 = 0.25, u1 = 0.75, dv = Math.min(0.1, 12 / b.h);
        const p = (u, vv) => [lerp(lerp(q[0], q[2], u), lerp(q[6], q[4], u), vv), lerp(lerp(q[1], q[3], u), lerp(q[7], q[5], u), vv)];
        const a = p(u0, v - dv), bb = p(u1, v - dv), c2 = p(u1, v + dv), d = p(u0, v + dv);
        const L = b.light || (b.light = built.lights.find((l) => l.b === b));
        const on = L ? L.show : 0;
        poly([a[0], a[1], bb[0], bb[1], c2[0], c2[1], d[0], d[1]], on > 0 ? mix(b.sign.c, "#ffffff", 0.3) : "#1a1a26");
      }
    }
    winFlush(0.6);
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
    const k = K(hz), x = sx(gx, hz), y = sy(gy, hz), op = P.diving ? 0.35 : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(P.head); ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 0, 15 * k * 0.5, 5 * k * 0.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2 * k * 0.5, 0, 7 * k * 0.5, 30 * k * op * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawFeathers() {
    if (!F.feathers) return;
    for (const f of F.feathers) { const k = K(f.z); ctx.save(); ctx.translate(sx(f.x, f.z), sy(f.y, f.z)); ctx.rotate(f.r); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6); ctx.fillStyle = "#f6f0e0"; ctx.beginPath(); ctx.ellipse(0, 0, 4 * k, 1.4 * k, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  // The angel from above, wings out, and Fr. Lawrence on its back holding his hat on.
  function drawAngel() {
    // Scaled with height, but not so far that it is lost among the towers.
    const k = clamp(0.3 + K(P.alt) * 0.34, 0.45, 1.05), x = sx(P.x, P.alt), y = sy(P.y, P.alt);
    glow(x, y, 70 * k, C.holy, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(P.head); ctx.scale(k, k);
    if (P.bump > 0) ctx.rotate(Math.sin(P.bump * 40) * 0.15);
    const beat = Math.sin(P.wing * 2.4), span = P.diving ? 0.38 : 0.84 + 0.16 * beat, sweep = P.diving ? -16 : -3 * beat;
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
    // Fr. Lawrence: his coat flapping behind, his hat a black disc, a hand on the brim.
    const fl = Math.sin(F.t * 18) * 2;
    poly([3, -5, -15 + fl, -7, -21 + fl, 0, -15 - fl, 7, 3, 5], "#15131d");
    circle(2, 0, 6.4, "#121019"); ctx.strokeStyle = "#2c2836"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(2, 0, 4, 0, TAU); ctx.stroke();
    circle(5, -5.5, 1.9, "#8a6250");
    rect(6, -0.9, 2, 1.8, "#f6f8ff");
    ctx.restore();
  }
  function drawClouds() {
    const r = seeded(66);
    for (let i = 0; i < 18; i++) {
      const wx = (r() * 4600 + F.t * 9) % 4600 - 300, wy = r() * 3400 - 300, z = 470 + r() * 90;
      if (z >= cam.z - 40) continue;
      const kz = K(z), x = sx(wx, z), y = sy(wy, z);
      if (x < -500 || x > W + 500 || y < -500 || y > H + 500) continue;
      ctx.globalAlpha = 0.18; ctx.fillStyle = "#56607e"; ctx.beginPath(); ctx.ellipse(x, y, 160 * kz, 70 * kz, 0.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
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
    // The light.
    const lx = 16, ly = 16, lw = 130, low = P.light < 25;
    rect(lx, ly, lw, 6, "rgba(255,255,255,0.08)");
    rect(lx, ly, lw * P.light / 100, 6, low && Math.sin(F.t * 10) > 0 ? "#ff6a50" : C.holy);
    glow(lx + lw * P.light / 100, ly + 3, 14, C.holy, 0.4);
    text("LIGHT", lx, ly + 18, { size: 7, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
    // Breath: five feathers, and the beat pulsing behind them.
    const b = Sound.beat(), ph = b ? b.phase : (performance.now() / 625) % 1, pul = Math.max(0, 1 - ph * 4);
    for (let i = 0; i < 5; i++) {
      const fx = lx + 46 + i * 15, fy = ly + 15, full = clamp(P.breath - i, 0, 1);
      ctx.globalAlpha = 0.25 + 0.75 * full; ctx.save(); ctx.translate(fx, fy); ctx.rotate(-0.5); ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.2, 0, 0, TAU); ctx.fillStyle = full >= 1 ? "#efeadb" : "#7a7668"; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    }
    glow(lx + 76, ly + 15, 26 + pul * 8, C.holy, 0.12 + pul * 0.25);
    if (F.noBreath) text("out of breath", lx + 46, ly + 32, { size: 8, italic: true, font: FONT.line, color: "#ffb0a0", alpha: F.noBreath });
    if (F.t - F.onBeatT < 0.8) text("ON THE BEAT", W / 2, H - 70, { align: "center", size: 10, weight: 800, spacing: 3, color: C.holy, glow: C.holy, blur: 12, alpha: 1 - (F.t - F.onBeatT) / 0.8 });
    // The altimeter: the street at the foot, the roofs round you, and where you are.
    const ax = W - 18, ay0 = 60, ay1 = H - 60, ya = (z) => lerp(ay1, ay0, clamp(z / CEIL, 0, 1));
    rect(ax, ay0, 2, ay1 - ay0, "rgba(255,255,255,0.12)");
    text("STREET", ax - 6, ay1 + 3, { align: "right", size: 7, weight: 700, color: "rgba(160,180,220,0.7)" });
    const roof = groundAt(P.x, P.y); if (roof > 0) rect(ax - 6, ya(roof), 14, 1, "rgba(160,180,220,0.6)");
    circle(ax + 1, ya(P.alt), 4, C.holy); glow(ax + 1, ya(P.alt), 10, C.holy, 0.4);
    // Where to go.
    const T = target(), tx = sx(T.x, T.z), ty = sy(T.y, T.z);
    if (tx < 20 || tx > W - 20 || ty < 20 || ty > H - 20) {
      const a = Math.atan2(ty - H / 2, tx - W / 2), ex = clamp(W / 2 + Math.cos(a) * W, 26, W - 40), ey = clamp(H / 2 + Math.sin(a) * W, 40, H - 26);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); poly([10, 0, -6, -7, -3, 0, -6, 7], T.c); ctx.restore(); glow(ex, ey, 16, T.c, 0.4);
    } else { ctx.strokeStyle = hexA(T.c, 0.5 + 0.3 * Math.sin(F.t * 4)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx, ty, 18 + 4 * Math.sin(F.t * 4), 0, TAU); ctx.stroke(); }
    // The angel's words.
    if (F.msg && F.msg.t < 9) {
      const a = clamp(F.msg.t / 0.4, 0, 1) * clamp((9 - F.msg.t) / 0.8, 0, 1);
      const ls = wrap(F.msg.text, Math.min(W - 160, 520), "italic 500 17px " + FONT.line);
      ctx.globalAlpha = 0.55 * a; rect(W / 2 - Math.min(W - 140, 540) / 2, 8, Math.min(W - 140, 540), 14 + ls.length * 20, "#050407"); ctx.globalAlpha = 1;
      ls.forEach((l, i) => text(l, W / 2, 26 + i * 20, { align: "center", size: 17, weight: 500, italic: true, font: FONT.line, color: "#f6eccb", alpha: a }));
    }
    // The controls, while they are being learned.
    if (F.step < 4) {
      const a = 0.45;
      text(tip("DRAG: STEER", "ARROWS: STEER"), 18, H - 16, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223," + a + ")" });
      text(tip("TAP: FLAP UP  ·  HOLD: DIVE", "SPACE: FLAP UP  ·  HOLD SHIFT: DIVE"), W - 18, H - 16, { align: "right", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223," + a + ")" });
    }
    if (F.stick) { ctx.strokeStyle = "rgba(233,230,223,0.3)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.stick.x0, F.stick.y0, 44, 0, TAU); ctx.stroke(); circle(F.stick.x0 + F.stick.dx * 44, F.stick.y0 + F.stick.dy * 44, 12, "rgba(233,230,223,0.35)"); }
    pauseButton();
  }

  // ---- Touch: the left side steers, the right side flaps (tap) and dives (hold) ----------------------
  function down(p, ev) {
    if (F.arrive || F.rescue) return;
    if (p.x < W * 0.42 && !F.stick) { F.stick = { id: ev.pointerId, x0: p.x, y0: p.y, dx: 0, dy: 0, mag: 0 }; return; }
    if (!F.wingTouch) F.wingTouch = { id: ev.pointerId, t0: F.t, dove: false };
  }
  function move(p, ev) {
    const S = F.stick;
    if (S && S.id === ev.pointerId) { let dx = (p.x - S.x0) / 44, dy = (p.y - S.y0) / 44; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } S.dx = dx; S.dy = dy; S.mag = Math.min(1, m); }
  }
  function up(p, ev) {
    if (F.stick && F.stick.id === ev.pointerId) { F.stick = null; return; }
    const T = F.wingTouch;
    if (T && T.id === ev.pointerId) { F.wingTouch = null; if (T.dove) endDive(); else flap(); }
  }
  function key(code, isDown, e) {
    F.keys[code] = isDown;
    if (e && e.repeat) return;
    if (code === "Escape" && isDown) { Game.pause(); return; }
    if (F.arrive || F.rescue) return;
    if (code === "Space" && isDown) flap();
    if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyZ") { if (isDown) startDive(); else endDive(); }
  }
  return { start, step, draw, down, move, up, key, get F() { return F; }, get P() { return P; }, get cam() { return cam; }, CHURCH, HOME, CAR };
})();
