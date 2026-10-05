"use strict";
// SELAH: the songs. Each psalm's song is a progressive form (an intro, verses in more than one
// meter, a build, a drop, a breakdown, a second drop, an outro) with a drum part written out bar
// by bar. The drum part is the game: the same patterns that play the drums make the chart, as in
// Rock Band, and every stroke says the lowest rank that plays it:
//
//   0  Feria         kick and snare on the beat, a cymbal now and then
//   1  Memoria       the syncopated kicks, the simple fills
//   2  Festum        the hi-hats, the toms, the fills in eighths
//   3  Sollemnitas   the sixteenths, the ghost strokes, the whole fill
//   x  played by the band, charted at no rank      g  a ghost stroke (quiet), charted at Sollemnitas
//   f  charted at Feria only (a kick that the higher ranks trade for a roll)        .  nothing
//
// One character to a sixteenth; spaces are only for reading. The pieces: kick, snare, clap and rim
// (the snare's place on the line), hat and ohat (the hi-hat's), tom1, tom2, tom3, crash and ride (the
// cymbals'). { roll: [piece, from, to, rank] } is a roll: the band plays it in thirty-seconds, and the
// chart in strokes on the snare that quicken (compiler.js). Every note in a chart is a tap, and the
// compiler keeps each rank to its rules and to what two thumbs can reach (hands.js).
//
// The words ride the strokes (compiler.js). In the verse sections, each line of the psalm takes two
// bars; the instrumental ones carry no words. The band builds with the combo
// (`L`, 0–3) in everything but the drums, which always play in full.

const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
const ch = (root, ...iv) => iv.map((i) => root + i);
const up = (notes, lo) => notes.map((m) => { while (m < lo) m += 12; return m; }).sort((a, b) => a - b);
const pat = (s) => s.replace(/\s+/g, "");
// A lighter organ (four drawbars), so a phone can carry a full band.
const ORGAN = [[1, 1], [2, 0.7], [3, 0.45], [4, 0.3]];
const dots = (n) => ".".repeat(n);
// A pattern of `len` sixteenths with strokes at the steps given: at(18, { 0: "0", 6: "1" }).
const at = (len, m) => { const a = Array(len).fill("."); for (const k in m) a[k] = m[k]; return a.join(""); };
// The eighths of a bar of `len`, marked c (and the sixteenths between, c2).
const eighths = (len, c, c2) => Array.from({ length: len }, (_, i) => (i % 2 ? c2 || "." : c)).join("");
// One stroke at step s of a pattern, or none.
const VEL = { 0: 1, 1: 0.95, f: 1, 2: 0.82, 3: 0.72, x: 0.62, g: 0.26 };

// ---- The drums ------------------------------------------------------------------------------------
// Play a bar's patterns on a kit, at the step being played.
function playDrums(e, pats, kit) {
  const { t, s, sd, I } = e;
  for (const k in pats) {
    if (k === "roll") continue;
    const c = pats[k] && pats[k][s];
    if (c && c !== "." && kit[k]) kit[k](I, t, VEL[c] || 0.8, sd);
  }
  const r = pats.roll;
  if (r && s >= r[1] && s < r[2]) {
    const k = (s - r[1]) / Math.max(1, r[2] - r[1]);
    kit[r[0]](I, t, 0.3 + 0.55 * k, sd); kit[r[0]](I, t + sd / 2, 0.26 + 0.55 * k, sd);
  }
}
const KITS = {
  // Clean house drums: a round kick, a clap on the snare, bright hats, tuned toms.
  house: {
    kick: (I, t, v) => I.kick(t, v, { tone: 45, decay: 0.38 }),
    snare: (I, t, v) => { I.clap(t, 0.85 * v, { rev: 0.25 }); I.snare(t, 0.4 * v, { rev: 0.08 }); },
    clap: (I, t, v) => I.clap(t, 0.9 * v, { rev: 0.3 }),
    rim: (I, t, v) => I.rim(t, 0.8 * v, { f: 1900 }),
    hat: (I, t, v) => I.hat(t, 0.5 * v, { decay: 0.04 }),
    ohat: (I, t, v) => I.hat(t, 0.6 * v, { open: true }),
    tom1: (I, t, v) => I.tom(t, 53, v), tom2: (I, t, v) => I.tom(t, 48, v), tom3: (I, t, v) => I.tom(t, 43, v, { decay: 0.4 }),
    crash: (I, t, v) => I.crash(t, 0.6 * v), ride: (I, t, v) => I.ride(t, 0.9 * v),
  },
  // Bass-music drums: a deep kick, a huge snare in a long hall, tight hats, low toms.
  dub: {
    kick: (I, t, v) => I.kick(t, v, { tone: 40, decay: 0.55, drive: 0.12, punch: 140 }),
    snare: (I, t, v) => { I.snare(t, v, { f: 1700, rev: 0.35, decay: 0.22 }); I.clap(t, 0.55 * v, { rev: 0.45 }); },
    clap: (I, t, v) => I.clap(t, v, { rev: 0.5 }),
    rim: (I, t, v) => I.rim(t, 0.9 * v, { f: 2100 }),
    hat: (I, t, v) => I.hat(t, 0.38 * v, { decay: 0.028, f: 8600 }),
    ohat: (I, t, v) => I.hat(t, 0.5 * v, { open: true, f: 8000 }),
    tom1: (I, t, v) => I.tom(t, 50, v), tom2: (I, t, v) => I.tom(t, 45, v), tom3: (I, t, v) => I.tom(t, 40, v, { decay: 0.5 }),
    crash: (I, t, v) => I.crash(t, 0.55 * v, { f: 4800 }), ride: (I, t, v) => I.ride(t, 0.8 * v),
  },
  // Breakbeat drums: a punchy kick, a cracking snare, the tambourine of a gospel band.
  break: {
    kick: (I, t, v) => I.kick(t, v, { tone: 48, decay: 0.3, punch: 190 }),
    snare: (I, t, v) => { I.snare(t, v, { f: 2200, decay: 0.15, rev: 0.16 }); if (v > 0.5) I.clap(t, 0.35 * v, { rev: 0.2 }); },
    clap: (I, t, v) => I.clap(t, v, { rev: 0.3 }),
    rim: (I, t, v) => I.rim(t, 0.8 * v),
    hat: (I, t, v) => I.hat(t, 0.5 * v, { decay: 0.035 }),
    ohat: (I, t, v) => I.hat(t, 0.6 * v, { open: true }),
    tom1: (I, t, v) => I.tom(t, 55, v), tom2: (I, t, v) => I.tom(t, 50, v), tom3: (I, t, v) => I.tom(t, 44, v, { decay: 0.35 }),
    crash: (I, t, v) => I.crash(t, 0.6 * v), ride: (I, t, v) => I.ride(t, 0.95 * v, { bell: v > 0.9 }),
  },
};

// Drum and bass: a tight, punchy kick, a cracking snare, crisp hats.
KITS.dnb = {
  kick: (I, t, v) => I.kick(t, v, { tone: 50, decay: 0.26, punch: 210, click: 1.3 }),
  snare: (I, t, v) => { I.snare(t, v, { f: 2500, decay: 0.13, rev: 0.12 }); if (v > 0.5) I.clap(t, 0.3 * v, { rev: 0.18 }); },
  clap: (I, t, v) => I.clap(t, v, { rev: 0.25 }),
  rim: (I, t, v) => I.rim(t, 0.85 * v, { f: 2300 }),
  hat: (I, t, v) => I.hat(t, 0.42 * v, { decay: 0.026, f: 9400 }),
  ohat: (I, t, v) => I.hat(t, 0.5 * v, { open: true, f: 8800 }),
  tom1: (I, t, v) => I.tom(t, 57, v), tom2: (I, t, v) => I.tom(t, 52, v), tom3: (I, t, v) => I.tom(t, 45, v, { decay: 0.4 }),
  crash: (I, t, v) => I.crash(t, 0.55 * v), ride: (I, t, v) => I.ride(t, 0.85 * v),
};
// Late at night: a soft kick, a brushed snare, a rim, quiet hats.
KITS.lofi = {
  kick: (I, t, v) => I.kick(t, 0.9 * v, { tone: 44, decay: 0.42, punch: 110, click: 0.35 }),
  snare: (I, t, v) => { I.snare(t, 0.55 * v, { f: 1500, decay: 0.2, rev: 0.32 }); I.rim(t, 0.22 * v, { f: 1500 }); },
  clap: (I, t, v) => I.clap(t, 0.65 * v, { rev: 0.42 }),
  rim: (I, t, v) => I.rim(t, 0.6 * v, { f: 1700 }),
  hat: (I, t, v) => I.hat(t, 0.32 * v, { decay: 0.05, f: 6800 }),
  ohat: (I, t, v) => I.hat(t, 0.38 * v, { open: true, f: 6400 }),
  tom1: (I, t, v) => I.tom(t, 52, 0.8 * v), tom2: (I, t, v) => I.tom(t, 47, 0.8 * v), tom3: (I, t, v) => I.tom(t, 43, 0.8 * v, { decay: 0.4 }),
  crash: (I, t, v) => I.crash(t, 0.4 * v, { f: 4200, decay: 2 }), ride: (I, t, v) => I.ride(t, 0.7 * v),
};
// Afro house: claps and rims, shakers for the hats, congas for the toms, an agogo bell for the ride.
KITS.afro = {
  kick: (I, t, v) => I.kick(t, v, { tone: 46, decay: 0.34, punch: 150 }),
  snare: (I, t, v) => { I.clap(t, 0.75 * v, { rev: 0.3 }); I.rim(t, 0.35 * v, { f: 1900 }); },
  clap: (I, t, v) => I.clap(t, 0.9 * v, { rev: 0.35 }),
  rim: (I, t, v) => I.rim(t, 0.8 * v, { f: 2000 }),
  hat: (I, t, v) => { I.shaker(t, 1.5 * v); I.hat(t, 0.16 * v, { decay: 0.03 }); },
  ohat: (I, t, v) => I.hat(t, 0.45 * v, { open: true }),
  tom1: (I, t, v) => I.perc(t, 69, v, { decay: 0.1, pan: 0.3 }), tom2: (I, t, v) => I.perc(t, 64, v, { decay: 0.14, pan: -0.2 }), tom3: (I, t, v) => I.perc(t, 57, v, { decay: 0.2 }),
  crash: (I, t, v) => I.crash(t, 0.55 * v), ride: (I, t, v) => I.bell(t, 84, 0.12, 0.35 * v, { ratio: 2.76, index: 2, rev: 0.1, dly: 0, pan: 0.3 }),
};
// Minimal techno: a deep soft kick, a rim like a clock, claps far off in the hall.
KITS.minimal = {
  kick: (I, t, v) => I.kick(t, 0.9 * v, { tone: 42, decay: 0.45, punch: 120, click: 0.5 }),
  snare: (I, t, v) => { I.clap(t, 0.5 * v, { rev: 0.5 }); I.rim(t, 0.3 * v); },
  clap: (I, t, v) => I.clap(t, 0.6 * v, { rev: 0.5 }),
  rim: (I, t, v) => I.rim(t, 0.7 * v, { f: 2200 }),
  hat: (I, t, v) => I.hat(t, 0.3 * v, { decay: 0.03, f: 9000 }),
  ohat: (I, t, v) => I.hat(t, 0.35 * v, { open: true, f: 8000 }),
  tom1: (I, t, v) => I.tom(t, 50, v), tom2: (I, t, v) => I.tom(t, 45, v), tom3: (I, t, v) => I.tom(t, 40, v, { decay: 0.45 }),
  crash: (I, t, v) => I.crash(t, 0.4 * v), ride: (I, t, v) => I.ride(t, 0.6 * v),
};

// Fills, by meter: rank by rank, from a snare stroke at Memoria to a full run of toms at Sollemnitas.
const FILLS = {
  16: [
    { kick: "0... .... 0... ....", snare: "....0.......1...", tom1: ".............3..", tom2: "..............2.", tom3: "...............3" },
    { kick: "0... .... .... ....", snare: "....0.........23", tom1: "........13......", tom2: "..........23....", tom3: "............13.." },
    { kick: "0... .... 0... ....", snare: "....0...2.3.1323" },
    { kick: "0... ..1. ..1. ....", snare: "....0.......0...", tom1: "...........3....", tom2: ".............3..", tom3: "..............2." },
  ],
  14: [{ kick: "0.............", snare: "....0.........", tom1: "........13....", tom2: "..........23..", tom3: "............13" }],
  12: [{ kick: "0...........", snare: "......0.....", tom1: "........1...", tom2: ".........3..", tom3: "..........23" }],
  20: [{ kick: "0...........0.......", snare: "........0...........", tom1: "................13..", tom2: "..................2.", tom3: "...................3" }],
};
// A bar of groove: the base patterns; a fill where the bar ends a phrase (its hats stop halfway); a
// crash where one begins.
function groove(B, base, fills) {
  let p = {};
  for (const k in base) p[k] = pat(base[k]);
  if (B.fill) {
    const F = (fills || FILLS[B.len] || FILLS[16]), f = F[(B.fillK || 0) % F.length];
    for (const k of ["kick", "snare", "clap", "tom1", "tom2", "tom3"]) delete p[k];
    for (const k in f) p[k] = pat(f[k]);
    for (const k of ["hat", "ohat", "ride"]) if (p[k]) p[k] = p[k].slice(0, B.len >> 1) + dots(B.len - (B.len >> 1));
  }
  if (B.crash) p.crash = p.crash ? "0" + p.crash.slice(1) : "0" + dots(B.len - 1);
  return p;
}

// ---- The form -------------------------------------------------------------------------------------
// The song object the conductor plays: the plan (compiler.js) says what every bar is.
function band(def) {
  const S = Object.assign({}, def);
  S.len = function (b) { const B = this.plan && this.plan.bars[b]; return B ? B.len : 16; };
  S.section = function (B) { return B.sec === "selah" ? Object.assign({}, SELAH, this.sec.selah || {}) : this.sec[B.sec]; };
  S.pats = function (B) { const sec = this.section(B); return sec && sec.drums ? sec.drums.call(this, B) : {}; };
  S.play = function (e) {
    const B = this.plan && this.plan.bars[e.b];
    if (!B) return;
    playDrums(e, this.pats(B), this.kit);
    const sec = this.section(B);
    if (sec && sec.play) sec.play.call(this, e, B, Math.max(e.L, B.minL || 0));
  };
  S.tones = function () { return [72]; };
  return S;
}
// A Selah: the band falls away to the held chord and a heartbeat; a riser into the drop.
const SELAH = {
  drums: (B) => ({ kick: B.i % 2 === 0 ? "x..x" + dots(B.len - 4) : "x" + dots(B.len - 1) }),
  play(e, B) {
    const { t, s, sd, I } = e, chord = this.selahChord || [60, 63, 67];
    if (s === 0 && B.i === 0) I.pad(t, chord, sd * B.len * B.n - 0.1, 0.55, { cut: 800, att: 0.4, rel: 1.2, rev: 0.6, voices: 3 });
    if (B.i === B.n - 1 && s === (B.len >> 1)) I.riser(t, sd * (B.len >> 1), 0.6);
  },
};

const SONGS = {};

// ---- The title: "Selah" -------------------------------------------------------------------------
// Slow and deep, D minor: a soft kick, a sub, ninths on the electric piano, and far above, on a
// glass bell, the intonation of the first psalm tone (F, G, A), waiting.
SONGS.title = {
  title: "Selah", bpm: 92, swing: 0.12, duck: 0.3,
  play(e) {
    const { t, s, b, sd, I } = e;
    const prog = [[38, [53, 57, 60, 64]], [46, [50, 53, 57, 60]], [43, [53, 58, 62, 65]], [45, [52, 55, 61, 64]]];
    const [root, chord] = prog[b % 4];
    if (s === 0 || (s === 10 && b % 2)) I.kick(t, s ? 0.5 : 0.75, { tone: 42, decay: 0.5, click: 0.3 });
    if (s === 8) I.rim(t, 0.25, { f: 2000, pan: 0.4 });
    if (s % 4 === 2) I.hat(t, 0.22, { decay: 0.03 });
    if (s === 0) I.bass(t, root - 12, sd * 14, 0.6, { kind: "sub", drive: 0.1 });
    if (s === 0) I.keys(t, chord, sd * 12, 0.7, { rev: 0.4, dly: 0.15 });
    if (s === 0 && b % 2 === 0) I.pad(t, up(chord, 62), sd * 32, 0.4, { cut: 1200, att: 1, rel: 1.5, rev: 0.6, voices: 3 });
    const BELL = [[4, 77], [6, 79], [8, 81]];
    if (b % 4 === 1) for (const [st, m] of BELL) if (st === s) I.bell(t, m, 2.4, 0.3, { ratio: 2, index: 1.4, rev: 0.6, dly: 0.4 });
  },
};

// ---- Psalm 1, Beatus vir: "Two Ways" --------------------------------------------------------------
// Progressive house in D Dorian (the mode of the first psalm tone). The just walk in four: a deep
// house groove, a walking bass, ninths on the electric piano, a bell singing the first tone. The way of
// the wicked limps in seven: the second verses are in 7/8, a clavinet and a slap bass stumbling
// against the beat, a flute above. The drops are breakbeat house, with chopped voices and a
// supersaw. The tree by the running waters: tech house, organ and strings. And then the way of the
// wicked perishes: the last two bars of the last drop fall back into seven, and the song ends on
// D minor alone.
const P1 = {
  Dm9: [38, [53, 57, 60, 64]], G13: [43, [53, 59, 64, 69]], Bb9: [46, [50, 53, 57, 60]], A7: [45, [55, 61, 64, 70]],
  C69: [48, [52, 57, 60, 62]], F9: [41, [52, 57, 60, 64]], Am9: [45, [55, 60, 64, 67]], Dm: [38, [50, 53, 57, 62]], Bb: [46, [50, 53, 58, 62]], C: [48, [52, 55, 60, 64]],
};
const TONE1 = [[0, 77], [2, 79], [4, 81], [8, 81], [10, 82], [11, 81], [12, 79], [14, 81]];
SONGS.ps1 = band({
  title: "Two Ways", genre: "Progressive house", meters: "4/4 · 7/8", bpm: 124, swing: 0.06, duck: 0.45,
  kit: KITS.house, selahChord: [62, 65, 69, 72],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  sec: {
    intro: {
      bars: 4,
      drums(B) {
        const base = B.i < 2 ? { kick: "0...1...0...1...", hat: "..2...2...2...2." } : { kick: "0...1...0...1...", clap: "....0.......0...", hat: "..2...2...2...2.", ohat: dots(16) };
        return groove(B, base);
      },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P1.Dm9, P1.G13, P1.Dm9, P1.Bb9][B.i];
        if (s === 0) { I.keys(t, chord, sd * 14, 0.7, { rev: 0.4, dly: 0.12 }); I.bass(t, root - 12, sd * 15, 0.55, { kind: "sub" }); }
        if (s === 0 && B.i >= 1) I.pad(t, up(chord, 62), sd * 16, 0.35, { cut: 900 + B.i * 400, att: 0.3, rev: 0.5, voices: 3 });
        if (B.i === 1) for (const [st, m] of TONE1.slice(0, 4)) if (st === s) I.bell(t, m, 1.4, 0.3, { ratio: 2, index: 1.3, dly: 0.3 });
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // The just: deep house.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0..21...", clap: "....0.......0...", snare: ".......g.......g", hat: "3.2.3.2.3.2.3.2.", ohat: dots(16) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = B.fill ? P1.A7 : [P1.Dm9, P1.G13, P1.Dm9, P1.Bb9][B.i % 4];
        if (s % 2 === 1) I.shaker(t, 0.5);
        const BASS = [[0, 0, 3], [3, 12, 1], [6, 7, 2], [8, 0, 2], [11, 10, 1], [14, 12, 1]];
        for (const [st, iv, len] of BASS) if (st === s) I.bass(t, root + iv, len * sd * 0.9, st === 0 ? 0.95 : 0.75, { kind: "pluck", cut: 1800, q: 8, floor: 160 });
        if (s === 2 || s === 7 || s === 10 || s === 14) I.keys(t, chord, sd * 1.5, 0.75, { dly: 0.15 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 62), sd * 16, 0.32, { cut: 1700, att: 0.2, rev: 0.45, voices: 3 });
        if (L >= 1 && B.lineBar === 1) for (const [st, m] of TONE1) if (st === s) I.bell(t, m, 0.9, 0.3, { ratio: 2, index: 1.3, dly: 0.25 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", snare: "....1...2.2.1.33", hat: "2.2.2.2.2.2.2.2." };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.8);
        if (s === 0) I.pad(t, up(P1.A7[1], 62), sd * 16, 0.4 + B.i * 0.15, { cut: 1200 + B.i * 1800, sweep: 3800, att: 0.05, voices: 3 });
        if (B.i === 1 && s === 14) I.vox(t, 74, sd * 2, 0.8, { vowel: "a" });
      },
    },
    // The first drop: breakbeat house.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.....1.0.2.....", snare: "....0..3....0..3", hat: "2323232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P1.Dm, P1.Bb, P1.C, P1.Am9][B.i % 4];
        if (B.i === 0 && s === 0) I.impact(t, 0.7);
        if (s % 2 === 0) I.bass(t, root - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.85, { kind: "pluck", cut: 2200, q: 6 });
        const STAB = "..x..x..x...x.x.";
        if (on(STAB, s)) I.pad(t, up(chord, 60), sd * 1.2, 0.8, { cut: 4200, att: 0.005, rel: 0.12, width: 1.2 });
        const CHOP = [[0, 74, "a"], [3, 72, "o"], [6, 69, "a"], [10, 72, "e"], [12, 74, "a"]];
        if (L >= 1 && B.i % 2 === 1) for (const [st, m, vw] of CHOP) if (st === s) I.vox(t, m, sd * 1.4, 0.75, { vowel: vw });
        if (B.fill && s === 12) I.zap(t, 0.6, { from: 2600, to: 120 });
      },
    },
    // The wicked: progressive funk in seven, grouped 2 + 2 + 3.
    B: {
      perLine: 2, len: 14,
      drums(B) { return groove(B, { kick: "0.....1.0.1...", snare: "....0..g....0.", hat: "23232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P1.Dm9, P1.C69, P1.Bb9, P1.A7][B.i % 4];
        // the slap bass on the groupings
        const SL = [[0, 0, 2], [4, 12, 1], [6, 7, 1], [8, 0, 2], [10, 10, 1], [12, 12, 1]];
        for (const [st, iv, len] of SL) if (st === s) I.bass(t, root + iv, len * sd * 0.9, 0.9, { kind: "pluck", cut: 2600, q: 11, floor: 170 });
        // the clavinet stumbling against it
        const CL = "x.x..x.x.x..x.";
        if (on(CL, s)) I.pluck(t, up(chord, 60)[(s >> 1) % 4], sd * 0.8, 0.45, { cut: 4800, q: 9, floor: 900, fd: 0.06, dly: 0, rev: 0.1, pan: -0.3 });
        if (L >= 2 && B.lineBar === 1) { const FL = [[0, 81], [4, 79], [8, 77], [10, 79], [12, 76]]; for (const [st, m] of FL) if (st === s) I.flute(t, m, sd * 3, 0.5, { pan: 0.3 }); }
        if (L >= 1 && s === 0) I.pad(t, up(chord, 60), sd * 14, 0.25, { cut: 1300, att: 0.1, voices: 3 });
      },
    },
    break: {
      bars: 2,
      drums(B) { return { kick: "0" + dots(15) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P1.F9, P1.C69][B.i];
        if (s === 0) { I.keys(t, up(chord, 60), sd * 15, 0.8, { bark: 3.2, rev: 0.5, dly: 0.2 }); I.bass(t, root - 12, sd * 16, 0.6, { kind: "sub" }); I.choir(t, up(chord, 64), sd * 15, 0.45, { vowel: "a", att: 0.6 }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.5);
      },
    },
    // The tree by the running waters: tech house, the ride, organ and strings.
    C: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1.2.", clap: "....0.......0...", snare: "...g.......g....", ride: "2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P1.F9, P1.C69, P1.Dm9, P1.Bb9][B.i % 4];
        if (s % 4 !== 0) I.bass(t, root + (s % 4 === 3 ? 12 : 0), sd * 0.85, 0.75, { kind: "pluck", cut: 1500, q: 5, floor: 220, sus: 0.4 });
        if (s === 2 || s === 10) I.organ(t, up(chord, 55), sd * 4, 0.55, { rev: 0.25, bars: ORGAN });
        if (L >= 1 && B.lineBar === 1) for (const [st, m] of TONE1) if (st === s) I.string(t, m - 12, sd * 2, 0.6);
        if (L >= 2 && s === 0) I.choir(t, up(chord, 64), sd * 16, 0.4, { vowel: "o", att: 0.3 });
        if (s % 4 === 1) I.perc(t, 72 + (s % 8 === 1 ? 0 : 5), 0.35, { pan: 0.4 });
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) { I.riser(t, sd * 16, 0.9); I.subdrop(t + sd * 12, 0.6); } },
    },
    // The last drop: everything, and the supersaw sings the tone; its last two bars limp in seven.
    drop2: {
      bars: 8, len: (i) => (i >= 6 ? 14 : 16),
      drums(B) { return B.len === 14 ? groove(B, { kick: "0.....1.0.1...", snare: "....0..3....0.", hat: "23232323232323" }) : groove(B, { kick: "0...1.1.0.2.1...", snare: "....0..3....0..3", hat: "2323232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P1.Dm, P1.Bb, P1.C, P1.Am9, P1.Dm, P1.Bb, P1.A7, P1.A7][B.i];
        if (B.i === 0 && s === 0) I.impact(t, 0.8);
        if (s % 2 === 0) I.bass(t, root - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.85, { kind: "pluck", cut: 2400, q: 6 });
        if (s === 0) I.pad(t, up(chord, 60), sd * B.len, 0.55, { cut: 3600, att: 0.01, rel: 0.2, width: 1.2 });
        for (const [st, m] of TONE1) if (st === s && st < B.len) I.lead(t, m, sd * 2, 0.55, { waves: ["sawtooth", "sawtooth"], cut: 4200, vib: 10, rev: 0.35, dly: 0.25 });
        if (L >= 2 && s === 0) I.choir(t, up(chord, 64), sd * B.len, 0.4, { vowel: "a" });
      },
    },
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: "0" + dots(15), crash: "0" + dots(15) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P1.Dm9;
        if (s === 0 && B.i === 0) { I.keys(t, chord, sd * 30, 0.9, { rev: 0.5, dly: 0.2 }); I.bass(t, root - 12, sd * 28, 0.7, { kind: "sub" }); I.pad(t, up(chord, 62), sd * 30, 0.45, { cut: 1600, rel: 2.5, rev: 0.6, voices: 3 }); }
      },
    },
  },
});

// ---- Psalm 3, Domine, quid multiplicati: "Shield" -------------------------------------------------
// Dub into dubstep, C minor, 140. So many rise up against me: a dub-techno lament in half time, the
// chord echoing away, tape hiss, a melodica far off. The drops are dubstep: a wobble bass whose LFO
// moves from eighths to sixteenths to triplets, growls, lasers, chopped voices. The second verses are
// in 6/8, a choir and a kalimba over a heartbeat. (The basses are clean, with no distortion.) "Arise, O Lord": the harmony lifts toward E-flat, a
// brass section answers, and the riddim grows heavy. Three Selahs, as in the Hebrew. The song ends on C
// major: salvation is of the Lord.
const P3 = {
  Cm11: [36, [51, 55, 58, 65]], Ab9: [32, [48, 51, 55, 58]], G7s: [31, [53, 55, 60, 62]], G7: [31, [53, 56, 59, 62]],
  Eb: [39, [50, 55, 58, 62]], Fm9: [41, [56, 60, 63, 67]], C: [36, [52, 55, 60, 64]], Bb: [34, [50, 53, 58, 62]],
};
// The wobble's rates at 140: eighths, sixteenths, eighth-triplets, quarter-triplets.
const W8 = 140 / 60 * 2, W16 = 140 / 60 * 4, W8T = 140 / 60 * 3, W4T = 140 / 60 * 1.5;
SONGS.ps3 = band({
  title: "Shield", genre: "Dub into dubstep", meters: "4/4 · 6/8", bpm: 140, duck: 0.4, delay: (60 / 140) * 0.75,
  kit: KITS.dub, selahChord: [60, 63, 67, 70],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  chord(B, i) {
    const lifted = this.plan && this.plan.cue("arise", B.b);
    const c = lifted ? ["Ab9", "Eb", "Fm9", "G7"] : ["Cm11", "Cm11", "Ab9", "G7s"];
    return P3[c[i % 4]];
  },
  sec: {
    intro: {
      bars: 4,
      drums(B) { return groove(B, B.i < 2 ? { kick: "0" + dots(15), rim: "........1......." } : { kick: "0.........1.....", rim: "........1.......", hat: "..2...2...2...2." }); },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P3.Cm11, P3.Cm11, P3.Ab9, P3.G7s][B.i];
        if (s === 0) { I.hiss(t, sd * 16, 1); I.bass(t, root - 12, sd * 15, 0.7, { kind: "sub", drive: 0.15 }); }
        if (s === 2 || s === 10) I.stab(t, chord, 0.6, { cut: 1300, floor: 380, dly: 0.55, rev: 0.4, decay: 0.16, hold: 0.02 });
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // The lament: dub techno in half time.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0.........1.....", snare: "........0....g.g", hat: "..2.3.2...2.3.2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = this.chord(B, B.i);
        if (s === 0) I.hiss(t, sd * 16, 1);
        if (s === 0 || s === 8) I.bass(t, root - 12, sd * 7.5, 0.75, { kind: "sub", drive: 0.15 });
        if (s === 2 || s === 6 || s === 10) I.stab(t, chord, s === 2 ? 0.75 : 0.5, { cut: L >= 2 ? 1900 : 1300, floor: 380, dly: 0.55, rev: 0.4, decay: 0.16, hold: 0.02 });
        if (L >= 1 && B.lineBar === 1) { const MEL = [[0, 67], [3, 70], [6, 72], [8, 70], [12, 67]]; for (const [st, m] of MEL) if (st === s) I.lead(t, m, sd * (st === 12 ? 4 : 2.5), 0.38, { waves: ["square", "sawtooth"], cut: 1500, q: 2, vib: 9, att: 0.03, rev: 0.45, dly: 0.5 }); }
        if (L >= 2 && s === 0) I.pad(t, up(chord, 55), sd * 16, 0.32, { cut: 950, att: 0.3, rev: 0.55, voices: 3 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0.1.0.1.0.1.0.1.", snare: "........1.2.1.23", hat: "2.2.2.2.2.2.2.2." };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 12, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.9);
        if (B.i === 1 && s % 2 === 0 && s >= 8) I.vox(t, 72, sd * 0.8, 0.55 + s * 0.02, { vowel: "a", dly: 0 });
        if (B.i === 1 && s === 12) I.subdrop(t, 0.7);
      },
    },
    // The first drop: dubstep. The wobble moves in eighths, sixteenths, triplets.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.....1...2.....", snare: "........0......3", hat: "2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root] = [P3.Cm11, P3.Cm11, P3.Ab9, P3.G7s, P3.Cm11, P3.Bb, P3.Ab9, P3.G7][B.i];
        if (B.i === 0 && s === 0) { I.impact(t, 0.9); I.zap(t, 0.5); }
        const rates = [[[0, W8], [sd * 8, W16]], [[0, W8T], [sd * 8, W8]], [[0, W16], [sd * 12, W4T]], [[0, W8], [sd * 4, W8T], [sd * 12, W16]]][B.i % 4];
        if (s === 0) I.wobble(t, root - 12, sd * 7, 1.05, { rates: rates.slice(0, 1), depth: 820 });
        if (s === 8) I.wobble(t, root - 12 + (B.i % 2 ? 3 : 0), sd * 7.5, 1.05, { rates: rates.slice(1).map(([dt, r]) => [Math.max(0, dt - sd * 8), r]), depth: 900 });
        if (s === 7 && B.i % 2) I.growl(t, root, sd * 1, 0.6, { from: 400, to: 1800 });
        if (L >= 1) { const CH = [[0, 75, "o"], [6, 72, "a"], [10, 70, "o"]]; if (B.i % 4 === 1) for (const [st, m, v] of CH) if (st === s) I.vox(t, m, sd * 1.2, 0.7, { vowel: v }); }
        if (B.fill && s === 12) I.zap(t, 0.6, { from: 3200, to: 100, dur: 0.22 });
      },
    },
    // The second verses: a lament in 6/8.
    B: {
      perLine: 2, len: 12,
      drums(B) { return groove(B, { kick: "0.......1...", snare: "......0....g", hat: "232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = this.chord(B, B.i + 2);
        if (s === 0) { I.hiss(t, sd * 12, 1); I.bass(t, root - 12, sd * 11, 0.75, { kind: "sub" }); I.choir(t, up(chord, 60), sd * 12, 0.45, { vowel: "o", att: 0.3 }); }
        const K = up(chord, 72); if (s % 2 === 0) I.mallet(t, K[(s >> 1) % K.length], 0.4, { partial: 5.4, knock: 0.12, decay: 0.6, dly: 0.25, pan: 0.3 });
        if (L >= 2 && s === 6) I.stab(t, chord, 0.5, { cut: 1400, floor: 400, dly: 0.55, rev: 0.4, decay: 0.16 });
      },
    },
    break: {
      bars: 2,
      drums(B) { return { kick: "0" + dots(15) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P3.Fm9, P3.G7s][B.i];
        if (s === 0) { I.hiss(t, sd * 16, 1.2); I.pad(t, up(chord, 55), sd * 16, 0.45, { cut: 800, att: 0.4, rev: 0.6, voices: 3 }); I.bass(t, root - 12, sd * 16, 0.6, { kind: "sub" }); }
        if (s === 4 || s === 12) I.stab(t, chord, 0.4, { cut: 1100, floor: 380, dly: 0.6, rev: 0.5, decay: 0.2 });
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.55);
      },
    },
    // The riddim: heavy, and after "arise", lifted, with brass answering.
    C: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0.....1...1.....", snare: "........0..g...3", hat: "2323232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = this.chord(B, B.i);
        if (s === 0 || s === 6 || s === 10) I.growl(t, root - 12 + (s === 10 ? 12 : 0), sd * (s === 0 ? 5 : 3), 0.7, { from: 300, to: s === 10 ? 2200 : 1300 });
        if (this.plan.cue("arise", B.b) && B.lineBar === 1 && (s === 0 || s === 3 || s === 6)) I.brass(t, up(chord, 62).slice(1), sd * (s === 6 ? 4 : 1.5), 0.7, { cut: 3200 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 60), sd * 16, 0.3, { cut: 1500, voices: 3 });
        if (s === 0) I.hiss(t, sd * 16, 0.8);
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "0...f...f...f...", roll: ["snare", 4, 16, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) I.riser(t, sd * 16, 0.95); if (s === 12) I.subdrop(t, 0.8); },
    },
    // The last drop: wobble in triplets, a lead, and in its last two bars the drums double their time.
    drop2: {
      bars: 8,
      drums(B) {
        return B.i >= 6 ? groove(B, { kick: "0.1.......0.1...", snare: "....0..3....0..3", hat: "2323232323232323" })
          : groove(B, { kick: "0.....1...2...1.", snare: "........0..3...3", hat: "2.3.2.3.2.3.2.3." });
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P3.Ab9, P3.Eb, P3.Fm9, P3.G7, P3.Ab9, P3.Eb, P3.Fm9, P3.G7][B.i];
        if (B.i === 0 && s === 0) { I.impact(t, 1); I.zap(t, 0.6); }
        if (s === 0) I.wobble(t, root - 12, sd * 15.5, 1, { rates: B.i % 2 ? [[0, W8T], [sd * 8, W16]] : [[0, W8T], [sd * 12, W4T]], depth: 900 });
        if (s === 0 && B.i % 2 === 0) I.pad(t, up(chord, 60), sd * 16, 0.4, { cut: 2600, voices: 3 });
        const LEAD = [[0, 79], [3, 75], [6, 77], [10, 74], [12, 75]];
        if (L >= 1) for (const [st, m] of LEAD) if (st === s) I.lead(t, m, sd * 2.5, 0.5, { waves: ["sawtooth", "square"], cut: 3600, vib: 12, rev: 0.4, dly: 0.35 });
        if (B.fill && s === 12) I.zap(t, 0.6, { from: 3000, to: 90, dur: 0.25 });
      },
    },
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: "0" + dots(15), crash: "0" + dots(15) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P3.C;
        if (s === 0 && B.i === 0) {
          I.stab(t, chord, 0.8, { cut: 2200, floor: 600, dly: 0.6, rev: 0.6, decay: 0.5 }); I.bass(t, root - 12, sd * 30, 0.7, { kind: "sub" });
          I.pad(t, up(chord, 60), sd * 30, 0.5, { cut: 1400, rel: 2.5, rev: 0.7, voices: 3 }); I.choir(t, up(chord, 60), sd * 28, 0.5, { vowel: "a", att: 0.4, rel: 2 });
        }
      },
    },
  },
});

// ---- Psalm 150, Laudate Dominum in sanctis: "Every Spirit" ----------------------------------------
// Gospel house into breakbeat, A-flat, 128. Hands clapping, an octave bass, a house piano; then a
// jungle break with its ghost strokes, and horns. The verses about the timbrel and the choir are in
// 5/4, an Afro-house groove of congas and marimba. Every instrument the psalm names joins the band in
// the bar after it is named: the trumpet (horns), psaltery and harp, timbrel, choir, strings, organs,
// cymbals (the ride). "Let every spirit praise the Lord": everything at once.
const P150 = {
  Db9: [37, [53, 56, 60, 63]], Eb9s: [39, [56, 58, 61, 65]], Cm9: [36, [51, 55, 58, 62]], Fm9: [41, [56, 60, 63, 67]], Ab: [44, [56, 60, 63, 70]],
  Bbm7: [46, [53, 56, 61, 65]], Eb7: [39, [55, 58, 61, 65]],
};
SONGS.ps150 = band({
  title: "Every Spirit", genre: "Gospel house into breakbeat", meters: "4/4 · 5/4", bpm: 128, swing: 0.05, duck: 0.5,
  kit: KITS.break, selahChord: [60, 63, 68, 72],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  // Is this instrument in the band yet? (Everything is, from "every spirit", and in the last drop.)
  has(k, b) { return b === Infinity || (this.plan && (this.plan.cue(k, b) || this.plan.cue("all", b))); },
  layers(e, B, chord, answer) {
    const { t, s, sd, I } = e, b = B.b;
    if (this.has("brass", b) && answer) { const H = [[0, 1.5], [3, 1], [6, 3], [10, 1], [12, 3]]; for (const [st, len] of H) if (st === s && st < B.len) I.brass(t, up(chord, 65).slice(1), len * sd, 0.7, { cut: 3600 }); }
    if (this.has("harp", b) && s % 2 === 0) { const AR = [0, 1, 2, 3, 4, 3, 2, 1], T = up(chord, 68); I.pluck(t, T[AR[(s >> 1) % 8] % T.length] + (s >= 8 ? 12 : 0), sd * 2.4, 0.3, { wave: "triangle", cut: 3600, q: 2, dly: 0.12, rev: 0.3, pan: 0.4 }); }
    if (this.has("timbrel", b)) I.tamb(t, s % 4 === 2 ? 0.9 : s % 2 ? 0.35 : 0.55);
    if (this.has("choir", b) && s === 0) I.choir(t, up(chord, 60), sd * (B.len - 1), 0.55, { vowel: answer ? "a" : "o", att: 0.12 });
    if (this.has("strings", b) && s === 0) I.pad(t, up(chord, 67), sd * B.len, 0.4, { cut: 2600, att: 0.25, rev: 0.45, voices: 3 });
    if (this.has("organ", b) && (s === 2 || s === 10)) I.organ(t, up(chord, 55), sd * 5, 0.5, { rev: 0.25, bars: ORGAN });
  },
  sec: {
    intro: {
      bars: 4,
      drums(B) { return groove(B, B.i < 2 ? { kick: "0...1...0...1...", clap: "....0.......0..." } : { kick: "0...1...0...1...", clap: "....0.......0...", ohat: "..2...2...2...2." }); },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i];
        if (s === 2 || s === 10) I.organ(t, up(chord, 55), sd * 5, 0.5, { rev: 0.3, bars: ORGAN });
        if (s === 0) I.bass(t, root - 12, sd * 14, 0.6, { kind: "sub" });
        if (s % 2 === 1) I.tamb(t, 0.3);
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // Gospel house.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", snare: "......g.......g.", ohat: "..2...2...2...2.", hat: "3...3...3...3..." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i % 4];
        if (s % 2 === 0) I.bass(t, root + (s % 4 === 2 ? 12 : 0), sd * 1.7, 0.85, { kind: "pluck", cut: 2100, q: 7 });
        const PNO = B.lineBar ? "..x..x....x..x.." : "..x.......x.....";
        if (on(PNO, s)) I.keys(t, up(chord, 60), sd * 1.5, 0.72, { bark: 3.2, rev: 0.2 });
        this.layers(e, B, chord, B.lineBar === 1);
        if (L >= 2 && s === 0 && !this.has("strings", B.b)) I.pad(t, up(chord, 64), sd * 16, 0.28, { cut: 2000, voices: 3 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", snare: "1...1...1.2.1.23", ohat: "..2...2...2...2." };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.85);
        if (s === 0) I.brass(t, up(P150.Eb7[1], 62), sd * 15, 0.4 + 0.2 * B.i, { cut: 1600 + B.i * 1600 });
      },
    },
    // The jungle break: an Amen-like groove, ghost strokes and all, with horns.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.1.......21....", snare: "....0..3.2..0..3", ride: "2.2.2.2.2.2.2.2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i % 4];
        if (B.i === 0 && s === 0) I.impact(t, 0.8);
        if (s === 0 || s === 10) I.bass(t, root - 12, sd * (s ? 5 : 9), 0.85, { kind: "reese", cut: 520, drive: 0.05 });
        const HORN = [[0, 1.5], [3, 1], [6, 3], [12, 2]];
        for (const [st, len] of HORN) if (st === s) I.brass(t, up(chord, 65).slice(1), len * sd, 0.75, { cut: 4000 });
        if (L >= 1 && (s === 2 || s === 10)) I.organ(t, up(chord, 55), sd * 3, 0.45, { bars: ORGAN });
        if (L >= 2) { const CH = [[0, 75, "a"], [4, 77, "o"], [8, 80, "a"]]; if (B.i % 2) for (const [st, m, v] of CH) if (st === s) I.vox(t, m, sd * 2, 0.6, { vowel: v }); }
      },
    },
    // Timbrel and choir: Afro house in 5/4, congas and marimba.
    B: {
      perLine: 2, len: 20,
      drums(B) { return groove(B, { kick: "0...........0.......", snare: "........0.......0...", tom1: "..1.......3.........", tom2: "......2.........3...", hat: "2.3.2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i % 4];
        if (s === 0 || s === 12) I.bass(t, root - 12 + (s ? 7 : 0), sd * 7, 0.8, { kind: "pluck", cut: 1600, q: 6 });
        const CG = "x.x.xx..x.x.x.xx.x.x";
        if (on(CG, s)) I.perc(t, s % 3 === 0 ? 62 : 67, 0.45, { pan: s % 2 ? 0.4 : -0.2 });
        const M = up(chord, 72); if (s % 2 === 0) I.mallet(t, M[[0, 2, 1, 3, 2][(s >> 1) % 5] % M.length], 0.42, { pan: -0.3, dly: 0.1 });
        this.layers(e, B, chord, B.lineBar === 1);
        if (L >= 2 && B.lineBar === 1 && s === 0) I.flute(t, up(chord, 76)[2], sd * 8, 0.45, { pan: 0.3 });
      },
    },
    break: {
      bars: 2,
      drums(B) { return { kick: "0" + dots(15) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Bbm7, P150.Eb7][B.i];
        if (s === 0) { I.organ(t, up(chord, 55), sd * 15, 0.6, { rev: 0.4, bars: ORGAN }); I.choir(t, up(chord, 60), sd * 15, 0.55, { vowel: "a", att: 0.4 }); I.bass(t, root - 12, sd * 16, 0.6, { kind: "sub" }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // Gospel house again, with the ride for the cymbals, and the whole band as named.
    C: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1.2.", clap: "....0.......0...", snare: "...g.......g...3", ride: "2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i % 4];
        if (s % 2 === 0) I.bass(t, root + (s % 4 === 2 ? 12 : 0), sd * 1.7, 0.85, { kind: "pluck", cut: 2100, q: 7 });
        if (on("..x..x....x..x..", s)) I.keys(t, up(chord, 60), sd * 1.5, 0.7, { bark: 3.2 });
        this.layers(e, B, chord, B.lineBar === 1);
        if (this.plan.cue("all", B.b)) { const LICK = [[0, 80], [2, 82], [4, 84], [7, 80], [10, 77], [12, 80]]; for (const [st, m] of LICK) if (st === s) I.lead(t, m, sd * 2, 0.5, { waves: ["sawtooth", "square"], cut: 3800, vib: 12, rev: 0.35, dly: 0.25 }); }
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) { I.riser(t, sd * 16, 0.9); I.choir(t, [68, 72, 75], sd * 15, 0.5, { vowel: "a", att: 1 }); } },
    },
    // Every spirit: the break again, with everything, and tom runs.
    drop2: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.1.......21....", snare: "....0..3.2..0..3", ride: "2323232323232323", tom1: B.i % 2 ? "........3......." : dots(16) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = [P150.Db9, P150.Eb9s, P150.Cm9, P150.Fm9][B.i % 4];
        if (B.i === 0 && s === 0) I.impact(t, 0.9);
        if (s % 2 === 0) I.bass(t, root - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.85, { kind: "pluck", cut: 2300, q: 6 });
        if (s === 0) { I.pad(t, up(chord, 67), sd * 16, 0.38, { cut: 2600, att: 0.2, voices: 3 }); if (B.i % 2 === 0) I.choir(t, up(chord, 60), sd * 31, 0.5, { vowel: "a", att: 0.1 }); }
        if (s % 2 === 1) I.tamb(t, s % 4 === 3 ? 0.7 : 0.35);
        if (B.i % 2 === 1 && (s === 0 || s === 3 || s === 6)) I.brass(t, up(chord, 65).slice(1), sd * (s === 6 ? 3 : 1.2), 0.65, { cut: 3800 });
        const LICK = [[0, 80], [2, 82], [4, 84], [7, 80], [10, 77], [12, 80]];
        for (const [st, m] of LICK) if (st === s) I.lead(t, m + (B.i % 4 === 3 ? 2 : 0), sd * 2, 0.55, { waves: ["sawtooth", "square"], cut: 4000, vib: 12, rev: 0.35, dly: 0.25 });
      },
    },
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: "0" + dots(15), crash: "0" + dots(15) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P150.Ab;
        if (s === 0 && B.i === 0) {
          I.impact(t, 0.6); I.bass(t, root - 12, sd * 30, 0.8, { kind: "sub" }); I.keys(t, up(chord, 60), sd * 30, 0.9, { rev: 0.5 });
          I.choir(t, up(chord, 60), sd * 28, 0.8, { vowel: "a", att: 0.05, rel: 1.6 }); I.organ(t, up(chord, 56), sd * 28, 0.6, { rel: 1.2 });
          I.brass(t, up(chord, 62).slice(1), sd * 10, 0.6, { cut: 3000 });
        }
      },
    },
  },
});

// ---- Psalm 2, Quare fremuerunt gentes: "Rod of Iron" -----------------------------------------------
// Drum and bass, E Phrygian, 172. Why have the Gentiles raged: a two-step riddim, a low tom on the third
// beat like a war drum, a reese bass pacing under it as the kings take counsel, metal struck in the
// dark. "He that dwelleth in heaven shall laugh at them": heaven is in 9/8, three times three, the
// time the old musicians called perfect, with organ, brass and bells, and voices laughing. The decree,
// "Thou art my son, this day have I begotten thee" (the Introit of the Mass at Midnight), is said
// twice, and the harmony turns to E major and stays there. The rod of iron: crashes on the beat, the
// potter's vessel shattering, "in pieces, in pieces, in pieces"; the last drop at full speed. Then "And
// now, O ye kings, understand": liquid drum and bass in E major, and the beatitude said three times,
// quieter each time, as the band falls away: blessed are all they that trust in him.
const P2 = {
  Em: [40, [52, 55, 59, 62]], F: [41, [53, 57, 60, 64]], B7: [35, [51, 54, 57, 59]], C: [36, [52, 55, 59, 64]],
  Am: [45, [52, 57, 60, 64]], G: [43, [50, 55, 59, 62]],
  E: [40, [52, 56, 59, 63]], Csm: [37, [52, 56, 61, 64]], A: [45, [52, 57, 61, 64]], B: [35, [51, 54, 59, 63]],
};
const RAGE = ["Em", "Em", "F", "B7"], REIGN = ["E", "Csm", "A", "B"];
// The fills of heaven's 9/8.
const FILL18 = [
  { kick: at(18, { 0: "0" }), snare: at(18, { 6: "0", 15: "3" }), tom1: at(18, { 12: "1", 13: "3" }), tom2: at(18, { 14: "2" }), tom3: at(18, { 16: "1", 17: "3" }) },
  { kick: at(18, { 0: "0", 12: "1" }), snare: at(18, { 6: "0", 10: "2", 14: "1", 16: "2", 17: "3" }) },
];
// The reese's walk: [step, interval, sixteenths].
const REESE = [[0, 0, 4], [4, 12, 1], [6, 0, 2], [8, 12, 1], [10, 1, 3], [13, 0, 1], [14, 12, 2]];
SONGS.ps2 = band({
  title: "Rod of Iron", genre: "Drum and bass", meters: "4/4 · 9/8", bpm: 172, duck: 0.45,
  kit: KITS.dnb, selahChord: [52, 55, 59, 64],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["D", 4], ["outro"]],
  lectio: [
    { v: 7, echo: "Thou art my son, this day have I begotten thee", times: 2 },
    { v: 9, stutter: "in pieces", times: 3 },
    { v: 13, echo: "blessed are all they that trust in him", times: 3 },
  ],
  sec: {
    intro: {
      bars: 8,
      drums(B) {
        if (B.i < 4) return { kick: at(16, { 0: "0" }), tom3: at(16, { 8: "0" }) };
        return groove(B, { kick: "0.........1.....", snare: "....0.......0...", tom3: at(16, { 8: "0" }), hat: eighths(16, "2") });
      },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P2[["Em", "Em", "F", "Em"][B.i % 4]];
        if (s === 0 && B.i % 2 === 0) { I.bass(t, root - 12, sd * 31, 0.6, { kind: "sub" }); I.pad(t, up(chord, 52), sd * 32, 0.3, { cut: 500 + B.i * 160, att: 1.2, rev: 0.6, voices: 3 }); }
        if (s === 6 || s === 14) I.bell(t, s === 6 ? 76 : 77, 0.6, 0.22, { ratio: 2.76, index: 5, rev: 0.5, dly: 0.35, pan: s === 6 ? -0.4 : 0.4 });
        if (B.i >= 4 && s === 0) I.bass(t, root - 12, sd * 6, 0.8, { kind: "reese", cut: 340 });
        if (B.i === 7 && s === 0) I.riser(t, sd * 16, 0.7);
      },
    },
    // The nations rage: a dark two-step, the war drum on three.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0.........1.....", snare: "....0..g....0..g", tom3: at(16, { 8: "0" }), hat: "2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P2[RAGE[B.i % 4]];
        for (const [st, iv, len] of [[0, 0, 5], [6, 0, 2], [10, 1, 3], [14, 0, 2]]) if (st === s) I.bass(t, root - 12 + iv, len * sd, 0.7, { kind: "reese", cut: 360 + 60 * (B.i % 4) });
        if (s === 7 || s === 15) I.bell(t, 88, 0.25, 0.14, { ratio: 2.76, index: 6, rev: 0.35, dly: 0.45, pan: s === 7 ? -0.5 : 0.5 });
        if (L >= 1 && (s === 2 || s === 11)) I.stab(t, up(chord, 55), 0.5, { cut: 2200, floor: 520, decay: 0.12, dly: 0.3 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 59), sd * 16, 0.24, { cut: 1300, voices: 3 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", snare: "....1...1.2.1.23", tom3: at(16, { 8: "x" }), hat: eighths(16, "2") };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.85);
        if (s === 0) { I.pad(t, up(P2.B7[1], 59), sd * 16, 0.35 + 0.15 * B.i, { cut: 1000 + 2000 * B.i, sweep: 4200, att: 0.05, voices: 3 }); I.bass(t, 35, sd * 15, 0.6, { kind: "reese", cut: 300 + B.i * 400 }); }
        if (B.i === 1 && s === 12) I.subdrop(t, 0.7);
      },
    },
    // The first drop: drum and bass at full speed.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.........0.1...", snare: "....0..3....0..3", hat: "2323232323232323" }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P2[RAGE[B.i % 4]];
        if (B.i === 0 && s === 0) { I.impact(t, 0.9); I.zap(t, 0.5); }
        for (const [st, iv, len] of REESE) if (st === s) I.bass(t, root - 12 + iv, len * sd, 0.72, { kind: "reese", cut: 480 + 90 * (B.i % 4) });
        if (on("..x...x...x..x..", s)) I.stab(t, up(chord, 60), 0.55, { cut: 3200, floor: 800, decay: 0.09 });
        if (L >= 1 && B.i % 2 === 1 && s === 0) I.lead(t, 83, sd * 7, 0.4, { glide: 88, glideT: 0.2, waves: ["square", "sawtooth"], cut: 3000, vib: 14, rev: 0.4, dly: 0.35 });
        if (L >= 2 && B.i % 2 === 0) for (const [st, m, v] of [[0, 76, "a"], [3, 74, "o"], [8, 71, "a"]]) if (st === s) I.vox(t, m, sd * 1.2, 0.6, { vowel: v });
        if (B.fill && s === 12) I.zap(t, 0.6, { from: 3000, to: 90, dur: 0.2 });
      },
    },
    // Heaven, in 9/8 (three times three): organ, bells, brass, and the laughter of heaven.
    B: {
      perLine: 2, len: 18,
      drums(B) { return groove(B, { kick: at(18, { 0: "0", 10: "1" }), snare: at(18, { 6: "0", 12: "0", 17: "g" }), hat: eighths(18, "2") }, FILL18); },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", [root, chord] = P2[["C", "G", "Am", "B7"][B.i % 4]];
        if (s === 0 || s === 6 || s === 12) I.bass(t, root - 12 + (s === 12 ? 7 : 0), sd * 5, 0.8, { kind: "pluck", cut: 1400, q: 5 });
        if (s === 0) I.organ(t, up(chord, 55), sd * 17, 0.45, { rev: 0.45, bars: ORGAN });
        if (s % 6 === 3) I.bell(t, up(chord, 76)[(s / 6 | 0) % 4], 1.2, 0.25, { ratio: 2, index: 1.4, rev: 0.5, dly: 0.3 });
        if (/\blaugh\b/.test(T) && B.lineBar === 1) for (const [st, m] of [[0, 79], [2, 77], [4, 76], [6, 74], [8, 72], [10, 71]]) if (st === s) I.vox(t, m, sd * 0.9, 0.6, { vowel: "a", dly: 0.2 });
        if (/\b(anger|rage)\b/.test(T) && (s === 0 || s === 12)) I.stab(t, up(chord, 52), 0.7, { cut: 1800, floor: 300, decay: 0.25 });
        if (L >= 1 && B.lineBar === 1 && (s === 0 || s === 6 || s === 12)) I.brass(t, up(chord, 62).slice(1), sd * (s === 12 ? 5 : 2), 0.6, { cut: 3200 });
        if (L >= 2 && s === 0) I.choir(t, up(chord, 60), sd * 18, 0.4, { vowel: "a", att: 0.3 });
      },
    },
    break: {
      bars: 2,
      drums() { return { kick: at(16, { 0: "0" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P2.Am, P2.B7][B.i];
        if (s === 0) { I.organ(t, up(chord, 55), sd * 15, 0.55, { rev: 0.5, bars: ORGAN }); I.choir(t, up(chord, 60), sd * 15, 0.5, { vowel: "o", att: 0.5 }); I.bass(t, root - 12, sd * 16, 0.6, { kind: "sub" }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.55);
      },
    },
    // The decree, said twice, and E major from then on; then the rod of iron and the potter's vessel.
    C: {
      perLine: 2,
      drums(B) {
        if (/\bpieces\b/.test(B.text || "")) return groove(B, { kick: "0...0...0...0...", snare: "....0.......0...", crash: "0.......0.......", hat: "..2...2...2...2." });
        return groove(B, { kick: "0.........1.....", snare: "....0..g....0..g", tom3: at(16, { 8: "0" }), hat: "2.3.2.3.2.3.2.3." });
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, reign = this.plan && this.plan.cue("begotten", B.b), pieces = /\bpieces\b/.test(B.text || "");
        const [root, chord] = P2[(reign ? REIGN : RAGE)[B.i % 4]];
        for (const [st, iv, len] of [[0, 0, 5], [6, 0, 2], [10, reign ? 2 : 1, 3], [14, 0, 2]]) if (st === s) I.bass(t, root - 12 + iv, len * sd, 0.7, { kind: "reese", cut: 420 + 60 * (B.i % 4) });
        if (B.echo && s === 0) I.choir(t, up(chord, 60), sd * 16, 0.6, { vowel: "a", att: 0.15 });
        if (reign && B.lineBar === 1 && (s === 0 || s === 3 || s === 6)) I.brass(t, up(chord, 62).slice(1), sd * (s === 6 ? 4 : 1.5), 0.65, { cut: 3400 });
        if (pieces) {
          if (s === 0 || s === 8) I.stab(t, up(chord, 52), 0.85, { cut: 4200, floor: 300, decay: 0.3 });
          if (s === 8 && B.lineBar === 1) { I.fall(t, sd * 8, 0.6); [96, 99, 101].forEach((m, k) => I.bell(t + sd * 0.75 * k, m, 0.35, 0.16, { ratio: 3.7, index: 6, rev: 0.4 })); }
        } else if (L >= 1 && (s === 2 || s === 11)) I.stab(t, up(chord, 55), 0.5, { cut: 2400, floor: 600, decay: 0.12, dly: 0.3 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 59), sd * 16, 0.26, { cut: reign ? 2400 : 1300, voices: 3 });
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) { I.riser(t, sd * 16, 0.95); I.subdrop(t + sd * 12, 0.7); } },
    },
    // The rod of iron: the last drop, with the ride, a lead, and the choir.
    drop2: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0.........0.1...", snare: "....0..3....0..3", ride: eighths(16, "2"), hat: eighths(16, ".", "3") }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P2[["Em", "F", "Em", "B7", "Em", "F", "C", "B7"][B.i]];
        if (B.i === 0 && s === 0) { I.impact(t, 1); I.zap(t, 0.6); }
        for (const [st, iv, len] of REESE) if (st === s) I.bass(t, root - 12 + iv, len * sd, 0.72, { kind: "reese", cut: 560 + 80 * (B.i % 4) });
        if (s === 0) I.pad(t, up(chord, 60), sd * 16, 0.4, { cut: 3000, voices: 3 });
        if (L >= 1) for (const [st, m] of [[0, 76], [3, 77], [6, 76], [8, 74], [10, 71], [12, 72], [14, 71]]) if (st === s) I.lead(t, m, sd * 2, 0.5, { waves: ["sawtooth", "square"], cut: 3800, vib: 10, rev: 0.35, dly: 0.25 });
        if (L >= 2 && s === 0 && B.i % 2) I.choir(t, up(chord, 64), sd * 16, 0.4, { vowel: "a" });
        if (B.fill && s === 12) I.zap(t, 0.6, { from: 3200, to: 90, dur: 0.22 });
      },
    },
    // "And now, O ye kings, understand": liquid drum and bass in E major. The beatitude, said three
    // times, the band falling away under it.
    D: {
      perLine: 2,
      drums(B) {
        const blessed = /\bblessed\b/.test(B.text || "");
        if (blessed && B.echo === 2) return { kick: at(16, { 0: "0" }), rim: at(16, { 4: "0", 12: "0" }) };
        if (blessed && B.echo === 1) return { kick: at(16, { 0: "0", 10: "1" }), rim: at(16, { 4: "0", 12: "0" }), ride: eighths(16, "2") };
        return groove(B, { kick: "0.........1.....", snare: "....0.......0...", rim: at(16, { 7: "g", 15: "g" }), ride: "2.3.2.3.2.3.2.3." });
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P2[REIGN[B.i % 4]], hush = 1 - 0.3 * (B.echo || 0);
        if (s === 0) { I.bass(t, root - 12, sd * 14, 0.7 * hush, { kind: "sub" }); I.pad(t, up(chord, 60), sd * 16, 0.3 * hush, { cut: 2200, att: 0.3, rev: 0.5, voices: 3 }); }
        if (B.echo !== 2 && on("x..x..x...x..x..", s)) I.keys(t, up(chord, 60), sd * 2, 0.6 * hush, { rev: 0.35, dly: 0.2 });
        if (L >= 1 && B.lineBar === 1 && s === 0) I.string(t, up(chord, 76)[B.i % 4], sd * 14, 0.5 * hush);
        if (B.echo && s === 0) I.choir(t, up(chord, 64), sd * 15, 0.45, { vowel: "o", att: 0.4 });
      },
    },
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: at(16, { 0: "0" }), crash: at(16, { 0: "0" }) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P2.E;
        if (s === 0 && B.i === 0) {
          I.keys(t, up(chord, 60), sd * 30, 0.8, { rev: 0.5, dly: 0.2 }); I.bass(t, root - 12, sd * 28, 0.6, { kind: "sub" });
          I.pad(t, up(chord, 64), sd * 30, 0.4, { cut: 1800, rel: 2.5, rev: 0.6, voices: 3 }); I.choir(t, up(chord, 60), sd * 28, 0.45, { vowel: "a", att: 0.4, rel: 2 });
          I.bell(t, 88, 3, 0.3, { ratio: 2, index: 1.2, rev: 0.6 });
        }
      },
    },
  },
});

// ---- Psalm 4, Cum invocarem: "In Peace" ------------------------------------------------------------
// Deep house for late at night, F major, 112, swung: the first psalm of Compline. A soft kick, a rim,
// vinyl hiss, an electric piano on the off-beats, a night bird of a flute. Two Selahs, as in the
// Hebrew. "Be angry, and sin not ... be sorry for them upon your beds": a lullaby in 6/8, a celesta and
// a choir humming. "The light of thy countenance, O Lord, is signed upon us" (the verse Compline
// keeps) is said twice, and bells glitter over it. Then "I will sleep, and I will rest", said three
// times, and each time the band falls further asleep, until there is only a music box and a breath of
// a kick; "For thou, O Lord, singularly hast settled me in hope" wakes it gently. The song does not
// drop again: it ends asleep, a rim ticking under the music box.
const P4 = {
  F: [41, [57, 60, 64, 67]], Dm: [38, [53, 57, 60, 64]], Gm: [43, [53, 57, 58, 62]], C: [36, [53, 55, 58, 62]],
  Bb: [46, [53, 57, 60, 62]], Am: [45, [55, 60, 64, 67]],
};
const EVE = ["F", "Dm", "Gm", "C"];
SONGS.ps4 = band({
  title: "In Peace", genre: "Late-night deep house", meters: "4/4 · 6/8", bpm: 112, swing: 0.12, duck: 0.35,
  kit: KITS.lofi, selahChord: [53, 57, 60, 64],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["outro"]],
  lectio: [
    { v: 7, echo: "The light of thy countenance, O Lord, is signed upon us", times: 2 },
    { v: 9, echo: "I will sleep, and I will rest", times: 3 },
  ],
  sec: {
    intro: {
      bars: 4,
      drums(B) { return B.i < 2 ? { kick: at(16, { 0: "0", 8: "1" }), rim: at(16, { 12: "0" }) } : groove(B, { kick: "0...1...0...1...", rim: at(16, { 4: "0", 12: "0" }), hat: "..2...2...2...2." }); },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P4[EVE[B.i % 4]];
        if (s === 0) { I.hiss(t, sd * 16, 1.4); I.keys(t, chord, sd * 12, 0.65, { rev: 0.45, dly: 0.2, bark: 1.6 }); I.bass(t, root - 12, sd * 14, 0.5, { kind: "sub" }); }
        if (B.i >= 2 && s === 10) I.keys(t, up(chord, 64).slice(0, 2), sd * 2, 0.4, { rev: 0.4 });
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.4);
      },
    },
    // "When I called upon him": deep house, the electric piano on the off-beats.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", rim: at(16, { 7: "g", 10: "3", 15: "g" }), hat: "..2...2...2...2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P4[EVE[B.i % 4]];
        if (s === 0) I.hiss(t, sd * 16, 1);
        if (s % 2 === 1) I.shaker(t, 0.4);
        for (const [st, iv, len] of [[0, 0, 3], [3, 7, 1], [6, 12, 1], [8, 0, 2], [11, 10, 1], [14, 7, 2]]) if (st === s) I.bass(t, root - 12 + iv, len * sd * 0.9, st === 0 ? 0.85 : 0.65, { kind: "pluck", cut: 900, q: 3, floor: 140, sus: 0.5 });
        if (on("..x....x..x.....", s)) I.keys(t, chord, sd * 2.5, 0.55, { bark: 1.6, rev: 0.35, dly: 0.15 });
        if (L >= 1 && B.lineBar === 1) for (const [st, m] of [[2, 76], [4, 74], [6, 72], [10, 69]]) if (st === s) I.flute(t, m + (B.i % 4 === 2 ? 2 : 0), sd * 3, 0.38, { pan: 0.35, rev: 0.5, dly: 0.3 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 60), sd * 16, 0.24, { cut: 1100, att: 0.4, voices: 3 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", clap: "....1.......1...", hat: eighths(16, "2") };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.6);
        if (s === 0) I.pad(t, up(P4.C[1], 60), sd * 16, 0.3 + 0.1 * B.i, { cut: 900 + 1200 * B.i, sweep: 2600, voices: 3 });
      },
    },
    // A warm drop, not a loud one: a voice singing "ah" over the piano.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", snare: at(16, { 7: "3", 14: "2" }), hat: "2323232323232323", ohat: "..2...2...2...2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P4[["F", "Dm", "Bb", "C"][B.i % 4]];
        if (B.i === 0 && s === 0) I.impact(t, 0.5);
        if (s === 0) I.bass(t, root - 12, sd * 1.8, 0.7, { kind: "sub" });
        if (s % 4 === 2) I.bass(t, root - 12 + (s === 10 ? 12 : 0), sd * 1.5, 0.85, { kind: "pluck", cut: 1200, q: 4, floor: 160 });
        if (on("x..x..x...x..x..", s)) I.keys(t, up(chord, 60), sd * 1.4, 0.6, { bark: 2.4, rev: 0.25 });
        if (L >= 1 && B.i % 2) for (const [st, m, v] of [[0, 72, "a"], [3, 69, "o"], [6, 72, "a"], [10, 74, "a"], [12, 72, "o"]]) if (st === s) I.vox(t, m, sd * 1.6, 0.55, { vowel: v });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 64), sd * 16, 0.3, { cut: 2400, voices: 3 });
      },
    },
    // "Upon your beds": a lullaby in 6/8, a celesta and a hummed choir.
    B: {
      perLine: 2, len: 12,
      drums(B) { return groove(B, { kick: at(12, { 0: "0", 9: "2" }), snare: at(12, { 6: "0" }), rim: at(12, { 3: "1", 11: "g" }), hat: at(12, { 0: "2", 2: "3", 4: "2", 6: "2", 8: "3", 10: "2" }) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P4[["Bb", "F", "Gm", "C"][B.i % 4]];
        if (s === 0) { I.hiss(t, sd * 12, 1); I.bass(t, root - 12, sd * 11, 0.6, { kind: "sub" }); I.choir(t, up(chord, 57), sd * 12, 0.32, { vowel: "u", att: 0.5 }); }
        const M = up(chord, 72); if (s % 2 === 0) I.mallet(t, M[[0, 1, 2, 3, 2, 1][s / 2] % M.length], 0.38, { partial: 6.2, knock: 0.1, decay: 0.9, dly: 0.25, pan: 0.25 });
        if (L >= 1 && (s === 0 || s === 6)) I.keys(t, chord, sd * 5, 0.45, { bark: 1.4, rev: 0.4 });
        if (L >= 2 && B.lineBar === 1 && s === 0) I.flute(t, up(chord, 72)[3], sd * 10, 0.3, { pan: -0.3, rev: 0.5 });
      },
    },
    break: {
      bars: 2,
      drums() { return { kick: at(16, { 0: "0", 8: "x" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P4.Gm, P4.C][B.i];
        if (s === 0) { I.hiss(t, sd * 16, 1.2); I.keys(t, chord, sd * 15, 0.6, { rev: 0.55, dly: 0.25, bark: 1.4 }); I.bass(t, root - 12, sd * 16, 0.55, { kind: "sub" }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.35);
      },
    },
    // The light of thy countenance; and sleep.
    C: {
      perLine: 2,
      drums(B) {
        const sleep = /\bsleep\b/.test(B.text || "") ? B.echo || 0 : 0;
        if (sleep >= 2) return { kick: at(16, { 0: "0" }), rim: at(16, { 8: "0" }) };
        if (sleep) return { kick: at(16, { 0: "0", 8: "1" }), rim: at(16, { 4: "0", 12: "0" }) };
        return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", rim: at(16, { 7: "g", 10: "3", 15: "g" }), hat: "..2...2...2...2.", ride: at(16, { 0: "3", 4: "3", 8: "3", 12: "3" }) });
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", [root, chord] = P4[EVE[B.i % 4]];
        const sleep = /\bsleep\b/.test(T) ? B.echo || 0 : 0, light = /\blight\b/.test(T);
        if (s === 0) I.hiss(t, sd * 16, 1);
        if (sleep < 2 && s === 0) I.bass(t, root - 12, sd * (sleep ? 15 : 7), 0.6, { kind: "sub" });
        if (!sleep) {
          for (const [st, iv, len] of [[3, 7, 1], [6, 12, 1], [8, 0, 2], [11, 10, 1], [14, 7, 2]]) if (st === s) I.bass(t, root - 12 + iv, len * sd * 0.9, 0.65, { kind: "pluck", cut: 900, q: 3, floor: 140, sus: 0.5 });
          if (s % 2 === 1) I.shaker(t, 0.4);
        }
        if (sleep < 2 && on(sleep ? "x.......x......." : "..x....x..x.....", s)) I.keys(t, chord, sd * (sleep ? 6 : 2.5), 0.5, { bark: 1.4, rev: 0.45, dly: 0.2 });
        // falling asleep: a pad, and a music box
        if (sleep && s === 0) I.pad(t, up(chord, 60), sd * 16, 0.3 / sleep, { cut: 900, att: 0.6, rev: 0.6, voices: 3 });
        if (sleep && s % 4 === 0) I.bell(t, up(chord, 79)[(s / 4) % 4], 1.6, 0.2 / sleep, { ratio: 3, index: 0.8, rev: 0.6, dly: 0.35 });
        if (light && s % 2 === 0) I.bell(t, up(chord, 84)[(s / 2) % 4], 0.6, 0.14, { ratio: 2, index: 1, rev: 0.5, dly: 0.3, pan: s % 4 ? 0.4 : -0.4 });
        if (!sleep && L >= 1 && B.lineBar === 1) for (const [st, m] of [[2, 76], [4, 74], [6, 72], [10, 69]]) if (st === s) I.flute(t, m, sd * 3, 0.36, { pan: 0.35, rev: 0.5, dly: 0.3 });
        if (!sleep && L >= 2 && s === 0) I.pad(t, up(chord, 60), sd * 16, 0.24, { cut: 1300, att: 0.3, voices: 3 });
      },
    },
    // Asleep: a rim ticking, and the music box running down.
    outro: {
      bars: 4,
      drums(B) { return { kick: at(16, { 0: "0" }), rim: at(16, B.i < 3 ? { 4: "0", 12: "0" } : { 4: "0" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P4.F;
        if (s === 0) { I.hiss(t, sd * 16, 1.2 - B.i * 0.25); I.pad(t, up(chord, 60), sd * 16, 0.3 - B.i * 0.05, { cut: 800, att: 0.5, rev: 0.6, voices: 3 }); }
        if (s === 0 && B.i === 0) I.bass(t, root - 12, sd * 60, 0.5, { kind: "sub" });
        if (s % 4 === 0) I.bell(t, up(chord, 79)[(s / 4 + B.i) % 4], 1.8, 0.18 - B.i * 0.03, { ratio: 3, index: 0.8, rev: 0.6, dly: 0.35 });
      },
    },
  },
});

// ---- Psalm 90, Qui habitat: "Under His Wings" -------------------------------------------------------
// Afro house, A minor into C major, 123: the second psalm of Compline. Congas for toms, shakers for
// hats, an agogo bell, a kalimba turning over and over. "He will overshadow thee with his shoulders: and
// under his wings thou shalt trust" (Compline's versicle, Scapulis suis) is said three times, and a
// choir and strings spread over it like wings. The terrors of the night are in 12/8, the West African
// bell pattern under them: a laser for the arrow that flieth by day, a growl for the noonday devil, the
// congas tumbling where a thousand fall. From "he hath given his angels charge over thee" a choir sings
// over everything, and the harmony turns to C major. "And thou shalt trample under foot the lion and
// the dragon" falls on crashes and nothing else, a phrase to each, and is said twice.
const P90 = {
  Am: [45, [57, 60, 64, 67]], Dm: [38, [53, 57, 60, 62]], E7: [40, [56, 59, 62, 64]], F: [41, [53, 57, 60, 64]],
  G: [43, [55, 59, 62, 65]], C: [36, [55, 60, 64, 67]], Em: [40, [55, 59, 62, 64]],
};
const NIGHT = ["Am", "Am", "Dm", "E7"], WINGS = ["F", "G", "Am", "Am"], DAWN = ["C", "G", "Am", "F"];
const KAL = [0, 2, 1, 3, 2, 0, 3, 1];
// The fill of the 12/8: the congas tumbling.
const FILL24 = [{ kick: at(24, { 0: "0", 12: "0" }), clap: at(24, { 6: "0" }), tom1: at(24, { 12: "1", 14: "3", 16: "2" }), tom2: at(24, { 18: "1", 19: "3", 20: "2" }), tom3: at(24, { 21: "3", 22: "1", 23: "3" }) }];
SONGS.ps90 = band({
  title: "Under His Wings", genre: "Afro house", meters: "4/4 · 12/8", bpm: 123, swing: 0.04, duck: 0.4,
  kit: KITS.afro, selahChord: [57, 60, 64, 67],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  lectio: [
    { v: 4, echo: "and under his wings thou shalt trust", times: 3 },
    { v: 13, echo: "and thou shalt trample under foot the lion and the dragon", times: 2 },
  ],
  sec: {
    intro: {
      bars: 4,
      drums(B) {
        if (B.i < 2) return { kick: at(16, { 0: "0", 8: "0" }), tom2: at(16, { 6: "1", 14: "0" }), hat: eighths(16, "2") };
        return groove(B, { kick: "0...0...0...0...", clap: at(16, { 4: "1", 12: "1" }), tom2: at(16, { 6: "1", 14: "0" }), tom1: at(16, { 3: "2", 11: "2" }), hat: "2.3.2.3.2.3.2.3." });
      },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P90[NIGHT[B.i % 4]];
        if (s === 0) { I.pad(t, up(chord, 57), sd * 16, 0.28, { cut: 700 + 200 * B.i, att: 0.6, rev: 0.6, voices: 3 }); I.bass(t, root - 12, sd * 14, 0.5, { kind: "sub" }); }
        if (s % 2 === 0) I.mallet(t, up(chord, 72)[KAL[s / 2] % 4], 0.35, { partial: 5.4, knock: 0.12, decay: 0.7, dly: 0.25, pan: 0.3 });
        if (B.i === 1 && s === 4) I.flute(t, 81, sd * 6, 0.35, { glide: 76, rev: 0.6, dly: 0.4, pan: -0.3 });
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.5);
      },
    },
    // He that dwelleth in the aid of the most High: Afro house; the wings spread on "wings".
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", tom2: at(16, { 8: "0", 14: "2" }), tom1: at(16, { 3: "2", 10: "3", 11: "2" }), tom3: at(16, { 6: "1" }), hat: "2.3.2.3.2.3.2.3." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", wings = /\bwings\b/.test(T);
        const [root, chord] = P90[(wings ? WINGS : NIGHT)[B.i % 4]];
        for (const [st, iv, len] of [[0, 0, 2], [3, 0, 1], [6, 7, 1], [8, 12, 1], [10, 0, 2], [14, 10, 1]]) if (st === s) I.bass(t, root - 12 + iv, len * sd * 0.9, 0.85, { kind: "pluck", cut: 1300, q: 6, floor: 150 });
        if (s % 2 === 0) I.mallet(t, up(chord, 72)[KAL[s / 2] % 4], 0.32, { partial: 5.4, knock: 0.12, decay: 0.6, dly: 0.2, pan: 0.3 });
        if (L >= 1 && (s === 2 || s === 10)) I.stab(t, up(chord, 60), 0.4, { cut: 1600, floor: 600, decay: 0.15, dly: 0.25, rev: 0.3 });
        if (wings && s === 0) { I.pad(t, up(chord, 62), sd * 16, 0.4, { cut: 2600, att: 0.5, rev: 0.6 }); I.choir(t, up(chord, 64), sd * 16, 0.4, { vowel: "a", att: 0.5 }); }
        else if (L >= 2 && s === 0) I.pad(t, up(chord, 60), sd * 16, 0.24, { cut: 1300, voices: 3 });
        if (/\bnight\b/.test(T) && s === 8 && B.lineBar === 1) I.growl(t, root - 12, sd * 6, 0.5, { from: 200, to: 700 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", clap: "....1...1...1.2.", tom2: at(16, { 6: "2", 14: "2" }), hat: eighths(16, "2") };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.75);
        if (s === 0) I.pad(t, up(P90.E7[1], 60), sd * 16, 0.32 + 0.12 * B.i, { cut: 1000 + 1600 * B.i, sweep: 3600, voices: 3 });
        if (B.i === 1 && s === 12) I.subdrop(t, 0.6);
      },
    },
    // The first drop: Afro-tech, a rolling bass, an arpeggio, voices calling.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", tom2: at(16, { 6: "2", 14: "2" }), tom1: at(16, { 3: "2", 9: "3", 11: "2" }), hat: "2323232323232323", ride: at(16, { 2: "3", 6: "3", 10: "3", 14: "3" }) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P90[["Am", "Am", "F", "G"][B.i % 4]];
        if (B.i === 0 && s === 0) I.impact(t, 0.7);
        if (s % 2 === 1 || s === 0) I.bass(t, root - 12 + (s % 4 === 3 ? 12 : 0), sd * 0.9, 0.85, { kind: "pluck", cut: 1600, q: 8, floor: 200 });
        if (s % 2 === 0) I.pluck(t, up(chord, 69)[(s / 2) % 4], sd * 1.2, 0.35, { wave: "square", cut: 2600, q: 6, floor: 700, dly: 0.3, pan: s % 4 ? 0.3 : -0.3 });
        if (L >= 1 && B.i % 2) for (const [st, m, v] of [[0, 76, "o"], [4, 74, "o"], [8, 72, "a"], [12, 69, "o"]]) if (st === s) I.vox(t, m, sd * 2.5, 0.55, { vowel: v });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 64), sd * 16, 0.3, { cut: 2200, voices: 3 });
      },
    },
    // The terrors of the night, in 12/8 over the bell.
    B: {
      perLine: 2, len: 24,
      drums(B) {
        const base = {
          kick: at(24, { 0: "0", 12: "0", 18: "2" }), clap: at(24, { 6: "0", 18: "0" }),
          ride: at(24, { 0: "2", 4: "2", 8: "2", 10: "2", 14: "2", 18: "2", 22: "2" }),
          tom2: at(24, { 3: "1", 9: "3", 15: "1", 21: "3" }), tom3: at(24, { 11: "2", 23: "2" }),
          hat: at(24, { 2: "3", 6: "3", 10: "3", 14: "3", 18: "3", 22: "3" }),
        };
        // where a thousand fall, the congas tumble through every bar
        return groove(/\bthousand\b/.test(B.text || "") ? Object.assign({}, B, { fill: true }) : B, base, FILL24);
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", [root, chord] = P90[NIGHT[B.i % 4]];
        if (s % 6 === 0) I.bass(t, root - 12 + (s === 18 ? 7 : 0), sd * 5, 0.85, { kind: "pluck", cut: 1100, q: 5, floor: 140 });
        if (s === 0) I.pad(t, up(chord, 57), sd * 24, 0.26, { cut: 900, att: 0.4, rev: 0.55, voices: 3 });
        if (s % 4 === 2) I.mallet(t, up(chord, 69)[(s / 4 | 0) % 4], 0.3, { partial: 3.93, knock: 0.2, decay: 0.4, pan: -0.3 });
        if (/\barrow\b/.test(T) && (s === 5 || s === 17)) I.zap(t, 0.5, { from: 4200, to: 600, dur: 0.18, pan: 0.5 });
        if (/\bdevil\b/.test(T) && s % 12 === 0) I.growl(t, root - 12, sd * 10, 0.6, { from: 220, to: 900 });
        if (/\bdark\b/.test(T) && s === 12) I.fall(t, sd * 12, 0.4);
        if (L >= 1 && B.lineBar === 1 && s % 6 === 0) I.flute(t, up(chord, 76)[(s / 6) % 4], sd * 5, 0.32, { pan: 0.3, rev: 0.45, dly: 0.25 });
        if (L >= 2 && s === 12) I.choir(t, up(chord, 60), sd * 12, 0.3, { vowel: "o", att: 0.3 });
      },
    },
    break: {
      bars: 2,
      drums() { return { kick: at(16, { 0: "0", 8: "x" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P90.F, P90.G][B.i];
        if (s === 0) { I.organ(t, up(chord, 55), sd * 15, 0.5, { rev: 0.5, bars: ORGAN }); I.choir(t, up(chord, 60), sd * 15, 0.5, { vowel: "a", att: 0.5 }); I.bass(t, root - 12, sd * 16, 0.55, { kind: "sub" }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.55);
      },
    },
    // The angels, and the dawn: C major; the lion and the dragon on four crashes.
    C: {
      perLine: 2,
      drums(B) {
        if (/\b(lion|dragon)\b/.test(B.text || "")) return { kick: "0...0...0...0...", crash: "0...0...0...0..." };
        return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", tom2: at(16, { 8: "0", 14: "2" }), tom1: at(16, { 3: "2", 11: "2" }), hat: "2.3.2.3.2.3.2.3.", ride: at(16, { 2: "3", 6: "3", 10: "3", 14: "3" }) });
      },
      play(e, B, L) {
        const { t, s, sd, I } = e, angels = this.plan && this.plan.cue("angels", B.b), lion = /\b(lion|dragon)\b/.test(B.text || "");
        const [root, chord] = P90[DAWN[B.i % 4]];
        for (const [st, iv, len] of [[0, 0, 2], [3, 0, 1], [6, 7, 1], [8, 12, 1], [10, 0, 2], [14, 10, 1]]) if (st === s) I.bass(t, root - 12 + iv, len * sd * 0.9, 0.85, { kind: "pluck", cut: 1500, q: 6, floor: 160 });
        if (s % 2 === 0) I.mallet(t, up(chord, 72)[KAL[s / 2] % 4], 0.32, { partial: 5.4, knock: 0.12, decay: 0.6, dly: 0.2, pan: 0.3 });
        if (angels && s === 0) I.choir(t, up(chord, 64), sd * 16, 0.42, { vowel: "a", att: 0.25 });
        if (lion && s % 4 === 0) { I.stab(t, up(chord, 52), 0.8, { cut: 3600, floor: 300, decay: 0.35 }); I.brass(t, up(chord, 60).slice(1), sd * 4, 0.6, { cut: 3000 }); }
        if (L >= 1 && B.lineBar === 1 && !lion) for (const [st, len] of [[0, 1.5], [3, 1], [6, 3]]) if (st === s) I.brass(t, up(chord, 64).slice(1), len * sd, 0.5, { cut: 3200 });
        if (L >= 2 && s === 0 && !angels) I.pad(t, up(chord, 60), sd * 16, 0.26, { cut: 2000, voices: 3 });
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) { I.riser(t, sd * 16, 0.9); I.choir(t, [64, 67, 72], sd * 15, 0.45, { vowel: "a", att: 1 }); } },
    },
    // The last drop, in C major, brass and choir.
    drop2: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", tom2: at(16, { 6: "2", 14: "2" }), tom1: at(16, { 3: "2", 9: "3", 11: "2" }), hat: "2323232323232323", ride: at(16, { 2: "3", 6: "3", 10: "3", 14: "3" }) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P90[DAWN[B.i % 4]];
        if (B.i === 0 && s === 0) I.impact(t, 0.8);
        if (s % 2 === 1 || s === 0) I.bass(t, root - 12 + (s % 4 === 3 ? 12 : 0), sd * 0.9, 0.85, { kind: "pluck", cut: 1800, q: 8, floor: 220 });
        if (s % 2 === 0) I.pluck(t, up(chord, 69)[(s / 2) % 4], sd * 1.2, 0.32, { wave: "square", cut: 3000, q: 6, floor: 800, dly: 0.3, pan: s % 4 ? 0.3 : -0.3 });
        if (s === 0) I.choir(t, up(chord, 64), sd * 16, 0.4, { vowel: "a", att: 0.15 });
        if (L >= 1 && B.i % 2 && (s === 0 || s === 3 || s === 6)) I.brass(t, up(chord, 64).slice(1), sd * (s === 6 ? 3 : 1.2), 0.6, { cut: 3600 });
        if (L >= 2 && s === 0) I.pad(t, up(chord, 67), sd * 16, 0.3, { cut: 2600, voices: 3 });
      },
    },
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: at(16, { 0: "0" }), crash: at(16, { 0: "0" }) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P90.C;
        if (s === 0 && B.i === 0) {
          I.bass(t, root - 12, sd * 30, 0.6, { kind: "sub" }); I.choir(t, up(chord, 60), sd * 28, 0.6, { vowel: "a", att: 0.1, rel: 2 });
          I.pad(t, up(chord, 64), sd * 30, 0.4, { cut: 2000, rel: 2.5, rev: 0.6, voices: 3 }); I.mallet(t, 84, 0.4, { partial: 5.4, decay: 2, rev: 0.6 });
        }
      },
    },
  },
});

// ---- Psalm 116, Laudate Dominum: "All Ye Nations" --------------------------------------------------
// Gospel disco, B-flat, 120: the shortest psalm, sung whole three times, and each time the band is
// bigger and the nations dance in their own way. First a disco band: four on the floor, octave bass,
// strings. Then the nations: a Balkan brass band in 7/8 (2 + 2 + 3), with a clarinet and an
// accordion. Then everyone at once, gospel choir and horns. "For ever" is said three times, every
// time round. The roll into the last drop is the one the Schola teaches.
const P116 = {
  Bb: [46, [53, 57, 62, 65]], Gm: [43, [53, 58, 62, 65]], Eb: [39, [55, 58, 62, 65]], F: [41, [53, 57, 60, 63]],
  Cm: [36, [55, 58, 63, 67]], Dm: [38, [53, 57, 60, 65]],
};
const PRAISE = ["Bb", "Gm", "Eb", "F"];
const REED = [[1, 1], [2, 0.6], [3, 0.5], [5, 0.3]];
const FILL14B = [{ kick: at(14, { 0: "0", 8: "1" }), snare: at(14, { 4: "0", 8: "0", 10: "2", 12: "1", 13: "3" }) }];
SONGS.ps116 = band({
  title: "All Ye Nations", genre: "Gospel disco", meters: "4/4 · 7/8", bpm: 120, swing: 0.04, duck: 0.45,
  kit: KITS.house, selahChord: [53, 57, 62, 65], whole: true,
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  lectio: [{ v: 2, stutter: "for ever", times: 3 }],
  // The disco band: octave bass, string stabs, the piano.
  disco(e, B, L, chord, root) {
    const { t, s, sd, I } = e;
    if (s % 2 === 0) I.bass(t, root - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.85, { kind: "pluck", cut: 2000, q: 6 });
    if (on("..x....x..x.....", s)) I.pad(t, up(chord, 64), sd * 1.1, 0.55, { cut: 4200, att: 0.005, rel: 0.12, width: 1.2 });
    if (on("x..x..x...x..x..", s)) I.keys(t, up(chord, 60), sd * 1.2, 0.5, { bark: 3, rev: 0.2 });
    if (s % 2 === 1) I.tamb(t, s % 4 === 3 ? 0.55 : 0.25);
  },
  sec: {
    intro: {
      bars: 4,
      drums(B) { return groove(B, B.i < 2 ? { kick: "0...0...0...0...", clap: at(16, { 4: "0", 12: "0" }) } : { kick: "0...0...0...0...", clap: "....0.......0...", ohat: "..2...2...2...2." }); },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P116[PRAISE[B.i % 4]];
        if (s === 0) { I.pad(t, up(chord, 64), sd * 16, 0.35, { cut: 1200 + 600 * B.i, att: 0.3, voices: 3 }); I.bass(t, root - 12, sd * 14, 0.55, { kind: "sub" }); }
        if (B.i >= 2 && s % 2 === 0) I.bass(t, root - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.7, { kind: "pluck", cut: 1600, q: 6 });
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // The first time round: a disco band.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", ohat: "..2...2...2...2.", hat: at(16, { 1: "3", 5: "3", 9: "3", 13: "3" }), tom1: at(16, { 14: "2" }), tom2: at(16, { 15: "3" }) }); },
      play(e, B, L) {
        const [root, chord] = P116[PRAISE[B.i % 4]];
        this.disco(e, B, L, chord, root);
        const { t, s, sd, I } = e;
        if (L >= 1 && B.lineBar === 1 && (s === 0 || s === 3 || s === 6)) I.brass(t, up(chord, 65).slice(1), sd * (s === 6 ? 3 : 1.2), 0.55, { cut: 3600 });
        if (L >= 2 && s === 0) I.choir(t, up(chord, 64), sd * 16, 0.32, { vowel: "o", att: 0.2 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", clap: "....1...1...1.2.", ohat: eighths(16, "2") };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.8);
        if (s === 0) I.brass(t, up(P116.F[1], 62), sd * 15, 0.4 + 0.2 * B.i, { cut: 1600 + B.i * 1600 });
      },
    },
    // The disco drop, horns and strings.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", snare: at(16, { 7: "3", 15: "2" }), ohat: "..2...2...2...2.", hat: eighths(16, ".", "3"), tom1: at(16, { 11: "2" }) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P116[PRAISE[B.i % 4]];
        if (B.i === 0 && s === 0) I.impact(t, 0.7);
        this.disco(e, B, L, chord, root);
        for (const [st, len] of [[0, 1.5], [3, 1], [6, 3], [12, 2]]) if (st === s) I.brass(t, up(chord, 65).slice(1), len * sd, 0.7, { cut: 4000 });
        if (L >= 1 && B.i % 2) for (const [st, m] of [[0, 77], [2, 79], [4, 81], [7, 77], [10, 74], [12, 77]]) if (st === s) I.string(t, m, sd * 2, 0.5);
        if (L >= 2 && s === 0) I.choir(t, up(chord, 64), sd * 16, 0.4, { vowel: "a" });
      },
    },
    // The second time round: the nations, a Balkan brass band in 7/8.
    B: {
      perLine: 2, len: 14,
      drums(B) { return groove(B, { kick: at(14, { 0: "0", 8: "1" }), snare: at(14, { 4: "0", 8: "0", 11: "2" }), hat: eighths(14, "2"), tom3: at(14, { 12: "3" }) }, FILL14B); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P116[["Gm", "Cm", "F", "Bb"][B.i % 4]];
        if (s === 0 || s === 4 || s === 8) I.bass(t, root - 12 + (s === 8 ? 7 : 0), sd * 3, 0.85, { kind: "pluck", cut: 1600, q: 5 });
        // the brass band on the off-beats, and the accordion
        if (s === 2 || s === 6 || s === 11) I.brass(t, up(chord, 60).slice(1), sd * 1.2, 0.5, { cut: 2800 });
        if (s === 0) I.organ(t, up(chord, 60), sd * 13, 0.32, { bars: REED, leslie: 5, wobble: 9 });
        // the clarinet, on the second bar of each line
        if (L >= 1 && B.lineBar === 1) for (const [st, m] of [[0, 79], [2, 77], [4, 75], [6, 74], [8, 72], [11, 74]]) if (st === s) I.lead(t, m, sd * 2, 0.42, { waves: ["square", "triangle"], cut: 2600, vib: 16, rev: 0.3, dly: 0.15 });
        if (s % 2 === 1) I.tamb(t, 0.3);
        if (L >= 2 && s === 0) I.choir(t, up(chord, 64), sd * 14, 0.3, { vowel: "a" });
      },
    },
    break: {
      bars: 2,
      drums() { return { kick: at(16, { 0: "0" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P116.Eb, P116.F][B.i];
        if (s === 0) { I.organ(t, up(chord, 55), sd * 15, 0.6, { rev: 0.4, bars: ORGAN }); I.choir(t, up(chord, 60), sd * 15, 0.55, { vowel: "a", att: 0.4 }); I.bass(t, root - 12, sd * 16, 0.6, { kind: "sub" }); }
        if (B.i === 1 && s === 8) I.riser(t, sd * 8, 0.6);
      },
    },
    // The third time round: everyone, gospel choir and horns.
    C: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", snare: at(16, { 3: "g", 11: "g", 15: "3" }), ohat: "..2...2...2...2.", ride: at(16, { 0: "3", 4: "3", 8: "3", 12: "3" }) }); },
      play(e, B, L) {
        const [root, chord] = P116[PRAISE[B.i % 4]];
        this.disco(e, B, L, chord, root);
        const { t, s, sd, I } = e;
        if (s === 0) I.choir(t, up(chord, 60), sd * 15, 0.5, { vowel: B.lineBar ? "a" : "o", att: 0.12 });
        if (s === 2 || s === 10) I.organ(t, up(chord, 55), sd * 5, 0.45, { rev: 0.25, bars: ORGAN });
        if (B.lineBar === 1) for (const [st, len] of [[0, 1.5], [3, 1], [6, 3], [12, 2]]) if (st === s) I.brass(t, up(chord, 65).slice(1), len * sd, 0.65, { cut: 3800 });
      },
    },
    build2: {
      bars: 1,
      drums() { return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] }; },
      play(e) { const { t, s, sd, I } = e; if (s === 0) { I.riser(t, sd * 16, 0.9); I.choir(t, [65, 69, 74], sd * 15, 0.5, { vowel: "a", att: 1 }); } },
    },
    // The last drop, everything.
    drop2: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", snare: at(16, { 7: "3", 15: "2" }), ohat: "..2...2...2...2.", hat: eighths(16, ".", "3"), tom1: at(16, { 11: "2" }), tom2: at(16, { 13: "3" }) }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P116[PRAISE[B.i % 4]];
        if (B.i === 0 && s === 0) I.impact(t, 0.8);
        this.disco(e, B, L, chord, root);
        if (s === 0) I.choir(t, up(chord, 60), sd * 16, 0.5, { vowel: "a", att: 0.1 });
        for (const [st, len] of [[0, 1.5], [3, 1], [6, 3], [12, 2]]) if (st === s) I.brass(t, up(chord, 65).slice(1), len * sd, 0.7, { cut: 4000 });
        if (L >= 1) for (const [st, m] of [[0, 77], [2, 79], [4, 81], [7, 77], [10, 74], [12, 77]]) if (st === s) I.lead(t, m + (B.i % 4 === 3 ? 2 : 0), sd * 2, 0.5, { waves: ["sawtooth", "square"], cut: 4000, vib: 12, rev: 0.35, dly: 0.25 });
      },
    },
    // Amen: the plagal close, E-flat to B-flat.
    outro: {
      bars: 2,
      drums(B) { return B.i === 0 ? { kick: at(16, { 0: "0" }), crash: at(16, { 0: "0" }) } : {}; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P116.Eb, P116.Bb][B.i];
        if (s === 0) {
          I.choir(t, up(chord, 60), sd * (B.i ? 24 : 15), 0.7, { vowel: B.i ? "e" : "a", att: 0.1, rel: 1.6 }); I.organ(t, up(chord, 55), sd * (B.i ? 24 : 15), 0.5, { rel: 1.2, bars: ORGAN });
          I.bass(t, root - 12, sd * (B.i ? 24 : 15), 0.7, { kind: "sub" }); if (B.i) I.brass(t, up(chord, 62).slice(1), sd * 10, 0.55, { cut: 3000 });
        }
      },
    },
  },
});

// ---- Psalm 133, Ecce nunc: "Night Watch" -----------------------------------------------------------
// Minimal techno, D minor, 118: the last psalm of Compline, for the servants who stand in the house of
// the Lord in the night. A deep soft kick, a rim ticking like a clock, chords echoing down a long nave,
// the bell for the night office. Sung whole twice, the second time in 5/8; "In the nights lift up your
// hands" is said again each time, and the choir lifts with it. The last blessing, "May the Lord out of
// Sion bless thee", is the last line, and the bell tolls the song out.
const P133 = {
  Dm: [38, [53, 57, 60, 64]], Bb: [46, [53, 57, 62, 65]], Gm: [43, [53, 58, 62, 65]], A: [45, [52, 57, 61, 64]],
  F: [41, [53, 57, 60, 64]], C: [36, [52, 55, 60, 64]],
};
const WATCH = ["Dm", "Bb", "Gm", "A"];
const FILL10 = [{ kick: at(10, { 0: "0" }), snare: at(10, { 6: "0" }), tom2: at(10, { 7: "2" }), tom3: at(10, { 8: "1", 9: "3" }) }];
SONGS.ps133 = band({
  title: "Night Watch", genre: "Minimal techno", meters: "4/4 · 5/8", bpm: 118, duck: 0.4, delay: (60 / 118) * 0.75,
  kit: KITS.minimal, selahChord: [53, 57, 60, 64], whole: true,
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["outro"]],
  lectio: [{ v: 2, echo: "In the nights lift up your hands", times: 2 }],
  // The night office bell, far off.
  bellToll(e, v) { e.I.bell(e.t, 50, 4, v, { ratio: 2.76, index: 2.4, rev: 0.7, dly: 0.2 }); },
  sec: {
    intro: {
      bars: 4,
      drums(B) { return { kick: at(16, B.i < 2 ? { 0: "0" } : { 0: "0", 8: "0" }), rim: at(16, { 4: "0", 12: "0" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = P133[WATCH[B.i % 4]];
        if (s === 0 && B.i % 2 === 0) this.bellToll(e, 0.45);
        if (s === 0) { I.pad(t, up(chord, 53), sd * 16, 0.26, { cut: 600 + 150 * B.i, att: 0.8, rev: 0.6, voices: 3 }); I.bass(t, root - 12, sd * 15, 0.5, { kind: "sub" }); }
        if (B.i === 3 && s === 8) I.riser(t, sd * 8, 0.45);
      },
    },
    // "Behold now bless ye the Lord": minimal techno, the chord echoing away.
    A: {
      perLine: 2,
      drums(B) { return groove(B, { kick: "0...1...0...1...", clap: "....0.......0...", rim: at(16, { 3: "2", 7: "g", 10: "2", 15: "g" }), hat: "..2...2...2...2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", [root, chord] = P133[WATCH[B.i % 4]], hands = /\bhands\b/.test(T);
        if (s === 0 || s === 8) I.bass(t, root - 12, sd * 6, 0.75, { kind: "sub" });
        if (s === 3 || s === 10) I.stab(t, chord, 0.55, { cut: /\bnights\b/.test(T) ? 900 : 1500, floor: 380, dly: 0.55, rev: 0.45, decay: 0.16, hold: 0.02 });
        if (hands && s === 0) I.choir(t, up(chord, 62), sd * 16, 0.5, { vowel: "a", att: 0.6, glide: up(chord, 62)[0] - 5 });
        if (/\bbless\b/.test(T) && s === 0 && B.lineBar === 0) this.bellToll(e, 0.3);
        if (L >= 1 && B.lineBar === 1) for (const [st, m] of [[0, 74], [4, 72], [6, 69], [10, 72]]) if (st === s) I.bell(t, m, 1.2, 0.18, { ratio: 2, index: 1, rev: 0.5, dly: 0.4 });
        if (L >= 2 && s === 0 && !hands) I.pad(t, up(chord, 57), sd * 16, 0.22, { cut: 1100, att: 0.4, voices: 3 });
      },
    },
    build: {
      bars: 2,
      drums(B) {
        if (B.i === 0) return { kick: "0...0...0...0...", clap: "....1...1...1...", hat: eighths(16, "2") };
        return { kick: "f...f...f...f...", roll: ["snare", 0, 14, 1] };
      },
      play(e, B) {
        const { t, s, sd, I } = e;
        if (s === 0 && B.i === 0) I.riser(t, sd * 32, 0.6);
        if (s === 0) I.pad(t, up(P133.A[1], 57), sd * 16, 0.3 + 0.1 * B.i, { cut: 900 + 1400 * B.i, sweep: 3000, voices: 3 });
      },
    },
    // The drop: deeper, the chords opening, the bell melody.
    drop: {
      bars: 8,
      drums(B) { return groove(B, { kick: "0...0...0...0...", clap: "....0.......0...", rim: at(16, { 3: "2", 7: "3", 10: "2", 14: "3" }), hat: "2323232323232323", ohat: "..2...2...2...2." }); },
      play(e, B, L) {
        const { t, s, sd, I } = e, [root, chord] = P133[WATCH[B.i % 4]];
        if (B.i === 0 && s === 0) { I.impact(t, 0.6); this.bellToll(e, 0.4); }
        if (s % 4 === 2) I.bass(t, root - 12, sd * 1.5, 0.8, { kind: "pluck", cut: 900, q: 4, floor: 140 });
        if (s === 0) I.bass(t, root - 12, sd * 2, 0.6, { kind: "sub" });
        if (s === 3 || s === 10 || s === 14) I.stab(t, chord, 0.6, { cut: 1300 + 200 * (B.i % 4), floor: 400, dly: 0.55, rev: 0.45, decay: 0.16, hold: 0.02 });
        if (L >= 1) for (const [st, m] of [[0, 74], [3, 72], [6, 69], [8, 72], [12, 76]]) if (st === s) I.bell(t, m, 1, 0.2, { ratio: 2, index: 1, rev: 0.45, dly: 0.35 });
        if (L >= 2 && s === 0) I.choir(t, up(chord, 62), sd * 16, 0.32, { vowel: "o", att: 0.4 });
      },
    },
    // The second time round, in 5/8: the watch goes on.
    B: {
      perLine: 2, len: 10,
      drums(B) { return groove(B, { kick: at(10, { 0: "0", 4: "2" }), snare: at(10, { 6: "0" }), rim: at(10, { 3: "1", 8: "2", 9: "g" }), hat: eighths(10, "2") }, FILL10); },
      play(e, B, L) {
        const { t, s, sd, I } = e, T = B.text || "", [root, chord] = P133[WATCH[B.i % 4]], hands = /\bhands\b/.test(T);
        if (s === 0) I.bass(t, root - 12, sd * 9, 0.7, { kind: "sub" });
        if (s === 2 || s === 7) I.stab(t, chord, 0.5, { cut: 1400, floor: 380, dly: 0.55, rev: 0.45, decay: 0.16, hold: 0.02 });
        if (s % 2 === 0) I.mallet(t, up(chord, 69)[(s / 2) % 4], 0.28, { partial: 5.4, knock: 0.1, decay: 0.8, dly: 0.3, pan: -0.25 });
        if (hands && s === 0) I.choir(t, up(chord, 62), sd * 10, 0.5, { vowel: "a", att: 0.4, glide: up(chord, 62)[0] - 5 });
        if (L >= 2 && s === 0 && !hands) I.pad(t, up(chord, 57), sd * 10, 0.22, { cut: 1100, voices: 3 });
      },
    },
    // After the blessing: the rim, the bell, and the dark.
    outro: {
      bars: 4,
      drums(B) { return { kick: at(16, { 0: "0" }), rim: at(16, B.i < 3 ? { 4: "0", 8: "0", 12: "0" } : { 4: "0" }) }; },
      play(e, B) {
        const { t, s, sd, I } = e, [root, chord] = [P133.Gm, P133.A, P133.Dm, P133.Dm][B.i];
        if (s === 0) { I.pad(t, up(chord, 57), sd * 16, 0.32 - B.i * 0.05, { cut: 1000, att: 0.4, rev: 0.6, voices: 3 }); I.bass(t, root - 12, sd * 16, 0.55 - B.i * 0.08, { kind: "sub" }); }
        if (s === 0 && B.i % 2 === 0) this.bellToll(e, 0.4 - B.i * 0.06);
        if (s === 0 && B.i === 2) I.choir(t, up(chord, 62), sd * 30, 0.4, { vowel: "a", att: 0.6, rel: 2 });
      },
    },
  },
});
