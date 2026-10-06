"use strict";
// While You Have the Light: the music. Scores for the band in audio.js, played one sixteenth at a
// time, as in Fear Not. The melody is the old Compline hymn for Lent, "Christe, qui lux es et
// dies" ("Christ, who are light and day, you uncover the darkness of night"): detegis, "you
// uncover", is the whole game in one word. It is in the second mode, the hypodorian: its home is
// D, and it moves in a narrow, low range, from the C below to the G above and never higher. The
// harmony keeps to the mode (D minor, C, B-flat, A minor, F, G minor, and never the sharp seventh
// of a major key), and the organ plays the tune in parallel fifths, as the oldest written harmony
// did (organum).
//
// The hymn as the Cistercians sang it (they keep the Rule of St Benedict too), from GregoBase
// (https://gregobase.selapa.net/chant.php?id=9743), transcribed from the Hymnarium cisterciense,
// Badische Landesbibliothek Karlsruhe, Lichtenthal 28 (1250), folio 6r. The same tune is on
// GregoBase as the Dominicans sang it (id 6927, Antiphonarium O.P., 1933, p. 103) and in the
// Sarum use (id 8128). The first verse, as GregoBase gives it:
//
//   name:Christe qui lux;
//   office-part:Hymnus;
//   mode:2;
//   commentary:Ad completorium in dominicis;
//   %%
//   <v>\textcolor{red}{C}</v>hris(f3f)te,(fh) qui(fe) lux(f) es(g) et(h) di(f)es,(f) <v>\textcolor{red}{*}</v>(,)
//   noc(f)tis(f) te(h)né(g)bras(e) dé(f)te(h)gis,(g) (;) lu(h)cís(i)que(h) lu(g)men(f) cré(h)de(f)ris,(f) (,) lu(g)men(g) be(fe)á(f)tis(g) prǽ(h)di(f)cans.(f) (::)
//
// The F clef is on the third line (the "f3" in the first group), so h is F, g is E, f is D, e is C
// and i is G.
//
// The fight ("arena") is built in layers on that hymn, and the game raises and lowers them with the
// flow (audio.js brings a rise in on the next beat and a fall at the next bar):
//   0  no demon in the light: the wind (the game's), a low drone, a bell far off, and a few
//      lines of the hymn high up and far away in the reverb;
//   1  demons in the light: a heartbeat on the frame drum, a pulse, the organ swelling a chord to
//      a bar;
//   2  flow 5 to 11: the frame drum in a slow driving pattern, toms at the end of each line, and
//      the harpsichord turning broken chords in the mode;
//   3  flow 12 to 19: the great drum, the organ playing the hymn in fifths, a bass ostinato;
//   4  flow 20 and more: the monks' choir, the full organ, and everything in quicker notes.
// The title is the hymn alone, slow, on the organ, with a bell.
const SONGS = (() => {
  const S = {};
  const on = (pat, s) => pat[s] === "x";
  // The hymn, syllable by syllable, as the GABC above has it: four lines of eight syllables, each
  // syllable one note or two.
  const HYMN = [
    "f fh fe f g h f f",       // Chri-ste, qui lux es et di-es,
    "f f h g e f h g",         // noc-tis te-ne-bras de-te-gis,
    "h i h g f h f f",         // lu-cis-que lu-men cre-de-ris,
    "g g fe f g h f f",        // lu-men be-a-tis prae-di-cans.
  ].map((l) => l.split(" "));
  // A letter on the staff to a note: with the F clef on the third line, h is the F above middle C,
  // so the hymn's home, f, is the D above middle C.
  const DIA = [0, 2, 4, 5, 7, 9, 11];
  const pitch = (ch) => { const d = ch.charCodeAt(0) - 104 + 3; return 60 + 12 * Math.floor(d / 7) + DIA[((d % 7) + 7) % 7]; };
  // Each line takes three bars of four beats: a syllable to a beat (a two-note neume is two
  // eighths), the last syllable held for two beats, then three beats' rest before the next line.
  // MEL maps a step of the verse (192 sixteenths, twelve bars) to the notes that begin there:
  // [note, length in sixteenths, line, syllable].
  const MEL = new Map();
  HYMN.forEach((line, li) => line.forEach((syl, k) => {
    const len = k === 7 ? 8 : 4, at = li * 48 + k * 4, each = len / syl.length;
    [...syl].forEach((ch, j) => MEL.set(at + j * each, [pitch(ch), each, li, k]));
  }));
  // The harmony, a chord to a bar, three bars to a line: the voices for the organ (low, close,
  // around middle C), the four notes the harpsichord turns over, and the root for the bass.
  const CH = {
    Dm: { root: 38, v: [50, 57, 62, 65], h: [62, 65, 69, 74] },
    C: { root: 48, v: [48, 55, 60, 64], h: [60, 64, 67, 72] },
    Bb: { root: 46, v: [50, 53, 58, 62], h: [62, 65, 70, 74] },
    Am: { root: 45, v: [52, 57, 60, 64], h: [60, 64, 69, 72] },
    F: { root: 41, v: [53, 57, 60, 65], h: [60, 65, 69, 72] },
    Gm: { root: 43, v: [50, 55, 58, 62], h: [62, 67, 70, 74] },
    D5: { root: 38, v: [50, 57, 62, 69], h: [62, 69, 74, 77] },
  };
  const HARM = ["Dm", "C", "Dm", "Bb", "C", "Am", "F", "Dm", "Gm", "C", "Gm", "D5"].map((k) => CH[k]);
  // The harpsichord's figure over the four notes of a chord: the lowest, then a pedal on the top
  // note between the others, the old way of making one hand sound like two.
  const FIG = [0, 3, 2, 3, 1, 3, 2, 3];
  // The bass ostinato, in eighths: the root, its octave, its fifth.
  const OST = [0, 12, 0, 7, 0, 12, 7, 12];

  // ---- The fight: "Christe, qui lux es" ----------------------------------------------------------
  S.arena = {
    title: "Christe, qui lux es", bpm: 88, duck: 0.12, delay: (60 / 88) * 0.75, gain: 0.9,
    play(e) {
      const { t, s, b, sd, L, I } = e, vb = b % 12, li = Math.floor(vb / 3), lb = vb % 3, at = vb * 16 + s, P = HARM[vb], bar = sd * 16;
      const mel = MEL.get(at);
      // Always: a low drone on D and A, four bars long, each one fading into the next; it steps
      // back once the bass comes in. (It sits no lower than a phone's speaker can play.)
      if (s === 0 && b % 4 === 0) I.drone(t, [50, 57], bar * 4 + 1.6, L >= 3 ? 0.07 : 0.14, { att: 1.6, rel: 1.6, cut: 640 });
      // A bell far off: every four bars while the field is quiet, then once a verse.
      if (s === 0 && (L <= 1 ? b % 4 === 0 : vb === 0)) I.toll(t, b % 8 === 4 ? 45 : 50, 6, 0.6, { rev: 1.4, pan: -0.3 });
      // The hymn far away, high up on a soft flute stop, lost in the hall: at the quietest only
      // the first and third lines, with silence after each; then every line, until the organ
      // takes it up in earnest.
      if (mel && L <= 2 && (L >= 1 || li % 2 === 0)) {
        const [m, len] = mel;
        I.organ(t, [m + 12], len * sd * 1.05, L === 0 ? 0.07 : 0.06, { stop: "flute", att: 0.06, rel: 0.6, rev: 1.0, dly: 0.35, cut: 2200, pan: 0.25, chiff: 0.6 });
      }
      // The light finds a demon (or the flow lifts): a low boom on the beat where it comes in,
      // a tom for each step up after that; when the flow breaks, a falling breath.
      if (e.rose) { if (e.from === 0) I.impact(t, 0.3); else I.tom(t, 45 + 2 * L, 0.6); }
      if (e.fell && L <= 1) I.fall(t, 1.4, 0.35);
      if (L === 0) return;

      // 1: a heartbeat, a pulse, the organ swelling.
      if (L === 1) {
        if (s === 0 || s === 8) I.frame(t, 0.34, { f: 74, decay: 0.3, skin: 230 });
        if (s === 3 || s === 11) I.frame(t, 0.2, { f: 70, decay: 0.25, skin: 210 });
      }
      if (L <= 2 && s % 2 === 0) I.bass(t, P.root + 12, sd * 1.3, s % 4 ? 0.1 : 0.15, { kind: "pluck", cut: 750, floor: 190, q: 4, fd: 0.09, sus: 0.25, drive: 0 });
      if (s === 0 || (e.rose && e.from === 0)) {
        I.organ(t, P.v, sd * (16 - s) + 0.05, L === 3 ? 0.13 : 0.2, { stop: L === 3 ? "flute" : "principal", att: s === 0 ? 0.9 : 0.4, swell: 300, cut: L >= 3 ? 1400 : 1900, rel: 0.5, rev: 0.55, chiff: false });
      }
      if (L === 1) return;

      // 2: the frame drum driving, slow; toms rolling down at the end of each line; the
      // harpsichord's broken chords (eighths, then sixteenths at the height).
      const DOUM = L >= 3 ? "x..x..x.x.x..x.." : "x.....x...x.....", TAK = L >= 4 ? "..x.x..x..x.x.xx" : L >= 3 ? "....x..x....x..x" : "....x.......x...";
      if (on(DOUM, s)) I.frame(t, s === 0 ? 0.75 : 0.55, { pan: -0.1 });
      if (on(TAK, s)) I.frame(t, s % 4 === 0 ? 0.45 : 0.3, { edge: true });
      if (lb === 2 && s >= 8 && s % 2 === 0) I.tom(t, [57, 55, 52, 50][(s - 8) / 2], L >= 3 ? 0.6 : 0.5, { pan: 0.3 - (s - 8) * 0.07 });
      const div = L >= 4 ? 1 : 2;
      if (s % div === 0) {
        const k = s / div;
        I.harp(t, P.h[FIG[k % 8]], sd * div * 0.95, (k % 4 === 0 ? 1 : 0.8) * (L >= 4 ? 0.8 : 1), { pan: k % 2 ? 0.35 : -0.15, dly: L >= 4 ? 0.05 : 0.12, rev: 0.25 });
      }
      if (L === 2) return;

      // 3: the great drum; the organ playing the hymn in fifths (and the octave above it at the
      // height, on the full organ); the bass ostinato.
      if (s === 0 || s === 10) I.drum(t, s ? 0.37 : 0.5);
      if (L === 3 && s % 2 === 0) I.shaker(t, s % 4 ? 0.5 : 0.3);
      if (mel) {
        const [m, len] = mel;
        I.organ(t, L >= 4 ? [m, m - 7, m + 12] : [m, m - 7], len * sd + 0.04, L >= 4 ? 0.65 : 0.6, { stop: L >= 4 ? "plenum" : "principal", att: 0.03, rel: 0.2, rev: 0.45, cut: L >= 4 ? 4200 : 3400, chiff: 0.8 });
      }
      if (s % 2 === 0) I.bass(t, P.root + OST[s / 2], sd * 1.7, s % 4 ? 0.11 : 0.14, { kind: "pluck", cut: 1100, floor: 210, q: 5, fd: 0.1, sus: 0.45, drive: 0.25 });
      if (L === 3) return;

      // 4: the monks' choir, a chord to a bar; the rattle of little bells in sixteenths; a bell at
      // the start of each line; the frame drum rolling into the next bar.
      if (s === 0 || e.rose) I.choir(t, P.v.slice(0, 3), sd * (16 - s), 0.48, { vowel: lb === 2 ? "o" : "a", att: s === 0 ? 0.25 : 0.12, rel: 0.6, rev: 0.6, vib: 5 });
      I.shaker(t, s % 4 === 0 ? 0.55 : s % 2 ? 0.28 : 0.4, { pan: s % 2 ? 0.3 : -0.3, decay: 0.06 });
      if (lb === 0 && s === 0) I.bell(t, 86, 2.2, 0.22, { ratio: 2, index: 0.8, rev: 0.6, dly: 0.25 });
      if (s >= 13) I.frame(t, 0.3 + 0.1 * (s - 13), { f: 110, skin: 360, decay: 0.15 });
    },
  };

  // ---- The title: the hymn alone --------------------------------------------------------------
  // Slow, on the organ: the first time through on a soft flute stop, alone over a pedal drone;
  // the second time on the principal, in fifths. A bell at the start of each verse, and a smaller
  // one at each line.
  S.title = {
    title: "Christe, qui lux es et dies", bpm: 66, duck: 0, delay: (60 / 66) * 0.75, gain: 0.95,
    play(e) {
      const { t, s, b, sd, I } = e, vb = b % 12, round = Math.floor(b / 12) % 2, at = vb * 16 + s, bar = sd * 16;
      if (s === 0 && vb % 3 === 0) I.organ(t, [38, 45, 50], bar * 3, 0.22, { stop: "flute", att: 1.4, rel: 1.4, cut: 900, rev: 0.6, chiff: false });
      if (s === 0 && vb === 0) I.toll(t, 50, 7, 0.55, { rev: 1.2, pan: -0.2 });
      else if (s === 0 && vb % 3 === 0) I.toll(t, 57, 5, 0.22, { rev: 1.4, pan: 0.3 });
      const mel = MEL.get(at);
      if (mel) {
        const [m, len] = mel;
        I.organ(t, round ? [m, m - 7] : [m], len * sd + 0.05, 0.4, { stop: round ? "principal" : "flute", att: 0.05, rel: 0.35, rev: 0.6, dly: 0.12, cut: 2600, chiff: 0.7 });
      }
    },
  };

  // Silence, for when nothing should play.
  S.silence = { title: "", bpm: 60, play() { } };
  return S;
})();
