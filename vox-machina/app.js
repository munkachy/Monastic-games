// Vox Machina user interface: controls, presets, preview, download, batch.
import { preload, speak, render, toWav } from './engine.js';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// Controls. Each slider is described once here; the page is built from this.
// key: settings field, box: which panel, min/max/step, fmt: how to show it.
// ---------------------------------------------------------------------------
const SLIDERS = [
  { key: 'robot', box: 'robotBox', label: 'ROBOT AMOUNT', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  { key: 'pitch', box: 'voiceBox', label: 'Pitch', min: 0, max: 99, step: 1 },
  { key: 'pitchRange', box: 'voiceBox', label: 'Pitch range (0 = monotone)', min: 0, max: 99, step: 1 },
  { key: 'speed', box: 'voiceBox', label: 'Speed (words/min)', min: 80, max: 400, step: 5 },
  { key: 'wordGap', box: 'voiceBox', label: 'Word gap', min: 0, max: 40, step: 1, fmt: v => v * 10 + ' ms' },
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
  voice: 'en-us', variant: '', pitch: 50, pitchRange: 50, speed: 160, wordGap: 0,
  robot: 0.6, bits: 10, crushRate: 2, ringFreq: 60, ringMix: 0.3,
  choirMix: 0, choirVoices: 3, delayTime: 0.25, delayFeedback: 0.3, delayMix: 0.1,
  reverbSize: 1.5, reverbMix: 0.2,
};
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
}
function showValue(s) {
  const v = +$('c_' + s.key).value;
  $('o_' + s.key).textContent = s.fmt ? s.fmt(v) : v;
}
function getSettings() {
  const o = { voice: $('voice').value, variant: $('variant').value };
  for (const s of SLIDERS) o[s.key] = +$('c_' + s.key).value;
  return o;
}
function setSettings(p) {
  const o = { ...DEFAULTS, ...p };
  $('voice').value = o.voice; $('variant').value = o.variant;
  for (const s of SLIDERS) { $('c_' + s.key).value = o[s.key]; showValue(s); }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
async function renderText(text, settings) {
  const voice = await speak(text, settings);
  return render(voice, settings);
}

// One AudioContext for previews. iOS only allows sound if it is created or
// resumed during a tap, so we do that first thing in the click handler.
let playCtx = null, playing = null;
function unlockAudio() {
  if (!playCtx) playCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (playCtx.state !== 'running') playCtx.resume();
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
  const key = JSON.stringify([text, settings]);
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
setSettings(BUILTIN['Kraftwerk']);
refreshPresetList('b:Kraftwerk');

$('preview').onclick = () => { unlockAudio(); busy($('preview'), async () => {
  const buf = await currentBuffer();
  if (playing) try { playing.stop(); } catch {}
  playing = playCtx.createBufferSource();
  playing.buffer = buf; playing.connect(playCtx.destination); playing.start();
}); };

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

$('presetLoad').onclick = () => {
  const [kind, name] = [$('presetList').value.slice(0, 1), $('presetList').value.slice(2)];
  setSettings(kind === 'b' ? BUILTIN[name] : userPresets()[name]);
  status('Loaded preset: ' + name);
};
$('presetSave').onclick = () => {
  const name = prompt('Preset name:'); if (!name) return;
  const p = userPresets(); p[name] = getSettings(); saveUserPresets(p);
  refreshPresetList('u:' + name); status('Saved preset: ' + name);
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
