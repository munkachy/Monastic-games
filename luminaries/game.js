"use strict";
// Luminaries: the game. A field sixteen wide and ten high; blocks of four
// squares fall in, two colours each; turn them, move them, drop them. Wherever
// four of one colour meet in a square, the square is marked, and the line of
// light that sweeps across the field in time with the music takes away every
// marked square it passes. Each stage is one of the Doctors of the Church.

// ---- The screen -------------------------------------------------------------------------------
const W = 640, H = 360, COLS = 16, ROWS = 10, CS = 20, FX = 160, FY = 106;
const cv = document.getElementById("screen"), ctx = cv.getContext("2d");
let scale = 1, offX = 0, offY = 0, DPR = 1;
function resize() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  scale = Math.min(innerWidth / W, innerHeight / H);
  const w = Math.floor(W * scale), h = Math.floor(H * scale);
  offX = Math.floor((innerWidth - w) / 2); offY = Math.floor((innerHeight - h) / 2);
  cv.style.width = w + "px"; cv.style.height = h + "px"; cv.style.left = offX + "px"; cv.style.top = offY + "px";
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  spriteCache.clear();
}
addEventListener("resize", resize);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = { title: "Cinzel, 'Trajan Pro', Georgia, serif", quote: "'Cormorant Garamond', Georgia, serif", ui: "Montserrat, 'Segoe UI', system-ui, sans-serif" };
function text(str, x, y, o) {
  o = o || {};
  let size = o.size || 10;
  ctx.font = (o.weight || 600) + " " + size + "px " + (o.font || FONT.ui);
  if (o.spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = o.spacing + "px";
  // Too wide for its box: smaller, until it fits.
  if (o.max) { const w = ctx.measureText(str).width; if (w > o.max) { size = Math.max(5.5, size * o.max / w); ctx.font = (o.weight || 600) + " " + size + "px " + (o.font || FONT.ui); } }
  ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
  if (o.spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = o.spacing + "px";
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 10; }
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.fillStyle = o.color || "#ffffff"; ctx.fillText(str, x, y);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
}
function wrap(str, width, font) {
  ctx.font = font; const out = []; let line = "";
  for (const w of str.split(" ")) { const tst = line ? line + " " + w : w; if (ctx.measureText(tst).width > width && line) { out.push(line); line = w; } else line = tst; }
  if (line) out.push(line); return out;
}

function wrapFit(str, width, size, maxLines, weight, font) {
  for (let sz = size; sz >= 6; sz -= 0.5) { const ls = wrap(str, width, weight + " " + sz + "px " + font); if (ls.length <= maxLines) return { lines: ls, size: sz }; }
  return { lines: wrap(str, width, weight + " 6px " + font).slice(0, maxLines), size: 6 };
}

// ---- Saved --------------------------------------------------------------------------------------
// Three ways through the Pilgrimage. The blocks speed up along one smooth curve from the first
// Doctor to the last: v0 rows a second at St. Irenaeus, v1 at the end of St. Therese. (Measured
// against the field, ten rows plus two above it: Easy ends near seven seconds for a block to cross
// the field, a moderate pace; Normal near four and a half; Hard near three, which is fast but
// still playable, short of the frantic speeds of the late levels of falling-block games.)
const DIFFS = [
  { id: "easy", name: "EASY", v0: 0.7, v1: 1.6, about: "Gentle all the way: the blocks rise only to a moderate pace by the last Doctor." },
  { id: "normal", name: "NORMAL", v0: 0.9, v1: 2.6, about: "A steady climb, until by St. Thérèse it asks real skill." },
  { id: "hard", name: "HARD", v0: 1.2, v1: 3.8, about: "Brisk from the start, and fast by the end: hard, but never impossible." },
];
const DIFF = Object.fromEntries(DIFFS.map((d) => [d.id, d]));
const freshDiff = () => ({ easy: { reached: 0, done: false }, normal: { reached: 0, done: false }, hard: { reached: 0, done: false } });
let save = { best: 0, muted: false, stageBest: {}, learned: false, master: false, masterBest: 0, diff: freshDiff(), diffSel: "easy" };
try { save = Object.assign(save, JSON.parse(localStorage.getItem("luminaries") || "{}")); } catch (e) { }
// Older saves kept one Pilgrimage: it becomes the Easy one.
for (const d of DIFFS) save.diff[d.id] = Object.assign({ reached: 0, done: false }, save.diff[d.id]);
if (save.reached) { save.diff.easy.reached = Math.max(save.diff.easy.reached, save.reached); delete save.reached; }
if (save.pilgrim) { save.diff.easy.done = true; delete save.pilgrim; }
if (!DIFF[save.diffSel]) save.diffSel = "easy";
const store = () => { try { localStorage.setItem("luminaries", JSON.stringify(save)); } catch (e) { } };
// Finished the Pilgrimage at least once, at any difficulty: Normal, Hard and Master open.
const pilgrimDone = () => DIFFS.some((d) => save.diff[d.id].done);
const diffOpen = (id) => id === "easy" || pilgrimDone();
const masterOpen = () => pilgrimDone() || !!save.master;
// A Doctor's stage opens in Single Stage once it has been passed in the Pilgrimage.
const stageOpen = (i) => DIFFS.some((d) => save.diff[d.id].done || save.diff[d.id].reached > i);
let resetArm = -99;
function resetProgress() { save = { best: 0, muted: save.muted, stageBest: {}, learned: false, master: false, masterBest: 0, diff: freshDiff(), diffSel: "easy" }; store(); }
Sound.muted = !!save.muted;

// ---- The game -----------------------------------------------------------------------------------
STAGES.sort((a, b) => a.n - b.n);
const STAGE_BY_ID = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
const TARGET = 50;            // squares to clear in a stage of the Pilgrimage
const GIFT_FILL = 18;         // squares to fill the gift
let state = "title", G = null;
function newPiece(o) {
  o = o || {};
  const c0 = Math.random() < 0.5 ? 0 : 1, mono = o.mono;
  const cells = [0, 1, 2, 3].map(() => (mono ? c0 : Math.random() < 0.5 ? 0 : 1));
  const gems = [false, false, false, false];
  if (o.gem || (!mono && G && G.pieces > 8 && Math.random() < 1 / 22)) gems[Math.floor(Math.random() * 4)] = true;
  return { cells, gems, x: 7, row: -2, off: 0 };
}
// Master mode: five zones, fast from the start, no gifts. Clear the quota of each before its time runs out.
const MASTER = [
  { id: "athanasius", quota: 18, secs: 100, speed: 2.0 },
  { id: "thomas", quota: 22, secs: 100, speed: 2.4 },
  { id: "catherine", quota: 26, secs: 100, speed: 2.8 },
  { id: "chrysostom", quota: 30, secs: 100, speed: 3.2 },
  { id: "therese", quota: 34, secs: 100, speed: 3.6 },
];
const masterStage = (z) => STAGE_BY_ID[MASTER[z].id] ?? STAGE_BY_ID.therese;
function start(mode, si, diff) {
  if (mode === "master" && !masterOpen()) { state = "master"; return; }
  diff = DIFF[diff] && diffOpen(diff) ? diff : DIFF[save.diffSel] && diffOpen(save.diffSel) ? save.diffSel : "easy";
  Sound.init();
  if (mode === "master") si = masterStage(0);
  if (mode === "tutorial") si = STAGE_BY_ID.francis ?? STAGE_BY_ID.teresa;
  G = {
    mode, si, diff, stage: STAGES[si], prev: null, fadeT: 0,
    grid: Array.from({ length: COLS }, () => Array(ROWS).fill(null)),
    falling: [], piece: null, queue: [], spawnT: 0.6, pieces: 0,
    tl: 0, holdT: 0, passSq: 0, combo: 0, score: 0, squares: 0, stageSq: 0, time: 0, stageTime: 0,
    gift: 0, hangT: 0, calmT: 0, over: false, overT: 0, done: false, zone: 0, zoneSq: 0, zoneT: 0,
    energy: 0, parts: [], pops: [], banner: { t: 0 }, anchors: [], level: 0, danger: 0,
  };
  for (let i = 0; i < 3; i++) G.queue.push(newPiece());
  G.startSi = si;
  if (mode === "tutorial") { G.tut = { i: -1, ok: 0, T: {} }; nextLesson(); }
  Sound.muffle(false);
  Sound.play(SONGS[G.stage.song]);
  Ticker.set(G.stage);
  state = "play";
}
const cell = (x, y) => (x >= 0 && x < COLS && y >= 0 && y < ROWS ? G.grid[x][y] : null);
const solid = (x, y) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && !!G.grid[x][y]);
function canAt(x, row) { for (const dx of [0, 1]) for (const dy of [0, 1]) if (solid(x + dx, row + dy)) return false; return true; }
function spawn() {
  const p = G.queue.shift();
  G.queue.push(newPiece());
  p.x = 7; p.row = -2; p.off = 0;
  G.piece = p; G.pieces++;
  if (!canAt(p.x, p.row)) gameOver();
}
function move(dx) {
  const p = G.piece; if (!p) return;
  if (canAt(p.x + dx, p.row) && (p.off === 0 || canAt(p.x + dx, p.row + 1))) { p.x += dx; Sfx.move(); tutEvent("move"); }
}
function rotate(dir) {
  const p = G.piece; if (!p) return;
  const [a, b, c, d] = p.cells, [ga, gb, gc, gd] = p.gems;   // tl tr bl br
  if (dir > 0) { p.cells = [c, a, d, b]; p.gems = [gc, ga, gd, gb]; } else { p.cells = [b, d, a, c]; p.gems = [gb, gd, ga, gc]; }
  Sfx.rotate(dir);
  tutEvent("turn");
}
function hardDrop() {
  const p = G.piece; if (!p) return;
  let n = 0; while (canAt(p.x, p.row + 1)) { p.row++; n++; }
  p.off = 0;
  for (let i = 0; i < 6; i++) G.parts.push({ x: FX + (p.x + Math.random() * 2) * CS, y: FY + (p.row + 2) * CS, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40, life: 0.4, c: G.stage.colors.line, s: 2 });
  tutEvent("drop");
  land(n > 0);
}
function land(hard) {
  const p = G.piece; G.piece = null; G.spawnT = 0.12;
  const pos = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (let i = 0; i < 4; i++) {
    const x = p.x + pos[i][0], y = p.row + pos[i][1];
    if (y < 0) { gameOver(); return; }
    G.grid[x][y] = { c: p.cells[i], gem: p.gems[i], lit: false, flash: 0 };
  }
  settle();
  Sfx.land(hard);
  tutEvent("land"); if (Input.soft) tutEvent("drop");
}
// Blocks with nothing under them fall (a block landing half over a gap splits in two).
function settle() {
  for (let x = 0; x < COLS; x++) {
    let gap = false;
    for (let y = ROWS - 1; y >= 0; y--) {
      const c = G.grid[x][y];
      if (!c) { gap = true; continue; }
      if (gap) { G.grid[x][y] = null; G.falling.push({ x, y, c: c.c, gem: c.gem, vy: 0 }); }
    }
  }
}
function stepFalling(dt) {
  if (!G.falling.length) return;
  G.falling.sort((a, b) => b.y - a.y);
  for (const f of G.falling) {
    f.vy = Math.min(26, f.vy + 90 * dt); f.y += f.vy * dt;
    const below = Math.floor(f.y) + 1;
    if (solid(f.x, below)) { f.y = Math.floor(f.y); f.done = true; if (f.y >= 0) G.grid[f.x][f.y] = { c: f.c, gem: f.gem, lit: false, flash: 0.15 }; else gameOver(); }
  }
  G.falling = G.falling.filter((f) => !f.done);
}
// Every square of four of one colour, marked; a light in a square marks all its colour joined to it.
function markSquares() {
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c) c.mark = false; }
  const anchors = [];
  for (let x = 0; x < COLS - 1; x++) for (let y = 0; y < ROWS - 1; y++) {
    const a = G.grid[x][y], b = G.grid[x + 1][y], c = G.grid[x][y + 1], d = G.grid[x + 1][y + 1];
    if (a && b && c && d && a.c === b.c && a.c === c.c && a.c === d.c) { anchors.push([x, y]); a.mark = b.mark = c.mark = d.mark = true; }
  }
  for (const [x, y] of anchors) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const c = G.grid[x + dx][y + dy];
    if (c.gem) { c.gem = false; chainFrom(x + dx, y + dy); Sfx.lumen(); tutEvent("lumen"); }
  }
  const before = G.anchors.length;
  G.anchors = anchors;
  if (anchors.length > before) { Sfx.square(anchors.length - before); tutEvent("square"); }
}
function chainFrom(x0, y0, quiet) {
  const col = G.grid[x0][y0].c, seen = new Set(), st = [[x0, y0]];
  while (st.length) {
    const [x, y] = st.pop(), k = x * 16 + y; if (seen.has(k)) continue; seen.add(k);
    const c = cell(x, y); if (!c || c.c !== col) continue;
    c.chain = true;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  if (!quiet) pop("LUMEN", G.stage.colors.line, 18);
}
// The line of light.
function stepLine(dt) {
  if (G.holdT > 0) { G.holdT -= dt; return; }
  const speed = (Sound.bpm() / 30), prev = G.tl;
  G.tl += speed * dt;
  // Keep its crossings on the eighth notes of the song.
  const mt = Sound.musicTime();
  if (mt) {
    const eighth = 30 / Sound.bpm(), ph = ((Sound.now() - mt.barT) / eighth) % 1, frac = G.tl % 1;
    let e = ph - frac; if (e > 0.5) e -= 1; if (e < -0.5) e += 1;
    G.tl += e * Math.min(1, dt * 3);
  }
  for (let k = Math.floor(prev) + 1; k <= Math.floor(G.tl); k++) {
    passColumn((k - 1) % COLS);
    if (k % COLS === 0) endPass();
  }
  G.tl %= COLS;
}
function passColumn(x) {
  let any = false;
  for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c && (c.mark || c.chain)) { c.lit = true; any = true; } }
  if (!any) commit();
}
function commit() {
  const lit = [];
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c && c.lit) lit.push([x, y]); }
  if (!lit.length) return;
  const isLit = (x, y) => { const c = cell(x, y); return c && c.lit; };
  const kill = new Set(); let n = 0;
  for (const [x, y] of G.anchors) if (isLit(x, y) && isLit(x + 1, y) && isLit(x, y + 1) && isLit(x + 1, y + 1)) { n++; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) kill.add((x + dx) * 16 + y + dy); }
  for (const [x, y] of lit) { const c = G.grid[x][y]; if (c.chain) kill.add(x * 16 + y); }
  for (const [x, y] of lit) { const c = G.grid[x][y]; if (!kill.has(x * 16 + y)) c.lit = false; }
  if (!kill.size) return;
  const cols = G.stage.colors;
  for (const k of kill) {
    const x = Math.floor(k / 16), y = k % 16, c = G.grid[x][y];
    const col = (c.c ? cols.b : cols.a)[1];
    for (let i = 0; i < 5; i++) G.parts.push({ x: FX + x * CS + CS / 2, y: FY + y * CS + CS / 2, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.7) * 160, life: 0.5 + Math.random() * 0.4, c: col, s: 2.5, add: true });
    G.grid[x][y] = null;
  }
  G.rings = G.rings || []; G.rings.push({ x: FX + G.tl * CS, t: 0 });
  G.passSq += n; G.squares += n; G.stageSq += n; G.zoneSq += n;
  tutEvent("clear", n);
  G.gift = Math.min(1, G.gift + n / GIFT_FILL);
  G.energy = Math.min(1, G.energy + 0.15 + n * 0.05);
  Sfx.clear(n, kill.size);
  settle();
  // A field of one colour, or an empty one.
  let left = 0; const seen = new Set();
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c) { left++; seen.add(c.c); } }
  if (!left && !G.falling.length) { G.score += 10000; pop("CLEAN OF HEART", "#ffffff", 22, "+10,000: the field is empty"); Sfx.bonus(2); }
  else if (seen.size === 1 && !G.falling.length) { G.score += 1000; pop("UNITY", "#ffffff", 18, "+1,000: one colour left"); Sfx.bonus(1); }
}
function endPass() {
  commit();
  const n = G.passSq; G.passSq = 0;
  if (n > 0) {
    if (n >= 4) G.combo++; else G.combo = 0;
    const m = n >= 4 ? Math.min(5, 1 + G.combo) : 1, pts = n * 40 * m;
    G.score += pts;
    pop(n + (n === 1 ? " SQUARE" : " SQUARES") + (m > 1 ? "  ×" + m : ""), m > 1 ? G.stage.colors.accent : "#ffffff", m > 1 ? 18 : 14, "+" + pts.toLocaleString());
    if (n >= 4) { Sound.fill("home"); Sfx.big(m); }
  } else G.combo = 0;
  tutEvent("pass", n);
  // Master: the quota made, on to the next zone (or the title, after the fifth).
  if (G.mode === "master" && G.zoneSq >= MASTER[G.zone].quota) {
    if (G.zone < MASTER.length - 1) { G.zone++; G.zoneSq = 0; G.zoneT = 0; setStage(masterStage(G.zone)); pop("ZONE " + (G.zone + 1), "#ffffff", 22, MASTER[G.zone].quota + " squares in " + MASTER[G.zone].secs + " seconds"); }
    else if (!G.done) { G.done = true; save.master = true; finish(true); }
  }
  // On through the Pilgrimage.
  if (G.mode === "pilgrimage" && G.stageSq >= TARGET) {
    if (G.si < STAGES.length - 1) setStage(G.si + 1);
    else if (!G.done) { G.done = true; finish(true); }
  }
}
function setStage(si) {
  G.prev = G.stage; G.fadeT = 1.6;
  G.si = si; G.stage = STAGES[G.si]; G.stageSq = 0; G.stageTime = 0;
  if (G.mode === "pilgrimage") { const D = save.diff[G.diff]; D.reached = Math.max(D.reached, G.si); store(); }
  Sound.queue(SONGS[G.stage.song]);
  Sfx.stage();
  G.banner = { t: 0 };
  Ticker.queueStage(G.stage);
}
function pop(str, color, size, sub) { G.pops.push({ str, color, size, sub, t: 0 }); if (G.pops.length > 3) G.pops.shift(); }
function gameOver() {
  if (G.over) return;
  // In the lessons nobody loses: the field is simply cleared.
  if (G.mode === "tutorial") { clearField(); G.piece = null; G.spawnT = 0.4; return; }
  G.over = true; G.overT = 0; G.piece = null;
  Sfx.over(); Sound.muffle(true, 0.4);
}
function finish(won) {
  G.won = won;
  if (G.score > save.best) { save.best = G.score; G.newBest = true; }
  if (G.mode === "single") { const k = G.stage.id; if (G.score > (save.stageBest[k] || 0)) save.stageBest[k] = G.score; }
  if (G.mode === "master") save.masterBest = Math.max(save.masterBest || 0, G.score);
  if (G.mode === "pilgrimage" && won) save.diff[G.diff].done = true;
  store();
  state = "over"; overT = 0;
  if (won) { Sound.muffle(false); Sfx.bonus(2); }
  // The whole Pilgrimage finished: the Doctors have something to say first.
  if (won && G.mode === "pilgrimage" && typeof startScene === "function") startScene(G.diff, () => { state = "over"; overT = 0; Sound.play(SONGS[G.stage.song]); });
}
// The Doctor's gift.
function useGift() {
  if (!G || G.gift < 1 || G.over || state !== "play" || G.mode === "master") return;
  const g0 = G.stage.gift;
  // A gift that gathers up squares waits, unspent, until there is a square to gather.
  if (g0.kind === "sweep" && !G.grid.some((col) => col.some((c) => c && c.mark))) { pop("MAKE A SQUARE FIRST", "#ffffff", 12, "then " + g0.name + " gathers it up"); return; }
  G.gift = 0;
  tutEvent("gift");
  const g = G.stage.gift;
  G.giftGlow = 1.6;
  Sfx.gift();
  if (g.kind === "mono") G.queue = G.queue.map(() => newPiece({ mono: true }));
  else if (g.kind === "lumen" || g.kind === "lumen2") for (const q of G.queue.slice(0, g.kind === "lumen2" ? 2 : 1)) { q.gems = [false, false, false, false]; q.gems[Math.floor(Math.random() * 4)] = true; }
  else if (g.kind === "calm") G.calmT = 30;
  else if (g.kind === "sweep") {
    // Every square on the field taken at once, and with each square every block of its colour joined to it.
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c && c.mark && !c.chain) chainFrom(x, y, true); }
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c && (c.mark || c.chain)) c.lit = true; }
    commit();
    G.rings = G.rings || []; for (let x = 0; x <= COLS; x += 2) G.rings.push({ x: FX + x * CS, t: 0 });
  } else if (g.kind === "bottom" || g.kind === "top2") {
    // The lowest row lifted away (everything above settles), or the top two blocks of every column.
    const gone = [];
    if (g.kind === "bottom") for (let x = 0; x < COLS; x++) { if (G.grid[x][ROWS - 1]) gone.push([x, ROWS - 1]); }
    else for (let x = 0; x < COLS; x++) { let y = 0; while (y < ROWS && !G.grid[x][y]) y++; for (let k = 0; k < 2 && y + k < ROWS; k++) gone.push([x, y + k]); }
    for (const [x, y] of gone) {
      const c = G.grid[x][y], col = (c.c ? G.stage.colors.b : G.stage.colors.a)[1];
      G.grid[x][y] = null;
      for (let i = 0; i < 4; i++) G.parts.push({ x: FX + x * CS + 10, y: FY + y * CS + 10, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 140, life: 0.8, c: col, s: 2.5, add: true });
    }
    settle();
  }
  else if (g.kind === "hang") G.hangT = 20;
  else if (g.kind === "hold") G.holdT = (8 * 60) / Sound.bpm();
  else if (g.kind === "green") {
    const flip = [];
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
      const c = G.grid[x][y]; if (!c) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const o = cell(x + dx, y + dy); return o && o.c === c.c; })) flip.push(c);
    }
    for (const c of flip) { c.c = 1 - c.c; c.flash = 0.5; }
    for (let i = 0; i < 40; i++) G.parts.push({ x: FX + Math.random() * COLS * CS, y: FY + ROWS * CS, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 120, life: 1.2, c: "#9aff8a", s: 2, add: true });
  } else if (g.kind === "roses") {
    const tops = [];
    for (let x = 0; x < COLS; x++) { let y = 0; while (y < ROWS && !G.grid[x][y]) y++; if (y < ROWS) tops.push([x, y]); }
    tops.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of tops.slice(0, 8)) {
      G.grid[x][y] = null;
      for (let i = 0; i < 6; i++) G.parts.push({ x: FX + x * CS + 10, y: FY + y * CS + 10, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 1, c: i % 2 ? "#ff7ab0" : "#ffffff", s: 3, petal: true, rot: Math.random() * 6 });
    }
  }
}
// ---- Learning to play: eight short lessons, on a gentle stage ---------------------------------------
function clearField() { for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) G.grid[x][y] = null; G.falling = []; G.anchors = []; }
const put = (x, y, c, gem) => { G.grid[x][y] = { c, gem: !!gem, lit: false, flash: 0.3 }; };
const fixed = (cells, gem) => ({ cells, gems: cells.map((_, i) => gem === i), x: 7, row: -2, off: 0 });
const LESSONS = [
  { title: "Moving", text: "A block of four falls from the top. Drag left or right to move it (or press ← →). Move it, then let it land.",
    setup() { clearField(); }, done(ev, T) { if (ev === "move") T.moved = 1; return ev === "land" && T.moved; } },
  { title: "Turning", text: "Tap the screen to turn the block (or press ↑). Turn it twice, then let it land.",
    setup() { clearField(); }, done(ev, T) { if (ev === "turn") T.n = (T.n || 0) + 1; return ev === "land" && T.n >= 2; } },
  { title: "Dropping", text: "Flick your finger down to drop a block at once, or drag it down to bring it down slowly (or press Space).",
    setup() { clearField(); }, done: (ev) => ev === "drop" },
  { title: "Making a square", text: "Four of one colour in a square light up. Drop this block on the glowing place to make one.",
    setup() { clearField(); put(6, 9, 0); put(7, 9, 0); G.piece = null; G.queue[0] = fixed([1, 1, 0, 0]); G.target = [6, 8]; }, done: (ev) => ev === "square" },
  { title: "The line of light", text: "Watch the line of light sweep across in time with the music. It takes away every square it passes.",
    setup() { if (!G.anchors.length) { put(2, 8, 1); put(3, 8, 1); put(2, 9, 1); put(3, 9, 1); } }, done: (ev, T, n) => ev === "clear" && n > 0 },
  { title: "Streaks", text: "Clear four squares or more in one sweep for a streak: twice the points, and more if you keep it up. Watch these go.",
    setup() { clearField(); [0, 1, 0, 1].forEach((c, k) => { for (const dx of [0, 1]) for (const y of [8, 9]) put(4 + k * 2 + dx, y, c); }); }, done: (ev, T, n) => ev === "pass" && n >= 4 },
  { title: "The light block", text: "A block with a light in it (✦) takes away all its colour joined to it. Drop it on the matching row.",
    setup() { clearField(); for (let x = 0; x < COLS; x++) put(x, 9, 0); G.piece = null; G.queue[0] = fixed([0, 0, 0, 0], 2); G.target = null; }, done: (ev) => ev === "lumen" },
  { title: "The Doctor's gift", text: "Clearing squares fills the gift (✦ at the left). It is full now: tap it (or press G). Each Doctor gives a different one.",
    setup() { G.gift = 1; }, done: (ev) => ev === "gift" },
];
function nextLesson() {
  const T = G.tut; T.i++; T.T = {}; T.ok = 0; G.target = null;
  if (T.i >= LESSONS.length) { T.end = true; save.learned = true; store(); Sfx.bonus(2); return; }
  LESSONS[T.i].setup();
}
function tutEvent(ev, n) {
  if (!G || G.mode !== "tutorial" || G.tut.end || G.tut.ok > 0 || G.tut.i < 0) return;
  if (LESSONS[G.tut.i].done(ev, G.tut.T, n)) { G.tut.ok = 1.8; G.target = null; Sfx.square(1); }
}
function stepTutorial(dt) {
  const T = G.tut;
  if (T.ok > 0) { T.ok -= dt; if (T.ok <= 0) nextLesson(); }
}
function drawLesson() {
  const T = G.tut, col = G.stage.colors;
  ctx.fillStyle = "rgba(8,6,20,0.82)"; roundRect(130, 4, 380, 54, 10); ctx.fill();
  ctx.strokeStyle = col.accent; ctx.lineWidth = 1.2; roundRect(130, 4, 380, 54, 10); ctx.stroke();
  if (T.end) {
    text("YOU ARE READY", W / 2, 24, { align: "center", size: 14, weight: 800, color: "#ffffff", spacing: 2 });
    text("Stack, make squares, and let the light sweep. Each Doctor has a world, a song and a gift.", W / 2, 42, { align: "center", size: 10, weight: 500, color: col.ink, max: 360 });
    return;
  }
  const L = LESSONS[T.i];
  text("LESSON " + (T.i + 1) + " OF " + LESSONS.length + "  ·  " + L.title.toUpperCase(), W / 2, 19, { align: "center", size: 9, weight: 800, color: col.accent, spacing: 1.5, max: 360 });
  if (T.ok > 0) { text("✓  WELL DONE", W / 2, 42, { align: "center", size: 15, weight: 800, color: "#ffffff" }); return; }
  const f = wrapFit(L.text, 360, 11, 2, "500", FONT.ui);
  f.lines.forEach((l, i) => text(l, W / 2, 34 + i * (f.size + 3), { align: "center", size: f.size, weight: 500, color: "#ffffff" }));
}

// The level of the music, from how far into the stage the player has come.
function levelOf() {
  if (G.mode === "pilgrimage") { const u = G.stageSq / TARGET; return u < 0.15 ? 0 : u < 0.45 ? 1 : u < 0.8 ? 2 : 3; }
  if (G.mode === "master") return G.zoneSq / MASTER[G.zone].quota < 0.3 ? 2 : 3;
  if (G.mode === "tutorial") return Math.min(2, Math.floor(G.tut.i / 3));
  const u = (G.squares % 60) / 60; return G.squares < 12 ? (G.squares < 4 ? 0 : 1) : u < 0.2 ? 1 : u < 0.6 ? 2 : 3;
}
function fallSpeed() {
  if (G.hangT > 0) return 0.05;
  if (G.mode === "tutorial") return 0.6;
  if (G.mode === "master") return MASTER[G.zone].speed;
  // How far along the whole Pilgrimage, from 0 at the first block to 1 at the end of the last Doctor.
  // In Single Stage it starts where that Doctor stands, and creeps up the longer you last.
  const N = STAGES.length, p = G.mode === "pilgrimage" ? (G.si + Math.min(1, G.stageSq / TARGET)) / N : G.si / (N - 1) + G.squares / 400;
  return curveSpeed(G.diff, p) * (G.calmT > 0 ? 0.5 : 1);
}
function curveSpeed(diff, p) {
  const D = DIFF[diff] || DIFF.easy;
  return D.v0 + (D.v1 - D.v0) * Math.pow(clamp(p, 0, 1), 1.15);
}
function stepPlay(dt) {
  G.time += dt; G.stageTime += dt;
  for (const q of G.pops) q.t += dt; G.pops = G.pops.filter((q) => q.t < 1.8);
  if (G.giftGlow > 0) G.giftGlow -= dt;
  for (const p of G.parts) { p.life -= dt; p.vy += (p.petal ? 30 : 220) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot !== undefined) p.rot += dt * 4; }
  G.parts = G.parts.filter((p) => p.life > 0);
  if (G.rings) { for (const r of G.rings) r.t += dt; G.rings = G.rings.filter((r) => r.t < 0.5); }
  G.energy = Math.max(0, G.energy - dt * 0.35);
  G.banner.t += dt; if (G.fadeT > 0) G.fadeT -= dt;
  if (G.hangT > 0) G.hangT -= dt;
  if (G.calmT > 0) G.calmT -= dt;
  if (G.mode === "master" && !G.over && !G.done) { G.zoneT += dt; if (G.zoneT >= MASTER[G.zone].secs) gameOver(); }
  if (G.mode === "tutorial") stepTutorial(dt);
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c && c.flash > 0) c.flash -= dt; }
  if (G.over) { G.overT += dt; if (G.overT > 1.8) finish(false); return; }
  // The piece.
  const p = G.piece;
  if (!p) { G.spawnT -= dt; if (G.spawnT <= 0 && !G.falling.length) spawn(); }
  else {
    let v = fallSpeed();
    // Holding ↓ on a keyboard drops fast; dragging a finger down is gentler, and quicker the further it drags.
    if (Input.soft) v = Math.max(v, Input.softTouch ? 3 + Math.min(3, Input.softTouch / 25) : 18);
    p.off += v * dt;
    while (p.off >= 1) { if (canAt(p.x, p.row + 1)) { p.row++; p.off -= 1; } else { p.off = 0; land(false); break; } }
    if (G.piece && !canAt(p.x, p.row + 1) && p.off > 0.05) { p.off = 0; land(false); }
  }
  stepFalling(dt);
  markSquares();
  stepLine(dt);
  G.level = levelOf(); Sound.setLevel(G.level);
  let tall = 0; for (let x = 0; x < COLS; x++) { let y = 0; while (y < ROWS && !G.grid[x][y]) y++; tall = Math.max(tall, ROWS - y); }
  G.danger += ((tall >= 8 ? 1 : 0) - G.danger) * Math.min(1, dt * 3);
}

// ---- Sounds, on the grid of the song ----------------------------------------------------------
const Sfx = (() => {
  const S = {}, I = Sound.I;
  const sc = () => G.stage.scale;
  let rot = 0;
  S.move = () => { if (!Sound.ctx()) return; const t = Sound.grid(1); I.perc(t, sc()[0] - 12, 0.25, { decay: 0.05, pan: (G.piece.x - 7) / 9 }); };
  S.rotate = (d) => { if (!Sound.ctx()) return; rot = (rot + (d > 0 ? 1 : sc().length - 1)) % sc().length; I.pluck(Sound.grid(1), sc()[rot], 0.12, 0.35, { wave: "triangle", cut: 4200, dly: 0.1, rev: 0.1, decay: 0.15 }); };
  S.land = (hard) => { if (!Sound.ctx()) return; const t = Sound.grid(1); I.perc(t, sc()[0] - 24, hard ? 0.6 : 0.35, { decay: 0.1 }); if (hard) I.hat(t, 0.4, { f: 5000, decay: 0.06 }); };
  S.square = (n) => { if (!Sound.ctx()) return; const t = Sound.grid(1); I.bell(t, sc()[(G.anchors.length * 2) % sc().length] + 12, 0.5, 0.3, { ratio: 3, index: 1.5, dly: 0.2 }); void n; };
  S.lumen = () => { if (!Sound.ctx()) return; const t = Sound.grid(2); I.swell(t, 0.3, 0.8); I.bell(t + 0.3, sc()[4] + 12, 1.2, 0.5); };
  S.clear = (n, cells) => {
    if (!Sound.ctx()) return;
    const t = Sound.grid(1), sd = 15 / Sound.bpm(), k = Math.min(8, Math.max(2, n + 1));
    for (let i = 0; i < k; i++) I.pluck(t + i * sd * 0.5, sc()[(i * 2) % sc().length] + 12 * Math.floor(i / 4), 0.15, 0.4 - i * 0.02, { wave: "sawtooth", cut: 6000, q: 3, dly: 0.25, rev: 0.25, pan: (i % 2 ? 0.4 : -0.4) });
    I.fall(t, 0.4, 0.4); void cells;
  };
  S.big = (m) => { if (!Sound.ctx()) return; const t = Sound.grid(4), s = sc(); I.stab(t, [s[0], s[2], s[4], s[0] + 12], 0.8, { cut: 6000, dly: 0.2 }); if (m >= 3) I.impact(t, 0.6); };
  S.bonus = (k) => { if (!Sound.ctx()) return; const t = Sound.grid(4), s = sc(); I.impact(t, 0.9); I.choir(t, [s[0], s[2], s[4]], 2.2, 0.8, { vowel: "a", att: 0.05 }); if (k > 1) I.bell(t, s[0] + 24, 2, 0.6); };
  S.gift = () => { if (!Sound.ctx()) return; const t = Sound.grid(2), s = sc(); I.swell(t, 0.5, 0.8); I.choir(t + 0.4, [s[0], s[2], s[4], s[0] + 12], 2.5, 0.7, { vowel: "o", att: 0.1 }); I.bell(t + 0.4, s[4] + 12, 2, 0.5); };
  S.stage = () => { if (!Sound.ctx()) return; const mt = Sound.musicTime(); const bar = mt ? (60 / Sound.bpm()) * 4 : 2; const t = Sound.now() + 0.05; I.riser(t, bar * 0.9, 0.9); I.impact(t + bar, 1, {}); };
  S.over = () => { if (!Sound.ctx()) return; const t = Sound.now() + 0.02; I.fall(t, 1.8, 1); I.impact(t, 0.7); };
  S.select = () => { if (!Sound.ctx()) return; I.bell(Sound.now() + 0.01, 84, 0.6, 0.35, { ratio: 3, index: 1.2, sfx: true }); };
  return S;
})();

// ---- The ticker: the Doctors' words, under the field, at a reading pace -------------------------------
const Ticker = (() => {
  const T = { cur: null, x: 0, list: [], i: 0, stage: null, next: null, speed: 30 };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  T.set = (st) => { T.stage = st; T.list = shuffle(QUOTES[st.id] || []); T.i = 0; T.cur = null; T.next = null; };
  T.queueStage = (st) => { T.next = st; };
  T.step = (dt) => {
    if (!T.stage) return;
    if (!T.cur) {
      if (T.next) { T.set(T.next); }
      const q = T.list[T.i++ % Math.max(1, T.list.length)]; if (!q) return;
      ctx.font = "italic 500 14px " + FONT.quote; const w1 = ctx.measureText("“" + q.t + "”").width;
      ctx.font = "600 9px " + FONT.ui; const w2 = ctx.measureText(("— " + T.stage.name + ", " + q.s).toUpperCase()).width;
      T.cur = { q, w1, w2, w: w1 + 18 + w2, stage: T.stage }; T.x = W + 10;
    }
    T.x -= T.speed * dt;
    if (T.x + T.cur.w < -40) T.cur = null;
  };
  T.draw = (y, h, colors) => {
    const c = ctx;
    c.save();
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, "rgba(0,0,0,0)"], [0.12, "rgba(0,0,0,0.45)"], [0.88, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]]);
    c.fillRect(0, y, W, h);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, "rgba(255,255,255,0)"], [0.5, colors.accent], [1, "rgba(255,255,255,0)"]]);
    c.globalAlpha = 0.5; c.fillRect(0, y, W, 0.6); c.fillRect(0, y + h - 0.6, W, 0.6); c.globalAlpha = 1;
    c.beginPath(); c.rect(0, y, W, h); c.clip();
    if (T.cur) {
      const q = T.cur.q;
      text("“" + q.t + "”", T.x, y + h / 2 + 5, { font: FONT.quote, size: 14, weight: "italic 500", color: colors.ink });
      text(("— " + T.cur.stage.name + ", " + q.s).toUpperCase(), T.x + T.cur.w1 + 18, y + h / 2 + 3.5, { size: 9, weight: 600, color: colors.accent, spacing: 0.6 });
    }
    // The edges fade into the dark.
    c.restore();
  };
  return T;
})();

// ---- Drawing --------------------------------------------------------------------------------------
const spriteCache = new Map();
// A block, drawn once at the screen's own resolution and kept.
function sprite(stage, k, marked) {
  const key = stage.id + k + (marked ? "m" : "n");
  let s = spriteCache.get(key); if (s) return s;
  const px = Math.max(1, Math.round(CS * scale * DPR)); s = document.createElement("canvas"); s.width = s.height = px;
  const c = s.getContext("2d"), z = px / CS; c.scale(z, z);
  const [base, light, dark] = stage.colors[k];
  const r = 3.5, x = 0.6, y = 0.6, w = CS - 1.2;
  const rr = () => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + w, r); c.arcTo(x + w, y + w, x, y + w, r); c.arcTo(x, y + w, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  rr(); c.fillStyle = grad(c, 0, 0, CS, CS, [[0, light], [0.45, base], [1, dark]]); c.fill();
  c.save(); rr(); c.clip(); stage.motif && stage.motif(c, k, CS); c.restore();
  c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x + 2.5, y + 1.6, w - 5, 1.2);
  if (marked) { rr(); c.fillStyle = "rgba(255,255,255,0.28)"; c.fill(); c.strokeStyle = "rgba(255,255,255,0.95)"; c.lineWidth = 1.4; rr(); c.stroke(); }
  else { c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 1; rr(); c.stroke(); }
  spriteCache.set(key, s); return s;
}
function drawCell(stage, x, y, cc, alpha) {
  const k = cc.c ? "b" : "a";
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.drawImage(sprite(stage, k, cc.mark || cc.chain), x, y, CS, CS);
  if (cc.lit) { ctx.fillStyle = hexA(stage.colors.line, 0.28 + 0.12 * Math.sin(performance.now() / 60)); ctx.fillRect(x + 1, y + 1, CS - 2, CS - 2); ctx.strokeStyle = stage.colors.accent; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, CS - 4, CS - 4); }
  if (cc.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${cc.flash * 1.4})`; ctx.fillRect(x + 1, y + 1, CS - 2, CS - 2); }
  if (cc.gem) drawGem(x + CS / 2, y + CS / 2);
  ctx.globalAlpha = 1;
}
function drawGem(x, y) {
  const t = performance.now() / 1000, k = 0.75 + Math.sin(t * 8) * 0.25;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255,255,230,${0.5 * k})`; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? 2 : 6 * k; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  ctx.restore();
}
function beatInfo() {
  const mt = Sound.musicTime(), bpm = Sound.bpm(), now = Sound.now();
  if (!mt) { const b = now * (bpm / 60); return { beat: b, pulse: Math.exp(-(b % 1) * 5) }; }
  const b = (now - mt.barT) / (60 / bpm);
  const ph = ((b % 1) + 1) % 1;
  return { beat: b, pulse: Math.exp(-ph * 5) };
}
function drawBackground(stage, alpha, extra) {
  const bi = beatInfo(), t = performance.now() / 1000;
  ctx.globalAlpha = alpha;
  stage.bg(ctx, Object.assign({ t, pulse: bi.pulse, L: G ? G.level : 1, energy: G ? G.energy : 0 }, extra || {}));
  ctx.globalAlpha = 1;
}
function drawPlay(quiet) {
  const st = G.stage, col = st.colors, t = performance.now() / 1000;
  const sect = st.id === "thomas" ? (() => { const mt = Sound.musicTime(); if (!mt) return null; const p = mt.bar % 12; return p < 3 ? "obj" : p === 3 ? "contra" : p < 8 ? "resp" : "rep"; })() : null;
  drawBackground(st, 1, { section: sect });
  if (G.prev && G.fadeT > 0) drawBackground(G.prev, clamp(G.fadeT / 1.6, 0, 1));
  // The field.
  ctx.fillStyle = col.panel; ctx.fillRect(FX - 4, FY - 44, COLS * CS + 8, ROWS * CS + 48);
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(FX + x * CS + 0.5, FY); ctx.lineTo(FX + x * CS + 0.5, FY + ROWS * CS); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(FX, FY + y * CS + 0.5); ctx.lineTo(FX + COLS * CS, FY + y * CS + 0.5); ctx.stroke(); }
  ctx.strokeStyle = col.accent; ctx.globalAlpha = 0.5; ctx.strokeRect(FX - 4.5, FY - 0.5, COLS * CS + 9, ROWS * CS + 4); ctx.globalAlpha = 1;
  if (G.danger > 0.02) { ctx.fillStyle = `rgba(255,40,60,${0.12 * G.danger * (0.6 + 0.4 * Math.sin(t * 6))})`; ctx.fillRect(FX, FY, COLS * CS, 3 * CS); }
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { const c = G.grid[x][y]; if (c) drawCell(st, FX + x * CS, FY + y * CS, c); }
  for (const f of G.falling) drawCell(st, FX + f.x * CS, FY + f.y * CS, { c: f.c, gem: f.gem });
  // The outline of every square, bright.
  ctx.strokeStyle = col.line; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
  for (const [x, y] of G.anchors) ctx.strokeRect(FX + x * CS + 1, FY + y * CS + 1, CS * 2 - 2, CS * 2 - 2);
  ctx.globalAlpha = 1;
  // In the lessons: where to put the block, glowing.
  if (G.target) { const [tx, ty] = G.target, a = 0.35 + 0.3 * Math.sin(t * 6); ctx.strokeStyle = hexA(col.line, a + 0.3); ctx.lineWidth = 2.5; ctx.strokeRect(FX + tx * CS + 1, FY + ty * CS + 1, CS * 2 - 2, CS * 2 - 2); ctx.fillStyle = hexA(col.line, a * 0.4); ctx.fillRect(FX + tx * CS + 1, FY + ty * CS + 1, CS * 2 - 2, CS * 2 - 2); }
  // The falling piece, and where it will land.
  const p = G.piece;
  if (p) {
    let gr = p.row; while (canAt(p.x, gr + 1)) gr++;
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.setLineDash([3, 3]); ctx.strokeRect(FX + p.x * CS + 1.5, FY + gr * CS + 1.5, CS * 2 - 3, CS * 2 - 3); ctx.setLineDash([]);
    const py = FY + (p.row + p.off) * CS;
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy], i) => drawCell(st, FX + (p.x + dx) * CS, py + dy * CS, { c: p.cells[i], gem: p.gems[i] }));
  }
  // The line of light.
  const lx = FX + G.tl * CS, held = G.holdT > 0;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad(ctx, lx - 26, 0, lx + 2, 0, [[0, "rgba(255,255,255,0)"], [1, held ? "rgba(255,255,255,0.08)" : hexA(col.line, 0.35)]]);
  ctx.fillRect(lx - 26, FY, 28, ROWS * CS);
  ctx.fillStyle = held ? "rgba(255,255,255,0.35)" : col.line; ctx.fillRect(lx - 1, FY - 6, 2, ROWS * CS + 8);
  ctx.restore();
  if (G.passSq > 0) { ctx.fillStyle = col.line; ctx.beginPath(); ctx.arc(lx, FY - 12, 9, 0, Math.PI * 2); ctx.fill(); text(String(G.passSq), lx, FY - 8.5, { align: "center", size: 10, weight: 800, color: "#101018" }); }
  for (const r of G.rings || []) { ctx.strokeStyle = hexA(col.line, 1 - r.t * 2); ctx.lineWidth = 2; ctx.strokeRect(r.x - r.t * 30, FY - r.t * 20, r.t * 60, ROWS * CS + r.t * 40); }
  // Sparks.
  ctx.save();
  for (const q of G.parts) {
    ctx.globalAlpha = clamp(q.life * 2, 0, 1); ctx.globalCompositeOperation = q.add ? "lighter" : "source-over"; ctx.fillStyle = q.c;
    if (q.petal) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
  }
  ctx.restore();
  drawHud();
  Ticker.draw(FY + ROWS * CS + 12, 26, col);
  if (G.mode === "tutorial") {
    drawLesson();
    if (G.tut.end && !quiet) {
      button("BEGIN THE PILGRIMAGE", W / 2 - 150, FY + 80, 300, 30, { hot: true, act: () => start("pilgrimage", 0, "easy") });
      button("BACK TO THE TITLE", W / 2 - 100, FY + 120, 200, 24, { act: finishToTitle });
    }
  }
  // Words over the field.
  if (!quiet) G.pops.forEach((q, i) => {
    const a = q.t < 0.15 ? q.t / 0.15 : q.t > 1.3 ? Math.max(0, (1.8 - q.t) / 0.5) : 1, y = FY + 70 + i * 34 - q.t * 8;
    text(q.str, W / 2, y, { align: "center", size: q.size, weight: 800, color: q.color, alpha: a, glow: "rgba(0,0,0,0.8)", blur: 8, spacing: 1.5 });
    if (q.sub) { const ls = wrap(q.sub, 280, "500 9px " + FONT.ui); ls.slice(0, 2).forEach((l, k) => text(l, W / 2, y + 13 + k * 11, { align: "center", size: 9, weight: 500, color: "#ffffff", alpha: a * 0.9, glow: "rgba(0,0,0,0.9)", blur: 6 })); }
  });
  if (G.banner.t < 4.2 && !quiet) drawBanner(st, G.banner.t);
  if (G.over) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, G.overT * 0.4)})`; ctx.fillRect(0, 0, W, H); }
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`; }
const ROMAN = (n) => { const r = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; for (const [v, l] of [[30, "XXX"], [20, "XX"], ...r]) while (n >= v) { s += l; n -= v; } return s; };
function drawBanner(st, bt) {
  const a = bt < 0.4 ? bt / 0.4 : bt > 3.4 ? Math.max(0, (4.2 - bt) / 0.8) : 1, col = st.colors, y = FY + 50;
  ctx.globalAlpha = a * 0.75; ctx.fillStyle = "#000"; ctx.fillRect(0, y - 34, W, 92); ctx.globalAlpha = 1;
  text(ROMAN(st.n) + "  ·  " + st.life + "  ·  " + st.place.toUpperCase(), W / 2, y - 16, { align: "center", size: 9, weight: 600, color: col.accent, alpha: a, spacing: 2, max: 560 });
  text(st.name.toUpperCase(), W / 2, y + 10, { align: "center", size: 26, weight: 700, font: FONT.title, color: "#ffffff", alpha: a, glow: col.accent, blur: 14, spacing: 1, max: 580 });
  text(st.title, W / 2, y + 28, { align: "center", size: 15, weight: "italic 500", font: FONT.quote, color: col.ink, alpha: a, max: 560 });
  text("♪  " + SONGS[st.song].title + "      ✦  Gift: " + st.gift.name, W / 2, y + 47, { align: "center", size: 9, weight: 600, color: col.accent, alpha: a, max: 580 });
}
function drawHud() {
  const st = G.stage, col = st.colors;
  ctx.fillStyle = col.panel; roundRect(18, FY - 46, 104, 250, 12); ctx.fill(); roundRect(518, FY - 46, 104, 250, 12); ctx.fill();
  // Top: who, and the song (the lesson, in the tutorial).
  if (G.mode !== "tutorial") {
    text(ROMAN(st.n) + " · " + st.name.toUpperCase(), W / 2, 22, { align: "center", size: 13, weight: 700, font: FONT.title, color: "#ffffff", glow: "rgba(0,0,0,0.7)", blur: 6, spacing: 1, max: 370 });
    text(st.title + "   ♪ " + SONGS[st.song].title, W / 2, 38, { align: "center", size: 12, weight: "italic 500", font: FONT.quote, color: col.ink, glow: "rgba(0,0,0,0.8)", blur: 6, max: 370 });
  }
  // Left: what comes next.
  text("NEXT", 70, FY - 30, { align: "center", size: 8, weight: 700, color: col.accent, spacing: 2 });
  G.queue.forEach((q, i) => {
    const s = i ? 0.55 : 0.8, ox = 70 - CS * s, oy = FY - 22 + i * 46 * (i ? 0.9 : 1);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy], k) => drawCell(st, dx * CS, dy * CS, { c: q.cells[k], gem: q.gems[k] }));
    ctx.restore();
  });
  // The gift (none in Master mode).
  const gx = 70, gy = 244, r = 23, full = G.gift >= 1, tt = performance.now() / 1000;
  if (G.mode !== "master") {
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = full ? col.line : col.accent; ctx.beginPath(); ctx.arc(gx, gy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.gift); ctx.stroke();
  if (full) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(col.line, 0.25 + 0.2 * Math.sin(tt * 6)); ctx.beginPath(); ctx.arc(gx, gy, r - 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (G.giftGlow > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = hexA(col.line, G.giftGlow / 1.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, r + 6 + (1.6 - G.giftGlow) * 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  // (i): what this gift does, with the game paused.
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(INFO.x, INFO.y, INFO.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col.accent; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(INFO.x, INFO.y, INFO.r, 0, Math.PI * 2); ctx.stroke();
  text("i", INFO.x, INFO.y + 4, { align: "center", size: 11, weight: 700, font: FONT.quote, color: "#ffffff" });
  text("✦", gx, gy + 5, { align: "center", size: 16, weight: 700, color: full ? "#ffffff" : "rgba(255,255,255,0.4)" });
  text(full ? "GIFT READY" : "GIFT", gx, gy + r + 13, { align: "center", size: 8, weight: 700, color: full ? col.line : col.accent, spacing: 1.5 });
  const gf = wrapFit(st.gift.name, 94, 11, 2, "italic 500", FONT.quote);
  gf.lines.forEach((l, i) => text(l, gx, gy + r + 25 + i * (gf.size + 1), { align: "center", size: gf.size, weight: "italic 500", font: FONT.quote, color: col.ink, max: 96 }));
  if (G.hangT > 0) text("STILL " + Math.ceil(G.hangT) + "s", gx, gy - r - 8, { align: "center", size: 8, weight: 700, color: col.line, max: 96 });
  if (G.holdT > 0) text("THE LINE WAITS", gx, gy - r - 8, { align: "center", size: 8, weight: 700, color: col.line, max: 96 });
  if (G.calmT > 0) text("CALM " + Math.ceil(G.calmT) + "s", gx, gy - r - 8, { align: "center", size: 8, weight: 700, color: col.line, max: 96 });
  } else text("NO GIFTS IN MASTER", gx, gy, { align: "center", size: 8, weight: 700, color: col.accent, max: 96 });
  // Right: the score and the way.
  const rx = 570;
  const row = (label, val, y, big) => { text(label, rx, y, { align: "center", size: 8, weight: 700, color: col.accent, spacing: 2, max: 96 }); text(val, rx, y + (big ? 20 : 16), { align: "center", size: big ? 19 : 14, weight: 700, color: "#ffffff", glow: "rgba(0,0,0,0.6)", blur: 4, max: 96 }); };
  row("SCORE", G.score.toLocaleString(), FY - 22, true);
  row("SQUARES", String(G.squares), FY + 26);
  if (G.mode === "pilgrimage") {
    row(DIFF[G.diff].name + " · " + (G.si + 1) + " OF " + STAGES.length, G.stageSq + " / " + TARGET, FY + 70);
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(rx - 40, FY + 92, 80, 3); ctx.fillStyle = col.line; ctx.fillRect(rx - 40, FY + 92, 80 * Math.min(1, G.stageSq / TARGET), 3);
  } else if (G.mode === "master") {
    const Z = MASTER[G.zone];
    row("ZONE " + (G.zone + 1) + " OF " + MASTER.length, G.zoneSq + " / " + Z.quota, FY + 70);
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(rx - 40, FY + 92, 80, 3); ctx.fillStyle = col.line; ctx.fillRect(rx - 40, FY + 92, 80 * Math.min(1, G.zoneSq / Z.quota), 3);
  } else if (G.mode === "tutorial") row("LESSON", (G.tut.i + 1) + " / " + LESSONS.length, FY + 70);
  else row("SINGLE · " + DIFF[G.diff].name, "level " + (1 + Math.floor(G.squares / 40)), FY + 70);
  if (G.combo > 0) row("STREAK", "×" + Math.min(5, 1 + G.combo), FY + 114);
  const tm = G.mode === "master" ? Math.max(0, Math.ceil(MASTER[G.zone].secs - G.zoneT)) : Math.floor(G.time);
  row(G.mode === "master" ? "TIME LEFT" : "TIME", Math.floor(tm / 60) + ":" + String(tm % 60).padStart(2, "0"), FY + 158);
  if (G.mode === "master" && tm <= 10 && Math.floor(performance.now() / 250) % 2) { ctx.strokeStyle = "#ff5a6a"; ctx.lineWidth = 2; roundRect(526, FY + 146, 88, 28, 6); ctx.stroke(); }
  // Pause.
  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillRect(W - 24, 10, 4, 14); ctx.fillRect(W - 16, 10, 4, 14);
}

// ---- Menus --------------------------------------------------------------------------------------
let menuT = 0, overT = 0;
const buttons = [];
function button(label, x, y, w, h, o) {
  o = o || {}; const hot = o.hot;
  ctx.save();
  ctx.fillStyle = hot ? "rgba(255,255,255,0.95)" : "rgba(10,8,20,0.55)"; roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = o.color || "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2; roundRect(x, y, w, h, h / 2); ctx.stroke();
  ctx.restore();
  text(label, x + w / 2, y + h / 2 + (o.size || 11) * 0.36, { align: "center", size: o.size || 11, weight: 700, color: hot ? "#140c20" : "#ffffff", spacing: 2, max: w - 18 });
  const b = { x, y, w, h, act: o.act }; buttons.push(b); return b;
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawTitle(dt) {
  menuT += dt;
  // Behind: the Doctors' worlds, one after another.
  const k = Math.floor(menuT / 7) % STAGES.length, u = (menuT % 7) / 7;
  STAGES[k].bg(ctx, { t: menuT, pulse: beatInfo().pulse, L: 2, energy: 0 });
  if (u > 0.85) { ctx.globalAlpha = (u - 0.85) / 0.15; STAGES[(k + 1) % STAGES.length].bg(ctx, { t: menuT, pulse: beatInfo().pulse, L: 2, energy: 0 }); ctx.globalAlpha = 1; }
  ctx.fillStyle = "rgba(4,2,12,0.55)"; ctx.fillRect(0, 0, W, H);
  const pulse = beatInfo().pulse;
  text("LUMINARIES", W / 2, 112, { align: "center", size: 52, weight: 700, font: FONT.title, color: "#fff8e8", glow: `rgba(255,220,140,${0.6 + pulse * 0.4})`, blur: 22 + pulse * 10, spacing: 6 });
  text("O Doctor optime, Ecclesiae sanctae lumen", W / 2, 140, { align: "center", size: 16, weight: "italic 500", font: FONT.quote, color: "#ffe8c0" });
  text("O best of teachers, light of holy Church  ·  the antiphon for the Doctors", W / 2, 158, { align: "center", size: 8.5, weight: 600, color: "rgba(255,240,220,0.7)", spacing: 1 });
  button("PILGRIMAGE", W / 2 - 90, 176, 180, 26, { hot: true, act: () => { state = "pilgrim"; } });
  button("LEARN TO PLAY", W / 2 - 186, 210, 180, 22, { hot: !save.learned, act: () => start("tutorial", 0) });
  button("SINGLE STAGE", W / 2 + 6, 210, 180, 22, { act: () => { state = "stages"; } });
  button(save.master ? "MASTER  ✦" : masterOpen() ? "MASTER" : "MASTER  · LOCKED", W / 2 - 90, 240, 180, 22, { size: masterOpen() ? 11 : 9, act: () => { state = "master"; } });
  button(Sound.muted ? "SOUND OFF" : "SOUND ON", W / 2 - 186, 272, 180, 18, { size: 9, act: () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); } });
  // Reset progress: a second tap within four seconds confirms.
  const armed = menuT - resetArm < 4;
  button(armed ? "TAP AGAIN TO ERASE ALL" : "RESET PROGRESS", W / 2 + 6, 272, 180, 18, { size: 9, color: armed ? "#ff7a8a" : undefined, act: () => { if (menuT - resetArm < 4) { resetProgress(); resetArm = -99; } else resetArm = menuT; } });
  if (save.master) text("DOCTOR OPTIME", W / 2, 304, { align: "center", size: 11, weight: 700, font: FONT.title, color: "#ffe8a0", glow: "rgba(255,220,140,0.8)", blur: 10, spacing: 3 });
  text("The Pilgrimage: all " + STAGES.length + " Doctors of the Church, in the order of their lives" + (save.best ? "   ·   best " + save.best.toLocaleString() : ""), W / 2, 330, { align: "center", size: 9, weight: 600, color: "rgba(255,255,255,0.7)", max: 600 });
  if (!Sound.ctx()) text("Tap anywhere to begin with sound", W / 2, 346, { align: "center", size: 9, weight: 600, color: "#ffe8c0", alpha: 0.6 + Math.sin(menuT * 4) * 0.4 });
}
let stagePage = 0;
function drawStages(dt) {
  menuT += dt;
  ctx.fillStyle = grad(ctx, 0, 0, W, H, [[0, "#0a0618"], [1, "#1a1030"]]); ctx.fillRect(0, 0, W, H);
  text("SINGLE STAGE", W / 2, 30, { align: "center", size: 20, weight: 700, font: FONT.title, color: "#ffffff", spacing: 3 });
  text("Play one Doctor's stage for as long as you last, at the pace of that point in the Pilgrimage", W / 2, 47, { align: "center", size: 12, weight: "italic 500", font: FONT.quote, color: "#e8dcff", max: 600 });
  const per = 12, pages = Math.ceil(STAGES.length / per); stagePage = clamp(stagePage, 0, pages - 1);
  STAGES.slice(stagePage * per, stagePage * per + per).forEach((st, k) => {
    const i = stagePage * per + k, cw = 146, chh = 76, x = 20 + (k % 4) * (cw + 4), y = 58 + Math.floor(k / 4) * (chh + 6);
    ctx.save(); roundRect(x, y, cw, chh, 9); ctx.clip();
    ctx.translate(x, y); ctx.scale(cw / W, chh / H); st.bg(ctx, { t: menuT, pulse: 0, L: 1, energy: 0 }); ctx.restore();
    const open = stageOpen(i);
    ctx.fillStyle = open ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.8)"; roundRect(x, y, cw, chh, 9); ctx.fill();
    ctx.strokeStyle = st.colors.accent; ctx.lineWidth = 1.2; roundRect(x, y, cw, chh, 9); ctx.stroke();
    if (!open) {
      // Not yet passed: the numeral, a padlock, the name, and how to open it.
      text(ROMAN(st.n) + " · " + st.life, x + cw - 8, y + 16, { align: "right", size: 7.5, weight: 600, color: "rgba(255,255,255,0.45)", max: cw - 40 });
      const lx = x + 18, ly = y + 16; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(lx, ly - 3, 4, Math.PI, 0); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(lx - 5.5, ly - 3, 11, 8);
      text(st.name, x + 8, y + 42, { size: 12, weight: 700, font: FONT.title, color: "rgba(255,255,255,0.55)", max: cw - 16 });
      text("Pass this Doctor in the Pilgrimage", x + 8, y + 62, { size: 8, weight: 600, color: "rgba(255,255,255,0.6)", max: cw - 16 });
      return;
    }
    for (const [kk, dx] of [["a", 0], ["b", 1]]) ctx.drawImage(sprite(st, kk, false), x + 8 + dx * 12, y + 8, 10, 10);
    text(ROMAN(st.n) + " · " + st.life, x + cw - 8, y + 16, { align: "right", size: 7.5, weight: 600, color: st.colors.accent, max: cw - 40 });
    text(st.name, x + 8, y + 36, { size: 12, weight: 700, font: FONT.title, color: "#ffffff", max: cw - 16 });
    text(st.title, x + 8, y + 50, { size: 11, weight: "italic 500", font: FONT.quote, color: st.colors.ink, max: cw - 16 });
    text("♪ " + SONGS[st.song].title, x + 8, y + 67, { size: 8, weight: 600, color: st.colors.accent, max: save.stageBest[st.id] ? cw - 60 : cw - 16 });
    if (save.stageBest[st.id]) text(save.stageBest[st.id].toLocaleString(), x + cw - 8, y + 67, { align: "right", size: 7.5, weight: 600, color: "#ffffff", max: 44 });
    buttons.push({ x, y, w: cw, h: chh, act: () => start("single", i, save.diffSel) });
  });
  // Which difficulty Single Stage plays at.
  DIFFS.forEach((dd, k) => { const open = diffOpen(dd.id), on = save.diffSel === dd.id && open; button(dd.name, 70 + k * 64, 318, 60, 22, { size: 8, hot: on, color: open ? undefined : "rgba(255,255,255,0.2)", act: () => { if (open) { save.diffSel = dd.id; store(); } } }); });
  if (pages > 1) {
    button("◀", 20, 318, 44, 22, { act: () => { stagePage = (stagePage + pages - 1) % pages; } });
    button("▶", W - 64, 318, 44, 22, { act: () => { stagePage = (stagePage + 1) % pages; } });
    text("page " + (stagePage + 1) + " of " + pages, W / 2 + 160, 333, { align: "center", size: 9, weight: 600, color: "#c8b8ff" });
  }
  button("BACK", W / 2 + 10, 318, 100, 22, { act: () => { state = "title"; } });
}
// The Pilgrimage, before it begins: Easy, Normal or Hard, and where each one has reached.
function drawPilgrim(dt) {
  menuT += dt;
  ctx.fillStyle = grad(ctx, 0, 0, W, H, [[0, "#0a0618"], [1, "#1a1030"]]); ctx.fillRect(0, 0, W, H);
  text("THE PILGRIMAGE", W / 2, 32, { align: "center", size: 22, weight: 700, font: FONT.title, color: "#ffffff", spacing: 3 });
  text("All thirty-eight Doctors, in the order of their lives, a little faster with each one", W / 2, 50, { align: "center", size: 12, weight: "italic 500", font: FONT.quote, color: "#e8dcff", max: 600 });
  const N = STAGES.length;
  DIFFS.forEach((d, k) => {
    const x = 20 + k * 205, y = 62, w = 190, h = 168, open = diffOpen(d.id), D = save.diff[d.id], sel = save.diffSel === d.id;
    const st = STAGES[Math.min(N - 1, D.done ? N - 1 : D.reached)];
    ctx.save(); roundRect(x, y, w, h, 12); ctx.clip(); ctx.translate(x, y); ctx.scale(w / W, h / H);
    st.bg(ctx, { t: menuT, pulse: 0, L: 1 + k, energy: 0 }); ctx.restore();
    ctx.fillStyle = open ? (sel ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.62)") : "rgba(0,0,0,0.8)"; roundRect(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = sel && open ? "#ffffff" : "rgba(255,255,255,0.35)"; ctx.lineWidth = sel && open ? 2.5 : 1; roundRect(x, y, w, h, 12); ctx.stroke();
    text(d.name, x + w / 2, y + 30, { align: "center", size: 20, weight: 700, font: FONT.title, color: open ? "#ffffff" : "rgba(255,255,255,0.45)", spacing: 3 });
    // The pace, drawn: a line climbing from the first Doctor to the last.
    ctx.strokeStyle = open ? st.colors.accent : "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const u = i / 20, v = curveSpeed(d.id, u); ctx[i ? "lineTo" : "moveTo"](x + 20 + u * (w - 40), y + 72 - (v - 0.5) * 9); }
    ctx.stroke();
    const ab = wrapFit(d.about, w - 24, 10, 3, "500", FONT.ui);
    ab.lines.forEach((l, i) => text(l, x + w / 2, y + 96 + i * (ab.size + 3), { align: "center", size: ab.size, weight: 500, color: open ? "#ffffff" : "rgba(255,255,255,0.45)" }));
    const status = !open ? "Opens once you have finished the Pilgrimage" : D.done ? "✦ COMPLETE ✦" : D.reached > 0 ? "Reached " + STAGES[D.reached].name : "Not yet begun";
    text(status, x + w / 2, y + h - 14, { align: "center", size: 9, weight: 700, color: open ? (D.done ? "#ffe8a0" : st.colors.accent) : "rgba(255,255,255,0.5)", max: w - 20 });
    if (open) buttons.push({ x, y, w, h, act: () => { save.diffSel = d.id; store(); } });
  });
  const d = DIFF[diffOpen(save.diffSel) ? save.diffSel : "easy"], D = save.diff[d.id];
  const canCont = D.reached > 0 && !(D.done && D.reached >= N - 1);
  if (canCont) {
    button("BEGIN: " + d.name, W / 2 - 186, 244, 180, 28, { hot: !canCont, act: () => start("pilgrimage", 0, d.id) });
    button("CONTINUE: " + STAGES[D.reached].short.toUpperCase(), W / 2 + 6, 244, 180, 28, { hot: true, size: 9, act: () => start("pilgrimage", D.reached, d.id) });
  } else button("BEGIN: " + d.name, W / 2 - 90, 244, 180, 28, { hot: true, act: () => start("pilgrimage", 0, d.id) });
  if (D.done && typeof startScene === "function") button("SEE THE DOCTORS' WORD", W / 2 - 186, 282, 180, 22, { size: 9, act: () => startScene(d.id, () => { state = "pilgrim"; Sound.play(SONGS.title); }) });
  button("BACK", D.done ? W / 2 + 6 : W / 2 - 60, 282, D.done ? 180 : 120, 22, { act: () => { state = "title"; } });
}
// Master mode, before it begins: what it asks.
function drawMaster(dt) {
  menuT += dt;
  const st = STAGES[masterStage(0)];
  st.bg(ctx, { t: menuT, pulse: beatInfo().pulse, L: 3, energy: 0 });
  ctx.fillStyle = "rgba(4,2,12,0.72)"; ctx.fillRect(0, 0, W, H);
  text("MASTER", W / 2, 50, { align: "center", size: 30, weight: 700, font: FONT.title, color: "#ffffff", spacing: 6, glow: "rgba(255,220,140,0.7)", blur: 16 });
  text("Five zones, fast from the first block, and no gifts.", W / 2, 76, { align: "center", size: 14, weight: "italic 500", font: FONT.quote, color: "#ffe8c0" });
  text("Clear each zone's squares before its time runs out. Finish all five to be named Doctor Optime.", W / 2, 94, { align: "center", size: 10, weight: 500, color: "#ffffff", max: 560 });
  MASTER.forEach((Z, i) => {
    const s2 = STAGES[masterStage(i)], y = 116 + i * 30;
    ctx.fillStyle = "rgba(255,255,255,0.06)"; roundRect(120, y, 400, 24, 8); ctx.fill();
    text("ZONE " + (i + 1), 134, y + 16, { size: 9, weight: 800, color: s2.colors.accent, spacing: 1.5 });
    text(s2.name, 200, y + 16, { size: 11, weight: 700, font: FONT.title, color: "#ffffff", max: 190 });
    text(Z.quota + " squares in " + Z.secs + "s", 506, y + 16, { align: "right", size: 9, weight: 600, color: "#e8e0ff" });
  });
  if (!masterOpen()) {
    text("Master opens once you have finished the Pilgrimage.", W / 2, 286, { align: "center", size: 11, weight: "italic 500", font: FONT.quote, color: "#ffe8c0", max: 560 });
    button("BACK", W / 2 - 70, 300, 140, 26, { hot: true, act: () => { state = "title"; } });
    return;
  }
  if (save.masterBest) text("best " + save.masterBest.toLocaleString() + (save.master ? "   ·   DOCTOR OPTIME" : ""), W / 2, 284, { align: "center", size: 9, weight: 600, color: "#ffe8c0" });
  button("BEGIN", W / 2 - 150, 300, 140, 26, { hot: true, act: () => start("master", 0) });
  button("BACK", W / 2 + 10, 300, 140, 26, { act: () => { state = "title"; } });
}
function drawPause(dt) {
  drawPlay(true);
  ctx.fillStyle = "rgba(4,2,12,0.75)"; ctx.fillRect(0, 0, W, H);
  text("PAUSED", W / 2, 90, { align: "center", size: 28, weight: 700, font: FONT.title, color: "#ffffff", spacing: 4 });
  text(G.stage.name + "  ·  " + DIFF[G.diff].name, W / 2, 120, { align: "center", size: 14, weight: "italic 500", font: FONT.quote, color: G.stage.colors.ink, max: 420 });
  button("RESUME", W / 2 - 90, 180, 180, 26, { hot: true, act: resume });
  button(Sound.muted ? "SOUND OFF" : "SOUND ON", W / 2 - 90, 214, 180, 22, { act: () => { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); } });
  button("END AND RETURN", W / 2 - 90, 242, 180, 22, { act: () => { Sound.muffle(false); finishToTitle(); } });
  void dt;
}
function pause() { if (state === "play" && G && !G.over) { state = "pause"; Sound.muffle(true); } }
// The gift's (i) button, beside the dial: the game waits while you read.
const INFO = { x: 108, y: 214, r: 9 };
function giftInfo() { if (state === "play" && G && !G.over && G.mode !== "master") { state = "giftinfo"; Sound.muffle(true); Input.soft = false; } }
function drawGiftInfo(dt) {
  drawPlay(true);
  const st = G.stage, col = st.colors, g = st.gift;
  ctx.fillStyle = "rgba(4,2,12,0.72)"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10,8,22,0.9)"; roundRect(130, 70, 380, 200, 16); ctx.fill();
  ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5; roundRect(130, 70, 380, 200, 16); ctx.stroke();
  text("THE GIFT OF " + st.name.toUpperCase(), W / 2, 98, { align: "center", size: 9, weight: 700, color: col.accent, spacing: 2, max: 340 });
  text("✦  " + g.name + "  ✦", W / 2, 126, { align: "center", size: 22, weight: "italic 600", font: FONT.quote, color: "#ffffff", max: 350 });
  const ls = wrapFit(g.about, 330, 13, 4, "500", FONT.ui);
  ls.lines.forEach((l, i) => text(l, W / 2, 152 + i * (ls.size + 5), { align: "center", size: ls.size, weight: 500, color: "#ffffff" }));
  text(G.gift >= 1 ? "Your gift is ready: tap ✦ (or press G) to use it." : "Clear squares to fill the ring around ✦; when it is full, tap it.", W / 2, 222, { align: "center", size: 9, weight: 600, color: col.ink, max: 340 });
  button("BACK TO PLAY", W / 2 - 80, 234, 160, 24, { hot: true, act: resume });
  void dt;
}
function resume() { state = "play"; Sound.muffle(false); Input.soft = false; }
function finishToTitle() { if (G && G.score > save.best) { save.best = G.score; store(); } G = null; state = "title"; Sound.play(SONGS.title); }
function drawOver(dt) {
  overT += dt;
  drawPlay(true);
  ctx.fillStyle = "rgba(4,2,12,0.78)"; ctx.fillRect(0, 0, W, H);
  const st = G.stage, won = G.won;
  const head = G.mode === "master" ? (won ? "DOCTOR OPTIME" : G.zoneT >= MASTER[G.zone].secs ? "TIME RAN OUT IN ZONE " + (G.zone + 1) : "MASTER ENDS IN ZONE " + (G.zone + 1)) : won ? "THE PILGRIMAGE IS COMPLETE · " + DIFF[G.diff].name : G.mode === "pilgrimage" ? "THE PILGRIMAGE PAUSES HERE · " + DIFF[G.diff].name : "THE STAGE IS ENDED";
  text(head, W / 2, 70, { max: 600, align: "center", size: 20, weight: 700, font: FONT.title, color: "#ffffff", spacing: 2, glow: st.colors.accent, blur: 12 });
  text(G.score.toLocaleString() + (G.newBest ? "   NEW BEST" : ""), W / 2, 108, { align: "center", size: 30, weight: 800, color: G.newBest ? st.colors.line : "#ffffff" });
  text(G.squares + " squares   ·   reached " + st.name + "   ·   " + Math.floor(G.time / 60) + ":" + String(Math.floor(G.time % 60)).padStart(2, "0"), W / 2, 130, { align: "center", size: 10, weight: 600, color: st.colors.accent, max: 600 });
  if (won) text(G.mode === "master" ? "All five zones cleared: you are named Doctor Optime." : "All thirty-eight Doctors of the Church, from Irenaeus to Thérèse.", W / 2, 150, { align: "center", size: 13, weight: "italic 500", font: FONT.quote, color: "#ffffff", max: 560 });
  if (!G.overQuote) { const qs = QUOTES[st.id]; G.overQuote = qs[Math.floor(Math.random() * qs.length)]; }
  const q = G.overQuote, ls = wrap("“" + q.t + "”", 440, "italic 500 15px " + FONT.quote);
  ls.forEach((l, i) => text(l, W / 2, 182 + i * 18, { align: "center", size: 15, weight: "italic 500", font: FONT.quote, color: st.colors.ink }));
  text(("— " + st.name + ", " + q.s).toUpperCase(), W / 2, 188 + ls.length * 18, { align: "center", size: 8, weight: 600, color: st.colors.accent, spacing: 0.8 });
  if (overT > 0.8) {
    button("AGAIN", W / 2 - 150, 292, 140, 26, { hot: true, act: () => start(G.mode, G.mode === "single" ? G.si : G.mode === "pilgrimage" ? G.startSi || 0 : 0, G.diff) });
    button("TITLE", W / 2 + 10, 292, 140, 26, { act: finishToTitle });
  }
}

// ---- Input ------------------------------------------------------------------------------------
const Input = { soft: false, keys: new Set(), das: { dir: 0, t: 0 }, touch: null };
function toGame(ev) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H }; }
function hitButton(p) { for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.act && b.act(); return true; } } return false; }
addEventListener("pointerdown", (ev) => {
  if (ev.cancelable) ev.preventDefault();
  const first = !Sound.ctx();
  Sound.init();
  if (first && state === "title") { Sound.play(SONGS.title); }
  const p = toGame(ev);
  if (state === "play") {
    // Taps outside the game's own picture (the black bands when the phone is upright) work the
    // field, never the buttons.
    const inside = p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
    if (inside && hitButton(p)) return;
    if (inside && p.x > W - 34 && p.y < 34) { pause(); return; }
    if (G.mode !== "master" && Math.hypot(p.x - INFO.x, p.y - INFO.y) < INFO.r + 6) { giftInfo(); return; }
    if (Math.hypot(p.x - 70, p.y - 244) < 34) { useGift(); return; }
    Input.touch = { id: ev.pointerId, x0: p.x, y0: p.y, t0: ev.timeStamp, col0: G.piece ? G.piece.x : 7, moved: false, down: false };
    return;
  }
  if (hitButton(p)) { if (Sound.ctx()) Sound.I.bell(Sound.now() + 0.01, 88, 0.5, 0.3, { ratio: 3, index: 1, sfx: true }); return; }
  if (state === "scene") sceneTap();
}, { passive: false });
addEventListener("pointermove", (ev) => {
  const T = Input.touch; if (!T || T.id !== ev.pointerId || state !== "play" || !G || !G.piece) return;
  const p = toGame(ev), dx = p.x - T.x0, dy = p.y - T.y0;
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) T.moved = true;
  if (!T.down && Math.abs(dx) > Math.abs(dy) * 0.8) {
    const want = clamp(T.col0 + Math.round(dx / 16), 0, COLS - 2);
    while (G.piece && G.piece.x < want) { const x = G.piece.x; move(1); if (G.piece.x === x) break; }
    while (G.piece && G.piece.x > want) { const x = G.piece.x; move(-1); if (G.piece.x === x) break; }
  }
  if (T.flicked) return;
  // A flick: a short, fast, straight stroke down, right from the start of the touch, timed by each
  // touch's own timestamp so a busy phone still reads it. Anything slower is a gentle drag.
  const now = ev.timeStamp;
  if (!T.down && dy > 22 && dy > Math.abs(dx) * 1.5 && now - T.t0 < 220 && dy / Math.max(1, now - T.t0) > 0.32) { T.flicked = true; Input.soft = false; hardDrop(); return; }
  if (dy > 30 && dy > Math.abs(dx) * 1.2) { T.down = true; Input.soft = true; Input.softTouch = dy - 30; }
}, { passive: false });
const release = (ev) => {
  const T = Input.touch; if (!T || T.id !== ev.pointerId) return;
  Input.touch = null; Input.soft = false; Input.softTouch = 0;
  if (state !== "play" || !G) return;
  const p = toGame(ev), dt = ev.timeStamp - T.t0, dy = p.y - T.y0, dx = p.x - T.x0;
  if (!T.moved && dt < 350) rotate(p.x < W / 2 ? -1 : 1);
};
addEventListener("pointerup", release); addEventListener("pointercancel", release);
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  const first = !Sound.ctx(); Sound.init(); if (first && state === "title") Sound.play(SONGS.title);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  Input.keys.add(e.code);
  if (e.code === "KeyM") { Sound.setMute(!Sound.muted); save.muted = Sound.muted; store(); return; }
  if (state === "play") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") { move(-1); Input.das = { dir: -1, t: 0.17 }; }
    else if (e.code === "ArrowRight" || e.code === "KeyD") { move(1); Input.das = { dir: 1, t: 0.17 }; }
    else if (e.code === "ArrowUp" || e.code === "KeyX" || e.code === "KeyW") rotate(1);
    else if (e.code === "KeyZ" || e.code === "KeyQ") rotate(-1);
    else if (e.code === "ArrowDown" || e.code === "KeyS") Input.soft = true;
    else if (e.code === "Space") hardDrop();
    else if (e.code === "KeyG" || e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Enter") useGift();
    else if (e.code === "KeyP" || e.code === "Escape") pause();
    else if (e.code === "KeyI") giftInfo();
    if (G && G.mode === "tutorial" && G.tut.end && e.code === "Enter") start("pilgrimage", 0, "easy");
  } else if (state === "pause") { if (e.code === "KeyP" || e.code === "Escape" || e.code === "Enter") resume(); }
  else if (state === "giftinfo") { if (["KeyI", "Escape", "Enter", "Space", "KeyP"].includes(e.code)) resume(); }
  else if (state === "scene") { if (e.code === "Escape") sceneSkip(); else if (e.code === "Enter" || e.code === "Space" || e.code === "ArrowRight") sceneTap(); }
  else if (state === "title") { if (e.code === "Enter" || e.code === "Space") state = "pilgrim"; }
  else if (state === "over" && overT > 0.8) { if (e.code === "Enter" || e.code === "Space") start(G.mode, G.mode === "single" ? G.si : G.mode === "pilgrimage" ? G.startSi || 0 : 0, G.diff); else if (e.code === "Escape") finishToTitle(); }
  else if ((state === "stages" || state === "master" || state === "pilgrim") && e.code === "Escape") state = "title";
  else if (state === "stages" && (e.code === "ArrowRight" || e.code === "ArrowLeft")) stagePage += e.code === "ArrowRight" ? 1 : -1;
});
addEventListener("keyup", (e) => {
  Input.keys.delete(e.code);
  if (e.code === "ArrowDown" || e.code === "KeyS") Input.soft = false;
  if ((e.code === "ArrowLeft" || e.code === "KeyA") && Input.das.dir < 0) Input.das.dir = 0;
  if ((e.code === "ArrowRight" || e.code === "KeyD") && Input.das.dir > 0) Input.das.dir = 0;
});
addEventListener("blur", pause);
function stepKeys(dt) {
  const d = Input.das; if (!d.dir) return;
  d.t -= dt; while (d.t <= 0) { move(d.dir); d.t += 0.045; }
}

// ---- The loop -------------------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
  ctx.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
  buttons.length = 0;
  if (state === "play") { stepKeys(dt); stepPlay(dt); Ticker.step(dt); drawPlay(); }
  else if (state === "pause") drawPause(dt);
  else if (state === "giftinfo") drawGiftInfo(dt);
  else if (state === "pilgrim") drawPilgrim(dt);
  else if (state === "scene") drawScene(dt);
  else if (state === "over") drawOver(dt);
  else if (state === "stages") drawStages(dt);
  else if (state === "master") drawMaster(dt);
  else drawTitle(dt);
  if (innerHeight > innerWidth * 1.1) { ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, 26); text("Turn your phone sideways to play", W / 2, 17, { align: "center", size: 11, weight: 700, color: "#ffe8c0" }); }
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
// For tests: drive the game by hand.
window.LUM = { get G() { return G; }, get state() { return state; }, set state(v) { state = v; }, start, step: (dt) => { stepPlay(dt || 1 / 60); Ticker.step(dt || 1 / 60); }, move, rotate, hardDrop, useGift, speed: () => fallSpeed(), STAGES, SONGS, Sound, save: () => save, draw: () => drawPlay() };
