"use strict";
// Fear Not: the flight. The city seen from straight above, Fr. Lawrence riding his angel over
// it. It looks deep through three cheap tricks: buildings lean away from the centre of the
// screen, the taller the further, so towers swing as you pass and you see the neon on their
// walls; height is zoom, so the city shrinks as you climb and rushes up as you dive; and the
// angel's shadow falls on the roofs below, small and far when high, close beneath when low.
// Light is the anchor and shadow the demons' ground: touch a light to swing round it on a
// thread of brightness, and let go to slingshot onward.

const Flight = (() => {
  const CAMH = 120, FOCAL = 430, FLOOR = 130, CEIL = 580, FOG = 250;
  const BLOCK = 160, STREET = 34, NX = 22, NY = 16;
  const START = { x: 400, y: 280 }, CHURCH = { x: 1360, y: 1040 }, HOME = { x: 720, y: 2000 }, CAR = { x: 2880, y: 1700 };
  const BOUND = { x0: 120, y0: 120, x1: NX * BLOCK - 120, y1: NY * BLOCK - 120 };
  const SIGNS = [C.pink, C.cyan, C.red, C.teal, C.pink, C.cyan, C.lav];
  let F = null, P = null, built = null;

  // ---- The city, from a fixed seed: the same every time --------------------------------------------
  function build() {
    const blocks = [], lights = [];
    const near = (x, y, o, r) => dist(x, y, o.x, o.y) < r;
    const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, k = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return dist(x, y, a.x + dx * k, a.y + dy * k); };
    // How lit a place is by design: the church's quarter and the way from it are lit; the rest
    // of the district is in shadow, and round the car it is darkest.
    const litChance = (x, y) => {
      let k = 0.18;
      if (near(x, y, CHURCH, 520)) k = 0.95;
      else if (segD(x, y, START, CHURCH) < 220) k = 0.85;
      else if (segD(x, y, CHURCH, HOME) < 200) k = 0.7;
      else if (near(x, y, HOME, 300)) k = 0.6;
      else if (segD(x, y, HOME, CAR) < 160) k = 0.38;
      if (near(x, y, CAR, 380)) k = Math.min(k, 0.12);
      return k;
    };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x0 = i * BLOCK + STREET / 2, y0 = j * BLOCK + STREET / 2, x1 = (i + 1) * BLOCK - STREET / 2, y1 = (j + 1) * BLOCK - STREET / 2;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = seeded(i * 7919 + j * 104729 + 17);
      const B = { i, j, x0, y0, x1, y1, kind: "city", b: [] };
      const isChurch = cx < CHURCH.x + BLOCK / 2 && cx > CHURCH.x - BLOCK / 2 && cy < CHURCH.y + BLOCK / 2 && cy > CHURCH.y - BLOCK / 2;
      const isHome = cx < HOME.x + BLOCK / 2 && cx > HOME.x - BLOCK / 2 && cy < HOME.y + BLOCK / 2 && cy > HOME.y - BLOCK / 2;
      // Taller uptown, to the north and east; low in the old quarter round the church.
      const up = clamp((x0 / (NX * BLOCK)) * 0.7 + (1 - y0 / (NY * BLOCK)) * 0.6 - 0.25, 0, 1);
      const roll = r();
      if (isChurch) { B.kind = "church"; }
      else if (!isHome && roll < 0.06) B.kind = "park";
      else if (!isHome && roll < 0.1) B.kind = "lot";
      else {
        const split = r(), lots = [];
        if (split < 0.25) lots.push([x0, y0, x1, y1]);
        else if (split < 0.5) { const m = lerp(x0, x1, 0.35 + r() * 0.3); lots.push([x0, y0, m - 3, y1], [m + 3, y0, x1, y1]); }
        else if (split < 0.7) { const m = lerp(y0, y1, 0.35 + r() * 0.3); lots.push([x0, y0, x1, m - 3], [x0, m + 3, x1, y1]); }
        else { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; lots.push([x0, y0, mx - 3, my - 3], [mx + 3, y0, x1, my - 3], [x0, my + 3, mx - 3, y1], [mx + 3, my + 3, x1, y1]); }
        for (const [a, b, c, d] of lots) {
          const ins = 6 + r() * 4, h = isHome ? 52 : clamp(18 + Math.pow(r(), 1.3) * (50 + 60 * up), 16, 118);
          const bd = { x0: a + ins, y0: b + ins, x1: c - ins, y1: d - ins, h, tone: r(), win: Math.floor(r() * 1e6), tower: r() < 0.12, ac: r() < 0.5, sign: null };
          if (r() < 0.32) { const side = Math.floor(r() * 4); bd.sign = { side, c: SIGNS[Math.floor(r() * SIGNS.length)], z: h * (0.45 + r() * 0.3) }; }
          B.b.push(bd);
          if (bd.sign) {
            const s = bd.sign, sx = s.side === 1 ? bd.x1 : s.side === 3 ? bd.x0 : (bd.x0 + bd.x1) / 2, sy = s.side === 0 ? bd.y0 : s.side === 2 ? bd.y1 : (bd.y0 + bd.y1) / 2;
            lights.push({ x: sx, y: sy, z: s.z, c: s.c, kind: "neon", r: 26, range: 300, pow: 1, lit: r() < litChance(sx, sy) ? 1 : 0, b: bd });
          }
        }
        if (isHome) { B.home = B.b[0]; B.kind = "home"; }
      }
      blocks.push(B);
    }
    // Street lamps, at the corners of the crossroads.
    for (let j = 1; j < NY; j++) for (let i = 1; i < NX; i++) {
      const r = hash2(i, j, 3), x = i * BLOCK + (r < 0.5 ? 1 : -1) * 20, y = j * BLOCK + (hash2(i, j, 4) < 0.5 ? 1 : -1) * 20;
      lights.push({ x, y, z: 9, c: C.ice, kind: "lamp", r: 13, range: 280, pow: 0.8, lit: hash2(i, j, 5) < litChance(x, y) ? 1 : 0 });
    }
    // The church: its great windows are the strongest anchor in the district.
    lights.push({ x: CHURCH.x, y: CHURCH.y, z: 40, c: C.holy, kind: "church", r: 70, range: 520, pow: 2.2, lit: 1, holy: true });
    for (const L of lights) { L.base = L.lit; L.show = L.lit; }
    return { blocks, lights };
  }

  // ---- Starting --------------------------------------------------------------------------------
  function start(done) {
    if (!built) built = build();
    for (const L of built.lights) { L.lit = L.base; L.show = L.lit; L.dying = 0; }
    P = { x: START.x, y: START.y, alt: 450, vz: 0, speed: 150, head: 0.5, breath: 5, light: 100, tether: null, wing: 0, flap: 0, diving: false, diveT: 0, turned: 0, below: false };
    F = { done, t: 0, step: 0, stepT: 0, lastStep: 0, msg: null, msgs: [], stick: null, wingTouch: null, keys: {}, arrive: 0, rescue: 0, fade: 1, dark: 300, pulse: 0, beatOn: 0, toofar: null, warned: false, onBeatT: -9, rain: [], hint: 1, sawFog: false, tethered: 0, lastLight: 0 };
    for (let i = 0; i < 90; i++) F.rain.push(rainDrop(true));
    say("Hold on to me, Father. Drag on the left side to steer.");
    Sound.play(SONGS.noir); Sound.setLevel(0); Sound.ambience({ rain: 0.7, wind: 0.35, windF: 500 });
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
    if (P.tether || F.arrive) return;
    if (P.breath < 1) { F.noBreath = 0.6; return; }
    const beat = onBeat();
    P.breath -= beat ? 0.5 : 1;
    P.vz += beat ? 165 : 105; P.speed += beat ? 70 : 18; P.flap = 1;
    if (beat) { F.onBeatT = F.t; Sound.fx.whoosh(0.35, 0.6, true); }
    Sound.fx.flap(beat ? 1.2 : 0.8);
  }
  function startDive() { if (!P.tether) { P.diving = true; P.diveT = 0; } }
  function endDive() {
    if (!P.diving) return;
    P.diving = false;
    if (P.diveT > 0.25) { P.vz += Math.max(0, P.speed - 150) * 0.95; P.speed = lerp(P.speed, 175, 0.35); Sound.fx.whoosh(0.4, 0.5, true); }
  }
  function lightsInRange() { return built.lights.filter((L) => L.lit > 0.5 && dist(P.x, P.y, L.x, L.y) < L.range); }
  function tetherTo(L) {
    const R = Math.max(60, dist(P.x, P.y, L.x, L.y)), ang = Math.atan2(P.y - L.y, P.x - L.x);
    const vx = Math.cos(P.head), vy = Math.sin(P.head), rx = P.x - L.x, ry = P.y - L.y;
    const dir = rx * vy - ry * vx > 0 ? 1 : -1;
    P.tether = { L, R, ang, dir, t: 0 }; P.diving = false;
    Sound.fx.tick(2400, 1); Sound.I && Sound.ctx() && Sound.I.bell(Sound.now() + 0.01, L.holy ? 81 : 88, 0.9, 0.35, { ratio: 2, index: 1, sfx: true, dly: 0.2 });
  }
  function release() {
    const T = P.tether; if (!T) return;
    P.tether = null;
    P.head = T.ang + T.dir * PI / 2; P.speed += 45 + 70 * (T.L.pow - 0.8) + Math.min(60, T.t * 40);
    Sound.fx.whoosh(0.4, 0.8, false);
    if (T.t > 0.45) F.tethered++;
  }
  function rescue() {
    F.rescue = 0.001; P.tether = null; P.diving = false;
  }
  function step(dt) {
    F.t += dt; if (F.msg) F.msg.t += dt;
    if (F.noBreath) F.noBreath = Math.max(0, F.noBreath - dt);
    F.fade = Math.max(0, F.fade - dt * 1.2);
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
      if (F.rescue > 1.0 && F.rescue < 1.2) { P.x = CHURCH.x - 120; P.y = CHURCH.y - 60; P.alt = 330; P.vz = 0; P.speed = 140; P.light = 100; P.breath = 5; P.head = 0; say("I have you. Rest a moment in the church's light, then on."); F.rescue = 1.2; }
      if (F.rescue > 2.2) F.rescue = 0;
      return;
    }
    if (F.arrive) {
      F.arrive += dt; P.alt = lerp(P.alt, 40, dt * 2.2); P.x = lerp(P.x, CAR.x, dt * 2); P.y = lerp(P.y, CAR.y, dt * 2);
      Sound.ambience({ wind: 0.9, windF: 1400 });
      if (F.arrive > 1.6 && !F.left) { F.left = true; Sound.ambience({ wind: 0 }); F.done(); }
      return;
    }
    // Steering.
    const S = F.stick;
    if (S && S.mag > 0.15 && !P.tether) {
      const want = Math.atan2(S.dy, S.dx), d = angDiff(P.head, want), turn = (2.6 - P.speed / 400) * Math.min(1, S.mag) * dt;
      const tturn = clamp(d, -turn, turn); P.head += tturn; P.turned += Math.abs(tturn);
    }
    const k = F.keys;
    if (!P.tether && (k.ArrowLeft || k.KeyA)) { P.head -= 2.3 * dt; P.turned += 2.3 * dt; }
    if (!P.tether && (k.ArrowRight || k.KeyD)) { P.head += 2.3 * dt; P.turned += 2.3 * dt; }
    // Out of bounds: the angel turns back of its own accord.
    if (P.x < BOUND.x0 || P.x > BOUND.x1 || P.y < BOUND.y0 || P.y > BOUND.y1) {
      const want = Math.atan2((BOUND.y0 + BOUND.y1) / 2 - P.y, (BOUND.x0 + BOUND.x1) / 2 - P.x);
      P.head += clamp(angDiff(P.head, want), -1.8 * dt, 1.8 * dt);
      if (!F.warned) { F.warned = true; say("Not that way. Her prayer is behind us."); }
    }
    // Wings.
    if (F.wingTouch && !F.wingTouch.dove && F.t - F.wingTouch.t0 > 0.2 && !P.tether) { F.wingTouch.dove = true; startDive(); }
    if (P.diving) { P.diveT += dt; P.vz = lerp(P.vz, -240, dt * 3); P.speed = Math.min(470, P.speed + 115 * dt); }
    else if (!P.tether) { P.vz -= 26 * dt; P.vz *= 1 - 1.15 * dt; P.speed += (150 - P.speed) * 0.35 * dt; }
    P.breath = Math.min(5, P.breath + 0.9 * dt);
    P.flap = Math.max(0, P.flap - dt * 2.2); P.wing += dt * (P.diving ? 2 : 3 + P.flap * 14);
    // The tether: swing round the light.
    if (P.tether) {
      const T = P.tether; T.t += dt;
      P.speed = Math.min(520, P.speed + (40 + 60 * T.L.pow) * dt);
      T.ang += T.dir * (P.speed / T.R) * dt;
      P.x = T.L.x + Math.cos(T.ang) * T.R; P.y = T.L.y + Math.sin(T.ang) * T.R;
      P.head = T.ang + T.dir * PI / 2; P.vz *= 1 - 3 * dt; if (P.alt < FOG + 20) P.vz += 60 * dt;   // the thread holds you up
      P.light = Math.min(100, P.light + 10 * dt);
      if (T.L.show <= 0) release();
    } else { P.x += Math.cos(P.head) * P.speed * dt; P.y += Math.sin(P.head) * P.speed * dt; }
    // The church lifts you on its column of light, and fills you again.
    const dc = dist(P.x, P.y, CHURCH.x, CHURCH.y);
    if (dc < 190) { P.vz += 280 * dt * (1 - dc / 190); P.light = Math.min(100, P.light + 45 * dt); }
    P.alt += P.vz * dt;
    if (P.alt < FLOOR) { P.alt = FLOOR; P.vz = Math.max(0, P.vz); }
    if (P.alt > CEIL) { P.alt = CEIL; P.vz = Math.min(0, P.vz); }
    // The light: fog and shadow drain it; clear air, the lights and the church fill it.
    const inDark = dist(P.x, P.y, CAR.x, CAR.y) < F.dark;
    if (P.alt < FOG) { P.light -= (5 + (inDark ? 7 : 0)) * dt; F.sawFog = true; }
    else P.light += 1.5 * dt;
    for (const L of built.lights) if (L.lit > 0.5 && Math.abs(L.x - P.x) < 140 && Math.abs(L.y - P.y) < 140 && dist(P.x, P.y, L.x, L.y) < 140) { P.light += 6 * dt; break; }
    P.light = clamp(P.light, 0, 100);
    if (P.light <= 0) rescue();
    // The music follows the flight.
    Sound.setLevel(P.diving || P.speed > 260 || P.tether ? 2 : F.step >= 1 ? 1 : 0);
    Sound.ambience({ wind: 0.25 + clamp((P.speed - 140) / 300, 0, 0.7), windF: 380 + P.speed * 2.2 });
    lessons(dt);
  }
  // ---- The lessons of the first flight, one after another ------------------------------------------
  function lessons() {
    const s = F.step;
    if (s === 0 && P.turned > 1.5) { F.step = 1; say("Now fold my wings: hold on the right side to dive."); }
    else if (s === 1 && P.alt < FOG - 12) { F.step = 2; say("Feel it? Down here the fog drains us. Tap on the right to beat my wings and climb. On the beat is strongest."); }
    else if (s === 2 && P.alt > FOG + 30) { F.step = 3; say("Lights are our anchors. Touch a light and hold, to swing round it. Let go to fly on."); }
    else if (s === 3 && F.tethered > 0) { F.step = 4; say("Good. There: the church. Fly over it, and its light will fill us again."); }
    else if (s === 3 && F.t - F.stepT > 35) { F.step = 4; say("We will practise the lights again. For now: the church. Fly over it, and its light will fill us."); }
    else if (s === 4 && dist(P.x, P.y, CHURCH.x, CHURCH.y) < 190) { F.step = 5; say("Now the gold thread, to the south. That is her prayer, rising. Follow it."); Sound.fx.glory(); }
    else if (s === 5 && dist(P.x, P.y, HOME.x, HOME.y) < 170) { F.step = 6; say("Her window. She has prayed all night. Now the smoke, to the east: her father. Hurry. The dark is closing round him."); }
    else if (s === 6 && dist(P.x, P.y, CAR.x, CAR.y) < 420 && P.alt > FOG - 40) { F.step = 7; say("Down! Hold on the right, and dive to the street."); }
    if (F.step >= 6 && dist(P.x, P.y, CAR.x, CAR.y) < 170 && P.alt < FOG - 40) { F.arrive = 0.001; Sound.fx.whoosh(1.2, 1, false); Sound.fx.heart(1); }
    if (F.step !== F.lastStep) { F.lastStep = F.step; F.stepT = F.t; }
  }
  function target() {
    if (F.step <= 4) return { x: CHURCH.x, y: CHURCH.y, c: C.holy, z: 40 };
    if (F.step === 5) return { x: HOME.x, y: HOME.y, c: C.holy, z: 40 };
    return { x: CAR.x, y: CAR.y, c: C.ember, z: 0 };
  }

  // ---- Drawing -------------------------------------------------------------------------------------
  let cam = { x: 0, y: 0, z: 1 };
  const K = (z) => FOCAL / Math.max(1, cam.z - z);
  const sx = (x, z) => W / 2 + (x - cam.x) * K(z);
  const sy = (y, z) => H / 2 + (y - cam.y) * K(z);
  function rainDrop(any) { const a = Math.random() * TAU, r = any ? Math.random() * W * 0.7 : W * (0.45 + Math.random() * 0.35); return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, k: 0.6 + Math.random() * 0.8 }; }
  function draw() {
    const look = 16;
    cam.x = P.x + Math.cos(P.head) * look; cam.y = P.y + Math.sin(P.head) * look; cam.z = P.alt + CAMH;
    const k0 = K(0), hw = W / 2 / k0 + 140, hh = H / 2 / k0 + 140;
    const vx0 = cam.x - hw, vx1 = cam.x + hw, vy0 = cam.y - hh, vy1 = cam.y + hh;
    // The street level.
    rect(0, 0, W, H, "#04060c");
    const i0 = Math.max(0, Math.floor(vx0 / BLOCK)), i1 = Math.min(NX - 1, Math.floor(vx1 / BLOCK)), j0 = Math.max(0, Math.floor(vy0 / BLOCK)), j1 = Math.min(NY - 1, Math.floor(vy1 / BLOCK));
    const vis = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const B = built.blocks[j * NX + i];
      const x0 = sx(B.x0, 0), y0 = sy(B.y0, 0), w = (B.x1 - B.x0) * k0, h = (B.y1 - B.y0) * k0;
      rect(x0, y0, w, h, B.kind === "park" ? "#081410" : B.kind === "lot" ? "#0c101c" : "#0b0f1c");
      if (B.kind === "park") { const r = seeded(B.i * 31 + B.j); for (let n = 0; n < 7; n++) circle(x0 + r() * w, y0 + r() * h, (6 + r() * 8) * k0, "#0a1c14"); }
      if (B.kind === "lot") for (let n = 1; n < 6; n++) rect(x0 + n * w / 6, y0 + 4, 1, h - 8, "#1c2236");
      for (const b of B.b) vis.push(b);
      if (B.kind === "church") vis.push({ church: true, x0: CHURCH.x - 44, y0: CHURCH.y - 26, x1: CHURCH.x + 44, y1: CHURCH.y + 26, h: 44 });
    }
    // Light pooled on the wet streets.
    for (const L of built.lights) if (L.show > 0 && L.x > vx0 && L.x < vx1 && L.y > vy0 && L.y < vy1) glow(sx(L.x, 0), sy(L.y, 0), (L.kind === "church" ? 160 : L.kind === "lamp" ? 30 : 46) * k0, L.c, (L.kind === "lamp" ? 0.12 : 0.22) * L.show);
    // The car, on its street, and the darkness round it.
    drawCar();
    // Buildings: the farthest from the middle first, so the near ones lean over them.
    for (const b of vis) b.d = (cam.x - (b.x0 + b.x1) / 2) ** 2 + (cam.y - (b.y0 + b.y1) / 2) ** 2;
    vis.sort((a, b) => b.d - a.d);
    const inDark = (x, y) => dist(x, y, CAR.x, CAR.y) < F.dark;
    for (const b of vis) b.church ? drawChurch(b) : drawBuilding(b, inDark((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2));
    // The lights themselves.
    for (const L of built.lights) {
      if (L.x < vx0 || L.x > vx1 || L.y < vy0 || L.y > vy1) continue;
      const x = sx(L.x, L.z), y = sy(L.y, L.z), kz = K(L.z);
      if (L.show > 0) { glow(x, y, L.r * kz * (L.kind === "church" ? 1.4 : 1), L.c, (L.kind === "lamp" ? 0.55 : 0.85) * L.show); circle(x, y, Math.max(1, (L.kind === "lamp" ? 1.3 : 2) * kz), mix(L.c, "#ffffff", 0.6)); }
      else if (L.kind === "lamp") circle(x, y, Math.max(1, 1.6 * kz), "#1a2030");
    }
    drawThread();
    // The darkness round the car.
    const dk = K(0), dx = sx(CAR.x, 0), dy = sy(CAR.y, 0), gr = ctx.createRadialGradient(dx, dy, 0, dx, dy, F.dark * dk);
    gr.addColorStop(0, "rgba(2,1,4,0.72)"); gr.addColorStop(0.7, "rgba(2,1,4,0.45)"); gr.addColorStop(1, "rgba(2,1,4,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    drawCarEyes(); drawSmoke();
    // The fog: a sheet below you when you are above it, with the neon glowing up through it;
    // a murk all round you when you are down in it, hiding the way.
    if (P.alt >= FOG) {
      const a = clamp(0.52 - (P.alt - FOG) / 1000, 0.3, 0.52);
      ctx.fillStyle = "rgba(22,30,56," + a + ")"; ctx.fillRect(0, 0, W, H);
      fogBanks(FOG, 0.22);
      for (const L of built.lights) if (L.show > 0 && L.kind !== "lamp" && L.x > vx0 && L.x < vx1 && L.y > vy0 && L.y < vy1) glow(sx(L.x, FOG * 0.4), sy(L.y, FOG * 0.4), (L.kind === "church" ? 130 : 40) * K(FOG * 0.4), L.c, 0.3 * L.show);
    } else {
      const d = clamp((FOG - P.alt) / (FOG - FLOOR), 0, 1);
      const fg = ctx.createRadialGradient(W / 2, H / 2, H * (0.45 - 0.22 * d), W / 2, H / 2, H * 0.92);
      fg.addColorStop(0, "rgba(14,18,32," + (0.08 + 0.15 * d) + ")"); fg.addColorStop(1, "rgba(8,10,20," + (0.6 + 0.35 * d) + ")"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      drawWisps(0.5 + 0.4 * d);
    }
    drawShadow();
    if (P.tether) {
      const T = P.tether, lx = sx(T.L.x, T.L.z), ly = sy(T.L.y, T.L.z), px = W / 2 + (P.x - cam.x) * K(P.alt), py = H / 2 + (P.y - cam.y) * K(P.alt);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; line(px, py, lx, ly, hexA(T.L.c, 0.5), 5); line(px, py, lx, ly, "#fffbe8", 1.6); ctx.restore();
      glow(lx, ly, 40, T.L.c, 0.6);
    }
    drawAngel();
    if (P.alt < 420) drawClouds();
    drawRain();
    drawHUD();
    if (F.rescue) rect(0, 0, W, H, "rgba(0,0,0," + clamp(F.rescue < 1.2 ? F.rescue : 2.2 - F.rescue, 0, 1) + ")");
    if (F.arrive) rect(0, 0, W, H, "rgba(0,0,0," + clamp((F.arrive - 0.6) / 1.0, 0, 1) + ")");
    if (F.fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + F.fade + ")");
  }
  function drawBuilding(b, dark) {
    const kg = K(0), kr = K(b.h);
    const gx0 = sx(b.x0, 0), gx1 = sx(b.x1, 0), gy0 = sy(b.y0, 0), gy1 = sy(b.y1, 0);
    const rx0 = sx(b.x0, b.h), rx1 = sx(b.x1, b.h), ry0 = sy(b.y0, b.h), ry1 = sy(b.y1, b.h);
    const t = b.tone, wall = dark ? "#06080f" : t < 0.33 ? "#0b1226" : t < 0.66 ? "#0f1430" : "#0d1020", wall2 = dark ? "#040509" : t < 0.33 ? "#080d1c" : t < 0.66 ? "#0a0e22" : "#090b16";
    const walls = [];
    if (cam.y > b.y1) walls.push([2, [gx0, gy1, gx1, gy1, rx1, ry1, rx0, ry1], wall]);
    if (cam.y < b.y0) walls.push([0, [gx0, gy0, gx1, gy0, rx1, ry0, rx0, ry0], wall2]);
    if (cam.x > b.x1) walls.push([1, [gx1, gy0, gx1, gy1, rx1, ry1, rx1, ry0], wall2]);
    if (cam.x < b.x0) walls.push([3, [gx0, gy0, gx0, gy1, rx0, ry1, rx0, ry0], wall]);
    for (const [side, q, c] of walls) {
      poly(q, c);
      // Windows: a few lit, in rows up the wall.
      if (!dark) {
        const floors = Math.max(1, Math.floor(b.h / 16)), cols = 4;
        for (let f = 0; f < floors; f++) for (let cI = 0; cI < cols; cI++) {
          if (hash2(b.win + side * 97, f, cI) > 0.3) continue;
          const u = (cI + 0.5) / cols, v = (f + 0.6) / (floors + 0.4);
          const ax = lerp(q[0], q[2], u), ay = lerp(q[1], q[3], u), bx = lerp(q[6], q[4], u), by = lerp(q[7], q[5], u);
          const wx = lerp(ax, bx, v), wy = lerp(ay, by, v), hc = hash2(b.win, f + side, cI + 9);
          winAdd(hc < 0.2 ? 0 : hc < 0.6 ? 3 : 2, wx - 1, wy - 1, 2.4, 2.4);
        }
      }
      // A neon sign on this wall.
      if (b.sign && b.sign.side === side) {
        const v = b.sign.z / b.h, u0 = 0.3, u1 = 0.7;
        const p = (u, vv) => [lerp(lerp(q[0], q[2], u), lerp(q[6], q[4], u), vv), lerp(lerp(q[1], q[3], u), lerp(q[7], q[5], u), vv)];
        const a = p(u0, v - 0.12), bb = p(u1, v - 0.12), c2 = p(u1, v + 0.12), d = p(u0, v + 0.12);
        const L = b.light || (b.light = built.lights.find((l) => l.b === b));
        const on = L ? L.show : 0;
        poly([a[0], a[1], bb[0], bb[1], c2[0], c2[1], d[0], d[1]], on > 0 ? mix(b.sign.c, "#ffffff", 0.3) : "#1a1a26");
      }
    }
    winFlush(0.55);
    // The roof.
    rect(rx0, ry0, rx1 - rx0, ry1 - ry0, dark ? "#080a12" : t < 0.5 ? "#18223e" : "#1c2238");
    ctx.strokeStyle = dark ? "#0e1220" : "#2c3c62"; ctx.lineWidth = 1; ctx.strokeRect(rx0 + 0.5, ry0 + 0.5, rx1 - rx0 - 1, ry1 - ry0 - 1);
    if (b.ac) rect(lerp(rx0, rx1, 0.6), lerp(ry0, ry1, 0.3), (rx1 - rx0) * 0.18, (ry1 - ry0) * 0.14, dark ? "#0a0c14" : "#1e2640");
    if (b.tower) circle(lerp(rx0, rx1, 0.3), lerp(ry0, ry1, 0.65), Math.min(rx1 - rx0, ry1 - ry0) * 0.12, dark ? "#0a0c14" : "#24203a");
    if (b === homeB()) glow(lerp(rx0, rx1, 0.5), ry1, 30 * kr, "#ffd9a0", 0.6);    // her building: one warm window
  }
  let homeCache;
  function homeB() { if (homeCache === undefined) { const B = built.blocks.find((x) => x.kind === "home"); homeCache = B ? B.home : null; } return homeCache; }
  // The church: a cross of roofs, gold in every window, and its column of light.
  function drawChurch(b) {
    const h = b.h, k = K(h), cx = sx(CHURCH.x, h), cy = sy(CHURCH.y, h), kg = K(0);
    // Walls first, as a block, then the cross-shaped roof.
    const B1 = { x0: CHURCH.x - 50, y0: CHURCH.y - 18, x1: CHURCH.x + 50, y1: CHURCH.y + 18, h: h - 4, tone: 0.5, win: 1 }, B2 = { x0: CHURCH.x + 4, y0: CHURCH.y - 44, x1: CHURCH.x + 30, y1: CHURCH.y + 44, h: h - 4, tone: 0.5, win: 2 };
    for (const bb of [B1, B2]) {
      const q = [];
      const gx0 = sx(bb.x0, 0), gx1 = sx(bb.x1, 0), gy0 = sy(bb.y0, 0), gy1 = sy(bb.y1, 0), rx0 = sx(bb.x0, bb.h), rx1 = sx(bb.x1, bb.h), ry0 = sy(bb.y0, bb.h), ry1 = sy(bb.y1, bb.h);
      if (cam.y > bb.y1) q.push([gx0, gy1, gx1, gy1, rx1, ry1, rx0, ry1]);
      if (cam.y < bb.y0) q.push([gx0, gy0, gx1, gy0, rx1, ry0, rx0, ry0]);
      if (cam.x > bb.x1) q.push([gx1, gy0, gx1, gy1, rx1, ry1, rx1, ry0]);
      if (cam.x < bb.x0) q.push([gx0, gy0, gx0, gy1, rx0, ry1, rx0, ry0]);
      for (const w of q) {
        poly(w, "#2a2018");
        for (let i = 1; i < 5; i++) { const u = i / 5, ax = lerp(w[0], w[2], u), ay = lerp(w[1], w[3], u), bx = lerp(w[6], w[4], u), by = lerp(w[7], w[5], u); line(lerp(ax, bx, 0.25), lerp(ay, by, 0.25), lerp(ax, bx, 0.75), lerp(ay, by, 0.75), "#ffd27a", Math.max(1.5, 2.2 * k)); }
      }
      rect(rx0, ry0, rx1 - rx0, ry1 - ry0, "#3a2c20"); ctx.strokeStyle = "#7a5a30"; ctx.lineWidth = 1; ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
    // The cross on the roof, and the light.
    const cx2 = sx(CHURCH.x + 17, h + 6), cy2 = sy(CHURCH.y, h + 6), kk = K(h + 6);
    rect(cx2 - 1.5 * kk, cy2 - 9 * kk, 3 * kk, 18 * kk, "#ffe6a0"); rect(cx2 - 6 * kk, cy2 - 4 * kk, 12 * kk, 3 * kk, "#ffe6a0");
    glow(cx, cy, 120 * k, C.holy, 0.45 + 0.1 * Math.sin(F.t * 2));
    // The updraft: motes of light rising toward you.
    const r = seeded(77);
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, rr = r() * 70, u = (r() + F.t * (0.25 + r() * 0.2)) % 1, z = h + u * (cam.z - h) * 0.85;
      const x = sx(CHURCH.x + Math.cos(a) * rr, z), y = sy(CHURCH.y + Math.sin(a) * rr, z);
      glow(x, y, 3 + 5 * u, "#fff3cf", 0.5 * (1 - u));
    }
  }
  // The car in the dark street, and the smoke of the temptation round it.
  function drawCar() {
    const k = K(0), x = sx(CAR.x, 0), y = sy(CAR.y, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(PI / 2); ctx.scale(k, k);
    rect(-12, -6, 24, 12, "#141828"); rect(-4, -5, 8, 10, "#0a0c16"); rect(-9, -5, 3, 10, "#1e2a40");
    ctx.restore();
    // The corner store's sign across the street.
    const st = sx(CAR.x + 40, 20), sty = sy(CAR.y, 20);
    glow(st, sty, 34 * K(20), C.red, 0.6 + 0.3 * Math.sin(F.t * 13) * Math.sin(F.t * 3));
  }
  // Ember eyes in the dark round the car.
  function drawCarEyes() {
    const k = K(6);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + F.t * 0.2, ex = sx(CAR.x + Math.cos(a) * 30, 6), ey = sy(CAR.y + Math.sin(a) * 40, 6); glow(ex, ey, 7 * k, C.ember, 0.55 + 0.3 * Math.sin(F.t * 3 + i)); }
  }
  // The gold thread of the child's prayer: from her window up toward you.
  function drawThread() {
    const top = Math.max(60, P.alt * 0.9), n = 28;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [wd, a] of [[5, 0.18], [1.6, 0.85]]) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n, z = 40 + (top - 40) * u, wob = Math.sin(u * 9 - F.t * 2.5) * 8 * u;
        const x = sx(HOME.x + wob, z), y = sy(HOME.y + wob * 0.5, z);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = hexA(C.holy, a); ctx.lineWidth = wd; ctx.stroke();
    }
    ctx.restore();
    glow(sx(HOME.x, 40), sy(HOME.y, 40), 26 * K(40), "#ffd9a0", 0.8);
  }
  // The smoke over the car: dark puffs rising, with embers.
  function drawSmoke() {
    const r = seeded(99), top = Math.max(60, P.alt * 0.85);
    for (let i = 0; i < 22; i++) {
      const u = (r() + F.t * (0.08 + r() * 0.06)) % 1, z = u * top, a = r() * TAU, rr = 10 + u * 50;
      const x = sx(CAR.x + Math.cos(a) * rr, z), y = sy(CAR.y + Math.sin(a) * rr, z), s = (14 + 30 * u) * K(z);
      ctx.globalAlpha = 0.65 * (1 - u * 0.8); circle(x, y, s * 1.2, "#030104"); ctx.globalAlpha = 1;
      if (i % 3 === 0) glow(x, y, 6 * K(z), C.ember, 0.7 * (1 - u));
    }
  }
  function drawShadow() {
    // The shadow falls a little to the south-east, as if from the moon behind the clouds.
    let gx = P.x + (P.alt) * 0.22, gy = P.y + (P.alt) * 0.3, hz = 0;
    const i = Math.floor(gx / BLOCK), j = Math.floor(gy / BLOCK), B = built.blocks[j * NX + i];
    if (B) for (const b of B.b) if (gx > b.x0 && gx < b.x1 && gy > b.y0 && gy < b.y1) { hz = b.h; gx = P.x + (P.alt - hz) * 0.22; gy = P.y + (P.alt - hz) * 0.3; }
    const k = K(hz), x = sx(gx, hz), y = sy(gy, hz), op = P.diving ? 0.35 : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(P.head); ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 0, 15 * k, 5 * k, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2 * k, 0, 7 * k, 30 * k * op, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // The angel from above, wings out, and Fr. Lawrence on its back holding his hat on.
  function drawAngel() {
    const k = K(P.alt) * 0.5, x = W / 2 + (P.x - cam.x) * K(P.alt), y = H / 2 + (P.y - cam.y) * K(P.alt);
    glow(x, y, 70 * k, C.holy, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(P.head); ctx.scale(k, k);
    const beat = Math.sin(P.wing * 2.4), span = P.diving ? 0.38 : P.tether ? 0.95 : 0.84 + 0.16 * beat, sweep = P.diving ? -16 : -3 * beat;
    for (const d of [-1, 1]) {
      // A wing: the leading edge out from the shoulder, and a scalloped trailing edge of
      // long feathers, swept back when diving.
      ctx.save(); ctx.scale(1, d);
      const L = 40 * span + 4, tip = [sweep - 6, L], wrist = [4 + sweep * 0.3, L * 0.55];
      ctx.beginPath(); ctx.moveTo(6, 3);
      ctx.quadraticCurveTo(8, L * 0.3, wrist[0], wrist[1]); ctx.quadraticCurveTo(wrist[0] - 2, L * 0.85, tip[0], tip[1]);
      const N = 6;
      for (let f = 1; f <= N; f++) {
        const u = f / N, px = lerp(tip[0], -8, u) - 8 * Math.sin(u * PI), py = lerp(tip[1], 4, u), qx = lerp(tip[0], -8, u - 0.5 / N) - 8 * Math.sin((u - 0.5 / N) * PI) - 7, qy = lerp(tip[1], 4, u - 0.5 / N);
        ctx.quadraticCurveTo(qx, qy, px, py);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, L); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#e2dac4");
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,170,90,0.75)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.globalAlpha = 0.35; for (let f = 1; f < N; f++) { const u = f / N; line(lerp(wrist[0], 2, u) - 2, lerp(wrist[1], 6, u), lerp(tip[0], -8, u) - 8 * Math.sin(u * PI) - 4, lerp(tip[1], 4, u), "#b8a878", 0.6); } ctx.globalAlpha = 1;
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
  // Banks of fog lying over the city, drifting slowly: the top of the fog seen from above.
  function fogBanks(z, a) {
    const r = seeded(44), kz = K(z);
    for (let i = 0; i < 26; i++) {
      const wx = (r() * 4400 + F.t * 6) % 4400 - 500, wy = r() * 3200 - 400, x = sx(wx, z), y = sy(wy, z), rx = (180 + r() * 220) * kz, ry = rx * (0.4 + r() * 0.3);
      if (x < -rx || x > W + rx || y < -ry || y > H + ry) continue;
      ctx.globalAlpha = a; ctx.fillStyle = "#3a4a70"; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() * 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function drawWisps(a) {
    const r = seeded(55);
    for (let i = 0; i < 12; i++) {
      const wx = (r() * 4000 + F.t * 12) % 4000, wy = r() * 2800, z = P.alt + 20 + r() * 60;
      if (z >= cam.z - 10) continue;
      const x = sx(wx, z), y = sy(wy, z); if (x < -300 || x > W + 300 || y < -300 || y > H + 300) continue;
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = "#3a4466"; ctx.beginPath(); ctx.ellipse(x, y, 200 * K(z) * 0.5, 80 * K(z) * 0.5, 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function drawClouds() {
    const r = seeded(66);
    for (let i = 0; i < 16; i++) {
      const wx = (r() * 4200 + F.t * 9) % 4200 - 300, wy = r() * 3000 - 300, z = 430 + r() * 90;
      if (z >= cam.z - 25) continue;
      const kz = K(z), x = sx(wx, z), y = sy(wy, z);
      if (x < -400 || x > W + 400 || y < -400 || y > H + 400) continue;
      ctx.globalAlpha = 0.16; ctx.fillStyle = "#56607e"; ctx.beginPath(); ctx.ellipse(x, y, 150 * kz, 70 * kz, 0.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
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
    // The altimeter: the fog line, and where you are.
    const ax = W - 18, ay0 = 60, ay1 = H - 60, ya = (z) => lerp(ay1, ay0, (z - FLOOR) / (CEIL - FLOOR));
    rect(ax, ay0, 2, ay1 - ay0, "rgba(255,255,255,0.12)");
    rect(ax - 6, ya(FOG), 14, 1, "rgba(160,180,220,0.6)"); text("FOG", ax - 10, ya(FOG) + 3, { align: "right", size: 7, weight: 700, color: "rgba(160,180,220,0.7)" });
    circle(ax + 1, ya(P.alt), 4, P.alt < FOG ? "#9fb0d0" : C.holy); glow(ax + 1, ya(P.alt), 10, C.holy, 0.4);
    // Where to go.
    const T = target(), tx = sx(T.x, T.z), ty = sy(T.y, T.z);
    if (tx < 20 || tx > W - 20 || ty < 20 || ty > H - 20) {
      const a = Math.atan2(ty - H / 2, tx - W / 2), ex = clamp(W / 2 + Math.cos(a) * W, 26, W - 40), ey = clamp(H / 2 + Math.sin(a) * W, 40, H - 26);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); poly([10, 0, -6, -7, -3, 0, -6, 7], T.c); ctx.restore(); glow(ex, ey, 16, T.c, 0.4);
    } else { ctx.strokeStyle = hexA(T.c, 0.5 + 0.3 * Math.sin(F.t * 4)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx, ty, 18 + 4 * Math.sin(F.t * 4), 0, TAU); ctx.stroke(); }
    // In the lesson on lights: rings round the ones in reach.
    if (F.step === 3 && !P.tether) for (const L of lightsInRange()) { const x = sx(L.x, L.z), y = sy(L.y, L.z); ctx.strokeStyle = hexA(C.holy, 0.4 + 0.3 * Math.sin(F.t * 6)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke(); }
    if (F.toofar && F.t - F.toofar.t < 0.6) { const a = 1 - (F.t - F.toofar.t) / 0.6; ctx.strokeStyle = "rgba(255,120,100," + a + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.toofar.x, F.toofar.y, 16, 0, TAU); ctx.stroke(); text("too far", F.toofar.x, F.toofar.y - 20, { align: "center", size: 9, italic: true, font: FONT.line, color: "#ffb0a0", alpha: a }); }
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
      text("DRAG: STEER", 18, H - 16, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223," + a + ")" });
      text("TAP: FLAP  ·  HOLD: DIVE", W - 18, H - 16, { align: "right", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223," + a + ")" });
      if (F.step === 3) text("TOUCH A LIGHT: SWING", W / 2, H - 16, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(242,212,122,0.7)" });
    }
    if (F.stick) { ctx.strokeStyle = "rgba(233,230,223,0.3)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.stick.x0, F.stick.y0, 44, 0, TAU); ctx.stroke(); circle(F.stick.x0 + F.stick.dx * 44, F.stick.y0 + F.stick.dy * 44, 12, "rgba(233,230,223,0.35)"); }
    pauseButton();
  }

  // ---- Touch -----------------------------------------------------------------------------------------
  function lightAt(p) {
    let best = null, bd = 40;
    for (const L of built.lights) {
      if (L.show <= 0) continue;
      const x = sx(L.x, L.z), y = sy(L.y, L.z), d = dist(p.x, p.y, x, y);
      if (d < bd) { bd = d; best = { L, x, y }; }
    }
    return best;
  }
  function down(p, ev) {
    if (F.arrive || F.rescue) return;
    const hit = F.step >= 3 ? lightAt(p) : null;      // no tethers until the lesson on lights
    if (hit && !P.tether) {
      if (dist(P.x, P.y, hit.L.x, hit.L.y) < hit.L.range) { tetherTo(hit.L); F.tetherTouch = ev.pointerId; return; }
      F.toofar = { x: hit.x, y: hit.y, t: F.t };
      if (p.x < W * 0.42) return;
    }
    if (p.x < W * 0.42 && !F.stick) { F.stick = { id: ev.pointerId, x0: p.x, y0: p.y, dx: 0, dy: 0, mag: 0 }; return; }
    if (!F.wingTouch) F.wingTouch = { id: ev.pointerId, t0: F.t, dove: false };
  }
  function move(p, ev) {
    const S = F.stick;
    if (S && S.id === ev.pointerId) { let dx = (p.x - S.x0) / 44, dy = (p.y - S.y0) / 44; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } S.dx = dx; S.dy = dy; S.mag = Math.min(1, m); }
  }
  function up(p, ev) {
    if (F.tetherTouch === ev.pointerId) { F.tetherTouch = null; release(); return; }
    if (F.stick && F.stick.id === ev.pointerId) { F.stick = null; return; }
    const T = F.wingTouch;
    if (T && T.id === ev.pointerId) { F.wingTouch = null; if (T.dove) endDive(); else flap(); }
  }
  function key(code, isDown) {
    F.keys[code] = isDown;
    if (code === "Escape" && isDown) { Game.pause(); return; }
    if (F.arrive || F.rescue) return;
    if ((code === "Space" || code === "ArrowUp" || code === "KeyW") && isDown) flap();
    if (code === "ArrowDown" || code === "KeyS") { if (isDown) startDive(); else endDive(); }
    if (code === "KeyE" || code === "ShiftLeft" || code === "ShiftRight") {
      if (isDown && !P.tether && F.step >= 3) { const near = lightsInRange().sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y))[0]; if (near) tetherTo(near); }
      else if (!isDown) release();
    }
  }
  return { start, step, draw, down, move, up, key, get F() { return F; }, get P() { return P; }, CHURCH, HOME, CAR, FOG };
})();
