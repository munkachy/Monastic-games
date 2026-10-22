// Pocket Sampler: a 16-key sampler and step sequencer in the manner of a
// pocket drum machine. Sounds 1-8 are melodic, 9-16 are kits and chops.
// State is saved in IndexedDB, so recordings and patterns survive a reload.
// Bump ?v= on app.js (index.html), audio.js (here) and the front-page link
// with each release, so phones fetch the new files instead of cached ones.
import { Engine, playNote, makeKit, blessMe, prepare, onsets, keySemis, SCALES, FAMILIES, WOBBLE_RATES, SR } from './audio.js?v=20261022d';

const $ = id => document.getElementById(id);
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
  looping.clear(); for (const k in holding) delete holding[k];
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
window.pocketDebug = { rebuildAudio, load: id => loadLibrary(id), ids: () => Object.keys(LIBRARY), captureMedia: f => captureMedia(f).then(b => b.duration) };   // for testing the restart from the browser console
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
    Object.assign(slot, { kind: 'chop', buf: B.buf, slices: B.slices.map(([a, b], k) => ({ s: a / r, e: b / r, name: shortName(B.from[k]) })) });
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
const DEFAULT_CUSTOM_IDS = ['mute', 'export', 'roll', 'beat'];    // the four small buttons, at first
const S = {
  slots: [], cur: 0, lastKey: new Array(16).fill(0), mode: 'play',
  patterns: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [])),
  fx: Array.from({ length: 16 }, () => new Array(16).fill(null)),   // effects saved on steps
  custom: [...DEFAULT_CUSTOM_IDS], pat: 0, chain: [0], bpm: 120, swing: 50, scale: 'minor', root: 0, vol: 0.9, quantGrid: 1, fxTarget: 'all', fxAmt: {}, fxSlots: [...DEFAULT_SLOTS], fxLatch: true, write: false, replace: false,
};
const stepDur = () => 60 / S.bpm / 4;

// ---------------------------------------------------------------------------
// Sequencer: a look-ahead scheduler (setTimeout wakes it often; it books
// every step that falls in the next 120 ms on the audio clock).
// ---------------------------------------------------------------------------
let playing = false, tick = 0, nextT = 0, timer = 0, pendingChain = null;
const uiQueue = [];           // [{ t, tick, step, pat }] for the lights
const liveSkip = new Set();   // notes recorded live just before their step comes round
let headTick = -1, headStep = -1, headPat = -1;

function patAt(t) { return S.chain[Math.floor(t / 16) % S.chain.length]; }

function start() {
  if (playing) return;
  ctx.resume();
  playing = true; tick = 0; nextT = ctx.currentTime + 0.06;
  schedule(); $('play').classList.add('on'); $('play').textContent = '■ Stop';
}
function stop() {
  playing = false; clearTimeout(timer); uiQueue.length = 0; headStep = -1; headTick = -1; take = null;
  $('play').classList.remove('on'); $('play').textContent = '▶ Play';
  for (const f of [...activeFx]) if (!S.fxLatch || FX[f][1].seq) releaseFx(f);
  if (eng.recAudio) { eng.setFx(eng.recAudio, false, stepDur()); eng.recAudio = null; }
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
        const v = noteOn(e, n.s, n.k, at + i * stepDur() / rr, m, n.lock, hold);
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
function noteOn(e, si, k, when, m = null, lock = null, hold = false) {
  const slot = S.slots[si]; if (!slot) return null;
  m ??= modsFor(si, [...activeFx].map(k => [k, fxAim.get(k) || 'all']));
  if (e === eng) {
    lastNoteAt = Math.max(lastNoteAt, when);
    if (verbose) log('note', `sound ${si + 1} key ${k + 1}${hold ? ' held' : ''}: starts in ${((when - ctx.currentTime) * 1000).toFixed(0)} ms, ${eng.voices.size} sounding, audio ${ctx.state}`);
  }
  try {
    return playNote(e, slot, si, k, when, { rate: m.rate, reverse: m.reverse, unison: m.unison, scratch: m.scratch, dive: m.dive, fx: !m.dry, lock,
      scale: S.scale, bpm: S.bpm, root: S.root, hold });
  } catch (err) { soundError(err); return null; }
}
const isHeld = (si, lock) => (lock?.trig || S.slots[si]?.params.trig || 'oneshot') !== 'oneshot';

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
  b.innerHTML = `<b>${k + 1}</b><span></span><i></i>`;
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
      S.cur = k; S.lastKey[k] ||= 0; playHeld(k, S.lastKey[k], k); syncPanel(); persist(); break;
    case 'pattern':
      if (copying === 'pattern') { copyPattern(S.pat, k); break; }
      if (chainEdit) { checkpoint(); if (chainFresh) { S.chain = []; chainFresh = false; } S.chain.push(k); S.pat = k; pendingChain = null; }
      else { S.pat = k; if (playing) pendingChain = [k]; else S.chain = [k]; persist(); break; }
      dirty(); break;
    case 'fx': {
      const id = S.fxSlots[k];
      if (S.fxLatch && activeFx.has(id)) releaseFx(id);           // tap on, tap again off
      else engageFx(id, S.fxTarget === 'all' ? 'all' : new Set(S.fxTarget));
      break;
    }
    default:
      if (!S.write) trigger(k);
      else if (playing) { const h = trigger(k); if (h) h.note = recordLive(k, h.tick); }
      else toggleStep(k);
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
function trigger(k) {
  S.lastKey[S.cur] = k;
  flash = { k, until: performance.now() + 160 };
  if (S.slots[S.cur]?.kind === 'chop') syncPanel();    // trim follows the last slice played
  const sn = snap(), h = playHeld(S.cur, k, k, sn?.when);
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
// Gate (until the pad is let go) or Loop (until it is tapped again).
function playHeld(si, key, pad, when = ctx.currentTime) {
  const id = `${si}:${key}`;
  if (looping.has(id)) { endHeld(looping.get(id)); looping.delete(id); return false; }
  const h = { voice: noteOn(eng, si, key, when, undefined, null, true), at: when };
  if (S.slots[si]?.params.trig === 'loop' && h.voice?.sustain) looping.set(id, h);
  else holding[pad] = h;
  return h;
}
let flash = null;
function toggleStep(k) {
  checkpoint();
  const notes = S.patterns[S.pat][k];
  const mine = notes.filter(n => n.s === S.cur);
  if (mine.length) S.patterns[S.pat][k] = notes.filter(n => n.s !== S.cur);
  else { notes.push({ s: S.cur, k: S.lastKey[S.cur] }); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime); }
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
    let note = notes.find(n => n.s === S.cur && n.k === k && Math.abs((n.o || 0) - o) < 0.1);
    if (!note) notes.push(note = { s: S.cur, k, ...(o > 0.01 && { o }) });
    take?.notes.add(note);
    if (j >= tick) liveSkip.add(`${j}:${S.cur}:${k}`);
    dirty(); return note;
  }
  replaceFrom(j);
  const p = patAt(j), step = j % 16;
  const notes = S.patterns[p][step];
  let note = notes.find(n => n.s === S.cur && n.k === k);
  if (!note) notes.push(note = { s: S.cur, k });
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
  S.fx[to] = [...S.fx[from]];
  copying = null; S.pat = to; if (!playing) S.chain = [to];
  status(`Pattern ${from + 1} copied to ${to + 1}.`); dirty();
}

// ---------------------------------------------------------------------------
// Function buttons
// ---------------------------------------------------------------------------
let chainEdit = false, chainFresh = false;
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
  chainEdit = on; chainFresh = on;
  $('chainBtn').classList.toggle('go', on);
  $('chainBtn').textContent = on ? 'Done chaining' : 'Chain patterns';
  if (on) { S.mode = 'pattern'; status('Tap patterns in the order they should play. The same one can go in more than once.'); }
  else status(S.chain.length > 1 ? `Chain: ${S.chain.map(p => p + 1).join(' → ')}` : '');
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
  status(`Sound ${S.cur + 1} plays as ${{ oneshot: 'One shot: the whole sound', gate: 'Gate: only while held', loop: 'Loop: tap on, tap again off' }[t]}.`);
});
$('pTrig').addEventListener('change', () => {
  checkpoint(); S.slots[S.cur].params.trig = $('pTrig').value; syncPanel();
  for (const [id, h] of looping) if (id.startsWith(S.cur + ':')) { h.voice.stop(ctx.currentTime); looping.delete(id); }
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
    ['Bass', ['bass808', 'subsine', 'wobble', 'growl', 'reese', 'sawbass', 'sqbass', 'fmbass', 'acid', 'uprightbass', 'elecbass']],
    ['Keys', ['piano', 'upright', 'epiano', 'harpsichord', 'pipeorgan', 'renorgan', 'organ']],
    ['Bells and mallets', ['bells', 'vibes', 'marimba', 'glock', 'kalimba']],
    ['Strings', ['harp']],
    ['Synth', ['supersaw', 'strings', 'pad', 'brass', 'choir', 'fmbell', 'glass', 'chip', 'pluck']],
  ]],
  ['Loops', []],
  ['Packs', [
    ['Percussion', ['percussion']],
    ['Video game', ['hits', 'blips', 'lasers', 'glitch', 'coins', 'robots']],
    ['My packs', 'mine:pack'],
  ]],
  ['My Sounds', 'mine:all'],
]];
const EMPTY = { Loops: 'Loops come in a later build: drum loops and more, stretched to your tempo and key.',
  'My Sounds': 'Nothing saved yet. ★ Save to My Sounds (in Settings or the editor) keeps a sound here; ⬆ Import brings in a file.',
  'My packs': 'No packs yet. In My Sounds, Make a pack puts up to 16 of your sounds together.' };
const isPack = id => !!(LIBRARY[id].kit || LIBRARY[id].bank);
// What can be chosen in the browser: { lib: id } a built-in sound, { mine: record } one of yours,
// { from: chosen pack, k } one sound inside a pack.
let bPath = [TREE], bSel = null, mine = [];
const previews = new Map();
const selName = c => c.lib ? LIBRARY[c.lib].name : c.mine ? c.mine.name : `${c.label} (from ${selName(c.from)})`;
const selPack = c => (c.lib ? isPack(c.lib) : c.mine ? c.mine.type === 'pack' : false);
async function refreshMine() { mine = db ? (await idbAll('mine')).sort((a, b) => b.created - a.created) : []; }
function itemsOf(node) {
  const it = node[1];
  if (it === 'mine:all') return mine.map(m => ({ mine: m }));
  if (it === 'mine:pack') return mine.filter(m => m.type === 'pack').map(m => ({ mine: m }));
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
      const n = typeof it[1] === 'string' ? (it[1] === 'mine:pack' ? mine.filter(m => m.type === 'pack').length : mine.length) : count(it);
      small.textContent = n ? `${n}` : '';
      b.addEventListener('click', () => { bPath.push(it); bSel = null; drawBrowser(); });
    } else {
      b.textContent = selName(it).replace(/ \(from .*\)$/, '');
      small.textContent = it.k != null ? `key ${it.k + 1}`
        : it.mine ? (it.mine.type === 'pack' ? `pack · ${it.mine.item.slices?.length || 0} sounds` : 'my sound')
        : selPack(it) ? 'pack · 16 sounds' : 'instrument';
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
  $('bLoad').textContent = bSel ? `Load ${selName(bSel).replace(/ \(from .*\)$/, '')} onto sound ${S.cur + 1}` : `Choose a sound for sound ${S.cur + 1}`;
  // second button: open a pack, or rename / delete one of yours
  const more = $('bMore');
  more.hidden = !bSel || !(selPack(bSel) || bSel.mine);
  more.textContent = bSel && selPack(bSel) ? 'Open pack ▸' : 'Rename / delete';
}
const same = (a, b) => (a.lib && a.lib === b.lib) || (a.mine && b.mine && a.mine.id === b.mine.id) || (a.k != null && a.k === b.k && a.from === b.from);
const count = node => (Array.isArray(node[1]) ? node[1].reduce((n, it) => n + (Array.isArray(it) ? count(it) : 1), 0) : 0);
// The sound a choice stands for, as a slot (built once and kept).
async function slotOf(c) {
  if (c.lib) { if (!previews.has(c.lib)) previews.set(c.lib, factorySlot(c.lib)); return previews.get(c.lib); }
  if (c.mine) return unpackSlot(c.mine);
  return sliceAlone(await slotOf(c.from), c.k, c.label);
}
async function preview(c) {
  const slot = await slotOf(c);
  if (bSel === c) playNote(eng, slot, -1, slot.kind === 'chop' ? 0 : slot.kind === 'sample' ? 7 : 7, ctx.currentTime, { scale: S.scale, bpm: S.bpm, root: S.root });
}
async function loadLibrary(id) {
  checkpoint();
  S.slots[S.cur] = await factorySlot(id); S.lastKey[S.cur] = 0;
  syncPanel(); dirty(); draw();
  status(`${LIBRARY[id].name} → sound ${S.cur + 1}.`);
}
$('bLoad').addEventListener('click', async () => {
  if (!bSel) return;
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
  return { factory: null, kind: 'sample', name: label, params: { ...defParams(), choke: true }, buf };
}

// ---------------------------------------------------------------------------
// My Sounds. A sound is stored whole: its settings and its audio (one or more
// buffers, as raw samples), so it loads anywhere, in any project.
// ---------------------------------------------------------------------------
function packSlot(sl) {
  const bufs = [], at = new Map();
  const ref = b => { if (!b) return null; if (!at.has(b)) { at.set(b, bufs.length); bufs.push({ rate: b.sampleRate, data: b.getChannelData(0).slice() }); } return at.get(b); };
  return { kind: sl.kind, params: { ...sl.params }, synth: sl.synth, zones: sl.zones, base: sl.base, contiguous: sl.contiguous,
    buf: ref(sl.buf), slices: sl.slices?.map(x => ({ ...x, buf: ref(x.buf) })), bufs };
}
function unpackSlot(m) {
  const it = m.item, B = it.bufs.map(b => { const a = ctx.createBuffer(1, b.data.length, b.rate); a.copyToChannel(b.data, 0); return a; });
  return { factory: null, name: m.name, kind: it.kind, params: params(it.params), synth: it.synth, zones: it.zones, base: it.base,
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
  if (ed.sel) { eg.fillStyle = '#1f2a1735'; eg.fillRect(edX(ed.sel[0]), 0, edX(ed.sel[1]) - edX(ed.sel[0]), H); }
  eg.fillStyle = '#1f2a17';
  for (let px = 0; px < W; px++) {
    const a = Math.floor((v0 + (v1 - v0) * px / W) * r), b = Math.max(a + 1, Math.floor((v0 + (v1 - v0) * (px + 1) / W) * r));
    let lo = 0, hi = 0; for (let i = a; i < b; i += Math.max(1, ((b - a) / 40) | 0)) { const v = x[i] || 0; if (v < lo) lo = v; if (v > hi) hi = v; }
    eg.fillRect(px, H / 2 - hi * H * 0.48, 1, Math.max(1, (hi - lo) * H * 0.48));
  }
  eg.font = `${10 * dpr}px ui-monospace, monospace`;
  [0, ...ed.cuts].forEach((c, i) => { eg.fillStyle = '#c21b1b'; eg.fillRect(edX(c), 0, Math.max(1, dpr), H); eg.fillText(String(i + 1), edX(c) + 2 * dpr, 11 * dpr); });
  eg.fillStyle = '#1f7ae0'; eg.fillRect(edX(ed.cur), 0, 2 * dpr, H);
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
  clear: { name: 'Clear pattern', label: () => 'Clear', tap: () => $('clearPat').click() },
  edit: { name: 'Edit sound', label: () => '✂ Edit', tap: () => editCurrent() },
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
for (let i = 0; i < 4; i++) {
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
$('bpm').addEventListener('input', () => { S.bpm = +$('bpm').value; dirty(); draw(); });
document.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => { checkpoint(); S.bpm = +b.dataset.bpm; dirty(); draw(); }));
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
$('scale').addEventListener('change', () => { S.scale = $('scale').value; dirty(); draw(); });
$('root').addEventListener('change', () => { S.root = +$('root').value; dirty(); draw(); });
$('clearPat').addEventListener('click', () => {
  checkpoint();
  S.patterns[S.pat] = Array.from({ length: 16 }, () => []); S.fx[S.pat] = new Array(16).fill(null);
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
}));
// Copy and Paste: the pattern you're on, steps and saved effects.
let clipboard = null;
let soundClip = null;
$('copy').addEventListener('click', () => {
  if (S.mode === 'sound') {
    soundClip = S.cur; draw();
    status(`Sound ${S.cur + 1} (${S.slots[S.cur].name}) copied. Choose another sound and press Paste.`); return;
  }
  clipboard = { from: S.pat, steps: S.patterns[S.pat].map(st => st.map(n => ({ ...n, lock: n.lock && { ...n.lock } }))), fx: [...S.fx[S.pat]] };
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
  S.fx[S.pat] = [...clipboard.fx];
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
async function makeVoice() {
  const text = $('voxText').value.trim(); if (!text) throw new Error('Type something first.');
  if (!vox) { status('Loading the voice engine (about 18 MB the first time)…'); vox = await import('../vox-machina/engine.js'); }
  status('Speaking…');
  let v = await vox.speak(text, { voice: 'en-us', variant: $('voxVariant').value, pitch: +$('voxPitch').value,
    pitchRange: +$('voxRange').value, speed: +$('voxSpeed').value, wordGap: +$('voxGap').value });
  v = vox.stretchVowels(v, +$('voxVowel').value);
  const b = ctx.createBuffer(1, v.samples.length, v.rate); b.copyToChannel(Float32Array.from(v.samples), 0);
  return prepare(ctx, b);
}
const busy = (btn, fn) => async () => {
  btn.disabled = true; ctx.resume();
  try { await fn(); } catch (e) { status(e.message); console.error(e); }
  btn.disabled = false;
};
$('voxMake').addEventListener('click', busy($('voxMake'), async () => {
  const b = await makeVoice();
  const t = $('voxText').value.trim();
  assignBuffer(S.cur, b, '“' + (t.length > 24 ? t.slice(0, 23) + '…' : t) + '”');
}));
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
  for (let t = 0; t < ticks; t++) playTick(e, t, t * stepDur() + (t % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0), false);
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
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
function keyLabel(k) {
  const sl = S.slots[S.cur]; if (!sl) return '';
  switch (S.mode) {
    case 'sound': return S.slots[k]?.name || '';
    case 'pattern': return S.patterns[k].some(st => st.length) ? '●' : '';
    case 'fx': return FX[S.fxSlots[k]][0];
    case 'play': if (S.write && !playing) {
      const f = fxIdx(S.fx[S.pat][k]), ns = S.patterns[S.pat][k].map(n => n.s + 1).join(' ');
      return (ns + (f != null ? ' ' + FX[f][0] : '')).trim();
    } break;
  }
  if (sl.kind === 'chop') return sl.slices[k]?.name || '';
  if (sl.kind === 'sample') {            // a recording has no known pitch: show how far each key moves it
    const d = keySemis(k, S.scale) - 12 + sl.params.pitch + S.root;
    return d === 0 ? 'original' : (d > 0 ? '+' : '−') + Math.abs(d);
  }
  const m = (sl.kind === 'multi' ? sl.base : sl.synth.root) + keySemis(k, S.scale) + sl.params.pitch + S.root;
  return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}
function draw() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  $('write').classList.toggle('on', S.write);
  drawCustom();
  $('paste').disabled = !(S.mode === 'sound' ? soundClip : clipboard);
  $('write').classList.toggle('replace', S.replace);
  $('write').textContent = S.replace ? 'Replace' : 'Write';
  const sl = S.slots[S.cur];
  $('lcdSound').textContent = `${String(S.cur + 1).padStart(2, '0')} ${sl ? sl.name.toUpperCase() : '…'}`;
  $('lcdPat').textContent = S.chain.length > 1 ? `CHAIN ${S.chain.map(p => p + 1).join('·')}` : `PAT ${S.pat + 1}`;
  $('lcdMode').textContent = copying ? `COPY ${copying.toUpperCase()}: TAP WHERE` : {
    play: S.write ? (playing ? (S.replace ? 'WRITE: LIVE, REPLACE' : S.quantGrid ? 'WRITE: LIVE RECORD' : 'WRITE: LIVE, NOT QUANTIZED') : 'WRITE: TAP STEPS') : 'PLAY', sound: 'SOUND: PICK ONE',
    pattern: chainEdit ? 'CHAIN: TAP IN ORDER' : 'PATTERN: PICK ONE',
    fx: S.write && playing ? 'FX: HOLD TO RECORD IT' : 'FX: HOLD A KEY' }[S.mode];
  $('vol').value = S.vol; $('oVol2').textContent = Math.round(S.vol * 100);
  $('lcdInfo').textContent = `${S.bpm} BPM${S.swing > 50 ? ' SW' + S.swing : ''} ${S.scale.toUpperCase().slice(0, 5)}`;
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
  const ink = '#1f2a17', sl = S.slots[S.cur];
  g.fillStyle = ink; g.strokeStyle = ink;
  if (!sl) return;
  const view = waveView();
  if (!view) {                      // synth: live oscilloscope
    const d = new Float32Array(scope.fftSize); scope.getFloatTimeDomainData(d);
    g.lineWidth = 2 * dpr; g.beginPath();
    for (let i = 0; i < d.length; i++) { const x = i / d.length * W, y = H / 2 - d[i] * H * 0.45; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.font = `${10 * dpr}px ui-monospace, monospace`; g.fillText('SYNTH · ' + sl.synth.type.toUpperCase(), 4 * dpr, 12 * dpr);
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
      if (k === lk) { g.fillStyle = '#1f2a1730'; g.fillRect(X, 0, X2 - X, H); g.fillStyle = ink; }
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
    if (S.mode !== 'pattern' && !chainEdit && q.pat !== S.pat && S.chain.length > 1) { S.pat = q.pat; changed = true; }
  }
  if (flash && performance.now() > flash.until) { flash = null; changed = true; }
  if (changed) draw();
  // Redraw the screen only when what it shows has changed (or the scope is
  // moving), so the phone has its time free to answer the keys.
  const sl = S.slots[S.cur], seen = [sl, S.lastKey[S.cur], sl?.slices?.[S.lastKey[S.cur]], cv.clientWidth];
  const scopeLive = sl?.kind === 'synth' && (playing || ctx.currentTime < lastNoteAt + 1.5);
  if (drag != null || scopeLive || seen.some((v, i) => v !== lastSeen[i])) { drawWave(); lastSeen = seen; }
  requestAnimationFrame(frame);
}

let statusTimer = 0;
function status(msg) {
  $('status').textContent = msg; clearTimeout(statusTimer);
  if (msg && !/…$/.test(msg)) statusTimer = setTimeout(() => $('status').textContent = '', 6000);
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
    fx: src.fx.map(f => [...f]), chain: [...src.chain], pat: src.pat, cur: src.cur, lastKey: [...src.lastKey],
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
  const ps = percSlot(), P = S.patterns[S.pat];
  for (let i = 0; i < 16; i++) P[i] = P[i].filter(n => n.s !== ds && n.s !== ps);
  for (const [role, line] of Object.entries(parts)) {
    const hit = findHit(role, ds, ps); if (!hit) continue;
    for (let i = 0; i < 16; i++) if (line[i] === 'x' && !P[i].some(n => n.s === hit.s && n.k === hit.k)) P[i].push({ s: hit.s, k: hit.k, ...(hit.lock && { lock: hit.lock }) });
  }
  // An open hat and a closed hat on the same step: the open one wins.
  const hat = findHit('hat', ds, ps), open = findHit('open', ds, ps);
  if (hat && open && (hat.s !== open.s || hat.k !== open.k))
    for (let i = 0; i < 16; i++) if (P[i].some(n => n.s === open.s && n.k === open.k)) P[i] = P[i].filter(n => !(n.s === hat.s && n.k === hat.k));
  if (setTempo) { S.bpm = style.bpm; S.swing = style.swing; }
  dirty(); draw();
  return true;
}
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
const KITS_MENU = [['Recorded kits', ['acoustic', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly']],
  ['Drum machines', ['kit808', 'kit909', 'kitcr78', 'kit606', 'kitminimal']]];
for (const [g, ids] of KITS_MENU) {
  const og = document.createElement('optgroup'); og.label = g;
  for (const id of ids) og.appendChild(new Option(LIBRARY[id].name, id));
  $('kitSel').appendChild(og);
}
$('kitSel').addEventListener('change', async () => {
  const id = $('kitSel').value, si = drumSlot() >= 0 ? drumSlot() : 8;
  checkpoint();
  S.slots[si] = await factorySlot(id); S.lastKey[si] = 0;
  syncPanel(); dirty(); draw(); noteOn(eng, si, 0, ctx.currentTime + 0.01);
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
      kind: sl.kind, name: sl.name, params: sl.params, synth: sl.synth, contiguous: sl.contiguous, buf: ref(sl.buf), zones: sl.zones, base: sl.base,
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
  for (let i = 0; i < 16; i++) {
    const s = saved?.slots?.[i];
    try {
      if (s && s.factory == null) {
        const slot = { factory: null, kind: s.kind, name: s.name, params: params(s.params), synth: s.synth, contiguous: s.contiguous, buf: await getBuf(s.buf), zones: s.zones, base: s.base };
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
  if (saved) { for (const k of ['patterns', 'fx', 'pat', 'chain', 'bpm', 'swing', 'scale', 'root', 'vol', 'quantGrid', 'fxTarget', 'fxAmt', 'fxSlots', 'fxLatch', 'muteBeat', 'custom', 'cur', 'lastKey']) if (saved[k] != null) S[k] = saved[k];
    if (saved.quantGrid == null && saved.quant === false) S.quantGrid = 0;      // the old on/off Quantize
    // Effects used to be saved by key number; now by name.
    const name = e => (typeof e === 'number' ? DEFAULT_SLOTS[e] : e && typeof e.f === 'number' ? { ...e, f: DEFAULT_SLOTS[e.f] } : e);
    S.fx = S.fx.map(row => row.map(name));
    if (Array.isArray(S.fxAmt)) S.fxAmt = Object.fromEntries(S.fxAmt.map((v, i) => [DEFAULT_SLOTS[i], v]));
    S.custom = S.custom.map(c => (/^fx\d+$/.test(c) ? 'fx:' + DEFAULT_SLOTS[+c.slice(2)] : c));
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

draw();
load().then(() => status('Ready. Press ▶ Play, or tap the keys.'));
requestAnimationFrame(frame);
