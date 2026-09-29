// Music and sound, made in the browser with Web Audio, on the sound of the
// 8-bit home computers and consoles: pulse waves whose width sweeps, a
// resonant filter on a sawtooth (the Commodore 64's voice), a stepped
// triangle bass, and drums made of noise. The techniques are Tim Follin's:
// chords played as one voice switching notes fifty times a second, so the ear
// hears the whole chord shimmer; the pulse width changed note by note;
// trills, bends and delayed vibrato on the lead; echo made by the music
// repeating itself a little later; and a lift into a new key.
//
// Chosen with the music button:
//   "chant"        the chant alone, on its own terms: one legato voice, with
//                  organum below it, a drone on the final, and a shimmer of
//                  open fifths at each breath. Free rhythm, at a schola's pace.
//   "illuminated"  bright and driving: a syncopated filter bass, shimmering
//                  chords, the screen's chant turned into a riff, chip drums,
//                  and a lift up a tone every fourth section.
//   "vigil"        dark and slow: a rolling triangle bass, long shimmering
//                  chords, a lead with deep vibrato and heavy echo, half-time
//                  drums, and a modal shift over the same final.
//   "off"          silence.
// Both beats take their chords from the mode of the screen's chant, so the
// map (Mode 1), a debate (Mode 3) and a boss (Mode 8) each sound in their own
// mode. The map has no drums; a debate brings them in; a boss adds more. Every
// button and every move moves the harmony on.

const Sound = (() => {
  const MODES = ["illuminated", "vigil", "chant", "off"];
  const STYLES = { illuminated: { bpm: 138 }, vigil: { bpm: 92 } };
  const PULSE = 0.42;                              // one chant note, sung freely
  const BAR_REST = [0, 0.5, 0.75, 1.5, 2.5];       // pauses at each kind of bar, in pulses

  let ac = null;
  let master, musicGain, musicFilter, sfxGain, reverbSend, echoIn, echoDelay;
  let mode = "illuminated";
  let noise = null, metal = null;
  const waves = {};

  let playing = false;
  let timer = null;
  let SIXTEENTH = 60 / STYLES.illuminated.bpm / 4;
  let gridTime = 0;               // time of the next sixteenth
  let step = 0;                   // sixteenths since the music began
  let chant = null;
  let chantKey = null;
  let pendingKey = null;
  let noteIndex = 0;
  let chantTime = 0;
  let intensity = 0;              // 0 the map and menus, 1 a debate, 2 a boss
  let drone = null;
  let finalPitch = 62;
  let modeNumber = 1;
  let arpNotes = [62, 64, 65, 67, 69];
  let leadIndex = 0;              // where the lead has got to in the chant
  let chantPitches = [];          // the chant's notes, without its rests
  let lastLead = null;

  // How the moves and buttons have stirred the music: which chord of the
  // progression sounds now, which bass figure, how busy the hats, which
  // arpeggio pattern, and when the next drum fill falls.
  const mix = { root: 0, bass: 0, hats: 0, arp: 0, fill: -99, turns: 0 };
  // In the chant, the drone wanders through the chant's own notes and keeps
  // coming home to its final.
  const ROOT_PATH = [0, 1, 0, 2, 0, 3, 1, 2];

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---- The mode ---------------------------------------------------------------
  // The eight church modes, as scales above their final. Modes 5 and 6 are
  // sung with B flat in practice, so they sound as the major scale on F.
  const TEMPLATES = {
    1: [0, 2, 3, 5, 7, 9, 10], 2: [0, 2, 3, 5, 7, 9, 10],
    3: [0, 1, 3, 5, 7, 8, 10], 4: [0, 1, 3, 5, 7, 8, 10],
    5: [0, 2, 4, 5, 7, 9, 11], 6: [0, 2, 4, 5, 7, 9, 11],
    7: [0, 2, 4, 5, 7, 9, 10], 8: [0, 2, 4, 5, 7, 9, 10],
  };
  // The modal shift: the sixth degree turned the other way (Dorian to
  // Aeolian, Mixolydian to its minor sixth), over the same final.
  let sung = null;   // the mode's scale as this chant actually sings it
  function template(shifted) {
    const t = sung || TEMPLATES[modeNumber] || TEMPLATES[1];
    if (!shifted) return t;
    const s = t.slice();
    s[5] += s[5] === 9 ? -1 : 1;
    return s;
  }
  // A degree of the mode (0 the final), as a MIDI note, in any octave.
  function degree(d, shifted, lift) {
    const t = template(shifted);
    const o = Math.floor(d / 7);
    return finalPitch + 12 * o + t[((d % 7) + 7) % 7] + (lift || 0);
  }
  // A chord on a degree: a triad of the mode, or root, third and octave where
  // the fifth would be diminished.
  function chord(root, shifted, lift) {
    const r = degree(root, shifted, lift), third = degree(root + 2, shifted, lift), fifth = degree(root + 4, shifted, lift);
    return fifth - r === 7 ? [r, third, fifth] : [r, third, r + 12];
  }

  // ---- The sound chip ------------------------------------------------------------

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = mode === "off" ? 0 : 0.8;
    // A limiter at the very end: it only catches the rare peak when a loud
    // effect lands on a loud bar, so nothing clips.
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.002; limiter.release.value = 0.1;
    master.connect(limiter).connect(ac.destination);
    // The music passes through a filter that a boss's wind-up closes.
    musicFilter = ac.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 18000;
    const squeeze = ac.createDynamicsCompressor();
    squeeze.threshold.value = -14; squeeze.knee.value = 10; squeeze.ratio.value = 3;
    squeeze.attack.value = 0.005; squeeze.release.value = 0.2;
    musicFilter.connect(squeeze).connect(master);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(musicFilter);
    // The effects: loud enough to be heard over the compressed music.
    sfxGain = ac.createGain();
    sfxGain.gain.value = mode === "chant" ? 1.6 : 3;
    sfxGain.connect(master);

    // A stone church: a long, soft reverb made from decaying noise.
    const reverb = ac.createConvolver();
    const len = ac.sampleRate * 3.2;
    const impulse = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
    }
    reverb.buffer = impulse;
    reverbSend = ac.createGain();
    reverbSend.gain.value = 0.5;
    reverbSend.connect(reverb);
    reverb.connect(master);
    // A little of every effect goes into the same room as the music, so it
    // sounds played in the same place rather than pasted on top.
    const room = ac.createGain();
    room.gain.value = 0.22;
    sfxGain.connect(room).connect(reverbSend);

    // Echo: the music repeating itself a dotted eighth later, a little darker
    // each time, as Follin did by giving the echo a channel of its own.
    echoIn = ac.createGain();
    echoDelay = ac.createDelay(2);
    const fb = ac.createGain();
    fb.gain.value = 0.38;
    const dark = ac.createBiquadFilter();
    dark.type = "lowpass";
    dark.frequency.value = 2600;
    const wet = ac.createGain();
    wet.gain.value = 0.45;
    echoIn.connect(echoDelay);
    echoDelay.connect(dark).connect(fb).connect(echoDelay);
    echoDelay.connect(wet).connect(musicGain);
    setEcho();

    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // The metallic noise of the consoles' short noise mode: a 93-step pattern
    // from a shift register, repeating, for the hi-hats.
    metal = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const md = metal.getChannelData(0);
    let reg = 1;
    for (let i = 0; i < md.length; i++) {
      if (i % 3 === 0) { const bit = (reg ^ (reg >> 6)) & 1; reg = (reg >> 1) | (bit << 14); }
      md[i] = reg & 1 ? 0.8 : -0.8;
    }
  }

  function setEcho() {
    if (!echoDelay) return;
    const beat = mode === "chant" ? 0.42 : 60 / (STYLES[mode] || STYLES.illuminated).bpm;
    echoDelay.delayTime.setValueAtTime(beat * 0.75, ac.currentTime);
  }

  // Call from a tap or click: browsers only allow sound after one.
  function unlock() {
    init();
    if (ac && ac.state === "suspended") ac.resume();
  }

  function setMode(m) {
    mode = MODES.includes(m) ? m : "illuminated";
    if (STYLES[mode]) SIXTEENTH = 60 / STYLES[mode].bpm / 4;
    if (master) { master.gain.setTargetAtTime(mode === "off" ? 0 : 0.8, ac.currentTime, 0.05); setEcho(); }
    // The chant is quiet and bare: the effects come down to meet it.
    if (sfxGain) sfxGain.gain.setTargetAtTime(mode === "chant" ? 1.6 : 3, ac.currentTime, 0.05);
    if (playing) {
      const key = chantKey;
      stopMusic();
      startMusic(key);
    }
  }

  // A pulse wave of a given width (0.5 is a square), as the chips made them.
  function pulseWave(duty) {
    const k = "p" + duty;
    if (waves[k]) return waves[k];
    const n = 48, real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
    for (let h = 1; h <= n; h++) real[h] = (2 * Math.sin(Math.PI * h * duty)) / (Math.PI * h);
    waves[k] = ac.createPeriodicWave(real, imag);
    return waves[k];
  }
  // The consoles' triangle: sixteen steps up and down, a little gritty.
  function triWave() {
    if (waves.tri) return waves.tri;
    const N = 512, n = 32, real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
    const w = [];
    for (let i = 0; i < N; i++) { const x = i / N; const tri = x < 0.5 ? 4 * x - 1 : 3 - 4 * x; w.push(Math.round(tri * 7.5 + 7.5) / 7.5 - 1); }
    for (let h = 1; h <= n; h++) {
      let a = 0, b = 0;
      for (let i = 0; i < N; i++) { a += w[i] * Math.cos((2 * Math.PI * h * i) / N); b += w[i] * Math.sin((2 * Math.PI * h * i) / N); }
      real[h] = (2 * a) / N; imag[h] = (2 * b) / N;
    }
    waves.tri = ac.createPeriodicWave(real, imag);
    return waves.tri;
  }

  // A swept pulse: a sawtooth minus itself a moment later is a pulse whose
  // width is that moment; moving it slowly makes the Commodore 64's moving,
  // chorused tone. Returns the oscillator and its output.
  function sweptPulse(t, midi, rate, out) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(mtof(midi), t);
    const period = 1 / mtof(midi);
    const d = ac.createDelay(0.05);
    d.delayTime.setValueAtTime(period * 0.5, t);
    const lfo = ac.createOscillator();
    lfo.frequency.value = rate;
    const depth = ac.createGain();
    depth.gain.value = period * 0.3;
    lfo.connect(depth).connect(d.delayTime);
    const inv = ac.createGain();
    inv.gain.value = -1;
    o.connect(out);
    o.connect(d).connect(inv).connect(out);
    lfo.start(t);
    return { o, lfo, d, period: (m) => 1 / mtof(m) };
  }

  const env = (g, t, level, attack, hold, release) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + Math.max(attack, hold));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release);
  };

  // Follin's chords: one voice switching between the notes `rate` times a
  // second, so the ear hears the whole chord shimmer.
  function arpChord(t, dur, notes, opts) {
    const o = opts || {};
    const osc = ac.createOscillator();
    osc.setPeriodicWave(pulseWave(o.duty || 0.25));
    const every = 1 / (o.rate || 50);
    let k = 0;
    for (let at = t; at < t + dur; at += every, k++) osc.frequency.setValueAtTime(mtof(notes[k % notes.length]), at);
    const g = ac.createGain();
    env(g, t, o.vol || 0.06, o.attack || 0.004, dur - (o.release || 0.03), o.release || 0.03);
    let chain = g;
    if (o.cutoff) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.cutoff; osc.connect(f).connect(g); } else osc.connect(g);
    chain.connect(o.out || musicGain);
    if (o.echo) { const e = ac.createGain(); e.gain.value = o.echo; chain.connect(e).connect(echoIn); }
    if (o.verb) { const v = ac.createGain(); v.gain.value = o.verb; chain.connect(v).connect(reverbSend); }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // The filter bass: a sawtooth through a resonant filter that snaps shut.
  function filterBass(midi, t, length, accent, from) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(mtof(from || midi), t);
    if (from) o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.05);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = accent ? 9 : 6;
    f.frequency.setValueAtTime(accent ? 1500 : 950, t);
    f.frequency.exponentialRampToValueAtTime(170, t + length);
    const g = ac.createGain();
    g.gain.setValueAtTime(accent ? 0.42 : 0.34, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length * 0.96);
    o.connect(f).connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + length + 0.02);
  }

  // The triangle bass, short and punchy, as on the consoles.
  function triBass(midi, t, length, level) {
    const o = ac.createOscillator();
    o.setPeriodicWave(triWave());
    o.frequency.setValueAtTime(mtof(midi), t);
    const g = ac.createGain();
    env(g, t, level || 0.3, 0.004, length * 0.8, length * 0.2 + 0.02);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + length + 0.05);
  }

  // A lead note on the swept pulse: bent in from below or trilled, with the
  // vibrato coming in late, and sent to the echo.
  function lead(t, dur, midi, opts) {
    const o = opts || {};
    const out = ac.createGain();
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.cutoff || 5200;
    const g = ac.createGain();
    env(g, t, o.vol || 0.1, 0.008, dur * 0.85, dur * 0.15 + (o.tail || 0.06));
    out.connect(f).connect(g).connect(musicGain);
    const e = ac.createGain();
    e.gain.value = o.echo === undefined ? 0.35 : o.echo;
    g.connect(e).connect(echoIn);
    const v = sweptPulse(t, midi, o.sweep || 3, out);
    const osc = v.o;
    if (o.glideFrom) { osc.frequency.setValueAtTime(mtof(o.glideFrom), t); osc.frequency.exponentialRampToValueAtTime(mtof(midi), t + (o.glide || 0.08)); }
    else if (o.trill) {
      const every = 0.035;
      for (let k = 0, at = t; at < t + Math.min(dur * 0.55, 0.3); at += every, k++) osc.frequency.setValueAtTime(mtof(k % 2 ? o.trill : midi), at);
      osc.frequency.setValueAtTime(mtof(midi), t + Math.min(dur * 0.55, 0.3));
    } else if (o.bend !== 0) {
      osc.frequency.setValueAtTime(mtof(midi - (o.bend || 1)), t);
      osc.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.05);
    }
    // Delayed vibrato: none at first, then a gentle wobble on a held note.
    if (dur > 0.25) {
      const vib = ac.createOscillator();
      vib.frequency.value = o.vibRate || 5.5;
      const amt = ac.createGain();
      amt.gain.setValueAtTime(0, t);
      amt.gain.setValueAtTime(0, t + Math.min(0.22, dur * 0.4));
      amt.gain.linearRampToValueAtTime(o.vibDepth || 14, t + Math.min(0.5, dur * 0.8));
      vib.connect(amt).connect(osc.detune);
      vib.start(t);
      vib.stop(t + dur + 0.3);
    }
    osc.start(t);
    osc.stop(t + dur + 0.35);
    v.lfo.stop(t + dur + 0.35);
  }

  // Drums, from the noise channel and the triangle.
  function kick(t, level) {
    const o = ac.createOscillator();
    o.setPeriodicWave(triWave());
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.07);
    const g = ac.createGain();
    g.gain.setValueAtTime(level || 0.75, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 0.22);
  }
  function noiseHit(t, type, freq, level, length, out, buf) {
    const src = ac.createBufferSource();
    src.buffer = buf || noise;
    const filt = ac.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(level * (out === sfxGain ? fxLevel : 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    src.connect(filt).connect(g).connect(out || musicGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + length + 0.02);
  }
  function snare(t, level) {
    noiseHit(t, "bandpass", 1900, (level || 1) * 0.32, 0.17);
    const o = ac.createOscillator();
    o.setPeriodicWave(triWave());
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const g = ac.createGain();
    g.gain.setValueAtTime((level || 1) * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 0.1);
  }
  const hat = (t, open, level) => noiseHit(t, "highpass", 7000, level || (open ? 0.07 : 0.05), open ? 0.14 : 0.035, musicGain, metal);
  const crash = (t) => { noiseHit(t, "highpass", 4000, 0.12, 0.9); noiseHit(t, "highpass", 4000, 0.05, 1.2, reverbSend); };
  function tom(t, freq) {
    const o = ac.createOscillator();
    o.setPeriodicWave(triWave());
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 0.18);
  }

  // Sound effects' own instruments.
  // How loud the battle effect now playing is, beside the rest (see fx).
  let fxLevel = 1;
  function stab(midi, t, length, level) {
    const g = ac.createGain();
    g.gain.setValueAtTime(level * fxLevel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    const filt = ac.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = mtof(midi) * 3;
    filt.Q.value = 1.5;
    for (const detune of [-12, 12]) {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = mtof(midi);
      o.detune.value = detune;
      o.connect(filt);
      o.start(t);
      o.stop(t + length + 0.02);
    }
    filt.connect(g).connect(sfxGain);
    g.connect(reverbSend);
  }
  // A church bell: partials in the proportions of a real bell's hum, prime,
  // tierce, quint and nominal.
  function bell(t, base, level, out) {
    for (const [ratio, amp, decay] of [[0.5, 0.6, 3], [1, 1, 2.2], [1.2, 0.5, 1.6], [1.5, 0.4, 1.4], [2, 0.5, 1.2], [2.5, 0.25, 0.9], [3, 0.2, 0.7]]) {
      const o = ac.createOscillator();
      o.frequency.value = base * ratio;
      const g = ac.createGain();
      g.gain.setValueAtTime(level * amp * fxLevel, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      o.connect(g);
      g.connect(out || sfxGain);
      g.connect(reverbSend);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }
  function tone(t, freq, type, level, length, endFreq) {
    const o = ac.createOscillator();
    if (type === "square") o.setPeriodicWave(pulseWave(0.5)); else o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + length);
    const g = ac.createGain();
    g.gain.setValueAtTime(level * fxLevel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g).connect(sfxGain);
    o.start(t);
    o.stop(t + length + 0.02);
  }

  // ---- The chant ---------------------------------------------------------------
  // One voice sings a whole phrase without stopping: the filter sawtooth, warm
  // and round, gliding from note to note within a syllable and taking a soft
  // new breath of tone at each syllable. Below it a second voice sings organum
  // as the ninth century taught it: a fourth below the chant, holding its
  // ground rather than sinking under the final's lower tone, and coming to
  // the chant's own note at the end of the phrase.
  function phraseVoice(t, out, level) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.08);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 3.5;
    f.frequency.value = 1200;
    f.connect(g).connect(out);
    const r = ac.createGain(); r.gain.value = 0.4; g.connect(r).connect(reverbSend);
    const e = ac.createGain(); e.gain.value = 0.18; g.connect(e).connect(echoIn);
    const saw = ac.createOscillator();
    saw.type = "sawtooth";
    const body = ac.createOscillator();
    body.setPeriodicWave(pulseWave(0.25));
    body.detune.value = 6;
    const bg = ac.createGain(); bg.gain.value = 0.35;
    saw.connect(f); body.connect(bg).connect(f);
    const vib = ac.createOscillator();
    vib.frequency.value = 5.1;
    const vibAmt = ac.createGain();
    vibAmt.gain.value = 0;
    vib.connect(vibAmt);
    vibAmt.connect(saw.detune); vibAmt.connect(body.detune);
    // The organum voice: a thin pulse, quieter, darker.
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(level * 0.42, t + 0.12);
    const of = ac.createBiquadFilter();
    of.type = "lowpass"; of.frequency.value = 1400;
    const org = ac.createOscillator();
    org.setPeriodicWave(pulseWave(0.125));
    org.connect(of).connect(og).connect(out);
    const og2 = ac.createGain(); og2.gain.value = 0.35; og.connect(og2).connect(reverbSend);
    for (const o of [saw, body, vib, org]) o.start(t);
    let first = true;
    return {
      note(at, midi, len, newSyllable, organal) {
        const fr = mtof(midi);
        for (const o of [saw, body]) { if (first) o.frequency.setValueAtTime(fr, at); else o.frequency.setTargetAtTime(fr, at, 0.014); }
        if (first) org.frequency.setValueAtTime(mtof(organal), at); else org.frequency.setTargetAtTime(mtof(organal), at, 0.02);
        const open = Math.min(fr * 5, 3800);
        if (newSyllable || first) {
          // A new syllable: the tone opens from a darker start, and dips a
          // little in level, as a new consonant would.
          f.frequency.setValueAtTime(fr * 1.8, at);
          f.frequency.setTargetAtTime(open, at, 0.05);
          if (!first) { g.gain.setTargetAtTime(level * 0.7, at, 0.01); g.gain.setTargetAtTime(level, at + 0.035, 0.03); }
        } else f.frequency.setTargetAtTime(open, at, 0.03);
        // Vibrato only on a held note, coming in late.
        vibAmt.gain.setValueAtTime(0, at);
        if (len > 0.6) { vibAmt.gain.setValueAtTime(0, at + 0.3); vibAmt.gain.linearRampToValueAtTime(9, at + Math.min(len, 0.8)); }
        first = false;
      },
      end(at) {
        g.gain.setTargetAtTime(0.0001, at, 0.07);
        og.gain.setTargetAtTime(0.0001, at, 0.09);
        for (const o of [saw, body, vib, org]) o.stop(at + 0.8);
      },
    };
  }
  let phrase = null;
  let lastEnds = 1;

  // Oblique organum: a fourth below, but never below the tone beneath the
  // final; at the end of a phrase the two voices meet on one note.
  const inMode = (m) => template(false).includes((((m - finalPitch) % 12) + 12) % 12);
  let lastOrganal = null;
  function organal(p, cadence) {
    if (cadence) return (lastOrganal = p);
    // The floor: the step of the mode below the final.
    const floor = degree(-1);
    let o = p - 5;                               // a fourth below
    if (!inMode(o)) o = p - 7;                   // or a fifth, where the fourth is not in the mode
    if (!inMode(o) || o < floor) o = lastOrganal !== null && lastOrganal <= p ? lastOrganal : Math.max(floor, p - 7);
    return (lastOrganal = Math.max(o, floor));
  }

  // A shimmer of open fifths on the final, while the singers breathe.
  function breath(t, len) {
    if (len < PULSE) return;
    arpChord(t, len + 0.5, [finalPitch - 12, finalPitch - 5, finalPitch, finalPitch + 7], { rate: 30, duty: 0.125, vol: 0.022, cutoff: 2600, attack: 0.2, release: 0.5, echo: 0.4, verb: 0.5 });
  }

  function scheduleChant(horizon) {
    while (chantTime < horizon) {
      if (noteIndex >= chant.notes.length) {
        if (phrase) { phrase.end(chantTime); phrase = null; }
        if (pendingKey) { loadChant(pendingKey); pendingKey = null; }
        noteIndex = 0;
        breath(chantTime, PULSE * 4);
        chantTime += PULSE * 4;
        lastEnds = 1;
        continue;
      }
      const [pitch, dur, endsSyllable] = chant.notes[noteIndex];
      if (!pitch) {
        const rest = BAR_REST[dur] * PULSE;
        if (phrase) { phrase.end(chantTime); phrase = null; }
        if (dur >= 2) breath(chantTime, rest);
        chantTime += rest;
        noteIndex++;
        lastEnds = 1;
        continue;
      }
      const next = chant.notes[noteIndex + 1];
      const cadence = !next || !next[0];
      if (!phrase) { phrase = phraseVoice(chantTime, musicGain, 0.15); lastOrganal = null; }
      const len = dur * PULSE;
      phrase.note(chantTime, pitch, len, !!lastEnds, organal(pitch, cadence));
      lastEnds = endsSyllable;
      chantTime += len;
      noteIndex++;
    }
  }

  // The drone on the final, on the swept pulse: a slow, chorused hum.
  function startDrone() {
    stopDrone();
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, ac.currentTime);
    out.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 2);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 700;
    filt.connect(out);
    out.connect(musicGain);
    const r = ac.createGain(); r.gain.value = 0.3; out.connect(r).connect(reverbSend);
    const voices = [0, 7].map((interval, i) => {
      const v = sweptPulse(ac.currentTime, finalPitch - 12 + interval, 0.13 + i * 0.07, filt);
      v.o.start();
      return { v, interval };
    });
    drone = { out, voices };
    retuneDrone(true);
  }
  // The note the drone sits on now, on its path through the chant's notes.
  const droneRoot = () => arpNotes[ROOT_PATH[mix.root % ROOT_PATH.length] % arpNotes.length];
  function retuneDrone(slow) {
    if (!drone) return;
    const root = droneRoot();
    const home = root === finalPitch;
    const base = root - 12 - (root - finalPitch > 5 ? 12 : 0);
    const now = ac.currentTime;
    for (const { v, interval } of drone.voices) {
      const m = base + (home || interval !== 7 ? interval : 12);
      v.o.frequency.setTargetAtTime(mtof(m), now, slow ? 0.8 : 0.15);
      v.d.delayTime.setTargetAtTime(0.5 / mtof(m), now, slow ? 0.8 : 0.15);
    }
  }
  function stopDrone() {
    if (!drone) return;
    const d = drone;
    d.out.gain.setTargetAtTime(0.0001, ac.currentTime, 0.3);
    setTimeout(() => d.voices.forEach(({ v }) => { try { v.o.stop(); v.lfo.stop(); } catch (e) { /* stopped */ } }), 1500);
    drone = null;
  }

  function loadChant(key) {
    chantKey = key;
    chant = CHANTS[key];
    noteIndex = 0;
    const pitched = chant.notes.filter(([p]) => p);
    modeNumber = parseInt(chant.mode, 10) || 1;
    // The final comes from the mode (D, E, F or G), not from wherever an
    // excerpt happens to stop: the nearest such note to the chant's last.
    const last = pitched[pitched.length - 1][0];
    const pc = [0, 2, 2, 4, 4, 5, 5, 7, 7][modeNumber] || 2;
    const below = last - ((((last - pc) % 12) + 12) % 12);
    finalPitch = last - below <= below + 12 - last ? below : below + 12;
    // Effects and the drone use the chant's own notes: its final and above.
    const set = [...new Set(pitched.map(([p]) => p))].sort((a, b) => a - b);
    arpNotes = [finalPitch, ...set.filter((p) => p > finalPitch).slice(0, 4)];
    leadIndex = 0;
    chantPitches = pitched.map(([p]) => p);
    // The scale as sung: where the chant uses a flat (B flat in Ave maris
    // stella) instead of the book's degree, the chords use it too.
    const used = new Set(chantPitches.map((p) => (((p - finalPitch) % 12) + 12) % 12));
    const book = TEMPLATES[modeNumber] || TEMPLATES[1];
    sung = book.map((pc) => {
      if (used.has(pc)) return pc;
      if (used.has(pc - 1) && !book.includes(pc - 1)) return pc - 1;
      if (used.has(pc + 1) && !book.includes(pc + 1) && pc + 1 < 12) return pc + 1;
      return pc;
    });
    retuneDrone(true);
  }

  // ---- Illuminated and Vigil -----------------------------------------------------
  // Eight bars to a section, four sections to a round: A the groove, B the
  // chant comes in as a lead, C a breakdown, D everything, lifted (Illuminated)
  // or modally shifted (Vigil). One chord to a bar, from the mode.
  const PROG = {
    illuminated: [[0, 6, 5, 6], [0, 3, 4, 0], [5, 3, 0, 4], [0, 6, 3, 4]],
    vigil: [[0, 5, 3, 4], [0, 5, 6, 4], [3, 0, 5, 4], [0, 1, 0, 6]],
  };
  // Bass figures, sixteenth by sixteenth: [interval above the chord's root, length].
  const IL_BASS = [
    { 0: [0, 1], 2: [12, 1], 3: [0, 1], 6: [0, 1], 7: [12, 1], 10: [0, 2], 12: [7, 1], 14: [12, 1], 15: [10, 1] },
    { 0: [0, 1], 2: [12, 1], 4: [0, 1], 6: [12, 1], 8: [0, 1], 10: [12, 1], 11: [0, 1], 12: [7, 1], 14: [12, 1] },
    { 0: [0, 2], 3: [0, 1], 5: [12, 1], 6: [0, 2], 9: [7, 1], 10: [12, 2], 13: [0, 1], 14: [10, 2] },
  ];
  const VG_BASS = [
    { 0: [0, 2], 2: [0, 2], 4: [12, 2], 6: [0, 2], 8: [7, 2], 10: [0, 2], 12: [12, 2], 14: [0, 2] },
    { 0: [0, 3], 3: [0, 1], 4: [12, 2], 6: [7, 2], 8: [0, 3], 11: [0, 1], 12: [10, 2], 14: [12, 2] },
  ];
  // When the shimmering chords sound, sixteenth by sixteenth.
  const GATES = [
    [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1],
  ];
  // The lead's rhythm over two bars: [start, length] in sixteenths.
  const IL_LEAD = [
    [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2], [16, 3], [19, 3], [22, 2], [24, 6], [30, 2]],
    [[0, 2], [2, 2], [4, 4], [8, 2], [10, 1], [11, 1], [12, 4], [16, 6], [22, 2], [24, 4], [28, 4]],
  ];
  const VG_LEAD = [
    [[0, 8], [8, 4], [12, 4], [16, 12], [28, 4]],
    [[0, 6], [6, 2], [8, 8], [16, 8], [24, 8]],
  ];

  // Where the music is at a given sixteenth.
  function place(n) {
    const bar = Math.floor(n / 16), section = Math.floor(bar / 8) % 4;
    const prog = PROG[mode] || PROG.illuminated;
    const roots = prog[(Math.floor(bar / 32) + section) % prog.length];
    const root = roots[(bar + mix.root) % 4];
    const lift = mode === "illuminated" && section === 3 ? 2 : 0;
    const shifted = mode === "vigil" && section === 3;
    return { bar, section, s: n % 16, root, lift, shifted, notes: chord(root, shifted, lift) };
  }

  // The next note of the chant for the lead; under the modal shift, its
  // sixth degree turns with the chords.
  function nextLeadPitch(shifted) {
    const p = chantPitches[leadIndex % chantPitches.length];
    leadIndex++;
    if (!shifted) return p;
    const t = template(false), pc = (((p - finalPitch) % 12) + 12) % 12;
    return pc === t[5] ? p + (t[5] === 9 ? -1 : 1) : p;
  }

  function illuminatedStep(t, n) {
    const P = place(n), s = P.s, level = intensity;
    const bass = P.notes[0] - 24;
    // Drums, in a debate and against a boss.
    if (level >= 1) {
      if (P.bar % 8 === 0 && s === 0) crash(t);
      const fillBar = P.bar % 8 === 7 && s >= 8;
      if (P.section === 2) { if (s === 0) kick(t, 0.6); if (s % 4 === 2) hat(t, false, 0.035); }
      else if (fillBar) { if (s % 2 === 0) tom(t, [220, 180, 150, 120][(s - 8) / 2]); if (s >= 12) snare(t, 0.6 + (s - 12) * 0.12); }
      else {
        if (s === 0 || s === 6 || s === 10 || (level >= 2 && s === 3)) kick(t);
        if (s === 4 || s === 12) snare(t);
        if (s === 14) hat(t, true);
        else if (mix.hats > 0 || level >= 2 || s % 2 === 0) hat(t, false, s % 4 === 2 ? 0.07 : 0.035);
      }
      if (n >= mix.fill && n < mix.fill + 4) snare(t, 0.5 + (n - mix.fill) * 0.15);
    }
    // The filter bass: every figure on the map is softer and sparser.
    const fig = IL_BASS[mix.bass % IL_BASS.length];
    if (fig[s] && (level >= 1 || s % 2 === 0) && P.section !== 2) filterBass(bass + fig[s][0], t, SIXTEENTH * fig[s][1] * 1.6, s === 0 || s === 10);
    if (P.section === 2 && s === 0) filterBass(bass, t, SIXTEENTH * 14, false);
    // The shimmering chords: gated sixteenths, the pulse width changing note by note.
    const chordUp = [P.notes[0] + 12, P.notes[1] + 12, P.notes[2] + 12, P.notes[0] + 24];
    if (P.section === 2) { if (s === 0) arpChord(t, SIXTEENTH * 16, chordUp, { rate: 25, duty: 0.5, vol: 0.07, cutoff: 3000, echo: 0.3, attack: 0.1, release: 0.3 }); }
    else if (GATES[mix.arp % GATES.length][s]) arpChord(t, SIXTEENTH * 0.9, chordUp, { rate: 50, duty: [0.125, 0.25, 0.5][s % 3], vol: level >= 1 ? 0.07 : 0.06, echo: 0.2 });
    // The lead: the chant as a riff, in B and D (and slowly in C).
    const inPhrase = n % 32;
    if (P.section === 1 || P.section === 3) {
      const shape = IL_LEAD[Math.floor(n / 32) % IL_LEAD.length];
      const hit = shape.find(([at]) => at === inPhrase);
      if (hit) {
        const p = nextLeadPitch() + 12 + P.lift;
        const dur = hit[1] * SIXTEENTH;
        const upper = degree(Math.round((p - finalPitch) / 1.75) + 1) + 12;
        lead(t, dur, p, { vol: level >= 1 ? 0.13 : 0.11, trill: hit[1] >= 4 && (n >> 5) % 2 ? Math.max(upper, p + 1) : 0, bend: hit[1] >= 4 ? 2 : 1 });
        // D: the lead doubled an octave up on the thinnest pulse, an echo of itself.
        if (P.section === 3 && level >= 1) lead(t + SIXTEENTH, dur, p + 12, { vol: 0.035, echo: 0.2, bend: 0, cutoff: 7000 });
        lastLead = p;
      }
    } else if (P.section === 2 && level >= 1 && inPhrase % 8 === 0) {
      const p = nextLeadPitch() + 12;
      lead(t, SIXTEENTH * 8, p, { vol: 0.06, glideFrom: lastLead, glide: 0.12, echo: 0.5, vibDepth: 18 });
      lastLead = p;
    }
  }

  function vigilStep(t, n) {
    const P = place(n), s = P.s, level = intensity;
    const bass = P.notes[0] - 24;
    if (level >= 1) {
      if (P.bar % 8 === 0 && s === 0) crash(t);
      if (s === 0 || s === 10 || (level >= 2 && s === 14)) kick(t, 0.7);
      if (s === 8) { snare(t, 1.1); noiseHit(t, "bandpass", 1500, 0.08, 0.4, reverbSend); }
      if (s % 4 === 2) hat(t, false, 0.04);
      if (level >= 2 && s % 2 === 1) hat(t, false, 0.022);
      if (P.bar % 8 === 7 && s >= 12) tom(t, [200, 170, 140, 110][s - 12]);
      if (n >= mix.fill && n < mix.fill + 4) snare(t, 0.5 + (n - mix.fill) * 0.15);
    }
    // The triangle bass: rolling eighths, or sixteenths against a boss.
    if (P.section === 2) { if (s === 0) triBass(bass, t, SIXTEENTH * 15, 0.2); }
    else if (level >= 2) triBass(bass + [0, 0, 12, 0][s % 4], t, SIXTEENTH * 0.9, 0.17);
    else { const fig = VG_BASS[mix.bass % VG_BASS.length]; if (fig[s]) triBass(bass + fig[s][0], t, SIXTEENTH * fig[s][1], 0.21); }
    // Long shimmering chords, one to a bar, and rolling arpeggios over them.
    const chordUp = [P.notes[0] + 12, P.notes[1] + 12, P.notes[2] + 12];
    if (s === 0) arpChord(t, SIXTEENTH * 16, chordUp, { rate: 30, duty: 0.5, vol: 0.03, cutoff: 1800, attack: 0.15, release: 0.4, echo: 0.3, verb: 0.3 });
    if ((P.section === 1 || P.section === 3) && s % 2 === 0) {
      const run = [...chordUp, chordUp[0] + 12, chordUp[1] + 12];
      const k = (s / 2 + mix.arp) % run.length;
      arpChord(t, SIXTEENTH * 1.5, [run[k] + 12], { duty: 0.125, vol: 0.03, echo: 0.45 });
    }
    // The lead: the chant in long notes, gliding, with deep late vibrato.
    if (P.section !== 0 || level >= 2) {
      const inPhrase = n % 32;
      const shape = VG_LEAD[Math.floor(n / 32) % VG_LEAD.length];
      const hit = shape.find(([at]) => at === inPhrase);
      if (hit) {
        const p = nextLeadPitch(P.shifted);
        lead(t, hit[1] * SIXTEENTH, p, { vol: 0.085, glideFrom: lastLead, glide: 0.1, echo: 0.55, vibDepth: 22, vibRate: 4.6, sweep: 1.5, cutoff: 3200 });
        lastLead = p;
      }
    }
  }

  function schedule() {
    const horizon = ac.currentTime + 0.18;
    if (mode === "chant") { scheduleChant(horizon); return; }
    while (gridTime < horizon) {
      if (mode === "vigil") vigilStep(gridTime, step); else illuminatedStep(gridTime, step);
      gridTime += SIXTEENTH;
      step++;
      // A new chant for the screen takes over at the start of a bar.
      if (pendingKey && step % 16 === 0) { loadChant(pendingKey); pendingKey = null; }
    }
  }

  function startMusic(key) {
    if (!ac || mode === "off") return;
    if (!playing) {
      playing = true;
      loadChant(key);
      if (mode === "chant") startDrone();
      gridTime = ac.currentTime + 0.1;
      step = 0;
      chantTime = gridTime;
      lastEnds = 1;
      timer = setInterval(schedule, 25);
    } else if (key !== chantKey) {
      pendingKey = key;
    }
  }

  function stopMusic() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    if (phrase) { phrase.end(ac.currentTime); phrase = null; }
    stopDrone();
  }

  // Change to another chant: the chant finishes its own first; the beats
  // change mode at the next bar.
  function setChant(key) {
    if (!playing || key === chantKey) return;
    pendingKey = key;
  }

  function setIntensity(n) {
    intensity = n;
  }

  // Short effects start on the next sixteenth of the beat, as in Lumines.
  function onBeat() {
    const now = ac.currentTime;
    if (!playing || mode === "chant" || mode === "off") return now;
    const since = now - (gridTime - SIXTEENTH * 2);
    return now + (SIXTEENTH - (since % SIXTEENTH)) % SIXTEENTH;
  }

  // A few notes of a chant's opening, sung as a sound effect.
  function incipit(key, count, speed) {
    const notes = CHANTS[key].notes.filter(([p]) => p).slice(0, count);
    let t = ac.currentTime + 0.02;
    const v = phraseVoice(t, sfxGain, 0.2);
    notes.forEach(([p], i) => { v.note(t, p, speed, true, i === notes.length - 1 ? p : p - 5); t += speed; });
    v.end(t);
  }

  // A boss winding up: the music closes in. The blow, or its failing, opens it.
  function cue(name) {
    if (!ac || !playing) return;
    const now = ac.currentTime;
    if (name === "windup") {
      musicFilter.frequency.setTargetAtTime(650, now, 0.25);
      noiseHit(now, "bandpass", 600, 0.05, 1.6, musicGain);
    } else {
      musicFilter.frequency.setTargetAtTime(18000, now, 0.08);
      if (name === "strike" && mode !== "chant") { crash(onBeat()); mix.fill = step + 1; }
    }
  }

  // ---- The stir -----------------------------------------------------------------
  // Every move shifts one thing, in turn, so the music never sits still: the
  // chord, the bass figure, the hats, the arpeggio pattern. A great move also
  // brings a drum fill.
  function stir(big) {
    mix.turns++;
    if (big || mix.turns % 2 === 0) shift();
    const k = mix.turns % 6;
    if (k === 1) mix.bass++;
    if (k === 3) mix.hats = (mix.hats + 1) % 3;
    if (k === 5) mix.arp++;
    if (big && playing && mode !== "chant") {
      let at = step + (16 - (step % 16)) - 4;
      if (at <= step + 2) at += 16;
      mix.fill = at;
    }
  }

  // The harmony (or, in the chant, the drone) moves to its next note.
  function shift() {
    mix.root = (mix.root + 1) % ROOT_PATH.length;
    retuneDrone();
  }
  // The note the music is centred on now: the drone's in the chant, the
  // chord's root in the beats.
  function centre() {
    if (mode === "chant") return drone ? droneRoot() : null;
    return playing ? place(step).notes[0] : null;
  }
  // Every button and every turn of a cut scene moves the music on: always to
  // a note that sounds different from the one before.
  function moveDrone() {
    const was = centre();
    for (let i = 0; i < ROOT_PATH.length * 2; i++) { shift(); if (centre() !== was) break; }
  }

  // ---- Battle sounds -----------------------------------------------------------
  // Little bleeps and boops, each on the next sixteenth and in the key of the
  // chant, so they play as part of the music rather than over it.
  const key = (i, oct) => arpNotes[((i % arpNotes.length) + arpNotes.length) % arpNotes.length] + 12 * (oct || 0) + (i >= arpNotes.length ? 12 : 0);
  const hz = (i, oct) => mtof(key(i, oct));
  function blip(t, f, type, level, len, end) { tone(t, f, type, level, len, end); }
  // The music leans back for a moment under an effect or a voice, then comes
  // straight back: the effect is heard, and the groove never stops.
  function duck(t, depth) {
    if (!musicGain) return;
    const g = musicGain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.6 * (1 - (depth || 0.3)), t, 0.015);
    g.setTargetAtTime(0.6, t + 0.12, 0.12);
  }
  function fx(name, n, delay) {
    if (!ac || mode === "off") return;
    const S = SIXTEENTH;
    const t = onBeat() + (delay || 0) * S;
    duck(t, name === "hit" || name === "crit" || name === "great" ? 0.35 : 0.2);
    // Effects built from the music's own notes and sounds hide inside it, so
    // they play louder; the bright ones (a crit's bell) stand out already.
    fxLevel = FX_LEVEL[name] || 1;
    try { fxSwitch(name, n, t, S); } finally { fxLevel = 1; }
  }
  const FX_LEVEL = { hit: 1.5, bleep: 1.9, zealDown: 2.2, zealUp: 1.5, great: 1.8, concede: 2, left: 1.9, discouraged: 1.9, encouraged: 1.6, stun: 1.5, muted: 1.9, step: 1.6, hex: 1.9, backup: 1.6, command: 1.5, rebuttal: 1.3, crit: 0.75, podiumFall: 1.7, deflect: 1.3, podium: 1.3 };
  function fxSwitch(name, n, t, S) {
    switch (name) {
      case "bleep":      // words flying: a quick run of square-wave bleeps, rising
        for (let i = 0; i < Math.min(6, n || 2); i++) blip(t + i * S, hz(i, 1), "square", 0.07, S * 0.8);
        break;
      case "hit": blip(t, hz(0, 0), "triangle", 0.22, 0.12, hz(0, -1)); noiseHit(t, "lowpass", 1200, 0.18, 0.05, sfxGain); break;
      case "crit": blip(t, hz(2, 2), "sine", 0.14, 0.3); blip(t + S, hz(0, 3), "sine", 0.12, 0.4); bell(t, hz(0, 1), 0.06); break;
      case "deflect":    // boing
        blip(t, hz(0, 1), "sine", 0.16, 0.22, hz(0, 1) * 1.8); blip(t + S, hz(0, 1) * 1.8, "sine", 0.1, 0.2, hz(0, 1)); break;
      case "podium":     // a woodblock knock
        blip(t, 900, "triangle", 0.2, 0.05, 700); noiseHit(t, "bandpass", 2600, 0.12, 0.03, sfxGain); break;
      case "podiumFall": // womp womp
        blip(t, hz(1, 0), "sawtooth", 0.1, S * 2.5, hz(0, 0)); blip(t + S * 3, hz(0, 0), "sawtooth", 0.1, S * 4, hz(0, -1)); break;
      case "zealDown":   // wah-wah
        blip(t, hz(1, 1), "square", 0.06, S * 1.8, hz(0, 1)); blip(t + S * 2, hz(0, 1), "square", 0.06, S * 3, hz(0, 1) * 0.94); break;
      case "zealUp":     // a twinkle, rising
        for (let i = 0; i < 3; i++) blip(t + i * S * 0.5, hz(i, 2), "sine", 0.09, 0.18); break;
      case "stun":       // a cuckoo clock
        for (let r = 0; r < 2; r++) { blip(t + r * S * 3, hz(2, 2), "sine", 0.1, S * 1.2); blip(t + r * S * 3 + S, hz(0, 2), "sine", 0.1, S * 1.6); }
        break;
      case "concede": {  // the sad trombone
        const f0 = hz(0, 0);
        [3, 2, 1].forEach((d, i) => blip(t + i * S * 2, f0 * Math.pow(2, d / 12), "sawtooth", 0.08, S * 1.8));
        blip(t + S * 6, f0, "sawtooth", 0.08, S * 6, f0 * 0.97);
        break;
      }
      case "left": shift(); blip(t, hz(0, 0), "triangle", 0.12, S * 2, hz(0, -1)); blip(t + S * 2, hz(0, -1), "triangle", 0.1, S * 4, hz(0, -1) * 0.5); break;
      case "shield":     // a shimmer, three notes of the chant at once
        for (let i = 0; i < 3; i++) blip(t + i * 0.02, hz(i, 2), "sine", 0.05, 0.7); break;
      case "heal":       // a harp run
        for (let i = 0; i < 6; i++) blip(t + i * S * 0.5, hz(i, 1), "triangle", 0.08, 0.35); break;
      case "backup": noiseHit(t, "bandpass", 1400, 0.2, 0.06, sfxGain); blip(t, hz(0, 1), "square", 0.07, S, hz(2, 1)); break;  // "hey!"
      case "command":    // a whistle: whee-whoo
        blip(t, hz(0, 2), "sine", 0.1, S * 1.5, hz(2, 2)); blip(t + S * 2, hz(2, 2), "sine", 0.1, S * 2, hz(0, 2)); break;
      case "muted": blip(t, hz(0, 1), "sawtooth", 0.08, 0.45, hz(0, 1) * 0.2); break;   // a tape stop
      case "undercover": // sneaking: low plucks on the off-beats
        [0, 1, 0, 2].forEach((d, i) => blip(t + i * S * 2, hz(d, -1), "triangle", 0.12, S * 0.7)); break;
      case "rebuttal":   // "Objection!": two raps of a gavel, then a stab
        blip(t, 220, "triangle", 0.25, 0.06, 160); noiseHit(t, "lowpass", 900, 0.2, 0.04, sfxGain);
        blip(t + S, 220, "triangle", 0.25, 0.06, 160); noiseHit(t + S, "lowpass", 900, 0.2, 0.04, sfxGain);
        stab(key(0, 1), t + S * 2, 0.2, 0.07);
        break;
      case "sniff": noiseHit(t, "highpass", 3200, 0.2, 0.07, sfxGain); noiseHit(t + S * 0.7, "highpass", 3600, 0.16, 0.06, sfxGain); break;
      case "step": blip(t, 1300, "triangle", 0.05, 0.03); blip(t + S * 2, 1100, "triangle", 0.05, 0.03); break;
      case "hex": blip(t, hz(2, 1), "sawtooth", 0.06, S * 3, hz(0, 0)); blip(t, hz(2, 1) * 1.01, "square", 0.04, S * 3, hz(0, 0)); break;
      case "great":      // a big stab chord, and a fill into the next bar
        for (let i = 0; i < 3; i++) stab(key(i, 1), t, 0.5, 0.08);
        stir(true);
        break;
      case "discouraged": shift(); blip(t, hz(0, -1), "triangle", 0.14, S * 5, hz(0, -1) * 0.8); break;
      case "encouraged": shift(); for (let i = 0; i < 4; i++) blip(t + i * S * 0.5, hz(i, 1), "square", 0.05, 0.12); break;
    }
  }

  // ---- Voices --------------------------------------------------------------------
  // Little shouts, made the way a speaking toy makes them: a buzzing pulse wave
  // (the chip sound of the music) shaped by three resonances, the formants,
  // that turn a buzz into a vowel. A breath of noise gives an "h", a hum an
  // "m". Everyone has a voice of their own: a pitch, a size of throat (the
  // formants sit higher in a smaller one), a buzz (the pulse width), a rasp,
  // a wobble, and a pace. No words, only the sound of a shout.

  // Vowels: the first three formants (Hz) of an adult man's voice.
  const VOWELS = {
    a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410],
    u: [300, 870, 2240], ae: [660, 1720, 2410], uh: [520, 1190, 2390], ay: [480, 2000, 2600],
  };
  // f0: pitch (Hz); fs: throat (formants x); duty: pulse width (the buzz);
  // rasp: noise in the voice; vib: wobble; pace: speed (1 = normal).
  const VOICES = {
    horn: { f0: 118, fs: 1.0, duty: 0.25, rasp: 0.05, vib: 0.01, pace: 1.15 },
    akin: { f0: 108, fs: 0.98, duty: 0.3, rasp: 0.04, vib: 0.01, pace: 0.9 },
    muse: { f0: 128, fs: 1.04, duty: 0.2, rasp: 0.03, vib: 0.015, pace: 1.1 },
    schmitz: { f0: 124, fs: 1.02, duty: 0.35, rasp: 0.03, vib: 0.02, pace: 1.2 },
    bertuzzi: { f0: 116, fs: 1.0, duty: 0.4, rasp: 0.04, vib: 0.01, pace: 1.05 },
    fradd: { f0: 132, fs: 1.03, duty: 0.18, rasp: 0.06, vib: 0.03, pace: 1.1 },
    godlogic: { f0: 98, fs: 0.95, duty: 0.45, rasp: 0.03, vib: 0.02, pace: 0.85 },
    barron: { f0: 96, fs: 0.93, duty: 0.4, rasp: 0.04, vib: 0.03, pace: 0.85 },
    hicks: { f0: 104, fs: 0.97, duty: 0.45, rasp: 0.02, vib: 0.01, pace: 0.75 },
    pine: { f0: 122, fs: 1.02, duty: 0.3, rasp: 0.03, vib: 0.01, pace: 1.1 },
    marygrace: { f0: 228, fs: 1.18, duty: 0.4, rasp: 0.02, vib: 0.03, pace: 1.05 },
    rose: { f0: 212, fs: 1.16, duty: 0.3, rasp: 0.03, vib: 0.02, pace: 1.2 },
    holdsworth: { f0: 100, fs: 0.96, duty: 0.4, rasp: 0.03, vib: 0.01, pace: 0.9 },
    jurado: { f0: 88, fs: 0.92, duty: 0.2, rasp: 0.14, vib: 0.01, pace: 0.9 },
    spitzer: { f0: 112, fs: 0.99, duty: 0.35, rasp: 0.05, vib: 0.05, pace: 0.7 },
    hahn: { f0: 142, fs: 1.02, duty: 0.25, rasp: 0.04, vib: 0.04, pace: 1.3 },
    schmid: { f0: 126, fs: 1.04, duty: 0.3, rasp: 0.03, vib: 0.02, pace: 1.15 },
    heschmeyer: { f0: 120, fs: 1.01, duty: 0.22, rasp: 0.03, vib: 0.01, pace: 1.25 },
    martins: { f0: 94, fs: 0.95, duty: 0.35, rasp: 0.06, vib: 0.02, pace: 0.9 },
    zember: { f0: 218, fs: 1.17, duty: 0.35, rasp: 0.02, vib: 0.02, pace: 1.0 },
    pitre: { f0: 114, fs: 1.0, duty: 0.3, rasp: 0.03, vib: 0.02, pace: 1.2 },
    wetta: { f0: 136, fs: 1.03, duty: 0.15, rasp: 0.04, vib: 0.03, pace: 1.3 },
    oconnor: { f0: 126, fs: 1.05, duty: 0.4, rasp: 0.02, vib: 0.01, pace: 0.95 },
    ryan: { f0: 134, fs: 1.06, duty: 0.2, rasp: 0.03, vib: 0.02, pace: 1.2 },
    hansen: { f0: 112, fs: 1.0, duty: 0.35, rasp: 0.02, vib: 0.01, pace: 0.95 },
    speaker: { f0: 110, fs: 0.98, duty: 0.25, rasp: 0.08, vib: 0.02, pace: 1.1 },
    witch: { f0: 200, fs: 1.15, duty: 0.2, rasp: 0.04, vib: 0.06, pace: 0.9 },
    destiny: { f0: 124, fs: 1.03, duty: 0.25, rasp: 0.03, vib: 0.0, pace: 1.5 },
    pastor: { f0: 116, fs: 1.0, duty: 0.4, rasp: 0.02, vib: 0.03, pace: 0.9 },
    ehrman: { f0: 110, fs: 0.99, duty: 0.35, rasp: 0.04, vib: 0.02, pace: 1.0 },
    white: { f0: 100, fs: 0.96, duty: 0.25, rasp: 0.05, vib: 0.01, pace: 1.1 },
    master: { f0: 112, fs: 1.02, duty: 0.45, rasp: 0.03, vib: 0.0, pace: 0.7 },
  };
  // Anyone else (the rank and file) gets a voice from their name: the same
  // voice every time, and no two quite alike.
  function voiceOf(id, female) {
    if (VOICES[id]) return VOICES[id];
    let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = (k) => ((h >>> k) % 1000) / 1000;
    return female
      ? { f0: 190 + r(1) * 60, fs: 1.12 + r(3) * 0.1, duty: 0.15 + r(5) * 0.3, rasp: 0.02 + r(7) * 0.05, vib: r(9) * 0.04, pace: 0.85 + r(11) * 0.4 }
      : { f0: 95 + r(1) * 50, fs: 0.94 + r(3) * 0.12, duty: 0.15 + r(5) * 0.3, rasp: 0.02 + r(7) * 0.1, vib: r(9) * 0.04, pace: 0.85 + r(11) * 0.4 };
  }
  // Each shout is a few syllables: [onset, vowel(s), length, pitch from, to].
  // Onsets: "h" a breath, "m" a hum, "w"/"y" a glide from u/i, "" none.
  const SHOUTS = {
    attack: [[["h", ["a"], 0.14, 1.1, 0.9]], [["h", ["e", "i"], 0.15, 1.15, 0.95]], [["h", ["uh"], 0.1, 1.05, 0.9]], [["y", ["a"], 0.15, 1.1, 0.95]], [["h", ["o"], 0.13, 1.1, 0.9]]],
    great: [[["h", ["a", "i"], 0.09, 1.0, 1.1], ["y", ["a"], 0.08, 1.1, 1.15], ["h", ["a"], 0.26, 1.35, 1.1]], [["h", ["e"], 0.08, 1.0, 1.05], ["y", ["a"], 0.24, 1.3, 1.2]]],
    backup: [[["h", ["ay"], 0.16, 1.2, 1.3]], [["y", ["e", "ae"], 0.2, 1.1, 1.25]]],
    hurt: [[["", ["u"], 0.14, 1.1, 0.8]], [["", ["uh"], 0.13, 1.0, 0.75]], [["h", ["uh"], 0.12, 1.05, 0.8]]],
    down: [[["", ["a", "o", "u"], 0.5, 1.05, 0.7]], [["h", ["uh", "o"], 0.45, 1.0, 0.72]]],
    cheer: [[["w", ["u"], 0.28, 1.0, 1.45]], [["y", ["e", "ae"], 0.3, 1.0, 1.35]], [["y", ["a"], 0.1, 1.1, 1.2], ["y", ["a"], 0.2, 1.3, 1.4]]],
    // The Nones shrug instead of shouting.
    meh: [[["m", ["e"], 0.22, 1.0, 0.85]], [["m", ["uh"], 0.08, 1.0, 1.0], ["h", ["uh"], 0.14, 1.05, 0.95]]],
  };
  const lastShout = {};
  function shout(id, kind, female) {
    if (!ac || mode === "off" || !SHOUTS[kind]) return;
    const now = ac.currentTime;
    if (lastShout[id] && now - lastShout[id] < 0.35) return;   // one at a time each
    lastShout[id] = now;
    const v = voiceOf(id, female);
    const pick = SHOUTS[kind][Math.floor(Math.random() * SHOUTS[kind].length)];
    const bump = kind === "great" || kind === "cheer" ? 1.08 : 1;
    let t = now + 0.01;
    const out = ac.createGain();
    out.gain.value = kind === "down" ? 0.3 : 0.38;
    out.connect(sfxGain);
    duck(t, 0.2);
    for (const [onset, vs, len0, p0, p1] of pick) {
      const len = len0 / v.pace;
      const f = v.f0 * bump;
      // The voice: a pulse wave through three formant filters in parallel.
      const src = ac.createOscillator();
      src.setPeriodicWave(pulseWave(v.duty));
      src.frequency.setValueAtTime(f * p0, t);
      src.frequency.exponentialRampToValueAtTime(f * p1, t + len);
      if (v.vib) { const lfo = ac.createOscillator(); lfo.frequency.value = 6; const d = ac.createGain(); d.gain.value = f * v.vib; lfo.connect(d).connect(src.frequency); lfo.start(t); lfo.stop(t + len + 0.05); }
      const env = ac.createGain();
      const start = onset === "h" ? t + 0.03 : t;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, start + (onset === "m" ? 0.05 : 0.012));
      env.gain.setValueAtTime(1, start + len * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, start + len);
      const glide = onset === "w" ? VOWELS.u : onset === "y" ? VOWELS.i : onset === "m" ? [250, 1200, 2300] : null;
      [[1, 0.9], [2, 0.55], [3, 0.3]].forEach(([n, amp]) => {
        const bp = ac.createBiquadFilter();
        bp.type = "bandpass";
        const at = (vw) => vw[n - 1] * v.fs;
        bp.frequency.setValueAtTime(at(glide || VOWELS[vs[0]]), t);
        if (glide) bp.frequency.setTargetAtTime(at(VOWELS[vs[0]]), start, 0.03);
        vs.forEach((vw, k) => { if (k) bp.frequency.setTargetAtTime(at(VOWELS[vw]), start + (len * k) / vs.length, len / vs.length / 3); });
        bp.Q.value = at(VOWELS[vs[0]]) / (60 + 40 * n);
        const g = ac.createGain(); g.gain.value = amp * 1.6;
        env.connect(bp).connect(g).connect(out);
      });
      src.connect(env);
      src.start(t); src.stop(start + len + 0.03);
      // Breath: an "h" before the voice, and a little rasp through it.
      const breath = (from, until, level) => {
        const n = ac.createBufferSource(); n.buffer = noise;
        const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = VOWELS[vs[0]][1] * v.fs; bp.Q.value = 1.2;
        const g = ac.createGain(); g.gain.setValueAtTime(level, from); g.gain.exponentialRampToValueAtTime(0.0001, until);
        n.connect(bp).connect(g).connect(out); n.start(from, Math.random() * 0.5); n.stop(until + 0.02);
      };
      if (onset === "h") breath(t, start + 0.02, 0.35);
      if (v.rasp) breath(start, start + len, v.rasp * 3);
      t = start + len + 0.02;
    }
  }

  // ---- Effects ------------------------------------------------------------------

  function play(name, size) {
    if (!ac || mode === "off") return;
    const now = ac.currentTime;
    switch (name) {
      case "rotate": tone(onBeat(), 1400, "sine", 0.08, 0.05); break;
      case "land": {
        const t = onBeat();
        tone(t, 140 / (size || 1), "triangle", 0.45, 0.16, 55);
        noiseHit(t, "lowpass", 700, 0.25, 0.08, sfxGain);
        break;
      }
      case "drop": noiseHit(now, "bandpass", 1800, 0.12, 0.15, sfxGain); break;
      case "mortar": tone(onBeat(), 260, "square", 0.12, 0.08); bell(now + 0.02, 880, 0.08); break;
      case "zap":
        tone(now, 1100, "square", 0.18, 0.3, 90);
        noiseHit(now, "highpass", 3000, 0.3, 0.25, sfxGain);
        break;
      case "curse":
        tone(now, 220, "sawtooth", 0.12, 0.5, 180);
        tone(now, 311, "sawtooth", 0.12, 0.5, 250);
        break;
      case "repel":
        [1318, 1568, 1760, 2093, 2637].forEach((f, i) => tone(now + i * 0.06, f, "sine", 0.12, 0.3));
        break;
      case "bubble": tone(now, 880, "sine", 0.18, 0.6); tone(now + 0.08, 1320, "sine", 0.12, 0.6); break;
      case "star": bell(now, 660, 0.12); incipit("salve", 5, 0.3); break;       // Salve Regina
      case "tier": bell(now, 330, 0.2); incipit("vigils", 6, 0.32); break;      // Te Deum laudamus
      case "lost": bell(now, 110, 0.14); noiseHit(now, "lowpass", 400, 0.2, 0.4, sfxGain); break;
      case "hour": bell(now, 220, 0.18); bell(now + 1.4, 220, 0.14); break;     // the bell rings for the Office
      case "demon":
        noiseHit(now, "lowpass", 180, 0.4, 1.2, sfxGain);
        tone(now, 98, "sawtooth", 0.1, 1.2, 70);
        tone(now, 139, "sawtooth", 0.08, 1.2, 100);
        break;
      case "end": bell(now, 165, 0.25); bell(now + 1.2, 165, 0.2); bell(now + 2.4, 165, 0.15); break;
    }
  }

  return {
    MODES, unlock, setMode, startMusic, stopMusic, setChant, setIntensity, play, stir, moveDrone, fx, cue, shout,
    get mode() { return mode; },
    get playing() { return playing; },
    get droneNote() { return centre(); },
  };
})();
