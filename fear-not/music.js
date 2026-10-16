"use strict";
// Fear Not: the music. Scores for the band in audio.js, played one step at a time, as in
// Luminaries. `L` is how intense the moment is (0–3), set by the game: a leap, a long combo.
// It is jazz techno, the Detroit kind: four on the floor under wide jazz chords on an electric
// piano, a deep bass, a muted trumpet far off in the echo. The city is deep and slow-burning; a
// fight is harder and faster and builds with the combo; when the fight is won it slides back.
// Each song builds over many bars, the filters opening and closing like a tide. The desert and
// the radio have no beat at all, and the Night Office is sung.

const SONGS = {};
const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
// A slow tide over so many bars, rising from 0 to 1 and falling back: how far the filters open.
const tide = (b, s, bars) => { const x = ((b % bars) * 16 + s) / (bars * 8); return x < 1 ? x : 2 - x; };

// ---- Noir: "Over the Rooftops" ------------------------------------------------------------------
// Deep jazz techno in C minor, at 120. At the quietest (the title, a scene, the angel standing on
// a roof): a soft kick, a shaker, the electric piano laying chords across the beat, a sub bass,
// and a dark pad that breathes with the kick. Once the angel is moving, the hats and the clap
// come in, the bass rolls through the offbeats, and a little arpeggio winds round in threes
// against the fours. In the air, a jazz ride, congas, and the vibes. Now and then, high above
// it all, a muted trumpet drenched in echo plays a few long, slow notes.
// Two bars to a chord: C minor eleven, A-flat major nine, F minor nine, then B-flat suspended
// turning to G altered, which pulls back home. The voicings leave out the root, mostly in fourths.
const NOIR = [
  { root: 36, v: [53, 58, 63, 67] },   // C minor eleven
  { root: 36, v: [53, 58, 62, 67] },
  { root: 44, v: [55, 58, 60, 63] },   // A-flat major nine
  { root: 44, v: [55, 58, 62, 63] },   // and the sharp eleven
  { root: 41, v: [56, 60, 63, 67] },   // F minor nine
  { root: 41, v: [56, 58, 63, 67] },   // and the eleven
  { root: 46, v: [56, 60, 63, 65] },   // B-flat nine, suspended
  { root: 43, v: [53, 56, 59, 63] },   // G seven, flat nine, sharp five
];
// The piano's rhythm, two bars of it: [step, length in steps].
const NOIR_COMP = [[[0, 3.5], [6, 1.5], [10, 3]], [[3, 1.5], [6, 2.5], [12, 1.2], [14, 2]]];
// The bass, rolling: [step, interval above the root, loudness].
const NOIR_ROLL = [[2, 0, 1], [3, 12, 0.55], [6, 0, 0.9], [10, 0, 1], [11, 12, 0.55], [14, 0, 0.9], [15, 7, 0.6]];
// The trumpet's line over the eight bars: [bar, step, note, length in steps].
const NOIR_HORN = [
  [0, 4, 67, 10], [1, 2, 70, 2], [1, 4, 72, 11],
  [2, 8, 75, 5], [2, 14, 74, 2], [3, 0, 72, 14],
  [4, 6, 68, 4], [4, 10, 67, 5], [5, 0, 63, 12],
  [6, 4, 65, 4], [6, 8, 70, 8], [7, 0, 71, 6], [7, 8, 68, 7],
];
SONGS.noir = {
  title: "Over the Rooftops", bpm: 120, swing: 0.1, duck: 0.25, delay: 0.375, gain: 0.6,
  play(e) {
    const { t, s, b, sd, L, I } = e, bar = b % 8, P = NOIR[bar], tw = tide(b, s, 32);
    // At the end of each long phrase, once things are moving, the kick drops out for half a bar
    // and the noise rises into the next.
    const lift = L >= 1 && b % 32 === 31 && s >= 8;
    if (lift && s === 8) I.riser(t, sd * 8, 0.4);
    // Drums.
    if (s % 4 === 0 && !lift) I.kick(t, L > 0 ? 0.75 : 0.55, { tone: 54, decay: 0.27 });
    if (s % 4 === 2) I.shaker(t, L > 0 ? 0.8 : 0.65);
    if (L === 0 && bar % 2 && (s === 3 || s === 10)) I.rim(t, 0.45);
    if (L >= 1) {
      if (s === 4 || s === 12) I.clap(t, 0.5, { rev: 0.32 });
      if (s % 4 === 2) I.hat(t, 0.36, { open: true });
      else I.hat(t, s % 2 ? 0.3 : 0.18, { decay: 0.035 });
    }
    if (L >= 2) {
      // The jazz ride over the four: "ding, ding-a ding, ding-a".
      if ([0, 4, 7, 8, 12, 15].includes(s)) I.ride(t, s % 4 ? 0.35 : 0.55, { decay: 0.8 });
      if (on("...x..x...x.x...", s)) I.perc(t, s === 10 ? 57 : 62, 0.55, { pan: 0.35 });
      if (bar % 2 && (s === 6 || s === 8 || s === 10)) I.vibes(t, P.v[(s - 6) / 2 + 1] + 12, 1.1, 0.4);
    }
    // The bass: deep and round at the quietest; then it rolls through the offbeats, its filter
    // opening with the tide.
    if (L === 0) {
      const k = [0, 7, 10].indexOf(s);
      if (k >= 0) I.bass(t, P.root, sd * [3.5, 1, 4][k], k ? 0.65 : 0.8, { kind: "sub" });
    } else for (const [st, iv, v] of NOIR_ROLL) if (st === s) {
      I.bass(t, P.root + iv, sd * (iv ? 0.9 : 1.6), v * 0.85, { kind: "pluck", cut: 600 + 1000 * tw, floor: 230, q: 6, fd: 0.12 });
    }
    // The electric piano.
    for (const [st, len] of NOIR_COMP[b % 2]) if (st === s) I.keys(t, P.v, sd * len, L > 0 ? 0.95 : 0.85, { bark: 1.1, rev: 0.3, spread: 0.7, dly: 0.12 });
    // The pad: two bars to a chord, one each for the last two.
    if (s === 0 && (bar % 2 === 0 || bar === 7)) I.pad(t, P.v, sd * (bar >= 6 ? 15 : 31), L > 0 ? 0.5 : 0.42, { cut: 700 + 1100 * tw, att: 0.9, rel: 1.3, rev: 0.45 });
    // The arpeggio, in threes against the fours, once the angel is moving.
    if (L >= 1 && (b * 16 + s) % 3 === 0) {
      const n = Math.floor((b * 16 + s) / 3), pool = [...P.v, P.v[1] + 12];
      I.pluck(t, pool[n % 5] + 12, sd * 2, 0.5, { cut: 900 + 3200 * tw + (L >= 2 ? 1500 : 0), floor: 380, q: 5, decay: 0.28, dly: 0.4, rev: 0.25, pan: n % 2 ? 0.4 : -0.4 });
    }
    // The trumpet, far off: half the time once the angel is moving, always in the air, and at
    // the quietest only once in a long while.
    const horn = L >= 2 || (L === 1 ? b % 16 >= 8 : b % 32 >= 16 && b % 32 < 24);
    if (horn) for (const [hb, st, m, len] of NOIR_HORN) if (hb === bar && st === s) I.horn(t, m, len * sd * 0.95, 1, { rev: 0.55, dly: 0.42, vib: 12 });
  },
};

// ---- The radio: "Two in the Morning" ------------------------------------------------------------
// Almost nothing, and no beat: a low drone, a dark chord, one piano note falling by a step each
// bar, and a dub chord far off, its echo running away down the empty street. When the shapes
// lean close, a heartbeat; then a low, unsettled hum.
const RADIO = [[36, [55, 60, 63, 74], 75], [36, [55, 60, 63, 70], 74], [32, [56, 60, 63, 67], 72], [31, [55, 60, 62, 68], 71]];
SONGS.radio = {
  title: "Two in the Morning", bpm: 56, duck: 0, delay: 0.8,
  play(e) {
    const { t, s, b, sd, L, I } = e, [root, pad, top] = RADIO[b % 4];
    if (s === 0) { I.pad(t, pad, sd * 16, 0.6, { cut: 650, att: 1.2, rel: 1.6, rev: 0.6 }); I.bass(t, root, sd * 15, 0.3, { kind: "sub" }); }
    if (s === (b % 2 ? 8 : 0)) I.keys(t, [top], sd * 6, 0.4, { rev: 0.55, dly: 0.35, bark: 0.8 });
    if (s === (b % 2 ? 2 : 11)) I.stab(t, pad.slice(0, 3), 0.4, { cut: 1500, floor: 380, hold: 0.01, decay: 0.25, rev: 0.55, dly: 0.9 });
    if (L >= 1 && (s === 0 || s === 3)) I.kick(t, s ? 0.3 : 0.45, { tone: 38, decay: 0.24, pump: false, click: 0 });
    if (L >= 2 && s === 0 && b % 2 === 0) I.choir(t, [43, 44], sd * 15, 0.3, { vowel: "u", att: 1.2, rel: 1.5, vib: 2, rev: 0.7 });
    if (L >= 2 && s === 8 && b % 4 === 3) I.riser(t, sd * 8, 0.5);
  },
};

// ---- The desert: "Night Office" ----------------------------------------------------------------
// Before dawn in a desert cell, and no beat yet: a soft synth picking out a slow figure in D, each
// note echoing off the adobe, and the electric piano's chords breathing underneath. When the angel
// comes, a choir of light and bells; when everything opens, a pad and the bass.
const DESERT = [
  { bass: [38, 45], up: [57, 62, 66, 69], choir: [62, 66, 69] },          // D
  { bass: [38, 43], up: [55, 59, 62, 67], choir: [62, 67, 71] },          // G over D
  { bass: [38, 40], up: [55, 59, 62, 64], choir: [64, 67, 71] },          // E minor seven over D
  { bass: [38, 45], up: [57, 62, 64, 67], choir: [61, 64, 69] },          // A seven, suspended, over D
];
const PICK = { 0: "b0", 2: 0, 4: 1, 6: 2, 8: "b1", 10: 3, 12: 2, 14: 1 };
SONGS.desert = {
  title: "Night Office", bpm: 63, duck: 0, delay: 0.71,
  play(e) {
    const { t, s, b, sd, L, I } = e, P = DESERT[b % 4], k = PICK[s];
    if (k !== undefined) {
      const low = typeof k === "string", m = low ? P.bass[+k[1]] : P.up[k];
      I.pluck(t, m, sd * 4, low ? 0.8 : 0.55, { wave: "square", cut: low ? 1300 : 2000, floor: 420, q: 2, fd: 0.4, decay: 1.2, dly: 0.32, rev: 0.4, pan: low ? -0.15 : (s % 4 ? 0.3 : -0.05) });
    }
    if (s === 0) I.keys(t, P.up, sd * 14, 0.38, { bark: 0.7, rev: 0.5, spread: 0.8 });
    if (L >= 1 && s === 0 && b % 2 === 0) I.choir(t, P.choir, sd * 30, 0.4, { vowel: "o", att: 1.4, rel: 2, rev: 0.75, vib: 4 });
    if (L >= 1 && (s === 6 || s === 14) && b % 2) I.bell(t, P.up[3] + 12, 2.2, 0.2, { ratio: 2, index: 0.7, rev: 0.6, dly: 0.3 });
    if (L >= 2 && s === 0) { I.pad(t, P.choir.map((m) => m - 12), sd * 16, 0.5, { cut: 1800, att: 0.8, rel: 1.4, rev: 0.6 }); I.bass(t, 38, sd * 15, 0.3, { kind: "sub" }); }
    if (L >= 2 && s === 8) I.choir(t, [P.choir[2] + 12], sd * 8, 0.25, { vowel: "a", att: 0.4, rel: 1, rev: 0.8 });
  },
};

// ---- The fight: "Sobria Ebrietas" ---------------------------------------------------------------
// Harder and faster, in D minor, at 126: a driving kick and clap, a bass rolling through every gap
// the kick leaves, the electric piano stabbing out wide chords, and brass stabs pushing into each
// new one. It builds with the combo: the hats open and an arpeggio spins; then strings swell,
// congas come in, and a muted trumpet calls; at full flight a jazz ride, and the synth-brass hook
// answers the trumpet. The filters rise and fall over sixteen bars, and a clap roll lifts each
// long phrase into the next.
// D minor eleven, B-flat major with the sharp eleven, C thirteen suspended, G minor eleven, and
// A altered, which pulls back to D.
const FIGHT = [
  { root: 38, v: [55, 60, 65, 69] },   // D minor eleven, in fourths
  { root: 38, v: [55, 60, 64, 69] },
  { root: 46, v: [53, 57, 60, 64] },   // B-flat major nine, sharp eleven
  { root: 46, v: [53, 57, 62, 64] },
  { root: 36, v: [58, 62, 65, 69] },   // C thirteen, suspended
  { root: 36, v: [58, 62, 64, 69] },
  { root: 43, v: [58, 60, 65, 69] },   // G minor eleven
  { root: 45, v: [55, 58, 61, 65] },   // A seven, flat nine, sharp five
];
const FIGHT_ROLL = [[2, 0, 1], [3, 12, 0.6], [6, 0, 0.95], [7, 0, 0.6], [10, 0, 1], [11, 12, 0.6], [13, 12, 0.65], [14, 0, 0.95], [15, 7, 0.7]];
// The trumpet's call, on the even bars: [step, note, length in steps].
const FIGHT_CALL = [[6, 69, 1], [8, 72, 2], [10, 74, 1], [11, 77, 3], [14, 74, 2]];
// The hook that answers it, bar by bar.
const FIGHT_HOOK = [
  [[0, 74, 3], [3, 77, 3], [6, 79, 2], [8, 81, 6], [14, 79, 2]],
  [[0, 77, 3], [3, 76, 3], [6, 74, 10]],
  [[0, 76, 3], [3, 77, 3], [6, 81, 2], [8, 84, 6], [14, 81, 2]],
  [[0, 79, 6], [6, 77, 2], [8, 76, 8]],
  [[0, 74, 3], [3, 77, 3], [6, 79, 2], [8, 82, 6], [14, 81, 2]],
  [[0, 79, 3], [3, 77, 3], [6, 76, 10]],
  [[0, 77, 4], [4, 74, 4], [8, 72, 4], [12, 70, 4]],
  [[0, 73, 4], [4, 77, 4], [8, 79, 4], [12, 82, 4]],
];
SONGS.fight = {
  title: "Sobria Ebrietas", bpm: 126, swing: 0.06, duck: 0.35, delay: 0.357,
  play(e) {
    const { t, s, b, sd, L, I } = e, bar = b % 8, P = FIGHT[bar], hit = e.fill === "hit", tw = tide(b, s, 16);
    // Drums.
    if (s % 4 === 0) I.kick(t, 0.85, { tone: 53, decay: 0.26 });
    if (L >= 2 && bar === 7 && s === 14) I.kick(t, 0.5, { tone: 53, decay: 0.2 });
    if (s === 4 || s === 12) { I.clap(t, 0.75, { rev: 0.25 }); if (L >= 2) I.snare(t, 0.32, { rev: 0.1 }); }
    if (s % 4 === 2) I.hat(t, L >= 1 ? 0.45 : 0.55, { open: L >= 1 });
    else if (L >= 1) I.hat(t, s % 2 ? 0.36 : 0.22, { decay: 0.035 });
    if (L >= 2 && s % 2 === 1) I.shaker(t, 0.6);
    if (L >= 2 && on("..x..x.x...x.x..", s)) I.perc(t, [60, 55, 67][s % 3], 0.5, { pan: s % 2 ? 0.4 : -0.3 });
    if (L >= 3 && [0, 4, 7, 8, 12, 15].includes(s)) I.ride(t, s % 4 ? 0.35 : 0.55, { decay: 0.7 });
    if (L >= 1 && b % 16 === 7 && s >= 12) I.tom(t, [50, 48, 45, 43][s - 12], 0.7);
    if (L >= 1 && b % 16 === 15 && s >= 8) I.clap(t, 0.25 + 0.07 * (s - 8), { rev: 0.2, decay: 0.12 });
    // At a new wave, and at the top of each phrase at full flight: a crash and a big chord.
    if (s === 0 && (hit || (L >= 3 && b % 8 === 0))) {
      I.impact(t, hit ? 0.6 : 0.35); I.hat(t, 0.8, { open: true }); I.ride(t, 0.9, { bell: true, decay: 1.8 });
      I.stab(t, [50, 55, 60, 65, 69, 74], 1, { hold: 0.14, decay: 0.7, cut: 4200, floor: 900 });
    }
    // The bass: on the offbeats at first, then rolling.
    if (L === 0) { if (s % 4 === 2) I.bass(t, P.root, sd * 1.6, 0.85, { kind: "pluck", cut: 800 + 600 * tw, floor: 230, q: 6 }); }
    else for (const [st, iv, v] of FIGHT_ROLL) if (st === s) {
      I.bass(t, P.root + iv, sd * (v > 0.8 ? 1.5 : 0.9), v * 0.85, { kind: "pluck", cut: 700 + 1500 * tw + L * 200, floor: 230, q: 7, fd: 0.1, drive: L >= 3 ? 0.6 : 0.4 });
    }
    // The electric piano.
    const comp = L === 0 ? [3, 10] : L === 1 || bar % 2 ? [3, 6, 10, 13] : [0, 3, 6, 10, 13];
    if (comp.includes(s)) I.keys(t, P.v, sd * (s === 0 ? 3 : 1.2), 0.85, { bark: 1.8, rev: 0.22, dly: 0.2 });
    // Brass stabs pushing into the next chord.
    if (L >= 1 && s === 14 && bar % 2 === 1) I.stab(t, FIGHT[(bar + 1) % 8].v.map((m) => m + 12), 0.8, { cut: 1800 + 2400 * tw, floor: 700 });
    // Strings: two bars to a chord, one each for the last two.
    if (L >= 2 && s === 0 && (bar % 2 === 0 || bar === 7)) I.pad(t, P.v, sd * (bar >= 6 ? 15 : 31), 0.5, { cut: 1100, sweep: 3600, att: 0.4, rel: 0.9 });
    // The arpeggio: in eighths, then sixteenths.
    if (L >= 1 && (L >= 2 || s % 2 === 0)) {
      const n = b * 16 + s, pool = [...P.v, P.v[1] + 12];
      I.pluck(t, pool[(L >= 2 ? n : n / 2) % 5] + 12, sd, 0.38, { cut: 1000 + 3500 * tw, floor: 420, q: 6, decay: 0.16, dly: 0.25, rev: 0.15, pan: n % 4 < 2 ? 0.45 : -0.45 });
    }
    // The trumpet calls in the first half of each long phrase; at full flight, the hook answers
    // in the second (and takes over the whole of it).
    const half = b % 16 >= 8;
    if (L === 2 && !half && bar % 2 === 0) for (const [st, m, len] of FIGHT_CALL) if (st === s) I.horn(t, m, len * sd * 0.95, 1, { rev: 0.4, dly: 0.3, vib: 8 });
    if (L >= 3 || (L === 2 && half)) for (const [st, m, len] of FIGHT_HOOK[bar]) if (st === s) {
      I.lead(t, m, len * sd * 0.95, 0.75, { waves: ["sawtooth", "sawtooth"], cut: 2200, q: 2, vib: 9, rev: 0.3, dly: 0.25, att: 0.015 });
    }
  },
};

// ---- Home --------------------------------------------------------------------------------------
// The city turned tender, in E-flat major, a little slower: the electric piano alone at first. As
// the lights come on, a soft pulse, a bass, a pad; at the door, the whole band, gentle, and the
// trumpet takes the tune with its mute off.
const HOME = [
  { bass: 39, v: [55, 58, 62, 65], mel: [[0, 70, 4], [4, 72, 4], [8, 74, 8]] },             // E-flat major nine
  { bass: 36, v: [58, 62, 63, 67], mel: [[0, 75, 6], [6, 74, 2], [8, 72, 8]] },             // C minor nine
  { bass: 44, v: [60, 63, 67, 70], mel: [[0, 72, 4], [4, 70, 4], [8, 67, 8]] },             // A-flat major nine
  { bass: 46, v: [56, 60, 63, 65], v2: [58, 62, 65], mel: [[0, 68, 4], [4, 70, 12]] },     // B-flat, suspended, resolving
];
SONGS.home = {
  title: "Home", bpm: 112, swing: 0.1, duck: 0.15, delay: 0.4, gain: 0.72,
  play(e) {
    const { t, s, b, sd, L, I } = e, P = HOME[b % 4], v = P.v2 && s >= 8 ? P.v2 : P.v;
    // The electric piano: the chord, then a soft answer high up.
    if (s === 0 || (P.v2 && s === 8)) I.keys(t, v, sd * (P.v2 ? 7 : 9), 0.6, { bark: 0.9, rev: 0.4 });
    if (s === 10) I.keys(t, [v[v.length - 1] + 12], sd * 3, 0.3, { rev: 0.5, dly: 0.3 });
    if (s === 14 && L < 2) I.keys(t, [v[1] + 12], sd * 2, 0.24, { rev: 0.5, dly: 0.3 });
    // As the lights come on.
    if (L >= 1) {
      if (s % 4 === 0) I.kick(t, L >= 2 ? 0.6 : 0.42, { tone: 44, decay: 0.3, click: 0.3 });
      if (s % 4 === 2) I.shaker(t, 0.7);
      const k = [0, 7, 10].indexOf(s);
      if (k >= 0) I.bass(t, P.bass, sd * [3.5, 1, 4][k], k ? 0.75 : 0.95, { kind: "sub" });
      if (s === 0) I.pad(t, v, sd * 16, 0.32, { cut: 1500, att: 0.8, rel: 1.2, rev: 0.5 });
    }
    if (L === 1) for (const [st, m, len] of P.mel) if (st === s) I.vibes(t, m, len * sd * 1.2, 0.5);
    // At the door.
    if (L >= 2) {
      if (s === 4 || s === 12) I.clap(t, 0.35, { rev: 0.5 });
      if (s % 4 === 2) I.hat(t, 0.3, { open: true });
      for (const [st, m, len] of P.mel) if (st === s) I.horn(t, m, len * sd * 0.98, 0.8, { f: 2200, scoop: 0.97, vib: 12, rev: 0.5, dly: 0.25 });
    }
  },
};

// ---- Vigils: "Domine, labia mea aperies" --------------------------------------------------------
// The opening versicle of the Night Office, sung on a simple tone: the cantor alone, then the
// choir answers. [syllable, note, length in sixteenths, vowel]. After it, silence.
const CANTOR = [["Do", 53, 3, "o"], ["mi", 55, 3, "i"], ["ne,", 57, 5, "e"], ["la", 57, 3, "a"], ["bi", 57, 3, "i"], ["a", 57, 3, "a"], ["me", 58, 4, "e"], ["a", 57, 4, "a"],
  ["a", 57, 3, "a"], ["pe", 55, 3, "e"], ["ri", 57, 3, "i"], ["es.", 55, 10, "e"]];
const CHOIR = [["Et", 53, 3, "e"], ["os", 55, 4, "o"], ["me", 57, 3, "e"], ["um", 57, 3, "u"], ["an", 57, 3, "a"], ["nun", 57, 3, "u"], ["ti", 57, 3, "i"], ["a", 57, 3, "a"],
  ["bit", 57, 3, "i"], ["lau", 58, 5, "a"], ["dem", 57, 3, "e"], ["tu", 55, 4, "u"], ["am.", 53, 12, "a"]];
const CHANT = (() => {
  const out = []; let at = 4;
  for (const [, m, len, vw] of CANTOR) { out.push([at, [m], len, vw, 0.55]); at += len; }
  at += 10;
  for (const [, m, len, vw] of CHOIR) { out.push([at, [m, m - 12], len, vw, 0.75]); at += len; }
  return out;
})();
SONGS.chant = {
  title: "Domine, labia mea aperies", bpm: 84, duck: 0, delay: 0.7,
  play(e) {
    const { t, s, b, sd, I } = e, at = b * 16 + s;
    for (const [st, notes, len, vw, v] of CHANT) if (st === at) I.choir(t, notes, len * sd * 0.98, v, { vowel: vw, att: 0.06, rel: 0.25, vib: 2.5, rev: 0.75 });
  },
};

// Silence, for the cut to the desert: nothing at all.
SONGS.silence = { title: "", bpm: 60, play() { } };
