"use strict";
// Luminaries: songs for the Fathers of the first centuries.

// St. Ambrose's own hymn, Aeterne rerum Conditor (the Ambrosian melody, as sung in the Office).
const AETERNE = [[65, 1], [65, 1], [67, 1], [69, 1], [70, 1], [69, 1], [67, 1], [69, 2],
  [69, 1], [67, 1], [72, 1], [72, 1], [67, 1], [69, 1], [70, 1], [69, 2],
  [67, 1], [69, 1], [67, 1], [69, 1], [67, 1], [64, 1], [65, 1], [67, 2],
  [67, 1], [69, 1], [67, 1], [65, 1], [64, 1], [65, 0.5], [67, 0.5], [65, 0.5], [64, 0.5], [62, 2]];

// ---- St. Irenaeus: "Fully Alive" --------------------------------------------------------------------
// The opening track: warm, sunny soul-funk in B-flat. The glory of God is a living man.
SONGS.irenaeus = {
  title: "Fully Alive", bpm: 102, swing: 0.12, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[46, ch(57, 5, 8, 12, 15)], [43, ch(55, 3, 7, 10, 14)], [39, [55, 58, 62, 65]], [41, [51, 55, 58, 60]]];
    const [root, chord] = prog[b % 4];
    const K = L >= 2 ? "X.....x...x.x..." : "X.....x...x.....";
    if (on(K, s)) I.kick(t, acc(K, s), { tone: 47, decay: 0.4 });
    if (s === 4 || s === 12) I.clap(t, 0.85);
    I.hat(t, s % 4 === 2 ? 0.7 : s % 2 ? 0.3 : 0.45, { open: L >= 1 && s === 14 });
    if (L >= 1 && s % 2) I.shaker(t, 0.6);
    for (const [st, iv, len] of [[0, 0, 3], [3, 12, 1], [5, 7, 1], [6, 0, 2], [10, 7, 1], [11, 10, 1], [13, 12, 1], [14, 0, 2]]) if (st === s && (L > 0 || st % 4 === 0 || st === 6)) I.bass(t, root + iv, len * sd * 0.9, 0.9, { cut: 2400, q: 10 });
    if (L === 0 && s === 0) I.keys(t, chord, sd * 15, 0.85, { rev: 0.3 });
    if (L >= 1 && (s === 2 || s === 7 || s === 11)) I.keys(t, chord, sd * 2.5, 0.8, { dly: 0.1 });
    if (L >= 2 && (s === 6 || s === 14)) I.stab(t, chord.slice(1, 4).map((m) => m + 12), 0.65, { cut: 4600 });
    if (L >= 2 && s === 0) I.pad(t, chord.map((m) => m - 12), sd * 16, 0.45, { cut: 1600, att: 0.4 });
    if (L >= 3) { const H = [[0, 77], [3, 79], [6, 81], [8, 82], [11, 81], [14, 77]]; for (const [st, m] of H) if (st === s && b % 2 === 0) I.lead(t, m, sd * 2.6, 0.55, { cut: 3600, vib: 10, glide: m - 2 }); }
  },
};

// ---- St. Hilary: "Hilaris" ---------------------------------------------------------------------------
// His name means cheerful: bright jazz-funk, a walking bass, vibraphone, and a swung ride.
SONGS.hilary = {
  title: "Hilaris", bpm: 120, swing: 0.22, duck: 0.28,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[48, [64, 67, 71, 74]], [45, [60, 64, 67, 71]], [50, [65, 69, 72, 76]], [43, [59, 64, 65, 69]]];
    const [root, chord] = prog[b % 4], nxt = prog[(b + 1) % 4][0];
    if (s === 0 || (L >= 1 && s === 10)) I.kick(t, 0.85, { tone: 48, decay: 0.32 });
    if (s === 4 || s === 12) I.snare(t, 0.7, { rev: 0.2 });
    if (L >= 1 && (s === 7 || s === 15)) I.snare(t, 0.12, { rev: 0 });
    // The ride, swung: ding, ding-a, ding, ding-a.
    if ([0, 4, 7, 8, 12, 15].includes(s)) I.hat(t, s % 4 === 3 ? 0.35 : 0.55, { open: true, f: 6200, pan: 0.3 });
    // The walking bass: a note to each beat, the last leaning into the next chord.
    if (s % 4 === 0) { const walk = [0, 4, 7, nxt - root + (nxt > root ? -1 : 1)]; I.bass(t, root + walk[s / 4], sd * 3.6, 0.85, { kind: "pluck", cut: 1200, q: 3, floor: 400, sus: 0.8 }); }
    // The vibraphone.
    if (s === 0 || (L >= 1 && (s === 6 || s === 10))) for (const [k, m] of chord.entries()) I.bell(t + k * 0.012, m + 12, 1.1, 0.33, { ratio: 4, index: 0.7, dly: 0.15, pan: (k - 1.5) / 3 });
    if (L >= 2 && s % 2 === 0) I.bell(t, chord[(s / 2 + b) % chord.length] + 24, 0.4, 0.22, { ratio: 4, index: 0.5, dly: 0.2 });
    if (L >= 2 && s === 0) I.keys(t, chord, sd * 12, 0.6, { rev: 0.2 });
    // A whistled tune, for joy.
    if (L >= 3) { const H = [[0, 76], [2, 79], [4, 81], [7, 79], [8, 76], [10, 74], [12, 72], [14, 74]]; for (const [st, m] of H) if (st === s && b % 2) I.lead(t, m + 12, sd * 1.8, 0.4, { waves: ["sine", "triangle"], cut: 6000, vib: 14, dly: 0.2 }); }
  },
};

// ---- St. Athanasius: "Contra Mundum" -----------------------------------------------------------------
// Defiant funk-rock in E minor, driven out and climbing a semitone at each of his
// five exiles, then home again to Alexandria.
SONGS.athanasius = {
  title: "Contra Mundum", bpm: 126, duck: 0.45,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const exile = Math.floor((b % 24) / 4), up = exile < 6 ? exile : 0, root = 40 + up;
    const half = (b % 2) * 2;
    if ([0, 8, 10].includes(s) || (L >= 2 && s === 14)) I.kick(t, 1, { tone: 50, decay: 0.3, drive: 0.5 });
    if (s === 4 || s === 12) I.snare(t, 1, { rev: 0.25, f: 2200 });
    I.hat(t, s % 2 ? 0.3 : 0.55, { open: L >= 2 && s % 4 === 2 });
    // The riff, on a growling bass.
    const R = [0, 0, 12, 0, 3, 0, 5, 3, 0, 0, 7, 5, 3, 0, 10, 7];
    if (L > 0 || s % 2 === 0) I.bass(t, root + R[s] + (s >= 12 ? half : 0), sd * 0.9, 0.85, { kind: "reese", cut: 900, drive: 0.7 });
    // Power chords, stabbed.
    if (s === 0 || s === 6 || (L >= 1 && s === 10)) I.stab(t, [root + 12, root + 19, root + 24].map((m) => m + (s === 10 ? half + 3 : 0)), 0.8, { cut: 3200, hold: 0.1 });
    if (L >= 1 && s === 0 && b % 4 === 3) I.riser(t, sd * 16, 0.6);
    if (L >= 2 && s === 0) I.pad(t, [root + 12, root + 19, root + 24, root + 27], sd * 16, 0.45, { cut: 2200, att: 0.05 });
    // The lead: a wail of defiance.
    if (L >= 3) { const W = [[0, 19, 4], [4, 22, 2], [6, 24, 2], [8, 26, 4], [12, 24, 2], [14, 22, 2]]; for (const [st, iv, len] of W) if (st === s && b % 2 === 0) I.lead(t, root + 12 + iv, sd * len, 0.6, { waves: ["square", "sawtooth"], cut: 3000, vib: 22, glide: root + 10 + iv }); }
  },
};

// ---- St. Ephrem: "Harp of the Spirit" -------------------------------------------------------------
// Slinky funk in the Hijaz mode of the Syrian east: harp runs, a frame drum, a
// singing line full of turns. "On a certain day a pearl did I take up."
SONGS.ephrem = {
  title: "Harp of the Spirit", bpm: 96, swing: 0.08, duck: 0.35,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const HZ = [52, 53, 56, 57, 59, 60, 62];   // E Hijaz: E F G# A B C D
    const prog = [[40, [52, 56, 59, 64]], [41, [53, 57, 60, 65]], [40, [52, 56, 59, 62]], [38, [50, 53, 57, 60]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 6 || (L >= 1 && s === 10)) I.tom(t, 40, 0.8, { decay: 0.35 });
    if (s === 0 || (L >= 1 && s === 8)) I.kick(t, 0.8, { tone: 44, decay: 0.38 });
    if ([3, 5, 11, 13, 15].includes(s)) I.perc(t, 76 + (s % 3), 0.35, { decay: 0.06, pan: s % 2 ? 0.4 : -0.4 });
    if (s === 4 || s === 12) I.clap(t, 0.5, { f: 1500, rev: 0.4 });
    if (L >= 1 && s % 2 === 1) I.shaker(t, 0.4);
    // The bass, sliding up from the F to the E.
    for (const [st, iv, gl] of [[0, 0, 1], [3, 0, 0], [6, 12, 0], [8, 0, 0], [10, 1, 0], [11, 0, 0], [14, 7, 0]]) if (st === s) I.bass(t, root + iv, sd * 1.8, 0.85, { cut: 1600, q: 8, glide: gl ? root + 1 : undefined });
    // The harp: runs up and down the mode.
    const run = [0, 2, 4, 6, 7, 6, 4, 2];
    if (s % (L >= 2 ? 1 : 2) === 0) { const k = run[(s + b * 3) % 8] + (s >= 8 ? 2 : 0); I.pluck(t, HZ[k % 7] + 12 * (1 + Math.floor(k / 7)), sd * 2, 0.4, { wave: "triangle", cut: 7000, q: 1, floor: 1200, decay: 0.7, dly: 0.25, rev: 0.4, pan: (k - 4) / 6 }); }
    if (L >= 1 && s === 0) I.pad(t, chord, sd * 16, 0.4, { cut: 1100, att: 0.5 });
    // The singer: a phrase full of turns, on the vowel of a psalm.
    if (L >= 2) { const P = [[0, 4, 3], [3, 5, 1], [4, 4, 2], [6, 2, 2], [8, 1, 2], [10, 2, 1], [11, 1, 1], [12, 0, 4]]; for (const [st, k, len] of P) if (st === s && b % 2 === 0) I.vox(t, HZ[k] + 12, sd * len, 0.8, { vowel: "a", rev: 0.4, glide: HZ[k] + 13 }); }
  },
};

// ---- St. Basil: "The Basiliad" ------------------------------------------------------------------------
// A big-hearted gospel groove in G: an organ, hands clapping, and a call answered by
// the whole choir, as in the hospital-city he built for the poor.
SONGS.basil = {
  title: "The Basiliad", bpm: 108, swing: 0.12, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[43, ch(55, 4, 7, 11, 14)], [36, ch(55, 5, 9, 12, 16)], [40, ch(55, 0, 4, 7, 11)], [38, [55, 57, 60, 64]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 7 || s === 10) I.kick(t, 0.95, { tone: 46, decay: 0.38 });
    if (s === 4 || s === 12) { I.clap(t, 0.9); if (L >= 1) I.clap(t + 0.012, 0.5, { pan: 0.5 }); }
    I.hat(t, s % 2 ? 0.25 : 0.45);
    if (L >= 1 && s % 4 === 2) I.shaker(t, 0.7, { pan: 0.4 });
    for (const [st, iv, len] of [[0, 0, 2], [3, 12, 1], [6, 7, 1], [7, 0, 1], [10, 4, 1], [12, 7, 2], [15, 11, 1]]) if (st === s) I.bass(t, root + iv, len * sd * 0.9, 0.85, { cut: 1800, q: 6 });
    // The organ, held and swelling.
    if (s === 0) I.pad(t, chord, sd * 15.5, L >= 1 ? 0.7 : 0.5, { wave: "square", voices: 3, cut: 2400, att: 0.08, rel: 0.2, rev: 0.25 });
    if (L >= 1 && (s === 6 || s === 14)) I.keys(t, chord.map((m) => m + 12), sd * 1.5, 0.6);
    // The call, and the answer.
    const CALL = [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 76, 2], [10, 74, 6]];
    if (L >= 1 && b % 2 === 0) for (const [st, m, len] of CALL) if (st === s) I.lead(t, m, sd * len, 0.55, { waves: ["sawtooth", "square"], cut: 2600, vib: 16, glide: m - 2 });
    if (L >= 1 && b % 2 === 1 && (s === 0 || s === 6)) I.choir(t, chord.slice(0, 3).map((m) => m + 12), sd * 5, 0.8, { vowel: "o", att: 0.03, rel: 0.3 });
    if (L >= 3 && s === 0) I.choir(t, chord.map((m) => m + 12), sd * 15, 0.35, { vowel: "a", att: 0.4 });
  },
};

// ---- St. Cyril of Jerusalem: "Mystagogy" --------------------------------------------------------------
// Dub: deep water, a one-drop beat, chords that echo away across the font,
// and a drop of water on the grid.
SONGS.cyriljer = {
  title: "Mystagogy", bpm: 86, swing: 0.14, duck: 0.3, delay: (60 / 86) * 0.75,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const two = Math.floor(b / 2) % 2, root = two ? 43 : 38, chord = two ? ch(55, 3, 7, 10) : ch(50, 3, 7, 10, 14);
    if (s === 8 || (L >= 2 && s === 0)) I.kick(t, 1, { tone: 42, decay: 0.5 });
    if (s === 8) I.rim(t, 0.6, { f: 1900, pan: 0 });
    if (s % 2 === 0 && L >= 1) I.hat(t, s % 4 === 2 ? 0.4 : 0.2, { pan: -0.3 });
    // The skank, echoing out.
    if (s === 4 || s === 12) I.keys(t, chord.map((m) => m + 12), sd * 0.8, 0.7, { dly: 0.55, rev: 0.2, bark: 1.2 });
    // The bass line, deep under the water.
    const BL = [[0, 0, 3], [4, 3, 1], [6, 5, 2], [10, 7, 2], [13, 5, 1], [14, 3, 2]];
    for (const [st, iv, len] of BL) if (st === s) I.bass(t, root + iv - 12 + 12, len * sd * 0.95, 0.95, { kind: "sub", drive: 0.25 });
    // Water dropping.
    if ((s === 3 && b % 2 === 0) || (L >= 1 && s === 11 && b % 3 === 1)) I.perc(t, 84 + (b % 4) * 2, 0.35, { decay: 0.08, rev: 0.5 });
    if (L >= 2 && s === 0 && b % 2 === 0) I.pad(t, chord, sd * 30, 0.35, { cut: 900, att: 0.8, rev: 0.6 });
    // A melodica, at the last.
    if (L >= 3) { const M = [[0, 74], [3, 77], [6, 79], [8, 77], [10, 74], [12, 72]]; for (const [st, m] of M) if (st === s && b % 2 === 1) I.lead(t, m, sd * 2, 0.45, { waves: ["square", "triangle"], cut: 2200, dly: 0.5, rev: 0.3 }); }
  },
};

// ---- St. Gregory Nazianzen: "The Theologian" --------------------------------------------------------
// Inward, lazy neo-soul: ninths on a Rhodes, a soft beat behind the bar, a voice
// humming. The poet who longed for his solitude.
SONGS.gregnaz = {
  title: "The Theologian", bpm: 80, swing: 0.2, duck: 0.3,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[44, ch(55, 5, 8, 12, 15)], [41, [56, 60, 63, 67]], [37, [53, 56, 60, 63]], [39, ch(53, 5, 8, 12, 15)]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 7 || (L >= 1 && s === 10)) I.kick(t, 0.8, { tone: 44, decay: 0.45, click: 0.3 });
    if (s === 4 || s === 12) I.snare(t, 0.45, { rev: 0.3, decay: 0.12 });
    if (L >= 1) I.hat(t, s % 2 ? 0.18 : 0.3, { pan: 0.25 });
    if (s === 0 || s === 7 || s === 10) I.bass(t, root + (s === 10 ? 7 : 0), sd * (s === 0 ? 6 : 2.5), 0.8, { kind: "sub", glide: s === 7 ? root - 2 : undefined });
    if (s === 0 || (L >= 1 && s === 9)) I.keys(t, chord, sd * (s ? 6 : 8), 0.75, { rev: 0.35, spread: 1.4 });
    if (L >= 2) { const H = [[2, 79], [3, 80], [6, 77], [11, 75], [12, 77]]; for (const [st, m] of H) if (st === s && b % 2) I.vox(t, m, sd * 2, 0.6, { vowel: "u", rev: 0.5 }); }
    if (L >= 3 && s === 0) I.pad(t, chord, sd * 16, 0.35, { cut: 1400, att: 0.8, rev: 0.6 });
  },
};

// ---- St. Ambrose: "Hive" --------------------------------------------------------------------------------
// Buzzing synth-funk, and his own hymn Aeterne rerum Conditor sung by two choirs
// answering from left and right, as he taught the people of Milan to sing.
SONGS.ambrose = {
  title: "Hive", bpm: 116, duck: 0.45,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[38, ch(50, 3, 7, 10, 14)], [46, ch(58, 4, 7, 11)], [41, ch(53, 4, 7, 11, 14)], [36, ch(48, 4, 7, 10, 14)]];
    const [root, chord] = prog[b % 4];
    if (s % 4 === 0) I.kick(t, 1, { tone: 46, decay: 0.32 });
    if (s === 4 || s === 12) I.clap(t, 0.8);
    I.hat(t, s % 4 === 2 ? 0.6 : 0.25, { open: s % 4 === 2 && L >= 1 });
    // The bass buzzes on.
    if (s % 2 === 0 || L >= 2) I.bass(t, root + (s % 8 === 6 ? 12 : 0), sd * 0.9, 0.8, { kind: "square", cut: 1300, q: 12, floor: 300, fd: 0.06 });
    // The bees: quick, bright, darting arpeggios.
    if (L >= 1) I.pluck(t, chord[(s * 3 + b) % chord.length] + 24, sd * 0.5, 0.28, { wave: "sawtooth", cut: 5000, q: 10, floor: 2000, fd: 0.04, decay: 0.07, dly: 0.2, pan: Math.sin(s * 1.7) * 0.7 });
    if (s === 0) I.pad(t, chord, sd * 16, 0.4, { cut: 1500, att: 0.2 });
    // The hymn, line by line, the choirs answering left and right.
    if (L >= 1) {
      const lines = [AETERNE.slice(0, 8), AETERNE.slice(8, 16), AETERNE.slice(16, 24), AETERNE.slice(24)], k = Math.floor(b / 2) % 4;
      if (b % 2 === 0) melodyAt(lines[k], 0, s, (m, len) => I.choir(t, L >= 3 ? [m, m - 12] : [m], len * 2 * sd * 0.95, 0.8, { vowel: "o", att: 0.03, rel: 0.2, pan: k % 2 ? 0.55 : -0.55 }));
    }
    if (L >= 3 && (s === 6 || s === 14)) I.stab(t, chord.slice(0, 3).map((m) => m + 12), 0.5, { cut: 4000 });
  },
};
