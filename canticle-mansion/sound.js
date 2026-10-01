// Music and sound for Canticle Mansion: the engine made for Psalter Runner,
// chip voices in the manner of Tim Follin built on the Gregorian psalm tones.
const Snd = (() => {
  let ac = null, master, musicGain, sfxGain, reverbSend, echoIn, echoDelay, noise, metal;
  const waves = {};
  let on = true, song = null, pending = null, wanted = null;
  let gridTime = 0, step = 0, SIX = 0.1, leadIndex = 0, lastLead = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    ac = new A();
    master = ac.createGain(); master.gain.value = on ? 0.8 : 0;
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.1;
    master.connect(limiter).connect(ac.destination);
    const squeeze = ac.createDynamicsCompressor();
    squeeze.threshold.value = -14; squeeze.knee.value = 10; squeeze.ratio.value = 3; squeeze.attack.value = 0.005; squeeze.release.value = 0.2;
    squeeze.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = 0.55; musicGain.connect(squeeze);
    sfxGain = ac.createGain(); sfxGain.gain.value = 2.2; sfxGain.connect(master);
    // A stone church: a long, soft reverb made from decaying noise.
    const reverb = ac.createConvolver(), len = ac.sampleRate * 3, imp = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5); }
    reverb.buffer = imp; reverbSend = ac.createGain(); reverbSend.gain.value = 0.5; reverbSend.connect(reverb); reverb.connect(master);
    const room = ac.createGain(); room.gain.value = 0.2; sfxGain.connect(room).connect(reverbSend);
    // The echo: the music repeating itself a dotted eighth later, darker each time.
    echoIn = ac.createGain(); echoDelay = ac.createDelay(2);
    const fb = ac.createGain(); fb.gain.value = 0.38; const dark = ac.createBiquadFilter(); dark.type = "lowpass"; dark.frequency.value = 2600;
    const wet = ac.createGain(); wet.gain.value = 0.45;
    echoIn.connect(echoDelay); echoDelay.connect(dark).connect(fb).connect(echoDelay); echoDelay.connect(wet).connect(musicGain);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // The consoles' short noise: a 93-step pattern from a shift register, for the hats.
    metal = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const md = metal.getChannelData(0); let reg = 1;
    for (let i = 0; i < md.length; i++) { if (i % 3 === 0) { const bit = (reg ^ (reg >> 6)) & 1; reg = (reg >> 1) | (bit << 14); } md[i] = reg & 1 ? 0.8 : -0.8; }
    if (wanted) { const w = wanted; wanted = null; play(w); }
  }
  function toggle() { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 0.05); if (Snd.onToggle) Snd.onToggle(on); }

  // ---- The instruments ----
  function pulseWave(duty) {
    const k = "p" + duty; if (waves[k]) return waves[k];
    const n = 48, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    for (let h = 1; h <= n; h++) re[h] = (2 * Math.sin(Math.PI * h * duty)) / (Math.PI * h);
    return (waves[k] = ac.createPeriodicWave(re, im));
  }
  function triWave() {
    if (waves.tri) return waves.tri;
    const N = 512, n = 32, re = new Float32Array(n + 1), im = new Float32Array(n + 1), w = [];
    for (let i = 0; i < N; i++) { const x = i / N, tri = x < 0.5 ? 4 * x - 1 : 3 - 4 * x; w.push(Math.round(tri * 7.5 + 7.5) / 7.5 - 1); }
    for (let h = 1; h <= n; h++) { let a = 0, b = 0; for (let i = 0; i < N; i++) { a += w[i] * Math.cos((2 * Math.PI * h * i) / N); b += w[i] * Math.sin((2 * Math.PI * h * i) / N); } re[h] = (2 * a) / N; im[h] = (2 * b) / N; }
    return (waves.tri = ac.createPeriodicWave(re, im));
  }
  const env = (g, t, level, attack, hold, release) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + attack); g.gain.setValueAtTime(level, t + Math.max(attack, hold)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release); };
  // A swept pulse: a sawtooth minus itself a moment later, the moment moving slowly.
  function sweptPulse(t, midi, rate, out) {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(mtof(midi), t);
    const period = 1 / mtof(midi), d = ac.createDelay(0.05); d.delayTime.setValueAtTime(period * 0.5, t);
    const lfo = ac.createOscillator(); lfo.frequency.value = rate; const depth = ac.createGain(); depth.gain.value = period * 0.3;
    lfo.connect(depth).connect(d.delayTime);
    const inv = ac.createGain(); inv.gain.value = -1;
    o.connect(out); o.connect(d).connect(inv).connect(out); lfo.start(t);
    return { o, lfo };
  }
  // Follin's chords: one voice switching notes `rate` times a second.
  function arpChord(t, dur, notes, o) {
    o = o || {};
    const osc = ac.createOscillator();
    if (o.tri) osc.setPeriodicWave(triWave()); else osc.setPeriodicWave(pulseWave(o.duty || 0.25));
    const every = 1 / (o.rate || 50); let k = 0;
    for (let at = t; at < t + dur; at += every, k++) osc.frequency.setValueAtTime(mtof(notes[k % notes.length]), at);
    const g = ac.createGain(); env(g, t, o.vol || 0.06, o.attack || 0.004, dur - (o.release || 0.03), o.release || 0.03);
    if (o.cutoff) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.cutoff; osc.connect(f).connect(g); } else osc.connect(g);
    g.connect(musicGain);
    if (o.echo) { const e = ac.createGain(); e.gain.value = o.echo; g.connect(e).connect(echoIn); }
    if (o.verb) { const v = ac.createGain(); v.gain.value = o.verb; g.connect(v).connect(reverbSend); }
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // The filter bass: a sawtooth through a resonant filter that snaps shut.
  function filterBass(midi, t, length, accent, bright) {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(mtof(midi), t);
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = accent ? 9 : 6;
    f.frequency.setValueAtTime((accent ? 1500 : 950) * (bright || 1), t); f.frequency.exponentialRampToValueAtTime(170, t + length);
    const g = ac.createGain(); g.gain.setValueAtTime(accent ? 0.4 : 0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + length * 0.96);
    o.connect(f).connect(g).connect(musicGain); o.start(t); o.stop(t + length + 0.02);
  }
  function triBass(midi, t, length, level) {
    const o = ac.createOscillator(); o.setPeriodicWave(triWave()); o.frequency.setValueAtTime(mtof(midi), t);
    const g = ac.createGain(); env(g, t, level || 0.28, 0.004, length * 0.8, length * 0.2 + 0.02);
    o.connect(g).connect(musicGain); o.start(t); o.stop(t + length + 0.05);
  }
  // A lead note: bent in from below or trilled, with late vibrato, into the echo.
  function lead(t, dur, midi, o) {
    o = o || {};
    const out = ac.createGain(), f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.cutoff || 5200;
    const g = ac.createGain(); env(g, t, o.vol || 0.1, 0.008, dur * 0.85, dur * 0.15 + 0.06);
    out.connect(f).connect(g).connect(musicGain);
    const e = ac.createGain(); e.gain.value = o.echo === undefined ? 0.35 : o.echo; g.connect(e).connect(echoIn);
    if (o.verb) { const v = ac.createGain(); v.gain.value = o.verb; g.connect(v).connect(reverbSend); }
    const v = sweptPulse(t, midi, o.sweep || 3, out), osc = v.o;
    if (o.glideFrom) { osc.frequency.setValueAtTime(mtof(o.glideFrom), t); osc.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.1); }
    else if (o.trill) { for (let k = 0, at = t; at < t + Math.min(dur * 0.55, 0.3); at += 0.035, k++) osc.frequency.setValueAtTime(mtof(k % 2 ? o.trill : midi), at); osc.frequency.setValueAtTime(mtof(midi), t + Math.min(dur * 0.55, 0.3)); }
    else if (o.bend) { osc.frequency.setValueAtTime(mtof(midi - o.bend), t); osc.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.05); }
    if (dur > 0.25) { const vib = ac.createOscillator(); vib.frequency.value = o.vibRate || 5.5; const amt = ac.createGain(); amt.gain.setValueAtTime(0, t); amt.gain.setValueAtTime(0, t + Math.min(0.22, dur * 0.4)); amt.gain.linearRampToValueAtTime(o.vibDepth || 14, t + Math.min(0.5, dur * 0.8)); vib.connect(amt).connect(osc.detune); vib.start(t); vib.stop(t + dur + 0.3); }
    osc.start(t); osc.stop(t + dur + 0.35); v.lfo.stop(t + dur + 0.35);
  }
  function kick(t, level) { const o = ac.createOscillator(); o.setPeriodicWave(triWave()); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.07); const g = ac.createGain(); g.gain.setValueAtTime(level || 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.22); }
  function noiseHit(t, type, freq, level, length, out, buf) { const s = ac.createBufferSource(); s.buffer = buf || noise; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ac.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + length); s.connect(f).connect(g).connect(out || musicGain); s.start(t, Math.random() * 0.5); s.stop(t + length + 0.02); }
  function snare(t, level) { noiseHit(t, "bandpass", 1900, (level || 1) * 0.3, 0.17); const o = ac.createOscillator(); o.setPeriodicWave(triWave()); o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06); const g = ac.createGain(); g.gain.setValueAtTime((level || 1) * 0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.1); }
  const hat = (t, open, level) => noiseHit(t, "highpass", 7000, level || (open ? 0.07 : 0.045), open ? 0.14 : 0.035, musicGain, metal);
  const crash = (t) => { noiseHit(t, "highpass", 4000, 0.11, 0.9); noiseHit(t, "highpass", 4000, 0.05, 1.2, reverbSend); };
  function tom(t, freq, level) { const o = ac.createOscillator(); o.setPeriodicWave(triWave()); o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.12); const g = ac.createGain(); g.gain.setValueAtTime(level || 0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.18); }
  function bell(t, base, level) { for (const [r, a, d] of [[0.5, 0.6, 3], [1, 1, 2.2], [1.2, 0.5, 1.6], [1.5, 0.4, 1.4], [2, 0.5, 1.2], [2.5, 0.25, 0.9], [3, 0.2, 0.7]]) { const o = ac.createOscillator(); o.frequency.value = base * r; const g = ac.createGain(); g.gain.setValueAtTime(level * a, t); g.gain.exponentialRampToValueAtTime(0.0005, t + d); o.connect(g); g.connect(musicGain); g.connect(reverbSend); o.start(t); o.stop(t + d + 0.05); } }

  // ---- The modes and the psalm tones ----
  // The eight church modes, as scales above their final.
  const MODES = { 1: [0, 2, 3, 5, 7, 9, 10], 3: [0, 1, 3, 5, 7, 8, 10], 5: [0, 2, 4, 5, 7, 9, 11], 7: [0, 2, 4, 5, 7, 9, 10] };
  // The psalm tones, each a short melody: intonation, reciting note, cadence.
  const TONES = {
    t1: [65, 67, 69, 69, 69, 71, 69, 67, 69, 69, 69, 67, 65, 64, 62],
    t2: [60, 62, 65, 65, 65, 64, 65, 62, 65, 65, 65, 64, 62, 60, 62],
    t3: [67, 69, 72, 72, 72, 74, 71, 72, 72, 72, 69, 72, 71, 69, 64],
    t4: [69, 67, 69, 69, 69, 71, 69, 67, 69, 69, 69, 67, 69, 65, 64],
    t5: [65, 69, 72, 72, 72, 74, 72, 72, 72, 72, 69, 72, 70, 72, 69],
    t6: [65, 67, 69, 69, 69, 67, 69, 65, 67, 69, 69, 69, 67, 65, 65],
    t7: [72, 71, 72, 74, 74, 74, 76, 74, 74, 74, 76, 74, 72, 71, 69],
    t8: [67, 69, 72, 72, 72, 74, 72, 72, 72, 72, 71, 72, 69, 67, 67],
    tp: [69, 71, 69, 69, 69, 67, 69, 69, 67, 67, 67, 65, 67, 64, 62],
  };
  // Every song: tempo; mode and final; four chord progressions (degrees of
  // the mode, one chord a bar); and how each part plays.
  //   drums: none, soft, half, drive, march, fire, tick
  //   bass: tri, walk, filter, march;  chords: gate, pad, box;  lead: bright, deep
  //   extra: wind, danger, bells, water, quake, brass
  const SONGS = {
    title:    { bpm: 96,  mode: 7, final: 67, tone: "t8", prog: [[0, 3, 4, 0], [0, 6, 3, 4]], drums: "none", bass: "tri", chords: "pad", lead: "deep", extra: ["bells"] },
    alley:    { bpm: 92,  mode: 3, final: 64, tone: "t3", prog: [[0, 1, 0, 6], [0, 5, 1, 0]], drums: "half", bass: "walk", chords: "pad", lead: "deep", cutoff: 1400, extra: ["creep"] },
    river:    { bpm: 104, mode: 5, final: 65, tone: "t6", prog: [[0, 3, 4, 0], [0, 5, 3, 4]], drums: "soft", bass: "tri", chords: "gate", gate: 1, lead: "bright", calm: true, extra: ["water"] },
    desert:   { bpm: 138, mode: 1, final: 62, tone: "t1", prog: [[0, 6, 5, 6], [0, 3, 4, 0]], drums: "drive", bass: "filter", fig: 0, chords: "gate", gate: 0, lead: "bright", lift: 2, extra: ["wind"] },
    abyss:    { bpm: 154, mode: 3, final: 64, tone: "t4", prog: [[0, 1, 0, 1], [0, 6, 1, 0]], drums: "fire", bass: "filter", fig: 2, chords: "gate", gate: 2, duty: 0.125, lead: "bright", trills: true, extra: ["danger"] },
    kings:    { bpm: 116, mode: 1, final: 62, tone: "t2", prog: [[0, 5, 6, 4], [0, 3, 6, 0]], drums: "march", bass: "march", chords: "pad", lead: "deep", extra: ["brass"] },
    heaven:   { bpm: 78,  mode: 5, final: 65, tone: "t5", prog: [[0, 3, 4, 0], [5, 3, 0, 4]], drums: "none", bass: "tri", chords: "pad", lead: "deep", bright: true, extra: ["bells", "water"] },
    mountain: { bpm: 132, mode: 1, final: 62, tone: "t7", prog: [[0, 6, 3, 4], [0, 5, 6, 4]], drums: "drive", bass: "filter", fig: 1, chords: "gate", gate: 0, lead: "bright", lift: 2, extra: ["quake"] },
    flames:   { bpm: 162, mode: 3, final: 64, tone: "t8", prog: [[0, 1, 6, 1], [0, 3, 1, 0]], drums: "fire", bass: "filter", fig: 2, chords: "gate", gate: 2, duty: 0.125, lead: "bright", trills: true, extra: ["danger"] },
    foes:     { bpm: 144, mode: 1, final: 62, tone: "tp", prog: [[0, 6, 5, 6], [0, 5, 6, 4]], drums: "drive", heavy: true, bass: "filter", fig: 0, chords: "gate", gate: 0, lead: "bright", trills: true, extra: ["brass"] },
    shield:   { bpm: 128, mode: 5, final: 65, tone: "t5", prog: [[0, 4, 5, 3], [0, 3, 4, 0]], drums: "drive", bass: "filter", fig: 1, chords: "gate", gate: 1, lead: "bright", lift: 2, extra: ["bells"] },
    dream:    { bpm: 68,  mode: 5, final: 65, tone: "t6", prog: [[0, 5, 3, 4], [0, 3, 0, 4]], drums: "none", bass: "tri", chords: "box", lead: "deep", soft: true, extra: ["bells"] },
    // The deep: a rolling bass, wind on the water, a swell of chords.
    sea:      { bpm: 112, mode: 1, final: 62, tone: "t2", prog: [[0, 6, 3, 4], [0, 5, 6, 0]], drums: "half", bass: "walk", chords: "gate", gate: 1, calm: true, lead: "deep", extra: ["wind", "water"] },
    // Lament: by the rivers of Babylon, in the pit. Slow, bare, no drums.
    lament:   { bpm: 64,  mode: 3, final: 64, tone: "tp", prog: [[0, 6, 5, 0], [0, 1, 3, 0]], drums: "none", bass: "tri", chords: "pad", lead: "deep", cutoff: 1500, extra: ["bells"] },
    // Praise him with trumpet and drum: bright, quick, every voice in.
    festival: { bpm: 140, mode: 5, final: 65, tone: "t8", prog: [[0, 3, 4, 0], [0, 5, 3, 4]], drums: "drive", heavy: true, bass: "filter", fig: 1, chords: "gate", gate: 1, lead: "bright", lift: 2, extra: ["bells", "brass"] },
    teeth:    { bpm: 126, mode: 3, final: 64, tone: "t3", prog: [[0, 1, 0, 6], [0, 1, 5, 1]], drums: "tick", bass: "walk", chords: "gate", gate: 2, duty: 0.125, lead: "deep", cutoff: 2400, extra: ["danger"] },
  };
  const scale = () => MODES[song.mode];
  function degree(d) { const t = scale(), o = Math.floor(d / 7); return song.final + 12 * o + t[((d % 7) + 7) % 7]; }
  function chord(root, lift) { const r = degree(root) + lift, th = degree(root + 2) + lift, fi = degree(root + 4) + lift; return fi - r === 7 ? [r, th, fi] : [r, th, r + 12]; }
  // Four bars to a section (a stage is short), four sections a round: A the
  // groove, B the psalm tone comes in as a lead, C a breakdown, D everything
  // (lifted a tone in the brighter songs).
  function place(n) {
    const bar = Math.floor(n / 16), section = Math.floor(bar / 4) % 4;
    const prog = song.prog[Math.floor(bar / 16) % song.prog.length];
    const lift = section === 3 ? (song.lift || 0) : 0;
    const root = prog[bar % 4];
    return { bar, section, s: n % 16, lift, notes: chord(root, lift) };
  }
  const nextTone = () => { const tn = TONES[song.tone]; return tn[leadIndex++ % tn.length]; };
  const FIGS = [
    { 0: [0, 1], 2: [12, 1], 3: [0, 1], 6: [0, 1], 7: [12, 1], 10: [0, 2], 12: [7, 1], 14: [12, 1], 15: [10, 1] },
    { 0: [0, 1], 2: [12, 1], 4: [0, 1], 6: [12, 1], 8: [0, 1], 10: [12, 1], 11: [0, 1], 12: [7, 1], 14: [12, 1] },
    { 0: [0, 2], 3: [0, 1], 5: [12, 1], 6: [0, 2], 9: [7, 1], 10: [12, 2], 13: [0, 1], 14: [10, 2] },
  ];
  const GATES = [
    [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1],
  ];
  const BRIGHT_LEAD = [[[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2], [16, 3], [19, 3], [22, 2], [24, 6], [30, 2]], [[0, 2], [2, 2], [4, 4], [8, 2], [10, 1], [11, 1], [12, 4], [16, 6], [22, 2], [24, 4], [28, 4]]];
  const DEEP_LEAD = [[[0, 8], [8, 4], [12, 4], [16, 12], [28, 4]], [[0, 6], [6, 2], [8, 8], [16, 8], [24, 8]]];

  function stepSong(t, n) {
    const S = song, P = place(n), s = P.s, X = S.extra || [];
    const bass = 36 + ((P.notes[0] - 36) % 12 + 12) % 12;
    const up = P.notes.map((x) => x + 12);
    const fillBar = P.bar % 4 === 3 && s >= 8, breakdown = P.section === 2;
    // Drums.
    switch (S.drums) {
      case "soft": if (!breakdown) { if (s === 0 || s === 8) kick(t, 0.35); if (s % 4 === 2) hat(t, false, 0.03); if (s === 12) noiseHit(t, "bandpass", 3000, 0.06, 0.05); } break;
      case "half": if (P.bar % 8 === 0 && s === 0) crash(t); if (s === 0 || s === 10) kick(t, 0.6); if (s === 8) { snare(t, 1); noiseHit(t, "bandpass", 1500, 0.07, 0.4, reverbSend); } if (s % 4 === 2) hat(t, false, 0.035); break;
      case "drive": case "fire":
        if (P.bar % 8 === 0 && s === 0) crash(t);
        if (breakdown) { if (s === 0) kick(t, 0.6); if (s % 4 === 2) hat(t, false, 0.03); break; }
        if (fillBar) { if (s % 2 === 0) tom(t, [220, 180, 150, 120][(s - 8) / 2]); if (s >= 12) snare(t, 0.6 + (s - 12) * 0.12); break; }
        if (S.drums === "fire") { if (s % 4 === 0 || s === 3 || s === 11) kick(t, 0.75); if (s === 4 || s === 12) snare(t, 1.1); hat(t, false, s % 2 ? 0.03 : 0.06); if (s === 14 || s === 15) tom(t, s === 14 ? 160 : 130, 0.3); }
        else { if (s === 0 || s === 6 || s === 10 || (S.heavy && s === 3)) kick(t); if (s === 4 || s === 12) snare(t); if (s === 14) hat(t, true); else if (s % 2 === 0 || S.heavy) hat(t, false, s % 4 === 2 ? 0.065 : 0.03); }
        break;
      case "march":
        if (P.bar % 8 === 0 && s === 0) crash(t);
        if (s === 0 || s === 8) kick(t, 0.65);
        if (s % 2 === 0) snare(t, s === 4 || s === 12 ? 0.9 : 0.35);
        if (P.bar % 4 === 3 && s >= 12) snare(t, 0.5 + (s - 12) * 0.15);
        if (s === 0 && P.bar % 2 === 0) tom(t, 110, 0.5);
        break;
      case "tick":
        hat(t, false, s % 4 === 0 ? 0.05 : 0.022);
        if (s === 0 || s === 9) kick(t, 0.55);
        if (s === 12) noiseHit(t, "bandpass", 2600, 0.12, 0.06);
        break;
    }
    // Bass.
    if (S.bass === "filter") {
      const fig = FIGS[S.fig || 0];
      if (breakdown) { if (s === 0) filterBass(bass, t, SIX * 14, false); }
      else if (fig[s]) filterBass(bass + fig[s][0], t, SIX * fig[s][1] * 1.6, s === 0 || s === 10, S.drums === "fire" ? 1.4 : 1);
    } else if (S.bass === "march") { if (s % 2 === 0) triBass(bass + (s % 8 === 6 ? 7 : 0), t, SIX * 1.6, 0.24); }
    else if (S.bass === "walk") { if (s % 4 === 0) { const w = S.mode === 3 ? [0, 1, 3, 7] : [0, 3, 5, 7]; triBass(bass + w[(s / 4 + P.bar) % 4], t, SIX * 3, 0.24); } }
    else { if (s === 0) triBass(bass, t, SIX * (S.bpm < 90 ? 15 : 7), 0.2); if (s === 8 && S.bpm >= 90) triBass(bass + 7, t, SIX * 7, 0.16); }
    // Chords.
    if (S.chords === "pad") {
      if (s === 0) arpChord(t, SIX * 16, up, { rate: S.bpm < 90 ? 22 : 30, duty: 0.5, vol: S.bright ? 0.045 : 0.035, cutoff: S.cutoff || (S.bright ? 3600 : 1900), attack: 0.2, release: 0.5, echo: 0.3, verb: 0.35 });
      if ((P.section === 1 || P.section === 3) && s % 2 === 0) { const run = [...up, up[0] + 12, up[1] + 12]; arpChord(t, SIX * 1.5, [run[(s / 2) % run.length] + 12], { duty: 0.125, vol: 0.026, echo: 0.45, cutoff: S.cutoff }); }
    } else if (S.chords === "box") {
      // A music box: a slow, high triangle arpeggio, rocking like a cradle.
      if (s % 2 === 0) { const run = [up[0], up[1], up[2], up[1] + 12, up[2], up[1]]; arpChord(t, SIX * 2.2, [run[(s / 2) % run.length] + 12], { tri: true, vol: 0.07, echo: 0.4, verb: 0.4, release: 0.25 }); }
      if (s === 0) arpChord(t, SIX * 16, up, { rate: 18, duty: 0.5, vol: 0.022, cutoff: 1500, attack: 0.4, release: 0.6, verb: 0.4 });
    } else {
      if (breakdown) { if (s === 0) arpChord(t, SIX * 16, up, { rate: 25, duty: 0.5, vol: 0.06, cutoff: 3000, echo: 0.3, attack: 0.1, release: 0.3 }); }
      else if (GATES[S.gate || 0][s]) arpChord(t, SIX * (S.calm ? 1.6 : 0.9), [...up, up[0] + 12], { rate: S.calm ? 40 : 50, duty: S.duty || [0.125, 0.25, 0.5][s % 3], vol: S.calm ? 0.045 : 0.06, echo: 0.2, cutoff: S.calm ? 3200 : 0 });
    }
    // The lead: the psalm tone, as a riff (bright) or in long gliding notes (deep).
    const inPhrase = n % 32;
    if (S.lead === "bright" && (P.section === 1 || P.section === 3)) {
      const shape = BRIGHT_LEAD[Math.floor(n / 32) % 2], hit = shape.find(([a]) => a === inPhrase);
      if (hit) {
        const p = nextTone() + 12 + P.lift, dur = hit[1] * SIX;
        lead(t, dur, p, { vol: S.calm ? 0.085 : 0.11, trill: S.trills && hit[1] >= 4 ? p + 1 : 0, bend: hit[1] >= 4 ? 2 : 1, cutoff: S.calm ? 3600 : 5200 });
        if (P.section === 3 && !S.calm) lead(t + SIX, dur, p + 12, { vol: 0.03, echo: 0.2, cutoff: 7000 });
        lastLead = p;
      }
    } else if (S.lead === "deep" && P.section !== 0) {
      const shape = DEEP_LEAD[Math.floor(n / 32) % 2], hit = shape.find(([a]) => a === inPhrase);
      if (hit) { const p = nextTone() + (S.soft ? 12 : 0); lead(t, hit[1] * SIX, p, { vol: S.soft ? 0.06 : 0.08, glideFrom: lastLead, echo: 0.55, vibDepth: 22, vibRate: 4.6, sweep: 1.5, cutoff: S.cutoff || 3200, verb: 0.2 }); lastLead = p; }
    }
    // The colour of the place.
    if (X.includes("bells") && s === 0 && P.bar % 2 === 0) bell(t, mtof(P.notes[0] + 12), 0.035);
    if (X.includes("water") && s % 2 === 1 && P.section !== 2) arpChord(t, SIX * 0.8, [up[(s >> 1) % 3] + 24], { tri: true, vol: 0.03, echo: 0.5 });
    if (X.includes("wind") && s === 0 && P.bar % 2 === 0) noiseHit(t, "bandpass", 600 + Math.random() * 900, 0.09, SIX * 28, musicGain);
    if (X.includes("danger")) {
      // Over the fire: a low rumble, and a clash of the tritone at each bar.
      if (s === 0) { noiseHit(t, "lowpass", 160, 0.25, SIX * 15); arpChord(t, SIX * 2, [P.notes[0] + 6, P.notes[0] + 12], { rate: 60, duty: 0.25, vol: 0.05, echo: 0.3 }); }
      if (s === 8 && P.bar % 2) arpChord(t, SIX * 1, [P.notes[0] + 25], { duty: 0.125, vol: 0.04, echo: 0.4 });
    }
    if (X.includes("quake") && s === 0 && P.bar % 2 === 1) { tom(t, 70, 0.6); noiseHit(t, "lowpass", 120, 0.3, 0.6); }
    if (X.includes("brass") && (s === 0 || s === 3) && P.bar % 2 === 0 && !breakdown) arpChord(t, SIX * (s ? 1 : 2.5), up, { rate: 60, duty: 0.5, vol: 0.05, cutoff: 2200, echo: 0.2 });
    if (X.includes("creep") && (s === 6 || s === 14)) arpChord(t, SIX * 0.6, [P.notes[1] + 24], { duty: 0.125, vol: 0.03, echo: 0.5 });
  }

  function update() {
    if (!ac || !song || !on) return;
    const horizon = ac.currentTime + 0.2;
    if (gridTime < ac.currentTime) gridTime = ac.currentTime + 0.05;
    while (gridTime < horizon) {
      stepSong(gridTime, step);
      gridTime += SIX; step++;
      if (pending && step % 16 === 0) { start(pending); }
    }
  }
  function start(key) {
    song = SONGS[key]; song.key = key; pending = null; step = 0; leadIndex = 0; lastLead = null;
    SIX = 60 / song.bpm / 4;
    echoDelay.delayTime.setValueAtTime(60 / song.bpm * 0.75, ac.currentTime);
  }
  // Play a song: at once if none is playing, otherwise from the next bar.
  function play(key) {
    if (!SONGS[key]) return;
    if (!ac) { wanted = key; return; }
    if (!song) { start(key); gridTime = ac.currentTime + 0.08; }
    else if (song.key !== key) pending = key;
  }
  function stop() { song = null; pending = null; }
  // A note that belongs to the music: a tone of the chord now sounding,
  // placed on the next sixteenth, for St. Cecilia's notes.
  let noteTurn = 0;
  function note() {
    if (!ac || !on) return;
    const t = song ? Math.max(ac.currentTime + 0.01, gridTime - SIX * Math.floor((gridTime - ac.currentTime) / SIX)) : ac.currentTime;
    const ch = song ? place(step).notes : [72, 76, 79];
    const p = ch[noteTurn++ % 3] + 24;
    lead(t, 0.22, p, { vol: 0.09, echo: 0.5, bend: 0, cutoff: 6000 });
  }

  // Sound effects, on their own bus over the music.
  function tone(f, len, type, vol, slide, at) {
    if (!ac) return;
    const t = at || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    if (type === "square") o.setPeriodicWave(pulseWave(0.5)); else o.type = type || "triangle";
    o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.connect(g).connect(sfxGain); o.start(t); o.stop(t + len + 0.02);
  }
  function fxNoise(len, vol, freq) { if (ac) noiseHit(ac.currentTime, "bandpass", freq || 1200, vol || 0.2, len, sfxGain); }
  function sfx(n) {
    if (!ac || !on) return;
    const now = ac.currentTime;
    switch (n) {
      case "jump": tone(330, 0.12, "square", 0.08, 660); break;
      case "float": tone(880, 0.08, "triangle", 0.06, 990); break;
      case "bounce": tone(220, 0.2, "square", 0.1, 880); break;
      case "throw": tone(990, 0.06, "square", 0.06, 1500); break;
      case "smite": fxNoise(0.15, 0.3, 900); tone(180, 0.15, "square", 0.09, 90); break;
      case "neume": tone(1320, 0.08, "triangle", 0.12); tone(1980, 0.12, "triangle", 0.09, 0, now + 0.06); break;
      case "hurt": tone(220, 0.3, "sawtooth", 0.12, 70); fxNoise(0.2, 0.18, 400); break;
      case "shield": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.09, 0, now + i * 0.07)); break;
      case "block": tone(1500, 0.12, "triangle", 0.1, 700); break;
      case "rod": fxNoise(0.5, 0.4, 300); tone(90, 0.5, "square", 0.12, 40); break;
      case "rise": fxNoise(0.4, 0.18, 200); break;
      case "win": [392, 494, 587, 784].forEach((f, i) => tone(f, 0.5, "triangle", 0.12, 0, now + i * 0.15)); break;
      case "select": tone(660, 0.07, "square", 0.07); break;
      case "pickup": tone(440, 0.08, "triangle", 0.1, 660); break;
      case "drop": tone(200, 0.1, "square", 0.08, 120); fxNoise(0.06, 0.12, 500); break;
      case "splash": fxNoise(0.25, 0.25, 2400); tone(1760, 0.1, "triangle", 0.06, 2600); break;
      case "door": fxNoise(0.3, 0.15, 300); tone(150, 0.25, "triangle", 0.1, 110); break;
      case "bleat": tone(520, 0.08, "sawtooth", 0.06, 470); tone(500, 0.18, "sawtooth", 0.06, 420, now + 0.08); break;
      case "power": [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.45, "triangle", 0.1, 0, now + i * 0.09)); break;
      case "verse": tone(1175, 0.5, "triangle", 0.05); tone(1568, 0.6, "triangle", 0.04, 0, now + 0.12); break;
      case "step": fxNoise(0.03, 0.05, 700); break;
    }
  }
  return { init, toggle, sfx, play, stop, update, note, get on() { return on; }, set on(v) { on = v; }, SONGS };
})();
