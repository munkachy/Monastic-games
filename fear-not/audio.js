"use strict";
// Fear Not: the band. This is the synth engine from Luminaries (../luminaries/audio.js),
// brought over whole: drums, basses, keys, pads, choirs, a mixing desk with a reverb, a
// ping-pong delay, sidechain pumping from the kick, and a compressor and limiter on the
// master. Added for this game: a jazz rhythm section (ride, brushes, upright bass, a muted
// trumpet, vibes), the kung fu film band (gong, zheng, wah guitar), the rain and the wind,
// and the short, restrained sounds of the night (blows, breaths, the angel's chord).
// Songs (music.js) are scores written against these instruments.
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
    if (ac) { if (ac.state !== "running" && ac.state !== "closed") ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    build(new C({ latencyHint: "interactive" }));
    setInterval(tick, 25);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && ac && ac.state !== "running" && ac.state !== "closed") ac.resume(); });
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
    route(g, t, { rev: o.rev === undefined ? 0.55 : o.rev, dly: o.dly, pan: o.pan, sfx: o.sfx });
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
  I.fall = function (t, dur, v) {
    const n = noise(t, dur), bp = filt("bandpass", 6000, 2, t), g = gainAt(t); bp.frequency.exponentialRampToValueAtTime(200, t + dur);
    env(g, t, 0.01, 0.2 * (v || 1), 0.02, dur); n.connect(bp); bp.connect(g); route(g, t, { rev: 0.5 });
  };
  // ---- Added for Fear Not: the jazz rhythm section ---------------------------------------------
  // The ride cymbal: six square waves at the unrelated pitches of the old drum machines' metal,
  // high-passed into a shimmer, with a breath of noise on top. `bell` hits the dome of it.
  I.ride = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const hp = filt("highpass", o.bell ? 3200 : 6200, 0.7, t), bp = filt("bandpass", o.bell ? 5200 : 9200, 0.6, t), g = gainAt(t);
    env(g, t, 0.001, (o.bell ? 0.1 : 0.075) * v, 0.004, o.decay || 1.1);
    for (const f of [263, 400, 421, 474, 587, 845]) { const a = osc("square", f * (o.bell ? 1.4 : 1), t); a.connect(hp); a.start(t); a.stop(t + (o.decay || 1.1) + 0.2); }
    hp.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? 0.32 : o.pan, rev: 0.16 });
    const n = noise(t, 0.6), nh = filt("highpass", 8000, 0.7, t), gn = gainAt(t); env(gn, t, 0.001, 0.05 * v, 0.002, 0.35);
    n.connect(nh); nh.connect(gn); route(gn, t, { drum: true, pan: 0.32 });
  };
  // The brushes on the snare: a hiss swept in a circle (a soft attack), or slapped (`slap`).
  I.brush = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const dur = o.dur || 0.22, n = noise(t, dur + 0.1), bp = filt("bandpass", o.f || 3600, 0.8, t), g = gainAt(t);
    if (o.sweep !== false) bp.frequency.linearRampToValueAtTime((o.f || 3600) * 1.35, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((o.slap ? 0.34 : 0.14) * v, t + (o.slap ? 0.004 : o.att || 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: o.pan === undefined ? -0.22 : o.pan, rev: o.rev === undefined ? 0.2 : o.rev });
  };
  // The upright bass: a round triangle and sine, the pitch dropping into the note as the finger
  // pulls the string, the tone darkening as it rings, and the click of the pluck.
  I.upright = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), a = osc("triangle", f * 1.025, t), s = osc("sine", f, t), z = osc("sawtooth", f, t);
    const lp = filt("lowpass", 1100, 1.4, t), zl = filt("lowpass", 900, 2, t), g = gainAt(t), gs = gainAt(t, 0.35), gz = gainAt(t, 0.14);
    a.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    lp.frequency.exponentialRampToValueAtTime(o.dark || 320, t + 0.18); zl.frequency.exponentialRampToValueAtTime(380, t + 0.2);
    const end = t + Math.max(0.08, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.11 * v, t + Math.min(0.25, dur));
    g.gain.setValueAtTime(0.11 * v, Math.max(t + 0.26, end - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.09);
    a.connect(lp); lp.connect(g); s.connect(gs); gs.connect(g); z.connect(zl); zl.connect(gz); gz.connect(g); route(g, t, { drive: 0.12, rev: 0.05 });
    for (const x of [a, s, z]) { x.start(t); x.stop(end + 0.15); }
    const n = noise(t, 0.03), bp = filt("bandpass", 1400, 1.2, t), gn = gainAt(t); env(gn, t, 0.001, 0.07 * v, 0.002, 0.02);
    n.connect(bp); bp.connect(gn); route(gn, t, {});
  };
  // A trumpet with a Harmon mute: a nasal, smoky line that scoops up into each note, with a
  // vibrato that comes in late, as a player leans into a long note.
  I.horn = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), bp = filt("bandpass", o.f || 1500, 2.4, t), hp = filt("highpass", 420, 0.7, t), g = gainAt(t);
    const lfo = osc("sine", 5.3, t), lg = gainAt(t, 0); lg.gain.setValueAtTime(0, t + Math.min(0.28, dur * 0.5)); lg.gain.linearRampToValueAtTime(o.vib === undefined ? 16 : o.vib, t + Math.min(0.7, dur)); lfo.connect(lg);
    const att = o.att || 0.035, rel = o.rel || 0.13;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3 * v, t + att); g.gain.setValueAtTime(0.27 * v, t + Math.max(att, dur - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    for (const [w, c, k] of [["sawtooth", -5, 1], ["square", 6, 0.45]]) {
      const a = osc(w, f, t), ga = gainAt(t, k); a.detune.value = c; lg.connect(a.detune);
      a.frequency.setValueAtTime(f * (o.scoop === undefined ? 0.955 : o.scoop), t); a.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      a.connect(ga); ga.connect(hp); a.start(t); a.stop(t + dur + rel + 0.1);
    }
    hp.connect(bp); bp.connect(g); lfo.start(t); lfo.stop(t + dur + rel + 0.1);
    route(g, t, { pan: o.pan === undefined ? -0.12 : o.pan, rev: o.rev === undefined ? 0.4 : o.rev, dly: o.dly === undefined ? 0.16 : o.dly });
  };
  // The vibraphone: a soft FM bar with the motor's slow tremolo.
  I.vibes = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), car = osc("sine", f, t), mod = osc("sine", f * 4, t), mg = gainAt(t, f * 0.9), g = gainAt(t), trem = gainAt(t, 1);
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.4); mod.connect(mg); mg.connect(car.frequency);
    env(g, t, 0.002, 0.2 * v, 0.01, dur || 1.4);
    const lfo = osc("sine", 5.5, t), lg = gainAt(t, 0.35); lfo.connect(lg); lg.connect(trem.gain);
    car.connect(trem); trem.connect(g); route(g, t, { pan: o.pan === undefined ? 0.3 : o.pan, rev: 0.35, dly: o.dly === undefined ? 0.12 : o.dly });
    for (const a of [car, mod, lfo]) { a.start(t); a.stop(t + (dur || 1.4) + 0.3); }
  };
  // ---- The kung fu film band ----------------------------------------------------------------------
  // The gong: a swell of inharmonic partials that blooms after the strike, and a long shimmer.
  I.gong = function (t, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const base = o.f || 68, dur = o.dur || 4.5;
    for (const [r, k, d] of [[1, 1, 1], [1.48, 0.7, 0.8], [2.13, 0.5, 0.7], [2.76, 0.45, 0.55], [3.41, 0.3, 0.45], [4.53, 0.22, 0.35]]) {
      const a = osc("sine", base * r, t), g = gainAt(t); a.frequency.linearRampToValueAtTime(base * r * 0.985, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v * k, t + 0.08 + r * 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d);
      a.connect(g); route(g, t, { rev: 0.5, drum: true, pan: (r % 1 - 0.5) * 0.6 }); a.start(t); a.stop(t + dur + 0.1);
    }
    const n = noise(t, dur), bp = filt("bandpass", 2400, 1.2, t), gn = gainAt(t);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.09 * v, t + 0.35); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
    n.connect(bp); bp.connect(gn); route(gn, t, { rev: 0.6, drum: true });
    const m = osc("sine", 150, t), gm = gainAt(t); m.frequency.exponentialRampToValueAtTime(70, t + 0.1); env(gm, t, 0.002, 0.5 * v, 0.01, 0.4);
    m.connect(gm); route(gm, t, { drum: true }); m.start(t); m.stop(t + 0.6);
  };
  // The zheng: a bright plucked string that bends up into its note.
  I.zheng = function (t, midi, dur, v, o) {
    o = o || {}; v = v === undefined ? 1 : v;
    const f = mtof(midi), a = osc("sawtooth", f, t), b = osc("triangle", f * 2, t), lp = filt("lowpass", 7000, 3, t), g = gainAt(t);
    if (o.bend) { for (const x of [a, b]) { const k = x === b ? 2 : 1; x.frequency.setValueAtTime(mtof(midi - o.bend) * k, t); x.frequency.exponentialRampToValueAtTime(f * k, t + 0.09); } }
    lp.frequency.exponentialRampToValueAtTime(o.floor || 1100, t + 0.25);
    env(g, t, 0.001, 0.22 * v, 0.004, o.decay || Math.max(0.35, dur));
    const gb = gainAt(t, 0.35); b.connect(gb); gb.connect(lp); a.connect(lp); lp.connect(g);
    route(g, t, { pan: o.pan === undefined ? 0.35 : o.pan, rev: 0.3, dly: o.dly === undefined ? 0.2 : o.dly });
    for (const x of [a, b]) { x.start(t); x.stop(t + (o.decay || dur) + 0.6); }
  };
  // The wah guitar: a funk chop through a filter that opens and shuts like the pedal.
  I.wah = function (t, notes, dur, v, o) {
    o = o || {}; v = (v === undefined ? 1 : v) / Math.sqrt(notes.length);
    const bp = filt("bandpass", o.lo || 450, o.q || 5, t), g = gainAt(t);
    bp.frequency.exponentialRampToValueAtTime(o.hi || 2200, t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(o.lo || 450, t + dur);
    env(g, t, 0.002, 0.42 * v, dur * 0.4, dur * 0.5);
    for (const m of notes) { const a = osc("sawtooth", mtof(m), t); a.connect(bp); a.start(t); a.stop(t + dur + 0.1); }
    bp.connect(g); route(g, t, { pan: o.pan === undefined ? -0.4 : o.pan, rev: 0.12, drive: 0.3 });
  };
  A.I = I;

  // ---- The conductor -----------------------------------------------------------------------
  // A song: { bpm, swing (0..0.5 of a sixteenth), bars: [sixteenths in each bar, cycling],
  // duck (pump depth), delay (seconds), play(e) } where play is called on every
  // sixteenth with e = { t, s (step in bar), n (steps in bar), b (bar), sd (a sixteenth in
  // seconds), L (intensity 0–3), I (instruments) }.
  const M = { song: null, next: null, step: 0, bar: 0, stepT: 0, barT: 0, level: 0, fill: null, fillNext: null };
  const barLen = (S, b) => (S.bars ? S.bars[b % S.bars.length] : 16);
  A.play = function (song) {
    if (!ac) return;
    M.song = song; M.next = null; M.step = 0; M.bar = 0; M.stepT = ac.currentTime + 0.08; M.barT = M.stepT;
    duckDepth = song.duck === undefined ? 0.5 : song.duck; A.setDelay(song.delay || (60 / song.bpm) * 0.75);
    if (song.start) song.start();
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
  A.musicTime = () => (ac && M.song ? { bar: M.bar, step: M.step, barT: M.barT } : null);
  // Where we are in the beat, 0 on the beat to 1 just before the next, and how long a beat is.
  // A song on a triplet grid says how many of its steps make a beat (`beat`, else four).
  A.beat = function () {
    if (!ac || !M.song) return null;
    const S = M.song, sd = 60 / S.bpm / 4, per = S.beat || 4, k = ((ac.currentTime - M.barT) / sd) / per;
    return { phase: ((k % 1) + 1) % 1, secs: sd * per };
  };

  // ---- The rain and the wind -----------------------------------------------------------------------
  // Two long beds of noise that never stop once begun; the game sets how loud and how bright.
  let amb = null;
  A.ambience = function (o) {
    if (!ac || ac.state === "closed") return;
    if (!amb) {
      const mk = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(sfxBus); s.start(); return { b, g }; };
      amb = { rain: mk("highpass", 1100, 0.5), hiss: mk("bandpass", 6500, 0.4), wind: mk("bandpass", 420, 0.9) };
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000; amb.rain.g.disconnect(); amb.rain.g.connect(lp); lp.connect(sfxBus);
    }
    const now = ac.currentTime;
    if (o.rain !== undefined) { amb.rain.g.gain.setTargetAtTime(0.22 * o.rain, now, 0.6); amb.hiss.g.gain.setTargetAtTime(0.05 * o.rain, now, 0.6); }
    if (o.wind !== undefined) amb.wind.g.gain.setTargetAtTime(0.32 * o.wind, now, 0.25);
    if (o.windF !== undefined) amb.wind.b.frequency.setTargetAtTime(o.windF, now, 0.25);
  };

  // ---- Sounds of the night: short and restrained, never a voice ------------------------------------
  // They are played at once (not on the grid), to their own bus, so the music does not pump them.
  const fx = {};
  const T0 = () => ac.currentTime + 0.005;
  const ok = () => ac && ac.state === "running";
  const F = { sfx: true };
  // A blow landing: a body thump, the crack of it, and a slap of air. `k` is how heavy.
  fx.hit = function (k, pan) {
    if (!ok()) return; const t = T0(); k = k || 1;
    const a = osc("sine", 140 + 40 * Math.random(), t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    env(g, t, 0.002, 0.55 * Math.min(1.4, k), 0.01, 0.16 + 0.1 * k); a.connect(g); route(g, t, { sfx: true, pan }); a.start(t); a.stop(t + 0.5);
    const n = noise(t, 0.2), bp = filt("bandpass", 1300 + 900 * Math.random(), 1.1, t), gn = gainAt(t); env(gn, t, 0.001, 0.4 * Math.min(1.3, k), 0.004, 0.05 + 0.04 * k);
    n.connect(bp); bp.connect(gn); route(gn, t, { sfx: true, pan, rev: 0.12 });
    if (k > 1.2) { const s = noise(t, 0.4), hp = filt("highpass", 3000, 0.7, t), gs = gainAt(t); env(gs, t, 0.001, 0.2, 0.005, 0.12); s.connect(hp); hp.connect(gs); route(gs, t, { sfx: true, rev: 0.3, pan }); }
  };
  // Air moving: a fast move, a flip, a wing. `up` sweeps upward.
  fx.whoosh = function (dur, v, up) {
    if (!ok()) return; const t = T0(); dur = dur || 0.25;
    const n = noise(t, dur + 0.1), bp = filt("bandpass", up ? 500 : 2600, 1.6, t), g = gainAt(t);
    bp.frequency.exponentialRampToValueAtTime(up ? 2600 : 450, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * (v || 1), t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); route(g, t, F);
  };
  // A wing beat: a soft low whump.
  fx.flap = function (v) {
    if (!ok()) return; const t = T0();
    const n = noise(t, 0.4), lp = filt("lowpass", 260, 1.5, t), g = gainAt(t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.08); lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55 * (v || 1), t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    n.connect(lp); lp.connect(g); route(g, t, F);
  };
  // The demon's yelp as it is cast out: a squeal that cracks and drops away. The slapstick is theirs.
  fx.yelp = function (pan) {
    if (!ok()) return; const t = T0(), f0 = 700 + Math.random() * 300;
    const a = osc("triangle", f0, t), bp = filt("bandpass", 1300, 2, t), g = gainAt(t);
    a.frequency.linearRampToValueAtTime(f0 * 1.7, t + 0.06); a.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + 0.32);
    const lfo = osc("sine", 31, t), lg = gainAt(t, 40); lfo.connect(lg); lg.connect(a.frequency);
    env(g, t, 0.004, 0.22, 0.05, 0.25); a.connect(bp); bp.connect(g); route(g, t, { sfx: true, pan, rev: 0.25 });
    a.start(t); lfo.start(t); a.stop(t + 0.5); lfo.stop(t + 0.5);
  };
  // A puff of light: a soft breath of air and a sparkle.
  fx.puff = function (pan) {
    if (!ok()) return; const t = T0();
    const n = noise(t, 0.5), hp = filt("highpass", 2400, 0.6, t), g = gainAt(t); env(g, t, 0.01, 0.16, 0.02, 0.35);
    n.connect(hp); hp.connect(g); route(g, t, { sfx: true, pan, rev: 0.4 });
    for (const [k, m] of [[0, 93], [0.06, 98], [0.12, 100]]) I.bell(t + k, m, 0.7, 0.35, { ratio: 3.01, index: 1.2, sfx: true, pan, dly: 0.1 });
  };
  // The angel speaks: no voice, a faint chord of light. `k` picks the chord.
  const CHORDS = [[62, 69, 74, 78, 81], [64, 71, 76, 79, 83], [57, 64, 69, 73, 76], [59, 66, 71, 74, 78]];
  fx.chord = function (k, v) {
    if (!ok()) return; const t = T0(), c = CHORDS[(k || 0) % CHORDS.length];
    I.choir(t, c.slice(0, 3), 0.9, 0.22 * (v || 1), { vowel: "o", att: 0.2, rel: 0.8, rev: 0.7, vib: 4, sfx: true });
    for (const [i, m] of c.slice(2).entries()) I.bell(t + 0.04 + i * 0.07, m + 12, 1.6, 0.18 * (v || 1), { ratio: 2.0, index: 0.6, sfx: true, dly: 0.25, rev: 0.6 });
  };
  // A guardian speaks: a lower, softer chord.
  fx.lowChord = function (k) {
    if (!ok()) return; const t = T0(), c = CHORDS[(k || 0) % CHORDS.length].map((m) => m - 7);
    I.choir(t, c.slice(0, 3), 1.0, 0.2, { vowel: "u", att: 0.25, rel: 0.8, rev: 0.7, vib: 3, sfx: true });
    I.bell(t + 0.05, c[3] + 12, 1.4, 0.12, { ratio: 2.0, index: 0.5, sfx: true, rev: 0.6 });
  };
  // A breath shaped like a sung vowel, but unvoiced: the "hah" of an effort, a sigh, a gasp.
  function breath(t, v, f1, f2, att, dur, fall, pan) {
    const n = noise(t, dur + 0.1), g = gainAt(t), sum = ac.createGain();
    for (const [f, k] of [[f1, 1], [f2, 0.6], [2700, 0.25]]) { const b = filt("bandpass", f, 5, t), kg = gainAt(t, k * 2.5); if (fall) b.frequency.exponentialRampToValueAtTime(f * fall, t + dur); n.connect(b); b.connect(kg); kg.connect(sum); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sum.connect(g); route(g, t, { sfx: true, pan, rev: 0.15 });
  }
  fx.hah = function (v, pan) { if (ok()) breath(T0(), 0.2 * (v || 1), 820, 1250, 0.012, 0.2, 0.8, pan); };
  fx.effort = function (pan) { if (ok()) breath(T0(), 0.09, 640 + Math.random() * 200, 1150, 0.01, 0.12, 0.9, pan); };
  fx.sigh = function () { if (ok()) breath(T0(), 0.16, 700, 1100, 0.18, 0.9, 0.6); };
  fx.gasp = function () { if (ok()) breath(T0(), 0.13, 500, 1700, 0.06, 0.3, 1.4); };
  // The whispers: hissing breath that never quite becomes words, from all round.
  fx.whisper = function (dur) {
    if (!ok()) return; const t = T0(); dur = dur || 1.4;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.18, n = noise(s, dur), bp = filt("bandpass", 2200 + Math.random() * 2400, 7, s), g = gainAt(s), p = (Math.random() - 0.5) * 1.6;
      for (let k = 0; k < 7; k++) bp.frequency.setValueAtTime(1800 + Math.random() * 3600, s + k * dur / 7);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.09, s + 0.12); g.gain.setValueAtTime(0.09, s + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      const lfo = osc("sine", 6 + Math.random() * 5, s), lg = gainAt(s, 0.05); lfo.connect(lg); lg.connect(g.gain); lfo.start(s); lfo.stop(s + dur);
      n.connect(bp); bp.connect(g); route(g, s, { sfx: true, pan: p, rev: 0.5 });
    }
  };
  // The radio: static, and the hum of a voice too far off to make out.
  fx.radio = function (dur) {
    if (!ok()) return; const t = T0(); dur = dur || 2;
    const n = noise(t, dur), bp = filt("bandpass", 2600, 0.9, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.08); g.gain.setValueAtTime(0.07, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); route(g, t, F);
    const v = osc("sawtooth", 118, t), vb = filt("bandpass", 900, 3, t), vg = gainAt(t);
    for (let k = 0; k < dur * 6; k++) { vg.gain.setValueAtTime(Math.random() < 0.7 ? 0.035 : 0.0001, t + k / 6); v.frequency.setValueAtTime(105 + Math.random() * 40, t + k / 6); }
    vg.gain.setValueAtTime(0.0001, t + dur);
    v.connect(vb); vb.connect(vg); route(vg, t, F); v.start(t); v.stop(t + dur + 0.05);
  };
  // A phone buzzing on a dashboard.
  fx.buzz = function () {
    if (!ok()) return; const t = T0();
    for (const k of [0, 0.5]) { const a = osc("square", 155, t + k), lp = filt("lowpass", 400, 2, t + k), g = gainAt(t + k); env(g, t + k, 0.01, 0.08, 0.3, 0.05); a.connect(lp); lp.connect(g); route(g, t + k, F); a.start(t + k); a.stop(t + k + 0.45); }
  };
  // A heartbeat, low and close.
  fx.heart = function (v) {
    if (!ok()) return; const t = T0();
    for (const [k, w] of [[0, 1], [0.24, 0.7]]) { const a = osc("sine", 70, t + k), g = gainAt(t + k); a.frequency.exponentialRampToValueAtTime(38, t + k + 0.1); env(g, t + k, 0.005, 0.5 * w * (v || 1), 0.02, 0.16); a.connect(g); route(g, t + k, F); a.start(t + k); a.stop(t + k + 0.4); }
  };
  // Metal: the chains of shadow rattling, and breaking.
  fx.chain = function (brk) {
    if (!ok()) return; const t = T0();
    for (let i = 0; i < (brk ? 9 : 4); i++) {
      const s = t + i * (brk ? 0.03 : 0.045) + Math.random() * 0.02, a = osc("square", 1800 + Math.random() * 2600, s), bp = filt("bandpass", 3000 + Math.random() * 2000, 9, s), g = gainAt(s);
      env(g, s, 0.001, brk ? 0.12 : 0.08, 0.004, 0.08 + Math.random() * 0.12); a.connect(bp); bp.connect(g); route(g, s, { sfx: true, rev: 0.25, pan: (Math.random() - 0.5) }); a.start(s); a.stop(s + 0.3);
    }
    if (brk) fx.hit(1.6);
  };
  // A counter: the clean ring of a blow turned aside.
  fx.clang = function (pan) {
    if (!ok()) return; const t = T0();
    I.bell(t, 86, 0.9, 0.5, { ratio: 2.76, index: 2.5, sfx: true, pan, dly: 0.1 }); fx.hit(1.3, pan);
  };
  // A shield of darkness shattering.
  fx.shatter = function () {
    if (!ok()) return; const t = T0();
    const n = noise(t, 0.6), hp = filt("highpass", 2500, 0.8, t), g = gainAt(t); env(g, t, 0.001, 0.3, 0.02, 0.45); n.connect(hp); hp.connect(g); route(g, t, { sfx: true, rev: 0.35 });
    for (let i = 0; i < 6; i++) I.bell(t + 0.02 + i * 0.035, 88 + Math.floor(Math.random() * 14), 0.4, 0.22, { ratio: 3.7, index: 2, sfx: true, pan: (Math.random() - 0.5) * 1.2, dly: 0 });
  };
  // A low growl: a demon's grab, or the dark pulling.
  fx.growl = function (dur) {
    if (!ok()) return; const t = T0(); dur = dur || 0.6;
    const a = osc("sawtooth", 62, t), lp = filt("lowpass", 380, 4, t), g = gainAt(t), lfo = osc("sine", 13, t), lg = gainAt(t, 0.4);
    a.frequency.linearRampToValueAtTime(48, t + dur); lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    a.connect(lp); lp.connect(g); route(g, t, { sfx: true, rev: 0.3 }); a.start(t); lfo.start(t); a.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  };
  // Water: holy water flung, or something dropped into a drain.
  fx.splash = function (deep) {
    if (!ok()) return; const t = T0();
    const n = noise(t, 0.5), bp = filt("bandpass", deep ? 900 : 2200, 0.8, t), g = gainAt(t); bp.frequency.exponentialRampToValueAtTime(deep ? 300 : 900, t + 0.3);
    env(g, t, 0.003, 0.3, 0.02, 0.32); n.connect(bp); bp.connect(g); route(g, t, { sfx: true, rev: 0.3 });
    for (let i = 0; i < 4; i++) { const s = t + 0.03 + i * 0.05 + Math.random() * 0.03, a = osc("sine", (deep ? 300 : 700) + Math.random() * 500, s), ga = gainAt(s); a.frequency.exponentialRampToValueAtTime((deep ? 900 : 1600) + Math.random() * 600, s + 0.05); env(ga, s, 0.002, 0.08, 0.005, 0.05); a.connect(ga); route(ga, s, F); a.start(s); a.stop(s + 0.1); }
  };
  // The great bell of the monastery, for Vigils: a low strike that hums for a long time.
  fx.bigBell = function (v) {
    if (!ok()) return; const t = T0(); v = v || 1;
    I.bell(t, 45, 7, 0.9 * v, { ratio: 2.0, index: 2.4, sfx: true, rev: 0.6, dly: 0 });
    I.bell(t, 57, 5, 0.5 * v, { ratio: 2.76, index: 1.6, sfx: true, rev: 0.6, dly: 0 });
    I.bell(t, 64, 3.5, 0.25 * v, { ratio: 3.2, index: 1.2, sfx: true, rev: 0.6, dly: 0 });
    const a = osc("sine", mtof(33), t), g = gainAt(t); env(g, t, 0.02, 0.25 * v, 0.1, 6); a.connect(g); route(g, t, F); a.start(t); a.stop(t + 6.5);
  };
  // A small tap on glass, a footstep, a door: little things.
  fx.tick = function (f, v) { if (!ok()) return; const t = T0(), a = osc("sine", f || 1800, t), g = gainAt(t); env(g, t, 0.001, 0.12 * (v || 1), 0.002, 0.05); a.connect(g); route(g, t, F); a.start(t); a.stop(t + 0.1); };
  fx.step = function (v) { if (!ok()) return; const t = T0(), n = noise(t, 0.12), lp = filt("lowpass", 600, 1, t), g = gainAt(t); env(g, t, 0.002, 0.18 * (v || 1), 0.01, 0.07); n.connect(lp); lp.connect(g); route(g, t, { sfx: true, rev: 0.3 }); };
  fx.door = function () {
    if (!ok()) return; const t = T0();
    const a = osc("sawtooth", 210, t), bp = filt("bandpass", 900, 8, t), g = gainAt(t); a.frequency.linearRampToValueAtTime(330, t + 0.5);
    env(g, t, 0.05, 0.05, 0.3, 0.2); a.connect(bp); bp.connect(g); route(g, t, { sfx: true, rev: 0.4 }); a.start(t); a.stop(t + 0.8);
    setTimeout(() => fx.step(1.4), 650);
  };
  // A car starting and pulling away.
  fx.engine = function () {
    if (!ok()) return; const t = T0();
    const a = osc("sawtooth", 38, t), lp = filt("lowpass", 180, 3, t), g = gainAt(t);
    a.frequency.linearRampToValueAtTime(70, t + 0.5); a.frequency.linearRampToValueAtTime(55, t + 1.0); a.frequency.linearRampToValueAtTime(95, t + 2.6);
    lp.frequency.linearRampToValueAtTime(500, t + 2.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.3); g.gain.setValueAtTime(0.3, t + 2.0); g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
    a.connect(lp); lp.connect(g); route(g, t, F); a.start(t); a.stop(t + 3.7);
  };
  // A light coming back on: a soft electric tick and a rising tone.
  fx.lightOn = function (k) {
    if (!ok()) return; const t = T0();
    I.bell(t, 76 + ((k || 0) % 5) * 2, 0.8, 0.14, { ratio: 2, index: 0.8, sfx: true, dly: 0.15, rev: 0.4 });
    fx.tick(2600, 0.6);
  };
  // A swell for the sight of something holy.
  fx.glory = function () {
    if (!ok()) return; const t = T0();
    I.choir(t, [62, 69, 74, 78], 2.2, 0.3, { vowel: "a", att: 0.6, rel: 1.4, rev: 0.8, sfx: true });
    I.swell(t, 1.2, 0.6);
  };
  A.fx = fx;
  return A;
})();
