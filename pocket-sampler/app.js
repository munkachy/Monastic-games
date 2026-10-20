// Pocket Sampler: a 16-key sampler and step sequencer in the manner of a
// pocket drum machine. Sounds 1-8 are melodic, 9-16 are kits and chops.
// State is saved in IndexedDB, so recordings and patterns survive a reload.
// Bump ?v= on app.js (index.html), audio.js (here) and the front-page link
// with each release, so phones fetch the new files instead of cached ones.
import { Engine, playNote, makeKit, blessMe, prepare, onsets, keySemis, SCALES, FAMILIES, WOBBLE_RATES, SR } from './audio.js?v=20261020a';

const $ = id => document.getElementById(id);
const capture = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
const eng = new Engine(ctx);
const engReady = eng.init();
const scope = ctx.createAnalyser(); scope.fftSize = 1024; eng.master.connect(scope);

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
  acoustic: { name: 'Acoustic Kit', bank: 'acoustic' }, percussion: { name: 'Percussion', bank: 'percussion' },
  kit808: { name: '808 Kit', kit: '808' }, kit909: { name: '909 Kit', kit: '909' },
  hits: { name: '8-bit Hits', bank: 'hits' }, blips: { name: 'Blips', bank: 'blips' }, lasers: { name: 'Lasers', bank: 'lasers' },
  glitch: { name: 'Glitch', bank: 'glitch' }, coins: { name: 'Coins', bank: 'coins' }, robots: { name: 'Robots', bank: 'robots' },
};
const DEFAULT = ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir',
  'acoustic', 'kit808', 'kit909', 'percussion', 'blips', 'lasers', 'glitch', 'coins'];
// The first version saved sounds by number, in this order.
const OLD_ORDER = ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir',
  'kit808', 'kit909', 'hits', 'blips', 'lasers', 'glitch', 'coins', 'robots'];
const defParams = () => ({ vol: 0.8, pitch: 0, filter: 0, res: 0, start: 0, len: 1, choke: false });
let banks = null;
const kitCache = {};

async function factorySlot(id) {
  const F = LIBRARY[id], slot = { factory: id, name: F.name, params: defParams() };
  if (F.synth) Object.assign(slot, { kind: 'synth', synth: { ...F.synth } }), slot.params.len = F.len;
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
const shortName = s => s.replace(/^sfx_/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18);
function decode(ab) { return new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad)); }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const S = {
  slots: [], cur: 0, lastKey: new Array(16).fill(0), mode: 'play',
  patterns: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [])),
  fx: Array.from({ length: 16 }, () => new Array(16).fill(null)),   // effects saved on steps
  pat: 0, chain: [0], bpm: 120, swing: 50, scale: 'minor', root: 0, vol: 0.9, write: false,
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
  if (eng.recAudio) { eng.setFx(eng.recAudio, false, stepDur()); eng.recAudio = null; }
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

// The effect on tick t: the one held now, or else the one saved on that step.
const savedFx = t => S.fx[patAt(t)][t % 16];
// Which tick of the pattern to play, and how many times (rolls).
function mapTick(t, held) {
  let f = held ? seqFx : null, anchor = f?.anchor;
  if (!held) {
    const i = savedFx(t);
    if (i != null && FX[i][1].seq) {
      f = FX[i][1]; anchor = t;                // a saved loop starts where its run of steps starts
      while (anchor > 0 && t - anchor < 16 && savedFx(anchor - 1) === i) anchor--;
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
  // Write is on and an effect is held: save it on this step.
  if (held && S.write) { S.fx[patAt(t)][t % 16] = lastFx; dirty(); }
  const fxs = held ? [...activeFx] : savedFx(t) != null ? [savedFx(t)] : [];
  // Saved audio effects (crush, filter, echo, tape) switch on and off on the beat.
  if (!held) {
    const want = fxs.length && FX[fxs[0]][1].audio || null;
    if (want !== e.recAudio) {
      if (e.recAudio) e.setFx(e.recAudio, false, stepDur(), when);
      if (want) e.setFx(want, true, stepDur(), when);
      e.recAudio = want;
    }
  }
  const [src, r] = mapTick(t, held);
  const p = patAt(src ?? t), step = (src ?? t) % 16;
  if (live) uiQueue.push({ t: when, tick: t, step, pat: p });
  if (src == null) return;
  const m = modsOf(fxs);
  for (const n of S.patterns[p][step]) {
    if (live && liveSkip.delete(`${t}:${n.s}:${n.k}`)) continue;
    for (let i = 0; i < r; i++) noteOn(e, n.s, n.k, when + i * stepDur() / r, m, n.lock);
  }
}
function noteOn(e, si, k, when, m = modsOf([...activeFx]), lock = null) {
  const slot = S.slots[si]; if (!slot) return;
  playNote(e, slot, si, k, when, { rate: m.rate, reverse: m.reverse, unison: m.unison, scratch: m.scratch, lock,
    scale: S.scale, bpm: S.bpm, root: S.root });
}

// ---------------------------------------------------------------------------
// Effects: hold a key in FX mode. With Write on while playing, the effect is
// saved on each step it is held through, as on the PO-33.
// ---------------------------------------------------------------------------
const FX = [
  ['Loop 1/4', { seq: 'loop', L: 4 }], ['Loop 1/8', { seq: 'loop', L: 2 }], ['Loop 1/16', { seq: 'loop', L: 1 }], ['Roll 1/32', { seq: 'loop', L: 1, r: 2 }],
  ['Scratch', { mod: 'scratch', f: 6 }], ['Half time', { seq: 'half' }], ['Scramble', { seq: 'glitch' }], ['Tape stop', { audio: 'tape' }],
  ['Octave up', { mod: 'up' }], ['Octave down', { mod: 'down' }], ['Reverse', { mod: 'reverse' }], ['Unison', { mod: 'unison' }],
  ['Crush', { audio: 'crush' }], ['Low pass', { audio: 'lowpass' }], ['Scratch fast', { mod: 'scratch', f: 15 }], ['Echo', { audio: 'echo' }],
];
const activeFx = new Set();
let seqFx = null, lastFx = null;
function engageFx(k) {
  const f = FX[k][1]; activeFx.add(k); lastFx = k; ctx.resume();
  if (eng.recAudio) { eng.setFx(eng.recAudio, false, stepDur()); eng.recAudio = null; }
  if (f.seq) {
    const at = headTick >= 0 ? headTick : tick;
    const L = f.L || 16;
    seqFx = { ...f, k, anchor: f.seq === 'loop' ? at - (at % L) : at + 1 };
  }
  if (f.audio) eng.setFx(f.audio, true, stepDur());
}
function releaseFx(k) {
  const f = FX[k][1]; activeFx.delete(k);
  if (f.seq && seqFx?.k === k) seqFx = null;
  if (f.audio) eng.setFx(f.audio, false, stepDur());
}
function modsOf(list) {
  const m = { rate: 1 };
  for (const k of list) {
    const f = FX[k][1];
    if (f.mod === 'up') m.rate *= 2; if (f.mod === 'down') m.rate /= 2;
    if (f.mod === 'reverse') m.reverse = true; if (f.mod === 'unison') m.unison = true;
    if (f.mod === 'scratch') m.scratch = f.f;
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
  down.add(k); ctx.resume();
  if (recBtn.classList.contains('held')) {     // Rec + key: record into that sound
    S.cur = k; syncPanel(); status(`● Recording into sound ${k + 1}… let go to stop.`); draw(); return;
  }
  switch (S.mode) {
    case 'sound':
      if (copying === 'sound') { copySound(S.cur, k); break; }
      S.cur = k; S.lastKey[k] ||= 0; noteOn(eng, k, S.lastKey[k], ctx.currentTime + 0.005); syncPanel(); persist(); break;
    case 'pattern':
      if (copying === 'pattern') { copyPattern(S.pat, k); break; }
      if (chainEdit) { checkpoint(); if (chainFresh) { S.chain = []; chainFresh = false; } S.chain.push(k); S.pat = k; pendingChain = null; }
      else { S.pat = k; if (playing) pendingChain = [k]; else S.chain = [k]; persist(); break; }
      dirty(); break;
    case 'fx': engageFx(k); break;
    default:
      if (!S.write) trigger(k);
      else if (playing) { trigger(k); recordLive(k); }
      else toggleStep(k);
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
  if (S.slots[S.cur]?.kind === 'chop') syncPanel();    // trim follows the last slice played
}
let flash = null;
function toggleStep(k) {
  checkpoint();
  const notes = S.patterns[S.pat][k];
  const mine = notes.filter(n => n.s === S.cur);
  if (mine.length) S.patterns[S.pat][k] = notes.filter(n => n.s !== S.cur);
  else { notes.push({ s: S.cur, k: S.lastKey[S.cur] }); noteOn(eng, S.cur, S.lastKey[S.cur], ctx.currentTime + 0.005); }
  dirty();
}
// Put what was just played on the nearest step (swing included).
function recordLive(k) {
  const now = ctx.currentTime, sd = stepDur(), sw = (2 * S.swing / 100 - 1) * sd;
  let j = Math.max(0, Math.round(tick - (nextT - now) / sd)), best = Infinity;
  for (const c of [j - 1, j, j + 1]) {
    if (c < 0) continue;
    const d = Math.abs(nextT - (tick - c) * sd + (c % 2 ? sw : 0) - now);
    if (d < best) { best = d; j = c; }
  }
  const p = patAt(j), step = j % 16;
  const notes = S.patterns[p][step];
  if (!notes.some(n => n.s === S.cur && n.k === k)) notes.push({ s: S.cur, k });
  if (j >= tick) liveSkip.add(`${j}:${S.cur}:${k}`);
  dirty();
}
function copySound(from, to) {
  checkpoint();
  const sl = S.slots[from];
  S.slots[to] = { ...sl, factory: null, name: sl.name + (from === to ? '' : ' copy'), params: { ...sl.params },
    synth: sl.synth && { ...sl.synth }, slices: sl.slices?.map(s => ({ ...s })) };
  if ((from < 8) !== (to < 8) && S.slots[to].kind !== 'synth') {
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
  if (S.mode !== 'fx') for (const f of [...activeFx]) releaseFx(f);
  if (S.mode !== 'pattern' && chainEdit) setChainEdit(false);
  if (copying && S.mode !== copying) copying = null;
  draw();
}));
$('write').addEventListener('click', () => { S.write = !S.write; draw(); });
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
$('dice').addEventListener('click', () => { ctx.resume(); roll(false); });
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
  $('pChoke').checked = !!sl.params.choke;
  $('startRow').style.display = sl.kind === 'synth' ? 'none' : '';
  const wob = sl.synth?.type === 'wobble';
  $('wobRow').style.display = wob ? '' : 'none';
  if (wob) { $('pWob').value = sl.synth.rate; $('oWob').textContent = WOBBLE_RATES[sl.synth.rate][1]; }
  $('rollAll').style.display = S.cur >= 8 ? '' : 'none';
  $('soundNote').textContent = `Sound ${S.cur + 1}: ${sl.name}. ` + (sl.kind === 'synth' ? 'Synth: Length is how long each note rings.'
    : sl.kind === 'chop' ? `Each key is one slice. Start and Length trim slice ${S.lastKey[S.cur] + 1}, the last one played.`
    : 'Key 8 plays it at its own pitch; the others go up and down the scale.');
}
for (const f of FAMILIES) $('family').add(new Option(f[0].toUpperCase() + f.slice(1), f));
const GROUPS = [['Melodic', ['bass808', 'wobble', 'reese', 'acid', 'chip', 'pluck', 'organ', 'choir']],
  ['Drums', ['acoustic', 'percussion', 'kit808', 'kit909']], ['Video game', ['hits', 'blips', 'lasers', 'glitch', 'coins', 'robots']]];
$('library').add(new Option('Choose…', ''));
for (const [g, ids] of GROUPS) {
  const og = document.createElement('optgroup'); og.label = g;
  for (const id of ids) og.appendChild(new Option(LIBRARY[id].name, id));
  $('library').appendChild(og);
}
$('library').addEventListener('change', async () => {
  const id = $('library').value; $('library').value = ''; if (!id) return;
  checkpoint();
  S.slots[S.cur] = await factorySlot(id); S.lastKey[S.cur] = 0;
  syncPanel(); dirty(); draw(); noteOn(eng, S.cur, 0, ctx.currentTime + 0.01);
  status(`${LIBRARY[id].name} → sound ${S.cur + 1}.`);
});
$('beatsBtn').addEventListener('click', () => {
  document.querySelector('[data-tab="tBeat"]').click();
  $('tBeat').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('copySound').addEventListener('click', () => {
  copying = 'sound'; S.mode = 'sound'; draw(); status(`Tap the sound to copy sound ${S.cur + 1} onto.`);
});

// Beat panel
for (const s of Object.keys(SCALES)) $('scale').add(new Option(s[0].toUpperCase() + s.slice(1), s));
['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].forEach((n, i) => $('root').add(new Option(n, i)));
$('bpm').addEventListener('input', () => { S.bpm = +$('bpm').value; dirty(); draw(); });
document.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => { checkpoint(); S.bpm = +b.dataset.bpm; dirty(); draw(); }));
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
    case 'play': if (S.write && !playing) {
      const f = S.fx[S.pat][k], ns = S.patterns[S.pat][k].map(n => n.s + 1).join(' ');
      return (ns + (f != null ? ' ' + FX[f][0] : '')).trim();
    } break;
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
  $('write').classList.toggle('on', S.write);
  const sl = S.slots[S.cur];
  $('lcdSound').textContent = `${String(S.cur + 1).padStart(2, '0')} ${sl ? sl.name.toUpperCase() : '…'}`;
  $('lcdPat').textContent = S.chain.length > 1 ? `CHAIN ${S.chain.map(p => p + 1).join('·')}` : `PAT ${S.pat + 1}`;
  $('lcdMode').textContent = copying ? `COPY ${copying.toUpperCase()}: TAP WHERE` : {
    play: S.write ? (playing ? 'WRITE: LIVE RECORD' : 'WRITE: TAP STEPS') : 'PLAY', sound: 'SOUND: PICK ONE',
    pattern: chainEdit ? 'CHAIN: TAP IN ORDER' : 'PATTERN: PICK ONE',
    fx: S.write && playing ? 'FX: HOLD TO RECORD IT' : 'FX: HOLD A KEY' }[S.mode];
  $('vol').value = S.vol; $('oVol2').textContent = Math.round(S.vol * 100);
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
  Object.assign(S, snapshot(snap)); committed = snapshot();
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
  afro: { name: 'Afro house', bpm: 122, swing: 52, parts: { kick: 'x...x...x...x...', hat: '..x...x...x...x.', shaker: 'xxxxxxxxxxxxxxxx', conga: 'x..x..x...x..x..', bongo: '......x.......x.' } },
  dembow: { name: 'Dembow', bpm: 96, swing: 50, parts: { kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: 'x.x.x.x.x.x.x.x.' } },
  dnb: { name: 'Drum & bass', bpm: 172, swing: 50, parts: { kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ghost: '.......x.x....x.' } },
  dubstep: { name: 'Dubstep', bpm: 140, swing: 50, parts: { kick: 'x.........x.....', snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.', open: '......x.........' } },
  jazz: { name: 'Jazz swing', bpm: 132, swing: 66, parts: { ride: 'x...x..xx...x..x', pedal: '....x.......x...', softkick: 'x.......x.......', ghost: '..........x.....' } },
};
const ROLES = {
  kick: [/^kick$/i, /kick/i], softkick: [/soft kick/i], snare: [/^snare$/i, /snare/i, /clap/i], clap: [/clap/i],
  ghost: [/ghost/i], rim: [/rim|cross-?stick|clave/i], hat: [/^(closed )?hat$/i, /closed hat/i], open: [/open hat/i],
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
$('beatBtn').addEventListener('click', genBeat);

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
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
function dirty() { persist(); noteChange(); }
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
      kind: sl.kind, name: sl.name, params: sl.params, synth: sl.synth, contiguous: sl.contiguous, buf: ref(sl.buf),
      slices: sl.slices?.map(s => ({ ...s, buf: ref(s.buf) })),
    });
    const { mode, write, ...rest } = S;
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
        const slot = { factory: null, kind: s.kind, name: s.name, params: params(s.params), synth: s.synth, contiguous: s.contiguous, buf: await getBuf(s.buf) };
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
  if (saved) { for (const k of ['patterns', 'fx', 'pat', 'chain', 'bpm', 'swing', 'scale', 'root', 'vol', 'cur', 'lastKey']) if (saved[k] != null) S[k] = saved[k]; }
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
