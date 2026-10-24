// Design: drum hits and synths you make yourself, rendered once to a recording (like every sound
// made in code here, so the phone only plays them back).
//   Drums: models of how drums make sound (the same as tools/drumlab.py): a kick's falling sine with
//   its click and knock, a snare's drumhead and wires, a clap's hands, hats and cymbals of many metal
//   partials, a tom, struck wood or metal, a shaker's beads. Each is a function of its knobs.
//   Synths: two oscillators (and a sub, noise and unison), a filter with its own envelope, the
//   volume's envelope, vibrato, drive and glide, played by the Web Audio engine offline: a note
//   every 6 half steps, each as tapped and held (a seamless loop), packed as an instrument.
export const SR = 44100;

// --------------------------------------------------------------------------- building blocks
function rng(seed) {            // a repeatable random stream (mulberry32): the same design sounds the same
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const noise = (n, r) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
// a biquad filter (the RBJ cookbook), run over the samples
function biquad(x, type, f, q = 0.707) {
  f = Math.min(Math.max(f, 20), SR / 2 - 100);
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }              // band-pass, peak 1
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const lp = (x, f, q) => biquad(x, 'lp', f, q), hp = (x, f, q) => biquad(x, 'hp', f, q);
const bp = (x, lo, hi) => biquad(x, 'bp', Math.sqrt(lo * hi), Math.sqrt(lo * hi) / (hi - lo));
function reson(x, f, q) {       // a mode that rings when struck (a two-pole resonator)
  const r = Math.exp(-Math.PI * f / (q * SR)), w = 2 * Math.PI * f / SR, a1 = -2 * r * Math.cos(w), a2 = r * r;
  const y = new Float32Array(x.length); let y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (1 - r) * x[i] - a1 * y1 - a2 * y2; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const ring = (t, secs, shape = 1) => Math.exp(-6.9 * Math.pow(t / secs, shape));       // 60 dB down after secs
const rise = (t, secs) => (t >= secs ? 1 : Math.sin(Math.PI / 2 * t / secs) ** 2);
function sat(x, drive) { if (drive <= 0) return x; const k = Math.tanh(1 + drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * (1 + drive)) / k; return x; }
function grit(x, amount) {       // an old sampler: fewer samples a second (held), fewer steps
  if (amount <= 0) return x;
  const rate = 40000 - amount * 30000, bits = Math.round(16 - amount * 8), step = SR / rate, q = 2 ** (bits - 1);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = Math.round(x[Math.floor(Math.floor(i / step) * step)] * q) / q;
  return lp(y, rate * 0.45);
}
const mix = (...parts) => { const n = Math.max(...parts.map(p => p.length)), y = new Float32Array(n); for (const p of parts) for (let i = 0; i < p.length; i++) y[i] += p[i]; return y; };
const scale = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
const peakOf = x => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return m; };
// the end: cut where it has died away (60 dB down), a short fade, the level asked, no DC
function finish(x, peak = 0.9) {
  x = hp(x, 18, 0.5); const top = peakOf(x) || 1;
  let n = x.length; while (n > 1 && Math.abs(x[n - 1]) < top * 0.001) n--;
  x = x.slice(0, Math.min(x.length, n + Math.round(0.005 * SR)));
  const f = Math.min(x.length, Math.round(0.004 * SR)); for (let i = 0; i < f; i++) x[x.length - 1 - i] *= Math.sin(Math.PI / 2 * i / f) ** 2;
  return scale(x, peak / (peakOf(x) || 1));
}
const T = secs => Math.round(secs * SR);

// --------------------------------------------------------------------------- the drums
const MEMBRANE = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501];     // a round drumhead's modes
function kick(p, r) {
  const n = T(p.decay * 1.15 + 0.05), y = new Float32Array(n), click = new Float32Array(n), nz = noise(n, r);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = p.pitch * (1 + (p.sweep - 1) * Math.exp(-t / (p.glide / 1000))) + p.pitch * p.sweep * 0.6 * Math.exp(-t / 0.0035);
    ph += 2 * Math.PI * f / SR;
    y[i] = Math.sin(ph) * ring(t, p.decay, p.shape) * rise(t, 0.0004) + p.sub * Math.sin(2 * Math.PI * p.pitch * t) * ring(t, p.decay * 1.3, 1.6) * rise(t, 0.012);
  }
  const hiss = hp(nz, 2500); for (let i = 0; i < n; i++) click[i] = p.click * hiss[i] * Math.exp(-i / SR / 0.0012);
  const beat = bp(nz, 700, 3500); for (let i = 0; i < n; i++) beat[i] *= p.beater * Math.exp(-i / SR / 0.006);
  const parts = [y, click, beat];
  if (p.knock > 0) {
    const ex = new Float32Array(n); for (let i = 0; i < n; i++) ex[i] = nz[i] * Math.exp(-i / SR / 0.002);
    const k = reson(ex, p.knockf, 5), g = p.knock / (peakOf(k) || 1); for (let i = 0; i < n; i++) k[i] *= g * ring(i / SR, 0.12);
    parts.push(k);
  }
  return grit(lp(sat(mix(...parts), p.drive), p.tone), p.grit);
}
function head(f, secs, strike, bend, r, modes = 8) {
  const n = T(secs * 1.2 + 0.02), y = new Float32Array(n);
  for (let m = 0; m < modes; m++) {
    const a = m === 0 ? 1 - strike : strike * 0.75 ** (m - 1) * (0.7 + 0.5 * r()), d = secs / (1 + 0.35 * m), p0 = r() * 0.5;
    let ph = p0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * f * MEMBRANE[m] * (1 + bend * Math.exp(-t / 0.015)) / SR; y[i] += a * Math.sin(ph) * ring(t, d); }
  }
  for (let i = 0; i < n; i++) y[i] *= rise(i / SR, 0.0005);
  return y;
}
function snare(p, r) {
  const h = head(p.tune, p.body, 0.45, 0.1, r), n = T(Math.max(p.body, p.wires_decay) * 1.2 + 0.03), nz = noise(n, r);
  let w = bp(nz, 500, 7000); const dark = lp(w, 1800, 0.5);
  for (let i = 0; i < n; i++) w[i] = (1 - p.dark) * w[i] + p.dark * 2.5 * dark[i];
  let he = 0; const hl = h.length;
  for (let i = 0; i < n; i++) { he = 0.998 * he + 0.002 * Math.abs(i < hl ? h[i] : 0); w[i] *= rise(i / SR, 0.005) * (0.55 * ring(i / SR, p.wires_decay, 0.9) + 0.45 * Math.min(1, he * 60) * ring(i / SR, p.wires_decay * 1.4)); }
  scale(w, 0.9 * p.wires / (peakOf(w) || 1));
  const c = hp(nz, 3000); for (let i = 0; i < n; i++) c[i] *= p.snap * Math.exp(-i / SR / 0.0018);
  return grit(lp(sat(mix(scale(h, 1 - 0.4 * p.wires), w, c), p.drive), p.tone), p.grit);
}
function clap(p, r) {
  const n = T(p.hands * p.spread / 1000 + p.tail * 1.2 + 0.02), nz = noise(n, r), env = new Float32Array(n);
  let at = 0;
  for (let k = 0; k < p.hands; k++) {
    const g = 0.7 + 0.3 * r(), s = T(at);
    for (let i = s; i < n; i++) { const d = (i - s) / SR; env[i] += g * rise(d, 0.0003) * Math.exp(-d / 0.0045); }
    at += p.spread / 1000 * (0.7 + 0.6 * r());
  }
  for (let i = T(at); i < n; i++) env[i] += 0.55 * ring((i - T(at)) / SR, p.tail);
  const x = bp(nz, p.tone / p.width, p.tone * p.width), sh = hp(nz, 6000);
  for (let i = 0; i < n; i++) x[i] = (x[i] + 0.12 * sh[i]) * env[i];
  return grit(sat(scale(x, 1 / (peakOf(x) || 1)), p.drive), p.grit);
}
function metal(p, r, open) {
  const n = T(p.decay * 1.2 + 0.02), x = new Float32Array(n);
  if (p.kind < 0.5) {            // the 808's six square waves, band-limited
    for (const f0 of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
      const f = f0 * p.pitch, ph = r() * 6.28;
      for (let h = 1; h * f < 15000; h += 2) { const w = 2 * Math.PI * h * f / SR; for (let i = 0; i < n; i++) x[i] += Math.sin(w * i + h * ph) / h; }
    }
  } else {                       // a cymbal: partials scattered from 400 Hz up, each ringing its own time
    for (let k = 0; k < 40; k++) {
      const f = Math.exp(Math.log(400 * p.pitch) + r() * (Math.log(15000) - Math.log(400 * p.pitch))), a = (0.3 + 0.7 * r()) * (f / 1000) ** -0.25, d = p.decay * (0.5 + 0.9 * r()), w = 2 * Math.PI * f / SR, ph = r() * 6.28;
      for (let i = 0; i < n; i++) x[i] += a * Math.sin(w * i + ph) * ring(i / SR, d);
    }
  }
  const top = peakOf(x) || 1, nz = noise(n, r);
  for (let i = 0; i < n; i++) x[i] = x[i] / top + p.sizzle * nz[i];
  const y = bp(x, p.lowcut, 14000);
  for (let i = 0; i < n; i++) y[i] *= ring(i / SR, p.decay, open ? 1.25 : 0.7) * rise(i / SR, 0.0004);
  return grit(sat(scale(y, 1 / (peakOf(y) || 1)), p.drive), p.grit);
}
function tom(p, r) {
  const h = head(p.pitch, p.decay, p.strike, p.bend, r, 4), n = h.length, nz = noise(n, r), s = bp(nz, 400, 4000);
  for (let i = 0; i < n; i++) s[i] *= p.noise * Math.exp(-i / SR / 0.02);
  return grit(sat(mix(h, s), p.drive), p.grit);
}
const MATERIALS = [[1, 2.76, 5.4, 8.93], [1, 1.51, 2.42, 3.38], [1, 2.32, 4.25, 6.63]];        // wood, metal (bell-like), glass
function perc(p, r) {
  const n = T(p.decay * 1.3 + 0.03), ex = new Float32Array(n); ex[0] = 1;
  const m = MATERIALS[Math.round(p.material)], out = new Float32Array(n), nz = noise(n, r);
  for (let i = 1; i < T(0.0008); i++) ex[i] = (r() - 0.5) * 0.5;
  m.forEach((ratio, k) => {
    const f = p.pitch * ratio; if (f > SR / 2.2) return;
    const q = Math.PI * f * p.decay / 6.9 / (1 + k * 0.4), y = reson(ex, f, q), a = 0.7 ** k;
    for (let i = 0; i < n; i++) out[i] += a * y[i];
  });
  scale(out, 1 / (peakOf(out) || 1)); const c = hp(nz, 4000);
  for (let i = 0; i < n; i++) out[i] += p.click * c[i] * Math.exp(-i / SR / 0.0008);
  return grit(sat(out, p.drive), p.grit);
}
function shaker(p, r) {         // Perry Cook's PhISEM: beads colliding, more often while the shake has energy
  const lift = p.shake, n = T(lift + p.length * 1.3 + 0.02), hit = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = rise(t, lift) * ring(Math.max(0, t - lift), p.length) * (1 + 0.6 * Math.exp(-(((t - lift) / 0.03) ** 2)));
    if (r() < Math.min(1, p.beads * e / 200)) hit[i] = (r() * 2 - 1) * e;
  }
  return grit(mix(reson(hit, p.tone, 9), reson(hit, p.tone * 2, 6)), p.grit);
}

// Each kind: its knobs [key, label, low, high, step, unit] and starting points; the first is the default.
const K = (key, label, lo, hi, step, unit = '') => ({ key, label, lo, hi, step, unit });
const DRIVE = K('drive', 'Drive', 0, 4, 0.05), GRIT = K('grit', 'Old sampler', 0, 1, 0.01), TONE = K('tone', 'Tone', 800, 16000, 50, 'Hz');
export const DRUMS = {
  kick: { name: 'Kick', make: kick, knobs: [K('pitch', 'Pitch', 30, 120, 0.5, 'Hz'), K('sweep', 'Pitch drop', 1, 10, 0.1, '×'), K('glide', 'Drop speed', 4, 150, 1, 'ms'),
    K('decay', 'Length', 0.08, 1.6, 0.01, 's'), K('shape', 'Hold', 0.6, 2.2, 0.05), K('click', 'Click', 0, 1, 0.01), K('beater', 'Beater', 0, 1, 0.01),
    K('knock', 'Knock', 0, 1, 0.01), K('knockf', 'Knock pitch', 80, 400, 1, 'Hz'), K('sub', 'Sub', 0, 1, 0.01), DRIVE, TONE, GRIT],
    presets: { 'Boom bap': { pitch: 51.9, sweep: 3.2, glide: 35, decay: 0.42, shape: 1.2, click: 0.12, beater: 0.25, knock: 0.35, knockf: 150, sub: 0, drive: 1.6, tone: 5200, grit: 0.5 },
      '808 boom': { pitch: 43.65, sweep: 2.2, glide: 60, decay: 1.1, shape: 1.8, click: 0.08, beater: 0, knock: 0, knockf: 150, sub: 0.25, drive: 0.8, tone: 4000, grit: 0 },
      Electro: { pitch: 65.4, sweep: 5.5, glide: 12, decay: 0.2, shape: 1.3, click: 0.45, beater: 0, knock: 0, knockf: 150, sub: 0, drive: 2.5, tone: 9000, grit: 0 },
      Soft: { pitch: 49, sweep: 2, glide: 40, decay: 0.45, shape: 1.1, click: 0, beater: 0.3, knock: 0.1, knockf: 120, sub: 0, drive: 0.4, tone: 2600, grit: 0 },
      Zap: { pitch: 43.65, sweep: 9, glide: 50, decay: 0.55, shape: 1.5, click: 0.2, beater: 0, knock: 0, knockf: 150, sub: 0, drive: 1.2, tone: 8000, grit: 0 } } },
  snare: { name: 'Snare', make: snare, knobs: [K('tune', 'Tune', 120, 340, 1, 'Hz'), K('body', 'Body', 0.03, 0.35, 0.005, 's'), K('wires', 'Wires', 0, 1, 0.01),
    K('wires_decay', 'Wires length', 0.05, 0.7, 0.005, 's'), K('dark', 'Darker wires', 0, 1, 0.01), K('snap', 'Snap', 0, 1, 0.01), DRIVE, TONE, GRIT],
    presets: { Dusty: { tune: 207.7, body: 0.13, wires: 0.7, wires_decay: 0.3, dark: 0.6, snap: 0.15, drive: 1.4, tone: 7000, grit: 0.5 },
      Crack: { tune: 261.6, body: 0.08, wires: 0.65, wires_decay: 0.22, dark: 0.3, snap: 0.4, drive: 1.6, tone: 13000, grit: 0 },
      Fat: { tune: 174.6, body: 0.18, wires: 0.75, wires_decay: 0.42, dark: 0.7, snap: 0.1, drive: 1.2, tone: 9000, grit: 0 },
      Electro: { tune: 185, body: 0.16, wires: 0.7, wires_decay: 0.22, dark: 0.2, snap: 0.05, drive: 0.6, tone: 12000, grit: 0 } } },
  clap: { name: 'Clap', make: clap, knobs: [K('tone', 'Tone', 500, 3500, 10, 'Hz'), K('hands', 'Hands', 1, 7, 1), K('spread', 'Spread', 2, 25, 0.5, 'ms'),
    K('tail', 'Room', 0.04, 0.7, 0.01, 's'), K('width', 'Width', 1.3, 3, 0.05), DRIVE, GRIT],
    presets: { Clap: { tone: 1150, hands: 4, spread: 10.5, tail: 0.24, width: 2.2, drive: 0.6, grit: 0 },
      Dusty: { tone: 950, hands: 3, spread: 12, tail: 0.2, width: 1.9, drive: 1, grit: 0.5 },
      Snap: { tone: 1900, hands: 2, spread: 4, tail: 0.1, width: 1.7, drive: 0.4, grit: 0 },
      'Big room': { tone: 1200, hands: 5, spread: 9, tail: 0.55, width: 2.4, drive: 0.5, grit: 0 } } },
  hat: { name: 'Hat', make: (p, r) => metal(p, r, false), knobs: [K('kind', '808 · cymbal', 0, 1, 1), K('pitch', 'Pitch', 0.6, 1.8, 0.01, '×'),
    K('decay', 'Length', 0.02, 0.5, 0.005, 's'), K('lowcut', 'Low cut', 2500, 10000, 50, 'Hz'), K('sizzle', 'Sizzle', 0, 1, 0.01), DRIVE, GRIT],
    presets: { '808': { kind: 0, pitch: 1, decay: 0.16, lowcut: 4500, sizzle: 0.35, drive: 0.3, grit: 0 }, Dusty: { kind: 1, pitch: 1, decay: 0.18, lowcut: 3800, sizzle: 0.5, drive: 0.8, grit: 0.5 },
      Tick: { kind: 1, pitch: 1.4, decay: 0.09, lowcut: 6000, sizzle: 0.2, drive: 0.2, grit: 0 } } },
  open: { name: 'Open hat', make: (p, r) => metal(p, r, true), knobs: [K('kind', '808 · cymbal', 0, 1, 1), K('pitch', 'Pitch', 0.6, 1.8, 0.01, '×'),
    K('decay', 'Length', 0.15, 2.5, 0.01, 's'), K('lowcut', 'Low cut', 1500, 10000, 50, 'Hz'), K('sizzle', 'Sizzle', 0, 1, 0.01), DRIVE, GRIT],
    presets: { '808 open': { kind: 0, pitch: 1, decay: 0.7, lowcut: 4200, sizzle: 0.3, drive: 0.3, grit: 0 }, Ride: { kind: 1, pitch: 0.9, decay: 2.2, lowcut: 2200, sizzle: 0.15, drive: 0.1, grit: 0 },
      Crash: { kind: 1, pitch: 0.7, decay: 2.2, lowcut: 1800, sizzle: 0.45, drive: 0.4, grit: 0 } } },
  tom: { name: 'Tom', make: tom, knobs: [K('pitch', 'Pitch', 50, 320, 1, 'Hz'), K('bend', 'Bend', 0, 0.6, 0.01), K('decay', 'Length', 0.08, 1.2, 0.01, 's'),
    K('strike', 'Edge', 0, 1, 0.01), K('noise', 'Stick', 0, 1, 0.01), DRIVE, GRIT],
    presets: { Low: { pitch: 82, bend: 0.25, decay: 0.6, strike: 0.25, noise: 0.25, drive: 0.6, grit: 0 }, High: { pitch: 165, bend: 0.2, decay: 0.4, strike: 0.3, noise: 0.3, drive: 0.6, grit: 0 },
      'Electro tom': { pitch: 110, bend: 0.5, decay: 0.5, strike: 0.05, noise: 0, drive: 1.2, grit: 0 }, Conga: { pitch: 220, bend: 0.08, decay: 0.3, strike: 0.6, noise: 0.5, drive: 0.3, grit: 0 } } },
  perc: { name: 'Percussion', make: perc, knobs: [K('material', 'Wood · metal · glass', 0, 2, 1), K('pitch', 'Pitch', 200, 4000, 5, 'Hz'),
    K('decay', 'Ring', 0.02, 2, 0.01, 's'), K('click', 'Click', 0, 1, 0.01), DRIVE, GRIT],
    presets: { Woodblock: { material: 0, pitch: 800, decay: 0.12, click: 0.3, drive: 0.2, grit: 0 }, Rimshot: { material: 0, pitch: 520, decay: 0.08, click: 0.5, drive: 0.8, grit: 0 },
      Cowbell: { material: 1, pitch: 540, decay: 0.35, click: 0.2, drive: 0.6, grit: 0 }, Chime: { material: 1, pitch: 1175, decay: 1.4, click: 0.1, drive: 0, grit: 0 },
      'Glass tick': { material: 2, pitch: 2600, decay: 0.08, click: 0.3, drive: 0, grit: 0 } } },
  shaker: { name: 'Shaker', make: shaker, knobs: [K('tone', 'Tone', 1500, 9000, 50, 'Hz'), K('beads', 'Beads', 5, 150, 1), K('length', 'Length', 0.03, 0.5, 0.005, 's'),
    K('shake', 'Shake', 0.003, 0.06, 0.001, 's'), GRIT],
    presets: { Shaker: { tone: 3200, beads: 60, length: 0.14, shake: 0.02, grit: 0 }, Maraca: { tone: 4500, beads: 30, length: 0.08, shake: 0.008, grit: 0 },
      'Rain stick': { tone: 2600, beads: 120, length: 0.45, shake: 0.05, grit: 0 } } },
};
// One hit: the drum, its knobs, a seed (the same seed, the same noise). Returns samples at SR.
// Finishing, for every drum (after Microtonic's and Ableton's DS drums, and the usual advice on
// layering): soften the attack (less click), a low and a high cut (so a layer keeps to its range),
// a second drum layered under it (lined up at the start, so the two never flam), reversed. (The
// room, a short real room baked in, is the app's: it needs the room's recording.)
export const FINISH = [K('attack', 'Soften the hit', 0, 25, 0.5, 'ms'), K('lowcut', 'Low cut', 20, 1200, 5, 'Hz'), K('highcut', 'High cut', 1500, 20000, 100, 'Hz'),
  K('layermix', 'Layer level', 0, 1, 0.01), K('room', 'Room', 0, 1, 0.01), K('reverse', 'Reverse', 0, 1, 1)];
export const FINISH_DEFAULT = { attack: 0, lowcut: 20, highcut: 20000, layermix: 0.5, room: 0, reverse: 0 };
// every starting point, as "kind/name", for the layer
export const LAYERS = Object.entries(DRUMS).flatMap(([k, D]) => Object.keys(D.presets).map(n => [`${k}/${n}`, `${D.name}: ${n}`]));
export function renderDrum(kind, p, seed = 1, f = null, layer = null) {
  let x = finish(DRUMS[kind].make(p, rng(seed)));
  if (!f) return x;
  if (layer && f.layermix > 0) {              // the second drum, from its start, at its level
    const [lk, ln] = layer.split('/'), y = finish(DRUMS[lk].make(DRUMS[lk].presets[ln], rng(seed + 7)));
    x = mix(scale(x, 1 - f.layermix * 0.5), scale(y, f.layermix));
  }
  if (f.attack > 0) { const n = Math.min(x.length, T(f.attack / 1000)); for (let i = 0; i < n; i++) x[i] *= Math.sin(Math.PI / 2 * i / n) ** 2; }
  if (f.lowcut > 25) x = hp(x, f.lowcut);
  if (f.highcut < 19000) x = lp(x, f.highcut);
  if (f.reverse >= 0.5) x = x.slice().reverse();
  return finish(x);
}
// the note a frequency is nearest, and that note's frequency in the key given (root 0-11, scale steps)
export const noteOf = f => 69 + 12 * Math.log2(f / 440);
export function inKey(f, root, steps) {
  let best = f, d = 1e9;
  for (let m = 12; m < 120; m++) if (steps.includes(((m - root) % 12 + 12) % 12)) { const g = 440 * 2 ** ((m - 69) / 12), e = Math.abs(Math.log2(g / f)); if (e < d) { d = e; best = g; } }
  return best;
}
// A surprise: each knob somewhere near a starting point, so it stays a drum
export function surprise(kind, seed) {
  const r = rng(seed), D = DRUMS[kind], names = Object.keys(D.presets), base = D.presets[names[Math.floor(r() * names.length)]], p = {};
  for (const k of D.knobs) { const span = k.hi - k.lo, v = base[k.key] + (r() - 0.5) * span * 0.5; p[k.key] = Math.min(k.hi, Math.max(k.lo, k.step >= 1 ? Math.round(v) : v)); }
  return p;
}

// --------------------------------------------------------------------------- the synth
export const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
export const SYNTH_KNOBS = [
  ['Oscillators', [K('wave1', 'Wave 1', 0, 3, 1), K('wave2', 'Wave 2', 0, 3, 1), K('mix2', 'Wave 2 level', 0, 1, 0.01), K('semi2', 'Wave 2 tuning', -24, 24, 1, 'st'),
    K('fine2', 'Wave 2 detune', 0, 50, 1, 'ct'), K('sub', 'Sub (octave down)', 0, 1, 0.01), K('noise', 'Noise', 0, 1, 0.01), K('unison', 'Unison voices', 1, 5, 1), K('spread', 'Unison spread', 0, 40, 1, 'ct')]],
  ['Filter', [K('ftype', 'Low · band · high', 0, 2, 1), K('cutoff', 'Cutoff', 60, 16000, 10, 'Hz'), K('res', 'Resonance', 0, 20, 0.1), K('famt', 'Envelope opens it', 0, 6, 0.05, 'oct'),
    K('fa', 'Filter attack', 0.001, 2, 0.001, 's'), K('fd', 'Filter decay', 0.01, 3, 0.01, 's'), K('fs', 'Filter sustain', 0, 1, 0.01)]],
  ['Volume', [K('a', 'Attack', 0.001, 3, 0.001, 's'), K('d', 'Decay', 0.01, 3, 0.01, 's'), K('s', 'Sustain', 0, 1, 0.01), K('r', 'Release', 0.01, 4, 0.01, 's'), K('len', 'Tapped length', 0.05, 2, 0.01, 's')]],
  ['Movement', [K('vib', 'Vibrato', 0, 60, 1, 'ct'), K('vibhz', 'Vibrato speed', 0.5, 8, 0.1, 'Hz'), K('glide', 'Glide into the note', 0, 12, 0.5, 'st'), K('drive', 'Drive', 0, 4, 0.05)]],
];
export const SYNTH_PRESETS = {
  'Warm pad': { wave1: 2, wave2: 2, mix2: 0.7, semi2: 0, fine2: 12, sub: 0, noise: 0.02, unison: 3, spread: 14, ftype: 0, cutoff: 1100, res: 1, famt: 1.2, fa: 0.8, fd: 1.5, fs: 0.6, a: 0.6, d: 1, s: 0.85, r: 1.2, len: 0.9, vib: 4, vibhz: 4.5, glide: 0, drive: 0, register: 48 },
  'Analog bass': { wave1: 2, wave2: 3, mix2: 0.4, semi2: -12, fine2: 4, sub: 0.5, noise: 0, unison: 1, spread: 0, ftype: 0, cutoff: 260, res: 6, famt: 2.6, fa: 0.002, fd: 0.22, fs: 0.15, a: 0.003, d: 0.3, s: 0.7, r: 0.12, len: 0.3, vib: 0, vibhz: 5, glide: 0, drive: 1.2, register: 36 },
  'Pluck': { wave1: 2, wave2: 3, mix2: 0.3, semi2: 12, fine2: 6, sub: 0, noise: 0, unison: 1, spread: 0, ftype: 0, cutoff: 500, res: 4, famt: 3.5, fa: 0.001, fd: 0.18, fs: 0, a: 0.001, d: 0.4, s: 0, r: 0.25, len: 0.15, vib: 0, vibhz: 5, glide: 0, drive: 0.3, register: 60 },
  'Supersaw lead': { wave1: 2, wave2: 2, mix2: 0.8, semi2: 0, fine2: 18, sub: 0.2, noise: 0, unison: 5, spread: 25, ftype: 0, cutoff: 5000, res: 1, famt: 0.8, fa: 0.01, fd: 0.4, fs: 0.8, a: 0.01, d: 0.3, s: 0.9, r: 0.4, len: 0.5, vib: 8, vibhz: 5.5, glide: 1, drive: 0.4, register: 60 },
  'Howl': { wave1: 1, wave2: 2, mix2: 0.5, semi2: 12, fine2: 8, sub: 0, noise: 0.05, unison: 2, spread: 10, ftype: 1, cutoff: 1400, res: 7, famt: 1.5, fa: 0.4, fd: 1.2, fs: 0.5, a: 0.15, d: 0.6, s: 0.9, r: 0.8, len: 0.7, vib: 25, vibhz: 5, glide: 2, drive: 0.8, register: 60 },
  'Bell keys': { wave1: 0, wave2: 0, mix2: 0.5, semi2: 19, fine2: 3, sub: 0, noise: 0, unison: 1, spread: 0, ftype: 0, cutoff: 9000, res: 0.5, famt: 0, fa: 0.001, fd: 0.5, fs: 1, a: 0.002, d: 1.4, s: 0, r: 1.2, len: 1, vib: 0, vibhz: 5, glide: 0, drive: 0, register: 60 },
  'Organ': { wave1: 0, wave2: 0, mix2: 0.6, semi2: 12, fine2: 0, sub: 0.6, noise: 0, unison: 1, spread: 0, ftype: 0, cutoff: 6000, res: 0.5, famt: 0, fa: 0.001, fd: 0.1, fs: 1, a: 0.02, d: 0.1, s: 1, r: 0.08, len: 0.6, vib: 6, vibhz: 6.5, glide: 0, drive: 0.3, register: 48 },
};
export const REGISTERS = [[36, 'Bass'], [48, 'Middle'], [60, 'High']];
const hz = m => 440 * 2 ** ((m - 69) / 12);

// One note, offline: tapped (the note for `len`, then its release) or held (secs long, never released)
async function synthNote(p, midi, secs, held) {
  const off = new OfflineAudioContext(1, T(secs), SR), t0 = 0.005, f = hz(midi);
  const amp = off.createGain(); amp.gain.value = 0;
  const filt = off.createBiquadFilter(); filt.type = ['lowpass', 'bandpass', 'highpass'][p.ftype]; filt.Q.value = 0.5 + p.res;
  const drive = off.createWaveShaper();
  if (p.drive > 0) { const c = new Float32Array(1024), k = Math.tanh(1 + p.drive); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * (1 + p.drive)) / k; } drive.curve = c; }
  const pre = off.createGain(); pre.gain.value = 0.35 / Math.sqrt(p.unison);
  pre.connect(filt); filt.connect(drive); drive.connect(amp); amp.connect(off.destination);
  // the filter's envelope: from the cutoff, opened by famt octaves, back down to its sustain
  const top = Math.min(SR / 2.2, p.cutoff * 2 ** p.famt), sus = Math.min(SR / 2.2, p.cutoff * 2 ** (p.famt * p.fs));
  filt.frequency.setValueAtTime(p.cutoff, t0); filt.frequency.linearRampToValueAtTime(top, t0 + p.fa); filt.frequency.setTargetAtTime(sus, t0 + p.fa, p.fd / 3);
  // the volume's: attack, decay to sustain, and (tapped) the release after len
  amp.gain.setValueAtTime(0, t0); amp.gain.linearRampToValueAtTime(1, t0 + p.a); amp.gain.setTargetAtTime(p.s, t0 + p.a, p.d / 3);
  if (!held) { const at = t0 + Math.max(p.len, p.a); amp.gain.cancelScheduledValues(at); amp.gain.setTargetAtTime(0, at, p.r / 4); if (p.ftype === 0) filt.frequency.setTargetAtTime(p.cutoff, at, p.r / 3); }
  // vibrato, coming in over half a second
  const lfo = off.createOscillator(), depth = off.createGain(); lfo.frequency.value = p.vibhz; depth.gain.setValueAtTime(0, t0); depth.gain.linearRampToValueAtTime(p.vib, t0 + 0.5); lfo.connect(depth); lfo.start(t0);
  const voice = (type, semis, cents, level) => {
    for (let u = 0; u < p.unison; u++) {
      const o = off.createOscillator(), g = off.createGain(), spread = p.unison > 1 ? (u / (p.unison - 1) - 0.5) * 2 * p.spread : 0;
      o.type = type; o.frequency.value = f * 2 ** (semis / 12); o.detune.setValueAtTime(cents + spread - p.glide * 100, t0);
      if (p.glide) o.detune.setTargetAtTime(cents + spread, t0, 0.06);
      depth.connect(o.detune); g.gain.value = level; o.connect(g); g.connect(pre); o.start(t0 + (u ? 0.002 * u : 0));
    }
  };
  voice(WAVES[p.wave1], 0, 0, 1);
  if (p.mix2 > 0) voice(WAVES[p.wave2], p.semi2, p.fine2, p.mix2);
  if (p.sub > 0) { const o = off.createOscillator(), g = off.createGain(); o.frequency.value = f / 2; g.gain.value = p.sub * Math.sqrt(p.unison); o.connect(g); g.connect(pre); o.start(t0); }
  if (p.noise > 0) {
    const b = off.createBuffer(1, T(secs), SR), d = b.getChannelData(0), r = rng(midi); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    const s = off.createBufferSource(), g = off.createGain(); s.buffer = b; g.gain.value = p.noise * Math.sqrt(p.unison); s.connect(g); g.connect(pre); s.start(t0);
  }
  const out = (await off.startRendering()).getChannelData(0);
  let x = hp(out, 18, 0.5);
  return x;
}
// the loop of a held note: about 0.8 s ending 0.1 s before the take does, a whole number of
// vibrato cycles (if it has one) and of the note's periods; its end crossfades into what comes
// just before its start (the two are in step, so a straight crossfade keeps the level)
function loopIt(x, midi, p) {
  const period = SR / hz(midi);
  let L = 0.8 * SR; if (p.vib > 0) L = Math.max(1, Math.round(0.8 * p.vibhz)) / p.vibhz * SR;
  L = Math.round(L / period) * period;
  const b = x.length - T(0.1), a = Math.round(b - L), X = Math.min(T(0.08), Math.floor(L / 3), a);
  for (let i = 0; i < X; i++) { const u = (i + 1) / (X + 1); x[b - X + i] = x[b - X + i] * (1 - u) + x[a - X + i] * u; }
  return [a, b];
}
// The instrument: a note every 6 half steps from an octave and a half under its register to two and
// a half above, each tapped and held. Returns one buffer's samples and the zones, as the app's
// recorded synths ({ m, s, e, ls, le, hs, he } in seconds).
export async function renderSynth(p, progress = () => {}) {
  const base = p.register || 48, parts = [], zones = [], gap = T(0.02);
  let at = 0, i = 0;
  const notes = []; for (let m = base - 18; m <= base + 30; m += 6) notes.push(m);
  if (p._only) notes.splice(0, notes.length, base + 7);        // ▶ Hear: one note, in the middle of its range
  for (const m of notes) {
    progress(i++ / notes.length);
    const one = await synthNote(p, m, Math.max(p.len, p.a) + p.r * 1.6 + 0.08, false);
    const heldSecs = Math.max(1.8, p.a + Math.min(p.d, 1.5) + 1.3), h = await synthNote(p, m, heldSecs, true);
    const [la, lb] = loopIt(h, m, p);
    const z = { m, s: at / SR, e: (at + one.length) / SR }; parts.push(one); at += one.length + gap;
    Object.assign(z, { hs: at / SR, he: (at + h.length) / SR, ls: (at + la) / SR, le: (at + lb) / SR }); parts.push(h); at += h.length + gap;
    zones.push(z);
  }
  const data = new Float32Array(at); let o = 0, top = 0;
  for (const x of parts) { data.set(x, o); o += x.length + gap; }
  for (const v of data) top = Math.max(top, Math.abs(v));
  if (top > 0) scale(data, 0.9 / top);
  progress(1);
  return { data, zones, base };
}
