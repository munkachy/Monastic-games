"use strict";
// While You Have the Light: the endless climb, a first build. The swing alone: no demons yet.
// A shaft of black rock goes up for ever, made by rules as he climbs (never by chance alone: a
// clear way up always stays open, and rock to hook is always within the rope's reach). The torch
// is the clock: its circle of light shrinks as it burns, and the verses of Psalm 118 cut into
// the rock fill it again, one stanza after another, Aleph to Tau.
//
// Touch: tap the rock and the hook flies there; keep holding and the rope pulls him up. The two
// thumb pads swing him (and walk him on the ground); swing into a wall and hold toward it to
// cling, then press away from it to kick off. Tap the monk to let go. FLARE: time all but stops,
// and each tap puts him there, through rock if need be.
// Keys: click to hook (hold to pull up), arrows or A/D to swing and cling, W/S to pull up or let
// out rope, Space to let go, F to flare, Esc to pause.

const CLIMB_VERSES = [
  ["א", "ALEPH", 1, "Blessed are the undefiled in the way, who walk in the law of the Lord."],
  ["ב", "BETH", 11, "Thy words have I hidden in my heart, that I may not sin against thee."],
  ["ג", "GIMEL", 18, "Open thou my eyes: and I will consider the wondrous things of thy law."],
  ["ד", "DALETH", 25, "My soul hath cleaved to the pavement: quicken thou me according to thy word."],
  ["ה", "HE", 33, "Set before me for a law the way of thy justifications, O Lord: and I will always seek after it."],
  ["ו", "VAU", 45, "And I walked at large: because I have sought after thy commandments."],
  ["ז", "ZAIN", 54, "Thy justifications were the subject of my song, in the place of my pilgrimage."],
  ["ח", "HETH", 62, "I rose at midnight to give praise to thee; for the judgments of thy justification."],
  ["ט", "TETH", 71, "It is good for me that thou hast humbled me, that I may learn thy justifications."],
  ["י", "JOD", 73, "Thy hands have made me and formed me: give me understanding, and I will learn thy commandments."],
  ["כ", "CAPH", 81, "My soul hath fainted after thy salvation: and in thy word I have very much hoped."],
  ["ל", "LAMED", 89, "For ever, O Lord, thy word standeth firm in heaven."],
  ["מ", "MEM", 103, "How sweet are thy words to my palate! more than honey to my mouth."],
  ["נ", "NUN", 105, "Thy word is a lamp to my feet, and a light to my paths."],
  ["ס", "SAMECH", 114, "Thou art my helper and my protector: and in thy word I have greatly hoped."],
  ["ע", "AIN", 125, "I am thy servant: give me understanding that I may know thy testimonies."],
  ["פ", "PHE", 130, "The declaration of thy words giveth light: and giveth understanding to little ones."],
  ["צ", "SADE", 137, "Thou art just, O Lord: and thy judgment is right."],
  ["ק", "COPH", 147, "I prevented the dawning of the day, and cried: because in thy words I very much hoped."],
  ["ר", "RES", 160, "The beginning of thy words is truth: all the judgments of thy justice are for ever."],
  ["ש", "SIN", 164, "Seven times a day I have given praise to thee, for the judgments of thy justice."],
  ["ת", "TAU", 176, "I have gone astray like a sheep that is lost: seek thy servant, because I have not forgotten thy commandments."],
];

const Climb = (() => {
  const CELL = 16, COLS = 52, MPX = 27;           // a cell; the shaft's width in cells; pixels to a metre
  const GRAV = 900, VMAX = 950, WALK = 125, AIR = 260, PUMP = 640;
  const HOOK = 280, HOOK_V = 1900, REEL = 260, ROPE_MIN = 34, GRIP = 42;
  const CLING_HOLD = 2.5, CLING_SLIDE = 55;
  const BURN = 1 / 60;                             // a full torch lasts a minute at the foot
  const FLARE_R = 280, FLARE_T = 3, FLARE_SLOW = 0.12, FLARE_COST = 0.08, BLINK_COST = 0.035, BLINKS = 4;
  const HW = 7, HT = 44;                           // half the monk's width; his height
  const SLOT = 14;                                 // rows to each place an island may stand

  // ---- The shaft, made by rules -------------------------------------------------------------------
  // Row j (y from j*CELL down to (j+1)*CELL) is open from column L to column R. Rows 0 and below
  // are the floor. The open way meanders slowly, so each row's opening overlaps the next by
  // several cells, and it is never narrower than six cells. Islands of rock stand in the open way
  // only where they leave three clear cells on both sides.
  let seed = 1, PH = [0, 0, 0], rows = new Map(), slots = new Map();
  const walls = [];
  function edges(j) {
    let r = rows.get(j); if (r) return r;
    const h = -j, k = Math.min(1, h / 900);
    const w = smooth((h - 14) / 26);                 // easing out of the chamber at the foot
    const c = COLS / 2 + w * (9 * Math.sin(h * 0.043 + PH[0]) + 4 * Math.sin(h * 0.12 + PH[1]));
    const hw = lerp(7, 5 + 2 * k + (4 + 2 * k) * (0.5 + 0.5 * Math.sin(h * 0.058 + PH[2])), w);
    let L = Math.round(c - hw) + Math.floor(hash2(h, 1, seed) * 1.7);
    let R = Math.round(c + hw) - Math.floor(hash2(h, 2, seed) * 1.7);
    // Shelves out from the walls, two rows deep.
    const b = Math.floor(h / 3);
    if (h > 20 && h % 3 < 2) {
      if (hash2(b, 3, seed) < 0.16) L += 2 + Math.floor(hash2(b, 4, seed) * 3);
      if (hash2(b, 5, seed) < 0.16) R -= 2 + Math.floor(hash2(b, 6, seed) * 3);
    }
    if (R - L < 5) { const m = Math.round((L + R) / 2); L = m - 3; R = m + 3; }
    L = clamp(L, 2, COLS - 9); R = clamp(R, L + 5, COLS - 3);
    r = { L, R }; rows.set(j, r); return r;
  }
  function island(s) {
    if (slots.has(s)) return slots.get(s);
    let isl = null;
    const h0 = s * SLOT + 3 + Math.floor(hash2(s, 7, seed) * 7), k = Math.min(1, h0 / 900);
    if (s >= 2 && hash2(s, 8, seed) < 0.62 - 0.22 * k) {
      const ih = hash2(s, 9, seed) < 0.45 ? 2 : 1, iw = 2 + Math.floor(hash2(s, 10, seed) * 3);
      let lo = -1e9, hi = 1e9;
      for (let h = h0 - 1; h <= h0 + ih; h++) { const e = edges(-h); lo = Math.max(lo, e.L + 3); hi = Math.min(hi, e.R - 3 - iw + 1); }
      if (hi >= lo) { const x0 = Math.round(lerp(lo, hi, hash2(s, 11, seed))); isl = { x0, x1: x0 + iw - 1, h0, h1: h0 + ih - 1 }; }
    }
    slots.set(s, isl); return isl;
  }
  function solid(i, j) {
    if (j >= 0 || i < 0 || i >= COLS) return true;
    const e = edges(j); if (i < e.L || i > e.R) return true;
    const h = -j, isl = island(Math.floor(h / SLOT));
    return !!isl && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 && i <= isl.x1;
  }
  const solidAt = (x, y) => solid(Math.floor(x / CELL), Math.floor(y / CELL));
  // The verses on the walls: the first near the foot, then further apart as the climb goes on.
  function wallAt(n) {
    while (walls.length <= n) {
      const m = walls.length, h = m === 0 ? 30 : walls[m - 1].h + 38 + Math.min(18, Math.floor(m * 1.2));
      walls.push({ h, side: hash2(m, 12, seed) < 0.5 ? -1 : 1, n: m, read: false, lit: 0 });
    }
    return walls[n];
  }
  function wallPos(w) {
    const j = -w.h, e = edges(j);
    return { x: w.side < 0 ? e.L * CELL + 1 : (e.R + 1) * CELL - 1, y: j * CELL + CELL / 2 };
  }

  // ---- The monk's body against the rock ---------------------------------------------------------
  let S = null;
  function boxHit(x, y) {
    const i0 = Math.floor((x - HW) / CELL), i1 = Math.floor((x + HW - 0.001) / CELL);
    const j0 = Math.floor((y - HT) / CELL), j1 = Math.floor((y - 0.001) / CELL);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (solid(i, j)) return true;
    return false;
  }
  function moveX(dx) {
    if (!dx) return 0;
    const x0 = S.x; S.x += dx;
    if (!boxHit(S.x, S.y)) return 0;
    S.x = dx > 0 ? Math.floor((S.x + HW) / CELL) * CELL - HW - 0.01 : (Math.floor((S.x - HW) / CELL) + 1) * CELL + HW + 0.01;
    if (boxHit(S.x, S.y)) S.x = x0;
    return dx > 0 ? 1 : -1;
  }
  function moveY(dy) {
    if (!dy) return 0;
    const y0 = S.y; S.y += dy;
    if (!boxHit(S.x, S.y)) return 0;
    S.y = dy > 0 ? Math.floor(S.y / CELL) * CELL - 0.01 : (Math.floor((S.y - HT) / CELL) + 1) * CELL + HT + 0.01;
    if (boxHit(S.x, S.y)) S.y = y0;
    return dy > 0 ? 1 : -1;
  }
  function freeSpot(x, y) {
    if (!boxHit(x, y)) return [x, y];
    for (let r = 4; r <= 52; r += 4) for (let a = 0; a < 16; a++) {
      const px = x + Math.cos(a / 16 * TAU) * r, py = y + Math.sin(a / 16 * TAU) * r;
      if (!boxHit(px, py)) return [px, py];
    }
    return null;
  }
  const touching = (s) => boxHit(S.x + s * 1.5, S.y - 2);
  const grip = () => [S.x, S.y - GRIP];
  const middle = () => [S.x, S.y - HT / 2];

  // ---- Starting, and the end -------------------------------------------------------------------------
  function start() {
    seed = (Math.random() * 1e9) | 0; rows = new Map(); slots = new Map(); walls.length = 0;
    const r = seeded(seed); PH = [r() * TAU, r() * TAU, r() * TAU];
    S = {
      x: COLS * CELL / 2, y: -0.01, vx: 0, vy: 0, dir: 1, ground: true, cling: 0, clingT: 0, landT: 0, anim: 0,
      rope: null, shot: null, shotPtr: null, reel: false,
      fuel: 1, t: 0, rt: 0, top: 0, read: 0, dying: 0, level: 0,
      flare: { on: false, t: 0, n: 0 }, parts: [], ghosts: [], verse: null,
      cam: { x: COLS * CELL / 2 - W / 2, y: 70 - H }, torch: [COLS * CELL / 2, -50],
      touches: new Map(), keys: {}, hooked: 0, hintT: 0,
    };
    mode = M;
    Sound.play(SONGS.arena); Sound.setLevel(0); Sound.ambience({ wind: 0.7 }); Sound.flare(false); Sound.muffle(false);
  }
  function metres(px) { return Math.max(0, Math.floor(px / MPX)); }
  function lightOut() {
    S.dying = 0.001; S.fuel = 0; endFlare(true);
    Sound.fx.death(); Sound.setLevel(0);
  }
  function finish() {
    const m = metres(S.top);
    S.newBest = m > (save.climbBest || 0);
    if (S.newBest) save.climbBest = m;
    store();
    Over.t = 0; mode = Over; Sound.muffle(true, 0.6);
  }

  // ---- The hook --------------------------------------------------------------------------------------
  // Where a line from (x, y) at angle a first meets rock, if within the rope's reach.
  function rayRock(x, y, a) {
    const ux = Math.cos(a), uy = Math.sin(a);
    for (let d = 6; d <= HOOK; d += 3) if (solidAt(x + ux * d, y + uy * d)) return d;
    return 0;
  }
  // The throw forgives a little: if the line misses, the nearest line within 24 degrees that
  // meets rock is taken instead.
  function throwHook(tx, ty, ptr) {
    const [gx, gy] = grip(), a0 = Math.atan2(ty - gy, tx - gx);
    let a = a0;
    if (!rayRock(gx, gy, a0)) for (let k = 1; k <= 8; k++) {
      if (rayRock(gx, gy, a0 - k * 0.052)) { a = a0 - k * 0.052; break; }
      if (rayRock(gx, gy, a0 + k * 0.052)) { a = a0 + k * 0.052; break; }
    }
    S.shot = { ox: gx, oy: gy, ux: Math.cos(a), uy: Math.sin(a), d: 0, back: 0 };
    S.shotPtr = ptr; S.reel = false;
    Sound.fx.throw(0.5);
  }
  function flyShot(dt) {
    const sh = S.shot;
    if (sh.back) { sh.back -= dt; sh.d = Math.max(0, sh.d - HOOK_V * 1.4 * dt); if (sh.back <= 0) S.shot = null; return; }
    const adv = HOOK_V * dt;
    for (let s = 0; s < adv; s += 3) {
      sh.d += 3;
      const px = sh.ox + sh.ux * sh.d, py = sh.oy + sh.uy * sh.d;
      if (solidAt(px, py)) {
        const [gx, gy] = grip();
        S.rope = { x: px, y: py, len: Math.max(ROPE_MIN, dist(gx, gy, px, py)) };
        S.shot = null; S.hooked++;
        if (S.shotPtr !== null) S.reel = true;
        Sound.fx.tether();
        for (let k = 0; k < 5; k++) S.parts.push({ kind: "chip", x: px, y: py, vx: (Math.random() - 0.5) * 120 - sh.ux * 60, vy: (Math.random() - 0.5) * 120 - sh.uy * 60, life: 0.4, age: 0 });
        return;
      }
      if (sh.d >= HOOK) { sh.back = 0.12; return; }
    }
  }
  function letGo() {
    if (S.rope) { S.rope = null; S.reel = false; Sound.fx.tetherBreak(); }
    else if (S.cling) S.cling = 0;
  }

  // ---- The flare -------------------------------------------------------------------------------------
  function startFlare() {
    if (S.dying || S.flare.on) return;
    if (S.fuel < FLARE_COST + 0.06) { Sound.fx.gutter(); return; }
    S.fuel -= FLARE_COST; S.flare = { on: true, t: 0, n: 0 }; S.shot = null; S.reel = false;
    Sound.flare(true); Sound.fx.flareOn();
  }
  function endFlare(quiet) {
    if (!S.flare.on) return;
    S.flare.on = false; Sound.flare(false); if (!quiet) Sound.fx.flareOff();
  }
  function puff(x, y, n, warm) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, v = 20 + Math.random() * 70;
      S.parts.push({ kind: "smoke", x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, r: 4 + Math.random() * 6, life: 0.7 + Math.random() * 0.5, age: 0, warm, real: true });
    }
  }
  // Where the finger is, his middle appears (no further than the flare's reach), through rock.
  function blink(tx, ty) {
    const [cx, cy] = middle(); let dx = tx - cx, dy = ty - cy; const L = Math.hypot(dx, dy);
    if (L > FLARE_R) { dx *= FLARE_R / L; dy *= FLARE_R / L; }
    const spot = freeSpot(cx + dx, cy + dy + HT / 2);
    if (!spot || S.fuel < BLINK_COST + 0.01) { Sound.fx.gutter(); return; }
    S.fuel -= BLINK_COST;
    S.ghosts.push({ x: S.x, y: S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
    puff(cx, cy, 14, false);
    S.x = spot[0]; S.y = spot[1]; S.vx = 0; S.vy = -40; S.rope = null; S.shot = null; S.cling = 0; S.reel = false;
    S.ground = boxHit(S.x, S.y + 1);
    puff(S.x, S.y - HT / 2, 10, true);
    S.parts.push({ kind: "ring", x: S.x, y: S.y - HT / 2, life: 0.5, age: 0, real: true });
    Sound.fx.zip();
    S.flare.n++;
    if (S.flare.n >= BLINKS) endFlare();
  }

  // ---- Each frame --------------------------------------------------------------------------------------
  function inputDir() {
    let d = 0;
    for (const t of S.touches.values()) if (t.pad) d += t.pad;
    if (S.keys.ArrowLeft || S.keys.KeyA) d -= 1;
    if (S.keys.ArrowRight || S.keys.KeyD) d += 1;
    return clamp(d, -1, 1);
  }
  function physics(dt) {
    const d = inputDir(), wasGround = S.ground, vyIn = S.vy;
    if (S.shot) flyShot(dt);
    const R = S.rope;
    if (R) {
      if (S.reel || S.keys.ArrowUp || S.keys.KeyW) R.len = Math.max(ROPE_MIN, R.len - REEL * dt);
      if (S.keys.ArrowDown || S.keys.KeyS) R.len = Math.min(HOOK + 60, R.len + REEL * 0.8 * dt);
    }
    const [gx, gy] = grip(), rd = R ? dist(gx, gy, R.x, R.y) : 0, taut = R && rd >= R.len - 1;
    // Clinging: still against the wall, then sliding slowly. Away from the wall: a kick off it.
    if (S.cling) {
      const s = S.cling; S.clingT += dt;
      if (!touching(s) || (taut && S.reel)) S.cling = 0;
      else if (d === -s) { S.cling = 0; S.vx = -s * 250; S.vy = -400; S.dir = -s; Sound.fx.kick(0.6); }
      else if (d !== s) S.cling = 0;
      else {
        S.vx = 0; S.vy = S.clingT > CLING_HOLD ? CLING_SLIDE : 0;
        if (moveY(S.vy * dt) > 0) { S.cling = 0; S.ground = true; }
        return;
      }
    }
    if (S.ground && !taut) {
      S.vx += clamp(d * WALK - S.vx, -900 * dt, 900 * dt);
      if (d) S.dir = d;
    } else if (!S.ground) {
      if (taut && d) {
        // Pumping the swing: a push along the arc, the way the thumb says.
        const nx = (gx - R.x) / rd, ny = (gy - R.y) / rd; let tx = -ny, ty = nx;
        if (tx * d < 0) { tx = -tx; ty = -ty; }
        S.vx += tx * PUMP * dt; S.vy += ty * PUMP * dt;
      } else if (d && S.vx * d < 220) S.vx += d * AIR * dt;
      const drag = 1 - 0.12 * dt; S.vx *= drag; S.vy *= drag;
    }
    S.vy += GRAV * dt;
    const sp = Math.hypot(S.vx, S.vy); if (sp > VMAX) { S.vx *= VMAX / sp; S.vy *= VMAX / sp; }
    // On the ground the rope pays out as he walks, unless it is pulling him in.
    if (R && S.ground && !S.reel && !(S.keys.ArrowUp || S.keys.KeyW)) R.len = Math.max(R.len, rd);
    const n = clamp(Math.ceil(Math.max(Math.abs(S.vx), Math.abs(S.vy)) * dt / 6), 1, 10), h = dt / n;
    let side = 0, landed = false;
    for (let k = 0; k < n; k++) {
      if (S.rope) {
        // The rope: no going further from the hook than its length.
        const [qx, qy] = grip(), L = dist(qx, qy, S.rope.x, S.rope.y);
        if (L > S.rope.len - 0.5) {
          const nx = (qx - S.rope.x) / L, ny = (qy - S.rope.y) / L, out = S.vx * nx + S.vy * ny;
          if (out > 0) { S.vx -= out * nx; S.vy -= out * ny; }
        }
      }
      const hx = moveX(S.vx * h); if (hx) { side = hx; S.vx = 0; }
      const hy = moveY(S.vy * h); if (hy) { if (hy > 0) landed = true; S.vy = 0; }
      if (S.rope) {
        const [qx, qy] = grip(), L = dist(qx, qy, S.rope.x, S.rope.y);
        if (L > S.rope.len) {
          const nx = (qx - S.rope.x) / L, ny = (qy - S.rope.y) / L, e = L - S.rope.len;
          if (moveX(-nx * e)) side = -sign(nx); if (moveY(-ny * e) > 0) landed = true;
        }
      }
    }
    S.ground = S.vy >= 0 && boxHit(S.x, S.y + 1);
    if (S.ground && !wasGround && (landed || vyIn > 200)) {
      if (vyIn > 320) { S.landT = 0.35; Sound.fx.land(clamp(vyIn / 700, 0.3, 1)); }
    }
    // Into a wall in the air, holding toward it: cling.
    if (!S.ground && d && touching(d) && !(S.rope && S.reel && taut)) {
      if (!S.cling) { S.cling = d; S.clingT = 0; S.dir = d; S.vx = 0; S.vy = 0; Sound.fx.grab(); }
    }
    if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }

  function step(dt) {
    S.rt += dt;
    if (S.dying) { S.dying += dt; if (S.dying > 1.7) { finish(); return; } }
    const F = S.flare;
    if (F.on) { F.t += dt; if (F.t > FLARE_T) endFlare(); }
    const wdt = dt * (F.on ? FLARE_SLOW : 1);
    S.t += wdt;
    if (!S.dying) {
      if (!F.on) S.fuel -= dt * BURN * (1 + S.top / (600 * MPX));
      if (S.fuel <= 0) lightOut();
      else if (S.fuel < 0.15 && Math.floor(S.rt * 0.8) !== Math.floor((S.rt - dt) * 0.8)) Sound.fx.gutter();
    }
    if (!S.dying) physics(wdt);
    S.landT = Math.max(0, S.landT - wdt);
    S.anim += wdt * (S.ground ? Math.abs(S.vx) / 80 : 1.2);
    if (S.rope && !S.ground && Math.abs(S.vx) > 30) S.dir = sign(S.vx);
    S.top = Math.max(S.top, -S.y);
    // The verses: come near one and the torch is full again.
    const [mx, my] = middle(), hNow = -S.y / CELL;
    for (let n = 0; ; n++) {
      const w = wallAt(n); if (w.h > hNow + 30) break;
      w.lit = Math.max(0, w.lit - dt * 0.5);
      if (w.read || w.h < hNow - 30) continue;
      const p = wallPos(w);
      if (dist(mx, my, p.x, p.y) < 70 && !S.dying) {
        w.read = true; w.lit = 1; S.fuel = 1; S.read++;
        S.verse = { v: CLIMB_VERSES[w.n % 22], t: 0 };
        Sound.fx.unlock();
        for (let k = 0; k < 16; k++) S.parts.push({ kind: "spark", x: p.x, y: p.y + (Math.random() - 0.5) * 30, vx: -w.side * (30 + Math.random() * 90), vy: -20 - Math.random() * 80, life: 0.9, age: 0, real: true });
      }
    }
    if (S.verse) { S.verse.t += dt; if (S.verse.t > 7) S.verse = null; }
    // The music rises with the height.
    const lv = Math.min(4, Math.floor(metres(S.top) / 40));
    if (lv !== S.level && !S.dying) { S.level = lv; Sound.setLevel(lv); }
    // The camera: a little below the middle, so more of the way up shows.
    const tx = clamp(S.x - W / 2, 0, COLS * CELL - W), ty = Math.min(S.y - HT / 2 - H * 0.58, 70 - H);
    S.cam.x += (tx - S.cam.x) * (1 - Math.exp(-dt * 5)); S.cam.y += (ty - S.cam.y) * (1 - Math.exp(-dt * 4));
    // Embers from the torch, smoke, chips of rock.
    if (!S.dying && Math.random() < (F.on ? 0.9 : 0.3)) S.parts.push({ kind: "ember", x: S.torch[0] + (Math.random() - 0.5) * 4, y: S.torch[1] - 6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, life: 0.8, age: 0 });
    for (const p of S.parts) {
      const k = p.real ? dt : wdt; p.age += k; p.x += p.vx * k; p.y += p.vy * k;
      if (p.kind === "chip") p.vy += 500 * k; else if (p.kind === "smoke") { p.vx *= 1 - 2 * k; p.vy *= 1 - 2 * k; }
    }
    S.parts = S.parts.filter((p) => p.age < p.life);
    for (const g of S.ghosts) g.age += dt;
    S.ghosts = S.ghosts.filter((g) => g.age < 0.9);
    S.hintT += dt;
  }

  // ---- Drawing -----------------------------------------------------------------------------------------
  function lightR() {
    const f = S.dying ? Math.max(0, 1 - S.dying / 1.4) * 0.15 : S.fuel;
    let R = 40 + 190 * Math.pow(f, 0.75);
    if (S.flare.on) R = Math.max(R, FLARE_R + 20);
    return R;
  }
  // The rock as one path: the two walls with craggy faces, the islands, the floor.
  function rockPath(cam) {
    const j0 = Math.floor(cam.y / CELL) - 1, j1 = Math.min(-1, Math.floor((cam.y + H) / CELL) + 1);
    const P = new Path2D(), X = (x) => x - cam.x, Y = (y) => y - cam.y;
    const jig = (j, k) => (hash2(j, k, 99) - 0.5) * 5;
    if (j0 <= j1) {
      P.moveTo(X(-60), Y(j0 * CELL));
      for (let j = j0; j <= j1; j++) { const x = edges(j).L * CELL; P.lineTo(X(x + jig(j, 1)), Y(j * CELL + 2)); P.lineTo(X(x + jig(j, 2)), Y(j * CELL + CELL - 2)); }
      P.lineTo(X(-60), Y((j1 + 1) * CELL)); P.closePath();
      P.moveTo(X(COLS * CELL + 60), Y(j0 * CELL));
      for (let j = j0; j <= j1; j++) { const x = (edges(j).R + 1) * CELL; P.lineTo(X(x + jig(j, 3)), Y(j * CELL + 2)); P.lineTo(X(x + jig(j, 4)), Y(j * CELL + CELL - 2)); }
      P.lineTo(X(COLS * CELL + 60), Y((j1 + 1) * CELL)); P.closePath();
      for (let s = Math.floor(-j1 / SLOT) - 1; s <= Math.floor(-j0 / SLOT) + 1; s++) {
        const isl = s >= 0 && island(s); if (!isl) continue;
        const x0 = isl.x0 * CELL, x1 = (isl.x1 + 1) * CELL, y0 = -(isl.h1 + 1) * CELL, y1 = -isl.h0 * CELL, q = (k) => (hash2(s, k, 77) - 0.5) * 5;
        P.moveTo(X(x0 + 3 + q(1)), Y(y0 + q(2))); P.lineTo(X((x0 + x1) / 2 + q(3)), Y(y0 - 2 + q(4))); P.lineTo(X(x1 - 2 + q(5)), Y(y0 + 1));
        P.lineTo(X(x1 + 1 + q(6)), Y((y0 + y1) / 2)); P.lineTo(X(x1 - 4 + q(7)), Y(y1 + 1 + q(8))); P.lineTo(X((x0 + x1) / 2 + q(9)), Y(y1 + 4 + q(10)));
        P.lineTo(X(x0 + 3), Y(y1 + 1 + q(11))); P.lineTo(X(x0 - 1 + q(12)), Y((y0 + y1) / 2)); P.closePath();
      }
    }
    // The floor at the foot.
    if (cam.y + H > -2) {
      P.moveTo(X(-60), Y(0)); for (let x = 0; x <= COLS * CELL; x += 24) P.lineTo(X(x), Y(jig(x, 5) * 0.6 + 1)); P.lineTo(X(COLS * CELL + 60), Y(0));
      P.lineTo(X(COLS * CELL + 60), Y(Math.max(0, cam.y + H) + 10)); P.lineTo(X(-60), Y(Math.max(0, cam.y + H) + 10)); P.closePath();
    }
    return P;
  }
  function drawTablet(w, cam, unlit) {
    const p = wallPos(w), x = p.x - cam.x, y = p.y - cam.y, s = w.side;
    if (y < -40 || y > H + 40) return;
    if (unlit) {
      // A slab set into the face of the rock, its lines cut in.
      const x0 = s < 0 ? x - 2 : x - 20;
      rect(x0, y - 17, 22, 34, "#1c1b19");
      ctx.globalAlpha = 0.5; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, "#5a554a"); ctx.globalAlpha = 1;
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(S.rt * 2.2 + w.n);
    if (!w.read) {
      glow(x + s * -10, y, 46, C.gold, 0.22 + 0.12 * pulse);
      const x0 = s < 0 ? x - 2 : x - 20;
      ctx.globalAlpha = 0.55 + 0.25 * pulse; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1;
    } else if (w.lit > 0) glow(x + s * -10, y, 70, C.flameHot, 0.4 * w.lit);
    else { const x0 = s < 0 ? x - 2 : x - 20; ctx.globalAlpha = 0.18; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1; }
  }
  function monkPose() {
    const t = S.t;
    if (S.dying) return MONK_ANIM.fall(0.3);
    if (S.cling) return MONK_ANIM.hang((t * 0.5) % 1);
    if (S.rope && !S.ground) return MONK_ANIM.hang((t * 0.6) % 1);
    if (!S.ground) return MONK_ANIM.fall((t * 1.3) % 1);
    if (S.landT > 0) return MONK_ANIM.land(1 - S.landT / 0.35);
    if (Math.abs(S.vx) > 15) return MONK_ANIM.walk(S.anim % 1);
    return MONK_ANIM.idle((t * 0.4) % 1, t);
  }
  function draw() {
    const cam = S.cam, t = S.rt, F = S.flare, hM = metres(-S.y);
    drawBackdrop(600 + cam.x * 0.6, 300 + clamp(cam.y * 0.05, -70, 70), 1, t, { y0: 300 });
    // The higher he climbs, the nearer the dawn: a grey light coming in from above.
    const dawn = clamp(metres(S.top) / 1500, 0, 1);
    if (dawn > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(200,190,170," + (0.22 * dawn) + ")"); g.addColorStop(1, "rgba(200,190,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    rect(0, 0, W, H, "rgba(12,12,14,0.3)");     // the far mist set back, so the near rock stands out
    const P = rockPath(cam);
    ctx.fillStyle = C.ink; ctx.fill(P);
    // The verses' slabs.
    const hTop = -(cam.y) / CELL + 4, hBot = -(cam.y + H) / CELL - 4;
    const vis = []; for (let n = 0; ; n++) { const w = wallAt(n); if (w.h > hTop) break; if (w.h >= hBot) vis.push(w); }
    for (const w of vis) drawTablet(w, cam, true);
    // The ghosts the flare leaves behind.
    for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
    // The rope, then the monk.
    const p = monkPose(); let mx = S.x, my = S.y;
    const hooked = S.rope && !S.ground && !S.cling;
    if (hooked) {
      const [gx, gy] = grip(), th = Math.atan2(S.rope.x - gx, gy - S.rope.y);
      p.spin = clamp(th, -1.4, 1.4) * S.dir;
      const hd = monkJoint(S.x, S.y, S.dir, p, "hF"); mx += gx - hd[0]; my += gy - hd[1];
    }
    if (S.cling) mx += S.cling * 2;
    S.lastPose = p;
    const r = drawMonk(mx - cam.x, my - cam.y, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, alpha: F.on ? 0.8 : 1 });
    if (r && r.torch) S.torch = [r.torch[0] + cam.x, r.torch[1] + cam.y];
    const hand = r && r.hand ? r.hand : [S.x - cam.x, S.y - GRIP - cam.y];
    if (S.rope) {
      const ax = S.rope.x - cam.x, ay = S.rope.y - cam.y;
      line(hand[0], hand[1], ax, ay, "#0b0b0d", 1.6);
      drawHook(ax, ay, Math.atan2(ay - hand[1], ax - hand[0]));
    }
    if (S.shot) {
      const sh = S.shot, ax = sh.ox + sh.ux * sh.d - cam.x, ay = sh.oy + sh.uy * sh.d - cam.y;
      line(hand[0], hand[1], ax, ay, "#0b0b0d", 1.3); drawHook(ax, ay, Math.atan2(sh.uy, sh.ux));
    }
    for (const q of S.parts) if (q.kind === "chip") rect(q.x - cam.x - 1, q.y - cam.y - 1, 2, 2, "#0b0b0d");
    // The dark, and the circle of light the torch holds back.
    const tx = S.torch[0] - cam.x, ty = S.torch[1] - cam.y, R = lightR();
    const dk = ctx.createRadialGradient(tx, ty, R * 0.22, tx, ty, R);
    dk.addColorStop(0, "rgba(4,4,6,0)"); dk.addColorStop(0.5, "rgba(4,4,6,0.42)"); dk.addColorStop(1, "rgba(4,4,6,0.94)");
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
    glow(tx, ty, R * 0.9, C.flame, 0.1);
    // The rock's edges catch the light.
    const rim = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
    rim.addColorStop(0, "rgba(255,190,110,0.75)"); rim.addColorStop(0.5, "rgba(232,128,58,0.35)"); rim.addColorStop(1, "rgba(232,128,58,0)");
    ctx.strokeStyle = rim; ctx.lineWidth = 1.4; ctx.stroke(P);
    for (const w of vis) drawTablet(w, cam, false);
    // The flame, the sparks, the smoke.
    if (!S.dying || S.dying < 1.2) drawFlame(tx, ty, F.on ? 1.3 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
    for (const q of S.parts) {
      const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
      if (q.kind === "ember") drawEmber(x, y, 1, a);
      else if (q.kind === "spark") { glow(x, y, 6, C.gold, a * 0.8); circle(x, y, 1, C.flameHot); }
      else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
      else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
    }
    // In the flare: the world gone pale and still, and the reach of the next step.
    if (F.on) {
      ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
      const [cx, cy] = middle();
      ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.35)", 1.2); ctx.setLineDash([]);
    }
    hud(hM);
  }
  function drawHook(x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    poly([3, 0, -4, -3.5, -2, 0, -4, 3.5], "#0b0b0d");
    ctx.restore();
  }
  const pad = (s) => ({ x: s < 0 ? 50 : W - 50, y: H - 50, r: 36 });
  const flareBtn = () => ({ x: W - 50, y: H - 132, r: 26 });
  function hud(hM) {
    const F = S.flare;
    text(hM + " m", 16, 30, { font: FONT.title, size: 20, weight: 700, color: "#fff", glow: "rgba(255,179,71,0.5)", blur: 10 });
    text("BEST " + Math.max(save.climbBest || 0, metres(S.top)) + " m", 16, 46, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
    pauseButton();
    const held = (s) => [...S.touches.values()].some((t) => t.pad === s) || (s < 0 ? S.keys.ArrowLeft || S.keys.KeyA : S.keys.ArrowRight || S.keys.KeyD);
    if (!usingKeys()) {
      for (const s of [-1, 1]) {
        const b = pad(s), on = held(s);
        circle(b.x, b.y, b.r, on ? "rgba(255,179,71,0.2)" : "rgba(8,8,10,0.4)");
        ring(b.x, b.y, b.r, on ? C.flame : "rgba(255,179,71,0.35)", 1.2);
        poly(s < 0 ? [b.x - 10, b.y, b.x + 6, b.y - 10, b.x + 6, b.y + 10] : [b.x + 10, b.y, b.x - 6, b.y - 10, b.x - 6, b.y + 10], on ? "#fff3dc" : "rgba(233,230,223,0.6)");
      }
    }
    const f = flareBtn(), can = S.fuel >= FLARE_COST + 0.06;
    circle(f.x, f.y, f.r, F.on ? "rgba(255,241,196,0.25)" : "rgba(8,8,10,0.45)");
    ring(f.x, f.y, f.r, F.on ? C.flameHot : can ? "rgba(255,179,71,0.55)" : "rgba(233,230,223,0.15)", 1.2);
    if (F.on) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 4, -PI / 2, -PI / 2 + TAU * (1 - F.t / FLARE_T)); ctx.strokeStyle = C.flameHot; ctx.lineWidth = 2; ctx.stroke(); }
    text(usingKeys() ? "F" : "FLARE", f.x, f.y + 4, { align: "center", size: usingKeys() ? 12 : 7.5, weight: 800, spacing: 1, color: can || F.on ? "#fff3dc" : "#77736c" });
    if (F.on) text("TAP: APPEAR THERE · " + (BLINKS - F.n) + " LEFT", W / 2, 24, { align: "center", size: 9, weight: 800, spacing: 2, color: C.flameHot });
    // The verse just read.
    if (S.verse) {
      const v = S.verse, a = clamp(v.t / 0.5, 0, 1) * clamp((7 - v.t) / 1, 0, 1), y = 64;
      const ls = wrap(v.v[3], Math.min(W - 220, 460), "italic 500 14px " + FONT.line);
      ls.forEach((l, i) => text(l, W / 2, y + i * 17, { align: "center", font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }));
      text(v.v[0] + "  " + v.v[1] + " · PSALM 118:" + v.v[2], W / 2, y + ls.length * 17 + 4, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.7)", alpha: a });
    }
    // How to climb, until he has.
    if (S.hintT < 14 || S.hooked < 2) {
      const a = clamp(S.hintT / 0.6, 0, 1) * (S.hooked >= 2 ? clamp((14 - S.hintT) / 1.5, 0, 1) : 1);
      const L = usingKeys()
        ? ["Click the rock: the hook flies there. Hold the click: the rope pulls you up.", "← → swing. Swing into a wall and hold toward it: cling. Away from it: kick off.", "Space: let go.  F: the flare. Then click anywhere near: appear there."]
        : ["Tap the rock: the hook flies there. Keep holding: the rope pulls you up.", "◀ ▶ swing. Swing into a wall and hold toward it: cling. Away from it: kick off.", "Tap the monk: let go.  FLARE, then tap anywhere near: appear there."];
      L.forEach((l, i) => text(l, W / 2, H - 58 + i * 15, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 240 }));
    }
    if (S.fuel < 0.25 && !S.dying) text("THE TORCH IS GUTTERING: FIND A VERSE", W / 2, H - 14, { align: "center", size: 8, weight: 800, spacing: 2, color: C.ember, alpha: 0.6 + 0.4 * Math.sin(S.rt * 6) });
  }

  // ---- Touch, mouse and keys ------------------------------------------------------------------------
  const inPad = (p, s) => { const b = pad(s); return !usingKeys() && dist(p.x, p.y, b.x, b.y) < b.r + 14; };
  const M = {
    start, edges, solid, island, get S() { return S; }, CELL, COLS, HOOK,
    step, draw,
    down(p, ev) {
      if (!S || S.dying) return;
      const id = ev && ev.pointerId !== undefined ? ev.pointerId : "m";
      for (const s of [-1, 1]) if (inPad(p, s)) { S.touches.set(id, { pad: s }); return; }
      const f = flareBtn(); if (dist(p.x, p.y, f.x, f.y) < f.r + 8) { if (S.flare.on) endFlare(); else startFlare(); return; }
      S.touches.set(id, { pad: 0 });
      const wx = p.x + S.cam.x, wy = p.y + S.cam.y, [cx, cy] = middle();
      if (S.flare.on) { if (dist(wx, wy, cx, cy) < 18) endFlare(); else blink(wx, wy); return; }
      if (dist(wx, wy, cx, cy) < 22 && (S.rope || S.cling)) { letGo(); return; }
      throwHook(wx, wy, id);
    },
    move(p, ev) {
      if (!S) return;
      const t = S.touches.get(ev && ev.pointerId !== undefined ? ev.pointerId : "m");
      if (t && t.pad) { if (inPad(p, -1)) t.pad = -1; else if (inPad(p, 1)) t.pad = 1; }
    },
    up(p, ev) {
      if (!S) return;
      const id = ev && ev.pointerId !== undefined ? ev.pointerId : "m";
      S.touches.delete(id);
      if (id === S.shotPtr) { S.shotPtr = null; S.reel = false; }
    },
    key(code, down) {
      if (!S) return;
      S.keys[code] = down;
      if (!down) return;
      if (code === "Escape" || code === "KeyP") M.pause();
      else if (code === "Space") letGo();
      else if (code === "KeyF") { if (S.flare.on) endFlare(); else startFlare(); }
    },
    pause() {
      if (mode !== M || S.dying) return;
      Pause.t = 0; mode = ClimbPause; Sound.muffle(true, 0.2);
    },
    resume() {
      mode = M; Sound.muffle(false, 0.2);
      S.touches.clear(); S.keys = {}; S.shotPtr = null; S.reel = false;
    },
    over() {
      const m = metres(S.top);
      return [["Height reached", m + " m"], ["Verses read", S.read], ["Your best", (save.climbBest || m) + " m"]];
    },
  };
  return M;
})();

// The pause for the climb.
const ClimbPause = {
  step(dt) { Pause.t += dt; },
  draw() {
    Climb.draw();
    rect(0, 0, W, H, "rgba(3,3,5,0.82)");
    const cx = Math.min(W * 0.26, 170), bw = 200;
    text("PAUSED", cx, 46, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    let y = 66;
    const b = (label, act, o) => { button(label, cx - bw / 2, y, bw, 30, act, o || {}); y += 38; };
    b("GO ON", () => Climb.resume(), { hot: true });
    b("BEGIN AGAIN", () => { Sound.muffle(false); Game.climb(); });
    b(Sound.muted ? "SOUND: OFF" : "SOUND: ON", () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); });
    b("BACK TO THE TITLE", () => Game.toTitle());
    const mx = Math.max(cx + bw / 2 + 24, W * 0.42);
    const mv = usingKeys()
      ? [["CLICK THE ROCK", "The hook flies there"], ["HOLD THE CLICK, OR W", "The rope pulls you up (S lets it out)"], ["← →  OR  A D", "Swing on the rope; walk on the ground"], ["INTO A WALL, HOLD TOWARD IT", "Cling. Away from it: kick off"], ["SPACE", "Let go"], ["F", "The flare: time all but stops"], ["IN THE FLARE, CLICK", "Appear there, even through rock"], ["THE VERSES ON THE ROCK", "Come near one: the torch is full again"]]
      : [["TAP THE ROCK", "The hook flies there"], ["KEEP HOLDING", "The rope pulls you up"], ["◀ ▶", "Swing on the rope; walk on the ground"], ["INTO A WALL, HOLD TOWARD IT", "Cling. Away from it: kick off"], ["TAP THE MONK", "Let go"], ["FLARE", "Time all but stops"], ["IN THE FLARE, TAP", "Appear there, even through rock"], ["THE VERSES ON THE ROCK", "Come near one: the torch is full again"]];
    const rh = Math.min(30, (H - 64) / mv.length);
    text("THE MOVES", mx, 40, { size: 9, weight: 800, spacing: 3, color: C.flame });
    mv.forEach(([k, what], i) => {
      const yy = 60 + i * rh;
      text(k, mx, yy, { size: 8.5, weight: 800, spacing: 1, color: "#f1ede4", max: W - mx - 16 });
      text(what, mx, yy + 11, { size: 8.5, weight: 500, color: "#b9b3a6", max: W - mx - 16 });
    });
  },
  key(code, down) { if (down && (code === "Escape" || code === "KeyP" || code === "Enter")) Climb.resume(); },
};
