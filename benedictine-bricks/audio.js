// Benedictine Bricks — music and sound, made in the browser with Web Audio.
//
// The music is Gregorian chant (from chants.js) sung by a synthesized choir
// over a drone on the chant's final, with a techno beat that builds as the
// tower rises: first the chant alone, then drums, then a bass line.
// Sound effects land on the beat, and a few of them sing chant openings.

const Sound = (() => {
  const BPM = 112;
  const EIGHTH = 60 / BPM / 2;
  let ac = null;
  let master, musicGain, sfxGain, reverbSend;
  let enabled = true;
  let noise = null;

  // Music state
  let playing = false;
  let timer = null;
  let gridTime = 0;        // time of the next eighth-note step
  let step = 0;
  let chant = null;
  let chantKey = null;
  let pendingKey = null;
  let noteIndex = 0;
  let chantTime = 0;       // time of the next chant note
  let intensity = 0;       // 0 chant and drone, 1 with drums, 2 with bass
  let drone = null;
  let lyrics = [];         // [time, syllable] for the words being sung
  let finalPitch = 55;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(master);
    sfxGain = ac.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(master);

    // A stone church: a long, soft reverb made from decaying noise.
    const reverb = ac.createConvolver();
    const len = ac.sampleRate * 3;
    const impulse = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = impulse;
    reverbSend = ac.createGain();
    reverbSend.gain.value = 0.45;
    reverbSend.connect(reverb);
    reverb.connect(master);

    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // Call from a tap or click: browsers only allow sound after one.
  function unlock() {
    init();
    if (ac && ac.state === "suspended") ac.resume();
  }

  function setEnabled(on) {
    enabled = on;
    if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 0.05);
  }

  // ---- Instruments ------------------------------------------------------------

  // A sung note: detuned saws through two vowel formants ("ah"), with a
  // quieter voice an octave below, as in a choir of men.
  function voice(midi, t, dur, out, level) {
    const f = mtof(midi);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.06);
    g.gain.setValueAtTime(level, t + Math.max(0.07, dur - 0.05));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    const f1 = ac.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 750;
    f1.Q.value = 5;
    const f2 = ac.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 1150;
    f2.Q.value = 7;
    const body = ac.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 1800;
    const mix = ac.createGain();
    mix.gain.value = 1;
    for (const [freq, detune, amp] of [[f, -6, 0.5], [f, 6, 0.5], [f / 2, 0, 0.35]]) {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, t);
      o.detune.value = detune;
      const vib = ac.createOscillator();
      const vibAmt = ac.createGain();
      vib.frequency.value = 5;
      vibAmt.gain.value = 4;
      vib.connect(vibAmt).connect(o.detune);
      const a = ac.createGain();
      a.gain.value = amp;
      o.connect(a).connect(mix);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.2);
      vib.stop(t + dur + 0.2);
    }
    mix.connect(f1).connect(g);
    mix.connect(f2).connect(g);
    mix.connect(body).connect(g);
    g.connect(out);
    g.connect(reverbSend);
  }

  function kick(t) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 0.4);
  }

  function noiseHit(t, type, freq, level, length, out) {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const filt = ac.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    src.connect(filt).connect(g).connect(out || musicGain);
    src.start(t);
    src.stop(t + length + 0.02);
  }

  function bass(midi, t) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = mtof(midi);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + EIGHTH);
    filt.Q.value = 6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + EIGHTH * 0.95);
    o.connect(filt).connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + EIGHTH);
  }

  // A church bell: partials in the proportions of a real bell's hum, prime,
  // tierce, quint and nominal.
  function bell(t, base, level, out) {
    for (const [ratio, amp, decay] of [[0.5, 0.6, 3], [1, 1, 2.2], [1.2, 0.5, 1.6], [1.5, 0.4, 1.4], [2, 0.5, 1.2], [2.5, 0.25, 0.9], [3, 0.2, 0.7]]) {
      const o = ac.createOscillator();
      o.frequency.value = base * ratio;
      const g = ac.createGain();
      g.gain.setValueAtTime(level * amp, t);
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
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + length);
    const g = ac.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g).connect(sfxGain);
    o.start(t);
    o.stop(t + length + 0.02);
  }

  // ---- Music ------------------------------------------------------------------

  function startDrone() {
    stopDrone();
    const out = ac.createGain();
    out.gain.setValueAtTime(0, ac.currentTime);
    out.gain.linearRampToValueAtTime(0.07, ac.currentTime + 2);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 600;
    filt.connect(out);
    out.connect(musicGain);
    out.connect(reverbSend);
    const oscs = [0, 7, 12].map((interval, i) => {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = mtof(finalPitch - 12 + interval);
      o.detune.value = (i - 1) * 5;
      o.connect(filt);
      o.start();
      return { o, interval };
    });
    drone = { out, oscs };
  }

  function retuneDrone() {
    if (!drone) return;
    for (const { o, interval } of drone.oscs) o.frequency.setTargetAtTime(mtof(finalPitch - 12 + interval), ac.currentTime, 0.8);
  }

  function stopDrone() {
    if (!drone) return;
    const d = drone;
    d.out.gain.setTargetAtTime(0, ac.currentTime, 0.3);
    setTimeout(() => d.oscs.forEach(({ o }) => o.stop()), 1500);
    drone = null;
  }

  function loadChant(key) {
    chantKey = key;
    chant = CHANTS[key];
    noteIndex = 0;
    const pitched = chant.notes.filter(([p]) => p);
    finalPitch = pitched[pitched.length - 1][0];
    retuneDrone();
  }

  function schedule() {
    const horizon = ac.currentTime + 0.15;
    // The beat.
    while (gridTime < horizon) {
      const t = gridTime;
      if (intensity >= 1) {
        if (step % 2 === 0) kick(t);
        if (step % 2 === 1) noiseHit(t, "highpass", 8000, 0.12, 0.05);
        if (step % 8 === 4) noiseHit(t, "bandpass", 1500, 0.25, 0.18);
      }
      if (intensity >= 2) {
        const pattern = [0, 0, 12, 0, 0, 12, 7, 12];
        bass(finalPitch - 24 + pattern[step % 8], t);
      }
      gridTime += EIGHTH;
      step++;
    }
    // The chant, one note at a time; a breath between each pass through it.
    while (chantTime < horizon) {
      if (noteIndex >= chant.notes.length) {
        if (pendingKey) { loadChant(pendingKey); pendingKey = null; }
        noteIndex = 0;
        chantTime += EIGHTH * 4;
        continue;
      }
      const [pitch, dur] = chant.notes[noteIndex];
      const word = chant.words.find(([i]) => i === noteIndex);
      if (word) lyrics.push([chantTime, word[1]]);
      if (pitch) voice(pitch, chantTime, dur * EIGHTH * 0.98, musicGain, 0.16);
      chantTime += dur * EIGHTH;
      noteIndex++;
    }
    if (lyrics.length > 40) lyrics = lyrics.slice(-20);
  }

  function startMusic(key) {
    if (!ac) return;
    if (!playing) {
      playing = true;
      loadChant(key);
      startDrone();
      gridTime = chantTime = ac.currentTime + 0.1;
      step = 0;
      timer = setInterval(schedule, 25);
    } else if (key !== chantKey) {
      pendingKey = key;
    }
  }

  function stopMusic() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    stopDrone();
    lyrics = [];
  }

  // Change to another chant when the one being sung comes to its end.
  function setChant(key) {
    if (playing && key !== chantKey) pendingKey = key;
  }

  function setIntensity(n) {
    intensity = n;
  }

  // The syllable being sung now, for showing on screen.
  function lyric() {
    if (!ac || !playing) return "";
    let text = "";
    for (const [t, s] of lyrics) if (t <= ac.currentTime) text = s;
    return text;
  }

  // Short effects start on the next sixteenth of the beat, as in Lumines.
  function onBeat() {
    const now = ac.currentTime;
    if (!playing) return now;
    const sixteenth = EIGHTH / 2;
    const since = now - (gridTime - EIGHTH * 2);
    return now + (sixteenth - (since % sixteenth)) % sixteenth;
  }

  // A few notes of a chant's opening, sung as a sound effect.
  function incipit(key, count, speed) {
    const notes = CHANTS[key].notes.filter(([p]) => p).slice(0, count);
    let t = ac.currentTime + 0.02;
    for (const [p] of notes) {
      voice(p, t, speed * 0.95, sfxGain, 0.22);
      t += speed;
    }
  }

  // ---- Effects ------------------------------------------------------------------

  function play(name, size) {
    if (!ac || !enabled) return;
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
      case "star": bell(now, 660, 0.12); incipit("salve", 5, 0.17); break;       // Salve Regina
      case "tier": bell(now, 330, 0.2); incipit("vigils", 6, 0.2); break;         // Te Deum laudamus
      case "lost": bell(now, 110, 0.14); noiseHit(now, "lowpass", 400, 0.2, 0.4, sfxGain); break;
      case "hour": bell(now, 220, 0.18); bell(now + 1.4, 220, 0.14); break;       // the bell rings for the Office
      case "demon":
        noiseHit(now, "lowpass", 180, 0.4, 1.2, sfxGain);
        tone(now, 98, "sawtooth", 0.1, 1.2, 70);
        tone(now, 139, "sawtooth", 0.08, 1.2, 100);
        break;
      case "end": bell(now, 165, 0.25); bell(now + 1.2, 165, 0.2); bell(now + 2.4, 165, 0.15); break;
    }
  }

  return {
    unlock, setEnabled, startMusic, stopMusic, setChant, setIntensity, lyric, play,
    get enabled() { return enabled; },
  };
})();
