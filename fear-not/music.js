"use strict";
// Fear Not: the music. Scores for the band in audio.js, played one step at a time, as in
// Luminaries. `L` is how intense the moment is (0–3), set by the game: a dive, a long combo.
// The city is noir jazz on a triplet grid; a fight turns it into kung fu film music, and when
// the fight is won it slides back into the jazz. The desert has a guitar and the angel's choir.

const SONGS = {};

// ---- Noir: "Over the Rooftops" ---------------------------------------------------------------------
// A slow swing in C minor, brushes and a ride cymbal, a walking upright bass, a piano comping,
// and a muted trumpet that comes in when the night gets going. Twelve steps to the bar: each
// step is a triplet eighth, so the swing is written in, not bent.
// Each bar: the bass's four walking notes, the piano's rootless chord, and the trumpet's line
// as [step, note, length in steps].
const NOIR = [
  { walk: [36, 43, 39, 35], v: [58, 62, 63, 67], mel: [[3, 67, 2], [5, 70, 1], [6, 72, 6]] },                         // C minor nine
  { walk: [36, 38, 39, 40], v: [58, 62, 63, 67], mel: [[3, 75, 2], [5, 74, 1], [6, 72, 2], [8, 70, 1], [9, 67, 3]] },
  { walk: [41, 44, 48, 42], v: [56, 60, 63, 67], mel: [[0, 68, 6], [6, 67, 2], [8, 65, 1], [9, 63, 3]] },             // F minor nine
  { walk: [41, 44, 46, 40], v: [56, 62, 67], mel: [[0, 65, 8], [9, 62, 3]] },                                       // B-flat thirteen
  { walk: [39, 43, 46, 45], v: [55, 58, 62, 65], mel: [[0, 63, 3], [3, 67, 2], [5, 70, 1], [6, 74, 6]] },             // E-flat major nine
  { walk: [44, 48, 41, 39], v: [60, 62, 63, 67], mel: [[0, 72, 3], [3, 74, 2], [5, 75, 1], [6, 79, 6]] },             // A-flat major, sharp eleven
  { walk: [38, 41, 44, 42], v: [60, 65, 68], mel: [[0, 77, 3], [3, 75, 2], [5, 72, 1], [6, 68, 6]] },                // D half-diminished
  { walk: [43, 47, 41, 37], v: [53, 56, 59, 62], mel: [[0, 67, 3], [3, 71, 3], [6, 68, 2], [8, 67, 4]] },             // G seven, flat nine
];
const RIDE = { 0: 0.75, 3: 0.85, 5: 0.42, 6: 0.75, 9: 0.85, 11: 0.42 };
SONGS.noir = {
  title: "Over the Rooftops", bpm: 72, bars: [12], beat: 3, duck: 0.1, delay: 0.47,
  play(e) {
    const { t, s, b, sd, L, I } = e, P = NOIR[b % 8];
    // The ride: "ding, ding-a ding, ding-a". At the quietest, only the beats.
    if (RIDE[s] !== undefined && (L > 0 || s % 3 === 0)) I.ride(t, RIDE[s] * (L > 0 ? 1 : 0.55), { decay: s % 3 ? 0.45 : 1.0 });
    if (s === 3 || s === 9) I.hat(t, 0.3, { f: 6500, decay: 0.03, pan: -0.3 });                // the hi-hat foot on two and four
    if (s % 3 === 0) I.brush(t, s === 3 || s === 9 ? 0.85 : 0.5, { dur: sd * 2.6 });           // brushes swept round the snare
    if (L >= 2 && (s === 5 || s === 11) && b % 2) I.brush(t, 0.7, { slap: true, dur: 0.07 });
    if (s === 0) I.kick(t, 0.2, { tone: 44, decay: 0.3, pump: false, click: 0.15 });          // the bass drum, feathered
    if (L >= 2 && s === 8 && b % 4 === 3) I.kick(t, 0.5, { tone: 44, pump: false });          // and a bomb now and then
    // The bass walks in fours; at the quietest it plays in two.
    if (s % 3 === 0) { const q = s / 3; if (L > 0 || q % 2 === 0) I.upright(t, P.walk[q], sd * (L > 0 ? 2.6 : 5.6), q === 0 ? 1 : 0.85); }
    // The piano comps: the Charleston, and its cousins.
    const COMP = [[0, 5], [2, 8], [0, 8], [5, 11]][b % 4];
    if (COMP.includes(s)) I.keys(t, P.v, sd * (s === COMP[0] ? 1.6 : 2.4), L > 0 ? 0.7 : 0.5, { bark: 1.2, rev: 0.3, spread: 0.6 });
    // The muted trumpet.
    if (L >= 1) for (const [st, m, len] of P.mel) if (st === s) I.horn(t, m, len * sd * 0.95, 0.85);
    // The vibes, high, at full flight.
    if (L >= 2 && b % 2 === 1 && (s === 6 || s === 8 || s === 10)) I.vibes(t, P.v[((s - 6) / 2) % P.v.length] + 12, 1.3, 0.5);
  },
};

// ---- The radio: "Two in the Morning" ------------------------------------------------------------
// Almost nothing: a low drone, a dark chord, one piano note falling by a step each bar. When the
// shapes lean close, a heartbeat; then a low, unsettled hum.
const RADIO = [[36, [55, 60, 63, 74], 75], [36, [55, 60, 63, 70], 74], [32, [56, 60, 63, 67], 72], [31, [55, 60, 62, 68], 71]];
SONGS.radio = {
  title: "Two in the Morning", bpm: 56, duck: 0, delay: 0.8,
  play(e) {
    const { t, s, b, sd, L, I } = e, [root, pad, top] = RADIO[b % 4];
    if (s === 0) { I.pad(t, pad, sd * 16, 0.6, { cut: 650, att: 1.2, rel: 1.6, rev: 0.6 }); I.bass(t, root, sd * 15, 0.3, { kind: "sub" }); }
    if (s === (b % 2 ? 8 : 0)) I.keys(t, [top], sd * 6, 0.45, { rev: 0.55, dly: 0.35, bark: 0.8 });
    if (L >= 1 && (s === 0 || s === 3)) I.kick(t, s ? 0.3 : 0.45, { tone: 38, decay: 0.24, pump: false, click: 0 });
    if (L >= 2 && s === 0 && b % 2 === 0) I.choir(t, [43, 44], sd * 15, 0.3, { vowel: "u", att: 1.2, rel: 1.5, vib: 2, rev: 0.7 });
    if (L >= 2 && s === 8 && b % 4 === 3) I.riser(t, sd * 8, 0.5);
  },
};

// ---- The desert: "Night Office" ----------------------------------------------------------------
// A nylon guitar picked slowly in D, warm as adobe. When the angel comes, a choir of light and
// bells; at "Fear not", everything opens.
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
      const m = typeof k === "string" ? P.bass[+k[1]] : P.up[k];
      I.pluck(t, m, sd * 4, typeof k === "string" ? 0.9 : 0.65, { wave: "triangle", cut: 2800, floor: 650, q: 1, decay: 1.5, dly: 0.1, rev: 0.35, pan: typeof k === "string" ? -0.1 : 0.15 });
    }
    if (L >= 1 && s === 0 && b % 2 === 0) I.choir(t, P.choir, sd * 30, 0.4, { vowel: "o", att: 1.4, rel: 2, rev: 0.75, vib: 4 });
    if (L >= 1 && (s === 6 || s === 14) && b % 2) I.bell(t, P.up[3] + 12, 2.2, 0.2, { ratio: 2, index: 0.7, rev: 0.6, dly: 0.3 });
    if (L >= 2 && s === 0) { I.pad(t, P.choir.map((m) => m - 12), sd * 16, 0.5, { cut: 1800, att: 0.8, rel: 1.4, rev: 0.6 }); I.bass(t, 38, sd * 15, 0.3, { kind: "sub" }); }
    if (L >= 2 && s === 8) I.choir(t, [P.choir[2] + 12], sd * 8, 0.25, { vowel: "a", att: 0.4, rel: 1, rev: 0.8 });
  },
};

// ---- The fight: "Sobria Ebrietas" ------------------------------------------------------------------
// Kung fu film music: a funk break, a busy bass, wah guitar, brass stabs, a zheng sweeping up
// the pentatonic scale, and an erhu-like lead with the hook. Gongs at full tilt.
const KF = [
  { bass: [[0, 38], [3, 38], [6, 50], [7, 48], [10, 45], [12, 43], [14, 45]], ch: [62, 65, 69, 72] },            // D minor seven
  { bass: [[0, 38], [3, 38], [6, 50], [7, 48], [10, 45], [12, 48], [14, 50]], ch: [62, 65, 69, 72] },
  { bass: [[0, 36], [3, 36], [6, 48], [7, 46], [10, 43], [12, 45], [14, 46]], ch: [60, 64, 67, 72] },            // C
  { bass: [[0, 34], [3, 34], [6, 46], [8, 33], [10, 45], [12, 48], [14, 49]], ch: [62, 65, 70], ch2: [61, 64, 67, 69] },  // B-flat, then A seven
];
const HOOK = [
  [[0, 74, 2], [2, 77, 2], [4, 79, 2], [6, 81, 4], [10, 84, 2], [12, 81, 2], [14, 79, 2]],
  [[0, 81, 6], [6, 79, 2], [8, 77, 2], [10, 74, 6]],
  [[0, 72, 2], [2, 74, 2], [4, 77, 2], [6, 79, 4], [10, 77, 2], [12, 74, 2], [14, 72, 2]],
  [[0, 70, 4], [4, 69, 4], [8, 73, 4], [12, 76, 4]],
];
const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
SONGS.fight = {
  title: "Sobria Ebrietas", bpm: 124, swing: 0.06, duck: 0.35,
  play(e) {
    const { t, s, b, sd, L, I } = e, bar = b % 4, P = KF[bar], hit = e.fill === "hit";
    // Drums.
    const K = L >= 2 ? "X..x..X...X..x.x" : "X.....X...X..x..";
    if (on(K, s)) I.kick(t, K[s] === "X" ? 1 : 0.75, { tone: 46, decay: 0.32 });
    if (s === 4 || s === 12) I.snare(t, 0.9, { rev: 0.18 });
    if (L >= 1 && (s === 7 || s === 15)) I.snare(t, 0.18, { rev: 0 });
    I.hat(t, s % 4 === 2 ? 0.7 : s % 2 ? 0.3 : 0.5, { open: L >= 2 && s === 14 });
    if (bar === 3 && L >= 1 && s >= 12) I.tom(t, [50, 47, 43, 40][s - 12], 0.8);
    if (s === 0 && (hit || (L >= 3 && b % 8 === 0))) { I.gong(t, 0.9); I.stab(t, [50, 57, 62, 65, 69], 1, { hold: 0.12, decay: 0.5 }); I.impact(t, 0.6); }
    // Bass.
    for (const [st, m] of P.bass) if (st === s) I.bass(t, m, sd * (st === 0 ? 2.5 : 1.5), st === 0 ? 1 : 0.85, { kind: "pluck", cut: 1900, q: 8, floor: 160 });
    const chord = P.ch2 && s >= 8 ? P.ch2 : P.ch;
    // Wah guitar chops and brass.
    if (L >= 1 && on("x.x.xx.x..x.x.x.", s)) I.wah(t, chord.map((m) => m - 12), sd * 1.3, 0.7);
    if (L >= 1 && s === 14 && bar % 2 === 1) I.stab(t, (KF[(bar + 1) % 4].ch).map((m) => m + 12), 0.75);
    if (L >= 1 && s === 0 && bar === 0 && b % 8 === 4) I.stab(t, chord.map((m) => m + 12), 0.8);
    // The zheng sweeps up the scale at the top of each phrase.
    if (L >= 1 && bar === 0 && s < 6) I.zheng(t, [62, 65, 67, 69, 72, 74][s], sd * 2, 0.7, { bend: s === 0 ? 2 : 0 });
    if (L >= 3 && bar === 2 && s >= 10) I.zheng(t, [74, 72, 69, 67, 65, 62][s - 10], sd * 2, 0.6);
    // The hook, on an erhu-like lead.
    if (L >= 2) for (const [st, m, len] of HOOK[bar]) if (st === s) I.lead(t, m, len * sd * 0.95, 0.75, { waves: ["sawtooth"], vib: 22, cut: 2600, q: 2, glide: st ? undefined : m - 2, rev: 0.3, dly: 0.2 });
  },
};

// ---- Home ------------------------------------------------------------------------------------------
// The noir turned tender: E-flat major, the piano alone, then a lullaby on the vibes, and at the
// door the trumpet takes it, its mute off.
const HOME = [
  { bass: 39, v: [55, 58, 62, 65], mel: [[0, 70, 4], [4, 72, 4], [8, 74, 8]] },             // E-flat major nine
  { bass: 36, v: [58, 62, 63, 67], mel: [[0, 75, 6], [6, 74, 2], [8, 72, 8]] },             // C minor nine
  { bass: 44, v: [60, 63, 67, 70], mel: [[0, 72, 4], [4, 70, 4], [8, 67, 8]] },             // A-flat major nine
  { bass: 46, v: [56, 60, 63, 65], v2: [58, 62, 65], mel: [[0, 68, 4], [4, 70, 12]] },     // B-flat, suspended, resolving
];
SONGS.home = {
  title: "Home", bpm: 66, duck: 0, delay: 0.68,
  play(e) {
    const { t, s, b, sd, L, I } = e, P = HOME[b % 4], v = P.v2 && s >= 8 ? P.v2 : P.v;
    if (s === 0 || (P.v2 && s === 8)) I.keys(t, v, sd * 7, 0.6, { bark: 0.9, rev: 0.4 });
    if (s === 6) I.keys(t, [v[v.length - 1] + 12], sd * 3, 0.3, { rev: 0.5, dly: 0.25 });
    if (s === 11) I.keys(t, [v[1] + 12], sd * 3, 0.25, { rev: 0.5, dly: 0.25 });
    if (L >= 1 && (s === 0 || s === 8)) I.upright(t, s ? P.bass + 7 : P.bass, sd * 7, 0.7);
    if (L >= 1 && s === 0) I.pad(t, v, sd * 16, 0.35, { cut: 1500, att: 0.8, rel: 1.2, rev: 0.5 });
    if (L >= 1 && L < 2) for (const [st, m, len] of P.mel) if (st === s) I.vibes(t, m, len * sd * 1.2, 0.55);
    if (L >= 2) for (const [st, m, len] of P.mel) if (st === s) I.horn(t, m, len * sd * 0.98, 0.8, { f: 2200, scoop: 0.97, vib: 12 });
    if (L >= 2 && s % 4 === 0) I.brush(t, s === 4 || s === 12 ? 0.6 : 0.35, { dur: sd * 3.5 });
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
