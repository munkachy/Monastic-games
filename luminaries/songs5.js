"use strict";
// Luminaries: songs for the Doctors from St. John of Ávila to St. John Henry Newman.

// ---- St. John of Ávila: "Andalucía" --------------------------------------------------------------------
// Flamenco-funk for the Apostle of Andalusia: the Andalusian cadence (A minor, G, F, E) going down
// and down, palmas clapping, a cajón, strummed guitar, and a voice like a cante.
SONGS.avila = {
  title: "Andalucía", bpm: 112, swing: 0.1, duck: 0.36,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[45, [57, 60, 64, 69]], [43, [55, 59, 62, 67]], [41, [57, 60, 65, 69]], [40, [56, 59, 64, 68]]];
    const [root, chord] = prog[b % 4];
    // The cajón: a deep slap and a sharp one.
    if ([0, 6, 10].includes(s)) I.kick(t, s ? 0.75 : 1, { tone: 50, decay: 0.25, click: 1.6 });
    if (s === 4 || s === 12) I.snare(t, 0.7, { rev: 0.1, f: 1500, decay: 0.12 });
    // Palmas: the hand-claps, accented in threes over the four.
    if (L >= 1 && [0, 3, 6, 8, 10].includes(s)) I.clap(t, s % 8 === 0 ? 0.55 : 0.4, { rev: 0.2, decay: 0.1, pan: -0.3 });
    if (L >= 2) I.hat(t, s % 2 ? 0.2 : 0.35, { decay: 0.03 });
    for (const [st, iv] of [[0, 0], [3, 7], [6, 0], [8, 12], [11, 7], [14, 0]]) if (st === s) I.bass(t, root + iv, sd * 1.6, 0.85, { kind: "pluck", cut: 1400, q: 5 });
    // Rasgueado: the guitar strummed, all strings in a quick fan.
    if ([0, 3, 6, 10, 12].includes(s)) chord.forEach((m, k) => I.pluck(t + k * 0.012, m, sd * 1.5, 0.3, { wave: "triangle", cut: 3800, q: 2, floor: 900, decay: 0.35, rev: 0.25, pan: (k - 1.5) * 0.2 }));
    // The cante, in the Phrygian of E, with its turns.
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 76, 2], [2, 77, 1], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 71, 3], [11, 72, 1], [12, 71, 4]]) if (st === s) I.vox(t, m, sd * len, 0.6, { vowel: st % 4 ? "a" : "e", glide: m + 1, rev: 0.35 });
    if (L >= 3 && s === 0) I.pad(t, chord, sd * 16, 0.25, { cut: 1300 });
  },
};

// ---- St. Peter Canisius: "Catechism" ---------------------------------------------------------------------
// Motorik: the steady, untiring eighths of a man who walked thousands of miles across Germany.
// Question and answer: a rising figure asks, a falling one replies.
SONGS.canisius = {
  title: "Catechism", bpm: 128, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const roots = [38, 38, 43, 45], root = roots[b % 4];
    if (s % 4 === 0) I.kick(t, 0.95, { tone: 46, decay: 0.28 });
    if (s === 4 || s === 12) I.snare(t, 0.7, { rev: 0.2 });
    I.hat(t, s % 2 ? 0.25 : 0.4, { decay: 0.04 });
    // The untiring eighths.
    if (s % 2 === 0) I.bass(t, root + (s % 8 === 6 ? 12 : 0), sd * 1.7, 0.85, { kind: "pluck", cut: 1200, q: 4, floor: 300 });
    if (s === 0) I.pad(t, [root + 24, root + 28, root + 31], sd * 16, 0.3, { cut: 1500 });
    // The question (rising) and the answer (falling).
    const Q = [0, 2, 4, 7, 9, 12, 14, 16], A = [16, 14, 12, 9, 7, 4, 2, 0];
    if (L >= 1 && s % 2 === 0) I.pluck(t, root + 36 + (b % 2 ? A : Q)[s / 2], sd * 1.2, 0.32, { wave: b % 2 ? "triangle" : "square", cut: 4200, q: 5, decay: 0.15, dly: 0.2, pan: b % 2 ? 0.4 : -0.4 });
    if (L >= 2 && s % 4 === 2) I.stab(t, [root + 24, root + 28, root + 31], 0.4, { cut: 3000 });
    if (L >= 3 && s === 0 && b % 2 === 0) I.choir(t, [root + 31, root + 36], sd * 30, 0.4, { vowel: "o", att: 0.3 });
  },
};

// ---- St. Lawrence of Brindisi: "Stuhlweissenburg" -------------------------------------------------------
// In 1601 the Capuchin rode at the head of the imperial army with only a crucifix in his hand.
// Martial funk in G minor: snare rolls, war drums, brass, a march that will not stop.
SONGS.lawrence = {
  title: "Stuhlweissenburg", bpm: 118, swing: 0.06, duck: 0.45,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[43, [58, 62, 67, 70]], [43, [58, 62, 67, 70]], [39, [58, 63, 67, 70]], [38, [57, 62, 66, 69]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 8 || (L >= 1 && s === 11)) I.kick(t, 1, { tone: 44, decay: 0.32 });
    if (s === 4 || s === 12) I.snare(t, 0.9, { rev: 0.25, f: 2200 });
    // The snare roll, the drummer of the march.
    if ((L >= 1 && s >= 13) || (L >= 2 && s % 2 === 1)) I.snare(t, Math.max(0.15, 0.25 + (s - 12) * 0.05), { rev: 0.05, decay: 0.06, f: 2600 });
    if ([2, 6, 10, 14].includes(s)) I.tom(t, s < 8 ? 45 : 40, 0.55, { decay: 0.25 });
    I.hat(t, s % 2 ? 0.2 : 0.38, { decay: 0.04 });
    for (const [st, iv] of [[0, 0], [3, 0], [4, 12], [6, 0], [8, 0], [10, 7], [11, 10], [14, 12]]) if (st === s) I.bass(t, root + iv, sd * 0.9, 0.9, { cut: 1800, q: 7 });
    // The brass: fanfare.
    if ([0, 3].includes(s) || (L >= 1 && s === 10)) I.stab(t, chord.map((m) => m + 12), s ? 0.7 : 0.9, { cut: 4400, hold: s ? 0.04 : 0.18 });
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 74, 3], [3, 74, 1], [4, 79, 4], [8, 77, 2], [10, 75, 2], [12, 74, 4]]) if (st === s) I.lead(t, m, sd * len, 0.5, { waves: ["sawtooth", "sawtooth"], cut: 2800, vib: 6, att: 0.02 });
    if (L >= 3 && s === 0 && b % 4 === 0) I.impact(t, 0.6);
  },
};

// ---- St. Robert Bellarmine: "Ascent by the Ladder" ------------------------------------------------------
// Baroque-funk: a harpsichord running sequences round the circle of fifths, a funky bass that
// walks like a basso continuo, the ladder of created things climbed rung by rung.
SONGS.bellarmine = {
  title: "Ascent by the Ladder", bpm: 100, swing: 0.1, duck: 0.35,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    // Round the fifths: B-flat, E-flat, C minor, F, D minor, G minor, C minor, F.
    const P = [[46, [58, 62, 65]], [39, [58, 63, 67]], [48, [60, 63, 67]], [41, [57, 60, 65]], [38, [57, 62, 65]], [43, [58, 62, 67]], [36, [60, 63, 67]], [41, [57, 60, 63]]];
    const [root, chord] = P[(b * 2 + (s >= 8 ? 1 : 0)) % 8];
    if (s === 0 || s === 7 || s === 10) I.kick(t, 0.9, { tone: 46, decay: 0.3 });
    if (s === 4 || s === 12) I.snare(t, 0.7, { rev: 0.2 });
    if (L >= 1) I.hat(t, s % 2 ? 0.22 : 0.38, { decay: 0.04 });
    // The continuo, walking.
    if (s % 2 === 0) I.bass(t, root + [0, 7, 12, 7][(s / 2) % 4], sd * 1.8, 0.85, { kind: "pluck", cut: 1600, q: 5, sus: 0.7 });
    // The harpsichord: a bright, quick-dying pluck, in running sixteenths.
    const fig = [0, 1, 2, 1, 2, 0, 1, 2];
    I.pluck(t, chord[fig[s % 8]] + 12 + (s % 8 >= 4 ? 12 : 0), sd, L ? 0.32 : 0.26, { wave: "sawtooth", cut: 7000, q: 1, floor: 2400, fd: 0.05, decay: 0.18, rev: 0.25, dly: 0.05, pan: s % 2 ? 0.25 : -0.25 });
    if (L >= 2 && (s === 0 || s === 8)) I.choir(t, chord.map((m) => m + 12), sd * 7.5, 0.4, { vowel: "a", att: 0.08 });
    if (L >= 3 && s % 8 === 6) I.lead(t, chord[2] + 24, sd * 2, 0.35, { waves: ["triangle", "sine"], cut: 5000, vib: 10 });
  },
};

// ---- St. Francis de Sales: "Gentleness" ------------------------------------------------------------------
// Laid back, swung, unhurried: the gentlest of the Doctors, by the Lake of Annecy. Warm electric
// piano, a soft bass, brushes, and a melody that never raises its voice.
SONGS.francis = {
  title: "Gentleness", bpm: 88, swing: 0.28, duck: 0.25,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[41, [57, 60, 64, 67]], [38, [57, 60, 65, 69]], [43, [58, 62, 65, 69]], [36, [58, 62, 64, 67]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 10) I.kick(t, 0.7, { tone: 44, decay: 0.4, click: 0.4 });
    if (s === 4 || s === 12) I.snare(t, 0.35, { rev: 0.35, decay: 0.2, f: 1400 });
    // Brushes.
    if (s % 2 === 0) I.shaker(t, s % 4 === 2 ? 0.7 : 0.4, { pan: 0.2 });
    if (L >= 1) I.hat(t, 0.18, { decay: 0.05 });
    for (const [st, iv, len] of [[0, 0, 5], [6, 7, 2], [10, 12, 2], [12, 10, 3]]) if (st === s && (L > 0 || st === 0)) I.bass(t, root + iv, sd * len * 0.95, 0.75, { kind: "sub" });
    if (s === 0 || (L >= 1 && s === 7)) I.keys(t, chord, sd * 7, 0.7, { rev: 0.35, dly: 0.12 });
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 72, 3], [3, 74, 1], [4, 76, 4], [10, 74, 2], [12, 72, 4]]) if (st === s) I.lead(t, m, sd * len, 0.38, { waves: ["sine", "triangle"], cut: 3000, vib: 8, rev: 0.4, att: 0.04 });
    if (L >= 2 && b % 2 === 1 && s === 0) I.pad(t, chord, sd * 16, 0.25, { cut: 1100, att: 0.8, rel: 1 });
    if (L >= 3 && s % 4 === 3) I.bell(t, chord[(s >> 2) % 4] + 24, 0.6, 0.15, { ratio: 4, index: 0.5, dly: 0.35 });
  },
};

// ---- St. Alphonsus Liguori: "Neapolitan" ------------------------------------------------------------
// He wrote the Neapolitan Christmas carol and set it to his own tune. Mandolins in tremolo, a
// tarantella lilt, Vesuvius smoking, and, for a Neapolitan saint, the Neapolitan chord
// (B-flat in A minor) leaning on the dominant.
SONGS.alphonsus = {
  title: "Neapolitan", bpm: 120, swing: 0.32, duck: 0.36,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[45, [57, 60, 64, 69]], [38, [57, 62, 65, 69]], [46, [58, 62, 65, 70]], [40, [56, 59, 62, 64]]];
    const [root, chord] = prog[b % 4];
    if (s % 4 === 0) I.kick(t, 0.9, { tone: 46, decay: 0.3 });
    if (s === 4 || s === 12) I.clap(t, 0.65);
    // The tambourine of the tarantella.
    if (s % 2 === 1 || L >= 2) I.shaker(t, s % 4 === 3 ? 0.8 : 0.45, { pan: -0.2 });
    I.hat(t, s % 4 === 2 ? 0.45 : 0.15, { decay: 0.05 });
    if (s % 4 === 0 || s % 4 === 3) I.bass(t, root + (s % 8 === 4 ? 7 : 0), sd * 1.5, 0.85, { kind: "pluck", cut: 1400, q: 6 });
    // Mandolins: each note picked fast and over again.
    if (L >= 1) { const m = chord[[3, 2, 1, 2][(s >> 2) % 4]] + 12; I.pluck(t, m, sd * 0.5, 0.28, { wave: "triangle", cut: 6000, q: 2, decay: 0.07, pan: 0.35, dly: 0 }); I.pluck(t + sd * 0.5, m, sd * 0.5, 0.2, { wave: "triangle", cut: 6000, q: 2, decay: 0.06, pan: 0.35, dly: 0 }); }
    if (s === 0) I.keys(t, chord, sd * 12, 0.45, { rev: 0.3 });
    // The tune, sung as in the streets of Naples.
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 76, 2], [2, 77, 1], [3, 76, 1], [4, 81, 4], [8, 79, 2], [10, 77, 2], [12, 76, 4]]) if (st === s) I.vox(t, m, sd * len, 0.55, { vowel: "o", glide: m - 1 });
    if (L >= 3 && s === 0 && b % 4 === 2) I.stab(t, chord.map((m) => m + 12), 0.5, { cut: 3500, hold: 0.2 });
  },
};

// ---- St. John Henry Newman: "Kindly Light" ----------------------------------------------------------
// British jazz-funk with a Hammond-like organ, a step at a time through the fog: "I do not ask to
// see the distant scene; one step enough for me."
SONGS.newman = {
  title: "Kindly Light", bpm: 84, swing: 0.16, duck: 0.3,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[44, [55, 60, 63, 67]], [41, [56, 60, 63, 67]], [46, [56, 60, 62, 65]], [39, [55, 58, 62, 65]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 9 || (L >= 1 && s === 11)) I.kick(t, 0.9, { tone: 44, decay: 0.4 });
    if (s === 4 || s === 12) I.snare(t, 0.65, { rev: 0.4, decay: 0.2 });
    if (L >= 1) I.hat(t, s % 2 ? 0.2 : 0.36, { open: s === 14, decay: 0.05 });
    for (const [st, iv, len] of [[0, 0, 3], [3, 12, 1], [6, 7, 2], [9, 0, 2], [11, 10, 1], [14, 12, 2]]) if (st === s && (L > 0 || st % 9 === 0)) I.bass(t, root + iv, sd * len * 0.95, 0.85, { kind: "pluck", cut: 1200, q: 5, sus: 0.7 });
    // The organ: square-wave drawbars, held, with a breathing filter.
    if (s === 0) I.pad(t, chord, sd * 15.5, 0.55, { wave: "square", voices: 3, cut: 1600 + L * 300, att: 0.03, rel: 0.15, rev: 0.25, width: 0.5 });
    if (L >= 1 && (s === 7 || s === 14)) I.pad(t, chord.slice(1).map((m) => m + 12), sd * 1.5, 0.35, { wave: "square", voices: 3, cut: 2400, att: 0.01, rel: 0.08 });
    // The kindly light: one note at a time, a step and a rest.
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 75, 3], [4, 74, 2], [6, 72, 2], [8, 70, 4], [12, 72, 4]]) if (st === s) I.lead(t, m, sd * len, 0.42, { waves: ["sine", "triangle"], cut: 3200, vib: 9, rev: 0.45, glide: m - 2 });
    if (L >= 3 && s === 0) I.choir(t, chord.map((m) => m + 12), sd * 15, 0.3, { vowel: "o", att: 0.6 });
  },
};
