"use strict";
// Luminaries: songs for the Fathers from St. John Chrysostom to St. Bede.

// Iste Confessor, the Office hymn for Doctors (mode 8, Antiphonale Monasticum, 1934): its three
// distinct lines (the second repeats the first).
const ISTE = [
  [[67, 0.5], [69, 0.5], [67, 1], [64, 1], [65, 1], [64, 0.5], [62, 0.5], [62, 0.5], [64, 0.5], [60, 1], [64, 1], [67, 1], [69, 1], [69, 1.5], [67, 2.5]],
  [[72, 0.5], [71, 0.5], [69, 1], [72, 1], [71, 0.5], [69, 0.5], [67, 0.5], [65, 0.5], [69, 1], [72, 1], [71, 1], [69, 1], [67, 1], [69, 0.5], [71, 0.5], [69, 2]],
  [[67, 1], [64, 1], [65, 1], [67, 1.5], [67, 3.5]],
];

// ---- St. John Chrysostom: "Golden Mouth" ----------------------------------------------------------
// Big-band gospel-funk in E-flat: a brass section, a preacher's talkbox, and a congregation
// that answers him.
SONGS.chrysostom = {
  title: "Golden Mouth", bpm: 104, swing: 0.14, duck: 0.38,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[39, [55, 58, 62, 65]], [44, [56, 60, 63, 67]], [46, [56, 58, 62, 65]], [44, [55, 60, 63, 67]]];
    const [root, chord] = prog[b % 4];
    const K = L >= 2 ? "X..x..X...X..x.." : "X.....X...X.....";
    if (on(K, s)) I.kick(t, acc(K, s), { tone: 46, decay: 0.38 });
    if (s === 4 || s === 12) { I.snare(t, 0.85, { rev: 0.25 }); I.clap(t, 0.5); }
    I.hat(t, s % 2 ? 0.28 : 0.5, { open: L >= 1 && s === 6 });
    if (L >= 1 && s % 2) I.shaker(t, 0.5);
    // A fat, bouncing bass with octave pops.
    const B = [[0, 0, 2], [3, 0, 1], [4, 12, 1], [6, 0, 1], [7, 10, 1], [10, 7, 2], [12, 0, 1], [14, 12, 1], [15, 10, 1]];
    for (const [st, iv, len] of B) if (st === s && (L > 0 || st % 4 !== 3)) I.bass(t, root + iv, len * sd * 0.9, 0.9, { cut: 2000, q: 8 });
    // The organ-ish keys keep the church warm.
    if (s === 0) I.keys(t, chord, sd * 15, 0.6, { rev: 0.35 });
    // The brass: shout chorus stabs, the section answering itself.
    if (L >= 1 && [2, 7, 10].includes(s)) I.stab(t, chord.map((m) => m + 12), s === 10 ? 0.85 : 0.6, { cut: 5200, hold: s === 10 ? 0.12 : 0.04 });
    if (L >= 2 && s === 0 && b % 2) I.stab(t, [chord[0] + 12, chord[2] + 12, chord[3] + 12, chord[0] + 24], 0.9, { cut: 5600, hold: 0.25, decay: 0.4 });
    // The preacher: a talkbox phrase, and the congregation's "oh" in reply.
    if (L >= 2 && b % 2 === 0) { const P = [[0, 70, 1], [2, 72, 1], [4, 75, 2], [8, 77, 1], [10, 75, 1], [12, 72, 2]]; for (const [st, m, len] of P) if (st === s) I.vox(t, m, len * sd * 1.8, 0.75, { vowel: st % 4 ? "o" : "a", glide: m - 2 }); }
    if (L >= 2 && b % 2 === 1 && (s === 0 || s === 6)) I.choir(t, chord.map((m) => m + 12), sd * 4, 0.55, { vowel: "o", att: 0.03 });
    if (L >= 3 && s === 12 && b % 4 === 3) I.riser(t, sd * 4, 0.5);
    if (L >= 3 && s % 4 === 2) I.bell(t, chord[(s / 2 + b) % 4] + 24, 0.5, 0.2, { ratio: 3, index: 1.5 });
  },
};

// ---- St. Jerome: "Vulgate" -------------------------------------------------------------------------
// Pared down and serious: A minor, a dry kick and a rimshot, a bass that never wastes a note,
// a clavinet scratching like a pen. The lion purrs underneath.
SONGS.jerome = {
  title: "Vulgate", bpm: 94, swing: 0.08, duck: 0.3,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const roots = [45, 45, 43, 41], root = roots[b % 4];
    if (s === 0 || s === 10 || (L >= 2 && s === 7)) I.kick(t, 0.95, { tone: 44, decay: 0.3, click: 1.4 });
    if (s === 4 || s === 12) I.rim(t, 0.9, { f: 1500 });
    if (L >= 1 && (s === 4 || s === 12)) I.snare(t, 0.45, { rev: 0.05, decay: 0.08 });
    if (s % 2 === 0 || L >= 2) I.hat(t, s % 4 === 2 ? 0.45 : 0.2, { decay: 0.03 });
    // The bass: few notes, each one exact.
    const B = [[0, 0, 3], [3, 0, 1], [6, 12, 1], [8, 7, 2], [11, 3, 1], [14, 5, 2]];
    for (const [st, iv, len] of B) if (st === s && (L > 0 || st === 0 || st === 8)) I.bass(t, root + iv, len * sd * 0.8, 0.95, { kind: "pluck", cut: 1600, q: 6, floor: 200, sus: 0.5 });
    // The clavinet: the pen scratching.
    if (L >= 1) { const C = [1, 3, 6, 9, 11, 14]; if (C.includes(s)) I.pluck(t, (s % 3 ? 69 : 72) + (root - 45), sd * 0.4, 0.4, { wave: "square", cut: 3800, q: 12, floor: 900, fd: 0.05, decay: 0.08, dly: 0, pan: s % 2 ? 0.3 : -0.3 }); }
    // The lion, purring: a low sustained drone.
    if (s === 0 && b % 2 === 0) I.bass(t, 33, sd * 32, 0.3, { kind: "reese", cut: 220, drive: 0.2 });
    // A single candle of a melody, late.
    if (L >= 2 && b % 2 === 0) { const M = [[0, 76, 3], [6, 74, 1], [8, 72, 4], [14, 71, 2]]; for (const [st, m, len] of M) if (st === s) I.lead(t, m, sd * len, 0.42, { waves: ["triangle", "sine"], cut: 2400, vib: 8, rev: 0.4 }); }
    if (L >= 3 && s === 0) I.pad(t, [57, 60, 64, 67].map((m) => m + (root - 45)), sd * 16, 0.3, { cut: 1100, att: 0.6 });
  },
};

// ---- St. Cyril of Alexandria: "Theotokos" --------------------------------------------------------
// Stately at first, a procession under the Pharos; then the city pours out with torches,
// singing her name, as Ephesus did the night of the council.
SONGS.cyrilalex = {
  title: "Theotokos", bpm: 112, swing: 0.06, duck: 0.36,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[38, [62, 66, 69, 73]], [43, [62, 67, 71, 74]], [35, [62, 66, 69, 71]], [45, [61, 64, 67, 69]]];
    const [root, chord] = prog[b % 4];
    // The procession: a slow, deep drum at first.
    if (L === 0) { if (s === 0 || s === 8) I.tom(t, 40, 0.9, { decay: 0.5 }); if (s === 12) I.tom(t, 45, 0.5); }
    else {
      const K = L >= 2 ? "X...X...X...X..x" : "X.....X...X.....";
      if (on(K, s)) I.kick(t, acc(K, s), { tone: 45, decay: 0.34 });
      if (s === 4 || s === 12) I.clap(t, 0.8, { rev: 0.4 });
      I.hat(t, s % 4 === 2 ? 0.6 : 0.22, { open: L >= 2 && s % 4 === 2 });
    }
    if (s === 0) I.pad(t, chord, sd * 16, 0.5, { cut: 1400 + L * 600, att: 0.3 });
    if (s % 8 === 0 || (L >= 1 && s % 4 === 0) || (L >= 2 && s % 4 === 3)) I.bass(t, root + (s === 8 ? 7 : 0), sd * (L ? 1.6 : 7), 0.85, { kind: L ? "pluck" : "sub", cut: 1600, q: 5 });
    if (L === 0 && s % 2 === 0) I.hat(t, s % 4 === 2 ? 0.35 : 0.15, { decay: 0.04 });
    // The torches: crackling percussion, left and right.
    if (L >= 2 && [1, 3, 6, 9, 11, 14].includes(s)) I.perc(t, 72 + (s % 3) * 5, 0.5, { pan: s % 2 ? 0.6 : -0.6 });
    // The people singing "Theotokos" (her name, sung on four notes).
    if (L >= 1 && b % 2 === 0) { const V = [[0, 74, 2], [4, 76, 2], [8, 78, 3], [14, 76, 2]]; for (const [st, m, len] of V) if (st === s) I.choir(t, L >= 2 ? [m, m - 12, chord[1]] : [m], len * sd * 1.9, 0.8, { vowel: ["e", "o", "o", "o"][st / 4 | 0] || "o", att: 0.05 }); }
    if (L >= 3 && s % 2 === 0) I.pluck(t, chord[(s / 2) % 4] + 24, sd * 0.6, 0.26, { wave: "triangle", cut: 6000, dly: 0.3, pan: Math.sin(s) * 0.6 });
    if (L >= 3 && s === 0 && b % 4 === 0) I.impact(t, 0.5);
  },
};

// ---- St. Peter Chrysologus: "Golden Word" -------------------------------------------------------
// Short and punchy, as his sermons were. Three loops at once, in three, against the four of
// the beat: prayer, fasting and mercy, which "give life to one another".
SONGS.chrysologus = {
  title: "Golden Word", bpm: 122, duck: 0.45,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const n = b * 16 + s, roots = [48, 48, 51, 46], root = roots[b % 4];
    if (s % 4 === 0) I.kick(t, 1, { tone: 47, decay: 0.3 });
    if (s === 4 || s === 12) I.snare(t, 0.8, { rev: 0.15, f: 2400 });
    I.hat(t, s % 2 ? 0.25 : 0.45, { open: s % 4 === 2 });
    if (s % 2 === 0) I.bass(t, root + (s % 8 === 4 ? 12 : 0), sd * 0.8, 0.85, { kind: "square", cut: 1500, q: 10, floor: 260, fd: 0.07 });
    // Prayer: a loop of three steps.
    if (n % 3 === 0) I.pluck(t, root + 24 + [0, 3, 7][(n / 3) % 3 | 0], sd * 0.6, 0.32, { wave: "sawtooth", cut: 4400, q: 8, fd: 0.06, pan: -0.5, dly: 0.15 });
    // Fasting: a loop of five, spare and high.
    if (L >= 1 && n % 5 === 0) I.bell(t, root + 31 + [0, 5, 3][(n / 5) % 3 | 0], 0.4, 0.3, { ratio: 2, index: 1.2, pan: 0.5 });
    // Mercy: a loop of seven, a warm chord.
    if (L >= 2 && n % 7 === 0) I.stab(t, [root + 12, root + 15, root + 19, root + 22], 0.55, { cut: 3200, hold: 0.05 });
    if (L >= 2 && s === 0) I.pad(t, [root + 12, root + 15, root + 19], sd * 16, 0.32, { cut: 1300 });
    // The preacher's three words.
    if (L >= 3 && b % 2 === 0) for (const [st, m] of [[0, 72], [4, 75], [8, 79]]) if (st === s) I.vox(t, m + (root - 48), sd * 3, 0.7, { vowel: "o" });
  },
};

// ---- St. Leo the Great: "Lion of Rome" -------------------------------------------------------------
// Majestic, half-time, F minor: horns over the walls of Rome, a growl in the bass, and the
// slow step of one who walked out to meet Attila.
SONGS.leo = {
  title: "Lion of Rome", bpm: 86, duck: 0.5,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[41, [56, 60, 63, 68]], [37, [56, 61, 65, 68]], [39, [55, 58, 63, 67]], [36, [55, 60, 64, 67]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || (L >= 1 && s === 11)) I.kick(t, 1, { tone: 42, decay: 0.5, drive: 0.4 });
    if (s === 8) { I.snare(t, 1, { rev: 0.45, decay: 0.3 }); I.clap(t, 0.6, { rev: 0.5 }); }
    if (L >= 1) I.hat(t, s % 2 ? 0.2 : 0.4, { decay: 0.06 });
    if (L >= 2 && s % 4 === 2) I.tom(t, 43 + (s % 8 === 6 ? 3 : 0), 0.45);
    // The growl.
    if (s === 0 || s === 11) I.bass(t, root, sd * (s ? 5 : 10), 0.9, { kind: "reese", cut: 500, drive: 0.6 });
    // The horns: long, noble, bright on top.
    if (s === 0) I.pad(t, chord, sd * 16, 0.55, { cut: 1600 + L * 400, att: 0.12, wave: "sawtooth" });
    if (L >= 1 && s === 0) I.stab(t, chord.map((m) => m + 12), 0.8, { cut: 3000, hold: 0.5, decay: 0.8, rev: 0.45 });
    if (L >= 2) { const H = [[0, 72, 6], [6, 75, 2], [8, 77, 6], [14, 75, 2]]; for (const [st, m, len] of H) if (st === s && b % 2 === 0) I.lead(t, m + (chord[0] - 56), sd * len, 0.5, { waves: ["sawtooth", "sawtooth"], cut: 2200, vib: 6, att: 0.06, rev: 0.4 }); }
    if (L >= 3 && s === 0 && b % 4 === 0) I.impact(t, 0.7);
    if (L >= 3 && s === 12 && b % 4 === 3) I.riser(t, sd * 4, 0.6);
  },
};

// ---- St. Gregory the Great: "Servus Servorum" ---------------------------------------------------
// The chant that bears his name, over a slow-rolling groove in mode 8: the Doctors' own
// hymn, Iste Confessor, sung line by line, with a dove's cooing synth answering.
SONGS.gregory = {
  title: "Servus Servorum", bpm: 98, swing: 0.1, duck: 0.35,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[43, [59, 62, 67, 71]], [41, [60, 65, 69, 72]], [36, [60, 64, 67, 72]], [38, [57, 62, 65, 69]]];
    const [root, chord] = prog[b % 4];
    if (L >= 1) {
      if (s === 0 || s === 10 || (L >= 2 && s === 3)) I.kick(t, 0.9, { tone: 45, decay: 0.36 });
      if (s === 4 || s === 12) I.snare(t, 0.6, { rev: 0.35 });
      I.hat(t, s % 4 === 2 ? 0.5 : 0.2, { open: L >= 2 && s === 14 });
    } else if (s === 0) I.tom(t, 43, 0.5, { decay: 0.6 });
    if (s === 0) I.pad(t, chord, sd * 16, 0.5, { cut: 1600, att: 0.4, rel: 0.8 });
    if (L >= 1 && [0, 6, 10].includes(s)) I.bass(t, root + (s === 6 ? 7 : 0), sd * 2.5, 0.85, { kind: "sub" });
    // The hymn, two bars to a line: line one, line one again, line two, the last line.
    const k = [0, 0, 1, 2][Math.floor(b / 2) % 4];
    melodyAt(ISTE[k], 0, (b % 2) * 16 + s, (m, len) => I.choir(t, L >= 2 ? [m, m - 12] : [m], len * 2 * sd * 0.95, 0.85, { vowel: "a", att: 0.04, rel: 0.3 }));
    // The dove at his ear.
    if (L >= 2 && b % 2 === 1 && (s === 8 || s === 11)) I.lead(t, 79 + (s === 11 ? -3 : 0), sd * 2.5, 0.3, { waves: ["sine", "triangle"], cut: 4000, vib: 18, glide: 83, dly: 0.4 });
    if (L >= 3 && s % 4 === 1) I.keys(t, [chord[(s >> 2) % 4] + 12], sd * 2, 0.35, { dly: 0.2 });
  },
};

// ---- St. Isidore of Seville: "Etymologiae" -------------------------------------------------------
// The patron of the internet, as some say: chiptune funk, every sound built from the simplest
// waves, like an encyclopedia built from letters.
SONGS.isidore = {
  title: "Etymologiae", bpm: 126, swing: 0.1, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[40, [64, 67, 71]], [36, [64, 67, 72]], [38, [62, 66, 69]], [35, [63, 66, 71]]];
    const [root, chord] = prog[b % 4];
    if (s % 4 === 0 || (L >= 2 && s === 14)) I.kick(t, 0.95, { tone: 50, decay: 0.22, punch: 300, sweep: 0.03 });
    if (s === 4 || s === 12) I.snare(t, 0.7, { rev: 0.05, decay: 0.1, f: 3200 });
    if (s % 2 === 0) I.hat(t, 0.3, { decay: 0.02, f: 9000 });
    // A square-wave bass that hops octaves like an old console.
    I.bass(t, root + (s % 2 ? 12 : 0) + (s === 14 ? 7 : 0), sd * 0.7, s % 2 ? 0.55 : 0.85, { kind: "square", cut: 2400, q: 2, floor: 1200, fd: 0.05 });
    // The arpeggio: the chord, letter by letter, very fast.
    if (L >= 1) I.pluck(t, chord[s % 3] + 12 + (s >= 8 ? 12 : 0), sd * 0.5, 0.28, { wave: "square", cut: 7000, q: 1, floor: 5000, decay: 0.07, dly: 0.1, pan: 0.3 });
    // The tune, in pulses.
    if (L >= 2 && b % 2 === 0) { const M = [[0, 76, 2], [2, 79, 1], [3, 78, 1], [4, 76, 2], [8, 71, 2], [10, 74, 2], [12, 76, 4]]; for (const [st, m, len] of M) if (st === s) I.lead(t, m, sd * len * 0.9, 0.42, { waves: ["square", "square"], cut: 6000, env: false, oct: L >= 3 }); }
    if (L >= 2 && b % 2 === 1 && [0, 3, 6].includes(s)) I.lead(t, chord[s / 3] + 12, sd * 2, 0.35, { waves: ["triangle", "square"], cut: 5000, env: false });
    if (L >= 3 && s === 0) I.pad(t, chord.map((m) => m - 12), sd * 16, 0.25, { wave: "square", cut: 1600, voices: 3 });
  },
};

// ---- St. Bede the Venerable: "The Sparrow" -------------------------------------------------------
// Northumbrian folk-funk: a harp, a bodhrán, a tin whistle, and a bass that lilts, the sea
// wind round the monastery at Jarrow.
SONGS.bede = {
  title: "The Sparrow", bpm: 108, swing: 0.3, duck: 0.32,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[38, [62, 66, 69]], [36, [60, 64, 67]], [43, [62, 67, 71]], [38, [62, 66, 69]]];
    const [root, chord] = prog[b % 4];
    // The bodhrán.
    if (s % 4 === 0) I.tom(t, 38, s % 8 ? 0.6 : 0.9, { decay: 0.25 });
    if (s % 4 === 2 || (L >= 1 && s % 4 === 3)) I.tom(t, 45, 0.35, { decay: 0.12 });
    if (L >= 1 && (s === 4 || s === 12)) I.snare(t, 0.5, { rev: 0.2, decay: 0.12 });
    if (L >= 1 && s === 0) I.kick(t, 0.8, { tone: 45 });
    I.hat(t, L >= 2 ? (s % 2 ? 0.2 : 0.35) : (s % 2 ? 0 : 0.22), { decay: 0.04 });
    // The lilting bass.
    for (const [st, iv] of [[0, 0], [3, 7], [6, 12], [8, 0], [11, 7], [14, 10]]) if (st === s && (L > 0 || st % 8 === 0)) I.bass(t, root + iv, sd * 1.8, 0.8, { kind: "pluck", cut: 1200, q: 4, sus: 0.6 });
    // The harp, rolling.
    I.pluck(t, chord[s % 3] + (s >= 8 ? 12 : 0), sd * 2, 0.3, { wave: "triangle", cut: 3200, q: 1, floor: 1400, decay: 0.6, rev: 0.4, dly: 0.1, pan: s % 2 ? 0.3 : -0.3 });
    // The whistle: a reel tune.
    if (L >= 2 && b % 2 === 0) { const W = [[0, 74], [2, 76], [3, 78], [4, 81], [6, 78], [8, 76], [10, 74], [12, 71], [14, 74]]; for (const [st, m] of W) if (st === s) I.lead(t, m + 12, sd * 1.8, 0.33, { waves: ["sine", "triangle"], cut: 7000, vib: 10, glide: m + 10, glideT: 0.04, dly: 0.15 }); }
    if (L >= 2 && b % 2 === 1 && s === 0) I.choir(t, chord.map((m) => m + 12), sd * 14, 0.4, { vowel: "u" });
    if (L >= 3 && s % 2 === 1) I.shaker(t, 0.5);
  },
};
