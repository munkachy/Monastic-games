"use strict";
// SELAH: the songs. Scores for the band in audio.js, played one sixteenth at a time, as in
// Luminaries. Each psalm's song follows the plan its chart gives it (compiler.js):
//   intro bars; then for every line of the psalm a "call" bar that carries the words, and an
//   "answer" bar where the band replies (the two choirs of the psalmody); a Selah bar where the
//   band falls away to a pad and a heartbeat, then the drop; the outro; silence.
// `L` (0–3) is the player's combo: the band builds as it grows and thins on a miss. From the
// second time through a short psalm (`pass2`) it never falls below 2. `cue(name, b)` is true once
// the text has named something (a trumpet, "arise") before bar b, so the band can answer it.
// `tones(b)` gives the notes the player's hits ring out on: the chord of the bar.

const on = (pat, s) => pat[s] === "x" || pat[s] === "X";
const ch = (root, ...iv) => iv.map((i) => root + i);
const up = (notes, lo) => notes.map((m) => { while (m < lo) m += 12; return m; }).sort((a, b) => a - b);

// Where in its plan a bar falls.
function part(P, b) {
  if (!P) return "free";
  if (b < P.intro) return "intro";
  if (b >= P.end) return "after";
  if (b >= P.outro) return b === P.end - 1 ? "final" : "outro";
  if (P.selah(b)) return "selah";
  if (P.drop(b)) return "drop";
  return P.call(b) ? "call" : "answer";
}
// A Selah: the band falls away to a held chord and a heartbeat, and a riser into the drop.
function selahBar(e, pad) {
  const { t, s, sd, I } = e;
  if (s === 0) I.pad(t, pad, sd * 15, 0.55, { cut: 800, att: 0.4, rel: 1.4, rev: 0.6, voices: 3 });
  if (s === 0 || s === 8) I.kick(t, 0.5, { tone: 40, decay: 0.5, click: 0.15, pump: false });
  if (s === 3 || s === 11) I.kick(t, 0.3, { tone: 40, decay: 0.4, click: 0.05, pump: false });
  if (s === 8) I.riser(t, sd * 8, 0.55);
}
// The bar after a Selah: everything at once.
function dropHit(e) { if (e.s === 0) { e.I.impact(e.t, 0.75); e.I.crash(e.t, 0.6); } }

const SONGS = {};

// ---- The title: "Selah" -------------------------------------------------------------------------
// Slow and deep, D minor: a soft kick, a sub, ninths on the electric piano, and far above,
// on a glass bell, the intonation of the first psalm tone (F, G, A), waiting.
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
  tones: () => [62, 65, 69, 72, 76],
};

// ---- Psalm 1, Beatus vir: "Two Ways" --------------------------------------------------------------
// Deep house in D Dorian (the mode of the first psalm tone), swung: a walking bass, ninths and
// thirteenths on the electric piano, a shaker and a soft clap. Two chords take turns like the
// two ways, the just and the wicked: D minor stays, G leans away. In the call bars the band
// keeps out of the words' way; in the answer bars it replies, and from the second level a glass
// bell sings the first psalm tone (its intonation and mediant). The way of the wicked perishes:
// the song ends on D minor alone.
const P1 = { Dm9: [38, [53, 57, 60, 64]], G13: [43, [53, 59, 64, 69]], Bb9: [46, [50, 53, 57, 60]], A7: [45, [55, 61, 64, 70]] };
SONGS.ps1 = {
  title: "Two Ways", genre: "Deep house", bpm: 120, swing: 0.1, duck: 0.4,
  chord(b) { const P = this.plan, c = ["Dm9", "G13", "Dm9", "Bb9", "Dm9", "G13", "Bb9", "A7"]; return P1[part(P, b) === "final" || part(P, b) === "outro" ? "Dm9" : c[b % 8]]; },
  play(e) {
    const { t, s, b, sd, I } = e, P = this.plan, where = part(P, b);
    if (where === "after") return;
    const L = P && b >= P.pass2 ? Math.max(e.L, 2) : e.L;
    const [root, chord] = this.chord(b);
    if (where === "selah") return selahBar(e, chord);
    if (where === "final") {
      if (s === 0) { I.kick(t, 0.9, { tone: 42, decay: 0.6 }); I.keys(t, chord, sd * 16, 0.9, { rev: 0.5, dly: 0.2 }); I.bass(t, root - 12, sd * 16, 0.7, { kind: "sub" }); I.pad(t, up(chord, 62), sd * 16, 0.5, { cut: 1600, rel: 2, rev: 0.6, voices: 3 }); }
      return;
    }
    if (where === "drop") dropHit(e);
    const intro = where === "intro", call = where === "call";
    // Drums.
    if (s % 4 === 0 && !(intro && b === 0)) I.kick(t, 1, { tone: 44, decay: 0.4 });
    if ((L >= 1 || where === "answer") && (s === 4 || s === 12) && !intro) I.clap(t, 0.7, { rev: 0.3 });
    I.hat(t, s % 4 === 2 ? 0.55 : s % 2 ? 0.2 : 0.32, { open: L >= 2 && s % 4 === 2, decay: 0.04 });
    if (L >= 1 && s % 2 === 1) I.shaker(t, 0.55);
    if (intro && b === P.intro - 1 && s === 8) I.riser(t, sd * 8, 0.6);
    // The walking bass.
    if (!(intro && b === 0)) {
      const BASS = [[0, 0, 3], [3, 12, 1], [6, 7, 2], [8, 0, 2], [11, 10, 1], [14, 12, 1]];
      for (const [st, iv, len] of BASS) if (st === s && (L > 0 || st % 4 === 0)) I.bass(t, root + iv, len * sd * 0.9, st === 0 ? 0.95 : 0.75, { kind: "pluck", cut: 1800, q: 8, floor: 160 });
    }
    // The electric piano: one soft chord under the words, an answer of stabs after them.
    if (call || intro) { if (s === 0) I.keys(t, chord, sd * 10, call ? 0.55 : 0.75, { rev: 0.3 }); }
    else if (s === 2 || s === 7 || s === 10 || s === 14) I.keys(t, chord, sd * (s === 14 ? 2 : 1.5), 0.8, { dly: 0.15 });
    // A warm pad from the second level.
    if (L >= 2 && s === 0) I.pad(t, up(chord, 62), sd * 16, 0.38, { cut: 1700, att: 0.2, rev: 0.45, voices: 3 });
    // The bell: the first psalm tone, in the answer bars.
    if (L >= 2 && where === "answer") {
      const TONE = [[0, 77], [2, 79], [4, 81], [8, 81], [10, 82], [11, 81], [12, 79], [14, 81]];
      for (const [st, m] of TONE) if (st === s) I.bell(t, m, 0.9, 0.32, { ratio: 2, index: 1.3, dly: 0.25 });
    }
    if (L >= 3 && where === "answer" && (s === 0 || s === 6 || s === 10)) I.vox(t, [74, 72, 69][s === 0 ? 0 : s === 6 ? 1 : 2], sd * 2, 0.6, { vowel: "a" });
  },
  tones(b) { return up(this.chord(b)[1], 69); },
};

// ---- Psalm 3, Domine, quid multiplicati: "Shield" -------------------------------------------------
// Dub techno in C minor: a chord that echoes away across the dark, a sub that hardly moves, a rim
// on the third beat with a long tail, tape hiss, a melodica far off. It is a lament (so many
// rise up against me) that turns to trust: when the text has said "arise" the chords lift
// toward E-flat, and the last chord is C major. Salvation is of the Lord. Three Selahs, as in the
// Hebrew: the band falls away, a heartbeat, and the drop.
const P3 = {
  Cm11: [36, [51, 55, 58, 65]], Ab9: [32, [48, 51, 55, 58]], G7s: [31, [53, 55, 60, 62]], G7: [31, [53, 56, 59, 62]],
  Eb: [39, [50, 55, 58, 62]], Fm9: [41, [56, 60, 63, 67]], C: [36, [52, 55, 60, 64]],
};
SONGS.ps3 = {
  title: "Shield", genre: "Dub techno", bpm: 112, duck: 0.35, delay: (60 / 112) * 0.75,
  chord(b) {
    const P = this.plan, w = part(P, b);
    if (w === "final" || w === "outro") return P3.C;
    const lifted = P && P.cue("arise", b);
    const c = lifted ? ["Ab9", "Eb", "Fm9", "G7"] : ["Cm11", "Cm11", "Ab9", "G7s"];
    return P3[c[b % 4]];
  },
  play(e) {
    const { t, s, b, sd, I } = e, P = this.plan, where = part(P, b);
    if (where === "after") return;
    const L = P && b >= P.pass2 ? Math.max(e.L, 2) : e.L;
    const [root, chord] = this.chord(b);
    if (s === 0) I.hiss(t, sd * 16, 1);
    if (where === "selah") return selahBar(e, up(chord, 55));
    if (where === "final") {
      if (s === 0) { I.stab(t, chord, 0.8, { cut: 2200, floor: 600, dly: 0.6, rev: 0.6, decay: 0.5 }); I.bass(t, root - 12, sd * 16, 0.7, { kind: "sub" }); I.pad(t, up(chord, 60), sd * 16, 0.5, { cut: 1400, rel: 2.5, rev: 0.7, voices: 3 }); I.kick(t, 0.8, { tone: 40, decay: 0.6 }); }
      return;
    }
    if (where === "drop") dropHit(e);
    const intro = where === "intro", call = where === "call";
    // The one-drop under it all; four to the floor once the player is in.
    if (L >= 1 && !intro ? s % 4 === 0 : s === 8) I.kick(t, s === 8 ? 0.9 : 0.75, { tone: 42, decay: 0.5, click: 0.3 });
    if (s === 8) I.rim(t, 0.45, { f: 1900, pan: -0.1 });
    if (s === 8 && b % 2) I.snare(t, 0.2, { rev: 0.7, f: 2400 });
    if (L >= 1 && s % 4 === 2) I.hat(t, 0.3, { decay: 0.03, pan: 0.3 });
    if (L >= 3 && s % 2 === 1) I.hat(t, 0.12, { decay: 0.02, pan: -0.3 });
    // The sub.
    if (s === 0 || (s === 8 && L >= 1)) I.bass(t, root - 12, sd * 7.5, 0.75, { kind: "sub", drive: 0.15 });
    // The dub chord, echoing away: once under the words, three times in the answer.
    const STABS = call ? [2] : intro ? [2, 10] : [2, 6, 10];
    if (STABS.includes(s)) I.stab(t, chord, call ? 0.55 : 0.75, { cut: L >= 2 ? 1900 : 1300, floor: 380, dly: 0.55, rev: 0.4, decay: 0.16, hold: 0.02 });
    // A dark pad from the second level.
    if (L >= 2 && s === 0) I.pad(t, up(chord, 55), sd * 16, 0.35, { cut: 950, att: 0.3, rev: 0.55, voices: 3 });
    // The melodica, far off, in the answer bars.
    if (L >= 2 && where === "answer") {
      const MEL = [[0, 67], [3, 70], [6, 72], [8, 70], [12, 67]];
      for (const [st, m] of MEL) if (st === s) I.lead(t, m + (P && P.cue("arise", b) ? 3 : 0), sd * (st === 12 ? 4 : 2.5), 0.38, { waves: ["square", "sawtooth"], cut: 1500, q: 2, vib: 9, att: 0.03, rev: 0.45, dly: 0.5 });
    }
  },
  tones(b) { return up(this.chord(b)[1], 70); },
};

// ---- Psalm 150, Laudate Dominum in sanctis: "Every Spirit" ----------------------------------------
// Gospel house in A-flat: four to the floor, hands clapping, an octave bass and a house piano.
// Every instrument the psalm names joins the band in the bar after it is named: the trumpet
// (a horn section), psaltery and harp (a harp running arpeggios), timbrel (a tambourine) and
// choir, strings and organs, cymbals. "Let every spirit praise the Lord": everything at once,
// and a lead singing over it. The second time through, the whole band is there from the start.
const P150 = { Db9: [37, [53, 56, 60, 63]], Eb9s: [39, [56, 58, 61, 65]], Cm9: [36, [51, 55, 58, 62]], Fm9: [41, [56, 60, 63, 67]], Ab: [44, [56, 60, 63, 70]] };
SONGS.ps150 = {
  title: "Every Spirit", genre: "Gospel house", bpm: 124, swing: 0.06, duck: 0.5,
  chord(b) { const w = part(this.plan, b); if (w === "final") return P150.Ab; return P150[["Db9", "Eb9s", "Cm9", "Fm9"][b % 4]]; },
  play(e) {
    const { t, s, b, sd, I } = e, P = this.plan, where = part(P, b);
    if (where === "after") return;
    const has = (k) => P && (P.cue(k, b) || P.cue("all", b));
    const all = P && P.cue("all", b);
    const L = all ? 3 : P && b >= P.pass2 ? Math.max(e.L, 2) : e.L;
    const [root, chord] = this.chord(b);
    if (where === "selah") return selahBar(e, chord);
    if (where === "final") {
      if (s === 0) {
        I.kick(t, 1, { tone: 46, decay: 0.5 }); I.crash(t, 0.8); I.impact(t, 0.6);
        I.bass(t, root - 12, sd * 16, 0.8, { kind: "sub" }); I.keys(t, up(chord, 60), sd * 16, 0.9, { rev: 0.5 });
        I.choir(t, up(chord, 60), sd * 16, 0.8, { vowel: "a", att: 0.05, rel: 1.6 }); I.organ(t, up(chord, 56), sd * 16, 0.6, { rel: 1.2 });
        I.pad(t, up(chord, 64), sd * 16, 0.5, { cut: 3000, rel: 2, rev: 0.6, voices: 3 });
      }
      return;
    }
    if (where === "drop") dropHit(e);
    const intro = where === "intro", answer = where === "answer";
    // The house band.
    if (s % 4 === 0 && !(intro && b === 0)) I.kick(t, 1, { tone: 46, decay: 0.34 });
    if (!intro && (s === 4 || s === 12)) I.clap(t, 0.85, { rev: 0.3 });
    if (s % 4 === 2) I.hat(t, 0.6, { open: L >= 2 || has("cymbals"), f: 8200 });
    if (L >= 1 && s % 2 === 1) I.hat(t, 0.22, { pan: -0.25 });
    if (intro && b === P.intro - 1 && s === 8) I.riser(t, sd * 8, 0.7);
    if (s % 2 === 0 && !(intro && b === 0)) I.bass(t, root + (s % 4 === 2 ? 12 : 0), sd * 1.7, 0.85, { kind: "pluck", cut: 2100, q: 7 });
    const PNO = answer ? "..x..x....x..x.." : "..x.......x.....";
    if (on(PNO, s)) I.keys(t, up(chord, 60), sd * 1.5, 0.72, { bark: 3.2, rev: 0.2 });
    // The trumpet: a horn section answering.
    if (has("brass") && answer) {
      const HORN = [[0, 1.5], [3, 1], [6, 3], [10, 1], [12, 3]];
      for (const [st, len] of HORN) if (st === s) I.stab(t, up(chord, 65).slice(1), 0.75, { cut: 4200, floor: 1400, hold: len * sd * 0.6, decay: 0.12, rev: 0.25 });
    }
    // Psaltery and harp: arpeggios running up and down.
    if (has("harp")) { const AR = [0, 1, 2, 3, 4, 3, 2, 1]; const tones = up(chord, 68); I.pluck(t, tones[AR[s % 8] % tones.length] + (s >= 8 ? 12 : 0), sd * 1.4, 0.3, { wave: "triangle", cut: 3600, q: 2, dly: 0.12, rev: 0.3, pan: 0.4 }); }
    // Timbrel and choir.
    if (has("timbrel")) I.tamb(t, s % 4 === 2 ? 0.9 : s % 2 ? 0.35 : 0.55);
    if (has("choir") && s === 0) I.choir(t, up(chord, 60), sd * 15, 0.65, { vowel: answer ? "a" : "o", att: 0.12 });
    // Strings and organs.
    if (has("strings") && s === 0) I.pad(t, up(chord, 67), sd * 16, 0.45, { cut: 2600, att: 0.25, rev: 0.45, voices: 3 });
    if (has("organ") && (s === 2 || s === 10)) I.organ(t, up(chord, 55), sd * 5, 0.55, { rev: 0.25 });
    // Cymbals.
    if (has("cymbals") && s === 0 && b % 2 === 0) I.crash(t, 0.45);
    // Every spirit: a lead singing over it all.
    if (all && answer) {
      const LICK = [[0, 80], [2, 82], [4, 84], [7, 80], [10, 77], [12, 80]];
      for (const [st, m] of LICK) if (st === s) I.lead(t, m, sd * 2, 0.5, { waves: ["sawtooth", "square"], cut: 3800, vib: 12, att: 0.02, rev: 0.35, dly: 0.25 });
    }
  },
  tones(b) { return up(this.chord(b)[1], 68); },
};
