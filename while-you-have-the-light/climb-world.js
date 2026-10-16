"use strict";
// While You Have the Light, the climb (1 of 7): its constants, the domains, and the mountain made by
// rules as he climbs (shafts, crossings, Lust's briars, Gluttony's caverns, Avarice's needle's eye,
// the low ways); his body against the rock, and the ledges. The climb's files share their names: all
// load before climb.js, which makes Climb from them.


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


const CELL = 16, MID = 165, MPX = 27;
let COLS = 330;                                  // (wider for a whole mountain of rooms)   // a cell; the world's width in cells, and its middle; pixels to a metre
const GRAV = 760, VMAX = 900, WALK = 70, AIR = 110;
const PUMP_WITH = 230, PUMP_START = 130, PUMP_AGAINST = 70;   // pumping a swing: with its motion, from stillness, against it
const HOOK = 280, HOOK_V = 820, CLIMB_V = 72, PAYOUT = 110, ROPE_MIN = 40, ROPE_MAX = 340, GRIP = 42;
// The hook has no end to its reach (only a bound so the search finishes): past HOOK it flies
// faster, and once it bites he reels the rope in quickly to ROPE_MAX, a length he can swing on.
const HOOK_FAR = 3000, HOOK_V_FAR = 2400, REEL_V = 600;
const WALL_V = 78, WALL_DOWN = 90;               // climbing the rock with bare hands: up, and down
// The torch does not burn down with time (he may look about as long as he likes): blows dim it,
// and the higher he is, the more each blow takes; the thief's hand, and a great demon's mouth.
// (And each time the mountain has been climbed to its top before, its demons strike a quarter harder.)
const blowCost = (c) => c * Math.min(4, 1 + metres(-S.y) / 350) * (1 + 0.25 * ((NOV && NOV.climbs) || 0));
const FLARE_R = 280, FLARE_SLOW = 0.25, METER_DRAIN = 0.25, BLINK_COST = 0.12;   // the flare: its reach, how slow the world goes, the meter it burns
const METER_REGEN = 1 / 55;                      // and how it fills again by itself while it is not burning (blows landed fill it faster)
const HW = 7, HT = 44;                           // half the monk's width; his height
// How far below his hands his feet hang, from the art's own hanging pose.
let reachK = 0;
function hangReach() {
  if (reachK) return reachK;
  let r = 54;
  try { const p = MONK_ANIM.hang(0.5, 0), hf = monkJoint(0, 0, 1, p, "hF"), hb = monkJoint(0, 0, 1, p, "hB"); r = -Math.min(hf[1], hb[1]); } catch (e) { }
  return (reachK = clamp(r || 54, 36, 80));
}
const CRAWL_H = 24, CRAWL_V = 52, CW_H = 2, CW_C = 5;      // crawling: his height, and his pace; a crawlway's height (rows: room to crawl, not to stand), and its chamber's (room to hold a relic up)
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
// The summit (in the seven mountains; the endless climb has none). Past the last shaft, the way
// comes out on the mountain's top, under the open sky: a broad crown of rock, a great arch of stone
// over it (to hook and swing from), a spire on either side. The greatest of the mountain's demons
// waits there. It is the section after a shaft, never at a gate: k % 8 === 7, and above any place
// he has kept on that mountain.
const SUMMIT_K = 39, SUM_G = 8, SUM_AW = 43, SUM_SPAN = 24, SUM_TOP = 28;
const summitAbove = (k) => { let v = Math.max(SUMMIT_K, k + 3); while (v % 8 !== 7) v++; return v; };
const summitK = () => (NOV && NOV.summitK) || Infinity;
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
let seed = 1, wallPh = [0, 0, 0], rows = new Map(), slots = new Map();
const secs = [], walls = [];
function ensureSecs(n) {
  while (secs.length <= n) {
    const k = secs.length, prev = secs[k - 1];
    if (!prev && NOV && NOV.piece) { secs.push(roomSec(NOV.piece, 0, 1)); continue; }
    if (!prev) { secs.push({ type: "shaft", h0: 1, h1: 44, c: MID - 19, k, dom: NOV ? NOV.domain : null }); continue; }
    const dom = domOf(k);
    // (The summit: its sky goes up for ever. Anything asked for above it is more of the same sky.)
    if (prev.type === "summit") { secs.push({ type: "summit", filler: true, h0: prev.h1 + 1, h1: prev.h1 + 1e6, k, dom, from: prev.from, c: prev.c }); continue; }
    if ((prev.type === "shaft" || prev.type === "room") && k >= summitK()) { const s = prev.c < MID ? 1 : -1; secs.push({ type: "summit", h0: prev.h1 + 1, h1: prev.h1 + 1e6, k, dom, from: prev, c: clamp(prev.c + 30 * s, SUM_AW + 4, COLS - SUM_AW - 5) }); continue; }
    if (prev.type === "shaft") {
      // (Gluttony's crossings, in the seven mountains: a cavern or a long swing under a roof, as the
      // mountain's seed falls, so no two climbs of it go the same way up.)
      const mixed = NOV && !NOV.room && WIDE[dom], gate = isGate(k), cave = !gate && !!WIDE[dom] && !(mixed && hash2(k, 41, seed) < 0.4), slope = !gate && !!SLOPE[dom];
      if (slope) {
        // As many terraces as the way across holds, each two rows above the last.
        const c1 = prev.c < MID ? MID + LW : MID - LW, n = Math.max(4, Math.round((Math.abs(c1 - prev.c) - 8) / TER));
        secs.push({ type: "slope", h0: prev.h1 + 1, h1: prev.h1 + 2 * n + SG + 8, from: prev, k, dom, n });
      } else secs.push({ type: cave ? "cave" : "trav", h0: prev.h1 + 1, h1: prev.h1 + (cave ? CH : TH), from: prev, k, dom, gate });
    } else {
      // The next shaft: across from the last, as far as the crossing between them wants.
      const w = WIDE[dom] ? 138 : SLOPE[dom] ? LW : MINE[dom] ? AW : 19, c0 = prev.from.c, want = prev.type === "cave" ? 276 : prev.type === "slope" ? 2 * LW : MINE[dom] ? 2 * AW : 38;
      const c = [MID - w, MID + w].filter((q) => Math.abs(q - c0) >= 25).sort((a, b) => Math.abs(Math.abs(a - c0) - want) - Math.abs(Math.abs(b - c0) - want))[0];
      // (And in Gluttony's, some shafts twice as long.)
      const long = NOV && !NOV.room && WIDE[dom] && hash2(k, 42, seed) < 0.35;
      secs.push({ type: "shaft", h0: prev.h1 + 1, h1: prev.h1 + (SLOPE[dom] ? 16 + Math.floor(hash2(k, 20, seed) * 8) : (34 + Math.floor(hash2(k, 20, seed) * 22)) * (long ? 2 : 1)), c, k, dom });
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
  const cc = c + 4.5 * Math.sin(h * 0.05 + wallPh[0]) + 2 * Math.sin(h * 0.13 + wallPh[1]);
  const hw = 5 + k + 3 * (0.5 + 0.5 * Math.sin(h * 0.061 + wallPh[2]));
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
  r = sec.type === "room" ? roomEdges(sec, h) : sec.type === "shaft" ? shaftRow(h, sec.c, sec, true) : shaftRow(h, sec.from.c, sec, false);
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
  if (sec.type === "room") return roomSolid(i, h, sec);
  if (sec.type === "trav") return travSolid(i, h, sec);
  if (sec.type === "slope") return slopeSolid(i, h, sec);
  if (sec.type === "cave") return cave(sec).g[(h - sec.h0) * COLS + i] === 1;
  if (sec.type === "summit") return summitSolid(i, h, sec);
  const e = edges(j); if (i < e.L || i > e.R) return true;
  const E = sec.eye === undefined ? eyeOf(sec) : sec.eye;
  if (E && h >= E.h0 && h <= E.h1) return !(i >= E.i0 && i <= E.i1) || eyeShut();
  const isl = island(Math.floor(h / SLOT));
  return !!isl && isl.st !== "gone" && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 && i <= isl.x1;
}
const solidAt = (x, y) => solid(Math.floor(x / CELL), Math.floor(y / CELL));
// The summit's rock: the crown (G rows up from the summit's foot), with the last shaft coming up
// through it, its walls going on straight up, toward one rim (out of the middle of the ground where
// the fight is); the arch, its piers at the crown's rim (so the ground
// between them is all one), its span high over it, and crags hanging from the span; beyond the
// piers, the mountain's shoulders falling away.
function summitG(i, sec) { const ad = Math.abs(i - sec.c); return ad < SUM_AW + 3 ? SUM_G : Math.max(2, Math.round(SUM_G - (ad - SUM_AW - 2) * 0.35)); }
function summitInfo(sec) {
  const e = edges(-(sec.h0 - 1)), mc = Math.round((e.L + e.R) / 2);
  sec.m0 = e.L; sec.m1 = e.R;
  sec.teeth = [[-15, 3], [8, 4], [24, 2]].filter(([u]) => Math.abs(sec.c + u - mc) > 5);
}
function summitSolid(i, h, sec) {
  if (sec.filler) return false;
  if (sec.m0 === undefined) summitInfo(sec);
  const r = h - sec.h0, d = i - sec.c, ad = Math.abs(d);
  if (r < summitG(i, sec)) return !(i >= sec.m0 && i <= sec.m1);
  if (ad >= SUM_AW && ad < SUM_AW + 3 && r < SUM_TOP) return true;
  if (ad < SUM_AW + 3 && r >= SUM_SPAN && r < SUM_TOP) return true;
  for (const [u, len] of sec.teeth) if ((d === u && r >= SUM_SPAN - len && r < SUM_SPAN) || (d === u + 1 && r >= SUM_SPAN - len + 1 && r < SUM_SPAN)) return true;
  return false;
}
const summitSec = () => (NOV && secs.length > summitK() && secs[summitK()].type === "summit" ? secs[summitK()] : null);
// ---- Rooms (rooms.js) ----------------------------------------------------------------------------------
// A room as a section of the mountain: set in the middle of it, its rock from its made grid, the
// mountain's rock about it. c, its way out at the top (for what comes above it).
function roomSec(name, k, h0) {
  const rnd = seeded(seed + 101 * k + 7), R = name[0] === "mountain" ? mountainFor(seed) : Array.isArray(name) ? (name.length > 1 ? linkRooms(name, rnd) : makeRoom(name[0], rnd)) : makeRoom(name, rnd);
  if (R.w + 40 > COLS) COLS = R.w + 40;
  const x0 = Math.round(R.w + 40 > 330 ? 20 : MID - R.w / 2), top = [];
  for (let c = 0; c < R.w; c++) if (!R.g[0][c]) top.push(c);
  return { type: "room", name, R, x0, h0, h1: h0 + R.h - 1, k, dom: NOV ? NOV.domain : null, c: top.length ? x0 + (top[0] + top[top.length - 1]) / 2 : MID };
}
const roomSolid = (i, h, sec) => { const col = i - sec.x0, row = sec.h1 - h; return col < 0 || col >= sec.R.w || row < 0 || row >= sec.R.h || sec.R.g[row][col]; };
// The open run of a row through it nearest its way out (as the shafts' edges, for what asks for them).
function roomEdges(sec, h) {
  const c = Math.round(sec.c); let best = null;
  for (let i = sec.x0; i < sec.x0 + sec.R.w; i++) {
    if (roomSolid(i, h, sec)) continue; let j = i; while (j + 1 < sec.x0 + sec.R.w && !roomSolid(j + 1, h, sec)) j++;
    const d = c < i ? i - c : c > j ? c - j : 0; if (!best || d < best.d) best = { L: i, R: j, d }; i = j;
  }
  return best ? { L: best.L, R: best.R } : { L: c - 2, R: c + 2 };
}
// Its marks in the world: [x, y of the floor under it, and the floor's ends], as spotsFor gives them.
function roomMarks(sec, ch) {
  const out = [];
  for (const [col, row] of sec.R.marks[ch] || []) {
    const i = sec.x0 + col; let h = sec.h1 - row; while (h > sec.h0 && !roomSolid(i, h - 1, sec)) h--;
    let a = i, b = i; while (a > i - 10 && !roomSolid(a - 1, h, sec) && roomSolid(a - 1, h - 1, sec)) a--; while (b < i + 10 && !roomSolid(b + 1, h, sec) && roomSolid(b + 1, h - 1, sec)) b++;
    out.push([(i + 0.5) * CELL, -(h - 1) * CELL - 0.01, (a + 0.5) * CELL, (b + 0.5) * CELL]);
  }
  return out;
}

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
const relicsOf = (sec) => { if (sec.type === "room") return sec.relics || NO_RELICS; const cw = crawlOf(sec); return sec.type === "cave" ? cave(sec).relics : cw ? cw.relics : NO_RELICS; };
// The verses on the walls: one in each shaft, about halfway up.
function wallAt(n) {
  // (In rooms, the verses stand where the rooms' drawings put them, and no others.)
  ensureSecs(0);
  if (secs[0].type === "room") {
    if (!walls.length) roomMarks(secs[0], "V").sort((a, b) => b[1] - a[1]).forEach(([x, y], m) => walls.push({ h: Math.floor(-y / CELL) + 2, px: x, py: y - 30, side: hash2(m, 12, seed) < 0.5 ? -1 : 1, n: m, read: false, lit: 0 }));
    return walls[n] || { h: 1e9, n, read: true, lit: 0, side: 1, px: 0, py: 0 };
  }
  while (walls.length <= n) {
    const m = walls.length; ensureSecs(m * 2);
    const sec = secs[m * 2], h = m === 0 ? 24 : sec.h0 + Math.floor((sec.h1 - sec.h0) * 0.5);
    walls.push({ h, side: hash2(m, 12, seed) < 0.5 ? -1 : 1, n: m, read: false, lit: 0 });
  }
  return walls[n];
}
function wallPos(w) {
  if (w.px !== undefined) return { x: w.px, y: w.py };
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
  const dur = kind === "stepUp" ? 0.36 : kind === "flipUp" ? 0.5 : kind === "climbUp" ? 1.3 + 0.05 * Math.round(L.h / CELL) : 0.95;
  S.act = { kind, u: 0, dur, x0: S.x, y0: S.y, x1: L.x1, y1: L.top - 0.01, edge: L.edge, s: L.s };
  S.dir = L.s; S.vx = 0; S.vy = 0; S.cling = 0; S.rope = null; S.shot = null; S.climbing = false;
  if (kind === "flipUp") Sound.fx.kick(0.4); else if (kind !== "stepUp") Sound.fx.grab();
}
// Where his feet are at u through a move (the arena's climb, from the ground or from a hang).
function actRoot(a, u) {
  const { x0, y0, x1, y1, edge, s } = a;
  if (a.kind === "stepUp") { const k = smooth(u); return [lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(u * PI) * 6]; }
  // (The flip: up off both feet, over in the air, down on the ledge.)
  if (a.kind === "flipUp") return [lerp(x0, x1, smooth(u)), lerp(y0, y1, Math.min(1, u * 1.6)) - Math.sin(u * PI) * 16];
  const reach = hangReach(), hangX = edge - s * 7, hangY = a.kind === "ledge" ? y1 + reach : Math.min(y0, y1 + reach);
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
  if (a.kind !== "stepUp" && a.kind !== "flipUp" && !a.pulled && pu > 0.6) { a.pulled = true; Sound.fx.climb(); }
  if (a.u >= 1) {
    S.x = a.x1; S.y = a.y1; S.act = null; S.ground = true; S.vx = 0; S.vy = 0;
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
    return;
  }
  const [x, y] = actRoot(a, a.u); S.x = x; S.y = y;
}
