"use strict";
// While You Have the Light: the rooms a mountain is made of (Spelunky's way). Each is drawn by hand
// as a small grid of characters, each character a block of 2 x 2 cells (32 pixels): a room is 46
// across and 22 high, about two screens each way. Some of its rock is "maybe", so the same
// room comes out different each time it is made.
//   #  rock            .  air
//   ?  rock, one time in two          1  rock, two times in three
//   S  where he starts (on the floor under it)
//   V  a carved verse (in the rock beside it)      D  a demon's place      H  an herb's place
//   I  an idol's place
// Its openings are where its edges are open: the ways it would rather be come into by. (In a whole
// mountain, passages are dug between rooms wherever the way runs; never through a side it is sealed on.)
const ROOM_W = 46, ROOM_H = 22, ROOM_K = 2;     // characters across and down; cells to a character

const ROOMS = {
  shaft: { name: "THE ZIGZAG SHAFT", ways: "down, up", seal: "", rows: [
    "##################......######################",
    "########..............................########",
    "#######................................#######",
    "######..................????1111111....#######",
    "######.......................D..........######",
    "######..................................######",
    "######11111111????......................######",
    "######.V................................######",
    "######..................................######",
    "######...................???11111111111.######",
    "######.........................H........######",
    "######..................................######",
    "######1111111111???.....................######",
    "######..................................######",
    "######..................................######",
    "######......................????11111111######",
    "######..........D.......................######",
    "######..................................######",
    "######..........S.......................######",
    "#######.......#########.................######",
    "##############################......##########",
    "##############################......##########",
  ] },
  gap: { name: "THE PIT GAP", ways: "left, right", seal: "", rows: [
    "##############################################",
    "####???????????????????????????????????#######",
    "###.........................................##",
    "##...........................................#",
    "#............................................#",
    "..............................................",
    "..............................................",
    "..............................................",
    "...........................D..................",
    "...S..........................................",
    "#########?...........................?########",
    "##########...........................#########",
    "##########...........................#########",
    "###########.........................##########",
    "###########.........................##########",
    "############.........H.............###########",
    "############1111111111111111111111############",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
  ] },
  corridor: { name: "THE LONG GALLERY", ways: "left, right", seal: "", rows: [
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "#######?????????????????????????????##########",
    "####.....................................#####",
    "###.........##..........##...........?....####",
    "..........V.......................V...........",
    "..............................................",
    "...S....................D.....................",
    "..............................................",
    "#####1#####..........######.........##1#######",
    "###########111.....1111####11.....11##########",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
  ] },
  hall: { name: "THE GREAT HALL", ways: "down, up, left, right", seal: "", rows: [
    "###################.......####################",
    "##########??????...........???????############",
    "######...................................#####",
    "####.......................................###",
    "###..........................................#",
    "##....................D.......................",
    "#.............................................",
    "..........................1111111.............",
    "..........11111...............................",
    "...............................V..............",
    "..............................................",
    "....................................1111......",
    "..................H...........................",
    "..........................D...................",
    "...S..........................................",
    "#######....................................###",
    "#########1111.................1111......######",
    "###############.............##################",
    "##################.........###################",
    "###################.......####################",
    "###################.......####################",
    "###################.......####################",
  ] },
  platforms: { name: "THE HANGING STONES", ways: "down, up, left, right", seal: "", rows: [
    "##################........####################",
    "#######???????..................?????#########",
    "####........................................##",
    "##.......................................D....",
    "#.....................111111.................#",
    "..............................................",
    "..........11111...........................1111",
    "..................................1111........",
    ".......................H......................",
    "...................11111......................",
    "..............................................",
    "......1111........................1111........",
    "..............................................",
    "..........................11111...............",
    "..............................................",
    "...S..........111.............................",
    "#####.........................................",
    "######..............................11111.....",
    "#######.....................................##",
    "########.................................#####",
    "##############.......D.........###############",
    "##############################################",
  ] },
  crawl: { name: "THE LOW CRAWL", ways: "left", seal: "up, down, right", rows: [
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##########??????????????######################",
    "#######..................#####################",
    "####......................####################",
    "..........................H.##################",
    "............................##################",
    "...S..........................################",
    "##########......................##############",
    "###########..........1..............#.......##",
    "##################################........H.##",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
  ] },
  shrine: { name: "THE SHRINE ROOM", ways: "right", seal: "up, down, left", rows: [
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##########????????????????????################",
    "########........................##############",
    "#######..........................#############",
    "######............................############",
    "######............................############",
    "######..........I.............................",
    "######..............................H.........",
    "######......................S.................",
    "##########111111111111111111##################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
    "##############################################",
  ] },
};
// A room made: its rock (a cell grid, top row first), and its marks, in cells from its top left.
function makeRoom(name, rnd) {
  const T = ROOMS[name], W = ROOM_W * ROOM_K, Hh = ROOM_H * ROOM_K, g = [], marks = { S: [], V: [], D: [], H: [], I: [] };
  for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(false));
  T.rows.forEach((row, r) => {
    for (let c = 0; c < ROOM_W; c++) {
      const ch = row[c] || "#";
      const rock = ch === "#" || (ch === "?" && rnd() < 0.5) || (ch === "1" && rnd() < 2 / 3);
      for (let y = 0; y < ROOM_K; y++) for (let x = 0; x < ROOM_K; x++) g[r * ROOM_K + y][c * ROOM_K + x] = rock;
      if (marks[ch]) marks[ch].push([c * ROOM_K + 1, r * ROOM_K + 1]);
    }
  });
  return seal({ name, w: W, h: Hh, g, marks });
}
// No hollows sealed in the rock: any air that cannot be reached from where he starts or from the
// room's open edges becomes rock. (Until there is a way to break through to such places.)
function seal(R) {
  const { w, h, g } = R, seen = g.map((r) => r.map(() => false)), q = [];
  const go = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !g[y][x] && !seen[y][x]) { seen[y][x] = true; q.push([x, y]); } };
  for (let x = 0; x < w; x++) { go(x, 0); if (!R.whole) go(x, h - 1); }
  if (!R.whole) for (let y = 0; y < h; y++) { go(0, y); go(w - 1, y); }
  for (const [x, y] of R.marks.S) go(x, y);
  while (q.length) { const [x, y] = q.pop(); go(x + 1, y); go(x - 1, y); go(x, y + 1); go(x, y - 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && !seen[y][x]) g[y][x] = true;
  return R;
}
// ---- A whole mountain ---------------------------------------------------------------------------
// A grid of room places, as high as the seven mountains' climb, and four to seven wide. Two or three
// ways wind up through it from its foot to the summit (mostly up; now and then sideways a while, and
// now and then down), each room on them chosen to suit how the way runs through it, and passages dug
// between them. One stretch of the way runs long and level over pits, for swinging. Off the ways, here
// and there, a room by itself (a shrine, a crawl) and a passage to it, to be found by one who wanders.
const MTN_ROWS = 46;
function makeMountain(rnd) {
  const RW = ROOM_W * ROOM_K, RH = ROOM_H * ROOM_K, GW = 4 + Math.floor(rnd() * 4), GH = MTN_ROWS;
  const side = 0.15 + rnd() * 0.35, down = rnd() * 0.12;     // (how much this mountain wanders, and sinks)
  const at = (x, y) => y * GW + x, links = new Set(), onWay = new Set(), link = (p, q) => { links.add(Math.min(p, q) + "," + Math.max(p, q)); onWay.add(p); onWay.add(q); };
  const top = at(Math.floor(GW / 2), GH - 1), swingRow = 6 + Math.floor(rnd() * (GH - 14));
  // One way up, from (x, 0): mostly up; sideways runs; a dip now and then (never back on itself).
  const mainWay = [];
  function way(x0, main) {
    let x = x0, y = 0, prev = at(x, y), dipped = 0; const seen = new Set([prev]);
    if (main) mainWay.push(prev);
    const step = (nx, ny) => { const c = at(nx, ny); link(prev, c); seen.add(c); prev = c; x = nx; y = ny; if (main) mainWay.push(c); };
    while (y < GH - 1) {
      if (main && y === swingRow) { const d = x < GW / 2 ? 1 : -1; for (let k = 0; k < 3 && x + d >= 0 && x + d < GW; k++) step(x + d, y); step(x, y + 1); continue; }
      const r = rnd();
      if (y > 2 && dipped <= 0 && r < down) {
        // Down a room or two, then across (so as not to come back the way it went).
        const d = x > 0 && (x === GW - 1 || rnd() < 0.5) ? -1 : 1, n = 1 + Math.floor(rnd() * 2);
        if (x + d < 0 || x + d >= GW) { step(x, y + 1); continue; }
        step(x + d, y); let k = 0; while (k < n && y > 1 && !seen.has(at(x, y - 1))) { step(x, y - 1); k++; }
        if (x + d >= 0 && x + d < GW && !seen.has(at(x + d, y))) step(x + d, y);
        dipped = 6; continue;
      }
      dipped--;
      if (r < down + side) {
        const d = x === 0 ? 1 : x === GW - 1 ? -1 : rnd() < 0.5 ? -1 : 1, n = 1 + Math.floor(rnd() * 2);
        for (let k = 0; k < n && x + d >= 0 && x + d < GW && !seen.has(at(x + d, y)); k++) step(x + d, y);
      }
      // (The summit's room is the way's end: near the top, the way bends toward it.)
      if (y === GH - 2) { const tx = top % GW; while (x !== tx) step(x + Math.sign(tx - x), y); }
      step(x, y + 1);
    }
  }
  const nWays = 2 + (rnd() < 0.5 ? 1 : 0), starts = [0];          // (the main way begins in the room at the foot, on the left: behind the mouth)
  way(starts[0], true);
  for (let w = 1; w < nWays; w++) { let x0 = Math.floor(rnd() * GW); if (x0 === starts[0]) x0 = (x0 + 1 + Math.floor(rnd() * (GW - 1))) % GW; starts.push(x0); way(x0, false); }
  // (The ways' feet joined along the bottom, so whichever he starts by, all are open to him.)
  const s0 = Math.min(...starts), s1 = Math.max(...starts); for (let x = s0; x < s1; x++) link(at(x, 0), at(x + 1, 0));
  // Each place on the ways: which of its four sides the way goes through, and a room to suit.
  const sides = (c) => { const x = c % GW, y = Math.floor(c / GW), has = (q) => links.has(Math.min(c, q) + "," + Math.max(c, q));
    return { up: y < GH - 1 && has(at(x, y + 1)), down: y > 0 && has(at(x, y - 1)), left: x > 0 && has(at(x - 1, y)), right: x < GW - 1 && has(at(x + 1, y)) }; };
  const pick = (a) => a[Math.floor(rnd() * a.length)], kind = new Map();
  for (const c of onWay) {
    const S = sides(c), y = Math.floor(c / GW), flat = (S.left || S.right) && !S.up && !S.down, tall = (S.up || S.down) && !S.left && !S.right;
    kind.set(c, y === swingRow && flat ? "gap" : tall ? pick(["shaft", "shaft", "platforms", "hall"]) : flat ? pick(["gap", "corridor", "hall", "platforms"]) : pick(["hall", "platforms", "hall"]));
  }
  // In five stretches: at the head of each but the last, on the main way, a long gallery where the
  // lay brother waits with his cart (the gate). And at the foot, where the main way begins, the mouth.
  const STRETCH = Math.ceil(GH / 5), gateAt = [];
  for (let g = 1; g < 5; g++) { const row = g * STRETCH, c = mainWay.find((q) => Math.floor(q / GW) === row); if (c !== undefined) { kind.set(c, "corridor"); gateAt.push(c); } }
  kind.set(at(starts[0], 0), "hall");
  // Rooms off the ways, found by chance: a shrine with its way to the right, a crawl with its way to the left.
  for (let c = 0; c < GW * GH; c++) {
    if (onWay.has(c) || rnd() > 0.12) continue; const x = c % GW, y = Math.floor(c / GW);
    if (y < 2) continue;
    if (x < GW - 1 && onWay.has(at(x + 1, y)) && !kind.has(c)) { kind.set(c, "shrine"); link(c, at(x + 1, y)); }
    else if (x > 0 && onWay.has(at(x - 1, y)) && !kind.has(c)) { kind.set(c, "crawl"); link(c, at(x - 1, y)); }
  }
  // The grid of cells: rock, with each room laid in its place (row 0 is the top: the grid's top row of
  // places is GH - 1). Each room keeps only its largest hollow (the rest becomes rock).
  // (OUT: the ground outside the mountain, on its left, where he starts, before the mouth.)
  const OUT = 120, W = OUT + GW * RW, Hh = GH * RH, g = []; for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(true));
  const marks = { S: [], V: [], D: [], H: [], I: [] }, box = (c) => [OUT + (c % GW) * RW, (GH - 1 - Math.floor(c / GW)) * RH];
  const slots = [];
  for (const [c, name] of kind) {
    const R = largest(makeRoom(name, rnd)), [ox, oy] = box(c);
    const row = Math.floor(c / GW);
    slots.push({ c, kind: name, ox, oy, onWay: onWay.has(c), row, stretch: Math.min(4, Math.floor(row / STRETCH)), gate: gateAt.includes(c), mouth: c === at(starts[0], 0) });
    // (A verse in about half the rooms, one at most: not one at every mark.)
    R.marks.V = rnd() < 0.5 ? R.marks.V.slice(0, 1) : []; R.marks.H = rnd() < 0.4 ? R.marks.H.slice(0, 1) : [];
    for (let r = 0; r < RH; r++) for (let q = 0; q < RW; q++) g[oy + r][ox + q] = R.g[r][q];
    for (const m in R.marks) if (m !== "S" || c === at(starts[0], 0)) for (const [q, r] of R.marks[m]) marks[m].push([q + ox, r + oy]);
  }
  // The passages between rooms: from the floor nearest the shared side in the one, to the floor
  // nearest it in the other: along, then up or down a shaft, then along. (Three characters high, to
  // walk in; six cells wide, to climb.)
  const air = (x, y) => x > 0 && y > 0 && x < W - 1 && y < Hh - 1 && !g[y][x];
  const floor = (x, y) => air(x, y) && !air(x, y + 1) && y + 1 < Hh;
  const best = (c, score, need) => { const [ox, oy] = box(c); let b = null;
    for (let r = 2; r < RH - 1; r++) for (let q = 2; q < RW - 2; q++) { const x = ox + q, y = oy + r; if (!(need ? floor(x, y) : air(x, y))) continue; const s = score(q, r); if (!b || s < b[2]) b = [x, y, s]; }
    return b; };
  const cut = (x0, y0, x1, y1) => { for (let y = Math.max(1, Math.min(y0, y1)); y <= Math.min(Hh - 2, Math.max(y0, y1)); y++) for (let x = Math.max(1, Math.min(x0, x1)); x <= Math.min(W - 2, Math.max(x0, x1)); x++) g[y][x] = false; };
  for (const L of links) {
    let [p, q] = L.split(",").map(Number); if (!kind.has(p) || !kind.has(q)) continue;
    if (q - p === 1) {
      // Side by side: p on the left.
      const A = best(p, (u, r) => -u + Math.abs(r - RH * 0.6) * 0.3, true), B = best(q, (u, r) => u + Math.abs(r - RH * 0.6) * 0.3, true); if (!A || !B) continue;
      const xm = OUT + (p % GW + 1) * RW;
      cut(A[0], A[1] - 5, xm + 2, A[1]); cut(xm - 3, Math.min(A[1], B[1]) - 5, xm + 2, Math.max(A[1], B[1])); cut(xm - 3, B[1] - 5, B[0], B[1]);
    } else {
      // One above the other: p below.
      const A = best(p, (u, r) => r + Math.abs(u - RW / 2) * 0.1, false), B = best(q, (u, r) => -r + Math.abs(u - RW / 2) * 0.1, true); if (!A || !B) continue;
      cut(A[0] - 3, B[1] - 5, A[0] + 2, A[1]); cut(A[0], B[1] - 5, B[0], B[1]);
    }
  }
  // The summit: up from the top room's highest air to the sky.
  { const A = best(top, (u, r) => r + Math.abs(u - RW / 2) * 0.1, false); if (A) cut(A[0] - 3, 0, A[0] + 2, A[1]); for (let x = A[0] - 3; x <= A[0] + 2; x++) g[0][x] = false; }
  // Outside, at the foot on the left: open ground under an overhang of the mountain, and in the
  // mountain's wall Gluttony's face (traced from gluttony-mouth-1.png) of the mountain's own rock,
  // looking out, its jaws open; a tunnel from the back of its mouth into the first room.
  const GR = Hh - 14, FK = 0.1625, FX = OUT - Math.round(108.7 * FK);    // the ground's row; cells to a unit of the face (it stands a screen high); where its left edge stands
  for (let r = Hh - 3 * RH; r < GR; r++) for (let x = 1; x < OUT; x++) g[r][x] = false;
  { const F = new Path2D(), cell = (u, v) => [FX + (u + 54.35) * FK, GR - v * FK];
    for (const L of TRACED.wf1) { const a = cell(L[0], L[1]); F.moveTo(a[0], a[1]); for (let i = 2; i < L.length; i += 2) { const b = cell(L[i], L[i + 1]); F.lineTo(b[0], b[1]); } F.closePath(); }
    const cx = (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("2d");
    // (A cell is rock if most of it is the face's rock: the face's cracks are too fine to leave gaps.)
    const inF = (x, y) => cx.isPointInPath(F, x, y, "nonzero");
    for (let r = GR - Math.ceil(100 * FK) - 2; r < GR; r++) for (let x = Math.max(1, FX - 2); x < Math.min(W - 1, FX + Math.ceil(110 * FK) + 2); x++) {
      const n = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].filter(([a, b]) => inF(x + a, r + b)).length; if (n >= 3) g[r][x] = true; } }
  // (The lower jaw kept only as a low lip of teeth, two cells, to step over into the mouth; then the throat.)
  // (The throat: from the back of the mouth, under the jaw, into the first room.)
  cut(FX + 11, GR - 3, OUT + 10, GR - 1);
  marks.S = [[FX - 16, GR - 1]];
  return seal({ name: "A WHOLE MOUNTAIN", w: W, h: Hh, g, marks, whole: true, slots, out: OUT, face: { FX, GR, FK } });
}
// A room's largest hollow, and the rest of its air made rock (its marks in the rock dropped).
function largest(R) {
  const { w, h, g } = R, id = g.map((r) => r.map(() => -1)), size = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] || id[y][x] >= 0) continue; const n = size.length, q = [[x, y]]; id[y][x] = n; let k = 0;
    while (q.length) { const [a, b] = q.pop(); k++; for (const [c, d] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (c >= 0 && d >= 0 && c < w && d < h && !g[d][c] && id[d][c] < 0) { id[d][c] = n; q.push([c, d]); } }
    size.push(k);
  }
  const big = size.indexOf(Math.max(...size));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && id[y][x] !== big) g[y][x] = true;
  for (const m in R.marks) R.marks[m] = R.marks[m].filter(([x, y]) => !g[y][x]);
  return R;
}
// Rooms linked: each laid against the last on the side its way leads (up, right or left) where the
// next has a way in, or else above it or beside it; what they do not fill is rock. He starts in the
// first. (For seeing how the pieces join: where their openings do not meet, it shows.)
const WAYS = (n) => ROOMS[n].ways.split(", ");
// Whether b can be come into from a: a way out of a on a side where b has its way in.
const fits = (a, b) => (WAYS(a).includes("up") && WAYS(b).includes("down")) || (WAYS(a).includes("right") && WAYS(b).includes("left")) || (WAYS(a).includes("left") && WAYS(b).includes("right"));
function linkRooms(names, rnd) {
  const at = [[0, 0]], used = new Set(["0,0"]);
  for (let i = 1; i < names.length; i++) {
    const [x, y] = at[i - 1], out = WAYS(names[i - 1]), inn = WAYS(names[i]);
    const tries = [["up", "down", 0, -1], ["right", "left", 1, 0], ["left", "right", -1, 0]].filter((t) => out.includes(t[0]) && inn.includes(t[1]));
    tries.push(["", "", 0, -1], ["", "", 1, 0], ["", "", -1, 0]);
    let p = null; for (const t of tries) { const q = [x + t[2], y + t[3]]; if (!used.has(q + "")) { p = q; break; } }
    if (!p) { let q = [x, y - 1]; while (used.has(q + "")) q = [q[0], q[1] - 1]; p = q; }
    at.push(p); used.add(p + "");
  }
  const xs = at.map((p) => p[0]), ys = at.map((p) => p[1]), mx = Math.min(...xs), my = Math.min(...ys);
  const RW = ROOM_W * ROOM_K, RH = ROOM_H * ROOM_K, W = (Math.max(...xs) - mx + 1) * RW, Hh = (Math.max(...ys) - my + 1) * RH;
  const g = []; for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(true));
  const marks = { S: [], V: [], D: [], H: [], I: [] };
  names.forEach((n, i) => {
    const R = makeRoom(n, rnd), ox = (at[i][0] - mx) * RW, oy = (at[i][1] - my) * RH;
    for (let r = 0; r < RH; r++) for (let c = 0; c < RW; c++) g[oy + r][ox + c] = R.g[r][c];
    for (const m in R.marks) if (m !== "S" || i === 0) for (const [c, r] of R.marks[m]) marks[m].push([c + ox, r + oy]);
  });
  return { name: names.join(" + "), w: W, h: Hh, g, marks };
}

// (A room alone, walked out of by a way at its side, is done: OUT OF THE ROOM.)
let pieceOut = false;
