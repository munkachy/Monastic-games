// Pocket Sampler sound engine.
//
// Everything here works on any BaseAudioContext, so the same code plays live
// (AudioContext) and renders the WAV export (OfflineAudioContext).
//   - Engine: the master chain and the punch-in effects (crush, filters, echo,
//     tape stop).
//   - playNote(): one note of one sound: a synth, a pitched sample, or one
//     slice of a chopped sample.
//   - makeKit(): the 808 and 909 kits, drawn from oscillators and noise.
//   - blessMe(): the random sound button, in the manner of sfxr: a few random
//     numbers decide the wave, its pitch sweep, arpeggio and envelope.
//   - onsets(): finds where each syllable or hit starts, for auto-chopping.

export const SR = 44100;

// ---------------------------------------------------------------------------
// Scales: key 1 is the lowest note, each key goes one step up the scale.
// ---------------------------------------------------------------------------
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], pentatonic: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
export function keySemis(k, scale) {
  const s = SCALES[scale] || SCALES.minor;
  return s[k % s.length] + 12 * Math.floor(k / s.length);
}
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

// ---------------------------------------------------------------------------
// Bit crusher as an AudioWorklet: fewer bits and a held sample rate.
// bits = 16 and hold = 1 pass the sound through unchanged.
// ---------------------------------------------------------------------------
const CRUSH_SRC = `
class Crush extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'bits', defaultValue: 16 }, { name: 'hold', defaultValue: 1 }];
  }
  constructor() { super(); this.n = 0; this.v = 0; }
  process(ins, outs, p) {
    const x = ins[0][0], y = outs[0][0];
    if (!x) return true;
    const q = Math.pow(2, p.bits[0] - 1), hold = Math.max(1, p.hold[0]);
    for (let i = 0; i < y.length; i++) {
      if (++this.n >= hold) { this.n = 0; this.v = Math.round(x[i] * q) / q; }
      y[i] = this.v;
    }
    return true;
  }
}
registerProcessor('crush', Crush);`;

export class Engine {
  // live: true for the speaker (adds the crusher and a tap for resampling).
  constructor(ctx, { live = true } = {}) {
    this.ctx = ctx; this.live = live;
    this.bus = ctx.createGain();
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 6;
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10; this.hp.Q.value = 4;
    this.delay = ctx.createDelay(2); this.fb = ctx.createGain(); this.fb.gain.value = 0.45;
    this.send = ctx.createGain(); this.send.gain.value = 0;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -10; this.comp.ratio.value = 4; this.comp.attack.value = 0.003; this.comp.release.value = 0.15;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.bus.connect(this.lp); this.lp.connect(this.hp);
    this.hp.connect(this.comp); this.hp.connect(this.send);
    this.send.connect(this.delay); this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.comp);
    this.comp.connect(this.master); this.master.connect(ctx.destination);
    this.voices = new Set();       // sounding voices, for choke and tape stop
    this.choke = new Map();        // slot -> its last voice
  }

  // Load the crusher (live only) and put it between the bus and the filters.
  async init() {
    if (!this.live || !this.ctx.audioWorklet) return;
    try {
      const url = URL.createObjectURL(new Blob([CRUSH_SRC], { type: 'application/javascript' }));
      await this.ctx.audioWorklet.addModule(url);
      this.crush = new AudioWorkletNode(this.ctx, 'crush', { outputChannelCount: [1] });
      this.bus.disconnect(); this.bus.connect(this.crush); this.crush.connect(this.lp);
    } catch (e) { console.warn('No bit crusher:', e); }
    this.tap = this.ctx.createMediaStreamDestination?.();
    if (this.tap) this.master.connect(this.tap);
  }

  // Punch-in effects. on = true while the key is held.
  setFx(name, on, stepDur) {
    const t = this.ctx.currentTime, p = (param, v, s = 0.04) => { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, s); };
    switch (name) {
      case 'crush':
        if (this.crush) { this.crush.parameters.get('bits').value = on ? 4 : 16; this.crush.parameters.get('hold').value = on ? 10 : 1; }
        break;
      case 'lowpass': p(this.lp.frequency, on ? 420 : 20000, on ? 0.12 : 0.05); break;
      case 'highpass': p(this.hp.frequency, on ? 1600 : 10, on ? 0.12 : 0.05); break;
      case 'echo':
        this.delay.delayTime.setValueAtTime(Math.min(1.9, stepDur * 3), t);
        p(this.send.gain, on ? 0.7 : 0, 0.02); break;
      case 'tape':
        if (on) {
          for (const v of this.voices) for (const r of v.rates) { r.cancelScheduledValues(t); r.setValueAtTime(r.value, t); r.exponentialRampToValueAtTime(r.value * 0.08, t + 0.7); }
          p(this.master.gain, 0, 0.25);
        } else p(this.master.gain, 0.9, 0.01);
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// One note. slot: a sound (see app.js). k: key 0-15. t: start time.
// mods: { rate: extra speed factor, reverse, unison }
// ---------------------------------------------------------------------------
const reversed = new WeakMap();
function reverseOf(ctx, buf) {
  let r = reversed.get(buf);
  if (!r) {
    r = ctx.createBuffer(1, buf.length, buf.sampleRate);
    const x = buf.getChannelData(0), y = r.getChannelData(0), n = x.length;
    for (let i = 0; i < n; i++) y[i] = x[n - 1 - i];
    reversed.set(buf, r);
  }
  return r;
}

export function playNote(eng, slot, si, k, t, { rate = 1, reverse = false, unison = false, scale = 'minor', bpm = 120, root = 0 } = {}) {
  const ctx = eng.ctx, P = slot.params;
  if (P.choke && eng.choke.has(si)) eng.choke.get(si).stop(t);
  const out = ctx.createGain(); out.gain.value = P.vol;
  let dest = out;
  if (P.tone < 0.99) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = 120 * Math.pow(160, P.tone); f.Q.value = 1;
    f.connect(out); dest = f;
  }
  out.connect(eng.bus);
  const voice = { rates: [], nodes: [], end: t, stop: null };
  const env = ctx.createGain(); env.connect(dest);

  if (slot.kind === 'synth') {
    const semis = keySemis(k, scale) + P.pitch + root;
    synthNote(ctx, env, slot.synth, hz(slot.synth.root + semis) * rate, t, 0.05 + P.len * 2, bpm, voice);
    if (unison) synthNote(ctx, env, slot.synth, hz(slot.synth.root + semis + 0.15) * rate, t + 0.012, 0.05 + P.len * 2, bpm, voice);
  } else {
    let buf, s, e, r;
    if (slot.kind === 'chop') {
      const sl = slot.slices[k]; if (!sl) return null;
      buf = sl.buf || slot.buf; s = sl.s; e = sl.e;
      r = Math.pow(2, P.pitch / 12) * rate;
    } else {
      buf = slot.buf; s = 0; e = buf.duration;
      r = Math.pow(2, (keySemis(k, scale) - 12 + P.pitch + root) / 12) * rate;
    }
    if (!buf) return null;
    const dur = Math.max(0.01, (e - s) * P.len);
    if (reverse) { const rb = reverseOf(ctx, buf); [s, e] = [buf.duration - s - dur, buf.duration - s]; buf = rb; }
    const go = (rr, delay) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rr;
      src.connect(env); src.start(t + delay, Math.max(0, s), dur);
      voice.rates.push(src.playbackRate); voice.nodes.push(src);
    };
    go(r, 0);
    if (unison) go(r * 1.0087, 0.012);
    const real = dur / r;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.003);
    env.gain.setValueAtTime(1, Math.max(t + 0.003, t + real - 0.006));
    env.gain.linearRampToValueAtTime(0, t + real);
    voice.end = t + real + 0.02;
  }

  voice.stop = when => {
    when = Math.max(when, ctx.currentTime);
    env.gain.cancelScheduledValues(when); env.gain.setValueAtTime(env.gain.value, when);
    env.gain.linearRampToValueAtTime(0, when + 0.008);
    for (const n of voice.nodes) try { n.stop(when + 0.01); } catch (e) {}
  };
  eng.voices.add(voice);
  const done = Math.max(0, (voice.end - ctx.currentTime) * 1000 + 100);
  if (eng.live) setTimeout(() => eng.voices.delete(voice), done);
  if (P.choke) eng.choke.set(si, voice);
  return voice;
}

// ---------------------------------------------------------------------------
// Synths for sounds 1-8
// ---------------------------------------------------------------------------
let driveCurve = null;
function drive(ctx, amount) {
  const ws = ctx.createWaveShaper();
  if (!driveCurve) driveCurve = {};
  if (!driveCurve[amount]) {
    const c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    driveCurve[amount] = c;
  }
  ws.curve = driveCurve[amount];
  return ws;
}
function osc(ctx, type, f, t, voice, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.start(t); voice.nodes.push(o); voice.rates.push(o.frequency);
  return o;
}
// Wobble speeds, in beats: 1/2 note, 1/4, 1/8, 1/8 triplet, 1/16
export const WOBBLE_RATES = [[2, '1/2'], [1, '1/4'], [0.5, '1/8'], [1 / 3, '1/8T'], [0.25, '1/16']];

function synthNote(ctx, out, sp, f, t, len, bpm, voice) {
  const amp = ctx.createGain(); amp.connect(out);
  const a = sp.attack || 0.003, end = t + len;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(1, t + a);
  if (sp.hold) { amp.gain.setValueAtTime(1, Math.max(t + a, end - 0.05)); amp.gain.linearRampToValueAtTime(0, end); }
  else { amp.gain.setTargetAtTime(0, t + a, len / 5); }
  voice.end = end + 0.05;
  let into = amp;
  if (sp.drive) { const d = drive(ctx, sp.drive); d.connect(amp); into = d; }
  const filt = () => {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = sp.res || 1;
    fl.frequency.value = sp.cutoff || 2000; fl.connect(into); return fl;
  };
  const stopAll = () => { for (const n of voice.nodes) if (n.stop && !n._stopped) { n.stop(end + 0.1); n._stopped = true; } };

  switch (sp.type) {
    case 'sub': {          // 808 bass: a sine that falls into its note, with drive
      const o = osc(ctx, 'sine', f, t, voice);
      o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      o.connect(into); break;
    }
    case 'wobble': {       // dubstep: detuned saws through a filter an LFO opens and shuts
      const fl = filt();
      osc(ctx, 'sawtooth', f, t, voice, -9).connect(fl);
      osc(ctx, 'sawtooth', f, t, voice, 9).connect(fl);
      osc(ctx, 'square', f / 2, t, voice).connect(fl);
      const lfo = ctx.createOscillator(); lfo.type = 'triangle';
      lfo.frequency.value = bpm / 60 / (WOBBLE_RATES[sp.rate ?? 2][0]);
      const depth = ctx.createGain(); depth.gain.value = sp.depth || 1800;
      lfo.connect(depth); depth.connect(fl.frequency); lfo.start(t); voice.nodes.push(lfo);
      break;
    }
    case 'acid': {         // a saw through a squelchy filter that snaps shut
      const fl = filt();
      fl.frequency.setValueAtTime(sp.cutoff * 10, t); fl.frequency.exponentialRampToValueAtTime(sp.cutoff, t + 0.18);
      osc(ctx, 'sawtooth', f, t, voice).connect(fl); break;
    }
    case 'reese': {        // two saws beating against each other
      const fl = filt();
      osc(ctx, 'sawtooth', f, t, voice, -14).connect(fl);
      osc(ctx, 'sawtooth', f, t, voice, 14).connect(fl);
      osc(ctx, 'sine', f / 2, t, voice).connect(into); break;
    }
    case 'chip': {         // a square wave with a quick pitch blip, like an NES lead
      const o = osc(ctx, 'square', f, t, voice);
      o.frequency.setValueAtTime(f * 2, t); o.frequency.setValueAtTime(f, t + 0.025);
      const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g); g.connect(into); break;
    }
    case 'pluck': {
      const fl = filt();
      fl.frequency.setValueAtTime(sp.cutoff * 8, t); fl.frequency.exponentialRampToValueAtTime(sp.cutoff, t + 0.12);
      osc(ctx, 'sawtooth', f, t, voice).connect(fl);
      osc(ctx, 'triangle', f * 2, t, voice).connect(fl); break;
    }
    case 'organ': {
      [[1, 0.5], [2, 0.3], [3, 0.15], [4, 0.1]].forEach(([h, g]) => {
        const gg = ctx.createGain(); gg.gain.value = g; gg.connect(into);
        osc(ctx, 'sine', f * h, t, voice).connect(gg);
      });
      break;
    }
    case 'choir': {        // "aah": buzzing saws through three vowel formants
      const mix = ctx.createGain(); mix.gain.value = 0.9;
      for (const d of [-12, 0, 11]) osc(ctx, 'sawtooth', f, t, voice, d).connect(mix);
      [[730, 1], [1090, 0.5], [2440, 0.25]].forEach(([fq, g]) => {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 9;
        const gg = ctx.createGain(); gg.gain.value = g * 3; mix.connect(bp); bp.connect(gg); gg.connect(into);
      });
      break;
    }
  }
  stopAll();
}

// ---------------------------------------------------------------------------
// Drum kits (sounds 9-10): each drum is drawn once into its own short buffer.
// A drum is up to three layers: a tone with a pitch drop, filtered noise, and
// "metal" (six square waves at clashing pitches, as on the 808's cymbals).
// ---------------------------------------------------------------------------
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
const KITS = {
  '808': [
    ['Kick', { len: 0.9, tone: { f0: 160, f1: 46, sweep: 0.08, decay: 0.7 }, drive: 2 }],
    ['Boom', { len: 1.8, tone: { f0: 120, f1: 38, sweep: 0.12, decay: 1.6 }, drive: 3 }],
    ['Snare', { len: 0.35, tone: { f0: 240, f1: 180, sweep: 0.05, decay: 0.12, gain: 0.5 }, noise: { type: 'highpass', f: 1800, decay: 0.2, gain: 0.7 } }],
    ['Clap', { len: 0.4, noise: { type: 'bandpass', f: 1100, q: 1.5, decay: 0.25, gain: 1.4, bursts: 3 } }],
    ['Closed hat', { len: 0.12, metal: { f: 9000, decay: 0.04, gain: 0.7 } }],
    ['Open hat', { len: 0.6, metal: { f: 8500, decay: 0.38, gain: 0.6 } }],
    ['Low tom', { len: 0.6, tone: { f0: 130, f1: 90, sweep: 0.3, decay: 0.45 } }],
    ['Mid tom', { len: 0.5, tone: { f0: 190, f1: 140, sweep: 0.3, decay: 0.38 } }],
    ['High tom', { len: 0.45, tone: { f0: 280, f1: 210, sweep: 0.3, decay: 0.3 } }],
    ['Rim', { len: 0.08, tone: { f0: 1700, f1: 1600, sweep: 0.01, decay: 0.025, wave: 'triangle' }, noise: { type: 'highpass', f: 4000, decay: 0.01, gain: 0.4 } }],
    ['Cowbell', { len: 0.4, bell: { f: [540, 800], decay: 0.25 } }],
    ['Cymbal', { len: 1.4, metal: { f: 7000, decay: 1.1, gain: 0.5 } }],
    ['Shaker', { len: 0.15, noise: { type: 'highpass', f: 6000, decay: 0.06, gain: 0.6, attack: 0.02 } }],
    ['Conga', { len: 0.3, tone: { f0: 420, f1: 330, sweep: 0.03, decay: 0.18 } }],
    ['Zap', { len: 0.25, tone: { f0: 3000, f1: 90, sweep: 0.15, decay: 0.15, wave: 'square', gain: 0.4 } }],
    ['Clave', { len: 0.12, tone: { f0: 2500, f1: 2500, sweep: 0.01, decay: 0.04 } }],
  ],
  '909': [
    ['Kick', { len: 0.5, tone: { f0: 240, f1: 52, sweep: 0.04, decay: 0.35 }, noise: { type: 'lowpass', f: 3000, decay: 0.008, gain: 0.6 }, drive: 2.5 }],
    ['Hard kick', { len: 0.5, tone: { f0: 300, f1: 55, sweep: 0.03, decay: 0.3 }, noise: { type: 'bandpass', f: 1500, decay: 0.01, gain: 0.8 }, drive: 6 }],
    ['Snare', { len: 0.35, tone: { f0: 330, f1: 190, sweep: 0.03, decay: 0.1, gain: 0.5 }, noise: { type: 'highpass', f: 1200, decay: 0.22, gain: 0.9 } }],
    ['Clap', { len: 0.45, noise: { type: 'bandpass', f: 1400, q: 1.2, decay: 0.3, gain: 1.4, bursts: 4 } }],
    ['Closed hat', { len: 0.1, noise: { type: 'highpass', f: 8000, decay: 0.035, gain: 0.8 } }],
    ['Open hat', { len: 0.5, noise: { type: 'highpass', f: 7500, decay: 0.3, gain: 0.6 } }],
    ['Ride', { len: 1.5, metal: { f: 5000, decay: 1.2, gain: 0.35 }, noise: { type: 'highpass', f: 9000, decay: 0.8, gain: 0.2 } }],
    ['Crash', { len: 2, noise: { type: 'highpass', f: 4000, decay: 1.5, gain: 0.6 }, metal: { f: 6000, decay: 1.2, gain: 0.3 } }],
    ['Low tom', { len: 0.5, tone: { f0: 160, f1: 100, sweep: 0.15, decay: 0.35 } }],
    ['High tom', { len: 0.4, tone: { f0: 260, f1: 180, sweep: 0.15, decay: 0.28 } }],
    ['Rim', { len: 0.08, tone: { f0: 1200, f1: 1100, sweep: 0.01, decay: 0.03, wave: 'triangle' } }],
    ['Rumble', { len: 1.2, tone: { f0: 80, f1: 45, sweep: 0.3, decay: 1, gain: 0.9 }, drive: 8 }],
    ['Riser', { len: 1.2, noise: { type: 'bandpass', f: 400, f1: 9000, q: 3, decay: 2, gain: 1.6, attack: 1 } }],
    ['Shaker', { len: 0.15, noise: { type: 'highpass', f: 5000, decay: 0.07, gain: 0.6, attack: 0.03 } }],
    ['Laser', { len: 0.35, tone: { f0: 5000, f1: 200, sweep: 0.25, decay: 0.25, wave: 'sawtooth', gain: 0.3 } }],
    ['Stab', { len: 0.4, bell: { f: [261.6, 311.1, 392], decay: 0.2, wave: 'sawtooth' } }],
  ],
};
let noiseBuf = null;
function noise(ctx) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function drum(ctx, out, d) {
  const t = 0;
  let into = out;
  if (d.drive) { const dr = drive(ctx, d.drive); dr.connect(out); into = dr; }
  const envGain = (g, decay, attack = 0.001) => {
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + attack);
    e.gain.setTargetAtTime(0, t + attack, decay / 4); e.connect(into); return e;
  };
  if (d.tone) {
    const T = d.tone, o = ctx.createOscillator(); o.type = T.wave || 'sine';
    o.frequency.setValueAtTime(T.f0, t); o.frequency.exponentialRampToValueAtTime(T.f1, t + T.sweep);
    o.connect(envGain(T.gain ?? 1, T.decay)); o.start(t);
  }
  if (d.noise) {
    const N = d.noise, src = ctx.createBufferSource(); src.buffer = noise(ctx);
    const f = ctx.createBiquadFilter(); f.type = N.type; f.frequency.value = N.f; f.Q.value = N.q || 0.8;
    if (N.f1) f.frequency.exponentialRampToValueAtTime(N.f1, t + N.attack);
    src.connect(f);
    if (N.bursts) {        // a clap is a few quick slaps, then the tail
      const e = ctx.createGain(); e.connect(into); e.gain.setValueAtTime(0, t);
      for (let b = 0; b < N.bursts; b++) {
        const bt = t + b * 0.011; e.gain.setValueAtTime(N.gain, bt); e.gain.setTargetAtTime(0.1, bt + 0.001, 0.003);
      }
      e.gain.setValueAtTime(N.gain * 0.8, t + N.bursts * 0.011); e.gain.setTargetAtTime(0, t + N.bursts * 0.011, N.decay / 4);
      f.connect(e);
    } else f.connect(envGain(N.gain, N.decay, N.attack || 0.001));
    src.start(t);
  }
  if (d.metal) {
    const M = d.metal, hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = M.f;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = M.f * 1.2; bp.Q.value = 0.6;
    hp.connect(bp); bp.connect(envGain(M.gain * 2, M.decay));
    for (const fq of METAL) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = fq * 1.6; o.connect(hp); o.start(t); }
  }
  if (d.bell) {
    const B = d.bell, bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = B.f[0] * 2; bp.Q.value = 0.8;
    bp.connect(envGain(0.5, B.decay));
    for (const fq of B.f) { const o = ctx.createOscillator(); o.type = B.wave || 'square'; o.frequency.value = fq; o.connect(bp); o.start(t); }
  }
}
export async function makeKit(name) {
  return Promise.all(KITS[name].map(async ([label, d]) => {
    const ctx = new OfflineAudioContext(1, Math.ceil(d.len * SR), SR);
    const g = ctx.createGain(); g.gain.value = 0.8; g.connect(ctx.destination);
    drum(ctx, g, d);
    return { name: label, buf: normalize(await ctx.startRendering(), 0.9) };
  }));
}

// ---------------------------------------------------------------------------
// The random sound button. family: coin, laser, boom, power, hit, jump, blip,
// glitch, or '' for any. Returns a mono AudioBuffer.
// ---------------------------------------------------------------------------
export const FAMILIES = ['coin', 'laser', 'boom', 'power', 'hit', 'jump', 'blip', 'glitch'];
export function blessMe(ctx, family = '', seed = Math.random() * 1e9) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const R = (a, b) => a + (b - a) * rnd();
  const pick = a => a[Math.floor(rnd() * a.length)];
  const fam = family || pick(FAMILIES);
  // p: wave, base Hz, slide (per second, in octaves), arpeggio, envelope...
  const p = { wave: 'square', f: 440, slide: 0, dslide: 0, arpT: 0, arpM: 1, att: 0.001, sus: 0.05, dec: 0.15,
    vib: 0, vibF: 0, rep: 0, duty: 0.5, dutySlide: 0, lp: 1, crush: 0 };
  switch (fam) {
    case 'coin': Object.assign(p, { wave: pick(['square', 'square', 'saw']), f: R(700, 1600), arpT: R(0.04, 0.09), arpM: pick([1.5, 2, 1.335, 1.26]), sus: R(0.03, 0.08), dec: R(0.1, 0.3) }); break;
    case 'laser': Object.assign(p, { wave: pick(['square', 'saw', 'sine']), f: R(900, 3200), slide: -R(3, 9), dslide: R(0, 4), sus: R(0.02, 0.1), dec: R(0.05, 0.25), duty: R(0.15, 0.5), dutySlide: R(-1, 1) }); break;
    case 'boom': Object.assign(p, { wave: 'noise', f: R(40, 400), slide: -R(0, 2), sus: R(0.05, 0.3), dec: R(0.3, 0.9), vib: rnd() < 0.4 ? R(0.1, 0.4) : 0, vibF: R(4, 20), lp: R(0.3, 1) }); break;
    case 'power': Object.assign(p, { wave: pick(['square', 'saw', 'sine']), f: R(200, 600), slide: R(1, 4), sus: R(0.1, 0.3), dec: R(0.1, 0.4), vib: rnd() < 0.5 ? R(0.05, 0.3) : 0, vibF: R(6, 16), rep: rnd() < 0.5 ? R(0.06, 0.15) : 0 }); break;
    case 'hit': Object.assign(p, { wave: pick(['noise', 'square', 'saw']), f: R(100, 800), slide: -R(2, 6), sus: R(0.005, 0.03), dec: R(0.05, 0.2), lp: R(0.4, 1) }); break;
    case 'jump': Object.assign(p, { wave: 'square', f: R(200, 600), slide: R(1.5, 4), sus: R(0.05, 0.15), dec: R(0.05, 0.2), duty: R(0.2, 0.5) }); break;
    case 'blip': Object.assign(p, { wave: pick(['square', 'sine', 'triangle']), f: R(300, 2400), sus: R(0.01, 0.05), dec: R(0.01, 0.08), duty: R(0.1, 0.5) }); break;
    case 'glitch': Object.assign(p, { wave: pick(['square', 'saw', 'noise']), f: R(80, 3000), slide: R(-6, 6), dslide: R(-20, 20), sus: R(0.05, 0.3), dec: R(0.05, 0.4), rep: R(0.015, 0.06), arpT: R(0.01, 0.05), arpM: R(0.3, 3), crush: Math.floor(R(2, 20)), duty: R(0.05, 0.5) }); break;
  }
  const len = Math.ceil((p.att + p.sus + p.dec) * SR);
  const buf = ctx.createBuffer(1, len, SR), y = buf.getChannelData(0);
  let phase = 0, nv = 0, lpv = 0, held = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, tr = p.rep ? tt % p.rep : tt;    // "repeat": the sweep starts over
    let f = p.f * Math.pow(2, p.slide * tr + 0.5 * p.dslide * tr * tr);
    if (p.arpT && tr > p.arpT) f *= p.arpM;
    if (p.vib) f *= 1 + p.vib * Math.sin(2 * Math.PI * p.vibF * tt);
    f = Math.min(Math.max(f, 20), 18000);
    const prev = phase; phase = (phase + f / SR) % 1;
    const duty = Math.min(0.95, Math.max(0.05, p.duty + p.dutySlide * tt));
    let v;
    switch (p.wave) {
      case 'square': v = phase < duty ? 0.5 : -0.5; break;
      case 'saw': v = phase - 0.5; break;
      case 'sine': v = 0.5 * Math.sin(2 * Math.PI * phase); break;
      case 'triangle': v = phase < 0.5 ? phase * 2 - 0.5 : 1.5 - phase * 2; break;
      case 'noise': if (phase < prev || i === 0) nv = rnd() - 0.5; v = nv; break;
    }
    lpv += (v - lpv) * p.lp; v = lpv;
    if (p.crush) { if (i % p.crush === 0) held = Math.round(v * 8) / 8; v = held; }
    const e = tt < p.att ? tt / p.att : tt < p.att + p.sus ? 1 : Math.max(0, 1 - (tt - p.att - p.sus) / p.dec);
    y[i] = v * e;
  }
  buf.family = fam;
  return normalize(buf, 0.8);
}

// ---------------------------------------------------------------------------
// Helpers for recorded sound
// ---------------------------------------------------------------------------
// Mono copy, cut silence off both ends, louden to `peak`.
export function prepare(ctx, buf, { trim = true, peak = 0.9 } = {}) {
  const n = buf.length, ch = buf.numberOfChannels, m = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) m[i] += d[i] / ch; }
  let a = 0, b = n;
  if (trim) {
    let top = 0; for (let i = 0; i < n; i++) top = Math.max(top, Math.abs(m[i]));
    const thr = Math.max(0.004, top * 0.04);
    while (a < n && Math.abs(m[a]) < thr) a++;
    while (b > a && Math.abs(m[b - 1]) < thr) b--;
    a = Math.max(0, a - Math.round(buf.sampleRate * 0.005));
    b = Math.min(n, b + Math.round(buf.sampleRate * 0.05));
  }
  const out = ctx.createBuffer(1, Math.max(1, b - a), buf.sampleRate);
  out.copyToChannel(m.subarray(a, b), 0);
  return normalize(out, peak);
}
export function normalize(buf, peak = 0.9) {
  const d = buf.getChannelData(0); let top = 0;
  for (let i = 0; i < d.length; i++) top = Math.max(top, Math.abs(d[i]));
  if (top > 1e-4) { const g = peak / top; for (let i = 0; i < d.length; i++) d[i] *= g; }
  return buf;
}

// Where each hit or syllable starts, in seconds, at most `max` of them, the
// first always at 0. Loudness is measured in 10 ms frames; an onset is a jump
// in loudness well above the local average. The strongest are kept, and if
// there are too few, the longest pieces are cut in half until there are `max`.
export function onsets(buf, max = 16) {
  const x = buf.getChannelData(0), rate = buf.sampleRate, F = Math.round(rate * 0.01);
  const n = Math.floor(x.length / F), e = new Float32Array(n), flux = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let i = f * F; i < (f + 1) * F; i++) s += x[i] * x[i]; e[f] = Math.sqrt(s / F); }
  for (let f = 1; f < n; f++) flux[f] = Math.max(0, e[f] - e[f - 1]);
  const peaks = [];
  for (let f = 2; f < n - 1; f++) {
    let sum = 0, c = 0; for (let j = Math.max(0, f - 8); j < Math.min(n, f + 9); j++) { sum += flux[j]; c++; }
    if (flux[f] > flux[f - 1] && flux[f] >= flux[f + 1] && flux[f] > (sum / c) * 1.8 && e[f] > 0.02) peaks.push([f, flux[f]]);
  }
  peaks.sort((a, b) => b[1] - a[1]);
  const chosen = [0], gap = 6;            // at least 60 ms apart
  for (const [f] of peaks) {
    if (chosen.length >= max) break;
    if (chosen.every(c => Math.abs(c - f) >= gap)) chosen.push(f);
  }
  let starts = chosen.map(f => Math.max(0, f - 1) * F / rate).sort((a, b) => a - b);
  starts[0] = 0;
  const total = buf.duration;
  while (starts.length < max) {
    let best = 0, len = 0;
    for (let i = 0; i < starts.length; i++) { const l = (starts[i + 1] ?? total) - starts[i]; if (l > len) { len = l; best = i; } }
    starts.splice(best + 1, 0, starts[best] + len / 2);
  }
  return starts;
}
