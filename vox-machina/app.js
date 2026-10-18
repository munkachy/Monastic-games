// Vox Machina user interface: controls, presets, preview, download, batch.
import { preload, speak, render, toWav, stretchVowels, WOBBLE_STEPS, GATE_STEPS } from './engine.js';
import { sing } from './sing.js';
import { makeMelody, describe, STYLES } from './melody.js';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// Controls. Each slider is described once here; the page is built from this.
// key: settings field, box: which panel, min/max/step, fmt: how to show it.
// ---------------------------------------------------------------------------
const SLIDERS = [
  { key: 'robot', box: 'robotBox', label: 'ROBOT AMOUNT', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  { key: 'pitch', box: 'voiceBox', label: 'Pitch', min: 0, max: 99, step: 1, fmt: v => mode === 'sing' ? semis(v) : v },
  { key: 'pitchRange', box: 'voiceBox', label: 'Pitch range (0 = monotone)', min: 0, max: 99, step: 1, fmt: v => mode === 'sing' ? Math.round(v * 2) + '% leaps' : v },
  { key: 'speed', box: 'voiceBox', label: 'Speed (words/min)', min: 80, max: 400, step: 5, fmt: v => mode === 'sing' ? v + ' · words ' + (v > 160 ? 'snappier' : v < 160 ? 'fuller' : 'normal') : v },
  { key: 'speakVowel', box: 'voiceBox', label: 'Vowel length (speech)', min: 1, max: 2, step: 0.05, fmt: pct },
  { key: 'wordGap', box: 'voiceBox', label: 'Word gap', min: 0, max: 40, step: 1, fmt: v => v * 10 + ' ms' },
  { key: 'bpm', box: 'tempoBox', label: 'Tempo', min: 50, max: 180, step: 1, fmt: v => v + ' BPM' },
  // Vowel length: up to 100% it holds each vowel through its note; above
  // 100% the notes themselves grow (to double at 200%) while the words stay
  // crisp, so only the vowels get longer.
  { key: 'sustain', box: 'melodyBox', label: 'Vowel length', min: 0, max: 2, step: 0.05, fmt: pct },
  { key: 'melisma', box: 'melodyBox', label: 'Melisma (runs on vowels)', min: 0, max: 1, step: 0.05, fmt: pct },
  { key: 'glide', box: 'melodyBox', label: 'Glide between notes', min: 0.001, max: 0.15, step: 0.001, fmt: v => Math.round(v * 1000) + ' ms' },
  { key: 'wobbleRate', box: 'tempoBox', label: 'Wobble rate', min: 0, max: WOBBLE_STEPS.length - 1, step: 1, fmt: v => beatName(WOBBLE_STEPS[v]) },
  { key: 'wobbleDepth', box: 'tempoBox', label: 'Wobble depth', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'gateRate', box: 'tempoBox', label: 'Gate rate', min: 0, max: GATE_STEPS.length - 1, step: 1, fmt: v => beatName(GATE_STEPS[v]) },
  { key: 'gateDepth', box: 'tempoBox', label: 'Gate depth', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'bits', box: 'crushBox', label: 'Bit depth', min: 1, max: 16, step: 0.5, fmt: v => v + ' bit' },
  { key: 'crushRate', box: 'crushBox', label: 'Sample-rate reduction', min: 1, max: 40, step: 0.5,
    fmt: v => Math.round(44100 / v) + ' Hz' },
  { key: 'ringFreq', box: 'ringBox', label: 'Frequency', min: 5, max: 2000, step: 1, fmt: v => v + ' Hz' },
  { key: 'ringMix', box: 'ringBox', label: 'Mix', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'choirMix', box: 'choirBox', label: 'Mix', min: 0, max: 1.5, step: 0.01, fmt: pct },
  { key: 'choirVoices', box: 'choirBox', label: 'Voices', min: 1, max: 6, step: 1 },
  { key: 'delayTime', box: 'spaceBox', label: 'Delay time', min: 0.03, max: 1.2, step: 0.01, fmt: v => Math.round(v * 1000) + ' ms' },
  { key: 'delayFeedback', box: 'spaceBox', label: 'Delay feedback', min: 0, max: 0.85, step: 0.01, fmt: pct },
  { key: 'delayMix', box: 'spaceBox', label: 'Delay mix', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'reverbSize', box: 'spaceBox', label: 'Reverb size', min: 0.2, max: 6, step: 0.1, fmt: v => v + ' s' },
  { key: 'reverbMix', box: 'spaceBox', label: 'Reverb mix', min: 0, max: 1.5, step: 0.01, fmt: pct },
];
function beatName(b) {
  return { 2: '1/2 note', 1: '1/4 note', 0.75: 'dotted 1/8', 0.5: '1/8 note', 0.25: '1/16 note', 0.125: '1/32 note' }[b] || '1/8 triplet';
}
function semis(v) { const n = Math.round((v - 50) / 50 * 12); return (n > 0 ? '+' : '') + n + ' semitones'; }
function pct(v) { return Math.round(v * 100) + '%'; }

// eSpeak NG voice variants bundled in this build. They change the formant
// tables, breathiness, roughness and pitch movement - all by rule.
// Note: this WebAssembly build was compiled without the Klatt synthesizer, so
// the "klatt" variants fall back to eSpeak's standard formant synthesizer.
const VARIANTS = [
  ['', 'Default'], ['m1', 'Male 1'], ['m3', 'Male 3'], ['m7', 'Male 7'],
  ['f1', 'Female 1'], ['f2', 'Female 2'], ['f4', 'Female 4'],
  ['robosoft', 'Robosoft'], ['robosoft3', 'Robosoft 3'], ['robosoft5', 'Robosoft 5'], ['UniRobot', 'UniRobot'],
  ['anikaRobot', 'Anika Robot'], ['whisper', 'Whisper'], ['whisperf', 'Whisper (female)'],
  ['croak', 'Croak'], ['Demonic', 'Demonic'], ['Storm', 'Storm'], ['Tweaky', 'Tweaky'],
  ['edward', 'Edward'], ['grandpa', 'Grandpa'], ['norbert', 'Norbert'], ['announcer', 'Announcer'],
  ['klatt', 'Klatt (falls back)'], ['klatt3', 'Klatt 3 (falls back)'],
];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
const DEFAULTS = {
  voice: 'en-us', variant: '', pitch: 50, pitchRange: 50, speed: 160, wordGap: 0, speakVowel: 1,
  robot: 0.6, bits: 10, crushRate: 2, ringFreq: 60, ringMix: 0.3,
  choirMix: 0, choirVoices: 3, delayTime: 0.25, delayFeedback: 0.3, delayMix: 0.1,
  reverbSize: 1.5, reverbMix: 0.2,
  // Singing
  mode: 'speak', key: 'Bm', octave: 0, style: 'psalmTone', harmony: 'none', seed: 1,
  carrierChoir: false, bpm: 100, sustain: 0.8, glide: 0.03, melisma: 0,
  wobbleRate: 3, wobbleDepth: 0, gateRate: 3, gateDepth: 0,
};
// Fields read from plain form inputs (not sliders) and how to read them.
const FIELDS = { voice: 'value', variant: 'value', key: 'value', octave: 'number', style: 'value',
  harmony: 'value', carrierChoir: 'checked' };
const BUILTIN = {
  'Kraftwerk': { variant: 'robosoft', pitch: 40, pitchRange: 0, speed: 140, wordGap: 4,
    robot: 1, bits: 12, crushRate: 1.5, ringFreq: 30, ringMix: 0.45, choirMix: 0.4, choirVoices: 2,
    delayTime: 0.375, delayFeedback: 0.35, delayMix: 0.25, reverbSize: 0.8, reverbMix: 0.1 },
  'Cold Cathedral': { variant: 'm3', pitch: 30, pitchRange: 10, speed: 120, wordGap: 8,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 110, ringMix: 0.15, choirMix: 1.1, choirVoices: 5,
    delayTime: 0.6, delayFeedback: 0.2, delayMix: 0.15, reverbSize: 5, reverbMix: 1.1 },
  '8-bit Monk': { variant: 'm1', pitch: 35, pitchRange: 0, speed: 150, wordGap: 2,
    robot: 1, bits: 4, crushRate: 8, ringFreq: 220, ringMix: 0.1, choirMix: 0, choirVoices: 1,
    delayTime: 0.18, delayFeedback: 0.25, delayMix: 0.2, reverbSize: 0.5, reverbMix: 0.05 },
  'Dalek Lector': { variant: 'croak', pitch: 45, pitchRange: 20, speed: 150, wordGap: 0,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 30, ringMix: 1, choirMix: 0, choirVoices: 1,
    delayTime: 0.1, delayFeedback: 0, delayMix: 0, reverbSize: 0.6, reverbMix: 0.1 },
  'Gregorian Machine': { mode: 'sing', style: 'psalmTone', harmony: 'organum', variant: 'm3', bpm: 92,
    sustain: 0.85, glide: 0.04, carrierChoir: true,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 110, ringMix: 0, choirMix: 0.5, choirVoices: 3,
    delayTime: 0.5, delayFeedback: 0.2, delayMix: 0.1, reverbSize: 4.5, reverbMix: 0.9 },
  'Vocoder Hymn': { mode: 'sing', style: 'hymn', harmony: 'choir', variant: '', bpm: 96,
    sustain: 0.8, glide: 0.02, carrierChoir: true,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 60, ringMix: 0, choirMix: 0.3, choirVoices: 2,
    delayTime: 0.31, delayFeedback: 0.3, delayMix: 0.15, reverbSize: 2.5, reverbMix: 0.5 },
  'Robot Arpeggio': { mode: 'sing', style: 'arpeggio', harmony: 'octave', variant: 'robosoft', bpm: 124,
    sustain: 0.5, glide: 0.005, carrierChoir: false,
    robot: 1, bits: 10, crushRate: 2, ringFreq: 30, ringMix: 0.15, choirMix: 0, choirVoices: 1,
    delayTime: 0.242, delayFeedback: 0.4, delayMix: 0.25, reverbSize: 1.2, reverbMix: 0.2 },
  // --- Cathedral family ---
  'Night Office': { mode: 'sing', style: 'psalmTone', harmony: 'organum', variant: 'm7', octave: -1, bpm: 72,
    sustain: 0.9, glide: 0.06, carrierChoir: true,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 55, ringMix: 0.05, choirMix: 1.3, choirVoices: 6,
    delayTime: 0.83, delayFeedback: 0.35, delayMix: 0.2, reverbSize: 6, reverbMix: 1.4 },
  'Seraphim': { mode: 'sing', style: 'hymn', harmony: 'choir', variant: 'f2', octave: 1, bpm: 80,
    sustain: 0.9, glide: 0.05, carrierChoir: true,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 1200, ringMix: 0.08, choirMix: 1.2, choirVoices: 5,
    delayTime: 0.375, delayFeedback: 0.45, delayMix: 0.25, reverbSize: 5.5, reverbMix: 1.2 },
  'Crypt': { variant: 'm7', pitch: 8, pitchRange: 15, speed: 115, wordGap: 6,
    robot: 1, bits: 11, crushRate: 2.5, ringFreq: 38, ringMix: 0.35, choirMix: 0.8, choirVoices: 3,
    delayTime: 0.7, delayFeedback: 0.3, delayMix: 0.15, reverbSize: 4.5, reverbMix: 0.9 },
  'Abbey Ruins': { variant: 'whisper', pitch: 40, pitchRange: 30, speed: 125, wordGap: 10,
    robot: 1, bits: 9, crushRate: 4, ringFreq: 300, ringMix: 0.1, choirMix: 0.6, choirVoices: 3,
    delayTime: 0.9, delayFeedback: 0.6, delayMix: 0.35, reverbSize: 6, reverbMix: 1.3 },
  'Satellite Psalm': { variant: 'Tweaky', pitch: 60, pitchRange: 0, speed: 150, wordGap: 3,
    robot: 1, bits: 12, crushRate: 1.5, ringFreq: 880, ringMix: 0.5, choirMix: 0.3, choirVoices: 2,
    delayTime: 0.45, delayFeedback: 0.55, delayMix: 0.35, reverbSize: 2.5, reverbMix: 0.4 },
  'Jubilus': { mode: 'sing', style: 'psalmTone', harmony: 'organum', variant: 'm3', octave: 0, bpm: 84,
    sustain: 1.25, melisma: 0.75, glide: 0.035, carrierChoir: true,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 55, ringMix: 0, choirMix: 1.1, choirVoices: 5,
    delayTime: 0.71, delayFeedback: 0.25, delayMix: 0.12, reverbSize: 6, reverbMix: 1.3 },
  // --- Hip-hop ---
  // West Coast talkbox, in the spirit of "California Love": one bright synth
  // line that slides into its notes, laid-back G-funk hook, short room.
  'West Coast Talkbox': { mode: 'sing', style: 'gfunk', harmony: 'none', variant: '', octave: 1, bpm: 92,
    sustain: 1, melisma: 0.15, glide: 0.08, carrierChoir: false,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 60, ringMix: 0, choirMix: 0.15, choirVoices: 2,
    delayTime: 0.163, delayFeedback: 0.15, delayMix: 0.12, reverbSize: 0.8, reverbMix: 0.15 },
  'Boom-bap Lector': { mode: 'sing', style: 'hiphop', harmony: 'none', variant: 'm1', octave: 0, bpm: 90,
    sustain: 0.4, melisma: 0, glide: 0.01, carrierChoir: false,
    robot: 1, bits: 12, crushRate: 2, ringFreq: 60, ringMix: 0.1, choirMix: 0, choirVoices: 1,
    delayTime: 0.333, delayFeedback: 0.2, delayMix: 0.12, reverbSize: 0.6, reverbMix: 0.1 },
  'Trap Psalm': { mode: 'sing', style: 'trap', harmony: 'octave', variant: 'm7', octave: -1, bpm: 140,
    sustain: 0.6, melisma: 0, glide: 0.04, carrierChoir: false, gateRate: 3, gateDepth: 0.2,
    robot: 1, bits: 14, crushRate: 1, ringFreq: 60, ringMix: 0, choirMix: 0.2, choirVoices: 2,
    delayTime: 0.214, delayFeedback: 0.3, delayMix: 0.15, reverbSize: 1.5, reverbMix: 0.25 },
  // --- Dance floor ---
  'Basilica Dub': { mode: 'sing', style: 'dubstep', harmony: 'organum', variant: 'm3', octave: -1, bpm: 140,
    sustain: 0.85, glide: 0.03, carrierChoir: true, wobbleRate: 4, wobbleDepth: 0.75, gateDepth: 0,
    robot: 1, bits: 16, crushRate: 1, ringFreq: 60, ringMix: 0, choirMix: 0.5, choirVoices: 3,
    delayTime: 0.32, delayFeedback: 0.3, delayMix: 0.15, reverbSize: 4, reverbMix: 0.7 },
  'Dubstep Doom': { mode: 'sing', style: 'dubstep', harmony: 'octave', variant: 'Demonic', octave: -1, bpm: 140,
    sustain: 0.9, glide: 0.02, carrierChoir: false, wobbleRate: 3, wobbleDepth: 1, gateDepth: 0,
    robot: 1, bits: 8, crushRate: 2, ringFreq: 45, ringMix: 0.2, choirMix: 0, choirVoices: 1,
    delayTime: 0.214, delayFeedback: 0.2, delayMix: 0.1, reverbSize: 1, reverbMix: 0.15 },
  'Warehouse Vespers': { mode: 'sing', style: 'techno', harmony: 'drone', variant: 'robosoft', bpm: 128,
    sustain: 0.6, glide: 0.005, carrierChoir: false, wobbleDepth: 0, gateRate: 3, gateDepth: 0.85,
    robot: 1, bits: 12, crushRate: 1, ringFreq: 30, ringMix: 0.1, choirMix: 0.2, choirVoices: 2,
    delayTime: 0.352, delayFeedback: 0.45, delayMix: 0.3, reverbSize: 2, reverbMix: 0.35 },
  'Electro Lector': { mode: 'sing', style: 'electro', harmony: 'octave', variant: 'robosoft3', bpm: 118,
    sustain: 0.5, glide: 0.01, carrierChoir: false, wobbleDepth: 0, gateRate: 2, gateDepth: 0.3,
    robot: 1, bits: 10, crushRate: 1.5, ringFreq: 30, ringMix: 0.3, choirMix: 0, choirVoices: 1,
    delayTime: 0.381, delayFeedback: 0.35, delayMix: 0.25, reverbSize: 1, reverbMix: 0.15 },
  'Acid Compline': { mode: 'sing', style: 'acid', harmony: 'none', variant: 'm1', bpm: 130,
    sustain: 0.6, glide: 0.09, carrierChoir: false, wobbleRate: 5, wobbleDepth: 0.55, gateDepth: 0,
    robot: 1, bits: 12, crushRate: 1, ringFreq: 220, ringMix: 0.15, choirMix: 0, choirVoices: 1,
    delayTime: 0.346, delayFeedback: 0.5, delayMix: 0.3, reverbSize: 1.5, reverbMix: 0.25 },
  'Whispered Vigil': { variant: 'whisper', pitch: 50, pitchRange: 50, speed: 130, wordGap: 5,
    robot: 1, bits: 14, crushRate: 1, ringFreq: 800, ringMix: 0.1, choirMix: 0.7, choirVoices: 4,
    delayTime: 0.45, delayFeedback: 0.45, delayMix: 0.3, reverbSize: 3.5, reverbMix: 0.7 },
};
const STORE_KEY = 'voxMachina.presets';

function userPresets() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveUserPresets(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { alert('Could not save (storage blocked).'); }
}
function refreshPresetList(select) {
  const list = $('presetList'); list.innerHTML = '';
  const add = (name, label) => { const o = new Option(label, name); list.add(o); };
  for (const n of Object.keys(BUILTIN)) add('b:' + n, n);
  for (const n of Object.keys(userPresets())) add('u:' + n, n + ' (mine)');
  if (select) list.value = select;
}

// ---------------------------------------------------------------------------
// Settings <-> controls
// ---------------------------------------------------------------------------
function buildControls() {
  for (const s of SLIDERS) {
    const div = document.createElement('div'); div.className = 'ctl';
    div.innerHTML = `<label for="c_${s.key}">${s.label}<output id="o_${s.key}"></output></label>
      <input type="range" id="c_${s.key}" min="${s.min}" max="${s.max}" step="${s.step}">`;
    $(s.box).append(div);
    div.querySelector('input').addEventListener('input', () => showValue(s));
  }
  for (const [v, label] of VARIANTS) $('variant').add(new Option(label, v));
  for (const [v, st] of Object.entries(STYLES)) $('style').add(new Option(st.label, v));
}
function showValue(s) {
  const v = +$('c_' + s.key).value;
  $('o_' + s.key).textContent = s.fmt ? s.fmt(v) : v;
}
function getSettings() {
  const o = { mode, seed };
  for (const [k, how] of Object.entries(FIELDS)) o[k] = how === 'number' ? +$(k).value : $(k)[how];
  for (const s of SLIDERS) o[s.key] = +$('c_' + s.key).value;
  return o;
}
function setSettings(p) {
  // A preset that doesn't mention the mode or key keeps the current ones.
  const o = { ...DEFAULTS, mode, key: $('key').value || DEFAULTS.key, ...p };
  for (const [k, how] of Object.entries(FIELDS)) $(k)[how === 'number' ? 'value' : how] = o[k];
  for (const s of SLIDERS) { $('c_' + s.key).value = o[s.key]; showValue(s); }
  seed = o.seed; setMode(o.mode);
  summarize();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
async function renderText(text, settings) {
  let voice;
  if (settings.mode === 'sing') voice = await sing(text, settings, msg => status(msg));
  else if (settings.mode === 'system') {
    if (!imported) throw new Error('iPhone voices play live only. Choose an audio file in the iPhone panel to process and save one.');
    voice = stretchVowels(imported, settings.speakVowel || 1);
  } else voice = stretchVowels(await speak(text, settings), settings.speakVowel || 1);
  return render(voice, settings);
}

// ---------------------------------------------------------------------------
// iPhone (system) voices
// ---------------------------------------------------------------------------
// speechSynthesis lists the voices installed on the device, including any
// Enhanced or Premium voices you have downloaded in Settings. These voices
// are built from recordings of real speakers, unlike eSpeak, so the tagline
// changes in this mode.
const TAG_SYNTH = 'Synthetic voice. No human voice recordings used.';
const TAG_SYSTEM = 'iPhone voice: built by Apple from recordings of human speakers.';
let sysVoices = [], imported = null;
function loadSystemVoices() {
  if (!('speechSynthesis' in window)) { $('sysCount').textContent = 'This browser has no system voices.'; return; }
  const keep = $('sysVoice').value;
  sysVoices = speechSynthesis.getVoices().slice().sort((a, b) =>
    (b.lang.startsWith('en') - a.lang.startsWith('en')) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  $('sysVoice').innerHTML = '';
  let group = null, lang = '';
  for (const v of sysVoices) {
    if (v.lang !== lang) { lang = v.lang; group = document.createElement('optgroup'); group.label = lang; $('sysVoice').append(group); }
    group.append(new Option(v.name + (v.default ? ' (default)' : ''), v.voiceURI));
  }
  if (keep) $('sysVoice').value = keep;
  $('sysCount').textContent = sysVoices.length
    ? `${sysVoices.length} voices on this device. To add more, go to Settings › Accessibility › Spoken Content › Voices, then reopen this page.`
    : 'No voices reported yet. Tap ▶ once; Safari sometimes lists them only after first use.';
  summarizeSystem();
}
function summarizeSystem() { $('sysSum').textContent = $('sysVoice').selectedOptions[0]?.text || ''; }
function speakSystem(text, g) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = sysVoices.find(x => x.voiceURI === $('sysVoice').value);
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = Math.max(0.1, Math.min(4, g.speed / 160));     // 160 words/min = normal
  u.pitch = Math.max(0, Math.min(2, g.pitch / 50));       // 50 = normal
  u.onend = () => status('Done.');
  speechSynthesis.speak(u);
  if (!sysVoices.length) setTimeout(loadSystemVoices, 300);
}

// Speak or Sing. The Melody panel only shows when singing.
let mode = 'speak', seed = 1;
function setMode(m) {
  mode = m;
  $('modeSpeak').classList.toggle('on', m === 'speak');
  $('modeSing').classList.toggle('on', m === 'sing');
  $('singBox').hidden = m !== 'sing';
  $('modeSystem').classList.toggle('on', m === 'system');
  $('sysBox').hidden = m !== 'system';
  $('tagline').textContent = m === 'system' ? TAG_SYSTEM : TAG_SYNTH;
  if (m === 'system' && !sysVoices.length) loadSystemVoices();
  for (const s of SLIDERS) if (['pitch', 'pitchRange', 'speed'].includes(s.key)) showValue(s);
  showTune();
}
// Show the notes the verse will be sung to (or why the key isn't valid).
function showTune() {
  $('seedShow').textContent = seed;
  $('styleAbout').textContent = STYLES[$('style').value]?.about || '';
  if (mode !== 'sing') return;
  try {
    const t = makeMelody($('text').value, { key: $('key').value, style: $('style').value, seed, octave: +$('octave').value, harmony: $('harmony').value, melisma: +$('c_melisma').value,
      transpose: Math.round((+$('c_pitch').value - 50) / 50 * 12), range: +$('c_pitchRange').value / 50 });
    $('tuneShow').textContent = t.key.label + ': ' + describe(t);
  } catch (e) { $('tuneShow').textContent = e.message; }
}

// Preview plays the exact WAV file through one <audio> element.
//
// Why not Web Audio here: on iPhone, Safari puts an AudioContext into an
// "interrupted" state whenever the page loses audio focus - when a download
// sheet opens, you switch apps, or the screen locks - and it often refuses to
// resume it. Preview then played into a dead context: silence, though the WAV
// was fine. An <audio> element doesn't have that problem, and it also plays
// with the silent switch on. iOS still only lets an element play if it was
// first started during a tap, so we "unlock" it with a silent clip at the very
// start of the click, before the render's await.
const player = new Audio();
player.preload = 'auto';
const SILENT = URL.createObjectURL(toWav({ sampleRate: 44100, getChannelData: () => new Float32Array(2205) }));  // 50 ms of silence
let previewUrl = null;
function unlockAudio() {          // call first thing in a tap handler
  player.pause();
  player.src = SILENT;
  player.play().catch(() => {});
}
function playBuffer(buf) {
  player.pause();
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(toWav(buf));
  player.src = previewUrl;
  player.currentTime = 0;
  return player.play();
}

function status(msg) { $('status').textContent = msg; }
function safeName(n) { return (n || 'verse').trim().replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '-') || 'verse'; }

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

// Cache the last render so Preview then Download doesn't render twice.
let last = { key: '', buffer: null };
async function currentBuffer() {
  const text = $('text').value.trim();
  if (!text) throw new Error('Type a verse first.');
  const settings = getSettings();
  const key = JSON.stringify([text, settings, settings.mode === 'system' ? importedName : '']);
  if (last.key !== key) {
    status('Rendering…');
    const t0 = performance.now();
    last = { key, buffer: await renderText(text, settings) };
    status(`Rendered ${last.buffer.duration.toFixed(2)} s in ${((performance.now() - t0) / 1000).toFixed(1)} s.`);
  }
  return last.buffer;
}

async function busy(btn, fn) {
  const all = document.querySelectorAll('button');
  all.forEach(b => b.disabled = true);
  try { await fn(); } catch (e) { console.error(e); status('Error: ' + e.message); }
  finally { all.forEach(b => b.disabled = false); }
}

// ---------------------------------------------------------------------------
// Wire up
// ---------------------------------------------------------------------------
buildControls();
$('modeSpeak').onclick = () => setMode('speak');
$('modeSing').onclick = () => setMode('sing');
$('modeSystem').onclick = () => setMode('system');
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadSystemVoices;
$('sysVoice').onchange = summarizeSystem;

// Import an audio file (for example one the Shortcuts app saved with an
// iPhone voice) to use as the voice: mixed to mono and run through effects.
let importedName = '';
$('importAudio').onchange = async () => {
  const f = $('importAudio').files[0]; if (!f) return;
  try {
    status('Reading ' + f.name + '…');
    const buf = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await f.arrayBuffer());
    const mono = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / buf.numberOfChannels; }
    imported = { samples: mono, rate: buf.sampleRate }; importedName = f.name + f.size;
    $('importInfo').textContent = `Using ${f.name} (${buf.duration.toFixed(1)} s). ▶ and ⬇ WAV now process this file.`;
    status('Imported ' + f.name + '.');
  } catch (e) { status('Could not read that file: ' + e.message); }
};
$('importClear').onclick = () => {
  imported = null; importedName = ''; $('importAudio').value = '';
  $('importInfo').textContent = 'No file chosen: ▶ speaks live.';
};
$('nextMelody').onclick = () => { seed++; showTune(); };
$('prevMelody').onclick = () => { seed = Math.max(1, seed - 1); showTune(); };
for (const id of ['text', 'key', 'style', 'octave', 'harmony']) $(id).addEventListener('input', showTune);
$('c_melisma').addEventListener('input', showTune);
setSettings(BUILTIN['Kraftwerk']);
refreshPresetList('b:Kraftwerk');

$('preview').onclick = () => {
  // iPhone voice, live: must start inside the tap, so no waiting first.
  if (mode === 'system' && !imported) {
    const text = $('text').value.trim();
    if (!text) { status('Type a verse first.'); return; }
    speakSystem(text, getSettings()); status('Speaking with ' + ($('sysVoice').selectedOptions[0]?.text || 'the default voice') + '…');
    return;
  }
  unlockAudio(); busy($('preview'), async () => {
  const buf = await currentBuffer();
  try { await playBuffer(buf); }
  catch (e) { status('The browser blocked playback. Tap Preview again.'); }
}); };

$('stop').onclick = () => { player.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); };

$('download').onclick = () => busy($('download'), async () => {
  const buf = await currentBuffer();
  downloadBlob(toWav(buf), safeName($('filename').value) + '.wav');
});

// Share sheet (iPhone): lets you send the WAV straight to Files or another app.
const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.wav', { type: 'audio/wav' })] }));
$('share').hidden = !canShareFiles;
$('share').onclick = () => busy($('share'), async () => {
  const buf = await currentBuffer();
  const file = new File([toWav(buf)], safeName($('filename').value) + '.wav', { type: 'audio/wav' });
  await navigator.share({ files: [file] });
});

// Choosing a preset loads it straight away.
$('presetList').onchange = () => {
  const [kind, name] = [$('presetList').value.slice(0, 1), $('presetList').value.slice(2)];
  setSettings(kind === 'b' ? BUILTIN[name] : userPresets()[name]);
  setEdited(false);
  status('Preset: ' + name + '. Tap ▶ to hear it.');
};
// After any change, show that the settings differ from the preset.
function setEdited(on) { $('edited').hidden = !on; }
document.querySelector('main').addEventListener('input', e => {
  if (!['text', 'filename', 'batch', 'presetList'].includes(e.target.id)) setEdited(true);
  summarize();
  if (/^c_(pitch|pitchRange)$/.test(e.target.id)) showTune();
});
// One-line summaries on the folded panels, so you can see settings without opening them.
function summarize() {
  const g = getSettings(), vName = $('variant').selectedOptions[0]?.text || '';
  $('melodySum').textContent = `${g.key} · ${STYLES[g.style]?.label || ''}`;
  $('tempoSum').textContent = `${g.bpm} BPM` + (g.wobbleDepth ? ' · wobble' : '') + (g.gateDepth ? ' · gate' : '');
  $('voiceSum').textContent = vName;
  $('fxSum').textContent = `robot ${Math.round(g.robot * 100)}%`;
}
$('presetSave').onclick = () => {
  const name = prompt('Preset name:'); if (!name) return;
  const p = userPresets(); p[name] = getSettings(); saveUserPresets(p);
  refreshPresetList('u:' + name); setEdited(false); status('Saved preset: ' + name);
};
$('presetDelete').onclick = () => {
  const v = $('presetList').value;
  if (!v.startsWith('u:')) { status('Built-in presets cannot be deleted.'); return; }
  const p = userPresets(); delete p[v.slice(2)]; saveUserPresets(p); refreshPresetList();
};

$('batchGo').onclick = () => busy($('batchGo'), async () => {
  const lines = $('batch').value.split('\n').map(l => l.trim()).filter(Boolean);
  const settings = getSettings();
  const zip = new JSZip(); const used = new Set();
  for (let i = 0; i < lines.length; i++) {
    let [name, ...rest] = lines[i].split('|');
    let text = rest.join('|').trim();
    if (!text) { text = name.trim(); name = 'clip-' + (i + 1); }  // line without "|"
    let file = safeName(name), n = 2;
    while (used.has(file)) file = safeName(name) + '-' + n++;
    used.add(file);
    $('batchStatus').textContent = `Rendering ${i + 1} of ${lines.length}: ${file}`;
    zip.file(file + '.wav', toWav(await renderText(text, settings)));
  }
  $('batchStatus').textContent = 'Zipping…';
  downloadBlob(await zip.generateAsync({ type: 'blob' }), 'vox-machina-batch.zip');
  $('batchStatus').textContent = `Done: ${lines.length} clips.`;
});

// Start downloading the 18 MB voice engine right away.
preload().then(() => status('Ready.'), e => status('Could not load voice engine: ' + e.message));

// Offline support: cache every file after the first visit.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
