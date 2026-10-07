"use strict";
// While You Have the Light: the endless climb, a first build: the climbing alone, no demons yet.
// The mountain goes up for ever, made by rules as he climbs: shafts, and between them long
// crossings with a ceiling to swing from and pits too wide to walk (never by chance alone: a
// clear way up always stays open, and rock to hook is always within the rope's reach). The
// torch is the clock: its light shrinks as it burns, the rock throws its shadows, and the
// verses of Psalm 118 cut into the rock fill it again, one stanza after another, Aleph to Tau.
//
// Touch: tap the rock and he throws the hook there, in an arc. Both thumb pads together: climb
// the rope (against a wall he walks up it, hand over hand, the torch in his teeth). One pad:
// swing on it (or walk, slow and careful, on the ground); swing into a wall and hold toward it
// to cling. At a ledge he pulls himself up, as in the arena. The button above the right pad is
// for everything else: on the rope, let go (at the top of a swing, a flip and a moment hung in
// the air); on the ground, a jump; on a wall, a leap off it. Held down: the flare. Time
// all but stops, and each tap puts him there, through rock if need be.
// Keys: click to throw the hook, arrows or A/D to swing and cling, W (or both arrows) to climb
// the rope and S to let it out, Space for the button, F to flare, Esc to pause.

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
  const CELL = 16, COLS = 76, MPX = 27;           // a cell; the world's width in cells; pixels to a metre
  const GRAV = 760, VMAX = 900, WALK = 70, AIR = 110, PUMP = 430;
  const HOOK = 280, HOOK_V = 820, CLIMB_V = 72, PAYOUT = 110, ROPE_MIN = 40, ROPE_MAX = 340, GRIP = 42;
  const CLING_HOLD = 2.5, CLING_SLIDE = 55;
  const BURN = 1 / 150;                            // a full torch lasts two and a half minutes, all the way up
  const FLARE_R = 280, FLARE_T = 3, FLARE_SLOW = 0.12, FLARE_COST = 0.08, BLINK_COST = 0.035, BLINKS = 4;
  const HOLD_FLARE = 0.35;                         // holding the button this long: the flare
  const HW = 7, HT = 44;                           // half the monk's width; his height
  const SLOT = 10, TH = 18;                        // rows to each place a platform may stand; a crossing's height
  const sideC = (s) => (s < 0 ? 19 : COLS - 20);   // the middle of a shaft on the left or the right

  // ---- The mountain, made by rules ----------------------------------------------------------------
  // It goes up in sections: a shaft on one side, then a crossing to a shaft on the other side,
  // and so on for ever. Rows are counted up from the floor (h = -j).
  //  Shafts: row j is open from column L to column R. The way meanders slowly, so each row's
  //  opening overlaps the next by several cells, and it is never narrower than six cells.
  //  Platforms stand in a shaft only where they leave three clear cells on both sides.
  //  Crossings: a long tunnel from the top of one shaft to the foot of the next, with a rock
  //  ceiling to swing from and pits in its floor too wide to walk and too deep to climb out of
  //  without the rope (but never deeper than the rope can reach the ceiling from).
  let seed = 1, PH = [0, 0, 0], rows = new Map(), slots = new Map();
  const secs = [], walls = [];
  function ensureSecs(n) {
    while (secs.length <= n) {
      const k = secs.length, prev = secs[k - 1];
      if (!prev) secs.push({ type: "shaft", h0: 1, h1: 44, side: -1, k });
      else if (prev.type === "shaft") secs.push({ type: "trav", h0: prev.h1 + 1, h1: prev.h1 + TH, from: prev.side, k });
      else secs.push({ type: "shaft", h0: prev.h1 + 1, h1: prev.h1 + 34 + Math.floor(hash2(k, 20, seed) * 22), side: -prev.from, k });
    }
  }
  function sectionAt(h) {
    if (h < 1) h = 1;
    while (!secs.length || secs[secs.length - 1].h1 < h) ensureSecs(secs.length);
    let lo = 0, hi = secs.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (secs[m].h1 < h) lo = m + 1; else hi = m; }
    return secs[lo];
  }
  function edges(j) {
    let r = rows.get(j); if (r) return r;
    const h = -j, sec = sectionAt(h), k = Math.min(1, h / 900);
    const c = sideC(sec.side) + 4.5 * Math.sin(h * 0.05 + PH[0]) + 2 * Math.sin(h * 0.13 + PH[1]);
    const hw = 5 + k + 3 * (0.5 + 0.5 * Math.sin(h * 0.061 + PH[2]));
    let L = Math.round(c - hw) + Math.floor(hash2(h, 1, seed) * 1.7);
    let R = Math.round(c + hw) - Math.floor(hash2(h, 2, seed) * 1.7);
    // Shelves out from the walls, two rows deep: something to climb onto.
    const b = Math.floor(h / 3);
    if (h > 10 && h % 3 < 2 && h - sec.h0 >= 4 && sec.h1 - h >= 4) {
      if (hash2(b, 3, seed) < 0.2) L += 2 + Math.floor(hash2(b, 4, seed) * 3);
      if (hash2(b, 5, seed) < 0.2) R -= 2 + Math.floor(hash2(b, 6, seed) * 3);
    }
    if (R - L < 5) { const m = Math.round((L + R) / 2); L = m - 3; R = m + 3; }
    L = clamp(L, 2, COLS - 9); R = clamp(R, L + 5, COLS - 3);
    r = { L, R }; rows.set(j, r); return r;
  }
  function island(s) {
    if (slots.has(s)) return slots.get(s);
    let isl = null;
    const h0 = s * SLOT + 2 + Math.floor(hash2(s, 7, seed) * 5), k = Math.min(1, h0 / 900), sec = sectionAt(h0);
    const ih = hash2(s, 9, seed) < 0.3 ? 2 : 1, iw = 3 + Math.floor(hash2(s, 10, seed) * 4);
    if (h0 > 8 && sec.type === "shaft" && h0 - 3 >= sec.h0 && h0 + ih + 2 <= sec.h1 && hash2(s, 8, seed) < 0.72 - 0.2 * k) {
      let lo = -1e9, hi = 1e9;
      for (let h = h0 - 1; h <= h0 + ih; h++) { const e = edges(-h); lo = Math.max(lo, e.L + 3); hi = Math.min(hi, e.R - 3 - iw + 1); }
      if (hi >= lo) { const x0 = Math.round(lerp(lo, hi, hash2(s, 11, seed))); isl = { x0, x1: x0 + iw - 1, h0, h1: h0 + ih - 1 }; }
    }
    slots.set(s, isl); return isl;
  }
  function trav(sec) {
    if (sec.info) return sec.info;
    const en = edges(-(sec.h0 - 1)), ex = edges(-(sec.h1 + 1));
    const dir = ex.L + ex.R > en.L + en.R ? 1 : -1, a = Math.min(en.L, ex.L), b = Math.max(en.R, ex.R);
    const pit = new Uint8Array(COLS), stop = dir > 0 ? ex.L - 3 : ex.R + 3, before = (i) => (dir > 0 ? i < stop : i > stop);
    let i = dir > 0 ? en.R + 1 : en.L - 1, n = 0, floor = true;
    while (before(i)) {
      const len = floor ? 3 + Math.floor(hash2(sec.k, 40 + n, seed) * 3) : 5 + Math.floor(hash2(sec.k, 60 + n, seed) * 4);
      for (let q = 0; q < len && before(i); q++, i += dir) if (!floor) pit[i] = 1;
      floor = !floor; n++;
    }
    return (sec.info = { en, ex, a, b, dir, pit });
  }
  function travSolid(i, h, sec) {
    const T = trav(sec), r = h - sec.h0, inEx = i >= T.ex.L && i <= T.ex.R;
    if (i < T.a || i > T.b) return true;
    if (r <= 7) return !((i >= T.en.L && i <= T.en.R) || (r >= 1 && T.pit[i]));     // the floor, the pits, the way in
    if (r <= 15) return !inEx && r > 15 - (hash2(i >> 1, sec.k, 31) < 0.3 ? 1 : 0) - (hash2(i >> 2, sec.k, 37) < 0.2 ? 1 : 0);
    return !inEx;                                                                    // the ceiling, and the way out
  }
  function solid(i, j) {
    if (j >= 0 || i < 1 || i >= COLS - 1) return true;
    const h = -j, sec = sectionAt(h);
    if (sec.type === "trav") return travSolid(i, h, sec);
    const e = edges(j); if (i < e.L || i > e.R) return true;
    const isl = island(Math.floor(h / SLOT));
    return !!isl && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 && i <= isl.x1;
  }
  const solidAt = (x, y) => solid(Math.floor(x / CELL), Math.floor(y / CELL));
  // The verses on the walls: one in each shaft, about halfway up.
  function wallAt(n) {
    while (walls.length <= n) {
      const m = walls.length; ensureSecs(m * 2);
      const sec = secs[m * 2], h = m === 0 ? 24 : sec.h0 + Math.floor((sec.h1 - sec.h0) * 0.5);
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
  const near = (s, gap) => boxHit(S.x + s * (gap || 1.5), S.y - 2);
  const grip = () => [S.x, S.y - GRIP];
  const middle = () => [S.x, S.y - HT / 2];

  // ---- Ledges: stepping up, climbing up -------------------------------------------------------------
  // The top of the rock just beyond his side s, between lo and hi above his feet, with room to
  // stand on it. edge is the near corner of the ledge; x1 where he will stand.
  function ledge(s, lo, hi, reachOut) {
    for (const off of reachOut ? [3, 9, 15] : [3]) {
      const ci = Math.floor((S.x + s * (HW + off)) / CELL);
      for (let j = Math.floor((S.y - hi) / CELL); j <= Math.floor((S.y - lo) / CELL); j++) {
        if (!solid(ci, j) || solid(ci, j - 1) || solid(ci, j - 2) || solid(ci, j - 3)) continue;
        const top = j * CELL, edge = s > 0 ? ci * CELL : (ci + 1) * CELL, x1 = edge + s * 12;
        if (!boxHit(x1, top - 0.01) && !boxHit(edge - s * 8, top - 2)) return { top, edge, x1, s, h: S.y - top };
      }
    }
    return null;
  }
  function startAct(kind, L) {
    const dur = kind === "stepUp" ? 0.36 : kind === "climbUp" ? 1.3 + 0.05 * Math.round(L.h / CELL) : 0.95;
    S.act = { kind, u: 0, dur, x0: S.x, y0: S.y, x1: L.x1, y1: L.top - 0.01, edge: L.edge, s: L.s };
    S.dir = L.s; S.vx = 0; S.vy = 0; S.cling = 0; S.rope = null; S.shot = null; S.climbing = false;
    if (kind !== "stepUp") Sound.fx.grab();
  }
  // Where his feet are at u through a move (the arena's climb, from the ground or from a hang).
  function actRoot(a, u) {
    const { x0, y0, x1, y1, edge, s } = a;
    if (a.kind === "stepUp") { const k = smooth(u); return [lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(u * PI) * 6]; }
    const reach = Arena.reach(), hangX = edge - s * 7, hangY = a.kind === "ledge" ? y1 + reach : Math.min(y0, y1 + reach);
    if (a.kind === "ledge") {
      // From wherever he hung: in to the edge, then the climb from its hang onward.
      if (u < 0.15) { const k = ease(u / 0.15); return [lerp(x0, hangX, k), lerp(y0, hangY, k)]; }
      u = 0.38 + 0.62 * (u - 0.15) / 0.85;
    } else {
      if (u < 0.18) return [x0, y0];
      if (u < 0.38) { const k = ease((u - 0.18) / 0.2); return [lerp(x0, hangX, k), lerp(y0, hangY, k)]; }
    }
    if (u < 0.55) return [hangX, hangY + Math.sin((u - 0.38) * 30) * 0.6];
    if (u < 0.85) { const k = smooth((u - 0.55) / 0.3); return [lerp(hangX, edge + s * 4, k * k), lerp(hangY, y1, k)]; }
    return [lerp(edge + s * 4, x1, smooth((u - 0.85) / 0.15)), y1];
  }
  const actPoseU = (a) => (a.kind === "ledge" ? (a.u < 0.15 ? 0.38 : 0.38 + 0.62 * (a.u - 0.15) / 0.85) : a.u);
  function stepAct(dt) {
    const a = S.act; a.u = Math.min(1, a.u + dt / a.dur);
    const pu = actPoseU(a);
    if (a.kind !== "stepUp" && !a.pulled && pu > 0.6) { a.pulled = true; Sound.fx.climb(); }
    if (a.u >= 1) {
      S.x = a.x1; S.y = a.y1; S.act = null; S.ground = true; S.vx = 0; S.vy = 0;
      if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
      return;
    }
    const [x, y] = actRoot(a, a.u); S.x = x; S.y = y;
  }

  // ---- Starting, and the end -------------------------------------------------------------------------
  function start() {
    seed = (Math.random() * 1e9) | 0; rows = new Map(); slots = new Map(); walls.length = 0; secs.length = 0;
    const r = seeded(seed); PH = [r() * TAU, r() * TAU, r() * TAU];
    const e = edges(-2), x = (e.L + e.R + 1) / 2 * CELL;
    S = {
      x, y: -0.01, vx: 0, vy: 0, dir: 1, ground: true, cling: 0, clingT: 0, landT: 0, anim: 0, act: null,
      rope: null, shot: null, climbing: false, climbPh: 0, throwT: 0, throwA: 0, ropeVis: [], shotVis: [],
      fuel: 1, t: 0, rt: 0, top: 0, read: 0, dying: 0, level: 0,
      flare: { on: false, t: 0, n: 0 }, parts: [], ghosts: [], verse: null,
      cam: { x: clamp(x - W / 2, 0, COLS * CELL - W), y: 70 - H }, torch: [x, -50], light: null,
      touches: new Map(), keys: {}, hooked: 0, hintT: 0, lastDraw: 0, flip: null, hangT: 0, jumpT: 0, two: null, wall: 0,
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
    if (m > (save.climbBest || 0)) save.climbBest = m;
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
  // He throws it: it flies in an arc to the rock. The throw forgives a little: if the line
  // misses, the nearest line within 24 degrees that meets rock is taken instead.
  function throwHook(tx, ty) {
    const [gx, gy] = grip(), a0 = Math.atan2(ty - gy, tx - gx);
    let a = a0, d = rayRock(gx, gy, a0);
    for (let k = 1; !d && k <= 8; k++) {
      if ((d = rayRock(gx, gy, a0 - k * 0.052))) a = a0 - k * 0.052;
      else if ((d = rayRock(gx, gy, a0 + k * 0.052))) a = a0 + k * 0.052;
    }
    const L = d || HOOK, ux = Math.cos(a), uy = Math.sin(a);
    S.shot = { ox: gx, oy: gy, tx: gx + ux * L, ty: gy + uy * L, ux, uy, hit: !!d, t: 0, T: 0.08 + L / HOOK_V, lift: L * 0.22 * Math.abs(ux), x: gx, y: gy, ph: "fly" };
    S.shotVis = [];
    S.throwT = 0.32; S.throwA = a; if (Math.abs(ux) > 0.15) S.dir = sign(ux);
    Sound.fx.throw(0.45);
  }
  function flyShot(dt) {
    const sh = S.shot;
    if (sh.ph === "fly") {
      sh.t += dt; const k = Math.min(1, sh.t / sh.T);
      sh.x = lerp(sh.ox, sh.tx, k); sh.y = lerp(sh.oy, sh.ty, k) - Math.sin(PI * k) * sh.lift;
      if (k < 1) return;
      if (sh.hit) {
        const [gx, gy] = grip();
        S.rope = { x: sh.tx, y: sh.ty, len: clamp(dist(gx, gy, sh.tx, sh.ty), ROPE_MIN, ROPE_MAX) };
        S.ropeVis = S.shotVis; S.shot = null; S.hooked++;
        Sound.fx.tether();
        for (let q = 0; q < 5; q++) S.parts.push({ kind: "chip", x: sh.tx, y: sh.ty, vx: (Math.random() - 0.5) * 120 - sh.ux * 60, vy: (Math.random() - 0.5) * 120 - sh.uy * 60, life: 0.4, age: 0 });
      } else { sh.ph = "drop"; sh.t = 0; sh.vx = sh.ux * 160; sh.vy = sh.uy * 160; }
      return;
    }
    sh.t += dt;
    if (sh.ph === "drop") { sh.vy += 900 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; if (sh.t > 0.3 || solidAt(sh.x, sh.y)) { sh.ph = "back"; sh.t = 0; sh.bx = sh.x; sh.by = sh.y; } return; }
    const [gx, gy] = grip(), k = Math.min(1, sh.t / 0.28);
    sh.x = lerp(sh.bx, gx, ease(k)); sh.y = lerp(sh.by, gy, ease(k));
    if (k >= 1) S.shot = null;
  }
  // The one button: let go of the rope, jump, or leap off the wall.
  function action() {
    if (!S || S.dying || S.act || S.flare.on) return;
    if (S.rope && !S.ground) {
      // Let go with all the swing's speed. At the top of a swing: a flip, and a moment hung in the air.
      S.rope = null; S.climbing = false; Sound.fx.tetherBreak();
      const sp = Math.hypot(S.vx, S.vy);
      if (sp > 110) { S.vy -= 90; S.flip = { t: 0, s: sign(S.vx || S.dir) }; Sound.fx.whoosh(0.6); }
      if (Math.abs(S.vy) < 170 && sp > 60) S.hangT = 0.3;
    } else if (S.cling) {
      const s = S.cling; S.cling = 0; S.vx = -s * 210; S.vy = -360; S.dir = -s; S.flip = { t: 0, s: -s, half: true }; Sound.fx.kick(0.6);
    } else if (S.ground) {
      if (S.rope) { S.rope = null; Sound.fx.tetherBreak(); }
      S.vy = -340; S.ground = false; S.jumpT = 0.6; S.landT = 0; Sound.fx.whoosh(0.4);
    } else if (S.rope) { S.rope = null; Sound.fx.tetherBreak(); }
  }
  // The rope as it hangs: a chain of points, falling, held at both ends, never longer than the rope.
  function hangRope(P, ax, ay, bx, by, len, dt) {
    const N = 14, seg = len / (N - 1);
    if (P.length !== N) { P.length = 0; for (let k = 0; k < N; k++) { const x = lerp(ax, bx, k / (N - 1)), y = lerp(ay, by, k / (N - 1)); P.push({ x, y, px: x, py: y }); } }
    const g = 900 * dt * dt;
    for (let k = 1; k < N - 1; k++) { const p = P[k], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g; }
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
  }

  // ---- The flare -------------------------------------------------------------------------------------
  function startFlare() {
    if (S.dying || S.flare.on) return;
    if (S.fuel < FLARE_COST + 0.06) { Sound.fx.gutter(); return; }
    S.fuel -= FLARE_COST; S.flare = { on: true, t: 0, n: 0 }; S.shot = null; S.climbing = false;
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
    S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
    puff(cx, cy, 14, false);
    S.x = spot[0]; S.y = spot[1]; S.vx = 0; S.vy = -40; S.rope = null; S.shot = null; S.cling = 0; S.climbing = false; S.act = null;
    S.ground = boxHit(S.x, S.y + 1);
    puff(S.x, S.y - HT / 2, 10, true);
    S.parts.push({ kind: "ring", x: S.x, y: S.y - HT / 2, life: 0.5, age: 0, real: true });
    Sound.fx.zip();
    S.flare.n++;
    if (S.flare.n >= BLINKS) endFlare();
  }

  // ---- Each frame --------------------------------------------------------------------------------------
  function pads() {
    let l = false, r = false;
    for (const t of S.touches.values()) { if (t.pad < 0) l = true; if (t.pad > 0) r = true; }
    if (S.keys.ArrowLeft || S.keys.KeyA) l = true;
    if (S.keys.ArrowRight || S.keys.KeyD) r = true;
    return { l, r, d: (r ? 1 : 0) - (l ? 1 : 0), both: l && r };
  }
  function physics(dt) {
    const I = pads(), d = I.d, wasGround = S.ground, vyIn = S.vy;
    if (S.shot) flyShot(dt);
    const R = S.rope;
    // Both thumbs (or up): climb the rope, hand over hand. Down: let it out.
    S.climbing = !!R && (I.both || S.keys.ArrowUp || S.keys.KeyW);
    if (R && S.climbing) { R.len = Math.max(ROPE_MIN, R.len - CLIMB_V * dt); S.climbPh += dt * 9; }
    if (R && (S.keys.ArrowDown || S.keys.KeyS)) R.len = Math.min(ROPE_MAX, R.len + PAYOUT * dt);
    const [gx, gy] = grip(), rd = R ? dist(gx, gy, R.x, R.y) : 0, taut = R && rd >= R.len - 1;
    // At the top of the rope, or with a ledge at his hands: he pulls himself up onto it.
    if (!S.ground) {
      let L = null;
      if (S.cling) L = ledge(S.cling, 26, 78);
      else if (S.climbing) L = ledge(S.dir, 26, 78, R.len <= ROPE_MIN + 6) || ledge(-S.dir, 26, 78, R.len <= ROPE_MIN + 6);
      else if (d && near(d, 4)) L = ledge(d, 26, 78);
      if (L) { startAct("ledge", L); return; }
    }
    // Clinging: still against the wall, then sliding slowly. Away from the wall: a kick off it.
    if (S.cling) {
      const s = S.cling; S.clingT += dt;
      if (!near(s) || (taut && S.climbing)) S.cling = 0;
      else if (d !== s) S.cling = 0;
      else {
        S.vx = 0; S.vy = S.clingT > CLING_HOLD ? CLING_SLIDE : 0;
        if (moveY(S.vy * dt) > 0) { S.cling = 0; S.ground = true; }
        return;
      }
    }
    if (S.ground && !(taut && S.climbing)) {
      // Walking: careful and heavy. Into a step, he steps up; into a ledge he can reach, he climbs.
      const want = S.landT > 0 ? 0 : d * WALK;
      S.vx += clamp(want - S.vx, -500 * dt, 500 * dt);
      if (d) S.dir = d;
      if (d && S.landT <= 0 && near(d, 2)) {
        const L = ledge(d, 8, 86);
        if (L) { startAct(L.h <= 20 ? "stepUp" : "climbUp", L); return; }
      }
    } else if (!S.ground) {
      if (taut && d) {
        // Pumping the swing: a push along the arc, the way the thumb says.
        const nx = (gx - R.x) / rd, ny = (gy - R.y) / rd; let tx = -ny, ty = nx;
        if (tx * d < 0) { tx = -tx; ty = -ty; }
        S.vx += tx * PUMP * dt; S.vy += ty * PUMP * dt;
      } else if (d && S.vx * d < 160) S.vx += d * AIR * dt;
      const drag = 1 - 0.1 * dt; S.vx *= drag; S.vy *= drag;
    }
    S.vy += GRAV * dt;
    const sp = Math.hypot(S.vx, S.vy); if (sp > VMAX) { S.vx *= VMAX / sp; S.vy *= VMAX / sp; }
    // On the ground the rope pays out as he walks, unless he is climbing it.
    if (R && S.ground && !S.climbing) R.len = clamp(rd, ROPE_MIN, ROPE_MAX);
    const n = clamp(Math.ceil(Math.max(Math.abs(S.vx), Math.abs(S.vy)) * dt / 6), 1, 10), h = dt / n;
    let side = 0;
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
      if (moveY(S.vy * h)) S.vy = 0;
      if (S.rope) {
        const [qx, qy] = grip(), L = dist(qx, qy, S.rope.x, S.rope.y);
        if (L > S.rope.len) {
          const nx = (qx - S.rope.x) / L, ny = (qy - S.rope.y) / L, e = L - S.rope.len;
          if (moveX(-nx * e)) side = -sign(nx); moveY(-ny * e);
        }
      }
    }
    S.ground = S.vy >= 0 && boxHit(S.x, S.y + 1);
    if (S.ground && !wasGround && vyIn > 300) { S.landT = vyIn > 620 ? 0.5 : 0.32; S.landMax = S.landT; Sound.fx.land(clamp(vyIn / 700, 0.3, 1)); }
    // Into a wall in the air, holding toward it: cling.
    if (!S.ground && d && near(d) && !S.climbing && !S.cling) { S.cling = d; S.clingT = 0; S.dir = d; S.vx = 0; S.vy = 0; Sound.fx.grab(); }
    if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }

  function step(dt) {
    S.rt += dt;
    if (S.dying) { S.dying += dt; if (S.dying > 1.7) { finish(); return; } }
    const F = S.flare;
    if (F.on) { F.t += dt; if (F.t > FLARE_T) endFlare(); }
    if (S.hangT > 0) S.hangT -= dt;
    // The button held down: the flare.
    for (const t of S.touches.values()) if (t.act && !t.fired && S.rt - t.t0 > HOLD_FLARE) { t.fired = true; if (!S.flare.on) startFlare(); }
    const wdt = dt * (F.on ? FLARE_SLOW : S.hangT > 0 ? 0.5 : 1);
    S.t += wdt;
    if (!S.dying) {
      if (!F.on) S.fuel -= dt * BURN;
      if (S.fuel <= 0) lightOut();
      else if (S.fuel < 0.15 && Math.floor(S.rt * 0.8) !== Math.floor((S.rt - dt) * 0.8)) Sound.fx.gutter();
    }
    if (!S.dying) { if (S.act) { if (S.shot) flyShot(wdt); stepAct(wdt); } else physics(wdt); }
    S.landT = Math.max(0, S.landT - wdt); S.throwT = Math.max(0, S.throwT - wdt); S.jumpT = Math.max(0, (S.jumpT || 0) - wdt);
    if (S.flip) { S.flip.t += wdt; if (S.flip.t > (S.flip.half ? 0.4 : 0.6) || S.ground || S.rope || S.cling || S.act) S.flip = null; }
    // Against a wall, climbing the rope: he walks up it.
    S.wall = 0;
    if (S.climbing && !S.ground && S.rope) { if (near(S.dir, 7)) S.wall = S.dir; else if (near(-S.dir, 7)) S.wall = -S.dir; }
    S.anim += wdt * (S.ground ? Math.abs(S.vx) / 62 : 1.2);
    if (S.rope && !S.ground && !S.cling && Math.abs(S.vx) > 30) S.dir = sign(S.vx);
    S.top = Math.max(S.top, -S.y);
    // The verses: come near one and the torch is full again.
    const [mx, my] = middle(), hNow = -S.y / CELL;
    for (let n = 0; ; n++) {
      const w = wallAt(n); if (w.h > hNow + 40) break;
      w.lit = Math.max(0, w.lit - dt * 0.5);
      if (w.read || w.h < hNow - 40) continue;
      const p = wallPos(w);
      if (dist(mx, my, p.x, p.y) < 70 && !S.dying) {
        w.read = true; w.lit = 1; S.fuel = 1; S.read++;
        S.verse = { v: CLIMB_VERSES[w.n % 22], t: 0 };
        Sound.fx.unlock();
        for (let k = 0; k < 16; k++) S.parts.push({ kind: "spark", x: p.x, y: p.y + (Math.random() - 0.5) * 30, vx: -w.side * (30 + Math.random() * 90), vy: -20 - Math.random() * 80, life: 0.9, age: 0, real: true });
      }
    }
    if (S.verse) { S.verse.t += dt; if (S.verse.t > 7) S.verse = null; }
    const lv = Math.min(4, Math.floor(metres(S.top) / 40));
    if (lv !== S.level && !S.dying) { S.level = lv; Sound.setLevel(lv); }
    // The camera: a little below the middle, so more of the way up shows; ahead of him in a crossing.
    const sec = sectionAt(Math.max(1, Math.floor(hNow))), look = sec.type === "trav" ? trav(sec).dir * 90 : 0;
    const tx = clamp(S.x + look - W / 2, 0, COLS * CELL - W), ty = Math.min(S.y - HT / 2 - H * (sec.type === "trav" ? 0.5 : 0.58), 70 - H);
    S.cam.x += (tx - S.cam.x) * (1 - Math.exp(-dt * 4)); S.cam.y += (ty - S.cam.y) * (1 - Math.exp(-dt * 4));
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
    let R = 50 + 210 * Math.pow(f, 0.75);
    if (S.flare.on) R = Math.max(R, FLARE_R + 30);
    return R;
  }
  // What the torch can see: rays cast through the grid of rock, each stopping a little way into
  // the first rock it meets (so the faces it lights are lit).
  function visPoly(ox, oy, R) {
    const N = 180, pts = new Float32Array(N * 2), i0 = Math.floor(ox / CELL), j0 = Math.floor(oy / CELL), inRock = solid(i0, j0);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU, dx = Math.cos(a), dy = Math.sin(a), sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
      const tdx = Math.abs(CELL / (dx || 1e-9)), tdy = Math.abs(CELL / (dy || 1e-9));
      let i = i0, j = j0, tmx = dx > 0 ? ((i + 1) * CELL - ox) / dx : dx < 0 ? (ox - i * CELL) / -dx : 1e9;
      let tmy = dy > 0 ? ((j + 1) * CELL - oy) / dy : dy < 0 ? (oy - j * CELL) / -dy : 1e9, d = R;
      if (!inRock) while (true) {
        let t; if (tmx < tmy) { t = tmx; tmx += tdx; i += sx; } else { t = tmy; tmy += tdy; j += sy; }
        if (t > R) break;
        if (solid(i, j)) { d = Math.min(R, t + 5); break; }
      }
      pts[k * 2] = ox + dx * d; pts[k * 2 + 1] = oy + dy * d;
    }
    return pts;
  }
  let DK = null;
  function darkness(cam, tx, ty, R) {
    const k = 0.5, w = Math.ceil(W * k), h = Math.ceil(H * k);
    if (!DK) DK = document.createElement("canvas");
    if (DK.width !== w || DK.height !== h) { DK.width = w; DK.height = h; }
    const g = DK.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(4,4,6,0.95)"; g.fillRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, 0, 0); g.globalCompositeOperation = "destination-out";
    const gr = g.createRadialGradient(tx, ty, 0, tx, ty, R);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.3, "rgba(0,0,0,0.95)"); gr.addColorStop(0.65, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fill(S.light);
    g.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true; ctx.drawImage(DK, 0, 0, W, H);
  }
  // The rock as one path: the walls with craggy faces, the platforms, the crossings, the floor.
  function rockPath(cam) {
    const j0 = Math.floor(cam.y / CELL) - 1, j1 = Math.min(-1, Math.floor((cam.y + H) / CELL) + 1);
    const P = new Path2D(), X = (x) => x - cam.x, Y = (y) => y - cam.y, i0 = Math.max(0, Math.floor(cam.x / CELL) - 1), i1 = Math.min(COLS - 1, Math.floor((cam.x + W) / CELL) + 1);
    const jig = (j, k) => (hash2(j, k, 99) - 0.5) * 5;
    // Shaft rows: the two walls as long craggy runs; crossing rows: cell by cell, merged along each row.
    let run = null;
    const flush = (side) => {
      if (!run) return;
      const lx = side < 0 ? -60 : COLS * CELL + 60;
      P.moveTo(X(lx), Y(run.j0 * CELL));
      for (const q of run.pts) P.lineTo(X(q[0]), Y(q[1]));
      P.lineTo(X(lx), Y((run.j1 + 1) * CELL)); P.closePath();
    };
    for (const side of [-1, 1]) {
      run = null;
      for (let j = j0; j <= j1; j++) {
        const sec = sectionAt(-j);
        if (sec.type !== "shaft") { flush(side); run = null; continue; }
        const e = edges(j), x = side < 0 ? e.L * CELL : (e.R + 1) * CELL, ka = side < 0 ? 1 : 3;
        if (!run) run = { j0: j, j1: j, pts: [] };
        run.j1 = j; run.pts.push([x + jig(j, ka), j * CELL + 2], [x + jig(j, ka + 1), j * CELL + CELL - 2]);
      }
      flush(side);
    }
    for (let j = j0; j <= j1; j++) {
      const sec = sectionAt(-j);
      if (sec.type !== "trav") continue;
      let a = -1;
      for (let i = i0 - 1; i <= i1 + 1; i++) {
        const sd = i < i0 || i > i1 ? solid(Math.max(0, Math.min(COLS - 1, i)), j) : solid(i, j);
        if (sd && a < 0) a = i;
        if ((!sd || i === i1 + 1) && a >= 0) {
          const b = sd ? i : i - 1, xa = a <= i0 - 1 ? -60 : a * CELL, xb = b >= i1 + 1 ? COLS * CELL + 60 : (b + 1) * CELL;
          const up = !solid(a, j - 1), dn = !solid(a, j + 1);
          P.moveTo(X(xa + jig(j, a)), Y(j * CELL - (up ? 0.5 : 1))); P.lineTo(X(xb + jig(j, b + 7)), Y(j * CELL - (up ? 0.5 : 1)));
          P.lineTo(X(xb + jig(j + 1, b + 7)), Y(j * CELL + CELL + (dn ? 0.5 : 1))); P.lineTo(X(xa + jig(j + 1, a)), Y(j * CELL + CELL + (dn ? 0.5 : 1))); P.closePath();
          a = -1;
        }
      }
    }
    for (let s = Math.floor(-j1 / SLOT) - 1; s <= Math.floor(-j0 / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl) continue;
      const x0 = isl.x0 * CELL, x1 = (isl.x1 + 1) * CELL, y0 = -(isl.h1 + 1) * CELL, y1 = -isl.h0 * CELL, q = (k) => (hash2(s, k, 77) - 0.5) * 4;
      P.moveTo(X(x0 + 2), Y(y0 + q(2) * 0.4)); P.lineTo(X((x0 + x1) / 2 + q(3)), Y(y0 - 1)); P.lineTo(X(x1 - 2), Y(y0 + 0.5));
      P.lineTo(X(x1 + 1 + q(6) * 0.4), Y((y0 + y1) / 2)); P.lineTo(X(x1 - 4 + q(7)), Y(y1 + 2 + Math.abs(q(8)))); P.lineTo(X((x0 + x1) / 2 + q(9)), Y(y1 + 6 + Math.abs(q(10))));
      P.lineTo(X(x0 + 3), Y(y1 + 2 + Math.abs(q(11)))); P.lineTo(X(x0 - 1 + q(12) * 0.4), Y((y0 + y1) / 2)); P.closePath();
    }
    if (cam.y + H > -2) {
      P.moveTo(X(-60), Y(0)); for (let x = 0; x <= COLS * CELL; x += 24) P.lineTo(X(x), Y(jig(x, 5) * 0.6 + 1)); P.lineTo(X(COLS * CELL + 60), Y(0));
      P.lineTo(X(COLS * CELL + 60), Y(Math.max(0, cam.y + H) + 10)); P.lineTo(X(-60), Y(Math.max(0, cam.y + H) + 10)); P.closePath();
    }
    return P;
  }
  function drawTablet(w, cam, unlit) {
    const p = wallPos(w), x = p.x - cam.x, y = p.y - cam.y, s = w.side;
    if (y < -60 || y > H + 60) return;
    const x0 = s < 0 ? x - 2 : x - 20;
    if (unlit) {
      rect(x0, y - 17, 22, 34, "#1c1b19");
      ctx.globalAlpha = 0.5; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, "#5a554a"); ctx.globalAlpha = 1;
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(S.rt * 2.2 + w.n);
    if (!w.read) {
      glow(x + s * -10, y, 46, C.gold, 0.22 + 0.12 * pulse);
      ctx.globalAlpha = 0.55 + 0.25 * pulse; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1;
    } else if (w.lit > 0) glow(x + s * -10, y, 70, C.flameHot, 0.4 * w.lit);
    else { ctx.globalAlpha = 0.18; for (let k = 0; k < 6; k++) rect(x0 + 4, y - 12 + k * 4.6, 14 - (k % 3) * 2, 1.2, C.gold); ctx.globalAlpha = 1; }
  }
  // Walking up the wall on the rope: leaning back from it, feet planted on the rock in turn, hand
  // over hand up the rope (the torch in his teeth).
  function wallWalk(ph) {
    const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v);
    return S_({ lean: -0.55, head: -0.5, sF: 2.7 + 0.28 * a, eF: 0.25 + 0.35 * up(a), sB: 2.7 + 0.28 * b, eB: 0.25 + 0.35 * up(b), tq: 0,
      hF: 1.25 + 0.45 * up(a), kF: 1.0 + 0.7 * up(a), hB: 1.25 + 0.45 * up(b), kB: 1.0 + 0.7 * up(b) });
  }
  function monkPose() {
    const t = S.t;
    if (S.dying) return MONK_ANIM.fall(0.3);
    if (S.act) return S.act.kind === "stepUp" ? MONK_ANIM.stepUp(S.act.u) : MONK_ANIM.climbUp(actPoseU(S.act));
    let p;
    if (S.cling) p = MONK_ANIM.hang((t * 0.5) % 1);
    else if (S.wall) p = wallWalk(S.climbPh);
    else if (S.rope && !S.ground) {
      p = MONK_ANIM.hang((t * 0.6) % 1);
      if (S.climbing) {
        // Both hands on the rope in turn, the torch in his teeth.
        p.sB = 2.85 + 0.25 * Math.sin(S.climbPh + PI); p.eB = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(S.climbPh + PI));
        p.sF = 2.85 + 0.25 * Math.sin(S.climbPh); p.tq = 0;
        // Hand over hand, the knees coming up in turn to grip the rope.
        const c = Math.sin(S.climbPh);
        p.hF = 0.25 + 0.75 * Math.max(0, c); p.kF = 0.3 + 1.1 * Math.max(0, c);
        p.hB = 0.1 + 0.75 * Math.max(0, -c); p.kB = 0.3 + 1.1 * Math.max(0, -c);
        p.eF = 0.06 + 0.35 * (0.5 + 0.5 * Math.sin(S.climbPh * 2)); p.lift = 1.5 * Math.sin(S.climbPh * 2);
      }
    } else if (!S.ground && S.flip) {
      const k = S.flip.t / (S.flip.half ? 0.4 : 0.6);
      p = blendPose(TUCK, MONK_ANIM.fall(0), smooth((k - 0.7) / 0.3)); p.spin = S.flip.s * S.dir * TAU * (S.flip.half ? 0.5 : 1) * ease(Math.min(1, k * 1.15));
    } else if (!S.ground && S.jumpT > 0) p = MONK_ANIM.leap(clamp(0.32 + (0.6 - S.jumpT) * 0.5, 0.32, 0.6));
    else if (!S.ground) p = MONK_ANIM.fall((t * 1.3) % 1);
    else if (S.landT > 0) p = MONK_ANIM.land(1 - S.landT / (S.landMax || 0.35));
    else if (Math.abs(S.vx) > 12) p = MONK_ANIM.walk(S.anim % 1);
    else p = MONK_ANIM.idle((t * 0.4) % 1, t);
    if (S.throwT > 0) {
      // The throw: the free arm drawn back, then flung toward the rock.
      const k = 1 - S.throwT / 0.32, ax = Math.cos(S.throwA) * S.dir, ay = Math.sin(S.throwA), aim = Math.atan2(ax, ay);
      p.sF = k < 0.35 ? lerp(p.sF, aim - 1.4, ease(k / 0.35)) : lerp(aim - 1.4, aim, ease((k - 0.35) / 0.4));
      p.eF = k < 0.35 ? 1.6 : lerp(1.6, 0.1, ease((k - 0.35) / 0.3));
    }
    return p;
  }
  function drawRope(P, w, c) {
    if (P.length < 2) return;
    ctx.beginPath(); ctx.moveTo(P[0].x - S.cam.x, P[0].y - S.cam.y);
    for (let k = 1; k < P.length; k++) ctx.lineTo(P[k].x - S.cam.x, P[k].y - S.cam.y);
    ctx.strokeStyle = c || "#0b0b0d"; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.stroke();
  }
  function drawHook(x, y, a) {
    // A grappling hook: a shaft and three curved tines.
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(3, 0);
    ctx.moveTo(3, 0); ctx.quadraticCurveTo(6, -1, 5, -5); ctx.moveTo(3, 0); ctx.quadraticCurveTo(6, 1, 5, 5); ctx.moveTo(3, 0); ctx.lineTo(7, 0);
    ctx.stroke(); ctx.lineCap = "butt";
    ctx.restore();
  }
  function draw() {
    const cam = S.cam, t = S.rt, F = S.flare, hM = metres(-S.y);
    const fdt = clamp(t - (S.lastDraw || t), 0, 0.05) * (F.on ? FLARE_SLOW : 1) || 1 / 60; S.lastDraw = t;
    drawBackdrop(600 + cam.x * 0.6, 300 + clamp(cam.y * 0.05, -70, 70), 1, t, { y0: 300 });
    const dawn = clamp(metres(S.top) / 1500, 0, 1);
    if (dawn > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(200,190,170," + (0.22 * dawn) + ")"); g.addColorStop(1, "rgba(200,190,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    rect(0, 0, W, H, "rgba(12,12,14,0.3)");     // the far mist set back, so the near rock stands out
    const P = rockPath(cam);
    ctx.fillStyle = C.ink; ctx.fill(P);
    const hTop = -(cam.y) / CELL + 4, hBot = -(cam.y + H) / CELL - 4;
    const vis = []; for (let n = 0; ; n++) { const w = wallAt(n); if (w.h > hTop) break; if (w.h >= hBot) vis.push(w); }
    for (const w of vis) drawTablet(w, cam, true);
    for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
    // The monk: on the rope, hung from his hand.
    const p = monkPose(); let mx = S.x, my = S.y;
    if (S.rope && !S.ground && !S.cling && !S.act) {
      const [gx, gy] = grip(), th = Math.atan2(S.rope.x - gx, gy - S.rope.y);
      if (!S.wall) p.spin = clamp(th, -1.3, 1.3) * S.dir * 0.85;
      const hd = monkJoint(S.x, S.y, S.dir, p, "hF"); mx += gx - hd[0]; my += gy - hd[1];
    }
    if (S.cling) mx += S.cling * 2;
    S.lastPose = p; S.drawX = mx; S.drawY = my;
    const r = drawMonk(mx - cam.x, my - cam.y, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, alpha: F.on ? 0.8 : 1, teeth: S.climbing && !S.ground && !S.act });
    if (r && r.torch) S.torch = [r.torch[0] + cam.x, r.torch[1] + cam.y];
    const hand = r && r.hand ? [r.hand[0] + cam.x, r.hand[1] + cam.y] : grip();
    if (S.rope) {
      hangRope(S.ropeVis, hand[0], hand[1], S.rope.x, S.rope.y, Math.max(S.rope.len, 10), fdt);
      drawRope(S.ropeVis, 1.6);
      const q = S.ropeVis[S.ropeVis.length - 2]; drawHook(S.rope.x - cam.x, S.rope.y - cam.y, Math.atan2(S.rope.y - q.y, S.rope.x - q.x));
    }
    if (S.shot) {
      const sh = S.shot, out = dist(hand[0], hand[1], sh.x, sh.y);
      hangRope(S.shotVis, hand[0], hand[1], sh.x, sh.y, Math.max(10, out * (sh.ph === "fly" ? 1.12 : 1.3)), fdt);
      drawRope(S.shotVis, 1.3);
      const q = S.shotVis[S.shotVis.length - 2]; drawHook(sh.x - cam.x, sh.y - cam.y, Math.atan2(sh.y - q.y, sh.x - q.x));
    }
    for (const q of S.parts) if (q.kind === "chip") rect(q.x - cam.x - 1, q.y - cam.y - 1, 2, 2, "#0b0b0d");
    // The dark, and what the torch can see of the rock around it.
    let [lx, ly] = S.torch;
    if (solidAt(lx, ly)) [lx, ly] = middle();
    const R = lightR();
    S.light = new Path2D();
    const vp = visPoly(lx, ly, R);
    S.light.moveTo(vp[0] - cam.x, vp[1] - cam.y); for (let k = 2; k < vp.length; k += 2) S.light.lineTo(vp[k] - cam.x, vp[k + 1] - cam.y); S.light.closePath();
    const tx = S.torch[0] - cam.x, ty = S.torch[1] - cam.y;
    darkness(cam, lx - cam.x, ly - cam.y, R);
    ctx.save(); ctx.clip(S.light);
    glow(tx, ty, R * 0.9, C.flame, 0.1);
    const rim = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
    rim.addColorStop(0, "rgba(255,190,110,0.8)"); rim.addColorStop(0.5, "rgba(232,128,58,0.4)"); rim.addColorStop(1, "rgba(232,128,58,0)");
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke(P);
    ctx.restore();
    for (const w of vis) drawTablet(w, cam, false);
    if (!S.dying || S.dying < 1.2) drawFlame(tx, ty, F.on ? 1.3 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
    for (const q of S.parts) {
      const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
      if (q.kind === "ember") drawEmber(x, y, 1, a);
      else if (q.kind === "spark") { glow(x, y, 6, C.gold, a * 0.8); circle(x, y, 1, C.flameHot); }
      else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
      else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
    }
    if (F.on) {
      ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
      const [cx, cy] = middle();
      ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.35)", 1.2); ctx.setLineDash([]);
    }
    hud(hM);
  }
  const pad = (s) => ({ x: s < 0 ? 50 : W - 50, y: H - 50, r: 36 });
  const actBtn = () => ({ x: W - 50, y: H - 132, r: 28 });
  function hud(hM) {
    const F = S.flare, I = pads();
    text(hM + " m", 16, 30, { font: FONT.title, size: 20, weight: 700, color: "#fff", glow: "rgba(255,179,71,0.5)", blur: 10 });
    text("BEST " + Math.max(save.climbBest || 0, metres(S.top)) + " m", 16, 46, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
    pauseButton();
    if (!usingKeys()) {
      for (const s of [-1, 1]) {
        const b = pad(s), on = s < 0 ? I.l : I.r;
        circle(b.x, b.y, b.r, on ? "rgba(255,179,71,0.2)" : "rgba(8,8,10,0.4)");
        ring(b.x, b.y, b.r, on ? C.flame : "rgba(255,179,71,0.35)", 1.2);
        poly(s < 0 ? [b.x - 10, b.y, b.x + 6, b.y - 10, b.x + 6, b.y + 10] : [b.x + 10, b.y, b.x - 6, b.y - 10, b.x - 6, b.y + 10], on ? "#fff3dc" : "rgba(233,230,223,0.6)");
      }
      if (S.climbing) text("CLIMBING", W / 2, H - 12, { align: "center", size: 8, weight: 800, spacing: 3, color: "rgba(255,241,196,0.7)" });
    }
    if (!usingKeys()) {
      // The button: what it will do now.
      const f = actBtn(), lab = S.rope && !S.ground ? "LET GO" : S.cling ? "LEAP" : S.ground ? "JUMP" : S.rope ? "LET GO" : "";
      const held = [...S.touches.values()].find((t) => t.act), on = !!held;
      if (held && !held.fired) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 5, -PI / 2, -PI / 2 + TAU * clamp((S.rt - held.t0) / HOLD_FLARE, 0, 1)); ctx.strokeStyle = C.flameHot; ctx.lineWidth = 2.5; ctx.stroke(); }
      circle(f.x, f.y, f.r, on ? "rgba(255,179,71,0.22)" : "rgba(8,8,10,0.45)");
      ring(f.x, f.y, f.r, lab ? "rgba(255,179,71,0.55)" : "rgba(233,230,223,0.15)", 1.2);
      text(lab || "·", f.x, f.y + 3, { align: "center", size: 7.5, weight: 800, spacing: 1, color: lab ? "#fff3dc" : "#77736c" });
    }
    if (F.on) { const [cx, cy] = middle(); ctx.beginPath(); ctx.arc(cx - S.cam.x, cy - S.cam.y, 30, -PI / 2, -PI / 2 + TAU * (1 - F.t / FLARE_T)); ctx.strokeStyle = C.flameHot; ctx.lineWidth = 2; ctx.stroke(); }
    if (F.on) text("TAP: APPEAR THERE · " + (BLINKS - F.n) + " LEFT", W / 2, 24, { align: "center", size: 9, weight: 800, spacing: 2, color: C.flameHot });
    if (S.verse) {
      const v = S.verse, a = clamp(v.t / 0.5, 0, 1) * clamp((7 - v.t) / 1, 0, 1), y = 64;
      const ls = wrap(v.v[3], Math.min(W - 220, 460), "italic 500 14px " + FONT.line);
      ls.forEach((l, i) => text(l, W / 2, y + i * 17, { align: "center", font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }));
      text(v.v[0] + "  " + v.v[1] + " · PSALM 118:" + v.v[2], W / 2, y + ls.length * 17 + 4, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.7)", alpha: a });
    }
    if (S.hintT < 16 || S.hooked < 2) {
      const a = clamp(S.hintT / 0.6, 0, 1) * (S.hooked >= 2 ? clamp((16 - S.hintT) / 1.5, 0, 1) : 1);
      const L = usingKeys()
        ? ["Click the rock: he throws the hook there.  W, or both arrows: climb the rope.", "← → swing. Into a wall, hold toward it: cling. Space: let go, jump, leap.", "F: the flare. Then click anywhere near: appear there."]
        : ["Tap the rock: he throws the hook there.  Both thumbs: climb the rope.", "◀ ▶ swing. Into a wall, hold toward it: cling. The button: let go, jump, leap.", "Hold the button: the flare. Then tap anywhere near: appear there."];
      L.forEach((l, i) => text(l, W / 2, H - 58 + i * 15, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 240 }));
    }
    if (S.fuel < 0.25 && !S.dying) text("THE TORCH IS GUTTERING: FIND A VERSE", W / 2, H - 24, { align: "center", size: 8, weight: 800, spacing: 2, color: C.ember, alpha: 0.6 + 0.4 * Math.sin(S.rt * 6) });
  }

  // ---- Touch, mouse and keys ------------------------------------------------------------------------
  const inPad = (p, s) => { const b = pad(s); return !usingKeys() && dist(p.x, p.y, b.x, b.y) < b.r + 14; };
  const pid = (ev) => (ev && ev.pointerId !== undefined ? ev.pointerId : "m");
  const M = {
    start, edges, solid, island, sectionAt, trav, ledge, get S() { return S; }, CELL, COLS, HOOK, TH,
    step, draw,
    down(p, ev) {
      if (!S || S.dying) return;
      const id = pid(ev);
      for (const s of [-1, 1]) if (inPad(p, s)) { S.touches.set(id, { pad: s }); return; }
      const f = actBtn(); if (!usingKeys() && dist(p.x, p.y, f.x, f.y) < f.r + 10) { S.touches.set(id, { pad: 0, act: true, t0: S.rt }); action(); return; }
      const wx = p.x + S.cam.x, wy = p.y + S.cam.y, [cx, cy] = middle();
      S.touches.set(id, { pad: 0 });
      if (S.flare.on) { if (dist(wx, wy, cx, cy) < 18) endFlare(); else blink(wx, wy); return; }
      if (S.act) return;
      throwHook(wx, wy);
    },
    move(p, ev) {
      if (!S) return;
      const t = S.touches.get(pid(ev));
      if (t && t.pad) { if (inPad(p, -1)) t.pad = -1; else if (inPad(p, 1)) t.pad = 1; }
    },
    up(p, ev) { if (S) S.touches.delete(pid(ev)); },
    key(code, down) {
      if (!S) return;
      S.keys[code] = down;
      if (!down) return;
      if (code === "Escape" || code === "KeyP") M.pause();
      else if (code === "Space") action();
      else if (code === "KeyF") { if (S.flare.on) endFlare(); else startFlare(); }
    },
    pause() {
      if (mode !== M || S.dying) return;
      Pause.t = 0; mode = ClimbPause; Sound.muffle(true, 0.2);
    },
    resume() {
      mode = M; Sound.muffle(false, 0.2);
      S.touches.clear(); S.keys = {};
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
      ? [["CLICK THE ROCK", "He throws the hook there"], ["W, OR BOTH ARROWS", "Climb the rope; against a wall, walk up it (S lets it out)"], ["← →  OR  A D", "Swing on the rope; walk on the ground"], ["INTO A WALL, HOLD TOWARD IT", "Cling"], ["SPACE", "Let go (a flip at the top of a swing), jump, leap off a wall"], ["AT A LEDGE", "He pulls himself up onto it"], ["F, THEN CLICK", "The flare: appear there, even through rock"], ["THE VERSES ON THE ROCK", "Come near one: the torch is full again"]]
      : [["TAP THE ROCK", "He throws the hook there"], ["BOTH THUMBS", "Climb the rope; against a wall, walk up it"], ["◀ ▶", "Swing on the rope; walk on the ground"], ["INTO A WALL, HOLD TOWARD IT", "Cling"], ["THE BUTTON", "Let go (a flip at the top of a swing), jump, leap off a wall"], ["AT A LEDGE", "He pulls himself up onto it"], ["HOLD THE BUTTON, THEN TAP", "The flare: appear there, even through rock"], ["THE VERSES ON THE ROCK", "Come near one: the torch is full again"]];
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
