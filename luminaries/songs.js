"use strict";
// Luminaries: the songs. Each is a score played on the band in audio.js, one
// sixteenth at a time. `L` is how far into the stage the player has come (0–3),
// and each song grows with it: a sparse opening, the full groove, then the
// lift. `fill` is something the game asked for this bar (a big clear: "home").
// The old melodies quoted here are public domain, from the chant books
// (as transcribed at GregoBase): St. Thomas's Pange lingua, the Te Deum, and
// Hildegard's own O virtus Sapientiae.

const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
const acc = (pat, s) => (pat[s] === "X" ? 1 : 0.62);
// A chord, as MIDI notes from a root and intervals.
const ch = (root, ...iv) => iv.map((i) => root + i);

// ---- The melodies -------------------------------------------------------------------------
// Pange lingua (mode III), its first two lines: [MIDI note, length in eighths].
const PANGE = [[64, 1], [64, 1], [65, 1], [64, 0.5], [62, 0.5], [67, 1], [67, 1], [69, 0.5], [72, 0.5], [72, 2],
  [72, 0.5], [74, 0.5], [72, 1], [72, 1], [71, 1], [69, 1], [72, 1], [71, 0.5], [69, 0.5], [67, 2]];
// Te Deum laudamus (the solemn tone), "Te Deum laudamus", down a tone into D.
const TEDEUM = [[62, 1], [65, 0.5], [67, 0.5], [67, 1], [67, 0.5], [65, 0.5], [67, 0.5], [69, 0.5], [67, 2]];
// O virtus Sapientiae: the great opening melisma on "O", and "virtus Sapientiae".
const VIRTUS = [52, 59, 57, 59, 64, 62, 60, 59, 57, 55, 55, 55, 60, 59, 57, 55, 53, 52,
  52, 53, 52, 50, 52, 52, 53, 59, 60, 62, 60, 59, 64, 62, 60, 59, 57, 55, 57, 59, 60, 60, 59];
// Adoro te devote: its first line.
const ADORO = [[65, 1], [69, 1], [72, 1], [72, 1], [72, 1], [72, 0.5], [74, 0.5], [72, 2], [71, 1], [69, 1], [67, 1], [65, 1], [65, 2]];

// Play a melody given as [note, eighths] from the start of a span of steps.
function melodyAt(mel, s0, s, fn) {
  let at = s0;
  for (const [m, len] of mel) { if (at === s) fn(m, len); at += len * 2; }
}

const SONGS = {};

// ---- St. Augustine: "Restless (Until It Rests)" ------------------------------------------------
// Neo-soul funk in D minor that will not come home: Gm9, A sus, B-flat, A altered,
// round and round, never the D minor it leans toward. Only a big clear lets it
// land, for one bar, on D minor, with the Te Deum over it (by an old legend,
// first sung by St. Ambrose and St. Augustine at his baptism).
SONGS.augustine = {
  title: "Restless (Until It Rests)", bpm: 106, swing: 0.16, duck: 0.42,
  play(e) {
    const { t, s, b, sd, L, I } = e, home = e.fill === "home";
    const prog = [[43, ch(46, 12, 16, 19, 23)], [45, ch(45, 17, 22, 26, 31)], [46, ch(46, 16, 19, 23, 30)], [45, ch(45, 16, 22, 27, 31)]];
    let [root, chord] = prog[b % 4];
    if (b % 4 === 1 && s >= 8) chord = ch(45, 16, 22, 25, 31);          // A7(b9): pulling harder
    if (home) { root = 38; chord = ch(41, 12, 16, 19, 23); }          // D minor nine: home, for a bar
    // Drums: a lazy, swung pocket.
    const K = L >= 2 ? "X.....x...x..x.." : "X.....x...x.....";
    if (on(K, s)) I.kick(t, acc(K, s), { tone: 46, decay: 0.42 });
    if (s === 4 || s === 12) { I.clap(t, 0.85); if (L >= 1) I.snare(t, 0.4, { rev: 0.15 }); }
    if (L >= 1 && (s === 7 || s === 15) && b % 2) I.snare(t, 0.12, { rev: 0 });
    I.hat(t, s % 4 === 2 ? 0.75 : s % 2 ? 0.28 : 0.45, { open: L >= 2 && s === 14 });
    if (L >= 1 && s % 2 === 1) I.shaker(t, 0.6);
    // The slap bass.
    const BASS = [[0, 0, 3], [3, 12, 1], [6, 0, 1], [7, 0, 1], [10, 7, 1], [11, 10, 1], [14, 12, 1]];
    for (const [st, iv, len] of BASS) if (st === s && (L > 0 || st % 4 !== 3)) I.bass(t, root + iv, len * sd * 0.9, st === 0 ? 1 : 0.8, { kind: "pluck", cut: 2600, q: 11, floor: 170 });
    // Rhodes: a held chord at first, then stabs on the offbeats.
    if (L === 0) { if (s === 0) I.keys(t, chord, sd * 14, 0.9, { rev: 0.3 }); }
    else if (s === 2 || s === 7 || s === 12) I.keys(t, chord, sd * (s === 12 ? 3 : 2), 0.85, { dly: 0.12 });
    // The warm pad, then the flaming brass.
    if (L >= 2 && s === 0) I.pad(t, chord.map((m) => m - 12), sd * 16, 0.6, { cut: 1300, att: 0.4, rev: 0.4 });
    if (L >= 3 && (s === 6 || s === 14) && !home) I.stab(t, chord, 0.7, { cut: 4200 });
    // The restless line, a flame flickering up and never settling.
    if (L >= 2 && !home) { const R = [0, 3, 5, 7, 10, 12, 10, 7]; if (s % 4 === 3 && b % 2 === 1) I.pluck(t, 74 + R[(s >> 2) + (b % 4) * 2 & 7] - 12, sd * 2, 0.5, { wave: "square", cut: 3200, dly: 0.35, pan: 0.3 }); }
    // Home: the Te Deum, sung.
    if (home) { melodyAt(TEDEUM, 0, s, (m, len) => I.choir(t, [m, m - 12], len * 2 * sd, 0.9, { vowel: "o", att: 0.03, rel: 0.25 })); if (s === 0) { I.stab(t, chord, 0.9, { cut: 5000 }); I.bell(t, 86, 2, 0.5); } }
  },
};

// ---- St. Hildegard: "Viriditas" ---------------------------------------------------------------
// Melodic house in E Phrygian, as her chant is: her own O virtus Sapientiae sung
// high above, wide leaps of two octaves in the arpeggios, and a sub bass that
// drops to the very bottom every fourth bar. Very high and very low at once.
SONGS.hildegard = {
  title: "Viriditas", bpm: 122, duck: 0.55,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[40, ch(52, 7, 12, 15, 19)], [41, ch(53, 4, 7, 11, 18)], [43, ch(55, 4, 7, 9, 14)], [41, ch(53, 4, 7, 11, 14)]];
    const [root, chord] = prog[b % 4];
    // Drums: four to the floor (only two at first), open hats on the off-beat, tuned toms in the Phrygian.
    if (L >= 1 ? s % 4 === 0 : s === 0 || s === 8) I.kick(t, 1, { tone: 44, decay: 0.45 });
    if (L >= 1 && (s === 4 || s === 12)) I.clap(t, 0.7, { rev: 0.4 });
    if (s % 4 === 2) I.hat(t, 0.7, { open: true, pan: 0.25 });
    if (L >= 1) I.shaker(t, s % 2 ? 0.5 : 0.8, { pan: -0.4 });
    if (L >= 2 && [3, 6, 11, 14].includes(s)) I.tom(t, [52, 55, 53, 59][[3, 6, 11, 14].indexOf(s)], 0.45, { pan: s < 8 ? -0.4 : 0.4 });
    // The bass rolls on the off-beats, leaping an octave; every fourth bar it falls to the bottom of hearing.
    if (b % 4 === 3 && s === 0) I.bass(t, 28, sd * 8, 1.1, { kind: "sub", drive: 0.6 });
    else if (s % 4 === 2 || (L >= 2 && s % 4 === 3)) I.bass(t, root + (s === 14 ? 12 : 0), sd * 1.6, 0.85, { kind: "pluck", cut: 1600, q: 6 });
    // The pad.
    if (L >= 1 && s === 0) I.pad(t, chord, sd * 16, 0.55, { cut: 900, sweep: L >= 3 ? 3500 : 1400, att: 0.3 });
    // An arpeggio that leaps across three octaves.
    const LEAP = [0, 24, 7, 31, 12, 19, 3, 27, 0, 19, 12, 36, 7, 24, 15, 31];
    if (L >= 2 || s % 2 === 0) I.pluck(t, 52 + ((LEAP[s] + (b % 4 === 1 ? 1 : 0)) % 36), sd, 0.42, { wave: "triangle", cut: 6000, q: 2, dly: 0.35, rev: 0.3, pan: (s % 4 - 1.5) / 2 });
    // Her song, an eighth to a note, an octave and two octaves up: the melisma climbing from the depths.
    if (L >= 1 && s % 2 === 0) {
      const i = ((b % 8) * 8 + s / 2) % (VIRTUS.length + 7);
      if (i < VIRTUS.length) {
        const m = VIRTUS[i] + 12;
        I.choir(t, [m], sd * 2.2, 0.75, { vowel: (i % 7 < 3) ? "a" : "e", att: 0.02, rel: 0.2, rev: 0.6 });
        if (L >= 3) I.bell(t, m + 24, 0.6, 0.35, { dly: 0.3 });
      }
    }
  },
};

// ---- St. Thomas Aquinas: "Summa Funkologica" -------------------------------------------------
// Progressive funk shaped like an article of the Summa. Objections: three bars of
// 7/8. On the contrary: a bar of 5/4. I answer that: four square bars of 4/4 with
// his own Pange lingua over them. Replies to the objections: four bars of 7/8.
SONGS.thomas = {
  title: "Summa Funkologica", bpm: 116, swing: 0.06, duck: 0.35,
  bars: [14, 14, 14, 20, 16, 16, 16, 16, 14, 14, 14, 14],
  play(e) {
    const { t, s, b, n, sd, L, I } = e, part = b % 12;
    const sec = part < 3 ? "obj" : part === 3 ? "contra" : part < 8 ? "resp" : "rep";
    const CH = {
      obj: [[45, ch(57, 3, 7, 10, 14, 17)], [46, ch(58, 4, 6, 11, 14)], [45, ch(57, 3, 7, 10, 17)]],
      contra: [[43, ch(55, 4, 9, 14)], [40, ch(52, 4, 10, 15)]],
      resp: [[41, ch(53, 4, 7, 11, 14)], [43, ch(55, 4, 10, 14, 21)], [40, ch(52, 3, 7, 10, 14)], [45, ch(57, 3, 7, 10, 14)]],
      rep: [[38, ch(50, 3, 7, 10, 14)], [40, ch(52, 4, 10, 13, 15)], [45, ch(57, 3, 7, 10, 17)], [41, ch(53, 4, 7, 11)]],
    };
    let k = sec === "obj" ? part : sec === "resp" ? part - 4 : sec === "rep" ? part - 8 : s < 12 ? 0 : 1;
    let [root, chord] = CH[sec][k];
    if (sec === "rep" && k === 3 && s >= 8) { root = 40; chord = ch(52, 4, 7, 10, 13); }   // the Phrygian close, F to E
    // Drums, grouped 2+2+3 in the sevens, 3+3+2+2 in the five.
    const DR = {
      14: { k: "X.....x.x.....", sn: "....x......x..", h: "x.x.x.x.x.x.x." },
      20: { k: "X.....x...x...x.....", sn: "....x.......x.....x.", h: "x.x.x.x.x.x.x.x.x.x." },
      16: { k: "X..x..x...x..x..", sn: "....x.......x...", h: "xxxxxxxxxxxxxxxx" },
    }[n];
    if (on(DR.k, s)) I.kick(t, acc(DR.k, s), { tone: 47, decay: 0.36 });
    if (on(DR.sn, s)) I.snare(t, 0.9, { rev: 0.18 });
    if (L >= 1 && n === 16 && (s === 7 || s === 9 || s === 15)) I.snare(t, 0.16, { rev: 0 });
    if (on(DR.h, s)) I.hat(t, s % 4 === 0 ? 0.7 : 0.4, { open: L >= 2 && s === n - 2 });
    if (L >= 2 && n !== 16 && s % 2 === 1) I.rim(t, 0.35, { pan: 0.35 });
    // The bass: a clavinet-tight riff that fits each bar's length.
    const BR = { 14: [[0, 0, 2], [2, 12, 1], [3, 0, 1], [6, 7, 1], [8, 10, 1], [9, 12, 1], [11, 7, 1], [12, 3, 2]],
      20: [[0, 0, 2], [3, 12, 1], [6, 0, 2], [10, 7, 1], [12, 0, 1], [14, 12, 1], [16, 10, 1], [18, 7, 1]],
      16: [[0, 0, 2], [3, 12, 1], [4, 0, 1], [6, 10, 1], [8, 0, 2], [10, 7, 1], [11, 10, 1], [13, 12, 1], [14, 0, 1]] }[n];
    for (const [st, iv, len] of BR) if (st === s && (L > 0 || st % 2 === 0)) I.bass(t, root + iv, len * sd * 0.85, 0.9, { kind: "pluck", cut: 3000, q: 12, floor: 200, fd: 0.1 });
    // The clavinet chops, and the keys.
    if (L >= 1 && s % 2 === 1 && (s * 7 + b) % 3 !== 0) I.pluck(t, chord[(s >> 1) % chord.length], sd * 0.7, 0.45, { wave: "square", cut: 3800, q: 8, floor: 900, fd: 0.05, decay: 0.08, dly: 0, rev: 0.05, pan: -0.35 });
    if (s === 0 || (L >= 2 && s === (n === 14 ? 8 : 10))) I.keys(t, chord, sd * 5, 0.8, { rev: 0.25 });
    // A brass hit at the turn of every section.
    if (L >= 2 && s === 0 && (part === 0 || part === 3 || part === 4 || part === 8)) I.stab(t, chord.slice(0, 4), 0.9, { cut: 5200 });
    if (sec === "contra" && s === 12) { I.bell(t, 88, 1.4, 0.4); if (L >= 1) I.riser(t, sd * 8, 0.6); }
    // I answer that: Pange lingua, on a gliding synth lead (and the choir behind it, at the height of the stage).
    if (sec === "resp" && L >= 1) {
      const half = part - 4 < 2 ? 0 : 1, mel = half ? PANGE.slice(10) : PANGE.slice(0, 10);
      if ((part - 4) % 2 === 0) melodyAt(mel, 0, s, (m, len) => { I.lead(t, m + 12, len * 2 * sd * 0.9, 0.7, { cut: 3000, glide: m + 10, vib: 12, dly: 0.25 }); if (L >= 3) I.choir(t, [m], len * 2 * sd, 0.55, { vowel: "a", att: 0.04 }); });
    }
  },
};

// ---- St. Teresa of Ávila: "Seven Mansions" -----------------------------------------------------
// Bright, outgoing nu-disco with a Spanish heart: four to the floor, palmas,
// octave bass, house piano, a nylon-string guitar, and at the height of the
// stage strings that soar, and the Phrygian turn of a flamenco cadence.
SONGS.teresa = {
  title: "Seven Mansions", bpm: 124, swing: 0.05, duck: 0.55,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[45, ch(57, 4, 7, 11, 14)], [44, ch(56, 8, 11, 15, 20)], [42, ch(54, 3, 7, 10, 14)], [50, ch(62, 4, 7, 11, 14)],
      [47, ch(59, 3, 7, 10, 14)], [52, ch(64, 4, 7, 10, 13)], [41, ch(53, 4, 7, 11)], [40, ch(52, 4, 7, 10)]];
    const [root, chord] = prog[b % 8];
    if (s % 4 === 0) I.kick(t, 1, { tone: 46, decay: 0.34 });
    if (s === 4 || s === 12) I.clap(t, 0.85);
    if (s % 4 === 2) I.hat(t, 0.75, { open: true });
    if (s % 2 === 1) I.hat(t, 0.3, { pan: -0.2 });
    // Palmas: the hand-clapping of Andalusia.
    const PAL = "..x.x..x..x.x..x";
    if (L >= 1 && on(PAL, s)) I.clap(t, 0.32, { f: 1800, decay: 0.08, rev: 0.12, pan: s % 2 ? 0.4 : -0.4 });
    // The octave bass of disco.
    if (s % 2 === 0) I.bass(t, root + (s % 4 === 2 ? 12 : 0), sd * 1.7, 0.85, { kind: "pluck", cut: 2000, q: 7 });
    // House piano on the off-beats.
    const PNO = "..x..x....x..x..";
    if (on(PNO, s)) I.keys(t, chord.map((m) => m + 12), sd * 1.5, 0.75, { bark: 3.2, rev: 0.2 });
    // The guitar: a bright arpeggio (and a flamenco run into the last bar).
    if (L >= 2) { const AR = [0, 2, 1, 3, 2, 4, 3, 2]; I.pluck(t, chord[AR[s % 8] % chord.length] + 12, sd * 1.2, 0.35, { wave: "triangle", cut: 3800, q: 3, dly: 0.15, rev: 0.15, pan: 0.45 }); }
    if (L >= 1 && b % 8 === 6 && s >= 8) I.pluck(t, [64, 65, 67, 69, 70, 69, 67, 65][s - 8], sd, 0.5, { wave: "triangle", cut: 4200, dly: 0.1, pan: -0.3 });
    // Strings, held and then soaring.
    if (L >= 2 && s === 0) I.pad(t, chord, sd * 16, 0.55, { cut: 2600, att: 0.25, rev: 0.45, voices: 3 });
    if (L >= 3) {
      // Over four bars: [note, sixteenths].
      const SM = [[76, 4], [78, 2], [81, 6], [80, 4], [76, 8], [73, 4], [74, 4], [76, 8], [77, 4], [76, 4], [74, 8], [73, 8]];
      const pos = (b % 4) * 16 + s; let at = 0;
      for (const [m, len] of SM) { if (at === pos) I.lead(t, m, len * sd, 0.6, { waves: ["sawtooth", "sawtooth"], cut: 3400, vib: 14, att: 0.06, rev: 0.4, dly: 0.2 }); at += len; }
    }
  },
};

// ---- St. John of the Cross: "Noche Oscura" -----------------------------------------------------
// Almost nothing: a deep kick, a sub bass that hardly moves, a click in the dark,
// and one high, far light that comes and goes. The night lets things in slowly.
SONGS.john = {
  title: "Noche Oscura", bpm: 84, duck: 0.25, delay: (60 / 84) * 1.5,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const roots = [36, 36, 32, 31];
    const root = roots[b % 4];
    if (s === 0 || s === 10) I.kick(t, s ? 0.6 : 0.9, { tone: 40, decay: 0.6, click: 0.3 });
    if (s === 0 && (L >= 1 || b % 2 === 0)) I.bass(t, root - 12, sd * (L >= 1 ? 15 : 10), 0.62, { kind: "sub", drive: 0.12 });
    if (L >= 1 && (s === 6 || (s === 14 && b % 2))) I.rim(t, 0.35, { f: 2200, pan: s === 6 ? -0.5 : 0.5 });
    if (L >= 2 && s % 2 === 0) I.hat(t, 0.18, { decay: 0.02, pan: (s % 8 - 4) / 6 });
    // The ray: one high note, far off, every other bar.
    if (s === 8 && b % 2 === 0) I.bell(t, [79, 82, 77, 79][(b >> 1) % 4], 3.5, 0.4, { ratio: 2, index: 1.2, rev: 0.7, dly: 0.5 });
    if (L >= 2 && s === 0) I.pad(t, [root + 12, root + 19, root + 26], sd * 16, 0.5, { cut: 380, att: 1.2, rel: 1.5, wave: "sawtooth", rev: 0.6 });
    if (L >= 3 && s === 0 && b % 4 === 0) I.choir(t, [60, 63, 67, 70], sd * 30, 0.45, { vowel: "o", att: 2, rel: 2, rev: 0.8 });
  },
};

// ---- St. Thérèse of Lisieux: "Shower of Roses" -------------------------------------------------
// Bright, girly, euphoric techno: big pumping supersaw chords, a rolling bass,
// music-box sparkles, chopped "ah"s singing the hook, snare rolls that lift into
// the next phrase. The sidechain pump is deep and the colours are pink.
SONGS.therese = {
  title: "Shower of Roses", bpm: 140, duck: 0.72,
  play(e) {
    const { t, s, b, sd, L, I } = e;
    const prog = [[41, ch(65, 4, 7, 12)], [48, ch(64, 3, 8, 12)], [50, ch(65, 4, 9, 12)], [46, ch(65, 5, 9, 12)]];
    const [root, chord] = prog[b % 4];
    const build = b % 8 === 7;
    if ((L >= 1 || s === 0 || s === 8) && s % 4 === 0 && !(build && s >= 8 && L >= 2)) I.kick(t, 1, { tone: 50, decay: 0.3, drive: 0.4 });
    if (L >= 1 && (s === 4 || s === 12)) I.clap(t, 0.8, { rev: 0.25 });
    if (s % 4 === 2) I.hat(t, 0.8, { open: true, f: 8500 });
    if (L >= 2) I.hat(t, s % 2 ? 0.25 : 0.4, { pan: 0.3 });
    // The snare roll before the change, faster and louder.
    if (L >= 2 && build && s >= 8) {
      I.snare(t, 0.3 + (s - 8) * 0.08, { rev: 0.2 });
      if (s >= 12) I.snare(t + sd / 2, 0.4 + (s - 12) * 0.1, { rev: 0.2 });
    }
    if (L >= 2 && build && s === 0) I.riser(t, sd * 16, 0.8);
    // The rolling bass: three sixteenths after every beat.
    if (s % 4 !== 0) I.bass(t, root + (s % 4 === 3 ? 12 : 0), sd * 0.85, 0.75, { kind: "pluck", cut: 1500, q: 5, floor: 220, sus: 0.4 });
    // The supersaws, struck on every beat and pumped by the kick.
    if (s === 0) I.pad(t, L >= 1 ? chord : chord.slice(0, 3), sd * 16, L >= 1 ? 0.9 : 0.5, { cut: L >= 3 ? 5200 : L >= 1 ? 3400 : 1400, att: 0.01, rel: 0.2, width: 1.2 });
    // The music box.
    const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
    if (s % 2 === 0) I.bell(t, chord[ARP[(s / 2) % 8] % chord.length] + 12, 0.5, 0.3, { ratio: 4, index: 1.5, dly: 0.25, pan: (s % 8) / 8 - 0.5 });
    // The hook, sung in cut-up "ah"s.
    const HOOK = [[0, 77], [3, 76], [6, 72], [8, 74], [10, 77], [14, 79]];
    if (L >= 2) for (const [st, m] of HOOK) if (st === s) I.vox(t, m + (b % 4 === 3 && st === 14 ? 2 : 0), sd * 1.6, 0.8, { vowel: st % 4 === 2 ? "o" : "a" });
    if (L >= 3) for (const [st, m] of HOOK) if (st === s) I.lead(t, m + 12, sd * 1.5, 0.45, { waves: ["sawtooth", "sawtooth"], cut: 5000, dly: 0.3, rev: 0.3 });
  },
};

// ---- The title: "Lumen" -----------------------------------------------------------------------
// A slow, warm groove, with St. Thomas's Adoro te devote on a glass bell.
SONGS.title = {
  title: "Lumen", bpm: 92, swing: 0.1, duck: 0.3,
  play(e) {
    const { t, s, b, sd, I } = e;
    const prog = [[41, ch(57, 3, 7, 11)], [43, ch(58, 4, 7, 9)], [45, ch(57, 3, 7, 10)], [46, ch(58, 4, 7, 11)]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || s === 10) I.kick(t, 0.7, { tone: 44, decay: 0.5 });
    if (s === 4 || s === 12) I.snare(t, 0.35, { rev: 0.4 });
    if (s % 2 === 0) I.hat(t, 0.25);
    if (s === 0 || s === 7) I.bass(t, root, sd * 5, 0.7, { kind: "sub" });
    if (s === 0) I.pad(t, chord, sd * 16, 0.5, { cut: 1200, att: 0.6, rev: 0.5 });
    if (b % 8 < 4 && b % 2 === 0) melodyAt(ADORO.slice(0, 7), 0, s, (m, len) => I.bell(t, m + 12, len * 2 * sd + 0.6, 0.5, { ratio: 3, index: 2 }));
    if (b % 8 < 4 && b % 2 === 1) melodyAt(ADORO.slice(7), 0, s, (m, len) => I.bell(t, m + 12, len * 2 * sd + 0.6, 0.5, { ratio: 3, index: 2 }));
  },
};
