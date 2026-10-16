// Vox Machina melody maker.
//
// Turns a verse into a list of notes, one per syllable, in a key you choose
// ("Bm", "D dorian", "Eb") and in one of several styles. Nothing here makes
// sound: sing.js plays these notes.
//
// Units: pitches are MIDI note numbers (60 = middle C); durations are beats.

// ---------------------------------------------------------------------------
// Keys and modes
// ---------------------------------------------------------------------------
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
const MODE_ALIASES = { '': 'major', maj: 'major', ionian: 'major', m: 'minor', min: 'minor',
  aeolian: 'minor', dor: 'dorian', phr: 'phrygian', lyd: 'lydian', mix: 'mixolydian' };
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// "Bm" -> { tonic: 47, mode: [...], label: "B minor" }. The tonic is placed
// in a comfortable low singing range (A2 to G#3); octave shifts it.
export function parseKey(str, octave = 0) {
  const m = String(str).trim().match(/^([A-Ga-g])\s*([#b♯♭]?)\s*([a-zA-Z]*)$/);
  if (!m) throw new Error(`I can't read the key "${str}". Try Bm, F#, Eb minor or D dorian.`);
  let pc = PC[m[1].toUpperCase()] + ({ '#': 1, '♯': 1, b: -1, '♭': -1 }[m[2]] || 0);
  pc = (pc + 12) % 12;
  // "m" means minor, but "M" or "maj" means major.
  let word = m[3] === 'M' ? 'major' : m[3].toLowerCase();
  word = MODE_ALIASES[word] || word;
  if (!MODES[word]) throw new Error(`Unknown mode "${m[3]}". Use major, minor, dorian, phrygian, lydian or mixolydian.`);
  let tonic = 45 + ((pc - 9 + 12) % 12);          // 45 = A2
  tonic += 12 * octave;
  return { tonic, mode: MODES[word], label: `${NAMES[pc]} ${word}` };
}

// Scale degree (0 = tonic, 7 = tonic an octave up, -1 = leading tone below)
// to a MIDI note in the given key.
export function degToMidi(key, deg) {
  const oct = Math.floor(deg / 7), step = ((deg % 7) + 7) % 7;
  return key.tonic + 12 * oct + key.mode[step];
}
export function midiName(n) { return NAMES[n % 12] + (Math.floor(n / 12) - 1); }
export function midiToHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

// ---------------------------------------------------------------------------
// Text to words and syllables
// ---------------------------------------------------------------------------

// A rough English syllable counter: count groups of vowels, then correct for
// the common silent "e" endings. Good enough to give each syllable a note.
export function countSyllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Split a verse into words, marking where phrases end (at , ; : . ! ?).
// Numbers are kept as words; eSpeak reads them aloud.
export function wordsOf(text) {
  const out = [];
  for (const raw of text.split(/\s+/)) {
    const clean = raw.replace(/[^\w'’-]/g, '');
    if (!clean) { if (out.length && /[,;:.!?]/.test(raw)) out[out.length - 1].pause = pauseOf(raw); continue; }
    const syl = /\d/.test(clean) ? Math.max(1, clean.length) : countSyllables(clean);
    out.push({ text: clean, syllables: syl, pause: pauseOf(raw) });
  }
  if (out.length) out[out.length - 1].pause = 2;
  return out;
}
// 0 = no pause, 1 = comma-sized, 2 = full stop.
function pauseOf(raw) { return /[.!?;:]$/.test(raw) ? 2 : /,$/.test(raw) ? 1 : 0; }

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

// Small seeded random generator, so "variation 3" is always the same tune.
function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export const STYLES = {
  psalmTone: { label: 'Monastic: psalm tone', about: 'Gregorian-style: rise to a reciting note, a mid-verse cadence, a falling final cadence.' },
  rectoTono: { label: 'Monastic: recto tono', about: 'Everything on one note, as the Office is said in choir, falling a step at the end of each half.' },
  hymn: { label: 'Hymn', about: 'A stepwise tune over a slow chord progression, phrase endings on the chord.' },
  kraftwerk: { label: 'Kraftwerk', about: 'A short repeated machine motif on the triad, strict even notes.' },
  lament: { label: 'Lament', about: 'Each phrase walks slowly down the scale, in long-short rhythm.' },
  arpeggio: { label: 'Trance arpeggio', about: 'Quick notes running up and down the chords.' },
};

// Chord roots as scale degrees: a progression that suits major or minor.
function progression(key, r) {
  const minor = key.mode[2] === 3;
  return pick(r, minor
    ? [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 4], [0, 5, 3, 4]]
    : [[0, 4, 5, 3], [0, 3, 4, 0], [0, 5, 3, 4], [0, 3, 5, 4]]);
}
const triad = root => [root, root + 2, root + 4];

// Build the tune. Returns { notes, key } where each note is
// { word, syllable, midi, beats, chord: [midi...] }, and rests are
// { rest: true, beats }.
export function makeMelody(text, { key: keyStr = 'Bm', style = 'psalmTone', seed = 1,
  octave = 0, harmony = 'none' } = {}) {
  const key = parseKey(keyStr, octave);
  const words = wordsOf(text);
  const r = rng(seed);
  // Flat list of syllables with where they sit.
  const syl = [];
  words.forEach((w, wi) => { for (let s = 0; s < w.syllables; s++) syl.push({ wi, s, last: s === w.syllables - 1, pause: s === w.syllables - 1 ? w.pause : 0 }); });
  const n = syl.length;
  const degs = new Array(n).fill(0), beats = new Array(n).fill(0.5);
  let chordRoot = new Array(n).fill(0);

  // Phrases end where the text pauses.
  const phrases = []; let start = 0;
  syl.forEach((s, i) => { if (s.pause || i === n - 1) { phrases.push([start, i]); start = i + 1; } });

  if (style === 'psalmTone' || style === 'rectoTono') {
    // Two halves, split at the strongest pause nearest the middle (the
    // asterisk in a pointed psalm). The flex (,) gets a small drop.
    let mid = -1, best = 1e9;
    syl.forEach((s, i) => { if (s.pause && i < n - 1) { const d = Math.abs(i - n / 2) - (s.pause === 2 ? n / 4 : 0); if (d < best) { best = d; mid = i; } } });
    if (mid < 0) mid = Math.max(0, Math.floor(n / 2) - 1);
    const tenor = pick(r, [4, 4, 2, 5]);             // reciting note: 5th, 3rd or 6th
    degs.fill(tenor);
    if (style === 'psalmTone') {
      // Intonation: start below and climb to the tenor.
      const into = pick(r, [[tenor - 2, tenor - 1], [tenor - 3, tenor - 1], [tenor - 1]]);
      into.forEach((d, i) => { if (i < mid) degs[i] = d; });
      // Mediant cadence at the middle, final cadence falling to the tonic.
      const med = pick(r, [[tenor + 1, tenor], [tenor - 1, tenor], [tenor, tenor - 1, tenor]]);
      med.forEach((d, i) => { const at = mid - med.length + 1 + i; if (at > 1) degs[at] = d; });
      // Termination: the last 3 or 4 syllables step down to the tonic,
      // e.g. 3 2 1 0 (the tenor leaps to the first of them).
      const k = Math.min(pick(r, [3, 4]), n - mid - 1, tenor);
      for (let i = 0; i < k; i++) degs[n - k + i] = k - 1 - i;
    } else {
      degs.fill(tenor);
      degs[mid] = tenor - 1; degs[n - 1] = tenor - 1;   // drop a step at each half's end
      if (pick(r, [0, 1])) degs[n - 1] = tenor - 2;
    }
    // Free speech rhythm: even syllables, a longer note before each pause.
    syl.forEach((s, i) => { beats[i] = s.pause === 2 || i === n - 1 ? 1.5 : s.pause ? 1 : 0.5; });
    chordRoot.fill(0);
  } else if (style === 'hymn') {
    const prog = progression(key, r);
    // Rhythm: quarter notes with some pairs of eighths.
    syl.forEach((s, i) => { beats[i] = s.pause ? 2 : r() < 0.3 ? 0.5 : 1; });
    let t = 0, d = pick(r, [2, 4]);
    for (let i = 0; i < n; i++) {
      const chord = prog[Math.floor(t / 4) % prog.length];
      chordRoot[i] = chord;
      const tones = triad(chord).flatMap(x => [x, x - 7, x + 7]);
      const strong = t % 1 === 0;
      if (syl[i].pause) d = nearest(tones, d);                // land on the chord
      else if (strong && r() < 0.6) d = nearest(tones, d + pick(r, [-1, 1]));
      else d += pick(r, [-1, 1, 1, -1, 2, -2]);
      d = Math.max(-2, Math.min(9, d));
      degs[i] = d; t += beats[i];
    }
    degs[n - 1] = nearest([0, 7], degs[n - 1]);
  } else if (style === 'kraftwerk') {
    const motif = pick(r, [[0, 2, 4, 2], [0, 0, 4, 7], [0, 4, 2, 4], [4, 2, 0, 2], [0, 7, 4, 2]]);
    const lift = pick(r, [0, 3, 5]);
    let p = 0;
    phrases.forEach(([a, b], k) => {
      for (let i = a; i <= b; i++) { degs[i] = motif[p++ % motif.length] + (k % 2 ? lift : 0); beats[i] = 0.5; }
      beats[b] = 1; degs[b] = k % 2 ? lift : 0;
    });
    chordRoot = degs.map(() => 0);
  } else if (style === 'lament') {
    const top = pick(r, [4, 5, 7]);
    phrases.forEach(([a, b]) => {
      const len = b - a + 1;
      for (let i = a; i <= b; i++) {
        degs[i] = Math.round(top - (top * (i - a)) / Math.max(1, len - 1));
        beats[i] = (i - a) % 2 ? 0.5 : 1;                 // long-short
      }
      beats[b] = 2;
    });
    chordRoot = degs.map(d => (d >= 4 ? 4 : 0));
  } else if (style === 'arpeggio') {
    const prog = progression(key, r);
    const shape = pick(r, [[0, 1, 2, 3, 2, 1], [0, 1, 2, 1], [0, 2, 1, 3]]);
    let t = 0;
    for (let i = 0; i < n; i++) {
      const chord = prog[Math.floor(t / 4) % prog.length];
      const tones = [...triad(chord), chord + 7];
      degs[i] = tones[shape[i % shape.length]];
      beats[i] = syl[i].pause ? 1 : 0.5; chordRoot[i] = chord; t += beats[i];
    }
  } else throw new Error('Unknown style ' + style);

  // Harmony voices for each note.
  const harm = (d, root) => {
    switch (harmony) {
      case 'organum': return [degToMidi(key, d) - 7];        // parallel fifth below
      case 'octave': return [degToMidi(key, d) - 12];
      case 'thirds': return [degToMidi(key, d - 2)];         // a third below, in the scale
      case 'choir': return triad(root).map(x => degToMidi(key, x - 7)).filter(m => m !== degToMidi(key, d));
      case 'drone': return [key.tonic - 12, key.tonic - 5];  // tonic and fifth, held
      default: return [];
    }
  };

  const notes = [];
  syl.forEach((s, i) => {
    notes.push({ word: s.wi, syllable: s.s, midi: degToMidi(key, degs[i]), beats: beats[i], chord: harm(degs[i], chordRoot[i]) });
    if (s.pause && i < n - 1) notes.push({ rest: true, beats: s.pause === 2 ? 1 : 0.5 });
  });
  return { notes, words, key };
}

function nearest(list, d) { return list.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a)); }

// "In(B3) the(C#4) be-gin-ning(D4 E4 D4)..." for showing the tune on screen.
export function describe({ notes, words }) {
  const parts = []; let cur = null;
  for (const n of notes) {
    if (n.rest) { parts.push('·'); cur = null; continue; }
    if (!cur || cur.word !== n.word) { cur = { word: n.word, notes: [] }; parts.push(cur); }
    cur.notes.push(midiName(n.midi));
  }
  return parts.map(p => (p === '·' ? '/' : `${words[p.word].text}(${p.notes.join(' ')})`)).join(' ');
}
