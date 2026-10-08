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
// the air); on a wall, a leap off it; with a boulder in his arms, drop it. The button above the
// left pad: the flare, which slows the world while its meter lasts (fighting fills it). Every tap
// does the same thing in the flare or out: a demon, he zips to it and strikes; a boulder, he
// zips to it and catches it; with a boulder, he flings it; rock, the hook (in the flare, he
// appears there instead, through rock if need be). On the ground the hook goes only upward.
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
  const GRAV = 760, VMAX = 900, WALK = 70, AIR = 110;
  const PUMP_WITH = 230, PUMP_START = 130, PUMP_AGAINST = 70;   // pumping a swing: with its motion, from stillness, against it
  const HOOK = 280, HOOK_V = 820, CLIMB_V = 72, PAYOUT = 110, ROPE_MIN = 40, ROPE_MAX = 340, GRIP = 42;
  const WALL_V = 78, WALL_DOWN = 90;               // climbing the rock with bare hands: up, and down
  const BURN = 1 / 150;                            // a full torch lasts two and a half minutes, all the way up
  const FLARE_R = 280, FLARE_SLOW = 0.25, METER_DRAIN = 0.25, BLINK_COST = 0.12;   // the flare: its reach, how slow the world goes, the meter it burns
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
    let L = Math.round(c - hw), R = Math.round(c + hw);
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
    if (r <= 15) return false;                                                       // the tunnel
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
  // Rock beside him on side s: beside his body, not just his head (a ceiling is not a wall).
  function near(s, gap) {
    const x = S.x + s * (HW + (gap || 1.5)), i = Math.floor(x / CELL);
    for (let y = S.y - 36; y <= S.y - 6; y += 6) if (solid(i, Math.floor(y / CELL))) return true;
    return false;
  }
  // How far he must lean out from the wall on side s to get past rock just above him (0 if none in the way, -1 if too far).
  function stepOut(s, up) {
    if (!boxHit(S.x, S.y - up)) return 0;
    for (let k = 4; k <= 52; k += 4) if (!boxHit(S.x - s * k, S.y - up) && !boxHit(S.x - s * k, S.y)) return k;
    return -1;
  }
  const grip = () => [S.x, S.y - GRIP];
  const middle = () => [S.x, S.y - HT / 2];

  // ---- Ledges: stepping up, climbing up -------------------------------------------------------------
  // The top of the rock just beyond his side s, between lo and hi above his feet, with room to
  // stand on it. edge is the near corner of the ledge; x1 where he will stand.
  function ledge(s, lo, hi, reachOut) {
    for (const off of reachOut ? [3, 9, 15, 21, 27] : [3, 8]) {
      const ci = Math.floor((S.x + s * (HW + off)) / CELL);
      for (let j = Math.floor((S.y - hi) / CELL); j <= Math.floor((S.y - lo) / CELL); j++) {
        if (!solid(ci, j) || solid(ci, j - 1) || solid(ci, j - 2) || solid(ci, j - 3)) continue;
        const top = j * CELL, edge = s > 0 ? ci * CELL : (ci + 1) * CELL, x1 = edge + s * 12;
        if (!boxHit(x1, top - 0.01) && !boxHit(edge - s * 8, top - 2)) return { top, edge, x1, s, h: S.y - top };
      }
    }
    return null;
  }
  // The nearest top of rock he could climb onto from where he is: up to four and a half cells to
  // either side, and up from his hands. For when a climb has stalled under rock: he goes round.
  function ledgeAround() {
    let best = null;
    for (let dx = -72; dx <= 72; dx += 6) {
      const ci = Math.floor((S.x + dx) / CELL);
      for (let j = Math.floor((S.y - 150) / CELL); j <= Math.floor((S.y - 20) / CELL); j++) {
        if (!solid(ci, j) || solid(ci, j - 1) || solid(ci, j - 2) || solid(ci, j - 3)) continue;
        const top = j * CELL, sd = (ci + 0.5) * CELL >= S.x ? 1 : -1;
        let ce = ci; while (Math.abs(ce - ci) < 8 && solid(ce - sd, j) && !solid(ce - sd, j - 1)) ce -= sd;
        const edge = sd > 0 ? ce * CELL : (ce + 1) * CELL;
        let x1 = edge + sd * 12;
        if (boxHit(x1, top - 0.01)) { x1 = (ci + 0.5) * CELL; if (boxHit(x1, top - 0.01)) continue; }
        const score = Math.abs(dx) + (S.y - top) * 0.3;
        if (!best || score < best.score) best = { top, edge, x1, s: sd, h: S.y - top, score };
      }
    }
    return best;
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
      touches: new Map(), keys: {}, hooked: 0, hintT: 0, lastDraw: 0, flip: null, hangT: 0, jumpT: 0, wall: 0,
      demons: [], things: [], held: null, atk: null, popK: 0, ids: 0, cast: 0, respawnT: 0, hurtT: 0, invT: 0, flashT: 0, floatT: 0, shake: 0, fightSeen: false, fightHintT: 0, meter: 1, kickCd: 0, swingKickT: 0, hang: null, ward: null, crosses: [],
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
    breakWard(); if (S.hang) S.hang = null;
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
        // The hook bites at the rock's face: the rope runs from just outside it, never through it.
        let hx = sh.tx, hy = sh.ty; for (let k = 0; k < 8 && solidAt(hx, hy); k++) { hx -= sh.ux * 1; hy -= sh.uy * 1; }
        S.rope = { x: hx, y: hy, len: clamp(dist(gx, gy, hx, hy), ROPE_MIN, ROPE_MAX), bends: [], fixed: 0, hx: sh.tx, hy: sh.ty };
        S.ropeVis = S.shotVis; S.shot = null; S.hooked++;
        wrapRope(S.rope, gx, gy); if (freeOf(S.rope) < ROPE_MIN * 0.5) S.rope.len = (S.rope.fixed || 0) + Math.max(ROPE_MIN * 0.5, dist(gx, gy, pivotOf(S.rope).x, pivotOf(S.rope).y));
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
  // The one button: let go of the rope, or leap off the wall.
  function action() {
    if (!S || S.dying || S.act) return;
    breakWard();
    if (S.hang) { S.hang = null; S.ground = false; return; }
    if (S.rope && !S.ground) {
      // Let go with all the swing's speed. At the top of a swing: a flip, and a moment hung in the air.
      S.rope = null; S.climbing = false; Sound.fx.tetherBreak();
      const sp = Math.hypot(S.vx, S.vy);
      if (sp > 110) { S.vy -= 90; S.flip = { t: 0, s: sign(S.vx || S.dir) }; Sound.fx.whoosh(0.6); }
      if (Math.abs(S.vy) < 170 && sp > 60) S.hangT = 0.3;
    } else if (S.cling) {
      const s = S.cling; S.cling = 0; S.vx = -s * 210; S.vy = -360; S.dir = -s; S.flip = { t: 0, s: -s, half: true }; Sound.fx.kick(0.6);
    } else if (S.held && !S.atk) {
      const o = S.held; S.held = null; o.st = "fly"; o.by = null; o.vx = S.dir * 60; o.vy = -40; o.g = 560; o.x = S.x + S.dir * 14; Sound.fx.objHit("stone", 0);
    } else if (S.rope) { S.rope = null; S.climbing = false; Sound.fx.tetherBreak(); }
  }
  // The rope as it hangs: a chain of points, falling, held at both ends, never longer than the rope.
  function hangRope(P, ax, ay, bx, by, len, dt) {
    const N = 14, seg = len / (N - 1);
    if (P.length !== N) { P.length = 0; for (let k = 0; k < N; k++) { const x = lerp(ax, bx, k / (N - 1)), y = lerp(ay, by, k / (N - 1)); P.push({ x, y, px: x, py: y }); } }
    const g = 900 * dt * dt;
    for (let k = 1; k < N - 1; k++) { const p = P[k], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g; if (solidAt(p.x, p.y)) { p.x = p.px; p.y = p.py; } }
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
    S.flare = { on: true, t: 0 }; S.climbing = false;
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
  // In the flare, a tap in empty air: his middle appears there (no further than the flare's reach), through rock.
  function blink(tx, ty) {
    const [cx, cy] = middle(); let dx = tx - cx, dy = ty - cy; const L = Math.hypot(dx, dy);
    if (L > FLARE_R) { dx *= FLARE_R / L; dy *= FLARE_R / L; }
    const spot = freeSpot(cx + dx, cy + dy + HT / 2);
    if (!spot || S.meter < BLINK_COST * 0.5) { Sound.fx.gutter(); return; }
    S.meter = Math.max(0, S.meter - BLINK_COST);
    S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
    puff(cx, cy, 14, false);
    S.x = spot[0]; S.y = spot[1]; S.vx = 0; S.vy = -40; S.rope = null; S.shot = null; S.cling = 0; S.climbing = false; S.act = null; S.atk = null; S.hang = null; breakWard();
    S.ground = boxHit(S.x, S.y + 1);
    puff(S.x, S.y - HT / 2, 10, true);
    S.parts.push({ kind: "ring", x: S.x, y: S.y - HT / 2, life: 0.5, age: 0, real: true });
    Sound.fx.zip();
  }

  // ---- The demons, and the boulders they throw -------------------------------------------------------
  // For now one kind: Wrath, which heaves up boulders and lobs them at him. Each shaft has one,
  // standing on a platform (the first on the floor at the foot, and it comes back there, for
  // practice); each crossing has one on its floor. It watches for him and throws when it sees him.
  const D_HW = 10, D_HT = 50, D_HP = 7, BR = 11, BOULDER_V = 470;
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
  function dFree(x, y) {
    if (!boxAt(x, y, D_HW, D_HT)) return [x, y];
    for (let r = 4; r <= 64; r += 4) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * TAU) * r, py = y + Math.sin(a / 16 * TAU) * r; if (!boxAt(px, py, D_HW, D_HT)) return [px, py]; }
    return null;
  }
  // Nothing but air between two points?
  function los(x0, y0, x1, y1) { const n = Math.ceil(dist(x0, y0, x1, y1) / 6); for (let k = 1; k < n; k++) if (solidAt(lerp(x0, x1, k / n), lerp(y0, y1, k / n))) return false; return true; }
  const dMid = (f) => [f.x, f.y - D_HT / 2];
  const alive = (f) => !!f && f.st !== "gone" && f.st !== "dying" && f.st !== "emerge";
  const panX = (x) => clamp((x - S.cam.x - W / 2) / (W / 2), -1, 1);
  const gain = (v) => { S.meter = Math.min(1, S.meter + v); };
  function setSt(f, st) { f.st = st; f.t = 0; f.thrown = false; }
  function spawnDemon(x, y, x0, x1, sec) {
    const sp = dFree(x, y); if (!sp) return null;
    const f = { sin: "wrath", x: sp[0], y: sp[1], vx: 0, vy: 0, dir: -1, hp: D_HP, st: "emerge", t: 0, cd: 1.8 + Math.random(), x0, x1, sec, ground: true, juggle: 0, hurtT: 0, showHp: 0, lit: 0, id: ++S.ids };
    S.demons.push(f); Sound.fx.spawn(panX(x));
    for (let k = 0; k < 12; k++) S.parts.push({ kind: "smoke", x: x + (Math.random() - 0.5) * 20, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, r: 4 + Math.random() * 5, life: 1, age: 0 });
    return f;
  }
  function placeFor(k) {
    ensureSecs(k); const sec = secs[k];
    if (k === 0) {
      const e = edges(-1), mid = (e.L + e.R + 1) / 2 * CELL;
      spawnDemon((e.R - 1) * CELL, -0.01, mid + 40, (e.R) * CELL, 0);
    } else if (sec.type === "shaft") {
      let best = null;
      for (let s = Math.floor(sec.h0 / SLOT); s <= Math.floor(sec.h1 / SLOT); s++) {
        const isl = island(s); if (!isl || isl.h0 < sec.h0 || isl.h1 > sec.h1) continue;
        if (!best || Math.abs(isl.h0 - (sec.h0 + sec.h1) / 2) < Math.abs(best.h0 - (sec.h0 + sec.h1) / 2)) best = isl;
      }
      if (best) spawnDemon((best.x0 + best.x1 + 1) / 2 * CELL, -best.h1 * CELL - 0.01, best.x0 * CELL + 10, (best.x1 + 1) * CELL - 10, k);
    } else {
      const T = trav(sec), jt = -(sec.h0 + 7), runs = [];
      let a = -1;
      for (let i = T.a; i <= T.b + 1; i++) {
        const ok = i <= T.b && !T.pit[i] && solid(i, jt) && !solid(i, jt - 1) && !(i >= T.en.L && i <= T.en.R);
        if (ok && a < 0) a = i; if (!ok && a >= 0) { if (i - a >= 3) runs.push([a, i - 1]); a = -1; }
      }
      if (runs.length) {
        const c = (T.a + T.b) / 2, r = runs.reduce((p, q) => (Math.abs((q[0] + q[1]) / 2 - c) < Math.abs((p[0] + p[1]) / 2 - c) ? q : p));
        spawnDemon((r[0] + r[1] + 1) / 2 * CELL, jt * CELL - 0.01, r[0] * CELL + 10, (r[1] + 1) * CELL - 10, k);
      }
    }
  }
  function populate(dt) {
    const hNow = -S.y / CELL;
    for (; ;) { ensureSecs(S.popK); if (secs[S.popK].h0 > hNow + 30) break; placeFor(S.popK); S.popK++; }
    // The first shaft is for practice: its demon comes back while he is still in it.
    if (hNow < secs[0].h1 - 2 && !S.demons.some((f) => f.sec === 0 && f.st !== "gone")) { S.respawnT += dt; if (S.respawnT > 3) { S.respawnT = 0; placeFor(0); } }
  }
  function hurtDemon(f, dmg, kx, ky, how) {
    if (!alive(f)) return false;
    f.hp -= dmg; f.hurtT = 0.25; f.showHp = 2.5;
    Sound.fx.demonHurt(f.sin, panX(f.x));
    const [cx, cy] = dMid(f);
    for (let k = 0; k < 8; k++) S.parts.push({ kind: "spark", c: SINS[f.sin].color, x: cx, y: cy, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.45, age: 0 });
    if (f.hp <= 0) { castOut(f); return true; }
    if (how === "launch") { setSt(f, "air"); f.vx = kx; f.vy = ky; f.juggle = 0; }
    else if (how === "hurl") { setSt(f, "thrown"); f.vx = kx; f.vy = ky; }
    else if (f.st === "air" || f.st === "thrown" || f.st === "fall" || !f.ground) {
      setSt(f, "air"); f.vx = kx * 0.4; if (f.juggle < 4) f.vy = Math.min(f.vy, -240); f.juggle++;
    } else { setSt(f, "hurt"); f.vx = kx; }
    return true;
  }
  function castOut(f) {
    setSt(f, "dying"); Sound.fx.castOut(f.sin); S.fuel = Math.min(1, S.fuel + 0.12); S.cast++; gain(0.25);
    const [cx, cy] = dMid(f);
    for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 160; S.parts.push({ kind: "spark", c: k % 3 ? SINS[f.sin].color : C.flameHot, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.9, age: 0 }); }
  }
  function flyDemon(f, dt) {
    const n = clamp(Math.ceil(Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt / 6), 1, 10), h = dt / n;
    for (let k = 0; k < n; k++) {
      f.vy += (f.st === "thrown" && f.t < 0.25 ? 250 : 760) * h;
      const sp = Math.hypot(f.vx, f.vy), [hx, hy] = moveBox(f, f.vx * h, f.vy * h, D_HW, D_HT);
      if ((hx || hy) && f.st === "thrown" && sp > 260) {
        // Into the rock, hard.
        Sound.fx.wallSlam(panX(f.x)); S.shake = 0.25; hurtDemon(f, 2, -sign(f.vx) * 60, -80); gain(0.06);
        if (alive(f)) setSt(f, hy > 0 ? "down" : "fall"); f.vx *= -0.25; if (hy < 0) f.vy = 60; if (hy > 0) { f.vy = 0; f.vx = 0; return; }
      } else { if (hx) f.vx *= -0.3; if (hy < 0) f.vy = 40; }
      if (hy > 0) {
        if (f.vy > 520 && alive(f)) hurtDemon(f, 1, 0, 0);
        f.vy = 0; f.vx = 0; if (alive(f)) setSt(f, "down"); return;
      }
      // Thrown into another of them: both hurt.
      if (f.st === "thrown") for (const g of S.demons) if (g !== f && alive(g) && Math.abs(g.x - f.x) < D_HW * 2 && Math.abs(g.y - f.y) < D_HT) {
        hurtDemon(g, 2, sign(f.vx) * 300, -260, "launch"); hurtDemon(f, 1, -sign(f.vx) * 80, -120); if (alive(f)) setSt(f, "fall"); f.vx *= -0.3;
        Sound.fx.wallSlam(panX(f.x)); gain(0.1); break;
      }
    }
  }
  function updDemon(f, dt) {
    f.t += dt; f.hurtT = Math.max(0, f.hurtT - dt); f.showHp = Math.max(0, f.showHp - dt);
    if (f.st === "gone") return;
    if (f.st === "dying") { if (f.t > 0.8) f.st = "gone"; return; }
    if (f.st === "emerge") { if (f.t > 0.9) setSt(f, "idle"); return; }
    if (f.st === "air" || f.st === "thrown" || f.st === "fall") { flyDemon(f, dt); return; }
    if (dist(f.x, f.y, S.x, S.y) > 760) return;
    f.ground = boxAt(f.x, f.y + 1, D_HW, D_HT);
    if (!f.ground) { setSt(f, "fall"); return; }
    if (f.vx) { moveBox(f, f.vx * dt, 0, D_HW, D_HT); f.vx *= Math.pow(0.01, dt); if (Math.abs(f.vx) < 6) f.vx = 0; }
    const [mx, my] = middle(), [cx, cy] = dMid(f), sees = !S.dying && dist(mx, my, cx, cy) < 380 && los(cx, cy - 10, mx, my - 6);
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) { f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle"); if (f.cd <= 0) setSt(f, "pickup"); break; }
        if (f.st === "idle" && f.t > 1.4) { setSt(f, "walk"); f.dir = f.x < (f.x0 + f.x1) / 2 ? 1 : -1; }
        if (f.st === "walk") {
          const [hx] = moveBox(f, f.dir * 26 * dt, 0, D_HW, D_HT);
          if (hx || (f.dir > 0 ? f.x >= f.x1 : f.x <= f.x0) || !boxAt(f.x + f.dir * 12, f.y + 2, 2, 2) || f.t > 3) setSt(f, "idle");
        }
        break;
      case "pickup": if (f.t > 0.8) setSt(f, "windup"); break;                       // heaving up a boulder
      case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.6) setSt(f, "throw"); break;
      case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwBoulder(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 2.6 + Math.random() * 1.4; } break;
      case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
      case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
    }
  }
  // A boulder, lobbed to fall on him: the lower of the two arcs that reach him, or the longest throw.
  function throwBoulder(f) {
    const hx = f.x + f.dir * 10, hy = f.y - 56, [tx, ty] = middle(), g = 560, X = tx - hx, Y = hy - ty, xa = Math.max(1, Math.abs(X));
    let v = BOULDER_V, disc = v ** 4 - g * (g * xa * xa + 2 * Y * v * v);
    if (disc < 0) { v = Math.sqrt(g * (Y + Math.hypot(Y, xa))) * 1.02; disc = Math.max(0, v ** 4 - g * (g * xa * xa + 2 * Y * v * v)); }
    const th = Math.atan2(v * v - Math.sqrt(disc), g * xa);
    S.things.push({ kind: "stone", x: hx, y: hy, vx: sign(X) * v * Math.cos(th), vy: -v * Math.sin(th), rot: 0, vr: 6 * f.dir, st: "fly", by: "demon", g, age: 0 });
    Sound.fx.throw(0.6);
    if (S.things.length > 12) { const i = S.things.findIndex((o) => o.st === "rest"); if (i >= 0) S.things.splice(i, 1); }
  }
  // Rock at the boulder's edge, on the side it is moving toward?
  function rockAt(x, y, sx, sy) {
    if (sx) return solidAt(x + sx * BR, y) || solidAt(x + sx * BR, y - BR * 0.6) || solidAt(x + sx * BR, y + BR * 0.6);
    return solidAt(x, y + sy * BR) || solidAt(x - BR * 0.6, y + sy * BR) || solidAt(x + BR * 0.6, y + sy * BR);
  }
  function updThing(o, dt) {
    o.age += dt;
    if (o.st === "held") return;
    if (o.st === "rest") { if (!rockAt(o.x, o.y + 1, 0, 1)) { o.st = "fly"; o.by = null; o.vx = 0; o.vy = 0; } return; }
    const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 4), 1, 12), h = dt / n;
    for (let k = 0; k < n; k++) {
      o.vy += (o.g || 560) * h; o.rot += o.vr * h;
      let bounced = false;
      if (o.vx && rockAt(o.x + o.vx * h, o.y, sign(o.vx), 0)) { o.vx *= -0.3; bounced = true; } else o.x += o.vx * h;
      if (o.vy && rockAt(o.x, o.y + o.vy * h, 0, sign(o.vy))) {
        const down = o.vy > 0; o.vy *= down ? -0.25 : -0.4; bounced = true;
        if (down && Math.abs(o.vy) < 70) { o.vy = 0; o.vx *= 0.6; if (Math.abs(o.vx) < 40) { o.st = "rest"; o.vx = 0; o.y = Math.floor((o.y + BR + 2) / CELL) * CELL - BR - 0.01; return; } }
      } else o.y += o.vy * h;
      if (bounced) { if (o.by) Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vr *= 0.5; o.g = 560; }
      if (o.by === "demon" && S.invT <= 0 && Math.abs(o.x - S.x) < HW + BR + (S.ward ? 8 : 0) && o.y > S.y - HT - BR && o.y < S.y + BR) {
        if (S.ward) { S.ward = null; o.by = null; o.vx *= -0.6; o.vy = -200; const [cx, cy] = middle(); S.crosses.push({ kind: "turn", x: cx, y: cy - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); S.shake = 0.15; }
        else { hitMonk(o.vx); o.by = null; o.vx *= -0.3; o.vy = -120; }
      }
      if (o.by === "monk") for (const f of S.demons) if (alive(f) && Math.abs(o.x - f.x) < D_HW + BR && o.y > f.y - D_HT - BR && o.y < f.y + BR) {
        hurtDemon(f, 2, sign(o.vx) * 260, -220, "launch"); Sound.fx.objHit("stone", panX(o.x)); S.shake = 0.2; gain(0.12);
        o.by = null; o.vx *= -0.3; o.vy = -150; o.g = 560; break;
      }
    }
  }
  function hitMonk(kx) {
    if (S.dying || S.invT > 0) return;
    S.fuel -= 0.06; S.hurtT = 0.5; S.invT = 0.9; S.flashT = 0.3; S.cling = 0; S.climbing = false; S.atk = null; S.act = null; S.hang = null; S.ward = null;
    S.vx = (sign(kx) || -S.dir) * 200; S.vy = -170; S.ground = false;
    if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.vx * 0.3; S.held.vy = -100; S.held = null; }
    Sound.fx.hurt(); S.shake = 0.25;
  }
  const demonAt = (x, y) => { let best = null, bd = 1e9; for (const f of S.demons) { if (!alive(f)) continue; const [cx, cy] = dMid(f), d = dist(x, y, cx, cy); if (Math.abs(x - f.x) < D_HW + 18 && y > f.y - D_HT - 18 && y < f.y + 14 && d < bd) { bd = d; best = f; } } return best; };
  const thingAt = (x, y) => { let best = null, bd = 32; for (const o of S.things) { if (o.st === "held") continue; const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; };

  // ---- His blows, and the boulders in his hands ---------------------------------------------------------
  // Every tap does the same thing, in the flare or out of it. A demon: he zips to it and strikes (a
  // swipe up: a kick into the air; a swipe across: it is hurled). A boulder, in the air or on the
  // ground: he zips to it and catches it. With a boulder in his hands, a tap anywhere: a heavy
  // wind-up, and he flings it. Out of the flare he can only reach what he can see, near; in it,
  // anything, through rock if need be. Swinging on the rope into a demon: a kick.
  // In reach: anything the torch shows (any part of it), or anything at all in the flare.
  const inLight = (x, y) => { const [lx, ly] = S.torch; return dist(lx, ly, x, y) < lightR() * 0.95 && los(lx, ly, x, y); };
  const reachable = (x, y, tall) => S.flare.on || inLight(x, y) || (tall && (inLight(x, y - 20) || inLight(x, y + 20)));
  function jumpTo(x, y) {
    S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
    puff(S.x, S.y - HT / 2, 8, false);
    S.x = x; S.y = y; S.vx = 0; S.vy = 0;
    puff(S.x, S.y - HT / 2, 6, true); Sound.fx.zip();
  }
  // Start a move that ends at spot sp: a dash through the air, or (in the flare, past rock) a flash.
  function moveTo(kind, sp, extra) {
    const [mx, my] = middle(), seen = los(mx, my, sp[0], sp[1] - HT / 2);
    let dash = Math.min(0.15, dist(S.x, S.y, sp[0], sp[1]) / 900);
    if (!seen) { jumpTo(sp[0], sp[1]); dash = 0; }
    S.atk = Object.assign({ kind, t: 0, from: [S.x, S.y], to: sp, hit: false, dash, arrived: dash === 0 }, extra);
    S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.hang = null; breakWard();
    if (dash > 0.03) Sound.fx.whoosh(0.35);
  }
  function attack(kind, f, dir) {
    if (!alive(f)) return;
    const side = S.x < f.x ? -1 : 1, sp = freeSpot(f.x + side * (D_HW + HW + 5), f.y) || freeSpot(f.x - side * (D_HW + HW + 5), f.y) || [S.x, S.y];
    moveTo(kind, sp, { f, dir, dur: kind === "hurl" || kind === "slam" ? 0.4 : 0.34 });
    S.dir = f.x < sp[0] ? -1 : 1;
  }
  function catchThing(o) {
    if (S.held) return;
    // Lying beside him: he heaves it up (it is heavy). Anywhere else: he zips to it and catches it.
    if (o.st === "rest" && S.ground && Math.abs(o.x - S.x) < 36 && Math.abs(o.y - S.y) < 30) {
      S.atk = { kind: "heave", o, t: 0, dur: 0.6, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
      S.dir = o.x < S.x ? -1 : 1; return;
    }
    const T = 0.12 * (S.flare.on ? FLARE_SLOW : 1), px = o.x + o.vx * T, py = o.y + o.vy * T;
    const side = S.x < px ? -1 : 1, sp = freeSpot(px + side * 8, py + 34) || freeSpot(px, py + 40);
    if (!sp) return;
    o.by = null;                     // in his reach it can no longer hurt him
    moveTo("catch", sp, { o, dur: 0.24 });
    S.dir = px < sp[0] ? -1 : 1;
  }
  function throwHeld(tx, ty, f) {
    if (!S.held || S.atk) return;
    S.atk = { kind: "toss", f, tx, ty, t: 0, dur: 0.6, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
    S.dir = (f ? f.x : tx) < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
  }
  // Fling what he holds, at a point or a demon, as hard as it came.
  function release(tx, ty, f) {
    const o = S.held; if (!o) return null;
    const [hx, hy] = S.handW || grip();
    if (f && alive(f)) { const [cx, cy] = dMid(f); tx = cx + f.vx * 0.1; ty = cy; }
    const d = Math.max(1, dist(hx, hy, tx, ty)), T = d / BOULDER_V;
    o.st = "fly"; o.by = "monk"; o.g = 300; o.x = hx; o.y = hy; o.vx = (tx - hx) / T; o.vy = (ty - hy) / T - 0.5 * o.g * T; o.vr = 8 * sign(o.vx);
    S.held = null; Sound.fx.throw(0.9);
    return o;
  }
  // Each move: its pose, and the moment it lands. The toss is slow: the wind-up of a heavy thing.
  const ATK_ANIM = { punch: ["palm", MONK_HIT.palm], kick: ["launch", MONK_HIT.launch], slam: ["slam", MONK_HIT.slam], hurl: ["throw", MONK_HIT.throw], toss: ["throw", 0.62], heave: ["pickup", MONK_HIT.pickup], catch: ["catch", MONK_HIT.catch] };
  function stepAtk(dt) {
    const a = S.atk; a.t += dt;
    if (a.t < a.dash) {
      // A dash: toward a moving boulder, he follows it.
      if (a.kind === "catch" && a.o.st === "fly") { const side = S.x < a.o.x ? -1 : 1; a.to = [a.o.x + side * 8, a.o.y + 34]; }
      const k = ease(a.t / a.dash); S.x = lerp(a.from[0], a.to[0], k); S.y = lerp(a.from[1], a.to[1], k); return;
    }
    if (!a.arrived) { a.arrived = true; S.x = a.to[0]; S.y = a.to[1]; if (boxHit(S.x, S.y)) { const fs = freeSpot(S.x, S.y); if (fs) { S.x = fs[0]; S.y = fs[1]; } } }
    const u = (a.t - a.dash) / a.dur, f = a.f;
    if (f && alive(f) && a.kind !== "toss") S.dir = f.x < S.x ? -1 : 1;
    if (!a.hit && u >= ATK_ANIM[a.kind][1]) {
      a.hit = true;
      if (a.kind === "toss") release(a.tx, a.ty, f);
      else if (a.kind === "heave" || a.kind === "catch") {
        if (a.o.st === "rest" || a.o.st === "fly") { a.o.st = "held"; a.o.by = null; S.held = a.o; if (a.kind === "catch") { Sound.fx.catchIt(); gain(0.08); } else Sound.fx.pickup(); }
      } else if (alive(f) && dist(S.x, S.y - 22, f.x, f.y - 25) < 80) {
        if (a.kind === "punch") { hurtDemon(f, 1, S.dir * 150, -60); Sound.fx.punch(0.8, panX(f.x)); gain(0.06); }
        else if (a.kind === "kick") { hurtDemon(f, 1, S.dir * 30, -430, "launch"); Sound.fx.kick(0.9, panX(f.x)); gain(0.06); }
        else if (a.kind === "slam") { hurtDemon(f, 1, a.dir[0] * 140, 680, "hurl"); Sound.fx.punch(1, panX(f.x)); gain(0.06); }
        else { hurtDemon(f, 1, a.dir[0] * 580, a.dir[1] * 580 - 90, "hurl"); Sound.fx.kick(1, panX(f.x)); gain(0.08); }
      }
    }
    if (u >= 1) { S.atk = null; S.ground = boxHit(S.x, S.y + 1); if (!S.ground) { S.vy = 0; S.floatT = 0.3; } }
  }
  // What a tap or a swipe on a demon or a boulder does.
  function gesture(kind, f, o, dir) {
    if (S.act || (S.atk && !S.atk.hit)) return;
    if (S.atk) S.atk = null;          // a blow already landed: straight into the next
    if (f) {
      if (S.held) { throwHeld(0, 0, f); return; }
      const [cx, cy] = dMid(f);
      if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return; }
      attack(kind === "tap" ? "punch" : kind, f, dir);
    } else if (o && !S.held) {
      if (!reachable(o.x, o.y)) { Sound.fx.tick(420, 0.3); return; }
      catchThing(o);
    }
  }
  // A stroke on the screen: a tap; up (the uppercut); down (the slam); across (the hurl); or the
  // sign of the cross, down and then across (either way, or both, as the cross is made).
  function stroke(P) {
    let len = 0; for (let i = 1; i < P.length; i++) len += dist(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]);
    if (len < 16) return { kind: "tap" };
    const [x0, y0] = P[0], [x1, y1] = P[P.length - 1];
    // The turn: the point furthest down that is not yet across.
    let c = 0, best = -1e9; for (let i = 1; i < P.length; i++) { const v = (P[i][1] - y0) - 1.2 * Math.abs(P[i][0] - x0); if (v > best) { best = v; c = i; } }
    const [xc, yc] = P[c]; let across = 0, drift = 0;
    for (let i = c; i < P.length; i++) { across = Math.max(across, Math.abs(P[i][0] - xc)); drift = Math.max(drift, Math.abs(P[i][1] - yc)); }
    if (yc - y0 > 22 && Math.abs(xc - x0) < (yc - y0) * 0.8 && across > 18 && drift < across * 1.1) return { kind: "cross" };
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, dir = [dx / L, dy / L];
    return { kind: dy < -0.55 * L ? "kick" : dy > 0.55 * L ? "slam" : "hurl", dir };
  }
  // The sign of the cross over a demon in his light: it is driven back, hurt and shaken. It costs
  // flare; without enough, it does nothing.
  const CROSS_COST = 0.3, HOLD_SIGN = 0.5;
  function blessDemon(f) {
    if (!alive(f) || S.act) return;
    const [cx, cy] = dMid(f);
    if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return; }
    if (S.meter < CROSS_COST) { S.crosses.push({ kind: "fizzle", x: cx, y: cy, t: 0, size: 18 }); S.meterFlash = 0.8; Sound.fx.gutter(); return; }
    S.meter -= CROSS_COST; breakWard();
    S.crosses.push({ kind: "smite", x: cx, y: cy, t: 0, size: 24 });
    f.brokenT = 1.6; S.freeze = 0.12; S.whiteT = 0.22;
    hurtDemon(f, 3, sign(f.x - S.x) * 300, -220, "hurl");
    for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, v = 60 + Math.random() * 220; S.parts.push({ kind: "spark", c: k % 2 ? C.flameHot : SINS[f.sin].color, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, age: 0, real: true }); }
    Sound.fx.unlock(); Sound.fx.demonBroken(f.sin); Sound.fx.castOut(f.sin); S.shake = 0.3;
  }
  // The sign of the cross over himself: a ward that turns the next boulder away. Any move of his
  // own ends it, and so does the boulder it turns.
  function ward() {
    if (S.act || S.atk) return;
    S.ward = { t: 0 }; const [cx, cy] = middle();
    S.crosses.push({ kind: "ward", x: cx + S.dir * 18, y: cy - 10, t: 0, size: 20 }); Sound.fx.unlock();
  }
  function breakWard() { if (S.ward) { S.ward = null; } }
  // Swinging on the rope, fast, into a demon: a kick, as hard as the swing.
  // Coming down on a demon from above, from any height (a fall, a let-go, a flash above it): he
  // lands on it with both feet, and springs off. The harder the fall, the harder the blow.
  function stomp(vyIn, yIn) {
    if (vyIn < 120 || S.ground) return false;
    for (const f of S.demons) {
      if (!alive(f) || (f.stompCd || 0) > S.rt || Math.abs(S.x - f.x) > D_HW + HW - 2) continue;
      const top = f.y - D_HT;
      if (yIn <= top + 6 && S.y >= top - 2) {
        f.stompCd = S.rt + 0.35;
        hurtDemon(f, vyIn > 430 ? 2 : 1, sign(f.x - S.x) * 40 || 40, 0);
        if (alive(f)) setSt(f, "down");
        S.y = top - 0.5; S.vy = -330; S.vx *= 0.5; S.stompT = 0.4; S.ground = false;
        Sound.fx.kick(1, panX(f.x)); Sound.fx.land(0.8); S.shake = 0.2; gain(0.08);
        for (let k = 0; k < 8; k++) S.parts.push({ kind: "spark", c: SINS[f.sin].color, x: f.x + (Math.random() - 0.5) * 16, y: top, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.4, age: 0 });
        return true;
      }
    }
    return false;
  }
  function swingKick() {
    const sp = Math.hypot(S.vx, S.vy); if (sp < 170 || S.kickCd > 0) return;
    const fx = S.x + sign(S.vx) * 12;
    for (const f of S.demons) if (alive(f) && Math.abs(f.x - fx) < D_HW + 16 && f.y - D_HT < S.y + 4 && f.y > S.y - HT - 6) {
      hurtDemon(f, sp > 380 ? 2 : 1, S.vx * 0.9, -160 - sp * 0.2, "hurl");
      Sound.fx.kick(1, panX(f.x)); S.swingKickT = 0.35; S.kickCd = 0.45; S.shake = 0.15; gain(0.1);
      S.vx *= 0.6; S.vy *= 0.6; S.dir = sign(S.vx) || S.dir;
      break;
    }
  }

  // ---- Each frame --------------------------------------------------------------------------------------
  function pads() {
    let l = false, r = false;
    for (const t of S.touches.values()) { if (t.pad < 0) l = true; if (t.pad > 0) r = true; }
    if (S.keys.ArrowLeft || S.keys.KeyA) l = true;
    if (S.keys.ArrowRight || S.keys.KeyD) r = true;
    return { l, r, d: (r ? 1 : 0) - (l ? 1 : 0), both: l && r };
  }
  // Reaching a ledge, he hangs from it by his hand, just below the edge (out of sight of what is
  // above). A fresh push toward it (let go of the pad and press again) and he pulls himself up;
  // away from it, or down, and he drops.
  function hangAt(L) {
    const hx = L.edge - L.s * 7, hy = L.top - 0.01 + Arena.reach(), ok = !boxHit(hx, hy);
    S.hang = { L, need: true, k: 0, fx: S.x, fy: S.y, x: ok ? hx : S.x, y: ok ? hy : S.y };
    S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.dir = L.s; S.ward = null;
    S.hangs = (S.hangs || 0) + 1; Sound.fx.grab();
  }
  function physics(dt) {
    const I = S.hurtT > 0 ? { l: false, r: false, d: 0, both: false } : pads(), d = I.d, wasGround = S.ground, vyIn = S.vy;
    // Any move of his own ends the sign of the cross he made over himself.
    if (S.ward && (I.l || I.r || S.keys.ArrowUp || S.keys.KeyW || S.keys.ArrowDown || S.keys.KeyS)) breakWard();
    if (S.hang) {
      const H0 = S.hang, s = H0.L.s, up = d === s || I.both || S.keys.ArrowUp || S.keys.KeyW;
      H0.k = Math.min(1, H0.k + dt / 0.12);
      S.x = lerp(H0.fx, H0.x, ease(H0.k)); S.y = lerp(H0.fy, H0.y, ease(H0.k)); S.vx = 0; S.vy = 0; S.dir = s;
      if (!up) H0.need = false;
      if (d === -s || S.keys.ArrowDown || S.keys.KeyS) { S.hang = null; S.ground = false; return; }
      if (up && !H0.need && H0.k >= 1) { S.hang = null; startAct("ledge", H0.L); }
      return;
    }
    if (S.shot) flyShot(dt);
    const R = S.rope;
    // Both thumbs (or up): climb the rope, hand over hand. Down: let it out.
    S.climbing = !!R && (I.both || S.keys.ArrowUp || S.keys.KeyW);
    // (Not while rock is over his head: then he leans out round it first, and the rope waits.)
    if (R && S.climbing && !(!S.ground && boxHit(S.x, S.y - 4)) && freeOf(R) > ROPE_MIN) { R.len = Math.max((R.fixed || 0) + ROPE_MIN, R.len - CLIMB_V * dt); S.climbPh += dt * 9; }
    if (R && (S.keys.ArrowDown || S.keys.KeyS)) R.len = Math.min(ROPE_MAX, R.len + PAYOUT * dt);
    const PV = R ? pivotOf(R) : null, [gx, gy] = grip(), rd = R ? dist(gx, gy, PV.x, PV.y) : 0, taut = R && rd >= freeOf(R) - 1;
    // A ledge anywhere near his hands (or near the top of the rope): he pulls himself up onto it.
    if (!S.ground && !S.held) {
      let L = null;
      const top = R && S.climbing && freeOf(R) <= ROPE_MIN + 8;
      if (S.cling) L = ledge(S.cling, 18, 96, true);
      else if (S.climbing) L = ledge(S.dir, 18, top ? 140 : 90, true) || ledge(-S.dir, 18, top ? 140 : 90, true);
      else if (d && near(d, 6)) L = ledge(d, 18, 90, true);
      if (L) { hangAt(L); return; }
    }
    // On the rock with bare hands. Holding toward the wall (or both thumbs, or up): he climbs,
    // following the rock in and out and leaning out round the bits that stick out. Nothing
    // held: he stays. Away from it: he lets go. Down (keys): he climbs down.
    if (S.cling) {
      if (R) { const [cgx, cgy] = grip(); wrapRope(R, S.prevGx === undefined ? cgx : S.prevGx, S.prevGy === undefined ? cgy : S.prevGy); R.len = Math.max(R.len, (R.fixed || 0) + dist(cgx, cgy, pivotOf(R).x, pivotOf(R).y)); }
      const s = S.cling, up = d === s || I.both || S.keys.ArrowUp || S.keys.KeyW, down = S.keys.ArrowDown || S.keys.KeyS;
      if (d === -s) { S.cling = 0; S.vx = -s * 40; }
      else {
        S.vx = 0; S.vy = 0; S.dir = s;
        if (up) {
          const k = stepOut(s, WALL_V * dt + 2);
          if (k > 0) { moveX(-s * Math.min(k, 120 * dt)); S.leanT = 0.5; }
          else if (k === 0) { moveY(-WALL_V * dt); S.climbPh += dt * 7; S.wallStall = 0; }
          else { S.wallStall = (S.wallStall || 0) + dt; if (S.wallStall > 0.3) { S.wallStall = 0; const L = ledgeAround(); if (L) { startAct("ledge", L); return; } } }
        } else if (down) { if (moveY(WALL_DOWN * dt) > 0) { S.cling = 0; S.ground = true; } S.climbPh -= dt * 7; }
        // Keep his hands on the rock: in toward it where it falls back, a little at a time (but
        // never back in under rock he is leaning out to get past).
        if (!near(s)) {
          let g = 0; for (let k = 2; k <= 44; k += 2) if (near(s, k)) { g = k; break; }
          const m = Math.min(g, 140 * dt);
          if (!g) { if (!(S.leanT > 0)) S.cling = 0; }      // leaning out round rock, he keeps his hold a moment
          else if (!boxHit(S.x + s * m, S.y - 10)) moveX(s * m);
        }
        if (S.cling) return;
      }
    }
    // Climbing the rope with rock over his head: he leans out round it, whichever way is nearer.
    // And if he stops rising with a wall beside him, he takes to the wall with his hands.
    if (S.climbing && R && !S.ground) {
      let lean = 0;
      if (boxHit(S.x, S.y - 4)) for (let k = 2; k <= 44 && !lean; k += 2) for (const sd of [-1, 1]) if (!boxHit(S.x + sd * k, S.y - 4) && !boxHit(S.x + sd * k, S.y)) { lean = sd * k; break; }
      if (lean) { moveX(sign(lean) * Math.min(Math.abs(lean), 150 * dt)); R.len = Math.max(R.len, (R.fixed || 0) + dist(S.x, S.y - GRIP, PV.x, PV.y) + 1); S.climbPh += dt * 6; }
      // Stalled: no new height for a little while, whatever he is doing to the side.
      if (S.climbY === undefined || S.y < S.climbY - 1) { S.climbY = S.y; S.climbStall = 0; } else S.climbStall = (S.climbStall || 0) + dt;
      if (S.climbStall > 0.6) {
        const w = near(S.dir, 9) ? S.dir : near(-S.dir, 9) ? -S.dir : 0;
        if (w) { S.cling = w; S.dir = w; S.rope = null; S.climbing = false; S.climbStall = 0; Sound.fx.grab(); return; }
        const L = ledgeAround(); if (L) { S.climbStall = 0; startAct("ledge", L); return; }
      }
    } else { S.climbStall = 0; S.climbY = undefined; }
    // On the ground with the rope above him, a push begins a swing: he lifts off, his feet come
    // up, and the rope takes up a little so the arc clears the ground.
    if (S.ground && R && d && !S.climbing && !S.held && PV.y < gy - 24 && Math.abs(PV.x - gx) < rd * 0.85) {
      R.len = (R.fixed || 0) + Math.max(ROPE_MIN, Math.min(freeOf(R), rd) - 16);
      S.ground = false; S.vy = -150; S.vx = d * 70; S.dir = d; S.liftT = 0.5; Sound.fx.whoosh(0.3);
    }
    if (S.ground && !(taut && S.climbing)) {
      // Walking: careful and heavy. Into a step, he steps up; into a ledge he can reach, he climbs.
      const want = S.landT > 0 ? 0 : d * WALK * (S.held ? 0.55 : 1);       // slower with a boulder in his arms
      S.vx += clamp(want - S.vx, -500 * dt, 500 * dt);
      if (d) S.dir = d;
      if (d && S.landT <= 0 && !S.held && near(d, 2)) {
        const L = ledge(d, 8, 86);
        if (L) { startAct(L.h <= 20 ? "stepUp" : "climbUp", L); return; }
        // Too high to climb onto: he takes hold of the rock and climbs it.
        S.pushT = (S.pushT || 0) + dt;
        if (S.pushT > 0.15 && !boxHit(S.x, S.y - 3)) { S.cling = d; S.rope = null; S.climbing = false; S.ground = false; S.vx = 0; S.vy = 0; S.pushT = 0; moveY(-3); Sound.fx.grab(); return; }
      } else S.pushT = 0;
    } else if (!S.ground) {
      if (taut && d) {
        // Pumping the swing, as on a real one: a push adds speed only with the swing's motion,
        // a little each time, so the arc grows over several swings; against it, only a little check.
        const nx = (gx - PV.x) / rd, ny = (gy - PV.y) / rd; let tx = -ny, ty = nx;
        if (tx < 0) { tx = -tx; ty = -ty; }
        const vt = S.vx * tx + S.vy * ty, a = Math.abs(vt) < 30 ? PUMP_START : sign(vt) === d ? PUMP_WITH : PUMP_AGAINST;
        S.vx += tx * d * a * dt; S.vy += ty * d * a * dt;
      } else if (d && S.vx * d < 160) S.vx += d * AIR * dt;
      const drag = 1 - 0.1 * dt; S.vx *= drag; S.vy *= drag;
    }
    S.vy += GRAV * dt * (S.floatT > 0 ? 0.2 : 1);
    const sp = Math.hypot(S.vx, S.vy); if (sp > VMAX) { S.vx *= VMAX / sp; S.vy *= VMAX / sp; }
    // On the ground the rope pays out as he walks, unless he is climbing it.
    if (R && S.ground && !S.climbing) R.len = clamp((R.fixed || 0) + rd, ROPE_MIN, ROPE_MAX);
    const n = clamp(Math.ceil(Math.max(Math.abs(S.vx), Math.abs(S.vy)) * dt / 6), 1, 10), h = dt / n;
    let side = 0;
    for (let k = 0; k < n; k++) {
      const [pgx, pgy] = grip();
      if (S.rope) {
        // The rope: no going further from its last bend (or the hook) than what is left of it.
        const Q = pivotOf(S.rope), F = freeOf(S.rope), [qx, qy] = grip(), L = dist(qx, qy, Q.x, Q.y);
        if (L > F - 0.5) {
          const nx = (qx - Q.x) / L, ny = (qy - Q.y) / L, out = S.vx * nx + S.vy * ny;
          if (out > 0) { S.vx -= out * nx; S.vy -= out * ny; }
        }
      }
      const hx = moveX(S.vx * h); if (hx) { side = hx; S.vx = 0; }
      const y0 = S.y, vy0 = S.vy, hy = moveY(S.vy * h); if (hy) S.vy = hy < 0 ? 40 : 0;
      if (!S.rope && vy0 > 0 && stomp(vy0, y0)) break;
      if (S.rope) {
        const Q = pivotOf(S.rope), F = freeOf(S.rope), [qx, qy] = grip(), L = dist(qx, qy, Q.x, Q.y);
        if (L > F) {
          const nx = (qx - Q.x) / L, ny = (qy - Q.y) / L, e = L - F;
          if (moveX(-nx * e)) side = -sign(nx); moveY(-ny * e);
        }
        wrapRope(S.rope, pgx, pgy);
      }
    }
    S.ground = S.vy >= 0 && boxHit(S.x, S.y + 1);
    if (S.ground && !wasGround && vyIn > 300) { S.landT = vyIn > 620 ? 0.5 : 0.32; S.landMax = S.landT; Sound.fx.land(clamp(vyIn / 700, 0.3, 1)); }
    // Into a wall in the air, holding toward it: cling.
    if (!S.ground && d && near(d) && !S.climbing && !S.cling && !S.held) { S.cling = d; S.dir = d; S.vx = 0; S.vy = 0; S.rope = null; Sound.fx.grab(); }
    if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);
    if (S.rope && !S.ground) swingKick();
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }

  function step(dt) {
    S.rt += dt;
    { const [pgx, pgy] = grip(); S.prevGx = pgx; S.prevGy = pgy; }
    S.whiteT = Math.max(0, (S.whiteT || 0) - dt); S.meterFlash = Math.max(0, (S.meterFlash || 0) - dt);
    for (const c of S.crosses) c.t += dt; S.crosses = S.crosses.filter((c) => c.t < (c.kind === "smite" ? 1.1 : 0.8));
    if (S.freeze > 0) { S.freeze -= dt; return; }        // a held breath, as the sign strikes
    // A finger held still on a demon (or on him): the sign of the cross, once the cross is drawn.
    for (const t of S.touches.values()) {
      const g = t.g; if (!g || g.done || g.o || !(g.f || g.self)) continue;
      const [x0, y0] = g.path[0], [x1, y1] = g.path[g.path.length - 1];
      if (dist(x0, y0, x1, y1) > 14) { g.still = false; continue; }
      g.still = true;
      if (S.rt - g.t0 >= HOLD_SIGN) { g.done = true; if (g.f) blessDemon(g.f); else ward(); }
    }
    if (S.dying) { S.dying += dt; if (S.dying > 1.7) { finish(); return; } }
    const F = S.flare;
    if (F.on) { F.t += dt; S.meter -= dt * METER_DRAIN; if (S.meter <= 0) { S.meter = 0; endFlare(); } }
    if (S.hangT > 0) S.hangT -= dt;
    const wdt = dt * (F.on ? FLARE_SLOW : S.hangT > 0 ? 0.5 : 1);
    S.t += wdt;
    if (!S.dying) {
      if (!F.on) S.fuel -= dt * BURN;
      if (S.fuel <= 0) lightOut();
      else if (S.fuel < 0.15 && Math.floor(S.rt * 0.8) !== Math.floor((S.rt - dt) * 0.8)) Sound.fx.gutter();
    }
    if (!S.dying) {
      if (S.act) { if (S.shot) flyShot(wdt); stepAct(wdt); }
      else if (S.atk) { if (S.shot) flyShot(wdt); stepAtk(F.on ? dt * 0.8 : wdt); }       // his blows keep their speed in the flare
      else physics(wdt);
    }
    // The demons, and the stones.
    if (!S.dying) populate(dt);
    for (const f of S.demons) { updDemon(f, wdt); if (f.brokenT > 0) f.brokenT -= dt; }
    S.demons = S.demons.filter((f) => f.st !== "gone");
    for (const o of S.things) updThing(o, wdt);
    S.things = S.things.filter((o) => o.y < S.y + 1400);
    S.hurtT = Math.max(0, S.hurtT - wdt); S.invT = Math.max(0, S.invT - dt); S.flashT = Math.max(0, S.flashT - dt); S.floatT = Math.max(0, S.floatT - wdt); S.shake = Math.max(0, S.shake - dt);
    S.leanT = Math.max(0, (S.leanT || 0) - wdt); S.liftT = Math.max(0, (S.liftT || 0) - wdt); S.kickCd = Math.max(0, S.kickCd - wdt); S.swingKickT = Math.max(0, S.swingKickT - wdt);

    if (!S.fightSeen && S.demons.some((f) => alive(f) && dist(f.x, f.y, S.x, S.y) < 420)) { S.fightSeen = true; S.fightHintT = 0; }
    if (S.fightSeen) S.fightHintT += dt;
    S.landT = Math.max(0, S.landT - wdt); S.throwT = Math.max(0, S.throwT - wdt); S.stompT = Math.max(0, (S.stompT || 0) - wdt); S.jumpT = Math.max(0, (S.jumpT || 0) - wdt);
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
    const jig = (j, k) => (hash2(j, k, 99) - 0.5) * 1.6;
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
      const x0 = isl.x0 * CELL, x1 = (isl.x1 + 1) * CELL, y0 = -isl.h1 * CELL, y1 = (1 - isl.h0) * CELL, q = (k) => (hash2(s, k, 77) - 0.5) * 4;
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
  // On the rock with bare hands, facing it: a hand up, a knee up, in turn (the torch in his teeth).
  function wallClimb(ph) {
    const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v);
    return S_({ lean: 0.12, head: -0.35, sF: 2.55 + 0.4 * a, eF: 0.35 + 0.5 * up(b), sB: 2.55 + 0.4 * b, eB: 0.35 + 0.5 * up(a), tq: 0,
      hF: 0.35 + 0.95 * up(a), kF: 0.5 + 1.3 * up(a), hB: 0.35 + 0.95 * up(b), kB: 0.5 + 1.3 * up(b) });
  }
  function monkPose() {
    const t = S.t;
    if (S.atk) { const a = S.atk; return a.t < a.dash ? MONK_ANIM.dash(clamp(a.t / a.dash, 0, 1)) : MONK_ANIM[ATK_ANIM[a.kind][0]](clamp((a.t - a.dash) / a.dur, 0, 1)); }
    if (S.hurtT > 0 && !S.act) return MONK_ANIM.hurt(1 - S.hurtT / 0.45);
    if (S.dying) return MONK_ANIM.fall(0.3);
    if (S.act) return S.act.kind === "stepUp" ? MONK_ANIM.stepUp(S.act.u) : MONK_ANIM.climbUp(actPoseU(S.act));
    let p;
    if (S.hang) p = MONK_ANIM.climbUp(0.44 + 0.05 * Math.sin(t * 1.7));
    else if (S.cling) p = wallClimb(S.climbPh);
    else if (S.wall) p = wallWalk(S.climbPh);
    else if (S.rope && !S.ground) {
      p = MONK_ANIM.hang((t * 0.6) % 1);
      // Near the ground on the rope (and just after lifting off): the feet drawn up.
      const low = (S.liftT || 0) > 0 || boxHit(S.x, S.y + 22);
      if (low && !S.climbing && !(S.swingKickT > 0)) { p.hF = 1.0; p.kF = 1.7; p.hB = 0.75; p.kB = 1.6; }
      if (S.swingKickT > 0) {
        // The swing's kick: both legs driven out ahead, the near one straight.
        const k = Math.sin(clamp(1 - S.swingKickT / 0.35, 0, 1) * PI);
        p.hF = lerp(p.hF, 1.65, k); p.kF = lerp(p.kF, 0.1, k); p.hB = lerp(p.hB, 0.9, k); p.kB = lerp(p.kB, 0.6, k); p.lean = lerp(p.lean, -0.35, k);
      } else if (S.climbing) {
        // Both hands on the rope in turn, the torch in his teeth.
        p.sB = 2.85 + 0.25 * Math.sin(S.climbPh + PI); p.eB = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(S.climbPh + PI));
        p.sF = 2.85 + 0.25 * Math.sin(S.climbPh); p.tq = 0;
        // Hand over hand, the knees coming up in turn to grip the rope.
        const c = Math.sin(S.climbPh);
        p.hF = 0.25 + 0.75 * Math.max(0, c); p.kF = 0.3 + 1.1 * Math.max(0, c);
        p.hB = 0.1 + 0.75 * Math.max(0, -c); p.kB = 0.3 + 1.1 * Math.max(0, -c);
        p.eF = 0.06 + 0.35 * (0.5 + 0.5 * Math.sin(S.climbPh * 2)); p.lift = 1.5 * Math.sin(S.climbPh * 2);
      }
    } else if (!S.ground && S.stompT > 0) p = MONK_ANIM.diveStomp(0.72 + 0.28 * (1 - S.stompT / 0.4));
    else if (!S.ground && S.flip) {
      const k = S.flip.t / (S.flip.half ? 0.4 : 0.6);
      p = blendPose(TUCK, MONK_ANIM.fall(0), smooth((k - 0.7) / 0.3)); p.spin = S.flip.s * S.dir * TAU * (S.flip.half ? 0.5 : 1) * ease(Math.min(1, k * 1.15));
    } else if (!S.ground && S.jumpT > 0) p = MONK_ANIM.leap(clamp(0.32 + (0.6 - S.jumpT) * 0.5, 0.32, 0.6));
    else if (!S.ground) p = MONK_ANIM.fall((t * 1.3) % 1);
    else if (S.landT > 0) p = MONK_ANIM.land(1 - S.landT / (S.landMax || 0.35));
    else if (Math.abs(S.vx) > 12) p = MONK_ANIM.walk(S.anim % 1);
    else p = MONK_ANIM.idle((t * 0.4) % 1, t);
    if (S.held && !S.atk) { p.sF = 2.8; p.eF = 0.3; p.lean = Math.min(p.lean, 0.04); }   // the boulder up in his free hand, the torch still in the other
    if (S.throwT > 0) {
      // The throw: the free arm drawn back, then flung toward the rock.
      const k = 1 - S.throwT / 0.32, ax = Math.cos(S.throwA) * S.dir, ay = Math.sin(S.throwA), aim = Math.atan2(ax, ay);
      p.sF = k < 0.35 ? lerp(p.sF, aim - 1.4, ease(k / 0.35)) : lerp(aim - 1.4, aim, ease((k - 0.35) / 0.4));
      p.eF = k < 0.35 ? 1.6 : lerp(1.6, 0.1, ease((k - 0.35) / 0.3));
    }
    return p;
  }
  function demonPose(f) {
    const A = DEMON_ANIM, t = S.rt, s = f.sin, k = (d) => clamp(f.t / d, 0, 1);
    switch (f.st) {
      case "walk": return A.walk((f.t * 0.9) % 1, t, s);
      case "pickup": return A.pickup(k(0.5), t, s);
      case "windup": return A.windup(k(0.55), t, s);
      case "throw": return A.throw(k(0.42), t, s);
      case "hurt": return A.hurt(k(0.38), t, s);
      case "air": case "thrown": case "fall": return A.launched((f.t * 0.9) % 1, t, s);
      case "down": return A.down(k(0.9), t, s);
      case "getUp": return A.getUp(k(0.5), t, s);
      case "emerge": return A.emerge(k(0.9), t, s);
      case "dying": return A.hurt(1, t, s);
      default: return A.idle((t * 0.5 + f.id * 0.3) % 1, t, s);
    }
  }
  // A cross of light: the long upright and the short beam, white-hot, glowing.
  function lightCross(x, y, z, a, w) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,214,140,1)"; ctx.shadowBlur = 14 * scale * DPR;
    line(x, y - z, x, y + z * 0.9, "#fff7e2", w); line(x - z * 0.58, y - z * 0.32, x + z * 0.58, y - z * 0.32, "#fff7e2", w);
    ctx.shadowBlur = 0; line(x, y - z, x, y + z * 0.9, "#ffffff", w * 0.4); line(x - z * 0.58, y - z * 0.32, x + z * 0.58, y - z * 0.32, "#ffffff", w * 0.4);
    ctx.restore();
  }
  function drawSign(c, cam) {
    const x = c.x - cam.x, y = c.y - cam.y, t = c.t;
    if (c.kind === "smite") {
      // A shaft of light falls on the demon; the cross burns over it; rays and a ring go out.
      const k = t / 1.1, a = 1 - k, open = ease(Math.min(1, t / 0.12));
      const bw = lerp(30, 8, Math.min(1, t / 0.4)), g = ctx.createLinearGradient(0, 0, 0, y);
      g.addColorStop(0, "rgba(255,240,200,0)"); g.addColorStop(1, "rgba(255,240,200," + (0.55 * a) + ")");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - bw / 2, 0, bw, y + 10); ctx.globalCompositeOperation = "source-over";
      glow(x, y, 90 * open, C.flameHot, 0.6 * a);
      for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * 0.6, r0 = 18 * open, r1 = r0 + 70 * ease(Math.min(1, t / 0.5)); ctx.globalAlpha = 0.5 * a; line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, "#ffe9b8", i % 2 ? 1 : 2); }
      ctx.globalAlpha = 1;
      ring(x, y, 12 + 150 * ease(Math.min(1, t / 0.7)), "rgba(255,236,190," + (0.7 * a) + ")", 2.5 * a + 0.5);
      lightCross(x, y - 4, c.size * lerp(2.2, 1, open), a, 4.5);
    } else if (c.kind === "ward") {
      // The cross appears in the air before him, and fades as the light settles round his body.
      const a = Math.min(1, t / 0.1) * (1 - t / 0.8), z = c.size * lerp(1.5, 1, ease(Math.min(1, t / 0.2)));
      glow(x, y, z * 3, C.flameHot, 0.4 * a); lightCross(x, y, z, a, 3.5);
    } else if (c.kind === "turn") {
      // A boulder turned: a flash of the cross and a ring.
      const a = 1 - t / 0.8; ring(x, y, 14 + 70 * ease(t / 0.8), "rgba(255,236,190," + (0.8 * a) + ")", 2); lightCross(x, y, c.size * (1 + t * 0.5), a, 3.5);
    } else if (c.kind === "fizzle") {
      // Not enough flare: the sign begins, breaks, and falls.
      const a = 0.6 * (1 - t / 0.8), z = c.size, dy = t * t * 60;
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
      line(x - 1, y - z + dy * 0.5, x - 2, y - 2 + dy, "#c9b892", 2); line(x + 1, y + 2 + dy * 1.2, x + 2, y + z * 0.9 + dy * 1.4, "#c9b892", 2);
      line(x - z * 0.58, y - z * 0.32 + dy, x - 3, y - z * 0.36 + dy * 0.8, "#c9b892", 2); line(x + 3, y - z * 0.3 + dy * 1.1, x + z * 0.58, y - z * 0.26 + dy * 1.3, "#c9b892", 2);
      ctx.restore();
    }
  }
  // A boulder: the stone drawn large.
  function drawBoulder(x, y, rot, lit) { ctx.save(); ctx.translate(x, y); ctx.scale(1.85, 1.85); drawObject("stone", 0, 0, rot, { lit, t: S.rt }); ctx.restore(); }
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
    const sx = S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0, sy = S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0;
    S.cam.x += sx; S.cam.y += sy;
    drawWorld();
    S.cam.x -= sx; S.cam.y -= sy;
  }
  function drawWorld() {
    const cam = S.cam, t = S.rt, F = S.flare, hM = metres(-S.y);
    const fdt = clamp(t - (S.lastDraw || t), 0, 0.05) * (F.on ? FLARE_SLOW : 1) || 1 / 60; S.lastDraw = t;
    drawBackdrop(600 + cam.x * 0.6, 300 + clamp(cam.y * 0.05, -70, 70), 1, t, { y0: 300 });
    const dawn = clamp(metres(S.top) / 1500, 0, 1);
    if (dawn > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(200,190,170," + (0.22 * dawn) + ")"); g.addColorStop(1, "rgba(200,190,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    rect(0, 0, W, H, "rgba(12,12,14,0.3)");     // the far mist set back, so the near rock stands out
    const P = rockPath(cam);
    const hTop = -(cam.y) / CELL + 4, hBot = -(cam.y + H) / CELL - 4;
    const vis = []; for (let n = 0; ; n++) { const w = wallAt(n); if (w.h > hTop) break; if (w.h >= hBot) vis.push(w); }
    for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
    // The demons, their colour showing where the torch can see them.
    const [lx0, ly0] = S.torch, R0 = lightR();
    for (const f of S.demons) {
      const [cx, cy] = dMid(f); if (cx < cam.x - 80 || cx > cam.x + W + 80 || cy < cam.y - 100 || cy > cam.y + H + 100) continue;
      f.lit += ((dist(lx0, ly0, cx, cy) < R0 * 0.9 && los(lx0, ly0, cx, cy)) - f.lit) * 0.15;
      f.p = demonPose(f);
      const al = f.st === "dying" ? 1 - f.t / 0.8 : f.st === "emerge" ? Math.min(1, f.t / 0.5) : 1;
      drawDemon(f.sin, f.x - cam.x, f.y - cam.y, f.dir, f.p, { t: S.rt, lit: Math.max(f.lit, f.brokenT > 0 ? 1 : 0), hurt: f.hurtT / 0.25, windup: f.st === "windup" ? f.t / 0.55 : 0, alpha: al, broken: f.brokenT > 0 });
    }
    for (const o of S.things) if (o.st !== "held") drawBoulder(o.x - cam.x, o.y - cam.y, o.rot, dist(lx0, ly0, o.x, o.y) < R0 * 0.85 ? 1 : 0);
    // The monk: on the rope, hung from his hand.
    const p = monkPose(); let mx = S.x, my = S.y;
    if (S.rope && !S.ground && !S.cling && !S.act) {
      const Q = pivotOf(S.rope), [gx, gy] = grip(), th = Math.atan2(Q.x - gx, gy - Q.y);
      if (!S.wall) p.spin = clamp(th, -1.3, 1.3) * S.dir * 0.85;
      const hd = monkJoint(S.x, S.y, S.dir, p, "hF"); mx += gx - hd[0]; my += gy - hd[1];
    }
    if (S.cling) mx += S.cling * 2;
    S.lastPose = p; S.drawX = mx; S.drawY = my;
    if (S.ward) {
      const b = 0.7 + 0.3 * Math.sin(S.rt * 4), k = scale * DPR;
      ctx.save(); ctx.shadowColor = "rgba(255,214,140," + b + ")"; ctx.shadowBlur = 12 * k;
      for (const [ox, oy] of [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4]]) drawMonk(mx - cam.x + ox, my - cam.y + oy, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, tint: "rgba(255,238,196," + (0.75 * b) + ")" });
      ctx.restore();
    }
    const r = drawMonk(mx - cam.x, my - cam.y, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, alpha: (F.on ? 0.8 : 1) * (S.flashT > 0 && Math.floor(S.rt * 24) % 2 ? 0.35 : 1), teeth: (S.climbing && !S.ground || !!S.cling) && !S.act && !S.held });
    if (r && r.torch) S.torch = [r.torch[0] + cam.x, r.torch[1] + cam.y];
    const hand = r && r.hand ? [r.hand[0] + cam.x, r.hand[1] + cam.y] : grip();
    S.handW = hand;
    if (S.held) { S.held.x = hand[0]; S.held.y = hand[1] - 9; drawBoulder(S.held.x - cam.x, S.held.y - cam.y, 0, 1); }
    if (S.rope) {
      const Q = pivotOf(S.rope), B = bendsOf(S.rope);
      hangRope(S.ropeVis, hand[0], hand[1], Q.x, Q.y, Math.max(freeOf(S.rope), 10), fdt);
      drawRope(S.ropeVis, 1.6);
      if (B.length) {
        ctx.beginPath(); ctx.moveTo(Q.x - cam.x, Q.y - cam.y);
        for (let k = B.length - 2; k >= 0; k--) ctx.lineTo(B[k].x - cam.x, B[k].y - cam.y);
        ctx.lineTo(S.rope.x - cam.x, S.rope.y - cam.y); ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
      }
    }
    if (S.shot) {
      const sh = S.shot, out = dist(hand[0], hand[1], sh.x, sh.y);
      hangRope(S.shotVis, hand[0], hand[1], sh.x, sh.y, Math.max(10, out * (sh.ph === "fly" ? 1.12 : 1.3)), fdt);
      drawRope(S.shotVis, 1.3);
    }
    // The rock, in front of him: its crags overlap him where he stands or clings against it.
    ctx.fillStyle = C.ink; ctx.fill(P);
    for (const w of vis) drawTablet(w, cam, true);
    if (S.rope && S.ropeVis.length > 1) { const B = bendsOf(S.rope), q = B.length ? B[0] : S.ropeVis[S.ropeVis.length - 2], hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy; drawHook(hx - cam.x, hy - cam.y, Math.atan2(S.rope.y - q.y, S.rope.x - q.x)); }
    if (S.shot && S.shotVis.length > 1) { const sh = S.shot, q = S.shotVis[S.shotVis.length - 2]; drawHook(sh.x - cam.x, sh.y - cam.y, Math.atan2(sh.y - q.y, sh.x - q.x)); }
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
    for (const f of S.demons) {
      if (!f.p || f.st === "gone") continue;
      if (f.lit < 0.6 && f.st !== "dying") demonEyes(f.sin, f.x - cam.x, f.y - cam.y, f.dir, f.p, { t: S.rt, windup: f.st === "windup" ? f.t / 0.55 : 0, alpha: 1 - f.lit });
      if (f.showHp > 0 && alive(f)) { const a = Math.min(1, f.showHp), y = f.y - D_HT - 10 - cam.y; for (let k = 0; k < D_HP; k++) circle(f.x - cam.x - (D_HP - 1) * 3.5 + k * 7, y, 2.2, k < f.hp ? hexA(SINS[f.sin].color, a) : "rgba(40,40,46," + a + ")"); }
    }
    // The signs of the cross: a cross of light that swells and fades; the ward, steady before him.
    for (const c of S.crosses) drawSign(c, cam);
    // The cross drawing itself under a held finger: the upright, then the beam.
    for (const t of S.touches.values()) {
      const g = t.g; if (!g || g.done || !g.still || g.o || !(g.f || g.self)) continue;
      const k = (S.rt - g.t0) / HOLD_SIGN; if (k < 0.12) continue;
      const [cx, cy] = g.f ? dMid(g.f) : middle(), x = cx - cam.x, y = cy - cam.y - 6, z = g.f ? 20 : 16, u = clamp((k - 0.12) / 0.88, 0, 1);
      ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = "rgba(255,214,140,0.9)"; ctx.shadowBlur = 8 * scale * DPR;
      const v = Math.min(1, u / 0.55), h = clamp((u - 0.55) / 0.45, 0, 1);
      line(x, y - z, x, y - z + z * 1.9 * v, "rgba(255,241,210,0.9)", 2.4);
      if (h > 0) { line(x, y - z * 0.32, x - z * 0.58 * h, y - z * 0.32, "rgba(255,241,210,0.9)", 2.4); line(x, y - z * 0.32, x + z * 0.58 * h, y - z * 0.32, "rgba(255,241,210,0.9)", 2.4); }
      ctx.restore();
    }
    if (S.ward) { const [cx, cy] = middle(); glow(cx - cam.x, cy - cam.y, 40, C.warm, 0.12 + 0.05 * Math.sin(S.rt * 4)); }
    // A thrown stone keeps a faint glint of the sin that threw it, so its arc can be read in the dark.
    for (const o of S.things) if (o.st === "fly" && o.by === "demon") glow(o.x - cam.x, o.y - cam.y, 9, SINS.wrath.color, 0.45);

    if (!S.dying || S.dying < 1.2) drawFlame(tx, ty, F.on ? 1.3 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
    for (const q of S.parts) {
      const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
      if (q.kind === "ember") drawEmber(x, y, 1, a);
      else if (q.kind === "spark") { glow(x, y, 6, q.c || C.gold, a * 0.8); circle(x, y, 1, q.c ? mix(q.c, "#ffffff", 0.5) : C.flameHot); }
      else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
      else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
    }
    if (F.on) {
      ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
      const [cx, cy] = middle();
      if (F.on) { ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.25)", 1.2); ctx.setLineDash([]); }
    }
    if (S.whiteT > 0) rect(0, 0, W, H, "rgba(255,246,226," + (S.whiteT * 1.4) + ")");
    hud(hM);
  }
  const pad = (s) => ({ x: s < 0 ? 50 : W - 50, y: H - 50, r: 36 });
  const actBtn = () => ({ x: W - 50, y: H - 132, r: 28 });
  const flareBtn = () => ({ x: 50, y: H - 132, r: 28 });
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
    // The flare's button, its ring the meter; and the other button, saying what it will do now.
    const fb = usingKeys() ? { x: W - 40, y: 66, r: 16 } : flareBtn(), ready = S.meter >= 0.12;
    circle(fb.x, fb.y, fb.r, F.on ? "rgba(255,241,196,0.25)" : "rgba(8,8,10,0.45)");
    ring(fb.x, fb.y, fb.r, "rgba(233,230,223,0.15)", 1.2);
    ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r + 3, -PI / 2, -PI / 2 + TAU * S.meter); ctx.strokeStyle = F.on ? C.flameHot : ready ? C.flame : "rgba(255,179,71,0.35)"; ctx.lineWidth = 3; ctx.stroke();
    if (S.meterFlash > 0 && Math.floor(S.rt * 10) % 2) ring(fb.x, fb.y, fb.r + 6, "rgba(220,80,60,0.9)", 2);
    text(usingKeys() ? "F" : "FLARE", fb.x, fb.y + 3, { align: "center", size: usingKeys() ? 10 : 7.5, weight: 800, spacing: 1, color: ready || F.on ? "#fff3dc" : "#77736c" });
    if (!usingKeys()) {
      const f = actBtn(), lab = S.rope || S.hang ? "LET GO" : S.cling ? "LEAP" : S.held ? "DROP" : "";
      const on = [...S.touches.values()].some((t) => t.act);
      circle(f.x, f.y, f.r, on ? "rgba(255,179,71,0.22)" : "rgba(8,8,10,0.45)");
      ring(f.x, f.y, f.r, lab ? "rgba(255,179,71,0.55)" : "rgba(233,230,223,0.15)", 1.2);
      text(lab || "·", f.x, f.y + 3, { align: "center", size: 7.5, weight: 800, spacing: 1, color: lab ? "#fff3dc" : "#77736c" });
    }
    if (F.on) text("THE FLARE · TAP A DEMON, A BOULDER, OR ANYWHERE", W / 2, 24, { align: "center", size: 9, weight: 800, spacing: 2, color: C.flameHot, max: W - 140 });
    if (S.fightSeen && S.fightHintT < 12 && !F.on) {
      const a = clamp(S.fightHintT / 0.5, 0, 1) * clamp((12 - S.fightHintT) / 1.5, 0, 1);
      const L = ["A demon. Tap it: strike.  Swipe up: uppercut.  Down: slam.  Across: hurl.  Swing into it: a kick.", "Tap a boulder, even in the air: catch it; tap again: fling it.  Hold your finger on it (or on yourself): the sign of the cross."];
      L.forEach((l, i) => text(l, W / 2, 112 + i * 14, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 200 }));
    }
    if (S.verse) {
      const v = S.verse, a = clamp(v.t / 0.5, 0, 1) * clamp((7 - v.t) / 1, 0, 1), y = 64;
      const ls = wrap(v.v[3], Math.min(W - 220, 460), "italic 500 14px " + FONT.line);
      ls.forEach((l, i) => text(l, W / 2, y + i * 17, { align: "center", font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }));
      text(v.v[0] + "  " + v.v[1] + " · PSALM 118:" + v.v[2], W / 2, y + ls.length * 17 + 4, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.7)", alpha: a });
    }
    if ((S.hintT < 16 || S.hooked < 2) && !(S.fightSeen && S.fightHintT < 12)) {
      const a = clamp(S.hintT / 0.6, 0, 1) * (S.hooked >= 2 ? clamp((16 - S.hintT) / 1.5, 0, 1) : 1);
      const L = usingKeys()
        ? ["Click the rock: he throws the hook there.  W, or both arrows: climb the rope.", "← → rock the swing to build it. Hold toward a wall: he climbs it. Space: let go, leap.", "F: the flare (the ring is what is left). Then click anywhere near: appear there."]
        : ["Tap the rock above him: he throws the hook there.  Both thumbs: climb.", "◀ ▶ rock the swing to build it. Hold toward a wall: he climbs it. The button: let go, leap.", "FLARE: time slows (the ring is what is left). Tap anywhere near: appear there."];
      L.forEach((l, i) => text(l, W / 2, H - 58 + i * 15, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 240 }));
    }
    if (S.hang) {
      // A sign at the edge he hangs from: push again to climb up.
      const L = S.hang.L, x = L.edge + L.s * 8 - S.cam.x, y = L.top - 12 - S.cam.y, b = 0.55 + 0.45 * Math.sin(S.rt * 5);
      ctx.globalAlpha = b; line(x - 5, y + 3, x, y - 2, C.flameHot, 1.6); line(x, y - 2, x + 5, y + 3, C.flameHot, 1.6); ctx.globalAlpha = 1;
      if (S.hangs <= 3) text(usingKeys() ? "TOWARD THE LEDGE AGAIN: CLIMB UP" : "PUSH TOWARD THE LEDGE AGAIN: CLIMB UP", W / 2, H - 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.warm, alpha: 0.8 });
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
      const ab = actBtn(); if (!usingKeys() && dist(p.x, p.y, ab.x, ab.y) < ab.r + 10) { S.touches.set(id, { pad: 0, act: true }); action(); return; }
      const fb = flareBtn(); if (!usingKeys() && dist(p.x, p.y, fb.x, fb.y) < fb.r + 10) { S.touches.set(id, { pad: 0, act: true }); if (S.flare.on) endFlare(); else startFlare(); return; }
      const wx = p.x + S.cam.x, wy = p.y + S.cam.y, t = { pad: 0 };
      S.touches.set(id, t);
      if (S.act) return;
      // On a demon or a boulder: wait to see if it is a tap or a swipe.
      // A boulder tapped right on wins over the demon behind it.
      let f = demonAt(wx, wy), o = thingAt(wx, wy);
      if (f && o) { if (dist(wx, wy, o.x, o.y) < 22) f = null; else o = null; }
      if (f || o) { t.g = { f, o, path: [[p.x, p.y]], t0: S.rt }; return; }
      // From himself: perhaps the sign of the cross over himself.
      const [mcx, mcy] = middle();
      if (!S.held && Math.abs(wx - mcx) < 30 && wy > S.y - HT - 30 && wy < S.y + 10) { t.g = { self: true, path: [[p.x, p.y]], t0: S.rt }; return; }
      if (S.atk && !S.atk.hit) return;
      if (S.held) { S.atk = null; throwHeld(wx, wy, null); return; }
      if (S.flare.on) { blink(wx, wy); return; }
      if (S.atk) return;
      if (S.ground && wy > S.y - 30) return;
      throwHook(wx, wy);
    },
    move(p, ev) {
      if (!S) return;
      const t = S.touches.get(pid(ev));
      if (t && t.pad) { if (inPad(p, -1)) t.pad = -1; else if (inPad(p, 1)) t.pad = 1; }
      if (t && t.g && t.g.path.length < 80) t.g.path.push([p.x, p.y]);
    },
    up(p, ev) {
      if (!S) return;
      const id = pid(ev), t = S.touches.get(id); S.touches.delete(id);
      if (t && t.g && !t.g.done && !S.act) {
        t.g.path.push([p.x, p.y]);
        const k = stroke(t.g.path);
        if (t.g.self) { if (k.kind === "cross") ward(); }
        else if (t.g.f && k.kind === "cross") blessDemon(t.g.f);
        else if (t.g.f) gesture(k.kind, t.g.f, null, k.dir);
        else if (t.g.o) gesture("tap", null, t.g.o, null);
      }
    },
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
      return [["Height reached", m + " m"], ["Verses read", S.read], ["Demons cast out", S.cast], ["Your best", (save.climbBest || m) + " m"]];
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
      ? [["CLICK THE ROCK", "He throws the hook there"], ["W, OR BOTH ARROWS", "Climb the rope or the rock; at a ledge, again to pull up"], ["← →  OR  A D", "Rock the swing to build it; walk; toward a wall: climb it"], ["SPACE", "Let go, leap off a wall, drop a boulder"], ["CLICK A DEMON IN THE LIGHT", "Zip and strike; drag up / down / across: uppercut, slam, hurl; land on it: stomp"], ["CLICK A BOULDER, THEN CLICK", "Catch it (even in the air), then fling it"], ["HOLD THE CLICK ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward"], ["F", "The flare: time slows; fighting refills it"]]
      : [["TAP THE ROCK", "He throws the hook there"], ["BOTH THUMBS", "Climb the rope or the rock; at a ledge, push again to pull up"], ["◀ ▶", "Rock the swing to build it; walk; toward a wall: climb it"], ["THE RIGHT BUTTON", "Let go, leap off a wall, drop a boulder"], ["TAP A DEMON IN THE LIGHT", "Zip and strike; swipe up / down / across: uppercut, slam, hurl; land on it: stomp"], ["TAP A BOULDER, THEN TAP", "Catch it (even in the air), then fling it"], ["HOLD STILL ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward till you move"], ["FLARE", "Time slows; tap anywhere: appear there. Fighting refills it"]];
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
