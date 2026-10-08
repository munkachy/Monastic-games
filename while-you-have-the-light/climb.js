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
  const CELL = 16, COLS = 150, MID = 75, MPX = 27;   // a cell; the world's width in cells, and its middle; pixels to a metre
  const GRAV = 760, VMAX = 900, WALK = 70, AIR = 110;
  const PUMP_WITH = 230, PUMP_START = 130, PUMP_AGAINST = 70;   // pumping a swing: with its motion, from stillness, against it
  const HOOK = 280, HOOK_V = 820, CLIMB_V = 72, PAYOUT = 110, ROPE_MIN = 40, ROPE_MAX = 340, GRIP = 42;
  const WALL_V = 78, WALL_DOWN = 90;               // climbing the rock with bare hands: up, and down
  const BURN = 1 / 150;                            // a full torch lasts two and a half minutes, all the way up
  const FLARE_R = 280, FLARE_SLOW = 0.25, METER_DRAIN = 0.25, BLINK_COST = 0.12;   // the flare: its reach, how slow the world goes, the meter it burns
  const HW = 7, HT = 44;                           // half the monk's width; his height
  const SLOT = 10, TH = 18, CH = 48;               // rows to each place a platform may stand; a crossing's height; a cavern's

  // ---- The domains ------------------------------------------------------------------------------
  // The mountain is the seven, one above another, in Cassian's order of the eight thoughts (envy in
  // dejection's place, and pride crowning vainglory): the belly first, at the foot, and pride at
  // the top. Each domain is a band of the climb: a gate at its threshold, four shafts and the
  // crossings between them, its own idols in the walls, its own demons, its own way with the rock.
  // No names are given on the way: the gates, the idols and the demons tell it.
  const DOMAINS = ["gluttony", "lust", "avarice", "wrath", "envy", "sloth", "pride"];
  const BUILT = ["gluttony", "wrath"];             // those made so far: the climb goes through these, and round again
  const SPD = 8;                                   // sections to a domain: its gate, then four shafts and three crossings
  const WIDE = { gluttony: true };                 // shafts set far apart, with swollen caverns between them
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
        const gate = isGate(k), cave = !gate && !!WIDE[dom];
        secs.push({ type: cave ? "cave" : "trav", h0: prev.h1 + 1, h1: prev.h1 + (cave ? CH : TH), from: prev, k, dom, gate });
      } else {
        // The next shaft: across from the last, as far as the crossing between them wants.
        const w = WIDE[dom] ? 46 : 19, c0 = prev.from.c, want = prev.type === "cave" ? 92 : 38;
        const c = [MID - w, MID + w].filter((q) => Math.abs(q - c0) >= 25).sort((a, b) => Math.abs(Math.abs(a - c0) - want) - Math.abs(Math.abs(b - c0) - want))[0];
        secs.push({ type: "shaft", h0: prev.h1 + 1, h1: prev.h1 + 34 + Math.floor(hash2(k, 20, seed) * 22), c, k, dom });
      }
    }
  }
  function sectionAt(h) {
    if (h < 1) h = 1;
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
  // The platforms standing in the shafts. In Wrath's domain most of them crumble: stood on, they
  // crack, glowing, and give way.
  function island(s) {
    if (slots.has(s)) return slots.get(s);
    let isl = null;
    const h0 = s * SLOT + 2 + Math.floor(hash2(s, 7, seed) * 5), k = Math.min(1, h0 / 900), sec = sectionAt(h0);
    const ih = hash2(s, 9, seed) < 0.3 ? 2 : 1, iw = 3 + Math.floor(hash2(s, 10, seed) * 4);
    if (h0 > 8 && sec.type === "shaft" && h0 - 3 >= sec.h0 && h0 + ih + 2 <= sec.h1 && hash2(s, 8, seed) < 0.72 - 0.2 * k) {
      let lo = -1e9, hi = 1e9;
      for (let h = h0 - 1; h <= h0 + ih; h++) { const e = edges(-h); lo = Math.max(lo, e.L + 3); hi = Math.min(hi, e.R - 3 - iw + 1); }
      if (hi >= lo) {
        const x0 = Math.round(lerp(lo, hi, hash2(s, 11, seed)));
        isl = { x0, x1: x0 + iw - 1, h0, h1: h0 + ih - 1, s, crumble: sec.dom === "wrath" && hash2(s, 13, seed) < 0.6, st: null, t: 0 };
      }
    }
    slots.set(s, isl); return isl;
  }
  // A crossing. At a domain's threshold its first stretch of floor is long, and a carved gate stands
  // on it: a great block hung from the roof, with a doorway under it. In Wrath's domain, thin bridges
  // of rock lie over some of the pits, and give way under him.
  function trav(sec) {
    if (sec.info) return sec.info;
    const en = edges(-(sec.h0 - 1)), ex = edges(-(sec.h1 + 1));
    const dir = ex.L + ex.R > en.L + en.R ? 1 : -1, a = Math.min(en.L, ex.L), b = Math.max(en.R, ex.R);
    const pit = new Uint8Array(COLS), stop = dir > 0 ? ex.L - 3 : ex.R + 3, before = (i) => (dir > 0 ? i < stop : i > stop);
    let i = dir > 0 ? en.R + 1 : en.L - 1, n = 0, floor = true;
    while (before(i)) {
      const len = floor ? (n === 0 && sec.gate ? 9 : 3 + Math.floor(hash2(sec.k, 40 + n, seed) * 3)) : 5 + Math.floor(hash2(sec.k, 60 + n, seed) * 4);
      for (let q = 0; q < len && before(i); q++, i += dir) if (!floor) pit[i] = 1;
      floor = !floor; n++;
    }
    const T = { en, ex, a, b, dir, pit, bridges: [], bridgeOf: null, door: null, lamps: [] };
    if (sec.gate) {
      // The gate: three cells thick, two cells from the way in; its lamp just beyond it.
      const d0 = dir > 0 ? en.R + 3 : en.L - 5;
      T.door = { i0: d0, i1: d0 + 2 };
      const lx = (dir > 0 ? d0 + 4.5 : d0 - 1.5) * CELL;
      T.lamps.push({ x: lx, y: -(sec.h0 + 7) * CELL - 0.01, lit: false });
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
    if (r <= 15) return !!T.door && r >= 12 && i >= T.door.i0 && i <= T.door.i1;      // the tunnel, and the gate's block
    return !(i >= T.ex.L && i <= T.ex.R);                                            // the ceiling, and the way out
  }
  // ---- Gluttony's caverns ---------------------------------------------------------------------------
  // A cavern, swollen and tall, between two shafts set far apart. The shaft from below goes on up
  // through a cliff and comes out on its top, the near ledge; across the chasm a far ledge, with the
  // way out above it up through the roof. Between them: nothing to stand on but platforms of rock
  // hung in the dark, and below, the pit, and no bottom to it that he will ever reach (to fall in is
  // to wake at the last lamp he lit). The roof is near enough above the ledges that the hook always
  // finds it: the safe way over is along it, swing by swing, three or four of them. Below the way
  // over the platforms go down in chains, each within the rope's reach of the one above, so he can
  // always climb back; at the bottom of the deepest chains, what is worth going down for.
  const LH = 27, CR0 = 40;                       // the ledges' height in a cavern; its roof's (rows up from its floor)
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
        plats.push({ x0, x1: x0 + w - 1, r0: r1 - th + 1, r1, band: b, n, great, last: false });
        r1 -= th + 6 + Math.floor(hash2(k, 600 + b * 5 + n, seed) * 2);
      }
      for (let q = plats.length - 1; q >= 0; q--) if (plats[q].band === b) { plats[q].last = true; break; }
    }
    // The roof, swollen: low lumps hanging from it, up to three rows down; and over the top of each
    // chain, wherever it would be out of the rope's reach, a great swelling hanging lower.
    const ceil = new Int16Array(COLS), q1 = hash2(k, 31, seed) * TAU, q2 = hash2(k, 32, seed) * TAU;
    for (let i = 0; i < COLS; i++) ceil[i] = CR0 - clamp(Math.round(1.4 + 1.3 * Math.sin(i * 0.21 + q1) + 0.9 * Math.sin(i * 0.57 + q2)), 0, 3);
    for (const p of plats) if (p.n === 0) { const need = Math.floor(p.r1 + 18); for (let i = p.x0; i <= p.x1; i++) ceil[i] = Math.min(ceil[i], need); }
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
    const g = base.slice();
    for (const p of plats) for (let r = p.r0; r <= p.r1; r++) for (let i = p.x0; i <= p.x1; i++) g[r * COLS + i] = 1;
    // The lamps on the two ledges, at the edge of the chasm: where he wakes if he falls.
    const yL = -(H0 + LH - 1) * CELL - 0.01;
    const lamps = [{ x: (dir > 0 ? vA - 1.5 : vA + 2.5) * CELL, y: yL, lit: false }, { x: (dir > 0 ? vB + 2.5 : vB - 1.5) * CELL, y: yL, lit: false }];
    // At the foot of the deepest chains: a reliquary, for the one who goes down.
    const relics = [];
    for (const p of plats) if (p.last && p.n >= 2 && relics.length < 2) relics.push({ x: (p.x0 + p.x1 + 1) / 2 * CELL, y: -(H0 + p.r1) * CELL - 1, got: false });
    if (!relics.length) { const p = plats.filter((q) => q.last && !q.great).sort((a, b) => a.r1 - b.r1)[0]; if (p) relics.push({ x: (p.x0 + p.x1 + 1) / 2 * CELL, y: -(H0 + p.r1) * CELL - 1, got: false }); }
    // Glow-worms on the roof, faint as stars: the only thing that shows where it is in the dark.
    const worms = [];
    for (let i = Math.min(uA, uB); i <= Math.max(uA, uB); i++) if (hash2(k, 700 + i, seed) < 0.55) worms.push({ x: (i + hash2(k, 800 + i, seed)) * CELL, y: -(H0 + ceil[i]) * CELL + CELL + 1 + hash2(k, 900 + i, seed) * 3, ph: hash2(k, 1000 + i, seed) * TAU });
    return (sec.info = { en, ex, dir, vA, vB, uA, uB, lo, hi, ceil, base, g, plats, lamps, relics, worms, death: H0 + 3 });
  }
  // ---- The idols in the walls ---------------------------------------------------------------------
  // Here and there in every domain a niche is cut into the wall of a shaft (or into the cliffs, down
  // in a cavern's chasm), and in it an idol of that domain; and before it, kneeling in the dark with
  // their backs to the way up, its worshippers. They have no light of their own. As his torch passes,
  // they turn their heads. (Ezekiel 8:12: "what the ancients of the house of Israel do in the dark,
  // every one in private in his chamber: for they say: The Lord seeth us not.")
  // Each: the face of the wall at x, the niche's floor at y, cut in on side `side` (-1: into the rock
  // on the left), its domain, its worshippers (each kneeling, bowed, or prostrate).
  function nichesOf(sec) {
    if (sec.niches) return sec.niches;
    const out = (sec.niches = []);
    if (!sec.dom) return out;
    const add = (x, y, side, key) => {
      const n = 1 + Math.floor(hash2(sec.k, key, seed) * 3), who = [];
      for (let q = 0; q < n; q++) who.push({ u: 8 + q * 9 + hash2(sec.k, key + q * 7, seed) * 3, kind: Math.floor(hash2(sec.k, key + q * 13, seed) * 3), look: 0 });
      out.push({ x, y, side, dom: sec.dom, who, key });
    };
    if (sec.type === "shaft") {
      const v = wallAt(sec.k / 2);
      for (let h = sec.h0 + 7; h + 5 <= sec.h1 - 3; h += 13) {
        if (hash2(sec.k, h, seed) > 0.62) continue;
        const side = hash2(sec.k, h + 1, seed) < 0.5 ? -1 : 1;
        if (side === v.side && Math.abs(v.h - (h + 2)) < 6) continue;
        // The wall must stand straight for four rows, with no platform close by.
        const e0 = edges(-h); let ok = true;
        for (let r = 0; r < 4 && ok; r++) {
          const e = edges(-(h + r)); if (side < 0 ? e.L !== e0.L : e.R !== e0.R) ok = false;
          const isl = island(Math.floor((h + r) / SLOT)); if (isl && isl.h1 >= h - 1 && isl.h0 <= h + 4 && (side < 0 ? isl.x0 - e0.L < 4 : e0.R - isl.x1 < 4)) ok = false;
        }
        if (ok) add(side < 0 ? e0.L * CELL : (e0.R + 1) * CELL, -(h - 1) * CELL, side, h);
      }
    } else if (sec.type === "cave") {
      // In the faces of the two cliffs, down in the chasm, where only one who goes down will see them.
      const V = cave(sec), r = 11 + Math.floor(hash2(sec.k, 33, seed) * 5);
      add(V.dir > 0 ? V.vA * CELL : (V.vA + 1) * CELL, -(sec.h0 + r - 1) * CELL, V.dir > 0 ? -1 : 1, 40);
      add(V.dir > 0 ? (V.vB + 1) * CELL : V.vB * CELL, -(sec.h0 + r + 3 - 1) * CELL, V.dir > 0 ? 1 : -1, 60);
    }
    return out;
  }
  function solid(i, j) {
    if (j >= 0 || i < 1 || i >= COLS - 1) return true;
    const h = -j, sec = sectionAt(h);
    if (sec.type === "trav") return travSolid(i, h, sec);
    if (sec.type === "cave") return cave(sec).g[(h - sec.h0) * COLS + i] === 1;
    const e = edges(j); if (i < e.L || i > e.R) return true;
    const isl = island(Math.floor(h / SLOT));
    return !!isl && isl.st !== "gone" && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 && i <= isl.x1;
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
  // A wall he can take hold of: rock beside him from his knees to his chest.
  function wallBeside(s) { const i = Math.floor((S.x + s * (HW + 1.5)) / CELL); return solid(i, Math.floor((S.y - 8) / CELL)) && solid(i, Math.floor((S.y - 30) / CELL)); }
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
      touches: new Map(), keys: {}, hooked: 0, hintT: 0, lastDraw: 0, flip: null, hangT: 0, jumpT: 0, wall: 0,
      demons: [], things: [], held: null, atk: null, popK: 0, ids: 0, cast: 0, respawnT: 0, hurtT: 0, invT: 0, flashT: 0, floatT: 0, shake: 0, fightSeen: false, fightHintT: 0, meter: 1, kickCd: 0, swingKickT: 0, hang: null, ward: null, crosses: [],
      crumbling: [], pit: null, wake: 0, falls: 0, relics: 0, say: null, tint: null,
    };
    // Where he wakes if he falls: the last lamp he lit (to begin with, the foot of the mountain).
    S.lamp = { x, y: -0.01, fuel: 1, meter: 1 };
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
  // Into the pit of a cavern. Whatever he held falls with him.
  function startPit() {
    S.pit = { t: 0 }; S.rope = null; S.shot = null; S.cling = 0; S.hang = null; S.act = null; S.atk = null; S.climbing = false; S.flip = null; S.ward = null;
    if (S.held) { S.held.st = "gone"; S.held = null; }
    endFlare(true); Sound.fx.abyss();
  }
  // He wakes by the last lamp he lit, the torch as it was when he lit it, but a little lower for
  // each fall (so a fall is never free, and never the end).
  function respawn() {
    const L = S.lamp;
    if (L.ref) L.fuel = Math.max(0.15, L.fuel - 0.08);
    S.x = L.x; S.y = L.y; S.vx = 0; S.vy = 0; S.ground = true; S.landT = 0; S.dir = 1;
    S.fuel = L.fuel; S.meter = L.meter; S.pit = null; S.wake = 1; S.invT = 1.2; S.falls++;
    const sp = freeSpot(S.x, S.y); if (sp) { S.x = sp[0]; S.y = sp[1]; }
    S.cam.x = clamp(S.x - W / 2, 0, COLS * CELL - W); S.cam.y = Math.min(S.y - HT / 2 - H * 0.5, 70 - H);
    S.ropeVis = []; S.shotVis = [];
    Sound.fx.wake();
  }
  function lightOut() {
    S.dying = 0.001; S.fuel = 0; endFlare(true);
    Sound.fx.death(); Sound.setLevel(0);
  }
  function finish() {
    const m = metres(S.top);
    if (!NOV && m > (save.climbBest || 0)) save.climbBest = m;
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
      const o = S.held; S.held = null; o.st = "fly"; o.by = null; o.vx = S.dir * 60; o.vy = -40; o.g = o.kind === "fire" ? 0 : 560; o.x = S.x + S.dir * 14; o.age = 0; o.life = 1.5;
      if (o.kind !== "fire") Sound.fx.objHit("stone", 0);
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

  // ---- The demons, and what they throw ----------------------------------------------------------------
  // Each domain has its own. Wrath conjures fire over its head and throws it, slowly: a ball of fire
  // drifting at him through the dark, lighting the rock as it comes, which he can catch and fling
  // back. Gluttony, huge and slow, draws in its breath, and everything near is drawn to its mouth (a
  // swing goes astray; a man on foot is dragged); whatever is thrown at it, it swallows, and spits
  // back; and it is too heavy to be thrown or knocked into the air. Each shaft has its demons on its
  // platforms, each crossing on its floor, each cavern on its platforms; in Wrath's domain boulders
  // lie about where he will want them. Thrown into a cavern's pit, a demon is gone into the abyss.
  const DEM = { wrath: { hw: 10, ht: 50, hp: 7 }, gluttony: { hw: 17, ht: 62, hp: 10 } };
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
  const alive = (f) => !!f && f.st !== "gone" && f.st !== "dying" && f.st !== "emerge";
  const panX = (x) => clamp((x - S.cam.x - W / 2) / (W / 2), -1, 1);
  const gain = (v) => { S.meter = Math.min(1, S.meter + v); };
  function setSt(f, st) { f.st = st; f.t = 0; f.thrown = false; }
  function spawnDemon(sin, x, y, x0, x1, sec) {
    const D = DEM[sin], sp = dFree(x, y, D.hw, D.ht); if (!sp) return null;
    const f = { sin, hw: D.hw, ht: D.ht, maxHp: D.hp, x: sp[0], y: sp[1], vx: 0, vy: 0, dir: -1, hp: D.hp, st: "emerge", t: 0, cd: 1.8 + Math.random(), x0, x1, sec, ground: true, juggle: 0, hurtT: 0, showHp: 0, lit: 0, id: ++S.ids, belly: [] };
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
        const ok = i <= T.b && !T.pit[i] && solid(i, jt) && !solid(i, jt - 1) && !solid(i, jt - 4) && !(i >= T.en.L && i <= T.en.R) && !(T.door && i >= T.door.i0 - 2 && i <= T.door.i1 + 2);
        if (ok && a < 0) a = i; if (!ok && a >= 0) { if (room(i - a)) runs.push([a, i - 1]); a = -1; }
      }
      const c = (T.a + T.b) / 2;
      runs.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - c) - Math.abs((q[0] + q[1]) / 2 - c));
      for (const r of runs) out.push([(r[0] + r[1] + 1) / 2 * CELL, jt * CELL - 0.01, r[0] * CELL + D.hw, (r[1] + 1) * CELL - D.hw]);
    } else {
      const V = cave(sec);
      for (const p of V.plats.filter((p) => room(p.x1 - p.x0 + 1)).sort((a, b) => (b.great - a.great) || (b.r1 - a.r1)))
        out.push([(p.x0 + p.x1 + 1) / 2 * CELL, -(sec.h0 + p.r1) * CELL - 0.01, p.x0 * CELL + D.hw, (p.x1 + 1) * CELL - D.hw]);
    }
    return out;
  }
  function placeFor(k, demonsOnly) {
    ensureSecs(k); const sec = secs[k], sin = sec.dom || "wrath", n = demonsFor(k);
    if (!DEM[sin]) return;
    const spots = spotsFor(k, sin), taken = [];
    // The best place first; then each further one as far as it can be from those already taken.
    for (let q = 0; q < n && spots.length; q++) {
      let bi = 0, bd = -1;
      if (taken.length) spots.forEach((s, i) => { const d = Math.min(...taken.map((t) => Math.abs(t[0] - s[0]) + Math.abs(t[1] - s[1]))); if (d > bd) { bd = d; bi = i; } });
      const s = spots.splice(bi, 1)[0]; taken.push(s);
      spawnDemon(sin, s[0], s[1], s[2], s[3], k);
    }
    if (!demonsOnly && sin === "wrath") placeRocks(k, taken);
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
  function populate(dt) {
    const hNow = -S.y / CELL;
    for (; ;) { ensureSecs(S.popK); if (secs[S.popK].h0 > hNow + 30) break; placeFor(S.popK); S.popK++; }
    // In the novitiate, when all the demons of the place he is in are gone, others come.
    if (NOV && NOV.demons > 0) {
      const k = sectionAt(Math.max(1, Math.floor(hNow))).k;
      if (k < S.popK && !S.demons.some((f) => f.sec === k && f.st !== "gone")) { S.respawnT += dt; if (S.respawnT > 3) { S.respawnT = 0; placeFor(k, true); } } else S.respawnT = 0;
    }
  }
  function hurtDemon(f, dmg, kx, ky, how) {
    if (!alive(f)) return false;
    f.hp -= dmg; f.hurtT = 0.25; f.showHp = 2.5;
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
  function castOut(f, abyss) {
    setSt(f, "dying"); f.abyss = !!abyss; Sound.fx.castOut(f.sin); S.fuel = Math.min(1, S.fuel + 0.12); S.cast++; gain(0.25);
    if (abyss) return;
    const [cx, cy] = dMid(f);
    for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 160; S.parts.push({ kind: "spark", c: k % 3 ? SINS[f.sin].color : C.flameHot, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.9, age: 0 }); }
  }
  // Below a cavern's ledges, beneath the last of its platforms: the pit. Anything that falls past
  // this is gone.
  function inAbyss(y) { const h = -y / CELL, sec = sectionAt(Math.max(1, Math.floor(h))); return sec.type === "cave" && h < cave(sec).death; }
  function flyDemon(f, dt) {
    const n = clamp(Math.ceil(Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt / 6), 1, 10), h = dt / n;
    for (let k = 0; k < n; k++) {
      f.vy += (f.st === "thrown" && f.t < 0.25 ? 250 : 760) * h;
      const sp = Math.hypot(f.vx, f.vy), [hx, hy] = moveBox(f, f.vx * h, f.vy * h, f.hw, f.ht);
      if (inAbyss(f.y)) { castOut(f, true); return; }
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
    f.t += dt; f.hurtT = Math.max(0, f.hurtT - dt); f.showHp = Math.max(0, f.showHp - dt);
    if (f.st === "gone") return;
    if (f.st === "dying") { if (f.abyss) f.y += 260 * dt; if (f.t > 0.8) f.st = "gone"; return; }
    if (f.st === "emerge") { if (f.t > 0.9) setSt(f, "idle"); return; }
    if (f.st === "air" || f.st === "thrown" || f.st === "fall") { flyDemon(f, dt); return; }
    if (dist(f.x, f.y, S.x, S.y) > 760) return;
    f.ground = boxAt(f.x, f.y + 1, f.hw, f.ht);
    if (!f.ground) { setSt(f, "fall"); return; }
    if (f.vx) { moveBox(f, f.vx * dt, 0, f.hw, f.ht); f.vx *= Math.pow(0.01, dt); if (Math.abs(f.vx) < 6) f.vx = 0; }
    const [mx, my] = middle(), [cx, cy] = dMid(f), sees = !S.dying && !S.pit && dist(mx, my, cx, cy) < 380 && los(cx, cy - 10, mx, my - 6);
    if (f.sin === "gluttony") stepGluttony(f, dt, mx, my, sees); else stepWrath(f, dt, mx, my, sees);
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
  // Where its mouth is: in its head, low and forward.
  function mouth(f) { if (f.p) { const q = demonJoint(f.sin, f.x, f.y, f.dir, f.p, "head"); return [q[0] + f.dir * 5, q[1] + 4]; } return [f.x + f.dir * 12, f.y - f.ht + 12]; }
  function stepGluttony(f, dt, mx, my, sees) {
    const [ox, oy] = mouth(f), d = dist(mx, my, ox, oy);
    switch (f.st) {
      case "idle": case "walk":
        f.cd -= dt;
        if (sees) {
          f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle");
          if (f.cd <= 0 && f.belly.length) setSt(f, "spit");
          else if (f.cd <= 0 && d < 320) { setSt(f, "inhale"); Sound.fx.inhale(panX(f.x)); }
          break;
        }
        wander(f, dt, 15); break;
      case "inhale":
        // It draws in its breath, and everything near is drawn to its mouth.
        f.dir = mx < f.x ? -1 : 1;
        if (f.t > 0.35 && f.t < 2.4) inhale(f, ox, oy, dt);
        if (f.t > 0.35 && d < 30) setSt(f, "bite");
        else if (f.t > 2.5) { setSt(f, "idle"); f.cd = 2.2 + Math.random() * 1.5; }
        break;
      case "bite":
        // The jaws: the torch half eaten, and he is spat out, hard.
        if (!f.thrown && f.t > 0.12) { f.thrown = true; if (dist(mx, my, ox, oy) < 50 && S.invT <= 0) { hitMonk(f.dir, 0.1); S.vx = f.dir * 340; S.vy = -280; Sound.fx.spit(); } }
        if (f.t > 0.6) { setSt(f, "idle"); f.cd = 2.6; }
        break;
      case "swallow": if (f.t > 0.7) { setSt(f, "idle"); f.cd = Math.min(f.cd, 1.1); } break;
      case "spit": f.dir = mx < f.x ? -1 : 1; if (!f.thrown && f.t > 0.3) { f.thrown = true; spitBack(f); } if (f.t > 0.6) { setSt(f, "idle"); f.cd = 2 + Math.random(); } break;
      case "hurt": if (f.t > 0.45) setSt(f, "idle"); break;
      case "down": if (f.t > 1.3) setSt(f, "getUp"); break;
      case "getUp": if (f.t > 0.6) setSt(f, "idle"); break;
    }
  }
  // The breath drawn in: on the rope or in the air he is pulled off his way; on his feet he is
  // dragged (but holding the rock, or hanging from a ledge, he holds); and what flies near, it eats.
  function inhale(f, ox, oy, dt) {
    const [mx, my] = middle(), dx = ox - mx, dy = oy - my, d = Math.hypot(dx, dy) || 1;
    if (d < 340 && !S.cling && !S.hang && !S.act && !S.atk && !S.pit && los(ox, oy, mx, my)) {
      const a = 560 * clamp(1 - d / 380, 0, 1) + 80;
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
  function eat(f, o) {
    o.st = "gone"; f.belly.push(o.kind); setSt(f, "swallow"); f.cd = 1.4; Sound.fx.swallow();
    if (S.held === o) S.held = null;
  }
  // Back out, at him, hard.
  function spitBack(f) {
    const kind = f.belly.pop(); if (!kind) return;
    const [ox, oy] = mouth(f), [tx, ty] = middle();
    Sound.fx.spit();
    if (kind === "fire") { const d = dist(ox, oy, tx, ty) || 1; S.things.push({ kind: "fire", x: ox, y: oy, vx: (tx - ox) / d * 330, vy: (ty - oy) / d * 330, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 4 }); return; }
    lob(ox, oy, tx, ty, 520, 560, "demon");
  }
  // A boulder lobbed from (hx, hy) to fall on (tx, ty): the lower of the two arcs that reach it, or the longest throw.
  function lob(hx, hy, tx, ty, v, g, by) {
    const X = tx - hx, Y = hy - ty, xa = Math.max(1, Math.abs(X));
    let disc = v ** 4 - g * (g * xa * xa + 2 * Y * v * v);
    if (disc < 0) { v = Math.sqrt(g * (Y + Math.hypot(Y, xa))) * 1.02; disc = Math.max(0, v ** 4 - g * (g * xa * xa + 2 * Y * v * v)); }
    const th = Math.atan2(v * v - Math.sqrt(disc), g * xa);
    S.things.push({ kind: "stone", x: hx, y: hy, vx: sign(X) * v * Math.cos(th), vy: -v * Math.sin(th), rot: 0, vr: 6 * sign(X), st: "fly", by, g, age: 0 });
    Sound.fx.throw(0.6);
  }
  // Wrath's fire: from over its head, straight at him, slow.
  function throwFire(f) {
    const hx = f.x + f.dir * 6, hy = f.y - f.ht - 8, [tx, ty] = middle(), d = dist(hx, hy, tx, ty) || 1;
    S.things.push({ kind: "fire", x: hx, y: hy, vx: (tx - hx) / d * FIRE_V, vy: (ty - hy) / d * FIRE_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 8 });
    Sound.fx.fireball(panX(f.x));
    const fires = S.things.filter((o) => o.kind === "fire"); if (fires.length > 8) fires[0].st = "gone";
  }
  // Rock at the boulder's edge, on the side it is moving toward?
  function rockAt(x, y, sx, sy, r) {
    r = r || BR;
    if (sx) return solidAt(x + sx * r, y) || solidAt(x + sx * r, y - r * 0.6) || solidAt(x + sx * r, y + r * 0.6);
    return solidAt(x, y + sy * r) || solidAt(x - r * 0.6, y + sy * r) || solidAt(x + r * 0.6, y + sy * r);
  }
  // A ball of fire against the rock: it bursts, and crumbling rock gives way at once.
  function burst(o, x, y) {
    o.st = "gone"; Sound.fx.fireBurst(panX(o.x)); crumbleAt(x, y, true);
    for (let k = 0; k < 14; k++) { const a = Math.random() * TAU, v = 30 + Math.random() * 120; S.parts.push({ kind: "spark", c: k % 2 ? SINS.wrath.color : C.flameHot, x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.3, age: 0 }); }
  }
  // Does a thing at (x, y) strike the monk? His ward turns it back the way it came, and then it is his.
  function strikeMonk(o, r) {
    if (o.by !== "demon" || S.invT > 0 || S.pit) return false;
    if (Math.abs(o.x - S.x) >= HW + r + (S.ward ? 8 : 0) || o.y <= S.y - HT - r || o.y >= S.y + r) return false;
    if (S.ward) {
      S.ward = null; o.by = o.kind === "fire" ? "monk" : null; o.vx *= o.kind === "fire" ? -3.5 : -0.6; o.vy = o.kind === "fire" ? o.vy * -3.5 : -200;
      const [cx, cy] = middle(); S.crosses.push({ kind: "turn", x: cx, y: cy - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); S.shake = 0.15;
    } else if (o.kind === "fire") { hitMonk(o.vx); o.st = "gone"; burst(o, o.x, o.y); }
    else { hitMonk(o.vx); o.by = null; o.vx *= -0.3; o.vy = -120; }
    return true;
  }
  // Does a thing he threw strike a demon? Gluttony, unless it is reeling, swallows it.
  function strikeDemon(o, r) {
    if (o.by !== "monk") return false;
    for (const f of S.demons) if (alive(f) && Math.abs(o.x - f.x) < f.hw + r && o.y > f.y - f.ht - r && o.y < f.y + r) {
      if (f.sin === "gluttony" && ["idle", "walk", "inhale", "swallow"].includes(f.st)) { f.dir = o.x < f.x ? -1 : 1; eat(f, o); return true; }
      if (o.kind === "fire") { hurtDemon(f, 2, sign(o.vx) * 220, -260, "launch"); burst(o, o.x, o.y); }
      else { hurtDemon(f, 2, sign(o.vx) * 260, -220, "launch"); Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vx *= -0.3; o.vy = -150; o.g = 560; }
      S.shake = 0.2; gain(0.12);
      return true;
    }
    return false;
  }
  function updThing(o, dt) {
    o.age += dt;
    if (o.st === "held" || o.st === "gone") return;
    if (o.kind === "fire") {
      // Fire: straight on, slow, until it meets rock or him or a demon, or burns out.
      if (o.age > (o.life || 8)) { o.st = "gone"; for (let k = 0; k < 5; k++) S.parts.push({ kind: "smoke", x: o.x, y: o.y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, r: 3 + Math.random() * 3, life: 0.7, age: 0 }); return; }
      const n = clamp(Math.ceil(Math.hypot(o.vx, o.vy) * dt / 4), 1, 12), h = dt / n;
      for (let k = 0; k < n; k++) {
        o.vy += (o.g || 0) * h; o.x += o.vx * h; o.y += o.vy * h; o.rot += h * 6;
        if (solidAt(o.x, o.y)) { burst(o, o.x, o.y); return; }
        if (strikeMonk(o, 9) || strikeDemon(o, 10)) return;
        if (inAbyss(o.y)) { o.st = "gone"; return; }
      }
      if (Math.random() < 0.5) S.parts.push({ kind: "ember", x: o.x + (Math.random() - 0.5) * 8, y: o.y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 20 - o.vx * 0.1, vy: -20 - Math.random() * 30, life: 0.6, age: 0 });
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
        if (down && Math.abs(o.vy) < 70) { o.vy = 0; o.vx *= 0.6; if (Math.abs(o.vx) < 40) { o.st = "rest"; o.vx = 0; o.y = Math.floor((o.y + BR + 2) / CELL) * CELL - BR - 0.01; return; } }
      } else o.y += o.vy * h;
      if (bounced) { if (o.by) Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vr *= 0.5; o.g = 560; }
      if (inAbyss(o.y)) { o.st = "gone"; return; }
      if (strikeMonk(o, BR)) continue;
      if (strikeDemon(o, BR)) break;
    }
  }
  // The rock that gives way (Wrath's): a platform stood on, a bridge walked on, or struck by fire,
  // cracks, glowing, and a moment later falls to pieces.
  function crumbleAt(x, y, quick) {
    const i = Math.floor(x / CELL), h = -Math.floor(y / CELL), sec = sectionAt(Math.max(1, h));
    if (sec.type === "shaft") {
      const isl = island(Math.floor(h / SLOT));
      if (isl && isl.crumble && !isl.st && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 - 1 && i <= isl.x1 + 1) { isl.st = "crack"; isl.t = quick ? 0.55 : 0; isl.dur = 0.9; S.crumbling.push(isl); Sound.fx.crack(panX(x)); }
    } else if (sec.type === "trav") {
      const T = trav(sec), r = h - sec.h0;
      if (T.bridgeOf && r === 7 && T.bridgeOf[i]) { const B = T.bridges[T.bridgeOf[i] - 1]; if (!B.st) { B.st = "crack"; B.t = quick ? 0.4 : 0; B.dur = 0.6; B.h = h; S.crumbling.push(B); Sound.fx.crack(panX(x)); } }
    }
  }
  function stepCrumbling(dt) {
    for (const c of S.crumbling) {
      if (c.st !== "crack") continue;
      c.t += dt;
      if (c.t < c.dur) continue;
      c.st = "gone";
      const x0 = (c.i0 !== undefined ? c.i0 : c.x0) * CELL, x1 = ((c.i1 !== undefined ? c.i1 : c.x1) + 1) * CELL, y0 = c.h !== undefined ? -c.h * CELL : -c.h1 * CELL, y1 = c.h !== undefined ? y0 + CELL : (1 - c.h0) * CELL;
      for (let k = 0; k < 18; k++) S.parts.push({ kind: "chip", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 1.2, age: 0, big: Math.random() < 0.4 });
      for (let k = 0; k < 6; k++) S.parts.push({ kind: "smoke", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 30, vy: 10 - Math.random() * 20, r: 5 + Math.random() * 6, life: 1, age: 0 });
      Sound.fx.crumble(panX((x0 + x1) / 2)); S.shake = Math.max(S.shake, 0.12);
    }
    S.crumbling = S.crumbling.filter((c) => c.st === "crack");
  }
  function hitMonk(kx, cost) {
    if (S.dying || S.invT > 0 || S.pit) return;
    S.fuel -= cost || 0.06; S.hurtT = 0.5; S.invT = 0.9; S.flashT = 0.3; S.cling = 0; S.climbing = false; S.atk = null; S.act = null; S.hang = null; S.ward = null;
    S.vx = (sign(kx) || -S.dir) * 200; S.vy = -170; S.ground = false;
    if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.vx * 0.3; S.held.vy = -100; S.held = null; }
    Sound.fx.hurt(); S.shake = 0.25;
  }
  const demonAt = (x, y) => { let best = null, bd = 1e9; for (const f of S.demons) { if (!alive(f)) continue; const [cx, cy] = dMid(f), d = dist(x, y, cx, cy); if (Math.abs(x - f.x) < f.hw + 18 && y > f.y - f.ht - 18 && y < f.y + 14 && d < bd) { bd = d; best = f; } } return best; };
  const thingAt = (x, y) => { let best = null, bd = 32; for (const o of S.things) { if (o.st === "held" || o.st === "gone") continue; const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; };

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
    const side = S.x < f.x ? -1 : 1, sp = freeSpot(f.x + side * (f.hw + HW + 5), f.y) || freeSpot(f.x - side * (f.hw + HW + 5), f.y) || [S.x, S.y];
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
    // A boulder: the slow heave of a heavy thing. Fire: a quick fling.
    const fire = S.held.kind === "fire";
    S.atk = { kind: fire ? "fling" : "toss", f, tx, ty, t: 0, dur: fire ? 0.36 : 0.6, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
    S.dir = (f ? f.x : tx) < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
  }
  // Fling what he holds, at a point or a demon, as hard as it came.
  function release(tx, ty, f) {
    const o = S.held; if (!o) return null;
    const [hx, hy] = S.handW || grip();
    if (f && alive(f)) { const [cx, cy] = dMid(f); tx = cx + f.vx * 0.1; ty = cy; }
    const d = Math.max(1, dist(hx, hy, tx, ty));
    o.st = "fly"; o.by = "monk"; o.x = hx; o.y = hy; o.age = 0;
    if (o.kind === "fire") { o.g = 0; o.life = 3; o.vx = (tx - hx) / d * FIRE_FLING; o.vy = (ty - hy) / d * FIRE_FLING; Sound.fx.fireball(0); }
    else { const T = d / BOULDER_V; o.g = 300; o.vx = (tx - hx) / T; o.vy = (ty - hy) / T - 0.5 * o.g * T; o.vr = 8 * sign(o.vx); }
    S.held = null; Sound.fx.throw(0.9);
    return o;
  }
  // Each move: its pose, and the moment it lands. The toss is slow: the wind-up of a heavy thing.
  const ATK_ANIM = { punch: ["palm", MONK_HIT.palm], kick: ["launch", MONK_HIT.launch], slam: ["slam", MONK_HIT.slam], hurl: ["throw", MONK_HIT.throw], toss: ["throw", 0.62], fling: ["throw", 0.45], heave: ["pickup", MONK_HIT.pickup], catch: ["catch", MONK_HIT.catch] };
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
      else if (a.kind === "heave" || a.kind === "catch") {
        if (a.o.st === "rest" || a.o.st === "fly") { a.o.st = "held"; a.o.by = null; S.held = a.o; if (a.kind === "catch") { Sound.fx.catchIt(); gain(0.08); } else Sound.fx.pickup(); }
      } else if (alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
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
      if (!alive(f) || (f.stompCd || 0) > S.rt || Math.abs(S.x - f.x) > f.hw + HW - 2) continue;
      const top = f.y - f.ht;
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
    for (const f of S.demons) if (alive(f) && Math.abs(f.x - fx) < f.hw + 16 && f.y - f.ht < S.y + 4 && f.y > S.y - HT - 6) {
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
    // Into a wall in the air, holding toward it: cling. (In a cavern only a true wall, beside his
    // knees as well as his chest: not a lump hanging from the roof that he swings past.)
    if (!S.ground && d && near(d) && !S.climbing && !S.cling && !S.held && (sectionAt(Math.max(1, -Math.floor(S.y / CELL))).type !== "cave" || wallBeside(d))) { S.cling = d; S.dir = d; S.vx = 0; S.vy = 0; S.rope = null; Sound.fx.grab(); }
    if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);
    if (S.rope && !S.ground) swingKick();
    if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
  }

  function step(dt) {
    S.rt += dt;
    if (NOV) { if (NOV.torch) S.fuel = 1; if (NOV.flare) S.meter = 1; }
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
    // Fallen into the pit: down into the dark, and he wakes by the last lamp he lit.
    if (S.pit) { S.pit.t += dt; S.vy = Math.min(VMAX, S.vy + GRAV * dt); S.y += S.vy * dt; S.x += S.vx * dt * 0.5; if (S.pit.t > 1.15) respawn(); }
    S.wake = Math.max(0, S.wake - dt * 1.3);
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
    if (!S.dying && !S.pit) {
      if (S.act) { if (S.shot) flyShot(wdt); stepAct(wdt); }
      else if (S.atk) { if (S.shot) flyShot(wdt); stepAtk(F.on ? dt * 0.8 : wdt); }       // his blows keep their speed in the flare
      else physics(wdt);
      if (!S.pit && inAbyss(S.y)) startPit();
      // Rock that crumbles: standing on it, it begins to go.
      if (S.ground && !S.pit) { crumbleAt(S.x - HW + 2, S.y + 3); crumbleAt(S.x + HW - 2, S.y + 3); }
    }
    stepCrumbling(wdt);
    // The demons, and the stones.
    if (!S.dying) populate(dt);
    for (const f of S.demons) { updDemon(f, wdt); if (f.brokenT > 0) f.brokenT -= dt; }
    S.demons = S.demons.filter((f) => f.st !== "gone");
    for (const o of S.things) updThing(o, wdt);
    S.things = S.things.filter((o) => o.st !== "gone" && o.y < S.y + 1400);
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
    // The lamps: passing one, he lights it from his torch, and if he falls it is there he wakes.
    // The reliquaries at the foot of a cavern's deepest chains: the torch and the flare made full.
    if (!S.dying && !S.pit) for (const sec of sectionsIn(hNow - 30, hNow + 30)) {
      for (const L of lampsOf(sec)) {
        if (L.lit || dist(mx, my, L.x, L.y - 20) > 46) continue;
        L.lit = true; L.litT = S.rt; S.lamp = { x: L.x, y: L.y, fuel: S.fuel, meter: S.meter, ref: L };
        Sound.fx.kindle(1, panX(L.x));
        for (let k = 0; k < 10; k++) S.parts.push({ kind: "spark", x: L.x, y: L.y - 22, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 60, life: 0.7, age: 0, real: true });
      }
      if (sec.type === "cave") for (const R of cave(sec).relics) {
        if (R.got || dist(mx, my, R.x, R.y - 8) > 30) continue;
        R.got = true; S.relics++; S.fuel = 1; S.meter = 1; S.say = { text: "A RELIC", sub: "The torch and the flare are full", t: 0 };
        Sound.fx.unlock();
        for (let k = 0; k < 24; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 120; S.parts.push({ kind: "spark", c: C.gold, x: R.x, y: R.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 1, age: 0, real: true }); }
      }
    }
    if (S.say) { S.say.t += dt; if (S.say.t > 3) S.say = null; }
    const lv = Math.min(4, Math.floor(metres(S.top) / 40));
    if (lv !== S.level && !S.dying) { S.level = lv; Sound.setLevel(lv); }
    // The camera: a little below the middle, so more of the way up shows; ahead of him in a crossing.
    const sec = sectionAt(Math.max(1, Math.floor(hNow))), cv = sec.type === "cave", look = sec.type === "trav" ? trav(sec).dir * 90 : cv ? cave(sec).dir * 140 : 0;
    const tx = clamp(S.x + look - W / 2, 0, COLS * CELL - W), ty = Math.min(S.y - HT / 2 - H * (sec.type === "trav" ? 0.5 : cv ? 0.42 : 0.58), 70 - H);
    if (!S.pit) { S.cam.x += (tx - S.cam.x) * (1 - Math.exp(-dt * 4)); S.cam.y += (ty - S.cam.y) * (1 - Math.exp(-dt * 4)); }
    if (!S.dying && Math.random() < (F.on ? 0.9 : 0.3)) S.parts.push({ kind: "ember", x: S.torch[0] + (Math.random() - 0.5) * 4, y: S.torch[1] - 6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, life: 0.8, age: 0 });
    for (const p of S.parts) {
      const k = p.real ? dt : wdt; p.age += k; p.x += p.vx * k; p.y += p.vy * k;
      if (p.kind === "chip") p.vy += 500 * k; else if (p.kind === "smoke") { p.vx *= 1 - 2 * k; p.vy *= 1 - 2 * k; }
      else if (p.kind === "draft") { const q = 1 - Math.exp(-k * 4.5); p.px = p.x; p.py = p.y; p.x = lerp(p.x, p.tx, q); p.y = lerp(p.y, p.ty, q); }
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
  // (The niches cut into the walls are hollows the light goes into: HOLES holds their cells.)
  const HOLES = new Set(), holeKey = (i, j) => (j + 1e6) * 256 + i;
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
  // A slab of rock standing free (a platform in a shaft, or hung in a cavern): flat on top, its
  // underside broken. jit shakes it (as it crumbles).
  function slab(P, cam, x0, x1, y0, y1, s, jit) {
    const X = (x) => x - cam.x + jx, Y = (y) => y - cam.y + jy, q = (k) => (hash2(s, k, 77) - 0.5) * 4;
    const jx = jit ? (Math.random() - 0.5) * jit : 0, jy = jit ? (Math.random() - 0.5) * jit * 0.6 : 0, deep = y1 - y0 > CELL * 1.5;
    P.moveTo(X(x0 + 2), Y(y0 + q(2) * 0.4)); P.lineTo(X((x0 + x1) / 2 + q(3)), Y(y0 - 1)); P.lineTo(X(x1 - 2), Y(y0 + 0.5));
    P.lineTo(X(x1 + 1 + q(6) * 0.4), Y((y0 + y1) / 2)); P.lineTo(X(x1 - 4 + q(7)), Y(y1 + 2 + Math.abs(q(8))));
    if (deep || x1 - x0 > 80) { P.lineTo(X(lerp(x0, x1, 0.68) + q(13)), Y(y1 + 9 + Math.abs(q(14)) * 2)); P.lineTo(X(lerp(x0, x1, 0.5) + q(9)), Y(y1 + 3)); P.lineTo(X(lerp(x0, x1, 0.32) + q(15)), Y(y1 + 12 + Math.abs(q(16)) * 2)); }
    else P.lineTo(X((x0 + x1) / 2 + q(9)), Y(y1 + 6 + Math.abs(q(10))));
    P.lineTo(X(x0 + 3), Y(y1 + 2 + Math.abs(q(11)))); P.lineTo(X(x0 - 1 + q(12) * 0.4), Y((y0 + y1) / 2)); P.closePath();
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
      slab(P, cam, p.x0 * CELL, (p.x1 + 1) * CELL, y0, y1, sec.k * 31 + p.x0, 0);
    }
    for (let s = Math.floor(-j1 / SLOT) - 1; s <= Math.floor(-j0 / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl || isl.st === "gone") continue;
      slab(P, cam, isl.x0 * CELL, (isl.x1 + 1) * CELL, -isl.h1 * CELL, (1 - isl.h0) * CELL, s, isl.st === "crack" ? 1 + 3 * isl.t / isl.dur : 0);
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
      case "pickup": return s === "wrath" ? A.windup(k(0.7), t, s) : A.pickup(k(0.5), t, s);
      case "windup": return A.windup(s === "wrath" ? 1 : k(0.55), t, s);
      case "inhale": { const p = A.idle((t * 0.5 + f.id * 0.3) % 1, t, s); p.jaw = Math.min(1, f.t * 3); p.lean -= 0.18 * Math.min(1, f.t * 3); p.head -= 0.25 * Math.min(1, f.t * 3); return p; }
      case "bite": return A.swallow(k(0.6), t, s);
      case "swallow": return A.swallow(k(0.7), t, s);
      case "spit": return A.spit(k(0.6), t, s);
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
  // The niche: an arched opening cut into the rock (u into it, v up from its floor).
  const NICHE = [[0, 0], [40, 0], [40, 31], [36, 40], [28, 46], [18, 49], [8, 48], [0, 45]];
  // Those who worship there, facing the idol (toward +u): kneeling upright with hands lifted, kneeling
  // bowed low, or lying on their faces. head: where the head is, bowed to it; up: turned back to the light.
  const WORSHIP = [
    { body: [[-7, 0], [8, 0], [8, 3], [3, 6], [4, 13], [7, 19], [4, 20], [1, 21], [-3, 21], [-6, 13], [-8, 5]], head: [0.5, 24.5], up: [-0.8, 24.8] },
    { body: [[-7, 0], [9, 0], [12, 3], [12, 7], [7, 12], [1, 14], [-5, 11], [-8, 5]], head: [13.5, 6.5], up: [7.5, 16.5] },
    { body: [[-6, 0], [12, 0], [14, 2], [10, 6], [3, 7.5], [-3, 6.5], [-6, 3]], head: [15.5, 3.2], up: [11.5, 9.5] },
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
    } else {
      addPoly(path, [[26, 0], [40, 0], [40, 4], [26, 4]], T);
      addPoly(path, [[29.5, 4], [36.5, 4], [35.5, 26], [37, 32], [33, 36], [29, 32], [30.5, 26]], T);
      addOval(path, 33, 38.5, 3.6, 3.8, T, 10);
    }
  }
  // A niche and all in it: drawn into the rock (black on the dark of the opening), with its outlines
  // gathered for the torch to catch, and the idol's shape kept to show its colour in the light.
  function drawNiche(n, cam, rimP, idols) {
    const T = put(n.x, n.y, n.side, cam), op = new Path2D();
    const [sx, sy] = T(20, 24); if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;
    addPoly(op, NICHE, T);
    // The opening: the faint grey of a hollow in the rock, deeper toward its back.
    const [bx] = T(40, 0), [fx] = T(0, 0), g = ctx.createLinearGradient(fx, 0, bx, 0);
    g.addColorStop(0, "#17171a"); g.addColorStop(1, "#0b0b0d");
    ctx.fillStyle = g; ctx.fill(op);
    rimP.addPath(op);
    const idol = new Path2D(); idolPath(idol, n.dom, T);
    ctx.fillStyle = C.ink; ctx.fill(idol); rimP.addPath(idol); idols.push({ path: idol, dom: n.dom, n });
    // Wrath's idol: a fire in its belly, low, that never goes out.
    if (n.dom === "wrath") { const a = T(31, 12), b = T(36, 7); rect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1], "#3a0c06"); }
    // Its worshippers, their heads turning to the light as it comes near.
    const [lx, ly] = S.torch, near = dist(lx, ly, sx, sy) < lightR() * 0.8 && los(lx, ly, n.x + n.side * 4, n.y - 20);
    for (const w of n.who) {
      w.look = clamp(w.look + (near ? 1.1 : -0.4) * DDT, 0, 1);
      const W2 = WORSHIP[w.kind], k = smooth(w.look), body = new Path2D(), hd = [lerp(W2.head[0], W2.up[0], k) + w.u, lerp(W2.head[1], W2.up[1], k)];
      addPoly(body, W2.body.map(([u, v]) => [u + w.u, v]), T);
      addOval(body, hd[0], hd[1], 3.3, 3.5, T, 10);
      addPoly(body, [[hd[0] + 1.5 - k * 2.5, hd[1] + 2.2], [hd[0] + 3.6 - k * 5, hd[1] + 4.6 - k * 1.2], [hd[0] + 2.8 - k * 3, hd[1] + 0.4]], T);   // the hood's point
      ctx.fillStyle = C.ink; ctx.fill(body); rimP.addPath(body);
      if (k > 0.2) {
        // The face, turned back over the shoulder: pale, and no more than a face.
        const [px, py] = T(hd[0] - 1.9, hd[1] - 0.3);
        ctx.globalAlpha = (k - 0.2) / 0.8; ctx.beginPath(); ctx.ellipse(px, py, 1.6, 2.4, 0, 0, TAU); ctx.fillStyle = "#5b544b"; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
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
    } else {
      addPoly(cut, [[6, 8], [42, 8], [42, 56], [6, 56]], T);
    }
    ctx.fillStyle = C.ink; ctx.fill(solidP); rimP.addPath(solidP);
    // The carving on the block's face is in the rock, where the torch's rays do not go: it is laid on
    // after the dark, as bright as the torch is near (and can see the doorway under it).
    const [cx, cy] = [(x0 + x1) / 2, yB + 8], [lx, ly] = S.torch, k = clamp(1 - dist(lx, ly, cx, cy) / (lightR() * 0.95), 0, 1) * (los(lx, ly, cx, cy) ? 1 : 0);
    if (k > 0.02) carved.push({ path: cut, k, x: cx - cam.x, y: cy - cam.y });
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
  // Rock that will crumble: hairline cracks with a dull fire in them; when it begins to go, they blaze.
  function crackLines(x0, x1, y0, s, hot) {
    const n = Math.max(2, Math.round((x1 - x0) / 22)), a = hot ? 0.95 : 0.22 + 0.08 * Math.sin(S.rt * 2 + s);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.strokeStyle = hot ? "#ffb070" : "#c8401c"; ctx.lineWidth = hot ? 1.3 : 0.9;
    ctx.beginPath();
    for (let q = 0; q < n; q++) {
      const cx = lerp(x0 + 6, x1 - 6, (q + 0.5) / n) + (hash2(s, q, 5) - 0.5) * 8;
      ctx.moveTo(cx, y0 + 0.5); ctx.lineTo(cx + (hash2(s, q, 6) - 0.5) * 6, y0 + 5); ctx.lineTo(cx + (hash2(s, q, 7) - 0.5) * 9, y0 + 10); ctx.lineTo(cx + (hash2(s, q, 8) - 0.5) * 6, y0 + 15);
    }
    ctx.stroke(); ctx.restore();
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
    DDT = clamp(t - (S.lastDraw || t), 0, 0.05) || 1 / 60;
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
    // Behind everything in a cavern: the glow up out of the pit, breathing slowly.
    for (const sec of view) if (sec.type === "cave") {
      const V = cave(sec), x = (V.lo + V.hi + 1) / 2 * CELL - cam.x, y = -(sec.h0 + 1) * CELL - cam.y, w = (V.hi - V.lo + 1) * CELL * 0.62, b = 0.75 + 0.25 * Math.sin(t * 0.7 + sec.k);
      if (y > -200 && y < H + 260) { glowOval(x, y, w, 150, SINS.gluttony.dark, 0.5 * b); glowOval(x, y + 20, w * 0.8, 70, SINS.gluttony.color, 0.28 * b); lights.push({ x, y, r: 180, sx: w / 180, a: 0.55 * b }); }
    }
    for (const g of S.ghosts) drawMonk(g.x - cam.x, g.y - cam.y, g.dir, g.p, { ghost: true, alpha: 1 - g.age / 0.9 });
    // The demons, their colour showing where the torch can see them (or their own fire).
    const [lx0, ly0] = S.torch, R0 = lightR();
    for (const f of S.demons) {
      const [cx, cy] = dMid(f); if (cx < cam.x - 80 || cx > cam.x + W + 80 || cy < cam.y - 100 || cy > cam.y + H + 100) continue;
      const kindled = f.sin === "wrath" && (f.st === "pickup" || f.st === "windup" || (f.st === "throw" && !f.thrown));
      f.lit += ((kindled || (dist(lx0, ly0, cx, cy) < R0 * 0.9 && los(lx0, ly0, cx, cy))) - f.lit) * 0.15;
      f.p = demonPose(f);
      const al = f.st === "dying" ? 1 - f.t / 0.8 : f.st === "emerge" ? Math.min(1, f.t / 0.5) : 1;
      drawDemon(f.sin, f.x - cam.x, f.y - cam.y, f.dir, f.p, { t: S.rt, lit: Math.max(f.lit, f.brokenT > 0 ? 1 : 0), hurt: f.hurtT / 0.25, windup: f.st === "windup" ? f.t / 0.55 : 0, alpha: al, broken: f.brokenT > 0, belly: f.belly.length });
      if (kindled) { const k = f.st === "pickup" ? f.t / 0.7 : 1, q = demonJoint(f.sin, f.x, f.y, f.dir, f.p, "hF"); f.fireAt = [q[0] - cam.x, q[1] - cam.y - 4, 0.3 + 0.7 * k]; lights.push({ x: q[0] - cam.x, y: q[1] - cam.y, r: 60 + 50 * k, a: 0.8 }); } else f.fireAt = null;
    }
    for (const o of S.things) {
      if (o.st === "held") continue;
      if (o.kind === "fire") { lights.push({ x: o.x - cam.x, y: o.y - cam.y, r: 95, a: 0.85 }); continue; }
      drawBoulder(o.x - cam.x, o.y - cam.y, o.rot, dist(lx0, ly0, o.x, o.y) < R0 * 0.85 ? 1 : 0);
    }
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
    if (S.held) {
      S.held.x = hand[0]; S.held.y = hand[1] - (S.held.kind === "fire" ? 6 : 9);
      if (S.held.kind === "fire") lights.push({ x: S.held.x - cam.x, y: S.held.y - cam.y, r: 80, a: 0.8 });
      else drawBoulder(S.held.x - cam.x, S.held.y - cam.y, 0, 1);
    }
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
    // In the rock: the niches and their idols, the gates; the lamps; the tablets.
    const rimP = new Path2D(), idols = [], embers = []; carved.length = 0;
    for (const sec of view) {
      for (const n of nichesOf(sec)) drawNiche(n, cam, rimP, idols);
      if (sec.type === "trav" && sec.gate) drawGate(sec, cam, rimP, embers);
      for (const L of lampsOf(sec)) drawLamp(L, cam, lights, false);
      if (sec.type === "cave") for (const R of cave(sec).relics) drawRelic(R, cam, false);
    }
    for (const w of vis) drawTablet(w, cam, true);
    if (S.rope && S.ropeVis.length > 1) { const B = bendsOf(S.rope), q = B.length ? B[0] : S.ropeVis[S.ropeVis.length - 2], hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy; drawHook(hx - cam.x, hy - cam.y, Math.atan2(S.rope.y - q.y, S.rope.x - q.x)); }
    if (S.shot && S.shotVis.length > 1) { const sh = S.shot, q = S.shotVis[S.shotVis.length - 2]; drawHook(sh.x - cam.x, sh.y - cam.y, Math.atan2(sh.y - q.y, sh.x - q.x)); }
    for (const q of S.parts) if (q.kind === "chip") { const z = q.big ? 4 : 2; rect(q.x - cam.x - z / 2, q.y - cam.y - z / 2, z, z, "#0b0b0d"); }
    // The dark, and what the torch can see of the rock around it (and into the niches).
    HOLES.clear();
    for (const sec of view) for (const n of nichesOf(sec)) {
      const ia = Math.floor((n.x + n.side * 2) / CELL), ib = Math.floor((n.x + n.side * 38) / CELL);
      for (let i = Math.min(ia, ib); i <= Math.max(ia, ib); i++) for (let j = Math.floor((n.y - 46) / CELL); j <= Math.floor((n.y - 2) / CELL); j++) HOLES.add(holeKey(i, j));
    }
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
    // The idols show their colour in the light, as the demons do.
    for (const I of idols) {
      const c = SINS[I.dom] || SINS.wrath, gI = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.9);
      gI.addColorStop(0, hexA(c.color, 0.55)); gI.addColorStop(0.6, hexA(c.dark, 0.4)); gI.addColorStop(1, hexA(c.dark, 0));
      ctx.fillStyle = gI; ctx.fill(I.path);
    }
    ctx.restore();
    for (const w of vis) drawTablet(w, cam, false);
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
      }
      if (sec.type === "trav" && sec.dom === "wrath") {
        // The pits of Wrath's crossings: embers far down in them.
        const T = trav(sec), yb = -(sec.h0 + 1) * CELL - cam.y;
        if (yb > -40 && yb < H + 60) for (let i = T.a; i <= T.b; i++) if (T.pit[i] && !T.pit[i - 1]) { let e = i; while (T.pit[e + 1]) e++; glowOval((i + e + 1) / 2 * CELL - cam.x, yb + 10, (e - i + 1) * CELL * 0.6, 18, SINS.wrath.color, 0.16 + 0.05 * Math.sin(t * 1.7 + i)); }
        for (const B of T.bridges) if (B.st !== "gone") crackLines(B.i0 * CELL - cam.x, (B.i1 + 1) * CELL - cam.x, -(sec.h0 + 7) * CELL - cam.y, sec.k * 13 + B.i0, B.st === "crack");
      }
      for (const n of nichesOf(sec)) if (n.dom === "wrath") { const T = put(n.x, n.y, n.side, cam), [ex, ey] = T(33.5, 9.5); glow(ex, ey, 7, SINS.wrath.color, 0.5 + 0.2 * Math.sin(t * 3 + n.key)); glow(ex, ey, 3, C.flame, 0.6); }
    }
    for (const c of carved) {
      ctx.globalAlpha = c.k; ctx.fillStyle = "#2c2a28"; ctx.fill(c.path);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60); g.addColorStop(0, "rgba(255,190,110,0.7)"); g.addColorStop(1, "rgba(232,128,58,0.15)");
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke(c.path); ctx.globalAlpha = 1;
    }
    for (const e of embers) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 2.3 + e[0][0] * 0.1); ctx.strokeStyle = "#c8401c"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(e[0][0], e[0][1]); for (let q = 1; q < e.length; q++) ctx.lineTo(e[q][0], e[q][1]); ctx.stroke(); ctx.restore(); }
    for (let s = Math.floor(-(cam.y + H) / CELL / SLOT) - 1; s <= Math.floor(-cam.y / CELL / SLOT) + 1; s++) {
      const isl = s >= 0 && island(s); if (!isl || !isl.crumble || isl.st === "gone") continue;
      crackLines(isl.x0 * CELL - cam.x, (isl.x1 + 1) * CELL - cam.x, -isl.h1 * CELL - cam.y, s, isl.st === "crack");
    }
    for (const f of S.demons) {
      if (!f.p || f.st === "gone") continue;
      if (f.lit < 0.6 && f.st !== "dying") demonEyes(f.sin, f.x - cam.x, f.y - cam.y, f.dir, f.p, { t: S.rt, windup: f.st === "windup" || f.st === "inhale" ? Math.min(1, f.t / 0.55) : 0, alpha: 1 - f.lit });
      if (f.showHp > 0 && alive(f)) { const a = Math.min(1, f.showHp), y = f.y - f.ht - 10 - cam.y; for (let k = 0; k < f.maxHp; k++) circle(f.x - cam.x - (f.maxHp - 1) * 3.5 + k * 7, y, 2.2, k < f.hp ? hexA(SINS[f.sin].color, a) : "rgba(40,40,46," + a + ")"); }
      if (f.fireAt) drawFire(f.fireAt[0], f.fireAt[1], f.fireAt[2], f.id);
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
    if (S.ward) { const [cx, cy] = middle(); glow(cx - cam.x, cy - cam.y, 40, C.warm, 0.12 + 0.05 * Math.sin(S.rt * 4)); }
    // A thrown stone keeps a faint glint of the sin that threw it, so its arc can be read in the dark.
    for (const o of S.things) if (o.st === "fly" && o.by === "demon" && o.kind !== "fire") glow(o.x - cam.x, o.y - cam.y, 9, SINS.wrath.color, 0.45);

    if ((!S.dying || S.dying < 1.2) && !(S.pit && S.pit.t > 0.7)) drawFlame(tx, ty, F.on ? 1.3 : 1, t, { flare: F.on ? 1 : 0, gutter: S.dying ? 1 : clamp((0.18 - S.fuel) / 0.18, 0, 1), vx: S.vx });
    for (const q of S.parts) {
      const a = 1 - q.age / q.life, x = q.x - cam.x, y = q.y - cam.y;
      if (q.kind === "ember") drawEmber(x, y, 1, a);
      else if (q.kind === "spark") { glow(x, y, 6, q.c || C.gold, a * 0.8); circle(x, y, 1, q.c ? mix(q.c, "#ffffff", 0.5) : C.flameHot); }
      else if (q.kind === "smoke") { ctx.globalAlpha = a * 0.5; circle(x, y, q.r * (1 + q.age * 2), q.warm ? "#6a5a48" : "#2c2c30"); ctx.globalAlpha = 1; }
      else if (q.kind === "ring") ring(x, y, 8 + q.age * 90, "rgba(255,241,196," + a + ")", 2);
      else if (q.kind === "draft" && q.px !== undefined) { ctx.globalAlpha = 0.55 * a; line(q.px - cam.x, q.py - cam.y, x, y, "#e8d4b0", 1.2); ctx.globalAlpha = 1; }
    }
    if (F.on) {
      ctx.globalCompositeOperation = "lighter"; rect(0, 0, W, H, "rgba(60,48,30,0.16)"); ctx.globalCompositeOperation = "source-over";
      const [cx, cy] = middle();
      if (F.on) { ctx.setLineDash([4, 6]); ring(cx - cam.x, cy - cam.y, FLARE_R, "rgba(255,241,196,0.25)", 1.2); ctx.setLineDash([]); }
    }
    if (S.whiteT > 0) rect(0, 0, W, H, "rgba(255,246,226," + (S.whiteT * 1.4) + ")");
    // Falling into the pit, the dark closes over; and opens again, by the lamp.
    if (S.pit) rect(0, 0, W, H, "rgba(0,0,0," + clamp(S.pit.t / 0.9, 0, 1) + ")");
    if (S.wake > 0) rect(0, 0, W, H, "rgba(0,0,0," + clamp(S.wake, 0, 1) + ")");
    hud(hM);
  }
  const pad = (s) => ({ x: s < 0 ? 50 : W - 50, y: H - 50, r: 36 });
  const actBtn = () => ({ x: W - 50, y: H - 132, r: 28 });
  const flareBtn = () => ({ x: 50, y: H - 132, r: 28 });
  function hud(hM) {
    const F = S.flare, I = pads();
    text(hM + " m", 16, 30, { font: FONT.title, size: 20, weight: 700, color: "#fff", glow: "rgba(255,179,71,0.5)", blur: 10 });
    text(NOV ? "THE NOVITIATE" : "BEST " + Math.max(save.climbBest || 0, metres(S.top)) + " m", 16, 46, { size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)" });
    if (S.relics) { glow(22, 60, 8, C.gold, 0.4); rect(18, 58, 8, 5, C.gold); poly([18, 58, 26, 58, 22, 55], C.gold); text("× " + S.relics, 30, 63, { size: 8, weight: 700, color: "rgba(232,196,106,0.85)" }); }
    if (S.say) {
      const a = clamp(S.say.t / 0.3, 0, 1) * clamp((3 - S.say.t) / 0.6, 0, 1);
      text(S.say.text, W / 2, 92, { align: "center", font: FONT.title, size: 16, weight: 700, spacing: 4, color: C.gold, alpha: a, glow: "rgba(0,0,0,0.9)", blur: 8 });
      text(S.say.sub, W / 2, 108, { align: "center", size: 8.5, weight: 600, color: "#e9e6df", alpha: a * 0.85, glow: "rgba(0,0,0,0.9)", blur: 6 });
    }
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
      const L = ["A demon. Tap it: strike.  Swipe up: uppercut.  Down: slam.  Across: hurl.  Swing into it: a kick.", "Tap a boulder or a ball of fire, even in the air: catch it; tap again: fling it.  Hold your finger on a demon (or on yourself): the sign of the cross."];
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
    start, edges, solid, island, sectionAt, trav, cave, nichesOf, ledge, get S() { return S; }, get nov() { return NOV; }, CELL, COLS, HOOK, TH, DOMAINS, BUILT,
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
    Climb.draw();
    rect(0, 0, W, H, "rgba(3,3,5,0.82)");
    const cx = Math.min(W * 0.26, 170), bw = 200;
    text("PAUSED", cx, 46, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    let y = 66;
    const b = (label, act, o) => { button(label, cx - bw / 2, y, bw, 30, act, o || {}); y += 38; };
    b("GO ON", () => Climb.resume(), { hot: true });
    b("BEGIN AGAIN", () => { Sound.muffle(false); Game.again(); });
    b(Climb.nov ? "THE NOVITIATE" : "TO THE NOVITIATE", () => Game.toNovitiate());
    b(Sound.muted ? "SOUND: OFF" : "SOUND: ON", () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); });
    b("BACK TO THE TITLE", () => Game.toTitle());
    const mx = Math.max(cx + bw / 2 + 24, W * 0.42);
    const mv = usingKeys()
      ? [["CLICK THE ROCK", "He throws the hook there"], ["W, OR BOTH ARROWS", "Climb the rope or the rock; at a ledge, again to pull up"], ["← →  OR  A D", "Rock the swing to build it; walk; toward a wall: climb it"], ["SPACE", "Let go, leap off a wall, drop what he holds"], ["CLICK A DEMON IN THE LIGHT", "Zip and strike; drag up / down / across: uppercut, slam, hurl; land on it: stomp"], ["CLICK A BOULDER OR WRATH'S FIRE, THEN CLICK", "Catch it (even in the air), then fling it"], ["HOLD THE CLICK ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward"], ["F", "The flare: time slows; fighting refills it"]]
      : [["TAP THE ROCK", "He throws the hook there"], ["BOTH THUMBS", "Climb the rope or the rock; at a ledge, push again to pull up"], ["◀ ▶", "Rock the swing to build it; walk; toward a wall: climb it"], ["THE RIGHT BUTTON", "Let go, leap off a wall, drop what he holds"], ["TAP A DEMON IN THE LIGHT", "Zip and strike; swipe up / down / across: uppercut, slam, hurl; land on it: stomp"], ["TAP A BOULDER OR WRATH'S FIRE, THEN TAP", "Catch it (even in the air), then fling it"], ["HOLD STILL ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward till you move"], ["FLARE", "Time slows; tap anywhere: appear there. Fighting refills it"]];
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
