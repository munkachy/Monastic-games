"use strict";
// While You Have the Light: the endless climb, a first build: the climbing alone, no demons yet.
// The mountain goes up for ever, made by rules as he climbs: shafts, and between them long
// crossings with a ceiling to swing from and pits too wide to walk (never by chance alone: a
// clear way up always stays open, and rock to hook is always within the rope's reach). The
// torch is the clock: its light shrinks as it burns, the rock throws its shadows, and the
// verses of Psalm 118 cut into the rock fill it again, one stanza after another, Aleph to Tau.
//
// Touch: tap the rock and he throws the hook there, in an arc (swinging, a tap to one side of
// him: he lets go, flips over the way he is going, and throws it up at 45 degrees on the side
// tapped). Under the left thumb, a faint cross of four ways: up climbs the rope (against a wall
// he walks up it, hand over hand, the torch held in one), down lets it out; left and right
// swing on it (or walk, slow and careful, on the ground); swing into a wall and hold toward it
// to cling. At a ledge he pulls himself up, as in the arena. The button in the right corner is
// for everything else: on the rope, let go (at the top of a swing, a flip and a moment hung in
// the air); on a wall, a leap off it; with a boulder in his arms, drop it. The button above it:
// the flare, which slows the world while its meter lasts (fighting fills it). Every tap
// does the same thing in the flare or out: a demon, he zips to it and strikes; a boulder, he
// zips to it and catches it; with a boulder, he flings it; rock, the hook (in the flare, he
// appears there instead, through rock if need be). On the ground the hook goes only upward.
// Keys: click to throw the hook, arrows or A/D to swing and cling, W (or both arrows) to climb
// the rope and S to let it out, Space for the button, Shift to flare, Esc to pause.

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
  const CELL = 16, COLS = 330, MID = 165, MPX = 27;   // a cell; the world's width in cells, and its middle; pixels to a metre
  const GRAV = 760, VMAX = 900, WALK = 70, AIR = 110;
  const PUMP_WITH = 230, PUMP_START = 130, PUMP_AGAINST = 70;   // pumping a swing: with its motion, from stillness, against it
  const HOOK = 280, HOOK_V = 820, CLIMB_V = 72, PAYOUT = 110, ROPE_MIN = 40, ROPE_MAX = 340, GRIP = 42;
  // The hook has no end to its reach (only a bound so the search finishes): past HOOK it flies
  // faster, and once it bites he reels the rope in quickly to ROPE_MAX, a length he can swing on.
  const HOOK_FAR = 3000, HOOK_V_FAR = 2400, REEL_V = 600;
  const WALL_V = 78, WALL_DOWN = 90;               // climbing the rock with bare hands: up, and down
  // The torch does not burn down with time (he may look about as long as he likes): blows dim it,
  // and the higher he is, the more each blow takes; the thief's hand, and a great demon's mouth.
  const blowCost = (c) => c * Math.min(4, 1 + metres(-S.y) / 350);
  const FLARE_R = 280, FLARE_SLOW = 0.25, METER_DRAIN = 0.25, BLINK_COST = 0.12;   // the flare: its reach, how slow the world goes, the meter it burns
  const METER_REGEN = 1 / 55;                      // and how it fills again by itself while it is not burning (blows landed fill it faster)
  const HW = 7, HT = 44;                           // half the monk's width; his height
  const CRAWL_H = 24, CRAWL_V = 34, CW_H = 2, CW_C = 5;      // crawling: his height, and his pace; a crawlway's height (rows: room to crawl, not to stand), and its chamber's (room to hold a relic up)
  const SLOT = 10, TH = 30, CH = 52;               // rows to each place a platform may stand; a crossing's height; a cavern's
  const TR = 28;                                   // a crossing's roof (rows up from its foot): high, for long swings under it

  // ---- The domains ------------------------------------------------------------------------------
  // The mountain is the seven, one above another, in Cassian's order of the eight thoughts (envy in
  // dejection's place, and pride crowning vainglory): the belly first, at the foot, and pride at
  // the top. Each domain is a band of the climb: a gate at its threshold, four shafts and the
  // crossings between them, its own idols in the walls, its own demons, its own way with the rock.
  // No names are given on the way: the gates, the idols and the demons tell it.
  const DOMAINS = ["gluttony", "lust", "avarice", "wrath", "envy", "sloth", "pride"];
  const BUILT = ["gluttony", "lust", "avarice", "wrath"];   // those made so far: the climb goes through these, and round again
  const SPD = 8;                                   // sections to a domain: its gate, then four shafts and three crossings
  const WIDE = { gluttony: true };                 // shafts set far apart, with long swollen caverns between them
  // Lust's crossings: long corridors climbing steadily across the mountain from side to side, in
  // terraces, floored and hung with briars; and its shafts short, the only straight ways up.
  const SLOPE = { lust: true };
  const LW = 140, TER = 12, SG = 24;               // its shafts' distance from the middle; a terrace's length; the corridor's height (room to swing)
  // Avarice's: a mine. Its shafts farther apart than most, with long galleries between hung with
  // chains; in each shaft a shelf of rock across it, with a narrow way through (the needle's eye).
  const MINE = { avarice: true }, AW = 62;
  let NOV = null;                                  // the novitiate: { domain, demons, torch, flare }, or null for the climb
  const domIdx = (k) => (k < 1 ? 0 : Math.floor((k - 1) / SPD));
  const domOf = (k) => (NOV ? NOV.domain : k < 1 ? null : BUILT[domIdx(k) % BUILT.length]);
  const isGate = (k) => k >= 1 && (k - 1) % SPD === 0;
  // How many demons to a place: one in the first two domains, two in the next two, then three.
  const demonsFor = (k) => (NOV ? NOV.demons : k < 1 ? 0 : Math.min(3, 1 + Math.floor(domIdx(k) / 2)));

  // ---- The mountain, made by rules ----------------------------------------------------------------
  // It goes up in sections: a shaft, then a crossing to a shaft further across, and so on for ever.
  // Rows are counted up from the floor (h = -j).
  //  Shafts: row j is open from column L to column R. The way meanders slowly, so each row's
  //  opening overlaps the next by several cells, and it is never narrower than six cells.
  //  Platforms stand in a shaft only where they leave three clear cells on both sides.
  //  Crossings: a long tunnel from the top of one shaft to the foot of the next, with a rock
  //  ceiling to swing from and pits in its floor too wide to walk and too deep to climb out of
  //  without the rope (but never deeper than the rope can reach the ceiling from).
  //  Caverns (Gluttony's crossings): see cave() below.
  let seed = 1, PH = [0, 0, 0], rows = new Map(), slots = new Map();
  const secs = [], walls = [];
  function ensureSecs(n) {
    while (secs.length <= n) {
      const k = secs.length, prev = secs[k - 1];
      if (!prev) { secs.push({ type: "shaft", h0: 1, h1: 44, c: MID - 19, k, dom: NOV ? NOV.domain : null }); continue; }
      const dom = domOf(k);
      if (prev.type === "shaft") {
        const gate = isGate(k), cave = !gate && !!WIDE[dom], slope = !gate && !!SLOPE[dom];
        if (slope) {
          // As many terraces as the way across holds, each two rows above the last.
          const c1 = prev.c < MID ? MID + LW : MID - LW, n = Math.max(4, Math.round((Math.abs(c1 - prev.c) - 8) / TER));
          secs.push({ type: "slope", h0: prev.h1 + 1, h1: prev.h1 + 2 * n + SG + 8, from: prev, k, dom, n });
        } else secs.push({ type: cave ? "cave" : "trav", h0: prev.h1 + 1, h1: prev.h1 + (cave ? CH : TH), from: prev, k, dom, gate });
      } else {
        // The next shaft: across from the last, as far as the crossing between them wants.
        const w = WIDE[dom] ? 138 : SLOPE[dom] ? LW : MINE[dom] ? AW : 19, c0 = prev.from.c, want = prev.type === "cave" ? 276 : prev.type === "slope" ? 2 * LW : MINE[dom] ? 2 * AW : 38;
        const c = [MID - w, MID + w].filter((q) => Math.abs(q - c0) >= 25).sort((a, b) => Math.abs(Math.abs(a - c0) - want) - Math.abs(Math.abs(b - c0) - want))[0];
        secs.push({ type: "shaft", h0: prev.h1 + 1, h1: prev.h1 + (SLOPE[dom] ? 16 + Math.floor(hash2(k, 20, seed) * 8) : 34 + Math.floor(hash2(k, 20, seed) * 22)), c, k, dom });
      }
    }
  }
  function sectionAt(h) {
    if (!(h >= 1)) h = 1; else if (h > 2e5) h = 2e5;     // (never for ever, whatever it is asked)
    while (!secs.length || secs[secs.length - 1].h1 < h) ensureSecs(secs.length);
    let lo = 0, hi = secs.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (secs[m].h1 < h) lo = m + 1; else hi = m; }
    return secs[lo];
  }
  // A row of a shaft about the middle column c: meandering slowly, widening a little with height,
  // and (in the shafts proper) with shelves out from the walls.
  function shaftRow(h, c, sec, shelves) {
    const k = Math.min(1, h / 900);
    const cc = c + 4.5 * Math.sin(h * 0.05 + PH[0]) + 2 * Math.sin(h * 0.13 + PH[1]);
    const hw = 5 + k + 3 * (0.5 + 0.5 * Math.sin(h * 0.061 + PH[2]));
    let L = Math.round(cc - hw), R = Math.round(cc + hw);
    // Shelves out from the walls, two rows deep: something to climb onto.
    const b = Math.floor(h / 3);
    if (shelves && h > 10 && h % 3 < 2 && h - sec.h0 >= 4 && sec.h1 - h >= 4) {
      if (hash2(b, 3, seed) < 0.2) L += 2 + Math.floor(hash2(b, 4, seed) * 3);
      if (hash2(b, 5, seed) < 0.2) R -= 2 + Math.floor(hash2(b, 6, seed) * 3);
    }
    if (R - L < 5) { const m = Math.round((L + R) / 2); L = m - 3; R = m + 3; }
    L = clamp(L, 2, COLS - 9); R = clamp(R, L + 5, COLS - 3);
    return { L, R };
  }
  // In a crossing or a cavern: the shaft below it, going on (as the way up through a cavern's cliff).
  function edges(j) {
    let r = rows.get(j); if (r) return r;
    const h = -j, sec = sectionAt(h);
    r = sec.type === "shaft" ? shaftRow(h, sec.c, sec, true) : shaftRow(h, sec.from.c, sec, false);
    rows.set(j, r); return r;
  }
  // The platforms standing in the shafts, some a little askew (but none in Gluttony's: its slime is
  // enough). In Wrath's domain most of them crumble: his weight on them, they crack, glowing, and
  // give way. In Gluttony's some are slimy.
  function island(s) {
    if (slots.has(s)) return slots.get(s);
    let isl = null;
    const h0 = s * SLOT + 2 + Math.floor(hash2(s, 7, seed) * 5), k = Math.min(1, h0 / 900), sec = sectionAt(h0);
    const ih = hash2(s, 9, seed) < 0.3 ? 2 : 1, iw = 3 + Math.floor(hash2(s, 10, seed) * 4);
    const E = sec.type === "shaft" ? eyeOf(sec) : null;
    if (h0 > 8 && sec.type === "shaft" && h0 - 3 >= sec.h0 && h0 + ih + 2 <= sec.h1 && !(E && h0 + ih + 4 >= E.h0 && h0 - 6 <= E.h1) && hash2(s, 8, seed) < 0.72 - 0.2 * k) {
      let lo = -1e9, hi = 1e9;
      for (let h = h0 - 1; h <= h0 + ih; h++) { const e = edges(-h); lo = Math.max(lo, e.L + 3); hi = Math.min(hi, e.R - 3 - iw + 1); }
      if (hi >= lo) {
        const x0 = Math.round(lerp(lo, hi, hash2(s, 11, seed)));
        isl = { x0, x1: x0 + iw - 1, h0, h1: h0 + ih - 1, s, crumble: sec.dom === "wrath" && hash2(s, 13, seed) < 0.6, st: null, t: 0, stage: 0,
          slick: sec.dom === "gluttony" && hash2(s, 17, seed) < 0.3, tilt: sec.dom === "gluttony" || hash2(s, 15, seed) < 0.5 ? 0 : Math.round((hash2(s, 16, seed) - 0.5) * 10) };
      }
    }
    slots.set(s, isl); return isl;
  }
  // A crossing. At a domain's threshold its first stretch of floor is long, and a carved gate stands
  // on it: a great block hung from the high roof, carved at its foot, with a doorway under it. In Wrath's domain, thin bridges
  // of rock lie over some of the pits, and give way under him.
  function trav(sec) {
    if (sec.info) return sec.info;
    const en = edges(-(sec.h0 - 1)), ex = edges(-(sec.h1 + 1));
    const dir = ex.L + ex.R > en.L + en.R ? 1 : -1, a = Math.min(en.L, ex.L), b = Math.max(en.R, ex.R);
    const pit = new Uint8Array(COLS), stop = dir > 0 ? ex.L - 3 : ex.R + 3, before = (i) => (dir > 0 ? i < stop : i > stop);
    let i = dir > 0 ? en.R + 1 : en.L - 1, n = 0, floor = true;
    while (before(i)) {
      const len = floor ? (n === 0 && sec.gate ? (NOV ? 21 : 9) : 3 + Math.floor(hash2(sec.k, 40 + n, seed) * 3)) : 5 + Math.floor(hash2(sec.k, 60 + n, seed) * 4);   // (in the seven mountains, room past the gate for the lay brother)
      for (let q = 0; q < len && before(i); q++, i += dir) if (!floor) pit[i] = 1;
      floor = !floor; n++;
    }
    // The roof, high over the tunnel, rising and falling a little.
    const roof = new Int16Array(COLS), q = hash2(sec.k, 45, seed) * TAU;
    for (let i = 0; i < COLS; i++) roof[i] = TR - Math.round(1.5 + 1.5 * Math.sin(i * 0.19 + q));
    const T = { en, ex, a, b, dir, pit, roof, bridges: [], bridgeOf: null, door: null, lamps: [] };
    if (sec.gate) {
      // The gate: three cells thick, two cells from the way in; its lamp just beyond it.
      const d0 = dir > 0 ? en.R + 3 : en.L - 5;
      T.door = { i0: d0, i1: d0 + 2 };
      if (NOV) T.yard = dir > 0 ? [d0 + 5, d0 + 18] : [d0 - 15, d0 - 2];        // (the lay brother's, past the lamp: no demon or shrine there)
      const lx = (dir > 0 ? d0 + 4.5 : d0 - 1.5) * CELL;
      T.lamps.push({ x: lx, y: -(sec.h0 + 7) * CELL - 0.01, lit: false });
    }
    if (MINE[sec.dom]) {
      // Chains hanging from beams across the roof, every few cells (none over the ways in and out).
      T.chains = [];
      for (let i = T.a + 6; i <= T.b - 6; i += 7 + Math.floor(hash2(sec.k, 1500 + i, seed) * 4)) {
        if ((i >= en.L - 3 && i <= en.R + 3) || (i >= ex.L - 3 && i <= ex.R + 3) || (T.door && i >= T.door.i0 - 3 && i <= T.door.i1 + 3)) continue;
        const ry = -(sec.h0 + roof[i]) * CELL + CELL, len = (5 + Math.floor(hash2(sec.k, 1600 + i, seed) * 6)) * CELL;
        T.chains.push({ x: (i + 0.5) * CELL, y: ry, len, ph: hash2(sec.k, 1700 + i, seed) * TAU });
      }
    }
    if (sec.dom === "wrath") {
      T.bridgeOf = new Int16Array(COLS);
      for (let q = 1; q < COLS - 1; q++) {
        if (!pit[q] || pit[q - 1]) continue;
        let e = q; while (pit[e + 1]) e++;
        if (hash2(sec.k, 200 + q, seed) < 0.5) { T.bridges.push({ i0: q, i1: e, st: null, t: 0 }); for (let z = q; z <= e; z++) T.bridgeOf[z] = T.bridges.length; }
      }
    }
    return (sec.info = T);
  }
  function travSolid(i, h, sec) {
    const T = trav(sec), r = h - sec.h0;
    if (i < T.a || i > T.b) return true;
    if (r <= 7) {
      if (i >= T.en.L && i <= T.en.R) return false;                                  // the way in
      if (r >= 1 && T.pit[i]) return r === 7 && !!T.bridgeOf && T.bridgeOf[i] > 0 && T.bridges[T.bridgeOf[i] - 1].st !== "gone";   // a pit (or a bridge over it)
      return true;                                                                   // the floor
    }
    if (r < T.roof[i]) return !!T.door && r >= 12 && i >= T.door.i0 && i <= T.door.i1;   // the tunnel, and the gate's block hanging from the roof
    return !(i >= T.ex.L && i <= T.ex.R);                                            // the roof, and the way out
  }
  // ---- Lust's briars ---------------------------------------------------------------------------------
  // A corridor from the top of one shaft, across the whole mountain and steadily up, to the foot of
  // the next: terraces, each about TER cells long and two rows above the last, under a roof of rock
  // to swing from. Most terraces are floored with briars; some have a pillar of briars rising in
  // them; here and there a clump of them hangs from the roof. Between, bare terraces to stand on
  // (and on them its demons). The briars hurt whoever touches them, him or a demon: they are what
  // Benedict threw himself into, when the temptation came (Gregory, Dialogues II.2).
  function slope(sec) {
    if (sec.info) return sec.info;
    const k = sec.k, n = sec.n, en = edges(-(sec.h0 - 1)), ex = edges(-(sec.h1 + 1)), dir = ex.L + ex.R > en.L + en.R ? 1 : -1;
    const iA = dir > 0 ? en.L - 2 : en.R + 2, iB = dir > 0 ? ex.R + 2 : ex.L - 2, lo = Math.min(iA, iB), hi = Math.max(iA, iB);
    const u = (i) => (i - iA) * dir, uB = u(iB), u1 = u(dir > 0 ? en.R : en.L) + 4, u2 = u(dir > 0 ? ex.L : ex.R) - 4;
    // The terraces along the way (u: cells from the near end).
    const ter = [{ a: 0, b: u1, F: 2 }], mid = n - 2, len = (u2 - u1 - 1) / mid;
    for (let t = 0; t < mid; t++) ter.push({ a: Math.round(u1 + 1 + t * len), b: Math.round(u1 + (t + 1) * len), F: 4 + 2 * t });
    ter.push({ a: u2, b: uB, F: 2 + 2 * (n - 1) });
    let bare = 0;
    ter.forEach((T, t) => {
      T.C = T.F + SG - 1 + Math.floor(hash2(k, 1100 + t, seed) * 4);
      const inner = t > 0 && t < ter.length - 1;
      T.thorn = inner && bare < 3 && hash2(k, 1200 + t, seed) < 0.62; bare = T.thorn ? bare + 1 : 0;
      T.pillar = T.thorn && T.b - T.a >= 9 && hash2(k, 1300 + t, seed) < 0.3 ? 2 + Math.floor(hash2(k, 1310 + t, seed) * 3) : 0;
      T.hang = inner && !T.pillar && hash2(k, 1400 + t, seed) < 0.22 ? 2 + Math.floor(hash2(k, 1410 + t, seed) * 2) : 0;
    });
    // Column by column: the floor's height (rows of rock), the roof's first row, the pillar, and
    // which surfaces are briars.
    const fl = new Int16Array(COLS), cl = new Int16Array(COLS).fill(9999), pl = new Int8Array(COLS), tf = new Uint8Array(COLS), tr = new Uint8Array(COLS), tz = new Int8Array(COLS);
    for (let i = lo; i <= hi; i++) {
      const v = u(i), t = ter.findIndex((T) => v >= T.a && v <= T.b), T = ter[t < 0 ? (v < 0 ? 0 : ter.length - 1) : t], c = (T.a + T.b) / 2;
      fl[i] = T.F; cl[i] = T.C; tf[i] = T.thorn ? 1 : 0; tz[i] = t;
      if (T.pillar && Math.abs(v - c) <= 1) pl[i] = T.pillar;
      if (T.hang && Math.abs(v - (c + 3 * (hash2(k, 1420 + t, seed) - 0.5))) <= 2) { cl[i] = T.C - T.hang; tr[i] = 1; }
    }
    return (sec.info = { en, ex, dir, lo, hi, ter, fl, cl, pl, tf, tr, tz, iA, iB });
  }
  function slopeSolid(i, h, sec) {
    const V = slope(sec), r = h - sec.h0;
    if (i < V.lo || i > V.hi) return true;
    if (r < V.fl[i]) return !(i >= V.en.L && i <= V.en.R && V.tz[i] === 0);   // the floor (and the way in, up out of the shaft below)
    if (r < V.fl[i] + V.pl[i]) return true;                                    // a pillar
    if (r >= V.cl[i]) return !(i >= V.ex.L && i <= V.ex.R && V.tz[i] === V.ter.length - 1);   // the roof (and the way out, up into the next shaft)
    return false;
  }
  // Is the rock at (x, y) briars? (The top of a briared floor, any part of a pillar, the underside
  // of a clump hanging from the roof.)
  function thornAt(x, y) {
    const i = Math.floor(x / CELL), h = -Math.floor(y / CELL); if (h < 1) return false;
    const sec = sectionAt(h); if (sec.type !== "slope") return false;
    const V = slope(sec), r = h - sec.h0; if (i < V.lo || i > V.hi) return false;
    return (V.tf[i] && r === V.fl[i] - 1) || (V.pl[i] > 0 && r >= V.fl[i] && r < V.fl[i] + V.pl[i]) || (V.tr[i] && r === V.cl[i]);
  }
  // ---- Gluttony's caverns ---------------------------------------------------------------------------
  // A cavern, swollen and tall, between two shafts set far apart. The shaft from below goes on up
  // through a cliff and comes out on its top, the near ledge; across the chasm a far ledge, with the
  // way out above it up through the roof. Between them: nothing to stand on but platforms of rock
  // hung in the dark, and far below, the cavern's floor. The roof is high over the ledges and the
  // tops of the chains, for long swings, and the hook always finds it (thrown far, it reels him up
  // to a length he can swing on): the safe way over is along it, swing by swing. Fall, and it is a
  // long way down, and a long way back up: the near cliff can be climbed with bare hands (the far
  // one is slimed with fat, and cannot); and the platforms go down in chains, each within the rope's
  // reach of the one above. Down there, what is worth going down for: a reliquary at the foot of the
  // deepest chains, another in a hollow at the foot of the far cliff, and idols in the cliffs.
  // Some platforms are slimy. (None lie askew.)
  const LH = 27, CR0 = 46;                       // the ledges' height in a cavern; its roof's (rows up from its floor): high, for long swings from the top
  function cave(sec) {
    if (sec.info) return sec.info;
    const k = sec.k, H0 = sec.h0, P = (h) => shaftRow(h, sec.from.c, sec, false);
    const en = edges(-(H0 - 1)), ex = edges(-(sec.h1 + 1)), dir = ex.L + ex.R > en.L + en.R ? 1 : -1;
    let pL = 1e9, pR = -1e9; for (let r = 0; r < LH; r++) { const e = P(H0 + r); pL = Math.min(pL, e.L); pR = Math.max(pR, e.R); }
    const top = P(H0 + LH - 1);
    // dir > 0 (the far side to the right): the chasm runs from vA to vB; the room over the ledges from uA to uB.
    const vA = dir > 0 ? pR + 4 : pL - 4, vB = dir > 0 ? ex.L - 4 : ex.R + 4;
    const uA = dir > 0 ? Math.min(top.L, pL) - 2 : Math.max(top.R, pR) + 2, uB = dir > 0 ? ex.R + 2 : ex.L - 2;
    const lo = Math.min(vA, vB), hi = Math.max(vA, vB), between = (i, a, b) => i >= Math.min(a, b) && i <= Math.max(a, b);
    // The platforms, in chains down from just under the way over. Each band across the chasm has one
    // chain, one to three deep; the band in the middle begins with a great platform, wide enough for
    // a demon to stand on.
    const plats = [], span = hi - lo + 1, nb = Math.max(3, Math.floor((span - 6) / 13)), bw = (span - 6) / nb;
    const mid = Math.floor(nb / 2);
    for (let b = 0; b < nb; b++) {
      const bx = lo + 3 + b * bw, depth = b === mid ? 2 : 1 + Math.floor(hash2(k, 90 + b, seed) * 3);
      let r1 = b === mid ? LH - 9 : LH - 5 - Math.floor(hash2(k, 80 + b, seed) * 3);
      for (let n = 0; n < depth; n++) {
        const great = b === mid && n === 0, w = great ? 8 : 3 + Math.floor(hash2(k * 7 + b, 300 + n, seed) * 4), th = great || hash2(k, 400 + b * 5 + n, seed) < 0.35 ? 2 : 1;
        if (r1 - th + 1 < 5) break;
        const x0 = Math.round(bx + hash2(k, 500 + b * 5 + n, seed) * Math.max(0, bw - w));
        const slick = !great && hash2(k, 650 + b * 5 + n, seed) < 0.3, tilt = 0;
        plats.push({ x0, x1: x0 + w - 1, r0: r1 - th + 1, r1, band: b, n, great, last: false, slick, tilt });
        r1 -= th + 6 + Math.floor(hash2(k, 600 + b * 5 + n, seed) * 2);
      }
      for (let q = plats.length - 1; q >= 0; q--) if (plats[q].band === b) { plats[q].last = true; break; }
    }
    // The roof, swollen: low lumps hanging from it, up to three rows down; and over the top of each
    // chain, wherever it would be out of the rope's reach, a great swelling hanging lower.
    const ceil = new Int16Array(COLS), q1 = hash2(k, 31, seed) * TAU, q2 = hash2(k, 32, seed) * TAU;
    for (let i = 0; i < COLS; i++) ceil[i] = CR0 - clamp(Math.round(1.4 + 1.3 * Math.sin(i * 0.21 + q1) + 0.9 * Math.sin(i * 0.57 + q2)), 0, 3);
    for (const p of plats) if (p.n === 0) { const need = Math.max(Math.floor(p.r1 + 22), LH + 15); for (let i = p.x0; i <= p.x1; i++) ceil[i] = Math.min(ceil[i], need); }
    const base = new Uint8Array(CH * COLS).fill(1);
    for (let r = 0; r < CH; r++) {
      const e = r < LH ? P(H0 + r) : null;
      for (let i = 1; i < COLS - 1; i++) {
        let open = false;
        if (r < LH) open = (i >= e.L && i <= e.R) || between(i, vA, vB);         // the way up through the cliff; the chasm
        else if (r < ceil[i]) open = between(i, uA, uB);                           // the room over the ledges
        else open = i >= ex.L && i <= ex.R;                                         // the way out, up through the roof
        if (open) base[r * COLS + i] = 0;
      }
    }
    // A hollow at the foot of the far cliff, three cells deep.
    const face = dir > 0 ? vB + 1 : vB - 1;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) base[r * COLS + face + dir * q] = 0;
    const g = base.slice();
    for (const p of plats) for (let r = p.r0; r <= p.r1; r++) for (let i = p.x0; i <= p.x1; i++) g[r * COLS + i] = 1;
    // The lamps on the two ledges, at the edge of the chasm, lit as he passes.
    const yL = -(H0 + LH - 1) * CELL - 0.01;
    const lamps = [{ x: (dir > 0 ? vA - 1.5 : vA + 2.5) * CELL, y: yL, lit: false }, { x: (dir > 0 ? vB + 2.5 : vB - 1.5) * CELL, y: yL, lit: false }];
    // At the foot of the deepest chains: a reliquary, for the one who goes down.
    const relics = [];
    for (const p of plats) if (p.last && p.n >= 2 && relics.length < 2) relics.push({ x: (p.x0 + p.x1 + 1) / 2 * CELL, y: -(H0 + p.r1) * CELL - 1, got: false });
    if (!relics.length) { const p = plats.filter((q) => q.last && !q.great).sort((a, b) => a.r1 - b.r1)[0]; if (p) relics.push({ x: (p.x0 + p.x1 + 1) / 2 * CELL, y: -(H0 + p.r1) * CELL - 1, got: false }); }
    relics.push({ x: (face + dir + 0.5) * CELL, y: -(H0 - 1) * CELL - 1, got: false });
    // Glow-worms on the roof, faint as stars: the only thing that shows where it is in the dark.
    const worms = [];
    for (let i = Math.min(uA, uB); i <= Math.max(uA, uB); i++) if (hash2(k, 700 + i, seed) < 0.55) worms.push({ x: (i + hash2(k, 800 + i, seed)) * CELL, y: -(H0 + ceil[i]) * CELL + CELL + 1 + hash2(k, 900 + i, seed) * 3, ph: hash2(k, 1000 + i, seed) * TAU });
    const V = (sec.info = { en, ex, dir, vA, vB, uA, uB, lo, hi, ceil, base, g, plats, lamps, relics, worms, face });
    crawlOf(sec);                                  // (and the crawlway on from the hollow, cut into its rock)
    return V;
  }
  // ---- Avarice's needle's eye ------------------------------------------------------------------------
  // In each of its shafts, a shelf of rock across the way up, with one narrow way through it: "it is
  // easier for a camel to pass through the eye of a needle, than for a rich man to enter into the
  // kingdom of God" (Matthew 19:24). With any gold on him he cannot pass; under it, a box for alms.
  function eyeOf(sec) {
    if (sec.eye !== undefined) return sec.eye;
    sec.eye = null;
    if (sec.type !== "shaft" || !MINE[sec.dom] || sec.h1 - sec.h0 < 30) return null;
    const h0 = sec.h0 + Math.round((sec.h1 - sec.h0) * 0.55), e = edges(-h0), e1 = edges(-(h0 + 1));
    const lo = Math.max(e.L, e1.L) + 2, hi = Math.min(e.R, e1.R) - 3, i0 = lo + Math.floor(hash2(sec.k, 70, seed) * Math.max(1, hi - lo));
    sec.eye = { h0, h1: h0 + 1, i0, i1: i0 + 1 };
    return sec.eye;
  }
  const eyeShut = () => !!S && S.coins > 0;
  // The boxes for alms: under each eye, by the slot; and on the floor at the start of each gallery.
  function almsOf(sec) {
    if (sec.alms) return sec.alms;
    sec.alms = [];
    const E = eyeOf(sec);
    if (E) sec.alms.push({ x: (E.i0 - 0.6) * CELL, y: -(E.h0 - 1) * CELL + 12, hang: true });
    if (sec.type === "trav" && MINE[sec.dom] && !sec.gate) { const T = trav(sec), i = T.dir > 0 ? T.en.R + 2 : T.en.L - 2; sec.alms.push({ x: (i + 0.5) * CELL, y: -(sec.h0 + 7) * CELL, hang: false }); }
    return sec.alms;
  }
  function solid(i, j) {
    if (j >= 0 || i < 1 || i >= COLS - 1) return true;
    const h = -j, sec = sectionAt(h);
    // (A crawlway, and the chamber at its end.)
    const cw = sec.crawl === undefined ? crawlOf(sec) : sec.crawl;
    if (cw && i >= cw.lo && i <= cw.hi) { const r = h - sec.h0 - cw.r0, u = (i - cw.i0) * cw.dir; if (r >= 0 && (u < cw.L ? r < CW_H : r < CW_C)) return false; }
    if (sec.type === "trav") return travSolid(i, h, sec);
    if (sec.type === "slope") return slopeSolid(i, h, sec);
    if (sec.type === "cave") return cave(sec).g[(h - sec.h0) * COLS + i] === 1;
    const e = edges(j); if (i < e.L || i > e.R) return true;
    const E = sec.eye === undefined ? eyeOf(sec) : sec.eye;
    if (E && h >= E.h0 && h <= E.h1) return !(i >= E.i0 && i <= E.i1) || eyeShut();
    const isl = island(Math.floor(h / SLOT));
    return !!isl && isl.st !== "gone" && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 && i <= isl.x1;
  }
  const solidAt = (x, y) => solid(Math.floor(x / CELL), Math.floor(y / CELL));
  // ---- The low ways ----------------------------------------------------------------------------------
  // Here and there, at the foot of a wall, a way too low to stand in: a crawlway, cut into the rock
  // some paces, and at its end a little chamber where a reliquary lies hidden (its glow shows
  // faintly through the rock, to one who looks). In a crossing, in the far wall at the floor; in
  // Lust's corridors, in the wall at the far end; in Gluttony's caverns, on from the hollow at the
  // foot of the far cliff. (Metroid's narrow ways for the morph ball, made for a monk on his knees.)
  function crawlOf(sec) {
    if (sec.crawl !== undefined) return sec.crawl;
    sec.crawl = null;
    if (sec.k < 2) return null;
    let i0, r0, dir, R = null;              // the mouth (its first cell, its floor's row up from h0); the way in, into the rock
    if (sec.type === "trav") {
      if (hash2(sec.k, 2100, seed) > 0.6) return null;
      const T = trav(sec); dir = T.dir; i0 = dir > 0 ? T.b + 1 : T.a - 1; r0 = 8;
    } else if (sec.type === "slope") {
      if (hash2(sec.k, 2100, seed) > 0.6) return null;
      const V = slope(sec); dir = V.dir; i0 = dir > 0 ? V.hi + 1 : V.lo - 1; r0 = V.fl[dir > 0 ? V.hi : V.lo];
    } else if (sec.type === "cave") {
      const V = cave(sec); dir = V.dir; i0 = V.face + dir * 3; r0 = 0; R = V.relics[V.relics.length - 1];
    } else return null;
    const L = 7 + Math.floor(hash2(sec.k, 2102, seed) * 6), c0 = i0 + dir * L, c1 = c0 + dir * 2, lo = Math.min(i0, c1), hi = Math.max(i0, c1);
    if (lo < 2 || hi > COLS - 3) return null;
    if (!R) R = { x: 0, y: 0, got: false };
    R.x = (c1 + 0.5) * CELL; R.y = -(sec.h0 + r0 - 1) * CELL - 1;          // (at the chamber's far end)
    sec.crawl = { dir, i0, r0, L, c0, c1, lo, hi, relics: [R] };
    // (A cavern keeps its rock in a grid of its own, drawn from it: the crawlway is cut into that too.)
    if (sec.type === "cave") { const V = sec.info; for (let i = lo; i <= hi; i++) { const u = (i - i0) * dir; for (let r = r0; r < r0 + (u < L ? CW_H : CW_C); r++) V.base[r * COLS + i] = V.g[r * COLS + i] = 0; } }
    return sec.crawl;
  }
  const NO_RELICS = [];
  const relicsOf = (sec) => { const cw = crawlOf(sec); return sec.type === "cave" ? cave(sec).relics : cw ? cw.relics : NO_RELICS; };
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
  const bodyH = () => (S && S.crawl ? CRAWL_H : HT);
  function boxHit(x, y) {
    const i0 = Math.floor((x - HW) / CELL), i1 = Math.floor((x + HW - 0.001) / CELL);
    const j0 = Math.floor((y - bodyH()) / CELL), j1 = Math.floor((y - 0.001) / CELL);
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
    S.y = dy > 0 ? Math.floor(S.y / CELL) * CELL - 0.01 : (Math.floor((S.y - bodyH()) / CELL) + 1) * CELL + bodyH() + 0.01;
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
    for (let y = S.y - Math.min(36, bodyH() - 6); y <= S.y - 6; y += 6) if (solid(i, Math.floor(y / CELL))) return true;
    return false;
  }
  // A wall he can take hold of from the air: rock beside him (within a few steps of the face he
  // touches) at his knees and at his chest. Not the side of a platform (never more than two rows
  // deep), or a lump hanging from a roof.
  function wallBeside(s) {
    const x = S.x + s * (HW + 1.5);
    for (const y of [S.y - 6, S.y - 38]) { const j = Math.floor(y / CELL); let hit = false; for (let q = 0; q <= 3 && !hit; q++) hit = solid(Math.floor((x + s * q * CELL) / CELL), j); if (!hit) return false; }
    return true;
  }
  // The face of the rock on side s as he climbs it: where it stands at five heights over his body
  // and a little above his head, averaged (null if it is out of his reach at most of them).
  function faceLine(s) {
    let sum = 0, n = 0, hands = 0;
    for (const dy of [4, 15, 27, 39, 52]) {
      const y = S.y - dy, x0 = S.x - s * (HW + 4);
      if (solidAt(x0, y)) continue;
      for (let k = 2; k <= 56; k += 2) if (solidAt(x0 + s * k, y)) { const c = Math.floor((x0 + s * k) / CELL); sum += s > 0 ? c * CELL : (c + 1) * CELL; n++; if (dy > 30) hands++; break; }
    }
    // (Rock at his hands is enough, though there be a hollow at his feet: he hangs from his hands.)
    return n >= 3 || hands === 2 ? sum / n : null;
  }
  // The torch's foot driven into the rock above him: a knock, and grit.
  function plant(s) {
    const [hx, hy] = monkJoint(S.x, S.y, S.dir, S.lastPose || STAND, "hB");
    Sound.fx.tick(240, 0.22);
    for (let q = 0; q < 3; q++) S.parts.push({ kind: "chip", x: hx + s * 3, y: hy + 2, vx: -s * (20 + Math.random() * 50), vy: -20 - Math.random() * 40, life: 0.4, age: 0 });
  }
  // Off the rock, he may be tucked in behind a crag of it: out from it, away from where the rock was.
  function unclip(s) {
    for (let k = 0; k < 28 && boxHit(S.x, S.y); k++) S.x -= s;
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }
  // How far he must lean out from the wall on side s to get past rock just above him (0 if none in the way, -1 if too far).
  function stepOut(s, up) {
    if (!boxHit(S.x, S.y - up)) return 0;
    for (let k = 4; k <= 52; k += 4) if (!boxHit(S.x - s * k, S.y - up) && !boxHit(S.x - s * k, S.y)) return k;
    return -1;
  }
  const grip = () => [S.x, S.y - GRIP];
  const middle = () => [S.x, S.y - bodyH() / 2];

  // ---- Ledges: stepping up, climbing up -------------------------------------------------------------
  // The top of the rock just beyond his side s, between lo and hi above his feet, with room to
  // stand on it. edge is the near corner of the ledge; x1 where he will stand.
  function ledge(s, lo, hi, reachOut) {
    for (const off of reachOut ? [3, 9, 15, 21, 27] : [3, 8]) {
      const ci = Math.floor((S.x + s * (HW + off)) / CELL);
      for (let j = Math.floor((S.y - hi) / CELL); j <= Math.floor((S.y - lo) / CELL); j++) {
        if (!solid(ci, j) || solid(ci, j - 1) || solid(ci, j - 2) || solid(ci, j - 3)) continue;
        const top = j * CELL, edge = s > 0 ? ci * CELL : (ci + 1) * CELL, x1 = edge + s * 12;
        if (off >= 15 && !lipInReach(edge, s, top)) continue;               // (not over a wall between him and it)
        if (!boxHit(x1, top - 0.01) && !boxHit(edge - s * 8, top - 2) && openBelow(edge, s, top)) return { top, edge, x1, s, h: S.y - top };
      }
    }
    return null;
  }
  // Can his hands come at a ledge's lip through the air (from his chest or his waist), with no rock
  // between, so that climbing it does not take him through a wall?
  function lipInReach(edge, s, top) {
    const [mx, my] = middle(), tx = edge - s * 6, ty = top + 6;
    if (solidAt(tx, ty)) return false;
    // (Straight to it; or out from under an overhang and then up, or up and then across.)
    for (const y of [my - 8, my + 8]) if (los(mx, y, tx, ty) || (los(mx, y, tx, y) && los(tx, y, tx, ty)) || (los(mx, y, mx, ty) && los(mx, ty, tx, ty))) return true;
    return false;
  }
  // Is the way up beside a ledge's edge free of the needle's slab, from his head to its top? Other
  // rock he may pass behind, as at the jags; but the eye's slab he must go through the eye.
  function openBelow(edge, s, top) {
    for (let y = top + 6; y < S.y - HT + 8; y += 8) {
      const h = -Math.floor(y / CELL), E = eyeOf(sectionAt(h));
      if (E && h >= E.h0 && h <= E.h1 && solidAt(edge - s * 5, y)) return false;
    }
    return true;
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
        if (!openBelow(edge, sd, top) || !lipInReach(edge, sd, top)) continue;
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
  // opts.nov: the novitiate ({ domain, demons, torch, flare }); otherwise the climb itself.
  function start(opts) {
    opts = opts || {};
    NOV = opts.nov ? Object.assign({}, opts.nov) : null;
    seed = opts.seed || (Math.random() * 1e9) | 0; rows = new Map(); slots = new Map(); walls.length = 0; secs.length = 0;
    const r = seeded(seed); PH = [r() * TAU, r() * TAU, r() * TAU];
    const e = edges(-2), x = (e.L + e.R + 1) / 2 * CELL;
    S = {
      x, y: -0.01, vx: 0, vy: 0, dir: 1, ground: true, cling: 0, clingT: 0, landT: 0, anim: 0, act: null,
      rope: null, shot: null, climbing: false, climbPh: 0, throwT: 0, throwA: 0, ropeVis: [], shotVis: [],
      fuel: 1, t: 0, rt: 0, top: 0, read: 0, dying: 0, level: 0,
      flare: { on: false, t: 0, n: 0 }, parts: [], ghosts: [], verse: null,
      cam: { x: clamp(x - W / 2, 0, COLS * CELL - W), y: 70 - H }, torch: [x, -50], light: null,
      touches: new Map(), keys: {}, hooked: 0, hintT: 0, lastDraw: 0, flip: null, next: null, hangT: 0, jumpT: 0, wall: 0,
      demons: [], things: [], held: null, atk: null, popK: 0, ids: 0, cast: 0, respawnT: 0, hurtT: 0, invT: 0, flashT: 0, floatT: 0, shake: 0, fightSeen: false, fightHintT: 0, meter: 1, kickCd: 0, swingKickT: 0, hang: null, ward: null, crosses: [],
      crumbling: [], relics: 0, mark: null, grease: [], say: null, tint: null, pulled: null, coins: 0,
      blocks: [], tied: null, yank: null, blockSeen: false, binned: 0, dragging: false, bigs: [], latched: null, prints: [], greatDown: new Set(), foot: null, kept: null, keptAt: null,
    };
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
    S.dying = 0.001; S.fuel = 0; endFlare(true);
    Sound.fx.death(); Sound.setLevel(0);
  }
  function finish() {
    const m = metres(S.top);
    if (!NOV && m > (save.climbBest || 0)) save.climbBest = m;
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
  const KEEP = "wyhtl-mountains", SEEN = ["pushSeen", "legsSeen", "crawlSeen", "fightSeen", "blockSeen", "tiedSeen", "handSeen", "carrySeen", "riseSeen", "greatSeen", "latchSeen", "hurlSeen", "shedSeen", "hauntSeen", "freedSeen", "boonSeen"];
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
    all[NOV.domain] = { v: 1, seed, x: Math.round(x * 10) / 10, y: Math.round(y * 100) / 100, m: metres(-y), why, top: Math.round(Math.max(S.top, -y)), read: S.read, cast: S.cast, relics: S.relics, binned: S.binned,
      coins: S.coins || 0, fuel: r2(S.fuel), meter: r2(S.meter), walls, lamps, got, bins, greatDown: [...S.greatDown], tied: S.tied ? [S.tied.shape, S.tied.dom] : null, seen, at: Date.now() };
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
    S.top = Math.max(R.top || 0, -R.y); S.read = R.read || 0; S.cast = R.cast || 0; S.relics = R.relics || 0; S.binned = R.binned || 0; S.coins = R.coins || 0;
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
    for (let k = 7; k < S.popK; k++) { ensureSecs(k); if (planGreat(k)) S.greatK = k; }
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
    // (None of that kind near the height asked: any kind.)
    const k0 = h < 4 ? 0 : sectionAt(Math.floor(h)).k;
    let spot = null;
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
    const tier = clamp(Math.round(+sc.great || 0), 0, 4);
    if (tier) {
      const G = GREAT.gluttony, gs = 1 + 0.2 * (tier - 1), hw = G.hw * gs, ht = G.ht * gs;
      let at = null;
      for (const d of [190, 150, 240, 120, 300, 90]) for (const sd of [S.dir, -S.dir]) if (!at) at = dFree(S.x + sd * d, S.y - 20, hw, ht);
      if (!at) at = dFree(S.x, S.y - HT - ht, hw, ht);
      if (at) S.bigs.push({ sin: "gluttony", tier, sc: gs, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir: sign(S.x - at[0]) || 1, hp: tier, maxHp: tier, st: "stone", t: 0, wake: 0, lit: 0,
        anim: Math.random() * 9, stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: kHere, id: ++S.ids, growlT: -9, stoneT: -9 });
    }
    // A block tied to his belt (always, with a great demon: only a block can hurt it).
    if (sc.block || tier) {
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
        S.ropeVis = S.shotVis; S.shot = null; S.hooked++; Sound.fx.tether(); Sound.fx.chain(panX(c.x));
        return;
      }
      if (sh.hit) {
        const [gx, gy] = grip();
        // The hook bites at the rock's face: the rope runs from just outside it, never through it.
        let hx = sh.tx, hy = sh.ty; for (let k = 0; k < 8 && solidAt(hx, hy); k++) { hx -= sh.ux * 1; hy -= sh.uy * 1; }
        S.rope = { x: hx, y: hy, len: Math.max(ROPE_MIN, dist(gx, gy, hx, hy)), bends: [], fixed: 0, hx: sh.tx, hy: sh.ty };
        S.ropeVis = S.shotVis; S.shot = null; S.hooked++;
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
  function letGo(quick) {
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
    letGo(true);
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
  function action() {
    if (!S || S.dying || S.act) return;
    if (S.crawl) { upFromCrawl(); return; }
    if (S.hang) { S.hang = null; S.ground = false; return; }
    if (S.next) { S.next = null; return; }           // mid-flip: he lets the next throw go
    if (S.tied && S.tied.st === "hand") { const b = S.tied; b.st = "tied"; b.vx = S.dir * 40; b.vy = -30; Sound.fx.brickDrop(panX(b.x), 0.4); return; }   // the block in his hands: he sets it down
    if (S.rope && !S.ground) letGo();
    else if (S.cling) {
      const s = S.cling; S.cling = 0; S.vx = -s * 210; S.vy = -360; S.dir = -s; S.flip = { t: 0, s: -s, half: true }; Sound.fx.kick(0.6);
    } else if (S.held && !S.atk) {
      const o = S.held; S.held = null; o.st = "fly"; o.by = null; o.vx = S.dir * 60; o.vy = -40; o.g = o.kind === "fire" || o.kind === "thorn" ? 0 : 560; o.x = S.x + S.dir * 14; o.age = 0; o.life = 1.5;
      if (o.kind !== "fire") Sound.fx.objHit("stone", 0);
    } else if (S.rope) letGo();
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
      const side = q % 2 ? 1 : -1, row = Math.floor(q / 2), x = best.x + side * (dom === "gluttony" && side < 0 ? 44 : (dom === "wrath" || dom === "avarice") && side > 0 ? 52 : dom === "avarice" ? 46 : 32) + side * row * 27;
      who.push({ x, y: best.y, side: -side, kind: kinds[q % kinds.length], look: 0, st: "pray", vx: 0, vy: 0, t: 0, a: 1, ph: Math.random() * TAU });
    }
    S.demons.push({ idol: true, sin: dom, hw: 13, ht: 60, maxHp: IDOL_HP, hp: IDOL_HP, x: best.x, y: best.y, vx: 0, vy: 0, dir: 1, st: "idle", t: 0, cd: 0, x0: best.x, x1: best.x, sec: k,
      ground: true, juggle: 0, hurtT: 0, showHp: 0, lit: 0, id: ++S.ids, size: 0, who, fled: false });
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
    if (!S.blockSeen) { S.blockSeen = true; S.say = { text: "A BLOCK FROM THE IDOL", sub: "Go to it and it is tied to your belt. A lay brother waits at the gate above.", t: 0 }; }
  }
  function tie(b) {
    ev("block tied on", { shape: b.shape });
    b.st = "tied"; b.by = null; b.claim = null; b.rope = TETHER; b.flung = false; S.tied = b; S.lost = null; Sound.fx.tie(panX(b.x));
    if (!S.tiedSeen) { S.tiedSeen = true; S.say = { text: "TIED TO HIS BELT", sub: "It drags, and it weighs. Swing it into the demons, or tap it and throw it. Bring it to the gate.", t: 0 }; }
  }
  // Tapped, the block on his rope (near him): he takes it up in his hands, to throw. While he
  // holds it his hands are full: on the rock, a ledge or the rope, it hangs from the rope again.
  function takeUp() {
    const b = S.tied; if (!b || b.st !== "tied" || b.flung || S.held || S.rope || S.cling || S.hang || S.act || S.latched || S.dying) return false;
    const [mx, my] = middle(); if (dist(mx, my, b.x, b.y - b.ht / 2) > TETHER + 34) return false;
    b.st = "hand"; Sound.fx.pickup(); ev("block taken up");
    if (!S.handSeen) { S.handSeen = true; S.say = { text: "IN HIS HANDS", sub: "Tap where to throw it. Its rope pays out after it.", t: 0 }; }
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
    if (!S.carrySeen && dist(f.x, f.y, S.x, S.y) < 700) { S.carrySeen = true; S.say = { text: "A DEMON HAS THE BLOCK", sub: "Tap it: the hook pulls it down. Stop it before it reaches a shrine.", t: 0 }; }
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
    if (!S.riseSeen && dist(I.x, I.y, S.x, S.y) < 760) { S.riseSeen = true; S.say = { text: "THE IDOL RISES AGAIN", sub: "Bigger now, and harder to throw down. The block is in it.", t: 0 }; }
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
  const binSlot = (G, s) => [G.cart + G.dir * (-9 + (s % 3) * 9) * BK, G.y - (33 + Math.floor(s / 3) * 5) * BK];
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
  function stepBlocks(dt) {
    for (const b of S.blocks) {
      b.age = (b.age || 0) + dt;
      if (b.st === "loose") stepLoose(b, dt);
      else if (b.st === "tied") stepTied(b, dt);
      else if (b.st === "hand") { if (S.tied !== b || S.cling || S.hang || S.act || S.rope) b.st = S.tied === b ? "tied" : "loose"; else { const [hx, hy] = S.handW || grip(); b.x = hx; b.y = hy - 2; b.vx = S.vx; b.vy = S.vy; b.rot = 0; b.rope = TETHER; } }
      else if (b.st === "carried") { const f = b.by; if (!f || !alive(f) || f.block !== b) { if (f && f.block === b) f.block = null; b.st = "loose"; b.by = null; } }
      else if (b.st === "tobin") { b.t += dt; if (b.t >= 0.55) b.st = "bin"; }
    }
    // A block lying loose within his reach: he ties it on.
    if (!S.tied && !S.dying) {
      const [mx, my] = middle();
      for (const b of S.blocks) if (b.st === "loose" && !(b.nopick > S.rt) && Math.abs(mx - b.x) < HW + b.hw + 8 && Math.abs(my - (b.y - b.ht / 2)) < HT / 2 + b.ht / 2 + 4) { tie(b); break; }
    }
    // At a gate's cart: into it.
    if (S.tied && !S.dying) {
      const hNow = -S.y / CELL;
      for (const sec of sectionsIn(hNow - 10, hNow + 10)) { const G = brotherOf(sec); if (G && Math.abs(S.x - G.cart) < 48 && Math.abs(S.y - G.y) < 56) { deliver(G); break; } }
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
  // The lay brother, bearded, his hood back (when a block is brought, his hands lifted over it); his
  // cart, a deep bin of boards on one great wheel, with a lantern on a pole; and its donkey.
  function drawBrother(G, cam, rimP, lights) {
    const sx = G.cart - cam.x, sy = G.y - cam.y;
    if (sx < -220 || sx > W + 220 || sy < -140 || sy > H + 90) return;
    const t = S.rt, ink = new Path2D();
    const C0 = put(G.cart, G.y, G.dir, cam), CT = (u, v) => C0(u * BK, v * BK);
    // What is in the cart first, so the side of the bin hides all but the tops.
    G.bin.forEach((b, s) => { if (b.st !== "bin") return; const [x, y] = binSlot(G, s); drawBlock(b, x - cam.x, y - cam.y, 1, 0); });
    addPoly(ink, [[-17, 12], [17, 12], [18, 34], [-18, 34]], CT);
    addOval(ink, 0, 9, 9, 9, CT, 16);
    addPoly(ink, [[16, 15], [33, 18], [33, 19.6], [16, 17]], CT);
    addPoly(ink, [[-17, 34], [-15.6, 34], [-15.6, 48], [-17, 48]], CT); addPoly(ink, [[-17, 48], [-11, 48], [-11, 49.2], [-17, 49.2]], CT);
    const D0 = put(G.donkey, G.y, G.dir, cam), DT = (u, v) => D0(u * BK, v * BK), sw = Math.sin(t * 1.7 + G.sec) * 2, ear = Math.sin(t * 0.9 + G.sec * 3) > 0.96 ? 3 : 0;
    addOval(ink, 0, 21, 14, 7.5, DT, 16);
    for (const [u, lift] of [[-10, 0], [-6, 0.5], [7, 0], [11, 0.5]]) addPoly(ink, [[u - 1.4, 15], [u + 1.4, 15], [u + 1.1, lift], [u - 1.1, lift]], DT);
    addPoly(ink, [[9, 23], [14, 22], [21, 31], [17, 34]], DT);
    addPoly(ink, [[16, 30.5], [22, 34], [28.5, 28.5], [27, 26.5], [19, 28]], DT);
    addPoly(ink, [[18, 33], [20, 33.5], [17 - ear, 44], [16 - ear, 43.5]], DT); addPoly(ink, [[20, 33], [21.5, 33], [21 - ear * 0.5, 43.5], [19.5 - ear * 0.5, 43]], DT);
    addPoly(ink, [[-13, 24], [-11.5, 23], [-15 + sw, 11], [-16.5 + sw, 11.5]], DT);
    const k = clamp((t - G.cheer) / 0.3, 0, 1) * clamp((1.9 - (t - G.cheer)) / 0.4, 0, 1);
    const B0 = put(G.x, G.y, -G.dir, cam), BT = (u, v) => B0(u * BK, v * BK), br = Math.sin(t * 1.4 + G.sec) * 0.4;
    addPoly(ink, [[-7, 0], [7, 0], [5.5, 14], [5.8, 29 + br], [3, 33 + br], [-3, 33 + br], [-5.8, 29 + br], [-6.5, 14]], BT);
    addOval(ink, 0.8, 37.5 + br, 4, 4.4, BT, 12);
    addPoly(ink, [[1.5, 34.5 + br], [5.5, 35 + br], [4.5, 30 + br], [1.8, 31 + br]], BT);
    addPoly(ink, [[-5.5, 31 + br], [-1, 33.5 + br], [-3.5, 27 + br]], BT);
    // His arms: hanging at his sides; when a block comes to the cart, raised up in thanks.
    for (const s of [1, -1]) {
      const sh = [s * 4.6, 30 + br], hd = [s * lerp(5.6, 9.5, k), lerp(16.5, 45, k) + br * (1 - k)];
      const dx = hd[0] - sh[0], dy = hd[1] - sh[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      addPoly(ink, [[sh[0] + nx * 1.6, sh[1] + ny * 1.6], [hd[0] + nx * 1.1, hd[1] + ny * 1.1], [hd[0] - nx * 1.1, hd[1] - ny * 1.1], [sh[0] - nx * 1.6, sh[1] - ny * 1.6]], BT);
      addOval(ink, hd[0], hd[1], 1.5, 1.5, BT, 8);
    }
    // (Its rim of torchlight laid on now, not over him: he stands before the cart, not behind it.)
    ctx.fillStyle = C.ink; ctx.fill(ink); rimNow(ink);
    const [lx, ly] = CT(-11, 46.5); lights.push({ x: lx, y: ly, r: 120, a: 0.8 });
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
        if (k > 0.05) { const [hx, hy] = put(G.x, G.y, -G.dir, cam)(0, 52 * BK); glow(hx, hy, 40, C.warm, 0.4 * k); lightCross(hx, hy, 9, 0.8 * k, 2); }
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
  const GREAT_V = [0, 52, 62, 72, 84], GRASP = [0, 5, 8, 11, 14];   // by tier: how fast it comes; the blows it takes to get out of it
  // The first in the cavern of the fourth crossing, in the room over the chasm, across the way. After
  // it, here and there by chance (more often the higher he goes), never two within three sections.
  // (Where one would wait in section k, given where the last one waited: nothing is changed.)
  function planGreat(k) {
    if (!NOV || !GREAT[NOV.domain] || k < 7) return null;
    const sec = secs[k], G = GREAT[NOV.domain], tier = clamp(1 + Math.floor((k - 7) / 8), 1, 4), sc = 1 + 0.2 * (tier - 1), hw = G.hw * sc, ht = G.ht * sc;
    if (sec.gate) return null;
    let at = null, dir = 1;
    if (k === 7 && sec.type === "cave") { const V = cave(sec); at = dFree(lerp(V.vA, V.vB, 0.62) * CELL, -(sec.h0 + LH + 2) * CELL, hw, ht); dir = -V.dir; }
    else {
      if (k < 11 || k - (S.greatK === undefined ? -9 : S.greatK) < 3 || hash2(k, 990, seed) >= clamp(0.08 + 0.02 * (k - 11), 0, 0.4)) return null;
      const sp = spotsFor(k, NOV.domain); if (!sp.length) return null;
      const s = sp[Math.floor(hash2(k, 991, seed) * sp.length) % sp.length];
      at = dFree(s[0], s[1] - 30, hw, ht); dir = hash2(k, 992, seed) < 0.5 ? -1 : 1;
    }
    return at ? { at, dir, tier, sc, hw, ht } : null;
  }
  function placeGreat(k) {
    const P = planGreat(k); if (!P) return;
    S.greatK = k;
    if (S.greatDown.has(k)) return;                 // (cast down already, before he left the mountain)
    const { at, dir, tier, sc, hw, ht } = P;
    S.bigs.push({ sin: NOV.domain, tier, sc, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir, hp: tier, maxHp: tier, st: "stone", t: 0, wake: 0, lit: 0, anim: hash2(k, 993, seed) * 9,
      stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: k, id: ++S.ids, growlT: -9, stoneT: -9 });
    ev("a great demon waits", { k, tier });
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
    // Seen: some part of it in the torch's light (or, gone into the rock, near enough to be in it),
    // and he turned toward it; or, near the top of the mountain, turned toward it or not.
    const cx = g.x, cy = g.y - g.ht / 2, [mx, my] = middle(), [lx, ly] = S.torch, R = lightR() * 0.95;
    const lit = dist(lx, ly, cx, cy) < R + g.ht * 0.3 && (solidAt(cx, cy) || [0.15, 0.5, 0.85].some((q) => { const y = g.y - g.ht * q; return dist(lx, ly, cx, y) < R && los(lx, ly, cx, y); }));
    const facing = g.tier >= 4 || (cx - S.x) * S.dir > -14;
    // Seen for the first time (in his light, out in the open): the dread. From then on it follows him.
    if (!g.met && lit && !solidAt(cx, cy) && onView(g, -10) && canDread()) { g.met = true; S.haunt = g; g.lostT = 0; g.wait = hauntWait(g); startDread(g, "meet"); return; }
    if (S.haunt === g) {
      if (onView(g, 40) || dist(cx, cy, mx, my) < 300) g.lostT = 0; else g.lostT += dt;
      if (g.lostT > g.wait && canDread()) { if (burstAfter(g)) return; g.lostT = g.wait - 1.5; }      // (no room for it near him: it tries again soon)
    }
    const awake = lit && facing && g.stunT <= 0 && !S.dying && !S.latched;
    if (awake && g.st !== "hunt") {
      g.st = "hunt"; g.t = 0; ev("a great demon woke", { tier: g.tier });
      if (g.met && S.haunt !== g) { S.haunt = g; g.lostT = 0; g.wait = hauntWait(g); }      // (woken again, it follows him again)
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
    if (Math.abs(g.x - S.x) < g.hw * 0.7 + HW && S.y > g.y - g.ht + 12 && S.y - HT < g.y - 8) { reach(g); return; }
    for (const b of S.blocks) {
      if ((b.st !== "loose" && b.st !== "tied") || (b.hurled && S.rt - b.hurled < 1.5)) continue;
      const by = b.y - b.ht / 2;
      if (Math.abs(b.x - g.x) < g.hw + b.hw * 0.5 && by > g.y - g.ht && by < g.y + 6) { hurl(g, b); break; }
    }
  }
  function reach(g) {
    if (S.invT > 0 || S.dying) return;
    // On the rope it does not take him in: it strikes him off it. Swinging hard enough for a kick,
    // he comes off it unharmed (and it is driven back a little: only a block can hurt it); slower,
    // the blow comes home (or the ward turns it). So he must swing round it, and strike with a block.
    if (S.rope && !S.ground) {
      const sp = Math.hypot(S.vx, S.vy), s = sign(S.x - g.x) || -S.dir;
      if (sp >= 170) {
        ev("swung into a great demon", { sp: Math.round(sp) });
        letGo(true); S.vx = s * 260; S.vy = -200; S.ground = false; S.invT = 0.9; S.swingKickT = 0.35; S.kickCd = 0.45;
        g.kx = -s * 170; g.ky = -50; g.stunT = Math.max(g.stunT, 0.7); g.hurtT = 0.2;
        impactAt(g.x + s * g.hw * 0.6, g.y - g.ht * 0.5, -s, 0, 1.2, null); Sound.fx.kick(1, panX(g.x)); Sound.fx.stone(panX(g.x)); S.shake = 0.18;
        return;
      }
      if (!S.ward) { ev("struck off the rope by a great demon"); letGo(true); hitMonk(s, 0.1); g.kx = -s * 60; g.stunT = Math.max(g.stunT, 0.5); return; }
      letGo(true);
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
    S.latched = g; S.crawl = false; g.st = "latch"; g.t = 0; g.latchT = 0; g.blows = 0; g.need = GRASP[g.tier]; g.kx = 0; g.ky = 0; g.wake = 1;
    if (S.rope) letGo(true);
    S.flip = null; S.next = null; S.pend = null; S.hang = null; S.cling = 0; S.climbing = false; S.act = null; S.atk = null; S.hoverT = 0; S.vx = 0; S.vy = 0;
    if (S.flare.on) endFlare(true);
    if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.dir * 60; S.held.vy = -80; S.held = null; }
    if (S.tied && S.tied.st === "hand") S.tied.st = "tied";
    S.shake = 0.3; Sound.fx.chomp(panX(S.x));
    if (!S.latchSeen) { S.latchSeen = true; S.say = { text: "IT HAS HIM", sub: usingKeys() ? "Click, click, click (or any key): fight your way out. While it holds him, his light goes." : "Tap, tap, tap: fight your way out. While it holds him, his light goes.", t: 0 }; }
  }
  function holdHim(g, dt) {
    g.latchT += dt; g.anim += dt * 1.5; g.x = S.x; g.y = S.y - 4;
    // (The longer it holds him, the faster his light goes.)
    if (!S.dying && !boonOn("unconsumed")) { S.fuel -= dt * (0.04 + 0.05 * g.latchT); if (S.fuel <= 0) lightOut(); }
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
  // A block into it. Only swung into it as he swings on the rope (or as he leaves it) is it a blow it
  // feels: it is knocked back and stunned a while (stone, its cracks glowing); the last blow, and it
  // breaks. Thrown, or struck with from the ground, the stone only drives it back.
  function strikeGreat(g, b) {
    if (g.st === "dying" || g.st === "latch" || (g.hitCd || 0) > S.rt) return;
    g.hitCd = S.rt + 0.6;
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    if (!(S.rt - (S.swungT || -9) < 0.4)) {
      ev("a great demon driven back", { by: b.flung ? "thrown" : "struck" });
      g.stunT = Math.max(g.stunT, 1); g.hurtT = 0.15; g.st = "stone"; g.t = 0; g.kx = ux * 230; g.ky = uy * 120 - 30;
      b.vx = -b.vx * 0.3; b.vy = -Math.abs(b.vy) * 0.3 - 120;
      impactAt(b.x, b.y - b.ht / 2, ux, uy, 1.4, null); Sound.fx.brickHit(0.7, panX(g.x)); Sound.fx.stone(panX(g.x)); S.shake = Math.max(S.shake, 0.15);
      if (!S.pushSeen) { S.pushSeen = true; S.say = { text: "IT ONLY STAGGERS", sub: "From the ground the stone only drives it back. Swing on the rope, and swing the block into it.", t: 0 }; }
      return;
    }
    g.hp -= 1; g.showHp = 3; g.hurtT = 0.3; g.stunT = 2.5; g.st = "stone"; g.t = 0; g.kx = ux * 170; g.ky = uy * 110 - 30;
    ev("a great demon struck", { hp: g.hp, by: b.flung ? "thrown" : "swung" });
    b.vx = -b.vx * 0.25; b.vy = -Math.abs(b.vy) * 0.25 - 140;
    impactAt(b.x, b.y - b.ht / 2, ux, uy, 2.6, null);
    Sound.fx.brickHit(1, panX(g.x)); Sound.fx.stone(panX(g.x)); gain(0.15); S.shake = Math.max(S.shake, 0.3);
    for (let q = 0; q < 10; q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: b.x, y: b.y - b.ht / 2, vx: (Math.random() - 0.5) * 240 - ux * 60, vy: -60 - Math.random() * 180, life: 0.7, age: 0 });
    if (g.hp <= 0) { g.st = "dying"; g.t = 0; g.stunT = 9; Sound.fx.greatFall(panX(g.x)); ev("a great demon cast down", { tier: g.tier }); }
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
    S.say = { text: "THE GREAT DEMON IS CAST DOWN", sub: "The torch and the flare are full.", t: 0 };
  }
  // Awake, it comes on a block (lying, or on his rope): it seizes it (wrenching it off his rope) and
  // hurls it back at him, hard and straight. If it reaches him it is a blow (his ward turns it);
  // either way it falls by him, his to take up again.
  function hurl(g, b) {
    ev("a great demon threw the block back", { shape: b.shape });
    if (S.tied === b) { S.tied = null; S.lost = b; S.dragging = false; Sound.fx.tetherBreak(); }
    const [mx, my] = middle(), hx = g.x + g.dir * g.hw * 0.5, hy = g.y - g.ht * 0.62, T = clamp(dist(hx, hy, mx, my) / 560, 0.15, 0.6);
    Object.assign(b, { st: "loose", by: null, claim: null, flung: false, rope: TETHER, x: hx, y: hy + b.ht / 2, vx: (mx - hx) / T, vy: (my - hy) / T - 0.5 * 640 * T, rot: 0, ground: false, hurled: S.rt, nopick: S.rt + 0.5, unseen: S.rt + 3 });
    g.flingT = 0.35; g.chew = 0.3;
    Sound.fx.growl(panX(g.x), 0.6); Sound.fx.throw(1);
    if (!S.hurlSeen) { S.hurlSeen = true; S.say = { text: "IT THREW THE BLOCK BACK", sub: "Take it up again, and throw it true.", t: 0 }; }
  }
  function freedSay() { S.freedPend = false; S.freedSeen = true; S.say = { text: "IT FOLLOWS NO FURTHER", sub: "\u201cThy word is a lamp to my feet.\u201d", t: 0 }; }
  // ---- A great demon's dread ----------------------------------------------------------------------------
  // The first time one comes into his light, the world stops: it shows itself (its flesh, its jaws,
  // its eyes burning; white as a coal by flashes) while the sting sounds, and then all goes on as
  // before. Once met, it follows him: left behind out of his sight a while, it bursts after him,
  // the world stops again, and there it is at the edge of what he can see, on the side he left it
  // (by his back, if it can be). Then the old rule: stone, unless he faces it in the light. So it
  // follows until it is cast down, or until he reads a verse: "Thy word is a lamp to my feet"
  // (Psalm 118:105).
  const DREAD_T = { meet: 1.15, burst: 0.9 };
  const hauntWait = (g) => 6 + Math.random() * 4 - 0.6 * (g.tier - 1);
  const canDread = () => !S.dread && !S.boonShow && !S.latched && !S.dying && !S.verseHold && !S.act;
  // Any of it within the view (grown by m on every side; m < 0, well inside it).
  function onView(g, m) {
    const c = S.cam;
    return g.x + g.hw > c.x - m && g.x - g.hw < c.x + W + m && g.y > c.y - m && g.y - g.ht < c.y + H + m;
  }
  function greatSays() {
    if (!S.greatSeen) { S.greatSeen = true; S.say = { text: "A GREAT DEMON", sub: "It moves only while you face it in the light. Only a block hurts it, swung into it as you swing on the rope.", t: 0 }; }
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
    if (D.kind === "meet") greatSays();
    else if (!S.hauntSeen) { S.hauntSeen = true; S.say = { text: "IT FOLLOWS YOU", sub: "Leave it behind, and it comes after you. Cast it down, or read a verse, and it follows no further.", t: 0 }; }
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
    const arm = (tone, sh, back) => {
      const wv = Math.sin(A * 5 + (back ? 2 : 0)), el = [lerp(6, 18, w) - (back ? 6 : 0) + 4 * fk, lerp(40, 52, w) + wv * 1.5 * w + 8 * fk], hd = [lerp(8, 34, w) - (back ? 7 : 0) + 12 * fk, lerp(26, 58, w) + wv * 2.5 * w + 16 * fk];
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
    // The jaw, hinged at the back of the head: shut, as stone; wide, awake (and working, as it chews).
    const ga = w * (0.6 + 0.1 * Math.sin(A * 6.5)) + (g.chew > 0 ? 0.35 * Math.abs(Math.sin(g.chew * 16)) : 0), Hu = -8, Hv = 60, ca = Math.cos(ga), sa = Math.sin(ga);
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
    add("e", oval(14.4, 76.6, lerp(2.2, 2.4, w), lerp(0.7, 2.1, w), 10)); add("e", oval(7.8, 77.8, lerp(1.7, 1.9, w), lerp(0.55, 1.7, w), 10));
    arm("m", [-2, 56], false);
    return P;
  }
  // Its frame on the screen: leaning into its way as it wakes, bobbing as it floats (still, as stone).
  function greatT(g, cam) {
    const sc = g.sc, d = g.dir, th = 0.2 * smooth(g.wake), c = Math.cos(th), s = Math.sin(th), j = g.st === "dying" ? 3.5 * clamp(g.t / 0.7, 0, 1) : g.hurtT > 0 ? 2 * g.hurtT / 0.3 : 0;
    const ox = g.x - cam.x + (Math.random() - 0.5) * j, oy = g.y - cam.y - Math.sin(g.anim * 3.2) * 2.5 * sc + (Math.random() - 0.5) * j;
    return (u, v) => { const dv = v - 40, ru = u * c + dv * s, rv = -u * s + dv * c + 40; return [ox + d * ru * sc, oy - rv * sc]; };
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
    paintMaw(mawParts(g), T, w, g.lit, al, g.hurtT > 0 ? 0.8 * g.hurtT / 0.3 : 0);
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
      for (const [u, v, r] of MAW_EYES) {
        const [x, y] = T(u, v);
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
  // ---- The weight of a blow ----------------------------------------------------------------------------
  // Where a blow lands: the world holds still a moment (longer, the harder the blow); a flash, and
  // rays burst from the place it struck; the one struck is squashed along the blow; and the view
  // shakes and is knocked a little the blow's way.
  function impact(f, kx, ky, power, x, y) {
    impactAt(x === undefined ? f.x - (sign(f.x - S.x) || 1) * f.hw * 0.6 : x, y === undefined ? f.y - f.ht * 0.55 : y, kx, ky, power, f);
  }
  function impactAt(x, y, kx, ky, power, f) {
    S.freeze = Math.max(S.freeze || 0, Math.min(0.11, 0.03 + 0.03 * power));
    S.shake = Math.max(S.shake, 0.06 + 0.06 * power);
    const l = Math.hypot(kx, ky) || 1; S.kick = { x: kx / l * 3.5 * power, y: ky / l * 3.5 * power, t: 0 };
    if (f) { f.squash = 1; f.squashA = Math.atan2(ky, kx); }
    S.parts.push({ kind: "impact", x, y, vx: 0, vy: 0, a: Math.atan2(ky, kx), s: power, c: f && SINS[f.sin] ? SINS[f.sin].light : "#fff2d0", life: 0.22, age: 0, real: true });
  }
  // A blow to the idol: it shakes, and chips fly; its worshippers flee. The third, and it falls.
  function hitIdol(f, dmg, kx) {
    if (f.st !== "idle") return false;
    f.hp -= dmg; f.hurtT = 0.3; f.showHp = 2.5; S.shake = Math.max(S.shake, 0.12);
    Sound.fx.crack(panX(f.x));
    for (let q = 0; q < 7; q++) S.parts.push({ kind: "chip", x: f.x + (Math.random() - 0.5) * 12, y: f.y - 18 - Math.random() * 20, vx: (Math.random() - 0.5) * 200, vy: -60 - Math.random() * 160, life: 0.6, age: 0 });
    scatter(f);
    if (f.hp <= 0) {
      setSt(f, "topple"); f.fall = sign(kx) || (f.x > S.x ? 1 : -1); gain(0.2);
      // The idol thrown down, his torch is filled again: the light it was keeping comes to him.
      S.fuel = 1; const [mx, my] = middle();
      for (let k = 0; k < 26; k++) S.parts.push({ kind: "coinfly", x: f.x + (Math.random() - 0.5) * 24, y: f.y - Math.random() * f.ht, tx: mx, ty: my, vx: 0, vy: 0, life: 0.3 + k * 0.03, age: 0, real: true, light: true, quiet: true });
    }
    return true;
  }
  function scatter(f) {
    if (f.fled) return;
    f.fled = true; Sound.fx.scatter(panX(f.x));
    for (const w of f.who) { w.st = "run"; w.t = 0; w.dir = sign(w.x - f.x) || (Math.random() < 0.5 ? -1 : 1); w.sp = 75 + Math.random() * 40; w.vy = -110 - Math.random() * 60; w.y -= 1; }
  }
  // The shrine in time: its worshippers turning their heads to his light, or fleeing, and fading
  // into the dark after a while; the idol, struck down, falling, and breaking in pieces.
  function updIdol(f, dt) {
    if (f.st === "rise" && f.t > 0.9) setSt(f, "idle");
    for (const w of f.who) {
      if (w.st !== "run") continue;
      w.t += dt; w.ph += dt * 12;
      w.vx = w.dir * w.sp; w.vy += GRAV * dt;
      const [hx, hy] = moveBox(w, w.vx * dt, w.vy * dt, 6, 34);
      if (hx) { w.dir = -w.dir; w.vy = Math.min(w.vy, -140); }
      if (hy > 0) w.vy = 0;
      w.a = clamp(1 - (w.t - 2) / 28, 0, 1);
    }
    f.who = f.who.filter((w) => w.a > 0);
    if (f.st === "topple" && f.t > 0.45) {
      // Broken: three pieces of it, flung from where it fell.
      setSt(f, "broken"); Sound.fx.crumble(panX(f.x)); S.shake = 0.2;
      for (let q = 0; q < 3; q++) S.things.push({ kind: "stone", shard: f.sin, sid: f.id * 3 + q, x: f.x + f.fall * (8 + q * 10), y: f.y - 14 - q * 6, vx: f.fall * (40 + q * 50) + (Math.random() - 0.5) * 40, vy: -160 - Math.random() * 120, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, st: "fly", by: null, g: 560, age: 0 });
      for (let q = 0; q < 12; q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: f.x + f.fall * 16 + (Math.random() - 0.5) * 20, y: f.y - 6, vx: (Math.random() - 0.5) * 240, vy: -40 - Math.random() * 200, life: 0.7, age: 0 });
      // In the seven mountains, a block out of it too: its own, the first time; after, whatever the demons brought it.
      if (NOV) { const out = f.blocks && f.blocks.length ? f.blocks.splice(0) : f.gave ? [] : [newBlock(f)]; f.gave = true; for (const b of out) reveal(b, f); }
    }
    if (f.st === "broken" && !f.who.length && dist(f.x, f.y, S.x, S.y) > 1600) f.st = "gone";
  }
  function populate(dt) {
    const hNow = -S.y / CELL;
    for (let n = 0; n < 200 && Number.isFinite(hNow); n++) { ensureSecs(S.popK); if (secs[S.popK].h0 > hNow + 30) break; placeFor(S.popK); S.popK++; }
    // In the novitiate, when all the demons of the place he is in are gone, others come.
    if (NOV && NOV.demons > 0) {
      const k = sectionAt(Math.max(1, Math.floor(hNow))).k;
      if (k < S.popK && !S.demons.some((f) => f.sec === k && !f.idol && f.st !== "gone")) { S.respawnT += dt; if (S.respawnT > 9) { S.respawnT = 0; placeFor(k, true); } } else S.respawnT = 0;
    }
  }
  function hurtDemon(f, dmg, kx, ky, how) {
    if (!alive(f)) return false;
    ev(f.idol ? "idol struck" : "demon struck", { sin: f.sin, dmg: r2(dmg), how: how || undefined, hpBefore: r2(f.hp) });
    if (f.idol) return hitIdol(f, dmg, kx);
    if (f.block) dropBlock(f, kx, ky);
    if (f.want && f.want.claim === f) f.want.claim = null; f.want = null;
    f.hp -= dmg; f.hurtT = 0.25; f.showHp = 2.5;
    if (S.pulled && S.pulled.f === f) { S.pulled = null; Sound.fx.tetherBreak(); }
    Sound.fx.demonHurt(f.sin, panX(f.x));
    const [cx, cy] = dMid(f);
    for (let k = 0; k < 8; k++) S.parts.push({ kind: "spark", c: SINS[f.sin].color, x: cx, y: cy, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.45, age: 0 });
    if (f.hp <= 0) { castOut(f); return true; }
    if (f.sin === "gluttony" && f.ground) {
      // Too heavy to throw: a blow that would send another flying only staggers it; a blow down fells it.
      if (how === "hurl" && ky > 300) setSt(f, "down"); else { setSt(f, "hurt"); f.vx = kx * 0.25; }
      return true;
    }
    if (how === "launch") { setSt(f, "air"); f.vx = kx; f.vy = ky; f.juggle = 0; }
    else if (how === "hurl") { setSt(f, "thrown"); f.vx = kx; f.vy = ky; }
    else if (f.st === "air" || f.st === "thrown" || f.st === "fall" || !f.ground) {
      setSt(f, "air"); f.vx = kx * 0.4; if (f.juggle < 4) f.vy = Math.min(f.vy, -240); f.juggle++;
    } else { setSt(f, "hurt"); f.vx = kx; }
    return true;
  }
  function castOut(f) {
    ev("cast out", { sin: f.sin });
    if (f.block) dropBlock(f, 0, -120);
    setSt(f, "dying"); Sound.fx.castOut(f.sin); S.fuel = Math.min(1, S.fuel + 0.12 + (f.loot || 0)); S.cast++; gain(0.25);
    if (f.loot) { const [mx, my] = middle(); for (let k = 0; k < 18; k++) S.parts.push({ kind: "coinfly", x: f.x + (Math.random() - 0.5) * 20, y: f.y - f.ht * 0.6, tx: mx, ty: my, vx: 0, vy: 0, life: 0.3 + k * 0.03, age: 0, real: true, light: true }); }
    const [cx, cy] = dMid(f);
    for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 160; S.parts.push({ kind: "spark", c: k % 3 ? SINS[f.sin].color : C.flameHot, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.9, age: 0 }); }
  }
  function flyDemon(f, dt) {
    const n = clamp(Math.ceil(Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt / 6), 1, 10), h = dt / n;
    for (let k = 0; k < n; k++) {
      f.vy += (f.st === "thrown" && f.t < 0.25 ? 250 : 760) * h;
      const sp = Math.hypot(f.vx, f.vy), [hx, hy] = moveBox(f, f.vx * h, f.vy * h, f.hw, f.ht);
      // Into the briars: they tear it, and it springs back out of them.
      if ((hx || hy) && !(f.thornCd > S.rt)) {
        const px = hx ? f.x + hx * (f.hw + 3) : f.x, py = hy > 0 ? f.y + 3 : hy < 0 ? f.y - f.ht - 3 : f.y - f.ht / 2;
        if (thornAt(px, py)) { f.thornCd = S.rt + 0.6; briarHit(px, py); hurtDemon(f, 2, hx ? -hx * 160 : f.vx * 0.4, hy > 0 ? -320 : 80, "launch"); return; }
      }
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
      if (f.st === "thrown") for (const g of S.demons) if (g !== f && alive(g) && Math.abs(g.x - f.x) < f.hw + g.hw && Math.abs(g.y - f.y) < Math.max(f.ht, g.ht)) {
        hurtDemon(g, 2, sign(f.vx) * 300, -260, "launch"); hurtDemon(f, 1, -sign(f.vx) * 80, -120); if (alive(f)) setSt(f, "fall"); f.vx *= -0.3;
        Sound.fx.wallSlam(panX(f.x)); gain(0.1); break;
      }
    }
  }
  function updDemon(f, dt) {
    f.t += dt; f.hurtT = Math.max(0, f.hurtT - dt); f.showHp = Math.max(0, f.showHp - dt); f.squash = Math.max(0, (f.squash || 0) - dt / 0.16);
    if (f.st === "gone") return;
    if (f.st === "dying") { if (f.t > 0.8) f.st = "gone"; return; }
    if (f.idol) { updIdol(f, dt); return; }
    if (f.st === "legs") return;                       // (on his legs: it goes where he goes)
    if (f.st === "emerge") { if (f.t > 0.9) setSt(f, "idle"); return; }
    if (f.st === "seize" || f.st === "carry") { floatDemon(f, dt); return; }
    if (f.st === "air" || f.st === "thrown" || f.st === "fall") { flyDemon(f, dt); return; }
    if (dist(f.x, f.y, S.x, S.y) > 760) return;
    f.ground = boxAt(f.x, f.y + 1, f.hw, f.ht);
    if (!f.ground) { setSt(f, "fall"); return; }
    if (f.vx) { moveBox(f, f.vx * dt, 0, f.hw, f.ht); f.vx *= Math.pow(0.01, dt); if (Math.abs(f.vx) < 6) f.vx = 0; }
    // Standing in briars (thrown there, say): they hurt it, and it springs out of them.
    if (thornAt(f.x, f.y + 2) && !(f.thornCd > S.rt)) { f.thornCd = S.rt + 0.6; f.y -= 2; hurtDemon(f, 1, (sign(f.vx) || f.dir) * 120, -300, "launch"); briarHit(f.x, f.y); return; }
    if ((f.st === "idle" || f.st === "walk" || f.st === "creep") && seekBlock(f)) return;
    const [mx, my] = middle(), [cx, cy] = dMid(f), sees = !S.dying && dist(mx, my, cx, cy) < (f.sin === "lust" ? 430 : 380) && los(cx, cy - 10, mx, my - 6);
    if (f.sin === "gluttony") stepGluttony(f, dt, mx, my, sees); else if (f.sin === "lust") stepLust(f, dt, mx, my, sees); else if (f.sin === "avarice") stepAvarice(f, dt, mx, my, sees); else stepWrath(f, dt, mx, my, sees);
  }
  // Pacing its platform while it waits.
  function wander(f, dt, sp) {
    if (f.st === "idle" && f.t > 1.4) { setSt(f, "walk"); f.dir = f.x < (f.x0 + f.x1) / 2 ? 1 : -1; }
    if (f.st === "walk") {
      const [hx] = moveBox(f, f.dir * sp * dt, 0, f.hw, f.ht);
      if (hx || (f.dir > 0 ? f.x >= f.x1 : f.x <= f.x0) || !boxAt(f.x + f.dir * (f.hw + 2), f.y + 2, 2, 2) || f.t > 3) setSt(f, "idle");
    }
  }
  function stepWrath(f, dt, mx, my, sees) {
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) { f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle"); if (f.cd <= 0) { setSt(f, "pickup"); Sound.fx.kindle(0.5, panX(f.x)); } break; }
        wander(f, dt, 26); break;
      case "pickup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.7) setSt(f, "windup"); break;      // the fire kindling over its head
      case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.55) setSt(f, "throw"); break;
      case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwFire(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 2.4 + Math.random() * 1.4; } break;
      case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
      case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
    }
  }
  // ---- Avarice's gold -------------------------------------------------------------------------------
  // Coins flung at him stick to his habit, and weigh on him: up the rope and the rock he goes slower,
  // his swing sags, he falls harder; with enough, he hardly climbs at all. Given away (in the boxes
  // for alms), each is light again in his torch: "alms deliver from death" (Tobit 12:9).
  const COINS_MAX = 9, COIN_V = 255, ALMS_LIGHT = 0.07;
  // (A block on his rope weighs as much as four of them.)
  const heavy = () => Math.min(COINS_MAX, (S.coins || 0) + (S.tied ? BLOCK_LOAD : 0) + (S && S.legsIn ? 3 : 0)) / COINS_MAX;
  // And his blows are weaker for it: with nine coins on him, two-thirds as hard, and shorter.
  function blowTo(f, dmg, kx, ky, how, move) {
    const w = 1 - 0.35 * heavy(), k = 0.3 + 0.7 * w, c = move && alive(f) ? comboHit(move, f) : 1;
    return hurtDemon(f, dmg * w * c, kx * k, ky * k, how);
  }
  // Variety in the fight. Each blow that lands adds to his fervour: a full measure for a move he has
  // not used in his last two; some for the one before last again (a back and forth); none for the
  // same again. It ebbs a little with every blow, and is gone if he stops a moment. His blows are
  // stronger by it: one move mashed stays as it was; two in turn, somewhat (about a third); many
  // moves, much (up to three parts in four more), growing over the run of blows.
  function comboHit(move, f) {
    const C = S.combo && S.rt - S.combo.t < 1.8 ? S.combo : (S.combo = { f: 0, last: [], n: 0, t: S.rt });
    const nov = !C.last.includes(move) ? 1 : C.last[C.last.length - 1] !== move ? 0.4 : 0;
    C.f = C.f * 0.85 + nov; C.last.push(move); if (C.last.length > 2) C.last.shift(); C.t = S.rt; C.n++;
    const k = Math.min(1.75, 1 + 0.12 * C.f);
    if (k >= 1.2) { const [cx, cy] = dMid(f); C.show = { k, t: S.rt, x: cx, y: cy - f.ht / 2 - 10 }; }
    ev("combo", { move, k: r2(k) });
    return k;
  }
  // The fervour of a run of blows, shown where it landed: x 1.4, and growing.
  function drawCombo(cam) {
    const C = S.combo, D = C && C.show; if (!D || S.rt - D.t > 0.9) return;
    const u = (S.rt - D.t) / 0.9, a = clamp(1 - u, 0, 1) * clamp((S.rt - D.t) / 0.06, 0, 1);
    text("\u00d7" + D.k.toFixed(1), D.x - cam.x, D.y - cam.y - 14 * u, { align: "center", font: FONT.title, size: 9 + 6 * (D.k - 1), weight: 700, color: D.k >= 1.6 ? "#fff1b8" : "#e8c46a", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 });
  }
  function throwCoins(f) {
    // (Thrown to come down on him: in the time the throw takes, the fall the coins make allowed for.)
    const hx = f.x + f.dir * 8, hy = f.y - f.ht + 6, [tx, ty] = middle(), T = Math.max(0.35, dist(hx, hy, tx, ty) / COIN_V), g = 330;
    const vx = (tx - hx) / T, vy = (ty - hy) / T - 0.5 * g * T;
    for (const da of [-0.12, 0, 0.12]) { const c = Math.cos(da), sn = Math.sin(da); S.things.push({ kind: "coin", x: hx, y: hy, vx: vx * c - vy * sn, vy: vx * sn + vy * c, rot: 0, vr: 0, st: "fly", by: "demon", g, age: 0, life: 5, r: 4, from: f }); }
    Sound.fx.coin(panX(f.x), 1);
  }
  // A coin strikes him: it clings to him.
  function coinSticks(o) {
    S.coins = Math.min(COINS_MAX, S.coins + 1); o.st = "gone"; if (S.mark === o) S.mark = null;
    Sound.fx.coin(panX(o.x), 0.7);
    for (let k = 0; k < 5; k++) S.parts.push({ kind: "spark", c: SINS.avarice.color, x: o.x, y: o.y, vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 60, life: 0.4, age: 0 });
  }
  // At a box for alms, all the gold on him given: coin after coin into it, and light in his torch.
  function giveAlms(b) {
    const n = S.coins; if (!n) return;
    S.coins = 0; S.fuel = Math.min(1, S.fuel + n * ALMS_LIGHT); S.whiteT = 0.1; Sound.fx.alms(panX(b.x), n);
    const [mx, my] = middle();
    for (let k = 0; k < n; k++) S.parts.push({ kind: "coinfly", x: mx + (Math.random() - 0.5) * 10, y: my + (Math.random() - 0.5) * 16, tx: b.x, ty: b.y - 6, vx: 0, vy: 0, life: 0.35 + k * 0.06, age: 0, real: true });
    S.parts.push({ kind: "ring", x: mx, y: my, vx: 0, vy: 0, life: 0.5, age: 0 });
  }
  // Avarice: a thief, low and quick, with its sack. From off, it flings coins at him out of the sack;
  // near on its own ground, it creeps to him and snatches the light of his torch into the sack (the
  // sack glows with it), and runs off with it. Cast out, its sack bursts, and the light comes back.
  function stepAvarice(f, dt, mx, my, sees) {
    const dx = S.x - f.x, near = Math.abs(dx) < 130 && Math.abs(S.y - f.y) < 70, reach = dist(S.x, S.y - HT / 2, f.x, f.y - f.ht / 2) < f.hw + HW + 26;
    const ahead = (d) => boxAt(f.x + d * (f.hw + 3), f.y + 2, 2, 2);          // ground before it
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) {
          f.dir = mx < f.x ? -1 : 1;
          if ((near || reach) && f.cd < 1 && !S.dying) { setSt(f, reach ? "snatch" : "creep"); break; }
          if (f.st === "walk") setSt(f, "idle");
          if (f.cd <= 0) setSt(f, "windup");
          break;
        }
        wander(f, dt, 24); break;
      case "creep": {
        // To him along its ground (waiting at its edge if it can go no further), and as he comes
        // within its reach (swinging by, it may be), it snatches.
        f.dir = sign(dx) || f.dir;
        if (reach) { setSt(f, "snatch"); break; }
        if (!near || f.t > 3) { setSt(f, "idle"); f.cd = 0.8; break; }
        if (ahead(f.dir)) moveBox(f, f.dir * 72 * dt, 0, f.hw, f.ht);
        break;
      }
      case "snatch":
        if (!f.thrown && f.t > 0.16) { f.thrown = true; snatchLight(f); }
        if (f.t > 0.4) { setSt(f, "flee"); f.dir = -(sign(dx) || f.dir); }
        break;
      case "flee": { const [hx] = moveBox(f, f.dir * 100 * dt, 0, f.hw, f.ht); if (hx || f.t > 1.5 || !ahead(f.dir)) { setSt(f, "idle"); f.cd = 1.4 + Math.random(); } break; }
      case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.5) setSt(f, "throw"); break;
      case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwCoins(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 2 + Math.random() * 1.3; } break;
      case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
      case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
    }
  }
  function snatchLight(f) {
    const [mx, my] = middle(); if (dist(mx, my, f.x, f.y - f.ht / 2) > f.hw + HW + 30 || S.dying || S.latched) return;
    if (S.ward) { spendWard(); ev("ward turned the thief"); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); setSt(f, "hurt"); return; }
    // A block on his rope: that, before his light. It cuts it from his belt and is off with it.
    if (S.tied) { const b = S.tied; S.tied = null; S.lost = b; S.dragging = false; carryOff(f, b); Sound.fx.steal(); Sound.fx.tetherBreak(); return; }
    const take = Math.max(0, Math.min(blowCost(0.09), S.fuel - 0.03));
    S.fuel -= take; f.loot = (f.loot || 0) + Math.max(take, 0.04); Sound.fx.steal(); S.shake = 0.12;
    for (let k = 0; k < 10; k++) S.parts.push({ kind: "spark", c: C.flameHot, x: S.torch[0], y: S.torch[1], vx: (f.x - S.torch[0]) * (2 + Math.random()) , vy: (f.y - f.ht * 0.6 - S.torch[1]) * (2 + Math.random()) - 40, life: 0.4, age: 0 });
  }
  // Lust: it waits on its bare ground. Far off, it throws thorns. Near, by turns, it throws a thorn,
  // or casts its ribbon at him: the ribbon draws him to it through the air (off his line, into the
  // briars, it may be), and if it brings him all the way, it strikes. A blow to it breaks the
  // ribbon; so does his ward, if he has signed himself (and the ward is spent).
  const PULL = 640, THORN_V = 215;
  function stepLust(f, dt, mx, my, sees) {
    const d = dist(mx, my, f.x, f.y - f.ht / 2);
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) {
          f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle");
          if (f.cd <= 0) {
            const close = d < 290;
            if (close && f.next === "ribbon" && !S.pulled) { f.next = "thorn"; setSt(f, "cast"); Sound.fx.ribbon(panX(f.x)); }
            else { f.next = close ? "ribbon" : f.next || "ribbon"; setSt(f, "windup"); }
          }
          break;
        }
        wander(f, dt, 34); break;
      case "cast": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.5) castRibbon(f); break;
      case "tether": holdRibbon(f, dt); break;
      case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.45) setSt(f, "throw"); break;
      case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwThorn(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 1.6 + Math.random() * 1.2; } break;
      case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
      case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
    }
  }
  const ribbonHand = (f) => demonJoint("lust", f.x, f.y, f.dir, f.p || demonPose(f), "hF");
  function castRibbon(f) {
    const [hx, hy] = ribbonHand(f), [mx, my] = middle();
    if (S.dying || S.pulled || dist(hx, hy, mx, my) > 330 || !los(hx, hy, mx, my)) { setSt(f, "idle"); f.cd = 1.2; return; }
    if (S.ward) {
      // His ward turns the ribbon back, and is spent.
      spendWard(); ev("ward turned the ribbon"); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry();
      setSt(f, "hurt"); f.cd = 2.5; return;
    }
    setSt(f, "tether"); S.pulled = { f, t: 0 }; S.pulls = (S.pulls || 0) + 1; Sound.fx.tether();
    if (S.ground) { S.ground = false; S.vy = -170; }
  }
  function holdRibbon(f, dt) {
    const P = S.pulled;
    if (!P || P.f !== f) { setSt(f, "idle"); f.cd = 2.5; return; }
    P.t += dt; f.dir = S.x < f.x ? -1 : 1;
    const [mx, my] = middle(), [cx, cy] = dMid(f);
    if (P.t > 2.6 || S.dying || S.act || !los(cx, cy - 10, mx, my)) { S.pulled = null; Sound.fx.tetherBreak(); setSt(f, "idle"); f.cd = 2.5; return; }
    // Drawn all the way in: it strikes.
    if (dist(mx, my, cx, cy) < f.hw + HW + 16) { S.pulled = null; hitMonk(S.x - f.x || f.dir, 0.06); setSt(f, "throw"); f.thrown = true; f.cd = 2.2; }
  }
  // The ribbon's pull on him (in his physics): toward its hand, through the air, or swinging him on
  // the rope toward it. It tears him from the rock after a moment.
  function pullOf(dt) {
    const P = S.pulled; if (!P || !alive(P.f)) { S.pulled = null; return; }
    const [hx, hy] = ribbonHand(P.f), [mx, my] = middle(), d = dist(hx, hy, mx, my) || 1;
    if (S.cling && P.t > 0.45) { S.cling = 0; S.ground = false; }
    if (S.cling || S.hang || S.act) return;
    if (S.ground) { S.ground = false; S.vy = Math.min(S.vy, -120); }
    S.vx += (hx - mx) / d * PULL * dt; S.vy += (hy - my) / d * PULL * dt;
  }
  function throwThorn(f) {
    const hx = f.x + f.dir * 8, hy = f.y - f.ht + 10, [tx, ty] = middle(), d = dist(hx, hy, tx, ty) || 1;
    S.things.push({ kind: "thorn", x: hx, y: hy, vx: (tx - hx) / d * THORN_V, vy: (ty - hy) / d * THORN_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 5, from: f });
    Sound.fx.thorn(panX(f.x));
    const ts = S.things.filter((o) => o.kind === "thorn"); if (ts.length > 10) ts[0].st = "gone";
  }
  // Briars: under his feet, over his head, at his side, under his hands as he hangs from a ledge or
  // holds to the rock. They tear him, and throw him off them (and off the ledge, or the rock).
  function briars() {
    if (S.invT > 0 || S.dying) return;
    const probes = [[S.x - 4, S.y + 3, 0, -1], [S.x + 4, S.y + 3, 0, -1], [S.x, S.y - HT - 3, 0, 1], [S.x - HW - 4, S.y - 10, 1, 0], [S.x + HW + 4, S.y - 10, -1, 0], [S.x - HW - 4, S.y - 34, 1, 0], [S.x + HW + 4, S.y - 34, -1, 0]];
    if (S.hang) { const L = S.hang.L; probes.push([L.edge + L.s * 4, L.top + 3, -L.s, -1], [L.edge + L.s * 3, L.top + 12, -L.s, 0]); }
    const hit = probes.find(([x, y]) => thornAt(x, y)); if (!hit) return;
    const [, , nx, ny] = hit; briarHit(hit[0], hit[1]);
    hitMonk(nx || sign(S.vx) || -S.dir, 0.05);
    if (ny < 0 && !nx) { S.vy = -330; S.ground = false; } else if (ny > 0) S.vy = 160; else { S.vx = nx * 230; if (ny < 0) S.vy = -200; }
  }
  // Briars torn: dark leaves and a few drops of red.
  function briarHit(x, y) {
    Sound.fx.briar(panX(x));
    for (let k = 0; k < 9; k++) S.parts.push({ kind: "spark", c: k % 3 ? "#3a0a2a" : SINS.lust.color, x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, life: 0.5, age: 0 });
  }
  // Where its mouth is: in its head, low and forward.
  function mouth(f) {
    const sc = 1 + 0.1 * (f.size || 0);
    if (f.p) { const q = demonJoint(f.sin, 0, 0, f.dir, f.p, "head"); return [f.x + (q[0] + f.dir * 5) * sc, f.y + (q[1] + 4) * sc]; }
    return [f.x + f.dir * 12 * sc, f.y - f.ht + 12];
  }
  function stepGluttony(f, dt, mx, my, sees) {
    const [ox, oy] = mouth(f), d = dist(mx, my, ox, oy);
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) {
          f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle");
          // Far off, it only heaves up fat and lobs it. Close, it does that and draws him in by turns.
          if (f.cd <= 0) {
            const close = d < 230 + 30 * f.size;
            if (close && f.next === "inhale") { f.next = "heave"; setSt(f, "inhale"); Sound.fx.inhale(panX(f.x)); }
            else { f.next = close ? "inhale" : f.next || "inhale"; setSt(f, "heave"); Sound.fx.gurgle(panX(f.x)); }
          }
          break;
        }
        wander(f, dt, 15); break;
      case "heave": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.75) setSt(f, "lob"); break;          // the fat coming up out of it
      case "lob": if (!f.thrown && f.t > 0.18) { f.thrown = true; lobFat(f); } if (f.t > 0.5) { setSt(f, "idle"); f.cd = 2.4 + Math.random() * 1.4; } break;
      case "inhale":
        // It draws in its breath, and everything near is drawn to its mouth.
        f.dir = mx < f.x ? -1 : 1;
        if (f.t > 0.35 && f.t < 2.4) inhale(f, ox, oy, dt);
        // (Drawn in to it on his feet, its mouth is up at his head: near enough, so long as it is at him.)
        if (f.t > 0.35 && (d < 30 || (Math.abs(ox - S.x) < HW + 12 && oy > S.y - HT - 16 && oy < S.y + 8))) { if (!swallowLegs(f)) setSt(f, "bite"); }
        else if (f.t > 2.5) { setSt(f, "idle"); f.cd = 2.2 + Math.random() * 1.5; }
        break;
      case "bite":
        // The jaws: the torch half eaten, and he is spat out, hard.
        if (!f.thrown && f.t > 0.12) { f.thrown = true; if (dist(mx, my, ox, oy) < 50 && S.invT <= 0) { hitMonk(f.dir, 0.1); S.vx = f.dir * 340; S.vy = -280; Sound.fx.spit(); } }
        if (f.t > 0.6) { setSt(f, "idle"); f.cd = 2.6; }
        break;
      case "swallow": if (f.t > 0.7) { setSt(f, "idle"); f.cd = Math.min(f.cd, 1.4); } break;
      case "hurt": if (f.t > 0.45) setSt(f, "idle"); break;
      case "down": if (f.t > 1.3) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.6) setSt(f, "idle"); break;
    }
  }
  // The breath drawn in: on the rope or in the air he is pulled off his way; on his feet he is
  // dragged (but holding the rock, or hanging from a ledge, he holds); and what he has thrown, if it
  // comes near its mouth now, it eats.
  function inhale(f, ox, oy, dt) {
    const [mx, my] = middle(), dx = ox - mx, dy = oy - my, d = Math.hypot(dx, dy) || 1, reach = 340 + 40 * f.size, k = 1 + 0.25 * f.size;
    if (d < reach && !S.cling && !S.hang && !S.act && !S.atk && !S.latched && los(ox, oy, mx, my)) {
      const a = (560 * clamp(1 - d / (reach + 40), 0, 1) + 80) * k;
      if (S.ground) moveX(sign(dx) * Math.min(Math.abs(dx), (30 + a * 0.08) * dt));
      else { S.vx += dx / d * a * dt; S.vy += dy / d * a * dt; }
    }
    for (const o of S.things) {
      if (o.st !== "fly" || o.by === "demon") continue;
      const ex = ox - o.x, ey = oy - o.y, e = Math.hypot(ex, ey) || 1;
      if (e < 30) { eat(f, o); continue; }
      if (e < 260) { o.vx += ex / e * 700 * dt; o.vy += ey / e * 700 * dt; }
    }
    for (let q = 0; q < 2; q++) { const a = Math.random() * TAU, r = 60 + Math.random() * 140; S.parts.push({ kind: "draft", x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r, vx: 0, vy: 0, tx: ox, ty: oy, life: 0.6, age: 0 }); }
  }
  // ---- Gluttony's swallow ------------------------------------------------------------------------------
  // Drawn in by its breath to its very mouth, he is not bitten but swallowed: his legs only, up to
  // the hips, and it hangs on him, a sack with eyes. His hands are his own: he may throw the hook,
  // and swing, and climb (the heavier for it); on his feet he can only hobble. While it has him his
  // light ebbs, slowly (far more slowly than in a great demon's mouth). A hard knock against the
  // rock (swung into a wall, or a heavy fall) smacks it off him; so do two kicks at it (a tap on
  // it), or the sign of the cross over himself; and in a while it spits him out of itself.
  function swallowLegs(f) {
    if (S.legsIn || S.latched || S.dying || S.act || S.invT > 0 || S.crawl || S.boonShow || S.dread) return false;
    if (S.ward || boonOn("vade")) {
      spendWard(); ev("the ward turned a swallow"); setSt(f, "hurt"); f.vx = -f.dir * 160;
      const [mx, my] = middle(); S.crosses.push({ kind: "turn", x: mx, y: my, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); return true;
    }
    S.legsIn = { f, t: 0, kicks: 0 }; setSt(f, "legs"); S.hang = null; S.cling = 0; S.atk = null; S.act = null;
    Sound.fx.swallow(); Sound.fx.chomp(panX(S.x)); S.shake = 0.18; ev("legs swallowed");
    if (!S.legsSeen) { S.legsSeen = true; S.say = { text: "IT HAS HIS LEGS", sub: "Swing him hard into the rock, or tap it and kick: knock it off.", t: 0 }; }
    return true;
  }
  function stepLegs(dt) {
    const L = S.legsIn, f = L.f;
    if (S.dying || S.latched || !f || f.st === "gone" || f.st === "dying") { S.legsIn = null; if (f && f.st === "legs") setSt(f, "idle"); return; }
    if (f.st !== "legs") { S.legsIn = null; offHim(f); return; }          // (struck off him by some blow)
    L.t += dt; f.x = S.x; f.y = S.y + 4; f.vx = 0; f.vy = 0; f.dir = S.dir;
    if (!boonOn("unconsumed")) { S.fuel -= dt * 0.012; if (S.fuel <= 0) lightOut(); }
    if (L.t > 9) freeLegs(false);
  }
  // Off him: set down beside him, out of the rock.
  function offHim(f) {
    const s = -S.dir || 1, sp = dFree(S.x + s * (f.hw + HW + 2), S.y, f.hw, f.ht);
    if (sp) { f.x = sp[0]; f.y = sp[1]; }
    S.invT = Math.max(S.invT, 1);
  }
  function freeLegs(smack) {
    const L = S.legsIn; S.legsIn = null; if (!L) return;
    const f = L.f; if (!f || f.st !== "legs") return;
    setSt(f, "idle"); f.cd = 2.6; offHim(f);
    if (smack) { ev("knocked it off"); hurtDemon(f, 2, (f.x < S.x ? -1 : 1) * 260, -220, "launch"); S.shake = Math.max(S.shake, 0.3); Sound.fx.thump(1, panX(f.x)); }
    else { ev("it let go"); Sound.fx.spit(); }
  }
  // A kick at it, down at his own legs: two, and it lets go.
  function kickLegs() {
    const L = S.legsIn; if (!L) return;
    L.kicks++; L.f.hurtT = 0.2; S.shake = Math.max(S.shake, 0.12); Sound.fx.thump(0.7, panX(S.x));
    if (L.kicks >= 2) freeLegs(true);
  }
  // It, drawn over him: a fat sack from his hips to below his feet, its jaws shut about his waist,
  // chewing; its eyes; its stubby arms waving.
  function drawLegsSac(mx, my, p, cam) {
    const L = S.legsIn, f = L.f, hip = monkJoint(mx, my, S.dir, p, "hip"), fa = monkJoint(mx, my, S.dir, p, "fF"), fb = monkJoint(mx, my, S.dir, p, "fB");
    const ft = [(fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2], ax = ft[0] - hip[0], ay = ft[1] - hip[1], al = Math.hypot(ax, ay) || 1, ang = Math.atan2(ay, ax);
    const chew = Math.sin(S.rt * 9) * 0.06, len = al + 20, wid = (16 + 2.5 * (f.size || 0)) * (1 + chew);
    const cx = hip[0] + ax / al * (len / 2 - 6) - cam.x, cy = hip[1] + ay / al * (len / 2 - 6) - cam.y;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    const c = SINS.gluttony, hurt = f.hurtT > 0;
    ctx.beginPath(); ctx.ellipse(0, 0, len / 2, wid, 0, 0, TAU);
    ctx.fillStyle = hurt ? "#5a2a14" : "#160a06"; ctx.fill(); ctx.strokeStyle = hexA(c.color, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    // the jaws shut about his waist: a row of teeth
    for (let i = -3; i <= 3; i++) { const v = i / 3.4 * wid; ctx.beginPath(); ctx.moveTo(-len / 2 + 1, v - 2.2); ctx.lineTo(-len / 2 + 5.5, v); ctx.lineTo(-len / 2 + 1, v + 2.2); ctx.fillStyle = "#f3e9d2"; ctx.fill(); }
    // its stubby arms, waving
    for (const sd of [-1, 1]) { const w = Math.sin(S.rt * 7 + sd) * 0.5; ctx.save(); ctx.translate(-2, sd * wid * 0.9); ctx.rotate(sd * (0.9 + w)); ctx.fillStyle = "#160a06"; ctx.fillRect(0, -1.6, 8, 3.2); ctx.restore(); }
    ctx.restore();
    // its eyes, on the side away from him
    for (const q of [0.28, 0.44]) { const ex = hip[0] + ax / al * len * q - cam.x - S.dir * wid * 0.55, ey = hip[1] + ay / al * len * q - cam.y; glow(ex, ey, 5, c.color, 0.6); circle(ex, ey, 1.1, "#fff2c8"); }
  }
  // What it swallows makes it bigger: harder to bring down, its breath stronger, its fat heavier.
  function eat(f, o) {
    o.st = "gone"; if (S.held === o) S.held = null; if (S.mark === o) S.mark = null;
    setSt(f, "swallow"); f.cd = 1.6; Sound.fx.swallow();
    if (f.size < 3) {
      f.size++; f.maxHp += 2; f.hp += 2; f.showHp = 2.5;
      f.hw = DEM.gluttony.hw + 3 * f.size; f.ht = DEM.gluttony.ht + 7 * f.size;
      const sp = dFree(f.x, f.y, f.hw, f.ht); if (sp) { f.x = sp[0]; f.y = sp[1]; }
    }
  }
  // A thing lobbed from (hx, hy) to fall on (tx, ty): the lower of the two arcs that reach it, or the longest throw.
  function lob(hx, hy, tx, ty, v, g, by, kind) {
    const X = tx - hx, Y = hy - ty, xa = Math.max(1, Math.abs(X));
    let disc = v ** 4 - g * (g * xa * xa + 2 * Y * v * v);
    if (disc < 0) { v = Math.sqrt(g * (Y + Math.hypot(Y, xa))) * 1.02; disc = Math.max(0, v ** 4 - g * (g * xa * xa + 2 * Y * v * v)); }
    const th = Math.atan2(v * v - Math.sqrt(disc), g * xa);
    const o = { kind: kind || "stone", x: hx, y: hy, vx: sign(X) * v * Math.cos(th), vy: -v * Math.sin(th), rot: 0, vr: 6 * sign(X), st: "fly", by, g, age: 0 };
    S.things.push(o);
    return o;
  }
  // Gluttony's fat: heaved up out of it and lobbed, slow, quivering as it flies.
  function lobFat(f) {
    const [ox, oy] = mouth(f), [tx, ty] = middle();
    const o = lob(ox, oy - 4, tx, ty, 240, 330, "demon", "fat");
    Object.assign(o, { r: 8 * (1 + 0.18 * f.size), w: 0, wv: 6, bounces: 0, from: f, life: 12 });
    Sound.fx.spit();
    const fats = S.things.filter((q) => q.kind === "fat"); if (fats.length > 8) fats[0].st = "gone";
  }
  // Wrath's fire: from over its head, straight at him, slow.
  function throwFire(f) {
    const hx = f.x + f.dir * 6, hy = f.y - f.ht - 8, [tx, ty] = middle(), d = dist(hx, hy, tx, ty) || 1;
    S.things.push({ kind: "fire", x: hx, y: hy, vx: (tx - hx) / d * FIRE_V, vy: (ty - hy) / d * FIRE_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 8, from: f });
    Sound.fx.fireball(panX(f.x));
    const fires = S.things.filter((o) => o.kind === "fire"); if (fires.length > 8) fires[0].st = "gone";
  }
  // A thorn into the rock: it stays there, quivering, a while, and is gone.
  function thornStuck(o) {
    if (S.mark === o) S.mark = null;
    o.st = "stuck"; o.age = 0; o.life = 2.5; o.x -= o.vx * 0.012; o.y -= o.vy * 0.012; o.rot = Math.atan2(o.vy, o.vx); o.vx = 0; o.vy = 0;
    Sound.fx.objHit("stone", panX(o.x));
  }
  // Send a thing flying at a point (a demon's middle, if given), as he throws or kicks it: fire
  // (or a thorn) straight and fast; anything else in a flat, hard arc.
  function sendAt(o, x, y, tx, ty, f) {
    if (f && alive(f)) { const [cx, cy] = dMid(f); tx = cx + f.vx * 0.1; ty = cy; }
    const d = Math.max(1, dist(x, y, tx, ty));
    o.st = "fly"; o.by = "monk"; o.x = x; o.y = y; o.age = 0; o.bounces = 1;
    if (o.kind === "fire" || o.kind === "thorn") { o.g = 0; o.life = 3; o.vx = (tx - x) / d * FIRE_FLING; o.vy = (ty - y) / d * FIRE_FLING; }
    else { const T = d / BOULDER_V; o.g = 300; o.vx = (tx - x) / T; o.vy = (ty - y) / T - 0.5 * o.g * T; o.vr = 8 * sign(o.vx); if (o.kind === "fat") { o.life = 4; o.wv += 8; } }
  }
  // Rock at the thing's edge, on the side it is moving toward?
  function rockAt(x, y, sx, sy, r) {
    r = r || BR;
    if (sx) return solidAt(x + sx * r, y) || solidAt(x + sx * r, y - r * 0.6) || solidAt(x + sx * r, y + r * 0.6);
    return solidAt(x, y + sy * r) || solidAt(x - r * 0.6, y + sy * r) || solidAt(x + r * 0.6, y + sy * r);
  }
  // A ball of fire against the rock: it bursts, and crumbling rock cracks at once.
  function burst(o, x, y) {
    o.st = "gone"; if (S.mark === o) S.mark = null; Sound.fx.fireBurst(panX(o.x)); strikeRock(x, y);
    for (let k = 0; k < 14; k++) { const a = Math.random() * TAU, v = 30 + Math.random() * 120; S.parts.push({ kind: "spark", c: k % 2 ? SINS.wrath.color : C.flameHot, x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.3, age: 0 }); }
  }
  // A blob of fat bursts: on a floor, it leaves the floor greased.
  function splat(o, x, y, floor) {
    o.st = "gone"; if (S.mark === o) S.mark = null; Sound.fx.splat(panX(x));
    for (let k = 0; k < 10; k++) { const a = -PI * Math.random(), v = 40 + Math.random() * 110; S.parts.push({ kind: "glob", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 2.5, life: 0.7 + Math.random() * 0.4, age: 0 }); }
    if (floor) grease(x, y);
  }
  // ---- Slime, grease, and rock that lies askew --------------------------------------------------------
  // Some platforms are slimy (in Gluttony's domain), and where Gluttony's fat bursts on a floor the
  // floor is greased for a while: underfoot he slides, and a slick slab that lies askew slides him
  // down it. The far cliff of each cavern is slimed: he cannot hold it. Some platforms lie a little
  // askew (drawn so; underfoot they are as level as any other, but he stands on the slope as drawn).
  function grease(x, y) {
    const i = Math.floor(x / CELL); let j = Math.floor((y + 2) / CELL);
    for (let q = 0; q < 3 && !solid(i, j); q++) j++;
    if (!solid(i, j) || solid(i, j - 1)) return;
    S.grease.push({ i0: i - 1, i1: i + 1, j, until: S.t + 20 });
    if (S.grease.length > 24) S.grease.shift();
  }
  // The platform whose top (a cell of it) is at (i, h), if any.
  function slabAt(i, h) {
    const sec = sectionAt(Math.max(1, h));
    if (sec.type === "shaft") { const isl = island(Math.floor(h / SLOT)); if (isl && isl.st !== "gone" && h === isl.h1 && i >= isl.x0 && i <= isl.x1) return isl; }
    else if (sec.type === "cave") { const r = h - sec.h0; for (const p of cave(sec).plats) if (r === p.r1 && i >= p.x0 && i <= p.x1) return p; }
    return null;
  }
  const GREASE_T = 8;                        // how long his feet stay greased once he has stepped in it
  function slickAt(x, y) {
    const i = Math.floor(x / CELL), j = Math.floor((y + 2) / CELL);
    for (const g of S.grease) if (g.j === j && i >= g.i0 && i <= g.i1 && g.until > S.t) return true;
    const p = slabAt(i, -j); return !!p && !!p.slick;
  }
  // How far the drawn top of a platform askew lies above or below its level top, at x.
  function tiltDy(x, y) {
    const i = Math.floor(x / CELL), p = slabAt(i, -Math.floor((y + 2) / CELL)); if (!p || !p.tilt) return 0;
    const x0 = p.x0 * CELL, x1 = (p.x1 + 1) * CELL;
    return clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1) * p.tilt;
  }
  function slickWall(s) {
    const i = Math.floor((S.x + s * (HW + 1.5)) / CELL), h = -Math.floor((S.y - 20) / CELL), sec = sectionAt(Math.max(1, h));
    return sec.type === "cave" && h - sec.h0 >= 0 && h - sec.h0 < LH && i === cave(sec).face;
  }
  // A thing he has pointed at: standing, his hands free, he takes it out of the air as it comes.
  function tryCatch(o) {
    if (S.mark !== o || S.held || S.atk || S.act || S.hang || S.cling || !S.ground || S.hurtT > 0 || S.dying) return false;
    const [cx, cy] = middle();
    if (dist(o.x, o.y, cx, cy - 4) > 42) return false;
    o.st = "held"; o.by = null; S.held = o; S.mark = null;
    S.atk = { kind: "catch", o, t: 0, dur: 0.24, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: true };
    S.dir = o.x < S.x ? -1 : 1; S.vx = 0; Sound.fx.catchIt(); gain(0.08);
    return true;
  }
  // Swinging hard on the rope into a thing thrown at him: he kicks it back at whoever threw it.
  function kickBack(o, r) {
    if (o.by !== "demon" || !S.rope || S.ground || S.cling || Math.hypot(S.vx, S.vy) < 100) return false;
    if (Math.abs(o.x - S.x) > HW + r + 12 || o.y < S.y - HT - r || o.y > S.y + r + 8) return false;
    const f = o.from && alive(o.from) ? o.from : null;
    sendAt(o, o.x, o.y, o.x - o.vx * 2, o.y - o.vy * 2, f);
    if (S.mark === o) S.mark = null;
    S.swingKickT = 0.35; S.kickCd = 0.3; Sound.fx.kick(1, panX(o.x)); S.shake = 0.12; gain(0.1); impactAt(o.x, o.y, sign(o.vx), sign(o.vy), 0.8);
    return true;
  }
  // Does a thing strike the monk? His ward turns it back where it came from, and then it is his.
  function strikeMonk(o, r) {
    if (o.by !== "demon" || S.invT > 0) return false;
    if (Math.abs(o.x - S.x) >= HW + r + (S.ward ? 10 : 0) || o.y <= S.y - HT - r || o.y >= S.y + r) return false;
    if (S.ward) {
      spendWard(); ev("ward turned a thrown " + o.kind);
      if (o.kind === "stone") { o.by = null; o.vx *= -0.6; o.vy = -200; }
      else { const f = o.from && alive(o.from) ? o.from : null; sendAt(o, o.x, o.y, o.x - o.vx * 2, o.y - o.vy * 2, f); }
      const [cx, cy] = middle(); S.crosses.push({ kind: "turn", x: cx, y: cy - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); S.shake = 0.15;
    } else if (o.kind === "fire") { hitMonk(o.vx); burst(o, o.x, o.y); }
    else if (o.kind === "thorn") { hitMonk(o.vx, 0.04); o.st = "gone"; briarHit(o.x, o.y); }
    else if (o.kind === "coin") coinSticks(o);
    else if (o.kind === "fat") { hitMonk(o.vx, 0.05); splat(o, o.x, o.y, false); S.greaseT = GREASE_T; }
    else { hitMonk(o.vx); o.by = null; o.vx *= -0.3; o.vy = -120; }
    return true;
  }
  // Does a thing he threw (or kicked back) strike a demon? Gluttony, while it draws its breath,
  // swallows whatever comes, and grows; at any other time it is struck like any other.
  function strikeDemon(o, r) {
    if (o.by !== "monk") return false;
    for (const f of S.demons) if (alive(f) && Math.abs(o.x - f.x) < f.hw + r && o.y > f.y - f.ht - r && o.y < f.y + r && (impactAt(o.x, o.y, sign(o.vx), sign(o.vy), 1.1, f), true)) {
      if (f.sin === "gluttony" && f.st === "inhale") { f.dir = o.x < f.x ? -1 : 1; eat(f, o); return true; }
      if (o.kind === "fire") { hurtDemon(f, 2, sign(o.vx) * 220, -260, "launch"); burst(o, o.x, o.y); }
      else if (o.kind === "thorn") { hurtDemon(f, 2, sign(o.vx) * 220, -240, "launch"); o.st = "gone"; briarHit(o.x, o.y); }
      else if (o.kind === "coin") { hurtDemon(f, f.sin === "avarice" ? 2 : 1, sign(o.vx) * 160, -180, "launch"); o.st = "gone"; Sound.fx.coin(panX(o.x), 1); }
      else if (o.kind === "fat") { hurtDemon(f, 2, sign(o.vx) * 200, -220, "launch"); splat(o, o.x, o.y, false); }
      else { hurtDemon(f, 2, sign(o.vx) * 260, -220, "launch"); Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vx *= -0.3; o.vy = -150; o.g = 560; }
      S.shake = 0.2; gain(0.12);
      return true;
    }
    return false;
  }
  function updThing(o, dt) {
    o.age += dt;
    if (o.st === "held" || o.st === "gone") return;
    if (o.st === "stuck") { if (o.age > o.life) o.st = "gone"; return; }
    if (o.kind === "coin") {
      if (o.age > o.life) { o.st = "gone"; if (S.mark === o) S.mark = null; return; }
      if (o.st === "rest") return;
      const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 3), 1, 12), h = dt / n;
      for (let k = 0; k < n; k++) {
        o.vy += o.g * h;
        if (solidAt(o.x + o.vx * h, o.y)) { o.vx *= -0.4; o.by = null; } else o.x += o.vx * h;
        if (solidAt(o.x, o.y + o.vy * h)) { if (o.vy > 0 && Math.abs(o.vy) < 90) { o.st = "rest"; o.vy = 0; o.vx = 0; o.age = Math.max(o.age, o.life - 1.5); if (S.mark === o) S.mark = null; return; } o.vy *= -0.45; o.vx *= 0.6; o.by = null; Sound.fx.coin(panX(o.x), 0.25); }
        else o.y += o.vy * h;
        if (tryCatch(o) || kickBack(o, 6) || strikeMonk(o, 6) || strikeDemon(o, 7)) return;
      }
      return;
    }
    if (o.kind === "fire" || o.kind === "thorn") {
      // Fire: straight on, slow, until it meets rock or him or a demon, or burns out. A thorn: the
      // same, but quicker, and it goes into the rock and stays.
      const thorn = o.kind === "thorn";
      if (o.age > (o.life || 8)) { o.st = "gone"; if (S.mark === o) S.mark = null; if (!thorn) for (let k = 0; k < 5; k++) S.parts.push({ kind: "smoke", x: o.x, y: o.y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, r: 3 + Math.random() * 3, life: 0.7, age: 0 }); return; }
      const n = clamp(Math.ceil(Math.hypot(o.vx, o.vy) * dt / 4), 1, 12), h = dt / n;
      for (let k = 0; k < n; k++) {
        o.vy += (o.g || 0) * h; o.x += o.vx * h; o.y += o.vy * h; o.rot += h * 6;
        if (solidAt(o.x, o.y)) { if (thorn) thornStuck(o); else burst(o, o.x, o.y); return; }
        if (tryCatch(o) || kickBack(o, 9) || strikeMonk(o, 9) || strikeDemon(o, 10)) return;
      }
      if (!thorn && Math.random() < 0.5) S.parts.push({ kind: "ember", x: o.x + (Math.random() - 0.5) * 8, y: o.y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 20 - o.vx * 0.1, vy: -20 - Math.random() * 30, life: 0.6, age: 0 });
      return;
    }
    if (o.kind === "fat") {
      // Fat: it stretches as it flies and quivers when it lands. It bounces once, heavily; then it
      // bursts (on a floor, greasing it). Into a wall, it sticks and slides down.
      o.wv += (-90 * o.w - 7 * o.wv) * dt; o.w += o.wv * dt;
      if (o.age > (o.life || 12)) { splat(o, o.x, o.y, false); return; }
      const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 4), 1, 12), h = dt / n;
      for (let k = 0; k < n; k++) {
        o.vy += o.g * h;
        // Into a wall it sticks, quivering, and slides slowly down it.
        if (o.vx && rockAt(o.x + o.vx * h, o.y, sign(o.vx), 0, o.r)) { o.vx = 0; o.vy = Math.min(o.vy, 25); o.g = 90; o.wv += 8; o.bounces = 1; if (!o.stuck) { o.stuck = true; Sound.fx.splat(panX(o.x), 0.5); } }
        o.x += o.vx * h;
        if (o.vy && rockAt(o.x, o.y + o.vy * h, 0, sign(o.vy), o.r)) {
          if (o.vy > 140 && o.bounces < 1) { o.bounces++; o.vy *= -0.34; o.vx *= 0.55; o.wv += 10; Sound.fx.splat(panX(o.x), 0.4); }
          else { splat(o, o.x, o.y + sign(o.vy) * o.r, o.vy > 0); return; }
        } else o.y += o.vy * h;
        if (tryCatch(o) || kickBack(o, o.r) || strikeMonk(o, o.r) || strikeDemon(o, o.r)) return;
      }
      return;
    }
    if (o.st === "rest") { if (!rockAt(o.x, o.y + 1, 0, 1)) { o.st = "fly"; o.by = null; o.vx = 0; o.vy = 0; } return; }
    const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 4), 1, 12), h = dt / n;
    for (let k = 0; k < n; k++) {
      o.vy += (o.g === undefined ? 560 : o.g) * h; o.rot += o.vr * h;
      let bounced = false;
      if (o.vx && rockAt(o.x + o.vx * h, o.y, sign(o.vx), 0)) { o.vx *= -0.3; bounced = true; } else o.x += o.vx * h;
      if (o.vy && rockAt(o.x, o.y + o.vy * h, 0, sign(o.vy))) {
        const down = o.vy > 0; o.vy *= down ? -0.25 : -0.4; bounced = true;
        if (down && Math.abs(o.vy) < 70) { o.vy = 0; o.vx *= 0.6; if (Math.abs(o.vx) < 40) { o.st = "rest"; o.vx = 0; o.y = Math.floor((o.y + BR + 2) / CELL) * CELL - BR - 0.01; if (S.mark === o) S.mark = null; return; } }
      } else o.y += o.vy * h;
      if (bounced) { if (o.by) Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vr *= 0.5; o.g = 560; }
      if (tryCatch(o) || kickBack(o, BR) || strikeMonk(o, BR)) return;
      if (strikeDemon(o, BR)) break;
    }
  }
  // ---- The rock that gives way (Wrath's) ----------------------------------------------------------------
  // With his weight on it (standing on it, or his hook in it) it cracks: once, twice, three times,
  // slowly; and then it falls to pieces. Take the weight off before then and the cracking stops where
  // it is. Fire striking it cracks it at once.
  const CRACK_T = 0.9;
  function crumblerAt(x, y) {
    const i = Math.floor(x / CELL), h = -Math.floor(y / CELL), sec = sectionAt(Math.max(1, h));
    if (sec.type === "shaft") { const isl = island(Math.floor(h / SLOT)); if (isl && isl.crumble && isl.st !== "gone" && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 - 1 && i <= isl.x1 + 1) return isl; }
    else if (sec.type === "trav") { const T = trav(sec), r = h - sec.h0; if (T.bridgeOf && r === 7 && T.bridgeOf[i]) { const B = T.bridges[T.bridgeOf[i] - 1]; if (B.st !== "gone") { B.h = h; return B; } } }
    return null;
  }
  // Its cells: [i0, i1, h0, h1].
  const cellsOf = (c) => (c.i0 !== undefined ? [c.i0, c.i1, c.h, c.h] : [c.x0, c.x1, c.h0, c.h1]);
  function weigh(c) { if (!c) return; c.loadT = S.rt; if (!c.st) { c.st = "crack"; c.stage = 0; c.t = 0; S.crumbling.push(c); } }
  function strikeRock(x, y) { const c = crumblerAt(x, y); if (c) { weigh(c); crack(c); } }
  function crack(c) {
    const [i0, i1, h0, h1] = cellsOf(c), x0 = i0 * CELL, x1 = (i1 + 1) * CELL, y0 = -h1 * CELL, y1 = (1 - h0) * CELL;
    c.stage++; c.t = 0;
    if (c.stage > 3) {
      // It goes. (If his hook was in it, the rope goes with it.)
      c.st = "gone";
      if (S.rope) { const hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy, hi = Math.floor(hx / CELL), hh = -Math.floor(hy / CELL); if (hi >= i0 - 1 && hi <= i1 + 1 && hh >= h0 - 1 && hh <= h1 + 1) { S.rope = null; S.climbing = false; Sound.fx.tetherBreak(); } }
      for (let k = 0; k < 18; k++) S.parts.push({ kind: "chip", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 1.2, age: 0, big: Math.random() < 0.4 });
      for (let k = 0; k < 6; k++) S.parts.push({ kind: "smoke", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 30, vy: 10 - Math.random() * 20, r: 5 + Math.random() * 6, life: 1, age: 0 });
      Sound.fx.crumble(panX((x0 + x1) / 2)); S.shake = Math.max(S.shake, 0.12);
      return;
    }
    Sound.fx.crack(panX((x0 + x1) / 2)); S.shake = Math.max(S.shake, 0.04 * c.stage);
    for (let k = 0; k < 3 + c.stage * 2; k++) S.parts.push({ kind: "chip", x: lerp(x0, x1, Math.random()), y: y1, vx: (Math.random() - 0.5) * 40, vy: Math.random() * 30, life: 0.8, age: 0 });
  }
  function stepCrumbling(dt) {
    for (const c of S.crumbling) {
      if (c.st !== "crack") continue;
      if (S.rt - c.loadT < 0.05) { c.t += dt; if (c.t >= (c.stage >= 3 ? CRACK_T * 0.7 : CRACK_T)) crack(c); }
      else c.t = 0;                              // the weight off: the cracking stops where it is
    }
    S.crumbling = S.crumbling.filter((c) => c.st === "crack");
  }
  function hitMonk(kx, cost) {
    if (S.dying || S.invT > 0 || S.latched) return;
    ev("he was hit", { cost: r2(cost || 0.06), wardLost: S.ward ? true : undefined, blockLoosed: S.tied && (cost === undefined || cost >= 0.06) ? true : undefined });
    S.freeze = Math.max(S.freeze || 0, 0.06);
    if (!boonOn("unconsumed")) S.fuel = Math.max(0, S.fuel - blowCost(cost || 0.06));
    S.hurtT = 0.5; S.invT = 0.9; S.flashT = 0.3; S.hoverT = 0; S.cling = 0; S.climbing = false; S.atk = null; S.act = null; S.hang = null; S.ward = null;
    S.vx = (sign(kx) || -S.dir) * 200; S.vy = -170; S.ground = false;
    if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.vx * 0.3; S.held.vy = -100; S.held = null; }
    if (S.tied && (cost === undefined || cost >= 0.06)) loosen(kx);        // (a hard blow knocks the block loose)
    Sound.fx.hurt(); S.shake = 0.25;
  }
  const demonAt = (x, y) => { let best = null, bd = 1e9; for (const f of S.demons) { if (!alive(f)) continue; const [cx, cy] = dMid(f), d = dist(x, y, cx, cy); if (Math.abs(x - f.x) < f.hw + 18 && y > f.y - f.ht - 18 && y < f.y + 14 && d < bd) { bd = d; best = f; } } return best; };
  const thingAt = (x, y) => { let best = null, bd = 34; for (const o of S.things) { if (o.st === "held" || o.st === "gone" || o.st === "stuck") continue; const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; };

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
    S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.hang = null;
    if (dash > 0.03) Sound.fx.whoosh(0.35);
  }
  // Where he comes to strike: beside it, on the near side. If it stands on ground (a ledge, it may
  // be), on that ground, so that when the blow is done he is not left in the air: the near side if
  // there is footing there, else the far, else against it, as close as there is footing.
  function strikeSpot(f) {
    const side = S.x < f.x ? -1 : 1, gap = f.hw + HW + 5;
    if (f.ground) {
      const footed = (x) => { const p = freeSpot(x, f.y - 0.01); return p && Math.abs(p[1] - f.y) < 8 && boxHit(p[0], p[1] + 3) ? p : null; };
      for (const x of [f.x + side * gap, f.x - side * gap, f.x + side * (HW + 6), f.x - side * (HW + 6), f.x + side * 2]) { const p = footed(x); if (p) return p; }
    }
    return freeSpot(f.x + side * gap, f.y) || freeSpot(f.x - side * gap, f.y) || [S.x, S.y];
  }
  function attack(kind, f, dir) {
    if (!alive(f)) return;
    const sp = strikeSpot(f);
    moveTo(kind, sp, { f, dir, dur: kind === "hurl" || kind === "slam" ? 0.4 : 0.34 });
    S.dir = f.x < sp[0] ? -1 : 1;
  }
  // A boulder lying near him on the same floor: he steps to it and heaves it up (it is heavy).
  function heave(o) {
    if (o.st !== "rest" || !S.ground || Math.abs(o.x - S.x) > 64 || Math.abs(o.y + BR - S.y) > 30) return false;
    const side = S.x < o.x ? -1 : 1, to = [o.x + side * 14, S.y], step = !boxHit(to[0], to[1]) && Math.abs(to[0] - S.x) > 4;
    S.atk = { kind: "heave", o, t: 0, dur: 0.6, from: [S.x, S.y], to: step ? to : [S.x, S.y], dash: step ? 0.16 : 0, arrived: !step, hit: false };
    S.dir = o.x < S.x ? -1 : 1; return true;
  }
  // In the flare: he goes to it, through the air or the rock, and catches it (or heaves it up).
  function catchThing(o) {
    if (S.held) return;
    if (heave(o)) return;
    const T = 0.12 * (S.flare.on ? FLARE_SLOW : 1), px = o.x + o.vx * T, py = o.y + o.vy * T;
    const side = S.x < px ? -1 : 1, sp = freeSpot(px + side * 8, py + 34) || freeSpot(px, py + 40);
    if (!sp) return;
    o.by = null;                     // in his reach it can no longer hurt him
    moveTo("catch", sp, { o, dur: 0.24 });
    S.dir = px < sp[0] ? -1 : 1;
  }
  function throwHeld(tx, ty, f) {
    if (!S.held || S.atk) return;
    // A boulder: the slow heave of a heavy thing. Fire, or fat: a quick fling.
    const quick = S.held.kind !== "stone";
    S.atk = { kind: quick ? "fling" : "toss", f, tx, ty, t: 0, dur: quick ? 0.36 : 0.6, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
    S.dir = (f ? f.x : tx) < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
  }
  // Holding something with a demon close by: he strikes it with what he holds (a boulder stays in
  // his hands; fire bursts on it; fat bursts over it).
  const besides = (f) => Math.abs(f.x - S.x) < f.hw + HW + 40 && Math.abs((f.y - f.ht / 2) - (S.y - HT / 2)) < 50;
  // Near enough to strike with what is in his hands (a great demon, by its middle).
  const closeBy = (g, m) => Math.abs(g.x - S.x) < g.hw + HW + 40 && Math.abs((g.y - g.ht / 2) - (S.y - HT / 2)) < g.ht / 2 + m;
  // The block in his hands swung into a demon close by: a heavy blow, and he keeps hold of it.
  function swingBlock(f, g) {
    const b = S.tied; if (!b || b.st !== "hand" || S.atk) return;
    const t = g || f;
    S.atk = { kind: "brick", f, g, o: b, t: 0, dur: 0.42, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
    S.dir = t.x < S.x ? -1 : 1; S.vx = 0; ev("block swung", { at: g ? "great" : "demon" });
  }
  function bash(f) {
    if (!S.held || S.atk) return;
    S.atk = { kind: S.held.kind === "fire" || S.held.kind === "thorn" ? "sear" : "bash", f, o: S.held, t: 0, dur: 0.42, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
    S.dir = f.x < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
  }
  // Fling what he holds, at a point or a demon, as hard as it came.
  function release(tx, ty, f) {
    const o = S.held; if (!o) return null;
    const [hx, hy] = S.handW || grip();
    sendAt(o, hx, hy, tx, ty, f);
    if (o.kind === "fire") Sound.fx.fireball(0); else if (o.kind === "thorn") Sound.fx.thorn(0);
    S.held = null; Sound.fx.throw(0.9);
    return o;
  }
  // Each move: its pose, and the moment it lands. The toss is slow: the wind-up of a heavy thing.
  const ATK_ANIM = { punch: ["palm", MONK_HIT.palm], kick: ["launch", MONK_HIT.launch], slam: ["slam", MONK_HIT.slam], hurl: ["throw", MONK_HIT.throw], toss: ["throw", 0.62], fling: ["throw", 0.45], bash: ["slam", MONK_HIT.slam], brick: ["slam", MONK_HIT.slam], sear: ["palm", MONK_HIT.palm], heave: ["pickup", MONK_HIT.pickup], catch: ["catch", MONK_HIT.catch] };
  function stepAtk(dt) {
    const a = S.atk; a.t += dt;
    if (a.t < a.dash) {
      // A dash: toward a moving boulder, he follows it.
      if (a.kind === "catch" && a.o.st === "fly") { const side = S.x < a.o.x ? -1 : 1; a.to = [a.o.x + side * 8, a.o.y + 34]; }
      const k = ease(a.t / a.dash); S.x = lerp(a.from[0], a.to[0], k); S.y = lerp(a.from[1], a.to[1], k); return;
    }
    if (!a.arrived) { a.arrived = true; S.x = a.to[0]; S.y = a.to[1]; if (boxHit(S.x, S.y)) { const fs = freeSpot(S.x, S.y); if (fs) { S.x = fs[0]; S.y = fs[1]; } } }
    const u = (a.t - a.dash) / a.dur, f = a.f;
    if (f && alive(f) && a.kind !== "toss" && a.kind !== "fling") S.dir = f.x < S.x ? -1 : 1;
    if (!a.hit && u >= ATK_ANIM[a.kind][1]) {
      a.hit = true;
      if (a.kind === "toss" || a.kind === "fling") release(a.tx, a.ty, f);
      else if (a.kind === "brick") {
        const b = a.o, g = a.g;
        if (S.tied === b && b.st === "hand") {
          if (g) { if (g.st !== "dying" && g.st !== "latch" && closeBy(g, 50)) strikeGreat(g, { vx: S.dir * 420, vy: -40, x: b.x, y: b.y, ht: b.ht, flung: false }); }
          else if (f && alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
            blowTo(f, 4, S.dir * 320, -260, "launch", "brick"); Sound.fx.brickHit(1, panX(f.x)); S.shake = 0.25; gain(0.16); impact(f, S.dir, -0.3, 2.4);
          }
        }
      }
      else if (a.kind === "bash" || a.kind === "sear") {
        const o = a.o;
        if (S.held === o && alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
          const [cx, cy] = dMid(f);
          if (o.kind === "fire") { blowTo(f, 3, S.dir * 220, -260, "launch", "bash"); S.held = null; o.x = cx; o.y = cy; burst(o, cx, cy); }
          else if (o.kind === "thorn") { blowTo(f, 3, S.dir * 220, -240, "launch", "bash"); S.held = null; o.st = "gone"; briarHit(cx, cy); }
          else if (o.kind === "coin") { blowTo(f, 2, S.dir * 180, -200, "launch", "bash"); S.held = null; o.st = "gone"; Sound.fx.coin(panX(f.x), 1); }
          else if (o.kind === "fat") { blowTo(f, 2, S.dir * 200, -200, "launch", "bash"); S.held = null; splat(o, cx, cy, false); }
          else { blowTo(f, 3, S.dir * 280, -240, "launch", "bash"); Sound.fx.objHit("stone", panX(f.x)); Sound.fx.punch(1, panX(f.x)); }
          S.shake = 0.22; gain(0.14); impact(f, S.dir, -0.3, 2);
        }
      }
      else if (a.kind === "heave" || a.kind === "catch") {
        if (a.o.st === "rest" || a.o.st === "fly") { a.o.st = "held"; a.o.by = null; S.held = a.o; if (a.kind === "catch") { Sound.fx.catchIt(); gain(0.08); } else Sound.fx.pickup(); }
      } else if (alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
        if (a.kind === "punch") { impact(f, S.dir, -0.2, 1); blowTo(f, 1, S.dir * 150, -60, undefined, "strike"); Sound.fx.punch(0.8, panX(f.x)); gain(0.06); }
        else if (a.kind === "kick") { impact(f, S.dir * 0.2, -1, 1.4); blowTo(f, 1, S.dir * 30, -430, "launch", "uppercut"); Sound.fx.kick(0.9, panX(f.x)); gain(0.06); }
        else if (a.kind === "slam") { impact(f, a.dir[0] * 0.3, 1, 1.6); blowTo(f, 1, a.dir[0] * 140, 680, "hurl", "slam"); Sound.fx.punch(1, panX(f.x)); gain(0.06); }
        else { impact(f, a.dir[0], a.dir[1], 1.8); blowTo(f, 1, a.dir[0] * 580, a.dir[1] * 580 - 90, "hurl", "hurl"); Sound.fx.kick(1, panX(f.x)); gain(0.08); }
      }
    }
    if (u >= 1) { S.atk = null; S.ground = boxHit(S.x, S.y + 1); if (!S.ground) { S.vy = 0; S.floatT = 0.3; } }
  }
  // What a tap or a swipe on a demon or a boulder does.
  function gesture(kind, f, o, dir) {
    if (S.act || (S.atk && !S.atk.hit) || !upFromCrawl()) return;
    if (S.atk) S.atk = null;          // a blow already landed: straight into the next
    // A demon in the air with a block (or going for one): the hook, and it is pulled down.
    if (f && kind === "tap" && (f.block || f.st === "seize")) { yank(f); return; }
    if (f) {
      if (S.held) { if (besides(f)) bash(f); else throwHeld(0, 0, f); return; }
      const [cx, cy] = dMid(f);
      if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return; }
      attack(kind === "tap" ? "punch" : kind, f, dir);
    } else if (o && !S.held) {
      // In the flare: he goes to it and catches it. Out of it: a boulder lying near, he heaves up; a
      // thing in the air, he marks, and if he is standing when it comes he takes it out of the air.
      if (S.flare.on) { catchThing(o); return; }
      if (o.st === "rest") { if (!heave(o)) Sound.fx.tick(420, 0.3); return; }
      S.mark = o; Sound.fx.tick(1200, 0.35);
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
    S.meter -= CROSS_COST;
    S.crosses.push({ kind: "smite", x: cx, y: cy, t: 0, size: 24 });
    f.brokenT = 1.6; S.freeze = 0.12; S.whiteT = 0.22;
    blowTo(f, 3, sign(f.x - S.x) * 300, -220, "hurl", "cross");
    for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, v = 60 + Math.random() * 220; S.parts.push({ kind: "spark", c: k % 2 ? C.flameHot : SINS[f.sin].color, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, age: 0, real: true }); }
    Sound.fx.unlock(); Sound.fx.demonBroken(f.sin); Sound.fx.castOut(f.sin); S.shake = 0.3;
  }
  // The sign of the cross over himself: a ward, free, that stays on him while he climbs and swings,
  // and fights, for WARD_T. It turns away the first blow that reaches him (a thing thrown, a snatch,
  // a ribbon cast), and is spent; then he must sign himself again. His own blows do not spend it.
  const WARD_T = 45;
  function ward() {
    if (S.legsIn) freeLegs(true);
    if (S.act || S.atk || S.rt - (S.blessT === undefined ? -9 : S.blessT) < 0.5) return;
    S.blessT = S.rt;
    ev("ward on");
    S.ward = { t: 0, n: boonOn("double") ? 2 : 1 }; const [cx, cy] = middle();
    S.crosses.push({ kind: "ward", x: cx + S.dir * 18, y: cy - 10, t: 0, size: 20 }); Sound.fx.unlock();
    // And with each blessing, one coin of the gold clinging to him shaken off (one only), to fall away.
    if (S.coins > 0) {
      S.coins--; ev("a coin shaken off", { left: S.coins });
      S.things.push({ kind: "coin", x: cx - S.dir * 5, y: cy + 4, vx: -S.dir * (50 + Math.random() * 40), vy: -150, rot: 0, vr: 0, st: "fly", by: null, g: 330, age: 0, life: 4, r: 4 });
      for (let k = 0; k < 6; k++) S.parts.push({ kind: "spark", c: SINS.avarice.color, x: cx - S.dir * 5, y: cy + 4, vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 70, life: 0.45, age: 0, real: true });
      Sound.fx.coin(panX(cx), 0.8);
      if (!S.shedSeen) { S.shedSeen = true; S.say = { text: "A COIN SHAKEN OFF", sub: "With each blessing, one of the coins on him falls away.", t: 0 }; }
    }
  }
  // A blow turned: the ward spent (doubled, one of the two; under St Benedict's medal, not at all).
  function spendWard() {
    if (!S.ward || boonOn("vade")) return;
    if ((S.ward.n || 1) > 1) S.ward.n--; else S.ward = null;
  }
  const wardFade = () => (S.ward ? clamp((WARD_T - S.ward.t) / 5, 0.25, 1) * (S.ward.t > WARD_T - 3 && Math.floor(S.rt * 9) % 2 ? 0.45 : 1) : 0);
  // Swinging on the rope, fast, into a demon: a kick, as hard as the swing.
  // Coming down on a demon from above, from any height (a fall, a let-go, a flash above it): he
  // lands on it with both feet, and springs off. The harder the fall, the harder the blow.
  function stomp(vyIn, yIn) {
    if (vyIn < 120 || S.ground) return false;
    for (const f of S.demons) {
      if (!alive(f) || f.st === "legs" || (f.stompCd || 0) > S.rt || Math.abs(S.x - f.x) > f.hw + HW - 2) continue;
      const top = f.y - f.ht;
      if (yIn <= top + 6 && S.y >= top - 2) {
        f.stompCd = S.rt + 0.35;
        impact(f, 0, 1, vyIn > 430 ? 1.8 : 1.2, f.x, f.y - f.ht);
        blowTo(f, vyIn > 430 ? 2 : 1, sign(f.x - S.x) * 40 || 40, 0, undefined, "stomp");
        if (alive(f) && !f.idol) setSt(f, "down");
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
    for (const f of S.demons) if (alive(f) && f.st !== "legs" && Math.abs(f.x - fx) < f.hw + 16 && f.y - f.ht < S.y + 4 && f.y > S.y - HT - 6) {
      impact(f, sign(S.vx), -0.2, sp > 380 ? 2 : 1.3);
      blowTo(f, sp > 380 ? 2 : 1, S.vx * 0.9, -160 - sp * 0.2, "hurl", "swing");
      Sound.fx.kick(1, panX(f.x)); S.swingKickT = 0.35; S.kickCd = 0.45; S.shake = 0.15; gain(0.1);
      S.vx *= 0.6; S.vy *= 0.6; S.dir = sign(S.vx) || S.dir;
      break;
    }
  }

  // ---- Each frame --------------------------------------------------------------------------------------
  // Which ways are held: the arrows (or WASD; both arrows together is up), or the thumb on its cross.
  function pads() {
    let l = false, r = false, u = false, dn = false;
    for (const t of S.touches.values()) if (t.dpad) { const [hx, vy] = dpadDir(t); if (hx < 0) l = true; if (hx > 0) r = true; if (vy < 0) u = true; if (vy > 0) dn = true; }
    if (S.keys.ArrowLeft || S.keys.KeyA) l = true;
    if (S.keys.ArrowRight || S.keys.KeyD) r = true;
    if (S.keys.ArrowUp || S.keys.KeyW) u = true;
    if (S.keys.ArrowDown || S.keys.KeyS) dn = true;
    return { l, r, d: (r ? 1 : 0) - (l ? 1 : 0), both: l && r, u: u || (l && r), dn };
  }
  // Reaching a ledge, he hangs from it by his hand, just below the edge (out of sight of what is
  // above). A fresh push toward it (let go of the pad and press again) and he pulls himself up;
  // away from it, or down, and he drops.
  // Is the way just before him (side d) too low to stand in, but not to crawl?
  function lowWay(d) { const x = S.x + d * (HW + 6); return !boxAt(x, S.y - 0.5, HW, CRAWL_H) && boxAt(x, S.y - 0.5, HW, HT) && solidAt(x, S.y + 4); }   // (with a floor to crawl on)
  function startCrawl() {
    if (S.rope) letGo(true);
    S.crawl = true; S.climbing = false; Sound.fx.grab(); ev("crawling");
    if (!S.crawlSeen) { S.crawlSeen = true; S.say = { text: "A LOW WAY", sub: usingKeys() ? "He goes on his hands and knees (or hold \u2193 to crawl)." : "He goes on his hands and knees (or hold \u25bc to crawl).", t: 0 }; }
  }
  // Getting up from his knees to do something: only where there is room to stand.
  function upFromCrawl() { if (!S.crawl) return true; if (boxAt(S.x, S.y - 0.5, HW, HT)) return false; S.crawl = false; return true; }
  function hangAt(L) {
    const hx = L.edge - L.s * 7, hy = L.top - 0.01 + Arena.reach(), ok = !boxHit(hx, hy);
    S.hang = { L, need: true, k: 0, fx: S.x, fy: S.y, x: ok ? hx : S.x, y: ok ? hy : S.y };
    S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.dir = L.s;
    S.hangs = (S.hangs || 0) + 1; Sound.fx.grab();
  }
  function physics(dt) {
    if (S.clingWas && !S.cling) unclip(S.clingWas);
    S.clingWas = S.cling;
    briars();
    const I = S.hurtT > 0 ? { l: false, r: false, d: 0, both: false, u: false, dn: false } : pads(), d = I.d, wasGround = S.ground, vyIn = S.vy, vxIn = S.vx;
    if (S.hang) {
      const H0 = S.hang, s = H0.L.s, up = d === s || I.u;
      H0.k = Math.min(1, H0.k + dt / 0.12);
      S.x = lerp(H0.fx, H0.x, ease(H0.k)); S.y = lerp(H0.fy, H0.y, ease(H0.k)); S.vx = 0; S.vy = 0; S.dir = s;
      if (!up) H0.need = false;
      if (d === -s || I.dn) { S.hang = null; S.ground = false; return; }
      if (up && !H0.need && H0.k >= 1) { S.hang = null; startAct("ledge", H0.L); }
      return;
    }
    if (S.crawl && !S.ground && !boxAt(S.x, S.y, HW, HT)) S.crawl = false;
    S.groundT = S.ground ? (S.groundT || 0) + dt : 0;
    if (S.shot) flyShot(dt);
    const R = S.rope;
    // Up: climb the rope, hand over hand. Down: let it out.
    S.climbing = !!R && I.u;
    // (Not while rock is over his head: then he leans out round it first, and the rope waits.)
    if (R && S.climbing && !(!S.ground && boxHit(S.x, S.y - 4)) && freeOf(R) > ROPE_MIN) { R.len = Math.max((R.fixed || 0) + ROPE_MIN, R.len - CLIMB_V * (1 - 0.8 * heavy()) * dt); S.climbPh += dt * 9; }
    if (R && S.leapT > 0) R.len = Math.max((R.fixed || 0) + ROPE_MIN, R.len - 380 * dt);
    if (R && I.dn && R.len < ROPE_MAX) R.len = Math.min(ROPE_MAX, R.len + PAYOUT * dt);
    // A long throw: he reels the rope in fast, and it draws him toward the hook, till it is a length he can swing on.
    if (R && R.len > ROPE_MAX) { R.len = Math.max(ROPE_MAX, (R.fixed || 0) + ROPE_MIN, R.len - REEL_V * dt); }
    const PV = R ? pivotOf(R) : null, [gx, gy] = grip(), rd = R ? dist(gx, gy, PV.x, PV.y) : 0, taut = R && rd >= freeOf(R) - 1;
    // A ledge near his hands. Climbing the rock with bare hands, he takes hold of it. On the rope:
    // not while he is going up it (he goes on up, past it), only at its top, where he can go no
    // higher; or hanging still on it, not climbing and not swinging. Swinging, never by himself.
    if (!S.ground && !S.held) {
      let L = null;
      const top = R && S.climbing && freeOf(R) <= ROPE_MIN + 8, still = R && !S.climbing && (S.swingSp || 0) < 60 && Math.hypot(S.vx, S.vy) < 60;
      if (S.cling) L = ledge(S.cling, 18, 96, true);
      else if (top || still) L = ledge(S.dir, 18, top ? 140 : 90, true) || ledge(-S.dir, 18, top ? 140 : 90, true);
      if (L) { hangAt(L); return; }
    }
    // On the rock with bare hands. Holding toward the wall (or up): he climbs. Nothing held: he
    // stays. Away from it: he lets go. Down: he climbs down.
    if (S.cling) {
      if (R) { const [cgx, cgy] = grip(); wrapRope(R, S.prevGx === undefined ? cgx : S.prevGx, S.prevGy === undefined ? cgy : S.prevGy); R.len = Math.max(R.len, (R.fixed || 0) + dist(cgx, cgy, pivotOf(R).x, pivotOf(R).y)); }
      // (Down wins over toward the rock: a thumb pressing down and a little toward the wall means down.)
      const s = S.cling, down = I.dn, up = (d === s && !down) || I.u;
      if (slickWall(s)) {
        // Slimed rock: his hands find no hold, and he slides down it.
        S.vx = 0; S.vy = 0; S.climbPh -= dt * 4;
        if (d === -s) { S.cling = 0; S.vx = -s * 40; }
        else if (moveY(130 * dt) > 0) { S.cling = 0; S.ground = true; }
        if (S.cling) return;
      } else if (d === -s) { S.cling = 0; S.vx = -s * 40; }
      else {
        S.vx = 0; S.vy = 0; S.dir = s;
        // He keeps to an even line up the rock: its face smoothed over his height and a little
        // above him, so that the crags standing out of it pass in front of him (the rock is drawn
        // over him) instead of each one carrying him out round it. Only rock standing out past the
        // whole of him stops him; then he looks for a way round onto a ledge.
        const fx = faceLine(s);
        if (fx === null) S.cling = 0;
        else {
          // (Under rock leaning out over him, he leans out from his line as far as he must to get
          // past it, a little at a time; too far, and he stops.)
          const tx = fx - s * (HW + 4);
          let lean = 0; while (lean <= 28 && solidAt(tx - s * (HW - 2 + lean), S.y - HT - 3)) lean += 2;
          S.x += clamp((up && lean <= 28 ? tx - s * lean : tx) - S.x, -110 * dt, 110 * dt);
          const ox = S.x - s * (HW - 2);                 // his side away from the rock
          if (up) {
            if (lean <= 28 && !solidAt(ox, S.y - HT - 3)) {
              S.y -= WALL_V * (1 - 0.7 * heavy()) * dt; S.climbPh += dt * 7; S.wallStall = 0;
              const b = -Math.sin(S.climbPh);
              if (b > 0.97 && !S.planted) { S.planted = true; plant(s); } else if (b < 0.5) S.planted = false;
            }
            else if (lean > 28) { S.wallStall = (S.wallStall || 0) + dt; if (S.wallStall > 0.3) { S.wallStall = 0; const L = ledgeAround(); if (L) { startAct("ledge", L); return; } } }
          } else if (down) {
            if (!solidAt(ox, S.y + 3) && !solidAt(S.x, S.y + 3)) { S.y += WALL_DOWN * dt; S.climbPh -= dt * 7; }
            else { S.cling = 0; S.ground = true; }
          }
        }
        if (S.cling) return;
      }
      unclip(s);
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
    // On the ground with the rope above him, up or a push and he leaps: straight up the rope (up),
    // or off to that side to start a swing (left or right; with up as well, higher). The rope is
    // taken up behind him as he goes, so he hangs clear of the ground and swinging at once.
    if (S.ground && R && (d || I.u) && !S.held && !(S.leapCd > 0) && PV.y < gy - 24) {
      R.len = Math.min(R.len, (R.fixed || 0) + Math.max(ROPE_MIN, rd));
      // (And short enough that at the bottom of the swing, under the hook, his feet clear the ground.)
      const deep = rayRock(PV.x, PV.y, PI / 2, 1400);
      if (deep > 0) R.len = Math.min(R.len, (R.fixed || 0) + Math.max(ROPE_MIN, deep - GRIP - 24));
      const w = 1 - 0.4 * heavy();
      S.ground = false; S.vy = -(d && !I.u ? 290 : 340) * w; S.vx = d * 190 * w; if (d) S.dir = d;
      S.leapT = d && !I.u ? 0.12 : 0.2; S.liftT = 0.5; S.leapCd = 0.45; Sound.fx.whoosh(0.5);
    }
    if (S.ground && !(taut && S.climbing)) {
      // Down (off the rope), or a way before him too low to stand in: he gets down on his hands and
      // knees, and crawls. He gets up again where there is room, unless down is still held.
      // (On the rope, not at a touch of the ground in a swing: only once he is standing.)
      if (!S.crawl && !S.held && !S.legsIn && ((I.dn && !R) || (d && lowWay(d) && (!R || S.groundT > 0.35)))) startCrawl();
      else if (S.crawl && !I.dn && !(d && lowWay(d)) && !boxAt(S.x, S.y - 0.5, HW, HT)) S.crawl = false;
      // Walking: careful and heavy. Into a step, he steps up; into a ledge he can reach, he climbs.
      const want = S.landT > 0 ? 0 : d * (S.crawl ? CRAWL_V : WALK) * (S.legsIn ? 0.35 : 1) * (S.held ? 0.55 : 1) * (1 - 0.35 * heavy()) * (S.dragging && S.tied && sign(S.tied.x - S.x) !== d ? 0.55 : 1);       // slower with a boulder in his arms, or gold on him; slower still dragging a block
      // On slime or grease his feet hardly hold: he slides, and down a slab that lies askew. And
      // once he has stepped in it, his feet are greased for a while, and he slides everywhere.
      const onSlick = slickAt(S.x, S.y);
      if (onSlick) S.greaseT = GREASE_T;
      // (Greased, his feet still get him going, scrabbling; but stopping or turning, they skate.)
      const slick = onSlick || S.greaseT > 0, going = want !== 0 && (sign(want) === sign(S.vx) || Math.abs(S.vx) < 15) && Math.abs(want) > Math.abs(S.vx);
      const acc = !slick ? 500 : going ? 170 : 26;
      S.vx += clamp(want * (slick ? 1.25 : 1) - S.vx, -acc * dt, acc * dt);
      if (slick) { const tl = tiltDy(S.x + 4, S.y) - tiltDy(S.x - 4, S.y); if (tl) S.vx += sign(tl) * 150 * dt; }
      if (S.greaseT > 0 && Math.abs(S.vx) > 20 && Math.random() < 0.25) S.parts.push({ kind: "glob", x: S.x + (Math.random() - 0.5) * 10, y: S.y - 1, vx: -S.vx * 0.2 + (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, r: 1 + Math.random() * 1.2, life: 0.5, age: 0 });
      if (d) S.dir = d;
      if (d && S.landT <= 0 && !S.held && !S.crawl && near(d, 2)) {
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
        const vt = S.vx * tx + S.vy * ty, a = (Math.abs(vt) < 30 ? PUMP_START : sign(vt) === d ? PUMP_WITH : PUMP_AGAINST) * (1 - 0.5 * heavy());
        S.vx += tx * d * a * dt; S.vy += ty * d * a * dt;
      } else if (d && S.vx * d < 160) S.vx += d * AIR * dt;
      const drag = 1 - (S.dragging ? 0.6 : 0.1) * dt; S.vx *= drag; S.vy *= drag;      // (a block dragging on the ground under him slows the swing)
    }
    if (S.pulled) pullOf(dt);
    // (Light in a flip from the rope; all but weightless in the hover after it.)
    if (S.hoverT > 0 && !S.rope) { S.vy *= Math.max(0, 1 - 12 * dt); S.vx *= Math.max(0, 1 - 2.5 * dt); }
    S.vy += GRAV * dt * (S.hoverT > 0 && !S.rope ? 0.05 : S.flip && S.flip.swap ? 0.35 : S.floatT > 0 ? 0.2 : 1) * (1 + 0.45 * heavy()) * (boonOn("friar") ? 0.45 : 1);
    if (boonOn("friar") && !S.rope && S.vy > FRIAR_FALL) S.vy = FRIAR_FALL;
    const sp = Math.hypot(S.vx, S.vy); if (sp > VMAX) { S.vx *= VMAX / sp; S.vy *= VMAX / sp; }
    // On the ground the rope pays out as he walks, unless he is climbing it.
    if (R && S.ground && !S.climbing) R.len = clamp((R.fixed || 0) + rd, ROPE_MIN, Math.max(ROPE_MAX, R.len));
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
    // Swinging, his feet touch the ground: he lets go of the rope (and the hook comes back), and
    // stands. No dragging and bouncing along the ground at the rope's end.
    if (S.rope && S.ground && !wasGround && !S.climbing && !(S.liftT > 0)) letGo();
    // Into a wall in the air, holding toward it, on the rope or falling: he takes hold of it (and
    // the hook comes back to his hand). Not in the middle of a flip: then he turns over past the
    // rock and on. (Only a true wall, not the side of a platform or a lump hanging from a roof.)
    if (S.legsIn && ((side && Math.abs(vxIn) > 200) || (S.ground && !wasGround && vyIn > 420) || (!S.ground && d && near(d) && Math.abs(vxIn) > 200))) { freeLegs(true); Sound.fx.wallSlam(0); }
    if (!S.ground && d && near(d) && !S.climbing && !S.cling && !S.held && !(S.flip && !S.flip.half) && wallBeside(d)) {
      if (S.rope) { const P = pivotOf(S.rope); S.shot = { ph: "back", t: 0, T: 0.2, bx: P.x, by: P.y, x: P.x, y: P.y }; S.shotVis = S.ropeVis; S.ropeVis = []; }
      S.cling = d; S.dir = d; S.vx = 0; S.vy = 0; S.rope = null; S.next = null; Sound.fx.grab();
    }
    if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);

    if (S.rope && !S.ground) swingKick();
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }

  // Lost out of the world (some fault gave him no place, or an endless speed): back where he last
  // stood firm, everything he was doing let go, and the fault kept for a note.
  function unlose() {
    fault(new Error("lost out of the world: " + JSON.stringify([S.x, S.y, S.vx, S.vy, S.rope && [S.rope.x, S.rope.y, S.rope.len], S.act && S.act.kind])));
    const p = (S.foot && Number.isFinite(S.foot[0] + S.foot[1]) && S.foot) || (S.keptAt && Number.isFinite(S.keptAt[0] + S.keptAt[1]) && S.keptAt) || [(edges(-2).L + edges(-2).R + 1) / 2 * CELL, -0.01];
    S.x = p[0]; S.y = p[1]; S.vx = 0; S.vy = 0; S.rope = null; S.shot = null; S.act = null; S.cling = 0; S.hang = null; S.flip = null; S.next = null; S.climbing = false;
    if (!Number.isFinite(S.torch[0] + S.torch[1])) S.torch = [S.x, S.y - 40];
    if (!Number.isFinite(S.cam.x + S.cam.y)) { S.cam.x = clamp(S.x - W / 2, 0, COLS * CELL - W); S.cam.y = S.y - H * 0.62; }
    ev("lost out of the world, set back");
  }
  function step(dt) {
    // Stopped at a verse, to read it: nothing moves till he goes on.
    if (S.verseHold) { if (S.verse) S.verse.t = Math.min(S.verse.t + dt, 0.6); return; }
    // A great demon showing itself, or a relic held up: the world stopped, all but that.
    if (S.dread) { stepDread(dt); return; }
    if (S.boonShow) { stepBoonShow(dt); return; }
    S.rt += dt;
    if (!Number.isFinite(S.x + S.y + S.vx + S.vy)) unlose();
    if (S.rope && !S.ground) S.swungT = S.rt;         // (swinging: the last moment of it, for the block's blow)
    if (NOV) { if (NOV.torch && !S.latched) S.fuel = 1; if (NOV.flare) S.meter = 1; }       // (an endless torch, but not in a great demon's mouth)
    { const [pgx, pgy] = grip(); S.prevGx = pgx; S.prevGy = pgy; }
    S.whiteT = Math.max(0, (S.whiteT || 0) - dt); S.meterFlash = Math.max(0, (S.meterFlash || 0) - dt);
    for (const c of S.crosses) c.t += dt; S.crosses = S.crosses.filter((c) => c.t < (c.kind === "smite" ? 1.1 : 0.8));
    if (S.kick) { S.kick.t += dt; if (S.kick.t > 0.2) S.kick = null; }
    if (S.pend && (S.pend.t -= dt) <= 0) {
      const { wx, wy, side } = S.pend; S.pend = null;
      if (S.rope && !S.ground) swapHook(wx, wy, side); else if (!S.next && !S.act && !S.atk && !S.held && !S.rope) throwHook(wx, wy);
    }
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
    else if (!S.dying) S.meter = Math.min(1, S.meter + dt * METER_REGEN);
    if (S.hangT > 0) S.hangT -= dt;
    const wdt = dt * (F.on ? FLARE_SLOW : S.hangT > 0 ? 0.5 : 1);
    S.t += wdt;
    if (!S.dying) {
      if (S.fuel <= 0) lightOut();
      else if (S.fuel < 0.15 && Math.floor(S.rt * 0.8) !== Math.floor((S.rt - dt) * 0.8)) Sound.fx.gutter();
    }
    if (!S.dying) {
      if (S.latched) { S.vx = 0; S.vy = 0; if (S.shot) flyShot(wdt); }       // (held up in a great demon's jaws)
      else if (S.act) { if (S.shot) flyShot(wdt); stepAct(wdt); }
      else if (S.atk) { if (S.shot) flyShot(wdt); stepAtk(F.on ? dt * 0.8 : wdt); }       // his blows keep their speed in the flare
      else physics(wdt);
      // Rock that crumbles: his weight on it (his feet, or his hook) cracks it.
      if (S.ground) { weigh(crumblerAt(S.x - HW + 2, S.y + 3)); weigh(crumblerAt(S.x + HW - 2, S.y + 3)); }
      if (S.rope) weigh(crumblerAt(S.rope.hx === undefined ? S.rope.x : S.rope.hx, S.rope.hy === undefined ? S.rope.y : S.rope.hy));
    }
    stepCrumbling(wdt);
    if (S.ground && !S.act && !S.latched && !S.dying && !slickAt(S.x, S.y) && !crumblerAt(S.x, S.y + 3) && !thornAt(S.x, S.y - 4)) S.foot = [S.x, S.y];
    // The demons, and the stones.
    if (!S.dying) populate(dt);
    for (const f of S.demons) { updDemon(f, wdt); if (f.brokenT > 0) f.brokenT -= dt; }
    S.demons = S.demons.filter((f) => f.st !== "gone");
    for (const o of S.things) updThing(o, wdt);
    S.things = S.things.filter((o) => o.st !== "gone" && o.y < S.y + 1400);
    if (S.blocks.length) stepBlocks(wdt);
    if (S.bigs.length) stepGreat(wdt);
    if (S.rt >= REC.next) { REC.next = S.rt + 0.25; REC.snaps.push(snapNow()); if (REC.snaps.length > REC_N) REC.snaps.shift(); }
    if (S.yank) stepYank(wdt);
    S.hurtT = Math.max(0, S.hurtT - wdt); S.invT = Math.max(0, S.invT - dt); S.flashT = Math.max(0, S.flashT - dt); S.floatT = Math.max(0, S.floatT - wdt); S.shake = Math.max(0, S.shake - dt);
    S.leanT = Math.max(0, (S.leanT || 0) - wdt); S.greaseT = Math.max(0, (S.greaseT || 0) - dt); S.liftT = Math.max(0, (S.liftT || 0) - wdt); S.leapT = Math.max(0, (S.leapT || 0) - wdt); S.leapCd = Math.max(0, (S.leapCd || 0) - wdt); S.kickCd = Math.max(0, S.kickCd - wdt); S.swingKickT = Math.max(0, S.swingKickT - wdt);

    if (!S.fightSeen && S.demons.some((f) => alive(f) && !f.idol && dist(f.x, f.y, S.x, S.y) < 420)) { S.fightSeen = true; S.fightHintT = 0; }
    if (S.fightSeen) S.fightHintT += dt;
    S.landT = Math.max(0, S.landT - wdt); S.throwT = Math.max(0, S.throwT - wdt); S.stompT = Math.max(0, (S.stompT || 0) - wdt); S.jumpT = Math.max(0, (S.jumpT || 0) - wdt);
    S.hoverT = Math.max(0, (S.hoverT || 0) - wdt);
    if (S.flip) {
      S.flip.t += wdt; const done = S.flip.t > flipDur(S.flip);
      if (done || S.ground || S.rope || S.cling || S.act) { if (done && S.flip.swap && !S.ground) S.hoverT = HOVER_T; S.flip = null; }
    }
    if (S.next) nextHook(wdt);
    swingChains(wdt);
    if (S.coins > 0 && !S.dying) { const [mx, my] = middle(); for (const sec of sectionsIn(-S.y / CELL - 12, -S.y / CELL + 12)) for (const b of almsOf(sec)) if (dist(mx, my, b.x, b.y - 8) < 40) giveAlms(b); }
    if (S.ward && (S.ward.t += dt) > WARD_T) { S.ward = null; ev("ward faded"); }
    if (S.boon) stepBoon(dt);
    if (S.legsIn) stepLegs(dt);
    S.swingSp = S.rope && !S.ground ? Math.max(Math.hypot(S.vx, S.vy), (S.swingSp || 0) - 150 * wdt) : 0;
    // Against a wall, climbing the rope: he walks up it.
    S.wall = 0;
    if (S.climbing && !S.ground && S.rope) { if (near(S.dir, 7)) S.wall = S.dir; else if (near(-S.dir, 7)) S.wall = -S.dir; }
    S.anim += wdt * (S.ground ? Math.abs(S.vx) / (S.crawl ? 26 : 62) : 1.2);
    // Greased, he leaves prints of the fat where he treads (one at each step), fading.
    const stepN = Math.floor(S.anim * 2);
    if (stepN !== S.stepN) { if (S.ground && S.greaseT > 0 && Math.abs(S.vx) > 12 && !S.act) { S.prints.push({ x: S.x + S.dir * (stepN % 2 ? 3 : -2), y: S.y, t: S.rt, a: clamp(S.greaseT / 3, 0.35, 1), dir: S.dir }); if (S.prints.length > 40) S.prints.shift(); } S.stepN = stepN; }
    if (S.prints.length && S.rt - S.prints[0].t > 9) S.prints.shift();
    if (S.rope && !S.ground && !S.cling && Math.abs(S.vx) > 30) S.dir = sign(S.vx);
    if (!Number.isFinite(S.x + S.y + S.vx + S.vy)) unlose();
    S.top = Math.max(S.top, -S.y);
    // The verses: come near one and the torch is full again.
    const [mx, my] = middle(), hNow = -S.y / CELL;
    for (let n = 0; ; n++) {
      const w = wallAt(n); if (w.h > hNow + 40) break;
      w.lit = Math.max(0, w.lit - dt * 0.5);
      if (w.read || w.h < hNow - 40) continue;
      const p = wallPos(w);
      if (dist(mx, my, p.x, p.y) < 70 && !S.dying) {
        w.read = true; w.lit = 1; S.fuel = 1; S.read++; ev("verse read", { n: w.n });
        if (S.haunt) { ev("the Word: the great demon follows no further"); S.haunt = null; if (!S.freedSeen) S.freedPend = true; }
        if (NOV) keepHere("verse");
        const vv = (typeof Verses !== "undefined" ? Verses.list() : CLIMB_VERSES)[w.n % 22];
        S.verse = { v: vv, ps: "PSALM " + (vv[4] || 118), t: 0 };
        // (Playing, the game stops here, so the verse can be read; a tap, and it goes on.)
        if (mode === M) { S.verseHold = true; Sound.muffle(true, 0.4); }
        Sound.fx.unlock();
        for (let k = 0; k < 16; k++) S.parts.push({ kind: "spark", x: p.x, y: p.y + (Math.random() - 0.5) * 30, vx: -w.side * (30 + Math.random() * 90), vy: -20 - Math.random() * 80, life: 0.9, age: 0, real: true });
      }
    }
    if (S.verse) { S.verse.t += dt; if (S.verse.t > 7) S.verse = null; }
    if (S.freedPend && !S.verseHold) freedSay();
    // The lamps: passing one, he lights it from his torch, and if he falls it is there he wakes.
    // The reliquaries at the foot of a cavern's deepest chains: the torch and the flare made full.
    if (!S.dying) for (const sec of sectionsIn(hNow - 30, hNow + 30)) {
      for (const L of lampsOf(sec)) {
        if (L.lit || dist(mx, my, L.x, L.y - 20) > 46) continue;
        L.lit = true; L.litT = S.rt;
        if (NOV) { const sp = freeSpot(L.x, L.y); if (sp && boxHit(sp[0], sp[1] + 3)) keepPlace(sp[0], sp[1], "lamp"); }
        Sound.fx.kindle(1, panX(L.x));
        for (let k = 0; k < 10; k++) S.parts.push({ kind: "spark", x: L.x, y: L.y - 22, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 60, life: 0.7, age: 0, real: true });
      }
      for (const R of relicsOf(sec)) {
        if (R.got || S.latched || S.boonShow || dist(mx, my, R.x, R.y - 8) > 30) continue;
        R.got = true; S.relics++; S.fuel = 1; S.meter = 1;
        showBoon(boonOf(S.relics - 1));
        for (let k = 0; k < 24; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 120; S.parts.push({ kind: "spark", c: C.gold, x: R.x, y: R.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 1, age: 0, real: true }); }
      }
    }
    if (S.say) { S.say.t += dt; if (S.say.t > 3) S.say = null; }
    const lv = Math.min(4, Math.floor(metres(S.top) / 40));
    if (lv !== S.level && !S.dying) { S.level = lv; Sound.setLevel(lv); }
    // The camera: a little below the middle, so more of the way up shows; ahead of him in a crossing.
    const sec = sectionAt(Math.max(1, Math.floor(hNow))), cv = sec.type === "cave", sl = sec.type === "slope", look = sec.type === "trav" ? trav(sec).dir * 90 : cv ? cave(sec).dir * 140 : sl ? slope(sec).dir * 120 : 0;
    const tx = clamp(S.x + look - W / 2, 0, COLS * CELL - W), ty = Math.min(S.y - HT / 2 - H * (sec.type === "trav" || sl ? 0.5 : cv ? 0.42 : 0.58), 70 - H);
    S.cam.x += (tx - S.cam.x) * (1 - Math.exp(-dt * 4)); S.cam.y += (ty - S.cam.y) * (1 - Math.exp(-dt * 4));
    if (!S.dying && Math.random() < (F.on ? 0.9 : boonOn("unconsumed") ? 0.75 : 0.3)) S.parts.push({ kind: "ember", x: S.torch[0] + (Math.random() - 0.5) * 4, y: S.torch[1] - 6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, life: 0.8, age: 0 });
    for (const p of S.parts) {
      const k = p.real ? dt : wdt; p.age += k; p.x += p.vx * k; p.y += p.vy * k;
      if (p.kind === "chip") p.vy += 500 * k; else if (p.kind === "smoke") { p.vx *= 1 - 2 * k; p.vy *= 1 - 2 * k; }
      else if (p.kind === "glob") p.vy += 600 * k;
      else if (p.kind === "coinfly") { const u = Math.min(1, p.age / p.life); p.x = lerp(p.x, p.tx, Math.min(1, k * 9)); p.y = lerp(p.y, p.ty, Math.min(1, k * 9)) - Math.sin(u * PI) * 1.5; if (u >= 1 && !p.done) { p.done = true; if (!p.quiet) Sound.fx.coin(panX(p.tx), 0.45); } }
      else if (p.kind === "draft") { const q = 1 - Math.exp(-k * 4.5); p.px = p.x; p.py = p.y; p.x = lerp(p.x, p.tx, q); p.y = lerp(p.y, p.ty, q); }
    }
    S.parts = S.parts.filter((p) => p.age < p.life);
    for (const g of S.ghosts) g.age += dt;
    S.ghosts = S.ghosts.filter((g) => g.age < 0.9);
    S.hintT += dt;
  }

  // ---- Drawing -----------------------------------------------------------------------------------------
  function lightR() {
    const f = S.dying ? Math.max(0, 1 - S.dying / 1.4) * 0.15 : clamp(S.fuel, 0, 1);
    let R = 50 + 210 * Math.pow(f, 0.75);
    if (S.flare.on) R = Math.max(R, FLARE_R + 30);
    if (S && S.boon && S.boon.kind === "unconsumed") R *= 1.3;
    if (S.latched) R *= 1 - 0.65 * clamp((S.latched.latchT || 0) / 0.6, 0, 1);       // (shut in a great demon's mouth, the torch shows little)
    return R;
  }
  // What the torch can see: rays cast through the grid of rock, each stopping a little way into
  // the first rock it meets (so the faces it lights are lit).
  // (The niches cut into the walls are hollows the light goes into: HOLES holds their cells.)
  const HOLES = new Set(), holeKey = (i, j) => (j + 1e6) * 256 + i;
  function visPoly(ox, oy, R) {
    const N = 180, pts = new Float32Array(N * 2), i0 = Math.floor(ox / CELL), j0 = Math.floor(oy / CELL);
    if (!Number.isFinite(ox + oy + R)) return pts;
    const inRock = solid(i0, j0);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU, dx = Math.cos(a), dy = Math.sin(a), sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
      const tdx = Math.abs(CELL / (dx || 1e-9)), tdy = Math.abs(CELL / (dy || 1e-9));
      let i = i0, j = j0, tmx = dx > 0 ? ((i + 1) * CELL - ox) / dx : dx < 0 ? (ox - i * CELL) / -dx : 1e9;
      let tmy = dy > 0 ? ((j + 1) * CELL - oy) / dy : dy < 0 ? (oy - j * CELL) / -dy : 1e9, d = R;
      if (!inRock) while (true) {
        let t; if (tmx < tmy) { t = tmx; tmx += tdx; i += sx; } else { t = tmy; tmy += tdy; j += sy; }
        if (t > R) break;
        if (solid(i, j) && !(HOLES.size && HOLES.has(holeKey(i, j)))) { d = Math.min(R, t + 5); break; }
      }
      pts[k * 2] = ox + dx * d; pts[k * 2 + 1] = oy + dy * d;
    }
    return pts;
  }
  let DK = null;
  // The dark over everything, but where the torch can see; and, without shadows, a little way round
  // the other lights (lamps, fire, the glow from a pit): lights = [{ x, y, r, a, sx }] on the screen.
  function darkness(cam, tx, ty, R, lights, shade) {
    const k = 0.5, w = Math.ceil(W * k), h = Math.ceil(H * k);
    if (!DK) DK = document.createElement("canvas");
    if (DK.width !== w || DK.height !== h) { DK.width = w; DK.height = h; }
    const g = DK.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h);
    g.fillStyle = shade || "rgba(4,4,6,0.95)"; g.fillRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, 0, 0); g.globalCompositeOperation = "destination-out";
    const gr = g.createRadialGradient(tx, ty, 0, tx, ty, R);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.3, "rgba(0,0,0,0.95)"); gr.addColorStop(0.65, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fill(S.light);
    for (const L of lights || []) {
      if (L.x + L.r * (L.sx || 1) < 0 || L.x - L.r * (L.sx || 1) > W || L.y + L.r < 0 || L.y - L.r > H) continue;
      g.save(); g.translate(L.x, L.y); if (L.sx) g.scale(L.sx, 1);
      const q = g.createRadialGradient(0, 0, 0, 0, 0, L.r);
      q.addColorStop(0, "rgba(0,0,0," + L.a + ")"); q.addColorStop(0.45, "rgba(0,0,0," + L.a * 0.6 + ")"); q.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = q; g.beginPath(); g.arc(0, 0, L.r, 0, TAU); g.fill(); g.restore();
    }
    g.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true; ctx.drawImage(DK, 0, 0, W, H);
  }
  // A slab of rock standing free (a platform in a shaft, or hung in a cavern): flat on top (or a
  // little askew: tilt is how far its right end lies below its middle), its underside broken. jit
  // shakes it (as it crumbles).
  function slab(P, cam, x0, x1, y0, y1, s, jit, tilt) {
    const X = (x) => x - cam.x + jx, Y = (y) => y - cam.y + jy, q = (k) => (hash2(s, k, 77) - 0.5) * 4, tl = (x) => (tilt || 0) * clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1);
    const jx = jit ? (Math.random() - 0.5) * jit : 0, jy = jit ? (Math.random() - 0.5) * jit * 0.6 : 0, deep = y1 - y0 > CELL * 1.5;
    P.moveTo(X(x0 + 2), Y(y0 + q(2) * 0.4 + tl(x0))); P.lineTo(X((x0 + x1) / 2 + q(3)), Y(y0 - 1)); P.lineTo(X(x1 - 2), Y(y0 + 0.5 + tl(x1)));
    P.lineTo(X(x1 + 1 + q(6) * 0.4), Y((y0 + y1) / 2 + tl(x1) * 0.5)); P.lineTo(X(x1 - 4 + q(7)), Y(y1 + 2 + Math.abs(q(8))));
    if (deep || x1 - x0 > 80) { P.lineTo(X(lerp(x0, x1, 0.68) + q(13)), Y(y1 + 9 + Math.abs(q(14)) * 2)); P.lineTo(X(lerp(x0, x1, 0.5) + q(9)), Y(y1 + 3)); P.lineTo(X(lerp(x0, x1, 0.32) + q(15)), Y(y1 + 12 + Math.abs(q(16)) * 2)); }
    else P.lineTo(X((x0 + x1) / 2 + q(9)), Y(y1 + 6 + Math.abs(q(10))));
    P.lineTo(X(x0 + 3), Y(y1 + 2 + Math.abs(q(11)))); P.lineTo(X(x0 - 1 + q(12) * 0.4), Y((y0 + y1) / 2 + tl(x0) * 0.5)); P.closePath();
  }
  // The rock as one path: the walls with craggy faces, the platforms, the crossings, the caverns, the floor.
  function rockPath(cam) {
    const j0 = Math.floor(cam.y / CELL) - 1, j1 = Math.min(-1, Math.floor((cam.y + H) / CELL) + 1);
    const P = new Path2D(), X = (x) => x - cam.x, Y = (y) => y - cam.y, i0 = Math.max(0, Math.floor(cam.x / CELL) - 1), i1 = Math.min(COLS - 1, Math.floor((cam.x + W) / CELL) + 1);
    const jig = (j, k) => (hash2(j, k, 99) - 0.5) * 1.6;
    // Shaft rows: the two walls as long craggy runs; crossing and cavern rows: cell by cell, merged along each row.
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
    // Crossing and cavern rows: each row's runs of rock, then runs that go on unchanged from row to
    // row merged into one face (so a cliff is one cliff, with no seams for the light to catch).
    const caves = new Set(), rowRuns = new Map();
    for (let j = j0; j <= j1; j++) {
      const sec = sectionAt(-j);
      if (sec.type === "shaft") continue;
      // (In a cavern, its platforms are left out here: they are drawn as slabs.)
      let sd0 = (i) => solid(i, j);
      if (sec.type === "cave") { caves.add(sec); const V = cave(sec), r = -j - sec.h0; sd0 = (i) => V.base[r * COLS + i] === 1; }
      const runs = []; let a = -1;
      for (let i = i0 - 1; i <= i1 + 1; i++) {
        const sd = sd0(Math.max(0, Math.min(COLS - 1, i)));
        if (sd && a < 0) a = i;
        if ((!sd || i === i1 + 1) && a >= 0) { runs.push([a, sd ? i : i - 1]); a = -1; }
      }
      rowRuns.set(j, runs);
    }
    const sdAt = (i, j) => { const sec = sectionAt(-j); if (sec.type === "cave") { const r = -j - sec.h0; return r >= 0 && r < CH && cave(sec).base[r * COLS + Math.max(0, Math.min(COLS - 1, i))] === 1; } return solid(Math.max(0, Math.min(COLS - 1, i)), j); };
    const over = (p, q) => p[0] <= q[1] && q[0] <= p[1];
    for (let j = j0; j <= j1; j++) {
      const runs = rowRuns.get(j); if (!runs) continue;
      for (const run of runs) {
        if (run.done) continue;
        // Down from here while one run below goes on from this one alone, and only from it.
        const chain = [run]; let jb = j;
        for (; ;) {
          const last = chain[chain.length - 1], here = rowRuns.get(jb), nx = rowRuns.get(jb + 1); if (!nx) break;
          const ms = nx.filter((q) => !q.done && over(q, last)); if (ms.length !== 1) break;
          if (here.filter((q) => over(q, ms[0])).length !== 1) break;
          ms[0].done = true; chain.push(ms[0]); jb++;
        }
        const xa = (r) => (r[0] <= i0 - 1 ? -60 : r[0] * CELL), xb = (r) => (r[1] >= i1 + 1 ? COLS * CELL + 60 : (r[1] + 1) * CELL);
        const f = chain[0], l = chain[chain.length - 1];
        const up = !sdAt(f[0], j - 1), dn = !sdAt(l[0], jb + 1), yt = j * CELL - (up ? 0.5 : 1), yb = jb * CELL + CELL + (dn ? 0.5 : 1);
        P.moveTo(X(xa(f) + jig(j, f[0])), Y(yt)); P.lineTo(X(xb(f) + jig(j, f[1] + 7)), Y(yt));
        chain.forEach((r, n) => { const q = j + n; P.lineTo(X(xb(r) + jig(q, r[1] + 7)), Y(q * CELL + (n ? 2 : 0))); P.lineTo(X(xb(r) + jig(q + 1, r[1] + 7)), Y(q * CELL + CELL - (n < chain.length - 1 ? 2 : 0))); });
        P.lineTo(X(xb(l) + jig(jb + 1, l[1] + 7)), Y(yb)); P.lineTo(X(xa(l) + jig(jb + 1, l[0])), Y(yb));
        for (let n = chain.length - 1; n >= 0; n--) { const r = chain[n], q = j + n; P.lineTo(X(xa(r) + jig(q + 1, r[0])), Y(q * CELL + CELL - (n < chain.length - 1 ? 2 : 0))); P.lineTo(X(xa(r) + jig(q, r[0])), Y(q * CELL + (n ? 2 : 0))); }
        P.closePath();
      }
    }
    for (const sec of caves) for (const p of cave(sec).plats) {
      const y0 = -(sec.h0 + p.r1) * CELL, y1 = -(sec.h0 + p.r0 - 1) * CELL;
      if (y1 + 30 < cam.y || y0 - 10 > cam.y + H) continue;
      slab(P, cam, p.x0 * CELL, (p.x1 + 1) * CELL, y0, y1, sec.k * 31 + p.x0, 0, p.tilt);
    }
    for (let s = Math.floor(-j1 / SLOT) - 1; s <= Math.floor(-j0 / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl || isl.st === "gone") continue;
      slab(P, cam, isl.x0 * CELL, (isl.x1 + 1) * CELL, -isl.h1 * CELL, (1 - isl.h0) * CELL, s, isl.st === "crack" && S.rt - isl.loadT < 0.1 ? 0.6 + isl.stage * 0.8 : 0, isl.tilt);
    }
    for (const sec of sectionsIn(-j1 - 4, -j0 + 4)) {
      const E = sec.type === "shaft" && eyeOf(sec); if (!E) continue;
      const yT = -E.h1 * CELL, yB = (1 - E.h0) * CELL, eL = Math.min(edges(-E.h0).L, edges(-E.h1).L) - 1, eR = Math.max(edges(-E.h0).R, edges(-E.h1).R) + 1;
      slab(P, cam, eL * CELL, E.i0 * CELL, yT, yB, sec.k * 7 + 1, 0, 0); slab(P, cam, (E.i1 + 1) * CELL, (eR + 1) * CELL, yT, yB, sec.k * 7 + 2, 0, 0);
    }
    if (cam.y + H > -2) {
      P.moveTo(X(-60), Y(0)); for (let x = 0; x <= COLS * CELL; x += 24) P.lineTo(X(x), Y(jig(x, 5) * 0.6 + 1)); P.lineTo(X(COLS * CELL + 60), Y(0));
      P.lineTo(X(COLS * CELL + 60), Y(Math.max(0, cam.y + H) + 10)); P.lineTo(X(-60), Y(Math.max(0, cam.y + H) + 10)); P.closePath();
    }
    return P;
  }
  function platAt(V, sec, i, j) { const r = -j - sec.h0; if (r < 0 || r >= CH) return false; return V.g[r * COLS + i] === 1 && V.base[r * COLS + i] === 0; }
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
  // over hand up the rope (the torch held in one hand as it grips).
  // (The torch, held in the hand that also grips: up, and back from the rock or the rope.)
  const torchBack = (sB, eB) => PI + 0.55 - sB - eB;
  function wallWalk(ph) {
    const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v), sB = 2.7 + 0.28 * b, eB = 0.25 + 0.35 * up(b);
    return S_({ lean: -0.55, head: -0.5, sF: 2.7 + 0.28 * a, eF: 0.25 + 0.35 * up(a), sB, eB, tq: torchBack(sB, eB),
      hF: 1.25 + 0.45 * up(a), kF: 1.0 + 0.7 * up(a), hB: 1.25 + 0.45 * up(b), kB: 1.0 + 0.7 * up(b) });
  }
  // On the rock with bare hands, facing it: the free hand up to a hold, and the torch hand up in
  // turn to plant the torch's foot in the rock like a spike (its flame up and back from the rock),
  // a knee up with each.
  function wallClimb(ph) {
    const a = Math.sin(ph), b = -a, up = (v) => Math.max(0, v), stab = Math.pow(up(b), 6);
    const sB = 2.45 + 0.5 * b, eB = 0.25 + 0.55 * up(a) - 0.15 * stab;
    return S_({ lean: 0.12, head: -0.35, sF: 2.55 + 0.4 * a, eF: 0.35 + 0.5 * up(b), sB, eB, tq: PI + 0.6 - 0.4 * stab - sB - eB,
      hF: 0.35 + 0.95 * up(a), kF: 0.5 + 1.3 * up(a), hB: 0.35 + 0.95 * up(b), kB: 0.5 + 1.3 * up(b) });
  }
  // On his hands and knees in a low way: the body flat out over the knees, the free hand and the
  // fist with the torch in it going down in turn, the knees after them, the torch held up before him.
  function crawlPose(u) {
    const c = Math.sin(TAU * u), c2 = Math.sin(TAU * u + PI), hF = 0.15 + 0.25 * c2, hB = 0.15 - 0.25 * c2;
    return pose({ lean: 1.38, head: -1.05, sF: 0.62 + 0.28 * c, eF: 0.1 - 0.07 * c, sB: 1.15 - 0.25 * c, eB: -1.5, tq: 2.85, hF, kF: hF + 1.5, hB, kB: hB + 1.5, lift: 0.5 * Math.abs(c) });
  }
  function monkPose() {
    const t = S.t;
    if (S.latched) return MONK_ANIM.fall((S.rt * 2.6) % 1);       // (held up in its jaws, his legs kicking)
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
        // Both hands on the rope in turn, the torch held in one of them, out from the rope.
        p.sB = 2.85 + 0.25 * Math.sin(S.climbPh + PI); p.eB = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(S.climbPh + PI));
        p.sF = 2.85 + 0.25 * Math.sin(S.climbPh); p.tq = torchBack(p.sB, p.eB);
        // Hand over hand, the knees coming up in turn to grip the rope.
        const c = Math.sin(S.climbPh);
        p.hF = 0.25 + 0.75 * Math.max(0, c); p.kF = 0.3 + 1.1 * Math.max(0, c);
        p.hB = 0.1 + 0.75 * Math.max(0, -c); p.kB = 0.3 + 1.1 * Math.max(0, -c);
        p.eF = 0.06 + 0.35 * (0.5 + 0.5 * Math.sin(S.climbPh * 2)); p.lift = 1.5 * Math.sin(S.climbPh * 2);
      }
    } else if (!S.ground && S.stompT > 0) p = MONK_ANIM.diveStomp(0.72 + 0.28 * (1 - S.stompT / 0.4));
    else if (!S.ground && S.flip) {
      const k = S.flip.t / flipDur(S.flip);
      p = blendPose(TUCK, MONK_ANIM.fall(0), smooth((k - 0.7) / 0.3)); p.spin = S.flip.s * S.dir * TAU * (S.flip.half ? 0.5 : 1) * ease(Math.min(1, k * 1.15));
    } else if (!S.ground && S.jumpT > 0) p = MONK_ANIM.leap(clamp(0.32 + (0.6 - S.jumpT) * 0.5, 0.32, 0.6));
    else if (!S.ground) p = MONK_ANIM.fall((t * 1.3) % 1);
    else if (S.crawl) p = crawlPose(S.anim % 1);
    else if (S.landT > 0) p = MONK_ANIM.land(1 - S.landT / (S.landMax || 0.35));
    else if (Math.abs(S.vx) > 12) p = MONK_ANIM.walk(S.anim % 1);
    else p = MONK_ANIM.idle((t * 0.4) % 1, t);
    if ((S.held || (S.tied && S.tied.st === "hand")) && !S.atk) { p.sF = 2.8; p.eF = 0.3; p.lean = Math.min(p.lean, 0.04); }   // the boulder up in his free hand, the torch still in the other
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
      case "creep": return A.walk((f.t * 1.5) % 1, t, s);
      case "flee": return A.walk((f.t * 2) % 1, t, s);
      case "snatch": return A.throw(k(0.4), t, s);
      case "cast": return A.windup(k(0.5), t, s);
      case "tether": return A.throw(0.55, t, s);
      case "pickup": return s === "wrath" ? A.windup(k(0.7), t, s) : A.pickup(k(0.5), t, s);
      case "windup": return A.windup(s === "wrath" ? 1 : k(0.55), t, s);
      case "inhale": { const p = A.idle((t * 0.5 + f.id * 0.3) % 1, t, s); p.jaw = Math.min(1, f.t * 3); p.lean -= 0.18 * Math.min(1, f.t * 3); p.head -= 0.25 * Math.min(1, f.t * 3); return p; }
      case "bite": return A.swallow(k(0.6), t, s);
      case "heave": { const p = A.windup(k(0.75), t, s); p.jaw = 0.25 + 0.25 * k(0.75); return p; }
      case "lob": return A.spit(k(0.5), t, s);
      case "swallow": return A.swallow(k(0.7), t, s);
      case "spit": return A.spit(k(0.6), t, s);
      case "throw": return A.throw(k(0.42), t, s);
      case "hurt": return A.hurt(k(0.38), t, s);
      case "air": case "thrown": case "fall": return A.launched((f.t * 0.9) % 1, t, s);
      case "down": return A.down(k(0.9), t, s);
      case "getUp": return A.getUp(k(0.5), t, s);
      case "emerge": return A.emerge(k(0.9), t, s);
      case "dying": return A.hurt(1, t, s);
      // Floating off: going for a block, its arms out for it; with it, holding it up over its head.
      case "seize": { const p = A.float((t * 0.8 + f.id * 0.3) % 1, t, s); p.sF = 1.5; p.eF = 0.2; p.sB = 1.3; p.eB = 0.3; return p; }
      case "carry": { const p = A.float((t * 0.8 + f.id * 0.3) % 1, t, s); p.sF = 2.9; p.eF = 0.25; p.sB = 2.8; p.eB = 0.3; return p; }
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
    // (The shaking, and the knock of a blow: the view thrown the blow's way and coming back.)
    const K = S.kick, kk = K ? Math.max(0, 1 - K.t / 0.16) : 0;
    const sx = (S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0) - (K ? K.x * kk * kk : 0), sy = (S.shake > 0 ? (Math.random() - 0.5) * 10 * S.shake : 0) - (K ? K.y * kk * kk : 0);
    S.cam.x += sx; S.cam.y += sy;
    drawWorld();
    S.cam.x -= sx; S.cam.y -= sy;
  }
  // ---- The domains, drawn ----------------------------------------------------------------------------
  // The rock stays black everywhere. A domain shows in the mist (a little of its colour in it) and in
  // the dark (a little there too), in its gates and its idols, and in the light of its own fires.
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbs = (c, a) => "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")";
  function tintStep(dt) {
    const dom = sectionAt(Math.max(1, Math.floor(-(S.cam.y + H / 2) / CELL))).dom;
    const m = rgb(dom ? mix("#ffffff", SINS[dom].color, 0.34) : "#ffffff"), d = rgb(dom ? mix("#040406", SINS[dom].deep, 0.28) : "#040406");
    if (!S.tint) S.tint = { m, d };
    const k = 1 - Math.exp(-dt * 1.2);
    for (let i = 0; i < 3; i++) { S.tint.m[i] += (m[i] - S.tint.m[i]) * k; S.tint.d[i] += (d[i] - S.tint.d[i]) * k; }
  }
  // Points in a frame of its own (u, v) put on the screen at (x, y): flipped by side, v going up.
  const put = (x, y, side, cam) => (u, v) => [x + side * u - cam.x, y - v - cam.y];
  function addPoly(path, pts, T) { const a = T(pts[0][0], pts[0][1]); path.moveTo(a[0], a[1]); for (let i = 1; i < pts.length; i++) { const b = T(pts[i][0], pts[i][1]); path.lineTo(b[0], b[1]); } path.closePath(); }
  function addOval(path, u, v, ru, rv, T, n) { n = n || 12; const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([u + Math.cos(a) * ru, v + Math.sin(a) * rv]); } addPoly(path, pts, T); }
  // Those who worship there, facing the idol (toward +u): kneeling upright with hands lifted, kneeling
  // bowed low, or lying on their faces. head: where the head is, bowed to it; up: turned back to the light.
  const WORSHIP = [
    { body: [[-7, 0], [8, 0], [8, 3], [3, 6], [4, 13], [7, 19], [4, 20], [1, 21], [-3, 21], [-6, 13], [-8, 5]], head: [0.5, 24.5], up: [-0.8, 24.8] },
    { body: [[-7, 0], [9, 0], [12, 3], [12, 7], [7, 12], [1, 14], [-5, 11], [-8, 5]], head: [13.5, 6.5], up: [7.5, 16.5] },
    { body: [[-6, 0], [12, 0], [14, 2], [10, 6], [3, 7.5], [-3, 6.5], [-6, 3]], head: [15.5, 3.2], up: [11.5, 9.5] },
    // (Lust's: standing, swaying, an arm lifted to it.)
    { body: [[-5, 0], [5, 0], [4, 8], [4.5, 17], [3, 23], [-2.5, 23], [-4, 16], [-5.5, 7]], arms: [[2.5, 21], [8, 31], [9.5, 30], [4.5, 19.5]], head: [0.8, 26.5], up: [-0.6, 26.5] },
  ];
  // The idols, one to a domain, each from the Scriptures: Bel, who was said to eat (Daniel 14); Moloch,
  // the bull with the fire in its belly; and so on (those of the domains not yet made: a figure on a plinth).
  function idolPath(path, dom, T) {
    if (dom === "gluttony") {
      addPoly(path, [[25, 0], [41, 0], [41, 4], [25, 4]], T);                                              // the plinth
      addOval(path, 33.5, 13.5, 8, 9.5, T, 14);                                                              // the belly
      addPoly(path, [[28, 20], [37, 20], [38, 25], [36.5, 30], [32, 31.5], [28.5, 30], [27.5, 27.5], [31, 26.2], [27.6, 25]], T);   // the head, its mouth wide
      addPoly(path, [[28, 17], [24, 12.5], [25.4, 11.4], [29.6, 14.5]], T);                                 // an arm, reaching
      addPoly(path, [[15, 7.2], [25, 7.2], [25, 8.6], [15, 8.6]], T); addPoly(path, [[16, 0], [17.2, 0], [17.2, 7.4], [16, 7.4]], T); addPoly(path, [[22.8, 0], [24, 0], [24, 7.4], [22.8, 7.4]], T);   // the table
      addOval(path, 17.4, 10.2, 2.1, 1.7, T, 8); addOval(path, 20.4, 10.6, 2.3, 2, T, 8); addOval(path, 23.2, 10.1, 1.8, 1.5, T, 8); addOval(path, 19, 12.6, 1.7, 1.4, T, 8);   // the loaves
    } else if (dom === "wrath") {
      addPoly(path, [[24, 0], [41, 0], [41, 4], [24, 4]], T);
      addPoly(path, [[28, 4], [39, 4], [38.5, 24], [28.5, 24]], T);                                          // the body
      addPoly(path, [[29.5, 21], [21, 18], [19.6, 16.2], [21.2, 15.6], [29.5, 17.6]], T);                    // the arms held out, the hands open
      addPoly(path, [[29, 23], [37.5, 23], [38, 29], [35.5, 33], [30.5, 33], [28.4, 30.4], [25, 29.8], [24.6, 27.2], [28.4, 26.4]], T);   // the bull's head
      addPoly(path, [[30.6, 32], [27.6, 37.6], [25.4, 40.4], [26.6, 36.2], [29, 31]], T); addPoly(path, [[35, 32.4], [37.6, 37], [37.4, 40.6], [35.6, 37], [33.6, 32.8]], T);   // the horns
    } else if (dom === "avarice") {
      // The golden calf, that Aaron made of their earrings, and they said: "These are thy gods, O
      // Israel" (Exodus 32:4): on its plinth, standing four-square, its head up.
      addPoly(path, [[22, 0], [44, 0], [44, 4], [22, 4]], T);                                                // the plinth
      addOval(path, 33, 15, 9, 5, T, 14);                                                                   // the body
      for (const u of [26, 29, 37, 40]) addPoly(path, [[u - 1.1, 4], [u + 1.1, 4], [u + 1.3, 12], [u - 1.3, 12]], T);   // the legs
      addPoly(path, [[39.5, 16], [42, 22], [46.5, 23.5], [47.5, 20.5], [44.5, 18.5], [41.5, 13.5]], T);       // the neck and head
      addPoly(path, [[43, 22.5], [41.5, 26.5], [42.6, 26.6], [44.2, 23]], T); addPoly(path, [[45.4, 23.4], [46.8, 27], [47.6, 26.4], [46.6, 23]], T);   // the horns
      addPoly(path, [[24.2, 16], [21, 12], [21.6, 11.2], [24.8, 14.5]], T);                                    // the tail
    } else if (dom === "lust") {
      // Ashtoreth, the goddess of the Sidonians, after whom Solomon went (1 Kings 11:5): slender on her
      // plinth, her arms raised, holding up the horned moon over her head.
      addPoly(path, [[26, 0], [40, 0], [40, 4], [26, 4]], T);
      addPoly(path, [[29, 4], [37, 4], [35.2, 16], [36, 22], [34.8, 28], [31.2, 28], [30, 22], [30.8, 16]], T);   // the body, long and narrow
      addOval(path, 33, 31.5, 2.6, 3.1, T, 10);                                                                 // the head
      addPoly(path, [[31, 26.5], [27.6, 33], [28.4, 36.5], [29.6, 36], [29.4, 33.4], [32, 27.5]], T);            // the arms raised
      addPoly(path, [[35, 26.5], [38.4, 33], [37.6, 36.5], [36.4, 36], [36.6, 33.4], [34, 27.5]], T);
      addPoly(path, [[26.6, 37], [28.6, 36.4], [30.6, 39], [33, 40], [35.4, 39], [37.4, 36.4], [39.4, 37], [37.2, 40.8], [33, 42.4], [28.8, 40.8]], T);   // the horned moon held up
    } else {
      addPoly(path, [[26, 0], [40, 0], [40, 4], [26, 4]], T);
      addPoly(path, [[29.5, 4], [36.5, 4], [35.5, 26], [37, 32], [33, 36], [29, 32], [30.5, 26]], T);
      addOval(path, 33, 38.5, 3.6, 3.8, T, 10);
    }
  }
  // A shrine on its level ground: about the idol (or what is left of it), the things of its domain's
  // worship; and its worshippers, kneeling, or fled. Each domain's differs: Bel at his table, jars
  // of wine set by; Ashtoreth between two bowls of incense; Moloch with a fire pit before him.
  const ROBE = "#17141b", IK = 1.35, WK = 1.45;   // the robes' dark; the idol's size and its people's, out on open ground
  function drawShrine(f, cam, rimP, idols, lights) {
    const sx = f.x - cam.x, sy = f.y - cam.y, dom = f.sin;
    const [lx, ly] = S.torch, near = dist(lx, ly, f.x, f.y - 20) < lightR() * 0.85 && los(lx, ly, f.x, f.y - 20);
    for (const w of f.who) drawWorshipper(w, cam, rimP, near);
    if (sx < -120 || sx > W + 120 || sy < -90 || sy > H + 60) return;
    const K = IK * (f.big || 1), rz = f.st === "rise" ? ease(clamp(f.t / 0.9, 0, 1)) : 1, B0 = put(f.x, f.y, 1, cam), B = (u, v) => B0(u * K, v * K), ink = new Path2D();
    if (dom === "gluttony") for (const u of [22, 29]) { addOval(ink, u, 4.5, 3.3, 4.5, B, 10); addPoly(ink, [[u - 1.3, 8], [u + 1.3, 8], [u + 1.8, 10.5], [u - 1.8, 10.5]], B); }
    else if (dom === "lust") for (const u of [-17, 17]) {
      addPoly(ink, [[u - 3.5, 0], [u + 3.5, 0], [u + 0.8, 2], [u + 0.6, 22], [u - 0.6, 22], [u - 0.8, 2]], B); addPoly(ink, [[u - 5, 22], [u + 5, 22], [u + 3.5, 26], [u - 3.5, 26]], B);
      if (f.st === "idle" && Math.random() < 0.05) S.parts.push({ kind: "smoke", x: f.x + u * K, y: f.y - 27 * K, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 8, r: 2 + Math.random() * 2, life: 1.8, age: 0 });
    } else if (dom === "avarice") { for (const u of [-24, 24, 31]) addPoly(ink, [[u - 6, 0], [u + 6, 0], [u + 3, 3.5], [u, 4.5], [u - 3, 3.5]], B); }
    else if (dom === "wrath") { addPoly(ink, [[13, 0], [29, 0], [27, 5], [15, 5]], B); lights.push({ x: sx + 21 * K, y: sy - 6, r: 50, a: 0.5 }); }
    if (f.st === "broken") addPoly(ink, [[-8, 0], [8, 0], [7, 4], [2, 5.5], [-3, 4.5], [-7, 4]], B);
    else {
      // Standing (shaken as it is struck), or falling over.
      const ang = f.st === "topple" ? f.fall * (PI / 2) * ease(Math.min(1, f.t / 0.45)) : f.hurtT > 0 ? Math.sin(f.hurtT * 70) * 0.05 : 0;
      const base = put(f.x - 33 * K, f.y, 1, cam), px = sx + (f.st === "topple" ? f.fall * 10 : 0), c = Math.cos(ang), sn = Math.sin(ang);
      const T = (u, v) => { const [x, y] = base(u * K, v * K * rz), dx = x - px, dy = y - sy; return [px + dx * c - dy * sn, sy + dx * sn + dy * c]; };
      const idol = new Path2D(); idolPath(idol, dom, T);
      ctx.fillStyle = C.ink; ctx.fill(idol); rimP.addPath(idol); idols.push({ path: idol, dom, idol: true });
      if (dom === "wrath" && f.st === "idle") { const a = T(31, 12), b = T(36, 7); rect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1], "#3a0c06"); }
    }
    ctx.fillStyle = C.ink; ctx.fill(ink); rimP.addPath(ink);
  }
  // One of them: at prayer, its head turning to his light as it comes near; or running, bent double,
  // its robe flying, and fading into the dark.
  function drawWorshipper(w, cam, rimP, near) {
    const x = w.x - cam.x, y = w.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
    const P = new Path2D(), run = w.st === "run", T0 = put(w.x, w.y, run ? w.dir : w.side, cam), T = (u, v) => T0(u * WK, v * WK);
    let face = null;
    if (run) {
      const s1 = Math.sin(w.ph), b = Math.abs(Math.cos(w.ph)) * 1.5;
      addPoly(P, [[-6, 4 + b], [4, 4 + b], [8, 12 + b], [7, 19 + b], [3, 23 + b], [-2, 22 + b], [-4, 14 + b], [-10, 9 + b]], T);
      addOval(P, 7.5, 24.5 + b, 3.2, 3.4, T, 10);
      addPoly(P, [[-1.5, 5 + b], [1.5, 5 + b], [1.2 + 5 * s1, 0], [-1.2 + 5 * s1, 0]], T); addPoly(P, [[-1.5, 5 + b], [1.5, 5 + b], [1.2 - 5 * s1, 0], [-1.2 - 5 * s1, 0]], T);
    } else {
      w.look = clamp(w.look + (near ? 1.1 : -0.4) * DDT, 0, 1);
      const W2 = WORSHIP[w.kind], k = smooth(w.look), sw = w.kind === 3 ? Math.sin(S.rt * 1.6 + w.ph) * 1.4 : 0;
      const hd = [lerp(W2.head[0], W2.up[0], k) + sw, lerp(W2.head[1], W2.up[1], k)];
      addPoly(P, W2.body.map(([u, v]) => [u + sw * v / 26, v]), T);
      if (W2.arms) addPoly(P, W2.arms.map(([u, v]) => [u + sw, v]), T);
      addOval(P, hd[0], hd[1], 3.3, 3.5, T, 10);
      addPoly(P, [[hd[0] + 1.5 - k * 2.5, hd[1] + 2.2], [hd[0] + 3.6 - k * 5, hd[1] + 4.6 - k * 1.2], [hd[0] + 2.8 - k * 3, hd[1] + 0.4]], T);   // the hood's point
      if (k > 0.2) face = [T(hd[0] - 1.9, hd[1] - 0.3), (k - 0.2) / 0.8];
    }
    ctx.globalAlpha = w.a; ctx.fillStyle = ROBE; ctx.fill(P); ctx.globalAlpha = 1;
    if (w.a > 0.5) rimP.addPath(P);
    // The face, turned back over the shoulder: pale, and no more than a face.
    if (face) { ctx.globalAlpha = face[1] * w.a; ctx.beginPath(); ctx.ellipse(face[0][0], face[0][1], 2.2, 3.3, 0, 0, TAU); ctx.fillStyle = "#5b544b"; ctx.fill(); ctx.globalAlpha = 1; }
  }
  // A piece of a broken idol: a rough lump of it, its colour showing in the light.
  function drawShard(x, y, rot, lit, dom, sid) {
    const pts = []; for (let i = 0; i < 7; i++) { const a = rot + i / 7 * TAU, r = 7.5 + 5 * hash2(sid || 1, i, 41); pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    poly(pts, "#0d0d10");
    if (lit) { poly(pts, hexA((SINS[dom] || SINS.wrath).dark, 0.75)); ctx.globalAlpha = 0.6; line(pts[0], pts[1], pts[6], pts[7], (SINS[dom] || SINS.wrath).color, 1); ctx.globalAlpha = 1; }
  }
  // A gate: the great block over the doorway carved as its domain's face. The block is rock (drawn
  // already); here are its carvings, and what hangs from it.
  const carved = [];
  function drawGate(sec, cam, rimP, embers) {
    const T0 = trav(sec), D = T0.door; if (!D) return;
    const x0 = D.i0 * CELL, x1 = (D.i1 + 1) * CELL, yB = -(sec.h0 + 11) * CELL, yF = -(sec.h0 + 7) * CELL;
    if (x1 < cam.x - 80 || x0 > cam.x + W + 80 || yB < cam.y - 120 || yB > cam.y + H + 120) return;
    const T = put(x0, yB, 1, cam), F = put(x0, yF, 1, cam), solidP = new Path2D(), cut = new Path2D(), dom = sec.dom;
    if (dom === "gluttony") {
      // A mouth: the doorway is its gape. Teeth hang from the block, teeth stand up from the floor, and
      // above, two round eyes and the swell of its cheeks.
      for (let q = 0; q < 5; q++) addPoly(solidP, [[2 + q * 9.4, 0.5], [10 + q * 9.4, 0.5], [6 + q * 9.4, -9 - (q % 2) * 3]], T);
      for (let q = 0; q < 5; q++) addPoly(solidP, [[3 + q * 9.4, -0.5], [9.5 + q * 9.4, -0.5], [6.2 + q * 9.4, 6 + (q % 2) * 2]], F);
      addPoly(solidP, [[-4, 0], [0, 0], [0, 64], [-3, 50], [-6, 30], [-6.5, 12]], T); addPoly(solidP, [[48, 0], [52, 0], [54.5, 12], [54, 30], [51, 50], [48, 64]], T);   // the swollen cheeks
      addOval(cut, 13, 42, 5.5, 5.2, T, 12); addOval(cut, 35, 42, 5.5, 5.2, T, 12);
      addPoly(cut, [[4, 5], [44, 5], [42, 7.5], [24, 9], [6, 7.5]], T);
    } else if (dom === "wrath") {
      // A bull's head: the horns sweeping out and down from the block, a heavy brow, the nostrils
      // flared over the doorway; and the cracks of its hide, with the fire in them.
      addPoly(solidP, [[0, 58], [-9, 52], [-14, 40], [-12, 28], [-8, 22], [-7.5, 31], [-5, 42], [0, 47]], T);
      addPoly(solidP, [[48, 58], [57, 52], [62, 40], [60, 28], [56, 22], [55.5, 31], [53, 42], [48, 47]], T);
      addPoly(cut, [[8, 44], [20, 38], [19, 35], [9, 40]], T); addPoly(cut, [[40, 44], [28, 38], [29, 35], [39, 40]], T);
      addOval(cut, 17, 10, 3.2, 2.6, T, 10); addOval(cut, 31, 10, 3.2, 2.6, T, 10);
      addPoly(cut, [[10, 20], [38, 20], [36, 22], [12, 22]], T);
      embers.push([T(6, 56), T(12, 48), T(9, 40), T(15, 30)], [T(42, 58), T(37, 49), T(40, 41), T(34, 28)], [T(24, 62), T(22, 52), T(25, 46)]);
    } else if (dom === "avarice") {
      // A great purse: its body swelling down either side of the doorway, its neck gathered over it
      // by a drawstring knotted in front, and coins spilling from its mouth on the floor.
      addPoly(solidP, [[-2, 0], [2, 0], [1, 22], [-5, 40], [-9, 52], [-7, 60], [0, 64]], T); addPoly(solidP, [[46, 0], [50, 0], [55, 22], [57, 40], [55, 52], [50, 60], [48, 64]], T);
      addPoly(cut, [[6, 46], [42, 46], [40, 49], [24, 50.5], [8, 49]], T);                                   // the drawstring
      addOval(cut, 24, 48, 3.4, 2.8, T, 10); addPoly(cut, [[22.5, 46], [25.5, 46], [27, 38], [24, 36], [21, 38]], T);   // its knot, and the tie hanging
      for (let q = 0; q < 6; q++) addPoly(cut, [[8 + q * 6.5, 30], [10 + q * 6.5, 30], [11 + q * 6.5, 44], [9 + q * 6.5, 44]], T);   // the gathers of its neck
      for (let q = 0; q < 5; q++) addOval(solidP, 6 + q * 9.5, -1.6, 3.2, 1.6, F, 8);                        // coins on the floor
    } else if (dom === "lust") {
      // A veiled face: the veil falling from the brow over the block in long folds, two narrow eyes
      // above it, and briars hanging down either side of the doorway, to the floor.
      addPoly(cut, [[9, 40], [19, 43], [21, 41.5], [11, 38.5]], T); addPoly(cut, [[39, 40], [29, 43], [27, 41.5], [37, 38.5]], T);   // the eyes, long and narrow
      addPoly(cut, [[4, 34], [44, 34], [42, 31.5], [24, 30], [6, 31.5]], T);                               // the veil's hem across the face
      for (let q = 0; q < 4; q++) addPoly(cut, [[10 + q * 9.5, 29], [12 + q * 9.5, 29], [11.5 + q * 9.5, 8], [10.5 + q * 9.5, 8]], T);   // its folds
      for (const sd of [-1, 1]) {
        const x = sd < 0 ? -1.5 : 49.5;
        addPoly(solidP, [[x - 1.2, 0], [x + 1.2, 0], [x + 1.6 * sd, -20], [x + 0.2, -42], [x - 1.8, -42], [x - 0.6 * sd, -20]], T);   // the briar hanging
        for (let q = 0; q < 7; q++) { const v = -3 - q * 5.6, o = (q % 2 ? 1 : -1); addPoly(solidP, [[x, v - 1.2], [x + o * 5, v - 3.2], [x, v + 1.2]], T); }
      }
    } else {
      addPoly(cut, [[6, 8], [42, 8], [42, 56], [6, 56]], T);
    }
    ctx.fillStyle = C.ink; ctx.fill(solidP); rimP.addPath(solidP);
    // The carving on the block's face is in the rock, where the torch's rays do not go: it is laid on
    // after the dark, as bright as the torch is near (and can see the doorway under it).
    const [cx, cy] = [(x0 + x1) / 2, yB + 8], [lx, ly] = S.torch, k = clamp(1 - dist(lx, ly, cx, cy) / (lightR() * 0.95), 0, 1) * (los(lx, ly, cx, cy) ? 1 : 0);
    if (k > 0.02) carved.push({ path: cut, k, x: cx - cam.x, y: cy - cam.y });
  }
  // Briars along a rock face from (ax, ay) to (bx, by), pointing out along (nx, ny): a tangled
  // stem close along the rock, and thorns standing out from it, long and short.
  function briarStrip(P, ax, ay, bx, by, nx, ny, key) {
    const L = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / L, ty = (by - ay) / L, n = Math.max(2, Math.round(L / 4));
    // The stem, tangled: a thick band along the rock, humped here and there.
    P.moveTo(ax, ay);
    for (let q = 0; q <= n; q++) { const u = q / n, w = 2.6 + 1.8 * Math.sin(u * 9 + key) * Math.sin(u * 3.1 + key * 0.7); P.lineTo(lerp(ax, bx, u) + nx * w, lerp(ay, by, u) + ny * w); }
    P.lineTo(bx, by); P.closePath();
    // The thorns: every few pixels, leaning this way and that, some long.
    for (let q = 0; q < n; q++) {
      const u = (q + 0.5) / n, h = hash2(key, q, 77), len = 5 + 8 * h * h, lean = (hash2(key, q, 78) - 0.5) * 1.3, x = lerp(ax, bx, u), y = lerp(ay, by, u);
      const ox = nx + tx * lean, oy = ny + ty * lean, b = 2.1;
      P.moveTo(x - tx * b + nx * 2, y - ty * b + ny * 2); P.lineTo(x + ox * (len + 2), y + oy * (len + 2)); P.lineTo(x + tx * b + nx * 2, y + ty * b + ny * 2); P.closePath();
    }
  }
  function drawBriars(sec, cam, rimP, idols) {
    const V = slope(sec), P = new Path2D(), i0 = Math.max(V.lo, Math.floor(cam.x / CELL) - 1), i1 = Math.min(V.hi, Math.floor((cam.x + W) / CELL) + 1);
    const Y = (r) => -(sec.h0 + r) * CELL - cam.y;          // the top edge of row r
    let any = false;
    for (let i = i0; i <= i1; i++) {
      const x0 = i * CELL - cam.x, x1 = x0 + CELL, F = V.fl[i], top = Y(F - 1), k = sec.k * 1000 + i;
      if (V.tf[i] && top > -20 && top < H + 20) { briarStrip(P, x0, top, x1, top, 0, -1, k); any = true; }
      if (V.pl[i]) {
        const pt = Y(F + V.pl[i] - 1); if (pt > H + 20 || top < -20) continue;
        briarStrip(P, x0, pt, x1, pt, 0, -1, k + 7); any = true;
        if (!V.pl[i - 1]) briarStrip(P, x0, top, x0, pt, -1, 0, k + 3);
        if (!V.pl[i + 1]) briarStrip(P, x1, pt, x1, top, 1, 0, k + 5);
      }
      if (V.tr[i]) {
        const bot = Y(V.cl[i] - 1); if (bot < -20 || bot > H + 20) continue;
        briarStrip(P, x1, bot, x0, bot, 0, 1, k + 11); any = true;
        if (!V.tr[i - 1]) briarStrip(P, x0, bot, x0, Y(V.cl[i - 1] - 1), -1, 0, k + 13);
        if (!V.tr[i + 1]) briarStrip(P, x1, Y(V.cl[i + 1] - 1), x1, bot, 1, 0, k + 17);
      }
    }
    if (!any) return;
    ctx.fillStyle = C.ink; ctx.fill(P); rimP.addPath(P); idols.push({ path: P, dom: "lust" });
  }
  // A chain from its beam: links of iron, down to its end (or, if he hangs from it, to the hook).
  function drawChain(c, cam, rimP) {
    const held = S.rope && S.rope.chain === c, len = held ? S.rope.along : c.len, a = c.ang || 0;
    const x0 = c.x - cam.x, y0 = c.y - cam.y, x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
    if (Math.max(x0, x1) < -30 || Math.min(x0, x1) > W + 30 || y1 < -30 || y0 > H + 30) return;
    const P = new Path2D(); P.rect(x0 - 10, y0 - 7, 20, 6);                 // the beam
    const n = Math.max(2, Math.round(len / 5)), ux = (x1 - x0) / n, uy = (y1 - y0) / n;
    for (let q = 0; q < n; q++) { const cx = x0 + ux * (q + 0.5), cy = y0 + uy * (q + 0.5); P.moveTo(cx + (q % 2 ? 1.2 : 2.4), cy); P.ellipse(cx, cy, q % 2 ? 1.2 : 2.4, 3.2, a, 0, TAU); }
    ctx.strokeStyle = "#16161a"; ctx.lineWidth = 1.5; ctx.stroke(P); ctx.fillStyle = "#16161a"; ctx.fillRect(x0 - 10, y0 - 7, 20, 6); rimP.addPath(P);
    if (!held) { const g = new Path2D(); g.arc(x1, y1 + 2, 3, 0, TAU); ctx.fillStyle = "#16161a"; ctx.fill(g); rimP.addPath(g); }
  }
  // A coin: a little disc of gold, turning as it flies (sx: how much of its face shows).
  function drawCoin(x, y, sx, lit, a, r) {
    r = r || 4; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.6, Math.abs(sx) * r), r, 0, 0, TAU);
    ctx.fillStyle = lit ? SINS.avarice.color : "#2a2410"; ctx.fill();
    if (lit) { ctx.strokeStyle = SINS.avarice.dark; ctx.lineWidth = 0.8; ctx.stroke(); circle(x - sx * r * 0.3, y - r * 0.3, r * 0.3, "rgba(255,248,200,0.8)"); }
    ctx.globalAlpha = 1;
  }
  // A box for alms: a small chest of wood bound with iron, a slot in its lid and a cross on its face;
  // on a bracket from the rock, or standing on the floor.
  function drawAlms(b, cam, rimP) {
    const x = b.x - cam.x, y = b.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
    const P = new Path2D();
    if (b.hang) { P.rect(x - 1, y - 16, 2, 6); P.rect(x - 8, y - 11, 16, 2); }
    P.rect(x - 7, y - 10, 14, 10); P.rect(x - 8, y - 11.5, 16, 2.5);
    ctx.fillStyle = "#1c140c"; ctx.fill(P); rimP.addPath(P);
    const [lx, ly] = S.torch, lit = dist(lx, ly, b.x, b.y) < lightR() * 0.9;
    if (lit) { line(x - 2.5, y - 10.5, x + 2.5, y - 10.5, "#000", 1); line(x, y - 8, x, y - 2, "rgba(255,230,170,0.7)", 1.2); line(x - 2.5, y - 6, x + 2.5, y - 6, "rgba(255,230,170,0.7)", 1.2); }
  }
  // A thorn: a long dark spike, pointing the way it flies.
  function drawThorn(x, y, a, lit) {
    const c = Math.cos(a), sn = Math.sin(a), q = (u, v) => [x + c * u - sn * v, y + sn * u + c * v];
    poly([...q(8, 0), ...q(-5, 2), ...q(-8, 0.6), ...q(-8, -0.6), ...q(-5, -2)], lit ? "#2a0d1c" : "#0d0709");
    if (lit) { const [ax, ay] = q(7, 0), [bx, by] = q(-5, 1.4); line(ax, ay, bx, by, hexA(SINS.lust.color, 0.7), 0.8); }
  }
  // Lust's ribbon, from its hand to him: a long veil rippling as it draws him in.
  function drawRibbon(cam) {
    const P = S.pulled; if (!P || !P.f.p) return;
    const [x0, y0] = ribbonHand(P.f), [x1, y1] = middle(), n = 16;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x0 - cam.x, y0 - cam.y);
    for (let i = 1; i <= n; i++) { const u = i / n, w = Math.sin(u * PI) * 9 * Math.sin(S.rt * 9 + u * 8); ctx.lineTo(lerp(x0, x1, u) - cam.x, lerp(y0, y1, u) + w - Math.sin(u * PI) * 10 - cam.y); }
    ctx.strokeStyle = hexA(SINS.lust.dark, 0.85); ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = hexA(SINS.lust.color, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    glow(x1 - cam.x, y1 - cam.y, 18, SINS.lust.color, 0.25);
  }
  // A lamp: an iron stand with a bowl, cold until he passes, and then burning for good.
  function drawLamp(L, cam, lights, lit) {
    const x = L.x - cam.x, y = L.y - cam.y;
    if (x < -40 || x > W + 40 || y < -60 || y > H + 40) return;
    if (!lit) {
      ctx.strokeStyle = "#0a0a0c"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 21); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.stroke();
      poly([x - 5, y - 21, x + 5, y - 21, x + 3, y - 24.5, x - 3, y - 24.5], "#0a0a0c");
      if (L.lit) lights.push({ x, y: y - 26, r: 95, a: 0.8 });
      return;
    }
    if (!L.lit) return;
    const age = S.rt - (L.litT || 0), k = Math.min(1, age / 0.5);
    glow(x, y - 28, 46 * k, C.flame, 0.35); drawFlame(x, y - 24, 0.5 * k, S.rt + L.x * 0.01, {});
  }
  // A reliquary: a little gold house with a cross on it. Holy things are seen in the dark, a little.
  function drawRelic(R, cam, lit) {
    const x = R.x - cam.x, y = R.y - cam.y;
    if (R.got || x < -30 || x > W + 30 || y < -40 || y > H + 30) return;
    const b = 0.5 + 0.5 * Math.sin(S.rt * 2.4 + R.x);
    if (!lit) { poly([x - 6, y, x + 6, y, x + 6, y - 7, x, y - 11, x - 6, y - 7], "#0a0a0c"); return; }
    glow(x, y - 6, 26, C.gold, 0.18 + 0.12 * b);
    ctx.globalAlpha = 0.35 + 0.4 * b; line(x, y - 11, x, y - 17, C.gold, 1.2); line(x - 2.4, y - 15, x + 2.4, y - 15, C.gold, 1.2); ctx.globalAlpha = 1;
  }
  // Rock that will crumble: hairline cracks with a dull fire in them; each time it cracks under him,
  // a third more of them blaze, and run deeper.
  function crackLines(x0, x1, y0, s, stage) {
    const n = Math.max(3, Math.round((x1 - x0) / 18)), lit = Math.ceil(n * clamp(stage || 0, 0, 3) / 3);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass ? 0.95 : 0.22 + 0.08 * Math.sin(S.rt * 2 + s); ctx.strokeStyle = pass ? "#ffb070" : "#c8401c"; ctx.lineWidth = pass ? 1.3 : 0.9;
      ctx.beginPath();
      for (let q = 0; q < n; q++) {
        if (pass && q % n >= lit) continue;
        const cx = lerp(x0 + 6, x1 - 6, (q + 0.5) / n) + (hash2(s, q, 5) - 0.5) * 8, deep = pass ? 15 + 4 * (stage || 0) : 15;
        ctx.moveTo(cx, y0 + 0.5); ctx.lineTo(cx + (hash2(s, q, 6) - 0.5) * 6, y0 + deep * 0.33); ctx.lineTo(cx + (hash2(s, q, 7) - 0.5) * 9, y0 + deep * 0.66); ctx.lineTo(cx + (hash2(s, q, 8) - 0.5) * 6, y0 + deep);
      }
      ctx.stroke();
      if (!lit) break;
    }
    ctx.restore();
  }
  // A blob of fat: pale and glistening in the light, a black lump with a sickly glint in the dark;
  // stretched along its flight, and quivering.
  function drawFat(x, y, o, lit) {
    const r = o.r || 8, sp = Math.hypot(o.vx || 0, o.vy || 0), st = o.st === "fly" ? clamp(sp / 500, 0, 0.35) : 0, w = clamp(o.w || 0, -0.4, 0.4);
    const a = o.st === "fly" ? Math.atan2(o.vy, o.vx) : 0, rx = r * (1 + st + w * 0.5), ry = r * (1 - st * 0.6 - w * 0.4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = lit ? "#cdb47c" : C.ink; ctx.fill();
    if (lit) { ctx.beginPath(); ctx.ellipse(-rx * 0.15, ry * 0.25, rx * 0.8, ry * 0.55, 0, 0, TAU); ctx.fillStyle = "#a88a52"; ctx.fill(); ctx.beginPath(); ctx.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.35, ry * 0.22, -0.3, 0, TAU); ctx.fillStyle = "#fff4d0"; ctx.fill(); }
    ctx.restore();
    if (!lit) glow(x, y, r + 5, SINS.gluttony.color, 0.35);
  }
  // Slime: on slimy platforms and greased floors, a glistening skin and drips hanging off the edge;
  // on the slimed cliff of a cavern, runs of it down the face.
  function sheen(x0, x1, y, s, tl) {
    const pa = ctx.globalAlpha, ty = (x) => (tl || 0) * clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1), t = S.rt;
    // A thick skin of it on top, heaped in soft lumps that slowly heave.
    const n = Math.max(2, Math.round((x1 - x0) / 9)), top = [];
    for (let q = 0; q <= n; q++) { const x = lerp(x0 + 1, x1 - 1, q / n); top.push([x, y + ty(x) - (q === 0 || q === n ? 1.5 : 3.6 + 2.2 * hash2(s, q, 36) + 0.7 * Math.sin(t * 1.3 + q * 1.7 + s))]); }
    const crest = (dy) => { ctx.moveTo(top[0][0], top[0][1] + dy); for (let q = 1; q < top.length; q++) { const [px, py] = top[q - 1], [x, yy] = top[q]; ctx.quadraticCurveTo(px, py + dy, (px + x) / 2, (py + yy) / 2 + dy); } ctx.lineTo(top[n][0], top[n][1] + dy); };
    ctx.globalAlpha = pa * 0.96; ctx.beginPath(); crest(0); ctx.lineTo(x1 - 1, y + 2.5 + ty(x1)); ctx.lineTo(x0 + 1, y + 2.5 + ty(x0)); ctx.closePath(); ctx.fillStyle = "#9a8740"; ctx.fill();
    // its pale crest, wet, and spots on it catching the light
    ctx.globalAlpha = pa * 0.95; ctx.strokeStyle = "#f0e3a4"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); crest(0.7); ctx.stroke(); ctx.lineCap = "butt";
    for (let q = 0; q < Math.max(1, (x1 - x0) / 18); q++) { const k = 1 + Math.floor(hash2(s, q, 33) * (n - 1)), b = 0.5 + 0.5 * Math.sin(t * 2.3 + q * 2 + s); ctx.globalAlpha = pa * (0.45 + 0.55 * b); circle(top[k][0], top[k][1] + 1.6, 1.5, "#fffbe6"); }
    // and hanging off its edge, drips that swell and stretch, and fall
    for (let q = 0; q < Math.max(2, (x1 - x0) / 11); q++) {
      const dx = x0 + 4 + hash2(s, q, 31) * (x1 - x0 - 8), ph = (t * (0.3 + 0.3 * hash2(s, q, 34)) + hash2(s, q, 35)) % 1, l = 5 + hash2(s, q, 32) * 7 + ph * 8, w = 1.9 + ph * 1.1;
      ctx.globalAlpha = pa * 0.95 * (ph > 0.88 ? (1 - ph) / 0.12 : 1); ctx.beginPath(); ctx.ellipse(dx, y + 2 + l * 0.5 + ty(dx), w, l * 0.62, 0, 0, TAU); ctx.fillStyle = "#b29c55"; ctx.fill();
      ctx.globalAlpha *= 0.8; rect(dx - w * 0.45, y + 3 + ty(dx), 0.9, l * 0.7, "#efe2a6");
      if (ph > 0.88) { ctx.globalAlpha = pa * 0.9; circle(dx, y + 2 + l + (ph - 0.88) * 140 + ty(dx), 1.6, "#b29c55"); }
    }
    ctx.globalAlpha = pa;
  }
  // His prints in the fat: flat smears on the rock where he trod, glistening in the torchlight, fading.
  function drawPrints(cam) {
    ctx.save();
    for (const q of S.prints) {
      const a = q.a * clamp(1 - (S.rt - q.t) / 9, 0, 1), x = q.x - cam.x, y = q.y - cam.y;
      if (a <= 0.02 || x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = "#cdb47c"; ctx.beginPath(); ctx.ellipse(x + q.dir * 1.5, y - 0.4, 3.4, 1.1, 0, 0, TAU); ctx.ellipse(x - q.dir * 2.6, y - 0.4, 1.7, 0.9, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = a * 0.6; ctx.fillStyle = "#fff3cf"; ctx.beginPath(); ctx.ellipse(x + q.dir * 1, y - 0.9, 1.3, 0.35, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawSlime(cam, view) {
    for (let s = Math.floor(-(cam.y + H) / CELL / SLOT) - 1; s <= Math.floor(-cam.y / CELL / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl || !isl.slick || isl.st === "gone") continue;
      sheen(isl.x0 * CELL - cam.x, (isl.x1 + 1) * CELL - cam.x, -isl.h1 * CELL - cam.y, s, isl.tilt);
    }
    for (const sec of view) if (sec.type === "cave") {
      const V = cave(sec);
      for (const p of V.plats) if (p.slick) sheen(p.x0 * CELL - cam.x, (p.x1 + 1) * CELL - cam.x, -(sec.h0 + p.r1) * CELL - cam.y, sec.k * 31 + p.x0, p.tilt);
      const fx = (V.dir > 0 ? V.face * CELL : (V.face + 1) * CELL) - cam.x;
      if (fx > -20 && fx < W + 20) {
        ctx.globalAlpha = 0.45; ctx.strokeStyle = "#cdb47c"; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let r = 4; r < LH; r += 2) { const y = -(sec.h0 + r) * CELL - cam.y; if (y < -40 || y > H + 40) continue; const o = (hash2(sec.k, r, 41) - 0.3) * 3 * -V.dir; ctx.moveTo(fx + o, y); ctx.lineTo(fx + o + V.dir * -0.5, y + 22 + hash2(sec.k, r, 42) * 18); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    for (const g of S.grease) if (g.until > S.t) { const k = clamp((g.until - S.t) / 3, 0, 1); ctx.globalAlpha = k; sheen(g.i0 * CELL - cam.x, (g.i1 + 1) * CELL - cam.x, g.j * CELL - cam.y, g.i0 * 7 + g.j, 0); ctx.globalAlpha = 1; }
  }
  // Wrath's fire: a ball of it, roaring, its own light round it.
  function drawFire(x, y, s, ph) {
    glow(x, y, 40 * s, SINS.wrath.color, 0.5); glow(x, y, 18 * s, C.flame, 0.75);
    drawFlame(x, y + 6 * s, 0.85 * s, S.rt * 1.4 + ph, { vx: 0 });
    circle(x, y, 3.2 * s, C.flameHot);
  }
  let DDT = 1 / 60;                            // the time since the last picture was drawn
  function drawWorld() {
    const cam = S.cam, t = S.rt, F = S.flare, hM = metres(-S.y);
    DDT = S.dread || S.boonShow ? 0 : clamp(t - (S.lastDraw || t), 0, 0.05) || 1 / 60;
    const fdt = DDT * (F.on ? FLARE_SLOW : 1); S.lastDraw = t;
    tintStep(fdt);
    // The far mist set back, so the near rock stands out; and the domain's colour in it.
    const m = S.tint.m;
    drawBackdrop(600 + cam.x * 0.6, 300 + clamp(cam.y * 0.05, -70, 70), 1, t, { y0: 300, dim: "rgba(12,12,14,0.3)", tint: m[0] + m[1] + m[2] < 760 ? rgbs(m, 1) : null });
    const dawn = clamp(metres(S.top) / 1500, 0, 1);
    if (dawn > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(200,190,170," + (0.22 * dawn) + ")"); g.addColorStop(1, "rgba(200,190,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const P = rockPath(cam), view = sectionsIn(-(cam.y + H) / CELL - 4, -cam.y / CELL + 4), lights = [];
    const hTop = -(cam.y) / CELL + 4, hBot = -(cam.y + H) / CELL - 4;
    const vis = []; for (let n = 0; ; n++) { const w = wallAt(n); if (w.h > hTop) break; if (w.h >= hBot) vis.push(w); }
    for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
    // The shrines, on the floor of the place; then the demons, their colour showing where the torch
    // can see them (or their own fire).
    const rimP = new Path2D(), idols = [], embers = []; carved.length = 0;
    const [lx0, ly0] = S.torch, R0 = lightR();
    for (const f of S.demons) if (f.idol) drawShrine(f, cam, rimP, idols, lights);
    for (const f of S.demons) {
      if (f.idol || f.st === "legs") continue;
      const [cx, cy] = dMid(f); if (cx < cam.x - 80 || cx > cam.x + W + 80 || cy < cam.y - 100 || cy > cam.y + H + 100) continue;
      const kindled = f.sin === "wrath" && (f.st === "pickup" || f.st === "windup" || (f.st === "throw" && !f.thrown));
      f.lit += ((kindled || !!f.block || (dist(lx0, ly0, cx, cy) < R0 * 0.9 && los(lx0, ly0, cx, cy))) - f.lit) * 0.15;
      f.p = demonPose(f);
      const al = f.st === "dying" ? 1 - f.t / 0.8 : f.st === "emerge" ? Math.min(1, f.t / 0.5) : 1;
      f.dy = f.ground ? tiltDy(f.x, f.y) : 0;
      const sc = 1 + 0.1 * (f.size || 0), q = f.squash > 0 ? Math.sin(f.squash * PI) * 0.9 : 0, sx = Math.abs(Math.cos(f.squashA || 0)); ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y + f.dy);
      ctx.scale(sc * (1 + 0.24 * q * (1 - sx) - 0.16 * q * sx), sc * (1 + 0.24 * q * sx - 0.18 * q * (1 - sx)));
      drawDemon(f.sin, 0, 0, f.dir, f.p, { t: S.rt, lit: Math.max(f.lit, f.brokenT > 0 ? 1 : 0), hurt: f.hurtT / 0.25, windup: f.st === "windup" || f.st === "heave" ? Math.min(1, f.t / 0.55) : 0, alpha: al, broken: f.brokenT > 0, belly: f.size || 0, carry: f.sin === "avarice" ? clamp(1 + (f.loot || 0) * 14, 0, 3) : 0 });
      ctx.restore();
      // Gluttony heaving up its fat: the blob swelling in its mouth.
      if (f.st === "heave" || (f.st === "lob" && !f.thrown)) { const [ox, oy] = mouth(f), k = f.st === "heave" ? clamp(f.t / 0.75, 0, 1) : 1; f.fatAt = [ox - cam.x, oy - cam.y - 2, { r: (3 + 5 * k) * (1 + 0.18 * f.size), w: 0.2 * Math.sin(S.rt * 18), st: "held" }]; } else f.fatAt = null;
      if (kindled) { const k = f.st === "pickup" ? f.t / 0.7 : 1, q = demonJoint(f.sin, f.x, f.y, f.dir, f.p, "hF"); f.fireAt = [q[0] - cam.x, q[1] - cam.y - 4, 0.3 + 0.7 * k]; lights.push({ x: q[0] - cam.x, y: q[1] - cam.y, r: 60 + 50 * k, a: 0.8 }); } else f.fireAt = null;
    }
    for (const g of S.bigs) drawGreat(g, cam);
    for (const o of S.things) {
      if (o.st === "held") continue;
      if (o.kind === "fire") { lights.push({ x: o.x - cam.x, y: o.y - cam.y, r: 95, a: 0.85 }); continue; }
      const lit = dist(lx0, ly0, o.x, o.y) < R0 * 0.85 && los(lx0, ly0, o.x, o.y);
      if (o.kind === "fat") { drawFat(o.x - cam.x, o.y - cam.y, o, lit); continue; }
      if (o.kind === "coin") { drawCoin(o.x - cam.x, o.y - cam.y, o.st === "rest" ? 1 : Math.cos(o.age * 14), lit, o.st === "rest" ? clamp(o.life - o.age, 0, 1) : 1); continue; }
      if (o.kind === "thorn") { drawThorn(o.x - cam.x, o.y - cam.y, o.st === "stuck" ? o.rot + 0.06 * Math.sin(o.age * 40) * Math.max(0, 1 - o.age * 2) : Math.atan2(o.vy, o.vx), lit); continue; }
      if (o.shard) drawShard(o.x - cam.x, o.y - cam.y + (o.st === "rest" ? tiltDy(o.x, o.y + BR) + 3 : 0), o.rot, lit, o.shard, o.sid);
      else drawBoulder(o.x - cam.x, o.y - cam.y + (o.st === "rest" ? tiltDy(o.x, o.y + BR) : 0), o.rot, lit ? 1 : 0);
    }
    // The blocks lying about, or carried off (and the lay brothers at the gates, with their carts).
    drawBlocks(cam, rimP, lights);
    // The monk: on the rope, hung from his hand.
    const p = monkPose(); let mx = S.x, my = S.y;
    if (S.rope && !S.ground && !S.cling && !S.act) {
      const Q = pivotOf(S.rope), [gx, gy] = grip(), th = Math.atan2(Q.x - gx, gy - Q.y);
      if (!S.wall) p.spin = clamp(th, -1.3, 1.3) * S.dir * 0.85;
      const hd = monkJoint(S.x, S.y, S.dir, p, "hF"); mx += gx - hd[0]; my += gy - hd[1];
    }
    if (S.ground && !S.act && !(S.atk && S.atk.t < S.atk.dash)) my += tiltDy(S.x, S.y);
    if (S.crawl && !S.boonShow) mx -= S.dir * 10;        // (on his knees, his body laid out over the length of him)
    S.lastPose = p; S.drawX = mx; S.drawY = my;
    if (S.tied && S.tied.st !== "hand") drawTied(mx, my, p, cam, lights);
    if (S.ward && !S.boonShow) {
      // The ward: a light about him like a second habit, and a light in the dark round him. Near
      // its end it dims, and in its last moments it flickers. (Doubled: a second habit of light.)
      const b = (0.75 + 0.25 * Math.sin(S.rt * 4)) * wardFade(), k = scale * DPR, wx = mx - cam.x, wy = my - cam.y - HT / 2;
      glow(wx, wy, 64, C.warm, 0.22 * b);
      ctx.save(); ctx.shadowColor = "rgba(255,230,170," + b + ")"; ctx.shadowBlur = 20 * k;
      if ((S.ward.n || 1) > 1) for (const [ox, oy] of [[-4.5, 0], [4.5, 0], [0, -4.5], [0, 4.5]]) drawMonk(mx - cam.x + ox, my - cam.y + oy, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, tint: "rgba(255,222,140," + (0.45 * b) + ")" });
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) drawMonk(mx - cam.x + ox, my - cam.y + oy, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, tint: "rgba(255,246,222," + (0.9 * b) + ")" });
      ctx.restore();
      // (A light of its own about him, not the torch's: near as wide as a full torch's, to see his way
      // by; the torch burns as it burns, and the blessing does not keep it.)
      lights.push({ x: wx, y: wy, r: 200, a: 0.9 * wardFade() });
    }
    let r;
    if (S.boonShow) { r = drawMonkFront(mx - cam.x, my - cam.y, S.dir, S.boonShow.t); S.boonShow.up = r.up; }
    else r = drawMonk(mx - cam.x, my - cam.y, S.dir, p, { t: S.t, vx: S.vx, vy: S.vy, alpha: (F.on ? 0.8 : 1) * (S.flashT > 0 && Math.floor(S.rt * 24) % 2 ? 0.35 : 1) });
    if (r && r.torch) S.torch = [r.torch[0] + cam.x, r.torch[1] + cam.y];
    // The gold clinging to his habit, coin by coin.
    if (S.coins > 0) {
      const hp = monkJoint(mx, my, S.dir, p, "hip"), nk = monkJoint(mx, my, S.dir, p, "neck");
      for (let q = 0; q < S.coins; q++) { const u = 0.15 + 0.75 * hash2(q, 3, 5), w = (hash2(q, 4, 5) - 0.5) * 9; drawCoin(lerp(hp[0], nk[0], u) + w - cam.x, lerp(hp[1], nk[1], u) + 6 * (1 - u) - cam.y, 0.8, true, 1, 2.6); }
    }
    // Greased: his feet glistening with the fat he trod in, and dripping.
    if (S.greaseT > 0 && !S.latched) {
      const k = clamp(S.greaseT / 2, 0, 1);
      ctx.save(); ctx.globalAlpha *= k;
      for (const nm of ["fB", "fF"]) {
        const q = monkJoint(mx, my, S.dir, p, nm), x = q[0] - cam.x + S.dir * 1.5, y = q[1] - cam.y - 0.6, dl = 1.5 + 2.5 * (0.5 + 0.5 * Math.sin(S.rt * 2.3 + (nm === "fF" ? 0 : 2)));
        ctx.fillStyle = "#cdb47c"; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.3, 0, 0, TAU); ctx.ellipse(x + S.dir * 0.5, y + 1.6 + dl / 2, 0.9, dl / 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff3cf"; ctx.beginPath(); ctx.ellipse(x - S.dir * 1.2, y - 0.9, 1.4, 0.6, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    const hand = r && r.hand ? [r.hand[0] + cam.x, r.hand[1] + cam.y] : grip();
    S.handW = hand;
    if (S.tied && S.tied.st === "hand") drawHeld(S.tied, mx, my, p, hand, cam, lights);
    if (S.latched) drawLatch(S.latched, mx, my, cam);
    if (S.legsIn && !S.boonShow) drawLegsSac(mx, my, p, cam);
    if (S.held) {
      S.held.x = hand[0]; S.held.y = hand[1] - (S.held.kind === "fire" || S.held.kind === "thorn" ? 6 : S.held.kind === "coin" ? 4 : S.held.kind === "fat" ? 7 : 9);
      if (S.held.kind === "fire") lights.push({ x: S.held.x - cam.x, y: S.held.y - cam.y, r: 80, a: 0.8 });
      else if (S.held.kind === "fat") { S.held.wv = (S.held.wv || 0) + (-90 * (S.held.w || 0) - 7 * S.held.wv) * fdt; S.held.w = (S.held.w || 0) + S.held.wv * fdt; drawFat(S.held.x - cam.x, S.held.y - cam.y, S.held, true); }
      else if (S.held.kind === "coin") drawCoin(S.held.x - cam.x, S.held.y - cam.y, Math.cos(S.rt * 3), true, 1);
      else if (S.held.kind === "thorn") drawThorn(S.held.x - cam.x, S.held.y - cam.y, -PI / 2 + S.dir * 0.4, true);
      else if (S.held.shard) drawShard(S.held.x - cam.x, S.held.y - cam.y, S.rt * 0.5, true, S.held.shard, S.held.sid);
      else drawBoulder(S.held.x - cam.x, S.held.y - cam.y, 0, 1);
    }
    if (S.rope && S.rope.chain) {
      // From a chain: the rope from his hand to the chain's end (where the hook is), and the chain from there to its beam.
      const [px, py] = chainTip({ x: S.rope.x, y: S.rope.y, len: S.rope.along, ang: S.rope.chain.ang });
      S.rope.hx = px; S.rope.hy = py;
      hangRope(S.ropeVis, hand[0], hand[1], px, py, Math.max(freeOf(S.rope) - S.rope.along, 10), fdt);
      drawRope(S.ropeVis, 1.6);
    } else if (S.rope) {
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
    if (S.yank) drawYank(cam);
    // The rock, in front of him: its crags overlap him where he stands or clings against it.
    ctx.fillStyle = C.ink; ctx.fill(P);
    // In the rock: the gates; the lamps; the tablets.
    for (const sec of view) {
      if (sec.type === "slope") drawBriars(sec, cam, rimP, idols);
      for (const b of almsOf(sec)) drawAlms(b, cam, rimP);
      if (sec.type === "trav" && MINE[sec.dom]) for (const c of trav(sec).chains || []) drawChain(c, cam, rimP);
      if (sec.type === "trav" && sec.gate) drawGate(sec, cam, rimP, embers);
      for (const L of lampsOf(sec)) drawLamp(L, cam, lights, false);
      for (const R of relicsOf(sec)) drawRelic(R, cam, false);
    }
    for (const w of vis) drawTablet(w, cam, true);
    drawSlime(cam, view);
    if (S.prints.length) drawPrints(cam);
    if (S.rope && S.ropeVis.length > 1) { const B = bendsOf(S.rope), q = B.length ? B[0] : S.ropeVis[S.ropeVis.length - 2], hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy; drawHook(hx - cam.x, hy - cam.y, Math.atan2(S.rope.y - q.y, S.rope.x - q.x)); }
    if (S.shot && S.shotVis.length > 1) { const sh = S.shot, q = S.shotVis[S.shotVis.length - 2]; drawHook(sh.x - cam.x, sh.y - cam.y, Math.atan2(sh.y - q.y, sh.x - q.x)); }
    for (const q of S.parts) if (q.kind === "chip") { const z = q.big ? 4 : 2; rect(q.x - cam.x - z / 2, q.y - cam.y - z / 2, z, z, "#0b0b0d"); }
    // The dark, and what the torch can see of the rock around it (and into the niches).
    HOLES.clear();
    let [lx, ly] = S.torch;
    if (solidAt(lx, ly)) [lx, ly] = middle();
    const R = lightR();
    S.light = new Path2D();
    const vp = visPoly(lx, ly, R);
    S.light.moveTo(vp[0] - cam.x, vp[1] - cam.y); for (let k = 2; k < vp.length; k += 2) S.light.lineTo(vp[k] - cam.x, vp[k + 1] - cam.y); S.light.closePath();
    const tx = S.torch[0] - cam.x, ty = S.torch[1] - cam.y;
    darkness(cam, lx - cam.x, ly - cam.y, R, lights, rgbs(S.tint.d, 0.95));
    ctx.save(); ctx.clip(S.light);
    glow(tx, ty, R * 0.9, C.flame, 0.1);
    const rim = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.95);
    rim.addColorStop(0, "rgba(255,190,110,0.8)"); rim.addColorStop(0.5, "rgba(232,128,58,0.4)"); rim.addColorStop(1, "rgba(232,128,58,0)");
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke(P);
    ctx.lineWidth = 1; ctx.stroke(rimP);
    // In the mine, flecks of gold in the rock, catching the torch.
    for (const sec of view) if (MINE[sec.dom]) {
      const ia = Math.floor(cam.x / CELL), ib = Math.floor((cam.x + W) / CELL), ja = Math.floor(cam.y / CELL), jb = Math.floor((cam.y + H) / CELL);
      for (let j = Math.max(ja, -sec.h1); j <= Math.min(jb, -sec.h0); j++) for (let i = ia; i <= ib; i++) {
        if (hash2(i, j, 91) > 0.07 || !solid(i, j) || (solid(i - 1, j) && solid(i + 1, j) && solid(i, j - 1) && solid(i, j + 1))) continue;
        const x = (i + 0.2 + 0.6 * hash2(i, j, 92)) * CELL - cam.x, y = (j + 0.2 + 0.6 * hash2(i, j, 93)) * CELL - cam.y, k = 0.6 + 0.4 * Math.sin(t * 2 + i * 1.7 + j);
        if (dist(tx, ty, x, y) > R * 0.9) continue;
        ctx.globalAlpha = k * clamp(1 - dist(tx, ty, x, y) / (R * 0.9), 0, 1); rect(x - 1, y - 0.5, 2.5, 1.2, SINS.avarice.color); rect(x, y - 1.5, 0.8, 3, "#fff4b0"); ctx.globalAlpha = 1;
      }
    }
    // The idols show their colour in the light, as the demons do.
    for (const I of idols) {
      const c = SINS[I.dom] || SINS.wrath, gI = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.9), br = !I.idol;
      gI.addColorStop(0, hexA(c.color, br ? 0.8 : 0.55)); gI.addColorStop(0.6, hexA(c.dark, br ? 0.65 : 0.4)); gI.addColorStop(1, hexA(c.dark, br ? 0.15 : 0));
      ctx.fillStyle = gI; ctx.fill(I.path);
    }
    ctx.restore();
    for (const w of vis) drawTablet(w, cam, false);
    blockGlows(cam);
    if (S.bigs.length) greatGlows(cam);
    if (S.boon) boonGlows(cam);
    if (S.combo) drawCombo(cam);
    // What has a light of its own, or shows in the dark: the lamps, the reliquaries, the glow-worms
    // on a cavern's roof, the fire in Moloch's belly and in the cracks of Wrath's gates and rock.
    for (const sec of view) {
      for (const L of lampsOf(sec)) drawLamp(L, cam, lights, true);
      if (sec.type === "cave") {
        const V = cave(sec);
        for (const Rl of V.relics) drawRelic(Rl, cam, true);
        for (const wm of V.worms) {
          const x = wm.x - cam.x, y = wm.y - cam.y; if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
          const a = 0.28 + 0.22 * Math.sin(t * 1.3 + wm.ph); glow(x, y, 3.5, "#bfe8d8", a); rect(x - 0.5, y - 0.5, 1, 1, "rgba(220,255,240," + a + ")");
        }
      } else if (sec.crawl) for (const Rl of sec.crawl.relics) drawRelic(Rl, cam, true);
      if (sec.type === "trav" && sec.dom === "wrath") {
        // The pits of Wrath's crossings: embers far down in them.
        const T = trav(sec), yb = -(sec.h0 + 1) * CELL - cam.y;
        if (yb > -40 && yb < H + 60) for (let i = T.a; i <= T.b; i++) if (T.pit[i] && !T.pit[i - 1]) { let e = i; while (T.pit[e + 1]) e++; glowOval((i + e + 1) / 2 * CELL - cam.x, yb + 10, (e - i + 1) * CELL * 0.6, 18, SINS.wrath.color, 0.16 + 0.05 * Math.sin(t * 1.7 + i)); }
        for (const B of T.bridges) if (B.st !== "gone") crackLines(B.i0 * CELL - cam.x, (B.i1 + 1) * CELL - cam.x, -(sec.h0 + 7) * CELL - cam.y, sec.k * 13 + B.i0, B.stage);
      }
    }
    // Moloch's fires: in its belly, and in the pit before it.
    for (const f of S.demons) if (f.idol && f.sin === "wrath") {
      const K = IK * (f.big || 1), T0 = put(f.x - 33 * K, f.y, 1, cam), T = (u, v) => T0(u * K, v * K), [px, py] = [f.x + 21 * K - cam.x, f.y - 3 - cam.y];
      if (px < -40 || px > W + 40 || py < -60 || py > H + 40) continue;
      if (f.st === "idle") { const [ex, ey] = T(33.5, 9.5); glow(ex, ey, 7, SINS.wrath.color, 0.5 + 0.2 * Math.sin(t * 3 + f.id)); glow(ex, ey, 3, C.flame, 0.6); }
      glow(px, py, 16, SINS.wrath.color, 0.35 + 0.1 * Math.sin(t * 2.3 + f.id)); glow(px, py - 2, 6, C.flame, 0.5);
      if (Math.random() < 0.2) S.parts.push({ kind: "ember", x: f.x + 21 * K + (Math.random() - 0.5) * 8, y: f.y - 4, vx: (Math.random() - 0.5) * 16, vy: -20 - Math.random() * 30, life: 0.8, age: 0 });
    }
    for (const c of carved) {
      ctx.globalAlpha = c.k; ctx.fillStyle = "#2c2a28"; ctx.fill(c.path);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60); g.addColorStop(0, "rgba(255,190,110,0.7)"); g.addColorStop(1, "rgba(232,128,58,0.15)");
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke(c.path); ctx.globalAlpha = 1;
    }
    for (const e of embers) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 2.3 + e[0][0] * 0.1); ctx.strokeStyle = "#c8401c"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(e[0][0], e[0][1]); for (let q = 1; q < e.length; q++) ctx.lineTo(e[q][0], e[q][1]); ctx.stroke(); ctx.restore(); }
    for (let s = Math.floor(-(cam.y + H) / CELL / SLOT) - 1; s <= Math.floor(-cam.y / CELL / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl || !isl.crumble || isl.st === "gone") continue;
      crackLines(isl.x0 * CELL - cam.x, (isl.x1 + 1) * CELL - cam.x, -isl.h1 * CELL - cam.y, s, isl.stage);
    }
    for (const f of S.demons) {
      if (f.idol) { if (f.showHp > 0 && f.st === "idle") { const a = Math.min(1, f.showHp), y = f.y - f.ht - 10 - cam.y; for (let k = 0; k < f.maxHp; k++) circle(f.x - cam.x - (f.maxHp - 1) * 3.5 + k * 7, y, 2.2, k < Math.floor(f.hp + 1e-6) ? hexA(SINS[f.sin].color, a) : k < f.hp ? hexA(SINS[f.sin].color, a * 0.4) : "rgba(40,40,46," + a + ")"); } continue; }
      if (!f.p || f.st === "gone") continue;
      if (f.lit < 0.6 && f.st !== "dying") { const sc = 1 + 0.1 * (f.size || 0); ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y + (f.dy || 0)); ctx.scale(sc, sc); demonEyes(f.sin, 0, 0, f.dir, f.p, { t: S.rt, windup: f.st === "windup" || f.st === "inhale" || f.st === "heave" ? Math.min(1, f.t / 0.55) : 0, alpha: 1 - f.lit }); ctx.restore(); }
      if (f.fatAt) drawFat(f.fatAt[0], f.fatAt[1], f.fatAt[2], f.lit > 0.5);
      if (f.showHp > 0 && alive(f)) { const a = Math.min(1, f.showHp), y = f.y - f.ht - 10 - cam.y; for (let k = 0; k < f.maxHp; k++) circle(f.x - cam.x - (f.maxHp - 1) * 3.5 + k * 7, y, 2.2, k < Math.floor(f.hp + 1e-6) ? hexA(SINS[f.sin].color, a) : k < f.hp ? hexA(SINS[f.sin].color, a * 0.4) : "rgba(40,40,46," + a + ")"); }
      if (f.fireAt) drawFire(f.fireAt[0], f.fireAt[1], f.fireAt[2], f.id);
      if (f.loot && alive(f)) { const x = f.x - f.dir * 9 - cam.x, y = f.y - f.ht * 0.62 - cam.y; glow(x, y, 12 + f.loot * 60, C.flame, 0.35 + 0.1 * Math.sin(S.rt * 5)); }
    }
    // The fire: Wrath's, thrown; and in his hand, if he has caught it.
    for (const o of S.things) if (o.kind === "fire" && o.st === "fly") drawFire(o.x - cam.x, o.y - cam.y, o.by === "monk" ? 0.9 : 0.8 + 0.05 * Math.sin(o.age * 9), o.age * 3);
    if (S.held && S.held.kind === "fire") drawFire(S.held.x - cam.x, S.held.y - cam.y, 0.7, 0);
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
    if (S.ward) {
      // ...and over the dark: a ring of light turning slowly round him, a small cross on his breast,
      // and motes of light rising off him.
      const [cx, cy] = middle(), x = cx - cam.x, y = cy - cam.y, b = (0.75 + 0.25 * Math.sin(S.rt * 4)) * wardFade();
      glow(x, y, 56, C.warm, 0.22 * b); glow(x, y, 26, "#fff4dc", 0.2 * b);
      ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = "rgba(255,226,160,0.9)"; ctx.shadowBlur = 10 * scale * DPR; ctx.strokeStyle = "rgba(255,241,206," + (0.6 * b) + ")"; ctx.lineWidth = 1.8;
      for (let q = 0; q < 4; q++) { const a0 = S.rt * 1.3 + q * PI / 2; ctx.beginPath(); ctx.arc(x, y, 33, a0, a0 + 0.95); ctx.stroke(); }
      ctx.restore();
      lightCross(x + S.dir * 2, y - 3, 6, 0.55 * b, 1.6);
      if (Math.random() < 0.45) S.parts.push({ kind: "spark", c: C.warm, x: cx + (Math.random() - 0.5) * 40, y: cy + 18 - Math.random() * 34, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 30, life: 0.9, age: 0, real: true });
    }
    // What he has pointed at, ringed: warm if he can take it as it comes (standing, his hands free), grey if not.
    if (S.mark) {
      const o = S.mark;
      if (o.st !== "fly") S.mark = null;
      else { const ok = S.ground && !S.held && !S.cling && !S.hang, b = 0.6 + 0.4 * Math.sin(S.rt * 10); ctx.setLineDash([3, 3]); ring(o.x - cam.x, o.y - cam.y, (o.r || 10) + 7 + 2 * b, ok ? "rgba(255,241,196," + (0.55 + 0.4 * b) + ")" : "rgba(160,160,170,0.5)", 1.4); ctx.setLineDash([]); }
    }
    // A thrown stone keeps a faint glint of the sin that threw it, so its arc can be read in the dark.
    for (const o of S.things) if (o.st === "fly" && o.by === "demon" && o.kind !== "fire") glow(o.x - cam.x, o.y - cam.y, 9, o.kind === "thorn" ? SINS.lust.color : SINS.wrath.color, 0.45);
    drawRibbon(cam);
    for (const o of S.things) if (o.kind === "coin" && o.st === "fly") glow(o.x - cam.x, o.y - cam.y, 7, SINS.avarice.color, 0.5);
    for (const sec of view) {
      for (const b of almsOf(sec)) { const x = b.x - cam.x, y = b.y - cam.y - 5; if (x > -20 && x < W + 20 && y > -20 && y < H + 20) glow(x, y, 10, C.warm, S.coins > 0 ? 0.3 + 0.15 * Math.sin(t * 4) : 0.12); }
      const E = sec.type === "shaft" && eyeOf(sec);
      if (E && eyeShut()) {
        const x0 = E.i0 * CELL - cam.x, x1 = (E.i1 + 1) * CELL - cam.x, y0 = -E.h1 * CELL - cam.y, y1 = (1 - E.h0) * CELL - cam.y;
        if (y1 > -10 && y0 < H + 10) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3); rect(x0, y0, x1 - x0, y1 - y0, SINS.avarice.dark); for (let q = 1; q < 4; q++) line(x0 + (x1 - x0) * q / 4, y0, x0 + (x1 - x0) * q / 4, y1, SINS.avarice.color, 1); ctx.globalAlpha = 1; }
      }
    }

    // (Held up out of a great demon's mouth, the torch gutters as its light goes.)
    if (!S.dying || S.dying < 1.2) drawFlame(tx, ty, S.latched ? 0.45 + 0.5 * S.fuel : F.on ? 1.3 : boonOn("unconsumed") ? 1.25 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : S.latched ? clamp(1.1 - S.fuel, 0.35, 1) : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
    for (const q of S.parts) {
      const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
      if (q.kind === "ember") drawEmber(x, y, 1, a);
      else if (q.kind === "glob") { ctx.globalAlpha = a; circle(x, y, q.r, dist(S.torch[0], S.torch[1], q.x, q.y) < lightR() * 0.85 ? "#cdb47c" : "#1a1610"); ctx.globalAlpha = 1; }
      else if (q.kind === "spark") { glow(x, y, 6, q.c || C.gold, a * 0.8); circle(x, y, 1, q.c ? mix(q.c, "#ffffff", 0.5) : C.flameHot); }
      else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
      else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
      else if (q.kind === "impact") {
        // A blow landing: a white flash, a ring going out, and rays thrown the way of the blow.
        const k = q.age / q.life, z = 9 + 9 * q.s;
        if (k < 0.3) { glow(x, y, z * 2.2, "#fff6e0", 0.9 * (1 - k / 0.3)); circle(x, y, z * 0.55 * (1 - k), "#ffffff"); }
        ring(x, y, z * (0.6 + 1.6 * k), hexA(q.c, 0.8 * (1 - k)), 2.2 * (1 - k) + 0.6);
        ctx.lineCap = "round";
        for (let i = 0; i < 7; i++) { const an = q.a + (i - 3) * 0.42, r0 = z * (0.5 + k), r1 = r0 + z * (1.1 - 0.4 * Math.abs(i - 3) / 3) * (1 - k * 0.6); ctx.globalAlpha = 1 - k; line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, i === 3 ? "#ffffff" : q.c, i === 3 ? 2.4 : 1.5); }
        ctx.globalAlpha = 1; ctx.lineCap = "butt";
      }
      else if (q.kind === "coinfly") { if (!q.done) { if (q.light) { glow(x, y, 7, C.flame, 0.6); circle(x, y, 1.4, C.flameHot); } else { drawCoin(x, y, Math.cos(q.age * 20), true, 1, 3.4); glow(x, y, 6, SINS.avarice.color, 0.5); } } }
      else if (q.kind === "draft" && q.px !== undefined) { ctx.globalAlpha = 0.55 * a; line(q.px - cam.x, q.py - cam.y, x, y, "#e8d4b0", 1.2); ctx.globalAlpha = 1; }
    }
    if (F.on) {
      ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
      const [cx, cy] = middle();
      if (F.on) { ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.25)", 1.2); ctx.setLineDash([]); }
    }
    if (S.whiteT > 0) rect(0, 0, W, H, "rgba(255,246,226," + (S.whiteT * 1.4) + ")");
    hud(hM);
    if (S.dread) drawDread(cam);
    if (S.boonShow) drawBoonShow(cam);
  }
  // His block, lost (knocked loose, or stolen) and out of sight: a mark at the edge of the view the
  // way it lies, with its shape and how far it is (as the trackers of the great open-world games).
  // Gone to a cart, or tied on again, and the mark is gone.
  function lostMarker() {
    const b = S.lost;
    if (!b || S.tied === b || b.st === "bin" || b.st === "tobin" || !S.blocks.includes(b)) { S.lost = null; return; }
    const bx = b.x - S.cam.x, by = b.y - b.ht / 2 - S.cam.y;
    if (bx > -6 && bx < W + 6 && by > -6 && by < H + 6) return;
    const cx = W / 2, cy = H / 2, dx = bx - cx, dy = by - cy, x0 = 30, x1 = W - 30, y0 = 62, y1 = H - 34;
    const t = Math.min(dx > 0 ? (x1 - cx) / dx : dx < 0 ? (x0 - cx) / dx : 1e9, dy > 0 ? (y1 - cy) / dy : dy < 0 ? (y0 - cy) / dy : 1e9);
    const x = cx + dx * t, y = cy + dy * t, a = Math.atan2(dy, dx), c = SINS[b.dom] || SINS.wrath, pulse = 0.8 + 0.2 * Math.sin(S.rt * 4);
    glow(x, y, 22, c.color, 0.25 * pulse);
    circle(x, y, 14, "rgba(6,6,8,0.82)"); ring(x, y, 14, "rgba(232,196,106," + (0.7 * pulse) + ")", 1.2);
    const tip = [x + Math.cos(a) * 20, y + Math.sin(a) * 20], l = [x + Math.cos(a + 0.42) * 14.5, y + Math.sin(a + 0.42) * 14.5], r = [x + Math.cos(a - 0.42) * 14.5, y + Math.sin(a - 0.42) * 14.5];
    poly([tip[0], tip[1], l[0], l[1], r[0], r[1]], "rgba(232,196,106," + (0.85 * pulse) + ")");
    const z = 3.2, w = (b.w || 3) * z, h = (b.h || 2) * z;
    for (const [i, j] of b.cells) rect(x - w / 2 + i * z, y - h / 2 + j * z, z - 0.5, z - 0.5, c.color);
    text(metres(dist(S.x, S.y, b.x, b.y)) + " m", x, y + 25, { align: "center", size: 7, weight: 800, color: "rgba(233,230,223,0.85)", glow: "rgba(0,0,0,0.9)", blur: 4 });
  }
  // The thumb's cross: where it is, and which ways a thumb on it is pressing. (Left and right have
  // the wider share of it, so that rocking a swing does not climb by mistake.)
  const dpad = () => ({ x: 70, y: H - 72, r: 52 });
  function dpadDir(t) {
    const b = dpad(), dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy);
    if (d < 9) return [0, 0];
    return [Math.abs(dx) / d > 0.38 ? sign(dx) : 0, Math.abs(dy) / d > 0.55 ? sign(dy) : 0];
  }
  const actBtn = () => ({ x: W - 58, y: H - 64, r: 32 });
  const flareBtn = () => ({ x: W - 58, y: H - 150, r: 27 });
  // Which way to push to climb, when the wrong way would drop him: hanging from a ledge, toward
  // it; on the rock with bare hands, toward the rock.
  const climbWay = () => (S.hang ? S.hang.L.s : S.cling && !slickWall(S.cling) ? S.cling : 0);
  function sideArrow(x, y, s) {
    const b = 0.7 + 0.3 * Math.sin(S.rt * 5), o = s * 3 * Math.sin(S.rt * 5);
    glow(x, y, 18, C.flame, 0.25 * b);
    const arrow = (c, w) => { line(x - s * 10 + o, y, x + s * 8 + o, y, c, w); line(x + s * 8 + o, y, x + s * 1 + o, y - 7, c, w); line(x + s * 8 + o, y, x + s * 1 + o, y + 7, c, w); };
    ctx.lineCap = "round"; ctx.globalAlpha = 0.6 * b; arrow("#000", 5.5); ctx.globalAlpha = b; arrow(C.flameHot, 2.6); ctx.globalAlpha = 1; ctx.lineCap = "butt";
  }
  function hud(hM) {
    const F = S.flare, I = pads(), way = climbWay();
    text(hM + " m", 16, 30, { font: FONT.title, size: 20, weight: 700, color: "#fff", glow: "rgba(255,179,71,0.5)", blur: 10 });
    text(NOV ? "THE MOUNTAIN OF " + SINS[NOV.domain].name.toUpperCase() : "BEST " + Math.max(save.climbBest || 0, metres(S.top)) + " m", 16, 46, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)", max: 190 });
    if (S.coins > 0) { const y = S.relics ? 76 : 62; drawCoin(22, y - 3, 1, true, 1, 4.2); text("× " + S.coins + (S.coins >= 6 ? "  HEAVY" : ""), 30, y, { size: 8, weight: 700, color: S.coins >= 6 ? "#ffb070" : "rgba(232,196,106,0.85)" }); }
    if (S.relics) { glow(22, 60, 8, C.gold, 0.4); rect(18, 58, 8, 5, C.gold); poly([18, 58, 26, 58, 22, 55], C.gold); text("× " + S.relics, 30, 63, { size: 8, weight: 700, color: "rgba(232,196,106,0.85)" }); }
    if (S.binned) { const y = 62 + (S.relics ? 14 : 0) + (S.coins > 0 ? 14 : 0), c = SINS[NOV ? NOV.domain : "wrath"]; glow(22, y - 3, 8, c.color, 0.35); for (const [i, j] of SHAPES.T) rect(16 + i * 4, y - 6 + j * 4, 3.4, 3.4, c.color); text("× " + S.binned + " IN THE CARTS", 30, y, { size: 8, weight: 700, color: "rgba(233,230,223,0.7)" }); }
    if (S.say) {
      const a = clamp(S.say.t / 0.3, 0, 1) * clamp((3 - S.say.t) / 0.6, 0, 1);
      text(S.say.text, W / 2, 92, { align: "center", font: FONT.title, size: 16, weight: 700, spacing: 4, color: C.gold, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 8 });
      text(S.say.sub, W / 2, 108, { align: "center", size: 8.5, weight: 600, color: "#e9e6df", alpha: a * 0.85, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 40 });
    }
    if (S.boon) {
      const B = S.boon, left = clamp(1 - B.t / B.T, 0, 1), x = W / 2, y = 44, blink = B.T - B.t < 3 && Math.floor(S.rt * 6) % 2;
      ctx.globalAlpha = blink ? 0.4 : 1;
      drawToken(B.kind, x, y, 7, 1);
      ctx.beginPath(); ctx.arc(x, y, 10.5, -PI / 2, -PI / 2 + TAU * left); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.stroke();
      text(BOONS[B.kind].name, x, y + 22, { align: "center", size: 7, weight: 800, spacing: 2, color: C.gold, glow: "rgba(0,0,0,0.9)", blur: 4 });
      ctx.globalAlpha = 1;
    }
    if (S.kept && S.rt - S.kept.t < 2.6 && !F.on) text("THE PLACE IS KEPT", W / 2, 24, { align: "center", size: 8, weight: 800, spacing: 3, color: C.warm, alpha: clamp((2.6 - (S.rt - S.kept.t)) / 0.6, 0, 1) * clamp((S.rt - S.kept.t) / 0.2, 0, 1) * 0.85 });
    if (S.lost) lostMarker();
    pauseButton();
    if (!usingKeys()) {
      // The cross under the left thumb: faint, its arms lit as they are pressed; the arm that
      // climbs, when the other would let him fall, glowing.
      const b = dpad(), held = [...S.touches.values()].find((t) => t.dpad);
      circle(b.x, b.y, b.r, held ? "rgba(8,8,10,0.32)" : "rgba(8,8,10,0.22)");
      ring(b.x, b.y, b.r, "rgba(255,179,71,0.22)", 1.2);
      for (const [ax, ay, on] of [[-1, 0, I.l], [1, 0, I.r], [0, -1, I.u && !I.both], [0, 1, I.dn]]) {
        const cx = b.x + ax * b.r * 0.62, cy = b.y + ay * b.r * 0.62, px = -ay, py = ax;
        if (ax && ax === way && !on) { const k = 0.5 + 0.5 * Math.sin(S.rt * 5); glow(cx, cy, 24, C.flame, 0.35 * k); ring(cx, cy, 15 + 2 * k, "rgba(255,210,140," + (0.5 + 0.4 * k) + ")", 2); }
        if (on) glow(cx, cy, 20, C.flame, 0.3);
        poly([cx + ax * 9, cy + ay * 9, cx - ax * 5 + px * 9, cy - ay * 5 + py * 9, cx - ax * 5 - px * 9, cy - ay * 5 - py * 9], on ? "#fff3dc" : "rgba(233,230,223,0.42)");
      }
      if (held) circle(clamp(held.x, b.x - b.r, b.x + b.r), clamp(held.y, b.y - b.r, b.y + b.r), 7, "rgba(255,241,206,0.18)");
      if (S.climbing) text("CLIMBING", W / 2, H - 12, { align: "center", size: 8, weight: 800, spacing: 3, color: "rgba(255,241,196,0.7)" });
    }
    // The flare's button, its ring the meter; and the other button, saying what it will do now.
    const fb = usingKeys() ? { x: W - 40, y: 66, r: 16 } : flareBtn(), ready = S.meter >= 0.12;
    circle(fb.x, fb.y, fb.r, F.on ? "rgba(255,241,196,0.25)" : "rgba(8,8,10,0.45)");
    ring(fb.x, fb.y, fb.r, "rgba(233,230,223,0.15)", 1.2);
    ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r + 3, -PI / 2, -PI / 2 + TAU * S.meter); ctx.strokeStyle = F.on ? C.flameHot : ready ? C.flame : "rgba(255,179,71,0.35)"; ctx.lineWidth = 3; ctx.stroke();
    if (S.meterFlash > 0 && Math.floor(S.rt * 10) % 2) ring(fb.x, fb.y, fb.r + 6, "rgba(220,80,60,0.9)", 2);
    text(usingKeys() ? "SHIFT" : "FLARE", fb.x, fb.y + 3, { align: "center", size: usingKeys() ? 6.5 : 7.5, weight: 800, spacing: 1, color: ready || F.on ? "#fff3dc" : "#77736c" });
    if (!usingKeys()) {
      const f = actBtn(), lab = S.latched ? "STRIKE" : S.rope || S.hang ? "LET GO" : S.cling ? "LEAP" : S.held || (S.tied && S.tied.st === "hand") ? "DROP" : "";
      const on = [...S.touches.values()].some((t) => t.act);
      circle(f.x, f.y, f.r, on ? "rgba(255,179,71,0.22)" : "rgba(8,8,10,0.45)");
      ring(f.x, f.y, f.r, lab ? "rgba(255,179,71,0.55)" : "rgba(233,230,223,0.15)", 1.2);
      text(lab || "·", f.x, f.y + 3, { align: "center", size: 7.5, weight: 800, spacing: 1, color: lab ? "#fff3dc" : "#77736c" });
    }
    if (F.on) text("THE FLARE · TAP A DEMON, A BOULDER, OR ANYWHERE", W / 2, 24, { align: "center", size: 9, weight: 800, spacing: 2, color: C.flameHot, max: W - 140 });
    if (S.fightSeen && S.fightHintT < 12 && !F.on && !S.verseHold) {
      const a = clamp(S.fightHintT / 0.5, 0, 1) * clamp((12 - S.fightHintT) / 1.5, 0, 1);
      const L = ["A demon. Tap it: strike.  Swipe up: uppercut.  Down: slam.  Across: hurl.  Swing into it: a kick.", "Tap what is thrown at you: standing, you catch it as it comes. Tap again: fling it.  Swing into it: kick it back.  " + (usingKeys() ? "Hold on a demon (or yourself): the sign of the cross." : "Hold on a demon: the sign of the cross.  Two fingers at once: bless yourself.")];
      let y = S.say ? 134 : 112; for (const l of L) y += 12 * textLines(l, W / 2, y, W - 120, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, lh: 12 }) + 3;
    }
    if (S.verse && S.verseHold) {
      // Stopped to read it: the verse large over the dimmed climb, its letter over it.
      const v = S.verse, a = clamp(v.t / 0.4, 0, 1);
      rect(0, 0, W, H, "rgba(4,4,6," + (0.6 * a) + ")");
      const ls = wrap(v.v[3], Math.min(W - 110, 540), "italic 500 18px " + FONT.line), lh = 23, y0 = H / 2 - (ls.length * lh) / 2 - 6;
      text(v.v[0], W / 2, y0 - 22, { align: "center", font: FONT.title, size: 28, weight: 700, color: C.gold, alpha: a, glow: "rgba(255,179,71,0.6)", blur: 14 });
      ls.forEach((l, i) => text(l, W / 2, y0 + 16 + i * lh, { align: "center", font: FONT.line, italic: true, size: 18, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 40 }));
      text(v.v[1] + " · " + (v.ps || "PSALM 118") + ":" + v.v[2], W / 2, y0 + 16 + ls.length * lh + 4, { align: "center", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.75)", alpha: a });
      text(usingKeys() ? "CLICK, OR PRESS A KEY, TO GO ON" : "TAP ANYWHERE TO GO ON", W / 2, H - 22, { align: "center", size: 8.5, weight: 800, spacing: 3, color: "rgba(255,241,196," + (0.5 + 0.35 * Math.sin(performance.now() / 380)).toFixed(3) + ")", alpha: a });
    } else if (S.verse) {
      const v = S.verse, a = clamp(v.t / 0.5, 0, 1) * clamp((7 - v.t) / 1, 0, 1), y = 64;
      const ls = wrap(v.v[3], Math.min(W - 220, 460), "italic 500 14px " + FONT.line);
      ls.forEach((l, i) => text(l, W / 2, y + i * 17, { align: "center", font: FONT.line, italic: true, size: 14, weight: 500, color: C.warm, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }));
      text(v.v[0] + "  " + v.v[1] + " · " + (v.ps || "PSALM 118") + ":" + v.v[2], W / 2, y + ls.length * 17 + 4, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.7)", alpha: a });
    }
    if ((S.hintT < 16 || S.hooked < 2) && !(S.fightSeen && S.fightHintT < 12) && !S.verseHold) {
      const a = clamp(S.hintT / 0.6, 0, 1) * (S.hooked >= 2 ? clamp((16 - S.hintT) / 1.5, 0, 1) : 1);
      const L = usingKeys()
        ? ["Click the rock: he throws the hook there. Swinging, click to one side: he flips, then hooks up that way.", "← → rock the swing to build it. Hold toward a wall: he climbs it.  W: climb the rope.  Space: let go.", "Shift: the flare (the ring is what is left). Then click anywhere near: appear there."]
        : ["Tap the rock above him: he throws the hook there. Swinging, tap to one side: he flips, then hooks up that way.", "◀ ▶ rock the swing to build it.  ▲ climb the rope, ▼ let it out.  Toward a wall: he climbs it.", "FLARE: time slows (the ring is what is left). Tap anywhere near: appear there."];
      // From the foot of the screen up, each over as many lines as it needs (on touch, between the cross and the buttons).
      let y = H - 14; for (const l of L.slice().reverse()) y -= 12 * textLines(l, W / 2 + (usingKeys() ? 0 : 14), y, usingKeys() ? W - 100 : W - 250, { align: "center", size: 9, weight: 600, color: "#e9e6df", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6, lh: 12, up: true }) + 3;
    }
    // Hanging from a ledge, or on the rock with bare hands: an arrow showing which way to push
    // to climb. (The other way, he lets go.)
    if (S.hang) {
      const L = S.hang.L;
      sideArrow(L.edge + L.s * 10 - S.cam.x, L.top - 14 - S.cam.y, L.s);
      if (S.hangs <= 4) {
        const [go, off] = usingKeys() ? (L.s > 0 ? ["→", "←"] : ["←", "→"]) : (L.s > 0 ? ["▶", "◀"] : ["◀", "▶"]);
        text(go + "  CLIMB UP        " + off + "  LET GO", W / 2, H - 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.warm, alpha: 0.85 });
      }
    } else if (way && I.d !== way) sideArrow(S.x - way * 6 - S.cam.x, S.y - HT - 30 - S.cam.y, way);
    if (S.pulled && S.pulls <= 3) text(usingKeys() ? "ITS RIBBON DRAWS HIM IN: CLICK IT TO STRIKE, OR SWING INTO IT" : "ITS RIBBON DRAWS HIM IN: TAP IT TO STRIKE, OR SWING INTO IT", W / 2, H - 40, { align: "center", size: 8, weight: 800, spacing: 2, color: SINS.lust.light, alpha: 0.9, max: W - 260 });
    if (S.fuel < 0.25 && !S.dying) text("THE TORCH IS GUTTERING: FIND A VERSE", W / 2, H - 24, { align: "center", size: 8, weight: 800, spacing: 2, color: C.ember, alpha: 0.6 + 0.4 * Math.sin(S.rt * 6) });
  }

  // ---- The record, for notes to Claude ---------------------------------------------------------------
  // The last half-minute of the climb, four times a second (where he was, what he was doing, the
  // demons near him and what they were doing), and the last things that happened (blows given and
  // taken, the ward, the blocks, the verses). A note sent from the pause screen carries it, so what
  // went wrong can be seen, not only remembered.
  const REC_N = 120, EV_N = 80;
  let REC = { snaps: [], events: [], next: 0 };
  function ev(what, o) { if (!S) return; REC.events.push(Object.assign({ t: Math.round(S.rt * 100) / 100, what }, o || {})); if (REC.events.length > EV_N) REC.events.shift(); }
  const r2 = (v) => Math.round(v * 100) / 100;
  function doing() {
    return S.dying ? "dying" : S.latched ? "held in a great demon's jaws" : S.act ? S.act.kind : S.atk ? "striking (" + S.atk.kind + ")" : S.hang ? "hanging from a ledge" : S.cling ? "on the rock" : S.rope ? (S.ground ? "standing, hooked" : S.climbing ? "climbing the rope" : "swinging") : S.flip ? "flipping" : S.ground ? (Math.abs(S.vx) > 5 ? "walking" : "standing") : "in the air";
  }
  function snapNow() {
    const I = pads(), near = [], things = [];
    for (const f of S.demons) { if (f.st === "gone" || dist(f.x, f.y, S.x, S.y) > 600) continue; near.push({ sin: f.sin, idol: f.idol ? true : undefined, st: f.st, hp: r2(f.hp), dx: Math.round(f.x - S.x), dy: Math.round(f.y - S.y), block: f.block ? f.block.shape : undefined }); if (near.length >= 6) break; }
    for (const o of S.things) { if (o.st === "gone" || dist(o.x, o.y, S.x, S.y) > 500) continue; things.push({ kind: o.kind, st: o.st, by: o.by || undefined, dx: Math.round(o.x - S.x), dy: Math.round(o.y - S.y) }); if (things.length >= 6) break; }
    const great = S.bigs.filter((g) => dist(g.x, g.y, S.x, S.y) < 900).slice(0, 3).map((g) => ({ tier: g.tier, st: g.st, hp: g.hp, wake: r2(g.wake), stun: r2(g.stunT), dx: Math.round(g.x - S.x), dy: Math.round(g.y - S.y), blows: g.st === "latch" ? g.blows + "/" + g.need : undefined }));
    return { t: r2(S.rt), m: metres(-S.y), x: Math.round(S.x), y: Math.round(S.y), vx: Math.round(S.vx), vy: Math.round(S.vy), doing: doing(), dir: S.dir, pads: (I.l ? "L" : "") + (I.r ? "R" : "") + (I.u ? "U" : "") + (I.dn ? "D" : ""),
      ward: S.ward ? Math.round(WARD_T - S.ward.t) : 0, torch: r2(S.fuel), flare: r2(S.meter), coins: S.coins || 0, block: S.tied ? S.tied.shape + (S.tied.st === "hand" ? " (in hand)" : S.tied.flung ? " (thrown)" : "") : null, rope: S.rope ? Math.round(freeOf(S.rope)) : null, demons: near, great: great.length ? great : undefined, things };
  }
  function record() {
    const sec = sectionAt(Math.max(1, Math.floor(-S.y / CELL)));
    return { mode: NOV ? "seven mountains" : "endless climb", mountain: NOV ? NOV.domain : sec.dom, section: { k: sec.k, type: sec.type, dom: sec.dom, gate: !!sec.gate }, seed,
      now: snapNow(), recent: REC.snaps.slice(), events: REC.events.slice(), blocks: S.blocks.map((b) => ({ shape: b.shape, st: b.st })), binned: S.binned, best: metres(S.top),
      faults: typeof FAULTS !== "undefined" ? FAULTS.slice() : [] };
  }
  // A picture of the moment (taken as the pause begins, before the pause screen is drawn over it).
  function grabScreen() {
    try { const k = Math.min(1, 1280 / cv.width), c = document.createElement("canvas"); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k); c.getContext("2d").drawImage(cv, 0, 0, c.width, c.height); return c; } catch (e) { return null; }
  }
  // ---- Touch, mouse and keys ------------------------------------------------------------------------
  // Going on after a verse: the climb moves again (its last words fading), with nothing held over.
  function goOn() { if (S.freedPend) freedSay(); S.verseHold = false; if (S.verse) S.verse.t = Math.max(S.verse.t, 5.6); S.touches.clear(); Sound.muffle(false, 0.3); }
  const inDpad = (p) => { const b = dpad(); return !usingKeys() && dist(p.x, p.y, b.x, b.y) < b.r + 18; };
  const pid = (ev) => (ev && ev.pointerId !== undefined ? ev.pointerId : "m");
  const M = {
    action, start, scene, edges, solid, island, sectionAt, trav, cave, slope, thornAt, eyeOf, almsOf, ledge, get S() { return S; }, get nov() { return NOV; }, CELL, COLS, HOOK, TH, DOMAINS, BUILT,
    blocks: { newBlock, reveal, tie, loosen, carryOff, brotherOf, yank, hitMonk, hurtDemon, takeUp, throwBlock, TETHER, SHAPES, THROW_LEN },
    great: { placeGreat, strikeGreat, latch, punchOut, hurl, bigAt, burstAfter, burstSpot, startDread, onView, GREAT_V, GRASP },
    keptPlace: (dom) => keptAll()[dom] || null, forgetPlace: forget,
    boons: { BOONS, BOON_ORDER, boonOf, showBoon, grantBoon, VADE_R }, crawl: crawlOf, relicsOf, lightR: () => lightR(), combo: (m, f) => comboHit(m, f), swallowLegs: (f) => swallowLegs(f),
    wall: (n) => { const w = wallAt(n); return { w, pos: wallPos(w) }; }, record, pauseShot: null, pauseRec: null,
    step, draw,
    down(p, ev) {
      if (!S || S.dying) return;
      if (S.verseHold) { goOn(); return; }
      if (S.dread || S.boonShow) return;
      const id = pid(ev);
      if (inDpad(p)) { S.touches.set(id, { pad: 0, dpad: true, x: p.x, y: p.y, born: performance.now() }); return; }
      // Held in a great demon's jaws: every tap (but on the thumb's cross) is a blow from inside it.
      if (S.latched) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); punchOut(); return; }
      if (S.legsIn && dist(p.x + S.cam.x, p.y + S.cam.y, S.x, S.y - 8) < 46) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); kickLegs(); return; }
      const ab = actBtn(); if (!usingKeys() && dist(p.x, p.y, ab.x, ab.y) < ab.r + 10) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); action(); return; }
      const fb = flareBtn(); if (!usingKeys() && dist(p.x, p.y, fb.x, fb.y) < fb.r + 10) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); if (S.flare.on) endFlare(); else startFlare(); return; }
      const wx = p.x + S.cam.x, wy = p.y + S.cam.y, t = { pad: 0, born: performance.now() };
      S.touches.set(id, t);
      // Two fingers down on the play together: he signs himself (the ward). The first finger's
      // throw, if it is still in the air, is called back; neither finger's tap or swipe counts.
      const other = [...S.touches.entries()].find(([k, u]) => k !== id && !u.dpad && !u.act);
      if (!usingKeys() && other && !other[1].two && t.born - other[1].born < 260) {
        t.two = other[1].two = true; if (other[1].g) other[1].g.done = true;
        if (S.shot && S.shot.ph === "fly" && S.shot.t < 0.3) S.shot = null;
        S.pend = null;
        ward();                // (signed again while warded: the ward made new, and another coin shaken off)
        return;
      }
      if (S.act) return;
      // The block: in his hands, a tap throws it there (at a demon, great or not, straight at it; but a
      // demon close by, he swings it into it, still in his hands). On
      // its rope near him, tapped: he takes it up. A great demon tapped: only a block can hurt it;
      // with the block near him on its rope, he takes it up and throws it at once.
      const B = S.tied, gB = bigAt(wx, wy);
      if (B && !S.atk && B.st === "hand") {
        const f = gB ? null : demonAt(wx, wy), [ax, ay] = gB ? [gB.x, gB.y - gB.ht / 2] : f ? dMid(f) : [wx, wy];
        if (S.ground && ((gB && closeBy(gB, 30)) || (f && alive(f) && !f.idol && besides(f)))) { swingBlock(f, gB); return; }
        throwBlock(ax, ay); return;
      }
      if (gB) {
        if (B && !S.atk && takeUp()) throwBlock(gB.x, gB.y - gB.ht / 2);
        else { Sound.fx.tick(420, 0.3); if (!S.say) S.say = { text: "ONLY A BLOCK CAN HURT IT", sub: B ? "Go up to the block on your rope, then tap the demon." : "Throw down an idol for its block.", t: 0 }; }
        return;
      }
      if (B && !S.atk && B.st === "tied" && !B.flung && dist(wx, wy, B.x, B.y - B.ht / 2) < Math.max(26, B.hw + 14)) { if (!takeUp()) Sound.fx.tick(420, 0.3); return; }
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
      // Swinging, a tap on fresh rock: he lets go, flips over, and hooks it as he comes round.
      // (On a touch screen, a tenth of a second late: if a second finger follows, it was the
      // sign of the cross over himself, and he keeps hold of the rope.)
      if (S.rope && !S.ground) { if (usingKeys()) swapHook(wx, wy, tapSide(wx)); else S.pend = { wx, wy, side: tapSide(wx), t: 0.1 }; return; }
      if (S.next) { S.next.side = tapSide(wx); return; }
      throwHook(wx, wy);
    },
    move(p, ev) {
      if (!S) return;
      const t = S.touches.get(pid(ev));
      if (t && t.dpad) { t.x = p.x; t.y = p.y; }
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
    // No finger left on the glass (or the page put away): let go of whatever is still held, the
    // pad above all. The browser does not always say when a finger lifts (a swipe it took for
    // itself, a finger slid off the edge), and a pad held down for ever walks him off a cliff.
    allUp(at, keysToo) {
      if (!S) return;
      for (const [id, t] of S.touches) if (!(t.born > at)) S.touches.delete(id);
      if (keysToo) S.keys = {};
    },
    key(code, down, e) {
      if (!S) return;
      S.keys[code] = down;
      if (S.verseHold) { if (down) goOn(); return; }
      if (!down) return;
      if ((S.dread || S.boonShow) && code !== "Escape" && code !== "KeyP") return;
      if (code === "Escape" || code === "KeyP") M.pause();
      else if (S.latched) { if (!(e && e.repeat)) punchOut(); }          // (in its jaws: any key, a blow)
      else if (code === "Space") action();
      else if (code === "ShiftLeft" || code === "ShiftRight") { if (S.flare.on) endFlare(); else startFlare(); }
    },
    pause() {
      if (mode !== M || S.dying) return;
      M.pauseShot = grabScreen(); try { M.pauseRec = record(); } catch (e) { fault(e); M.pauseRec = { faults: FAULTS.slice() }; }
      Pause.t = 0; mode = ClimbPause; Sound.muffle(true, 0.2);
    },
    resume() {
      mode = M; Sound.muffle(false, 0.2);
      S.touches.clear(); S.keys = {};
    },
    over() {
      const m = metres(S.top), rows = [["Height reached", m + " m"], ["Verses read", S.read], ["Demons cast out", S.cast]];
      if (S.relics) rows.push(["Relics found", S.relics]);
      if (!NOV) rows.push(["Your best", (save.climbBest || m) + " m"]);
      return rows;
    },
  };
  return M;
})();

// The pause for the climb.
const ClimbPause = {
  step(dt) { Pause.t += dt; },
  draw() {
    try { Climb.draw(); } catch (e) { fault(e); }     // (the pause must come up even if the mountain cannot be drawn)
    rect(0, 0, W, H, "rgba(3,3,5,0.82)");
    const cx = Math.min(W * 0.26, 170), bw = 200;
    text("PAUSED", cx, 46, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    let y = 66;
    const b = (label, act, o) => { button(label, cx - bw / 2, y, bw, 30, act, o || {}); y += 38; };
    b("GO ON", () => Climb.resume(), { hot: true });
    const room = Climb.nov && Climb.nov.room && typeof Room !== "undefined";
    b("BEGIN AGAIN", () => { Sound.muffle(false); Game.again(true); }, room ? { sub: "The same scene, from its start" } : Climb.nov ? { sub: "From the foot of the mountain" } : {});
    if (room) b("THE WHITE ROOM", () => Room.open(), { sub: "Say another scene" });
    else b(Climb.nov ? "THE SEVEN MOUNTAINS" : "TO THE SEVEN MOUNTAINS", () => Game.toNovitiate());
    b(soundLabel(), cycleSound);
    b("BACK TO THE TITLE", () => Game.toTitle());
    if (typeof Verses !== "undefined") b("THE VERSES", () => Verses.open(), { sub: Verses.custom ? "Your own, from a file" : "Douay-Rheims, or your own" });
    if (typeof Notes !== "undefined" && Notes.ready) b("A NOTE FOR CLAUDE", () => Notes.open(Climb.pauseShot, Climb.pauseRec), { sub: "What happened; what should change" });
    const mx = Math.max(cx + bw / 2 + 24, W * 0.42);
    const mv = usingKeys()
      ? [["CLICK THE ROCK", "He throws the hook there, however far (a long throw reels him up); swinging, to one side of him: he flips, then hooks up that way"], ["W, OR BOTH ARROWS", "Climb the rope or the rock; at a ledge, again to pull up"], ["S OR \u2193", "Let the rope out, climb down; on the ground, crawl (into a way too low to stand in, he crawls by himself)"], ["← →  OR  A D", "Rock the swing to build it (swing into what is thrown: kick it back); walk; toward a wall: climb it (not mid-flip)"], ["SPACE", "Let go, leap off a wall, drop what he holds"], ["CLICK A DEMON IN THE LIGHT", "Zip and strike; drag up / down / across: uppercut, slam, hurl; land on it: stomp"], ["CLICK WHAT IS THROWN, THEN CLICK", "Standing, he catches it as it comes; then he flings it (near a demon: strikes with it)"], ["HOLD THE CLICK ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward, free, for 45 s: it turns one blow that reaches him"], ["SHIFT", "The flare: time slows; click anywhere: appear there. Fills slowly, faster as you fight"]]
      : [["TAP THE ROCK", "He throws the hook there, however far (a long throw reels him up); swinging, to one side of him: he flips, then hooks up that way"], ["▲  ▼", "Climb the rope or the rock (at a ledge, again to pull up); let out the rope, climb down; on the ground, ▼ crawls (into a way too low to stand in, he crawls by himself)"], ["◀  ▶", "Rock the swing to build it (swing into what is thrown: kick it back); walk; toward a wall: climb it (not mid-flip)"], ["THE CORNER BUTTON", "Let go, leap off a wall, drop what he holds"], ["TAP A DEMON IN THE LIGHT", "Zip and strike; swipe up / down / across: uppercut, slam, hurl; land on it: stomp"], ["TAP WHAT IS THROWN, THEN TAP", "Standing, he catches it as it comes; then he flings it (near a demon: strikes with it)"], ["HOLD STILL ON A DEMON / TWO FINGERS", "The sign of the cross: drives it back (costs flare) / over himself, a ward, free, for 45 s: it turns one blow that reaches him"], ["FLARE", "Time slows; tap anywhere: appear there; tap what is thrown: take it. Fills slowly, faster as you fight"]];
    // (In the seven mountains: the block, and the great demons.)
    if (Climb.nov) mv.push(usingKeys() ? ["CLICK THE BLOCK ON ITS ROPE, THEN CLICK", "He takes it up, then throws it, its rope paying out. A great demon: only the block swung into it as you swing on the rope hurts it (thrown, it only drives it back)"] : ["TAP THE BLOCK ON ITS ROPE, THEN TAP", "He takes it up, then throws it, its rope paying out. A great demon: only the block swung into it as you swing on the rope hurts it (thrown, it only drives it back)"],
      [usingKeys() ? "IN A GREAT DEMON'S JAWS: CLICK, CLICK" : "IN A GREAT DEMON'S JAWS: TAP, TAP", "Strike your way out of it (any key will do). The longer it holds you, the faster the torch goes. On the rope it cannot take you in: it strikes you off (swinging hard, unharmed)"]);
    // Each move over as many lines as it needs; as large as lets them all fit.
    const cw = W - mx - 16;
    let z = 8.5; const lines = (sz) => mv.reduce((n, [, what]) => n + 1 + wrap(what, cw, "500 " + sz + "px " + FONT.ui).length, 0);
    while (z > 6.5 && lines(z) * (z + 2) + mv.length * 5 > H - 70) z -= 0.5;
    text("THE MOVES", mx, 40, { size: 9, weight: 800, spacing: 3, color: C.flame });
    let yy = 58;
    for (const [k, what] of mv) {
      text(k, mx, yy, { size: z, weight: 800, spacing: 1, color: "#f1ede4", max: cw });
      yy += (z + 2) * (1 + textLines(what, mx, yy + z + 2, cw, { size: z, weight: 500, color: "#b9b3a6", lh: z + 2 })) + 5;
    }
  },
  key(code, down) { if (down && (code === "Escape" || code === "KeyP" || code === "Enter")) Climb.resume(); },
};
