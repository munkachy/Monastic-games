// Benedictine Bricks — music and sound, made in the browser with Web Audio.
//
// Four kinds of music, chosen with the music button:
//   "both"   Gregorian chant over a techno beat, locked together: every chant
//            note starts on a beat.
//   "chant"  chant alone over its drone, sung freely at a schola's pace.
//   "techno" the beat alone, with a bass line and an arpeggio built from the
//            chant's own notes.
//   "off"    silence.
// In both "both" and "techno", the beat builds as the tower rises.

const Sound = (() => {
  const BPM = 112;
  const BEAT = 60 / BPM;          // one chant pulse when locked to the beat
  const SIXTEENTH = BEAT / 4;
  const FREE_PULSE = 0.45;        // one chant pulse when sung freely
  const FREE_REST = [0, 0.25, 0.5, 1.25, 1.5];   // rests at bars, in pulses
  const LOCKED_REST = [0, 0, 1, 1, 2];            // the same, in whole beats
  const MODES = ["both", "chant", "techno", "off"];

  let ac = null;
  let master, musicGain, sfxGain, reverbSend;
  let mode = "both";
  let noise = null;
  const waves = {};

  let playing = false;
  let timer = null;
  let gridTime = 0;               // time of the next sixteenth
  let step = 0;                   // sixteenths since the music began
  let chant = null;
  let chantKey = null;
  let pendingKey = null;
  let noteIndex = 0;
  let chantTime = 0;              // time of the next chant note
  let intensity = 0;              // how far the beat has built: 0, 1, 2
  let drone = null;
  let lyrics = [];
  let finalPitch = 55;
  let arpNotes = [55, 59, 62];

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = mode === "off" ? 0 : 0.8;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(master);
    sfxGain = ac.createGain();
    sfxGain.gain.value = 0.7;
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

    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // Call from a tap or click: browsers only allow sound after one.
  function unlock() {
    init();
    if (ac && ac.state === "suspended") ac.resume();
  }

  function setMode(m) {
    mode = MODES.includes(m) ? m : "both";
    if (master) master.gain.setTargetAtTime(mode === "off" ? 0 : 0.8, ac.currentTime, 0.05);
    if (playing) {
      // Start the chant again from the next bar, in the new manner.
      const key = chantKey;
      stopMusic();
      startMusic(key);
    }
  }

  // ---- Instruments ------------------------------------------------------------

  // A smooth sung "ah": each harmonic of the note is shaped by the formants of
  // the vowel, so the tone is round, not buzzy. One wave for each pitch.
  function vowelWave(midi) {
    if (waves[midi]) return waves[midi];
    const f0 = mtof(midi);
    const n = 24;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    const formants = [[700, 130, 1], [1150, 160, 0.5], [2600, 260, 0.12]];
    for (let h = 1; h <= n; h++) {
      const f = h * f0;
      let a = 0;
      for (const [fc, bw, amp] of formants) a += amp * Math.exp(-0.5 * Math.pow((f - fc) / bw, 2));
      imag[h] = (a + 0.35 / h) / Math.sqrt(h);
    }
    waves[midi] = ac.createPeriodicWave(real, imag);
    return waves[midi];
  }

  // A sung note: three voices a few cents apart, each with its own slow
  // vibrato, and a quieter voice an octave below, as in a choir of men.
  function voice(midi, t, dur, out, level) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.09);
    g.gain.setValueAtTime(level, t + Math.max(0.1, dur - 0.06));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.14);
    const soft = ac.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 2400;
    soft.connect(g);
    for (const [pitch, detune, amp, rate] of [[midi, -7, 0.36, 4.6], [midi, 0, 0.36, 5.2], [midi, 7, 0.36, 5.7], [midi - 12, 0, 0.3, 4.9]]) {
      const o = ac.createOscillator();
      o.setPeriodicWave(vowelWave(pitch));
      o.frequency.value = mtof(pitch);
      o.detune.value = detune;
      const vib = ac.createOscillator();
      const vibAmt = ac.createGain();
      vib.frequency.value = rate;
      vibAmt.gain.value = 5;
      vib.connect(vibAmt).connect(o.detune);
      const a = ac.createGain();
      a.gain.value = amp;
      o.connect(a).connect(soft);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.2);
      vib.stop(t + dur + 0.2);
    }
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

  function bass(midi, t, length) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = mtof(midi);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + length);
    filt.Q.value = 6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length * 0.95);
    o.connect(filt).connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + length);
  }

  // A plucked arpeggio note, with an echo on the dotted eighth.
  function pluck(midi, t) {
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = mtof(midi);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(3000, t);
    filt.frequency.exponentialRampToValueAtTime(500, t + 0.2);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(filt).connect(g).connect(musicGain);
    g.connect(reverbSend);
    o.start(t);
    o.stop(t + 0.3);
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
    // The arpeggio uses the chant's own notes: its final, and the notes above.
    const set = [...new Set(pitched.map(([p]) => p))].sort((a, b) => a - b);
    const above = set.filter((p) => p > finalPitch).slice(0, 4);
    arpNotes = [finalPitch, ...above];
    retuneDrone();
  }

  // The time of the first sixteenth of the next bar.
  function nextBar(time) {
    const barLength = SIXTEENTH * 16;
    const origin = gridTime - step * SIXTEENTH;
    return origin + Math.ceil((time - origin - 0.001) / barLength) * barLength;
  }

  function schedule() {
    const horizon = ac.currentTime + 0.15;
    const beat = mode === "both" || mode === "techno";

    // The beat, one sixteenth at a time.
    while (gridTime < horizon) {
      const t = gridTime;
      const s = step % 16;
      if (beat) {
        const level = mode === "techno" ? intensity + 1 : intensity;
        if (level >= 1) {
          if (s % 4 === 0) kick(t);
          if (s % 4 === 2) noiseHit(t, "highpass", 8000, 0.12, 0.05);
          if (s === 4 || s === 12) noiseHit(t, "bandpass", 1500, 0.25, 0.18);
        }
        if (level >= 2 && s % 2 === 0) {
          const pattern = [0, 0, 12, 0, 0, 12, 7, 12];
          bass(finalPitch - 24 + pattern[(s / 2) % 8], t, SIXTEENTH * 2);
        }
        if (mode === "techno" && level >= 3 && s % 2 === 1) {
          pluck(arpNotes[(step >> 1) % arpNotes.length] + 12, t);
        }
      }
      gridTime += SIXTEENTH;
      step++;
    }

    if (mode === "techno" || mode === "off") return;

    // The chant, one note at a time.
    const locked = mode === "both";
    const pulse = locked ? BEAT : FREE_PULSE;
    while (chantTime < horizon) {
      if (noteIndex >= chant.notes.length) {
        if (pendingKey) { loadChant(pendingKey); pendingKey = null; }
        noteIndex = 0;
        // A breath, then begin again (on the next bar, when locked to the beat).
        chantTime = locked ? nextBar(chantTime + BEAT * 2) : chantTime + FREE_PULSE * 4;
        continue;
      }
      const [pitch, dur, endsSyllable] = chant.notes[noteIndex];
      if (!pitch) {
        chantTime += (locked ? LOCKED_REST[dur] : FREE_REST[dur]) * pulse;
        noteIndex++;
        continue;
      }
      // Locked to the beat, a note is held for a whole number of beats.
      const beats = locked ? (dur >= 1.9 ? Math.round(dur) : 1) : dur;
      const length = beats * pulse;
      const word = chant.words.find(([i]) => i === noteIndex);
      if (word) lyrics.push([chantTime, word[1]]);
      voice(pitch, chantTime, endsSyllable ? length * 0.86 : length * 0.99, musicGain, 0.2);
      chantTime += length;
      noteIndex++;
    }
    if (lyrics.length > 40) lyrics = lyrics.slice(-20);
  }

  function startMusic(key) {
    if (!ac || mode === "off") return;
    if (!playing) {
      playing = true;
      loadChant(key);
      startDrone();
      gridTime = ac.currentTime + 0.1;
      step = 0;
      chantTime = gridTime;
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
    if (!playing) return;
    if (mode === "techno") { if (key !== chantKey) loadChant(key); return; }
    if (key !== chantKey) pendingKey = key;
  }

  function setIntensity(n) {
    intensity = n;
  }

  // The syllable being sung now, for showing on screen.
  function lyric() {
    if (!ac || !playing || mode === "techno") return "";
    let text = "";
    for (const [t, s] of lyrics) if (t <= ac.currentTime) text = s;
    return text;
  }

  // Short effects start on the next sixteenth of the beat, as in Lumines.
  function onBeat() {
    const now = ac.currentTime;
    if (!playing || mode === "chant") return now;
    const since = now - (gridTime - SIXTEENTH * 2);
    return now + (SIXTEENTH - (since % SIXTEENTH)) % SIXTEENTH;
  }

  // A few notes of a chant's opening, sung as a sound effect.
  function incipit(key, count, speed) {
    const notes = CHANTS[key].notes.filter(([p]) => p).slice(0, count);
    let t = ac.currentTime + 0.02;
    for (const [p] of notes) {
      voice(p, t, speed * 0.95, sfxGain, 0.26);
      t += speed;
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
    MODES, unlock, setMode, startMusic, stopMusic, setChant, setIntensity, lyric, play,
    get mode() { return mode; },
    get playing() { return playing; },
  };
})();
