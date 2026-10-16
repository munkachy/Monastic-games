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
  const tune = makeMelody(text, { key: s.key, style: s.style, seed: s.seed, octave: s.octave, harmony: s.harmony });
  const spb = 60 / s.bpm;                                  // seconds per beat

  // --- Lay out time: when each note starts and ends. ---
  let t = 0.05;
  const events = tune.notes.map(n => { const e = { ...n, start: t, end: t + n.beats * spb }; t = e.end; return e; });
  const total = t + 0.3;
  const len = Math.ceil(total * SR);

  // --- Modulator: each word spoken by eSpeak, fitted to its notes. ---
  const mod = new Float32Array(len);
  for (let wi = 0; wi < tune.words.length; wi++) {
    const notes = events.filter(e => !e.rest && e.word === wi);
    if (!notes.length) continue;
    const start = notes[0].start, target = notes[notes.length - 1].end - start;
    onProgress(`Speaking word ${wi + 1} of ${tune.words.length}…`);
    const w = await fitWord(tune.words[wi].text, target, s);
    const k = SR / w.rate;
    const n = Math.min(Math.floor(w.samples.length * k), len - Math.floor(start * SR));
    const at = Math.floor(start * SR);
    for (let i = 0; i < n; i++) {                           // linear resample to 44.1 kHz
      const x = i / k, j = Math.floor(x), f = x - j;
      const v = (w.samples[j] || 0) * (1 - f) + (w.samples[j + 1] || 0) * f;
      mod[at + i] += v;
    }
  }

  // --- Carrier: the notes on sawtooth oscillators. ---
  onProgress('Playing the notes…');
  const car = carrier(events, len, s);

  // --- Vocoder ---
  onProgress('Vocoding…');
  const out = vocode(mod, car, events, s);
  return { samples: out, rate: SR, tune };
}

// Speak one word so that it lasts about `target` seconds. eSpeak's speed is
// in words per minute (80 to 450); we guess, measure, and correct once.
async function fitWord(word, target, s) {
  const opts = { voice: s.voice, variant: s.variant, pitch: 50, pitchRange: 0, wordGap: 0 };
  const syl = Math.max(1, word.replace(/[^aeiouy]+/gi, ' ').trim().split(' ').length);
  let speed = clamp(175 * (0.1 + 0.2 * syl) / (target * 0.9), 80, 450);
  let w = await speak(word, { ...opts, speed });
  const got = w.samples.length / w.rate;
  if (Math.abs(got / (target * 0.9) - 1) > 0.2) {
    const better = clamp(speed * got / (target * 0.9), 80, 450);
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

function vocode(mod, car, events, s) {
  const len = mod.length, out = new Float32Array(len);
  const BANDS = 22, lo = 110, hi = 7500, q = 6;
  // Sung vowels hold: for each note, find where the speech is loudest and
  // keep each band at least near that level until the note ends ("sustain").
  const whole = follow(mod);
  const holds = events.filter(e => !e.rest).map(e => {
    const a = Math.floor(e.start * SR), b = Math.min(len, Math.floor(e.end * SR));
    let p = a; for (let i = a; i < b; i++) if (whole[i] > whole[p]) p = i;
    return { p, b };
  });
  // White noise stands in for the synth in the top bands, so s, t, sh and f
  // come through as hiss, the way they do in speech.
  let seed = 7;
  const noise = new Float32Array(len).map(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1));

  for (let k = 0; k < BANDS; k++) {
    const f = lo * Math.pow(hi / lo, k / (BANDS - 1));
    const env = follow(bandpass4(mod, f, q));
    if (s.sustain > 0) for (const { p, b } of holds) {
      const level = env[p] * s.sustain, endFade = Math.floor(0.04 * SR);
      for (let i = p; i < b; i++) {
        const fade = Math.min(1, (b - i) / endFade) * (1 - 0.25 * (i - p) / Math.max(1, b - p));
        if (env[i] < level * fade) env[i] = level * fade;
      }
    }
    const hiss = f > 3500 ? Math.min(1, (f - 3500) / 3000) : 0;
    const cb = bandpass4(car, f, q), nb = hiss ? bandpass4(noise, f, q) : null;
    for (let i = 0; i < len; i++) out[i] += env[i] * (cb[i] * (1 - hiss) * 6 + (nb ? nb[i] * hiss * 3 : 0));
  }
  // A little of the speech's own top end, for crisp consonants.
  const top = bandpass(bandpass(mod, 6000, 0.7), 6000, 0.7);
  for (let i = 0; i < len; i++) out[i] += top[i] * 0.4;
  return out;
}
