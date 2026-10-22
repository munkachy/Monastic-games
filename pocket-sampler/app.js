// Pocket Sampler: a 16-key sampler and step sequencer in the manner of a
// pocket drum machine. Sounds 1-8 are melodic, 9-16 are kits and chops.
// State is saved in IndexedDB, so recordings and patterns survive a reload.
// Bump ?v= on app.js (index.html), audio.js (here) and the front-page link
// with each release, so phones fetch the new files instead of cached ones.
import { Engine, playNote, makeKit, blessMe, prepare, onsets, keySemis, findKey, toKey, syllables, stretchLoop, loopStretch, SCALES, FAMILIES, WOBBLE_RATES, SR } from './audio.js?v=20261022y';

const $ = id => document.getElementById(id);
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const capture = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
// The audio engine. It can be thrown away and built again (rebuildAudio) if
// the phone leaves it stuck; recorded sound lives in AudioBuffers, which don't
// belong to any one engine, so nothing is lost.
let ctx, eng, engReady, scope;
function makeAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  eng = new Engine(ctx);
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
let clockA = ctx.currentTime, clockW = performance.now(), outLat = -1, frozen = 0;
setInterval(() => {
  const a = ctx.currentTime, w = performance.now(), dA = a - clockA, dW = (w - clockW) / 1000;
  if (ctx.state === 'running' && dW > 0.3) {
    if (dA < dW - 0.03) log('glitch', `audio clock fell ${((dW - dA) * 1000).toFixed(0)} ms behind in ${dW.toFixed(1)} s (the phone dropped sound)`);
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
  ambience: { name: 'Vinyl & Ambience', bank: 'ambience' },
};
const DEFAULT = ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir',
  'acoustic', 'kit808', 'kit909', 'percussion', 'blips', 'lasers', 'glitch', 'coins'];
// The first version saved sounds by number, in this order.
const OLD_ORDER = ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir',
  'kit808', 'kit909', 'hits', 'blips', 'lasers', 'glitch', 'coins', 'robots'];
const defParams = () => ({ vol: 0.8, pitch: 0, filter: 0, res: 0, start: 0, len: 1, choke: false, trig: 'oneshot' });
let banks = null;
const kitCache = {};

async function factorySlot(id) {
  const F = LIBRARY[id], slot = { factory: id, name: F.name, params: defParams() };
  if (F.synth) Object.assign(slot, { kind: 'synth', synth: { ...F.synth } }), slot.params.len = F.len;
  else if (F.multi) return multiSlot(slot, F);
  else if (F.kit) {
    kitCache[F.kit] ||= await makeKit(F.kit);
    Object.assign(slot, { kind: 'chop', slices: kitCache[F.kit].map(d => ({ buf: d.buf, s: 0, e: d.buf.duration, name: d.name })) });
  } else {
    if (!banks) banks = await (await fetch('sounds/banks.json')).json();
    const B = banks[F.bank];
    B.buf ||= await decode(await (await fetch(`sounds/${F.bank}.wav`)).arrayBuffer());
    const r = B.rate || 22050;
    Object.assign(slot, { kind: 'chop', buf: B.buf, slices: B.slices.map(([a, b], k) => ({ s: a / r, e: b / r, name: shortName(B.from[k]),
      ...(B.loops?.[k] && { bpm: B.loops[k][0], bars: B.loops[k][1] }) })) });
    if (B.loops) slot.params.trig = 'loop';          // a pack of loops: each key loops until tapped again
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
  return Object.assign(slot, { kind: 'multi', buf: B.buf, base: F.base,
    zones: B.zones.map(([m, a, b, la, lb]) => ({ m, s: a / r, e: b / r, ...(la != null && { ls: la / r, le: lb / r }) })) });
  return slot;
}
const shortName = s => s.replace(/^sfx_/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18);
function decode(ab) { return new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad)); }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
// The first version's 16 effects, in key order (old saved patterns used these numbers).
const DEFAULT_SLOTS = ['loop4', 'loop8', 'loop16', 'roll32', 'scratch', 'half', 'scramble', 'dive',
  'octup', 'octdown', 'reverse', 'chorus', 'crush', 'lowpass', 'reverb', 'pingpong'];
const DEFAULT_CUSTOM_IDS = ['mute', 'export', 'roll', 'beat',      // the four small buttons, at first
  'octdown', 'octup', 'key', 'nextkey', 'rap', 'newflow', 'hearrap', 'chain'];   // and the eight under the keys
const S = {
  slots: [], cur: 0, lastKey: new Array(16).fill(0), mode: 'play',
  patterns: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [])),
  fx: Array.from({ length: 16 }, () => new Array(16).fill(null)),   // effects saved on steps
  patKeys: new Array(16).fill(null),
  oct: new Array(16).fill(0),          // each sound's octave for the keys you play (−2 to +2); saved with what you record   // a key saved in a pattern ({ root, scale }), or null: it plays in whatever key is set
  custom: [...DEFAULT_CUSTOM_IDS], pat: 0, chain: [0], bpm: 120, swing: 50, scale: 'minor', root: 0, vol: 0.9, quantGrid: 1, fxTarget: 'all', fxAmt: {}, fxSlots: [...DEFAULT_SLOTS], fxLatch: true, write: false, replace: false,
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
  stopGrid();                 // and the Loops grid
  draw();
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
      if (S.muteBeat && isDrum(n.s)) continue;
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
function noteOn(e, si, k, when, m = null, lock = null, hold = false, key = null, phase = 0) {
  const slot = S.slots[si]; if (!slot) return null;
  key ??= keyAt(when);
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
function openWheel() {
  const w = $('wheel'), keys = $('keys'), dev = keys.parentElement;
  w.hidden = false;
  w.style.top = keys.offsetTop + 'px';
  w.style.minHeight = (dev.clientHeight - keys.offsetTop - 8) + 'px';
  drawWheel();
}
buildWheel();
$('keyBtn').addEventListener('click', () => ($('wheel').hidden ? openWheel() : ($('wheel').hidden = true)));
$('wheelClose').addEventListener('click', () => { $('wheel').hidden = true; });
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
function engageFx(k, aim = 'all') {
  const f = FX[k][1]; activeFx.add(k); fxAim.set(k, aim); lastFx = k; ctx.resume();
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
for (let k = 0; k < 16; k++) {
  const b = document.createElement('button'); b.className = 'key';
  b.innerHTML = `<q class="wash"></q><u class="fill"></u><b>${k + 1}</b><span></span><i></i>`;
  b.addEventListener('pointerdown', ev => { ev.preventDefault(); capture(b, ev); press(k); });
  const up = () => release(k);
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
      else engageFx(id, S.fxTarget === 'all' ? 'all' : new Set(S.fxTarget));
      break;
    }
    default: {
      if (S.write && !playing) { toggleStep(k); break; }
      const key = padKey(k); if (key == null) break;     // a rap's pad with no syllable on its step
      const h = trigger(key, k);
      if (S.write && h) h.note = recordLive(key, h.tick);
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
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.mode;
  S.mode = S.mode === m ? 'play' : m;
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
$('play').addEventListener('click', () => playing ? stop() : start());
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
    const slot = { factory: null, kind: 'sample', name: `Rolled ${b.family}`, params: defParams(), buf: b };
    S.slots[si] = slot; S.lastKey[si] = 7;
    noteOn(eng, si, 7, ctx.currentTime + 0.01);
  } else {
    let slot = S.slots[si];
    if (all || slot.kind !== 'chop') {
      slot = { factory: null, kind: 'chop', name: `Rolled ${fam || 'kit'}`, params: defParams(), slices: [] };
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
  $('keyOfRow').style.display = sl.kind === 'sample' || sl.kind === 'chop' ? '' : 'none';
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
const TREE = ['Sounds', [
  ['Hits', [
    ['Bass', ['bass808', 'subsine', 'wobble', 'growl', 'reese', 'sawbass', 'sqbass', 'fmbass', 'acid', 'uprightbass', 'elecbass', 'contrabass']],
    ['Keys', ['piano', 'upright', 'rhodes', 'epiano', 'harpsichord', 'pipeorgan', 'renorgan', 'organ', 'celeste']],
    ['Guitars', ['gretsch', 'hofner', 'emily', 'nylon', 'steelgtr', 'twelve']],
    ['Strings', ['violin', 'viola', 'cello', 'contrabass', 'pizz', 'harp']],
    ['Brass and wind', ['trumpet', 'trombone', 'tenorsax']],
    ['Voices', ['choirmen', 'choirwomen', 'choir']],
    ['Bells and mallets', ['bells', 'vibes', 'marimba', 'xylophone', 'glock', 'kalimba', 'steeldrum']],
    ['Synth', ['supersaw', 'strings', 'pad', 'brass', 'choir', 'fmbell', 'glass', 'chip', 'pluck']],
  ]],
  ['Loops', [
    ['Drum loops', ['drumloops']],
    ['Breakbeats', ['breaks']],
    ['Vinyl and ambience', ['ambience']],
  ]],
  ['Packs', [
    ['Percussion', ['percussion', 'bells2', 'shakers']],
    ['Vocals', ['hype', 'robotvox', 'vocchops']],
    ['Ambient', ['nature', 'airwater']],
    ['FX', ['arcade', 'machines', 'noisefx', 'sirens']],
    ['Synth and horns', ['stabs', 'basshits', 'pads', 'funkhorns']],
    ['Video game', ['hits', 'blips', 'lasers', 'glitch', 'coins', 'robots']],
    ['Songs', 'songs'],
    ['My packs', 'mine:pack'],
  ]],
  ['My Sounds', 'mine:all'],
]];
const EMPTY = { Songs: 'No songs yet: the songs Claude builds for you will be here.', Loops: 'Loops come in a later build: drum loops and more, stretched to your tempo and key.',
  'My Sounds': 'Nothing saved yet. ★ Save to My Sounds (in Settings or the editor) keeps a sound here; ⬆ Import brings in a file.',
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
  if (it === 'mine:all') return mine.map(m => ({ mine: m }));
  if (it === 'mine:pack') return mine.filter(m => m.type === 'pack').map(m => ({ mine: m }));
  if (it === 'songs') return SONGS.map(x => ({ song: x }));
  if (node.contents) return node.contents;
  return it.map(x => (Array.isArray(x) ? x : { lib: x }));
}
function drawBrowser() {
  const crumbs = $('crumbs'); crumbs.textContent = '';
  bPath.forEach((node, i) => {
    if (i) crumbs.append(' › ');
    const b = document.createElement('button'); b.textContent = node[0];
    b.addEventListener('click', () => { bPath = bPath.slice(0, i + 1); bSel = null; drawBrowser(); });
    crumbs.appendChild(b);
  });
  const node = bPath[bPath.length - 1], items = itemsOf(node), list = $('blist'); list.textContent = '';
  if (!items.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = EMPTY[node[0]] || 'Nothing here yet.'; list.appendChild(p); }
  for (const it of items) {
    const b = document.createElement('button'), small = document.createElement('small');
    if (Array.isArray(it)) {
      b.textContent = '▸ ' + it[0];
      const n = typeof it[1] === 'string' ? (it[1] === 'songs' ? SONGS.length : it[1] === 'mine:pack' ? mine.filter(m => m.type === 'pack').length : mine.length) : count(it);
      small.textContent = n ? `${n}` : '';
      b.addEventListener('click', () => { bPath.push(it); bSel = null; drawBrowser(); });
    } else {
      b.textContent = selName(it).replace(/ \(from .*\)$/, '');
      small.textContent = it.song ? it.song.about : it.k != null ? `key ${it.k + 1}`
        : it.mine ? (it.mine.type === 'pack' ? `pack · ${it.mine.item.slices?.length || 0} sounds` : 'my sound')
        : selPack(it) ? 'pack' : 'instrument';
      b.classList.toggle('sel', !!bSel && same(bSel, it));
      b.addEventListener('click', () => { bSel = it; drawBrowser(); preview(it); });
    }
    b.appendChild(small); list.appendChild(b);
  }
  // tools for the place you're in
  const tools = $('bTools'); tools.textContent = '';
  const tool = (label, fn, go) => { const b = document.createElement('button'); b.textContent = label; if (go) b.className = 'go'; b.addEventListener('click', fn); tools.appendChild(b); };
  if (node[1] === 'mine:all') {
    tool('⬆ Import a file', () => $('importFile').click(), true);
    tool('Make a pack', openPackMaker);
  }
  $('bLoad').disabled = !bSel;
  $('bLoad').textContent = bSel?.song ? `Load the song (sounds 1–8, all patterns)` : bSel ? `Load ${selName(bSel).replace(/ \(from .*\)$/, '')} onto sound ${S.cur + 1}` : `Choose a sound for sound ${S.cur + 1}`;
  // second button: open a pack, or rename / delete one of yours
  const more = $('bMore');
  more.hidden = !bSel || !(selPack(bSel) || bSel.mine);
  more.textContent = bSel && selPack(bSel) ? 'Open pack ▸' : 'Rename / delete';
}
const same = (a, b) => (a.song && a.song === b.song) || (a.lib && a.lib === b.lib) || (a.mine && b.mine && a.mine.id === b.mine.id) || (a.k != null && a.k === b.k && a.from === b.from);
const count = node => (Array.isArray(node[1]) ? node[1].reduce((n, it) => n + (Array.isArray(it) ? count(it) : 1), 0) : 0);
// The sound a choice stands for, as a slot (built once and kept).
async function slotOf(c) {
  if (c.lib) { if (!previews.has(c.lib)) previews.set(c.lib, factorySlot(c.lib)); return previews.get(c.lib); }
  if (c.mine) return unpackSlot(c.mine);
  return sliceAlone(await slotOf(c.from), c.k, c.label);
}
async function preview(c) {
  if (c.song) { status(`${c.song.name} by ${c.song.by}: ${c.song.about}. Load puts the whole song on sounds 1–8 and in the patterns.`); return; }
  const slot = await slotOf(c);
  if (bSel === c) playNote(eng, slot, -1, slot.kind === 'chop' ? 0 : slot.kind === 'sample' ? 7 : 7, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root });
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
    if (Math.abs(f - 1) > 0.002) jobs.push(stretchLoop(x.buf || sl.buf, x.s, x.e, f));
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
async function loadSong(id) {
  ctx.resume();
  status('Loading the song…');
  try {
    const P = await (await fetch(`sounds/songs/${id}.json`)).json();
    const slots = await Promise.all(P.sounds.map(async so => {
      const sl = await factorySlot(so.factory);
      if (so.vol != null) sl.params.vol = so.vol;
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
        bar[st].push({ s, k, ...(x.d && { d: x.d }), ...(x.oc && { oc: x.oc }), ...(lock && { lock }) });
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
  if (bSel.lib) await loadLibrary(bSel.lib);
  else {
    checkpoint();
    S.slots[S.cur] = await slotOf(bSel); S.lastKey[S.cur] = S.cur < 8 && S.slots[S.cur].kind === 'sample' ? 7 : 0;
    syncPanel(); dirty(); draw(); status(`${S.slots[S.cur].name} → sound ${S.cur + 1}.`);
  }
  closeMenu(); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime + 0.01);
});
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
    return { factory: null, kind: 'chop', contiguous: false, name: label, params: { ...defParams(), trig: 'loop' }, buf,
      slices: [{ s: 0, e: buf.duration, name: label, ...(sl.bpm && { bpm: sl.bpm, bars: sl.bars }) }] };
  return { factory: null, kind: 'sample', name: label, params: { ...defParams(), choke: true }, buf };
}

// ---------------------------------------------------------------------------
// My Sounds. A sound is stored whole: its settings and its audio (one or more
// buffers, as raw samples), so it loads anywhere, in any project.
// ---------------------------------------------------------------------------
function packSlot(sl) {
  const bufs = [], at = new Map();
  const ref = b => { if (!b) return null; if (!at.has(b)) { at.set(b, bufs.length); bufs.push({ rate: b.sampleRate, data: b.getChannelData(0).slice() }); } return at.get(b); };
  return { kind: sl.kind, params: { ...sl.params }, synth: sl.synth, zones: sl.zones, base: sl.base, contiguous: sl.contiguous, bpm: sl.bpm, credit: sl.credit,
    buf: ref(sl.buf), slices: sl.slices?.map(x => ({ ...x, buf: ref(x.buf) })), bufs };
}
function unpackSlot(m) {
  const it = m.item, B = it.bufs.map(b => { const a = ctx.createBuffer(1, b.data.length, b.rate); a.copyToChannel(b.data, 0); return a; });
  return { factory: null, name: m.name, kind: it.kind, params: params(it.params), synth: it.synth, zones: it.zones, base: it.base, bpm: it.bpm, credit: it.credit,
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
  playNote(e, S.slots[si], si, k, 0.01, { scale: S.scale, bpm: S.bpm, root: S.root });
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
edCv.addEventListener('pointerdown', ev => { capture(edCv, ev); edDrag = { x: ev.offsetX, t: edT(ev.offsetX) }; });
edCv.addEventListener('pointermove', ev => {
  if (!edDrag || Math.abs(ev.offsetX - edDrag.x) < 5) return;
  const t = Math.max(0, Math.min(ed.buf.duration, edT(ev.offsetX)));
  ed.sel = [Math.min(edDrag.t, t), Math.max(edDrag.t, t)]; drawEd();
  edPlay(t, 0.12);                                         // hear where you are
});
edCv.addEventListener('pointerup', ev => {
  if (edDrag && Math.abs(ev.offsetX - edDrag.x) < 5) { ed.sel = null; ed.cur = Math.max(0, edT(ev.offsetX)); edPlay(ed.cur, 0.6); drawEd(); }
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
function closeMenu() { $('menu').hidden = true; draw(); }
$('menuBtn').addEventListener('click', () => openMenu());
$('menuClose').addEventListener('click', stopPreview);
$('menuClose').addEventListener('click', closeMenu);

// ---------------------------------------------------------------------------
// Custom buttons: four small buttons whose job you choose (Menu › Buttons).
// An effect works while the button is held, like an FX key.
// ---------------------------------------------------------------------------
const ACTIONS = {
  mute: { name: 'Mute drums', label: () => 'Mute', on: () => !!S.muteBeat, tap: () => toggleMute() },
  export: { name: 'Export loop', label: () => '⬆ Export', tap: () => openExport() },
  roll: { name: 'Roll a sound', label: () => '🎲 Roll', tap: () => roll(false) },
  beat: { name: 'New beat', label: () => '🎲 Beat', tap: () => genBeat() },
  beats: { name: 'Beat settings', label: () => 'Beats', tap: () => openMenu('tBeat') },
  clear: { name: 'Clear (the pattern; in Sound mode, the sound)', label: () => 'Clear', tap: () => (S.mode === 'sound' ? clearSlot(S.cur) : $('clearPat').click()) },
  edit: { name: 'Edit sound', label: () => '✂ Edit', tap: () => editCurrent() },
  chain: { name: 'Chain: tap, choose patterns, tap again (twice with none: unchain)', label: () => (chainEdit ? 'Done' : 'Chain'), on: () => chainEdit, tap: () => setChainEdit(!chainEdit) },
  key: { name: 'Key wheel', label: () => 'Key', tap: () => ($('wheel').hidden ? openWheel() : ($('wheel').hidden = true)) },
  nextkey: { name: 'Next key', label: () => 'Key ▸', tap: () => nextKey() },
  voice: { name: 'Robot voice (open the Voice page)', label: () => '🤖 Voice', tap: () => openMenu('tVoice') },
  rap: { name: 'Rap it: the words typed, on this sound', label: () => '🎤 Rap', tap: () => $('rapIt').click() },
  newflow: { name: 'New flow for the rap on this sound', label: () => '🎲 Flow', tap: () => $('rapNew').click() },
  hearrap: { name: 'Hear the rap on its own', label: () => (rapPv ? '■ Stop' : '▶ Rap'), on: () => !!rapPv, tap: () => hearRap() },
  octdown: { name: 'Octave down', label: () => (octOf(S.cur) < 0 ? `Oct ${octOf(S.cur)}` : 'Oct −'), on: () => octOf(S.cur) < 0, tap: () => shiftOct(-1) },
  octup: { name: 'Octave up', label: () => (octOf(S.cur) > 0 ? `Oct +${octOf(S.cur)}` : 'Oct +'), on: () => octOf(S.cur) > 0, tap: () => shiftOct(1) },
  ...Object.fromEntries(Object.entries(FX).map(([id, [n]]) => [`fx:${id}`, { name: `FX: ${n}`, label: () => n, fx: id, on: () => activeFx.has(id) }])),
};
const DEFAULT_CUSTOM = DEFAULT_CUSTOM_IDS;
const customs = [...document.querySelectorAll('button.custom')];
customs.forEach((b, i) => {
  const act = () => ACTIONS[S.custom[i]] || ACTIONS[DEFAULT_CUSTOM[i]];
  b.addEventListener('pointerdown', ev => {
    const a = act(); if (a.fx == null) return;
    ev.preventDefault(); capture(b, ev); ctx.resume();
    if (S.fxLatch && activeFx.has(a.fx)) releaseFx(a.fx); else engageFx(a.fx);
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
  for (const [id, a] of Object.entries(ACTIONS)) if (!a.fx) sel.add(new Option(a.name, id));
  for (const [g, ids] of FX_GROUPS) {
    const og = document.createElement('optgroup'); og.label = 'Effect: ' + g;
    for (const id of ids) og.appendChild(new Option(FX[id][0], 'fx:' + id));
    sel.appendChild(og);
  }
  sel.addEventListener('change', () => { S.custom[i] = sel.value; persist(); draw(); });
}
function drawCustom() {
  customs.forEach((b, i) => {
    const id = ACTIONS[S.custom[i]] ? S.custom[i] : DEFAULT_CUSTOM[i], a = ACTIONS[id];
    b.textContent = a.label(); b.classList.toggle('on', !!a.on?.()); $('cb' + i).value = id;
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
async function makeVoice(text = $('voxText').value.trim(), gap = +$('voxGap').value) {
  if (!text) throw new Error('Type something first.');
  if (!vox) { status('Loading the voice engine (about 18 MB the first time)…'); vox = await import('../vox-machina/engine.js?v=20261022y'); }
  status('Speaking…');
  let v = await vox.speak(text, { voice: 'en-us', variant: $('voxVariant').value, pitch: +$('voxPitch').value,
    pitchRange: +$('voxRange').value, speed: +$('voxSpeed').value, wordGap: gap });
  v = vox.stretchVowels(v, +$('voxVowel').value);
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
async function voiceSyllables(text, cut = $('rapCut').value) {
  if (!vox) { status('Loading the voice engine (about 18 MB the first time)…'); vox = await import('../vox-machina/engine.js?v=20261022y'); }
  status('Listening for the syllables…');
  const words = await phonetics(text), counts = words.map(w => Math.max(1, w.syl.length));
  const all = words.flatMap((w, wi) => (w.syl.length ? w.syl : [{ ph: null, stress: 0 }]).map((y, k, arr) => ({ ...y, w: wi, first: k === 0, punct: k === arr.length - 1 ? w.punct : '' })));
  let buf = null, found = null;
  if (cut === 'robot' && all.every(y => y.ph)) {
    const said = all.map(y => { const v = y.ph.findIndex(PH_VOWEL), m = ['', ',', "'"][y.stress]; return [...y.ph.slice(0, v), m + y.ph[v], ...y.ph.slice(v + 1)].join(''); });
    buf = await makeVoice(`[[${said.join(' ')}]]`, 20);
    found = syllables(buf, all.map(() => 1));
  }
  if (!found) {
    buf = await makeVoice(text, Math.max(30, +$('voxGap').value)); found = syllables(buf, counts);
    if (!found) {           // the words found don't match: speak them one at a time
      const pieces = [];
      for (const [i, w] of words.entries()) { status(`Speaking word ${i + 1} of ${words.length}…`); pieces.push(await makeVoice(w.t, 0)); }
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
  return { factory: null, kind: 'chop', contiguous: false, name, params: { ...defParams(), choke: true }, buf,
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
async function renderLoop() {
  const ticks = 16 * S.chain.length, len = ticks * stepDur(), tail = 2.5;
  const off = new OfflineAudioContext(2, Math.ceil((len + tail) * SR), SR);       // stereo, for ping-pong and chorus
  const e = new Engine(off, { live: false });
  let k = { root: S.root, scale: S.scale };     // as on Play: a pattern with a key of its own changes it, the others carry it on
  renderKeys = S.chain.map(p => (k = S.patKeys[p] || k));
  await warmLoops();                // every loop stretched before the render starts
  for (let t = 0; t < ticks; t++) playTick(e, t, t * stepDur() + (t % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0), false);
  renderKeys = null;
  const buf = await off.startRendering(), n = Math.round(len * SR);
  const chs = [0, 1].map(c => {
    const x = buf.getChannelData(c);
    for (let i = n; i < x.length; i++) x[i % n] += x[i];
    return x.subarray(0, n);
  });
  let top = 0; for (const x of chs) for (const v of x) top = Math.max(top, Math.abs(v));
  if (top > 0.98) for (const x of chs) for (let i = 0; i < n; i++) x[i] *= 0.98 / top;
  return { data: wav(chs, SR), len };
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
    case 'sound': return S.slots[k]?.name || '';
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
// A step's colours. The beat (drum kits) is the background: stripes in the
// kit's colour (two kits: both colours by turns). The instruments are blocks
// on top: one fills it; 2-4 split it side by side; 5 or more, a grid of blocks
// (each block dark and see-through, with a neon edge: the CSS for .key.steps).
function stepFill(el, all) {
  const drums = all.filter(isDrum), sounds = all.filter(s => !isDrum(s));
  const n = sounds.length, sig = drums.join(',') + '|' + sounds.join(',') + '|' + S.cur;
  if (el.dataset.fill === sig) return;
  el.dataset.fill = sig;
  el.classList.toggle('beat', drums.length > 0); el.classList.toggle('inst', n > 0);
  el.style.setProperty('--wash', `repeating-linear-gradient(135deg, ${drums.map((d, i) =>
    `${soundVar(d)} ${i * 14}px ${i * 14 + 5}px, transparent ${i * 14 + 5}px ${(i + 1) * 14}px`).join(', ')})`);
  const [c, r] = n <= 4 ? [n, 1] : n <= 6 ? [3, 2] : n <= 9 ? [3, 3] : [4, 4];
  const u = el.querySelector('u');
  u.style.gridTemplateColumns = `repeat(${c}, 1fr)`; u.style.gridTemplateRows = `repeat(${r}, 1fr)`;
  u.classList.toggle('many', n > 4);
  u.innerHTML = sounds.map(s => `<s style="--c:${soundVar(s)}"${s === S.cur && n > 1 ? ' class="me"' : ''}></s>`).join('');
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
  $('lcdSound').textContent = `${String(S.cur + 1).padStart(2, '0')} ${sl ? sl.name.toUpperCase() : '…'}`;
  // in a chain: the pattern on screen, and where the chain is (bar n of all of them)
  const cpos = playing && headTick >= 0 ? (Math.floor(headTick / 16) % S.chain.length) + 1 : 0;
  $('lcdPat').textContent = S.chain.length > 1 ? `PAT ${S.pat + 1} · ${cpos ? cpos + '/' : ''}${S.chain.length}⛓` : `PAT ${S.pat + 1}`;
  $('lcdMode').textContent = copying ? `COPY ${copying.toUpperCase()}: TAP WHERE` : {
    play: S.write ? (playing ? (S.replace ? 'WRITE: LIVE, REPLACE' : S.quantGrid ? 'WRITE: LIVE RECORD' : 'WRITE: LIVE, NOT QUANTIZED') : 'WRITE: TAP STEPS') : 'PLAY', sound: 'SOUND: PICK ONE',
    pattern: chainEdit ? 'CHAIN: TAP IN ORDER' : 'PATTERN: PICK ONE',
    fx: S.write && playing ? 'FX: HOLD TO RECORD IT' : 'FX: HOLD A KEY' }[S.mode];
  $('vol').value = S.vol; $('oVol2').textContent = Math.round(S.vol * 100);
  $('lcdInfo').textContent = `${octOf(S.cur) ? `OCT${octOf(S.cur) > 0 ? '+' : ''}${octOf(S.cur)} ` : ''}${S.bpm} BPM${S.swing > 50 ? ' SW' + S.swing : ''}`;
  const kb = $('keyBtn'), kn = k => `${(isMinor(k.scale) ? MIN_NAME : MAJ_NAME)[k.root]} ${SCALE_SHORT[k.scale] || k.scale.toUpperCase()}`;
  kb.textContent = keyNext ? `${kn(S)} → ${kn(keyNext)}` : kn(S); kb.classList.toggle('waiting', !!keyNext);
  kb.classList.toggle('saved', !!S.patKeys[S.pat]);
  if (!$('loops').hidden) drawLoops();
  $('bpm').value = S.bpm; $('oBpm').textContent = S.bpm; $('swing').value = S.swing; $('oSwing').textContent = S.swing + '%';
  $('scale').value = S.scale; $('root').value = S.root; $('quantGrid').value = S.quantGrid; drawFxPanel();
  for (let k = 0; k < 16; k++) {
    const el = keyEls[k], steps = S.patterns[S.pat][k];
    let lit = false, some = false, cur = false;
    switch (S.mode) {
      case 'sound': cur = k === S.cur; break;
      case 'pattern': cur = k === S.pat; lit = S.chain.includes(k) && (playing ? k === headPat : true); some = S.patterns[k].some(s => s.length); break;
      case 'fx': lit = activeFx.has(S.fxSlots[k]); break;
      default: lit = steps.some(n => n.s === S.cur); some = !lit && steps.length > 0;
    }
    // Colour: Sound mode, each pad its own sound's; Play, the current sound's; Write, every sound on the step.
    const steps_ = S.mode === 'play' && S.write, tint = S.mode === 'sound' || (S.mode === 'play' && !S.write);
    if (tint) el.style.setProperty('--c', soundVar(S.mode === 'sound' ? k : S.cur));
    el.classList.toggle('tint', tint); el.classList.toggle('pad', S.mode === 'sound'); el.classList.toggle('steps', steps_);
    if (steps_) {
      const on = [...new Set(steps.map(n => n.s))].sort((a, b) => a - b);
      stepFill(el, on); el.classList.toggle('full', on.length > 0); some = false;
    } else if (el.dataset.fill) { el.dataset.fill = ''; el.querySelector('u').innerHTML = ''; el.classList.remove('full', 'beat', 'inst'); }
    el.classList.toggle('fxon', S.mode === 'fx' && lit);
    el.classList.toggle('lit', lit); el.classList.toggle('some', some); el.classList.toggle('cur', cur);
    el.classList.toggle('head', playing && k === headStep && S.mode !== 'sound' && S.mode !== 'pattern');
    const loops = S.mode === 'sound' ? [...looping.keys()].some(id => id.startsWith(k + ':')) : looping.has(`${S.cur}:${k}`);
    el.classList.toggle('down', down.has(k) || loops || (flash?.k === k && performance.now() < flash.until));
    const ci = S.mode === 'pattern' && S.chain.length > 1 ? S.chain.indexOf(k) : -1;
    el.classList.toggle('chain', ci >= 0); el.dataset.chain = ci >= 0 ? S.chain.map((p, i) => p === k ? i + 1 : null).filter(Boolean).join(',') : '';
    el.querySelector('span').textContent = keyLabel(k);
  }
}

// Waveform: the current sound, with its slice markers; synths show the scope.
function drawWave() {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
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
    view.marks.forEach((m, k) => {
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
  const r = cv.getBoundingClientRect(), T = v.a + (ev.clientX - r.left) / r.width * (v.b - v.a);
  const near = v.marks.findIndex((m, k) => k > 0 && Math.abs((m.s - T) / (v.b - v.a) * r.width) < 14);
  const sl = S.slots[S.cur];
  if (near > 0 && sl.contiguous) { drag = near; return; }
  const k = v.marks.findIndex(m => T >= m.s && T < m.e);
  if (k >= 0) { S.lastKey[S.cur] = k; noteOn(eng, S.cur, k, ctx.currentTime); flash = { k, until: performance.now() + 160 }; draw(); }
});
cv.addEventListener('pointermove', ev => {
  if (drag == null) return;
  const v = waveView(), r = cv.getBoundingClientRect(), sl = S.slots[S.cur];
  const T = v.a + (ev.clientX - r.left) / r.width * (v.b - v.a), m = sl.slices;
  const lo = m[drag - 1].s + 0.01, hi = (m[drag + 1]?.s ?? v.b) - 0.01;
  m[drag].s = Math.min(hi, Math.max(lo, T)); m[drag - 1].e = m[drag].s;
});
const endDrag = () => { if (drag != null) { S.lastKey[S.cur] = drag; noteOn(eng, S.cur, drag, ctx.currentTime); drag = null; dirty(); } };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

let lastSeen = [], lastNoteAt = 0;
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
  const scopeLive = sl?.kind === 'synth' && (playing || ctx.currentTime < lastNoteAt + 1.5);
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
  if (ev.code === 'Space') { ev.preventDefault(); playing ? stop() : start(); return; }
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
  const st = STYLES[$('style').value], ds = drumSlot();
  if (ds < 0) { status('No drum kit loaded: choose one above first.'); return; }
  if (playing) stop();
  ctx.resume();
  const steps = beatSteps(st.parts, ds, percSlot()), sd = 60 / st.bpm / 4, sw = (2 * st.swing / 100 - 1) * sd;
  const pv = beatPv = { t: ctx.currentTime + 0.05, i: 0 };
  const run = () => {
    if (beatPv !== pv) return;
    while (pv.t < ctx.currentTime + 0.12) {
      const at = pv.t + (pv.i % 2 ? sw : 0);
      for (const n of steps[pv.i % 16]) noteOn(eng, n.s, n.k, at, null, n.lock);
      pv.t += sd; pv.i++;
    }
    pv.timer = setTimeout(run, 25);
  };
  run();
  $('hearBeat').textContent = '■ Stop'; $('hearBeat').classList.add('go');
  status(`Hearing ${st.name} at ${st.bpm} BPM on ${S.slots[ds].name}. "Put this beat in" puts it in pattern ${S.pat + 1}.`);
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
for (const [id, st] of Object.entries(STYLES)) $('style').add(new Option(`${st.name} · ${st.bpm}`, id));
$('putBeat').addEventListener('click', () => {
  const st = STYLES[$('style').value];
  if (putBeat(st)) status(`${st.name} beat in pattern ${S.pat + 1}, at ${st.bpm} BPM. ↶ Undo takes it back.`);
});
const genBeat = () => {
  ctx.resume();
  const st = STYLES[$('style').value];
  if (putBeat(st, drumSlot(), true, makeBeat(st))) status(`A new ${st.name.toLowerCase()} beat in pattern ${S.pat + 1}. Again for another; ↶ Undo for the last one.`);
};
$('genBeat').addEventListener('click', genBeat);

// Drum kit (Beat tab): the kit the beats play on, swapped on its own key
// (the kit on the keys, or sound 9 if there is none).
const KITS_MENU = [['Recorded kits', ['acoustic', 'boombap', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly']],
  ['Drum machines', ['tr808', 'electro', 'drumtraks', 'kit808', 'kit909', 'kitcr78', 'kit606', 'kitminimal']]];
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
function drawKitSel() {
  const si = drumSlot(), f = si >= 0 ? S.slots[si]?.factory : null;
  $('kitSel').value = KITS_MENU.some(([, ids]) => ids.includes(f)) ? f : '';
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
      slices: sl.slices?.map(s => ({ ...s, buf: ref(s.buf) })),
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
        const slot = { factory: null, kind: s.kind, name: s.name, params: params(s.params), synth: s.synth, contiguous: s.contiguous, buf: await getBuf(s.buf), zones: s.zones, base: s.base, bpm: s.bpm, credit: s.credit };
        if (s.slices) slot.slices = await Promise.all(s.slices.map(async x => ({ ...x, buf: await getBuf(x.buf) })));
        if (slot.kind === 'synth' || slot.buf || slot.slices?.every(x => x.buf || slot.buf)) { S.slots[i] = slot; continue; }
      }
      const id = typeof s?.factory === 'number' ? OLD_ORDER[s.factory] : LIBRARY[s?.factory] ? s.factory : DEFAULT[i];
      S.slots[i] = await factorySlot(id);
      if (s?.factory != null) {
        S.slots[i].params = params(s.params); if (s.synth) S.slots[i].synth = s.synth;
        s.trims?.forEach(([start, len], k) => { const x = S.slots[i].slices?.[k]; if (x) Object.assign(x, { start, len }); });
      }
    } catch (e) { console.warn('Sound', i + 1, e); S.slots[i] = await factorySlot(DEFAULT[i]).catch(() => null); }
    if (i === S.cur) { syncPanel(); draw(); }
  }
  if (saved) { for (const k of ['patterns', 'fx', 'patKeys', 'pat', 'chain', 'bpm', 'swing', 'scale', 'root', 'vol', 'quantGrid', 'fxTarget', 'fxAmt', 'fxSlots', 'fxLatch', 'muteBeat', 'custom', 'cur', 'lastKey', 'oct', 'grid']) if (saved[k] != null) S[k] = saved[k];
  if (!(S.grid?.cells?.length === 8 && S.grid.cells.every(c => c.length === ROWS))) S.grid = defaultGrid();
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
  put(11, 0, [3]); put(11, 2, [14]);
}

// ---------------------------------------------------------------------------
// The Loops tab: a grid like Remixlive's. Eight columns (channels), in the
// colours of sounds 1-8, with up to six cells each. A tap starts a cell on the
// next bar, in time and key (the loop engine: each loop's own bpm and bars,
// stretched to the tempo and key by stretchLoop). One cell plays in a column:
// tapping another switches on the bar, tapping the playing one stops it on the
// bar. A long press (or ✎ Edit) sets a cell to Loop, One shot or Gate and
// chooses its sound. Each column has a volume and a mute: a gain of its own,
// into the effects, so the FX reach the loops too. Tempo, key, Play and the
// FX are shared with the Pads tab, and Stop stops everything.
// ---------------------------------------------------------------------------
const CHANNELS = ['Kick', 'Snare', 'Tops', 'Bass', 'Chords', 'Lead', 'Sub', 'Vox/Keys'];
const ROWS = 6;
const MODE_LABEL = { loop: 'Loop', oneshot: 'One shot', gate: 'Gate' };
// A first set from the loops already in the app, until a set is made for the grid.
function defaultGrid() {
  const c = (lib, k, mode = 'loop') => ({ lib, k, mode });
  const cells = Array.from({ length: 8 }, () => new Array(ROWS).fill(null));
  [0, 1, 2, 4, 11, 3].forEach((k, r) => { cells[0][r] = c('drumloops', k); });
  [0, 1, 2, 3, 4, 5].forEach((k, r) => { cells[1][r] = c('breaks', k); });
  [6, 7, 8, 9].forEach((k, r) => { cells[2][r] = c('drumloops', k); });
  cells[2][4] = c('ambience', 0); cells[2][5] = c('ambience', 1);
  [0, 3, 5, 12, 13, 14].forEach((k, r) => { cells[7][r] = c('hype', k, 'oneshot'); });
  return { cells, vol: new Array(8).fill(0.8), mute: new Array(8).fill(false) };
}
S.grid = defaultGrid();
let view = 'pads', lEdit = false;
// What each column is doing: cur (sounding, or about to stop at stopAt), next (waiting for its bar), gate (held).
let gcol = Array.from({ length: 8 }, () => ({ cur: null, next: null, gate: null }));
// A cell as a one-slice sound that playNote can play.
const cellSlots = new Map();
function cellSlot(cell) {
  const id = `${cell.lib}:${cell.k}:${cell.mode}:${cell.keyOf ?? ''}`;
  if (!cellSlots.has(id)) cellSlots.set(id, slotOf({ lib: cell.lib }).then(slot => {
    const x = slot?.slices?.[cell.k]; if (!x) return null;
    cell.name ||= x.name;
    const buf = x.buf || slot.buf;
    return { kind: 'chop', name: x.name, buf, slices: [{ ...x, buf, start: 0, len: 1 }],
      params: { ...defParams(), keyOf: cell.keyOf ?? null, trig: cell.mode === 'oneshot' ? 'oneshot' : 'loop' } };
  }).catch(() => null));
  return cellSlots.get(id);
}
// Each column's volume: made for each sound engine (it can be rebuilt).
function colGain(c) {
  if (!eng.cols) eng.cols = S.grid.vol.map((v, i) => { const g = ctx.createGain(); g.gain.value = S.grid.mute[i] ? 0 : v; g.connect(eng.bus); return g; });
  return eng.cols[c];
}
const setColGain = c => colGain(c).gain.setTargetAtTime(S.grid.mute[c] ? 0 : S.grid.vol[c], ctx.currentTime, 0.02);
// The stretched copy a loop needs for this tempo and key (and the key coming), made before it is needed.
function stretchFor(slot, roots = [S.root, keyAhead().root]) {
  const x = slot.slices[0]; if (!x.bpm) return Promise.resolve();
  return Promise.all([...new Set(roots)].map(root => {
    const f = loopStretch({ bpm: x.bpm }, slot.params, S.bpm, root);
    return Math.abs(f - 1) > 0.002 ? stretchLoop(x.buf, x.s, x.e, f) : null;
  }));
}
async function warmGrid() {
  for (const col of S.grid.cells) for (const cell of col) if (cell) { const sl = await cellSlot(cell); if (sl) await stretchFor(sl); }
}
let gridWarmTimer = 0;
const warmGridSoon = () => { clearTimeout(gridWarmTimer); gridWarmTimer = setTimeout(warmGrid, 300); };
// Start cell r of column c at { when, j } (j: the tick, so the loop's phase follows the bar count).
function launch(c, r, slot, at) {
  const cell = S.grid.cells[c][r], x = slot.slices[0], key = keyAt(at.when), bars = x.bars || 1;
  const phase = x.bpm ? ((at.j / 16) % bars) / bars : 0;
  let voice = null;
  try {
    voice = playNote(eng, slot, -1, 0, at.when, { scale: key.scale, bpm: S.bpm, root: key.root, hold: cell.mode !== 'oneshot', phase, dest: colGain(c) });
  } catch (e) { soundError(e); }
  return voice && { r, voice, at: at.when, j: at.j, synced: !!x.bpm, bars, len: x.e - x.s };
}
const stopAt = (h, b) => { if (!h) return; h.voice?.stop(b.when); h.stopAt = b.when; h.stopJ = b.j; };
async function tapCell(c, r) {
  const col = gcol[c], cell = S.grid.cells[c][r];
  if (!cell) { openCellMenu(c, r); return; }
  ctx.resume();
  if (col.next?.r === r) {                     // waiting: take it back; what was playing carries on
    col.next.voice?.stop(ctx.currentTime); col.next = null;
    if (col.cur?.stopAt != null) {
      const cs = await cellSlot(S.grid.cells[c][col.cur.r]);
      if (cs) { col.next = launch(c, col.cur.r, cs, { when: col.cur.stopAt, j: col.cur.stopJ }); }
    }
    drawLoops(); return;
  }
  if (col.cur?.r === r && col.cur.stopAt == null && !col.next) {    // playing: it stops on the bar
    stopAt(col.cur, playing ? nextBar() : { when: ctx.currentTime, j: 0 });
    drawLoops(); return;
  }
  const slot = await cellSlot(cell);
  if (!slot) { status('That cell\'s sound could not be loaded.'); return; }
  if (slot.slices[0].bpm) await stretchFor(slot);
  if (!playing) start();
  const b = nextBar(), v = launch(c, r, slot, b);
  if (!v) return;
  if (col.next) col.next.voice?.stop(ctx.currentTime);
  if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b);
  if (col.gate) { col.gate.voice?.stop(b.when); col.gate = null; }
  col.next = v;
  if (verbose) log('loops', `column ${c + 1} cell ${r + 1} from bar ${b.j / 16 + 1}`);
  drawLoops();
}
// Gate: it sounds from the next beat while the finger is down, in step with the bar.
async function gateDown(c, r) {
  const col = gcol[c], cell = S.grid.cells[c][r];
  ctx.resume();
  const token = col.gateToken = {};
  const slot = await cellSlot(cell); if (!slot || col.gateToken !== token) return;
  if (slot.slices[0].bpm) await stretchFor(slot);
  if (col.gateToken !== token) return;
  if (!playing) start();
  const b = nextBar(4), v = launch(c, r, slot, b); if (!v) return;
  if (col.cur && col.cur.stopAt == null) stopAt(col.cur, b);
  if (col.next) { col.next.voice?.stop(ctx.currentTime); col.next = null; }
  col.gate = v; drawLoops();
}
function gateUp(c) {
  const col = gcol[c]; col.gateToken = null;
  if (col.gate) { col.gate.voice?.stop(ctx.currentTime); col.gate = null; drawLoops(); }
}
// Stop everything in the grid (Stop, and when the sound engine is rebuilt).
function stopGrid(rebuilt = false) {
  for (const col of gcol) for (const h of [col.cur, col.next, col.gate]) if (h && !rebuilt) h.voice?.stop(ctx.currentTime);
  gcol = Array.from({ length: 8 }, () => ({ cur: null, next: null, gate: null }));
  drawLoops();
}
// Relaunch the loops playing at { when, j }: after a key change (only the
// cells that follow the key) or a tempo change (every loop in time).
async function relaunchGrid(b, which) {
  for (let c = 0; c < 8; c++) {
    const col = gcol[c], h = col.cur;
    if (!h || h.stopAt != null || col.next || !h.voice || h.voice.end !== Infinity) continue;
    const cell = S.grid.cells[c][h.r]; if (!cell || !which(cell, h)) continue;
    const slot = await cellSlot(cell); if (!slot) continue;
    const v = launch(c, h.r, slot, b); if (!v) continue;
    stopAt(h, b); col.next = v;
  }
}
// The scheduler, at the top of each bar: a key change booked for this bar.
function gridAtBar(k) {
  if (k?.at != null && gcol.some(col => col.cur)) relaunchGrid({ when: k.at, j: tick }, cell => cell.keyOf != null);
}
let gridTempoTimer = 0;
function gridTempo() {
  warmGridSoon();
  clearTimeout(gridTempoTimer);
  gridTempoTimer = setTimeout(async () => {
    if (!playing || !gcol.some(col => col.cur)) return;
    await warmGrid();
    if (playing) relaunchGrid(nextBar(), (cell, h) => h.synced);
  }, 400);
}
// Every frame: cells starting and stopping on their bar, and the rings.
function tickGrid(now) {
  let changed = false;
  for (const col of gcol) {
    if (col.cur && ((col.cur.stopAt != null && now >= col.cur.stopAt) || now >= col.cur.voice.end)) { col.cur = null; changed = true; }
    if (col.next && now >= col.next.at) { col.cur = col.next; col.next = null; changed = true; }
  }
  if (changed) drawLoops();
  if (view !== 'loops') return;
  const pos = playing ? (tick - (nextT - now) / stepDur()) / 16 : 0;   // bars since the beat began
  for (let c = 0; c < 8; c++) {
    const col = gcol[c];
    for (const h of [col.cur, col.gate]) {
      if (!h || now < h.at) continue;
      let p;
      if (h.voice.end !== Infinity && h.stopAt == null) p = (now - h.at) / Math.max(0.01, h.voice.end - h.at);   // one shot
      else if (h.synced) p = ((pos % h.bars) + h.bars) % h.bars / h.bars;
      else p = ((now - h.at) / Math.max(0.01, h.len)) % 1;
      cellEls[c][h.r].ring.style.strokeDashoffset = String(100 - 100 * Math.min(1, Math.max(0, p)));
    }
  }
}

// The grid on screen
const cellEls = [];
function buildLoops() {
  const grid = $('lgrid');
  for (let c = 0; c < 8; c++) {
    const col = document.createElement('div'); col.className = 'lcol'; col.style.setProperty('--c', soundVar(c));
    const head = document.createElement('div'); head.className = 'lhead'; head.textContent = CHANNELS[c]; col.appendChild(head);
    cellEls[c] = [];
    for (let r = 0; r < ROWS; r++) {
      const b = document.createElement('button'); b.className = 'lcell';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" class="rbg"/><circle cx="12" cy="12" r="9.5" class="rfg" pathLength="100"/></svg><span></span><em></em>';
      const el = { b, ring: b.querySelector('.rfg'), name: b.querySelector('span'), badge: b.querySelector('em') };
      let timer = 0, long = false;
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault(); capture(b, ev); long = false;
        const cell = S.grid.cells[c][r];
        if (lEdit) return;
        if (cell?.mode === 'gate') { gateDown(c, r); return; }
        timer = setTimeout(() => { long = true; openCellMenu(c, r); }, 500);
      });
      const up = ev => {
        clearTimeout(timer);
        const cell = S.grid.cells[c][r];
        if (ev.type !== 'pointerup') { if (cell?.mode === 'gate') gateUp(c); return; }
        if (lEdit) { openCellMenu(c, r); return; }
        if (cell?.mode === 'gate') { gateUp(c); return; }
        if (!long) tapCell(c, r);
      };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', ev => ev.preventDefault());
      cellEls[c].push(el); col.appendChild(b);
    }
    const foot = document.createElement('div'); foot.className = 'lfoot';
    const fader = document.createElement('div'); fader.className = 'lfader'; fader.innerHTML = '<i></i>';
    fader.setAttribute('aria-label', `${CHANNELS[c]} volume`);
    const mute = document.createElement('button'); mute.className = 'lmute'; mute.textContent = 'M'; mute.title = `Mute ${CHANNELS[c]}`;
    // The fader reads the finger along its own length, whichever way the grid is turned.
    const setVol = ev => {
      const rc = fader.getBoundingClientRect(), turned = rc.height > rc.width;
      const v = turned ? (ev.clientY - rc.top) / rc.height : (ev.clientX - rc.left) / rc.width;
      S.grid.vol[c] = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100; setColGain(c); drawLoops(); persist();
    };
    fader.addEventListener('pointerdown', ev => { ev.preventDefault(); capture(fader, ev); fader.dragging = true; setVol(ev); });
    fader.addEventListener('pointermove', ev => { if (fader.dragging) setVol(ev); });
    for (const t of ['pointerup', 'pointercancel']) fader.addEventListener(t, () => { fader.dragging = false; });
    mute.addEventListener('click', () => { S.grid.mute[c] = !S.grid.mute[c]; setColGain(c); drawLoops(); persist(); });
    foot.append(fader, mute); col.appendChild(foot);
    cellEls[c].col = col; cellEls[c].fader = fader.firstChild; cellEls[c].mute = mute;
    grid.appendChild(col);
  }
}
function drawLoops() {
  if (!cellEls.length) return;
  for (let c = 0; c < 8; c++) {
    const col = gcol[c];
    for (let r = 0; r < ROWS; r++) {
      const cell = S.grid.cells[c][r], el = cellEls[c][r];
      const on = col.cur?.r === r && col.cur.stopAt == null || col.gate?.r === r;
      el.b.classList.toggle('filled', !!cell);
      el.b.classList.toggle('playing', !!on);
      el.b.classList.toggle('queued', col.next?.r === r);
      el.b.classList.toggle('stopping', col.cur?.r === r && col.cur.stopAt != null && col.next?.r !== r);
      el.name.textContent = cell ? cell.name || '…' : lEdit ? '+' : '';
      el.badge.textContent = cell?.mode === 'oneshot' ? '1×' : cell?.mode === 'gate' ? 'G' : '';
      if (!on && !(col.cur?.r === r)) el.ring.style.strokeDashoffset = '100';
    }
    cellEls[c].fader.style.width = Math.round(S.grid.vol[c] * 100) + '%';
    cellEls[c].mute.classList.toggle('on', S.grid.mute[c]);
    cellEls[c].col.classList.toggle('muted', S.grid.mute[c]);
  }
  $('lPlay').textContent = playing ? '■ Stop' : '▶ Play'; $('lPlay').classList.toggle('on', playing);
  $('lBpm').textContent = `${S.bpm} BPM`;
  $('lKey').textContent = $('keyBtn').textContent + ' ▸';
  $('lEdit').classList.toggle('on', lEdit);
}
// Names for cells that have none yet (the first set, or an old save).
async function nameCells() {
  for (const col of S.grid.cells) for (const cell of col) if (cell && !cell.name) await cellSlot(cell);
  drawLoops();
}
function setView(v) {
  view = v;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  $('loops').hidden = v !== 'loops';
  if (v === 'loops') { drawLoops(); nameCells(); warmGridSoon(); }
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('lPlay').addEventListener('click', () => { ctx.resume(); playing ? stop() : start(); drawLoops(); });
const nudgeBpm = d => { S.bpm = Math.max(60, Math.min(240, S.bpm + d)); dirty(); draw(); warmSoon(); gridTempo(); drawLoops(); };
$('lSlower').addEventListener('click', () => nudgeBpm(-1));
$('lFaster').addEventListener('click', () => nudgeBpm(1));
$('lKey').addEventListener('click', () => { nextKey(); drawLoops(); });
$('lEdit').addEventListener('click', () => { lEdit = !lEdit; status(lEdit ? 'Edit: tap a cell to set it up. Tap ✎ Edit again to play.' : ''); drawLoops(); });

// The cell menu: how it plays, and its sound (any loop or pack, one sound of it).
const CELL_PACKS = [['Loops', ['drumloops', 'breaks', 'ambience']],
  ['Kits', ['boombap', 'tr808', 'electro', 'drumtraks', 'acoustic', 'percussion', 'shakers']],
  ['Vocals', ['hype', 'robotvox', 'vocchops']], ['Synth and horns', ['stabs', 'basshits', 'pads', 'funkhorns']],
  ['FX', ['noisefx', 'sirens', 'arcade', 'machines', 'nature', 'airwater', 'bells2']]];
let menuCell = null, menuPack = null;
function openCellMenu(c, r) { menuCell = { c, r }; menuPack = null; $('lmenu').hidden = false; drawCellMenu(); }
function closeCellMenu() { $('lmenu').hidden = true; menuCell = null; drawLoops(); }
async function drawCellMenu() {
  if (!menuCell) return;
  const { c, r } = menuCell, cell = S.grid.cells[c][r];
  $('lmTitle').textContent = `${CHANNELS[c]} · cell ${r + 1}${cell ? ': ' + (cell.name || '…') : ': empty'}`;
  $('lmenu').style.setProperty('--c', soundVar(c));
  document.querySelectorAll('[data-lmode]').forEach(b => { b.classList.toggle('on', cell?.mode === b.dataset.lmode); b.disabled = !cell; });
  $('lmEmpty').disabled = !cell;
  const crumbs = $('lmCrumbs'), list = $('lmList'); crumbs.textContent = ''; list.textContent = '';
  const btn = (text, small, fn, sel) => {
    const b = document.createElement('button'); b.textContent = text;
    if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    if (sel) b.classList.add('sel');
    b.addEventListener('click', fn); list.appendChild(b);
  };
  const top = document.createElement('button'); top.textContent = 'Sounds'; top.addEventListener('click', () => { menuPack = null; drawCellMenu(); });
  crumbs.appendChild(top);
  if (!menuPack) {
    for (const [group, ids] of CELL_PACKS) for (const id of ids) if (LIBRARY[id]) btn(LIBRARY[id].name, group, () => { menuPack = id; drawCellMenu(); }, cell?.lib === id);
    return;
  }
  crumbs.append(' › ' + LIBRARY[menuPack].name);
  const pack = menuPack, slot = await slotOf({ lib: pack });
  if (menuPack !== pack || !menuCell) return;
  slot.slices.forEach((x, k) => btn(x.name, x.bpm ? `${Math.round(x.bpm)} BPM · ${x.bars} bar${x.bars > 1 ? 's' : ''}` : '', () => {
    playNote(eng, slot, -1, k, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root });      // a taste
    const was = S.grid.cells[c][r];
    S.grid.cells[c][r] = { lib: pack, k, name: x.name, mode: was?.mode || (x.bpm || pack === 'ambience' ? 'loop' : 'oneshot') };
    if (gcol[c].cur?.r === r || gcol[c].next?.r === r) { stopAt(gcol[c].cur, { when: ctx.currentTime, j: 0 }); gcol[c].next?.voice?.stop(ctx.currentTime); gcol[c].next = null; }
    persist(); warmGridSoon(); drawCellMenu(); drawLoops();
  }, cell?.lib === pack && cell.k === k));
}
document.querySelectorAll('[data-lmode]').forEach(b => b.addEventListener('click', () => {
  const cell = menuCell && S.grid.cells[menuCell.c][menuCell.r]; if (!cell) return;
  cell.mode = b.dataset.lmode; persist(); drawCellMenu(); drawLoops();
}));
$('lmEmpty').addEventListener('click', () => {
  const { c, r } = menuCell; const col = gcol[c];
  if (col.cur?.r === r) stopAt(col.cur, { when: ctx.currentTime, j: 0 });
  if (col.next?.r === r) { col.next.voice?.stop(ctx.currentTime); col.next = null; }
  S.grid.cells[c][r] = null; persist(); drawCellMenu(); drawLoops();
});
$('lmClose').addEventListener('click', closeCellMenu);
buildLoops();
Object.assign(window.pocketDebug, {     // for testing the grid from the browser console
  grid: () => gcol.map((col, c) => ({ c, cur: col.cur && { r: col.cur.r, at: col.cur.at, j: col.cur.j, stopAt: col.cur.stopAt ?? null, synced: col.cur.synced },
    next: col.next && { r: col.next.r, at: col.next.at, j: col.next.j }, gate: col.gate && { r: col.gate.r } })).filter(x => x.cur || x.next || x.gate),
  gains: () => S.grid.vol.map((v, c) => +colGain(c).gain.value.toFixed(2)), now: () => ctx.currentTime });

draw();
load().then(() => status('Ready. Press ▶ Play, or tap the keys.'));
requestAnimationFrame(frame);
