// Pocket Sampler: a 16-key sampler and step sequencer in the manner of a
// pocket drum machine. Sounds 1-8 are melodic, 9-16 are kits and chops.
// State is saved in IndexedDB, so recordings and patterns survive a reload.
// Bump ?v= on app.js (index.html), audio.js (here) and the front-page link
// with each release, so phones fetch the new files instead of cached ones.
import * as DZ from './design.js?v=20261023zs';
const BUILD = new URL(import.meta.url).searchParams.get('v') || 'dev';      // this build, as the page loaded it
import { Engine, setSpace, playNote, distortion, stretchLimit, makeKit, blessMe, prepare, onsets, keySemis, findKey, toKey, syllables, stretchLoop, loopStretch, SCALES, FAMILIES, WOBBLE_RATES, SR } from './audio.js?v=20261023zs';

const $ = id => document.getElementById(id);
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const capture = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
// Where a finger is along an element's own width (0-1), whichever way the screen is turned
// (held upright, the Pads and the Loops are turned a quarter turn: the width then runs down the glass).
function along(el, ev) {
  const rc = el.getBoundingClientRect(), w = el.offsetWidth, turned = Math.abs(rc.height - w) < Math.abs(rc.width - w);
  return Math.min(1, Math.max(0, turned ? (ev.clientY - rc.top) / rc.height : (ev.clientX - rc.left) / rc.width));
}
// The audio engine. It can be thrown away and built again (rebuildAudio) if
// the phone leaves it stuck; recorded sound lives in AudioBuffers, which don't
// belong to any one engine, so nothing is lost.
let ctx, eng, engReady, scope;
// The Light engine, for older iPads: a bigger audio buffer (the phone has longer to make each
// moment of sound, so it doesn't break up: a little more delay), a lower rate inside (less work
// for every sound, a third less memory for them), a shorter reverb, fewer notes at once, loops
// made ready only when tapped, and less drawing. Menu › Buttons › Sound engine.
const LIGHT = (() => { try { return localStorage.getItem('pocketEngine') === 'light'; } catch (e) { return false; } })();
stretchLimit.n = LIGHT ? 16 : 40;
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  try { ctx = new AC(LIGHT ? { latencyHint: 'playback', sampleRate: 32000 } : { latencyHint: 'interactive' }); }
  catch (e) { ctx = new AC({ latencyHint: LIGHT ? 'playback' : 'interactive' }); }
  eng = new Engine(ctx, { light: LIGHT });
  engReady = eng.init();
  scope = ctx.createAnalyser(); scope.fftSize = 1024; eng.master.connect(scope);
  ctx.addEventListener?.('statechange', onAudioState);
}
makeAudio();

// ---------------------------------------------------------------------------
// Log (Help > Log tab): what the sound is doing, to find out why it fails on
// a phone. Always: errors, the audio's state and why it changed, the phone's
// audio set-up, glitches (the audio clock falling behind the real clock means
// the phone dropped sound) and the beat engine waking late. Verbose adds every
// note and tap.
// ---------------------------------------------------------------------------
const LOG = [], t0 = performance.now();
let verbose = false, logDrawn = false;
function log(kind, msg) {
  LOG.push(`${((performance.now() - t0) / 1000).toFixed(2).padStart(7)}s ${kind.padEnd(6)} ${msg}`);
  if (LOG.length > 800) LOG.splice(0, LOG.length - 800);
  if (!logDrawn) { logDrawn = true; requestAnimationFrame(drawLog); }
}
function drawLog() {
  logDrawn = false;
  const v = document.getElementById('logView');
  if (v && v.offsetParent) { v.textContent = LOG.join('\n'); v.scrollTop = v.scrollHeight; }
}
addEventListener('error', e => log('error', `${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
addEventListener('unhandledrejection', e => log('error', 'promise: ' + (e.reason?.message || e.reason)));
log('start', `${document.querySelector('.brand span')?.textContent || 'build ?'}; ${navigator.userAgent}`);
log('audio', `sample rate ${ctx.sampleRate} Hz, base latency ${((ctx.baseLatency || 0) * 1000).toFixed(1)} ms, state ${ctx.state}`);

// (Setting navigator.audioSession.type = 'playback' made an iPhone interrupt
// the sound at once and keep taking it away, so the page leaves it alone.)
log('audio', `audio session: ${navigator.audioSession ? navigator.audioSession.type : 'none'}`);
// Every tap: make sure the sound is running. If the phone has left the engine
// stuck (it won't resume, or its clock has stopped), build a fresh one: that
// has to happen in a tap for an iPhone to allow it.
let resuming = false, stuck = '';
function wake(why) {
  if (stuck) { rebuildAudio(stuck); return; }
  if (ctx.state === 'running' || resuming) return;
  const was = ctx.state; resuming = true;
  ctx.resume().then(() => {
    resuming = false;
    log('wake', `${why}: ${was} -> ${ctx.state}`);
    if (ctx.state !== 'running') { stuck = `would not resume (${ctx.state})`; status('The sound is stuck. Tap a key to restart it.'); }
  }, e => { resuming = false; log('error', `resume (${why}): ${e.message}`); stuck = 'resume failed'; });
}
function rebuildAudio(why) {
  log('rebuild', `rebuilt the sound engine: ${why}`);
  stuck = ''; resuming = false;
  for (const f of [...activeFx]) releaseFx(f);
  looping.clear(); for (const k in holding) delete holding[k]; stopGrid(true);
  const old = ctx;
  try { old.removeEventListener?.('statechange', onAudioState); old.close(); } catch (e) {}
  makeAudio(); setVolume(); ctx.resume();
  clockA = ctx.currentTime; clockW = performance.now(); frozen = 0;
  if (playing) { uiQueue.length = 0; nextT = ctx.currentTime + 0.06; }
  status('The sound engine was stuck, so it was restarted.');
}
function onAudioState() {
  log('state', `${ctx.state}${document.hidden ? ' (page hidden)' : ''}`);
  if (ctx.state === 'interrupted' && playing) status('The phone paused the sound. Tap any key to bring it back.');
}
const b64f = f => { const b = new Uint8Array(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength)); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
window.pocketDebug = { rebuildAudio, load: id => loadLibrary(id), ids: () => Object.keys(LIBRARY), captureMedia: f => captureMedia(f).then(b => b.duration),
  step: (p, k) => S.patterns[p][k],
  // what a bug report needs: the log, and the state in short (no audio)
  report: () => ({ build: document.querySelector('.brand span')?.textContent, log: LOG.slice(-600).join('\n'),
    state: { cur: S.cur, pat: S.pat, chain: S.chain, mode: S.mode, write: S.write, replace: S.replace, bpm: S.bpm, swing: S.swing, scale: S.scale, root: S.root,
      playing, slots: S.slots.map((sl, i) => sl && { i: i + 1, name: sl.name, kind: sl.kind, factory: sl.factory, params: sl.params, slices: sl.slices?.length,
        names: sl.slices?.slice(0, 64).map(x => x.name) }),
      patterns: S.patterns.map(p => p.map(st => st.map(n => `${n.s + 1}:${n.k + 1}${n.oc ? 'o' + n.oc : ''}${n.o ? '~' + n.o : ''}`).join(' '))),
      patKeys: S.patKeys, oct: S.oct, fx: S.fx, custom: S.custom } }),
  spell, syl: async (t, cut) => { const { buf, syl } = await voiceSyllables(t, cut); return { dur: buf.duration, syl: syl.map(x => [x.name, +x.s.toFixed(3), +x.e.toFixed(3), x.stress, x.punct]) }; },
  places: (n, flow, seed) => { const syl = Array.from({ length: n }, (_, i) => ({ first: i % 3 === 0, stress: i % 3 === 1 ? 2 : 0, punct: i === 5 ? '.' : '' })); return flowPlaces(syl, flow, false, seed); },
  slot: () => { const sl = S.slots[S.cur]; return { kind: sl.kind, slices: sl.slices?.map(x => x.name) }; },
  loops: () => [...eng.voices].filter(v => v.end === Infinity).length,
  key: () => ({ root: S.root, scale: S.scale, next: keyNext && { ...keyNext }, patKeys: [...S.patKeys], playing, time: ctx.currentTime, bar: 16 * stepDur() }) };   // for testing the restart from the browser console
addEventListener('pointerdown', () => wake('tap'), true);
addEventListener('keydown', () => wake('key'), true);
document.addEventListener('visibilitychange', () => { log('page', document.hidden ? 'hidden' : 'shown'); if (!document.hidden) wake('page shown'); });
// Once a second: did the audio clock keep up with the real clock?
let clockA = ctx.currentTime, clockW = performance.now(), outLat = -1, frozen = 0, glitches = [], lightSaid = false;
setInterval(() => {
  const a = ctx.currentTime, w = performance.now(), dA = a - clockA, dW = (w - clockW) / 1000;
  if (ctx.state === 'running' && dW > 0.3) {
    if (dA < dW - 0.03) {
      log('glitch', `audio clock fell ${((dW - dA) * 1000).toFixed(0)} ms behind in ${dW.toFixed(1)} s (the phone dropped sound)`);
      // the sound breaking up again and again while playing: say what can help, once
      if (playing && !LIGHT) glitches.push(w);
      while (glitches.length && w - glitches[0] > 30000) glitches.shift();
      if (glitches.length >= 4 && !lightSaid) { lightSaid = true; status('The sound is breaking up: this device is working hard. Menu › Buttons › Sound engine › Light can help.'); }
    }
    // "running" but the clock hasn't moved for two seconds: the engine is dead
    frozen = dA < 0.01 && !document.hidden ? frozen + 1 : 0;
    if (frozen === 2 && !stuck) { stuck = 'its clock stopped'; log('stuck', 'the audio clock has stopped; the next tap restarts the engine'); status('The sound is stuck. Tap a key to restart it.'); }
    if (dW > 1.6) log('stall', `the page was frozen for ${((dW - 1) * 1000).toFixed(0)} ms`);
  }
  const ol = Math.round((ctx.outputLatency || 0) * 1000);
  if (ol !== outLat) { outLat = ol; log('audio', `output latency ${ol} ms`); }
  clockA = a; clockW = w;
}, 1000);

// ---------------------------------------------------------------------------
// The built-in sounds
// ---------------------------------------------------------------------------
// Every built-in sound, by id. DEFAULT is what sits on keys 1-16 at first;
// "Load sound" in the Sound tab puts any of them on any key.
const LIBRARY = {
  bass808: { name: '808 Bass', synth: { type: 'sub', root: 36, drive: 2.5 }, len: 0.4 },
  wobble: { name: 'Wobble', synth: { type: 'wobble', root: 36, cutoff: 160, res: 10, depth: 1700, rate: 2, hold: true, drive: 2 }, len: 0.38 },
  reese: { name: 'Reese', synth: { type: 'reese', root: 36, cutoff: 650, res: 2, hold: true, drive: 1.5 }, len: 0.3 },
  acid: { name: 'Acid', synth: { type: 'acid', root: 48, cutoff: 280, res: 16, drive: 2 }, len: 0.12 },
  chip: { name: 'Chip lead', synth: { type: 'chip', root: 60 }, len: 0.1 },
  pluck: { name: 'Pluck', synth: { type: 'pluck', root: 60, cutoff: 700, res: 3 }, len: 0.15 },
  organ: { name: 'Organ', synth: { type: 'organ', root: 48, attack: 0.03, hold: true }, len: 0.3 },
  choir: { name: 'Choir', synth: { type: 'choir', root: 48, attack: 0.12, hold: true }, len: 0.5 },
  subsine: { name: 'Sub Bass', synth: { type: 'sub', root: 36 }, len: 0.5 },
  sqbass: { name: 'Square Bass', synth: { type: 'sqbass', root: 36, cutoff: 380, res: 4, drive: 1.5 }, len: 0.25 },
  sawbass: { name: 'Analog Bass', synth: { type: 'sawbass', root: 36, cutoff: 220, res: 9, drive: 1.5 }, len: 0.22 },
  fmbass: { name: 'FM Bass', synth: { type: 'fm', root: 36, ratio: 1, index: 3, idecay: 0.12, floor: 0.3, drive: 1.5 }, len: 0.3 },
  growl: { name: 'Growl', synth: { type: 'wobble', root: 36, cutoff: 120, res: 14, depth: 2600, rate: 4, hold: true, drive: 3 }, len: 0.38 },
  uprightbass: { name: 'Upright Bass', multi: 'uprightbass', base: 36 }, elecbass: { name: 'Electric Bass', multi: 'elecbass', base: 36 },
  piano: { name: 'Grand Piano', multi: 'piano', base: 48 }, upright: { name: 'Upright Piano', multi: 'upright', base: 48 },
  epiano: { name: 'FM E-Piano', multi: 'epiano', base: 48 }, harpsichord: { name: 'Harpsichord', multi: 'harpsichord', base: 48 },
  pipeorgan: { name: 'Pipe Organ', multi: 'pipeorgan', base: 48 }, renorgan: { name: 'Renaissance Organ', multi: 'renorgan', base: 48 },
  vibes: { name: 'Vibraphone', multi: 'vibes', base: 60 }, marimba: { name: 'Marimba', multi: 'marimba', base: 60 },
  kalimba: { name: 'Kalimba', multi: 'kalimba', base: 60 }, bells: { name: 'Tubular Bells', multi: 'bells', base: 60 },
  harp: { name: 'Harp', multi: 'harp', base: 48 }, glock: { name: 'Glockenspiel', multi: 'glock', base: 72 },
  // Build 4: strings, guitars, horns, voices (sampled), and guitars and a steel pan modelled where no free recordings were
  violin: { name: 'Violin', multi: 'violin', base: 60 }, viola: { name: 'Viola', multi: 'viola', base: 48 },
  cello: { name: 'Cello', multi: 'cello', base: 36 }, contrabass: { name: 'Double Bass', multi: 'contrabass', base: 36 },
  pizz: { name: 'Pizzicato Cello', multi: 'pizz', base: 36 },
  gretsch: { name: 'Gretsch Guitar', multi: 'gretsch', base: 48 }, hofner: { name: 'Hofner Guitar', multi: 'hofner', base: 48 },
  emily: { name: 'Electric Guitar', multi: 'emily', base: 48 }, nylon: { name: 'Nylon Guitar', multi: 'nylon', base: 48 },
  steelgtr: { name: 'Acoustic Guitar', multi: 'steelgtr', base: 48 }, twelve: { name: '12-String Guitar', multi: 'twelve', base: 48 },
  rhodes: { name: 'Rhodes', multi: 'rhodes', base: 48 }, celeste: { name: 'Celeste', multi: 'celeste', base: 72 },
  trumpet: { name: 'Trumpet Stab', multi: 'trumpet', base: 60 }, trombone: { name: 'Trombone Stab', multi: 'trombone', base: 48 },
  tenorsax: { name: 'Tenor Sax', multi: 'tenorsax', base: 48 },
  choirmen: { name: 'Choir (men)', multi: 'choirmen', base: 48 }, choirwomen: { name: 'Choir (women)', multi: 'choirwomen', base: 60 },
  xylophone: { name: 'Xylophone', multi: 'xylophone', base: 72 }, steeldrum: { name: 'Steel Drum', multi: 'steeldrum', base: 60 },
  supersaw: { name: 'Supersaw', synth: { type: 'supersaw', root: 60, cutoff: 6000, res: 1, hold: true }, len: 0.3 },
  strings: { name: 'Strings', synth: { type: 'strings', root: 48, cutoff: 2600, attack: 0.25, hold: true }, len: 0.6 },
  pad: { name: 'Warm Pad', synth: { type: 'strings', root: 48, cutoff: 1100, attack: 0.6, hold: true }, len: 0.9 },
  brass: { name: 'Brass', synth: { type: 'brass', root: 48, cutoff: 700, res: 1, attack: 0.03, hold: true }, len: 0.35 },
  fmbell: { name: 'FM Bell', synth: { type: 'fm', root: 60, ratio: 3.5, index: 4, idecay: 0.5 }, len: 0.8 },
  glass: { name: 'Glass Keys', synth: { type: 'fm', root: 48, ratio: 1, index: 1.6, idecay: 0.35 }, len: 0.6 },
  acoustic: { name: 'Acoustic Kit', bank: 'acoustic' }, percussion: { name: 'Percussion', bank: 'percussion' },
  gogodze: { name: 'Gogodze Kit', bank: 'gogodze' }, gogodzelofi: { name: 'Lo-fi Kit', bank: 'gogodzelofi' },
  bigrusty: { name: 'Big Rusty Kit', bank: 'bigrusty' }, swirly: { name: 'Brush Kit', bank: 'swirly' },
  kit808: { name: '808 Kit', kit: '808' }, kit909: { name: '909 Kit', kit: '909' },
  kitcr78: { name: 'CR-78 Kit', kit: 'cr78' }, kit606: { name: '606 Kit', kit: '606' }, kitminimal: { name: 'Minimal Kit', kit: 'minimal' },
  hits: { name: '8-bit Hits', bank: 'hits' }, blips: { name: 'Blips', bank: 'blips' }, lasers: { name: 'Lasers', bank: 'lasers' },
  glitch: { name: 'Glitch', bank: 'glitch' }, coins: { name: 'Coins', bank: 'coins' }, robots: { name: 'Robots', bank: 'robots' },
  // Build 4 packs: 16 hits each (some fewer)
  tr808: { name: 'TR-808 (sampled)', bank: 'tr808' }, electro: { name: 'Electro Kit', bank: 'electro' },
  drumtraks: { name: 'Drumtraks Kit', bank: 'drumtraks' }, boombap: { name: 'Boom Bap Kit', bank: 'boombap' },
  bells2: { name: 'Bells', bank: 'bells2' }, shakers: { name: 'Tambourine & Shakers', bank: 'shakers' },
  hype: { name: 'Hype Words (robot)', bank: 'hype' }, robotvox: { name: 'Robot Voices', bank: 'robotvox' }, vocchops: { name: 'Vocal Chops', bank: 'vocchops' },
  nature: { name: 'Nature', bank: 'nature' }, airwater: { name: 'Air & Water', bank: 'airwater' },
  arcade: { name: 'Arcade FX', bank: 'arcade' }, machines: { name: 'Machines', bank: 'machines' },
  noisefx: { name: 'Noise & Risers', bank: 'noisefx' }, sirens: { name: 'Sirens', bank: 'sirens' },
  stabs: { name: 'Synth Stabs', bank: 'stabs' }, basshits: { name: 'Bass Hits', bank: 'basshits' },
  pads: { name: 'Pads', bank: 'pads' }, funkhorns: { name: 'Funk Horns', bank: 'funkhorns' },
  // loops: each key a loop, in Loop mode; drum loops and breaks keep time with the beat
  drumloops: { name: 'Drum Loops', bank: 'drumloops' }, breaks: { name: 'Breakbeats', bank: 'breaks' },
  grooves: { name: 'Human Grooves', bank: 'grooves' },       // played by drummers (the Groove MIDI Dataset, tools/grooves.py), on the acoustic kit
  ambience: { name: 'Records & Ambience', bank: 'ambience' },      // old records (Edison's discs and cylinders, tools/records.py), rain, wind, the sea...
  // The Electro Boom Bap loop set (tools/loopset.py): F minor, 92 BPM; a bank for each Loops column.
  // Its drums (tools/drumlab.py): a kit made with Mutable Instruments Plaits' drum engines, and
  // kick, snare and tops loops of it, a part each, so any three go together.
  ebbkloops: { name: 'EBB Kick loops', bank: 'ebbkloops' }, ebbsloops: { name: 'EBB Snare loops', bank: 'ebbsloops' },
  ebbtloops: { name: 'EBB Tops loops', bank: 'ebbtloops' }, ebbkit: { name: 'EBB Kit', bank: 'ebbkit' },
  // Vigils (tools/vigils.py, drumlab.py): G minor, 144 BPM, broken beats; night electronica, with
  // words of the Rule of St Benedict
  vigkloops: { name: 'Vigils Kick loops', bank: 'vigkloops' }, vigsloops: { name: 'Vigils Snare loops', bank: 'vigsloops' },
  vigtloops: { name: 'Vigils Tops loops', bank: 'vigtloops' }, vigkit: { name: 'Vigils Kit', bank: 'vigkit' },
  vigbass: { name: 'Vigils Bass', bank: 'vigbass' }, vigchords: { name: 'Vigils Chords', bank: 'vigchords' }, viglead: { name: 'Vigils Lead', bank: 'viglead' },
  vigsub: { name: 'Vigils Sub', bank: 'vigsub' }, vigvox: { name: 'Vigils Vox', bank: 'vigvox' },
  // Vigils' own instruments, made with Mutable Instruments Plaits' engines (tools/plaitsinst.py) and played from recordings
  vigstrings: { name: 'Vigil Strings', multi: 'vigstrings', base: 48 }, vigswarm: { name: 'Night Swarm', multi: 'vigswarm', base: 48 },
  vigchant: { name: 'Chant', multi: 'vigchant', base: 48 }, vigcloister: { name: 'Cloister Bass', multi: 'vigcloister', base: 36 },
  vighowl: { name: 'Howl', multi: 'vighowl', base: 60 }, viglauds: { name: 'Lauds Pluck', multi: 'viglauds', base: 60 },
  vigbell: { name: 'Compline Bell', multi: 'vigbell', base: 60 }, vigglass: { name: 'Night Glass', multi: 'vigglass', base: 60 },
  ebbbass: { name: 'EBB Bass', bank: 'ebbbass' }, ebbchords: { name: 'EBB Chords', bank: 'ebbchords' }, ebblead: { name: 'EBB Lead', bank: 'ebblead' },
  ebbsub: { name: 'EBB Sub', bank: 'ebbsub' }, ebbvox: { name: 'EBB Vox & Keys', bank: 'ebbvox' },
};
// drum loops, beat sliced to the tempo: whole beats (the Beats folder), and the parts of one (kicks, snares, tops)
const BEAT_PACKS = new Set(['ebbkloops', 'ebbsloops', 'ebbtloops', 'vigkloops', 'vigsloops', 'vigtloops', 'grooves', 'drumloops', 'breaks']);
const EBB = ['ebbkloops', 'ebbsloops', 'ebbtloops', 'ebbbass', 'ebbchords', 'ebblead', 'ebbsub', 'ebbvox', 'ebbkit'];
const VIG = ['vigkloops', 'vigsloops', 'vigtloops', 'vigbass', 'vigchords', 'viglead', 'vigsub', 'vigvox', 'vigkit'];
// The reverb: a real space, recorded (tools/reverbs.py), for every effect that rings (the FX keys,
// a sound's own effect, a Loops column's): [id, name, about, credit]. Chosen in Menu › Effects.
const SPACES = [
  ['stalbans', 'Lady Chapel, St Albans Cathedral', 'a stone chapel, about 3 seconds', 'OpenAIR, University of York (CC BY 4.0)'],
  ['ely', 'Lady Chapel, Ely Cathedral', 'a large stone chapel, long and soft', 'L. Alvarez-Morales, M. Lopez, A. Alvarez-Corbacho, P. Bustamante (Zenodo; CC BY 4.0, kept as CC BY-NC-SA 4.0)'],
  ['aachen', 'St. Nicholas Chapel, Aachen Cathedral', 'a late-Gothic chapel, about 4½ seconds', 'M. Zerwas and S. Kayku (Zenodo; CC BY 4.0)'],
  ['cremona', 'A church in Cremona', 'an Italian church, warm', 'R. Giampiccolo, S. Parrinelli, F. Antonacci, ChurchIR (Zenodo; CC BY 4.0)'],
  ['stairwell', 'A stairwell', 'hard walls, bright and short', 'T. McKenzie, S. Schlecht, V. Pulkki, Aalto University (Zenodo; CC BY 4.0)'],
  ['room', 'A meeting room', 'a small room, close', 'T. McKenzie, S. Schlecht, V. Pulkki, Aalto University (Zenodo; CC BY 4.0)'],
];
const spaceNow = () => { try { const v = localStorage.getItem('pocketSpace'); return SPACES.some(x => x[0] === v) ? v : 'stalbans'; } catch (e) { return 'stalbans'; } };
async function loadSpace(id = spaceNow()) {
  try {
    const b = await decode(await (await fetch(`sounds/reverbs/${id}.wav`)).arrayBuffer());
    setSpace([b.getChannelData(0), b.getChannelData(b.numberOfChannels > 1 ? 1 : 0)], b.sampleRate);
    eng?.setSpace();
  } catch (e) { log('error', 'reverb: ' + e.message); }
}
for (const [id, name, about] of SPACES) { $('spaceSel').add(new Option(`${name}: ${about}`, id)); $('lmSpace').add(new Option(name, id)); }
$('spaceSel').value = $('lmSpace').value = spaceNow();
const spaceCredit = () => { const x = SPACES.find(x => x[0] === $('spaceSel').value); $('spaceNote').textContent = `A recording of a real space: ${x[1]}. Recorded by ${x[3]}. Every reverb uses it: the FX keys, a sound's own effect, a Loops column's.`; };
spaceCredit();
// the same choice in Menu › Effects and in a Loops cell's EQ & Effect: one reverb for the whole song
async function chooseSpace(id, quiet = false) {
  try { localStorage.setItem('pocketSpace', id); } catch (e) {}
  $('spaceSel').value = $('lmSpace').value = id;
  spaceCredit(); await loadSpace(id);
  if (!quiet) status(`Reverb: ${SPACES.find(x => x[0] === id)[1]}, for every reverb in the song.`);
}
$('spaceSel').addEventListener('change', () => chooseSpace($('spaceSel').value));
$('lmSpace').addEventListener('change', () => chooseSpace($('lmSpace').value));
loadSpace();
// Sounds 1-8 are instruments, one part each (its colour); 9-16 are drums.
const DEFAULT = ['bass808', 'subsine', 'rhodes', 'chip', 'choir', 'pad', 'pluck', 'brass',
  'acoustic', 'boombap', 'kit808', 'kit909', 'tr808', 'electro', 'percussion', 'shakers'];
const PART = ['Bass', 'Sub', 'Chords', 'Lead', 'Vox/Keys', 'Pad', 'Pluck/Arp', 'Stab/FX', 'Drums', 'Drums', 'Drums', 'Drums', 'Drums', 'Drums', 'Drums', 'Drums'];
// The first version saved sounds by number, in this order.
const OLD_ORDER = ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir',
  'kit808', 'kit909', 'hits', 'blips', 'lasers', 'glitch', 'coins', 'robots'];
// A sound starts at 20% (it was 80%: too loud to begin with, and the mix crowded the limiter).
const defParams = () => ({ vol: 0.2, pitch: 0, filter: 0, res: 0, start: 0, len: 1, choke: false, trig: 'oneshot' });
let banks = null;

async function factorySlot(id) {
  const F = LIBRARY[id], slot = { factory: id, name: F.name, params: defParams() };
  // The synths and the kits made in code are played from recordings of them (tools/bake_sounds.js):
  // a recording costs the phone far less than making the sound again for every note.
  if (F.synth) { await multiSlot(slot, { multi: id, base: F.synth.root }); slot.params.baked = 1; return slot; }
  else if (F.multi) return multiSlot(slot, F);
  else {
    if (!banks) banks = await (await fetch('sounds/banks.json')).json();
    const bank = F.bank || id, B = banks[bank];
    B.buf ||= await decode(await (await fetch(`sounds/${bank}.wav`)).arrayBuffer());
    const r = B.rate || 22050;
    Object.assign(slot, { kind: 'chop', buf: B.buf, slices: B.slices.map(([a, b], k) => ({ s: a / r, e: b / r, name: shortName(B.from[k]),
      ...(B.loops?.[k] && { bpm: B.loops[k][0], bars: B.loops[k][1] }) })) });
    if (B.loops) slot.params.trig = 'loop';          // a pack of loops: each key loops until tapped again
    if (BEAT_PACKS.has(bank)) slot.drumLoop = true;   // drum loops: beat sliced to the tempo, not stretched
  }
  return slot;
}
// A sampled instrument: one recording every few notes; each key plays the nearest.
async function bankOf(id) {
  if (!banks) banks = await (await fetch('sounds/banks.json')).json();
  const B = banks[id];
  B.buf ||= await decode(await (await fetch(`sounds/${id}.wav`)).arrayBuffer());
  return B;
}
async function multiSlot(slot, F) {
  const B = await bankOf(F.multi), r = B.rate;
  // la, lb: a loop for a held note; ha, hb: a held take of its own (a recorded synth whose note dies away)
  return Object.assign(slot, { kind: 'multi', buf: B.buf, base: F.base, ...(B.level && { level: B.level }), ...(B.synth && { holdLoop: true }),
    zones: B.zones.map(([m, a, b, la, lb, ha, hb]) => ({ m, s: a / r, e: b / r, ...(la != null && { ls: la / r, le: lb / r }), ...(ha != null && { hs: ha / r, he: hb / r }) })) });
}
const shortName = s => s.replace(/^sfx_/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18);
function decode(ab) { return new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad)); }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
// The first version's 16 effects, in key order (old saved patterns used these numbers).
const DEFAULT_SLOTS = ['loop4', 'loop8', 'loop16', 'roll32', 'scratch', 'half', 'scramble', 'dive',
  'octup', 'octdown', 'reverse', 'chorus', 'crush', 'lowpass', 'reverb', 'pingpong'];
// Your buttons, a row (sideways) for each kind of thing, in that kind's colour: rhythm, pitch and key, the sound,
// the voice, effects. Upright, the first four sit beside Copy and Undo and the next eight under the keys.
const DEFAULT_CUSTOM_IDS = ['mute', 'beat', 'chain', 'beats',
  'octdown', 'octup', 'key', 'nextkey', 'makeloop', 'edit', 'clear', 'looprec',
  'rap', 'newflow', 'hearrap', 'robot', 'fx:reverb', 'fx:echo', 'fx:lowpass', 'fx:crush'];
const OLD_CUSTOM_IDS = ['mute', 'export', 'roll', 'beat', 'octdown', 'octup', 'key', 'nextkey', 'rap', 'newflow', 'hearrap', 'chain',
  'clear', 'edit', 'beats', 'fx:reverb', 'fx:echo', 'fx:lowpass', 'fx:roll32', 'fx:crush'];   // before the rows had colours
const S = {
  slots: [], cur: 0, lastKey: new Array(16).fill(0), mode: 'play',
  patterns: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [])),
  fx: Array.from({ length: 16 }, () => new Array(16).fill(null)),   // effects saved on steps
  patKeys: new Array(16).fill(null),
  oct: new Array(16).fill(0),          // each sound's octave for the keys you play (−2 to +2); saved with what you record   // a key saved in a pattern ({ root, scale }), or null: it plays in whatever key is set
  custom: [...DEFAULT_CUSTOM_IDS], quiet20: true, pat: 0, chain: [0], bpm: 120, swing: 50, scale: 'minor', root: 0, vol: 0.9, quantGrid: 1, fxTarget: 'all', fxAmt: {}, fxSlots: [...DEFAULT_SLOTS], fxLatch: true, write: false, replace: false,
};
const stepDur = () => 60 / S.bpm / 4;

// ---------------------------------------------------------------------------
// Sequencer: a look-ahead scheduler (setTimeout wakes it often; it books
// every step that falls in the next 120 ms on the audio clock).
// ---------------------------------------------------------------------------
let playing = false, tick = 0, nextT = 0, timer = 0, pendingChain = null, barPat = -1;
let keyNext = null;       // a key change waiting for the next bar: { root, scale, save, at (once booked), pat, auto }
let renderKeys = null;    // while exporting, the key of each bar of the chain
const uiQueue = [];           // [{ t, tick, step, pat }] for the lights
const liveSkip = new Set();   // notes recorded live just before their step comes round
let headTick = -1, headStep = -1, headPat = -1;

function patAt(t) { return S.chain[Math.floor(t / 16) % S.chain.length]; }

function start() {
  if (playing) return;
  ctx.resume(); stopPreview(); stopRapPreview(); warmLoops();
  playing = true; tick = 0; barPat = -1; followPlay = true; nextT = ctx.currentTime + 0.06;
  schedule(); $('play').classList.add('on'); $('play').textContent = '■ Stop';
  if (!$('loops').hidden) drawLoops();
}
function stop() {
  playing = false; clearTimeout(timer); uiQueue.length = 0; headStep = -1; headTick = -1; take = null;
  if (keyNext) { const k = keyNext; keyNext = null; k.auto ? quietKey(k) : applyKey(k); }   // a key change still waiting lands now
  $('play').classList.remove('on'); $('play').textContent = '▶ Play';
  for (const f of [...activeFx]) if (!S.fxLatch || FX[f][1].seq) releaseFx(f);
  for (const [id, h] of looping) { h.voice?.stop(ctx.currentTime); looping.delete(id); }   // every loop stops with the beat
  if (eng.recAudio) { eng.setFx(eng.recAudio, false, stepDur()); eng.recAudio = null; }
  rememberLoops(); stopGrid();                 // and the Loops grid (the loops playing are remembered for Play)
  draw();
}
// Stop remembers the loops playing (or waiting to start), and ▶ Play brings them back on the first bar.
// ↺ Reset (on the Loops) forgets them. Hits played once and Gates are not kept.
function rememberLoops() {
  const keep = [];
  for (const [i, l] of gcol.entries()) {
    const c = Math.floor(i / ROWS), h = l.next || (l.cur?.stopAt == null ? l.cur : null), cell = h && S.grid.cells[c][h.r];
    if (cell && cell.mode !== 'oneshot' && cell.mode !== 'gate') keep.push([c, h.r, h.j0 || 0]);     // j0: where it sat against the bar
  }
  if (keep.length || !S.grid.resume?.length) S.grid.resume = keep;
  persist(); flushSave();          // kept at once, even if the app is closed right after
}
async function resumeLoops() {
  const list = (S.grid.resume || []).filter(([c, r]) => S.grid.cells[c]?.[r]); if (!list.length || !playing) return;
  S.grid.resume = [];
  const slots = await Promise.all(list.map(([c, r]) => cellSlot(S.grid.cells[c][r])));
  await Promise.all(slots.map(sl => sl?.slices[0].bpm ? stretchFor(sl) : null));
  if (!playing) { S.grid.resume = list; return; }
  const b = nextBar();
  // each comes back where it sat against the bar: a loop started off the beat picks up partway, so its
  // own start falls just where it did (a loop lined up with the bar starts on the one)
  list.forEach(([c, r, j0 = 0], i) => { if (!slots[i]) return; const v = launch(c, r, slots[i], { ...b, j0 }); if (v) { const l = lane(c, r); if (l.next) kill(l.next); l.next = v; } });
  drawLoops();
}
let lateLogged = 0;
function schedule() {
  if (nextT < ctx.currentTime - 0.01 && performance.now() - lateLogged > 1000) {
    lateLogged = performance.now(); log('late', `beat engine woke ${((ctx.currentTime - nextT) * 1000).toFixed(0)} ms late: notes in that gap are cut short`);
  }
  while (nextT < ctx.currentTime + 0.12) {
    if (tick % 16 === 0 && pendingChain) {      // a new pattern starts at the top of the bar
      S.chain = pendingChain; pendingChain = null; tick = 0;
    }
    if (tick % 16 === 0) {      // the top of a bar: a key change waiting for it, or the key saved in the pattern starting
      const p = patAt(tick);
      if (keyNext && keyNext.at == null) Object.assign(keyNext, { at: nextT, pat: p });
      else if (!keyNext && p !== barPat && S.patKeys[p] && !sameKey(S.patKeys[p], S)) keyNext = { ...S.patKeys[p], at: nextT, pat: p, auto: true };
      if (keyNext?.at === nextT) gridAtBar(keyNext);      // the Loops grid's keyed loops change key on this bar too
      barPat = p;
    }
    const sw = tick % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0;
    try { playTick(eng, tick, nextT + sw, true); } catch (e) { soundError(e); }   // one bad note never stops the beat
    nextT += stepDur(); tick++;
  }
  timer = setTimeout(schedule, 25);
}
// Show what went wrong (once each), so it can be reported, and carry on.
const errorsSeen = new Set();
function soundError(e) {
  console.error(e); log('error', (e?.stack || String(e)).split('\n').slice(0, 2).join(' | '));
  const msg = String(e?.message || e).slice(0, 120);
  if (errorsSeen.has(msg)) return;
  errorsSeen.add(msg); status('Sound error (the beat carries on): ' + msg);
}

// The effect on tick t: the one held now, or else the one saved on that step.
// A saved effect is its name (all tracks) or { f: name, t: [sounds] }.
const fxIdx = e => (e == null ? null : typeof e === 'string' ? e : e.f);
const fxTo = e => (typeof e === 'string' ? 'all' : new Set(e.t));
const savedFx = t => S.fx[patAt(t)][t % 16];
// Which tick of the pattern to play, and how many times (rolls).
function mapTick(t, held) {
  let f = held ? seqFx : null, anchor = f?.anchor;
  if (!held) {
    const i = fxIdx(savedFx(t));
    if (i != null && FX[i][1].seq) {
      f = FX[i][1]; anchor = t;                // a saved loop starts where its run of steps starts
      while (anchor > 0 && t - anchor < 16 && fxIdx(savedFx(anchor - 1)) === i) anchor--;
      if (f.seq === 'half') anchor++;
    }
  }
  if (!f) return [t, 1];
  const d = t - anchor;
  if (d < 0) return [t, 1];
  switch (f.seq) {
    case 'loop': return [anchor + (d % f.L), f.r || 1];
    case 'half': return d % 2 ? [null, 0] : [anchor + d / 2, 1];
    case 'glitch': return [anchor - (anchor % 16) + ((Math.random() * 16) | 0), Math.random() < 0.3 ? 2 + ((Math.random() * 2) | 0) : 1];
  }
  return [t, 1];
}
function playTick(e, t, when, live) {
  const held = live && activeFx.size > 0;
  if (live && take && (!S.write || !S.replace || t - take.last >= 16)) take = null;
  // Write is on and an effect is held: save it (with its tracks) on this step.
  if (held && S.write) { const to = fxAim.get(lastFx); S.fx[patAt(t)][t % 16] = to === 'all' ? lastFx : { f: lastFx, t: [...to] }; dirty(); }
  // The effects on this step, each with the tracks it is aimed at.
  const sv = savedFx(t);
  const list = held ? [...activeFx].map(k => [k, fxAim.get(k) || 'all']) : sv != null ? [[fxIdx(sv), fxTo(sv)]] : [];
  // Saved audio effects (crush, filter, reverb...) switch on and off on the beat.
  if (!held) {
    const k = list.length && FX[list[0][0]][1].audio ? list[0][0] : null, want = k != null ? FX[k][1].audio : null;
    if (want !== e.recAudio) {
      if (e.recAudio) e.setFx(e.recAudio, false, stepDur(), when);
      if (want) e.setFx(want, true, stepDur(), when, amtOf(k));
      e.recAudio = want;
    }
  }
  // A timing effect (loop, roll, half time, scramble) aimed at some tracks
  // plays them from the mapped step; the others carry on as written.
  const seqK = held ? seqFx?.k : list.length && FX[list[0][0]][1].seq ? list[0][0] : null;
  const seqTo = seqK == null ? 'all' : (held ? fxAim.get(seqK) : list[0][1]) || 'all';
  const [src, r] = mapTick(t, held);
  const groups = seqTo === 'all' ? [[src, r, () => true]]
    : [[src, r, si => seqTo.has(si)], [t, 1, si => !seqTo.has(si)]];
  const shown = seqTo === 'all' ? src ?? t : t;
  if (live) uiQueue.push({ t: when, tick: t, step: shown % 16, pat: patAt(shown) });
  for (const [from, rr, mine] of groups) {
    if (from == null) continue;
    for (const n of S.patterns[patAt(from)][from % 16]) {
      if (!mine(n.s)) continue;
      const only = renderOnly ?? (S.muteBeat ? 'nodrums' : 'all');
      if ((only === 'nodrums' && isDrum(n.s)) || (only === 'drums' && !isDrum(n.s))) continue;
      if (live && liveSkip.delete(`${t}:${n.s}:${n.k}`)) continue;
      if (live && take?.si === n.s && !take.notes.has(n)) continue;     // Replace: the old line is silent
      // A note played off the grid keeps its own place, swing or not.
      const at = n.o ? when - (t % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0) + n.o * stepDur() : when;
      // Gate and Loop sounds play for the note's length: d steps (1 if it has none).
      const hold = isHeld(n.s, n.lock), len = (n.d || 1) * stepDur() / rr, m = modsFor(n.s, list);
      for (let i = 0; i < rr; i++) {
        const v = noteOn(e, n.s, n.k, at + i * stepDur() / rr, m, withOct(n.s, n.lock, n.oc), hold, live ? null : renderKeys?.[Math.floor(from / 16) % renderKeys.length]);
        if (hold) v?.stop(at + i * stepDur() / rr + len);
      }
    }
  }
}
// Drums, for Mute: a kit (a kick, snare or hi-hat in it) or hand drums.
const drumMemo = new WeakMap();
function isDrum(si) {
  const sl = S.slots[si]; if (!sl) return false;
  if (!drumMemo.has(sl)) drumMemo.set(sl, ['kick', 'snare', 'hat', 'conga'].some(r => hasRole(sl, r)));
  return drumMemo.get(sl);
}
// Drums never change with the key: a kit, hand drums, a single drum hit, a drum loop. They play as
// recorded, in any key, while the bass and everything else move.
const DRUM_NAME = /kick|snare|clap|hat\b|hats\b|tom\b|toms\b|crash|ride|cymbal|rim|shaker|conga|bongo|tambourine|cowbell|clave|cabasa|guiro|percussion|drum loop|break|amen/i;
const drumSoundMemo = new WeakMap();
function drumSound(sl) {
  if (!sl) return false;
  if (!drumSoundMemo.has(sl)) drumSoundMemo.set(sl, !!sl.params?.drum || !!sl.drumLoop
    || (sl.kind === 'chop' && ['kick', 'snare', 'hat', 'conga'].some(r => hasRole(sl, r)))
    || (sl.kind === 'sample' && DRUM_NAME.test(sl.name || '')));
  return drumSoundMemo.get(sl);
}
const keyFor = (sl, key) => (drumSound(sl) ? { root: sl.params.keyOf ?? 0, scale: 'minor' } : key);
function noteOn(e, si, k, when, m = null, lock = null, hold = false, key = null, phase = 0) {
  const slot = S.slots[si]; if (!slot) return null;
  key = keyFor(slot, key ?? keyAt(when));
  if (slot.params.robot && lock?.pitch != null) { const { pitch, ...rest } = lock; lock = rest; }    // the Robot pads keep the voice's pitch
  m ??= modsFor(si, [...activeFx].map(k => [k, fxAim.get(k) || 'all']));
  if (e === eng) {
    lastNoteAt = Math.max(lastNoteAt, when);
    if (verbose) log('note', `sound ${si + 1} key ${k + 1}${hold ? ' held' : ''}: starts in ${((when - ctx.currentTime) * 1000).toFixed(0)} ms, ${eng.voices.size} sounding, audio ${ctx.state}`);
  }
  try {
    return playNote(e, slot, si, k, when, { rate: m.rate, reverse: m.reverse, unison: m.unison, scratch: m.scratch, dive: m.dive, fx: !m.dry, lock,
      scale: key.scale, bpm: S.bpm, root: key.root, hold, phase });
  } catch (err) { soundError(err); return null; }
}
const isHeld = (si, lock) => (lock?.trig || S.slots[si]?.params.trig || 'oneshot') !== 'oneshot';

// ---------------------------------------------------------------------------
// The key. The wheel (tap the key on the screen) sets it; while the beat
// plays, a change waits for the top of the next bar. With Write on, the new
// key is saved in the pattern, which then always plays in it; with Write
// off, the key changes for now and the patterns keep the keys saved in them.
// A pattern with no key of its own plays in whatever key is set.
// ---------------------------------------------------------------------------
const MINORISH = new Set(['minor', 'dorian', 'phrygian', 'pentatonic', 'blues']);
const isMinor = sc => MINORISH.has(sc);
const sameKey = (a, b) => a.root === b.root && a.scale === b.scale;
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];      // around the wheel, as the circle of fifths goes
const MAJ_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MIN_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SCALE_SHORT = { minor: 'MIN', major: 'MAJ', dorian: 'DOR', phrygian: 'PHR', pentatonic: 'PENT', blues: 'BLUES', chromatic: 'CHROM' };
const keyName = k => (isMinor(k.scale) ? MIN_NAME : MAJ_NAME)[k.root] + (isMinor(k.scale) ? 'm' : '');
const keyWords = k => `${(isMinor(k.scale) ? MIN_NAME : MAJ_NAME)[k.root]} ${k.scale}`;
// Where a key sits on the wheel: the ring (minor inside) and the spoke.
const spokeOf = k => FIFTHS.indexOf(isMinor(k.scale) ? (k.root + 3) % 12 : k.root);
const atSpoke = (i, minor, like) => {
  const r = FIFTHS[((i % 12) + 12) % 12];
  // keep the scale's flavour (dorian stays dorian) when the ring stays the same
  const scale = minor ? (isMinor(like.scale) ? like.scale : 'minor') : (isMinor(like.scale) ? 'major' : like.scale);
  return { root: minor ? (r + 9) % 12 : r, scale };
};
// The keys that sit well with k: a step either way round the circle, and
// its relative major or minor (the same notes).
function friends(k) {
  const i = spokeOf(k), m = isMinor(k.scale);
  return [atSpoke(i + 1, m, k), atSpoke(i - 1, m, k), atSpoke(i, !m, k)];
}
const keyAt = when => (keyNext?.at != null && when >= keyNext.at ? keyNext : S);
const keyAhead = () => keyNext || S;          // the key that will be playing once any change waiting has landed
function applyKey(k) {        // a change you made
  checkpoint(); warmSoon();
  S.root = k.root; S.scale = k.scale;
  if (k.save) S.patKeys[k.pat ?? S.pat] = { root: k.root, scale: k.scale };
  dirty(); draw(); drawWheel();
}
function quietKey(k) {        // a pattern starting in its own key: not a change to undo
  warmSoon();
  S.root = k.root; S.scale = k.scale;
  if (committed) Object.assign(committed, { root: k.root, scale: k.scale });
  persist(); draw(); drawWheel();
}
function setKey(k) {
  k = { root: k.root, scale: k.scale, save: S.write };
  if (!playing) { applyKey(k); status(`Key: ${keyWords(k)}.${k.save ? ` Saved in pattern ${S.pat + 1}.` : ''}`); return; }
  if (keyNext?.at != null) { const was = keyNext; keyNext = null; was.auto ? quietKey(was) : applyKey(was); }   // already booked: let it land
  keyNext = sameKey(k, S) && !k.save ? null : k;
  warmGridSoon();
  status(keyNext ? `${keyWords(k)} from the next bar${k.save ? `, saved in the pattern playing then` : ''}.` : `Staying in ${keyWords(S)}.`);
  draw(); drawWheel();
}
let nextTurn = 0;         // the centre button: up a fifth, then across to the relative key, and so on
function nextKey() {
  const k = keyAhead(), i = spokeOf(k), m = isMinor(k.scale);
  setKey(nextTurn++ % 2 ? atSpoke(i, !m, k) : atSpoke(i + 1, m, k));
}
function randomKey() { const f = friends(keyAhead()); setKey(f[(Math.random() * f.length) | 0]); }

// The wheel, over the keys, so Play and Write stay in reach.
const SVGNS = 'http://www.w3.org/2000/svg';
function arc(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}
function buildWheel() {
  const svg = $('wheelSvg');
  for (const minor of [false, true]) for (let i = 0; i < 12; i++) {
    const a0 = (i * 30 - 105) * Math.PI / 180, a1 = a0 + Math.PI / 6, [r0, r1] = minor ? [62, 104] : [104, 148];
    const g = document.createElementNS(SVGNS, 'g'); g.classList.add('seg'); g.dataset.spoke = i; g.dataset.minor = minor ? 1 : 0;
    const path = document.createElementNS(SVGNS, 'path'); path.setAttribute('d', arc(r0, r1, a0, a1));
    const tx = document.createElementNS(SVGNS, 'text'), am = (a0 + a1) / 2, rm = (r0 + r1) / 2;
    tx.setAttribute('x', (rm * Math.cos(am)).toFixed(1)); tx.setAttribute('y', (rm * Math.sin(am) + 5).toFixed(1));
    g.append(path, tx); svg.append(g);
    g.addEventListener('click', () => { ctx.resume(); setKey(atSpoke(i, minor, keyAhead())); });
  }
}
function drawWheel() {
  if ($('wheel').hidden) return;
  const now = S, next = keyAhead(), fr = friends(next);
  for (const g of document.querySelectorAll('#wheelSvg .seg')) {
    const k = atSpoke(+g.dataset.spoke, g.dataset.minor === '1', next);
    g.querySelector('text').textContent = keyName(k);
    g.classList.toggle('now', sameKey(k, now) || (k.root === now.root && isMinor(k.scale) === isMinor(now.scale)));
    g.classList.toggle('next', !!keyNext && k.root === next.root && isMinor(k.scale) === isMinor(next.scale));
    g.classList.toggle('friend', fr.some(f => sameKey(f, k)));
  }
  const n = keyAhead(), i = spokeOf(n), m = isMinor(n.scale);
  $('wheelNextTo').textContent = keyName(nextTurn % 2 ? atSpoke(i, !m, n) : atSpoke(i + 1, m, n));
  const pk = S.patKeys[S.pat];
  $('wheelNote').textContent = (S.write
    ? `Write is on: the key you choose is saved in the pattern${playing ? ' that plays from the next bar' : ` (pattern ${S.pat + 1})`}.`
    : 'Write is off: the key changes for now; patterns keep any key saved in them.')
    + (pk ? ` Pattern ${S.pat + 1} is saved in ${keyWords(pk)}.` : ` Pattern ${S.pat + 1} has no key of its own.`)
    + (keyNext ? ` ${keyWords(keyNext)} comes in at the next bar.` : '');
  $('wheelForget').hidden = !pk;
}
// The wheel opens over the keys on the Pads, and over the grid on the Loops (it is moved there, and back).
const wheelHome = { parent: null, next: null };
function closeWheel() {
  const w = $('wheel'); w.hidden = true;
  if (wheelHome.parent && w.parentElement !== wheelHome.parent) { wheelHome.parent.insertBefore(w, wheelHome.next); w.classList.remove('inloops'); }
}
function openLoopWheel() {
  const w = $('wheel');
  if (!wheelHome.parent) { wheelHome.parent = w.parentElement; wheelHome.next = w.nextSibling; }
  $('lview').appendChild(w); w.classList.add('inloops'); w.style.top = w.style.minHeight = '';
  w.hidden = false; drawWheel();
}
function openWheel() {
  const w = $('wheel'), keys = $('keys'), dev = keys.parentElement;
  if (w.classList.contains('inloops')) closeWheel();
  w.hidden = false;
  w.style.top = keys.offsetTop + 'px';
  w.style.minHeight = (dev.clientHeight - keys.offsetTop - 8) + 'px';
  drawWheel();
}
buildWheel();
$('keyBtn').addEventListener('click', () => ($('wheel').hidden ? openWheel() : closeWheel()));
$('wheelClose').addEventListener('click', closeWheel);
$('wheelNext').addEventListener('click', () => { ctx.resume(); nextKey(); });
$('wheelRand').addEventListener('click', () => { ctx.resume(); randomKey(); });
$('wheelForget').addEventListener('click', () => {
  checkpoint(); S.patKeys[S.pat] = null; dirty(); drawWheel(); status(`Pattern ${S.pat + 1} now plays in whatever key is set.`);
});

// ---------------------------------------------------------------------------
// Effects: hold a key in FX mode. With Write on while playing, the effect is
// saved on each step it is held through, as on the PO-33.
// ---------------------------------------------------------------------------
// Every effect, by name. The 16 FX keys each hold one (S.fxSlots, chosen in
// Menu › Effects); effects saved in a pattern are saved by name, so moving an
// effect to another key doesn't change a pattern.
const FX = {
  loop2: ['Loop 1/2 bar', { seq: 'loop', L: 8 }], loop4: ['Loop 1/4', { seq: 'loop', L: 4 }], loop8: ['Loop 1/8', { seq: 'loop', L: 2 }],
  loop16: ['Loop 1/16', { seq: 'loop', L: 1 }], roll32: ['Roll 1/32', { seq: 'loop', L: 1, r: 2 }], roll48: ['Roll triplet', { seq: 'loop', L: 1, r: 3 }],
  half: ['Half time', { seq: 'half' }], scramble: ['Scramble', { seq: 'glitch' }],
  scratch: ['Scratch', { mod: 'scratch', f: 6 }], scratchfast: ['Scratch fast', { mod: 'scratch', f: 15 }], dive: ['Pitch dive', { mod: 'dive' }],
  octup: ['Octave up', { mod: 'up' }], octdown: ['Octave down', { mod: 'down' }], reverse: ['Reverse', { mod: 'reverse' }], unison: ['Unison', { mod: 'unison' }],
  reverb: ['Reverb', { audio: 'reverb' }], echo: ['Echo', { audio: 'echo' }], pingpong: ['Ping-pong', { audio: 'pingpong' }], chorus: ['Chorus', { audio: 'chorus' }],
  lowpass: ['Low pass', { audio: 'lowpass' }], highpass: ['High pass', { audio: 'highpass' }],
  crush: ['Crush', { audio: 'crush' }], overdrive: ['Overdrive', { audio: 'overdrive' }], fuzz: ['Fuzz', { audio: 'fuzz' }],
  wavefold: ['Wavefold', { audio: 'wavefold' }], tape: ['Tape saturation', { audio: 'tape' }],
};
const FX_GROUPS = [['Timing', ['loop2', 'loop4', 'loop8', 'loop16', 'roll32', 'roll48', 'half', 'scramble']],
  ['Pitch', ['scratch', 'scratchfast', 'dive', 'octup', 'octdown', 'reverse', 'unison']],
  ['Space', ['reverb', 'echo', 'pingpong', 'chorus']], ['Filter', ['lowpass', 'highpass']],
  ['Distortion', ['crush', 'overdrive', 'fuzz', 'wavefold', 'tape']]];
const hasAmount = k => !!FX[k][1].audio || FX[k][1].mod === 'dive';
const amtOf = k => S.fxAmt[k] ?? 0.6;
const activeFx = new Set();
const fxAim = new Map();     // held effect -> the tracks it is aimed at: 'all' or a Set of sounds
let seqFx = null, lastFx = null;
// aim: from an FX key, the tracks chosen in the FX panel; from a custom button, all.
// The tracks the effects hit: those chosen in FX mode's Tracks (all, at first).
const aimNow = () => (S.fxTarget === 'all' ? 'all' : new Set(S.fxTarget));
function engageFx(k, aim = 'all') {
  const f = FX[k][1]; activeFx.add(k); fxAim.set(k, aim); lastFx = k; ctx.resume(); routeLoops();
  if (eng.recAudio) { eng.setFx(eng.recAudio, false, stepDur()); eng.recAudio = null; }
  if (f.seq) {
    const at = headTick >= 0 ? headTick : tick;
    const L = f.L || 16;
    seqFx = { ...f, k, anchor: f.seq === 'loop' ? at - (at % L) : at + 1 };
  }
  if (f.audio) eng.setFx(f.audio, true, stepDur(), ctx.currentTime, amtOf(k));
}
function releaseFx(k) {
  const f = FX[k][1]; activeFx.delete(k); fxAim.delete(k);
  if (f.seq && seqFx?.k === k) seqFx = null;
  if (f.audio) eng.setFx(f.audio, false, stepDur());
  routeLoops();
}
// The Loops grid isn't one of the 16 sounds: while an effect aimed at chosen
// tracks is on, the loops go past the Pads effects (their columns keep their own).
function routeLoops() {
  const aimed = [...activeFx].some(k => FX[k][1].audio && fxAim.get(k) !== 'all');
  for (const k of eng.cols || []) if (k) {
    const to = aimed ? eng.dry : eng.bus; if (k.to === to) continue;
    for (const n of [k.out, k.dout]) { try { n.disconnect(k.to || eng.bus); } catch (e) {} n.connect(to); }
    k.to = to;
  }
}
// How the effects in `list` ([effect, tracks] pairs) change one note of sound si:
// only the ones aimed at it count; an audio effect aimed elsewhere sends it
// past the effects (dry).
function modsFor(si, list) {
  const m = { rate: 1 };
  for (const [k, to] of list) {
    const f = FX[k][1];
    if (to !== 'all' && !to.has(si)) { if (f.audio) m.dry = true; continue; }
    if (f.mod === 'up') m.rate *= 2; if (f.mod === 'down') m.rate /= 2;
    if (f.mod === 'reverse') m.reverse = true; if (f.mod === 'unison') m.unison = true;
    if (f.mod === 'scratch') m.scratch = f.f;
    if (f.mod === 'dive') m.dive = amtOf(k);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
const keyEls = [];
const down = new Set();
const roboEls = [];            // the Robot pads (made with the robot voice, below), over the keys in Robot mode
let robotTarget = -1;          // the sound the Robot pads are on
for (let k = 0; k < 16; k++) {
  const b = document.createElement('button'); b.className = 'key';
  b.innerHTML = `<u class="fill"></u><b>${k + 1}</b><span></span><i></i><em class="tag"></em>`;
  let hold = 0;
  b.addEventListener('pointerdown', ev => {
    ev.preventDefault(); capture(b, ev); press(k);
    clearTimeout(hold);
    if (S.mode === 'sound' && !copying) hold = setTimeout(() => { if (S.cur === k) openSoundSheet(k); }, 550);   // hold: the sound's own menu
  });
  const up = () => { clearTimeout(hold); release(k); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', ev => ev.preventDefault());
  $('keys').appendChild(b); keyEls.push(b);
}
let copying = null;           // 'sound' or 'pattern': the next key is where it goes
function press(k) {
  if (down.has(k)) return;
  if (verbose) log('tap', `key ${k + 1} (${S.mode}${S.write ? ', write' : ''}${playing ? ', playing' : ''})`);
  down.add(k); ctx.resume();
  if (recBtn.classList.contains('held')) {     // Rec + key: record into that sound
    S.cur = k; syncPanel(); status(`● Recording into sound ${k + 1}… let go to stop.`); draw(); return;
  }
  switch (S.mode) {
    case 'sound':
      if (copying === 'sound') { copySound(S.cur, k); break; }
      if (!copying && (k < 8) !== (soundPage === 'inst')) break;      // the other side's pads are dim
      S.cur = k; S.lastKey[k] ||= 0; playHeld(k, S.lastKey[k], k, undefined, true); syncPanel(); persist(); break;   // a taste: never left looping
    case 'pattern':
      if (copying === 'pattern') { copyPattern(S.pat, k); break; }
      if (chainEdit) { checkpoint(); if (chainFresh) { S.chain = []; chainFresh = false; } S.chain.push(k); S.pat = k; pendingChain = null; }
      // In a chain, choosing a pattern only shows it (to look or write): the chain plays on, and the
      // screen stays on your pattern until you choose the one playing. Alone, it switches at the next bar.
      else if (S.chain.length > 1) {
        S.pat = k; followPlay = !playing || k === headPat;
        status(playing && !followPlay ? `Showing pattern ${k + 1}; the chain plays on. Choose the pattern playing to follow it again.` : '');
        persist(); break;
      }
      else { S.pat = k; if (playing) pendingChain = [k]; else { S.chain = [k]; if (S.patKeys[k]) quietKey(S.patKeys[k]); } persist(); break; }
      dirty(); break;
    case 'fx': {
      const id = S.fxSlots[k];
      if (S.fxLatch && activeFx.has(id)) releaseFx(id);           // tap on, tap again off
      else engageFx(id, aimNow());
      break;
    }
    default: {
      if (S.write && !playing) { toggleStep(k); break; }
      const key = padKey(k); if (key == null) break;     // a rap's pad with no syllable on its step
      const h = trigger(key, k);
      if (S.write && h) h.note = recordLive(key, h.tick);
      if (lrTake && h) lrNote(key, h);
    }
  }
  draw();
}
function release(k) {
  if (!down.delete(k)) return;
  if (S.mode === 'fx' && !S.fxLatch && activeFx.has(S.fxSlots[k])) releaseFx(S.fxSlots[k]);
  const h = holding[k]; delete holding[k];
  if (h?.voice?.sustain) endHeld(h);           // Gate: lifting the finger stops it
  draw();
}
// Stop a held or looping note; if it was recorded live, keep how long it
// sounded, in steps, as the note's length.
function endHeld(h) {
  h.voice?.stop(Math.max(ctx.currentTime, h.at + 0.02));     // a quantized note may not have started yet
  if (h.lr) h.lr.d = Math.max(0.25, (ctx.currentTime - h.at) / stepDur());   // ⏺ Loop rec: how long it was held
  if (!h.note) return;
  const d = (ctx.currentTime - h.at) / stepDur();
  h.note.d = S.quantGrid ? Math.max(1, Math.round(d)) : Math.max(0.1, Math.round(d * 100) / 100);
  dirty();
}
const holding = {};          // key -> { voice, at, note } while a finger is on it (Gate)
const looping = new Map();   // "sound:key" -> the same, for a Loop running until it's tapped again
// Play a key of the current sound. Returns false when the tap only stopped a loop.
// A rapped voice's pads follow the pattern: pad k shows, lights for and plays
// the syllable on step k of the pattern on screen, so words, lights and
// sound agree. Any other sound's pads are its keys.
const isRap = si => S.slots[si]?.slices?.[0]?.w != null;
const padsFollow = () => isRap(S.cur) && S.patterns[S.pat].some(st => st.some(n => n.s === S.cur));
function padKey(k) {
  if (!padsFollow()) return k;
  return S.patterns[S.pat][k].find(n => n.s === S.cur)?.k ?? null;
}
function trigger(k, pad = k) {
  S.lastKey[S.cur] = k;
  flash = { k: pad, until: performance.now() + 160 };
  if (S.slots[S.cur]?.kind === 'chop') syncPanel();    // trim follows the last slice played
  const sn = snap(), h = playHeld(S.cur, k, pad, sn?.when);
  if (h && sn) h.tick = sn.j;
  return h;
}
// Quantize: while the beat plays, a tap sounds on the next point of the grid
// (every quantGrid steps), unless it came at most 30 ms after one: then it
// plays at once, counted on that point. Returns the tick and the time.
function snap() {
  const g = +S.quantGrid; if (!playing || !g) return null;
  const now = ctx.currentTime, sd = stepDur(), sw = (2 * S.swing / 100 - 1) * sd;
  const at = j => nextT - (tick - j) * sd + (j % 2 ? sw : 0);
  let prev = Math.floor((tick - (nextT - now) / sd) / g) * g;
  while (prev > 0 && at(prev) > now) prev -= g;
  if (now - at(prev) <= 0.03) return { j: Math.max(0, prev), when: now };
  return { j: prev + g, when: at(prev + g) };
}
// Play key `key` of sound `si` from the pad under the finger, as One shot,
// Gate (until the pad is let go) or Loop (until it is tapped again). A loop
// keeps going when the sound is switched to One shot or Gate, and those play
// over it; only a tap in Loop mode stops it.
// Octave: Oct − / Oct + move the keys you play on the current sound by an
// octave; a note recorded then keeps its octave (n.oc).
const octOf = si => S.oct?.[si] || 0;
const ocOf = si => (octOf(si) ? { oc: octOf(si) } : {});
const withOct = (si, lock, oc) => (oc ? { ...lock, pitch: (lock?.pitch ?? S.slots[si]?.params.pitch ?? 0) + 12 * oc } : lock);
function shiftOct(d) {
  if (isRobot(S.cur)) { status('The Robot pads keep the voice’s own pitch: the octave buttons leave them as they are.'); return; }
  const o = Math.max(-2, Math.min(2, octOf(S.cur) + d));
  if (o === octOf(S.cur)) { status(`Sound ${S.cur + 1} is already ${o > 0 ? 'two octaves up' : 'two octaves down'}: that's as far as it goes.`); return; }
  S.oct[S.cur] = o; persist(); draw();
  status(`Sound ${S.cur + 1}: ${o === 0 ? 'back to its own octave' : `${Math.abs(o)} octave${Math.abs(o) > 1 ? 's' : ''} ${o > 0 ? 'up' : 'down'}`}.`);
}
// A loop (a sound with a tempo, from a song pack) keeps time with the beat:
// while it plays, a tap starts the loop at the next bar line, from the point
// it would have reached had it been playing all along, and a tap on a
// running loop stops it at the next bar line.
const isLoop = si => !!(S.slots[si]?.bpm || S.slots[si]?.slices?.some(x => x.bpm));
function nextBar(g = 16) {        // g = 4: the next beat
  const now = ctx.currentTime, sd = stepDur(), at = j => nextT - (tick - j) * sd;
  let j = Math.ceil((tick - (nextT - now) / sd) / g) * g;
  if (j >= g && now - at(j - g) <= 0.03) j -= g;
  return { j, when: Math.max(now, at(j)) };
}
function playHeld(si, key, pad, when = ctx.currentTime, taste = false) {
  const id = `${si}:${key}`, inLoop = !taste && S.slots[si]?.params.trig === 'loop', synced = !taste && playing && isLoop(si);
  if (inLoop && looping.has(id)) {
    const h = looping.get(id); looping.delete(id);
    if (synced) h.voice?.stop(nextBar().when); else endHeld(h);
    return false;
  }
  let phase = 0;
  if (synced) { const b = nextBar(), bars = S.slots[si].slices[key]?.bars || 4; when = b.when; phase = ((b.j / 16) % bars) / bars; }
  const h = { voice: noteOn(eng, si, key, when, undefined, withOct(si, null, octOf(si)), true, null, phase), at: when };
  if (inLoop && h.voice?.sustain) looping.set(id, h);
  else holding[pad] = h;
  return h;
}
let flash = null;
function toggleStep(k) {
  checkpoint();
  const notes = S.patterns[S.pat][k];
  const mine = notes.filter(n => n.s === S.cur);
  if (mine.length) S.patterns[S.pat][k] = notes.filter(n => n.s !== S.cur);
  else { notes.push({ s: S.cur, k: S.lastKey[S.cur], ...ocOf(S.cur) }); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime, null, withOct(S.cur, null, octOf(S.cur))); }
  dirty();
}
// Put what was just played into the pattern: with Quantize on, on the grid
// point it sounded on (tick j, from snap()). With Quantize off it goes on the
// step before, with `o`: how far past that step (0-1 of a step, swing
// ignored) it was played, so it plays back just so.
function recordLive(k, j) {
  const now = ctx.currentTime, sd = stepDur();
  if (!S.quantGrid || j == null) {
    const jf = Math.max(0, tick - (nextT - now) / sd), j = Math.floor(jf);
    replaceFrom(j);
    const o = Math.round((jf - j) * 1000) / 1000, notes = S.patterns[patAt(j)][j % 16];
    let note = notes.find(n => n.s === S.cur && n.k === k && (n.oc || 0) === octOf(S.cur) && Math.abs((n.o || 0) - o) < 0.1);
    if (!note) notes.push(note = { s: S.cur, k, ...(o > 0.01 && { o }), ...ocOf(S.cur) });
    take?.notes.add(note);
    if (j >= tick) liveSkip.add(`${j}:${S.cur}:${k}`);
    dirty(); return note;
  }
  replaceFrom(j);
  const p = patAt(j), step = j % 16;
  const notes = S.patterns[p][step];
  let note = notes.find(n => n.s === S.cur && n.k === k && (n.oc || 0) === octOf(S.cur));
  if (!note) notes.push(note = { s: S.cur, k, ...ocOf(S.cur) });
  take?.notes.add(note);
  if (j >= tick) liveSkip.add(`${j}:${S.cur}:${k}`);
  dirty();
  return note;
}
// Replace (Write pressed twice). From the first note you play, the current
// sound's old notes stop sounding, and each new note deletes them on every
// step from the one before it up to itself. So only the stretch you played
// over is replaced: if you stop, nothing after your last note is deleted (it
// plays again once a whole pattern passes with no new note), and if you don't
// play, nothing is deleted at all.
let take = null;            // { si, notes: the notes of this take, last: tick of the latest }
function replaceFrom(j) {
  if (!S.replace) return;
  if (take?.si !== S.cur) { checkpoint(); take = { si: S.cur, notes: new WeakSet(), last: j - 1 }; }
  for (let c = take.last + 1; c <= j; c++) clearOld(c);
  take.last = Math.max(take.last, j);
}
function clearOld(t) {
  const P = S.patterns[patAt(t)], st = t % 16;
  const keep = P[st].filter(n => n.s !== take.si || take.notes.has(n));
  if (keep.length !== P[st].length) { P[st] = keep; dirty(); }
}
function copySound(from, to) {
  checkpoint();
  const sl = S.slots[from];
  S.slots[to] = { ...sl, factory: null, name: sl.name + (from === to ? '' : ' copy'), params: { ...sl.params },
    synth: sl.synth && { ...sl.synth }, slices: sl.slices?.map(s => ({ ...s })) };
  if ((from < 8) !== (to < 8) && S.slots[to].kind !== 'synth' && S.slots[to].kind !== 'multi') {
    // A melodic sample moved to the drum side is chopped, and the other way round.
    const buf = sl.kind === 'chop' ? (sl.buf || sl.slices[S.lastKey[from]].buf) : sl.buf;
    copying = null; assignBuffer(to, buf, sl.name + ' copy'); return;
  }
  copying = null; S.cur = to; syncPanel(); dirty();
  status(`Sound ${from + 1} copied to ${to + 1}.`);
}
function copyPattern(from, to) {
  checkpoint();
  S.patterns[to] = S.patterns[from].map(st => st.map(n => ({ ...n, lock: n.lock && { ...n.lock } })));
  S.fx[to] = [...S.fx[from]]; S.patKeys[to] = S.patKeys[from];
  copying = null; S.pat = to; if (!playing) S.chain = [to];
  status(`Pattern ${from + 1} copied to ${to + 1}.`); dirty();
}

// ---------------------------------------------------------------------------
// Function buttons
// ---------------------------------------------------------------------------
let chainEdit = false, chainFresh = false, followPlay = true;
// Sound: tap once for the instruments (sounds 1-8), again for the drums (the kits, 9-16), again to play.
let soundPage = 'inst';
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.mode;
  if (m === 'sound' && !copying) {
    if (S.mode !== 'sound') { S.mode = 'sound'; soundPage = 'inst'; }
    else if (soundPage === 'inst') soundPage = 'perc';
    else S.mode = 'play';
    status(S.mode !== 'sound' ? '' : soundPage === 'inst' ? 'Instruments: tap a sound (1–8). Sound again for the drums.'
      : 'Drums: tap a kit (9–16). Its hits are the 16 keys, each in its colour. Sound again to play.');
  } else S.mode = S.mode === m ? 'play' : m;
  if (S.mode !== 'fx' && !S.fxLatch) for (const f of [...activeFx]) releaseFx(f);
  if (S.mode !== 'pattern' && chainEdit) setChainEdit(false);
  if (copying && S.mode !== copying) copying = null;
  draw();
}));
$('write').addEventListener('click', () => {
  if (!S.write) S.write = true;
  else if (!S.replace) S.replace = true;
  else S.write = S.replace = false;
  take = null; draw();
});
$('play').addEventListener('click', () => playing ? stop() : (start(), resumeLoops()));
$('chainBtn').addEventListener('click', () => setChainEdit(!chainEdit));
function setChainEdit(on) {
  const none = !on && chainFresh;      // ending without having chosen any pattern
  chainEdit = on; chainFresh = on || none;
  $('chainBtn').classList.toggle('go', on);
  $('chainBtn').textContent = on ? 'Done chaining' : 'Chain patterns';
  if (on) { S.mode = 'pattern'; status('Tap patterns in the order they should play (the same one can go in more than once), then Chain again. Chain again without tapping any: unchain.'); }
  else if (chainFresh) {           // ended without choosing any: unchain, to the pattern on screen
    chainFresh = false; checkpoint(); S.chain = [S.pat]; if (playing) pendingChain = [S.pat]; dirty();
    status(`Unchained: pattern ${S.pat + 1} on its own.`);
  } else status(S.chain.length > 1 ? `Chain: ${S.chain.map(p => p + 1).join(' → ')}` : '');
  draw();
}

// Recording: hold ● Rec.
let rec = null, micStream = null;
const recBtn = $('rec');
recBtn.addEventListener('pointerdown', async ev => {
  ev.preventDefault(); capture(recBtn, ev);
  if (rec) return;
  recBtn.classList.add('held');
  try {
    await ctx.resume(); await engReady;
    let stream;
    if ($('recSrc').value === 'beat') {
      if (!eng.tap) throw new Error('This browser cannot record its own output.');
      stream = eng.tap.stream;
    } else {
      micStream ||= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream = micStream;
    }
    const chunks = [], mr = new MediaRecorder(stream);
    rec = { mr, chunks, src: $('recSrc').value, released: !recBtn.classList.contains('held') };
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = () => finishRec(chunks, mr.mimeType, rec.src);
    mr.start();
    status('● Recording… let go to stop.');
    if (rec.released) stopRec();
  } catch (e) { recBtn.classList.remove('held'); rec = null; status('Could not record: ' + e.message); }
});
const stopRec = () => { recBtn.classList.remove('held'); if (rec && rec.mr.state === 'recording') rec.mr.stop(); };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(e => recBtn.addEventListener(e, () => {
  recBtn.classList.remove('held'); if (rec) rec.released = true; stopRec();
}));
async function finishRec(chunks, type, src) {
  rec = null;
  try {
    const blob = new Blob(chunks, { type });
    if (blob.size < 200) { status('That was too short. Hold ● Rec while you make the sound.'); return; }
    const buf = prepare(ctx, await decode(await blob.arrayBuffer()), { trim: src !== 'beat' });
    assignBuffer(S.cur, buf, src === 'beat' ? 'Resampled beat' : 'Recording');
  } catch (e) { status('Could not read the recording: ' + e.message); }
}

// Put a new sound on a slot: pitched on 1-8, chopped on 9-16.
function assignBuffer(si, buf, name) {
  checkpoint();
  const slot = { factory: null, name, params: { ...defParams(), choke: true }, buf };
  if (si < 8) slot.kind = 'sample';
  else {
    const st = onsets(buf, 16);
    Object.assign(slot, { kind: 'chop', contiguous: true,
      slices: st.map((s, k) => ({ s, e: st[k + 1] ?? buf.duration, name: `slice ${k + 1}` })) });
  }
  S.slots[si] = slot; S.lastKey[si] = si < 8 ? 7 : 0;
  status(`${name} → sound ${si + 1} (${buf.duration.toFixed(1)} s${si < 8 ? ', key 8 is the original pitch' : ', chopped into 16'})`);
  syncPanel(); dirty(); draw();
  noteOn(eng, si, S.lastKey[si], ctx.currentTime + 0.02);
}

$('file').addEventListener('change', async () => {
  const f = $('file').files[0]; if (!f) return;
  try { assignBuffer(S.cur, prepare(ctx, await decode(await f.arrayBuffer())), f.name.replace(/\.[^.]+$/, '')); }
  catch (e) { status('Could not open that file: ' + e.message); }
  $('file').value = '';
});

// 🎲 Roll: a new random sound on the last key played (chops) or the whole sound (melodic).
$('rollAll').addEventListener('click', () => { ctx.resume(); roll(true); });
function roll(all) {
  checkpoint();
  const si = S.cur, fam = $('family').value;
  if (si < 8) {
    const b = blessMe(ctx, fam);
    const slot = { factory: null, kind: 'sample', name: `Rolled ${b.family}`, params: defParams(), buf: b, made: 'GEN' };
    S.slots[si] = slot; S.lastKey[si] = 7;
    noteOn(eng, si, 7, ctx.currentTime + 0.01);
  } else {
    let slot = S.slots[si];
    if (all || slot.kind !== 'chop') {
      slot = { factory: null, kind: 'chop', name: `Rolled ${fam || 'kit'}`, params: defParams(), slices: [], made: 'GEN' };
      for (let k = 0; k < 16; k++) { const b = blessMe(ctx, fam); slot.slices.push({ buf: b, s: 0, e: b.duration, name: b.family }); }
      S.slots[si] = slot;
    } else {
      const k = S.lastKey[si], b = blessMe(ctx, fam);
      slot.slices[k] = { buf: b, s: 0, e: b.duration, name: b.family };
      slot.factory = null; slot.contiguous = false;
      if (!/rolled/i.test(slot.name)) slot.name += ' + rolled';
    }
    noteOn(eng, si, S.lastKey[si], ctx.currentTime + 0.01);
  }
  syncPanel(); dirty(); draw();
}
$('reset').addEventListener('click', async () => {
  checkpoint();
  S.slots[S.cur] = await factorySlot(DEFAULT[S.cur]); S.lastKey[S.cur] = 0; syncPanel(); dirty(); draw();
  status(`Sound ${S.cur + 1} is ${S.slots[S.cur].name} again.`);
});

// ---------------------------------------------------------------------------
// Sound panel. On drum sounds (9-16) Start and Length trim the last slice
// played. With Write on while playing, moving a slider locks its value onto
// the step now playing instead (a parameter lock).
// ---------------------------------------------------------------------------
const pct = v => Math.round(v * 100) + '%';
const PARAMS = [['pVol', 'vol', v => Math.round(v * 100)], ['pPitch', 'pitch', v => (v > 0 ? '+' : '') + v],
  ['pFilter', 'filter', v => Math.abs(v) < 0.02 ? 'off' : (v < 0 ? 'LP ' : 'HP ') + Math.round(Math.abs(v) * 100)],
  ['pRes', 'res', pct], ['pStart', 'start', pct], ['pLen', 'len', pct]];
const perSlice = key => (key === 'start' || key === 'len') && S.slots[S.cur]?.kind === 'chop';
for (const [id, key, fmt] of PARAMS) $(id).addEventListener('input', () => {
  const v = +$(id).value, sl = S.slots[S.cur];
  $('o' + id.slice(1)).textContent = fmt(v);
  if (S.write && playing && headStep >= 0) {
    const mine = S.patterns[headPat][headStep].filter(n => n.s === S.cur);
    for (const n of mine) n.lock = { ...n.lock, [key]: v };
    if (mine.length) status(`Locked ${key} on step ${headStep + 1}.`);
  } else if (perSlice(key)) sl.slices[S.lastKey[S.cur]][key] = v;
  else sl.params[key] = v;
  dirty();
});
$('pChoke').addEventListener('change', () => { S.slots[S.cur].params.choke = $('pChoke').checked; dirty(); });
const TRIGS = ['oneshot', 'gate', 'loop'], TRIG_LABEL = { oneshot: '1 Shot', gate: 'Gate', loop: 'Loop' };
$('trigBtn').addEventListener('click', () => {
  const t = TRIGS[(TRIGS.indexOf(S.slots[S.cur].params.trig || 'oneshot') + 1) % 3];
  $('pTrig').value = t; $('pTrig').dispatchEvent(new Event('change'));
  const running = [...looping.keys()].some(id => id.startsWith(S.cur + ':'));
  status(`Sound ${S.cur + 1} plays as ${{ oneshot: 'One shot: the whole sound', gate: 'Gate: only while held', loop: 'Loop: tap on, tap again off' }[t]}.`
    + (running ? (t === 'loop' ? ' Tap a looping key to stop it.' : ' The loops keep going: play over them, and come back to Loop to stop them.') : ''));
});
for (let r = 0; r < 12; r++) $('pKeyOf').add(new Option(`${NOTE[r]}: follows the song's key`, r));
$('pKeyOf').addEventListener('change', () => {
  const v = $('pKeyOf').value, sl = S.slots[S.cur]; checkpoint();
  sl.params.keyOf = v === '' ? null : +v; dirty(); draw();
  if (v !== '') status(`Sound ${S.cur + 1} is in ${NOTE[+v]}: in ${NOTE[S.root]} it moves ${shiftWords(toKey(S.root, +v))}.`);
});
const shiftWords = d => (d === 0 ? 'not at all' : `${Math.abs(d)} semitone${Math.abs(d) > 1 ? 's' : ''} ${d > 0 ? 'up' : 'down'}`);
$('findKey').addEventListener('click', () => {
  const sl = S.slots[S.cur]; if (!sl) return;
  const sh = sl.kind === 'chop' && sl.slices[S.lastKey[S.cur]]?.buf ? sl.slices[S.lastKey[S.cur]] : null;
  const buf = sh ? sh.buf : sl.buf; if (!buf) return;
  const k = findKey(buf, sh ? sh.s : 0, sh ? sh.e : buf.duration);
  checkpoint(); sl.params.keyOf = k.root; dirty(); syncPanel(); draw();
  const sure = k.sure > 0.6 ? 'clearly' : k.sure > 0.3 ? 'probably' : 'maybe (hard to tell: check by ear)';
  status(`Sound ${S.cur + 1} sounds ${sure} in ${keyWords({ root: k.root, scale: k.minor ? 'minor' : 'major' })}. It now follows the song's key: in ${NOTE[S.root]} it moves ${shiftWords(toKey(S.root, k.root))}.`);
  log('key', `sound ${S.cur + 1}: ${NOTE[k.root]}${k.minor ? 'm' : ''}, sure ${k.sure.toFixed(2)}`);
});
$('pTrig').addEventListener('change', () => {
  checkpoint(); S.slots[S.cur].params.trig = $('pTrig').value; syncPanel();
  dirty(); draw();
});
$('pWob').addEventListener('input', () => {
  const sl = S.slots[S.cur]; if (sl.synth) sl.synth.rate = +$('pWob').value;
  $('oWob').textContent = WOBBLE_RATES[+$('pWob').value][1]; dirty();
});
function syncPanel() {
  const sl = S.slots[S.cur]; if (!sl) return;
  const slice = sl.kind === 'chop' ? sl.slices[S.lastKey[S.cur]] : null;
  for (const [id, key, fmt] of PARAMS) {
    const v = perSlice(key) ? (slice?.[key] ?? (key === 'len' ? 1 : 0)) : sl.params[key];
    $(id).value = v; $('o' + id.slice(1)).textContent = fmt(v);
  }
  $('pChoke').checked = !!sl.params.choke; $('pTrig').value = sl.params.trig || 'oneshot';
  $('trigBtn').textContent = TRIG_LABEL[$('pTrig').value]; $('trigBtn').classList.toggle('on', $('pTrig').value !== 'oneshot');
  $('startRow').style.display = sl.kind === 'synth' ? 'none' : '';
  // Instruments and synths know their notes; a recording follows the key only if you say what key it is in.
  $('keyOfRow').style.display = (sl.kind === 'sample' || sl.kind === 'chop') && !drumSound(sl) ? '' : 'none';
  $('pKeyOf').value = sl.params.keyOf ?? '';
  const wob = sl.synth?.type === 'wobble';
  $('wobRow').style.display = wob ? '' : 'none';
  if (wob) { $('pWob').value = sl.synth.rate; $('oWob').textContent = WOBBLE_RATES[sl.synth.rate][1]; }
  $('rollAll').style.display = S.cur >= 8 ? '' : 'none';
  $('soundNote').textContent = `Sound ${S.cur + 1}: ${sl.name}. ` + (sl.kind === 'synth' ? 'Synth: Length is how long each note rings.'
    : sl.kind === 'multi' ? 'A recorded instrument: each key plays the nearest recording, tuned to its note.'
    : sl.kind === 'chop' ? `Each key is one slice. Start and Length trim slice ${S.lastKey[S.cur] + 1}, the last one played.`
    : 'Key 8 plays it at its own pitch; the others go up and down the scale.');
}
for (const f of FAMILIES) $('family').add(new Option(f[0].toUpperCase() + f.slice(1), f));
// ---------------------------------------------------------------------------
// The sound browser (Menu › Sounds). Hits are instruments (one sound played
// up and down the keys) and single sounds; Packs put a different sound on
// each key (drum kits, sound-effect banks). Tap a sound to hear it, then Load
// puts it on the current key.
// ---------------------------------------------------------------------------
// The browser is in folders by part, in the parts' colours (the Loops columns' and the pads'):
// [name, contents, colour]. Contents: sound ids, folders, or a list made when opened
// ('hits:snare': every snare and clap of the kits, one by one).
const DRUM_BANKS = ['vigkit', 'ebbkit', 'acoustic', 'boombap', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly', 'tr808', 'electro', 'drumtraks', 'percussion', 'shakers'];
const TREE = ['Sounds', [
  ['Beats', ['vigkloops', 'ebbkloops', 'grooves', 'drumloops', 'breaks'], 'var(--c-kick)'],
  ['Snares and claps', 'hits:snare', 'var(--c-snare)'],
  ['Tops (hats, cymbals, percussion)', 'hits:tops', 'var(--c-hat)'],
  ['Drum kits', ['vigkit', 'ebbkit', 'acoustic', 'boombap', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly', 'tr808', 'electro', 'drumtraks',
    'kit808', 'kit909', 'kitcr78', 'kit606', 'kitminimal', 'percussion', 'shakers', 'bells2'], 'var(--c-kit)'],
  ['Bass', ['bass808', 'wobble', 'growl', 'reese', 'sawbass', 'sqbass', 'fmbass', 'acid', 'uprightbass', 'elecbass', 'contrabass', 'vigcloister', 'basshits', 'ebbbass', 'vigbass'], 'var(--c-bass)'],
  ['Chords', ['rhodes', 'piano', 'upright', 'epiano', 'harpsichord', 'pipeorgan', 'renorgan', 'organ', 'celeste', 'glass', 'vigglass', 'ebbchords', 'vigchords'], 'var(--c-chords)'],
  ['Lead', ['chip', 'supersaw', 'brass', 'trumpet', 'trombone', 'tenorsax', 'violin', 'viola', 'cello', 'gretsch', 'hofner', 'emily', 'vighowl', 'ebblead', 'viglead'], 'var(--c-lead)'],
  ['Sub and color', ['subsine', 'ebbsub', 'vigsub', 'glitch', 'machines', 'hits', 'blips', 'lasers', 'coins', 'robots', 'arcade'], 'var(--c-sub)'],   // purple: subs, and the odd, glitchy accents (the video-game sounds)
  ['Vox and keys', ['choirmen', 'choirwomen', 'choir', 'hype', 'robotvox', 'vocchops', 'ebbvox', 'vigvox'], 'var(--c-vox)'],
  ['Pads', ['pad', 'strings', 'vigstrings', 'vigswarm', 'vigchant', 'pads'], 'var(--c-pad)'],
  ['Plucks, mallets and bells', ['pluck', 'harp', 'pizz', 'nylon', 'steelgtr', 'twelve', 'kalimba', 'vibes', 'marimba', 'xylophone', 'glock', 'bells', 'steeldrum', 'fmbell', 'viglauds', 'vigbell'], 'var(--c-pluck)'],
  ['Stabs and FX', ['stabs', 'funkhorns', 'noisefx', 'sirens'], 'var(--c-stab)'],
  ['Ambience and vinyl', ['ambience', 'nature', 'airwater']],
  ['Songs', 'songs'],
  ['My Sounds', 'mine:all'],
  ['My packs', 'mine:pack'],
  ['☁ Shared', 'shared'],
  ['★ Favorites', 'favs'],
]];
// Every snare and clap (or every hat, cymbal and percussion hit) of the recorded kits, one by one,
// after the loops of that part (a pack's snare loops, its tops loops).
const PART_LOOPS = { snare: ['vigsloops', 'ebbsloops'], tops: ['vigtloops', 'ebbtloops'] };
function hitItems(which) {
  if (!banks) { bankList().then(() => drawBrowser()); return []; }
  const want = which === 'snare' ? ['snare', 'clap'] : ['hat', 'open', 'cym', 'perc'];
  const out = [];
  for (const id of PART_LOOPS[which] || []) (banks[id]?.from || []).forEach((name, k) => out.push({ from: { lib: id }, k, label: `${name} · ${LIBRARY[id].name}` }));
  for (const id of DRUM_BANKS) (banks[id]?.from || []).forEach((name, k) => {
    if (want.includes(hitPart(name))) out.push({ from: { lib: id }, k, label: `${name} · ${LIBRARY[id].name}` });
  });
  return out;
}
async function bankList() { if (!banks) banks = await (await fetch('sounds/banks.json')).json(); return banks; }
const EMPTY = { Songs: 'No songs yet: the songs Claude builds for you will be here.',
  'My Sounds': 'Nothing saved yet. ★ Save to My Sounds (in Settings or the editor) keeps a sound here; ⬆ Import brings in a file.',
  '★ Favorites': 'No favorites yet. Choose a sound, then ☆ Favorite (under Load) keeps it here.',
  'My packs': 'No packs yet. In My Sounds, Make a pack puts up to 16 of your sounds together.' };
const isPack = id => !!(LIBRARY[id].kit || LIBRARY[id].bank);
// What can be chosen in the browser: { lib: id } a built-in sound, { mine: record } one of yours,
// { from: chosen pack, k } one sound inside a pack.
let bPath = [TREE], bSel = null, mine = [];
const previews = new Map();
const selName = c => c.song ? `${c.song.name} (${c.song.by})` : c.lib ? LIBRARY[c.lib].name : c.mine ? c.mine.name : `${c.label} (from ${selName(c.from)})`;
const selPack = c => (c.lib ? isPack(c.lib) : c.mine ? c.mine.type === 'pack' : false);
async function refreshMine() { mine = db ? (await idbAll('mine')).sort((a, b) => b.created - a.created) : []; }
function itemsOf(node) {
  const it = node[1];
  if (it === 'mine:all') return mine.filter(m => m.item).map(m => ({ mine: m }));      // (your sets are in Loops › ⚙)
  if (it === 'mine:pack') return mine.filter(m => m.type === 'pack').map(m => ({ mine: m }));
  if (it === 'songs') return SONGS.map(x => ({ song: x }));
  if (it === 'favs') return favChoices();
  if (typeof it === 'string' && it.startsWith('hits:')) return hitItems(it.slice(5)).filter(c => !doomed(c));
  if (node.contents) return node.contents.filter(c => !doomed(c));
  return [...mine.filter(m => m.type === 'loop' && folderOf(m) === node[0]).map(m => ({ mine: m })),     // your loops first
    ...it.filter(x => Array.isArray(x) || (LIBRARY[x] && !toDelete().has(x))).map(x => (Array.isArray(x) ? x : { lib: x }))];
}
// Review the library: every built-in sound, to hear and tick for deleting. The ticks are kept on this
// device (pocketDelete: "id" for a whole sound, "id#k" for one sound of a pack) and leave the menus at
// once; Send to Claude opens a GitHub issue listing them (or Copy the list, for a chat), and Claude
// deletes them from the app for good.
const toDelete = () => { try { return new Set(JSON.parse(localStorage.getItem('pocketDelete') || '[]')); } catch (e) { return new Set(); } };
const saveDelete = set => { try { localStorage.setItem('pocketDelete', JSON.stringify([...set])); } catch (e) {} };
const doomed = c => { const d = toDelete(); return !!(c.lib && d.has(c.lib)) || !!(c.from?.lib && (d.has(c.from.lib) || d.has(`${c.from.lib}#${c.k}`))); };
const revOpen = new Set();
async function openReview() {
  await bankList();
  $('revBox').hidden = false; drawReview();
}
function revName(key) {
  const [id, k] = key.split('#');
  return k == null ? `${LIBRARY[id]?.name || id}` : `${banks?.[LIBRARY[id]?.bank || id]?.from?.[+k] ? shortName(banks[LIBRARY[id].bank || id].from[+k]) : 'sound ' + (+k + 1)} (in ${LIBRARY[id]?.name || id})`;
}
function drawReview() {
  const list = $('revList'), d = toDelete(), y = list.scrollTop; list.textContent = '';
  const row = (key, name, small, play, sub, open, choice) => {
    const r = document.createElement('div'); r.className = 'revrow' + (sub ? ' sub' : ''); r.classList.toggle('marked', d.has(key));
    const pb = document.createElement('button'); pb.textContent = '▶'; pb.setAttribute('aria-label', 'Play ' + name); pb.addEventListener('click', play);
    const lb = document.createElement('button'); lb.textContent = revLoopKey === key ? '■' : '🔁'; lb.title = 'Loop it, at the tempo playing';
    lb.setAttribute('aria-label', 'Loop ' + name); lb.classList.toggle('on', revLoopKey === key); lb.addEventListener('click', () => revLoop(choice, key));
    r.append(lb);
    const n = document.createElement('span'); n.className = 'rn'; n.textContent = name;
    if (small) { const sm = document.createElement('small'); sm.textContent = ' ' + small; n.appendChild(sm); }
    r.append(pb, n);
    if (open) r.appendChild(open);
    const l = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = d.has(key);
    cb.addEventListener('change', () => { const dd = toDelete(); cb.checked ? dd.add(key) : dd.delete(key); saveDelete(dd); drawReview(); drawBrowser(); });
    l.append(cb, 'Delete'); r.appendChild(l); list.appendChild(r);
  };
  const seen = new Set();
  for (const f of TREE[1]) {
    if (!Array.isArray(f[1])) continue;
    const h = document.createElement('h4'); h.textContent = f[0]; if (f[2]) h.style.setProperty('--c', f[2]); list.appendChild(h);
    for (const id of f[1]) {
      if (!LIBRARY[id] || seen.has(id)) continue; seen.add(id);
      const B = banks[LIBRARY[id].bank || id], pack = isPack(id) && B?.from;
      let open = null;
      if (pack) {
        open = document.createElement('button'); open.textContent = revOpen.has(id) ? `▾ ${B.from.length}` : `▸ ${B.from.length}`;
        open.addEventListener('click', () => { revOpen.has(id) ? revOpen.delete(id) : revOpen.add(id); drawReview(); });
      }
      row(id, LIBRARY[id].name, `${libTag(id)} · ${pack ? 'pack' : 'instrument'}`, () => revPlay({ lib: id }), false, open, { lib: id });
      if (pack && revOpen.has(id) && !d.has(id)) B.from.forEach((nm, k) => { const ch = { from: { lib: id }, k, label: nm }; row(`${id}#${k}`, shortName(nm), libTag(id, nm), () => revPlay(ch), true, null, ch); });
    }
  }
  list.scrollTop = y;
  $('revCount').textContent = (revLoopKey ? `🔁 ${revName(revLoopKey)}, at ${S.bpm} BPM · ` : '') + (d.size ? `${d.size} ticked` : 'Nothing ticked');
  for (const id of ['revSend', 'revCopy', 'revClear']) $(id).disabled = !d.size;
}
// 🔁: the sound looped, at the tempo playing: a loop with a tempo is stretched (drums beat sliced) just as
// in the Loops, so it sounds here as it will there. Tap again (or another) to stop.
let revLoopV = null, revLoopKey = null, revSeq = 0;
function revLoopStop() { revLoopV?.stop?.(ctx.currentTime); revLoopV = revLoopKey = null; }
async function revLoop(c, key) {
  ctx.resume(); stopPv();
  const was = revLoopKey; revLoopStop();
  if (was === key) { drawReview(); status(''); return; }
  const n = ++revSeq, base = await slotOf(c); if (!base || n !== revSeq) return;      // a later tap wins
  const sl = { ...base, params: { ...base.params, trig: 'loop', vol: Math.max(base.params.vol, 0.5) } }, x = sl.slices?.[0];
  if (x?.bpm) await stretchFor(sl, [S.root]);
  if (n !== revSeq) return;
  stopPv(); revLoopStop();
  revLoopV = playNote(eng, sl, -1, sl.kind === 'chop' ? 0 : 7, ctx.currentTime + 0.02, { scale: S.scale, bpm: S.bpm, root: S.root, hold: true });
  revLoopKey = key; drawReview();
  status(x?.bpm ? `Looping at ${S.bpm} BPM, as in the Loops (it was made at ${Math.round(x.bpm)} BPM${sl.drumLoop ? '; drums are sliced to the tempo' : ''}). Tap again to stop.` : 'Looping it. Tap again to stop.');
}
async function revPlay(c) {
  ctx.resume(); stopPv(); if (revLoopV) { revLoopStop(); drawReview(); }
  const n = ++revSeq, slot = await slotOf(c); if (!slot || n !== revSeq) return;      // a later tap wins
  hearPv(slot, slot.kind === 'chop' ? 0 : 7);
}
const revText = () => 'Please delete these sounds from Pocket Sampler for good:\n\n' + [...toDelete()].map(k => `- ${k}: ${revName(k)}`).join('\n');
$('revClose').addEventListener('click', () => { revLoopStop(); stopPv(); $('revBox').hidden = true; drawBrowser(); });
$('revClear').addEventListener('click', () => { if (confirm('Untick every sound?')) { saveDelete(new Set()); drawReview(); drawBrowser(); } });
$('revCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(revText()); status('The list is copied: paste it in your chat with Claude.'); }
  catch (e) { prompt('Copy this, and paste it in your chat with Claude:', revText()); }
});
$('revSend').addEventListener('click', () => {
  const n = toDelete().size, url = 'https://github.com/munkachy/Monastic-games/issues/new?title=' + encodeURIComponent(`Pocket Sampler: delete ${n} sound${n > 1 ? 's' : ''}`) + '&body=' + encodeURIComponent(revText());
  window.open(url, '_blank');
  status('A GitHub issue opens with the list: tap Submit there, then tell Claude it is waiting.');
});
function drawBrowser() {
  const crumbs = $('crumbs'); crumbs.textContent = '';
  bPath.forEach((node, i) => {
    if (i) crumbs.append(' › ');
    const b = document.createElement('button'); b.textContent = node[0];
    b.addEventListener('click', () => { bPath = bPath.slice(0, i + 1); bSel = null; drawBrowser(); });
    crumbs.appendChild(b);
  });
  const node = bPath[bPath.length - 1], list = $('blist'); list.textContent = '';
  if (node[1] === 'shared') { drawShared(list); $('bTools').textContent = ''; $('bLoad').disabled = true; return; }
  const items = itemsOf(node);
  if (!items.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = EMPTY[node[0]] || 'Nothing here yet.'; list.appendChild(p); }
  for (const it of items) {
    const b = document.createElement('button'), small = document.createElement('small');
    if (Array.isArray(it)) {
      b.textContent = '▸ ' + it[0];
      if (it[2]) { b.classList.add('folder'); b.style.setProperty('--c', it[2]); }
      const n = typeof it[1] === 'string' ? (it[1] === 'songs' ? SONGS.length : it[1] === 'favs' ? favChoices().length
        : it[1].startsWith('hits:') ? (banks ? hitItems(it[1].slice(5)).length : 0)
        : it[1] === 'mine:pack' ? mine.filter(m => m.type === 'pack').length : it[1] === 'shared' ? (shared ? shared.length : '') : mine.filter(m => m.item).length) : count(it);
      small.textContent = n ? `${n}` : '';
      b.addEventListener('click', () => { bPath.push(it); bSel = null; drawBrowser(); });
    } else {
      b.textContent = selName(it).replace(/ \(from .*\)$/, '');
      const tag = choiceTag(it), fav = favKey(it) && favs().some(x => x.key === favKey(it));
      small.textContent = (fav ? '★ ' : '') + (tag ? tag + ' · ' : '') + (it.song ? it.song.about : it.k != null ? `key ${it.k + 1}`
        : it.mine ? (it.mine.type === 'pack' ? `pack · ${it.mine.item.slices?.length || 0} sounds` : it.mine.type === 'loop' ? `my loop · ${it.mine.folder}` : 'my sound')
        : selPack(it) ? 'pack' : 'instrument');
      small.title = tag.split(' + ').map(t => `${t}: ${TAG_ABOUT[t]}`).join('; ');
      b.classList.toggle('sel', !!bSel && same(bSel, it));
      b.addEventListener('click', () => { bSel = it; drawBrowser(); preview(it); });
    }
    b.appendChild(small); list.appendChild(b);
  }
  // tools for the place you're in
  const tools = $('bTools'); tools.textContent = '';
  const tool = (label, fn, go) => { const b = document.createElement('button'); b.textContent = label; if (go) b.className = 'go'; b.addEventListener('click', fn); tools.appendChild(b); };
  if (node === TREE) tool('🗑 Review the library', openReview);
  if (node[1] === 'mine:all') {
    tool('⬆ Import a file', () => $('importFile').click(), true);
    tool('Make a pack', openPackMaker);
    tool('⬆ Share as a pack file', () => { const all = mine.filter(m => m.item); if (!all.length) { status('Nothing in My Sounds yet.'); return; } const name = prompt(`All ${all.length} of your sounds, in one pack file. Name it:`, 'My sounds'); if (name?.trim()) sharePack(packOf({ name: name.trim(), ids: all.map(m => m.id) })); });
    tool('☁ Send to the library', () => openSend());
  }
  $('bLoad').disabled = !bSel;
  const isFav = bSel && favs().some(x => x.key === favKey(bSel));
  $('bFav').disabled = !bSel || !favKey(bSel); $('bFav').textContent = isFav ? '★ Favorite' : '☆ Favorite';
  $('bFav').classList.toggle('on', !!isFav);
  $('bSave').disabled = !bSel || !!bSel.song || !!bSel.mine;
  $('bLoad').textContent = bSel?.song ? `Load the song (sounds 1–8, all patterns)` : bSel ? `Load ${selName(bSel).replace(/ \(from .*\)$/, '')} onto sound ${S.cur + 1}` : `Choose a sound for sound ${S.cur + 1}`;
  // second button: open a pack, or rename / delete one of yours
  const more = $('bMore');
  more.hidden = !bSel || !(selPack(bSel) || bSel.mine);
  more.textContent = bSel && selPack(bSel) ? 'Open pack ▸' : 'Rename / delete';
}
// The two sides stay apart: drum kits and percussion only on the drum pads (9-16),
// instruments only on 1-8. Anything else (vocals, FX, stabs, loops) goes on either.
const isKitLib = id => KITS_MENU.some(([, ids]) => ids.includes(id)) || ['percussion', 'shakers', 'bells2'].includes(id);
const isInstLib = id => !!(LIBRARY[id]?.synth || LIBRARY[id]?.multi);
function sideRefuses(c) {
  if (!c.lib) return '';
  if (isKitLib(c.lib) && !drumSide(S.cur)) return `${LIBRARY[c.lib].name} is drums: they go on the drum pads. Sound, Sound again (🥁 Drums), tap a kit, then load it.`;
  if (isInstLib(c.lib) && drumSide(S.cur)) return `${LIBRARY[c.lib].name} is an instrument: it goes on sounds 1–8. Sound (🎹 Instr.), tap one, then load it.`;
  return '';
}

// What a sound is: SYN played by the synth as you play; REC a recording (a sample) of a real
// instrument or machine; GEN made in code beforehand, then played as a recording (the 808 and 909
// kits, rolled sounds, vinyl and risers, the robot voice, the loops written for the app); MINE yours.
const GEN_BANKS = new Set(['drumloops', 'grooves', 'hype', 'sirens', ...Object.keys(LIBRARY).filter(id => /^(ebb|vig)/.test(id))]);
const GEN_MULTI = new Set(['nylon', 'steelgtr', 'twelve', 'steeldrum', 'vigstrings', 'vigswarm', 'vigchant', 'vigcloister', 'vighowl', 'viglauds', 'vigbell', 'vigglass']);
const GEN_SLICES = { ambience: ['Rain', 'Respirator'], airwater: ['Respirator', 'Respirator 2'],
  noisefx: ['Riser', 'Short riser', 'Downlifter'] };
const TAG_ABOUT = { SYN: 'synthesized as you play', REC: 'a recording', GEN: 'made in code', MINE: 'yours' };
function libTag(id, name) {
  const F = LIBRARY[id]; if (!F) return 'MINE';
  if (F.synth) return 'GEN';
  if (F.kit || GEN_BANKS.has(id) || GEN_MULTI.has(id)) return 'GEN';
  if (name != null) return GEN_SLICES[id]?.includes(name) ? 'GEN' : 'REC';
  return GEN_SLICES[id] ? 'REC + GEN' : 'REC';
}
const slotTag = sl => (!sl ? '' : sl.kind === 'synth' ? 'SYN' : sl.factory != null ? libTag(sl.factory) : sl.made || 'MINE');
function choiceTag(c) {
  if (c.song) return 'GEN';
  if (c.lib) return libTag(c.lib);
  if (c.mine) return 'MINE';
  if (c.from?.lib) return libTag(c.from.lib, c.label);
  return '';
}

// Favorites: built-in sounds (and single sounds of packs) you star, kept on this device.
const favKey = c => (c.lib ? 'lib:' + c.lib : c.from?.lib ? `pack:${c.from.lib}:${c.k}` : c.mine ? 'mine:' + c.mine.id : null);
const favs = () => { try { return JSON.parse(localStorage.getItem('pocketFavs') || '[]'); } catch (e) { return []; } };
function toggleFav(c) {
  const key = favKey(c); if (!key) return;
  let f = favs(); const on = f.some(x => x.key === key);
  f = on ? f.filter(x => x.key !== key) : [...f, { key, label: selName(c).replace(/ \(from .*\)$/, '') }];
  try { localStorage.setItem('pocketFavs', JSON.stringify(f)); } catch (e) {}
  status(on ? 'Taken out of Favorites.' : 'Added to Favorites (Menu › Sounds › ★ Favorites).');
}
function favChoices() {
  return favs().map(({ key, label }) => {
    const [t, a, b] = key.split(':');
    if (t === 'lib' && LIBRARY[a]) return { lib: a };
    if (t === 'pack' && LIBRARY[a]) return { from: { lib: a }, k: +b, label };
    if (t === 'mine') { const m = mine.find(x => x.id === a); return m && { mine: m }; }
    return null;
  }).filter(Boolean);
}
const same = (a, b) => (a.song && a.song === b.song) || (a.lib && a.lib === b.lib) || (a.mine && b.mine && a.mine.id === b.mine.id) || (a.k != null && a.k === b.k && a.from === b.from);
const count = node => (Array.isArray(node[1]) ? node[1].reduce((n, it) => n + (Array.isArray(it) ? count(it) : LIBRARY[it] ? 1 : 0), 0) : 0);
// The sound a choice stands for, as a slot (built once and kept).
async function slotOf(c) {
  if (c.lib) { if (!previews.has(c.lib)) previews.set(c.lib, factorySlot(c.lib)); return previews.get(c.lib); }
  if (c.mine) return unpackSlot(c.mine);
  return sliceAlone(await slotOf(c.from), c.k, c.label);
}
// One sound heard at a time in the browser and in Review the library: a new one stops the last at once.
let pvVoice = null;
function stopPv() { pvVoice?.stop?.(ctx.currentTime); pvVoice = null; }
function hearPv(slot, k, opts = {}) {
  stopPv(); if (revLoopV) { revLoopStop(); if (!$('revBox').hidden) drawReview(); }
  pvVoice = playNote(eng, slot, -1, k, ctx.currentTime + 0.005, { scale: S.scale, bpm: S.bpm, root: S.root, ...opts });
  return pvVoice;
}
async function preview(c) {
  if (c.song) { status(`${c.song.name} by ${c.song.by}: ${c.song.about}. Load puts the whole song on sounds 1–8 and in the patterns.`); return; }
  stopPv();
  const slot = await slotOf(c);
  if (bSel === c) hearPv(slot, slot.kind === 'chop' ? 0 : 7);
}
// Clear in Sound mode: the sound comes off its key (silent, "empty") and its
// notes out of every pattern. ↶ Undo puts it back.
function clearSlot(si) {
  checkpoint();
  for (const [id, h] of looping) if (+id.split(':')[0] === si) { h.voice?.stop(ctx.currentTime); looping.delete(id); }
  S.slots[si] = { factory: null, kind: 'chop', name: 'Empty', params: defParams(), slices: [] };
  S.patterns = S.patterns.map(p => p.map(st => st.filter(n => n.s !== si)));
  syncPanel(); dirty(); draw();
  status(`Sound ${si + 1} cleared: empty, and out of the patterns. Load a sound onto it from Menu › Sounds. ↶ Undo brings it back.`);
}
// Get every loop stretched for the tempo and the keys in use, before it is needed.
function warmLoops() {
  const roots = new Set([S.root, ...S.patKeys.filter(Boolean).map(k => k.root)]), jobs = [];
  for (const sl of S.slots) if (sl?.slices) for (const x of sl.slices) if (x.bpm || sl.bpm) for (const root of roots) {
    const f = loopStretch({ bpm: x.bpm || sl.bpm }, sl.params, S.bpm, root);
    if (Math.abs(f - 1) > 0.002) jobs.push(stretchLoop(x.buf || sl.buf, x.s, x.e, f, sl.drumLoop ? x.bpm || sl.bpm : 0));
  }
  return Promise.all(jobs);
}
let warmTimer = 0;
const warmSoon = () => { clearTimeout(warmTimer); warmTimer = setTimeout(warmLoops, 250); };
// Songs: written for the app (tools/songs.py) from its own sounds: which
// sound goes on which key, and the notes, one pattern a bar, chained in order.
const SONGS = [
  { id: 'electroboombap', name: 'Electro Boom Bap', by: 'Claude', about: '8 bars · 92 BPM · F minor' },
];
async function loadSong(id, given = null) {          // given: the song itself (the loop-set tool renders its loops so)
  ctx.resume();
  status('Loading the song…');
  try {
    const P = given || await (await fetch(`sounds/songs/${id}.json`)).json();
    const slots = await Promise.all(P.sounds.map(async so => {
      const sl = await factorySlot(so.factory);
      if (so.vol != null) sl.params.vol = so.vol * 0.25;      // songs were written when sounds started at 80%; now 20%
      if (so.trig) sl.params.trig = so.trig;
      return sl;
    }));
    if (playing) stop();
    checkpoint();
    P.sounds.forEach((so, i) => { S.slots[so.slot] = slots[i]; S.lastKey[so.slot] = 0; S.oct[so.slot] = 0; });
    const vol = new Map(P.sounds.map((so, i) => [so.slot, slots[i].params.vol]));
    S.patterns = Array.from({ length: 16 }, (_, p) => {
      const bar = Array.from({ length: 16 }, () => []);
      for (const [st, s, k, x = {}] of P.patterns[p] || []) {
        const lock = x.vol != null || x.pitch != null ? { ...(x.vol != null && { vol: vol.get(s) * x.vol }), ...(x.pitch != null && { pitch: x.pitch }) } : undefined;
        bar[st].push({ s, k, ...(x.d && { d: x.d }), ...(x.oc && { oc: x.oc }), ...(x.o && { o: x.o }), ...(lock && { lock }) });     // o: played just after the step (a drummer's timing)
      }
      return bar;
    });
    S.fx = Array.from({ length: 16 }, () => new Array(16).fill(null)); S.patKeys = new Array(16).fill(null);
    S.chain = P.chain; S.pat = P.chain[0]; S.bpm = P.bpm; S.swing = P.swing ?? 50; S.root = P.root; S.scale = P.scale;
    S.cur = P.sounds[0].slot;
    syncPanel(); dirty(); draw(); warmLoops();
    status(`${P.name} (${P.about}): ${P.sounds.length} sounds, ${P.patterns.length} bars chained. ▶ Play. ↶ Undo brings back what you had.`);
  } catch (e) { status('Could not load the song: ' + e.message); console.error(e); }
}
async function loadLibrary(id) {
  checkpoint();
  S.slots[S.cur] = await factorySlot(id); S.lastKey[S.cur] = 0;
  syncPanel(); dirty(); draw();
  status(`${LIBRARY[id].name} → sound ${S.cur + 1}.`);
}
$('bLoad').addEventListener('click', async () => {
  if (!bSel) return;
  if (bSel.song) { closeMenu(); await loadSong(bSel.song.id); return; }
  const no = sideRefuses(bSel);
  if (no) { status(no); return; }
  if (bSel.lib) await loadLibrary(bSel.lib);
  else {
    checkpoint();
    S.slots[S.cur] = await slotOf(bSel); S.lastKey[S.cur] = S.cur < 8 && S.slots[S.cur].kind === 'sample' ? 7 : 0;
    syncPanel(); dirty(); draw(); status(`${S.slots[S.cur].name} → sound ${S.cur + 1}.`);
  }
  closeMenu(); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime + 0.01);
});
$('bFav').addEventListener('click', () => { if (bSel) { toggleFav(bSel); drawBrowser(); } });
$('bSave').addEventListener('click', async () => { if (bSel && !bSel.song) { await saveMine(await slotOf(bSel), selName(bSel).replace(/ \(from .*\)$/, '')); drawBrowser(); } });
$('bMore').addEventListener('click', async () => {
  if (!bSel) return;
  if (selPack(bSel)) {               // open the pack: its 16 sounds, each loadable alone
    const from = bSel, slot = await slotOf(from);
    const node = [selName(from), []];
    node.contents = slot.slices.map((sl, k) => sl && { from, k, label: sl.name || `sound ${k + 1}` }).filter(Boolean);
    bPath.push(node); bSel = null; drawBrowser(); return;
  }
  const m = bSel.mine, name = prompt(`Rename "${m.name}" (leave empty to delete it):`, m.name);
  if (name === null) return;
  if (!name.trim()) { if (confirm(`Delete "${m.name}" from My Sounds?`)) { await idbDel('mine', m.id); status(`"${m.name}" deleted.`); } }
  else { m.name = name.trim(); m.item.name = m.name; await idbPut('mine', m, m.id); }
  bSel = null; await refreshMine(); drawBrowser();
});

// One sound of a pack, on its own: its slice copied into a sound of its own.
function sliceAlone(slot, k, label) {
  const sl = slot.slices[k], src = sl.buf || slot.buf, r = src.sampleRate;
  const a = Math.round(sl.s * r), b = Math.max(a + 1, Math.round(sl.e * r));
  const buf = ctx.createBuffer(1, b - a, r); buf.copyToChannel(src.getChannelData(0).subarray(a, b), 0);
  if (slot.params.trig === 'loop' || sl.bpm)       // a loop stays a loop: on key 1, keeping its tempo
    return { factory: null, kind: 'chop', contiguous: false, name: label, params: { ...defParams(), trig: 'loop' }, buf, ...(slot.drumLoop && { drumLoop: true }),
      slices: [{ s: 0, e: buf.duration, name: label, ...(sl.bpm && { bpm: sl.bpm, bars: sl.bars }) }] };
  const drum = ['kick', 'snare', 'hat', 'open', 'tom', 'conga', 'bongo', 'shaker', 'crash', 'ride'].some(r => hasRole(slot, r));
  return { factory: null, kind: 'sample', name: label, params: { ...defParams(), choke: true, ...(drum && { drum: true }) }, buf };
}

// ---------------------------------------------------------------------------
// My Sounds. A sound is stored whole: its settings and its audio (one or more
// buffers, as raw samples), so it loads anywhere, in any project.
// ---------------------------------------------------------------------------
function packSlot(sl) {
  const bufs = [], at = new Map();
  const ref = b => { if (!b) return null; if (!at.has(b)) { at.set(b, bufs.length); bufs.push({ rate: b.sampleRate, data: b.getChannelData(0).slice() }); } return at.get(b); };
  return { kind: sl.kind, params: { ...sl.params }, synth: sl.synth, zones: sl.zones, base: sl.base, contiguous: sl.contiguous, bpm: sl.bpm, credit: sl.credit, drumLoop: sl.drumLoop,
    ...(sl.holdLoop && { holdLoop: true }), ...(sl.level && { level: sl.level }), ...(sl.made && { made: sl.made }),
    buf: ref(sl.buf), slices: sl.slices?.map(x => ({ ...x, buf: ref(x.buf) })), bufs };
}
function unpackSlot(m) {
  const it = m.item, B = it.bufs.map(b => { const a = ctx.createBuffer(1, b.data.length, b.rate); a.copyToChannel(b.data, 0); return a; });
  return { factory: null, name: m.name, kind: it.kind, params: params(it.params), synth: it.synth, zones: it.zones, base: it.base, bpm: it.bpm, credit: it.credit,
    ...(it.holdLoop && { holdLoop: true }), ...(it.level && { level: it.level }), ...(it.made && { made: it.made }),
    ...((it.drumLoop || m.folder === 'Beats') && { drumLoop: true }),
    contiguous: it.contiguous, buf: it.buf != null ? B[it.buf] : null, slices: it.slices?.map(x => ({ ...x, buf: x.buf != null ? B[x.buf] : null })) };
}
async function saveMine(slot, name, type = 'sound') {
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  name = prompt('Name it:', name);
  if (!name || !name.trim()) return;
  const id = 'm' + Date.now().toString(36);
  await idbPut('mine', { id, name: name.trim(), type, created: Date.now(), item: packSlot(slot) }, id);
  await refreshMine(); status(`"${name.trim()}" saved to My Sounds.`);
}
$('saveMine').addEventListener('click', () => saveMine(S.slots[S.cur], S.slots[S.cur].name));

// Import: WAV, MP3, or the sound of a video (a screen recording); it opens in the editor.
$('importFile').addEventListener('change', async () => {
  const f = $('importFile').files[0]; $('importFile').value = ''; if (!f) return;
  if (/\.json$/i.test(f.name) || f.type === 'application/json') {          // a pack file
    try { await openPackFile(f); } catch (e) { status(`Could not open ${f.name}: ${e.message}`); log('error', 'pack: ' + e.message); }
    return;
  }
  status(`Reading ${f.name}…`);
  try {
    let raw;
    try { raw = await decode(await f.arrayBuffer()); }
    catch (e) { log('import', `decode failed (${e.message || e}); playing it through to capture the sound`); raw = await captureMedia(f); }
    const buf = prepare(ctx, raw, { trim: true, peak: 0.9 });
    closeMenu(); openEditor(buf, [], f.name.replace(/\.[^.]+$/, ''));
    status(`${f.name}: ${buf.duration.toFixed(1)} s. Crop it, then put it on a sound or save it.`);
  } catch (e) { status(`Could not read the sound in ${f.name}. ${/video/.test(f.type) ? 'This video’s sound may be in a format the browser can’t open.' : ''}`); log('error', 'import: ' + e.message); }
});

// The backup route for a file the decoder can't open (some videos): play it,
// silently, through a <video> element and capture its sound as it plays.
// It takes as long as the clip.
function captureMedia(f) {
  return new Promise((ok, bad) => {
    const v = document.createElement('video'), url = URL.createObjectURL(f);
    v.playsInline = true; v.preload = 'auto'; v.src = url;
    const src = ctx.createMediaElementSource(v), sp = ctx.createScriptProcessor(4096, 1, 1), mute = ctx.createGain();
    mute.gain.value = 0; src.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
    const chunks = [];
    sp.onaudioprocess = e => { if (!v.paused) chunks.push(e.inputBuffer.getChannelData(0).slice()); };
    const done = err => {
      sp.disconnect(); src.disconnect(); mute.disconnect(); URL.revokeObjectURL(url); clearInterval(tk);
      if (err || !chunks.length) return bad(err || new Error('no sound in it'));
      const n = chunks.reduce((a, c) => a + c.length, 0), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      let o = 0; for (const c of chunks) { d.set(c, o); o += c.length; }
      ok(b);
    };
    const tk = setInterval(() => status(`Reading the sound of ${f.name}: ${v.currentTime.toFixed(0)} of ${(v.duration || 0).toFixed(0)} s…`), 500);
    v.addEventListener('ended', () => done());
    v.addEventListener('error', () => done(new Error('the browser cannot play this file')));
    ctx.resume(); v.play().catch(done);
  });
}

// Make a pack: up to 16 of your sounds, one per key.
function openPackMaker() {
  const sounds = mine.filter(m => m.type === 'sound'), list = $('packList'); list.textContent = '';
  if (!sounds.length) { status('Save some sounds to My Sounds first.'); return; }
  for (const m of sounds) {
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = '<input type="checkbox"> '; l.append(m.name); l.querySelector('input').value = m.id;
    list.appendChild(l);
  }
  $('packBox').hidden = false;
}
$('packList').addEventListener('change', e => {
  if ($('packList').querySelectorAll('input:checked').length > 16) { e.target.checked = false; status('A pack holds 16 sounds.'); }
});
$('packCancel').addEventListener('click', () => { $('packBox').hidden = true; });
$('packMake').addEventListener('click', async () => {
  const ids = [...$('packList').querySelectorAll('input:checked')].map(c => c.value);
  if (!ids.length) { status('Choose at least one sound.'); return; }
  const slices = [];
  for (const id of ids) {
    const m = mine.find(x => x.id === id), sl = unpackSlot(m);
    const buf = sl.buf || sl.slices?.find(x => x?.buf)?.buf;
    if (buf) slices.push({ buf, s: 0, e: buf.duration, name: m.name });
  }
  const name = $('packName').value.trim() || 'My pack', id = 'm' + Date.now().toString(36);
  const pack = { factory: null, kind: 'chop', name, params: defParams(), slices };
  await idbPut('mine', { id, name, type: 'pack', created: Date.now(), item: packSlot(pack) }, id);
  $('packBox').hidden = true; await refreshMine(); drawBrowser();
  status(`Pack "${name}" made: ${slices.length} sounds. It's in My Sounds and Packs › My packs.`);
});

// ---------------------------------------------------------------------------
// The editor. Works on one buffer: select (drag), crop, cut, cut points
// (where the keys split on sounds 9–16), then put it on a sound or save it.
// ---------------------------------------------------------------------------
const ed = { buf: null, cuts: [], sel: null, cur: 0, view: [0, 1], name: '', hist: [], src: null };
const edCv = $('edWave'), eg = edCv.getContext('2d');
for (let i = 0; i < 16; i++) $('edTarget').add(new Option(`Sound ${i + 1}`, i));
function openEditor(buf, cuts, name) {
  Object.assign(ed, { buf, cuts: [...cuts].filter(c => c > 0.001).sort((a, b) => a - b), sel: null, cur: 0, view: [0, buf.duration], name, hist: [] });
  $('edTarget').value = S.cur; $('edTitle').textContent = '✂ ' + name;
  $('editor').hidden = false; drawEd();
}
// The sound to edit from the current key: its own recording if it has one;
// otherwise (instruments, kits, synths) the last note played, recorded.
async function editCurrent() {
  const sl = S.slots[S.cur]; if (!sl) return;
  if (sl.kind === 'sample') return openEditor(sl.buf, [], sl.name);
  if (sl.kind === 'chop' && sl.buf && sl.slices.every(x => !x.buf)) return openEditor(sl.buf, sl.slices.map(x => x.s), sl.name);
  status('Recording the last note played…');
  const buf = await renderNote(S.cur, S.lastKey[S.cur]);
  status(''); openEditor(buf, [], `${sl.name} key ${S.lastKey[S.cur] + 1}`);
}
async function renderNote(si, k) {
  const off = new OfflineAudioContext(1, SR * 4, SR), e = new Engine(off, { live: false });
  const key = keyFor(S.slots[si], { root: S.root, scale: S.scale });
  playNote(e, S.slots[si], si, k, 0.01, { scale: key.scale, bpm: S.bpm, root: key.root });
  return prepare(ctx, await off.startRendering(), { trim: true, peak: 0.9 });
}
$('editSound').addEventListener('click', () => { closeMenu(); editCurrent(); });
$('edClose').addEventListener('click', () => { edStop(); $('editor').hidden = true; });
const edX = t => (t - ed.view[0]) / (ed.view[1] - ed.view[0]) * edCv.width;
const edT = x => ed.view[0] + x / edCv.clientWidth * (ed.view[1] - ed.view[0]);
function drawEd() {
  const dpr = devicePixelRatio || 1, W = edCv.clientWidth * dpr, H = edCv.clientHeight * dpr;
  if (edCv.width !== W || edCv.height !== H) { edCv.width = W; edCv.height = H; }
  eg.clearRect(0, 0, W, H);
  const x = ed.buf.getChannelData(0), r = ed.buf.sampleRate, [v0, v1] = ed.view;
  eg.fillStyle = cssVar('--lcd-ink');
  if (ed.sel) { eg.globalAlpha = 0.2; eg.fillRect(edX(ed.sel[0]), 0, edX(ed.sel[1]) - edX(ed.sel[0]), H); eg.globalAlpha = 1; }
  for (let px = 0; px < W; px++) {
    const a = Math.floor((v0 + (v1 - v0) * px / W) * r), b = Math.max(a + 1, Math.floor((v0 + (v1 - v0) * (px + 1) / W) * r));
    let lo = 0, hi = 0; for (let i = a; i < b; i += Math.max(1, ((b - a) / 40) | 0)) { const v = x[i] || 0; if (v < lo) lo = v; if (v > hi) hi = v; }
    eg.fillRect(px, H / 2 - hi * H * 0.48, 1, Math.max(1, (hi - lo) * H * 0.48));
  }
  eg.font = `${10 * dpr}px ui-monospace, monospace`;
  [0, ...ed.cuts].forEach((c, i) => { eg.fillStyle = classic() ? '#c21b1b' : '#ff4d5e'; eg.fillRect(edX(c), 0, Math.max(1, dpr), H); eg.fillText(String(i + 1), edX(c) + 2 * dpr, 11 * dpr); });
  eg.fillStyle = classic() ? '#1f7ae0' : '#4da3ff'; eg.fillRect(edX(ed.cur), 0, 2 * dpr, H);
  const sel = ed.sel ? `${ed.sel[0].toFixed(2)}–${ed.sel[1].toFixed(2)} s selected` : `point at ${ed.cur.toFixed(2)} s`;
  $('edInfo').textContent = `${ed.buf.duration.toFixed(2)} s · ${sel} · ${ed.cuts.length + 1} piece${ed.cuts.length ? 's' : ''}`;
  $('edPut').textContent = `Put ${ed.sel ? 'selection' : 'it'} on sound`;
}
let edDrag = null;
edCv.addEventListener('pointerdown', ev => { capture(edCv, ev); const x = along(edCv, ev) * edCv.clientWidth; edDrag = { x, t: edT(x) }; });
edCv.addEventListener('pointermove', ev => {
  const x = along(edCv, ev) * edCv.clientWidth;
  if (!edDrag || Math.abs(x - edDrag.x) < 5) return;
  const t = Math.max(0, Math.min(ed.buf.duration, edT(x)));
  ed.sel = [Math.min(edDrag.t, t), Math.max(edDrag.t, t)]; drawEd();
  edPlay(t, 0.12);                                         // hear where you are
});
edCv.addEventListener('pointerup', ev => {
  const x = along(edCv, ev) * edCv.clientWidth;
  if (edDrag && Math.abs(x - edDrag.x) < 5) { ed.sel = null; ed.cur = Math.max(0, edT(x)); edPlay(ed.cur, 0.6); drawEd(); }
  edDrag = null;
});
let edSrc = null;
function edStop() { try { edSrc?.stop(); } catch (e) {} edSrc = null; }
function edPlay(from, dur) {
  edStop(); ctx.resume();
  const s = ctx.createBufferSource(); s.buffer = ed.buf; s.connect(eng.dry); s.start(ctx.currentTime, Math.max(0, from), dur); edSrc = s;
}
$('edPlay').addEventListener('click', () => ed.sel ? edPlay(ed.sel[0], ed.sel[1] - ed.sel[0]) : edPlay(ed.cur, ed.buf.duration - ed.cur));
$('edStop').addEventListener('click', edStop);
$('edZoom').addEventListener('click', () => {
  const [v0, v1] = ed.view, w = (v1 - v0) / 3;
  ed.view = ed.sel ? [ed.sel[0], ed.sel[1]] : [Math.max(0, ed.cur - w / 2), Math.min(ed.buf.duration, ed.cur + w / 2)];
  if (ed.view[1] - ed.view[0] < 0.02) ed.view[1] = ed.view[0] + 0.02;
  drawEd();
});
$('edAll').addEventListener('click', () => { ed.view = [0, ed.buf.duration]; drawEd(); });
const edKeep = () => { ed.hist.push({ buf: ed.buf, cuts: [...ed.cuts] }); if (ed.hist.length > 30) ed.hist.shift(); };
$('edUndo').addEventListener('click', () => { const h = ed.hist.pop(); if (!h) return; Object.assign(ed, h, { sel: null, view: [0, h.buf.duration] }); drawEd(); });
// A new buffer from pieces [a, b) of the old one (seconds), with a 3 ms fade at each join.
function joinOf(parts) {
  const x = ed.buf.getChannelData(0), r = ed.buf.sampleRate, F = Math.round(r * 0.003);
  const segs = parts.map(([a, b]) => x.subarray(Math.round(a * r), Math.round(b * r)));
  const out = ctx.createBuffer(1, Math.max(1, segs.reduce((n, s) => n + s.length, 0)), r), y = out.getChannelData(0);
  let o = 0;
  for (const s of segs) { y.set(s, o); for (let i = 0; i < Math.min(F, s.length); i++) { y[o + i] *= i / F; y[o + s.length - 1 - i] *= i / F; } o += s.length; }
  return out;
}
$('edCrop').addEventListener('click', () => {
  if (!ed.sel) { status('Select a part first: drag across the wave.'); return; }
  const [a, b] = ed.sel; edKeep();
  ed.buf = joinOf([[a, b]]); ed.cuts = ed.cuts.filter(c => c > a && c < b).map(c => c - a);
  Object.assign(ed, { sel: null, cur: 0, view: [0, ed.buf.duration] }); drawEd();
});
$('edCut').addEventListener('click', () => {
  if (!ed.sel) { status('Select the part to cut out first.'); return; }
  const [a, b] = ed.sel; edKeep();
  ed.buf = joinOf([[0, a], [b, ed.buf.duration]]); ed.cuts = ed.cuts.filter(c => c < a || c > b).map(c => (c > b ? c - (b - a) : c));
  Object.assign(ed, { sel: null, cur: a, view: [0, ed.buf.duration] }); drawEd();
});
$('edAddCut').addEventListener('click', () => {
  const t = ed.sel ? ed.sel[0] : ed.cur;
  if (t < 0.005 || ed.cuts.some(c => Math.abs(c - t) < 0.005)) return;
  if (ed.cuts.length >= 15) { status('16 pieces at most: one per key.'); return; }
  edKeep(); ed.cuts = [...ed.cuts, t].sort((a, b) => a - b); drawEd();
});
$('edDelCut').addEventListener('click', () => {
  if (!ed.cuts.length) return;
  const t = ed.sel ? ed.sel[0] : ed.cur, i = ed.cuts.reduce((bi, c, j) => (Math.abs(c - t) < Math.abs(ed.cuts[bi] - t) ? j : bi), 0);
  edKeep(); ed.cuts = ed.cuts.filter((_, j) => j !== i); drawEd();
});
$('edAuto').addEventListener('click', () => { edKeep(); ed.cuts = onsets(ed.buf, 16).slice(1); drawEd(); });
$('edClearCuts').addEventListener('click', () => { edKeep(); ed.cuts = []; drawEd(); });
// What Put and Save use: the selection, or all of it, with its cut points.
function edResult() {
  if (!ed.sel) return { buf: ed.buf, cuts: ed.cuts };
  const [a, b] = ed.sel;
  return { buf: joinOf([[a, b]]), cuts: ed.cuts.filter(c => c > a && c < b).map(c => c - a) };
}
function slotFromEd(si, name) {
  const { buf, cuts } = edResult();
  if (si < 8 && !cuts.length) return { factory: null, kind: 'sample', name, params: { ...defParams(), choke: true }, buf };
  const st = [0, ...cuts];
  return { factory: null, kind: 'chop', contiguous: true, name, params: { ...defParams(), choke: true }, buf,
    slices: st.map((s, k) => ({ s, e: st[k + 1] ?? buf.duration, name: `piece ${k + 1}` })) };
}
$('edPut').addEventListener('click', () => {
  const si = +$('edTarget').value; checkpoint();
  S.slots[si] = slotFromEd(si, ed.name); S.lastKey[si] = S.slots[si].kind === 'sample' ? 7 : 0;
  S.cur = si; syncPanel(); dirty(); draw();
  status(`On sound ${si + 1}${S.slots[si].kind === 'chop' ? `, ${S.slots[si].slices.length} pieces on keys 1–${S.slots[si].slices.length}` : ''}.`);
  noteOn(eng, si, S.lastKey[si], ctx.currentTime + 0.01);
});
$('edSave').addEventListener('click', () => saveMine(slotFromEd(+$('edTarget').value, ed.name), ed.name));

// The Menu: over the keys, so nothing on the playing screen has to scroll.
function openMenu(tab) {
  $('menu').hidden = false;
  if (tab) document.querySelector(`[data-tab="${tab}"]`).click();
  drawBrowser(); refreshMine().then(drawBrowser);
}
function closeMenu() { $('menu').hidden = true; draw(); setTimeout(freeUnused, 500); }
// Sounds only tried in the browser are let go (their audio, a few MB each, is freed), keeping
// those on the pads and in the Loops grid.
function freeUnused() {
  previews.clear(); bSel = null;
  if (!banks) return;
  const used = new Set();
  for (const sl of S.slots) if (sl) { used.add(sl.buf); for (const x of sl.slices || []) used.add(x.buf); }
  const gridBanks = new Set(S.grid.cells.flat().filter(Boolean).map(c => LIBRARY[c.lib]?.bank || LIBRARY[c.lib]?.multi));
  for (const [id, B] of Object.entries(banks)) if (B.buf && !used.has(B.buf) && !gridBanks.has(id)) delete B.buf;
}
$('menuBtn').addEventListener('click', () => openMenu());
$('menuClose').addEventListener('click', stopPreview);
$('menuClose').addEventListener('click', () => stopLine());
$('menuClose').addEventListener('click', closeMenu);

// ---------------------------------------------------------------------------
// Custom buttons: four small buttons whose job you choose (Menu › Buttons).
// An effect works while the button is held, like an FX key.
// ---------------------------------------------------------------------------
const THEMES = [['rhythm', 'Rhythm (red)'], ['pitch', 'Pitch and key (purple)'], ['sound', 'The sound (amber)'], ['voice', 'Voice (blue)']];
const ACTIONS = {
  mute: { th: 'rhythm', name: 'Mute drums', label: () => 'Mute', on: () => !!S.muteBeat, tap: () => toggleMute() },
  beat: { th: 'rhythm', name: 'Vary the beat (the same beat, a small change)', label: () => '🎲 Vary', tap: () => varyBeat() },
  newbeat: { th: 'rhythm', name: 'New beat (in the style chosen on the Rhythm page)', label: () => '🎲 New', tap: () => genBeat() },
  chain: { th: 'rhythm', name: 'Chain: tap, choose patterns, tap again (twice with none: unchain)', label: () => (chainEdit ? 'Done' : 'Chain'), on: () => chainEdit, tap: () => setChainEdit(!chainEdit) },
  beats: { th: 'rhythm', name: 'Rhythm (open the Rhythm page: kit, beat, bass)', label: () => 'Rhythm', tap: () => openMenu('tBeat') },
  octdown: { th: 'pitch', name: 'Octave down', label: () => (octOf(S.cur) < 0 ? `Oct ${octOf(S.cur)}` : 'Oct −'), on: () => octOf(S.cur) < 0, tap: () => shiftOct(-1) },
  octup: { th: 'pitch', name: 'Octave up', label: () => (octOf(S.cur) > 0 ? `Oct +${octOf(S.cur)}` : 'Oct +'), on: () => octOf(S.cur) > 0, tap: () => shiftOct(1) },
  key: { th: 'pitch', name: 'Key wheel', label: () => 'Key', tap: () => ($('wheel').hidden ? openWheel() : closeWheel()) },
  nextkey: { th: 'pitch', name: 'Next key', label: () => 'Key ▸', tap: () => nextKey() },
  roll: { th: 'sound', name: 'Roll a sound', label: () => '🎲 Roll', tap: () => roll(false) },
  edit: { th: 'sound', name: 'Edit sound', label: () => '✂ Edit', tap: () => editCurrent() },
  clear: { th: 'sound', name: 'Clear (the pattern; in Sound mode, the sound)', label: () => 'Clear', tap: () => (S.mode === 'sound' ? clearSlot(S.cur) : $('clearPat').click()) },
  makeloop: { th: 'sound', name: 'Make a loop (the pattern or chain, into the library)', label: () => '⟳ Loop', tap: () => openMakeLoop() },
  export: { th: 'sound', name: 'Export loop', label: () => '⬆ Export', tap: () => openExport() },
  looprec: { th: 'sound', name: 'Loop rec: record what you play over the beat, straight into a loop', label: () => lrLabel(), on: () => !!lrTake, tap: () => lrTap() },
  rap: { th: 'voice', name: 'Rap it: the words typed, on this sound', label: () => '🎤 Rap', tap: () => $('rapIt').click() },
  newflow: { th: 'voice', name: 'New flow for the rap on this sound', label: () => '🎲 Flow', tap: () => $('rapNew').click() },
  hearrap: { th: 'voice', name: 'Hear the rap on its own', label: () => (rapPv ? '■ Stop' : '▶ Rap'), on: () => !!rapPv, tap: () => hearRap() },
  voice: { th: 'voice', name: 'Robot voice (open the Voice page)', label: () => '🤖 Voice', tap: () => openMenu('tVoice') },
  robot: { th: 'voice', name: 'Robot pads: type words on the pads', label: () => (S.mode === 'robot' ? '🤖 Done' : '🤖 Robot'), on: () => S.mode === 'robot', tap: () => toggleRobot() },
  ...Object.fromEntries(Object.entries(FX).map(([id, [n]]) => [`fx:${id}`, { th: 'fx', name: `FX: ${n}`, label: () => n, fx: id, on: () => activeFx.has(id) }])),
};
const DEFAULT_CUSTOM = DEFAULT_CUSTOM_IDS;
const customs = [...document.querySelectorAll('button.custom')];
customs.forEach((b, i) => {
  const act = () => ACTIONS[S.custom[i]] || ACTIONS[DEFAULT_CUSTOM[i]];
  b.addEventListener('pointerdown', ev => {
    const a = act(); if (a.fx == null) return;
    ev.preventDefault(); capture(b, ev); ctx.resume();
    if (S.fxLatch && activeFx.has(a.fx)) releaseFx(a.fx); else engageFx(a.fx, aimNow());
    b.classList.add('held'); draw();
  });
  const up = () => {
    const a = act(); b.classList.remove('held');
    if (a.fx != null && !S.fxLatch && activeFx.has(a.fx)) { releaseFx(a.fx); draw(); }
  };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('click', () => { const a = act(); if (a.fx == null) { ctx.resume(); a.tap(); draw(); } });
});
for (let i = 0; i < customs.length; i++) {
  const sel = $('cb' + i);
  for (const [th, label] of THEMES) {
    const og = document.createElement('optgroup'); og.label = label;
    for (const [id, a] of Object.entries(ACTIONS)) if (a.th === th) og.appendChild(new Option(a.name, id));
    sel.appendChild(og);
  }
  for (const [g, ids] of FX_GROUPS) {
    const og = document.createElement('optgroup'); og.label = 'Effect (pink): ' + g;
    for (const id of ids) og.appendChild(new Option(FX[id][0], 'fx:' + id));
    sel.appendChild(og);
  }
  sel.addEventListener('change', () => { S.custom[i] = sel.value; persist(); draw(); });
}
function drawCustom() {
  customs.forEach((b, i) => {
    const id = ACTIONS[S.custom[i]] ? S.custom[i] : DEFAULT_CUSTOM[i], a = ACTIONS[id];
    b.textContent = a.label(); b.dataset.th = a.th; b.classList.toggle('on', !!a.on?.()); $('cb' + i).value = id;
  });
}
$('copySound').addEventListener('click', () => {
  copying = 'sound'; S.mode = 'sound'; draw(); status(`Tap the sound to copy sound ${S.cur + 1} onto.`);
});

// Beat panel
for (const s of Object.keys(SCALES)) $('scale').add(new Option(s[0].toUpperCase() + s.slice(1), s));
['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].forEach((n, i) => $('root').add(new Option(n, i)));
$('bpm').addEventListener('input', () => { S.bpm = +$('bpm').value; dirty(); draw(); warmSoon(); gridTempo(); });
document.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => { checkpoint(); S.bpm = +b.dataset.bpm; dirty(); draw(); warmSoon(); }));
for (let k = 0; k < 16; k++) {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label for="fxs${k}">Key ${k + 1}</label><select id="fxs${k}"></select><span></span>`;
  const sel = row.querySelector('select');
  for (const [g, ids] of FX_GROUPS) {
    const og = document.createElement('optgroup'); og.label = g;
    for (const id of ids) og.appendChild(new Option(FX[id][0], id));
    sel.appendChild(og);
  }
  sel.addEventListener('change', () => {
    const old = S.fxSlots[k]; if (activeFx.has(old)) releaseFx(old);
    S.fxSlots[k] = sel.value; persist(); draw();
  });
  $('fxSlots').appendChild(row);
}
$('fxLatch').addEventListener('change', () => { S.fxLatch = $('fxLatch').checked; persist(); });
$('fxReset').addEventListener('click', () => { S.fxSlots = [...DEFAULT_SLOTS]; persist(); draw(); });
function drawFxSlots() { S.fxSlots.forEach((id, k) => { $('fxs' + k).value = id; }); $('fxLatch').checked = S.fxLatch; }
$('quantGrid').addEventListener('change', () => { S.quantGrid = +$('quantGrid').value; persist(); draw(); });

// FX panel (on the screen in FX mode): which tracks the FX keys hit, and how
// much of the last effect touched.
$('fxAmt').addEventListener('input', () => {
  if (lastFx == null) return;
  const v = +$('fxAmt').value; S.fxAmt[lastFx] = v; $('oFxAmt').textContent = Math.round(v * 100) + '%';
  const f = FX[lastFx][1];
  if (f.audio && activeFx.has(lastFx)) eng.setFx(f.audio, true, stepDur(), ctx.currentTime, v);
  persist();
});
$('fxAimBtn').addEventListener('click', () => {
  const list = $('aimList'); list.textContent = '';
  S.slots.forEach((sl, i) => {
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" value="${i}"> ${i + 1} ${sl?.name || ''}`;
    l.querySelector('input').checked = S.fxTarget !== 'all' && S.fxTarget.includes(i);
    list.appendChild(l);
  });
  $('aimAll').checked = S.fxTarget === 'all';
  $('aimBox').hidden = false;
});
$('aimAll').addEventListener('change', () => { if ($('aimAll').checked) $('aimList').querySelectorAll('input').forEach(c => { c.checked = false; }); });
$('aimList').addEventListener('change', () => { $('aimAll').checked = !$('aimList').querySelector('input:checked'); });
$('aimDone').addEventListener('click', () => {
  const picked = [...$('aimList').querySelectorAll('input:checked')].map(c => +c.value);
  S.fxTarget = picked.length ? picked : 'all';
  for (const k of activeFx) fxAim.set(k, aimNow());       // the effects already on move to these tracks too
  routeLoops();
  $('aimBox').hidden = true; persist(); draw();
});
function drawFxPanel() {
  const on = S.mode === 'fx';
  $('wave').hidden = on; $('fxPanel').hidden = !on;
  if (!on) return;
  $('fxAimBtn').textContent = 'Tracks: ' + (S.fxTarget === 'all' ? 'All' : S.fxTarget.map(i => i + 1).join(', ')) + ' ▾';
  const k = lastFx;
  $('fxName').textContent = k == null ? (S.fxLatch ? 'Tap a key' : 'Hold a key') : FX[k][0];
  $('fxAmt').disabled = k == null || !hasAmount(k);
  if (k != null && hasAmount(k)) { $('fxAmt').value = amtOf(k); $('oFxAmt').textContent = Math.round(amtOf(k) * 100) + '%'; }
  else $('oFxAmt').textContent = k == null ? '' : '—';
}
$('swing').addEventListener('input', () => { S.swing = +$('swing').value; dirty(); draw(); });
$('vol').addEventListener('input', () => { S.vol = +$('vol').value; setVolume(); dirty(); draw(); });
function setVolume() { eng.vol = S.vol; eng.master.gain.setTargetAtTime(S.vol, ctx.currentTime, 0.02); }
$('scale').addEventListener('change', () => setKey({ root: keyAhead().root, scale: $('scale').value }));
$('root').addEventListener('change', () => setKey({ root: +$('root').value, scale: keyAhead().scale }));
$('clearPat').addEventListener('click', () => {
  checkpoint();
  S.patterns[S.pat] = Array.from({ length: 16 }, () => []); S.fx[S.pat] = new Array(16).fill(null); S.patKeys[S.pat] = null;
  dirty(); draw(); status(`Pattern ${S.pat + 1} cleared.`);
});
$('clearFx').addEventListener('click', () => { checkpoint(); S.fx[S.pat] = new Array(16).fill(null); dirty(); draw(); status(`Effects taken out of pattern ${S.pat + 1}.`); });
$('clearSound').addEventListener('click', () => {
  checkpoint();
  S.patterns[S.pat] = S.patterns[S.pat].map(st => st.filter(n => n.s !== S.cur)); dirty(); draw();
  status(`Sound ${S.cur + 1} taken out of pattern ${S.pat + 1}.`);
});
$('copyPat').addEventListener('click', () => {
  copying = 'pattern'; S.mode = 'pattern'; draw(); status(`Tap the pattern to copy pattern ${S.pat + 1} onto.`);
});
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === b.dataset.tab));
  if (b.dataset.tab === 'tLog') drawLog();
  if (b.dataset.tab === 'tBeat') drawKitSel();
  if (b.dataset.tab === 'tEffects') drawFxSlots();
  if (b.dataset.tab === 'tVoice') openPsalter();
}));
// Copy and Paste: the pattern you're on, steps and saved effects.
let clipboard = null;
let soundClip = null;
$('copy').addEventListener('click', () => {
  if (S.mode === 'sound') {
    soundClip = S.cur; draw();
    status(`Sound ${S.cur + 1} (${S.slots[S.cur].name}) copied. Choose another sound and press Paste.`); return;
  }
  clipboard = { from: S.pat, steps: S.patterns[S.pat].map(st => st.map(n => ({ ...n, lock: n.lock && { ...n.lock } }))), fx: [...S.fx[S.pat]], key: S.patKeys[S.pat] };
  $('paste').disabled = false;
  status(`Pattern ${S.pat + 1} copied. Choose another pattern and press Paste.`);
});
$('paste').addEventListener('click', () => {
  if (S.mode === 'sound') {
    if (soundClip == null) { status('Copy a sound first.'); return; }
    if (soundClip === S.cur) { status('Choose a different sound to paste onto.'); return; }
    copySound(soundClip, S.cur); draw(); return;
  }
  if (!clipboard) { status('Copy a pattern first.'); return; }
  checkpoint();
  S.patterns[S.pat] = clipboard.steps.map(st => st.map(n => ({ ...n, lock: n.lock && { ...n.lock } })));
  S.fx[S.pat] = [...clipboard.fx]; S.patKeys[S.pat] = clipboard.key || null;
  dirty(); draw(); status(`Pattern ${clipboard.from + 1} pasted into pattern ${S.pat + 1}. ↶ Undo takes it back.`);
});
// Long presses should never bring up the browser's copy menu.
document.addEventListener('contextmenu', ev => { if (!ev.target.closest('input, textarea, select')) ev.preventDefault(); });

// ---------------------------------------------------------------------------
// Voice, from Vox Machina's eSpeak NG engine
// ---------------------------------------------------------------------------
const VARIANTS = [['', 'Default'], ['m3', 'Male 3'], ['m7', 'Male 7'], ['f2', 'Female 2'], ['robosoft', 'Robosoft'],
  ['robosoft5', 'Robosoft 5'], ['UniRobot', 'UniRobot'], ['anikaRobot', 'Anika Robot'], ['whisper', 'Whisper'],
  ['croak', 'Croak'], ['Demonic', 'Demonic'], ['Storm', 'Storm'], ['Tweaky', 'Tweaky'], ['grandpa', 'Grandpa'], ['announcer', 'Announcer']];
for (const [v, l] of VARIANTS) $('voxVariant').add(new Option(l, v));
$('voxVariant').value = 'robosoft';
const voxOut = [['voxPitch', v => v], ['voxRange', v => v == 0 ? 'flat' : v], ['voxSpeed', v => v], ['voxVowel', v => Math.round(v * 100) + '%'], ['voxGap', v => v * 10 + ' ms']];
for (const [id, fmt] of voxOut) {
  const show = () => $('o' + id[0].toUpperCase() + id.slice(1)).textContent = fmt(+$(id).value);
  $(id).addEventListener('input', show); show();
}
let vox = null;
// vo: a voice of its own ({ variant, range, speed, vowel }, as a Robot pad's), else the Voice page's.
async function makeVoice(text = $('voxText').value.trim(), gap = +$('voxGap').value, pitch = +$('voxPitch').value, vo = null) {
  if (!text) throw new Error('Type something first.');
  if (!vox) { status('Loading the voice engine (about 18 MB the first time)…'); vox = await import('../vox-machina/engine.js?v=20261023zs'); }
  status('Speaking…');
  let v = await vox.speak(text, { voice: 'en-us', variant: vo?.variant ?? $('voxVariant').value, pitch,
    pitchRange: vo?.range ?? +$('voxRange').value, speed: vo?.speed ?? +$('voxSpeed').value, wordGap: gap });
  v = vox.stretchVowels(v, vo?.vowel ?? +$('voxVowel').value);
  const b = ctx.createBuffer(1, v.samples.length, v.rate); b.copyToChannel(Float32Array.from(v.samples), 0);
  return prepare(ctx, b);
}
// Syllables from spelling, for counting and for the names on the keys:
// "beginning" -> be gin ning. English spelling is loose, so this is a good
// guess, not a dictionary; the sound itself decides where the cuts fall.
function spell(word) {
  const w = word.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
  if (!w) return [];
  const V = i => 'aeiou'.includes(w[i]) || (w[i] === 'y' && i > 0);
  const groups = [];
  for (let i = 0; i < w.length; i++) if (V(i) && !(i > 0 && V(i - 1))) { let j = i; while (j < w.length && V(j)) j++; groups.push([i, j]); }
  if (groups.length > 1) {         // "-ia" and "-ea" at the end are two syllables: glo-ri-a, al-le-lu-ia, i-de-a
    const [a, b] = groups.at(-1), g = w.slice(a, b);
    if (b === w.length && /[ie]a$/.test(g)) { if (g.length === 2) groups.splice(-1, 1, [a, a + 1], [a + 1, b]); else groups.splice(-1, 1, [a, b - 2], [b - 2, b]); }
  }
  if (groups.length > 1) {         // a silent e at the end: "time", "loved", "makes" (not "table", "wanted", "boxes")
    const [a, b] = groups.at(-1), end = w.slice(a), before = w[a - 1], b2 = w[a - 2];
    if ((end === 'e' && !(before === 'l' && b2 && !V(a - 2))) || (end === 'ed' && b === w.length - 1 && !'td'.includes(before))
      || (end === 'es' && b === w.length - 1 && !'sxzcg'.includes(before) && !w.endsWith('shes') && !w.endsWith('ches'))) groups.pop();
  }
  if (groups.length < 2) return [w];
  const parts = []; let from = 0;
  for (let g = 0; g < groups.length - 1; g++) {
    const c0 = groups[g][1], c1 = groups[g + 1][0], cons = w.slice(c0, c1);
    let cut = c1 - 1;                                   // one consonant goes with the next vowel: be|gin
    if (cons.length >= 2) cut = /^(ch|sh|th|ph|wh|ck)$/.test(cons) ? c0 : c0 + 1;   // two or more: split them, gin|ning
    if (/^gh/.test(cons)) cut = c0 + 2;                                                   // a silent gh: high|est
    if (g === groups.length - 2 && cons.length >= 2 && cons.endsWith('l') && w.endsWith('le')) cut = c1 - 2;   // peo|ple, ta|ble
    if (cons.length === 0) cut = c1;
    parts.push(w.slice(from, cut)); from = cut;
  }
  parts.push(w.slice(from));
  return parts.filter(Boolean);
}
// Phonetics. eSpeak says how it will pronounce each word ("b_I_g_'I_n_I_N"):
// every vowel sound is a syllable, and ' or , marks a stressed one. The
// consonants between two vowels go with the second, as many as can start
// an English syllable (be|gin, mon|ster, a|stride).
const PH_VOWEL = t => /^[aeiouAEIOUV03@]/.test(t);
const ONSETS = new Set(['pl', 'pr', 'bl', 'br', 'tr', 'dr', 'kl', 'kr', 'gl', 'gr', 'fl', 'fr', 'Tr', 'Sr', 'sp', 'st', 'sk', 'sm', 'sn', 'sl', 'sw',
  'tw', 'kw', 'dw', 'pj', 'bj', 'kj', 'mj', 'fj', 'hj', 'spr', 'str', 'skr', 'spl', 'skw']);
function phSyllables(word) {
  const toks = word.split('_').filter(t => t && !/^[:|!_]+$/.test(t)), bare = toks.map(t => t.replace(/[',]/g, ''));
  const vi = bare.map((t, i) => (PH_VOWEL(t) ? i : -1)).filter(i => i >= 0), out = [];
  let from = 0;
  vi.forEach((v, n) => {
    let to = toks.length;
    if (n < vi.length - 1) {
      const cons = bare.slice(v + 1, vi[n + 1]);
      let take = cons.length ? 1 : 0;
      for (let k = Math.min(3, cons.length); k >= 2; k--) if (ONSETS.has(cons.slice(-k).join(''))) { take = k; break; }
      to = vi[n + 1] - take;
    }
    const raw = toks.slice(from, to).join('');
    out.push({ ph: bare.slice(from, to), stress: raw.includes("'") ? 2 : raw.includes(',') ? 1 : 0 });
    from = to;
  });
  return out;
}
// The words typed, each with its syllables (from eSpeak) and the punctuation
// after it. Each word is looked up on its own, so the count is exact; the
// stress comes from the whole line, where little words like "the" go unstressed.
async function phonetics(text) {
  const words = text.replace(/([^\s.!?,;:])[ \t]*\n/g, '$1.\n').split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t))
    .map(t => ({ t, punct: /[.!?;:]["”’)]*$/.test(t) ? '.' : /,["”’)]*$/.test(t) ? ',' : '', syl: [] }));
  const clean = t => t.replace(/[^\p{L}\p{N}'’-]/gu, '');
  const lines = (await vox.phonemes(words.map(w => clean(w.t)).join(', '))).split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === words.length) lines.forEach((l, i) => { words[i].syl = l.split(' ').flatMap(phSyllables); });
  else words.forEach(w => { w.syl = spell(w.t).map(() => ({ ph: null, stress: 0 })); });     // fall back on the spelling
  const sent = (await vox.phonemes(text)).split(/\s+/).filter(Boolean).flatMap(phSyllables);
  if (sent.length === words.reduce((n, w) => n + w.syl.length, 0)) { let i = 0; for (const w of words) for (const y of w.syl) y.stress = sent[i++].stress; }
  return words;
}
// Names for the keys: the spelling cut into as many pieces as eSpeak hears.
function nameParts(t, n) {
  const w = t.replace(/[^\p{L}\p{N}']/gu, '').toLowerCase(), sp = spell(w);
  if (n <= 1) return [w];
  if (sp.length === n) return sp;
  if (/\d/.test(w)) return [w, ...Array(n - 1).fill('·')];
  return Array.from({ length: n }, (_, i) => w.slice(Math.round(i * w.length / n), Math.round((i + 1) * w.length / n)));
}
// Speak the phrase and find its syllables. Natural: the line is spoken as a
// whole (a pause between words) and each word is cut at its quietest dips.
// Robot-precise: each syllable is spoken on its own, from its phonemes, so
// every cut falls in silence. Returns the buffer and [{ s, e, name, w,
// stress, first, punct }].
async function voiceSyllables(text, cut = $('rapCut').value, pitch = +$('voxPitch').value, vo = null) {
  if (!vox) { status('Loading the voice engine (about 18 MB the first time)…'); vox = await import('../vox-machina/engine.js?v=20261023zs'); }
  status('Listening for the syllables…');
  const words = await phonetics(text), counts = words.map(w => Math.max(1, w.syl.length));
  const all = words.flatMap((w, wi) => (w.syl.length ? w.syl : [{ ph: null, stress: 0 }]).map((y, k, arr) => ({ ...y, w: wi, first: k === 0, punct: k === arr.length - 1 ? w.punct : '' })));
  let buf = null, found = null;
  if (cut === 'robot' && all.every(y => y.ph)) {
    const said = all.map(y => { const v = y.ph.findIndex(PH_VOWEL), m = ['', ',', "'"][y.stress]; return [...y.ph.slice(0, v), m + y.ph[v], ...y.ph.slice(v + 1)].join(''); });
    buf = await makeVoice(`[[${said.join(' ')}]]`, 20, pitch, vo);
    found = syllables(buf, all.map(() => 1));
  }
  if (!found) {
    buf = await makeVoice(text, Math.max(30, vo?.gap ?? +$('voxGap').value), pitch, vo); found = syllables(buf, counts);
    if (!found) {           // the words found don't match: speak them one at a time
      const pieces = [];
      for (const [i, w] of words.entries()) { status(`Speaking word ${i + 1} of ${words.length}…`); pieces.push(await makeVoice(w.t, 0, pitch, vo)); }
      const r = pieces[0].sampleRate, gap = Math.round(r * 0.3), len = pieces.reduce((a, b) => a + b.length + gap, 0);
      buf = ctx.createBuffer(1, len, r); let o = 0;
      for (const b of pieces) { buf.getChannelData(0).set(b.getChannelData(0), o); o += b.length + gap; }
      found = syllables(buf, counts);
    }
  }
  if (!found || found.length !== all.length) throw new Error('Could not find the syllables in the voice. Try fewer words, or spell numbers out.');
  const names = words.flatMap(w => nameParts(w.t, Math.max(1, w.syl.length)));
  return { buf, syl: found.map((f, i) => ({ s: f.s, e: f.e, ...all[i], ph: undefined, name: names[i] })) };
}
// The voice as a chop: one syllable per key. Each slice keeps its word,
// stress and punctuation, so a new flow can be laid out without speaking
// again. A rap may hold more syllables than there are keys; the pattern
// plays them all.
const MAX_SYL = 64;
function voiceChop(name, buf, syl) {
  return { factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), choke: true }, buf, made: 'GEN',
    slices: syl.slice(0, MAX_SYL).map(x => ({ s: x.s, e: x.e, name: x.name, w: x.w, stress: x.stress, first: x.first, punct: x.punct })) };
}

// Flows: how the syllables sit on the beat. Each flow is made of cells, a
// beat (4 steps of 1/16) or so long, cut into syllable lengths; `strong` says
// where stressed syllables should land (on the beat, on any 1/8, or off the
// beat), resting a little before a word to get them there; `line` is where a
// new sentence starts (the next beat, half bar or bar); `behind` drags every
// syllable a little late, for a lazy feel.
const T3 = 4 / 3, S6 = 2 / 3;
const FLOWS = {
  steady8: ['Steady 1/8', { cells: [[2]], line: 4 }],
  steady16: ['Steady 1/16', { cells: [[1]], line: 4 }],
  steady4: ['Steady 1/4: one a beat', { cells: [[4]], line: 4 }],
  oldschool: ['Old school: on the beat, a bar a line', { cells: [[2]], strong: 4, line: 16 }],
  boombap: ['Boom bap', { cells: [[2, 2], [2, 1, 1], [1, 1, 2], [3, 1]], strong: 2, line: 8 }],
  laidback: ['Laid back: lazy, behind the beat', { cells: [[3, 1], [2, 2], [4]], strong: 4, behind: 0.22, line: 8 }],
  triplet: ['Triplet', { cells: [[T3, T3, T3]], strong: 4, line: 4 }],
  syncopated: ['Syncopated: off the beat', { cells: [[3, 3, 2], [1, 2, 1], [3, 1]], strong: 'off', line: 4 }],
  chopper: ['Chopper: double time', { cells: [[1, 1, 1, 1], [S6, S6, S6, S6, S6, S6], [1, 1, 2]], line: 4 }],
  mix: ['Mixed: a different feel each beat', { mix: true, strong: 2, line: 8 }],
};
for (const [id, [n]] of Object.entries(FLOWS)) $('rapFlow').add(new Option(n, id));
$('rapFlow').value = 'boombap';
const MIX_CELLS = [...new Set(Object.values(FLOWS).filter(([, f]) => f.cells?.length > 1).flatMap(([, f]) => f.cells))];
// Where each syllable goes, in steps from the start (fractions for triplets
// and laid-back): the same flow and seed always give the same places.
function flowPlaces(syl, flow, rest, seed) {
  const F = FLOWS[flow]?.[1] || FLOWS.steady8[1], cells = F.mix ? MIX_CELLS : F.cells, eps = 0.01;
  const rnd = st => { st.r = (st.r + 0x6D2B79F5) | 0; let x = Math.imul(st.r ^ (st.r >>> 15), 1 | st.r); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const pick = st => cells[(rnd(st) * cells.length) | 0];
  let st = { t: 0, r: seed | 0 }; st.cell = pick(st); st.ci = 0;
  const next = q => { const p = q.t; q.t += q.cell[q.ci++]; if (q.ci === q.cell.length) { q.cell = pick(q); q.ci = 0; } return p; };
  const restTo = x => { if (st.t < x - eps) { st.t = x; st.cell = pick(st); st.ci = 0; } };
  const near = (a, b) => Math.abs(a - b) < eps;
  const strong = p => { const m = ((p % 4) + 4) % 4, on = near(m, 0) || near(m, 4);
    return F.strong === 4 ? on : F.strong === 2 ? near(m % 2, 0) || near(m % 2, 2) : F.strong === 'off' ? !on : true; };
  const places = [];
  for (let i = 0; i < syl.length; i++) {
    const y = syl[i];
    if (y.first) {
      // A breath: a full stop goes on to the next line (in quick flows, at least an 1/8 later), a comma to the next beat.
      const pp = syl[i - 1]?.punct;
      if (pp === '.') restTo(Math.ceil((st.t + (F.line >= 8 ? 0 : 2) - eps) / F.line) * F.line);
      else if (pp === ',') restTo(Math.ceil((st.t + 1 - eps) / 4) * 4);
      else if (rest && i > 0) next(st);
      // land the word's stressed syllable on a strong place: rest up to two places before the word
      let j = 0; while (i + j < syl.length && (j === 0 || !syl[i + j].first)) { if (syl[i + j].stress === 2) break; j++; }
      if (F.strong && i + j < syl.length && syl[i + j].stress === 2 && (j === 0 || !syl[i + j].first)) {
        for (let k = 0; k <= 2; k++) {
          const q = { ...st }; for (let n = 0; n < k; n++) next(q);
          let p = 0; for (let n = 0; n <= j; n++) p = next(q);
          if (strong(p)) { for (let n = 0; n < k; n++) next(st); break; }
        }
      }
    }
    places.push(next(st) + (F.behind || 0));
  }
  return places;
}
// Lay the current rap sound's syllables out in a flow, from the pattern
// you're on, carrying on into the next patterns (chained) if it needs them.
// A new flow for a rap already laid out starts where that one started (not
// on whatever pattern is showing as the beat plays), and the old layout is
// cleared from every pattern, so no syllable is left where it was.
function layRap(flow, rest, seed, fresh = false) {
  const si = S.cur, sl = S.slots[si];
  if (sl?.kind !== 'chop' || !sl.slices.length || sl.slices[0].w == null) throw new Error('Make a rap first: this sound is not a rapped voice.');
  const had = S.patterns.map((p, i) => (p.some(st => st.some(x => x.s === si)) ? i : -1)).filter(i => i >= 0);
  const from = !fresh && had.length ? had[0] : S.pat;
  const places = flowPlaces(sl.slices, flow, rest, seed);
  const bars = Math.ceil((Math.floor(places.at(-1)) + 1) / 16);
  if (from + bars > 16) throw new Error(`That needs ${bars} patterns from pattern ${from + 1}: start from an earlier pattern, or choose a quicker flow.`);
  checkpoint();
  for (const q of had) S.patterns[q] = S.patterns[q].map(st => st.filter(x => x.s !== si));
  places.forEach((p, k) => {
    const j = Math.floor(p + 1e-6), o = Math.round((p - j) * 1000) / 1000;
    S.patterns[from + Math.floor(j / 16)][j % 16].push({ s: si, k, ...(o > 0.01 && { o }) });
  });
  // the chain: the rap's patterns, if the chain was the old rap's (or a single pattern)
  const span = Array.from({ length: bars }, (_, b) => from + b), old = had.length ? Array.from({ length: had.at(-1) - had[0] + 1 }, (_, b) => had[0] + b) : [];
  const wasRap = S.chain.length === 1 || (S.chain.length === old.length && S.chain.every((c, i) => c === old[i]));
  if (wasRap && (S.chain.length !== span.length || S.chain[0] !== from)) {
    if (playing) pendingChain = span; else { S.chain = span; S.pat = from; }
  }
  dirty(); draw();
  return { bars, from };
}
let rapSeed = 1;
// Where a rap goes: the sound it went on before, else the current sound if
// nothing uses it, else the last free sound (16 down to 1). Never the drum kit.
function rapSlot() {
  if (isRap(S.cur)) return S.cur;
  const used = si => isDrum(si) || S.patterns.some(p => p.some(st => st.some(n => n.s === si)));
  if (!used(S.cur)) return S.cur;
  for (let si = 15; si >= 0; si--) if (!used(si)) return si;
  throw new Error('Every sound is in use. Choose a sound to rap on (it will be replaced) and its notes cleared, or clear one first.');
}
async function rapIt() {
  const text = $('voxText').value.trim(), si = rapSlot();
  const { buf, syl } = await voiceSyllables(text);
  const name = '“' + (text.length > 24 ? text.slice(0, 23) + '…' : text) + '”';
  // the old voice's notes go too (they were for other syllables), and the chain its rap made
  checkpoint();
  const had = S.patterns.map((p, i) => (p.some(st => st.some(x => x.s === si)) ? i : -1)).filter(i => i >= 0);
  if (had.length > 1 && S.chain.length === had.at(-1) - had[0] + 1 && S.chain.every((c, i) => c === had[0] + i)) {
    if (playing) pendingChain = [S.pat]; else S.chain = [S.pat];
  }
  S.patterns = S.patterns.map(p => p.map(st => st.filter(x => x.s !== si)));
  S.slots[si] = voiceChop(name, buf, syl); S.lastKey[si] = 0; S.cur = si; syncPanel();
  const { bars, from } = layRap($('rapFlow').value, $('rapRest').checked, rapSeed, true);
  const n = Math.min(MAX_SYL, syl.length);
  status(`${n} syllables on sound ${si + 1}, ${FLOWS[$('rapFlow').value][0].split(':')[0]}${bars > 1 ? `, patterns ${from + 1}–${from + bars} (chained)` : ''}: `
    + syl.slice(0, n).map(x => (x.stress === 2 ? x.name.toUpperCase() : x.name)).join(' · ') + (syl.length > MAX_SYL ? `. Only the first ${MAX_SYL} of ${syl.length} fit.` : '.'));
}
// ▶ Hear the rap: the rap alone, just as it falls on the beat (same tempo,
// swing and places), with nothing else playing. Tap again to stop.
let rapPv = null;
function stopRapPreview() {
  if (!rapPv) return;
  clearTimeout(rapPv.timer); for (const v of rapPv.voices) v?.stop?.(ctx.currentTime);
  rapPv = null; drawRapHear();
}
function drawRapHear() { $('rapHear').textContent = rapPv ? '■ Stop' : '▶ Hear the rap'; drawCustom(); }
function hearRap() {
  if (rapPv) { stopRapPreview(); return; }
  const si = isRap(S.cur) ? S.cur : S.slots.findIndex((_, i) => isRap(i) && S.patterns.some(p => p.some(st => st.some(n => n.s === i))));
  const pats = si < 0 ? [] : S.patterns.map((p, i) => (p.some(st => st.some(n => n.s === si)) ? i : -1)).filter(i => i >= 0);
  if (!pats.length) { status('Make a rap first: 🎤 Rap it on the beat.'); return; }
  if (playing) stop();
  ctx.resume(); stopPreview();
  const t0 = ctx.currentTime + 0.08, sd = stepDur(), sw = (2 * S.swing / 100 - 1) * sd, voices = [];
  for (let b = 0; b <= pats.at(-1) - pats[0]; b++) S.patterns[pats[0] + b].forEach((st, j) => {
    for (const n of st) if (n.s === si) {
      const at = t0 + (b * 16 + j) * sd + (n.o ? n.o * sd : j % 2 ? sw : 0);
      voices.push(noteOn(eng, si, n.k, at, null, withOct(si, n.lock, n.oc)));
    }
  });
  const len = (pats.at(-1) - pats[0] + 1) * 16 * sd;
  rapPv = { voices, timer: setTimeout(() => { rapPv = null; drawRapHear(); }, (len + 0.6) * 1000) };
  drawRapHear();
  status(`The rap on its own: ${pats.length > 1 ? `${pats.at(-1) - pats[0] + 1} bars` : 'one bar'} at ${S.bpm} BPM, as it falls on the beat.`);
}
function reflow(seed) {
  const { bars } = layRap($('rapFlow').value, $('rapRest').checked, rapSeed = seed);
  status(`${FLOWS[$('rapFlow').value][0].split(':')[0]}${bars > 1 ? `, over ${bars} bars` : ''}. 🎲 again for another, ↶ Undo to go back.`);
}
// Psalms for the voice. The Douay comes from Selah (public domain, built
// in); a Grail file (a Selah pack, the same one Selah and While You Have
// the Light take) can be added, and is kept in this browser on this device
// only: it is never sent anywhere or put in the app.
const PSALTERS = { douay: null, grail: null };
async function psalterOf(id) {
  if (PSALTERS[id]) return PSALTERS[id];
  if (id === 'douay') {
    const t = await (await fetch('../selah/douay.js')).text();
    return (PSALTERS.douay = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)));
  }
  const t = db && await idbGet('state', 'psalter');
  return (PSALTERS.grail = t ? JSON.parse(t) : null);
}
const verseText = vs => vs.lines.map(l => l.replace(/[*†‡]/g, '').replace(/\s+/g, ' ').trim()).join('\n');
const firstWords = (t, n = 5) => { const w = t.split(/\s+/); return w.slice(0, n).join(' ') + (w.length > n ? '…' : ''); };
async function drawPsalter(keep = true, fill = true) {
  const g = await psalterOf('grail');
  $('psSrc').options[1].disabled = !g; $('psSrc').options[1].text = g ? `${g.displayName || 'Grail'} (yours)` : 'Grail: import your file';
  if (!g && $('psSrc').value === 'grail') $('psSrc').value = 'douay';
  const P = await psalterOf($('psSrc').value), was = keep ? +$('psNum').value : 0;
  $('psNum').length = 0;
  for (const ps of P.psalms) $('psNum').add(new Option(`${ps.n}: ${firstWords(verseText(ps.verses.find(v => !v.title) || ps.verses[0]), 4)}`, ps.n));
  if (was && P.psalms.some(p => p.n === was)) $('psNum').value = was;
  $('psNote').textContent = `${P.name || P.displayName}, ${P.numbering === 'hebrew' ? 'numbered as in the Hebrew (and the breviary)' : 'in the Vulgate numbering'}.`;
  drawVerses(fill);
}
function drawVerses(fill = true) {
  const P = PSALTERS[$('psSrc').value], ps = P?.psalms.find(p => p.n === +$('psNum').value); if (!ps) return;
  for (const id of ['psFrom', 'psTo']) {
    const sel = $(id); sel.length = 0;
    ps.verses.forEach((v, i) => sel.add(new Option(`${v.v}${v.title ? ' (title)' : ''}: ${firstWords(verseText(v))}`, i)));
  }
  const first = Math.max(0, ps.verses.findIndex(v => !v.title));
  $('psFrom').value = first; $('psTo').value = first; if (fill) pickVerses();
}
// The verses chosen go into the words box, a line each half-verse: a new line is a breath in the rap.
function pickVerses() {
  const P = PSALTERS[$('psSrc').value], ps = P?.psalms.find(p => p.n === +$('psNum').value); if (!ps) return;
  let a = +$('psFrom').value, b = +$('psTo').value; if (b < a) { b = a; $('psTo').value = a; }
  const text = ps.verses.slice(a, b + 1).map(verseText).join('\n');
  $('voxText').value = text;
  const n = text.split(/\s+/).reduce((c, w) => c + Math.max(1, spell(w).length), 0);
  $('psCount').textContent = `About ${n} syllables${n > MAX_SYL ? `: a rap keeps the first ${MAX_SYL}` : n > 16 ? ` (a rap plays them all; the 16 pads show each pattern's)` : ''}.`;
}
$('psSrc').addEventListener('change', () => drawPsalter(false));
$('psNum').addEventListener('change', () => drawVerses());
$('psFrom').addEventListener('change', () => { $('psTo').value = $('psFrom').value; pickVerses(); });
$('psTo').addEventListener('change', pickVerses);
$('psRand').addEventListener('click', async () => {
  const P = await psalterOf($('psSrc').value), ps = P.psalms[(Math.random() * P.psalms.length) | 0];
  $('psNum').value = ps.n; drawVerses();
  const vs = ps.verses.map((v, i) => (v.title ? -1 : i)).filter(i => i >= 0), i = vs[(Math.random() * vs.length) | 0];
  $('psFrom').value = i; $('psTo').value = i; pickVerses();
});
$('psImport').addEventListener('click', () => { $('psFile').value = ''; $('psFile').click(); });
$('psFile').addEventListener('change', async () => {
  const f = $('psFile').files[0]; if (!f) return;
  try {
    const t = await f.text(), j = JSON.parse(t);
    if (j?.selahPack !== 1 || !Array.isArray(j.psalms) || !j.psalms.every(p => Number.isInteger(p?.n) && Array.isArray(p.verses) && p.verses.every(v => Array.isArray(v?.lines))))
      throw new Error('not a psalter pack');
    if (!db) throw new Error('this browser has no storage to keep it in');
    await idbPut('state', t, 'psalter'); PSALTERS.grail = j;
    $('psSrc').value = 'grail'; await drawPsalter(false);
    status(`${j.name || j.displayName}: ${j.psalms.length} psalms, kept on this device only.`);
  } catch (e) { status(`Could not use that file (${e.message}). It should be a psalter pack file, the kind Selah takes.`); }
});
let psalterReady = false;
function openPsalter() { if (!psalterReady) { psalterReady = true; drawPsalter(false, false).catch(e => status('Could not load the psalms: ' + e.message)); } }

const busy = (btn, fn) => async () => {
  btn.disabled = true; ctx.resume();
  try { await fn(); } catch (e) { status(e.message); console.error(e); }
  btn.disabled = false;
};
$('voxMake').addEventListener('click', busy($('voxMake'), async () => {
  const t = $('voxText').value.trim(), name = '“' + (t.length > 24 ? t.slice(0, 23) + '…' : t) + '”';
  if (S.cur < 8) { assignBuffer(S.cur, await makeVoice(), name); return; }
  // on 9–16: one syllable per key
  const { buf, syl } = await voiceSyllables(t);
  checkpoint(); S.slots[S.cur] = voiceChop(name, buf, syl.slice(0, 16)); S.lastKey[S.cur] = 0; syncPanel(); dirty(); draw();
  status(`${name} → sound ${S.cur + 1}, ${Math.min(16, syl.length)} syllables on keys: ${syl.slice(0, 16).map(x => x.name).join(' · ')}${syl.length > 16 ? ` (the first 16 of ${syl.length})` : ''}`);
  noteOn(eng, S.cur, 0, ctx.currentTime + 0.02);
}));
$('rapIt').addEventListener('click', busy($('rapIt'), rapIt));

// ---------------------------------------------------------------------------
// Robot pads (🤖 Robot): words typed on the pads, said by the robot voice (the Voice page's voice
// and cut). A pad holds as many syllables as you say (at first, all of its word's); the rest spill
// over onto the next pad, which takes as many as you say, and so on, up to a pad with a word of its
// own (a word typed on a spilled pad takes its place). The pads are the keys of one sound, a chop,
// so they play, record and export like any other, at the voice's own pitch. The words and counts
// are kept in its params.robot: { pads: [{ t, n }], words: { text: [{ s, e, name }] } }, where t is
// the word typed on the pad, n its syllables (null: all there are), voice its own voice (⚙; null:
// the Voice page's, at the normal pitch), and words the syllables of each word (with its voice) in the
// sound. Each change makes a new object, so Undo puts it back.
// ---------------------------------------------------------------------------
function isRobot(si) { return !!S.slots[si]?.params?.robot; }
function emptyRobot() { return { pads: Array.from({ length: 16 }, () => ({ t: null, n: null })), words: {}, v: ROBOT_V }; }
const sylls = n => `${n} syllable${n === 1 ? '' : 's'}`;
// Which syllables fall on which pad, and what doesn't fit.
function robotLayout(R) {
  const out = Array.from({ length: 16 }, () => ({ syl: [], spill: false, avail: 0 })), warn = [];
  let queue = [], from = '';
  for (let i = 0; i < 16; i++) {
    const p = R.pads[i];
    if (p.t) {
      if (queue.length) warn.push(`${sylls(queue.length)} of “${from}” ${queue.length === 1 ? 'doesn’t' : 'don’t'} fit: pad ${i + 1} has a word of its own.`);
      queue = [...(R.words[wordKey(p)] || [])]; from = p.t;
    }
    if (!queue.length) continue;
    const avail = queue.length, n = Math.min(p.n ?? avail, avail);
    out[i] = { syl: queue.splice(0, n), spill: !p.t, avail, from };
  }
  if (queue.length) warn.push(`${sylls(queue.length)} of “${from}” ${queue.length === 1 ? 'doesn’t' : 'don’t'} fit: there are no more pads.`);
  return { out, warn };
}
// Where the pads go: the Robot sound already made, else a free sound (never a drum kit).
function robotSlotChoice() {
  if (isRobot(S.cur)) return S.cur;
  const r = S.slots.findIndex((_, i) => isRobot(i));
  return r >= 0 ? r : rapSlot();
}
// The Robot pads are said at the voice's own normal pitch (eSpeak's 50, not the Voice page's), and
// nothing in the song moves them: not the tempo, the key, or the octave buttons.
const ROBOT_PITCH = 50, ROBOT_V = 2;          // ROBOT_V: words made before this are said again
const wordKey = p => (p.voice ? p.t + '\u0001' + JSON.stringify(p.voice) : p.t);     // a word, in its voice
const defaultVoice = () => ({ variant: $('voxVariant').value, pitch: ROBOT_PITCH, range: +$('voxRange').value, speed: +$('voxSpeed').value,
  vowel: +$('voxVowel').value, gap: +$('voxGap').value, cut: $('rapCut').value });
const voiceNow = () => JSON.stringify(['voxVariant', 'voxRange', 'voxSpeed', 'voxVowel', 'voxGap', 'rapCut'].map(id => $(id).value));
const spoken = new Map();         // a word as said in a voice: { buf, syl }, while the page is open
function resampled(d, from, to) {
  const n = Math.round(d.length * to / from), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * from / to, j = Math.floor(x), f = x - j; o[i] = (d[j] || 0) * (1 - f) + (d[j + 1] || 0) * f; }
  return o;
}
// The Robot sound for R: each word once (from the sound as it was, or said now), a little silence
// between them, and a key for each pad, from its first syllable to its last.
async function robotBuild(si, R) {
  const old = S.slots[si], oldR = old?.params?.robot, parts = [];
  const said = new Map(R.pads.filter(p => p.t).map(p => [wordKey(p), p]));
  for (const [t, p] of said) {
    if (oldR?.v === ROBOT_V && oldR.words[t] && old.buf) { const y = oldR.words[t]; parts.push([t, old.buf, y[0].s, y.at(-1).e, y]); continue; }
    const key = t + (p.voice ? '' : voiceNow()), V = p.voice || defaultVoice();
    if (!spoken.has(key)) spoken.set(key, await voiceSyllables(p.t, V.cut, V.pitch, V));
    const { buf, syl } = spoken.get(key);
    parts.push([t, buf, syl[0].s, syl.at(-1).e, syl.map(x => ({ s: x.s, e: x.e, name: x.name }))]);
  }
  const rate = parts[0]?.[1].sampleRate || 22050, gap = Math.round(rate * 0.06), words = {};
  const segs = parts.map(([t, b, s, e, y]) => {
    const a = Math.floor(s * b.sampleRate); let d = b.getChannelData(0).subarray(a, Math.ceil(e * b.sampleRate));
    if (b.sampleRate !== rate) d = resampled(d, b.sampleRate, rate);
    return [t, d, a / b.sampleRate, y];
  });
  const buf = ctx.createBuffer(1, gap + segs.reduce((n, x) => n + x[1].length + gap, 0), rate), ch = buf.getChannelData(0);
  let o = gap;
  for (const [t, d, s0, y] of segs) {
    ch.set(d, o); const off = o / rate - s0;
    words[t] = y.map(x => ({ ...x, s: x.s + off, e: x.e + off })); o += d.length + gap;
  }
  const R2 = { pads: R.pads, words, v: ROBOT_V }, { out, warn } = robotLayout(R2);
  const slices = out.map(q => (q.syl.length ? { s: q.syl[0].s, e: q.syl.at(-1).e, name: q.syl.map(x => x.name).join('·') } : { s: 0, e: gap / rate / 2, name: '' }));
  const params = { ...(isRobot(si) ? old.params : { ...defParams(), choke: true }), robot: R2 };
  S.slots[si] = { factory: null, kind: 'chop', contiguous: false, name: 'Robot pads', params, buf, made: 'GEN', slices };
  if (S.oct) S.oct[si] = 0;
  return { out, warn };
}
// A change to the pads (f gives the new R from the old), one at a time, in order.
let robotQueue = Promise.resolve();
function robotChange(f, k) {
  robotQueue = robotQueue.then(async () => {
    let si;
    try { si = robotTarget >= 0 && isRobot(robotTarget) ? robotTarget : robotSlotChoice(); } catch (e) { status(e.message); drawRobot(); return; }
    const was = S.slots[si], fresh = !isRobot(si);
    try {
      checkpoint();
      const { out, warn } = await robotBuild(si, f(fresh ? emptyRobot() : was.params.robot));
      robotTarget = si; S.cur = si; S.lastKey[si] = k; syncPanel(); dirty(); draw();
      const q = out[k], said = q.syl.length ? `Pad ${k + 1}: ${q.syl.map(x => x.name).join('·')}${q.avail > q.syl.length ? ` (${sylls(q.avail - q.syl.length)} on to pad ${k + 2})` : ''}.` : '';
      status(warn.length ? '⚠ ' + warn.join(' ') : fresh ? `Robot pads on sound ${si + 1}, in place of ${was?.name || 'nothing'}. ${said} ↶ Undo takes it back.` : said);
      if (q.syl.length) noteOn(eng, si, k, ctx.currentTime + 0.02);       // hear the pad
    } catch (e) { status(e.message); console.error(e); drawRobot(); }
  });
}
const withPad = (R, k, pad) => ({ ...R, pads: R.pads.map((p, j) => (j === k ? pad(p) : p)) });
function setWord(R, k, t) {
  // a new word: all its syllables on its pad, and the pads it may spill onto start again
  let pads = R.pads.map((p, j) => (j === k ? { t: t || null, n: null, voice: p.voice || null } : p));
  for (let j = k + 1; j < 16 && !pads[j].t; j++) pads = pads.map((p, i) => (i === j ? { t: null, n: null } : p));
  return { ...R, pads };
}
function stepCount(k, d) {
  const si = robotTarget; if (!isRobot(si)) return;
  const q = robotLayout(S.slots[si].params.robot).out[k]; if (!q.syl.length) return;
  const n = Math.max(1, Math.min(q.avail, q.syl.length + d)); if (n === q.syl.length) return;
  robotChange(R => withPad(R, k, p => ({ ...p, n: n === q.avail ? null : n })), k);
}
for (let k = 0; k < 16; k++) {
  const d = document.createElement('div'); d.className = 'rpad';
  d.title = 'Its syllables: − and +'; d.innerHTML = `<b>${k + 1}</b><input type="text" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Word on pad ${k + 1}">`
    + `<span class="rsyl"></span><div class="rcnt"><button class="rv" aria-label="The voice of pad ${k + 1}">⚙</button><button aria-label="Fewer syllables on pad ${k + 1}">−</button><output></output><button aria-label="More syllables on pad ${k + 1}">+</button></div>`;
  const inp = d.querySelector('input'), [gear, minus, plus] = d.querySelectorAll('button');
  gear.addEventListener('click', () => openRoboVoice(k));
  d.addEventListener('pointerdown', ev => {             // the pad itself (not its box or buttons) plays
    if (ev.target.closest('input, button') || !isRobot(robotTarget)) return;
    ev.preventDefault(); capture(d, ev); document.activeElement?.blur?.(); S.cur = robotTarget; press(k);
  });
  const up = () => release(k);
  d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up); d.addEventListener('lostpointercapture', up);
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') inp.blur(); });
  inp.addEventListener('change', () => {
    const t = inp.value.trim().replace(/\s+/g, ' ');
    const R = isRobot(robotTarget) ? S.slots[robotTarget].params.robot : emptyRobot();
    if ((R.pads[k].t || '') === t) return;
    robotChange(R => setWord(R, k, t), k);
  });
  minus.addEventListener('click', () => stepCount(k, -1)); plus.addEventListener('click', () => stepCount(k, 1));
  $('robo').appendChild(d); roboEls.push(d);
}
// ⚙ on a pad: the voice of its word (a spilled pad: the word it came from), on this word alone: the
// voice, pitch, tone variation, speed, word gap, vowel length and cut, as on the Voice page.
function wordPad(R, k) { for (let j = k; j >= 0; j--) if (R.pads[j].t) return j; return -1; }
let rvPad = -1;
const RV = [['rvPitch', 'pitch', v => v], ['rvRange', 'range', v => (v == 0 ? 'flat' : v)], ['rvSpeed', 'speed', v => v], ['rvGap', 'gap', v => v * 10 + ' ms'], ['rvVowel', 'vowel', v => Math.round(v * 100) + '%']];
for (const [v, l] of VARIANTS) $('rvVariant').add(new Option(l, v));
function rvShow() { for (const [id, , fmt] of RV) $('o' + id[0].toUpperCase() + id.slice(1)).textContent = fmt(+$(id).value); }
function rvFill(V) {
  $('rvVariant').value = V.variant; $('rvCut').value = V.cut;
  for (const [id, key] of RV) $(id).value = V[key];
  rvShow();
}
function openRoboVoice(k) {
  if (!isRobot(robotTarget)) return;
  const R = S.slots[robotTarget].params.robot, j = wordPad(R, k); if (j < 0) return;
  rvPad = j;
  $('rvTitle').textContent = `The voice of “${R.pads[j].t}”`;
  $('rvWord').textContent = j === k ? `Pad ${k + 1}, and the pads it spills onto. Only this word changes.` : `Pad ${k + 1}'s syllables come from “${R.pads[j].t}” on pad ${j + 1}: this is that word's voice. Only this word changes.`;
  rvFill(R.pads[j].voice || defaultVoice());
  $('roboBox').hidden = false;
}
function rvRead() {
  const V = { variant: $('rvVariant').value, cut: $('rvCut').value };
  for (const [id, key] of RV) V[key] = +$(id).value;
  return V;
}
function rvApply(V) {
  const j = rvPad; if (j < 0) return;
  robotChange(R => withPad(R, j, p => ({ ...p, voice: V })), j);
}
for (const [id] of RV) { $(id).addEventListener('input', rvShow); $(id).addEventListener('change', () => rvApply(rvRead())); }
for (const id of ['rvVariant', 'rvCut']) $(id).addEventListener('change', () => rvApply(rvRead()));
$('rvReset').addEventListener('click', () => { rvApply(null); rvFill(defaultVoice()); });
$('rvHear').addEventListener('click', () => { if (rvPad >= 0 && isRobot(robotTarget)) { ctx.resume(); noteOn(eng, robotTarget, rvPad, ctx.currentTime + 0.02); } });
$('rvDone').addEventListener('click', () => { $('roboBox').hidden = true; rvPad = -1; });
function toggleRobot() {
  if (S.mode === 'robot') { document.activeElement?.blur?.(); S.mode = 'play'; status(''); draw(); return; }
  S.mode = 'robot'; if (chainEdit) setChainEdit(false); copying = null;
  const r = isRobot(S.cur) ? S.cur : S.slots.findIndex((_, i) => isRobot(i));
  robotTarget = r;
  if (r >= 0) {
    S.cur = r; syncPanel(); status(`Robot pads on sound ${r + 1}. Type a word on a pad; − and + choose its syllables (the rest go on to the next pad). Tap a pad to hear it.`);
    if (S.slots[r].params.robot.v !== ROBOT_V && S.slots[r].params.robot.pads.some(p => p.t)) {      // made at the old, lower pitch: said again
      robotChange(R => ({ ...R, v: ROBOT_V }), 0);
    }
  }
  else {
    let si = -1; try { si = robotSlotChoice(); } catch (e) { status(e.message); }
    if (si >= 0) status(`Type a word on a pad: it is said by the robot voice and cut into syllables, all on that pad at first; − and + choose how many (the rest go on to the next pad). The pads go on sound ${si + 1}, in place of ${S.slots[si]?.name || 'nothing'}.`);
  }
  draw();
}
function drawRobot() {
  const on = S.mode === 'robot';
  $('robo').hidden = !on; $('keys').hidden = on;
  if (!on || !roboEls.length) return;
  const R = isRobot(robotTarget) ? S.slots[robotTarget].params.robot : emptyRobot(), { out } = robotLayout(R);
  roboEls.forEach((d, k) => {
    const p = R.pads[k], q = out[k], inp = d.querySelector('input'), [gear, minus, plus] = d.querySelectorAll('button');
    gear.classList.toggle('on', !!R.pads[wordPad(R, k)]?.voice);
    if (document.activeElement !== inp) inp.value = p.t || '';
    inp.placeholder = q.spill ? '' : 'word';
    d.querySelector('.rsyl').textContent = q.syl.map(x => x.name).join('·');
    d.querySelector('output').textContent = q.syl.length || '';
    d.classList.toggle('spill', q.spill); d.classList.toggle('has', q.syl.length > 0);
    minus.disabled = q.syl.length <= 1; plus.disabled = !q.syl.length || q.syl.length >= q.avail;
    d.classList.toggle('down', down.has(k));
    d.classList.toggle('head', playing && k === headStep);
  });
}
$('rapHear').addEventListener('click', () => { ctx.resume(); hearRap(); });
// 🎲 New flow: another flow (never the steady ones, nor the one you're on), laid out afresh.
$('rapNew').addEventListener('click', () => {
  const pool = Object.keys(FLOWS).filter(f => !f.startsWith('steady') && f !== $('rapFlow').value);
  $('rapFlow').value = pool[(Math.random() * pool.length) | 0];
  try { reflow((Math.random() * 2 ** 31) | 0); } catch (e) { status(e.message); }
});
for (const id of ['rapFlow', 'rapRest']) $(id).addEventListener('change', () => {     // a rap already on this sound takes the new flow at once
  if (S.slots[S.cur]?.slices?.[0]?.w != null) try { reflow(rapSeed); } catch (e) { status(e.message); }
});
$('voxHear').addEventListener('click', busy($('voxHear'), async () => {
  const b = await makeVoice(), src = ctx.createBufferSource(); src.buffer = b; src.connect(eng.bus); src.start();
  status('');
}));

// ---------------------------------------------------------------------------
// Export: the pattern or chain as one seamless loop. The ringing tail past
// the end is folded back onto the start, so it loops without a click.
// ---------------------------------------------------------------------------
// Export: the pattern or chain as one seamless loop. The ringing tail past
// the end is folded back onto the start, so it loops without a click. The
// loop is rendered as soon as the box opens, so ⬆ can open the share sheet
// straight from the tap (an iPhone allows that only right after one).
let renderOnly = null;        // while a loop is made: 'all', 'nodrums' or 'drums' (else Mute decides)
async function renderLoop(raw = false, only = null) {          // raw: the mix as it is, mono, not levelled (for the loop-set tool)
  const ticks = 16 * S.chain.length, len = ticks * stepDur(), tail = 2.5;
  const off = new OfflineAudioContext(2, Math.ceil((len + tail) * SR), SR);       // stereo, for ping-pong and chorus
  const e = new Engine(off, { live: false });
  let k = { root: S.root, scale: S.scale };     // as on Play: a pattern with a key of its own changes it, the others carry it on
  renderKeys = S.chain.map(p => (k = S.patKeys[p] || k));
  await warmLoops();                // every loop stretched before the render starts
  renderOnly = only;
  try { for (let t = 0; t < ticks; t++) playTick(e, t, t * stepDur() + (t % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0), false); }
  finally { renderOnly = null; }
  renderKeys = null;
  const buf = await off.startRendering(), n = Math.round(len * SR);
  const chs = [0, 1].map(c => {
    const x = buf.getChannelData(c);
    for (let i = n; i < x.length; i++) x[i % n] += x[i];
    return x.subarray(0, n);
  });
  if (raw) { const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = (chs[0][i] + chs[1][i]) / 2; return m; }
  let top = 0; for (const x of chs) for (const v of x) top = Math.max(top, Math.abs(v));
  if (top > 0.98) for (const x of chs) for (let i = 0; i < n; i++) x[i] *= 0.98 / top;
  return { data: wav(chs, SR), len, chs, top };
}
let exported = null;
const safeName = s => s.replace(/[^\w\- .]+/g, '').replace(/\.wav$/i, '').trim() || 'pocket loop';
function openExport() {
  exported = null;
  $('expName').value = `pocket ${S.bpm}bpm pattern ${S.chain.map(p => p + 1).join('-')}${S.muteBeat ? ' no drums' : ''}`;
  $('expShare').disabled = $('expDownload').disabled = true;
  $('expShare').hidden = !navigator.canShare?.({ files: [new File([''], 'x.wav', { type: 'audio/wav' })] });
  $('expInfo').textContent = 'Getting the loop ready…';
  $('exportBox').hidden = false;
  renderLoop().then(r => {
    exported = r;
    $('expShare').disabled = $('expDownload').disabled = false;
    $('expInfo').textContent = `${r.len.toFixed(2)} s, ${S.chain.length * 4} beats at ${S.bpm} BPM${S.muteBeat ? ', drums muted' : ''}.`;
  }, err => { $('expInfo').textContent = 'Could not make the loop: ' + err.message; log('error', 'export: ' + err.message); });
}
const exportFile = () => new File([exported.data], safeName($('expName').value) + '.wav', { type: 'audio/wav' });
$('export').addEventListener('click', openExport);
$('expCancel').addEventListener('click', () => { $('exportBox').hidden = true; });
$('expShare').addEventListener('click', () => {
  if (!exported) return;
  navigator.share({ files: [exportFile()] }).then(() => { $('exportBox').hidden = true; status('Exported.'); },
    err => { if (err.name !== 'AbortError') { status('Could not share: ' + err.message); log('error', 'share: ' + err.message); } });
});
$('expDownload').addEventListener('click', () => {
  if (!exported) return;
  const f = exportFile(), a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $('exportBox').hidden = true; status(`Saved ${f.name}.`);
});
// ⟳ Make a loop: the pattern (or the chain, as one long loop) made into a loop and kept in the
// library: in the folder chosen (Bass, Chords...), in My Sounds, and in the Loops (My loops). It
// keeps its tempo and bars, so it plays in time at any tempo, on a pad or in a Loops cell.
const LOOP_FOLDERS = ['Beats', 'Bass', 'Chords', 'Lead', 'Sub and color', 'Vox and keys', 'Pads', 'Plucks, mallets and bells', 'Stabs and FX', 'Ambience and vinyl'];
const PART_FOLDER = { Bass: 'Bass', Sub: 'Sub and color', Chords: 'Chords', Lead: 'Lead', 'Vox/Keys': 'Vox and keys', Pad: 'Pads', 'Pluck/Arp': 'Plucks, mallets and bells', 'Stab/FX': 'Stabs and FX' };
for (const f of LOOP_FOLDERS) $('mkPart').add(new Option(f, f));
let made = null, madePv = null;
function chainSounds() { const u = new Set(); for (const p of S.chain) for (const st of S.patterns[p]) for (const n of st) u.add(n.s); return [...u]; }
function openMakeLoop() {
  if (!chainSounds().length) { status('Nothing to make a loop of: the pattern is empty.'); return; }
  const inst = chainSounds().filter(si => !isDrum(si)), drums = chainSounds().some(isDrum);
  $('mkWhat').value = S.muteBeat ? 'nodrums' : 'all';
  $('mkName').value = `${inst.length === 1 && !drums ? S.slots[inst[0]].name : drums && !inst.length ? 'Beat' : 'Loop'} ${S.bpm} BPM${S.chain.length > 1 ? `, ${S.chain.length} bars` : ''}`;
  mkGuess(); $('mkBox').hidden = false; mkRender();
}
function mkGuess() {
  const what = $('mkWhat').value, inst = chainSounds().filter(si => !isDrum(si));
  $('mkPart').value = what === 'drums' || (what === 'all' && chainSounds().some(isDrum)) || !inst.length ? 'Beats'
    : PART_FOLDER[PART[inst[0]]] && inst.every(si => PART[si] === PART[inst[0]]) ? PART_FOLDER[PART[inst[0]]] : 'Chords';
}
function mkRender() {
  made = null; mkStop(); $('mkSave').disabled = $('mkHear').disabled = true;
  $('mkInfo').textContent = 'Making the loop…';
  const want = $('mkWhat').value;
  renderLoop(false, want).then(r => {
    if ($('mkWhat').value !== want) return;
    if (r.top < 0.001) { $('mkInfo').textContent = 'That is silent: nothing plays in it. Choose another "What plays".'; return; }
    made = r; $('mkSave').disabled = $('mkHear').disabled = false;
    $('mkInfo').textContent = `${S.chain.length > 1 ? `Patterns ${S.chain.map(p => p + 1).join(', ')} as one loop` : `Pattern ${S.pat + 1}`}: ${S.chain.length * 4} beats at ${S.bpm} BPM, ${r.len.toFixed(2)} s.`;
  }, err => { $('mkInfo').textContent = 'Could not make the loop: ' + err.message; });
}
function mkStop() { if (madePv) { try { madePv.stop(); } catch (e) {} madePv = null; } $('mkHear').textContent = '▶ Hear it'; }
$('mkWhat').addEventListener('change', () => { mkGuess(); mkRender(); });
$('mkHear').addEventListener('click', () => {
  if (madePv) { mkStop(); return; }
  if (!made) return;
  if (playing) stop();
  ctx.resume();
  const b = ctx.createBuffer(2, made.chs[0].length, SR); made.chs.forEach((x, c) => b.copyToChannel(x, c));
  const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(g); g.connect(eng.bus); src.start(); madePv = src; $('mkHear').textContent = '■ Stop';
});
$('mkCancel').addEventListener('click', () => { mkStop(); $('mkBox').hidden = true; });
$('mkSave').addEventListener('click', async () => {
  if (!made) return;
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  const name = $('mkName').value.trim() || 'My loop', folder = $('mkPart').value, n = made.chs[0].length;
  const buf = ctx.createBuffer(1, n, SR), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (made.chs[0][i] + made.chs[1][i]) / 2;
  const slot = { factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), trig: 'loop' }, buf,
    slices: [{ s: 0, e: n / SR, name, bpm: S.bpm, bars: S.chain.length }] };
  const id = 'm' + Date.now().toString(36);
  await idbPut('mine', { id, name, type: 'loop', folder, created: Date.now(), item: packSlot(slot) }, id);
  await refreshMine(); mkStop(); $('mkBox').hidden = true; drawBrowser();
  status(`“${name}” is in the library: Menu › Sounds › ${folder} (and My Sounds), and in the Loops (My loops). ${S.chain.length * 4} beats; it keeps time at any tempo.`);
});
function toggleMute() {
  S.muteBeat = !S.muteBeat; persist(); draw();
  status(S.muteBeat ? 'Drums muted: the beat and the export leave them out.' : 'Drums back on.');
}
// 16-bit WAV, one channel per array in chs, interleaved.
function wav(chs, rate) {
  const C = chs.length, n = chs[0].length, v = new DataView(new ArrayBuffer(44 + n * C * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * C * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, C, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * C * 2, true); v.setUint16(32, C * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * C * 2, true);
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < C; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, chs[c][i])) * 32767, true);
  return v.buffer;
}

// ---------------------------------------------------------------------------
// Screen and lights
// ---------------------------------------------------------------------------
const cv = $('wave'), g = cv.getContext('2d');
function keyLabel(k) {
  const sl = S.slots[S.cur]; if (!sl) return '';
  switch (S.mode) {
    case 'sound': if (!copying && (k < 8) !== (soundPage === 'inst')) return '';
      return k < 8 ? `${PART[k]} · ${S.slots[k]?.name || ''}` : `Kit · ${S.slots[k]?.name || ''}`;
    case 'pattern': return S.patterns[k].some(st => st.length) ? '●' : '';
    case 'fx': return FX[S.fxSlots[k]][0];
    case 'play': if (S.write && !playing) {
      // the colours show which sounds are on the step; the words, what the current sound plays there
      // (a syllable, "Kick") and any effect
      const st = S.patterns[S.pat][k], f = fxIdx(S.fx[S.pat][k]);
      const ns = sl.kind === 'chop' ? st.filter(n => n.s === S.cur).map(n => sl.slices[n.k]?.name).filter(Boolean).join(' ') : '';
      return (ns + (f != null ? ' ' + FX[f][0] : '')).trim();
    } break;
  }
  if (padsFollow()) return S.patterns[S.pat][k].filter(n => n.s === S.cur).map(n => sl.slices[n.k]?.name).join(' ');
  if (sl.kind === 'chop') return sl.slices[k]?.name || '';
  if (sl.kind === 'sample') {            // a recording has no known pitch: show how far each key moves it
    if (sl.params.keyOf != null) return NOTE[(((S.root + keySemis(k, S.scale) + sl.params.pitch) % 12) + 12) % 12];
    const d = keySemis(k, S.scale) - 12 + sl.params.pitch + 12 * octOf(S.cur) + toKey(S.root, 0);
    return d === 0 ? 'original' : (d > 0 ? '+' : '−') + Math.abs(d);
  }
  const m = (sl.kind === 'multi' ? sl.base : sl.synth.root) + keySemis(k, S.scale) + sl.params.pitch + 12 * octOf(S.cur) + S.root;
  return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}
// The 16 sound colours are tokens in index.html (--s1 … --s16); the canvases read them from there.
const soundVar = s => `var(--s${s + 1})`;
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const classic = () => document.documentElement.classList.contains('classic');
function setLook(look) {
  document.documentElement.classList.toggle('classic', look === 'classic');
  try { localStorage.setItem('pocketLook', look); } catch (e) {}
  $('look').value = look; lastSeen = []; draw(); drawWheel(); if (!$('editor').hidden) drawEd();
}
try { if (localStorage.getItem('pocketLook') === 'classic') document.documentElement.classList.add('classic'); } catch (e) {}
$('look').value = classic() ? 'classic' : 'dark';
$('look').addEventListener('change', e => setLook(e.target.value));
// The Pads sideways (the default), as the Loops; or upright. Sideways is turned a quarter turn
// while the phone is upright, and lies as it is when the phone is really sideways.
const padsWay = () => { try { return localStorage.getItem('pocketPads') || 'side'; } catch (e) { return 'side'; } };
const tallQ = matchMedia('(orientation: portrait)');
function layPads(first) {
  const side = padsWay() !== 'upright', tall = tallQ.matches, R = document.documentElement;
  R.classList.toggle('sidepads', side || !tall); R.classList.toggle('turned', side && tall);
  $('padsWay').value = side ? 'side' : 'upright';
  if (!first) { lastSeen = []; drawWheel(); }
}
tallQ.addEventListener?.('change', () => { layPads(); draw(); });
$('engineWay').value = LIGHT ? 'light' : 'full';
$('engineWay').addEventListener('change', e => {
  try { localStorage.setItem('pocketEngine', e.target.value); } catch (er) {}
  if (playing) stop();
  flushSave(); status('Changing the sound engine…'); setTimeout(() => location.reload(), 400);
});
$('padsWay').addEventListener('change', e => { try { localStorage.setItem('pocketPads', e.target.value); } catch (er) {} layPads(); draw(); });
layPads(true);
// A drum hit's part, by its name: its colour is that part's (a kick is always red).
const HIT_PARTS = ['kick', 'snare', 'clap', 'hat', 'open', 'tom', 'perc', 'cym'];
const HIT_NAME = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hats', open: 'Open hat', tom: 'Toms', perc: 'Percussion', cym: 'Cymbals' };
function hitPart(name = '') {
  const n = name.toLowerCase();
  if (/open hat|loose hat/.test(n)) return 'open';
  if (/kick|bass drum/.test(n)) return 'kick';
  if (/clap/.test(n)) return 'clap';
  if (/snare|ghost|rim|cross|stick|flam/.test(n)) return 'snare';
  if (/hat/.test(n)) return 'hat';
  if (/tom/.test(n)) return 'tom';
  if (/crash|ride|cymbal/.test(n)) return 'cym';
  return 'perc';
}
// A step's colours, in the view chosen. Percussion: a block for each drum part hit there
// (kick, snare, hats...), in that order. Instruments: a block for each instrument on it, in
// sound order. One fills the step; 2-4 split it side by side; 5 or more make a grid. Each
// block is dark and see-through, with a neon edge (the CSS for .key.steps).
// Which side Write shows: the drums when a kit (9-16) is the sound chosen, else the instruments.
const drumSide = si => si >= 8;
const wview = () => (drumSide(S.cur) ? 'perc' : 'inst');
// A key's colour: an instrument's is its part's; a kit's keys are each their hit's (kick red, snare orange...).
const keyColor = (si, k) => (drumSide(si) && S.slots[si]?.kind === 'chop' ? `var(--c-${hitPart(S.slots[si].slices[k]?.name)})` : soundVar(si));
function stepItems(notes) {
  if (wview() === 'perc') {          // the kit chosen only: a block for each part it hits there
    const parts = new Set(notes.filter(n => n.s === S.cur).map(n => hitPart(S.slots[n.s]?.slices?.[n.k]?.name)));
    return HIT_PARTS.filter(p => parts.has(p)).map(p => ({ id: p, color: `var(--c-${p})`, me: false }));
  }
  return [...new Set(notes.filter(n => !drumSide(n.s)).map(n => n.s))].sort((a, b) => a - b)
    .map(s => ({ id: s, color: soundVar(s), me: s === S.cur }));
}
function stepFill(el, items) {
  const n = items.length, sig = wview() + '|' + items.map(x => x.id + (x.me ? '*' : '')).join(',');
  if (el.dataset.fill === sig) return;
  el.dataset.fill = sig;
  const [c, r] = n <= 4 ? [n, 1] : n <= 6 ? [3, 2] : n <= 9 ? [3, 3] : [4, 4];
  const u = el.querySelector('u');
  u.style.gridTemplateColumns = `repeat(${c}, 1fr)`; u.style.gridTemplateRows = `repeat(${r}, 1fr)`;
  u.classList.toggle('many', n > 4);
  u.innerHTML = items.map(x => `<s style="--c:${x.color}"${x.me && n > 1 ? ' class="me"' : ''}></s>`).join('');
}
function draw() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  $('write').classList.toggle('on', S.write);
  drawCustom();
  $('paste').disabled = !(S.mode === 'sound' ? soundClip : clipboard);
  $('write').classList.toggle('replace', S.replace);
  $('write').textContent = S.replace ? 'Replace' : 'Write';
  const sl = S.slots[S.cur];
  $('screen').style.setProperty('--c', soundVar(S.cur));
  $('lcdSound').textContent = `${String(S.cur + 1).padStart(2, '0')} ${sl ? sl.name.toUpperCase() : '…'}${sl ? ' · ' + slotTag(sl) : ''}`;
  // in a chain: the pattern on screen, and where the chain is (bar n of all of them)
  const cpos = playing && headTick >= 0 ? (Math.floor(headTick / 16) % S.chain.length) + 1 : 0;
  $('lcdPat').textContent = S.chain.length > 1 ? `PAT ${S.pat + 1} · ${cpos ? cpos + '/' : ''}${S.chain.length}⛓` : `PAT ${S.pat + 1}`;
  $('lcdMode').textContent = copying ? `COPY ${copying.toUpperCase()}: TAP WHERE` : {
    play: S.write ? (playing ? (S.replace ? 'WRITE: LIVE, REPLACE' : S.quantGrid ? 'WRITE: LIVE RECORD' : 'WRITE: LIVE, NOT QUANTIZED') : 'WRITE: TAP STEPS') : 'PLAY', sound: 'SOUND: PICK ONE',
    pattern: chainEdit ? 'CHAIN: TAP IN ORDER' : 'PATTERN: PICK ONE',
    fx: S.write && playing ? 'FX: HOLD TO RECORD IT' : 'FX: HOLD A KEY', robot: 'ROBOT: TYPE ON THE PADS' }[S.mode];
  $('vol').value = S.vol; $('oVol2').textContent = Math.round(S.vol * 100);
  $('lcdInfo').textContent = `${octOf(S.cur) ? `OCT${octOf(S.cur) > 0 ? '+' : ''}${octOf(S.cur)} ` : ''}${S.bpm} BPM${S.swing > 50 ? ' SW' + S.swing : ''}`;
  const kb = $('keyBtn'), kn = k => `${(isMinor(k.scale) ? MIN_NAME : MAJ_NAME)[k.root]} ${SCALE_SHORT[k.scale] || k.scale.toUpperCase()}`;
  kb.textContent = keyNext ? `${kn(S)} → ${kn(keyNext)}` : kn(S); kb.classList.toggle('waiting', !!keyNext);
  kb.classList.toggle('saved', !!S.patKeys[S.pat]);
  if (!$('loops').hidden) drawLoops();
  $('bpm').value = S.bpm; $('oBpm').textContent = S.bpm; $('swing').value = S.swing; $('oSwing').textContent = S.swing + '%';
  $('scale').value = S.scale; $('root').value = S.root; $('quantGrid').value = S.quantGrid; drawFxPanel();
  const sb = document.querySelector('[data-mode=sound]');
  sb.textContent = S.mode !== 'sound' ? 'Sound' : soundPage === 'inst' ? '🎹 Instr.' : '🥁 Drums';
  for (let k = 0; k < 16; k++) {
    const el = keyEls[k], steps = S.patterns[S.pat][k];
    let lit = false, some = false, cur = false;
    switch (S.mode) {
      case 'sound': cur = k === S.cur; break;
      case 'pattern': cur = k === S.pat; lit = S.chain.includes(k) && (playing ? k === headPat : true); some = S.patterns[k].some(s => s.length); break;
      case 'fx': lit = activeFx.has(S.fxSlots[k]); break;
      default: lit = steps.some(n => n.s === S.cur);
        // the small light: other sounds on the step; in Write, drums not shown in the blocks (the other
        // kits, with a kit chosen; any kit, with an instrument chosen), so a beat under them still shows
        some = !lit && steps.some(n => (S.write ? drumSide(n.s) && n.s !== S.cur : true));
    }
    // Colour: Sound mode, each pad its own sound's; Play, the current sound's; Write, every sound on the step.
    const steps_ = S.mode === 'play' && S.write, tint = S.mode === 'sound' || (S.mode === 'play' && !S.write);
    const away = S.mode === 'sound' && !copying && (k < 8) !== (soundPage === 'inst');      // the other side, in Sound
    if (tint) el.style.setProperty('--c', S.mode === 'sound' ? (drumSide(k) ? 'var(--c-kit)' : soundVar(k)) : keyColor(S.cur, k));
    el.classList.toggle('tint', tint && !away); el.classList.toggle('away', away);
    el.classList.toggle('pad', S.mode === 'sound'); el.classList.toggle('kitpad', S.mode === 'sound' && drumSide(k)); el.classList.toggle('steps', steps_);
    if (steps_) {
      const on = stepItems(steps);
      stepFill(el, on); el.classList.toggle('full', on.length > 0); some = false;
    } else if (el.dataset.fill) { el.dataset.fill = ''; el.querySelector('u').innerHTML = ''; el.classList.remove('full'); }
    el.classList.toggle('fxon', S.mode === 'fx' && lit);
    el.classList.toggle('lit', lit); el.classList.toggle('some', some); el.classList.toggle('cur', cur);
    el.classList.toggle('head', playing && k === headStep && S.mode !== 'sound' && S.mode !== 'pattern');
    const loops = S.mode === 'sound' ? [...looping.keys()].some(id => id.startsWith(k + ':')) : looping.has(`${S.cur}:${k}`);
    el.classList.toggle('down', down.has(k) || loops || (flash?.k === k && performance.now() < flash.until));
    const ci = S.mode === 'pattern' && S.chain.length > 1 ? S.chain.indexOf(k) : -1;
    el.classList.toggle('chain', ci >= 0); el.dataset.chain = ci >= 0 ? S.chain.map((p, i) => p === k ? i + 1 : null).filter(Boolean).join(',') : '';
    el.querySelector('span').textContent = keyLabel(k);
    el.querySelector('em').textContent = S.mode === 'sound' && !away ? slotTag(S.slots[k]) : '';
  }
  drawRobot();
}

// Waveform: the current sound, with its slice markers; synths show the scope.
function drawWave() {
  const dpr = LIGHT ? 1 : window.devicePixelRatio || 1, W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  g.clearRect(0, 0, W, H);
  const ink = classic() ? cssVar('--lcd-ink') : cssVar(`--s${S.cur + 1}`), sl = S.slots[S.cur];
  g.fillStyle = ink; g.strokeStyle = ink;
  if (!sl) return;
  const view = waveView();
  if (!view) {                      // synth: live oscilloscope
    const d = new Float32Array(scope.fftSize); scope.getFloatTimeDomainData(d);
    g.lineWidth = 2 * dpr; g.beginPath();
    for (let i = 0; i < d.length; i++) { const x = i / d.length * W, y = H / 2 - d[i] * H * 0.45; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.font = `${10 * dpr}px ui-monospace, monospace`; g.fillText(sl.synth ? 'SYNTH · ' + sl.synth.type.toUpperCase() : 'EMPTY: LOAD A SOUND (MENU › SOUNDS)', 4 * dpr, 12 * dpr);
    return;
  }
  const { buf, a, b } = view, x = buf.getChannelData(0), sr = buf.sampleRate;
  const i0 = Math.floor(a * sr), i1 = Math.max(i0 + 1, Math.floor(b * sr)), per = (i1 - i0) / W;
  for (let px = 0; px < W; px++) {
    let lo = 0, hi = 0;
    const s0 = i0 + Math.floor(px * per), s1 = Math.min(i1, s0 + Math.max(1, Math.ceil(per)));
    for (let i = s0; i < s1; i += Math.max(1, (per / 32) | 0)) { const v = x[i] || 0; if (v < lo) lo = v; if (v > hi) hi = v; }
    g.fillRect(px, H / 2 - hi * H * 0.48, 1, Math.max(1, (hi - lo) * H * 0.48));
  }
  if (view.marks) {
    const lk = S.lastKey[S.cur];
    const robo = !!sl.params.robot;
    view.marks.forEach((m, k) => {
      if (robo && !sl.slices[k]?.name) return;          // a Robot pad with nothing on it
      const X = (m.s - a) / (b - a) * W, X2 = (m.e - a) / (b - a) * W;
      if (k === lk) { g.globalAlpha = 0.2; g.fillRect(X, 0, X2 - X, H); g.globalAlpha = 1; }
      g.fillRect(X, 0, Math.max(1, dpr), H);
      g.font = `${9 * dpr}px ui-monospace, monospace`; g.fillText(String(k + 1), X + 2 * dpr, 9 * dpr);
    });
  }
}
// What the screen shows: the whole buffer with markers (one-buffer chops and
// samples), or the last slice played (kits made of separate sounds).
function waveView() {
  const sl = S.slots[S.cur];
  if (sl.kind === 'synth') return null;
  if (sl.kind === 'sample') return { buf: sl.buf, a: 0, b: sl.buf.duration };
  if (sl.kind === 'multi') {            // the recording the last key played
    const midi = sl.base + keySemis(S.lastKey[S.cur], S.scale) + sl.params.pitch + S.root;
    const z = sl.zones.reduce((a, b) => (Math.abs(b.m - midi) < Math.abs(a.m - midi) ? b : a));
    return { buf: sl.buf, a: z.s, b: z.e };
  }
  if (!sl.slices?.length) return null;          // an empty sound: nothing to draw
  const lk = S.lastKey[S.cur], one = sl.buf && sl.slices.every(s => !s.buf);
  if (one) return { buf: sl.buf, a: 0, b: sl.buf.duration, marks: sl.slices };
  const s = sl.slices[lk]; const buf = s.buf || sl.buf;
  return { buf, a: s.s, b: s.e };
}
// Tap the waveform to hear the slice there; drag near a marker to move it.
let drag = null;
cv.addEventListener('pointerdown', ev => {
  const v = waveView(); if (!v?.marks) return;
  ctx.resume(); capture(cv, ev);
  const T = v.a + along(cv, ev) * (v.b - v.a);
  const near = v.marks.findIndex((m, k) => k > 0 && Math.abs((m.s - T) / (v.b - v.a) * cv.offsetWidth) < 14);
  const sl = S.slots[S.cur];
  if (near > 0 && sl.contiguous) { drag = near; return; }
  const k = v.marks.findIndex(m => T >= m.s && T < m.e);
  if (k >= 0) { S.lastKey[S.cur] = k; noteOn(eng, S.cur, k, ctx.currentTime); flash = { k, until: performance.now() + 160 }; draw(); }
});
cv.addEventListener('pointermove', ev => {
  if (drag == null) return;
  const v = waveView(), sl = S.slots[S.cur];
  const T = v.a + along(cv, ev) * (v.b - v.a), m = sl.slices;
  const lo = m[drag - 1].s + 0.01, hi = (m[drag + 1]?.s ?? v.b) - 0.01;
  m[drag].s = Math.min(hi, Math.max(lo, T)); m[drag - 1].e = m[drag].s;
});
const endDrag = () => { if (drag != null) { S.lastKey[S.cur] = drag; noteOn(eng, S.cur, drag, ctx.currentTime); drag = null; dirty(); } };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

let lastSeen = [], lastNoteAt = 0, frameN = 0;
function frame() {
  const now = ctx.currentTime;
  let changed = false;
  while (uiQueue.length && uiQueue[0].t <= now) {
    const q = uiQueue.shift();
    if (q.step !== headStep || q.pat !== headPat) changed = true;
    headTick = q.tick; headStep = q.step; headPat = q.pat;
    if (followPlay && !chainEdit && q.pat !== S.pat && S.chain.length > 1) { S.pat = q.pat; changed = true; }
  }
  if (keyNext?.at != null && now >= keyNext.at) { const k = keyNext; keyNext = null; k.auto ? quietKey(k) : applyKey(k); }
  if (flash && performance.now() > flash.until) { flash = null; changed = true; }
  if (changed) { draw(); drawWheel(); }
  tickGrid(now);
  // Redraw the screen only when what it shows has changed (or the scope is
  // moving), so the phone has its time free to answer the keys.
  const sl = S.slots[S.cur], seen = [sl, S.cur, S.lastKey[S.cur], sl?.slices?.[S.lastKey[S.cur]], cv.clientWidth];
  const scopeLive = sl?.kind === 'synth' && (playing || ctx.currentTime < lastNoteAt + 1.5) && (!LIGHT || (frameN++ & 3) === 0);   // Light: the scope a quarter as often
  if (drag != null || scopeLive || seen.some((v, i) => v !== lastSeen[i])) { drawWave(); lastSeen = seen; }
  requestAnimationFrame(frame);
}

let statusTimer = 0;
function status(msg) {
  $('status').textContent = msg; $('lStatus').textContent = msg; clearTimeout(statusTimer);
  if (msg && !/…$/.test(msg)) statusTimer = setTimeout(() => { $('status').textContent = ''; $('lStatus').textContent = ''; }, 6000);
}

// Computer keyboard
const KB = '1234qwerasdfzxcv';
addEventListener('keydown', ev => {
  if (ev.target.matches('input, textarea, select') || ev.metaKey || ev.ctrlKey || ev.repeat) return;
  if (ev.code === 'Space') { ev.preventDefault(); playing ? stop() : (start(), resumeLoops()); return; }
  const k = KB.indexOf(ev.key.toLowerCase()); if (k >= 0) press(k);
});
addEventListener('keyup', ev => { const k = KB.indexOf(ev.key.toLowerCase()); if (k >= 0) release(k); });
// iPhone: the audio clock stops when the page is hidden; stop cleanly.
document.addEventListener('visibilitychange', () => { if (!document.hidden) return; if (playing) stop(); flushSave(); });
addEventListener('pagehide', () => flushSave());

// ---------------------------------------------------------------------------
// Undo and redo. dirty() marks a change; the first change in a burst (a
// slider drag, a live take) keeps the state from before it, so one undo takes
// back the whole burst. Choosing a sound or a pattern is not a change.
// ---------------------------------------------------------------------------
let committed = null, undoOpen = false, undoTimer = 0;
const undoStack = [], redoStack = [];
const cloneSlot = sl => sl && { ...sl, params: { ...sl.params }, synth: sl.synth && { ...sl.synth }, slices: sl.slices?.map(x => ({ ...x })) };
function snapshot(src = S) {
  return { slots: src.slots.map(cloneSlot), patterns: src.patterns.map(p => p.map(st => st.map(n => ({ ...n, lock: n.lock && { ...n.lock } })))),
    fx: src.fx.map(f => [...f]), patKeys: [...(src.patKeys || new Array(16).fill(null))], chain: [...src.chain], pat: src.pat, cur: src.cur, lastKey: [...src.lastKey],
    bpm: src.bpm, swing: src.swing, scale: src.scale, root: src.root, vol: src.vol };
}
function noteChange() {
  if (!committed) return;
  if (!undoOpen) { undoStack.push(committed); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; undoOpen = true; }
  clearTimeout(undoTimer); undoTimer = setTimeout(closeUndo, 600);
  showUndo();
}
function closeUndo() { clearTimeout(undoTimer); undoOpen = false; committed = snapshot(); }
// Call before a change that is a step of its own (a button, a tap), so it
// is not merged with whatever came just before.
function checkpoint() { if (undoOpen) closeUndo(); }
function restore(snap) {
  const { pat, cur } = S;             // stay on the pattern and sound you're looking at
  Object.assign(S, snapshot(snap), { pat, cur }); committed = snapshot();
  for (const f of [...activeFx]) releaseFx(f);
  setVolume(); syncPanel(); draw(); persist(); showUndo();
}
function undo() {
  if (undoOpen) closeUndo();
  if (!undoStack.length) { status('Nothing to undo.'); return; }
  redoStack.push(snapshot()); restore(undoStack.pop()); status('Undone.');
}
function redo() {
  if (undoOpen) closeUndo();
  if (!redoStack.length) { status('Nothing to redo.'); return; }
  undoStack.push(snapshot()); restore(redoStack.pop()); status('Redone.');
}
function showUndo() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; }
$('undo').addEventListener('click', undo);
$('verbose').addEventListener('change', () => { verbose = $('verbose').checked; log('log', verbose ? 'verbose on' : 'verbose off'); });
$('copyLog').addEventListener('click', async () => {
  const text = LOG.join('\n');
  try { await navigator.clipboard.writeText(text); status('Log copied. Paste it into a message.'); }
  catch (e) { const v = $('logView'); getSelection().selectAllChildren(v); status('Select all of the log and copy it.'); }
});
$('clearLog').addEventListener('click', () => { LOG.length = 0; log('log', 'cleared'); });
$('redo').addEventListener('click', redo);

// ---------------------------------------------------------------------------
// Drum beats. A style is written with roles (kick, snare, hat...), and each
// role is found by name in the drum sound, so a beat works on any kit:
// acoustic, 808, 909, or a chopped recording with named slices. Hand drums
// (conga, bongo, shaker) come from a percussion sound if there is one.
// ---------------------------------------------------------------------------
const STYLES = {
  boombap: { name: 'Boom bap', bpm: 90, swing: 58, parts: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ghost: '.......x.....x..' } },
  lofi: { name: 'Lo-fi', bpm: 76, swing: 64, parts: { kick: 'x......x.x......', snare: '....x.......x...', hat: 'x.xxx.x.x.xxx.x.', rim: '..........x.....' } },
  hiphop: { name: 'Lazy hip hop', bpm: 84, swing: 62, parts: { kick: 'x..x......xx....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.' } },
  trap: { name: 'Trap', bpm: 140, swing: 50, parts: { kick: 'x......x..x.....', snare: '........x.......', hat: 'x.x.x.x.x.xxx.xx', open: '...........x....' } },
  breakbeat: { name: 'Funky break', bpm: 100, swing: 56, parts: { kick: 'x.x.......xx....', snare: '....x..x.x..x..x', hat: 'x.x.x.x.x.x.x.x.' } },
  rock: { name: 'Rock', bpm: 112, swing: 50, parts: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' } },
  house: { name: 'House', bpm: 124, swing: 54, parts: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x...x...x...x...', open: '..x...x...x...x.' } },
  techno: { name: 'Techno', bpm: 132, swing: 50, parts: { kick: 'x...x...x...x...', open: '..x...x...x...x.', rim: '...x..x....x..x.', clap: '............x...' } },
  disco: { name: 'Disco', bpm: 118, swing: 50, parts: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', open: '..x...x...x...x.' } },
  funk: { name: 'Funk', bpm: 104, swing: 54, parts: { kick: 'x.x...x...x..x..', snare: '....x..x.x..x...', hat: 'x.x.x.x.x.x.x.x.', ghost: '..x.....x.....x.', open: '...............x' } },
  motown: { name: 'Motown', bpm: 120, swing: 52, parts: { kick: 'x.....x.x.....x.', snare: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.x.' } },
  shuffle: { name: 'Blues shuffle', bpm: 96, swing: 68, parts: { kick: 'x.......x.......', snare: '....x.......x...', ride: 'x.xxx.xxx.xxx.xx' } },
  reggae: { name: 'Reggae one drop', bpm: 76, swing: 58, parts: { kick: '........x.......', rim: '........x.......', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.' } },
  bossa: { name: 'Bossa nova', bpm: 130, swing: 50, parts: { kick: 'x..xx..xx..xx..x', rim: 'x..x..x...x..x..', hat: 'x.x.x.x.x.x.x.x.' } },
  garage: { name: 'UK garage', bpm: 132, swing: 62, parts: { kick: 'x......x..x.....', snare: '....x.......x...', hat: '..x...x...x...xx', rim: '.......x......x.' } },
  jungle: { name: 'Jungle', bpm: 168, swing: 52, parts: { kick: 'x.........x..x..', snare: '....x..x.x..x...', hat: 'x.x.x.x.x.x.x.x.', ghost: '.x.....x......x.' } },
  drill: { name: 'Drill', bpm: 142, swing: 50, parts: { kick: 'x.....x...x...x.', snare: '........x.....x.', hat: 'x..x..x.x..x..x.', open: '.............x..' } },
  march: { name: 'Second line', bpm: 100, swing: 60, parts: { kick: 'x.......x..x....', snare: 'x.xxx.x.x.xxx.x.', crash: 'x...............' } },
  dembow: { name: 'Dembow', bpm: 96, swing: 50, parts: { kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: 'x.x.x.x.x.x.x.x.' } },
  dnb: { name: 'Drum & bass', bpm: 172, swing: 50, parts: { kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ghost: '.......x.x....x.' } },
  dubstep: { name: 'Dubstep', bpm: 140, swing: 50, parts: { kick: 'x.........x.....', snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.', open: '......x.........' } },
  jazz: { name: 'Jazz swing', bpm: 132, swing: 66, parts: { ride: 'x...x..xx...x..x', pedal: '....x.......x...', softkick: 'x.......x.......', ghost: '..........x.....' } },
};
const ROLES = {
  kick: [/^kick$/i, /kick/i], softkick: [/soft kick/i], snare: [/^snare$/i, /snare/i, /clap/i], clap: [/clap/i],
  ghost: [/ghost/i], rim: [/rim|cross[- ]?stick|clave/i], hat: [/^(closed )?hat$/i, /closed hat/i], open: [/open hat/i],
  pedal: [/pedal/i], ride: [/^ride$/i, /ride/i], crash: [/crash|cymbal/i], tom: [/tom/i],
  conga: [/^conga$/i, /conga|tumba/i], bongo: [/bongo/i], shaker: [/^shaker$/i, /shaker|cabasa/i],
};
// What to use when a kit has no such sound; `vol` makes it quieter (a lock).
const STANDIN = { softkick: ['kick', 0.5], clap: ['snare'], ghost: ['snare', 0.3], open: ['hat'], pedal: ['hat', 0.5],
  ride: ['hat'], crash: ['open'], hat: ['shaker'], shaker: ['hat', 0.6], conga: ['tom'], bongo: ['tom', 0.7], rim: ['hat'] };
const HAND = new Set(['conga', 'bongo', 'shaker']);
const hasRole = (sl, role) => sl?.kind === 'chop' && ROLES[role].some(rx => sl.slices.some(x => rx.test(x.name || '')));
function drumSlot() { return hasRole(S.slots[S.cur], 'kick') ? S.cur : S.slots.findIndex(sl => hasRole(sl, 'kick')); }
function percSlot() {           // a hand-drum sound: one with congas and no kick
  const i = S.slots.findIndex(sl => hasRole(sl, 'conga') && !hasRole(sl, 'kick'));
  return i >= 0 ? i : S.slots.findIndex(sl => hasRole(sl, 'conga'));
}
function findHit(role, ds, ps, vol = 1, depth = 0) {
  for (const si of HAND.has(role) && ps >= 0 ? [ps, ds] : [ds]) {
    const sl = S.slots[si];
    for (const rx of ROLES[role]) {
      const k = sl.slices.findIndex(x => rx.test(x.name || ''));
      if (k >= 0) return { s: si, k, lock: vol < 1 ? { vol: sl.params.vol * vol } : undefined };
    }
  }
  const st = STANDIN[role];
  return st && depth < 3 ? findHit(st[0], ds, ps, vol * (st[1] ?? 1), depth + 1) : null;
}
// Write a beat into the current pattern, in place of the drums (the kit and
// the hand drums) already there. Other sounds, like a bassline, stay.
function putBeat(style, ds = drumSlot(), setTempo = true, parts = style.parts) {
  checkpoint();
  if (ds < 0) { status('No drum kit loaded. Load the Acoustic Kit or 808 Kit on a key first.'); return false; }
  const ps = percSlot(), P = S.patterns[S.pat], beat = beatSteps(parts, ds, ps);
  for (let i = 0; i < 16; i++) P[i] = [...P[i].filter(n => n.s !== ds && n.s !== ps), ...beat[i]];
  if (setTempo) { S.bpm = style.bpm; S.swing = style.swing; }
  dirty(); draw();
  return true;
}
// A beat's notes, step by step, on kit ds (and hand drums ps).
function beatSteps(parts, ds, ps) {
  const P = Array.from({ length: 16 }, () => []);
  for (const [role, line] of Object.entries(parts)) {
    const hit = findHit(role, ds, ps); if (!hit) continue;
    for (let i = 0; i < 16; i++) if (line[i] === 'x' && !P[i].some(n => n.s === hit.s && n.k === hit.k)) P[i].push({ s: hit.s, k: hit.k, ...(hit.lock && { lock: hit.lock }) });
  }
  // An open hat and a closed hat on the same step: the open one wins.
  const hat = findHit('hat', ds, ps), open = findHit('open', ds, ps);
  if (hat && open && (hat.s !== open.s || hat.k !== open.k))
    for (let i = 0; i < 16; i++) if (P[i].some(n => n.s === open.s && n.k === open.k)) P[i] = P[i].filter(n => !(n.s === hat.s && n.k === hat.k));
  return P;
}
// ▶ Hear it: the beat chosen, on the kit chosen, at its own tempo, looping
// until tapped again, without touching the pattern.
let beatPv = null;
function stopPreview() {
  if (!beatPv) return;
  clearTimeout(beatPv.timer); beatPv = null;
  $('hearBeat').textContent = '▶ Hear it'; $('hearBeat').classList.remove('go');
}
function hearBeat() {
  stopPreview();
  const ch = beatChoice(), st = ch.human || ch.style, ds = drumSlot();
  if (ds < 0) { status('No drum kit loaded: choose one above first.'); return; }
  if (playing) stop();
  ctx.resume();
  const steps = ch.human ? humanSteps(ch.human, ds, percSlot()) : beatSteps(st.parts, ds, percSlot());
  const sd = 60 / st.bpm / 4, sw = ch.human ? 0 : (2 * st.swing / 100 - 1) * sd;
  const pv = beatPv = { t: ctx.currentTime + 0.05, i: 0 };
  const run = () => {
    if (beatPv !== pv) return;
    while (pv.t < ctx.currentTime + 0.12) {
      const at = pv.t + (pv.i % 2 ? sw : 0);
      for (const n of steps[pv.i % 16]) noteOn(eng, n.s, n.k, at + (n.o || 0) * sd, null, n.lock);
      pv.t += sd; pv.i++;
    }
    pv.timer = setTimeout(run, 25);
  };
  run();
  $('hearBeat').textContent = '■ Stop'; $('hearBeat').classList.add('go');
  status(`Hearing ${beatName(ch)} at ${st.bpm} BPM on ${S.slots[ds].name}. "Put this beat in" puts it in pattern ${S.pat + 1}.`);
}
$('hearBeat').addEventListener('click', () => (beatPv ? stopPreview() : hearBeat()));
$('style').addEventListener('change', () => { if (beatPv) hearBeat(); });

// A new beat in a style: its pattern, varied. Extra kicks fall where they
// groove (the "and" and "a" of a beat), ghost notes sit around the backbeat,
// the hats change their walk, and now and then there is a fill or a crash.
function makeBeat(style) {
  const r = Math.random, line = s => (s || '................').split('');
  const p = Object.fromEntries(Object.entries(style.parts).map(([k, v]) => [k, line(v)]));
  const kick = p.kick || p.softkick;
  if (kick) for (let i = 1; i < 16; i++) {
    if (kick[i] === '.' && r() < [0, 0.06, 0.16, 0.1][i % 4]) kick[i] = 'x';
    else if (kick[i] === 'x' && i % 8 && r() < 0.2) kick[i] = '.';
  }
  const back = p.snare || p.clap;
  if (back && style !== STYLES.jazz) {
    p.ghost = line(); for (let i = 0; i < 16; i++) if (back[i] === '.' && i % 2 && r() < 0.18) p.ghost[i] = 'x';
  }
  if (p.hat && r() < 0.5) {
    const walks = ['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'x.xxx.x.x.xxx.x.', 'x.x.x.xxx.x.x.xx', '..x...x...x...x.'];
    p.hat = line(walks[(r() * walks.length) | 0]);
  }
  if (r() < 0.35) { p.open = p.open || line(); p.open[r() < 0.5 ? 14 : 6] = 'x'; }
  if (r() < 0.35) {           // a fill over the last beat
    p.tom = line(); for (let i = 12; i < 16; i++) if (r() < 0.6) { p.tom[i] = 'x'; if (back) back[i] = '.'; }
    if (p.hat) for (let i = 12; i < 16; i++) p.hat[i] = '.';
  }
  if (r() < 0.2) { p.crash = line(); p.crash[0] = 'x'; }
  if (percSlot() >= 0 && !p.conga && style !== STYLES.jazz && r() < 0.45) {
    p.conga = line(); for (let i = 0; i < 16; i++) if (r() < [0.35, 0.1, 0.25, 0.3][i % 4]) p.conga[i] = 'x';
    if (r() < 0.5) { p.shaker = line(); for (let i = 0; i < 16; i++) if (i % 2 === 0 || r() < 0.3) p.shaker[i] = 'x'; }
  }
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.join('')]));
}
// The drum beats come two ways: generated by the app (a pattern for each style, varied on 🎲), and
// played by drummers: one bar each from the Groove MIDI Dataset (Magenta, CC BY 4.0; tools/grooves.py
// beats), every hit at the drummer's own timing and loudness, put on whatever kit is chosen.
let HUMAN = [];
function fillStyles() {
  const was = $('style').value, sel = $('style'); sel.textContent = '';
  const gen = document.createElement('optgroup'); gen.label = 'Generated by the app';
  for (const [id, st] of Object.entries(STYLES)) gen.appendChild(new Option(`${st.name} · ${st.bpm}`, id));
  sel.appendChild(gen);
  if (HUMAN.length) {
    const hum = document.createElement('optgroup'); hum.label = 'Played by drummers';
    HUMAN.forEach((b, i) => hum.appendChild(new Option(`${b.style} · ${b.bpm} · ${b.by}`, 'h:' + i)));
    sel.appendChild(hum);
  }
  if (was && [...sel.options].some(o => o.value === was)) sel.value = was;
  showBeatKind();
}
// Under the list: where the beat chosen comes from.
function showBeatKind() {
  const v = $('style').value;
  $('beatKind').textContent = v.startsWith('h:') && HUMAN[+v.slice(2)]
    ? `Played by ${HUMAN[+v.slice(2)].by}: a real performance (the Groove MIDI Dataset), each hit at the drummer's own timing and loudness, on your kit. 🎲 gives another drummer's beat in this style.`
    : 'Generated by the app: a pattern for the style; 🎲 makes a new one, varied. (The list also has beats played by drummers.)';
}
$('style').addEventListener('change', showBeatKind);
fillStyles();
fetch('sounds/humanbeats.json').then(r => r.json()).then(d => { HUMAN = d.beats || []; fillStyles(); }).catch(() => {});
const beatChoice = () => { const v = $('style').value; return v.startsWith('h:') ? { human: HUMAN[+v.slice(2)] } : { style: STYLES[v] }; };
const beatName = ch => (ch.human ? `a ${ch.human.style.toLowerCase()} beat played by ${ch.human.by}` : ch.style.name.toLowerCase());
// A drummer's bar on kit ds (and hand drums ps): each hit on its part's sound, as loud as it was
// played, and just off the step as it was played (o).
function humanSteps(hb, ds, ps) {
  const P = Array.from({ length: 16 }, () => []);
  for (const [st, role, vel, o] of hb.hits) {
    const hit = findHit(role, ds, ps, Math.min(1, Math.pow(vel / 110, 1.3))); if (!hit) continue;
    if (P[st].some(n => n.s === hit.s && n.k === hit.k)) continue;
    P[st].push({ s: hit.s, k: hit.k, ...(hit.lock && { lock: hit.lock }), ...(o && { o }) });
  }
  return P;
}
function putHuman(hb, ds = drumSlot()) {
  checkpoint();
  if (ds < 0) { status('No drum kit loaded. Load the Acoustic Kit or 808 Kit on a key first.'); return false; }
  const ps = percSlot(), P = S.patterns[S.pat], beat = humanSteps(hb, ds, ps);
  for (let i = 0; i < 16; i++) P[i] = [...P[i].filter(n => n.s !== ds && n.s !== ps), ...beat[i]];
  S.bpm = hb.bpm; S.swing = 50;            // its own feel is in its timing
  dirty(); draw();
  return true;
}
$('putBeat').addEventListener('click', () => {
  const ch = beatChoice();
  if (ch.human ? putHuman(ch.human) : putBeat(ch.style))
    status(`${ch.human ? `A ${ch.human.style.toLowerCase()} beat played by ${ch.human.by}` : `The ${ch.style.name.toLowerCase()} beat`} in pattern ${S.pat + 1}, at ${(ch.human || ch.style).bpm} BPM. ↶ Undo takes it back.`);
});
const genBeat = () => {
  ctx.resume();
  const ch = beatChoice();
  if (ch.human) {               // another drummer's beat in this style
    const same = HUMAN.map((b, i) => [b, i]).filter(([b]) => b.style === ch.human.style && b !== ch.human);
    if (!same.length) { status(`Only one ${ch.human.style.toLowerCase()} beat played by a drummer here.`); return; }
    const [b, i] = same[(Math.random() * same.length) | 0];
    $('style').value = 'h:' + i; showBeatKind();
    if (putHuman(b)) status(`Another ${b.style.toLowerCase()} beat, played by ${b.by}, at ${b.bpm} BPM. Again for another; ↶ Undo for the last one.`);
    return;
  }
  const st = ch.style;
  if (putBeat(st, drumSlot(), true, makeBeat(st))) status(`A new ${st.name.toLowerCase()} beat in pattern ${S.pat + 1}. Again for another; ↶ Undo for the last one.`);
};
$('genBeat').addEventListener('click', genBeat);

// 🎲 Vary (the button): the beat already in the pattern, with one or two small changes a drummer might
// make: a kick pushed onto an off-beat or played early, ghost notes on the snare, an open hat, a quick
// double on the hat, a pickup or a little fill at the end of the bar, a hit left out for space, the
// hat played with accents. Each press starts again from the same beat, so it gives another take on
// it and never drifts away; a beat changed by hand (or a new one put in) becomes the one varied.
let varied = null;
const stepName = i => (i % 4 ? `the "${['e', 'and', 'a'][i % 4 - 1]}" of ${((i / 4) | 0) + 1}` : `beat ${i / 4 + 1}`);
function variation(B, ds, ps) {
  const r = Math.random, pick = a => a[(r() * a.length) | 0];
  const part = n => hitPart(S.slots[n.s]?.slices?.[n.k]?.name);
  const has = (i, p) => B[i].some(n => part(n) === p);
  const add = (i, role, vol = 1) => {
    const h = findHit(role, ds, ps, vol); if (!h || B[i].some(n => n.s === h.s && n.k === h.k)) return false;
    B[i].push({ s: h.s, k: h.k, ...(h.lock && { lock: h.lock }) }); return true;
  };
  const drop = (i, p) => { const j = B[i].findIndex(n => part(n) === p); return j < 0 ? null : B[i].splice(j, 1)[0]; };
  const back = [4, 12].some(i => has(i, 'clap')) && ![4, 12].some(i => has(i, 'snare')) ? 'clap' : 'snare';
  const hats = B.filter((st, i) => has(i, 'hat')).length;
  const moves = [
    [3, () => {                 // a kick on an off-beat, where kicks groove
      const c = [10, 7, 3, 14, 11, 6].filter(i => !has(i, 'kick') && !has(i, back));
      if (!c.length) return null; const i = pick(c.slice(0, 4));
      return add(i, 'kick', 0.85) && `an extra kick on ${stepName(i)}`;
    }],
    [2, () => {                 // a kick played a 16th early (not the one on beat 1 or 3)
      const c = []; for (let i = 1; i < 16; i++) if (i % 8 && has(i, 'kick') && !has(i - 1, 'kick') && !has(i - 1, back)) c.push(i);
      if (!c.length) return null; const i = pick(c); B[i - 1].push(drop(i, 'kick'));
      return `a kick pushed early, onto ${stepName(i - 1)}`;
    }],
    [3, () => {                 // ghost notes around the backbeat
      const c = [3, 5, 11, 13, 7, 15, 9].filter(i => !has(i, back) && !has(i, 'snare') && !has(i, 'kick'));
      let k = 0; const want = 1 + ((r() * 2) | 0);
      while (k < want && c.length) if (add(c.splice((r() * Math.min(4, c.length)) | 0, 1)[0], 'ghost', 0.85)) k++;
      return k ? (k > 1 ? 'ghost notes on the snare' : 'a ghost note on the snare') : null;
    }],
    [2, () => {                 // an open hat on an off-beat
      if (!hats) return null;
      const c = [14, 6].filter(i => !has(i, 'open')); if (!c.length) return null;
      const i = pick(c); drop(i, 'hat');
      if (!add(i, 'open', 0.8)) return null; drop(i + 1, 'hat');
      return `an open hat on ${stepName(i)}`;
    }],
    [2, () => {                 // a quick double on the hat
      if (hats < 4) return null;
      const c = [15, 7, 13, 11].filter(i => !has(i, 'hat') && !has(i, 'open') && has(i - 1, 'hat')); if (!c.length) return null;
      const i = pick(c); return add(i, 'hat', 0.55) && `a quick double on the hi-hat at ${stepName(i - 1)}`;
    }],
    [1.5, () => {               // a pickup or a little fill into the next bar
      const fills = [[[15, back, 0.7]], [[14, back, 0.55], [15, back, 0.8]], [[14, 'tom', 0.8], [15, 'tom', 0.9]], [[13, back, 0.5], [14, 'tom', 0.75], [15, 'tom', 0.9]]];
      const f = pick(fills); let k = 0;
      for (const [i, role, v] of f) { drop(i, 'hat'); if (add(i, role, v)) k++; }
      return k ? (f.length > 1 ? 'a little fill at the end of the bar' : 'a snare pickup into the next bar') : null;
    }],
    [1.5, () => {               // a hit left out, for space
      const c = []; for (let i = 1; i < 16; i++) if (i % 8 && has(i, 'kick')) c.push(i);
      if (c.length < 2) return null; const i = pick(c); drop(i, 'kick');
      return `the kick on ${stepName(i)} left out, for space`;
    }],
    [1, () => {                 // the hat with accents: the beats louder, the off-beats softer
      if (hats < 6 || B.some((st, i) => st.some(n => part(n) === 'hat' && n.lock))) return null;
      for (let i = 0; i < 16; i++) for (const n of B[i]) if (part(n) === 'hat' && i % 4) n.lock = { vol: S.slots[n.s].params.vol * (i % 2 ? 0.5 : 0.75) };
      return 'the hi-hat played with accents';
    }],
  ];
  const said = [], want = r() < 0.55 ? 1 : 2, left = [...moves];
  while (said.length < want && left.length) {
    let t = r() * left.reduce((a, [w]) => a + w, 0), j = 0;
    while ((t -= left[j][0]) > 0) j++;
    const got = left.splice(j, 1)[0][1](); if (got) said.push(got);
  }
  return [B, said];
}
function varyBeat() {
  ctx.resume(); checkpoint();
  const P = S.patterns[S.pat], count = si => P.reduce((a, st) => a + st.filter(n => n.s === si).length, 0);
  const kits = S.slots.map((sl, i) => i).filter(i => hasRole(S.slots[i], 'kick')).sort((a, b) => count(b) - count(a));
  const ds = kits.length ? kits[0] : -1, ps = percSlot();
  if (ds < 0 || !count(ds)) { genBeat(); return; }     // no beat here yet: a new one to start from
  const mine = n => n.s === ds || (ps >= 0 && n.s === ps);
  const take = () => JSON.stringify(P.map(st => st.filter(mine)));
  const now = take(), base = varied && varied.pat === S.pat && varied.last === now ? varied.base : now;
  let out, said;
  for (let tries = 0; tries < 12; tries++) {
    [out, said] = variation(JSON.parse(base), ds, ps);
    const o = JSON.stringify(out); if (said.length && o !== base && o !== now) break;
  }
  for (let i = 0; i < 16; i++) P[i] = [...P[i].filter(n => !mine(n)), ...out[i]];
  varied = { pat: S.pat, base, last: take() };
  dirty(); draw();
  status(`The same beat, varied: ${said.join(', and ')}. Again for another take on it; ↶ Undo takes it back.`);
}

// Drum kit (Beat tab): the kit the beats play on, swapped on its own key
// (the kit on the keys, or sound 9 if there is none).
const KITS_MENU = [['Recorded kits', ['acoustic', 'boombap', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly']],
  ['Drum machines', ['vigkit', 'ebbkit', 'tr808', 'electro', 'drumtraks', 'kit808', 'kit909', 'kitcr78', 'kit606', 'kitminimal']]];
for (const [g, ids] of KITS_MENU) {
  const og = document.createElement('optgroup'); og.label = g;
  for (const id of ids) og.appendChild(new Option(LIBRARY[id].name, id));
  $('kitSel').appendChild(og);
}
$('kitSel').addEventListener('change', async () => {
  const id = $('kitSel').value, si = drumSlot() >= 0 ? drumSlot() : 8;
  checkpoint();
  S.slots[si] = await factorySlot(id); S.lastKey[si] = 0;
  syncPanel(); dirty(); draw();
  if (beatPv) hearBeat(); else noteOn(eng, si, 0, ctx.currentTime + 0.01);
  status(`${LIBRARY[id].name} on sound ${si + 1}: the beats play on it.`);
});
// Bass (Rhythm tab): the bass on sound 1 (the Bass part), and basslines for it. Basslines come two
// ways: played by bassists, one bar each from FiloBass (tools/basslines.py: walking lines by jazz
// bassists, each over one chord, its notes as half steps from that chord's root, played here from
// the key's root), and generated by the app. Either goes in the current pattern in place of sound
// 1's notes; Hear it plays it with the pattern's drums.
const BASSES = ['bass808', 'uprightbass', 'elecbass', 'contrabass', 'subsine', 'wobble', 'growl', 'reese', 'sawbass', 'sqbass', 'fmbass', 'acid'];
for (const id of BASSES) $('bassSel').add(new Option(LIBRARY[id].name, id));
$('bassSel').addEventListener('change', async () => {
  const id = $('bassSel').value; checkpoint();
  S.slots[0] = await factorySlot(id); S.lastKey[0] = 0;
  syncPanel(); dirty(); draw();
  if (linePv) hearLine(); else noteOn(eng, 0, 0, ctx.currentTime + 0.01);
  status(`${LIBRARY[id].name} on sound 1 (Bass): the basslines play on it.`);
});
// The app's own: [16th, half steps from the root]; 'kicks' is the root on every kick of the pattern.
const GEN_LINES = [
  { name: 'Roots on the kicks', kicks: true }, { name: 'Boom bap bounce', hits: [[0, 0], [7, 0], [10, 0], [14, 12]] },
  { name: 'Root and fifth', hits: [[0, 0], [6, 7], [8, 0], [14, 7]] }, { name: 'Octaves in 8ths', hits: [0, 2, 4, 6, 8, 10, 12, 14].map(st => [st, st % 4 ? 12 : 0]) },
  { name: 'Long roots (808)', hits: [[0, 0], [10, 0]] }, { name: 'Funk sixteenths', hits: [[0, 0], [3, 0], [4, 12], [6, 0], [10, 10], [11, 12], [14, 7]] },
  { name: 'Walking (made up)', hits: [[0, 0], [4, 3], [8, 7], [12, 6]] }];
let HUMANBASS = [];
function fillLines() {
  const was = $('lineSel').value, sel = $('lineSel'); sel.textContent = '';
  for (const q of ['minor', 'dominant', 'major']) {
    const mine = HUMANBASS.map((b, i) => [b, i]).filter(([b]) => b.quality === q); if (!mine.length) continue;
    const og = document.createElement('optgroup'); og.label = `Played by bassists: over a ${q === 'dominant' ? 'dominant 7th' : q} chord`;
    for (const [b, i] of mine) og.appendChild(new Option(`${b.tune} · bar ${b.bar}`, 'h:' + i));
    sel.appendChild(og);
  }
  const og = document.createElement('optgroup'); og.label = 'Generated by the app';
  GEN_LINES.forEach((l, i) => og.appendChild(new Option(l.name, 'g:' + i)));
  sel.appendChild(og);
  if (was && [...sel.options].some(o => o.value === was)) sel.value = was;
  else { const q = isMinor(S.scale) ? 'minor' : 'major', i = HUMANBASS.findIndex(b => b.quality === q); if (i >= 0) sel.value = 'h:' + i; }
  showLineKind();
}
function showLineKind() {
  const v = $('lineSel').value, b = v.startsWith('h:') && HUMANBASS[+v.slice(2)];
  $('lineKind').textContent = b ? `Played by a jazz bassist: bar ${b.bar} of ${b.tune}, over a ${b.quality === 'dominant' ? 'dominant 7th' : b.quality} chord (from FiloBass), played from your key's root on sound 1. 🎲: another like it.`
    : 'Generated by the app. (The list also has basslines played by bassists.)';
}
fillLines();
fetch('sounds/humanbass.json').then(r => r.json()).then(d => { HUMANBASS = d.bars || []; fillLines(); }).catch(() => {});
$('lineSel').addEventListener('change', () => { showLineKind(); if (linePv) hearLine(); });
// A line's hits: [16th, half steps from the root].
function lineHits() {
  const v = $('lineSel').value;
  if (v.startsWith('h:')) return HUMANBASS[+v.slice(2)]?.hits || [];
  const g = GEN_LINES[+v.slice(2)]; if (!g) return [];
  if (!g.kicks) return g.hits;
  const kicks = [];
  for (let st = 0; st < 16; st++) if (S.patterns[S.pat][st].some(n => drumSide(n.s) && hitPart(S.slots[n.s]?.slices?.[n.k]?.name) === 'kick')) kicks.push([st, 0]);
  return kicks.length ? kicks : [[0, 0], [8, 0]];
}
// Half steps from the root, as sound 1's keys: the scale step at or below it, its octave, and
// what is left over as a pitch for that note alone (a passing note between the scale's).
function bassNotes(hits) {
  const sl = S.slots[0]; if (!sl || !['synth', 'multi', 'sample'].includes(sl.kind)) return null;
  const lo = Math.min(...hits.map(h => h[1])), up = lo < -10 ? 12 : 0;          // a line that dives low is lifted an octave
  const steps = Array.from({ length: 16 }, () => []);
  for (const [st, semis0] of hits) {
    const semis = semis0 + up, oc = Math.floor(semis / 12), within = semis - 12 * oc;
    let k = 0; for (let j = 0; j < 7; j++) if (keySemis(j, S.scale) <= within) k = j;
    const extra = within - keySemis(k, S.scale);
    steps[st].push({ s: 0, k, ...(oc && { oc }), ...(extra && { lock: { pitch: sl.params.pitch + extra } }) });
  }
  return steps;
}
function putLine() {
  const notes = bassNotes(lineHits());
  if (!notes) { status('Put a bass on sound 1 first (Bass, above).'); return false; }
  checkpoint();
  const P = S.patterns[S.pat];
  for (let i = 0; i < 16; i++) P[i] = [...P[i].filter(n => n.s !== 0), ...notes[i]];
  dirty(); draw(); return true;
}
$('putLine').addEventListener('click', () => { if (putLine()) status(`The bassline in pattern ${S.pat + 1} on sound 1. ↶ Undo takes it back.`); });
$('genLine').addEventListener('click', () => {
  const v = $('lineSel').value, b = v.startsWith('h:') && HUMANBASS[+v.slice(2)];
  const pool = b ? HUMANBASS.map((x, i) => [x, 'h:' + i]).filter(([x]) => x.quality === b.quality && x !== b) : GEN_LINES.map((x, i) => [x, 'g:' + i]);
  const [, nv] = pool[(Math.random() * pool.length) | 0]; $('lineSel').value = nv; showLineKind();
  if (putLine()) status(`Another bassline in pattern ${S.pat + 1}. Again for another; ↶ Undo for the last one.`);
});
// ▶ Hear it: the bassline with the pattern's drums, looping until tapped again.
let linePv = null;
function stopLine() { if (!linePv) return; clearTimeout(linePv.timer); linePv = null; $('hearLine').textContent = '▶ Hear it'; $('hearLine').classList.remove('go'); }
function hearLine() {
  stopLine(); stopPreview();
  const notes = bassNotes(lineHits());
  if (!notes) { status('Put a bass on sound 1 first (Bass, above).'); return; }
  if (playing) stop();
  ctx.resume();
  const sd = stepDur(), sw = (2 * S.swing / 100 - 1) * sd, pv = linePv = { t: ctx.currentTime + 0.05, i: 0 };
  const run = () => {
    if (linePv !== pv) return;
    while (pv.t < ctx.currentTime + 0.12) {
      const st = pv.i % 16, at = pv.t + (st % 2 ? sw : 0);
      for (const n of notes[st]) noteOn(eng, 0, n.k, at, null, withOct(0, n.lock, n.oc));
      for (const n of S.patterns[S.pat][st]) if (drumSide(n.s)) noteOn(eng, n.s, n.k, at + (n.o || 0) * sd, null, n.lock);
      pv.t += sd; pv.i++;
    }
    pv.timer = setTimeout(run, 25);
  };
  run();
  $('hearLine').textContent = '■ Stop'; $('hearLine').classList.add('go');
}
$('hearLine').addEventListener('click', () => (linePv ? stopLine() : hearLine()));
function drawKitSel() {
  const si = drumSlot(), f = si >= 0 ? S.slots[si]?.factory : null;
  $('kitSel').value = KITS_MENU.some(([, ids]) => ids.includes(f)) ? f : '';
  $('bassSel').value = BASSES.includes(S.slots[0]?.factory) ? S.slots[0].factory : '';
}

// ---------------------------------------------------------------------------
// Saving: IndexedDB. Factory sounds are saved by number; recorded and rolled
// sound is saved as raw samples, each buffer once, under its own id.
// ---------------------------------------------------------------------------
let db = null, saveTimer = 0;
function openDb() {
  return new Promise(ok => {
    try {
      const r = indexedDB.open('pocket-sampler', 2);
      r.onupgradeneeded = () => {          // v2 adds 'mine': My Sounds
        for (const st of ['state', 'bufs', 'mine']) if (!r.result.objectStoreNames.contains(st)) r.result.createObjectStore(st);
      };
      r.onsuccess = () => ok(r.result); r.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
}
const idbGet = (store, key) => new Promise(ok => {
  try { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }
  catch (e) { ok(null); }
});
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
function dirty() { persist(); noteChange(); }
// My Sounds: each one stored whole, its sound included, under its own id.
const idbAll = store => new Promise(ok => {
  try { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); }
  catch (e) { ok([]); }
});
const idbPut = (store, val, key) => new Promise((ok, bad) => {
  try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = () => ok(); tx.onerror = () => bad(tx.error); }
  catch (e) { bad(e); }
});
const idbDel = (store, key) => new Promise(ok => {
  try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = ok; tx.onerror = ok; } catch (e) { ok(); }
});
function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; save(); } }
let bufSeq = 0;
const stored = new Set();     // buffer ids written to IndexedDB
function save() {
  saveTimer = 0;
  if (!db) return;
  try {
    const tx = db.transaction(['state', 'bufs'], 'readwrite'), bufs = tx.objectStore('bufs'), used = new Set();
    const ref = b => {
      if (!b) return null;
      b.id ||= `b${Date.now().toString(36)}${(bufSeq++).toString(36)}`;
      if (!stored.has(b.id)) { bufs.put({ rate: b.sampleRate, data: b.getChannelData(0).slice() }, b.id); stored.add(b.id); }
      used.add(b.id); return b.id;
    };
    const slots = S.slots.map(sl => sl.factory != null ? { factory: sl.factory, params: sl.params, synth: sl.synth,
      trims: sl.slices?.map(x => [x.start ?? 0, x.len ?? 1]) } : {
      kind: sl.kind, name: sl.name, params: sl.params, synth: sl.synth, contiguous: sl.contiguous, buf: ref(sl.buf), zones: sl.zones, base: sl.base, bpm: sl.bpm, credit: sl.credit,
      made: sl.made, drumLoop: sl.drumLoop, slices: sl.slices?.map(s => ({ ...s, buf: ref(s.buf) })),
    });
    const { mode, write, replace, ...rest } = S;
    tx.objectStore('state').put({ ...rest, slots }, 'v1');
    const keys = bufs.getAllKeys();
    keys.onsuccess = () => { for (const k of keys.result) if (!used.has(k)) { bufs.delete(k); stored.delete(k); } };
  } catch (e) { console.warn('Not saved:', e); }
}
async function load() {
  db = await openDb();
  const saved = db && await idbGet('state', 'v1');
  const getBuf = async id => {
    if (!id) return null;
    const r = await idbGet('bufs', id); if (!r) return null;
    const b = ctx.createBuffer(1, r.data.length, r.rate); b.copyToChannel(r.data, 0); b.id = id; stored.add(id); return b;
  };
  const gone = new Set();
  for (let i = 0; i < 16; i++) {
    const s = saved?.slots?.[i];
    try {
      const withdrawn = /Good Day/.test(s?.credit || '');     // the song pack taken out: its sounds go, the usual ones come back
      if (withdrawn) gone.add(i);
      if (s && s.factory == null && !withdrawn) {
        const slot = { factory: null, kind: s.kind, name: s.name, params: params(s.params), synth: s.synth, contiguous: s.contiguous, buf: await getBuf(s.buf), zones: s.zones, base: s.base, bpm: s.bpm, credit: s.credit, made: s.made, drumLoop: s.drumLoop };
        if (s.slices) slot.slices = await Promise.all(s.slices.map(async x => ({ ...x, buf: await getBuf(x.buf) })));
        if (slot.kind === 'synth' || slot.buf || slot.slices?.every(x => x.buf || slot.buf)) { S.slots[i] = slot; continue; }
      }
      const id = typeof s?.factory === 'number' ? OLD_ORDER[s.factory] : LIBRARY[s?.factory] ? s.factory : DEFAULT[i];
      S.slots[i] = await factorySlot(id);
      if (s?.factory != null) {
        S.slots[i].params = params(s.params);
        if (LIBRARY[id].synth) {          // a synth saved before it was recorded: its note length, as a share of the recording
          if (!S.slots[i].params.baked) S.slots[i].params.len = Math.min(1, (0.05 + 2 * (s.params?.len ?? LIBRARY[id].len)) / (0.05 + 2 * LIBRARY[id].len));
          S.slots[i].params.baked = 1;
        } else if (s.synth) S.slots[i].synth = s.synth;
        s.trims?.forEach(([start, len], k) => { const x = S.slots[i].slices?.[k]; if (x) Object.assign(x, { start, len }); });
      }
    } catch (e) { console.warn('Sound', i + 1, e); S.slots[i] = await factorySlot(DEFAULT[i]).catch(() => null); }
    if (i === S.cur) { syncPanel(); draw(); }
  }
  // Sounds still at the old default of 80% go to the new 20%, once (any you set yourself stay).
  if (saved && !saved.quiet20) for (const sl of S.slots) if (sl?.params && Math.abs(sl.params.vol - 0.8) < 1e-6) sl.params.vol = 0.2;
  if (saved) { for (const k of ['patterns', 'fx', 'patKeys', 'pat', 'chain', 'bpm', 'swing', 'scale', 'root', 'vol', 'quantGrid', 'fxTarget', 'fxAmt', 'fxSlots', 'fxLatch', 'muteBeat', 'custom', 'cur', 'lastKey', 'oct', 'grid']) if (saved[k] != null) S[k] = saved[k];
  if (!(S.grid?.cells?.length === 8 && S.grid.cells.every(c => c.length === ROWS))) S.grid = defaultGrid();
  if (S.grid.cells.flat().some(x => /^ebb(kick|snare|tops)$/.test(x?.lib || ''))) gridAgain = 'electroboombap';
  if (S.grid.cells.flat().some(x => x?.lib === 'ebbbeats')) gridAgain = 'electroboombap';      // its beats became kick, snare and tops loops
  S.grid.quant ??= 16; S.grid.fade ??= 0; if (S.grid.colFx?.length !== 8) S.grid.colFx = newColFx();
  if (!S.grid.hits4) { hitsRepeat(S.grid.cells); S.grid.hits4 = true; }      // the hits become 4-beat loops, once
  if (gone.size) S.patterns = S.patterns.map(p => p.map(st => st.filter(n => !gone.has(n.s))));   // and their notes
    if (saved.quantGrid == null && saved.quant === false) S.quantGrid = 0;      // the old on/off Quantize
    // Effects used to be saved by key number; now by name.
    const name = e => (typeof e === 'number' ? DEFAULT_SLOTS[e] : e && typeof e.f === 'number' ? { ...e, f: DEFAULT_SLOTS[e.f] } : e);
    S.fx = S.fx.map(row => row.map(name));
    if (Array.isArray(S.fxAmt)) S.fxAmt = Object.fromEntries(S.fxAmt.map((v, i) => [DEFAULT_SLOTS[i], v]));
    S.custom = S.custom.map(c => (/^fx\d+$/.test(c) ? 'fx:' + DEFAULT_SLOTS[+c.slice(2)] : c));
    while (S.custom.length < DEFAULT_CUSTOM_IDS.length) S.custom.push(DEFAULT_CUSTOM_IDS[S.custom.length]);   // saves from before the row under the keys
    if (!saved.chainButton && S.custom[11] === 'voice') S.custom[11] = 'chain';    // the Chain button took Voice's place, once
    S.chainButton = true;
    if (S.custom.join() === OLD_CUSTOM_IDS.join()) S.custom = [...DEFAULT_CUSTOM_IDS];   // never changed: the new rows
    if (S.custom[15] === 'voice' && S.custom.every((c, i) => i === 15 || c === DEFAULT_CUSTOM_IDS[i] || (i === 8 && c === 'roll'))) S.custom[15] = 'robot';   // 🤖 Robot took Voice's place
    if (S.custom[8] === 'roll' && S.custom.every((c, i) => i === 8 || c === DEFAULT_CUSTOM_IDS[i])) S.custom[8] = 'makeloop';   // ⟳ Loop took Roll's place
    if (S.custom[11] === 'export' && S.custom.every((c, i) => i === 11 || c === DEFAULT_CUSTOM_IDS[i])) S.custom[11] = 'looprec';   // ⏺ Loop rec took Export's place (Export is in Menu › Rhythm)
  }
  else demo();
  setVolume(); syncPanel(); draw();
  committed = snapshot();
}
// Sound settings saved by an older version had a low-pass "tone" instead of the filter.
function params(p) { const { tone, ...rest } = p || {}; return { ...defParams(), ...rest }; }
// A first beat, so pressing play does something.
function demo() {
  S.cur = 8; putBeat(STYLES.boombap, 8, false);
  const P = S.patterns[0], put = (s, k, steps) => steps.forEach(i => P[i].push({ s, k }));
  put(0, 0, [0, 7]); put(0, 2, [10]); put(0, 4, [11]);
  put(14, 0, [3]); put(14, 2, [14]);
}

// ---------------------------------------------------------------------------
// The Loops tab: a grid like Remixlive's. Eight columns (channels) in their
// parts' colours, with up to six cells each. A tap starts a cell on the next
// quantize point (a bar, at first), in time and key (the loop engine: each
// loop's own bpm and bars, stretched to the tempo and key by stretchLoop). One
// cell plays in a column: tapping another switches on that point, tapping the
// playing one stops it there. Hold a cell (or ✎ Edit) for its settings: Loop,
// One shot or Gate, its own volume, whether it follows the key, and its sound.
// ⚙ holds the settings for all the loops: quantize, fades, Stop all loops.
// Each column has a volume and a mute: a gain of its own, into the effects,
// so the FX reach the loops too. Tempo, key, Play and the FX are shared with
// the Pads tab, and Stop stops everything.
// ---------------------------------------------------------------------------
const CHANNELS = ['Kick', 'Snare', 'Tops', 'Bass', 'Chords', 'Lead', 'Sub/Color', 'Vox/Keys'];
const CHANNEL_COLOR = ['kick', 'snare', 'hat', 'bass', 'chords', 'lead', 'sub', 'vox'].map(p => `var(--c-${p})`);
const ROWS = 6;
// Quantize, in 16th notes (ticks): where a tap lands, from a 1/32 note to 4 bars, or Off (at once).
const QUANTS = [[0, 'Off'], [0.5, '1/32'], [1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1 bar'], [32, '2 bars'], [64, '4 bars']];
const FADES = [[0, 'Off'], ['q', 'Quick'], [4, '1 beat'], [16, '1 bar'], [32, '2 bars'], [48, '3 bars'], [64, '4 bars']];      // in 16ths
// Repeat, in beats, shown as note values: 1/32 note (an eighth of a beat) up to 8 bars.
const REPEATS = [[0, 'Whole'], [0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [6, '1½ bars'], [8, '2 bars'], [16, '4 bars'], [32, '8 bars']];
const COL_FX = [['none', 'None'], ['lowpass', 'Low pass'], ['highpass', 'High pass'], ['reverb', 'Reverb'], ['echo', 'Echo'],
  ['pingpong', 'Ping-pong'], ['overdrive', 'Drive'], ['tape', 'Tape']];
// The first set, from the app's own loops and kits. Whole beats go in the red Kick column; the Snare
// and Tops columns hold single hits (a snare, a clap, a hat), each a loop that plays it again every 4 beats.
function defaultGrid() {
  const c = (lib, k, mode = 'loop', vol) => ({ lib, k, mode, ...(vol && { vol }) }), hit = (lib, k, vol = 0.6) => c(lib, k, 'oneshot', vol);
  const cells = Array.from({ length: 8 }, () => new Array(ROWS).fill(null));
  cells[0] = [c('grooves', 0), c('grooves', 1), c('grooves', 2), c('grooves', 4), c('grooves', 12), c('breaks', 0)];      // beats played by people
  cells[1] = [hit('boombap', 3), hit('boombap', 4), hit('boombap', 6), hit('tr808', 5), hit('boombap', 10), hit('boombap', 14)];
  cells[2] = [hit('boombap', 7, 0.5), hit('boombap', 8, 0.5), hit('tr808', 7, 0.5), hit('tr808', 10, 0.5), hit('shakers', 4, 0.5), hit('boombap', 15, 0.45)];
  cells[7] = [0, 3, 5, 12, 13, 14].map(k => c('hype', k, 'oneshot'));
  hitsRepeat(cells);
  return { cells, hits4: true, vol: new Array(8).fill(0.8), mute: new Array(8).fill(false), quant: 16, fade: 0, colFx: newColFx() };
}
// The single hits in Kick, Snare and Tops start as a loop that plays the hit again every 4 beats (a bar),
// so they need no setting up; any of them can be set to One shot or another repeat.
const HIT_COLS = new Set([0, 1, 2]);
function hitsRepeat(cells) { for (const c of HIT_COLS) for (const x of cells[c]) if (x && x.mode === 'oneshot' && !x.beats) { x.mode = 'loop'; x.beats = 4; } }
function newColFx() { return Array.from({ length: 8 }, () => ({ type: 'none', amt: 0.5 })); }
S.grid = defaultGrid();
let view = 'pads', lEdit = false, gridAgain = null;
// What each column is doing: cur (sounding, or about to stop at stopAt), next (waiting for its point), gate (held).
// What plays, in lanes: a lane plays one cell at a time (cur), with the one waiting to take over
// (next) and a held Gate (gate). Each column is one lane; in Multi every cell is a lane of its own,
// so the cells of one column can play together. gcol holds a lane for every cell (c * ROWS + r);
// one column, not Multi, uses the first of its six.
const newLanes = () => Array.from({ length: 8 * ROWS }, () => ({ cur: null, next: null, gate: null }));
let gcol = newLanes();
const lane = (c, r) => gcol[c * ROWS + (S.grid.multi ? r : 0)];
const colLanes = c => gcol.slice(c * ROWS, c * ROWS + ROWS);
const cellHandles = (c, r) => colLanes(c).flatMap(l => [l.cur, l.next, l.gate]).filter(h => h?.r === r);
// Every loop follows the key, unless turned off; the drum columns (Kick, Snare, Tops) never do.
// a drum: a cell in Kick, Snare or Tops, or a drum sound (a kit's hit, a beat) in any column
const drumCell = cell => { const c = S.grid.cells.findIndex(col => col.includes(cell)); return (c >= 0 && c < 3) || !!(cell.lib && drumLib(cell.lib)) || (!!cell.mine && mine.find(m => m.id === cell.mine)?.folder === 'Beats'); };
const follows = cell => !drumCell(cell) && (cell.follow ?? true);
// A cell as a one-slice sound that playNote can play: the part of its sound
// selected in the wave, cut to its repeat length (in beats), transposed.
const cellSlots = new Map();
// A cell's sound: a built-in one ({ lib, k }), or one of your loops ({ mine: id, k: 0 }).
const mineSlots = new Map();
function cellBase(cell) {
  if (!cell.mine) return slotOf({ lib: cell.lib });
  if (!mineSlots.has(cell.mine)) { const m = mine.find(x => x.id === cell.mine); if (!m) return Promise.resolve(null); mineSlots.set(cell.mine, Promise.resolve(unpackSlot(m))); }
  return mineSlots.get(cell.mine);
}
function cellSlot(cell) {
  const keyOf = follows(cell) ? cell.keyOf ?? null : null;
  const id = JSON.stringify([cell.mine || cell.lib, cell.k, cell.mode, keyOf, cell.pitch || 0, cell.beats || 0, cell.stretch ?? true,
    cell.from || 0, cell.to ?? 1, cell.beats ? S.bpm : 0]);
  if (cellSlots.size > 300) cellSlots.clear();
  if (!cellSlots.has(id)) cellSlots.set(id, cellBase(cell).then(slot => {
    const x = slot?.slices?.[cell.k]; if (!x) return null;
    cell.name ||= x.name;
    const buf = x.buf || slot.buf, whole = x.e - x.s, beat = 60 / (x.bpm || S.bpm);
    let ko = keyOf;
    if (follows(cell) && ko == null) { ko = cell.keyOf = findKey(buf, x.s, x.e).root; persist(); }     // its key, found by listening, once
    const s = x.s + whole * (cell.from || 0), e = x.s + whole * (cell.to ?? 1);
    let one = { name: x.name, buf, s, e, bpm: x.bpm, bars: x.bpm ? Math.max(1, Math.round((e - s) / beat * 4)) / 16 : undefined, start: 0, len: 1 };
    if (cell.beats) {
      // Repeat every so many beats: the sound, then silence until the beat comes round, so it
      // plays again exactly then (a long sound is cut there). It keeps time like a loop: a sound
      // with no tempo of its own is counted at the tempo now (and made again if that changes).
      const rate = buf.sampleRate, n = Math.round(cell.beats * beat * rate), a = Math.round(s * rate);
      const m = Math.min(n, Math.round(e * rate) - a), out = new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: rate });
      out.copyToChannel(buf.getChannelData(0).subarray(a, a + m), 0);
      const f = Math.min(m, Math.round(0.004 * rate)), d = out.getChannelData(0);
      for (let i = 0; i < f; i++) d[m - 1 - i] *= i / f;              // a 4 ms fade where it is cut, so it never clicks
      one = { name: x.name, buf: out, s: 0, e: n / rate, bpm: x.bpm || S.bpm, bars: cell.beats / 4, start: 0, len: 1 };
    }
    return { kind: 'chop', name: x.name, buf: one.buf, slices: [one], drumLoop: !!slot.drumLoop || drumCell(cell),
      params: { ...defParams(), vol: 1, keyOf: ko, pitch: cell.pitch || 0, nostretch: cell.stretch === false,
        trig: cell.mode === 'oneshot' ? 'oneshot' : 'loop' } };
  }).catch(() => null));
  return cellSlots.get(id);
}
// Each column: its effect, then its volume and mute, into the effects bus (so the
// Pads FX reach the loops too). A cell set to skip the effect comes in past it.
//   cells -> inp -> [filter or drive] -> out -> bus     (out -> a send, for reverb and echoes)
//   cells skipping it -> dry -> dout -> bus
// Made for each sound engine (it can be rebuilt). The echoes and the reverb are the
// engine's own, fed by a send, so no delay is added to the master path.
const colLevel = c => (S.grid.mute[c] ? 0 : S.grid.vol[c]);
function colChain(c) {
  eng.cols ||= [];
  if (!eng.cols[c]) {
    const k = { inp: ctx.createGain(), out: ctx.createGain(), dry: ctx.createGain(), dout: ctx.createGain(), ins: null, send: null, type: null };
    k.out.connect(eng.bus); k.dry.connect(k.dout); k.dout.connect(eng.bus); k.to = eng.bus;
    k.out.gain.value = k.dout.gain.value = colLevel(c);
    eng.cols[c] = k; wireColFx(c); routeLoops();
  }
  return eng.cols[c];
}
const colInput = (c, cell) => (cell?.fxOff ? colChain(c).dry : colChain(c).inp);
const setColGain = c => { const k = colChain(c); for (const g of [k.out, k.dout]) g.gain.setTargetAtTime(colLevel(c), ctx.currentTime, 0.02); };
function wireColFx(c) {
  const k = eng.cols[c], fx = S.grid.colFx[c] || { type: 'none', amt: 0.5 };
  if (k.type === fx.type && k.type !== 'none') { colFxAmount(c); return; }
  try { k.inp.disconnect(); } catch (e) {}
  for (const n of [k.ins, k.send]) if (n) try { n.disconnect(); } catch (e) {}
  k.ins = k.send = null; k.type = fx.type;
  if (fx.type === 'lowpass' || fx.type === 'highpass') { k.ins = ctx.createBiquadFilter(); k.ins.type = fx.type; }
  else if (fx.type === 'overdrive' || fx.type === 'tape') k.ins = ctx.createWaveShaper();
  if (k.ins) { k.inp.connect(k.ins); k.ins.connect(k.out); } else k.inp.connect(k.out);
  if (['reverb', 'echo', 'pingpong'].includes(fx.type)) {
    k.send = ctx.createGain(); k.out.connect(k.send);
    k.send.connect(fx.type === 'reverb' ? eng.reverb : fx.type === 'echo' ? eng.delay : eng.ppL);
  }
  colFxAmount(c);
}
function colFxAmount(c) {
  const k = eng.cols?.[c]; if (!k) return;
  const { type, amt: a } = S.grid.colFx[c], t = ctx.currentTime, echo = Math.min(1.9, stepDur() * 3);
  if (type === 'lowpass') { k.ins.frequency.setTargetAtTime(6000 * Math.pow(0.03, a), t, 0.03); k.ins.Q.value = 1 + a * 6; }
  if (type === 'highpass') { k.ins.frequency.setTargetAtTime(80 * Math.pow(40, a), t, 0.03); k.ins.Q.value = 1 + a * 4; }
  if (type === 'overdrive' || type === 'tape') k.ins.curve = distortion(type, a);
  if (k.send) k.send.gain.setTargetAtTime(a * (type === 'reverb' ? 1.3 : 0.9), t, 0.03);
  if (type === 'echo') eng.delay.delayTime.setValueAtTime(echo, t);
  if (type === 'pingpong') { eng.ppL.delayTime.setValueAtTime(echo, t); eng.ppR.delayTime.setValueAtTime(echo, t); }
}
// The stretched copy a loop needs for this tempo and key (and the key coming), made before it is needed.
function stretchFor(slot, roots = [S.root, keyAhead().root]) {
  const x = slot.slices[0]; if (!x.bpm || slot.params.nostretch) return Promise.resolve();
  return Promise.all([...new Set(roots)].map(root => {
    const f = loopStretch({ bpm: x.bpm }, slot.params, S.bpm, root);
    return Math.abs(f - 1) > 0.002 ? stretchLoop(x.buf || slot.buf, x.s, x.e, f, slot.drumLoop ? x.bpm : 0) : null;
  }));
}
async function warmGrid() {
  if (LIGHT) return;            // Light: each loop is made ready when it is tapped, not all at once
  for (const col of S.grid.cells) for (const cell of col) if (cell) { const sl = await cellSlot(cell); if (sl) await stretchFor(sl); }
}
let gridWarmTimer = 0;
const warmGridSoon = () => { clearTimeout(gridWarmTimer); gridWarmTimer = setTimeout(warmGrid, 300); };
// Where the beat is now, in ticks (fractions too), and the next quantize point.
const beatPos = () => (playing ? Math.max(0, tick - (nextT - ctx.currentTime) / stepDur()) : 0);
const gridNext = (q = S.grid.quant) => (q ? nextBar(q) : { when: ctx.currentTime, j: beatPos() });
// When a cell's tap lands: its own quantize, or the default for all the loops (⚙).
const quantOf = cell => cell.quant ?? S.grid.quant;
// The fade in and out: a cell's own (a shaker fading in, a kick not at all), or the one for all the loops (⚙).
const fadeOf = cell => cell?.fade ?? S.grid.fade;
const fadeLen = cell => { const f = fadeOf(cell); return f === 'q' ? 0.03 : (f || 0) * stepDur(); };
// Start cell r of column c at { when, j } (j: the tick, so the loop's phase follows the bar count).
// Each cell sounds through a gain of its own: its volume, and the fades.
function launch(c, r, slot, at, fade = true) {
  const cell = S.grid.cells[c][r], x = slot.slices[0], key = keyAt(at.when), bars = x.bars || 1;
  // where in its loop it starts: counted from j0, the tick it was started from its beginning (0: lined up with the bar)
  const j0 = at.j0 ?? 0, phase = x.bpm ? (((((at.j - j0) / 16) % bars) + bars) % bars) / bars : 0;
  const level = cell.vol ?? 1, g = ctx.createGain(), f = fade ? fadeLen(cell) : 0;
  g.connect(colInput(c, cell));
  const eq = makeEq(cell); eq[2].connect(g);
  if (f > 0) { g.gain.setValueAtTime(0, at.when); g.gain.linearRampToValueAtTime(level, at.when + f); } else g.gain.value = level;
  let voice = null;
  try {
    voice = playNote(eng, slot, -1, 0, at.when, { scale: key.scale, bpm: S.bpm, root: key.root, hold: cell.mode !== 'oneshot', phase, dest: eq[0] });
  } catch (e) { soundError(e); }
  if (!voice) { for (const n of [g, ...eq]) n.disconnect(); return null; }
  const h = { r, voice, g, eq, level, at: at.when, j: at.j, j0, synced: !!x.bpm, bars, len: x.e - x.s, cell };
  if (voice.end !== Infinity) unplugAt(h, voice.end);
  return h;
}
const unplugAt = (h, when) => setTimeout(() => { for (const n of [h.g, ...(h.eq || [])]) try { n.disconnect(); } catch (e) {} }, Math.max(0, when - ctx.currentTime) * 1000 + 400);
// A cell's EQ: low shelf (150 Hz), middle (1 kHz), high shelf (5 kHz), each -12 to +12 dB.
const EQ_BANDS = [['lowshelf', 150, 'lo', 'Low'], ['peaking', 1000, 'mid', 'Middle'], ['highshelf', 5000, 'hi', 'High']];
function makeEq(cell, c = ctx) {
  const n = EQ_BANDS.map(([type, f, k]) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 0.8; b.gain.value = cell.eq?.[k] || 0; return b; });
  n[0].connect(n[1]); n[1].connect(n[2]);
  return n;
}
// Stop on a point, fading out from there if fades are on; or at once.
function stopAt(h, b, fade = true) {
  if (!h) return;
  const f = fade ? fadeLen(h.cell) : 0;
  if (f > 0) { h.g.gain.cancelScheduledValues(b.when); h.g.gain.setValueAtTime(h.level, b.when); h.g.gain.linearRampToValueAtTime(0, b.when + f); }
  h.voice.stop(b.when + f); h.stopAt = b.when; h.stopJ = b.j;
  unplugAt(h, b.when + f);
}
const kill = h => { if (h) { h.voice.stop(ctx.currentTime); unplugAt(h, ctx.currentTime); } };
async function tapCell(c, r) {
  const col = lane(c, r), cell = S.grid.cells[c][r];
  if (!cell) { openCellMenu(c, r); return; }
  ctx.resume();
  if (cell.mode === 'oneshot') {      // a hit: on the next 16th (at once if stopped, or quantize off), again on every tap
    const slot = await cellSlot(cell);
    if (!slot) { status('That cell\'s sound could not be loaded.'); return; }
    const q = cell.quant ?? (S.grid.quant ? 1 : 0);                 // a hit's default: the next 16th
    const b = playing && q ? nextBar(q) : { when: ctx.currentTime + 0.005, j: beatPos() }, v = launch(c, r, slot, b, false);
    if (!v) return;
    if (col.next) kill(col.next);
    if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b, false);
    if (col.gate) { kill(col.gate); col.gate = null; }
    col.next = v; drawLoops(); return;
  }
  if (col.next?.r === r) {                     // waiting: take it back; what was playing carries on
    kill(col.next); col.next = null;
    if (col.cur?.stopAt != null) {
      const cs = await cellSlot(S.grid.cells[c][col.cur.r]);
      if (cs) col.next = launch(c, col.cur.r, cs, { when: Math.max(ctx.currentTime, col.cur.stopAt), j: col.cur.stopJ, j0: col.cur.j0 }, false);
    }
    drawLoops(); return;
  }
  if (col.cur?.r === r && col.cur.stopAt == null && !col.next) {    // playing: it stops on the point
    stopAt(col.cur, playing ? gridNext(quantOf(cell)) : { when: ctx.currentTime, j: 0 });
    drawLoops(); return;
  }
  const slot = await cellSlot(cell);
  if (!slot) { status('That cell\'s sound could not be loaded.'); return; }
  if (slot.slices[0].bpm) await stretchFor(slot);
  const was = playing;
  if (!playing) start();
  // Quantize Off or under a bar: it starts from its beginning, as soon as tapped (on the next point), and
  // repeats from there. A bar or more: it lines up with the bar, as the other loops.
  const q = quantOf(cell), b = was ? gridNext(q) : nextBar();
  if (was && q < 16) b.j0 = b.j;
  const v = launch(c, r, slot, b);
  if (!v) return;
  if (col.next) kill(col.next);
  if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b);
  if (col.gate) { kill(col.gate); col.gate = null; }
  col.next = v;
  if (verbose) log('loops', `column ${c + 1} cell ${r + 1} from tick ${b.j.toFixed(1)}`);
  drawLoops();
}
// Gate: it sounds while the finger is down, from the next beat (or at once, quantize off), in step with the bar.
async function gateDown(c, r) {
  const col = lane(c, r), cell = S.grid.cells[c][r];
  ctx.resume();
  const token = col.gateToken = {};
  const slot = await cellSlot(cell); if (!slot || col.gateToken !== token) return;
  if (slot.slices[0].bpm) await stretchFor(slot);
  if (col.gateToken !== token) return;
  // Gate plays free: no quantize, at once, from its start (and doesn't start the beat)
  const j = beatPos(), b = { when: ctx.currentTime + 0.005, j, j0: j }, v = launch(c, r, slot, b, false); if (!v) return;
  if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b, false);
  if (col.next) { kill(col.next); col.next = null; }
  col.gate = v; drawLoops();
}
function gateUp(c, r) {
  const col = lane(c, r); col.gateToken = null;
  if (col.gate) { kill(col.gate); col.gate = null; drawLoops(); }
}
// Stop everything in the grid (Stop, and when the sound engine is rebuilt).
function stopGrid(rebuilt = false) {
  for (const col of gcol) for (const h of [col.cur, col.next, col.gate]) if (h && !rebuilt) kill(h);
  gcol = newLanes();
  drawLoops();
}
// ⚙ Stop all loops: on the next quantize point; the Pads beat plays on.
function stopAllLoops() {
  const b = playing ? gridNext() : { when: ctx.currentTime, j: 0 };
  for (const col of gcol) {
    if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b);
    if (col.next) { kill(col.next); col.next = null; }
    if (col.gate) { kill(col.gate); col.gate = null; }
  }
  drawLoops();
}
// Relaunch the loops playing at { when, j }, seamlessly: after a key change (the cells
// that follow the key), a tempo change (every loop in time), or a cell's settings changing.
async function relaunchGrid(b, which) {
  for (const [i, col] of gcol.entries()) {
    const c = Math.floor(i / ROWS), h = col.cur;
    if (!h || h.stopAt != null || col.next || h.voice.end !== Infinity) continue;
    const cell = S.grid.cells[c][h.r]; if (!cell || !which(cell, h)) continue;
    const slot = await cellSlot(cell); if (!slot) continue;
    if (slot.slices[0].bpm) await stretchFor(slot);
    const v = launch(c, h.r, slot, { ...b, j0: h.j0 }, false); if (!v) continue;
    stopAt(h, b, false); col.next = v;
  }
}
// The scheduler, at the top of each bar: a key change booked for this bar.
function gridAtBar(k) {
  if (k?.at != null && gcol.some(col => col.cur)) relaunchGrid({ when: k.at, j: tick }, cell => follows(cell));
}
let gridTempoTimer = 0;
function gridTempo() {
  warmGridSoon();
  clearTimeout(gridTempoTimer);
  gridTempoTimer = setTimeout(async () => {
    if (!playing || !gcol.some(col => col.cur)) return;
    await warmGrid();
    if (playing) relaunchGrid(nextBar(), (cell, h) => h.synced || !!cell.beats);
  }, 400);
  for (let c = 0; c < 8; c++) if (eng.cols?.[c]) colFxAmount(c);      // the echoes keep time
}
// Every frame: cells starting and stopping on their point, and the rings.
function tickGrid(now) {
  let changed = false;
  for (const col of gcol) {
    if (col.cur && ((col.cur.stopAt != null && now >= col.cur.stopAt) || now >= col.cur.voice.end)) { col.cur = null; changed = true; }
    if (col.next && now >= col.next.at) { col.cur = col.next; col.next = null; changed = true; }
  }
  if (changed) drawLoops();
  if (view !== 'loops') return;
  const pos = beatPos() / 16;           // bars since the beat began
  for (const [i, col] of gcol.entries()) {
    const c = Math.floor(i / ROWS);
    for (const h of [col.cur, col.gate]) {
      if (!h || now < h.at) continue;
      let p;
      if (h.voice.end !== Infinity && h.stopAt == null) p = (now - h.at) / Math.max(0.01, h.voice.end - h.at);   // one shot
      else if (h.synced) p = (((pos - h.j0 / 16) % h.bars) + h.bars) % h.bars / h.bars;
      else p = ((now - h.at) / Math.max(0.01, h.len)) % 1;
      const q = Math.min(1, Math.max(0, p)), el = cellEls[c][h.r];
      el.ring.style.strokeDashoffset = String(100 - 100 * q); el.line.style.transform = `scaleX(${q})`;
    }
  }
}

// A volume bar you drag: it reads the finger along its own length, whichever way the grid is turned.
function fader(el, set) {
  const at = ev => set(Math.round(along(el, ev) * 100) / 100);
  el.addEventListener('pointerdown', ev => { ev.preventDefault(); capture(el, ev); el.dragging = true; at(ev); });
  el.addEventListener('pointermove', ev => { if (el.dragging) at(ev); });
  for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, () => { el.dragging = false; });
}

// The grid on screen
const cellEls = [];
function buildLoops() {
  const grid = $('lgrid');
  for (let c = 0; c < 8; c++) {
    const col = document.createElement('div'); col.className = 'lcol'; col.style.setProperty('--c', CHANNEL_COLOR[c]);
    const head = document.createElement('div'); head.className = 'lhead'; head.textContent = CHANNELS[c]; col.appendChild(head);
    cellEls[c] = []; cellEls[c].head = head;
    for (let r = 0; r < ROWS; r++) {
      const b = document.createElement('button'); b.className = 'lcell'; b.dataset.c = c; b.dataset.r = r;
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" class="rbg"/><circle cx="12" cy="12" r="9.5" class="rfg" pathLength="100"/></svg><i class="lline"><b></b></i><span></span><em></em><small class="lmeta"></small>';
      const el = { b, ring: b.querySelector('.rfg'), line: b.querySelector('.lline b'), name: b.querySelector('span'), badge: b.querySelector('em'), meta: b.querySelector('.lmeta') };
      let timer = 0, long = false;
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault(); capture(b, ev); long = false;
        const cell = S.grid.cells[c][r];
        if (clipMode) return;
        if (lEdit) { cellDrag = cell ? { c, r, x: ev.clientX, y: ev.clientY, moved: false, to: null } : null; return; }
        if (cell?.mode === 'gate') { gateDown(c, r); return; }
        timer = setTimeout(() => { long = true; openCellMenu(c, r); }, 500);
      });
      b.addEventListener('pointermove', ev => {
        if (!lEdit || !cellDrag || cellDrag.c !== c || cellDrag.r !== r) return;
        if (!cellDrag.moved && Math.hypot(ev.clientX - cellDrag.x, ev.clientY - cellDrag.y) < 10) return;
        cellDrag.moved = true;
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.lcell');
        cellDrag.to = t && !(+t.dataset.c === c && +t.dataset.r === r) ? { c: +t.dataset.c, r: +t.dataset.r } : null;
        drawDrag();
      });
      const up = ev => {
        clearTimeout(timer);
        const cell = S.grid.cells[c][r];
        if (clipMode) { if (ev.type === 'pointerup') clipTap(c, r); return; }
        if (lEdit) {
          const d = cellDrag; cellDrag = null; drawDrag();
          if (ev.type !== 'pointerup') return;
          if (d?.moved) { if (d.to) moveCell(c, r, d.to.c, d.to.r); return; }
          openCellMenu(c, r); return;
        }
        if (ev.type !== 'pointerup') { if (cell?.mode === 'gate') gateUp(c, r); return; }
        if (cell?.mode === 'gate') { gateUp(c, r); return; }
        if (!long) tapCell(c, r);
      };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', ev => ev.preventDefault());
      cellEls[c].push(el); col.appendChild(b);
    }
    const foot = document.createElement('div'); foot.className = 'lfoot';
    const fd = document.createElement('div'); fd.className = 'lfader'; fd.innerHTML = '<i></i>';
    fd.setAttribute('aria-label', `${CHANNELS[c]} volume`);
    const mute = document.createElement('button'); mute.className = 'lmute'; mute.textContent = 'M'; mute.title = `Mute ${CHANNELS[c]}`;
    fader(fd, v => { S.grid.vol[c] = v; setColGain(c); drawLoops(); persist(); });
    mute.addEventListener('click', () => { S.grid.mute[c] = !S.grid.mute[c]; setColGain(c); drawLoops(); persist(); });
    foot.append(fd, mute); col.appendChild(foot);
    cellEls[c].col = col; cellEls[c].fader = fd.firstChild; cellEls[c].mute = mute;
    grid.appendChild(col);
  }
}
// Edit: drag a cell to another place. Onto an empty cell it moves; onto a full one the two swap.
// In its own column a playing loop plays on from its new place; moved to another column it stops.
let cellDrag = null;
function drawDrag() {
  for (let c = 0; c < 8; c++) for (let r = 0; r < ROWS; r++) {
    const b = cellEls[c][r].b;
    b.classList.toggle('dragging', !!cellDrag?.moved && cellDrag.c === c && cellDrag.r === r);
    b.classList.toggle('droptarget', !!cellDrag?.to && cellDrag.to.c === c && cellDrag.to.r === r);
  }
}
function moveCell(c, r, tc, tr) {
  const G = S.grid.cells, a = G[c][r], b = G[tc][tr];
  if (c === tc && !S.grid.multi) {
    for (const k of ['cur', 'next', 'gate']) { const h = lane(c, r)[k]; if (h) h.r = h.r === r ? tr : h.r === tr ? r : h.r; }
  } else if (c === tc) {           // Multi: the two cells' lanes change places with them
    const L = colLanes(c), A = gcol.indexOf(L[r]), B = gcol.indexOf(L[tr]);
    [gcol[A], gcol[B]] = [gcol[B], gcol[A]];
    for (const l of [gcol[A], gcol[B]]) for (const k of ['cur', 'next', 'gate']) if (l[k]) l[k].r = l[k].r === r ? tr : l[k].r === tr ? r : l[k].r;
  } else for (const [cc, rr] of [[c, r], [tc, tr]]) for (const col of colLanes(cc)) {
    for (const k of ['cur', 'next', 'gate']) if (col[k]?.r === rr) { kill(col[k]); col[k] = null; }
  }
  G[tc][tr] = a; G[c][r] = b || null;
  persist(); drawLoops();
  status(`${a.name || 'The loop'} moved to ${CHANNELS[tc]}, cell ${tr + 1}${b ? `; ${b.name || 'the loop there'} went to ${CHANNELS[c]}, cell ${r + 1}` : ''}.`);
}
function drawLoops() {
  if (!cellEls.length) return;
  $('lgrid').classList.toggle('editing', lEdit);
  for (let c = 0; c < 8; c++) {
    const L = colLanes(c), has = (k, r, f = () => true) => L.some(l => l[k]?.r === r && f(l[k], l));
    // editing: every column a shade of one colour (amber), so the grid looks plainly different
    cellEls[c].col.style.setProperty('--c', lEdit ? `hsl(38 95% ${44 + c * 5}%)` : CHANNEL_COLOR[c]);
    for (let r = 0; r < ROWS; r++) {
      const cell = S.grid.cells[c][r], el = cellEls[c][r];
      const on = has('cur', r, h => h.stopAt == null) || has('gate', r);
      el.b.classList.toggle('filled', !!cell);
      el.b.classList.toggle('playing', !!on);
      el.b.classList.toggle('queued', has('next', r));
      el.b.classList.toggle('resume', !playing && !!S.grid.resume?.some(([cc, rr]) => cc === c && rr === r));
      el.b.classList.toggle('stopping', has('cur', r, (h, l) => h.stopAt != null && l.next?.r !== r));
      el.name.textContent = cell ? cell.name || '…' : lEdit ? '+' : '';
      el.meta.textContent = cell ? cellMeta(cell, c) : '';
      el.badge.textContent = cell ? [libTag(cell.lib, banks?.[LIBRARY[cell.lib]?.bank]?.from?.[cell.k] ?? cell.name), cell.mode === 'oneshot' ? '1×' : cell.mode === 'gate' ? 'G' : '', follows(cell) ? '♪' : ''].filter(Boolean).join(' ') : '';
      if (!on && !has('cur', r)) { el.ring.style.strokeDashoffset = '100'; el.line.style.transform = 'scaleX(0)'; }
      el.b.classList.toggle('lineprog', !!cell && (cell.mode === 'oneshot' || cell.mode === 'gate'));      // played once or held: a straight line, not a ring
    }
    const fx = S.grid.colFx[c];
    cellEls[c].head.textContent = CHANNELS[c] + (fx.type !== 'none' ? ' · ' + COL_FX.find(f => f[0] === fx.type)[1] : '');
    cellEls[c].fader.style.width = Math.round(S.grid.vol[c] * 100) + '%';
    cellEls[c].mute.classList.toggle('on', S.grid.mute[c]);
    cellEls[c].col.classList.toggle('muted', S.grid.mute[c]);
  }
  $('lPlay').textContent = playing ? '■ Stop' : '▶ Play'; $('lPlay').classList.toggle('on', playing);
  fillTempos();
  $('lKey').textContent = $('keyBtn').textContent; $('lKey').classList.toggle('on', !$('wheel').hidden && $('wheel').classList.contains('inloops'));
  $('lEdit').classList.toggle('on', lEdit);
  $('lClearAll').hidden = !lEdit; $('lClearAll').textContent = gridBefore ? '↶ Undo clear' : '🗑 Clear all';
  $('lMulti').classList.toggle('on', !!S.grid.multi);
  $('lCopy').classList.toggle('on', clipMode === 'copy'); $('lPaste').classList.toggle('on', clipMode === 'paste'); $('lPaste').disabled = !cellClip;
  $('lgrid').classList.toggle('clipping', !!clipMode);
  const lb = document.querySelector('.lbar'); lb.classList.remove('tight'); if (lb.scrollWidth > lb.clientWidth + 1) lb.classList.add('tight');
  $('lReset').hidden = !(S.grid.resume?.length || gcol.some(l => l.cur || l.next || l.gate));
  $('lSet').classList.toggle('on', !$('lsets').hidden);
}
// Names for cells that have none yet (the first set, or an old save).
async function nameCells() {
  for (const col of S.grid.cells) for (const cell of col) if (cell && !cell.name) await cellSlot(cell);
  drawLoops();
}
function setView(v) {
  view = v;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if ($('wheel').classList.contains('inloops')) closeWheel();
  $('loops').hidden = v !== 'loops';
  if (v === 'loops') { drawLoops(); nameCells(); warmGridSoon(); }
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('lPlay').addEventListener('click', () => { ctx.resume(); playing ? stop() : (start(), resumeLoops()); drawLoops(); });
$('lReset').addEventListener('click', () => {
  for (const col of gcol) for (const k of ['cur', 'next', 'gate']) if (col[k]) { kill(col[k]); col[k] = null; }
  S.grid.resume = []; persist(); drawLoops(); status('Loops reset: none playing, and none to come back on Play.');
});
// The tempo on the Loops: tap it for common tempos, grouped with the styles they suit; − and + fine-tune.
const TEMPOS = [['Slow: hip hop, lo-fi, reggae, R&B', [60, 65, 70, 75, 80, 85, 88, 90, 92, 95]],
  ['Middle: pop, funk, soul, rock, house', [98, 100, 105, 110, 115, 118, 120, 122, 124, 126, 128]],
  ['Fast: trap, techno, dubstep, drum & bass', [130, 135, 140, 145, 150, 160, 170, 174, 180]]];
function fillTempos() {
  const sel = $('lBpm'), all = TEMPOS.flatMap(([, ts]) => ts);
  if (sel.dataset.bpm == S.bpm) return;
  sel.textContent = '';
  if (!all.includes(S.bpm)) sel.add(new Option(`${S.bpm} BPM`, S.bpm));
  for (const [g, ts] of TEMPOS) { const og = document.createElement('optgroup'); og.label = g; for (const t of ts) og.appendChild(new Option(`${t} BPM`, t)); sel.appendChild(og); }
  sel.value = S.bpm; sel.dataset.bpm = S.bpm;
}
$('lBpm').addEventListener('change', () => { checkpoint(); S.bpm = +$('lBpm').value; dirty(); draw(); warmSoon(); gridTempo(); drawLoops(); });
const nudgeBpm = d => { S.bpm = Math.max(60, Math.min(240, S.bpm + d)); dirty(); draw(); warmSoon(); gridTempo(); drawLoops(); };
$('lSlower').addEventListener('click', () => nudgeBpm(-1));
$('lFaster').addEventListener('click', () => nudgeBpm(1));
$('lKey').addEventListener('click', () => { const open = !$('wheel').hidden && $('wheel').classList.contains('inloops'); open ? closeWheel() : openLoopWheel(); drawLoops(); });
$('lNextKey').addEventListener('click', () => { ctx.resume(); nextKey(); drawLoops(); });
// Copy, then a cell: it is kept, all its settings too. Paste, then cells: it goes in each (what played
// there stops), until Paste is tapped again.
let clipMode = null, cellClip = null;
function setClip(mode) {
  clipMode = clipMode === mode ? null : mode;
  status(clipMode === 'copy' ? 'Copy: tap the cell to copy.' : clipMode === 'paste' ? `Paste: tap the cells to put “${cellClip.name || 'it'}” in. Tap Paste again when done.` : '');
  drawLoops();
}
function clipTap(c, r) {
  const cell = S.grid.cells[c][r];
  if (clipMode === 'copy') {
    if (!cell) { status('That cell is empty: tap one with a sound in it.'); return; }
    cellClip = JSON.parse(JSON.stringify(cell)); clipMode = null;
    status(`Copied “${cell.name || 'the cell'}”. Tap Paste, then the cells to put it in.`); drawLoops(); return;
  }
  for (const l of colLanes(c)) for (const k of ['cur', 'next', 'gate']) if (l[k]?.r === r) { kill(l[k]); l[k] = null; }
  S.grid.cells[c][r] = JSON.parse(JSON.stringify(cellClip));
  persist(); warmGridSoon(); drawLoops();
  status(`“${cellClip.name || 'It'}” pasted in ${CHANNELS[c]}, cell ${r + 1}. More cells, or tap Paste again when done.`);
}
$('lCopy').addEventListener('click', () => setClip('copy'));
$('lPaste').addEventListener('click', () => { if (cellClip) setClip('paste'); });
// Multi: the cells of one column play together (each its own lane). Turned off, each column keeps
// the cell started last; the others stop on the next point.
function setMulti(on) {
  if (!!S.grid.multi === on) return;
  const old = gcol; gcol = newLanes(); S.grid.multi = on;
  const b = playing ? gridNext() : { when: ctx.currentTime, j: 0 };
  for (let c = 0; c < 8; c++) {
    const L = old.slice(c * ROWS, c * ROWS + ROWS);
    if (on) { for (const l of L) for (const k of ['cur', 'next', 'gate']) if (l[k]) lane(c, l[k].r)[k] = l[k]; }
    else {
      const all = L.flatMap(l => ['cur', 'next', 'gate'].map(k => l[k] && { k, h: l[k] })).filter(Boolean).sort((x, y) => x.h.at - y.h.at);
      const keep = all.at(-1), to = lane(c, 0);
      for (const x of all) if (x !== keep) { if (x.k === 'cur' && x.h.stopAt == null) stopAt(x.h, b); else if (x.k !== 'cur') kill(x.h); }
      if (keep) to[keep.k] = keep.h;
      for (const x of all) if (x !== keep && x.k === 'cur' && keep.k !== 'cur') to.cur ??= x.h;      // stopping on the point, until it does
    }
  }
  persist(); drawLoops();
  status(on ? 'Multi: the cells of a column play together. Tap a playing cell to stop it.' : 'One cell per column again: each column keeps the cell started last.');
}
$('lMulti').addEventListener('click', () => setMulti(!S.grid.multi));
// 🗑 Clear all (with ✎ Edit on): every cell emptied, the loops stopped; the sounds stay in the library.
// Until ✎ Edit is turned off, the same button (↶ Undo clear) brings the grid back as it was.
let gridBefore = null;
$('lClearAll').addEventListener('click', () => {
  if (gridBefore) {
    stopGrid(); S.grid.cells = gridBefore; gridBefore = null; persist(); drawLoops();
    status('The cells are back as they were.'); return;
  }
  if (!S.grid.cells.flat().some(Boolean)) { status('The grid is already empty.'); return; }
  if (!confirm('Empty every cell of the Loops? (The sounds stay in the library, and the same button brings them back until you leave ✎ Edit.)')) return;
  gridBefore = S.grid.cells.map(col => col.map(c => (c ? { ...c } : null)));
  stopGrid(); S.grid.cells = S.grid.cells.map(col => col.map(() => null)); S.grid.resume = []; persist(); drawLoops();
  status('Every cell is empty. Tap a cell to fill it; ↶ Undo clear brings them back while ✎ Edit is on.');
});
$('lEdit').addEventListener('click', () => { if (lEdit) gridBefore = null; lEdit = !lEdit; cellDrag = null; status(lEdit ? 'Edit: tap a cell for its settings, or drag it to move it (onto a full cell, the two swap). Tap ✎ Edit again to play.' : ''); drawLoops(); });

// ⚙ The settings for all the loops.
function choices(box, list, now, pick) {
  box.textContent = '';
  for (const [v, label] of list) {
    const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', v === now);
    b.addEventListener('click', () => pick(v)); box.appendChild(b);
  }
}
function drawSets() {
  const box = $('lsSets'); box.textContent = '';
  for (const st of SETS) {
    const b = document.createElement('button'); b.innerHTML = `${st.name} <small>${st.about}</small>`;
    b.addEventListener('click', () => loadSet(st.id)); box.appendChild(b);
  }
  const my = $('lsMine'); my.textContent = '';
  const sets = mine.filter(m => m.type === 'set');
  if (!sets.length) { const n = document.createElement('small'); n.textContent = 'none yet'; my.appendChild(n); }
  for (const m of sets) {
    const b = document.createElement('button'); b.innerHTML = `${m.name} <small>${m.set.bpm} BPM</small>`;
    let held = null;
    b.addEventListener('pointerdown', () => { held = setTimeout(() => { held = 'long'; mySetMenu(m); }, 550); });
    b.addEventListener('pointerup', () => { if (held !== 'long') { clearTimeout(held); loadSet(m.id, false, m.set); } held = null; });
    b.addEventListener('pointerleave', () => { if (held !== 'long') clearTimeout(held); });
    my.appendChild(b);
  }
  choices($('lsQuant'), QUANTS, S.grid.quant, v => { S.grid.quant = v; persist(); drawSets(); });
  choices($('lsFade'), FADES, S.grid.fade, v => { S.grid.fade = v; persist(); drawSets(); });
}
$('lSet').addEventListener('click', () => { $('lmenu').hidden = true; $('lsets').hidden = !$('lsets').hidden; drawSets(); drawLoops(); });
$('lsClose').addEventListener('click', () => { $('lsets').hidden = true; drawLoops(); });
// Sets: a whole grid at once, with the tempo and key it was made in.
const SETS = [{ id: 'vigils', name: 'Vigils', about: 'G minor · 144 BPM · night electronica, words of the Rule' }, { id: 'electroboombap', name: 'Electro Boom Bap', about: 'F minor · 92 BPM' }, { id: 'first', name: 'The first set', about: 'drum loops, breaks, vinyl, hype words' }];
async function loadSet(id, quiet = false, given = null) {          // quiet: the set again, after an update; tempo and key as they are. given: one of yours
  status('Loading the set…');
  try {
    const set = given || (id === 'first' ? { cells: defaultGrid().cells } : await (await fetch(`sounds/sets/${id}.json`)).json());
    stopGrid();
    S.grid.cells = set.cells.map(col => col.map(c => (c ? { ...c } : null))); hitsRepeat(S.grid.cells);
    // a set's column effects (Vigils: reverb on the pads and words, echoes on the lead), and its room
    if (!quiet) { S.grid.colFx = set.fx ? set.fx.map(f => (f ? { ...f } : { type: 'none', amt: 0.5 })) : newColFx(); for (let c = 0; c < 8; c++) if (eng.cols?.[c]) wireColFx(c); }
    if (set.space && !quiet && SPACES.some(x => x[0] === set.space)) chooseSpace(set.space, true);
    if (set.bpm && !quiet) { S.bpm = set.bpm; gridTempo(); warmSoon(); }
    if (set.root != null && !playing && !quiet) { S.root = set.root; S.scale = set.scale || S.scale; }
    persist(); draw(); drawLoops(); drawSets(); nameCells(); warmGrid();
    status(quiet ? `The ${set.name} set has new drums: kick, snare and tops loops, any of them together, made of its own kit.`
      : `${set.name || 'The first set'}${set.bpm ? `: ${set.bpm} BPM, ${keyWords({ root: set.root, scale: set.scale })}` : ''}. Tap a cell to start.`);
  } catch (e) { status('Could not load the set: ' + e.message); }
}
$('lsStop').addEventListener('click', () => { stopAllLoops(); status(playing ? 'Every loop stops on the next point; the Pads beat plays on.' : ''); });

// A cell's settings: how it plays, its volume, the key, and its sound (any loop or pack, one sound of it).
const CELL_PACKS = [['Vigils', VIG], ['Electro Boom Bap', EBB], ['Loops', ['drumloops', 'breaks', 'ambience']],
  ['Kits', ['boombap', 'tr808', 'electro', 'drumtraks', 'acoustic', 'percussion', 'shakers']],
  ['Vocals', ['hype', 'robotvox', 'vocchops']], ['Synth and horns', ['stabs', 'basshits', 'pads', 'funkhorns']],
  ['FX', ['noisefx', 'sirens', 'arcade', 'machines', 'nature', 'airwater', 'bells2']]];
let menuCell = null, menuPack = null, menuFolder = null, menuSet = null, choosing = false;
// Packs (below the folders): a set made for the looper, all its sounds, under a heading for each colour.
// The Electro Boom Bap set is its six packs; a kit is its kicks (red), snares and claps (orange), and
// hats, cymbals and percussion (yellow); any other pack is one colour. Its sounds are in the folders too.
const folderFor = id => TREE[1].find(f => (Array.isArray(f[1]) ? f[1].includes(id) : f[1] === 'hits:' + Object.keys(PART_LOOPS).find(k => PART_LOOPS[k].includes(id))));
const SET_PACKS = { 'set:vig': ['Vigils', VIG], 'set:ebb': ['Electro Boom Bap', EBB] };
// Only the sets made for the looper (every loop in one fits every other): for now, Electro Boom Bap.
// Every other pack is still in the colour folders, and in Menu › Sounds for the Pads.
function packList() { return Object.keys(SET_PACKS); }
const HIT_GROUP = { kick: ['Kicks', 'var(--c-kick)'], snare: ['Snares and claps', 'var(--c-snare)'], clap: ['Snares and claps', 'var(--c-snare)'] };
async function packGroups(id) {
  const groups = [], add = (label, colour, lib, slot, ks) => { if (ks.length) groups.push({ label, colour, lib, slot, ks }); };
  for (const lib of SET_PACKS[id]?.[1] || [id]) {
    const slot = await slotOf({ lib }), f = folderFor(lib), ks = slot.slices.map((_, k) => k).filter(k => !toDelete().has(`${lib}#${k}`));
    if (DRUM_BANKS.includes(lib) || LIBRARY[lib].kit || isKitLib(lib)) {       // a kit: by part
      const by = new Map();
      for (const k of ks) { const g = HIT_GROUP[hitPart(slot.slices[k].name)] || ['Hats, cymbals and percussion', 'var(--c-hat)']; if (!by.has(g[0])) by.set(g[0], [g[1], []]); by.get(g[0])[1].push(k); }
      const order = ['Kicks', 'Snares and claps', 'Hats, cymbals and percussion'];
      for (const [label, [colour, list]] of [...by].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))) add(label, colour, lib, slot, list);
    } else add(SET_PACKS[id] ? `${f?.[0].replace(/ \(.*\)$/, '') || ''} · ${LIBRARY[lib].name}` : f?.[0].replace(/ \(.*\)$/, '') || LIBRARY[lib].name, f?.[2] || 'var(--accent)', lib, slot, ks);
  }
  return groups;
}
// The sounds for a cell, in the browser's colour folders (Beats red, Bass green...); the folder for the
// column comes first, but anything can go anywhere. Instruments play on the Pads (⟳ Loop brings them here).
const COL_FOLDER = ['Beats', 'Snares and claps', 'Tops (hats, cymbals, percussion)', 'Bass', 'Chords', 'Lead', 'Sub and color', 'Vox and keys'];
const cellFolders = () => TREE[1].filter(f => Array.isArray(f[1]) || /^hits:/.test(f[1]));
// A sample's own tempo and key, shown where a cell's sound is chosen and on the grid. The key is found
// by listening (once, one sound at a time, kept on this device); drums have none.
const keyMemo = (() => { try { return JSON.parse(localStorage.getItem('pocketKeys') || '{}'); } catch (e) { return {}; } })();
// unsure: found by listening to a bass or a sub, which play too few notes to tell major from minor
const keyWord = (k, low) => (k ? `${(k.minor ? MIN_NAME : MAJ_NAME)[k.root]} ${k.minor ? 'min' : 'maj'}${!k.known && (k.sure < 0.35 || low) ? '?' : ''}` : '');
const LOW_LIBS = new Set(['basshits', 'ebbbass', 'ebbsub', 'vigbass', 'vigsub']);
// a pack whose key is known (banks.json "key": [root, scale]), as the Electro Boom Bap loops (F minor)
const knownKey = lib => { const K = banks?.[LIBRARY[lib]?.bank || lib]?.key; return K ? { root: K[0], minor: K[1] !== 'major', sure: 1, known: true } : null; };
const drumLib = lib => BEAT_PACKS.has(lib) || DRUM_BANKS.includes(lib) || isKitLib(lib) || !!LIBRARY[lib]?.kit;
let keyQueue = Promise.resolve();
function sampleKey(id, slot, k) {          // id: "lib#k", or "mine:" and its id
  const known = id.includes('#') && knownKey(id.split('#')[0]);
  if (known) return Promise.resolve(known);
  if (keyMemo[id] !== undefined) return Promise.resolve(keyMemo[id]);
  return (keyQueue = keyQueue.then(() => new Promise(ok => setTimeout(ok, 0))).then(() => {
    if (keyMemo[id] === undefined) {
      const x = slot?.slices?.[k]; if (!x) return null;
      const r = findKey(x.buf || slot.buf, x.s, x.e);
      keyMemo[id] = { root: r.root, minor: r.minor, sure: Math.round(r.sure * 100) / 100 };
      try { localStorage.setItem('pocketKeys', JSON.stringify(keyMemo)); } catch (e) {}
    }
    return keyMemo[id];
  }));
}
const tempoOf = cell => (cell.mine ? mine.find(m => m.id === cell.mine)?.item.slices?.[0]?.bpm : banks?.[LIBRARY[cell.lib]?.bank || cell.lib]?.loops?.[cell.k]?.[0]);
const keyIdOf = cell => (cell.mine ? 'mine:' + cell.mine : `${cell.lib}#${cell.k}`);
const keyWanted = (cell, c) => c >= 3 && !(cell.lib && drumLib(cell.lib)) && !(cell.mine && mine.find(m => m.id === cell.mine)?.folder === 'Beats');
const keyAsked = new Set();
function cellMeta(cell, c) {               // "92 · F min" (a tempo only for drums; the key once it is found)
  const t = tempoOf(cell), id = keyIdOf(cell), want = keyWanted(cell, c), known = cell.lib && knownKey(cell.lib);
  if (known && want) return [t ? Math.round(t) : '', keyWord(known)].filter(Boolean).join(' · ');
  if (want && keyMemo[id] === undefined && !keyAsked.has(id)) {
    keyAsked.add(id); cellBase(cell).then(sl => sl && sampleKey(id, sl, cell.mine ? 0 : cell.k)).then(() => drawLoops());
  }
  return [t ? Math.round(t) : '', want ? keyWord(keyMemo[id], c === 3 || c === 6 || LOW_LIBS.has(cell.lib)) : ''].filter(Boolean).join(' · ');
}
function folderOf(m) { return m.folder === 'Sub' ? 'Sub and color' : m.folder; }       // the purple folder was "Sub"
function folderSounds(f) {          // what a cell can take from a folder: your loops, packs (a sound of them), single hits
  if (typeof f[1] === 'string') return hitItems(f[1].slice(5)).filter(c => !doomed(c)).map(c => ({ hit: c }));
  return [...mine.filter(m => m.type === 'loop' && folderOf(m) === f[0]).map(m => ({ mine: m })),
    ...f[1].filter(id => LIBRARY[id] && isPack(id) && !toDelete().has(id)).map(id => ({ pack: id }))];
}
// A robot voice in a cell (the Hype Words, the robot's words in Electro Boom Bap, or words typed in
// here): at the top of its Settings, what it says and its voice, and 🔄 Update. Said once and kept as a recording (one
// of My Sounds, with its words and voice), the cell's other settings kept.
const isRobotCell = cell => !!cell && (!!cell.robot || cell.lib === 'hype' || (cell.lib === 'ebbvox' && cell.k < 2));
const LW = [['lwPitch', 'pitch', v => v], ['lwRange', 'range', v => (v == 0 ? 'flat' : v)], ['lwSpeed', 'speed', v => v], ['lwGap', 'gap', v => v * 10 + ' ms'], ['lwVowel', 'vowel', v => Math.round(v * 100) + '%']];
for (const [v, l] of VARIANTS) $('lwVariant').add(new Option(l, v));
const lwShow = () => { for (const [id, , fmt] of LW) $('o' + id[0].toUpperCase() + id.slice(1)).textContent = fmt(+$(id).value); };
for (const [id] of LW) $(id).addEventListener('input', lwShow);
let lwFor = null;           // the cell the words box was filled for
function fillWords(cell) {
  if (lwFor === cell) return; lwFor = cell;
  const R = cell.robot || { text: cell.name || '', voice: null }, V = R.voice || { ...defaultVoice(), variant: 'robosoft' };
  $('lwText').value = R.text; $('lwVariant').value = V.variant;
  for (const [id, key] of LW) $(id).value = V[key];
  lwShow();
}
async function sayWords() {
  if (!menuCell) return;
  const { c, r } = menuCell, cell = S.grid.cells[c][r], text = $('lwText').value.trim();
  if (!text) { status('Type what the robot should say first.'); return; }
  const V = { variant: $('lwVariant').value, cut: 'natural' }; for (const [id, key] of LW) V[key] = +$(id).value;
  $('lwSay').disabled = true;
  try {
    const buf = await makeVoice(text, V.gap, V.pitch, V);
    const slot = { factory: null, kind: 'chop', contiguous: false, name: text, params: { ...defParams(), choke: true }, buf, made: 'GEN', slices: [{ s: 0, e: buf.duration, name: text }] };
    const id = 'm' + Date.now().toString(36), old = cell?.mine;
    await idbPut('mine', { id, name: text, type: 'sound', folder: 'Vox and keys', robot: { text, voice: V }, created: Date.now(), item: packSlot(slot) }, id);
    await refreshMine();
    if (old && mine.find(m => m.id === old)?.robot && !S.grid.cells.flat().some(x => x && x !== cell && x.mine === old)) { await idbDel('mine', old); await refreshMine(); }   // the words it said before, no longer used
    const { lib, k, keyOf, from, to, ...keep } = cell || {};
    S.grid.cells[c][r] = { ...keep, mode: keep.mode || 'oneshot', mine: id, k: 0, name: text, robot: { text, voice: V }, ...(keep.mode === 'loop' && !keep.beats && { beats: 4 }) };
    lwFor = S.grid.cells[c][r]; persist(); warmGridSoon(); drawCellMenu(); drawLoops();
    // playing as a loop: it changes on the next bar; else it is heard once, now
    const going = playing && colLanes(c).some(l => l.cur?.r === r && l.cur.stopAt == null && l.cur.voice.end === Infinity);
    if (going) retake(c, r);
    else { const sl = await cellBase(S.grid.cells[c][r]); if (sl) playNote(eng, sl, -1, 0, ctx.currentTime + 0.02, { bpm: S.bpm, root: S.root, scale: S.scale }); }
    status(`The robot says “${text}”, in ${CHANNELS[c]}, cell ${r + 1}${going ? ', from the next bar' : ''}.`);
  } catch (e) { status(e.message); console.error(e); }
  $('lwSay').disabled = false;
}
$('lwSay').addEventListener('click', sayWords);
$('lwText').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); sayWords(); } });
function openCellMenu(c, r) {
  menuCell = { c, r }; menuPack = null; menuFolder = null; menuSet = null; choosing = !S.grid.cells[c][r]; dzEmpty = false;
  if (!S.grid.cells[c][r] && lPane !== 'set') document.querySelector('[data-lpane="set"]').click();
  $('lsets').hidden = true; $('lmenu').hidden = false; drawCellMenu();
}
function closeCellMenu() { $('lmenu').hidden = true; menuCell = null; drawLoops(); }
// A setting that changes the sound itself: saved, and a playing cell carries on, changed, from the next bar.
function changed(c, r) { persist(); retake(c, r); warmGridSoon(); drawCellMenu(); drawLoops(); }
// A cell's settings changed while it plays: it carries on, changed, from the next bar.
function retake(c, r) {
  const h = lane(c, r).cur;
  if (playing && h?.r === r && h.stopAt == null) relaunchGrid(nextBar(), (cell, hh) => hh === h);
}
const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
async function drawCellMenu() {
  if (!menuCell) return;
  const { c, r } = menuCell, cell = S.grid.cells[c][r];
  $('lmTitle').textContent = `${CHANNELS[c]} · cell ${r + 1}${cell ? ': ' + (cell.name || '…') : ': empty'}`;
  $('lmenu').style.setProperty('--c', CHANNEL_COLOR[c]);
  document.querySelectorAll('[data-lmode]').forEach(b => { b.classList.toggle('on', cell?.mode === b.dataset.lmode); b.disabled = !cell; });
  $('lmEmpty').disabled = !cell;
  // a robot voice: its words and voice, at the top of Settings
  const robo = isRobotCell(cell);
  $('lwBox').hidden = !robo;
  if (robo) fillWords(cell);
  $('lmSets').hidden = (!cell && !dzEmpty) || choosing;
  document.querySelectorAll('[data-lpane="set"], [data-lpane="eq"]').forEach(b => { b.hidden = !cell; });
  if (lPane === 'design' && !choosing) cellDesign(c, r);
  $('lmPick').hidden = !choosing;
  if (cell) {
    $('lmVolBar').firstChild.style.width = Math.round((cell.vol ?? 1) * 100) + '%';
    $('lmVolOut').textContent = Math.round((cell.vol ?? 1) * 100);
    $('lmKey').parentElement.style.display = drumCell(cell) ? 'none' : '';
    choices($('lmKey'), [[false, 'Off'], [true, 'On']], follows(cell), async v => {
      if (v && cell.keyOf == null) {          // find its key by listening, once
        const slot = await cellBase(cell), x = slot.slices[cell.k], buf = x.buf || slot.buf;
        const k = findKey(buf, x.s, x.e); cell.keyOf = k.root;
        status(`${cell.name} sounds ${k.sure > 0.6 ? 'clearly' : k.sure > 0.3 ? 'probably' : 'maybe'} in ${NOTE_NAMES[k.root]}${k.minor ? ' minor' : ''}. It now follows the key.`);
      }
      cell.follow = v; persist(); retake(c, r); drawCellMenu(); drawLoops();
    });
    $('lmKeyOf').textContent = follows(cell) && cell.keyOf != null ? `Its key: ${NOTE_NAMES[cell.keyOf]}` : 'Plays as recorded';
    $('lmSound').textContent = `Sound: ${cell.name || '…'} ▸ Change`;
    const p = cell.pitch || 0;
    $('lmPitch').textContent = p === 0 ? '0' : (p > 0 ? '+' : '−') + Math.abs(p);
    choices($('lmRepeat'), REPEATS, cell.beats || 0, v => { cell.beats = v; changed(c, r); });
    const qname = QUANTS.find(q => q[0] === S.grid.quant)?.[1] || '';
    choices($('lmQuant'), [['all', `As all (${qname})`], ...QUANTS], cell.quant ?? 'all', v => { cell.quant = v === 'all' ? undefined : v; persist(); drawCellMenu(); });
    $('lmQuant').querySelectorAll('button').forEach(b => { b.disabled = cell.mode === 'gate'; });
    const fname = FADES.find(f => f[0] === S.grid.fade)?.[1] || 'Off';
    choices($('lmFade'), [['all', `As all (${fname})`], ...FADES], cell.fade ?? 'all', v => { cell.fade = v === 'all' ? undefined : v; persist(); drawCellMenu(); });
    $('lmFade').querySelectorAll('button').forEach(b => { b.disabled = cell.mode === 'oneshot'; });
    $('lmQuantNote').textContent = cell.mode === 'gate' ? 'Gate plays free: at once, no quantize' : cell.mode === 'oneshot' && cell.quant == null ? 'a hit: the next 16th' : '';
    drawEq(cell);
    const base = await cellBase(cell), x = base?.slices?.[cell.k];
    if (!menuCell || S.grid.cells[c][r] !== cell) return;
    choices($('lmStretch'), [[true, 'On'], [false, 'Off']], cell.stretch ?? true, v => { cell.stretch = v; changed(c, r); });
    $('lmStretch').querySelectorAll('button').forEach(b => { b.disabled = !x?.bpm; });
    $('lmStretchNote').textContent = !x?.bpm ? 'Not a loop with a tempo' : cell.stretch === false ? `Sped up like a record (made at ${Math.round(x.bpm)} BPM)` : 'Keeps its pitch at any tempo';
    const fx = S.grid.colFx[c];
    $('lmFxCol').textContent = `on the whole ${CHANNELS[c]} column`;
    choices($('lmFx'), COL_FX, fx.type, v => { fx.type = v; if (eng.cols?.[c]) wireColFx(c); persist(); drawCellMenu(); drawLoops(); });
    $('lmFxBar').firstChild.style.width = Math.round(fx.amt * 100) + '%';
    $('lmFxRow').hidden = $('lmSkipRow').hidden = fx.type === 'none';
    choices($('lmSkip'), [[false, 'Effect on'], [true, 'Skips it']], !!cell.fxOff, v => {
      cell.fxOff = v; persist();
      for (const h of cellHandles(c, r)) { h.g.disconnect(); h.g.connect(colInput(c, cell)); }
      drawCellMenu();
    });
    if (x) drawCellWave(x, base, cell, c);
  }
  if (!choosing) return;
  const crumbs = $('lmCrumbs'), list = $('lmList'); crumbs.textContent = ''; list.textContent = '';
  const btn = (text, small, fn, sel, colour, cls) => {
    const b = document.createElement('button'); b.textContent = text;
    if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    if (sel) b.classList.add('sel');
    if (colour) { b.style.setProperty('--f', colour); b.classList.add(cls || 'tint'); }
    b.addEventListener('click', fn); list.appendChild(b); return b;
  };
  const crumb = (text, fn, colour) => {
    const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', fn);
    if (colour) b.style.color = colour;
    crumbs.appendChild(b);
  };
  // put a sound in the cell (what was playing there stops)
  const put = x => {
    const was = S.grid.cells[c][r];
    { const l = lane(c, r); if (l.cur?.r === r) stopAt(l.cur, { when: ctx.currentTime, j: 0 }, false); if (l.next?.r === r) { kill(l.next); l.next = null; } }
    S.grid.cells[c][r] = { ...x, vol: was?.vol ?? 1 };
    choosing = false; persist(); warmGridSoon(); drawCellMenu(); drawLoops();
  };
  const putHit = (lib, k, x) => {
    const was = S.grid.cells[c][r], hit = HIT_COLS.has(c) && !x.bpm, beats = x.bpm ? 0 : was ? was.beats : hit ? 4 : 0;   // a loop plays whole
    put({ lib, k, name: x.name, mode: was?.mode || (x.bpm || lib === 'ambience' || hit ? 'loop' : 'oneshot'), ...(beats && { beats }) });
  };
  crumb('Sounds', () => { menuPack = menuFolder = menuSet = null; drawCellMenu(); });
  if (menuSet) {             // a pack, its sounds by colour
    crumb(SET_PACKS[menuSet]?.[0] || LIBRARY[menuSet].name, () => drawCellMenu());
    const wait = document.createElement('p'); wait.className = 'note lmnote'; wait.textContent = 'Loading…'; list.appendChild(wait);
    const which = menuSet, groups = await packGroups(which);
    if (menuSet !== which || !menuCell) return;
    wait.remove();
    for (const g of groups) {
      const h = document.createElement('h4'); h.className = 'lmhead4'; h.textContent = g.label; h.style.setProperty('--f', g.colour); list.appendChild(h);
      for (const k of g.ks) {
        const x = g.slot.slices[k];
        btn(x.name, x.bpm ? `${Math.round(x.bpm)} BPM · ${x.bars} bar${x.bars > 1 ? 's' : ''}` : '', () => {
          playNote(eng, g.slot, -1, k, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root });      // a taste
          putHit(g.lib, k, x);
        }, cell?.lib === g.lib && cell.k === k, g.colour);
      }
    }
    return;
  }
  const F = menuFolder && cellFolders().find(f => f[0] === menuFolder), fc = F?.[2];
  if (!F) {             // the colour folders, the column's own first
    btn('🥁 Design a hit', 'make a drum hit, tap its steps: a loop', () => {
      choosing = false; dzEmpty = true; cellDzFor = null; document.querySelector('[data-lpane="design"]').click();
    }, false, 'var(--c-kick)', 'folder');
    btn('🤖 Robot words', 'type what it says, choose the voice', () => {
      choosing = false; lwFor = null;
      const V = { ...defaultVoice(), variant: 'robosoft' };
      $('lwText').value = 'Check it'; $('lwVariant').value = V.variant; for (const [id, key] of LW) $(id).value = V[key]; lwShow();
      sayWords().then(() => { document.querySelector('[data-lpane=set]').click(); $('lwText').select(); });
    }, false, 'var(--c-vox)', 'folder');
    const fs = cellFolders(), own = fs.find(f => f[0] === COL_FOLDER[c]);
    for (const f of [own, ...fs.filter(x => x !== own)].filter(Boolean)) {
      const n = f[1] === 'hits:snare' || f[1] === 'hits:tops' ? (banks ? folderSounds(f).length : '') : folderSounds(f).length;
      if (n === 0) continue;
      const mineN = Array.isArray(f[1]) ? mine.filter(m => m.type === 'loop' && folderOf(m) === f[0]).length : 0;
      const what = typeof f[1] === 'string' ? `${n} hits` : `${n - mineN} pack${n - mineN === 1 ? '' : 's'}${mineN ? ` + ${mineN} of your loops` : ''}`;
      btn('▸ ' + f[0].replace(/ \(.*\)$/, ''), `${what}${f === own ? ' · this column' : ''}`,
        () => { menuFolder = f[0]; menuPack = null; drawCellMenu(); }, cell && f === own, f[2] || 'var(--accent)', 'folder');
    }
    const h = document.createElement('h4'); h.className = 'lmhead4'; h.textContent = 'Packs'; list.appendChild(h);
    if (!banks) await bankList();
    if (!menuCell || menuFolder || menuSet) return;
    for (const id of packList()) {
      const set = SET_PACKS[id], f = !set && folderFor(id), kit = !set && (DRUM_BANKS.includes(id) || LIBRARY[id].kit || isKitLib(id));
      const n = set ? set[1].reduce((a, b) => a + (banks[LIBRARY[b].bank || b]?.from?.length || 0), 0) : banks[LIBRARY[id].bank || id]?.from?.length || 0;
      btn(set ? set[0] : LIBRARY[id].name, `${n} sounds · ${set ? 'a set, all colours' : kit ? 'a kit, by part' : f?.[0].replace(/ \(.*\)$/, '') || ''}`,
        () => { menuSet = id; drawCellMenu(); }, false, set ? 'var(--accent)' : kit ? 'var(--c-kit)' : f?.[2] || 'var(--accent)');
    }
    return;
  }
  crumb(F[0].replace(/ \(.*\)$/, ''), () => { menuPack = null; drawCellMenu(); }, fc);
  if (!menuPack) {
    if (typeof F[1] === 'string' && !banks) { await bankList(); if (menuFolder === F[0]) drawCellMenu(); return; }
    for (const it of folderSounds(F)) {
      if (it.mine) {
        const x0 = it.mine.item.slices?.[0], tempo = `my loop · ${x0?.bpm ? Math.round(x0.bpm) + ' BPM · ' : ''}${(x0?.bars || 1) * 4} beats`;
        const b = btn(it.mine.name, tempo, () => put({ mine: it.mine.id, k: 0, name: it.mine.name, mode: 'loop' }), cell?.mine === it.mine.id, fc);
        if (it.mine.folder !== 'Beats') cellBase({ mine: it.mine.id }).then(sl => sl && sampleKey('mine:' + it.mine.id, sl, 0)).then(kk => { if (b.isConnected && kk) b.querySelector('small').textContent = `${tempo} · in ${keyWord(kk, it.mine.folder === 'Bass' || it.mine.folder === 'Sub')}`; });
      }
      else if (it.pack) btn(LIBRARY[it.pack].name + ' ▸', `${libTag(it.pack)} · ${banks?.[LIBRARY[it.pack].bank || it.pack]?.from?.length || ''} sounds`, () => { menuPack = it.pack; drawCellMenu(); }, cell?.lib === it.pack, fc);
      else {
        const h = it.hit, x = { name: banks[h.from.lib].from[h.k], bpm: banks[h.from.lib].loops?.[h.k]?.[0] };
        btn(h.label, '', async () => { const sl = await slotOf({ lib: h.from.lib }); playNote(eng, sl, -1, h.k, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root }); putHit(h.from.lib, h.k, { ...x, name: shortName(x.name) }); },
          cell?.lib === h.from.lib && cell.k === h.k, fc);
      }
    }
    const inst = Array.isArray(F[1]) ? F[1].filter(id => LIBRARY[id] && !isPack(id)) : [];
    if (inst.length) { const p = document.createElement('p'); p.className = 'note lmnote'; p.textContent = `${inst.map(id => LIBRARY[id].name).slice(0, 6).join(', ')}${inst.length > 6 ? '…' : ''}: instruments, played on the Pads. Record a pattern with one and ⟳ Loop it to put it here.`; list.appendChild(p); }
    return;
  }
  crumb(LIBRARY[menuPack].name, () => drawCellMenu(), fc);
  const wait = document.createElement('p'); wait.className = 'note lmnote'; wait.textContent = 'Loading…'; list.appendChild(wait);
  const pack = menuPack, slot = await slotOf({ lib: pack });
  if (menuPack !== pack || !menuCell) return;
  wait.remove();
  const keys = !drumLib(pack);
  slot.slices.forEach((x, k) => {
    if (toDelete().has(`${pack}#${k}`)) return;
    const tempo = x.bpm ? `${Math.round(x.bpm)} BPM · ${x.bars} bar${x.bars > 1 ? 's' : ''}` : '';
    const b = btn(x.name, tempo || (keys ? ' ' : ''), () => {
      playNote(eng, slot, -1, k, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root });      // a taste
      putHit(pack, k, x);
    }, cell?.lib === pack && cell.k === k, fc);
    if (keys) sampleKey(`${pack}#${k}`, slot, k).then(kk => { if (b.isConnected && kk) b.querySelector('small').textContent = [tempo, 'in ' + keyWord(kk, LOW_LIBS.has(pack) || F?.[0] === 'Bass')].filter(Boolean).join(' · '); });
  });
}
document.querySelectorAll('[data-lmode]').forEach(b => b.addEventListener('click', () => {
  const cell = menuCell && S.grid.cells[menuCell.c][menuCell.r]; if (!cell) return;
  cell.mode = b.dataset.lmode; persist(); drawCellMenu(); drawLoops();
}));
fader($('lmVolBar'), v => {
  const cell = menuCell && S.grid.cells[menuCell.c][menuCell.r]; if (!cell) return;
  cell.vol = v; persist();
  const h = lane(menuCell.c, menuCell.r).cur;
  if (h?.r === menuCell.r && h.stopAt == null) { h.level = v; h.g.gain.setTargetAtTime(v, ctx.currentTime, 0.02); }
  drawCellMenu();
});
$('lmSound').addEventListener('click', () => { choosing = true; drawCellMenu(); });
// 🥁 Design (a cell's third tab): a hit made in the drum designer, on the steps of a bar, baked into a
// one-bar loop at the song's tempo and swing, into this cell (and the library's Beats, My loops). An
// empty cell gets it from its picker (🥁 Design a hit).
let cellDz = null, cellDzFor = null, dzEmpty = false;
const cellSteps = new Array(16).fill(0);
const DZ_COLKIND = ['kick', 'snare', 'hat'];
function cellDesign(c, r) {
  cellDz ||= drumDesigner($('lmDz'));
  const at = `${c}:${r}`;
  if (cellDzFor !== at) {          // a cell new to it: the drum and steps its column suggests
    cellDzFor = at; cellDz.setKind(DZ_COLKIND[c] || 'perc');
    const on = c === 0 ? [0, 8] : c === 1 ? [4, 12] : c === 2 ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 6, 10];
    cellSteps.fill(0); for (const i of on) cellSteps[i] = c === 2 && i % 4 ? 0.55 : 1;
  }
  const box = $('lmSteps'); box.textContent = '';
  cellSteps.forEach((v, i) => {
    const b = document.createElement('button'); b.textContent = i % 4 ? '·' : String(i / 4 + 1);
    b.classList.toggle('on', v === 1); b.classList.toggle('soft', v > 0 && v < 1);
    b.addEventListener('click', () => { cellSteps[i] = v === 0 ? 1 : v === 1 ? 0.55 : 0; cellDesign(c, r); });
    box.appendChild(b);
  });
}
// the bar: the hit on its steps (soft at 55%), at the tempo and swing now; a hit ringing past the bar
// comes round to its start, so the loop is seamless
async function cellBar() {
  const b = await cellDz.buffer(), x = b.getChannelData(0), sd = stepDur(), sw = (2 * S.swing / 100 - 1) * sd;
  const n = Math.round(16 * sd * b.sampleRate), out = new Float32Array(n);
  cellSteps.forEach((v, i) => { if (!v) return; const a = Math.round((i * sd + (i % 2 ? sw : 0)) * b.sampleRate); for (let j = 0; j < x.length; j++) out[(a + j) % n] += x[j] * v; });
  let top = 0; for (const v of out) top = Math.max(top, Math.abs(v));
  if (top > 0.95) for (let i = 0; i < n; i++) out[i] *= 0.95 / top;
  const bar = ctx.createBuffer(1, n, b.sampleRate); bar.copyToChannel(out, 0); return { bar, hit: b };
}
$('lmDzBar').addEventListener('click', async () => {
  if (!cellSteps.some(v => v)) { status('Tap a step or two first.'); return; }
  const { bar } = await cellBar(); dzPlay(bar, playing ? nextBar().when : ctx.currentTime + 0.02);
});
$('lmDzSave').addEventListener('click', async () => { if (cellDz) await saveMine(hitSlot(await cellDz.buffer(), cellDz.name()), cellDz.name()); });
$('lmDzPut').addEventListener('click', async () => {
  if (!menuCell || !cellDz) return;
  if (!cellSteps.some(v => v)) { status('Tap a step or two first.'); return; }
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  const { c, r } = menuCell, { bar } = await cellBar(), was = S.grid.cells[c][r];
  const name = `${cellDz.name()}, ${cellSteps.filter(v => v).length} steps`, folder = c < 3 ? 'Beats' : LR_FOLDER[c];
  const slot = { factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), trig: 'loop' }, buf: bar, drumLoop: true,
    slices: [{ s: 0, e: bar.duration, name, bpm: S.bpm, bars: 1 }] };
  const id = 'm' + Date.now().toString(36);
  await idbPut('mine', { id, name, type: 'loop', folder, created: Date.now(), item: packSlot(slot) }, id);
  await refreshMine();
  for (const l of colLanes(c)) for (const k of ['cur', 'next', 'gate']) if (l[k]?.r === r) { kill(l[k]); l[k] = null; }
  S.grid.cells[c][r] = { mine: id, k: 0, name, mode: 'loop', vol: was?.vol ?? 1, ...(c >= 3 && { follow: false }) };
  dzEmpty = false; persist(); drawLoops(); warmGridSoon(); drawCellMenu();
  if (playing) tapCell(c, r);
  status(`“${name}” is in ${CHANNELS[c]}, cell ${r + 1}${playing ? ', playing from the next bar' : ''} (and in the library: ${folder}, My loops).`);
});
// The cell's settings in two tabs: Settings (with the wave first) and EQ & Effect.
let lPane = 'set';
document.querySelectorAll('[data-lpane]').forEach(b => b.addEventListener('click', () => {
  lPane = b.dataset.lpane;
  document.querySelectorAll('[data-lpane]').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('[data-pane]').forEach(x => { x.hidden = x.dataset.pane !== lPane; });
  drawCellMenu();
}));
// The EQ: its curve, and a bar for each band (-12 to +12 dB, 0 in the middle). It changes a
// playing cell at once.
let eqProbe = null;
function drawEq(cell) {
  eqCurve($('lmEq'), cell.eq, cssVar(`--c-${['kick', 'snare', 'hat', 'bass', 'chords', 'lead', 'sub', 'vox'][menuCell.c]}`));
  EQ_BANDS.forEach(([, , k]) => {
    const v = cell.eq?.[k] || 0;
    $('lmEq' + k).firstChild.style.width = Math.round((v + 12) / 24 * 100) + '%';
    $('lmEq' + k + 'Out').textContent = (v > 0 ? '+' : '') + v + ' dB';
  });
}
// An EQ's curve (eq: { lo, mid, hi } in dB), drawn from the filters' own response.
function eqCurve(cv, eq, colr) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
  if (!W || !H) return;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  eqProbe ||= makeEq({});
  EQ_BANDS.forEach(([, , k], i) => { eqProbe[i].gain.value = eq?.[k] || 0; });
  const g2 = cv.getContext('2d'), N = 120, fr = new Float32Array(N), mag = new Float32Array(N), ph = new Float32Array(N), tot = new Float32Array(N).fill(0);
  for (let i = 0; i < N; i++) fr[i] = 30 * Math.pow(16000 / 30, i / (N - 1));
  for (const b of eqProbe) { b.getFrequencyResponse(fr, mag, ph); for (let i = 0; i < N; i++) tot[i] += 20 * Math.log10(mag[i] || 1e-6); }
  const y = db => H / 2 - db / 15 * (H / 2);
  g2.clearRect(0, 0, W, H); g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H);
  g2.fillStyle = '#ffffff22';
  for (const f of [100, 1000, 10000]) g2.fillRect(Math.log(f / 30) / Math.log(16000 / 30) * W, 0, dpr, H);
  g2.fillRect(0, y(0), W, dpr);
  g2.strokeStyle = colr; g2.lineWidth = 2 * dpr; g2.beginPath();
  for (let i = 0; i < N; i++) { const X = i / (N - 1) * W; i ? g2.lineTo(X, y(tot[i])) : g2.moveTo(X, y(tot[i])); }
  g2.stroke();
  g2.fillStyle = '#ffffff88'; g2.font = `${9 * dpr}px ui-monospace, monospace`;
  [['100', 100], ['1k', 1000], ['10k', 10000]].forEach(([t, f]) => g2.fillText(t, Math.log(f / 30) / Math.log(16000 / 30) * W + 3 * dpr, H - 3 * dpr));
}

// A sound's own menu: hold its pad in Sound mode (an instrument, or a kit). Its volume, pitch
// and how it plays; its EQ and an effect of its own, on every note of it (audio.js: P.eq, P.fx).
const SOUND_FX = [['none', 'None'], ['reverb', 'Reverb'], ['echo', 'Echo'], ['pingpong', 'Ping-pong'], ['chorus', 'Chorus'],
  ['overdrive', 'Drive'], ['fuzz', 'Fuzz'], ['tape', 'Tape']];
let snSi = null;
function openSoundSheet(si) {
  if (!S.slots[si]) return;
  snSi = si; $('sndBox').hidden = false; drawSoundSheet();
}
function drawSoundSheet() {
  if (snSi == null) return;
  const si = snSi, sl = S.slots[si], P = sl.params, colr = drumSide(si) ? 'var(--c-kit)' : soundVar(si);
  $('sndBox').querySelector('.sheet').style.setProperty('--c', colr);
  $('snTitle').textContent = `${si + 1} · ${drumSide(si) ? 'Kit' : PART[si]} · ${sl.name} · ${slotTag(sl)}`;
  $('snVol').firstChild.style.width = Math.round(P.vol * 100) + '%'; $('snVolOut').textContent = Math.round(P.vol * 100);
  $('snPitch').textContent = P.pitch === 0 ? '0' : (P.pitch > 0 ? '+' : '−') + Math.abs(P.pitch);
  choices($('snTrig'), [['oneshot', 'One shot'], ['gate', 'Gate'], ['loop', 'Loop']], P.trig, v => { checkpoint(); P.trig = v; syncPanel(); dirty(); drawSoundSheet(); });
  $('snNote').textContent = drumSide(si) ? 'A kit: the EQ and the effect go on every hit of it.' : 'Pitch moves every key of it. More settings: filter, length, its key, choke.';
  eqCurve($('snEq'), P.eq, cssVar(drumSide(si) ? '--c-kit' : `--s${si + 1}`));
  EQ_BANDS.forEach(([, , k]) => {
    const v = P.eq?.[k] || 0;
    $('snEq' + k).firstChild.style.width = Math.round((v + 12) / 24 * 100) + '%';
    $('snEq' + k + 'Out').textContent = (v > 0 ? '+' : '') + v + ' dB';
  });
  const fx = P.fx || { type: 'none', amt: 0.5 };
  choices($('snFx'), SOUND_FX, fx.type, v => { checkpoint(); P.fx = v === 'none' ? undefined : { type: v, amt: fx.amt ?? 0.5 }; dirty(); drawSoundSheet(); taste(); });
  $('snFxAmt').firstChild.style.width = Math.round((fx.amt ?? 0.5) * 100) + '%';
  $('snFxOut').textContent = fx.type === 'none' ? '' : Math.round((fx.amt ?? 0.5) * 100) + '%';
}
const taste = () => { if (snSi != null) noteOn(eng, snSi, S.lastKey[snSi] || 0, ctx.currentTime + 0.01); };
fader($('snVol'), v => { if (snSi == null) return; S.slots[snSi].params.vol = v; syncPanel(); dirty(); drawSoundSheet(); });
EQ_BANDS.forEach(([, , k]) => fader($('snEq' + k), v => {
  if (snSi == null) return; const P = S.slots[snSi].params;
  P.eq = { ...P.eq, [k]: Math.round((v - 0.5) * 24) }; dirty(); drawSoundSheet();
}));
for (const t of ['pointerup', 'pointercancel']) ['snEqlo', 'snEqmid', 'snEqhi', 'snFxAmt'].forEach(id => $(id).addEventListener(t, taste));
fader($('snFxAmt'), v => { if (snSi == null) return; const P = S.slots[snSi].params; if (!P.fx) return; P.fx = { ...P.fx, amt: v }; dirty(); drawSoundSheet(); });
$('snEqFlat').addEventListener('click', () => { if (snSi == null) return; S.slots[snSi].params.eq = undefined; dirty(); drawSoundSheet(); taste(); });
const snPitch = d => { if (snSi == null) return; const P = S.slots[snSi].params; checkpoint(); P.pitch = d ? Math.max(-24, Math.min(24, P.pitch + d)) : 0; syncPanel(); dirty(); drawSoundSheet(); taste(); };
$('snDown').addEventListener('click', () => snPitch(-1)); $('snUp').addEventListener('click', () => snPitch(1)); $('snZero').addEventListener('click', () => snPitch(0));
$('snClose').addEventListener('click', () => { $('sndBox').hidden = true; snSi = null; draw(); });
$('snChange').addEventListener('click', () => { $('sndBox').hidden = true; snSi = null; openMenu('tBrowse'); });
$('snEdit').addEventListener('click', () => { $('sndBox').hidden = true; snSi = null; editCurrent(); });
$('snMore').addEventListener('click', () => { $('sndBox').hidden = true; snSi = null; openMenu('tSound'); });
document.querySelectorAll('[data-snpane]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-snpane]').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('[data-snp]').forEach(x => { x.hidden = x.dataset.snp !== b.dataset.snpane; });
  drawSoundSheet();
}));
EQ_BANDS.forEach(([, , k], i) => fader($('lmEq' + k), v => {
  const cell = menuCellNow(); if (!cell) return;
  const db = Math.round((v - 0.5) * 24);
  cell.eq = { ...cell.eq, [k]: db }; persist();
  for (const h of cellHandles(menuCell.c, menuCell.r)) h.eq[i].gain.setTargetAtTime(db, ctx.currentTime, 0.02);
  drawEq(cell);
}));
$('lmEqFlat').addEventListener('click', () => {
  const cell = menuCellNow(); if (!cell) return;
  cell.eq = undefined; persist();
  for (const h of cellHandles(menuCell.c, menuCell.r)) h.eq.forEach(b => b.gain.setTargetAtTime(0, ctx.currentTime, 0.02));
  drawEq(cell);
});
const menuCellNow = () => menuCell && S.grid.cells[menuCell.c][menuCell.r];
const transpose = d => { const cell = menuCellNow(); if (!cell) return; cell.pitch = d === 0 ? 0 : Math.max(-12, Math.min(12, (cell.pitch || 0) + d)); changed(menuCell.c, menuCell.r); };
$('lmDown').addEventListener('click', () => transpose(-1));
$('lmUp').addEventListener('click', () => transpose(1));
$('lmZero').addEventListener('click', () => transpose(0));
fader($('lmFxBar'), v => { if (!menuCell) return; S.grid.colFx[menuCell.c].amt = v; colFxAmount(menuCell.c); persist(); $('lmFxBar').firstChild.style.width = Math.round(v * 100) + '%'; });

// The wave of a cell's sound: drag across it to choose the part that plays (on a
// loop with a tempo, it snaps to 16th notes); tap to hear from there. The part
// that repeats is bright; beats are marked, and bars more strongly.
let waveSel = null;           // while dragging: [from, to]
function drawCellWave(x, base, cell, c) {
  const cv = $('lmWave'), dpr = devicePixelRatio || 1, W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
  if (!W || !H) return;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g2 = cv.getContext('2d'), buf = x.buf || base.buf, d = buf.getChannelData(0), sr = buf.sampleRate, whole = x.e - x.s;
  const colr = cssVar(`--c-${['kick', 'snare', 'hat', 'bass', 'chords', 'lead', 'sub', 'vox'][c]}`);
  const [from, to] = waveSel || [cell.from || 0, cell.to ?? 1];
  const beat = 60 / (x.bpm || S.bpm), playTo = cell.beats ? Math.min(to, from + cell.beats * beat / whole) : to;
  g2.clearRect(0, 0, W, H); g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H);
  g2.fillStyle = colr; g2.globalAlpha = 0.18; g2.fillRect(from * W, 0, (to - from) * W, H);
  if (x.bpm) for (let i = 0, b = 0; b <= whole + 1e-6; i++, b = i * beat) {
    g2.globalAlpha = i % 4 ? 0.18 : 0.45; g2.fillStyle = '#fff'; g2.fillRect(b / whole * W, 0, Math.max(1, dpr * (i % 4 ? 1 : 1.5)), H);
  }
  const i0 = Math.floor(x.s * sr), n = Math.max(1, Math.floor(whole * sr)), per = n / W;
  for (let px = 0; px < W; px++) {
    let lo = 0, hi = 0; const a = i0 + Math.floor(px * per), b = Math.min(i0 + n, a + Math.max(1, Math.ceil(per)));
    for (let i = a; i < b; i += Math.max(1, (per / 24) | 0)) { const v = d[i] || 0; if (v < lo) lo = v; if (v > hi) hi = v; }
    const f = px / W; g2.globalAlpha = f >= from && f < playTo ? 1 : 0.3; g2.fillStyle = colr;
    g2.fillRect(px, H / 2 - hi * H * 0.47, 1, Math.max(1, (hi - lo) * H * 0.47));
  }
  g2.globalAlpha = 1; g2.fillStyle = '#fff'; g2.fillRect(from * W, 0, 2 * dpr, H); g2.fillRect(playTo * W - 2 * dpr, 0, 2 * dpr, H);
  const secs = (playTo - from) * whole;
  $('lmSel').textContent = `${(from === 0 && to === 1 ? 'all' : 'part')} · ${x.bpm ? +(secs / beat).toFixed(1) + ' beats' : secs.toFixed(2) + ' s'}${cell.beats ? ' (repeats)' : ''}`;
}
{
  const cv = $('lmWave');
  let p0 = null, info = null;
  const snap = v => (info?.x.bpm ? Math.round(v * info.steps) / info.steps : v);
  cv.addEventListener('pointerdown', async ev => {
    const cell = menuCellNow(); if (!cell) return;
    ev.preventDefault(); capture(cv, ev); p0 = along(cv, ev);
    const base = await cellBase(cell), x = base.slices[cell.k];
    info = { base, x, cell, steps: x.bpm ? Math.round((x.e - x.s) / (15 / x.bpm)) : 0 };
  });
  cv.addEventListener('pointermove', ev => {
    if (p0 == null || !info) return;
    const p = along(cv, ev); if (Math.abs(p - p0) < 0.015) return;
    waveSel = [snap(Math.min(p0, p)), snap(Math.max(p0, p))];
    drawCellWave(info.x, info.base, info.cell, menuCell.c);
  });
  const end = () => {
    if (p0 == null || !info) { p0 = null; return; }
    const { cell, x, base } = info;
    if (waveSel && waveSel[1] - waveSel[0] > 0.005) { [cell.from, cell.to] = waveSel; changed(menuCell.c, menuCell.r); }
    else {                      // a tap: hear from there
      const at = x.s + (x.e - x.s) * p0, buf = x.buf || base.buf;
      playNote(eng, { kind: 'chop', buf, slices: [{ buf, s: at, e: Math.min(x.e, at + 2.5), start: 0, len: 1 }], params: { ...defParams(), vol: 1 } }, -1, 0, ctx.currentTime, {});
    }
    waveSel = null; p0 = null; info = null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
$('lmHear').addEventListener('click', async () => {
  const cell = menuCellNow(); if (!cell) return;
  const slot = await cellSlot({ ...cell, mode: 'oneshot' }); if (!slot) return;
  ctx.resume(); playNote(eng, slot, -1, 0, ctx.currentTime, { bpm: S.bpm, root: S.root, scale: S.scale });
});
$('lmWhole').addEventListener('click', () => { const cell = menuCellNow(); if (!cell) return; cell.from = 0; cell.to = 1; changed(menuCell.c, menuCell.r); });
$('lmEmpty').addEventListener('click', () => {
  const { c, r } = menuCell; const col = lane(c, r);
  if (col.cur?.r === r) stopAt(col.cur, { when: ctx.currentTime, j: 0 }, false);
  if (col.next?.r === r) { kill(col.next); col.next = null; }
  S.grid.cells[c][r] = null; choosing = true; persist(); drawCellMenu(); drawLoops();
});
$('lmClose').addEventListener('click', closeCellMenu);
buildLoops();
// ---------------------------------------------------------------------------
// Sets and pack files. A set of yours: the grid (every cell and its settings, the column effects,
// the tempo, key and reverb room), kept on this device. A pack file: one file (JSON) with a set
// and/or sounds of yours in it, their recordings as 16-bit samples, to keep in Files or iCloud and
// open on any device with Pocket Sampler; also what ☁ Send to the library uploads. Built-in sounds
// are named, not copied: every copy of the app has them.
// ---------------------------------------------------------------------------
const gridSet = name => ({ name, bpm: S.bpm, root: S.root, scale: S.scale, space: spaceNow(), cells: S.grid.cells.map(col => col.map(c => (c ? { ...c } : null))),
  fx: S.grid.colFx.map(f => ({ ...f })), quant: S.grid.quant, fade: S.grid.fade });
$('lsSave').addEventListener('click', async () => {
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  const name = prompt('Name the set:', `My set ${S.bpm} BPM`); if (!name?.trim()) return;
  const id = 'm' + Date.now().toString(36);
  await idbPut('mine', { id, name: name.trim(), type: 'set', created: Date.now(), set: gridSet(name.trim()) }, id);
  await refreshMine(); drawSets(); status(`“${name.trim()}” is in My sets (Loops › ⚙).`);
});
function mySetMenu(m) {
  const a = prompt(`“${m.name}”: type S to share it as a pack file, D to delete it, or a new name to rename it.`, 'S');
  if (a == null) return;
  if (/^s$/i.test(a.trim())) { sharePack(packOf({ name: m.name, set: m.set })); return; }
  if (/^d$/i.test(a.trim())) { if (confirm(`Delete the set “${m.name}”? (Its sounds stay in My Sounds.)`)) idbDel('mine', m.id).then(refreshMine).then(drawSets); return; }
  if (a.trim()) idbPut('mine', { ...m, name: a.trim(), set: { ...m.set, name: a.trim() } }, m.id).then(refreshMine).then(drawSets);
}
// 16-bit samples, as text (base64), and back
function pcm16(f32) {
  const v = new Int16Array(f32.length); for (let i = 0; i < f32.length; i++) v[i] = Math.max(-32767, Math.min(32767, Math.round(f32[i] * 32767)));
  const b = new Uint8Array(v.buffer); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
function unpcm16(b64) { const s = atob(b64), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); const v = new Int16Array(b.buffer), f = new Float32Array(v.length); for (let i = 0; i < v.length; i++) f[i] = v[i] / 32767; return f; }
const recOut = m => ({ ...m, item: { ...m.item, bufs: m.item.bufs.map(b => ({ rate: b.rate, pcm16: pcm16(b.data) })) } });
const recIn = m => ({ ...m, item: { ...m.item, bufs: m.item.bufs.map(b => ({ rate: b.rate, data: unpcm16(b.pcm16) })) } });
// a pack: { name, set?, ids? } -> the file's contents. A set brings every sound of yours its cells use.
function packOf({ name, set = null, ids = [] }) {
  const want = new Set(ids);
  for (const col of set?.cells || []) for (const c of col) if (c?.mine) want.add(c.mine);
  const sounds = mine.filter(m => want.has(m.id) && m.item).map(recOut);
  return { format: 'pocket-pack', version: 1, name, made: new Date().toISOString(), app: BUILD, ...(set && { set }), sounds };
}
const packFile = P => new File([JSON.stringify(P)], `${safeName(P.name)}.pocketpack.json`, { type: 'application/json' });
async function sharePack(P) {
  const f = packFile(P), mb = (f.size / 1e6).toFixed(1);
  if (navigator.canShare?.({ files: [f] })) {
    try { await navigator.share({ files: [f] }); status(`Shared ${f.name} (${mb} MB).`); return; }
    catch (e) { if (e.name === 'AbortError') return; log('error', 'share: ' + e.message); }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status(`Saved ${f.name} (${mb} MB): open it on another device with ⬇ Open a pack file.`);
}
$('lsShare').addEventListener('click', () => { const name = prompt('Name the pack:', `My pack ${S.bpm} BPM`); if (name?.trim()) sharePack(packOf({ name: name.trim(), set: gridSet(name.trim()) })); });
$('lsOpen').addEventListener('click', () => $('importFile').click());
// a pack file opened: its sounds into My Sounds (new ids, so nothing of yours is overwritten), its set into My sets
async function importPack(P) {
  if (P.format !== 'pocket-pack' || !Array.isArray(P.sounds)) throw new Error('not a Pocket Sampler pack file');
  if (!db) throw new Error('saving needs this browser’s storage, which is not available here');
  const map = new Map(), t = Date.now();
  for (const [i, m] of P.sounds.entries()) {
    const id = 'm' + (t + i).toString(36) + 'p'; map.set(m.id, id);
    await idbPut('mine', { ...recIn(m), id, created: t + i, ...(P.from && { from: P.from }) }, id);
  }
  let setId = null;
  if (P.set) {
    const set = { ...P.set, cells: P.set.cells.map(col => col.map(c => (c?.mine ? { ...c, mine: map.get(c.mine) || c.mine } : c))) };
    setId = 'm' + (t + P.sounds.length).toString(36) + 's';
    await idbPut('mine', { id: setId, name: P.name, type: 'set', created: t, set }, setId);
  }
  await refreshMine(); drawBrowser(); drawSets();
  return { sounds: P.sounds.length, set: setId && mine.find(m => m.id === setId) };
}
async function openPackFile(f) {
  status(`Opening ${f.name}…`);
  const P = JSON.parse(await f.text()), r = await importPack(P);
  status(`“${P.name}”: ${r.sounds} sound${r.sounds === 1 ? '' : 's'} into My Sounds${r.set ? ', and its set into My sets (Loops › ⚙)' : ''}.`);
  if (r.set && confirm(`Load the set “${P.name}” into the Loops now?`)) loadSet(r.set.id, false, r.set.set);
}

// ---------------------------------------------------------------------------
// ☁ Send to the library: a pack (the grid, your sounds, one sound or a pack file) and notes on it
// (what it is, who made it, where from and its license) go to the repository's library-inbox
// branch by GitHub's API, with a token kept only in this browser. ☁ Shared (Menu › Sounds) lists
// what has been sent (the inbox) and what Claude has filed in the library (sounds/shared), on every
// device; tap one to add it to My Sounds. tools/inbox.py files the inbox: see CLAUDE.md.
// ---------------------------------------------------------------------------
const GH = { owner: 'munkachy', repo: 'Monastic-games', inbox: 'library-inbox' };
const ghTok = () => { try { return localStorage.getItem('pocketGitHub') || ''; } catch (e) { return ''; } };
async function gh(path, opts = {}, tok = ghTok()) {
  const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}${path}`, { ...opts,
    headers: { Accept: 'application/vnd.github+json', ...(tok && { Authorization: `Bearer ${tok}` }), ...(opts.body && { 'Content-Type': 'application/json' }) } });
  if (!r.ok) { const e = new Error(`GitHub: ${r.status} ${(await r.json().catch(() => ({}))).message || r.statusText}`); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}
let sdFilePack = null;
function openSend() {
  const sel = $('sdOne'); sel.textContent = '';
  for (const m of mine.filter(m => m.item)) sel.add(new Option(m.name, m.id));
  $('sdName').value = `${new Date().toISOString().slice(0, 10)} ${S.bpm} BPM`; $('sdAbout').value = ''; $('sdSrc').value = '';
  $('sdTokRow').hidden = !!ghTok(); $('sdForget').hidden = !ghTok(); sdFilePack = null; $('sdWhat').value = 'grid'; sdShow();
  $('menu').hidden = true; $('sendBox').hidden = false;
}
function sdShow() { $('sdOneRow').hidden = $('sdWhat').value !== 'one'; $('sdSrcRow').hidden = $('sdWho').value === 'me'; }
$('sdWhat').addEventListener('change', () => { sdShow(); if ($('sdWhat').value === 'file') $('sdFile').click(); if ($('sdWhat').value === 'one') $('sdName').value = $('sdOne').selectedOptions[0]?.text || ''; });
$('sdOne').addEventListener('change', () => { $('sdName').value = $('sdOne').selectedOptions[0]?.text || ''; });
$('sdWho').addEventListener('change', sdShow);
$('sdFile').addEventListener('change', async () => {
  const f = $('sdFile').files[0]; $('sdFile').value = ''; if (!f) return;
  try { sdFilePack = JSON.parse(await f.text()); if (sdFilePack.format !== 'pocket-pack') throw new Error('not a Pocket Sampler pack file'); $('sdName').value = sdFilePack.name; $('sdInfo').textContent = `${f.name}: ${sdFilePack.sounds.length} sounds${sdFilePack.set ? ' and a set' : ''}.`; }
  catch (e) { sdFilePack = null; status(`Could not read ${f.name}: ${e.message}`); }
});
$('sdCancel').addEventListener('click', () => { $('sendBox').hidden = true; });
$('sdForget').addEventListener('click', () => { try { localStorage.removeItem('pocketGitHub'); } catch (e) {} $('sdTokRow').hidden = false; $('sdForget').hidden = true; status('The GitHub token is forgotten on this device.'); });
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pack';
$('sdSend').addEventListener('click', async () => {
  const name = $('sdName').value.trim(), what = $('sdWhat').value, who = $('sdWho').value, src = $('sdSrc').value.trim();
  if (!name) { status('Give it a name first.'); return; }
  if (who !== 'me' && !src) { status('Say where it is from and its license (or "unknown"): it goes in the list of every sound and its license.'); return; }
  const tok = ghTok() || $('sdTok').value.trim();
  if (!tok) { status('It needs your GitHub token (once on this device).'); return; }
  const P = what === 'file' ? sdFilePack : what === 'grid' ? packOf({ name, set: gridSet(name) }) : what === 'all' ? packOf({ name, ids: mine.filter(m => m.item).map(m => m.id) }) : packOf({ name, ids: [$('sdOne').value] });
  if (!P) { status('Choose the pack file first.'); return; }
  if (!P.sounds.length && !P.set) { status('There is nothing of yours in it to send.'); return; }
  const WHO = { me: 'made by Br. Augustine', recorded: 'recorded by Br. Augustine from another source', other: 'made by someone else' };
  const sent = new Date().toISOString(), dir = `inbox/${sent.slice(0, 10)}-${slug(name)}-${Date.now().toString(36).slice(-4)}`;
  const notes = { name, about: $('sdAbout').value.trim(), who, credit: WHO[who], source: who === 'me' ? '' : src, sent, app: BUILD,
    device: /iPad/.test(navigator.userAgent) ? 'iPad' : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'computer',
    file: 'pack.pocketpack.json', sounds: P.sounds.map(m => ({ name: m.name, type: m.type, ...(m.folder && { folder: m.folder }) })), set: !!P.set, bpm: P.set?.bpm ?? null };
  const md = `# ${name}\n\n${notes.about || '(no description)'}\n\n- Who: ${notes.credit}${notes.source ? `\n- From and license: ${notes.source}` : ''}\n- Sent: ${sent} from ${notes.device} (build ${BUILD})\n- In it: ${P.sounds.length} sound(s)${P.set ? ', and a Loops set' : ''}${notes.bpm ? ` at ${notes.bpm} BPM` : ''}\n${P.sounds.map(m => `  - ${m.name} (${m.type}${m.folder ? ', ' + m.folder : ''})`).join('\n')}\n`;
  $('sdSend').disabled = true;
  try {
    status('Sending to the library…');
    let head;
    try { head = (await gh(`/git/ref/heads/${GH.inbox}`, {}, tok)).object.sha; }
    catch (e) {
      if (e.status !== 404) throw e;          // no inbox yet: made from the default branch
      const repo = await gh('', {}, tok), base = (await gh(`/git/ref/heads/${repo.default_branch}`, {}, tok)).object.sha;
      await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${GH.inbox}`, sha: base }) }, tok); head = base;
    }
    const tree = (await gh(`/git/commits/${head}`, {}, tok)).tree.sha;
    status(`Sending to the library… (${(JSON.stringify(P).length / 1e6).toFixed(1)} MB)`);
    const blob = async text => (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: text, encoding: 'utf-8' }) }, tok)).sha;
    const files = [[`${dir}/pack.pocketpack.json`, await blob(JSON.stringify({ ...P, from: { name, credit: notes.credit, source: notes.source } }))],
      [`${dir}/notes.json`, await blob(JSON.stringify(notes, null, 1))], [`${dir}/notes.md`, await blob(md)]];
    const t2 = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: tree, tree: files.map(([path, sha]) => ({ path, mode: '100644', type: 'blob', sha })) }) }, tok);
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: `Library inbox: ${name} (${notes.credit})`, tree: t2.sha, parents: [head] }) }, tok);
    await gh(`/git/refs/heads/${GH.inbox}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) }, tok);
    try { localStorage.setItem('pocketGitHub', tok); } catch (e) {}
    $('sendBox').hidden = true; shared = null;
    status(`“${name}” is in the library inbox: on every device in Menu › Sounds › ☁ Shared. Tell Claude, and it will be filed in the library with your notes.`);
  } catch (e) {
    status(`Could not send it: ${e.message}${e.status === 401 || e.status === 403 ? ' (check the token: Contents, read and write, on this repository)' : ''}`); log('error', 'send: ' + e.message);
  } finally { $('sdSend').disabled = false; }
});
// ☁ Shared: what Claude has filed (sounds/shared/index.json, on the site) and what waits in the inbox
let shared = null;
async function sharedItems() {
  if (shared) return shared;
  const out = [];
  try { for (const x of (await (await fetch('sounds/shared/index.json', { cache: 'no-cache' })).json()).items) out.push({ ...x, url: `sounds/shared/${x.file}`, filed: true }); } catch (e) {}
  try {
    const t = await gh(`/git/trees/${GH.inbox}?recursive=1`, {}, ghTok());
    const dirs = [...new Set(t.tree.filter(x => /^inbox\/[^/]+\/notes\.json$/.test(x.path)).map(x => x.path.split('/')[1]))].sort().reverse();
    const raw = p => `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.inbox}/${p}`;
    for (const d of dirs) {
      try { const n = await (await fetch(raw(`inbox/${d}/notes.json`))).json(); out.push({ ...n, url: raw(`inbox/${d}/${n.file}`), filed: false }); } catch (e) {}
    }
  } catch (e) { if (e.status !== 404) log('error', 'shared: ' + e.message); }
  return (shared = out);
}
// the ☁ Shared folder: each pack sent to the library, with its notes; tap to add it to My Sounds
async function drawShared(list) {
  const wait = document.createElement('p'); wait.className = 'note'; wait.textContent = 'Looking in the library…'; list.appendChild(wait);
  const items = await sharedItems(); if (!list.isConnected || bPath.at(-1)[1] !== 'shared') return;
  list.textContent = '';
  if (!items.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Nothing shared yet. In My Sounds, ☁ Send to the library sends a pack (with your notes) here, for every device.'; list.appendChild(p); }
  for (const x of items) {
    const b = document.createElement('button'), small = document.createElement('small');
    b.textContent = x.name;
    small.textContent = `${x.filed ? 'in the library' : 'in the inbox'} · ${x.sounds?.length ?? '?'} sound${x.sounds?.length === 1 ? '' : 's'}${x.set ? ' + a set' : ''}${x.about ? ' · ' + x.about : ''} · ${x.credit || ''}`;
    b.addEventListener('click', () => { if (confirm(`Add “${x.name}” to My Sounds${x.set ? ' (and its set to My sets)' : ''}?\n\n${x.about || ''}\n${x.credit || ''}${x.source ? '\nFrom: ' + x.source : ''}`)) addShared(x); });
    b.appendChild(small); list.appendChild(b);
  }
  const again = document.createElement('button'); again.textContent = '↻ Look again'; again.addEventListener('click', () => { shared = null; drawBrowser(); }); list.appendChild(again);
}
async function addShared(x) {
  status(`Getting “${x.name}”…`);
  try {
    const P = await (await fetch(x.url)).json(), r = await importPack(P);
    status(`“${x.name}” is in My Sounds (${r.sounds} sound${r.sounds === 1 ? '' : 's'})${r.set ? ' and My sets (Loops › ⚙)' : ''}.`);
  } catch (e) { status(`Could not get “${x.name}”: ${e.message}`); log('error', 'shared: ' + e.message); }
}

// ---------------------------------------------------------------------------
// ⏺ Loop rec: what you play over the beat (or the Loops), straight into a loop. It starts on the
// next bar (a bar to count in, if nothing was playing), records 1-8 bars and stops by itself.
//   Notes: the pads' taps, as Quantize puts them, kept as notes; heard, kept (made once into a
//   recording, by the export's engine) or opened as patterns to fix first.
//   Sound: the sound itself, sample for sample in time with the beat (an AudioWorklet taps the
//   mix): the pads alone (their own way into the mix, not the Loops grid's) or everything.
// Kept, it is a loop like ⟳ Make a loop's (My Sounds, its folder, My loops), in the Loops in the
// first empty cell of its column, playing on the next bar.
// ---------------------------------------------------------------------------
const LR_COLS = ['Guess from what I play', ...CHANNELS];
const LR_FOLDER = ['Beats', 'Beats', 'Beats', 'Bass', 'Chords', 'Lead', 'Sub and color', 'Vox and keys'];
const LR_PARTCOL = { Bass: 3, Sub: 6, Chords: 4, Lead: 5, 'Vox/Keys': 7, Pad: 4, 'Pluck/Arp': 5, 'Stab/FX': 6 };
LR_COLS.forEach((n, i) => $('lrCol').add(new Option(n, i - 1)));
let lrTake = null, lrMade = null, lrTimer = null, lrPv = null;
const lrLabel = () => {
  if (!lrTake) return '⏺ Loop';
  const now = ctx.currentTime, bar = 16 * stepDur();
  if (now < lrTake.t0) return `⏺ in ${Math.ceil((lrTake.t0 - now) / (bar / 4))}`;
  return `⏺ ${Math.min(lrTake.bars, Math.floor((now - lrTake.t0) / bar) + 1)}/${lrTake.bars}`;
};
function lrTap() {
  if (lrTake) { lrCancel('Loop rec stopped: nothing kept.'); return; }
  try { const L = JSON.parse(localStorage.getItem('pocketLoopRec') || '{}'); if (L.mode) { $('lrMode').value = L.mode; $('lrBars').value = L.bars; $('lrWhat').value = L.what; $('lrCol').value = L.col; } } catch (e) {}
  $('lrSet').hidden = false; $('lrAfter').hidden = true; $('lrWhatRow').hidden = $('lrMode').value !== 'sound'; $('lrBox').hidden = false;
}
$('lrMode').addEventListener('change', () => { $('lrWhatRow').hidden = $('lrMode').value !== 'sound'; });
$('lrCancel').addEventListener('click', () => { $('lrBox').hidden = true; });
function lrCancel(msg) {
  clearTimeout(lrTimer); clearInterval(lrTake?.tick); lrTake?.node?.port.postMessage({ cancel: true }); lrTake = null; draw(); if (msg) status(msg);
}
// the recorder in the audio thread: it keeps the samples from t0 to t1 (by the audio clock) and sends them over
const LR_WORKLET = `class LoopTap extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = e => { const d = e.data; if (d.start != null) { this.s0 = Math.round(d.start * sampleRate); this.s1 = Math.round(d.end * sampleRate); this.on = true; } if (d.cancel) this.on = false; }; }
  process(inputs) {
    if (!this.on) return true;
    const ch = inputs[0], L = ch[0]; if (!L) return true;
    const R = ch[1] || L, f0 = currentFrame, a = Math.max(0, this.s0 - f0), b = Math.min(L.length, this.s1 - f0);
    if (b > a) this.port.postMessage({ at: f0 + a - this.s0, L: L.slice(a, b), R: R.slice(a, b) });
    if (f0 + L.length >= this.s1) { this.port.postMessage({ done: true }); this.on = false; }
    return true;
  }
}
registerProcessor('loop-tap', LoopTap);`;
let lrModule = null;
async function lrTapNode(what) {
  lrModule ||= ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([LR_WORKLET], { type: 'application/javascript' })));
  await lrModule;
  const node = new AudioWorkletNode(ctx, 'loop-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
  const sink = ctx.createGain(); sink.gain.value = 0; node.connect(sink); sink.connect(ctx.destination);
  const from = what === 'all' ? [eng.master] : [eng.padsWet, eng.padsDry];
  for (const n of from) n.connect(node);
  node.unplug = () => { for (const n of from) try { n.disconnect(node); } catch (e) {} try { node.disconnect(); sink.disconnect(); } catch (e) {} };
  return node;
}
$('lrStart').addEventListener('click', async () => {
  const mode = $('lrMode').value, bars = +$('lrBars').value, what = $('lrWhat').value, col = +$('lrCol').value;
  try { localStorage.setItem('pocketLoopRec', JSON.stringify({ mode, bars, what, col })); } catch (e) {}
  $('lrBox').hidden = true; ctx.resume();
  let node = null;
  if (mode === 'sound') {
    if (!ctx.audioWorklet) { status('Recording the sound needs AudioWorklet, which this browser lacks: choose Notes instead.'); return; }
    try { node = await lrTapNode(what); } catch (e) { status('Could not start the recorder: ' + e.message); log('error', 'loop rec: ' + e.message); return; }
  }
  // the next bar, or (if the beat isn't playing) the second bar after Play: one to count in
  let b;
  if (!playing) { start(); resumeLoops(); b = { j: 16, when: nextT + 16 * stepDur() }; }
  else { b = nextBar(); if (b.when - ctx.currentTime < 0.25) b = { j: b.j + 16, when: b.when + 16 * stepDur() }; }
  const t1 = b.when + bars * 16 * stepDur();
  lrTake = { mode, bars, what, col, j0: b.j, t0: b.when, t1, bpm: S.bpm, swing: S.swing, key: { root: S.root, scale: S.scale }, notes: [], played: new Set(), node, chunks: [] };
  if (node) {
    const take = lrTake;
    node.port.onmessage = e => { if (e.data.done) { node.unplug(); if (lrTake === take) lrDone(); } else take.chunks.push(e.data); };
    node.port.postMessage({ start: b.when, end: t1 });
  } else lrTimer = setTimeout(lrDone, (t1 - ctx.currentTime) * 1000 + 120);
  lrTake.tick = setInterval(draw, 150);
  status(`⏺ Loop rec: ${bars} bar${bars > 1 ? 's' : ''}, from the next bar${mode === 'sound' ? (what === 'all' ? ', everything you hear' : ', the pads') : ', the notes you play'}. Tap ⏺ again to stop.`);
});
// a tap while it records (notes mode keeps it; sound mode notes which sounds were played, for the column)
function lrNote(key, h) {
  const T = lrTake; T.played.add(S.cur);
  if (T.mode !== 'notes') return;
  const sd = stepDur(), N = T.bars * 16;
  let pos = (h.at - T.t0) / sd, tk = h.tick != null && S.quantGrid ? h.tick - T.j0 : null;
  if (pos < -0.5 || pos >= N) return;
  pos = Math.max(0, pos); if (tk != null) tk = ((tk % N) + N) % N;
  const n = { s: S.cur, k: key, oc: octOf(S.cur), pos, tk, hold: isHeld(S.cur) };
  T.notes.push(n); if (n.hold) h.lr = n;
}
// the take's notes, made into a loop offline (the export's engine), tails folded back to the start
async function lrRender(T) {
  const sd = 60 / T.bpm / 4, len = T.bars * 16 * sd, tail = 2.5, sw = (2 * T.swing / 100 - 1) * sd;
  const off = new OfflineAudioContext(2, Math.ceil((len + tail) * SR), SR), e = new Engine(off, { live: false });
  for (const n of T.notes) {
    const at = n.tk != null ? n.tk * sd + (n.tk % 2 ? sw : 0) : n.pos * sd;
    const v = noteOn(e, n.s, n.k, at, modsFor(n.s, []), withOct(n.s, null, n.oc), n.hold, T.key);
    if (n.hold) v?.stop(at + (n.d ?? 1) * sd);
  }
  const buf = await off.startRendering(), m = Math.round(len * SR), out = new Float32Array(m);
  for (const c of [0, 1]) { const x = buf.getChannelData(c); for (let i = 0; i < x.length; i++) out[i % m] += x[i] / 2; }
  return out;
}
// the captured sound, as one mono loop exactly its bars long: 5 ms fades at the seam, so it never clicks
function lrJoin(T) {
  const m = Math.round((T.t1 - T.t0) * ctx.sampleRate), out = new Float32Array(m);
  for (const c of T.chunks) for (let i = 0; i < c.L.length; i++) { const j = c.at + i; if (j >= 0 && j < m) out[j] = (c.L[i] + c.R[i]) / 2; }
  const X = Math.min(Math.round(0.005 * ctx.sampleRate), m >> 2);
  for (let i = 0; i < X; i++) { const u = i / X; out[i] *= u; out[m - 1 - i] *= u; }
  return out;
}
async function lrDone() {
  const T = lrTake; clearInterval(T.tick); lrTake = null; draw();
  if (T.mode === 'notes' && !T.notes.length) { status('Loop rec: no notes were played, so there is nothing to keep.'); return; }
  status('Making the loop…');
  let data;
  try { data = T.mode === 'notes' ? await lrRender(T) : lrJoin(T); } catch (e) { status('Could not make the loop: ' + e.message); log('error', 'loop rec: ' + e.message); return; }
  let top = 0; for (const v of data) top = Math.max(top, Math.abs(v));
  if (top < 1e-4) { status('Loop rec: it was silent, so there is nothing to keep.'); return; }
  if (top > 0.98) for (let i = 0; i < data.length; i++) data[i] *= 0.98 / top;
  const rate = T.mode === 'notes' ? SR : ctx.sampleRate, buf = ctx.createBuffer(1, data.length, rate); buf.copyToChannel(data, 0);
  const sounds = [...(T.mode === 'notes' ? new Set(T.notes.map(n => n.s)) : T.played)];
  let col = T.col;
  if (col < 0) col = sounds.length && sounds.every(isDrum) ? 0 : LR_PARTCOL[PART[sounds.find(si => !isDrum(si)) ?? -1]] ?? (T.what === 'all' ? 4 : 5);
  lrMade = { T, buf, col };
  const what = T.mode === 'notes' ? `${T.notes.length} note${T.notes.length > 1 ? 's' : ''}` : T.what === 'all' ? 'everything you heard' : 'the pads';
  $('lrInfo').textContent = `${T.bars} bar${T.bars > 1 ? 's' : ''} at ${T.bpm} BPM: ${what}. Keep it and it goes in ${CHANNELS[col]} (and ${LR_FOLDER[col]} in the library).`;
  $('lrName').value = `${sounds.length === 1 ? S.slots[sounds[0]]?.name || 'Take' : sounds.every(isDrum) ? 'Beat' : 'Take'} ${T.bpm} BPM`;
  $('lrEdit').hidden = T.mode !== 'notes';
  $('lrSet').hidden = true; $('lrAfter').hidden = false; $('lrBox').hidden = false;
  status('The take is ready: hear it, keep it, or (notes) fix it as patterns.');
}
function lrStopPv() { try { lrPv?.stop(); } catch (e) {} lrPv = null; }
$('lrHear').addEventListener('click', () => {
  if (!lrMade) return; lrStopPv();
  const s = ctx.createBufferSource(); s.buffer = lrMade.buf; s.connect(eng.bus); s.start(playing ? nextBar().when : ctx.currentTime + 0.02); lrPv = s;
});
$('lrDrop').addEventListener('click', () => { lrStopPv(); lrMade = null; $('lrBox').hidden = true; status('The take is thrown away.'); });
$('lrKeep').addEventListener('click', async () => {
  if (!lrMade) return; lrStopPv();
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  const { T, buf, col } = lrMade, name = $('lrName').value.trim() || 'My take', folder = LR_FOLDER[col];
  const slot = { factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), trig: 'loop' }, buf, ...(col < 3 && { drumLoop: true }),
    slices: [{ s: 0, e: buf.duration, name, bpm: T.bpm, bars: T.bars }] };
  const id = 'm' + Date.now().toString(36);
  await idbPut('mine', { id, name, type: 'loop', folder, created: Date.now(), item: packSlot(slot) }, id);
  await refreshMine(); lrMade = null; $('lrBox').hidden = true; drawBrowser();
  // the first empty cell of its column; if that is full, of the next column with room (a drum take stays a drum: it is in Beats)
  let c = col, r = S.grid.cells[col].findIndex(x => !x);
  for (let i = 1; r < 0 && i < 8; i++) { c = (col + i) % 8; r = S.grid.cells[c].findIndex(x => !x); }
  if (r < 0) { status(`“${name}” is kept (Menu › Sounds › ${folder}, and My loops). The Loops grid is full: put it in a cell from there.`); return; }
  S.grid.cells[c][r] = { mine: id, k: 0, name, mode: 'loop', ...(c >= 3 && { follow: false }) };
  persist(); drawLoops(); warmGridSoon();
  if (playing) tapCell(c, r);
  status(`“${name}” is in the Loops (${CHANNELS[c]}, cell ${r + 1}${c !== col ? `: ${CHANNELS[col]} was full` : ''})${playing ? ', playing from the next bar' : ''}, and in the library (${folder}, My loops).`);
});
// ✎ Fix it as patterns: the notes into empty patterns, chained, to fix with the pads; then ⟳ Make a loop
$('lrEdit').addEventListener('click', () => {
  if (!lrMade) return; lrStopPv();
  const T = lrMade.T, free = [];
  for (let p = 0; p < 16 && free.length < T.bars; p++) if (S.patterns[p].every(st => !st.length)) free.push(p);
  if (free.length < T.bars) { status(`It needs ${T.bars} empty patterns, and there are only ${free.length}: clear some first.`); return; }
  checkpoint();
  for (const n of T.notes) {
    const j = n.tk != null ? n.tk : Math.floor(n.pos), o = n.tk != null ? 0 : Math.round((n.pos - j) * 1000) / 1000;
    S.patterns[free[Math.floor(j / 16)]][j % 16].push({ s: n.s, k: n.k, ...(n.oc && { oc: n.oc }), ...(o > 0.01 && { o }), ...(n.hold && n.d && { d: S.quantGrid ? Math.max(1, Math.round(n.d)) : Math.round(n.d * 100) / 100 }) });
  }
  S.chain = free; S.pat = free[0]; lrMade = null; $('lrBox').hidden = true; dirty(); draw();
  status(`The take is in pattern${free.length > 1 ? 's' : ''} ${free.map(p => p + 1).join(', ')}, chained. Fix any note, then ⟳ Make a loop to keep it.`);
});

// ---------------------------------------------------------------------------
// Design (Menu › Design): drum hits and synths of your own (design.js), made once and kept as
// recordings, in My Sounds and in kits of yours, like any sound.
// ---------------------------------------------------------------------------
const dz = { sp: {} };
const dzNote = f => { const m = Math.round(DZ.noteOf(f)); return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`; };
const dzFmt = (k, v) => (k.key === 'kind' ? (v < 0.5 ? '808' : 'cymbal') : k.key === 'material' ? ['wood', 'metal', 'glass'][Math.round(v)]
  : k.key === 'ftype' ? ['low', 'band', 'high'][Math.round(v)] : /^wave/.test(k.key) ? ['sine', 'tri', 'saw', 'square'][Math.round(v)] : k.key === 'reverse' ? (v >= 0.5 ? 'on' : 'off')
  : ['pitch', 'tune', 'knockf'].includes(k.key) && k.unit === 'Hz' ? `${Math.round(v)} Hz ${dzNote(v)}`
  : `${v >= 100 ? Math.round(v) : +(+v).toFixed(k.step < 0.01 ? 3 : k.step < 1 ? 2 : 0)}${k.unit && k.unit !== '×' ? ' ' + k.unit : k.unit}`);
function dzKnobs(box, knobs, vals, changed) {
  for (const k of knobs) {
    const row = document.createElement('div'); row.className = 'row';
    const id = 'dzk_' + Math.random().toString(36).slice(2, 8), lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = k.label;
    const r = document.createElement('input'); r.type = 'range'; r.id = id; r.min = k.lo; r.max = k.hi; r.step = k.step; r.value = vals[k.key];
    const o = document.createElement('output'); o.textContent = dzFmt(k, vals[k.key]);
    r.addEventListener('input', () => { vals[k.key] = +r.value; o.textContent = dzFmt(k, +r.value); changed?.(); });
    row.append(lab, r, o); box.appendChild(row);
  }
}
let dzVoice = null;
function dzPlay(b, at = ctx.currentTime + 0.01) { ctx.resume(); try { dzVoice?.stop(); } catch (e) {} const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 0.6; s.buffer = b; s.connect(g); g.connect(eng.bus); s.start(at); return (dzVoice = s); }
// the room: the meeting room's recording (Aalto University, CC BY 4.0, as the reverbs), baked into a hit
let roomIR = null;
async function withRoom(x, amt) {
  roomIR ||= fetch('sounds/reverbs/room.wav').then(r => r.arrayBuffer()).then(ab => new OfflineAudioContext(1, 1, DZ.SR).decodeAudioData(ab));   // at the designer's rate, whatever the device's
  const ir = await roomIR, off = new OfflineAudioContext(1, x.length + ir.length, DZ.SR), src = off.createBufferSource(), b = off.createBuffer(1, x.length, DZ.SR);
  b.copyToChannel(x, 0); src.buffer = b;
  const cv = off.createConvolver(), wet = off.createGain(); cv.buffer = ir; wet.gain.value = amt * 0.8;
  src.connect(off.destination); src.connect(cv); cv.connect(wet); wet.connect(off.destination); src.start(0);
  const y = (await off.startRendering()).getChannelData(0);
  let top = 0; for (const v of y) top = Math.max(top, Math.abs(v));
  let n = y.length; while (n > 1 && Math.abs(y[n - 1]) < top * 0.001) n--;
  const out = y.slice(0, n), f = Math.min(n, Math.round(0.005 * DZ.SR)); for (let i = 0; i < f; i++) out[n - 1 - i] *= i / f;
  for (let i = 0; i < n; i++) out[i] *= 0.9 / (top || 1);
  return out;
}
// The drum designer, built into a box: in Menu › Design, and in a Loops cell's 🥁 Design tab. Returns its
// state, and the hit as it is now (a buffer).
const DZ_PITCH = { kick: 'pitch', snare: 'tune', tom: 'pitch', perc: 'pitch' };
function drumDesigner(box, onChange = () => {}) {
  const st = { kind: 'kick', p: {}, f: { ...DZ.FINISH_DEFAULT }, seed: 1, name: '', layer: '' };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  const row = (label, control) => { const r = el('div', 'row'), l = el('label', null, label); r.append(l, control, el('span')); return r; };
  const kind = document.createElement('select'); for (const [k, D] of Object.entries(DZ.DRUMS)) kind.add(new Option(D.name, k));
  const layer = document.createElement('select'); layer.add(new Option('none', '')); for (const [v, l] of DZ.LAYERS) layer.add(new Option(l, v));
  const pre = el('div', 'dzpresets'), knobs = el('div'), fin = el('div'), btns = el('div', 'btns');
  const hear = el('button', 'go', '▶ Hear it'), dice = el('button', null, '🎲 Surprise'), strike = el('button', null, '↻ New strike'), key = el('button', null, '♪ In key');
  strike.title = 'The same knobs, a new strike'; key.title = 'Tune it to the nearest note of the key';
  btns.append(hear, dice, strike, key);
  box.textContent = '';
  box.append(row('Drum', kind), pre, knobs, el('div', 'dzgroup', 'Finish'), row('Layer', layer), fin, btns);
  const draw = () => {
    const D = DZ.DRUMS[st.kind]; pre.textContent = ''; knobs.textContent = ''; fin.textContent = '';
    for (const [name, v] of Object.entries(D.presets)) {
      const b = el('button', null, name); b.addEventListener('click', () => { st.p = { ...v }; st.name = name; draw(); api.hear(); }); pre.appendChild(b);
    }
    dzKnobs(knobs, D.knobs, st.p, onChange); dzKnobs(fin, DZ.FINISH, st.f, onChange);
    kind.value = st.kind; layer.value = st.layer; key.hidden = !DZ_PITCH[st.kind];
  };
  const api = {
    st,
    setKind(k) { st.kind = k; const [name, v] = Object.entries(DZ.DRUMS[k].presets)[0]; st.p = { ...v }; st.name = name; draw(); },
    async buffer() {
      let x = DZ.renderDrum(st.kind, st.p, st.seed, st.f, st.layer || null);
      if (st.f.room > 0) x = await withRoom(x, st.f.room);
      const b = ctx.createBuffer(1, x.length, DZ.SR); b.copyToChannel(x, 0); return b;
    },
    async hear() { dzPlay(await api.buffer()); },
    name() { return `${st.name && st.name !== 'Surprise' ? st.name + ' ' : 'My '}${DZ.DRUMS[st.kind].name.toLowerCase()}`.replace(/^(\w)/, c => c.toUpperCase()); },
  };
  kind.addEventListener('change', () => { api.setKind(kind.value); api.hear(); onChange(); });
  layer.addEventListener('change', () => { st.layer = layer.value; if (st.layer && st.f.layermix === 0) st.f.layermix = 0.5; draw(); api.hear(); onChange(); });
  hear.addEventListener('click', () => api.hear());
  dice.addEventListener('click', () => { st.seed = (Math.random() * 1e9) | 0; st.p = DZ.surprise(st.kind, st.seed); st.name = 'Surprise'; draw(); api.hear(); onChange(); });
  strike.addEventListener('click', () => { st.seed = (Math.random() * 1e9) | 0; api.hear(); onChange(); });
  key.addEventListener('click', () => {
    const pk = DZ_PITCH[st.kind]; if (!pk) return;
    const k = DZ.DRUMS[st.kind].knobs.find(x => x.key === pk), f = Math.min(k.hi, Math.max(k.lo, DZ.inKey(st.p[pk], S.root, SCALES[S.scale] || SCALES.minor)));
    st.p[pk] = f; draw(); api.hear(); onChange();
    status(`Tuned to ${dzNote(f)}, in ${NOTE_NAMES[S.root]} ${S.scale}.`);
  });
  api.setKind('kick');
  return api;
}
const mainDrum = drumDesigner($('dzDrumUI'));
// a hit as a sound: one slice, as a kit's
const hitSlot = (b, name) => ({ factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), vol: 0.5 }, buf: b, made: 'MINE', slices: [{ s: 0, e: b.duration, name }] });
function dzKits() {
  const sel = $('dzKit'), was = sel.value; sel.textContent = '';
  sel.add(new Option('New kit…', ''));
  for (const m of mine.filter(m => m.type === 'pack')) sel.add(new Option(`${m.name} (${m.item.slices?.length || 0})`, m.id));
  if ([...sel.options].some(o => o.value === was)) sel.value = was;
}
$('dzAdd').addEventListener('click', async () => {
  if (!db) { status('Saving needs this browser’s storage, which is not available here.'); return; }
  const name = prompt('Name the hit:', mainDrum.name()); if (!name?.trim()) return;
  const b = await mainDrum.buffer(), id = $('dzKit').value;
  let kit;
  if (!id) {
    const kn = prompt('Name the new kit:', 'My kit'); if (!kn?.trim()) return;
    kit = { id: 'm' + Date.now().toString(36), name: kn.trim(), type: 'pack', created: Date.now(), slot: { factory: null, kind: 'chop', contiguous: false, name: kn.trim(), params: { ...defParams(), vol: 0.5 }, buf: null, slices: [] } };
  } else {
    const m = mine.find(x => x.id === id); kit = { ...m, slot: unpackSlot(m) };
    if (kit.slot.slices.length >= 16) { status(`${m.name} is full: 16 sounds. Choose another kit, or New kit.`); return; }
  }
  kit.slot.slices.push({ s: 0, e: b.duration, name: name.trim(), buf: b });
  const { slot, ...rec } = kit;
  await idbPut('mine', { ...rec, item: packSlot(slot) }, rec.id); await refreshMine(); dzKits(); $('dzKit').value = rec.id;
  status(`"${name.trim()}" is in ${rec.name} (${slot.slices.length} of 16). Load the kit on a drum sound (9–16), from Menu › Sounds › My packs.`);
});
$('dzSave').addEventListener('click', async () => { await saveMine(hitSlot(await mainDrum.buffer(), mainDrum.name()), mainDrum.name()); dzKits(); });
// the synth
for (const name of Object.keys(DZ.SYNTH_PRESETS)) $('dzSPreset').add(new Option(name, name));
for (const [m, l] of DZ.REGISTERS) $('dzReg').add(new Option(l, m));
function dzDrawSynth() {
  const box = $('dzSKnobs'); box.textContent = '';
  for (const [group, knobs] of DZ.SYNTH_KNOBS) { const h = document.createElement('div'); h.className = 'dzgroup'; h.textContent = group; box.appendChild(h); dzKnobs(box, knobs, dz.sp); }
  $('dzReg').value = dz.sp.register;
}
function dzSetSynth(name) { dz.sp = { ...DZ.SYNTH_PRESETS[name] }; dz.sname = name; $('dzSPreset').value = name; dzDrawSynth(); }
$('dzSPreset').addEventListener('change', () => { dzSetSynth($('dzSPreset').value); dzSHear(); });
$('dzReg').addEventListener('change', () => { dz.sp.register = +$('dzReg').value; dzSHear(); });
// ▶ Hear it: one note of it (the middle of its range), as an instrument of a single zone, tapped then held
async function dzSHear() {
  const p = { ...dz.sp }, one = await DZ.renderSynth({ ...p, _only: true }, () => {}).catch(e => { status(e.message); return null; });
  if (!one) return;
  const b = ctx.createBuffer(1, one.data.length, DZ.SR); b.copyToChannel(one.data, 0);
  const z = one.zones[0], t = ctx.currentTime + 0.02;
  const s1 = ctx.createBufferSource(); s1.buffer = b; const g = ctx.createGain(); g.gain.value = 0.7; s1.connect(g); g.connect(eng.bus); s1.start(t, z.s, z.e - z.s);
  const s2 = ctx.createBufferSource(); s2.buffer = b; s2.loop = true; s2.loopStart = z.ls; s2.loopEnd = z.le; s2.connect(g);
  const at2 = t + z.e - z.s + 0.15; s2.start(at2, z.hs); s2.stop(at2 + 2.2);
}
$('dzSHear').addEventListener('click', dzSHear);
$('dzSDice').addEventListener('click', () => {
  const names = Object.keys(DZ.SYNTH_PRESETS), base = DZ.SYNTH_PRESETS[names[(Math.random() * names.length) | 0]], p = { register: base.register };
  for (const [, knobs] of DZ.SYNTH_KNOBS) for (const k of knobs) { const v = base[k.key] + (Math.random() - 0.5) * (k.hi - k.lo) * 0.35; p[k.key] = Math.min(k.hi, Math.max(k.lo, k.step >= 1 ? Math.round(v) : v)); }
  dz.sp = p; dz.sname = 'Surprise'; dzDrawSynth(); dzSHear();
});
// the whole instrument, recorded: a slot like the app's recorded synths
async function dzInstrument() {
  status('Recording the instrument: a note every 6 half steps…');
  const r = await DZ.renderSynth({ ...dz.sp }, f => status(`Recording the instrument… ${Math.round(f * 100)}%`));
  const b = ctx.createBuffer(1, r.data.length, DZ.SR); b.copyToChannel(r.data, 0);
  const name = `${dz.sname && dz.sname !== 'Surprise' ? dz.sname : 'My synth'}`;
  return { factory: null, kind: 'multi', name, params: { ...defParams(), vol: 0.5, trig: 'gate' }, buf: b, base: r.base, zones: r.zones, holdLoop: true, made: 'MINE' };
}
$('dzSLoad').addEventListener('click', async () => {
  const si = S.cur < 8 ? S.cur : 0, sl = await dzInstrument();
  checkpoint(); S.slots[si] = sl; S.cur = si; S.lastKey[si] = 0; syncPanel(); dirty(); draw();
  status(`${sl.name} → sound ${si + 1}: play it on the keys (Gate holds the notes). ★ Save keeps it in My Sounds.`);
  noteOn(eng, si, 0, ctx.currentTime + 0.02);
});
$('dzSSave').addEventListener('click', async () => { const sl = await dzInstrument(); await saveMine(sl, sl.name); });
document.querySelectorAll('[data-dz]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-dz]').forEach(x => x.classList.toggle('on', x === b));
  $('dzDrum').hidden = b.dataset.dz !== 'drum'; $('dzSynth').hidden = b.dataset.dz !== 'synth';
}));
dzSetSynth('Warm pad');
document.querySelector('[data-tab="tDesign"]').addEventListener('click', () => { dzKits(); $('dzSLoad').textContent = `Put on sound ${S.cur < 8 ? S.cur + 1 : 1}`; });

Object.assign(window.pocketDebug, {     // for testing the grid from the browser console
  grid: () => gcol.map((col, i) => ({ c: Math.floor(i / ROWS), cur: col.cur && { r: col.cur.r, at: col.cur.at, j: col.cur.j, stopAt: col.cur.stopAt ?? null, synced: col.cur.synced, gain: col.cur.g.gain.value },
    next: col.next && { r: col.next.r, at: col.next.at, j: col.next.j }, gate: col.gate && { r: col.gate.r } })).filter(x => x.cur || x.next || x.gate),
  openCellMenu: (c, r) => openCellMenu(c, r),
  press: k => press(k), release: k => release(k),
  state: () => S,
  lrData: () => { if (!lrMade) return null; const d = lrMade.buf.getChannelData(0), u = new Uint8Array(d.buffer.slice(0)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), sr: lrMade.buf.sampleRate }; },
  cellData: async (c, r) => { const sl = await cellSlot(S.grid.cells[c][r]), x = sl.slices[0], d = x.buf.getChannelData(0).slice(Math.round(x.s * x.buf.sampleRate), Math.round(x.e * x.buf.sampleRate)), u = new Uint8Array(d.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), sr: x.buf.sampleRate }; }, lr: () => lrTake && { t0: lrTake.t0, t1: lrTake.t1, notes: lrTake.notes.length, chunks: lrTake.chunks.length }, lrMade: () => lrMade && { dur: lrMade.buf.duration, col: lrMade.col, rate: lrMade.buf.sampleRate, hits: (() => {      // where each note starts (10 ms frames, a jump of 8 dB)
    const x = lrMade.buf.getChannelData(0), F = Math.round(lrMade.buf.sampleRate / 100), e = []; let top = 0;
    for (let f = 0; f * F < x.length; f++) { let q = 0; for (let i = f * F; i < Math.min(x.length, (f + 1) * F); i++) q += x[i] * x[i]; e.push(Math.sqrt(q / F)); top = Math.max(top, e.at(-1)); }
    return e.map((v, f) => (f > 0 && v > top * 0.05 && v > e[f - 1] * 2.5 ? +(f / 100).toFixed(2) : null)).filter(v => v != null); })() },
  gains: () => S.grid.vol.map((v, c) => +colChain(c).out.gain.value.toFixed(2)), now: () => ctx.currentTime, cells: () => S.grid,
  cellSlot: async (c, r) => { const sl = await cellSlot(S.grid.cells[c][r]); const x = sl.slices[0]; return { s: x.s, e: x.e, bpm: x.bpm, bars: x.bars, pitch: sl.params.pitch, nostretch: sl.params.nostretch, keyOf: sl.params.keyOf }; },
  // drums and the key: is sound si a drum, and a fingerprint of one note of it as rendered (the same in every key, for a drum)
  drum: si => drumSound(S.slots[si]),
  // tools/bake_sounds.js: one note of a synth, or a code-made kit, rendered (raw float32, base64), to be kept as WAV
  bakeNote: async (id, midi, held, secs, rate) => {
    const F = LIBRARY[id], off = new OfflineAudioContext(1, Math.ceil(secs * rate), rate), e = new Engine(off, { live: false });
    const slot = { kind: 'synth', synth: { ...F.synth }, params: { ...defParams(), vol: 1, len: F.len, trig: held ? 'gate' : 'oneshot' } };
    playNote(e, slot, -1, 0, 0, { bpm: 120, root: midi - F.synth.root, scale: 'minor', hold: held, dest: off.destination });
    return b64f((await off.startRendering()).getChannelData(0));
  },
  lib: id => LIBRARY[id],
  // a sound through each space in turn, for listening to them (raw stereo float32, base64)
  spaceDemo: async (lib, k, secs) => {
    const base = await slotOf({ lib }), out = [];
    for (const [id] of SPACES) {
      await loadSpace(id);
      const off = new OfflineAudioContext(2, Math.ceil(secs * SR), SR), e = new Engine(off, { live: false });
      const sl = { ...base, params: { ...base.params, vol: 0.5, fx: { type: 'reverb', amt: 0.7 } } };
      playNote(e, sl, -1, k, 0.05, { scale: 'minor', bpm: 120, root: 0 });
      const b = await off.startRendering(); out.push([b64f(b.getChannelData(0)), b64f(b.getChannelData(1))]);
    }
    await loadSpace(); return out;
  },
  // what comes out of the speakers for a while (raw float32 base64), for testing what plays
  capture: secs => new Promise(ok => {
    const n = Math.round(secs * ctx.sampleRate), out = new Float32Array(n); let at = 0;
    const sp = ctx.createScriptProcessor(4096, 1, 1); eng.master.connect(sp); sp.connect(ctx.destination);
    sp.onaudioprocess = e => { const d = e.inputBuffer.getChannelData(0); out.set(d.subarray(0, Math.min(d.length, n - at)), at); at += d.length; if (at >= n) { sp.disconnect(); eng.master.disconnect(sp); ok({ rate: ctx.sampleRate, b64: b64f(out) }); } };
  }),
  // a loop stretched both ways, for comparing: [as recorded, stretched (WSOLA), beat sliced], raw float32 base64
  stretchTest: async (lib, k, bpm) => {
    const sl = await slotOf({ lib }), x = sl.slices[k], buf = x.buf || sl.buf, f = (x.bpm || sl.bpm) / bpm, r = buf.sampleRate;
    const o = buf.getChannelData(0).slice(Math.round(x.s * r), Math.round(x.e * r));
    const [w, d] = [await stretchLoop(buf, x.s, x.e, f, 0), await stretchLoop(buf, x.s, x.e, f, x.bpm || sl.bpm)];
    return { rate: r, bpm: x.bpm, name: x.name, f, bufs: [o, w.getChannelData(0), d.getChannelData(0)].map(b64f) };
  },
  heldLevels: async (si, k, trig) => { const off = new OfflineAudioContext(1, SR * 4, SR), e = new Engine(off, { live: false }); const sl = { ...S.slots[si], params: { ...S.slots[si].params, trig } };
    const v = playNote(e, sl, si, k, 0, { scale: S.scale, bpm: S.bpm, root: 0, hold: true, dest: off.destination }); v.stop(3); const d = (await off.startRendering()).getChannelData(0);
    return [0.5, 1, 1.5, 2, 2.5, 2.9, 3.2].map(t => { let m = 0; for (let i = Math.round(t * SR); i < Math.round((t + 0.05) * SR); i++) m = Math.max(m, Math.abs(d[i])); return +m.toFixed(3); }); },
  noteSumRaw: async (si, k) => { const off = new OfflineAudioContext(1, SR * 4, SR), e = new Engine(off, { live: false }); playNote(e, S.slots[si], si, k, 0, { scale: S.scale, bpm: S.bpm, root: 0, dest: off.destination }); return (await off.startRendering()).getChannelData(0); },
  bakeKit: async name => (await makeKit(name)).map(d => ({ name: d.name, rate: d.buf.sampleRate, b64: b64f(d.buf.getChannelData(0)) })),
  noteSum: async (si, k) => { const b = await renderNote(si, k), d = b.getChannelData(0); let z = 0; for (let i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) z++; return { len: d.length, z }; },
  alone: async (lib, k, si) => { const src = await slotOf({ lib }); S.slots[si] = sliceAlone(src, k, src.slices[k].name); draw(); return S.slots[si].name; },
  setRoot: r => { S.root = r; draw(); },
  eng: () => eng,
  // the loop-set tool: load a song (as songs.py writes them) and render it as one seamless loop
  // tools/render_loops.js: a line said by the robot voice, as a robot cell says it (raw float32, base64)
  say: async (text, V) => {
    const buf = await makeVoice(text, V.gap, V.pitch, V), m = buf.getChannelData(0), b = new Uint8Array(m.buffer.slice(0)); let str = '';
    for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return { b64: btoa(str), n: m.length, sr: buf.sampleRate };
  },
  renderSong: async P => {
    S.muteBeat = false; await loadSong(null, P);
    const m = await renderLoop(true), b = new Uint8Array(m.buffer); let str = '';
    for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return { b64: btoa(str), n: m.length, sr: SR };
  },
  peak: (ms = 800) => new Promise(ok => {      // the loudest the master output got, over ms
    const d = new Float32Array(scope.fftSize); let m = 0;
    const id = setInterval(() => { scope.getFloatTimeDomainData(d); for (const v of d) m = Math.max(m, Math.abs(v)); }, 15);
    setTimeout(() => { clearInterval(id); ok(+m.toFixed(3)); }, ms);
  }),
  colFx: c => { const k = eng.cols?.[c]; return k && { type: k.type, ins: k.ins?.constructor.name, send: !!k.send }; } });

draw();
load().then(() => { status('Ready. Press ▶ Play, or tap the keys.'); if (gridAgain) loadSet(gridAgain, true); });
requestAnimationFrame(frame);
