// Vox Machina singing: the vocoder.
//
// How it sings:
//   1. melody.js gives one note per syllable.
//   2. eSpeak speaks each word on a flat pitch, at whatever speed makes the
//      word last as long as its notes. These words are laid on a timeline:
//      this is the "modulator", the shape of the words.
//   3. A synthesizer plays the notes (bright sawtooth waves, plus any
//      harmony): the "carrier", the pitch.
//   4. A channel vocoder splits both into frequency bands, measures how loud
//      each band of the speech is from moment to moment, and lets the synth
//      through each band only that loudly. Out comes the synth, speaking the
//      words, exactly on the notes. Still no recorded human voice: the
//      speech is eSpeak's rule-based formant synthesis.
//
// The result goes through the same effects chain as speech (engine.render).

import { speak } from './engine.js';
import { makeMelody, midiToHz } from './melody.js';

const SR = 44100;

export async function sing(text, s, onProgress = () => {}) {
  const tune = makeMelody(text, { key: s.key, style: s.style, seed: s.seed, octave: s.octave,
    harmony: s.harmony, melisma: s.melisma || 0,
    // The Voice sliders, as they apply to singing:
    transpose: Math.round(((s.pitch ?? 50) - 50) / 50 * 12),   // Pitch: up to an octave either way
    range: (s.pitchRange ?? 50) / 50 });                        // Pitch range: 0 = one note, 2 = twice as wide
  const spb = 60 / s.bpm;                                  // seconds per beat
  // Vowel length above 100% lengthens every note (to double at 200%),
  // rounded to a twelfth of a beat so the clip stays on the grid.
  const stretch = Math.max(1, s.sustain);
  const hold = Math.min(1, s.sustain);

  // --- Two clocks. "Speech time" is how long the words take to say;
  // "sung time" is how long the notes last. They differ when vowels are
  // stretched or carried over a run. Each syllable is one segment on both
  // clocks; rests are the same length on both. ---
  const segs = [], events = [];
  let sc = 0, tc = 0;                                     // cursors, in seconds
  for (let i = 0; i < tune.notes.length;) {
    const n = tune.notes[i];
    if (n.rest) { const d = n.beats * spb; segs.push({ rest: true, s0: sc, s1: sc + d, t0: tc, t1: tc + d }); sc += d; tc += d; i++; continue; }
    const seg = { word: n.word, s0: sc, t0: tc, notes: [] };
    // Gather this syllable's notes: its own note and any run after it.
    for (; i < tune.notes.length && !tune.notes[i].rest && tune.notes[i].word === n.word && tune.notes[i].syllable === n.syllable; i++) {
      const m = tune.notes[i], sung = Math.max(1 / 12, Math.round(m.beats * stretch * 12) / 12) * spb;
      const e = { ...m, start: tc, end: tc + sung };
      events.push(e); seg.notes.push(e);
      sc += m.spoken * spb; tc += sung;
    }
    seg.s1 = sc; seg.t1 = tc; segs.push(seg);
  }
  const speechLen = Math.ceil((sc + 0.6) * SR), len = Math.ceil((tc + 0.3) * SR);

  // --- Modulator: each word spoken by eSpeak, fitted to its speech time. ---
  const mod = new Float32Array(speechLen);
  for (let wi = 0; wi < tune.words.length; wi++) {
    const ws = segs.filter(g => !g.rest && g.word === wi);
    if (!ws.length) continue;
    const start = ws[0].s0, target = ws[ws.length - 1].s1 - start;
    onProgress(`Speaking word ${wi + 1} of ${tune.words.length}…`);
    const w = await fitWord(tune.words[wi].text, target, s);
    const k = SR / w.rate, at = Math.floor(start * SR);
    const n = Math.min(Math.floor(w.samples.length * k), speechLen - at);
    for (let i = 0; i < n; i++) {                           // linear resample to 44.1 kHz
      const x = i / k, j = Math.floor(x), f = x - j;
      mod[at + i] += (w.samples[j] || 0) * (1 - f) + (w.samples[j + 1] || 0) * f;
    }
  }

  // --- Carrier: the notes on sawtooth oscillators, in sung time. ---
  onProgress('Playing the notes…');
  const car = carrier(events, len, s);

  // --- Vocoder: reads the speech through the time map below. ---
  onProgress('Vocoding…');
  const out = vocode(mod, car, segs, len, hold);

  // Word gap: silence the end of each word's last note, so the words come
  // out separated (detached, staccato). 10 ms per step, as in speech mode,
  // but never more than 60% of the note.
  const gap = (s.wordGap || 0) * 0.01;
  if (gap > 0) segs.forEach((g, i) => {
    const next = segs[i + 1];
    if (g.rest || (next && !next.rest && next.word === g.word)) return;   // not the end of a word
    const t1 = Math.min(len, Math.floor(g.t1 * SR));
    const cut = Math.floor(Math.min(gap, 0.6 * (g.t1 - g.t0)) * SR), fade = Math.floor(0.008 * SR);
    for (let k = 0; k < cut; k++) {
      const i2 = t1 - cut + k; if (i2 < 0) continue;
      out[i2] *= k < fade ? 1 - k / fade : 0;
    }
  });
  return { samples: out, rate: SR, tune };
}

// Build the map from sung time to speech time. Within each syllable: the
// start of the syllable (its consonants, up to the loudest point of the
// vowel) plays at normal speed; then the vowel is frozen for as long as the
// notes need; then the rest of the syllable (closing consonants) plays.
function timeMap(segs, len, whole) {
  const map = new Int32Array(len), frozen = new Uint8Array(len);
  const holds = [];
  for (const g of segs) {
    const s0 = Math.floor(g.s0 * SR), s1 = Math.floor(g.s1 * SR), t0 = Math.floor(g.t0 * SR), t1 = Math.min(len, Math.floor(g.t1 * SR));
    if (g.rest || s1 <= s0) { for (let i = t0; i < t1; i++) map[i] = Math.min(whole.length - 1, s0 + Math.floor((i - t0) * (s1 - s0) / Math.max(1, t1 - t0))); continue; }
    let p = s0; for (let i = s0; i < s1; i++) if (whole[i] > whole[p]) p = i;
    const a = p - s0, r = s1 - p, L = t1 - t0;
    for (let i = t0; i < t1; i++) {
      const x = i - t0;
      if (L >= s1 - s0) {
        if (x < a) map[i] = s0 + x;
        else if (x < L - r) { map[i] = p; frozen[i] = 1; }
        else map[i] = p + (x - (L - r));
      } else map[i] = s0 + Math.floor(x * (s1 - s0) / L);
    }
    // Where each note of a run begins, for a small re-articulation.
    holds.push({ p, from: t0 + Math.min(a, L), to: t1, starts: g.notes.slice(1).map(n => Math.floor(n.start * SR)) });
  }
  return { map, frozen, holds };
}

// Speak one word so that it lasts about `target` seconds. eSpeak's speed is
// in words per minute (80 to 450); we guess, measure, and correct once.
// Speed decides how much of its notes a word takes to say: at the default
// 160 it fills about 90%; faster speech is snappier, leaving the vowel held
// longer; slower fills the whole note.
async function fitWord(word, target, s) {
  const fill = clamp(0.9 * 160 / (s.speed || 160), 0.3, 1);
  const opts = { voice: s.voice, variant: s.variant, pitch: 50, pitchRange: 0, wordGap: 0 };
  const syl = Math.max(1, word.replace(/[^aeiouy]+/gi, ' ').trim().split(' ').length);
  let speed = clamp(175 * (0.1 + 0.2 * syl) / (target * fill), 80, 450);
  let w = await speak(word, { ...opts, speed });
  const got = w.samples.length / w.rate;
  if (Math.abs(got / (target * fill) - 1) > 0.2) {
    const better = clamp(speed * got / (target * fill), 80, 450);
    if (Math.abs(better - speed) > 5) w = await speak(word, { ...opts, speed: better });
  }
  return w;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Band-limited sawtooth (PolyBLEP), so high notes don't fizz with aliasing.
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// The synth: one saw per voice (melody + harmony), with a short glide
// between notes. "Choir" adds two slightly detuned copies of each voice.
function carrier(events, len, s) {
  const out = new Float32Array(len);
  const notes = events.filter(e => !e.rest);
  if (!notes.length) return out;
  const voices = Math.max(1, ...notes.map(n => 1 + n.chord.length));
  const detunes = s.carrierChoir ? [0, -0.08, 0.08] : [0];   // semitones
  const glide = Math.max(0.001, s.glide) * SR;
  for (let v = 0; v < voices; v++) {
    for (const dt of detunes) {
      let phase = (v * 0.37 + dt + 1) % 1, f = null, ni = 0;   // fixed start, so every render is identical
      const gain = (v === 0 ? 1 : 0.6) / detunes.length;
      for (let i = 0; i < len; i++) {
        const time = i / SR;
        while (ni < notes.length - 1 && time >= notes[ni].end) ni++;
        const n = notes[ni];
        const midi = v === 0 ? n.midi : n.chord[v - 1] ?? n.midi;
        const target = midiToHz(midi + dt);
        f = f === null ? target : f + (target - f) / glide;   // portamento
        const inc = f / SR;
        phase += inc; if (phase >= 1) phase -= 1;
        out[i] += (2 * phase - 1 - blep(phase, inc)) * gain;
      }
    }
  }
  return out;
}

// Second-order band-pass filter (RBJ cookbook), run in place.
function bandpass(x, freq, q) {
  const w = 2 * Math.PI * freq / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function bandpass4(x, f, q) { return bandpass(bandpass(x, f, q), f, q); }

// Envelope follower: rectify, then smooth (fast attack, slower release).
function follow(x) {
  const env = new Float32Array(x.length);
  const att = 1 - Math.exp(-1 / (0.004 * SR)), rel = 1 - Math.exp(-1 / (0.025 * SR));
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    e += (a > e ? att : rel) * (a - e); env[i] = e;
  }
  return env;
}

function vocode(mod, car, segs, len, hold) {
  const out = new Float32Array(len);
  const BANDS = 22, lo = 110, hi = 7500, q = 6;
  const whole = follow(mod);
  const { map, frozen, holds } = timeMap(segs, len, whole);
  // White noise stands in for the synth in the top bands, so s, t, sh and f
  // come through as hiss, the way they do in speech.
  let seed = 7;
  const noise = new Float32Array(len).map(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1));
  const dipW = 0.018 * SR, endFade = 0.04 * SR;

  for (let k = 0; k < BANDS; k++) {
    const f = lo * Math.pow(hi / lo, k / (BANDS - 1));
    const envS = follow(bandpass4(mod, f, q));            // in speech time
    const env = new Float32Array(len);
    for (let i = 0; i < len; i++) env[i] = envS[map[i]];   // into sung time
    // Hold the vowel: from its loudest point to the end of the syllable keep
    // each band near that level ("Vowel length"), easing off slightly, with a
    // short dip where each note of a run begins so the run is heard.
    if (hold > 0) for (const h of holds) {
      const level = envS[h.p] * hold;
      for (let i = h.from; i < h.to; i++) {
        let v = level * Math.min(1, (h.to - i) / endFade) * (1 - 0.2 * (i - h.from) / Math.max(1, h.to - h.from));
        for (const st of h.starts) { const d = (i - st) / dipW; if (d > -1.5 && d < 1.5) v *= 1 - 0.4 * Math.exp(-d * d * 3); }
        if (env[i] < v) env[i] = v;
      }
    }
    const hiss = f > 3500 ? Math.min(1, (f - 3500) / 3000) : 0;
    const cb = bandpass4(car, f, q), nb = hiss ? bandpass4(noise, f, q) : null;
    for (let i = 0; i < len; i++) out[i] += env[i] * (cb[i] * (1 - hiss) * 6 + (nb ? nb[i] * hiss * 3 : 0));
  }
  // A little of the speech's own top end, for crisp consonants (not while a
  // vowel is frozen, where it would just be a stuck sample).
  const top = bandpass(bandpass(mod, 6000, 0.7), 6000, 0.7);
  for (let i = 0; i < len; i++) if (!frozen[i]) out[i] += top[map[i]] * 0.4;
  return out;
}
