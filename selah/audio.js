"use strict";
// SELAH: the band. This is the synth engine from Luminaries (../luminaries/audio.js), brought
// over whole: drums, basses, keys, pads, choirs, a mixing desk with a reverb, a ping-pong delay,
// sidechain pumping from the kick, and a compressor and limiter on the master. Added for SELAH:
// a crash cymbal, a tambourine and tape hiss; the exact time a song begins (the chart is timed
// from it); pause; and the player's own sounds (A.hit and its kin), which go straight to the
// master on the effects bus, unpumped, the instant a word is struck.
const Sound = (() => {
  let ac = null, out, pre, musicGain, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, noiseBuf = null, shaperNode;
  const A = { muted: false };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.mtof = mtof;
  A.ctx = () => ac;
  A.now = () => (ac ? ac.currentTime : performance.now() / 1000);

  // ---- The desk ----------------------------------------------------------------------------
  function softClip(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * (k || 1.2)) / Math.tanh(k || 1.2); }
    return c;
  }
  function impulse(secs, decay) {
    const r = ac.sampleRate, len = Math.floor(r * secs), b = ac.createBuffer(2, len, r);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) {
        const u = i / len, k = 0.25 + 0.7 * (1 - u);   // darker as it dies away
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.pow(1 - u, decay) * (i < r * 0.012 ? i / (r * 0.012) : 1);
      }
    }
    return b;
  }
  A.init = function () {
    // On iPhones, play as media, so the side switch that silences the ringer does not silence the music.
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { }
    // Safari can leave the sound "suspended" or "interrupted" (a call, a notification, another app): wake it.
    if (ac) { if (!A.held && ac.state !== "running" && ac.state !== "closed") ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    build(new C({ latencyHint: "interactive" }));
    setInterval(tick, 25);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !A.held && ac && ac.state !== "running" && ac.state !== "closed") ac.resume(); });
  };
  function build(context) {
    ac = context;
    out = ac.createGain(); out.gain.value = A.muted ? 0 : 0.9; out.connect(ac.destination);
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -2.5; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.06;
    limiter.connect(out);
    const glue = ac.createDynamicsCompressor();
    glue.threshold.value = -18; glue.knee.value = 8; glue.ratio.value = 2.5; glue.attack.value = 0.012; glue.release.value = 0.16;
    glue.connect(limiter);
    const sat = ac.createWaveShaper(); sat.curve = softClip(1.1); sat.oversample = "2x"; sat.connect(glue);
    // A little air on top, and the mud taken out of the low middle, as a mastering engineer would.
    const air = ac.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 6500; air.gain.value = 8; air.connect(sat);
    const mud = ac.createBiquadFilter(); mud.type = "peaking"; mud.frequency.value = 320; mud.Q.value = 0.9; mud.gain.value = -3; mud.connect(air);
    pre = ac.createGain(); pre.gain.value = 0.75; pre.connect(mud);
    musicGain = ac.createGain(); musicGain.connect(pre);
    lpf = ac.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 20000; lpf.Q.value = 0.7; lpf.connect(musicGain);
    duck = ac.createGain(); duck.connect(lpf);
    drumBus = ac.createGain(); drumBus.connect(lpf);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(pre);
    // The hall: a long, dark reverb (it pumps with the kick, like everything else).
    const conv = ac.createConvolver(); conv.buffer = impulse(2.8, 2.4);
    revIn = ac.createGain(); const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 220;
    revIn.connect(hp); hp.connect(conv); const rv = ac.createGain(); rv.gain.value = 0.8; conv.connect(rv); rv.connect(duck);
    // The echo: dotted eighths, left and right, darker each time round.
    dlyIn = ac.createGain(); dlyL = ac.createDelay(2); dlyR = ac.createDelay(2);
    const fb = ac.createGain(); fb.gain.value = 0.42; const dlp = ac.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 3200;
    const pl = ac.createStereoPanner(); pl.pan.value = -0.75; const pr = ac.createStereoPanner(); pr.pan.value = 0.75;
    dlyIn.connect(dlyL); dlyL.connect(pl); dlyL.connect(dlyR); dlyR.connect(pr); dlyR.connect(dlp); dlp.connect(fb); fb.connect(dlyL);
    const dg = ac.createGain(); dg.gain.value = 0.55; pl.connect(dg); pr.connect(dg); dg.connect(duck);
    // White noise, made once.
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    shaperNode = ac.createWaveShaper(); shaperNode.curve = softClip(2.2); const sg = ac.createGain(); sg.gain.value = 0.7; shaperNode.connect(sg); sg.connect(duck);
  }
  // For testing the mix: render a song offline, at a given intensity, and return the samples.
  A.render = async function (song, secs, level) {
    const live = { ac, out, pre, musicGain, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, noiseBuf, shaperNode, M: Object.assign({}, M), duckDepth };
    const off = new OfflineAudioContext(2, Math.ceil(44100 * secs), 44100);
    const wasMuted = A.muted; A.muted = false;
    build(off); A.muted = wasMuted;
    M.song = song; M.next = null; M.step = 0; M.bar = 0; M.stepT = 0.05; M.barT = 0.05; M.level = level || 0; M.fill = null; M.fillNext = null;
    duckDepth = song.duck === undefined ? 0.5 : song.duck; dlyL.delayTime.value = dlyR.delayTime.value = song.delay || (60 / song.bpm) * 0.75;
    schedule(secs - 0.3);
    ({ ac, out, pre, musicGain, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, noiseBuf, shaperNode, duckDepth } = live);
    Object.assign(M, live.M);
    const buf = await off.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  };
  A.setMute = function (m) { A.muted = m; if (out) out.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05); };
  // The music muffled (paused, or lost): the low-pass closes.
  A.muffle = function (on, secs) { if (lpf) lpf.frequency.setTargetAtTime(on ? 520 : 20000, ac.currentTime, secs || 0.15); };
  A.setDelay = function (secs) { if (dlyL) { dlyL.delayTime.setTargetAtTime(secs, ac.currentTime, 0.05); dlyR.delayTime.setTargetAtTime(secs, ac.currentTime, 0.05); } };
  // The kick pushes everything else down for a moment (the pump).
  let duckDepth = 0.5;
  function pump(t, depth, rel) {
    const g = duck.gain, d = depth === undefined ? duckDepth : depth;
    if (d <= 0) return;
    g.setValueAtTime(1 - d, t); g.linearRampToValueAtTime(1, t + (rel || 0.2));
  }

  // ---- Building blocks ---------------------------------------------------------------------------
  function osc(type, f, t) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o; }
  function gainAt(t, v) { const g = ac.createGain(); g.gain.setValueAtTime(v === undefined ? 0 : v, t); return g; }
  function noise(t, dur) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }
  function filt(type, f, q, t) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.setValueAtTime(f, t || 0); if (q !== undefined) b.Q.value = q; return b; }
  // Send a voice to the mix: panned, to the bus (pumped) or the drums, and to the hall and the echo.
  function route(node, t, o) {
    o = o || {};
    let n = node;
    if (o.pan) { const p = ac.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; }
    n.connect(o.drum ? drumBus : o.sfx ? sfxBus : duck);
    if (o.rev) { const g = gainAt(t, o.rev); n.connect(g); g.connect(revIn); }
    if (o.dly) { const g = gainAt(t, o.dly); n.connect(g); g.connect(dlyIn); }
    if (o.drive) { const g = gainAt(t, o.drive); n.connect(g); g.connect(shaperNode); }
  }
  // A plain envelope that is safe to schedule ahead: attack, hold, exponential release.
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + Math.max(a, 0.002));
    g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }

  // ---- The instruments ------------------------------------------------------------------------
  const I = {};
  I.kick = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const o1 = osc("sine", o.punch || 160, t), g = gainAt(t);
    o1.frequency.exponentialRampToValueAtTime(o.tone || 48, t + (o.sweep || 0.07));
    env(g, t, 0.002, 0.95 * v, 0.03, o.decay || 0.38);
    o1.connect(g); route(g, t, { drum: true, drive: o.drive || 0.25 });
    o1.start(t); o1.stop(t + 0.6);
    // The click of the beater.
    const n = noise(t, 0.02), hp = filt("highpass", 2500, 0.7, t), gn = gainAt(t); env(gn, t, 0.001, 0.25 * v * (o.click === undefined ? 1 : o.click), 0.002, 0.012);
    n.connect(hp); hp.connect(gn); route(gn, t, { drum: true });
    if (o.pump !== false) pump(t, o.pumpDepth, o.pumpRel);
  };
  I.snare = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 0.3), bp = filt("bandpass", o.f || 1900, 0.7, t), g = gainAt(t); env(g, t, 0.001, 0.55 * v, 0.01, o.decay || 0.17);
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, rev: o.rev === undefined ? 0.22 : o.rev, pan: o.pan });
    const b = osc("triangle", 200, t), gb = gainAt(t); b.frequency.exponentialRampToValueAtTime(150, t + 0.08); env(gb, t, 0.001, 0.45 * v, 0.005, 0.09);
    b.connect(gb); route(gb, t, { drum: true }); b.start(t); b.stop(t + 0.2);
  };
  I.clap = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 0.4), bp = filt("bandpass", o.f || 1150, 1.1, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t);
    for (const k of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.7 * v, t + k); g.gain.exponentialRampToValueAtTime(0.08 * v, t + k + 0.009); }
    g.gain.setValueAtTime(0.6 * v, t + 0.032); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032 + (o.decay || 0.2));
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, rev: o.rev === undefined ? 0.35 : o.rev, pan: o.pan });
  };
  I.hat = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 0.4), hp = filt("highpass", o.f || 7600, 0.8, t), g = gainAt(t);
    env(g, t, 0.001, (o.open ? 0.5 : 0.7) * v, 0.002, o.open ? 0.28 : o.decay || 0.045);
    n.connect(hp); hp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? 0.18 : o.pan, rev: o.rev });
  };
  I.shaker = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 0.2), bp = filt("bandpass", 6000, 1.4, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? -0.35 : o.pan });
  };
  I.rim = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const a = osc("square", o.f || 1700, t), bp = filt("bandpass", o.f || 1700, 6, t), g = gainAt(t); env(g, t, 0.001, 0.3 * v, 0.002, 0.04);
    a.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? -0.25 : o.pan, rev: 0.15 }); a.start(t); a.stop(t + 0.08);
  };
  I.tom = function (t, midi, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const a = osc("sine", mtof(midi) * 1.6, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.05);
    env(g, t, 0.002, 0.6 * v, 0.02, o.decay || 0.3); a.connect(g); route(g, t, { drum: true, pan: o.pan, rev: 0.2 }); a.start(t); a.stop(t + 0.5);
  };
  // A woody little hit, tuned: congas, woodblocks, the palmas' tock.
  I.perc = function (t, midi, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const a = osc("sine", mtof(midi) * 2, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.02);
    env(g, t, 0.001, 0.4 * v, 0.005, o.decay || 0.12); a.connect(g); route(g, t, { drum: true, pan: o.pan, rev: o.rev || 0.15 }); a.start(t); a.stop(t + 0.3);
  };
  // Basses.
  I.bass = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), kind = o.kind || "pluck", end = t + dur;
    const g = gainAt(t), lp = filt("lowpass", 200, kind === "reese" ? 1 : o.q || 9, t);
    const oscs = [];
    if (kind === "sub") { const a = osc("sine", f, t); oscs.push(a); a.connect(g); }
    else if (kind === "reese") { for (const c of [-11, 11]) { const a = osc("sawtooth", f, t); a.detune.value = c; a.connect(lp); oscs.push(a); } const s = osc("sine", f, t); s.connect(g); oscs.push(s); lp.connect(g); }
    else { const a = osc(kind === "square" ? "square" : "sawtooth", f, t), s = osc("sine", f, t); a.connect(lp); s.connect(g); oscs.push(a, s); lp.connect(g); }
    if (o.glide) { for (const a of oscs) { a.frequency.setValueAtTime(mtof(o.glide), t); a.frequency.exponentialRampToValueAtTime(f, t + 0.08); } }
    if (kind === "reese") lp.frequency.setValueAtTime(o.cut || 420, t);
    else if (kind !== "sub") { lp.frequency.setValueAtTime(o.cut || 2400, t); lp.frequency.exponentialRampToValueAtTime(o.floor || 180, t + (o.fd || 0.16)); }
    const pk = 0.42 * v;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.004);
    g.gain.setTargetAtTime(pk * (o.sus === undefined ? 0.65 : o.sus), t + 0.01, 0.08);
    g.gain.setValueAtTime(pk * (o.sus === undefined ? 0.65 : o.sus), Math.max(t + 0.02, end - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
    route(g, t, { drive: o.drive === undefined ? 0.35 : o.drive });
    for (const a of oscs) { a.start(t); a.stop(end + 0.1); }
  };
  // The keys: an electric piano made by FM, a bark when struck, a bell on top.
  I.keys = function (t, notes, dur, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    for (const [i, m] of notes.entries()) {
      const f = mtof(m), car = osc("sine", f, t), mod = osc("sine", f, t), mg = gainAt(t, f * (o.bark || 2.2)), tine = osc("sine", f * 14, t), tg = gainAt(t, f * 0.9);
      mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.25); tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
      mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
      const g = gainAt(t); env(g, t, 0.003, 0.32 * v, Math.max(0.01, dur * 0.6), dur * 0.8 + 0.2);
      car.connect(g); route(g, t, { pan: (i % 2 ? 0.28 : -0.28) * (o.spread === undefined ? 1 : o.spread), rev: o.rev === undefined ? 0.2 : o.rev, dly: o.dly });
      for (const a of [car, mod, tine]) { a.start(t); a.stop(t + dur * 1.6 + 0.4); }
    }
  };
  // The pad: a supersaw, five voices to a note, spread across the stereo field.
  I.pad = function (t, notes, dur, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    const lp = filt("lowpass", o.cut || 3200, 0.6, t), g = gainAt(t);
    if (o.sweep) { lp.frequency.setValueAtTime(o.cut || 1800, t); lp.frequency.exponentialRampToValueAtTime(o.sweep, t + dur); }
    const att = o.att === undefined ? 0.12 : o.att, rel = o.rel === undefined ? 0.35 : o.rel;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + att); g.gain.setValueAtTime(0.16 * v, t + Math.max(att, dur - 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    lp.connect(g); route(g, t, { rev: o.rev === undefined ? 0.35 : o.rev, dly: o.dly });
    const det = o.voices === 3 ? [-10, 0, 10] : [-16, -7, 0, 7, 16];
    for (const m of notes) for (const [k, c] of det.entries()) {
      const a = osc(o.wave || "sawtooth", mtof(m), t); a.detune.value = c + (Math.random() - 0.5) * 3;
      const p = ac.createStereoPanner(); p.pan.value = (k / (det.length - 1) - 0.5) * 1.4 * (o.width === undefined ? 1 : o.width);
      a.connect(p); p.connect(lp); a.start(t); a.stop(t + dur + rel + 0.1);
    }
  };
  // A plucked synth: arps, guitars, harps (with a soft filter), clavinet (with a sharp one).
  I.pluck = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), a = osc(o.wave || "sawtooth", f, t), lp = filt("lowpass", o.cut || 5200, o.q === undefined ? 4 : o.q, t), g = gainAt(t);
    lp.frequency.exponentialRampToValueAtTime(o.floor || 420, t + (o.fd || 0.18));
    env(g, t, 0.002, 0.3 * v, 0.005, o.decay || Math.max(0.12, dur));
    a.connect(lp); lp.connect(g);
    if (o.sub) { const s = osc("sine", f / 2, t); const sg = gainAt(t); env(sg, t, 0.002, 0.15 * v, 0.005, o.decay || dur); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + dur + 0.6); }
    route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.18 : o.rev, dly: o.dly === undefined ? 0.25 : o.dly });
    a.start(t); a.stop(t + (o.decay || dur) + 0.6);
  };
  // A brass-and-synth stab.
  I.stab = function (t, notes, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    const lp = filt("lowpass", o.cut || 3600, 2, t), g = gainAt(t); lp.frequency.exponentialRampToValueAtTime(o.floor || 700, t + 0.22);
    env(g, t, 0.006, 0.34 * v, o.hold || 0.06, o.decay || 0.22); lp.connect(g); route(g, t, { rev: o.rev === undefined ? 0.25 : o.rev, dly: o.dly });
    for (const m of notes) for (const c of [-8, 8]) { const a = osc("sawtooth", mtof(m), t); a.detune.value = c; a.connect(lp); a.start(t); a.stop(t + 0.7); }
  };
  // A bell, by FM: glass, music boxes, the chime of a square made.
  I.bell = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), car = osc("sine", f, t), mod = osc("sine", f * (o.ratio || 3.5), t), mg = gainAt(t, f * (o.index || 3));
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + (dur || 1));
    mod.connect(mg); mg.connect(car.frequency);
    const g = gainAt(t); env(g, t, 0.002, 0.22 * v, 0.005, dur || 1.2);
    car.connect(g); route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.4 : o.rev, dly: o.dly === undefined ? 0.2 : o.dly, sfx: o.sfx });
    car.start(t); mod.start(t); car.stop(t + (dur || 1.2) + 0.3); mod.stop(t + (dur || 1.2) + 0.3);
  };
  // The choir: a sung vowel, made from formants over a breathing sawtooth.
  const VOWELS = { a: [[800, 1], [1150, 0.5], [2900, 0.25]], o: [[450, 1], [800, 0.45], [2830, 0.15]], u: [[325, 1], [700, 0.3], [2700, 0.1]], e: [[400, 1], [1600, 0.5], [2700, 0.25]], i: [[270, 1], [2140, 0.3], [2950, 0.2]] };
  I.choir = function (t, notes, dur, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    const vw = VOWELS[o.vowel || "a"], g = gainAt(t), att = o.att === undefined ? 0.18 : o.att;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + att); g.gain.setValueAtTime(0.5 * v, t + Math.max(att, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.rel || 0.4));
    const sum = ac.createGain();
    for (const [f, k] of vw) { const bp = filt("bandpass", f * (o.formant || 1), 8, t), fg = gainAt(t, k * 3); sum.connect(bp); bp.connect(fg); fg.connect(g); }
    const lfo = osc("sine", 5.1, t), lg = gainAt(t, o.vib === undefined ? 9 : o.vib); lfo.connect(lg);
    for (const [i, m] of notes.entries()) for (const c of [-7, 6]) {
      const a = osc("sawtooth", mtof(m), t); a.detune.value = c; lg.connect(a.detune);
      if (o.glide) { a.frequency.setValueAtTime(mtof(o.glide), t); a.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.09); }
      const p = ac.createStereoPanner(); p.pan.value = (i % 2 ? 0.3 : -0.3) * (c > 0 ? 1 : -1) * 0.6; a.connect(p); p.connect(sum);
      a.start(t); a.stop(t + dur + (o.rel || 0.4) + 0.1);
    }
    lfo.start(t); lfo.stop(t + dur + (o.rel || 0.4) + 0.1);
    route(g, t, { rev: o.rev === undefined ? 0.55 : o.rev, dly: o.dly, pan: o.pan });
  };
  // A lead line: saw and square, gliding from the last note.
  I.lead = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), lp = filt("lowpass", o.cut || 2600, o.q || 3, t), g = gainAt(t);
    if (o.env !== false) { lp.frequency.setValueAtTime((o.cut || 2600) * 1.8, t); lp.frequency.exponentialRampToValueAtTime(o.cut || 2600, t + 0.15); }
    const att = o.att || 0.01;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + att); g.gain.setValueAtTime(0.22 * v, t + Math.max(att, dur - 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.rel || 0.12));
    lp.connect(g); route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.25 : o.rev, dly: o.dly === undefined ? 0.3 : o.dly });
    const waves = o.waves || ["sawtooth", "square"];
    const lfo = o.vib ? osc("sine", 5.5, t) : null, lg = lfo ? gainAt(t, 0) : null;
    if (lfo) { lg.gain.linearRampToValueAtTime(o.vib, t + Math.min(0.4, dur)); lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.3); }
    for (const [i, w] of waves.entries()) {
      const a = osc(w, f * (i === 1 && o.oct ? 2 : 1), t); a.detune.value = i ? 7 : -7;
      if (o.glide) { a.frequency.setValueAtTime(mtof(o.glide) * (i === 1 && o.oct ? 2 : 1), t); a.frequency.exponentialRampToValueAtTime(f * (i === 1 && o.oct ? 2 : 1), t + (o.glideT || 0.07)); }
      if (lg) lg.connect(a.detune);
      const ga = gainAt(t, i ? 0.5 : 1); a.connect(ga); ga.connect(lp); a.start(t); a.stop(t + dur + (o.rel || 0.12) + 0.1);
    }
  };
  // A cut-up vocal: a pitched "ah" or "oh", short, the way a producer chops a singer.
  I.vox = function (t, midi, dur, v, o) {
    o = o || {};
    I.choir(t, [midi], dur, (v === undefined ? 1 : v) * 0.8, { vowel: o.vowel || "a", att: 0.006, rel: 0.06, vib: 3, rev: o.rev === undefined ? 0.25 : o.rev, dly: o.dly === undefined ? 0.3 : o.dly, formant: o.formant || 1.15, glide: o.glide });
  };
  // A mallet on wood or metal: the note, and a high partial for the knock that dies at once
  // (marimba with the fourth partial; kalimba, celesta and the like with others).
  I.mallet = function (t, midi, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), dec = o.decay || 0.45, sum = ac.createGain();
    const a = osc("sine", f, t), g = gainAt(t); env(g, t, 0.002, 0.42 * v, 0.004, dec);
    const b = osc("sine", f * (o.partial || 3.93), t), gb = gainAt(t); env(gb, t, 0.001, (o.knock === undefined ? 0.2 : o.knock) * v, 0.002, dec * (o.ring || 0.16));
    a.connect(g); b.connect(gb); g.connect(sum); gb.connect(sum);
    route(sum, t, { pan: o.pan, rev: o.rev === undefined ? 0.18 : o.rev, dly: o.dly });
    for (const x of [a, b]) { x.start(t); x.stop(t + dec + 0.1); }
  };
  // An organ: drawbars of pure tones on every note, the click of a key, and the slow wobble of a
  // turning speaker. `bars` are [harmonic, level] (a reed organ, an accordion, are other settings).
  I.organ = function (t, notes, dur, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    const bars = o.bars || [[1, 1], [2, 0.7], [3, 0.45], [4, 0.35], [6, 0.18], [8, 0.12]];
    const g = gainAt(t), att = o.att || 0.008, rel = o.rel || 0.08;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * v, t + att);
    g.gain.setValueAtTime(0.2 * v, t + Math.max(att, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    const lfo = osc("sine", o.leslie || 6.2, t), lg = gainAt(t, o.wobble === undefined ? 6 : o.wobble); lfo.connect(lg);
    for (const m of notes) for (const [h, k] of bars) {
      const a = osc(o.wave || "sine", mtof(m) * h, t), ga = gainAt(t, (k / bars.length) * 2.2);
      lg.connect(a.detune); a.connect(ga); ga.connect(g); a.start(t); a.stop(t + dur + rel + 0.1);
    }
    lfo.start(t); lfo.stop(t + dur + rel + 0.1);
    if (o.click !== false) { const n = noise(t, 0.012), hp = filt("highpass", 3000, 0.7, t), gn = gainAt(t); env(gn, t, 0.001, 0.08 * v, 0.001, 0.008); n.connect(hp); hp.connect(gn); route(gn, t, { pan: o.pan }); }
    route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.22 : o.rev, dly: o.dly });
  };
  // A flute or a whistle: a pure tone with its octave, a breath of noise, a vibrato coming in late.
  I.flute = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), g = gainAt(t), att = o.att || 0.025, rel = o.rel || 0.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26 * v, t + att);
    g.gain.setValueAtTime(0.26 * v, t + Math.max(att, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    const a = osc(o.wave || "sine", f, t), h = osc("sine", f * 2, t), hg = gainAt(t, o.bright || 0.12);
    const lfo = osc("sine", 5.4, t), lg = gainAt(t, 0); lg.gain.linearRampToValueAtTime(o.vib === undefined ? 14 : o.vib, t + Math.min(0.3, dur + 0.05));
    lfo.connect(lg); lg.connect(a.detune); lg.connect(h.detune);
    if (o.glide) for (const [x, k] of [[a, 1], [h, 2]]) { x.frequency.setValueAtTime(mtof(o.glide) * k, t); x.frequency.exponentialRampToValueAtTime(f * k, t + 0.06); }
    a.connect(g); h.connect(hg); hg.connect(g);
    const n = noise(t, dur + 0.1), bp = filt("bandpass", f * 2, 2, t), ng = gainAt(t); env(ng, t, 0.01, (o.breath || 0.1) * v, Math.max(0.01, dur * 0.5), 0.08);
    n.connect(bp); bp.connect(ng);
    route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.3 : o.rev, dly: o.dly === undefined ? 0.15 : o.dly }); route(ng, t, { pan: o.pan, rev: 0.2 });
    for (const x of [a, h, lfo]) { x.start(t); x.stop(t + dur + rel + 0.1); }
  };
  // A drop of water, a bubble: a pure tone that leaps up as it ends.
  I.bloop = function (t, midi, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), d = o.dur || 0.09, a = osc("sine", f * (o.from || 0.7), t), g = gainAt(t);
    a.frequency.exponentialRampToValueAtTime(f * (o.to || 1.6), t + d);
    env(g, t, 0.003, 0.42 * v, 0.01, d);
    a.connect(g); route(g, t, { pan: o.pan, rev: o.rev === undefined ? 0.25 : o.rev, dly: o.dly === undefined ? 0.3 : o.dly });
    a.start(t); a.stop(t + d + 0.1);
  };
  // Transitions: a riser into a change, an impact on its downbeat, a swell, a falling sweep.
  I.riser = function (t, dur, v) {
    v = v === undefined ? 1 : v;
    const n = noise(t, dur), bp = filt("bandpass", 300, 3, t), g = gainAt(t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
    n.connect(bp); bp.connect(g); route(g, t, { rev: 0.4, pan: 0 });
    const a = osc("sawtooth", 110, t), lp = filt("lowpass", 900, 1, t), ga = gainAt(t);
    a.frequency.exponentialRampToValueAtTime(880, t + dur); ga.gain.setValueAtTime(0.0001, t); ga.gain.exponentialRampToValueAtTime(0.06 * v, t + dur); ga.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
    a.connect(lp); lp.connect(ga); route(ga, t, { rev: 0.3 }); a.start(t); a.stop(t + dur + 0.1);
  };
  I.impact = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const a = osc("sine", 90, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(32, t + 0.9);
    env(g, t, 0.003, 0.8 * v, 0.05, 1.2); a.connect(g); route(g, t, { drum: true, rev: 0.4, drive: 0.4, sfx: o.sfx });
    const n = noise(t, 1.5), lp = filt("lowpass", 1800, 0.7, t), gn = gainAt(t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    env(gn, t, 0.002, 0.35 * v, 0.02, 1.3); n.connect(lp); lp.connect(gn); route(gn, t, { drum: true, rev: 0.6, sfx: o.sfx });
    a.start(t); a.stop(t + 1.6);
  };
  I.swell = function (t, dur, v) {
    const n = noise(t, dur), hp = filt("highpass", 3000, 0.7, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 * (v || 1), t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    n.connect(hp); hp.connect(g); route(g, t, { rev: 0.5, pan: 0.2 });
  };
  // A crash: a long wash of bright noise (the cymbals of Psalm 150).
  I.crash = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 2.2), hp = filt("highpass", o.f || 5200, 0.6, t), bp = filt("peaking", 8200, 1, t), g = gainAt(t);
    bp.gain.value = 6; env(g, t, 0.002, 0.42 * v, 0.02, o.decay || 1.6);
    n.connect(hp); hp.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? 0.25 : o.pan, rev: 0.3 });
  };
  // A tambourine (a timbrel): jingles, a shake of bright metal.
  I.tamb = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const n = noise(t, 0.25), bp = filt("bandpass", 9000, 2.2, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t);
    for (const k of [0, 0.012, 0.027]) { g.gain.setValueAtTime(0.26 * v, t + k); g.gain.exponentialRampToValueAtTime(0.05 * v, t + k + 0.01); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + (o.decay || 0.09));
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? 0.45 : o.pan, rev: 0.12 });
  };
  // Tape hiss under the dub: a soft bed of noise for `dur` seconds.
  I.hiss = function (t, dur, v) {
    const n = noise(t, dur), hp = filt("highpass", 3800, 0.5, t), lp = filt("lowpass", 9000, 0.5, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * (v || 1), t + 0.05);
    g.gain.setValueAtTime(0.03 * (v || 1), t + dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(hp); hp.connect(lp); lp.connect(g); route(g, t, { pan: -0.1 });
  };
  I.fall = function (t, dur, v) {
    const n = noise(t, dur), bp = filt("bandpass", 6000, 2, t), g = gainAt(t); bp.frequency.exponentialRampToValueAtTime(200, t + dur);
    env(g, t, 0.01, 0.2 * (v || 1), 0.02, dur); n.connect(bp); bp.connect(g); route(g, t, { rev: 0.5 });
  };
  A.I = I;

  // ---- The conductor -----------------------------------------------------------------------
  // A song: { bpm, swing (0..0.5 of a sixteenth), bars: [sixteenths in each bar, cycling],
  // duck (pump depth), delay (seconds), play(e) } where play is called on every
  // sixteenth with e = { t, s (step in bar), n (steps in bar), b (bar), sd (a sixteenth in
  // seconds), L (intensity 0–3), I (instruments) }.
  const M = { song: null, next: null, step: 0, bar: 0, stepT: 0, barT: 0, level: 0, fill: null, fillNext: null };
  const barLen = (S, b) => (S.bars ? S.bars[b % S.bars.length] : 16);
  // Play a song from its first bar, `lead` seconds from now; returns the audio time of that
  // first downbeat, from which the chart is timed.
  A.play = function (song, lead) {
    if (!ac) return 0;
    M.song = song; M.next = null; M.step = 0; M.bar = 0; M.stepT = ac.currentTime + (lead || 0.08); M.barT = M.stepT;
    M.level = song.level0 || 0; M.fill = null; M.fillNext = null;
    duckDepth = song.duck === undefined ? 0.5 : song.duck; A.setDelay(song.delay || (60 / song.bpm) * 0.75);
    if (song.start) song.start();
    return M.stepT;
  };
  // Pause: the whole clock stops, scheduled sounds and all, and goes on from the same instant.
  A.held = false;      // paused by the game: nothing else may wake the clock
  A.pause = function () { A.held = true; if (ac && ac.state === "running") return ac.suspend(); return Promise.resolve(); };
  A.resume = function () { A.held = false; if (ac && ac.state !== "running" && ac.state !== "closed") return ac.resume(); return Promise.resolve(); };
  A.setMusicVolume = function (v) { if (musicGain) musicGain.gain.setTargetAtTime(v, ac.currentTime, 0.05); };
  // When the sound now reaching the ears was made, on the audio clock, for a moment on the
  // page's clock (performance.now(), as touch events are stamped). Falls back on the latency
  // the browser reports where it cannot say.
  A.heard = function (perfMs) {
    if (!ac) return perfMs / 1000;
    if (ac.getOutputTimestamp) {
      const ts = ac.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) + (perfMs - performance.now()) / 1000;
  };
  // The next song begins on the next downbeat.
  A.queue = function (song) { if (!M.song) A.play(song); else M.next = song; };
  A.stop = function () { M.song = null; M.next = null; };
  A.setLevel = function (L) { M.level = L; };
  A.song = () => M.song;
  // A fill or a change asked for by the game: it is played in the next bar.
  A.fill = function (kind) { M.fillNext = kind; };
  function tick() { if (ac && M.song) schedule(ac.currentTime + 0.14); }
  function schedule(until) {
    while (M.song && M.stepT < until) {
      const S = M.song, sd = 60 / S.bpm / 4, n = barLen(S, M.bar);
      const t = M.stepT + (M.step % 2 ? (S.swing || 0) * sd : 0);
      try { S.play({ t, s: M.step, n, b: M.bar, sd, L: M.level, I, fill: M.fill }); } catch (e) { console.error(e); }
      M.stepT += sd; M.step++;
      if (M.step >= n) {
        M.step = 0; M.bar++; M.barT = M.stepT; M.fill = M.fillNext; M.fillNext = null;
        if (M.next) { const N = M.next; M.next = null; M.song = N; M.bar = 0; duckDepth = N.duck === undefined ? 0.5 : N.duck; A.setDelay(N.delay || (60 / N.bpm) * 0.75); if (N.start) N.start(); }
      }
    }
  }
  // The next point on the song's grid (in sixteenths, or `div` of them) from now: where a sound should fall.
  A.grid = function (div) {
    if (!ac || !M.song) return A.now();
    const sd = (60 / M.song.bpm / 4) * (div || 1), now = ac.currentTime + 0.012;
    const k = Math.ceil((now - M.barT) / sd);
    return M.barT + k * sd;
  };
  A.bpm = () => (M.song ? M.song.bpm : 120);
  A.level = () => M.level;

  // ---- The player's own sounds -------------------------------------------------------------
  // Struck the instant a word is hit, in the song's key: they go to the effects bus, so the
  // kick's pump does not swallow them.
  A.hitVolume = 0.8;
  function sfxVoice(t, f, type, peak, dur, o) {
    o = o || {};
    const a = osc(type, f, t), g = gainAt(t), lp = filt("lowpass", o.cut || 5200, 1, t);
    if (o.to) a.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.8);
    env(g, t, 0.002, peak * A.hitVolume, o.hold || 0.01, dur);
    a.connect(lp); lp.connect(g); g.connect(sfxBus);
    if (o.rev) { const r = gainAt(t, o.rev); g.connect(r); r.connect(revIn); }
    a.start(t); a.stop(t + dur + 0.1);
    return g;
  }
  // A word struck: a soft, glassy pluck of the given note (a perfect one rings a little brighter).
  A.hit = function (midi, perfect) {
    if (!ac || A.hitVolume <= 0) return;
    const t = ac.currentTime, f = mtof(midi);
    sfxVoice(t, f, "triangle", perfect ? 0.32 : 0.22, perfect ? 0.32 : 0.2, { cut: perfect ? 6500 : 3000, rev: 0.25 });
    sfxVoice(t, f * 2, "sine", perfect ? 0.1 : 0.05, 0.12, {});
  };
  // A flick: the note thrown upward.
  A.flick = function (midi) {
    if (!ac || A.hitVolume <= 0) return;
    const t = ac.currentTime, f = mtof(midi);
    sfxVoice(t, f, "sawtooth", 0.16, 0.18, { cut: 4200, to: f * 2, rev: 0.3 });
  };
  // A hold: a tone that sounds while the word is held; returns a function to let it go.
  A.holdTone = function (midi) {
    if (!ac || A.hitVolume <= 0) return () => { };
    const t = ac.currentTime, f = mtof(midi), g = gainAt(t), lp = filt("lowpass", 2600, 0.7, t), lfo = osc("sine", 5, t), lg = gainAt(t, 5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * A.hitVolume, t + 0.03);
    const oscs = [osc("triangle", f, t), osc("sine", f * 2, t)];
    lfo.connect(lg);
    for (const a of oscs) { lg.connect(a.detune); a.connect(lp); a.start(t); }
    lfo.start(t); lp.connect(g); g.connect(sfxBus); const r = gainAt(t, 0.3); g.connect(r); r.connect(revIn);
    let done = false;
    return () => {
      if (done) return; done = true;
      const u = ac.currentTime; g.gain.cancelScheduledValues(u); g.gain.setValueAtTime(g.gain.value, u); g.gain.exponentialRampToValueAtTime(0.0001, u + 0.25);
      for (const a of oscs) a.stop(u + 0.3); lfo.stop(u + 0.3);
    };
  };
  // The calibration click: a dry tick, exactly on time.
  A.click = function (t, accent) {
    if (!ac) return;
    sfxVoice(t, accent ? 1760 : 1320, "square", 0.18, 0.03, { cut: 6000 });
  };
  // A soft tap for the interface.
  A.ui = function (up) {
    if (!ac || A.muted) return;
    const t = ac.currentTime;
    sfxVoice(t, up ? 1046 : 784, "sine", 0.08, 0.08, { rev: 0.2 });
  };
  A.musicTime = () => (ac && M.song ? { bar: M.bar, step: M.step, barT: M.barT } : null);
  return A;
})();
