"use strict";
// Luminaries: your own part in the band. Each Doctor's song lends the player three voices from its
// own sound: one for moving a block from side to side, one for drawing it down with a finger, and one
// for a flick. Every note is in the stage's scale and falls on the song's grid, so playing sounds like
// playing along.
//   Moving: the column is the note, low at the left and high at the right, like a keyboard laid
//   under the field (the same place always gives the same note).
//   Drawing down: a run that falls down the scale, a note for every row the block passes.
//   A flick: an accent, with a chord on the note of the column where the block lands.
const Kit = (() => {
  const I = Sound.I, K = {};

  // ---- The voices -----------------------------------------------------------------------------
  // Each is { f(t, note, velocity, x), oct, lo, hi }: the note is moved by `oct` and then folded by
  // octaves into lo..hi, where a phone's little speaker can still sound it. `x` carries the pan, a
  // chord in the scale on the note (for the voices that strike several at once), and a sixteenth.
  const strum = (t, notes, v, o, gap) => notes.forEach((m, i) => I.pluck(t + i * (gap || 0.018), m, o.dur || 0.3, v, o));
  const NYLON = { wave: "triangle", cut: 4200, q: 1.2, floor: 800, fd: 0.3, decay: 0.6, rev: 0.25, dly: 0.12, dur: 0.5 };
  const FLAMENCO = { wave: "sawtooth", cut: 5200, q: 1, floor: 1000, fd: 0.18, decay: 0.4, rev: 0.22, dly: 0.08, dur: 0.35 };
  const HARP = { wave: "triangle", cut: 6500, q: 0.8, floor: 1500, fd: 0.5, decay: 0.9, rev: 0.45, dly: 0.2, dur: 0.8 };
  const HARPSI = { wave: "sawtooth", cut: 9000, q: 2, floor: 2600, fd: 0.25, decay: 0.35, rev: 0.15, dly: 0.06, dur: 0.25 };
  const MANDO = { wave: "sawtooth", cut: 6500, q: 3, floor: 2000, fd: 0.06, decay: 0.14, rev: 0.15, dly: 0.05, dur: 0.08 };
  const V = {
    // Keys
    rhodes: { f: (t, m, v) => I.keys(t, [m], 0.35, v * 1.2, { bark: 2.6, rev: 0.25, dly: 0.12, spread: 0 }) },
    rhodesDrip: { oct: 12, f: (t, m, v) => I.keys(t, [m], 0.3, v * 1.1, { bark: 3, rev: 0.35, dly: 0.4, spread: 0 }) },
    epSoft: { f: (t, m, v) => I.keys(t, [m], 0.6, v * 1.1, { bark: 1.3, rev: 0.35, dly: 0.1, spread: 0 }) },
    housePiano: { f: (t, m, v) => I.keys(t, [m, m + 12], 0.25, v * 1.3, { bark: 4, rev: 0.2, dly: 0.08, spread: 0.5 }) },
    skank: { f: (t, m, v, x) => I.keys(t, x.chord.map((n) => n + 12), 0.08, v * 1.4, { bark: 3, dly: 0.6, rev: 0.3, spread: 0.6 }) },
    organ: { f: (t, m, v, x) => I.organ(t, [m], 0.18, v * 1.2, { rev: 0.3, pan: x.pan }) },
    hammond: { f: (t, m, v, x) => I.organ(t, [m], 0.14, v * 1.3, { bars: [[1, 1], [2, 0.9], [3, 0.8], [4, 0.5]], leslie: 6.8, wobble: 10, rev: 0.2, pan: x.pan }) },
    accordion: { f: (t, m, v, x) => I.organ(t, [m], 0.16, v * 1.2, { bars: [[1, 1], [2, 0.8], [3, 0.6], [4, 0.5], [5, 0.3]], wave: "triangle", leslie: 7, wobble: 9, click: false, rev: 0.2, pan: x.pan }) },
    harpsichord: { f: (t, m, v, x) => { I.pluck(t, m, 0.25, v * 0.85, Object.assign({ pan: x.pan }, HARPSI)); I.pluck(t, m + 12, 0.2, v * 0.35, { wave: "square", cut: 9000, q: 1, floor: 3000, fd: 0.2, decay: 0.25, rev: 0.1, dly: 0, pan: x.pan }); } },
    // Strings, plucked and bowed
    clav: { f: (t, m, v, x) => I.pluck(t, m, 0.12, v, { wave: "square", cut: 6000, q: 5, floor: 1400, fd: 0.07, decay: 0.16, rev: 0.06, dly: 0.1, pan: x.pan }) },
    wahClav: { f: (t, m, v, x) => I.pluck(t, m, 0.14, v, { wave: "square", cut: 600, q: 14, floor: 4200, fd: 0.09, decay: 0.16, rev: 0.08, dly: 0.12, pan: x.pan }) },
    mutedGtr: { f: (t, m, v, x) => I.pluck(t, m, 0.1, v * 1.15, { wave: "sawtooth", cut: 3000, q: 2, floor: 900, fd: 0.06, decay: 0.12, rev: 0.08, dly: 0.1, pan: x.pan }) },
    wahGtr: { f: (t, m, v, x) => I.pluck(t, m, 0.18, v, { wave: "sawtooth", cut: 700, q: 10, floor: 3600, fd: 0.12, decay: 0.2, rev: 0.12, dly: 0.15, pan: x.pan }) },
    driveGtr: { f: (t, m, v, x) => { const o = { wave: "sawtooth", cut: 3200, q: 2.5, floor: 1400, fd: 0.2, decay: 0.25, rev: 0.15, dly: 0.1, pan: x.pan }; I.pluck(t, m, 0.22, v * 0.85, o); I.pluck(t, m + 7, 0.22, v * 0.45, o); } },
    // A palm-muted power chord, low in the guitar's middle.
    chug: { lo: 52, hi: 69, f: (t, m, v, x) => { const o = { wave: "sawtooth", cut: 2400, q: 3, floor: 700, fd: 0.05, decay: 0.1, rev: 0.05, dly: 0, pan: x.pan }; I.pluck(t, m, 0.08, v, o); I.pluck(t, m + 7, 0.08, v * 0.6, o); } },
    nylon: { f: (t, m, v, x) => I.pluck(t, m, 0.5, v * 1.15, Object.assign({ pan: x.pan }, NYLON)) },
    flamenco: { f: (t, m, v, x) => I.pluck(t, m, 0.35, v * 1.05, Object.assign({ pan: x.pan }, FLAMENCO)) },
    harp: { f: (t, m, v, x) => I.pluck(t, m, 0.8, v * 1.15, Object.assign({ pan: x.pan }, HARP)) },
    oud: { f: (t, m, v, x) => I.pluck(t, m, 0.3, v, { wave: "square", cut: 2400, q: 3, floor: 450, fd: 0.12, decay: 0.35, rev: 0.2, dly: 0.1, pan: x.pan }) },
    kanun: { oct: 12, f: (t, m, v, x) => I.pluck(t, m, 0.4, v * 0.95, { wave: "triangle", cut: 5000, q: 2, floor: 900, fd: 0.2, decay: 0.5, rev: 0.35, dly: 0.15, pan: x.pan }) },
    psaltery: { f: (t, m, v, x) => I.pluck(t, m, 0.6, v * 0.9, { wave: "square", cut: 3600, q: 1, floor: 900, fd: 0.4, decay: 0.7, rev: 0.45, dly: 0.15, pan: x.pan }) },
    mandolin: { f: (t, m, v, x) => { for (let k = 0; k < 4; k++) I.pluck(t + k * 0.05, m, 0.08, v * (0.9 - k * 0.15), Object.assign({ pan: x.pan }, MANDO)); } },
    pizz: { f: (t, m, v, x) => I.pluck(t, m, 0.18, v, { wave: "sawtooth", cut: 3200, q: 1.5, floor: 700, fd: 0.12, decay: 0.25, rev: 0.4, dly: 0.05, pan: x.pan }) },
    strings: { f: (t, m, v) => I.pad(t, [m], 0.12, v * 2.2, { att: 0.012, rel: 0.14, cut: 3600, voices: 3, rev: 0.4 }) },
    fiddle: { f: (t, m, v, x) => I.lead(t, m, 0.12, v * 1.1, { waves: ["sawtooth"], cut: 2600, q: 2, att: 0.02, vib: 8, rev: 0.25, dly: 0.1, rel: 0.08, pan: x.pan }) },
    upright: { oct: -12, lo: 40, hi: 64, f: (t, m, v, x) => I.bass(t, m, x.sd * 1.8, v * 1.1, { kind: "pluck", cut: 1600, q: 3, floor: 300, fd: 0.2, sus: 0.4 }) },
    continuo: { oct: -12, lo: 40, hi: 64, f: (t, m, v, x) => I.bass(t, m, x.sd * 1.5, v * 1.1, { kind: "pluck", cut: 2400, q: 5, floor: 350, fd: 0.15, sus: 0.5 }) },
    // Synths
    synthPluck: { f: (t, m, v, x) => I.pluck(t, m, 0.2, v, { wave: "sawtooth", cut: 5200, q: 4, floor: 1200, fd: 0.15, decay: 0.25, rev: 0.15, dly: 0.3, pan: x.pan }) },
    risePluck: { oct: 12, f: (t, m, v, x) => I.pluck(t, m, 0.18, v, { wave: "sawtooth", cut: 7000, q: 5, floor: 1500, fd: 0.12, decay: 0.2, rev: 0.25, dly: 0.35, pan: x.pan }) },
    // One note in three octaves at once, the middle loudest: the rising scale that never gets higher.
    shepard: { lo: 57, hi: 81, f: (t, m, v, x) => { const o = { wave: "sawtooth", cut: 5000, q: 3, floor: 700, fd: 0.15, decay: 0.22, rev: 0.25, dly: 0.25, pan: x.pan }; I.pluck(t, m - 12, 0.2, v * 0.5, o); I.pluck(t, m, 0.2, v, o); I.bell(t, m + 12, 0.4, v * 0.5, { ratio: 3, index: 1 }); } },
    moog: { f: (t, m, v, x) => I.lead(t, m, 0.14, v * 1.1, { waves: ["sawtooth", "square"], cut: 2200, q: 5, glide: m - 2, rev: 0.2, dly: 0.2, rel: 0.06, pan: x.pan }) },
    buzz: { f: (t, m, v, x) => I.lead(t, m, 0.1, v, { waves: ["square", "sawtooth"], cut: 2600, q: 4, vib: 35, rev: 0.15, dly: 0.2, rel: 0.05, pan: x.pan }) },
    bleep: { oct: 12, f: (t, m, v, x) => I.lead(t, m, 0.05, v * 0.8, { waves: ["square"], env: false, cut: 9000, q: 0.5, rev: 0.1, dly: 0.25, rel: 0.02, pan: x.pan }) },
    seqBlip: { f: (t, m, v, x) => I.lead(t, m, 0.06, v * 0.95, { waves: ["sawtooth"], cut: 1800, q: 6, rev: 0.1, dly: 0.3, rel: 0.03, pan: x.pan }) },
    chipSq: { f: (t, m, v, x) => I.lead(t, m, 0.07, v * 0.8, { waves: ["square"], env: false, cut: 14000, q: 0.3, rev: 0.04, dly: 0.12, rel: 0.02, pan: x.pan }) },
    chipTri: { oct: 12, f: (t, m, v, x) => I.lead(t, m, 0.09, v * 1.4, { waves: ["triangle"], env: false, cut: 14000, q: 0.3, rev: 0.04, dly: 0.06, rel: 0.02, pan: x.pan }) },
    // Winds and brass
    brass: { f: (t, m, v, x) => I.lead(t, m, 0.13, v * 1.05, { waves: ["sawtooth", "sawtooth"], cut: 2400, q: 1.5, att: 0.015, rev: 0.25, dly: 0.12, rel: 0.06, pan: x.pan }) },
    bugle: { f: (t, m, v, x) => I.lead(t, m, 0.12, v, { waves: ["sawtooth", "square"], cut: 3400, q: 2, att: 0.012, rev: 0.3, dly: 0.15, rel: 0.05, pan: x.pan }) },
    horn: { f: (t, m, v, x) => I.lead(t, m, 0.3, v, { waves: ["sawtooth", "triangle"], cut: 1300, q: 1, att: 0.05, rev: 0.45, dly: 0.1, rel: 0.15, pan: x.pan }) },
    duduk: { f: (t, m, v, x) => I.lead(t, m, 0.4, v * 1.1, { waves: ["sawtooth"], cut: 1500, q: 2.5, att: 0.06, vib: 16, rev: 0.4, dly: 0.2, rel: 0.15, glide: m - 1, pan: x.pan }) },
    whistle: { oct: 12, f: (t, m, v, x) => I.flute(t, m, 0.16, v * 1.1, { vib: 10, rev: 0.3, dly: 0.15, pan: x.pan }) },
    flute: { f: (t, m, v, x) => I.flute(t, m, 0.25, v * 1.1, { vib: 14, pan: x.pan }) },
    fife: { oct: 12, f: (t, m, v, x) => I.flute(t, m, 0.1, v, { vib: 6, bright: 0.25, rev: 0.2, pan: x.pan }) },
    dove: { oct: 12, f: (t, m, v, x) => I.lead(t, m, 0.28, v, { waves: ["sine"], env: false, cut: 5000, att: 0.04, glide: m + 9, glideT: 0.12, rev: 0.4, dly: 0.25, rel: 0.12, pan: x.pan }) },
    // Mallets and bells
    vibes: { f: (t, m, v, x) => I.mallet(t, m, v * 1.1, { partial: 4, knock: 0.12, ring: 0.3, decay: 1.1, rev: 0.3, dly: 0.15, pan: x.pan }) },
    marimba: { f: (t, m, v, x) => I.mallet(t, m, v * 1.25, { partial: 3.93, knock: 0.22, decay: 0.4, rev: 0.15, pan: x.pan }) },
    kalimba: { oct: 12, f: (t, m, v, x) => I.mallet(t, m, v * 1.1, { partial: 5.4, knock: 0.3, ring: 0.08, decay: 0.35, rev: 0.25, dly: 0.15, pan: x.pan }) },
    celesta: { oct: 12, f: (t, m, v, x) => I.mallet(t, m, v, { partial: 4, knock: 0.15, decay: 0.6, rev: 0.4, dly: 0.2, pan: x.pan }) },
    woodblock: { oct: 12, f: (t, m, v, x) => I.perc(t, m, v * 1.2, { decay: 0.06, rev: 0.12, pan: x.pan }) },
    pencil: { oct: 24, hi: 100, f: (t, m, v, x) => I.perc(t, m, v * 0.9, { decay: 0.03, rev: 0.08, pan: x.pan }) },
    stone: { f: (t, m, v, x) => I.rim(t, v * 1.1, { f: Sound.mtof(m + 24), pan: x.pan }) },
    musicBox: { oct: 12, f: (t, m, v, x) => I.bell(t, m, 0.6, v * 1.1, { ratio: 3.5, index: 2, rev: 0.4, dly: 0.25, pan: x.pan }) },
    glass: { oct: 12, f: (t, m, v, x) => I.bell(t, m, 1.1, v, { ratio: 3.01, index: 1.2, rev: 0.5, dly: 0.3, pan: x.pan }) },
    farBell: { oct: 12, f: (t, m, v, x) => I.bell(t, m, 1.6, v * 0.6, { ratio: 3.5, index: 1.5, rev: 0.7, dly: 0.45, pan: x.pan }) },
    chime: { oct: 12, f: (t, m, v, x) => I.bell(t, m, 1.3, v, { ratio: 2.76, index: 2.2, rev: 0.5, dly: 0.15, pan: x.pan }) },
    // Voices
    choirA: { f: (t, m, v) => I.vox(t, m, 0.2, v * 1.1, { vowel: "a" }) },
    choirO: { f: (t, m, v) => I.vox(t, m, 0.24, v * 1.1, { vowel: "o" }) },
    antiphon: { f: (t, m, v, x) => I.choir(t, [m], 0.2, v, { vowel: "a", att: 0.006, rel: 0.06, vib: 3, rev: 0.25, dly: 0.3, formant: 1.15, pan: x.pan < 0 ? -0.6 : 0.6 }) },
    hum: { f: (t, m, v) => I.choir(t, [m], 0.3, v * 1.15, { vowel: "u", att: 0.03, rel: 0.15, vib: 4, rev: 0.35, dly: 0.2 }) },
    talkbox: { f: (t, m, v) => I.vox(t, m, 0.16, v * 1.2, { vowel: "o", formant: 1.35, glide: m - 2 }) },
    sigh: { f: (t, m, v) => I.vox(t, m, 0.4, v, { vowel: "a", glide: m + 2, rev: 0.4 }) },
    cante: { f: (t, m, v) => I.vox(t, m, 0.3, v * 1.1, { vowel: "a", glide: m + 1, formant: 1.2, rev: 0.35 }) },
    chant: { f: (t, m, v) => I.vox(t, m, 0.35, v * 1.1, { vowel: "o", formant: 0.95, rev: 0.45 }) },
    chantA: { f: (t, m, v) => I.vox(t, m, 0.35, v * 1.1, { vowel: "a", glide: m - 1, rev: 0.45 }) },
    chantE: { f: (t, m, v) => I.vox(t, m, 0.35, v * 1.1, { vowel: "e", glide: m - 1, rev: 0.45 }) },
    schola: { f: (t, m, v) => I.choir(t, [m, m - 12], 0.35, v * 1.2, { vowel: "o", att: 0.02, rel: 0.2, vib: 2, rev: 0.5 }) },
    // Water
    bubble: { oct: 12, f: (t, m, v, x) => I.bloop(t, m, v, { from: 0.6, to: 1.7, dur: 0.08, rev: 0.3, dly: 0.25, pan: x.pan }) },
    waterDrop: { oct: 12, f: (t, m, v, x) => I.bloop(t, m, v * 0.9, { from: 0.8, to: 2.2, dur: 0.06, rev: 0.4, dly: 0.55, pan: x.pan }) },

    // ---- The flicks: an accent, and a chord on the column's note ----
    slap: { lo: 57, f: (t, m, v) => { I.bass(t, m - 12, 0.16, v, { kind: "pluck", cut: 4200, q: 12, floor: 300, fd: 0.1 }); I.clap(t, v * 0.45); } },
    stabChord: { f: (t, m, v, x) => { I.stab(t, x.chord, v, { cut: 5200, dly: 0.15 }); I.kick(t, v * 0.55, { pump: false }); } },
    houseStab: { f: (t, m, v, x) => { I.kick(t, v * 0.7, { pump: false }); I.keys(t, x.chord, 0.2, v * 1.3, { bark: 4, rev: 0.25, dly: 0.15 }); } },
    hornStab: { f: (t, m, v, x) => { I.stab(t, x.chord, v * 1.1, { cut: 4200, hold: 0.08, dly: 0.12 }); I.snare(t, v * 0.4); } },
    soulStab: { f: (t, m, v, x) => { I.stab(t, x.chord, v, { cut: 6000, hold: 0.04 }); I.shaker(t, v); I.clap(t, v * 0.4); } },
    bigBand: { f: (t, m, v, x) => { I.stab(t, x.chord.concat([x.chord[0] + 12]), v * 1.2, { cut: 5200, hold: 0.1 }); I.hat(t, v * 0.5, { open: true, f: 5000 }); I.kick(t, v * 0.5, { pump: false }); } },
    powerChord: { lo: 52, f: (t, m, v) => { I.stab(t, [m - 12, m - 5, m], v * 1.1, { cut: 2800, hold: 0.1 }); I.snare(t, v * 0.5); } },
    supersaw: { f: (t, m, v, x) => { I.pad(t, x.chord, 0.18, v * 2.4, { att: 0.005, rel: 0.18, cut: 5200, rev: 0.3 }); I.kick(t, v * 0.6, { pump: false }); } },
    timpani: { f: (t, m, v, x) => { I.tom(t, m - 12, v * 1.1, { decay: 0.7 }); I.stab(t, x.chord, v * 0.5, { cut: 2200, hold: 0.12 }); } },
    growl: { f: (t, m, v, x) => { I.tom(t, m - 12, v, { decay: 0.6 }); I.bass(t, m - 12, 0.35, v * 0.9, { kind: "reese", cut: 900 }); I.stab(t, x.chord, v * 0.8, { cut: 1800, hold: 0.15 }); } },
    frameDrum: { f: (t, m, v, x) => { I.perc(t, m - 12, v * 1.4, { decay: 0.25, rev: 0.2 }); I.clap(t, v * 0.25, { f: 900, decay: 0.08 }); strum(t, x.chord, v * 0.5, HARP); } },
    organChord: { f: (t, m, v, x) => { I.organ(t, x.chord, 0.3, v * 1.3, { rev: 0.3 }); I.clap(t, v * 0.55); } },
    choirChord: { f: (t, m, v, x) => { I.choir(t, x.chord, 0.35, v, { vowel: "a", att: 0.01, rel: 0.2 }); I.kick(t, v * 0.5, { pump: false }); } },
    dubBoom: { f: (t, m, v) => { I.tom(t, m - 12, v, { decay: 0.5 }); I.pluck(t, m + 12, 0.05, v * 0.5, { wave: "square", cut: 3000, q: 2, floor: 800, decay: 0.06, dly: 0.65, rev: 0.3 }); } },
    softEP: { f: (t, m, v, x) => { I.kick(t, v * 0.45, { pump: false, decay: 0.3 }); I.keys(t, x.chord, 0.5, v * 1.1, { bark: 1.5, rev: 0.35, spread: 0.6 }); } },
    dryKick: { lo: 50, f: (t, m, v) => { I.kick(t, v * 0.8, { pump: false, decay: 0.2 }); I.rim(t, v * 0.8); I.bass(t, m - 12, 0.15, v * 0.9, { kind: "pluck", cut: 1800, q: 4, floor: 250 }); } },
    snapStab: { f: (t, m, v, x) => { I.snare(t, v * 0.7, { f: 2400, decay: 0.1, rev: 0.15 }); I.stab(t, x.chord, v * 0.8, { cut: 3800, hold: 0.03, decay: 0.12 }); } },
    deepBell: { f: (t, m, v) => { I.bell(t, m - 12, 2, v, { ratio: 1.41, index: 2.5, rev: 0.6, dly: 0.1 }); I.kick(t, v * 0.5, { pump: false }); } },
    chipDrop: { f: (t, m, v) => { I.hat(t, v * 0.8, { f: 1500, decay: 0.1 }); I.lead(t, m - 12, 0.12, v * 0.8, { waves: ["square"], env: false, cut: 14000, rel: 0.03, dly: 0.05 }); } },
    bodhran: { f: (t, m, v, x) => { I.tom(t, m - 12, v, { decay: 0.25 }); I.perc(t, m, v * 0.7, { decay: 0.1 }); I.perc(t + x.sd, m - 5, v * 0.5, { decay: 0.08 }); } },
    bellDrum: { f: (t, m, v) => { I.tom(t, m - 12, v, { decay: 0.5 }); I.bell(t, m, 1.5, v * 0.6, { ratio: 2.76, index: 2, rev: 0.5 }); } },
    dhol: { f: (t, m, v) => { I.tom(t, m - 12, v * 1.1, { decay: 0.35 }); I.rim(t, v * 0.7, { f: 1400 }); } },
    churchBell: { f: (t, m, v) => { I.bell(t, m, 2.6, v * 1.1, { ratio: 1.41, index: 3, rev: 0.6, dly: 0.1 }); I.perc(t, m, v * 0.4); } },
    wobble: { lo: 50, f: (t, m, v) => { I.bass(t, m - 12, 0.3, v, { kind: "pluck", cut: 400, q: 14, floor: 2600, fd: 0.15 }); I.bloop(t, m + 12, v * 0.5, { from: 0.5, to: 2 }); } },
    choirTimp: { f: (t, m, v, x) => { I.tom(t, m - 12, v, { decay: 0.6 }); I.choir(t, x.chord, 0.5, v * 0.8, { vowel: "a", att: 0.02, rel: 0.3 }); } },
    labHit: { f: (t, m, v, x) => { I.snare(t, v * 0.55, { f: 2600, decay: 0.1 }); x.chord.forEach((n, i) => I.lead(t + i * x.sd * 0.5, n + 12, 0.05, v * 0.6, { waves: ["square"], env: false, cut: 9000, rel: 0.02, dly: 0.25 })); } },
    heartbeat: { f: (t, m, v, x) => { I.kick(t, v * 0.9, { pump: false, decay: 0.25 }); I.kick(t + 0.17, v * 0.6, { pump: false, decay: 0.2 }); I.pad(t, x.chord, 0.2, v * 1.8, { att: 0.01, rel: 0.2, cut: 3200, voices: 3 }); } },
    cajonStrum: { f: (t, m, v, x) => { I.kick(t, v * 0.6, { pump: false, tone: 70, punch: 180, decay: 0.15 }); I.snare(t, v * 0.4, { f: 2800, decay: 0.08, rev: 0.1 }); strum(t, x.chord, v * 0.55, FLAMENCO); } },
    palmasStrum: { f: (t, m, v, x) => { I.clap(t, v * 0.7); strum(t, x.chord, v * 0.6, NYLON); } },
    motorik: { lo: 50, f: (t, m, v) => { I.snare(t, v * 0.6, { f: 2000, decay: 0.12 }); I.bass(t, m - 12, 0.12, v * 0.8, { kind: "pluck", cut: 2400, q: 6, floor: 300 }); } },
    warDrum: { f: (t, m, v, x) => { I.tom(t, m - 12, v * 1.1, { decay: 0.45 }); for (let k = 0; k < 3; k++) I.snare(t + k * x.sd * 0.5, v * (0.25 + k * 0.12), { f: 2200, decay: 0.08 }); } },
    harpsiChord: { f: (t, m, v, x) => { strum(t, x.chord, v * 0.7, HARPSI, 0.03); I.kick(t, v * 0.5, { pump: false }); } },
    brushes: { f: (t, m, v) => { I.snare(t, v * 0.45, { f: 4200, decay: 0.28, rev: 0.3 }); I.keys(t, [m], 0.4, v * 0.6, { bark: 1.2, rev: 0.3, spread: 0 }); } },
    tamburello: { f: (t, m, v, x) => { I.shaker(t, v * 1.2); I.hat(t, v * 0.6, { open: true, f: 6500 }); strum(t, x.chord, v * 0.6, MANDO, 0.02); } },
    organFog: { f: (t, m, v, x) => { I.organ(t, x.chord, 0.35, v * 1.3, { bars: [[1, 1], [2, 0.9], [3, 0.8], [4, 0.5]], leslie: 6.8, wobble: 10 }); I.kick(t, v * 0.5, { pump: false }); } },
    deepBoom: { f: (t, m, v) => { I.tom(t, m - 12, v * 0.8, { decay: 0.8 }); I.bell(t, m + 12, 1.5, v * 0.3, { ratio: 3.5, index: 1, rev: 0.7, dly: 0.4 }); } },
    rideBass: { lo: 50, f: (t, m, v) => { I.hat(t, v * 0.7, { open: true, f: 5200 }); I.bass(t, m - 12, 0.25, v, { kind: "pluck", cut: 1600, q: 3, floor: 300, sus: 0.4 }); } },
  };

  // ---- Each song's three voices: moving, drawing down, a flick ---------------------------------------
  const KITS = {
    augustine: ["rhodes", "mutedGtr", "slap"],
    hildegard: ["glass", "risePluck", "stabChord"],
    thomas: ["moog", "chant", "hornStab"],
    teresa: ["nylon", "housePiano", "palmasStrum"],
    john: ["farBell", "waterDrop", "deepBoom"],
    therese: ["musicBox", "choirA", "supersaw"],
    irenaeus: ["wahGtr", "rhodes", "soulStab"],
    hilary: ["vibes", "upright", "rideBass"],
    athanasius: ["driveGtr", "chug", "powerChord"],
    ephrem: ["harp", "oud", "frameDrum"],
    basil: ["organ", "choirO", "organChord"],
    cyriljer: ["skank", "waterDrop", "dubBoom"],
    gregnaz: ["hum", "rhodes", "softEP"],
    ambrose: ["antiphon", "buzz", "choirChord"],
    chrysostom: ["brass", "talkbox", "bigBand"],
    jerome: ["clav", "pencil", "dryKick"],
    cyrilalex: ["chime", "chantA", "timpani"],
    chrysologus: ["marimba", "kalimba", "snapStab"],
    leo: ["horn", "pizz", "growl"],
    gregory: ["schola", "dove", "deepBell"],
    isidore: ["chipSq", "chipTri", "chipDrop"],
    bede: ["whistle", "fiddle", "bodhran"],
    damascene: ["chantE", "psaltery", "bellDrum"],
    narek: ["duduk", "kanun", "dhol"],
    damian: ["woodblock", "stone", "churchBell"],
    anselm: ["shepard", "housePiano", "houseStab"],
    bernard: ["rhodesDrip", "sigh", "softEP"],
    anthony: ["bubble", "wahClav", "wobble"],
    bonaventure: ["celesta", "flute", "choirTimp"],
    albert: ["bleep", "seqBlip", "labHit"],
    catherine: ["strings", "pizz", "heartbeat"],
    avila: ["flamenco", "cante", "cajonStrum"],
    canisius: ["synthPluck", "mutedGtr", "motorik"],
    lawrence: ["bugle", "fife", "warDrum"],
    bellarmine: ["harpsichord", "continuo", "harpsiChord"],
    francis: ["epSoft", "vibes", "brushes"],
    alphonsus: ["mandolin", "accordion", "tamburello"],
    newman: ["hammond", "vibes", "organFog"],
    title: ["glass", "rhodes", "softEP"],
  };

  // ---- The notes ------------------------------------------------------------------------------------
  // The stage's scale as steps within an octave, on a root kept near middle C.
  let keyId = null, PCS = [0, 2, 4, 7, 9], ROOT = 60;
  function key(stage) {
    if (stage.id === keyId) return;
    keyId = stage.id;
    const r0 = stage.scale[0];
    PCS = [...new Set(stage.scale.map((m) => (((m - r0) % 12) + 12) % 12))].sort((a, b) => a - b);
    let r = r0; while (r < 57) r += 12; while (r > 68) r -= 12; ROOT = r;
  }
  const noteAt = (deg, base) => { const n = PCS.length, o = Math.floor(deg / n); return base + 12 * o + PCS[((deg % n) + n) % n]; };
  const chordAt = (deg, base) => [noteAt(deg, base), noteAt(deg + 2, base), noteAt(deg + 4, base)];
  // When: the next point on the song's grid (a thirty-second in a slow song, so it never lags), and
  // never two of one kind at once. A quick run of moves plays as a quick run; a note that would fall
  // too far behind the hand is let go.
  const last = { move: 0, soft: 0, drop: 0 };
  function when(kind, gap) {
    const sd = 15 / Sound.bpm(), div = sd > 0.13 ? 0.5 : 1, step = sd * div;
    let t = Sound.grid(div);
    if (t < last[kind] + step * gap - 0.002) t = last[kind] + step * gap;
    if (t - Sound.now() > step * 3) return null;
    last[kind] = t; return t;
  }
  // Each voice's level, measured so that all of them sound about as loud as one another on a phone's
  // speaker (the band above 300 Hz), a little under the music: the moves clear but never on top.
  const LEVEL = {
    rhodes: 0.83, rhodesDrip: 0.7, epSoft: 0.89, housePiano: 0.9, skank: 1.05, organ: 2.3, hammond: 1.09,
    accordion: 2.05, harpsichord: 1.19, clav: 1.21, wahClav: 0.89, mutedGtr: 1.74, wahGtr: 1.37,
    driveGtr: 1.63, chug: 1.26, nylon: 1.49, flamenco: 1.68, harp: 1.34, oud: 1.24, kanun: 1.36, psaltery: 1.1,
    mandolin: 1.52, pizz: 2.02, strings: 0.95, fiddle: 1.76, upright: 0.52, continuo: 0.52, synthPluck: 1.49,
    risePluck: 1.17, shepard: 1.35, moog: 1.11, buzz: 0.95, bleep: 1.73, seqBlip: 2.3, chipSq: 1.59,
    chipTri: 0.91, brass: 1.35, bugle: 1.21, horn: 1.36, duduk: 1.42, whistle: 0.79, flute: 1.07, fife: 0.9,
    dove: 0.95, vibes: 0.87, marimba: 1.04, kalimba: 0.87, celesta: 0.82, woodblock: 1.43, pencil: 1.67,
    stone: 2.11, musicBox: 1.24, glass: 1.19, farBell: 1.14, chime: 1.12, choirA: 1.26, choirO: 0.89,
    antiphon: 1.07, hum: 1.72, talkbox: 0.99, sigh: 1.1, cante: 1.22, chant: 1.08, chantA: 1.11, chantE: 1.04,
    schola: 0.99, bubble: 1.91, waterDrop: 2.0, slap: 0.62, stabChord: 0.92, houseStab: 0.78, hornStab: 0.92,
    soulStab: 0.94, bigBand: 0.8, powerChord: 0.79, supersaw: 0.79, timpani: 0.95, growl: 0.6,
    frameDrum: 1.08, organChord: 1.43, choirChord: 0.67, dubBoom: 1.03, softEP: 0.91, dryKick: 0.77,
    snapStab: 0.97, deepBell: 0.89, chipDrop: 0.89, bodhran: 1.03, bellDrum: 1.0, dhol: 1.02, churchBell: 1.07,
    wobble: 0.58, choirTimp: 0.85, labHit: 1.29, heartbeat: 0.78, cajonStrum: 0.8, palmasStrum: 1.67,
    motorik: 0.74, warDrum: 0.97, harpsiChord: 0.91, brushes: 1.32, tamburello: 1.16, organFog: 0.91,
    deepBoom: 0.55, rideBass: 0.71,
  };
  function voice(name, t, m, v, x) {
    const vc = V[name] || V.rhodes, hi = vc.hi || 93, lo = vc.lo || 45;
    m += vc.oct || 0;
    while (m > hi) m -= 12;
    while (m < lo) m += 12;
    vc.f(t, m, v * (LEVEL[name] || 1), x);
  }
  const kitOf = (songId) => KITS[songId] || KITS.title;
  const extra = (col, deg) => ({ pan: (col - 7) / 12, chord: chordAt(deg, ROOT), sd: 15 / Sound.bpm() });
  // Moving: the column's note.
  K.move = (stage, songId, col) => {
    if (!Sound.ctx()) return;
    key(stage); const t = when("move", 0.5); if (t === null) return;
    const deg = col - 7;
    voice(kitOf(songId)[0], t, noteAt(deg, ROOT + 12), 0.55, extra(col, deg));
  };
  // Drawing down: a note for each row, falling down the scale (a little higher or lower by the column).
  K.soft = (stage, songId, col, row) => {
    if (!Sound.ctx()) return;
    key(stage); const t = when("soft", 1); if (t === null) return;
    const deg = 5 - row + Math.round((col - 7) / 3);
    voice(kitOf(songId)[1], t, noteAt(deg, ROOT + 12), 0.45, extra(col, deg));
  };
  // A flick: the accent on the column's note. Any other landing: a soft knock of wood.
  K.drop = (stage, songId, col, hard) => {
    if (!Sound.ctx()) return;
    key(stage); const t = when("drop", 1); if (t === null) return;
    const deg = col - 7;
    if (hard) voice(kitOf(songId)[2], t, noteAt(deg, ROOT), 0.85, extra(col, deg));
    else I.perc(t, noteAt(deg, ROOT), 0.35, { decay: 0.08, pan: (col - 7) / 12 });
  };
  // For tests.
  K.V = V; K.KITS = KITS; K.voice = voice; K.LEVEL = LEVEL;
  K.debugKey = (stage) => { key(stage); return { PCS: PCS.slice(), ROOT }; };
  return K;
})();
