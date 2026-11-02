// Vox Machina audio engine.
//
// Two stages:
//   1. speak()  - eSpeak NG (rule-based formant synthesis, compiled to WebAssembly)
//                 turns text into raw mono samples at 22,050 Hz.
//   2. render() - the effects chain runs in an OfflineAudioContext at 44,100 Hz.
//                 Preview plays the rendered buffer, and the WAV is made from that
//                 same buffer, so what you hear is exactly what you export.
//
// No recorded human voice is used anywhere. eSpeak NG builds its sound from
// rules and formant tables, not from recordings.

import ESpeakNG from './lib/espeak-ng.js';

export const SAMPLE_RATE = 44100;

// ---------------------------------------------------------------------------
// Stage 1: eSpeak NG
// ---------------------------------------------------------------------------

// The .wasm file is about 18 MB because the eSpeak voice data is embedded in
// it. We fetch and compile it once, then make a fresh, cheap instance of it
// for each phrase (the build is the eSpeak command-line program, so each
// instance runs "main" once and then is thrown away).
let compiledWasm = null;
async function loadWasm() {
  if (!compiledWasm) {
    const url = new URL('./lib/espeak-ng.wasm', import.meta.url);
    const bytes = await (await fetch(url)).arrayBuffer();
    compiledWasm = await WebAssembly.compile(bytes);
  }
  return compiledWasm;
}
export const preload = loadWasm;

// Run eSpeak NG on one piece of text. Returns { samples: Float32Array, rate }.
// voice: e.g. "en-us" ; variant: e.g. "m3", "croak", "" for none.
export async function speak(text, { voice = 'en-us', variant = '', pitch = 50,
  speed = 160, wordGap = 0, pitchRange = 50 } = {}) {
  const wasm = await loadWasm();
  const v = variant ? `${voice}+${variant}` : voice;
  const mod = await ESpeakNG({
    // Reuse the compiled module instead of re-downloading/re-compiling it.
    instantiateWasm(imports, done) {
      WebAssembly.instantiate(wasm, imports).then(inst => done(inst, wasm));
      return {};
    },
    // The text is written to a file first (preRun) so it is never parsed as a
    // command-line option, whatever it contains.
    preRun: [m => m.FS.writeFile('/in.txt', text)],
    arguments: ['-v', v, '-p', String(pitch | 0), '-P', String(pitchRange | 0),
      '-s', String(speed | 0), '-g', String(wordGap | 0),
      '-w', '/out.wav', '-f', '/in.txt'],
    print: () => {}, printErr: () => {},
  });
  return parseWav(mod.FS.readFile('/out.wav'));
}

// The phonemes eSpeak would say for `text`, in its own letters, one phoneme
// per "_" and one word per space (a line per clause), with ' and , before
// stressed syllables: "b_I_g_'I_n_I_N". Pocket Sampler uses this to find
// syllables and stress.
export async function phonemes(text, { voice = 'en-us' } = {}) {
  const wasm = await loadWasm(), out = [];
  await ESpeakNG({
    instantiateWasm(imports, done) {
      WebAssembly.instantiate(wasm, imports).then(inst => done(inst, wasm));
      return {};
    },
    preRun: [m => m.FS.writeFile('/in.txt', text)],
    arguments: ['-q', '-x', '--sep=_', '-v', voice, '-f', '/in.txt'],
    print: line => out.push(line), printErr: () => {},
  });
  return out.join('\n');
}

// Minimal reader for the 16-bit PCM WAV that eSpeak writes.
function parseWav(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let rate = 22050, pos = 12, data = null;
  while (pos + 8 <= dv.byteLength) {
    const id = String.fromCharCode(...bytes.subarray(pos, pos + 4));
    let size = dv.getUint32(pos + 4, true);
    if (id === 'fmt ') rate = dv.getUint32(pos + 12, true);
    if (id === 'data') {
      // eSpeak writing to a file can leave the size field unset; clamp it.
      size = Math.min(size, dv.byteLength - pos - 8);
      data = new Float32Array(size >> 1);
      for (let i = 0; i < data.length; i++) data[i] = dv.getInt16(pos + 8 + i * 2, true) / 32768;
      break;
    }
    pos += 8 + size + (size & 1);
  }
  if (!data || !data.length) throw new Error('eSpeak produced no audio');
  return { samples: trimSilence(data), rate };
}

function trimSilence(d, thr = 0.003) {
  let a = 0, b = d.length - 1;
  while (a < b && Math.abs(d[a]) < thr) a++;
  while (b > a && Math.abs(d[b]) < thr) b--;
  return d.slice(Math.max(0, a - 50), Math.min(d.length, b + 200));
}

// ---------------------------------------------------------------------------
// Stage 2: effects
// ---------------------------------------------------------------------------

// The "robot amount" master knob scales every effect at once:
// at 0 the voice is plain eSpeak; at 1 each effect is at its own slider value.
function effective(fx) {
  const r = fx.robot;
  return {
    bits: 16 - (16 - fx.bits) * r,                 // 16 = no crush
    crushRate: 1 + (fx.crushRate - 1) * r,         // sample-and-hold factor
    ringFreq: fx.ringFreq,
    ringMix: fx.ringMix * r,
    choirMix: fx.choirMix * r,
    choirVoices: fx.choirVoices,
    delayTime: fx.delayTime,
    delayFeedback: fx.delayFeedback,
    delayMix: fx.delayMix * r,
    reverbSize: fx.reverbSize,
    reverbMix: fx.reverbMix * r,
    bpm: fx.bpm || 120,
    wobbleBeats: WOBBLE_STEPS[fx.wobbleRate | 0] ?? 0.5,
    wobbleDepth: (fx.wobbleDepth || 0) * r,
    gateBeats: GATE_STEPS[fx.gateRate | 0] ?? 0.25,
    gateDepth: (fx.gateDepth || 0) * r,
  };
}

// Tempo-synced effects. Their rate sliders pick one of these note lengths
// (in beats): 2 = half note, 1 = quarter, 1/3 = eighth-note triplet ...
export const WOBBLE_STEPS = [2, 1, 0.75, 0.5, 1 / 3, 0.25];
export const GATE_STEPS = [1, 0.5, 1 / 3, 0.25, 0.125];

// Render the whole chain. Returns a mono AudioBuffer at 44.1 kHz.
export async function render(voice, fxIn) {
  const fx = effective(fxIn);

  // --- Pass A: choir/chorus and ring modulator (Web Audio graph) ---
  const lenA = Math.ceil(voice.samples.length / voice.rate * SAMPLE_RATE * 1.03 + SAMPLE_RATE * 0.1);  // room for detuned choir copies
  const ctxA = new OfflineAudioContext(1, lenA, SAMPLE_RATE);
  const src = ctxA.createBuffer(1, voice.samples.length, voice.rate);
  src.copyToChannel(voice.samples, 0);

  const sum = ctxA.createGain();           // everything after the choir
  // Dry voice
  const dry = ctxA.createBufferSource(); dry.buffer = src;
  dry.connect(sum);
  // Choir: extra copies of the voice, each slightly detuned and wobbled by a
  // slow LFO on a short delay (classic chorus). The small detune makes the
  // copies drift a few milliseconds apart, like singers who aren't quite together.
  if (fx.choirMix > 0.001) {
    const n = Math.max(1, fx.choirVoices | 0);
    for (let i = 0; i < n; i++) {
      const s = ctxA.createBufferSource(); s.buffer = src;
      const spread = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;   // -1 .. 1
      s.playbackRate.value = 1 + spread * 0.012;
      const d = ctxA.createDelay(0.1); d.delayTime.value = 0.012 + 0.008 * i;
      const lfo = ctxA.createOscillator(); lfo.frequency.value = 0.4 + 0.37 * i;
      const depth = ctxA.createGain(); depth.gain.value = 0.004;
      lfo.connect(depth).connect(d.delayTime); lfo.start();
      const g = ctxA.createGain(); g.gain.value = fx.choirMix / Math.sqrt(n);
      s.connect(d).connect(g).connect(sum); s.start();
    }
  }
  dry.start();

  // Ring modulator: multiply the signal by a sine wave. A GainNode whose gain
  // is driven by an oscillator does exactly that.
  const out = ctxA.createGain();
  const ring = ctxA.createGain(); ring.gain.value = 0;
  const carrier = ctxA.createOscillator(); carrier.frequency.value = fx.ringFreq;
  carrier.connect(ring.gain); carrier.start();
  const ringWet = ctxA.createGain(); ringWet.gain.value = fx.ringMix;
  const ringDry = ctxA.createGain(); ringDry.gain.value = 1 - fx.ringMix;
  sum.connect(ring).connect(ringWet).connect(out);
  sum.connect(ringDry).connect(out);
  // Wobble: a resonant low-pass filter swept up and down in time with the
  // tempo (the dubstep "wub"). Gate: the volume chopped on and off in time
  // (the trance/techno stutter). Both are drawn as curves from time zero,
  // so they always line up with the beat of a sung clip.
  let chain = out;
  const dur = lenA / SAMPLE_RATE, pts = Math.ceil(dur * 400);
  if (fx.wobbleDepth > 0.001) {
    const lp = ctxA.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
    const curve = new Float32Array(pts), cyc = 60 / fx.bpm * fx.wobbleBeats;
    for (let i = 0; i < pts; i++) {
      const ph = (i / pts * dur / cyc) % 1;
      curve[i] = 180 * Math.pow(2, 6 * fx.wobbleDepth * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph))) + 8000 * (1 - fx.wobbleDepth);
    }
    lp.frequency.setValueCurveAtTime(curve, 0, dur);
    chain.connect(lp); chain = lp;
  }
  if (fx.gateDepth > 0.001) {
    const g = ctxA.createGain();
    const curve = new Float32Array(pts), step = 60 / fx.bpm * fx.gateBeats;
    for (let i = 0; i < pts; i++) {
      const ph = (i / pts * dur / step) % 1;
      curve[i] = ph < 0.55 ? 1 : 1 - fx.gateDepth;                // on for the first half of each step
    }
    g.gain.setValueCurveAtTime(curve, 0, dur);
    chain.connect(g); chain = g;
  }
  chain.connect(ctxA.destination);
  const a = await ctxA.startRendering();

  // --- Pass B: bitcrusher (plain JavaScript, sample by sample) ---
  const x = a.getChannelData(0);
  normalize(x, 0.9);
  bitcrush(x, fx.bits, fx.crushRate);

  // --- Pass C: delay and reverb (Web Audio graph) ---
  const tail = (fx.delayMix > 0.001 ? fx.delayTime * 6 : 0) + (fx.reverbMix > 0.001 ? fx.reverbSize : 0);
  const lenC = x.length + Math.ceil(Math.min(tail, 8) * SAMPLE_RATE);
  const ctxC = new OfflineAudioContext(1, lenC, SAMPLE_RATE);
  const bufC = ctxC.createBuffer(1, x.length, SAMPLE_RATE); bufC.copyToChannel(x, 0);
  const s = ctxC.createBufferSource(); s.buffer = bufC;
  s.connect(ctxC.destination);              // dry
  if (fx.delayMix > 0.001) {
    const d = ctxC.createDelay(2); d.delayTime.value = fx.delayTime;
    const fb = ctxC.createGain(); fb.gain.value = fx.delayFeedback;
    const wet = ctxC.createGain(); wet.gain.value = fx.delayMix;
    s.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(ctxC.destination);
  }
  if (fx.reverbMix > 0.001) {
    const conv = ctxC.createConvolver();
    conv.buffer = impulse(ctxC, fx.reverbSize);
    const wet = ctxC.createGain(); wet.gain.value = fx.reverbMix;
    s.connect(conv).connect(wet).connect(ctxC.destination);
  }
  s.start();
  const c = await ctxC.startRendering();
  const y = c.getChannelData(0);
  normalize(y, 0.89);                       // about -1 dBFS peak
  return c;
}

// Reduce bit depth and sample rate. bits: 1..16, factor: hold each sample
// for this many samples (fractional values are allowed).
function bitcrush(x, bits, factor) {
  const levels = Math.pow(2, bits - 1);
  let hold = 0, phase = 1;
  for (let i = 0; i < x.length; i++) {
    phase += 1;
    if (phase >= factor) { phase -= factor; hold = x[i]; }
    x[i] = bits >= 15.99 ? hold : Math.round(hold * levels) / levels;
  }
}

function normalize(x, target) {
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  if (peak > 0) { const k = target / peak; for (let i = 0; i < x.length; i++) x[i] *= k; }
}

// A synthetic reverb impulse: decaying noise. A fixed seed means the same
// settings always give the same file.
function impulse(ctx, seconds) {
  const len = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  const b = ctx.createBuffer(1, len, SAMPLE_RATE);
  const d = b.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    d[i] = noise * Math.pow(1 - i / len, 3) * 0.3;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Vowel length for speech: stretch only the vowels, keep the pitch
// ---------------------------------------------------------------------------
// eSpeak has no vowel-length control, so we stretch its output afterwards.
// 1. Find the vowels: 10 ms frames that are loud and smooth (a low
//    zero-crossing rate means voiced, not hiss like s or sh).
// 2. Time-stretch with WSOLA (waveform-similarity overlap-add): read short
//    overlapping windows from the input, moving through vowels more slowly,
//    and nudge each read to where the waveform lines up with the last one,
//    so the pitch doesn't change and there are no clicks.
// factor: 1 = unchanged, 2 = vowels twice as long.
export function stretchVowels({ samples: x, rate }, factor) {
  if (!(factor > 1.01)) return { samples: x, rate };
  const F = Math.round(rate * 0.01), frames = Math.ceil(x.length / F);
  const rms = new Float32Array(frames), zcr = new Float32Array(frames);
  let peak = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0, z = 0;
    for (let i = f * F + 1; i < Math.min(x.length, (f + 1) * F); i++) { e += x[i] * x[i]; if ((x[i] >= 0) !== (x[i - 1] >= 0)) z++; }
    rms[f] = Math.sqrt(e / F); zcr[f] = z / F; peak = Math.max(peak, rms[f]);
  }
  // How fast to move through the input at each frame (1 = normal speed),
  // smoothed so the change in speed is gradual.
  const speed = new Float32Array(frames);
  for (let f = 0; f < frames; f++) speed[f] = rms[f] > 0.08 * peak && zcr[f] < 0.16 ? 1 / factor : 1;
  for (let pass = 0; pass < 2; pass++) for (let f = 1; f < frames - 1; f++) speed[f] = (speed[f - 1] + speed[f] + speed[f + 1]) / 3;

  const N = Math.round(rate * 0.03), H = N >> 1, tol = Math.round(rate * 0.008);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const out = new Float32Array(Math.ceil(x.length * factor) + N * 2), norm = new Float32Array(out.length);
  let inPos = 0, prev = 0, o = 0;
  while (inPos + N + tol < x.length && o + N < out.length) {
    // Find the read point near inPos that best continues the previous window.
    let best = Math.round(inPos), bestScore = -Infinity;
    if (o > 0) for (let d = -tol; d <= tol; d += 2) {
      const c = Math.round(inPos) + d; if (c < 0) continue;
      let sc = 0; for (let i = 0; i < H; i += 2) sc += x[c + i] * x[prev + H + i];
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    for (let i = 0; i < N; i++) { out[o + i] += x[best + i] * win[i]; norm[o + i] += win[i]; }
    prev = best; o += H;
    inPos += H * speed[Math.min(frames - 1, Math.floor(inPos / F))];
  }
  for (let i = 0; i < o + N && i < out.length; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return { samples: out.subarray(0, Math.min(out.length, o + H)), rate };
}

// ---------------------------------------------------------------------------
// WAV export: 44.1 kHz, 16-bit, mono PCM
// ---------------------------------------------------------------------------
export function toWav(buffer) {
  const x = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + x.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + x.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);          // PCM
  out.setUint16(22, 1, true);          // mono
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);   // byte rate
  out.setUint16(32, 2, true);          // block align
  out.setUint16(34, 16, true);         // bits per sample
  str(36, 'data'); out.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-1, Math.min(1, x[i]));
    out.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
