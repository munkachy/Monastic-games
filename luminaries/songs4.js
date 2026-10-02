"use strict";
// Luminaries: songs for the Doctors from St. John Damascene to St. Catherine of Siena.

const MODES = { dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10], aeo: [0, 2, 3, 5, 7, 8, 10], ion: [0, 2, 4, 5, 7, 9, 11] };
const deg = (root, mode, d) => root + MODES[mode][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

// ---- St. John Damascene: "Octoechos" ----------------------------------------------------------------
// He set the eight tones in order for the Church's year. A Byzantine drone (the ison) under a
// chanting line, over a deep groove; every four bars the next tone of the eight.
SONGS.damascene = {
  title: "Octoechos", bpm: 92, swing: 0.1, duck: 0.35,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const tone = Math.floor(b / 4) % 8, mode = ["dor", "phr", "lyd", "mix"][tone % 4], root = [62, 64, 65, 67][tone % 4] - (tone >= 4 ? 5 : 0);
    // The ison: the drone the choir holds under the chant.
    if (s === 0 && b % 4 === 0) { I.choir(t, [root - 12, root - 5], sd * 64, 0.5, { vowel: "o", att: 0.8, rel: 1 }); I.bass(t, root - 24, sd * 64, 0.5, { kind: "sub" }); }
    if (L >= 1) {
      if (s === 0 || s === 7 || s === 10) I.kick(t, 0.9, { tone: 44, decay: 0.4 });
      if (s === 4 || s === 12) I.rim(t, 0.6, { f: 1300 });
      if (s === 12) I.clap(t, 0.5, { rev: 0.5 });
      if (s % 2 === 0) I.perc(t, 70 + (s % 4 ? 0 : 5), 0.4, { pan: s % 4 ? 0.4 : -0.4 });
    }
    // The oud.
    if (L >= 1 && [0, 3, 6, 8, 11, 14].includes(s)) I.pluck(t, deg(root, mode, [0, 2, 4, 3, 1, 0][[0, 3, 6, 8, 11, 14].indexOf(s)]), sd * 1.2, 0.4, { wave: "sawtooth", cut: 2600, q: 6, floor: 500, decay: 0.3, pan: -0.25 });
    // The chant, rising and turning in the tone.
    const C = [[0, 0, 2], [2, 1, 1], [3, 2, 1], [4, 3, 2], [6, 2, 2], [8, 4, 3], [11, 3, 1], [12, 2, 2], [14, 1, 2]];
    if (b % 2 === 0 || L >= 2) for (const [st, d, len] of C) if (st === s) I.choir(t, L >= 3 ? [deg(root, mode, d), deg(root, mode, d) - 12] : [deg(root, mode, d)], len * sd * 0.95, 0.75, { vowel: "a", att: 0.04, rel: 0.25 });
    if (L >= 2 && s === 0) I.pad(t, [root, root + 7, root + 12], sd * 16, 0.3, { cut: 1200, att: 0.5 });
    if (L >= 3 && s % 4 === 2) I.bell(t, deg(root, mode, 4) + 12, 0.8, 0.25, { ratio: 3.01, index: 2 });
  },
};

// ---- St. Gregory of Narek: "Lamentations" -----------------------------------------------------------
// The duduk weeps over a slow, heavy beat in C minor, the dhol rolling under it: speaking with
// God from the depths of the heart.
SONGS.narek = {
  title: "Lamentations", bpm: 78, swing: 0.08, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[36, [55, 60, 63, 67]], [44, [56, 60, 63, 67]], [41, [56, 60, 65, 68]], [43, [55, 59, 62, 65]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || (L >= 1 && s === 9)) I.kick(t, 1, { tone: 40, decay: 0.55 });
    if (s === 8) I.snare(t, 0.8, { rev: 0.45, decay: 0.25 });
    // The dhol.
    if ([3, 6, 11, 14].includes(s) || (L >= 2 && s % 2 === 1)) I.tom(t, s % 4 === 3 ? 43 : 48, s % 4 === 3 ? 0.6 : 0.35, { decay: 0.2 });
    if (L >= 2) I.hat(t, s % 2 ? 0.15 : 0.32, { decay: 0.03 });
    if (s === 0 || s === 9) I.bass(t, root, sd * (s ? 7 : 9), 0.85, { kind: "sub" });
    if (s === 0) I.pad(t, chord, sd * 16, 0.4, { cut: 1100, att: 0.5, rel: 0.6 });
    // The duduk: a reedy, breathing line with slow vibrato, sliding into each note.
    const D = [[[0, 67, 4], [4, 68, 2], [6, 67, 2], [8, 65, 4], [12, 63, 4]], [[0, 62, 3], [3, 63, 1], [4, 65, 4], [8, 63, 2], [10, 62, 2], [12, 59, 4]]];
    if (L >= 1 || b % 4 < 2) for (const [st, m, len] of D[b % 2]) if (st === s) I.lead(t, m + 12, sd * len * 0.98, 0.55, { waves: ["sawtooth", "triangle"], cut: 1500, q: 2, vib: 16, glide: m + 11, glideT: 0.18, att: 0.08, rev: 0.45 });
    if (L >= 3 && b % 2 === 1 && s === 0) I.choir(t, chord.map((m) => m + 12), sd * 14, 0.4, { vowel: "a" });
  },
};

// ---- St. Peter Damian: "Fonte Avellana" ---------------------------------------------------------------
// Stark and percussive: wood and stone, the bell of the hermitage, the knees bending, the
// psalter going round. A cold, bright E Phrygian under the snow.
SONGS.damian = {
  title: "Fonte Avellana", bpm: 100, duck: 0.4,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const root = [40, 40, 41, 40][b % 4];
    if (s === 0 || s === 6 || (L >= 1 && s === 11)) I.kick(t, 0.95, { tone: 40, decay: 0.3, click: 1.5 });
    if (s === 4 || s === 12) I.rim(t, 0.9, { f: 900 });
    if (s % 2 === 1) I.perc(t, s % 4 === 1 ? 79 : 74, 0.5, { pan: s % 4 === 1 ? 0.5 : -0.5, decay: 0.06 });
    if (L >= 1 && [2, 7, 10, 15].includes(s)) I.tom(t, [45, 43, 41, 38][[2, 7, 10, 15].indexOf(s)], 0.6, { decay: 0.18 });
    if (L >= 2) I.hat(t, s % 4 === 2 ? 0.4 : 0.12, { decay: 0.02, f: 9000 });
    // A bare bass, a drone of stone.
    if (s === 0 || s === 6 || s === 10) I.bass(t, root + (s === 10 ? 7 : 0), sd * 3, 0.85, { kind: "reese", cut: 300, drive: 0.3 });
    // The hermitage bell.
    if (s === 0 && b % 2 === 0) I.bell(t, 64, 3, 0.5, { ratio: 2.76, index: 3, rev: 0.6, dly: 0.1 });
    // The psalm-tone: one reciting note, an ending.
    if (L >= 1) { const P = [[0, 71, 2], [2, 71, 2], [4, 71, 2], [6, 71, 2], [8, 72, 2], [10, 71, 2], [12, 69, 4]]; if (b % 2 === 1) for (const [st, m, len] of P) if (st === s) I.choir(t, L >= 3 ? [m, m - 7] : [m], len * sd * 0.9, 0.6, { vowel: "a", att: 0.03, rel: 0.15 }); }
    if (L >= 2 && s === 0) I.pad(t, [52, 59, 64], sd * 16, 0.28, { cut: 900, att: 0.4 });
  },
};

// ---- St. Anselm: "Id Quo Maius" ------------------------------------------------------------------------
// That than which nothing greater can be conceived: a scale that rises for ever and never gets
// higher, a Shepard tone over a four-on-the-floor house groove. Think of something greater, and
// there it is, still rising.
SONGS.anselm = {
  title: "Id Quo Maius", bpm: 122, swing: 0.06, duck: 0.45,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const n = b * 16 + s;
    const prog = [[45, [57, 60, 64, 67]], [41, [57, 60, 64, 65]], [48, [55, 60, 64, 67]], [43, [55, 59, 62, 67]]];
    const [root, chord] = prog[b % 4];
    if (s % 4 === 0) I.kick(t, 1, { tone: 48, decay: 0.32 });
    if (s === 4 || s === 12) I.clap(t, 0.75);
    I.hat(t, s % 4 === 2 ? 0.6 : 0.22, { open: s % 4 === 2 });
    if (s % 4 === 2 || (L >= 1 && s % 4 === 3)) I.bass(t, root, sd * 1.4, 0.85, { kind: "pluck", cut: 1600, q: 6 });
    if (s === 0) I.pad(t, chord, sd * 16, 0.35, { cut: 1500 + L * 400 });
    // The endless climb: each step of the scale sounds in four octaves at once, the top fading
    // out as the bottom fades in, so it rises and rises and never arrives.
    if (s % 2 === 0 || L >= 2) {
      const k = (L >= 2 ? n : n / 2) % 7;
      for (let o = 0; o < 4; o++) { const x = (o * 7 + k) / 28, v = Math.exp(-((x - 0.5) ** 2) / 0.04); I.bell(t, 45 + o * 12 + MODES.aeo[k], 0.5, 0.45 * v, { ratio: 2, index: 0.8, rev: 0.4, dly: 0.15 }); }
    }
    if (L >= 3 && s === 0 && b % 4 === 3) I.riser(t, sd * 16, 0.5);
    if (L >= 3 && [0, 6, 10].includes(s)) I.stab(t, chord.map((m) => m + 12), 0.5, { cut: 4200 });
  },
};

// ---- St. Bernard of Clairvaux: "Mellifluous" -----------------------------------------------------------
// The honey-sweet doctor: a slow jam in D-flat, the electric piano dripping, a deep easy groove,
// a voice that sighs "ah" like a sermon on the Song of Songs.
SONGS.bernard = {
  title: "Mellifluous", bpm: 72, swing: 0.18, duck: 0.3,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[37, [56, 60, 63, 65, 68]], [46, [56, 61, 65, 68, 72]], [42, [58, 61, 65, 68, 70]], [44, [54, 58, 61, 63, 65]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 7 || (L >= 1 && s === 10)) I.kick(t, 0.85, { tone: 44, decay: 0.45 });
    if (s === 8) I.snare(t, 0.7, { rev: 0.55, decay: 0.25 });
    if (L >= 1) I.hat(t, s % 2 ? 0.18 : 0.32, { decay: 0.05 });
    if (L >= 2 && s % 4 === 3) I.shaker(t, 0.5);
    for (const [st, iv, len] of [[0, 0, 5], [6, 7, 1], [7, 12, 2], [10, 0, 3], [14, 10, 2]]) if (st === s && (L > 0 || st % 8 === 0)) I.bass(t, root + iv, sd * len * 0.95, 0.8, { kind: "sub" });
    // The keys, dripping like honey.
    if (s === 0) I.keys(t, chord, sd * 12, 0.75, { rev: 0.35 });
    if (L >= 1 && [3, 6, 11].includes(s)) I.keys(t, chord.slice(2).map((m) => m + 12), sd * 2, 0.5, { dly: 0.3 });
    if (L >= 2 && s === 0) I.pad(t, chord.map((m) => m - 12), sd * 16, 0.3, { cut: 1300, att: 0.6, rel: 0.8 });
    // The voice.
    if (L >= 2 && b % 2 === 0) { const V = [[0, 77, 3], [4, 80, 2], [6, 77, 2], [8, 75, 4], [12, 73, 3]]; for (const [st, m, len] of V) if (st === s) I.vox(t, m, sd * len, 0.6, { vowel: "a", glide: m - 2, rev: 0.45 }); }
    if (L >= 3 && s % 2 === 0) I.bell(t, chord[(s / 2 + b) % chord.length] + 24, 0.5, 0.18, { ratio: 4, index: 0.6, dly: 0.3 });
  },
};

// ---- St. Anthony of Padua: "Sermon to the Fish" ---------------------------------------------------
// When the heretics of Rimini would not listen, he preached to the fish, and the fish came in rows
// to hear him. Bubbly, underwater funk in F: a wobbling bass, a wah clavinet, bubbles everywhere.
SONGS.anthony = {
  title: "Sermon to the Fish", bpm: 106, swing: 0.16, duck: 0.36,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[41, [57, 60, 63, 65]], [41, [57, 60, 63, 65]], [46, [56, 58, 62, 65]], [48, [58, 62, 64, 67]]];
    const [root, chord] = prog[b % 4];
    const K = "X..X..X...X..x..";
    if (on(K, s) && (L > 0 || s % 8 === 0)) I.kick(t, acc(K, s), { tone: 46, decay: 0.34 });
    if (s === 4 || s === 12) I.snare(t, 0.8, { rev: 0.2 });
    I.hat(t, s % 2 ? 0.25 : 0.45, { open: L >= 1 && s === 14 });
    // The wobbling bass, gliding like something swimming.
    for (const [st, iv, len] of [[0, 0, 2], [3, 12, 1], [4, 10, 1], [6, 0, 2], [10, 7, 1], [11, 10, 1], [13, 12, 2]]) if (st === s) I.bass(t, root + iv, sd * len * 0.9, 0.9, { cut: 1800, q: 14, floor: 160, fd: 0.2, glide: root + iv - 2 });
    // The wah clavinet.
    if (L >= 1 && [2, 5, 7, 10, 13, 15].includes(s)) I.pluck(t, chord[s % 4] + 12, sd * 0.6, 0.38, { wave: "square", cut: 600, q: 14, floor: 2600, fd: 0.09, decay: 0.12, dly: 0, pan: 0.3 });
    // Bubbles.
    if (Math.sin(b * 31 + s * 7) > (L >= 2 ? 0.2 : 0.6)) I.bell(t + sd * 0.25, 84 + ((b * 5 + s * 3) % 12), 0.15, 0.25, { ratio: 1.5, index: 4, rev: 0.5, pan: Math.sin(s * 2.3) * 0.7, dly: 0.25 });
    if (L >= 2 && s === 0) I.pad(t, chord, sd * 16, 0.3, { cut: 900, sweep: 2200 });
    if (L >= 3 && b % 2 === 0) { const H = [[0, 77], [3, 75], [4, 72], [8, 77], [10, 79], [11, 80], [12, 79]]; for (const [st, m] of H) if (st === s) I.lead(t, m, sd * 1.5, 0.45, { waves: ["sine", "square"], cut: 3000, vib: 12, glide: m + 3 }); }
  },
};

// ---- St. Bonaventure: "Itinerarium" ---------------------------------------------------------------
// The journey of the mind into God goes up by six steps, like the six wings of the seraph that
// St. Francis saw: every two bars the whole song climbs a step, and after the sixth, rests.
SONGS.bonaventure = {
  title: "Itinerarium", bpm: 116, duck: 0.42,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const step = Math.floor(b / 2) % 8, up = [0, 2, 4, 5, 7, 9, 9, 0][step], root = 43 + up;
    const chord = [root + 16, root + 19, root + 23, root + 26];
    if (s % 4 === 0) I.kick(t, step === 7 ? 0.5 : 1, { tone: 47, decay: 0.32 });
    if (s === 4 || s === 12) I.clap(t, 0.8);
    I.hat(t, s % 2 ? 0.25 : 0.45, { open: s % 4 === 2 && L >= 1 });
    if (s % 2 === 0) I.bass(t, root + (s % 8 === 6 ? 7 : 0), sd * 0.9, 0.85, { kind: "pluck", cut: 1500, q: 7 });
    if (s === 0) I.pad(t, chord, sd * 16, 0.4, { cut: 1600 + step * 300, att: 0.2 });
    // Six wings beating: a six-note figure over the four of the beat.
    if (L >= 1) { const w = (b * 16 + s) % 6; if (s % 2 === 0 || L >= 3) I.pluck(t, chord[w % 4] + (w >= 4 ? 12 : 0), sd, 0.3, { wave: "triangle", cut: 6000, decay: 0.25, dly: 0.25, pan: w % 2 ? 0.5 : -0.5 }); }
    // The seraph's choir, a step higher each time.
    if (L >= 2 && s === 0 && b % 2 === 0) I.choir(t, [root + 28, root + 31, root + 35], sd * 30, 0.55, { vowel: "a", att: 0.4 });
    if (L >= 1 && s === 8 && b % 2 === 1 && step < 6) I.riser(t, sd * 8, 0.4);
    if (L >= 3 && s === 0 && b % 2 === 0) I.impact(t, 0.4);
  },
};

// ---- St. Albert the Great: "Universal Doctor" -----------------------------------------------------
// Lab funk in G minor: slap bass, a clavinet working out its experiments, bleeps from the
// instruments, and a pattern that keeps testing itself and changing.
SONGS.albert = {
  title: "Universal Doctor", bpm: 104, swing: 0.12, duck: 0.38,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[43, [58, 62, 65, 69]], [43, [58, 62, 65, 69]], [39, [58, 62, 63, 67]], [41, [57, 60, 63, 65]]];
    const [root, chord] = prog[b % 4];
    if ([0, 3, 8, 10].includes(s)) I.kick(t, s % 8 ? 0.75 : 1, { tone: 46, decay: 0.3 });
    if (s === 4 || s === 12) I.snare(t, 0.85, { rev: 0.18 });
    if (L >= 1 && (s === 7 || s === 15)) I.snare(t, 0.2, { rev: 0, decay: 0.06 });
    I.hat(t, s % 2 ? 0.28 : 0.5, { decay: 0.04 });
    // The slap: thumb on the root, a pop an octave up.
    for (const [st, iv, pop] of [[0, 0, 0], [2, 12, 1], [3, 0, 0], [6, 10, 1], [8, 0, 0], [10, 12, 1], [11, 7, 0], [14, 5, 1]]) if (st === s && (L > 0 || !pop)) I.bass(t, root + iv, sd * 0.8, pop ? 0.75 : 0.95, { cut: pop ? 4000 : 2000, q: pop ? 3 : 8, floor: 300, fd: 0.06 });
    // The clavinet's experiment: the same figure, each bar one note tested differently.
    if (L >= 1) { const F = [1, 4, 5, 9, 12, 13]; if (F.includes(s)) { const i = F.indexOf(s), m = chord[(i + (i === b % 6 ? 1 : 0)) % 4] + 12; I.pluck(t, m, sd * 0.5, 0.36, { wave: "square", cut: 3200, q: 10, floor: 800, fd: 0.05, decay: 0.08, dly: 0, pan: -0.3 }); } }
    // Bleeps from the instruments.
    if (L >= 2 && s % 4 === 2) I.bell(t, 84 + ((b * 7 + s) % 5) * 2, 0.12, 0.28, { ratio: 1, index: 0.2, dly: 0.35, pan: 0.6 });
    if (L >= 2 && s === 0) I.pad(t, chord, sd * 16, 0.28, { cut: 1500 });
    if (L >= 3 && b % 2 === 1) { const H = [[0, 74], [2, 77], [4, 79], [6, 81], [8, 82], [12, 81], [14, 77]]; for (const [st, m] of H) if (st === s) I.lead(t, m, sd * 1.8, 0.45, { waves: ["sawtooth", "square"], cut: 3200, vib: 8 }); }
  },
};

// ---- St. Catherine of Siena: "Precious Blood" -----------------------------------------------------
// Urgent, in D minor, with a heartbeat for a kick drum (lub-dub, lub-dub), strings that will not
// let go, and a choir crying out for the Church. She dictated the Dialogue in ecstasy.
SONGS.catherine = {
  title: "Precious Blood", bpm: 128, duck: 0.48,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[38, [57, 62, 65, 69]], [46, [58, 62, 65, 70]], [41, [57, 60, 65, 69]], [45, [57, 61, 64, 67]]];
    const [root, chord] = prog[b % 4];
    // The heartbeat: lub-dub on each beat.
    if (s % 4 === 0) I.kick(t, 1, { tone: 44, decay: 0.28 });
    if (s % 4 === 1) I.kick(t, 0.55, { tone: 50, decay: 0.18, pump: false });
    if (L >= 1 && (s === 4 || s === 12)) I.clap(t, 0.8, { rev: 0.3 });
    if (L >= 1) I.hat(t, s % 2 ? 0.3 : 0.5, { open: s % 4 === 2 });
    // Pulsing bass, every sixteenth: the blood running.
    if (s % 2 === 0 || L >= 2) I.bass(t, root + (s >= 12 && b % 2 ? 3 : 0), sd * 0.8, s % 2 ? 0.6 : 0.85, { kind: "pluck", cut: 1100 + L * 200, q: 5, floor: 200, fd: 0.06 });
    // The strings: long and insistent.
    if (s === 0) I.pad(t, chord, sd * 16, 0.5, { cut: 2200, att: 0.08, rel: 0.4 });
    if (L >= 1 && s % 2 === 0) I.pluck(t, chord[(s / 2) % 4] + 12, sd * 0.8, 0.3, { wave: "sawtooth", cut: 4800, q: 3, decay: 0.15, dly: 0.2 });
    // The cry.
    if (L >= 2 && b % 2 === 0) for (const [st, m, len] of [[0, 74, 4], [4, 77, 2], [6, 76, 2], [8, 74, 6], [14, 73, 2]]) if (st === s) I.choir(t, L >= 3 ? [m, m - 12, m - 5] : [m], len * sd * 0.95, 0.7, { vowel: "a", att: 0.04 });
    if (L >= 3 && s === 0 && b % 4 === 0) I.impact(t, 0.5);
    if (L >= 3 && s === 8 && b % 4 === 3) I.riser(t, sd * 8, 0.5);
  },
};
