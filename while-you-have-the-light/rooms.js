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
  for (const [x, y] of R.keep || []) go(x, y);
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
  const nWays = 2 + (rnd() < 0.5 ? 1 : 0), starts = [0];          // (the main way begins in the room at the foot, on the left: in at the mouth)
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
  // Rooms off the ways, found by chance: a shrine with its way to the right, a crawl with its way to the
  // left. Some of them hidden: the way to them walled up, the wall cracked, to be broken through.
  const hidden = new Set();
  for (let c = 0; c < GW * GH; c++) {
    if (onWay.has(c) || rnd() > 0.12) continue; const x = c % GW, y = Math.floor(c / GW);
    if (y < 2) continue;
    if (x < GW - 1 && onWay.has(at(x + 1, y)) && !kind.has(c)) { kind.set(c, "shrine"); link(c, at(x + 1, y)); }
    else if (x > 0 && onWay.has(at(x - 1, y)) && !kind.has(c)) { kind.set(c, "crawl"); link(c, at(x - 1, y)); }
    else continue;
    onWay.delete(c); if (rnd() < 0.5) hidden.add(c);
  }
  // The grid of cells: rock, with each room laid in its place (row 0 is the top: the grid's top row of
  // places is GH - 1). Each room keeps only its largest hollow (the rest becomes rock).
  const OUT = 0, W = OUT + GW * RW, Hh = GH * RH, g = []; for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(true));
  const marks = { S: [], V: [], D: [], H: [], I: [] }, box = (c) => [OUT + (c % GW) * RW, (GH - 1 - Math.floor(c / GW)) * RH];
  const slots = [], cracks = [], keep = [];
  for (const [c, name] of kind) {
    const R = largest(makeRoom(name, rnd)), [ox, oy] = box(c);
    const row = Math.floor(c / GW);
    slots.push({ c, kind: name, ox, oy, onWay: onWay.has(c), row, stretch: Math.min(4, Math.floor(row / STRETCH)), gate: gateAt.includes(c), mouth: c === at(starts[0], 0), hidden: hidden.has(c) });
    // (A verse in about half the rooms, one at most: not one at every mark. A hidden room keeps all its herbs.)
    R.marks.V = rnd() < 0.5 ? R.marks.V.slice(0, 1) : []; if (!hidden.has(c)) R.marks.H = rnd() < 0.4 ? R.marks.H.slice(0, 1) : [];
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
      // (To a hidden room: walled up again where the rooms meet, two cells thick, and cracked.)
      if (hidden.has(p) || hidden.has(q)) {
        const y0 = Math.min(A[1], B[1]) - 5, y1 = Math.max(A[1], B[1]);
        cracks.push({ x0: xm - 1, x1: xm, y0, y1, hp: 3, from: hidden.has(p) ? 1 : -1 });
        keep.push(hidden.has(p) ? [xm - 3, y1] : [xm + 2, y1]);
      }
    } else {
      // One above the other: p below.
      const A = best(p, (u, r) => r + Math.abs(u - RW / 2) * 0.1, false), B = best(q, (u, r) => -r + Math.abs(u - RW / 2) * 0.1, true); if (!A || !B) continue;
      cut(A[0] - 3, B[1] - 5, A[0] + 2, A[1]); cut(A[0], B[1] - 5, B[0], B[1]);
    }
  }
  // (The walls to the hidden rooms, put up once all is dug, so no other passage cuts through them.)
  for (const c of cracks) for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) g[y][x] = true;
  // The summit: up from the top room's highest air to the sky.
  { const A = best(top, (u, r) => r + Math.abs(u - RW / 2) * 0.1, false); if (A) cut(A[0] - 3, 0, A[0] + 2, A[1]); for (let x = A[0] - 3; x <= A[0] + 2; x++) g[0][x] = false; }
  return seal({ name: "A WHOLE MOUNTAIN", w: W, h: Hh, g, marks, whole: true, slots, cracks, keep });
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

// ---- Can it be climbed? ---------------------------------------------------------------------------
// Where he can get to from where he starts, by the ordinary means only: walking, the step and the
// hop up a ledge to his height, the hop over a gap of five cells, falling, the rock climbed with
// bare hands, and the rope thrown its ordinary length (280 pixels) and swung or climbed on (to 340),
// with no long throw reeled in. In cells of the grid, his body three cells high. C.ok: he can come up
// to goalY (the summit's rows) from the start. C.more() goes on after rock is added (C.added).
function climbCheck(R, start, goalY) {
  const { w, h, g } = R, HK = 280 / 16, RM = 340 / 16, RMIN = 40 / 16, GR = 1.6;
  const G = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G[y * w + x] = g[y][x] ? 1 : 0;
  const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !G[y * w + x];
  const Sd = (x, y) => !A(x, y), fit0 = (x, y) => A(x, y) && A(x, y - 1) && A(x, y - 2);
  // (Where his body fits, and of those, where there is anything to stand on or take hold of near.)
  const FIT = new Uint8Array(w * h), INT = new Uint8Array(w * h);
  const mark = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) { const k = y * w + x, f = fit0(x, y); FIT[k] = f ? 1 : 0;
    INT[k] = f && (Sd(x - 1, y - 1) || Sd(x + 1, y - 1) || Sd(x, y + 1) || Sd(x - 2, y - 4) || Sd(x + 2, y - 4) || Sd(x - 1, y - 6) || Sd(x + 1, y - 6)) ? 1 : 0; } };
  mark(0, 0, w - 1, h - 1);
  const fits = (x, y) => x >= 0 && y >= 0 && x < w && y < h && FIT[y * w + x] === 1, stand = (x, y) => fits(x, y) && Sd(x, y + 1);
  const seen = new Uint8Array(w * h), hooks = new Uint8Array(w * h), q = [];
  const C = { ok: false, topY: h, seen, w, h };
  const push = (bit, x, y, d) => { const k = y * w + x; if (seen[k] & bit) return; seen[k] |= bit; q.push(bit, x, y, d || 0); if (y < C.topY) C.topY = y; if (y <= goalY) C.ok = true; };
  const fell = new Uint8Array(w * h);
  const fall = (x, y) => { for (let n = 0; n < h && fits(x, y); n++, y++) { if (fell[y * w + x]) return; fell[y * w + x] = 1; if (Sd(x, y + 1)) { push(1, x, y); return; } for (const d of [-1, 1]) if (Sd(x + d, y - 1) && Sd(x + d, y - 2)) push(d < 0 ? 2 : 4, x, y, d); } };
  const ledgeNear = (x, y) => { const k = y * w + x; if (seen[k] & 8) return; seen[k] |= 8; for (const d of [-1, 1]) for (let dx = 1; dx <= 2; dx++) for (let t = y - 8; t <= y - 1; t++) if (stand(x + d * dx, t)) push(1, x + d * dx, t); };
  // On the rope from a hook at (hx, hy): wherever his hand can be, below it, in a straight line from
  // it and within the rope's length (looked for along lines out from the hook, as the rope hangs).
  let hid = 0; const vis = new Int32Array(w * h);
  function hang(hx, hy) {
    const k = ((hy / 3) | 0) * w + ((hx / 3) | 0); if (hooks[k]) return; hooks[k] = 1; hid++;
    for (let n = 0; n <= 72; n++) {
      const a = Math.PI * n / 72, dx = Math.cos(a), dy = Math.sin(a); let lx = -1, ly = -1;
      for (let t = RMIN; t <= RM; t += 0.5) {
        const px = hx + dx * t, py = hy + dy * t; if (Sd(Math.floor(px), Math.floor(py))) break;
        const x = Math.floor(px), y = Math.floor(py + GR); if (y >= h - 1 || py <= hy) continue;
        const kk = y * w + x; if (!FIT[kk]) continue; lx = x; ly = y;
        if (vis[kk] === hid) continue; vis[kk] = hid; if (!INT[kk]) continue;
        if (Sd(x, y + 1)) push(1, x, y);
        if (Sd(x - 1, y - 1)) push(2, x, y, -1); if (Sd(x + 1, y - 1)) push(4, x, y, 1);
        ledgeNear(x, y);
      }
      if (lx >= 0) fall(lx, ly);
    }
  }
  function step(bit, x, y, d0) {
    if (bit === 1) {
      for (const d of [-1, 1]) {
        if (fits(x + d, y)) { if (stand(x + d, y)) push(1, x + d, y); else fall(x + d, y); }
        else if (stand(x + d, y - 1) && A(x, y - 3)) push(1, x + d, y - 1);
        for (let dh = 2; dh <= 3; dh++) if (fits(x, y - dh)) for (let dx = 1; dx <= 2; dx++) if (stand(x + d * dx, y - dh)) push(1, x + d * dx, y - dh);
        for (let dx = 2; dx <= 6; dx++) for (let dy = -1; dy <= 2; dy++) {
          const tx = x + d * dx, ty = y + dy; if (!stand(tx, ty)) continue;
          let clear = true; for (let k = 1; k < dx && clear; k++) clear = fits(x + d * k, Math.min(y, ty) - 1);
          if (clear) push(1, tx, ty);
        }
        if (Sd(x + d, y - 1) && Sd(x + d, y - 2)) push(d < 0 ? 2 : 4, x, y, d);
      }
      // The rope: thrown up at any angle, its ordinary length, to the first rock in its way.
      // (From every other cell of a floor: the next one throws to all the same places, near enough.)
      const gx = x + 0.5, gy = y + 1 - 2.6;
      if (x % 2 === 0 || !stand(x - 1, y)) for (let a = 15; a <= 165; a += 10) {
        const dx = Math.cos(a * Math.PI / 180), dy = -Math.sin(a * Math.PI / 180);
        for (let t = 0.5; t <= HK; t += 0.5) if (Sd(Math.floor(gx + dx * t), Math.floor(gy + dy * t))) { const px = gx + dx * (t - 0.5), py = gy + dy * (t - 0.5); if (py < gy - 1) hang(px, py); break; }
      }
    } else {
      const d = d0;
      if (fits(x, y - 1) && (Sd(x + d, y - 2) || Sd(x + d, y - 3))) push(bit, x, y - 1, d);
      // (Under rock leaning out over him, he leans out round it, a little way.)
      else if (!fits(x, y - 1)) for (let k = 1; k <= 2; k++) if (fits(x - d * k, y) && fits(x - d * k, y - 1)) { if (Sd(x - d * k + d, y - 2)) push(bit, x - d * k, y - 1, d); break; }
      for (let dx = 1; dx <= 2; dx++) for (let t = y - 4; t <= y; t++) if (stand(x + d * dx, t)) push(1, x + d * dx, t);
      if (Sd(x, y + 1)) { if (stand(x, y)) push(1, x, y); } else if (fits(x, y + 1)) { if (Sd(x + d, y) || Sd(x + d, y - 1)) push(bit, x, y + 1, d); else fall(x, y + 1); }
      for (let dx = 1; dx <= 4; dx++) for (let dy = -1; dy <= 3; dy++) if (stand(x - d * dx, y + dy)) push(1, x - d * dx, y + dy);
      fall(x, y);
    }
  }
  // (n: how many steps at most, then it stops; true once there is nothing left to look at.)
  C.more = (n) => { for (let c = 0; q.length && !(c >= n); c++) { const d0 = q.pop(), y = q.pop(), x = q.pop(), bit = q.pop(); if (fits(x, y)) step(bit, x, y, d0); } return !q.length; };
  // Rock added at (x0..x1, y0..y1): what was near it is looked at again (the rope may take it now).
  C.added = (x0, y0, x1, y1) => {
    const m = 23; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y * w + x] = g[y][x] ? 1 : 0;
    mark(x0 - 3, y0 - 2, x1 + 3, y1 + 8);
    for (let y = Math.max(0, y0 - 4); y < Math.min(h, y1 + m); y++) for (let x = Math.max(0, x0 - m); x < Math.min(w, x1 + m); x++) {
      const k = y * w + x; hooks[((y / 3) | 0) * w + ((x / 3) | 0)] = 0; seen[k] &= ~8; fell[k] = 0;
      if (seen[k] & 1) q.push(1, x, y, 0); if (seen[k] & 2) q.push(2, x, y, -1); if (seen[k] & 4) q.push(4, x, y, 1);
    }
  };
  if (stand(start[0], start[1])) push(1, start[0], start[1]); else fall(start[0], start[1]);
  return C;
}
// Where he cannot go on up, stones are hung in the air for him: below the nearest air above him
// that he cannot come to, until he can come to the summit (or a bound is reached). The stones made.
function* buildOut(R, start, goalY, max) {
  const { w, h, g } = R, made = [], tried = new Uint8Array(w * h);
  const air = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !g[y][x];
  // (Each pass looks afresh at the whole, so what it found is sure; the stones between are guided by
  // a look that only goes on from the last.)
  let C = null; const mk = new Uint8Array(w * h), src = new Int32Array(w * h), q = new Int32Array(w * h);
  for (let pass = 0; pass < 4; pass++) {
  C = climbCheck(R, start, goalY); while (!C.more(400)) yield; if (C.ok) break;
  for (let n = 0; made.length < (max || 120) && !C.ok; n++) {
    // The nearest air he cannot reach, well above where he has reached (out from all he has, over air).
    let U = -1, qn = 0; mk.fill(0);
    for (let k = 0; k < w * h; k++) if (C.seen[k] & 7) { mk[k] = 1; src[k] = k; q[qn++] = k; }
    for (let i = 0; i < qn && U < 0; i++) {
      const k = q[i], x = k % w, y = (k / w) | 0;
      if (!(C.seen[k] & 7) && !tried[k] && y < ((src[k] / w) | 0) - 3) { U = k; break; }
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1]]) { if (!air(nx, ny)) continue; const kk = ny * w + nx; if (mk[kk]) continue; mk[kk] = 1; src[kk] = src[k]; q[qn++] = kk; }
    }
    yield;
    if (U < 0) break;
    const ux = U % w, uy = (U / w) | 0, sx = src[U] % w, sy = (src[U] / w) | 0;
    // A stone: four cells across and two deep, with air all round it, between him and that air.
    let put = null;
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const dx of [0, -3, 3, -6, 6]) {
      if (put) break;
      const cx = Math.round(sx + (ux - sx) * f) + dx, cy = Math.round(sy + (uy - sy) * f), x0 = cx - 2, y0 = cy;
      let ok = true; for (let y = y0 - 4; y <= y0 + 5 && ok; y++) for (let x = x0 - 2; x <= x0 + 5 && ok; x++) ok = air(x, y);
      if (ok) put = [x0, y0];
    }
    if (!put) { const x0 = ux - 2, y0 = uy + 4; let ok = true; for (let y = y0 - 1; y <= y0 + 2 && ok; y++) for (let x = x0 - 1; x <= x0 + 4 && ok; x++) ok = air(x, y); if (ok) put = [x0, y0]; }
    if (!put) { for (let y = uy - 2; y <= uy + 2; y++) for (let x = ux - 2; x <= ux + 2; x++) if (x >= 0 && y >= 0 && x < w && y < h) tried[y * w + x] = 1; continue; }
    const [x0, y0] = put; for (let y = y0; y <= y0 + 1; y++) for (let x = x0; x <= x0 + 3; x++) g[y][x] = true;
    made.push(put); C.added(x0, y0, x0 + 3, y0 + 1); while (!C.more(400)) yield;
  }
  }
  return { ok: C.ok, made, topY: C.topY };
}
// The whole mountain, made and built out ahead of time, a little each frame (while he stands at its
// gate): prepMountain(seed, steps) till it says it is ready. mountainFor(seed): a fresh copy of it.
const MTN = { seed: null, R: null, it: null, done: false };
function prepMountain(sd, n) {
  if (MTN.seed !== sd) { const R = makeMountain(seeded(sd + 7)); Object.assign(MTN, { seed: sd, R, it: buildOut(R, R.marks.S[0], 3), done: false }); }
  for (let c = 0; !MTN.done && !(c >= n); c++) { const r = MTN.it.next(); if (r.done) { MTN.done = true; MTN.R.built = r.value; } }
  return MTN.done;
}
function mountainFor(sd) { prepMountain(sd); const R = MTN.R; return Object.assign({}, R, { g: R.g.map((r) => r.slice()), cracks: (R.cracks || []).map((c) => Object.assign({}, c)) }); }
