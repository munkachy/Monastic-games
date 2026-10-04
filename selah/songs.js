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
// bars; in the instrumental ones, the words are the psalm's Latin. The band builds with the combo
// (`L`, 0–3) in everything but the drums, which always play in full.

const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
const ch = (root, ...iv) => iv.map((i) => root + i);
const up = (notes, lo) => notes.map((m) => { while (m < lo) m += 12; return m; }).sort((a, b) => a - b);
const pat = (s) => s.replace(/\s+/g, "");
// A lighter organ (four drawbars), so a phone can carry a full band.
const ORGAN = [[1, 1], [2, 0.7], [3, 0.45], [4, 0.3]];
const dots = (n) => ".".repeat(n);
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
  if (B.crash) p.crash = "0" + dots(B.len - 1);
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
  latin: "Beatus vir qui non abiit in consilio impiorum",
  kit: KITS.house, selahChord: [62, 65, 69, 72],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  sec: {
    intro: {
      bars: 4, latin: true,
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
      bars: 8, latin: true,
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
      bars: 8, latin: true, len: (i) => (i >= 6 ? 14 : 16),
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
  latin: "Domine, quid multiplicati sunt qui tribulant me?",
  kit: KITS.dub, selahChord: [60, 63, 67, 70],
  form: [["intro"], ["A", 1], ["build"], ["drop"], ["B", 2], ["break"], ["C", 3], ["build2"], ["drop2"], ["outro"]],
  chord(B, i) {
    const lifted = this.plan && this.plan.cue("arise", B.b);
    const c = lifted ? ["Ab9", "Eb", "Fm9", "G7"] : ["Cm11", "Cm11", "Ab9", "G7s"];
    return P3[c[i % 4]];
  },
  sec: {
    intro: {
      bars: 4, latin: true,
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
      bars: 8, latin: true,
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
      bars: 8, latin: true,
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
  latin: "Laudate Dominum in sanctis ejus. Alleluia.",
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
      bars: 4, latin: true,
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
      bars: 8, latin: true,
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
      bars: 8, latin: true,
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
