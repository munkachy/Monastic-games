// Pocket Sampler: a 16-key sampler and step sequencer in the manner of a
// pocket drum machine. Sounds 1-8 are melodic, 9-16 are kits and chops.
// State is saved in IndexedDB, so recordings and patterns survive a reload.
import { Engine, playNote, makeKit, blessMe, prepare, onsets, keySemis, SCALES, FAMILIES, WOBBLE_RATES, SR } from './audio.js';

const $ = id => document.getElementById(id);
const capture = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
const eng = new Engine(ctx);
const engReady = eng.init();
const scope = ctx.createAnalyser(); scope.fftSize = 1024; eng.master.connect(scope);

// ---------------------------------------------------------------------------
// The factory sounds
// ---------------------------------------------------------------------------
const FACTORY = [
  { name: '808 Bass', synth: { type: 'sub', root: 36, drive: 2.5 }, len: 0.4 },
  { name: 'Wobble', synth: { type: 'wobble', root: 36, cutoff: 160, res: 10, depth: 1700, rate: 2, hold: true, drive: 2 }, len: 0.38 },
  { name: 'Reese', synth: { type: 'reese', root: 36, cutoff: 650, res: 2, hold: true, drive: 1.5 }, len: 0.3 },
  { name: 'Acid', synth: { type: 'acid', root: 48, cutoff: 280, res: 16, drive: 2 }, len: 0.12 },
  { name: 'Chip lead', synth: { type: 'chip', root: 60 }, len: 0.1 },
  { name: 'Pluck', synth: { type: 'pluck', root: 60, cutoff: 700, res: 3 }, len: 0.15 },
  { name: 'Organ', synth: { type: 'organ', root: 48, attack: 0.03, hold: true }, len: 0.3 },
  { name: 'Choir', synth: { type: 'choir', root: 48, attack: 0.12, hold: true }, len: 0.5 },
  { name: '808 Kit', kit: '808' }, { name: '909 Kit', kit: '909' },
  { name: '8-bit Hits', bank: 'hits' }, { name: 'Blips', bank: 'blips' }, { name: 'Lasers', bank: 'lasers' },
  { name: 'Glitch', bank: 'glitch' }, { name: 'Coins', bank: 'coins' }, { name: 'Robots', bank: 'robots' },
];
const defParams = () => ({ vol: 0.8, pitch: 0, tone: 1, len: 1, choke: false });
let banks = null;
const kitCache = {};

async function factorySlot(i) {
  const F = FACTORY[i], slot = { factory: i, name: F.name, params: defParams() };
  if (F.synth) Object.assign(slot, { kind: 'synth', synth: { ...F.synth } }), slot.params.len = F.len;
  else if (F.kit) {
    kitCache[F.kit] ||= await makeKit(F.kit);
    Object.assign(slot, { kind: 'chop', slices: kitCache[F.kit].map(d => ({ buf: d.buf, s: 0, e: d.buf.duration, name: d.name })) });
  } else {
    if (!banks) banks = await (await fetch('sounds/banks.json')).json();
    const B = banks[F.bank];
    B.buf ||= await decode(await (await fetch(`sounds/${F.bank}.wav`)).arrayBuffer());
    Object.assign(slot, { kind: 'chop', buf: B.buf, slices: B.slices.map(([a, b], k) => ({ s: a / 22050, e: b / 22050, name: shortName(B.from[k]) })) });
  }
  return slot;
}
const shortName = s => s.replace(/^sfx_/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18);
function decode(ab) { return new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad)); }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const S = {
  slots: [], cur: 0, lastKey: new Array(16).fill(0), mode: 'play',
  patterns: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [])),
  pat: 0, chain: [0], bpm: 120, swing: 50, scale: 'minor', root: 0,
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
  playing = false; clearTimeout(timer); uiQueue.length = 0; headStep = -1; headTick = -1;
  $('play').classList.remove('on'); $('play').textContent = '▶ Play';
  for (const f of activeFx) releaseFx(f);
  draw();
}
function schedule() {
  while (nextT < ctx.currentTime + 0.12) {
    if (tick % 16 === 0 && pendingChain) {      // a new pattern starts at the top of the bar
      S.chain = pendingChain; pendingChain = null; tick = 0;
    }
    const sw = tick % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0;
    playTick(eng, tick, nextT + sw, true);
    nextT += stepDur(); tick++;
  }
  timer = setTimeout(schedule, 25);
}

// Which tick of the pattern to play now, and how many times (rolls), given
// the sequencer effect being held.
function mapTick(t) {
  const f = seqFx;
  if (!f) return [t, 1];
  const d = t - f.anchor;
  if (d < 0) return [t, 1];
  switch (f.seq) {
    case 'loop': return [f.anchor + (d % f.L), f.r || 1];
    case 'half': return d % 2 ? [null, 0] : [f.anchor + d / 2, 1];
    case 'glitch': return [f.anchor - (f.anchor % 16) + ((Math.random() * 16) | 0), Math.random() < 0.3 ? 2 + ((Math.random() * 2) | 0) : 1];
  }
  return [t, 1];
}
function playTick(e, t, when, live) {
  const [src, r] = live ? mapTick(t) : [t, 1];
  const p = patAt(src ?? t), step = (src ?? t) % 16;
  if (live) uiQueue.push({ t: when, tick: t, step, pat: p });
  if (src == null) return;
  for (const n of S.patterns[p][step]) {
    if (live && liveSkip.delete(`${t}:${n.s}:${n.k}`)) continue;
    for (let i = 0; i < r; i++) noteOn(e, n.s, n.k, when + i * stepDur() / r, live);
  }
}
function noteOn(e, si, k, when, live = true) {
  const slot = S.slots[si]; if (!slot) return;
  const m = live ? mods : {};
  playNote(e, slot, si, k, when, { rate: m.rate || 1, reverse: m.reverse, unison: m.unison, scale: S.scale, bpm: S.bpm, root: S.root });
}

// ---------------------------------------------------------------------------
// Effects: hold a key in FX mode
// ---------------------------------------------------------------------------
const FX = [
  ['Loop 1/4', { seq: 'loop', L: 4 }], ['Loop 1/8', { seq: 'loop', L: 2 }], ['Loop 1/16', { seq: 'loop', L: 1 }], ['Roll 1/32', { seq: 'loop', L: 1, r: 2 }],
  ['Roll ×3', { seq: 'loop', L: 1, r: 3 }], ['Half time', { seq: 'half' }], ['Scramble', { seq: 'glitch' }], ['Tape stop', { audio: 'tape' }],
  ['Octave up', { mod: 'up' }], ['Octave down', { mod: 'down' }], ['Reverse', { mod: 'reverse' }], ['Unison', { mod: 'unison' }],
  ['Crush', { audio: 'crush' }], ['Low pass', { audio: 'lowpass' }], ['High pass', { audio: 'highpass' }], ['Echo', { audio: 'echo' }],
];
const activeFx = new Set();
let seqFx = null, mods = {};
function engageFx(k) {
  const f = FX[k][1]; activeFx.add(k); ctx.resume();
  if (f.seq) {
    const at = headTick >= 0 ? headTick : tick;
    const L = f.L || 16;
    seqFx = { ...f, k, anchor: f.seq === 'loop' ? at - (at % L) : at + 1 };
  }
  if (f.audio) eng.setFx(f.audio, true, stepDur());
  if (f.mod) recalcMods();
}
function releaseFx(k) {
  const f = FX[k][1]; activeFx.delete(k);
  if (f.seq && seqFx?.k === k) seqFx = null;
  if (f.audio) eng.setFx(f.audio, false, stepDur());
  if (f.mod) recalcMods();
}
function recalcMods() {
  mods = { rate: 1 };
  for (const k of activeFx) {
    const m = FX[k][1].mod;
    if (m === 'up') mods.rate *= 2; if (m === 'down') mods.rate /= 2;
    if (m === 'reverse') mods.reverse = true; if (m === 'unison') mods.unison = true;
  }
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
function press(k) {
  if (down.has(k)) return;
  down.add(k); ctx.resume();
  switch (S.mode) {
    case 'sound': S.cur = k; S.lastKey[k] ||= 0; noteOn(eng, k, S.lastKey[k], ctx.currentTime + 0.005); syncPanel(); dirty(); break;
    case 'pattern':
      if (chainEdit) { if (chainFresh) { S.chain = []; chainFresh = false; } S.chain.push(k); S.pat = k; pendingChain = null; }
      else { S.pat = k; if (playing) pendingChain = [k]; else S.chain = [k]; }
      dirty(); break;
    case 'fx': engageFx(k); break;
    case 'write':
      if (playing) { trigger(k); recordLive(k); }
      else toggleStep(k);
      break;
    default: trigger(k);
  }
  draw();
}
function release(k) {
  if (!down.delete(k)) return;
  if (S.mode === 'fx' || activeFx.has(k)) releaseFx(k);
  draw();
}
function trigger(k) {
  S.lastKey[S.cur] = k;
  noteOn(eng, S.cur, k, ctx.currentTime + 0.005);
  flash = { k, until: performance.now() + 160 };
}
let flash = null;
function toggleStep(k) {
  const notes = S.patterns[S.pat][k];
  const mine = notes.filter(n => n.s === S.cur);
  if (mine.length) S.patterns[S.pat][k] = notes.filter(n => n.s !== S.cur);
  else { notes.push({ s: S.cur, k: S.lastKey[S.cur] }); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime + 0.005); }
  dirty();
}
// Put what was just played on the nearest step.
function recordLive(k) {
  const jf = tick - (nextT - ctx.currentTime) / stepDur();
  const j = Math.max(0, Math.round(jf)), p = patAt(j), step = j % 16;
  const notes = S.patterns[p][step];
  if (!notes.some(n => n.s === S.cur && n.k === k)) notes.push({ s: S.cur, k });
  if (j >= tick) liveSkip.add(`${j}:${S.cur}:${k}`);
  dirty();
}

// ---------------------------------------------------------------------------
// Function buttons
// ---------------------------------------------------------------------------
let chainEdit = false, chainFresh = false;
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.mode;
  S.mode = S.mode === m ? 'play' : m;
  if (S.mode !== 'fx') for (const f of [...activeFx]) releaseFx(f);
  if (S.mode !== 'pattern' && chainEdit) setChainEdit(false);
  draw();
}));
$('play').addEventListener('click', () => playing ? stop() : start());
$('chainBtn').addEventListener('click', () => setChainEdit(!chainEdit));
function setChainEdit(on) {
  chainEdit = on; chainFresh = on;
  $('chainBtn').classList.toggle('go', on);
  $('chainBtn').textContent = on ? 'Done chaining' : 'Chain patterns';
  if (on) { S.mode = 'pattern'; status('Tap patterns in the order they should play.'); }
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
$('dice').addEventListener('click', () => { ctx.resume(); roll(false); });
$('rollAll').addEventListener('click', () => { ctx.resume(); roll(true); });
function roll(all) {
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
  S.slots[S.cur] = await factorySlot(S.cur); S.lastKey[S.cur] = 0; syncPanel(); dirty(); draw();
  status(`Sound ${S.cur + 1} is ${S.slots[S.cur].name} again.`);
});

// ---------------------------------------------------------------------------
// Sound panel
// ---------------------------------------------------------------------------
const PARAMS = [['pVol', 'vol', v => Math.round(v * 100)], ['pPitch', 'pitch', v => (v > 0 ? '+' : '') + v],
  ['pTone', 'tone', v => Math.round(v * 100)], ['pLen', 'len', v => Math.round(v * 100) + '%']];
for (const [id, key, fmt] of PARAMS) $(id).addEventListener('input', () => {
  const v = +$(id).value; S.slots[S.cur].params[key] = v; $('o' + id.slice(1)).textContent = fmt(v); dirty();
});
$('pChoke').addEventListener('change', () => { S.slots[S.cur].params.choke = $('pChoke').checked; dirty(); });
$('pWob').addEventListener('input', () => {
  const sl = S.slots[S.cur]; if (sl.synth) sl.synth.rate = +$('pWob').value;
  $('oWob').textContent = WOBBLE_RATES[+$('pWob').value][1]; dirty();
});
function syncPanel() {
  const sl = S.slots[S.cur]; if (!sl) return;
  for (const [id, key, fmt] of PARAMS) { $(id).value = sl.params[key]; $('o' + id.slice(1)).textContent = fmt(sl.params[key]); }
  $('pChoke').checked = !!sl.params.choke;
  const wob = sl.synth?.type === 'wobble';
  $('wobRow').style.display = wob ? '' : 'none';
  if (wob) { $('pWob').value = sl.synth.rate; $('oWob').textContent = WOBBLE_RATES[sl.synth.rate][1]; }
  $('rollAll').style.display = S.cur >= 8 ? '' : 'none';
  $('soundNote').textContent = `Sound ${S.cur + 1}: ${sl.name}. ` + (sl.kind === 'synth' ? 'Synth: Length is how long each note rings.'
    : sl.kind === 'chop' ? 'Each key is one slice.' : 'Key 8 plays it at its own pitch; the others go up and down the scale.');
}
for (const f of FAMILIES) $('family').add(new Option(f[0].toUpperCase() + f.slice(1), f));

// Beat panel
for (const s of Object.keys(SCALES)) $('scale').add(new Option(s[0].toUpperCase() + s.slice(1), s));
['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].forEach((n, i) => $('root').add(new Option(n, i)));
$('bpm').addEventListener('input', () => { S.bpm = +$('bpm').value; dirty(); draw(); });
$('swing').addEventListener('input', () => { S.swing = +$('swing').value; dirty(); draw(); });
$('scale').addEventListener('change', () => { S.scale = $('scale').value; dirty(); draw(); });
$('root').addEventListener('change', () => { S.root = +$('root').value; dirty(); draw(); });
$('clearPat').addEventListener('click', () => { S.patterns[S.pat] = Array.from({ length: 16 }, () => []); dirty(); draw(); status(`Pattern ${S.pat + 1} cleared.`); });
$('clearSound').addEventListener('click', () => {
  S.patterns[S.pat] = S.patterns[S.pat].map(st => st.filter(n => n.s !== S.cur)); dirty(); draw();
  status(`Sound ${S.cur + 1} taken out of pattern ${S.pat + 1}.`);
});
$('copyPat').addEventListener('click', () => {
  const to = (S.pat + 1) % 16;
  S.patterns[to] = S.patterns[S.pat].map(st => st.map(n => ({ ...n })));
  status(`Pattern ${S.pat + 1} copied to ${to + 1}.`); dirty(); draw();
});
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === b.dataset.tab));
}));
$('voxBtn').addEventListener('click', () => {
  document.querySelector('[data-tab="tVoice"]').click();
  $('tVoice').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ---------------------------------------------------------------------------
// Voice, from Vox Machina's eSpeak NG engine
// ---------------------------------------------------------------------------
const VARIANTS = [['', 'Default'], ['m3', 'Male 3'], ['m7', 'Male 7'], ['f2', 'Female 2'], ['robosoft', 'Robosoft'],
  ['robosoft5', 'Robosoft 5'], ['UniRobot', 'UniRobot'], ['anikaRobot', 'Anika Robot'], ['whisper', 'Whisper'],
  ['croak', 'Croak'], ['Demonic', 'Demonic'], ['Storm', 'Storm'], ['Tweaky', 'Tweaky'], ['grandpa', 'Grandpa'], ['announcer', 'Announcer']];
for (const [v, l] of VARIANTS) $('voxVariant').add(new Option(l, v));
$('voxVariant').value = 'robosoft';
const voxOut = [['voxPitch', v => v], ['voxRange', v => v == 0 ? 'flat' : v], ['voxSpeed', v => v], ['voxVowel', v => Math.round(v * 100) + '%']];
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
    pitchRange: +$('voxRange').value, speed: +$('voxSpeed').value, wordGap: 0 });
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
$('export').addEventListener('click', busy($('export'), async () => {
  const ticks = 16 * S.chain.length, len = ticks * stepDur(), tail = 2.5;
  const off = new OfflineAudioContext(1, Math.ceil((len + tail) * SR), SR);
  const e = new Engine(off, { live: false });
  for (let t = 0; t < ticks; t++) playTick(e, t, t * stepDur() + (t % 2 ? (2 * S.swing / 100 - 1) * stepDur() : 0), false);
  status('Rendering…');
  const buf = await off.startRendering(), x = buf.getChannelData(0), n = Math.round(len * SR);
  for (let i = n; i < x.length; i++) x[i % n] += x[i];
  const loop = x.subarray(0, n);
  let top = 0; for (const v of loop) top = Math.max(top, Math.abs(v));
  if (top > 0.98) for (let i = 0; i < n; i++) loop[i] *= 0.98 / top;
  const name = `pocket-${S.bpm}bpm-pattern${S.chain.map(p => p + 1).join('-')}.wav`;
  const file = new File([wav(loop, SR)], name, { type: 'audio/wav' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); status(''); return; } catch (err) { if (err.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status(`Saved ${name} (${len.toFixed(2)} s, ${S.chain.length * 4} beats).`);
}));
function wav(x, rate) {
  const v = new DataView(new ArrayBuffer(44 + x.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + x.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 32767, true);
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
    case 'fx': return FX[k][0];
    case 'write': if (!playing) return S.patterns[S.pat][k].length ? S.patterns[S.pat][k].map(n => n.s + 1).join(' ') : ''; break;
  }
  if (sl.kind === 'chop') return sl.slices[k]?.name || '';
  if (sl.kind === 'sample') {            // a recording has no known pitch: show how far each key moves it
    const d = keySemis(k, S.scale) - 12 + sl.params.pitch + S.root;
    return d === 0 ? 'original' : (d > 0 ? '+' : '−') + Math.abs(d);
  }
  const m = sl.synth.root + keySemis(k, S.scale) + sl.params.pitch + S.root;
  return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}
function draw() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  const sl = S.slots[S.cur];
  $('lcdSound').textContent = `${String(S.cur + 1).padStart(2, '0')} ${sl ? sl.name.toUpperCase() : '…'}`;
  $('lcdPat').textContent = S.chain.length > 1 ? `CHAIN ${S.chain.map(p => p + 1).join('·')}` : `PAT ${S.pat + 1}`;
  $('lcdMode').textContent = { play: 'PLAY', sound: 'SOUND: PICK ONE', pattern: chainEdit ? 'CHAIN: TAP IN ORDER' : 'PATTERN: PICK ONE',
    write: playing ? 'WRITE: LIVE RECORD' : 'WRITE: TAP STEPS', fx: 'FX: HOLD A KEY' }[S.mode];
  $('lcdInfo').textContent = `${S.bpm} BPM${S.swing > 50 ? ' SW' + S.swing : ''} ${S.scale.toUpperCase().slice(0, 5)}`;
  $('bpm').value = S.bpm; $('oBpm').textContent = S.bpm; $('swing').value = S.swing; $('oSwing').textContent = S.swing + '%';
  $('scale').value = S.scale; $('root').value = S.root;
  for (let k = 0; k < 16; k++) {
    const el = keyEls[k], steps = S.patterns[S.pat][k];
    let lit = false, some = false, cur = false;
    switch (S.mode) {
      case 'sound': cur = k === S.cur; break;
      case 'pattern': cur = k === S.pat; lit = S.chain.includes(k) && (playing ? k === headPat : true); some = S.patterns[k].some(s => s.length); break;
      case 'fx': lit = activeFx.has(k); break;
      default: lit = steps.some(n => n.s === S.cur); some = !lit && steps.length > 0;
    }
    el.classList.toggle('lit', lit); el.classList.toggle('some', some); el.classList.toggle('cur', cur);
    el.classList.toggle('head', playing && k === headStep && S.mode !== 'sound' && S.mode !== 'pattern');
    el.classList.toggle('down', down.has(k) || (flash?.k === k && performance.now() < flash.until));
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
  if (k >= 0) { S.lastKey[S.cur] = k; noteOn(eng, S.cur, k, ctx.currentTime + 0.005); flash = { k, until: performance.now() + 160 }; draw(); }
});
cv.addEventListener('pointermove', ev => {
  if (drag == null) return;
  const v = waveView(), r = cv.getBoundingClientRect(), sl = S.slots[S.cur];
  const T = v.a + (ev.clientX - r.left) / r.width * (v.b - v.a), m = sl.slices;
  const lo = m[drag - 1].s + 0.01, hi = (m[drag + 1]?.s ?? v.b) - 0.01;
  m[drag].s = Math.min(hi, Math.max(lo, T)); m[drag - 1].e = m[drag].s;
});
const endDrag = () => { if (drag != null) { S.lastKey[S.cur] = drag; noteOn(eng, S.cur, drag, ctx.currentTime + 0.005); drag = null; dirty(); } };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

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
  drawWave();
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
// Saving: IndexedDB. Factory sounds are saved by number; recorded and rolled
// sound is saved as raw samples, each buffer once, under its own id.
// ---------------------------------------------------------------------------
let db = null, saveTimer = 0;
function openDb() {
  return new Promise(ok => {
    try {
      const r = indexedDB.open('pocket-sampler', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('state'); r.result.createObjectStore('bufs'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
}
const idbGet = (store, key) => new Promise(ok => {
  try { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }
  catch (e) { ok(null); }
});
function dirty() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; save(); } }
let bufSeq = 0;
function save() {
  saveTimer = 0;
  if (!db) return;
  try {
    const tx = db.transaction(['state', 'bufs'], 'readwrite'), bufs = tx.objectStore('bufs'), used = new Set();
    const ref = b => {
      if (!b) return null;
      if (!b.id) { b.id = `b${Date.now().toString(36)}${(bufSeq++).toString(36)}`; bufs.put({ rate: b.sampleRate, data: b.getChannelData(0).slice() }, b.id); }
      used.add(b.id); return b.id;
    };
    const slots = S.slots.map(sl => sl.factory != null ? { factory: sl.factory, params: sl.params, synth: sl.synth } : {
      kind: sl.kind, name: sl.name, params: sl.params, synth: sl.synth, contiguous: sl.contiguous, buf: ref(sl.buf),
      slices: sl.slices?.map(s => ({ s: s.s, e: s.e, name: s.name, buf: ref(s.buf) })),
    });
    const { mode, ...rest } = S;
    tx.objectStore('state').put({ ...rest, slots }, 'v1');
    const keys = bufs.getAllKeys();
    keys.onsuccess = () => { for (const k of keys.result) if (!used.has(k)) bufs.delete(k); };
  } catch (e) { console.warn('Not saved:', e); }
}
async function load() {
  db = await openDb();
  const saved = db && await idbGet('state', 'v1');
  const getBuf = async id => {
    if (!id) return null;
    const r = await idbGet('bufs', id); if (!r) return null;
    const b = ctx.createBuffer(1, r.data.length, r.rate); b.copyToChannel(r.data, 0); b.id = id; return b;
  };
  for (let i = 0; i < 16; i++) {
    const s = saved?.slots?.[i];
    try {
      if (s && s.factory == null) {
        const slot = { factory: null, kind: s.kind, name: s.name, params: s.params, synth: s.synth, contiguous: s.contiguous, buf: await getBuf(s.buf) };
        if (s.slices) slot.slices = await Promise.all(s.slices.map(async x => ({ s: x.s, e: x.e, name: x.name, buf: await getBuf(x.buf) })));
        if (slot.kind === 'synth' || slot.buf || slot.slices?.every(x => x.buf || slot.buf)) { S.slots[i] = slot; continue; }
      }
      S.slots[i] = await factorySlot(i);
      if (s?.factory === i) { Object.assign(S.slots[i].params, s.params); if (s.synth) S.slots[i].synth = s.synth; }
    } catch (e) { console.warn('Sound', i + 1, e); S.slots[i] = await factorySlot(i).catch(() => null); }
    if (i === S.cur) { syncPanel(); draw(); }
  }
  if (saved) { for (const k of ['patterns', 'pat', 'chain', 'bpm', 'swing', 'scale', 'root', 'cur', 'lastKey']) if (saved[k] != null) S[k] = saved[k]; }
  else demo();
  syncPanel(); draw();
}
// A first beat, so pressing play does something.
function demo() {
  const P = S.patterns[0], put = (s, k, steps) => steps.forEach(i => P[i].push({ s, k }));
  put(8, 0, [0, 6, 10]); put(8, 3, [4, 12]); put(8, 4, [2, 6, 10, 14]); put(8, 5, [15]);
  put(0, 0, [0, 6]); put(0, 2, [10]); put(0, 4, [11]);
  put(11, 3, [3]); put(11, 9, [13]);
  S.cur = 8;
}

draw();
load().then(() => status('Ready. Press ▶ Play, or tap the keys.'));
requestAnimationFrame(frame);
