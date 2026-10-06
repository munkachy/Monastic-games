"use strict";
// While You Have the Light: the sound. This is the synth engine from Luminaries, by way of Fear
// Not (../fear-not/audio.js): the same mixing desk (a hall, an echo, a gentle pump from the drum,
// a compressor and a limiter on the master) and the same conductor, which plays a score one
// sixteenth at a time. The dance band is gone. In its place are the voices of a dark church: a
// pipe organ, a harpsichord, frame drums and toms and a great drum, a church bell tolling far
// off, a choir, a low drone.
// Two things are new. The effects have a reverb of their own, a small cave, so that when the
// torch flares and the music is muffled (the filter closing on it, as in New Apologetics when a
// boss winds up) the blows and the heartbeat stay crisp in the slowed time. And the intensity of
// the music, which the game sets from the flow, rises on the next beat and falls at the next
// bar, so a change always lands in time.
// Songs (music.js) are scores written against these instruments. Nothing here needs core.js.
const Sound = (() => {
  let ac = null, out, pre, musicGain, hush, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, caveIn, noiseBuf = null, shaperNode, waves = {};
  let rendering = false, fxLoud = 1;
  const A = { muted: false };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const dv = (x, d) => (x === undefined ? d : x);
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
    ac = context; waves = {};
    out = ac.createGain(); out.gain.value = A.muted ? 0 : 0.9; out.connect(ac.destination);
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.08;
    limiter.connect(out);
    const glue = ac.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 10; glue.ratio.value = 2; glue.attack.value = 0.015; glue.release.value = 0.2;
    glue.connect(limiter);
    const sat = ac.createWaveShaper(); sat.curve = softClip(1.1); sat.oversample = "2x"; sat.connect(glue);
    // A breath of air on top (a harpsichord is bright enough without more), the mud taken out of the
    // low middle, and the deepest lows, which a phone cannot play, held down so that they do not eat
    // the headroom of what it can.
    const air = ac.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 7000; air.gain.value = 1; air.connect(sat);
    const mud = ac.createBiquadFilter(); mud.type = "peaking"; mud.frequency.value = 320; mud.Q.value = 0.9; mud.gain.value = -2.5; mud.connect(air);
    const low = ac.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 130; low.gain.value = -6; low.connect(mud);
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 50; hp.Q.value = 0.7; hp.connect(low);
    pre = ac.createGain(); pre.gain.value = 0.75; pre.connect(hp);
    musicGain = ac.createGain(); musicGain.connect(pre);
    // The muffle: a low-pass on the music alone, which the flare (and the pause) close; and a hush
    // after it, which lowers the music a little while the flare lasts.
    hush = ac.createGain(); hush.connect(musicGain);
    lpf = ac.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 20000; lpf.Q.value = 1; lpf.connect(hush);
    duck = ac.createGain(); duck.connect(lpf);
    drumBus = ac.createGain(); drumBus.connect(lpf);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(pre);
    // The hall: a long, dark reverb, as in a great church of stone. The music's own.
    const conv = ac.createConvolver(); conv.buffer = impulse(3.2, 2.4);
    revIn = ac.createGain(); const rhp = ac.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 220;
    revIn.connect(rhp); rhp.connect(conv); const rv = ac.createGain(); rv.gain.value = 0.8; conv.connect(rv); rv.connect(duck);
    // The echo: dotted eighths, left and right, darker each time round.
    dlyIn = ac.createGain(); dlyL = ac.createDelay(2); dlyR = ac.createDelay(2);
    const fb = ac.createGain(); fb.gain.value = 0.38; const dlp = ac.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 2600;
    const pl = ac.createStereoPanner(); pl.pan.value = -0.7; const pr = ac.createStereoPanner(); pr.pan.value = 0.7;
    dlyIn.connect(dlyL); dlyL.connect(pl); dlyL.connect(dlyR); dlyR.connect(pr); dlyR.connect(dlp); dlp.connect(fb); fb.connect(dlyL);
    const dg = ac.createGain(); dg.gain.value = 0.5; pl.connect(dg); pr.connect(dg); dg.connect(duck);
    // The cave: a short reverb for the effects alone, so that the muffle never touches them.
    const cave = ac.createConvolver(); cave.buffer = impulse(1.3, 2.2);
    caveIn = ac.createGain(); const chp = ac.createBiquadFilter(); chp.type = "highpass"; chp.frequency.value = 250;
    caveIn.connect(chp); chp.connect(cave); const cg = ac.createGain(); cg.gain.value = 0.6; cave.connect(cg); cg.connect(sfxBus);
    // White noise, made once.
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    shaperNode = ac.createWaveShaper(); shaperNode.curve = softClip(2.2); const sg = ac.createGain(); sg.gain.value = 0.6; shaperNode.connect(sg); sg.connect(duck);
  }
  // For testing the mix: render a song offline, at a given intensity, and return the samples.
  // `o.flare` = [from, to] in seconds plays the flare over it; `o.fx(fx, Sound)` plays effects at
  // the start (for testing them one by one); the song may be null.
  A.render = async function (song, secs, level, o) {
    o = o || {};
    const live = { ac, out, pre, musicGain, hush, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, caveIn, noiseBuf, shaperNode, waves, duckDepth, M: Object.assign({}, M) };
    const off = new OfflineAudioContext(2, Math.ceil(44100 * secs), 44100);
    const wasMuted = A.muted; A.muted = false;
    try {
      build(off); A.muted = wasMuted;
      M.song = song; M.next = null; M.step = 0; M.bar = 0; M.stepT = 0.05; M.barT = 0.05; M.level = M.want = level || 0; M.fill = null; M.fillNext = null;
      if (song) {
        duckDepth = song.duck === undefined ? 0.15 : song.duck; dlyL.delayTime.value = dlyR.delayTime.value = song.delay || (60 / song.bpm) * 0.75; musicGain.gain.value = song.gain || 1;
        schedule(secs - 0.3);
      }
      if (o.flare) {
        const [a, b] = o.flare, v = flareStart(a);
        for (let k = a + 0.02; k < b; k += HEART) heart(k, 1);
        flareEnd(b, v);
      }
      if (o.fx) { rendering = true; o.fx(fx, A); }
    } finally {
      rendering = false; A.muted = wasMuted;
      ({ ac, out, pre, musicGain, hush, duck, lpf, drumBus, revIn, dlyIn, dlyL, dlyR, sfxBus, caveIn, noiseBuf, shaperNode, waves, duckDepth } = live);
      Object.assign(M, live.M);
    }
    const buf = await off.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  };
  A.setMute = function (m) { A.muted = m; if (out) out.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05); };
  A.setDelay = function (secs) { if (dlyL) { dlyL.delayTime.setTargetAtTime(secs, ac.currentTime, 0.05); dlyR.delayTime.setTargetAtTime(secs, ac.currentTime, 0.05); } };
  // The drum pushes everything else down for a moment (the pump). Gentle here: this is a church.
  let duckDepth = 0.15;
  function pump(t, depth, rel) {
    const g = duck.gain, d = depth === undefined ? duckDepth : depth;
    if (d <= 0) return;
    g.setValueAtTime(1 - d, t); g.linearRampToValueAtTime(1, t + (rel || 0.2));
  }

  // ---- Building blocks ---------------------------------------------------------------------------
  // Each node is given its starting value outright as well as on the timeline. Otherwise, when a
  // note falls exactly on a sample, its first sample can pass at the node's default (a gain of 1),
  // and a voice that should begin in silence begins with a click.
  function osc(type, f, t) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.frequency.setValueAtTime(f, t); return o; }
  function gainAt(t, v) { const g = ac.createGain(); g.gain.value = v === undefined ? 0 : v; g.gain.setValueAtTime(v === undefined ? 0 : v, t); return g; }
  function noise(t, dur) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }
  function filt(type, f, q, t) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.frequency.setValueAtTime(f, t || 0); if (q !== undefined) b.Q.value = q; return b; }
  // Send a voice to the mix: panned; to the effects (with their cave), the drums, or the music bus;
  // and, for the music, to the hall, the echo and the drive.
  function route(node, t, o) {
    o = o || {};
    let n = node;
    if (o.sfx && fxLoud !== 1) { const k = ac.createGain(); k.gain.value = fxLoud; n.connect(k); n = k; }
    if (o.pan) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); n.connect(p); n = p; }
    n.connect(o.sfx ? sfxBus : o.drum ? drumBus : duck);
    if (o.rev) { const g = gainAt(t, o.rev); n.connect(g); g.connect(o.sfx ? caveIn : revIn); }
    if (o.sfx) return;
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
  // A wave built from partials, worked out once for each context: the organ's stops, the harpsichord.
  const STOPS = {
    flute: [1, 0.05, 0.18, 0.02, 0.05, 0, 0.02],                                                  // a stopped flute: soft and hollow
    principal: [1, 0.42, 0.28, 0.2, 0.1, 0.1, 0.04, 0.06, 0.02, 0.03],                           // the diapason, the organ's own voice
    plenum: [1, 0.7, 0.5, 0.55, 0.28, 0.4, 0.12, 0.35, 0.1, 0.16, 0.05, 0.22, 0.03, 0.05, 0.03, 0.12],   // the full organ, with mixtures
    reed: Array.from({ length: 22 }, (_, i) => 1 / Math.pow(i + 1, 0.85)),                       // a trumpet stop, for fire
    // The harpsichord: a string plucked near its end, so the partials come and go with the
    // place of the pluck (a nasal, bright tone).
    harpsi: Array.from({ length: 30 }, (_, i) => Math.abs(Math.sin(Math.PI * (i + 1) * 0.13)) / Math.pow(i + 1, 0.8)),
  };
  // The partials are set in spread phases (Schroeder's), not all starting together: the wave then
  // has no tall needle in it, so it is fuller for the same peak, and kinder to a small speaker.
  function wave(name) {
    if (!waves[name]) {
      const h = STOPS[name] || STOPS.principal, re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
      for (let i = 0; i < h.length; i++) { const ph = (Math.PI * (i + 1) * (i + 1)) / h.length; re[i + 1] = h[i] * Math.sin(ph); im[i + 1] = h[i] * Math.cos(ph); }
      waves[name] = ac.createPeriodicWave(re, im);
    }
    return waves[name];
  }

  // ---- The instruments ------------------------------------------------------------------------
  const I = {};
  // The kick: kept from Luminaries, for a heartbeat in the drums.
  I.kick = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    const o1 = osc("sine", o.punch || 160, t), g = gainAt(t);
    o1.frequency.exponentialRampToValueAtTime(o.tone || 48, t + (o.sweep || 0.07));
    env(g, t, 0.002, 0.95 * v, 0.03, o.decay || 0.38);
    o1.connect(g); route(g, t, { drum: true, drive: o.drive || 0.2 });
    o1.start(t); o1.stop(t + 0.6);
    const n = noise(t, 0.02), hp = filt("highpass", 2500, 0.7, t), gn = gainAt(t); env(gn, t, 0.001, 0.25 * v * dv(o.click, 1), 0.002, 0.012);
    n.connect(hp); hp.connect(gn); route(gn, t, { drum: true });
    if (o.pump !== false) pump(t, o.pumpDepth, o.pumpRel);
  };
  // A frame drum: the deep "doum" of the palm in the middle of the skin (a low thump, and the knock
  // of the skin, which a phone can play), or with `edge` the bright "tak" of the fingers at the rim.
  I.frame = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    if (o.edge) {
      const f = o.f || 340, a = osc("triangle", f, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.08);
      env(g, t, 0.001, 0.2 * v, 0.004, 0.09); a.connect(g); route(g, t, { drum: true, pan: dv(o.pan, 0.25), rev: 0.2 }); a.start(t); a.stop(t + 0.2);
      const n = noise(t, 0.08), bp = filt("bandpass", 2300, 1.2, t), gn = gainAt(t); env(gn, t, 0.001, 0.28 * v, 0.003, 0.045);
      n.connect(bp); bp.connect(gn); route(gn, t, { drum: true, pan: dv(o.pan, 0.25), rev: 0.2 });
      return;
    }
    const f = o.f || 96, a = osc("sine", f * 1.8, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(f, t + 0.045);
    env(g, t, 0.002, 0.45 * v, 0.01, o.decay || 0.3); a.connect(g); route(g, t, { drum: true, pan: o.pan, rev: dv(o.rev, 0.18) }); a.start(t); a.stop(t + 0.6);
    const n = noise(t, 0.2), bp = filt("bandpass", o.skin || 300, 1.3, t), gn = gainAt(t); env(gn, t, 0.001, 0.62 * v, 0.006, 0.12);
    n.connect(bp); bp.connect(gn); route(gn, t, { drum: true, pan: o.pan, rev: 0.15 });
  };
  // The great drum, struck with a padded beater: a deep boom falling in pitch, and the skin's slap,
  // darker than the frame drum's.
  I.drum = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    const a = osc("sine", 150, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(o.f || 64, t + 0.14);
    env(g, t, 0.002, 0.5 * v, 0.02, o.decay || 0.5); a.connect(g); route(g, t, { drum: true, rev: 0.25, drive: 0.15 }); a.start(t); a.stop(t + 0.9);
    const n = noise(t, 0.3), lp = filt("lowpass", 1100, 1, t), gn = gainAt(t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.2); env(gn, t, 0.001, 0.7 * v, 0.01, 0.2);
    n.connect(lp); lp.connect(gn); route(gn, t, { drum: true, rev: 0.3 });
    if (o.pump !== false) pump(t);
  };
  // Toms: a tuned skin, the pitch dropping into the note, with the stick's knock on top.
  I.tom = function (t, midi, v, o) {
    o = o || {}; v = dv(v, 1);
    const f = mtof(midi), a = osc("sine", f * 1.6, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    env(g, t, 0.002, 0.55 * v, 0.02, o.decay || 0.3); a.connect(g); route(g, t, { drum: true, pan: o.pan, rev: 0.25 }); a.start(t); a.stop(t + 0.5);
    const n = noise(t, 0.08), bp = filt("bandpass", Math.min(4000, f * 3), 1.5, t), gn = gainAt(t); env(gn, t, 0.001, 0.22 * v, 0.004, 0.05);
    n.connect(bp); bp.connect(gn); route(gn, t, { drum: true, pan: o.pan, rev: 0.2 });
  };
  // A rattle of little bells (a sistrum): the quicker subdivisions at the height of a fight.
  I.shaker = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    const n = noise(t, 0.2), bp = filt("bandpass", 4600, 1.8, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.decay || 0.08));
    n.connect(bp); bp.connect(g); route(g, t, { drum: true, pan: dv(o.pan, -0.3), rev: 0.15 });
  };
  // Basses: a plucked string (a saw through a closing filter, with a sine under it), or a sub.
  I.bass = function (t, midi, dur, v, o) {
    o = o || {}; v = dv(v, 1);
    const f = mtof(midi), kind = o.kind || "pluck", end = t + dur;
    const g = gainAt(t), lp = filt("lowpass", 200, o.q || 6, t), oscs = [];
    if (kind === "sub") { const a = osc("sine", f, t); oscs.push(a); a.connect(g); }
    else { const a = osc(kind === "square" ? "square" : "sawtooth", f, t), s = osc("sine", f, t), sg = gainAt(t, 0.3); a.connect(lp); s.connect(sg); sg.connect(g); oscs.push(a, s); lp.connect(g); }
    if (kind !== "sub") { lp.frequency.setValueAtTime(o.cut || 1800, t); lp.frequency.exponentialRampToValueAtTime(o.floor || 180, t + (o.fd || 0.16)); }
    const pk = 0.4 * v, sus = dv(o.sus, 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.004);
    g.gain.setTargetAtTime(pk * sus, t + 0.01, 0.08);
    g.gain.setValueAtTime(pk * sus, Math.max(t + 0.02, end - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
    route(g, t, { drive: dv(o.drive, 0.2), pan: o.pan, rev: o.rev });
    for (const a of oscs) { a.start(t); a.stop(end + 0.1); }
  };
  // The organ. Each pipe is a sum of partials (the stop's wave); each note has two pipes a breath
  // apart in tune, which gives the slow beating of a real rank; there is a puff of wind (the chiff)
  // as a pipe speaks; and a swell box, a filter that opens as the chord grows (`swell` is where it
  // opens from).
  I.organ = function (t, notes, dur, v, o) {
    o = o || {}; v = dv(v, 1) / Math.sqrt(notes.length);
    const att = dv(o.att, 0.05), rel = dv(o.rel, 0.35), hold = Math.max(att, dur), cut = o.cut || 3200, w = wave(o.stop || "principal");
    const lp = filt("lowpass", cut, 0.6, t), g = gainAt(t);
    if (o.swell) { lp.frequency.setValueAtTime(o.swell, t); lp.frequency.exponentialRampToValueAtTime(cut, t + att * 1.3 + 0.02); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * v, t + att); g.gain.setValueAtTime(0.2 * v, t + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    lp.connect(g); route(g, t, { rev: dv(o.rev, 0.45), dly: o.dly, pan: o.pan, sfx: o.sfx });
    const width = dv(o.width, 0.5);
    for (const [i, m] of notes.entries()) {
      const p = ac.createStereoPanner(); p.pan.value = notes.length > 1 ? (i / (notes.length - 1) - 0.5) * width : 0; p.connect(lp);
      for (const c of [-3, 3]) {
        const a = ac.createOscillator(); a.setPeriodicWave(w); a.frequency.value = mtof(m); a.frequency.setValueAtTime(mtof(m), t); a.detune.value = c + (i % 2 ? 0.7 : -0.7);
        a.connect(p); a.start(t); a.stop(t + hold + rel + 0.05);
      }
      if (o.chiff !== false) {
        const n = noise(t, 0.06), bp = filt("bandpass", Math.min(6000, mtof(m) * 3), 3, t), cg = gainAt(t); env(cg, t, 0.004, 0.05 * v * dv(o.chiff, 1), 0.01, 0.05);
        n.connect(bp); bp.connect(cg); route(cg, t, { rev: 0.3, sfx: o.sfx, pan: o.pan });
      }
    }
  };
  // The harpsichord: the quill's pluck (bright, then quickly mellowing), a second string an octave
  // up as the four-foot stop adds, the click of the quill, and the damper falling when the key
  // is let go.
  I.harp = function (t, midi, dur, v, o) {
    o = o || {}; v = dv(v, 1);
    const f = mtof(midi), end = t + Math.max(0.08, dur), lp = filt("lowpass", o.cut || 4000, 0.7, t), g = gainAt(t);
    lp.frequency.exponentialRampToValueAtTime(o.floor || 1300, t + 0.3);
    const pk = 0.2 * v, ring = o.ring || 0.7, at = pk * 0.5 * Math.exp(-(end - t - 0.06) / ring);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + 0.002); g.gain.exponentialRampToValueAtTime(pk * 0.5, t + 0.06);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, at), end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.09);
    const w = wave("harpsi");
    for (const [fr, k, c] of [[f, 1, -2], [f * 2, dv(o.oct, 0.3), 3]]) {
      if (!k) continue;
      const a = ac.createOscillator(); a.setPeriodicWave(w); a.frequency.value = fr; a.frequency.setValueAtTime(fr, t); a.detune.value = c;
      const ga = gainAt(t, k); a.connect(ga); ga.connect(lp); a.start(t); a.stop(end + 0.15);
    }
    lp.connect(g); route(g, t, { pan: o.pan, rev: dv(o.rev, 0.22), dly: o.dly });
    const n = noise(t, 0.02), bp = filt("bandpass", 2800, 1.2, t), gn = gainAt(t); env(gn, t, 0.001, 0.035 * v, 0.002, 0.012);
    n.connect(bp); bp.connect(gn); route(gn, t, { pan: o.pan });
  };
  // A bell, by FM: glass, small bells, the ring of a parried blow.
  I.bell = function (t, midi, dur, v, o) {
    o = o || {}; v = dv(v, 1);
    const f = mtof(midi), car = osc("sine", f, t), mod = osc("sine", f * (o.ratio || 3.5), t), mg = gainAt(t, f * (o.index || 3));
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + (dur || 1));
    mod.connect(mg); mg.connect(car.frequency);
    const g = gainAt(t); env(g, t, 0.002, 0.22 * v, 0.005, dur || 1.2);
    car.connect(g); route(g, t, { pan: o.pan, rev: dv(o.rev, 0.4), dly: dv(o.dly, 0.2), sfx: o.sfx });
    car.start(t); mod.start(t); car.stop(t + (dur || 1.2) + 0.3); mod.stop(t + (dur || 1.2) + 0.3);
  };
  // A church bell, far off: the partials of a cast bell (the hum an octave below, the strike note,
  // the minor third that makes a bell sound like a bell, the fifth, the nominal an octave up, and a
  // few above), each ringing for its own time, the high ones dying first, the hum and the strike
  // note in slow beating pairs.
  const PARTIALS = [[0.5, 0.22, 1], [1, 0.8, 0.75], [1.19, 0.5, 0.55], [1.5, 0.28, 0.45], [2, 0.6, 0.4], [2.51, 0.2, 0.25], [2.66, 0.16, 0.22], [3.01, 0.14, 0.2], [4.1, 0.08, 0.12]];
  I.toll = function (t, midi, dur, v, o) {
    o = o || {}; v = dv(v, 1); dur = dur || 5;
    const f = mtof(midi), g = gainAt(t, 0.1 * v);
    for (const [i, [r, k, d]] of PARTIALS.entries()) {
      const a = osc("sine", f * r * (1 + (Math.random() - 0.5) * 0.002), t), ga = gainAt(t);
      env(ga, t, 0.003, k, 0.01, dur * d); a.connect(ga); ga.connect(g); a.start(t); a.stop(t + dur * d + 0.1);
      if (i < 2) { const b = osc("sine", f * r + 0.7, t); b.connect(ga); b.start(t); b.stop(t + dur * d + 0.1); }
    }
    route(g, t, { pan: o.pan, rev: dv(o.rev, 0.6), sfx: o.sfx });
    const n = noise(t, 0.05), bp = filt("bandpass", Math.min(5000, f * 6), 1.5, t), gn = gainAt(t); env(gn, t, 0.001, 0.05 * v, 0.002, 0.04);
    n.connect(bp); bp.connect(gn); route(gn, t, { pan: o.pan, rev: dv(o.rev, 0.6), sfx: o.sfx });
  };
  // The choir: a sung vowel, made from formants over a breathing sawtooth.
  const VOWELS = { a: [[800, 1], [1150, 0.5], [2900, 0.25]], o: [[450, 1], [800, 0.45], [2830, 0.15]], u: [[325, 1], [700, 0.3], [2700, 0.1]], e: [[400, 1], [1600, 0.5], [2700, 0.25]], i: [[270, 1], [2140, 0.3], [2950, 0.2]] };
  I.choir = function (t, notes, dur, v, o) {
    o = o || {}; v = dv(v, 1) / Math.sqrt(notes.length);
    const vw = VOWELS[o.vowel || "a"], g = gainAt(t), att = dv(o.att, 0.18), rel = o.rel || 0.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + att); g.gain.setValueAtTime(0.5 * v, t + Math.max(att, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(att, dur) + rel);
    const sum = ac.createGain();
    for (const [f, k] of vw) { const bp = filt("bandpass", f * (o.formant || 1), 8, t), fg = gainAt(t, k * 3); sum.connect(bp); bp.connect(fg); fg.connect(g); }
    const end = t + Math.max(att, dur) + rel + 0.1;
    const lfo = osc("sine", 5.1, t), lg = gainAt(t, dv(o.vib, 9)); lfo.connect(lg);
    for (const [i, m] of notes.entries()) for (const c of [-7, 6]) {
      const a = osc("sawtooth", mtof(m), t); a.detune.value = c; lg.connect(a.detune);
      if (o.glide) { a.frequency.setValueAtTime(mtof(o.glide), t); a.frequency.exponentialRampToValueAtTime(mtof(m), t + (o.glideT || 0.09)); }
      const p = ac.createStereoPanner(); p.pan.value = (i % 2 ? 0.3 : -0.3) * (c > 0 ? 1 : -1) * 0.6; a.connect(p); p.connect(sum);
      a.start(t); a.stop(end);
    }
    lfo.start(t); lfo.stop(end);
    route(g, t, { rev: dv(o.rev, 0.55), dly: o.dly, pan: o.pan, sfx: o.sfx });
  };
  // The drone: a low hum of reeds, two of them a breath apart in tune for each note, through a dark
  // filter that slowly breathes open and shut. Long drones overlap and cross-fade, so it never stops.
  I.drone = function (t, notes, dur, v, o) {
    o = o || {}; v = dv(v, 1) / Math.sqrt(notes.length);
    const att = dv(o.att, 1.5), rel = dv(o.rel, 1.5), hold = Math.max(att, dur), cut = o.cut || 420;
    const lp = filt("lowpass", cut, 0.8, t), g = gainAt(t), end = t + hold + rel + 0.1;
    const lfo = osc("sine", o.breath || 0.11, t), lg = gainAt(t, cut * 0.35); lfo.connect(lg); lg.connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13 * v, t + att); g.gain.setValueAtTime(0.13 * v, t + hold); g.gain.linearRampToValueAtTime(0.0001, t + hold + rel);
    lp.connect(g); route(g, t, { rev: dv(o.rev, 0.4), pan: o.pan });
    for (const [i, m] of notes.entries()) for (const c of [-5, 5]) {
      const a = osc("sawtooth", mtof(m), t); a.detune.value = c + i;
      const p = ac.createStereoPanner(); p.pan.value = c > 0 ? 0.3 : -0.3; a.connect(p); p.connect(lp); a.start(t); a.stop(end);
    }
    lfo.start(t); lfo.stop(end);
  };
  // Transitions: a riser into a change, an impact on its downbeat, a swell, a falling sweep.
  I.riser = function (t, dur, v) {
    v = dv(v, 1);
    const n = noise(t, dur), bp = filt("bandpass", 300, 3, t), g = gainAt(t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
    n.connect(bp); bp.connect(g); route(g, t, { rev: 0.4 });
  };
  I.impact = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    const a = osc("sine", 90, t), g = gainAt(t); a.frequency.exponentialRampToValueAtTime(34, t + 0.9);
    env(g, t, 0.003, 0.7 * v, 0.05, 1.1); a.connect(g); route(g, t, { drum: true, rev: 0.4, drive: 0.3, sfx: o.sfx }); a.start(t); a.stop(t + 1.5);
    const n = noise(t, 1.5), lp = filt("lowpass", 1600, 0.7, t), gn = gainAt(t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    env(gn, t, 0.002, 0.32 * v, 0.02, 1.2); n.connect(lp); lp.connect(gn); route(gn, t, { drum: true, rev: 0.6, sfx: o.sfx });
  };
  I.swell = function (t, dur, v, o) {
    o = o || {};
    const n = noise(t, dur), hp = filt("highpass", 3000, 0.7, t), g = gainAt(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15 * dv(v, 1), t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    n.connect(hp); hp.connect(g); route(g, t, { rev: 0.5, pan: 0.2, sfx: o.sfx });
  };
  I.fall = function (t, dur, v, o) {
    o = o || {};
    const n = noise(t, dur), bp = filt("bandpass", 5000, 2, t), g = gainAt(t); bp.frequency.exponentialRampToValueAtTime(200, t + dur);
    env(g, t, 0.01, 0.18 * dv(v, 1), 0.02, dur); n.connect(bp); bp.connect(g); route(g, t, { rev: 0.5, sfx: o.sfx });
  };
  // The tam-tam: a swell of inharmonic partials that blooms after the strike, and a long shimmer.
  I.gong = function (t, v, o) {
    o = o || {}; v = dv(v, 1);
    const base = o.f || 68, dur = o.dur || 4.5, bus = o.sfx ? { sfx: true } : { drum: true };
    for (const [r, k, d] of [[1, 1, 1], [1.48, 0.7, 0.8], [2.13, 0.5, 0.7], [2.76, 0.45, 0.55], [3.41, 0.3, 0.45], [4.53, 0.22, 0.35]]) {
      const a = osc("sine", base * r, t), g = gainAt(t); a.frequency.linearRampToValueAtTime(base * r * 0.985, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14 * v * k, t + 0.08 + r * 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d);
      a.connect(g); route(g, t, Object.assign({ rev: 0.5, pan: (r % 1 - 0.5) * 0.6 }, bus)); a.start(t); a.stop(t + dur + 0.1);
    }
    const n = noise(t, dur), bp = filt("bandpass", 2400, 1.2, t), gn = gainAt(t);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.07 * v, t + 0.35); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
    n.connect(bp); bp.connect(gn); route(gn, t, Object.assign({ rev: 0.6 }, bus));
  };
  A.I = I;

  // ---- The conductor -----------------------------------------------------------------------
  // A song: { bpm, swing (0..0.5 of a sixteenth), bars: [sixteenths in each bar, cycling], beat
  // (sixteenths to a beat, four by default), duck (pump depth), delay (seconds), gain (how loud, 1
  // by default), play(e) } where play is called on every sixteenth with e = { t, s (step in bar),
  // n (steps in bar), b (bar), sd (a sixteenth in seconds), L (intensity 0-4), from (the intensity
  // before this step), rose and fell (true on the step where it changed), I (instruments) }.
  // The game asks for an intensity with setLevel; a rise comes in on the next beat, a fall at the
  // start of the next bar.
  const M = { song: null, next: null, step: 0, bar: 0, stepT: 0, barT: 0, level: 0, want: 0, fill: null, fillNext: null };
  const barLen = (S, b) => (S.bars ? S.bars[b % S.bars.length] : 16);
  A.play = function (song) {
    if (!ac) return;
    M.song = song; M.next = null; M.step = 0; M.bar = 0; M.stepT = ac.currentTime + 0.08; M.barT = M.stepT; M.level = M.want;
    duckDepth = song.duck === undefined ? 0.15 : song.duck; A.setDelay(song.delay || (60 / song.bpm) * 0.75);
    musicGain.gain.setTargetAtTime(song.gain || 1, ac.currentTime, 0.05);
    if (song.start) song.start();
  };
  // The next song begins on the next downbeat.
  A.queue = function (song) { if (!M.song) A.play(song); else M.next = song; };
  A.stop = function () { M.song = null; M.next = null; };
  A.setLevel = function (L) { M.want = Math.max(0, Math.min(4, Math.round(L) || 0)); if (!M.song) M.level = M.want; };
  A.level = () => M.level;
  A.song = () => M.song;
  // A fill or a change asked for by the game: it is played in the next bar.
  A.fill = function (kind) { M.fillNext = kind; };
  function tick() {
    if (!ac) return;
    if (M.song) schedule(ac.currentTime + 0.14);
    if (FL.on) {
      // If the page was asleep, do not play the missed heartbeats all at once.
      if (FL.next < ac.currentTime - 0.1) FL.next = ac.currentTime + 0.02;
      while (FL.next < ac.currentTime + 0.12) { heart(FL.next, 1); FL.next += HEART; }
      if (FL.voice && ac.currentTime > FL.until) { FL.voice.release(ac.currentTime, 2); FL.voice = null; }
    }
  }
  function schedule(until) {
    while (M.song && M.stepT < until) {
      const S = M.song, sd = 60 / S.bpm / 4, n = barLen(S, M.bar), from = M.level;
      if (M.want > M.level && M.step % (S.beat || 4) === 0) M.level = M.want;
      else if (M.want < M.level && M.step === 0) M.level = M.want;
      const t = M.stepT + (M.step % 2 ? (S.swing || 0) * sd : 0);
      // A step already gone by (the page was asleep) is skipped, not played late.
      if (t > ac.currentTime - 0.05) {
        try { S.play({ t, s: M.step, n, b: M.bar, sd, L: M.level, from, rose: M.level > from, fell: M.level < from, I, fill: M.fill }); } catch (e) { console.error(e); }
      }
      M.stepT += sd; M.step++;
      if (M.step >= n) {
        M.step = 0; M.bar++; M.barT = M.stepT; M.fill = M.fillNext; M.fillNext = null;
        if (M.next) { const N = M.next; M.next = null; M.song = N; M.bar = 0; duckDepth = N.duck === undefined ? 0.15 : N.duck; A.setDelay(N.delay || (60 / N.bpm) * 0.75); musicGain.gain.setTargetAtTime(N.gain || 1, M.stepT, 0.02); if (N.start) N.start(); }
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
  A.bpm = () => (M.song ? M.song.bpm : 90);
  A.musicTime = () => (ac && M.song ? { bar: M.bar, step: M.step, barT: M.barT } : null);
  // Where we are in the beat, 0 on the beat to 1 just before the next, and how long a beat is.
  A.beat = function () {
    if (!ac || !M.song) return null;
    const S = M.song, sd = 60 / S.bpm / 4, per = S.beat || 4, k = ((ac.currentTime - M.barT) / sd) / per;
    return { phase: ((k % 1) + 1) % 1, secs: sd * per };
  };

  // ---- The muffle, and the flare ---------------------------------------------------------------
  // The music muffled (paused): the low-pass closes. Only the music: the effects pass by it.
  let paused = false;
  const FL = { on: false, next: 0, voice: null, until: 0 };
  const HEART = 1.25;   // seconds from one heartbeat to the next in the flare: about 48 to the minute
  const openTo = () => (paused ? 520 : 20000);
  A.muffle = function (on, secs) { paused = !!on; if (lpf && !FL.on) lpf.frequency.setTargetAtTime(openTo(), ac.currentTime, secs || 0.15); };
  // The flare. Time slows almost to a stop: the music is muffled (the filter on it closes to about
  // 550 Hz in a quarter of a second), a slow heartbeat sounds close by, and a low choir holds one
  // dark chord. The effects are not touched: in slow time every blow is still crisp. When it ends,
  // the filter opens fast, with a rising rush of air.
  A.flare = function (on) {
    if (!ac) return;
    on = !!on;
    if (on === FL.on) return;
    FL.on = on; const t = ac.currentTime + 0.01;
    if (on) { FL.voice = flareStart(t); FL.next = t + 0.02; FL.until = t + 20; }
    else { flareEnd(t, FL.voice); FL.voice = null; }
  };
  A.flaring = () => FL.on;
  function flareStart(t) {
    lpf.frequency.setTargetAtTime(550, t, 0.07);
    hush.gain.setTargetAtTime(0.75, t, 0.1);
    return held(t, [38, 45, 50, 53], 0.2);
  }
  function flareEnd(t, voice) {
    lpf.frequency.setTargetAtTime(openTo(), t, 0.03);
    hush.gain.setTargetAtTime(1, t, 0.03);
    if (voice) voice.release(t, 0.45);
    const n = noise(t, 0.5), bp = filt("bandpass", 260, 1.4, t), g = gainAt(t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.38);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    n.connect(bp); bp.connect(g); route(g, t, { sfx: true, rev: 0.2 });
  }
  // A low choir holding a chord until it is let go: monks humming on "u", far down.
  function held(t, notes, v) {
    const vw = VOWELS.u, g = gainAt(t), rel = gainAt(t, 1), sum = ac.createGain(), oscs = [];
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v / Math.sqrt(notes.length), t + 0.7);
    for (const [f, k] of vw) { const bp = filt("bandpass", f, 7, t), fg = gainAt(t, k * 3); sum.connect(bp); bp.connect(fg); fg.connect(g); }
    const lfo = osc("sine", 4.6, t), lg = gainAt(t, 6); lfo.connect(lg); oscs.push(lfo);
    for (const [i, m] of notes.entries()) for (const c of [-6, 5]) {
      const a = osc("sawtooth", mtof(m), t); a.detune.value = c; lg.connect(a.detune);
      const p = ac.createStereoPanner(); p.pan.value = (i % 2 ? 0.25 : -0.25) * (c > 0 ? 1 : -1); a.connect(p); p.connect(sum); oscs.push(a);
    }
    g.connect(rel); route(rel, t, { sfx: true, rev: 0.5 });
    for (const a of oscs) a.start(t);
    let done = false;
    return { release(at, r) { if (done) return; done = true; rel.gain.setTargetAtTime(0.0001, at, r / 4); for (const a of oscs) a.stop(at + r + 0.3); } };
  }
  // A heartbeat, low and close: "lub-dub". A phone cannot play the deep thump, so there is a soft
  // knock in it too, low in the middle, that it can.
  function heart(t, v) {
    for (const [k, w] of [[0, 1], [0.27, 0.62]]) {
      const s = t + k, a = osc("sine", 96, s), g = gainAt(s); a.frequency.exponentialRampToValueAtTime(44, s + 0.11);
      env(g, s, 0.004, 0.2 * w * v, 0.015, 0.2); a.connect(g); route(g, s, { sfx: true }); a.start(s); a.stop(s + 0.35);
      const n = noise(s, 0.12), lp = filt("lowpass", 420, 1.2, s), gn = gainAt(s); env(gn, s, 0.003, 0.42 * w * v, 0.01, 0.08);
      n.connect(lp); lp.connect(gn); route(gn, s, { sfx: true });
    }
  }

  // ---- The wind ------------------------------------------------------------------------------------
  // A long bed of noise that never stops once begun, gusting by itself: a low howl and, above it, a
  // thin whistle through the rocks. The game sets how loud.
  let amb = null;
  A.ambience = function (o) {
    if (!ac || ac.state === "closed") return;
    o = o || {};
    if (!amb) {
      const g = ac.createGain(); g.gain.value = 0; g.connect(sfxBus);
      const band = (f, q, k, rate, depth) => {
        const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const b = ac.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = f; b.Q.value = q;
        const kg = ac.createGain(); kg.gain.value = k; s.connect(b); b.connect(kg); kg.connect(g);
        const lfo = ac.createOscillator(); lfo.frequency.value = rate; const lg = ac.createGain(); lg.gain.value = depth; lfo.connect(lg); lg.connect(b.frequency);
        const lfo2 = ac.createOscillator(); lfo2.frequency.value = rate * 0.61; const lg2 = ac.createGain(); lg2.gain.value = k * 0.4; lfo2.connect(lg2); lg2.connect(kg.gain);
        s.start(); lfo.start(); lfo2.start(); return b;
      };
      amb = { g, low: band(380, 1.1, 1, 0.085, 140), high: band(1500, 7, 0.22, 0.13, 420) };
    }
    const now = ac.currentTime;
    if (o.wind !== undefined) amb.g.gain.setTargetAtTime(0.3 * Math.max(0, Math.min(1, o.wind)), now, 0.4);
    if (o.windF !== undefined) amb.low.frequency.setTargetAtTime(o.windF, now, 0.4);
  };

  // ---- The sounds of the fight: short, restrained, made for a phone's small speaker ---------------
  // They are played at once (not on the grid), to their own bus, so the music neither pumps nor
  // muffles them. `pan` is -1..1, `v` a loudness 0..1.
  const fx = {};
  const T0 = () => ac.currentTime + 0.005;
  const ok = () => !!ac && (rendering || ac.state === "running");
  const rnd = (a, b) => a + Math.random() * (b - a);
  // A tone that sweeps from one pitch to another and dies away.
  function tone(t, type, f0, f1, dur, v, o) {
    o = o || {};
    const a = osc(type, f0, t), g = gainAt(t), att = o.att || 0.002, hold = o.hold || 0.004;
    if (f1 !== f0) a.frequency.exponentialRampToValueAtTime(f1, t + (o.sweep || att + hold + dur));
    env(g, t, att, v, hold, dur);
    let n = a;
    if (o.lp) { const l = filt("lowpass", o.lp, o.q || 0.8, t); a.connect(l); n = l; } else if (o.bp) { const b = filt("bandpass", o.bp, o.q || 2, t); a.connect(b); n = b; }
    n.connect(g); route(g, t, { sfx: true, pan: o.pan, rev: o.rev });
    a.start(t); a.stop(t + att + hold + dur + 0.05);
    return a;
  }
  // A breath of noise through a filter, swept from one place to another. `swell` makes it grow
  // (to its peak at that fraction of its length) instead of striking.
  function hiss(t, type, f0, f1, dur, v, o) {
    o = o || {};
    const att = o.att || 0.001, hold = o.hold || 0.002, len = o.swell ? dur : att + hold + dur;
    const n = noise(t, len + 0.02), b = filt(type, f0, dv(o.q, 1), t), g = gainAt(t);
    if (f1 !== f0) b.frequency.exponentialRampToValueAtTime(f1, t + len);
    if (o.swell) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * o.swell); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else env(g, t, att, v, hold, dur);
    n.connect(b); b.connect(g); route(g, t, { sfx: true, pan: o.pan, rev: o.rev });
  }
  // A breath shaped like a sung vowel, but unvoiced: the "hah" of an effort, a grunt.
  function breath(t, v, f1, f2, att, dur, fall, pan) {
    const n = noise(t, dur + 0.1), g = gainAt(t), sum = ac.createGain();
    for (const [f, k] of [[f1, 1], [f2, 0.6], [2700, 0.25]]) { const b = filt("bandpass", f, 5, t), kg = gainAt(t, k * 2.5); if (fall) b.frequency.exponentialRampToValueAtTime(f * fall, t + dur); n.connect(b); b.connect(kg); kg.connect(sum); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sum.connect(g); route(g, t, { sfx: true, pan, rev: 0.15 });
  }
  // Little stones skittering after a blow or a fall.
  function pebbles(t, n, v, pan) {
    for (let i = 0; i < n; i++) { const s = t + rnd(0.04, 0.35) * (i + 1) / n; tone(s, "triangle", rnd(900, 2200), rnd(700, 1600), 0.03, v * rnd(0.4, 1), { pan: (pan || 0) + rnd(-0.3, 0.3) }); }
  }
  // A flame's crackle.
  function crackle(t, n, len, v, pan) {
    for (let i = 0; i < n; i++) hiss(t + Math.random() * len, "highpass", rnd(3000, 5500), 3000, 0.012, v * rnd(0.5, 1), { pan });
  }
  // The monk's own sounds: steps, the climb, air.
  fx.tick = function (f, v) { if (!ok()) return; tone(T0(), "sine", f || 1800, f || 1800, 0.05, 0.12 * dv(v, 1)); };
  fx.step = function (v) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    hiss(t, "lowpass", rnd(480, 760), 260, 0.07, 0.22 * v, { q: 1.2, hold: 0.008 });
    hiss(t + 0.004, "highpass", 3400, 3400, 0.025, 0.03 * v);
  };
  fx.land = function (v) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    tone(t, "sine", 140, 52, 0.16, 0.42 * v);
    hiss(t, "lowpass", 1000, 260, 0.16, 0.3 * v, { q: 1, rev: 0.15 });
    pebbles(t + 0.02, 3, 0.05 * v);
  };
  fx.grab = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 1800, 1200, 0.05, 0.14, { q: 2 });
    tone(t, "triangle", 320, 260, 0.04, 0.08);
  };
  fx.climb = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 1300, 800, 0.24, 0.1, { q: 1.5, swell: 0.4 });
    breath(t + 0.06, 0.07, 620, 1150, 0.03, 0.2, 0.85);
    pebbles(t + 0.1, 2, 0.03);
  };
  fx.whoosh = function (v) { if (!ok()) return; hiss(T0(), "bandpass", 2400, 500, 0.24, 0.2 * dv(v, 1), { q: 1.6, swell: 0.45 }); };
  // A quick flip through the air: the air rising, then falling, and the flame fluttering.
  fx.zip = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 450, 2800, 0.14, 0.15, { q: 1.5, swell: 0.75 });
    hiss(t + 0.13, "bandpass", 2800, 600, 0.22, 0.13, { q: 1.5, swell: 0.3 });
    hiss(t + 0.04, "lowpass", 500, 1400, 0.25, 0.06, { q: 2, swell: 0.5 });
  };
  // Blows: a fist, a foot, the torch swung in a roaring arc.
  fx.punch = function (v, pan) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    tone(t, "sine", 190, 72, 0.09, 0.4 * v, { pan });
    hiss(t, "bandpass", 1400, 900, 0.045, 0.28 * v, { q: 1.2, pan });
    tone(t, "triangle", 430, 300, 0.035, 0.1 * v, { pan });
  };
  fx.kick = function (v, pan) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    tone(t, "sine", 165, 55, 0.13, 0.46 * v, { pan });
    hiss(t, "bandpass", 1000, 700, 0.07, 0.3 * v, { q: 1.1, pan });
    hiss(t, "bandpass", 2600, 1200, 0.04, 0.1 * v, { q: 1, pan });
  };
  fx.torch = function (v, pan) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    hiss(t, "bandpass", 340, 1100, 0.34, 0.27 * v, { q: 0.9, swell: 0.4, pan });
    hiss(t, "lowpass", 260, 700, 0.3, 0.12 * v, { q: 1.5, swell: 0.5, pan });
    crackle(t + 0.03, 5, 0.3, 0.07 * v, pan);
  };
  // A blow landing on a demon: a body thump, a knock (which a phone can play), the crack of it.
  fx.hit = function (v, pan) {
    if (!ok()) return; const t = T0(); v = Math.min(1.5, dv(v, 1));
    tone(t, "sine", rnd(140, 180), 48, 0.16 + 0.08 * v, 0.5 * v, { pan });
    tone(t, "triangle", rnd(330, 400), 210, 0.06, 0.16 * v, { pan });
    hiss(t, "bandpass", rnd(1300, 2100), 1100, 0.05 + 0.04 * v, 0.36 * v, { q: 1.1, pan, rev: 0.12 });
    if (v > 1.2) hiss(t, "highpass", 3000, 3000, 0.12, 0.16, { pan, rev: 0.25 });
  };
  fx.heavy = function (v, pan) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    fx.hit(1.4 * v, pan);
    tone(t, "sine", 92, 34, 0.5, 0.45 * v, { pan });
    hiss(t, "lowpass", 1400, 160, 0.5, 0.26 * v, { q: 0.9, pan, rev: 0.4 });
    pebbles(t + 0.05, 4, 0.06 * v, pan);
  };
  // The torch's shaft taking a blow: a wooden knock.
  fx.block = function () {
    if (!ok()) return; const t = T0();
    tone(t, "triangle", 520, 460, 0.07, 0.18, { bp: 800, q: 1.5 });
    hiss(t, "bandpass", 1100, 900, 0.04, 0.2, { q: 2 });
    tone(t, "sine", 170, 90, 0.07, 0.24);
  };
  // A parry at the last instant: a bright ring, and the attacker thrown.
  fx.parry = function () {
    if (!ok()) return; const t = T0();
    I.bell(t, 86, 0.9, 0.5, { ratio: 2.76, index: 2.2, sfx: true, rev: 0.4 });
    I.bell(t + 0.01, 93, 0.6, 0.2, { ratio: 3.01, index: 1.5, sfx: true, rev: 0.4 });
    fx.hit(1.0);
    hiss(t, "highpass", 5000, 5000, 0.15, 0.06, { rev: 0.3 });
  };
  // The monk struck: a thump, a grunt, and a sour low note under it.
  fx.hurt = function () {
    if (!ok()) return; const t = T0();
    tone(t, "sine", 150, 58, 0.22, 0.48);
    hiss(t, "bandpass", 900, 700, 0.08, 0.28, { q: 1.2 });
    breath(t + 0.02, 0.15, 700, 1150, 0.01, 0.22, 0.75);
    tone(t, "sawtooth", 98, 92, 0.35, 0.05, { lp: 600 });
    tone(t, "sawtooth", 104, 97, 0.35, 0.04, { lp: 600 });
  };
  // The flame sputtering: little pops of breath, thinning out.
  fx.gutter = function () {
    if (!ok()) return; const t = T0();
    for (let k = 0; k < 7; k++) hiss(t + k * 0.055 + rnd(0, 0.03), "lowpass", rnd(700, 1400), 300, 0.04, 0.16 * (1 - k / 9), { q: 1.5 });
    hiss(t, "bandpass", 2000, 600, 0.45, 0.05, { q: 0.8 });
  };
  // The demons. Each sin has its own voice: a pitch, a waveform, a throat (a band of the spectrum),
  // a wobble, and a chord of three notes in the hymn's mode.
  const SINV = {
    pride: { f: 640, w: "sawtooth", bp: 2000, q: 3, wob: 7, k: 1, ch: [74, 79, 86] },       // a haughty, glassy shriek
    avarice: { f: 400, w: "square", bp: 1500, q: 4, wob: 23, k: 1.3, ch: [72, 76, 79] },    // a dry, rattling cackle
    lust: { f: 560, w: "triangle", bp: 1300, q: 2, wob: 5, k: 1, ch: [77, 81, 84] },        // a sliding, sinuous cry
    envy: { f: 470, w: "sawtooth", bp: 1700, q: 6, wob: 13, k: 2.2, ch: [74, 77, 81] },     // a thin, sour whine
    gluttony: { f: 150, w: "sawtooth", bp: 520, q: 3, wob: 9, k: 1.4, ch: [62, 69, 72] },   // a wet, low bellow
    wrath: { f: 210, w: "sawtooth", bp: 850, q: 2, wob: 31, k: 1, ch: [64, 70, 74] },       // a rasping roar
    sloth: { f: 320, w: "triangle", bp: 720, q: 2, wob: 3, k: 1, ch: [67, 74, 77] },        // a long, slack sigh
  };
  const sinv = (s) => SINV[s] || SINV.wrath;
  // A demon's cry: a squeal or a bellow that cracks and drops away, in the voice of its sin.
  function cry(t, s, len, up, v, pan) {
    const f0 = s.f * rnd(0.92, 1.08), a = osc(s.w, f0, t), bp = filt("bandpass", s.bp, s.q, t), g = gainAt(t);
    a.frequency.linearRampToValueAtTime(f0 * up, t + len * 0.18); a.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + len);
    const lfo = osc("sine", s.wob, t), lg = gainAt(t, f0 * 0.07); lfo.connect(lg); lg.connect(a.frequency);
    env(g, t, 0.005, v * s.k, len * 0.2, len * 0.8); a.connect(bp); bp.connect(g); route(g, t, { sfx: true, pan, rev: 0.25 });
    a.start(t); lfo.start(t); a.stop(t + len + 0.1); lfo.stop(t + len + 0.1);
  }
  fx.demonHurt = function (sin, pan) { if (ok()) cry(T0(), sinv(sin), 0.26, 1.5, 0.18, pan); };
  // Brought to nothing: a crack like stone splitting, a long falling cry, and its chord left
  // hanging, broken (the bells are out of tune with one another).
  fx.demonBroken = function (sin) {
    if (!ok()) return; const t = T0(), s = sinv(sin);
    hiss(t, "highpass", 2500, 1800, 0.12, 0.16, { rev: 0.3 });
    tone(t, "sine", 120, 60, 0.25, 0.3);
    cry(t + 0.04, s, 0.8, 1.2, 0.15);
    for (const [i, m] of s.ch.entries()) I.bell(t + 0.06 + i * 0.05, m, 1.4, 0.12, { ratio: 1.41, index: 1.4, sfx: true, rev: 0.5 });
  };
  // Cast out, gone up in ash: a hiss, a thump, and a low chord on the organ.
  fx.castOut = function (sin) {
    if (!ok()) return; const t = T0(), s = sinv(sin);
    hiss(t, "highpass", 2200, 5200, 1.1, 0.13, { swell: 0.12, q: 0.6, rev: 0.4 });
    tone(t, "sine", 110, 44, 0.4, 0.34);
    cry(t, s, 0.5, 1.1, 0.1);
    I.organ(t + 0.04, [50, 57, s.ch[0] - 12], 0.45, 0.55, { stop: "principal", att: 0.05, rel: 1.1, sfx: true, rev: 0.7, chiff: 0.5 });
  };
  // The finishers.
  fx.finisher = function (kind) {
    if (!ok()) return; const t = T0();
    if (kind === "underFoot") {
      // A stamp that shakes the rock, and a life given back: two bright notes rising.
      tone(t, "sine", 105, 34, 0.6, 0.55);
      hiss(t, "lowpass", 1600, 130, 0.6, 0.32, { rev: 0.4 });
      pebbles(t + 0.05, 5, 0.06);
      I.bell(t + 0.25, 74, 1.4, 0.32, { ratio: 2, index: 0.9, sfx: true, rev: 0.5 });
      I.bell(t + 0.36, 81, 1.6, 0.32, { ratio: 2, index: 0.9, sfx: true, rev: 0.5 });
    } else if (kind === "pillar") {
      // A pillar of fire: a roar rising, and the organ's trumpets rising with it. The oil is full.
      hiss(t, "bandpass", 200, 2600, 1.0, 0.28, { q: 0.8, swell: 0.6, rev: 0.3 });
      crackle(t + 0.1, 8, 0.8, 0.07);
      I.organ(t, [50, 57, 62], 0.9, 0.45, { stop: "reed", att: 0.25, swell: 300, cut: 3200, rel: 0.6, sfx: true, rev: 0.5, chiff: false });
      I.organ(t + 0.35, [69, 74], 0.7, 0.35, { stop: "reed", att: 0.15, swell: 600, cut: 4000, rel: 0.8, sfx: true, rev: 0.6, chiff: false });
    } else if (kind === "scattered") {
      // A whirl of the torch, three times round, and the enemies scattered like sparks.
      for (let k = 0; k < 3; k++) hiss(t + k * 0.11, "bandpass", 600, 2400, 0.14, 0.17, { q: 1.4, swell: 0.6, pan: -0.6 + k * 0.6 });
      for (let k = 0; k < 6; k++) I.bell(t + 0.3 + k * 0.045, [74, 77, 81, 84, 86, 89][k], 0.7, 0.16, { ratio: 3.01, index: 1.4, sfx: true, pan: rnd(-0.8, 0.8), rev: 0.4 });
      tone(t + 0.3, "sine", 120, 50, 0.3, 0.3);
    } else if (kind === "virtue") {
      // The virtue: the light floods, and the choir sings out a major chord at the end of a dark
      // hymn, as the old organists did (the Picardy third).
      I.choir(t, [50, 57, 62, 66, 69], 1.8, 0.42, { vowel: "a", att: 0.3, rel: 1.2, rev: 0.7, vib: 4, sfx: true });
      for (const [i, m] of [74, 78, 81, 86].entries()) I.bell(t + 0.1 + i * 0.08, m, 1.6, 0.18, { ratio: 2, index: 0.8, sfx: true, rev: 0.6 });
      I.swell(t, 0.8, 0.6, { sfx: true });
      tone(t, "sine", 90, 45, 0.6, 0.3);
    } else {
      // Cast Out: the torch driven home, a burst of light, the demon gone.
      tone(t, "sine", 125, 40, 0.45, 0.5);
      hiss(t, "highpass", 2400, 6000, 0.7, 0.14, { swell: 0.1, rev: 0.4 });
      hiss(t, "bandpass", 500, 1400, 0.3, 0.2, { q: 0.9, swell: 0.3 });
      I.bell(t + 0.03, 81, 1.2, 0.28, { ratio: 2, index: 1, sfx: true, rev: 0.5 });
      I.organ(t + 0.03, [50, 57, 62], 0.5, 0.45, { stop: "principal", att: 0.04, rel: 0.9, sfx: true, rev: 0.6, chiff: 0.5 });
    }
  };
  // Things picked up, thrown, caught, sent back.
  fx.pickup = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 1500, 1100, 0.08, 0.1, { q: 1.5 });
    tone(t + 0.02, "triangle", 620, 560, 0.03, 0.08);
  };
  fx.throw = function (v) {
    if (!ok()) return; const t = T0(); v = dv(v, 1);
    hiss(t, "bandpass", 1800, 600, 0.22, 0.19 * v, { q: 1.5, swell: 0.35 });
    breath(t, 0.1 * v, 760, 1250, 0.01, 0.16, 0.85);
  };
  fx.catchIt = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 1700, 1100, 0.05, 0.26, { q: 1.3 });
    tone(t, "sine", 230, 130, 0.06, 0.22);
  };
  fx.flick = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 2800, 2000, 0.03, 0.3, { q: 1.2 });
    tone(t, "triangle", 500, 380, 0.04, 0.12);
    hiss(t + 0.02, "bandpass", 600, 2600, 0.18, 0.15, { q: 1.5, swell: 0.6 });
  };
  // A thing striking: a stone, a jar, a beam, a skull, a burning brand, a flask.
  fx.objHit = function (kind, pan) {
    if (!ok()) return; const t = T0();
    if (kind === "jar") return fx.shatter(pan);
    if (kind === "flask") return fx.splash(pan);
    if (kind === "beam") {
      tone(t, "triangle", 175, 140, 0.25, 0.3, { lp: 900, pan });
      hiss(t, "bandpass", 620, 500, 0.12, 0.3, { q: 1.4, pan });
      tone(t, "sine", 110, 55, 0.2, 0.3, { pan });
    } else if (kind === "skull") {
      tone(t, "sine", 720, 640, 0.09, 0.18, { pan });
      hiss(t, "bandpass", 1100, 1000, 0.06, 0.26, { q: 5, pan });
      tone(t, "triangle", 300, 260, 0.08, 0.12, { pan });
    } else if (kind === "brand") {
      fx.hit(0.7, pan);
      hiss(t, "bandpass", 500, 1500, 0.3, 0.16, { q: 0.9, swell: 0.2, pan });
      crackle(t, 6, 0.4, 0.08, pan);
    } else {
      tone(t, "sine", 270, 180, 0.07, 0.3, { pan });
      hiss(t, "bandpass", 2200, 1600, 0.05, 0.34, { q: 1.2, pan });
      pebbles(t + 0.03, 2, 0.05, pan);
    }
  };
  // A jar breaking: a crash, and shards of fired clay ringing as they scatter.
  fx.shatter = function (pan) {
    if (!ok()) return; const t = T0();
    hiss(t, "highpass", 2500, 2000, 0.4, 0.26, { q: 0.8, pan, rev: 0.3 });
    tone(t, "sine", 260, 120, 0.1, 0.25, { pan });
    for (let i = 0; i < 6; i++) I.bell(t + 0.02 + i * 0.035, 76 + Math.floor(Math.random() * 14), 0.3, 0.2, { ratio: 2.4, index: 1.8, sfx: true, pan: (pan || 0) + rnd(-0.5, 0.5), rev: 0.2 });
  };
  // Holy water: the flask lobbed (a slosh, the glint of glass), and bursting (glassy and hissing:
  // the glass breaks, the water splashes, and it sizzles where it touches a demon, with a faint
  // clear bell in it).
  fx.flaskThrow = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 1600, 600, 0.24, 0.13, { q: 1.5, swell: 0.4 });
    hiss(t, "bandpass", 700, 1100, 0.2, 0.08, { q: 3, swell: 0.5 });
    I.bell(t + 0.02, 98, 0.25, 0.12, { ratio: 3.7, index: 1, sfx: true });
  };
  fx.splash = function (pan) {
    if (!ok()) return; const t = T0();
    for (let i = 0; i < 4; i++) I.bell(t + i * 0.025, 93 + Math.floor(Math.random() * 11), 0.25, 0.17, { ratio: 3.7, index: 2, sfx: true, pan: (pan || 0) + rnd(-0.4, 0.4), rev: 0.2 });
    hiss(t, "bandpass", 2200, 800, 0.32, 0.28, { q: 0.8, pan, rev: 0.3 });
    hiss(t + 0.03, "highpass", 4500, 6000, 0.75, 0.1, { swell: 0.12, q: 0.7, pan });
    for (let i = 0; i < 4; i++) { const s = t + 0.04 + i * 0.05 + Math.random() * 0.03; tone(s, "sine", 700 + Math.random() * 500, 1600 + Math.random() * 600, 0.05, 0.07, { pan }); }
    I.bell(t + 0.05, 86, 1.3, 0.12, { ratio: 2, index: 0.7, sfx: true, pan, rev: 0.5 });
  };
  fx.flaskGet = function () {
    if (!ok()) return; const t = T0();
    for (const [i, m] of [81, 86, 93].entries()) I.bell(t + i * 0.06, m, 0.9, 0.22, { ratio: 2, index: 0.9, sfx: true, rev: 0.4 });
    I.bell(t, 98, 0.2, 0.08, { ratio: 3.7, index: 1, sfx: true });
  };
  // No holy water left: a dry click.
  fx.empty = function () {
    if (!ok()) return; const t = T0();
    tone(t, "sine", 2400, 2200, 0.02, 0.12);
    tone(t + 0.01, "triangle", 600, 500, 0.03, 0.08);
  };
  // The flare, as the torch is raised: a roar swelling, a deep boom, and high bells. And the flame
  // settling back when it is spent.
  fx.flareOn = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "lowpass", 400, 3200, 0.7, 0.3, { q: 1, swell: 0.35, rev: 0.3 });
    tone(t, "sine", 85, 32, 0.9, 0.45);
    crackle(t + 0.05, 8, 0.6, 0.07);
    I.bell(t + 0.08, 86, 1.6, 0.14, { ratio: 2, index: 0.7, sfx: true, rev: 0.6 });
    I.bell(t + 0.14, 93, 1.4, 0.1, { ratio: 2, index: 0.7, sfx: true, rev: 0.6 });
  };
  fx.flareOff = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "lowpass", 2600, 350, 0.6, 0.17, { q: 1, swell: 0.1 });
    crackle(t, 3, 0.3, 0.05);
  };
  // The oil flask full: a glint and a soft "fwoomp" of the flame.
  fx.oilReady = function () {
    if (!ok()) return; const t = T0();
    I.bell(t, 81, 1.0, 0.22, { ratio: 2, index: 1, sfx: true, rev: 0.4 });
    I.bell(t + 0.08, 88, 1.2, 0.2, { ratio: 2, index: 1, sfx: true, rev: 0.4 });
    hiss(t, "lowpass", 300, 1300, 0.22, 0.13, { q: 1.2, swell: 0.5 });
  };
  // A demon marked in the flare's stroke: a bell, one step higher up the mode for each.
  const MARKS = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93];
  fx.mark = function (i) {
    if (!ok()) return; const t = T0();
    I.bell(t, MARKS[Math.max(0, Math.min(MARKS.length - 1, i | 0))] + 12, 0.7, 0.3, { ratio: 2, index: 1.2, sfx: true, rev: 0.3 });
    tone(t, "sine", 2600, 2400, 0.02, 0.05);
  };
  // A link in the chain of blows: a bright "shing".
  fx.chain = function () {
    if (!ok()) return; const t = T0();
    I.bell(t, 93, 0.4, 0.2, { ratio: 3.5, index: 1.5, sfx: true, rev: 0.3 });
    hiss(t, "highpass", 5000, 8000, 0.12, 0.06);
  };
  // The waves: a bell tolling and a low drum as one begins (and, every fifth, the tam-tam); the
  // "Amen" of the hymn sung softly when one is cleared.
  fx.waveStart = function (n) {
    if (!ok()) return; const t = T0();
    I.toll(t, 45, 5, 0.85, { sfx: true, rev: 0.5 });
    tone(t, "sine", 90, 40, 0.6, 0.45);
    hiss(t, "lowpass", 600, 150, 0.5, 0.2, { rev: 0.3 });
    if (n && n % 5 === 0) I.gong(t + 0.02, 0.6, { sfx: true, f: 62, dur: 4 });
  };
  fx.waveClear = function () {
    if (!ok()) return; const t = T0();
    // A-men: D E D, C D, over the open fifth of D, as the Dominicans end the hymn (GregoBase 6927).
    I.choir(t, [50, 57], 2.3, 0.26, { vowel: "a", att: 0.3, rel: 1, rev: 0.7, vib: 3, sfx: true });
    let at = t;
    for (const [m, len, vw] of [[62, 0.3, "a"], [64, 0.3, "a"], [62, 0.45, "a"], [60, 0.4, "e"], [62, 1.0, "e"]]) { I.choir(at, [m], len + 0.05, 0.3, { vowel: vw, att: 0.06, rel: 0.5, rev: 0.7, vib: 3, sfx: true }); at += len; }
    I.bell(t + 1.45, 86, 1.6, 0.12, { ratio: 2, index: 0.7, sfx: true, rev: 0.6 });
  };
  // A new finisher opened: bells rising through the open fifths of D, and a breath of choir.
  fx.unlock = function () {
    if (!ok()) return; const t = T0();
    for (const [i, m] of [62, 69, 74, 81].entries()) I.bell(t + i * 0.09, m + 12, 1.2, 0.2, { ratio: 2, index: 0.9, sfx: true, rev: 0.5 });
    I.choir(t + 0.2, [74, 81], 1.2, 0.2, { vowel: "o", att: 0.3, rel: 1, rev: 0.7, sfx: true });
    I.swell(t, 0.6, 0.4, { sfx: true });
  };
  // Death: the flame goes out, a long moan sinks away, and a low bell tolls.
  fx.death = function () {
    if (!ok()) return; const t = T0();
    for (let k = 0; k < 10; k++) hiss(t + k * 0.09 + rnd(0, 0.05) + k * k * 0.006, "lowpass", rnd(600, 1300), 300, 0.05, 0.16 * (1 - k / 11), { q: 1.5 });
    const a = osc("sawtooth", 110, t), lp = filt("lowpass", 700, 1, t), g = gainAt(t);
    a.frequency.exponentialRampToValueAtTime(52, t + 2.2); lp.frequency.exponentialRampToValueAtTime(200, t + 2.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    a.connect(lp); lp.connect(g); route(g, t, { sfx: true, rev: 0.5 }); a.start(t); a.stop(t + 2.5);
    I.toll(t + 0.6, 38, 6, 0.7, { sfx: true, rev: 0.6 });
    tone(t, "sine", 80, 30, 1.2, 0.3);
  };
  // Lust's ribbon: cast in a sinuous rising glide with a rustle; broken with a snap.
  fx.tether = function () {
    if (!ok()) return; const t = T0();
    const a = osc("triangle", 420, t), bp = filt("bandpass", 1200, 2, t), g = gainAt(t), lfo = osc("sine", 6, t), lg = gainAt(t, 50);
    a.frequency.exponentialRampToValueAtTime(1150, t + 0.5); lfo.connect(lg); lg.connect(a.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    a.connect(bp); bp.connect(g); route(g, t, { sfx: true, rev: 0.3 }); a.start(t); lfo.start(t); a.stop(t + 0.65); lfo.stop(t + 0.65);
    hiss(t, "bandpass", 2600, 3800, 0.5, 0.08, { q: 2, swell: 0.6 });
  };
  fx.tetherBreak = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 3500, 2500, 0.03, 0.34, { q: 1.2 });
    tone(t, "triangle", 1100, 300, 0.25, 0.12);
  };
  // Avarice snatches a flask: a quick grab, the glass, and its cackle.
  fx.steal = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 900, 2600, 0.12, 0.15, { q: 1.5, swell: 0.6 });
    I.bell(t + 0.04, 96, 0.25, 0.14, { ratio: 3.7, index: 1, sfx: true });
    for (let k = 0; k < 3; k++) cry(t + 0.08 + k * 0.08, SINV.avarice, 0.07, 1.2, 0.08);
  };
  // Gluttony: a gulp, and a spat-out thing.
  fx.swallow = function () {
    if (!ok()) return; const t = T0();
    const a = tone(t, "sine", 240, 80, 0.3, 0.4), lfo = osc("sine", 14, t), lg = gainAt(t, 25);
    lfo.connect(lg); lg.connect(a.frequency); lfo.start(t); lfo.stop(t + 0.4);
    hiss(t, "lowpass", 500, 250, 0.25, 0.2, { q: 2 });
  };
  fx.spit = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "bandpass", 900, 2600, 0.08, 0.3, { q: 1.5 });
    tone(t, "sine", 300, 520, 0.06, 0.2);
  };
  // Wrath: the charge (a growl rising, hooves, a roar), and the slam into the rock.
  fx.charge = function () {
    if (!ok()) return; const t = T0();
    const a = osc("sawtooth", 55, t), lp = filt("lowpass", 600, 3, t), g = gainAt(t);
    a.frequency.exponentialRampToValueAtTime(88, t + 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    a.connect(lp); lp.connect(g); route(g, t, { sfx: true, rev: 0.2 }); a.start(t); a.stop(t + 0.8);
    for (const k of [0, 0.18, 0.36]) tone(t + k, "sine", 120, 50, 0.1, 0.25);
    hiss(t, "bandpass", 400, 900, 0.7, 0.15, { q: 1, swell: 0.5 });
  };
  fx.wallSlam = function (pan) {
    if (!ok()) return; const t = T0();
    tone(t, "sine", 100, 34, 0.6, 0.55, { pan });
    hiss(t, "lowpass", 2600, 150, 0.7, 0.36, { q: 0.8, pan, rev: 0.4 });
    hiss(t, "highpass", 3000, 2500, 0.06, 0.24, { pan });
    pebbles(t + 0.08, 6, 0.06, pan);
  };
  // Sloth's touch: a sinking, draining tone, a slack sigh, and the oil gurgling away.
  fx.drain = function () {
    if (!ok()) return; const t = T0();
    for (const d of [0, 7]) { const a = osc("triangle", 660, t), g = gainAt(t); a.detune.value = d; a.frequency.exponentialRampToValueAtTime(150, t + 1.3); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); a.connect(g); route(g, t, { sfx: true, rev: 0.5 }); a.start(t); a.stop(t + 1.5); }
    hiss(t, "lowpass", 2000, 200, 1.2, 0.14, { q: 1, swell: 0.2 });
    for (let k = 0; k < 6; k++) { const s = t + 0.15 + k * 0.14; tone(s, "sine", 900 - k * 110, 1300 - k * 150, 0.05, 0.06); }
  };
  // Envy's mirror: two bells a half step apart, sour and glassy, and a breath drawn in.
  fx.mirror = function () {
    if (!ok()) return; const t = T0();
    I.bell(t, 81, 0.8, 0.22, { ratio: 1.414, index: 3, sfx: true, rev: 0.4 });
    I.bell(t, 82, 0.8, 0.18, { ratio: 1.414, index: 3, sfx: true, rev: 0.4 });
    hiss(t, "highpass", 3000, 6000, 0.25, 0.08, { swell: 0.9 });
  };
  // Pride swooping down: a wing's whump and the air tearing.
  fx.swoop = function () {
    if (!ok()) return; const t = T0();
    hiss(t, "lowpass", 260, 900, 0.32, 0.4, { q: 1.5, swell: 0.2 });
    hiss(t, "bandpass", 3200, 500, 0.45, 0.17, { q: 1.4, swell: 0.3 });
  };
  // A demon rising from a crack in the rock: stone grinding, grit, and a growl coming up.
  fx.spawn = function (pan) {
    if (!ok()) return; const t = T0();
    hiss(t, "lowpass", 300, 500, 0.8, 0.3, { q: 2, swell: 0.5, pan });
    pebbles(t, 5, 0.05, pan);
    const a = osc("sawtooth", 48, t), lp = filt("lowpass", 320, 3, t), g = gainAt(t);
    a.frequency.linearRampToValueAtTime(70, t + 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    a.connect(lp); lp.connect(g); route(g, t, { sfx: true, pan, rev: 0.3 }); a.start(t); a.stop(t + 0.95);
  };
  // How loud each effect sits against the music: the blows must cut through a fight at its
  // height, the small sounds of the body stay small, and the great moments are big without
  // swamping everything. Each effect's voices pass through this gain, reverb and all.
  const LOUD = {
    step: 3, land: 2.2, grab: 4, climb: 2.5, whoosh: 2.6, zip: 2.6, punch: 3.4, kick: 3.2, torch: 2.8, hit: 3, heavy: 1.5, block: 4.5, parry: 1.8, hurt: 2.6, gutter: 2.5,
    demonHurt: 3.5, demonBroken: 1.8, castOut: 1.1, finisher: 1.05, pickup: 3, throw: 3, catchIt: 3.5, flick: 3.2, objHit: 2.6, shatter: 2.4, flaskThrow: 3, splash: 1.9, flaskGet: 1.8,
    empty: 3, flareOn: 1.5, flareOff: 2, oilReady: 2, mark: 4, chain: 4, waveStart: 1.3, waveClear: 1, unlock: 1.8, death: 1.6, tether: 2.5, tetherBreak: 3, steal: 2.5,
    swallow: 2.5, spit: 3.5, charge: 1.1, wallSlam: 1.6, drain: 2, mirror: 2.4, swoop: 2.5, spawn: 1.5, tick: 2.5,
  };
  for (const [name, k] of Object.entries(LOUD)) {
    const f = fx[name];
    fx[name] = function () { const was = fxLoud; fxLoud = k; try { return f.apply(this, arguments); } finally { fxLoud = was; } };
  }
  A.fx = fx;
  return A;
})();
